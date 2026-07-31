[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RateLimitObservation

# Interface: RateLimitObservation

Defined in: [packages/core/src/runtime/agent-loop.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L275)

One 429's provider-normalized limits, per (provider, model).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model` | `string` | - | [packages/core/src/runtime/agent-loop.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L277) |
| <a id="property-provider"></a> `provider` | `string` | - | [packages/core/src/runtime/agent-loop.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L276) |
| <a id="property-reportedlimits"></a> `reportedLimits` | \{ `inputTokensPerMinute?`: `number`; `outputTokensPerMinute?`: `number`; `requestsPerMinute?`: `number`; `tokensPerMinute?`: `number`; \} | Per-minute limits the provider REPORTED in its rate-limit headers, normalized by the adapter: openai fills requestsPerMinute and tokensPerMinute; anthropic fills requestsPerMinute plus the split inputTokensPerMinute and outputTokensPerMinute. | [packages/core/src/runtime/agent-loop.ts:285](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L285) |
| `reportedLimits.inputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L288) |
| `reportedLimits.outputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L289) |
| `reportedLimits.requestsPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L286) |
| `reportedLimits.tokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L287) |
