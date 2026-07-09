# Architecture

Status: Ready for implementation
Version: 0.2.0-docs
Date: 2026-07-06

Purpose: Defines the layer model L0-L6, the twelve core components with their key interfaces and package placement, the full package map, the dependency rules, the SPI seams frozen at 1.0, the error taxonomy, and the anatomy of the engine and the shells.

This document is structural: it says where every piece of lurker lives and which spec owns its behavior. Normative behavior of each component is specified in the owning spec documents referenced per section. Invariants I1-I6 are stated in 00-overview.md, section "Invariants"; this document assumes them throughout. Requirements are cited by FR/NFR ID as registered in 01-requirements.md.

## 1. Layer model L0-L6

lurker is organized into seven layers with dependencies pointing strictly downward. A module in layer Ln MUST NOT import anything from a layer above Ln. L6 additionally consumes the event stream and the stores, both of which are public surfaces.

| Layer | Name | Contents | Ships in |
|---|---|---|---|
| L0 | contracts | Msg/Part types (including provider-raw), ChatRequest/ChatEvent, Usage, JournalEntry, WorkflowEvent, the error taxonomy (section 6), SchemaSpec, and the SPI interfaces: ProviderAdapter, JournalStore/LeasableStore, TranscriptStore, ModelKnowledgeStore, ScriptRunner, ToolSource, IsolationProvider. The only dependency is the vendored JSON Schema mini-validator. | @lurker/core |
| L1 | leaves | Provider adapters and stores; they depend only on L0. A provider SDK appears exclusively inside its own adapter. | @lurker/anthropic, @lurker/openai, @lurker/bridge-ai-sdk, @lurker/store-sqlite; InMemoryStore and JsonlFileStore in @lurker/core |
| L2 | kernel | The journal kernel (content keys, scope paths, scoped forward-matching, the replay predicate, the budget ledger) and the model router with the capability and price registry. | @lurker/core; frozen KeyDeriver profiles in @lurker/compat |
| L3 | execution | The tool system and MCP bus, the agent runtime (permission chain, structured output, turn-boundary checkpoints, HistoryProjector, compaction). | @lurker/core |
| L4 | orchestration | The run engine, ctx primitives, the concurrency scheduler, the three-layer budget, the event stream, RunHandle; the dynamic orchestrator lives here as an ordinary workflow with spawn tools; PlanRunner as an opt-in extension. | @lurker/core; PlanRunner and RunLedger in @lurker/plan |
| L5 | authoring | Script runners (InProcessRunner in the core, WorkerSandboxRunner in @lurker/planner) and the plan agent. | @lurker/core, @lurker/planner |
| L6 | shells | Test harness, CLI and TUI, HTTP server, queue worker, knowledge-base maintenance CLI; they consume only the public L4-L5 APIs, the event stream, and the stores. | @lurker/cli, @lurker/testing, @lurker/evals, @lurker/store-conformance |

EventSink is deliberately absent from the L0 SPI list. The event surface is the RunHandle.events / on() public API (09-observability-testing-spec.md, section "Event stream"), not a pluggable seam; there is nothing to freeze and nothing for third parties to implement.

The frozen seams (the L0 SPIs listed in section 5) MUST pass the server and queue soak (M8) before the 1.0 release.

## 2. The twelve components

The core of lurker is twelve components. The table maps each to its owning spec; the subsections give the responsibility, the key interfaces, and the package placement.

| # | Component | Owning spec |
|---|---|---|
| 1 | Journal Kernel | 03-journal-spec.md |
| 2 | Storage SPI and shipped stores | 03-journal-spec.md, section "Storage SPI" |
| 3 | Provider Adapter SPI and Wire Core | 04-model-layer-spec.md |
| 4 | Model Router and Capability Registry | 04-model-layer-spec.md |
| 5 | Agent Runtime | 06-execution-spec.md, section "Agent Runtime binding"; roles in 04-model-layer-spec.md |
| 6 | Tool System and MCP Bus | 08-tools-permissions-spec.md |
| 7 | Workflow Engine and Ctx Primitives | 06-execution-spec.md |
| 8 | Script Runners | 06-execution-spec.md, section "Script runners" |
| 9 | Orchestration Modes | 06-execution-spec.md; PlanRunner in 07-adaptive-orchestration-spec.md |
| 10 | Event Stream and Observability | 09-observability-testing-spec.md |
| 11 | Test Harness | 09-observability-testing-spec.md; strategy in 11-testing-strategy.md |
| 12 | Shell: CLI, Server, and Queue | section 8 below; 06-execution-spec.md, section "Engine and ops API" |

### 2.1 Journal Kernel

Responsibility: the sole writer and interpreter of run truth. It derives content keys and structural scope paths, decides replay-or-live for every call via scoped forward-matching, maintains two-phase entries (running / terminal), folds the budget ledger and the values of the deterministic shims, manages suspended entries, and owns the single canonical replay predicate, replayDisposition. The stores below it never parse the payload; everything above it knows nothing about persistence.

```ts
// Final entry form (hashVersion 2; evolution: 03-journal-spec.md, section
// "hashVersion", DEF-6)
type JournalEntry = {
  hashVersion: HashVersion;    // identity-derivation and replay-semantics version of THIS entry
  seq: number;                 // total order per run; canonical EntryRef = seq
  ref?: number;                // on ref-entries (resolution/abandon): seq of the target; always ref < seq
  scope: string; key: string; ordinal: number;
  kind: EntryKind;             // single kinds registry v2; 03-journal-spec.md, section "JournalEntry form"
  status: 'running'|'ok'|'error'|'limit'|'suspended'|'cancelled'|'escalated';
  // 'skipped' is DELIBERATELY absent from the stored enum: it is a derived fold status
  value?: Json; error?: WireError; usage?: Usage; usageApprox?: boolean;
  servedBy?: ModelRef; transcriptRef?: string; checkpointRef?: string;
  resolution?: ResolutionPayload;  // only when kind is 'resolution'
  abandon?: AbandonPayload;        // only when kind is 'abandon'
  deadlineAt?: string;             // on suspended entries: the journaled deadline
  spanId: string; startedAt: string; endedAt?: string;
};

interface Replayer {
  lookup(scope: string, key: string, ordinal: number, mode: 'scoped'|'cache'|'never'): JournalEntry | 'live';
  append(e: NewJournalEntry): Promise<JournalEntry>;
  ledger(): { usage: Usage; usd: number; agentsSpawned: number };
  resolveSuspended(target: number, a: ResolutionAttempt): Promise<ResolutionOutcome>;
  abandonBranch(a: AbandonAttempt): Promise<ResolutionOutcome>;
  suspensionState(target: number): SuspensionState;
}

// The kernel's single canonical replay predicate (a public function, not an SPI method)
export type ReplayDisposition = 'replay' | 'rerun' | 'skip';
export function replayDisposition(entry: JournalEntry, fold: AbandonFold): ReplayDisposition;
```

Behavior: identity includes kind, agentType, the requested modelSpec (including canonical effort), prompt, schemaHash, toolsetHash, and isolation; it excludes label, phase, onError, retry, replay, and the policy fields (memoizeOutcome, lineage). A miss MUST NOT advance the matching cursor and MUST NOT suppress future hits (insertion stability). append is serialized by a per-run queue and checks the JSON serializability of the value; a failure raises a typed NonSerializableValueError at the call site. The full replay predicate table (DEF-1) is 03-journal-spec.md, section "Replay predicate".

Ships in: @lurker/core (L2). Frozen KeyDeriver profiles for retired hashVersions ship in @lurker/compat.

### 2.2 Storage SPI and shipped stores

Responsibility: pluggable persistence. A dumb byte store of five methods, plus an optional lease capability with a fencing epoch; TranscriptStore keeps agent transcripts and checkpoints as separate blobs so the journal stays small and diffable. ModelKnowledgeStore (05-model-knowledge-spec.md) lives alongside these as a further L0 store SPI.

```ts
interface JournalStore {
  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  putMeta(m: RunMeta): Promise<void>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  delete(runId: string): Promise<void>;
}
interface LeasableStore extends JournalStore {
  acquire(runId: string, owner: string): Promise<Lease /* { runId, owner, epoch } */>;
  renew(l: Lease): Promise<void>;
  release(l: Lease): Promise<void>;
}
interface TranscriptStore {
  put(ref: string, blob: Bytes): Promise<void>;
  get(ref: string): Promise<Bytes | null>;
  list(runId: string): Promise<string[]>;
}
```

Behavior: a store with the lease capability MUST reject an append carrying a stale epoch (the fencing token); split-brain in queue mode is excluded by construction. acquire on a held lease MUST reject with a typed LeaseHeldError, and renew MUST run at an interval of at most ttl/3 (03-journal-spec.md, section "Storage SPI"). RunMeta (runId, status, name, tags, updatedAt, informational hashVersionLow/High) is written by the engine as a separate record, so listRuns never parses payloads. The core ships InMemoryStore (resume disabled, one loud warning) and JsonlFileStore (the journal doubles as an event log). @lurker/store-sqlite implements LeasableStore and is the reference for community stores. The JournalStore contract is normatively tightened by DEF-4 (A1 append atomicity, A2 total per-run order, A3 read-your-writes, A4 payload byte-opacity) and is verified by the executable conformance kit @lurker/store-conformance; the method count did not grow.

Ships in: interfaces in @lurker/core (L0); InMemoryStore and JsonlFileStore in @lurker/core (L1); SqliteStore in @lurker/store-sqlite; the conformance kit in @lurker/store-conformance.

### 2.3 Provider Adapter SPI and Wire Core

Responsibility: the single home of provider wire formats. The shape deliberately mirrors the Vercel AI SDK language-model shape: canonical messages made of ordered parts, one unified stream event vocabulary, namespaced providerOptions on input and providerMetadata on output. Adapters absorb every provider quirk invisibly to the core: pause_turn, refusal handling, assembly of JSON tool arguments, compilation of cacheHint into cache breakpoints, usage normalization. Refusals surface as a typed refusal outcome carrying provider stop details; the earlier refusal-to-null rule is superseded (04-model-layer-spec.md, section "Wire contract").

```ts
interface ProviderAdapter {
  id: string;
  caps(model: string): ModelCaps;
  refreshCaps?(): Promise<void>;
  stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent>;
  countTokens?(req: ChatRequest): Promise<number>;
}
type Part = Text | Image | ToolCall /* { id: CanonicalId; name; args } */ | ToolResult
  | { type: 'provider-raw'; provider: string; block: unknown };
type Usage = { inputTokens; outputTokens; cacheReadTokens; cacheWriteTokens; reasoningTokens? };
```

Behavior: the key decision against cross-provider bugs is that canonical tool-call ids are minted by the library (CanonicalId is an engine-minted ULID; 04-model-layer-spec.md, section "Wire contract"), and every adapter keeps a bijective canonical-to-wire map in both directions; the call_* versus toolu_* format mismatch is solved by construction. provider-raw parts (thinking blocks with signatures, reasoning items) are stored in the canonical history unconditionally and enter the wire view only when the target provider matches: retention is unconditional, dropping happens only in projection. First-class adapters: @lurker/anthropic, @lurker/openai (Responses API), and the openaiCompatible({ id, baseURL, apiKey?, caps? }) factory. Provider SDK autoretries MUST be disabled (max retries 0): the core owns retries and wall-clock. The Usage invariant (inputTokens is the full prompt, including cached tokens) is checked at the adapter boundary.

Ships in: SPI and wire types in @lurker/core (L0); adapters in @lurker/anthropic, @lurker/openai (which also carries the openaiCompatible factory), and @lurker/bridge-ai-sdk (L1).

### 2.4 Model Router and Capability Registry

Responsibility: vendor neutrality and multi-model operation. A per-engine adapter registry (there is no global mutable registry), resolution of { model, effort, providerOptions, fallbacks } on every model invocation along the inheritance chain with a role tag, scrubbing of illegal parameters against ModelCaps, structured-output tier selection, a versioned price table for dollar budgets, role quality floors, and clamping of the startTier hint.

```ts
type ModelRef = `${string}:${string}`; // strictly adapterId:model, no query parameters
type InvocationRole = 'orchestrate'|'plan'|'loop'|'finalize'|'extract'|'summarize';
type ModelCaps = {
  structuredOutput: 'native'|'forced-tool'|'prompt';
  supportsTemperature: boolean; supportsParallelTools: boolean;
  reasoningEfforts: Effort[]; contextWindow: number; maxOutputTokens: number; pricing?: Pricing;
};
```

Behavior: baseURL and API keys are set at adapter construction; several openai-compatible endpoints coexist through explicit ids ('ollama', 'vllm'); a duplicate adapterId at createEngine is a ConfigError. Resolution order: call override > agent profile > workflow default > engine default. AgentOpts.model overrides all roles at once; AgentOpts.routing overrides per role with priority over profile.routing. Failover on a transport error changes only servedBy; the content key hashes the requested modelSpec, so replay stays stable and cost attribution stays honest. Named strong default models for the orchestrate and plan roles live only in the umbrella package configuration, never in @lurker/core (04-model-layer-spec.md, section "Role quality floors").

Ships in: @lurker/core (L2).

### 2.5 Agent Runtime

Responsibility: one subagent loop for all modes. A model turn; tool dispatch through the layered permission chain (hooks > deny rules > ask rules > canUseTool > terminal default; inheritance to subagents only by explicit opt-in); structured output in three tiers with client-side validation and a bounded re-prompt; the error taxonomy; turn-boundary checkpoints; context compaction; a typed AgentResult. It never throws past policy. It produces statuses (including escalated on opt-in) but does not own the replay predicate: the predicate is centralized in the Journal Kernel.

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
type AgentError = { kind: 'transport'|'rate-limit'|'schema-mismatch'|'tool'|'budget'|'terminal';
  retryable: boolean; retryAfterMs?: number; issues?: Issue[] };
export type EscalatedResult<T> = AgentResult<T> & { status: 'escalated'; escalation: EscalationReport };
export function isEscalated<T>(r: AgentResult<T>): r is EscalatedResult<T>;
```

Behavior, role trigger protocol: 'loop' fires on every turn while tools are available to the model; 'extract' fires as a separate final structured-output invocation only when a schema is set and either routing directs extract to a different model or the current model's caps cannot serve the required tier, otherwise the schema rides the last loop turn without an extra call; 'finalize' fires only if configured in routing, as a synthesis invocation with toolChoice 'none' over the full transcript after tools stop; 'summarize' fires at the compaction threshold. Compaction is owned by this component: history processors per profile plus a contextWindow threshold; compaction points are written into the checkpoint. HistoryProjector projects the canonical history into the target's wire view (canonical id map; provider-raw only to its native provider), which makes per-role provider mixing inside one agent correct. A tool ask-approval is journaled as a suspended approval together with the turn checkpoint; resume continues the loop from the same turn without re-paying turns or re-running tools (I1). The schema-mismatch re-prompt default is 2 attempts under UsageLimits; semantic retries go through throw ModelRetry.

Ships in: @lurker/core (L3).

### 2.6 Tool System and MCP Bus

Responsibility: typed tools with type inference from SchemaSpec. ToolSource makes native tools, in-process MCP, and stdio/HTTP MCP indistinguishable to the runtime (allow/deny filters, name-collision prefixing, per-session tools/list cache, needsApproval feeding the permission chain); ModelRetry for model-fixable errors; executors as a declared capability; worktree isolation with a full lifecycle.

```ts
function tool<S extends SchemaSpec>(d: {
  name: string; description: string; parameters: S; version?: string;
  executor?: 'inprocess'|'subprocess'|'container';
  needsApproval?: boolean; risk?: ToolRisk;   // risk metadata
  execute(input: Out<S>, ctx: ToolContext): Promise<unknown>;
}): ToolDef;

function mcp(cfg: { transport: 'stdio'|'streamable-http'|'inprocess';
  command?; url?; server?; allow?; deny?; prefix?; approval? }): ToolSource;

interface IsolationProvider {
  acquire(s: { runId; spanId; ref? }): Promise<{
    cwd: string;
    collect(): Promise<{ files: string[]; patch: Bytes }>;
    dispose(keep?: boolean): Promise<void>;
  }>;
}
```

Behavior: toolsetHash is computed from the contract (name, description, canonical parameters JSON Schema, version), never from the execute closure. Editing an implementation does not invalidate the journal; a semantic change is recorded by bumping version. Worktree lifecycle: created from HEAD (or a given ref) of the host git repository; the agent's tools receive a cwd inside it; collect() captures the changed-file list and a patch, puts the patch into TranscriptStore, and returns it in AgentResult.artifacts; applying the patch remains the caller's job; dispose cleans up the worktree (keepOnError is optional); a non-git host raises a typed ConfigError. Permission chain and presets: 08-tools-permissions-spec.md.

Ships in: @lurker/core (L3). The MCP bus depends on @modelcontextprotocol/sdk ^1.29 (13-toolchain-repo.md).

### 2.7 Workflow Engine and Ctx Primitives

Responsibility: the run lifecycle and the entire authoring surface. defineWorkflow, generic over errorPolicy for honest null typing; ctx.agent/parallel/pipeline/step/workflow/awaitExternal/phase/log/budget/now/random/uuid; the concurrency scheduler; the three-layer budget (I4); run outcomes including exhausted and suspended.

```ts
const wf = defineWorkflow({ name, args, errorPolicy: 'strict' }, async (ctx, args) => { /* ... */ });

interface Ctx<P extends 'strict'|'lenient' = 'strict'> {
  agent<S extends SchemaSpec>(p: string, o: AgentOpts<S> & { onError: 'throw' }): Promise<Out<S>>;
  agent<S extends SchemaSpec>(p: string, o?: AgentOpts<S>): Promise<P extends 'lenient' ? Out<S> | null : Out<S>>;
  parallel<T>(t: Array<() => Promise<T>>, o?: { settle?: boolean; abortSiblings?: boolean }): Promise<T[] | Settled<T>[]>;
  pipeline<I, A, B>(items: I[], s1: Stage<I, A>, s2: Stage<A, B>,
    o?: { onItemError?: 'drop'|'throw'|'collect' }): Promise<B[]>; // overloads up to 6 stages
  step<T extends Json>(label: string, fn: () => Promise<T>, o?: { deps?: Json[]; key?: string }): Promise<T>;
  workflow<A2, R2>(child, args): Promise<R2>;   // nesting via AdmissionController; maxDepth configurable
  awaitExternal<T>(key: string, o?: { schema?: SchemaSpec<T>; prompt?: string }): Promise<T>;
  budget: { spent(): Spend; remaining(): Spend | null };
  now(): number; random(key?: string): number; uuid(): string;
}
```

The sketch above marks the component boundary; the complete normative Ctx interface, including phase, log, brief, the agent { result: 'full' } overload returning AgentResult<Out<S>>, the Settled<T> definition, and ctx.orchestrate, is owned by 06-execution-spec.md, section "Canonical Ctx interface".

Behavior: the final nesting rule is that there is no fixed one-level ctx.workflow nesting; nesting depth is governed by the AdmissionController with a configurable maxDepth (default 1, ceiling 4) and hierarchical budget sub-accounts in which a child's spend rolls up to every ancestor up to the root. The agent return type follows the effective error policy through a literal generic; ctx.step folds deps into its key (as useMemo does). errorPolicy 'lenient' (the planner emits it) makes onError 'null' the default; run.dropped makes silent pipeline losses visible. Structural limits (maxDepth, maxTotalSpawns) return a typed error to the orchestrator instead of tearing down the run. ctx.brief is a journaled summarize helper for passing an inheritable brief to a child. ctx.now/random/uuid are deterministic shims journaled as kind 'rand' subtypes (03-journal-spec.md, section "JournalEntry form").

Ships in: @lurker/core (L4).

### 2.8 Script Runners

Responsibility: the execution seam for workflow bodies, with an explicit type-level split of kinds: Workflow (a closure, in-process only) and CompiledWorkflow (source text, admissible into the worker sandbox). Feeding a closure to the sandbox is impossible by types.

```ts
interface ScriptRunner { execute<A, R>(wf: Workflow<A, R> | CompiledWorkflow, ctx: Ctx, args: A): Promise<R> }
class InProcessRunner {}       // dev mode patches Date.now/Math.random to warn
class WorkerSandboxRunner { constructor(o?: { timeoutMs?: number; memoryMb?: number }) } // CompiledWorkflow only
function compileScript(source: string, o?: { allowImports?: string[] }): CompiledWorkflow; // rejection = ScriptRejected
```

Behavior: the worker sandbox is a worker thread with a curated global scope. The ctx methods are bound as bare globals; the exact sandbox global set is agent, parallel, pipeline, step, phase, log, budget, workflow, awaitExternal, now, random, uuid (06-execution-spec.md, section "Script runners"). Date.now/Math.random are replaced by seeded, journaled versions (seeded from runId); import/fetch/process are absent; every primitive call is an RPC over MessagePort into the host engine; values are JSON only. The sanctioned sandbox dialect (taught to the planner by the API card): schema only as a JSON Schema literal, tools only by registered profile names, onError only 'throw'|'null', model as a string, no functions in options; declarative policy rule tables without closures; ladders as JSON. eslint-plugin-lurker bans bare Date.now/Math.random/new Date/fetch/process.env in workflow modules and bare Promise.all over ctx calls (ctx.parallel instead), and emits structured JSON diagnostics for the self-repair loop.

The honest position: the worker sandbox is a determinism and blast-radius boundary, not a security boundary (NFR, security posture; 01-requirements.md). Containment of hostile code comes from executors (subprocess/container) and the worktree; a QuickJS runner for third-party scripts is a future plugin behind this same seam and is excluded from v1 (EXC registry in 01-requirements.md). InProcessRunner additionally carries the onEscalation hook.

Ships in: ScriptRunner interface in @lurker/core (L0); InProcessRunner in @lurker/core (L5); WorkerSandboxRunner and compileScript in @lurker/planner (L5); lint rules in eslint-plugin-lurker.

### 2.9 Orchestration Modes

Responsibility: three modes on one subagent runtime, one journal, one budget path (I5). (a) Deterministic human scripts: engine.run(wf). (b) The flagship hybrid: plan() asks a planner model (role 'plan') to write a script against the ctx-dialect API card and the profile cards, lints it, repairs it up to N rounds from JSON diagnostics, compiles it, and executes it deterministically in the worker sandbox. (c) Dynamic: an orchestrator agent (role 'orchestrate') with typed spawn_agent/parallel_agents/finish tools, handle-based await_any/await_all, and cancel_agent. There is no fourth mode (EXC registry in 01-requirements.md); all cross-agent interaction is call-and-return only (I3).

```ts
plan(engine, goal, o?: { model?: ModelSpec; profiles?: string[]; repairRounds?: number }):
  Promise<{ source: string; workflow: CompiledWorkflow; lint: Diagnostic[] }>;
runPlanned(engine, goal, args?): RunHandle<unknown>;
orchestrate(engine, goal, o?: { model?; profiles?; maxSpawns?; budget }): RunHandle<unknown>;
```

Behavior: both orchestrate surfaces exist and share one implementation. Top-level orchestrate(engine, goal, opts) creates a run; ctx.orchestrate(goal, opts) nests under the AdmissionController maxDepth (06-execution-spec.md, section "Modes and entry points"). Mode (c) resume semantics are explicit: orchestrator turns MUST be checkpointed at turn boundaries, and every spawn is an ordinary journal entry of kind 'agent', so a crashed orchestrate() restores its history from the checkpoint and finds child results by content keys without regenerating spawn decisions. profileCard(registry) yields the same text for the planner prompt and for the spawn_agent tool enum: both modes speak one agent vocabulary. Orchestration packages build exclusively from the public core API. The opt-in mode (c) extension, PlanRunner, with plan revision, the RunLedger, the ModelLadder, and the TerminationAccount, is specified in 07-adaptive-orchestration-spec.md.

Ships in: modes (a) and (c) in @lurker/core (L4); mode (b) in @lurker/planner (L5); PlanRunner in @lurker/plan (L4 extension).

### 2.10 Event Stream and Observability

Responsibility: a single discriminated WorkflowEvent stream with hierarchical spanId (run > phase > agent > tool > child) as the sole observability source. It feeds RunHandle.events and on(), the terminal progress renderer, the JSONL log, and the optional OTel exporter. spanId is pure telemetry and never enters journal identity; WorkflowEvent.seq is an independent per-run telemetry counter distinct from JournalEntry.seq; replayed events carry replayed: true for UI deduplication, and the re-emission set is journal-backed lifecycle events only, never stream deltas. Event catalog, payload schemas, metrics, and the OTel mapping: 09-observability-testing-spec.md.

Ships in: @lurker/core (L4); the OTel exporter in @lurker/cli.

### 2.11 Test Harness

Responsibility: three test tiers that fall directly out of two architecture seams. FakeAdapter matches on agentType/label/prompt regex for fast, fully typed unit tests; VCR cassettes sit at the adapter boundary (vendor-neutral by construction; redacted JSONL keyed by request hash); replay-strict runs a journal with zero live calls and fails loudly with JournalMissError on any miss. Matchers ship for Vitest and Jest. Details: 09-observability-testing-spec.md, sections "Test harness three tiers" and "Mandatory defect cassette catalog"; strategy and exit criteria: 11-testing-strategy.md.

Ships in: @lurker/testing (L6).

### 2.12 Shell: CLI, Server, and Queue

Responsibility: an optional ops layer built strictly on public APIs: the CLI with TUI progress; an HTTP server with SSE events and external-input resolution for HITL; a queue worker for background multi-process runs; knowledge-base maintenance commands. The full contracts are in section 8 below.

Ships in: @lurker/cli (L6).

## 3. Package map

lurker ships as 14 packages. All packages release in lockstep semver with identical versions; the sole exemption is @lurker/compat, which is independently versioned (12-release-versioning.md, section "Exemptions"). eslint-plugin-lurker is lockstep despite its npm-required unscoped name.

Documentation and install commands MUST reference packages as @lurker/<name> and MUST NOT use the bare name lurker in install commands: the unscoped npm name is squatted and the umbrella's final unscoped availability is an open contingency (13-toolchain-repo.md, section "Naming risk note").

### 3.1 Package table

| Package | Layer | Contents |
|---|---|---|
| lurker | umbrella | Batteries-included umbrella: re-exports @lurker/core, both first-class adapters, the file store, and the terminal progress renderer; the single-install path. Carries the named strong orchestrate/plan default models in its config (never in @lurker/core). |
| @lurker/core | L0-L5 | L0 contracts; the journal kernel (including replayDisposition, ref-entries, the hashVersion KeyDeriver registry, TerminationAccount); ctx primitives; the agent runtime with HistoryProjector; the model router and capability registry; the tool system and MCP bus; the dynamic orchestrator; AdmissionController; InProcessRunner; InMemory and JSONL stores; the event stream; the file-based ModelKnowledgeStore and the modelKnowledgeCard renderer. Zero provider SDK dependencies; the sole vendored RUNTIME dependency is the JSON Schema mini-validator; the vendored StandardSchemaV1/StandardJSONSchemaV1 declarations are types only (no runtime code) and do not count against it (13-toolchain-repo.md, section "Committed toolchain"). |
| @lurker/plan | L4 ext | PlanRunner, RunLedger, the EscalationProtocol orchestrator extensions, ModelLadder configuration; built from the public core API. |
| @lurker/anthropic | L1 | Adapter over @anthropic-ai/sdk: thinking-block replay with signatures, cacheHint compilation, pause_turn, typed refusal outcomes, 529 and retry-after handling, usage normalization. |
| @lurker/openai | L1 | Responses API adapter (reasoning items, strict json_schema) plus the openaiCompatible factory with explicit id and baseURL. |
| @lurker/store-sqlite | L1 | SqliteStore implementing JournalStore and LeasableStore with a fencing epoch; the reference for community stores. |
| @lurker/store-conformance | L6 | Executable conformance kit for store adapters (DEF-4): atomicity, total per-run order, read-your-writes, opaque payload, fencing, golden fold-state fixtures, the end-to-end decide-once oracle. |
| @lurker/compat | L2 ext | Frozen KeyDeriver profiles for hashVersions that left the support window (DEF-6); independently versioned (sole lockstep exemption), tree-shakeable, attached via EngineOptions.extraDerivers. |
| @lurker/planner | L5 | The flagship hybrid: the plan agent, compileScript with an import allowlist, WorkerSandboxRunner with seeded journaled globals, the self-repair loop over lint diagnostics. |
| eslint-plugin-lurker | tooling | Determinism rules (ban bare Date.now/Math.random/new Date/fetch/process.env in workflow modules; ban Promise.all over ctx calls) with structured JSON diagnostics for the self-repair loop. |
| @lurker/testing | L6 | createTestEngine and FakeAdapter, VCR cassettes with secret redaction, replay-strict runs, matchers for Vitest and Jest. |
| @lurker/evals | L6 | Eval cases, golden outputs, rubric and judge graders through the engine, matrix sweeps, canary fingerprint. |
| @lurker/cli | L6 | run/resume/runs/inspect/plan commands, TUI progress, createServer (HTTP, SSE, awaitExternal resolution), createWorker over LeasableStore, the OTel exporter, and the kb maintenance commands (lurker kb list / inbox / sweep). |
| @lurker/bridge-ai-sdk | L1 | Wraps any Vercel AI SDK LanguageModelV4 in a ProviderAdapter for the long tail of providers; performs a specificationVersion runtime check; documented as the highest-churn package (04-model-layer-spec.md). |

### 3.2 Dependency graph

Internal dependencies use workspace:* and shared external versions come from pnpm catalogs (13-toolchain-repo.md).

```text
@lurker/core              -> (none; vendored JSON Schema validator and StandardSchemaV1 types;
                              external: @modelcontextprotocol/sdk ^1.29 for the MCP bus)
@lurker/anthropic         -> @lurker/core (L0 types), @anthropic-ai/sdk
@lurker/openai            -> @lurker/core (L0 types), openai SDK
@lurker/bridge-ai-sdk     -> @lurker/core (L0 types), @ai-sdk/provider ^4
@lurker/store-sqlite      -> @lurker/core (L0 types), sqlite driver
@lurker/store-conformance -> @lurker/core (L0 types); runs under Vitest
@lurker/compat            -> @lurker/core (L0 KeyDeriver types)
@lurker/plan              -> @lurker/core (public API only)
@lurker/planner           -> @lurker/core (public API only), eslint-plugin-lurker + ESLint (self-repair loop)
eslint-plugin-lurker      -> (ESLint 9 peer only; no dependency on @lurker/core)
@lurker/testing           -> @lurker/core (public API only)
@lurker/evals             -> @lurker/core (public API only), @lurker/testing (VCR-deterministic eval CI)
@lurker/cli               -> @lurker/core (public API only), @opentelemetry/api ^1.9 (optional peer), @lurker/planner (loaded DYNAMICALLY by the plan command only and deliberately NOT a declared peer dependency: a workspace peer would major-cascade the fixed group on every planner bump under the changesets peer rule; a missing install is a clear CLI error, never a load failure of the other commands; amended during M6-T11)
lurker (umbrella)         -> @lurker/core, @lurker/anthropic, @lurker/openai
```

### 3.3 Disambiguation: @lurker/plan versus @lurker/planner

The two names are close by design; both are kept to preserve the established vocabulary, and a rename was rejected.

| Package | What it is | What it is not |
|---|---|---|
| @lurker/plan | The opt-in mode (c) extension: PlanRunner, RunLedger, escalation extensions, ModelLadder configuration (07-adaptive-orchestration-spec.md). | Not the flagship hybrid; contains no plan agent and no sandbox. |
| @lurker/planner | The flagship hybrid, mode (b): the plan agent, compileScript, WorkerSandboxRunner, the self-repair loop (06-execution-spec.md, section "Script runners"). | Not PlanRunner; contains no TaskPlan machinery. |

## 4. Dependency rules

These rules are normative and are enforced permanently, not only at 1.0.

- The core MUST NOT import a plugin. Nothing in @lurker/core references an adapter, a store package, a runner package, or a shell.
- Plugins MUST import only core types (L0) and MUST NOT import each other. A provider SDK appears exclusively inside its own adapter.
- Orchestration packages (@lurker/plan, @lurker/planner) and shells (@lurker/cli, @lurker/testing, @lurker/evals, @lurker/store-conformance) MUST build exclusively from the public API. This is the permanent seam-sufficiency test: if a shell needs a private hook, the seam is wrong and the fix is a spec amendment, not a private import.
- There MUST be no module state at any layer. All registries (adapters, capabilities and prices, KeyDerivers, agent profiles, mechanical gate profiles, workflows) are per-engine; ctx is created by the engine for each run. This rule is also why all 14 packages publish ESM-only: two module instances would duplicate journal and registry singleton state and break content-addressed replay identity (13-toolchain-repo.md, section 1).
- Dependencies point strictly downward in the layer model. L6 additionally consumes the event stream and the stores, both public surfaces.
- Package entry modules MUST NOT use top-level await (13-toolchain-repo.md).

## 5. SPI seams and the 1.0 freeze

Six SPI seams freeze at 1.0. The founder decision stands: 1.0 ships only after these six seams freeze, and the freeze happens only after the server and queue soak (M8) plus the SPI audit (M9).

| # | Seam | Interfaces | What it decouples | Owning spec | Shipped implementations |
|---|---|---|---|---|---|
| 1 | Provider adapter | ProviderAdapter | Provider wire formats from the core | 04-model-layer-spec.md | @lurker/anthropic, @lurker/openai, openaiCompatible, @lurker/bridge-ai-sdk |
| 2 | Journal storage | JournalStore + LeasableStore (one seam) | Persistence and leasing from the kernel | 03-journal-spec.md, section "Storage SPI" | InMemoryStore, JsonlFileStore (@lurker/core); SqliteStore (@lurker/store-sqlite) |
| 3 | Transcript storage | TranscriptStore | Large blobs (transcripts, checkpoints, patches) from the journal | 03-journal-spec.md, section "Storage SPI" | Bundled with the shipped stores |
| 4 | Script runner | ScriptRunner | Workflow body execution from the engine | 06-execution-spec.md, section "Script runners" | InProcessRunner (@lurker/core), WorkerSandboxRunner (@lurker/planner) |
| 5 | Tool source | ToolSource | Tool provisioning (native, MCP) from the runtime | 08-tools-permissions-spec.md, section "MCP bus" | Native tools and mcp() (@lurker/core) |
| 6 | Isolation provider | IsolationProvider | Filesystem isolation from tools | 08-tools-permissions-spec.md, section "IsolationProvider and worktree lifecycle" | Git worktree provider (@lurker/core) |

Two clarifications close earlier ambiguity in the seam count:

- ModelKnowledgeStore is an L0 SPI whose type skeleton lands with the M0 L0 scaffold (spi/knowledge.ts); its file-backed default implementation and all behavior ship in the post-1.0 track (M10 / v1.1.0), and it freezes post-1.0 together with knowledge-base phase 1, not at 1.0 (05-model-knowledge-spec.md; 10-implementation-plan.md, section "Post-1.0 track").
- EventSink does not exist as an SPI. The event surface is the RunHandle.events / on() public API (09-observability-testing-spec.md); it is public API governed by semver, but it is not an implementable seam and is not on the freeze list.

What freeze means for 1.0:

- The TypeScript surface of each frozen seam (method signatures, argument and result types, error contracts, and the journaled payload semantics they imply) MUST NOT change incompatibly after 1.0. Additive, optional extensions MAY be introduced under semver minor rules.
- Third-party implementations written against the 1.0 seams MUST keep working across all 1.x releases. For stores this is checkable: @lurker/store-conformance is the executable definition of the storage seam.
- Before the freeze, each seam MUST have at least two independent consumers or implementations exercised in CI (the shells and the multi-process soak of M8 provide this), so that the freeze locks a proven boundary rather than a guess.
- SPI drift is tracked by diffing committed rolled-up .d.ts files in PRs (13-toolchain-repo.md); the M9 SPI audit signs off the final surfaces.
- The 1.0 release gates beyond the freeze (license decided, trademark clearance, naming contingency) are listed in 12-release-versioning.md, section "The 1.0 gate".

## 6. Error taxonomy

The error taxonomy is owned by L0. All engine-raised errors derive from a single base class with a closed string-code registry; the registry below is exhaustive, and adding a code requires an amendment to this section.

```ts
// L0: base class for all engine-raised errors
export abstract class LurkerError extends Error {
  abstract readonly code: LurkerErrorCode; // closed registry; see the table below
  readonly retryable: boolean;
  readonly data?: Json;
  toWire(): WireError;
}

// JSON-serializable projection stored in journal entries (JournalEntry.error)
// and sent across process boundaries (worker sandbox RPC, HTTP server).
export type WireError = {
  code: string;
  message: string;
  retryable: boolean;
  data?: Json;
};
```

Rules:

- Any error that crosses a process boundary or is persisted MUST be a WireError projection; raw Error objects never enter the journal.
- AgentError is not a LurkerError subclass: it is the structured error value carried on AgentResult.error (see section 2.5) and journaled inside the agent terminal entry. Its WireError projection uses code 'agent', with kind, retryAfterMs, and issues carried in data.
- ModelRetry is deliberately absent from the registry: it is a control-flow signal for semantic retries (06-execution-spec.md), never a journaled error.
- "Retryable" means the engine's retry machinery (RetryPolicy under the journal, 04-model-layer-spec.md) MAY retry; it never means a provider SDK autoretry, which is disabled.

| Error | Layer | Code | Retryable | Journaling rule |
|---|---|---|---|---|
| AgentError | L3 agent runtime | agent | Per kind: transport and rate-limit yes; schema-mismatch via the bounded re-prompt; tool per tool; budget and terminal no | Journaled as WireError on the agent terminal entry; kind and details in data |
| ConfigError | Any (construction and definition time) | config | No | Never journaled; raised before any run effect (duplicate adapterId, non-git host for worktree isolation, worker over a non-leasable store, failed schema projection) |
| NonSerializableValueError | L2 journal kernel | non_serializable_value | No | Never journaled; thrown at the call site whose value failed the append serializability check |
| ScriptRejected | L5 compileScript | script_rejected | No | Never journaled as its own entry; surfaced as diagnostics to the plan() self-repair loop |
| JournalCompatibilityError | L2 kernel (resume, worker acquire) | journal_compat | No | Never journaled; refuses to open a journal whose hashVersion falls outside the support window; sub-codes in 03-journal-spec.md, section "hashVersion" |
| InvalidResolutionError | L2 ResolutionArbiter | invalid_resolution | No | Never journaled; a resolution attempt against an already-closed suspension is rejected under the first-closing-wins fold and appends no entry (03-journal-spec.md, section "Suspension and resolutions") |
| JournalOrderViolation | L2 kernel / store boundary | journal_order_violation | No | Never journaled; signals a breach of the total per-run append order (an unfenced concurrent writer or a store violating contract A2) |
| PlanInvariantError | L4 PlanRunner (@lurker/plan) | plan_invariant | No | The offending plan revision is rejected and the rejection is recorded in the journaled revision history feeding the droppedRevisionStreak guard; returned to the orchestrator, not thrown through the run (07-adaptive-orchestration-spec.md, section "PlanRunner") |
| ReplayPlanHashMismatch | L4 PlanRunner (@lurker/plan) | replay_plan_hash_mismatch | No | Never journaled; raised at resume when the refolded plan state disagrees with the journaled planHash chain (07-adaptive-orchestration-spec.md) |
| OrchestratorCapConfigError | L4 orchestration (DEF-7) | orchestrator_cap_config | No | Never journaled; thrown before the first LLM call when the orchestrator cap and finalize reserve configuration is invalid; applies to both orchestrate surfaces |
| JournalMissError | @lurker/testing replay-strict | journal_miss | No | Never journaled; a strict replay encountered a call that would go live |
| BudgetExhaustedError | L4 budget (surfaces via ctx primitives) | budget_exhausted | No | The budget guard denial is a decision entry (I2); ctx primitives throw it as AgentError kind 'budget'; the run reports outcome 'exhausted', overriding 'error' (06-execution-spec.md, section "Three-layer budget") |
| AdmissionRejectedError | L4 AdmissionController (07-adaptive-orchestration-spec.md) | admission_rejected | No | The rejection verdict is embedded in the carrying spawn-admission decision entry and replays identically (DEF-2); the error surfaces the embedded AdmitRejectReason in data to the caller (a typed tool error for orchestrators) and never tears the run down; budget-code rejections throw BudgetExhaustedError instead. (Amended during M6-T06: structural rejections needed a registry home distinct from exhaustion.) |
| SandboxError | L5 WorkerSandboxRunner (06-execution-spec.md, section "Script runners") | sandbox_limit | No | Crossing timeoutMs or memoryMb terminates the worker; the run completes with outcome 'error' carrying the WireError projection; data records { reason: 'timeout' \| 'memory', limit }; never journaled as its own entry. (Amended during M6-T02: docs/06 8.2 promised a typed code without registering one.) |
| LeaseHeldError | L0/L1 store contract | lease_held | Yes | Never journaled; acquire on a held lease MUST reject with it; retry after the lease ttl elapses or the holder releases |

## 7. Engine anatomy

The engine is the single entry object a host application constructs; every registry hangs off it, and nothing is module-global.

```ts
function createEngine(o: {
  adapters: ProviderAdapter[];        // duplicate adapter ids raise ConfigError
  stores?: {
    journal?: JournalStore | LeasableStore;
    transcripts?: TranscriptStore;
    modelKnowledge?: ModelKnowledgeStore;
  };
  defaults?: EngineDefaults;          // routing defaults, role floors, permission presets
  budgetDefaults?: BudgetDefaults;
  concurrency?: ConcurrencyOptions;   // per-run semaphore, per-provider keys
  runners?: { sandbox?: ScriptRunner }; // CompiledWorkflow execution seam (M6-T02 amendment; 06-execution-spec.md 10.1)
  extraDerivers?: KeyDeriver[];       // @lurker/compat frozen profiles attach here
}): Engine;

interface Engine {
  run<A, R>(wf: Workflow<A, R> | CompiledWorkflow, args: A, opts?: RunOptions): RunHandle<R>;
  resume(runId: string, wf?: Workflow<unknown, unknown> | CompiledWorkflow): RunHandle<unknown>;
}

type RunStatus = RunOutcome['status'] | 'running';
```

Per-engine registries (never module-level):

- Adapter registry: keyed by adapterId; duplicates are a ConfigError.
- Capability and price registry: ModelCaps per model plus the versioned price table with the monotonic pricingVersion (04-model-layer-spec.md, section "Pricing").
- KeyDeriver registry: one deriver per supported hashVersion; extraDerivers attaches @lurker/compat profiles (03-journal-spec.md, section "hashVersion").
- Agent profile registry: the source for profileCard used by both the planner and the spawn_agent enum.
- Mechanical gate profile registry: named pure functions over AgentResult.artifacts for ladder acceptance gates (07-adaptive-orchestration-spec.md, section "ModelLadder").
- Workflow registry: an explicit, host-constructed mapping from registered workflow name to Workflow or CompiledWorkflow. There is no module-level registry. Shells consume it explicitly: createServer({ engine, workflows }). The registered-name form of ctx.workflow and the sandbox workflow global resolve against it (06-execution-spec.md, section "Engine and ops API").

engine.resume(runId, wf?) rebinds a journal to a workflow definition under the run-to-definition binding contract (06-execution-spec.md, section "Engine and ops API"); the residual binding questions are tracked in 14-open-questions.md. RunOptions, RunHandle, and RunOutcome are specified in 06-execution-spec.md.

## 8. Shells overview

The shells are an optional ops layer strictly on top of the public APIs. They exercise the seams continuously: anything a shell cannot do through the public surface is a spec defect.

### 8.1 CLI

Canonical grammar (no aliases in v1):

```text
lurker run <workflow> --args '{"pr":42}' --store .lurker --budget-usd 20
lurker resume <runId> --args '{"pr":42}' --store .lurker
lurker runs ls --store .lurker
lurker inspect <runId> --store .lurker
lurker plan "goal" --dry-run
lurker kb list | inbox | sweep
```

(resume/inspect flags amended during M5-T01; the normative grammar and
the rationale live in 06-execution-spec.md, section "Canonical CLI
grammar".)

The CLI renders TUI progress from the event stream and performs interactive resolution of suspended approvals and external inputs (the resolution source mapping is 03-journal-spec.md, section "Suspension and resolutions").

### 8.2 HTTP server

```ts
function createServer(o: { engine: Engine; workflows: WorkflowRegistry }):
  { fetch(req: Request): Promise<Response> };
```

| Route | Purpose |
|---|---|
| POST /runs | Start a run of a registered workflow |
| GET /runs/:id | Run status and outcome |
| GET /runs/:id/events | SSE event stream |
| POST /runs/:id/external/:key | Resolve an awaitExternal suspension |
| GET /runs/:id/cost | CostReport |

Authentication is explicitly out of scope: the server is host-embedded and auth belongs to host middleware (14-open-questions.md). SSE reconnection uses Last-Event-ID mapped to the event seq (14-open-questions.md).

### 8.3 Queue worker

```ts
function createWorker(engine: Engine, o: { store: LeasableStore; concurrency?: number }): Worker;
```

The worker leases resumable and suspended runs via acquire/renew/release with a fencing epoch; stateless workers call engine.resume, passing the lease via ResumeOptions.lease so every engine append of the resumed run is fenced by the epoch (06-execution-spec.md, section "Engine and ops API"; M8 entry amendment). A store without the lease capability raises a typed ConfigError at worker start, never a silent split-brain. At acquire, the worker checks the journal's hashVersion against the engine's support window and rejects with JournalCompatibilityError when outside it (DEF-6; 03-journal-spec.md, section "hashVersion"). Queue semantics are honestly at-least-once, with deduplication provided by the journal (two-phase entries; 03-journal-spec.md, section "Two-phase entries"). A distributed cross-process rate limiter is excluded from v1 and documented as a queue-mode limitation (EXC registry in 01-requirements.md; 14-open-questions.md).
