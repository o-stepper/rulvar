[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / validateQuotaRules

# Function: validateQuotaRules()

```ts
function validateQuotaRules(rules, site?): void;
```

Defined in: `packages/core/dist/index.d.ts`

Validates a quota rule set as a typed ConfigError before any
limiter can admit under it: a non-array or empty set, a rule
without a cap, a malformed dimension, or a malformed cap all fail
loud at construction. Shared by every reference implementation.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rules` | readonly [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md)[] |
| `site?` | `string` |

## Returns

`void`
