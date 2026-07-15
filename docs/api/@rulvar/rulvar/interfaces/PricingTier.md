[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PricingTier

# Interface: PricingTier

Defined in: `packages/core/dist/index.d.ts`

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
| <a id="property-aboveinputtokens"></a> `aboveInputTokens` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-inputmultiplier"></a> `inputMultiplier` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-outputmultiplier"></a> `outputMultiplier` | `number` | `packages/core/dist/index.d.ts` |
