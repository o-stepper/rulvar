[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RateLimitObservation

# Interface: RateLimitObservation

Defined in: [packages/core/src/runtime/agent-loop.ts:303](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L303)

One 429's provider-normalized limits, per (provider, model).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model` | `string` | - | [packages/core/src/runtime/agent-loop.ts:305](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L305) |
| <a id="property-provider"></a> `provider` | `string` | - | [packages/core/src/runtime/agent-loop.ts:304](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L304) |
| <a id="property-reportedlimits"></a> `reportedLimits` | \{ `inputTokensPerMinute?`: `number`; `outputTokensPerMinute?`: `number`; `requestsPerMinute?`: `number`; `tokensPerMinute?`: `number`; \} | Per-minute limits the provider REPORTED in its rate-limit headers, normalized by the adapter: openai fills requestsPerMinute and tokensPerMinute; anthropic fills requestsPerMinute plus the split inputTokensPerMinute and outputTokensPerMinute. | [packages/core/src/runtime/agent-loop.ts:313](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L313) |
| `reportedLimits.inputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L316) |
| `reportedLimits.outputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:317](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L317) |
| `reportedLimits.requestsPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L314) |
| `reportedLimits.tokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:315](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L315) |
