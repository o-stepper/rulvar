# Requirements

- Status: Ready for implementation
- Version: 0.2.0-docs
- Date: 2026-07-06
- Purpose: The normative requirements registry for lurker: all FR-xxx and NFR-xx requirements, the EXC-nn not-in-v1 exclusions, the H-xx hypotheses, and the milestone traceability matrix that the implementation plan references.

## 1 ID scheme and conformance language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as described in RFC 2119.

This document owns four registries:

- **FR-xxx** functional requirements, three digits, allocated in hundred-blocks by area: FR-0xx journal and durability; FR-1xx model layer; FR-2xx execution, ctx, budget, runners, and engine API; FR-3xx adaptive orchestration; FR-4xx tools, permissions, isolation, and MCP; FR-5xx observability, testing, and evals; FR-6xx ModelKnowledge; FR-7xx shells.
- **NFR-xx** non-functional requirements, two digits, one global sequence.
- **EXC-nn** explicit not-in-v1 exclusions (section 4).
- **H-xx** dogfood telemetry hypotheses (section 5).

Registry rules:

- IDs are permanent. They are never renumbered and never reused. A withdrawn requirement keeps its ID with status Withdrawn.
- Every FR carries RFC 2119 normative text plus at least one checkable acceptance criterion (a test, fixture, conformance suite, CI gate, cassette, or statically verifiable property).
- Other documents cite requirements only by ID.
- Rules folded in from the defect-fix specifications carry a DEF-1..DEF-8 marker; cross-review amendments carry an XF marker; open questions are referenced by OQ number in [14-open-questions.md](14-open-questions.md), never answered here by invention.

Entry format used below:

- Requirement: the normative statement.
- Acceptance: checkable criteria.
- Meta: owning milestone (M0..M12 per [10-implementation-plan.md](10-implementation-plan.md), "Milestone-version table"), detailing spec document and section, and DEF/XF markers where applicable.

Invariants I1-I6 cited below are stated normatively in [00-overview.md](00-overview.md), "Invariants I1-I6".

## 2 FR registry

### 2.1 FR-0xx: journal and durability

- **FR-001 Content-addressed memoizing journal**
  - Requirement: The journal MUST be a content-addressed memoizing log of completed effects, not an event source. The full identity of an entry MUST be the version-qualified tuple (scope, hashVersion, key, ordinal). Only completed, paid work is replayed; a workflow versioning API MUST NOT exist (changed content = new key = live call).
  - Acceptance: golden identity fixtures per hashVersion profile produce byte-identical keys across platforms; no API surface exposes prefix invalidation or workflow versions.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Identity model"; markers DEF-6.

- **FR-002 Identity inputs and exclusions**
  - Requirement: The content key MUST be sha256 over the RFC 8785 (JCS) canonical JSON of the IdentityInput: kind, agentType, requested modelSpec (including canonical effort and, for laddered spawns, the declared ladder with startTier), prompt (or opts.key when set), schemaHash, toolsetHash, isolation. The key MUST exclude label, phase, onError, retry, replay, policy fields (memoizeOutcome), lineage blocks, and spanId.
  - Acceptance: fixture pairs differing only in excluded fields hash identically; pairs differing in any identity field hash differently; worked examples per spawn kind in the journal spec are executable fixtures.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Identity model"; markers DEF-6.

- **FR-003 Deterministic scope-path grammar**
  - Requirement: scope MUST be a deterministic structural path independent of wall-clock: a sequential body is one scope; a parallel branch is a child scope keyed by a per-run monotonic call-site counter (execution order) plus branch index; pipeline scopes encode (stageIndex, itemIndex); nested workflow scopes use the registered name plus ordinal; orchestrator handle spawns live under the orchestrator agent scope; plan children use plan/NodeId. The grammar MUST be given as formal BNF and is part of the hashVersion 2 profile.
  - Acceptance: BNF in the journal spec parses all worked examples; identical program structure yields identical scope paths across two runs with different timings.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Scope-path grammar"; markers DEF-6.

- **FR-004 Ordinal rules**
  - Requirement: ordinal MUST number repeats of the identical (hashVersion, key) pair within a scope. Ref-entries (resolution, abandon) MUST be excluded from the scope cursor: they MUST NOT match forward and MUST NOT shift ordinals.
  - Acceptance: fixture with N identical calls in one scope binds them to ordinals 0..N-1; interleaved resolution entries leave ordinals unchanged.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Scoped forward-matching"; markers DEF-4.

- **FR-005 Canonical EntryRef is seq**
  - Requirement: seq MUST be a total order per run and the canonical EntryRef between entries MUST be seq. The triple {scope, contentHash, ordinal} MAY appear only as a debug projection in telemetry, never as a stored reference.
  - Acceptance: all stored reference fields (ref, donor refs, evidence entryRef) are numbers validated against seq; grep gate over payload schemas finds no string entry references.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "JournalEntry form"; markers XF.

- **FR-006 Kinds registry v2 with per-kind payload schemas**
  - Requirement: The engine MUST implement the single kinds registry v2: agent, step, external, rand, child, approval, decision (with decisionType: escalation.decision, ladder.verdict, spawn-admission, orchestrator_budget_reserve, orchestrator_budget_cap, orchestrator_finalize_fallback, kb_pinned, kb_repinned), plan.revision, plan.decision, ledger.op, resolution, abandon, node.link, termination.init, termination.denied. Every kind MUST have a normative payload schema. rand MUST cover now/random/uuid via a subtype discriminator keyed by (scope, ordinal). Agent terminal payloads MUST store structured output plus usage/status with the transcript by TranscriptStore ref. There is no automatic value offload in v1; a configurable soft warn threshold MUST exist.
  - Acceptance: payload schema validation runs on every append in dev mode; the draft kind plan_revision is absent; a fixture journal containing every kind round-trips through validation.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Kinds registry v2"; markers DEF-2, DEF-4, DEF-5, DEF-8.

- **FR-007 Stored status vocabulary; skipped is derived**
  - Requirement: The stored status vocabulary MUST be exactly running, ok, error, limit, suspended, cancelled, escalated. The status skipped MUST never be persisted: it is a derived fold status (and a consumer-facing AgentResult value). escalated MUST be legal only on entries of kind agent, but in all scopes.
  - Acceptance: store conformance rejects (or the kernel never emits) entries with stored status skipped; the abandon cassette shows skipped only in fold output.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Kinds registry v2"; markers DEF-1, DEF-5.

- **FR-008 Single canonical replay predicate**
  - Requirement: The replay decision MUST be centralized in the Journal Kernel as the single canonical pure function replayDisposition(entry, abandonFold) returning 'replay' | 'rerun' | 'skip'. No layer above the kernel may override or duplicate it. Evaluation MUST be two-step: (1) an append-order AbandonFold computing effective status (entries covered directly or transitively by abandon get effective status skipped, payload remains addressable); (2) the full disposition table by effective status, including the alias column. The table of the entry's own hashVersion MUST be applied.
  - Acceptance: replayDisposition is exported and property-tested against the normative table in [03-journal-spec.md](03-journal-spec.md), "Replay predicate"; code search confirms no second predicate implementation in Agent Runtime, PlanRunner, or ModelLadder.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Replay predicate"; markers DEF-1, DEF-5.

- **FR-009 Three kernel amendments**
  - Requirement: The predicate MUST implement exactly three amendments over the round-1 rule ("only ok replays; error and cancelled rerun"): (1) memoizeOutcome: task-complete but failed attempts replay instead of rerunning; (2) abandon: branches abandoned by revision get derived status skipped on replay, never re-run live; (3) escalated-replays-as-ok: terminal escalated is treated as completed paid work; the consumer still sees status 'escalated' and the byte-identical EscalationReport on replay (no status rewriting). cancelled MUST always rerun (memoizeOutcome does not apply; the only path to skip is a journaled abandon); limit MUST rerun unless memoizeOutcome: true is fixed in the entry.
  - Acceptance: the DEF-1 defect cassette replays a terminal escalated entry with zero live calls and byte-identical report; the abandon cassette asserts zero live calls in a skipped subtree; a cancelled-under-memoizeOutcome fixture reruns.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Replay predicate"; markers DEF-1.

- **FR-010 Error classification and memoizeOutcome pinning**
  - Requirement: The kernel MUST publish classifyAgentError(e): 'transport' | 'task' where task = kind 'schema-mismatch' | 'terminal' | ('tool' with retryable false), and transport = kind 'transport' | 'rate-limit' | 'budget'. Transport-class failures MUST never be memoized, even under memoizeOutcome: true. memoizeOutcome MUST be fixed in the entry payload at dispatch time as a policy field; the predicate MUST read the flag from the entry, never from current code.
  - Acceptance: unit matrix over all AgentError kinds matches the published classification; a journal recorded with memoizeOutcome: true replays identically after the calling code removes the flag.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Replay predicate"; markers DEF-1.

- **FR-011 invalidate/retry API for memoized failures**
  - Requirement: The kernel MUST provide an explicit invalidate/retry API to unpin a memoized failure (the "external API recovered tomorrow" case). Its safety boundary is an open question (OQ in [14-open-questions.md](14-open-questions.md)); the API MUST NOT silently mutate identity.
  - Acceptance: invalidating a memoized error entry causes exactly one live rerun on the next resume; all other entries still replay.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Replay predicate"; markers DEF-1.

- **FR-012 Scoped forward-matching and insertion stability**
  - Requirement: Resume matching MUST use a per-scope cursor with forward search: a key match ahead of the cursor replays; inserting a new call MUST cost exactly one live call; a miss MUST NOT move the cursor or defeat future hits (insertion stability); a deletion MUST mark the entry orphaned and report it; completed neighbors MUST never be re-paid; a global prefix flip MUST NOT exist. The accepted residual edge MUST be documented: intentionally identical calls swapped within one scope bind in journal order (mitigated by opts.key and a lint rule on duplicates).
  - Acceptance: store-conformance insertion fixture: adding one call mid-workflow yields exactly one live call on resume; deletion fixture surfaces an orphaned-entry report.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Scoped forward-matching".

- **FR-013 Per-call replay modes and opts.key**
  - Requirement: Per-call replay modes MUST be 'scoped' (default), 'cache' (ordinal-aware matching across the whole run: N identical panel calls bind to N distinct entries), and 'never'. opts.key MUST pin the identity of volatile prompts.
  - Acceptance: cache-mode fixture with N identical calls consumes N distinct entries; never-mode always goes live; opts.key fixture replays despite a changed prompt body.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Scoped forward-matching".

- **FR-014 Two-phase entries and at-least-once dispatch**
  - Requirement: Effect entries MUST be two-phase: 'running' at dispatch, terminal entry referencing it. A dangling 'running' after a crash MUST cause re-dispatch: dispatch is at-least-once, reuse of completed work is exactly-once.
  - Acceptance: crash-between-phases fixture re-dispatches exactly the dangling call and replays all terminal entries.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Two-phase entries".

- **FR-015 JSON-serializable payloads and serialized append**
  - Requirement: All journaled values MUST be JSON-serializable; violation MUST throw a typed NonSerializableValueError at the calling site. append MUST be serialized per run by a queue.
  - Acceptance: unit test throws NonSerializableValueError for a function-bearing value; concurrent primitive calls in one run produce strictly monotonic seq without interleaving corruption.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "JournalEntry form".

- **FR-016 Budget ledger recovery from the journal**
  - Requirement: Every terminal entry MUST carry usage (with usageApprox: true when a stream was severed); the budget ledger MUST be folded from the journal at resume; spend MUST be neither reset nor double-counted.
  - Acceptance: golden fold-state fixtures produce identical ledger hashes across stores; resume-after-crash fixture shows spent-before == spent-after-fold.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Two-phase entries, dispatch, and the budget ledger".

- **FR-017 Suspension and decide-once resolutions**
  - Requirement: awaitExternal(key), tool approvals, the escalate tool (Flavor B), and wait_for_events MUST write entries with status 'suspended' (a duplicate awaitExternal key in one scope is an immediate error). Every resolution attempt (live resolveExternal, timeout defaultDecision, class-level EscalationDecision, quiescence wake, engine fallback) MUST be appended as kind 'resolution' with ref to the target; losing attempts MUST also be appended and are classified noop by the first-closing-wins fold; the classification MUST never be persisted. A schema-invalid offline resolution MUST be classified invalid and MUST NOT close the entry. In-process races MUST be serialized by the ResolutionArbiter (per-target FIFO); cross-process races are closed by the LeasableStore fencing epoch. Suspended entries MUST carry a journaled deadlineAt so deadlines deterministically survive resume. The resolution 'by' source vocabulary MUST be: external, operator, timeout, class_decision, quiescence, engine_fallback.
  - Acceptance: decide-once oracle in @lurker/store-conformance: a scripted race yields exactly one applied classification then passes replay-strict; duplicate-key test errors immediately; invalid-resolution fixture leaves the entry suspended.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Suspension and resolutions"; markers DEF-4.

- **FR-018 Suspended run outcome and resolution consumption**
  - Requirement: A process MAY exit with run outcome 'suspended'. resolveExternal against a live run MUST resolve the promise in place without replay; otherwise the resolution MUST be schema-validated at consumption on the next resume. On every resume from suspension the engine MUST write a fresh kb_repinned entry per FR-602.
  - Acceptance: suspend-exit-resolve-resume cassette completes with the offline-provided value and zero re-paid calls.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Suspension and resolutions"; markers DEF-4.

- **FR-019 Turn-boundary checkpoints**
  - Requirement: Agents are atomic by default, but with a durable store the runtime MUST write a canonical-history checkpoint at every turn boundary into the TranscriptStore: approvals and crashes continue the loop from the same turn without re-paying turns or re-running tools. Between tool execution and checkpoint write, tools are at-least-once; the idempotency recommendation MUST be documented. Compaction points MUST be written into the checkpoint. Park/unpark MUST preserve the child's transcript checkpoint; worktree-isolated parked nodes either pin the worktree under the cap or unpark restarts the agent (no silent resume against a fresh tree).
  - Acceptance: crash-mid-agent cassette resumes at the same turn with zero re-paid turns; park-unpark cassette (docs/09 catalog) passes replay-strict.
  - Meta: milestone M3; spec [03-journal-spec.md](03-journal-spec.md), "Checkpoints".

- **FR-020 Resume preview and dry-run**
  - Requirement: Resume MUST offer an honest preview: an incremental hit/miss report during replay plus a dry-run mode that forbids live calls up to the first divergence.
  - Acceptance: dry-run over a journal with one inserted call reports the divergence point and performs zero live calls.
  - Meta: milestone M5; spec [03-journal-spec.md](03-journal-spec.md), "Checkpoints".

- **FR-021 hashVersion mechanism and support window**
  - Requirement: Every entry MUST carry hashVersion, versioning the whole identity-and-replay pipeline as one unit (canonicalization algorithm, identity field set, hash function, schemaHash/toolsetHash derivation, scope grammar, ordinal rules, replay table, fold defaults). Matching MUST run under the entry's own version; new entries are always written at the current version; mixed-version journals are legal and deterministic (compatibility lemma). The round-1 field v is abolished (normalized at load). The support window is [CURRENT-2, CURRENT]; older versions MUST raise a typed JournalCompatibilityError and require explicit frozen derivers from @lurker/compat via EngineOptions.extraDerivers. Derivers MUST be registered in a KeyDeriver registry.
  - Acceptance: one frozen golden fixture per hashVersion profile; mixed-version journal scenario replays deterministically; a below-window journal fails with JournalCompatibilityError and succeeds with the compat deriver installed.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "hashVersion"; markers DEF-6.

- **FR-022 JournalStore SPI**
  - Requirement: JournalStore MUST be exactly five methods (append, load, putMeta, listRuns, delete) over opaque entries; stores MUST NOT parse payloads. RunMeta (runId, status, name, tags, updatedAt, advisory hashVersionLow/High, and the optional advisory workflow-binding fields workflowName/workflowHash/workflowSourceRef per the OQ-21 interim rule) MUST be written by the engine as a separate record so listRuns needs no payload parsing.
  - Acceptance: SPI type has exactly five methods; conformance kit exercises listRuns without payload access.
  - Meta: milestone M1; spec [03-journal-spec.md](03-journal-spec.md), "Storage SPI".

- **FR-023 Store contract A1-A4 and conformance kit**
  - Requirement: Every JournalStore MUST satisfy A1 append atomicity, A2 total per-run order, A3 read-your-writes, A4 opaque payload (byte transparency). The contract MUST be verified by the executable conformance kit @lurker/store-conformance; the method count did not grow.
  - Acceptance: InMemoryStore, JsonlFileStore, and @lurker/store-sqlite pass the full conformance suite in CI.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Storage SPI"; markers DEF-4.

- **FR-024 LeasableStore with fencing epochs**
  - Requirement: LeasableStore MUST extend JournalStore with acquire/renew/release carrying a fencing epoch. A store with leases MUST reject appends with a stale epoch (rejected writes are invisible): split-brain in queue mode is excluded by construction. acquire on a held lease MUST reject with a typed LeaseHeldError; renew interval MUST be at most ttl/3.
  - Acceptance: conformance fencing test: stale-epoch append is rejected and invisible to load; held-lease acquire rejects with the typed error.
  - Meta: milestone M2; spec [03-journal-spec.md](03-journal-spec.md), "Storage SPI"; markers DEF-4, XF.

- **FR-025 TranscriptStore**
  - Requirement: TranscriptStore (put/get/list) MUST hold transcripts and checkpoints as separate blobs so the journal stays small and diffable.
  - Acceptance: an agent run's journal contains transcriptRef/checkpointRef strings only; blob bytes live in the TranscriptStore.
  - Meta: milestone M1; spec [03-journal-spec.md](03-journal-spec.md), "Storage SPI".

- **FR-026 Shipped stores**
  - Requirement: The core MUST ship InMemoryStore (resume disabled, one-time loud warning) and JsonlFileStore (the journal doubles as an event log). @lurker/store-sqlite MUST implement JournalStore plus LeasableStore with fencing and serve as the reference for community stores.
  - Acceptance: all three pass @lurker/store-conformance; InMemoryStore resume attempt fails loudly.
  - Meta: milestone M2 (InMemoryStore M1, sqlite M5); spec [03-journal-spec.md](03-journal-spec.md), "Storage SPI".

### 2.2 FR-1xx: model layer

- **FR-100 ProviderAdapter SPI**
  - Requirement: The provider seam MUST be ProviderAdapter { id; caps(model); refreshCaps?(); stream(req, signal?); countTokens?(req) }. Provider SDK autoretries MUST be disabled (max_retries 0); the core owns retries and wall-clock. Provider SDKs MUST appear only inside their own adapter (never in core).
  - Acceptance: dependency audit shows zero provider SDKs in @lurker/core; adapter constructors set SDK max_retries to 0 (asserted in adapter unit tests).
  - Meta: milestone M1; spec [04-model-layer-spec.md](04-model-layer-spec.md), "ProviderAdapter SPI".

- **FR-101 Canonical wire contract and Usage invariant**
  - Requirement: L0 MUST define Msg (roles system|user|assistant|tool) of ordered Parts (including provider-raw), ChatRequest, the ChatEvent union (text-delta, tool-call start/delta/end, reasoning-delta, usage, finish with a typed refusal outcome carrying provider stop details, error), and Usage { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, reasoningTokens? }. The Usage invariant (inputTokens is the full prompt including cache) MUST be checked at the adapter boundary. Refusals MUST surface as a typed finish outcome, not null (supersedes the earlier refusal-to-null rule; reopened spec bug).
  - Acceptance: adapter conformance test fails on a Usage violation; refusal fixture yields a typed refusal outcome with stop details preserved.
  - Meta: milestone M1; spec [04-model-layer-spec.md](04-model-layer-spec.md), "Wire contract".

- **FR-102 Engine-minted canonical tool-call ids**
  - Requirement: Canonical tool-call ids MUST be minted by the library (ULID); every adapter MUST keep a bijective canonical-to-wire map in both directions, resolving call_* vs toolu_* format mismatch by construction.
  - Acceptance: cross-provider history fixture round-trips tool-call ids through both first-class adapters without collision or loss.
  - Meta: milestone M1; spec [04-model-layer-spec.md](04-model-layer-spec.md), "Wire contract".

- **FR-103 Provider-raw retention and projection**
  - Requirement: provider-raw parts (thinking blocks with signatures, reasoning items) MUST be retained in canonical history unconditionally and projected into the wire view only for the same provider. For Anthropic targets the adapter MUST always send retained thinking blocks and let the server drop cross-model blocks; client-side stripping is forbidden (risks 400s; reopened spec nuance).
  - Acceptance: projection fixture: Anthropic-to-Anthropic replay echoes thinking blocks byte-exact; Anthropic-raw parts never appear in an OpenAI wire request.
  - Meta: milestone M1; spec [04-model-layer-spec.md](04-model-layer-spec.md), "Wire contract".

- **FR-104 @lurker/anthropic on the July 2026 surface**
  - Requirement: The Anthropic adapter MUST target the current Messages API: adaptive thinking only ({ type: 'adaptive' }; budget_tokens, explicit disabled, and temperature/top_p/top_k are 400s on current models); output_config as the umbrella for { effort, format, task_budget }; structured outputs via output_config.format json_schema and strict tools (the prefill tier is dead on 4.6+ models); cache_control compilation from cacheHint (5m and 1h TTLs, max 4 breakpoints, model-dependent minimum cacheable prefix); pause_turn resume by re-sending assistant content without a synthetic user message, with capped continuations; the full stop-reason set (end_turn, max_tokens, stop_sequence, tool_use, pause_turn, refusal with stop_details, model_context_window_exceeded); count_tokens; the capabilities-bearing /v1/models endpoints as the refreshCaps source; retry-after, x-ratelimit-* headers, and 529 overloaded handling.
  - Acceptance: VCR cassettes cover each listed behavior; cron contract tests against the live API detect surface drift.
  - Meta: milestone M1; spec [04-model-layer-spec.md](04-model-layer-spec.md), "@lurker/anthropic".

- **FR-105 @lurker/openai in manual item-replay mode**
  - Requirement: The OpenAI adapter MUST target the Responses API in manual item-replay mode only: store: false plus include reasoning.encrypted_content, with reasoning items echoed verbatim between tool calls. previous_response_id and the Conversations API MUST NOT be used (server-side state is incompatible with journal determinism). Function tools MUST use the flattened form with strict semantics; structured output via text.format json_schema; streaming MUST map the typed SSE event catalog; Chat Completions is the degraded path (reduced tiers, delta-patched chunks).
  - Acceptance: adapter unit tests assert store: false and encrypted reasoning replay on every request; cassettes cover the typed SSE catalog; a lint/test gate forbids previous_response_id in the adapter.
  - Meta: milestone M1; spec [04-model-layer-spec.md](04-model-layer-spec.md), "@lurker/openai".

- **FR-106 openaiCompatible factory**
  - Requirement: The core MUST offer openaiCompatible({ id, baseURL, apiKey?, caps? }) so multiple compatible endpoints (Ollama, vLLM, Mistral, OpenRouter, gateways) coexist under explicit adapter ids.
  - Acceptance: two factory instances with distinct ids register in one engine; a duplicate adapterId at createEngine raises ConfigError.
  - Meta: milestone M3; spec [04-model-layer-spec.md](04-model-layer-spec.md), "openaiCompatible factory contract".

- **FR-107 @lurker/bridge-ai-sdk**
  - Requirement: The bridge MUST wrap any Vercel ai-sdk LanguageModelV4 (@ai-sdk/provider ^4) as a ProviderAdapter, with a runtime specificationVersion check; it is documented as the highest-churn package and never a core dependency.
  - Acceptance: bridge conformance run against a fake LanguageModelV4; core has no @ai-sdk dependency.
  - Meta: milestone M9; spec [04-model-layer-spec.md](04-model-layer-spec.md), "@lurker/bridge-ai-sdk".

- **FR-108 Per-engine registry and ModelRef**
  - Requirement: The adapter registry MUST be per-engine (no global mutable registry). ModelRef MUST be strictly 'adapterId:model' with no query parameters; baseURL and keys are set at adapter construction; a duplicate adapterId at createEngine MUST be a ConfigError.
  - Acceptance: two engines in one process register disjoint adapters without interference; malformed ModelRef is rejected by type and runtime validation.
  - Meta: milestone M1; spec [04-model-layer-spec.md](04-model-layer-spec.md), "Router".

- **FR-109 Per-invocation resolution chain**
  - Requirement: Model resolution MUST run on every model invocation, layering { model, effort, providerOptions, fallbacks } in the order call override > agent profile > workflow default > engine default, with the invocation role tag. AgentOpts.model MUST override all roles at once; AgentOpts.routing overrides per role with priority over profile.routing.
  - Acceptance: resolution unit matrix covers all four layers and both override forms; per-role routing fixture sends loop and extract to different providers in one agent.
  - Meta: milestone M1; spec [04-model-layer-spec.md](04-model-layer-spec.md), "Router".

- **FR-110 Caps scrubbing and structured-output tier selection**
  - Requirement: After resolution the router MUST read ModelCaps: select the structured-output tier (native json_schema | forced-tool | prompt), and scrub illegal parameters visibly (event emitted). Scrubbing applies on both first-class providers (both reject sampling parameters on current reasoning models).
  - Acceptance: sending temperature to a model whose caps forbid it produces a scrub event and a legal wire request; tier selection fixture downgrades per caps.
  - Meta: milestone M1; spec [04-model-layer-spec.md](04-model-layer-spec.md), "Router".

- **FR-111 Canonical effort**
  - Requirement: Canonical effort MUST be exactly five levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max' (extends the earlier four-level enum; both first-class providers ship xhigh and recommend it for agentic work; reopened spec bug). Effort MUST be part of the requested modelSpec identity (and hence the content key). Each adapter MUST publish its mapping table (Anthropic output_config.effort passthrough including max; OpenAI reasoning.effort with canonical max mapping to xhigh; OpenAI none reachable only via namespaced providerOptions). Unsupported effort MUST be scrubbed visibly with an event and MUST NOT be mapped to max_tokens. Role effort defaults: orchestrate/plan high, summarize/extract low; changing role effort defaults between releases MUST NOT miss the paid prefix (hash-v1 is effort-insensitive by construction; the legacy fold default effort=medium applies only in derived reads, never in matching).
  - Acceptance: golden hash fixtures differ across effort levels under hash-v2 and are identical under the v1 deriver; per-adapter mapping table has a test per row.
  - Meta: milestone M4 (hash-v2 profile lands M2); spec [04-model-layer-spec.md](04-model-layer-spec.md), "Canonical effort"; markers DEF-6.

- **FR-112 Invocation roles and trigger protocol**
  - Requirement: The six invocation roles MUST be loop, extract, finalize, summarize, plan, orchestrate, with the defined trigger protocol: loop on every turn while tools are available to the model; extract as a separate final structured-output invocation only when a schema is set and (routing directs extract to another model, or current caps cannot serve the needed tier), otherwise the schema rides the last loop turn without an extra call; finalize only if configured in routing (post-tools synthesis with toolChoice 'none' over the full transcript); summarize at the compaction threshold. The orchestrating LLM resolves through the same chain.
  - Acceptance: role-trigger fixture matrix asserts call counts (no extra extract call when caps suffice and routing does not split).
  - Meta: milestone M4; spec [04-model-layer-spec.md](04-model-layer-spec.md), "Router".

- **FR-113 Role quality floors**
  - Requirement: Role quality floors MUST be hard router constraints: per-role (and optionally per-declared-taskClass) explicit model allow/deny lists in engine config, forbidding weak defaults for code-edit, synthesis, judge, plan, and orchestrate. No advice (including ModelKnowledge) may override or weaken a floor. No implicit cross-adapter quality ordering exists. Named strong orchestrate/plan defaults live only in the umbrella package config, never in @lurker/core.
  - Acceptance: a spawn violating a floor is rejected before dispatch; grep gate confirms no model names in @lurker/core defaults.
  - Meta: milestone M4; spec [04-model-layer-spec.md](04-model-layer-spec.md), "Role quality floors".

- **FR-114 Pricing registry**
  - Requirement: Dollar budgets MUST be computed from the registry's versioned price table, which wins over adapter-reported caps.pricing (fallback only). pricingVersion MUST be a monotonic string recorded in decision entries. Unpriced models MUST be surfaced in CostReport, never a silent zero.
  - Acceptance: pricing precedence unit test; CostReport fixture lists an unpriced model explicitly.
  - Meta: milestone M4; spec [04-model-layer-spec.md](04-model-layer-spec.md), "Pricing"; markers XF.

- **FR-115 RetryPolicy under the journal**
  - Requirement: RetryPolicy (attempts, backoff, retryable classes) MUST live under the journal: a retried-then-successful call is one journal entry; transport retries MUST NOT count as lineage attempts.
  - Acceptance: retry fixture produces one entry with final usage; LineageStats show one attempt.
  - Meta: milestone M4; spec [04-model-layer-spec.md](04-model-layer-spec.md), "RetryPolicy and failover".

- **FR-116 Failover keyed on the requested modelSpec**
  - Requirement: Failover lists MUST be keyed on the requested modelSpec: a response served by a failover model replays correctly, and fallback changes only servedBy in the entry (attribution stays honest, never-pay-twice intact). FailoverTrigger MUST be 'transport' | 'rate-limit'; budget is explicitly excluded. The degenerate single-step form MUST be fallback: { model, on } with on a subset of 'error' | 'limit' | 'schema-exhausted', producing one journaled decision entry.
  - Acceptance: failover cassette replays with zero live calls and original content key; servedBy records the fallback model.
  - Meta: milestone M4; spec [04-model-layer-spec.md](04-model-layer-spec.md), "RetryPolicy and failover"; markers XF.

- **FR-117 refreshCaps from live capability listings**
  - Requirement: refreshCaps() MUST update the capability table from live model listings (for Anthropic, the capabilities-bearing /v1/models endpoints).
  - Acceptance: refreshCaps cassette updates ModelCaps fields consumed by scrubbing and tier selection.
  - Meta: milestone M4; spec [04-model-layer-spec.md](04-model-layer-spec.md), "ProviderAdapter SPI".

- **FR-118 Per-provider concurrency and Retry-After**
  - Requirement: Per-provider concurrency keys and retries honoring Retry-After MUST live next to the router.
  - Acceptance: scheduler test caps in-flight requests per provider key; 429-with-retry-after cassette waits the advertised interval.
  - Meta: milestone M4; spec [04-model-layer-spec.md](04-model-layer-spec.md), "Router".

- **FR-119 ModelLadder resolution summary**
  - Requirement: ModelSpec MUST accept a ModelLadder variant resolving through the existing chain. judgeModel MUST be an explicitly declared rung with index >= the executing rung, or an explicitly named override (no cross-adapter quality ordering exists). Full ladder semantics are FR-313.
  - Acceptance: ladder spec with an undeclared judge rung is a ConfigError; declared-judge fixture resolves.
  - Meta: milestone M7; spec [04-model-layer-spec.md](04-model-layer-spec.md), "ModelLadder summary".

- **FR-120 HistoryProjector**
  - Requirement: HistoryProjector MUST project canonical history into the target's wire view (canonical id map, provider-raw only to the native provider per FR-103), making per-role cross-provider mixing inside one agent correct.
  - Acceptance: mixed-provider agent cassette: loop on one provider, extract on another, with valid wire histories on both.
  - Meta: milestone M4; spec [04-model-layer-spec.md](04-model-layer-spec.md), "Router".

- **FR-121 Structured output tiers with client validation**
  - Requirement: Structured output MUST support three tiers (native json_schema | forced-tool | prompt) selected by caps, always with client-side validation regardless of tier.
  - Acceptance: each tier has a fixture where client validation catches a schema violation.
  - Meta: milestone M1; spec [04-model-layer-spec.md](04-model-layer-spec.md), "Router".

- **FR-122 Server-side compaction position**
  - Requirement: v1 MUST NOT enable provider server-side compaction (Anthropic context_management edits; OpenAI Responses context_management compaction). If compaction blocks/items appear in histories, adapters MUST preserve them in canonical history. Compaction remains owned by the Agent Runtime (FR-215).
  - Acceptance: adapter requests carry no compaction config; a history containing compaction items round-trips unmodified.
  - Meta: source provider surface research (see [04-model-layer-spec.md](04-model-layer-spec.md), "Server-side compaction position"); milestone M1; spec same section.

### 2.3 FR-2xx: execution, ctx, budget, runners, engine API

- **FR-200 Execution model**
  - Requirement: A workflow MUST be an ordinary async (ctx, args) function registered via defineWorkflow; all primitives are methods of the injected ctx; module-level globals and singletons MUST NOT exist at any layer; ctx is created by the engine per run. Execution is a single pass per run; replay happens only on resume after a crash, edit, or suspension; there is no per-step re-entry.
  - Acceptance: two concurrent runs of one workflow in one process do not interfere; step count in the journal is linear in calls (no re-entry amplification).
  - Meta: milestone M1; spec [06-execution-spec.md](06-execution-spec.md), "Execution model".

- **FR-201 Canonical Ctx primitives**
  - Requirement: Ctx MUST provide agent (with overloads including { result: 'full' } returning AgentResult<Out<S>>), parallel, pipeline (overloads up to 6 stages), step, workflow, awaitExternal (no deadline in v1; deadlineAt applies only to approvals and Flavor B escalations), phase<T>(name, fn) (cosmetic for identity, structural for events and CostReport.byPhase), log(level, msg, data?), brief(opts) (journaled summarize, role 'summarize'), budget { spent(), remaining() }, and now/random/uuid shims.
  - Acceptance: the canonical Ctx interface in [06-execution-spec.md](06-execution-spec.md), "Canonical Ctx interface" compiles as written and is implemented by the engine; phase changes do not change content keys.
  - Meta: milestone M1 (awaitExternal M2, brief M6); spec [06-execution-spec.md](06-execution-spec.md), "Canonical Ctx interface"; markers XF.

- **FR-202 Error policy typing and full-result observation**
  - Requirement: defineWorkflow MUST be generic over errorPolicy ('strict' | 'lenient') for honest null typing; 'lenient' (emitted by the planner) makes onError 'null' the default; under onError 'null' the error MUST still be surfaced via run.dropped. Script code MUST be able to observe AgentResult via the { result: 'full' } overload; Settled<T> MUST be a discriminated union over AgentStatus carrying AgentResult. AgentStatus MUST be 'ok' | 'error' | 'limit' | 'cancelled' | 'skipped' | 'escalated'; escalation is present iff status === 'escalated'; an isEscalated type guard MUST be exported.
  - Acceptance: type-level tests pin the null typing per policy; run.dropped carries the full error for a nulled call.
  - Meta: milestone M1 (escalated status M3, BREAKING); spec [06-execution-spec.md](06-execution-spec.md), "Error policy and dropped results"; markers DEF-1, XF.

- **FR-203 step semantics**
  - Requirement: ctx.step(label, fn, { deps?, key? }) MUST fold deps into the key (useMemo-style); results MUST be JSON. In the sandbox, step's fn executes worker-side with its result JSON-RPC'd to the host for journaling.
  - Acceptance: changed deps produce a new key (live call); unchanged deps replay.
  - Meta: milestone M1; spec [06-execution-spec.md](06-execution-spec.md), "Canonical Ctx interface".

- **FR-204 Nested workflows under AdmissionController**
  - Requirement: ctx.workflow nesting MUST be governed by the AdmissionController with configurable maxDepth (default 1, ceiling 4) and hierarchical budget sub-accounts; the fixed single-level rule is superseded. Child spend rises to all ancestors up to root.
  - Acceptance: depth-exceeding spawn returns a typed reject verdict; ancestor ledgers reflect child spend in the fold fixtures.
  - Meta: milestone M6; spec [06-execution-spec.md](06-execution-spec.md), "Modes and entry points".

- **FR-205 Scheduler and lifetime cap**
  - Requirement: The engine MUST run a per-run semaphore (default 12) with a queue and per-provider concurrency keys. A run lifetime cap of 500 spawns MUST act as the engine stop-valve (configurable); PlanRunner runs additionally enforce the frozen maxTotalSpawns from termination.init (default 128).
  - Acceptance: concurrency test holds max in-flight at the semaphore value; spawn 501 without config raises the lifetime reject.
  - Meta: milestone M1; spec [06-execution-spec.md](06-execution-spec.md), "Scheduler"; markers DEF-2.

- **FR-206 parallel semantics**
  - Requirement: ctx.parallel MUST be a barrier journaling each branch as it completes. In strict policy abortSiblings defaults to true: a failed branch aborts siblings, which are written cancelled and rerun on resume; settle: true disables it. An escalated child inside parallel MUST be a settled outcome (onError does not fire), analogous to limit.
  - Acceptance: abort-siblings cassette shows cancelled siblings rerun on resume; escalated-in-parallel fixture settles without throwing.
  - Meta: milestone M1 (escalated interaction M3); spec [06-execution-spec.md](06-execution-spec.md), "Scheduler"; markers DEF-1.

- **FR-207 pipeline semantics**
  - Requirement: ctx.pipeline MUST stream items without an inter-stage barrier; a failed stage drops the item into run.dropped with the full error; onItemError MUST support 'drop' | 'throw' | 'collect'.
  - Acceptance: pipeline fixture with one poisoned item completes the rest and reports the drop.
  - Meta: milestone M1; spec [06-execution-spec.md](06-execution-spec.md), "Scheduler".

- **FR-208 Three-layer budget enforcement**
  - Requirement: Budget MUST be enforced in three layers: (1) admission before spawn: spent + committedReserve >= ceiling blocks; the reserve is opts.estCost ?? profile.estCost ?? (countTokens(input) + maxOutputTokens priced) ?? the engine flat default; admission reserves are taken on each add_task/unpark_task and on laddered spawns (startTier plus escalation reserve) at revision apply time; (2) a guard before every agent turn against the agent's sub-account; (3) an AbortSignal ceiling severing live streams, with delta-accumulated usage written as usageApprox: true.
  - Acceptance: budget cassettes exercise each layer; severed-stream entry carries usageApprox: true.
  - Meta: milestone M1; spec [06-execution-spec.md](06-execution-spec.md), "Three-layer budget".

- **FR-209 B0 immutability**
  - Requirement: The run budget ceiling B0 MUST be immutable after start: no API, including HITL decisions, can top it up.
  - Acceptance: API surface audit finds no top-up path; HITL resolution schema has no budget field.
  - Meta: milestone M1; spec [06-execution-spec.md](06-execution-spec.md), "Three-layer budget"; markers DEF-2.

- **FR-210 Hierarchical sub-accounts and finalize reserves**
  - Requirement: Hierarchical budget sub-accounts MUST roll child spend up to all ancestors; the root ceiling remains the true invariant. Every parent account created by the AdmissionController MUST receive a finalizeReserve (generalization of DEF-7), and childBudgetFraction (default 0.3) MUST be computed from the parent remainder minus its reserve. budget_threshold wake triggers fire at 50 and 80 percent.
  - Acceptance: fold fixture proves layer-1 admission never consumes any account's finalize reserve; threshold events fire at the fixed percentages.
  - Meta: milestone M6; spec [06-execution-spec.md](06-execution-spec.md), "Three-layer budget"; markers DEF-7.

- **FR-211 Exhaustion semantics**
  - Requirement: Exhaustion MUST never yield a bare null: at the ceiling, ctx primitives throw a typed BudgetExhaustedError (AgentError kind 'budget'); the engine reports outcome 'exhausted' (overriding 'error') with value undefined, dropped/pending lists, and a full CostReport. Under onError 'null' the call yields null and the run continues until the ceiling blocks all spawns.
  - Acceptance: script-mode exhaustion cassette ends 'exhausted' with partial results and a complete CostReport.
  - Meta: milestone M1; spec [06-execution-spec.md](06-execution-spec.md), "Three-layer budget".

- **FR-212 UsageLimits**
  - Requirement: UsageLimits MUST be { maxTurns (default 32), maxToolCalls, maxOutputTokensPerTurn?, timeoutMs, streamIdleTimeoutMs (default 120000) } plus a run-level deadline. Limit expiry MUST produce terminal status 'limit' (task class: the model ran to its cap, the work is paid), which replays under memoizeOutcome. Unlimited-by-default knobs are listed explicitly in the defaults table.
  - Acceptance: each limit has a fixture producing terminal 'limit'; defaults match [06-execution-spec.md](06-execution-spec.md), "Appendix A".
  - Meta: milestone M1; spec [06-execution-spec.md](06-execution-spec.md), "UsageLimits"; markers XF.

- **FR-213 Deterministic shims**
  - Requirement: ctx.now()/random(key?)/uuid() MUST journal as kind rand subtypes bound by (scope, ordinal); random(key) gives a stable keyed alternative; sandbox versions are seeded from runId and journaled.
  - Acceptance: replay returns identical shim values; two runs differ (live), one resumed run does not.
  - Meta: milestone M1; spec [06-execution-spec.md](06-execution-spec.md), "Canonical Ctx interface".

- **FR-214 Agent runtime loop and semantic retries**
  - Requirement: One subagent loop MUST serve all modes: model turn, tool dispatch through the permission chain, structured output with client validation and bounded re-prompt on schema mismatch (default 2 attempts under UsageLimits), the AgentError taxonomy, typed AgentResult; the runtime never throws past policy. Semantic retries use throw ModelRetry (default attempts 2). The runtime produces statuses but does not own the replay predicate (FR-008).
  - Acceptance: schema-mismatch fixture re-prompts at most twice then yields kind 'schema-mismatch'; ModelRetry fixture retries within the same entry ordinal semantics.
  - Meta: milestone M1; spec [06-execution-spec.md](06-execution-spec.md), "Agent Runtime binding".

- **FR-215 Compaction ownership**
  - Requirement: Context compaction MUST be owned by the Agent Runtime: history processors per profile plus a contextWindow threshold (default 0.8); compaction points are written into the checkpoint; summarize-role invocations perform the compaction.
  - Acceptance: long-run fixture compacts at the threshold and resumes from the checkpointed compaction point.
  - Meta: milestone M4; spec [06-execution-spec.md](06-execution-spec.md), "Agent Runtime binding".

- **FR-216 ctx.brief**
  - Requirement: ctx.brief(opts) MUST be a journaled summarize invocation producing an inheritable summary for a child (inherited_summary).
  - Acceptance: brief output replays from the journal; child prompt fixtures embed it deterministically.
  - Meta: milestone M6; spec [06-execution-spec.md](06-execution-spec.md), "Canonical Ctx interface".

- **FR-217 Script runner seam and workflow kinds**
  - Requirement: ScriptRunner MUST be the execution seam with Workflow (closure, in-process only) and CompiledWorkflow (source, sandbox-eligible) separated at the type level; feeding a closure to the sandbox MUST be impossible by types.
  - Acceptance: type-level test: WorkerSandboxRunner.execute rejects Workflow at compile time.
  - Meta: milestone M1; spec [06-execution-spec.md](06-execution-spec.md), "Script runners".

- **FR-218 InProcessRunner**
  - Requirement: InProcessRunner MUST patch Date.now/Math.random in dev mode to warn; it MUST offer the onEscalation hook. Determinism for human code is by convention, lint, and ctx shims (VM enforcement rejected as hostile to embedding).
  - Acceptance: dev-mode bare Date.now triggers a warning; onEscalation receives the typed report in a script-mode escalation fixture.
  - Meta: milestone M1 (hook M3); spec [06-execution-spec.md](06-execution-spec.md), "Script runners"; markers DEF-1.

- **FR-219 WorkerSandboxRunner contract**
  - Requirement: WorkerSandboxRunner MUST execute only CompiledWorkflow in a worker thread with a curated global scope binding exactly: agent, parallel, pipeline, step, phase, log, budget, workflow, awaitExternal, now, random, uuid (seeded, journaled). import/fetch/process MUST be absent. Every primitive call is RPC over MessagePort to the host engine with journal-compatible JSON payloads validated at the boundary (not raw structured clone). Defaults: timeoutMs 300000, memoryMb 512. The sanctioned dialect MUST hold: schema only as a JSON Schema literal, tools only by registered profile names, onError only 'throw' | 'null', model as a string, no functions in options, declarative rule-table policies, ladders as JSON; ctx.workflow takes a registered workflow name string.
  - Acceptance: global-scope snapshot test matches the exact list; non-JSON payload at the boundary raises a typed error; dialect violations are rejected by compileScript/lint.
  - Meta: milestone M6; spec [06-execution-spec.md](06-execution-spec.md), "Script runners"; markers XF.

- **FR-220 compileScript and eslint-plugin-lurker**
  - Requirement: compileScript(source, { allowImports? }) MUST produce a CompiledWorkflow or a typed ScriptRejected (allowImports default []). eslint-plugin-lurker MUST forbid bare Date.now/Math.random/new Date/fetch/process.env in workflow modules and bare Promise.all over ctx calls (use ctx.parallel), emitting structured JSON diagnostics for the self-repair loop.
  - Acceptance: each forbidden construct produces a JSON diagnostic consumed by the repair loop test; disallowed import rejects compilation.
  - Meta: milestone M6; spec [06-execution-spec.md](06-execution-spec.md), "Script runners".

- **FR-221 Three orchestration modes, one substrate**
  - Requirement: Exactly three orchestration modes MUST exist on one runtime, one journal, one budget path (I5): (a) human-written deterministic scripts (InProcessRunner); (b) the flagship hybrid (planner model writes a script, lint, self-repair, deterministic sandbox execution); (c) the dynamic orchestrator with typed spawn tools, optionally extended by PlanRunner. A fourth mode MUST NOT exist. Topologies are call-and-return only (I3): handoffs, chat rooms, blackboard coordination, and emergent topology are rejected.
  - Acceptance: all three mode test suites run against the same engine instance and journal kinds; no alternative runtime code path exists.
  - Meta: milestone M6 (mode (a) M1); spec [06-execution-spec.md](06-execution-spec.md), "Modes and entry points".

- **FR-222 Documented default: phase chaining**
  - Requirement: The documented default for most users MUST be the phase chain (ctx.phase plus nested ctx.workflow, replanning only between phases with fresh context over compact artifacts). PlanRunner and the adaptive machinery are opt-in for wide fan-out loads that cannot wait for a phase boundary. Quality patterns (adversarial panels, judge panels, loop-until-dry, completeness critics) ship as recipes and prompt templates, never engine flags.
  - Acceptance: docs and examples corpus lead with phase chaining; no engine flag encodes a quality pattern.
  - Meta: milestone M6; spec [06-execution-spec.md](06-execution-spec.md), "Modes and entry points".

- **FR-223 Flagship hybrid pipeline**
  - Requirement: plan(engine, goal, { model?, profiles?, repairRounds? }) MUST ask a plan-role model to write a script against the ctx-dialect API card and profile cards, lint it, self-repair up to repairRounds (default 3) on JSON diagnostics, compile, and execute deterministically in the sandbox (runPlanned). Re-planning after a failure MUST replay the unchanged prefix free.
  - Acceptance: planner e2e cassette: lint failure, one repair round, successful sandbox run; re-plan cassette replays the paid prefix with zero live calls.
  - Meta: milestone M6; spec [06-execution-spec.md](06-execution-spec.md), "Modes and entry points".

- **FR-224 Dynamic orchestrator resume and shared vocabulary**
  - Requirement: Mode (c) resume MUST be defined: orchestrator turns are checkpointed mandatorily at turn boundaries; every spawn is an ordinary journal entry of kind agent; a crashed orchestrate() recovers its history from the checkpoint and finds child results by content keys without regenerating spawn decisions. profileCard(registry) MUST emit the same text for the planner prompt and the spawn_agent enum. Both surfaces, orchestrate(engine, goal, opts) and ctx.orchestrate(goal, opts), MUST share one implementation; the nested form runs under AdmissionController maxDepth with its cap clamped by the parent remainder minus the parent finalizeReserve; OrchestratorCapConfigError (FR-315) applies to both surfaces, thrown before the first LLM call.
  - Acceptance: kill-and-resume orchestrator cassette replays all spawn decisions; profileCard snapshot is byte-identical across both consumers.
  - Meta: milestone M6; spec [06-execution-spec.md](06-execution-spec.md), "Modes and entry points"; markers DEF-7, XF.

- **FR-225 Engine and ops API**
  - Requirement: createEngine({ adapters, stores, defaults, budgetDefaults, concurrency, extraDerivers }) MUST construct an engine with per-engine registries. engine.run(wf, args, opts) MUST return a RunHandle; engine.resume(runId, wf?) MUST follow the run-to-definition binding contract. RunOutcome status MUST be 'ok' | 'error' | 'cancelled' | 'exhausted' | 'suspended'; RunStatus adds 'running'. An explicit per-engine workflow registry MUST exist for shells (no module-level registry).
  - Acceptance: API type snapshot pinned in tests; resume with a mismatched definition follows the documented binding contract errors.
  - Meta: milestone M1; spec [06-execution-spec.md](06-execution-spec.md), "Engine and ops API"; markers XF.

- **FR-226 RunProfile presets and TaskGraph position**
  - Requirement: RunProfile presets (fast/standard/deep/ultra and similar) MUST ship as data (role/effort/concurrency/budget/permission/spawn limits), never as engine semantics. TaskGraph JSON MAY exist only as an optional constrained planner target compiled onto ctx.parallel/ctx.agent, with no conditional edges and no YAML in the core.
  - Acceptance: presets are plain JSON consumed by config; no engine branch keys off a preset name.
  - Meta: milestone M5; spec [06-execution-spec.md](06-execution-spec.md), "Run profiles and TaskGraph".

- **FR-227 No-progress abort class**
  - Requirement: No-progress detection MUST be an engine-defined heuristic journaled as a first-class abort class distinct from user cancellation (otherwise it would land in cancelled and be re-paid on every resume). Conservative default: N turns without tool calls or artifact deltas; the heuristic itself is an open question (OQ in [14-open-questions.md](14-open-questions.md)).
  - Acceptance: no-progress fixture terminates with the dedicated class and replays without a live rerun.
  - Meta: milestone M3; spec [06-execution-spec.md](06-execution-spec.md), "Agent Runtime binding"; markers DEF-1.

### 2.4 FR-3xx: adaptive orchestration

- **FR-300 Decision-entry principle (I2) operationalized**
  - Requirement: Every dynamic decision (plan revision, admission verdict, escalation decision, timeout defaultDecision, guard verdict, verify result, budget-guard denial, no-progress abort, knowledge snapshot pin) MUST be exactly one journaled decision entry written strictly BEFORE any of its effects, carrying everything that would otherwise be re-evaluated live (embedded admit verdicts, reserves, verify/judge verdicts, defaultDecision). Every read (plan_view, ledger_read, WakeDigest, knowledge card) MUST be a pure fold over already-journaled state, pinned to a snapshot. Derived state MUST be ordered by spawn ordinal, never wall-clock. The commit order is fixed: the durable append of plan.revision with assigned NodeIds strictly precedes creating or scheduling any plan/NodeId scope; fold-ahead-of-checkpoint is normal roll-forward.
  - Acceptance: crash-during-revision cassette: fold reconstructs the applied revision without re-decision; replay-strict over any adaptive cassette performs zero live decision re-evaluation.
  - Meta: milestone M6; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "Governing principle".

- **FR-301 PlanRunner and the typed plan**
  - Requirement: PlanRunner MUST be an opt-in extension of mode (c). TaskPlan MUST be typed data owned by the engine: nodes with NodeId = ULID assigned by the engine inside plan.revision (child scope plan/NodeId), a dependency DAG, and the status machine pending, ready, running, parked, escalated, done, failed, cancelled, skipped with immutable done. The engine, not the model, MUST schedule ready nodes through the existing semaphore and budget admission.
  - Acceptance: PlanInvariantError fixtures for illegal transitions; scheduling test proves the model cannot start a node directly.
  - Meta: milestone M7; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "PlanRunner"; markers DEF-8.

- **FR-302 plan_revise with formal rebase**
  - Requirement: plan_revise MUST take a typed PlanOp diff with rationale and a mandatory base { digestSeq, planHash }. Ops: add_task, amend_task, park_task, unpark_task, cancel_task, reprioritize, rewire_deps, waive_dep. The engine MUST auto-rebase per the formal conflict table; every op receives an outcome applied | transformed | dropped with a machine reason; the whole result is fixed in the plan.revision entry; replay reproduces the applied, not the requested, diff. The plan surface MUST maintain the planHash chain (planHashBefore/After), a total order on the plan scope, and the PlanWriteLock.
  - Acceptance: revise-mid-run cassette; a conflict-table test per op kind; ReplayPlanHashMismatch fixture on a corrupted chain.
  - Meta: milestone M7; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "PlanRunner"; markers DEF-8.

- **FR-303 wait_for_events and the coalesced WakeDigest**
  - Requirement: wait_for_events MUST write a suspended entry; wakes deliver a coalesced WakeDigest (summaries, never raw transcripts; orchestrator context grows O(wakes)). Trigger vocabulary: quiescence (mandatory), child_terminal, escalation, budget_threshold (50/80, fixed in v1). WakeDigest normative fields: digestSeq, planHash, coversToOrdinal, completedDigests: TaskDigest[] ({ nodeId, logicalTaskId, status, outputSummary, costUsd, artifactsIndex }), escalations, termination snapshot, budget block, reuse stats. The render budget measure is an open question (OQ in [14-open-questions.md](14-open-questions.md)).
  - Acceptance: digest coalescing fixture: three child completions produce one wake with three TaskDigests; digest fields validate against the normative schema.
  - Meta: milestone M6; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "WakeDigest normative fields"; markers DEF-8.

- **FR-304 Quiescence and guaranteed wakeability**
  - Requirement: The quiescence trigger (nothing running and nothing ready) MUST always be armed. If no trigger of a wait_for_events call can ever fire, the engine MUST raise an immediate typed error: an embedded run without an operator MUST always terminate, never hang unrecoverably.
  - Acceptance: dead-trigger fixture errors immediately; quiescence cassette wakes the orchestrator when the plan drains.
  - Meta: milestone M7; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "PlanRunner"; markers DEF-8.

- **FR-305 RevisionGuards**
  - Requirement: RevisionGuards MUST provide a configurable non-HITL fallback (reject-revision, finish-with-partial, fail-run) with a terminating default; an absolute non-replenishable maxRevisionsPerRun (default 32; plan-size scaling removed per DEF-2); droppedRevisionLimit (default 3 consecutive fully-dropped revisions); an oscillation detector over approachSigCoarse across LTID boundaries and osc_guard by SpawnKey; hysteresis on almost-done nodes. Guards and the sunk-cost ledger MUST cover park/unpark.
  - Acceptance: oscillation-freeze cassette; guard verdicts appear as decision entries; revision 33 is refused without HITL.
  - Meta: milestone M7; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "PlanRunner"; markers DEF-2, DEF-5.

- **FR-306 EscalationProtocol**
  - Requirement: Escalation MUST be typed and two-flavored. Flavor A (default): the worker terminates with status 'escalated' carrying a schema-validated EscalationReport { kind, scopeDelta, revisedEstimate { usd, turns }, blockers, proposedDecomposition: TaskSpec[], costToDate, salvage { transcriptRef, artifacts, worktreePatchRef? } }; costToDate and salvage are runtime-filled, never model-filled; the report is validated BEFORE append; it replays as ok (FR-009). Flavor B (profile opt-in): the escalate tool suspends the agent on the existing HITL machinery with the orchestrator in the loop. Status production MUST be gated by opt-in: an agent without escalation config on profile or spawn physically cannot return escalated. escalated is legal only on kind agent but in all scopes: under plan/NodeId the report routes into the WakeDigest; in script modes the typed AgentResult returns to the caller or the onEscalation hook. EscalationKind MUST be closed: scope_bigger | scope_different | blocked_with_evidence; the latter two are exempt from the minSpend gate and carry countsAgainstLimit false.
  - Acceptance: no-opt-in fixture cannot produce escalated; report validation rejects a model-supplied costToDate; the half-escalated-ladder cassette passes replay-strict.
  - Meta: milestone M3 (full decision machinery M7); spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "EscalationProtocol"; markers DEF-1, XF.

- **FR-307 Escalation decisions and caps**
  - Requirement: Escalation decisions MUST be decide-once via the resolution family with the first-closing-wins fold; a timeout defaultDecision and a live decision are never both applied (the loser is journaled as noop); timeout dispose is a resolution with by: 'timeout'. An agent MUST never resume into a destroyed environment: dispose collects the worktree patch into salvage before destroying the tree. minSpendBeforeEscalation MUST be enforced INSIDE the run (structured output rejects early escalation with a bounded keep-working re-prompt; minSpendUsd default 0). maxEscalationsPerLogicalTask MUST count per logical task across respawns via the lineage chain; the counting unit is authoritative escalation-decision entries with countsAgainstLimit true. Correlated storms MUST support a class-level EscalationDecision: one decision entry with an array of per-lineage debits. EscalationDecision MUST be retry | decompose | cancel | accept with derived countsAgainstLimit. Cap excess yields terminal 'escalated' with capExceeded and the final report (a bare 'limit' would discard the very signal the protocol exists for). EscalationOptions: { flavor, deadlineMs, defaultDecision, minSpendUsd }.
  - Acceptance: decide-once race test on an escalation target; class-decision cassette debits N lineages atomically; cap-exceeded fixture preserves the report.
  - Meta: milestone M7; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "EscalationProtocol"; markers DEF-3, DEF-4, XF.

- **FR-308 AdmissionController and the AdmitVerdict union**
  - Requirement: A single AdmissionController MUST admit ALL spawns of any origin (orchestrator, ctx.workflow, escalation decomposition, rung respawn, reuse link), owning depth, quota, budget reserve, dedup, lineage limits, and structural limits. admit(spec, origin) MUST be called BEFORE the decision entry is journaled; the verdict plus reserved amounts plus statsBefore are embedded IN the decision entry, so replay never re-evaluates admission against a live budget. The unified verdict union MUST be: admit { reserve, dedup?, spawnUnitsAfter, lineage }; reuse_full { donor, spawnUnitsAfter, lineage } (extended per cross-review: zero live reserve); admit_graft { donor, reserve, boot, spawnUnitsAfter, lineage }; reject { reason } with reason codes depth | quota | budget | lifetime | termination_exhausted | ladder_exceeds_frozen | lineage_exhausted | lineage_busy | osc_guard (with spawnKey and oscillationCount).
  - Acceptance: every debit is atomic with its carrying decision entry and embeds balance-after (fold fixture); origin matrix test admits each spawn origin through the same code path.
  - Meta: milestone M6; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "AdmissionController"; markers DEF-2, DEF-3, DEF-5, XF.

- **FR-309 Structural limits**
  - Requirement: The AdmissionController MUST enforce maxDepth (default 1, ceiling 4), maxChildrenPerNode (default 16), childBudgetFraction from parent remainder minus finalizeReserve (default 0.3), the lifetime cap, maxTotalSpawns (default 128, frozen in termination.init for PlanRunner runs), maxAttemptsPerLogicalTask, and the single-live-attempt-per-LTID invariant. Structural limit violations MUST return a typed error to the orchestrator, never tear the run.
  - Acceptance: per-limit reject fixtures; an over-limit spawn leaves the run running with a typed verdict in the journal.
  - Meta: milestone M6; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "AdmissionController"; markers DEF-2, DEF-3.

- **FR-310 Lineage (LogicalTaskId)**
  - Requirement: Lineage MUST follow the DEF-3 minting/inheritance rules: a LogicalTaskId (LTID) identifies the logical task across respawns (ladder rung retries share the LTID with relation 'rung-retry'); approachSig characterizes the attempt approach; lessons key on the mandatory pair (logicalTaskId, approachSig); LineageStats are folds; only one live attempt per LTID may exist; legacy entries canonize per the journal spec.
  - Acceptance: lineage fold fixtures; a second live attempt on one LTID is rejected with lineage_busy.
  - Meta: milestone M7; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "Lineage"; markers DEF-3.

- **FR-311 Reuse-by-reference (node.link)**
  - Requirement: Content-key dedup MUST have defined reuse-by-reference behavior: node.link is an ordinary forward-matched content-keyed effect entry (only the donor is addressed by seq); reuse_full costs zero live reserve; graft aliasing and chains follow the DEF-5 donor rules. The alias column of the replay table MUST hold: a derived-skipped entry UNDER an incoming node.link alias becomes match-eligible with its pre-abandon terminal status (ok and escalated match; error and cancelled under alias still rerun live); skipped without an alias always skips. The abandoned-spend ledger (abandonedUsd, reclaimedUsd, netLostUsd, oscillationCount) MUST fold from revision, abandon, and link entries. Dedup remains a cheap catch of byte-identical repeats; the real cycle barrier is depth/quota/budget.
  - Acceptance: DEF-5 cassette: reuse of an abandoned-ok donor with zero live calls; alias-over-error fixture reruns live; abandoned-spend fold fixture matches golden values.
  - Meta: milestone M7; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "AdmissionController" and [03-journal-spec.md](03-journal-spec.md), "Abandon, derived skipped, reuse-by-reference"; markers DEF-5.

- **FR-312 RunLedger**
  - Requirement: RunLedger MUST be run-scoped, single-writer (orchestrator scope only), journaled, and strictly advisory. Sections: immutable mission brief; facts with provenance and confidence; plan revision history with rationale; runtime auto-TaskDigests at child completion (never full transcripts), ordered by spawn ordinal; lessons keyed by (logicalTaskId, approachSig); a world-delta index from AgentResult.artifacts; modelObservations (phase 3 only). Every authored write MUST be a journaled effect entry kind ledger.op with the closed op union brief_set (once) | fact_add | fact_supersede | lesson_add | observation_add; revision history, TaskDigests, and the world-delta index are auto-derived fold joins, not authored ops. The view is a pure fold with a join to the journal task table; the journal always wins on what is paid and completed; contradictions render as flagged discrepancies, never truth. ledger_read is pinned to the turn snapshot; fold-global counters never enter the transcript; distillation lives in the child scope by taskId. renderBudgetTokens MUST use a deterministic model-independent measure (OQ). Aggressive orchestrate-role compaction MUST be gated on measured ledger sufficiency (at least one authored revision and a minimum fact count), else fall back to conservative summarize. Stall replan MUST be hard-bounded per run and exclude transient and environment error classes. Per-section caps default: facts 64, lessons 32, observations 16.
  - Acceptance: ledger fold golden fixtures; discrepancy fixture flags a ledger claim contradicting the journal; second brief_set is rejected; LedgerExport remains draft-versioned (OQ).
  - Meta: milestone M7; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "RunLedger"; markers DEF-3.

- **FR-313 ModelLadder**
  - Requirement: ModelLadder MUST be opt-in tiers from cheap to strong: LadderSpec { rungs: Array<{ model, effort?, maxTurns, maxTokens, maxCostUsd? }>, startTier, escalateOn: TriggerClass[], acceptance?: Gate[] }. Transition triggers MUST be typed: error, limit, schema-exhausted, verify-failed, no-progress. Acceptance gates per attempt: mechanical (engine-registered named pure functions over AgentResult.artifacts, verdicts journaled as decision entries) | judge (declared rung or explicit override, FR-119) | spot-check (fraction; sibling selection strictly via ctx.random, never Math.random). Each rung attempt is an ordinary agent scope whose hash includes the concrete ModelRef: tier N+1 is a new content key and one live attempt; all attempts share the LTID. Every ladder control-flow verdict (verify, judge acceptance, budget-guard denial on a rung, no-progress abort, spot-check selection) MUST be a decision entry computed once live and replayed by match; the ladder fold consumes only journaled values. No-progress and per-rung cap hits journal as a first-class terminal class distinct from user cancellation. memoizeOutcome is an opt-in flag on rung/fallback spawns; the global default errors-rerun-live is preserved. Runtime startTier promotion is deferred from v1 (EXC-06).
  - Acceptance: half-escalated-ladder and budget-denied-rung cassettes pass replay-strict; a Math.random-based spot check is impossible by API shape.
  - Meta: milestone M7; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "ModelLadder"; markers DEF-1, DEF-3.

- **FR-314 TerminationAccount and the termination lemma**
  - Requirement: PlanRunner runs MUST write termination.init freezing the limits vector before any adaptive machinery acts; every consuming decision MUST debit the account atomically with its carrying decision entry, embedding the balance after; the variant function Phi MUST be strictly decreasing so the composite loop (revise, escalate, respawn, park/unpark, reuse) provably terminates; exhaustion yields termination.denied semantics (typed verdicts, not run teardown); config drift between resume and init MUST be detected and journaled.
  - Acceptance: the DEF-2 termination cassette; a property test drives the account to exhaustion and observes denial verdicts with no further spawns.
  - Meta: milestone M7; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "TerminationAccount"; markers DEF-2.

- **FR-315 Orchestrator budget cap and finalize reserve**
  - Requirement: The orchestrator MUST run on its own budget sub-account with effectiveCapUsd = min(capUsd, capFraction * runCeilingUsd), capFraction default 0.2 (opt-out only explicit, capFraction up to 1.0 with a telemetry warning). PlanRunner MUST refuse to start with a typed OrchestratorCapConfigError before the first LLM call if the cap is unresolvable. At orchestrator admission the engine MUST write one decision entry 'orchestrator_budget_reserve' strictly AFTER termination.init and strictly BEFORE the first orchestrator turn, fixing finalizeReserveUsd (explicit, or finalizeTurns * estimated turn cost at the resolved orchestrate model's price; default finalizeTurns 2) in absolute dollars; the reserve registers as committedReserve in both the orchestrator account and the root account, so layer-1 admission never consumes finalization money. At cap: freeze protocol, forced finish, and a finalize fallback synthesized by fold ('orchestrator_finalize_fallback'). The WakeDigest budget block gives passive visibility (runSpent, orchestratorSpent, cap, reserve, orchestratorShare, softWarning at 80 percent); there is no self-budget wake trigger.
  - Acceptance: cap-unresolvable config fails before any LLM call; forced-finish cassette produces a final result from the reserve; fold proves reserve was never lent to spawns.
  - Meta: milestone M7; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "Orchestrator budget"; markers DEF-7, XF.

- **FR-316 Orchestrator toolset and stable handles**
  - Requirement: The orchestrator toolset MUST carry normative JSON Schemas per tool: spawn_agent (model_hint.startTier, approach, lineage), parallel_agents, await_any/await_all, cancel_agent, plan_view, plan_revise (base { digestSeq, planHash }; PlanReviseResult), wait_for_events, escalate, kb_propose (phase 3), finish (result schema). Spawn handles MUST be journal-derived stable ids (the spawn entry seq), stable across resume. plan_view MUST be a pure fold of plan-scope entries pinned to coversToOrdinal of the last WakeDigest (never a live read), rendering LineageStats, abandoned-spend, and the TerminationAccount snapshot.
  - Acceptance: tool schemas validate all cassette payloads; handles survive kill-and-resume in the await_any cassette.
  - Meta: milestone M6 (plan tools M7); spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "Orchestrator toolset"; markers DEF-8, XF.

- **FR-317 Applicability outside PlanRunner runs**
  - Requirement: In non-PlanRunner runs only the engine lifetime cap (500), maxDepth, and the budget layers apply; no termination.init is written and no TerminationAccount folds exist. Escalation caps outside PlanRunner are enforced per declared lineage only when spawns declare lineage; otherwise the escalated result is simply returned. kb_pinned is written only for runs that resolve an orchestrate-role invocation.
  - Acceptance: a plain script run's journal contains no termination.* entries; an undeclared-lineage escalation returns to the caller uncapped.
  - Meta: source cross-review ruling; milestone M7; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "Scope and applicability per mode"; markers XF.

- **FR-318 Model-name blindness of the orchestrator**
  - Requirement: The orchestrator MUST never see model names: spawn_agent accepts only model_hint.startTier, clamped to the declared ladder; the knowledge card (FR-602) is tier-relative for the same reason.
  - Acceptance: spawn_agent schema has no model field; prompt snapshot contains no ModelRef strings.
  - Meta: milestone M6; spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "ModelLadder".

### 2.5 FR-4xx: tools, permissions, isolation, MCP

- **FR-400 Typed tool definition**
  - Requirement: tool() MUST accept { name, description, parameters: SchemaSpec, version?, executor?, needsApproval?, risk?, execute(input: Out<S>, ctx: ToolContext) } and return a ToolDef with input types inferred from the SchemaSpec.
  - Acceptance: type-level tests pin Out<S> inference for all three SchemaSpec forms.
  - Meta: milestone M3; spec [08-tools-permissions-spec.md](08-tools-permissions-spec.md), "tool() definition and ToolDef".

- **FR-401 SchemaSpec forms and validation**
  - Requirement: SchemaSpec MUST be one of: a Standard Schema (accepted via vendored StandardSchemaV1 types, never a runtime dependency) with JSON Schema projection via StandardJSONSchemaV1 '~standard'.jsonSchema.input() (target draft 2020-12, fallback draft-07), otherwise a typed ConfigError at definition time; a { jsonSchema, validate } pair; or a bare JSON Schema. Out<S> MUST be the Standard Schema output type, the validate() type-guard target, or unknown respectively. The vendored validator MUST be an eval-free draft 2020-12 subset (no $dynamicRef, no remote $ref).
  - Acceptance: projection tests against Zod 4.2+/ArkType/Valibot fixtures; a non-projectable library errors at definition; validator subset test suite passes without eval.
  - Meta: milestone M3; spec [08-tools-permissions-spec.md](08-tools-permissions-spec.md), "SchemaSpec"; markers XF.

- **FR-402 schemaHash/toolsetHash from the contract**
  - Requirement: toolsetHash MUST be computed from the contract (name, description, canonical parameters JSON Schema, version), never the execute closure: editing an implementation does not invalidate the journal; a semantic change is fixed by a version bump. schemaHash and toolsetHash MUST derive from the canonicalized JSON Schema (JCS ordering, local $ref inlined, remote and dynamic $ref forbidden, annotation keywords stripped).
  - Acceptance: changing execute leaves the hash unchanged; bumping version changes it; canonicalization fixtures are stable across platforms.
  - Meta: milestone M3 (hash profile M2); spec [08-tools-permissions-spec.md](08-tools-permissions-spec.md), "tool() definition and ToolDef" and [03-journal-spec.md](03-journal-spec.md), "schemaHash/toolsetHash derivation"; markers DEF-6.

- **FR-403 Permission chain**
  - Requirement: The layered permission chain MUST be the single approval surface, evaluated in order: hooks -> deny rules -> ask rules -> canUseTool -> terminal default (allow unless needsApproval: true, then ask). Hook signature: (toolName, input, ctx) => allow | deny | ask | { modifiedInput }, sync or async, deterministic registration order. Subagent inheritance of permissions MUST be explicit opt-in only. An ask MUST be journaled as a suspended approval together with the turn checkpoint; resume continues the loop from the same turn without re-paying turns or re-running tools.
  - Acceptance: chain-order matrix test; ask-approval cassette suspends and resumes at the same turn; a subagent without opt-in sees the default chain only.
  - Meta: milestone M3; spec [08-tools-permissions-spec.md](08-tools-permissions-spec.md), "Permission chain"; markers XF.

- **FR-404 Risk metadata, presets, audit, dry-run**
  - Requirement: ToolRisk MUST be read | write | network | execute | destructive. compilePermissionPreset MUST compile presets INTO the existing chain (never a fifth layer); shipped presets are strict/standard/open with published compiled rule tables. Audit events for allow/deny/ask and a dry-run mode MUST exist. Network-domain rules are enforced only for first-party fetch and MUST be marked advisory elsewhere (honest position: no enforcement mechanism outside first-party tools).
  - Acceptance: preset compilation snapshot equals the published tables; dry-run produces the decision log without executing; docs mark advisory scope.
  - Meta: milestone M5; spec [08-tools-permissions-spec.md](08-tools-permissions-spec.md), "Risk metadata and permission presets".

- **FR-405 Argv-parsing shell matcher**
  - Requirement: Shell allow/ask/deny MUST use a real argv parser, not string prefixes; compound commands with any unmatched segment MUST yield ask ('npm test; rm -rf' must be caught).
  - Acceptance: matcher test corpus includes compound, quoted, and subshell cases; the cited example yields ask.
  - Meta: milestone M5; spec [08-tools-permissions-spec.md](08-tools-permissions-spec.md), "Argv-parsing shell matcher".

- **FR-406 MCP bus**
  - Requirement: mcp(cfg) MUST support transports stdio | streamable-http | inprocess with allow/deny filters, name-collision prefixing, per-session tools/list cache with cursor pagination and listChanged handling, and needsApproval integration into the permission chain; inputSchema/outputSchema/structuredContent/isError MUST map onto tool-result journal entries. Native tools, in-process MCP, and remote MCP MUST be indistinguishable to the runtime (ToolSource seam). kb_propose and escalate register like any opt-in tool. The pinned SDK is @modelcontextprotocol/sdk ^1.29; the v2 migration is a logged post-M3 task.
  - Acceptance: ToolSource conformance fixture runs one test suite across native/inprocess/stdio; collision prefixing and pagination covered by cassettes.
  - Meta: milestone M3; spec [08-tools-permissions-spec.md](08-tools-permissions-spec.md), "MCP bus".

- **FR-407 Executors as declared capability**
  - Requirement: Executors ('inprocess' | 'subprocess' | 'container') MUST be a declared tool capability. Hostile-code containment is provided by executors and worktrees, never the sandbox (NFR-07). The subprocess/container executor specification remains open until pre-1.0 (OQ in [14-open-questions.md](14-open-questions.md)); until it closes, containment statements MUST be phrased as plans.
  - Acceptance: ToolDef type carries the executor field; docs audit finds no containment claim stated as shipped.
  - Meta: milestone M3; spec [08-tools-permissions-spec.md](08-tools-permissions-spec.md), "Executors".

- **FR-408 Worktree isolation lifecycle**
  - Requirement: IsolationProvider MUST implement the full worktree lifecycle: acquire creates a worktree from HEAD (or a given ref) of the host git repo and gives tools a cwd inside; collect() snapshots changed files and a patch, stores the patch in the TranscriptStore, and returns it in AgentResult.artifacts; applying the patch remains the caller's job; dispose cleans up (keepOnError optional); a non-git host raises a typed ConfigError. IsolationSpec MUST be 'none' | 'readonly' | { kind: 'worktree', ref? } as the canonical identity encoding. maxPinnedWorktrees (default 4) is shared by park/unpark and retainWorktree; on overflow, park keeps the checkpoint but drops the worktree (unpark becomes restart), and graft degrades to a fresh admit with DedupNote graft_unsafe.
  - Acceptance: lifecycle e2e on a fixture repo; non-git error test; overflow fixture demonstrates the documented degradations.
  - Meta: milestone M3; spec [08-tools-permissions-spec.md](08-tools-permissions-spec.md), "IsolationProvider and worktree lifecycle"; markers DEF-5, XF.

### 2.6 FR-5xx: observability, testing, evals

- **FR-500 Single event stream**
  - Requirement: One discriminated WorkflowEvent stream with hierarchical spanId (run > phase > agent > tool > child) MUST be the sole observability source, feeding RunHandle.events/on(), the terminal progress renderer, the JSONL log, and the optional OTel exporter. spanId is pure telemetry and MUST NOT enter journal identity. Replayed events MUST carry replayed: true; the re-emission set is journal-backed lifecycle events only, never stream deltas.
  - Acceptance: replay of a journal re-emits lifecycle events flagged replayed and zero agent:stream deltas; identity fixtures unaffected by spanId changes.
  - Meta: milestone M1; spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "Event stream"; markers XF.

- **FR-501 Event naming and telemetry seq**
  - Requirement: Event types MUST follow one convention, domain:verb lowercase, with the full canonical catalog (including plan:revised, node:parked/cancelled/linked, orchestrator:woke, orchestrator:budget, escalation:raised/decided, spawn:admitted/rejected, verify:failed, ledger:op, stall:detected, guard:oscillation, resolution:applied/superseded, termination:debit/denied/config-drift, journal:compat). WorkflowEvent.seq MUST be an independent per-run telemetry counter, distinct from JournalEntry.seq.
  - Acceptance: catalog snapshot test; no PascalCase event names in emitted streams; seq counters verified independent in a mixed fixture.
  - Meta: milestone M1 (adaptive events with their features); spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "Event stream"; markers XF.

- **FR-502 RunHandle surface**
  - Requirement: RunHandle MUST expose runId, result, events, on(), cancel(reason?), and resolveExternal(key, value) returning ResolutionOutcome (DEF-4 signature).
  - Acceptance: API type snapshot; resolveExternal outcome reflects first-closing-wins classification.
  - Meta: milestone M1 (resolveExternal M2); spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "RunHandle"; markers DEF-4.

- **FR-503 CostReport**
  - Requirement: CostReport MUST provide totalUsd, byModel, byPhase, byAgentType, byRole, and the orchestrator block { spentUsd, share, wakes, forcedFinish, reserveUsedUsd }; unpriced models MUST be surfaced, never silent zeros.
  - Acceptance: report golden fixtures including an unpriced model and a forced-finish run.
  - Meta: milestone M5 (byRole and orchestrator block M7); spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "RunHandle"; markers DEF-7.

- **FR-504 OTel export**
  - Requirement: toOtel(run, tracer) MUST map the spanId tree 1:1 onto OpenTelemetry spans; @opentelemetry/api ^1.9 is an optional peer; gen_ai.* semconv usage is flagged unstable; attribute content follows the redaction policy (FR-512).
  - Acceptance: exporter test maps a fixture run to the expected span tree; core builds without the OTel peer installed.
  - Meta: milestone M5; spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "OpenTelemetry mapping".

- **FR-505 Adaptive metrics**
  - Requirement: The stream MUST support the metrics ledger-ops-per-spawn, wake-render-size, escalation rate by agentType, orchestrator-share (p50/p90), and abandoned/reclaimed/netLost USD.
  - Acceptance: metric derivation tests over adaptive cassettes produce the golden values.
  - Meta: milestone M7; spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "Metrics"; markers DEF-5, DEF-7.

- **FR-506 FakeAdapter and createTestEngine**
  - Requirement: @lurker/testing MUST ship FakeAdapter patterned by agentType/label/prompt regex and createTestEngine for fast, fully typed, zero-network unit tests.
  - Acceptance: the documented createTestEngine example compiles and runs offline.
  - Meta: milestone M1; spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "Test harness three tiers".

- **FR-507 VCR cassettes and cron contract tests**
  - Requirement: VCR MUST record/replay at the adapter boundary (vendor-neutral by construction; redacted JSONL keyed by request hash): record({ adapters, cassette, redact? }), replay({ cassette, onMiss: 'throw' | 'passthrough' }). Cassettes MUST additionally run on a cron schedule against live APIs as adapter contract tests (provider drift caught before users).
  - Acceptance: redaction test proves no secrets in cassette bytes; cron workflow exists in CI (budget/keys are a founder OQ).
  - Meta: milestone M5; spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "Test harness three tiers".

- **FR-508 Replay-strict runs**
  - Requirement: replayRun(wf, args, { journal, mode: 'strict' }) MUST throw JournalMissError on any live call, turning every production journal into a deterministic integration test.
  - Acceptance: replay-strict CI tier over all cassettes reports zero live calls; a mutated journal fails loudly.
  - Meta: milestone M2; spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "Test harness three tiers".

- **FR-509 Test matchers**
  - Requirement: Matchers MUST ship for vitest and jest, at minimum toHaveCalledAgent(name, { times }) and toStayUnderBudget({ usd }).
  - Acceptance: matcher unit tests in both harnesses.
  - Meta: milestone M1; spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "Test harness three tiers".

- **FR-510 Mandatory defect cassette catalog**
  - Requirement: The DEF-1..DEF-8 defect cassettes (canonical IDs in [09-observability-testing-spec.md](09-observability-testing-spec.md)) plus the round-2 set (revise-mid-run, crash-during-revision, park-unpark, oscillation-freeze, half-escalated-ladder, budget-denied-rung) MUST exist as replay-strict tests; every milestone exits with its cassette subset green; the complete set gates 1.0.
  - Acceptance: the catalog in [09-observability-testing-spec.md](09-observability-testing-spec.md), "Mandatory defect cassette catalog" maps 1:1 to CI test IDs; M9 release checklist requires all green.
  - Meta: milestone M9 (subsets land per milestone); spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "Mandatory defect cassette catalog"; markers DEF-1..DEF-8.

- **FR-511 @lurker/evals**
  - Requirement: @lurker/evals MUST measure quality over public APIs only: EvalCase = { workflow, args, graders[] }; golden, rubric, and LLM-judge graders; the judge grader runs through the engine with the judge role, so judge calls are journaled, budgeted, and VCR-recorded (deterministic eval CI); config-matrix comparison reports pass-rate, cost, latency from existing AgentResult usage/costUsd. Round-3 extensions: matrix sweeps (workflow x model x taskClass) under the dedicated eval-committer identity, the canary fingerprint, and falsification sweeps (lurker kb sweep). No failure clustering and no vector dependency.
  - Acceptance: eval CI runs deterministically from cassettes; sweep output emits eval-measured ClaimOps only under the committer identity.
  - Meta: milestone M9 (sweeps and canary M11); spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "@lurker/evals".

- **FR-512 Redaction and sensitive data**
  - Requirement: The library SHOULD provide an L0 serialization hook for redaction, a default key-masking policy, and an OTel attribute content policy. The concrete design is open (OQ in [14-open-questions.md](14-open-questions.md)); VCR secret redaction (FR-507) MUST NOT wait for it.
  - Acceptance: once closed, redaction tests cover journal payloads, cassettes, and OTel attributes.
  - Meta: milestone M9; spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "Redaction and sensitive data".

### 2.7 FR-6xx: ModelKnowledge

- **FR-600 Feature boundary**
  - Requirement: ModelKnowledge MUST be an engine-scoped, per-project, append-only store of schematized claims about (model, effort, taskClass) suitability: read by a run at admission as a journal-pinned snapshot, re-read on every resume from suspension, and written only outside runs through a CAS gate. It is the sole sanctioned exception to the cross-run memory ban, bounded four ways: domain (models only; scopeless claims are inexpressible by schema), scope (engine-level SPI, default a git-reviewed project file), write authority (runs only propose into their own ledger; only out-of-run gates commit), and size (active-claim cap per (model, taskClass), default 8; supersede chains keep only the head active; card renderBudget).
  - Acceptance: schema test proves a scopeless claim cannot be constructed; runtime handle type is Pick<ModelKnowledgeStore, 'current'>.
  - Meta: milestone M10; spec [05-model-knowledge-spec.md](05-model-knowledge-spec.md), "Feature boundary".

- **FR-601 Data model and SPI**
  - Requirement: The data model MUST be: TaskClass aligned with the role-floor vocabulary; ClaimClass 'eval-measured' | 'human-editorial' (no 'orchestrator-proposed' class exists in the store); ClaimStatus active | stale | superseded | archived; EvidenceRef with journal entryRef as a seq number (XF ruling); ModelClaim (statement <= 200 chars, templated when proposal-derived; evidence >= 1 mandatory; metrics writable ONLY by the eval-committer identity; expiresAt TTL; modelEpoch best-effort; append-only supersedes); KnowledgeSnapshot { version, hash, claims }; GateRecord with mandatory attribution attestation for the human kind (eval-confirmed reserved for v2); ClaimOp add | supersede | archive. ModelKnowledgeStore MUST be current()/commit(ops, expectedVersion) with CAS on a monotonic version; a propose() method MUST NOT exist in the SPI; the default store is the git-diffable file lurker.models.json.
  - Acceptance: type and schema tests pin every constraint above; commit with a stale expectedVersion fails CAS.
  - Meta: milestone M10; spec [05-model-knowledge-spec.md](05-model-knowledge-spec.md), "Data model"; markers XF.

- **FR-602 Pinned read path and the two-layer card**
  - Requirement: One read MUST happen at run admission before the first orchestrator turn: the engine calls store.current(), filters claims (active, unexpired, models reachable through the run's declared ladders after the role-floor filter), and renders modelKnowledgeCard(snapshot, ladders, floors) as a deterministic pure function. The card MUST be tier-relative and two-layered: the verified layer compiles exclusively from eval-measured claims into startTier recommendations per (ladder, taskClass), clamped to at most one rung from the ladder default; the notes layer renders human-editorial claims dated and explicitly marked unverified, never compiled into a tier. The engine MUST journal one decision entry kb_pinned { version, hash, cardText } with the card bytes embedded: replay and resume read the journal and never touch the live store. On every resume from suspension (wait_for_events, HITL approvals, awaitExternal) the engine MUST write a fresh kb_repinned entry under the same filtering rules. Admission and child spawns read the latest pin of their scope in spawn order, never by wall-clock. Empty verified layer without evals is the honest degraded mode.
  - Acceptance: card render is byte-deterministic for a fixed snapshot; replay-strict passes after deleting the live store file; a clamp test rejects a two-rung shift.
  - Meta: milestone M10; spec [05-model-knowledge-spec.md](05-model-knowledge-spec.md), "Read path".

- **FR-603 Write authority and the human gate**
  - Requirement: Nothing MUST commit to the knowledge store during a run. commit(ops, expectedVersion) MUST use CAS on the monotonic version, mirroring the LeasableStore fencing discipline; concurrent maintenance commits serialize by CAS failure and rebase. Write rights: the eval pipeline (eval-measured claims with metrics, via the dedicated committer identity) and humans (editorial, supersede, archive). The human gate MUST require the attribution attestation (ruledOut checklist over prompt, tools, difficulty, transient-provider; recommended contrastEvidence); without the attestation the ClaimOp is unconstructible ("evidence exists" rubber-stamping is structurally impossible).
  - Acceptance: type test: GateRecord without attribution does not compile/validate; runtime handle has no commit path.
  - Meta: milestone M10; spec [05-model-knowledge-spec.md](05-model-knowledge-spec.md), "Write path".

- **FR-604 Grounding and decay (phase 2)**
  - Requirement: TTLs MUST be asymmetric by polarity: eval strength 90 days, eval weakness 30 days, editorial strength 120 days, editorial weakness 45 days; inbox proposals expire after 14 days. Expiry MUST be enforced at every pin AND every resume re-pin; expired eval claims enter the remeasure queue (a status filter, not infrastructure). modelEpoch MUST be declared an honest coarse signal (registryVersion, pricingVersion, capsHash; archive, never delete); silent alias re-serving is a documented uncaught case without probes. The optional canary fingerprint (@lurker/evals: fixed probe set at temperature 0, hash of normalized outputs) MUST flip a model's eval claims to stale on change. Falsification sweeps (lurker kb sweep) MUST execute through the ordinary engine (journaled, VCR-recordable, budgeted) and MUST include models with active negative claims.
  - Acceptance: TTL matrix test per class and polarity; canary-change fixture marks claims stale; sweep plan test includes negatively-claimed models.
  - Meta: milestone M11; spec [05-model-knowledge-spec.md](05-model-knowledge-spec.md), "Grounding and decay".

- **FR-605 kb_propose and the inbox (phase 3, gated)**
  - Requirement: kb_propose MUST register like escalate (profile opt-in). Payloads MUST be schema-valid: subject, taskClass, polarity, trigger from the typed vocabulary (error, limit, schema-exhausted, verify-failed, no-progress, escalation); the statement is assembled from a template over that vocabulary (tool output is unquotable into a persistent record); evidence MUST resolve into decision entries of this same run. The engine writes the proposal as a journaled ledger.op into the RunLedger section modelObservations (orchestrator scope only; single-writer intact; workers contribute evidence only via their journaled ladder verdicts and TaskDigests). There MUST be no mirroring into the live store. Post-run, proposals travel via LedgerExport; lurker kb inbox aggregates them from finished runs, groups matching triples for display only (grouping never authorizes spend or schedules sweeps), and records the initiating run identity. Phase 3 ships only after the phases 1-2 measured-value checkpoint (quantitative criteria: OQ in [14-open-questions.md](14-open-questions.md)).
  - Acceptance: proposal with free-text statement or foreign-run evidence fails validation; live store file bytes unchanged after a proposing run.
  - Meta: milestone M12; spec [05-model-knowledge-spec.md](05-model-knowledge-spec.md), "Write path".

- **FR-606 Structural security of the knowledge channel**
  - Requirement: The influence channels MUST be broken structurally: (1) absolute quarantine: proposals render into no prompt of any run, including later turns of the proposing orchestrator, until gated; (2) templated statements; (3) commit unreachable in-run by API shape; (4) metrics only via the eval-committer identity, never on observational data, no autopromotion (the deconfounder is the fixed eval matrix independent of current routing); (5) the gate attests attribution, not evidence existence; (6) blast radius clamped to one rung with caps and floors staying hard; (7) provenance kept and grouping display-only, no proposal volume ever authorizes eval spend; (8) replay soundness via card bytes embedded in kb_pinned/kb_repinned.
  - Acceptance: red-team test suite exercises each of the eight closures (e.g., injected tool-output text cannot reach a persisted statement; a proposing run's later prompts do not contain the proposal).
  - Meta: milestone M10 (channels 1-3, 8), M11-M12 (rest); spec [05-model-knowledge-spec.md](05-model-knowledge-spec.md), "Security".

- **FR-607 Composition with the model layer**
  - Requirement: The authority hierarchy MUST NOT change: ModelCaps and role quality floors remain hard router constraints; ModelLadder defines the escalation path with quantitative acceptance gates; ModelKnowledge only advises within the floor-and-ladder-permitted set and never overrides or weakens anything. It feeds exactly three points: model_hint.startTier (verified layer, one-rung clamp), agentType choice at spawn (card meets the profileCard vocabulary), and human authoring of ladders/floors/profiles via the maintenance view. Budget math is untouched: knowledge changes reserves only through the existing admission path. Runtime startTier promotion stays deferred to v2 (a pure compiled promotion table from kb_pinned bytes, eval-measured claims only).
  - Acceptance: a floor-violating recommendation is filtered out before card render; no code path outside admission consumes the card for budget purposes.
  - Meta: milestone M10; spec [05-model-knowledge-spec.md](05-model-knowledge-spec.md), "Composition with the model layer".

### 2.8 FR-7xx: shells

- **FR-700 Shells are optional and API-pure**
  - Requirement: The CLI, HTTP server, and queue worker MUST build strictly on public APIs (L4-L5, the event stream, and the stores) and be optional; no lower layer may depend on them. Building shells from the public API is a permanent seam-sufficiency test.
  - Acceptance: dependency graph check: no core package imports a shell package; shell packages import only public entry points.
  - Meta: milestone M5; spec [02-architecture.md](02-architecture.md), "Shells overview".

- **FR-701 CLI grammar and TUI**
  - Requirement: The canonical CLI grammar MUST be: lurker run <wf> --args <json> --store <dir> --budget-usd <n>; lurker resume <runId>; lurker runs ls; lurker inspect <runId>; lurker plan "goal" --dry-run; lurker kb list | inbox | sweep. No aliases exist in v1. A TUI progress renderer consumes the event stream.
  - Acceptance: CLI integration tests per command; help output snapshot matches the grammar exactly.
  - Meta: milestone M5 (kb commands M10/M11); spec [06-execution-spec.md](06-execution-spec.md), "Engine and ops API"; markers XF.

- **FR-702 HTTP server**
  - Requirement: createServer({ engine, workflows }) (the journal store comes from the engine; canonical signature shared with [02-architecture.md](02-architecture.md), "Shells overview" and [06-execution-spec.md](06-execution-spec.md), "Engine and ops API") MUST return { fetch(req: Request): Promise<Response> } with routes POST /runs, GET /runs/:id, GET /runs/:id/events (SSE), POST /runs/:id/external/:key, GET /runs/:id/cost. Authentication is explicitly out of scope (host middleware); SSE reconnection maps Last-Event-ID to the event seq; both are recorded as OQ in [14-open-questions.md](14-open-questions.md).
  - Acceptance: route integration tests including SSE streaming and external resolution of a suspended run.
  - Meta: milestone M8; spec [02-architecture.md](02-architecture.md), "Shells overview"; markers XF.

- **FR-703 Queue worker**
  - Requirement: createWorker(engine, { store: LeasableStore, concurrency? }) MUST lease resumable and suspended runs via acquire/renew/release with the fencing epoch; stateless workers call engine.resume; the hashVersion window MUST be checked at acquire. A store without lease capability MUST raise a typed configuration error at worker start, never a silent split-brain. Queue semantics are honestly at-least-once with deduplication by the journal.
  - Acceptance: multi-process soak test: two workers, one run, fencing rejects the stale writer; non-leasable store fails at start.
  - Meta: milestone M8; spec [02-architecture.md](02-architecture.md), "Shells overview"; markers DEF-4, DEF-6.

- **FR-704 KB maintenance commands**
  - Requirement: lurker kb list MUST show claims with full provenance for ladder/floor/profile authors; lurker kb inbox implements FR-605's aggregation; lurker kb sweep implements FR-604's falsification sweeps through the ordinary engine.
  - Acceptance: command integration tests over a fixture knowledge file and exported ledgers.
  - Meta: milestone M10 (inbox M12, sweep M11); spec [05-model-knowledge-spec.md](05-model-knowledge-spec.md), "Write path".

## 3 Non-functional requirements

- **NFR-01 Embeddability**
  - Requirement: lurker MUST be a library, not a platform: the core runs inside a host application with no mandatory server, database, or control plane. @lurker/core MUST have zero provider SDK dependencies and exactly one vendored runtime dependency (the eval-free JSON Schema mini-validator); the vendored StandardSchemaV1/StandardJSONSchemaV1 declarations are type-only (no runtime code) and do not count against this limit ([13-toolchain-repo.md](13-toolchain-repo.md), "Committed toolchain"). Shells are optional (FR-700). Every adaptive guard state MUST have a non-HITL terminating fallback: an embedded run without an operator always terminates, never hangs. The safe default and the embeddable default MUST coincide by construction (I6).
  - Acceptance: CI dependency audit of @lurker/core; the FR-304 dead-trigger and guard-fallback fixtures; a minimal host app example runs with InMemoryStore and no network services.
  - Meta: spec [02-architecture.md](02-architecture.md), "Dependency rules".

- **NFR-02 Determinism and replayability**
  - Requirement: A completed run's journal MUST replay under replay-strict with zero live calls. All dynamic decisions are journaled before their effects (I2); all derived state is ordered by spawn ordinal, never wall-clock; wall-clock never enters identity.
  - Acceptance: the replay-strict CI tier (FR-508) over the full cassette catalog; production journals replayable as integration tests.
  - Meta: spec [09-observability-testing-spec.md](09-observability-testing-spec.md), "Test harness three tiers".

- **NFR-03 Never-pay-twice**
  - Requirement: A completed, paid LLM call MUST never be paid twice: completed work replays; inserting one new call costs exactly one live call; no global prefix flip exists (I1).
  - Acceptance: the store-conformance insertion fixture (FR-012) and the decide-once oracle (FR-017); DEF cassettes assert zero re-paid calls.
  - Meta: spec [03-journal-spec.md](03-journal-spec.md), "Scoped forward-matching".

- **NFR-04 Bounded budget overshoot**
  - Requirement: Spend beyond the ceiling MUST be bounded by at most one turn per in-flight agent (tighter is impossible: providers bill severed streams), and this bound MUST be documented. B0 is immutable after start (FR-209).
  - Acceptance: overshoot property test: worst-case overshoot <= in-flight agents x one turn cost at their caps.
  - Meta: spec [06-execution-spec.md](06-execution-spec.md), "Three-layer budget".

- **NFR-05 Performance envelopes**
  - Requirement: The stated envelopes MUST hold: execution is a single pass with no per-step re-entry (no O(n^2) step re-execution; deliberate anti-Inngest); orchestrator context grows O(wakes) via coalesced WakeDigests (summaries, never raw transcripts); the journal stays small and diffable (transcripts and checkpoints are separate blobs); per-rung maxTurns bounds the worst-case cost of a failed ladder attempt; append is serialized per run, not globally.
  - Acceptance: journal-size and context-growth assertions in the adaptive cassettes; step-count linearity test (FR-200).
  - Meta: spec [06-execution-spec.md](06-execution-spec.md), "Execution model" and [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "Governing principle".

- **NFR-06 Compatibility window**
  - Requirement: The hashVersion support window MUST be [CURRENT-2, CURRENT] in core, with older profiles served by frozen @lurker/compat derivers; mixed-version journals MUST replay deterministically (compatibility lemma). The six SPI seams (ProviderAdapter; JournalStore+LeasableStore; TranscriptStore; ScriptRunner; ToolSource; IsolationProvider) freeze at 1.0 after the server/queue soak; ModelKnowledgeStore freezes post-1.0 with KB phase 1.
  - Acceptance: FR-021 fixtures; the M9 SPI audit gate; the support statement in [12-release-versioning.md](12-release-versioning.md), "Post-1.0 cadence" matches the window.
  - Meta: spec [03-journal-spec.md](03-journal-spec.md), "hashVersion"; markers DEF-6.

- **NFR-07 Security posture**
  - Requirement: The worker sandbox MUST be documented and treated as a determinism and blast-radius boundary, NOT a security boundary; hostile-code containment comes from executors (subprocess/container) and worktree isolation, and containment claims stay phrased as plans until the executor spec closes (FR-407, OQ). The permission chain is the single approval surface (FR-403). Advisory-only enforcement (network rules outside first-party fetch) MUST be labeled as such. ModelKnowledge influence channels are structurally broken (FR-606).
  - Acceptance: docs audit for posture wording; FR-404/FR-606 test suites.
  - Meta: spec [08-tools-permissions-spec.md](08-tools-permissions-spec.md), "Executors".

- **NFR-08 Documentation self-containment**
  - Requirement: The English docs/ set MUST be the single source of truth and fully self-contained: an implementer (human or LLM) MUST be able to build lurker from docs/ alone.
  - Acceptance: docs review gate: every normative statement is fully defined within docs/; the reading order in [README.md](README.md) covers every component.
  - Meta: source founder decision; spec [README.md](README.md), "Canon statement".

## 4 Not-in-v1 exclusions (EXC registry)

These exclusions are normative: no milestone task may smuggle them in ([10-implementation-plan.md](10-implementation-plan.md), "Not-in-v1 restatement").

| ID | Excluded from the first release | Note |
|---|---|---|
| EXC-01 | Continuous orchestrator monitoring | Orchestrator sleeps between event-driven wakes; token furnace rejected |
| EXC-02 | Whole-plan regeneration as a revision primitive | Revisions are typed diffs only (FR-302) |
| EXC-03 | A fourth orchestration mode | Exactly three modes exist (FR-221) |
| EXC-04 | allowChildSpawns (direct spawning by a worker node) | Nodes only propose decomposition; only the AdmissionController spawns (FR-306, FR-308) |
| EXC-05 | Vector store and cross-run memory | ModelKnowledge is the sole sanctioned exception, and it ships outside the v1 core (FR-600); LedgerExport JSON is the only outbound seam |
| EXC-06 | Runtime startTier promotion | v2 candidate: a pure compiled promotion table from kb_pinned bytes, eval-measured claims only (FR-607) |
| EXC-07 | Graph core and YAML/DAG as the execution core | TaskGraph JSON allowed only as an optional constrained planner target (FR-226) |
| EXC-08 | Checkpoint-everything snapshot resume | Rejected: permanent compatibility surface, O(n^2) writes, pins the workflow definition, defeats insert-one-call-costs-one |
| EXC-09 | Handoffs (and chat-room/blackboard topologies) | Call-and-return only (I3, FR-221) |
| EXC-10 | Engine-level strategy enums and review flags | manager_workers/debate/fanout_reduce/critic_review and requireReview/requireCritic/requireEvidence are prompt patterns, not runtime semantics (FR-222) |
| EXC-11 | Eval-confirmed auto-gate and corroboration threshold | v2 candidates; would require principal authentication and a fixed rate-capped sweep budget pool (FR-601, FR-605) |
| EXC-12 | Routing epsilon-exploration | Users would pay for deliberately worse routing; evidence still confounded; candidate set too small for bandit convergence |
| EXC-13 | QuickJS runner for third-party scripts | Future plugin behind the same ScriptRunner seam (FR-217) |
| EXC-14 | Distributed cross-process rate limiter | Documented queue-mode limitation (FR-703; OQ in [14-open-questions.md](14-open-questions.md)) |

## 5 Hypotheses

- **H-OrchShare Orchestrator spend share**
  - Statement: In fan-out runs, the median orchestrator-share lies in the 5-15 percent range and the p90 does not exceed 25 percent, where orchestrator-share = orchestratorSpentUsd / max(runSpentUsd, epsilon) with epsilon 0.01 (defaults table, [06-execution-spec.md](06-execution-spec.md), "Appendix A").
  - Status: hypothesis, not fact. The earlier claim "orchestrate/plan is 5-15 percent of run spend" was withdrawn as a fact and survives only as this dogfood telemetry hypothesis.
  - Verification: the distribution of the orchestrator-share metric (FR-505), p50/p90, sliced by spawn count, escalation frequency, and the price gap between the orchestrate model and worker models.
  - Consequences: the capFraction default 0.2 (FR-315) MUST be revisited against the measured p90; the "a strong orchestrator is almost free" claim may be restored in docs only if the hypothesis is confirmed.
  - Meta: spec [07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md), "Orchestrator budget"; markers DEF-7.

## 6 Traceability matrix

Milestones and versions per [10-implementation-plan.md](10-implementation-plan.md), "Milestone-version table". An FR listed at a milestone means the milestone's exit criteria include its acceptance criteria; FRs marked "(completes)" land partially earlier and finish there.

| Milestone | Version | Functional requirements landed | NFRs exercised |
|---|---|---|---|
| M0 | v0.1.0 | none (repo bootstrap, toolchain, L0 skeleton, docs canon, naming checklist) | NFR-01, NFR-08 groundwork |
| M1 | v0.2.0 | FR-022, FR-025, FR-100..FR-105, FR-108..FR-110, FR-121, FR-122, FR-200..FR-203, FR-205..FR-209, FR-211..FR-214, FR-217, FR-218, FR-225, FR-500..FR-502, FR-506, FR-509 | NFR-01, NFR-04 |
| M2 | v0.3.0 | FR-001..FR-018, FR-021, FR-023, FR-024, FR-026, FR-508 | NFR-02, NFR-03, NFR-05, NFR-06 |
| M3 | v0.4.0 | FR-019, FR-106, FR-227, FR-306 (status, report, hook), FR-400..FR-403, FR-406..FR-408 | NFR-07 |
| M4 | v0.5.0 | FR-111..FR-118, FR-120, FR-215 | NFR-03 |
| M5 | v0.6.0 | FR-020, FR-026 (completes: sqlite), FR-226, FR-404, FR-405, FR-503, FR-504, FR-507, FR-700, FR-701 | NFR-01, NFR-07 |
| M6 | v0.7.0 | FR-204, FR-210, FR-216, FR-219..FR-224, FR-300, FR-303, FR-308, FR-309, FR-316, FR-318 | NFR-05 |
| M7 | v0.8.0 | FR-119, FR-301, FR-302, FR-304, FR-305, FR-306 (completes), FR-307, FR-310..FR-315, FR-317, FR-503 (completes), FR-505 | NFR-02, NFR-04, NFR-05 |
| M8 | v0.9.0 | FR-702, FR-703 | NFR-06 (seam soak) |
| M9 | v1.0.0 | FR-107, FR-510, FR-511, FR-512 | NFR-06 (SPI freeze gate), NFR-02 (full cassette set) |
| M10 | v1.1.0 | FR-600..FR-603, FR-606 (channels 1-3, 8), FR-607, FR-704 (list) | NFR-01, NFR-07 |
| M11 | v1.2.0 | FR-604, FR-511 (completes: sweeps, canary), FR-704 (completes: sweep) | NFR-07 |
| M12 | unassigned, gated | FR-605, FR-606 (completes), FR-704 (completes: inbox) | NFR-07 |

Requirements with no single landing milestone (cross-cutting): NFR-01..NFR-08 hold continuously once first exercised; EXC-01..EXC-14 are enforced at every milestone review.





