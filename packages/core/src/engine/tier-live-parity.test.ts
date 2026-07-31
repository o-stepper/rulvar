/**
 * Live-budget parity for long-context tier crossings (RV1101): the
 * settled fold and the per-request money twin (RV702) price EVERY
 * provider call whole, so a long-context tier fires on the call's full
 * prompt; the live budget used to price each mid-stream slice alone,
 * so a crossing on the call's SUM that no single slice crossed debited
 * the cheap reading while settlement recorded the tiered one. The
 * fourteenth plan's backlog pinned the shape: a $4 ceiling watching a
 * 250k-token prompt arrive as 150k + 100k slices held against $3.00
 * while the settled fold recorded $5.75. The per-call meter debits the
 * increment of the call's ACCUMULATED price instead, so the crossing
 * slice carries the retroactive re-price of the whole call, exactly
 * like settlement; the tier still never fires on a run aggregate no
 * single call crossed (RV504).
 */
import { describe, expect, it } from 'vitest';

import type { ChatEvent, ChatRequest, Usage } from '../l0/messages.js';
import type { ModelCaps, ProviderAdapter } from '../l0/spi/provider.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { RunBudget } from './budget.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';

const TIER_CAPS: Omit<ModelCaps, 'pricing'> = {
  structuredOutput: 'native',
  supportsTemperature: false,
  supportsParallelTools: true,
  reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
  contextWindow: 1_000_000,
  maxOutputTokens: 128_000,
};

/** Above 200k input the whole request re-prices at 2x input, 1.5x output. */
const TIER_PRICING = {
  inputUsdPerMTok: 10,
  outputUsdPerMTok: 50,
  cacheReadUsdPerMTok: 1,
  cacheWriteUsdPerMTok: 12.5,
  tiers: [{ aboveInputTokens: 200_000, inputMultiplier: 2, outputMultiplier: 1.5 }],
};

interface ScriptedCall {
  /** Mid-stream usage DELTAS, exactly as an adapter reports them. */
  slices: Usage[];
  /** The authoritative finish total (finish IS the total). */
  finish: Usage;
}

/**
 * An adapter that reports usage in mid-stream increments and closes
 * with the accumulated finish total, exactly like a real wire whose
 * message_start and message_delta events arrive as the prompt streams.
 */
function tierAdapter(calls: ScriptedCall[]): ProviderAdapter {
  let call = 0;
  return {
    id: 'tier',
    caps: () => ({ ...TIER_CAPS, pricing: TIER_PRICING }),
    // eslint-disable-next-line @typescript-eslint/require-await
    async *stream(_req: ChatRequest): AsyncIterable<ChatEvent> {
      const scripted = calls[call] ?? calls[calls.length - 1];
      if (scripted === undefined) {
        throw new Error('tierAdapter needs at least one scripted call');
      }
      call += 1;
      for (const slice of scripted.slices) {
        yield { type: 'usage', usage: { ...slice } };
      }
      yield { type: 'text-delta', text: 'done' };
      yield {
        type: 'finish',
        finish: { reason: 'stop' },
        usage: { ...scripted.finish },
        providerMetadata: { tier: { responseId: `tier-${String(call)}` } },
      };
    },
  };
}

const usageOf = (partial: Partial<Usage>): Usage => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  ...partial,
});

/** 250k prompt arriving as 150k + 100k slices; 10k output on finish. */
const CROSSING_CALL: ScriptedCall = {
  slices: [usageOf({ inputTokens: 150_000 }), usageOf({ inputTokens: 100_000 })],
  finish: usageOf({ inputTokens: 250_000, outputTokens: 10_000 }),
};

interface ParityRun {
  status: string;
  totalUsd: number;
  maxLiveSpentUsd: number;
}

async function runParity(
  calls: ScriptedCall[],
  budgetUsd: number,
  agents: number = calls.length,
): Promise<ParityRun> {
  const engine = createEngine({
    adapters: [tierAdapter(calls)],
    stores: { journal: new InMemoryStore() },
    defaults: { routing: { loop: 'tier:model' } },
  });
  const workflow = defineWorkflow({ name: 'tier-parity' }, async (ctx) => {
    for (let i = 0; i < agents; i += 1) {
      await ctx.agent('go', { estCost: 0 });
    }
    return 'done';
  });
  const handle = engine.run(workflow, undefined, { budgetUsd });
  let maxLiveSpentUsd = 0;
  handle.on('budget:update', (event) => {
    if (event.spentUsd > maxLiveSpentUsd) {
      maxLiveSpentUsd = event.spentUsd;
    }
  });
  const outcome = await handle.result;
  return {
    status: outcome.status,
    totalUsd: outcome.cost.totalUsd,
    maxLiveSpentUsd,
  };
}

describe('live-budget parity for long-context tier crossings (RV1101)', () => {
  it('a crossing on the call sum that no slice crossed debits live exactly like settlement', async () => {
    const run = await runParity([CROSSING_CALL], 100);
    expect(run.status).toBe('ok');
    // 250k at 2x input ($5.00) + 10k at 1.5x output ($0.75).
    expect(run.totalUsd).toBe(5.75);
    // The live ledger saw the tiered dollars, not the $3.00 per-slice
    // reading (1.5 + 1.0 + 0.5) of the same provider call.
    expect(run.maxLiveSpentUsd).toBe(5.75);
  });

  it('a ceiling between the per-slice and tiered price can never settle ok', async () => {
    const run = await runParity([CROSSING_CALL], 4);
    // Pre-RV1101 this settled ok: the live path read $3.00 under the $4
    // ceiling while settlement recorded $5.75 over it. The crossing
    // slice now debits the retroactive re-price of the whole call, the
    // root ceiling crosses mid-stream, and the run is exhausted.
    expect(run.status).toBe('exhausted');
    expect(run.totalUsd).toBe(5.75);
    expect(run.maxLiveSpentUsd).toBe(run.totalUsd);
  });

  it('the tier never fires on a run aggregate no single call crossed', async () => {
    const belowThreshold: ScriptedCall = {
      slices: [usageOf({ inputTokens: 150_000 })],
      finish: usageOf({ inputTokens: 150_000 }),
    };
    // Two calls of 150k each: the run total (300k) crosses the 200k
    // threshold, but the billing basis is the provider call (RV504,
    // RV702), so both live and settled stay at the base rate.
    const run = await runParity([belowThreshold, belowThreshold], 100);
    expect(run.status).toBe('ok');
    expect(run.totalUsd).toBe(3);
    expect(run.maxLiveSpentUsd).toBe(3);
  });

  it('a multi-slice call below the threshold keeps its historical debits byte for byte', async () => {
    const linearCall: ScriptedCall = {
      slices: [usageOf({ inputTokens: 100_000 }), usageOf({ inputTokens: 50_000 })],
      finish: usageOf({ inputTokens: 150_000, outputTokens: 10_000 }),
    };
    const run = await runParity([linearCall], 100);
    expect(run.status).toBe('ok');
    // Linear pricing: the marginal fold telescopes to exactly the
    // per-slice sum (1.0 + 0.5 + 0.5), so nothing changes below a tier.
    expect(run.totalUsd).toBe(2);
    expect(run.maxLiveSpentUsd).toBe(2);
  });

  it('a crossing that arrives whole as the finish remainder stays priced (single-slice path unchanged)', async () => {
    const wholeCall: ScriptedCall = {
      slices: [],
      finish: usageOf({ inputTokens: 250_000, outputTokens: 10_000 }),
    };
    const run = await runParity([wholeCall], 100);
    expect(run.status).toBe('ok');
    expect(run.totalUsd).toBe(5.75);
    expect(run.maxLiveSpentUsd).toBe(5.75);
  });

  it('live and settled dollars agree over generated slicings across the tier', async () => {
    // Deterministic LCG: the property is near-exact equality, so the
    // seeds are fixtures, not wall-clock randomness.
    let state = 0xf00dfeed;
    const next = (bound: number): number => {
      state = (state * 1_664_525 + 1_013_904_223) >>> 0;
      return state % bound;
    };
    for (let round = 0; round < 24; round += 1) {
      const inputTokens = 50_000 + next(350_000);
      const outputTokens = next(20_000);
      const sliceCount = 1 + next(3);
      const cuts = Array.from({ length: sliceCount - 1 }, () => next(inputTokens)).sort(
        (a, b) => a - b,
      );
      const bounds = [0, ...cuts, inputTokens];
      const slices: Usage[] = [];
      for (let i = 1; i < bounds.length; i += 1) {
        const width = (bounds[i] ?? 0) - (bounds[i - 1] ?? 0);
        if (width > 0) {
          slices.push(usageOf({ inputTokens: width }));
        }
      }
      const run = await runParity(
        [{ slices, finish: usageOf({ inputTokens, outputTokens }) }],
        1_000,
      );
      expect(run.status).toBe('ok');
      expect(Math.abs(run.maxLiveSpentUsd - run.totalUsd)).toBeLessThanOrEqual(1e-9);
    }
  });
});

describe('the per-call marginal meter (RV1101)', () => {
  const tierPrice = (usage: Usage): number => {
    const crossed = usage.inputTokens > 200_000;
    const inputRate = crossed ? 20 : 10;
    const outputRate = crossed ? 75 : 50;
    return (
      (usage.inputTokens / 1_000_000) * inputRate + (usage.outputTokens / 1_000_000) * outputRate
    );
  };

  it('debits the increment of the accumulated price, re-pricing the call at a crossing', () => {
    const budget = new RunBudget({ ceilingUsd: 100, priceUsd: (_ref, usage) => tierPrice(usage) });
    const meter = budget.openCallMeter('tier:model');
    meter(usageOf({ inputTokens: 150_000 }));
    expect(budget.spent().usd).toBe(1.5);
    // The crossing slice debits price(250k) - price(150k) = 5.0 - 1.5.
    meter(usageOf({ inputTokens: 100_000 }));
    expect(budget.spent().usd).toBe(5);
    meter(usageOf({ outputTokens: 10_000 }));
    expect(budget.spent().usd).toBe(5.75);
  });

  it('separate meters never share an accumulation (the billing basis is one call)', () => {
    const budget = new RunBudget({ ceilingUsd: 100, priceUsd: (_ref, usage) => tierPrice(usage) });
    budget.openCallMeter('tier:model')(usageOf({ inputTokens: 150_000 }));
    budget.openCallMeter('tier:model')(usageOf({ inputTokens: 150_000 }));
    // 300k across two calls never crosses the per-call threshold.
    expect(budget.spent().usd).toBe(3);
  });

  it('a decreasing price function clamps the marginal at zero: a debit never credits', () => {
    const budget = new RunBudget({
      ceilingUsd: 100,
      priceUsd: (_ref, usage) => (usage.inputTokens > 200_000 ? 1 : 2),
    });
    const meter = budget.openCallMeter('odd:model');
    meter(usageOf({ inputTokens: 100_000 }));
    expect(budget.spent().usd).toBe(2);
    meter(usageOf({ inputTokens: 150_000 }));
    // price(250k) = 1 is BELOW the 2 already debited: spend is monotone.
    expect(budget.spent().usd).toBe(2);
  });

  it('an unpriced model debits zero through the meter and warns once under a ceiling', () => {
    const warnings: string[] = [];
    const budget = new RunBudget({
      ceilingUsd: 1,
      events: {
        emit: (body) => {
          if (body['level'] === 'warn') {
            warnings.push(String(body['msg']));
          }
        },
      },
    });
    const meter = budget.openCallMeter('free:model');
    meter(usageOf({ inputTokens: 100_000 }));
    meter(usageOf({ inputTokens: 100_000 }));
    expect(budget.spent().usd).toBe(0);
    expect(budget.spent().usage.inputTokens).toBe(200_000);
    expect(warnings.filter((msg) => msg.includes('no price row')).length).toBe(1);
  });

  it('an invalid accumulated price debits zero for the slice and reports the row once', () => {
    const errors: string[] = [];
    let calls = 0;
    const budget = new RunBudget({
      ceilingUsd: 100,
      events: {
        emit: (body) => {
          if (body['level'] === 'error') {
            errors.push(String(body['msg']));
          }
        },
      },
      priceUsd: () => {
        calls += 1;
        return calls === 1 ? Number.NaN : 5;
      },
    });
    const meter = budget.openCallMeter('bad:model');
    meter(usageOf({ inputTokens: 100_000 }));
    expect(budget.spent().usd).toBe(0);
    // The next finite accumulated price recovers the whole difference.
    meter(usageOf({ inputTokens: 100_000 }));
    expect(budget.spent().usd).toBe(5);
    expect(errors.filter((msg) => msg.includes('price function returned')).length).toBe(1);
  });

  it('meter debits sever the crossing account exactly like onUsage debits', () => {
    const budget = new RunBudget({ ceilingUsd: 4, priceUsd: (_ref, usage) => tierPrice(usage) });
    const meter = budget.openCallMeter('tier:model');
    meter(usageOf({ inputTokens: 150_000 }));
    expect(budget.signal.aborted).toBe(false);
    expect(budget.exhausted).toBe(false);
    meter(usageOf({ inputTokens: 100_000 }));
    expect(budget.signal.aborted).toBe(true);
    expect(budget.exhausted).toBe(true);
  });
});
