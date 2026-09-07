[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RateLimitObservation

# Interface: RateLimitObservation

Defined in: [packages/core/src/runtime/agent-loop.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L314)

One 429's provider-normalized limits, per (provider, model).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model` | `string` | - | [packages/core/src/runtime/agent-loop.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L316) |
| <a id="property-provider"></a> `provider` | `string` | - | [packages/core/src/runtime/agent-loop.ts:315](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L315) |
| <a id="property-reportedlimits"></a> `reportedLimits` | \{ `inputTokensPerMinute?`: `number`; `outputTokensPerMinute?`: `number`; `requestsPerMinute?`: `number`; `tokensPerMinute?`: `number`; \} | Per-minute limits the provider REPORTED in its rate-limit headers, normalized by the adapter: openai fills requestsPerMinute and tokensPerMinute; anthropic fills requestsPerMinute plus the split inputTokensPerMinute and outputTokensPerMinute. | [packages/core/src/runtime/agent-loop.ts:324](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L324) |
| `reportedLimits.inputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:327](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L327) |
| `reportedLimits.outputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:328](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L328) |
| `reportedLimits.requestsPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:325](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L325) |
| `reportedLimits.tokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:326](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L326) |
