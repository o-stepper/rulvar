[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Pricing

# Interface: Pricing

Defined in: [packages/core/src/l0/spi/provider.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L71)

Per-model pricing in USD per million tokens. The registry's
versioned price table wins over adapter-
reported caps.pricing, which is a fallback only.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cachereadusdpermtok"></a> `cacheReadUsdPerMTok?` | `number` | - | [packages/core/src/l0/spi/provider.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L74) |
| <a id="property-cachewrite1husdpermtok"></a> `cacheWrite1hUsdPerMTok?` | `number` | 1h write premium rate where the provider distinguishes. | [packages/core/src/l0/spi/provider.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L78) |
| <a id="property-cachewriteusdpermtok"></a> `cacheWriteUsdPerMTok?` | `number` | 5m write premium rate. | [packages/core/src/l0/spi/provider.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L76) |
| <a id="property-inputusdpermtok"></a> `inputUsdPerMTok` | `number` | - | [packages/core/src/l0/spi/provider.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L72) |
| <a id="property-outputusdpermtok"></a> `outputUsdPerMTok` | `number` | - | [packages/core/src/l0/spi/provider.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L73) |
| <a id="property-ratesverifiedat"></a> `ratesVerifiedAt?` | `string` | ISO date (YYYY-MM-DD) of the last verification of this row against the provider's documented rates or its billing categories (RV814). A recorded verification event, never a guess: seed rows exist to bound ceilings conservatively, actual billing truth is established only by statement reconciliation over saved exports, and a confirmed divergence corrects the row in its own release with a changeset, never by a silent rewrite. Preflight stamps it on the spawn report and the invoice text names it with its age, so the consumer of a dollar figure can see how stale the rates behind it are; the settle pin carries it with the rest of the row. | [packages/core/src/l0/spi/provider.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L93) |
| <a id="property-tiers"></a> `tiers?` | [`PricingTier`](/api/@rulvar/core/interfaces/PricingTier.md)[] | Long-context tiers; a row without them is one linear price. | [packages/core/src/l0/spi/provider.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L80) |
