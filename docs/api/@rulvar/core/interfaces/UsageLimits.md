[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / UsageLimits

# Interface: UsageLimits

Defined in: [packages/core/src/runtime/usage-limits.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L15)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-maxoutputtokensperturn"></a> `maxOutputTokensPerTurn?` | `number` | Unlimited by default (model caps still apply). | [packages/core/src/runtime/usage-limits.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L21) |
| <a id="property-maxtoolcalls"></a> `maxToolCalls?` | `number` | Unlimited by default. | [packages/core/src/runtime/usage-limits.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L19) |
| <a id="property-maxturns"></a> `maxTurns?` | `number` | Default 32. | [packages/core/src/runtime/usage-limits.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L17) |
| <a id="property-noprogressturns"></a> `noProgressTurns?` | `number` | The no-progress detector N (committed at 3): consecutive turns without tool calls or artifact deltas before the engine aborts with the dedicated class (M3-T08). | [packages/core/src/runtime/usage-limits.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L31) |
| <a id="property-streamidletimeoutms"></a> `streamIdleTimeoutMs?` | `number` | Gap between stream events; default 120000. | [packages/core/src/runtime/usage-limits.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L25) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | Per-agent wall clock; unlimited by default. | [packages/core/src/runtime/usage-limits.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/usage-limits.ts#L23) |
