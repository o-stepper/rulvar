[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PricedComponents

# Interface: PricedComponents

Defined in: [packages/core/src/model/pricing.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L60)

The four components a provider statement itemizes (RV812): uncached
input, output, cached input, cache writes, each with its token base
and dollars. Decomposed with EXACTLY the arithmetic of
[priceUsdOf](/api/@rulvar/core/functions/priceUsdOf.md), which is defined as the sum of these four terms
in this order, so a statement reconciliation and the settled fold
can never disagree about what a usage costs.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cachedinput"></a> `cachedInput` | [`PricedComponent`](/api/@rulvar/core/interfaces/PricedComponent.md) | - | [packages/core/src/model/pricing.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L64) |
| <a id="property-cachewrite"></a> `cacheWrite` | [`PricedComponent`](/api/@rulvar/core/interfaces/PricedComponent.md) | - | [packages/core/src/model/pricing.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L65) |
| <a id="property-input"></a> `input` | [`PricedComponent`](/api/@rulvar/core/interfaces/PricedComponent.md) | The uncached prompt remainder: inputTokens minus both cache subsets, clamped at zero. | [packages/core/src/model/pricing.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L62) |
| <a id="property-output"></a> `output` | [`PricedComponent`](/api/@rulvar/core/interfaces/PricedComponent.md) | - | [packages/core/src/model/pricing.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L63) |
