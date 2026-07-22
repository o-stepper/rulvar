/**
 * Hostile-telemetry regression suite (v1.20.0 review P1-1). The three
 * findings this pins, each reproduced on v1.20.0 before the fix:
 *
 * 1. A negative count CREDITED the report: adding a paid call with
 *    outputTokens -100 DECREASED totalUsd.
 * 2. A finish usage mixing NaN input with a positive output punched the
 *    NaN into spentUsd through the remainder gate, after which every
 *    ceiling comparison was false: two $25 turns sailed through a $1
 *    ceiling and the run completed.
 * 3. A mid-stream usage event reached the budget with NO clamp at all;
 *    a NaN delta disabled the ceiling until the 32-turn backstop, ~$50
 *    spent under a $1 ceiling.
 *
 * The contract now: bad telemetry fails the call LOUD (typed
 * transport-class terminal), accounting sees only sanitized values, and
 * spentUsd stays finite and monotone no matter what an adapter emits.
 */
import { describe, expect, it } from 'vitest';

import type { ChatEvent, ChatRequest, ModelRef, Usage } from '../l0/messages.js';
import type { ProviderAdapter } from '../l0/spi/provider.js';
import { ConfigError } from '../l0/errors.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { RunBudget } from './budget.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { scriptedAdapter, testCaps } from './test-harness.js';

const U = (inputTokens: number, outputTokens: number): Usage => ({
  inputTokens,
  outputTokens,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
});

/** testCaps pricing: 1 USD per Mtok in, 10 USD per Mtok out. */
const roomyCaps = testCaps({ contextWindow: 1_000_000_000 });

function engineOf(script: Parameters<typeof scriptedAdapter>[0]) {
  const adapter = scriptedAdapter(script, { caps: roomyCaps });
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: new InMemoryStore({ quiet: true }) },
    defaults: { routing: { loop: 'fake:model' } },
  });
  return { engine, adapter };
}

const oneAgent = defineWorkflow({ name: 'one' }, (ctx) => ctx.agent('go'));

/** Catches the hostile agent so the run survives to make a second call. */
const hostileThenSane = defineWorkflow({ name: 'pair' }, async (ctx) => {
  let firstError = 'none';
  try {
    await ctx.agent('hostile');
  } catch (thrown) {
    firstError = thrown instanceof Error ? thrown.message : String(thrown);
  }
  await ctx.agent('sane');
  return firstError;
});

describe('hostile finish usage', () => {
  it('a negative count fails the call loud and never credits the report', async () => {
    const { engine } = engineOf(() => ({ text: 'done', usage: U(100, -100) }));
    const outcome = await engine.run(oneAgent, undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('violated the Usage invariant');
    // scriptedAdapter reports usage through the mid-stream inlet first,
    // so that inlet's message wins; the negative value is named either way.
    expect(outcome.error?.message).toContain('(-100)');
    // Accounting used the sanitized shape {100 in, 0 out}: 100 tokens at
    // 1 USD/Mtok. A negative price would have been -0.00125-style.
    expect(outcome.cost.totalUsd).toBeCloseTo(100 / 1_000_000, 12);
    expect(outcome.cost.totalUsd).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(outcome.cost.totalUsd)).toBe(true);
  });

  it('adding a hostile paid call INCREASES the total, never decreases it', async () => {
    const sane = engineOf(() => ({ text: 'done', usage: U(1000, 10) }));
    const baseline = await sane.engine.run(oneAgent, undefined).result;
    expect(baseline.status).toBe('ok');

    const pair = engineOf((_req, call) =>
      call === 0 ? { text: 'x', usage: U(1000, 10) } : { text: 'y', usage: U(100, -100) },
    );
    const outcome = await pair.engine.run(hostileThenSane, undefined).result;
    // The workflow caught nothing on the first call (it is sane here);
    // the SECOND call is hostile and uncaught, so re-check both orders:
    // this run has sane-then-hostile with the hostile error escaping.
    expect(outcome.status).toBe('error');
    expect(outcome.cost.totalUsd).toBeGreaterThan(baseline.cost.totalUsd);
    expect(Number.isFinite(outcome.cost.totalUsd)).toBe(true);
  });

  it('fractional counts round UP for the charge and still fail the call', async () => {
    const { engine } = engineOf(() => ({ text: 'done', usage: U(10.5, 2.25) }));
    const outcome = await engine.run(oneAgent, undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('(10.5)');
    // ceil(10.5) = 11 in at 1/Mtok, ceil(2.25) = 3 out at 10/Mtok.
    expect(outcome.cost.totalUsd).toBeCloseTo(11 / 1_000_000 + 30 / 1_000_000, 12);
  });

  it('NaN mixed with a positive output cannot disarm the run ceiling', async () => {
    // Call 1 is hostile (NaN input, positive output); the workflow
    // catches it and calls again. Before the fix the NaN reached
    // spentUsd and the $1 ceiling compared false forever; the second,
    // $25 turn must now be stopped by the intact ceiling.
    const { engine } = engineOf((_req, call) =>
      call === 0
        ? { text: 'poison', usage: U(Number.NaN, 5) }
        : { text: 'expensive', usage: U(25_000_000, 0) },
    );
    const outcome = await engine.run(hostileThenSane, undefined, { budgetUsd: 1 }).result;
    expect(outcome.value).toContain('violated the Usage invariant');
    // The $25 second call crossed the intact $1 ceiling at settle: the
    // run must end exhausted, not ok, and the total must be finite.
    expect(outcome.status).toBe('exhausted');
    expect(Number.isFinite(outcome.cost.totalUsd)).toBe(true);
  });
});

describe('hostile mid-stream usage events', () => {
  function midStreamAdapter(deltas: Array<Partial<Usage>>, finish: Usage): ProviderAdapter {
    return {
      id: 'fake',
      caps: () => roomyCaps,
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(_req: ChatRequest): AsyncIterable<ChatEvent> {
        yield { type: 'text-delta', text: 'done' };
        for (const delta of deltas) {
          yield { type: 'usage', usage: delta };
        }
        yield { type: 'finish', finish: { reason: 'stop' }, usage: finish };
      },
    };
  }

  function engineWith(adapter: ProviderAdapter) {
    return createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: { routing: { loop: 'fake:model' } },
    });
  }

  it('a NaN delta is sanitized before the budget and fails the call loud', async () => {
    const engine = engineWith(
      midStreamAdapter([{ inputTokens: Number.NaN, outputTokens: 5 }], U(10, 5)),
    );
    const outcome = await engine.run(oneAgent, undefined, { budgetUsd: 1 }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('mid-stream usage event carried invalid inputTokens');
    expect(Number.isFinite(outcome.cost.totalUsd)).toBe(true);
  });

  it('a negative delta cannot credit the budget', async () => {
    // Before the fix this credited -$25 and a later $25 turn fit under
    // the $1 ceiling. The delta now floors to zero and the call errors.
    const engine = engineWith(midStreamAdapter([{ inputTokens: -25_000_000 }], U(10, 5)));
    const outcome = await engine.run(oneAgent, undefined, { budgetUsd: 1 }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('mid-stream usage event carried invalid inputTokens');
    expect(outcome.cost.totalUsd).toBeGreaterThanOrEqual(0);
  });

  it('a fractional delta is repaired upward and flagged', async () => {
    const engine = engineWith(midStreamAdapter([{ outputTokens: 2.5 }], U(10, 5)));
    const outcome = await engine.run(oneAgent, undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('mid-stream usage event carried invalid outputTokens');
  });

  it('a delta carrying only cache tokens is NOT clamped away by the subset rule', async () => {
    // A mid-stream event legitimately reports cache tokens without
    // restating the full input in the same event; the per-field delta
    // repair must keep the cache debit instead of zeroing it. The finish
    // total confirms the same shape, so the call succeeds and the write
    // premium is charged.
    const engine = createEngine({
      adapters: [
        midStreamAdapter([{ inputTokens: 10_000 }, { cacheWriteTokens: 4000 }], {
          inputTokens: 10_000,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 4000,
        }),
      ],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: { routing: { loop: 'fake:model' } },
      pricing: {
        pricingVersion: 'p',
        models: {
          'fake:model': {
            inputUsdPerMTok: 100,
            outputUsdPerMTok: 0,
            cacheWriteUsdPerMTok: 125,
          },
        },
      },
    });
    const outcome = await engine.run(oneAgent, undefined).result;
    expect(outcome.status).toBe('ok');
    // 6000 uncached input at 100/Mtok + 4000 writes at 125/Mtok.
    expect(outcome.cost.totalUsd).toBeCloseTo((6000 / 1e6) * 100 + (4000 / 1e6) * 125, 12);
    expect(outcome.usage.cacheWriteTokens).toBe(4000);
  });

  it('mid-stream over-reported cache reads cannot underbill: the excess re-debits as input and fails loud', async () => {
    // The finish total is authoritative. A hostile adapter prices the
    // whole prompt at the cache-read discount mid-stream, then tells the
    // truth (no reads) at finish. The reconciliation re-debits the
    // over-reported reads at the full input rate and fails the call.
    const engine = createEngine({
      adapters: [
        midStreamAdapter([{ inputTokens: 1_000_000, cacheReadTokens: 1_000_000 }], {
          inputTokens: 1_000_000,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        }),
      ],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: { routing: { loop: 'fake:model' } },
      pricing: {
        pricingVersion: 'p',
        models: {
          'fake:model': { inputUsdPerMTok: 10, outputUsdPerMTok: 0, cacheReadUsdPerMTok: 1 },
        },
      },
    });
    const outcome = await engine.run(oneAgent, undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('exceeded the finish total');
    // 1M reads debited at $1/Mtok mid-stream, then the same 1M re-debited
    // as input at $10/Mtok: the run pays at least the full input rate,
    // never just the discount.
    expect(outcome.cost.totalUsd).toBeGreaterThanOrEqual(10);
  });

  it('a usage event after finish is never read, so a hostile adapter cannot zero its bill', async () => {
    // Stop consumption at the terminal (v1.27.0 review P2): the runtime
    // closes the adapter iterator at the first finish, so the revision
    // attempt is never even pulled and the authoritative bill stands.
    let pulledPastFinish = false;
    const engine = engineWith({
      id: 'fake',
      caps: () => roomyCaps,
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(): AsyncIterable<ChatEvent> {
        yield { type: 'finish', finish: { reason: 'stop' }, usage: U(1_000_000, 500) };
        pulledPastFinish = true;
        yield { type: 'usage', usage: { inputTokens: 0, outputTokens: 0 } };
      },
    });
    const outcome = await engine.run(oneAgent, undefined).result;
    expect(outcome.status).toBe('ok');
    expect(pulledPastFinish).toBe(false);
    // The authoritative finish usage stands: 1M input priced, not zeroed.
    expect(outcome.usage.inputTokens).toBe(1_000_000);
    expect(outcome.cost.totalUsd).toBeGreaterThan(0);
  });

  it('a second finish event is never read: the first terminal is authoritative', async () => {
    let pulledPastFinish = false;
    const engine = engineWith({
      id: 'fake',
      caps: () => roomyCaps,
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(): AsyncIterable<ChatEvent> {
        yield { type: 'finish', finish: { reason: 'stop' }, usage: U(1_000_000, 500) };
        pulledPastFinish = true;
        yield { type: 'finish', finish: { reason: 'stop' }, usage: U(1, 1) };
      },
    });
    const outcome = await engine.run(oneAgent, undefined).result;
    expect(outcome.status).toBe('ok');
    expect(pulledPastFinish).toBe(false);
    expect(outcome.usage.inputTokens).toBe(1_000_000);
  });

  it('an accessor-based usage object cannot vary its answers between validation and use', async () => {
    // The classic TOCTOU: valid on the read the validator makes, garbage
    // on the read the accumulator makes. The runtime snapshots the
    // object first, so both boundaries see the same detached values.
    let outputReads = 0;
    const hostileUsage = {
      inputTokens: 10,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      get outputTokens(): number {
        outputReads += 1;
        return outputReads <= 2 ? 5 : Number.NaN;
      },
    } as unknown as Usage;
    const engine = engineWith({
      id: 'fake',
      caps: () => roomyCaps,
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(): AsyncIterable<ChatEvent> {
        yield { type: 'finish', finish: { reason: 'stop' }, usage: hostileUsage };
      },
    });
    const outcome = await engine.run(oneAgent, undefined).result;
    expect(outcome.status).toBe('ok');
    expect(Number.isFinite(outcome.cost.totalUsd)).toBe(true);
    expect(outcome.usage.outputTokens).toBe(5);
  });

  it('a count beyond the safe integer range is rejected before it can overflow accumulators', async () => {
    const engine = engineWith({
      id: 'fake',
      caps: () => roomyCaps,
      // eslint-disable-next-line @typescript-eslint/require-await
      async *stream(): AsyncIterable<ChatEvent> {
        yield {
          type: 'finish',
          finish: { reason: 'stop' },
          usage: U(Number.MAX_VALUE, 0),
        };
      },
    });
    const outcome = await engine.run(oneAgent, undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('safe integer range');
    expect(Number.isFinite(outcome.cost.totalUsd)).toBe(true);
  });
});

describe('RunBudget defensive backstops', () => {
  it('spentUsd stays finite and monotone under fuzzed hostile usage', () => {
    let seed = 0x51c6a3;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 0x80000000;
      return seed / 0x80000000;
    };
    const hostile = (): number => {
      const roll = next();
      if (roll < 0.12) return Number.NaN;
      if (roll < 0.24) return Number.POSITIVE_INFINITY;
      if (roll < 0.36) return -Math.floor(next() * 1e9);
      if (roll < 0.5) return next() * 1000;
      return Math.floor(next() * 100_000);
    };
    const budget = new RunBudget({
      ceilingUsd: 1_000_000,
      priceUsd: (_servedBy: ModelRef, usage: Usage) =>
        (usage.inputTokens / 1_000_000) * 2.5 + (usage.outputTokens / 1_000_000) * 15,
    });
    let previous = budget.spent().usd;
    for (let i = 0; i < 400; i += 1) {
      const usage: Usage = {
        inputTokens: hostile(),
        outputTokens: hostile(),
        cacheReadTokens: hostile(),
        cacheWriteTokens: hostile(),
      };
      budget.onUsage(usage, 'fake:model');
      const current = budget.spent().usd;
      expect(Number.isFinite(current)).toBe(true);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
    const usage = budget.spent().usage;
    for (const value of Object.values(usage)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it('a price function returning NaN or negative charges zero and says so once', () => {
    const events: Array<{ type: string } & Record<string, unknown>> = [];
    const budget = new RunBudget({
      ceilingUsd: 1,
      events: { emit: (body) => events.push(body) },
      priceUsd: () => Number.NaN,
    });
    budget.onUsage(U(1000, 10), 'bad:model');
    budget.onUsage(U(1000, 10), 'bad:model');
    expect(budget.spent().usd).toBe(0);
    const errors = events.filter((e) => e.type === 'log' && e.level === 'error');
    expect(errors).toHaveLength(1);
    expect(String(errors[0]?.msg)).toContain('price function returned NaN');

    const crediting = new RunBudget({ ceilingUsd: 1, priceUsd: () => -5 });
    crediting.onUsage(U(1000, 10), 'bad:model');
    expect(crediting.spent().usd).toBe(0);
  });

  it('a NaN or negative price folds the slice as unpriced, never poisoning the CostReport', async () => {
    // The whole-run fold must also be robust: a broken price row routes
    // to CostReport.unpriced instead of a NaN or negative totalUsd.
    const engine = createEngine({
      adapters: [
        scriptedAdapter(() => ({ text: 'done', usage: U(1000, 10) }), { caps: roomyCaps }),
      ],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: { routing: { loop: 'fake:model' } },
      pricing: {
        pricingVersion: 'p',
        models: { 'fake:model': { inputUsdPerMTok: Number.NaN, outputUsdPerMTok: 0 } },
      },
    });
    const outcome = await engine.run(oneAgent, undefined).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.cost.totalUsd).toBe(0);
    expect(Number.isFinite(outcome.cost.totalUsd)).toBe(true);
    expect(outcome.cost.unpriced.length).toBeGreaterThan(0);
  });

  it('rejects NaN and negative ceilings and resume seeds up front', () => {
    expect(() => new RunBudget({ ceilingUsd: Number.NaN })).toThrow(ConfigError);
    expect(() => new RunBudget({ ceilingUsd: -1 })).toThrow(ConfigError);
    expect(
      () =>
        new RunBudget({
          seed: { usd: Number.NaN, usage: U(0, 0), agentsSpawned: 0 },
        }),
    ).toThrow(ConfigError);
    expect(
      () =>
        new RunBudget({
          seed: { usd: -0.5, usage: U(0, 0), agentsSpawned: 0 },
        }),
    ).toThrow(ConfigError);
    const budget = new RunBudget({ ceilingUsd: 1 });
    expect(() => budget.openAccount('child', { ceilingUsd: Number.NaN })).toThrow(ConfigError);
    // A NaN seeded through sanitization instead of rejection would have
    // silently uncapped the run; a valid seed still works.
    const seeded = new RunBudget({
      ceilingUsd: 1,
      seed: { usd: 0.25, usage: U(10, 5), agentsSpawned: 1 },
    });
    expect(seeded.spent().usd).toBe(0.25);
  });
});

describe('approximate usage surfacing (v1.39.0 review)', () => {
  it('a ceiling severed turn raises usageApprox on the cost report, agent:end, and run:end', async () => {
    // estCost fits under the 0.3 ceiling so the agent is ADMITTED; then the
    // 400k input (0.4 USD at 1 USD/Mtok) reported mid turn crosses the
    // ceiling and severs the turn before any finish, so its usage is
    // estimated rather than reported by the provider (the ctx layer 3
    // sever shape). The cancelled terminal carries usageApprox, which the
    // report and both events raise.
    const adapter = scriptedAdapter(
      () => ({ text: 'partial', usage: U(400_000, 0), hangMs: 2_000 }),
      { caps: roomyCaps },
    );
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const severing = defineWorkflow({ name: 'severing' }, (ctx) =>
      ctx.agent('go', { estCost: 0.01 }),
    );
    const handle = engine.run(severing, undefined, { budgetUsd: 0.3 });
    let agentEndApprox: boolean | undefined;
    let sawAgentEnd = false;
    let runEndApprox: boolean | undefined;
    handle.on('agent:end', (e) => {
      sawAgentEnd = true;
      agentEndApprox = e.usageApprox;
    });
    handle.on('run:end', (e) => {
      runEndApprox = e.usageApprox;
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('exhausted');
    expect(sawAgentEnd).toBe(true);
    expect(outcome.cost.usageApprox).toBe(true);
    expect(agentEndApprox).toBe(true);
    expect(runEndApprox).toBe(true);
  }, 10_000);

  it('an exact turn the provider reported leaves usageApprox absent everywhere', async () => {
    const { engine } = engineOf(() => ({ text: 'done', usage: U(1000, 10) }));
    const handle = engine.run(oneAgent, undefined);
    let agentEndApprox: boolean | undefined;
    let sawAgentEnd = false;
    let runEndApprox: boolean | undefined;
    handle.on('agent:end', (e) => {
      sawAgentEnd = true;
      agentEndApprox = e.usageApprox;
    });
    handle.on('run:end', (e) => {
      runEndApprox = e.usageApprox;
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(sawAgentEnd).toBe(true);
    expect(outcome.cost.usageApprox).toBeUndefined();
    expect(agentEndApprox).toBeUndefined();
    expect(runEndApprox).toBeUndefined();
  });
});
