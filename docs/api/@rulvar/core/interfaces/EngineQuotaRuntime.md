[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EngineQuotaRuntime

# Interface: EngineQuotaRuntime

Defined in: [packages/core/src/model/quota.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L347)

The resolved engine-side quota runtime threaded into every run.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-declaredrules"></a> `declaredRules?` | readonly [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md)[] | The declared rule mirror for drift telemetry; see [EngineQuotaConfig](/api/@rulvar/core/interfaces/EngineQuotaConfig.md). | [packages/core/src/model/quota.ts:352](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L352) |
| <a id="property-limiter"></a> `limiter` | [`QuotaLimiter`](/api/@rulvar/core/interfaces/QuotaLimiter.md) | - | [packages/core/src/model/quota.ts:348](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L348) |
| <a id="property-onlimitererror"></a> `onLimiterError` | `"allow"` \| `"deny"` | - | [packages/core/src/model/quota.ts:350](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L350) |
| <a id="property-tenant"></a> `tenant?` | `string` | - | [packages/core/src/model/quota.ts:349](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L349) |
