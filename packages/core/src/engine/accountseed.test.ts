/**
 * The per-account resume seed end to end (RV1505, the DEF-7 remainder).
 * Two halves, shipped together because each is unsafe alone:
 *
 * 1. Reruns of journaled invocations re-admit as RECOVERED (the
 *    recoverInFlight rule extended to the ctx.agent dispatch layer):
 *    projected admission never re-evaluates history, because the money
 *    a rerun's original dispatch burned is already inside the resume
 *    seed, and holding the continuation of paid work to spent + fresh
 *    reserve against the ceiling refuses exactly the work the money
 *    was spent on. This hole predates account seeding: the ROOT seed
 *    (RV801) already refused a rerun at an exact-fill root ceiling.
 *
 * 2. Re-opened sub-accounts seed their INCLUSIVE settled spend from
 *    the accountSpendFromJournal fold, so a resumed segment makes the
 *    same admission and per-turn decisions a continuous run would
 *    have made; before the seed, sub-account history was per-process
 *    amnesia and a resumed child could silently overspend the very
 *    allowance its admission verdict recorded.
 */
import { describe, expect, it } from 'vitest';

import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter, type ScriptedTurn } from './test-harness.js';

/** testCaps pricing: 1 USD per MTok input, 10 USD per MTok output. */
function storedEngine(script: (call: number) => ScriptedTurn, countTokens?: () => number) {
  const store = new InMemoryStore();
  const transcripts = new InMemoryTranscriptStore();
  const counted: number[] = [];
  const make = () => {
    const base = scriptedAdapter((_req, call) => script(call));
    const adapter =
      countTokens === undefined
        ? base
        : {
            ...base,
            countTokens: (): Promise<number> => {
              const tokens = countTokens();
              counted.push(tokens);
              return Promise.resolve(tokens);
            },
          };
    return {
      adapter: base,
      engine: createEngine({
        adapters: [adapter],
        stores: { journal: store, transcripts },
        defaults: { routing: { loop: 'fake:model' } },
      }),
    };
  };
  return { store, make, counted };
}

describe('reruns of journaled invocations re-admit as recovered (RV1505)', () => {
  it('a rerun after an error terminal continues at an exact-fill root ceiling', async () => {
    // Segment 1: the probe errors after burning 0.0001 USD (100 input
    // tokens), then the host crashes, so the error terminal reruns on
    // resume. The estimate fills the 0.001 USD ceiling exactly, which
    // fresh admission allows (exact fill admits); on resume the seeded
    // 0.0001 USD plus the same estimate no longer fits, and only the
    // recovered re-admission keeps the continuation dispatchable.
    const crash = { now: true };
    const { make } = storedEngine((call) =>
      call === 0 && crash.now
        ? {
            usage: { inputTokens: 100, outputTokens: 0 },
            error: { code: 'server', message: 'upstream fault', retryable: false },
          }
        : { text: 'ok', usage: { inputTokens: 10, outputTokens: 5 } },
    );
    const wf = defineWorkflow({ name: 'retry' }, async (ctx) => {
      const first = await ctx.agent('probe', { result: 'full', estCost: 0.001 });
      if (crash.now) {
        throw new Error('host crash after the errored probe');
      }
      return { first: first.status };
    });

    const first = await make().engine.run(wf, undefined, {
      runId: 'RERUN-EXACT-FILL',
      budgetUsd: 0.001,
    }).result;
    expect(first.status).toBe('error');

    crash.now = false;
    const { adapter, engine } = make();
    const resumed = await engine.resume('RERUN-EXACT-FILL', wf).result;
    // Before the recovered re-admission this refused with 'budget
    // ceiling reached' and ZERO provider calls: the resumed segment
    // ended exhausted against the spend of the very work it resumed.
    expect(resumed.error?.message ?? '').not.toContain('budget ceiling reached');
    expect(resumed.status).toBe('ok');
    expect((resumed.value as { first: string }).first).toBe('ok');
    expect(adapter.calls).toHaveLength(1);
  });

  it('the rerun skips the pre-count feasibility floor, which gates new work only', async () => {
    // No estCost, so admission prices the reserve through countTokens
    // and the RV904 floor gate runs BEFORE the count. Segment 1 burns
    // 0.0006 USD of the 0.001 USD ceiling; on resume the floor (50
    // output tokens at 10 USD per MTok = 0.0005 USD) no longer fits
    // spent + floor, and only skipping the gate for the journaled
    // rerun lets the count and the recovered admission proceed.
    const crash = { now: true };
    const { make, counted } = storedEngine(
      (call) =>
        call === 0 && crash.now
          ? {
              usage: { inputTokens: 600, outputTokens: 0 },
              error: { code: 'server', message: 'upstream fault', retryable: false },
            }
          : { text: 'ok', usage: { inputTokens: 10, outputTokens: 5 } },
      () => 40,
    );
    const wf = defineWorkflow({ name: 'counted' }, async (ctx) => {
      const first = await ctx.agent('probe', {
        result: 'full',
        limits: { maxOutputTokensPerTurn: 50 },
      });
      if (crash.now) {
        throw new Error('host crash after the errored probe');
      }
      return { first: first.status };
    });

    const first = await make().engine.run(wf, undefined, {
      runId: 'RERUN-FLOOR-GATE',
      budgetUsd: 0.001,
    }).result;
    expect(first.status).toBe('error');
    const countsBefore = counted.length;

    crash.now = false;
    const { adapter, engine } = make();
    const resumed = await engine.resume('RERUN-FLOOR-GATE', wf).result;
    expect(resumed.error?.message ?? '').not.toContain('budget ceiling reached');
    expect(resumed.status).toBe('ok');
    expect((resumed.value as { first: string }).first).toBe('ok');
    // The rerun still priced its recovered reserve through the count;
    // only the refusal arm is out of its way.
    expect(counted.length).toBeGreaterThan(countsBefore);
    expect(adapter.calls).toHaveLength(1);
  });
});

describe('re-opened sub-accounts seed their settled spend (RV1505)', () => {
  it('a resumed child cannot overspend the allowance its verdict recorded', async () => {
    // Root ceiling 0.001 USD; the child admits under the default 0.3
    // childBudgetFraction, so its recorded allowance is 0.0003 USD.
    // Segment 1: the child's first agent settles ok at 0.0004 USD (one
    // whole-turn overshoot past the allowance, the documented layer-2
    // bound), then the host crashes inside the child. On resume the
    // child re-admits as recovered (the existing recoverInFlight path)
    // and its account re-opens SEEDED with the 0.0004 USD already
    // spent, so the never-dispatched second agent refuses against the
    // exhausted allowance exactly as a continuous run would have
    // refused it. Before the seed the account re-opened at zero and
    // the second agent silently overspent the recorded allowance.
    const crash = { now: true };
    const { make } = storedEngine((call) =>
      call === 0 && crash.now
        ? { text: 'big', usage: { inputTokens: 100, outputTokens: 30 } }
        : { text: 'more', usage: { inputTokens: 10, outputTokens: 5 } },
    );
    const kid = defineWorkflow({ name: 'kid' }, async (ctx) => {
      const a = await ctx.agent('big work', { result: 'full', estCost: 0.0003 });
      if (crash.now) {
        throw new Error('host crash inside the child');
      }
      const c = await ctx.agent('more work', { result: 'full', estCost: 0.0002 });
      return { a: a.status, c: c.status };
    });
    const wf = defineWorkflow({ name: 'parent' }, async (ctx) => {
      return ctx.workflow(kid, undefined);
    });

    const first = await make().engine.run(wf, undefined, {
      runId: 'CHILD-ALLOWANCE',
      budgetUsd: 0.001,
    }).result;
    expect(first.status).toBe('error');

    crash.now = false;
    const { adapter, engine } = make();
    const resumed = await engine.resume('CHILD-ALLOWANCE', wf).result;
    // The child's own rerun was admitted (recovered) and its settled
    // first agent replayed; the NEW second agent is what the exhausted
    // allowance refuses, before any provider call. The refusal is a
    // typed BudgetExhaustedError, so the run classifies 'exhausted',
    // exactly as a continuous run refusing the same spawn would.
    expect(resumed.status).toBe('exhausted');
    expect(resumed.error?.message ?? '').toContain('budget ceiling reached on account');
    expect(resumed.error?.message ?? '').toContain('kid');
    expect(adapter.calls).toHaveLength(0);
  });
});
