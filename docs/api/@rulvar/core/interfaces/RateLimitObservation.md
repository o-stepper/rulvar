[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RateLimitObservation

# Interface: RateLimitObservation

Defined in: [packages/core/src/runtime/agent-loop.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L301)

One 429's provider-normalized limits, per (provider, model).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model` | `string` | - | [packages/core/src/runtime/agent-loop.ts:303](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L303) |
| <a id="property-provider"></a> `provider` | `string` | - | [packages/core/src/runtime/agent-loop.ts:302](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L302) |
| <a id="property-reportedlimits"></a> `reportedLimits` | \{ `inputTokensPerMinute?`: `number`; `outputTokensPerMinute?`: `number`; `requestsPerMinute?`: `number`; `tokensPerMinute?`: `number`; \} | Per-minute limits the provider REPORTED in its rate-limit headers, normalized by the adapter: openai fills requestsPerMinute and tokensPerMinute; anthropic fills requestsPerMinute plus the split inputTokensPerMinute and outputTokensPerMinute. | [packages/core/src/runtime/agent-loop.ts:311](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L311) |
| `reportedLimits.inputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L314) |
| `reportedLimits.outputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:315](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L315) |
| `reportedLimits.requestsPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:312](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L312) |
| `reportedLimits.tokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:313](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L313) |
