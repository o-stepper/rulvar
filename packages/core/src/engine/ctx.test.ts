import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { BudgetExhaustedError, NonSerializableValueError } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import { AgentCallError, defineWorkflow, executeWorkflow, type Ctx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

const verdictSchema = z.strictObject({ verdict: z.enum(['pass', 'fail']) });

function agentEntries(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.filter((e) => e.kind === 'agent');
}

describe('ctx.agent (M1-T07)', () => {
  it('journals a two-phase agent entry and returns the typed value', async () => {
    const adapter = scriptedAdapter(() => ({ text: '{"verdict":"pass"}' }));
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', extract: 'fake:model' },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      const out = await ctx.agent('judge this', { schema: verdictSchema });
      expectTypeOf(out).toEqualTypeOf<{ verdict: 'pass' | 'fail' }>();
      return out;
    });
    const result = await executeWorkflow(internals, wf, undefined);
    expect(result).toEqual({ verdict: 'pass' });

    const entries = await store.load('test-run');
    const agents = agentEntries(entries);
    expect(agents).toHaveLength(2);
    expect(agents[0]?.status).toBe('running');
    expect(agents[1]?.status).toBe('ok');
    expect(agents[1]?.ref).toBe(agents[0]?.seq);
    expect(agents[1]?.value).toEqual({ verdict: 'pass' });
    expect(agents[1]?.servedBy).toBe('fake:model');
    expect(agents[1]?.transcriptRef).toMatch(/^test-run\//);
    expect(agents[0]?.scope).toBe('');
  });

  it('onError null returns null and surfaces the loss in run.dropped', async () => {
    const adapter = scriptedAdapter(() => ({
      error: { code: 'agent', message: 'boom', retryable: false, data: { kind: 'transport' } },
    }));
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      return ctx.agent('x', { onError: 'null', label: 'risky' });
    });
    const result = await executeWorkflow(internals, wf, undefined);
    expect(result).toBeNull();
    expect(internals.dropped).toHaveLength(1);
    expect(internals.dropped[0]).toMatchObject({
      source: 'agent-onerror-null',
      scope: '',
      label: 'risky',
    });
    expect(internals.dropped[0]?.entryRef).toBeGreaterThan(0);
  });

  it('lenient errorPolicy defaults onError to null', async () => {
    const adapter = scriptedAdapter(() => ({
      error: { code: 'agent', message: 'boom', retryable: false, data: { kind: 'transport' } },
    }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      errorPolicy: 'lenient',
    });
    const wf = defineWorkflow({ name: 'w', errorPolicy: 'lenient' }, async (ctx) => {
      const out = await ctx.agent('x');
      expectTypeOf(out).toEqualTypeOf<string | null>();
      return out;
    });
    expect(await executeWorkflow(internals, wf, undefined)).toBeNull();
  });

  it('strict value form rejects with the typed AgentError carrier', async () => {
    const adapter = scriptedAdapter(() => ({
      error: { code: 'agent', message: 'boom', retryable: true, data: { kind: 'transport' } },
    }));
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => ctx.agent('x'));
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toSatisfy((thrown) => {
      expect(thrown).toBeInstanceOf(AgentCallError);
      const err = thrown as AgentCallError;
      expect(err.kind).toBe('transport');
      expect(err.retryable).toBe(true);
      expect(err.result.status).toBe('error');
      return true;
    });
  });

  it('result full returns the complete AgentResult without rejecting', async () => {
    const adapter = scriptedAdapter(() => ({
      error: { code: 'agent', message: 'boom', retryable: false, data: { kind: 'transport' } },
    }));
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      const full = await ctx.agent('x', { result: 'full' });
      return full.status;
    });
    expect(await executeWorkflow(internals, wf, undefined)).toBe('error');
  });

  it('opts.key pins identity; identical calls get ordinals 0 and 1', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'hi' }));
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      await ctx.agent('same prompt');
      await ctx.agent('same prompt');
      await ctx.agent('volatile: 12345', { key: 'stable-key' });
      return 'done';
    });
    await executeWorkflow(internals, wf, undefined);
    const running = agentEntries(await store.load('test-run')).filter(
      (e) => e.status === 'running',
    );
    expect(running).toHaveLength(3);
    expect(running[0]?.key).toBe(running[1]?.key);
    expect([running[0]?.ordinal, running[1]?.ordinal]).toEqual([0, 1]);
    expect(running[2]?.key).not.toBe(running[0]?.key);
  });

  it('journals memoizeOutcome as a policy field on the running entry', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'hi' }));
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) =>
      ctx.agent('x', { memoizeOutcome: true }),
    );
    await executeWorkflow(internals, wf, undefined);
    const running = agentEntries(await store.load('test-run'))[0] as JournalEntry & {
      memoizeOutcome?: boolean;
    };
    expect(running.memoizeOutcome).toBe(true);
  });

  it('resolves profiles by agentType and rejects unknown agentType', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'hi' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      profiles: { reviewer: { model: 'fake:model', effort: 'high' } },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      await ctx.agent('x', { agentType: 'reviewer' });
      return 'ok';
    });
    expect(await executeWorkflow(internals, wf, undefined)).toBe('ok');
    expect(adapter.calls[0]?.effort).toBe('high');

    const bad = defineWorkflow({ name: 'w2' }, async (ctx) =>
      ctx.agent('x', { agentType: 'missing' }),
    );
    await expect(executeWorkflow(internals, bad, undefined)).rejects.toThrow('unknown agentType');
  });
});

describe('ctx.parallel and the scheduler (M1-T07/T08)', () => {
  it('resolves in source order and journals per-branch scopes', async () => {
    const adapter = scriptedAdapter((req) => ({
      text: `echo:${(req.messages[0]?.parts[0] as { text: string }).text}`,
      hangMs: (req.messages[0]?.parts[0] as { text: string }).text === 'a' ? 30 : 0,
    }));
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      return ctx.parallel([() => ctx.agent('a'), () => ctx.agent('b')]);
    });
    const result = await executeWorkflow(internals, wf, undefined);
    expect(result).toEqual(['echo:a', 'echo:b']);
    const scopes = agentEntries(await store.load('test-run'))
      .filter((e) => e.status === 'running')
      .map((e) => e.scope)
      .sort();
    expect(scopes).toEqual(['par:0:0', 'par:0:1']);
  });

  it('a failing strict branch aborts its siblings, written cancelled', async () => {
    const adapter = scriptedAdapter((req) => {
      const text = (req.messages[0]?.parts[0] as { text: string }).text;
      if (text === 'fail-fast') {
        return {
          error: { code: 'agent', message: 'x', retryable: false, data: { kind: 'transport' } },
        };
      }
      return { text: 'slow', hangMs: 2_000 };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      return ctx.parallel([() => ctx.agent('slow-one'), () => ctx.agent('fail-fast')]);
    });
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toBeInstanceOf(AgentCallError);
    const terminals = agentEntries(await store.load('test-run')).filter(
      (e) => e.status !== 'running',
    );
    const statuses = terminals.map((e) => e.status).sort();
    expect(statuses).toEqual(['cancelled', 'error']);
  });

  it('settle mode returns all Settled outcomes and never aborts', async () => {
    const adapter = scriptedAdapter((req) => {
      const text = (req.messages[0]?.parts[0] as { text: string }).text;
      if (text === 'bad') {
        return {
          error: { code: 'agent', message: 'x', retryable: false, data: { kind: 'transport' } },
        };
      }
      return { text: 'fine' };
    });
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      return ctx.parallel([() => ctx.agent('ok-one'), () => ctx.agent('bad')], { settle: true });
    });
    const settled = await executeWorkflow(internals, wf, undefined);
    expect(settled[0]).toEqual({ status: 'ok', value: 'fine' });
    expect(settled[1]?.status).toBe('error');
    expect(internals.dropped.some((d) => d.source === 'parallel-settled')).toBe(true);
  });

  it('a limit branch does not abort siblings; parallel rejects after all settle', async () => {
    const adapter = scriptedAdapter((req) => {
      const text = (req.messages[0]?.parts[0] as { text: string }).text;
      return { text: text === 'limited' ? 'not json' : 'fine', hangMs: text === 'slow' ? 40 : 0 };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', extract: 'fake:model' },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      return ctx.parallel<unknown>([
        () => ctx.agent('limited', { schema: verdictSchema, limits: { maxTurns: 1 } }),
        () => ctx.agent('slow'),
      ]);
    });
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toSatisfy((thrown) => {
      expect(thrown).toBeInstanceOf(AgentCallError);
      expect((thrown as AgentCallError).result.status).toBe('limit');
      return true;
    });
    const terminals = agentEntries(await store.load('test-run')).filter(
      (e) => e.status !== 'running',
    );
    expect(terminals.map((e) => e.status).sort()).toEqual(['limit', 'ok']);
  });
});

describe('ctx.pipeline (M1-T07/T08)', () => {
  it('journals per (stage, ORIGINAL item) scope and drops failing items', async () => {
    const adapter = scriptedAdapter((req) => {
      const text = (req.messages[0]?.parts[0] as { text: string }).text;
      if (text.includes('poison')) {
        return {
          error: {
            code: 'agent',
            message: 'bad item',
            retryable: false,
            data: { kind: 'transport' },
          },
        };
      }
      return { text: `${text}+` };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      return ctx.pipeline(
        ['a', 'poison', 'c'],
        (item: string) => ctx.agent(item),
        (item: string) => ctx.agent(item),
      );
    });
    const results = await executeWorkflow(internals, wf, undefined);
    expect(results).toEqual(['a++', 'c++']);
    expect(internals.dropped).toHaveLength(1);
    expect(internals.dropped[0]?.source).toBe('pipeline');
    expect(internals.dropped[0]?.scope).toBe('pipe:0:1');
    const scopes = agentEntries(await store.load('test-run'))
      .filter((e) => e.status === 'running')
      .map((e) => e.scope)
      .sort();
    expect(scopes).toEqual(['pipe:0:0', 'pipe:0:1', 'pipe:0:2', 'pipe:1:0', 'pipe:1:2']);
  });

  it('collect returns dropped items alongside results', async () => {
    const adapter = scriptedAdapter((req) => {
      const text = (req.messages[0]?.parts[0] as { text: string }).text;
      if (text === 'bad') {
        return {
          error: { code: 'agent', message: 'x', retryable: false, data: { kind: 'transport' } },
        };
      }
      return { text: 'ok' };
    });
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      return ctx.pipeline(['good', 'bad'], (item: string) => ctx.agent(item), {
        onItemError: 'collect',
      });
    });
    const out = await executeWorkflow(internals, wf, undefined);
    expect(out.results).toEqual(['ok']);
    expect(out.dropped).toHaveLength(1);
  });

  it('throw mode rejects the pipeline with the first stage error', async () => {
    const adapter = scriptedAdapter(() => ({
      error: { code: 'agent', message: 'x', retryable: false, data: { kind: 'transport' } },
    }));
    const { internals } = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      return ctx.pipeline(['a'], (item: string) => ctx.agent(item), { onItemError: 'throw' });
    });
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toBeInstanceOf(AgentCallError);
  });
});

describe('ctx.step, phase, shims (M1-T07)', () => {
  it('journals step results with deps keying', async () => {
    const { internals, store } = makeInternals({});
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      const a = await ctx.step('fetch', () => Promise.resolve({ n: 1 }), { deps: [1] });
      const b = await ctx.step('fetch', () => Promise.resolve({ n: 2 }), { deps: [2] });
      return [a.n, b.n];
    });
    expect(await executeWorkflow(internals, wf, undefined)).toEqual([1, 2]);
    const steps = (await store.load('test-run')).filter((e) => e.kind === 'step');
    expect(steps).toHaveLength(4);
    // Different deps produce different keys, each with ordinal 0.
    const runningKeys = steps.filter((e) => e.status === 'running').map((e) => e.key);
    expect(new Set(runningKeys).size).toBe(2);
  });

  it('rejects non-serializable step values at the call site', async () => {
    const { internals } = makeInternals({});
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      return ctx.step('bad', () => Promise.resolve(new Date() as unknown as string));
    });
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toBeInstanceOf(
      NonSerializableValueError,
    );
  });

  it('journals step errors then rethrows', async () => {
    const { internals, store } = makeInternals({});
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      return ctx.step('boom', () => Promise.reject(new Error('step failed')));
    });
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toThrow('step failed');
    const terminal = (await store.load('test-run')).find(
      (e) => e.kind === 'step' && e.status === 'error',
    );
    expect(terminal?.error?.message).toBe('step failed');
  });

  it('phase is cosmetic for identity and structural for cost attribution', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'hi' }));
    const first = makeInternals({ adapters: [adapter], routing: { loop: 'fake:model' } });
    const wfWithPhase = defineWorkflow({ name: 'w' }, async (ctx) => {
      return ctx.phase('review', () => ctx.agent('same prompt'));
    });
    await executeWorkflow(first.internals, wfWithPhase, undefined);
    const keyWithPhase = agentEntries(await first.store.load('test-run'))[0]?.key;

    const adapter2 = scriptedAdapter(() => ({ text: 'hi' }));
    const second = makeInternals({ adapters: [adapter2], routing: { loop: 'fake:model' } });
    const wfBare = defineWorkflow({ name: 'w' }, async (ctx) => ctx.agent('same prompt'));
    await executeWorkflow(second.internals, wfBare, undefined);
    const keyBare = agentEntries(await second.store.load('test-run'))[0]?.key;

    expect(keyWithPhase).toBe(keyBare);
    expect(first.internals.cost.byPhase.get('review')).toBeGreaterThan(0);
    expect(first.events.ofType('phase:start')).toHaveLength(1);
  });

  it('shims journal rand entries bound by (scope, ordinal) deterministically across runs', async () => {
    async function runOnce(): Promise<{
      entries: JournalEntry[];
      values: [number, number, string];
    }> {
      const { internals, store } = makeInternals({});
      const wf = defineWorkflow({ name: 'w' }, (ctx) => {
        const t = ctx.now();
        const r = ctx.random('jitter');
        const u = ctx.uuid();
        return Promise.resolve([t, r, u] as [number, number, string]);
      });
      const values = await executeWorkflow(internals, wf, undefined);
      return { entries: (await store.load('test-run')).filter((e) => e.kind === 'rand'), values };
    }
    const first = await runOnce();
    const second = await runOnce();
    expect(first.entries).toHaveLength(3);
    // The BINDING (scope, key, ordinal) is deterministic across identical
    // runs; the journaled values differ until resume replays them (M2).
    expect(first.entries.map((e) => [e.scope, e.key, e.ordinal])).toEqual(
      second.entries.map((e) => [e.scope, e.key, e.ordinal]),
    );
    const randPayload = first.entries[1]?.value as { subtype: string; key?: string };
    expect(randPayload).toMatchObject({ subtype: 'random', key: 'jitter' });
    expect(first.values[1]).toBeGreaterThanOrEqual(0);
    expect(first.values[1]).toBeLessThan(1);
  });
});

describe('three-layer budget (M1-T09)', () => {
  it('layer 1 blocks admission at the ceiling with a typed BudgetExhaustedError', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'hi', hangMs: 20 }));
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      budgetUsd: 1,
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      // Admissions happen synchronously in branch order: the first two
      // commit 0.6 USD each; the third sees spent + committedReserve
      // (1.2 USD) at the 1 USD ceiling and is blocked before any journal
      // entry.
      return ctx.parallel([
        () => ctx.agent('c1', { estCost: 0.6 }),
        () => ctx.agent('c2', { estCost: 0.6 }),
        () => ctx.agent('c3', { estCost: 0.6 }),
      ]);
    });
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toBeInstanceOf(
      BudgetExhaustedError,
    );
    // The blocked third spawn journaled nothing.
    const runnings = agentEntries(await store.load('test-run')).filter(
      (e) => e.status === 'running',
    );
    expect(runnings.length).toBeLessThanOrEqual(2);
  });

  it('enforces the engine lifetime spawn cap', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'hi' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      lifetimeSpawnCap: 2,
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      await ctx.agent('a');
      await ctx.agent('b');
      await ctx.agent('c');
      return 'never';
    });
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toThrow('lifetime spawn cap');
  });

  it('layer 3 severs a live stream at the ceiling with usageApprox', async () => {
    // Each usage event reports 200k input tokens at 1 USD/MTok = 0.2 USD;
    // the ceiling is 0.3 USD, crossed mid-stream on the second event.
    const adapter = scriptedAdapter(() => ({
      text: 'partial',
      usage: { inputTokens: 400_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      hangMs: 2_000,
    }));
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      budgetUsd: 0.3,
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => ctx.agent('big', { estCost: 0.01 }));
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toBeInstanceOf(
      BudgetExhaustedError,
    );
    const terminal = agentEntries(await store.load('test-run')).find((e) => e.status !== 'running');
    expect(terminal?.status).toBe('cancelled');
    expect(terminal?.usageApprox).toBe(true);
  }, 10_000);

  it('exposes spent and remaining through ctx.budget', async () => {
    const adapter = scriptedAdapter(() => ({
      text: 'hi',
      usage: {
        inputTokens: 1_000_000,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      budgetUsd: 10,
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      await ctx.agent('a', { estCost: 0.01 });
      const spent = ctx.budget.spent();
      const remaining = ctx.budget.remaining();
      return { spentUsd: spent.usd, remainingUsd: remaining?.usd, spawned: spent.agentsSpawned };
    });
    const out = (await executeWorkflow(internals, wf, undefined)) as {
      spentUsd: number;
      remainingUsd: number;
      spawned: number;
    };
    expect(out.spentUsd).toBeCloseTo(1);
    expect(out.remainingUsd).toBeCloseTo(9);
    expect(out.spawned).toBe(1);
  });

  it('remaining() is null without a ceiling', async () => {
    const { internals } = makeInternals({});
    const wf = defineWorkflow({ name: 'w' }, (ctx) => Promise.resolve(ctx.budget.remaining()));
    expect(await executeWorkflow(internals, wf, undefined)).toBeNull();
  });
});

describe('defineWorkflow (M1-T07)', () => {
  it('validates args against the declared schema', async () => {
    const { internals } = makeInternals({});
    const wf = defineWorkflow({ name: 'w', args: z.object({ pr: z.number() }) }, (_ctx, args) =>
      Promise.resolve(args.pr),
    );
    expect(await executeWorkflow(internals, wf, { pr: 42 })).toBe(42);
    await expect(
      executeWorkflow(internals, wf, { pr: 'not-a-number' } as unknown as { pr: number }),
    ).rejects.toThrow('do not validate');
  });

  it('types the ctx by error policy through the literal generic', () => {
    defineWorkflow({ name: 'strict-wf' }, (ctx) => {
      expectTypeOf(ctx).toMatchTypeOf<Ctx<'strict'>>();
      return Promise.resolve(0);
    });
    defineWorkflow({ name: 'lenient-wf', errorPolicy: 'lenient' }, (ctx) => {
      expectTypeOf(ctx).toMatchTypeOf<Ctx<'lenient'>>();
      return Promise.resolve(0);
    });
    expect(true).toBe(true);
  });
});
