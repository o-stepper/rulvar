[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvoicePricingProvenance

# Interface: InvoicePricingProvenance

Defined in: [packages/core/src/engine/invoice.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L115)

Where the fold's rates came from (RV407): `composed` says the caller
priced with the snapshot's `composedPriceUsd` (RV611), the engine's
own composition, so pin-covered rows reproduce the settled numbers
and anything past the last pin priced at the caller's current table;
`snapshot` says the caller priced with the raw pinned rows alone
(the pre-RV611 label); `current-table` says the live table priced
it, the historical behavior for journals without a pin. Attached by
the caller, who is the one that chose.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-pinnedthroughseq"></a> `pinnedThroughSeq?` | `number` | On `composed` exports: the last pin's settle seq. Rows at or past it (a segment journaled but not yet settled) priced at the current table, not any pin; each row's `entrySeq` locates it against this bound. | [packages/core/src/engine/invoice.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L133) |
| <a id="property-pricingversion"></a> `pricingVersion?` | `string` | - | [packages/core/src/engine/invoice.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L117) |
| <a id="property-rows"></a> `rows?` | [`AppliedPricingRow`](/api/@rulvar/core/interfaces/AppliedPricingRow.md)[] | The pinned rows the fold used; present on snapshot-priced exports. | [packages/core/src/engine/invoice.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L119) |
| <a id="property-segments"></a> `segments?` | [`PinnedPricingSegment`](/api/@rulvar/core/interfaces/PinnedPricingSegment.md)[] | Per-pin coverage (RV611): every settled segment's version and rows with its seq boundaries, not only the last. A fold across a price-table rotation used to export one `pricingVersion` while its rows priced under several; this array is the honest declaration. | [packages/core/src/engine/invoice.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L126) |
| <a id="property-source"></a> `source` | `"snapshot"` \| `"current-table"` \| `"composed"` | - | [packages/core/src/engine/invoice.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L116) |
