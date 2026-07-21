[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / filterClaimsForRun

# Function: filterClaimsForRun()

```ts
function filterClaimsForRun(claims, options): ModelClaim[];
```

Defined in: [packages/core/src/knowledge/card.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/card.ts#L76)

The admission filter: status active, unexpired at
`now`, and the subject reachable through the run's declared ladders
after the role-floor filter.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md)[] |
| `options` | \{ `floors?`: [`QualityFloors`](/api/@rulvar/core/interfaces/QualityFloors.md); `ladders`: readonly [`DeclaredLadder`](/api/@rulvar/core/interfaces/DeclaredLadder.md)[]; `now`: `string`; \} |
| `options.floors?` | [`QualityFloors`](/api/@rulvar/core/interfaces/QualityFloors.md) |
| `options.ladders` | readonly [`DeclaredLadder`](/api/@rulvar/core/interfaces/DeclaredLadder.md)[] |
| `options.now` | `string` |

## Returns

[`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md)[]
