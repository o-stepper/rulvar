[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RateLimitObservation

# Interface: RateLimitObservation

Defined in: [packages/core/src/runtime/agent-loop.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L217)

One 429's provider-normalized limits, per (provider, model).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model` | `string` | - | [packages/core/src/runtime/agent-loop.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L219) |
| <a id="property-provider"></a> `provider` | `string` | - | [packages/core/src/runtime/agent-loop.ts:218](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L218) |
| <a id="property-reportedlimits"></a> `reportedLimits` | \{ `inputTokensPerMinute?`: `number`; `outputTokensPerMinute?`: `number`; `requestsPerMinute?`: `number`; `tokensPerMinute?`: `number`; \} | Per-minute limits the provider REPORTED in its rate-limit headers, normalized by the adapter: openai fills requestsPerMinute and tokensPerMinute; anthropic fills requestsPerMinute plus the split inputTokensPerMinute and outputTokensPerMinute. | [packages/core/src/runtime/agent-loop.ts:227](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L227) |
| `reportedLimits.inputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L230) |
| `reportedLimits.outputTokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:231](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L231) |
| `reportedLimits.requestsPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L228) |
| `reportedLimits.tokensPerMinute?` | `number` | - | [packages/core/src/runtime/agent-loop.ts:229](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L229) |
