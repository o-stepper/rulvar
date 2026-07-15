[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunOptions

# Interface: RunOptions

Defined in: [packages/core/src/engine/engine.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L189)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Run ceiling B0; immutable after start. Enforced by projected admission (a spawn whose reserve does not fit is denied before any dispatch), the per-turn guard with a budget-derived maxOutputTokens clamp, and live stream cuts on crossing; the residual provider-dependent overshoot is bounded by one in-flight turn per concurrent agent. Contract: https://docs.rulvar.com/guide/budgets. | [packages/core/src/engine/engine.ts:200](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L200) |
| <a id="property-deadlineat"></a> `deadlineAt?` | `string` | Run-level deadline (ISO 8601); crossing cancels the run. | [packages/core/src/engine/engine.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L204) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | Run-level defaults merged over engine defaults. | [packages/core/src/engine/engine.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L202) |
| <a id="property-name"></a> `name?` | `string` | - | [packages/core/src/engine/engine.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L205) |
| <a id="property-runid"></a> `runId?` | `string` | Explicit id; otherwise the engine mints a ULID. | [packages/core/src/engine/engine.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L191) |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Host-initiated cancellation. | [packages/core/src/engine/engine.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L208) |
| <a id="property-tags"></a> `tags?` | `string`[] | - | [packages/core/src/engine/engine.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L206) |
