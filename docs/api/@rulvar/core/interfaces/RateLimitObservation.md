[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RateLimitObservation

# Interface: RateLimitObservation

Defined in: [packages/core/src/runtime/agent-loop.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L206)

One 429's provider-normalized limits, per (provider, model).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model` | `string` | - | [packages/core/src/runtime/agent-loop.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L208) |
| <a id="property-provider"></a> `provider` | `string` | - | [packages/core/src/runtime/agent-loop.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L207) |
| <a id="property-reportedlimits"></a> `reportedLimits` | \{ `inputTokensPerMinute?`: `number`; `outputTokensPerMinute?`: `number`; `requestsPerMinute?`: `number`; `tokensPerMinute?`: `number`; \} | Per-minute limits the provider REPORTED in its rate-limit headers, normalized by the adapter: openai fills requestsPerMinute and tokensPerMinute; anthropic fills requestsPerMinute plus the split inputTokensPerMinute and outputTokensPerMinute. | [packages/core/src/runtime/agent-loop.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L216) |
| `reportedLimits.inputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L219) |
| `reportedLimits.outputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L220) |
| `reportedLimits.requestsPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L217) |
| `reportedLimits.tokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:218](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L218) |
