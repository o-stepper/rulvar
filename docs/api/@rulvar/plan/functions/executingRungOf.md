[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / executingRungOf

# Function: executingRungOf()

```ts
function executingRungOf(
   ladder, 
   startTier, 
   raises): number;
```

Defined in: [packages/plan/src/ladder.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L75)

The rung an attempt executes on: the clamped start tier plus the
journaled raise count, hard-clamped at the top rung. `rungIndex` per
lineage is strictly monotone; there are no demotions.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `ladder` | [`CanonicalLadderSpec`](/api/@rulvar/rulvar/interfaces/CanonicalLadderSpec.md) |
| `startTier` | `number` |
| `raises` | `number` |

## Returns

`number`
