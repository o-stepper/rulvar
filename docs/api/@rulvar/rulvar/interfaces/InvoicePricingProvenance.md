[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / InvoicePricingProvenance

# Interface: InvoicePricingProvenance

Defined in: `packages/core/dist/index.d.ts`

Where the fold's rates came from (RV407): `snapshot` says the caller
priced with the run-settle pin (`journalPricingSnapshot`), so these
numbers are stable against later table updates; `current-table` says
the live table priced it, the historical behavior. Attached by the
caller, who is the one that chose.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-pricingversion"></a> `pricingVersion?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-rows"></a> `rows?` | [`AppliedPricingRow`](/api/@rulvar/rulvar/interfaces/AppliedPricingRow.md)[] | The pinned rows the fold used; present on snapshot-priced exports. | `packages/core/dist/index.d.ts` |
| <a id="property-source"></a> `source` | `"snapshot"` \| `"current-table"` | - | `packages/core/dist/index.d.ts` |
