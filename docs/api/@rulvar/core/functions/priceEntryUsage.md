[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / priceEntryUsage

# Function: priceEntryUsage()

```ts
function priceEntryUsage(entry, priceUsd): PricedUsage;
```

Defined in: [packages/core/src/l0/entries.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L127)

The single pricing fold over one terminal entry, shared by the kernel
ledger and the CostReport fold so a run's total and its per-model
breakdown can never disagree. Each slice is priced at ITS OWN model's
rate.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |
| `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` |

## Returns

[`PricedUsage`](/api/@rulvar/core/interfaces/PricedUsage.md)
