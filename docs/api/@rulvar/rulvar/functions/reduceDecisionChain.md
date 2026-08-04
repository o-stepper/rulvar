[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / reduceDecisionChain

# Function: reduceDecisionChain()

```ts
function reduceDecisionChain(entries): DecisionChainRow[];
```

Defined in: `packages/core/dist/index.d.ts`

Folds a run's entries into its decision chain: the seq-ordered
authority records only. Input order is not trusted; rows sort by seq
ascending, the journal's own total order.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

## Returns

[`DecisionChainRow`](/api/@rulvar/rulvar/interfaces/DecisionChainRow.md)[]
