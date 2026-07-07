/**
 * Versioned price table and the keyed limiter, unit level (M4-T06/T07):
 * table-wins resolution, the pricing math, unlimited-by-default keys,
 * and independent throttling per key (docs/04, section 10; docs/06,
 * section 4; Appendix A).
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

  it('prices normalized usage, cache rates included', () => {
    expect(
      priceUsdOf(
        {
          inputUsdPerMTok: 3,
          outputUsdPerMTok: 15,
          cacheReadUsdPerMTok: 0.3,
        },
        usage,
      ),
    ).toBeCloseTo(2 * 3 + 1 * 15 + 1 * 0.3, 10);
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
