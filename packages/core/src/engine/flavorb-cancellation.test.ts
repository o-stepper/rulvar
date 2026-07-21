/**
 * Flavor B decision-wait cancellation (v1.35.0 review P1): a parked
 * escalation wait observes the branch/run signal, so every cancellation
 * channel settles the run in bounded time instead of waiting out an
 * arbitrarily far escalation deadline. Each case previously hung: the
 * waiter had only resolve, held activity, and ignored every abort.
 */
import { describe, expect, it } from 'vitest';

import type { EscalationDecision } from '../runtime/escalation.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { scriptedAdapter } from './test-harness.js';

const ESCALATE_ARGS = {
  kind: 'scope_bigger',
  scopeDelta: 'the migration spans nine services, not one',
  revisedEstimate: { usd: 40, turns: 90 },
  blockers: ['schema ownership unclear'],
};

function escalatingAdapter() {
  return scriptedAdapter((req, call) => {
    const prompt = JSON.stringify(req.messages[0]);
    if (prompt.includes('fail-me')) {
      return {
        error: { code: 'auth', message: 'sibling failed on purpose', retryable: false },
        hangMs: 100,
      };
    }
    return call === 0 || prompt.includes('escalate-me')
      ? { toolCall: { name: 'escalate', args: ESCALATE_ARGS } }
      : { text: 'finished normally instead' };
  });
}

function flavorBWorkflow(deadlineMs: number) {
  return defineWorkflow({ name: 'flavor-b-cancel' }, async (ctx) => {
    const result = await ctx.agent('do the migration', {
      escalation: { flavor: 'B', deadlineMs },
      result: 'full',
    });
    return (result as { status: string }).status;
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('flavor B decision wait cancellation (v1.35.0 review P1)', () => {
  it('control: a short deadline still self-resolves by the defaultDecision', async () => {
    const adapter = escalatingAdapter();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(flavorBWorkflow(40), undefined).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('escalated');
  });

  it('control: a live decision still wins against a far deadline', async () => {
    const adapter = escalatingAdapter();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
      onEscalation: (): EscalationDecision => ({ kind: 'accept' }),
    });
    const outcome = await engine.run(flavorBWorkflow(120_000), undefined).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('escalated');
  }, 10_000);

  it('handle.cancel() after the park settles the run cancelled in bounded time', async () => {
    const adapter = escalatingAdapter();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const handle = engine.run(flavorBWorkflow(120_000), undefined);
    await sleep(50);
    await handle.cancel('operator stop');
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    expect(adapter.calls).toHaveLength(1);
  }, 15_000);

  it('a RunOptions.signal abort after the park settles the run cancelled', async () => {
    const adapter = escalatingAdapter();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const controller = new AbortController();
    const handle = engine.run(flavorBWorkflow(120_000), undefined, {
      signal: controller.signal,
    });
    await sleep(50);
    controller.abort('host stop');
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
  }, 15_000);

  it('RunOptions.deadlineAt after the park cancels instead of waiting out the escalation deadline', async () => {
    const adapter = escalatingAdapter();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const handle = engine.run(flavorBWorkflow(120_000), undefined, {
      deadlineAt: new Date(Date.now() + 200).toISOString(),
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
  }, 15_000);

  it('a failed sibling in strict ctx.parallel aborts the parked branch in bounded time', async () => {
    const adapter = escalatingAdapter();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'flavor-b-sibling' }, async (ctx) => {
      return ctx.parallel([
        () =>
          ctx.agent('escalate-me', {
            escalation: { flavor: 'B', deadlineMs: 120_000 },
            result: 'full',
          }),
        () => ctx.agent('fail-me'),
      ] as Array<() => Promise<unknown>>);
    });
    const outcome = await engine.run(wf, undefined).result;
    // The sibling failure surfaces; the parked flavor B branch no longer
    // pins the run until its escalation deadline.
    expect(outcome.status).toBe('error');
  }, 15_000);

  it('an abort racing the live decision settles exactly once without unhandled rejections', async () => {
    const adapter = escalatingAdapter();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
      onEscalation: async (): Promise<EscalationDecision> => {
        await sleep(60);
        return { kind: 'accept' };
      },
    });
    const handle = engine.run(flavorBWorkflow(120_000), undefined);
    await sleep(50);
    // The decision resolution and the cancel land within milliseconds of
    // each other; first-closing-wins must keep exactly one terminal.
    await handle.cancel('racing cancel');
    const outcome = await handle.result;
    expect(['cancelled', 'ok']).toContain(outcome.status);
    const second = await handle.result;
    expect(second.status).toBe(outcome.status);
  }, 15_000);
});
