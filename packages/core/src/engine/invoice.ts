/**
 * The invoice export (P1.3): a pure fold over terminal entries that
 * turns the per-dispatch reconciliation ledger (`providerCalls`) into
 * one row per billable provider call, so a host can line the run up
 * against the provider's invoice. The totals are the SAME slice fold
 * `costReportFromJournal` runs, so `totalUsd` here equals
 * `CostReport.grossUsd` (and `netUsd` equals `CostReport.totalUsd`)
 * exactly, never approximately; per-row `usd` prices each call
 * individually and is informational, since a nonlinear price table
 * (long-context tiers) prices a split differently from its sum.
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
import { entryUsageSlices, type JournalEntry, type ProviderCallRecord } from '../l0/entries.js';
import type { InvocationRole, ModelRef, Usage } from '../l0/messages.js';
import { costReportFromJournal } from './cost-report.js';

/** How a row lines up against a provider invoice. */
export type InvoiceReconciliation =
  'matched' | 'missing-provider-id' | 'unconfirmed' | 'unattributed';

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
  /** Usage on models absent from pricing, net and abandoned alike; never a silent zero. */
  unpriced: Array<{ model: string; usage: Usage }>;
  /** Rows whose reconciliation is not 'matched'. */
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
        ...mark,
        reconciliation:
          record.responseId !== undefined
            ? 'matched'
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
        ...mark,
        reconciliation: 'unattributed',
      });
    }
  }
  const usageApprox = report.usageApprox === true || report.abandoned.usageApprox === true;
  return {
    rows,
    totalUsd: report.grossUsd,
    netUsd: report.totalUsd,
    abandonedUsd: report.abandoned.usd,
    unpriced: [...report.unpriced, ...report.abandoned.unpriced],
    reconciliationFailures: rows.filter((row) => row.reconciliation !== 'matched').length,
    ...(usageApprox ? { usageApprox: true } : {}),
  };
}
