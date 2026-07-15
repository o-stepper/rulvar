[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / costReportFromJournal

# Function: costReportFromJournal()

```ts
function costReportFromJournal(entries, priceUsd): CostReport;
```

Defined in: [packages/core/src/engine/cost-report.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/cost-report.ts#L81)

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
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |
| `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` |

## Returns

[`CostReport`](/api/@rulvar/core/interfaces/CostReport.md)
