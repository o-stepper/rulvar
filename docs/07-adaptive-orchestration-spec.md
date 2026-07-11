# Adaptive orchestration spec

Status: Ready for implementation
Version: 0.2.0-docs
Date: 2026-07-06

Purpose: normative specification of the adaptive orchestration layer of rulvar: PlanRunner, the orchestrator toolset, WakeDigest, EscalationProtocol, AdmissionController, lineage, RunLedger, ModelLadder, TerminationAccount, and the orchestrator budget cap.

Requirements for this layer are registered in the FR-3xx block of 01-requirements.md. Implementation lands in milestone M6 (v0.7.0, mode (c) substrate and dynamic orchestrator) and milestone M7 (v0.8.0, PlanRunner and the full adaptive machinery); see 10-implementation-plan.md. Normative content folded in from the defect-fix specifications carries (DEF-n) markers; cross-review amendments carry (XF-nn) markers; the mapping is in section 13.

## 1 Scope and applicability per mode

This document applies to orchestration mode (c), the dynamic orchestrator, and to its opt-in extension PlanRunner. The three modes themselves are defined in 00-overview.md (section "Orchestration modes") and 06-execution-spec.md (section "Modes and entry points"). There is no fourth mode; all orchestration is call-and-return only (invariant I3).

Applicability rules (normative):

- A PlanRunner run MUST write a `termination.init` entry (section 11) and carries the full adaptive machinery of this document: TaskPlan, plan_revise with auto-rebase, WakeDigest, TerminationAccount, RunLedger, the orchestrator budget sub-account, and reuse-by-reference verdicts.
- A non-PlanRunner run (modes (a) and (b), and mode (c) without PlanRunner) gets ONLY the engine lifetime cap (default 500 spawns, configurable; 06-execution-spec.md, Appendix A), `maxDepth`, and the three budget layers. No `termination.init` entry is written and no TerminationAccount folds exist in such runs.
- Escalation caps outside PlanRunner apply per declared lineage only: when a spawn declares a `lineage` block (section 8), `maxEscalationsPerLogicalTask` is enforced across that lineage chain; when no lineage is declared, the escalated result is simply returned to the caller (or to the `onEscalation` hook of InProcessRunner) and nothing is counted.
- The `kb_pinned` decision entry (05-model-knowledge-spec.md, section "Read path") is written only for runs that resolve an orchestrate-role invocation.

### 1.1 Design verdicts

Four founder ideas were each accepted only in a bounded form; the naive forms are explicitly rejected because each reproduces a known failure class. These verdicts are normative design constraints:

1. Mid-run replanning is the only real justification for an LLM orchestrator; if the plan never changes, a script is strictly better. Accepted: PlanRunner (section 3), where the plan is typed data owned by the engine, the orchestrator sleeps between event-driven wakes, and revisions are typed diffs. Continuous orchestrator monitoring is rejected entirely (EXC registry in 01-requirements.md). The documented default for most users remains phase chaining with replan between phases; the adaptive machinery is opt-in for wide fan-out.
2. A typed escalation channel from a running node is accepted (section 6). Nodes only PROPOSE decomposition; the single AdmissionController spawns (section 7). `allowChildSpawns` is excluded from v1 (EXC registry). Framing: decompose only when the executor has proven it must, never speculative recursive planning.
3. "Orchestrator memory" is accepted only as RunLedger (section 9): run-scoped, single-writer, journaled, strictly advisory. Vector stores and cross-run memory are rejected in v1; the sole sanctioned exception is ModelKnowledge (05-model-knowledge-spec.md), and the only outward seam is LedgerExport JSON.
4. A strong orchestrator is the documented default (the "5-15 percent of run spend" figure is demoted to dogfood hypothesis H-OrchShare, section 12.7). Blindly weak workers are rejected; accepted instead: ModelLadder with role quality floors and artifact-grounded acceptance gates (section 10). The engine does NOT default workers to weak models.

## 2 Governing principle: replay-and-cost

Replay soundness of the whole adaptive layer rests on one principle, stated here as the governing rule: nondeterminism is eliminated not by forbidding dynamism but by recording it. Every rule in this document is an instance of decision-before-effects.

Normative clauses:

1. Every dynamic decision MUST be exactly one decision entry appended strictly BEFORE its effects, carrying everything that would otherwise have to be re-evaluated live: embedded admission verdicts, budget reserves, verify/judge verdicts, `defaultDecision` outcomes, no-progress aborts.
2. Every read MUST be a pure fold pinned to a snapshot recorded with the turn; fold-global counters MUST NOT leak into the transcript.
3. Derived state is ordered by spawn ordinal; optional distillation lives in the child's scope keyed by task id, so reordering of parallel completions cannot pay for it twice.
4. Commit order is fixed: the durable append of a `plan.revision` entry with its assigned NodeIds happens strictly BEFORE any plan/NodeId scope is created or scheduled; a fold that is ahead of a checkpoint is normal roll-forward.
5. The three kernel amendments (03-journal-spec.md, section "Replay predicate (DEF-1)") close the remaining double-payment holes.

Cost-boundedness follows from the same construction:

- NodeId scoping means revisions shift no sibling scope; completed children forward-match on replay; every new task costs exactly one live attempt.
- The orchestrator sleeps on `wait_for_events` and is woken by a coalesced WakeDigest (summaries, never raw transcripts); its context grows O(wakes).
- Per-rung `maxTurns` bounds the worst-case cost of a failed attempt (section 10).
- A class-level escalation decision makes a correlated storm cost one expensive turn (section 6.5).
- Termination of the composite escalate-replan-retier loop is guaranteed by the termination lemma (section 11.4) (DEF-2).
- The orchestrator's own spend is bounded by its cap and finalize reserve (section 12) (DEF-7).

## 3 PlanRunner (DEF-8)

PlanRunner is the opt-in extension of mode (c), entered via `plan`/`runPlanned` (06-execution-spec.md, section "Modes and entry points").

### 3.1 TaskPlan data model

TaskPlan is typed data owned by the engine, never prose in a transcript:

- Nodes carry `NodeId` = ULID, minted by the engine inside the `plan.revision` entry that adds them (never by the model). Each node's child scope is `plan/NodeId` (scope grammar in 03-journal-spec.md, section "Scope-path grammar").
- Dependencies form a DAG.
- The status machine is closed; `done` is immutable.
- The engine, not the model, schedules ready nodes through the existing per-run semaphore and budget admission (06-execution-spec.md, section "Scheduler").

```ts
export type PlanNodeStatus =
  | 'pending' | 'ready' | 'running' | 'parked' | 'escalated'
  | 'done' | 'failed' | 'cancelled' | 'skipped';

// Canonical per-node fields entering planHash (sorted per RFC 8785 in the hash):
export interface PlanNode {
  nodeId: NodeId;                 // ULID minted inside plan.revision
  logicalTaskId: LogicalTaskId;   // section 8 (DEF-3)
  status: PlanNodeStatus;
  deps: NodeId[];                 // sorted in the hash
  waivedDeps: NodeId[];
  parkRequested: boolean;
  cancelRequested: boolean;
  priority: number;
  promptSpecHash: string;
  checkpointRef?: EntryRef;
  escalationRef?: EntryRef;
}
```

### 3.2 Single applier and total order

The "single writer" thesis is restated honestly: there are several AUTHORS of plan mutations (the orchestrator via `plan_revise`; the engine via escalation-timeout `defaultDecision`, class-level EscalationDecision, no-progress abort, and child status transitions), but there is exactly ONE APPLIER: the PlanRunner fold function consuming a totally ordered stream of plan-mutating decision entries from the journal. Nothing mutates PlanState directly; every mutation is an entry, and state is a pure fold of entries. (DEF-8)

- All plan-mutating entries live in one sequential scope `"plan"` inside the orchestrator's run scope; cursor forward-matching and ordinal numbering of the journal kernel apply unchanged. Fold order = ordinal order = durable-append order.
- Live appends are serialized by the in-process PlanWriteLock (acquire, read fold head, evaluate, append, release). PlanWriteLock serializes ONLY appends to scope `"plan"`; it MUST NOT substitute for resolution arbitration, which is owned by the ResolutionArbiter (03-journal-spec.md, section "Suspension and resolutions (DEF-4)"). (XF-07)
- In queue mode the lease fencing epoch applies on top (03-journal-spec.md, section "Storage SPI").
- Wall clock influences only WHICH order gets recorded live; replay reads the recorded order.

### 3.3 Entry kinds and identity

Two plan-mutating entry kinds exist (DEF-8):

1. Kind `plan.revision` (orchestrator authorship; the result of `plan_revise`). Fields: `base { digestSeq, planHash }`, `requestedOps[]`, `outcomes[]` (same length and order as requested), `assignedNodeIds`, `admissions[]` (embedded admission verdicts and reserves for `add_task`/`unpark_task`), `planHashBefore`, `planHashAfter`, `hashVersion`, `rationale`, plus `revisionUnitsAfter` and `debits[]` (DEF-2). This is the only kind that needs rebase, because only the orchestrator authors against a stale snapshot (`plan_view` is deliberately pinned to the last WakeDigest).
2. Kind `plan.decision` (engine authorship; authored strictly at the fold head under PlanWriteLock, so rebase is unnecessary by construction). Fields: `origin` (`'escalation-default' | 'escalation-class' | 'escalation-live' | 'no-progress' | 'child-result' | 'park-landed' | 'cancel-landed'`), `ops: EnginePlanOp[]`, `causeRef`, `planHashBefore`, `planHashAfter`, `hashVersion`.

Identity: the content key of `plan.revision` is sha256 of the canonical JSON of `{ kind, base, requestedOps }`; the key of `plan.decision` is sha256 of `{ kind, origin, ops, causeRef }`. Cosmetics (`rationale`) never enter the key. Ordinal within scope `"plan"` distinguishes repeats; forward-matching works without kernel changes.

Dependency satisfaction is NOT an entry: it is derived purely in the fold from upstream nodes transitioning to `done` or from waived flags.

```ts
export type EnginePlanOp =
  | { kind: 'set_node_status'; nodeId: NodeId; from: PlanNodeStatus; to: PlanNodeStatus;
      cause: 'child-result' | 'no-progress' | 'park-landed' | 'cancel-landed'; causeRef: EntryRef }
  | { kind: 'resolve_escalation'; nodeId: NodeId; decision: EscalationDecision;
      resolvedBy: 'default' | 'class' | 'live' | 'revision-transform'; escalationRef: EntryRef }
  | { kind: 'spawn_admitted'; nodes: Array<{ nodeId: NodeId; logicalTaskId: LogicalTaskId; spec: TaskSpec }>;
      admission: AdmissionRecord };
```

`set_node_status` with cause `child-result` MUST consume terminal statuses strictly per the replay predicate table (03-journal-spec.md, section "Replay predicate (DEF-1)"); the plan fold MUST NOT invent its own predicate.

### 3.4 planHash chain

Every plan-mutating entry carries `planHashBefore`, `planHashAfter`, and `hashVersion`. `planHash` = sha256 of the canonical JSON of PlanState: nodes sorted by NodeId, each as the PlanNode record of section 3.1, plus the guard fold counters (`revisionCount`, `droppedRevisionStreak`). Nothing wall-clock, nothing telemetric, enters the hash.

- On append the engine MUST assert `planHashBefore` equals the current fold head; a failure is an engine bug and raises typed `PlanInvariantError` (the run finishes with outcome `error`, never a silent brick).
- On replay the fold recomputes `planHashAfter` of every entry with the predicate of that entry's own `hashVersion`; a mismatch raises `ReplayPlanHashMismatch { entryRef, expected, actual, hashVersion }` and the resume is rejected in a typed way without corrupting the journal. A mismatch can only mean hashVersion drift (03-journal-spec.md, section "hashVersion (DEF-6)") or store corruption.
- "Bricking a run on one stale revision" is impossible by construction: a stale revision is no longer applied blindly; its rebase outcome is recorded.

### 3.5 Rebase algorithm

On `plan_revise` the engine MUST execute exactly this algorithm (committed, no variants) (DEF-8):

1. Acquire PlanWriteLock.
2. Validate `base`: the pair `{ digestSeq, planHash }` MUST equal the hash recorded in the referenced WakeDigest entry. On failure the whole revision is rejected as ONE journaled all-dropped entry with reason `bad_base` (`planHashAfter == planHashBefore`).
3. Conflicts are evaluated ONLY against the fold head (`base` serves validation and audit). Requested ops apply sequentially in submission order, each op against the state already changed by earlier applied ops of the same revision.
4. The outcome of each op is exactly one of `applied`, `transformed` (a deterministic rewrite; the applied form is recorded next to the requested one), or `dropped` (a journaled no-op with a machine reason code and optional `blockingRef`).
5. The whole result is ONE durable append of `plan.revision` (requested ops, per-op outcomes, applied ops, assigned NodeIds, embedded admit verdicts and reserves, `planHashBefore`/`After`) STRICTLY BEFORE any effect executes.
6. The tool result returned to the orchestrator is a deterministic render of the entry: on replay the transcript receives a byte-identical result from the matched entry.

```ts
export interface PlanSnapshotRef {
  digestSeq: number;   // ordinal of the WakeDigest that plan_view is pinned to
  planHash: string;    // plan hash recorded in that WakeDigest
}
export interface PlanReviseRequest {
  base: PlanSnapshotRef;  // mandatory; the call is rejected without it
  ops: PlanOp[];
  rationale: string;
}
export type RebaseReasonCode =
  | 'admission_denied' | 'node_already_done' | 'dep_already_resolved'
  | 'node_escalated' | 'node_running' | 'terminal_status' | 'dep_cycle'
  | 'already_parked' | 'not_parked' | 'no_such_dep' | 'already_waived'
  | 'bad_base' | 'lineage_exhausted' | 'lineage_busy' | 'plan_frozen'
  // transform codes:
  | 'checkpoint_discarded' | 'reuse_by_reference' | 'resolved_escalation' | 'immediate_satisfaction';
export type RebaseOutcome =
  | { kind: 'applied';     op: PlanOp }
  | { kind: 'transformed'; requested: PlanOp; applied: PlanOp; reason: RebaseReasonCode }
  | { kind: 'dropped';     requested: PlanOp; reason: RebaseReasonCode; blockingRef?: EntryRef };
  // blockingRef: seq of the entry that caused the conflict (e.g. an engine defaultDecision resolution)

export interface PlanReviseResult {   // canonical form (XF-11): DEF-8 shape plus revisionUnitsRemaining (DEF-2)
  outcomes: RebaseOutcome[];          // same length and order as requested ops
  assignedNodeIds: Record<number, NodeId>;
  planHashAfter: string;
  droppedAll: boolean;
  revisionUnitsRemaining: number;
}
export type PlanReviseErrorCode = 'revision_budget_exhausted' | RebaseReasonCode;
```

### 3.6 Conflict resolution table

The complete per-op resolution table (op x node state at the fold head). This table is normative and closed (DEF-8):

| Op | Condition at fold head | Outcome | Reason code / rule |
|---|---|---|---|
| add_task | AdmissionController rejects | dropped | `admission_denied` (verdict embedded in the entry) |
| add_task | byte-identical content key of a completed abandoned branch | transformed | `reuse_by_reference` (DEF-5; section 7.3) |
| add_task | declared dep on a terminally unsuccessful node | applied | node stays blocked and surfaces in WakeDigest; no silent waive; quiescence guarantees a wake |
| add_task | lineage exhausted or busy at the head | dropped | `lineage_exhausted` / `lineage_busy` (DEF-3) |
| add_task | otherwise | applied | NodeId assigned by the engine |
| amend_task | pending or ready | applied | |
| amend_task | parked | transformed | `checkpoint_discarded`: the amendment applies, the checkpoint is discarded, unpark becomes a restart |
| amend_task | running | dropped | `node_running`: amending a running node is a decision to pay twice; the sanctioned path is cancel_task + add_task |
| amend_task | escalated | dropped | `node_escalated`: the escalation channel owns the node's fate |
| amend_task | done, failed, cancelled, skipped | dropped | `terminal_status` |
| park_task | pending or ready | applied | |
| park_task | running | applied | as `parkRequested = true`; the actual park lands at the turn boundary via a separate `plan.decision` (`park-landed`) |
| park_task | escalated | dropped | `node_escalated` |
| park_task | parked | dropped | `already_parked` |
| park_task | terminal | dropped | `terminal_status` |
| unpark_task | parked | applied | with an embedded admission reserve |
| unpark_task | any other state | dropped | `not_parked` or `terminal_status` |
| cancel_task | pending, ready, or parked | applied | the subtree cascade is computed at apply time and written to `appliedOp.cascadeNodeIds`; `done` nodes never enter the cascade (done is immutable); abandon entries are written for unfinished subtree entries |
| cancel_task | running | applied | as `cancelRequested = true` plus AbortSignal; the final transition lands via a separate `plan.decision` (`cancel-landed`) |
| cancel_task | escalated (decision not yet taken) | transformed | `resolved_escalation`: the op becomes an escalation resolution with verdict `cancel`, via superseding append decide-once (DEF-4) |
| cancel_task | done | dropped | `node_already_done`: done is immutable and the result is paid for; to keep the result unused, cancel the dependents |
| cancel_task | failed, cancelled, skipped | dropped | `terminal_status` |
| reprioritize | any non-terminal | applied | |
| reprioritize | terminal | dropped | `terminal_status` |
| rewire_deps | resulting graph has a cycle | dropped (whole op) | `dep_cycle`; rewire_deps is atomic, partial application is forbidden |
| rewire_deps | target node running | dropped | `node_running` |
| rewire_deps | edges onto done nodes | transformed | `immediate_satisfaction` |
| rewire_deps | edges onto cancelled or failed nodes | applied | such edges remain blocking |
| rewire_deps | otherwise | applied | |
| waive_dep | dep already resolved (upstream done, including via defaultDecision) | dropped | `dep_already_resolved`, `blockingRef` points at the resolving entry |
| waive_dep | upstream terminally unsuccessful (cancelled or failed: the dep is dead, not resolved) | applied | the waive unblocks the node |
| waive_dep | dep still blocking | applied | |
| waive_dep | no such dep, or already waived | dropped | `no_such_dep` / `already_waived` |
| any op | plan frozen by `orchestrator_budget_cap` | dropped | `plan_frozen` (DEF-7; section 12.4) |
| whole revision | `base` does not match the hash recorded in the referenced WakeDigest | all ops dropped | `bad_base`; the entry increments `droppedRevisionStreak` and debits the revision budget, so a hallucination loop terminates via RevisionGuards |

Without `rewire_deps` and `waive_dep` the DAG would deadlock on a failed dependency; both ops exist for exactly that reason.

### 3.7 Timer race

The normative mechanism is DEF-4 (XF-07): a late `defaultDecision` timer MUST append its attempt through the ResolutionArbiter, where the first-wins fold classifies it as `noop`. All dynamic decisions that actually happened are journaled; a "silently losing timer" does not exist. For a single engine decision the order is fixed: first the resolution entry that closes the suspended entry, then the `plan.decision` (`resolve_escalation`) referencing it by seq; `blockingRef` in dropped table outcomes points at that resolution entry. On replay timers do not run at all: the journal is the truth.

### 3.8 Guards (RevisionGuards)

- A fully dropped revision increments the fold counter `droppedRevisionStreak`; reaching `droppedRevisionLimit` (default 3 consecutive fully-dropped revisions) triggers the RevisionGuards fallback.
- The RevisionGuards fallback is configurable, non-HITL, and terminating: the chain is `reject-revision -> finish-with-partial -> fail-run`; the default terminating fallback is `finish-with-partial`. A human in the loop MUST NOT be required for a run to terminate.
- The revision budget is the absolute, non-replenishable `maxRevisionsPerRun` (default 32); scaling the budget by plan size was removed (DEF-2; section 11.1).
- The oscillation guard keys on `approachSigCoarse` ACROSS LogicalTaskId boundaries (a content-identical rebirth under a fresh lineage root is still flagged), and `osc_guard` keys on SpawnKey (DEF-5; section 7.3).
- Hysteresis applies to almost-done nodes; guards plus the sunk-cost (abandoned-spend) ledger cover park/unpark churn. Park/unpark mechanics are specified in 03-journal-spec.md, section "Checkpoints"; the worktree pin cap they share is in 08-tools-permissions-spec.md, section "IsolationProvider and worktree lifecycle".
- An optional trigger on the `netLostUsd` cap (fraction of the starting budget) feeds the same terminating fallback.

```ts
export interface RevisionGuardsOptions {
  fallback?: 'reject-revision' | 'finish-with-partial' | 'fail-run'; // default 'finish-with-partial'
  droppedRevisionLimit?: number;        // default 3 consecutive fully-dropped revisions
  maxAbandonedNetUsdFraction?: number;  // optional netLostUsd trigger (DEF-5)
}
export interface PlanRunnerOptions {
  maxRevisionsPerRun?: number;    // absolute, non-replenishable; default 32 (DEF-2)
  guards?: RevisionGuardsOptions;
  approachVocabulary?: string[];  // DEF-3; out-of-vocabulary tags get a typed tool error with bounded re-prompt
  budget?: OrchestratorBudgetSpec; // section 12
}
```

### 3.9 Replay semantics

Replay NEVER recomputes rebase and never re-evaluates conflicts against live state: the fold consumes the outcomes recorded in `outcomes`/`ops`; the APPLIED diff is reproduced, not the requested one. Timers do not run. The `plan_revise` tool result renders byte-identically from the matched entry. `plan_view` is a pure fold of scope `"plan"` entries up to `coversToOrdinal` of the last WakeDigest: a turn re-executed after a crash reads exactly what the original read. Fold-ahead-of-checkpoint is normal roll-forward (journaled revisions replay into the resumed transcript); an ordinary crash never bricks the run.

Edge-case rules (normative) (DEF-8):

- Crash between the durable append of `plan.revision` and effect execution: roll-forward. The fold sees the entry; the engine re-issues the authorized effects idempotently; a child scope spawn forward-matches emptiness and goes live exactly once; a repeated AbortSignal against a nonexistent agent is a no-op; a park request against an already terminal node is closed by the flag-clearing rule.
- Intra-revision self-conflict (`cancel_task X` then `amend_task X` in one `ops[]`): sequential application means the amend lands on `cancelled` and gets `dropped terminal_status`; both outcomes are recorded and the model sees the reason.
- `park_task` racing child completion: the revision sets `parkRequested = true`; if the child's terminal entry appends before `park-landed`, the `child-result` engine transition clears `parkRequested` (a terminal transition extinguishes pending flags), the node goes `done`; no orphaned flags, no double checkpoints.

Defect cassettes for this section (catalog in 09-observability-testing-spec.md): `revise-racing-defaultDecision`, `crash-after-append-before-effects`, `amend-vs-running-then-cancel-add`, `intra-revision-self-conflict`, `bad-base-streak-terminates`, `park-races-child-completion`.

## 4 Orchestrator toolset

The orchestrator is an ordinary agent (role `orchestrate`) holding typed spawn tools; every spawn is a journal entry, and checkpoints at turn boundaries are mandatory. Tool schemas below are normative; they enter `toolsetHash` (08-tools-permissions-spec.md, section "tool() definition and ToolDef") and therefore identity.

| Tool | Availability | Purpose |
|---|---|---|
| spawn_agent | mode (c), M6 | admit and schedule one child agent |
| parallel_agents | mode (c), M6 | admit and schedule several children at once |
| await_any / await_all | mode (c), M6 | wait on handles |
| cancel_agent | mode (c), M6 | cancel an in-flight child |
| wait_for_events | mode (c), M6 | sleep until a coalesced WakeDigest |
| plan_view | PlanRunner, M7 | pinned pure-fold render of the plan |
| plan_revise | PlanRunner, M7 | typed PlanOp diff with rebase |
| finish | mode (c), M6 | terminate with a result |
| escalate | worker-side, opt-in, M3+ | Flavor B escalation (section 6.2); registered on worker profiles, never on the orchestrator itself |
| kb_propose | PlanRunner, phase 3 only (M12) | propose a model-knowledge observation (05-model-knowledge-spec.md) |

Handles are journal-derived stable identifiers: a handle IS the seq of the spawn entry, and it MUST be stable across resume.

### 4.1 TaskSpec

The shared spawn specification used by `spawn_agent`, `parallel_agents`, `add_task`, and `proposedDecomposition`:

```ts
export interface TaskSpec {
  agentType: string;              // registered agent profile name; models are never named here
  prompt: string;
  outputSchemaRef?: string;       // registered SchemaSpec name (docs/08)
  toolsetRef?: string;            // registered tool profile name (docs/08)
  isolation?: IsolationSpec;      // 'none' | 'readonly' | { kind: 'worktree'; ref? } (docs/08)
  usageLimits?: Partial<UsageLimits>;   // docs/06
  budgetUsd?: number;             // clamped by childBudgetFraction at admission
  model_hint?: { startTier: number };   // the ONLY model influence the orchestrator has; clamped to the declared ladder
  approach?: string;              // slug, at most 32 chars after normalization (section 8.2)
  lineage?: SpawnLineageOpt;      // section 8.1; absence means a new lineage root
  taskClass?: string;             // optional; default 'unclassified' (14-open-questions.md, taskClass binding OQ)
  escalation?: EscalationOptions; // section 6.4; absence means the child cannot escalate
}
```

The orchestrator never sees or names concrete models; `model_hint.startTier` is clamped to the ladder declared on the agent profile (section 10).

### 4.2 spawn_agent

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["agentType", "prompt"],
  "properties": {
    "agentType": { "type": "string" },
    "prompt": { "type": "string" },
    "outputSchemaRef": { "type": "string" },
    "toolsetRef": { "type": "string" },
    "budgetUsd": { "type": "number", "exclusiveMinimum": 0 },
    "model_hint": {
      "type": "object",
      "additionalProperties": false,
      "properties": { "startTier": { "type": "integer", "minimum": 0 } }
    },
    "approach": { "type": "string", "maxLength": 64 },
    "lineage": {
      "type": "object",
      "additionalProperties": false,
      "required": ["continues", "causeRef"],
      "properties": {
        "continues": { "type": "string", "description": "LogicalTaskId to continue" },
        "relation": { "enum": ["respawn", "rung-retry", "decompose-child", "unpark-restart"] },
        "causeRef": { "type": "integer", "minimum": 1, "description": "seq of the journal entry that caused the rebirth" }
      }
    },
    "taskClass": { "type": "string" }
  }
}
```

Result: `{ handle: number }` where `handle` is the spawn entry seq. Admission (section 7) runs before the entry is journaled; a rejection surfaces as a typed tool error carrying the embedded `AdmitRejectReason`.

M6 delivery notes (amended during M6-T07): `outputSchemaRef` and `toolsetRef` are part of the normative schema (they enter toolsetHash) but their registries land in M7; using them in M6 is a typed tool error, never a run failure. `model_hint` and `lineage` are accepted and journaled; ladder clamping and the lineage folds activate in M7. For spawn-tool admissions the budget reserve is committed by the child's own ctx.agent dispatch moments after the decision entry (one debit, never two); the admission decision still embeds the verdict, the evaluated reserve, and statsBefore, and replay recovers them without re-evaluation.

### 4.3 parallel_agents

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["tasks"],
  "properties": {
    "tasks": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/spawnAgentParams" }
    }
  }
}
```

`$defs/spawnAgentParams` is exactly the spawn_agent parameter schema. `maxChildrenPerNode` (default 16) is enforced at admission, not in the schema. Result: `{ handles: number[] }` in submission order.

### 4.4 await_any and await_all

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["handles"],
  "properties": {
    "handles": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "integer", "minimum": 1 }
    }
  }
}
```

`await_any` returns the first settled child as a TaskDigest; `await_all` returns all of them. An escalated child settles (it is a terminal outcome, DEF-1); the digest carries its report reference. Neither tool takes a deadline in v1.

### 4.5 cancel_agent

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["handle"],
  "properties": {
    "handle": { "type": "integer", "minimum": 1 },
    "reason": { "type": "string" }
  }
}
```

Cancellation of an in-flight child sends AbortSignal and compiles to an abandon entry over the child's scope (03-journal-spec.md, section "Abandon, derived skipped, reuse-by-reference and node.link (DEF-5)"). (Amended during M6-T08: the abandon compilation activates with the PlanRunner cancel_task machinery in M7; in M6 mode (c) the cancelled child journals terminal status `cancelled`, which reruns on a later resume unless covered by abandon, exactly the caller-intent semantics of 10-implementation-plan.md M6-T08.)

### 4.6 plan_view

```json
{ "type": "object", "additionalProperties": false, "properties": {} }
```

`plan_view` is a pure fold of scope `"plan"` entries pinned to `coversToOrdinal` of the last WakeDigest; it is NOT a live read of mutating state. The render includes LineageStats (section 8.3), the AbandonedSpendView (abandoned/reclaimed/netLost spend, DEF-5), and the TerminationAccount snapshot (DEF-2). A pure fold costs nothing against the orchestrator budget (section 12.1).

### 4.7 plan_revise

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["base", "ops", "rationale"],
  "properties": {
    "base": {
      "type": "object",
      "additionalProperties": false,
      "required": ["digestSeq", "planHash"],
      "properties": {
        "digestSeq": { "type": "integer", "minimum": 0 },
        "planHash": { "type": "string" }
      }
    },
    "ops": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/planOp" } },
    "rationale": { "type": "string" }
  },
  "$defs": {
    "planOp": {
      "oneOf": [
        {
          "type": "object", "additionalProperties": false,
          "required": ["op", "spec"],
          "properties": {
            "op": { "const": "add_task" },
            "spec": { "$ref": "#/$defs/taskSpec" },
            "deps": { "type": "array", "items": { "type": "string" } },
            "priority": { "type": "number" },
            "lineage": { "$ref": "#/$defs/lineage" },
            "approach": { "type": "string", "maxLength": 64 },
            "fresh": { "type": "boolean", "default": false }
          }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["op", "nodeId", "spec"],
          "properties": {
            "op": { "const": "amend_task" },
            "nodeId": { "type": "string" },
            "spec": { "$ref": "#/$defs/taskSpecPatch" }
          }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["op", "nodeId"],
          "properties": { "op": { "const": "park_task" }, "nodeId": { "type": "string" } }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["op", "nodeId"],
          "properties": { "op": { "const": "unpark_task" }, "nodeId": { "type": "string" } }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["op", "nodeId"],
          "properties": {
            "op": { "const": "cancel_task" },
            "nodeId": { "type": "string" },
            "reason": { "type": "string" }
          }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["op", "nodeId", "priority"],
          "properties": {
            "op": { "const": "reprioritize" },
            "nodeId": { "type": "string" },
            "priority": { "type": "number" }
          }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["op", "nodeId", "deps"],
          "properties": {
            "op": { "const": "rewire_deps" },
            "nodeId": { "type": "string" },
            "deps": { "type": "array", "items": { "type": "string" } }
          }
        },
        {
          "type": "object", "additionalProperties": false,
          "required": ["op", "nodeId", "dep"],
          "properties": {
            "op": { "const": "waive_dep" },
            "nodeId": { "type": "string" },
            "dep": { "type": "string" }
          }
        }
      ]
    }
  }
}
```

(`$defs/taskSpec`, `$defs/taskSpecPatch`, and `$defs/lineage` are the JSON Schema projections of `TaskSpec`, `Partial<TaskSpec>`, and the `lineage` object of section 4.2.) The `fresh` flag on `add_task` forbids reuse-by-reference for that addition (DEF-5); the flag is embedded in the decision entry and replays. Result: `PlanReviseResult` (section 3.5). `cancel_task` has no cascade parameter: the cascade is computed by the engine at apply time.

### 4.8 wait_for_events

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["triggers"],
  "properties": {
    "triggers": {
      "type": "array",
      "minItems": 1,
      "items": {
        "oneOf": [
          {
            "type": "object", "additionalProperties": false,
            "required": ["kind"],
            "properties": { "kind": { "const": "quiescence" } }
          },
          {
            "type": "object", "additionalProperties": false,
            "required": ["kind"],
            "properties": {
              "kind": { "const": "child_terminal" },
              "handles": { "type": "array", "items": { "type": "integer", "minimum": 1 } }
            }
          },
          {
            "type": "object", "additionalProperties": false,
            "required": ["kind"],
            "properties": { "kind": { "const": "escalation" } }
          },
          {
            "type": "object", "additionalProperties": false,
            "required": ["kind", "percent"],
            "properties": {
              "kind": { "const": "budget_threshold" },
              "percent": { "enum": [50, 80] }
            }
          }
        ]
      }
    }
  }
}
```

Normative rules:

- `wait_for_events` journals as a suspended entry; the wake delivers a coalesced WakeDigest (section 5).
- The quiescence trigger (nothing `running` AND nothing `ready`) is MANDATORY: it is always armed regardless of the requested trigger set, so a plan that runs dry always wakes the orchestrator.
- The trigger vocabulary is closed in v1: `quiescence`, `child_terminal`, `escalation`, `budget_threshold` with the fixed percents 50 and 80 (06-execution-spec.md, Appendix A).
- If no requested trigger can ever fire, the tool MUST fail immediately with a typed error: an embedded run cannot hang unrecoverably.
- There is deliberately no wake trigger on the orchestrator's own spend (section 12.5).

### 4.9 escalate (Flavor B, worker-side)

Registered only on worker profiles that opt in with `escalation.flavor: 'B'`; never available to the orchestrator itself.

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["kind", "scopeDelta", "revisedEstimate"],
  "properties": {
    "kind": { "enum": ["scope_bigger", "scope_different", "blocked_with_evidence"] },
    "scopeDelta": { "type": "string" },
    "revisedEstimate": {
      "type": "object", "additionalProperties": false,
      "required": ["usd", "turns"],
      "properties": {
        "usd": { "type": "number", "minimum": 0 },
        "turns": { "type": "integer", "minimum": 0 }
      }
    },
    "blockers": { "type": "array", "items": { "type": "string" } },
    "proposedDecomposition": { "type": "array", "items": { "$ref": "#/$defs/taskSpec" } }
  }
}
```

`costToDate` and `salvage` are runtime-filled and MUST NOT appear in the tool parameters; model-authored values for them are rejected at validation (section 6.3).

### 4.10 kb_propose (phase 3 only)

Registered only in ModelKnowledge phase 3 (M12, gated by the measured-value checkpoint; 05-model-knowledge-spec.md, section "Phases and placement"). The tool maps one-to-one onto the `observation_add` ledger op (section 9.2); proposals live ONLY in the RunLedger `modelObservations` section and reach the knowledge gate via LedgerExport. There is no `propose` method on any SPI.

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["subject", "taskClass", "polarity", "trigger"],
  "properties": {
    "subject": {
      "type": "object",
      "additionalProperties": false,
      "required": ["tier"],
      "properties": { "tier": { "type": "integer", "minimum": 0 } },
      "$comment": "tier-relative: the engine resolves the rung index against the journaled ladder of the referenced lineage into the concrete KbProposal subject { model, effort }"
    },
    "taskClass": { "type": "string" },
    "polarity": { "enum": ["strength", "weakness"] },
    "trigger": { "enum": ["error", "limit", "schema-exhausted", "verify-failed", "no-progress", "escalation"] },
    "logicalTaskId": { "type": "string" },
    "note": { "type": "string", "maxLength": 200 },
    "evidenceRefs": { "type": "array", "items": { "type": "integer", "minimum": 1 } }
  }
}
```

The payload vocabulary matches `KbProposal` (05-model-knowledge-spec.md, section "Data model"; FR-605): subject, taskClass, polarity, and a trigger from the closed vocabulary are mandatory and schema-validated. The orchestrator never sees model names, so `subject` is expressed tier-relatively: the engine resolves the rung index into the concrete `{ model, effort }` subject of the journaled `KbProposal` from the ladder verdicts of the referenced lineage. The statement is assembled by the engine from a typed template over the trigger vocabulary (tool output is unquotable into persistence); `evidenceRefs` MUST resolve into decision entries of this same run's journal. The claim vocabulary and gate semantics are owned by 05-model-knowledge-spec.md.

### 4.11 finish

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["result"],
  "properties": {
    "result": { "$comment": "validated against the declared output SchemaSpec of the orchestrate call; free-form JSON when none is declared" },
    "summary": { "type": "string" }
  }
}
```

`finish` terminates the run with outcome `ok`. Under the at-cap freeze the final wake carries a restricted toolset containing ONLY `finish` (section 12.4).

## 5 WakeDigest

The orchestrator is woken exclusively by coalesced WakeDigests: summaries, never raw transcripts, so orchestrator context grows O(wakes).

```ts
export interface WakeDigest {
  digestSeq: number;        // ordinal of this digest
  planHash: string;         // plan hash at emission time
  coversToOrdinal: number;  // the plan_view fold stops exactly here
  completedDigests: TaskDigest[];        // ordered by spawn ordinal
  escalations: EscalationDigest[];       // pending and newly decided reports
  termination: TerminationAccountSnapshot;  // mandatory (DEF-2)
  budget: WakeBudgetBlock;                  // mandatory (DEF-7)
  reuse: AbandonedSpendView;                // reuse and oscillation stats (DEF-5)
}

export interface TaskDigest {
  nodeId: NodeId;
  logicalTaskId: LogicalTaskId;
  status: PlanNodeStatus;
  outputSummary: string;      // distilled in the child scope, keyed by task id (section 2, clause 3)
  costUsd: number;
  artifactsIndex: string[];   // index into AgentResult.artifacts
}

export interface EscalationDigest {
  nodeId: NodeId;
  logicalTaskId: LogicalTaskId;
  reportRef: EntryRef;        // seq of the terminal escalated entry or suspended escalate entry
  kind: EscalationKind;
  flavor: 'A' | 'B';
  deadlineAt?: string;        // Flavor B only
}
```

Normative rules:

- Coalescing: all events since the previous wake coalesce into ONE digest; `completedDigests` are ordered by spawn ordinal, never by wall-clock completion order.
- Pinning: the digest is part of the wake snapshot. A turn re-executed after a crash MUST read exactly the same digest bytes; `plan_view` and `ledger_read` within that turn are pinned to `coversToOrdinal` and the same snapshot.
- All WakeDigest schema deltas (planHash/digestSeq/coversToOrdinal, the termination snapshot, the budget block, reuse stats) land as ONE coordinated schema change inside the hashVersion 2 profile (XF-12); the digest render enters the content key of orchestrator turns.
- The digest render is bounded by `renderBudgetChars`, enforced with the CHARACTER measure, model-independent and deterministic (OQ-04 closed at M10 entry); the committed value is 400 chars per outputSummary row, serving both the distillation cap and the digest render default (06-execution-spec.md, Appendix A), the render stage overridable per orchestration.
- Reuse visibility: the orchestrator SEES that a result arrived by reference (node:linked events, reuse stats, `meta.reusedFrom`) and may consciously re-execute via `add_task` with `fresh: true` (DEF-5).

## 6 EscalationProtocol

Typed feedback from a running node to the owner of the parent scope. Nodes only propose; they never spawn (section 1.1, verdict 2).

### 6.1 Flavor A (default)

The worker terminates with terminal status `'escalated'` carrying a schema-validated EscalationReport. `costToDate` and `salvage` are filled by the runtime, not the model; the report is validated BEFORE append. An escalated entry REPLAYS AS OK (the third kernel amendment, DEF-1; 03-journal-spec.md, section "Replay predicate (DEF-1)"): re-running it would re-pay all the paid exploration on every resume.

### 6.2 Flavor B (opt-in on the profile)

The `escalate` tool (schema in section 4.9) suspends the agent on the existing HITL suspension machinery with the orchestrator instead of a human in the loop. `deadlineAt` applies to Flavor B escalations and approvals ONLY; `awaitExternal` has no deadline in v1 (06-execution-spec.md, section "Canonical Ctx interface").

### 6.3 Types

```ts
export type EscalationKind = 'scope_bigger' | 'scope_different' | 'blocked_with_evidence'; // closed

export interface EscalationReport {
  kind: EscalationKind;
  scopeDelta: string;
  revisedEstimate: { usd: number; turns: number };
  blockers: string[];
  proposedDecomposition: TaskSpec[];
  // Runtime-filled fields; model-authored values are rejected at validation:
  costToDate: { usd: number; turns: number };
  salvage: { transcriptRef: string; artifacts: string[]; worktreePatchRef?: string };
}

export type EscalationDecision =
  | { kind: 'retry'; amendedPrompt?: string; startTier?: number }
  | { kind: 'decompose'; children: TaskSpec[] }
  | { kind: 'cancel'; reason?: string }
  | { kind: 'accept'; note?: string };

export interface EscalationOptions {
  flavor?: 'A' | 'B';                   // default 'A'
  deadlineMs?: number;                  // Flavor B suspension deadline -> deadlineAt
  defaultDecision?: EscalationDecision; // applied by the timeout resolution (by: 'timeout')
  minSpendUsd?: number;                 // default 0
}
```

`countsAgainstLimit` is derived once, live, from the report kind and embedded into the authoritative escalation-decision entry: `true` if and only if `kind === 'scope_bigger'`. The kinds `scope_different` and `blocked_with_evidence` are exempt from the minimum-spend gate and never debit the escalation counter (XF-06), but any repeat of them requires a new admitted spawn or a new revision and is therefore bounded by spawnUnits and revisionUnits (DEF-2).

### 6.4 Gating and status semantics

- Status production is gated by opt-in: an agent without escalation config on its profile or spawn physically CANNOT return `escalated`; existing workflows without opt-in never see the new status at runtime.
- `escalated` is legal only on entry kind `agent`, but in ALL scopes: under `plan/NodeId` the report is routed by PlanRunner into the WakeDigest; in script modes the typed `AgentResult` with status `'escalated'` is returned to calling code or to the `onEscalation` hook of InProcessRunner. In `ctx.parallel` an escalated child is a settled outcome (06-execution-spec.md, section "Scheduler").
- `minSpendUsd` (`minSpendBeforeEscalation`) is enforced INSIDE the run: structured output rejects an early `scope_bigger` escalation and a bounded re-prompt says "keep working". In-run enforcement lands in M3.
- Public-contract note (DEF-1): extending `AgentStatus` with `'escalated'` plus the optional `escalation` field on `AgentResult` is the one flagged breaking change; it ships in M3/v0.4.0 as a BREAKING minor per 12-release-versioning.md. `isEscalated` and `EscalatedResult` are exported; consumers not adopting the protocol are advised to map escalated to `limit` (paid partial work, output null, report available for logs).

### 6.5 Decisions

- Decide-once: decisions ride the resolution-entry family with the first-closing-wins fold (DEF-4; 03-journal-spec.md, section "Suspension and resolutions (DEF-4)"). A timeout `defaultDecision` and a live decision are NEVER both applied; the losing attempt is journaled and classified `noop` by the fold. Timeout disposal is expressed as a resolution entry with `by: 'timeout'` (XF-04, XF-05).
- An agent is never resumed into a destroyed environment: dispose collects the worktree patch into `salvage` BEFORE the tree is destroyed.
- Limit: `maxEscalationsPerLogicalTask` (renamed from `maxEscalationsPerNode`; the config validator MUST reject the old name with a migration hint) (XF-10) counts per logical task across respawns via the lineage chain (DEF-3). The unit of counting is authoritative escalation-decision entries with `countsAgainstLimit = true` (XF-06). Default 2; frozen into `termination.init` in PlanRunner runs.
- Class-level decisions: for correlated storms, one class-level EscalationDecision resolves a coherent set of reports with ONE decision entry carrying an array of per-lineage debits; a storm costs one expensive turn. The correlation key for grouping reports into a class is an open question: 14-open-questions.md (class-level escalation correlation key).
- Cap exceeded: exceeding the cap yields terminal `'escalated'` with a `capExceeded` flag and the final report. A bare `limit` would discard exactly the signal the protocol exists for.

Defect cassettes for this section (09-observability-testing-spec.md): `escalate-replay`, `crash-between-report-and-decision`, `flavor-b-timeout`.

## 7 AdmissionController (DEF-2, DEF-3, DEF-5)

### 7.1 Single admission point

AdmissionController is the SINGLE admission point for ALL spawns of any origin: orchestrator tools, `ctx.workflow`, escalation decomposition, rung respawn, and reuse links. It owns depth, quota, budget reserve, dedup, lineage limits, and structural limits. Nodes never spawn their own sub-workflows (`allowChildSpawns` is excluded; EXC registry in 01-requirements.md).

`admit(spec, origin)` is called BEFORE the decision entry is journaled; the verdict plus reserved amounts plus `statsBefore` are embedded IN the decision entry, so replay NEVER re-evaluates admission against the live budget. Lineage folds are computed live STRICTLY BEFORE the append (DEF-3).

### 7.2 Unified AdmitVerdict

One union, merging the three historical definitions (XF-11); the `reuse_full` variant carries `spawnUnitsAfter` and `lineage` because every debit is atomic with its carrying decision entry and embeds the balance-after (DEF-2):

```ts
export type AdmitVerdict =
  | { kind: 'admit'; reserve: BudgetReserve; dedup?: DedupNote;
      spawnUnitsAfter: number;
      lineage: { logicalTaskId: LogicalTaskId; isNew: boolean; depth: number } }
  | { kind: 'reuse_full'; donor: DonorRef;            // zero live budget reserve (DEF-5)
      spawnUnitsAfter: number;
      lineage: { logicalTaskId: LogicalTaskId; isNew: false; depth: number } }
  | { kind: 'admit_graft'; donor: DonorRef; reserve: BudgetReserve; boot: GraftBoot;
      spawnUnitsAfter: number;
      lineage: { logicalTaskId: LogicalTaskId; isNew: boolean; depth: number } }
  | { kind: 'reject'; reason: AdmitRejectReason };

export type AdmitRejectReason =
  | { code: 'depth' | 'quota' | 'budget' | 'lifetime'
        | 'termination_exhausted' | 'ladder_exceeds_frozen'
        | 'lineage_exhausted' | 'lineage_busy' }
  | { code: 'osc_guard'; spawnKey: SpawnKey; oscillationCount: number };
```

`termination_exhausted` and `ladder_exceeds_frozen` come from the TerminationAccount (section 11); `lineage_exhausted` and `lineage_busy` from lineage folds (section 8); `osc_guard` from the oscillation guard (DEF-5).

### 7.3 Enforced limits and reuse rules

AdmissionController enforces (defaults consolidated in 06-execution-spec.md, Appendix A):

- `maxDepth` (default 1, hard ceiling 4); a child deeper than the frozen D0 is rejected.
- `maxChildrenPerNode` (default 16).
- `childBudgetFraction` (default 0.3) of the parent's remainder MINUS the parent's `finalizeReserve` (DEF-7; section 12.2).
- The engine lifetime cap (default 500, configurable) and `maxTotalSpawns` (default 128, frozen as S0).
- `maxAttemptsPerLogicalTask` (default 8) and the single-live-attempt invariant: at most one running attempt per LogicalTaskId; a competing admit gets `lineage_busy` (DEF-3).
- Hierarchical budget sub-accounts: a child's spend propagates upward to ALL ancestor accounts.

Dedup and reuse-by-reference verdict rules (DEF-5; full journal mechanics in 03-journal-spec.md, section "Abandon, derived skipped, reuse-by-reference and node.link (DEF-5)"):

- SpawnKey is the kernel contentHash of the spawn's root entry; matching is strict byte equality, never fuzzy. Dedup remains a cheap catch of byte-identical repeats; the real cycle barriers are depth, quota, and budget.
- The DedupIndex is a pure fold computed against the fold HEAD at revision-apply time under PlanWriteLock, not against the base snapshot (XF-11). Donors are roots covered by a severing abandon entry (cancel_task compiles to abandon), whose pre-abandon effective root status is not `error`, and which are not exclusively claimed by an earlier `node.link` (first-wins). Live and done nodes NOT covered by a severing entry are never donors: silently aliasing active work is forbidden.
- Exactly four outcomes on a SpawnKey match, computed once live and embedded in the carrying decision entry: (a) `reuse_full` when the donor root's effective status is `ok` or `escalated` (zero live reserve; the reference is shareable); (b) `admit_graft` when the donor was severed in flight with at least one completed paid entry and grafting is safe (isolation `none`/`readonly` always; `worktree` only with a pinned tree); the reserve is the full standard one, no discount, and the claim is exclusive; (c) plain `admit` (fresh) when the donor has zero paid entries or grafting is unsafe, with a `DedupNote` for telemetry; (d) `reject` with `osc_guard` when the oscillation count for this SpawnKey reached `maxOscillationsPerKey` (default 2), surfacing as a typed `plan_revise` error and the non-HITL RevisionGuards chain; the engine never tears the run down.
- A memoized failure (`memoizeOutcome: true`, terminal `error`) is excluded from both `reuse_full` and graft: re-adding a failure means retry intent, handled by the invalidate/retry API (03-journal-spec.md, section "Replay predicate (DEF-1)").
- A linked node inherits the donor's LogicalTaskId, so escalation counters, stall streaks, and lessons count across rebirths and are never reset by re-adoption.
- Cross-version matching projects the CANDIDATE's identity down by the donor entry's hashVersion profile; an incomparable donor is invisible (fresh admit); effort defaults apply only in the fold layer (XF-08).
- Opt-outs: `reuse.enabled: false` on the admission config, `fresh: true` on a specific `add_task`; both are embedded in the decision entry and replay.
- Reclaim never replenishes anything: not budget reserves, not the revision budget, not the oscillation counter (DEF-2). Ancestor totals do not change at link time; the linked node's sub-account reports `inheritedUsd` and `liveUsd` separately.

## 8 Lineage (DEF-3)

LogicalTaskId (LTID) answers "is this the same logical task across rebirths". NodeId remains plan-node identity; the content key remains paid-call identity. The LTID is a ULID minted by the ENGINE (never the model) exactly inside the decision entry that authorizes the spawn. The LTID does NOT enter the child agent scope's content key; lineage lives exclusively in decision-entry payloads, so never-pay-twice (I1) is untouched. Full journal semantics, folds, and legacy canonization (`legacy:` LTIDs) are owned by 03-journal-spec.md, section "Lineage (DEF-3)"; the orchestration-facing rules follow.

### 8.1 Minting and inheritance table

| Rule | Trigger | LTID | relation | causeRef |
|---|---|---|---|---|
| 1 | `add_task` without a lineage block | fresh mint | `first` | none |
| 2 | `add_task` with `lineage.continues` | parent's LTID continues | `respawn` | mandatory: seq of the entry that caused the rebirth (escalation decision with verdict retry, no-progress abort, verify-failed verdict) |
| 3 | `amend_task` | never changes the LTID; the LTID is immutable for a NodeId from `add_task` on | n/a | n/a |
| 4 | ModelLadder rung attempt | inherits the node's LTID | `rung-retry` | the journaled trigger verdict |
| 5 | unpark that restarts the agent (destroyed worktree) | same LTID | `unpark-restart` | the park/unpark record |
| 6 | decomposition children | FRESH LTIDs each | `decompose-child` | the escalation decision; `ancestry` carries the parent LTID chain (length <= maxDepth); the decomposition itself consumes the PARENT LTID's escalation counter |
| 7 | reuse-by-reference | donor's LTID continues via the link entry | per link | the link entry (DEF-5) |

```ts
export type LogicalTaskId = string; // ULID, engine-minted
export type LineageRelation = 'first' | 'respawn' | 'rung-retry' | 'decompose-child' | 'unpark-restart';
export type EntryRef = number;      // canonical EntryRef = seq (XF-03)

export interface LineageRef {
  logicalTaskId: LogicalTaskId;
  relation: LineageRelation;
  attemptOrdinal: number;          // 0-based, journal order, never wall clock
  causeRef?: EntryRef;             // mandatory for every relation except 'first'
  ancestry: LogicalTaskId[];       // decomposition chain, length <= maxDepth
  approachSig: string;             // sha256 hex
  approachSigCoarse: string;       // sha256 hex
  sigVersion: 1;
}
export interface SpawnLineageOpt {
  continues: LogicalTaskId;
  relation?: Exclude<LineageRelation, 'first'>; // default 'respawn'
  causeRef: EntryRef;
}
```

### 8.2 approachSig

Normalization by excluding prose: `approachSigCoarse` = sha256 of the canonical JSON of `{ sigVersion, agentType, toolsetHash, schemaHash, isolation }`; `approachSig` = sha256 of `{ sigVersion, coarse, approachTag }`. The `approachTag` is the slug supplied by the orchestrator in the `approach` field at spawn; normalization: NFC, lowercase, collapse non-alphanumerics to a hyphen, truncate to 32 characters, empty canonicalizes to `'default'`. Prompt prose never enters the signature: paraphrases collide by construction, not by heuristic. The coarse signature feeds the stall detector and the oscillation guard; the full signature keys lessons. With `PlanRunnerOptions.approachVocabulary` set, an out-of-vocabulary tag is rejected with a typed tool error and bounded re-prompt (never run death).

### 8.3 LineageStats and limits

```ts
export type AttemptOutcomeClass =
  | 'ok' | 'escalated' | 'task-error' | 'transient-error'
  | 'no-progress' | 'verify-failed' | 'limit' | 'abandoned';

export interface LineageStats {   // pure fold; rendered in plan_view and WakeDigest, pinned to the wake snapshot
  attemptsUsed: number;
  escalationsUsed: number;
  stallStreak: number;
  approaches: Array<{ approachSig: string; approachTag: string; attempts: number; lastOutcome: AttemptOutcomeClass }>;
}
export interface EscalationLimits {
  maxEscalationsPerLogicalTask: number; // default 2; old name maxEscalationsPerNode rejected by the validator (XF-10)
  maxAttemptsPerLogicalTask: number;    // default 8; monotonically consumed, never replenished
}
```

All counters are pure folds over the journal: `attemptsUsed` counts spawn-authorizing decision entries with the LTID; `escalationsUsed` counts authoritative escalation-decision entries with `countsAgainstLimit = true`; `stallStreak` is the length of the maximal suffix of attempts, in `attemptOrdinal` order, with outcomes in `{task-error, no-progress, verify-failed, limit}`, where transient and environment classes are skipped (they neither extend nor break the suffix), `ok` resets, and `escalated` is neutral. RetryPolicy retries and provider failover under the journal are NOT lineage attempts (one journal entry = one attempt). Folds also read `logicalTaskId` from resolution and abandon entries (XF-04). Exhaustion yields the embedded verdict `lineage_exhausted` with the non-HITL terminating fallback; both limits are monotonically consumed and never replenished, including on amend and tier change.

## 9 RunLedger

Run-scoped, single-writer (ONLY the orchestrator scope writes), journaled, strictly advisory: distilled state for recovery-context quality and replanning. It is never a second source of truth.

### 9.1 Sections

| Section | Authorship | Cap (docs/06 Appendix A) |
|---|---|---|
| mission brief (immutable) | authored, `brief_set` once | 1 |
| facts table with provenance and confidence | authored, `fact_add` / `fact_supersede` | 64 |
| plan revision history with rationale (decision log) | auto-derived fold join | n/a |
| TaskDigest on child completion (never full transcripts), ordered by spawn ordinal | auto-derived (runtime) | n/a |
| lessons, keyed by the MANDATORY pair (logicalTaskId, approachSig) (DEF-3) | authored, `lesson_add` | 32 |
| world-delta index from AgentResult.artifacts | auto-derived fold join | n/a |
| modelObservations (phase 3 only; docs/05) | authored, `observation_add` | 16 |

### 9.2 Authored ops

The authored op vocabulary is CLOSED:

```ts
export type LedgerOp =
  | { op: 'brief_set'; text: string }                       // exactly once per run
  | { op: 'fact_add'; factId: string; text: string;
      provenance: EntryRef[]; confidence: 'low' | 'medium' | 'high' }
  | { op: 'fact_supersede'; factId: string; supersededBy: string;
      text: string; provenance: EntryRef[]; confidence: 'low' | 'medium' | 'high' }
  | { op: 'lesson_add'; key: { logicalTaskId: LogicalTaskId; approachSig: string }; text: string }
  | { op: 'observation_add'; taskClass: string; logicalTaskId: LogicalTaskId;
      tierObserved?: number; outcomeClass?: AttemptOutcomeClass; note: string;
      evidenceRefs: EntryRef[] };                            // phase 3 only; feeds modelObservations
```

A `lesson_add` whose key matches no journaled attempt of that LTID MUST be rejected (DEF-3). Revision history, TaskDigests, and the world-delta index are auto-derived fold joins, never authored ops.

### 9.3 Semantics

- Every authored write is a journaled effect entry of kind `ledger.op`; the VIEW is a pure fold of those ops joined to the journal's task table.
- The journal always wins on what is paid and completed: contradictions render as FLAGGED discrepancies, never as truth.
- `ledgerVersion` was removed from write results (a stable ack or content hash is returned); `ledger_read` is pinned to the turn's snapshot version; fold-global counters never enter the transcript. Distillation lives in the child's scope keyed by task id.
- The `ledger_read` render is bounded by the CHARACTER measure (OQ-04 closed at M10 entry); the committed budget is 65536 chars over the serialized view (06-execution-spec.md, Appendix A). Over budget, rows drop deterministically oldest-first (auto-derived joins before authored sections, the brief last) and every drop renders as a FLAGGED discrepancy line; the section caps stay the primary bound, so under default termination limits the belt never engages.
- Aggressive compaction of the orchestrate role is gated on MEASURED ledger sufficiency (at least one authored revision and a minimum fact count); otherwise the engine falls back to conservative summarize (06-execution-spec.md, section "Agent Runtime binding").
- Stall-triggered replans are hard-bounded per run and MUST exclude transient and environment error classes.
- LedgerExport is a draft-versioned JSON seam (open question: 14-open-questions.md, LedgerExport schema). Rejected: vector stores, multi-writer, cross-run memory; the sole sanctioned cross-run exception is ModelKnowledge (05-model-knowledge-spec.md).

## 10 ModelLadder

Opt-in tiers on the profile or call, ordered cheap to strong.

The ladder type family (`LadderSpec`, `TriggerClass`, `Gate`) is declared once in 04-model-layer-spec.md, section "ModelLadder summary"; this section owns the runtime semantics and never redeclares the types.

```ts
// Declarations: 04-model-layer-spec.md, section "ModelLadder summary".
// LadderSpec { rungs (model, effort?, maxTurns, maxTokens, maxCostUsd?, memoizeOutcome?), startTier, escalateOn, acceptance? }
```

Normative rules:

- Acceptance gates run per attempt. Mechanical gates are artifact-grounded checks by registered named pure profiles; their verdicts journal as decision entries. Judge gates run on the declared rung (or explicit override). Spot-check selection uses `ctx.random` so it journals and replays.
- Role quality floors (04-model-layer-spec.md, section "Role quality floors") forbid weak defaults for code-edit, synthesis, judge, plan, and orchestrate roles.
- The orchestrator never names a model: `spawn_agent` receives only `model_hint.startTier`, clamped to the declared ladder.
- Every rung attempt is an ordinary agent scope whose hash includes the concrete ModelRef: tier N+1 is a NEW content key and one live attempt. All ladder attempts share the LogicalTaskId (relation `rung-retry`) (DEF-3). `rungIndex` per lineage is strictly monotone; there are no demotions and no runtime startTier promotion in v1.
- Every ladder control-flow verdict (verify, judge acceptance, budget-guard refusal on a rung, no-progress abort, spot-check selection) is a decision entry computed once live and replayed by match; the ladder fold consumes ONLY journaled values.
- No-progress and per-rung cap hits journal as a first-class terminal class distinct from user cancellation (otherwise they would fall into `cancelled` and be re-paid on every resume). The no-progress detector heuristic is engine-defined; open question: 14-open-questions.md (no-progress detector).
- Runtime startTier promotion is DEFERRED out of v1 (EXC registry): per-run-only statistics without a cross-run store amplify cost. The v2 path is defined by ModelKnowledge (05-model-knowledge-spec.md): a deterministic promotion table as a pure function of `kb_pinned` bytes and ladder config, from eval-measured claims only.

## 11 TerminationAccount and the termination lemma (DEF-2)

One construction is committed: a single per-run TerminationAccount with an exclusively debit-only API and a limits vector frozen at start, plus the variant function Phi and a termination lemma covering the entire composite escalate-replan-retier loop.

### 11.1 Non-replenishable revision budget

The revision budget is decoupled from plan size; the RevisionGuards option "budget scaled by plan size" is REMOVED. Instead, `maxRevisionsPerRun` is an absolute integer counter per run (default 32), decremented by EXACTLY 1 on every journaled `plan_revise` call, regardless of the number of PlanOps in the diff, guard verdicts, or the auto-rebase outcome. Nothing increments it: TerminationAccount has no credit operation by construction, no journal entry kind carries credit, and `add_task` does not affect the limit. The positive feedback loop "plan growth raises the revision limit" is removed structurally.

### 11.2 Frozen limits

At run admission PlanRunner writes a `termination.init` entry with the frozen vector:

```ts
export interface TerminationLimits {
  maxRevisionsPerRun: number;           // V0, default 32
  maxTotalSpawns: number;               // S0, default 128; debited by AdmissionController on every admitted spawn of any origin
  maxEscalationsPerLogicalTask: number; // E0, default 2, per lineage; renamed, old name rejected (XF-10)
  maxDepth: number;                     // D0, default 1, ceiling 4; static per-branch limit
  kMax: number;                         // maximum declared ladder length per the profile-registry snapshot at admission
  runBudgetUsdCeiling: number;          // B0, immutable after start
  orchestratorCapUsd: number;           // from section 12 (XF-09)
  finalizeReserveUsd: number;           // from section 12 (XF-09)
}
```

Ordering is fixed: `termination.init` is written strictly BEFORE `orchestrator_budget_reserve`, and the reserve entry MUST either match the frozen values or reference the init entry by seq (XF-09). Replay and resume read the limits ONLY from `termination.init`; live config is ignored (a mismatch emits `termination:config-drift`; the journal always wins).

### 11.3 Debit rules

Every debit is atomic with the append of its carrying decision entry, and the balance-after is embedded in the entry:

- (a) `plan_revise`: minus 1 revisionUnit.
- (b) Admitted spawn (orchestrator, `ctx.workflow`, escalation decomposition, rung respawn, reuse link per DEF-5): minus 1 spawnUnit. A NEW lineage receives E0 escalation units and (K_l - 1) rung transitions, where K_l is the profile's ladder length, K_l <= kMax.
- (c) A ladder verdict that raises the rung: minus 1 from `rungsRemaining(lineage)`. There are no demotions and no runtime startTier promotion in v1; `rungIndex` per lineage is strictly monotone.
- (d) An escalation decision with `countsAgainstLimit = true`, including EACH lineage inside a class-level decision, and a timeout `defaultDecision`: minus 1 from `escalationUnits(lineage)`. The debit is conditioned on the `countsAgainstLimit` flag embedded in the decision entry (DEF-3): kinds `scope_different` and `blocked_with_evidence` do not debit, but they are bounded by spawnUnits and revisionUnits, because any repeat of them requires a new admitted spawn or a new revision (this clause is part of the lemma).
- (e) Depth: `admit()` rejects a child with depth greater than D0.
- (f) Dollars: the admission reserve, the per-turn guard, and the AbortSignal ceiling B0; spend grows monotonically; the ceiling is not raised by ANY API; an HITL decision cannot top it up; overshoot is bounded by one turn per in-flight agent.

Exhaustion: a debit below zero is not executed; the engine writes `termination.denied` strictly BEFORE surfacing the typed error (`revision_budget_exhausted` and analogues); for decompositions and respawns the denial maps to the existing non-HITL terminating fallbacks.

### 11.4 Termination lemma

Let `C = E0 + kMax` and

```
Phi = revisionUnitsRemaining
    + C * spawnUnitsRemaining
    + sum over live lineages of (escalationUnitsRemaining + rungsRemaining)
```

`Phi0 = V0 + C * S0` is finite and fixed in `termination.init`. Claims:

- (a) Every edge of the composite loop (verify-failed raises a rung; a limit on a rung produces an escalation; an escalation wakes a replan; a replan or accepted decomposition produces a spawn; the child escalates again) contains exactly ONE debiting decision entry, and every debit strictly decreases Phi by at least 1. For a spawn that creates a lineage the decrease equals `C - (E0 + K_l - 1) = kMax - K_l + 1 >= 1`.
- (b) No operation increases Phi: the API is debit-only, no entry kind carries credit, and `termination.init` is frozen. Replay-strict recomputes the debit fold and checks it against the embedded balances.
- (c) Therefore the loop makes at most Phi0 iterations.
- (d) Non-debiting activity between iterations (agent turns, `plan_view`, idle wakes, repeated denied calls) is bounded by per-rung `maxTurns`/`maxTokens`, the orchestrator's own `maxTurns` and sub-account (section 12: the number of wakes is at most `ceil((cap - reserve) / minimal turn cost)`, an explicit lemma resource (XF-09)), and the immutable B0.

Conclusion: every run reaches a terminal outcome (`ok`, `exhausted`, escalated root, or `suspended` on awaitExternal) in a finite number of live calls and at spend no higher than B0 plus bounded overshoot. Integer counters give termination even at zero model cost (FakeAdapter, cassettes); dollars remain an independent safety ceiling, never the only argument.

### 11.5 API

```ts
export type TerminationResource = 'revisionUnits' | 'spawnUnits' | 'escalationUnits' | 'rungs' | 'depth';
export interface LineageCounters { escalationUnitsRemaining: number; rungsRemaining: number }
export interface TerminationAccountSnapshot {
  revisionUnitsRemaining: number;
  spawnUnitsRemaining: number;
  perLineage: Record<LogicalTaskId, LineageCounters>;
  phi: number; // variant function, a pure fold over the journal
}
export interface TerminationAccount {  // debit ONLY; no credit operation exists by construction
  snapshot(): TerminationAccountSnapshot;
  /** Atomic with journaling of the carrying decision entry; underflow yields denied. */
  debit(resource: TerminationResource, lineage?: LogicalTaskId): DebitResult;
}
export type DebitResult =
  | { ok: true; balanceAfter: number }
  | { ok: false; deniedEntryRef: EntryRef; resource: TerminationResource };
```

Telemetry (naming per 09-observability-testing-spec.md): `termination:debit`, `termination:denied`, `termination:config-drift` events; telemetry, never identity.

### 11.6 Journal semantics

- `termination.init`: one per run, in the root scope, strictly BEFORE PlanRunner's first scheduling entry and strictly BEFORE `orchestrator_budget_reserve`. Fields: `limits` (the whole TerminationLimits), `profileRegistrySnapshotHash`, `phiInitial`, `hashVersion`. Replay: forward-matched; divergence from live config emits `termination:config-drift`; the journal always wins.
- `termination.denied`: written when a debit would go below zero, strictly BEFORE the error surfaces. Fields: `resource`, `logicalTaskId?`, `requestedByRef` (seq of the calling tool-call or EscalationReport), `reasonCode`, `snapshotAfter`. Replay: matched; the error is re-issued from the entry; zero live calls.
- Extensions of existing decision entries (the debiting records): `plan.revision` gains `revisionUnitsAfter` and `debits[]`; `escalation.decision` gains `logicalTaskId` and `escalationUnitsAfter` (the class-level variant carries an array of `{ logicalTaskId, escalationUnitsAfter }` pairs); `ladder.verdict` gains `logicalTaskId`, `rungIndexAfter`, `rungsRemainingAfter`; the spawn-admission decision entry gains `spawnUnitsAfter` and `lineage { logicalTaskId, isNew, depth }`.
- Ordering: a debiting decision entry precedes ALL effects it authorizes; the debit is atomic with the append. Under a resolution race on one suspended entry the DEF-4 semantics apply: first-closing-wins fold, only the winning closing entry carries the debit; the persisted `noDebit` field is REMOVED: the applied/noop classification is never persisted; the losing attempt classifies as `noop` by the pure fold and does not debit by construction (XF-05).
- Live: the engine debits the in-memory account, writes the entry with the balance-after, then applies effects. Replay: balances are authoritative from the entries, live config is never consulted, denials are re-issued from `termination.denied`; replay-strict recomputes the fold of all debits from `termination.init` and checks the embedded balances; a divergence is a journal integrity error at exactly the diverging entry. Entry identity is untouched; the Storage SPI is unchanged (`termination.init` and `termination.denied` are ordinary appends over the 5-method JournalStore).

### 11.7 Edge-case rules

- A `plan_revise` rejected by RevisionGuards or fully dropped by auto-rebase STILL debits a revisionUnit (the decrement binds to the fact of journaling `plan.revision`; otherwise conflict spam would be a free retry). Schema-invalid calls that never reach the journal carry no debit but are bounded by the bounded re-prompt.
- An escalation proposing a decomposition at `revisionUnitsRemaining = 0`: the decomposition spends NO revisionUnits (it is bounded by its lineage's escalationUnits, spawnUnits, and depth). An orchestrator `add_task` at zero is rejected with `revision_budget_exhausted`. Revisions cannot be laundered through escalations: children have no `plan_revise`, and every counted escalation debits E.
- Resume after the embedder doubled `maxRevisionsPerRun` in live config: `termination.init` wins, balances continue from the journal, `termination:config-drift` is emitted. Dynamic budget top-up via restart is excluded by construction.
- A class-level EscalationDecision closing N correlated reports: ONE decision entry carries the array of per-lineage debits; each affected lineage loses exactly 1 escalationUnit. A storm costs one expensive turn but cannot loop at the price of one unit.
- Race of a timeout `defaultDecision` against a live resolution: first-wins per DEF-4; exactly one escalationUnits debit on any store, including queue mode over fencing epochs; the losing attempt is journaled and classified noop.
- Cancel/abandon oscillation with re-add of an equivalent branch: each cycle costs at least 1 revisionUnit plus 1 spawnUnit per respawn; reuse-by-reference returns no units and spends no dollars; lineage counters do NOT reset on re-add under the same LogicalTaskId.
- A profile with a ladder longer than kMax registered after run start: `admit()` rejects such a spawn with `ladder_exceeds_frozen` (otherwise the weight C would lose correctness and Phi could grow). The new profile is available to subsequent runs.
- An orchestrator spamming `plan_revise` and `plan_view` instead of `finish` after counters are exhausted: denied calls do not debit, but every turn spends its `maxTurns` and the orchestrator's own sub-account (section 12); the WakeDigest carries the TerminationAccount snapshot; `wait_for_events` with no possible trigger errors immediately. Worst case: a typed limit and the non-HITL terminating fallback.

Breaking-change record (registered in the v0.8.0 rows of 12-release-versioning.md, section "Pre-1.0 convention"): the plan-size-scaled revision budget option is removed without deprecation; `plan_revise` result and error schemas widen and WakeDigest gains the mandatory `termination` field (schemaHash and toolsetHash of orchestrator scopes change; affected VCR cassettes invalidate); B0 is declared immutable (code that mutated the run budget after start or expected HITL top-up breaks deliberately); the widened AdmitVerdict union breaks exhaustive switches at compile time.

Defect cassettes for this section (09-observability-testing-spec.md): `revision-exhaustion`, `combined-loop-descent`, `config-drift-resume`, `class-storm-single-turn`, `oscillation-bounded`, `race-timeout-vs-live`.

## 12 Orchestrator budget (DEF-7)

### 12.1 Sub-account

The PlanRunner orchestrator gets its OWN budget sub-account in the same hierarchical account tree as the children: under the run's root account, a `scope: 'orchestrator'` account opens beside the `plan/NodeId` accounts. All LLM turns of the orchestrator agent itself (role `orchestrate`) charge this account, including bounded re-prompt of structured output and compaction of its own transcript. `plan_view`, `ledger_read`, and WakeDigest assembly are pure folds without LLM and cost nothing; TaskDigest distillation lives in the child scope and charges the child's account.

```ts
export interface BudgetAccount {
  scope: string;                 // 'run' | 'orchestrator' | 'plan/<NodeId>' | a decomposition ancestor scope
  ceilingUsd: number;
  spentUsd: number;              // pure fold over usage of terminal journal entries
  committedReserveUsd: number;   // layer-1 reserves, INCLUDING finalizeReserveUsd
  finalizeReserveUsd: number;    // the part of committedReserve untouchable by admission
  parentScope?: string;          // upward spend propagation: unchanged
}
export interface OrchestratorBudgetSpec { // resolved via call override > profile (orchestrate) > engine default
  capUsd?: number;
  capFraction?: number;          // default 0.2; effectiveCap = min of the given values
  finalizeReserveUsd?: number;   // explicit reserve; otherwise derived from finalizeTurns and pricing
  finalizeTurns?: number;        // default 2
  atCap?: 'finish-with-partial' | 'fail-run'; // default 'finish-with-partial'
}
```

### 12.2 Cap and reserve

- `effectiveCapUsd = min(capUsd, capFraction * runCeilingUsd)`; default `capFraction` 0.2. PlanRunner MUST refuse to start with a typed `OrchestratorCapConfigError` BEFORE the first LLM call (and before any journal entries) if the cap is unresolvable (a run with no USD ceiling and no explicit `capUsd`) or `effectiveCap < finalizeReserve`. An uncapped orchestrator was precisely the defect; opting out is explicit only (`capFraction` up to 1.0 inclusive, with a telemetry warning). The error applies to both orchestrate surfaces, `orchestrate(engine, ...)` and `ctx.orchestrate` (06-execution-spec.md, section "Modes and entry points").
- At orchestrator admission the engine writes ONE decision entry `orchestrator_budget_reserve` strictly AFTER `termination.init` (XF-09) and strictly BEFORE the orchestrator's first agent entry, computing `finalizeReserveUsd` (explicit, or `finalizeTurns` times the per-turn cost estimate from the price of the resolved orchestrate model; default `finalizeTurns` 2) and fixing both quantities in ABSOLUTE dollars. Replay forward-matches the entry and never re-evaluates cap or reserve: a price-table change, ceiling change, or library upgrade at resume does not move the fixed numbers.
- The reserve registers as `committedReserve` simultaneously in the orchestrator account AND the run root account: admission layer 1 never lets any spawn eat the finalization money, so the guarantee holds even against whole-run exhaustion.
- Reserve-floor generalization: every parent account created by AdmissionController for a decomposition gets the same `finalizeReserve`, and `childBudgetFraction` is computed from the parent remainder MINUS its reserve (this closes ancestor starvation with the same mechanism).

### 12.3 Enforcement

Enforcement reuses the three existing budget layers (06-execution-spec.md, section "Three-layer budget"): layer 1, before delivering each WakeDigest the engine checks `orchSpent + turnReserve > effectiveCap - finalizeReserve`; crossing the soft boundary yields forced finalization instead of a normal wake. Layer 2: the orchestrator's per-turn guard against its sub-account. Layer 3: the hard account ceiling equals the whole `effectiveCap`; turns streaming past it are cut by AbortSignal with `usageApprox: true`; overshoot is bounded by one turn.

### 12.4 At-cap freeze protocol

The non-HITL fallback `atCap` defaults to `'finish-with-partial'` (sole alternative `'fail-run'`). The engine writes exactly ONE decision entry `orchestrator_budget_cap` strictly BEFORE any effects, then:

- (a) The plan freezes for ADAPTATION but not for WORK: already admitted nodes run to completion, running children are not killed (killing overpays), new revisions are impossible. The cap decision enters the section 3.6 conflict table as an engine-authored mutation: an in-flight PlanOp against a pre-cap snapshot drops with a journaled no-op, reason `plan_frozen`.
- (b) All wake triggers except quiescence and run-abort are disarmed.
- (c) Flavor B escalations resolve immediately with a journaled `defaultDecision` (a resolution entry) referencing the cap decision; Flavor A reports flow into digests without a wake; lineage counters and class-level decisions keep applying unchanged.
- (d) On quiescence the orchestrator gets a FINAL wake, paid from the reserve, with a restricted toolset of the single tool `finish` (a different `toolsetHash`, deterministically derived from the journaled cap decision) and a limit of `finalizeTurns` turns. A successful `finish` yields outcome `ok` with a `forcedFinish` mark in the CostReport.

If `finish` fails (schema-exhausted after bounded re-prompt, cut by the ceiling, turns exhausted), the engine writes `orchestrator_finalize_fallback` and SYNTHESIZES a deterministic partial result by a pure fold over the plan state, TaskDigests, and the ledger render, without a single LLM call; outcome `exhausted` with the partial value (exhaustion is never null).

```ts
export type OrchestratorDecisionPayload =   // existing kind 'decision'; NO new kinds
  | { decisionType: 'orchestrator_budget_reserve';
      capUsd: number; finalizeReserveUsd: number; finalizeTurns: number;
      source: 'call' | 'profile' | 'engine'; pricingVersion: string;
      terminationInitRef?: EntryRef }       // seq of termination.init (XF-09)
  | { decisionType: 'orchestrator_budget_cap';
      spentUsd: number; capUsd: number; finalizeReserveUsd: number;
      cause: 'pre-wake' | 'per-turn';
      snapshot: { planHash: string; ledgerSnapshot: number; wakeOrdinal: number };
      fallback: 'finish-with-partial' | 'fail-run'; disarmedTriggers: string[] }
  | { decisionType: 'orchestrator_finalize_fallback';
      reason: 'schema-exhausted' | 'ceiling-abort' | 'turns-exhausted';
      turnsUsed: number;
      foldParams: { planHash: string; digestOrdinalMax: number } };

export class OrchestratorCapConfigError extends RulvarError {} // cap unresolvable, or effectiveCap < finalizeReserve
```

Journal semantics: all three records use the existing kind `decision` with new `decisionType` values, preserving the kernel amendment count of DEF-1 and leaving the replay predicate untouched. Freeze effects (trigger disarming, refusal to schedule wakes, immediate defaultDecisions, the restricted final toolset) are derived from the cap entry by a pure fold: a crash between the entry and its effects is ordinary roll-forward, and a second cap decision never arises. The final wake is an ordinary agent entry whose content key includes the restricted toolsetHash and a prompt deterministically derived from the cap decision and the pinned WakeDigest snapshot: on replay it forward-matches by status `ok` and is never restarted. Releasing an unused reserve on a normal `finish` is a fold consequence of the orchestrator's terminal entry and needs no separate record. All accounts and the orchestrator-share metric fold over usage of terminal entries in spawn-ordinal order; wall clock participates nowhere.

### 12.5 Passive visibility

```ts
export interface WakeBudgetBlock {
  runSpentUsd: number; runCeilingUsd: number;
  orchestratorSpentUsd: number; orchestratorCapUsd: number;
  finalizeReserveUsd: number;
  orchestratorShare: number;   // orchestratorSpentUsd / max(runSpentUsd, epsilon); epsilon in docs/06 Appendix A
  softWarning: boolean;        // true at >= 0.8 * (cap - reserve)
}
```

There is NO wake trigger on the orchestrator's own budget: waking the orchestrator because of its own spend means spending more. Telemetry: an `orchestrator:budget` event at every wake boundary and at the cap; orchestrator-share in the Event Stream; CostReport gains `byRole` and an `orchestrator` block (09-observability-testing-spec.md).

### 12.6 Edge-case rules

- Greedy children eat the run ceiling before finalization: the reserve is committed in the root account from the reserve decision on; layer 1 rejects spawns encroaching on it; the final wake stays paid even when the working part of the plan ends `exhausted`.
- After the freeze quiescence is unreachable (a child hangs on `awaitExternal`): the run ends `suspended`; on resume the frozen state re-derives from the cap decision; once the external input resolves, quiescence fires normally.
- After the freeze a node is blocked by a failed dependency and `waive_dep` is unavailable: the node never becomes ready, quiescence (nothing running and nothing ready) fires normally; the node finalizes as blocked, its reserve is released by the fold, and the final `finish` sees its status in `plan_view`.
- Nested PlanRunner (`ctx.workflow` with its own `ctx.orchestrate`): each instance gets its own sub-account under the parent scope's account; the inner `effectiveCap` is additionally clamped by the parent remainder minus the parent's `finalizeReserve`; the inner reserve propagates upward as ordinary `committedReserve`.
- Queue mode: the soft-boundary check and the cap-decision write are performed by the lease holder under the fencing epoch; the cap decision is exactly one; decide-once is reused without any new CAS primitive.

### 12.7 H-OrchShare

The claim "orchestrate/plan is 5-15 percent of run spend" is NOT a fact; it is the dogfood telemetry hypothesis H-OrchShare (registered in 01-requirements.md): in fan-out runs the median orchestrator-share lies in the 5-15 percent range and p90 does not exceed 25 percent; verified by the metric distribution (p50/p90 with slices by spawn count, escalation rate, and the price gap of the orchestrate model to worker models). The default `capFraction` 0.2 is revisited against the actual p90; the "almost free" phrasing returns only if the hypothesis is confirmed.

Defect cassettes for this section (09-observability-testing-spec.md): `cap-freeze-then-finish`, `crash-between-cap-and-effects`, `reserve-survives-run-exhaustion`, `finalize-fallback-synthesized`, `escalation-storm-frozen`, `queue-failover-during-forced-finish`.

## 13 Cross-fix mapping

This mapping table is the canonical XF-01..XF-12 registry (README.md, section "Shared ID schemes", and 00-overview.md, section "Defect-fix provenance", both defer to it); on any numbering discrepancy this table wins. Amendments touching this document:

| ID | Amendment | Carried in |
|---|---|---|
| XF-01 | Single abandon mechanism: kind `abandon` (DEF-4 form) is the only severing record; `skipped` is never stored | docs/03; consumed here by sections 3.6, 7.3 |
| XF-02 | Single journal-format mechanism: per-entry hashVersion; sole failure JournalCompatibilityError | docs/03; consumed by sections 3.4, 7.3 |
| XF-03 | Canonical EntryRef = seq; causeRef, abandon refs, and donor refs are seq numbers | sections 4, 8; docs/03 |
| XF-04 | ResolutionPayload and AbandonPayload carry logicalTaskId; escalation resolutions carry countsAgainstLimit | sections 6.5, 8.3; docs/03 |
| XF-05 | Persisted noDebit removed: applied/noop classification is never persisted; only the first-closing record debits | sections 6.5, 11.6 |
| XF-06 | Escalation count unit = authoritative escalation-decision entries with countsAgainstLimit = true | sections 6.3, 6.5, 11.3 |
| XF-07 | Timer race: every resolution attempt appends via ResolutionArbiter; PlanWriteLock serializes only scope "plan"; the resolution precedes the plan.decision referencing it | sections 3.2, 3.7 |
| XF-08 | Cross-version SpawnKey matching projects the candidate down by the donor entry's hashVersion; incomparable donors are invisible; effort defaults fold-layer only | section 7.3; docs/03 |
| XF-09 | TerminationLimits gains orchestratorCapUsd and finalizeReserveUsd; termination.init strictly precedes orchestrator_budget_reserve with matching values or a seq back-reference | sections 11.2, 12.2 |
| XF-10 | maxEscalationsPerNode renamed to maxEscalationsPerLogicalTask (validator rejects the old name); the lemma gains the explicit wake-count bound | sections 6.5, 11.2, 11.4, 12.3 |
| XF-11 | Plan surface canonicalized: kinds plan.revision/plan.decision; single PlanReviseResult (DEF-8 form plus revisionUnitsRemaining); single AdmitVerdict union; DedupIndex computed against the fold head under PlanWriteLock | sections 3.3, 3.5, 7.2, 7.3 |
| XF-12 | All WakeDigest schema deltas (planHash/digestSeq/coversToOrdinal, termination, budget, reuse stats) land as one coordinated change inside the hash-v2 profile | section 5 |
