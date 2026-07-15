[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Pricing

# Interface: Pricing

Defined in: `packages/core/dist/index.d.ts`

Per-model pricing in USD per million tokens. The registry's
versioned price table wins over adapter-
reported caps.pricing, which is a fallback only.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cachereadusdpermtok"></a> `cacheReadUsdPerMTok?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-cachewrite1husdpermtok"></a> `cacheWrite1hUsdPerMTok?` | `number` | 1h write premium rate where the provider distinguishes. | `packages/core/dist/index.d.ts` |
| <a id="property-cachewriteusdpermtok"></a> `cacheWriteUsdPerMTok?` | `number` | 5m write premium rate. | `packages/core/dist/index.d.ts` |
| <a id="property-inputusdpermtok"></a> `inputUsdPerMTok` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-outputusdpermtok"></a> `outputUsdPerMTok` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-tiers"></a> `tiers?` | [`PricingTier`](/api/@rulvar/rulvar/interfaces/PricingTier.md)[] | Long-context tiers; a row without them is one linear price. | `packages/core/dist/index.d.ts` |
