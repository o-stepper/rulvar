[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / invoiceFromJournal

# Function: invoiceFromJournal()

```ts
function invoiceFromJournal(entries, priceUsd): InvoiceExport;
```

Defined in: [packages/core/src/engine/invoice.ts:252](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L252)

The pure invoice fold. Pass the same entries and price table you
would pass `costReportFromJournal`; the totals are that report's
gross/net split verbatim.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |
| `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` |

## Returns

[`InvoiceExport`](/api/@rulvar/core/interfaces/InvoiceExport.md)
