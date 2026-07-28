[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournalPricingSnapshot

# Interface: JournalPricingSnapshot

Defined in: `packages/core/dist/index.d.ts`

What `journalPricingSnapshot` rebuilds from a pinned run settle.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-priceusd"></a> `priceUsd` | (`servedBy`, `usage`) => `number` \| `undefined` | Prices usage with the PINNED rows only: a model absent from the snapshot folds as unpriced (surfaced, never a silent zero), exactly the honesty contract of the live fold. | `packages/core/dist/index.d.ts` |
| <a id="property-pricingversion"></a> `pricingVersion?` | `string` | The PriceTable version the settle recorded; absent for caps-only rows. | `packages/core/dist/index.d.ts` |
| <a id="property-rows"></a> `rows` | [`AppliedPricingRow`](/api/@rulvar/rulvar/interfaces/AppliedPricingRow.md)[] | - | `packages/core/dist/index.d.ts` |
