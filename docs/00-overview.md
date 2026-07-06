# lurker overview

- Status: Ready for implementation
- Version: 0.2.0-docs
- Date: 2026-07-06
- Purpose: what lurker is, its seven hard goals, the load-bearing invariants I1-I6, the three orchestration modes, the component and package maps, defect-fix provenance, and the canonical glossary.

## 1. What lurker is

lurker is an embeddable TypeScript library for building multi-agent LLM workflows, inspired by the ultracode Workflow feature in Claude Code. It is a library, not a platform: it lives inside a host application and requires no server, no database, and no control plane. Shells (CLI, HTTP server, queue worker) exist but are optional and are built strictly on top of the public APIs (see 02-architecture.md, section "Shells overview").

## 2. Goals

Seven hard requirements. Each one is backed by a concrete mechanism, not a declaration, and owns a requirement block in 01-requirements.md.

1. **Vendor neutrality by construction.** The core MUST NOT import provider SDKs; every provider lives exclusively inside its own adapter behind the ProviderAdapter SPI. First-class adapters: @lurker/anthropic, @lurker/openai (Responses API), and the openaiCompatible factory; the long tail is served through a bridge to the ai-sdk ecosystem. Mechanism: ProviderAdapter SPI (04-model-layer-spec.md). Requirements: FR-1xx.
2. **Multi-model at every level.** The model is resolved on every invocation, not once per agent: call override > agent profile > workflow defaults > engine defaults. Within a single agent, invocation roles (loop, extract, finalize, summarize, plan, orchestrate) MAY route to different models of different providers; cross-provider history correctness is owned by the HistoryProjector. Mechanism: router resolution chain and role protocol (04-model-layer-spec.md). Requirements: FR-1xx.
3. **Three orchestration modes on one runtime, one journal, one budget path** (see section 4 below). No fourth mode exists. Topologies are call-and-return only: handoffs and chat-room emergence are rejected on principle. Mechanism: single engine and journal path (06-execution-spec.md, 07-adaptive-orchestration-spec.md). Requirements: FR-2xx, FR-3xx.
4. **Embeddability first.** Shells (CLI, HTTP server, queue worker) build strictly on public APIs and are optional; no lower layer depends on them. Every guard state of adaptive orchestration has a non-HITL terminating fallback: an embedded run with no operator present always terminates rather than hanging. Mechanism: layer rules and guard fallbacks (02-architecture.md, 07-adaptive-orchestration-spec.md). Requirements: FR-7xx and the embeddability NFR in 01-requirements.md.
5. **Durability with the central invariant: a completed LLM call is never paid for twice.** Content-addressed memoizing journal (not event sourcing), scoped forward-matching on resume, inserting a call costs exactly one live call. Mechanism: the journal kernel (03-journal-spec.md). Requirements: FR-0xx.
6. **Budget as a hard invariant.** Three enforcement layers with a declared, bounded overshoot (at most one turn per in-flight agent). Mechanism: the three-layer budget (06-execution-spec.md, section "Three-layer budget"). Requirements: FR-2xx.
7. **Observability and testability out of the box.** A single event stream, FakeAdapter, VCR cassettes, replay-strict journal runs, and an evals package. Mechanism: 09-observability-testing-spec.md. Requirements: FR-5xx.

## 3. Invariants

The invariants below are normative; the I1-I6 numbering is fixed. New invariants MUST continue at I7 and MAY be added only by amending this document, before any code depends on them.

- **I1. Never-pay-twice.** The journal is a content-addressed memoizing log of completed effects, not event sourcing. Entry identity is the triple (structural scope path, sha256 of the canonical JSON of the call, ordinal within scope), qualified by hashVersion. Only completed, paid work is replayed; inserting a new call costs exactly one live call; there is no global prefix-flip; no workflow-versioning API exists (changed content = new key = live call). Full identity spec: 03-journal-spec.md, section "Identity model".
- **I2. Decision-entry principle.** Every dynamic decision (plan revision, admission verdict, escalation decision, a timeout's defaultDecision, a guard verdict, a verify result, a budget-guard denial, a no-progress abort, a knowledge-snapshot pin) is exactly one journaled decision entry, written strictly BEFORE any of its effects and carrying inside it everything that would otherwise have to be re-evaluated live. Every read (plan_view, ledger_read, WakeDigest, the knowledge card) is a pure fold over already-journaled state, pinned to a snapshot. All derived state is ordered by spawn ordinal, never by wall clock.
- **I3. Call-and-return only.** The single cross-agent primitive is agent-as-tool: invoke a specialist and return its result. Handoffs, chat rooms, blackboard coordination, and emergent topology are rejected: they destroy budget attribution and scope identity.
- **I4. Three-layer budget.** (1) Admission before spawn: spent + committedReserve >= ceiling blocks the spawn; (2) a guard before every agent turn; (3) on ceiling crossing, live streams are cut by AbortSignal and partial usage is written with usageApprox: true. Overshoot is bounded by one turn per in-flight agent (no tighter bound is possible: providers bill aborted streams), and this bound is documented. The run dollar ceiling B0 is immutable after start: no API, including HITL decisions, can top it up (DEF-2). Exhaustion is never null: the outcome is exhausted, with partial results. Full spec: 06-execution-spec.md, section "Three-layer budget".
- **I5. One runtime, one journal, one budget path** for all three orchestration modes and all adaptive extensions.
- **I6. Embeddability.** The core runs without a mandatory server; the safe default and the embeddable default coincide by construction (the knowledge-base symmetry principle: every influence mechanism ships together with its correction mechanism in the same package).

## 4. Orchestration modes

Three modes, all on the same runtime, journal, and budget path (I5):

- **(a) Human scripts.** Deterministic workflows written by people, executed by the InProcessRunner (in-process by convention, with lint support for human code).
- **(b) Flagship hybrid.** A planner model writes a script against the API card; the script passes lint and a self-repair loop, then executes deterministically in the worker sandbox (WorkerSandboxRunner). Lives in @lurker/planner.
- **(c) Dynamic orchestrator.** An agent with typed spawn tools. Its optional extension PlanRunner adds the plan as typed, engine-owned data (@lurker/plan).

A fourth mode MUST NOT be added. All topologies are call-and-return only (I3).

The documented default for most users is the phase chain: ctx.phase plus nested ctx.workflow, with replanning only between phases over compact artifacts with fresh context. PlanRunner and the adaptive machinery are opt-in, intended for workloads with wide fan-out that cannot wait for a phase boundary (the numeric threshold is an open question, OQ-01 in 14-open-questions.md). The reference set of quality patterns (adversarial panels, judge panels, loop-until-dry, completeness critics) ships as recipes and prompt templates, never as engine flags.

Mode entry points and resume semantics: 06-execution-spec.md, section "Modes and entry points". The adaptive machinery's applicability per mode: 07-adaptive-orchestration-spec.md, section "Scope and applicability per mode".

## 5. Component map

Twelve components. Full responsibilities and interfaces live in 02-architecture.md, section "The twelve components"; each entry below names its owning spec.

1. **Journal Kernel.** The sole writer and interpreter of run truth: derives content keys and structural scope paths, decides replay-or-live per call via scoped forward-matching, maintains two-phase entries (running / terminal), folds the budget ledger and the values of the deterministic shims, manages suspended markers, and owns the single canonical replay predicate replayDisposition. Stores below it never parse payloads; layers above it know nothing about persistence. Owning spec: 03-journal-spec.md.
2. **Storage SPI and shipped stores.** Pluggable persistence: a dumb five-method byte store plus the optional lease capability with a fencing epoch; TranscriptStore keeps agent transcripts and checkpoints as separate blobs so the journal stays small and diffable. ModelKnowledgeStore sits alongside as its own SPI. Owning spec: 03-journal-spec.md, section "Storage SPI".
3. **Provider Adapter SPI and Wire Core.** The L0 wire contract (Msg/Part including provider-raw, ChatRequest/ChatEvent, Usage, canonical ids) and the adapter SPI behind which every provider SDK lives. Owning spec: 04-model-layer-spec.md.
4. **Model Router and Capability Registry.** Per-engine registry; the call > profile > workflow > engine resolution chain; invocation roles; capability scrubbing; the versioned price table. Owning spec: 04-model-layer-spec.md.
5. **Agent Runtime.** The agent loop: permission chain binding, structured output tiers with bounded re-prompt, turn-boundary checkpoints, HistoryProjector, compaction ownership, ask-approval suspensions. Owning spec: 06-execution-spec.md, section "Agent Runtime binding" (model-facing parts in 04-model-layer-spec.md).
6. **Tool System and MCP Bus.** tool() definitions with SchemaSpec and version, toolsetHash, the permission chain, MCP as a ToolSource, executors, and isolation. Owning spec: 08-tools-permissions-spec.md.
7. **Workflow Engine and Ctx Primitives.** createEngine, engine.run/resume, the canonical Ctx interface (agent, parallel, pipeline, step, phase, log, brief, budget, awaitExternal, deterministic shims), the concurrency scheduler, and the three-layer budget. Owning spec: 06-execution-spec.md.
8. **Script Runners.** The ScriptRunner seam: InProcessRunner in the core for human scripts, WorkerSandboxRunner in @lurker/planner for machine scripts; the Workflow / CompiledWorkflow type split. Owning spec: 06-execution-spec.md, section "Script runners".
9. **Orchestration Modes (Planner and Dynamic Orchestrator).** The flagship hybrid (plan agent, compileScript, self-repair) and the dynamic orchestrator with its typed spawn toolset; PlanRunner as the opt-in plan extension. Owning specs: 06-execution-spec.md, section "Modes and entry points"; 07-adaptive-orchestration-spec.md.
10. **Event Stream and Observability.** The WorkflowEvent envelope and canonical event catalog, metrics, OTel export, RunHandle, CostReport. Owning spec: 09-observability-testing-spec.md.
11. **Test Harness (@lurker/testing).** FakeAdapter and createTestEngine, VCR cassettes, replay-strict runs, matchers. Owning spec: 09-observability-testing-spec.md, section "Test harness three tiers".
12. **Shell: CLI, Server and Queue (@lurker/cli).** run/resume/runs/inspect/plan commands with TUI progress, createServer (HTTP, SSE, external resolution), createWorker over LeasableStore, kb maintenance commands. Owning specs: 06-execution-spec.md, section "Engine and ops API"; 02-architecture.md, section "Shells overview".

## 6. Package map at a glance

Fourteen packages. The authoritative map with the dependency graph is 02-architecture.md, section "Package map"; that section also carries the one-line disambiguation of @lurker/plan versus @lurker/planner. Install commands always use @lurker/<name>; the umbrella name is contingent per 13-toolchain-repo.md, section "Naming risk note".

| Package | Contents |
|---|---|
| lurker | Umbrella with batteries: re-exports @lurker/core, both first-class adapters, the file store, and the terminal progress renderer; the single-npm-install path. Name contingent (OQ-24). |
| @lurker/core | L0 contracts; journal kernel (replayDisposition, ref-entries, hashVersion KeyDeriver registry, TerminationAccount); ctx primitives; agent runtime with HistoryProjector; model router and capability registry; tool system; dynamic orchestrator; AdmissionController; InProcessRunner; InMemory and JSONL stores; event stream; file ModelKnowledgeStore and modelKnowledgeCard renderer. Zero provider-SDK dependencies; sole vendored runtime dependency: the mini JSON Schema validator (vendored StandardSchemaV1 declarations are types only). |
| @lurker/plan | PlanRunner, RunLedger, EscalationProtocol orchestrator extensions, ModelLadder configuration; built entirely from the core public API. |
| @lurker/anthropic | Adapter over @anthropic-ai/sdk: thinking-block replay with signatures, cacheHint, pause_turn, typed refusal outcomes, 529 and retry-after handling, usage normalization. |
| @lurker/openai | Responses API adapter (reasoning items, strict json_schema) plus the openaiCompatible factory with explicit id and baseURL. |
| @lurker/store-sqlite | SqliteStore implementing JournalStore and LeasableStore with the fencing epoch; the reference for community stores. |
| @lurker/store-conformance | Executable store conformance kit (DEF-4): atomicity, total order, read-your-writes, opaque payload, fencing, golden fold-state fixtures, the end-to-end decide-once oracle. |
| @lurker/compat | Frozen KeyDeriver profiles for hashVersions that left the support window (DEF-6); independently versioned (the sole lockstep exemption), tree-shakeable, wired via EngineOptions.extraDerivers. |
| @lurker/planner | The flagship hybrid: plan agent, compileScript with an import allowlist, WorkerSandboxRunner with seeded journaled globals, the self-repair loop over lint diagnostics. |
| eslint-plugin-lurker | Determinism rules (no bare Date.now/Math.random/new Date/fetch/process.env in workflow modules; no Promise.all over ctx calls) with structural JSON diagnostics for the self-repair loop. Lockstep-versioned despite its npm-required unscoped name. |
| @lurker/testing | createTestEngine and FakeAdapter, VCR cassettes with secret redaction, replay-strict runs, matchers for vitest and jest. |
| @lurker/evals | Eval cases, golden outputs, rubric and judge graders running through the engine, matrix sweeps, the canary fingerprint. |
| @lurker/cli | run/resume/runs/inspect/plan commands, TUI progress, createServer (HTTP, SSE, external resolution), createWorker over LeasableStore, OTel exporter, kb maintenance commands (lurker kb list / inbox / sweep). |
| @lurker/bridge-ai-sdk | Wraps any ai-sdk LanguageModelV4 as a ProviderAdapter for the long tail of providers; documented as the highest-churn package. |

## 7. Defect-fix provenance

Round-2 gap analysis of the design found eight real synthesis defects; a fix specification was written for each, and a cross-review of the eight specifications as a single package found eight cross-problems, resolved by twelve point amendments without reopening settled round-1 and round-2 decisions. In this documentation set the fixes are folded into the relevant specs as current behavior; every folded rule carries a (DEF-n) marker, and every cross-review amendment carries an (XF-nn) marker. The XF-01 to XF-12 mapping table is owned by 07-adaptive-orchestration-spec.md, section "Cross-fix mapping".

| ID | Defect fixed | Canonical resolution, folded into |
|---|---|---|
| DEF-1 | Replay predicate fragmentation | One replayDisposition table covering all three kernel amendments: memoizeOutcome with the transport-vs-task classifier and the invalidate/retry API; abandon with derived skipped; escalated-replays-as-ok. Lands in the Journal Kernel milestone (M2) strictly before Agent Runtime (M3). 03-journal-spec.md, section "Replay predicate". |
| DEF-2 | No termination guarantee | TerminationAccount with a frozen limits vector, the termination lemma, and B0 immutability (no top-up via any API, including HITL). 07-adaptive-orchestration-spec.md, section "TerminationAccount and the termination lemma". |
| DEF-3 | No stable task identity across retries | Lineage: LogicalTaskId (LTID) minting and inheritance rules, approachSig, the single-live-attempt invariant. 03-journal-spec.md, section "Lineage"; 07-adaptive-orchestration-spec.md, section "Lineage". |
| DEF-4 | Unserialized resolution races | The ref-entry family (resolution/abandon) with the first-closing-wins fold and the ResolutionArbiter; the store conformance kit. 03-journal-spec.md, section "Suspension and resolutions"; 11-testing-strategy.md, section "Conformance tier". |
| DEF-5 | Duplicate work across plan revisions | Reuse-by-reference: SpawnKey, DedupIndex, node.link, graft aliasing, abandoned-spend accounting. 03-journal-spec.md, section "Abandon, derived skipped, and reuse-by-reference (DEF-5)"; 07-adaptive-orchestration-spec.md, section "AdmissionController". |
| DEF-6 | Journal incompatibility across library versions | Per-entry hashVersion with the KeyDeriver registry, the support window [CURRENT-2, CURRENT], @lurker/compat, JournalCompatibilityError. 03-journal-spec.md, section "hashVersion". |
| DEF-7 | Unbounded orchestrator self-consumption | The orchestrator budget sub-account: cap, effectiveCap, and the finalize reserve. 07-adaptive-orchestration-spec.md, section "Orchestrator budget". |
| DEF-8 | Informal plan revision | PlanRunner formalization: plan.revision/plan.decision entries, the planHash chain, the rebase algorithm and conflict table, quiescence, guards. 07-adaptive-orchestration-spec.md, section "PlanRunner". |

Cross-problem summary (the eight cross-problems found by the cross-review and their applied resolutions):

| # | Cross-problem | Resolution |
|---|---|---|
| 1 | The abandon mechanism was defined twice (kind 'task.abandon' with refs/decisionRef and a stored 'skipped' status versus kind 'abandon' with target/authorizedBy and derived skipped) | The single mechanism is kind 'abandon' in the DEF-4 form; retainCheckpoint/retainWorktree move into that entry; 'skipped' is never persisted anywhere; the status vocabularies are reconciled ('limit' restored, 'skipped' removed from storage). |
| 2 | Three journal-format versioning mechanisms (JOURNAL_FORMAT_VERSION, a v:2 bump, and hashVersion) | One canonical mechanism: per-entry hashVersion; the DEF-1 and DEF-4 bumps are expressed as the hashVersion 2 profile; JOURNAL_FORMAT_VERSION, JournalFormatError, and the v field are removed; the single failure is JournalCompatibilityError. |
| 3 | Inconsistent reference addressing (seq versus {scope, contentHash, ordinal} triples and scope prefixes) | Canonical EntryRef = seq; the triple is allowed only as a debug projection; causeRef, abandon-entry references, and donor references all use seq. |
| 4 | Ref-entries lacked logicalTaskId needed by the DEF-2/DEF-3 folds; a persisted noDebit violated the no-persisted-classification rule; escalation counting units differed | ResolutionPayload and AbandonPayload gain logicalTaskId (escalation resolutions gain countsAgainstLimit); noDebit is removed (only the first closing entry of the first-closing-wins fold carries the debit); the counting unit is authoritative escalation-decision entries with countsAgainstLimit = true. |
| 5 | Timer-race contradiction (one spec had the late timer append nothing; others required journaling all attempts); two serialization mechanisms for one race | DEF-4 is normative: all resolution attempts go through the ResolutionArbiter and are always appended; PlanWriteLock serializes only the "plan" scope; ordering: the resolution closes the suspended entry, then plan.decision references it by seq. |
| 6 | Opposite directions of cross-version SpawnKey matching (legacy canonized upward versus the hashVersion rule forbidding that) | DEF-5 is rewritten onto the DEF-6 mechanism: the candidate's identity is projected downward using the donor entry's version profile; incomparable means an invisible donor; the effort default exists only in the fold layer. |
| 7 | The frozen termination vector lacked the orchestrator cap; init-entry order was unspecified; a field name conflicted | TerminationLimits gains orchestratorCapUsd and finalizeReserveUsd; termination.init is written strictly before orchestrator_budget_reserve with mandatory matching values; the termination lemma gains an explicit wakeup-count resource; the field is renamed maxEscalationsPerLogicalTask. |
| 8 | The plan surface was desynchronized (entry kind names; PlanReviseResult shape; AdmitVerdict defined three times; DedupIndex base; four independent WakeDigest deltas) | The DEF-8 names are canonical (plan.revision / plan.decision); a single PlanReviseResult (the DEF-8 form plus revisionUnitsRemaining); a single AdmitVerdict union; DedupIndex is computed against the fold head under PlanWriteLock; all WakeDigest deltas land in one coordinated schema change inside the hash-v2 profile. |

## 8. Not-in-v1

The explicit exclusion registry (EXC-nn) is owned by 01-requirements.md, section "Exclusions". For orientation, the excluded items are: continuous orchestrator monitoring; whole-plan regeneration as a revision primitive; a fourth orchestration mode; allowChildSpawns (direct spawning by a plan node); a vector store and cross-run memory (except ModelKnowledge as the sanctioned post-1.0 exception); runtime startTier promotion; a graph/YAML execution core; checkpoint-everything snapshot resume; handoffs; engine-level strategy enums; the eval-confirmed auto-gate and corroboration threshold; routing epsilon-exploration; a QuickJS runner; a distributed cross-process rate limiter (documented queue-mode limitation).

## 9. Glossary

Canonical terms used across this documentation set. These terms are mandatory; other docs MUST use exactly these terms.

| Term | Definition |
|---|---|
| journal | The content-addressed memoizing log of completed effects; the single source of run truth (I1). |
| journal entry | One record in the journal, identified by (scope path, content key, ordinal) and qualified by hashVersion. |
| entry kind | The discriminator naming what a journal entry records (agent, rand, resolution, abandon, plan.revision, ...), governed by the kinds registry v2. |
| content key | sha256 over the RFC 8785 canonical JSON of a call's IdentityInput; the content-addressed part of entry identity. |
| scope path | The structural "/"-joined path locating a call site within a run's execution tree; part of entry identity. |
| ordinal | The repeat counter of an identical (scope, key) call within one scope, disambiguating repeated identical calls. |
| live call | A call actually executed (and paid for) against a provider or effectful resource, as opposed to being served from the journal. |
| replay | Serving a completed journal entry's result instead of performing a live call. |
| rerun | Executing a call live again despite an existing journal entry, as directed by the replay disposition. |
| replay disposition (replay predicate) | The single canonical kernel predicate mapping (entry, fold state) to replay, rerun, or skip. |
| scoped forward-matching | The resume algorithm matching calls to entries forward within a scope; a miss does not move the cursor and does not suppress later hits. |
| fold (pure fold) | A pure derivation over already-journaled entries producing derived state (plan state, ledger, digests); never a source of new effects (I2). |
| decision entry | The single journaled record of a dynamic decision, written strictly before any of its effects (I2). |
| ref-entry | An entry (kind resolution or abandon) referencing an earlier entry by seq (ref < seq), closing or annotating it. |
| resolution (attempt/entry) | An attempt to close a suspended entry; all attempts pass through the ResolutionArbiter and are always appended. |
| abandon / abandoned branch | A journaled decision to stop pursuing a subtree; its descendants become derived skipped and cost zero live calls. |
| derived skipped status | The skipped status computed by the abandon fold; never stored in an entry's status field. |
| first-closing-wins fold | Among racing ref-entries for one target, the first appended closing entry wins and alone carries the debit; later entries are superseded. |
| suspended entry / suspension | An entry whose completion awaits an external resolution (approval, external input, escalation decision), with an optional journaled deadlineAt. |
| two-phase entry | An entry written as running before dispatch and completed by a terminal status, enabling at-least-once dispatch without double pay. |
| orphaned entry | A running entry whose completing write never arrived (crash); handled by recovery rules on resume. |
| turn-boundary checkpoint | The canonical-history checkpoint the Agent Runtime writes at each turn boundary under a durable store; resume continues from the same turn. |
| turn | One model invocation cycle of an agent: one assistant response together with its tool calls. |
| card (profile card, API card, knowledge card) | A compact rendered document teaching an agent a surface: the agent profile card, the planner API card, the model knowledge card. |
| model ladder | An ordered sequence of rungs an agent may escalate through, with journaled acceptance gates. |
| ladder rung | One level of the model ladder: a model plus optional effort and per-rung limits. |
| admission | The AdmissionController check every spawn passes before any effect: budget reserve, structural limits, dedup and reuse, lineage. |
| admission verdict (AdmitVerdict) | The typed decision-entry union produced by admission (admit, reject codes, reuse_full, ...). |
| escalation | A child agent's typed report that its task exceeds its scope or is blocked, requesting a decision. |
| plan revision / replan | A journaled plan.revision changing the TaskPlan through the rebase algorithm. |
| park / unpark | Suspending a plan node while retaining its checkpoint (park), and resuming it later (unpark). |
| wake (wakeup) | An orchestrator turn triggered by a wait_for_events trigger firing. |
| wake digest (WakeDigest) | The coalesced, snapshot-pinned digest delivered on wake: digestSeq, planHash, completed task digests, escalations, termination and budget blocks, reuse stats. |
| lineage | The retry ancestry linking attempts of one logical task, carrying depth and approach signature; the basis of escalation caps and single-live-attempt. |
| logical task (LogicalTaskId, LTID) | The stable identity of a task across retries, decompositions, and reuse, minted per the DEF-3 rules. |
| oscillation guard | The guard detecting revision loops (A-B-A plan churn) and forcing a terminating fallback. |
| reuse-by-reference (node.link) | The admission outcome linking a new plan node to a completed donor entry instead of respawning the work (DEF-5). |
| graft | Transplanting a donor subtree's results into the current plan via aliasing during reuse. |
| termination account | The frozen per-run vector of countable resources (spawns, revisions, escalations, wakeups) debited by decision entries; the basis of the termination lemma (DEF-2). |
| run budget ceiling (B0) | The immutable dollar ceiling fixed at run start; no API, including HITL decisions, can raise it. |
| overshoot | Spend beyond the ceiling, bounded by one turn per in-flight agent; the tightest bound possible since providers bill aborted streams. |
| role quality floors | Per-role explicit model allowlists and denylists in engine config, keeping unsuitable models out of critical roles. |
| permission chain | The ordered tool-permission pipeline: hooks, then deny rules, then ask rules, then canUseTool, then the terminal default. |
| worker sandbox | The worker_threads sandbox executing machine-generated scripts with the seeded, journaled global set; a determinism and blast-radius boundary, not a security boundary. |
| lease with fencing epoch | The LeasableStore ownership mechanism for queue workers; appends carrying a stale epoch are rejected and invisible. |

## 10. Name and license status

- Name: the library is lurker and packages publish as @lurker/<name>; the unscoped umbrella name is contingent on resolving a squatted npm name. Canonical risk note: 13-toolchain-repo.md, section "Naming risk note"; tracked as OQ-24 in 14-open-questions.md.
- License: TBD (decided before first public release); a 1.0 gate per 12-release-versioning.md, section "The 1.0 gate"; tracked as OQ-23 in 14-open-questions.md.
