/**
 * PlanRunner (M7-T05): the opt-in extension of mode (c).
 *
 * Owning spec: docs/07-adaptive-orchestration-spec.md, sections 1, 3, and
 * 4. The ENGINE, not the model, schedules ready nodes through the
 * existing semaphore and budget admission; children run under
 * `plan/NodeId` scopes; every plan mutation is an entry in the single
 * sequential scope "plan"; the orchestrator sleeps between wakes and
 * revises the plan through typed diffs with auto-rebase. PlanRunner runs
 * write `termination.init` and carry the full adaptive machinery
 * (docs/07, section 1); the guards, reuse, park, ledger, ladder,
 * escalation, and budget-cap layers complete in M7-T06..T13.
 *
 * PlanRunner is built EXCLUSIVELY from the public core API through the
 * orchestrator extension seam (docs/02, section 4: the seam-sufficiency
 * rule).
 */
import {
  approachSigCoarse,
  buildTerminationInitValue,
  ConfigError,
  DedupIndex,
  deriverV2,
  evaluateReuse,
  foldTermination,
  kMaxOf,
  ladderLengthOf,
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
  type DonorCandidate,
  type DonorRef,
  type EntryRef,
  type Engine,
  type ExtensionDispatchSpec,
  type JournalEntry,
  type Json,
  type LogicalTaskId,
  type NodeId,
  type NodeLinkValue,
  type OrchestrateOptions,
  type OrchestratorExtension,
  type OrchestratorExtensionIO,
  type ReuseConfig,
  type RunHandle,
  type TerminationDeniedValue,
  type TerminationLimits,
  type WakeDigest,
} from '@lurker/core';
import { canonicalIsolationTag } from '@lurker/core';
import { checkpointRefFor } from '@lurker/core';
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
import { rebasePlanRevision, type RebaseEvaluation } from './rebase.js';
import { PlanWriteLock } from './write-lock.js';
import { buildPlanTools, type PlanToolRuntime, type PlanViewRender } from './tools.js';
import { RevisionGuards, type GuardVerdictValue, type RevisionGuardsOptions } from './guards.js';
import { promptSpecHashOf, type TaskSpec } from './task-spec.js';

/** docs/07, 3.8. */
export interface PlanRunnerOptions {
  /** Absolute, non-replenishable; default 32 (DEF-2). */
  maxRevisionsPerRun?: number;
  guards?: RevisionGuardsOptions;
  /** Out-of-vocabulary tags get a typed tool error with bounded re-prompt (DEF-3). */
  approachVocabulary?: string[];
  /** Reuse-by-reference configuration (DEF-5; docs/03, 9.9). */
  reuse?: ReuseConfig;
  /** Frozen termination knobs beyond the revision budget (DEF-2). */
  limits?: Partial<
    Pick<TerminationLimits, 'maxTotalSpawns' | 'maxEscalationsPerLogicalTask' | 'maxDepth'>
  >;
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
 * Builds the PlanRunner orchestrator extension (docs/07, section 3).
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
   * Appends fold-fired verdicts strictly BEFORE their effects (docs/07,
   * 3.8); a verdict already journaled (replay absorb) never duplicates.
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
   * root entry keys (docs/03, 9.2: strict byte equality, never fuzzy).
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
   * (docs/03, 9.10: deciding entry, then node.link, then the child root,
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
      // the new scope, oldest first (docs/03, 9.5-9.6).
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
   * Builds the reuse transform for one add_task at the fold head
   * (docs/03, 9.4): the verdict, the donor descriptor, and the placement
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
      // spawnUnit, zero live budget reserve (docs/07, 11.3b and 7.3).
      const debited = requireAccount().debitSpawn({ logicalTaskId, isNew: false });
      if (!debited.ok) {
        throw new ConfigError(
          'termination_exhausted: maxTotalSpawns reached at a reuse link (docs/07, 11.3)',
        );
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
      // realizable saving, not a prepayment (docs/03, 9.4).
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

  /** Compiles applied cancels into severing abandons (docs/03, 9.1). */
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

  /** Severs a cancelled node's dispatched branch (docs/03, 9.1). */
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
    // Engine authorship happens at the fold head under PlanWriteLock
    // (docs/07, 3.3): preview computes planHashAfter before the append.
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
        // The park lands at the turn boundary (docs/07, 3.6): the node
        // parks with its checkpoint anchor; the branch is severed with
        // the checkpoint retained and the worktree pinned under the
        // shared cap when capacity remains (docs/03, 11.2).
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
      const decisionSeq = await appendPlanDecision(
        cause === 'cancel-landed' ? 'cancel-landed' : 'child-result',
        [{ kind: 'set_node_status', nodeId, from: 'running', to, cause, causeRef }],
        causeRef,
      );
      if (cause === 'cancel-landed') {
        // cancel_task compiles into abandon (docs/03, 9.3): the severing
        // entry makes the interrupted branch a donor candidate.
        await abandonNode(nodeId, decisionSeq, 'cancel_task');
        io.emit({ type: 'node:cancelled', nodeId, logicalTaskId: node.logicalTaskId });
      }
    }
  };

  /** Dispatches every ready node under its plan/NodeId scope. */
  const scheduleReady = async (): Promise<void> => {
    for (const node of Object.values(fold.plan.nodes)) {
      if (node.status !== 'ready' || dispatched.has(node.nodeId)) {
        continue;
      }
      const fullLink = linkedFull.get(node.nodeId);
      if (fullLink !== undefined) {
        // reuse_full completion (docs/03, 9.10): the by-ref root is
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
      const childScope =
        rootScope === ''
          ? planNodeScope(node.nodeId)
          : `${rootScope}/${planNodeScope(node.nodeId)}`;
      const placement = unparkPlacementOf({
        ...(node.checkpointRef === undefined ? {} : { checkpointRef: node.checkpointRef }),
        ...(node.checkpointRef === undefined
          ? {}
          : { transcriptRef: checkpointRefFor(io.runId, node.checkpointRef) }),
        ...(spec.isolation === undefined ? {} : { isolation: spec.isolation }),
        worktreePinned: PinLedger.fold(io.snapshot()).isPinnedNode(node.nodeId),
      });
      const dispatchSpec: ExtensionDispatchSpec = {
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
      };
      const { handle } = await io.dispatch(dispatchSpec, childScope, {
        nodeId: node.nodeId,
        logicalTaskId: node.logicalTaskId,
      });
      dispatched.set(node.nodeId, handle);
      // ready -> running lands as an engine decision whose cause is the
      // child's own dispatch record (docs/07, 3.3; the closed cause set).
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
      // Pinned pure fold (docs/07, 4.6): re-fold the plan scope up to the
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
    planRevise: async (request: PlanReviseRequest): Promise<PlanReviseResult> =>
      writeLock.runExclusive(async () => {
        await io.flush();
        absorbPlan();
        absorbGuardVerdicts();
        if (guards.revisionsRejected) {
          // The engaged terminating fallback (docs/07, 3.8): further
          // revisions are rejected; finish with the partial result.
          throw new ConfigError(
            `revision guards engaged (${guards.state.engaged ?? 'unknown'}): the plan is ` +
              'closed for adaptation; call finish with the partial result',
          );
        }
        // approachVocabulary rejection: a typed tool error with bounded
        // re-prompt, never run death (docs/07, 8.2).
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
        // Idempotent re-execution (docs/07, 3.9 roll-forward): a
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
          // idempotently from the recorded entry (docs/03, 9.10).
          await landReuseLinks(existing);
          await landCancelAbandons(value, existing.seq);
          await scheduleReady();
          return {
            outcomes: value.outcomes,
            assignedNodeIds: value.assignedNodeIds,
            planHashAfter: value.planHashAfter,
            droppedAll: value.outcomes.every((outcome) => outcome.kind === 'dropped'),
            revisionUnitsRemaining: value.revisionUnitsAfter ?? 0,
          };
        }
        // The revision debit binds to the fact of journaling (docs/07,
        // 11.7): underflow writes termination.denied strictly before the
        // typed error surfaces and appends NO plan.revision.
        const debit = await requireAccount().debit('revisionUnits');
        if (!debit.ok) {
          throw new ConfigError(
            'revision_budget_exhausted: maxRevisionsPerRun is absolute and non-replenishable ' +
              `(termination.denied at seq ${String(debit.deniedEntryRef)})`,
          );
        }
        // DEF-5: the DedupIndex folds at the fold head under the
        // PlanWriteLock; verdicts compute once and embed (docs/03, 9.3).
        const dedupIndex = DedupIndex.fold(io.snapshot(), {
          priceUsd: (servedBy, usage) => io.priceUsd(servedBy, usage),
        });
        const oscRejects = new Map<number, { spawnKey: string; oscillationCount: number }>();
        const freshNotes = new Map<
          number,
          { spawnKey: string; donorNodeId: string; reason: string }
        >();
        const evaluation: RebaseEvaluation = rebasePlanRevision(request, {
          state: fold,
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
            // LTID boundaries (docs/07, 3.8): a frozen signature rejects
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
            const admitted = io.admission.admit(
              {
                origin: 'spawn_agent',
                name: op.spec.agentType,
                childScope:
                  rootScope === ''
                    ? planNodeScope(nodeId)
                    : `${rootScope}/${planNodeScope(nodeId)}`,
                parentAccountScope: ROOT_ACCOUNT,
                nodeKey: planScope,
                ...(op.spec.budgetUsd === undefined ? {} : { budgetUsd: op.spec.budgetUsd }),
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
            // A SpawnKey match served fresh embeds its DedupNote for
            // telemetry (docs/03, 9.4).
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
            // An unpark of a DISPATCHED branch is a lineage rebirth
            // (docs/03, 10.1 rule 5); a never-started parked node just
            // resumes scheduling under its existing attempt.
            const wasDispatched = nodeRootOf(op.nodeId) !== undefined;
            return io.admission.admit(
              {
                origin: 'spawn_agent',
                name: spec?.agentType ?? 'unknown',
                childScope: nodeScopeOf(op.nodeId),
                parentAccountScope: ROOT_ACCOUNT,
                nodeKey: planScope,
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
        // ONE durable append strictly BEFORE any effect (docs/07, 3.5).
        const entry = await io.append({
          scope: planScope,
          key,
          kind: 'plan.revision',
          value: value as unknown as Json,
        });
        consumedRevisionSeqs.add(entry.seq);
        await io.flush();
        absorbPlan();
        // Guard verdicts fired by this revision land strictly BEFORE the
        // scheduling effects (docs/07, 3.8).
        await drainGuardVerdicts();
        // DEF-5 effects in the mandatory write order (docs/03, 9.10):
        // node.link entries, by-ref roots, and severing abandons land
        // strictly after the deciding append and before scheduling.
        await landReuseLinks(entry);
        await landCancelAbandons(value, entry.seq);
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
        return {
          outcomes: evaluation.outcomes,
          assignedNodeIds: evaluation.assignedNodeIds,
          planHashAfter: evaluation.planHashAfter,
          droppedAll: evaluation.droppedAll,
          revisionUnitsRemaining: debit.balanceAfter,
        };
      }),
  };

  return {
    name: 'plan-runner',
    promptLines: () => [
      '',
      'You are running the PlanRunner extension: maintain the task plan with',
      'plan_revise (add_task, amend_task, park_task, unpark_task, cancel_task,',
      'reprioritize, rewire_deps, waive_dep), inspect it with plan_view, and sleep',
      'with wait_for_events; the ENGINE schedules ready plan nodes for you.',
    ],
    boot: async (bound: OrchestratorExtensionIO): Promise<void> => {
      io = bound;
      rootScope = io.baseScope;
      planScope = rootScope === '' ? 'plan' : `${rootScope}/plan`;
      await io.flush();
      const folded = foldTermination(io.snapshot());
      if (folded !== undefined) {
        // Resume: the journal always wins over live config (docs/07,
        // 11.2); the fold rebuilt every balance.
        account = folded.account;
        account.bindDeniedWriter(deniedWriter);
      } else {
        const limits = validateTerminationLimits({
          maxRevisionsPerRun: options?.maxRevisionsPerRun ?? 32,
          maxTotalSpawns: options?.limits?.maxTotalSpawns ?? 128,
          maxEscalationsPerLogicalTask: options?.limits?.maxEscalationsPerLogicalTask ?? 2,
          maxDepth: options?.limits?.maxDepth ?? 1,
          kMax: kMaxOf(io.profiles),
          runBudgetUsdCeiling: io.runCeilingUsd ?? 0,
          // The orchestrator cap and finalize reserve freeze here once
          // DEF-7 lands (M7-T12); zero states "not yet resolved".
          orchestratorCapUsd: 0,
          finalizeReserveUsd: 0,
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
      // The alias map and full-link table rebuild by fold (docs/03, 9.10).
      absorbLinks();
      // Roll-forward: verdicts the fold fired whose appends were lost to
      // a crash land now, strictly before any effect.
      await drainGuardVerdicts();
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
        // Stall detection (docs/07, 3.8): the streak already excludes
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

/** The PlanRunner entry surface: mode (c) plus the extension in one call. */
export function orchestratePlanned(
  engine: Engine,
  goal: string,
  opts?: OrchestrateOptions & { plan?: PlanRunnerOptions },
): RunHandle<unknown> {
  const { plan, ...orchestrateOpts } = opts ?? {};
  return orchestrate(engine, goal, {
    ...orchestrateOpts,
    extension: planRunner(plan),
  });
}
