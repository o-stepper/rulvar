[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvoiceRow

# Interface: InvoiceRow

Defined in: [packages/core/src/engine/invoice.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L37)

One billable provider call (or an unattributed usage remainder).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandoned"></a> `abandoned?` | `true` | The row lies under an abandoned subtree: in grossUsd, not in netUsd. | [packages/core/src/engine/invoice.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L55) |
| <a id="property-attempt"></a> `attempt?` | `number` | 1-based try number on the serving target (retries increment it). | [packages/core/src/engine/invoice.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L47) |
| <a id="property-entryseq"></a> `entrySeq` | `number` | The terminal journal entry the row folds from. | [packages/core/src/engine/invoice.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L39) |
| <a id="property-key"></a> `key` | `string` | - | [packages/core/src/engine/invoice.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L41) |
| <a id="property-ordinal"></a> `ordinal` | `number` | The call's dispatch ordinal within its invocation; remainder and slice rows continue past it. | [packages/core/src/engine/invoice.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L43) |
| <a id="property-outcome"></a> `outcome` | `"error"` \| `"ok"` \| `"aborted"` \| `"unattributed"` | - | [packages/core/src/engine/invoice.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L48) |
| <a id="property-reconciliation"></a> `reconciliation` | [`InvoiceReconciliation`](/api/@rulvar/core/type-aliases/InvoiceReconciliation.md) | - | [packages/core/src/engine/invoice.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L56) |
| <a id="property-responseid"></a> `responseId?` | `string` | - | [packages/core/src/engine/invoice.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L49) |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/engine/invoice.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L45) |
| <a id="property-scope"></a> `scope` | `string` | - | [packages/core/src/engine/invoice.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L40) |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | - | [packages/core/src/engine/invoice.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L44) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/engine/invoice.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L50) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | - | [packages/core/src/engine/invoice.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L51) |
| <a id="property-usd"></a> `usd?` | `number` | This row priced at its own model's rate; absent when no price row covers it. | [packages/core/src/engine/invoice.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L53) |
