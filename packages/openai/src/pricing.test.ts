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
    expect(OPENAI_PRICING.pricingVersion).toBe('openai-2026-07-31');
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

  it('records the rates verification date on every priced seed row (RV814)', () => {
    // The 5.6 family rows were re-verified against the documented model
    // pages on 2026-07-31 (RV911): Terra and Luna carry the provider's
    // 2026-07-30 price cut, while Sol's unchanged rates additionally
    // remain billing-confirmed by the 2026-07-30 statement
    // reconciliation. The pre-5.6 rows keep their last docs
    // verification date. A date is a recorded verification event,
    // never a guess: correcting a rate is a separate release with a
    // changeset, and this test pins that the stamp exists at all.
    for (const name of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.6']) {
      expect(OPENAI_MODELS[name]?.caps.pricing?.ratesVerifiedAt, name).toBe('2026-07-31');
    }
    for (const name of ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.4', 'gpt-5.4-mini']) {
      expect(OPENAI_MODELS[name]?.caps.pricing?.ratesVerifiedAt, name).toBe('2026-07-18');
    }
    for (const [ref, row] of Object.entries(OPENAI_PRICING.models)) {
      expect(row.ratesVerifiedAt, ref).toBeDefined();
    }
  });

  it('carries the long-context tiers on every gpt-5.6 family row and the alias', () => {
    for (const ref of [
      'openai:gpt-5.6-sol',
      'openai:gpt-5.6-terra',
      'openai:gpt-5.6-luna',
      'openai:gpt-5.6',
    ] as const) {
      expect(OPENAI_PRICING.models[ref]?.tiers).toEqual([
        { aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 },
      ]);
    }
  });
});
