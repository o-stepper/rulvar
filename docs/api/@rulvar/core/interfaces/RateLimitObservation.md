[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RateLimitObservation

# Interface: RateLimitObservation

Defined in: [packages/core/src/runtime/agent-loop.ts:330](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L330)

One 429's provider-normalized limits, per (provider, model).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model` | `string` | - | [packages/core/src/runtime/agent-loop.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L332) |
| <a id="property-provider"></a> `provider` | `string` | - | [packages/core/src/runtime/agent-loop.ts:331](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L331) |
| <a id="property-reportedlimits"></a> `reportedLimits` | \{ `inputTokensPerMinute?`: `number`; `outputTokensPerMinute?`: `number`; `requestsPerMinute?`: `number`; `tokensPerMinute?`: `number`; \} | Per-minute limits the provider REPORTED in its rate-limit headers, normalized by the adapter: openai fills requestsPerMinute and tokensPerMinute; anthropic fills requestsPerMinute plus the split inputTokensPerMinute and outputTokensPerMinute. | [packages/core/src/runtime/agent-loop.ts:340](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L340) |
| `reportedLimits.inputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:343](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L343) |
| `reportedLimits.outputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:344](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L344) |
| `reportedLimits.requestsPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:341](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L341) |
| `reportedLimits.tokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:342](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L342) |
