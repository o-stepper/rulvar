/**
 * Capability table for the July 2026 Anthropic model family (M1-T12).
 *
 * Seed values only: contextWindow/maxOutputTokens are refreshed from the
 * capabilities-bearing GET /v1/models, and pricing here is the
 * adapter-reported FALLBACK; the registry's versioned price table (M4)
 * wins. ANTHROPIC_PRICING exports the same rows stamped with a dated
 * pricingVersion for exactly that override slot.
 *
 * Pricing rows mirror the official table at
 * platform.claude.com/docs/en/about-claude/pricing as published on
 * 2026-07-16: base input, output, cache read (0.1x input), and the
 * 5-minute cache write (1.25x input; the canonical Usage does not
 * distinguish 1h writes, so the 5m rate is the seed). A price revision
 * is a new release with a new pricingVersion, never a wall-clock switch
 * inside a run.
 *
 * Window/output rows mirror the official models table and the live
 * GET /v1/models figures as of 2026-07-17 (the v1.16.1 review caught
 * five stale rows). caps-snapshot.json next to this package pins every
 * row: editing one side without the other fails the offline snapshot
 * test, and the weekly live contract workflow audits the snapshot
 * against GET /v1/models, so a provider-side raise pages instead of
 * silently under-provisioning admission and compaction.
 */
import type { Effort, ModelCaps, ModelRef, PriceTable, Pricing } from '@rulvar/core';

const ALL_EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

export interface AnthropicModelInfo {
  caps: ModelCaps;
  /**
   * Wire thinking form: current models accept only adaptive; the
   * enabled/budget form remains functional only on Opus 4.6 and Sonnet
   * 4.6.
   */
  thinkingForm: 'adaptive' | 'enabled-budget';
  /** Minimum cacheable prefix in tokens. */
  cacheMinTokens: number;
}

function current(
  contextWindow: number,
  maxOutputTokens: number,
  pricing: { in: number; out: number; cacheRead: number; cacheWrite: number } | undefined,
  cacheMinTokens: number,
): AnthropicModelInfo {
  return {
    caps: {
      structuredOutput: 'native',
      // temperature/top_p/top_k are 400s on current models.
      supportsTemperature: false,
      supportsParallelTools: true,
      reasoningEfforts: ALL_EFFORTS,
      contextWindow,
      maxOutputTokens,
      ...(pricing === undefined
        ? {}
        : {
            pricing: {
              inputUsdPerMTok: pricing.in,
              outputUsdPerMTok: pricing.out,
              cacheReadUsdPerMTok: pricing.cacheRead,
              cacheWriteUsdPerMTok: pricing.cacheWrite,
            },
          }),
    },
    thinkingForm: 'adaptive',
    cacheMinTokens,
  };
}

/** Static seed table naming the current model set. */
export const ANTHROPIC_MODELS: Record<string, AnthropicModelInfo> = {
  'claude-fable-5': current(
    1_000_000,
    128_000,
    { in: 10, out: 50, cacheRead: 1, cacheWrite: 12.5 },
    2_048,
  ),
  'claude-opus-4-8': current(
    1_000_000,
    128_000,
    { in: 5, out: 25, cacheRead: 0.5, cacheWrite: 6.25 },
    4_096,
  ),
  'claude-opus-4-7': current(
    1_000_000,
    128_000,
    { in: 5, out: 25, cacheRead: 0.5, cacheWrite: 6.25 },
    4_096,
  ),
  // Introductory pricing in effect through 2026-08-31; the standard
  // 3/15/0.3/3.75 row ships in a release after the promotion ends.
  'claude-sonnet-5': current(
    1_000_000,
    128_000,
    { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 },
    2_048,
  ),
  'claude-haiku-4-5': (() => {
    // Haiku 4.5 rejects BOTH current-generation controls with live
    // 400s: "adaptive thinking is not supported on this model" and
    // "This model does not support the effort parameter". It takes the
    // classic enabled/budget thinking form via providerOptions only,
    // and empty reasoningEfforts makes the router SCRUB effort off the
    // wire (requested effort stays in identity). Found live by the M12
    // checkpoint runs.
    const base = current(
      200_000,
      64_000,
      { in: 1, out: 5, cacheRead: 0.1, cacheWrite: 1.25 },
      2_048,
    );
    return {
      ...base,
      caps: { ...base.caps, reasoningEfforts: [] },
      thinkingForm: 'enabled-budget' as const,
    };
  })(),
  'claude-opus-4-6': {
    ...current(1_000_000, 128_000, { in: 5, out: 25, cacheRead: 0.5, cacheWrite: 6.25 }, 4_096),
    thinkingForm: 'enabled-budget',
  },
  'claude-sonnet-4-6': {
    ...current(1_000_000, 128_000, { in: 3, out: 15, cacheRead: 0.3, cacheWrite: 3.75 }, 2_048),
    thinkingForm: 'enabled-budget',
  },
};

/**
 * Unknown Anthropic models are assumed current-generation: adaptive
 * thinking, native structured outputs, no sampling parameters. refreshCaps
 * corrects window/output figures from the live model list. Pricing stays
 * ABSENT for an unknown model: a fabricated row silently misprices every
 * model newer than this table. Hosts price it via a versioned
 * createEngine({ pricing }) row; until then its usage surfaces in
 * CostReport.unpriced and a run ceiling warns that it cannot bound the
 * model.
 */
/**
 * The seed pricing rows as a versioned price table, keyed by full
 * ModelRef under the adapter's fixed id 'anthropic'. Pass it to
 * createEngine({ pricing }) so the run journals a concrete
 * pricingVersion instead of 'unpriced': the versioned table wins over
 * the caps fallback by rule, and a later table revision surfaces as
 * explicit configuration drift on resume rather than a silent
 * reinterpretation. Extend or override rows by spreading `models` into
 * your own table with a new version string (the documented path for the
 * Sonnet 5 promotion ending on 2026-08-31).
 */
export const ANTHROPIC_PRICING: PriceTable = {
  pricingVersion: 'anthropic-2026-07-16',
  models: ((): Record<ModelRef, Pricing> => {
    const models: Record<ModelRef, Pricing> = {};
    for (const [name, info] of Object.entries(ANTHROPIC_MODELS)) {
      if (info.caps.pricing !== undefined) {
        models[`anthropic:${name}`] = info.caps.pricing;
      }
    }
    return models;
  })(),
};

export function anthropicModelInfo(model: string): AnthropicModelInfo {
  const exact = ANTHROPIC_MODELS[model];
  if (exact !== undefined) {
    return exact;
  }
  // Longest matching prefix wins, so a dated snapshot of a longer name
  // never resolves to a shorter sibling entry.
  let best: { name: string; info: AnthropicModelInfo } | undefined;
  for (const [name, info] of Object.entries(ANTHROPIC_MODELS)) {
    if (model.startsWith(`${name}-`) && (best === undefined || name.length > best.name.length)) {
      best = { name, info };
    }
  }
  if (best !== undefined) {
    return best.info;
  }
  return current(400_000, 64_000, undefined, 4_096);
}
