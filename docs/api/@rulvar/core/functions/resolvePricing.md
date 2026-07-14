[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / resolvePricing

# Function: resolvePricing()

```ts
function resolvePricing(
   ref, 
   table, 
   capsPricing): Pricing | undefined;
```

Defined in: [packages/core/src/model/pricing.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L24)

Resolves the pricing for a model: the versioned table wins; the
adapter-reported caps.pricing is the fallback; undefined means
unpriced (the CostReport surfaces it, never a silent zero).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `` `${string}:${string}` `` |
| `table` | [`PriceTable`](/api/@rulvar/core/interfaces/PriceTable.md) \| `undefined` |
| `capsPricing` | [`Pricing`](/api/@rulvar/core/interfaces/Pricing.md) \| `undefined` |

## Returns

[`Pricing`](/api/@rulvar/core/interfaces/Pricing.md) \| `undefined`
