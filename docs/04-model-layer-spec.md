# Model layer specification

Status: Ready for implementation
Version: 0.2.0-docs
Date: 2026-07-06

Purpose: normative specification of the L0 wire contract, the ProviderAdapter SPI, the first-class adapters on the July 2026 provider surfaces, canonical effort, the model router and invocation roles, role quality floors, pricing, RetryPolicy and failover under the journal, and the ModelLadder summary.

This document owns the FR-1xx requirement block (registry in 01-requirements.md, section "FR registry"). Delivery is spread across milestones (10-implementation-plan.md): the two first-class adapters and structured-output tiers land in M1 (v0.2.0), the openaiCompatible factory in M3 (v0.4.0), model layer completion (roles, HistoryProjector, failover, price table, canonical effort in identity, RetryPolicy, floors) in M4 (v0.5.0), and @lurker/bridge-ai-sdk in M9 (v1.0.0). Two earlier-draft details are reopened here as spec bugs against the July 2026 provider surfaces and are normative in their amended form: the canonical effort union is five levels, and refusal is a typed finish outcome rather than a null projection. Package references always use the @lurker/<name> form (naming risk note in 13-toolchain-repo.md, section "Naming risk note").

## 1 Wire contract (L0)

The wire contract is the single home of provider wire formats. Its shape deliberately follows the AI SDK language-model interface tradition: canonical messages made of ordered parts, one shared stream-event vocabulary, namespaced providerOptions on input and providerMetadata on output. Adapters MUST absorb all provider quirks invisibly to the core: pause_turn continuation, JSON tool-argument assembly, cacheHint compilation into cache breakpoints, usage normalization, refusal surfacing.

### 1.1 Messages and parts

```ts
export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Msg {
  role: Role;
  parts: Part[];
}

export type CanonicalId = string; // engine-minted ULID, see 1.2

export type Part =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: string; data: Uint8Array | string /* base64 or URL */ }
  | { type: 'tool-call'; id: CanonicalId; name: string; args: unknown }
  | { type: 'tool-result'; id: CanonicalId; name: string; result: unknown; isError?: boolean }
  | { type: 'provider-raw'; provider: string; block: unknown };
```

Rules:

- Parts are ordered; adapters MUST preserve part order in both directions.
- `provider-raw` parts carry opaque provider blocks that must survive round trips: Anthropic thinking blocks with signatures, OpenAI reasoning items (including `encrypted_content`), server-side compaction blocks and items (section 13). Retention is unconditional: provider-raw parts are stored in the canonical history always. Dropping happens only in projection (section 2.3), never in retention.
- Tool results are `tool` role messages whose parts reference the originating tool-call by CanonicalId.

### 1.2 Canonical tool-call ids

The library, not the provider, mints tool-call ids. CanonicalId is an engine-minted ULID. Each adapter MUST maintain a bijective map between canonical ids and wire ids (`toolu_*` on Anthropic, `call_*` on OpenAI) in both directions for the lifetime of a canonical history. Cross-provider id-format mismatch is thereby resolved by construction: the canonical history never contains a wire id, and a projection to any target provider re-derives that provider's wire ids from the map. The map is part of the projection state owned by HistoryProjector (section 2.3), not part of journal identity.

### 1.3 ChatRequest

Two L0 aliases consumed across the whole set are declared here once:

```ts
/** A JSON Schema document (draft 2020-12) as plain JSON data. Canonical
    serialization and hashing rules live with the KeyDeriver
    (03-journal-spec.md, section "hashVersion (DEF-6)"). */
export type JsonSchema = { [key: string]: unknown };

/** The identity-bearing tool contract: exactly what the model sees and exactly
    what toolsetHash hashes. Never contains execute or any closure. Derived from
    a ToolDef by dropping every non-contract field
    (08-tools-permissions-spec.md, section "Tool definition"). */
export interface ToolContract {
  name: string;
  description: string;
  parameters: JsonSchema;   // canonical JSON Schema projection of the tool's SchemaSpec
  version?: string;         // opaque semantic-change signal; participates as absent when absent
}
```

```ts
export interface ChatRequest {
  model: string;                    // wire model id (the segment after 'adapterId:' in ModelRef)
  messages: Msg[];                  // system messages are Msg entries with role 'system'
  tools?: ToolContract[];           // identity quadruple: name, description, parameters, version (08-tools-permissions-spec.md)
  toolChoice?: 'auto' | 'none' | 'required' | { name: string };
  schema?: JsonSchema;              // structured-output target; tier already chosen by the router (section 8.4)
  effort?: Effort;                  // canonical effort, already resolved and scrubbed by the router (section 3)
  maxOutputTokens?: number;
  stopSequences?: string[];
  cacheHint?: CacheHint;            // section 1.7
  providerOptions?: Record<string, Record<string, unknown>>; // namespaced by adapter id, section 1.8
}
```

Sampling parameters (temperature, top_p, top_k) are deliberately absent from ChatRequest's first-class surface: both first-class providers reject them on current reasoning models (section 4.1, section 5.1). Where a target legitimately supports them (openaiCompatible gateways, older models), they travel through the adapter's providerOptions namespace and are subject to caps scrubbing (section 8.4).

### 1.4 ChatEvent stream

`ProviderAdapter.stream` yields a single canonical event vocabulary:

```ts
export type ChatEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'reasoning-delta'; text: string }                       // summaries or visible reasoning text
  | { type: 'tool-call-start'; id: CanonicalId; name: string }
  | { type: 'tool-call-delta'; id: CanonicalId; argsTextDelta: string }
  | { type: 'tool-call-end'; id: CanonicalId; args: unknown }       // adapter has assembled and parsed JSON args
  | { type: 'usage'; usage: Partial<Usage> }                        // incremental; MAY repeat
  | { type: 'finish'; finish: FinishInfo; usage: Usage; providerMetadata?: Record<string, unknown> }
  | { type: 'error'; error: WireError };
```

`WireError` is the JSON-serializable error projection `{ code, message, retryable, data? }` defined in 02-architecture.md, section "Error taxonomy". Adapters MUST emit exactly one terminal event per stream (`finish` or `error`).

### 1.5 Finish outcomes and typed refusal

```ts
export type FinishInfo =
  | { reason: 'stop' }
  | { reason: 'tool-calls' }
  | { reason: 'max-tokens' }
  | { reason: 'context-window-exceeded' }
  | { reason: 'refusal'; refusal: RefusalInfo };

export interface RefusalInfo {
  provider: string;                 // adapter id
  stopDetails?: {                   // provider stop details, passed through when available
    type?: string;
    category?: string;              // e.g. Anthropic stop_details.category
    explanation?: string;
  };
}
```

This supersedes the earlier refusal-to-null behavior (reopened spec bug): Anthropic refusals now carry a structured `stop_details` object and an opt-in server-side fallback mechanism, and discarding that information would blind ladders, escalation and evals. A refusal MUST surface as a typed finish outcome carrying the provider stop details; it MUST NOT be projected to a null output silently. The Agent Runtime maps a refusal finish to `AgentError` kind `'terminal'` with the refusal details attached (06-execution-spec.md, section "Agent Runtime binding").

### 1.6 Usage invariant

```ts
export type Usage = {
  inputTokens: number;              // FULL prompt, including cache reads and cache writes
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens?: number;
};
```

The Usage invariant: `inputTokens` is the full prompt size including cached tokens. Adapters MUST normalize provider-reported usage to satisfy this invariant, and the core verifies it at the adapter boundary. When a stream is aborted at the budget ceiling, delta-accumulated usage is written with `usageApprox: true` (06-execution-spec.md, section "Three-layer budget").

### 1.7 cacheHint

```ts
export type CacheTtl = '5m' | '1h';

export interface CacheHint {
  // Desired cache boundaries, ordered from shallowest to deepest prefix.
  breakpoints: Array<{
    after: 'tools' | 'system' | { messageIndex: number };
    ttl?: CacheTtl;                 // default '5m'
  }>;
}
```

cacheHint is a provider-neutral declaration of intended prompt-cache boundaries. Adapters compile it best-effort:

- @lurker/anthropic compiles breakpoints into `cache_control` blocks (section 4.4). When the hint exceeds the provider's breakpoint cap, the adapter MUST keep the deepest breakpoints and drop the shallowest, deterministically.
- @lurker/openai treats cacheHint as a no-op: Responses prompt caching is implicit prefix caching.
- Adapters for providers without caching MUST ignore the hint silently.

cacheHint is a transport-level cost optimization: it MUST NOT enter IdentityInput and MUST NOT change response semantics (see 03-journal-spec.md, section "Identity model" for the exclusion list).

### 1.8 providerOptions and providerMetadata namespacing

`providerOptions` on ChatRequest is namespaced by adapter id: `{ anthropic: {...}, openai: {...}, ollama: {...} }`. An adapter MUST read only its own namespace and MUST ignore unknown namespaces without error. Symmetrically, adapters report provider-specific response facts under their own namespace in `providerMetadata` on the finish event (for example, the matched stop sequence, response ids, service tier). Namespaced options are escape hatches: canonical fields always win where both express the same thing, and adapters MUST NOT let a namespaced option silently contradict a canonical field (typed ConfigError instead).

The engine additionally populates one reserved namespace, `lurker`, on every request with spawn telemetry `{ agentType?: string, label?: string }`. It is telemetry, not configuration: adapters MAY consume it (FakeAdapter's agentType and label pattern matching, 09-observability-testing-spec.md, section "Tier 1"), MUST otherwise ignore it, and like every providerOptions namespace it never enters journal identity. (Amended during M1-T14: the FakeAdapter contract requires call metadata at the adapter boundary.)

## 2 ProviderAdapter SPI

### 2.1 Interface

```ts
export interface ProviderAdapter {
  id: string;                                   // stable adapter id; left segment of ModelRef
  provider?: string;                            // provider family for provider-raw matching; default = id (committed during M4-T02)
  caps(model: string): ModelCaps;
  refreshCaps?(): Promise<void>;                // refresh capability table from live model lists
  stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent>;
  countTokens?(req: ChatRequest): Promise<number>;
}

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export type ModelCaps = {
  structuredOutput: 'native' | 'forced-tool' | 'prompt';
  supportsTemperature: boolean;
  supportsParallelTools: boolean;
  reasoningEfforts: Effort[];                   // canonical efforts this model accepts after mapping
  contextWindow: number;
  maxOutputTokens: number;
  pricing?: Pricing;                            // adapter-reported fallback only; section 10
};
```

ProviderAdapter is one of the six SPI seams frozen at 1.0 (02-architecture.md, section "SPI seams and the 1.0 freeze").

### 2.2 Retries belong to the core

Provider SDK autoretries MUST be disabled (`max_retries: 0` or equivalent client option). The core owns retries, backoff and wall-clock via RetryPolicy (section 11); adapters surface `retry-after` and rate-limit headers as typed, retryable WireErrors with `retryAfterMs` and never sleep internally. Rationale: SDK-internal retries are invisible to the journal, the budget ledger and UsageLimits timeouts.

### 2.3 Provider-raw retention and HistoryProjector

HistoryProjector projects the canonical history into the wire view of a specific target model. It owns the canonical-id maps (section 1.2) and the provider-raw projection rule:

- provider-raw parts are retained in canonical history unconditionally (section 1.1);
- on projection, a provider-raw part is included if and only if the target model's provider matches the part's `provider` field. Matching is at provider granularity, not model granularity: the adapter MUST send retained thinking blocks and reasoning items to any model of the same provider and let the server handle cross-model drops. Client-side per-model stripping is forbidden for Anthropic targets because it risks 400 ordering and signature errors; the Anthropic API itself silently drops mismatched-model thinking blocks unbilled. (Reopened nuance against the earlier drop-unless-model-matches phrasing.)
- provider-raw parts of a different provider are omitted from the projection (and only from the projection).

Retention transport (committed during M4-T02): the adapter ships the turn's blocks-to-retain in stream order via `finish.providerMetadata[<adapter id>].retainedParts: unknown[]` (the namespace follows section 1.8; the openai `outputItems` diagnostic is unaffected). The Agent Runtime lifts each into a `provider-raw` part tagged with the adapter's PROVIDER name (`ProviderAdapter.provider`, default = id) and prepends them at the HEAD of the turn's canonical assistant message: on both first-class providers the retained blocks (thinking blocks, reasoning items) precede the turn's text and tool calls, and head placement reproduces that order on re-projection. Adapters whose dialect retains nothing (chat-completions, section 5.6) simply never ship the key.

The provider-family tag is `ProviderAdapter.provider`, not the adapter id: two adapters of the same family (for example a differently-keyed second `openaiCompatible` gateway) MUST share retained blocks and projections, and a custom adapter id never splits the family. Matching in the projection rule above compares the part's `provider` field against the target adapter's provider.

HistoryProjector is what makes per-role provider mixing inside one agent correct: the loop turns can run on one provider while extract or finalize runs on another, each seeing a valid wire history. The Agent Runtime binds the projector into the turn loop (06-execution-spec.md, section "Agent Runtime binding") and projects EVERY outgoing request, loop turns included: a checkpointed or failover-mixed history stays valid on any target. The canonical-id maps stay adapter-instance state (bijective for the adapter's lifetime, which covers every canonical history it serves); the projector owns the projection rule and the retention lift.

## 3 Canonical effort

### 3.1 Five levels

Canonical effort is exactly five levels:

```ts
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
```

This extends the earlier four-level set (reopened spec bug): as of July 2026 both first-class providers ship `xhigh` and both recommend it for agentic and coding work, which is exactly the workload lurker targets. OpenAI additionally ships `none`, which has no canonical equivalent and is reachable only via the adapter's providerOptions namespace (section 3.3).

### 3.2 Effort in identity (DEF-6)

Effort is part of the requested modelSpec identity and therefore part of the journal entry content key. This is the reason the hash-v2 identity profile exists: canonical effort ships in the same release as the hashVersion mechanism, atomically (DEF-6; 03-journal-spec.md, section "hashVersion").

Legacy interplay, normative (DEF-6):

- The hash-v1 predicate is effort-insensitive by construction: the v1 KeyDeriver projection removes effort from the requested modelSpec, so changing role effort defaults between releases can never miss a paid v1 prefix.
- The fold default `effort: 'medium'` for legacy v1 entries applies only in derived reads (pricing, ladder statistics, digests, budget folds) and never in matching.

### 3.3 Per-adapter effort mapping

The identity always records the requested canonical effort. Adapters map canonical effort to the wire at projection time:

| Canonical | @lurker/anthropic (`output_config.effort`) | @lurker/openai (`reasoning.effort`) |
|-----------|--------------------------------------------|--------------------------------------|
| low       | low                                        | low                                  |
| medium    | medium                                     | medium                               |
| high      | high                                       | high                                 |
| xhigh     | xhigh                                      | xhigh                                |
| max       | max (passthrough)                          | xhigh (documented lossy downmap)     |

- OpenAI has no `max`; canonical `max` maps to wire `xhigh` and the downmap is recorded in `providerMetadata`. Identity keeps the requested `max`.
- OpenAI `none` is NOT canonical. It is reachable only as `providerOptions.openai.reasoningEffort: 'none'`; the canonical effort field never carries it.
- Provider defaults when no effort is resolved: Anthropic defaults to high, OpenAI (gpt-5.5) defaults to medium. The router's role effort defaults (section 8.3) normally resolve an explicit value first.

### 3.4 Visible scrub

If the resolved effort is not in `caps.reasoningEfforts` for the target model, the router scrubs it visibly: the request proceeds without the unsupported effort, a warning-level WorkflowEvent is emitted (09-observability-testing-spec.md, section "Event stream"), and the scrub MUST NOT be silently translated into `max_tokens` or any other parameter. Identity keeps the requested effort, so replay is stable regardless of scrubbing.

## 4 @lurker/anthropic

Adapter over `@anthropic-ai/sdk`, specified against the July 2026 Messages API surface. Current models referenced below: Fable 5, Opus 4.8, Opus 4.7, Sonnet 5 (and the older Opus 4.6 and Sonnet 4.6 where noted).

### 4.1 Thinking and sampling parameters

- Current models accept only adaptive thinking: `thinking: { type: 'adaptive' }`. The adapter MUST NOT send `{ type: 'enabled', budget_tokens: N }` to current models (400; the form remains functional only on Opus 4.6 and Sonnet 4.6, driven by caps).
- Explicit `{ type: 'disabled' }` is a 400 on Fable 5; the adapter omits the thinking field instead. Thinking is always on for such models.
- `temperature`, `top_p` and `top_k` are REMOVED on current models: sending them is a 400, not a warning. `caps.supportsTemperature` MUST be false for these models and the router scrubs accordingly (section 8.4).
- `thinking.display` defaults to `'omitted'` on Opus 4.7+, Sonnet 5 and Fable 5. The adapter sets `display: 'summarized'` when the engine wants reasoning-delta events; raw CoT is never available.

### 4.2 output_config

`output_config` is the umbrella wire object: `{ effort, format, task_budget }`.

- `effort`: canonical effort passthrough including `max` (section 3.3). GA, no beta header, provider default high.
- `format`: structured outputs, section 4.3.
- `task_budget`: passthrough via providerOptions when hosts want it; the engine's own budget layers are authoritative for spend (06-execution-spec.md, section "Three-layer budget").

### 4.3 Structured outputs and strict tools

- Native tier: `output_config.format = { type: 'json_schema', schema }` (the old top-level `output_format` is deprecated API-wide and MUST NOT be used).
- Strict tool use: `strict: true` as a top-level field on the tool definition, never on `tool_choice`. Strict schemas require `additionalProperties: false` and full `required` listing.
- Provider constraints the adapter MUST respect (and the router's tier selection must know): no recursive schemas, no numeric or string min-max constraints, incompatible with citations (400), incompatible with assistant prefill.
- Assistant-turn prefill returns 400 on all 4.6+ models: any prefill-based JSON-forcing tier is dead on current Anthropic models. The forced-tool tier remains valid for older or weaker models. The router therefore selects among native json_schema, forced-tool and prompt tiers from caps, never prefill (section 8.4).

### 4.4 Prompt caching

The adapter compiles cacheHint (section 1.7) into `cache_control`:

- `{ type: 'ephemeral' }` is the 5-minute TTL (write premium 1.25x); `{ type: 'ephemeral', ttl: '1h' }` is the 1-hour TTL (write premium 2x); cache reads are about 0.1x.
- At most 4 breakpoints per request; render order is tools, then system, then messages; invalidation is prefix-match.
- The minimum cacheable prefix is model-dependent (1024-4096 tokens; for example 4096 on Opus 4.8, 2048 on Fable 5 and Sonnet 4.6). Shorter prefixes silently do not cache; the adapter SHOULD surface a debug-level event when a requested breakpoint cannot cache, never an error.
- Effectiveness is verified from `usage.cache_creation_input_tokens` and `usage.cache_read_input_tokens`, normalized into `Usage.cacheWriteTokens` and `Usage.cacheReadTokens` under the Usage invariant (section 1.6).
- The 20-content-block lookback window and the `max_tokens: 0` pre-warm pattern are implementation notes for the adapter, not core semantics.

### 4.5 Thinking-block retention

Thinking blocks with signatures are stored as provider-raw parts unconditionally and MUST be echoed byte-exact back to Anthropic targets (stripping them can 400 with ordering or signature errors). Projection is at provider granularity: retained blocks are sent to any Anthropic model; the server silently drops cross-model blocks unbilled. No client-side stripping (section 2.3).

### 4.6 pause_turn

When a server-side tool loop hits its iteration limit, the response ends with `stop_reason: 'pause_turn'`. The adapter absorbs it: it appends the partial assistant content and re-sends, WITHOUT injecting a synthetic user "Continue" message, and caps continuations (`pauseTurnMaxContinuations`, default 5; listed in 06-execution-spec.md, Appendix A). pause_turn never surfaces as a canonical finish.

### 4.7 Stop-reason mapping

| Anthropic stop_reason           | Canonical outcome                                              |
|---------------------------------|----------------------------------------------------------------|
| end_turn                        | finish `stop`                                                  |
| tool_use                        | finish `tool-calls`                                            |
| max_tokens                      | finish `max-tokens`                                            |
| stop_sequence                   | finish `stop` (matched sequence in providerMetadata)           |
| pause_turn                      | not surfaced; adapter continues internally (section 4.6)       |
| refusal                         | finish `refusal` with stopDetails (type, category, explanation)|
| model_context_window_exceeded   | finish `context-window-exceeded`                               |

`stop_details` is null for non-refusal stop reasons. The Fable 5 server-side fallback beta (`server-side-fallback-2026-06-01`), which re-serves refused requests on a fallback model, is NOT used by the adapter in v1: failover is owned by the core (section 11) so that servedBy attribution and the journal stay truthful.

### 4.8 Token counting and refreshCaps

- `countTokens` maps to `POST /v1/messages/count_tokens` (model, messages, system, tools; returns input_tokens; stateless).
- `refreshCaps` reads the capabilities-bearing `GET /v1/models` (paginated, `after_id`/`before_id` cursors) and `GET /v1/models/{id}`: each model object carries `max_input_tokens` (mapped to `contextWindow`), `max_tokens` (mapped to `maxOutputTokens`) and a `capabilities` tree with supported true/false leaves (thinking types including adaptive, effort levels including xhigh and max, structured_outputs, image_input, context_management). There is no `context_window` field on the wire; the adapter maps names explicitly.

### 4.9 Rate limits and retryable errors

- 429 `rate_limit_error` carries `retry-after` (seconds) plus `x-ratelimit-limit-*` and `x-ratelimit-remaining-*` headers for RPM/ITPM/OTPM buckets. The adapter surfaces `retryAfterMs` and the bucket headers on the WireError; RetryPolicy honors them (section 11).
- 529 `overloaded_error` is a distinct retryable class alongside 500 `api_error`.
- SDK autoretries are disabled with `max_retries: 0` (section 2.2).

## 5 @lurker/openai

Adapter for the OpenAI Responses API. Chat Completions is a degraded path (section 5.6). Current models referenced below: gpt-5.5, gpt-5.5-pro, gpt-5.4, gpt-5.4-mini.

### 5.1 Manual item replay only

The Responses API offers three state modes; only manual item replay is compatible with content-addressed journal determinism:

- The adapter MUST send `store: false` plus `include: ['reasoning.encrypted_content']` and replay prior output items from the canonical history itself.
- Reasoning items are first-class output items retained as provider-raw parts; between function calls they MUST be passed back verbatim with the last function_call (id plus summary alone are insufficient; `encrypted_content` must be echoed byte-exact). OpenAI decrypts in memory and never persists.
- `previous_response_id` and the Conversations API are REJECTED: they place conversation state server-side, outside the journal, and break replay identity. The adapter MUST NOT use them; a providerOptions attempt to enable them is a typed ConfigError.
- Top-level `instructions` replaces the system message and is not carried by any server state; the adapter projects role `system` messages into `instructions` on every request.
- Any auxiliary state parameters that current model docs require preserving across manual-state requests (for example the gpt-5.5 `phase` parameter) MUST be retained verbatim as provider-raw and echoed; verification of this surface is tracked as OQ-29 in 14-open-questions.md.
- OpenAI reasoning models reject non-default sampling parameters; `caps.supportsTemperature` is false for them and the router scrubs (section 8.4).

### 5.2 Tools: flattened form and strict semantics

- Function tools are flattened: top-level `type: 'function'`, `name`, `parameters`, `strict`. There is no nested `{ type, function: {...} }` wrapper.
- The conversation is typed items: function calls arrive as `function_call` output items and results return as `function_call_output` items linked by `call_id` (`call_*` ids), mapped bijectively to CanonicalId (section 1.2).
- Strict semantics: when `strict` is omitted, Responses attempts strict mode and silently falls back to best-effort for incompatible schemas. The adapter MUST NOT rely on that: for the native tier it sends explicit `strict: true` (incompatible schemas are then a loud 400) and the router selects a lower tier when the projected schema is not strict-compatible. Explicit `strict: false` is sent only when the router has deliberately chosen non-strict.
- Strict schemas require `additionalProperties: false` on every object and all properties listed in `required`; optional fields are expressed via `type: [..., 'null']`.

### 5.3 Structured output

The native tier uses `text.format = { type: 'json_schema', name, schema, strict: true }` (moved from Chat Completions' `response_format`). `text.verbosity` (low/medium/high) is available as a providerOptions passthrough, never canonical.

### 5.4 Streaming event mapping

Responses streaming is typed semantic SSE, not delta-patched chunks. Canonical mapping:

| Responses SSE event                                   | ChatEvent                                            |
|-------------------------------------------------------|------------------------------------------------------|
| response.created / response.in_progress               | none (internal)                                      |
| response.output_item.added (item type function_call)  | tool-call-start                                      |
| response.function_call_arguments.delta                | tool-call-delta                                      |
| response.function_call_arguments.done / output_item.done (function_call) | tool-call-end                     |
| response.output_text.delta                            | text-delta                                           |
| response.output_text.done                             | none (aggregate integrity check)                     |
| response.content_part.added / done                    | none (internal assembly)                             |
| response.reasoning_summary_part.added / done          | none (internal assembly)                             |
| response.reasoning_summary_text.delta                 | reasoning-delta                                      |
| response.reasoning_text.delta                         | reasoning-delta                                      |
| response.completed                                    | usage, then finish                                   |
| response.incomplete                                   | finish (max-tokens or context-window-exceeded per incomplete_details) |
| response.failed                                       | error                                                |
| error                                                 | error                                                |

`output_text` is a convenience aggregate; the adapter builds canonical parts from the typed output array, never from the aggregate.

### 5.5 Effort mapping

`reasoning.effort` accepts none, low, medium, high, xhigh (default medium on gpt-5.5). Canonical mapping per section 3.3: canonical `max` downmaps to `xhigh`; `none` only via `providerOptions.openai`. Cost at xhigh can run 3-5x the same request at low; pricing attribution uses normalized Usage and the versioned price table (section 10).

### 5.6 Chat Completions degraded path

The adapter MAY serve models unavailable on Responses through Chat Completions, with documented degradations: delta-patched chunk assembly instead of typed SSE; no reasoning item replay (reasoning quality and cache efficiency degrade across tool calls); tools remain non-strict by default (a real behavioral asymmetry the adapter compensates for by sending explicit `strict` where supported); `response_format` instead of `text.format`. The openaiCompatible factory (section 6) speaks this dialect by construction. Degraded-path selection is a caps fact, visible in events, never silent.

## 6 openaiCompatible factory

```ts
export function openaiCompatible(cfg: {
  id: string;                       // explicit adapter id, e.g. 'ollama', 'vllm', 'openrouter'
  baseURL: string;
  apiKey?: string;
  caps?: (model: string) => ModelCaps | Partial<ModelCaps>;
}): ProviderAdapter;
```

Contract:

- `id` is mandatory and explicit; several openai-compatible endpoints coexist through distinct ids. A duplicate adapterId at createEngine is a typed ConfigError (02-architecture.md, section "Error taxonomy").
- The factory speaks the Chat Completions dialect (section 5.6). Gateways cannot be introspected reliably, so when `caps` is not supplied the factory assumes the most conservative capability set: `structuredOutput: 'prompt'`, `supportsTemperature: true`, `supportsParallelTools: false`, empty `reasoningEfforts`, no pricing. Callers SHOULD supply caps for anything beyond that.
- Absent pricing is legitimate for local models (Ollama, vLLM): such models surface as unpriced in CostReport (section 10) and ladder rungs on them omit `maxCostUsd` (section 12).
- Targets include Ollama, vLLM, Mistral, OpenRouter and arbitrary gateways.

## 7 @lurker/bridge-ai-sdk

Wraps any Vercel AI SDK `LanguageModelV4` into a ProviderAdapter for the long tail of providers (Google, Bedrock, Vertex) without coupling the core to the ai-sdk release cycle.

- Target interface: `LanguageModelV4` from `@ai-sdk/provider` ^4 (the V2 target named in the archived design is superseded; the ecosystem churned V2 to V3 to V4 within roughly 18 months).
- The bridge MUST check `specificationVersion === 'V4'` at runtime and fail with a typed ConfigError on mismatch, so a transitive provider-package major cannot mis-wire silently.
- This is documented as the highest-churn package in the set and the likely driver of pre-1.0 BREAKING minors; it ships in M9 (10-implementation-plan.md). Toolchain pin rationale in 13-toolchain-repo.md, section "Committed toolchain".

## 8 Router and resolution chain

### 8.1 Registry and ModelRef

```ts
export type ModelRef = `${string}:${string}`;   // strictly 'adapterId:model', no query parameters
export type InvocationRole = 'orchestrate' | 'plan' | 'loop' | 'finalize' | 'extract' | 'summarize';
```

The adapter registry is strictly per-engine; no global mutable registry exists (createEngine options in 06-execution-spec.md, section "Engine and ops API"). baseURL and keys are fixed at adapter construction.

The author-facing model selection type and its identity-facing canonical form are declared here once; every other doc references these declarations (06-execution-spec.md consumes ModelSpec, 03-journal-spec.md consumes CanonicalModelSpec).

```ts
/** What authors write wherever a model is configurable: a call override,
    an agent profile, a workflow default, or an engine default. */
export type ModelSpec =
  | ModelRef                     // shorthand for { model: ModelRef }
  | ModelChoice
  | { ladder: LadderSpec };      // laddered execution (section 12; runtime semantics in 07)

export interface ModelChoice {
  model: ModelRef;
  effort?: Effort;                                            // absent: resolved by the chain, including role effort defaults (section 8.3)
  providerOptions?: Record<string, Record<string, unknown>>;  // namespaced by adapter id (section 1.8)
  fallbacks?: ModelRef[];                                     // transport-failure failover list (section 11)
}

/** Identity-facing canonical form of a RESOLVED model request; the value that
    enters AgentIdentityInput.modelSpec (03-journal-spec.md, section "Identity model").
    `effort` is absent exactly when no layer of the chain and no role effort
    default resolves one (amended during M1-T05; see the canonicalization rules). */
export type CanonicalModelSpec =
  | { kind: 'model'; model: ModelRef; effort?: Effort }
  | { kind: 'ladder'; ladder: CanonicalLadderSpec };

/** LadderSpec after canonicalization: every rung's effort resolved to an explicit value. */
export interface CanonicalLadderSpec {
  rungs: Array<{ model: ModelRef; effort: Effort; maxTurns: number; maxTokens: number; maxCostUsd?: number; memoizeOutcome?: boolean }>;
  startTier: number;             // after clamping of any orchestrator model_hint (07-adaptive-orchestration-spec.md)
  escalateOn: TriggerClass[];
  acceptance?: Gate[];
}
```

Canonicalization rules (normative; these feed the frozen hash-v2 identity fixtures):

- The router produces CanonicalModelSpec at dispatch from the RESOLVED ModelSpec of the resolution chain (section 8.2). Identity records the requested spec; failover changes only `servedBy` (section 11).
- `effort` is explicit wherever the chain or a role effort default (section 8.3) resolves one. The four role defaults cover orchestrate, plan, summarize, and extract; a loop- or finalize-role invocation whose chain resolves no effort canonicalizes with the `effort` member ABSENT (JCS omits absent members), and the wire request omits effort so the provider default applies (section 3.3). The engine never invents an effort value (Appendix A rule in 06-execution-spec.md). The hash-v1 predicate strips effort; the fold default for legacy entries is `'medium'` (section 3.2). (Amended during M1-T05: the original line claimed effort is explicit at every site, which is unsatisfiable for roles without a default when no layer resolves one.)
- At the call layer, `AgentOpts.effort` and `AgentOpts.model` contribute to the same merge layer; when `AgentOpts.model` is a ModelChoice carrying `effort`, the explicit `AgentOpts.effort` field wins.
- A bare `ModelRef` canonicalizes as `{ kind: 'model' }` with the resolved effort. A ladder canonicalizes as `{ kind: 'ladder' }` embedding the declared LadderSpec with explicit efforts; each rung ATTEMPT then spawns its own agent scope whose CanonicalModelSpec is that rung's `{ kind: 'model' }` form (section 12).
- `providerOptions` and `fallbacks` NEVER enter CanonicalModelSpec: they are delivery options, excluded from identity exactly like label, phase, onError, retry, and replay (03-journal-spec.md, section "Identity model"). A caller that needs identity separation for a providerOptions change uses `opts.key`.

### 8.2 Resolution chain

Resolution runs on every model invocation, not once per agent: a layered merge of `{ model, effort, providerOptions, fallbacks }` in the order

1. call override,
2. agent profile (agentType),
3. workflow defaults,
4. engine defaults,

with the invocation role attached as a tag. `AgentOpts.model` overrides all roles at once; `AgentOpts.routing` overrides per-role and takes priority over `profile.routing`.

### 8.3 Invocation roles and firing protocol

Six roles with a defined firing protocol; the orchestrating LLM resolves through the same chain.

| Role        | Fires                                                                                                                                                     |
|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| loop        | Every turn while tools are available to the model.                                                                                                          |
| extract     | A separate final structured-output invocation only when a schema is set AND (routing sends extract to a different model OR the current model's caps cannot serve the required tier); otherwise the schema rides the last loop turn with no extra call. |
| finalize    | Only if set in routing: after tools stop, one synthesis invocation with toolChoice `'none'` over the full transcript.                                       |
| summarize   | At the compaction threshold, and for `ctx.brief` (06-execution-spec.md).                                                                                |
| plan        | The planner model in mode (b).                                                                                                                              |
| orchestrate | The orchestrator agent in mode (c), resolved by the same chain.                                                                                             |

Role effort defaults: orchestrate and plan default to `high`; summarize and extract default to `low`. These are router defaults under the resolution chain, changeable without journal impact on paid prefixes (section 3.2).

### 8.4 Caps scrubbing and structured-output tier selection

After resolution the router reads ModelCaps and:

- selects the structured-output tier: `native` json_schema, `forced-tool`, or `prompt` (prefill is not a tier; section 4.3);
- scrubs illegal parameters visibly with a warning event. On current Anthropic models temperature is a 400, not a warning, and both providers reject sampling parameters on reasoning models, so scrubbing is a correctness requirement on both, not a courtesy;
- scrubs unsupported effort per section 3.4;
- applies fallbacks on transport-class failures (section 11).

Required tier and ride-ability (committed during M4-T01; this makes the extract row of section 8.3 operational):

- The REQUIRED tier for a schema on a model is the tier selection of this section applied to that model's caps: the `caps.structuredOutput` ceiling, with `native` degrading to `forced-tool` for strict-incompatible schemas.
- A tier can RIDE the last loop turn only if it coexists with tool availability. `native` and `prompt` do. `forced-tool` pins `toolChoice` to the synthesized `emit_result` contract and therefore CANNOT ride a turn on which the agent's tools must remain available; with a non-empty toolset and a `forced-tool` required tier, the separate extract invocation fires even when extract routing resolves to the loop model. For an agent with no tools every tier rides (the M1 behavior, unchanged).
- Finalize and schema: when finalize is configured in routing AND a schema is set, the schema rides neither the loop nor the synthesis turn; the structured output always comes from the separate extract invocation, running over the full transcript INCLUDING the synthesis. Riding the loop turn would put the JSON mid-transcript before the synthesis; riding the synthesis would collapse finalize into extract.
- Finalize fires only after tools stop: for agents whose toolset is non-empty and whose loop ended without an abort. A no-tools agent's single loop turn is already its synthesis; finalize never fires there even when routed.
- `toolChoice: 'none'` with tools defined maps to the provider's explicit none choice (`tool_choice { type: 'none' }` on Anthropic, `'none'` on OpenAI) with the tools param PRESENT: both providers reject tool-use history without tool definitions, so any request whose projected history contains tool blocks MUST carry the tool contracts. The finalize invocation and a separate extract invocation over a tool-bearing transcript therefore send the agent's contracts (extract's `forced-tool` tier appends `emit_result` and pins `toolChoice` to it; the other tiers pin `'none'`).

Per-provider concurrency keys and Retry-After-honoring retries live next to the router; the scheduler integration is specified in 06-execution-spec.md, section "Scheduler".

## 9 Role quality floors

Weak model defaults are forbidden for code-edit, synthesis, judge, plan and orchestrate work. Floors are hard router constraints: no advice, including ModelKnowledge (05-model-knowledge-spec.md), may override or weaken them.

Mechanism (committed ruling):

```ts
export interface QualityFloors {
  byRole?: Partial<Record<InvocationRole, ModelListConstraint>>;
  byTaskClass?: Partial<Record<TaskClass, ModelListConstraint>>;  // optional, bridges the KB vocabulary
}
export type ModelListConstraint = { allow?: ModelRef[]; deny?: ModelRef[] };
```

- Floors are per-role (and optionally per-declared-taskClass) explicit model allowlists and denylists supplied in engine config.
- No implicit cross-adapter quality ordering exists or is ever computed; the constraint is always an explicit list.
- `taskClass` is an optional AgentProfile field bridging the ModelKnowledge vocabulary (05-model-knowledge-spec.md, section "Data model"); default unclassified, in which case only `byRole` floors apply.
- Named strong default models for orchestrate and plan live only in the umbrella `lurker` package config, never in @lurker/core. The core ships the floor mechanism; the umbrella ships opinions.
- A floor violation at resolution is a typed ConfigError before any live call.

## 10 Pricing

```ts
export interface Pricing {
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
  cacheReadUsdPerMTok?: number;
  cacheWriteUsdPerMTok?: number;        // 5m write premium rate
  cacheWrite1hUsdPerMTok?: number;      // 1h write premium rate where the provider distinguishes
}

export interface PriceTable {
  pricingVersion: string;               // monotonic
  models: Record<ModelRef, Pricing>;
}
```

Rules:

- The registry's versioned price table wins over `caps.pricing`; adapter-reported pricing is a fallback only.
- `pricingVersion` is a monotonic string recorded in decision entries so that replayed cost attribution is stable (03-journal-spec.md, section "JournalEntry form").
- Unpriced models are surfaced in CostReport as unpriced, never as a silent zero (09-observability-testing-spec.md, section "CostReport").
- Usage is normalized by the adapter (section 1.6); dollars are computed from normalized usage against the price table.
- `refreshCaps()` refreshes the capability table from live model lists (section 4.8 for Anthropic); price table updates are registry updates with a pricingVersion bump, not a caps refresh side effect.

## 11 RetryPolicy and failover under the journal

### 11.1 RetryPolicy

```ts
export interface RetryPolicy {
  attempts: number;
  backoff: { initialMs: number; factor: number; maxMs: number; jitter?: boolean };
  retryOn?: Array<'transport' | 'rate-limit' | 'overloaded'>;
}
```

RetryPolicy lives UNDER the journal: a retried-then-successful call is exactly one journal entry, and transport retries do not count as lineage attempts (DEF-3; 03-journal-spec.md, section "Lineage"). Backoff MUST honor `retryAfterMs` when the provider supplied it (section 4.9). Defaults are recorded in 06-execution-spec.md, Appendix A.

### 11.2 Failover keyed on the requested modelSpec

The failover list is keyed on the REQUESTED modelSpec: the content key hashes the requested spec, so a response served by a failover model replays correctly, and the fallback changes only `servedBy` in the journal entry. Never-pay-twice (invariant I1, 00-overview.md) stays intact, and cost attribution stays honest because servedBy records who actually served.

```ts
export type FailoverTrigger = 'transport' | 'rate-limit';   // budget is explicitly excluded

// on the resolved spec:
fallbacks?: Array<{ model: ModelRef; on?: FailoverTrigger[] }>;
```

Budget exhaustion is never a failover trigger: failing over on budget would convert an economic stop into a silent model swap.

### 11.3 Degenerate fallback field

The simplest default for one-shot roles is the degenerate fallback field, a one-rung ladder with exactly one journaled decision entry:

```ts
fallback?: { model: ModelRef; on: Array<'error' | 'limit' | 'schema-exhausted'> };
```

`on` is a subset of `error | limit | schema-exhausted`. Unlike section 11.2 failover (transport-level, same entry, servedBy only), the degenerate fallback is an agent-level second attempt: it writes a decision entry and the fallback attempt is a new content key.

Committed during M4-T04: the field lives on `AgentOpts` (policy, excluded from identity; 06-execution-spec.md, section "ctx.agent and AgentOpts"). Trigger classification of the failed attempt: terminal `error` with `AgentError.kind = 'schema-mismatch'` is `schema-exhausted`; any other terminal `error` is `error`; terminal `limit` (the no-progress abort included) is `limit`; cancelled, escalated, and skipped never trigger. The decision entry is written strictly AFTER the failed attempt's terminal and BEFORE the fallback spawn's running entry, with `decisionType: 'model.fallback'` and value `{ targetRef: <failed running seq>, trigger, model }`; on resume an existing decision entry with a matching `targetRef` is reused, never duplicated. The fallback attempt runs with `model` overriding all roles and no further fallback (one rung); its outcome is what the caller observes, under the caller's own `onError` and `result` semantics.

## 12 ModelLadder summary

Full specification in 07-adaptive-orchestration-spec.md, section "ModelLadder". This section fixes the model-layer-facing contract, and the types below are the SINGLE declaration of the ladder family: 07 references them and never redeclares.

```ts
export interface LadderSpec {
  rungs: Array<{
    model: ModelRef;
    effort?: Effort;
    maxTurns: number;           // binding cap per rung
    maxTokens: number;          // binding cap per rung
    maxCostUsd?: number;        // optional: local openaiCompatible models have no meaningful price
    memoizeOutcome?: boolean;   // opt-in per rung; the global default errors-re-run-live is preserved (DEF-1)
  }>;
  startTier: number;
  escalateOn: TriggerClass[];
  acceptance?: Gate[];
}

export type TriggerClass = 'error' | 'limit' | 'schema-exhausted' | 'verify-failed' | 'no-progress';

export type Gate =
  | { kind: 'mechanical'; profile: string }        // engine-registered named pure function over AgentResult.artifacts
  | { kind: 'judge'; rung: number | ModelRef }     // declared rung, or an explicit model override
  | { kind: 'spot-check'; fraction: number };      // sibling selection strictly via ctx.random, never Math.random
```

Normative summary:

- Ladders are opt-in tiers on a profile or call, ordered cheap to strong, resolving through the existing resolution chain (section 8.2).
- Per-rung `maxTurns`/`maxTokens` are binding caps that bound the worst-case cost of a failed attempt.
- Each rung attempt is an ordinary agent scope whose hash includes the concrete ModelRef: tier N+1 is a new content key and exactly one live attempt; all ladder attempts share one logicalTaskId with relation `'rung-retry'` (DEF-3).
- Every ladder control-flow verdict (verify, judge acceptance, budget guard denial on a rung, no-progress abort, spot-check selection) is a decision entry computed once live and replayed by match; the ladder fold consumes only journaled values (DEF-1 governing principle; 03-journal-spec.md, section "Replay predicate").
- No-progress aborts and per-rung cap hits journal as a first-class terminal class distinct from user cancellation; otherwise they would land in cancelled and be re-paid on every resume.
- `memoizeOutcome` is an opt-in flag on rung and fallback spawns; the global default errors-re-run-live is preserved (DEF-1).
- `judgeModel` MUST be an explicitly declared rung with index >= the executing rung, or an explicitly named override: no cross-adapter quality ordering exists, so the ordering constraint is replaced by declaration (see also section 9).
- Role floors (section 9) forbid weak defaults for code-edit, synthesis, judge, plan and orchestrate; the engine ships NO weak-worker default.
- The orchestrator never names a model: `spawn_agent` receives only `model_hint.startTier`, clamped to the declared ladder (07-adaptive-orchestration-spec.md, section "Orchestrator toolset").
- In PlanRunner runs the declared ladder length is frozen into `termination.init` as `kMax`; admission rejects a spawn whose ladder exceeds the frozen vector with reject code `ladder_exceeds_frozen` (DEF-2; 07-adaptive-orchestration-spec.md, section "TerminationAccount").
- Runtime startTier promotion is excluded from v1 (EXC registry, 01-requirements.md): per-run-only statistics without a cross-run store amplify cost. The v2 path is defined by ModelKnowledge: a deterministic promotion table compiled as a pure function of the kb_pinned card bytes and the ladder config, from eval-measured claims only (05-model-knowledge-spec.md, section "Composition with the model layer").

## 13 Server-side compaction position

Both providers now ship server-side context compaction: Anthropic via the `compact-2026-01-12` beta (`context_management.edits`) and OpenAI Responses via `context_management: [{ type: 'compaction', compact_threshold }]`.

Position for v1, normative:

- Server-side compaction is OUT OF SCOPE in v1. Adapters MUST NOT enable it by default, and MUST NOT accept it silently through providerOptions without the documented caveat below.
- If a response nevertheless contains compaction blocks or items (host opted in via providerOptions at its own risk), they MUST be preserved in canonical history as provider-raw parts, subject to the standard retention and projection rules (section 2.3). Dropping them would corrupt subsequent projections.
- Client-side compaction remains owned by the Agent Runtime (history processors, compaction threshold, summarize role; 06-execution-spec.md, section "Agent Runtime binding"), and compaction points are written into the turn checkpoint (03-journal-spec.md, section "Checkpoints").
- The interaction between server-side compaction and canonical-history retention is recorded as a requirements note in 01-requirements.md and revisited post-1.0.
