[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RateLimitObservation

# Interface: RateLimitObservation

Defined in: [packages/core/src/runtime/agent-loop.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L237)

One 429's provider-normalized limits, per (provider, model).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model` | `string` | - | [packages/core/src/runtime/agent-loop.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L239) |
| <a id="property-provider"></a> `provider` | `string` | - | [packages/core/src/runtime/agent-loop.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L238) |
| <a id="property-reportedlimits"></a> `reportedLimits` | \{ `inputTokensPerMinute?`: `number`; `outputTokensPerMinute?`: `number`; `requestsPerMinute?`: `number`; `tokensPerMinute?`: `number`; \} | Per-minute limits the provider REPORTED in its rate-limit headers, normalized by the adapter: openai fills requestsPerMinute and tokensPerMinute; anthropic fills requestsPerMinute plus the split inputTokensPerMinute and outputTokensPerMinute. | [packages/core/src/runtime/agent-loop.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L247) |
| `reportedLimits.inputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:250](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L250) |
| `reportedLimits.outputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L251) |
| `reportedLimits.requestsPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L248) |
| `reportedLimits.tokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:249](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L249) |
