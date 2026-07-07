import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { AgentResult } from '../runtime/agent-loop.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

const verdict = z.strictObject({ verdict: z.enum(['pass', 'fail']) });

/** A model that never produces valid structured output: pure stall. */
function stallingAdapter() {
  return scriptedAdapter(() => ({ text: 'let me think about this some more...' }));
}

function fullResult(value: unknown): AgentResult<unknown> {
  return value as AgentResult<unknown>;
}

describe('no-progress abort class (M3-T08)', () => {
  it('aborts with the dedicated class after N progress-free continuing turns', async () => {
    const adapter = stallingAdapter();
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', extract: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('judge this', {
        schema: verdict,
        limits: { noProgressTurns: 2 },
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.abortClass).toBe('no-progress');
    expect(result.error?.kind).toBe('terminal');
    expect(result.errorMessage).toContain('no-progress abort');
    // Turn 1 lengthens the streak to 1, turn 2 trips the threshold: the
    // third model call never happens.
    expect(adapter.calls).toHaveLength(2);

    await internals.replayer.flush();
    const terminal = internals.replayer
      .snapshot()
      .find((e) => e.kind === 'agent' && e.status === 'limit');
    expect(terminal?.memoizeOutcome).toBe(true);
    expect(terminal?.error?.data).toMatchObject({ abortClass: 'no-progress' });
  });

  it('replays without live calls and never reruns, regardless of user memoize policy', async () => {
    const adapter = stallingAdapter();
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', extract: 'fake:model' },
    });
    // The user explicitly disables memoization: the engine stamp on the
    // terminal still wins for the engine-decided abort class.
    const live = fullResult(
      await createCtx(internals).agent('judge this', {
        schema: verdict,
        limits: { noProgressTurns: 2 },
        memoizeOutcome: false,
        result: 'full',
      }),
    );
    expect(live.abortClass).toBe('no-progress');
    await internals.replayer.flush();
    const prior = await store.load('test-run');

    const replayAdapter = stallingAdapter();
    const { internals: resumed } = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model', extract: 'fake:model' },
      priorEntries: prior,
    });
    const replayed = fullResult(
      await createCtx(resumed).agent('judge this', {
        schema: verdict,
        limits: { noProgressTurns: 2 },
        memoizeOutcome: false,
        result: 'full',
      }),
    );
    expect(replayAdapter.calls).toHaveLength(0);
    expect(replayed.status).toBe('limit');
    expect(replayed.abortClass).toBe('no-progress');
  });

  it('tool-calling turns are progress: the detector never trips a working agent', async () => {
    const { tool } = await import('../tools/tool.js');
    const busy = tool({
      name: 'busy',
      description: 'does things',
      parameters: {},
      execute: () => Promise.resolve('done a thing'),
    });
    const adapter = scriptedAdapter((_req, call) =>
      call < 5 ? { toolCall: { name: 'busy', args: {} } } : { text: 'finished' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('work hard', {
        tools: [busy],
        limits: { noProgressTurns: 2 },
        result: 'full',
      }),
    );
    expect(result.status).toBe('ok');
    expect(result.output).toBe('finished');
    expect(result.abortClass).toBeUndefined();
  });
});

describe('UsageLimits completion (M3-T10)', () => {
  it('maxOutputTokensPerTurn rides every wire request', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'short' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    await createCtx(internals).agent('go', { limits: { maxOutputTokensPerTurn: 77 } });
    expect(adapter.calls[0]?.maxOutputTokens).toBe(77);
  });

  it('maxToolCalls expiry journals terminal limit with paid partial work', async () => {
    const { tool } = await import('../tools/tool.js');
    const busy = tool({
      name: 'busy',
      description: 'does things',
      parameters: {},
      execute: () => Promise.resolve('ok'),
    });
    const adapter = scriptedAdapter(() => ({ toolCall: { name: 'busy', args: {} } }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('work', {
        tools: [busy],
        limits: { maxToolCalls: 2 },
        result: 'full',
      }),
    );
    expect(result.status).toBe('limit');
    expect(result.abortClass).toBeUndefined();
    await internals.replayer.flush();
    const terminal = internals.replayer
      .snapshot()
      .find((e) => e.kind === 'agent' && e.status === 'limit');
    expect(terminal).toBeDefined();
    // An ordinary cap hit carries no engine memoize stamp: it reruns
    // unless the user opted into memoizeOutcome (frozen predicate).
    expect(terminal?.memoizeOutcome).toBeUndefined();
    expect(terminal?.usage?.inputTokens).toBeGreaterThan(0);
  });

  it('a memoized limit replays; an unmemoized one reruns (predicate integration)', async () => {
    const { tool } = await import('../tools/tool.js');
    const spin = tool({
      name: 'spin',
      description: 'keeps the loop going',
      parameters: {},
      execute: () => Promise.resolve('spun'),
    });
    const loopingAdapter = () => scriptedAdapter(() => ({ toolCall: { name: 'spin', args: {} } }));
    const runOnce = async (memoize: boolean) => {
      const adapter = loopingAdapter();
      const { internals, store } = makeInternals({
        adapters: [adapter],
        routing: { loop: 'fake:model' },
      });
      const live = fullResult(
        await createCtx(internals).agent('go', {
          tools: [spin],
          limits: { maxTurns: 1 },
          ...(memoize ? { memoizeOutcome: true } : {}),
          result: 'full',
        }),
      );
      expect(live.status).toBe('limit');
      await internals.replayer.flush();
      return store.load('test-run');
    };

    const memoizedPrior = await runOnce(true);
    const memoizedReplay = loopingAdapter();
    const { internals: memoizedResume } = makeInternals({
      adapters: [memoizedReplay],
      routing: { loop: 'fake:model' },
      priorEntries: memoizedPrior,
    });
    const replayed = fullResult(
      await createCtx(memoizedResume).agent('go', {
        tools: [spin],
        limits: { maxTurns: 1 },
        memoizeOutcome: true,
        result: 'full',
      }),
    );
    expect(replayed.status).toBe('limit');
    expect(memoizedReplay.calls).toHaveLength(0);

    const plainPrior = await runOnce(false);
    const plainReplay = loopingAdapter();
    const { internals: plainResume } = makeInternals({
      adapters: [plainReplay],
      routing: { loop: 'fake:model' },
      priorEntries: plainPrior,
    });
    await createCtx(plainResume).agent('go', {
      tools: [spin],
      limits: { maxTurns: 1 },
      result: 'full',
    });
    // The unmemoized limit reran live (at least one adapter call).
    expect(plainReplay.calls.length).toBeGreaterThan(0);
  });
});

describe('minSpend accumulation (M3-T09)', () => {
  it('scope_bigger passes once accumulated spend crosses minSpendUsd', async () => {
    // testCaps pricing: 1 USD per MTok input, 10 per MTok output; each
    // scripted turn reports 10 in and 5 out = 0.00006 USD. Three turns
    // cross a 0.0001 USD floor.
    const escalateArgs = {
      kind: 'scope_bigger',
      scopeDelta: 'bigger than it looked',
      revisedEstimate: { usd: 2, turns: 10 },
    };
    const adapter = scriptedAdapter(() => ({
      toolCall: { name: 'escalate', args: escalateArgs },
    }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = fullResult(
      await createCtx(internals).agent('go', {
        escalation: { minSpendUsd: 0.0001 },
        result: 'full',
      }),
    );
    expect(result.status).toBe('escalated');
    // The first attempts were re-prompted with "keep working"; the model
    // kept escalating and passed the gate once the spend crossed.
    expect(adapter.calls.length).toBeGreaterThan(1);
    expect(result.escalation?.kind).toBe('scope_bigger');
  });
});
