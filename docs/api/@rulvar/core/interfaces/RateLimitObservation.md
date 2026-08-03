[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RateLimitObservation

# Interface: RateLimitObservation

Defined in: [packages/core/src/runtime/agent-loop.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L284)

One 429's provider-normalized limits, per (provider, model).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model` | `string` | - | [packages/core/src/runtime/agent-loop.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L286) |
| <a id="property-provider"></a> `provider` | `string` | - | [packages/core/src/runtime/agent-loop.ts:285](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L285) |
| <a id="property-reportedlimits"></a> `reportedLimits` | \{ `inputTokensPerMinute?`: `number`; `outputTokensPerMinute?`: `number`; `requestsPerMinute?`: `number`; `tokensPerMinute?`: `number`; \} | Per-minute limits the provider REPORTED in its rate-limit headers, normalized by the adapter: openai fills requestsPerMinute and tokensPerMinute; anthropic fills requestsPerMinute plus the split inputTokensPerMinute and outputTokensPerMinute. | [packages/core/src/runtime/agent-loop.ts:294](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L294) |
| `reportedLimits.inputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L297) |
| `reportedLimits.outputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:298](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L298) |
| `reportedLimits.requestsPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L295) |
| `reportedLimits.tokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L296) |
