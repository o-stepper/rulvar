[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvoicePricingProvenance

# Interface: InvoicePricingProvenance

Defined in: [packages/core/src/engine/invoice.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L111)

Where the fold's rates came from (RV407): `snapshot` says the caller
priced with the run-settle pin (`journalPricingSnapshot`), so these
numbers are stable against later table updates; `current-table` says
the live table priced it, the historical behavior. Attached by the
caller, who is the one that chose.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-pricingversion"></a> `pricingVersion?` | `string` | - | [packages/core/src/engine/invoice.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L113) |
| <a id="property-rows"></a> `rows?` | [`AppliedPricingRow`](/api/@rulvar/core/interfaces/AppliedPricingRow.md)[] | The pinned rows the fold used; present on snapshot-priced exports. | [packages/core/src/engine/invoice.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L115) |
| <a id="property-source"></a> `source` | `"snapshot"` \| `"current-table"` | - | [packages/core/src/engine/invoice.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L112) |
