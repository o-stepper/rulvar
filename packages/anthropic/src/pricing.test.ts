/**
 * Acceptance tests for the corrected Anthropic fallback pricing (the
 * v1.8.0 live-review P1): every seed row equals the official table as
 * published on 2026-07-16, the exported versioned ANTHROPIC_PRICING
 * carries the same rows, and the corrected rates flow through pricing,
 * the journal-folded CostReport, projected admission, and the
 * budget-derived output bound. Every test here fails against the
 * v1.8.0 rows (Fable was seeded at exactly 2x the official price).
 */
import { describe, expect, it } from 'vitest';

import {
  admissionReserveUsd,
  affordableOutputTokens,
  costReportFromJournal,
  defineWorkflow,
  priceComponentsOf,
  priceUsdOf,
  resolvePricing,
  type CostAttributionFacts,
  type JournalEntry,
  type ModelRef,
  type Pricing,
  type Usage,
} from '@rulvar/core';
import { createTestEngine } from '@rulvar/testing';

import { ANTHROPIC_MODELS, ANTHROPIC_PRICING, anthropicModelInfo } from './caps.js';

/**
 * The official table (platform.claude.com pricing page as published
 * 2026-07-16; every row re-verified against the page 2026-07-31 across
 * all five published columns, the 1h cache-write premium included:
 * RV901, the thirteenth experiment's underpricing probe).
 */
const OFFICIAL: Record<string, Pricing> = {
  'claude-fable-5': {
    inputUsdPerMTok: 10,
    outputUsdPerMTok: 50,
    cacheReadUsdPerMTok: 1,
    cacheWriteUsdPerMTok: 12.5,
    cacheWrite1hUsdPerMTok: 20,
    ratesVerifiedAt: '2026-07-31',
  },
  'claude-opus-4-8': {
    inputUsdPerMTok: 5,
    outputUsdPerMTok: 25,
    cacheReadUsdPerMTok: 0.5,
    cacheWriteUsdPerMTok: 6.25,
    cacheWrite1hUsdPerMTok: 10,
    ratesVerifiedAt: '2026-07-31',
  },
  'claude-opus-4-7': {
    inputUsdPerMTok: 5,
    outputUsdPerMTok: 25,
    cacheReadUsdPerMTok: 0.5,
    cacheWriteUsdPerMTok: 6.25,
    cacheWrite1hUsdPerMTok: 10,
    ratesVerifiedAt: '2026-07-31',
  },
  'claude-opus-4-6': {
    inputUsdPerMTok: 5,
    outputUsdPerMTok: 25,
    cacheReadUsdPerMTok: 0.5,
    cacheWriteUsdPerMTok: 6.25,
    cacheWrite1hUsdPerMTok: 10,
    ratesVerifiedAt: '2026-07-31',
  },
  // Introductory price through 2026-08-31; the standard 3/15 row ships
  // in a release after the promotion ends, never by wall clock.
  'claude-sonnet-5': {
    inputUsdPerMTok: 2,
    outputUsdPerMTok: 10,
    cacheReadUsdPerMTok: 0.2,
    cacheWriteUsdPerMTok: 2.5,
    cacheWrite1hUsdPerMTok: 4,
    ratesVerifiedAt: '2026-07-31',
  },
  'claude-sonnet-4-6': {
    inputUsdPerMTok: 3,
    outputUsdPerMTok: 15,
    cacheReadUsdPerMTok: 0.3,
    cacheWriteUsdPerMTok: 3.75,
    cacheWrite1hUsdPerMTok: 6,
    ratesVerifiedAt: '2026-07-31',
  },
  'claude-haiku-4-5': {
    inputUsdPerMTok: 1,
    outputUsdPerMTok: 5,
    cacheReadUsdPerMTok: 0.1,
    cacheWriteUsdPerMTok: 1.25,
    cacheWrite1hUsdPerMTok: 2,
    ratesVerifiedAt: '2026-07-31',
  },
};

const FABLE: Pricing = OFFICIAL['claude-fable-5'];

describe('Anthropic fallback pricing matches the official table', () => {
  for (const [model, row] of Object.entries(OFFICIAL)) {
    it(`seeds ${model} at the official rates`, () => {
      expect(anthropicModelInfo(model).caps.pricing).toEqual(row);
    });
  }

  it('records the rates verification date on every priced seed row (RV814)', () => {
    // Verified against the documented model pricing table on
    // 2026-07-31 (every seeded rate matched the page, all five columns
    // including the 1h write premium); the weekly rates audit
    // re-verifies the same page and pages on drift.
    for (const [model, info] of Object.entries(ANTHROPIC_MODELS)) {
      if (info.caps.pricing !== undefined) {
        expect(info.caps.pricing.ratesVerifiedAt, model).toBe('2026-07-31');
      }
    }
  });

  it('ANTHROPIC_PRICING exports exactly the priced seed rows under a dated version', () => {
    expect(ANTHROPIC_PRICING.pricingVersion).toBe('anthropic-2026-07-31');
    expect(Object.keys(ANTHROPIC_PRICING.models).sort()).toEqual(
      Object.keys(OFFICIAL)
        .map((model) => `anthropic:${model}`)
        .sort(),
    );
    for (const [model, row] of Object.entries(OFFICIAL)) {
      expect(ANTHROPIC_PRICING.models[`anthropic:${model}`]).toEqual(row);
    }
  });
});

describe('corrected rates through the price function', () => {
  it('prices Fable at $60 for one MTok uncached input plus one MTok output, not $120', () => {
    const usd = priceUsdOf(FABLE, {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(usd).toBeCloseTo(60, 10);
  });

  it('prices one MTok of Fable cache reads at $1 and 5m cache writes at $12.50', () => {
    const read = priceUsdOf(FABLE, {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 0,
    });
    expect(read).toBeCloseTo(1, 10);
    const write = priceUsdOf(FABLE, {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 1_000_000,
    });
    expect(write).toBeCloseTo(12.5, 10);
  });
});

describe('the 1h cache write premium is seeded and priced (RV901)', () => {
  // The thirteenth experiment's probe: v1.124.0 taught the wire to fill
  // the TTL split and the price function to bill it, but the seed never
  // declared the 1h rate, so a million Sonnet 5 1h write tokens priced
  // at the 5m $2.50 instead of the documented $4.00. The premium is 2x
  // base input on every published row.
  it('declares the documented 2x-input 1h write rate on every priced seed row', () => {
    for (const [model, info] of Object.entries(ANTHROPIC_MODELS)) {
      const pricing = info.caps.pricing;
      if (pricing !== undefined) {
        expect(pricing.cacheWrite1hUsdPerMTok, model).toBe(pricing.inputUsdPerMTok * 2);
      }
    }
  });

  it('prices one MTok of Sonnet 5 1h cache writes at the documented $4, not the 5m $2.50', () => {
    const sonnet = ANTHROPIC_PRICING.models['anthropic:claude-sonnet-5'];
    const oneMTok1h: Usage = {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 1_000_000,
      cacheWrite5mTokens: 0,
      cacheWrite1hTokens: 1_000_000,
    };
    expect(priceUsdOf(sonnet, oneMTok1h)).toBeCloseTo(4, 10);
    const parts = priceComponentsOf(sonnet, oneMTok1h);
    expect(parts.cacheWrite.usd).toBeCloseTo(4, 10);
    // The component's token base stays the WHOLE write count: the RV812
    // reconciliation keys are unchanged by the split.
    expect(parts.cacheWrite.tokens).toBe(1_000_000);
  });

  it('decomposes a mixed 5m/1h split exactly and keeps the no-split fold byte-identical', () => {
    const sonnet = ANTHROPIC_PRICING.models['anthropic:claude-sonnet-5'];
    // 600k at the 5m $2.50 plus 400k at the 1h $4: $1.50 + $1.60.
    expect(
      priceUsdOf(sonnet, {
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 1_000_000,
        cacheWrite5mTokens: 600_000,
        cacheWrite1hTokens: 400_000,
      }),
    ).toBeCloseTo(3.1, 10);
    // No split declared: the historical conservative 5m fold, exactly.
    expect(
      priceUsdOf(sonnet, {
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 1_000_000,
      }),
    ).toBe(2.5);
  });
});

function terminalAgentEntry(
  seq: number,
  servedBy: ModelRef,
  usage: Usage,
  costAttribution: CostAttributionFacts,
): JournalEntry {
  return {
    hashVersion: 2,
    seq,
    scope: '',
    key: `k${seq}`,
    ordinal: 0,
    kind: 'agent',
    status: 'ok',
    usage,
    servedBy,
    costAttribution,
    spanId: `s${seq}`,
    startedAt: '2026-07-16T00:00:00.000Z',
    endedAt: '2026-07-16T00:00:01.000Z',
  };
}

describe('journal-folded CostReport under the corrected rows', () => {
  it('sums Fable $60 plus Haiku $6 to $66 in the total and every breakdown', () => {
    const oneMTokEach: Usage = {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    const entries: JournalEntry[] = [
      terminalAgentEntry(1, 'anthropic:claude-fable-5', oneMTokEach, {
        phase: 'build',
        agentType: 'writer',
        role: 'loop',
      }),
      terminalAgentEntry(2, 'anthropic:claude-haiku-4-5', oneMTokEach, {
        phase: 'verify',
        agentType: 'checker',
        role: 'extract',
      }),
    ];
    const report = costReportFromJournal(entries, (servedBy, usage) => {
      const pricing = resolvePricing(servedBy, ANTHROPIC_PRICING, undefined);
      return pricing === undefined ? undefined : priceUsdOf(pricing, usage);
    });
    expect(report.totalUsd).toBeCloseTo(66, 10);
    expect(report.byModel['anthropic:claude-fable-5']).toBeCloseTo(60, 10);
    expect(report.byModel['anthropic:claude-haiku-4-5']).toBeCloseTo(6, 10);
    expect(report.byPhase['build']).toBeCloseTo(60, 10);
    expect(report.byPhase['verify']).toBeCloseTo(6, 10);
    expect(report.byAgentType['writer']).toBeCloseTo(60, 10);
    expect(report.byAgentType['checker']).toBeCloseTo(6, 10);
    expect(report.byRole.loop).toBeCloseTo(60, 10);
    expect(report.byRole.extract).toBeCloseTo(6, 10);
    expect(report.unpriced).toEqual([]);
  });
});

describe('budget layers use the corrected row', () => {
  it('projects the admission reserve from the corrected caps row', () => {
    // 1000 input + 1000 output tokens at 10/50 per MTok: $0.06, where
    // the v1.8.0 row (20/100) reserved $0.12 and rejected work twice
    // as early.
    const reserve = admissionReserveUsd({
      caps: anthropicModelInfo('claude-fable-5').caps,
      inputTokens: 1_000,
      maxOutputTokensPerTurn: 1_000,
    });
    expect(reserve).toBeCloseTo(0.06, 10);
  });

  it('dispatches under a remaining-dollar budget the v1.8.0 rate rejected, ceiling respected', async () => {
    // One output token costs $0.00005 at the corrected 50/MTok but
    // $0.0001 at the old 100/MTok: a $0.00007 ceiling flips the exact
    // one-token denial.
    const budgetUsd = 0.00007;
    expect(affordableOutputTokens(FABLE, budgetUsd, 0)).toBe(1);
    expect(affordableOutputTokens({ ...FABLE, outputUsdPerMTok: 100 }, budgetUsd, 0)).toBe(0);

    // The fake model is priced AT the exported Fable row through the
    // versioned table, so the engine's output bound and settlement both
    // read the corrected rates.
    const engine = createTestEngine({
      agents: { '*': 'y' },
      budgetDefaults: { flatReserveUsd: 0 },
      pricing: {
        pricingVersion: ANTHROPIC_PRICING.pricingVersion,
        models: { 'fake:fake-model': FABLE },
      },
    });
    const wf = defineWorkflow({ name: 'flip' }, async (ctx) => await ctx.agent('hi'));
    const outcome = await engine.run(wf, undefined, { budgetUsd }).result;

    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('y');
    // Exactly one provider dispatch, wire-clamped to the one output
    // token the remainder affords at the corrected rate.
    expect(engine.fake.calls).toHaveLength(1);
    expect(engine.fake.calls[0]?.req.maxOutputTokens).toBe(1);
    // One input and one output token at 10/50: the ceiling holds.
    expect(outcome.cost.totalUsd).toBeCloseTo(0.00006, 10);
    expect(outcome.cost.totalUsd).toBeLessThanOrEqual(budgetUsd);
  });
});
