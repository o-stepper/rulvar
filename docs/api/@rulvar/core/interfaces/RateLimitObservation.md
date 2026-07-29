[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RateLimitObservation

# Interface: RateLimitObservation

Defined in: [packages/core/src/runtime/agent-loop.ts:257](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L257)

One 429's provider-normalized limits, per (provider, model).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model` | `string` | - | [packages/core/src/runtime/agent-loop.ts:259](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L259) |
| <a id="property-provider"></a> `provider` | `string` | - | [packages/core/src/runtime/agent-loop.ts:258](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L258) |
| <a id="property-reportedlimits"></a> `reportedLimits` | \{ `inputTokensPerMinute?`: `number`; `outputTokensPerMinute?`: `number`; `requestsPerMinute?`: `number`; `tokensPerMinute?`: `number`; \} | Per-minute limits the provider REPORTED in its rate-limit headers, normalized by the adapter: openai fills requestsPerMinute and tokensPerMinute; anthropic fills requestsPerMinute plus the split inputTokensPerMinute and outputTokensPerMinute. | [packages/core/src/runtime/agent-loop.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L267) |
| `reportedLimits.inputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:270](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L270) |
| `reportedLimits.outputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L271) |
| `reportedLimits.requestsPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L268) |
| `reportedLimits.tokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L269) |
