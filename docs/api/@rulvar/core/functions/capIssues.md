[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / capIssues

# Function: capIssues()

```ts
function capIssues(claims, cap?): string[];
```

Defined in: [packages/core/src/knowledge/claims.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/claims.ts#L209)

The commit-time cap (Appendix A): active claims per
(model, taskClass) after the batch applies. Supersede chains keep
only the head active by construction (applyClaimOps flips the prior
to 'superseded'), so a supersede never grows the count.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md)[] | `undefined` |
| `cap` | `number` | `KB_ACTIVE_CLAIMS_CAP` |

## Returns

`string`[]
