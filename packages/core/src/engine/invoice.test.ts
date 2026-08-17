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

  it('declares its pricing basis and additivity on every export, an empty one included', () => {
    // retriedEntry's records exactly cover its usage: the per-call
    // basis is literal, rows sum to the total (RV504).
    const full = invoiceFromJournal([retriedEntry()], tieredPrice);
    expect(full.pricingBasis).toBe('per-call');
    expect(full.rowUsdNonAdditive).toBe(false);

    const empty = invoiceFromJournal([], tieredPrice);
    expect(empty.rows).toEqual([]);
    expect(empty.totalUsd).toBe(0);
    expect(empty.pricingBasis).toBe('per-call');
    expect(empty.rowUsdNonAdditive).toBe(false);
    expect(empty.reconciliationFailures).toBe(0);
  });

  it('under a tiered table a fully attributed entry prices per call: the tier fires per request (RV504)', () => {
    const invoice = invoiceFromJournal([retriedEntry()], tieredPrice);
    // Each provider call is under the long-context threshold, so no
    // request was billed at the long-context rate. The pre-RV504 fold
    // tiered the 600-token aggregate and reported 0.021: 2.8x the sum
    // of what the calls cost (the ninth-experiment 52% overreport).
    const rowSum = invoice.rows.reduce((acc, row) => acc + (row.usd ?? 0), 0);
    expect(rowSum).toBeCloseTo(0.0075, 12);
    expect(invoice.totalUsd).toBeCloseTo(0.0075, 12);
    expect(invoice.rowUsdNonAdditive).toBe(false);
    // The additive column agrees with the per-call prices and still
    // sums to the total exactly.
    invoice.rows.forEach((row) => {
      expect(row.allocatedUsd).toBeCloseTo(row.usd ?? 0, 12);
    });
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
  });

  it('a partially attributed entry keeps the aggregate basis and says so (RV504)', () => {
    // Records cover only half the usage: the per-call basis would lie,
    // so the entry folds exactly as before RV504 and the export keeps
    // rowUsdNonAdditive true with the unattributed remainder row.
    const partial = terminalEntry(1, {
      usage: usageOf(600, 50),
      providerCalls: [record(1, usageOf(300, 30), { responseId: 'resp_P' })],
    });
    const invoice = invoiceFromJournal([partial], tieredPrice);
    expect(invoice.totalUsd).toBe(0.021);
    expect(invoice.rowUsdNonAdditive).toBe(true);
    const remainder = invoice.rows.find((row) => row.reconciliation === 'unattributed');
    expect(remainder?.usage).toEqual({ ...usageOf(300, 20), reasoningTokens: 0 });
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
  });

  it('linear pricing keeps allocatedUsd at the per-call price and the sum exact', () => {
    const invoice = invoiceFromJournal([retriedEntry()], linearPrice);
    expect(invoice.totalUsd).toBeCloseTo(0.0075, 12);
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

  it('falls back to token weights when every row of an aggregate-basis slice priced to zero', () => {
    // The table prices only long-context aggregates; each per-call row
    // prices to a legitimate zero. The records cover only part of the
    // usage, so the entry keeps the aggregate basis (RV504) and the
    // allocation pool distributes the aggregate by token weights.
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
          record(2, usageOf(300, 0), { responseId: 'resp_B' }),
        ],
      }),
    ];
    const invoice = invoiceFromJournal(entries, thresholdOnly);
    expect(invoice.totalUsd).toBe(0.018);
    expect(invoice.rowUsdNonAdditive).toBe(true);
    // Rows: two calls plus the 100-token unattributed remainder, all
    // zero-priced, weighted 200/300/100.
    const shares = invoice.rows.map((row) => row.allocatedUsd);
    expect(shares[0]).toBeCloseTo(0.006, 12);
    expect(shares[1]).toBeCloseTo(0.009, 12);
    expect(shares[2]).toBeCloseTo(0.003, 12);
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

describe('the per-slice residual (RV605, the round-52 accounting P1)', () => {
  it("an orphaned model's remainder lands on its OWN row, never on another model's", () => {
    // The audit construction: records exist only for model A while the
    // usage split carries a 2000-token slice on model B. The pre-RV605
    // fold computed one whole-entry remainder, published it under
    // entry.servedBy (A), and left the (entry, B) allocation pool with
    // a target and zero rows; the dust pass then dumped B's whole USD
    // onto the largest A row so the column would sum: 0.02067 on a row
    // whose own price is 0.002.
    const entries = [
      terminalEntry(1, {
        usage: usageOf(2300, 0),
        usageByModel: [
          { servedBy: 'fake:model', role: 'loop', usage: usageOf(300, 0) },
          { servedBy: 'exec:model', role: 'extract', usage: usageOf(2000, 0) },
        ],
        providerCalls: [
          record(1, usageOf(100, 0), { responseId: 'resp_A1' }),
          record(2, usageOf(200, 0), { responseId: 'resp_A2' }),
        ],
      }),
    ];
    const flat = (ref: ModelRef, usage: Usage): number | undefined =>
      ref.startsWith('fake:') || ref.startsWith('exec:')
        ? (usage.inputTokens * 10 + usage.outputTokens * 30) / 1e6
        : undefined;
    const invoice = invoiceFromJournal(entries, flat);
    // Model B's spend is a row of model B, role and model intact.
    const orphan = invoice.rows.find((row) => row.servedBy === 'exec:model');
    expect(orphan).toBeDefined();
    expect(orphan?.reconciliation).toBe('unattributed');
    expect(orphan?.role).toBe('extract');
    expect(orphan?.usage).toEqual({ ...usageOf(2000, 0), reasoningTokens: 0 });
    expect(orphan?.allocatedUsd).toBeCloseTo(0.02, 12);
    // No A row carries more than A's own dollars.
    for (const row of invoice.rows.filter((candidate) => candidate.servedBy === 'fake:model')) {
      expect(row.allocatedUsd).toBeLessThanOrEqual(0.003 + 1e-12);
    }
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
  });

  it('per-role slices on one model subtract only their own records', () => {
    // Loop records cover the loop slice exactly; the extract slice has
    // no records (its dispatch predates the ledger). The remainder is
    // exactly the extract slice, under its own role, not the whole
    // usage minus every record.
    const entries = [
      terminalEntry(1, {
        usage: usageOf(700, 0),
        usageByModel: [
          { servedBy: 'fake:model', role: 'loop', usage: usageOf(600, 0) },
          { servedBy: 'fake:model', role: 'extract', usage: usageOf(100, 0) },
        ],
        providerCalls: [
          record(1, usageOf(300, 0), { responseId: 'resp_L1' }),
          record(2, usageOf(300, 0), { responseId: 'resp_L2' }),
        ],
      }),
    ];
    const invoice = invoiceFromJournal(entries, linearPrice);
    const remainders = invoice.rows.filter((row) => row.reconciliation === 'unattributed');
    expect(remainders).toHaveLength(1);
    expect(remainders[0]?.role).toBe('extract');
    expect(remainders[0]?.usage).toEqual({ ...usageOf(100, 0), reasoningTokens: 0 });
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
  });

  it('a legacy single-model entry keeps its remainder row byte for byte', () => {
    const entries = [
      terminalEntry(1, {
        usage: usageOf(600, 50),
        providerCalls: [record(1, usageOf(300, 30), { responseId: 'resp_P' })],
      }),
    ];
    const invoice = invoiceFromJournal(entries, linearPrice);
    const remainder = invoice.rows.find((row) => row.reconciliation === 'unattributed');
    expect(remainder?.servedBy).toBe('fake:model');
    expect(remainder?.usage).toEqual({ ...usageOf(300, 20), reasoningTokens: 0 });
    expect(remainder?.ordinal).toBe(2);
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
  });

  it('a pool with a target and no rows refuses the transfer and reports it explicitly', () => {
    // A pathological price function prices model B's zero-usage slice
    // at a flat fee, so the (entry, B) pool has a target no row can
    // carry. The dust pass must refuse to move those dollars onto
    // another model's rows; the export names the unallocated share.
    const entries = [
      terminalEntry(1, {
        usage: usageOf(300, 0),
        usageByModel: [
          { servedBy: 'fake:model', role: 'loop', usage: usageOf(300, 0) },
          { servedBy: 'exec:model', role: 'extract', usage: usageOf(0, 0) },
        ],
        providerCalls: [record(1, usageOf(300, 0), { responseId: 'resp_A' })],
      }),
    ];
    const flatFee = (ref: ModelRef, usage: Usage): number | undefined =>
      ref.startsWith('exec:') ? 5 : (usage.inputTokens * 10 + usage.outputTokens * 30) / 1e6;
    const invoice = invoiceFromJournal(entries, flatFee);
    expect(invoice.unallocatedUsd).toBeCloseTo(5, 12);
    // The A rows keep A's dollars; the flat sum plus the declared
    // unallocated share reproduces the total.
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBeCloseTo(invoice.totalUsd - 5, 12);
    for (const row of invoice.rows) {
      expect(row.allocatedUsd).toBeLessThanOrEqual(0.003 + 1e-12);
    }
  });
});

describe("a covered model's rows are exactly its calls (RV703, the eleventh-experiment allocation skew)", () => {
  it('a role mismatch between records and slices breeds no phantom remainder', () => {
    // The eleventh-experiment strengthening of the dossier's RV605
    // review: coverage is decided per MODEL (RV604), but the remainder
    // pass subtracted records per model AND role, so a covered model
    // whose record roles differ from its slice roles grew a phantom
    // row. Repro: the schema-extract default splits one model's usage
    // into loop 600 and extract 100 while the single record carries
    // role loop with the model's full 700. Before the fix the export
    // carried 800 tokens across two rows, sum(usd) 0.008 against
    // totalUsd 0.007 under rowUsdNonAdditive false (the promise
    // broken), and allocation siphoned 0.000875 from the real call
    // onto the phantom.
    const entries = [
      terminalEntry(1, {
        usage: usageOf(700, 0),
        usageByModel: [
          { servedBy: 'fake:model', role: 'loop', usage: usageOf(600, 0) },
          { servedBy: 'fake:model', role: 'extract', usage: usageOf(100, 0) },
        ],
        providerCalls: [record(1, usageOf(700, 0), { responseId: 'resp_L' })],
      }),
    ];
    const invoice = invoiceFromJournal(entries, linearPrice);
    expect(invoice.rows).toHaveLength(1);
    expect(invoice.rows.filter((row) => row.reconciliation === 'unattributed')).toHaveLength(0);
    const tokens = invoice.rows.reduce((acc, row) => acc + row.usage.inputTokens, 0);
    expect(tokens).toBe(700);
    const usdSum = invoice.rows.reduce((acc, row) => acc + (row.usd ?? 0), 0);
    expect(usdSum).toBeCloseTo(invoice.totalUsd, 12);
    expect(invoice.totalUsd).toBeCloseTo(0.007, 12);
    expect(invoice.rowUsdNonAdditive).toBe(false);
    // The real call keeps its whole allocation; nothing siphons off.
    expect(invoice.rows[0]?.allocatedUsd).toBe(invoice.totalUsd);
  });

  it('a legacy record without a role covers its model the same way', () => {
    // Journals written before records carried roles parse to records
    // with no role field; the model totals still match, so the model
    // is covered and its single record row carries all the spend.
    const legacyRecord = {
      ordinal: 1,
      servedBy: 'fake:model',
      attempt: 1,
      outcome: 'ok',
      usage: usageOf(700, 0),
      responseId: 'resp_L',
    } as unknown as ProviderCallRecord;
    const entries = [
      terminalEntry(1, {
        usage: usageOf(700, 0),
        usageByModel: [
          { servedBy: 'fake:model', role: 'loop', usage: usageOf(600, 0) },
          { servedBy: 'fake:model', role: 'extract', usage: usageOf(100, 0) },
        ],
        providerCalls: [legacyRecord],
      }),
    ];
    const invoice = invoiceFromJournal(entries, linearPrice);
    expect(invoice.rows).toHaveLength(1);
    const usdSum = invoice.rows.reduce((acc, row) => acc + (row.usd ?? 0), 0);
    expect(usdSum).toBeCloseTo(invoice.totalUsd, 12);
    expect(invoice.rowUsdNonAdditive).toBe(false);
  });

  it('the rule is per model: a covered model sheds its phantom while an uncovered one keeps its remainder', () => {
    // fake:model is covered with a role mismatch (record loop 600
    // against slices loop 400 plus extract 200); exec:model's record
    // covers only a quarter of its slice. The covered model's rows are
    // exactly its records; the uncovered model keeps the historical
    // per-slice remainder, and the export honestly stays non-additive.
    const entries = [
      terminalEntry(1, {
        usage: usageOf(2600, 0),
        usageByModel: [
          { servedBy: 'fake:model', role: 'loop', usage: usageOf(400, 0) },
          { servedBy: 'fake:model', role: 'extract', usage: usageOf(200, 0) },
          { servedBy: 'exec:model', role: 'extract', usage: usageOf(2000, 0) },
        ],
        providerCalls: [
          record(1, usageOf(600, 0), { responseId: 'resp_F' }),
          record(2, usageOf(500, 0), {
            servedBy: 'exec:model',
            role: 'extract',
            responseId: 'resp_E',
          }),
        ],
      }),
    ];
    const flat = (ref: ModelRef, usage: Usage): number | undefined =>
      ref.startsWith('fake:') || ref.startsWith('exec:')
        ? (usage.inputTokens * 10 + usage.outputTokens * 30) / 1e6
        : undefined;
    const invoice = invoiceFromJournal(entries, flat);
    const fakeRows = invoice.rows.filter((row) => row.servedBy === 'fake:model');
    expect(fakeRows).toHaveLength(1);
    expect(fakeRows[0]?.reconciliation).toBe('provider-id-present');
    const execRemainders = invoice.rows.filter(
      (row) => row.servedBy === 'exec:model' && row.reconciliation === 'unattributed',
    );
    expect(execRemainders).toHaveLength(1);
    expect(execRemainders[0]?.usage).toEqual({ ...usageOf(1500, 0), reasoningTokens: 0 });
    expect(invoice.rowUsdNonAdditive).toBe(true);
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
  });

  it('an uncovered model keeps its per-slice remainders byte for byte', () => {
    // The same split with a record that does NOT cover the model total
    // folds exactly as before RV703: one remainder per slice, the
    // aggregate basis declared.
    const entries = [
      terminalEntry(1, {
        usage: usageOf(700, 0),
        usageByModel: [
          { servedBy: 'fake:model', role: 'loop', usage: usageOf(600, 0) },
          { servedBy: 'fake:model', role: 'extract', usage: usageOf(100, 0) },
        ],
        providerCalls: [record(1, usageOf(500, 0), { responseId: 'resp_L' })],
      }),
    ];
    const invoice = invoiceFromJournal(entries, linearPrice);
    const remainders = invoice.rows.filter((row) => row.reconciliation === 'unattributed');
    expect(remainders.map((row) => [row.role, row.usage.inputTokens])).toEqual([
      ['loop', 100],
      ['extract', 100],
    ]);
    expect(invoice.rowUsdNonAdditive).toBe(true);
    const allocated = invoice.rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    expect(allocated).toBe(invoice.totalUsd);
  });
});

describe('usageUnknown on unconfirmed zero rows (the v1.71 experiment review, P1.4)', () => {
  it('marks only the unconfirmed rows that recorded nothing, and counts them', () => {
    const entry = terminalEntry(9, {
      usage: usageOf(30, 8),
      providerCalls: [
        record(1, usageOf(0, 0), { outcome: 'error', errorCode: 'agent' }),
        record(2, usageOf(10, 0), { outcome: 'error', errorCode: 'agent', attempt: 2 }),
        record(3, usageOf(20, 8), { attempt: 3, responseId: 'resp-1' }),
      ],
    });
    const invoice = invoiceFromJournal([entry], tieredPrice);
    expect(invoice.rows.map((row) => row.reconciliation)).toEqual([
      'unconfirmed',
      'unconfirmed',
      'provider-id-present',
    ]);
    // The zero row means "nothing recorded"; the partial-usage failure
    // and the confirmed call never carry the marker.
    expect(invoice.rows.map((row) => row.usageUnknown === true)).toEqual([true, false, false]);
    expect(invoice.usageUnknownRows).toBe(1);
  });

  it('recorded reasoning tokens alone disqualify the marker, and the field stays absent otherwise', () => {
    const entry = terminalEntry(11, {
      usage: usageOf(0, 0),
      providerCalls: [
        record(
          1,
          { ...usageOf(0, 0), reasoningTokens: 5 },
          { outcome: 'error', errorCode: 'agent' },
        ),
      ],
    });
    const invoice = invoiceFromJournal([entry], tieredPrice);
    expect(invoice.rows[0]?.usageUnknown).toBeUndefined();
    expect(invoice.usageUnknownRows).toBeUndefined();
    expect(invoiceFromJournal([retriedEntry()], tieredPrice).usageUnknownRows).toBeUndefined();
  });
});

describe('non-finite accounting is refused typed (RV610)', () => {
  it('an invoice never carries non-finite numbers: overflow throws typed', () => {
    // Two individually finite prices whose sum overflows: pre-fix the
    // export carried totalUsd Infinity and allocatedUsd NaN, which JSON
    // serializes as null, corrupting machine telemetry silently.
    const entries = [
      terminalEntry(1, { usage: usageOf(100, 0) }),
      terminalEntry(2, { usage: usageOf(200, 0) }),
    ];
    expect(() => invoiceFromJournal(entries, () => Number.MAX_VALUE)).toThrow(/finite/);
    // A single huge but finite total stays representable and allowed.
    expect(() => invoiceFromJournal([entries[0]], () => Number.MAX_VALUE)).not.toThrow();
  });
});

describe('the uniform row usage envelope (RV3311)', () => {
  it('every row carries reasoningTokens, detached from the journal object', () => {
    // The 2026-08-12 comparison run's invoice had 77 rows with the
    // field and one (the judge verdict extraction) without: a FinOps
    // consumer folding the column had to know that absence meant zero
    // on exactly one row shape.
    const entry = terminalEntry(1, {
      usage: usageOf(300, 30),
      providerCalls: [
        record(1, { ...usageOf(100, 10), reasoningTokens: 7 }, { responseId: 'resp_R' }),
        record(2, usageOf(200, 20), { responseId: 'resp_NO_REASONING' }),
      ],
    });
    const invoice = invoiceFromJournal([entry], linearPrice);
    expect(invoice.rows).toHaveLength(2);
    for (const row of invoice.rows) {
      expect(row.usage.reasoningTokens).toBeDefined();
    }
    expect(invoice.rows[0]?.usage.reasoningTokens).toBe(7);
    expect(invoice.rows[1]?.usage.reasoningTokens).toBe(0);
    // Detached: annotating the export never reaches the journal entry.
    const journalUsage = (entry.providerCalls ?? [])[1]?.usage;
    const exported = invoice.rows[1]?.usage;
    if (exported !== undefined) {
      exported.inputTokens = 999_999;
    }
    expect(journalUsage?.inputTokens).toBe(200);
  });
});

describe('the orphaned receipt lane (RV3405)', () => {
  // A wire paid between the last checkpoint and a crash journals its
  // receipt (RV2008) but never reaches the checkpoint, so the resumed
  // terminal's record set forgets it, and the old fold silently
  // dropped the payment the moment a terminal existed.
  const pcRow = (seq: number, agentRef: number, rec: ProviderCallRecord): JournalEntry =>
    ({
      hashVersion: 2,
      spanId: 's0',
      startedAt: '2026-07-25T00:00:00.000Z',
      seq,
      scope: 'agent:root',
      key: `pc:${String(agentRef)}:${String(rec.ordinal)}`,
      ordinal: 0,
      kind: 'decision',
      status: 'ok',
      value: {
        decisionType: 'provider-call',
        agentRef,
        record: rec as unknown,
      },
    }) as unknown as JournalEntry;

  it('reports receipts the settled terminal does not cover, apart from the settled totals', () => {
    const entries: JournalEntry[] = [
      terminalEntry(1, { status: 'running', servedBy: undefined, scope: 'agent:root' }),
      pcRow(2, 1, record(1, usageOf(100, 50), { responseId: 'resp-A' })),
      pcRow(3, 1, record(2, usageOf(200, 20), { responseId: 'resp-B' })),
      terminalEntry(4, {
        ref: 1,
        scope: 'agent:root',
        usage: usageOf(100, 50),
        providerCalls: [record(1, usageOf(100, 50), { responseId: 'resp-A' })],
      }),
    ];
    const invoice = invoiceFromJournal(entries, linearPrice);
    expect(invoice.unsettled).toBeUndefined();
    expect(invoice.orphanedReceipts).toBeDefined();
    expect(invoice.orphanedReceipts?.wireRequests).toBe(1);
    const orphan = invoice.orphanedReceipts?.rows[0];
    expect(orphan?.responseId).toBe('resp-B');
    expect(orphan?.ordinal).toBe(2);
    expect(orphan?.scope).toBe('agent:root');
    expect(invoice.orphanedReceipts?.usd).toBeCloseTo(
      linearPrice('fake:model', usageOf(200, 20)) ?? 0,
      12,
    );
    // The settled totals never absorb the orphan: run_settle stays the
    // billing boundary.
    expect(invoice.rows.every((row) => row.responseId !== 'resp-B')).toBe(true);
  });

  it('a terminal that covers every receipt reports no lane at all', () => {
    const entries: JournalEntry[] = [
      terminalEntry(1, { status: 'running', servedBy: undefined, scope: 'agent:root' }),
      pcRow(2, 1, record(1, usageOf(100, 50), { responseId: 'resp-A' })),
      terminalEntry(3, {
        ref: 1,
        scope: 'agent:root',
        usage: usageOf(100, 50),
        providerCalls: [record(1, usageOf(100, 50), { responseId: 'resp-A' })],
      }),
    ];
    const invoice = invoiceFromJournal(entries, linearPrice);
    expect(invoice.orphanedReceipts).toBeUndefined();
    expect(invoice.unsettled).toBeUndefined();
  });

  it('response id decides when either side carries one; the id-less rest matches by coordinate and byte equal usage', () => {
    const entries: JournalEntry[] = [
      terminalEntry(1, { status: 'running', servedBy: undefined, scope: 'agent:root' }),
      // The redispatch after a resume REUSES the ordinal: a coordinate
      // match across different id evidence is the replacement wire,
      // never the orphan, so this receipt stays orphaned.
      pcRow(2, 1, record(1, usageOf(100, 50))),
      // An id-less receipt whose coordinate and usage match is covered.
      pcRow(3, 1, record(2, usageOf(300, 30))),
      // An id-less receipt whose usage disagrees is not.
      pcRow(4, 1, record(3, usageOf(400, 40))),
      terminalEntry(5, {
        ref: 1,
        scope: 'agent:root',
        usage: usageOf(800, 120),
        providerCalls: [
          record(1, usageOf(100, 50), { responseId: 'resp-REDISPATCH' }),
          record(2, usageOf(300, 30)),
          record(3, usageOf(400, 99)),
        ],
      }),
    ];
    const invoice = invoiceFromJournal(entries, linearPrice);
    expect(invoice.orphanedReceipts?.wireRequests).toBe(2);
    expect(invoice.orphanedReceipts?.rows.map((row) => row.ordinal)).toEqual([1, 3]);
  });
});

describe('the attributed rows (RV3906, the fourth comparison experiment)', () => {
  it('rows carry agentType and label from the terminal cost attribution, every row kind', () => {
    const entries = [
      terminalEntry(1, {
        usage: usageOf(300, 30),
        costAttribution: {
          agentType: 'worker',
          role: 'loop',
          budgetAccount: 'run',
          label: 'read-span',
        },
        providerCalls: [record(1, usageOf(300, 30), { responseId: 'resp_A' })],
      }),
      // No ledger: the unattributed slice row inherits the entry facts.
      terminalEntry(2, {
        usage: usageOf(100, 10),
        costAttribution: { agentType: 'judge', role: 'synthesize', budgetAccount: 'orchestrator' },
      }),
      // Pre-attribution entry: both fields absent, the old bytes exactly.
      terminalEntry(3, {
        usage: usageOf(50, 5),
        providerCalls: [record(1, usageOf(50, 5), { responseId: 'resp_C' })],
      }),
      // The root's empty agentType folds as absent, not as a name.
      terminalEntry(4, {
        usage: usageOf(10, 1),
        costAttribution: { agentType: '', role: 'orchestrate', budgetAccount: 'run' },
        providerCalls: [record(1, usageOf(10, 1), { responseId: 'resp_D' })],
      }),
    ];
    const invoice = invoiceFromJournal(entries, linearPrice);
    const bySeq = (seq: number) => invoice.rows.filter((row) => row.entrySeq === seq);
    expect(bySeq(1)[0]?.agentType).toBe('worker');
    expect(bySeq(1)[0]?.label).toBe('read-span');
    expect(bySeq(2)[0]?.agentType).toBe('judge');
    expect(bySeq(2)[0]?.outcome).toBe('unattributed');
    expect('agentType' in (bySeq(3)[0] ?? {})).toBe(false);
    expect('label' in (bySeq(3)[0] ?? {})).toBe(false);
    expect('agentType' in (bySeq(4)[0] ?? {})).toBe(false);
  });

  it('the remainder row of a partially covered entry carries the same attribution', () => {
    const entry = terminalEntry(9, {
      usage: usageOf(600, 50),
      costAttribution: { agentType: 'worker', role: 'loop', budgetAccount: 'run' },
      providerCalls: [record(1, usageOf(200, 20), { responseId: 'resp_R' })],
    });
    const invoice = invoiceFromJournal([entry], linearPrice);
    const rows = invoice.rows.filter((row) => row.entrySeq === 9);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.every((row) => row.agentType === 'worker')).toBe(true);
    // The per-child money question the fourth comparison run could
    // only answer through a journal join now folds off the rows alone.
    const workerUsd = rows.reduce((sum, row) => sum + (row.usd ?? 0), 0);
    expect(workerUsd).toBeGreaterThan(0);
  });
});
