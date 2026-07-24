[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EngineQuotaRuntime

# Interface: EngineQuotaRuntime

Defined in: [packages/core/src/model/quota.ts:328](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L328)

The resolved engine-side quota runtime threaded into every run.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-limiter"></a> `limiter` | [`QuotaLimiter`](/api/@rulvar/core/interfaces/QuotaLimiter.md) | [packages/core/src/model/quota.ts:329](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L329) |
| <a id="property-onlimitererror"></a> `onLimiterError` | `"allow"` \| `"deny"` | [packages/core/src/model/quota.ts:331](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L331) |
| <a id="property-tenant"></a> `tenant?` | `string` | [packages/core/src/model/quota.ts:330](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L330) |
