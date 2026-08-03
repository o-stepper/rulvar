/**
 * The strict pre-egress pricing gate end to end (RV1508). An unpriced
 * model debits nothing, so every ceiling silently fails to bound it;
 * with the gate armed the dispatch refuses typed BEFORE the wire call,
 * the posture is recorded in RunMeta at genesis, and a resumed segment
 * restores it without re-supply, the exposure cap's rule (RV1504).
 */
import { describe, expect, it } from 'vitest';

import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter, testCaps } from './test-harness.js';

const single = defineWorkflow({ name: 'single' }, (ctx) => ctx.agent('one'));

describe('the strict pre-egress pricing gate end to end (RV1508)', () => {
  it('refuses an unpriced dispatch typed before any provider call', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'free?' }), {
      caps: testCaps({ pricing: undefined }),
    });
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(single, undefined, { strictPricing: true }).result;
    expect(outcome.status).toBe('error');
    expect(JSON.stringify(outcome)).toContain('no price row resolves');
    expect(adapter.calls).toHaveLength(0);
  });

  it('allowUnpriced is the explicit exception, and a priced model needs none', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'ok' }), {
      caps: testCaps({ pricing: undefined }),
    });
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(single, undefined, {
      strictPricing: { allowUnpriced: ['fake:model'] },
    }).result;
    expect(outcome.status).toBe('ok');
    expect(adapter.calls).toHaveLength(1);
  });

  it('records the posture in RunMeta and a resumed segment restores it', async () => {
    const store = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const crash = { now: true };
    const phased = defineWorkflow({ name: 'phased' }, async (ctx) => {
      const first = await ctx.agent('priced probe');
      if (crash.now) {
        throw new Error('host crash between the phases');
      }
      const second = await ctx.agent('unpriced probe');
      return { first: first, second };
    });
    // Segment 1: the loop model is priced, so the gate passes and the
    // run crashes at the host boundary after paying one call.
    const make = (priced: boolean) => {
      const adapter = scriptedAdapter(() => ({ text: 'x' }), {
        caps: priced ? testCaps() : testCaps({ pricing: undefined }),
      });
      return {
        adapter,
        engine: createEngine({
          adapters: [adapter],
          stores: { journal: store, transcripts },
          defaults: { routing: { loop: 'fake:model' } },
        }),
      };
    };
    const first = await make(true).engine.run(phased, undefined, {
      runId: 'GATED',
      strictPricing: true,
    }).result;
    expect(first.status).toBe('error');
    const meta = (await store.listRuns()).find((candidate) => candidate.runId === 'GATED');
    expect(meta?.strictPricing).toEqual({});

    // Segment 2 serves the SAME model ref from an adapter that now
    // reports no pricing: the restored gate refuses the live dispatch
    // even though nothing re-supplied the option.
    crash.now = false;
    const { adapter, engine } = make(false);
    const resumed = await engine.resume('GATED', phased).result;
    expect(resumed.status).toBe('error');
    expect(JSON.stringify(resumed)).toContain('no price row resolves');
    expect(adapter.calls).toHaveLength(0);
  });
});
