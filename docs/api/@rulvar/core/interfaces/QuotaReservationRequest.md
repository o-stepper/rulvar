[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / QuotaReservationRequest

# Interface: QuotaReservationRequest

Defined in: [packages/core/src/l0/spi/quota.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L57)

One admission request, dimensioned for tenant/model/provider rules.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-estimate"></a> `estimate` | [`QuotaEstimate`](/api/@rulvar/core/interfaces/QuotaEstimate.md) | - | [packages/core/src/l0/spi/quota.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L69) |
| <a id="property-model"></a> `model` | `string` | The serving model, re-reserved per failover target. | [packages/core/src/l0/spi/quota.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L64) |
| <a id="property-provider"></a> `provider` | `string` | The adapter id (the left segment of ModelRef), matching the keys of `concurrency.perProvider`. | [packages/core/src/l0/spi/quota.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L62) |
| <a id="property-runid"></a> `runId?` | `string` | The run paying for the attempt; observability only. | [packages/core/src/l0/spi/quota.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L68) |
| <a id="property-tenant"></a> `tenant?` | `string` | The engine's configured tenant; absent when the host set none. | [packages/core/src/l0/spi/quota.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L66) |
