/**
 * The exported versioned OpenAI price table: the same rows as the seed
 * capability table (audited against the provider's published prices in
 * PR #160), keyed by full ModelRef and stamped with a dated
 * pricingVersion for the createEngine({ pricing }) override slot.
 */
import { describe, expect, it } from 'vitest';

import { OPENAI_MODELS, OPENAI_PRICING } from './index.js';

describe('OPENAI_PRICING', () => {
  it('exports exactly the priced seed rows under a dated version', () => {
    expect(OPENAI_PRICING.pricingVersion).toBe('openai-2026-07-16');
    const priced = Object.entries(OPENAI_MODELS).filter(
      ([, info]) => info.caps.pricing !== undefined,
    );
    expect(Object.keys(OPENAI_PRICING.models).sort()).toEqual(
      priced.map(([name]) => `openai:${name}`).sort(),
    );
    for (const [name, info] of priced) {
      expect(OPENAI_PRICING.models[`openai:${name}`]).toEqual(info.caps.pricing);
    }
  });

  it('carries the long-context tiers on both the Sol row and its published alias', () => {
    for (const ref of ['openai:gpt-5.6-sol', 'openai:gpt-5.6'] as const) {
      expect(OPENAI_PRICING.models[ref]?.tiers).toEqual([
        { aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 },
      ]);
    }
  });
});
