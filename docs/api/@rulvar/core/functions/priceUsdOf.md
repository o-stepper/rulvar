[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / priceUsdOf

# Function: priceUsdOf()

```ts
function priceUsdOf(pricing, usage): number;
```

Defined in: [packages/core/src/model/pricing.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L122)

Dollars from normalized usage against one pricing row: the sum of the
[priceComponentsOf](/api/@rulvar/core/functions/priceComponentsOf.md) terms in their declared order, byte for
byte the historical expression (uncached input, output, cached input,
cache writes).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `pricing` | [`Pricing`](/api/@rulvar/core/interfaces/Pricing.md) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |

## Returns

`number`
