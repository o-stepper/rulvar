[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / quotaRuleMatches

# Function: quotaRuleMatches()

```ts
function quotaRuleMatches(rule, request): boolean;
```

Defined in: [packages/core/src/model/quota.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L91)

True when every dimension the rule pins matches the request.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rule` | [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md) |
| `request` | [`QuotaReservationRequest`](/api/@rulvar/core/interfaces/QuotaReservationRequest.md) |

## Returns

`boolean`
