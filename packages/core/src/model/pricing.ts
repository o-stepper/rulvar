/**
 * Versioned price table (M4-T06): the registry's price table wins over
 * adapter-reported caps.pricing, which is a fallback only. The
 * pricingVersion is a monotonic string recorded in engine-written
 * decision entries so replayed cost attribution is stable; price table
 * updates are registry updates with a pricingVersion bump, never a caps
 * refresh side effect. Unpriced models surface in CostReport as
 * unpriced, never as a silent zero.
 */
import type { ModelRef, Usage } from '../l0/messages.js';
import type { Pricing, PricingTier } from '../l0/spi/provider.js';

export interface PriceTable {
  /** Monotonic version string; recorded in decision entries. */
  pricingVersion: string;
  models: Record<ModelRef, Pricing>;
}

/**
 * Resolves the pricing for a model: the versioned table wins; the
 * adapter-reported caps.pricing is the fallback; undefined means
 * unpriced (the CostReport surfaces it, never a silent zero).
 */
export function resolvePricing(
  ref: ModelRef,
  table: PriceTable | undefined,
  capsPricing: Pricing | undefined,
): Pricing | undefined {
  return table?.models[ref] ?? capsPricing;
}

/**
 * Dollars from normalized usage against one pricing row. Under the Usage
 * invariant inputTokens is the FULL prompt including cache reads and
 * writes, so the input rate bills only the uncached remainder and cache
 * tokens bill at their own rates, never twice; a row that omits a cache
 * rate bills those tokens at the plain input rate rather than silently
 * for free. A row may carry long-context tiers: the highest threshold
 * strictly below the full prompt re-prices the ENTIRE request
 * (input-side rates scale by inputMultiplier, the output rate by
 * outputMultiplier). Cache writes price at the 5m premium rate; the 1h
 * rate applies where a provider distinguishes it in usage, which the
 * canonical Usage does not yet carry.
 */
export function priceUsdOf(pricing: Pricing, usage: Usage): number {
  let tier: PricingTier | undefined;
  for (const candidate of pricing.tiers ?? []) {
    if (
      usage.inputTokens > candidate.aboveInputTokens &&
      (tier === undefined || candidate.aboveInputTokens > tier.aboveInputTokens)
    ) {
      tier = candidate;
    }
  }
  const inputMul = tier?.inputMultiplier ?? 1;
  const outputMul = tier?.outputMultiplier ?? 1;
  const uncachedInputTokens = Math.max(
    0,
    usage.inputTokens - usage.cacheReadTokens - usage.cacheWriteTokens,
  );
  return (
    (uncachedInputTokens / 1_000_000) * pricing.inputUsdPerMTok * inputMul +
    (usage.outputTokens / 1_000_000) * pricing.outputUsdPerMTok * outputMul +
    (usage.cacheReadTokens / 1_000_000) *
      (pricing.cacheReadUsdPerMTok ?? pricing.inputUsdPerMTok) *
      inputMul +
    (usage.cacheWriteTokens / 1_000_000) *
      (pricing.cacheWriteUsdPerMTok ?? pricing.inputUsdPerMTok) *
      inputMul
  );
}
