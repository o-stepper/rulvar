[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / reduceDecisionChain

# Function: reduceDecisionChain()

```ts
function reduceDecisionChain(entries): DecisionChainRow[];
```

Defined in: [packages/core/src/l0/decision-chain.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/decision-chain.ts#L80)

Folds a run's entries into its decision chain: the seq-ordered
authority records only. Input order is not trusted; rows sort by seq
ascending, the journal's own total order.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |

## Returns

[`DecisionChainRow`](/api/@rulvar/core/interfaces/DecisionChainRow.md)[]
