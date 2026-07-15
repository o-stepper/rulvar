[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / affordableOutputTokens

# Function: affordableOutputTokens()

```ts
function affordableOutputTokens(
   pricing, 
   remainingUsd, 
   estimatedInputTokens): number | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

The output tokens `remainingUsd` still buys from one pricing row after
paying for an estimated prompt of `estimatedInputTokens`, priced with
the same tier rules as settlement (the tier is selected by the
estimated prompt). Floored to whole tokens; zero or negative means not
even one output token fits, so the turn must not be dispatched.
Undefined when the row prices output at zero (a free model needs no
output bound).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `pricing` | [`Pricing`](/api/@rulvar/rulvar/interfaces/Pricing.md) |
| `remainingUsd` | `number` |
| `estimatedInputTokens` | `number` |

## Returns

`number` \| `undefined`
