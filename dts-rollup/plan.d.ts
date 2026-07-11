import { AdmissionDecision, AgentResult, CanonicalLadderSpec, ChatRequest, Effort, Engine, EntryRef, EscalationDecision, EscalationOptions, HashVersion, IsolationSpec, JournalEntry, JournalStore, Json, KeyDeriver, LadderSpec, LeasableStore, LineageStats, LogicalTaskId, NodeId, OrchestrateOptions, OrchestratorExtension, ProviderAdapter, ReuseConfig, RunHandle, SchemaSpec, SpawnLineageOpt, TerminationAccountSnapshot, TerminationLimits, ToolDef, TriggerClass, UsageLimits, WireError } from "@rulvar/core";

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
  causeRef: EntryRef; /** The retained checkpoint anchor recorded at park landing (M7-T08). */
  checkpointRef?: EntryRef;
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
//#region src/park.d.ts
/** Appendix A: the single pin cap shared by park/unpark and retainWorktree. */
declare const DEFAULT_MAX_PINNED_WORKTREES = 4;
/**
* The worktree pin ledger: a pure fold counting live pins from abandon
* entries carrying `retainWorktree: true` (park pinning and DEF-5
* retention share the cap by construction; docs/08).
*/
declare class PinLedger {
  private readonly pinnedTargets;
  private readonly byNode;
  static fold(entries: readonly JournalEntry[]): PinLedger;
  get count(): number;
  hasCapacity(maxPinnedWorktrees?: number): boolean;
  isPinnedNode(nodeId: string): boolean;
}
/** The park disposition computed at landing time (docs/03, 11.2). */
interface ParkDisposition {
  /** Checkpoints are always retained on park. */
  retainCheckpoint: true;
  /** True only for worktree isolation with pin capacity left. */
  retainWorktree: boolean;
}
declare function parkDispositionOf(isolation: IsolationSpec | undefined, pins: PinLedger, maxPinnedWorktrees?: number): ParkDisposition;
/** The unpark placement (docs/03, 11.2): continuation or restart. */
interface UnparkPlacement {
  /** True when the agent must restart (no checkpoint, or tree dropped). */
  restart: boolean;
  /** The retained checkpoint the continuation boots from. */
  bootCheckpointRef?: string;
}
declare function unparkPlacementOf(input: {
  /** The parked node's recorded checkpoint anchor (root dispatch seq). */checkpointRef?: number; /** The retained transcript ref derived from the anchor, when any. */
  transcriptRef?: string;
  isolation?: IsolationSpec;
  worktreePinned: boolean;
}): UnparkPlacement;
//#endregion
//#region src/ledger.d.ts
/** The CLOSED authored op vocabulary (docs/07, 9.2). */
type LedgerOp = {
  op: "brief_set";
  text: string;
} | {
  op: "fact_add";
  factId: string;
  text: string;
  provenance: EntryRef[];
  confidence: "low" | "medium" | "high";
} | {
  op: "fact_supersede";
  factId: string;
  supersededBy: string;
  text: string;
  provenance: EntryRef[];
  confidence: "low" | "medium" | "high";
} | {
  op: "lesson_add";
  key: {
    logicalTaskId: LogicalTaskId;
    approachSig: string;
  };
  text: string;
} | {
  op: "observation_add";
  taskClass: string;
  logicalTaskId: LogicalTaskId;
  tierObserved?: number;
  outcomeClass?: string;
  note: string;
  evidenceRefs: EntryRef[];
};
/** Appendix A per-section caps. */
declare const LEDGER_SECTION_CAPS: {
  readonly facts: 64;
  readonly lessons: 32;
  readonly observations: 16;
};
/** The content key of one authored op (ordinal distinguishes repeats). */
declare function ledgerOpKey(op: LedgerOp): string;
interface LedgerFact {
  factId: string;
  text: string;
  provenance: EntryRef[];
  confidence: "low" | "medium" | "high";
  supersededBy?: string;
  entryRef: EntryRef;
}
interface LedgerLesson {
  key: {
    logicalTaskId: LogicalTaskId;
    approachSig: string;
  };
  text: string;
  entryRef: EntryRef;
}
interface LedgerObservation {
  taskClass: string;
  logicalTaskId: LogicalTaskId;
  tierObserved?: number;
  outcomeClass?: string;
  note: string;
  evidenceRefs: EntryRef[];
  entryRef: EntryRef;
}
/** One auto-derived revision history row (fold join, never authored). */
interface LedgerRevisionRow {
  entryRef: EntryRef;
  rationale: string;
  applied: number;
  dropped: number;
}
/** The pure ledger fold (docs/07, 9.3). */
interface LedgerView {
  brief?: {
    text: string;
    entryRef: EntryRef;
  };
  facts: LedgerFact[];
  lessons: LedgerLesson[];
  observations: LedgerObservation[];
  /** Auto-derived: plan revision history with rationale. */
  revisionHistory: LedgerRevisionRow[];
  /** Auto-derived: task digests ordered by spawn ordinal (root seq). */
  taskDigests: Array<{
    nodeId?: string;
    scope: string;
    status: string;
    entryRef: EntryRef;
  }>;
  /** Auto-derived: the world-delta index from terminal artifacts. */
  worldDelta: Array<{
    scope: string;
    entryRef: EntryRef;
    artifacts: number;
  }>;
  /** Journal-vs-ledger contradictions, flagged and never resolved here. */
  discrepancies: string[];
}
/** Fold every ledger.op plus the auto-derived joins up to `uptoSeq`. */
declare function foldLedger(entries: readonly JournalEntry[], options?: {
  ledgerScope?: string;
  planScope?: string;
  uptoSeq?: number;
}): LedgerView;
/**
* The committed ledger_read render budget (docs/06, Appendix A: 65536
* chars over the serialized view, the character measure; OQ-04 closed
* at M10 entry). The section caps stay the primary bound; under the
* default termination limits this belt never engages.
*/
declare const LEDGER_RENDER_BUDGET_CHARS = 65536;
/**
* Deterministic render bound (docs/07, 9.3): over budget, rows drop
* oldest-first, auto-derived joins before authored sections, and the
* mission brief slices last; every drop is a FLAGGED discrepancy line.
* A pure function of (view, budget): a re-executed wake turn renders
* byte-identical bounded bytes from the same pinned fold.
*/
declare function boundLedgerRender(view: LedgerView, budgetChars?: number): LedgerView;
/** Section-cap check for one authored op (docs/06, Appendix A). */
declare function ledgerCapViolation(view: LedgerView, op: LedgerOp): string | undefined;
/**
* Compaction sufficiency (docs/07, 9.3): the orchestrate role may
* compact aggressively only when the ledger measurably suffices (at
* least one authored revision recorded and a minimum fact count);
* otherwise the engine falls back to conservative summarize.
*/
declare function ledgerSufficiency(view: LedgerView, minimumFacts?: number): boolean;
/** The draft-versioned outward seam (docs/07, 9.3; OQ in docs/14). */
interface LedgerExport {
  ledgerExportVersion: "draft-1";
  brief?: string;
  facts: Array<Omit<LedgerFact, "entryRef">>;
  lessons: Array<Omit<LedgerLesson, "entryRef">>;
  observations: Array<Omit<LedgerObservation, "entryRef">>;
  revisionHistory: LedgerRevisionRow[];
}
declare function exportLedger(view: LedgerView): LedgerExport;
//#endregion
//#region src/ladder.d.ts
/**
* Extracts the declared ladder from an agent profile: the ModelSpec union
* carries it (`model: { ladder }`), or the loop-role routing entry
* (docs/04, section 12). The same declaration points feed ladderLengthOf
* and the frozen kMax, so admission and execution can never disagree on
* the ladder length.
*/
declare function ladderOfProfile(profile: unknown): LadderSpec | undefined;
/** The profile's chain effort feeding canonicalization, when declared. */
declare function chainEffortOf(profile: unknown): Effort | undefined;
/** Canonicalizes the profile's declared ladder once per dispatch site. */
declare function canonicalLadderOf(profile: unknown): CanonicalLadderSpec | undefined;
/**
* Clamps the orchestrator's `model_hint.startTier` to the declared ladder
* (docs/07, section 4.2): the hint is the ONLY model influence the
* orchestrator has, and it never names a model.
*/
declare function clampStartTier(ladder: CanonicalLadderSpec, hint?: number): number;
/**
* The rung an attempt executes on: the clamped start tier plus the
* journaled raise count, hard-clamped at the top rung. `rungIndex` per
* lineage is strictly monotone; there are no demotions (docs/07, 10).
*/
declare function executingRungOf(ladder: CanonicalLadderSpec, startTier: number, raises: number): number;
/**
* Classifies a settled attempt into the typed transition trigger
* (docs/04, section 12): schema-mismatch errors are 'schema-exhausted';
* the engine's no-progress abort is first-class 'no-progress' (it rides
* status 'limit' with the dedicated abort class, distinct from user
* cancellation by construction); cancelled, escalated, and skipped never
* trigger. 'verify-failed' comes from the acceptance gates, never from
* the terminal status.
*/
declare function ladderTriggerOf(settled: Pick<AgentResult<unknown>, "status"> & {
  error?: {
    kind?: string;
  };
  abortClass?: string;
}): Exclude<TriggerClass, "verify-failed"> | undefined;
/** One journaled acceptance-gate evaluation (docs/07, section 10). */
interface GateVerdictValue {
  decisionType: "gate-verdict";
  logicalTaskId: LogicalTaskId;
  nodeId: string;
  /** The judged attempt's root dispatch seq. */
  attemptRef: EntryRef;
  gate: "mechanical" | "judge" | "spot-check";
  /** The registered profile name (mechanical gates). */
  profile?: string;
  /** The executing rung of the judged attempt. */
  rung: number;
  pass: boolean;
  detail?: string;
  /** Spot-check only: the journaled draw and fraction behind `pass`. */
  spotCheck?: {
    draw: number;
    fraction: number;
    selected: boolean;
  };
}
/** Content key of one gate verdict: attempt plus gate position. */
declare function gateVerdictKey(attemptRef: EntryRef, gateIndex: number): string;
/**
* The ladder verdict decision entry (docs/07, sections 10 and 11.3): the
* producer contract both folds already consume. A RAISING verdict debits
* one rung unit (rungIndexAfter/rungsRemainingAfter embedded, checked by
* foldTermination) and carries the rung RESPAWN's embedded admission
* (spawn debit) plus `nextAttempt` (the lineage registration: relation
* 'rung-retry', docs/03 10.1 row 4). A non-raising verdict records the
* ladder's end (exhausted rungs, top rung, or a denied respawn) and
* authorizes nothing.
*/
interface LadderVerdictValue {
  decisionType: "ladder-verdict";
  logicalTaskId: LogicalTaskId;
  nodeId: string;
  trigger: TriggerClass;
  /** The judged attempt's root dispatch seq. */
  attemptRef: EntryRef;
  raisesRung: boolean;
  rungIndexAfter?: number;
  rungsRemainingAfter?: number;
  /** Present exactly when raising: the authorized next rung attempt. */
  nextAttempt?: {
    childScope: string; /** The full admission-computed lineage block (registerAttempt input). */
    lineage: Json; /** The concrete rung the next attempt executes on. */
    rungIndex: number;
  };
  /** The embedded respawn admission (the spawn debit; docs/07, 11.3 b). */
  admissions?: Json[];
  /** Non-raising verdicts: why the ladder ended here. */
  reason?: "rungs_exhausted" | "top_rung" | "respawn_denied" | "trigger_not_declared";
}
/** Content key of one ladder verdict: the judged attempt is unique. */
declare function ladderVerdictKey(attemptRef: EntryRef): string;
/** The forced verdict schema of the judge gate (docs/07, section 10). */
declare const JUDGE_VERDICT_SCHEMA: {
  readonly type: "object";
  readonly properties: {
    readonly pass: {
      readonly type: "boolean";
    };
    readonly reason: {
      readonly type: "string";
    };
  };
  readonly required: readonly ["pass", "reason"];
  readonly additionalProperties: false;
};
/**
* The judge prompt: artifact-grounded, assembled from journaled values
* only (the attempt's output summary and artifact index), so a replayed
* judge dispatch hashes identically.
*/
declare function judgePrompt(input: {
  taskPrompt: string;
  outputSummary: string;
  artifactIds: readonly string[];
}): string;
//#endregion
//#region src/escalation.d.ts
/** One per-lineage debit row of a class-level decision (docs/07, 6.5). */
interface EscalationDebitRow {
  logicalTaskId: LogicalTaskId;
  escalationUnitsAfter: number;
}
/**
* The authoritative escalation-decision entry value (docs/07, 6.5; the
* producer contract of LineageIndex and foldTermination). Exactly one
* such entry per report; the debit is atomic with the append and the
* balance-after is embedded (DEF-2). A decision whose counting debit was
* DENIED carries `countsAgainstLimit: false` plus `capExceeded: true`:
* the termination.denied entry written strictly before is the counting
* record, and the folds stay replay-strict.
*/
interface EscalationDecisionValue {
  decisionType: "escalation-decision";
  /** Single-target form; the class form carries `debits` instead. */
  logicalTaskId?: LogicalTaskId;
  nodeId?: string;
  decision: EscalationDecision;
  /** Seq of the terminal escalated entry or the suspended escalate entry. */
  reportRef: EntryRef;
  countsAgainstLimit: boolean;
  /** Present exactly when a counting debit executed (fold-asserted). */
  escalationUnitsAfter?: number;
  /** How the decision was reached (docs/07, 3.3 plan.decision origins). */
  resolvedBy: "default" | "class" | "live" | "revision-transform";
  /** Class-level form: one entry, an array of per-lineage debits. */
  debits?: EscalationDebitRow[];
  /** Decomposition admissions (spawn debits ride this entry; 11.3 b). */
  admissions?: Json[];
  /** The counting debit was denied: the cap is the message (docs/07, 6.5). */
  capExceeded?: boolean;
}
/** Content key: one authoritative decision per report (decide-once). */
declare function escalationDecisionKey(reportRef: EntryRef): string;
/** Maps a resolution `by` value onto the decision's resolvedBy field. */
declare function resolvedByOf(by: string): "default" | "class" | "live";
/** The plan.decision origin of one resolvedBy value (docs/07, 3.3). */
declare function decisionOriginOf(resolvedBy: "default" | "class" | "live" | "revision-transform"): "escalation-default" | "escalation-class" | "escalation-live";
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
//#region src/cassettes.d.ts
/** One normalized-cassette fixture file (cassettes/<id>.json). */
interface M7CassetteFixture {
  id: string;
  note: string;
  entries: JournalEntry[];
}
/**
* Normalizes one journal for cassette comparison: ULIDs and sha256
* strings map to first-appearance placeholders; wall clock, spans, and
* transcript refs collapse to fixtures. Deterministic given a
* deterministic entry stream.
*/
declare function normalizeAdaptiveJournal(entries: readonly JournalEntry[]): JournalEntry[];
/** A minimal scripted adapter over the PUBLIC provider SPI. */
interface CassetteTurn {
  text?: string;
  toolCall?: {
    name: string;
    args: unknown;
  };
  hangUntilAborted?: boolean;
  /** Await this promise before emitting (cross-agent sequencing). */
  awaitPromise?: Promise<void>;
  /** The stream terminates with this typed wire error (M9 DEF-2/3 rows). */
  wireError?: WireError;
}
declare function cassetteAdapter(script: (req: ChatRequest) => CassetteTurn): ProviderAdapter & {
  calls: ChatRequest[];
};
declare function agentTypeOfRequest(req: ChatRequest): string;
declare const EMPTY_PLAN_HASH: string;
declare function engineWith(adapter: ProviderAdapter, store: JournalStore, profiles: Record<string, unknown>, extras?: {
  schemas?: Record<string, unknown>;
  lineage?: Record<string, number>;
  isolation?: unknown; /** ModelKnowledge store for the M10 kb cassettes (docs/05). */
  knowledge?: unknown;
}): Engine;
declare const BUDGET: {
  readonly capUsd: 5;
  readonly finalizeReserveUsd: 1;
};
declare function settled(handle: RunHandle<unknown>): Promise<void>;
/**
* revise-mid-run: a plan revision arrives while a worker subtree is
* mid-flight (docs/09 round-2). The first worker HANGS until the
* revision cancels it; the added replacement completes.
*/
declare function runReviseMidRun(): Promise<JournalEntry[]>;
/**
* crash-during-revision: process death INSIDE the revision window, at
* the pre-append kill point (docs/09 round-2): life 1 is truncated
* strictly BEFORE the second plan.revision entry; life 2 re-issues the
* revision live and rolls its effects forward.
*/
declare function runCrashDuringRevision(): Promise<JournalEntry[]>;
/**
* oscillation-freeze: the coarse-signature oscillation detector freezes
* further re-adds under hysteresis (docs/09 round-2; distinct from the
* per-key osc_guard reject).
*/
declare function runOscillationFreeze(options?: PlanRunnerOptions): Promise<JournalEntry[]>;
/**
* park-unpark: park of a running node with checkpoint retention, later
* unpark and continuation (docs/09 round-2; docs/03 11.2). The worker
* pays one tool turn, hangs in its second, parks at the boundary, and
* the unparked continuation resumes from the retained checkpoint (the
* booted history carries the paid turn).
*/
declare function runParkUnpark(): Promise<JournalEntry[]>;
/**
* half-escalated-ladder: some rungs terminal, the active rung dangling
* mid-attempt at the crash; resume continues the ladder without
* repaying completed rungs (docs/09 round-2).
*/
declare function runHalfEscalatedLadder(): Promise<JournalEntry[]>;
/**
* budget-denied-rung: the budget guard denies the rung respawn; the
* denial journals as termination.denied strictly before the verdict and
* the ladder takes its declared fallback path (docs/09 round-2).
*/
declare function runBudgetDeniedRung(): Promise<JournalEntry[]>;
/**
* cap-freeze-then-finish (DEF-7): the soft boundary crossed with live
* children; the cap decision precedes its effects; admitted nodes run to
* completion; the final quiescence wake gets the finish-only toolset;
* outcome ok with forcedFinish (docs/09).
*/
declare function runCapFreezeThenFinish(): Promise<JournalEntry[]>;
/**
* crash-between-cap-and-effects (DEF-7): process death right after the
* cap decision entry, before any of its effects; resume re-derives the
* frozen state from the entry and rolls the forced finish forward.
*/
declare function runCrashBetweenCapAndEffects(): Promise<JournalEntry[]>;
/**
* finalize-fallback-synthesized (DEF-7): the final finish fails inside
* its turn limit; the engine journals orchestrator_finalize_fallback and
* synthesizes the deterministic partial by pure fold; outcome exhausted
* with the non-null value.
*/
declare function runFinalizeFallbackSynthesized(): Promise<JournalEntry[]>;
/**
* escalation-storm-frozen (DEF-7 set): three Flavor B escalations while
* the plan is frozen at the cap; each resolves through its journaled
* defaultDecision and the lineage counters hold. The branches CHAIN via
* dependencies so exactly one deadline timer is live at a time: the
* journal byte order stays deterministic (DEF-4 already guarantees the
* fold; the cassette asserts bytes).
*/
declare function runEscalationStormFrozen(): Promise<JournalEntry[]>;
/**
* revision-exhaustion (DEF-2): the absolute revision budget hits zero;
* termination.denied precedes the typed error; the guards chain closes
* the run without HITL.
*/
declare function runRevisionExhaustion(): Promise<JournalEntry[]>;
/**
* rung-retry-lineage (DEF-3): the ladder raise continues the SAME
* logical task with relation rung-retry; attemptsUsed counts both rungs.
*/
declare function runRungRetryLineage(): Promise<JournalEntry[]>;
/**
* decompose-mints-children (DEF-3): an escalation decomposition mints
* FRESH logical tasks inside the decision entry; the spawn debits ride
* the same entry (docs/07, 8.1 rule 6, 11.3 b).
*/
declare function runDecomposeMintsChildren(): Promise<JournalEntry[]>;
/**
* queue-failover-during-forced-finish (the DEF-7 final cassette;
* docs/09, section 6.9; M8-T03): worker A loses its lease strictly
* between the cap decision and the final wake; worker B reclaims with a
* bumped fencing epoch and rolls the forced finish forward. The stale
* writer's appends are rejected and invisible, exactly one cap decision
* exists, and finalization is paid once.
*
* The LeasableStore is INJECTED so this package stays core-only: the
* replay test and the record script supply the reference SqliteStore
* (docs/03, 12.6). One deterministic clock drives lease expiry.
*/
interface QueueFailoverDeps {
  /** A fresh LeasableStore over the injected clock (SqliteStore ':memory:' in the suite). */
  makeStore: (now: () => number) => JournalStore & LeasableStore;
}
declare function runQueueFailoverDuringForcedFinish(deps: QueueFailoverDeps): Promise<JournalEntry[]>;
//#endregion
//#region src/tools.d.ts
/** docs/07, 4.6: plan_view takes no parameters. */
declare const PLAN_VIEW_SCHEMA: SchemaSpec;
/** docs/07, 4.7: the plan_revise parameter schema (normative). */
declare const PLAN_REVISE_SCHEMA: SchemaSpec;
declare const PLAN_VIEW_TOOL_NAME = "plan_view";
declare const PLAN_REVISE_TOOL_NAME = "plan_revise";
declare const LEDGER_APPEND_TOOL_NAME = "ledger_append";
declare const LEDGER_READ_TOOL_NAME = "ledger_read";
/** The closed authored op vocabulary as JSON Schema (docs/07, 9.2). */
declare const LEDGER_APPEND_SCHEMA: SchemaSpec;
/** docs/07: ledger_read takes no parameters and pins to the turn snapshot. */
declare const LEDGER_READ_SCHEMA: SchemaSpec;
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
  ledgerAppend(op: LedgerOp): Promise<{
    entryRef: number;
  }>;
  ledgerRead(): LedgerView;
}
/** Builds the PlanRunner tools (appended to the mode (c) toolset). */
declare function buildPlanTools(runtime: PlanToolRuntime): ToolDef[];
//#endregion
//#region src/m9-cassettes.d.ts
/**
* combined-loop-descent (DEF-2): a verify-failed gate raises the ladder
* rung; the raised rung hits its turn limit at the top (trigger 'limit')
* and the node fails; the failure wakes a replan that decomposes the
* work into two depth-1 children; one child completes and the other
* escalates until its escalationUnits deny; Phi strictly decreases on
* every debiting entry and matches the embedded balances.
*/
declare function runCombinedLoopDescent(): Promise<JournalEntry[]>;
/**
* config-drift-resume (DEF-2): life 1 runs under maxRevisionsPerRun 2
* and crashes at the pre-append kill point of its second revision; life
* 2 resumes with the knob DOUBLED. Balances continue from the journaled
* termination.init (the live config is ignored), a
* termination:config-drift event fires, and nothing is repaid.
*/
declare function runConfigDriftResume(): Promise<JournalEntry[]>;
/**
* class-storm-single-turn (DEF-2): five dependency-chained workers each
* escalate (Flavor A); the orchestrator resolves all five in ONE
* revision; the class-level decision carries five per-lineage debits in
* one entry. Store-independence (identical fold on JSONL and SQLite) is
* asserted by the replay suite over the frozen bytes.
*/
declare function runClassStormSingleTurn(): Promise<JournalEntry[]>;
/**
* race-timeout-vs-live (DEF-2): a Flavor B deadline resolution and a
* live class decision race on one suspension; first-wins applies the
* timeout, the live attempt lands as a noop, and exactly ONE
* escalationUnits debit exists. Store-independence is asserted by the
* replay suite.
*/
declare function runRaceTimeoutVsLive(): Promise<JournalEntry[]>;
/**
* respawn-preserves-counter (DEF-3): the worker escalates, the
* orchestrator respawns the SAME logical task with an amended prompt
* (new content key, same LTID) twice; the third escalation exceeds
* maxEscalationsPerLogicalTask, is denied on escalationUnits, and the
* run closes through the non-HITL fallback with identical verdicts and
* statsBefore on replay.
*/
declare function runRespawnPreservesCounter(): Promise<JournalEntry[]>;
/**
* reworded-lessons-collide (DEF-3): two attempts of one LTID whose
* prompts differ but whose signature inputs are identical and share the
* 'binary-search' tag; the engine computes equal approachSig values,
* lesson_add keys once, and plan_view groups both attempts into one
* approach.
*/
declare function runRewordedLessonsCollide(): Promise<JournalEntry[]>;
/**
* oscillation-bounded (DEF-2): an escalated branch is cancelled and
* re-added byte-identically twice; every plan_revise call debits one
* revisionUnit (including the drop on the linked done node), each link
* debits one spawnUnit, the worker is paid exactly once, and the
* lineage counters never reset.
*/
declare function runOscillationBounded(): Promise<JournalEntry[]>;
/**
* stall-streak-classes-and-pinning (DEF-3): four attempts of one LTID
* land transient-error, task-error, no-progress, and ok; the pinned
* admission snapshots show stallStreak 0, 1, 2 and the post-ok pinned
* view shows 0; a wake turn re-executed after a crash reads the SAME
* LineageStats from its snapshot, not a fresh fold.
*/
declare function runStallStreakClassesAndPinning(): Promise<JournalEntry[]>;
/**
* legacy-journal-resume (DEF-3): a journal whose spawns carry no lineage
* records (the pre-lineage shape) resumes on the current engine; the
* legacy spawns canonize onto deterministic 'legacy:' LTIDs, forward
* matching pays nothing for them, and the NEW lineage-declaring spawn's
* admission entry carries sigVersion 1.
*/
declare function runLegacyJournalResume(): Promise<JournalEntry[]>;
/**
* oscillation-full-reuse (DEF-5): a branch whose escalated-terminal root
* is severed by cancel_task and re-added byte-identically links
* reuse_full: the verdict is embedded in the plan.revision, the
* node.link (mode full, claim shared) and the by-ref root are present,
* the reused subtree costs zero live calls, and reclaimedUsdAtLink
* equals the donor spend (docs/03, 9.4/9.5).
*/
declare function runOscillationFullReuse(): Promise<JournalEntry[]>;
/**
* graft-partial-subtree (DEF-5): the three-rung limit ladder is severed
* mid-top-rung after two completed rung attempts; the byte-identical
* re-add grafts (exclusive link), the completed rung attempts
* forward-match through the scope alias, and only the interrupted rung
* reruns live, exactly once (docs/03, 9.5).
*/
declare function runGraftPartialSubtree(): Promise<JournalEntry[]>;
/**
* crash-between-link-and-root (DEF-5): the full-reuse scenario is cut
* strictly AFTER the durable node.link and BEFORE the by-ref root; the
* resume rolls forward: the link forward-matches, the root is re-issued,
* and nothing is paid twice (docs/03, 9.10).
*/
declare function runCrashBetweenLinkAndRoot(): Promise<JournalEntry[]>;
/**
* oscillation-guard-trip (DEF-5): the third re-add of one SpawnKey at
* maxOscillationsPerKey 2 rejects osc_guard as a typed plan_revise
* error; the run closes through the non-HITL path and the embedded
* verdicts replay identically (docs/03, 9.4).
*/
declare function runOscillationGuardTrip(): Promise<JournalEntry[]>;
/**
* worktree-disposed-degrade (DEF-5): a worktree-isolated graft donor
* whose tree was NOT retained degrades to a fresh admit with the
* embedded DedupNote graft_unsafe; a second section verifies reuse_full
* stays allowed for a worktree donor whose root is terminal (docs/03,
* 9.4: the pin condition applies to grafts only).
*/
declare function runWorktreeDisposedDegrade(): Promise<JournalEntry[]>;
/**
* claim-exclusivity-and-chain (DEF-5): one revision adds TWO identical
* tasks; the first grafts (exclusive claim), the second admits fresh;
* the grafted node is severed and the key added a third time: the link
* points at the chain head and the drain is transitive, oldest first;
* oscillationCount for the key reaches 2 (docs/03, 9.6).
*/
declare function runClaimExclusivityAndChain(): Promise<JournalEntry[]>;
/**
* revise-racing-defaultDecision (DEF-8, mandatory): while the
* orchestrator sleeps, the upstream Flavor B timeout resolves a node
* done, a second node escalates, and a third completes; the wake
* submits ONE stale-based revision {waive_dep, park_task, cancel_task}
* whose trio drops with the exact reasons and the blockingRef pointing
* at the defaultDecision resolution (docs/07, 3.5; docs/09, 6.8).
*/
declare function runReviseRacingDefaultDecision(): Promise<JournalEntry[]>;
/**
* crash-after-append-before-effects (DEF-8): the kill lands immediately
* after the durable plan.revision carrying add_task x2 plus cancel_task
* on a running node; the resume re-issues the effects: both children
* spawn live exactly once and the cancel lands (docs/07, 3.9).
*/
declare function runCrashAfterAppendBeforeEffects(): Promise<JournalEntry[]>;
/**
* amend-vs-running-then-cancel-add (DEF-8): amend_task on a running node
* drops node_running; the next revision cancels it and adds the amended
* prompt as a NEW node continuing the SAME logical task; the abandon
* covers the old branch and replay repays neither (docs/07, 4.7).
*/
declare function runAmendVsRunningThenCancelAdd(): Promise<JournalEntry[]>;
/**
* intra-revision-self-conflict (DEF-8): one revision {cancel_task X,
* amend_task X, rewire_deps with an edge onto X} resolves strictly in
* submission order per the sequential intra-revision application
* semantics (docs/07, 4.7 conflict table).
*/
declare function runIntraRevisionSelfConflict(): Promise<JournalEntry[]>;
/**
* bad-base-streak-terminates (DEF-8): three consecutive revisions with a
* fabricated base.planHash land as all-dropped bad-base entries; the
* dropped streak reaches its limit and the non-HITL RevisionGuards
* fallback (finish-with-partial) closes the run (docs/07, 3.5/3.8).
*/
declare function runBadBaseStreakTerminates(): Promise<JournalEntry[]>;
/**
* park-races-child-completion (DEF-8): park_task lands on a running node
* whose terminal appends moments later; parkRequested is extinguished by
* the child-result transition, no checkpoint is written, and the node is
* done (docs/07, 3.6).
*/
declare function runParkRacesChildCompletion(): Promise<JournalEntry[]>;
/**
* reserve-survives-run-exhaustion (DEF-7): cheap workers eat the run
* ceiling until admission rejects the spawn that would invade the
* committed finalize reserve; the final wake executes from the reserve
* and the rejections forward-match on replay (docs/07, 12.4).
*/
declare function runReserveSurvivesRunExhaustion(): Promise<JournalEntry[]>;
//#endregion
//#region src/m10-cassettes.d.ts
/**
* kb-pin-replay (docs/09, 6.11): the pin at admission and the repin at
* the wake, card bytes embedded, model names withheld.
*/
declare function runKbPinReplay(): Promise<JournalEntry[]>;
/**
* kb-repin-expiry (docs/09, 6.11): the repin re-applies the docs/05
* filters against a FRESH read; a claim the store dropped between the
* pin and the wake stops steering, while the boot pin's bytes stand.
*/
declare function runKbRepinExpiry(): Promise<JournalEntry[]>;
//#endregion
export { AppliedPlanOp, BUDGET, CassetteTurn, DEFAULT_DROPPED_REVISION_LIMIT, DEFAULT_MAX_OSCILLATIONS_PER_KEY, DEFAULT_MAX_PINNED_WORKTREES, DEFAULT_STALL_REPLAN_CAP, EMPTY_PLAN_HASH, EnginePlanOp, EscalationDebitRow, EscalationDecisionValue, GateVerdictValue, GuardFallback, GuardVerdictValue, GuardsState, JUDGE_VERDICT_SCHEMA, LEDGER_APPEND_SCHEMA, LEDGER_APPEND_TOOL_NAME, LEDGER_READ_SCHEMA, LEDGER_READ_TOOL_NAME, LEDGER_RENDER_BUDGET_CHARS, LEDGER_SECTION_CAPS, LadderVerdictValue, LedgerExport, LedgerFact, LedgerLesson, LedgerObservation, LedgerOp, LedgerRevisionRow, LedgerView, M7CassetteFixture, PLAN_HASH_VERSION, PLAN_REVISE_SCHEMA, PLAN_REVISE_TOOL_NAME, PLAN_SCOPE, PLAN_VIEW_SCHEMA, PLAN_VIEW_TOOL_NAME, ParkDisposition, PinLedger, PlanDecisionOrigin, PlanDecisionValue, PlanFoldState, PlanNode, PlanNodeStatus, PlanOp, PlanReviseErrorCode, PlanReviseRequest, PlanReviseResult, PlanRevisionAdmission, PlanRevisionValue, PlanRunnerOptions, PlanSnapshotRef, PlanToolRuntime, PlanViewNode, PlanViewRender, PlanWorking, PlanWriteLock, QueueFailoverDeps, RebaseContext, RebaseEvaluation, RebaseOutcome, RebaseReasonCode, ReuseTransform, RevisionGuards, RevisionGuardsOptions, TaskPlan, TaskSpec, TaskSpecPatch, UnparkPlacement, agentTypeOfRequest, applyAppliedOp, applyDecisionOps, applyPlanEntry, applyTaskSpecPatch, assertPlanHead, assertPlanTransition, boundLedgerRender, buildPlanTools, canonicalLadderOf, canonicalPlanState, cassetteAdapter, chainEffortOf, clampStartTier, decisionOriginOf, depsSatisfied, effectiveDroppedStreak, emptyPlan, emptyPlanFold, engineWith, escalationDecisionKey, executingRungOf, exportLedger, foldLedger, gateVerdictKey, isTerminalPlanStatus, judgePrompt, ladderOfProfile, ladderTriggerOf, ladderVerdictKey, ledgerCapViolation, ledgerOpKey, ledgerSufficiency, normalizeAdaptiveJournal, orchestratePlanned, parkDispositionOf, planDecisionKey, planHash, planRevisionKey, planRunner, promptSpecHashOf, readPlanDecision, readPlanRevision, rebasePlanRevision, recomputePlanReadiness, resolvedByOf, runAmendVsRunningThenCancelAdd, runBadBaseStreakTerminates, runBudgetDeniedRung, runCapFreezeThenFinish, runClaimExclusivityAndChain, runClassStormSingleTurn, runCombinedLoopDescent, runConfigDriftResume, runCrashAfterAppendBeforeEffects, runCrashBetweenCapAndEffects, runCrashBetweenLinkAndRoot, runCrashDuringRevision, runDecomposeMintsChildren, runEscalationStormFrozen, runFinalizeFallbackSynthesized, runGraftPartialSubtree, runHalfEscalatedLadder, runIntraRevisionSelfConflict, runKbPinReplay, runKbRepinExpiry, runLegacyJournalResume, runOscillationBounded, runOscillationFreeze, runOscillationFullReuse, runOscillationGuardTrip, runParkRacesChildCompletion, runParkUnpark, runQueueFailoverDuringForcedFinish, runRaceTimeoutVsLive, runReserveSurvivesRunExhaustion, runRespawnPreservesCounter, runReviseMidRun, runReviseRacingDefaultDecision, runRevisionExhaustion, runRewordedLessonsCollide, runRungRetryLineage, runStallStreakClassesAndPinning, runWorktreeDisposedDegrade, settled, unparkPlacementOf, wouldCreateDepCycle };