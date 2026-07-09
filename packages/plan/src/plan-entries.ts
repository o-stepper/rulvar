/**
 * plan.revision and plan.decision entry payloads plus the single-applier
 * plan fold (M7-T04, DEF-8).
 *
 * Owning spec: docs/07-adaptive-orchestration-spec.md, sections 3.2-3.4
 * and 3.9. There are several AUTHORS of plan mutations but exactly ONE
 * APPLIER: the fold below, consuming a totally ordered stream of
 * plan-mutating entries from the sequential scope "plan". Nothing mutates
 * PlanState directly; state is a pure fold of entries. Replay NEVER
 * recomputes rebase and never re-evaluates conflicts: the fold consumes
 * the outcomes recorded in the entries, reproducing the APPLIED diff, and
 * recomputes planHashAfter of every entry under that entry's OWN
 * hashVersion; a mismatch raises the typed ReplayPlanHashMismatch without
 * corrupting the journal further.
 */
import { deriverV2, PlanInvariantError, ReplayPlanHashMismatch } from '@lurker/core';
import type {
  AdmissionDecision,
  EntryRef,
  EscalationDecision,
  HashVersion,
  JournalEntry,
  KeyDeriver,
  LogicalTaskId,
  NodeId,
  SpawnLineageOpt,
} from '@lurker/core';
import { planHash } from './plan-hash.js';
import {
  assertPlanTransition,
  isTerminalPlanStatus,
  recomputePlanReadiness,
  type PlanNode,
  type PlanNodeStatus,
  type TaskPlan,
} from './plan-state.js';
import {
  applyTaskSpecPatch,
  promptSpecHashOf,
  type TaskSpec,
  type TaskSpecPatch,
} from './task-spec.js';

/** The orchestrator-facing PlanOp union (docs/07, 4.7). */
export type PlanOp =
  | {
      op: 'add_task';
      spec: TaskSpec;
      deps?: NodeId[];
      priority?: number;
      lineage?: SpawnLineageOpt;
      approach?: string;
      /** Forbids reuse-by-reference for this addition (DEF-5). */
      fresh?: boolean;
    }
  | { op: 'amend_task'; nodeId: NodeId; spec: TaskSpecPatch }
  | { op: 'park_task'; nodeId: NodeId }
  | { op: 'unpark_task'; nodeId: NodeId }
  | { op: 'cancel_task'; nodeId: NodeId; reason?: string }
  | { op: 'reprioritize'; nodeId: NodeId; priority: number }
  | { op: 'rewire_deps'; nodeId: NodeId; deps: NodeId[] }
  | { op: 'waive_dep'; nodeId: NodeId; dep: NodeId };

/**
 * Applied forms the fold consumes. cancel_task gains the engine-computed
 * cascade (docs/07, 3.6: computed at apply time, never a parameter);
 * park/cancel against running nodes apply as flag requests landing later
 * via plan.decision (park-landed, cancel-landed).
 */
export type AppliedPlanOp =
  | (Extract<PlanOp, { op: 'add_task' }> & { nodeId: NodeId })
  | Extract<PlanOp, { op: 'amend_task' }>
  | { op: 'park_task'; nodeId: NodeId; requestOnly?: boolean }
  | { op: 'unpark_task'; nodeId: NodeId; restart?: boolean }
  | {
      op: 'cancel_task';
      nodeId: NodeId;
      reason?: string;
      requestOnly?: boolean;
      cascadeNodeIds?: NodeId[];
    }
  | Extract<PlanOp, { op: 'reprioritize' }>
  | { op: 'rewire_deps'; nodeId: NodeId; deps: NodeId[] }
  | Extract<PlanOp, { op: 'waive_dep' }>;

/** The complete machine reason vocabulary, normative and closed (docs/07, 3.5). */
export type RebaseReasonCode =
  | 'admission_denied'
  | 'node_already_done'
  | 'dep_already_resolved'
  | 'node_escalated'
  | 'node_running'
  | 'terminal_status'
  | 'dep_cycle'
  | 'already_parked'
  | 'not_parked'
  | 'no_such_dep'
  | 'already_waived'
  | 'bad_base'
  | 'lineage_exhausted'
  | 'lineage_busy'
  | 'plan_frozen'
  // transform codes:
  | 'checkpoint_discarded'
  | 'reuse_by_reference'
  | 'resolved_escalation'
  | 'immediate_satisfaction';

export type RebaseOutcome =
  | { kind: 'applied'; op: AppliedPlanOp }
  | { kind: 'transformed'; requested: PlanOp; applied: AppliedPlanOp; reason: RebaseReasonCode }
  | { kind: 'dropped'; requested: PlanOp; reason: RebaseReasonCode; blockingRef?: EntryRef };

export interface PlanSnapshotRef {
  /** Ordinal of the WakeDigest that plan_view is pinned to. */
  digestSeq: number;
  /** Plan hash recorded in that WakeDigest. */
  planHash: string;
}

export interface PlanReviseRequest {
  /** Mandatory; the call is rejected without it (docs/07, 3.5). */
  base: PlanSnapshotRef;
  ops: PlanOp[];
  rationale: string;
}

/** The canonical result form (XF-11): DEF-8 shape plus the DEF-2 balance. */
export interface PlanReviseResult {
  outcomes: RebaseOutcome[];
  assignedNodeIds: Record<number, NodeId>;
  planHashAfter: string;
  droppedAll: boolean;
  revisionUnitsRemaining: number;
}

export type PlanReviseErrorCode = 'revision_budget_exhausted' | RebaseReasonCode;

/** One embedded admission beside its op (docs/07, 3.3; DEF-2/DEF-3 folds read it). */
export interface PlanRevisionAdmission {
  opIndex: number;
  nodeId?: NodeId;
  decision: AdmissionDecision;
  /** Reuse placement recorded beside a reuse_full/admit_graft verdict (DEF-5). */
  reuse?: { donorScope: string; chain: string[] };
}

/** The value payload of a plan.revision entry (docs/07, 3.3; XF-11). */
export interface PlanRevisionValue {
  base: PlanSnapshotRef;
  requestedOps: PlanOp[];
  /** Same length and order as requestedOps. */
  outcomes: RebaseOutcome[];
  assignedNodeIds: Record<number, NodeId>;
  admissions: PlanRevisionAdmission[];
  planHashBefore: string;
  planHashAfter: string;
  hashVersion: HashVersion;
  /** Cosmetic: never enters the content key. */
  rationale: string;
  /** DEF-2 extensions. */
  revisionUnitsAfter?: number;
  debits?: Array<{ resource: string; logicalTaskId?: LogicalTaskId; balanceAfter: number }>;
}

/** Engine authorship origins of plan.decision entries (docs/07, 3.3). */
export type PlanDecisionOrigin =
  | 'escalation-default'
  | 'escalation-class'
  | 'escalation-live'
  | 'no-progress'
  | 'child-result'
  | 'park-landed'
  | 'cancel-landed';

/** The closed EnginePlanOp set (docs/07, 3.3). */
export type EnginePlanOp =
  | {
      kind: 'set_node_status';
      nodeId: NodeId;
      from: PlanNodeStatus;
      to: PlanNodeStatus;
      cause: 'child-result' | 'no-progress' | 'park-landed' | 'cancel-landed';
      causeRef: EntryRef;
    }
  | {
      kind: 'resolve_escalation';
      nodeId: NodeId;
      decision: EscalationDecision;
      resolvedBy: 'default' | 'class' | 'live' | 'revision-transform';
      escalationRef: EntryRef;
    }
  | {
      kind: 'spawn_admitted';
      nodes: Array<{ nodeId: NodeId; logicalTaskId: LogicalTaskId; spec: TaskSpec }>;
      admission: AdmissionDecision;
    };

/** The value payload of a plan.decision entry (docs/07, 3.3). */
export interface PlanDecisionValue {
  origin: PlanDecisionOrigin;
  ops: EnginePlanOp[];
  causeRef: EntryRef;
  planHashBefore: string;
  planHashAfter: string;
  hashVersion: HashVersion;
}

/**
 * Content keys (docs/07, 3.3): plan.revision keys over {kind, base,
 * requestedOps}; plan.decision over {kind, origin, ops, causeRef}.
 * Cosmetics (rationale) never enter a key; ordinal within scope "plan"
 * distinguishes repeats, so forward-matching works without kernel
 * changes.
 */
export function planRevisionKey(base: PlanSnapshotRef, requestedOps: readonly PlanOp[]): string {
  return deriverV2.deriveKey({
    kind: 'plan.revision',
    base: base,
    requestedOps: requestedOps,
  });
}

export function planDecisionKey(
  origin: PlanDecisionOrigin,
  ops: readonly EnginePlanOp[],
  causeRef: EntryRef,
): string {
  return deriverV2.deriveKey({
    kind: 'plan.decision',
    origin,
    ops: ops,
    causeRef,
  });
}

/**
 * The working state the applier threads: the hashed TaskPlan plus the
 * resolved spec table. Specs stay OUT of planHash by construction (the
 * hashed projection is promptSpecHash per node, docs/07 3.1) but are
 * themselves a pure fold of add_task specs, amend patches, and
 * decomposition specs, so live and replay converge byte-identically.
 */
export interface PlanWorking {
  plan: TaskPlan;
  specs: Readonly<Record<NodeId, TaskSpec>>;
}

/**
 * The plan fold state: the working state plus fold-side records that
 * deliberately stay OUT of planHash. `badBaseStreak` reconciles two
 * normative clauses: a bad_base revision leaves the hashed state
 * byte-identical (docs/07, 3.5 step 2: planHashAfter == planHashBefore)
 * yet still lengthens the guard streak (docs/07, 3.6 last row): the
 * guards therefore consume `effectiveDroppedStreak`, the hashed counter
 * plus the trailing bad_base entries. `doneRefs` remembers which entry
 * resolved each done node so waive_dep drops can point blockingRef at
 * it.
 */
export interface PlanFoldState extends PlanWorking {
  badBaseStreak: number;
  doneRefs: Record<NodeId, EntryRef>;
}

export function emptyPlanFold(plan: TaskPlan): PlanFoldState {
  return { plan, specs: {}, badBaseStreak: 0, doneRefs: {} };
}

/** The streak RevisionGuards consume (docs/07, 3.8). */
export function effectiveDroppedStreak(state: PlanFoldState): number {
  return state.plan.droppedRevisionStreak + state.badBaseStreak;
}

function verifyHash(
  entry: JournalEntry,
  which: 'planHashBefore' | 'planHashAfter',
  expected: string,
  plan: TaskPlan,
  deriverFor?: (hashVersion: HashVersion) => KeyDeriver | undefined,
): void {
  const deriver = deriverFor?.(entry.hashVersion) ?? deriverV2;
  const actual = planHash(plan, deriver);
  if (actual !== expected) {
    throw new ReplayPlanHashMismatch(
      `plan fold ${which} mismatch at seq ${String(entry.seq)}: recomputed ${actual}, ` +
        `entry carries ${expected} (hashVersion ${String(entry.hashVersion)}); the resume is ` +
        'rejected without corrupting the journal (docs/07, 3.4)',
      {
        data: {
          entryRef: entry.seq,
          expected,
          actual,
          hashVersion: entry.hashVersion,
          which,
        },
      },
    );
  }
}

function nodeOf(plan: TaskPlan, nodeId: NodeId, seq: number): PlanNode {
  const node = plan.nodes[nodeId];
  if (node === undefined) {
    throw new PlanInvariantError(
      `plan fold references unknown node ${nodeId} at seq ${String(seq)}`,
      { data: { nodeId, entryRef: seq } },
    );
  }
  return node;
}

function withNode(working: PlanWorking, node: PlanNode, spec?: TaskSpec): PlanWorking {
  return {
    plan: { ...working.plan, nodes: { ...working.plan.nodes, [node.nodeId]: node } },
    specs: spec === undefined ? working.specs : { ...working.specs, [node.nodeId]: spec },
  };
}

/**
 * Applies ONE applied op to the working state. The applier consumes
 * recorded outcomes; op-level legality was decided at rebase time and is
 * never re-evaluated here. Exported for the rebase engine, which applies
 * each op of a revision against the state already changed by the earlier
 * applied ops of the same revision (docs/07, 3.5, step 3).
 */
export function applyAppliedOp(
  working: PlanWorking,
  op: AppliedPlanOp,
  context: {
    seq: number;
    opIndex?: number;
    lineageOf?: (opIndex: number) => LogicalTaskId | undefined;
  },
): PlanWorking {
  switch (op.op) {
    case 'add_task': {
      const logicalTaskId =
        context.lineageOf?.(context.opIndex ?? -1) ?? op.lineage?.continues ?? op.nodeId;
      const node: PlanNode = {
        nodeId: op.nodeId,
        logicalTaskId,
        status: 'pending',
        deps: [...(op.deps ?? [])],
        waivedDeps: [],
        parkRequested: false,
        cancelRequested: false,
        priority: op.priority ?? 0,
        promptSpecHash: promptSpecHashOf(op.spec),
      };
      return withNode(working, node, op.spec);
    }
    case 'amend_task': {
      const node = nodeOf(working.plan, op.nodeId, context.seq);
      const current = working.specs[op.nodeId];
      if (current === undefined) {
        throw new PlanInvariantError(
          `amend_task at seq ${String(context.seq)} targets node ${op.nodeId} whose spec is ` +
            'unknown to the fold (specs are a pure fold of add/amend/decompose entries)',
          { data: { entryRef: context.seq, nodeId: op.nodeId } },
        );
      }
      const amendedSpec = applyTaskSpecPatch(current, op.spec);
      const amended: PlanNode = { ...node, promptSpecHash: promptSpecHashOf(amendedSpec) };
      // The checkpoint-discarding transform on parked nodes: unpark
      // becomes a restart (docs/07, 3.6).
      if (node.status === 'parked') {
        delete amended.checkpointRef;
      }
      return withNode(working, amended, amendedSpec);
    }
    case 'park_task': {
      const node = nodeOf(working.plan, op.nodeId, context.seq);
      if (op.requestOnly === true) {
        return withNode(working, { ...node, parkRequested: true });
      }
      assertPlanTransition(node, 'parked');
      return withNode(working, { ...node, status: 'parked' });
    }
    case 'unpark_task': {
      const node = nodeOf(working.plan, op.nodeId, context.seq);
      const next: PlanNode = { ...node, status: 'pending' };
      if (op.restart === true) {
        delete next.checkpointRef;
      }
      return withNode(working, next);
    }
    case 'cancel_task': {
      const node = nodeOf(working.plan, op.nodeId, context.seq);
      if (op.requestOnly === true) {
        return withNode(working, { ...node, cancelRequested: true });
      }
      assertPlanTransition(node, 'cancelled');
      let next = withNode(working, { ...node, status: 'cancelled' });
      for (const cascaded of op.cascadeNodeIds ?? []) {
        const member = nodeOf(next.plan, cascaded, context.seq);
        if (isTerminalPlanStatus(member.status)) {
          // done never enters the cascade; other terminals are no-ops.
          continue;
        }
        next = withNode(next, { ...member, status: 'skipped' });
      }
      return next;
    }
    case 'reprioritize': {
      const node = nodeOf(working.plan, op.nodeId, context.seq);
      return withNode(working, { ...node, priority: op.priority });
    }
    case 'rewire_deps': {
      const node = nodeOf(working.plan, op.nodeId, context.seq);
      const keep = new Set(op.deps);
      return withNode(working, {
        ...node,
        deps: [...op.deps],
        waivedDeps: node.waivedDeps.filter((dep) => keep.has(dep)),
      });
    }
    case 'waive_dep': {
      const node = nodeOf(working.plan, op.nodeId, context.seq);
      return withNode(working, { ...node, waivedDeps: [...node.waivedDeps, op.dep] });
    }
  }
}

/** Reads a plan.revision entry's payload (tolerant of foreign journals). */
export function readPlanRevision(entry: JournalEntry): PlanRevisionValue | undefined {
  if (entry.kind !== 'plan.revision') {
    return undefined;
  }
  const value = entry.value as Partial<PlanRevisionValue> | undefined;
  if (value === undefined || !Array.isArray(value.outcomes) || value.base === undefined) {
    return undefined;
  }
  return value as PlanRevisionValue;
}

/** Reads a plan.decision entry's payload. */
export function readPlanDecision(entry: JournalEntry): PlanDecisionValue | undefined {
  if (entry.kind !== 'plan.decision') {
    return undefined;
  }
  const value = entry.value as Partial<PlanDecisionValue> | undefined;
  if (value === undefined || !Array.isArray(value.ops) || value.origin === undefined) {
    return undefined;
  }
  return value as PlanDecisionValue;
}

/**
 * THE single applier (docs/07, 3.2): folds one plan-scope entry into the
 * state. Replay consumes recorded outcomes (the APPLIED diff), never
 * re-runs rebase, and timers do not run; hash verification runs under
 * the entry's own hashVersion profile.
 */
export function applyPlanEntry(
  state: PlanFoldState,
  entry: JournalEntry,
  options?: { deriverFor?: (hashVersion: HashVersion) => KeyDeriver | undefined },
): PlanFoldState {
  if (entry.kind === 'plan.revision') {
    const value = readPlanRevision(entry);
    if (value === undefined) {
      throw new PlanInvariantError(`malformed plan.revision payload at seq ${String(entry.seq)}`, {
        data: { entryRef: entry.seq },
      });
    }
    verifyHash(entry, 'planHashBefore', value.planHashBefore, state.plan, options?.deriverFor);
    const badBase =
      value.outcomes.length > 0 &&
      value.outcomes.every(
        (outcome) => outcome.kind === 'dropped' && outcome.reason === 'bad_base',
      );
    if (badBase) {
      // The hashed state stays byte-identical; only the guard-side
      // streak lengthens (docs/07, 3.5 step 2 and 3.6 last row).
      verifyHash(entry, 'planHashAfter', value.planHashAfter, state.plan, options?.deriverFor);
      return { ...state, badBaseStreak: state.badBaseStreak + 1 };
    }
    let working: PlanWorking = { plan: state.plan, specs: state.specs };
    const droppedAll = value.outcomes.every((outcome) => outcome.kind === 'dropped');
    for (const [index, outcome] of value.outcomes.entries()) {
      if (outcome.kind === 'dropped') {
        continue;
      }
      const applied = outcome.kind === 'applied' ? outcome.op : outcome.applied;
      working = applyAppliedOp(working, applied, {
        seq: entry.seq,
        opIndex: index,
        lineageOf: (opIndex) => lineageOfAdmission(value.admissions, opIndex),
      });
    }
    const plan = recomputePlanReadiness({
      ...working.plan,
      revisionCount: working.plan.revisionCount + 1,
      droppedRevisionStreak: droppedAll ? working.plan.droppedRevisionStreak + 1 : 0,
    });
    verifyHash(entry, 'planHashAfter', value.planHashAfter, plan, options?.deriverFor);
    return { plan, specs: working.specs, badBaseStreak: 0, doneRefs: state.doneRefs };
  }
  if (entry.kind === 'plan.decision') {
    const value = readPlanDecision(entry);
    if (value === undefined) {
      throw new PlanInvariantError(`malformed plan.decision payload at seq ${String(entry.seq)}`, {
        data: { entryRef: entry.seq },
      });
    }
    verifyHash(entry, 'planHashBefore', value.planHashBefore, state.plan, options?.deriverFor);
    const applied = applyDecisionOps(state, value.ops, entry.seq);
    verifyHash(entry, 'planHashAfter', value.planHashAfter, applied.plan, options?.deriverFor);
    return {
      plan: applied.plan,
      specs: applied.specs,
      badBaseStreak: state.badBaseStreak,
      doneRefs: applied.doneRefs,
    };
  }
  return state;
}

/**
 * The shared plan.decision applier core: engine authorship happens at
 * the fold head under PlanWriteLock (docs/07, 3.3), so the producer can
 * PREVIEW the resulting state (and its planHashAfter) before appending,
 * and the fold re-applies the recorded ops identically on replay.
 */
export function applyDecisionOps(
  state: Pick<PlanFoldState, 'plan' | 'specs' | 'doneRefs'>,
  ops: readonly EnginePlanOp[],
  seq: number,
): { plan: TaskPlan; specs: PlanWorking['specs']; doneRefs: Record<NodeId, EntryRef> } {
  let working: PlanWorking = { plan: state.plan, specs: state.specs };
  const doneRefs = { ...state.doneRefs };
  for (const op of ops) {
    if (op.kind === 'set_node_status') {
      const node = nodeOf(working.plan, op.nodeId, seq);
      if (node.status !== op.from) {
        throw new PlanInvariantError(
          `plan.decision at seq ${String(seq)} records transition from '${op.from}' ` +
            `but node ${op.nodeId} is '${node.status}'`,
          { data: { entryRef: seq, nodeId: op.nodeId } },
        );
      }
      assertPlanTransition(node, op.to);
      const next: PlanNode = { ...node, status: op.to };
      if (isTerminalPlanStatus(op.to)) {
        // A terminal transition extinguishes pending flags (docs/07,
        // 3.9: no orphaned flags, no double checkpoints).
        next.parkRequested = false;
        next.cancelRequested = false;
      }
      if (op.to === 'done') {
        doneRefs[op.nodeId] = op.causeRef;
      }
      working = withNode(working, next);
      continue;
    }
    if (op.kind === 'resolve_escalation') {
      const node = nodeOf(working.plan, op.nodeId, seq);
      working = withNode(working, resolveEscalatedNode(node, op.decision, op.escalationRef));
      continue;
    }
    // spawn_admitted: decomposition children enter the plan as pending
    // nodes with FRESH LTIDs minted inside this decision (docs/07, 8.1
    // rule 6).
    for (const child of op.nodes) {
      const node: PlanNode = {
        nodeId: child.nodeId,
        logicalTaskId: child.logicalTaskId,
        status: 'pending',
        deps: [],
        waivedDeps: [],
        parkRequested: false,
        cancelRequested: false,
        priority: 0,
        promptSpecHash: promptSpecHashOf(child.spec),
      };
      working = withNode(working, node, child.spec);
    }
  }
  const plan = recomputePlanReadiness(working.plan);
  return { plan, specs: working.specs, doneRefs };
}

function lineageOfAdmission(
  admissions: readonly PlanRevisionAdmission[],
  opIndex: number,
): LogicalTaskId | undefined {
  const admission = admissions.find((item) => item.opIndex === opIndex);
  const verdict = admission?.decision.verdict;
  if (verdict === undefined || verdict.kind === 'reject') {
    return undefined;
  }
  return verdict.lineage.logicalTaskId;
}

/**
 * The escalated node's fate under a resolve_escalation op (docs/07, 3.3):
 * retry re-opens the node for scheduling (pending; readiness decides),
 * cancel closes it, accept marks the paid partial result done, decompose
 * leaves the node escalated while its children (spawn_admitted in the
 * same decision) carry the work; the M7-T11 protocol completes the
 * decompose lifecycle.
 */
function resolveEscalatedNode(
  node: PlanNode,
  decision: EscalationDecision,
  escalationRef: EntryRef,
): PlanNode {
  const resolved: PlanNode = { ...node, escalationRef };
  switch (decision.kind) {
    case 'retry':
      return { ...resolved, status: 'pending' };
    case 'cancel':
      return { ...resolved, status: 'cancelled' };
    case 'accept':
      return { ...resolved, status: 'done' };
    case 'decompose':
      return resolved;
  }
}
