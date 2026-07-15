[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PricingTier

# Interface: PricingTier

Defined in: [packages/core/src/l0/spi/provider.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L36)

One long-context price tier. When the full prompt (canonical
inputTokens, cache included) is strictly above `aboveInputTokens`, the
ENTIRE request is re-priced with these multipliers, not only the tokens
past the threshold (how providers state their long-context rules).
`inputMultiplier` scales every input-side rate: input, cache read, and
cache write.
`outputMultiplier` scales the output rate. Provider pricing pages state
multipliers for "input" without saying whether cache rates scale;
scaling them with input is the conservative reading for budget
enforcement (it never underestimates spend). With several tiers, the
highest threshold below the prompt size wins, independent of array
order.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-aboveinputtokens"></a> `aboveInputTokens` | `number` | [packages/core/src/l0/spi/provider.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L37) |
| <a id="property-inputmultiplier"></a> `inputMultiplier` | `number` | [packages/core/src/l0/spi/provider.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L38) |
| <a id="property-outputmultiplier"></a> `outputMultiplier` | `number` | [packages/core/src/l0/spi/provider.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L39) |
