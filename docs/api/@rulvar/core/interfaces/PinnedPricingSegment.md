[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PinnedPricingSegment

# Interface: PinnedPricingSegment

Defined in: [packages/core/src/engine/pricing-snapshot.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L109)

One pin's coverage (RV611): the run-settle that recorded it, the seq
range it settled FIRST, and exactly the version and rows it pinned.
The whole array is the per-segment provenance a single last-pin
version used to hide: an invoice folded over a rotation can now say
every table version that priced it, with the boundary seqs.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-fromseq"></a> `fromSeq` | `number` | The first seq this pin covers: the previous pin's settle seq, 0 for the first pin. Rows with `fromSeq <= seq < settleSeq` price under this pin in the seq-aware fold. | [packages/core/src/engine/pricing-snapshot.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L115) |
| <a id="property-pricingversion"></a> `pricingVersion?` | `string` | The PriceTable version THIS settle pinned; absent for caps-only rows. | [packages/core/src/engine/pricing-snapshot.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L119) |
| <a id="property-rows"></a> `rows` | [`AppliedPricingRow`](/api/@rulvar/core/interfaces/AppliedPricingRow.md)[] | The applied rows THIS settle pinned. | [packages/core/src/engine/pricing-snapshot.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L121) |
| <a id="property-settleseq"></a> `settleSeq` | `number` | The pinning run-settle's own seq (the exclusive upper bound). | [packages/core/src/engine/pricing-snapshot.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L117) |
