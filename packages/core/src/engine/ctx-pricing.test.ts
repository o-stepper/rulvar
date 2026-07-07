/**
 * Pricing and per-provider keys at the ctx layer (M4-T06/T07): unpriced
 * models surface in the cost buckets and never price as a silent zero,
 * the versioned table wins over caps.pricing, decision entries pin
 * pricingVersion, price-table updates never disturb replay, and the
 * keyed limiter serializes one adapter while another runs free.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { testCaps } from './test-harness.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

describe('pricing through ctx (M4-T06)', () => {
  it('an unknown model surfaces as unpriced, never a silent zero', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'answer' }), {
      caps: testCaps({ pricing: undefined }),
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const ctx = createCtx(internals);
    await ctx.agent('do it');
    expect(internals.cost.unpriced).toHaveLength(1);
    expect(internals.cost.unpriced[0]?.model).toBe('fake:model');
  });

  it('the versioned table wins over caps.pricing for cost attribution', async () => {
    // caps say 1/10 per MTok; the table says 100x that.
    const adapter = scriptedAdapter(() => ({
      text: 'answer',
      usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
    }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      pricing: {
        pricingVersion: '2026-07-01',
        models: { 'fake:model': { inputUsdPerMTok: 100, outputUsdPerMTok: 1000 } },
      },
    });
    const ctx = createCtx(internals);
    await ctx.agent('do it');
    expect(internals.cost.byModel.get('fake:model')).toBeCloseTo(1100, 6);
    expect(internals.cost.unpriced).toHaveLength(0);
  });

  it('the model.fallback decision pins pricingVersion; a table update never disturbs replay', async () => {
    const verdictSchema = z.strictObject({ verdict: z.enum(['pass', 'fail']) });
    const weak = scriptedAdapter(() => ({ text: 'not json' }));
    const strong = scriptedAdapter(() => ({ text: '{"verdict":"pass"}' }), { id: 'strong' });
    const tableV1 = {
      pricingVersion: '2026-07-01',
      models: { 'fake:model': { inputUsdPerMTok: 1, outputUsdPerMTok: 10 } },
    };
    const { internals, store } = makeInternals({
      adapters: [weak, strong],
      routing: { loop: 'fake:model', extract: 'fake:model' },
      pricing: tableV1,
    });
    const ctx = createCtx(internals);
    const value = await ctx.agent('judge this', {
      schema: verdictSchema,
      memoizeOutcome: true,
      fallback: { model: 'strong:big', on: ['schema-exhausted'] },
    });
    expect(value).toEqual({ verdict: 'pass' });
    await internals.replayer.flush();
    const prior = await store.load('test-run');
    const decision = prior.find((e) => e.kind === 'decision');
    expect(decision?.value).toMatchObject({
      decisionType: 'model.fallback',
      pricingVersion: '2026-07-01',
    });

    // Replay under a BUMPED table: zero live calls, identical value,
    // and the journaled decision still pins the version that priced it.
    const replayWeak = scriptedAdapter(() => ({ text: 'unused' }));
    const replayStrong = scriptedAdapter(() => ({ text: 'unused' }), { id: 'strong' });
    const { internals: resumed, store: after } = makeInternals({
      adapters: [replayWeak, replayStrong],
      routing: { loop: 'fake:model', extract: 'fake:model' },
      pricing: {
        pricingVersion: '2026-08-01',
        models: { 'fake:model': { inputUsdPerMTok: 999, outputUsdPerMTok: 999 } },
      },
      priorEntries: prior,
    });
    const replayCtx = createCtx(resumed);
    const replayed = await replayCtx.agent('judge this', {
      schema: verdictSchema,
      memoizeOutcome: true,
      fallback: { model: 'strong:big', on: ['schema-exhausted'] },
    });
    expect(replayed).toEqual({ verdict: 'pass' });
    expect(replayWeak.calls).toHaveLength(0);
    expect(replayStrong.calls).toHaveLength(0);
    // The journaled decision was REUSED: the resumed store (which holds
    // only its own appends) wrote no duplicate under the bumped table.
    const appended = (await after.load('test-run')).filter((e) => e.kind === 'decision');
    expect(appended).toHaveLength(0);
  });
});

describe('per-provider keys through ctx (M4-T07)', () => {
  it('serializes a capped adapter while another provider runs free', async () => {
    const inflight = { a: 0, b: 0 };
    const peaks = { a: 0, b: 0 };
    const slowAdapter = (id: 'a' | 'b') =>
      scriptedAdapter(
        () => {
          inflight[id] += 1;
          peaks[id] = Math.max(peaks[id], inflight[id]);
          setTimeout(() => {
            inflight[id] -= 1;
          }, 8);
          return { text: `${id} answered`, hangMs: 10 };
        },
        { id },
      );
    const a = slowAdapter('a');
    const b = slowAdapter('b');
    const { internals } = makeInternals({
      adapters: [a, b],
      routing: { loop: 'fake:model' },
      perProvider: { a: 1 },
    });
    const ctx = createCtx(internals);
    const results = await ctx.parallel([
      () => ctx.agent('one', { model: 'a:m' }),
      () => ctx.agent('two', { model: 'a:m', key: 'two' }),
      () => ctx.agent('three', { model: 'b:m' }),
      () => ctx.agent('four', { model: 'b:m', key: 'four' }),
    ]);
    expect(results).toHaveLength(4);
    // Adapter a (cap 1) never ran two calls at once; b (uncapped) did.
    expect(peaks.a).toBe(1);
    expect(peaks.b).toBe(2);
  });
});
