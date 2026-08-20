[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EngineQuotaRuntime

# Interface: EngineQuotaRuntime

Defined in: `packages/core/dist/index.d.ts`

The resolved engine-side quota runtime threaded into every run.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-declaredrules"></a> `declaredRules?` | readonly [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md)[] | The declared rule mirror for drift telemetry; see [EngineQuotaConfig](/api/@rulvar/rulvar/interfaces/EngineQuotaConfig.md). | `packages/core/dist/index.d.ts` |
| <a id="property-limiter"></a> `limiter` | [`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-maxdenials"></a> `maxDenials` | `number` | The per-target denial retry budget (RV1601); see [EngineQuotaConfig](/api/@rulvar/rulvar/interfaces/EngineQuotaConfig.md). | `packages/core/dist/index.d.ts` |
| <a id="property-onlimitererror"></a> `onLimiterError` | `"allow"` \| `"deny"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-reservecontinuations"></a> `reserveContinuations` | `boolean` | Pre-wire continuation admission (RV1013); see [EngineQuotaConfig](/api/@rulvar/rulvar/interfaces/EngineQuotaConfig.md). | `packages/core/dist/index.d.ts` |
| <a id="property-tenant"></a> `tenant?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-tenantfrom"></a> `tenantFrom?` | `"engine"` \| `"scope"` | Where the reservation tenant comes from (RV4205); absent reads 'engine'. | `packages/core/dist/index.d.ts` |
