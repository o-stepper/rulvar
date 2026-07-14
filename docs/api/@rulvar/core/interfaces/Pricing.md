[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Pricing

# Interface: Pricing

Defined in: [packages/core/src/l0/spi/provider.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L27)

Per-model pricing in USD per million tokens. The registry's
versioned price table wins over adapter-
reported caps.pricing, which is a fallback only.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cachereadusdpermtok"></a> `cacheReadUsdPerMTok?` | `number` | - | [packages/core/src/l0/spi/provider.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L30) |
| <a id="property-cachewrite1husdpermtok"></a> `cacheWrite1hUsdPerMTok?` | `number` | 1h write premium rate where the provider distinguishes. | [packages/core/src/l0/spi/provider.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L34) |
| <a id="property-cachewriteusdpermtok"></a> `cacheWriteUsdPerMTok?` | `number` | 5m write premium rate. | [packages/core/src/l0/spi/provider.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L32) |
| <a id="property-inputusdpermtok"></a> `inputUsdPerMTok` | `number` | - | [packages/core/src/l0/spi/provider.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L28) |
| <a id="property-outputusdpermtok"></a> `outputUsdPerMTok` | `number` | - | [packages/core/src/l0/spi/provider.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L29) |
