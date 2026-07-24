[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EngineQuotaRuntime

# Interface: EngineQuotaRuntime

Defined in: `packages/core/dist/index.d.ts`

The resolved engine-side quota runtime threaded into every run.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-limiter"></a> `limiter` | [`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md) | `packages/core/dist/index.d.ts` |
| <a id="property-onlimitererror"></a> `onLimiterError` | `"allow"` \| `"deny"` | `packages/core/dist/index.d.ts` |
| <a id="property-tenant"></a> `tenant?` | `string` | `packages/core/dist/index.d.ts` |
