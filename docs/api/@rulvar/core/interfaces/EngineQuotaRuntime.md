[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EngineQuotaRuntime

# Interface: EngineQuotaRuntime

Defined in: [packages/core/src/model/quota.ts:536](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L536)

The resolved engine-side quota runtime threaded into every run.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-declaredrules"></a> `declaredRules?` | readonly [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md)[] | The declared rule mirror for drift telemetry; see [EngineQuotaConfig](/api/@rulvar/core/interfaces/EngineQuotaConfig.md). | [packages/core/src/model/quota.ts:545](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L545) |
| <a id="property-limiter"></a> `limiter` | [`QuotaLimiter`](/api/@rulvar/core/interfaces/QuotaLimiter.md) | - | [packages/core/src/model/quota.ts:537](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L537) |
| <a id="property-maxdenials"></a> `maxDenials` | `number` | The per-target denial retry budget (RV1601); see [EngineQuotaConfig](/api/@rulvar/core/interfaces/EngineQuotaConfig.md). | [packages/core/src/model/quota.ts:543](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L543) |
| <a id="property-onlimitererror"></a> `onLimiterError` | `"allow"` \| `"deny"` | - | [packages/core/src/model/quota.ts:539](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L539) |
| <a id="property-reservecontinuations"></a> `reserveContinuations` | `boolean` | Pre-wire continuation admission (RV1013); see [EngineQuotaConfig](/api/@rulvar/core/interfaces/EngineQuotaConfig.md). | [packages/core/src/model/quota.ts:541](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L541) |
| <a id="property-tenant"></a> `tenant?` | `string` | - | [packages/core/src/model/quota.ts:538](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L538) |
