/**
 * Numeric configuration intake (v1.34.0 review P2-1/P2-2/P2-3): every
 * public numeric knob refuses NaN and friends as a typed ConfigError
 * before any journal entry or provider dispatch, deadlineAt is a strict
 * ISO 8601 grammar, and far-future deadlines survive the Node timer
 * ceiling instead of cancelling the run immediately.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { MAX_TIMER_DELAY_MS } from '../l0/validate-numbers.js';
import { validateUsageLimits } from '../runtime/usage-limits.js';
import { RunBudget } from './budget.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';

const singleAgentWf = defineWorkflow({ name: 'single' }, async (ctx) => {
  return ctx.agent('say the answer');
});

const fakeEngine = (extra?: Record<string, unknown>) => {
  const adapter = scriptedAdapter(() => ({ text: 'answer' }));
  const engine = createEngine({
    adapters: [adapter],
    defaults: { routing: { loop: 'fake:model' } },
    ...extra,
  });
  return { adapter, engine };
};

describe('createEngine numeric option validation (v1.34.0 review P2-3/P2-4)', () => {
  it.each([Number.NaN, 0, -1, 1.5])('refuses concurrency.perRun %s', (perRun) => {
    expect(() => fakeEngine({ concurrency: { perRun } })).toThrow(ConfigError);
    expect(() => fakeEngine({ concurrency: { perRun } })).toThrow(/concurrency\.perRun/);
  });

  it('refuses a NaN perProvider cap naming the adapter id', () => {
    expect(() => fakeEngine({ concurrency: { perProvider: { fake: Number.NaN } } })).toThrow(
      /concurrency\.perProvider\['fake'\] must be a positive integer/,
    );
  });

  it.each([Number.NaN, -1, 1.5])('refuses budgetDefaults.lifetimeSpawnCap %s', (cap) => {
    expect(() => fakeEngine({ budgetDefaults: { lifetimeSpawnCap: cap } })).toThrow(
      /lifetimeSpawnCap must be a nonnegative integer/,
    );
  });

  it('accepts lifetimeSpawnCap 0 (a run that must not spawn)', () => {
    expect(() => fakeEngine({ budgetDefaults: { lifetimeSpawnCap: 0 } })).not.toThrow();
  });

  it.each([Number.NaN, 0, 2.5, 5])('refuses budgetDefaults.maxDepth %s', (maxDepth) => {
    expect(() => fakeEngine({ budgetDefaults: { maxDepth } })).toThrow(ConfigError);
  });

  it('accepts the documented maxDepth ceiling', () => {
    expect(() => fakeEngine({ budgetDefaults: { maxDepth: 4 } })).not.toThrow();
  });

  it.each([Number.NaN, 0, 1.5])('refuses budgetDefaults.childBudgetFraction %s', (fraction) => {
    expect(() => fakeEngine({ budgetDefaults: { childBudgetFraction: fraction } })).toThrow(
      /childBudgetFraction must be a fraction in \(0, 1\]/,
    );
  });

  it.each([Number.NaN, -1])('refuses budgetDefaults.flatReserveUsd %s', (flatReserveUsd) => {
    expect(() => fakeEngine({ budgetDefaults: { flatReserveUsd } })).toThrow(
      /flatReserveUsd must be a finite nonnegative number/,
    );
  });

  it('refuses malformed engine defaults.limits', () => {
    expect(() =>
      fakeEngine({
        defaults: { routing: { loop: 'fake:model' }, limits: { maxTurns: Number.NaN } },
      }),
    ).toThrow(/createEngine defaults\.limits\.maxTurns must be a positive integer/);
  });

  it('refuses malformed profile numerics naming the profile', () => {
    const profile = (patch: Record<string, unknown>) =>
      fakeEngine({
        defaults: { routing: { loop: 'fake:model' }, profiles: { writer: patch } },
      });
    expect(() => profile({ estCost: -1 })).toThrow(
      /defaults\.profiles\['writer'\]\.estCost must be a finite nonnegative number/,
    );
    expect(() => profile({ limits: { maxOutputTokensPerTurn: -1 } })).toThrow(
      /defaults\.profiles\['writer'\]\.limits\.maxOutputTokensPerTurn/,
    );
    expect(() => profile({ escalation: { flavor: 'B', deadlineMs: Number.NaN } })).toThrow(
      /defaults\.profiles\['writer'\]\.escalation\.deadlineMs must be a positive integer/,
    );
    expect(() => profile({ compaction: { threshold: 1.2 } })).toThrow(
      /defaults\.profiles\['writer'\]\.compaction\.threshold must be a fraction in \(0, 1\]/,
    );
  });
});

describe('engine.run option validation (v1.34.0 review P2-1/P2-3)', () => {
  it.each([Number.NaN, -1, Number.POSITIVE_INFINITY])(
    'refuses budgetUsd %s synchronously with zero dispatches',
    (budgetUsd) => {
      const { adapter, engine } = fakeEngine();
      expect(() => engine.run(singleAgentWf, undefined, { budgetUsd })).toThrow(
        /RunOptions\.budgetUsd must be a finite nonnegative number/,
      );
      expect(adapter.calls).toHaveLength(0);
    },
  );

  it('refuses malformed run limits synchronously with zero dispatches', () => {
    const { adapter, engine } = fakeEngine();
    expect(() =>
      engine.run(singleAgentWf, undefined, { limits: { maxOutputTokensPerTurn: -1 } }),
    ).toThrow(/RunOptions\.limits\.maxOutputTokensPerTurn must be a positive integer/);
    expect(() =>
      engine.run(singleAgentWf, undefined, { limits: { maxTurns: Number.NaN } }),
    ).toThrow(/RunOptions\.limits\.maxTurns/);
    expect(adapter.calls).toHaveLength(0);
  });

  it('bounds streamIdleTimeoutMs by the Node timer maximum instead of tripping instantly', () => {
    const { adapter, engine } = fakeEngine();
    expect(() =>
      engine.run(singleAgentWf, undefined, {
        limits: { streamIdleTimeoutMs: MAX_TIMER_DELAY_MS + 1 },
      }),
    ).toThrow(/streamIdleTimeoutMs must be an integer between 1 and 2147483647 ms/);
    expect(adapter.calls).toHaveLength(0);
  });
});

describe('RunOptions.deadlineAt grammar (v1.34.0 review P2-1)', () => {
  it.each([
    'not-an-iso-date',
    '2026-02-30T12:00:00Z',
    '2026-07-21T10:00:00',
    '2026-07-21',
    '1234567890',
  ])('refuses %s synchronously with zero dispatches', (deadlineAt) => {
    const { adapter, engine } = fakeEngine();
    expect(() => engine.run(singleAgentWf, undefined, { deadlineAt })).toThrow(ConfigError);
    expect(() => engine.run(singleAgentWf, undefined, { deadlineAt })).toThrow(
      /RunOptions\.deadlineAt must be an ISO 8601 date-time/,
    );
    expect(adapter.calls).toHaveLength(0);
  });

  it('accepts Z, numeric offsets, and minute precision', async () => {
    for (const deadlineAt of [
      new Date(Date.now() + 120_000).toISOString(),
      '2100-07-21T12:00:00+02:00',
      '2100-07-21T10:00Z',
    ]) {
      const { adapter, engine } = fakeEngine();
      const outcome = await engine.run(singleAgentWf, undefined, { deadlineAt }).result;
      expect(outcome.status).toBe('ok');
      expect(adapter.calls).toHaveLength(1);
    }
  });

  it('a deadline already in the past cancels the run: a crossed deadline is valid', async () => {
    // The adapter holds its turn open so the deadline timer (armed for
    // the next macrotask) beats the run instead of racing a same-tick
    // completion.
    const adapter = scriptedAdapter(() => ({ text: 'answer', hangMs: 2_000 }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(singleAgentWf, undefined, {
      deadlineAt: '2020-01-01T00:00:00Z',
    }).result;
    expect(outcome.status).toBe('cancelled');
  });

  it('a deadline beyond the Node timer maximum does NOT cancel the run (v1.34.0 review P2-2)', async () => {
    const { adapter, engine } = fakeEngine();
    const farOut = new Date(Date.now() + MAX_TIMER_DELAY_MS + 86_400_000).toISOString();
    const outcome = await engine.run(singleAgentWf, undefined, { deadlineAt: farOut }).result;
    expect(outcome.status).toBe('ok');
    expect(adapter.calls).toHaveLength(1);
  });
});

describe('ctx.agent numeric option validation (v1.34.0 review P2-3)', () => {
  it.each([Number.NaN, -10])('refuses estCost %s before any dispatch', async (estCost) => {
    const { adapter, engine } = fakeEngine();
    const wf = defineWorkflow({ name: 'reserve' }, async (ctx) => {
      return ctx.agent('one unit please', { estCost });
    });
    const outcome = await engine.run(wf, undefined, { budgetUsd: 0.5 }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toMatch(/estCost option must be a finite nonnegative number/);
    expect(adapter.calls).toHaveLength(0);
  });

  it('the review estCost -10 sibling bypass is refused, the honest sibling still refuses on the ceiling', async () => {
    const { adapter, engine } = fakeEngine();
    const messages: string[] = [];
    const wf = defineWorkflow({ name: 'bypass' }, async (ctx) => {
      const held = ctx.agent('hold this slot open', { estCost: -10 }).catch((error: Error) => {
        messages.push(error.message);
      });
      const sibling = ctx.agent('one unit please', { estCost: 1 }).catch((error: Error) => {
        messages.push(error.message);
      });
      await Promise.all([held, sibling]);
      return 'survived';
    });
    const outcome = await engine.run(wf, undefined, { budgetUsd: 0.5 }).result;
    // The honest sibling's ceiling refusal exhausts the root account, so
    // the run reports exhausted; the point of the regression is that the
    // NEGATIVE reserve no longer unlocks anything and nobody dispatches.
    expect(outcome.status).toBe('exhausted');
    expect(messages).toHaveLength(2);
    expect(messages.join('\n')).toMatch(/estCost option must be a finite nonnegative number/);
    expect(messages.join('\n')).toMatch(/does not fit the ceiling/);
    expect(adapter.calls).toHaveLength(0);
  });

  it('refuses malformed per-call limits before any dispatch', async () => {
    const { adapter, engine } = fakeEngine();
    const wf = defineWorkflow({ name: 'calllimits' }, async (ctx) => {
      return ctx.agent('bounded please', { limits: { maxTurns: Number.NaN } });
    });
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toMatch(/limits option\.maxTurns must be a positive integer/);
    expect(adapter.calls).toHaveLength(0);
  });

  it('refuses a malformed escalation deadlineMs before any dispatch', async () => {
    const { adapter, engine } = fakeEngine();
    const wf = defineWorkflow({ name: 'escnan' }, async (ctx) => {
      return ctx.agent('escalate maybe', {
        result: 'full',
        escalation: { flavor: 'B', deadlineMs: Number.NaN },
      });
    });
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toMatch(/escalation\.deadlineMs must be a positive integer/);
    expect(adapter.calls).toHaveLength(0);
  });
});

describe('queued spawns drain on cancel (v1.34.0 review P2-4)', () => {
  it('a run queued behind perRun 1 settles cancelled instead of hanging', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'answer', hangMs: 30_000 }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
      concurrency: { perRun: 1 },
    });
    const wf = defineWorkflow({ name: 'queued' }, async (ctx) => {
      return Promise.all([ctx.agent('first holds the slot'), ctx.agent('second queues')]);
    });
    const handle = engine.run(wf, undefined);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await handle.cancel('test cancel');
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    // Only the slot holder dispatched; the queued spawn left the FIFO
    // without ever reaching the adapter.
    expect(adapter.calls).toHaveLength(1);
  }, 15_000);

  it('a run queued behind a perProvider cap settles cancelled too', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'answer', hangMs: 30_000 }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
      concurrency: { perProvider: { fake: 1 } },
    });
    const wf = defineWorkflow({ name: 'providerqueued' }, async (ctx) => {
      return Promise.all([ctx.agent('first holds the key'), ctx.agent('second queues')]);
    });
    const handle = engine.run(wf, undefined);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await handle.cancel('test cancel');
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    expect(adapter.calls).toHaveLength(1);
  }, 15_000);
});

describe('validateUsageLimits (v1.34.0 review P2-3)', () => {
  it.each([
    [{ maxTurns: Number.NaN }, /maxTurns must be a positive integer; got NaN/],
    [{ maxTurns: 0 }, /maxTurns must be a positive integer; got 0/],
    [{ maxToolCalls: -1 }, /maxToolCalls must be a nonnegative integer; got -1/],
    [{ maxOutputTokensPerTurn: -1 }, /maxOutputTokensPerTurn must be a positive integer/],
    [{ maxOutputTokensPerTurn: 1.5 }, /maxOutputTokensPerTurn must be a positive integer/],
    [{ timeoutMs: Number.POSITIVE_INFINITY }, /timeoutMs must be a positive integer/],
    [
      { streamIdleTimeoutMs: MAX_TIMER_DELAY_MS + 1 },
      /streamIdleTimeoutMs must be an integer between 1 and 2147483647 ms/,
    ],
    [{ streamIdleTimeoutMs: 0 }, /streamIdleTimeoutMs must be an integer between 1 and/],
    [{ noProgressTurns: Number.NaN }, /noProgressTurns must be a positive integer/],
  ] as const)('refuses %j', (limits, message) => {
    expect(() => validateUsageLimits(limits, 'site')).toThrow(ConfigError);
    expect(() => validateUsageLimits(limits, 'site')).toThrow(message);
  });

  it('accepts every documented boundary', () => {
    expect(() =>
      validateUsageLimits(
        {
          maxTurns: 1,
          maxToolCalls: 0,
          maxOutputTokensPerTurn: 1,
          timeoutMs: MAX_TIMER_DELAY_MS * 10,
          streamIdleTimeoutMs: MAX_TIMER_DELAY_MS,
          noProgressTurns: 1,
        },
        'site',
      ),
    ).not.toThrow();
  });
});

describe('RunBudget.admitSpawn reserve backstop (v1.34.0 review P2-3)', () => {
  it.each([Number.NaN, -1, Number.NEGATIVE_INFINITY])('refuses a %s reserve', (reserve) => {
    const budget = new RunBudget({ ceilingUsd: 1 });
    expect(() => budget.admitSpawn(reserve)).toThrow(
      /admission reserve .* must be a finite nonnegative number/,
    );
  });

  it('still admits a zero reserve', () => {
    const budget = new RunBudget({ ceilingUsd: 1 });
    expect(() => budget.admitSpawn(0)).not.toThrow();
  });
});

describe('the v1.35.0 public option sweep tails', () => {
  it.each([[Number.NaN], [-0.5], [Number.POSITIVE_INFINITY]])(
    'refuses escalation.minSpendUsd %s before any call (the gate compares against it)',
    async (minSpendUsd) => {
      const { adapter, engine } = fakeEngine();
      const wf = defineWorkflow({ name: 'min-spend' }, async (ctx) =>
        ctx.agent('go', { escalation: { minSpendUsd }, result: 'full' }),
      );
      const outcome = await engine.run(wf, undefined).result;
      expect(outcome.status).toBe('error');
      expect(outcome.error?.message).toMatch(
        /escalation\.minSpendUsd must be a finite nonnegative number/,
      );
      expect(adapter.calls).toHaveLength(0);
    },
  );

  it('refuses a malformed profile minSpendUsd at createEngine', () => {
    expect(() =>
      fakeEngine({
        defaults: {
          routing: { loop: 'fake:model' },
          profiles: { helper: { description: 'h', escalation: { minSpendUsd: Number.NaN } } },
        },
      }),
    ).toThrow(/escalation\.minSpendUsd must be a finite nonnegative number/);
  });
});
