[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / invoiceFromJournal

# Function: invoiceFromJournal()

```ts
function invoiceFromJournal(
   entries, 
   priceUsd, 
   options?): InvoiceExport;
```

Defined in: `packages/core/dist/index.d.ts`

The pure invoice fold. Pass the same entries and price table you
would pass `costReportFromJournal`; the totals are that report's
gross/net split verbatim. To make the export historically stable
against price-table updates, pass the priceUsd rebuilt by
`journalPricingSnapshot` and declare it via `options.pricing` (RV407);
without a snapshot the fold prices at the current table's rates,
exactly as before.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `priceUsd` | (`servedBy`, `usage`, `seq?`) => `number` \| `undefined` |
| `options?` | \{ `pricing?`: [`InvoicePricingProvenance`](/api/@rulvar/rulvar/interfaces/InvoicePricingProvenance.md); \} |
| `options.pricing?` | [`InvoicePricingProvenance`](/api/@rulvar/rulvar/interfaces/InvoicePricingProvenance.md) |

## Returns

[`InvoiceExport`](/api/@rulvar/rulvar/interfaces/InvoiceExport.md)
