[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / priceEntryBilling

# Function: priceEntryBilling()

```ts
function priceEntryBilling(entry, priceUsd): EntryBillingFold;
```

Defined in: [packages/core/src/l0/entries.ts:414](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L414)

The billing fold over one terminal entry (RV504), shared by the
CostReport and invoice folds so the total, every breakdown, and the
per-row prices can never disagree. Coverage is decided per MODEL with
the symmetric key (RV604): for every model whose per-dispatch
`providerCalls` sum to exactly its usage, each call is priced
individually, so a nonlinear long-context tier fires per REQUEST,
which is the pricing contract's stated semantics; an aggregate that
crossed a threshold no single request crossed no longer re-prices
that model (the ninth-experiment 52% overreport, and the round-52
multi-role default). A model with no records, or records that do not
cover its usage, folds exactly as before: the per-model aggregate
slices of [priceEntryUsage](/api/@rulvar/core/functions/priceEntryUsage.md). `fullyAttributed` is true only
when every slice model is covered and no record names a model absent
from the slices.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |
| `priceUsd` | (`servedBy`, `usage`, `seq?`) => `number` \| `undefined` |

## Returns

[`EntryBillingFold`](/api/@rulvar/core/interfaces/EntryBillingFold.md)
