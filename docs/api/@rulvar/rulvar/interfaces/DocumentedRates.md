[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DocumentedRates

# Interface: DocumentedRates

Defined in: `packages/core/dist/index.d.ts`

One side of a documented-rates comparison: the five per-MTok rate
fields a provider pricing page publishes plus the long-context tiers,
every field optional because either side may legitimately not carry
one. A seed [Pricing](/api/@rulvar/rulvar/interfaces/Pricing.md) row is assignable directly.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-cachereadusdpermtok"></a> `cacheReadUsdPerMTok?` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-cachewrite1husdpermtok"></a> `cacheWrite1hUsdPerMTok?` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-cachewriteusdpermtok"></a> `cacheWriteUsdPerMTok?` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-inputusdpermtok"></a> `inputUsdPerMTok?` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-outputusdpermtok"></a> `outputUsdPerMTok?` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-tiers"></a> `tiers?` | [`PricingTier`](/api/@rulvar/rulvar/interfaces/PricingTier.md)[] | `packages/core/dist/index.d.ts` |
