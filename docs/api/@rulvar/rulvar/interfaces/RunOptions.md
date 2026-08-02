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
| <a id="property-lease"></a> `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) | A lease the caller already holds for this run (the genesis side of the ResumeOptions.lease contract): the engine carries it on EVERY durable mutation of the fresh segment (every journal append, every putMeta, every transcript blob write) and never acquires, renews, or releases it itself; lifecycle stays with the caller. Passing it disables the engine's own ownership acquisition for this run regardless of the `ownership` mode. Hosts that admit runs through an external queue acquire the lease at admission time and hand it here, so admission and the first dispatch are covered by ONE fencing epoch. | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | Run-level defaults merged over engine defaults. | `packages/core/dist/index.d.ts` |
| <a id="property-maxinflightexposureusd"></a> `maxInFlightExposureUsd?` | `number` | The opt-in in-flight exposure cap (RV711): bounds spent money plus the summed worst-case estimates of live dispatches. The per-turn guard checks money already SPENT, so under `budgetUsd` alone N concurrent turns each pass it before any settles and together can cross the ceiling by up to one whole turn each (preflight's 'overshoot-exposure' finding prices that hole). With the cap, the admission holds each turn's own estimate (the prompt estimate plus the request's output allowance, priced by the same rows as settlement) from right before the provider call until the attempt settles, and the dispatch whose estimate does not fit spent + finalize/synthesis reserves + live estimates is refused with a typed BudgetExhaustedError (data.reason 'in-flight-exposure') instead of waiting; the refused agent settles as a budget error. Worst concurrent overshoot past the cap is thereby the estimate error of the in-flight turns, not one whole turn per agent. Absent by default: wire traffic, journals, and hooks stay byte-identical. Recorded in RunMeta at genesis (RV1504) and restored on every resume, the budgetUsd rule: the cap used to be per-invocation and unrecorded, so a resumed segment silently ran without the bound the original invocation declared (the seventeenth comparison benchmark's top FinOps gap). A run started without the cap stays uncapped for its whole life, and ResumeOptions deliberately has no field to override it. | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId?` | `string` | Explicit id; otherwise the engine mints a ULID. | `packages/core/dist/index.d.ts` |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Host-initiated cancellation. | `packages/core/dist/index.d.ts` |
| <a id="property-tags"></a> `tags?` | `string`[] | - | `packages/core/dist/index.d.ts` |
