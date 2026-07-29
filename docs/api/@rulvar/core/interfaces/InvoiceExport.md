[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvoiceExport

# Interface: InvoiceExport

Defined in: [packages/core/src/engine/invoice.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L137)

The machine-readable invoice: rows plus the ledger totals.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandonedusd"></a> `abandonedUsd` | `number` | The abandoned share: totalUsd - netUsd, equals CostReport.abandoned.usd. | [packages/core/src/engine/invoice.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L144) |
| <a id="property-netusd"></a> `netUsd` | `number` | The net ledger (abandoned subtrees contribute zero): equals CostReport.totalUsd. | [packages/core/src/engine/invoice.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L142) |
| <a id="property-pricing"></a> `pricing?` | [`InvoicePricingProvenance`](/api/@rulvar/core/interfaces/InvoicePricingProvenance.md) | The rates provenance (RV407); present when the caller declared it. | [packages/core/src/engine/invoice.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L182) |
| <a id="property-pricingbasis"></a> `pricingBasis` | `"per-call"` | How per-row `usd` was computed: each call priced individually at the current table's rates. Always `'per-call'` today; declared so finance tooling never has to guess the basis. | [packages/core/src/engine/invoice.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L150) |
| <a id="property-reconciliationfailures"></a> `reconciliationFailures` | `number` | Rows whose reconciliation is not 'provider-id-present'. | [packages/core/src/engine/invoice.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L166) |
| <a id="property-rows"></a> `rows` | [`InvoiceRow`](/api/@rulvar/core/interfaces/InvoiceRow.md)[] | - | [packages/core/src/engine/invoice.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L138) |
| <a id="property-rowusdnonadditive"></a> `rowUsdNonAdditive` | `boolean` | False exactly when every contributing entry's providerCalls fully cover its usage (RV504): the totals are then the per-call fold itself, each row's `usd` agrees with its `allocatedUsd`, and the flat `usd` sum reproduces `totalUsd` up to IEEE association of the last bits. True when any entry folded on the aggregate basis (no records, or records that do not cover its usage): a nonlinear price table then prices an aggregate differently from the sum of its parts, so sum `allocatedUsd` instead; it exists precisely so a column sums to the total exactly in every case. | [packages/core/src/engine/invoice.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L162) |
| <a id="property-totalusd"></a> `totalUsd` | `number` | Every priced terminal slice, abandonment included: equals CostReport.grossUsd. | [packages/core/src/engine/invoice.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L140) |
| <a id="property-unallocatedusd"></a> `unallocatedUsd?` | `number` | USD of allocation pools that had a target and no row to carry it (RV605). The dust pass refuses to move such dollars onto another model's rows just to make the column sum, so on the (pathological) journals where this happens the flat `allocatedUsd` sum reproduces `totalUsd` minus this amount. Absent when zero, which is every well-formed journal: the per-slice remainder rows guarantee a row wherever a slice has usage. | [packages/core/src/engine/invoice.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L176) |
| <a id="property-unpriced"></a> `unpriced` | \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}[] | Usage on models absent from pricing, net and abandoned alike; never a silent zero. | [packages/core/src/engine/invoice.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L164) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | Present and true when any contributing entry carried approximate usage. | [packages/core/src/engine/invoice.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L180) |
| <a id="property-usageunknownrows"></a> `usageUnknownRows?` | `number` | Rows carrying `usageUnknown`; present when at least one does. | [packages/core/src/engine/invoice.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L178) |
