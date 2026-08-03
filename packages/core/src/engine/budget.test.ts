/**
 * RunBudget unit level: projected layer-1 admission (the proposed reserve
 * is part of the check, exact fill allowed, atomic across the ancestor
 * chain) and the layer-2b pre-dispatch output bound.
 */
import { describe, expect, it } from 'vitest';

import { BudgetExhaustedError, ConfigError } from '../l0/errors.js';
import type { Pricing } from '../l0/spi/provider.js';
import { affordableOutputTokens } from '../model/pricing.js';
import { RunBudget } from './budget.js';

const PRICED: Pricing = { inputUsdPerMTok: 3, outputUsdPerMTok: 15 };

function pricedBudget(options: {
  ceilingUsd?: number;
  pricing?: Record<string, Pricing>;
}): RunBudget {
  return new RunBudget({
    ...(options.ceilingUsd === undefined ? {} : { ceilingUsd: options.ceilingUsd }),
    pricingOf: (servedBy) => options.pricing?.[servedBy],
  });
}

describe('projected layer-1 admission', () => {
  it('rejects the FIRST spawn when its reserve does not fit the ceiling', () => {
    const budget = new RunBudget({ ceilingUsd: 0.001 });
    expect(() => budget.admitSpawn(0.01)).toThrow(BudgetExhaustedError);
    // Nothing committed, nothing counted.
    expect(budget.committedReserveUsd).toBe(0);
    expect(budget.spent().agentsSpawned).toBe(0);
  });

  it('admits an exact fill and rejects one dollar past it', () => {
    const budget = new RunBudget({ ceilingUsd: 1 });
    budget.admitSpawn(0.6);
    budget.admitSpawn(0.4);
    expect(budget.committedReserveUsd).toBeCloseTo(1, 12);
    // Headroom is exhausted: even a zero reserve is rejected now.
    expect(() => budget.admitSpawn(0)).toThrow(BudgetExhaustedError);
  });

  it('rejects the second of two 0.6 reserves under a 1.0 ceiling', () => {
    const budget = new RunBudget({ ceilingUsd: 1 });
    budget.admitSpawn(0.6);
    expect(() => budget.admitSpawn(0.6)).toThrow(BudgetExhaustedError);
    // The first reserve stays committed; the rejection changed nothing.
    expect(budget.committedReserveUsd).toBeCloseTo(0.6, 12);
    expect(budget.spent().agentsSpawned).toBe(1);
  });

  it('rejects on a sub-account remainder even when the root has room', () => {
    const budget = new RunBudget({ ceilingUsd: 10 });
    budget.openAccount('wf:child:0', { ceilingUsd: 1 });
    budget.admitSpawn(0.8, 'wf:child:0');
    expect(() => budget.admitSpawn(0.3, 'wf:child:0')).toThrow(BudgetExhaustedError);
    // The root still admits directly.
    budget.admitSpawn(0.3);
    expect(budget.committedReserveUsd).toBeCloseTo(1.1, 12);
  });

  it('checks the whole chain before committing anything (atomic rejection)', () => {
    const budget = new RunBudget({ ceilingUsd: 10 });
    budget.openAccount('wf:child:0', { ceilingUsd: 0.5 });
    expect(() => budget.admitSpawn(0.7, 'wf:child:0')).toThrow(BudgetExhaustedError);
    // Neither the child nor the root gained a reserve; no spawn counted.
    expect(budget.accountView('wf:child:0')?.committedReserveUsd).toBe(0);
    expect(budget.committedReserveUsd).toBe(0);
    expect(budget.spent().agentsSpawned).toBe(0);
  });

  it('keeps the finalize reserve untouchable by projected admission', () => {
    const budget = new RunBudget({ ceilingUsd: 1 });
    budget.openAccount('orc:0', { ceilingUsd: 1 });
    budget.commitFinalizeReserve('orc:0', 0.2);
    // 0.85 + the 0.2 finalize reserve would cross the root ceiling.
    expect(() => budget.admitSpawn(0.85)).toThrow(BudgetExhaustedError);
    budget.admitSpawn(0.8);
  });
});

describe('layer 2b: maxAffordableOutputTokens', () => {
  it('derives affordable output from the remaining budget and the output price', () => {
    const budget = pricedBudget({ ceilingUsd: 0.001, pricing: { 'fake:model': PRICED } });
    // 100 input tokens cost 0.0003 USD; the remaining 0.0007 buys
    // floor(0.0007 / 15e-6) = 46 output tokens.
    expect(budget.maxAffordableOutputTokens('fake:model', 100)).toBe(46);
  });

  it('is undefined without a ceiling or without a price row', () => {
    const uncapped = pricedBudget({ pricing: { 'fake:model': PRICED } });
    expect(uncapped.maxAffordableOutputTokens('fake:model', 100)).toBeUndefined();
    const unpriced = pricedBudget({ ceilingUsd: 1 });
    expect(unpriced.maxAffordableOutputTokens('fake:model', 100)).toBeUndefined();
  });

  it('binds to the tightest capped account in the chain', () => {
    const budget = pricedBudget({ ceilingUsd: 10, pricing: { 'fake:model': PRICED } });
    budget.openAccount('wf:child:0', { ceilingUsd: 0.0015 });
    // The child remainder (0.0015) is the binding constraint, not the
    // root's 10: 100 input tokens leave 0.0012, buying 80 output tokens.
    expect(budget.maxAffordableOutputTokens('fake:model', 100, 'wf:child:0')).toBe(80);
  });

  it('goes to zero or below when the estimated prompt alone spends the remainder', () => {
    const budget = pricedBudget({ ceilingUsd: 0.0003, pricing: { 'fake:model': PRICED } });
    const affordable = budget.maxAffordableOutputTokens('fake:model', 200);
    expect(affordable).toBeDefined();
    expect(affordable as number).toBeLessThan(1);
  });
});

describe('affordableOutputTokens (pure)', () => {
  it('applies the tier the estimated prompt lands in to both sides', () => {
    const tiered: Pricing = {
      inputUsdPerMTok: 5,
      outputUsdPerMTok: 30,
      tiers: [{ aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 }],
    };
    // 300k input in the tier: input costs 3 USD at 2x; the remaining
    // 1 USD buys floor(1 / 45e-6) = 22222 output tokens at 1.5x.
    expect(affordableOutputTokens(tiered, 4, 300_000)).toBe(22_222);
    // Below the threshold the base rates apply.
    expect(affordableOutputTokens(tiered, 4, 200_000)).toBe(Math.floor((3 / 30) * 1_000_000));
  });

  it('is undefined for free output (nothing to bound)', () => {
    expect(
      affordableOutputTokens({ inputUsdPerMTok: 0, outputUsdPerMTok: 0 }, 1, 100),
    ).toBeUndefined();
  });
});

describe('exhaustionDiagnostics', () => {
  const usage = { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 };

  it('names the first closed account walking up from the debited scope', () => {
    const budget = new RunBudget({ ceilingUsd: 1, priceUsd: () => 0.25 });
    budget.openAccount('orchestrator', { ceilingUsd: 0.2, kind: 'orchestrator-cap' });
    budget.onUsage(usage, 'fake:model', 'orchestrator');
    const diagnostics = budget.exhaustionDiagnostics('orchestrator');
    expect(diagnostics.crossed).toMatchObject({
      scope: 'orchestrator',
      source: 'orchestrator-cap',
      ceilingUsd: 0.2,
      spentUsd: 0.25,
    });
    // The healthy root rides along so the message can prove it healthy.
    expect(diagnostics.root).toEqual({ ceilingUsd: 1, spentUsd: 0.25 });
  });

  it('classifies plain child accounts and the root crossing distinctly', () => {
    const budget = new RunBudget({ ceilingUsd: 0.5, priceUsd: () => 0.3 });
    budget.openAccount('wf:child:0', { ceilingUsd: 0.25 });
    budget.onUsage(usage, 'fake:model', 'wf:child:0');
    expect(budget.exhaustionDiagnostics('wf:child:0').crossed?.source).toBe('child-account');
    // A second root-only charge closes the root itself.
    budget.onUsage(usage, 'fake:model');
    expect(budget.exhaustionDiagnostics('run').crossed?.source).toBe('root');
  });

  it('counts projected reserves as closure and degrades on unknown scopes', () => {
    const budget = new RunBudget({ ceilingUsd: 1 });
    budget.admitSpawn(1);
    // The error path never throws for an unopened scope: root-only view.
    const diagnostics = budget.exhaustionDiagnostics('never-opened');
    expect(diagnostics.crossed).toMatchObject({
      scope: 'run',
      source: 'root',
      spentUsd: 0,
      committedReserveUsd: 1,
    });
  });

  it('reports no crossing while every ceiling has headroom', () => {
    const budget = new RunBudget({ ceilingUsd: 1, priceUsd: () => 0.1 });
    budget.openAccount('orchestrator', { ceilingUsd: 0.5, kind: 'orchestrator-cap' });
    budget.onUsage(usage, 'fake:model', 'orchestrator');
    expect(budget.exhaustionDiagnostics('orchestrator').crossed).toBeUndefined();
  });
});

describe('the in-flight exposure reservation (RV711)', () => {
  // 1 USD per MTok input, 10 USD per MTok output: a (1000 in, 400 out)
  // turn estimate prices to exactly 0.001 + 0.004 = 0.005 USD.
  const TEN: Pricing = { inputUsdPerMTok: 1, outputUsdPerMTok: 10 };
  const exposureBudget = (capUsd: number): RunBudget =>
    new RunBudget({
      maxInFlightExposureUsd: capUsd,
      pricingOf: (servedBy) => (servedBy === 'fake:model' ? TEN : undefined),
      priceUsd: (servedBy, usage) =>
        servedBy === 'fake:model'
          ? usage.inputTokens * 1e-6 + usage.outputTokens * 1e-5
          : undefined,
    });

  it('admits to an exact fill, refuses the estimate past it, and frees on release', () => {
    const budget = exposureBudget(0.01);
    const first = budget.reserveTurnExposure('fake:model', 1000, 400);
    expect(first).toBeDefined();
    // Exact fill: 0.005 + 0.005 = the 0.01 cap.
    const second = budget.reserveTurnExposure('fake:model', 1000, 400);
    expect(second).toBeDefined();
    // One more estimate does not fit and refuses TYPED, without waiting.
    let thrown: unknown;
    try {
      budget.reserveTurnExposure('fake:model', 1000, 400);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(BudgetExhaustedError);
    const data = (thrown as BudgetExhaustedError).data as Record<string, unknown>;
    expect(data.reason).toBe('in-flight-exposure');
    expect(data.capUsd).toBe(0.01);
    expect((thrown as Error).message).toContain('maxInFlightExposureUsd');
    // A transient refusal never marks the run exhausted and never severs.
    expect(budget.exhausted).toBe(false);
    expect(budget.signal.aborted).toBe(false);
    // Settling one attempt frees exactly its estimate.
    second?.();
    expect(budget.reserveTurnExposure('fake:model', 1000, 400)).toBeDefined();
    void first;
  });

  it('release is idempotent: a double release frees nothing twice', () => {
    const budget = exposureBudget(0.01);
    const first = budget.reserveTurnExposure('fake:model', 1000, 400);
    budget.reserveTurnExposure('fake:model', 1000, 400);
    first?.();
    first?.();
    // Only 0.005 came back: one estimate fits, a second refuses.
    budget.reserveTurnExposure('fake:model', 1000, 400);
    expect(() => budget.reserveTurnExposure('fake:model', 1000, 400)).toThrow(BudgetExhaustedError);
  });

  it('spent money and the named reserves shrink the admissible exposure', () => {
    const budget = exposureBudget(0.01);
    // 0.006 spent: one 0.005 estimate would need 0.011.
    budget.onUsage(
      { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 0, cacheWriteTokens: 0 },
      'fake:model',
    );
    expect(() => budget.reserveTurnExposure('fake:model', 1000, 400)).toThrow(BudgetExhaustedError);
    const withReserves = exposureBudget(0.01);
    withReserves.commitFinalizeReserve('run', 0.004);
    // 0.004 finalize reserve + 0.005 estimate fits the 0.01 cap.
    const release = withReserves.reserveTurnExposure('fake:model', 1000, 400);
    expect(release).toBeDefined();
    release?.();
    withReserves.commitSynthesisReserve('run', 0.002);
    // 0.004 + 0.002 + 0.005 = 0.011 does not.
    expect(() => withReserves.reserveTurnExposure('fake:model', 1000, 400)).toThrow(
      BudgetExhaustedError,
    );
  });

  it('an unpriced model reserves zero exposure but a full cap still refuses it', () => {
    const budget = exposureBudget(0.005);
    // No price row: the estimate is zero and admits without exposure.
    expect(budget.reserveTurnExposure('free:local', 1_000_000, 1_000_000)).toBeDefined();
    // A full cap refuses even a zero estimate, mirroring admitSpawn.
    budget.onUsage(
      { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 0, cacheWriteTokens: 0 },
      'fake:model',
    );
    expect(() => budget.reserveTurnExposure('free:local', 1, 1)).toThrow(BudgetExhaustedError);
  });

  it('without the option the reservation surface is inert', () => {
    const budget = new RunBudget({ pricingOf: () => TEN });
    expect(budget.maxInFlightExposureUsd).toBeUndefined();
    expect(budget.reserveTurnExposure('fake:model', 1_000_000, 1_000_000)).toBeUndefined();
  });

  it('validates the cap at construction exactly like the ceiling', () => {
    expect(() => new RunBudget({ maxInFlightExposureUsd: -1 })).toThrow(ConfigError);
    expect(() => new RunBudget({ maxInFlightExposureUsd: Number.NaN })).toThrow(ConfigError);
  });
});

/**
 * The strict pre-egress pricing gate (RV1508, the eighteenth
 * improvement plan). Dollars come from the price table, and a model
 * absent from it debits NOTHING, so every ceiling silently fails to
 * bound it; the seventeenth comparison benchmark asked for a mode
 * where missing, malformed, or stale pricing REFUSES the paid
 * dispatch instead of pricing it at zero.
 */
describe('the strict pre-egress pricing gate (RV1508)', () => {
  const FRESH: Pricing = {
    inputUsdPerMTok: 1,
    outputUsdPerMTok: 10,
    ratesVerifiedAt: '2026-08-01',
  };

  function strictBudget(options: {
    pricing?: Record<string, Pricing>;
    strictPricing?: { maxRatesAgeDays?: number; allowUnpriced?: readonly string[] };
    nowMs?: number;
  }): RunBudget {
    return new RunBudget({
      pricingOf: (servedBy) => options.pricing?.[servedBy],
      strictPricing: options.strictPricing ?? {},
      ...(options.nowMs === undefined ? {} : { now: () => options.nowMs as number }),
    });
  }

  it('refuses a dispatch whose model has no price row, typed', () => {
    const budget = strictBudget({ pricing: {} });
    expect(() => budget.assertPricedDispatch('fake:model')).toThrow(ConfigError);
    expect(() => budget.assertPricedDispatch('fake:model')).toThrow(/no price row/);
  });

  it('refuses a malformed row (NaN rate, malformed tier), typed', () => {
    const nan = strictBudget({
      pricing: { 'fake:model': { inputUsdPerMTok: Number.NaN, outputUsdPerMTok: 10 } },
    });
    expect(() => nan.assertPricedDispatch('fake:model')).toThrow(ConfigError);
    const tier = strictBudget({
      pricing: {
        'fake:model': {
          inputUsdPerMTok: 1,
          outputUsdPerMTok: 10,
          tiers: [{ aboveInputTokens: 200_000, inputMultiplier: Number.NaN, outputMultiplier: 1 }],
        },
      },
    });
    expect(() => tier.assertPricedDispatch('fake:model')).toThrow(ConfigError);
  });

  it('binds freshness only when maxRatesAgeDays is declared', () => {
    const nowMs = Date.parse('2026-08-03T00:00:00Z');
    const stale = strictBudget({
      pricing: { 'fake:model': { ...FRESH, ratesVerifiedAt: '2026-06-01' } },
      strictPricing: { maxRatesAgeDays: 30 },
      nowMs,
    });
    expect(() => stale.assertPricedDispatch('fake:model')).toThrow(/stale/);
    const undated = strictBudget({
      pricing: { 'fake:model': { inputUsdPerMTok: 1, outputUsdPerMTok: 10 } },
      strictPricing: { maxRatesAgeDays: 30 },
      nowMs,
    });
    expect(() => undated.assertPricedDispatch('fake:model')).toThrow(/ratesVerifiedAt/);
    const fresh = strictBudget({
      pricing: { 'fake:model': FRESH },
      strictPricing: { maxRatesAgeDays: 30 },
      nowMs,
    });
    expect(() => fresh.assertPricedDispatch('fake:model')).not.toThrow();
    // Without the declared bound, an undated row passes: freshness is
    // an explicit contract, never a guessed default.
    const lax = strictBudget({
      pricing: { 'fake:model': { inputUsdPerMTok: 1, outputUsdPerMTok: 10 } },
    });
    expect(() => lax.assertPricedDispatch('fake:model')).not.toThrow();
  });

  it('allowUnpriced is the explicit exception, exact refs only', () => {
    const budget = strictBudget({
      pricing: {},
      strictPricing: { allowUnpriced: ['local:llama'] },
    });
    expect(() => budget.assertPricedDispatch('local:llama')).not.toThrow();
    expect(() => budget.assertPricedDispatch('fake:model')).toThrow(ConfigError);
  });

  it('an unarmed budget keeps the surface inert', () => {
    const budget = new RunBudget({ pricingOf: () => undefined });
    expect(budget.strictPricing).toBeUndefined();
    expect(() => budget.assertPricedDispatch('fake:model')).not.toThrow();
  });
});

describe('the per-account resume seed (RV1505)', () => {
  const NO_USAGE = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

  it('a re-opened scope resumes from its seeded inclusive spend', () => {
    const budget = new RunBudget({
      ceilingUsd: 1,
      seed: { usd: 0.5, usage: NO_USAGE, agentsSpawned: 2, accounts: { 'wf:child:0': 0.2 } },
    });
    budget.openAccount('wf:child:0', { ceilingUsd: 0.25 });
    expect(budget.accountView('wf:child:0')?.spentUsd).toBeCloseTo(0.2, 12);
    expect(budget.remainderOf('wf:child:0')).toBeCloseTo(0.05, 12);
    // Projected admission is honest against the history: the seeded
    // spend plus this reserve does not fit the recorded ceiling.
    expect(() => budget.admitSpawn(0.1, 'wf:child:0')).toThrow(BudgetExhaustedError);
    // The recovered arm has no refusal: history re-applies unchecked.
    expect(() => budget.admitRecovered(0.1, 'wf:child:0')).not.toThrow();
  });

  it('an orchestrator-cap scope opens at zero even with a seeded row', () => {
    // The cap is a per-segment coordination bound: the documented
    // resume after a budget-cancelled root continues past a crossed
    // cap under the root ceiling, so its account re-arms instead of
    // resuming the very spend that crossed it.
    const budget = new RunBudget({
      ceilingUsd: 2,
      seed: { usd: 0.75, usage: NO_USAGE, agentsSpawned: 4, accounts: { orchestrator: 0.75 } },
    });
    budget.openAccount('orchestrator', { ceilingUsd: 0.4, kind: 'orchestrator-cap' });
    expect(budget.accountView('orchestrator')?.spentUsd).toBe(0);
    expect(budget.remainderOf('orchestrator')).toBeCloseTo(0.4, 12);
  });

  it('a scope with no seeded row opens at zero, exactly as before', () => {
    const budget = new RunBudget({
      ceilingUsd: 1,
      seed: { usd: 0.1, usage: NO_USAGE, agentsSpawned: 1, accounts: { 'wf:other:0': 0.05 } },
    });
    budget.openAccount('wf:child:0', { ceilingUsd: 0.25 });
    expect(budget.accountView('wf:child:0')?.spentUsd).toBe(0);
  });

  it('ignores the root row: the root seeds from seed.usd, the same fold', () => {
    const budget = new RunBudget({
      ceilingUsd: 1,
      seed: { usd: 0.5, usage: NO_USAGE, agentsSpawned: 2, accounts: { run: 999 } },
    });
    expect(budget.spent().usd).toBeCloseTo(0.5, 12);
  });

  it('refuses a non-finite or negative seeded row loud, naming the scope', () => {
    for (const bad of [Number.NaN, -0.1, Number.POSITIVE_INFINITY]) {
      expect(
        () =>
          new RunBudget({
            ceilingUsd: 1,
            seed: { usd: 0.1, usage: NO_USAGE, agentsSpawned: 1, accounts: { 'wf:bad:0': bad } },
          }),
      ).toThrow(ConfigError);
      expect(
        () =>
          new RunBudget({
            ceilingUsd: 1,
            seed: { usd: 0.1, usage: NO_USAGE, agentsSpawned: 1, accounts: { 'wf:bad:0': bad } },
          }),
      ).toThrow(/wf:bad:0/u);
    }
  });
});
