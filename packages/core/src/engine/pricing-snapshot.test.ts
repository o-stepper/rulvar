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
import { costReportFromJournal } from './cost-report.js';
import { Replayer } from '../journal/replayer.js';
import { normalizeEntry } from '../l0/entries.js';
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

describe('per-segment pin composition (RV505, the ninth-experiment accounting P1)', () => {
  const usageEntry = (seq: number, inputTokens: number): JournalEntry => ({
    hashVersion: 2,
    spanId: 's0',
    startedAt: '2026-07-28T00:00:00.000Z',
    seq,
    scope: '',
    key: `agent:${String(seq)}`,
    ordinal: 0,
    kind: 'agent',
    status: 'ok',
    servedBy: 'fake:model',
    usage: { inputTokens, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
  });
  const settleEntry = (
    seq: number,
    segment: number,
    inputUsdPerMTok: number,
    version: string,
  ): JournalEntry => ({
    hashVersion: 2,
    spanId: 's0',
    startedAt: '2026-07-28T00:00:00.000Z',
    seq,
    scope: '',
    key: `run-settle:${String(segment)}`,
    ordinal: 0,
    kind: 'decision',
    status: 'ok',
    value: {
      decisionType: RUN_SETTLE_DECISION_TYPE,
      runStatus: 'suspended',
      segment,
      pricing: [{ model: 'fake:model', rates: { inputUsdPerMTok, outputUsdPerMTok: 0 } }],
      pricingVersion: version,
    },
  });
  // Segment 1 settled under 10 USD/MTok; the table rotated; segment 2
  // settled under 100. Two usage rows of 1M input each.
  const rotated = (): JournalEntry[] => [
    usageEntry(0, 1_000_000),
    settleEntry(1, 1, 10, 'v-a'),
    usageEntry(2, 1_000_000),
    settleEntry(3, 2, 100, 'v-b'),
  ];

  it('prices each row under the pin of its OWN segment, not the last pin', () => {
    const snapshot = journalPricingSnapshot(rotated());
    expect(snapshot).toBeDefined();
    const usage = {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    // Seq 0 settled first under v-a: its applied rate is 10.
    expect(snapshot?.priceUsd('fake:model', usage, 0)).toBe(10);
    // Seq 2 belongs to the second segment: 100.
    expect(snapshot?.priceUsd('fake:model', usage, 2)).toBe(100);
    // A seq-less caller keeps the historical last-pin behavior.
    expect(snapshot?.priceUsd('fake:model', usage)).toBe(100);
    expect(snapshot?.pinnedThroughSeq).toBe(3);
    expect(snapshot?.pricingVersion).toBe('v-b');
  });

  it('a seq-aware CostReport fold composes the pins: history never re-prices', () => {
    const entries = rotated();
    const snapshot = journalPricingSnapshot(entries);
    const report = costReportFromJournal(entries, snapshot?.priceUsd ?? (() => undefined));
    // 1M at 10 plus 1M at 100; the pre-RV505 reader priced BOTH at the
    // last pin (200 total).
    expect(report.totalUsd).toBe(110);
  });

  it('a single-pin journal behaves exactly as before', () => {
    const entries = [usageEntry(0, 1_000_000), settleEntry(1, 1, 10, 'v-a')];
    const snapshot = journalPricingSnapshot(entries);
    const usage = {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    expect(snapshot?.priceUsd('fake:model', usage, 0)).toBe(10);
    expect(snapshot?.priceUsd('fake:model', usage)).toBe(10);
    const report = costReportFromJournal(entries, snapshot?.priceUsd ?? (() => undefined));
    expect(report.totalUsd).toBe(10);
  });
});

describe('rotation across a resume: the outcome mirror composes the pins (RV505 e2e)', () => {
  it('prices segment one at its own settled rates and segment two at the live table', async () => {
    const store = new InMemoryStore();
    const usage = { inputTokens: 1_000_000, outputTokens: 0 };
    const wf = defineWorkflow({ name: 'rotate' }, async (ctx) => {
      await ctx.agent('segment one paid work');
      await ctx.awaitExternal('rotate-gate', { prompt: 'operator continues after the rotation' });
      await ctx.agent('segment two paid work');
      return 'done';
    });
    const engineA = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'one', usage }), { caps: testCaps() })],
      defaults: { routing: { loop: 'fake:model' } },
      stores: { journal: store },
      pricing: TABLE_A,
    });
    const first = await engineA.run(wf, undefined, { runId: 'rotate-run' }).result;
    expect(first.status).toBe('suspended');
    // 1M input at TABLE_A's 3 USD/MTok.
    expect(first.cost.totalUsd).toBeCloseTo(3, 10);

    // Offline: the operator resolves the gate over the store, then a
    // NEW process resumes under the rotated table.
    const prior = (await store.load('rotate-run')).map((entry) => normalizeEntry(entry));
    const gateSeq = prior.find((e) => e.kind === 'external' && e.status === 'suspended')?.seq;
    expect(gateSeq).toBeDefined();
    const offline = new Replayer({ runId: 'rotate-run', store, priorEntries: prior });
    const resolution = await offline.resolveSuspended(gateSeq ?? -1, {
      by: 'external',
      value: { approved: true },
    });
    expect(resolution.applied).toBe(true);

    const engineB = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'two', usage }), { caps: testCaps() })],
      defaults: { routing: { loop: 'fake:model' } },
      stores: { journal: store },
      pricing: TABLE_B,
    });
    const outcome = await engineB.resume('rotate-run', wf).result;
    expect(outcome.status).toBe('ok');
    // Segment one stays at its OWN settled rates (3), segment two at
    // the live table (30): 33, never 60 (the pre-RV505 last-pin fold
    // re-priced history under the rotated table).
    expect(outcome.cost.totalUsd).toBeCloseTo(33, 10);

    // The post-hoc snapshot fold over the finished journal agrees.
    const entries = (await store.load('rotate-run')).map((entry) => normalizeEntry(entry));
    const snapshot = journalPricingSnapshot(entries);
    expect(snapshot).toBeDefined();
    const report = costReportFromJournal(entries, snapshot?.priceUsd ?? (() => undefined));
    expect(report.totalUsd).toBeCloseTo(33, 10);

    // Stored-consumer parity (RV611): the composed fold IS the mirror's
    // fold, so a CLI or server reading this journal reports the exact
    // number the settled outcome carried.
    const composed = snapshot?.composedPriceUsd(priceWith(TABLE_B));
    expect(composed).toBeDefined();
    const consumerReport = costReportFromJournal(entries, composed ?? (() => undefined));
    expect(consumerReport.totalUsd).toBeCloseTo(33, 10);
  });
});

describe('stored consumers compose the pins like the engine (RV611)', () => {
  const usageOn = (seq: number, model: string, inputTokens: number): JournalEntry => ({
    hashVersion: 2,
    spanId: 's0',
    startedAt: '2026-07-29T00:00:00.000Z',
    seq,
    scope: '',
    key: `agent:${String(seq)}`,
    ordinal: 0,
    kind: 'agent',
    status: 'ok',
    servedBy: model as ModelRef,
    usage: { inputTokens, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
  });
  const settleWith = (
    seq: number,
    segment: number,
    rows: Array<{ model: string; inputUsdPerMTok: number }>,
    version: string,
  ): JournalEntry => ({
    hashVersion: 2,
    spanId: 's0',
    startedAt: '2026-07-29T00:00:00.000Z',
    seq,
    scope: '',
    key: `run-settle:${String(segment)}`,
    ordinal: 0,
    kind: 'decision',
    status: 'ok',
    value: {
      decisionType: RUN_SETTLE_DECISION_TYPE,
      runStatus: 'suspended',
      segment,
      pricing: rows.map((row) => ({
        model: row.model,
        rates: { inputUsdPerMTok: row.inputUsdPerMTok, outputUsdPerMTok: 0 },
      })),
      pricingVersion: version,
    },
  });
  const oneM: Usage = {
    inputTokens: 1_000_000,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
  const currentTable = (rows: Record<string, number>) =>
    priceWith({
      pricingVersion: 'v-live',
      models: Object.fromEntries(
        Object.entries(rows).map(([model, rate]) => [
          model,
          { inputUsdPerMTok: rate, outputUsdPerMTok: 0 },
        ]),
      ),
    });

  it('prices the tail after the last settle at the current table, never the last pin', () => {
    // Segment one settled under a 10 USD/MTok pin; segment two journaled
    // paid work and then the process died before its settle. The engine's
    // outcome mirror prices exactly this shape live at the current table,
    // so a stored consumer folding the same journal must agree: 10 + 30,
    // never 10 + 10 (the raw last-pin fold, silently wrong rates).
    const entries = [
      usageOn(0, 'fake:model', 1_000_000),
      settleWith(1, 1, [{ model: 'fake:model', inputUsdPerMTok: 10 }], 'v-a'),
      usageOn(2, 'fake:model', 1_000_000),
    ];
    const snapshot = journalPricingSnapshot(entries);
    const composed = snapshot?.composedPriceUsd(currentTable({ 'fake:model': 30 }));
    expect(composed).toBeDefined();
    expect(composed?.('fake:model', oneM, 0)).toBe(10);
    expect(composed?.('fake:model', oneM, 2)).toBe(30);
    // The seq-aware raw snapshot keeps its documented last-pin answer;
    // the composition exists so stored consumers stop using it raw.
    expect(snapshot?.priceUsd('fake:model', oneM, 2)).toBe(10);
    const report = costReportFromJournal(entries, composed ?? (() => undefined));
    expect(report.totalUsd).toBe(40);
  });

  it('a tail model no pin names prices at the current table instead of folding unpriced', () => {
    const entries = [
      usageOn(0, 'fake:model', 1_000_000),
      settleWith(1, 1, [{ model: 'fake:model', inputUsdPerMTok: 10 }], 'v-a'),
      usageOn(2, 'fake:new', 1_000_000),
    ];
    const snapshot = journalPricingSnapshot(entries);
    const composed = snapshot?.composedPriceUsd(currentTable({ 'fake:model': 30, 'fake:new': 7 }));
    expect(composed?.('fake:new', oneM, 2)).toBe(7);
    const report = costReportFromJournal(entries, composed ?? (() => undefined));
    expect(report.totalUsd).toBe(17);
    expect(report.unpriced).toEqual([]);
  });

  it('a model first appearing in a late pin back-reprices its earlier covered rows at the last pin; a model no pin names falls to the current table', () => {
    // 'fake:late' was unpriced when segment one settled and got its first
    // pinned rates in segment two: its segment-one row back-reprices at
    // the LAST pin, the documented deliberate compromise (the journal
    // never recorded what those debits actually cost). 'fake:never' is in
    // no pin at all: the current table answers, exactly like the engine
    // mirror, never a silent unpriced when today's table knows the model.
    const entries = [
      usageOn(0, 'fake:late', 1_000_000),
      usageOn(1, 'fake:never', 1_000_000),
      settleWith(2, 1, [{ model: 'fake:model', inputUsdPerMTok: 10 }], 'v-a'),
      usageOn(3, 'fake:late', 1_000_000),
      settleWith(
        4,
        2,
        [
          { model: 'fake:model', inputUsdPerMTok: 10 },
          { model: 'fake:late', inputUsdPerMTok: 100 },
        ],
        'v-b',
      ),
    ];
    const snapshot = journalPricingSnapshot(entries);
    const composed = snapshot?.composedPriceUsd(currentTable({ 'fake:late': 7, 'fake:never': 7 }));
    expect(composed?.('fake:late', oneM, 0)).toBe(100);
    expect(composed?.('fake:never', oneM, 1)).toBe(7);
    expect(composed?.('fake:late', oneM, 3)).toBe(100);
  });

  it('segments declare every pin: boundaries, versions, and rows, not only the last', () => {
    const entries = [
      usageOn(0, 'fake:model', 1_000_000),
      settleWith(1, 1, [{ model: 'fake:model', inputUsdPerMTok: 10 }], 'v-a'),
      usageOn(2, 'fake:model', 1_000_000),
      settleWith(3, 2, [{ model: 'fake:model', inputUsdPerMTok: 100 }], 'v-b'),
    ];
    const snapshot = journalPricingSnapshot(entries);
    expect(snapshot?.segments).toEqual([
      {
        fromSeq: 0,
        settleSeq: 1,
        pricingVersion: 'v-a',
        rows: [{ model: 'fake:model', rates: { inputUsdPerMTok: 10, outputUsdPerMTok: 0 } }],
        rowsHash: expect.stringMatching(/^[0-9a-f]{64}$/) as string,
      },
      {
        fromSeq: 1,
        settleSeq: 3,
        pricingVersion: 'v-b',
        rows: [{ model: 'fake:model', rates: { inputUsdPerMTok: 100, outputUsdPerMTok: 0 } }],
        rowsHash: expect.stringMatching(/^[0-9a-f]{64}$/) as string,
      },
    ]);
    // Two pins with different rates carry different content hashes
    // (RV3703), whatever their version labels say.
    expect(snapshot?.segments[0]?.rowsHash).not.toBe(snapshot?.segments[1]?.rowsHash);
    // The last-pin fields keep their historical meaning.
    expect(snapshot?.pricingVersion).toBe('v-b');
    expect(snapshot?.pinnedThroughSeq).toBe(3);
  });
});

describe('rates verification date through the pin (RV814)', () => {
  it('a row ratesVerifiedAt survives the settle pin and the snapshot rebuild', async () => {
    // The verification date is part of the row the settle pins, so an
    // invoice folded years later can still say how fresh the rates
    // that PRICED the run were, whatever today's table claims.
    const table: PriceTable = {
      pricingVersion: 'v-dated',
      models: {
        'fake:model': {
          inputUsdPerMTok: 3,
          outputUsdPerMTok: 15,
          ratesVerifiedAt: '2026-07-18',
        },
      },
    };
    const entries = await settledEntries(table);
    const snapshot = journalPricingSnapshot(entries);
    expect(snapshot?.rows).toHaveLength(1);
    expect(snapshot?.rows[0]?.rates.ratesVerifiedAt).toBe('2026-07-18');
  });
});

describe('the provenance tail: content hash and freshness range (RV3703)', () => {
  it('derives a stable rowsHash on every fold, sensitive to rates under one version label', async () => {
    const entries = await settledEntries(TABLE_A);
    const first = journalPricingSnapshot(entries);
    const second = journalPricingSnapshot(entries);
    expect(first?.rowsHash).toMatch(/^[0-9a-f]{64}$/);
    expect(second?.rowsHash).toBe(first?.rowsHash);
    expect(first?.segments.every((segment) => segment.rowsHash === first.rowsHash)).toBe(true);
    // Same version STRING, different rates: the label cannot tell the
    // two tables apart (the third experiment's price defect class),
    // the content hash can.
    const relabeled: PriceTable = {
      pricingVersion: 'v-a',
      models: {
        'fake:model': { inputUsdPerMTok: 4, outputUsdPerMTok: 15, cacheReadUsdPerMTok: 0.3 },
      },
    };
    const other = journalPricingSnapshot(await settledEntries(relabeled));
    expect(other?.pricingVersion).toBe(first?.pricingVersion);
    expect(other?.rowsHash).not.toBe(first?.rowsHash);
  });

  it('reports the freshness range of dated pins and stays silent on undated ones', async () => {
    const dated: PriceTable = {
      pricingVersion: 'v-dated',
      models: {
        'fake:model': { inputUsdPerMTok: 3, outputUsdPerMTok: 15, ratesVerifiedAt: '2026-08-01' },
      },
    };
    const snapshot = journalPricingSnapshot(await settledEntries(dated));
    expect(snapshot?.ratesVerifiedAt).toEqual({ oldest: '2026-08-01', newest: '2026-08-01' });
    expect(snapshot?.segments[0]?.ratesVerifiedAt).toEqual({
      oldest: '2026-08-01',
      newest: '2026-08-01',
    });
    const undated = journalPricingSnapshot(await settledEntries(TABLE_A));
    expect(undated?.rowsHash).toMatch(/^[0-9a-f]{64}$/);
    expect(undated?.ratesVerifiedAt).toBeUndefined();
  });

  it('spans the range across differently dated rows and skips unparsable dates', () => {
    const pin = {
      kind: 'decision',
      seq: 9,
      value: {
        decisionType: RUN_SETTLE_DECISION_TYPE,
        pricingVersion: 'v-mixed',
        pricing: [
          {
            model: 'fake:a',
            rates: { inputUsdPerMTok: 1, outputUsdPerMTok: 2, ratesVerifiedAt: '2026-07-01' },
          },
          {
            model: 'fake:b',
            rates: { inputUsdPerMTok: 1, outputUsdPerMTok: 2, ratesVerifiedAt: '2026-08-05' },
          },
          {
            model: 'fake:c',
            rates: { inputUsdPerMTok: 1, outputUsdPerMTok: 2, ratesVerifiedAt: 'not a date' },
          },
        ],
      },
    } as unknown as JournalEntry;
    const snapshot = journalPricingSnapshot([pin]);
    expect(snapshot?.ratesVerifiedAt).toEqual({ oldest: '2026-07-01', newest: '2026-08-05' });
    expect(snapshot?.segments[0]?.rowsHash).toBe(snapshot?.rowsHash);
  });
});
