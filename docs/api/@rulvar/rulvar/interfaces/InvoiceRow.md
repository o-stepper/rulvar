[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / InvoiceRow

# Interface: InvoiceRow

Defined in: `packages/core/dist/index.d.ts`

One billable provider call (or an unattributed usage remainder).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandoned"></a> `abandoned?` | `true` | The row lies under an abandoned subtree: in grossUsd, not in netUsd. | `packages/core/dist/index.d.ts` |
| <a id="property-allocatedusd"></a> `allocatedUsd` | `number` | The additive FinOps column: this row's share of `totalUsd`, always present (zero for rows on unpriced models). Shares are computed within the row's own (entry, serving model) slice of the same gross fold the totals run, proportional to per-row `usd`, and one row absorbs the IEEE rounding dust, so summing `allocatedUsd` over `rows` reproduces `totalUsd` exactly where summing `usd` does not. | `packages/core/dist/index.d.ts` |
| <a id="property-attempt"></a> `attempt?` | `number` | 1-based try number on the serving target (retries increment it). | `packages/core/dist/index.d.ts` |
| <a id="property-entryseq"></a> `entrySeq` | `number` | The terminal journal entry the row folds from. | `packages/core/dist/index.d.ts` |
| <a id="property-key"></a> `key` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-ordinal"></a> `ordinal` | `number` | The call's dispatch ordinal within its invocation; remainder and slice rows continue past it. | `packages/core/dist/index.d.ts` |
| <a id="property-outcome"></a> `outcome` | `"ok"` \| `"error"` \| `"aborted"` \| `"unattributed"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-reconciliation"></a> `reconciliation` | [`InvoiceReconciliation`](/api/@rulvar/rulvar/type-aliases/InvoiceReconciliation.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-responseid"></a> `responseId?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | - | `packages/core/dist/index.d.ts` |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-usd"></a> `usd?` | `number` | This row priced at its own model's rate; absent when no price row covers it. | `packages/core/dist/index.d.ts` |
