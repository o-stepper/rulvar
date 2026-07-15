---
'@rulvar/core': minor
'@rulvar/openai': minor
'@rulvar/anthropic': minor
---

Correct and extend model pricing: GPT-5.6 entries, long-context tiers, no fabricated prices, no double-charged cache.

- `Pricing` gains optional long-context `tiers` (`PricingTier`): the highest threshold strictly below the full prompt re-prices the entire request, input-side rates (cache included) scaling by `inputMultiplier` and the output rate by `outputMultiplier`. Existing linear rows are untouched.
- `@rulvar/openai` seeds `gpt-5.6-sol` and its `gpt-5.6` alias with the official caps and pricing (1,050,000 context, 128,000 max output, $5/$0.50/$30 per MTok, $6.25 cache write, 2x input and 1.5x output above 272K input tokens). Previously the unknown-model fallback silently priced them as gpt-5.4.
- Unknown model ids in both first-class adapters keep conservative transport caps but no longer receive a fabricated price row: their usage surfaces in `CostReport.unpriced` and a USD ceiling warns that it cannot bound them. Provide a versioned `createEngine({ pricing })` row for hosted models the tables do not know yet.
- `priceUsdOf` no longer double-charges cache tokens: under the Usage invariant `inputTokens` is the full prompt, so the input rate now bills only the uncached remainder while cache reads and writes bill at their own rates (a row without cache rates bills them at the input rate). Cache-heavy runs previously over-attributed cost by the full input rate on every cached token.
- Admission reserve estimation routes through the same `priceUsdOf`, so estimates and settled costs share one formula, tiers included.
- Model id resolution picks the longest matching table prefix, so a dated `gpt-5.5-pro-...` snapshot resolves to the pro entry, never the shorter `gpt-5.5` sibling.
