[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvoiceRow

# Interface: InvoiceRow

Defined in: [packages/core/src/engine/invoice.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L54)

One billable provider call (or an unattributed usage remainder).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandoned"></a> `abandoned?` | `true` | The row lies under an abandoned subtree: in grossUsd, not in netUsd. | [packages/core/src/engine/invoice.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L81) |
| <a id="property-allocatedusd"></a> `allocatedUsd` | `number` | The additive FinOps column: this row's share of `totalUsd`, always present (zero for rows on unpriced models). Shares are computed within the row's own (entry, serving model) slice of the same gross fold the totals run, proportional to per-row `usd`, and one row absorbs the IEEE rounding dust, so summing `allocatedUsd` over `rows` reproduces `totalUsd` exactly where summing `usd` does not. | [packages/core/src/engine/invoice.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L79) |
| <a id="property-attempt"></a> `attempt?` | `number` | 1-based try number on the serving target (retries increment it). | [packages/core/src/engine/invoice.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L64) |
| <a id="property-entryseq"></a> `entrySeq` | `number` | The terminal journal entry the row folds from. | [packages/core/src/engine/invoice.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L56) |
| <a id="property-key"></a> `key` | `string` | - | [packages/core/src/engine/invoice.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L58) |
| <a id="property-ordinal"></a> `ordinal` | `number` | The call's dispatch ordinal within its invocation; remainder and slice rows continue past it. | [packages/core/src/engine/invoice.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L60) |
| <a id="property-outcome"></a> `outcome` | `"error"` \| `"ok"` \| `"aborted"` \| `"unattributed"` | - | [packages/core/src/engine/invoice.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L65) |
| <a id="property-reconciliation"></a> `reconciliation` | [`InvoiceReconciliation`](/api/@rulvar/core/type-aliases/InvoiceReconciliation.md) | - | [packages/core/src/engine/invoice.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L82) |
| <a id="property-responseid"></a> `responseId?` | `string` | - | [packages/core/src/engine/invoice.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L66) |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/engine/invoice.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L62) |
| <a id="property-scope"></a> `scope` | `string` | - | [packages/core/src/engine/invoice.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L57) |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | - | [packages/core/src/engine/invoice.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L61) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/engine/invoice.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L67) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | - | [packages/core/src/engine/invoice.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L68) |
| <a id="property-usd"></a> `usd?` | `number` | This row priced at its own model's rate; absent when no price row covers it. | [packages/core/src/engine/invoice.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L70) |
