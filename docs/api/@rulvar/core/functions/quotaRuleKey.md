[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / quotaRuleKey

# Function: quotaRuleKey()

```ts
function quotaRuleKey(rule): string;
```

Defined in: [packages/core/src/model/quota.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L101)

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
| `rule` | [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md) |

## Returns

`string`
