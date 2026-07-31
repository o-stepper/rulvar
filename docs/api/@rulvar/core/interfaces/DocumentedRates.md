[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DocumentedRates

# Interface: DocumentedRates

Defined in: [packages/core/src/model/pricing.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L173)

One side of a documented-rates comparison: the five per-MTok rate
fields a provider pricing page publishes plus the long-context tiers,
every field optional because either side may legitimately not carry
one. A seed [Pricing](/api/@rulvar/core/interfaces/Pricing.md) row is assignable directly.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-cachereadusdpermtok"></a> `cacheReadUsdPerMTok?` | `number` | [packages/core/src/model/pricing.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L176) |
| <a id="property-cachewrite1husdpermtok"></a> `cacheWrite1hUsdPerMTok?` | `number` | [packages/core/src/model/pricing.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L178) |
| <a id="property-cachewriteusdpermtok"></a> `cacheWriteUsdPerMTok?` | `number` | [packages/core/src/model/pricing.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L177) |
| <a id="property-inputusdpermtok"></a> `inputUsdPerMTok?` | `number` | [packages/core/src/model/pricing.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L174) |
| <a id="property-outputusdpermtok"></a> `outputUsdPerMTok?` | `number` | [packages/core/src/model/pricing.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L175) |
| <a id="property-tiers"></a> `tiers?` | [`PricingTier`](/api/@rulvar/core/interfaces/PricingTier.md)[] | [packages/core/src/model/pricing.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L179) |
