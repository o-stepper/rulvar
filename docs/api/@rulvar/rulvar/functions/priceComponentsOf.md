[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / priceComponentsOf

# Function: priceComponentsOf()

```ts
function priceComponentsOf(pricing, usage): PricedComponents;
```

Defined in: `packages/core/dist/index.d.ts`

Decomposes one usage against one pricing row into the four billing
components. Under the Usage invariant inputTokens is the FULL prompt
including cache reads and writes, so the input rate bills only the
uncached remainder and cache tokens bill at their own rates, never
twice; a row that omits a cache rate bills those tokens at the plain
input rate rather than silently for free. A row may carry
long-context tiers: the highest threshold strictly below the full
prompt re-prices the ENTIRE request (input-side rates scale by
inputMultiplier, the output rate by outputMultiplier). Cache writes
price at the 5m premium rate by default; when the usage carries the
TTL split (RV810: `cacheWrite5mTokens` and `cacheWrite1hTokens`,
filled by adapters whose provider distinguishes write TTLs), the 1h
share prices at `cacheWrite1hUsdPerMTok` (falling back to the plain
write rate when the row lacks it) and everything the 1h share does
not claim, the 5m share plus any unattributed remainder an upstream
invariant violation left, bills at the write rate, never silently
for free. The component's `tokens` stays the WHOLE
`cacheWriteTokens` either way, so statement reconciliation keys are
unchanged.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `pricing` | [`Pricing`](/api/@rulvar/rulvar/interfaces/Pricing.md) |
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |

## Returns

[`PricedComponents`](/api/@rulvar/rulvar/interfaces/PricedComponents.md)
