/**
 * The invoice export (P1.3): a pure fold over terminal entries that
 * turns the per-dispatch reconciliation ledger (`providerCalls`) into
 * one row per billable provider call, so a host can line the run up
 * against the provider's invoice. The totals are the SAME billing fold
 * `costReportFromJournal` runs, so `totalUsd` here equals
 * `CostReport.grossUsd` (and `netUsd` equals `CostReport.totalUsd`)
 * exactly, never approximately. Since RV504 that fold prices a fully
 * attributed entry per provider call, so a nonlinear long-context tier
 * fires per REQUEST (the pricing contract's own semantics) and the
 * per-call rows ARE the total; the export is self-describing about it:
 * `pricingBasis` says per-row `usd` prices each call individually,
 * `rowUsdNonAdditive: false` says the rows sum to `totalUsd` (true
 * marks an aggregate-priced remainder or legacy entry in the fold),
 * and per-row `allocatedUsd` is the additive column whose flat sum
 * reproduces `totalUsd` exactly in every case.
 *
 * Coverage is loss-free by construction: a model whose records do not
 * cover its usage (a resume restored from a checkpoint written before
 * the ledger shipped) contributes an `unattributed` remainder row per
 * slice, and an entry with no records at all (written before the
 * ledger shipped, or a fully replayed invocation) contributes one
 * `unattributed` row per usage slice. A COVERED model contributes no
 * remainder rows at all (RV703): its rows are exactly its records, the
 * same per-model decision the billing fold makes, so a role mismatch
 * between records and slices (the schema-extract default splits one
 * model's usage by role while the record carries one role, or none)
 * can no longer fabricate a phantom row that breaks the
 * `rowUsdNonAdditive: false` promise and siphons allocation from the
 * real call. Missing provider ids are marked, never dropped: a
 * finished call without one reconciles as `missing-provider-id`, a
 * failed or severed call without one as `unconfirmed` (the provider
 * may or may not have billed it; there is no id to match).
 *
 * Pricing happens at fold time from the table you pass, exactly like
 * CostReport. For historical stability against price-table updates,
 * pass the priceUsd rebuilt by `journalPricingSnapshot` (RV407): the
 * settling segment pins the rates it applied into the run-settle
 * decision value, and a fold over the pinned rows reproduces the
 * settled numbers whatever the live table says today.
 */
import { buildAbandonFold } from '../journal/disposition.js';
import {
  entryUsageSlices,
  priceEntryBilling,
  type JournalEntry,
  type ProviderCallRecord,
  type UsageSlice,
} from '../l0/entries.js';
import { requireFiniteNumbersDeep } from '../l0/validate-numbers.js';
import type { InvocationRole, ModelRef, Usage } from '../l0/messages.js';
import { costReportFromJournal } from './cost-report.js';
import type { AppliedPricingRow, PinnedPricingSegment } from './pricing-snapshot.js';

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
  /**
   * The spawn's agent type from the terminal's cost attribution
   * (RV3906, the fourth comparison experiment): in dynamic runs the
   * scope grammar nests every orchestrator spawn under one
   * `agent:<seq>` bucket, so per-child money used to require a join
   * through the journal; the row now names the profile directly.
   * Additive and policy, never identity: absent on entries journaled
   * before cost attribution shipped, on empty attributions, and on
   * every pre-RV3906 export byte, so old journals and old consumers
   * read exactly what they always read.
   */
  agentType?: string;
  /**
   * The dispatch label from the same attribution (RV2803 journaled
   * it; RV3906 lifts it onto the row), what tells two spans of one
   * role apart without a journal join. Absent on unlabelled
   * dispatches, additive exactly like `agentType`.
   */
  label?: string;
  /** The call's dispatch ordinal within its invocation; remainder and slice rows continue past it. */
  ordinal: number;
  servedBy: ModelRef;
  role?: InvocationRole;
  /** 1-based try number on the serving target (retries increment it). */
  attempt?: number;
  outcome: ProviderCallRecord['outcome'] | 'unattributed';
  responseId?: string;
  /**
   * Every wire request's response id when the adapter absorbed
   * provider-side continuations into this one dispatch (RV905); a
   * per-request statement bills each segment as its own row, so the
   * reconciliation joins this row by ANY id of the set. Absent on
   * single-wire rows.
   */
  wireResponseIds?: string[];
  /**
   * Provider HTTP requests this ONE row represents (RV1210), from the
   * adapter's reported count rather than the id list: a provider that
   * left an absorbed segment unnamed still billed it. Absent on
   * single-wire rows, where the row IS the request.
   */
  wireRequests?: number;
  usage: Usage;
  usageApprox?: boolean;
  /**
   * Present and true when this `unconfirmed` row recorded ZERO usage
   * on every counter (the v1.71 experiment review, P1.4): a failed
   * attempt whose usage this ledger never saw. The zeros mean
   * "nothing recorded", never "the provider metered nothing": the
   * provider may have billed prompt processing before the failure, so
   * a statement join must treat this row's usage as unknown, not as
   * zero. Derived at export time from the journaled record; rows with
   * any recorded usage, and every other verdict, never carry it.
   */
  usageUnknown?: true;
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

/**
 * Where the fold's rates came from (RV407): `composed` says the caller
 * priced with the snapshot's `composedPriceUsd` (RV611), the engine's
 * own composition, so pin-covered rows reproduce the settled numbers
 * and anything past the last pin priced at the caller's current table;
 * `snapshot` says the caller priced with the raw pinned rows alone
 * (the pre-RV611 label); `current-table` says the live table priced
 * it, the historical behavior for journals without a pin. Attached by
 * the caller, who is the one that chose.
 */
export interface InvoicePricingProvenance {
  source: 'snapshot' | 'current-table' | 'composed';
  pricingVersion?: string | undefined;
  /**
   * The pinned rows the fold used; present on snapshot-priced exports.
   * Each row's `rates` carries `ratesVerifiedAt` when the pinning
   * table stamped one (RV814): the machine-readable answer to how
   * fresh the rates that priced settled history were.
   */
  rows?: AppliedPricingRow[] | undefined;
  /**
   * Per-pin coverage (RV611): every settled segment's version and rows
   * with its seq boundaries, not only the last. A fold across a
   * price-table rotation used to export one `pricingVersion` while its
   * rows priced under several; this array is the honest declaration.
   */
  segments?: PinnedPricingSegment[] | undefined;
  /**
   * On `composed` exports: the last pin's settle seq. Rows at or past
   * it (a segment journaled but not yet settled) priced at the current
   * table, not any pin; each row's `entrySeq` locates it against this
   * bound.
   */
  pinnedThroughSeq?: number | undefined;
  /**
   * The version of the caller's CURRENT table (RV706): on `composed`
   * exports, the table that priced everything past `pinnedThroughSeq`;
   * on `current-table` exports, the whole fold's table. The pinned
   * segments each name their own version, and without this field the
   * composition's second half stayed anonymous. Absent when the
   * caller's table declares no version.
   */
  currentPricingVersion?: string | undefined;
}

/**
 * Logical dispatches against provider HTTP requests (RV1210). One row
 * is one DISPATCH, and a dispatch that absorbed provider-side
 * continuations (RV905) is billed by the provider as several requests,
 * so a per-request statement has MORE lines than this export has rows
 * BY CONSTRUCTION. The counters state that difference instead of
 * leaving a host to meet it as an unexplained count mismatch: a
 * reconciliation that compares row count against statement line count
 * should compare `wireRequests`, and `wireIdsMissing` says how many of
 * those requests carry no join key at all.
 */
export interface InvoiceCardinality {
  /** Rows folding a real provider call; unattributed remainders excluded. */
  dispatchRows: number;
  /** Provider HTTP requests those rows represent, absorbed continuations counted. */
  wireRequests: number;
  /** Rows whose dispatch absorbed more than one wire request. */
  multiWireRows: number;
  /**
   * Wire requests with no recorded join key, across EVERY dispatch row
   * (RV1410): a multi-wire row contributes the requests its id set
   * left unnamed, and a single-wire row contributes its one request
   * when neither `responseId` nor an id set names it. Failed requests
   * count like any other: the provider may have billed them, and a
   * statement line cannot be joined to a row that has no id either
   * way.
   */
  wireIdsMissing: number;
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
   * False exactly when every contributing entry's providerCalls fully
   * cover its usage (RV504): the totals are then the per-call fold
   * itself, each row's `usd` agrees with its `allocatedUsd`, and the
   * flat `usd` sum reproduces `totalUsd` up to IEEE association of
   * the last bits. True when any entry folded on the aggregate basis
   * (no records, or records that do not cover its usage): a nonlinear
   * price table then prices an aggregate differently from the sum of
   * its parts, so sum `allocatedUsd` instead; it exists precisely so
   * a column sums to the total exactly in every case.
   */
  rowUsdNonAdditive: boolean;
  /** Usage on models absent from pricing, net and abandoned alike; never a silent zero. */
  unpriced: Array<{ model: string; usage: Usage }>;
  /** Rows whose reconciliation is not 'provider-id-present'. */
  reconciliationFailures: number;
  /** Dispatch rows against the provider requests they represent (RV1210). */
  cardinality: InvoiceCardinality;
  /**
   * USD of allocation pools that had a target and no row to carry it
   * (RV605). The dust pass refuses to move such dollars onto another
   * model's rows just to make the column sum, so on the (pathological)
   * journals where this happens the flat `allocatedUsd` sum reproduces
   * `totalUsd` minus this amount. Absent when zero, which is every
   * well-formed journal: the per-slice remainder rows guarantee a row
   * wherever a slice has usage.
   */
  unallocatedUsd?: number;
  /** Rows carrying `usageUnknown`; present when at least one does. */
  usageUnknownRows?: number;
  /** Present and true when any contributing entry carried approximate usage. */
  usageApprox?: boolean;
  /** The rates provenance (RV407); present when the caller declared it. */
  pricing?: InvoicePricingProvenance;
  /**
   * The unsettled lane (RV2008): dispatches whose agent is still
   * RUNNING at the journal's edge, recovered from the incremental
   * provider-call rows the loop journals as each wire call settles.
   * Deliberately OUTSIDE the settled totals above: run_settle stays
   * the billing boundary, and this section prices what the crash
   * window preserved anyway, the ~$0.99 of parity root dispatches
   * that used to live only in process memory. Present only when such
   * rows exist; a journal whose roster is closed never carries it.
   */
  unsettled?: {
    usd: number;
    wireRequests: number;
    rows: Array<{
      agentRef: number;
      scope: string;
      ordinal: number;
      servedBy: ModelRef;
      role: string;
      attempt: number;
      outcome: string;
      usage: Usage;
      usd?: number;
      responseId?: string;
    }>;
  };
  /**
   * The orphaned receipt lane (RV3405): incremental provider-call rows
   * of agents whose TERMINAL entry does not cover them. The window is
   * real: the loop journals a receipt as each wire settles (RV2008),
   * the turn checkpoint lands later, and a crash between the two
   * resumes from a checkpoint that never saw the paid wire, so the
   * settled terminal's record set forgets the payment while the
   * receipt lane remembers it. Real money, priced and summed apart
   * from the settled totals exactly like `unsettled` (run_settle stays
   * the billing boundary); this lane is why a provider statement
   * billing that wire is explainable to the cent instead of reading as
   * a foreign row. Coverage is decided by response id when either side
   * carries one, else by the full (ordinal, servedBy, attempt,
   * outcome) coordinate plus byte equal usage: after a resume the
   * redispatched wire REUSES the ordinal, and reading the replacement
   * as the orphan would silently absorb the double payment the resume
   * honestly made. Present only when such rows exist; a journal
   * without a mid turn crash never carries it.
   */
  orphanedReceipts?: {
    usd: number;
    wireRequests: number;
    rows: Array<{
      agentRef: number;
      scope: string;
      ordinal: number;
      servedBy: ModelRef;
      role: string;
      attempt: number;
      outcome: string;
      usage: Usage;
      usd?: number;
      responseId?: string;
    }>;
  };
}

const USAGE_FIELDS = [
  'inputTokens',
  'outputTokens',
  'cacheReadTokens',
  'cacheWriteTokens',
] as const;

/**
 * The dispatch/wire counters (RV1210). A row with no reported count is
 * one wire request, which is what a single-wire dispatch is; a row that
 * reports a count contributes that many, and the ids it recorded are
 * subtracted to say how many of those requests carry no join key. The
 * single-wire arm (RV1410): the row IS its one request and its join
 * key is the row's own `responseId`, so an id-less single-wire row is
 * one missing key. Counting misses only inside multi-wire rows read an
 * id-less single-wire fleet as fully joined (`wireIdsMissing: 0`)
 * while every row-level verdict said missing-provider-id: the
 * aggregate contradicted its own rows.
 */
function cardinalityOf(rows: readonly InvoiceRow[]): InvoiceCardinality {
  const cardinality: InvoiceCardinality = {
    dispatchRows: 0,
    wireRequests: 0,
    multiWireRows: 0,
    wireIdsMissing: 0,
  };
  for (const row of rows) {
    if (row.outcome === 'unattributed') {
      continue;
    }
    cardinality.dispatchRows += 1;
    const wires = row.wireRequests ?? 1;
    cardinality.wireRequests += wires;
    if (wires > 1) {
      cardinality.multiWireRows += 1;
      cardinality.wireIdsMissing += Math.max(0, wires - (row.wireResponseIds?.length ?? 0));
    } else if (row.responseId === undefined && (row.wireResponseIds?.length ?? 0) === 0) {
      cardinality.wireIdsMissing += 1;
    }
  }
  return cardinality;
}

/**
 * One usage slice minus ITS OWN records' sum, clamped at zero per field
 * (RV605). A record belongs to a slice when it names the same serving
 * model, and the same role when the slice carries one; a slice written
 * without a role (the legacy whole-entry fallback) absorbs every record
 * of its model, which is exactly the pre-RV605 arithmetic for
 * single-model entries. Computing the remainder per slice instead of
 * per entry is what keeps an orphaned model's spend on a row of that
 * model: the whole-entry remainder was published under `entry.servedBy`,
 * so a slice with no records left its allocation pool rowless and the
 * dust pass moved its dollars onto another model's row.
 *
 * Consulted only for UNCOVERED models (RV703): coverage is a per-model
 * decision, so a covered model's slices never reach this arithmetic.
 * The per-role subtraction here against the per-model coverage key was
 * exactly the mismatch that fabricated a phantom remainder whenever a
 * covered model's record roles differed from its slice roles.
 */
function sliceRemainder(
  slice: UsageSlice,
  records: readonly ProviderCallRecord[],
): Usage | undefined {
  const remainder: Usage = {
    inputTokens: slice.usage.inputTokens,
    outputTokens: slice.usage.outputTokens,
    cacheReadTokens: slice.usage.cacheReadTokens,
    cacheWriteTokens: slice.usage.cacheWriteTokens,
  };
  let reasoning = slice.usage.reasoningTokens ?? 0;
  for (const record of records) {
    if (record.servedBy !== slice.servedBy) {
      continue;
    }
    if (slice.role !== undefined && record.role !== slice.role) {
      continue;
    }
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

/**
 * One export row's usage envelope (RV3311): every row carries the SAME
 * field set, `reasoningTokens` included (0 when the provider reported
 * none), and the object is detached from the journal entry it was read
 * from. The 2026-08-12 comparison run's invoice had 77 rows with the
 * field and one without, and a FinOps consumer folding the column had
 * to know that absence meant zero on exactly one row shape.
 */
function rowUsage(usage: Usage): Usage {
  return { ...usage, reasoningTokens: usage.reasoningTokens ?? 0 };
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
 *
 * A pool with a target and NO rows refuses the transfer (RV605): its
 * dollars are excluded from the dust reconciliation and returned as the
 * unallocated share, because dumping them on the globally largest row
 * moved one model's spend onto another model's line just to make the
 * column sum. The returned amount is zero on every well-formed journal
 * (the per-slice remainder rows above guarantee a row wherever a slice
 * has usage), so the flat sum still reproduces `totalUsd` exactly there.
 */
function allocateRows(
  rows: InvoiceRow[],
  entries: readonly JournalEntry[],
  priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined,
  totalUsd: number,
): number {
  const targets = new Map<string, number>();
  for (const entry of entries) {
    if (entry.status === 'running' || entry.usage === undefined) {
      continue;
    }
    for (const unit of priceEntryBilling(entry, priceUsd).units) {
      const key = allocationKey(entry.seq, unit.servedBy);
      targets.set(key, (targets.get(key) ?? 0) + unit.usd);
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
  let unallocated = 0;
  for (const [key, target] of targets) {
    if (target !== 0 && !pools.has(key)) {
      unallocated += target;
    }
  }
  if (rows.length === 0) {
    return unallocated;
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
    return unallocated;
  }
  // Fixed-point dust pass: each correction shrinks the flat-sum gap to
  // rounding of the last addition, so this settles in a pass or two;
  // the bound only guards a pathological tie. The reconciliation goal
  // excludes the unallocated share: dust absorption repairs IEEE
  // association, never a missing row.
  const goal = totalUsd - unallocated;
  for (let pass = 0; pass < 8; pass += 1) {
    const flat = rows.reduce((acc, row) => acc + row.allocatedUsd, 0);
    if (flat === goal) {
      break;
    }
    absorber.allocatedUsd += goal - flat;
  }
  return unallocated;
}

/** A single row priced at its own model's rate; broken rates fold as unpriced. */
function rowUsd(
  priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined,
  servedBy: ModelRef,
  usage: Usage,
  seq: number,
): number | undefined {
  const usd = priceUsd(servedBy, usage, seq);
  return usd !== undefined && Number.isFinite(usd) && usd >= 0 ? usd : undefined;
}

/**
 * The pure invoice fold. Pass the same entries and price table you
 * would pass `costReportFromJournal`; the totals are that report's
 * gross/net split verbatim. To make the export historically stable
 * against price-table updates, pass the priceUsd rebuilt by
 * `journalPricingSnapshot` and declare it via `options.pricing` (RV407);
 * without a snapshot the fold prices at the current table's rates,
 * exactly as before.
 */
export function invoiceFromJournal(
  entries: readonly JournalEntry[],
  priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined,
  options?: { pricing?: InvoicePricingProvenance },
): InvoiceExport {
  const report = costReportFromJournal(entries, priceUsd);
  const abandonFold = buildAbandonFold(entries);
  const rows: InvoiceRow[] = [];
  // The per-call basis is literal exactly when every contributing entry
  // is fully attributed (RV504): rows then sum to the total and the
  // export says so via rowUsdNonAdditive: false.
  let everyEntryFullyAttributed = true;
  for (const entry of entries) {
    if (entry.status === 'running' || entry.usage === undefined) {
      continue;
    }
    const billing = priceEntryBilling(entry, priceUsd);
    if (!billing.fullyAttributed) {
      everyEntryFullyAttributed = false;
    }
    const abandoned =
      entry.kind !== 'resolution' &&
      entry.kind !== 'abandon' &&
      abandonFold.isAbandoned(entry.ref ?? entry.seq);
    // The attribution facts ride every row of the entry (RV3906):
    // records, unattributed slices, and remainder rows alike, since
    // all three describe the same invocation's money. The empty
    // agentType folds as absent, the tool-calibration rule: '' is the
    // root's honest non-type, not a name.
    const attribution = entry.costAttribution;
    const base = {
      entrySeq: entry.seq,
      scope: entry.scope,
      key: entry.key,
      ...(attribution?.agentType === undefined || attribution.agentType === ''
        ? {}
        : { agentType: attribution.agentType }),
      ...(attribution?.label === undefined ? {} : { label: attribution.label }),
    };
    const mark = abandoned ? ({ abandoned: true } as const) : {};
    const records = entry.providerCalls ?? [];
    for (const record of records) {
      const usd = rowUsd(priceUsd, record.servedBy, record.usage, entry.seq);
      const reconciliation: InvoiceReconciliation =
        record.responseId !== undefined
          ? 'provider-id-present'
          : record.outcome === 'ok'
            ? 'missing-provider-id'
            : 'unconfirmed';
      // The zero on an unconfirmed row means "nothing recorded", not
      // "the provider metered nothing" (the v1.71 experiment review,
      // P1.4): say so machine-readably instead of letting the zeros
      // read as a statement claim.
      const usageUnknown =
        reconciliation === 'unconfirmed' &&
        USAGE_FIELDS.every((field) => record.usage[field] === 0) &&
        (record.usage.reasoningTokens ?? 0) === 0;
      rows.push({
        ...base,
        ordinal: record.ordinal,
        servedBy: record.servedBy,
        role: record.role,
        attempt: record.attempt,
        outcome: record.outcome,
        ...(record.responseId === undefined ? {} : { responseId: record.responseId }),
        ...(record.wireResponseIds === undefined
          ? {}
          : { wireResponseIds: record.wireResponseIds }),
        ...(record.wireRequests === undefined ? {} : { wireRequests: record.wireRequests }),
        usage: rowUsage(record.usage),
        ...(record.usageApprox === true ? { usageApprox: true } : {}),
        ...(usageUnknown ? { usageUnknown: true } : {}),
        ...(usd === undefined ? {} : { usd }),
        allocatedUsd: 0,
        ...mark,
        reconciliation,
      });
    }
    if (records.length === 0) {
      // No ledger on the entry (pre-ledger runs, fully replayed
      // invocations): one unattributed row per usage slice keeps the
      // spend visible and the totals loss-free.
      entryUsageSlices(entry).forEach((slice, index) => {
        const usd = rowUsd(priceUsd, slice.servedBy, slice.usage, entry.seq);
        rows.push({
          ...base,
          ordinal: index + 1,
          servedBy: slice.servedBy,
          ...(slice.role === undefined ? {} : { role: slice.role }),
          outcome: 'unattributed',
          usage: rowUsage(slice.usage),
          ...(entry.usageApprox === true ? { usageApprox: true } : {}),
          ...(usd === undefined ? {} : { usd }),
          allocatedUsd: 0,
          ...mark,
          reconciliation: 'unattributed',
        });
      });
      continue;
    }
    // The records do not cover a slice's total (a resume restored a
    // pre-ledger checkpoint, or one model's dispatches predate the
    // ledger): the difference is real billed usage, surfaced as one
    // unattributed remainder row PER SLICE under the slice's own
    // serving model and role (RV605), never pooled onto entry.servedBy.
    // A covered model is exempt (RV703): the billing fold already
    // decided its records account for every counter, so its rows are
    // its records and any per-role residue would double-count.
    let remainderOrdinal = records.length + 1;
    for (const slice of entryUsageSlices(entry)) {
      if (billing.coveredModels.has(slice.servedBy)) {
        continue;
      }
      const remainder = sliceRemainder(slice, records);
      if (remainder === undefined) {
        continue;
      }
      const usd = rowUsd(priceUsd, slice.servedBy, remainder, entry.seq);
      rows.push({
        ...base,
        ordinal: remainderOrdinal,
        servedBy: slice.servedBy,
        ...(slice.role === undefined ? {} : { role: slice.role }),
        outcome: 'unattributed',
        usage: rowUsage(remainder),
        ...(entry.usageApprox === true ? { usageApprox: true } : {}),
        ...(usd === undefined ? {} : { usd }),
        allocatedUsd: 0,
        ...mark,
        reconciliation: 'unattributed',
      });
      remainderOrdinal += 1;
    }
  }
  const unallocatedUsd = allocateRows(rows, entries, priceUsd, report.grossUsd);
  // The unsettled lane (RV2008): incremental provider-call rows of
  // agents with no terminal yet. Priced and summed apart from the
  // settled totals, never folded into them.
  const terminalByRef = new Map(
    entries
      .filter((entry) => entry.kind === 'agent' && entry.status !== 'running')
      .map((entry) => [entry.ref, entry] as const),
  );
  const runningBySeq = new Map(
    entries
      .filter((entry) => entry.kind === 'agent' && entry.status === 'running')
      .map((entry) => [entry.seq, entry] as const),
  );
  const unsettledRows: NonNullable<InvoiceExport['unsettled']>['rows'] = [];
  const orphanedRows: NonNullable<InvoiceExport['orphanedReceipts']>['rows'] = [];
  for (const entry of entries) {
    if (entry.kind !== 'decision') {
      continue;
    }
    const value = entry.value as
      | {
          decisionType?: string;
          agentRef?: number;
          record?: {
            ordinal?: number;
            role?: string;
            servedBy?: string;
            attempt?: number;
            outcome?: string;
            usage?: Usage;
            responseId?: string;
            wireRequests?: number;
          };
        }
      | undefined;
    if (value?.decisionType !== 'provider-call' || typeof value.agentRef !== 'number') {
      continue;
    }
    const record = value.record;
    if (
      record?.usage === undefined ||
      typeof record.ordinal !== 'number' ||
      typeof record.servedBy !== 'string'
    ) {
      continue;
    }
    const terminal = terminalByRef.get(value.agentRef);
    if (terminal !== undefined) {
      // The orphan check (RV3405): a receipt the settled terminal's
      // record set does not cover is a payment only the receipt lane
      // witnessed. Response id decides when either side carries one
      // (a resume redispatch REUSES the ordinal, so a coordinate match
      // across different ids is the replacement wire, not this one);
      // the coordinate plus byte equal usage decides the id-less rest.
      const receiptUsage = record.usage;
      const covered = (terminal.providerCalls ?? []).some((call) => {
        if (typeof record.responseId === 'string' || call.responseId !== undefined) {
          return call.responseId === record.responseId;
        }
        return (
          call.ordinal === record.ordinal &&
          call.servedBy === record.servedBy &&
          call.attempt === (typeof record.attempt === 'number' ? record.attempt : 1) &&
          call.outcome === (typeof record.outcome === 'string' ? record.outcome : 'ok') &&
          USAGE_FIELDS.every((field) => (call.usage[field] ?? 0) === (receiptUsage[field] ?? 0)) &&
          (call.usage.reasoningTokens ?? 0) === (receiptUsage.reasoningTokens ?? 0)
        );
      });
      if (covered) {
        continue;
      }
      const usd = rowUsd(priceUsd, record.servedBy as ModelRef, record.usage, entry.seq);
      orphanedRows.push({
        agentRef: value.agentRef,
        scope: terminal.scope,
        ordinal: record.ordinal,
        servedBy: record.servedBy as ModelRef,
        role: typeof record.role === 'string' ? record.role : 'loop',
        attempt: typeof record.attempt === 'number' ? record.attempt : 1,
        outcome: typeof record.outcome === 'string' ? record.outcome : 'ok',
        usage: rowUsage(record.usage),
        ...(usd === undefined ? {} : { usd }),
        ...(typeof record.responseId === 'string' ? { responseId: record.responseId } : {}),
      });
      continue;
    }
    const running = runningBySeq.get(value.agentRef);
    if (running === undefined) {
      continue;
    }
    const usd = rowUsd(priceUsd, record.servedBy as ModelRef, record.usage, entry.seq);
    unsettledRows.push({
      agentRef: value.agentRef,
      scope: running.scope,
      ordinal: record.ordinal,
      servedBy: record.servedBy as ModelRef,
      role: typeof record.role === 'string' ? record.role : 'loop',
      attempt: typeof record.attempt === 'number' ? record.attempt : 1,
      outcome: typeof record.outcome === 'string' ? record.outcome : 'ok',
      usage: rowUsage(record.usage),
      ...(usd === undefined ? {} : { usd }),
      ...(typeof record.responseId === 'string' ? { responseId: record.responseId } : {}),
    });
  }
  const unsettled =
    unsettledRows.length === 0
      ? undefined
      : {
          usd: unsettledRows.reduce((sum, row) => sum + (row.usd ?? 0), 0),
          wireRequests: unsettledRows.length,
          rows: unsettledRows,
        };
  const orphanedReceipts =
    orphanedRows.length === 0
      ? undefined
      : {
          usd: orphanedRows.reduce((sum, row) => sum + (row.usd ?? 0), 0),
          wireRequests: orphanedRows.length,
          rows: orphanedRows,
        };
  const usageApprox = report.usageApprox === true || report.abandoned.usageApprox === true;
  // Every row EXCEPT the unattributed remainders folds one dispatch: a
  // remainder is usage no record covers, so it represents no request
  // this export can count (RV1210).
  const invoice: InvoiceExport = {
    rows,
    totalUsd: report.grossUsd,
    netUsd: report.totalUsd,
    abandonedUsd: report.abandoned.usd,
    pricingBasis: 'per-call',
    rowUsdNonAdditive: !everyEntryFullyAttributed,
    ...(unallocatedUsd === 0 ? {} : { unallocatedUsd }),
    unpriced: [...report.unpriced, ...report.abandoned.unpriced],
    reconciliationFailures: rows.filter((row) => row.reconciliation !== 'provider-id-present')
      .length,
    cardinality: cardinalityOf(rows),
    ...(unsettled === undefined ? {} : { unsettled }),
    ...(orphanedReceipts === undefined ? {} : { orphanedReceipts }),
    ...((): { usageUnknownRows?: number } => {
      const count = rows.filter((row) => row.usageUnknown === true).length;
      return count === 0 ? {} : { usageUnknownRows: count };
    })(),
    ...(usageApprox ? { usageApprox: true } : {}),
    ...(options?.pricing === undefined ? {} : { pricing: options.pricing }),
  };
  // The public boundary (RV610): allocation math over pathological but
  // individually finite amounts can breed Infinity and NaN, and a
  // published invoice must never carry either.
  requireFiniteNumbersDeep(invoice, 'invoice');
  return invoice;
}
