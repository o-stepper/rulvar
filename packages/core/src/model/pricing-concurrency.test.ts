/**
 * Versioned price table and the keyed limiter, unit level (M4-T06/T07):
 * table-wins resolution, the pricing math, unlimited-by-default keys,
 * and independent throttling per key.
 */
import { describe, expect, it } from 'vitest';

import type { Usage } from '../l0/messages.js';
import { KeyedLimiter } from './concurrency.js';
import { priceUsdOf, resolvePricing, type PriceTable } from './pricing.js';

const usage: Usage = {
  inputTokens: 2_000_000,
  outputTokens: 1_000_000,
  cacheReadTokens: 1_000_000,
  cacheWriteTokens: 0,
};

describe('resolvePricing (M4-T06)', () => {
  const table: PriceTable = {
    pricingVersion: '2026-07-01',
    models: { 'fake:model': { inputUsdPerMTok: 10, outputUsdPerMTok: 100 } },
  };

  it('the table wins over caps.pricing; caps is the fallback; else unpriced', () => {
    const caps = { inputUsdPerMTok: 1, outputUsdPerMTok: 2 };
    expect(resolvePricing('fake:model', table, caps)?.inputUsdPerMTok).toBe(10);
    expect(resolvePricing('fake:other', table, caps)?.inputUsdPerMTok).toBe(1);
    expect(resolvePricing('fake:other', table, undefined)).toBeUndefined();
    expect(resolvePricing('fake:model', undefined, undefined)).toBeUndefined();
  });

  it('bills cache tokens at their own rates and the uncached remainder at input, never twice', () => {
    // inputTokens is the FULL prompt (Usage invariant): 2M input of which
    // 1M was a cache read. The cached million bills at the cache rate
    // ONLY; charging it the input rate too would double-charge.
    expect(
      priceUsdOf(
        {
          inputUsdPerMTok: 3,
          outputUsdPerMTok: 15,
          cacheReadUsdPerMTok: 0.3,
        },
        usage,
      ),
    ).toBeCloseTo(1 * 3 + 1 * 15 + 1 * 0.3, 10);
  });

  it('a row without cache rates bills cache tokens at the plain input rate, not zero', () => {
    expect(priceUsdOf({ inputUsdPerMTok: 3, outputUsdPerMTok: 15 }, usage)).toBeCloseTo(
      1 * 3 + 1 * 15 + 1 * 3,
      10,
    );
  });

  it('bills cache writes at the write premium rate', () => {
    expect(
      priceUsdOf(
        {
          inputUsdPerMTok: 5,
          outputUsdPerMTok: 30,
          cacheReadUsdPerMTok: 0.5,
          cacheWriteUsdPerMTok: 6.25,
        },
        { inputTokens: 200_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 100_000 },
      ),
    ).toBeCloseTo((100_000 / 1e6) * 5 + (100_000 / 1e6) * 6.25, 10);
  });
});

describe('long-context pricing tiers', () => {
  // The GPT-5.6 Sol rule: strictly above 272K input, the FULL request
  // prices at 2x input and 1.5x output.
  const base = {
    inputUsdPerMTok: 5,
    outputUsdPerMTok: 30,
    cacheReadUsdPerMTok: 0.5,
    cacheWriteUsdPerMTok: 6.25,
  };
  const tiered = {
    ...base,
    tiers: [{ aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 }],
  };
  const flat = (usage: Usage): number => priceUsdOf(base, usage);

  it('272,000 exactly stays on the base rates; 272,001 enters the tier', () => {
    const atThreshold: Usage = {
      inputTokens: 272_000,
      outputTokens: 10_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    expect(priceUsdOf(tiered, atThreshold)).toBeCloseTo(flat(atThreshold), 12);
    const overThreshold: Usage = { ...atThreshold, inputTokens: 272_001 };
    expect(priceUsdOf(tiered, overThreshold)).toBeCloseTo(
      (272_001 / 1e6) * 5 * 2 + (10_000 / 1e6) * 30 * 1.5,
      12,
    );
  });

  it('the tier re-prices the ENTIRE request, cache rates scaling with input', () => {
    const usage: Usage = {
      inputTokens: 500_000,
      outputTokens: 100_000,
      cacheReadTokens: 300_000,
      cacheWriteTokens: 100_000,
    };
    expect(priceUsdOf(tiered, usage)).toBeCloseTo(
      (100_000 / 1e6) * 5 * 2 + // uncached input
        (100_000 / 1e6) * 30 * 1.5 + // output
        (300_000 / 1e6) * 0.5 * 2 + // cache reads
        (100_000 / 1e6) * 6.25 * 2, // cache writes
      12,
    );
  });

  it('with several tiers the highest crossed threshold wins, independent of order', () => {
    const twoTiers = {
      inputUsdPerMTok: 1,
      outputUsdPerMTok: 1,
      tiers: [
        { aboveInputTokens: 500_000, inputMultiplier: 3, outputMultiplier: 3 },
        { aboveInputTokens: 100_000, inputMultiplier: 2, outputMultiplier: 2 },
      ],
    };
    const reversed = { ...twoTiers, tiers: [...twoTiers.tiers].reverse() };
    const mid: Usage = {
      inputTokens: 200_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    const high: Usage = { ...mid, inputTokens: 600_000 };
    expect(priceUsdOf(twoTiers, mid)).toBeCloseTo((200_000 / 1e6) * 2, 12);
    expect(priceUsdOf(reversed, mid)).toBeCloseTo((200_000 / 1e6) * 2, 12);
    expect(priceUsdOf(twoTiers, high)).toBeCloseTo((600_000 / 1e6) * 3, 12);
    expect(priceUsdOf(reversed, high)).toBeCloseTo((600_000 / 1e6) * 3, 12);
  });
});

describe('KeyedLimiter (M4-T07)', () => {
  it('keys without a cap run unlimited and never queue', async () => {
    const limiter = new KeyedLimiter({ capped: 1 });
    let concurrent = 0;
    let peak = 0;
    const job = async (): Promise<void> => {
      concurrent += 1;
      peak = Math.max(peak, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 5));
      concurrent -= 1;
    };
    await Promise.all([
      limiter.withSlot('free', job),
      limiter.withSlot('free', job),
      limiter.withSlot('free', job),
    ]);
    expect(peak).toBe(3);
    expect(limiter.pending('free')).toBe(0);
  });

  it('two keys throttle independently under load (acceptance)', async () => {
    const limiter = new KeyedLimiter({ a: 1, b: 1 });
    const running = { a: 0, b: 0 };
    const peaks = { a: 0, b: 0 };
    const order: string[] = [];
    const job = (key: 'a' | 'b', name: string) => async (): Promise<void> => {
      running[key] += 1;
      peaks[key] = Math.max(peaks[key], running[key]);
      order.push(`${name}:start`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running[key] -= 1;
      order.push(`${name}:end`);
    };
    await Promise.all([
      limiter.withSlot('a', job('a', 'a1')),
      limiter.withSlot('a', job('a', 'a2')),
      limiter.withSlot('b', job('b', 'b1')),
      limiter.withSlot('b', job('b', 'b2')),
    ]);
    // Each key serialized its own jobs (cap 1)...
    expect(peaks.a).toBe(1);
    expect(peaks.b).toBe(1);
    // ...while b1 started before a2 finished: keys never block each other.
    expect(order.indexOf('b1:start')).toBeLessThan(order.indexOf('a2:start'));
  });

  it('reports queue depth for capped keys', async () => {
    const limiter = new KeyedLimiter({ a: 1 });
    let releaseFirst: () => void = () => undefined;
    const first = limiter.withSlot(
      'a',
      () =>
        new Promise<void>((resolve) => {
          releaseFirst = resolve;
        }),
    );
    let queuedFired = false;
    const second = limiter.withSlot(
      'a',
      () => Promise.resolve(),
      () => {
        queuedFired = true;
      },
    );
    // The second caller queued behind the held slot.
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(queuedFired).toBe(true);
    expect(limiter.pending('a')).toBe(1);
    releaseFirst();
    await Promise.all([first, second]);
    expect(limiter.pending('a')).toBe(0);
  });
});
