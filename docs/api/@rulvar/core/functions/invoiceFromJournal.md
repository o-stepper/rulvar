[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / invoiceFromJournal

# Function: invoiceFromJournal()

```ts
function invoiceFromJournal(
   entries, 
   priceUsd, 
   options?): InvoiceExport;
```

Defined in: [packages/core/src/engine/invoice.ts:512](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L512)

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
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |
| `priceUsd` | (`servedBy`, `usage`, `seq?`) => `number` \| `undefined` |
| `options?` | \{ `pricing?`: [`InvoicePricingProvenance`](/api/@rulvar/core/interfaces/InvoicePricingProvenance.md); \} |
| `options.pricing?` | [`InvoicePricingProvenance`](/api/@rulvar/core/interfaces/InvoicePricingProvenance.md) |

## Returns

[`InvoiceExport`](/api/@rulvar/core/interfaces/InvoiceExport.md)
