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

/** The tier a full prompt lands in: the highest threshold strictly below it. */
function tierFor(pricing: Pricing, inputTokens: number): PricingTier | undefined {
  let tier: PricingTier | undefined;
  for (const candidate of pricing.tiers ?? []) {
    if (
      inputTokens > candidate.aboveInputTokens &&
      (tier === undefined || candidate.aboveInputTokens > tier.aboveInputTokens)
    ) {
      tier = candidate;
    }
  }
  return tier;
}

/** One billing component of a priced usage: its token base and dollars. */
export interface PricedComponent {
  tokens: number;
  usd: number;
}

/**
 * The four components a provider statement itemizes (RV812): uncached
 * input, output, cached input, cache writes, each with its token base
 * and dollars. Decomposed with EXACTLY the arithmetic of
 * {@link priceUsdOf}, which is defined as the sum of these four terms
 * in this order, so a statement reconciliation and the settled fold
 * can never disagree about what a usage costs.
 */
export interface PricedComponents {
  /** The uncached prompt remainder: inputTokens minus both cache subsets, clamped at zero. */
  input: PricedComponent;
  output: PricedComponent;
  cachedInput: PricedComponent;
  cacheWrite: PricedComponent;
}

/**
 * Decomposes one usage against one pricing row into the four billing
 * components. Under the Usage invariant inputTokens is the FULL prompt
 * including cache reads and writes, so the input rate bills only the
 * uncached remainder and cache tokens bill at their own rates, never
 * twice; a row that omits a cache rate bills those tokens at the plain
 * input rate rather than silently for free. A row may carry
 * long-context tiers: the highest threshold strictly below the full
 * prompt re-prices the ENTIRE request (input-side rates scale by
 * inputMultiplier, the output rate by outputMultiplier). Cache writes
 * price at the 5m premium rate by default; when the usage carries the
 * TTL split (RV810: `cacheWrite5mTokens` and `cacheWrite1hTokens`,
 * filled by adapters whose provider distinguishes write TTLs), the 1h
 * share prices at `cacheWrite1hUsdPerMTok` (falling back to the plain
 * write rate when the row lacks it) and everything the 1h share does
 * not claim, the 5m share plus any unattributed remainder an upstream
 * invariant violation left, bills at the write rate, never silently
 * for free. The component's `tokens` stays the WHOLE
 * `cacheWriteTokens` either way, so statement reconciliation keys are
 * unchanged.
 */
export function priceComponentsOf(pricing: Pricing, usage: Usage): PricedComponents {
  const tier = tierFor(pricing, usage.inputTokens);
  const inputMul = tier?.inputMultiplier ?? 1;
  const outputMul = tier?.outputMultiplier ?? 1;
  const uncachedInputTokens = Math.max(
    0,
    usage.inputTokens - usage.cacheReadTokens - usage.cacheWriteTokens,
  );
  const writeRate = pricing.cacheWriteUsdPerMTok ?? pricing.inputUsdPerMTok;
  const write1hRate = pricing.cacheWrite1hUsdPerMTok ?? writeRate;
  const splitPresent =
    usage.cacheWrite5mTokens !== undefined || usage.cacheWrite1hTokens !== undefined;
  const write1hTokens = splitPresent ? (usage.cacheWrite1hTokens ?? 0) : 0;
  const writeDefaultTokens = Math.max(0, usage.cacheWriteTokens - write1hTokens);
  return {
    input: {
      tokens: uncachedInputTokens,
      usd: (uncachedInputTokens / 1_000_000) * pricing.inputUsdPerMTok * inputMul,
    },
    output: {
      tokens: usage.outputTokens,
      usd: (usage.outputTokens / 1_000_000) * pricing.outputUsdPerMTok * outputMul,
    },
    cachedInput: {
      tokens: usage.cacheReadTokens,
      usd:
        (usage.cacheReadTokens / 1_000_000) *
        (pricing.cacheReadUsdPerMTok ?? pricing.inputUsdPerMTok) *
        inputMul,
    },
    cacheWrite: {
      tokens: usage.cacheWriteTokens,
      usd:
        ((writeDefaultTokens / 1_000_000) * writeRate + (write1hTokens / 1_000_000) * write1hRate) *
        inputMul,
    },
  };
}

/**
 * Dollars from normalized usage against one pricing row: the sum of the
 * {@link priceComponentsOf} terms in their declared order, byte for
 * byte the historical expression (uncached input, output, cached input,
 * cache writes).
 */
export function priceUsdOf(pricing: Pricing, usage: Usage): number {
  const parts = priceComponentsOf(pricing, usage);
  return parts.input.usd + parts.output.usd + parts.cachedInput.usd + parts.cacheWrite.usd;
}

/**
 * The output tokens `remainingUsd` still buys from one pricing row after
 * paying for an estimated prompt of `estimatedInputTokens`, priced with
 * the same tier rules as settlement (the tier is selected by the
 * estimated prompt). Floored to whole tokens; zero or negative means not
 * even one output token fits, so the turn must not be dispatched.
 * Undefined when the row prices output at zero (a free model needs no
 * output bound).
 */
export function affordableOutputTokens(
  pricing: Pricing,
  remainingUsd: number,
  estimatedInputTokens: number,
): number | undefined {
  const tier = tierFor(pricing, estimatedInputTokens);
  const outputRate = pricing.outputUsdPerMTok * (tier?.outputMultiplier ?? 1);
  if (outputRate <= 0) {
    return undefined;
  }
  const inputUsd = priceUsdOf(pricing, {
    inputTokens: estimatedInputTokens,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  });
  return Math.floor(((remainingUsd - inputUsd) / outputRate) * 1_000_000);
}

/**
 * One side of a documented-rates comparison: the five per-MTok rate
 * fields a provider pricing page publishes plus the long-context tiers,
 * every field optional because either side may legitimately not carry
 * one. A seed {@link Pricing} row is assignable directly.
 */
export interface DocumentedRates {
  inputUsdPerMTok?: number;
  outputUsdPerMTok?: number;
  cacheReadUsdPerMTok?: number;
  cacheWriteUsdPerMTok?: number;
  cacheWrite1hUsdPerMTok?: number;
  tiers?: PricingTier[];
}

const RATE_FIELDS = [
  'inputUsdPerMTok',
  'outputUsdPerMTok',
  'cacheReadUsdPerMTok',
  'cacheWriteUsdPerMTok',
  'cacheWrite1hUsdPerMTok',
] as const;

const TIER_FIELDS = ['aboveInputTokens', 'inputMultiplier', 'outputMultiplier'] as const;

/**
 * Compares a pricing seed against rates extracted from the provider's
 * documented pricing page, in BOTH directions (RV902): a seed rate the
 * page moved or dropped is a finding, and so is a documented billable
 * rate the seed never declared, because a billable column missing from
 * the seed is a silent underpricing channel (the 1h cache-write premium
 * hid exactly there). Declared long-context tiers compare field by
 * field. Returns human-readable findings, empty when the sides agree;
 * the weekly rates audit (scripts/rates-audit.mjs) runs this exact
 * comparator over the live pages, and the fault-injection kit drives it
 * as a permanent gate (RV909). It verifies DOCUMENTATION, not billing:
 * only a statement reconciliation over saved exports settles what the
 * provider's meter actually charges.
 */
export function compareRates(seed: DocumentedRates, page: DocumentedRates): string[] {
  const findings: string[] = [];
  for (const field of RATE_FIELDS) {
    const seedValue = seed[field];
    const pageValue = page[field];
    if (seedValue === undefined) {
      if (pageValue !== undefined) {
        findings.push(
          `${field}: the page shows ${String(pageValue)} but the seed declares no such rate`,
        );
      }
      continue;
    }
    if (pageValue === undefined) {
      findings.push(`${field}: seed ${String(seedValue)} but the page shows no such rate`);
    } else if (Math.abs(seedValue - pageValue) > 1e-9) {
      findings.push(`${field}: seed ${String(seedValue)} vs page ${String(pageValue)}`);
    }
  }
  const seedTiers = seed.tiers;
  if (Array.isArray(seedTiers)) {
    const pageTiers = page.tiers;
    if (!Array.isArray(pageTiers) || pageTiers.length !== seedTiers.length) {
      findings.push(
        `tiers: seed declares ${String(seedTiers.length)}, page shows ` +
          `${Array.isArray(pageTiers) ? String(pageTiers.length) : 'none'}`,
      );
    } else {
      for (let i = 0; i < seedTiers.length; i += 1) {
        for (const field of TIER_FIELDS) {
          const seedValue = seedTiers[i]?.[field] ?? Number.NaN;
          const pageValue = pageTiers[i]?.[field] ?? Number.NaN;
          if (!(Math.abs(seedValue - pageValue) <= 1e-9)) {
            findings.push(
              `tiers[${String(i)}].${field}: seed ${String(seedValue)} vs page ${String(pageValue)}`,
            );
          }
        }
      }
    }
  }
  return findings;
}
