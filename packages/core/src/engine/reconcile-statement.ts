/**
 * Provider statement reconciliation (RV812). The twelfth comparison
 * run's billing question was closed by hand: the dashboard's headline
 * said 4.45 then 4.77 USD against the settled 7.304885, and only the
 * per-component Spend categories screenshots proved the invoice right
 * to the cent while the headline turned out to be the dashboard's own
 * unconverged aggregate. This module is that investigation as a
 * machine, so the next such question closes with a report instead of
 * screenshots.
 *
 * It joins a NORMALIZED provider export against the machine-readable
 * invoice (`invoiceFromJournal`): per-request rows by response id, or
 * per-model per-component category totals (the Spend categories tab).
 * Headline aggregates are refused typed: an eventually-consistent
 * dashboard total is not evidence, per-component figures and usage
 * exports are. The report carries response-id coverage (a partially
 * delivered export must read as partial coverage, never as false
 * divergence), per-component deltas, and the implied actual rate of
 * every component, so a real divergence NAMES the rate-card line that
 * moved instead of printing one inexplicable total.
 *
 * The intake fails closed on numbers that cannot be evidence (RV903,
 * the thirteenth experiment's probes): non-finite or negative dollars,
 * non-integer or negative token counts, and non-finite or negative
 * tolerances refuse typed instead of flowing NaN through the sums to a
 * false 'match'. Provider-reported token disagreements decide the
 * verdict by default; `tokenComparison: 'informational'` restores the
 * dollar-only verdict for exports with legitimately different token
 * semantics.
 *
 * Sidecar only, like the v1.19.0 cache audit beside it: nothing here
 * reads or writes a journal, and the caller stores the report next to
 * the invoice it reconciles.
 */
import { ConfigError } from '../l0/errors.js';
import type { ModelRef } from '../l0/messages.js';
import type { Pricing } from '../l0/spi/provider.js';
import { priceComponentsOf } from '../model/pricing.js';
import type { InvoiceRow } from './invoice.js';

/** The four billing components a provider statement itemizes. */
export type BillingComponent = 'input' | 'cached-input' | 'cache-write' | 'output';

const COMPONENTS: readonly BillingComponent[] = ['input', 'cached-input', 'cache-write', 'output'];

/**
 * One normalized per-request row of a usage/billing export. `usd` is
 * the row's billed dollars where the export carries amounts;
 * `componentsUsd` its per-component split where it carries one; `usage`
 * the provider-reported token counts where it carries those. A row must
 * carry at least one of the three, and every row needs the provider's
 * response id, the join key.
 */
export interface StatementRequestRow {
  responseId: string;
  /** Provider-side model name (without the adapter prefix); optional. */
  model?: string;
  usd?: number;
  componentsUsd?: Partial<Record<BillingComponent, number>>;
  usage?: {
    inputTokens?: number;
    cachedInputTokens?: number;
    cacheWriteTokens?: number;
    outputTokens?: number;
  };
}

/** One per-model per-component total: the Spend categories shape. */
export interface StatementCategoryRow {
  model: string;
  component: BillingComponent;
  usd: number;
}

/** A normalized provider export: never a headline total. */
export type ProviderStatement =
  | { kind: 'requests'; rows: readonly StatementRequestRow[] }
  | { kind: 'categories'; rows: readonly StatementCategoryRow[] };

export interface ReconcileStatementOptions {
  /** Our rate card, the same resolution the engine prices with. */
  pricingOf: (servedBy: ModelRef) => Pricing | undefined;
  /**
   * Per-component divergence threshold in USD. The default 0.005
   * absorbs the dashboard's 3-decimal rounding (at most 0.0005 per
   * figure) with an order of margin, while any real rate-card
   * divergence on a run worth reconciling sits orders above it.
   */
  componentToleranceUsd?: number;
  /**
   * Totals threshold for a per-request export that carries row dollars
   * but no per-component split; default 0.01.
   */
  totalToleranceUsd?: number;
  /** Provider-side model name of a served ref; default strips the adapter prefix. */
  modelOf?: (servedBy: ModelRef) => string;
  /**
   * How provider-reported token counts weigh on the verdict (RV903).
   * 'verdict' (default): any token disagreement between the export and
   * our recorded usage is a divergence, because our counts ARE the
   * provider's own wire-reported numbers, so an export that disagrees
   * with them describes a different request than the wire served, and
   * dollars derived from either cannot be trusted to mean the same
   * thing. 'informational' preserves the pre-v1.126 dollar-only
   * verdict for exports whose token semantics legitimately differ from
   * the wire's (a different cache accounting, rounded aggregates):
   * mismatches are still counted and sampled, but only dollar deltas
   * decide.
   */
  tokenComparison?: 'verdict' | 'informational';
}

/** One (model, component) line of the reconciliation. */
export interface ComponentDelta {
  model: string;
  component: BillingComponent;
  /** Our token base for the component, from the invoice rows' usage. */
  ourTokens: number;
  /** Our dollars, from the shared price decomposition (priceComponentsOf). */
  ourUsd: number;
  /** The statement's dollars; absent when the export does not carry this line. */
  statementUsd?: number;
  deltaUsd?: number;
  /** statementUsd over ourTokens, per MTok: the rate the provider ACTUALLY applied. */
  impliedUsdPerMTok?: number;
  /** ourUsd over ourTokens, per MTok: our effective rate over the same base, tier mix included. */
  effectiveUsdPerMTok?: number;
  divergent: boolean;
}

export interface StatementCoverage {
  /** Invoice rows carrying usage or dollars: the billable set. */
  billableRows: number;
  rowsWithResponseId: number;
  /** Requests mode: rows the export covered. Categories mode: equals billableRows (totals claim the set). */
  matchedRows: number;
  unmatchedRows: number;
  /** First unmatched response ids (at most 20), requests mode. */
  unmatchedIdSample: string[];
  /** Statement rows matching nothing of ours: ids (requests) or model names (categories). */
  statementOnlyRows: number;
  statementOnlyIdSample: string[];
  complete: boolean;
}

export interface StatementReconciliation {
  mode: 'requests' | 'categories';
  coverage: StatementCoverage;
  totals: { ourUsd: number; statementUsd?: number; deltaUsd?: number };
  /** Every (model, component) line, models sorted, components in canonical order. */
  components: ComponentDelta[];
  /** The lines beyond tolerance, largest |delta| first: the named divergences. */
  divergent: ComponentDelta[];
  /**
   * Token disagreements between the export and our recorded usage
   * (requests mode). Under the default tokenComparison 'verdict' any
   * mismatch makes the verdict 'divergence'; under 'informational' the
   * count and sample still report, advisory only (RV903).
   */
  tokenMismatches: number;
  tokenMismatchSample: Array<{
    responseId: string;
    field: string;
    ours: number;
    statement: number;
  }>;
  /** Models the rate card does not cover: declared, excluded from divergence. */
  unpricedModels: string[];
  /** Rows whose usage the ledger never saw (usageUnknown): counted apart, never folded. */
  usageUnknownRows: number;
  componentToleranceUsd: number;
  verdict: 'match' | 'divergence' | 'partial-coverage' | 'no-overlap';
  /**
   * The settlement-grade composite, first class (RV1006): true exactly
   * when the verdict is 'match' AND coverage is complete AND no row's
   * usage is unknown AND no model went unpriced. A 'match' alone is
   * not enough: an export can cover every KNOWN row to the cent while
   * a usage-unknown attempt still holds unattributed money, and a safe
   * consumer must not assemble this predicate by hand. The last two
   * conditions overlap today's verdict semantics deliberately: the
   * predicate states the full contract so it cannot drift apart from
   * a future verdict refinement.
   */
  settleable: boolean;
}

const SAMPLE_CAP = 20;

interface ComponentSums {
  tokens: Record<BillingComponent, number>;
  usd: Record<BillingComponent, number>;
}

const emptySums = (): ComponentSums => ({
  tokens: { input: 0, 'cached-input': 0, 'cache-write': 0, output: 0 },
  usd: { input: 0, 'cached-input': 0, 'cache-write': 0, output: 0 },
});

const defaultModelOf = (servedBy: ModelRef): string => {
  const colon = servedBy.indexOf(':');
  return colon === -1 ? servedBy : servedBy.slice(colon + 1);
};

/**
 * A statement dollar amount must be a finite nonnegative number
 * (RV903). The thirteenth experiment's probe fed `usd: NaN` and got
 * verdict 'match' with NaN totals: NaN flowed through the sums and
 * `Math.abs(NaN) > tolerance` is false, so the divergence check
 * silently disarmed. Negative amounts are refused too: provider
 * credits and adjustments are real, but they are not per-request or
 * per-component BILLING evidence, and folding them into the join would
 * let an adjustment mask a rate divergence of the same size.
 */
function assertStatementUsd(where: string, field: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new ConfigError(
      `statement reconciliation refused: ${where} carries ${field} ${String(value)}, which ` +
        'cannot be summed; a statement whose dollars are not finite is not evidence',
    );
  }
  if (value < 0) {
    throw new ConfigError(
      `statement reconciliation refused: ${where} carries negative ${field} ${String(value)}; ` +
        'credits and adjustments reconcile separately, never as negative statement rows',
    );
  }
}

/** A provider-reported token count must be a nonnegative integer (RV903). */
function assertTokenCount(where: string, field: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new ConfigError(
      `statement reconciliation refused: ${where} carries ${field} ${String(value)}; ` +
        'provider-reported token counts are nonnegative integers',
    );
  }
}

/**
 * Reconciles the invoice against a normalized provider export. Pure and
 * journal-free; see the module doc for the contract. Throws a typed
 * ConfigError on inputs that cannot be evidence: an empty statement (a
 * headline total with no rows), a request row without a response id, a
 * duplicate response id (an ambiguous join), a request export whose
 * rows carry neither dollars, components, nor usage, any non-finite or
 * negative dollar amount, any non-integer or negative token count, a
 * non-finite or negative tolerance (RV903: a statement that cannot
 * be summed must refuse loudly, never verdict 'match' on NaN totals),
 * or a row whose usd and componentsUsd contradict each other beyond
 * totalToleranceUsd (RV1005: an internally contradictory export is
 * not evidence either).
 */
export function reconcileStatement(
  invoice: { rows: readonly InvoiceRow[] },
  statement: ProviderStatement,
  options: ReconcileStatementOptions,
): StatementReconciliation {
  for (const [name, value] of [
    ['componentToleranceUsd', options.componentToleranceUsd],
    ['totalToleranceUsd', options.totalToleranceUsd],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      throw new ConfigError(
        `statement reconciliation refused: ${name} ${String(value)} is not a finite ` +
          'nonnegative dollar tolerance',
      );
    }
  }
  const componentToleranceUsd = options.componentToleranceUsd ?? 0.005;
  const totalToleranceUsd = options.totalToleranceUsd ?? 0.01;
  const modelOf = options.modelOf ?? defaultModelOf;
  const tokenComparison = options.tokenComparison ?? 'verdict';
  if (statement.rows.length === 0) {
    throw new ConfigError(
      'statement reconciliation refused: the statement carries no rows. A headline total is ' +
        'not evidence (dashboard aggregates are eventually consistent); export per-request ' +
        'rows or per-component categories and reconcile those',
    );
  }

  // The billable set: rows with any usage or dollars. usageUnknown rows
  // (a failed attempt whose usage the ledger never saw) are counted
  // apart: their zeros are "unknown", never a zero claim.
  const billable: InvoiceRow[] = [];
  let usageUnknownRows = 0;
  for (const row of invoice.rows) {
    if (row.usageUnknown === true) {
      usageUnknownRows += 1;
      continue;
    }
    billable.push(row);
  }

  // Which invoice rows the statement covers decides what folds into the
  // component sums: a partially delivered export must read as partial
  // coverage, never as divergence manufactured by comparing a subset
  // against a whole.
  let covered: InvoiceRow[] = billable;
  let matchedRows: number;
  let unmatchedRows = 0;
  const unmatchedIdSample: string[] = [];
  let statementOnlyRows = 0;
  const statementOnlyIdSample: string[] = [];
  let statementTotalUsd: number | undefined;
  let statementComponents: Map<string, Partial<Record<BillingComponent, number>>> | undefined;
  // Requests mode: how many matched export rows there were, and how
  // many of them carried row dollars. The totals comparison may decide
  // only when the two coincide, i.e. the export's dollar claim covers
  // the same set our dollars fold over (RV1005).
  let matchedStatementRows = 0;
  let matchedUsdRows = 0;
  let tokenMismatches = 0;
  // True when a partially delivered multi-wire segment set touched our
  // data (RV905): the export overlaps, so the verdict is
  // partial-coverage, never no-overlap.
  let partialOverlap = false;
  const tokenMismatchSample: StatementReconciliation['tokenMismatchSample'] = [];

  const rowsWithResponseId = billable.filter((row) => row.responseId !== undefined).length;

  if (statement.kind === 'requests') {
    const byId = new Map<string, StatementRequestRow>();
    let carriesAnything = false;
    for (const row of statement.rows) {
      if (row.responseId === '') {
        throw new ConfigError(
          'statement reconciliation refused: a per-request export row has no response id, the ' +
            'join key; normalize the export or reconcile per-component categories instead',
        );
      }
      if (byId.has(row.responseId)) {
        throw new ConfigError(
          `statement reconciliation refused: duplicate response id '${row.responseId}' in the ` +
            'export makes the join ambiguous',
        );
      }
      const where = `row '${row.responseId}'`;
      if (row.usd !== undefined) {
        assertStatementUsd(where, 'usd', row.usd);
      }
      if (row.componentsUsd !== undefined) {
        let componentsSum = 0;
        let componentsSeen = 0;
        for (const component of COMPONENTS) {
          const usd = row.componentsUsd[component];
          if (usd !== undefined) {
            assertStatementUsd(where, `componentsUsd.${component}`, usd);
            componentsSum += usd;
            componentsSeen += 1;
          }
        }
        // An AFFIRMATIVELY declared split with zero figures is not
        // evidence (RV1201): before this rule `componentsUsd: {}` read
        // verdict 'match' with complete coverage and settleable true,
        // because the object's mere presence counted while declaring
        // nothing (the sixteenth experiment, judge repro R1). A row
        // that declares no dollar claim at all still joins by id; the
        // empty CLAIM is what refuses.
        if (componentsSeen === 0) {
          throw new ConfigError(
            `statement reconciliation refused: ${where} declares componentsUsd with no ` +
              'component figures; an empty object is not evidence: drop the field or ' +
              'export the split',
          );
        }
        // A row carrying BOTH a total and a component split must have
        // them agree (RV1005): the fourteenth experiment fed usd 100
        // beside components summing 1 and read verdict 'match', because
        // each claim sat inside its own tolerance and nothing compared
        // them to each other. An export whose own numbers contradict
        // each other is not evidence; refuse instead of picking a side.
        if (
          row.usd !== undefined &&
          componentsSeen > 0 &&
          Math.abs(row.usd - componentsSum) > totalToleranceUsd
        ) {
          throw new ConfigError(
            `statement reconciliation refused: ${where} carries usd ${String(row.usd)} and a ` +
              `component split summing to ${String(componentsSum)}, claims that contradict ` +
              `each other beyond the ${String(totalToleranceUsd)} totals tolerance; an export ` +
              'whose own total disagrees with its own components is not evidence: normalize ' +
              'it to one dollar claim per row or fix the export',
          );
        }
      }
      if (row.usage !== undefined) {
        let usageSeen = 0;
        for (const field of [
          'inputTokens',
          'cachedInputTokens',
          'cacheWriteTokens',
          'outputTokens',
        ] as const) {
          const count = row.usage[field];
          if (count !== undefined) {
            assertTokenCount(where, `usage.${field}`, count);
            usageSeen += 1;
          }
        }
        // The same rule for token claims (RV1201): `usage: {}` must
        // never count as settlement-grade evidence.
        if (usageSeen === 0) {
          throw new ConfigError(
            `statement reconciliation refused: ${where} declares usage with no token ` +
              'counts; an empty object is not evidence: drop the field or export the counts',
          );
        }
      }
      byId.set(row.responseId, row);
      if (row.usd !== undefined || row.componentsUsd !== undefined || row.usage !== undefined) {
        carriesAnything = true;
      }
    }
    if (!carriesAnything) {
      throw new ConfigError(
        'statement reconciliation refused: no export row carries dollars, components, or ' +
          'usage; there is nothing to reconcile against',
      );
    }
    const matched: InvoiceRow[] = [];
    const matchedStatement = new Set<string>();
    // Segment ids of PARTIALLY delivered multi-wire dispatches (RV905):
    // they matched our dispatch's segment set, so they are incomplete
    // coverage, never foreign statement rows; the dispatch itself reads
    // unmatched and the verdict partial-coverage.
    const partialSegmentIds = new Set<string>();
    for (const row of billable) {
      // A dispatch that absorbed provider-side continuations carries
      // every segment's response id (RV905) and joins all-or-nothing:
      // comparing a partial segment subset against the whole dispatch
      // would manufacture divergence out of incomplete delivery.
      const rowIds =
        row.wireResponseIds !== undefined && row.wireResponseIds.length > 0
          ? row.wireResponseIds
          : row.responseId === undefined
            ? []
            : [row.responseId];
      const hits = rowIds
        .map((id) => byId.get(id))
        .filter((hit): hit is StatementRequestRow => hit !== undefined);
      if (rowIds.length === 0 || hits.length !== rowIds.length) {
        unmatchedRows += 1;
        if (row.responseId !== undefined && unmatchedIdSample.length < SAMPLE_CAP) {
          unmatchedIdSample.push(row.responseId);
        }
        for (const hit of hits) {
          partialSegmentIds.add(hit.responseId);
          partialOverlap = true;
        }
        continue;
      }
      for (const hit of hits) {
        matchedStatement.add(hit.responseId);
      }
      matched.push(row);
      // Token comparison where the export carries counts: ours are the
      // provider's own reported numbers, so a disagreement means the
      // export and the wire disagree and is worth naming. A multi-wire
      // dispatch compares each field as the SUM over its segments, and
      // only fields every segment reports are comparable (a partial
      // per-segment field cannot sum to a claim).
      if (hits.length > 0 && hits.every((hit) => hit.usage !== undefined)) {
        const fields: Array<
          ['inputTokens' | 'cachedInputTokens' | 'cacheWriteTokens' | 'outputTokens', number]
        > = [
          ['inputTokens', row.usage.inputTokens],
          ['cachedInputTokens', row.usage.cacheReadTokens],
          ['cacheWriteTokens', row.usage.cacheWriteTokens],
          ['outputTokens', row.usage.outputTokens],
        ];
        for (const [field, ours] of fields) {
          let sum = 0;
          let present = 0;
          for (const hit of hits) {
            const value = hit.usage?.[field];
            if (value !== undefined) {
              sum += value;
              present += 1;
            }
          }
          if (present === hits.length && sum !== ours) {
            tokenMismatches += 1;
            if (tokenMismatchSample.length < SAMPLE_CAP) {
              tokenMismatchSample.push({
                responseId: row.responseId ?? rowIds[0] ?? '',
                field,
                ours,
                statement: sum,
              });
            }
          }
        }
      }
    }
    for (const row of statement.rows) {
      if (!matchedStatement.has(row.responseId) && !partialSegmentIds.has(row.responseId)) {
        statementOnlyRows += 1;
        if (statementOnlyIdSample.length < SAMPLE_CAP) {
          statementOnlyIdSample.push(row.responseId);
        }
      }
    }
    covered = matched;
    matchedRows = matched.length;
    let totalSeen = false;
    let total = 0;
    statementComponents = new Map();
    for (const row of statement.rows) {
      if (!matchedStatement.has(row.responseId)) {
        continue;
      }
      matchedStatementRows += 1;
      if (row.usd !== undefined) {
        matchedUsdRows += 1;
        totalSeen = true;
        total += row.usd;
      }
      if (row.componentsUsd !== undefined) {
        const model = row.model ?? '';
        const sums = statementComponents.get(model) ?? {};
        for (const component of COMPONENTS) {
          const usd = row.componentsUsd[component];
          if (usd !== undefined) {
            sums[component] = (sums[component] ?? 0) + usd;
          }
        }
        statementComponents.set(model, sums);
      }
    }
    if (totalSeen) {
      statementTotalUsd = total;
    }
    if (statementComponents.size === 0) {
      statementComponents = undefined;
    }
  } else {
    statementComponents = new Map();
    let total = 0;
    for (const row of statement.rows) {
      assertStatementUsd(`category row '${row.model}' ${row.component}`, 'usd', row.usd);
      const sums = statementComponents.get(row.model) ?? {};
      sums[row.component] = (sums[row.component] ?? 0) + row.usd;
      statementComponents.set(row.model, sums);
      total += row.usd;
    }
    statementTotalUsd = total;
    matchedRows = billable.length;
  }

  // Our side: per-model component sums over the covered rows, from the
  // SAME decomposition the settled fold prices with.
  const ourByModel = new Map<string, ComponentSums>();
  const unpricedModels = new Set<string>();
  let ourUsd = 0;
  for (const row of covered) {
    const model = modelOf(row.servedBy);
    const pricing = options.pricingOf(row.servedBy);
    if (pricing === undefined) {
      unpricedModels.add(model);
      continue;
    }
    const parts = priceComponentsOf(pricing, row.usage);
    const sums = ourByModel.get(model) ?? emptySums();
    const byName: Array<[BillingComponent, { tokens: number; usd: number }]> = [
      ['input', parts.input],
      ['cached-input', parts.cachedInput],
      ['cache-write', parts.cacheWrite],
      ['output', parts.output],
    ];
    for (const [component, part] of byName) {
      sums.tokens[component] += part.tokens;
      sums.usd[component] += part.usd;
    }
    ourByModel.set(model, sums);
  }
  for (const sums of ourByModel.values()) {
    for (const component of COMPONENTS) {
      ourUsd += sums.usd[component];
    }
  }

  // Statement-only models (categories mode): spend on models the
  // invoice has no priced rows for.
  if (statement.kind === 'categories') {
    for (const model of statementComponents?.keys() ?? []) {
      if (!ourByModel.has(model) && !unpricedModels.has(model)) {
        statementOnlyRows += 1;
        if (statementOnlyIdSample.length < SAMPLE_CAP) {
          statementOnlyIdSample.push(model);
        }
      }
    }
  }

  // The component lines. In requests mode an export without model names
  // lands its components under '' and is compared against our sums
  // aggregated the same way.
  const components: ComponentDelta[] = [];
  const modelless = statement.kind === 'requests' && statementComponents?.has('') === true;
  const ourLines: Map<string, ComponentSums> = modelless
    ? new Map([
        [
          '',
          [...ourByModel.values()].reduce((acc, sums) => {
            for (const component of COMPONENTS) {
              acc.tokens[component] += sums.tokens[component];
              acc.usd[component] += sums.usd[component];
            }
            return acc;
          }, emptySums()),
        ],
      ])
    : ourByModel;
  for (const model of [...ourLines.keys()].sort()) {
    const sums = ourLines.get(model);
    if (sums === undefined) {
      continue;
    }
    for (const component of COMPONENTS) {
      const ourTokens = sums.tokens[component];
      const ours = sums.usd[component];
      const statementUsd = statementComponents?.get(model)?.[component];
      const line: ComponentDelta = {
        model,
        component,
        ourTokens,
        ourUsd: ours,
        divergent: false,
      };
      if (statementUsd !== undefined) {
        line.statementUsd = statementUsd;
        line.deltaUsd = statementUsd - ours;
        line.divergent = Math.abs(line.deltaUsd) > componentToleranceUsd;
      }
      if (ourTokens > 0) {
        line.effectiveUsdPerMTok = ours / (ourTokens / 1_000_000);
        if (statementUsd !== undefined) {
          line.impliedUsdPerMTok = statementUsd / (ourTokens / 1_000_000);
        }
      }
      components.push(line);
    }
  }
  const divergent = components
    .filter((line) => line.divergent)
    .sort((a, b) => Math.abs(b.deltaUsd ?? 0) - Math.abs(a.deltaUsd ?? 0));

  const totalsDelta = statementTotalUsd === undefined ? undefined : statementTotalUsd - ourUsd;
  // The totals comparison decides only when both sides' dollar claims
  // cover the SAME set: in requests mode every matched export row
  // carries usd, in categories mode every component line is claimed
  // with nothing statement-only, and no covered model is unpriced.
  // Anything less compares different scopes and would manufacture
  // divergence out of partial delivery, which the coverage machinery
  // already names honestly.
  const totalsComparable =
    unpricedModels.size === 0 &&
    (statement.kind === 'requests'
      ? matchedUsdRows === matchedStatementRows
      : statementOnlyRows === 0 && components.every((line) => line.statementUsd !== undefined));
  // Presence of a component split no longer suppresses the comparison
  // (RV1005): a total and a split that describe different dollars are
  // exactly the divergence to NAME, and before this check an export
  // could carry any total beside agreeing components and read 'match'.
  const totalsDivergent =
    totalsComparable && totalsDelta !== undefined && Math.abs(totalsDelta) > totalToleranceUsd;

  const coverageComplete =
    unmatchedRows === 0 &&
    statementOnlyRows === 0 &&
    unpricedModels.size === 0 &&
    (statement.kind === 'categories' ||
      (matchedRows === rowsWithResponseId && rowsWithResponseId === billable.length)) &&
    (statement.kind === 'requests' || components.every((line) => line.statementUsd !== undefined));

  // Token disagreements decide the verdict by default (RV903): a
  // mismatch is only ever counted on a MATCHED row, so this can never
  // shadow a no-overlap report.
  const tokensDivergent = tokenComparison === 'verdict' && tokenMismatches > 0;

  let verdict: StatementReconciliation['verdict'];
  if (divergent.length > 0 || totalsDivergent || tokensDivergent) {
    verdict = 'divergence';
  } else if (matchedRows === 0 && !partialOverlap) {
    verdict = 'no-overlap';
  } else if (!coverageComplete) {
    verdict = 'partial-coverage';
  } else {
    verdict = 'match';
  }

  return {
    mode: statement.kind,
    coverage: {
      billableRows: billable.length,
      rowsWithResponseId,
      matchedRows,
      unmatchedRows,
      unmatchedIdSample,
      statementOnlyRows,
      statementOnlyIdSample,
      complete: coverageComplete,
    },
    totals: {
      ourUsd,
      ...(statementTotalUsd === undefined ? {} : { statementUsd: statementTotalUsd }),
      ...(totalsDelta === undefined ? {} : { deltaUsd: totalsDelta }),
    },
    components,
    divergent,
    tokenMismatches,
    tokenMismatchSample,
    unpricedModels: [...unpricedModels].sort(),
    usageUnknownRows,
    componentToleranceUsd,
    verdict,
    settleable:
      verdict === 'match' &&
      coverageComplete &&
      usageUnknownRows === 0 &&
      unpricedModels.size === 0,
  };
}

/**
 * Column mapping for {@link statementFromRows}: each field names the
 * KEY in the caller's raw rows that carries the value. Provider export
 * formats change without notice and differ per tenant surface (CSV
 * headers, JSON field names, locale-shaped numbers), so this module
 * deliberately ships NO per-provider schema knowledge: the caller
 * states the mapping in one place and the normalizer applies one
 * fail-closed validation to whatever the export actually contained,
 * naming the row and the column of anything that cannot be evidence.
 */
export interface StatementColumnMap {
  /** Key of the provider response id; required for `kind: 'requests'`. */
  responseId?: string;
  /** Key of the provider-side model name. */
  model?: string;
  /** Key of the row's billed dollars; for `kind: 'categories'` required. */
  usd?: string;
  /** Key of the billing component name; required for `kind: 'categories'`. */
  component?: string;
  /** Keys of the provider-reported token counts. */
  inputTokens?: string;
  cachedInputTokens?: string;
  cacheWriteTokens?: string;
  outputTokens?: string;
  /** Keys of a per-component dollar split, one column per component. */
  componentsUsd?: Partial<Record<BillingComponent, string>>;
}

/** A cell that is absent by export convention: missing, null, or ''. */
const absentCell = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

const stringAt = (
  row: Record<string, unknown>,
  column: string,
  rowIndex: number,
): string | undefined => {
  const value = row[column];
  if (absentCell(value)) {
    return undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ConfigError(
      `statement row ${String(rowIndex)} column '${column}' must be a non-empty string, ` +
        `got ${JSON.stringify(value)}`,
    );
  }
  return value.trim();
};

const dollarsAt = (
  row: Record<string, unknown>,
  column: string,
  rowIndex: number,
): number | undefined => {
  const value = row[column];
  if (absentCell(value)) {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ConfigError(
      `statement row ${String(rowIndex)} column '${column}' must be finite non-negative ` +
        `dollars, got ${JSON.stringify(value)}`,
    );
  }
  return parsed;
};

const tokensAt = (
  row: Record<string, unknown>,
  column: string,
  rowIndex: number,
): number | undefined => {
  const value = row[column];
  if (absentCell(value)) {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ConfigError(
      `statement row ${String(rowIndex)} column '${column}' must be a non-negative integer ` +
        `token count, got ${JSON.stringify(value)}`,
    );
  }
  return parsed;
};

/**
 * Normalizes raw keyed rows (a parsed CSV, a JSON export) into a
 * {@link ProviderStatement} under one explicit {@link StatementColumnMap}
 * (RV1703). Fail-closed at the cell: a mapped column whose value cannot
 * be evidence (a non-numeric dollar figure, a fractional or negative
 * token count, an empty response id, an unknown component name) refuses
 * typed with the row index and column name instead of flowing a NaN or
 * a guess into the reconciliation. Absent cells (missing key, null,
 * empty string) mean "the export does not carry this figure" and simply
 * omit the field; a requests row that ends up carrying no dollars, no
 * component split, and no usage at all is refused, because a row
 * without evidence cannot reconcile anything.
 */
export function statementFromRows(input: {
  kind: 'requests' | 'categories';
  rows: readonly Record<string, unknown>[];
  map: StatementColumnMap;
}): ProviderStatement {
  const { kind, rows, map } = input;
  if (kind === 'categories') {
    for (const key of ['model', 'component', 'usd'] as const) {
      if (map[key] === undefined) {
        throw new ConfigError(`statementFromRows kind 'categories' requires map.${key}`);
      }
    }
    const out: StatementCategoryRow[] = rows.map((row, index) => {
      const model = stringAt(row, map.model as string, index);
      const componentRaw = stringAt(row, map.component as string, index);
      const usd = dollarsAt(row, map.usd as string, index);
      if (model === undefined || componentRaw === undefined || usd === undefined) {
        throw new ConfigError(
          `statement row ${String(index)} must carry model, component, and usd for a ` +
            'categories statement',
        );
      }
      const component = COMPONENTS.find((name) => name === componentRaw);
      if (component === undefined) {
        throw new ConfigError(
          `statement row ${String(index)} names unknown component ` +
            `'${componentRaw}'; expected one of ${COMPONENTS.join(', ')}`,
        );
      }
      return { model, component, usd };
    });
    return { kind: 'categories', rows: out };
  }
  if (map.responseId === undefined) {
    throw new ConfigError("statementFromRows kind 'requests' requires map.responseId");
  }
  const out: StatementRequestRow[] = rows.map((row, index) => {
    const responseId = stringAt(row, map.responseId as string, index);
    if (responseId === undefined) {
      throw new ConfigError(
        `statement row ${String(index)} carries no response id in column ` +
          `'${map.responseId as string}', the join key`,
      );
    }
    const model = map.model === undefined ? undefined : stringAt(row, map.model, index);
    const usd = map.usd === undefined ? undefined : dollarsAt(row, map.usd, index);
    let componentsUsd: Partial<Record<BillingComponent, number>> | undefined;
    if (map.componentsUsd !== undefined) {
      for (const component of COMPONENTS) {
        const column = map.componentsUsd[component];
        if (column === undefined) continue;
        const cell = dollarsAt(row, column, index);
        if (cell === undefined) continue;
        componentsUsd = { ...(componentsUsd ?? {}), [component]: cell };
      }
    }
    const usage: StatementRequestRow['usage'] = {};
    const tokenColumns = [
      ['inputTokens', map.inputTokens],
      ['cachedInputTokens', map.cachedInputTokens],
      ['cacheWriteTokens', map.cacheWriteTokens],
      ['outputTokens', map.outputTokens],
    ] as const;
    let usageSeen = false;
    for (const [field, column] of tokenColumns) {
      if (column === undefined) continue;
      const cell = tokensAt(row, column, index);
      if (cell === undefined) continue;
      usage[field] = cell;
      usageSeen = true;
    }
    if (usd === undefined && componentsUsd === undefined && !usageSeen) {
      throw new ConfigError(
        `statement row ${String(index)} ('${responseId}') carries no dollars, no component ` +
          'split, and no usage under the given map; a row without evidence cannot reconcile',
      );
    }
    return {
      responseId,
      ...(model === undefined ? {} : { model }),
      ...(usd === undefined ? {} : { usd }),
      ...(componentsUsd === undefined ? {} : { componentsUsd }),
      ...(usageSeen ? { usage } : {}),
    };
  });
  return { kind: 'requests', rows: out };
}
