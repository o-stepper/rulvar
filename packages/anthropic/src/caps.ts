/**
 * Capability table for the July 2026 Anthropic model family (M1-T12).
 *
 * Seed values only: contextWindow/maxOutputTokens are refreshed from the
 * capabilities-bearing GET /v1/models (docs/04, section "Token counting
 * and refreshCaps"), and pricing here is the adapter-reported FALLBACK;
 * the registry's versioned price table (M4) wins (docs/04, section
 * "Pricing").
 */
import type { Effort, ModelCaps } from '@rulvar/core';

const ALL_EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

export interface AnthropicModelInfo {
  caps: ModelCaps;
  /**
   * Wire thinking form: current models accept only adaptive; the
   * enabled/budget form remains functional only on Opus 4.6 and Sonnet
   * 4.6 (docs/04, section "Thinking and sampling parameters").
   */
  thinkingForm: 'adaptive' | 'enabled-budget';
  /** Minimum cacheable prefix in tokens (docs/04, section "Prompt caching"). */
  cacheMinTokens: number;
}

function current(
  contextWindow: number,
  maxOutputTokens: number,
  pricing: { in: number; out: number; cacheRead: number; cacheWrite: number },
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
      pricing: {
        inputUsdPerMTok: pricing.in,
        outputUsdPerMTok: pricing.out,
        cacheReadUsdPerMTok: pricing.cacheRead,
        cacheWriteUsdPerMTok: pricing.cacheWrite,
      },
    },
    thinkingForm: 'adaptive',
    cacheMinTokens,
  };
}

/** Static seed table; docs/04 section 4 names the current model set. */
export const ANTHROPIC_MODELS: Record<string, AnthropicModelInfo> = {
  'claude-fable-5': current(
    1_000_000,
    128_000,
    { in: 20, out: 100, cacheRead: 2, cacheWrite: 25 },
    2_048,
  ),
  'claude-opus-4-8': current(
    400_000,
    128_000,
    { in: 12, out: 60, cacheRead: 1.2, cacheWrite: 15 },
    4_096,
  ),
  'claude-opus-4-7': current(
    400_000,
    64_000,
    { in: 10, out: 50, cacheRead: 1, cacheWrite: 12.5 },
    4_096,
  ),
  'claude-sonnet-5': current(
    400_000,
    64_000,
    { in: 3, out: 15, cacheRead: 0.3, cacheWrite: 3.75 },
    2_048,
  ),
  'claude-opus-4-6': {
    ...current(200_000, 32_000, { in: 15, out: 75, cacheRead: 1.5, cacheWrite: 18.75 }, 4_096),
    thinkingForm: 'enabled-budget',
  },
  'claude-sonnet-4-6': {
    ...current(200_000, 64_000, { in: 3, out: 15, cacheRead: 0.3, cacheWrite: 3.75 }, 2_048),
    thinkingForm: 'enabled-budget',
  },
};

/**
 * Unknown Anthropic models are assumed current-generation: adaptive
 * thinking, native structured outputs, no sampling parameters. refreshCaps
 * corrects window/output figures from the live model list.
 */
export function anthropicModelInfo(model: string): AnthropicModelInfo {
  const exact = ANTHROPIC_MODELS[model];
  if (exact !== undefined) {
    return exact;
  }
  for (const [name, info] of Object.entries(ANTHROPIC_MODELS)) {
    if (model.startsWith(`${name}-`)) {
      return info;
    }
  }
  return current(400_000, 64_000, { in: 10, out: 50, cacheRead: 1, cacheWrite: 12.5 }, 4_096);
}
