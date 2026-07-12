[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / costReportFromJournal

# Function: costReportFromJournal()

```ts
function costReportFromJournal(entries, priceUsd): CostReport;
```

Defined in: `packages/core/dist/index.d.ts`

The pure journal fold: byModel and totals from terminal entries, the
same summation the kernel ledger uses (terminal usage exactly once,
priced per servedBy, abandoned subtrees contribute zero).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` |

## Returns

[`CostReport`](/api/@rulvar/rulvar/interfaces/CostReport.md)
