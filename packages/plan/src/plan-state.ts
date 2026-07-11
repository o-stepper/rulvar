/**
 * Plan scope substrate (M7-T01): TaskPlan as engine-owned typed data, the
 * closed PlanNodeStatus machine, and the pure derivations the plan fold
 * consumes (readiness, cycle checks).
 *
 * Owning spec: docs/07-adaptive-orchestration-spec.md, sections 3.1
 * (TaskPlan data model) and 3.2 (single applier and total order) (DEF-8).
 * Nodes carry NodeId ULIDs minted by the engine inside the plan.revision
 * entry that adds them, never by the model; dependencies form a DAG; the
 * status machine is closed and `done` is immutable. State is ALWAYS a pure
 * fold of plan-scope entries: nothing mutates a TaskPlan in place, every
 * helper returns a fresh value.
 */
import { PlanInvariantError } from '@rulvar/core';
import type { EntryRef, LogicalTaskId, NodeId } from '@rulvar/core';

/**
 * The single sequential scope holding every plan-mutating entry, inside
 * the orchestrator's run scope (docs/07, 3.2): total order = ordinal
 * order = durable append order. Child node scopes are `plan/NodeId`
 * (core `planNodeScope`; grammar in docs/03, section 2.1).
 */
export const PLAN_SCOPE = 'plan';

/** The closed status machine (docs/07, 3.1); `skipped` is fold-derived for entries but first-class for plan nodes. */
export type PlanNodeStatus =
  | 'pending'
  | 'ready'
  | 'running'
  | 'parked'
  | 'escalated'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'skipped';

/**
 * Canonical per-node fields entering planHash, exactly the docs/07 3.1
 * record. `deps` are sorted in the hash (not necessarily in state);
 * `checkpointRef`/`escalationRef` participate as absent when absent.
 */
export interface PlanNode {
  /** ULID minted inside plan.revision. */
  nodeId: NodeId;
  /** Lineage identity across rebirths (section 8, DEF-3). */
  logicalTaskId: LogicalTaskId;
  status: PlanNodeStatus;
  deps: NodeId[];
  waivedDeps: NodeId[];
  /** Set by park_task on a running node; the park lands at the turn boundary. */
  parkRequested: boolean;
  /** Set by cancel_task on a running node; the cancel lands via plan.decision. */
  cancelRequested: boolean;
  priority: number;
  promptSpecHash: string;
  checkpointRef?: EntryRef;
  escalationRef?: EntryRef;
}

/**
 * TaskPlan: typed data owned by the engine, never prose in a transcript
 * (docs/07, 3.1). The guard fold counters ride the same record because
 * they enter planHash (docs/07, 3.4): `revisionCount` counts journaled
 * plan.revision entries; `droppedRevisionStreak` counts consecutive
 * fully-dropped revisions (RevisionGuards, docs/07, 3.8).
 */
export interface TaskPlan {
  nodes: Readonly<Record<NodeId, PlanNode>>;
  revisionCount: number;
  droppedRevisionStreak: number;
}

/** The empty plan every fold starts from. */
export function emptyPlan(): TaskPlan {
  return { nodes: {}, revisionCount: 0, droppedRevisionStreak: 0 };
}

/**
 * Terminal statuses: no transition ever leaves them. `done` is immutable
 * because its result is paid for (docs/07, 3.6: cancel_task on done drops
 * with node_already_done); failed, cancelled, and skipped are equally
 * final per the conflict table's terminal_status rows.
 */
const TERMINAL_PLAN_STATUSES: ReadonlySet<PlanNodeStatus> = new Set([
  'done',
  'failed',
  'cancelled',
  'skipped',
]);

export function isTerminalPlanStatus(status: PlanNodeStatus): boolean {
  return TERMINAL_PLAN_STATUSES.has(status);
}

/**
 * Asserts one status transition against the closed machine. Op-level
 * legality (which ops may request which transitions in which state) is
 * the rebase conflict table's job (docs/07, 3.6; M7-T04); the machine
 * itself enforces exactly the structural rules:
 *
 * - nothing leaves a terminal status (`done` is immutable; failed,
 *   cancelled, skipped are final),
 * - `running` is entered only from `ready` (the engine schedules ready
 *   nodes; docs/07, 3.1),
 * - a transition never restates the current status (the engine writes no
 *   no-op set_node_status).
 *
 * A violation is an engine bug and raises the typed PlanInvariantError
 * (docs/07, 3.4: never a silent brick).
 */
export function assertPlanTransition(node: PlanNode, to: PlanNodeStatus): void {
  if (isTerminalPlanStatus(node.status)) {
    throw new PlanInvariantError(
      `plan node ${node.nodeId} is terminal '${node.status}' and cannot become '${to}' ` +
        "(docs/07, 3.1: the status machine is closed and 'done' is immutable)",
      { data: { nodeId: node.nodeId, from: node.status, to } },
    );
  }
  if (node.status === to) {
    throw new PlanInvariantError(
      `plan node ${node.nodeId} transition restates status '${to}' (no-op transitions are engine bugs)`,
      { data: { nodeId: node.nodeId, from: node.status, to } },
    );
  }
  if (to === 'running' && node.status !== 'ready') {
    throw new PlanInvariantError(
      `plan node ${node.nodeId} cannot start running from '${node.status}' ` +
        '(the engine schedules ready nodes only; docs/07, 3.1)',
      { data: { nodeId: node.nodeId, from: node.status, to } },
    );
  }
}

/**
 * Dependency satisfaction, derived purely in the fold and NEVER a record
 * (docs/07, 3.3): a dep is satisfied when waived or when its upstream
 * node is `done`. Terminally unsuccessful upstreams (cancelled, failed)
 * keep blocking: such edges "remain blocking" per the rewire_deps row of
 * the conflict table, and waive_dep exists exactly to unblock them.
 */
export function depsSatisfied(plan: TaskPlan, node: PlanNode): boolean {
  const waived = new Set(node.waivedDeps);
  return node.deps.every((dep) => waived.has(dep) || plan.nodes[dep]?.status === 'done');
}

/**
 * Recomputes the derived pending/ready boundary after a fold step: every
 * schedulable node (currently pending or ready) becomes `ready` when its
 * deps are satisfied and `pending` otherwise. rewire_deps may regress a
 * ready node to pending; upstream `done` transitions and waives promote
 * pending to ready. All other statuses are untouched. Returns the same
 * plan object when nothing changed, so fold steps stay cheap.
 */
export function recomputePlanReadiness(plan: TaskPlan): TaskPlan {
  let changed = false;
  const nodes: Record<NodeId, PlanNode> = {};
  for (const [nodeId, node] of Object.entries(plan.nodes)) {
    if (node.status !== 'pending' && node.status !== 'ready') {
      nodes[nodeId] = node;
      continue;
    }
    const next: PlanNodeStatus = depsSatisfied(plan, node) ? 'ready' : 'pending';
    if (next === node.status) {
      nodes[nodeId] = node;
      continue;
    }
    nodes[nodeId] = { ...node, status: next };
    changed = true;
  }
  return changed ? { ...plan, nodes } : plan;
}

/**
 * Cycle check for rewire_deps (docs/07, 3.6: a resulting cycle drops the
 * WHOLE op with dep_cycle; rewire_deps is atomic). Answers whether the
 * graph with `nodeId`'s deps replaced by `deps` contains a cycle
 * reachable from `nodeId`. add_task cannot create cycles (nothing depends
 * on a node that does not exist yet), so the check is rewire-only.
 */
export function wouldCreateDepCycle(
  plan: TaskPlan,
  nodeId: NodeId,
  deps: readonly NodeId[],
): boolean {
  const depsOf = (id: NodeId): readonly NodeId[] =>
    id === nodeId ? deps : (plan.nodes[id]?.deps ?? []);
  const visiting = new Set<NodeId>();
  const settled = new Set<NodeId>();
  const visit = (id: NodeId): boolean => {
    if (settled.has(id)) {
      return false;
    }
    if (visiting.has(id)) {
      return true;
    }
    visiting.add(id);
    for (const dep of depsOf(id)) {
      if (visit(dep)) {
        return true;
      }
    }
    visiting.delete(id);
    settled.add(id);
    return false;
  };
  return visit(nodeId);
}
