[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / costReportFromJournal

# Function: costReportFromJournal()

```ts
function costReportFromJournal(entries, priceUsd): CostReport;
```

Defined in: [packages/core/src/engine/cost-report.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/cost-report.ts#L67)

The pure journal fold: byModel and totals from terminal entries, the
same summation the kernel ledger uses (terminal usage exactly once,
priced per servedBy, abandoned subtrees contribute zero).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |
| `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` |

## Returns

[`CostReport`](/api/@rulvar/core/interfaces/CostReport.md)
