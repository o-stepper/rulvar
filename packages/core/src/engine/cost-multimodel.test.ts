/**
 * Multi-model cost attribution. The loop, extract, finalize, and
 * summarize roles resolve independently, so one agent call routinely
 * spans models at different prices. Pricing the whole call at the loop
 * model's rate bills the cheap extract as if it had been the expensive
 * loop: the split rides the terminal entry so every fold (live buckets,
 * the kernel ledger, the journal CostReport, and replay) prices each
 * slice at its own model's rate and none of them can disagree.
 *
 * Also covers the two adjacent budget and routing holes: an unpriced
 * model cannot be bounded by a USD ceiling and now says so, and an
 * unregistered adapter names the role that pulled it in.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { Replayer } from '../journal/replayer.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import { parseModelRef } from '../model/router.js';
import { JsonlFileStore } from '../stores/jsonl.js';
import { costReportFromJournal } from './cost-report.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { scriptedAdapter, testCaps } from './test-harness.js';

const verdict = z.strictObject({ verdict: z.string() });

/** One million input tokens per call makes every price a round number. */
const MTOK: Usage = {
  inputTokens: 1_000_000,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

/** The loop model: 100 USD per Mtok in. */
const bigCaps = testCaps({ pricing: { inputUsdPerMTok: 100, outputUsdPerMTok: 0 } });
/** The extract model: 1 USD per Mtok in, a hundredth of the loop's. */
const smallCaps = testCaps({ pricing: { inputUsdPerMTok: 1, outputUsdPerMTok: 0 } });

function priceOf(caps: Record<string, { inputUsdPerMTok: number }>) {
  return (servedBy: ModelRef | undefined, usage: Usage): number | undefined => {
    if (servedBy === undefined) {
      return undefined;
    }
    const { adapterId } = parseModelRef(servedBy);
    const pricing = caps[adapterId];
    return pricing === undefined
      ? undefined
      : (usage.inputTokens / 1_000_000) * pricing.inputUsdPerMTok;
  };
}

const PRICES = { big: { inputUsdPerMTok: 100 }, small: { inputUsdPerMTok: 1 } };

/** A schema-bearing agent whose extract routes to a different, cheaper model. */
const mixed = defineWorkflow({ name: 'mixed' }, async (ctx) =>
  ctx.agent('judge this', { schema: verdict }),
);

function mixedEngine(store: JsonlFileStore) {
  // The loop turn burns 1 Mtok on the expensive model; the separate
  // extract burns 1 Mtok on the cheap one.
  const big = scriptedAdapter(() => ({ text: 'thinking', usage: MTOK }), {
    id: 'big',
    caps: bigCaps,
  });
  const small = scriptedAdapter(() => ({ text: '{"verdict":"pass"}', usage: MTOK }), {
    id: 'small',
    caps: smallCaps,
  });
  const engine = createEngine({
    adapters: [big, small],
    stores: { journal: store },
    defaults: { routing: { loop: 'big:model', extract: 'small:model' } },
  });
  return { engine, big, small };
}

describe('multi-model cost attribution', () => {
  it('prices each serving model at its own rate instead of billing the whole call at the loop model', async () => {
    const store = new JsonlFileStore({ dir: mkdtempSync(join(tmpdir(), 'rulvar-mm-')) });
    const { engine, big, small } = mixedEngine(store);
    const outcome = await engine.run(mixed, undefined, { runId: 'MM1' }).result;
    expect(outcome.status).toBe('ok');

    // Both models really served: the loop rode `big`, the extract `small`.
    expect(big.calls).toHaveLength(1);
    expect(small.calls).toHaveLength(1);

    // 1 Mtok at 100 USD plus 1 Mtok at 1 USD. Pricing the 2 Mtok total
    // at the loop model's rate (the old behavior) would read 200.
    expect(outcome.cost.totalUsd).toBeCloseTo(101);
    expect(outcome.cost.byModel).toEqual({ 'big:model': 100, 'small:model': 1 });
    expect(outcome.cost.unpriced).toEqual([]);

    // The split is journaled, so the fact survives the process.
    const entries = await store.load('MM1');
    const terminal = entries.find((e) => e.kind === 'agent' && e.status === 'ok');
    expect(terminal?.servedBy).toBe('big:model');
    expect(terminal?.usageByModel).toEqual([
      { servedBy: 'big:model', usage: MTOK },
      { servedBy: 'small:model', usage: MTOK },
    ]);

    // Every independent fold agrees with the live report, exactly.
    const price = priceOf(PRICES);
    const fold = costReportFromJournal(entries, price);
    expect(fold.totalUsd).toBeCloseTo(101);
    expect(fold.byModel).toEqual({ 'big:model': 100, 'small:model': 1 });
    const ledger = new Replayer({ runId: 'MM1', store, priceUsd: price, priorEntries: entries });
    expect(ledger.ledger().usd).toBeCloseTo(101);
  });

  it('replays the multi-model call with the same breakdown and zero live calls', async () => {
    const store = new JsonlFileStore({ dir: mkdtempSync(join(tmpdir(), 'rulvar-mm-')) });
    await mixedEngine(store).engine.run(mixed, undefined, { runId: 'MM2' }).result;

    // A restarted process: both adapters would explode if they ran.
    const boom = () => {
      throw new Error('MUST NOT RUN');
    };
    const big = scriptedAdapter(boom, { id: 'big', caps: bigCaps });
    const small = scriptedAdapter(boom, { id: 'small', caps: smallCaps });
    const engine = createEngine({
      adapters: [big, small],
      stores: { journal: store },
      defaults: { routing: { loop: 'big:model', extract: 'small:model' } },
    });
    const resumed = await engine.resume('MM2', mixed).result;

    expect(resumed.status).toBe('ok');
    expect(big.calls).toHaveLength(0);
    expect(small.calls).toHaveLength(0);
    // Replay reports what the live run reported: the buckets are keyed by
    // the SERVING model on both paths, so they cannot drift apart.
    expect(resumed.cost.totalUsd).toBeCloseTo(101);
    expect(resumed.cost.byModel).toEqual({ 'big:model': 100, 'small:model': 1 });
  });

  it('leaves a single-model call byte-identical: no split is written', async () => {
    const store = new JsonlFileStore({ dir: mkdtempSync(join(tmpdir(), 'rulvar-mm-')) });
    const only = scriptedAdapter(() => ({ text: '{"verdict":"pass"}', usage: MTOK }), {
      id: 'big',
      caps: bigCaps,
    });
    const engine = createEngine({
      adapters: [only],
      stores: { journal: store },
      // One model for both roles: the schema rides the loop turn.
      defaults: { routing: { loop: 'big:model', extract: 'big:model' } },
    });
    const outcome = await engine.run(mixed, undefined, { runId: 'MM3' }).result;

    expect(outcome.status).toBe('ok');
    expect(only.calls).toHaveLength(1);
    expect(outcome.cost.byModel).toEqual({ 'big:model': 100 });
    const terminal = (await store.load('MM3')).find((e) => e.kind === 'agent' && e.status === 'ok');
    // (usage, servedBy) already describes this call exactly.
    expect(terminal?.usageByModel).toBeUndefined();
  });
});

describe('an unpriced model cannot be bounded by a USD ceiling', () => {
  it('says so out loud, once per model, instead of silently escaping the ceiling', async () => {
    const store = new JsonlFileStore({ dir: mkdtempSync(join(tmpdir(), 'rulvar-mm-')) });
    // A local model, the usual case: caps declare no pricing at all.
    const local = scriptedAdapter(() => ({ text: 'ok', usage: MTOK }), {
      id: 'ollama',
      caps: testCaps({ pricing: undefined }),
    });
    const engine = createEngine({
      adapters: [local],
      stores: { journal: store },
      defaults: { routing: { loop: 'ollama:qwen3' } },
    });
    const twice = defineWorkflow({ name: 'twice' }, async (ctx) => {
      await ctx.agent('one');
      return ctx.agent('two');
    });

    const handle = engine.run(twice, undefined, { runId: 'MM4', budgetUsd: 0.01 });
    const warnings: string[] = [];
    handle.on('log', (event) => {
      if (event.level === 'warn') {
        warnings.push(event.msg);
      }
    });
    const outcome = await handle.result;

    // The ceiling truly does not bound it: both calls run and the run
    // completes, 1 cent ceiling notwithstanding. That is the honest
    // behavior for a free local model; what was missing was saying so.
    expect(outcome.status).toBe('ok');
    expect(local.calls).toHaveLength(2);
    expect(outcome.cost.totalUsd).toBe(0);
    expect(outcome.cost.unpriced).toHaveLength(2);

    const unpricedWarnings = warnings.filter((msg) => msg.includes('no price row'));
    expect(unpricedWarnings).toHaveLength(1); // once per model, not per turn
    expect(unpricedWarnings[0]).toContain('ollama:qwen3');
    expect(unpricedWarnings[0]).toContain('does NOT bound this model');
  });

  it('stays quiet when there is no ceiling to undermine', async () => {
    const store = new JsonlFileStore({ dir: mkdtempSync(join(tmpdir(), 'rulvar-mm-')) });
    const local = scriptedAdapter(() => ({ text: 'ok', usage: MTOK }), {
      id: 'ollama',
      caps: testCaps({ pricing: undefined }),
    });
    const engine = createEngine({
      adapters: [local],
      stores: { journal: store },
      defaults: { routing: { loop: 'ollama:qwen3' } },
    });
    const one = defineWorkflow({ name: 'one' }, async (ctx) => ctx.agent('one'));
    const handle = engine.run(one, undefined, { runId: 'MM5' });
    const warnings: string[] = [];
    handle.on('log', (event) => {
      if (event.level === 'warn') {
        warnings.push(event.msg);
      }
    });
    await handle.result;
    expect(warnings.filter((msg) => msg.includes('no price row'))).toHaveLength(0);
  });
});

describe('routing to an unregistered adapter', () => {
  it('names the role and the adapters that ARE registered', async () => {
    const store = new JsonlFileStore({ dir: mkdtempSync(join(tmpdir(), 'rulvar-mm-')) });
    const only = scriptedAdapter(() => ({ text: 'ok' }), { id: 'anthropic' });
    const engine = createEngine({
      adapters: [only],
      stores: { journal: store },
      // The shape of the recommended defaults: extract crosses to a
      // provider this engine never registered. Every schema-bearing
      // ctx.agent call resolves the extract role, so this fires on the
      // first one.
      defaults: { routing: { loop: 'anthropic:sonnet', extract: 'openai:mini' } },
    });
    const outcome = await engine.run(mixed, undefined, { runId: 'MM6' }).result;

    expect(outcome.status).toBe('error');
    const message = outcome.error?.message ?? '';
    expect(message).toContain("role 'extract'"); // WHICH role pulled it in
    expect(message).toContain("no adapter registered for 'openai'");
    expect(message).toContain('registered: anthropic'); // what you DO have
    expect(message).toContain('defaults.routing'); // where to fix it
  });
});
