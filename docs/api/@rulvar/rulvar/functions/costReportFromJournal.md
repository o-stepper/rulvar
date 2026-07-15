[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / costReportFromJournal

# Function: costReportFromJournal()

```ts
function costReportFromJournal(entries, priceUsd): CostReport;
```

Defined in: `packages/core/dist/index.d.ts`

The pure journal fold: the complete CostReport from terminal entries,
the same summation the kernel ledger uses (terminal usage exactly
once, priced per servedBy slice, abandoned subtrees contribute zero).
The orchestrator block folds too: spend attributed to the
orchestrator sub-account, the reserve-funded share of it, the armed
wake count, and the at-cap freeze flag from the journaled cap
decision, so a replay-only resume reproduces the block instead of
reading this process's live accounts (which a replay never charges).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` |

## Returns

[`CostReport`](/api/@rulvar/rulvar/interfaces/CostReport.md)
