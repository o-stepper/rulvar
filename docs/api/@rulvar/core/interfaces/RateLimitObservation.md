[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RateLimitObservation

# Interface: RateLimitObservation

Defined in: [packages/core/src/runtime/agent-loop.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L295)

One 429's provider-normalized limits, per (provider, model).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model` | `string` | - | [packages/core/src/runtime/agent-loop.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L297) |
| <a id="property-provider"></a> `provider` | `string` | - | [packages/core/src/runtime/agent-loop.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L296) |
| <a id="property-reportedlimits"></a> `reportedLimits` | \{ `inputTokensPerMinute?`: `number`; `outputTokensPerMinute?`: `number`; `requestsPerMinute?`: `number`; `tokensPerMinute?`: `number`; \} | Per-minute limits the provider REPORTED in its rate-limit headers, normalized by the adapter: openai fills requestsPerMinute and tokensPerMinute; anthropic fills requestsPerMinute plus the split inputTokensPerMinute and outputTokensPerMinute. | [packages/core/src/runtime/agent-loop.ts:305](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L305) |
| `reportedLimits.inputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:308](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L308) |
| `reportedLimits.outputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:309](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L309) |
| `reportedLimits.requestsPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:306](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L306) |
| `reportedLimits.tokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:307](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L307) |
