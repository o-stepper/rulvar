import { describe, expect, it, vi } from 'vitest';

import type { WorkflowEvent } from '../l0/events.js';
import { ConfigError } from '../l0/errors.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter, testCaps } from './test-harness.js';

describe('createEngine and engine.run (M1-T11)', () => {
  it('runs a workflow end to end with outcome, usage, and cost report', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'hello' }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'greeter' }, async (ctx) => {
      return ctx.phase('greet', () => ctx.agent('say hello'));
    });
    const handle = engine.run(wf, undefined);
    expect(handle.runId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('hello');
    expect(outcome.usage.inputTokens).toBe(10);
    expect(outcome.cost.totalUsd).toBeGreaterThan(0);
    expect(outcome.cost.byModel['fake:model']).toBeGreaterThan(0);
    expect(outcome.cost.byPhase.greet).toBeGreaterThan(0);
    expect(outcome.cost.byRole.loop).toBeGreaterThan(0);
    expect(outcome.cost.orchestrator).toEqual({
      spentUsd: 0,
      share: 0,
      wakes: 0,
      forcedFinish: false,
      reserveUsedUsd: 0,
    });
    expect(outcome.dropped).toEqual([]);
    expect(outcome.pending).toEqual([]);
  });

  it('streams events with monotonic seq and correct span parentage', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'hello' }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'spans' }, async (ctx) => {
      return ctx.phase('review', () => ctx.agent('inside phase'));
    });
    const handle = engine.run(wf, undefined);
    const events: WorkflowEvent[] = [];
    for await (const event of handle.events) {
      events.push(event);
    }
    await handle.result;

    const seqs = events.map((e) => e.seq);
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
    expect(events[0]?.type).toBe('run:start');
    expect(events.at(-1)?.type).toBe('run:end');

    const runStart = events.find((e) => e.type === 'run:start');
    const phaseStart = events.find((e) => e.type === 'phase:start');
    const agentStart = events.find((e) => e.type === 'agent:start');
    const agentEnd = events.find((e) => e.type === 'agent:end');
    // run > phase > agent.
    expect(runStart?.parentSpanId).toBeUndefined();
    expect(phaseStart?.parentSpanId).toBe(runStart?.spanId);
    expect(agentStart?.parentSpanId).toBe(phaseStart?.spanId);
    expect(agentEnd?.spanId).toBe(agentStart?.spanId);
    expect(agentEnd && 'entryRef' in agentEnd && typeof agentEnd.entryRef === 'number').toBe(true);
  });

  it('on() delivers typed events and unsubscribes', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'x' }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      await ctx.agent('one');
      await ctx.agent('two');
      return null;
    });
    const seen: string[] = [];
    const handle = engine.run(wf, undefined);
    const unsubscribe = handle.on('agent:end', (e) => {
      seen.push(e.status);
      unsubscribe();
    });
    await handle.result;
    expect(seen).toEqual(['ok']);
  });

  it('reports exhausted over error with evidence and a complete cost report', async () => {
    // The first agent's real spend (600k input tokens at 1 USD/MTok)
    // crosses the 0.5 USD ceiling; the second admission is blocked and
    // BudgetExhaustedError unwinds the body into outcome 'exhausted'.
    const adapter = scriptedAdapter(() => ({
      text: 'x',
      usage: { inputTokens: 600_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      await ctx.agent('a', { estCost: 0.01 });
      await ctx.agent('b', { estCost: 0.01 });
      return 'never reached';
    });
    const outcome = await engine.run(wf, undefined, { budgetUsd: 0.5 }).result;
    expect(outcome.status).toBe('exhausted');
    expect(outcome.value).toBeUndefined();
    expect(outcome.error?.code).toBe('budget_exhausted');
    expect(outcome.cost.totalUsd).toBeGreaterThan(0.5);
  });

  it('cancel() settles the run as cancelled with journaled cancelled agents', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'slow', hangMs: 5_000 }));
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => ctx.agent('long'));
    const handle = engine.run(wf, undefined);
    await new Promise((resolve) => setTimeout(resolve, 30));
    await handle.cancel('operator stop');
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    expect(outcome.error?.message).toContain('operator stop');
    const entries = await store.load(handle.runId);
    expect(entries.some((e) => e.kind === 'agent' && e.status === 'cancelled')).toBe(true);
  });

  it('a crossed run deadline cancels with the deadline in the outcome error', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'slow', hangMs: 5_000 }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => ctx.agent('long'));
    const deadlineAt = new Date(Date.now() + 40).toISOString();
    const outcome = await engine.run(wf, undefined, { deadlineAt }).result;
    expect(outcome.status).toBe('cancelled');
    expect(outcome.error?.message).toContain(deadlineAt);
  });

  it('two engines in one process are fully isolated', async () => {
    const adapterA = scriptedAdapter(() => ({ text: 'from A' }));
    const adapterB = scriptedAdapter(() => ({ text: 'from B' }), {
      caps: testCaps({ pricing: { inputUsdPerMTok: 100, outputUsdPerMTok: 100 } }),
    });
    const engineA = createEngine({
      adapters: [adapterA],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const engineB = createEngine({
      adapters: [adapterB],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => ctx.agent('go'));
    const [a, b] = await Promise.all([
      engineA.run(wf, undefined).result,
      engineB.run(wf, undefined).result,
    ]);
    expect(a.value).toBe('from A');
    expect(b.value).toBe('from B');
    expect(b.cost.totalUsd).toBeGreaterThan(a.cost.totalUsd);
    expect(adapterA.calls).toHaveLength(1);
    expect(adapterB.calls).toHaveLength(1);
  });

  it('writes RunMeta with the run-to-definition binding fields', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'x' }));
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'meta-wf' }, async (ctx) => ctx.agent('x'));
    const handle = engine.run(wf, undefined, { name: 'nightly', tags: ['ci'] });
    await handle.result;
    const [meta] = await store.listRuns({ name: 'nightly' });
    expect(meta).toMatchObject({
      runId: handle.runId,
      status: 'ok',
      workflowName: 'meta-wf',
      tags: ['ci'],
    });
    expect(meta?.workflowHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('invalid args settle as a config error outcome', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'x' }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow(
      {
        name: 'w',
        args: { type: 'object', required: ['pr'], properties: { pr: { type: 'number' } } },
      },
      (_ctx, args: unknown) => Promise.resolve(args),
    );
    const outcome = await engine.run(wf, { wrong: true }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.code).toBe('config');
  });

  it('a live external resolution rides the event stream as resolution:applied', async () => {
    // The busy branch keeps the run's activity above zero, so the
    // external resolves on the LIVE path instead of quiescing the run
    // into 'suspended'. Operators resolve by key, no event needed.
    const adapter = scriptedAdapter(() => ({ text: 'x', hangMs: 300 }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'ext-live' }, async (ctx) => {
      const [gate] = await ctx.parallel<unknown>([
        () =>
          ctx.awaitExternal<{ approved: boolean }>('gate', {
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['approved'],
              properties: { approved: { type: 'boolean' } },
            },
          }),
        () => ctx.agent('keep the run busy'),
      ]);
      return gate;
    });
    const handle = engine.run(wf, undefined);
    const events: WorkflowEvent[] = [];
    const pump = (async () => {
      for await (const event of handle.events) {
        events.push(event);
      }
    })();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const resolution = await handle.resolveExternal('gate', { approved: true });
    expect(resolution.applied).toBe(true);
    const outcome = await handle.result;
    await pump;
    expect(outcome.status).toBe('ok');
    const applied = events.filter((event) => event.type === 'resolution:applied');
    expect(applied).toHaveLength(1);
    expect(applied[0]).toMatchObject({ by: 'external' });
    expect(typeof (applied[0] as { targetRef?: unknown }).targetRef).toBe('number');
    expect(typeof (applied[0] as { entryRef?: unknown }).entryRef).toBe('number');
  });

  it('bare engine.resume of a non-compiled run rejects with a typed ConfigError', async () => {
    // Since M6-T02 only compiled runs with a persisted source resume
    // without a workflow value.
    const engine = createEngine({ adapters: [] });
    await expect(engine.resume('run-1').result).rejects.toThrow(ConfigError);
  });

  it('dev mode warns once on bare Date.now inside a run, never for ctx.now', async () => {
    const warnings: string[] = [];
    const spy = vi
      .spyOn(process, 'emitWarning')
      .mockImplementation((warning: string | Error, opts?: { code?: string }) => {
        warnings.push(typeof opts?.code === 'string' ? opts.code : String(warning));
      });
    try {
      const adapter = scriptedAdapter(() => ({ text: 'x' }));
      const engine = createEngine({
        adapters: [adapter],
        defaults: { routing: { loop: 'fake:model' } },
      });
      const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
        ctx.now();
        Date.now();
        Date.now();
        return ctx.agent('x');
      });
      await engine.run(wf, undefined).result;
      expect(warnings.filter((code) => code === 'RULVAR_BARE_DATE_NOW')).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });
});
