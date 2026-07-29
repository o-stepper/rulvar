[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvoiceRow

# Interface: InvoiceRow

Defined in: [packages/core/src/engine/invoice.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L63)

One billable provider call (or an unattributed usage remainder).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandoned"></a> `abandoned?` | `true` | The row lies under an abandoned subtree: in grossUsd, not in netUsd. | [packages/core/src/engine/invoice.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L101) |
| <a id="property-allocatedusd"></a> `allocatedUsd` | `number` | The additive FinOps column: this row's share of `totalUsd`, always present (zero for rows on unpriced models). Shares are computed within the row's own (entry, serving model) slice of the same gross fold the totals run, proportional to per-row `usd`, and one row absorbs the IEEE rounding dust, so summing `allocatedUsd` over `rows` reproduces `totalUsd` exactly where summing `usd` does not. | [packages/core/src/engine/invoice.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L99) |
| <a id="property-attempt"></a> `attempt?` | `number` | 1-based try number on the serving target (retries increment it). | [packages/core/src/engine/invoice.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L73) |
| <a id="property-entryseq"></a> `entrySeq` | `number` | The terminal journal entry the row folds from. | [packages/core/src/engine/invoice.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L65) |
| <a id="property-key"></a> `key` | `string` | - | [packages/core/src/engine/invoice.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L67) |
| <a id="property-ordinal"></a> `ordinal` | `number` | The call's dispatch ordinal within its invocation; remainder and slice rows continue past it. | [packages/core/src/engine/invoice.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L69) |
| <a id="property-outcome"></a> `outcome` | `"error"` \| `"ok"` \| `"aborted"` \| `"unattributed"` | - | [packages/core/src/engine/invoice.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L74) |
| <a id="property-reconciliation"></a> `reconciliation` | [`InvoiceReconciliation`](/api/@rulvar/core/type-aliases/InvoiceReconciliation.md) | - | [packages/core/src/engine/invoice.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L102) |
| <a id="property-responseid"></a> `responseId?` | `string` | - | [packages/core/src/engine/invoice.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L75) |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/engine/invoice.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L71) |
| <a id="property-scope"></a> `scope` | `string` | - | [packages/core/src/engine/invoice.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L66) |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | - | [packages/core/src/engine/invoice.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L70) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/engine/invoice.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L76) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | - | [packages/core/src/engine/invoice.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L77) |
| <a id="property-usageunknown"></a> `usageUnknown?` | `true` | Present and true when this `unconfirmed` row recorded ZERO usage on every counter (the v1.71 experiment review, P1.4): a failed attempt whose usage this ledger never saw. The zeros mean "nothing recorded", never "the provider metered nothing": the provider may have billed prompt processing before the failure, so a statement join must treat this row's usage as unknown, not as zero. Derived at export time from the journaled record; rows with any recorded usage, and every other verdict, never carry it. | [packages/core/src/engine/invoice.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L88) |
| <a id="property-usd"></a> `usd?` | `number` | This row priced at its own model's rate; absent when no price row covers it. | [packages/core/src/engine/invoice.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L90) |
