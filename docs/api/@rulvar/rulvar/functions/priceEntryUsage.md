[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / priceEntryUsage

# Function: priceEntryUsage()

```ts
function priceEntryUsage(entry, priceUsd): PricedUsage;
```

Defined in: `packages/core/dist/index.d.ts`

The single pricing fold over one terminal entry, shared by the kernel
ledger and the CostReport fold so a run's total and its per-model
breakdown can never disagree. Each slice is priced at ITS OWN model's
rate. A price function returning NaN or a negative amount (a broken
user-supplied rate) is treated exactly like a missing row: the slice
folds as unpriced instead of poisoning or crediting the totals
(v1.20.0 review follow-up).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |
| `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` |

## Returns

[`PricedUsage`](/api/@rulvar/rulvar/interfaces/PricedUsage.md)
