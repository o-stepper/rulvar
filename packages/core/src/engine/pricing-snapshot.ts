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
  /** The PriceTable version the settle recorded; absent for caps-only rows. */
  pricingVersion?: string;
  rows: AppliedPricingRow[];
  /**
   * Prices usage with the PINNED rows only: a model absent from the
   * snapshot folds as unpriced (surfaced, never a silent zero), exactly
   * the honesty contract of the live fold.
   */
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined;
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
 * The read side: the LAST run-settle decision carrying a pricing pin
 * wins (each settling segment re-pins the union it applied, so the last
 * one covers every model of the journal it settled). Journals settled
 * before the pin shipped, or without any priced model, return
 * undefined: the caller keeps its current-table fold and its export
 * says so.
 */
export function journalPricingSnapshot(
  entries: readonly JournalEntry[],
): JournalPricingSnapshot | undefined {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
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
    return {
      ...(typeof value.pricingVersion === 'string' ? { pricingVersion: value.pricingVersion } : {}),
      rows,
      priceUsd: (servedBy, usage) => {
        const rates = byModel.get(servedBy);
        return rates === undefined ? undefined : priceUsdOf(rates, usage);
      },
    };
  }
  return undefined;
}
