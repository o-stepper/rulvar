[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / affordableOutputTokens

# Function: affordableOutputTokens()

```ts
function affordableOutputTokens(
   pricing, 
   remainingUsd, 
   estimatedInputTokens): number | undefined;
```

Defined in: [packages/core/src/model/pricing.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/pricing.ts#L88)

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
| `pricing` | [`Pricing`](/api/@rulvar/core/interfaces/Pricing.md) |
| `remainingUsd` | `number` |
| `estimatedInputTokens` | `number` |

## Returns

`number` \| `undefined`
