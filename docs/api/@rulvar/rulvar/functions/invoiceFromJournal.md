[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / invoiceFromJournal

# Function: invoiceFromJournal()

```ts
function invoiceFromJournal(entries, priceUsd): InvoiceExport;
```

Defined in: `packages/core/dist/index.d.ts`

The pure invoice fold. Pass the same entries and price table you
would pass `costReportFromJournal`; the totals are that report's
gross/net split verbatim.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` |

## Returns

[`InvoiceExport`](/api/@rulvar/rulvar/interfaces/InvoiceExport.md)
