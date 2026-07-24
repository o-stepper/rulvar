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
| <a id="property-tenant"></a> `tenant?` | `string` | The engine's configured tenant; absent when the host set none. | `packages/core/dist/index.d.ts` |
