[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / filterClaimsForRun

# Function: filterClaimsForRun()

```ts
function filterClaimsForRun(claims, options): ModelClaim[];
```

Defined in: `packages/core/dist/index.d.ts`

The admission filter: status active, unexpired at
`now`, and the subject reachable through the run's declared ladders
after the role-floor filter.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md)[] |
| `options` | \{ `floors?`: [`QualityFloors`](/api/@rulvar/rulvar/interfaces/QualityFloors.md); `ladders`: readonly [`DeclaredLadder`](/api/@rulvar/rulvar/interfaces/DeclaredLadder.md)[]; `now`: `string`; \} |
| `options.floors?` | [`QualityFloors`](/api/@rulvar/rulvar/interfaces/QualityFloors.md) |
| `options.ladders` | readonly [`DeclaredLadder`](/api/@rulvar/rulvar/interfaces/DeclaredLadder.md)[] |
| `options.now` | `string` |

## Returns

[`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md)[]
