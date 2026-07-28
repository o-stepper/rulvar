/**
 * The applied-pricing snapshot (RV407, the eighth-experiment review).
 * `invoiceFromJournal` and `costReportFromJournal` price at fold time
 * from the table the caller passes, so a live price-table update used
 * to silently re-price HISTORY: the same journal folded to different
 * invoices before and after the change. When `createEngine({ pricing })`
 * is configured, the settling segment now pins what it actually
 * applied: the resolved pricing row of every model the journal used
 * (table rows plus the caps-fallback rows of models the table misses),
 * and the table's version, additively inside the existing run-settle
 * decision value (the `outputHash` precedent; no journal shape change).
 * The gate is deliberate: caps-fallback pricing arrives ambiently from
 * adapters, and a setting the user never enabled must not change the
 * journal, so table-less runs settle byte for byte as before.
 * `journalPricingSnapshot` reads the pin back and
 * rebuilds a `priceUsd` from the pinned rows, so a repeated fold after
 * the live table changed reproduces the original numbers exactly.
 *
 * The snapshot governs REPORTING folds (the CLI invoice and inspect
 * cost views, and any host that opts in by passing the rebuilt
 * priceUsd). The engine's own live pricing, budget admission, and the
 * journaled spend debits are untouched: they were always priced at
 * write time and never re-priced by a fold.
 */
import type { JournalEntry } from '../l0/entries.js';
import { entryUsageSlices } from '../l0/entries.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import type { Pricing } from '../l0/spi/provider.js';
import { priceUsdOf } from '../model/pricing.js';
import { RUN_SETTLE_DECISION_TYPE } from '../stores/reconcile.js';

/** One pinned row: the pricing that was APPLIED to this model's usage. */
export interface AppliedPricingRow {
  model: ModelRef;
  rates: Pricing;
}

/**
 * A pinnable row: every present rate is a finite non-negative number.
 * The fold already treats a broken rate as unpriced (a NaN or negative
 * price never poisons the CostReport), so the pin mirrors exactly that
 * and, just as importantly, never feeds a non-finite number to the
 * journal's serialization gate.
 */
function pinnable(rates: Pricing): boolean {
  const sane = (value: number | undefined): boolean =>
    value === undefined || (Number.isFinite(value) && value >= 0);
  return (
    sane(rates.inputUsdPerMTok) &&
    sane(rates.outputUsdPerMTok) &&
    sane(rates.cacheReadUsdPerMTok) &&
    sane(rates.cacheWriteUsdPerMTok) &&
    sane(rates.cacheWrite1hUsdPerMTok) &&
    (rates.tiers ?? []).every(
      (tier) =>
        sane(tier.aboveInputTokens) && sane(tier.inputMultiplier) && sane(tier.outputMultiplier),
    )
  );
}

/**
 * The write-side collection: the resolved pricing row for every model
 * the journal's usage names (terminal slices, per-dispatch records, and
 * plain servedBy alike). Models that resolve no pricing, and rows the
 * fold would refuse anyway (a non-finite or negative rate), are
 * omitted, exactly as the fold surfaces them as `unpriced`; an empty
 * collection returns undefined so an unpriced run's settle stays
 * byte-identical.
 */
export function snapshotJournalPricing(
  entries: readonly JournalEntry[],
  pricingOf: (servedBy: ModelRef) => Pricing | undefined,
): AppliedPricingRow[] | undefined {
  const models = new Set<ModelRef>();
  for (const entry of entries) {
    if (entry.status === 'running' || entry.usage === undefined) {
      continue;
    }
    if (entry.servedBy !== undefined) {
      models.add(entry.servedBy);
    }
    for (const slice of entryUsageSlices(entry)) {
      models.add(slice.servedBy);
    }
    for (const record of entry.providerCalls ?? []) {
      models.add(record.servedBy);
    }
  }
  const rows: AppliedPricingRow[] = [];
  for (const model of [...models].sort()) {
    const rates = pricingOf(model);
    if (rates !== undefined && pinnable(rates)) {
      rows.push({ model, rates });
    }
  }
  return rows.length === 0 ? undefined : rows;
}

/** What `journalPricingSnapshot` rebuilds from a pinned run settle. */
export interface JournalPricingSnapshot {
  /** The PriceTable version of the LAST pin; absent for caps-only rows. */
  pricingVersion?: string;
  /** The last pin's rows: the union covering the whole settled journal. */
  rows: AppliedPricingRow[];
  /**
   * The seq of the last pinning settle: rows at or past it belong to a
   * segment no pin covers yet, so a caller composing with a live table
   * (the engine's outcome mirror) prefers the live rates there.
   */
  pinnedThroughSeq: number;
  /**
   * Prices usage with the PINNED rows only: a model absent from the
   * snapshot folds as unpriced (surfaced, never a silent zero), exactly
   * the honesty contract of the live fold. With a `seq`, the row is
   * priced under the pin of ITS OWN segment (RV505): the first settle
   * that followed it, which recorded exactly the rates its live debits
   * used, so a suspend/resume across a price-table rotation never
   * re-prices settled history. Without a `seq`, the last pin wins, the
   * historical behavior.
   */
  priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined;
}

function pinnedRows(value: unknown): AppliedPricingRow[] | undefined {
  const candidate = (value as { pricing?: unknown } | undefined)?.pricing;
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return undefined;
  }
  const rows: AppliedPricingRow[] = [];
  for (const item of candidate) {
    const row = item as { model?: unknown; rates?: unknown };
    if (
      typeof row.model !== 'string' ||
      !row.model.includes(':') ||
      row.rates === null ||
      typeof row.rates !== 'object'
    ) {
      return undefined;
    }
    rows.push({ model: row.model as ModelRef, rates: row.rates as Pricing });
  }
  return rows;
}

/**
 * The read side. Every settling segment pins the union it applied, and
 * each pin's settle seq bounds the rows it settled FIRST, so the pins
 * compose without any journal change (RV505): a seq-aware caller gets
 * the rates of the row's own segment, and a seq-less caller keeps the
 * historical last-pin behavior. Journals settled before the pin
 * shipped, or without any priced model, return undefined: the caller
 * keeps its current-table fold and its export says so.
 */
export function journalPricingSnapshot(
  entries: readonly JournalEntry[],
): JournalPricingSnapshot | undefined {
  const pins: Array<{ seq: number; byModel: Map<ModelRef, Pricing> }> = [];
  let last:
    | { rows: AppliedPricingRow[]; byModel: Map<ModelRef, Pricing>; pricingVersion?: string }
    | undefined;
  for (const entry of entries) {
    if (entry?.kind !== 'decision') {
      continue;
    }
    const value = entry.value as { decisionType?: unknown; pricingVersion?: unknown } | undefined;
    if (value?.decisionType !== RUN_SETTLE_DECISION_TYPE) {
      continue;
    }
    const rows = pinnedRows(value);
    if (rows === undefined) {
      continue;
    }
    const byModel = new Map<ModelRef, Pricing>(rows.map((row) => [row.model, row.rates]));
    pins.push({ seq: entry.seq, byModel });
    last = {
      rows,
      byModel,
      ...(typeof value.pricingVersion === 'string' ? { pricingVersion: value.pricingVersion } : {}),
    };
  }
  if (last === undefined) {
    return undefined;
  }
  const lastByModel = last.byModel;
  const ratesFor = (servedBy: ModelRef, seq?: number): Pricing | undefined => {
    if (seq === undefined) {
      return lastByModel.get(servedBy);
    }
    // The first pin whose settle followed the row: that segment's
    // applied rates. A model the covering pin missed (unpriced then,
    // priced later) falls back to the last pin, the pre-RV505 answer.
    for (const pin of pins) {
      if (pin.seq > seq) {
        return pin.byModel.get(servedBy) ?? lastByModel.get(servedBy);
      }
    }
    return lastByModel.get(servedBy);
  };
  return {
    ...(last.pricingVersion === undefined ? {} : { pricingVersion: last.pricingVersion }),
    rows: last.rows,
    pinnedThroughSeq: pins[pins.length - 1]?.seq ?? 0,
    priceUsd: (servedBy, usage, seq) => {
      const rates = ratesFor(servedBy, seq);
      return rates === undefined ? undefined : priceUsdOf(rates, usage);
    },
  };
}
