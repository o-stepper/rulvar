[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / quotaRuleKey

# Function: quotaRuleKey()

```ts
function quotaRuleKey(rule): string;
```

Defined in: `packages/core/dist/index.d.ts`

The canonical content key of one rule (RV608, promoted from the
store limiters): a fixed-field-order JSON of the rule, identical
across processes and hosts for identical rules. It is the bucket key
of both store references, the input of
`quotaRulesFingerprint`, and the CANONICAL ORDER every reference
limiter folds denials in, so equal rule sets produce byte-identical
refusal objects regardless of array permutation.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rule` | [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md) |

## Returns

`string`
