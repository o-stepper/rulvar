[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PinnedPricingSegment

# Interface: PinnedPricingSegment

Defined in: `packages/core/dist/index.d.ts`

One pin's coverage (RV611): the run-settle that recorded it, the seq
range it settled FIRST, and exactly the version and rows it pinned.
The whole array is the per-segment provenance a single last-pin
version used to hide: an invoice folded over a rotation can now say
every table version that priced it, with the boundary seqs.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-fromseq"></a> `fromSeq` | `number` | The first seq this pin covers: the previous pin's settle seq, 0 for the first pin. Rows with `fromSeq <= seq < settleSeq` price under this pin in the seq-aware fold. | `packages/core/dist/index.d.ts` |
| <a id="property-pricingversion"></a> `pricingVersion?` | `string` | The PriceTable version THIS settle pinned; absent for caps-only rows. | `packages/core/dist/index.d.ts` |
| <a id="property-rows"></a> `rows` | [`AppliedPricingRow`](/api/@rulvar/rulvar/interfaces/AppliedPricingRow.md)[] | The applied rows THIS settle pinned. | `packages/core/dist/index.d.ts` |
| <a id="property-settleseq"></a> `settleSeq` | `number` | The pinning run-settle's own seq (the exclusive upper bound). | `packages/core/dist/index.d.ts` |
