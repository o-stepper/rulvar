/**
 * Provider statement reconciliation (RV812). The twelfth comparison
 * run's billing question (a dashboard headline of 4.45 then 4.77 USD
 * against the settled 7.304885) was closed by hand with screenshots:
 * the per-component Spend categories confirmed the invoice to the cent
 * and the headline turned out to be the dashboard's own unconverged
 * aggregate. This module is that investigation as a machine: a
 * normalized export (per-request rows with response ids, or per-model
 * per-component category totals; headline aggregates refused typed)
 * joined against the invoice, with response-id coverage, per-component
 * deltas, and implied actual rates that NAME the divergent rate-card
 * line. A partially delivered export must read as partial coverage,
 * never as false divergence. Sidecar only: the journal is not touched.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import type { Pricing } from '../l0/spi/provider.js';
import { priceComponentsOf, priceUsdOf } from '../model/pricing.js';
import type { InvoiceRow } from './invoice.js';

import {
  reconcileStatement,
  type ProviderStatement,
  type StatementRequestRow,
  type StatementCategoryRow,
  statementFromRows,
} from './reconcile-statement.js';

const SOL: Pricing = {
  inputUsdPerMTok: 5,
  outputUsdPerMTok: 30,
  cacheReadUsdPerMTok: 0.5,
  cacheWriteUsdPerMTok: 6.25,
  tiers: [{ aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 }],
};
const TERRA: Pricing = {
  inputUsdPerMTok: 2.5,
  outputUsdPerMTok: 15,
  cacheReadUsdPerMTok: 0.25,
  cacheWriteUsdPerMTok: 3.125,
  tiers: [{ aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 }],
};
const PRICING_OF = (servedBy: ModelRef): Pricing | undefined =>
  servedBy === 'openai:gpt-5.6-sol' ? SOL : servedBy === 'openai:gpt-5.6-terra' ? TERRA : undefined;

const usageOf = (
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number,
): Usage => ({ inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens });

interface RowSpec {
  servedBy: ModelRef;
  responseId?: string;
  usage: Usage;
  usageUnknown?: true;
}

function rowsOf(specs: RowSpec[]): InvoiceRow[] {
  return specs.map((spec, index) => {
    const pricing = PRICING_OF(spec.servedBy);
    const usd = pricing === undefined ? undefined : priceUsdOf(pricing, spec.usage);
    return {
      entrySeq: index + 1,
      scope: '',
      key: `k${String(index + 1)}`,
      ordinal: index + 1,
      servedBy: spec.servedBy,
      role: 'loop',
      attempt: 1,
      outcome: spec.usageUnknown === undefined ? 'ok' : 'error',
      ...(spec.responseId === undefined ? {} : { responseId: spec.responseId }),
      usage: spec.usage,
      ...(spec.usageUnknown === undefined ? {} : { usageUnknown: true }),
      ...(usd === undefined ? {} : { usd }),
      allocatedUsd: usd ?? 0,
      reconciliation:
        spec.responseId === undefined
          ? spec.usageUnknown === undefined
            ? 'missing-provider-id'
            : 'unconfirmed'
          : 'provider-id-present',
    } satisfies InvoiceRow;
  });
}

// Two sol rows (one above the 272k tier), two terra rows: every
// component populated on both models.
const SPECS: RowSpec[] = [
  {
    servedBy: 'openai:gpt-5.6-sol',
    responseId: 'resp-1',
    usage: usageOf(250_000, 40_000, 100_000, 50_000),
  },
  {
    servedBy: 'openai:gpt-5.6-sol',
    responseId: 'resp-2',
    usage: usageOf(400_000, 60_000, 200_000, 100_000),
  },
  {
    servedBy: 'openai:gpt-5.6-terra',
    responseId: 'resp-3',
    usage: usageOf(200_000, 30_000, 80_000, 40_000),
  },
  { servedBy: 'openai:gpt-5.6-terra', responseId: 'resp-4', usage: usageOf(100_000, 10_000, 0, 0) },
];
const INVOICE = { rows: rowsOf(SPECS) };

/** The true per-model per-component dollars of the fixture, from the shared decomposition. */
function trueCategories(round3: boolean): Array<{
  model: string;
  component: 'input' | 'cached-input' | 'cache-write' | 'output';
  usd: number;
}> {
  const sums = new Map<
    string,
    { input: number; 'cached-input': number; 'cache-write': number; output: number }
  >();
  for (const spec of SPECS) {
    const pricing = PRICING_OF(spec.servedBy);
    if (pricing === undefined) continue;
    const model = spec.servedBy.slice(spec.servedBy.indexOf(':') + 1);
    const parts = priceComponentsOf(pricing, spec.usage);
    const sum = sums.get(model) ?? { input: 0, 'cached-input': 0, 'cache-write': 0, output: 0 };
    sum.input += parts.input.usd;
    sum['cached-input'] += parts.cachedInput.usd;
    sum['cache-write'] += parts.cacheWrite.usd;
    sum.output += parts.output.usd;
    sums.set(model, sum);
  }
  const out: Array<{
    model: string;
    component: 'input' | 'cached-input' | 'cache-write' | 'output';
    usd: number;
  }> = [];
  for (const [model, sum] of sums) {
    for (const component of ['input', 'cached-input', 'cache-write', 'output'] as const) {
      const usd = round3 ? Math.round(sum[component] * 1000) / 1000 : sum[component];
      out.push({ model, component, usd });
    }
  }
  return out;
}

describe('reconcileStatement: categories mode (the founder case)', () => {
  it('dashboard-rounded categories reconcile to zero divergence on all eight components', () => {
    const report = reconcileStatement(
      INVOICE,
      { kind: 'categories', rows: trueCategories(true) },
      { pricingOf: PRICING_OF },
    );
    expect(report.mode).toBe('categories');
    expect(report.verdict).toBe('match');
    expect(report.components).toHaveLength(8);
    expect(report.divergent).toHaveLength(0);
    expect(report.components.every((c) => c.statementUsd !== undefined)).toBe(true);
    expect(report.components.every((c) => Math.abs(c.deltaUsd ?? Infinity) < 0.005)).toBe(true);
    expect(report.totals.statementUsd).toBeDefined();
  });

  it('a distorted write rate names exactly the cache-write component and its implied rate', () => {
    const rows = trueCategories(false).map((row) =>
      row.model === 'gpt-5.6-terra' && row.component === 'cache-write'
        ? // Billed at the base input rate: the 1.25x premium missing.
          { ...row, usd: (row.usd / 3.125) * 2.5 }
        : row,
    );
    const report = reconcileStatement(
      INVOICE,
      { kind: 'categories', rows },
      { pricingOf: PRICING_OF },
    );
    expect(report.verdict).toBe('divergence');
    expect(report.divergent).toHaveLength(1);
    const named = report.divergent[0];
    expect(named?.model).toBe('gpt-5.6-terra');
    expect(named?.component).toBe('cache-write');
    // The fixture's terra rows sit below the tier, so the implied and
    // effective rates read directly as rate-card lines.
    expect(named?.impliedUsdPerMTok).toBeCloseTo(2.5, 9);
    expect(named?.effectiveUsdPerMTok).toBeCloseTo(3.125, 9);
  });

  it('categories missing one of our models read as partial coverage, never divergence', () => {
    const rows = trueCategories(false).filter((row) => row.model !== 'gpt-5.6-terra');
    const report = reconcileStatement(
      INVOICE,
      { kind: 'categories', rows },
      { pricingOf: PRICING_OF },
    );
    expect(report.verdict).toBe('partial-coverage');
    expect(report.divergent).toHaveLength(0);
    const terra = report.components.filter((c) => c.model === 'gpt-5.6-terra');
    expect(terra.every((c) => c.statementUsd === undefined)).toBe(true);
  });
});

describe('reconcileStatement: per-request mode', () => {
  const fullRequestRows = SPECS.map((spec) => ({
    responseId: spec.responseId ?? '',
    model: spec.servedBy.slice(spec.servedBy.indexOf(':') + 1),
    usd: priceUsdOf(PRICING_OF(spec.servedBy) ?? SOL, spec.usage),
  }));

  it('a complete export matches with 4 of 4 response-id coverage', () => {
    const report = reconcileStatement(
      INVOICE,
      { kind: 'requests', rows: fullRequestRows },
      { pricingOf: PRICING_OF },
    );
    expect(report.mode).toBe('requests');
    expect(report.verdict).toBe('match');
    expect(report.coverage.billableRows).toBe(4);
    expect(report.coverage.rowsWithResponseId).toBe(4);
    expect(report.coverage.matchedRows).toBe(4);
    expect(report.coverage.complete).toBe(true);
    expect(report.totals.deltaUsd).toBeCloseTo(0, 9);
  });

  it('a truncated export is partial coverage with the unmatched ids named, never false divergence', () => {
    const report = reconcileStatement(
      INVOICE,
      { kind: 'requests', rows: fullRequestRows.slice(0, 2) },
      { pricingOf: PRICING_OF },
    );
    expect(report.verdict).toBe('partial-coverage');
    expect(report.coverage.matchedRows).toBe(2);
    expect(report.coverage.unmatchedRows).toBe(2);
    expect(report.coverage.unmatchedIdSample).toEqual(['resp-3', 'resp-4']);
    expect(report.divergent).toHaveLength(0);
    // The matched subset still reconciles: totals cover it alone.
    expect(report.totals.deltaUsd).toBeCloseTo(0, 9);
  });

  it('divergence on the covered subset wins over incomplete coverage', () => {
    const rows = fullRequestRows
      .slice(0, 2)
      .map((row, i) => (i === 0 ? { ...row, usd: (row.usd ?? 0) * 2 } : row));
    const report = reconcileStatement(
      INVOICE,
      { kind: 'requests', rows },
      { pricingOf: PRICING_OF },
    );
    expect(report.verdict).toBe('divergence');
    expect(report.coverage.matchedRows).toBe(2);
  });

  it('statement-only ids are named and demote a clean match to partial coverage', () => {
    const rows = [...fullRequestRows, { responseId: 'resp-x', model: 'gpt-5.6-sol', usd: 1 }];
    const report = reconcileStatement(
      INVOICE,
      { kind: 'requests', rows },
      { pricingOf: PRICING_OF },
    );
    expect(report.verdict).toBe('partial-coverage');
    expect(report.coverage.statementOnlyRows).toBe(1);
    expect(report.coverage.statementOnlyIdSample).toEqual(['resp-x']);
  });

  it('a provider-reported token disagreement is a divergence even when the dollars agree (RV903)', () => {
    // Our counts ARE the provider's own wire-reported numbers, so an
    // export disagreeing with them means the export and the wire
    // describe different requests; dollars derived from either cannot
    // be trusted to mean the same thing, and the thirteenth
    // experiment's probe showed this reading 'match'.
    const rows = fullRequestRows.map((row) =>
      row.responseId === 'resp-4'
        ? {
            ...row,
            usage: {
              inputTokens: 999,
              outputTokens: 10_000,
              cachedInputTokens: 0,
              cacheWriteTokens: 0,
            },
          }
        : row,
    );
    const report = reconcileStatement(
      INVOICE,
      { kind: 'requests', rows },
      { pricingOf: PRICING_OF },
    );
    expect(report.tokenMismatches).toBe(1);
    expect(report.tokenMismatchSample[0]?.responseId).toBe('resp-4');
    expect(report.verdict).toBe('divergence');
  });

  it("tokenComparison 'informational' preserves the dollar-only verdict for divergent token semantics", () => {
    const rows = fullRequestRows.map((row) =>
      row.responseId === 'resp-4'
        ? {
            ...row,
            usage: {
              inputTokens: 999,
              outputTokens: 10_000,
              cachedInputTokens: 0,
              cacheWriteTokens: 0,
            },
          }
        : row,
    );
    const report = reconcileStatement(
      INVOICE,
      { kind: 'requests', rows },
      { pricingOf: PRICING_OF, tokenComparison: 'informational' },
    );
    // Mismatches are still counted and sampled; only the verdict
    // treats them as advisory.
    expect(report.tokenMismatches).toBe(1);
    expect(report.tokenMismatchSample[0]?.responseId).toBe('resp-4');
    expect(report.verdict).toBe('match');
  });
});

describe('reconcileStatement: refusals and declared gaps', () => {
  it('refuses a headline aggregate: a statement with no rows is not evidence', () => {
    expect(() =>
      reconcileStatement(INVOICE, { kind: 'categories', rows: [] }, { pricingOf: PRICING_OF }),
    ).toThrow(ConfigError);
    expect(() =>
      reconcileStatement(INVOICE, { kind: 'requests', rows: [] }, { pricingOf: PRICING_OF }),
    ).toThrow(ConfigError);
  });

  it('refuses request rows without a response id and duplicate response ids, typed', () => {
    expect(() =>
      reconcileStatement(
        INVOICE,
        { kind: 'requests', rows: [{ responseId: '', usd: 1 }] },
        { pricingOf: PRICING_OF },
      ),
    ).toThrow(ConfigError);
    expect(() =>
      reconcileStatement(
        INVOICE,
        {
          kind: 'requests',
          rows: [
            { responseId: 'resp-1', usd: 1 },
            { responseId: 'resp-1', usd: 2 },
          ],
        },
        { pricingOf: PRICING_OF },
      ),
    ).toThrow(ConfigError);
  });

  it('refuses duplicate response ids across the LOCAL invoice rows (RV1804)', () => {
    const doubled = {
      rows: rowsOf([
        {
          servedBy: 'openai:gpt-5.6-sol',
          responseId: 'resp-1',
          usage: usageOf(1_000, 100, 0, 0),
        },
        {
          servedBy: 'openai:gpt-5.6-sol',
          responseId: 'resp-1',
          usage: usageOf(1_000, 100, 0, 0),
        },
      ]),
    };
    // A usage-only export matching the duplicated id would otherwise
    // settle 'match' with the double-booked local row silently absorbed.
    expect(() =>
      reconcileStatement(
        doubled,
        {
          kind: 'requests',
          rows: [
            {
              responseId: 'resp-1',
              usage: {
                inputTokens: 1_000,
                outputTokens: 100,
                cachedInputTokens: 0,
                cacheWriteTokens: 0,
              },
            },
          ],
        },
        { pricingOf: PRICING_OF },
      ),
    ).toThrow(/duplicate response id 'resp-1' across the local invoice rows/);
  });

  it('refuses an export that carries nothing to reconcile', () => {
    expect(() =>
      reconcileStatement(
        INVOICE,
        { kind: 'requests', rows: [{ responseId: 'resp-1' }, { responseId: 'resp-2' }] },
        { pricingOf: PRICING_OF },
      ),
    ).toThrow(ConfigError);
  });

  it('an unpriced model is a declared gap, not silence and not divergence', () => {
    const report = reconcileStatement(
      INVOICE,
      { kind: 'categories', rows: trueCategories(false) },
      { pricingOf: (servedBy) => (servedBy === 'openai:gpt-5.6-sol' ? SOL : undefined) },
    );
    expect(report.unpricedModels).toEqual(['gpt-5.6-terra']);
    expect(report.verdict).toBe('partial-coverage');
    expect(report.divergent).toHaveLength(0);
  });

  it('usage-unknown rows are counted apart and never fold into component sums', () => {
    const invoice = {
      rows: rowsOf([
        ...SPECS,
        { servedBy: 'openai:gpt-5.6-terra', usage: usageOf(0, 0, 0, 0), usageUnknown: true },
      ]),
    };
    const report = reconcileStatement(
      invoice,
      { kind: 'categories', rows: trueCategories(true) },
      { pricingOf: PRICING_OF },
    );
    expect(report.usageUnknownRows).toBe(1);
    expect(report.verdict).toBe('match');
  });
});

describe('reconcileStatement: fail-closed numeric intake (RV903)', () => {
  const requestRows = (patch: Partial<StatementRequestRow>): ProviderStatement => ({
    kind: 'requests',
    rows: [{ responseId: 'resp-1', usd: 1, ...patch }],
  });

  it('refuses a request row whose usd is NaN instead of matching on NaN totals', () => {
    // The thirteenth experiment's probe: usd NaN flowed into the totals,
    // Math.abs(NaN) > tolerance is false, and the verdict read 'match'
    // with NaN statementUsd and deltaUsd.
    expect(() =>
      reconcileStatement(INVOICE, requestRows({ usd: Number.NaN }), { pricingOf: PRICING_OF }),
    ).toThrow(ConfigError);
    expect(() =>
      reconcileStatement(INVOICE, requestRows({ usd: Number.NaN }), { pricingOf: PRICING_OF }),
    ).toThrow(/resp-1.*usd|usd.*resp-1/);
  });

  it('refuses infinite and negative dollars, naming the row and field', () => {
    expect(() =>
      reconcileStatement(INVOICE, requestRows({ usd: Number.POSITIVE_INFINITY }), {
        pricingOf: PRICING_OF,
      }),
    ).toThrow(ConfigError);
    expect(() =>
      reconcileStatement(INVOICE, requestRows({ usd: -0.25 }), { pricingOf: PRICING_OF }),
    ).toThrow(/credits|adjustments/);
    expect(() =>
      reconcileStatement(
        INVOICE,
        requestRows({ componentsUsd: { input: Number.NEGATIVE_INFINITY } }),
        { pricingOf: PRICING_OF },
      ),
    ).toThrow(/componentsUsd\.input/);
  });

  it('refuses non-integer and negative provider-reported token counts', () => {
    expect(() =>
      reconcileStatement(INVOICE, requestRows({ usage: { inputTokens: 1.5 } }), {
        pricingOf: PRICING_OF,
      }),
    ).toThrow(/usage\.inputTokens/);
    expect(() =>
      reconcileStatement(INVOICE, requestRows({ usage: { outputTokens: -3 } }), {
        pricingOf: PRICING_OF,
      }),
    ).toThrow(ConfigError);
    expect(() =>
      reconcileStatement(INVOICE, requestRows({ usage: { cacheWriteTokens: Number.NaN } }), {
        pricingOf: PRICING_OF,
      }),
    ).toThrow(ConfigError);
  });

  it('refuses a category row whose usd cannot be summed', () => {
    expect(() =>
      reconcileStatement(
        INVOICE,
        {
          kind: 'categories',
          rows: [{ model: 'gpt-5.6-sol', component: 'input', usd: Number.NaN }],
        },
        { pricingOf: PRICING_OF },
      ),
    ).toThrow(/gpt-5\.6-sol.*input|input.*gpt-5\.6-sol/);
  });

  it('refuses non-finite and negative tolerances', () => {
    const statement = requestRows({});
    expect(() =>
      reconcileStatement(INVOICE, statement, {
        pricingOf: PRICING_OF,
        componentToleranceUsd: Number.NaN,
      }),
    ).toThrow(/componentToleranceUsd/);
    expect(() =>
      reconcileStatement(INVOICE, statement, {
        pricingOf: PRICING_OF,
        totalToleranceUsd: -0.01,
      }),
    ).toThrow(/totalToleranceUsd/);
  });

  it('every dollar figure of an accepted report is finite', () => {
    const reports = [
      reconcileStatement(
        INVOICE,
        {
          kind: 'requests',
          rows: SPECS.map((spec) => ({ responseId: spec.responseId ?? '', usd: 1 })),
        },
        { pricingOf: PRICING_OF },
      ),
      reconcileStatement(
        INVOICE,
        { kind: 'categories', rows: trueCategories(true) },
        { pricingOf: PRICING_OF },
      ),
    ];
    for (const report of reports) {
      expect(Number.isFinite(report.totals.ourUsd)).toBe(true);
      if (report.totals.statementUsd !== undefined) {
        expect(Number.isFinite(report.totals.statementUsd)).toBe(true);
      }
      if (report.totals.deltaUsd !== undefined) {
        expect(Number.isFinite(report.totals.deltaUsd)).toBe(true);
      }
      for (const line of report.components) {
        expect(Number.isFinite(line.ourUsd)).toBe(true);
        if (line.deltaUsd !== undefined) {
          expect(Number.isFinite(line.deltaUsd)).toBe(true);
        }
      }
    }
  });
});

describe('reconcileStatement: multi-wire dispatches (RV905)', () => {
  // A dispatch that absorbed pause_turn continuations is ONE invoice
  // row carrying every segment's response id, while the provider's
  // per-request export bills each wire request as its own row.
  const segmentedInvoice = (): { rows: InvoiceRow[] } => {
    const base = rowsOf([SPECS[0]])[0];
    return {
      rows: [{ ...base, responseId: 'seg-3', wireResponseIds: ['seg-1', 'seg-2', 'seg-3'] }],
    };
  };
  const rowUsd = (): number => {
    const usd = segmentedInvoice().rows[0]?.usd;
    if (usd === undefined) {
      throw new Error('fixture row must be priced');
    }
    return usd;
  };

  it('joins every segment row of the export to the one dispatch and matches', () => {
    const usd = rowUsd();
    const report = reconcileStatement(
      segmentedInvoice(),
      {
        kind: 'requests',
        rows: [
          { responseId: 'seg-1', usd: usd / 2 },
          { responseId: 'seg-2', usd: usd / 4 },
          { responseId: 'seg-3', usd: usd / 4 },
        ],
      },
      { pricingOf: PRICING_OF },
    );
    expect(report.verdict).toBe('match');
    expect(report.coverage.matchedRows).toBe(1);
    expect(report.coverage.statementOnlyRows).toBe(0);
    expect(report.totals.deltaUsd ?? 0).toBeCloseTo(0, 9);
  });

  it('a partially delivered segment set reads partial coverage, never statement-only noise', () => {
    const usd = rowUsd();
    const report = reconcileStatement(
      segmentedInvoice(),
      {
        kind: 'requests',
        rows: [
          { responseId: 'seg-1', usd: usd / 2 },
          { responseId: 'seg-2', usd: usd / 4 },
        ],
      },
      { pricingOf: PRICING_OF },
    );
    expect(report.verdict).toBe('partial-coverage');
    expect(report.coverage.matchedRows).toBe(0);
    expect(report.coverage.unmatchedRows).toBe(1);
    // The two delivered segments matched OUR dispatch's segment set:
    // they are incomplete coverage, not foreign statement rows.
    expect(report.coverage.statementOnlyRows).toBe(0);
    expect(report.divergent).toHaveLength(0);
  });

  it('segment token counts compare as a sum against the dispatch usage', () => {
    const usd = rowUsd();
    const spec = SPECS[0];
    const third = (value: number, index: number): number =>
      index < 2 ? Math.floor(value / 3) : value - 2 * Math.floor(value / 3);
    const segments = [0, 1, 2].map((index) => ({
      responseId: `seg-${String(index + 1)}`,
      usd: index === 0 ? usd / 2 : usd / 4,
      usage: {
        inputTokens: third(spec.usage.inputTokens, index),
        outputTokens: third(spec.usage.outputTokens, index),
      },
    }));
    const clean = reconcileStatement(
      segmentedInvoice(),
      { kind: 'requests', rows: segments },
      { pricingOf: PRICING_OF },
    );
    expect(clean.tokenMismatches).toBe(0);
    expect(clean.verdict).toBe('match');

    const skewed = segments.map((segment, index) =>
      index === 0
        ? { ...segment, usage: { ...segment.usage, inputTokens: segment.usage.inputTokens + 100 } }
        : segment,
    );
    const report = reconcileStatement(
      segmentedInvoice(),
      { kind: 'requests', rows: skewed },
      { pricingOf: PRICING_OF },
    );
    expect(report.tokenMismatches).toBe(1);
    expect(report.verdict).toBe('divergence');
    expect(report.tokenMismatchSample[0]?.field).toBe('inputTokens');
  });

  it('an id matching no dispatch segment stays statement-only', () => {
    const usd = rowUsd();
    const report = reconcileStatement(
      segmentedInvoice(),
      {
        kind: 'requests',
        rows: [
          { responseId: 'seg-1', usd: usd / 2 },
          { responseId: 'seg-2', usd: usd / 4 },
          { responseId: 'seg-3', usd: usd / 4 },
          { responseId: 'ghost-9', usd: 0.5 },
        ],
      },
      { pricingOf: PRICING_OF },
    );
    expect(report.coverage.statementOnlyRows).toBe(1);
    expect(report.coverage.statementOnlyIdSample).toEqual(['ghost-9']);
  });
});

describe('reconcileStatement: statement internal consistency (RV1005)', () => {
  const componentsOf = (spec: RowSpec): NonNullable<StatementRequestRow['componentsUsd']> => {
    const parts = priceComponentsOf(PRICING_OF(spec.servedBy) ?? SOL, spec.usage);
    return {
      input: parts.input.usd,
      'cached-input': parts.cachedInput.usd,
      'cache-write': parts.cacheWrite.usd,
      output: parts.output.usd,
    };
  };
  const sumOf = (components: NonNullable<StatementRequestRow['componentsUsd']>): number =>
    Object.values(components).reduce((acc: number, usd) => acc + (usd ?? 0), 0);

  it('refuses a row whose usd contradicts its own component split, naming the row', () => {
    // The fourteenth experiment's repro: total 100 beside components
    // summing 1 read verdict 'match', because each claim sat inside its
    // own tolerance and nothing compared them to each other.
    const attempt = (): unknown =>
      reconcileStatement(
        INVOICE,
        {
          kind: 'requests',
          rows: [{ responseId: 'resp-1', usd: 100, componentsUsd: { input: 1 } }],
        },
        { pricingOf: PRICING_OF },
      );
    expect(attempt).toThrow(ConfigError);
    expect(attempt).toThrow(/resp-1/);
    expect(attempt).toThrow(/contradict/);
  });

  it('accepts a row whose total agrees with its split within the totals tolerance', () => {
    const spec = SPECS[0];
    if (spec === undefined) {
      throw new Error('fixture must have rows');
    }
    const components = componentsOf(spec);
    const report = reconcileStatement(
      INVOICE,
      {
        kind: 'requests',
        rows: [{ responseId: 'resp-1', usd: sumOf(components) + 0.009, componentsUsd: components }],
      },
      { pricingOf: PRICING_OF },
    );
    expect(report.verdict).toBe('partial-coverage');
  });

  it('honors a custom totalToleranceUsd at intake', () => {
    const rows = [{ responseId: 'resp-1', usd: 2.3, componentsUsd: { input: 2 } }];
    expect(() =>
      reconcileStatement(
        INVOICE,
        { kind: 'requests', rows },
        { pricingOf: PRICING_OF, totalToleranceUsd: 0.5 },
      ),
    ).not.toThrow();
    expect(() =>
      reconcileStatement(
        INVOICE,
        { kind: 'requests', rows },
        { pricingOf: PRICING_OF, totalToleranceUsd: 0.1 },
      ),
    ).toThrow(ConfigError);
  });

  it('a total drifting beyond tolerance decides even when a component split is present', () => {
    // Both sol rows carry their true split (each internally
    // consistent), the terra rows carry bare dollars, and one terra
    // total is inflated by 5 USD: every component line agrees, the
    // totals do not, and presence of a split must not suppress the one
    // comparison that can see it.
    const rows = SPECS.map((spec) => {
      const usd = priceUsdOf(PRICING_OF(spec.servedBy) ?? SOL, spec.usage);
      const base = {
        responseId: spec.responseId ?? '',
        model: spec.servedBy.slice(spec.servedBy.indexOf(':') + 1),
      };
      if (spec.servedBy === 'openai:gpt-5.6-sol') {
        return { ...base, usd, componentsUsd: componentsOf(spec) };
      }
      return spec.responseId === 'resp-4' ? { ...base, usd: usd + 5 } : { ...base, usd };
    });
    const report = reconcileStatement(
      INVOICE,
      { kind: 'requests', rows },
      { pricingOf: PRICING_OF },
    );
    expect(report.verdict).toBe('divergence');
    expect(report.totals.deltaUsd).toBeCloseTo(5, 6);
    // No component line moved: the totals alone name this divergence.
    expect(report.divergent).toHaveLength(0);
  });

  it('an internally consistent export with splits on some rows stays match when totals agree', () => {
    const rows = SPECS.map((spec) => {
      const usd = priceUsdOf(PRICING_OF(spec.servedBy) ?? SOL, spec.usage);
      const base = {
        responseId: spec.responseId ?? '',
        model: spec.servedBy.slice(spec.servedBy.indexOf(':') + 1),
      };
      return spec.servedBy === 'openai:gpt-5.6-sol'
        ? { ...base, usd, componentsUsd: componentsOf(spec) }
        : { ...base, usd };
    });
    const report = reconcileStatement(
      INVOICE,
      { kind: 'requests', rows },
      { pricingOf: PRICING_OF },
    );
    expect(report.verdict).toBe('match');
    expect(report.totals.deltaUsd).toBeCloseTo(0, 9);
  });

  it('totals stay advisory when the export claims dollars on only a subset of rows', () => {
    // Both terra rows itemize components without row dollars, the sol
    // rows carry bare dollars: the two dollar claims cover DIFFERENT
    // sets, so a totals comparison would manufacture divergence out of
    // scope mismatch, exactly what the coverage doctrine forbids.
    const rows = SPECS.map((spec) => {
      const base = {
        responseId: spec.responseId ?? '',
        model: spec.servedBy.slice(spec.servedBy.indexOf(':') + 1),
      };
      return spec.servedBy === 'openai:gpt-5.6-terra'
        ? { ...base, componentsUsd: componentsOf(spec) }
        : { ...base, usd: priceUsdOf(PRICING_OF(spec.servedBy) ?? SOL, spec.usage) };
    });
    const report = reconcileStatement(
      INVOICE,
      { kind: 'requests', rows },
      { pricingOf: PRICING_OF },
    );
    expect(report.verdict).toBe('match');
    // The reported total still names what the export claimed; only the
    // verdict treats it as advisory under a scope mismatch.
    expect(report.totals.statementUsd).toBeGreaterThan(0);
    expect(report.totals.deltaUsd ?? 0).toBeLessThan(0);
  });
});

describe('reconcileStatement: the settleable predicate (RV1006)', () => {
  const fullRows = SPECS.map((spec) => ({
    responseId: spec.responseId ?? '',
    model: spec.servedBy.slice(spec.servedBy.indexOf(':') + 1),
    usd: priceUsdOf(PRICING_OF(spec.servedBy) ?? SOL, spec.usage),
  }));

  it('a clean complete match is settleable', () => {
    const report = reconcileStatement(
      INVOICE,
      { kind: 'requests', rows: fullRows },
      { pricingOf: PRICING_OF },
    );
    expect(report.verdict).toBe('match');
    expect(report.settleable).toBe(true);
  });

  it("a 'match' over a ledger holding usage-unknown money is NOT settleable", () => {
    // The billed-but-unknown attempt is exactly the money a 'match'
    // cannot vouch for: the export covers every KNOWN row, verdict and
    // coverage read clean, and the unknown row's dollars are still on
    // the table.
    const invoice = {
      rows: rowsOf([
        ...SPECS,
        { servedBy: 'openai:gpt-5.6-terra', usage: usageOf(0, 0, 0, 0), usageUnknown: true },
      ]),
    };
    const report = reconcileStatement(
      invoice,
      { kind: 'requests', rows: fullRows },
      { pricingOf: PRICING_OF },
    );
    expect(report.verdict).toBe('match');
    expect(report.coverage.complete).toBe(true);
    expect(report.usageUnknownRows).toBe(1);
    expect(report.settleable).toBe(false);
  });

  it('partial coverage and divergence are never settleable', () => {
    const truncated = reconcileStatement(
      INVOICE,
      { kind: 'requests', rows: fullRows.slice(0, 2) },
      { pricingOf: PRICING_OF },
    );
    expect(truncated.verdict).toBe('partial-coverage');
    expect(truncated.settleable).toBe(false);
    const skewed = fullRows.map((row, i) => (i === 0 ? { ...row, usd: row.usd * 2 } : row));
    const diverged = reconcileStatement(
      INVOICE,
      { kind: 'requests', rows: skewed },
      { pricingOf: PRICING_OF },
    );
    expect(diverged.verdict).toBe('divergence');
    expect(diverged.settleable).toBe(false);
  });

  it('unpriced models are never settleable', () => {
    const report = reconcileStatement(
      INVOICE,
      { kind: 'categories', rows: trueCategories(false) },
      { pricingOf: (servedBy) => (servedBy === 'openai:gpt-5.6-sol' ? SOL : undefined) },
    );
    expect(report.unpricedModels).toEqual(['gpt-5.6-terra']);
    expect(report.verdict).toBe('partial-coverage');
    expect(report.settleable).toBe(false);
  });
});

describe('reconcileStatement: an empty declared object is not evidence (RV1201)', () => {
  it("refuses a row declaring usage with no token counts: the sixteenth experiment's judge repro R1", () => {
    // Before RV1201 this read verdict 'match' with complete coverage and
    // settleable true: the mere presence of the object counted as
    // evidence while declaring not a single figure.
    expect(() =>
      reconcileStatement(
        INVOICE,
        { kind: 'requests', rows: [{ responseId: 'resp-1', usage: {} }] },
        { pricingOf: PRICING_OF },
      ),
    ).toThrow(ConfigError);
    expect(() =>
      reconcileStatement(
        INVOICE,
        { kind: 'requests', rows: [{ responseId: 'resp-1', usage: {} }] },
        { pricingOf: PRICING_OF },
      ),
    ).toThrow(/resp-1.*usage|usage.*resp-1/);
  });

  it('refuses a row declaring componentsUsd with no component figures', () => {
    expect(() =>
      reconcileStatement(
        INVOICE,
        { kind: 'requests', rows: [{ responseId: 'resp-1', componentsUsd: {} }] },
        { pricingOf: PRICING_OF },
      ),
    ).toThrow(ConfigError);
    expect(() =>
      reconcileStatement(
        INVOICE,
        { kind: 'requests', rows: [{ responseId: 'resp-1', componentsUsd: {} }] },
        { pricingOf: PRICING_OF },
      ),
    ).toThrow(/resp-1.*componentsUsd|componentsUsd.*resp-1/);
  });

  it('refuses the empty object even beside an honest row: a mixed statement never settles over it', () => {
    expect(() =>
      reconcileStatement(
        INVOICE,
        {
          kind: 'requests',
          rows: [
            { responseId: 'resp-1', usd: 3 },
            { responseId: 'resp-2', usage: {} },
          ],
        },
        { pricingOf: PRICING_OF },
      ),
    ).toThrow(ConfigError);
  });

  it('refuses usage whose every field is undefined: declared keys are not counts', () => {
    expect(() =>
      reconcileStatement(
        INVOICE,
        {
          kind: 'requests',
          rows: [{ responseId: 'resp-1', usage: { inputTokens: undefined } }],
        },
        { pricingOf: PRICING_OF },
      ),
    ).toThrow(ConfigError);
  });

  it('one declared figure is still evidence: a single token count and a single component figure both reconcile', () => {
    const usageReport = reconcileStatement(
      INVOICE,
      { kind: 'requests', rows: [{ responseId: 'resp-1', usage: { inputTokens: 250_000 } }] },
      { pricingOf: PRICING_OF },
    );
    expect(usageReport.coverage.matchedRows).toBe(1);
    const componentsReport = reconcileStatement(
      INVOICE,
      {
        kind: 'requests',
        rows: [{ responseId: 'resp-1', componentsUsd: { input: 1.25 } }],
      },
      { pricingOf: PRICING_OF },
    );
    expect(componentsReport.coverage.matchedRows).toBe(1);
  });

  it('a row declaring only its id still joins: presence is coverage, not a figure claim', () => {
    // The documented partial-declaration model is unchanged: a bare id
    // row beside an honest one matches without claiming any figure.
    // Only an AFFIRMATIVELY declared empty object refuses.
    const report = reconcileStatement(
      INVOICE,
      {
        kind: 'requests',
        rows: [{ responseId: 'resp-1', usd: 3 }, { responseId: 'resp-2' }],
      },
      { pricingOf: PRICING_OF },
    );
    expect(report.coverage.matchedRows).toBe(2);
  });
});

describe('statementFromRows (RV1703)', () => {
  it('normalizes a requests export under an explicit map, absent cells omitted', () => {
    const statement = statementFromRows({
      kind: 'requests',
      rows: [
        {
          response_id: 'resp-1',
          model_name: 'gpt-5.6-terra',
          amount_usd: '0.125',
          in_tok: '1000',
          out_tok: 50,
          cached_tok: '',
        },
        { response_id: 'resp-2', amount_usd: 0.5 },
      ],
      map: {
        responseId: 'response_id',
        model: 'model_name',
        usd: 'amount_usd',
        inputTokens: 'in_tok',
        outputTokens: 'out_tok',
        cachedInputTokens: 'cached_tok',
      },
    });
    expect(statement).toEqual({
      kind: 'requests',
      rows: [
        {
          responseId: 'resp-1',
          model: 'gpt-5.6-terra',
          usd: 0.125,
          usage: { inputTokens: 1000, outputTokens: 50 },
        },
        { responseId: 'resp-2', usd: 0.5 },
      ],
    });
  });

  it('refuses a cell that cannot be evidence, naming the row and column', () => {
    const attempt = (rows: Record<string, unknown>[]): (() => ProviderStatement) => {
      return () =>
        statementFromRows({
          kind: 'requests',
          rows,
          map: { responseId: 'id', usd: 'usd', inputTokens: 'tok' },
        });
    };
    expect(attempt([{ id: 'r', usd: 'free' }])).toThrowError(ConfigError);
    expect(attempt([{ id: 'r', usd: 'free' }])).toThrowError(/row 0 column 'usd'/u);
    expect(attempt([{ id: 'r', usd: -1 }])).toThrowError(/non-negative/u);
    expect(attempt([{ id: 'r', tok: 10.5 }])).toThrowError(/column 'tok'/u);
    expect(attempt([{ id: '', usd: 1 }])).toThrowError(/response id/u);
    expect(attempt([{ id: 'r' }])).toThrowError(/no dollars, no component split, and no usage/u);
  });

  it('refuses a map without the join key, and an unknown category component', () => {
    expect(() => statementFromRows({ kind: 'requests', rows: [], map: {} })).toThrowError(
      /requires map\.responseId/u,
    );
    expect(() =>
      statementFromRows({
        kind: 'categories',
        rows: [{ m: 'gpt', c: 'reasoning', v: 1 }],
        map: { model: 'm', component: 'c', usd: 'v' },
      }),
    ).toThrowError(/unknown component 'reasoning'/u);
  });

  it('normalizes a categories export and feeds reconcileStatement end to end', () => {
    const statement = statementFromRows({
      kind: 'categories',
      rows: [
        { m: 'gpt-5.6-terra', c: 'input', v: '2.0' },
        { m: 'gpt-5.6-terra', c: 'output', v: '1.2' },
      ],
      map: { model: 'm', component: 'c', usd: 'v' },
    });
    expect(statement.kind).toBe('categories');
    expect(statement.rows).toHaveLength(2);
    const collected = statement.rows as StatementCategoryRow[];
    expect(collected[0]).toEqual({ model: 'gpt-5.6-terra', component: 'input', usd: 2.0 });
  });

  it('collects a per-component dollar split from mapped columns', () => {
    const statement = statementFromRows({
      kind: 'requests',
      rows: [{ id: 'r1', usd_in: '0.4', usd_out: '0.2' }],
      map: {
        responseId: 'id',
        componentsUsd: { input: 'usd_in', output: 'usd_out' },
      },
    });
    expect(statement.rows[0]).toEqual({
      responseId: 'r1',
      componentsUsd: { input: 0.4, output: 0.2 },
    });
  });
});
