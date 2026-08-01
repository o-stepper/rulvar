[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / foldLedger

# Function: foldLedger()

```ts
function foldLedger(
   entries, 
   abandonFold, 
   priceUsd?): Ledger;
```

Defined in: `packages/core/dist/index.d.ts`

The budget ledger fold as a PURE function over entries (extracted in
RV1209 so an offline reader folds the identical arithmetic instead
of a lookalike): usage sums over terminal entries once, never twice;
agentsSpawned counts agent dispatches. Dollars fold on the settled
billing basis (RV801): per provider call where the entry's records
cover its usage, the per-slice aggregate otherwise, the same basis
as the CostReport and the invoice.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `abandonFold` | [`AbandonFold`](/api/@rulvar/rulvar/interfaces/AbandonFold.md) |
| `priceUsd?` | (`servedBy`, `usage`, `seq?`) => `number` \| `undefined` |

## Returns

[`Ledger`](/api/@rulvar/rulvar/interfaces/Ledger.md)
