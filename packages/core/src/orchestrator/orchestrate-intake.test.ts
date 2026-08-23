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
import { preflightEstimate } from '../engine/preflight.js';
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
      /budget\.acceptanceReserve must be 'warn', 'require' or 'checkpoint'; got block/,
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

  it('the fifth experiment regression: green at $4.54 was a lie, $4.82 is the tail', async () => {
    // The exact declared config of the 2026-08-17 comparison run: hold
    // 2.20, judge 0.32 x 2 passes (final stage, armed round),
    // mechanical repair 0.20, round composition 0.78, flat working
    // room 1.00 = 4.82 USD. Preflight (which had no acceptanceReserve
    // arithmetic) passed the plan at a 4.54 cap and the boot refused
    // it typed; the two now share acceptanceTailRequiredUsd, and this
    // fixture pins the refusal at 4.54 plus the exact-fill admission
    // at 4.82.
    const experiment = {
      synthesis: { estCost: 0.78 },
      claimConsistency: {
        stage: 'final' as const,
        onFound: 'repair' as const,
        judge: { estCost: 0.32 },
      },
      finishValidation: {
        validators: [{ name: 'anything', validate: (): { ok: true } => ({ ok: true }) }],
        estRepairCostUsd: 0.2,
      },
    };
    const refuseAdapter = scriptedAdapter(() => {
      throw new Error('must never go live');
    });
    const refuseEngine = createEngine({
      adapters: [refuseAdapter],
      budgetDefaults: { flatReserveUsd: 1.0 },
      defaults: {
        routing: {
          loop: 'fake:model',
          orchestrate: 'fake:model',
          synthesize: 'fake:model',
          extract: 'fake:model',
        },
      },
    });
    const starved = makeOrchestratorWorkflow('audit', {
      ...experiment,
      budget: {
        synthesisReserveUsd: 2.2,
        acceptanceReserve: 'require',
        capUsd: 4.54,
        capFraction: 1.0,
      },
    });
    const refused = await refuseEngine.run(starved, undefined, {
      runId: 'AR-EXP-REFUSE',
      budgetUsd: 10,
    }).result;
    expect(refused.status).toBe('error');
    expect(refused.error?.message ?? '').toContain('4.8200 USD');
    expect(refused.error?.message ?? '').toContain('effective cap 4.5400 USD');
    expect(refuseAdapter.calls).toHaveLength(0);

    let dispatched = 0;
    const fillAdapter = scriptedAdapter(() => {
      dispatched += 1;
      return { toolCall: { name: 'finish', args: { result: 'draft done' } } };
    });
    const fillEngine = createEngine({
      adapters: [fillAdapter],
      budgetDefaults: { flatReserveUsd: 1.0 },
      defaults: {
        routing: {
          loop: 'fake:model',
          orchestrate: 'fake:model',
          synthesize: 'fake:model',
          extract: 'fake:model',
        },
      },
    });
    const exactFill = makeOrchestratorWorkflow('audit', {
      ...experiment,
      budget: {
        synthesisReserveUsd: 2.2,
        acceptanceReserve: 'require',
        capUsd: 4.82,
        capFraction: 1.0,
      },
    });
    const admitted = await fillEngine.run(exactFill, undefined, {
      runId: 'AR-EXP-FILL',
      budgetUsd: 10,
    }).result;
    expect(admitted.error?.message ?? '').not.toContain("acceptanceReserve 'require'");
    expect(dispatched).toBeGreaterThan(0);
  });

  it("counts BOTH passes of stage 'both': the one-pass undercount refuses now", async () => {
    // Under the pre-RV4001 inline formula this config read one judge
    // pass (1.0 + 0.2 + 0.5 = 1.7) and a 1.70 cap admitted at exact
    // fill; the worst case of stage 'both' is two dispatches and the
    // shared calculator refuses the same cap against 1.90.
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
      synthesis: {},
      claimConsistency: { stage: 'both', onFound: 'report', judge: { estCost: 0.2 } },
      budget: {
        synthesisReserveUsd: 1.0,
        acceptanceReserve: 'require',
        capUsd: 1.7,
        capFraction: 1.0,
      },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'AR-BOTH', budgetUsd: 10 }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message ?? '').toContain('x 2 pass(es)');
    expect(outcome.error?.message ?? '').toContain('1.9000 USD');
    expect(adapter.calls).toHaveLength(0);
    const entries = await store.load('AR-BOTH');
    const refusal = entries.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'acceptance_reserve_refused',
    );
    expect((refusal?.value as { judgePasses?: number } | undefined)?.judgePasses).toBe(2);
  });

  it("stage 'both' with an armed round is three passes", async () => {
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
    const wf = makeOrchestratorWorkflow('audit', {
      synthesis: { estCost: 0.15 },
      claimConsistency: { stage: 'both', onFound: 'repair', judge: { estCost: 0.2 } },
      finishValidation: {
        validators: [{ name: 'anything', validate: (): { ok: true } => ({ ok: true }) }],
        estRepairCostUsd: 0.1,
      },
      budget: {
        synthesisReserveUsd: 1.0,
        acceptanceReserve: 'require',
        capUsd: 2.2,
        capFraction: 1.0,
      },
    });
    const outcome = await engine.run(wf, undefined, { runId: 'AR-BOTH3', budgetUsd: 10 }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message ?? '').toContain('x 3 pass(es)');
    expect(outcome.error?.message ?? '').toContain('2.3500 USD');
    expect(adapter.calls).toHaveLength(0);
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

describe('the preflight twin cannot drift (RV4001): one formula, differential grid', () => {
  // For every declared posture, the requiredUsd the RUNTIME journals in
  // its refusal and the requiredUsd the PREFLIGHT acceptanceReserve
  // block reports must be the same number, and the arithmetic line in
  // both messages must be byte identical: the fifth experiment lost a
  // run to exactly this drift (green at $4.54, refused at $4.82).
  interface GridCase {
    name: string;
    capUsd: number;
    requiredUsd: number;
    synthesis?: { estCost?: number };
    claimConsistency?: {
      stage?: 'draft' | 'final' | 'both';
      onFound?: 'report' | 'carry' | 'fail' | 'repair';
      judge?: { estCost?: number };
    };
    estRepairCostUsd?: number;
  }
  const grid: GridCase[] = [
    {
      name: 'final-repair-all-terms',
      capUsd: 2.0,
      requiredUsd: 2.15,
      synthesis: { estCost: 0.15 },
      claimConsistency: { stage: 'final', onFound: 'repair', judge: { estCost: 0.2 } },
      estRepairCostUsd: 0.1,
    },
    {
      name: 'both-report-judge-only',
      capUsd: 1.7,
      requiredUsd: 1.9,
      synthesis: {},
      claimConsistency: { stage: 'both', onFound: 'report', judge: { estCost: 0.2 } },
    },
    {
      name: 'both-repair-all-terms',
      capUsd: 2.2,
      requiredUsd: 2.35,
      synthesis: { estCost: 0.15 },
      claimConsistency: { stage: 'both', onFound: 'repair', judge: { estCost: 0.2 } },
      estRepairCostUsd: 0.1,
    },
    {
      name: 'final-report-one-pass',
      capUsd: 1.5,
      requiredUsd: 1.7,
      synthesis: {},
      claimConsistency: { stage: 'final', onFound: 'report', judge: { estCost: 0.2 } },
    },
    {
      name: 'no-claim-pass-mechanical-only',
      capUsd: 1.4,
      requiredUsd: 1.6,
      synthesis: {},
      estRepairCostUsd: 0.1,
    },
  ];

  const termsLineOf = (text: string): string =>
    /\(synthesisReserveUsd .+? = \d+\.\d{4} USD\)/.exec(text)?.[0] ?? `no terms line in: ${text}`;

  it.each(grid.map((entry) => [entry.name, entry] as const))(
    'runtime and preflight agree on %s',
    async (_name, gridCase) => {
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
      const validators = [{ name: 'anything', validate: (): { ok: true } => ({ ok: true }) }];
      const wf = makeOrchestratorWorkflow('audit', {
        ...(gridCase.synthesis === undefined ? {} : { synthesis: gridCase.synthesis }),
        ...(gridCase.claimConsistency === undefined
          ? {}
          : { claimConsistency: gridCase.claimConsistency }),
        ...(gridCase.estRepairCostUsd === undefined
          ? {}
          : {
              finishValidation: { validators, estRepairCostUsd: gridCase.estRepairCostUsd },
            }),
        budget: {
          synthesisReserveUsd: 1.0,
          acceptanceReserve: 'require',
          capUsd: gridCase.capUsd,
          capFraction: 1.0,
        },
      });
      const outcome = await engine.run(wf, undefined, {
        runId: `AR-GRID-${gridCase.name}`,
        budgetUsd: 10,
      }).result;
      expect(outcome.status).toBe('error');
      const entries = await store.load(`AR-GRID-${gridCase.name}`);
      const refusal = entries.find(
        (entry) =>
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'acceptance_reserve_refused',
      );
      const journaled = refusal?.value as { requiredUsd: number };
      expect(journaled.requiredUsd).toBeCloseTo(gridCase.requiredUsd, 10);

      const report = preflightEstimate({
        engine: {
          adapters: [scriptedAdapter(() => ({ text: 'unused' }))],
          defaults: {
            routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
          },
        },
        run: { budgetUsd: 10 },
        orchestrator: {
          budget: {
            synthesisReserveUsd: 1.0,
            acceptanceReserve: 'require',
            capUsd: gridCase.capUsd,
            capFraction: 1.0,
          },
          ...(gridCase.synthesis === undefined ? {} : { synthesis: gridCase.synthesis }),
          ...(gridCase.claimConsistency === undefined
            ? {}
            : { claimConsistency: gridCase.claimConsistency }),
        },
        ...(gridCase.estRepairCostUsd === undefined
          ? {}
          : {
              finishValidation: { validators, estRepairCostUsd: gridCase.estRepairCostUsd },
            }),
      });
      const block = report.budget.orchestrator?.acceptanceReserve;
      expect(block?.requiredUsd).toBeCloseTo(journaled.requiredUsd, 10);
      expect(block?.fits).toBe(false);
      const finding = report.findings.find((entry) => entry.code === 'acceptance-reserve-unfit');
      expect(finding?.severity).toBe('error');
      // The arithmetic lines are byte identical across the two surfaces.
      expect(termsLineOf(finding?.message ?? '')).toBe(termsLineOf(outcome.error?.message ?? ''));
    },
  );
});
