[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / reconcileStatement

# Function: reconcileStatement()

```ts
function reconcileStatement(
   invoice, 
   statement, 
   options): StatementReconciliation;
```

Defined in: [packages/core/src/engine/reconcile-statement.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L253)

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
| `invoice` | \{ `rows`: readonly [`InvoiceRow`](/api/@rulvar/core/interfaces/InvoiceRow.md)[]; \} |
| `invoice.rows` | readonly [`InvoiceRow`](/api/@rulvar/core/interfaces/InvoiceRow.md)[] |
| `statement` | [`ProviderStatement`](/api/@rulvar/core/type-aliases/ProviderStatement.md) |
| `options` | [`ReconcileStatementOptions`](/api/@rulvar/core/interfaces/ReconcileStatementOptions.md) |

## Returns

[`StatementReconciliation`](/api/@rulvar/core/interfaces/StatementReconciliation.md)
