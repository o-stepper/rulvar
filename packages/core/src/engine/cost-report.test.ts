/**
 * Cost report reconciliation (M5-T03 acceptance): report totals equal
 * the ledger fold totals EXACTLY, live and after resume, computed
 * independently over the stored journal; unpriced models surface and
 * never contribute a silent zero to priced buckets.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { JsonlFileStore } from '../stores/jsonl.js';
import { Replayer } from '../journal/replayer.js';
import { parseModelRef } from '../model/router.js';
import { defineWorkflow } from './ctx.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import { createEngine } from './engine.js';
import { costReportFromJournal } from './cost-report.js';
import { scriptedAdapter, testCaps } from './test-harness.js';

const wf = defineWorkflow({ name: 'costly' }, async (ctx) => {
  const [a, b] = await ctx.parallel([
    () => ctx.agent('first task'),
    () => ctx.agent('second task'),
  ]);
  const c = await ctx.agent('third task');
  return { a, b, c };
});

function priceVia(adapter: { caps(model: string): { pricing?: unknown } }) {
  return (servedBy: ModelRef | undefined, usage: Usage): number | undefined => {
    if (servedBy === undefined) {
      return undefined;
    }
    const { model } = parseModelRef(servedBy);
    const pricing = adapter.caps(model).pricing as
      { inputUsdPerMTok: number; outputUsdPerMTok: number } | undefined;
    if (pricing === undefined) {
      return undefined;
    }
    return (
      (usage.inputTokens / 1_000_000) * pricing.inputUsdPerMTok +
      (usage.outputTokens / 1_000_000) * pricing.outputUsdPerMTok
    );
  };
}

describe('cost report reconciliation (M5-T03)', () => {
  it('live report totals equal the independent journal fold exactly', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-cost-'));
    const store = new JsonlFileStore({ dir });
    const adapter = scriptedAdapter((_req, call) => ({
      text: `answer ${call}`,
      usage: { inputTokens: 1000 + call * 100, outputTokens: 50 * (call + 1) },
    }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'COST1' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.cost.totalUsd).toBeGreaterThan(0);

    const entries = await store.load('COST1');
    const independent = costReportFromJournal(entries, priceVia(adapter));
    expect(independent.totalUsd).toBe(outcome.cost.totalUsd);
    expect(independent.byModel).toEqual({ 'fake:model': outcome.cost.totalUsd });
    expect(independent.unpriced).toEqual([]);

    // The kernel ledger fold agrees bit for bit.
    const replayer = new Replayer({
      runId: 'COST1',
      store,
      priceUsd: priceVia(adapter),
      priorEntries: entries,
    });
    expect(replayer.ledger().usd).toBe(outcome.cost.totalUsd);
    // The live attribution buckets sum to the same total on a
    // single-provider run.
    const bucketSum = Object.values(outcome.cost.byModel).reduce((acc, usd) => acc + usd, 0);
    expect(bucketSum).toBeCloseTo(outcome.cost.totalUsd, 12);
  });

  it('holds across resume: the resumed report equals the full-journal fold', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-cost-'));
    const store = new JsonlFileStore({ dir });
    const suspending = defineWorkflow({ name: 'gate' }, async (ctx) => {
      const first = await ctx.agent('paid before the gate');
      const approval = await ctx.awaitExternal('gate');
      const second = await ctx.agent('paid after the gate');
      return { first, second, approval };
    });
    const priced = () =>
      scriptedAdapter((_req, call) => ({
        text: `a${call}`,
        usage: { inputTokens: 500, outputTokens: 25 },
      }));
    const adapterA = priced();
    const engineA = createEngine({
      adapters: [adapterA],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const firstOutcome = await engineA.run(suspending, undefined, { runId: 'COST2' }).result;
    expect(firstOutcome.status).toBe('suspended');

    const offline = new Replayer({
      runId: 'COST2',
      store,
      priorEntries: await store.load('COST2'),
    });
    const open = (await store.load('COST2')).find((e) => e.kind === 'external');
    await offline.resolveSuspended(open?.seq ?? -1, { by: 'external', value: { go: true } });

    const adapterB = priced();
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engineB.resume('COST2', suspending).result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load('COST2');
    const independent = costReportFromJournal(entries, priceVia(adapterB));
    // The resumed run's report covers the WHOLE journal (replayed prefix
    // included), exactly like the fold.
    expect(outcome.cost.totalUsd).toBe(independent.totalUsd);
    expect(outcome.usage.inputTokens).toBe(1000);
  });

  it('surfaces unpriced models without silent zeros in both folds', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-cost-'));
    const store = new JsonlFileStore({ dir });
    const unpricedCaps = testCaps({ pricing: undefined });
    const adapter = scriptedAdapter(() => ({ text: 'free?' }), { caps: unpricedCaps });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const simple = defineWorkflow({ name: 'simple' }, (ctx) => ctx.agent('one'));
    const outcome = await engine.run(simple, undefined, { runId: 'COST3' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.cost.totalUsd).toBe(0);
    expect(outcome.cost.unpriced).toHaveLength(1);

    const independent = costReportFromJournal(await store.load('COST3'), priceVia(adapter));
    expect(independent.unpriced).toHaveLength(1);
    expect(independent.unpriced[0]?.model).toBe('fake:model');
    expect(independent.totalUsd).toBe(0);
  });
});
