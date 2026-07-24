[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / validateQuotaRules

# Function: validateQuotaRules()

```ts
function validateQuotaRules(rules, site?): void;
```

Defined in: [packages/core/src/model/quota.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L59)

Validates a quota rule set as a typed ConfigError before any
limiter can admit under it: a non-array or empty set, a rule
without a cap, a malformed dimension, or a malformed cap all fail
loud at construction. Shared by every reference implementation.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `rules` | readonly [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md)[] | `undefined` |
| `site` | `string` | `'quota rules'` |

## Returns

`void`
