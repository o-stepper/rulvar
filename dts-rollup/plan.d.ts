import { AdmissionDecision, Engine, EntryRef, EscalationDecision, EscalationOptions, HashVersion, IsolationSpec, JournalEntry, Json, KeyDeriver, LineageStats, LogicalTaskId, NodeId, OrchestrateOptions, OrchestratorExtension, ReuseConfig, RunHandle, SchemaSpec, SpawnLineageOpt, TerminationAccountSnapshot, TerminationLimits, ToolDef, UsageLimits } from "@lurker/core";

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
//#region src/task-spec.d.ts
interface TaskSpec {
  /** Registered agent profile name; models are never named here. */
  agentType: string;
  prompt: string;
  /** Registered SchemaSpec name (docs/08); registry lands in M7-T05. */
  outputSchemaRef?: string;
  /** Registered tool profile name (docs/08); registry lands in M7-T05. */
  toolsetRef?: string;
  isolation?: IsolationSpec;
  usageLimits?: Partial<UsageLimits>;
  /** Clamped by childBudgetFraction at admission. */
  budgetUsd?: number;
  /** The ONLY model influence the orchestrator has (docs/07, 4.1). */
  model_hint?: {
    startTier: number;
  };
  /** Slug entering approachSig, at most 32 chars after normalization. */
  approach?: string;
  /** Absence means a new lineage root (docs/07, 8.1). */
  lineage?: SpawnLineageOpt;
  /** Default 'unclassified' (taskClass binding OQ, docs/14). */
  taskClass?: string;
  /** Absence means the child cannot escalate (docs/07, 6.4). */
  escalation?: EscalationOptions;
}
/** The amend_task patch form: every field optional (docs/07, 4.7). */
type TaskSpecPatch = Partial<TaskSpec>;
/**
* The deterministic spec digest entering PlanNode.promptSpecHash
* (docs/07, 3.1): the canonical JSON of the full TaskSpec through the
* frozen hashVersion 2 canonicalization. A plan-internal digest, not a
* kernel content key: the paid-call identity stays with the child's own
* spawn entry.
*/
declare function promptSpecHashOf(spec: TaskSpec): string;
/** Applies an amend_task patch onto a spec (undefined fields untouched). */
declare function applyTaskSpecPatch(spec: TaskSpec, patch: TaskSpecPatch): TaskSpec;
//#endregion
//#region src/plan-entries.d.ts
/** The orchestrator-facing PlanOp union (docs/07, 4.7). */
type PlanOp = {
  op: "add_task";
  spec: TaskSpec;
  deps?: NodeId[];
  priority?: number;
  lineage?: SpawnLineageOpt;
  approach?: string; /** Forbids reuse-by-reference for this addition (DEF-5). */
  fresh?: boolean;
} | {
  op: "amend_task";
  nodeId: NodeId;
  spec: TaskSpecPatch;
} | {
  op: "park_task";
  nodeId: NodeId;
} | {
  op: "unpark_task";
  nodeId: NodeId;
} | {
  op: "cancel_task";
  nodeId: NodeId;
  reason?: string;
} | {
  op: "reprioritize";
  nodeId: NodeId;
  priority: number;
} | {
  op: "rewire_deps";
  nodeId: NodeId;
  deps: NodeId[];
} | {
  op: "waive_dep";
  nodeId: NodeId;
  dep: NodeId;
};
/**
* Applied forms the fold consumes. cancel_task gains the engine-computed
* cascade (docs/07, 3.6: computed at apply time, never a parameter);
* park/cancel against running nodes apply as flag requests landing later
* via plan.decision (park-landed, cancel-landed).
*/
type AppliedPlanOp = (Extract<PlanOp, {
  op: "add_task";
}> & {
  nodeId: NodeId;
}) | Extract<PlanOp, {
  op: "amend_task";
}> | {
  op: "park_task";
  nodeId: NodeId;
  requestOnly?: boolean;
} | {
  op: "unpark_task";
  nodeId: NodeId;
  restart?: boolean;
} | {
  op: "cancel_task";
  nodeId: NodeId;
  reason?: string;
  requestOnly?: boolean;
  cascadeNodeIds?: NodeId[];
} | Extract<PlanOp, {
  op: "reprioritize";
}> | {
  op: "rewire_deps";
  nodeId: NodeId;
  deps: NodeId[];
} | Extract<PlanOp, {
  op: "waive_dep";
}>;
/** The complete machine reason vocabulary, normative and closed (docs/07, 3.5). */
type RebaseReasonCode = "admission_denied" | "node_already_done" | "dep_already_resolved" | "node_escalated" | "node_running" | "terminal_status" | "dep_cycle" | "already_parked" | "not_parked" | "no_such_dep" | "already_waived" | "bad_base" | "lineage_exhausted" | "lineage_busy" | "plan_frozen" | "checkpoint_discarded" | "reuse_by_reference" | "resolved_escalation" | "immediate_satisfaction";
type RebaseOutcome = {
  kind: "applied";
  op: AppliedPlanOp;
} | {
  kind: "transformed";
  requested: PlanOp;
  applied: AppliedPlanOp;
  reason: RebaseReasonCode;
} | {
  kind: "dropped";
  requested: PlanOp;
  reason: RebaseReasonCode;
  blockingRef?: EntryRef;
};
interface PlanSnapshotRef {
  /** Ordinal of the WakeDigest that plan_view is pinned to. */
  digestSeq: number;
  /** Plan hash recorded in that WakeDigest. */
  planHash: string;
}
interface PlanReviseRequest {
  /** Mandatory; the call is rejected without it (docs/07, 3.5). */
  base: PlanSnapshotRef;
  ops: PlanOp[];
  rationale: string;
}
/** The canonical result form (XF-11): DEF-8 shape plus the DEF-2 balance. */
interface PlanReviseResult {
  outcomes: RebaseOutcome[];
  assignedNodeIds: Record<number, NodeId>;
  planHashAfter: string;
  droppedAll: boolean;
  revisionUnitsRemaining: number;
}
type PlanReviseErrorCode = "revision_budget_exhausted" | RebaseReasonCode;
/** One embedded admission beside its op (docs/07, 3.3; DEF-2/DEF-3 folds read it). */
interface PlanRevisionAdmission {
  opIndex: number;
  nodeId?: NodeId;
  decision: AdmissionDecision;
  /** Reuse placement recorded beside a reuse_full/admit_graft verdict (DEF-5). */
  reuse?: {
    donorScope: string;
    chain: string[];
  };
}
/** The value payload of a plan.revision entry (docs/07, 3.3; XF-11). */
interface PlanRevisionValue {
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
  debits?: Array<{
    resource: string;
    logicalTaskId?: LogicalTaskId;
    balanceAfter: number;
  }>;
}
/** Engine authorship origins of plan.decision entries (docs/07, 3.3). */
type PlanDecisionOrigin = "escalation-default" | "escalation-class" | "escalation-live" | "no-progress" | "child-result" | "park-landed" | "cancel-landed";
/** The closed EnginePlanOp set (docs/07, 3.3). */
type EnginePlanOp = {
  kind: "set_node_status";
  nodeId: NodeId;
  from: PlanNodeStatus;
  to: PlanNodeStatus;
  cause: "child-result" | "no-progress" | "park-landed" | "cancel-landed";
  causeRef: EntryRef;
} | {
  kind: "resolve_escalation";
  nodeId: NodeId;
  decision: EscalationDecision;
  resolvedBy: "default" | "class" | "live" | "revision-transform";
  escalationRef: EntryRef;
} | {
  kind: "spawn_admitted";
  nodes: Array<{
    nodeId: NodeId;
    logicalTaskId: LogicalTaskId;
    spec: TaskSpec;
  }>;
  admission: AdmissionDecision;
};
/** The value payload of a plan.decision entry (docs/07, 3.3). */
interface PlanDecisionValue {
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
declare function planRevisionKey(base: PlanSnapshotRef, requestedOps: readonly PlanOp[]): string;
declare function planDecisionKey(origin: PlanDecisionOrigin, ops: readonly EnginePlanOp[], causeRef: EntryRef): string;
/**
* The working state the applier threads: the hashed TaskPlan plus the
* resolved spec table. Specs stay OUT of planHash by construction (the
* hashed projection is promptSpecHash per node, docs/07 3.1) but are
* themselves a pure fold of add_task specs, amend patches, and
* decomposition specs, so live and replay converge byte-identically.
*/
interface PlanWorking {
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
interface PlanFoldState extends PlanWorking {
  badBaseStreak: number;
  doneRefs: Record<NodeId, EntryRef>;
}
declare function emptyPlanFold(plan: TaskPlan): PlanFoldState;
/** The streak RevisionGuards consume (docs/07, 3.8). */
declare function effectiveDroppedStreak(state: PlanFoldState): number;
/**
* Applies ONE applied op to the working state. The applier consumes
* recorded outcomes; op-level legality was decided at rebase time and is
* never re-evaluated here. Exported for the rebase engine, which applies
* each op of a revision against the state already changed by the earlier
* applied ops of the same revision (docs/07, 3.5, step 3).
*/
declare function applyAppliedOp(working: PlanWorking, op: AppliedPlanOp, context: {
  seq: number;
  opIndex?: number;
  lineageOf?: (opIndex: number) => LogicalTaskId | undefined;
}): PlanWorking;
/** Reads a plan.revision entry's payload (tolerant of foreign journals). */
declare function readPlanRevision(entry: JournalEntry): PlanRevisionValue | undefined;
/** Reads a plan.decision entry's payload. */
declare function readPlanDecision(entry: JournalEntry): PlanDecisionValue | undefined;
/**
* THE single applier (docs/07, 3.2): folds one plan-scope entry into the
* state. Replay consumes recorded outcomes (the APPLIED diff), never
* re-runs rebase, and timers do not run; hash verification runs under
* the entry's own hashVersion profile.
*/
declare function applyPlanEntry(state: PlanFoldState, entry: JournalEntry, options?: {
  deriverFor?: (hashVersion: HashVersion) => KeyDeriver | undefined;
}): PlanFoldState;
/**
* The shared plan.decision applier core: engine authorship happens at
* the fold head under PlanWriteLock (docs/07, 3.3), so the producer can
* PREVIEW the resulting state (and its planHashAfter) before appending,
* and the fold re-applies the recorded ops identically on replay.
*/
declare function applyDecisionOps(state: Pick<PlanFoldState, "plan" | "specs" | "doneRefs">, ops: readonly EnginePlanOp[], seq: number): {
  plan: TaskPlan;
  specs: PlanWorking["specs"];
  doneRefs: Record<NodeId, EntryRef>;
};
//#endregion
//#region src/rebase.d.ts
/** The reuse-by-reference transform hook (DEF-5; M7-T07). */
interface ReuseTransform {
  applied: AppliedPlanOp;
  admission: AdmissionDecision;
  nodeId: NodeId;
  /** Donor placement recorded beside the verdict (docs/03, 9.5). */
  reuse: {
    donorScope: string;
    chain: string[];
  };
}
interface RebaseContext {
  /** The fold head (docs/07, 3.5 step 3). */
  state: PlanFoldState;
  /** The plan hash recorded in the WakeDigest the base references. */
  digestPlanHashFor: (digestSeq: number) => string | undefined;
  /** Engine NodeId minting (ULIDs; never the model). */
  mintNodeId: () => NodeId;
  /** The plan is frozen for adaptation by orchestrator_budget_cap (DEF-7). */
  frozen?: boolean;
  /** Embedded admission for add_task (docs/07, 3.6); absent admits nothing. */
  admitAdd?: (op: Extract<PlanOp, {
    op: "add_task";
  }>, nodeId: NodeId, opIndex: number) => AdmissionDecision;
  /** Embedded admission reserve for unpark_task (docs/07, 3.6). */
  admitUnpark?: (op: Extract<PlanOp, {
    op: "unpark_task";
  }>, node: PlanNode, opIndex: number) => AdmissionDecision;
  /** Lineage-at-head check for add_task lineage blocks (DEF-3). */
  lineageCheck?: (continues: LogicalTaskId) => "ok" | "lineage_busy" | "lineage_exhausted";
  /** Reuse-by-reference dedup at the fold head (DEF-5; M7-T07). */
  dedup?: (op: Extract<PlanOp, {
    op: "add_task";
  }>, opIndex: number) => ReuseTransform | undefined;
}
interface RebaseEvaluation {
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
declare function rebasePlanRevision(request: PlanReviseRequest, context: RebaseContext): RebaseEvaluation;
//#endregion
//#region src/guards.d.ts
/** RevisionGuards configuration (docs/07, 3.8). */
interface RevisionGuardsOptions {
  /** Default 'finish-with-partial'; the chain is non-HITL and terminating. */
  fallback?: "reject-revision" | "finish-with-partial" | "fail-run";
  /** Default 3 consecutive fully-dropped revisions. */
  droppedRevisionLimit?: number;
  /** Optional netLostUsd trigger as a fraction of the starting budget (DEF-5). */
  maxAbandonedNetUsdFraction?: number;
}
type GuardFallback = NonNullable<RevisionGuardsOptions["fallback"]>;
/** The journaled guard verdict payload (kind 'decision'). */
interface GuardVerdictValue {
  decisionType: "guard-verdict";
  guard: "dropped-revision-streak" | "oscillation-freeze" | "stall-replan-cap" | "net-lost";
  fallback: GuardFallback | "freeze-key";
  /** The streak at trip time (dropped-revision-streak). */
  streak?: number;
  /** The frozen coarse signature (oscillation-freeze). */
  approachSigCoarse?: string;
  oscillationCount?: number;
  /** The capped counter (stall-replan-cap). */
  stallReplans?: number;
  netLostUsd?: number;
}
/** Appendix A: osc_guard reject threshold per key (shared default). */
declare const DEFAULT_MAX_OSCILLATIONS_PER_KEY = 2;
/** The hard per-run stall replan bound (docs/07, 9.3). */
declare const DEFAULT_STALL_REPLAN_CAP = 4;
declare const DEFAULT_DROPPED_REVISION_LIMIT = 3;
interface GuardsState {
  /** The engaged terminating fallback, once tripped (single-shot). */
  engaged?: GuardFallback;
  /** Coarse signatures whose re-adds are frozen. */
  frozenSignatures: ReadonlySet<string>;
  stallReplansUsed: number;
}
/**
* The guard state machine. All counting inputs arrive from pure folds
* (the caller feeds landed revisions, severs, and re-adds in journal
* order), so live and replay converge on identical verdicts; the caller
* journals each verdict BEFORE applying its effects.
*/
declare class RevisionGuards {
  private readonly fallback;
  private readonly droppedRevisionLimit;
  private readonly maxOscillationsPerKey;
  private readonly stallReplanCap;
  private engaged?;
  /** Severed (cancelled/abandoned) spend per coarse signature. */
  private readonly severedSignatures;
  /** Oscillation counts per coarse signature, across LTID boundaries. */
  private readonly oscillations;
  private readonly frozen;
  private stallReplans;
  constructor(options?: RevisionGuardsOptions & {
    maxOscillationsPerKey?: number;
    stallReplanCap?: number;
  });
  get state(): GuardsState;
  /** True once a terminating fallback engaged: the plan is frozen for adaptation. */
  get planFrozen(): boolean;
  /** True when further plan_revise calls are rejected outright. */
  get revisionsRejected(): boolean;
  /**
  * Feeds one landed revision's effective streak; returns the verdict to
  * journal when the limit is reached (single-shot).
  */
  onRevisionLanded(effectiveDroppedStreak: number): GuardVerdictValue | undefined;
  /** Feeds a severing cancel/abandon of a node with this coarse signature. */
  onSevered(approachSigCoarse: string): void;
  /**
  * Feeds one admitted add of this coarse signature; a re-add after a
  * sever counts one oscillation ACROSS LTID boundaries. Returns the
  * freeze verdict to journal when the per-key limit is reached.
  */
  onReAdd(approachSigCoarse: string): GuardVerdictValue | undefined;
  /** True when further re-adds of this coarse signature are frozen. */
  isFrozenSignature(approachSigCoarse: string): boolean;
  oscillationCountOf(approachSigCoarse: string): number;
  /**
  * Consumes one stall-triggered replan slot; returns the cap verdict
  * when the hard per-run bound is exhausted (single-shot per call site).
  */
  onStallReplan(): GuardVerdictValue | undefined;
  get stallReplanExhausted(): boolean;
  /** Rebuilds guard state from a journaled verdict (replay path). */
  absorbVerdict(value: GuardVerdictValue): void;
  /** Serializes a verdict for the journal append. */
  static verdictJson(value: GuardVerdictValue): Json;
}
//#endregion
//#region src/tools.d.ts
/** docs/07, 4.6: plan_view takes no parameters. */
declare const PLAN_VIEW_SCHEMA: SchemaSpec;
/** docs/07, 4.7: the plan_revise parameter schema (normative). */
declare const PLAN_REVISE_SCHEMA: SchemaSpec;
declare const PLAN_VIEW_TOOL_NAME = "plan_view";
declare const PLAN_REVISE_TOOL_NAME = "plan_revise";
/** One rendered node of the pinned plan_view fold. */
interface PlanViewNode {
  nodeId: NodeId;
  logicalTaskId: string;
  status: PlanNodeStatus;
  deps: NodeId[];
  waivedDeps: NodeId[];
  priority: number;
  lineage?: LineageStats;
}
/** The plan_view render (docs/07, 4.6): plan state, lineage, termination, reuse. */
interface PlanViewRender {
  planHash: string;
  revisionCount: number;
  droppedRevisionStreak: number;
  nodes: PlanViewNode[];
  termination: TerminationAccountSnapshot;
  /** The abandoned-spend ledger (DEF-5); zeros until M7-T07 activates it. */
  abandonedSpend: {
    abandonedUsd: number;
    reclaimedUsd: number;
    netLostUsd: number;
  };
  /** RevisionGuards state (docs/07, 3.8; M7-T06). */
  guards?: {
    engaged?: "reject-revision" | "finish-with-partial" | "fail-run";
    frozenSignatures: string[];
    stallReplansUsed: number;
  };
}
/** The engine seam the plan tools close over. */
interface PlanToolRuntime {
  planView(): PlanViewRender;
  planRevise(request: PlanReviseRequest): Promise<PlanReviseResult>;
}
/** Builds the PlanRunner tools (appended to the mode (c) toolset). */
declare function buildPlanTools(runtime: PlanToolRuntime): ToolDef[];
//#endregion
//#region src/plan-runner.d.ts
/** docs/07, 3.8. */
interface PlanRunnerOptions {
  /** Absolute, non-replenishable; default 32 (DEF-2). */
  maxRevisionsPerRun?: number;
  guards?: RevisionGuardsOptions;
  /** Out-of-vocabulary tags get a typed tool error with bounded re-prompt (DEF-3). */
  approachVocabulary?: string[];
  /** Reuse-by-reference configuration (DEF-5; docs/03, 9.9). */
  reuse?: ReuseConfig;
  /** Frozen termination knobs beyond the revision budget (DEF-2). */
  limits?: Partial<Pick<TerminationLimits, "maxTotalSpawns" | "maxEscalationsPerLogicalTask" | "maxDepth">>;
}
/**
* Builds the PlanRunner orchestrator extension (docs/07, section 3).
* Attach via `orchestrate(engine, goal, { extension: planRunner(o) })` or
* the `orchestratePlanned` convenience surface.
*/
declare function planRunner(options?: PlanRunnerOptions): OrchestratorExtension;
/** The PlanRunner entry surface: mode (c) plus the extension in one call. */
declare function orchestratePlanned(engine: Engine, goal: string, opts?: OrchestrateOptions & {
  plan?: PlanRunnerOptions;
}): RunHandle<unknown>;
//#endregion
export { AppliedPlanOp, DEFAULT_DROPPED_REVISION_LIMIT, DEFAULT_MAX_OSCILLATIONS_PER_KEY, DEFAULT_STALL_REPLAN_CAP, EnginePlanOp, GuardFallback, GuardVerdictValue, GuardsState, PLAN_HASH_VERSION, PLAN_REVISE_SCHEMA, PLAN_REVISE_TOOL_NAME, PLAN_SCOPE, PLAN_VIEW_SCHEMA, PLAN_VIEW_TOOL_NAME, PlanDecisionOrigin, PlanDecisionValue, PlanFoldState, PlanNode, PlanNodeStatus, PlanOp, PlanReviseErrorCode, PlanReviseRequest, PlanReviseResult, PlanRevisionAdmission, PlanRevisionValue, PlanRunnerOptions, PlanSnapshotRef, PlanToolRuntime, PlanViewNode, PlanViewRender, PlanWorking, PlanWriteLock, RebaseContext, RebaseEvaluation, RebaseOutcome, RebaseReasonCode, ReuseTransform, RevisionGuards, RevisionGuardsOptions, TaskPlan, TaskSpec, TaskSpecPatch, applyAppliedOp, applyDecisionOps, applyPlanEntry, applyTaskSpecPatch, assertPlanHead, assertPlanTransition, buildPlanTools, canonicalPlanState, depsSatisfied, effectiveDroppedStreak, emptyPlan, emptyPlanFold, isTerminalPlanStatus, orchestratePlanned, planDecisionKey, planHash, planRevisionKey, planRunner, promptSpecHashOf, readPlanDecision, readPlanRevision, rebasePlanRevision, recomputePlanReadiness, wouldCreateDepCycle };