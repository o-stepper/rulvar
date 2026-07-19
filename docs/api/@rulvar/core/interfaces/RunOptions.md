[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunOptions

# Interface: RunOptions

Defined in: [packages/core/src/engine/engine.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L186)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Run ceiling B0; immutable after start. Enforced by projected admission (a spawn whose reserve does not fit is denied before any dispatch), the per-turn guard with a budget-derived maxOutputTokens clamp, and live stream cuts on crossing; the residual provider-dependent overshoot is bounded by one in-flight turn per concurrent agent. Contract: https://docs.rulvar.com/guide/budgets. | [packages/core/src/engine/engine.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L197) |
| <a id="property-deadlineat"></a> `deadlineAt?` | `string` | Run-level deadline (ISO 8601); crossing cancels the run. | [packages/core/src/engine/engine.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L201) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | Run-level defaults merged over engine defaults. | [packages/core/src/engine/engine.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L199) |
| <a id="property-name"></a> `name?` | `string` | - | [packages/core/src/engine/engine.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L202) |
| <a id="property-runid"></a> `runId?` | `string` | Explicit id; otherwise the engine mints a ULID. | [packages/core/src/engine/engine.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L188) |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Host-initiated cancellation. | [packages/core/src/engine/engine.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L205) |
| <a id="property-tags"></a> `tags?` | `string`[] | - | [packages/core/src/engine/engine.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L203) |
