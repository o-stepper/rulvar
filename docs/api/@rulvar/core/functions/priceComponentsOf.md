[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / priceComponentsOf

# Function: priceComponentsOf()

```ts
function priceComponentsOf(pricing, usage): PricedComponents;
```

Defined in: [packages/core/src/model/pricing.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L82)

Decomposes one usage against one pricing row into the four billing
components. Under the Usage invariant inputTokens is the FULL prompt
including cache reads and writes, so the input rate bills only the
uncached remainder and cache tokens bill at their own rates, never
twice; a row that omits a cache rate bills those tokens at the plain
input rate rather than silently for free. A row may carry
long-context tiers: the highest threshold strictly below the full
prompt re-prices the ENTIRE request (input-side rates scale by
inputMultiplier, the output rate by outputMultiplier). Cache writes
price at the 5m premium rate; the 1h rate applies where a provider
distinguishes it in usage, which the canonical Usage does not yet
carry.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `pricing` | [`Pricing`](/api/@rulvar/core/interfaces/Pricing.md) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |

## Returns

[`PricedComponents`](/api/@rulvar/core/interfaces/PricedComponents.md)
