/**
 * The honest invoice (the 1.65.0 experiment review, items 11.2/11.3,
 * recommendations P1.2/P1.3/P1.4). Reproduced on published 1.66.0:
 * rows with a provider response id reconciled as 'matched' although
 * the library never sees provider billing data, so the term read as a
 * statement match it cannot make; the export carried no
 * machine-readable pricing basis while sum(rows[].usd) missed
 * totalUsd by 2.8x under a tiered table; and no additive column
 * existed for a consumer whose row sums must reconcile with the
 * total. The contract now: the verdict names exactly what it asserts
 * ('provider-id-present'; deeper reconciliation tiers are host-side
 * joins on responseId), every export declares `pricingBasis` and
 * `rowUsdNonAdditive`, and per-row `allocatedUsd` distributes each
 * (entry, model) slice of the same gross fold so its flat sum
 * reproduces `totalUsd` exactly.
 */
import { describe, expect, it } from 'vitest';

import type { JournalEntry, ProviderCallRecord } from '../l0/entries.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import { invoiceFromJournal } from './invoice.js';

const usageOf = (inputTokens: number, outputTokens: number): Usage => ({
  inputTokens,
  outputTokens,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
});

function record(
  ordinal: number,
  usage: Usage,
  overrides: Partial<ProviderCallRecord> = {},
): ProviderCallRecord {
  return {
    ordinal,
    role: 'loop',
    servedBy: 'fake:model',
    attempt: 1,
    outcome: 'ok',
    usage,
    ...overrides,
  };
}

function terminalEntry(seq: number, overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    hashVersion: 2,
    spanId: 's0',
    startedAt: '2026-07-25T00:00:00.000Z',
    seq,
    scope: '',
    key: `agent:${String(seq)}`,
    ordinal: 0,
    kind: 'agent',
    status: 'ok',
    servedBy: 'fake:model',
    ...overrides,
  };
}

/**
 * The tiered registry shape: past 500 input tokens the WHOLE call
 * prices at the long-context rate, so an aggregate prices differently
 * from the sum of its parts.
 */
const tieredPrice = (ref: ModelRef, usage: Usage): number | undefined => {
  if (!ref.startsWith('fake:')) {
    return undefined;
  }
  const long = usage.inputTokens > 500;
  return (usage.inputTokens * (long ? 30 : 10) + usage.outputTokens * (long ? 60 : 30)) / 1e6;
};

const linearPrice = (ref: ModelRef, usage: Usage): number | undefined =>
  ref.startsWith('fake:') ? (usage.inputTokens * 10 + usage.outputTokens * 30) / 1e6 : undefined;

/** The published-1.66.0 repro shape: one retried invocation, three records. */
function retriedEntry(): JournalEntry {
  return terminalEntry(1, {
    usage: usageOf(600, 50),
    providerCalls: [
      record(1, usageOf(100, 0), { outcome: 'error', errorCode: 'agent' }),
      record(2, usageOf(200, 20), { attempt: 2, responseId: 'resp_AAA' }),
      record(3, usageOf(300, 30), { responseId: 'resp_BBB' }),
    ],
  });
}

describe('the honest invoice (P1.2/P1.3/P1.4)', () => {
  it("the verdict asserts exactly the provider id: 'provider-id-present', never 'matched'", () => {
    const invoice = invoiceFromJournal([retriedEntry()], tieredPrice);
    expect(invoice.rows.map((row) => row.reconciliation)).toEqual([
      'unconfirmed',
      'provider-id-present',
      'provider-id-present',
    ]);
    expect(invoice.reconciliationFailures).toBe(1);
    // The overclaiming term is gone from the export entirely.
    expect(JSON.stringify(invoice)).not.toContain('"matched"');
  });

  it('declares its pricing basis and non-additivity on every export, an empty one included', () => {
    const full = invoiceFromJournal([retriedEntry()], tieredPrice);
    expect(full.pricingBasis).toBe('per-call');
    expect(full.rowUsdNonAdditive).toBe(true);

    const empty = invoiceFromJournal([], tieredPrice);
    expect(empty.rows).toEqual([]);
    expect(empty.totalUsd).toBe(0);
    expect(empty.pricingBasis).toBe('per-call');
    expect(empty.rowUsdNonAdditive).toBe(true);
    expect(empty.reconciliationFailures).toBe(0);
  });

  it('under a tiered table row usd stays non-additive while allocatedUsd sums to the total exactly', () => {
    const invoice = invoiceFromJournal([retriedEntry()], tieredPrice);
    // Per-call prices: each row is under the long-context threshold.
    const rowSum = invoice.rows.reduce((acc, row) => acc + (row.usd ?? 0), 0);
    expect(rowSum).toBeCloseTo(0.0075, 12);
    // The aggregate crossed it: the slice fold prices the whole call
    // at the long-context rate.
    expect(invoice.totalUsd).toBe(0.021);
    expect(rowSum).not.toBe(invoice.totalUsd);
    // The additive column closes the gap exactly, not approximately.
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
    // Shares stay proportional to the per-call prices.
    const shares = invoice.rows.map((row) => row.allocatedUsd);
    expect(shares[0]).toBeCloseTo(0.0028, 12);
    expect(shares[1]).toBeCloseTo(0.00728, 12);
    expect(shares[2]).toBeCloseTo(0.01092, 12);
  });

  it('linear pricing keeps allocatedUsd at the per-call price and the sum exact', () => {
    const invoice = invoiceFromJournal([retriedEntry()], linearPrice);
    expect(invoice.totalUsd).toBe(0.0075);
    invoice.rows.forEach((row) => {
      expect(row.allocatedUsd).toBeCloseTo(row.usd ?? 0, 12);
    });
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
  });

  it('rows on unpriced models keep zero allocation while the export still sums to the total', () => {
    const entries = [
      terminalEntry(1, {
        usage: usageOf(200, 20),
        providerCalls: [record(1, usageOf(200, 20), { responseId: 'resp_X' })],
      }),
      terminalEntry(2, {
        servedBy: 'other:model',
        usage: usageOf(100, 10),
        providerCalls: [record(1, usageOf(100, 10), { servedBy: 'other:model' })],
      }),
    ];
    const invoice = invoiceFromJournal(entries, linearPrice);
    expect(invoice.unpriced).toEqual([{ model: 'other:model', usage: usageOf(100, 10) }]);
    const unpricedRow = invoice.rows.find((row) => row.servedBy === 'other:model');
    expect(unpricedRow?.usd).toBeUndefined();
    expect(unpricedRow?.allocatedUsd).toBe(0);
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
  });

  it('falls back to token weights when every row of a slice priced to zero', () => {
    // The table prices only long-context aggregates; each per-call row
    // prices to a legitimate zero.
    const thresholdOnly = (ref: ModelRef, usage: Usage): number | undefined =>
      ref.startsWith('fake:')
        ? usage.inputTokens > 500
          ? (usage.inputTokens * 30) / 1e6
          : 0
        : undefined;
    const entries = [
      terminalEntry(1, {
        usage: usageOf(600, 0),
        providerCalls: [
          record(1, usageOf(200, 0), { responseId: 'resp_A' }),
          record(2, usageOf(400, 0), { responseId: 'resp_B' }),
        ],
      }),
    ];
    const invoice = invoiceFromJournal(entries, thresholdOnly);
    expect(invoice.totalUsd).toBe(0.018);
    const shares = invoice.rows.map((row) => row.allocatedUsd);
    expect(shares[0]).toBeCloseTo(0.006, 12);
    expect(shares[1]).toBeCloseTo(0.012, 12);
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
  });

  it('abandoned rows carry their allocation so the flat sum reproduces the gross total', () => {
    const entries: JournalEntry[] = [
      terminalEntry(1, { status: 'running', servedBy: undefined }),
      terminalEntry(2, {
        ref: 1,
        usage: usageOf(300, 0),
        providerCalls: [record(1, usageOf(300, 0))],
      }),
      {
        hashVersion: 2,
        spanId: 's0',
        startedAt: '2026-07-25T00:00:00.000Z',
        seq: 3,
        ref: 1,
        scope: '',
        key: 'abandon:1',
        ordinal: 0,
        kind: 'abandon',
        status: 'ok',
        abandon: { target: 1, authorizedBy: 1, reason: 'branch abandoned' },
      },
      terminalEntry(4, {
        usage: usageOf(100, 0),
        providerCalls: [record(1, usageOf(100, 0), { responseId: 'resp_K' })],
      }),
    ];
    const invoice = invoiceFromJournal(entries, linearPrice);
    expect(invoice.totalUsd).toBe(0.004);
    expect(invoice.netUsd).toBe(0.001);
    const abandonedRow = invoice.rows.find((row) => row.abandoned === true);
    expect(abandonedRow?.allocatedUsd).toBeCloseTo(0.003, 12);
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
  });

  it("the unattributed remainder participates in its entry's allocation pool", () => {
    const entries = [
      terminalEntry(1, {
        usage: usageOf(600, 0),
        providerCalls: [record(1, usageOf(200, 0), { responseId: 'resp_A' })],
      }),
    ];
    const invoice = invoiceFromJournal(entries, tieredPrice);
    expect(invoice.rows.map((row) => row.reconciliation)).toEqual([
      'provider-id-present',
      'unattributed',
    ]);
    expect(invoice.totalUsd).toBe(0.018);
    const shares = invoice.rows.map((row) => row.allocatedUsd);
    expect(shares[0]).toBeCloseTo(0.006, 12);
    expect(shares[1]).toBeCloseTo(0.012, 12);
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
  });

  it('slice rows of a pre-ledger entry allocate their own slice price', () => {
    const entries = [terminalEntry(1, { usage: usageOf(300, 30) })];
    const invoice = invoiceFromJournal(entries, linearPrice);
    expect(invoice.rows).toHaveLength(1);
    expect(invoice.rows[0]?.reconciliation).toBe('unattributed');
    expect(invoice.rows[0]?.allocatedUsd).toBeCloseTo(invoice.rows[0]?.usd ?? 0, 12);
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
  });
});
