/**
 * The committed rebase algorithm (M7-T04, DEF-8): no variants.
 *
 * Owning spec: docs/07-adaptive-orchestration-spec.md, sections 3.5-3.7.
 * The caller holds the PlanWriteLock, reads the fold head, runs this pure
 * evaluation, appends ONE plan.revision entry strictly BEFORE any effect,
 * and renders the tool result deterministically from the entry. Conflicts
 * are evaluated ONLY against the fold head (`base` serves validation and
 * audit); requested ops apply sequentially in submission order, each
 * against the state already changed by the earlier applied ops of the
 * same revision; every op lands as exactly one of applied, transformed
 * (deterministic rewrite recorded beside the requested form), or dropped
 * (a journaled no-op with a machine reason and optional blockingRef).
 */
import type { AdmissionDecision, EntryRef, LogicalTaskId, NodeId } from '@lurker/core';
import { planHash } from './plan-hash.js';
import {
  isTerminalPlanStatus,
  recomputePlanReadiness,
  wouldCreateDepCycle,
  type PlanNode,
  type TaskPlan,
} from './plan-state.js';
import {
  applyAppliedOp,
  type AppliedPlanOp,
  type PlanFoldState,
  type PlanOp,
  type PlanRevisionAdmission,
  type PlanReviseRequest,
  type PlanWorking,
  type RebaseOutcome,
  type RebaseReasonCode,
} from './plan-entries.js';

/** The reuse-by-reference transform hook (DEF-5; producer lands in M7-T07). */
export interface ReuseTransform {
  applied: AppliedPlanOp;
  admission: AdmissionDecision;
  nodeId: NodeId;
}

export interface RebaseContext {
  /** The fold head (docs/07, 3.5 step 3). */
  state: PlanFoldState;
  /** The plan hash recorded in the WakeDigest the base references. */
  digestPlanHashFor: (digestSeq: number) => string | undefined;
  /** Engine NodeId minting (ULIDs; never the model). */
  mintNodeId: () => NodeId;
  /** The plan is frozen for adaptation by orchestrator_budget_cap (DEF-7). */
  frozen?: boolean;
  /** Embedded admission for add_task (docs/07, 3.6); absent admits nothing. */
  admitAdd?: (
    op: Extract<PlanOp, { op: 'add_task' }>,
    nodeId: NodeId,
    opIndex: number,
  ) => AdmissionDecision;
  /** Embedded admission reserve for unpark_task (docs/07, 3.6). */
  admitUnpark?: (
    op: Extract<PlanOp, { op: 'unpark_task' }>,
    node: PlanNode,
    opIndex: number,
  ) => AdmissionDecision;
  /** Lineage-at-head check for add_task lineage blocks (DEF-3). */
  lineageCheck?: (continues: LogicalTaskId) => 'ok' | 'lineage_busy' | 'lineage_exhausted';
  /** Reuse-by-reference dedup at the fold head (DEF-5; M7-T07). */
  dedup?: (op: Extract<PlanOp, { op: 'add_task' }>, opIndex: number) => ReuseTransform | undefined;
}

export interface RebaseEvaluation {
  outcomes: RebaseOutcome[];
  assignedNodeIds: Record<number, NodeId>;
  admissions: PlanRevisionAdmission[];
  planHashBefore: string;
  planHashAfter: string;
  droppedAll: boolean;
  badBase: boolean;
  /** The post-revision working state (counters updated, readiness recomputed). */
  working: PlanWorking;
}

/**
 * Steps 2-4 of the committed algorithm (docs/07, 3.5): base validation,
 * sequential per-op conflict resolution against the mutating head, and
 * the post-revision counter update. Pure: the caller owns the lock, the
 * append, and every effect.
 */
export function rebasePlanRevision(
  request: PlanReviseRequest,
  context: RebaseContext,
): RebaseEvaluation {
  const planHashBefore = planHash(context.state.plan);
  const recorded = context.digestPlanHashFor(request.base.digestSeq);
  if (recorded === undefined || recorded !== request.base.planHash) {
    // ONE journaled all-dropped revision; the hashed state is untouched
    // (planHashAfter == planHashBefore) and the guard streak lengthens
    // fold-side (docs/07, 3.5 step 2; plan-entries.ts).
    return {
      outcomes: request.ops.map((op) => ({ kind: 'dropped', requested: op, reason: 'bad_base' })),
      assignedNodeIds: {},
      admissions: [],
      planHashBefore,
      planHashAfter: planHashBefore,
      droppedAll: true,
      badBase: true,
      working: { plan: context.state.plan, specs: context.state.specs },
    };
  }
  let working: PlanWorking = { plan: context.state.plan, specs: context.state.specs };
  const outcomes: RebaseOutcome[] = [];
  const assignedNodeIds: Record<number, NodeId> = {};
  const admissions: PlanRevisionAdmission[] = [];
  for (const [opIndex, op] of request.ops.entries()) {
    const outcome = evaluateOp(op, opIndex, working, context, admissions, assignedNodeIds);
    outcomes.push(outcome);
    if (outcome.kind !== 'dropped') {
      const applied = outcome.kind === 'applied' ? outcome.op : outcome.applied;
      working = applyAppliedOp(working, applied, {
        seq: -1,
        opIndex,
        lineageOf: (index) => lineageOf(admissions, index),
      });
    }
  }
  const droppedAll = outcomes.every((outcome) => outcome.kind === 'dropped');
  const plan = recomputePlanReadiness({
    ...working.plan,
    revisionCount: working.plan.revisionCount + 1,
    droppedRevisionStreak: droppedAll ? working.plan.droppedRevisionStreak + 1 : 0,
  });
  return {
    outcomes,
    assignedNodeIds,
    admissions,
    planHashBefore,
    planHashAfter: planHash(plan),
    droppedAll,
    badBase: false,
    working: { plan, specs: working.specs },
  };
}

function lineageOf(
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

function dropped(
  requested: PlanOp,
  reason: RebaseReasonCode,
  blockingRef?: EntryRef,
): RebaseOutcome {
  return {
    kind: 'dropped',
    requested,
    reason,
    ...(blockingRef === undefined ? {} : { blockingRef }),
  };
}

/**
 * The complete per-op resolution table, op x node state at the fold head
 * (docs/07, 3.6). Normative and closed: every row below cites its table
 * row; nothing else exists.
 */
function evaluateOp(
  op: PlanOp,
  opIndex: number,
  working: PlanWorking,
  context: RebaseContext,
  admissions: PlanRevisionAdmission[],
  assignedNodeIds: Record<number, NodeId>,
): RebaseOutcome {
  // any op | plan frozen by orchestrator_budget_cap | dropped plan_frozen.
  if (context.frozen === true) {
    return dropped(op, 'plan_frozen');
  }
  const plan = working.plan;
  if (op.op === 'add_task') {
    // lineage exhausted or busy at the head (DEF-3 rows).
    if (op.lineage !== undefined && context.lineageCheck !== undefined) {
      const lineage = context.lineageCheck(op.lineage.continues);
      if (lineage !== 'ok') {
        return dropped(op, lineage);
      }
    }
    // byte-identical content key of a completed abandoned branch:
    // transformed reuse_by_reference (DEF-5; the hook lands in M7-T07).
    if (op.fresh !== true && context.dedup !== undefined) {
      const reuse = context.dedup(op, opIndex);
      if (reuse !== undefined) {
        admissions.push({ opIndex, nodeId: reuse.nodeId, decision: reuse.admission });
        assignedNodeIds[opIndex] = reuse.nodeId;
        return {
          kind: 'transformed',
          requested: op,
          applied: reuse.applied,
          reason: 'reuse_by_reference',
        };
      }
    }
    const nodeId = context.mintNodeId();
    const decision = context.admitAdd?.(op, nodeId, opIndex);
    if (decision !== undefined) {
      admissions.push({ opIndex, nodeId, decision });
      if (decision.verdict.kind === 'reject') {
        // AdmissionController rejects: dropped admission_denied with the
        // verdict embedded in the entry.
        return dropped(op, 'admission_denied');
      }
    }
    assignedNodeIds[opIndex] = nodeId;
    // A declared dep on a terminally unsuccessful node still applies: the
    // node stays blocked and surfaces in the WakeDigest; no silent waive.
    return { kind: 'applied', op: { ...op, nodeId } };
  }
  const node = plan.nodes[op.nodeId];
  if (node === undefined) {
    // A hallucinated target is a journaled no-op; the closed vocabulary
    // has no missing-target code, and no_such_dep is its nearest reading
    // (the referenced node does not exist at the head).
    return dropped(op, 'no_such_dep');
  }
  switch (op.op) {
    case 'amend_task': {
      if (node.status === 'pending' || node.status === 'ready') {
        return { kind: 'applied', op };
      }
      if (node.status === 'parked') {
        // The amendment applies, the checkpoint is discarded, unpark
        // becomes a restart.
        return { kind: 'transformed', requested: op, applied: op, reason: 'checkpoint_discarded' };
      }
      if (node.status === 'running') {
        // Amending a running node is a decision to pay twice; the
        // sanctioned path is cancel_task + add_task.
        return dropped(op, 'node_running');
      }
      if (node.status === 'escalated') {
        // The escalation channel owns the node's fate.
        return dropped(op, 'node_escalated');
      }
      return dropped(op, 'terminal_status');
    }
    case 'park_task': {
      if (node.status === 'pending' || node.status === 'ready') {
        return { kind: 'applied', op: { op: 'park_task', nodeId: op.nodeId } };
      }
      if (node.status === 'running') {
        // parkRequested = true; the actual park lands at the turn
        // boundary via a separate plan.decision (park-landed).
        return {
          kind: 'applied',
          op: { op: 'park_task', nodeId: op.nodeId, requestOnly: true },
        };
      }
      if (node.status === 'escalated') {
        return dropped(op, 'node_escalated');
      }
      if (node.status === 'parked') {
        return dropped(op, 'already_parked');
      }
      return dropped(op, 'terminal_status');
    }
    case 'unpark_task': {
      if (node.status !== 'parked') {
        return dropped(op, isTerminalPlanStatus(node.status) ? 'terminal_status' : 'not_parked');
      }
      const decision = context.admitUnpark?.(op, node, opIndex);
      if (decision !== undefined) {
        admissions.push({ opIndex, nodeId: op.nodeId, decision });
        if (decision.verdict.kind === 'reject') {
          return dropped(op, 'admission_denied');
        }
      }
      // A discarded checkpoint makes the unpark a restart (docs/07, 3.6
      // amend-on-parked row; the pin-cap overflow path lands in M7-T08).
      return {
        kind: 'applied',
        op: {
          op: 'unpark_task',
          nodeId: op.nodeId,
          ...(node.checkpointRef === undefined ? { restart: true } : {}),
        },
      };
    }
    case 'cancel_task': {
      if (node.status === 'done') {
        // done is immutable and the result is paid for; to keep the
        // result unused, cancel the dependents.
        return dropped(op, 'node_already_done');
      }
      if (node.status === 'failed' || node.status === 'cancelled' || node.status === 'skipped') {
        return dropped(op, 'terminal_status');
      }
      if (node.status === 'running') {
        // cancelRequested plus AbortSignal; the final transition lands
        // via a separate plan.decision (cancel-landed).
        return {
          kind: 'applied',
          op: {
            op: 'cancel_task',
            nodeId: op.nodeId,
            ...(op.reason === undefined ? {} : { reason: op.reason }),
            requestOnly: true,
          },
        };
      }
      if (node.status === 'escalated') {
        // The op becomes an escalation resolution with verdict cancel via
        // superseding append decide-once (DEF-4); the resolution and the
        // plan.decision land as effects strictly after the append.
        return {
          kind: 'transformed',
          requested: op,
          applied: {
            op: 'cancel_task',
            nodeId: op.nodeId,
            ...(op.reason === undefined ? {} : { reason: op.reason }),
            requestOnly: true,
          },
          reason: 'resolved_escalation',
        };
      }
      // pending, ready, or parked: the subtree cascade is computed at
      // apply time; done nodes never enter it (done is immutable).
      const cascade = cascadeOf(plan, op.nodeId);
      return {
        kind: 'applied',
        op: {
          op: 'cancel_task',
          nodeId: op.nodeId,
          ...(op.reason === undefined ? {} : { reason: op.reason }),
          ...(cascade.length === 0 ? {} : { cascadeNodeIds: cascade }),
        },
      };
    }
    case 'reprioritize': {
      if (isTerminalPlanStatus(node.status)) {
        return dropped(op, 'terminal_status');
      }
      return { kind: 'applied', op };
    }
    case 'rewire_deps': {
      if (wouldCreateDepCycle(plan, op.nodeId, op.deps)) {
        // rewire_deps is atomic; partial application is forbidden.
        return dropped(op, 'dep_cycle');
      }
      if (node.status === 'running') {
        return dropped(op, 'node_running');
      }
      const ontoDone = op.deps.filter((dep) => plan.nodes[dep]?.status === 'done');
      if (ontoDone.length > 0) {
        // Edges onto done nodes are immediately satisfied: the applied
        // form prunes them (a deterministic rewrite recorded beside the
        // requested one); edges onto cancelled or failed nodes remain
        // blocking and stay.
        const satisfied = new Set(ontoDone);
        return {
          kind: 'transformed',
          requested: op,
          applied: {
            op: 'rewire_deps',
            nodeId: op.nodeId,
            deps: op.deps.filter((dep) => !satisfied.has(dep)),
          },
          reason: 'immediate_satisfaction',
        };
      }
      return { kind: 'applied', op };
    }
    case 'waive_dep': {
      if (!node.deps.includes(op.dep)) {
        return dropped(op, 'no_such_dep');
      }
      if (node.waivedDeps.includes(op.dep)) {
        return dropped(op, 'already_waived');
      }
      const upstream = plan.nodes[op.dep];
      if (upstream?.status === 'done') {
        // The dep already resolved (upstream done, including via a
        // defaultDecision); blockingRef points at the resolving entry.
        return dropped(op, 'dep_already_resolved', context.state.doneRefs[op.dep]);
      }
      // Terminally unsuccessful upstreams are dead, not resolved: the
      // waive unblocks the node. A still-blocking dep waives too.
      return { kind: 'applied', op };
    }
  }
}

/**
 * The cancel cascade (docs/07, 3.6): the transitive BLOCKING dependents
 * of the cancelled node, computed at apply time. An edge is blocking
 * when not waived; `done` nodes never enter the cascade (done is
 * immutable), and running dependents (only reachable via waived or
 * already-satisfied edges) are left to their own lifecycle.
 */
function cascadeOf(plan: TaskPlan, root: NodeId): NodeId[] {
  const cascade: NodeId[] = [];
  const severed = new Set<NodeId>([root]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of Object.values(plan.nodes)) {
      if (severed.has(node.nodeId) || isTerminalPlanStatus(node.status)) {
        continue;
      }
      if (node.status === 'running') {
        continue;
      }
      const waived = new Set(node.waivedDeps);
      const blocked = node.deps.some((dep) => severed.has(dep) && !waived.has(dep));
      if (blocked) {
        severed.add(node.nodeId);
        cascade.push(node.nodeId);
        grew = true;
      }
    }
  }
  return cascade.sort();
}
