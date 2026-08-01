/**
 * The persisted terminal (RV1209, the P1-4 arc): a run that left this
 * process is still a settled run, and its terminal must be readable
 * from the journal that recorded it. The fold reuses the ONE envelope
 * assembler (RV1105), so a restarted reader gets the SAME shape a live
 * consumer holds, marked `provenance: 'journal'` and honest about the
 * two facts the journal never records (the semantic completion claim
 * and the terminal wire error). Where the journal proves no terminal
 * at all, the fold refuses with a typed reason instead of dressing the
 * meta projection up as an envelope.
 */
import { describe, expect, it } from 'vitest';

import { normalizeEntry } from '../l0/entries.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { readRunMeta } from '../stores/meta-lookup.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { persistedTerminalEnvelope } from './persisted-terminal.js';
import { journalPricingSnapshot } from './pricing-snapshot.js';
import { scriptedAdapter } from './test-harness.js';

const USAGE = {
  inputTokens: 100_000,
  outputTokens: 10_000,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

/** 100k in at 10/MTok + 10k out at 50/MTok = 1.5 USD per call, exactly. */
const PRICING = {
  pricingVersion: 'persisted-v1',
  models: { 'fake:model': { inputUsdPerMTok: 10, outputUsdPerMTok: 50 } },
};

const claiming = defineWorkflow({ name: 'persisted' }, async (ctx) => {
  await ctx.agent('hi');
  return { result: 'done', completion: 'complete' as const };
});

function engineOver(store: InMemoryStore) {
  return createEngine({
    adapters: [scriptedAdapter(() => ({ text: 'done', usage: USAGE }))],
    stores: { journal: store },
    defaults: { routing: { loop: 'fake:model' } },
    pricing: PRICING,
  });
}

/** Reloads the run exactly as a restarted reader would: store, not memory. */
async function reload(store: InMemoryStore, runId: string) {
  const entries = (await store.load(runId)).map((raw) => normalizeEntry(raw));
  const meta = await readRunMeta(store, runId);
  const snapshot = journalPricingSnapshot(entries);
  const priceUsd =
    snapshot === undefined
      ? (): undefined => undefined
      : snapshot.composedPriceUsd((): undefined => undefined);
  return { entries, meta, priceUsd };
}

describe('the persisted terminal envelope (RV1209)', () => {
  it('reproduces every envelope fact the journal records, marked as journal-derived', async () => {
    const store = new InMemoryStore();
    const outcome = await engineOver(store).run(claiming, undefined, { runId: 'PT1' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.envelope.completion).toBe('complete');
    expect(outcome.envelope.totalUsd).toBe(1.5);

    const { entries, meta, priceUsd } = await reload(store, 'PT1');
    const derived = persistedTerminalEnvelope({ runId: 'PT1', meta, entries, priceUsd });
    expect(derived.available).toBe(true);
    if (!derived.available) {
      return;
    }
    // The dollars, the usage, the agent count and the settlement
    // verdict all survive the restart, priced by the settle's own pin.
    expect(derived.envelope.runId).toBe('PT1');
    expect(derived.envelope.workflow).toBe('persisted');
    expect(derived.envelope.status).toBe('ok');
    expect(derived.envelope.settled).toBe(true);
    expect(derived.envelope.totalUsd).toBe(outcome.envelope.totalUsd);
    expect(derived.envelope.grossUsd).toBe(outcome.envelope.grossUsd);
    expect(derived.envelope.costByModel).toEqual(outcome.envelope.costByModel);
    expect(derived.envelope.usage).toEqual(outcome.envelope.usage);
    expect(derived.envelope.usageApprox).toBe(outcome.envelope.usageApprox);
    expect(derived.envelope.agentsSpawned).toBe(outcome.envelope.agentsSpawned);
    // The two facts the journal never records stay ABSENT, and the
    // marker says why: absence here means "not recorded", never "the
    // workflow claimed nothing".
    expect(derived.envelope.provenance).toBe('journal');
    expect('completion' in derived.envelope).toBe(false);
    expect('error' in derived.envelope).toBe(false);
  });

  it('a live assembly carries no provenance marker: absent means assembled at the settle', async () => {
    const store = new InMemoryStore();
    const outcome = await engineOver(store).run(claiming, undefined, { runId: 'PT2' }).result;
    expect('provenance' in outcome.envelope).toBe(false);
  });

  it('refuses typed when the journal carries no settle at all', async () => {
    const store = new InMemoryStore();
    await engineOver(store).run(claiming, undefined, { runId: 'PT3' }).result;
    const { entries, meta, priceUsd } = await reload(store, 'PT3');
    const withoutSettle = entries.filter(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType !== 'run_settle',
    );
    const derived = persistedTerminalEnvelope({
      runId: 'PT3',
      meta,
      entries: withoutSettle,
      priceUsd,
    });
    expect(derived.available).toBe(false);
    if (derived.available) {
      return;
    }
    expect(derived.reason).toBe('unsettled');
  });

  it('refuses typed when nothing names the workflow the terminal belongs to', async () => {
    const store = new InMemoryStore();
    await engineOver(store).run(claiming, undefined, { runId: 'PT4' }).result;
    const { entries, priceUsd } = await reload(store, 'PT4');
    const derived = persistedTerminalEnvelope({
      runId: 'PT4',
      meta: undefined,
      entries,
      priceUsd,
    });
    expect(derived.available).toBe(false);
    if (derived.available) {
      return;
    }
    expect(derived.reason).toBe('unknown-workflow');
  });
});
