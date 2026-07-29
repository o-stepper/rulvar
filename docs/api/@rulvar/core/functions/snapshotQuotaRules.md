[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / snapshotQuotaRules

# Function: snapshotQuotaRules()

```ts
function snapshotQuotaRules(rules, site?): readonly QuotaRule[];
```

Defined in: [packages/core/src/model/quota.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L120)

Validates a rule set and returns the immutable snapshot every
reference limiter admits under (RV608): a fresh array of fresh
objects carrying ONLY the known rule fields, each frozen, the array
frozen. The caller's array and objects stay untouched and unshared,
so ordinary JavaScript after the constructor (a pushed rule, a
reassigned cap) can no longer change a decision, a bucket key, or a
recorded fingerprint.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `rules` | readonly [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md)[] | `undefined` |
| `site` | `string` | `'quota rules'` |

## Returns

readonly [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md)[]
