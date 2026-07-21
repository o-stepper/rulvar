[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunOptions

# Interface: RunOptions

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Run ceiling B0; immutable after start. Enforced by projected admission (a spawn whose reserve does not fit is denied before any dispatch), the per-turn guard with a budget-derived maxOutputTokens clamp, and live stream cuts on crossing; the residual provider-dependent overshoot is bounded by one in-flight turn per concurrent agent. Contract: https://docs.rulvar.com/guide/budgets. | `packages/core/dist/index.d.ts` |
| <a id="property-deadlineat"></a> `deadlineAt?` | `string` | Run-level deadline: an ISO 8601 date-time with an explicit UTC designator or offset (e.g. `2026-07-21T10:00:00Z` or `2026-07-21T12:00:00+02:00`); crossing it cancels the run. Any other string is a typed ConfigError thrown synchronously by engine.run, before any journal entry or provider dispatch (v1.34.0 review P2-1). A deadline already in the past cancels immediately: a crossed deadline is a valid deadline. Deadlines beyond the Node timer maximum are honored through sliced timers, never truncated (v1.34.0 review P2-2). | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | Run-level defaults merged over engine defaults. | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId?` | `string` | Explicit id; otherwise the engine mints a ULID. | `packages/core/dist/index.d.ts` |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Host-initiated cancellation. | `packages/core/dist/index.d.ts` |
| <a id="property-tags"></a> `tags?` | `string`[] | - | `packages/core/dist/index.d.ts` |
