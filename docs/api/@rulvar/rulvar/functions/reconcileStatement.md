[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / reconcileStatement

# Function: reconcileStatement()

```ts
function reconcileStatement(
   invoice, 
   statement, 
   options): StatementReconciliation;
```

Defined in: `packages/core/dist/index.d.ts`

Reconciles the invoice against a normalized provider export. Pure and
journal-free; see the module doc for the contract. Throws a typed
ConfigError on inputs that cannot be evidence: an empty statement (a
headline total with no rows), a request row without a response id, a
duplicate response id (an ambiguous join), a request export whose
rows carry neither dollars, components, nor usage, any non-finite or
negative dollar amount, any non-integer or negative token count, a
non-finite or negative tolerance (RV903: a statement that cannot
be summed must refuse loudly, never verdict 'match' on NaN totals),
or a row whose usd and componentsUsd contradict each other beyond
totalToleranceUsd (RV1005: an internally contradictory export is
not evidence either).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `invoice` | \{ `rows`: readonly [`InvoiceRow`](/api/@rulvar/rulvar/interfaces/InvoiceRow.md)[]; \} |
| `invoice.rows` | readonly [`InvoiceRow`](/api/@rulvar/rulvar/interfaces/InvoiceRow.md)[] |
| `statement` | [`ProviderStatement`](/api/@rulvar/rulvar/type-aliases/ProviderStatement.md) |
| `options` | [`ReconcileStatementOptions`](/api/@rulvar/rulvar/interfaces/ReconcileStatementOptions.md) |

## Returns

[`StatementReconciliation`](/api/@rulvar/rulvar/interfaces/StatementReconciliation.md)
