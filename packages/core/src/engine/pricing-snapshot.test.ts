/**
 * Historically stable invoices (RV407, the eighth-experiment review):
 * the settling segment pins the pricing it APPLIED into the existing
 * run-settle decision value (additive, the outputHash precedent), and
 * `journalPricingSnapshot` rebuilds a priceUsd from those pinned rows,
 * so a repeated invoice fold after the live table changed reproduces
 * the original numbers instead of silently re-pricing history.
 */
import { describe, expect, it } from 'vitest';

import type { JournalEntry } from '../l0/entries.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import type { PriceTable } from '../model/pricing.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { RUN_SETTLE_DECISION_TYPE } from '../stores/reconcile.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { invoiceFromJournal } from './invoice.js';
import { journalPricingSnapshot } from './pricing-snapshot.js';
import { scriptedAdapter, testCaps } from './test-harness.js';

const TABLE_A: PriceTable = {
  pricingVersion: 'v-a',
  models: {
    'fake:model': { inputUsdPerMTok: 3, outputUsdPerMTok: 15, cacheReadUsdPerMTok: 0.3 },
  },
};

const TABLE_B: PriceTable = {
  pricingVersion: 'v-b',
  models: {
    'fake:model': { inputUsdPerMTok: 30, outputUsdPerMTok: 150, cacheReadUsdPerMTok: 3 },
  },
};

const priceWith =
  (table: PriceTable) =>
  (servedBy: ModelRef, usage: Usage): number | undefined => {
    const row = table.models[servedBy];
    if (row === undefined) {
      return undefined;
    }
    const uncached = usage.inputTokens - usage.cacheReadTokens - usage.cacheWriteTokens;
    return (
      (uncached * row.inputUsdPerMTok +
        usage.outputTokens * row.outputUsdPerMTok +
        usage.cacheReadTokens * (row.cacheReadUsdPerMTok ?? row.inputUsdPerMTok) +
        usage.cacheWriteTokens * (row.cacheWriteUsdPerMTok ?? row.inputUsdPerMTok)) /
      1_000_000
    );
  };

async function settledEntries(
  table?: PriceTable,
  options?: { unpricedCaps?: boolean },
): Promise<JournalEntry[]> {
  const store = new InMemoryStore();
  // With unpricedCaps, NOTHING resolves a price: no table row and no
  // adapter caps fallback, the genuinely unpriced run.
  const caps = testCaps();
  if (options?.unpricedCaps === true) {
    delete (caps as { pricing?: unknown }).pricing;
  }
  const engine = createEngine({
    adapters: [scriptedAdapter(() => ({ text: 'priced work' }), { caps })],
    defaults: { routing: { loop: 'fake:model' } },
    stores: { journal: store },
    ...(table === undefined ? {} : { pricing: table }),
  });
  const wf = defineWorkflow({ name: 'priced' }, async (ctx) => {
    await ctx.agent('do priced work');
    return 'done';
  });
  const outcome = await engine.run(wf, undefined, { runId: 'pricing-snapshot-run' }).result;
  expect(outcome.status).toBe('ok');
  return store.load('pricing-snapshot-run');
}

function runSettleValue(entries: readonly JournalEntry[]): Record<string, unknown> | undefined {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.kind !== 'decision') {
      continue;
    }
    const value = entry.value as { decisionType?: unknown } | undefined;
    if (value?.decisionType === RUN_SETTLE_DECISION_TYPE) {
      return value;
    }
  }
  return undefined;
}

describe('the applied-pricing snapshot in the run settle (RV407)', () => {
  it('pins the applied rows and the table version into the run-settle value', async () => {
    const entries = await settledEntries(TABLE_A);
    const settle = runSettleValue(entries);
    expect(settle).toBeDefined();
    expect(settle?.pricingVersion).toBe('v-a');
    const rows = settle?.pricing as
      Array<{ model: string; rates: { inputUsdPerMTok: number } }> | undefined;
    expect(rows).toBeDefined();
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.model).toBe('fake:model');
    expect(rows?.[0]?.rates.inputUsdPerMTok).toBe(3);
  });

  it('settles byte-identically when no pricing resolves', async () => {
    const entries = await settledEntries(undefined, { unpricedCaps: true });
    const settle = runSettleValue(entries);
    expect(settle).toBeDefined();
    expect(settle).not.toHaveProperty('pricing');
    expect(settle).not.toHaveProperty('pricingVersion');
  });

  it('never pins without a configured table: caps-only runs settle byte-identically', async () => {
    // Caps-fallback pricing arrives ambiently from the adapter; a
    // setting the user never enabled must not change the journal (the
    // byte doctrine, pinned by the plan cassettes). Caps-only runs keep
    // the fold-time pricing they always had.
    const entries = await settledEntries(undefined);
    const settle = runSettleValue(entries);
    expect(settle).toBeDefined();
    expect(settle).not.toHaveProperty('pricing');
    expect(settle).not.toHaveProperty('pricingVersion');
    expect(journalPricingSnapshot(entries)).toBeUndefined();
  });

  it('reproduces the original invoice after the live table changes', async () => {
    const entries = await settledEntries(TABLE_A);
    const snapshot = journalPricingSnapshot(entries);
    expect(snapshot).toBeDefined();
    expect(snapshot?.pricingVersion).toBe('v-a');

    const original = invoiceFromJournal(entries, snapshot?.priceUsd ?? priceWith(TABLE_A));
    expect(original.totalUsd).toBeGreaterThan(0);

    // The live table moved 10x. The current-table fold drifts; the
    // snapshot fold reproduces the original numbers exactly.
    const drifted = invoiceFromJournal(entries, priceWith(TABLE_B));
    expect(drifted.totalUsd).not.toBe(original.totalUsd);

    const reproduced = invoiceFromJournal(entries, snapshot?.priceUsd ?? priceWith(TABLE_B));
    expect(reproduced.totalUsd).toBe(original.totalUsd);
    expect(reproduced.netUsd).toBe(original.netUsd);
    expect(reproduced.rows.map((row) => row.usd)).toEqual(original.rows.map((row) => row.usd));
    expect(reproduced.rows.map((row) => row.allocatedUsd)).toEqual(
      original.rows.map((row) => row.allocatedUsd),
    );
  });

  it('returns undefined for a journal settled without a snapshot', async () => {
    const entries = await settledEntries(undefined, { unpricedCaps: true });
    expect(journalPricingSnapshot(entries)).toBeUndefined();
  });

  it('never pins a broken rate: a NaN-priced model settles unpinned', async () => {
    // The fold folds a NaN price as unpriced; the pin mirrors that and
    // never feeds a non-finite number to the journal serialization gate.
    const entries = await settledEntries({
      pricingVersion: 'v-broken',
      models: { 'fake:model': { inputUsdPerMTok: Number.NaN, outputUsdPerMTok: 15 } },
    });
    const settle = runSettleValue(entries);
    expect(settle).toBeDefined();
    expect(settle).not.toHaveProperty('pricing');
    expect(settle).not.toHaveProperty('pricingVersion');
  });

  it('spreads the pricing provenance into the invoice export', async () => {
    const entries = await settledEntries(TABLE_A);
    const snapshot = journalPricingSnapshot(entries);
    const priced = invoiceFromJournal(entries, snapshot?.priceUsd ?? priceWith(TABLE_A), {
      pricing: {
        source: 'snapshot',
        pricingVersion: snapshot?.pricingVersion,
        rows: snapshot?.rows,
      },
    });
    expect(priced.pricing?.source).toBe('snapshot');
    expect(priced.pricing?.pricingVersion).toBe('v-a');
    expect(priced.pricing?.rows).toHaveLength(1);
  });
});
