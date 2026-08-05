/**
 * Admission before egress for the pre-dispatch token count (RV904, the
 * thirteenth experiment's fourth release risk). ctx.agent calls the
 * adapter's optional countTokens with the FULL child prompt to tighten
 * the admission reserve; before this shipped, that network call ran
 * BEFORE the budget decided anything, so a spawn the budget could never
 * admit still sent the prompt to the provider, the call honored no
 * abort signal, and nothing observable recorded the egress. The reserve
 * is monotone in the count, so the smallest reserve any count outcome
 * could produce is computable without the count: if even that floor
 * cannot be admitted, the spawn refuses with zero network calls.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { scriptedAdapter } from './test-harness.js';

type CountCall = { req: ChatRequest; signal: AbortSignal | undefined };

function countingAdapter(
  count: (req: ChatRequest, opts?: { signal?: AbortSignal }) => Promise<number>,
): ReturnType<typeof scriptedAdapter> & { countCalls: CountCall[] } {
  const countCalls: CountCall[] = [];
  const adapter = scriptedAdapter(() => ({ text: 'done' }));
  return Object.assign(adapter, {
    countCalls,
    countTokens: (req: ChatRequest, opts?: { signal?: AbortSignal }): Promise<number> => {
      countCalls.push({ req, signal: opts?.signal });
      return count(req, opts);
    },
  });
}

const echo = defineWorkflow({ name: 'count-admission' }, async (ctx) => await ctx.agent('hi'));

describe('admission before egress (RV904)', () => {
  it('a spawn the budget could never admit makes zero network calls', async () => {
    // The flat-reserve floor (0.5 USD by default) cannot fit a 0.001
    // ceiling under ANY count outcome, so the refusal must precede the
    // count: before RV904 the full child prompt left the process first.
    const adapter = countingAdapter(() => Promise.resolve(10));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(echo, undefined, { budgetUsd: 0.001 }).result;
    expect(outcome.status).toBe('exhausted');
    // The doctrine under test: zero egress of any kind, count included.
    expect(adapter.countCalls).toHaveLength(0);
    expect(adapter.calls).toHaveLength(0);
  });

  it('the count call carries the run signal and a mid-count abort cancels the spawn', async () => {
    let began: (() => void) | undefined;
    const beganPromise = new Promise<void>((resolve) => {
      began = resolve;
    });
    const adapter = countingAdapter(
      (req, opts) =>
        new Promise<number>((resolve, reject) => {
          began?.();
          if (opts?.signal === undefined) {
            // Pre-RV904 shape: no signal to honor; resolve immediately
            // so the red state fails on assertions, not on a timeout.
            resolve(7);
            return;
          }
          opts.signal.addEventListener('abort', () => {
            reject(new Error('count aborted'));
          });
        }),
    );
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const handle = engine.run(echo, undefined, {});
    await beganPromise;
    await handle.cancel('test');
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    // The signal reached the adapter, and the aborted count never fell
    // back to a flat-reserve dispatch: the wire was never touched.
    expect(adapter.calls).toHaveLength(0);
    expect(adapter.countCalls).toHaveLength(1);
    expect(adapter.countCalls[0]?.signal).toBeDefined();
  });

  it('the admission count is observable: an info log names the model and the tokens', async () => {
    const adapter = countingAdapter(() => Promise.resolve(42));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const handle = engine.run(echo, undefined, {});
    const logs: Array<{ msg: string; data?: unknown }> = [];
    handle.on('log', (event) => logs.push({ msg: event.msg, data: event.data }));
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    const line = logs.find((entry) => entry.msg.includes('admission.countTokens'));
    expect(line).toBeDefined();
    expect(line?.msg).toContain('fake:model');
    expect(line?.data).toMatchObject({ model: 'fake:model', inputTokens: 42 });
  });

  it('an explicit estCost is the zero-egress path: the count is never called', async () => {
    const adapter = countingAdapter(() =>
      Promise.reject(new Error('estCost must not reach the adapter count')),
    );
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow(
      { name: 'est-cost' },
      async (ctx) => await ctx.agent('hi', { estCost: 0.01 }),
    );
    const outcome = await engine.run(wf, undefined, { budgetUsd: 5 }).result;
    expect(outcome.status).toBe('ok');
    expect(adapter.countCalls).toHaveLength(0);
  });

  it('a failed count falls back to the flat reserve with a warning, never silently', async () => {
    const adapter = countingAdapter(() => Promise.reject(new Error('count endpoint down')));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const handle = engine.run(echo, undefined, {});
    const warns: string[] = [];
    handle.on('log', (event) => {
      if (event.level === 'warn') {
        warns.push(event.msg);
      }
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(adapter.calls).toHaveLength(1);
    const warn = warns.find((msg) => msg.includes('admission.countTokens'));
    expect(warn).toBeDefined();
    expect(warn).toContain('fake:model');
  });
});

describe('the countTokens policy (RV1804)', () => {
  it("engine-wide 'deny' makes zero count calls and emits the denied control wire", async () => {
    const adapter = countingAdapter(() => Promise.resolve(10));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: 'fake:model' }, countTokens: 'deny' },
    });
    const handle = engine.run(echo, undefined, { budgetUsd: 5 });
    const control: Array<{ controlKind: string; outcome: string }> = [];
    handle.on('control:wire', (event) => control.push(event));
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    // The doctrine under test: the control wire never leaves the process.
    expect(adapter.countCalls).toHaveLength(0);
    expect(adapter.calls).toHaveLength(1);
    expect(control).toEqual([
      expect.objectContaining({ controlKind: 'countTokens', outcome: 'denied' }),
    ]);
  });

  it("a profile 'deny' forbids the probe for its spawns while the engine default allows", async () => {
    const adapter = countingAdapter(() => Promise.resolve(10));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: {
        routing: { loop: 'fake:model' },
        profiles: { frugal: { countTokens: 'deny' } },
      },
    });
    const wf = defineWorkflow(
      { name: 'profile-deny' },
      async (ctx) => await ctx.agent('hi', { agentType: 'frugal' }),
    );
    const outcome = await engine.run(wf, undefined, { budgetUsd: 5 }).result;
    expect(outcome.status).toBe('ok');
    expect(adapter.countCalls).toHaveLength(0);
  });

  it("a profile 'allow' wins over an engine-wide 'deny'", async () => {
    const adapter = countingAdapter(() => Promise.resolve(10));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: {
        routing: { loop: 'fake:model' },
        countTokens: 'deny',
        profiles: { counted: { countTokens: 'allow' } },
      },
    });
    const wf = defineWorkflow(
      { name: 'profile-allow' },
      async (ctx) => await ctx.agent('hi', { agentType: 'counted' }),
    );
    const outcome = await engine.run(wf, undefined, { budgetUsd: 5 }).result;
    expect(outcome.status).toBe('ok');
    expect(adapter.countCalls).toHaveLength(1);
  });

  it('an allowed probe emits the ok control wire carrying the counted tokens', async () => {
    const adapter = countingAdapter(() => Promise.resolve(1234));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const handle = engine.run(echo, undefined, { budgetUsd: 5 });
    const control: Array<{ outcome: string; inputTokens?: number }> = [];
    handle.on('control:wire', (event) => control.push(event));
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(adapter.countCalls).toHaveLength(1);
    expect(control).toEqual([expect.objectContaining({ outcome: 'ok', inputTokens: 1234 })]);
  });

  it('a failed probe emits the failed control wire beside the warning log', async () => {
    const adapter = countingAdapter(() => Promise.reject(new Error('count endpoint down')));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const handle = engine.run(echo, undefined, {});
    const control: Array<{ outcome: string }> = [];
    handle.on('control:wire', (event) => control.push(event));
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(control).toEqual([expect.objectContaining({ outcome: 'failed' })]);
  });

  it('a malformed policy value refuses at createEngine, typed', () => {
    const adapter = countingAdapter(() => Promise.resolve(10));
    expect(() =>
      createEngine({
        adapters: [adapter],
        stores: { journal: new InMemoryStore() },
        defaults: {
          routing: { loop: 'fake:model' },
          countTokens: 'maybe' as unknown as 'allow',
        },
      }),
    ).toThrow(/defaults\.countTokens must be 'allow' or 'deny'/);
    expect(() =>
      createEngine({
        adapters: [adapter],
        stores: { journal: new InMemoryStore() },
        defaults: {
          routing: { loop: 'fake:model' },
          profiles: { p: { countTokens: 'sometimes' as unknown as 'deny' } },
        },
      }),
    ).toThrow(/profiles\['p'\]\.countTokens must be 'allow' or 'deny'/);
  });
});
