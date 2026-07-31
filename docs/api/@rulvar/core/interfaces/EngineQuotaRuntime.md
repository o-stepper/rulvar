[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EngineQuotaRuntime

# Interface: EngineQuotaRuntime

Defined in: [packages/core/src/model/quota.ts:514](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L514)

The resolved engine-side quota runtime threaded into every run.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-declaredrules"></a> `declaredRules?` | readonly [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md)[] | The declared rule mirror for drift telemetry; see [EngineQuotaConfig](/api/@rulvar/core/interfaces/EngineQuotaConfig.md). | [packages/core/src/model/quota.ts:521](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L521) |
| <a id="property-limiter"></a> `limiter` | [`QuotaLimiter`](/api/@rulvar/core/interfaces/QuotaLimiter.md) | - | [packages/core/src/model/quota.ts:515](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L515) |
| <a id="property-onlimitererror"></a> `onLimiterError` | `"allow"` \| `"deny"` | - | [packages/core/src/model/quota.ts:517](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L517) |
| <a id="property-reservecontinuations"></a> `reserveContinuations` | `boolean` | Pre-wire continuation admission (RV1013); see [EngineQuotaConfig](/api/@rulvar/core/interfaces/EngineQuotaConfig.md). | [packages/core/src/model/quota.ts:519](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L519) |
| <a id="property-tenant"></a> `tenant?` | `string` | - | [packages/core/src/model/quota.ts:516](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L516) |
