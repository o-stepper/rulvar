[**rulvar API reference**](../../index.md)

***

[rulvar API reference](/api/index.md) / @rulvar/anthropic

# @rulvar/anthropic

## Classes

| Class | Description |
| ------ | ------ |
| [IdMap](/api/@rulvar/anthropic/classes/IdMap.md) | Bijective canonical-to-wire tool-call id map (docs/04, section 1.2). |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [AnthropicAdapterOptions](/api/@rulvar/anthropic/interfaces/AnthropicAdapterOptions.md) | - |
| [AnthropicClientLike](/api/@rulvar/anthropic/interfaces/AnthropicClientLike.md) | The client sub-surface the adapter consumes; injectable for tests. |
| [AnthropicModelInfo](/api/@rulvar/anthropic/interfaces/AnthropicModelInfo.md) | - |
| [TurnMapping](/api/@rulvar/anthropic/interfaces/TurnMapping.md) | - |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [AnthropicStreamEvent](/api/@rulvar/anthropic/type-aliases/AnthropicStreamEvent.md) | Raw Messages API stream events, structurally typed. |

## Variables

| Variable | Description |
| ------ | ------ |
| [ANTHROPIC\_MODELS](/api/@rulvar/anthropic/variables/ANTHROPIC_MODELS.md) | Static seed table; docs/04 section 4 names the current model set. |
| [DEFAULT\_PAUSE\_TURN\_MAX\_CONTINUATIONS](/api/@rulvar/anthropic/variables/DEFAULT_PAUSE_TURN_MAX_CONTINUATIONS.md) | pause_turn continuation cap (docs/06 Appendix A; docs/04, section 4.6). |

## Functions

| Function | Description |
| ------ | ------ |
| [anthropic](/api/@rulvar/anthropic/functions/anthropic.md) | @rulvar/anthropic: the first-class Anthropic adapter on the July 2026 Messages API surface (docs/04, section "@rulvar/anthropic"). |
| [anthropicErrorToWire](/api/@rulvar/anthropic/functions/anthropicErrorToWire.md) | Projects an SDK/API error into the retryable WireError vocabulary: 429 rate limits surface retryAfterMs and the x-ratelimit-* buckets; 529 overloaded and 5xx are retryable transport; everything else is terminal transport (docs/04, section 4.9). Adapters never sleep internally. |
| [anthropicModelInfo](/api/@rulvar/anthropic/functions/anthropicModelInfo.md) | Unknown Anthropic models are assumed current-generation: adaptive thinking, native structured outputs, no sampling parameters. refreshCaps corrects window/output figures from the live model list. |
| [buildAnthropicParams](/api/@rulvar/anthropic/functions/buildAnthropicParams.md) | Builds Messages API params from a ChatRequest. cacheHint compiles into cache_control breakpoints; beyond the provider cap of 4 the DEEPEST breakpoints are kept and the shallowest dropped, deterministically (docs/04, sections 1.7 and 4.4). |
| [mapAnthropicStream](/api/@rulvar/anthropic/functions/mapAnthropicStream.md) | Maps one Messages API stream into ChatEvents. Emits an early usage event from message_start (the input side is known immediately) and exactly one terminal finish unless the turn paused (pause_turn) or errored. `carryRetained` holds thinking blocks from earlier pause_turn continuations of the same turn so the terminal finish ships the whole turn's retention payload (docs/04, section 2.3, M4-T02). |
| [mapStopReason](/api/@rulvar/anthropic/functions/mapStopReason.md) | The docs/04 section 4.7 stop-reason table. pause_turn never surfaces as a canonical finish: the adapter continues internally. |
| [normalizeAnthropicUsage](/api/@rulvar/anthropic/functions/normalizeAnthropicUsage.md) | Normalizes Messages API usage under the Usage invariant: Anthropic reports input_tokens EXCLUDING cache reads and writes, so the canonical inputTokens is the sum of all three (docs/04, sections 1.6 and 4.4). |
