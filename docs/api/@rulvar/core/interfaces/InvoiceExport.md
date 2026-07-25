[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvoiceExport

# Interface: InvoiceExport

Defined in: [packages/core/src/engine/invoice.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L97)

The machine-readable invoice: rows plus the ledger totals.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandonedusd"></a> `abandonedUsd` | `number` | The abandoned share: totalUsd - netUsd, equals CostReport.abandoned.usd. | [packages/core/src/engine/invoice.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L104) |
| <a id="property-netusd"></a> `netUsd` | `number` | The net ledger (abandoned subtrees contribute zero): equals CostReport.totalUsd. | [packages/core/src/engine/invoice.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L102) |
| <a id="property-pricingbasis"></a> `pricingBasis` | `"per-call"` | How per-row `usd` was computed: each call priced individually at the current table's rates. Always `'per-call'` today; declared so finance tooling never has to guess the basis. | [packages/core/src/engine/invoice.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L110) |
| <a id="property-reconciliationfailures"></a> `reconciliationFailures` | `number` | Rows whose reconciliation is not 'provider-id-present'. | [packages/core/src/engine/invoice.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L121) |
| <a id="property-rows"></a> `rows` | [`InvoiceRow`](/api/@rulvar/core/interfaces/InvoiceRow.md)[] | - | [packages/core/src/engine/invoice.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L98) |
| <a id="property-rowusdnonadditive"></a> `rowUsdNonAdditive` | `true` | Always true: per-call `usd` values need not sum to `totalUsd`, because a nonlinear price table prices an aggregate differently from the sum of its parts. Sum `allocatedUsd` instead; it exists precisely so a column sums to the total. | [packages/core/src/engine/invoice.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L117) |
| <a id="property-totalusd"></a> `totalUsd` | `number` | Every priced terminal slice, abandonment included: equals CostReport.grossUsd. | [packages/core/src/engine/invoice.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L100) |
| <a id="property-unpriced"></a> `unpriced` | \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}[] | Usage on models absent from pricing, net and abandoned alike; never a silent zero. | [packages/core/src/engine/invoice.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L119) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | Present and true when any contributing entry carried approximate usage. | [packages/core/src/engine/invoice.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L125) |
| <a id="property-usageunknownrows"></a> `usageUnknownRows?` | `number` | Rows carrying `usageUnknown`; present when at least one does. | [packages/core/src/engine/invoice.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L123) |
