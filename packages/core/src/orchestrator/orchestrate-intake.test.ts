/**
 * The orchestrate numeric intake gate (v1.35.0 review P2-2): malformed
 * options refuse SYNCHRONOUSLY at workflow construction, before any
 * journal entry, provider call, or child dispatch. Each rejected value
 * previously slipped through: maxSpawns NaN disabled the spawn cap,
 * 1.5 admitted two spawns, renderBudgetChars NaN disabled the digest
 * bound, and a negative finalize reserve WIDENED the soft cap boundary.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { createEngine } from '../engine/engine.js';
import { defineWorkflow } from '../engine/ctx.js';
import { scriptedAdapter } from '../engine/test-harness.js';
import { makeOrchestratorWorkflow, type OrchestrateOptions } from './orchestrate.js';

describe('orchestrate option intake (v1.35.0 review P2-2)', () => {
  it.each([
    [{ maxSpawns: Number.NaN }, /orchestrate maxSpawns must be a nonnegative integer; got NaN/],
    [{ maxSpawns: Number.POSITIVE_INFINITY }, /maxSpawns must be a nonnegative integer/],
    [{ maxSpawns: -1 }, /maxSpawns must be a nonnegative integer; got -1/],
    [{ maxSpawns: 1.5 }, /maxSpawns must be a nonnegative integer; got 1\.5/],
    [{ renderBudgetChars: Number.NaN }, /renderBudgetChars must be a nonnegative integer/],
    [{ renderBudgetChars: -1 }, /renderBudgetChars must be a nonnegative integer/],
    [{ renderBudgetChars: 32.5 }, /renderBudgetChars must be a nonnegative integer/],
    [{ budget: { capUsd: Number.NaN } }, /budget\.capUsd must be a finite nonnegative number/],
    [{ budget: { capUsd: -0.5 } }, /budget\.capUsd must be a finite nonnegative number/],
    [
      { budget: { capUsd: Number.POSITIVE_INFINITY } },
      /budget\.capUsd must be a finite nonnegative number/,
    ],
    [{ budget: { capFraction: 0 } }, /budget\.capFraction must be a fraction in \(0, 1]; got 0/],
    [{ budget: { capFraction: Number.NaN } }, /budget\.capFraction must be a fraction/],
    [{ budget: { capFraction: 1.5 } }, /budget\.capFraction must be a fraction/],
    [{ budget: { capFraction: -0.2 } }, /budget\.capFraction must be a fraction/],
    [
      { budget: { finalizeReserveUsd: -0.1 } },
      /budget\.finalizeReserveUsd must be a finite nonnegative number/,
    ],
    [
      { budget: { finalizeReserveUsd: Number.NaN } },
      /budget\.finalizeReserveUsd must be a finite nonnegative number/,
    ],
    [{ budget: { finalizeTurns: 0 } }, /budget\.finalizeTurns must be a positive integer/],
    [{ budget: { finalizeTurns: Number.NaN } }, /budget\.finalizeTurns must be a positive integer/],
    [{ budget: { finalizeTurns: 1.5 } }, /budget\.finalizeTurns must be a positive integer/],
    [
      { budget: { atCap: 'explode' as unknown as 'fail-run' } },
      /budget\.atCap must be 'finish-with-partial' or 'fail-run'; got explode/,
    ],
  ] as Array<[OrchestrateOptions, RegExp]>)(
    'refuses %j synchronously at construction',
    (opts, message) => {
      expect(() => makeOrchestratorWorkflow('the goal', opts)).toThrow(ConfigError);
      expect(() => makeOrchestratorWorkflow('the goal', opts)).toThrow(message);
    },
  );

  it('accepts the boundary values', () => {
    expect(() =>
      makeOrchestratorWorkflow('the goal', {
        maxSpawns: 0,
        renderBudgetChars: 0,
        budget: {
          capUsd: 0,
          capFraction: 1,
          finalizeReserveUsd: 0,
          finalizeTurns: 1,
          atCap: 'fail-run',
        },
      }),
    ).not.toThrow();
  });

  it('a malformed ctx.orchestrate refuses before any provider call or orchestrate entry', async () => {
    const adapter = scriptedAdapter(() => {
      throw new Error('must never go live');
    });
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model', orchestrate: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'bad-orchestrate' }, (ctx) =>
      ctx.orchestrate('goal', { maxSpawns: Number.NaN }),
    );
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.code).toBe('config');
    expect(outcome.error?.message).toMatch(/maxSpawns must be a nonnegative integer/);
    expect(adapter.calls).toHaveLength(0);
  });
});
