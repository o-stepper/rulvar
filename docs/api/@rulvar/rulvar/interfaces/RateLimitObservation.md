[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RateLimitObservation

# Interface: RateLimitObservation

Defined in: `packages/core/dist/index.d.ts`

One 429's provider-normalized limits, per (provider, model).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-provider"></a> `provider` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-reportedlimits"></a> `reportedLimits` | \{ `inputTokensPerMinute?`: `number`; `outputTokensPerMinute?`: `number`; `requestsPerMinute?`: `number`; `tokensPerMinute?`: `number`; \} | Per-minute limits the provider REPORTED in its rate-limit headers, normalized by the adapter: openai fills requestsPerMinute and tokensPerMinute; anthropic fills requestsPerMinute plus the split inputTokensPerMinute and outputTokensPerMinute. | `packages/core/dist/index.d.ts` |
| `reportedLimits.inputTokensPerMinute?` | `number` | - | `packages/core/dist/index.d.ts` |
| `reportedLimits.outputTokensPerMinute?` | `number` | - | `packages/core/dist/index.d.ts` |
| `reportedLimits.requestsPerMinute?` | `number` | - | `packages/core/dist/index.d.ts` |
| `reportedLimits.tokensPerMinute?` | `number` | - | `packages/core/dist/index.d.ts` |
