/**
 * The invoice export (P1.3): a pure fold over terminal entries that
 * turns the per-dispatch reconciliation ledger (`providerCalls`) into
 * one row per billable provider call, so a host can line the run up
 * against the provider's invoice. The totals are the SAME slice fold
 * `costReportFromJournal` runs, so `totalUsd` here equals
 * `CostReport.grossUsd` (and `netUsd` equals `CostReport.totalUsd`)
 * exactly, never approximately. The export is self-describing about
 * its pricing: `pricingBasis` says per-row `usd` prices each call
 * individually, `rowUsdNonAdditive` says those values need not sum to
 * `totalUsd` (a nonlinear price table, long-context tiers, prices a
 * split differently from its sum), and per-row `allocatedUsd` is the
 * additive column whose flat sum reproduces `totalUsd` exactly.
 *
 * Coverage is loss-free by construction: an entry whose records do not
 * cover its usage total (a resume restored from a checkpoint written
 * before the ledger shipped) contributes an `unattributed` remainder
 * row, and an entry with no records at all (written before the ledger
 * shipped, or a fully replayed invocation) contributes one
 * `unattributed` row per usage slice. Missing provider ids are marked,
 * never dropped: a finished call without one reconciles as
 * `missing-provider-id`, a failed or severed call without one as
 * `unconfirmed` (the provider may or may not have billed it; there is
 * no id to match).
 *
 * Pricing happens at fold time from the table you pass, exactly like
 * CostReport: the export reflects current rates, not the rates at
 * write time.
 */
import { buildAbandonFold } from '../journal/disposition.js';
import {
  entryUsageSlices,
  priceEntryUsage,
  type JournalEntry,
  type ProviderCallRecord,
} from '../l0/entries.js';
import type { InvocationRole, ModelRef, Usage } from '../l0/messages.js';
import { costReportFromJournal } from './cost-report.js';

/**
 * How far a row's identity goes toward provider-side reconciliation.
 * `provider-id-present` asserts exactly what it names: the adapter
 * surfaced the provider's response id for this call, the join key a
 * host needs to line the row up against a provider statement. It does
 * NOT assert any statement, amount, or usage match: the library never
 * sees provider billing data, so those deeper reconciliation tiers are
 * host-side joins keyed on `responseId`, not verdicts this export can
 * make.
 */
export type InvoiceReconciliation =
  'provider-id-present' | 'missing-provider-id' | 'unconfirmed' | 'unattributed';

/** One billable provider call (or an unattributed usage remainder). */
export interface InvoiceRow {
  /** The terminal journal entry the row folds from. */
  entrySeq: number;
  scope: string;
  key: string;
  /** The call's dispatch ordinal within its invocation; remainder and slice rows continue past it. */
  ordinal: number;
  servedBy: ModelRef;
  role?: InvocationRole;
  /** 1-based try number on the serving target (retries increment it). */
  attempt?: number;
  outcome: ProviderCallRecord['outcome'] | 'unattributed';
  responseId?: string;
  usage: Usage;
  usageApprox?: boolean;
  /** This row priced at its own model's rate; absent when no price row covers it. */
  usd?: number;
  /**
   * The additive FinOps column: this row's share of `totalUsd`, always
   * present (zero for rows on unpriced models). Shares are computed
   * within the row's own (entry, serving model) slice of the same
   * gross fold the totals run, proportional to per-row `usd`, and one
   * row absorbs the IEEE rounding dust, so summing `allocatedUsd` over
   * `rows` reproduces `totalUsd` exactly where summing `usd` does not.
   */
  allocatedUsd: number;
  /** The row lies under an abandoned subtree: in grossUsd, not in netUsd. */
  abandoned?: true;
  reconciliation: InvoiceReconciliation;
}

/** The machine-readable invoice: rows plus the ledger totals. */
export interface InvoiceExport {
  rows: InvoiceRow[];
  /** Every priced terminal slice, abandonment included: equals CostReport.grossUsd. */
  totalUsd: number;
  /** The net ledger (abandoned subtrees contribute zero): equals CostReport.totalUsd. */
  netUsd: number;
  /** The abandoned share: totalUsd - netUsd, equals CostReport.abandoned.usd. */
  abandonedUsd: number;
  /**
   * How per-row `usd` was computed: each call priced individually at
   * the current table's rates. Always `'per-call'` today; declared so
   * finance tooling never has to guess the basis.
   */
  pricingBasis: 'per-call';
  /**
   * Always true: per-call `usd` values need not sum to `totalUsd`,
   * because a nonlinear price table prices an aggregate differently
   * from the sum of its parts. Sum `allocatedUsd` instead; it exists
   * precisely so a column sums to the total.
   */
  rowUsdNonAdditive: true;
  /** Usage on models absent from pricing, net and abandoned alike; never a silent zero. */
  unpriced: Array<{ model: string; usage: Usage }>;
  /** Rows whose reconciliation is not 'provider-id-present'. */
  reconciliationFailures: number;
  /** Present and true when any contributing entry carried approximate usage. */
  usageApprox?: boolean;
}

const USAGE_FIELDS = [
  'inputTokens',
  'outputTokens',
  'cacheReadTokens',
  'cacheWriteTokens',
] as const;

/** entry.usage minus the records' sum, clamped at zero per field. */
function usageRemainder(total: Usage, records: readonly ProviderCallRecord[]): Usage | undefined {
  const remainder: Usage = {
    inputTokens: total.inputTokens,
    outputTokens: total.outputTokens,
    cacheReadTokens: total.cacheReadTokens,
    cacheWriteTokens: total.cacheWriteTokens,
  };
  let reasoning = total.reasoningTokens ?? 0;
  for (const record of records) {
    for (const field of USAGE_FIELDS) {
      remainder[field] = Math.max(0, remainder[field] - record.usage[field]);
    }
    reasoning = Math.max(0, reasoning - (record.usage.reasoningTokens ?? 0));
  }
  if (reasoning > 0) {
    remainder.reasoningTokens = reasoning;
  }
  const any =
    USAGE_FIELDS.some((field) => remainder[field] > 0) || (remainder.reasoningTokens ?? 0) > 0;
  return any ? remainder : undefined;
}

/** One allocation pool per (entry, serving model) slice of the gross fold. */
function allocationKey(entrySeq: number, servedBy: ModelRef): string {
  return `${String(entrySeq)} ${servedBy}`;
}

/** The token-count fallback weight when every row of a pool priced to zero. */
function totalTokens(usage: Usage): number {
  return (
    usage.inputTokens +
    usage.outputTokens +
    usage.cacheReadTokens +
    usage.cacheWriteTokens +
    (usage.reasoningTokens ?? 0)
  );
}

/**
 * The additive allocation pass: distributes each (entry, model) slice
 * total of the SAME gross fold the invoice totals run across that
 * slice's rows, proportional to per-row `usd` (token counts when every
 * row priced to zero, equal shares when even those are zero), then
 * lets the largest row absorb the IEEE rounding dust of the fold's own
 * association so the flat sum over `rows` reproduces `totalUsd`
 * exactly. Rows on unpriced models keep zero: their spend is in
 * `unpriced`, not in `totalUsd`.
 */
function allocateRows(
  rows: InvoiceRow[],
  entries: readonly JournalEntry[],
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined,
  totalUsd: number,
): void {
  if (rows.length === 0) {
    return;
  }
  const targets = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status === 'running' || entry.usage === undefined) {
      continue;
    }
    for (const slice of priceEntryUsage(entry, priceUsd).priced) {
      const key = allocationKey(entry.seq, slice.servedBy);
      targets.set(key, (targets.get(key) ?? 0) + slice.usd);
    }
  }
  const pools = new Map<string, InvoiceRow[]>();
  for (const row of rows) {
    const key = allocationKey(row.entrySeq, row.servedBy);
    const pool = pools.get(key);
    if (pool === undefined) {
      pools.set(key, [row]);
    } else {
      pool.push(row);
    }
  }
  for (const [key, members] of pools) {
    const target = targets.get(key) ?? 0;
    if (target === 0) {
      continue;
    }
    let weights = members.map((row) => row.usd ?? 0);
    let sum = weights.reduce((acc, weight) => acc + weight, 0);
    if (sum === 0) {
      weights = members.map((row) => totalTokens(row.usage));
      sum = weights.reduce((acc, weight) => acc + weight, 0);
    }
    members.forEach((row, index) => {
      const weight = weights[index] ?? 0;
      row.allocatedUsd = sum === 0 ? target / members.length : target * (weight / sum);
    });
  }
  let absorber: InvoiceRow | undefined;
  for (const row of rows) {
    if (absorber === undefined || row.allocatedUsd > absorber.allocatedUsd) {
      absorber = row;
    }
  }
  if (absorber === undefined) {
    return;
  }
  // Fixed-point dust pass: each correction shrinks the flat-sum gap to
  // rounding of the last addition, so this settles in a pass or two;
  // the bound only guards a pathological tie.
  for (let pass = 0; pass < 8; pass += 1) {
    const flat = rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    if (flat === totalUsd) {
      break;
    }
    absorber.allocatedUsd += totalUsd - flat;
  }
}

/** A single row priced at its own model's rate; broken rates fold as unpriced. */
function rowUsd(
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined,
  servedBy: ModelRef,
  usage: Usage,
): number | undefined {
  const usd = priceUsd(servedBy, usage);
  return usd !== undefined && Number.isFinite(usd) && usd >= 0 ? usd : undefined;
}

/**
 * The pure invoice fold. Pass the same entries and price table you
 * would pass `costReportFromJournal`; the totals are that report's
 * gross/net split verbatim.
 */
export function invoiceFromJournal(
  entries: readonly JournalEntry[],
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined,
): InvoiceExport {
  const report = costReportFromJournal(entries, priceUsd);
  const abandonFold = buildAbandonFold(entries);
  const rows: InvoiceRow[] = [];
  for (const entry of entries) {
    if (entry.status === 'running' || entry.usage === undefined) {
      continue;
    }
    const abandoned =
      entry.kind !== 'resolution' &&
      entry.kind !== 'abandon' &&
      abandonFold.isAbandoned(entry.ref ?? entry.seq);
    const base = { entrySeq: entry.seq, scope: entry.scope, key: entry.key };
    const mark = abandoned ? ({ abandoned: true } as const) : {};
    const records = entry.providerCalls ?? [];
    for (const record of records) {
      const usd = rowUsd(priceUsd, record.servedBy, record.usage);
      rows.push({
        ...base,
        ordinal: record.ordinal,
        servedBy: record.servedBy,
        role: record.role,
        attempt: record.attempt,
        outcome: record.outcome,
        ...(record.responseId === undefined ? {} : { responseId: record.responseId }),
        usage: record.usage,
        ...(record.usageApprox === true ? { usageApprox: true } : {}),
        ...(usd === undefined ? {} : { usd }),
        allocatedUsd: 0,
        ...mark,
        reconciliation:
          record.responseId !== undefined
            ? 'provider-id-present'
            : record.outcome === 'ok'
              ? 'missing-provider-id'
              : 'unconfirmed',
      });
    }
    if (records.length === 0) {
      // No ledger on the entry (pre-ledger runs, fully replayed
      // invocations): one unattributed row per usage slice keeps the
      // spend visible and the totals loss-free.
      entryUsageSlices(entry).forEach((slice, index) => {
        const usd = rowUsd(priceUsd, slice.servedBy, slice.usage);
        rows.push({
          ...base,
          ordinal: index + 1,
          servedBy: slice.servedBy,
          ...(slice.role === undefined ? {} : { role: slice.role }),
          outcome: 'unattributed',
          usage: slice.usage,
          ...(entry.usageApprox === true ? { usageApprox: true } : {}),
          ...(usd === undefined ? {} : { usd }),
          allocatedUsd: 0,
          ...mark,
          reconciliation: 'unattributed',
        });
      });
      continue;
    }
    const remainder = usageRemainder(entry.usage, records);
    if (remainder !== undefined && entry.servedBy !== undefined) {
      // The records do not cover the entry's total (a resume restored
      // a pre-ledger checkpoint): the difference is real billed usage,
      // surfaced as an unattributed remainder instead of vanishing.
      const usd = rowUsd(priceUsd, entry.servedBy, remainder);
      rows.push({
        ...base,
        ordinal: records.length + 1,
        servedBy: entry.servedBy,
        outcome: 'unattributed',
        usage: remainder,
        ...(entry.usageApprox === true ? { usageApprox: true } : {}),
        ...(usd === undefined ? {} : { usd }),
        allocatedUsd: 0,
        ...mark,
        reconciliation: 'unattributed',
      });
    }
  }
  allocateRows(rows, entries, priceUsd, report.grossUsd);
  const usageApprox = report.usageApprox === true || report.abandoned.usageApprox === true;
  return {
    rows,
    totalUsd: report.grossUsd,
    netUsd: report.totalUsd,
    abandonedUsd: report.abandoned.usd,
    pricingBasis: 'per-call',
    rowUsdNonAdditive: true,
    unpriced: [...report.unpriced, ...report.abandoned.unpriced],
    reconciliationFailures: rows.filter((row) => row.reconciliation !== 'provider-id-present')
      .length,
    ...(usageApprox ? { usageApprox: true } : {}),
  };
}
