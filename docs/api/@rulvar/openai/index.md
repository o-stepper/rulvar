[**Rulvar API reference**](../../index.md)

***

[Rulvar API reference](/api/index.md) / @rulvar/openai

# @rulvar/openai

First-class adapter for the OpenAI Responses API (reasoning items,
strict `json_schema` outputs), plus `openaiCompatible`, the factory that
points the same adapter at any OpenAI-compatible endpoint (Ollama, vLLM,
gateways) with an explicit id and baseURL. Models are addressed as
`'openai:<model>'` in routing.

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/core @rulvar/openai
```

The umbrella package `@rulvar/rulvar` already bundles this adapter.

## Documentation

- [Providers](https://docs.rulvar.com/guide/providers)
- [Model routing](https://docs.rulvar.com/guide/model-routing)
- [API reference](https://docs.rulvar.com/api/%40rulvar/openai/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)

## Classes

| Class | Description |
| ------ | ------ |
| [OpenAiIdMap](/api/@rulvar/openai/classes/OpenAiIdMap.md) | Bijective canonical-to-wire (call_*) id map. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [OpenAiAdapterOptions](/api/@rulvar/openai/interfaces/OpenAiAdapterOptions.md) | - |
| [OpenAiClientLike](/api/@rulvar/openai/interfaces/OpenAiClientLike.md) | The client sub-surface the adapter consumes; injectable for tests. |
| [OpenAiCompatibleConfig](/api/@rulvar/openai/interfaces/OpenAiCompatibleConfig.md) | - |
| [OpenAiModelInfo](/api/@rulvar/openai/interfaces/OpenAiModelInfo.md) | - |
| [V1190CacheAudit](/api/@rulvar/openai/interfaces/V1190CacheAudit.md) | One journal's sidecar reconciliation; see auditV1190CacheJournal. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [OpenAiSdkOptions](/api/@rulvar/openai/type-aliases/OpenAiSdkOptions.md) | Official SDK construction options forwarded verbatim to `new OpenAI(...)`, minus `maxRetries`: Rulvar owns retries and wall-clock, so SDK autoretries stay disabled no matter what is passed here. This is the production surface for auth beyond a plain API key, `workloadIdentity` federation included, plus `fetch`, `timeout`, and `defaultHeaders`. The SDK's own rules still apply inside it, e.g. `sdkOptions.apiKey` and `sdkOptions.workloadIdentity` are mutually exclusive and rejected typed at construction. |
| [ResponsesStreamEvent](/api/@rulvar/openai/type-aliases/ResponsesStreamEvent.md) | Raw Responses SSE events, structurally typed. |

## Variables

| Variable | Description |
| ------ | ------ |
| [CONSERVATIVE\_COMPATIBLE\_CAPS](/api/@rulvar/openai/variables/CONSERVATIVE_COMPATIBLE_CAPS.md) | Gateways cannot be introspected reliably: when caps are not supplied the factory assumes the most conservative capability set. Callers SHOULD supply caps for anything beyond it; the window and output floors here are deliberately small so an unprobed endpoint is never overcommitted. Absent pricing is legitimate for local models: they surface as unpriced in CostReport. |
| [OPENAI\_MODELS](/api/@rulvar/openai/variables/OPENAI_MODELS.md) | Static seed table of the current model set. |
| [OPENAI\_PRICING](/api/@rulvar/openai/variables/OPENAI_PRICING.md) | The seed pricing rows as a versioned price table, keyed by full ModelRef under the adapter's fixed id 'openai' (long-context tiers included; the 'gpt-5.6' alias carries the same row as its Sol target). Pass it to createEngine({ pricing }) so the run journals a concrete pricingVersion instead of 'unpriced': the versioned table wins over the caps fallback by rule, and a later table revision surfaces as explicit configuration drift on resume rather than a silent reinterpretation. |

## Functions

| Function | Description |
| ------ | ------ |
| [auditV1190CacheJournal](/api/@rulvar/openai/functions/auditV1190CacheJournal.md) | Folds a journal twice with the SAME price function: once as recorded and once with every affected OpenAI usage passed through `undoV1190CacheDoubleCount`, returning both totals and the affected entry count. An entry (or per-model slice) counts as affected when it was served by the `openai` adapter, carries cache writes, and has no `usageSemantics` stamp; stamped entries are already correct and fold identically in both totals. The journal itself is never touched. `recordedUsd - correctedUsd` is the exact overcharge IF the journal was recorded by v1.19.0; for a v1.20.0 journal the same shape folds to a smaller `correctedUsd` that does NOT correspond to any real charge, so version provenance stays the caller's responsibility. |
| [buildChatCompletionsParams](/api/@rulvar/openai/functions/buildChatCompletionsParams.md) | The Chat Completions degraded path: delta-patched chunk assembly instead of typed SSE, nested function tools with explicit strict where supported, response_format instead of text.format, no reasoning item replay. Selected by caps (api: 'chat'), visible in events, never silent. |
| [buildResponsesParams](/api/@rulvar/openai/functions/buildResponsesParams.md) | Builds Responses API params. Manual item replay ONLY: store: false plus include reasoning.encrypted_content; previous_response_id and the Conversations API place state server-side, break replay identity, and are REJECTED as a typed ConfigError. Role 'system' messages project into top-level instructions on every request. |
| [mapChatCompletionsStream](/api/@rulvar/openai/functions/mapChatCompletionsStream.md) | Delta-patched chunk assembly for the degraded path; yields each canonical event as its chunk is consumed (same live-streaming contract as mapResponsesStream). |
| [mapOpenAiEffort](/api/@rulvar/openai/functions/mapOpenAiEffort.md) | Canonical-to-wire effort: low through xhigh pass through. Canonical max passes through unchanged on models whose caps declare wire max support (the whole GPT-5.6 family, each sibling verified live 2026-07-18; v1.20.0 review P2-3); elsewhere it downmaps to xhigh (documented lossy; recorded in providerMetadata). Provider 'none' is reachable only via providerOptions.openai.reasoningEffort. |
| [mapResponsesStream](/api/@rulvar/openai/functions/mapResponsesStream.md) | Maps the typed Responses SSE stream to ChatEvents, yielding each canonical event AS the corresponding provider event is consumed: the consumer's pull drives the provider read (natural backpressure, no buffering, no detached work). Canonical parts come from the typed output array, never the output_text aggregate. Raw output items ride finish.providerMetadata.openai.outputItems so the runtime can retain reasoning items as provider-raw parts. |
| [normalizeOpenAiUsage](/api/@rulvar/openai/functions/normalizeOpenAiUsage.md) | Normalizes Responses usage into the canonical Usage invariant, where `inputTokens` is the FULL prompt. On the OpenAI wire `input_tokens` is ALREADY that full count: `input_tokens_details.cached_tokens` and `input_tokens_details.cache_write_tokens` (GPT-5.6 and later families) are priced SUBSETS of it, never additional tokens, so both pass through untouched and nothing is added. Verified on the live wire 2026-07-18: two identical long prompts report the SAME `input_tokens` while the details flip from write to read, and `total_tokens` equals `input_tokens + output_tokens` on both calls. Adding writes on top (the v1.19.0 reading of the field) double-billed every written token at 1x + 1.25x and inflated budget debits (v1.19.0 review P1-1). Contrast with the Anthropic adapter, whose wire genuinely EXCLUDES both cache counts from `input_tokens`, so that adapter adds them; the two wires differ, the canonical Usage invariant does not. |
| [openai](/api/@rulvar/openai/functions/openai.md) | @rulvar/openai: the first-class OpenAI Responses API adapter with the Chat Completions degraded path, plus the openaiCompatible factory for Ollama, vLLM, and gateways. |
| [openaiCompatible](/api/@rulvar/openai/functions/openaiCompatible.md) | Creates a Chat Completions dialect adapter for a compatible endpoint. |
| [openAiErrorToWire](/api/@rulvar/openai/functions/openAiErrorToWire.md) | Projects SDK/API errors into the retryable WireError vocabulary. |
| [openAiModelInfo](/api/@rulvar/openai/functions/openAiModelInfo.md) | - |
| [undoV1190CacheDoubleCount](/api/@rulvar/openai/functions/undoV1190CacheDoubleCount.md) | The exact inverse of the v1.19.0 double count for one usage: subtracts `cacheWriteTokens` back out of `inputTokens` and leaves every other field untouched. A usage without cache writes is returned unchanged (v1.19.0 recorded those correctly). Throws a typed ConfigError when the arithmetic cannot be the v1.19.0 shape (the recorded input has no room for the subtraction), which means the usage was NOT recorded by the affected adapter; do not guess. |
