[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / QuotaRule

# Interface: QuotaRule

Defined in: [packages/core/src/model/quota.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L39)

One shared-quota rule. The dimension fields select which requests
the rule governs (an absent dimension matches every value); EVERY
matching rule must admit a request, and a grant consumes capacity
from each of them. The counters are rule-scoped: one rule matching
two models pools them under one cap; write one rule per model for
per-model buckets.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model?` | `string` | - | [packages/core/src/model/quota.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L42) |
| <a id="property-provider"></a> `provider?` | `string` | Adapter id, as in `concurrency.perProvider` keys. | [packages/core/src/model/quota.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L41) |
| <a id="property-requestsperminute"></a> `requestsPerMinute?` | `number` | Wire attempts admitted per window; the exact, hard cap. | [packages/core/src/model/quota.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L45) |
| <a id="property-tenant"></a> `tenant?` | `string` | - | [packages/core/src/model/quota.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L43) |
| <a id="property-tokensperminute"></a> `tokensPerMinute?` | `number` | Input plus output tokens admitted per window: estimated at admission, reconciled to actual usage. | [packages/core/src/model/quota.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L50) |
