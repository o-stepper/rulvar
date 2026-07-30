[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / snapshotQuotaRules

# Function: snapshotQuotaRules()

```ts
function snapshotQuotaRules(rules, site?): readonly QuotaRule[];
```

Defined in: `packages/core/dist/index.d.ts`

Validates a rule set and returns the immutable snapshot every
reference limiter admits under (RV608): a fresh array of fresh
objects carrying ONLY the known rule fields, each frozen, the array
frozen. The caller's array and objects stay untouched and unshared,
so ordinary JavaScript after the constructor (a pushed rule, a
reassigned cap) can no longer change a decision, a bucket key, or a
recorded fingerprint.

A set containing two rules with the same canonical content key is
refused typed (RV704): the memory reference buckets by rule INDEX
(each copy counts independently, the full cap admits) while the
store references bucket by rule KEY (one shared bucket is debited
once per matching copy, half the cap admits), so the same duplicated
configuration admitted differently per storage. Refusing it at the
shared construction chokepoint is what keeps equal configurations
equal on every storage.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rules` | readonly [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md)[] |
| `site?` | `string` |

## Returns

readonly [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md)[]
