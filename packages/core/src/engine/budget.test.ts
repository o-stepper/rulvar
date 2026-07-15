/**
 * RunBudget unit level: projected layer-1 admission (the proposed reserve
 * is part of the check, exact fill allowed, atomic across the ancestor
 * chain) and the layer-2b pre-dispatch output bound.
 */
import { describe, expect, it } from 'vitest';

import { BudgetExhaustedError } from '../l0/errors.js';
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
