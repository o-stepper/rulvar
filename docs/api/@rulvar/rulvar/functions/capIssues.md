[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / capIssues

# Function: capIssues()

```ts
function capIssues(claims, cap?): string[];
```

Defined in: `packages/core/dist/index.d.ts`

The commit-time cap (Appendix A): active claims per
(model, taskClass) after the batch applies. Supersede chains keep
only the head active by construction (applyClaimOps flips the prior
to 'superseded'), so a supersede never grows the count.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md)[] |
| `cap?` | `number` |

## Returns

`string`[]
