[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / QuotaReservationRequest

# Interface: QuotaReservationRequest

Defined in: [packages/core/src/l0/spi/quota.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L57)

One admission request, dimensioned for tenant/model/provider rules.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-estimate"></a> `estimate` | [`QuotaEstimate`](/api/@rulvar/core/interfaces/QuotaEstimate.md) | - | [packages/core/src/l0/spi/quota.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L86) |
| <a id="property-model"></a> `model` | `string` | The serving model, re-reserved per failover target. | [packages/core/src/l0/spi/quota.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L64) |
| <a id="property-provider"></a> `provider` | `string` | The adapter id (the left segment of ModelRef), matching the keys of `concurrency.perProvider`. | [packages/core/src/l0/spi/quota.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L62) |
| <a id="property-runid"></a> `runId?` | `string` | The run paying for the attempt; observability only. | [packages/core/src/l0/spi/quota.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L85) |
| <a id="property-scope"></a> `scope?` | \{ `account?`: `string`; `legalDomain?`: `string`; `project?`: `string`; `providerAccount?`: `string`; `region?`: `string`; `tenant?`: `string`; \} | The run's execution scope dimensions (RV4205), stamped by the ctx completion so dimension-pinned QuotaRules can match them; absent on unscoped runs, byte identical to before the field. | [packages/core/src/l0/spi/quota.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L76) |
| `scope.account?` | `string` | - | [packages/core/src/l0/spi/quota.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L78) |
| `scope.legalDomain?` | `string` | - | [packages/core/src/l0/spi/quota.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L80) |
| `scope.project?` | `string` | - | [packages/core/src/l0/spi/quota.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L79) |
| `scope.providerAccount?` | `string` | - | [packages/core/src/l0/spi/quota.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L82) |
| `scope.region?` | `string` | - | [packages/core/src/l0/spi/quota.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L81) |
| `scope.tenant?` | `string` | - | [packages/core/src/l0/spi/quota.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L77) |
| <a id="property-tenant"></a> `tenant?` | `string` | The tenant of the reservation: the engine's configured tenant, or the run scope's under `quota.tenantFrom: 'scope'` (RV4205); absent when neither names one. | [packages/core/src/l0/spi/quota.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L70) |
