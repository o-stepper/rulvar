[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / findContradictions

# Function: findContradictions()

```ts
function findContradictions(rows, options?): Contradiction[];
```

Defined in: `packages/core/dist/index.d.ts`

Folds the settled children's outputs into the contradictions they
hold against each other. Pure and deterministic: the output depends
only on the input order and bytes, so a resumed run re-derives it
without journaling anything.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rows` | readonly [`ContradictionSource`](/api/@rulvar/rulvar/interfaces/ContradictionSource.md)[] |
| `options?` | [`ContradictionOptions`](/api/@rulvar/rulvar/interfaces/ContradictionOptions.md) |

## Returns

[`Contradiction`](/api/@rulvar/rulvar/interfaces/Contradiction.md)[]
