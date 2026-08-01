[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / findContradictions

# Function: findContradictions()

```ts
function findContradictions(rows, options?): Contradiction[];
```

Defined in: [packages/core/src/orchestrator/contradictions.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/contradictions.ts#L118)

Folds the settled children's outputs into the contradictions they
hold against each other. Pure and deterministic: the output depends
only on the input order and bytes, so a resumed run re-derives it
without journaling anything.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rows` | readonly [`ContradictionSource`](/api/@rulvar/core/interfaces/ContradictionSource.md)[] |
| `options?` | [`ContradictionOptions`](/api/@rulvar/core/interfaces/ContradictionOptions.md) |

## Returns

[`Contradiction`](/api/@rulvar/core/interfaces/Contradiction.md)[]
