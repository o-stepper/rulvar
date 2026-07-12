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
import type { Pricing } from '../l0/spi/provider.js';

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
 * Dollars from normalized usage against one pricing row (the adapter
 * normalized the usage; inputTokens is the
 * full prompt). Cache writes price at the 5m premium rate; the 1h rate
 * applies where a provider distinguishes it in usage, which the
 * canonical Usage does not yet carry.
 */
export function priceUsdOf(pricing: Pricing, usage: Usage): number {
  return (
    (usage.inputTokens / 1_000_000) * pricing.inputUsdPerMTok +
    (usage.outputTokens / 1_000_000) * pricing.outputUsdPerMTok +
    (usage.cacheReadTokens / 1_000_000) * (pricing.cacheReadUsdPerMTok ?? 0) +
    (usage.cacheWriteTokens / 1_000_000) * (pricing.cacheWriteUsdPerMTok ?? 0)
  );
}
