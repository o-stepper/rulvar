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
  deriverV2,
  foldTermination,
  kMaxOf,
  ladderLengthOf,
  LEGACY_SIGNATURE_INPUTS,
  normalizeApproachTag,
  orchestrate,
  planNodeScope,
  profileRegistrySnapshotHash,
  ROOT_ACCOUNT,
  TerminationAccount,
  validateTerminationLimits,
  type AgentProfile,
  type AgentResult,
  type EntryRef,
  type Engine,
  type ExtensionDispatchSpec,
  type JournalEntry,
  type Json,
  type LogicalTaskId,
  type NodeId,
  type OrchestrateOptions,
  type OrchestratorExtension,
  type OrchestratorExtensionIO,
  type RunHandle,
  type TerminationDeniedValue,
  type TerminationLimits,
  type WakeDigest,
} from '@lurker/core';
import { canonicalIsolationTag } from '@lurker/core';
import { planHash } from './plan-hash.js';
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
import type { TaskSpec } from './task-spec.js';

/** docs/07, 3.8. */
export interface PlanRunnerOptions {
  /** Absolute, non-replenishable; default 32 (DEF-2). */
  maxRevisionsPerRun?: number;
  guards?: RevisionGuardsOptions;
  /** Out-of-vocabulary tags get a typed tool error with bounded re-prompt (DEF-3). */
  approachVocabulary?: string[];
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
  const guards = new RevisionGuards(options?.guards);
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
  ): Promise<void> => {
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
    await io.append({
      scope: planScope,
      key: planDecisionKey(origin, ops, causeRef),
      kind: 'plan.decision',
      value: value as unknown as Json,
    });
    await io.flush();
    absorbPlan();
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
      const cause = node.cancelRequested && to === 'cancelled' ? 'cancel-landed' : 'child-result';
      await appendPlanDecision(
        cause === 'cancel-landed' ? 'cancel-landed' : 'child-result',
        [{ kind: 'set_node_status', nodeId, from: 'running', to, cause, causeRef }],
        causeRef,
      );
    }
  };

  /** Dispatches every ready node under its plan/NodeId scope. */
  const scheduleReady = async (): Promise<void> => {
    for (const node of Object.values(fold.plan.nodes)) {
      if (node.status !== 'ready' || dispatched.has(node.nodeId)) {
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
      const dispatchSpec: ExtensionDispatchSpec = {
        agentType: spec.agentType,
        prompt: spec.prompt,
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
        abandonedSpend: { abandonedUsd: 0, reclaimedUsd: 0, netLostUsd: 0 },
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
        const evaluation: RebaseEvaluation = rebasePlanRevision(request, {
          state: fold,
          digestPlanHashFor: (digestSeq) => digests.get(digestSeq)?.planHash,
          mintNodeId: () => io.mintId(),
          admitAdd: (op, nodeId) => {
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
            return io.admission.admit(
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
        // Effects: schedule newly-ready nodes; land cancel requests on
        // running children (the final transition arrives cancel-landed).
        for (const outcome of evaluation.outcomes) {
          if (outcome.kind === 'dropped') {
            continue;
          }
          const applied = outcome.kind === 'applied' ? outcome.op : outcome.applied;
          if (applied.op === 'cancel_task' && applied.requestOnly === true) {
            const handle = dispatched.get(applied.nodeId);
            if (handle !== undefined) {
              void io.cancel(handle, applied.reason);
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
      return { planHash: planHash(fold.plan), planSeq: planCursor };
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
