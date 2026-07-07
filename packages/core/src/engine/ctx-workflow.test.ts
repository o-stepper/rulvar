import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AdmissionRejectedError, BudgetExhaustedError, ConfigError } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import type { Workflow } from './ctx.js';
import { defineWorkflow, executeWorkflow } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

function childEntries(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.filter((e) => e.kind === 'child');
}

function admissionEntries(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.filter(
    (e) =>
      e.kind === 'decision' &&
      (e.value as { decisionType?: string } | undefined)?.decisionType === 'spawn-admission',
  );
}

const echoChild: Workflow<{ item: string }, string> = defineWorkflow(
  { name: 'echo', args: z.strictObject({ item: z.string() }) },
  (ctx, args) => ctx.step('echo', () => `child saw ${args.item}`),
);

describe('ctx.workflow (M6-T06)', () => {
  it('runs a child under the wf: scope and journals a two-phase child entry', async () => {
    const { internals, store, events } = makeInternals({});
    const wf = defineWorkflow({ name: 'parent' }, async (ctx) => {
      return ctx.workflow(echoChild, { item: 'a' });
    });
    const result = await executeWorkflow(internals, wf, undefined);
    expect(result).toBe('child saw a');

    const entries = await store.load('test-run');
    const children = childEntries(entries);
    expect(children).toHaveLength(2);
    expect(children[0]?.status).toBe('running');
    expect(children[0]?.scope).toBe('');
    expect(children[0]?.value).toEqual({ workflow: 'echo', childScope: 'wf:echo:0' });
    expect(children[1]?.status).toBe('ok');
    expect(children[1]?.ref).toBe(children[0]?.seq);
    expect(children[1]?.value).toBe('child saw a');

    // The child's own work journals under the child scope.
    const steps = entries.filter((e) => e.kind === 'step');
    expect(steps.map((e) => e.scope)).toEqual(['wf:echo:0', 'wf:echo:0']);

    // The carrying spawn-admission decision precedes the dispatch.
    const admissions = admissionEntries(entries);
    expect(admissions).toHaveLength(1);
    expect(admissions[0]?.seq).toBeLessThan(children[0]?.seq ?? 0);
    expect(admissions[0]?.value).toMatchObject({
      decisionType: 'spawn-admission',
      origin: 'ctx.workflow',
      name: 'echo',
      childScope: 'wf:echo:0',
      parentAccountScope: 'run',
    });

    expect(events.ofType('child:start')).toHaveLength(1);
    expect(events.ofType('child:end')[0]).toMatchObject({ workflow: 'echo', status: 'ok' });
  });

  it('counts per-name ordinals within the enclosing scope', async () => {
    const { internals, store } = makeInternals({});
    const wf = defineWorkflow({ name: 'parent' }, async (ctx) => {
      const first = await ctx.workflow(echoChild, { item: 'one' });
      const second = await ctx.workflow(echoChild, { item: 'two' });
      return [first, second];
    });
    const result = await executeWorkflow(internals, wf, undefined);
    expect(result).toEqual(['child saw one', 'child saw two']);
    const entries = await store.load('test-run');
    const running = childEntries(entries).filter((e) => e.status === 'running');
    expect(running.map((e) => (e.value as { childScope: string }).childScope)).toEqual([
      'wf:echo:0',
      'wf:echo:1',
    ]);
  });

  it('resolves the string form against the registry and rejects unknown names', async () => {
    const { internals } = makeInternals({ workflows: { echo: echoChild } });
    const wf = defineWorkflow({ name: 'parent' }, async (ctx) => {
      const value = await ctx.workflow('echo', { item: 'via-name' });
      await expect(ctx.workflow('missing', {})).rejects.toThrow(ConfigError);
      return value;
    });
    await expect(executeWorkflow(internals, wf, undefined)).resolves.toBe('child saw via-name');
  });

  it('validates child args against the declared schema', async () => {
    const { internals } = makeInternals({});
    const wf = defineWorkflow({ name: 'parent' }, async (ctx) => {
      // @ts-expect-error deliberately wrong args shape
      return ctx.workflow(echoChild, { item: 42 });
    });
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toThrow(ConfigError);
  });

  it('rejects a nested child past maxDepth with AdmissionRejectedError and keeps the run alive', async () => {
    const { internals, store } = makeInternals({});
    const nested = defineWorkflow({ name: 'inner' }, async (ctx) => {
      // Depth 2 under the default maxDepth 1: rejected, typed, catchable.
      await expect(ctx.workflow(echoChild, { item: 'deep' })).rejects.toThrow(
        AdmissionRejectedError,
      );
      return 'inner survived';
    });
    const wf = defineWorkflow({ name: 'parent' }, async (ctx) => {
      return ctx.workflow(nested, undefined);
    });
    await expect(executeWorkflow(internals, wf, undefined)).resolves.toBe('inner survived');

    const entries = await store.load('test-run');
    const admissions = admissionEntries(entries);
    expect(admissions).toHaveLength(2);
    const rejected = admissions.find((e) => (e.value as { name?: string }).name === 'echo');
    expect(
      (rejected?.value as { decision: { verdict: { kind: string; reason: { code: string } } } })
        .decision.verdict,
    ).toEqual({ kind: 'reject', reason: { code: 'depth' } });
    // The rejected child never dispatched.
    expect(childEntries(entries).filter((e) => e.status === 'running')).toHaveLength(1);
  });

  it('honors maxDepth 2 for a grandchild', async () => {
    const { internals } = makeInternals({ maxDepth: 2 });
    const nested = defineWorkflow({ name: 'inner' }, async (ctx) => {
      return ctx.workflow(echoChild, { item: 'deep' });
    });
    const wf = defineWorkflow({ name: 'parent' }, (ctx) => ctx.workflow(nested, undefined));
    await expect(executeWorkflow(internals, wf, undefined)).resolves.toBe('child saw deep');
  });

  it('maps budget-class rejections (the lifetime cap) onto BudgetExhaustedError', async () => {
    const { internals } = makeInternals({ lifetimeSpawnCap: 1, flatReserveUsd: 0 });
    const wf = defineWorkflow({ name: 'parent' }, async (ctx) => {
      await ctx.workflow(echoChild, { item: 'first' });
      return ctx.workflow(echoChild, { item: 'second' });
    });
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toThrow(BudgetExhaustedError);
  });

  it('blocks a parallel sibling while an in-flight reserve holds the ceiling', async () => {
    const { internals } = makeInternals({ budgetUsd: 1, flatReserveUsd: 1 });
    let releaseFirst: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const holding = defineWorkflow({ name: 'holding' }, async () => {
      await gate;
      return 'held';
    });
    const wf = defineWorkflow({ name: 'parent' }, (ctx) =>
      ctx.parallel([
        () => ctx.workflow(holding, undefined),
        async () => {
          try {
            // The sibling's committed reserve already fills the ceiling:
            // this admission is rejected while the first child is live.
            return await ctx.workflow(echoChild, { item: 'late' });
          } finally {
            releaseFirst();
          }
        },
      ]),
    );
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toThrow(BudgetExhaustedError);
  });

  it('journals a child body failure as a terminal error entry', async () => {
    const { internals, store, events } = makeInternals({});
    const failing = defineWorkflow({ name: 'failing' }, async () => {
      await Promise.resolve();
      throw new Error('child exploded');
    });
    const wf = defineWorkflow({ name: 'parent' }, (ctx) => ctx.workflow(failing, undefined));
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toThrow('child exploded');
    const terminal = childEntries(await store.load('test-run')).find((e) => e.status !== 'running');
    expect(terminal?.status).toBe('error');
    expect(terminal?.error).toMatchObject({ message: 'child exploded' });
    expect(events.ofType('child:end')[0]).toMatchObject({ status: 'error' });
  });

  it('replays a completed child on resume without re-executing the body', async () => {
    const shared = makeInternals({});
    let bodyRuns = 0;
    const counting = defineWorkflow({ name: 'counting' }, async (ctx) => {
      bodyRuns += 1;
      return ctx.step('compute', () => 'expensive result');
    });
    const wf = defineWorkflow({ name: 'parent' }, (ctx) => ctx.workflow(counting, undefined));
    await executeWorkflow(shared.internals, wf, undefined);
    expect(bodyRuns).toBe(1);

    const priorEntries = [...(await shared.store.load('test-run'))];
    const resumed = makeInternals({ priorEntries, store: shared.store });
    const value = await executeWorkflow(resumed.internals, wf, undefined);
    expect(value).toBe('expensive result');
    // The child forward-matched: the body never re-ran and no duplicate
    // child or spawn-admission entries were appended.
    expect(bodyRuns).toBe(1);
    const after = await shared.store.load('test-run');
    expect(childEntries(after)).toHaveLength(2);
    expect(admissionEntries(after)).toHaveLength(1);
  });

  it('re-delivers a journaled rejection identically on resume without re-evaluation', async () => {
    const first = makeInternals({});
    const nested = defineWorkflow({ name: 'inner' }, async (ctx) => {
      try {
        await ctx.workflow(echoChild, { item: 'deep' });
        return 'admitted';
      } catch (error) {
        return error instanceof AdmissionRejectedError ? 'rejected' : 'other';
      }
    });
    const wf = defineWorkflow({ name: 'parent' }, (ctx) => ctx.workflow(nested, undefined));
    await expect(executeWorkflow(first.internals, wf, undefined)).resolves.toBe('rejected');
    const priorEntries = [...(await first.store.load('test-run'))];

    // Resume with a PERMISSIVE maxDepth: the journaled verdict must win
    // over any re-evaluation (DEF-2: replay never re-evaluates admission).
    const resumed = makeInternals({ priorEntries, store: first.store, maxDepth: 4 });
    await expect(executeWorkflow(resumed.internals, wf, undefined)).resolves.toBe('rejected');
    const after = await first.store.load('test-run');
    expect(admissionEntries(after)).toHaveLength(2);
  });

  it('rolls child agent spend up to the root account', async () => {
    const adapter = scriptedAdapter(() => ({
      text: 'done',
      usage: { inputTokens: 1_000_000, outputTokens: 0 },
    }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      budgetUsd: 100,
    });
    const agentChild = defineWorkflow({ name: 'worker' }, (ctx) => ctx.agent('do work'));
    const wf = defineWorkflow({ name: 'parent' }, (ctx) => ctx.workflow(agentChild, undefined));
    await executeWorkflow(internals, wf, undefined);
    // 1M input tokens at 1 USD/MTok (testCaps pricing).
    expect(internals.budget.spent().usd).toBeCloseTo(1, 5);
    const childView = internals.budget.accountView('wf:worker:0');
    expect(childView?.spentUsd).toBeCloseTo(1, 5);
    expect(childView?.parentScope).toBe('run');
  });

  it('enforces the fraction-derived child ceiling inside the child', async () => {
    const adapter = scriptedAdapter(() => ({
      text: 'done',
      usage: { inputTokens: 2_000_000, outputTokens: 0 },
    }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      budgetUsd: 10,
      flatReserveUsd: 0,
      childBudgetFraction: 0.1,
    });
    // Child ceiling = 0.1 * 10 = 1 USD; the first agent turn costs 2 USD
    // (layer 3 aborts at crossing, layer 2 blocks the next dispatch).
    const hungryChild = defineWorkflow({ name: 'hungry' }, async (ctx) => {
      await ctx.agent('first');
      return ctx.agent('second');
    });
    const wf = defineWorkflow({ name: 'parent' }, async (ctx) => {
      try {
        await ctx.workflow(hungryChild, undefined);
        return 'child ran to completion';
      } catch {
        return 'child was capped';
      }
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('child was capped');
    // The child cap never exhausts the run root.
    expect(internals.budget.exhausted).toBe(false);
    expect(internals.budget.spent().usd).toBeLessThan(10);
  });

  it('lets opts.key replace args in the child identity', async () => {
    const { internals, store } = makeInternals({});
    let runs = 0;
    const child = defineWorkflow({ name: 'keyed' }, async () => {
      runs += 1;
      await Promise.resolve();
      return `run ${String(runs)}`;
    });
    const wf = defineWorkflow({ name: 'parent' }, async (ctx) => {
      return ctx.workflow(child, { attempt: 1 }, { key: 'stable' });
    });
    await executeWorkflow(internals, wf, undefined);

    const priorEntries = [...(await store.load('test-run'))];
    const resumed = makeInternals({ priorEntries, store });
    const wf2 = defineWorkflow({ name: 'parent' }, async (ctx) => {
      // Different args, same key: forward-match replays the first result.
      return ctx.workflow(child, { attempt: 2 }, { key: 'stable' });
    });
    await expect(executeWorkflow(resumed.internals, wf2, undefined)).resolves.toBe('run 1');
    expect(runs).toBe(1);
  });
});
