[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / priceUsdOf

# Function: priceUsdOf()

```ts
function priceUsdOf(pricing, usage): number;
```

Defined in: [packages/core/src/model/pricing.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L41)

Dollars from normalized usage against one pricing row (docs/04,
section 1.6: the adapter normalized the usage; inputTokens is the
full prompt). Cache writes price at the 5m premium rate; the 1h rate
applies where a provider distinguishes it in usage, which the
canonical Usage does not yet carry (docs/04, section 10).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `pricing` | [`Pricing`](/api/@rulvar/core/interfaces/Pricing.md) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |

## Returns

`number`
