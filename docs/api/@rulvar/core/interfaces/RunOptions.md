[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunOptions

# Interface: RunOptions

Defined in: [packages/core/src/engine/engine.ts:292](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L292)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Run ceiling B0; immutable after start. Enforced by projected admission (a spawn whose reserve does not fit is denied before any dispatch), the per-turn guard with a budget-derived maxOutputTokens clamp, and live stream cuts on crossing; the residual provider-dependent overshoot is bounded by one in-flight turn per concurrent agent. Contract: https://docs.rulvar.com/guide/budgets. | [packages/core/src/engine/engine.ts:303](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L303) |
| <a id="property-deadlineat"></a> `deadlineAt?` | `string` | Run-level deadline: an ISO 8601 date-time with an explicit UTC designator or offset (e.g. `2026-07-21T10:00:00Z` or `2026-07-21T12:00:00+02:00`); crossing it cancels the run. Any other string is a typed ConfigError thrown synchronously by engine.run, before any journal entry or provider dispatch (v1.34.0 review P2-1). A deadline already in the past cancels immediately: a crossed deadline is a valid deadline. Deadlines beyond the Node timer maximum are honored through sliced timers, never truncated (v1.34.0 review P2-2). | [packages/core/src/engine/engine.ts:317](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L317) |
| <a id="property-lease"></a> `lease?` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) | A lease the caller already holds for this run (the genesis side of the ResumeOptions.lease contract): the engine carries it on EVERY durable mutation of the fresh segment (every journal append, every putMeta, every transcript blob write) and never acquires, renews, or releases it itself; lifecycle stays with the caller. Passing it disables the engine's own ownership acquisition for this run regardless of the `ownership` mode. Hosts that admit runs through an external queue acquire the lease at admission time and hand it here, so admission and the first dispatch are covered by ONE fencing epoch. | [packages/core/src/engine/engine.ts:334](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L334) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | Run-level defaults merged over engine defaults. | [packages/core/src/engine/engine.ts:305](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L305) |
| <a id="property-name"></a> `name?` | `string` | - | [packages/core/src/engine/engine.ts:318](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L318) |
| <a id="property-runid"></a> `runId?` | `string` | Explicit id; otherwise the engine mints a ULID. | [packages/core/src/engine/engine.ts:294](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L294) |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Host-initiated cancellation. | [packages/core/src/engine/engine.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L321) |
| <a id="property-tags"></a> `tags?` | `string`[] | - | [packages/core/src/engine/engine.ts:319](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L319) |
