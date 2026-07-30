[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / reconcileStatement

# Function: reconcileStatement()

```ts
function reconcileStatement(
   invoice, 
   statement, 
   options): StatementReconciliation;
```

Defined in: [packages/openai/src/reconcile.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L169)

Reconciles the invoice against a normalized provider export. Pure and
journal-free; see the module doc for the contract. Throws a typed
ConfigError on inputs that cannot be evidence: an empty statement (a
headline total with no rows), a request row without a response id, a
duplicate response id (an ambiguous join), or a request export whose
rows carry neither dollars, components, nor usage.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `invoice` | \{ `rows`: readonly [`InvoiceRow`](/api/@rulvar/rulvar/interfaces/InvoiceRow.md)[]; \} |
| `invoice.rows` | readonly [`InvoiceRow`](/api/@rulvar/rulvar/interfaces/InvoiceRow.md)[] |
| `statement` | [`ProviderStatement`](/api/@rulvar/openai/type-aliases/ProviderStatement.md) |
| `options` | [`ReconcileStatementOptions`](/api/@rulvar/openai/interfaces/ReconcileStatementOptions.md) |

## Returns

[`StatementReconciliation`](/api/@rulvar/openai/interfaces/StatementReconciliation.md)
