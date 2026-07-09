import { EntryRef, HashVersion, KeyDeriver, LogicalTaskId, NodeId } from "@lurker/core";

//#region src/plan-state.d.ts
/**
* The single sequential scope holding every plan-mutating entry, inside
* the orchestrator's run scope (docs/07, 3.2): total order = ordinal
* order = durable append order. Child node scopes are `plan/NodeId`
* (core `planNodeScope`; grammar in docs/03, section 2.1).
*/
declare const PLAN_SCOPE = "plan";
/** The closed status machine (docs/07, 3.1); `skipped` is fold-derived for entries but first-class for plan nodes. */
type PlanNodeStatus = "pending" | "ready" | "running" | "parked" | "escalated" | "done" | "failed" | "cancelled" | "skipped";
/**
* Canonical per-node fields entering planHash, exactly the docs/07 3.1
* record. `deps` are sorted in the hash (not necessarily in state);
* `checkpointRef`/`escalationRef` participate as absent when absent.
*/
interface PlanNode {
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
interface TaskPlan {
  nodes: Readonly<Record<NodeId, PlanNode>>;
  revisionCount: number;
  droppedRevisionStreak: number;
}
/** The empty plan every fold starts from. */
declare function emptyPlan(): TaskPlan;
declare function isTerminalPlanStatus(status: PlanNodeStatus): boolean;
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
declare function assertPlanTransition(node: PlanNode, to: PlanNodeStatus): void;
/**
* Dependency satisfaction, derived purely in the fold and NEVER a record
* (docs/07, 3.3): a dep is satisfied when waived or when its upstream
* node is `done`. Terminally unsuccessful upstreams (cancelled, failed)
* keep blocking: such edges "remain blocking" per the rewire_deps row of
* the conflict table, and waive_dep exists exactly to unblock them.
*/
declare function depsSatisfied(plan: TaskPlan, node: PlanNode): boolean;
/**
* Recomputes the derived pending/ready boundary after a fold step: every
* schedulable node (currently pending or ready) becomes `ready` when its
* deps are satisfied and `pending` otherwise. rewire_deps may regress a
* ready node to pending; upstream `done` transitions and waives promote
* pending to ready. All other statuses are untouched. Returns the same
* plan object when nothing changed, so fold steps stay cheap.
*/
declare function recomputePlanReadiness(plan: TaskPlan): TaskPlan;
/**
* Cycle check for rewire_deps (docs/07, 3.6: a resulting cycle drops the
* WHOLE op with dep_cycle; rewire_deps is atomic). Answers whether the
* graph with `nodeId`'s deps replaced by `deps` contains a cycle
* reachable from `nodeId`. add_task cannot create cycles (nothing depends
* on a node that does not exist yet), so the check is rewire-only.
*/
declare function wouldCreateDepCycle(plan: TaskPlan, nodeId: NodeId, deps: readonly NodeId[]): boolean;
//#endregion
//#region src/plan-hash.d.ts
/** The hashVersion whose profile computes planHash today. */
declare const PLAN_HASH_VERSION: HashVersion;
/**
* The canonical JSON projection of PlanState: nodes sorted by NodeId plus
* the guard fold counters, nothing else (docs/07, 3.4).
*/
declare function canonicalPlanState(plan: TaskPlan): Record<string, unknown>;
/**
* planHash under one deriver profile (default: the current hashVersion 2
* profile). Replay recomputes each entry's planHashAfter with the
* predicate of that entry's OWN hashVersion (docs/07, 3.4), so the
* deriver is a parameter, not an ambient.
*/
declare function planHash(plan: TaskPlan, deriver?: KeyDeriver): string;
/**
* The append-time head assertion (docs/07, 3.4): planHashBefore of the
* entry being appended MUST equal the current fold head. A failure is an
* engine bug and raises the typed PlanInvariantError; the run finishes
* with outcome error, never a silent brick.
*/
declare function assertPlanHead(plan: TaskPlan, expectedPlanHash: string, context?: {
  entryRef?: EntryRef;
  operation?: string;
}): void;
//#endregion
//#region src/write-lock.d.ts
/**
* PlanWriteLock (M7-T01): the in-process FIFO mutex serializing live
* appends to the sequential scope "plan".
*
* Owning spec: docs/07-adaptive-orchestration-spec.md, section 3.2
* (DEF-8, XF-07). The lock serializes ONLY plan-scope appends (acquire,
* read the fold head, evaluate, append, release); it MUST NOT substitute
* for resolution arbitration, which is owned by the ResolutionArbiter
* (docs/03, section "Suspension and resolutions (DEF-4)"). In queue mode
* the lease fencing epoch applies on top. Wall clock influences only
* WHICH order gets recorded live; replay reads the recorded order and
* never takes the lock.
*/
declare class PlanWriteLock {
  private tail;
  private held;
  /** True while a critical section is running (diagnostics only). */
  get isHeld(): boolean;
  /**
  * Runs `fn` exclusively, in strict acquisition (FIFO) order. The lock
  * releases on settlement either way; a rejection propagates to THIS
  * caller and never poisons later acquisitions.
  */
  runExclusive<T>(fn: () => Promise<T> | T): Promise<T>;
}
//#endregion
export { PLAN_HASH_VERSION, PLAN_SCOPE, PlanNode, PlanNodeStatus, PlanWriteLock, TaskPlan, assertPlanHead, assertPlanTransition, canonicalPlanState, depsSatisfied, emptyPlan, isTerminalPlanStatus, planHash, recomputePlanReadiness, wouldCreateDepCycle };