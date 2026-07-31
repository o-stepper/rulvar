/**
 * The per-component price decomposition (RV812): the four billing
 * components a provider statement itemizes (uncached input, cached
 * input, cache writes, output), decomposed with EXACTLY the arithmetic
 * of priceUsdOf, which is their sum in the same term order, so the
 * statement reconciliation and the settled fold can never disagree
 * about what a usage costs.
 */
import { describe, expect, it } from 'vitest';

import type { Usage } from '../l0/messages.js';
import { compareRates, priceComponentsOf, priceUsdOf } from './pricing.js';

const usageOf = (
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number,
): Usage => ({ inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens });

describe('priceComponentsOf (RV812)', () => {
  const pricing = {
    inputUsdPerMTok: 2.5,
    outputUsdPerMTok: 15,
    cacheReadUsdPerMTok: 0.25,
    cacheWriteUsdPerMTok: 3.125,
    tiers: [{ aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 }],
  };

  it('decomposes into the four provider components and sums to priceUsdOf exactly', () => {
    const usage = usageOf(1_000_000, 200_000, 300_000, 100_000);
    const parts = priceComponentsOf(pricing, usage);
    // Uncached input is the full prompt minus both cache subsets.
    expect(parts.input.tokens).toBe(600_000);
    expect(parts.cachedInput.tokens).toBe(300_000);
    expect(parts.cacheWrite.tokens).toBe(100_000);
    expect(parts.output.tokens).toBe(200_000);
    // The tier fired (1M above 272k): input-family 2x, output 1.5x.
    expect(parts.input.usd).toBeCloseTo(0.6 * 2.5 * 2, 12);
    expect(parts.cachedInput.usd).toBeCloseTo(0.3 * 0.25 * 2, 12);
    expect(parts.cacheWrite.usd).toBeCloseTo(0.1 * 3.125 * 2, 12);
    expect(parts.output.usd).toBeCloseTo(0.2 * 15 * 1.5, 12);
    // Byte-exact identity with the settled fold, not closeTo: the sum
    // in term order IS priceUsdOf.
    expect(parts.input.usd + parts.output.usd + parts.cachedInput.usd + parts.cacheWrite.usd).toBe(
      priceUsdOf(pricing, usage),
    );
  });

  it('holds the identity below the tier and clamps uncached input at zero', () => {
    const below = usageOf(1000, 50, 200, 100);
    const parts = priceComponentsOf(pricing, below);
    expect(parts.input.tokens).toBe(700);
    expect(parts.input.usd + parts.output.usd + parts.cachedInput.usd + parts.cacheWrite.usd).toBe(
      priceUsdOf(pricing, below),
    );
    // A malformed usage whose subsets exceed the prompt clamps at zero,
    // exactly like priceUsdOf.
    const clamped = priceComponentsOf(pricing, usageOf(100, 0, 80, 40));
    expect(clamped.input.tokens).toBe(0);
    expect(clamped.input.usd).toBe(0);
  });

  it('falls back to the input rate where a row omits cache rates, like priceUsdOf', () => {
    const bare = { inputUsdPerMTok: 10, outputUsdPerMTok: 0 };
    const usage = usageOf(1_000_000, 0, 400_000, 200_000);
    const parts = priceComponentsOf(bare, usage);
    expect(parts.cachedInput.usd).toBeCloseTo(4, 12);
    expect(parts.cacheWrite.usd).toBeCloseTo(2, 12);
    expect(parts.input.usd + parts.output.usd + parts.cachedInput.usd + parts.cacheWrite.usd).toBe(
      priceUsdOf(bare, usage),
    );
  });
});

describe('the cache-write TTL split pricing (RV810)', () => {
  const pricing = {
    inputUsdPerMTok: 3,
    outputUsdPerMTok: 15,
    cacheReadUsdPerMTok: 0.3,
    cacheWriteUsdPerMTok: 3.75,
    cacheWrite1hUsdPerMTok: 6,
  };
  const split: Usage = {
    inputTokens: 3_000_000,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 3_000_000,
    cacheWrite5mTokens: 1_000_000,
    cacheWrite1hTokens: 2_000_000,
  };

  it('prices the 1h share at the 1h premium and the 5m share at the write rate', () => {
    // 1M at 3.75 plus 2M at 6: the undifferentiated fold would say
    // 3M at 3.75 = 11.25 and underbill the 1h premium.
    expect(priceUsdOf(pricing, split)).toBeCloseTo(1 * 3.75 + 2 * 6, 10);
    expect(priceComponentsOf(pricing, split).cacheWrite.usd).toBeCloseTo(15.75, 10);
    expect(priceComponentsOf(pricing, split).cacheWrite.tokens).toBe(3_000_000);
  });

  it('a missing 1h rate falls back to the write rate, and no split keeps the historical fold', () => {
    const { cacheWrite1hUsdPerMTok: _unused, ...withoutRate } = pricing;
    expect(priceUsdOf(withoutRate, split)).toBeCloseTo(3 * 3.75, 10);
    const noSplit: Usage = {
      inputTokens: 3_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 3_000_000,
    };
    expect(priceUsdOf(pricing, noSplit)).toBeCloseTo(3 * 3.75, 10);
  });

  it('an invariant-short split bills the unattributed remainder at the write rate', () => {
    const short: Usage = { ...split, cacheWrite1hTokens: 1_000_000 };
    // 1M at 5m rate + 1M at 1h rate + 1M unattributed remainder at the
    // 5m default: never silently free.
    expect(priceUsdOf(pricing, short)).toBeCloseTo(1 * 3.75 + 1 * 6 + 1 * 3.75, 10);
  });

  it('long-context tiers scale both shares by the input multiplier', () => {
    const tiered = {
      ...pricing,
      tiers: [{ aboveInputTokens: 1_000_000, inputMultiplier: 2, outputMultiplier: 1.5 }],
    };
    expect(priceUsdOf(tiered, split)).toBeCloseTo((1 * 3.75 + 2 * 6) * 2, 10);
  });
});

describe('compareRates (RV902, published home RV909)', () => {
  const seed = {
    inputUsdPerMTok: 3,
    outputUsdPerMTok: 15,
    cacheReadUsdPerMTok: 0.3,
    cacheWriteUsdPerMTok: 3.75,
    cacheWrite1hUsdPerMTok: 6,
  };

  it('identical rates compare clean, and a moved rate names itself', () => {
    expect(compareRates(seed, { ...seed })).toEqual([]);
    expect(compareRates(seed, { ...seed, inputUsdPerMTok: 2.5 })).toEqual([
      'inputUsdPerMTok: seed 3 vs page 2.5',
    ]);
  });

  it('fails closed in BOTH directions on a missing field', () => {
    const { cacheWrite1hUsdPerMTok: _dropped, ...withoutPremium } = seed;
    // Seed declares a rate the page dropped.
    expect(compareRates(seed, withoutPremium)).toEqual([
      'cacheWrite1hUsdPerMTok: seed 6 but the page shows no such rate',
    ]);
    // The RV902 direction: a documented billable rate the seed never
    // declared is a silent underpricing channel, never a pass.
    expect(compareRates(withoutPremium, seed)).toEqual([
      'cacheWrite1hUsdPerMTok: the page shows 6 but the seed declares no such rate',
    ]);
  });

  it('compares declared long-context tiers field by field', () => {
    const tier = { aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 };
    const tiered = { ...seed, tiers: [tier] };
    expect(compareRates(tiered, { ...seed, tiers: [tier] })).toEqual([]);
    expect(compareRates(tiered, seed)).toEqual(['tiers: seed declares 1, page shows none']);
    expect(compareRates(tiered, { ...seed, tiers: [{ ...tier, inputMultiplier: 1.5 }] })).toEqual([
      'tiers[0].inputMultiplier: seed 2 vs page 1.5',
    ]);
  });

  it('a page-only tier is a finding, never a silent pass (RV1007)', () => {
    // The page documents a long-context premium the seed never
    // declared: the exact silent-underpricing channel the doctrine
    // above names, hidden until now because the tier loop only ran
    // when the SEED declared tiers.
    const tier = { aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 };
    expect(compareRates(seed, { ...seed, tiers: [tier] })).toEqual([
      'tiers: the page shows 1 but the seed declares none',
    ]);
    // An empty page tier list claims nothing.
    expect(compareRates(seed, { ...seed, tiers: [] })).toEqual([]);
  });

  it('NaN on either side of a scalar rate is a finding, never agreement (RV1007)', () => {
    // A page extraction that stops parsing yields NaN, and
    // Math.abs(NaN) > epsilon is false: the historical form read a
    // broken extraction as agreement. The tier fields already used the
    // negated NaN-safe form; the scalars now match it.
    expect(compareRates({ ...seed, inputUsdPerMTok: Number.NaN }, seed)).toEqual([
      'inputUsdPerMTok: seed NaN vs page 3',
    ]);
    expect(compareRates(seed, { ...seed, outputUsdPerMTok: Number.NaN })).toEqual([
      'outputUsdPerMTok: seed 15 vs page NaN',
    ]);
  });
});
