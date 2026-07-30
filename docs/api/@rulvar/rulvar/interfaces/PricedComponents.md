[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PricedComponents

# Interface: PricedComponents

Defined in: `packages/core/dist/index.d.ts`

The four components a provider statement itemizes (RV812): uncached
input, output, cached input, cache writes, each with its token base
and dollars. Decomposed with EXACTLY the arithmetic of
[priceUsdOf](/api/@rulvar/rulvar/functions/priceUsdOf.md), which is defined as the sum of these four terms
in this order, so a statement reconciliation and the settled fold
can never disagree about what a usage costs.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cachedinput"></a> `cachedInput` | [`PricedComponent`](/api/@rulvar/rulvar/interfaces/PricedComponent.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-cachewrite"></a> `cacheWrite` | [`PricedComponent`](/api/@rulvar/rulvar/interfaces/PricedComponent.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-input"></a> `input` | [`PricedComponent`](/api/@rulvar/rulvar/interfaces/PricedComponent.md) | The uncached prompt remainder: inputTokens minus both cache subsets, clamped at zero. | `packages/core/dist/index.d.ts` |
| <a id="property-output"></a> `output` | [`PricedComponent`](/api/@rulvar/rulvar/interfaces/PricedComponent.md) | - | `packages/core/dist/index.d.ts` |
