[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / repairLedgerFromJournal

# Function: repairLedgerFromJournal()

```ts
function repairLedgerFromJournal(entries, priceUsd?): RepairLedger;
```

Defined in: `packages/core/dist/index.d.ts`

Folds the workflow-wide repair ledger from a journal (RV4002). Pure
over the entries, so the acceptance envelope's live aggregate
(computed from the run's own snapshot at assembly) and a post-hoc
fold over the persisted journal agree by construction on every
count and row identity; `wireRef`/`costUsd` enrich rows exactly when
the asynchronous billing lane covered them.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` |

## Returns

[`RepairLedger`](/api/@rulvar/rulvar/interfaces/RepairLedger.md)
