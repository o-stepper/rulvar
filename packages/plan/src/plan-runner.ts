/**
 * PlanRunner (M7-T05): the opt-in extension of mode (c).
 *
 * Full contract: https://docs.rulvar.com/guide/adaptive-orchestration.
 * The ENGINE, not the model, schedules ready nodes through the
 * existing semaphore and budget admission; children run under
 * `plan/NodeId` scopes; every plan mutation is an entry in the single
 * sequential scope "plan"; the orchestrator sleeps between wakes and
 * revises the plan through typed diffs with auto-rebase. PlanRunner runs
 * write `termination.init` and carry the full adaptive machinery;
 * the guards, reuse, park, ledger, ladder,
 * escalation, and budget-cap layers complete in M7-T06..T13.
 *
 * PlanRunner is built EXCLUSIVELY from the public core API through the
 * orchestrator extension seam (the seam-sufficiency rule).
 */
import {
  AdmissionRejectedError,
  approachSigCoarse,
  BudgetExhaustedError,
  buildTerminationInitValue,
  ConfigError,
  countsAgainstLimit,
  DedupIndex,
  deriverV2,
  evaluateReuse,
  foldTermination,
  kMaxOf,
  ladderLengthOf,
  ladderRungChoice,
  LEGACY_SIGNATURE_INPUTS,
  nodeLinkKey,
  normalizeApproachTag,
  orchestrate,
  planNodeScope,
  profileRegistrySnapshotHash,
  ROOT_ACCOUNT,
  TerminationAccount,
  validateTerminationLimits,
  type AdmissionDecision,
  type AgentProfile,
  type AgentResult,
  type CanonicalLadderSpec,
  type DonorCandidate,
  type DonorRef,
  type EntryRef,
  type Engine,
  type EscalationDecision,
  type EscalationKind,
  type ExtensionDispatchSpec,
  type JournalEntry,
  type Json,
  type LogicalTaskId,
  type MechanicalGateProfile,
  type ModelRef,
  type NodeId,
  type NodeLinkValue,
  type OrchestrateOptions,
  type OrchestratorExtension,
  type OrchestratorExtensionIO,
  type ReuseConfig,
  type RunHandle,
  type RunOptions,
  type TerminationDeniedValue,
  type TerminationLimits,
  type TriggerClass,
  type WakeDigest,
} from '@rulvar/core';
import { canonicalIsolationTag } from '@rulvar/core';
import { checkpointRefFor } from '@rulvar/core';
import { planHash } from './plan-hash.js';
import {
  DEFAULT_MAX_PINNED_WORKTREES,
  parkDispositionOf,
  PinLedger,
  unparkPlacementOf,
} from './park.js';
import { emptyPlan, type PlanNode, type PlanNodeStatus } from './plan-state.js';
import {
  applyDecisionOps,
  applyPlanEntry,
  effectiveDroppedStreak,
  emptyPlanFold,
  planDecisionKey,
  planRevisionKey,
  readPlanRevision,
  type EnginePlanOp,
  type PlanDecisionOrigin,
  type PlanDecisionValue,
  type PlanFoldState,
  type PlanRevisionValue,
  type PlanReviseRequest,
  type PlanReviseResult,
} from './plan-entries.js';
import {
  boundLedgerRender,
  foldLedger,
  ledgerCapViolation,
  ledgerOpKey,
  type LedgerOp,
  type LedgerView,
} from './ledger.js';
import { rebasePlanRevision, type RebaseEvaluation } from './rebase.js';
import { PlanWriteLock } from './write-lock.js';
import {
  buildPlanTools,
  type KbProposeInput,
  type PlanToolRuntime,
  type PlanViewRender,
} from './tools.js';
import { RevisionGuards, type GuardVerdictValue, type RevisionGuardsOptions } from './guards.js';
import { promptSpecHashOf, type TaskSpec } from './task-spec.js';
import {
  decisionOriginOf,
  escalationDecisionKey,
  resolvedByOf,
  type EscalationDecisionValue,
} from './escalation.js';
import {
  canonicalLadderOf,
  clampStartTier,
  executingRungOf,
  gateVerdictKey,
  JUDGE_VERDICT_SCHEMA,
  judgePrompt,
  ladderTriggerOf,
  ladderVerdictKey,
  type GateVerdictValue,
  type LadderVerdictValue,
} from './ladder.js';

/** Configuration knobs of the PlanRunner extension. */
export interface PlanRunnerOptions {
  /** Absolute, non-replenishable; default 32 (DEF-2). */
  maxRevisionsPerRun?: number;
  guards?: RevisionGuardsOptions;
  /** Out-of-vocabulary tags get a typed tool error with bounded re-prompt (DEF-3). */
  approachVocabulary?: string[];
  /** Reuse-by-reference configuration (DEF-5). */
  reuse?: ReuseConfig;
  /** Frozen termination knobs beyond the revision budget (DEF-2). */
  limits?: Partial<
    Pick<TerminationLimits, 'maxTotalSpawns' | 'maxEscalationsPerLogicalTask' | 'maxDepth'>
  >;
  /**
   * ModelKnowledge phase 3 opt-in: registers the kb_propose tool, which
   * journals quarantined model observations into the RunLedger's
   * modelObservations section. Registered like any opt-in tool, so
   * enabling it changes toolsetHash by design. Default false.
   */
  kbPropose?: boolean;
}

/** AgentResult terminal statuses mapped onto plan node statuses. */
function nodeStatusOf(status: AgentResult<unknown>['status']): PlanNodeStatus | undefined {
  switch (status) {
    case 'ok':
      return 'done';
    case 'escalated':
      return 'escalated';
    case 'cancelled':
      return 'cancelled';
    case 'error':
    case 'limit':
      return 'failed';
    default:
      return undefined;
  }
}

const TERMINATION_INIT_KEY_KIND = 'termination.init';
const TERMINATION_DENIED_KEY_KIND = 'termination.denied';

/**
 * Builds the PlanRunner orchestrator extension.
 * Attach via `orchestrate(engine, goal, { extension: planRunner(o) })` or
 * the `orchestratePlanned` convenience surface.
 */
export function planRunner(options?: PlanRunnerOptions): OrchestratorExtension {
  // Closure state: every piece is either a pure fold of the journal
  // (rebuilt on resume) or process-lifetime bookkeeping whose loss a
  // resume tolerates (dispatch handles re-established via forward
  // matching).
  let io!: OrchestratorExtensionIO;
  let planScope = 'plan';
  let rootScope = '';
  let fold: PlanFoldState = emptyPlanFold(emptyPlan());
  let planCursor = -1;
  let account: TerminationAccount | undefined;
  const writeLock = new PlanWriteLock();
  const digests = new Map<number, { planHash: string; planSeq: number }>();
  let pinnedPlanSeq = -1;
  const dispatched = new Map<NodeId, number>();
  const consumedRevisionSeqs = new Set<number>();
  const consumedLedgerSeqs = new Set<number>();
  /** Full-link targets: completed by reference, never dispatched (DEF-5). */
  const linkedFull = new Map<NodeId, { donorRootRef: EntryRef; spawnKey: string }>();
  const reuseConfig = options?.reuse;
  const guards = new RevisionGuards({
    ...options?.guards,
    ...(reuseConfig?.maxOscillationsPerKey === undefined
      ? {}
      : { maxOscillationsPerKey: reuseConfig.maxOscillationsPerKey }),
  });
  let guardCursor = -1;
  /** stall:detected emission bookkeeping: once per (ltid, streak). */
  const stallEmitted = new Set<string>();
  const vocabulary =
    options?.approachVocabulary === undefined
      ? undefined
      : new Set(options.approachVocabulary.map((tag) => normalizeApproachTag(tag)));

  /** Verdicts fired by the fold, awaiting their journal append. */
  const pendingGuardVerdicts: GuardVerdictValue[] = [];
  /** Content keys of journaled guard verdicts (dedup on roll-forward). */
  const journaledGuardKeys = new Set<string>();

  const guardVerdictKey = (verdict: GuardVerdictValue): string =>
    deriverV2.deriveKey({
      kind: 'decision',
      decisionType: 'guard-verdict',
      guard: verdict.guard,
      ...(verdict.approachSigCoarse === undefined
        ? {}
        : { approachSigCoarse: verdict.approachSigCoarse }),
    });

  /** Guard verdict state is a pure fold of journaled verdicts (M7-T06). */
  const absorbGuardVerdicts = (): void => {
    for (const entry of io.snapshot()) {
      if (entry.seq <= guardCursor || entry.scope !== planScope || entry.kind !== 'decision') {
        continue;
      }
      const value = entry.value as Partial<GuardVerdictValue> | undefined;
      if (value?.decisionType === 'guard-verdict') {
        guards.absorbVerdict(value as GuardVerdictValue);
        journaledGuardKeys.add(entry.key);
      }
      guardCursor = entry.seq;
    }
  };

  /**
   * Appends fold-fired verdicts strictly BEFORE their effects; a
   * verdict already journaled (replay absorb) never duplicates.
   */
  const drainGuardVerdicts = async (): Promise<void> => {
    while (pendingGuardVerdicts.length > 0) {
      const verdict = pendingGuardVerdicts.shift() as GuardVerdictValue;
      const key = guardVerdictKey(verdict);
      if (journaledGuardKeys.has(key)) {
        continue;
      }
      const entry = await io.append({
        scope: planScope,
        key,
        kind: 'decision',
        value: RevisionGuards.verdictJson(verdict),
      });
      journaledGuardKeys.add(key);
      guardCursor = Math.max(guardCursor, entry.seq);
      if (verdict.guard === 'oscillation-freeze') {
        io.emit({
          type: 'guard:oscillation',
          spawnKeyHash: verdict.approachSigCoarse ?? '',
          oscillationCount: verdict.oscillationCount ?? 0,
          limit: verdict.oscillationCount ?? 0,
        });
      }
    }
  };

  /** The coarse approach signature of a spec (mirrors admission's inputs). */
  const coarseOf = (spec: TaskSpec): string =>
    approachSigCoarse({
      agentType: spec.agentType,
      toolsetHash: LEGACY_SIGNATURE_INPUTS.toolsetHash,
      schemaHash: LEGACY_SIGNATURE_INPUTS.schemaHash,
      isolation: canonicalIsolationTag(
        spec.isolation ?? (io.profiles[spec.agentType] as AgentProfile | undefined)?.isolation,
      ),
    });

  const nodeScopeOf = (nodeId: NodeId): string =>
    rootScope === '' ? planNodeScope(nodeId) : `${rootScope}/${planNodeScope(nodeId)}`;

  /** The dispatched root entry of a plan node, when one exists. */
  const nodeRootOf = (nodeId: NodeId): JournalEntry | undefined => {
    const scope = nodeScopeOf(nodeId);
    return io
      .snapshot()
      .find((entry) => entry.kind === 'agent' && entry.scope === scope && entry.ref === undefined);
  };

  /**
   * SpawnKeys a byte-identical candidate would collide with: within one
   * run, an identical TaskSpec resolves to the identical kernel content
   * key, so donor discovery goes promptSpecHash -> prior nodes -> their
   * root entry keys (strict byte equality, never fuzzy).
   */
  const donorKeysOf = (spec: TaskSpec): string[] => {
    const specHash = promptSpecHashOf(spec);
    const keys = new Set<string>();
    for (const node of Object.values(fold.plan.nodes)) {
      if (node.promptSpecHash !== specHash) {
        continue;
      }
      const root = nodeRootOf(node.nodeId);
      if (root !== undefined) {
        keys.add(root.key);
      }
    }
    return [...keys];
  };

  /**
   * Re-issues the reuse effects recorded in one plan.revision entry
   * (deciding entry, then node.link, then the child root,
   * then scheduling; a crash between any two is ordinary roll-forward).
   * Idempotent: every append scans for its own identity first.
   */
  const landReuseLinks = async (entry: JournalEntry): Promise<void> => {
    const value = readPlanRevision(entry);
    if (value === undefined) {
      return;
    }
    for (const admission of value.admissions) {
      const verdict = admission.decision.verdict;
      if (verdict.kind !== 'reuse_full' && verdict.kind !== 'admit_graft') {
        continue;
      }
      const donor = verdict.donor;
      const targetNodeId = admission.nodeId ?? value.assignedNodeIds[admission.opIndex];
      if (targetNodeId === undefined || admission.reuse === undefined) {
        continue;
      }
      const targetScope = nodeScopeOf(targetNodeId);
      const donorScope = admission.reuse.donorScope;
      const mode: NodeLinkValue['mode'] = verdict.kind === 'reuse_full' ? 'full' : 'graft';
      const linkKey = nodeLinkKey(donor.spawnKey, donorScope, targetNodeId);
      const existing = io
        .snapshot()
        .find(
          (candidate) =>
            candidate.kind === 'node.link' &&
            candidate.scope === planScope &&
            candidate.key === linkKey,
        );
      let linkSeq = existing?.seq;
      if (existing === undefined) {
        const reclaimedUsdAtLink =
          mode === 'full'
            ? donor.paidUsd
            : ((verdict as { boot?: { eligiblePaidUsd?: number } }).boot?.eligiblePaidUsd ?? 0);
        const linkValue: NodeLinkValue = {
          targetNodeId,
          targetScope,
          donorScope,
          chain: [...admission.reuse.chain],
          spawnKey: donor.spawnKey,
          logicalTaskId: donor.logicalTaskId,
          mode,
          claim: mode === 'full' ? 'shared' : 'exclusive',
          reclaimedUsdAtLink,
          donorRootRef: donor.rootEntryRef,
        };
        const appended = await io.append({
          scope: planScope,
          key: linkKey,
          kind: 'node.link',
          value: linkValue as unknown as Json,
        });
        linkSeq = appended.seq;
        io.emit({
          type: 'node:linked',
          nodeId: targetNodeId,
          logicalTaskId: donor.logicalTaskId,
          donorRef: donor.rootEntryRef,
          reclaimedUsd: reclaimedUsdAtLink,
        });
      }
      void linkSeq;
      // Scope-prefix aliasing: every chain member forward-matches into
      // the new scope, oldest first.
      for (const member of admission.reuse.chain) {
        io.registerAlias(member, targetScope);
      }
      if (mode === 'full') {
        linkedFull.set(targetNodeId, {
          donorRootRef: donor.rootEntryRef,
          spawnKey: donor.spawnKey,
        });
      }
    }
  };

  /** Rebuilds the alias map and full-link table from the journal (boot). */
  const absorbLinks = (): void => {
    for (const entry of io.snapshot()) {
      if (entry.kind !== 'node.link' || entry.scope !== planScope) {
        continue;
      }
      const value = entry.value as unknown as NodeLinkValue;
      for (const member of value.chain) {
        io.registerAlias(member, value.targetScope);
      }
      if (value.mode === 'full') {
        linkedFull.set(value.targetNodeId, {
          donorRootRef: value.donorRootRef,
          spawnKey: value.spawnKey,
        });
      }
    }
  };

  /**
   * Builds the reuse transform for one add_task at the fold head:
   * the verdict, the donor descriptor, and the placement
   * embed into the revision entry; effects land after the append.
   */
  const buildReuseTransform = (
    op: { spec: TaskSpec; deps?: NodeId[]; priority?: number },
    kind: 'reuse_full' | 'admit_graft',
    donor: DonorCandidate,
  ): {
    applied: {
      op: 'add_task';
      spec: TaskSpec;
      deps?: NodeId[];
      priority?: number;
      nodeId: NodeId;
    };
    admission: AdmissionDecision;
    nodeId: NodeId;
    reuse: { donorScope: string; chain: string[] };
  } => {
    const nodeId = io.mintId();
    const donorNode = donor.nodeId === undefined ? undefined : fold.plan.nodes[donor.nodeId];
    const logicalTaskId = donor.logicalTaskId ?? donorNode?.logicalTaskId ?? io.mintId();
    const donorRef: DonorRef = {
      nodeId: donor.nodeId ?? '',
      rootEntryRef: donor.rootEntryRef,
      chain: donor.nodeId === undefined ? [] : [donor.nodeId],
      spawnKey: donor.spawnKey,
      logicalTaskId,
      paidUsd: donor.paidUsd,
    };
    let decision: AdmissionDecision;
    if (kind === 'reuse_full') {
      // A reuse link is an admitted spawn of its own origin: minus one
      // spawnUnit, zero live budget reserve.
      const debited = requireAccount().debitSpawn({ logicalTaskId, isNew: false });
      if (!debited.ok) {
        throw new ConfigError('termination_exhausted: maxTotalSpawns reached at a reuse link');
      }
      decision = {
        verdict: {
          kind: 'reuse_full',
          donor: donorRef,
          spawnUnitsAfter: debited.spawnUnitsAfter,
          lineage: { logicalTaskId, isNew: false, depth: 1 },
        },
        statsBefore: { spawnsBefore: 0, childrenOfParentBefore: 0, depth: 1 },
        nodeId,
      };
    } else {
      // Graft takes the full standard reserve, no discount: reclaim is a
      // realizable saving, not a prepayment.
      const admitted = io.admission.admit(
        {
          origin: 'spawn_agent',
          name: op.spec.agentType,
          childScope: nodeScopeOf(nodeId),
          parentAccountScope: ROOT_ACCOUNT,
          nodeKey: planScope,
          ...(op.spec.budgetUsd === undefined ? {} : { budgetUsd: op.spec.budgetUsd }),
          lineage: { continues: logicalTaskId, causeRef: donor.rootEntryRef, relation: 'respawn' },
          signature: {
            agentType: op.spec.agentType,
            isolation: canonicalIsolationTag(
              op.spec.isolation ??
                (io.profiles[op.spec.agentType] as AgentProfile | undefined)?.isolation,
            ),
          },
          ladderLength: ladderLengthOf(io.profiles[op.spec.agentType]),
        },
        { commitReserve: false },
      );
      if (admitted.verdict.kind !== 'admit') {
        throw new ConfigError(
          `graft admission failed (${admitted.verdict.kind === 'reject' ? admitted.verdict.reason.code : admitted.verdict.kind})`,
        );
      }
      decision = {
        verdict: {
          kind: 'admit_graft',
          donor: donorRef,
          reserve: admitted.verdict.reserve,
          boot: {
            eligiblePaidUsd: donor.eligiblePaidUsd,
            worktreePinned: donor.worktreePinned,
            ...(donor.checkpointRef === undefined ? {} : { checkpointRef: donor.checkpointRef }),
          },
          spawnUnitsAfter: admitted.verdict.spawnUnitsAfter,
          lineage: admitted.verdict.lineage,
        },
        statsBefore: admitted.statsBefore,
        nodeId,
        ...(admitted.ladderLength === undefined ? {} : { ladderLength: admitted.ladderLength }),
      };
    }
    return {
      applied: {
        op: 'add_task',
        spec: op.spec,
        ...(op.deps === undefined ? {} : { deps: op.deps }),
        ...(op.priority === undefined ? {} : { priority: op.priority }),
        nodeId,
      },
      admission: decision,
      nodeId,
      reuse: { donorScope: donor.rootScope, chain: [...donor.chain] },
    };
  };

  /** Compiles applied cancels into severing abandons. */
  const landCancelAbandons = async (
    value: PlanRevisionValue,
    authorizedBy: EntryRef,
  ): Promise<void> => {
    for (const outcome of value.outcomes) {
      if (outcome.kind === 'dropped') {
        continue;
      }
      const applied = outcome.kind === 'applied' ? outcome.op : outcome.applied;
      if (applied.op !== 'cancel_task' || applied.requestOnly === true) {
        continue;
      }
      await abandonNode(applied.nodeId, authorizedBy, applied.reason ?? 'cancel_task');
      for (const cascaded of applied.cascadeNodeIds ?? []) {
        await abandonNode(cascaded, authorizedBy, 'cancel_task cascade');
      }
    }
  };

  /** Severs a cancelled node's dispatched branch. */
  const abandonNode = async (
    nodeId: NodeId,
    authorizedBy: EntryRef,
    reason: string,
  ): Promise<void> => {
    const root = nodeRootOf(nodeId);
    if (root === undefined) {
      return;
    }
    const node = fold.plan.nodes[nodeId];
    await io.abandonBranch({
      target: root.seq,
      authorizedBy,
      nodeId,
      ...(node === undefined ? {} : { logicalTaskId: node.logicalTaskId }),
      reason,
    });
  };

  /** The abandoned-spend view pinned to the plan_view snapshot (DEF-5). */
  const pinnedAbandonedSpend = (): {
    abandonedUsd: number;
    reclaimedUsd: number;
    netLostUsd: number;
  } => {
    const pinnedEntries = io.snapshot().filter((entry) => entry.seq <= pinnedPlanSeq);
    const view = DedupIndex.fold(pinnedEntries, {
      priceUsd: (servedBy, usage) => io.priceUsd(servedBy, usage),
    }).abandonedSpend();
    return {
      abandonedUsd: view.abandonedUsd,
      reclaimedUsd: view.reclaimedUsd,
      netLostUsd: view.netLostUsd,
    };
  };

  /** True until boot completes: entries folded then are replays. */
  let absorbedAsReplay = true;

  const specAgentTypeOf = (nodeId: string | undefined): string =>
    (nodeId === undefined
      ? undefined
      : (fold.specs[nodeId] as { agentType?: string } | undefined)?.agentType) ?? 'unknown';

  /**
   * The one formatter for the spawn events of journal-embedded
   * admission rows (v1.22.0 review P2-5): PlanRunner journals every
   * admission INSIDE a carrying entry (a plan.revision, a ladder
   * verdict, an escalation decision), and before v1.23 none of them
   * emitted spawn:admitted / spawn:rejected at all. Recovered rows
   * emit with the standard replayed marker.
   */
  const emitSpawnDecisionRows = (
    entrySeq: number,
    rows: readonly unknown[] | undefined,
    agentTypeAt: (row: { nodeId?: string }, index: number) => string,
    replayed?: boolean,
  ): void => {
    for (const [index, raw] of (rows ?? []).entries()) {
      const row = raw as {
        nodeId?: string;
        decision?: {
          verdict?: {
            kind?: string;
            lineage?: { logicalTaskId?: string };
            spawnUnitsAfter?: number;
            reason?: { code?: string };
          };
        };
      };
      const verdict = row.decision?.verdict;
      if (verdict?.kind === undefined) {
        continue;
      }
      const agentType = agentTypeAt(row, index);
      const options = replayed === true ? { replayed: true } : undefined;
      if (verdict.kind === 'reject') {
        io.emit(
          {
            type: 'spawn:rejected',
            entryRef: entrySeq,
            code: verdict.reason?.code ?? 'unknown',
            agentType,
          },
          options,
        );
      } else if (
        verdict.kind === 'admit' ||
        verdict.kind === 'reuse_full' ||
        verdict.kind === 'admit_graft'
      ) {
        io.emit(
          {
            type: 'spawn:admitted',
            entryRef: entrySeq,
            verdict: verdict.kind,
            agentType,
            logicalTaskId: verdict.lineage?.logicalTaskId ?? 'unknown',
            ...(verdict.spawnUnitsAfter === undefined
              ? {}
              : { spawnUnitsAfter: verdict.spawnUnitsAfter }),
          },
          options,
        );
      }
    }
  };

  const absorbPlan = (): void => {
    for (const entry of io.snapshot()) {
      if (entry.seq <= planCursor || entry.scope !== planScope) {
        continue;
      }
      if (entry.kind !== 'plan.revision' && entry.kind !== 'plan.decision') {
        continue;
      }
      fold = applyPlanEntry(fold, entry);
      planCursor = entry.seq;
      if (entry.kind === 'plan.revision') {
        feedGuards(entry);
        // The revision's embedded admissions surface here, identically
        // on the live path and on replay absorb; the fold has already
        // landed the specs the rows point at (v1.22.0 review P2-5).
        const value = entry.value as { admissions?: unknown[] } | undefined;
        emitSpawnDecisionRows(
          entry.seq,
          value?.admissions,
          (row) => specAgentTypeOf(row.nodeId),
          absorbedAsReplay ? true : undefined,
        );
      }
    }
  };

  /**
   * Feeds the guard counters from one landed revision (M7-T06): identical
   * on the live path and on replay absorb, so the freeze thresholds never
   * shift across a resume. Fired verdicts queue for the journal append
   * (deduplicated against already-journaled verdicts by content key).
   */
  const feedGuards = (entry: JournalEntry): void => {
    const value = readPlanRevision(entry);
    if (value === undefined) {
      return;
    }
    for (const outcome of value.outcomes) {
      if (outcome.kind === 'dropped') {
        continue;
      }
      const applied = outcome.kind === 'applied' ? outcome.op : outcome.applied;
      if (applied.op === 'cancel_task' && applied.requestOnly !== true) {
        const spec = fold.specs[applied.nodeId];
        if (spec !== undefined) {
          guards.onSevered(coarseOf(spec));
        }
        for (const cascaded of applied.cascadeNodeIds ?? []) {
          const cascadedSpec = fold.specs[cascaded];
          if (cascadedSpec !== undefined) {
            guards.onSevered(coarseOf(cascadedSpec));
          }
        }
      }
      if (applied.op === 'add_task') {
        const verdict = guards.onReAdd(coarseOf(applied.spec));
        if (verdict !== undefined) {
          pendingGuardVerdicts.push(verdict);
        }
      }
    }
    const streakVerdict = guards.onRevisionLanded(effectiveDroppedStreak(fold));
    if (streakVerdict !== undefined) {
      pendingGuardVerdicts.push(streakVerdict);
    }
  };

  const requireAccount = (): TerminationAccount => {
    if (account === undefined) {
      throw new ConfigError('PlanRunner used before boot (the extension seam boots it)');
    }
    return account;
  };

  const deniedWriter = async (denied: TerminationDeniedValue): Promise<EntryRef> => {
    const entry = await io.append({
      scope: rootScope,
      key: deriverV2.deriveKey({
        kind: TERMINATION_DENIED_KEY_KIND,
        resource: denied.resource,
        ...(denied.logicalTaskId === undefined ? {} : { logicalTaskId: denied.logicalTaskId }),
        ...(denied.requestedByRef === undefined ? {} : { requestedByRef: denied.requestedByRef }),
      }),
      kind: 'termination.denied',
      value: denied as unknown as Json,
    });
    io.emit({
      type: 'termination:denied',
      entryRef: entry.seq,
      counter: denied.resource,
      code: denied.reasonCode,
    });
    return entry.seq;
  };

  const appendPlanDecision = async (
    origin: PlanDecisionOrigin,
    ops: EnginePlanOp[],
    causeRef: EntryRef,
  ): Promise<EntryRef> => {
    // Engine authorship happens at the fold head under PlanWriteLock:
    // preview computes planHashAfter before the append.
    const preview = applyDecisionOps(fold, ops, -1);
    const value: PlanDecisionValue = {
      origin,
      ops,
      causeRef,
      planHashBefore: planHash(fold.plan),
      planHashAfter: planHash(preview.plan),
      hashVersion: 2,
    };
    const entry = await io.append({
      scope: planScope,
      key: planDecisionKey(origin, ops, causeRef),
      kind: 'plan.decision',
      value: value as unknown as Json,
    });
    await io.flush();
    absorbPlan();
    return entry.seq;
  };

  /**
   * The rung-resolved dispatch fields of a laddered node:
   * the concrete ModelRef enters the attempt's identity hash, the rung
   * caps bind as usage limits (maxTokens reads as the per-turn output
   * cap, so maxTurns x maxTokens bounds the worst-case failed attempt),
   * maxCostUsd binds the child ceiling, and memoizeOutcome opts the rung
   * into terminal memoization. Mechanical gate profiles are validated
   * against the per-engine registry BEFORE paying for the attempt.
   */
  const ladderDispatchFields = (
    node: PlanNode,
    spec: TaskSpec,
    ladder: CanonicalLadderSpec,
  ): Partial<ExtensionDispatchSpec> => {
    for (const gate of ladder.acceptance ?? []) {
      if (gate.kind === 'mechanical' && io.gates[gate.profile] === undefined) {
        throw new ConfigError(
          `mechanical gate profile '${gate.profile}' is not registered under defaults.gates ` + '',
        );
      }
    }
    const startTier = clampStartTier(ladder, spec.model_hint?.startTier);
    const raises = requireAccount().rungIndexOf(node.logicalTaskId);
    const rungIndex = executingRungOf(ladder, startTier, raises);
    const rung = ladder.rungs[rungIndex];
    if (rung === undefined) {
      throw new ConfigError(`ladder rung ${String(rungIndex)} is undeclared`);
    }
    return {
      model: ladderRungChoice(ladder, rungIndex),
      usageLimits: {
        ...spec.usageLimits,
        maxTurns: rung.maxTurns,
        maxOutputTokensPerTurn: rung.maxTokens,
      },
      ...(rung.maxCostUsd === undefined
        ? spec.budgetUsd === undefined
          ? {}
          : { budgetUsd: spec.budgetUsd }
        : { budgetUsd: rung.maxCostUsd }),
      ...(rung.memoizeOutcome === undefined ? {} : { memoizeOutcome: rung.memoizeOutcome }),
    };
  };

  /**
   * Runs the acceptance gates of one settled ok attempt in declaration
   * order, fail fast. Every evaluation is a decision entry
   * (kind 'decision', decisionType 'gate-verdict') computed once live and
   * recovered by content key on re-execution; the spot-check draw is
   * io.random (journaled ctx.random, never Math.random).
   */
  const runAcceptanceGates = async (
    node: PlanNode,
    spec: TaskSpec,
    settled: AgentResult<unknown>,
    attemptRef: EntryRef,
    rungIndex: number,
    ladder: CanonicalLadderSpec,
  ): Promise<{ pass: boolean; failedGate?: GateVerdictValue }> => {
    const gates = ladder.acceptance ?? [];
    for (const [gateIndex, gate] of gates.entries()) {
      const key = gateVerdictKey(attemptRef, gateIndex);
      const existing = io
        .snapshot()
        .find(
          (entry) => entry.kind === 'decision' && entry.scope === planScope && entry.key === key,
        );
      let verdict: GateVerdictValue;
      if (existing !== undefined) {
        // Roll-forward: the journaled verdict is the truth; gates never
        // re-evaluate live on a re-executed turn.
        verdict = existing.value as unknown as GateVerdictValue;
      } else {
        const base = {
          decisionType: 'gate-verdict' as const,
          logicalTaskId: node.logicalTaskId,
          nodeId: node.nodeId,
          attemptRef,
          rung: rungIndex,
        };
        if (gate.kind === 'mechanical') {
          const profile = io.gates[gate.profile] as MechanicalGateProfile | undefined;
          if (profile === undefined) {
            throw new ConfigError(
              `mechanical gate profile '${gate.profile}' is not registered under defaults.gates`,
            );
          }
          const outcome = profile(settled.artifacts ?? []);
          verdict = {
            ...base,
            gate: 'mechanical',
            profile: gate.profile,
            pass: outcome.pass,
            ...(outcome.detail === undefined ? {} : { detail: outcome.detail }),
          };
        } else if (gate.kind === 'judge') {
          const judged = await dispatchJudge(node, spec, settled, attemptRef, gateIndex, {
            // FR-119: the judge runs on a declared rung with index >= the
            // executing rung (raised to the executing rung when the
            // declaration sits below it), or an explicit named override.
            rung: typeof gate.rung === 'number' ? Math.max(gate.rung, rungIndex) : gate.rung,
            ladder,
          });
          verdict = { ...base, gate: 'judge', ...judged };
        } else {
          const draw = await io.random(`spot-check:${String(attemptRef)}:${String(gateIndex)}`);
          const selected = draw < gate.fraction;
          if (!selected) {
            verdict = {
              ...base,
              gate: 'spot-check',
              pass: true,
              spotCheck: { draw, fraction: gate.fraction, selected },
            };
          } else {
            // A selected spot-check judges on the TOP rung: always a
            // declared rung with index >= the executing one.
            const judged = await dispatchJudge(node, spec, settled, attemptRef, gateIndex, {
              rung: ladder.rungs.length - 1,
              ladder,
            });
            verdict = {
              ...base,
              gate: 'spot-check',
              ...judged,
              spotCheck: { draw, fraction: gate.fraction, selected },
            };
          }
        }
        await io.append({
          scope: planScope,
          key,
          kind: 'decision',
          value: verdict as unknown as Json,
        });
      }
      if (!verdict.pass) {
        return { pass: false, failedGate: verdict };
      }
    }
    return { pass: true };
  };

  /**
   * One judge invocation: a bounded child dispatch on the
   * declared rung with the forced verdict schema. Identity is DERIVED
   * (never minted live) so a re-executed turn replays the same judge by
   * content match. A judge that itself errors fails CLOSED: acceptance
   * exists to catch bad work, and the failure stays bounded by the
   * declared rungs.
   */
  const dispatchJudge = async (
    node: PlanNode,
    spec: TaskSpec,
    settled: AgentResult<unknown>,
    attemptRef: EntryRef,
    gateIndex: number,
    target: { rung: number | string; ladder: CanonicalLadderSpec },
  ): Promise<{ pass: boolean; detail?: string }> => {
    const model =
      typeof target.rung === 'number'
        ? ladderRungChoice(target.ladder, target.rung)
        : // The explicit override was parseModelRef-validated at
          // canonicalization (FR-119).
          { model: target.rung as ModelRef };
    const prompt = judgePrompt({
      taskPrompt: spec.prompt,
      outputSummary:
        typeof settled.output === 'string' ? settled.output : JSON.stringify(settled.output),
      artifactIds: (settled.artifacts ?? []).map((artifact) => artifact.id),
    });
    const { handle } = await io.dispatch(
      {
        agentType: spec.agentType,
        prompt,
        model,
        schema: JUDGE_VERDICT_SCHEMA,
        usageLimits: { maxTurns: 2 },
      },
      `${nodeScopeOf(node.nodeId)}/judge:${String(gateIndex)}`,
      {
        // DERIVED identity, never minted live: a re-executed turn replays
        // the same judge by content match and the digest stays stable.
        nodeId: `${node.nodeId}:judge:${String(gateIndex)}`,
        logicalTaskId: `judge:${String(attemptRef)}:${String(gateIndex)}`,
      },
    );
    const result = await settledJudge(handle);
    if (result?.status === 'ok') {
      const output = result.output as { pass?: boolean; reason?: string } | null;
      return {
        pass: output?.pass === true,
        ...(output?.reason === undefined ? {} : { detail: output.reason }),
      };
    }
    return { pass: false, detail: `judge ${result?.status ?? 'missing'}` };
  };

  /** Awaits a judge settlement (bounded by the judge's own maxTurns). */
  const settledJudge = async (handle: number): Promise<AgentResult<unknown> | undefined> => {
    for (;;) {
      const settled = io.settledOf(handle);
      if (settled !== undefined) {
        return settled;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  };

  /**
   * The ladder driver of one settled attempt (DEF-2/DEF-3).
   * Returns 'raised' when the next rung attempt was authorized and
   * dispatched (the node STAYS running under a new handle); 'none' when
   * the ordinary terminal landing proceeds; or a forced terminal status
   * (an ok attempt whose acceptance failed with no raise left lands
   * failed, never done).
   */
  const ladderStep = async (
    node: PlanNode,
    spec: TaskSpec,
    settled: AgentResult<unknown>,
    attemptRef: EntryRef,
  ): Promise<{ kind: 'raised' } | { kind: 'none' } | { kind: 'terminal'; to: PlanNodeStatus }> => {
    const ladder = canonicalLadderOf(io.profiles[spec.agentType]);
    if (ladder === undefined) {
      return { kind: 'none' };
    }
    const account = requireAccount();
    const startTier = clampStartTier(ladder, spec.model_hint?.startTier);
    const verdictKey = ladderVerdictKey(attemptRef);
    const existing = io
      .snapshot()
      .find(
        (entry) =>
          entry.kind === 'decision' && entry.scope === planScope && entry.key === verdictKey,
      );
    if (existing !== undefined) {
      // Roll-forward: the verdict journaled before a crash; its debits
      // folded at boot. Re-issue only the dispatch effect.
      const recorded = existing.value as unknown as LadderVerdictValue;
      if (recorded.raisesRung && recorded.nextAttempt !== undefined) {
        await dispatchRung(node, spec, ladder, recorded.nextAttempt.rungIndex);
        return { kind: 'raised' };
      }
      return recorded.trigger === 'verify-failed'
        ? { kind: 'terminal', to: 'failed' }
        : { kind: 'none' };
    }
    let trigger: TriggerClass | undefined;
    let failedGate: GateVerdictValue | undefined;
    if (settled.status === 'ok') {
      const gates = await runAcceptanceGates(
        node,
        spec,
        settled,
        attemptRef,
        executingRungOf(ladder, startTier, account.rungIndexOf(node.logicalTaskId)),
        ladder,
      );
      if (gates.pass) {
        return { kind: 'none' };
      }
      trigger = 'verify-failed';
      failedGate = gates.failedGate;
    } else {
      trigger = ladderTriggerOf(settled);
      if (trigger === undefined) {
        return { kind: 'none' };
      }
    }
    if (failedGate !== undefined) {
      io.emit({
        type: 'verify:failed',
        entryRef: attemptRef,
        logicalTaskId: node.logicalTaskId,
        rung: failedGate.rung,
        gate: failedGate.gate,
      });
    }
    const verdictBase = {
      decisionType: 'ladder-verdict' as const,
      logicalTaskId: node.logicalTaskId,
      nodeId: node.nodeId,
      trigger,
      attemptRef,
    };
    const landVerdict = async (
      value: LadderVerdictValue,
    ): Promise<
      { kind: 'raised' } | { kind: 'none' } | { kind: 'terminal'; to: PlanNodeStatus }
    > => {
      const verdictEntry = await io.append({
        scope: planScope,
        key: verdictKey,
        kind: 'decision',
        value: value as unknown as Json,
      });
      emitSpawnDecisionRows(verdictEntry.seq, value.admissions, () => spec.agentType);
      if (value.raisesRung && value.nextAttempt !== undefined) {
        io.emit({
          type: 'termination:debit',
          entryRef: attemptRef,
          counter: 'rungs',
          remaining: value.rungsRemainingAfter ?? 0,
          phi: account.phi(),
        });
        await dispatchRung(node, spec, ladder, value.nextAttempt.rungIndex);
        return { kind: 'raised' };
      }
      // The declared fallback path of an ended ladder
      // (budget-denied-rung): the ordinary terminal landing; a
      // verify-failed ok attempt lands failed, never done.
      return trigger === 'verify-failed' ? { kind: 'terminal', to: 'failed' } : { kind: 'none' };
    };
    if (!ladder.escalateOn.includes(trigger)) {
      return await landVerdict({
        ...verdictBase,
        raisesRung: false,
        reason: 'trigger_not_declared',
      });
    }
    const raises = account.rungIndexOf(node.logicalTaskId);
    const currentRung = executingRungOf(ladder, startTier, raises);
    if (currentRung >= ladder.rungs.length - 1) {
      return await landVerdict({ ...verdictBase, raisesRung: false, reason: 'top_rung' });
    }
    const counters = account.snapshot().perLineage[node.logicalTaskId];
    if (counters === undefined || counters.rungsRemaining <= 0) {
      if (counters !== undefined) {
        // termination.denied writes strictly BEFORE the fallback
        // surfaces: the async debit path owns the denied entry.
        await account.debit('rungs', node.logicalTaskId);
      }
      return await landVerdict({ ...verdictBase, raisesRung: false, reason: 'rungs_exhausted' });
    }
    // The rung RESPAWN is an admitted spawn: admission
    // computes the lineage block (relation 'rung-retry') and the spawn
    // debit; the raising verdict embeds both, so the folds replay them.
    const childScope = nodeScopeOf(node.nodeId);
    const admitted = io.admission.admit(
      {
        origin: 'spawn_agent',
        name: spec.agentType,
        childScope,
        parentAccountScope: ROOT_ACCOUNT,
        nodeKey: planScope,
        ...(spec.budgetUsd === undefined ? {} : { budgetUsd: spec.budgetUsd }),
        lineage: { continues: node.logicalTaskId, causeRef: attemptRef, relation: 'rung-retry' },
        signature: {
          agentType: spec.agentType,
          isolation: canonicalIsolationTag(
            spec.isolation ?? (io.profiles[spec.agentType] as AgentProfile | undefined)?.isolation,
          ),
          ...(spec.approach === undefined ? {} : { approachTag: spec.approach }),
        },
        ladderLength: ladder.rungs.length,
      },
      { commitReserve: false },
    );
    if (admitted.verdict.kind !== 'admit') {
      if (
        admitted.verdict.kind === 'reject' &&
        admitted.verdict.reason.code === 'termination_exhausted'
      ) {
        await account.debit('spawnUnits', node.logicalTaskId);
      }
      return await landVerdict({ ...verdictBase, raisesRung: false, reason: 'respawn_denied' });
    }
    const raised = account.debitRung(node.logicalTaskId);
    if (!raised.ok) {
      await account.debit('rungs', node.logicalTaskId);
      return await landVerdict({ ...verdictBase, raisesRung: false, reason: 'rungs_exhausted' });
    }
    return await landVerdict({
      ...verdictBase,
      raisesRung: true,
      rungIndexAfter: raised.rungIndexAfter,
      rungsRemainingAfter: raised.rungsRemainingAfter,
      nextAttempt: {
        childScope,
        // The FULL computed lineage block (relation 'rung-retry', the
        // approach signatures): reused byte-exact on replay;
        // the debit block stays inside the embedded admission.
        lineage: admitted.lineage as unknown as Json,
        rungIndex: executingRungOf(ladder, startTier, raised.rungIndexAfter),
      },
      admissions: [
        {
          opIndex: 0,
          nodeId: node.nodeId,
          decision: { verdict: admitted.verdict, statsBefore: admitted.statsBefore },
          childScope,
        } as unknown as Json,
      ],
    });
  };

  /** Dispatches the NEXT rung attempt; the node stays running. */
  const dispatchRung = async (
    node: PlanNode,
    spec: TaskSpec,
    ladder: CanonicalLadderSpec,
    rungIndex: number,
  ): Promise<void> => {
    const rung = ladder.rungs[rungIndex];
    if (rung === undefined) {
      throw new ConfigError(`ladder rung ${String(rungIndex)} is undeclared`);
    }
    const { handle } = await io.dispatch(
      {
        agentType: spec.agentType,
        prompt: spec.prompt,
        model: ladderRungChoice(ladder, rungIndex),
        usageLimits: {
          ...spec.usageLimits,
          maxTurns: rung.maxTurns,
          maxOutputTokensPerTurn: rung.maxTokens,
        },
        ...(rung.maxCostUsd === undefined
          ? spec.budgetUsd === undefined
            ? {}
            : { budgetUsd: spec.budgetUsd }
          : { budgetUsd: rung.maxCostUsd }),
        ...(rung.memoizeOutcome === undefined ? {} : { memoizeOutcome: rung.memoizeOutcome }),
        ...(spec.outputSchemaRef === undefined ? {} : { outputSchemaRef: spec.outputSchemaRef }),
        ...(spec.toolsetRef === undefined ? {} : { toolsetRef: spec.toolsetRef }),
        ...(spec.isolation === undefined ? {} : { isolation: spec.isolation }),
        ...(spec.escalation === undefined ? {} : { escalation: spec.escalation }),
      },
      nodeScopeOf(node.nodeId),
      { nodeId: node.nodeId, logicalTaskId: node.logicalTaskId },
    );
    dispatched.set(node.nodeId, handle);
  };

  /** The report kind behind a reportRef (terminal or suspended form). */
  const reportKindOf = (reportRef: EntryRef): EscalationKind | undefined => {
    const entry = io.snapshot().find((candidate) => candidate.seq === reportRef);
    if (entry === undefined) {
      return undefined;
    }
    const terminal = (entry.escalation as { kind?: EscalationKind } | undefined)?.kind;
    if (terminal !== undefined) {
      return terminal;
    }
    return ((entry.value as { input?: { kind?: EscalationKind } } | undefined)?.input ?? {}).kind;
  };

  /**
   * Writes THE authoritative escalation-decision entry:
   * idempotent by content key (decide-once per report); the counting
   * debit is atomic with the append and a DENIED debit lands
   * termination.denied strictly before, flipping the entry to
   * `capExceeded` with `countsAgainstLimit: false` so the folds stay
   * replay-strict (the denied entry is the counting record).
   */
  const writeEscalationDecision = async (input: {
    node: PlanNode;
    reportRef: EntryRef;
    decision: EscalationDecision;
    resolvedBy: 'default' | 'class' | 'live' | 'revision-transform';
    admissions?: Json[];
  }): Promise<JournalEntry> => {
    const key = escalationDecisionKey(input.reportRef);
    const existing = io
      .snapshot()
      .find((entry) => entry.kind === 'decision' && entry.scope === planScope && entry.key === key);
    if (existing !== undefined) {
      return existing;
    }
    const kind = reportKindOf(input.reportRef);
    const counts = kind !== undefined && countsAgainstLimit(kind);
    const account = requireAccount();
    let value: EscalationDecisionValue = {
      decisionType: 'escalation-decision',
      logicalTaskId: input.node.logicalTaskId,
      nodeId: input.node.nodeId,
      decision: input.decision,
      reportRef: input.reportRef,
      countsAgainstLimit: counts,
      resolvedBy: input.resolvedBy,
      ...(input.admissions === undefined ? {} : { admissions: input.admissions }),
    };
    if (counts) {
      const debited = account.debitEscalation(input.node.logicalTaskId);
      if (debited.ok) {
        value = { ...value, escalationUnitsAfter: debited.escalationUnitsAfter };
      } else {
        // Cap exceeded: the denied entry precedes; the
        // decision still resolves the fate, flagged, never a bare limit.
        await account.debit('escalationUnits', input.node.logicalTaskId);
        value = { ...value, countsAgainstLimit: false, capExceeded: true };
      }
    }
    const entry = await io.append({
      scope: planScope,
      key,
      kind: 'decision',
      value: value as unknown as Json,
    });
    io.emit({
      type: 'escalation:decided',
      entryRef: entry.seq,
      decision: input.decision.kind,
      by: input.resolvedBy,
      countsAgainstLimit: value.countsAgainstLimit,
    });
    // Decomposition rows align with decision.children by construction;
    // other carriers resolve through the landed node specs.
    const children =
      input.decision.kind === 'decompose'
        ? (input.decision.children as unknown as Array<{ agentType?: string }>)
        : undefined;
    emitSpawnDecisionRows(entry.seq, input.admissions, (row, index) => {
      const fromChildren = children?.[index]?.agentType;
      return fromChildren ?? specAgentTypeOf(row.nodeId ?? input.node.nodeId);
    });
    if (value.escalationUnitsAfter !== undefined) {
      io.emit({
        type: 'termination:debit',
        entryRef: entry.seq,
        counter: 'escalationUnits',
        remaining: value.escalationUnitsAfter,
        phi: account.phi(),
      });
    }
    return entry;
  };

  /**
   * Applies one decided escalation to the plan: the
   * resolve_escalation op (retry re-opens the node in place, accept
   * closes it done, cancel closes it cancelled and severs the branch,
   * decompose leaves it escalated while the admitted children carry the
   * work through spawn_admitted ops in the SAME plan.decision).
   */
  const applyEscalationDecision = async (
    node: PlanNode,
    decisionEntry: JournalEntry,
    reportRefOverride?: EntryRef,
  ): Promise<void> => {
    const value = decisionEntry.value as unknown as EscalationDecisionValue;
    const ops: EnginePlanOp[] = [
      {
        kind: 'resolve_escalation',
        nodeId: node.nodeId,
        decision: value.decision,
        resolvedBy: value.resolvedBy,
        escalationRef: reportRefOverride ?? value.reportRef,
      },
    ];
    if (value.decision.kind === 'decompose') {
      for (const [index, raw] of value.decision.children.entries()) {
        const admissionRow = (value.admissions ?? [])[index] as
          { nodeId?: string; decision?: AdmissionDecision } | undefined;
        const admitted = admissionRow?.decision;
        const verdict = admitted?.verdict;
        if (admitted === undefined || verdict === undefined || verdict.kind !== 'admit') {
          continue;
        }
        ops.push({
          kind: 'spawn_admitted',
          nodes: [
            {
              nodeId: admissionRow?.nodeId ?? io.mintId(),
              logicalTaskId: verdict.lineage.logicalTaskId,
              spec: raw as unknown as TaskSpec,
            },
          ],
          admission: admitted,
        });
      }
    }
    const planDecisionSeq = await appendPlanDecision(
      decisionOriginOf(value.resolvedBy),
      ops,
      decisionEntry.seq,
    );
    if (value.decision.kind === 'cancel') {
      // cancel compiles into the severing abandon,
      // authorized by the plan.decision that landed the transition.
      await abandonNode(node.nodeId, planDecisionSeq, 'escalation cancel');
      io.emit({ type: 'node:cancelled', nodeId: node.nodeId, logicalTaskId: node.logicalTaskId });
    }
    if (value.decision.kind === 'retry') {
      // The retry re-opens the node in place; the stale
      // dispatch handle must not shadow the re-dispatch or the re-opened
      // node sits ready forever while scheduleReady skips it.
      dispatched.delete(node.nodeId);
    }
    await scheduleReady();
  };

  /**
   * Decomposition admissions: each proposed child is an
   * admitted spawn with a FRESH lineage minted inside the decision
   * entry; the spawn debits ride the decision.
   */
  const admitDecomposition = (children: readonly TaskSpec[]): Json[] => {
    const rows: Json[] = [];
    for (const spec of children) {
      const nodeId = io.mintId();
      const admitted = io.admission.admit(
        {
          origin: 'spawn_agent',
          name: spec.agentType,
          childScope: nodeScopeOf(nodeId),
          parentAccountScope: ROOT_ACCOUNT,
          nodeKey: planScope,
          ...(spec.budgetUsd === undefined ? {} : { budgetUsd: spec.budgetUsd }),
          signature: {
            agentType: spec.agentType,
            isolation: canonicalIsolationTag(
              spec.isolation ??
                (io.profiles[spec.agentType] as AgentProfile | undefined)?.isolation,
            ),
            ...(spec.approach === undefined ? {} : { approachTag: spec.approach }),
          },
          ladderLength: ladderLengthOf(io.profiles[spec.agentType]),
        },
        { commitReserve: false },
      );
      rows.push({ nodeId, decision: admitted } as unknown as Json);
    }
    return rows;
  };

  /**
   * Absorbs the DEF-4 winner of a Flavor B suspension into the
   * authoritative decision (the resolution entry closes the
   * suspension FIRST; the plan.decision references it strictly after).
   * The timeout defaultDecision, a live onEscalation decision, and a
   * class-level fan-out all land here through their journaled `by`.
   */
  const landFlavorBDecision = async (node: PlanNode): Promise<boolean> => {
    const prefix = nodeScopeOf(node.nodeId);
    const suspended = io
      .snapshot()
      .find(
        (entry) =>
          entry.kind === 'approval' &&
          (entry.scope === prefix || entry.scope.startsWith(`${prefix}/`)) &&
          (entry.value as { toolName?: string } | undefined)?.toolName === 'escalate',
      );
    if (suspended === undefined) {
      return false;
    }
    const winner = io
      .snapshot()
      .find((entry) => entry.kind === 'resolution' && entry.ref === suspended.seq);
    if (winner === undefined) {
      return false;
    }
    // The DEF-4 payload rides the entry's `resolution` field, never
    // `value`.
    const payload = winner.resolution as unknown as { by?: string; value?: Json } | undefined;
    const decision = payload?.value as EscalationDecision | undefined;
    if (decision === undefined || typeof decision !== 'object') {
      return false;
    }
    const resolvedBy = resolvedByOf(payload?.by ?? 'external');
    const admissions =
      decision.kind === 'decompose'
        ? admitDecomposition(decision.children as unknown as TaskSpec[])
        : undefined;
    const decisionEntry = await writeEscalationDecision({
      node,
      reportRef: suspended.seq,
      decision,
      resolvedBy,
      ...(admissions === undefined ? {} : { admissions }),
    });
    await io.flush();
    absorbPlan();
    const landed = fold.plan.nodes[node.nodeId];
    if (landed !== undefined && landed.status === 'escalated') {
      await applyEscalationDecision(landed, decisionEntry);
    }
    return true;
  };

  /**
   * Lands revision-transform escalation resolutions
   * (cancel_task on an escalated node): the authoritative decision with
   * verdict cancel, then the resolve_escalation plan.decision, then the
   * severing abandon; all idempotent for the roll-forward path.
   */
  const landRevisionEscalations = async (value: PlanRevisionValue): Promise<void> => {
    // Collect the revision's resolvable targets first: two or more
    // same-kind reports resolved by ONE revision merge into ONE
    // class-level decision entry with per-lineage debits
    // (DEF-2 class-storm-single-turn).
    interface EscalationTarget {
      node: PlanNode;
      reportRef: EntryRef;
      kind: EscalationKind | undefined;
      reason?: string;
    }
    const targets: EscalationTarget[] = [];
    for (const outcome of value.outcomes) {
      if (outcome.kind !== 'transformed' || outcome.reason !== 'resolved_escalation') {
        continue;
      }
      const applied = outcome.applied;
      if (applied.op !== 'cancel_task') {
        continue;
      }
      const node = fold.plan.nodes[applied.nodeId];
      if (node === undefined || node.status !== 'escalated') {
        continue;
      }
      const root = nodeRootOf(applied.nodeId);
      const terminal =
        root === undefined
          ? undefined
          : io
              .snapshot()
              .find(
                (entry) =>
                  entry.kind === 'agent' && entry.ref === root.seq && entry.status === 'escalated',
              );
      if (terminal === undefined) {
        continue;
      }
      targets.push({
        node,
        reportRef: terminal.seq,
        kind: reportKindOf(terminal.seq),
        ...(applied.reason === undefined ? {} : { reason: applied.reason }),
      });
    }
    const byKind = new Map<string, EscalationTarget[]>();
    for (const target of targets) {
      const kindKey = target.kind ?? 'unknown';
      byKind.set(kindKey, [...(byKind.get(kindKey) ?? []), target]);
    }
    for (const group of byKind.values()) {
      if (group.length === 1) {
        const target = group[0];
        const decisionEntry = await writeEscalationDecision({
          node: target.node,
          reportRef: target.reportRef,
          decision: {
            kind: 'cancel',
            ...(target.reason === undefined ? {} : { reason: target.reason }),
          },
          resolvedBy: 'revision-transform',
        });
        await applyEscalationDecision(target.node, decisionEntry);
        continue;
      }
      const classEntry = await writeClassEscalationDecision(group);
      if (classEntry === undefined) {
        // A denied per-lineage debit degrades the group to the
        // single-target path so the denial semantics stay per report.
        for (const target of group) {
          const decisionEntry = await writeEscalationDecision({
            node: target.node,
            reportRef: target.reportRef,
            decision: {
              kind: 'cancel',
              ...(target.reason === undefined ? {} : { reason: target.reason }),
            },
            resolvedBy: 'revision-transform',
          });
          await applyEscalationDecision(target.node, decisionEntry);
        }
        continue;
      }
      for (const target of group) {
        await applyEscalationDecision(target.node, classEntry, target.reportRef);
      }
    }
  };

  /**
   * The class-level decision: ONE entry resolving N
   * same-kind reports, per-lineage debits embedded as `debits` rows,
   * resolvedBy 'class'. Returns undefined when any counting debit would
   * be denied (the caller degrades to single-target decisions).
   */
  const writeClassEscalationDecision = async (
    group: Array<{
      node: PlanNode;
      reportRef: EntryRef;
      kind: EscalationKind | undefined;
      reason?: string;
    }>,
  ): Promise<JournalEntry | undefined> => {
    const reportRefs = group.map((target) => target.reportRef).sort((a, b) => a - b);
    const key = deriverV2.deriveKey({ kind: 'escalation-decision', reportRefs });
    const existing = io
      .snapshot()
      .find((entry) => entry.kind === 'decision' && entry.scope === planScope && entry.key === key);
    if (existing !== undefined) {
      return existing;
    }
    const counts = group[0].kind !== undefined && countsAgainstLimit(group[0].kind);
    const account = requireAccount();
    if (counts) {
      const snapshot = account.snapshot();
      for (const target of group) {
        const state = snapshot.perLineage[target.node.logicalTaskId];
        if (state !== undefined && state.escalationUnitsRemaining <= 0) {
          return undefined;
        }
      }
    }
    const debits: Array<{ logicalTaskId: string; escalationUnitsAfter: number }> = [];
    if (counts) {
      for (const target of group) {
        const debited = account.debitEscalation(target.node.logicalTaskId);
        if (!debited.ok) {
          // Unreachable after the pre-check; degrade defensively.
          return undefined;
        }
        debits.push({
          logicalTaskId: target.node.logicalTaskId,
          escalationUnitsAfter: debited.escalationUnitsAfter,
        });
      }
    }
    const reason = group.find((target) => target.reason !== undefined)?.reason;
    const value: EscalationDecisionValue = {
      decisionType: 'escalation-decision',
      decision: { kind: 'cancel', ...(reason === undefined ? {} : { reason }) },
      reportRef: reportRefs[0],
      countsAgainstLimit: counts,
      resolvedBy: 'class',
      debits,
    };
    return io.append({
      scope: planScope,
      key,
      kind: 'decision',
      value: value as unknown as Json,
    });
  };

  /** Journals terminal transitions for settled dispatched children. */
  const landSettlements = async (): Promise<void> => {
    for (const [nodeId, handle] of dispatched) {
      const node = fold.plan.nodes[nodeId];
      if (node === undefined || node.status !== 'running') {
        continue;
      }
      const settled = io.settledOf(handle);
      if (settled === undefined) {
        continue;
      }
      const to = nodeStatusOf(settled.status);
      if (to === undefined) {
        continue;
      }
      const terminal = io
        .snapshot()
        .find((entry) => entry.kind === 'agent' && entry.ref === handle);
      const causeRef = terminal?.seq ?? handle;
      if (node.parkRequested && !node.cancelRequested && to === 'cancelled') {
        // The park lands at the turn boundary: the node
        // parks with its checkpoint anchor; the branch is severed with
        // the checkpoint retained and the worktree pinned under the
        // shared cap when capacity remains.
        const parkSeq = await appendPlanDecision(
          'park-landed',
          [
            {
              kind: 'set_node_status',
              nodeId,
              from: 'running',
              to: 'parked',
              cause: 'park-landed',
              causeRef,
              checkpointRef: handle,
            },
          ],
          causeRef,
        );
        const spec = fold.specs[nodeId];
        const disposition = parkDispositionOf(
          spec?.isolation,
          PinLedger.fold(io.snapshot()),
          DEFAULT_MAX_PINNED_WORKTREES,
        );
        const root = nodeRootOf(nodeId);
        if (root !== undefined) {
          await io.abandonBranch({
            target: root.seq,
            authorizedBy: parkSeq,
            nodeId,
            logicalTaskId: node.logicalTaskId,
            reason: 'park_task',
            retainCheckpoint: disposition.retainCheckpoint,
            retainWorktree: disposition.retainWorktree,
          });
        }
        // The slot frees for the unpark re-dispatch.
        dispatched.delete(nodeId);
        io.emit({ type: 'node:parked', nodeId, logicalTaskId: node.logicalTaskId });
        continue;
      }
      const cause = node.cancelRequested && to === 'cancelled' ? 'cancel-landed' : 'child-result';
      let terminalTo = to;
      let terminalCauseRef = causeRef;
      if (cause === 'child-result') {
        // The ladder driver: a declared trigger with rungs
        // left authorizes the next attempt and the node STAYS running; a
        // failed acceptance with no raise left forces failed, never done.
        const spec = fold.specs[nodeId];
        if (spec !== undefined) {
          const step = await ladderStep(node, spec, settled, handle);
          if (step.kind === 'raised') {
            continue;
          }
          if (step.kind === 'terminal') {
            terminalTo = step.to;
            terminalCauseRef = causeRef;
          }
        }
      }
      const decisionSeq = await appendPlanDecision(
        cause === 'cancel-landed' ? 'cancel-landed' : 'child-result',
        [
          {
            kind: 'set_node_status',
            nodeId,
            from: 'running',
            to: terminalTo,
            cause,
            causeRef: terminalCauseRef,
          },
        ],
        terminalCauseRef,
      );
      if (cause === 'cancel-landed') {
        // cancel_task compiles into abandon: the severing
        // entry makes the interrupted branch a donor candidate.
        await abandonNode(nodeId, decisionSeq, 'cancel_task');
        io.emit({ type: 'node:cancelled', nodeId, logicalTaskId: node.logicalTaskId });
      }
      if (cause === 'child-result' && terminalTo === 'escalated') {
        // escalation-rate-by-agentType rides this event:
        // the report kind plus the lineage attribution.
        const report = settled.escalation as
          | {
              kind?: 'scope_bigger' | 'scope_different' | 'blocked_with_evidence';
              costToDate?: { usd?: number };
            }
          | undefined;
        io.emit({
          type: 'escalation:raised',
          entryRef: causeRef,
          kind: report?.kind ?? 'scope_bigger',
          logicalTaskId: node.logicalTaskId,
          agentType: fold.specs[nodeId]?.agentType ?? '',
          costToDateUsd: report?.costToDate?.usd ?? 0,
        });
        // A Flavor B report reaching settlement is already DECIDED by
        // the DEF-4 winner (timeout default or live decision); absorb it
        // into the authoritative entry and apply the fate.
        const landed = fold.plan.nodes[nodeId];
        if (landed !== undefined) {
          await landFlavorBDecision(landed);
        }
      }
    }
  };

  /**
   * A retry decision's amendments: amendedPrompt and
   * startTier ride the journaled decision, so the re-dispatch is a pure
   * function of the journal, identical live and on replay.
   */
  const retryAmendmentsOf = (node: PlanNode): { prompt?: string; startTier?: number } => {
    if (node.escalationRef === undefined) {
      return {};
    }
    const key = escalationDecisionKey(node.escalationRef);
    const entry = io
      .snapshot()
      .find(
        (candidate) =>
          candidate.kind === 'decision' && candidate.scope === planScope && candidate.key === key,
      );
    const decision = (entry?.value as EscalationDecisionValue | undefined)?.decision;
    if (decision?.kind !== 'retry') {
      return {};
    }
    return {
      ...(decision.amendedPrompt === undefined ? {} : { prompt: decision.amendedPrompt }),
      ...(decision.startTier === undefined ? {} : { startTier: decision.startTier }),
    };
  };

  /** The full dispatch spec of one plan node (shared by ready and recovery). */
  const buildDispatchSpec = (node: PlanNode, rawSpec: TaskSpec): ExtensionDispatchSpec => {
    const amendments = retryAmendmentsOf(node);
    const spec: TaskSpec =
      amendments.prompt === undefined && amendments.startTier === undefined
        ? rawSpec
        : {
            ...rawSpec,
            ...(amendments.prompt === undefined ? {} : { prompt: amendments.prompt }),
            ...(amendments.startTier === undefined
              ? {}
              : { model_hint: { startTier: amendments.startTier } }),
          };
    const placement = unparkPlacementOf({
      ...(node.checkpointRef === undefined ? {} : { checkpointRef: node.checkpointRef }),
      ...(node.checkpointRef === undefined
        ? {}
        : { transcriptRef: checkpointRefFor(io.runId, node.checkpointRef) }),
      ...(spec.isolation === undefined ? {} : { isolation: spec.isolation }),
      worktreePinned: PinLedger.fold(io.snapshot()).isPinnedNode(node.nodeId),
    });
    const ladder = canonicalLadderOf(io.profiles[spec.agentType]);
    return {
      agentType: spec.agentType,
      prompt: spec.prompt,
      ...(placement.restart || placement.bootCheckpointRef === undefined
        ? {}
        : { bootCheckpointRef: placement.bootCheckpointRef }),
      ...(spec.outputSchemaRef === undefined ? {} : { outputSchemaRef: spec.outputSchemaRef }),
      ...(spec.toolsetRef === undefined ? {} : { toolsetRef: spec.toolsetRef }),
      ...(spec.isolation === undefined ? {} : { isolation: spec.isolation }),
      ...(spec.budgetUsd === undefined ? {} : { budgetUsd: spec.budgetUsd }),
      ...(spec.usageLimits === undefined ? {} : { usageLimits: spec.usageLimits }),
      ...(spec.escalation === undefined ? {} : { escalation: spec.escalation }),
      // The declared task class rides the dispatch and journals inside
      // the admission decision (OQ-12 phase-1 rule: author-declared,
      // absent = unclassified).
      ...(spec.taskClass === undefined ? {} : { taskClass: spec.taskClass }),
      // The rung resolution LAST: the concrete model, the rung caps, and
      // the rung ceiling override the spec-level fields.
      ...(ladder === undefined ? {} : ladderDispatchFields(node, spec, ladder)),
    };
  };

  /**
   * A dispatch refused by budget/admission facts that changed AFTER the
   * op was admitted (another child consumed the shared parent between
   * turns, a rung ceiling re-resolved differently) lands as a terminal
   * plan decision: the node fails loudly instead of sitting ready
   * forever, the other ready nodes still dispatch, and the wake digest
   * carries the failure to the orchestrator (the v1.7.0 follow-up
   * review's P1: no stranded node without a dispatch root or terminal
   * decision). Everything else (engine bugs) still propagates.
   */
  const landDispatchRejection = async (
    node: PlanNode,
    from: 'ready' | 'running',
    thrown: unknown,
  ): Promise<void> => {
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    io.emit({
      type: 'log',
      level: 'warn',
      msg:
        `plan node ${node.nodeId} failed dispatch admission and lands terminally ` +
        `failed: ${message}`,
      data: { nodeId: node.nodeId, logicalTaskId: node.logicalTaskId },
    });
    await appendPlanDecision(
      'dispatch-rejected',
      [
        {
          kind: 'set_node_status',
          nodeId: node.nodeId,
          from,
          to: 'failed',
          cause: 'dispatch-rejected',
          causeRef: Math.max(planCursor, 0),
        },
      ],
      Math.max(planCursor, 0),
    );
  };

  const isDispatchRejection = (thrown: unknown): boolean =>
    thrown instanceof AdmissionRejectedError || thrown instanceof BudgetExhaustedError;

  /** Dispatches every ready node under its plan/NodeId scope. */
  const scheduleReady = async (): Promise<void> => {
    for (const node of Object.values(fold.plan.nodes)) {
      if (node.status === 'running' && !dispatched.has(node.nodeId)) {
        // Mid-flight resume (roll-forward): a running node
        // with no live handle redispatches; forward matching re-attaches
        // the recorded attempt (dangling redispatch) or replays a settled
        // terminal instantly, so completed rungs are never repaid. A
        // laddered node resolves the SAME rung from the folded account,
        // reproducing the recorded content key. The already-journaled
        // ready-to-running decision is NOT re-appended.
        const spec = fold.specs[node.nodeId];
        if (spec !== undefined) {
          try {
            const { handle } = await io.dispatch(
              buildDispatchSpec(node, spec),
              nodeScopeOf(node.nodeId),
              {
                nodeId: node.nodeId,
                logicalTaskId: node.logicalTaskId,
              },
            );
            dispatched.set(node.nodeId, handle);
          } catch (thrown) {
            if (!isDispatchRejection(thrown)) {
              throw thrown;
            }
            await landDispatchRejection(node, 'running', thrown);
          }
        }
        continue;
      }
      if (node.status !== 'ready' || dispatched.has(node.nodeId)) {
        continue;
      }
      const fullLink = linkedFull.get(node.nodeId);
      if (fullLink !== undefined) {
        // reuse_full completion: the by-ref root is
        // written terminal ok with zero usage; the node goes done via
        // an engine decision, never a dispatch.
        const scope = nodeScopeOf(node.nodeId);
        let root = io
          .snapshot()
          .find(
            (candidate) =>
              candidate.kind === 'agent' &&
              candidate.scope === scope &&
              candidate.ref === undefined,
          );
        root ??= await io.append({
          scope,
          key: fullLink.spawnKey,
          kind: 'agent',
          value: { byRef: fullLink.donorRootRef },
        });
        await appendPlanDecision(
          'child-result',
          [
            {
              kind: 'set_node_status',
              nodeId: node.nodeId,
              from: 'ready',
              to: 'done',
              cause: 'child-result',
              causeRef: root.seq,
            },
          ],
          root.seq,
        );
        continue;
      }
      const spec = fold.specs[node.nodeId];
      if (spec === undefined) {
        continue;
      }
      let handle: number;
      try {
        ({ handle } = await io.dispatch(buildDispatchSpec(node, spec), nodeScopeOf(node.nodeId), {
          nodeId: node.nodeId,
          logicalTaskId: node.logicalTaskId,
        }));
      } catch (thrown) {
        if (!isDispatchRejection(thrown)) {
          throw thrown;
        }
        await landDispatchRejection(node, 'ready', thrown);
        continue;
      }
      dispatched.set(node.nodeId, handle);
      // ready -> running lands as an engine decision whose cause is the
      // child's own dispatch record (the closed cause set).
      await appendPlanDecision(
        'child-result',
        [
          {
            kind: 'set_node_status',
            nodeId: node.nodeId,
            from: 'ready',
            to: 'running',
            cause: 'child-result',
            causeRef: handle,
          },
        ],
        handle,
      );
    }
  };

  const runtime: PlanToolRuntime = {
    planView: (): PlanViewRender => {
      // Pinned pure fold: re-fold the plan scope up to the
      // pinned seq of the last delivered WakeDigest; never a live read.
      let pinned = emptyPlanFold(emptyPlan());
      for (const entry of io.snapshot()) {
        if (entry.seq > pinnedPlanSeq || entry.scope !== planScope) {
          continue;
        }
        if (entry.kind !== 'plan.revision' && entry.kind !== 'plan.decision') {
          continue;
        }
        pinned = applyPlanEntry(pinned, entry);
      }
      const lineage = io.admission.lineage();
      const nodes = Object.values(pinned.plan.nodes)
        .sort((a, b) => (a.nodeId < b.nodeId ? -1 : 1))
        .map((node: PlanNode) => ({
          nodeId: node.nodeId,
          logicalTaskId: node.logicalTaskId,
          status: node.status,
          deps: node.deps,
          waivedDeps: node.waivedDeps,
          priority: node.priority,
          ...(lineage === undefined
            ? {}
            : { lineage: lineage.statsOf(node.logicalTaskId, pinnedPlanSeq) }),
        }));
      return {
        planHash: planHash(pinned.plan),
        revisionCount: pinned.plan.revisionCount,
        droppedRevisionStreak: pinned.plan.droppedRevisionStreak,
        nodes,
        termination: requireAccount().snapshot(),
        // The abandoned-spend ledger activates with DEF-5 (M7-T07).
        abandonedSpend: pinnedAbandonedSpend(),
        guards: {
          ...(guards.state.engaged === undefined ? {} : { engaged: guards.state.engaged }),
          frozenSignatures: [...guards.state.frozenSignatures].sort(),
          stallReplansUsed: guards.state.stallReplansUsed,
        },
      };
    },
    ledgerRead: (): LedgerView =>
      // Pinned to the turn snapshot, exactly like plan_view:
      // a re-executed wake turn re-folds up to the SAME pinned seq
      // and renders byte-identical ledger bytes. A live read here would
      // diverge on resume (the re-executed turn would see later ops).
      // The committed render budget bounds the serialized view
      // deterministically.
      boundLedgerRender(
        foldLedger(io.snapshot(), {
          ledgerScope: rootScope,
          planScope,
          uptoSeq: pinnedPlanSeq,
        }),
      ),
    ledgerAppend: async (op: LedgerOp): Promise<{ entryRef: number }> => {
      await io.flush();
      const key = ledgerOpKey(op);
      // Idempotent re-execution (roll-forward): a journaled
      // op with this content key acks with the recorded ref and skips
      // validation, so re-executed turns never spuriously reject against
      // a fold that already contains the op itself.
      const existing = io.snapshot().find(
        (entry) =>
          entry.kind === 'ledger.op' &&
          entry.scope === rootScope &&
          entry.key === key &&
          // lesson_add keys ONCE (DEF-3
          // reworded-lessons-collide): a repeated add with the same key
          // acks the recorded lesson instead of appending a duplicate.
          (op.op === 'lesson_add' || !consumedLedgerSeqs.has(entry.seq)),
      );
      if (existing !== undefined) {
        consumedLedgerSeqs.add(existing.seq);
        return { entryRef: existing.seq };
      }
      const view = foldLedger(io.snapshot(), { ledgerScope: rootScope, planScope });
      const violation = ledgerCapViolation(view, op);
      if (violation !== undefined) {
        throw new ConfigError(`ledger_append rejected: ${violation}`);
      }
      if (op.op === 'lesson_add') {
        // The lesson key MUST match a journaled attempt of that LTID
        // (DEF-3).
        const stats = io.admission.lineage()?.statsOf(op.key.logicalTaskId);
        const known =
          stats !== undefined &&
          stats.attemptsUsed > 0 &&
          stats.approaches.some((approach) => approach.approachSig === op.key.approachSig);
        if (!known) {
          throw new ConfigError(
            'lesson_add rejected: the key matches no journaled attempt of that logical task ' + '',
          );
        }
      }
      const entry = await io.append({
        scope: rootScope,
        key,
        kind: 'ledger.op',
        value: { op },
      });
      consumedLedgerSeqs.add(entry.seq);
      io.emit({ type: 'ledger:op', entryRef: entry.seq, op: op.op });
      return { entryRef: entry.seq };
    },
    planRevise: async (request: PlanReviseRequest): Promise<PlanReviseResult> =>
      writeLock.runExclusive(async () => {
        // The RESULT enrichment (never the journaled value): a dropped
        // admission_denied op carries its typed reject reason so the
        // model sees the account, reserves, and minimum correction in
        // the tool result itself.
        const withVerdictDetail = (
          outcomes: PlanRevisionValue['outcomes'],
          admissions: PlanRevisionValue['admissions'],
        ): PlanReviseResult['outcomes'] =>
          outcomes.map((outcome, opIndex) => {
            if (outcome.kind !== 'dropped' || outcome.reason !== 'admission_denied') {
              return outcome;
            }
            const verdict = admissions.find((admission) => admission.opIndex === opIndex)?.decision
              .verdict;
            return verdict !== undefined && verdict.kind === 'reject'
              ? { ...outcome, verdictReason: verdict.reason }
              : outcome;
          });
        await io.flush();
        absorbPlan();
        absorbGuardVerdicts();
        if (guards.revisionsRejected) {
          // The engaged terminating fallback: further
          // revisions are rejected; finish with the partial result.
          throw new ConfigError(
            `revision guards engaged (${guards.state.engaged ?? 'unknown'}): the plan is ` +
              'closed for adaptation; call finish with the partial result',
          );
        }
        // approachVocabulary rejection: a typed tool error with bounded
        // re-prompt, never run death.
        if (vocabulary !== undefined) {
          for (const op of request.ops) {
            if (op.op === 'add_task') {
              const tag = op.approach ?? op.spec.approach;
              if (tag !== undefined && !vocabulary.has(normalizeApproachTag(tag))) {
                throw new ConfigError(
                  `approach tag '${tag}' is outside the declared approachVocabulary`,
                );
              }
            }
          }
        }
        const key = planRevisionKey(request.base, request.ops);
        // Idempotent re-execution (roll-forward): a
        // journaled revision with this identity renders byte-identically
        // and only re-issues its effects.
        const existing = io
          .snapshot()
          .find(
            (entry) =>
              entry.kind === 'plan.revision' &&
              entry.scope === planScope &&
              entry.key === key &&
              !consumedRevisionSeqs.has(entry.seq),
          );
        if (existing !== undefined) {
          consumedRevisionSeqs.add(existing.seq);
          const value = existing.value as unknown as PlanRevisionValue;
          await drainGuardVerdicts();
          // Roll-forward: link, root, and abandon effects re-issue
          // idempotently from the recorded entry.
          await landReuseLinks(existing);
          await landCancelAbandons(value, existing.seq);
          await landRevisionEscalations(value);
          // Request-only cancels and parks re-land on the recovery path
          // too (DEF-8 crash-after-append-before-effects: the resume
          // must abort the redispatched mid-flight branch, or the
          // roll-forward leaves it running forever).
          for (const outcome of value.outcomes) {
            if (outcome.kind === 'dropped') {
              continue;
            }
            const applied = outcome.kind === 'applied' ? outcome.op : outcome.applied;
            if (
              (applied.op === 'cancel_task' || applied.op === 'park_task') &&
              applied.requestOnly === true
            ) {
              const handle = dispatched.get(applied.nodeId);
              if (handle !== undefined) {
                void io.cancel(handle, applied.op === 'cancel_task' ? applied.reason : 'park_task');
              }
            }
          }
          await scheduleReady();
          return {
            outcomes: withVerdictDetail(value.outcomes, value.admissions),
            assignedNodeIds: value.assignedNodeIds,
            planHashAfter: value.planHashAfter,
            droppedAll: value.outcomes.every((outcome) => outcome.kind === 'dropped'),
            revisionUnitsRemaining: value.revisionUnitsAfter ?? 0,
          };
        }
        // The revision debit binds to the fact of journaling:
        // underflow writes termination.denied strictly before the
        // typed error surfaces and appends NO plan.revision.
        const debit = await requireAccount().debit('revisionUnits');
        if (!debit.ok) {
          throw new ConfigError(
            'revision_budget_exhausted: maxRevisionsPerRun is absolute and non-replenishable ' +
              `(termination.denied at seq ${String(debit.deniedEntryRef)})`,
          );
        }
        // DEF-5: the DedupIndex folds at the fold head under the
        // PlanWriteLock; verdicts compute once and embed.
        const dedupIndex = DedupIndex.fold(io.snapshot(), {
          priceUsd: (servedBy, usage) => io.priceUsd(servedBy, usage),
        });
        const oscRejects = new Map<number, { spawnKey: string; oscillationCount: number }>();
        const freshNotes = new Map<
          number,
          { spawnKey: string; donorNodeId: string; reason: string }
        >();
        const frozen = io
          .snapshot()
          .some(
            (candidate) =>
              candidate.kind === 'decision' &&
              (candidate.value as { decisionType?: string } | undefined)?.decisionType ===
                'orchestrator_budget_cap',
          );
        // Exclusive captures are first-wins WITHIN one revision too
        // (claim-exclusivity): the second identical add of
        // the same revision degrades to a fresh admit, donor_active.
        const claimedThisRevision = new Set<string>();
        // Reserves admitted read-only earlier in THIS revision: each
        // subsequent admit projects them against the parent so every
        // embedded admit of the batch is dispatchable under the same
        // snapshot (the v1.7.0 follow-up review's P1).
        let pendingReserveUsd = 0;
        const evaluation: RebaseEvaluation = rebasePlanRevision(request, {
          state: fold,
          // The cap decision freezes the plan for ADAPTATION, not for
          // work: every op drops plan_frozen (DEF-7).
          frozen,
          digestPlanHashFor: (digestSeq) => digests.get(digestSeq)?.planHash,
          mintNodeId: () => io.mintId(),
          dedup: (op, opIndex) => {
            if (reuseConfig?.enabled === false) {
              return undefined;
            }
            for (const spawnKey of donorKeysOf(op.spec)) {
              const outcome = evaluateReuse(dedupIndex, spawnKey, reuseConfig);
              if (outcome.kind === 'none') {
                continue;
              }
              if (outcome.kind === 'reject_osc_guard') {
                oscRejects.set(opIndex, { spawnKey, oscillationCount: outcome.oscillationCount });
                return undefined;
              }
              if (outcome.kind === 'fresh') {
                freshNotes.set(opIndex, outcome.note);
                return undefined;
              }
              if (
                outcome.kind === 'admit_graft' &&
                claimedThisRevision.has(outcome.donor.rootScope)
              ) {
                freshNotes.set(opIndex, {
                  spawnKey,
                  donorNodeId: outcome.donor.nodeId ?? '',
                  reason: 'donor_active',
                });
                return undefined;
              }
              if (outcome.kind === 'admit_graft') {
                claimedThisRevision.add(outcome.donor.rootScope);
              }
              return buildReuseTransform(op, outcome.kind, outcome.donor);
            }
            return undefined;
          },
          admitAdd: (op, nodeId, opIndex) => {
            // The per-SpawnKey osc_guard (DEF-5): the third re-add of one
            // key rejects with the embedded verdict.
            const oscReject = oscRejects.get(opIndex);
            if (oscReject !== undefined) {
              return {
                verdict: {
                  kind: 'reject',
                  reason: {
                    code: 'osc_guard',
                    spawnKey: oscReject.spawnKey,
                    oscillationCount: oscReject.oscillationCount,
                  },
                },
                statsBefore: { spawnsBefore: 0, childrenOfParentBefore: 0, depth: 1 },
              };
            }
            // The oscillation detector keys on approachSigCoarse ACROSS
            // LTID boundaries: a frozen signature rejects
            // further re-adds with the embedded osc_guard verdict.
            const coarse = coarseOf(op.spec);
            if (guards.isFrozenSignature(coarse)) {
              return {
                verdict: {
                  kind: 'reject',
                  reason: {
                    code: 'osc_guard',
                    spawnKey: coarse,
                    oscillationCount: guards.oscillationCountOf(coarse),
                  },
                },
                statsBefore: { spawnsBefore: 0, childrenOfParentBefore: 0, depth: 1 },
              };
            }
            const profile = io.profiles[op.spec.agentType] as AgentProfile | undefined;
            // A journaled admit must guarantee its dispatch cannot be
            // rejected by the same budget facts. The DISPATCH-time
            // ceiling is rung-resolved (rung.maxCostUsd overrides
            // budgetUsd), so the check resolves the same facts here,
            // BEFORE the op changes plan state or consumes a spawn unit.
            const childAccount =
              rootScope === '' ? planNodeScope(nodeId) : `${rootScope}/${planNodeScope(nodeId)}`;
            const ladder = canonicalLadderOf(profile);
            const dispatchCeilingUsd = ((): number | undefined => {
              if (ladder !== undefined) {
                const startTier = clampStartTier(ladder, op.spec.model_hint?.startTier);
                const raises =
                  op.lineage === undefined ? 0 : requireAccount().rungIndexOf(op.lineage.continues);
                const rung = ladder.rungs[executingRungOf(ladder, startTier, raises)];
                if (rung?.maxCostUsd !== undefined) {
                  return rung.maxCostUsd;
                }
              }
              return op.spec.budgetUsd;
            })();
            if (
              profile?.estCost !== undefined &&
              dispatchCeilingUsd !== undefined &&
              profile.estCost > dispatchCeilingUsd
            ) {
              // The host's own estimate says the budget cannot buy the
              // work: bounce the op with the minimum actionable
              // correction instead of stranding it at dispatch.
              // Heuristic reserves never reject here; they clamp to the
              // allowance (layer 1 mirrors the same clamp).
              return {
                verdict: {
                  kind: 'reject',
                  reason: {
                    code: 'reserve_exceeds_budget',
                    agentType: op.spec.agentType,
                    childAccount,
                    estCostUsd: profile.estCost,
                    resolvedReserveUsd: Math.min(profile.estCost, dispatchCeilingUsd),
                    childCeilingUsd: dispatchCeilingUsd,
                    minimumBudgetUsd: profile.estCost,
                    message:
                      `agent profile '${op.spec.agentType}' declares estCost ` +
                      `${profile.estCost.toFixed(4)} USD, which cannot fit the child ceiling ` +
                      `${dispatchCeilingUsd.toFixed(4)} USD of account '${childAccount}'; ` +
                      `raise budgetUsd to at least ${profile.estCost.toFixed(4)} or pick a ` +
                      'cheaper profile',
                  },
                },
                statsBefore: { spawnsBefore: 0, childrenOfParentBefore: 0, depth: 1 },
              };
            }
            const admitted = io.admission.admit(
              {
                origin: 'spawn_agent',
                name: op.spec.agentType,
                childScope: childAccount,
                parentAccountScope: ROOT_ACCOUNT,
                nodeKey: planScope,
                ...(op.spec.budgetUsd === undefined ? {} : { budgetUsd: op.spec.budgetUsd }),
                ...(profile?.estCost === undefined ? {} : { estCostUsd: profile.estCost }),
                // Same-batch projection: earlier admits of THIS revision
                // hold their reserves against the parent read-only, so
                // the second op of one revision cannot be admitted into
                // money the first already spoke for.
                ...(pendingReserveUsd === 0 ? {} : { pendingReserveUsd }),
                ...(op.lineage === undefined ? {} : { lineage: op.lineage }),
                ...((op.approach ?? op.spec.approach) === undefined
                  ? {}
                  : { approach: op.approach ?? op.spec.approach }),
                signature: {
                  agentType: op.spec.agentType,
                  isolation: canonicalIsolationTag(
                    op.spec.isolation ??
                      (io.profiles[op.spec.agentType] as AgentProfile | undefined)?.isolation,
                  ),
                },
                ladderLength: ladderLengthOf(io.profiles[op.spec.agentType]),
              },
              { commitReserve: false },
            );
            if (admitted.verdict.kind === 'admit') {
              // Accumulate what DISPATCH will commit (the projection),
              // not the fraction-clamped verdict reserve.
              pendingReserveUsd += io.admission.projectedDispatchReserveUsd({
                ...(profile?.estCost === undefined ? {} : { estCostUsd: profile.estCost }),
                ...(op.spec.budgetUsd === undefined ? {} : { budgetUsd: op.spec.budgetUsd }),
              });
            }
            // A SpawnKey match served fresh embeds its DedupNote for
            // telemetry.
            const note = freshNotes.get(opIndex);
            if (note !== undefined && admitted.verdict.kind === 'admit') {
              return {
                ...admitted,
                verdict: {
                  ...admitted.verdict,
                  dedup: note as unknown as NonNullable<
                    Extract<AdmissionDecision['verdict'], { kind: 'admit' }>['dedup']
                  >,
                },
              };
            }
            return admitted;
          },
          admitUnpark: (op, node) => {
            const spec = fold.specs[op.nodeId];
            // An unpark of a DISPATCHED branch is a lineage rebirth;
            // a never-started parked node just
            // resumes scheduling under its existing attempt.
            const wasDispatched = nodeRootOf(op.nodeId) !== undefined;
            const unparkAdmitted = io.admission.admit(
              {
                origin: 'spawn_agent',
                name: spec?.agentType ?? 'unknown',
                childScope: nodeScopeOf(op.nodeId),
                parentAccountScope: ROOT_ACCOUNT,
                nodeKey: planScope,
                ...(pendingReserveUsd === 0 ? {} : { pendingReserveUsd }),
                ...(wasDispatched
                  ? {
                      lineage: {
                        continues: node.logicalTaskId,
                        causeRef: node.checkpointRef ?? Math.max(planCursor, 1),
                        relation: 'unpark-restart' as const,
                      },
                    }
                  : {}),
                signature: {
                  agentType: spec?.agentType ?? 'unknown',
                  isolation: canonicalIsolationTag(
                    spec?.isolation ??
                      (io.profiles[spec?.agentType ?? ''] as AgentProfile | undefined)?.isolation,
                  ),
                },
                ladderLength: ladderLengthOf(io.profiles[spec?.agentType ?? '']),
              },
              { commitReserve: false },
            );
            if (unparkAdmitted.verdict.kind === 'admit') {
              pendingReserveUsd += io.admission.projectedDispatchReserveUsd({});
            }
            return unparkAdmitted;
          },
          lineageCheck: (continues: LogicalTaskId) => {
            const index = io.admission.lineage();
            if (index === undefined) {
              return 'ok';
            }
            if (index.hasLiveAttempt(continues)) {
              return 'lineage_busy';
            }
            if (
              index.attemptsUsed(continues) >=
              io.admission.escalationLimits.maxAttemptsPerLogicalTask
            ) {
              return 'lineage_exhausted';
            }
            return 'ok';
          },
        });
        const value: PlanRevisionValue = {
          base: request.base,
          requestedOps: request.ops,
          outcomes: evaluation.outcomes,
          assignedNodeIds: evaluation.assignedNodeIds,
          admissions: evaluation.admissions,
          planHashBefore: evaluation.planHashBefore,
          planHashAfter: evaluation.planHashAfter,
          hashVersion: 2,
          rationale: request.rationale,
          revisionUnitsAfter: debit.balanceAfter,
          debits: [{ resource: 'revisionUnits', balanceAfter: debit.balanceAfter }],
        };
        // ONE durable append strictly BEFORE any effect.
        const entry = await io.append({
          scope: planScope,
          key,
          kind: 'plan.revision',
          value: value as unknown as Json,
        });
        consumedRevisionSeqs.add(entry.seq);
        await io.flush();
        absorbPlan();
        // Telemetry rides the durable append, strictly BEFORE the
        // effects: a scheduling fault must not erase an applied revision
        // from the event stream (the v1.7.0 follow-up review's P1).
        const appliedCount = evaluation.outcomes.filter((o) => o.kind !== 'dropped').length;
        io.emit({
          type: 'plan:revised',
          entryRef: entry.seq,
          planHash: evaluation.planHashAfter,
          applied: appliedCount,
          dropped: evaluation.outcomes.length - appliedCount,
          revisionUnitsRemaining: debit.balanceAfter,
        });
        io.emit({
          type: 'termination:debit',
          entryRef: entry.seq,
          counter: 'revisionUnits',
          remaining: debit.balanceAfter,
          phi: requireAccount().phi(),
        });
        // Guard verdicts fired by this revision land strictly BEFORE the
        // scheduling effects.
        await drainGuardVerdicts();
        // DEF-5 effects in the mandatory write order:
        // node.link entries, by-ref roots, and severing abandons land
        // strictly after the deciding append and before scheduling.
        await landReuseLinks(entry);
        await landCancelAbandons(value, entry.seq);
        // Escalation resolutions: the
        // authoritative decision, the resolve op, and the sever land as
        // effects strictly after the revision append.
        await landRevisionEscalations(value);
        // Effects: schedule newly-ready nodes; land cancel requests on
        // running children (the final transition arrives cancel-landed).
        for (const outcome of evaluation.outcomes) {
          if (outcome.kind === 'dropped') {
            continue;
          }
          const applied = outcome.kind === 'applied' ? outcome.op : outcome.applied;
          if (
            (applied.op === 'cancel_task' || applied.op === 'park_task') &&
            applied.requestOnly === true
          ) {
            const handle = dispatched.get(applied.nodeId);
            if (handle !== undefined) {
              void io.cancel(handle, applied.op === 'cancel_task' ? applied.reason : 'park_task');
            }
          }
        }
        await scheduleReady();
        return {
          outcomes: withVerdictDetail(evaluation.outcomes, evaluation.admissions),
          assignedNodeIds: evaluation.assignedNodeIds,
          planHashAfter: evaluation.planHashAfter,
          droppedAll: evaluation.droppedAll,
          revisionUnitsRemaining: debit.balanceAfter,
        };
      }),
  };

  if (options?.kbPropose === true) {
    // ModelKnowledge phase 3: the handler resolves the tier-relative
    // payload into a concrete KbProposal subject and journals it through
    // the SAME ledgerAppend path (idempotency, section caps, the
    // single-writer orchestrator scope). The ack is { entryRef } only:
    // echoing the proposal back would render quarantined content into
    // the prompt.
    runtime.kbPropose = async (input: KbProposeInput): Promise<{ entryRef: number }> => {
      await io.flush();
      absorbPlan();
      const ltid = input.logicalTaskId;
      if (ltid === undefined) {
        throw new ConfigError(
          'kb_propose requires logicalTaskId: the tier-relative subject resolves against ' +
            "that lineage's declared ladder",
        );
      }
      const node = Object.values(fold.plan.nodes).find(
        (candidate) => candidate.logicalTaskId === ltid,
      );
      const spec = node === undefined ? undefined : fold.specs[node.nodeId];
      if (node === undefined || spec === undefined) {
        throw new ConfigError(`kb_propose: no plan node carries logicalTaskId '${ltid}'`);
      }
      const ladder = canonicalLadderOf(io.profiles[spec.agentType]);
      if (ladder === undefined) {
        throw new ConfigError(
          `kb_propose: agentType '${spec.agentType}' declares no ladder; the tier-relative ` +
            'subject resolves only against a declared ladder',
        );
      }
      const stats = io.admission.lineage()?.statsOf(ltid);
      if (stats === undefined || stats.attemptsUsed === 0) {
        throw new ConfigError(`kb_propose: lineage '${ltid}' has no journaled attempt to observe`);
      }
      // A tier is proposable only when a journaled attempt ran on it:
      // the start tier plus every raising verdict's authorized rung.
      const attempted = new Set<number>([clampStartTier(ladder, spec.model_hint?.startTier)]);
      const snapshot = io.snapshot();
      for (const entry of snapshot) {
        if (entry.kind !== 'decision' || entry.scope !== planScope) {
          continue;
        }
        const value = entry.value as
          | { decisionType?: string; logicalTaskId?: string; nextAttempt?: { rungIndex?: number } }
          | undefined;
        if (
          value?.decisionType === 'ladder-verdict' &&
          value.logicalTaskId === ltid &&
          typeof value.nextAttempt?.rungIndex === 'number'
        ) {
          attempted.add(value.nextAttempt.rungIndex);
        }
      }
      const tier = input.subject.tier;
      const rung = ladder.rungs[tier];
      if (!attempted.has(tier) || rung === undefined) {
        throw new ConfigError(
          `kb_propose: tier ${String(tier)} has no journaled attempt for '${ltid}' ` +
            `(attempted: ${[...attempted].sort((a, b) => a - b).join(', ')})`,
        );
      }
      const refs = input.evidenceRefs ?? [];
      for (const ref of refs) {
        const evidence = snapshot.find((entry) => entry.seq === ref);
        if (evidence === undefined || evidence.kind !== 'decision') {
          throw new ConfigError(
            `kb_propose: evidence ref ${String(ref)} does not resolve to a decision entry ` +
              'of this run',
          );
        }
      }
      return runtime.ledgerAppend({
        op: 'observation_add',
        taskClass: input.taskClass,
        logicalTaskId: ltid,
        tierObserved: tier,
        outcomeClass: input.trigger,
        note: input.note ?? '',
        evidenceRefs: refs,
        subject: { model: rung.model, effort: rung.effort },
        polarity: input.polarity,
        trigger: input.trigger,
      });
    };
  }

  return {
    name: 'plan-runner',
    promptLines: () => [
      '',
      'You are running the PlanRunner extension: maintain the task plan with',
      'plan_revise (add_task, amend_task, park_task, unpark_task, cancel_task,',
      'reprioritize, rewire_deps, waive_dep), inspect it with plan_view, and sleep',
      'with wait_for_events; the ENGINE schedules ready plan nodes for you.',
      ...(options?.kbPropose === true
        ? [
            'kb_propose records ONE quarantined model observation about a ladder tier of a',
            'journaled lineage; it renders into no prompt and commits nothing during the run.',
          ]
        : []),
    ],
    boot: async (bound: OrchestratorExtensionIO): Promise<void> => {
      io = bound;
      rootScope = io.baseScope;
      planScope = rootScope === '' ? 'plan' : `${rootScope}/plan`;
      await io.flush();
      const folded = foldTermination(io.snapshot());
      if (folded !== undefined) {
        // Resume: the journal always wins over live config;
        // the fold rebuilt every balance. A diverging live knob
        // is REPORTED, never honored (DEF-2 config-drift-resume).
        account = folded.account;
        account.bindDeniedWriter(deniedWriter);
        const live: Record<string, number> = {
          maxRevisionsPerRun: options?.maxRevisionsPerRun ?? 32,
          maxTotalSpawns: options?.limits?.maxTotalSpawns ?? 128,
          maxEscalationsPerLogicalTask: options?.limits?.maxEscalationsPerLogicalTask ?? 2,
          maxDepth: options?.limits?.maxDepth ?? 1,
        };
        const frozen = folded.init.limits as unknown as Record<string, unknown>;
        for (const [field, liveValue] of Object.entries(live)) {
          const frozenValue = frozen[field];
          if (typeof frozenValue === 'number' && frozenValue !== liveValue) {
            io.emit({
              type: 'termination:config-drift',
              field,
              frozenValue,
              liveValue,
            });
          }
        }
      } else {
        const limits = validateTerminationLimits({
          maxRevisionsPerRun: options?.maxRevisionsPerRun ?? 32,
          maxTotalSpawns: options?.limits?.maxTotalSpawns ?? 128,
          maxEscalationsPerLogicalTask: options?.limits?.maxEscalationsPerLogicalTask ?? 2,
          maxDepth: options?.limits?.maxDepth ?? 1,
          kMax: kMaxOf(io.profiles),
          runBudgetUsdCeiling: io.runCeilingUsd ?? 0,
          // The engine resolves both strictly before boot (DEF-7;
          // XF-09), so the actual dollars freeze in the SAME vector as
          // the counters. Journals recorded before v1.8 stored zeros
          // here ("not yet resolved"); their authoritative dollars live
          // in the orchestrator_budget_reserve decision, which the
          // engine recovers on resume, so they replay unchanged.
          orchestratorCapUsd: io.orchestratorCapUsd ?? 0,
          finalizeReserveUsd: io.finalizeReserveUsd ?? 0,
        });
        const value = buildTerminationInitValue(limits, profileRegistrySnapshotHash(io.profiles));
        await io.append({
          scope: rootScope,
          key: deriverV2.deriveKey({ kind: TERMINATION_INIT_KEY_KIND, limits: value.limits }),
          kind: 'termination.init',
          value: value as unknown as Json,
        });
        account = new TerminationAccount({ limits, deniedWriter });
      }
      io.admission.bindTermination(account);
      // Journaled guard verdicts absorb FIRST so replay counter feeding
      // never re-fires an already-journaled freeze (M7-T06).
      absorbGuardVerdicts();
      absorbPlan();
      // The alias map and full-link table rebuild by fold.
      absorbLinks();
      // Roll-forward: verdicts the fold fired whose appends were lost to
      // a crash land now, strictly before any effect.
      await drainGuardVerdicts();
      // Recovered decision-kind carriers (ladder verdicts, escalation
      // decisions) re-announce their embedded admissions with the
      // replayed marker; plan.revision rows already re-announced inside
      // the boot absorbPlan above (v1.22.0 review P2-5).
      for (const entry of io.snapshot()) {
        if (entry.kind !== 'decision' || entry.scope !== planScope) {
          continue;
        }
        const value = entry.value as { admissions?: unknown[] } | undefined;
        if (Array.isArray(value?.admissions)) {
          emitSpawnDecisionRows(
            entry.seq,
            value.admissions,
            (row) => specAgentTypeOf(row.nodeId),
            true,
          );
        }
      }
      absorbedAsReplay = false;
      // The bootstrap snapshot: digestSeq 0 is the empty plan, so the
      // FIRST plan_revise has a recorded base before any wake exists.
      // Its hash is a constant of the empty fold, stable across resumes;
      // the pin stays at the empty snapshot until a real wake delivers
      // (a turn re-executed after a crash reads its original bytes).
      digests.set(0, { planHash: planHash(emptyPlan()), planSeq: -1 });
      pinnedPlanSeq = -1;
    },
    tools: () => buildPlanTools(runtime),
    onActivity: async (): Promise<void> => {
      await writeLock.runExclusive(async () => {
        await io.flush();
        absorbGuardVerdicts();
        absorbPlan();
        await drainGuardVerdicts();
        await landSettlements();
        await scheduleReady();
        // Stall detection: the streak already excludes
        // transient and environment classes; emission is hard-bounded
        // per run by the stall replan cap.
        const index = io.admission.lineage();
        if (index !== undefined && !guards.stallReplanExhausted) {
          for (const node of Object.values(fold.plan.nodes)) {
            const streak = index.stallStreak(node.logicalTaskId);
            const marker = `${node.logicalTaskId}:${String(streak)}`;
            if (streak >= 3 && !stallEmitted.has(marker)) {
              stallEmitted.add(marker);
              io.emit({
                type: 'stall:detected',
                logicalTaskId: node.logicalTaskId,
                stallStreak: streak,
              });
              const capVerdict = guards.onStallReplan();
              if (capVerdict !== undefined) {
                pendingGuardVerdicts.push(capVerdict);
                await drainGuardVerdicts();
              }
            }
          }
        }
      });
    },
    quiescent: (): boolean => {
      absorbPlan();
      return !Object.values(fold.plan.nodes).some(
        (node) => node.status === 'ready' || node.status === 'running',
      );
    },
    digestExtras: (): Record<string, Json> => {
      absorbPlan();
      const spend = DedupIndex.fold(io.snapshot(), {
        priceUsd: (servedBy, usage) => io.priceUsd(servedBy, usage),
      }).abandonedSpend();
      return {
        planHash: planHash(fold.plan),
        planSeq: planCursor,
        reuse: spend as unknown as Json,
        // The mandatory DEF-2 block of the final coordinated schema
        // (M7-T13): the account snapshot is a pure
        // fold and costs nothing.
        termination: requireAccount().snapshot() as unknown as Json,
      };
    },
    onWake: (digest: WakeDigest): void => {
      const extras = digest as unknown as { planHash?: string; planSeq?: number };
      if (typeof extras.planHash === 'string') {
        digests.set(digest.digestSeq, {
          planHash: extras.planHash,
          planSeq: extras.planSeq ?? -1,
        });
      }
      if (typeof extras.planSeq === 'number') {
        pinnedPlanSeq = Math.max(pinnedPlanSeq, extras.planSeq);
      }
    },
  };
}

/**
 * The PlanRunner entry surface: mode (c) plus the extension in one call.
 * `runOptions` are the ordinary engine RunOptions of the created run:
 * `runOptions.budgetUsd` is the ROOT hard ceiling over the whole tree,
 * immutable after start, while `opts.budget` only shapes the
 * orchestrator's own sub-account inside it (v1.18.0 review P1-5).
 */
export function orchestratePlanned(
  engine: Engine,
  goal: string,
  opts?: OrchestrateOptions & { plan?: PlanRunnerOptions },
  runOptions?: RunOptions,
): RunHandle<unknown> {
  const { plan, ...orchestrateOpts } = opts ?? {};
  return orchestrate(
    engine,
    goal,
    {
      ...orchestrateOpts,
      extension: planRunner(plan),
    },
    runOptions,
  );
}
