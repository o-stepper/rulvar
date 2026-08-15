/**
 * RunBudget unit level: projected layer-1 admission (the proposed reserve
 * is part of the check, exact fill allowed, atomic across the ancestor
 * chain) and the layer-2b pre-dispatch output bound.
 */
import { describe, expect, it } from 'vitest';

import { BudgetExhaustedError, ConfigError } from '../l0/errors.js';
import type { Pricing } from '../l0/spi/provider.js';
import { affordableOutputTokens } from '../model/pricing.js';
import { EXPOSURE_WAIT_SWEEP_MS, RunBudget } from './budget.js';

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

describe('the refusal names the held synthesis reserve (RV2106, the ninth parity run)', () => {
  it('prints the hold so the arithmetic closes, and stamps it on the data', () => {
    // The ninth run's refusal read "spent 0.3849 plus committed
    // reserves 0.0000 plus the proposed reserve 0.2800 does not fit
    // the ceiling 1.9000": numbers that fit with room to spare,
    // because the 1.40 hold that ate the room was in the sum and not
    // in the message.
    const budget = new RunBudget({ ceilingUsd: 5 });
    budget.openAccount('orchestrator', { ceilingUsd: 0.06 });
    budget.commitSynthesisReserve('orchestrator', 0.05);
    let thrown: unknown;
    try {
      budget.admitSpawn(0.02, 'orchestrator');
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(BudgetExhaustedError);
    const refusal = thrown as BudgetExhaustedError;
    expect(refusal.message).toContain('plus the held synthesis reserve 0.0500 USD');
    expect(refusal.message).toContain('the proposed reserve 0.0200 USD');
    const data = refusal.data as {
      synthesisReserveUsd?: number;
      finalizeReserveUsd?: number;
    };
    expect(data.synthesisReserveUsd).toBe(0.05);
    expect(data.finalizeReserveUsd).toBe(0);
  });

  it('keeps the hold-free refusal bytes unchanged', () => {
    const budget = new RunBudget({ ceilingUsd: 0.001 });
    let thrown: unknown;
    try {
      budget.admitSpawn(0.01);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(BudgetExhaustedError);
    expect((thrown as Error).message).toContain(
      'committed reserves 0.0000 USD plus the proposed reserve 0.0100 USD',
    );
    expect((thrown as Error).message).not.toContain('held synthesis reserve');
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

  it('spent money shrinks the admissible exposure; the tail reserves stay out of the sum', () => {
    const budget = exposureBudget(0.01);
    // 0.006 spent: one 0.005 estimate would need 0.011.
    budget.onUsage(
      { inputTokens: 1000, outputTokens: 500, cacheReadTokens: 0, cacheWriteTokens: 0 },
      'fake:model',
    );
    expect(() => budget.reserveTurnExposure('fake:model', 1000, 400)).toThrow(BudgetExhaustedError);
    // The tail reserves are fenced by the budget chain (RV2101), not
    // the exposure cap: with finalize 0.004 and synthesis 0.004
    // committed on a 0.01 cap, the old sum refused the FIRST 0.005
    // estimate (0.008 + 0.005 > 0.01) one turn short of the tail those
    // reserves fund. Live exposure alone bounds the admissions now.
    const withReserves = exposureBudget(0.01);
    withReserves.commitFinalizeReserve('run', 0.004);
    withReserves.commitSynthesisReserve('run', 0.004);
    const release = withReserves.reserveTurnExposure('fake:model', 1000, 400);
    expect(release).toBeDefined();
    // The exact fill still admits, and the next refuses on live
    // exposure alone.
    expect(withReserves.reserveTurnExposure('fake:model', 1000, 400)).toBeDefined();
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
 * The terminal backstop of the exposure surface (RV2001, the twenty
 * third improvement plan). The parity rerun on the sized envelope died
 * on this exact hole: three children were killed pre-wire by the
 * exposure cap, their live dispatch estimates (0.478 USD) stayed
 * parked against the cap with no live dispatch holding them, and the
 * root's exposure wait starved forever on money that could never
 * release. Holds are now attributed to their holder, and EVERY agent
 * terminal returns whatever its holder still has.
 */
describe('exposure holds release at the agent terminal (RV2001)', () => {
  // 1 USD per MTok input, 10 USD per MTok output: (1000 in, 400 out)
  // prices to exactly 0.005 USD per hold.
  const TEN: Pricing = { inputUsdPerMTok: 1, outputUsdPerMTok: 10 };
  const exposureBudget = (capUsd: number): RunBudget =>
    new RunBudget({
      maxInFlightExposureUsd: capUsd,
      pricingOf: (servedBy) => (servedBy === 'fake:model' ? TEN : undefined),
    });

  it('a terminal returns everything its holder still holds and wakes the parked waiter', async () => {
    const budget = exposureBudget(0.02);
    // Two holds of one child leak (their attempt closures are lost),
    // one hold of another child stays legitimately live.
    budget.reserveTurnExposure('fake:model', 1000, 400, 'agent:7');
    budget.reserveTurnExposure('fake:model', 1000, 400, 'agent:7');
    budget.reserveTurnExposure('fake:model', 1000, 400, 'agent:9');
    expect(budget.liveExposureUsd).toBeCloseTo(0.015, 10);
    expect(budget.liveExposureHolderCount).toBe(2);
    const parked = budget.awaitExposureRelease();
    expect(budget.releaseExposureHolder('agent:7')).toBeCloseTo(0.01, 10);
    await expect(parked).resolves.toBe('released');
    expect(budget.liveExposureUsd).toBeCloseTo(0.005, 10);
    expect(budget.liveExposureHolderCount).toBe(1);
  });

  it('the parity shape: three dead children leave live estimates exactly zero', () => {
    const budget = exposureBudget(6);
    for (const holder of ['agent:2', 'agent:4', 'agent:6']) {
      budget.reserveTurnExposure('fake:model', 100_000, 8_000, holder);
    }
    expect(budget.liveExposureUsd).toBeGreaterThan(0);
    for (const holder of ['agent:2', 'agent:4', 'agent:6']) {
      budget.releaseExposureHolder(holder);
    }
    // Strictly zero, never the 0.478 the parity run parked on.
    expect(budget.liveExposureUsd).toBe(0);
    expect(budget.liveExposureHolderCount).toBe(0);
    expect(budget.reserveTurnExposure('fake:model', 1000, 400, 'agent:8')).toBeDefined();
  });

  it('a late attempt closure after the backstop cannot eat the money of another holder', () => {
    const budget = exposureBudget(0.02);
    const lateClosure = budget.reserveTurnExposure('fake:model', 1000, 400, 'agent:1');
    budget.reserveTurnExposure('fake:model', 1000, 400, 'agent:3');
    expect(budget.releaseExposureHolder('agent:1')).toBeCloseTo(0.005, 10);
    expect(budget.liveExposureUsd).toBeCloseTo(0.005, 10);
    // The closure fires after its holder was already drained: it frees
    // at most what the holder still holds, which is nothing.
    lateClosure?.();
    expect(budget.liveExposureUsd).toBeCloseTo(0.005, 10);
    expect(budget.liveExposureHolderCount).toBe(1);
  });

  it('a holder with nothing held is a free no-op that wakes nobody', async () => {
    const budget = exposureBudget(0.02);
    budget.reserveTurnExposure('fake:model', 1000, 400, 'agent:5');
    let woke = false;
    void budget.awaitExposureRelease().then(() => {
      woke = true;
    });
    expect(budget.releaseExposureHolder('agent:404')).toBe(0);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(woke).toBe(false);
    expect(budget.releaseExposureHolder('agent:5')).toBeCloseTo(0.005, 10);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(woke).toBe(true);
  });

  it('an unattributed hold keeps the historical scalar behavior', () => {
    const budget = exposureBudget(0.02);
    const release = budget.reserveTurnExposure('fake:model', 1000, 400);
    expect(budget.liveExposureUsd).toBeCloseTo(0.005, 10);
    expect(budget.liveExposureHolderCount).toBe(0);
    release?.();
    expect(budget.liveExposureUsd).toBe(0);
  });
});

/**
 * The exposure wait holds the event loop (RV2003). The parity rerun's
 * process exited SILENTLY with the parked root's unsettled await as
 * its only remaining work: the wait held no timer, so an empty loop
 * simply ended the process mid-run. A parked waiter now arms a ref'd
 * keepalive interval (disarmed with the last waiter), and each tick
 * sweeps for the drained state so a wake lost to a future leak can
 * never strand a waiter forever.
 */
describe('the parked-waiter keepalive and drained sweep (RV2003)', () => {
  const TEN: Pricing = { inputUsdPerMTok: 1, outputUsdPerMTok: 10 };
  const exposureBudget = (capUsd: number): RunBudget =>
    new RunBudget({
      maxInFlightExposureUsd: capUsd,
      pricingOf: (servedBy) => (servedBy === 'fake:model' ? TEN : undefined),
    });

  it('a parked waiter arms the ref keepalive and the settle disarms it', async () => {
    const budget = exposureBudget(0.02);
    const release = budget.reserveTurnExposure('fake:model', 1000, 400, 'agent:1');
    // Internals peek, deliberately: the armed interval IS the
    // mechanism under regression (the parity process died because
    // nothing was armed), and Node offers no public "will the loop
    // survive" probe to assert against.
    const peek = budget as unknown as { waitKeepalive?: object };
    expect(peek.waitKeepalive).toBeUndefined();
    const parked = budget.awaitExposureRelease();
    expect(peek.waitKeepalive).toBeDefined();
    release?.();
    await expect(parked).resolves.toBe('released');
    expect(peek.waitKeepalive).toBeUndefined();
  });

  it('the sweep wakes a waiter drained when a lost wake stranded it', async () => {
    const budget = exposureBudget(0.02);
    budget.reserveTurnExposure('fake:model', 1000, 400, 'agent:1');
    const parked = budget.awaitExposureRelease();
    // Simulate exactly the defect class the sweep exists for: the
    // holds vanish WITHOUT the release chokepoint running (a future
    // leak loses the wake). No public path can do this, which is the
    // point: the sweep is defense in depth behind the event-driven
    // wakes, and the internals write below is the simulated leak.
    const peek = budget as unknown as {
      exposureHolds: Map<string, number>;
      inFlightExposureUsd: number;
    };
    peek.exposureHolds.clear();
    peek.inFlightExposureUsd = 0;
    await expect(parked).resolves.toBe('drained');
  });

  it('the sweep never wakes while any holder is live', async () => {
    const budget = exposureBudget(0.02);
    const release = budget.reserveTurnExposure('fake:model', 1000, 400, 'agent:1');
    const parked = budget.awaitExposureRelease();
    let settled = false;
    void parked.then(() => {
      settled = true;
    });
    // Two sweep cadences pass with the hold live: no spurious drain.
    await new Promise((resolve) => setTimeout(resolve, EXPOSURE_WAIT_SWEEP_MS * 2 + 50));
    expect(settled).toBe(false);
    release?.();
    await expect(parked).resolves.toBe('released');
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

  it('refuses a future-dated ratesVerifiedAt beyond the skew tolerance (RV1804)', () => {
    const nowMs = Date.parse('2026-08-02T20:00:00Z');
    // The hazard: a typo'd year reads as eternally fresh under a
    // stale-only check, because a negative age passes every max-age
    // bound.
    const typo = strictBudget({
      pricing: { 'fake:model': { ...FRESH, ratesVerifiedAt: '2027-08-01' } },
      strictPricing: { maxRatesAgeDays: 30 },
      nowMs,
    });
    expect(() => typo.assertPricedDispatch('fake:model')).toThrow(/future ratesVerifiedAt/);
    // A date-only string authored ahead of UTC sits hours in the
    // future and passes: the one-day tolerance absorbs ordinary skew.
    const ahead = strictBudget({
      pricing: { 'fake:model': { ...FRESH, ratesVerifiedAt: '2026-08-03' } },
      strictPricing: { maxRatesAgeDays: 30 },
      nowMs,
    });
    expect(() => ahead.assertPricedDispatch('fake:model')).not.toThrow();
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

describe('the lifetime spawn counter across segments (RV2201, the seventh subscription parity run)', () => {
  const NO_USAGE = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

  it('a recovered admission never re-counts an agent the seed already counted', () => {
    // The killed fan-out's journal fold seeded 5 agents (the root and
    // four workers); the resumed segment's roll-forward re-covered the
    // four children, and an incrementing counter starved the judge and
    // the synthesis against a cap of 8 with their money whole.
    const budget = new RunBudget({
      ceilingUsd: 20,
      lifetimeSpawnCap: 8,
      seed: { usd: 3, usage: NO_USAGE, agentsSpawned: 5 },
    });
    for (let child = 0; child < 4; child += 1) {
      budget.admitRecovered(1);
    }
    expect(budget.spawnHeadroom).toBe(3);
    // The post-acceptance tail seats fresh: the judge and the synthesis.
    budget.admitSpawn(0.3);
    budget.admitSpawn(0.8);
    expect(budget.spawnHeadroom).toBe(1);
  });

  it('fresh spawns still consume the counter to its cap', () => {
    const budget = new RunBudget({
      ceilingUsd: 20,
      lifetimeSpawnCap: 2,
      seed: { usd: 0.5, usage: NO_USAGE, agentsSpawned: 1 },
    });
    budget.admitSpawn(0.1);
    expect(budget.spawnHeadroom).toBe(0);
    expect(() => budget.admitSpawn(0.1)).toThrow(BudgetExhaustedError);
  });
});

/**
 * Layer 2b against the exposure ceiling (RV2503). The 1.226.0
 * comparison run held 0.8642 USD of budget and 0.5642 USD of exposure
 * room, and its mandatory repair turn was refused before any provider
 * call because the FULL 18000 token plan priced 0.7066 USD. Re-issued
 * after the operator raised the ceiling, that turn wrote 12840 output
 * tokens for 0.4788 USD: it fit the ceiling that refused it. The room
 * now answers how long a turn it affords, and only for a dispatch with
 * nothing else in flight, where the refusal is permanent rather than
 * the transient RV711 wave refusal RV1902 parks on.
 */
describe('the exposure room clamps the plan it can still afford (RV2503)', () => {
  // The comparison run's serving model: 5 USD per MTok input, 30 per
  // MTok output, no long-context tier reached at this prompt size.
  const SOL: Pricing = { inputUsdPerMTok: 5, outputUsdPerMTok: 30 };
  const ZERO_USAGE = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const CAP = 5.7;
  const SPENT = 5.1358257;
  const ESTIMATED_INPUT = 33_320;

  function atTheComparisonTail(): RunBudget {
    return new RunBudget({
      ceilingUsd: 6,
      maxInFlightExposureUsd: CAP,
      clampTurnToExposure: true,
      pricingOf: (servedBy) => (servedBy === 'openai:sol' ? SOL : undefined),
      seed: { usd: SPENT, usage: ZERO_USAGE, agentsSpawned: 1 },
    });
  }

  it('affords the turn the full plan could not buy', () => {
    const budget = atTheComparisonTail();
    const affordable = budget.maxExposureOutputTokens('openai:sol', ESTIMATED_INPUT);
    // The room is CAP - SPENT = 0.5642 USD, of which the prompt takes
    // 0.1666; the rest buys 13253 output tokens, and the turn that was
    // refused went on to write 12840.
    expect(affordable).toBe(
      affordableOutputTokens(SOL, CAP - SPENT, ESTIMATED_INPUT) as unknown as number,
    );
    expect(affordable).toBeGreaterThanOrEqual(12_840);
    expect(affordable).toBeLessThan(18_000);
    // The clamped plan fits the very admission that refused the full
    // one: no throw, and the hold releases cleanly.
    const release = budget.reserveTurnExposure('openai:sol', ESTIMATED_INPUT, affordable ?? 0);
    expect(release).toBeTypeOf('function');
    release?.();
    // The full plan is still refused, exactly as before.
    expect(() => budget.reserveTurnExposure('openai:sol', ESTIMATED_INPUT, 18_000)).toThrow(
      BudgetExhaustedError,
    );
  });

  it('stays silent while anything else is in flight, so the wave keeps its refusal', () => {
    const budget = atTheComparisonTail();
    const release = budget.reserveTurnExposure('openai:sol', 100, 1);
    expect(budget.maxExposureOutputTokens('openai:sol', ESTIMATED_INPUT)).toBeUndefined();
    release?.();
    expect(budget.maxExposureOutputTokens('openai:sol', ESTIMATED_INPUT)).toBeGreaterThan(0);
  });

  it('is inert without a cap and without a price row', () => {
    const uncapped = new RunBudget({
      ceilingUsd: 6,
      clampTurnToExposure: true,
      pricingOf: () => SOL,
    });
    expect(uncapped.maxExposureOutputTokens('openai:sol', 10)).toBeUndefined();
    const unpriced = new RunBudget({
      maxInFlightExposureUsd: CAP,
      clampTurnToExposure: true,
      pricingOf: () => undefined,
    });
    // And inert without the opt-in, whatever else is configured.
    const unarmed = new RunBudget({ maxInFlightExposureUsd: CAP, pricingOf: () => SOL });
    expect(unarmed.maxExposureOutputTokens('openai:sol', 10)).toBeUndefined();
    expect(unpriced.maxExposureOutputTokens('openai:sol', 10)).toBeUndefined();
  });

  it('answers at or below zero once the exposure line is already crossed', () => {
    const budget = new RunBudget({
      maxInFlightExposureUsd: 1,
      clampTurnToExposure: true,
      pricingOf: () => SOL,
      seed: { usd: 2, usage: ZERO_USAGE, agentsSpawned: 1 },
    });
    // The same convention the budget sibling inherits from
    // affordableOutputTokens: not even the prompt fits, so the answer
    // is not a length. The loop ignores it and the exposure admission
    // refuses with its own typed reason.
    expect(budget.maxExposureOutputTokens('openai:sol', 10)).toBeLessThanOrEqual(0);
  });
});

describe('the convergence reserve (RV3701)', () => {
  it('joins projected admission, shrinks both remainders, and releases whole', () => {
    const budget = new RunBudget({ ceilingUsd: 1 });
    budget.commitConvergenceReserve('run', 0.6);
    expect(budget.accountView('run')?.convergenceReserveUsd).toBe(0.6);
    expect(budget.remainderOf('run')).toBeCloseTo(0.4);
    expect(budget.remainingUsd('run')).toBeCloseTo(0.4);
    expect(() => budget.refuseSpawnIfInfeasible(0.5)).toThrow(BudgetExhaustedError);
    expect(() => budget.refuseSpawnIfInfeasible(0.5)).toThrow(
      /held convergence reserve 0\.6000 USD/,
    );
    // An exact fill beside the hold admits, the admitSpawn rule.
    expect(() => budget.refuseSpawnIfInfeasible(0.4)).not.toThrow();
    budget.releaseConvergenceReserve('run');
    expect(budget.accountView('run')?.convergenceReserveUsd).toBe(0);
    expect(budget.remainingUsd('run')).toBeCloseTo(1);
    expect(() => budget.refuseSpawnIfInfeasible(0.5)).not.toThrow();
  });

  it('mirrors a sub account hold onto the root by the delta, registering again included', () => {
    const budget = new RunBudget({ ceilingUsd: 2 });
    budget.openAccount('orchestrator', {});
    budget.commitConvergenceReserve('orchestrator', 0.5);
    expect(budget.accountView('run')?.convergenceReserveUsd).toBe(0.5);
    budget.commitConvergenceReserve('orchestrator', 0.3);
    expect(budget.accountView('orchestrator')?.convergenceReserveUsd).toBe(0.3);
    expect(budget.accountView('run')?.convergenceReserveUsd).toBeCloseTo(0.3);
    budget.releaseConvergenceReserve('orchestrator');
    expect(budget.accountView('orchestrator')?.convergenceReserveUsd).toBe(0);
    // Delta arithmetic leaves float residue on the root, exactly the
    // synthesis reserve's semantics; the residue is dust, not money.
    expect(budget.accountView('run')?.convergenceReserveUsd).toBeCloseTo(0);
  });

  it('an unknown scope refuses typed and a released release stays a no-op', () => {
    const budget = new RunBudget({});
    expect(() => budget.commitConvergenceReserve('ghost', 0.1)).toThrow(ConfigError);
    expect(() => budget.releaseConvergenceReserve('ghost')).not.toThrow();
  });
});

describe('the repair reserve, the mechanical leg (RV3802)', () => {
  it('joins projected admission beside the verdict leg, both clauses named, and releases whole', () => {
    const budget = new RunBudget({ ceilingUsd: 1 });
    budget.commitConvergenceReserve('run', 0.3);
    budget.commitRepairReserve('run', 0.25);
    expect(budget.accountView('run')?.repairReserveUsd).toBe(0.25);
    expect(budget.remainderOf('run')).toBeCloseTo(0.45);
    expect(budget.remainingUsd('run')).toBeCloseTo(0.45);
    expect(() => budget.refuseSpawnIfInfeasible(0.5)).toThrow(BudgetExhaustedError);
    expect(() => budget.refuseSpawnIfInfeasible(0.5)).toThrow(
      /held convergence reserve 0\.3000 USD/,
    );
    expect(() => budget.refuseSpawnIfInfeasible(0.5)).toThrow(/held repair reserve 0\.2500 USD/);
    // An exact fill beside BOTH holds admits, the admitSpawn rule.
    expect(() => budget.refuseSpawnIfInfeasible(0.45)).not.toThrow();
    budget.releaseRepairReserve('run');
    expect(budget.accountView('run')?.repairReserveUsd).toBe(0);
    expect(budget.remainingUsd('run')).toBeCloseTo(0.7);
    budget.releaseConvergenceReserve('run');
    expect(budget.remainingUsd('run')).toBeCloseTo(1);
  });

  it('mirrors a sub account leg onto the root by the delta, registering again included', () => {
    const budget = new RunBudget({ ceilingUsd: 2 });
    budget.openAccount('orchestrator', {});
    budget.commitRepairReserve('orchestrator', 0.4);
    expect(budget.accountView('run')?.repairReserveUsd).toBe(0.4);
    budget.commitRepairReserve('orchestrator', 0.15);
    expect(budget.accountView('orchestrator')?.repairReserveUsd).toBe(0.15);
    expect(budget.accountView('run')?.repairReserveUsd).toBeCloseTo(0.15);
    budget.releaseRepairReserve('orchestrator');
    expect(budget.accountView('orchestrator')?.repairReserveUsd).toBe(0);
    expect(budget.accountView('run')?.repairReserveUsd).toBeCloseTo(0);
  });

  it('an unknown scope refuses typed and a released release stays a no-op', () => {
    const budget = new RunBudget({});
    expect(() => budget.commitRepairReserve('ghost', 0.1)).toThrow(ConfigError);
    expect(() => budget.releaseRepairReserve('ghost')).not.toThrow();
    const clean = new RunBudget({ ceilingUsd: 1 });
    clean.releaseRepairReserve('run');
    expect(clean.accountView('run')?.repairReserveUsd).toBe(0);
  });
});
