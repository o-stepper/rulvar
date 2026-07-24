[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvoiceExport

# Interface: InvoiceExport

Defined in: [packages/core/src/engine/invoice.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L60)

The machine-readable invoice: rows plus the ledger totals.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandonedusd"></a> `abandonedUsd` | `number` | The abandoned share: totalUsd - netUsd, equals CostReport.abandoned.usd. | [packages/core/src/engine/invoice.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L67) |
| <a id="property-netusd"></a> `netUsd` | `number` | The net ledger (abandoned subtrees contribute zero): equals CostReport.totalUsd. | [packages/core/src/engine/invoice.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L65) |
| <a id="property-reconciliationfailures"></a> `reconciliationFailures` | `number` | Rows whose reconciliation is not 'matched'. | [packages/core/src/engine/invoice.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L71) |
| <a id="property-rows"></a> `rows` | [`InvoiceRow`](/api/@rulvar/core/interfaces/InvoiceRow.md)[] | - | [packages/core/src/engine/invoice.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L61) |
| <a id="property-totalusd"></a> `totalUsd` | `number` | Every priced terminal slice, abandonment included: equals CostReport.grossUsd. | [packages/core/src/engine/invoice.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L63) |
| <a id="property-unpriced"></a> `unpriced` | \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}[] | Usage on models absent from pricing, net and abandoned alike; never a silent zero. | [packages/core/src/engine/invoice.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L69) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | Present and true when any contributing entry carried approximate usage. | [packages/core/src/engine/invoice.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L73) |
