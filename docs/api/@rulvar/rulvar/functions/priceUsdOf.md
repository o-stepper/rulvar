[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / priceUsdOf

# Function: priceUsdOf()

```ts
function priceUsdOf(pricing, usage): number;
```

Defined in: `packages/core/dist/index.d.ts`

Dollars from normalized usage against one pricing row. Under the Usage
invariant inputTokens is the FULL prompt including cache reads and
writes, so the input rate bills only the uncached remainder and cache
tokens bill at their own rates, never twice; a row that omits a cache
rate bills those tokens at the plain input rate rather than silently
for free. A row may carry long-context tiers: the highest threshold
strictly below the full prompt re-prices the ENTIRE request
(input-side rates scale by inputMultiplier, the output rate by
outputMultiplier). Cache writes price at the 5m premium rate; the 1h
rate applies where a provider distinguishes it in usage, which the
canonical Usage does not yet carry.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `pricing` | [`Pricing`](/api/@rulvar/rulvar/interfaces/Pricing.md) |
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |

## Returns

`number`
