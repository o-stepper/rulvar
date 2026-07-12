[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / resolvePricing

# Function: resolvePricing()

```ts
function resolvePricing(
   ref, 
   table, 
   capsPricing): Pricing | undefined;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Resolves the pricing for a model: the versioned table wins; the
adapter-reported caps.pricing is the fallback; undefined means
unpriced (the CostReport surfaces it, never a silent zero).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `ref` | `` `${string}:${string}` `` |
| `table` | \| [`PriceTable`](/api/@rulvar/rulvar/interfaces/PriceTable.md) \| `undefined` |
| `capsPricing` | [`Pricing`](/api/@rulvar/rulvar/interfaces/Pricing.md) \| `undefined` |

## Returns

[`Pricing`](/api/@rulvar/rulvar/interfaces/Pricing.md) \| `undefined`
