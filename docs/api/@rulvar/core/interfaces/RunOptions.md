[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunOptions

# Interface: RunOptions

Defined in: [packages/core/src/engine/engine.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L194)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Run ceiling B0; immutable after start. Enforced by projected admission (a spawn whose reserve does not fit is denied before any dispatch), the per-turn guard with a budget-derived maxOutputTokens clamp, and live stream cuts on crossing; the residual provider-dependent overshoot is bounded by one in-flight turn per concurrent agent. Contract: https://docs.rulvar.com/guide/budgets. | [packages/core/src/engine/engine.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L205) |
| <a id="property-deadlineat"></a> `deadlineAt?` | `string` | Run-level deadline: an ISO 8601 date-time with an explicit UTC designator or offset (e.g. `2026-07-21T10:00:00Z` or `2026-07-21T12:00:00+02:00`); crossing it cancels the run. Any other string is a typed ConfigError thrown synchronously by engine.run, before any journal entry or provider dispatch (v1.34.0 review P2-1). A deadline already in the past cancels immediately: a crossed deadline is a valid deadline. Deadlines beyond the Node timer maximum are honored through sliced timers, never truncated (v1.34.0 review P2-2). | [packages/core/src/engine/engine.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L219) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | Run-level defaults merged over engine defaults. | [packages/core/src/engine/engine.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L207) |
| <a id="property-name"></a> `name?` | `string` | - | [packages/core/src/engine/engine.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L220) |
| <a id="property-runid"></a> `runId?` | `string` | Explicit id; otherwise the engine mints a ULID. | [packages/core/src/engine/engine.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L196) |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Host-initiated cancellation. | [packages/core/src/engine/engine.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L223) |
| <a id="property-tags"></a> `tags?` | `string`[] | - | [packages/core/src/engine/engine.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L221) |
