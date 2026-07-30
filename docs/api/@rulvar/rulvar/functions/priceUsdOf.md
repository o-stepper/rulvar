[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / priceUsdOf

# Function: priceUsdOf()

```ts
function priceUsdOf(pricing, usage): number;
```

Defined in: `packages/core/dist/index.d.ts`

Dollars from normalized usage against one pricing row: the sum of the
[priceComponentsOf](/api/@rulvar/rulvar/functions/priceComponentsOf.md) terms in their declared order, byte for
byte the historical expression (uncached input, output, cached input,
cache writes).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `pricing` | [`Pricing`](/api/@rulvar/rulvar/interfaces/Pricing.md) |
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |

## Returns

`number`
