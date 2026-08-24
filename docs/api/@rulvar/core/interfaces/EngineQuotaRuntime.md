[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EngineQuotaRuntime

# Interface: EngineQuotaRuntime

Defined in: [packages/core/src/model/quota.ts:596](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L596)

The resolved engine-side quota runtime threaded into every run.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-declaredrules"></a> `declaredRules?` | readonly [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md)[] | The declared rule mirror for drift telemetry; see [EngineQuotaConfig](/api/@rulvar/core/interfaces/EngineQuotaConfig.md). | [packages/core/src/model/quota.ts:607](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L607) |
| <a id="property-limiter"></a> `limiter` | [`QuotaLimiter`](/api/@rulvar/core/interfaces/QuotaLimiter.md) | - | [packages/core/src/model/quota.ts:597](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L597) |
| <a id="property-maxdenials"></a> `maxDenials` | `number` | The per-target denial retry budget (RV1601); see [EngineQuotaConfig](/api/@rulvar/core/interfaces/EngineQuotaConfig.md). | [packages/core/src/model/quota.ts:605](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L605) |
| <a id="property-onlimitererror"></a> `onLimiterError` | `"allow"` \| `"deny"` | - | [packages/core/src/model/quota.ts:601](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L601) |
| <a id="property-reservecontinuations"></a> `reserveContinuations` | `boolean` | Pre-wire continuation admission (RV1013); see [EngineQuotaConfig](/api/@rulvar/core/interfaces/EngineQuotaConfig.md). | [packages/core/src/model/quota.ts:603](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L603) |
| <a id="property-tenant"></a> `tenant?` | `string` | - | [packages/core/src/model/quota.ts:598](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L598) |
| <a id="property-tenantfrom"></a> `tenantFrom?` | `"scope"` \| `"engine"` | Where the reservation tenant comes from (RV4205); absent reads 'engine'. | [packages/core/src/model/quota.ts:600](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L600) |
