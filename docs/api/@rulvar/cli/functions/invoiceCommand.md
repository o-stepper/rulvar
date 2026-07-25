[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / invoiceCommand

# Function: invoiceCommand()

```ts
function invoiceCommand(argv, context): Promise<number>;
```

Defined in: [packages/cli/src/commands.ts:713](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/commands.ts#L713)

rulvar invoice (P1.3): the per-dispatch reconciliation export from
the journal's providerCalls ledger, one row per billable provider
call with the provider's response id when the adapter surfaced one,
plus the gross/net ledger totals (`totalUsd` here is the GROSS
figure: abandoned subtrees included, exactly what a provider invoice
bills). --json prints the machine-readable InvoiceExport; the text
form prints one line per row and mirrors the export's declared
pricing basis (per-call row usd is non-additive; `allocatedUsd` is
the additive column that sums to gross). Pricing folds at read time
from the assembled price table, the same numbers rulvar inspect
reports.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `argv` | `string`[] |
| `context` | [`CommandContext`](/api/@rulvar/cli/interfaces/CommandContext.md) |

## Returns

`Promise`\&lt;`number`\&gt;
