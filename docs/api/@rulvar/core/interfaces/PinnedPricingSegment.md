[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PinnedPricingSegment

# Interface: PinnedPricingSegment

Defined in: [packages/core/src/engine/pricing-snapshot.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L112)

One pin's coverage (RV611): the run-settle that recorded it, the seq
range it settled FIRST, and exactly the version and rows it pinned.
The whole array is the per-segment provenance a single last-pin
version used to hide: an invoice folded over a rotation can now say
every table version that priced it, with the boundary seqs.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-fromseq"></a> `fromSeq` | `number` | The first seq this pin covers: the previous pin's settle seq, 0 for the first pin. Rows with `fromSeq <= seq < settleSeq` price under this pin in the seq-aware fold. | [packages/core/src/engine/pricing-snapshot.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L118) |
| <a id="property-pricingversion"></a> `pricingVersion?` | `string` | The PriceTable version THIS settle pinned; absent for caps-only rows. | [packages/core/src/engine/pricing-snapshot.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L122) |
| <a id="property-ratesverifiedat"></a> `ratesVerifiedAt?` | \{ `newest`: `string`; `oldest`: `string`; \} | The freshness range of THIS pin's dated rows (RV3703): the oldest and newest `ratesVerifiedAt` among rows carrying a parsable one, the machine-readable age of the table that priced the segment. Absent when no row is dated: freshness is then unattested, never guessed. | [packages/core/src/engine/pricing-snapshot.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L143) |
| `ratesVerifiedAt.newest` | `string` | - | [packages/core/src/engine/pricing-snapshot.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L143) |
| `ratesVerifiedAt.oldest` | `string` | - | [packages/core/src/engine/pricing-snapshot.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L143) |
| <a id="property-rows"></a> `rows` | [`AppliedPricingRow`](/api/@rulvar/core/interfaces/AppliedPricingRow.md)[] | The applied rows THIS settle pinned. | [packages/core/src/engine/pricing-snapshot.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L124) |
| <a id="property-rowshash"></a> `rowsHash` | `string` | sha256 over the canonical JSON of THIS pin's rows (RV3703): the version string is a label the table author chose, and the third experiment's arc found a price defect that a label cannot expose; the hash is the content. Two tables sharing a version string but disagreeing on rates are distinguishable, and two folds of one journal always derive the same hex. Computed at read time from the pinned bytes: the journal is unchanged and every existing pin gains it. | [packages/core/src/engine/pricing-snapshot.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L135) |
| <a id="property-settleseq"></a> `settleSeq` | `number` | The pinning run-settle's own seq (the exclusive upper bound). | [packages/core/src/engine/pricing-snapshot.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L120) |
