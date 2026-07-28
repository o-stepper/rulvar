[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournalPricingSnapshot

# Interface: JournalPricingSnapshot

Defined in: [packages/core/src/engine/pricing-snapshot.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L100)

What `journalPricingSnapshot` rebuilds from a pinned run settle.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-priceusd"></a> `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` | Prices usage with the PINNED rows only: a model absent from the snapshot folds as unpriced (surfaced, never a silent zero), exactly the honesty contract of the live fold. | [packages/core/src/engine/pricing-snapshot.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L109) |
| <a id="property-pricingversion"></a> `pricingVersion?` | `string` | The PriceTable version the settle recorded; absent for caps-only rows. | [packages/core/src/engine/pricing-snapshot.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L102) |
| <a id="property-rows"></a> `rows` | [`AppliedPricingRow`](/api/@rulvar/core/interfaces/AppliedPricingRow.md)[] | - | [packages/core/src/engine/pricing-snapshot.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/pricing-snapshot.ts#L103) |
