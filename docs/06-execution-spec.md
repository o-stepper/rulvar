# Execution spec

Status: Ready for implementation
Version: 0.2.0-docs
Date: 2026-07-06
Purpose: Normative specification of the workflow execution model: defineWorkflow and the canonical Ctx API, the concurrency scheduler, the three-layer budget including the orchestrator cap and finalize reserve (DEF-7), usage limits, script runners, the three orchestration modes, and the engine and ops API.

Requirements for this document live in the FR-2xx block of 01-requirements.md (section "FR registry"). Invariants I1-I6 are stated in 00-overview.md (section "Invariants"). Journal identity, the replay predicate, and suspension are owned by 03-journal-spec.md; this document never redefines them.

## 1 Execution model

A workflow is an ordinary async function `(ctx, args) => result` registered through `defineWorkflow`. All primitives are methods of the injected `ctx`; there are no module-level globals and no singletons. The engine creates a fresh `ctx` per run, so concurrent runs, nested workflows, and mocking are safe inside a host application (invariant I6, embeddability).

Normative rules:

- Execution is single pass: a run's body executes exactly once from top to bottom per process attempt. Replay happens only on resume after a crash, an edit, or a suspension. There is NO per-step re-entry of the body (a deliberate anti-Inngest decision: no O(n^2) re-execution).
- Workflow modules MUST NOT hold module state that influences execution. The engine MUST NOT read or write any module-level registry; every registry is per engine (see section 10).
- On resume, previously journaled calls are satisfied by scoped forward-matching against the journal per the replay disposition table in 03-journal-spec.md (section "Replay predicate (DEF-1)"). Code above the Journal Kernel never re-implements that predicate.
- Nesting via `ctx.workflow` is governed by the AdmissionController with a configurable `maxDepth` (default 1, hard ceiling 4). A child inherits budget through a hierarchical sub-account and a nested journal scope (see section 5.4 and 03-journal-spec.md, section "Scope-path grammar").

```ts
function defineWorkflow<A, R, P extends ErrorPolicy = 'strict'>(
  meta: { name: string; args?: SchemaSpec<A>; errorPolicy?: P },
  body: (ctx: Ctx<P>, args: A) => Promise<R>
): Workflow<A, R>;

type ErrorPolicy = 'strict' | 'lenient';
```

`Workflow<A, R>` is a closure value and MUST only run in process (InProcessRunner). `CompiledWorkflow` is source-backed and is the only form admissible to the worker sandbox; the type split makes feeding a closure to the sandbox impossible at compile time (see section 8).

## 2 Canonical Ctx interface

This section is the complete, normative authoring surface. Anything absent here is not part of `Ctx` in v1.

```ts
interface Ctx<P extends ErrorPolicy = 'strict'> {
  // -- model spawns -------------------------------------------------------
  agent<S extends SchemaSpec>(
    prompt: string,
    o: AgentOpts<S> & { result: 'full' }
  ): Promise<AgentResult<Out<S>>>;
  agent<S extends SchemaSpec>(
    prompt: string,
    o: AgentOpts<S> & { onError: 'throw' }
  ): Promise<Out<S>>;
  agent<S extends SchemaSpec>(
    prompt: string,
    o?: AgentOpts<S>
  ): Promise<P extends 'lenient' ? Out<S> | null : Out<S>>;

  // -- composition --------------------------------------------------------
  parallel<T>(
    tasks: Array<() => Promise<T>>,
    o?: { settle?: false; abortSiblings?: boolean }
  ): Promise<T[]>;
  parallel<T>(
    tasks: Array<() => Promise<T>>,
    o: { settle: true }
  ): Promise<Settled<T>[]>;

  pipeline<I, A, B>(
    items: I[], s1: Stage<I, A>, s2: Stage<A, B>,
    o?: { onItemError?: 'drop' | 'throw' }
  ): Promise<B[]>; // overloads exist for 1 through 6 stages
  pipeline<I, A, B>(
    items: I[], s1: Stage<I, A>, s2: Stage<A, B>,
    o: { onItemError: 'collect' }
  ): Promise<{ results: B[]; dropped: DroppedItem[] }>;

  step<T extends Json>(
    label: string,
    fn: () => Promise<T>,
    o?: { deps?: Json[]; key?: string }
  ): Promise<T>;

  workflow<A2, R2>(
    child: Workflow<A2, R2> | CompiledWorkflow | string,
    args: A2
  ): Promise<R2>;

  orchestrate(goal: string, o?: OrchestrateOptions): Promise<unknown>;

  // -- external input -----------------------------------------------------
  awaitExternal<T>(
    key: string,
    o?: { schema?: SchemaSpec<T>; prompt?: string }
  ): Promise<T>;

  // -- structure, telemetry, summaries ------------------------------------
  phase<T>(name: string, fn: () => Promise<T>): Promise<T>;
  log(level: 'debug' | 'info' | 'warn' | 'error', msg: string, data?: Json): void;
  brief(o?: BriefOpts): Promise<string>;

  // -- budget --------------------------------------------------------------
  budget: { spent(): Spend; remaining(): Spend | null };

  // -- deterministic shims -------------------------------------------------
  now(): number;
  random(key?: string): number;
  uuid(): string;
}

type Stage<I, O> = (item: I) => Promise<O>;
type Spend = { usd: number; usage: Usage; agentsSpawned: number };
interface BriefOpts { focus?: string; model?: ModelSpec }
```

`SchemaSpec`, `Out<S>`, and the three schema forms are owned by 08-tools-permissions-spec.md (section "SchemaSpec"). `ModelSpec`, `Effort`, and `InvocationRole` are owned by 04-model-layer-spec.md.

### 2.1 ctx.agent and AgentOpts

```ts
interface AgentOpts<S extends SchemaSpec = SchemaSpec> {
  // identity-bearing fields (exact IdentityInput: 03-journal-spec.md,
  // section "Identity model (DEF-6 framing)")
  agentType?: string;                                  // profile name
  model?: ModelSpec;                                   // overrides all roles at once
  routing?: Partial<Record<InvocationRole, ModelSpec>>; // per-role, wins over profile.routing
  effort?: Effort;                                     // canonical effort, part of identity
  schema?: S;                                          // schemaHash enters identity
  tools?: Array<ToolDef | ToolSource | string>;        // toolsetHash enters identity
  isolation?: IsolationSpec;                           // docs/08, enters identity
  key?: string;                                        // explicit discriminator mixed into the content key

  // policy fields, excluded from identity
  onError?: 'throw' | 'null';
  retry?: RetryPolicy;                                 // docs/04, runs under the journal
  replay?: 'cache' | 'never';                          // default: scoped forward-matching
  memoizeOutcome?: boolean;                            // default false; error/limit only, never cancelled
  escalation?: EscalationOptions;                      // opt-in; without it 'escalated' cannot be produced
  lineage?: LineageRef;                                // docs/07 (DEF-3)
  estCost?: number;                                    // admission reserve hint (USD)
  limits?: UsageLimits;                                // section 6
  ladder?: LadderSpec;                                 // docs/07 (ModelLadder)
  result?: 'value' | 'full';                           // default 'value'

  // telemetry only
  label?: string;
  stream?: boolean;                                    // enables agent:stream delta events
}
```

The identity split is normative and owned by 03-journal-spec.md: `kind`, `agentType`, the requested `modelSpec` including canonical effort, the prompt, `schemaHash`, `toolsetHash`, and `isolation` enter the content key; `label`, phase, `onError`, `retry`, `replay`, `memoizeOutcome`, `lineage`, `estCost`, `limits`, `result`, `stream`, and `spanId` do not. Because fallback keys hash the REQUESTED spec, a transport failover changes only `servedBy` and never the content key (04-model-layer-spec.md, section "RetryPolicy under the journal").

Return semantics per terminal status:

- `ok`: the value overloads resolve with `Out<S>`.
- `error`: `onError: 'throw'` (the strict default) rejects with the typed `AgentError`; `onError: 'null'` resolves with `null` AND the engine MUST append a `DroppedItem` to `run.dropped` so the loss is never silent (see section 3).
- `limit` and `cancelled`: surfaced through the same `onError` policy as `error` in the value overloads (the paid partial work remains addressable via the journal and transcript). Inside `ctx.parallel`, `limit` is a settled outcome, not an error (section 4).
- `escalated`: never an error. Delivery rules are in section 2.10.
- `skipped` is a derived status and is only observable through `{ result: 'full' }` or `Settled<T>` during replay of abandoned branches (03-journal-spec.md, section "Abandon, derived skipped, and reuse-by-reference (DEF-5)").

With `{ result: 'full' }` the call resolves with the complete `AgentResult<Out<S>>` for every terminal status and never rejects with an `AgentError`; callers branch on `status`. The only exception is `BudgetExhaustedError`, which all ctx primitives throw uniformly at the run ceiling (section 5.7).

```ts
export type AgentStatus = 'ok' | 'error' | 'limit' | 'cancelled' | 'skipped' | 'escalated';

export interface AgentResult<T> {
  status: AgentStatus;
  output: T | null;
  usage: Usage; costUsd: number; turns: number;
  transcriptRef: string; artifacts?: Artifact[];
  error?: AgentError;
  escalation?: EscalationReport; // present if and only if status === 'escalated'
}
type AgentError = {
  kind: 'transport' | 'rate-limit' | 'schema-mismatch' | 'tool' | 'budget' | 'terminal';
  retryable: boolean; retryAfterMs?: number; issues?: Issue[];
};
export type EscalatedResult<T> = AgentResult<T> & { status: 'escalated'; escalation: EscalationReport };
export function isEscalated<T>(r: AgentResult<T>): r is EscalatedResult<T>;

// Artifact: the normative shape of AgentResult.artifacts entries. Consumed by
// worktree collect() (08-tools-permissions-spec.md, section "Isolation and
// worktree lifecycle"), EscalationReport.salvage (07-adaptive-orchestration-spec.md,
// section "EscalationProtocol"), TaskDigest.artifactsIndex (WakeDigest), the
// RunLedger world-delta index, and mechanical acceptance gates.
export interface Artifact {
  id: string;                                // stable within the result; TaskDigest.artifactsIndex references these ids
  kind: 'file' | 'patch' | 'json' | 'text';  // closed in v1
  label?: string;                            // telemetry only
  files?: string[];                          // changed-file list (kind 'patch': worktree collect())
  ref?: string;                              // TranscriptStore blob ref for offloaded content (e.g. the worktree patch)
  data?: Json;                               // inline JSON content for small values
}
```

Artifact rules: an Artifact MUST be journal-compatible JSON (it rides the agent terminal payload); exactly one of `ref` and `data` carries the content; content larger than the journal soft-warn threshold (Appendix A) SHOULD be offloaded to TranscriptStore via `ref`. Worktree `collect()` produces one `kind: 'patch'` artifact whose `files` lists changed paths and whose `ref` points at the stored patch. `Issue` in `AgentError.issues` is the vendored Standard Schema issue shape `{ message: string; path?: ReadonlyArray<PropertyKey | { key: PropertyKey }> }` (08-tools-permissions-spec.md, section "SchemaSpec").

`AgentStatus` gained `'escalated'` as the flagged BREAKING change of v0.4.0 (DEF-1; release policy in 12-release-versioning.md, section "Pre-1.0 convention"). Status production is gated by opt-in: an agent spawned without `escalation` config physically cannot return `escalated`.

### 2.2 ctx.parallel and Settled

`parallel` runs the task thunks concurrently under the scheduler (section 4) and resolves with results in SOURCE order regardless of completion order. Each branch is journaled as it completes; matching stays stable because journal matching is scoped and insertion-stable (03-journal-spec.md, section "Scoped forward-matching").

`Settled<T>` is the discriminated union over `AgentStatus` carrying the underlying `AgentResult` where one exists:

```ts
type Settled<T> =
  | { status: 'ok';        value: T;            result?: AgentResult<unknown> }
  | { status: 'error';     error: WireError;    result?: AgentResult<unknown> }
  | { status: 'limit';                          result: AgentResult<unknown> }
  | { status: 'cancelled';                      result?: AgentResult<unknown> }
  | { status: 'skipped';                        result: AgentResult<unknown> }
  | { status: 'escalated';                      result: EscalatedResult<unknown> };
```

When a branch body performs several ctx calls, the settled status is derived from the event that terminated the branch: a thrown `AgentError` maps to the status of its kind, any other exception maps to `error`, and `result` is present when the terminating event was produced by a single agent spawn. `limit`, `skipped`, and `escalated` can only originate from agent spawns, so `result` is required there.

### 2.3 ctx.pipeline

`pipeline` streams items through the stages with no inter-stage barrier: item N may be in stage 2 while item N+1 is in stage 1. Stage applications journal per `(stageIndex, itemIndex)` scope (03-journal-spec.md, section "Scope-path grammar"). `onItemError` defaults to `'drop'`: a failing stage drops the item into `run.dropped` with the full error and the pipeline continues. `'throw'` rejects the pipeline with the first stage error. `'collect'` behaves like `'drop'` but additionally returns the dropped items alongside the results, typed via the dedicated overload.

### 2.4 ctx.step

`step` journals an arbitrary host computation as a `step` entry so it is never paid twice (invariant I1). `deps` enter the content key exactly like React `useMemo` dependencies: changing `deps` produces a new key and a live re-execution; `key` overrides label-based identity entirely. The return value MUST be JSON-serializable; a non-serializable value raises the typed `NonSerializableValueError` at the call site (error registry: 02-architecture.md, section "Error taxonomy").

Placement of `fn`: under InProcessRunner, `fn` executes on the host in process. Under WorkerSandboxRunner, `fn` executes INSIDE the worker and only its JSON result crosses the JSON-RPC boundary to the host for journaling (section 8.3).

### 2.5 ctx.workflow

Runs a child workflow under the AdmissionController. The child gets a nested journal scope (registered name plus ordinal) and a hierarchical budget sub-account; its spend propagates to all ancestors up to the run root (section 5.4). Exceeding a structural limit (`maxDepth`, `maxTotalSpawns`) returns a typed error to the caller (or an admission rejection verdict to an orchestrator) and MUST NOT tear down the run (07-adaptive-orchestration-spec.md, section "AdmissionController").

The string form `ctx.workflow('name', args)` resolves against the per-engine workflow registry (section 10.4) and is the ONLY form available inside the worker sandbox, mirroring tools-by-profile-name.

### 2.6 ctx.orchestrate

`ctx.orchestrate(goal, opts)` and the top-level `orchestrate(engine, goal, opts)` (section 9.3) are two surfaces over ONE implementation. The nested form runs under the AdmissionController `maxDepth`; its orchestrator budget cap is additionally clamped by the parent account remainder minus the parent `finalizeReserveUsd` (DEF-7, section 5.5). `OrchestratorCapConfigError` applies to both surfaces and is thrown before the first LLM call and before any journal entry.

### 2.7 ctx.awaitExternal

Suspends the calling position on a journaled suspended entry keyed by `key` until an external resolution arrives (03-journal-spec.md, section "Suspension and resolutions (DEF-4)"). When every in-flight branch of a run is blocked on suspensions, the run completes with status `suspended` and `RunOutcome.pending` lists the open keys.

- `schema`, when present, validates the resolution value; an invalid value is rejected with the typed `InvalidResolutionError` and the entry stays suspended.
- `prompt` is display metadata for operators (CLI/TUI, server UI); it does not enter identity.
- `awaitExternal` has NO deadline in v1. `deadlineAt` exists only on approval suspensions and Flavor B escalations (03-journal-spec.md, section "Suspension and resolutions (DEF-4)"; 07-adaptive-orchestration-spec.md, section "EscalationProtocol").

Resolution channels and their journaled `by` values are enumerated in 03-journal-spec.md (resolution source mapping table): `RunHandle.resolveExternal`, the HTTP endpoint `POST /runs/:id/external/:key`, interactive CLI/TUI action, timers, class-level decisions, quiescence, and engine fallbacks.

### 2.8 ctx.phase, ctx.log, ctx.brief

- `phase<T>(name, fn)` is cosmetic for identity (the phase name never enters content keys) and structural for observability: it opens a `phase` span, emits `phase:start`, and buckets `CostReport.byPhase` (09-observability-testing-spec.md, section "Event stream"). Phases MAY nest; cost attribution uses the innermost enclosing phase.
- `log(level, msg, data?)` emits a `log` telemetry event. It is not journaled, never enters identity, and is not re-emitted on replay.
- `brief(opts)` is a journaled summarize invocation: it runs a model call under role `'summarize'` over the current transcript/context and returns a string intended to be embedded into a child prompt as an inheritable summary. It journals as an ordinary agent-kind entry and is therefore free on replay. Lands with M6 (10-implementation-plan.md).

### 2.9 Deterministic shims: now, random, uuid

`ctx.now()`, `ctx.random(key?)`, and `ctx.uuid()` journal their values as kind `rand` entries with a subtype discriminator, keyed by `(scope, ordinal)` (03-journal-spec.md, section "JournalEntry form; kinds registry v2"). The first execution records the live value; every replay returns the journaled value byte-for-byte. `random(key?)` accepts an optional explicit discriminator for stability under reordering. In the worker sandbox, `Date.now` and `Math.random` are replaced by these shims seeded from `runId`; in process they are convention-enforced (section 8.2).

### 2.10 Escalated result delivery in script modes

Outside PlanRunner runs the escalated result is simply returned (07-adaptive-orchestration-spec.md, section "Scope and applicability per mode"). Concretely:

- A `{ result: 'full' }` call receives the `EscalatedResult<T>`; `isEscalated` narrows it.
- A settled `ctx.parallel` branch receives `{ status: 'escalated', result }`.
- InProcessRunner MAY be constructed with an `onEscalation` hook that receives the escalated result when the call form cannot carry it (section 8.2).
- A spawn that opts into escalation from a plain value-form call, with no `onEscalation` hook installed, is a typed `ConfigError` at dispatch time, before any LLM call: there would be no channel able to carry the report.

The replay side is fixed by DEF-1: an escalated entry replays as completed and paid, and the consumer sees the same status and byte-identical `EscalationReport` on every resume (03-journal-spec.md, section "Replay predicate (DEF-1)").

## 3 Error policy and dropped results

`defineWorkflow` is generic over `errorPolicy`:

- `'strict'` (default for human-authored workflows): `onError` defaults to `'throw'`; `ctx.agent` value calls type as `Promise<Out<S>>`; `abortSiblings` defaults to true in `ctx.parallel`.
- `'lenient'` (emitted by the planner for machine-generated scripts): `onError` defaults to `'null'`; `ctx.agent` value calls type as `Promise<Out<S> | null>` via the literal generic, so the null possibility is visible in the type system, not discovered at runtime.

Every silent loss MUST be surfaced in `run.dropped`:

```ts
interface DroppedItem {
  source: 'pipeline' | 'agent-onerror-null' | 'parallel-settled';
  scope: string;        // scope path of the failed call
  entryRef?: number;    // seq of the terminal journal entry when one exists
  label?: string;
  error: WireError;     // JSON-serializable projection, 02-architecture.md
}
```

Under `onError: 'null'` the error is still recorded here; `'null'` suppresses the exception, never the evidence.

## 4 Scheduler and concurrency

- Per-run semaphore with a queue, default 12 concurrent model calls (configurable via `createEngine` `concurrency.perRun`).
- Per-provider concurrency keys constrain calls across a single engine per adapter (configurable; land with M4, 04-model-layer-spec.md).
- Lifetime cap: an engine-level kill switch of 500 spawns per run (configurable). PlanRunner runs are ADDITIONALLY governed by the frozen `maxTotalSpawns` from `termination.init`, default 128 (DEF-2; 07-adaptive-orchestration-spec.md, section "TerminationAccount and the termination lemma (DEF-2)"). Non-PlanRunner runs get only the lifetime cap, `maxDepth`, and the budget layers.
- `ctx.parallel` is a barrier: it journals each branch as the branch completes and resolves when all branches settle. Under `'strict'` the default `abortSiblings: true` means a failing branch aborts its siblings; aborted siblings are written as `cancelled` and rerun on resume (cancelled always reruns per the replay disposition table). `settle: true` disables sibling abortion entirely.
- `ctx.pipeline` streams items with no inter-stage barrier; a failing stage drops the item into `run.dropped` with the full error (section 2.3).
- An escalated child inside `ctx.parallel` is NOT an error: `onError` does not fire, and the branch counts as a settled outcome, exactly like `limit` (DEF-1). The set of run outcomes is not extended by escalation.

Dispatch is at-least-once: a dangling `running` two-phase entry after a crash is redispatched live on resume; dedup is provided by the journal, not the scheduler (03-journal-spec.md, section "Two-phase entries, dispatch, and the budget ledger").

## 5 Three-layer budget

The three-layer structure is invariant I4 and is identical across all orchestration modes (invariant I5: one budget path).

### 5.1 Layer 1: admission before spawn

A spawn is blocked when `spent + committedReserve >= ceiling` on any account in its ancestor chain. The admission reserve for a spawn is computed as:

```
reserve = opts.estCost
       ?? profile.estCost
       ?? price(countTokens(input) + caps.maxOutputTokens)
       ?? engine flat default (0.50 USD)
```

An admission reserve is taken on every `add_task` and `unpark_task` and on a laddered spawn (startTier plus the escalation reserve) at revision apply time (07-adaptive-orchestration-spec.md, section "PlanRunner (DEF-8)"). Reserves are recovered from decision entries on resume, never re-estimated (DEF-1 interaction; 03-journal-spec.md, section "Budget ledger fold on resume").

### 5.2 Layer 2: per-turn guard

Before every agent turn the runtime checks the agent's own sub-account. A turn that would cross the sub-account ceiling is not dispatched.

### 5.3 Layer 3: AbortSignal ceiling

When a ceiling is crossed while streams are live, the engine severs them via `AbortSignal`; usage accumulated from stream deltas is written with `usageApprox: true`. Overshoot is bounded by ONE turn per in-flight agent, and this bound is documented as the tightest achievable (providers bill severed streams).

The run budget ceiling B0 is immutable after start: no API, including HITL decisions, can top it up (DEF-2 refinement of I4).

### 5.4 Hierarchical sub-accounts and the finalize reserve (DEF-7)

```ts
// Storage SPI does NOT change: everything below is ordinary append-only
// journal entries and pure folds.
interface BudgetAccount {
  scope: string;                 // 'run' | 'orchestrator' | 'plan/<NodeId>' | decomposition ancestor scope
  ceilingUsd: number;
  spentUsd: number;              // pure fold over usage of terminal journal entries
  committedReserveUsd: number;   // layer-1 reserves, INCLUDING finalizeReserveUsd
  finalizeReserveUsd: number;    // the part of committedReserve untouchable by admission
  parentScope?: string;          // upward spend propagation
}
```

- A child's spend propagates to ALL ancestors up to the run root; the root ceiling remains the true invariant.
- Every parent account created by the AdmissionController on decomposition receives a `finalizeReserve` of its own (the DEF-7 generalization; this closes the round-2 ancestor-starvation question by the same mechanism).
- `childBudgetFraction` (default 0.3) is computed from the parent remainder MINUS the parent's finalize reserve.
- `budget_threshold` wake triggers fire at 50 and 80 percent of B0 (fixed values in v1; 07-adaptive-orchestration-spec.md, section "Orchestrator toolset").
- The abandoned-spend ledger (`abandonedUsd`, `reclaimedUsd`, `netLostUsd`, `oscillationCount`) is a fold over revision, abandon, and link entries (DEF-5; 03-journal-spec.md, section "Abandon, derived skipped, and reuse-by-reference (DEF-5)").

### 5.5 Orchestrator own cap and reserve (DEF-7)

The PlanRunner orchestrator gets its OWN budget sub-account in the same account tree as its children: under the run root, scope `'orchestrator'`, next to the `plan/<NodeId>` accounts. Charged to it: every LLM turn of the orchestrator agent itself (role `orchestrate`), including bounded structured-output re-prompts and compaction of its own transcript. NOT charged to it: `plan_view`, `ledger_read`, and WakeDigest assembly, which are pure folds with no LLM cost; TaskDigest distillation lives in the child scope and is paid by the child account.

```ts
interface OrchestratorBudgetSpec { // resolved: call override > profile (orchestrate) > engine default
  capUsd?: number;
  capFraction?: number;            // default 0.2; effectiveCap = min of the given bounds
  finalizeReserveUsd?: number;     // explicit reserve; otherwise derived from finalizeTurns and pricing
  finalizeTurns?: number;          // default 2
  atCap?: 'finish-with-partial' | 'fail-run'; // default 'finish-with-partial'
}
interface OrchestrateOptions /* existing plan options */ { budget?: OrchestratorBudgetSpec }

class OrchestratorCapConfigError extends LurkerError {} // cap unresolvable or effectiveCap < finalizeReserve
```

Normative rules (DEF-7):

- `effectiveCapUsd = min(capUsd, capFraction * runCeilingUsd)`; default `capFraction` 0.2.
- PlanRunner MUST refuse to start with a typed `OrchestratorCapConfigError`, before the first LLM call and before any journal entry, when the cap is unresolvable (a run with no USD ceiling and no explicit `capUsd`) or when `effectiveCap < finalizeReserve`. Opting out of the cap is explicit only: `capFraction` up to and including 1.0, with a telemetry warning.
- At orchestrator admission the engine writes exactly one decision entry `'orchestrator_budget_reserve'` strictly BEFORE the orchestrator's first turn, computing `finalizeReserveUsd` (explicit, or `finalizeTurns` times the estimated turn cost at the resolved orchestrate model's price; default `finalizeTurns` 2) and fixing both amounts in absolute USD.
- Ordering (cross-review amendment, coordinated with DEF-2; XF mapping in 07-adaptive-orchestration-spec.md, section "Cross-fix mapping"): `termination.init` is written strictly BEFORE `orchestrator_budget_reserve`; the `capUsd` and `finalizeReserveUsd` values MUST match the ones frozen in `termination.init`, or the reserve entry references init by seq (`terminationInitRef`).
- The reserve is registered as `committedReserve` simultaneously in the orchestrator account AND in the run root account: layer-1 admission never spends finalization money on any spawn, and the guarantee holds even against exhaustion of the whole run.
- Enforcement reuses the three existing layers, adding none. Layer 1: before delivering each WakeDigest the engine checks `orchSpent + turnReserve > effectiveCap - finalizeReserve`; crossing this soft boundary produces a forced finish instead of a normal wake. Layer 2: the orchestrator's per-turn guard runs against its sub-account. Layer 3: the account's hard ceiling equals `effectiveCap` in full; turns streaming past it are severed by `AbortSignal` with `usageApprox: true`; overshoot is bounded by one turn.
- Nested PlanRunner (`ctx.workflow` whose body calls `ctx.orchestrate`): each instance gets its own sub-account under the parent scope's account; the inner `effectiveCap` is ADDITIONALLY clamped by the parent remainder minus the parent's finalize reserve; the inner reserve propagates upward as ordinary `committedReserve`.

### 5.6 At-cap behavior and forced finish (DEF-7)

Full protocol ownership: 07-adaptive-orchestration-spec.md, section "Orchestrator budget (DEF-7)". The budget-normative summary:

`atCap` is a non-HITL fallback: default `'finish-with-partial'`, sole alternative `'fail-run'`. On crossing the soft boundary the engine writes exactly one decision entry `'orchestrator_budget_cap'` strictly BEFORE any effect, then: (a) the plan freezes for adaptation but not for work: already-admitted nodes run to completion, running children are not killed (killing overpays), new revisions become impossible; (b) all wake triggers except quiescence and run abort are disarmed; (c) Flavor B escalations are resolved immediately by a journaled `defaultDecision` resolution referencing the cap decision; Flavor A lands in digests without a wake; (d) at quiescence the orchestrator receives one final wake, paid from the reserve, with a restricted toolset of the single `finish` tool (a different `toolsetHash`, deterministically derived from the journaled cap decision) and a turn limit of `finalizeTurns`.

A successful `finish` yields run outcome `ok` with `forcedFinish: true` in `CostReport.orchestrator`. If `finish` fails (schema-exhausted after the bounded re-prompt, severed by the ceiling, or turns exhausted), the engine writes `'orchestrator_finalize_fallback'` and synthesizes a deterministic partial result by a pure fold over the plan state, the TaskDigests, and the ledger render, with zero LLM calls; the run outcome is `exhausted` with a non-null partial value (exhaustion is never null).

```ts
// Decision-entry payloads (existing kind 'decision'; NO new kinds) (DEF-7)
type OrchestratorDecisionPayload =
  | { decisionType: 'orchestrator_budget_reserve';
      capUsd: number; finalizeReserveUsd: number; finalizeTurns: number;
      source: 'call' | 'profile' | 'engine'; pricingVersion: string;
      terminationInitRef?: number }   // seq of termination.init
  | { decisionType: 'orchestrator_budget_cap';
      spentUsd: number; capUsd: number; finalizeReserveUsd: number;
      cause: 'pre-wake' | 'per-turn';
      snapshot: { planHash: string; ledgerSnapshot: number; wakeOrdinal: number };
      fallback: 'finish-with-partial' | 'fail-run'; disarmedTriggers: string[] }
  | { decisionType: 'orchestrator_finalize_fallback';
      reason: 'schema-exhausted' | 'ceiling-abort' | 'turns-exhausted';
      turnsUsed: number;
      foldParams: { planHash: string; digestOrdinalMax: number } };
```

Journal semantics (DEF-7, normative):

1. `orchestrator_budget_reserve` lives in the run scope, strictly after `termination.init` and strictly before the orchestrator's first agent entry. Live computes the amounts exactly once; replay forward-matches the entry and MUST NOT re-evaluate either the cap or the reserve: a changed price table, ceiling, or library version at resume does not move the fixed numbers.
2. `orchestrator_budget_cap` is written strictly before any freeze effect; ALL effects (trigger disarmament, refusal to schedule wakes, immediate defaultDecisions, the restricted final-wake toolset) are derived from the entry by a pure fold. A crash between the entry and its effects is ordinary roll-forward; no second cap decision can arise. Subsequent engine decisions reference the cap decision via `ref`.
3. `orchestrator_finalize_fallback` parameterizes the partial-result synthesis ONLY by the journaled `foldParams`: live and replay assemble an identical value without an LLM call.
4. The final wake is an ordinary agent entry whose content key includes the restricted `toolsetHash` and a prompt deterministically derived from the cap decision and the pinned WakeDigest snapshot; on replay it forward-matches by status `ok` and is not rerun. The WakeDigest budget block is part of the wake snapshot: a turn re-executed after a crash reads exactly the same numbers.
5. All accounts and the orchestrator-share metric fold over `usage` of terminal entries in spawn ordinal order; wall clock participates nowhere. Releasing an unused reserve at a normal `finish` is a fold consequence of the orchestrator's terminal entry and requires no separate entry.

Edge cases (DEF-7, normative):

- Cap unresolvable, or `effectiveCap < finalizeReserve`: `OrchestratorCapConfigError` at the `ctx.orchestrate` / `orchestrate` call, before the first LLM call and any journal entries; fail fast instead of a silently unbounded orchestrator.
- Greedy children eat the run ceiling before finalization: `finalizeReserve` is registered as `committedReserve` in the root account from the moment of the reserve decision; layer 1 rejects spawns that encroach on it; the final wake stays paid even when the working part of the plan ends `exhausted`.
- Crash between the cap decision entry and its effects: roll-forward; the fold sees the cap decision and deterministically re-derives the effects; no second cap decision.
- Quiescence unreachable after the freeze (a child hangs on `awaitExternal`): the run completes with outcome `suspended`; on resume the frozen state is re-derived from the cap decision; after the external input resolves, quiescence fires normally.
- A Flavor B escalation already suspended at the moment the boundary is crossed: resolved immediately by a journaled `defaultDecision` resolution referencing the cap decision via decide-once (DEF-4); the timer is cancelled; lineage counters continue to apply.
- The reserve-paid `finish` fails: `orchestrator_finalize_fallback`; the partial result is synthesized by fold; outcome `exhausted` with a non-null value; zero LLM calls.
- Nested PlanRunner: see section 5.5 (sub-account per instance, inner cap clamped by parent remainder minus parent reserve).
- After the freeze a node is blocked by a failed dependency and `waive_dep` is unavailable: the node never becomes ready; quiescence (nothing running and nothing ready) fires normally; the node finalizes as blocked, its reserve is released by fold, and the final `finish` sees its status in `plan_view`.

Compatibility notes (DEF-7): PlanRunner requires a resolvable orchestrator cap (a design-level break against the round-2 draft, flagged for the milestone changelog); the default `capFraction` 0.2 means a previously unbounded orchestrator can now be force-finished; the WakeDigest budget block changes the orchestrator turn content key and ships inside the hashVersion 2 profile with no separate migration (03-journal-spec.md, section "hashVersion (DEF-6)"); `CostReport` gains `byRole` and the `orchestrator` block, which is additive but breaks exhaustive key matching (09-observability-testing-spec.md, section "CostReport").

Test cassettes (DEF-7; catalog and definitions in 09-observability-testing-spec.md, section "Mandatory defect cassette catalog"): `cap-freeze-then-finish`, `crash-between-cap-and-effects`, `reserve-survives-run-exhaustion`, `finalize-fallback-synthesized`, `escalation-storm-frozen`, `queue-failover-during-forced-finish`.

### 5.7 Script-mode exhaustion and the exhausted outcome

In script modes (a) and (b), budget exhaustion is typed, not mysterious:

- At the ceiling, every ctx primitive throws a typed `BudgetExhaustedError` (an `AgentError` of kind `'budget'`; code registered in 02-architecture.md, section "Error taxonomy").
- The engine recognizes `BudgetExhaustedError` unwinding the body (or any run at its ceiling) and reports run outcome `'exhausted'`, OVERRIDING `'error'`. In script modes `value` is `undefined`; the partial evidence is `dropped`, `pending`, and the full `CostReport`. In a PlanRunner forced-finalize fallback the `exhausted` outcome carries the fold-synthesized partial value instead (section 5.6).
- Under `onError: 'null'` the failing call yields `null` (with a `DroppedItem`) and the run continues until the ceiling blocks all spawns; the terminal outcome is still `'exhausted'`.

Exhaustion is never a bare null: the outcome always carries the cost report and the dropped/pending evidence (invariant I4).

### 5.8 The H-OrchShare hypothesis

The claim "orchestrate/plan is 5-15 percent of run spend" is NOT a fact of this spec; it is the dogfood telemetry hypothesis H-OrchShare (registered in 01-requirements.md, section "Hypotheses"):

- Statement: in fan-out runs the MEDIAN orchestrator-share lies in the 5-15 percent range and p90 does not exceed 25 percent.
- Metric: `orchestratorShare = orchestratorSpentUsd / max(runSpentUsd, epsilon)` with epsilon 0.01, folded from terminal-entry usage in spawn ordinal order; distribution checked as p50/p90 with slices by spawn count, escalation rate, and the price gap between the orchestrate model and worker models (events: `orchestrator:budget`; 09-observability-testing-spec.md, section "Metrics").
- Consequence: the default `capFraction` 0.2 is revisited against the observed p90; the "nearly free" phrasing may return to the docs only if the hypothesis is confirmed.

## 6 UsageLimits (normative)

```ts
interface UsageLimits {
  maxTurns?: number;               // default 32
  maxToolCalls?: number;           // unlimited by default
  maxOutputTokensPerTurn?: number; // unlimited by default (model caps still apply)
  timeoutMs?: number;              // per-agent wall clock; unlimited by default
  streamIdleTimeoutMs?: number;    // default 120000
  noProgressTurns?: number;        // the no-progress detector N; default 3 (Appendix A; M3 amendment)
}
// The run-level deadline is RunOptions.deadlineAt (section 10.3), not a UsageLimits field.
```

Normative semantics:

- Limits merge per spawn: `AgentOpts.limits` over profile limits over engine `defaults.limits`.
- Expiry of any limit produces the terminal status `'limit'` on the agent entry: paid partial work, `output` null unless a valid structured output was already produced. `'limit'` is task-class for memoization purposes: under `memoizeOutcome: true` it replays; without the flag it reruns (replay disposition table, 03-journal-spec.md, section "Replay predicate (DEF-1)").
- Interaction with `abortSiblings`: a `'limit'` branch is a settled outcome inside `ctx.parallel`; it does NOT fire `onError` and does NOT abort siblings. Only a thrown error aborts siblings under `'strict'`.
- `streamIdleTimeoutMs` measures the gap between stream events; expiry severs the stream and surfaces as a retryable transport-class `AgentError`, subject to `RetryPolicy` under the journal (04-model-layer-spec.md, section "RetryPolicy under the journal"), not as `'limit'`.
- The run-level deadline (`deadlineAt`) crossing cancels in-flight work; the run reports `'cancelled'` with the deadline recorded in the outcome error.
- The no-progress abort class (N turns without tool calls or artifact deltas; `noProgressTurns`, default 3 per Appendix A) is an engine-defined heuristic journaled as a first-class abort: the terminal entry carries status `limit` with the `no-progress` class marker and an engine-stamped `memoizeOutcome` on the terminal, so it replays without a live rerun and is never re-paid (03-journal-spec.md, section 6.6). The broader heuristic stays open (14-open-questions.md, OQ-15). Shipped with M3-T08.

## 7 Agent runtime binding

This section fixes how the execution layer binds to the Agent Runtime; the runtime internals are owned by 04-model-layer-spec.md (roles, router, structured-output tiers) and 03-journal-spec.md (checkpoints).

- Role trigger protocol: `'loop'` fires on every turn while the model has tools available; `'extract'` fires as a separate final structured-output invocation ONLY when a schema is set AND (routing directs extract to a different model OR the current model's caps cannot serve the required tier), otherwise the schema rides the last loop turn with no extra call; `'finalize'` fires only if configured in routing: after tools stop, a synthesis invocation with `toolChoice: 'none'` over the full transcript; `'summarize'` fires at the compaction threshold.
- Structured-output tier selection (`native | forced-tool | prompt`) follows `ModelCaps.structuredOutput` (04-model-layer-spec.md, section "Router and resolution chain").
- Schema-mismatch re-prompt: bounded, default 2 attempts, under UsageLimits; exhaustion yields an `AgentError` of kind `'schema-mismatch'` (task class). Semantic, model-visible retries are requested by throwing `ModelRetry` from a tool (default 2 attempts; 08-tools-permissions-spec.md).
- Checkpoints: agent turns checkpoint at turn boundaries (turn-boundary checkpoint entries; 03-journal-spec.md, section "Checkpoints"). Orchestrator agents checkpoint MANDATORILY at every turn boundary (section 9.3).
- Compaction is owned by the Agent Runtime: history processors per profile plus a `contextWindow` threshold (default 0.8); compaction points are written into the checkpoint.
- The HistoryProjector projects canonical history into the wire view of the target model (canonical id map; provider-raw blocks only to their native provider), which makes per-role provider mixing inside one agent correct (04-model-layer-spec.md, section "Router and resolution chain").
- An `ask` verdict from the permission chain journals as a suspended approval together with the turn checkpoint; resume continues the SAME turn without re-paying turns or re-running tools (08-tools-permissions-spec.md, section "Permission chain"; 03-journal-spec.md, section "Suspension and resolutions (DEF-4)").
- The Agent Runtime produces statuses (including `escalated` under opt-in) but never owns the replay predicate; `replayDisposition` is centralized in the Journal Kernel (DEF-1).
- Beyond the configured policy the runtime never throws: failures become typed `AgentResult` statuses.

### 7.1 ModelRetry (normative declaration)

```ts
/** Control-flow signal, not an error class: thrown from a tool's execute to
    request a model-visible retry. Deliberately outside the error registry
    (02-architecture.md, section "Error taxonomy"). */
export class ModelRetry extends Error {
  constructor(message: string, opts?: { data?: Json });
  readonly data?: Json;   // optional structured payload rendered into the error tool result
}
```

- The runtime catches `ModelRetry` from a tool's `execute` and converts it into an error-flagged tool result carrying `message` (and `data` when present), so the model can self-correct within the same loop (08-tools-permissions-spec.md, section "Tool definition").
- Attempts are bounded per tool call chain (default 2; Appendix A). Exceeding the bound stops the conversion: the final error tool result stands, the model sees it, and the loop proceeds normally; `ModelRetry` never terminates the agent by itself.
- Conversions happen inside one agent scope: they journal no entry of their own, count toward `UsageLimits.maxToolCalls`, and feed the no-progress detector inputs.

## 8 Script runners

The script runner is one of the six frozen SPI seams (02-architecture.md, section "SPI seams and the 1.0 freeze").

```ts
interface ScriptRunner {
  execute<A, R>(wf: Workflow<A, R> | CompiledWorkflow, ctx: Ctx, args: A): Promise<R>;
}

class InProcessRunner implements ScriptRunner {
  constructor(o?: {
    onEscalation?: (r: EscalatedResult<unknown>) =>
      EscalationDecision | Promise<EscalationDecision>;
  });
}

class WorkerSandboxRunner implements ScriptRunner {  // accepts CompiledWorkflow ONLY
  constructor(o?: { timeoutMs?: number; memoryMb?: number }); // defaults 300000 / 512
}

function compileScript(source: string, o?: { allowImports?: string[] }): CompiledWorkflow;
// rejection = typed ScriptRejected with diagnostics
```

### 8.1 InProcessRunner

For human-authored code (mode a). Determinism is enforced by convention, lint, and the ctx shims, NOT by a VM: VM-coerced determinism is hostile to embedding and unnecessary under the memoized model, where only the SEQUENCE OF KEYS must be stable (an explicit, accepted decision). Dev mode patches `Date.now` and `Math.random` to emit a warning pointing at `ctx.now()`/`ctx.random()`. The `onEscalation` hook (a round-2 addition) receives escalated results per section 2.10 and MUST return an `EscalationDecision` (07-adaptive-orchestration-spec.md, section "EscalationProtocol").

### 8.2 WorkerSandboxRunner

Mandatory for machine-generated scripts (mode b). Contract:

- A `worker_threads` worker with a curated global scope. The exact sandbox global set is: `agent`, `parallel`, `pipeline`, `step`, `phase`, `log`, `budget`, `workflow`, `awaitExternal`, `now`, `random`, `uuid`. The ctx methods are bound as bare globals; the planner API card teaches exactly this list.
- `Date.now` and `Math.random` are replaced by the seeded, journaled shims (seed derived from `runId`); `import`, `fetch`, and `process` are absent from the scope.
- Every primitive call travels as JSON-RPC over a `MessagePort` to the host engine; values are JSON only. Payloads MUST be journal-compatible JSON validated at the boundary; raw structured clone is NOT the contract, so worker and host never exchange non-journalable values.
- Port lifecycle: one dedicated `MessageChannel` per run; the worker end is passed in the transfer list at startup; the host keeps its end referenced while the run is live and unrefs and closes it at the terminal outcome so a worker cannot keep the host process alive.
- `ctx.step` bodies execute inside the worker; only the JSON result is RPC'd to the host for journaling (section 2.4).
- `ctx.workflow` is available only in the registered-name string form (section 2.5).
- Breaching `timeoutMs` or `memoryMb` terminates the worker; the run completes with outcome `'error'` carrying a typed `LurkerError` code (registry: 02-architecture.md, section "Error taxonomy").

Honest boundary statement (normative posture, NFR security posture in 01-requirements.md): the sandbox is a DETERMINISM and BLAST-RADIUS boundary, not a security boundary. Containment of hostile code is provided by executors (`subprocess`/`container`) and worktree isolation (08-tools-permissions-spec.md, sections "Executors" and "IsolationProvider and worktree lifecycle"). A QuickJS runner for untrusted third-party scripts is a future plugin behind the same seam and is explicitly not in v1 (EXC registry, 01-requirements.md).

### 8.3 compileScript and the sanctioned dialect

`compileScript(source, { allowImports })` validates and compiles planner-generated source into a `CompiledWorkflow`; any violation is a typed `ScriptRejected` with machine-readable diagnostics. `allowImports` defaults to `[]` (no imports).

The sanctioned sandbox dialect (the API card teaches exactly this to the planner):

- `schema` only as a JSON Schema literal (no schema-library values);
- tools only as NAMES of registered profiles;
- `onError` only `'throw' | 'null'`;
- `model` as a string;
- no functions anywhere in options;
- policies as declarative rule tables without closures;
- ladders as JSON.

### 8.4 eslint-plugin-lurker

Rules (lockstep-versioned despite the npm-required unscoped name; 12-release-versioning.md, section "Exemptions"):

- forbid bare `Date.now`, `Math.random`, `new Date`, `fetch`, `process.env` in workflow modules;
- forbid bare `Promise.all` over ctx calls (use `ctx.parallel`, which journals, schedules, and settles);
- emit JSON diagnostics consumable by the mode (b) self-repair loop.

## 9 Orchestration modes and entry points

Three modes run on ONE subagent runtime, ONE journal, and ONE budget path (invariant I5). There is no fourth mode; call-and-return only (invariant I3). The documented default for adaptive needs is phase chaining with replan between phases; the adaptive machinery is opt-in for wide fan-out (00-overview.md, section "Orchestration modes").

```ts
function plan(engine: Engine, goal: string,
  o?: { model?: ModelSpec; profiles?: string[]; repairRounds?: number }
): Promise<{ source: string; workflow: CompiledWorkflow; lint: Diagnostic[] }>;

function runPlanned(engine: Engine, goal: string, args?: Json): RunHandle<unknown>;

function orchestrate(engine: Engine, goal: string,
  o?: { model?: ModelSpec; profiles?: string[]; maxSpawns?: number; budget?: OrchestratorBudgetSpec }
): RunHandle<unknown>;
```

### 9.1 Mode (a): human scripts

`engine.run(wf)` with InProcessRunner. Full ecosystem access; determinism by convention, lint, and the `ctx.now()/random()/uuid()` shims.

### 9.2 Mode (b): flagship hybrid

`plan()` asks a planner model (role `'plan'`) to write a script against the API card of the ctx dialect and the profile cards, lints it, self-repairs up to `repairRounds` rounds (default 3) from the JSON diagnostics, then `compileScript` and deterministic execution in WorkerSandboxRunner. Replanning after a failure replays the unchanged prefix for free (invariant I1). `runPlanned` composes plan-then-run in one call. Packages: @lurker/planner (02-architecture.md, section "Package map"; note the @lurker/plan vs @lurker/planner disambiguation table there).

### 9.3 Mode (c): dynamic orchestrator

An ordinary workflow whose agent (role `'orchestrate'`) holds typed spawn tools: `spawn_agent`, `parallel_agents`, `finish`, plus handle-based `await_any`/`await_all` and `cancel_agent` for in-flight children (tool schemas: 07-adaptive-orchestration-spec.md, section "Orchestrator toolset"). Normative execution properties:

- Orchestrator turns are checkpointed MANDATORILY at turn boundaries.
- Every spawn is an ordinary journal entry of kind `'agent'`; handles are journal-derived stable ids (the spawn entry seq), stable across resume.
- Resume semantics: a crashed `orchestrate()` restores its own history from the checkpoint and finds child results by content keys, WITHOUT regenerating spawn decisions and without re-paying children.
- `profileCard(registry)` yields the same text for the planner prompt (mode b) and for the `spawn_agent` enum (mode c): both modes speak one agent vocabulary.
- The opt-in PlanRunner extension of mode (c), with `plan_revise`, WakeDigest, escalation, admission, ladders, and termination accounting, is owned by 07-adaptive-orchestration-spec.md. In non-PlanRunner runs only the lifetime cap, `maxDepth`, and the budget layers apply; no `termination.init` is written (07-adaptive-orchestration-spec.md, section "Scope and applicability per mode").

Both `orchestrate(engine, goal, opts)` (creates a run) and `ctx.orchestrate(goal, opts)` (nests under the AdmissionController) share one implementation; see section 2.6 for the nested cap clamp and `OrchestratorCapConfigError` timing.

## 10 Engine and ops API

### 10.1 createEngine

```ts
function createEngine(o: {
  adapters: ProviderAdapter[];
  stores?: {
    journal?: JournalStore | LeasableStore;   // default InMemoryStore (resume disabled, loud warning)
    transcripts?: TranscriptStore;
    modelKnowledge?: ModelKnowledgeStore;     // docs/05
  };
  defaults?: {
    routing?: Partial<Record<InvocationRole, ModelSpec>>;
    profiles?: Record<string, AgentProfile>;
    workflows?: WorkflowRegistry;             // section 10.4
    permissions?: PermissionConfig;           // docs/08
    limits?: UsageLimits;
    isolation?: IsolationProvider;            // docs/08
    roleFloors?: QualityFloors;               // docs/04, section "Role quality floors"; strong defaults live in the umbrella only
  };
  budgetDefaults?: {
    flatReserveUsd?: number;                  // default 0.50
    childBudgetFraction?: number;             // default 0.3
    orchestrator?: OrchestratorBudgetSpec;    // section 5.5
    lifetimeSpawnCap?: number;                // default 500
    maxDepth?: number;                        // default 1, ceiling 4
  };
  concurrency?: { perRun?: number; perProvider?: Record<string, number> }; // perRun default 12
  extraDerivers?: KeyDeriver[];               // hashVersion registry extension, docs/03 (DEF-6)
}): Engine;
```

All registries (adapters, profiles, workflows, derivers, mechanical gate profiles) are PER ENGINE; a global mutable registry does not exist. A duplicate `adapterId` at `createEngine` is a typed `ConfigError`.

### 10.1.1 AgentProfile

The canonical, complete AgentProfile shape. A profile is a NAMED bundle of per-spawn defaults registered under `defaults.profiles`; `AgentOpts.agentType` selects it by name. Anything absent here is not part of AgentProfile in v1.

```ts
interface AgentProfile {
  description?: string;                                   // rendered by profileCard(registry); telemetry and cards only
  model?: ModelSpec;                                      // the "agent profile" layer of the resolution chain (docs/04, section "Router and resolution chain")
  routing?: Partial<Record<InvocationRole, ModelSpec>>;   // per role; AgentOpts.routing wins over profile.routing
  effort?: Effort;                                        // canonical effort default
  tools?: Array<ToolDef | ToolSource | string>;           // toolset default; the sandbox references profiles by name only
  isolation?: IsolationSpec;                              // docs/08
  limits?: UsageLimits;                                   // merged below AgentOpts.limits, above engine defaults (section 6)
  permissions?: AgentProfilePermissions;                  // docs/08, section "Subagent inheritance"
  escalation?: EscalationOptions;                         // Flavor B opt-in lives here or on the call (docs/07, section "EscalationProtocol")
  ladder?: LadderSpec;                                    // docs/07, section "ModelLadder"
  estCost?: number;                                       // admission reserve hint (USD), layer 1 (section 5.1)
  compaction?: { threshold?: number };                    // per-profile compaction threshold (default 0.8, Appendix A); history-processor plumbing is engine-internal until M4
  taskClass?: string;                                     // default 'unclassified'; bridges ModelKnowledge (docs/04 section "Role quality floors", docs/05, OQ-12)
}
```

Normative rules:

- Per-spawn resolution is `AgentOpts` field, else profile field, else workflow default, else engine default (docs/04, section "Router and resolution chain"). Identity hashes the RESOLVED values plus `agentType` itself (docs/03, section "Identity model"), so editing a profile changes content keys only through the values it resolves.
- A profile never carries a prompt or a schema; both are strictly per call.
- Profiles are data: no functions except tool `execute` closures reached through `ToolDef` (which never enter identity; docs/08, section "toolsetHash contract").
- `profileCard(registry)` renders `description` plus the declared tools/ladder/limits identically for the mode (b) planner prompt and the mode (c) `spawn_agent` enum (section 9.3).

### 10.2 engine.run, engine.resume, and run-to-definition binding

```ts
interface Engine {
  run<A, R>(wf: Workflow<A, R> | CompiledWorkflow, args: A, o?: RunOptions): RunHandle<R>;
  resume(runId: string, wf?: Workflow<any, any> | CompiledWorkflow): RunHandle<unknown>;
}
```

The binding contract (residuals tracked in 14-open-questions.md, resume binding residuals):

- CompiledWorkflow: at `engine.run` the engine MUST persist the compiled source and its content hash (source blob in TranscriptStore; `workflowSourceRef` and `workflowHash` recorded in RunMeta, 03-journal-spec.md, section "RunMeta"). `engine.resume(runId)` with no `wf` MUST reload and recompile the stored source, so planned runs (mode b) are resumable by construction. Supplying a `wf` whose hash differs from the recorded one is a typed `ConfigError`. Delivery note: `CompiledWorkflow` values first exist at M6 (compileScript ships in @lurker/planner; 10-implementation-plan.md), and this persistence contract binds from that first release, so a planner-generated run without persisted source never exists; before M6, `engine.run` and `engine.resume` accept only in-process `Workflow` values.
- In-process Workflow: `engine.run` records the registered workflow name and a content hash of the body in RunMeta (`workflowName`/`workflowHash`). `engine.resume(runId, wf)` REQUIRES `wf`; a name mismatch is a typed `ConfigError`; a content-hash mismatch produces a LOUD warning and proceeds, because the journal itself decides replay versus live per content keys.

### 10.3 RunOptions, RunHandle, RunOutcome, RunStatus

```ts
interface RunOptions {
  runId?: string;          // explicit id; otherwise the engine mints a ULID
  budgetUsd?: number;      // run ceiling B0; immutable after start
  limits?: UsageLimits;    // run-level defaults merged over engine defaults
  deadlineAt?: string;     // run-level deadline (ISO 8601)
  name?: string; tags?: string[];  // RunMeta fields
  signal?: AbortSignal;    // host-initiated cancellation
}

interface RunHandle<R> {
  runId: string;
  result: Promise<RunOutcome<R>>;
  events: AsyncIterable<WorkflowEvent>;                  // docs/09
  on<T extends WorkflowEvent['type']>(t: T, cb: (e: WorkflowEvent) => void): () => void;
  cancel(reason?: string): Promise<void>;
  resolveExternal(key: string, value: Json): Promise<ResolutionOutcome>; // DEF-4 signature
}

type RunOutcome<R> = {
  status: 'ok' | 'error' | 'cancelled' | 'exhausted' | 'suspended';
  value?: R; error?: WireError;
  dropped: DroppedItem[]; pending: PendingExternal[];
  usage: Usage; cost: CostReport;                        // CostReport: docs/09
};

type RunStatus = RunOutcome<unknown>['status'] | 'running';

interface PendingExternal {
  key: string; scope: string; entryRef: number;
  prompt?: string; deadlineAt?: string;                  // deadlineAt: approvals and Flavor B only
}
```

Outcome precedence: `exhausted` overrides `error` (section 5.7); `suspended` is reported when all remaining work is blocked on suspensions; `cancelled` reports host cancellation or a crossed run deadline.

### 10.4 Workflow registry for shells

```ts
type WorkflowRegistry = Record<string, Workflow<any, any> | CompiledWorkflow>;
```

The registry is an explicit, first-class value; there is no module-level registry. It MAY be supplied engine-wide via `defaults.workflows`; the server shell receives it explicitly: `createServer({ engine, workflows })`. The queue worker is `createWorker(engine, { store, concurrency? })` and resolves workflows through the engine's `defaults.workflows` registry plus the persisted CompiledWorkflow sources (section 10.2), never through a parameter of its own (shell contracts: 02-architecture.md, section "Shells overview"; FR-702/FR-703). By-name resolution for `ctx.workflow('name', args)` and for the sandbox resolves against this registry.

### 10.5 Canonical CLI grammar

The canonical v1 grammar of @lurker/cli (M5; kb subcommands from M10). No aliases exist in v1.

```
lurker run <file|name> [--args JSON] [--store PATH] [--budget-usd N] [--profile NAME]
lurker resume <runId>
lurker runs ls [--store PATH]
lurker inspect <runId>
lurker plan "<goal>" [--dry-run]
lurker kb <list | inbox | sweep>
```

Example: `lurker run wf.ts --args '{"pr":42}' --store .lurker --budget-usd 20`. Install commands always use `@lurker/<name>`, never the bare unscoped name (naming risk note: 13-toolchain-repo.md, section "Naming risk note").

## 11 Run profiles and TaskGraph

- RunProfile presets (`fast` / `standard` / `deep` / `ultra` and similar) ship as DATA: bundles of role routing, effort, concurrency, budget, permission preset, and spawn limits. They are never engine semantics; engine-level strategy enums are excluded from v1 (EXC registry, 01-requirements.md). Presets land with M5.
- TaskGraph JSON is admissible ONLY as an optional constrained planner target compiled onto `ctx.parallel`/`ctx.agent`: no conditional edges, no YAML in the core (graph/YAML execution cores are excluded, EXC registry).

## Appendix A: consolidated defaults table

This is the single consolidated defaults table for the whole docs set; every other spec cross-links here instead of restating values. A knob with no committed value is listed as TBD with its deciding milestone, never omitted. A TBD value MUST be committed by a docs amendment to this table BEFORE the first task of its deciding milestone that consumes the knob begins (the milestone entry criteria in 10-implementation-plan.md enforce this); implementations consume the committed value and MUST NOT invent one.

| Knob | Layer / owner | Default | Configurable | Notes |
|---|---|---|---|---|
| errorPolicy | defineWorkflow (docs/06) | 'strict' | per workflow | planner emits 'lenient' |
| onError | spawn (docs/06) | 'throw' under strict; 'null' under lenient | per call | losses surface in run.dropped |
| result | spawn (docs/06) | 'value' | per call | 'full' returns AgentResult |
| replay mode | spawn (docs/03) | scoped forward-matching | per call | 'cache' / 'never' |
| memoizeOutcome | spawn (docs/03, DEF-1) | false | per call | error/limit only, never cancelled |
| settle | ctx.parallel (docs/06) | false | per call | true yields Settled<T>[] |
| abortSiblings | ctx.parallel (docs/06) | true under strict | per call | settle: true disables |
| onItemError | ctx.pipeline (docs/06) | 'drop' | per call | 'throw' / 'collect' |
| per-run concurrency | scheduler (docs/06) | 12 | createEngine concurrency.perRun | |
| per-provider concurrency keys | scheduler (docs/04) | TBD before M4 | per adapter | keys land with M4; interim: absent, only the per-run semaphore bounds concurrency |
| transport RetryPolicy | model layer (docs/04, section "RetryPolicy") | TBD before M4 (attempts, backoff, retryOn) | per call/profile/engine | lives under the journal; honors retryAfterMs; interim: no transport auto-retry (attempts 1), failures surface as typed retryable errors |
| pauseTurnMaxContinuations | @lurker/anthropic adapter (docs/04) | 5 | per adapter | pause_turn continuation cap; never a canonical finish |
| lifetime spawn cap | scheduler (docs/06) | 500 | budgetDefaults.lifetimeSpawnCap | engine kill switch |
| maxDepth | AdmissionController (docs/07) | 1 | yes, hard ceiling 4 | nesting depth |
| maxTotalSpawns | termination.init (docs/07, DEF-2) | 128 | frozen at init | orchestrate maxSpawns equals it |
| maxRevisionsPerRun | termination.init (docs/07, DEF-2) | 32 | frozen at init | V0; absolute, non-replenishable; -1 per journaled plan_revise |
| maxEscalationsPerLogicalTask | termination.init (docs/07, DEF-3, XF-10) | 2 | frozen at init | per lineage; old name maxEscalationsPerNode rejected by the validator |
| maxAttemptsPerLogicalTask | lineage (docs/07, DEF-3) | 8 | yes | monotonically consumed, never replenished |
| maxOscillationsPerKey | reuse-by-reference (docs/03, docs/07, DEF-5) | 2 | yes | osc_guard reject threshold per SpawnKey |
| maxChildrenPerNode | AdmissionController (docs/07) | 16 | yes | structural limit |
| flat admission reserve | budget layer 1 (docs/06) | 0.50 USD | budgetDefaults.flatReserveUsd | last resort of the reserve formula |
| childBudgetFraction | budget (docs/06, DEF-7) | 0.3 | yes | of parent remainder minus reserve |
| capFraction | orchestrator budget (docs/06, DEF-7) | 0.2 | yes, up to 1.0 with telemetry warning | effectiveCap = min(capUsd, fraction x B0) |
| finalizeTurns | orchestrator budget (docs/06, DEF-7) | 2 | yes | derives finalizeReserveUsd |
| atCap | orchestrator budget (docs/06, DEF-7) | 'finish-with-partial' | yes | sole alternative 'fail-run' |
| softWarning threshold | WakeBudgetBlock (docs/07, DEF-7) | 0.8 of (cap - reserve) | no | fixed in v1 |
| budget_threshold wake triggers | docs/07 | 50 and 80 percent | no | fixed in v1 |
| orchestratorShare epsilon | metric (docs/06, docs/09) | 0.01 | no | H-OrchShare denominator floor |
| maxTurns | UsageLimits (docs/06) | 32 | yes | expiry = status 'limit' |
| maxToolCalls | UsageLimits (docs/06) | unlimited | yes | |
| maxOutputTokensPerTurn | UsageLimits (docs/06) | unlimited | yes | model caps still apply |
| timeoutMs (per agent) | UsageLimits (docs/06) | unlimited | yes | |
| streamIdleTimeoutMs | UsageLimits (docs/06) | 120000 | yes | transport-class on expiry |
| run deadline (deadlineAt) | RunOptions (docs/06) | none | per run | crossing cancels the run |
| schema-mismatch re-prompt | agent runtime (docs/06) | 2 attempts | yes | under UsageLimits |
| ModelRetry attempts | agent runtime (docs/08) | 2 | yes | model-visible semantic retries |
| compaction threshold | agent runtime (docs/06) | 0.8 of contextWindow | per profile | points written into checkpoint |
| repairRounds | plan() (docs/06) | 3 | per call | mode (b) self-repair |
| sandbox timeoutMs | WorkerSandboxRunner (docs/06) | 300000 | per runner | |
| sandbox memoryMb | WorkerSandboxRunner (docs/06) | 512 | per runner | |
| allowImports | compileScript (docs/06) | [] | per call | |
| minSpendUsd | EscalationOptions (docs/07) | 0 | per spawn | in-run minSpend, M3 |
| escalation deadlineMs (Flavor B) | EscalationOptions (docs/07) | TBD before M7 | per spawn | timer resolution by 'timeout'; interim: no engine default, enabling Flavor B requires an explicit deadlineMs (validator-enforced) |
| approval deadlineAt | ask suspension (docs/03, docs/08) | none (suspends until resolved) | per rule | applies to approvals only |
| droppedRevisionLimit | PlanRunner guards (docs/07, DEF-8) | 3 consecutive | yes | triggers RevisionGuards fallback |
| RunLedger section caps | RunLedger (docs/07) | facts 64, lessons 32, observations 16 | yes | |
| maxPinnedWorktrees | isolation (docs/08) | 4 | yes | shared by park/unpark and retainWorktree |
| large-value soft warn threshold | journal append (docs/03) | 262144 bytes | yes | no automatic value offload in v1; a warning event only, never an error. (Committed during M2 entry per the TBD rule: the interim reference value is adopted unchanged) |
| lease renew interval | LeasableStore (docs/03) | at most ttl/3 (normative bound) | per store | |
| lease ttl | LeasableStore (docs/03) | TBD before M8 | per store | interim reference for the sqlite store: 60000 ms (renew bound ttl/3 applies) |
| createWorker concurrency | queue shell (docs/02) | TBD before M8 | per worker | interim: 1 (one leased run per worker process) |
| no-progress detector N | agent runtime (docs/14) | 3 consecutive turns without tool calls or artifact deltas (committed during M3 entry per the TBD rule; the broader heuristic stays OQ-15, revisited on dogfood traces before 1.0) | yes | journaled abort class |
| KB active-claims cap | ModelKnowledge (docs/05) | 8 per (model, taskClass) | yes | |
| renderBudget (WakeDigest, ledger render, KB card) | docs/07, docs/05 | TBD before M10 | yes | OQ: measure choice, docs/14 |
