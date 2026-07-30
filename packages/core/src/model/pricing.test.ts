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
import { priceComponentsOf, priceUsdOf } from './pricing.js';

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
