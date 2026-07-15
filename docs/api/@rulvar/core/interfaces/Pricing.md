[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Pricing

# Interface: Pricing

Defined in: [packages/core/src/l0/spi/provider.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L47)

Per-model pricing in USD per million tokens. The registry's
versioned price table wins over adapter-
reported caps.pricing, which is a fallback only.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cachereadusdpermtok"></a> `cacheReadUsdPerMTok?` | `number` | - | [packages/core/src/l0/spi/provider.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L50) |
| <a id="property-cachewrite1husdpermtok"></a> `cacheWrite1hUsdPerMTok?` | `number` | 1h write premium rate where the provider distinguishes. | [packages/core/src/l0/spi/provider.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L54) |
| <a id="property-cachewriteusdpermtok"></a> `cacheWriteUsdPerMTok?` | `number` | 5m write premium rate. | [packages/core/src/l0/spi/provider.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L52) |
| <a id="property-inputusdpermtok"></a> `inputUsdPerMTok` | `number` | - | [packages/core/src/l0/spi/provider.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L48) |
| <a id="property-outputusdpermtok"></a> `outputUsdPerMTok` | `number` | - | [packages/core/src/l0/spi/provider.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L49) |
| <a id="property-tiers"></a> `tiers?` | [`PricingTier`](/api/@rulvar/core/interfaces/PricingTier.md)[] | Long-context tiers; a row without them is one linear price. | [packages/core/src/l0/spi/provider.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L56) |
