[**Rulvar API reference**](../../index.md)

***

[Rulvar API reference](/api/index.md) / @rulvar/anthropic

# @rulvar/anthropic

First-class Anthropic provider adapter over the official
`@anthropic-ai/sdk`: thinking-block replay with signatures, cache hint
compilation, `pause_turn` continuation, typed refusal outcomes, and
usage normalization. Exports the `anthropic` adapter factory; models are
addressed as `'anthropic:<model>'` in routing.

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/core @rulvar/anthropic
```

The umbrella package `@rulvar/rulvar` already bundles this adapter.

## Documentation

- [Providers](https://docs.rulvar.com/guide/providers)
- [Model routing](https://docs.rulvar.com/guide/model-routing)
- [API reference](https://docs.rulvar.com/api/%40rulvar/anthropic/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)

## Classes

| Class | Description |
| ------ | ------ |
| [IdMap](/api/@rulvar/anthropic/classes/IdMap.md) | Bijective canonical-to-wire tool-call id map. |

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
| [ANTHROPIC\_MODELS](/api/@rulvar/anthropic/variables/ANTHROPIC_MODELS.md) | Static seed table naming the current model set. |
| [DEFAULT\_PAUSE\_TURN\_MAX\_CONTINUATIONS](/api/@rulvar/anthropic/variables/DEFAULT_PAUSE_TURN_MAX_CONTINUATIONS.md) | pause_turn continuation cap. |

## Functions

| Function | Description |
| ------ | ------ |
| [anthropic](/api/@rulvar/anthropic/functions/anthropic.md) | @rulvar/anthropic: the first-class Anthropic adapter on the July 2026 Messages API surface. |
| [anthropicErrorToWire](/api/@rulvar/anthropic/functions/anthropicErrorToWire.md) | Projects an SDK/API error into the retryable WireError vocabulary: 429 rate limits surface retryAfterMs and the x-ratelimit-* buckets; 529 overloaded and 5xx are retryable transport; everything else is terminal transport. Adapters never sleep internally. |
| [anthropicModelInfo](/api/@rulvar/anthropic/functions/anthropicModelInfo.md) | Unknown Anthropic models are assumed current-generation: adaptive thinking, native structured outputs, no sampling parameters. refreshCaps corrects window/output figures from the live model list. Pricing stays ABSENT for an unknown model: a fabricated row silently misprices every model newer than this table. Hosts price it via a versioned createEngine({ pricing }) row; until then its usage surfaces in CostReport.unpriced and a run ceiling warns that it cannot bound the model. |
| [buildAnthropicParams](/api/@rulvar/anthropic/functions/buildAnthropicParams.md) | Builds Messages API params from a ChatRequest. cacheHint compiles into cache_control breakpoints; beyond the provider cap of 4 the DEEPEST breakpoints are kept and the shallowest dropped, deterministically. |
| [mapAnthropicStream](/api/@rulvar/anthropic/functions/mapAnthropicStream.md) | Maps one Messages API stream into ChatEvents, yielding each canonical event AS the corresponding provider event is consumed: the consumer's pull drives the provider read (natural backpressure, no buffering, no detached work). The generator's RETURN value carries the accumulated turn state the adapter needs for pause_turn continuation. Yields an early usage event from message_start (the input side is known immediately) and exactly one terminal finish unless the turn paused (pause_turn) or errored. `carryRetained` holds thinking blocks from earlier pause_turn continuations of the same turn so the terminal finish ships the whole turn's retention payload (M4-T02). |
| [mapStopReason](/api/@rulvar/anthropic/functions/mapStopReason.md) | The stop-reason table. pause_turn never surfaces as a canonical finish: the adapter continues internally. |
| [normalizeAnthropicUsage](/api/@rulvar/anthropic/functions/normalizeAnthropicUsage.md) | Normalizes Messages API usage under the Usage invariant: Anthropic reports input_tokens EXCLUDING cache reads and writes, so the canonical inputTokens is the sum of all three. |
