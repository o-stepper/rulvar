[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / quotaRuleMatches

# Function: quotaRuleMatches()

```ts
function quotaRuleMatches(rule, request): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

True when every dimension the rule pins matches the request.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rule` | [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md) |
| `request` | [`QuotaReservationRequest`](/api/@rulvar/rulvar/interfaces/QuotaReservationRequest.md) |

## Returns

`boolean`
