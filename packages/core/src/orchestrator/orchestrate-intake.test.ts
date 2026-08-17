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
    [
      { budget: { acceptanceReserve: 'block' as unknown as 'require' } },
      /budget\.acceptanceReserve must be 'warn' or 'require'; got block/,
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

describe("the acceptance-path admission reserve (RV3907, budget.acceptanceReserve 'require')", () => {
  const REQUIRE_OPTS = {
    synthesis: { estCost: 0.15 },
    claimConsistency: {
      stage: 'final' as const,
      onFound: 'repair' as const,
      judge: { estCost: 0.2 },
    },
    finishValidation: {
      validators: [{ name: 'anything', validate: (): { ok: true } => ({ ok: true }) }],
      estRepairCostUsd: 0.1,
    },
  };

  it('refuses typed before the first wire when the declared tail does not fit the cap', async () => {
    const adapter = scriptedAdapter(() => {
      throw new Error('must never go live');
    });
    const engine = createEngine({
      adapters: [adapter],
      defaults: {
        routing: {
          loop: 'fake:model',
          orchestrate: 'fake:model',
          synthesize: 'fake:model',
          extract: 'fake:model',
        },
      },
    });
    // Tail: 1.0 hold + 0.2 judge x 2 passes + 0.1 repair + 0.15 round
    // composition + 0.5 working room (flat default) = 2.15 USD against
    // the default-fraction cap min(10 x 0.2) = 2.0.
    const wf = makeOrchestratorWorkflow('audit', {
      ...REQUIRE_OPTS,
      budget: { synthesisReserveUsd: 1.0, acceptanceReserve: 'require' },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'AR-REFUSE', budgetUsd: 10 }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message ?? '').toContain("acceptanceReserve 'require'");
    expect(outcome.error?.message ?? '').toContain('2.1500 USD');
    // Pre-wire by construction: the adapter never dispatched.
    expect(adapter.calls).toHaveLength(0);
  });

  it('admits at exact fill: a cap that exactly covers the declared tail starts the run', async () => {
    let dispatched = 0;
    const adapter = scriptedAdapter(() => {
      dispatched += 1;
      return { toolCall: { name: 'finish', args: { result: 'draft done' } } };
    });
    const engine = createEngine({
      adapters: [adapter],
      defaults: {
        routing: {
          loop: 'fake:model',
          orchestrate: 'fake:model',
          synthesize: 'fake:model',
          extract: 'fake:model',
        },
      },
    });
    const wf = makeOrchestratorWorkflow('audit', {
      ...REQUIRE_OPTS,
      budget: {
        synthesisReserveUsd: 1.0,
        acceptanceReserve: 'require',
        capUsd: 2.15,
        capFraction: 1.0,
      },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'AR-EXACT', budgetUsd: 10 }).result;
    // The gate admitted (the refusal message is absent); whatever the
    // tiny scripted run settles as, wires flowed.
    expect(outcome.error?.message ?? '').not.toContain("acceptanceReserve 'require'");
    expect(dispatched).toBeGreaterThan(0);
  });

  it("the default 'warn' changes nothing: the same starving config starts and dispatches", async () => {
    let dispatched = 0;
    const adapter = scriptedAdapter(() => {
      dispatched += 1;
      return { toolCall: { name: 'finish', args: { result: 'draft done' } } };
    });
    const engine = createEngine({
      adapters: [adapter],
      defaults: {
        routing: {
          loop: 'fake:model',
          orchestrate: 'fake:model',
          synthesize: 'fake:model',
          extract: 'fake:model',
        },
      },
    });
    const wf = makeOrchestratorWorkflow('audit', {
      ...REQUIRE_OPTS,
      budget: { synthesisReserveUsd: 1.0 },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'AR-WARN', budgetUsd: 10 }).result;
    expect(outcome.error?.message ?? '').not.toContain("acceptanceReserve 'require'");
    expect(dispatched).toBeGreaterThan(0);
  });

  it('the refusal journals its arithmetic term by term', async () => {
    const adapter = scriptedAdapter(() => {
      throw new Error('must never go live');
    });
    const { InMemoryStore } = await import('../stores/inmemory.js');
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: {
          loop: 'fake:model',
          orchestrate: 'fake:model',
          synthesize: 'fake:model',
          extract: 'fake:model',
        },
      },
    });
    const wf = makeOrchestratorWorkflow('audit', {
      ...REQUIRE_OPTS,
      budget: { synthesisReserveUsd: 1.0, acceptanceReserve: 'require' },
    });
    await engine.run(wf, undefined, { runId: 'AR-JOURNAL', budgetUsd: 10 }).result;
    const entries = await store.load('AR-JOURNAL');
    const refusal = entries.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'acceptance_reserve_refused',
    );
    expect(refusal).toBeDefined();
    const value = refusal?.value as {
      requiredUsd: number;
      effectiveCapUsd: number;
      judgePasses: number;
      synthesisReserveUsd: number;
    };
    expect(value.requiredUsd).toBeCloseTo(2.15, 10);
    expect(value.effectiveCapUsd).toBeCloseTo(2.0, 10);
    expect(value.judgePasses).toBe(2);
    expect(value.synthesisReserveUsd).toBe(1.0);
  });
});
