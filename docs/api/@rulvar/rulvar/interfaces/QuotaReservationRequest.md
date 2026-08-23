[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / QuotaReservationRequest

# Interface: QuotaReservationRequest

Defined in: `packages/core/dist/index.d.ts`

One admission request, dimensioned for tenant/model/provider rules.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-estimate"></a> `estimate` | [`QuotaEstimate`](/api/@rulvar/rulvar/interfaces/QuotaEstimate.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model` | `string` | The serving model, re-reserved per failover target. | `packages/core/dist/index.d.ts` |
| <a id="property-provider"></a> `provider` | `string` | The adapter id (the left segment of ModelRef), matching the keys of `concurrency.perProvider`. | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId?` | `string` | The run paying for the attempt; observability only. | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope?` | \{ `account?`: `string`; `legalDomain?`: `string`; `project?`: `string`; `providerAccount?`: `string`; `region?`: `string`; `sponsor?`: `string`; `tenant?`: `string`; \} | The run's execution scope dimensions (RV4205), stamped by the ctx completion so dimension-pinned QuotaRules can match them; absent on unscoped runs, byte identical to before the field. | `packages/core/dist/index.d.ts` |
| `scope.account?` | `string` | - | `packages/core/dist/index.d.ts` |
| `scope.legalDomain?` | `string` | - | `packages/core/dist/index.d.ts` |
| `scope.project?` | `string` | - | `packages/core/dist/index.d.ts` |
| `scope.providerAccount?` | `string` | - | `packages/core/dist/index.d.ts` |
| `scope.region?` | `string` | - | `packages/core/dist/index.d.ts` |
| `scope.sponsor?` | `string` | - | `packages/core/dist/index.d.ts` |
| `scope.tenant?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-tenant"></a> `tenant?` | `string` | The tenant of the reservation: the engine's configured tenant, or the run scope's under `quota.tenantFrom: 'scope'` (RV4205); absent when neither names one. | `packages/core/dist/index.d.ts` |
