[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / InvoiceExport

# Interface: InvoiceExport

Defined in: `packages/core/dist/index.d.ts`

The machine-readable invoice: rows plus the ledger totals.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandonedusd"></a> `abandonedUsd` | `number` | The abandoned share: totalUsd - netUsd, equals CostReport.abandoned.usd. | `packages/core/dist/index.d.ts` |
| <a id="property-netusd"></a> `netUsd` | `number` | The net ledger (abandoned subtrees contribute zero): equals CostReport.totalUsd. | `packages/core/dist/index.d.ts` |
| <a id="property-pricingbasis"></a> `pricingBasis` | `"per-call"` | How per-row `usd` was computed: each call priced individually at the current table's rates. Always `'per-call'` today; declared so finance tooling never has to guess the basis. | `packages/core/dist/index.d.ts` |
| <a id="property-reconciliationfailures"></a> `reconciliationFailures` | `number` | Rows whose reconciliation is not 'provider-id-present'. | `packages/core/dist/index.d.ts` |
| <a id="property-rows"></a> `rows` | [`InvoiceRow`](/api/@rulvar/rulvar/interfaces/InvoiceRow.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-rowusdnonadditive"></a> `rowUsdNonAdditive` | `true` | Always true: per-call `usd` values need not sum to `totalUsd`, because a nonlinear price table prices an aggregate differently from the sum of its parts. Sum `allocatedUsd` instead; it exists precisely so a column sums to the total. | `packages/core/dist/index.d.ts` |
| <a id="property-totalusd"></a> `totalUsd` | `number` | Every priced terminal slice, abandonment included: equals CostReport.grossUsd. | `packages/core/dist/index.d.ts` |
| <a id="property-unpriced"></a> `unpriced` | \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md); \}[] | Usage on models absent from pricing, net and abandoned alike; never a silent zero. | `packages/core/dist/index.d.ts` |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | Present and true when any contributing entry carried approximate usage. | `packages/core/dist/index.d.ts` |
| <a id="property-usageunknownrows"></a> `usageUnknownRows?` | `number` | Rows carrying `usageUnknown`; present when at least one does. | `packages/core/dist/index.d.ts` |
