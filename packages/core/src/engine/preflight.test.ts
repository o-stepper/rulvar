/**
 * The preflight effective-limits estimator (the experiment-review
 * P2.2): the effective merge and reserve chain mirror the runtime
 * layers, the admission projection matches the live engine wave for
 * wave, the weighted tool budget surfaces as the first bottleneck
 * before any run, and the linter findings catch the misconfigurations
 * that used to be runtime-only discoveries. Zero provider dispatches by
 * construction; the two parity tests run a real engine beside the
 * estimate to prove the projection is the engine's own arithmetic.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ModelRef } from '../l0/messages.js';
import type { Pricing } from '../l0/spi/provider.js';
import { dispatchProjectionReserveUsd } from '../orchestrator/admission.js';
import {
  evidencePreservedValidator,
  requiredSectionsValidator,
  wordCountValidator,
} from '../orchestrator/finish-validators.js';
import { finishContract } from '../orchestrator/output-contract.js';
import { orchestrate, orchestratorAdmissionEstCostUsd } from '../orchestrator/orchestrate.js';
import { tool } from '../tools/tool.js';
import { mergeUsageLimits } from '../runtime/usage-limits.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { preflightEstimate } from './preflight.js';
import { scriptedAdapter, testCaps } from './test-harness.js';

const SERVED: ModelRef = 'fake:m1';

describe('preflightEstimate (P2.2)', () => {
  it('projects the admission wave and matches the live engine (criterion 1)', async () => {
    const roles = ['ingest', 'normalize', 'risk', 'compliance', 'pricing', 'audit'];
    const spawns = roles.map((label) => ({ label, estCost: 0.5 }));
    const adapter = scriptedAdapter(() => ({ text: 'done', finish: 'stop' }));
    const engineOptions = {
      adapters: [adapter],
      defaults: { routing: { loop: SERVED } },
    };

    const report = preflightEstimate({
      engine: engineOptions,
      run: { budgetUsd: 1.2 },
      spawns,
    });
    expect(report.admission.admitted).toBe(2);
    expect(report.admission.denied).toBe(4);
    expect(report.admission.wave.map((row) => row.admitted)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
    for (const row of report.admission.wave.slice(2)) {
      expect(row.deniedBy).toBe('budget');
    }
    const partial = report.findings.find((finding) => finding.code === 'partial-admission');
    expect(partial?.severity).toBe('warning');
    expect(partial?.message).toContain('2 of 6');
    expect(partial?.message).toContain('risk');
    expect(partial?.message).toContain('audit');

    // Parity: the SAME wave on a live engine admits the same count and
    // pays the same number of dispatches.
    const engine = createEngine({ ...engineOptions, adapters: [adapter] });
    const wf = defineWorkflow({ name: 'wave' }, async (ctx) => {
      const settled = await Promise.allSettled(
        roles.map((label) => ctx.agent(`do ${label}`, { label, estCost: 0.5 })),
      );
      return settled.map((entry) => entry.status);
    });
    const outcome = await engine.run(wf, undefined, { budgetUsd: 1.2 }).result;
    const statuses = outcome.value as string[];
    expect(statuses.filter((status) => status === 'fulfilled')).toHaveLength(
      report.admission.admitted,
    );
    expect(statuses.filter((status) => status === 'rejected')).toHaveLength(
      report.admission.denied,
    );
    expect(adapter.calls).toHaveLength(report.admission.admitted);
  });

  it('surfaces the weighted tool budget as the first bottleneck (criterion 2)', async () => {
    const limits = {
      maxToolCalls: 40,
      toolUnits: { max: 10, costs: { web_search: 5 } },
    };
    const adapter = scriptedAdapter((_req, call) => ({
      toolCall: { name: 'web_search', args: { q: `probe ${call}` } },
    }));
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      spawns: [{ label: 'researcher', limits }],
    });
    const spawn = report.spawns[0];
    const row = spawn.toolCeilings.find((ceiling) => ceiling.tool === 'web_search');
    expect(row).toEqual({ tool: 'web_search', ceiling: 2, boundBy: 'toolUnits' });
    expect(spawn.executedToolCallCeiling).toBe(10);
    const finding = report.findings.find(
      (candidate) => candidate.code === 'weighted-units-bind-first',
    );
    expect(finding?.severity).toBe('warning');
    expect(finding?.message).toContain("'web_search'");
    expect(finding?.message).toContain('2 executed calls');
    expect(finding?.message).toContain('maxToolCalls suggests 40');

    // Parity: the live agent executes exactly the projected two calls
    // before the weighted budget terminates it.
    let executed = 0;
    const webSearch = tool({
      name: 'web_search',
      description: 'search',
      parameters: z.strictObject({ q: z.string() }),
      execute: () => {
        executed += 1;
        return Promise.resolve('results');
      },
    });
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: SERVED } },
    });
    const wf = defineWorkflow({ name: 'weighted' }, async (ctx) => {
      try {
        const result = (await ctx.agent('research', { tools: [webSearch], limits })) as {
          status: string;
        };
        return result.status;
      } catch {
        return 'limit';
      }
    });
    const outcome = await engine.run(wf, undefined, {}).result;
    expect(outcome.value).toBe('limit');
    expect(executed).toBe(row?.ceiling);
  });

  it('mirrors the runtime limit merge and the reserve fallback chain', () => {
    const engineLimits = { maxTurns: 7, maxToolCalls: 9, noProgressTurns: 4 };
    const profileLimits = { maxToolCalls: 5, maxOutputTokensPerTurn: 2_000 };
    const callLimits = { maxOutputTokensPerTurn: 1_000 };
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    const report = preflightEstimate({
      engine: {
        adapters: [adapter],
        defaults: {
          limits: engineLimits,
          routing: { loop: SERVED },
          profiles: {
            worker: { limits: profileLimits, estCost: 0.25 },
            silent: {},
          },
        },
      },
      spawns: [
        { label: 'call-wins', profile: 'worker', limits: callLimits, estCost: 0.75 },
        { label: 'profile-reserve', profile: 'worker' },
        { label: 'priced', estInputTokens: 2_000 },
        { label: 'flat' },
      ],
    });
    expect(report.spawns[0].limits).toEqual(
      mergeUsageLimits(callLimits, profileLimits, engineLimits),
    );
    expect(report.spawns[0].limits.maxOutputTokensPerTurn).toBe(1_000);
    expect(report.spawns[0].admissionReserveUsd).toBe(0.75);
    expect(report.spawns[0].reserveSource).toBe('estCost');
    expect(report.spawns[1].admissionReserveUsd).toBe(0.25);
    expect(report.spawns[1].reserveSource).toBe('profile-estCost');
    // priced: 2000 input at 1 USD/MTok plus the full 4096-token output
    // cap at 10 USD/MTok, the same admissionReserveUsd arithmetic.
    expect(report.spawns[2].reserveSource).toBe('priced-estimate');
    expect(report.spawns[2].admissionReserveUsd).toBeCloseTo(0.002 + 0.04096, 10);
    expect(report.spawns[3].reserveSource).toBe('flat-default');
    expect(report.spawns[3].admissionReserveUsd).toBe(0.5);
    // The run-level merge is the engine-defaults row.
    const engineDefaultsReport = preflightEstimate({
      engine: { adapters: [adapter], defaults: { limits: engineLimits } },
      run: { limits: { maxTurns: 3 } },
    });
    expect(engineDefaultsReport.runLimits.maxTurns).toBe(3);
    expect(engineDefaultsReport.runLimits.maxToolCalls).toBe(9);
  });

  it('lints unrouted roles, unknown profiles, and a wave that admits nothing', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: {} },
      run: { budgetUsd: 0.4 },
      spawns: [{ label: 'orphan', profile: 'ghost', estCost: 0.5 }],
    });
    const codes = report.findings.map((finding) => finding.code);
    expect(codes).toContain('unrouted-role');
    expect(codes).toContain('unknown-profile');
    expect(codes).toContain('nothing-admitted');
    expect(report.findings.find((f) => f.code === 'unrouted-role')?.severity).toBe('error');
    expect(report.admission.admitted).toBe(0);
    expect(report.spawns[0].servedBy).toBeUndefined();
  });

  it('a prototype name is an unknown profile, never a resolved one (RV1205)', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    for (const name of ['toString', 'constructor', 'hasOwnProperty']) {
      const report = preflightEstimate({
        engine: { adapters: [adapter], defaults: { profiles: { real: {} } } },
        run: { budgetUsd: 0.4 },
        spawns: [{ label: 'sneak', profile: name, estCost: 0.1 }],
      });
      const codes = report.findings.map((finding) => finding.code);
      expect(codes).toContain('unknown-profile');
    }
  });

  it('warns that a USD ceiling cannot bound an unpriced model and reserves zero', () => {
    const unpricedCaps = testCaps();
    delete (unpricedCaps as { pricing?: unknown }).pricing;
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }), {
      caps: unpricedCaps,
    });
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      run: { budgetUsd: 1 },
      spawns: [{ label: 'local' }],
    });
    expect(report.spawns[0].unpriced).toBe(true);
    expect(report.spawns[0].admissionReserveUsd).toBe(0);
    expect(report.spawns[0].reserveSource).toBe('unpriced-zero');
    const warning = report.findings.find((f) => f.code === 'unpriced-under-ceiling');
    expect(warning?.severity).toBe('warning');
    expect(warning?.message).toContain('does NOT bound');
    expect(report.admission.admitted).toBe(1);
  });

  it('echoes the orchestrator cap derivation, the fraction bound, and the reserve commitment', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    const engine = {
      adapters: [adapter],
      defaults: { routing: { loop: SERVED, orchestrate: SERVED } },
    };
    const plain = preflightEstimate({
      engine,
      run: { budgetUsd: 0.9 },
      orchestrator: { budget: { capUsd: 0.7 } },
      spawns: [{ label: 'child', estCost: 0.1 }],
    });
    // min(0.7, 0.2 x 0.9) = 0.18: the historic capFraction surprise.
    expect(plain.budget.orchestrator?.effectiveCapUsd).toBeCloseTo(0.18, 10);
    expect(plain.budget.orchestrator?.finalizeReserveUsd).toBe(1);
    expect(plain.budget.orchestrator?.reserveCommitted).toBe(false);
    expect(plain.admission.reservedForFinalizationUsd).toBe(0);
    expect(plain.findings.map((f) => f.code)).toContain('orchestrator-cap-fraction-bound');
    // The capped orchestrator ADMITS at exact fill with the shared
    // hint (effectiveCap minus the committed finalize carve-out): a
    // tight cap is a tight loop budget, never a refused run (the
    // 1.63.0 experiment review, P0.3: the old flat-reserve model
    // errored here while the live run started fine).
    const orchRow = plain.admission.wave[0];
    expect(orchRow.label).toBe('orchestrator');
    expect(orchRow.admitted).toBe(true);
    expect(orchRow.reserveUsd).toBeCloseTo(0.18, 10);
    expect(plain.findings.map((f) => f.code)).not.toContain('orchestrator-cap-below-reserve');
    const plainChild = plain.admission.wave.find((row) => row.label === 'child');
    expect(plainChild?.admitted).toBe(true);

    const extension = preflightEstimate({
      engine,
      run: { budgetUsd: 0.9 },
      orchestrator: { budget: { capUsd: 0.7 }, extension: true },
      spawns: [{ label: 'child', estCost: 0.1 }],
    });
    expect(extension.admission.reservedForFinalizationUsd).toBe(1);
    expect(extension.findings.map((f) => f.code)).toContain(
      'orchestrator-cap-below-finalize-reserve',
    );
    // The committed reserve exceeds the whole ceiling: nothing admits
    // (live refuses the whole run typed at boot).
    const orchExt = extension.admission.wave[0];
    expect(orchExt.admitted).toBe(false);
    expect(orchExt.deniedBy).toBe('budget');
    const child = extension.admission.wave.find((row) => row.label === 'child');
    expect(child?.admitted).toBe(false);
    expect(child?.deniedBy).toBe('budget');
  });

  it('lints inert guards, unaffordable tools, and unreachable per-tool caps', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      spawns: [
        { label: 'inert-reserve', limits: { finalizationReserve: {} } },
        { label: 'inert-notices', limits: { toolBudgetNotices: true } },
        { label: 'unaffordable', limits: { toolUnits: { max: 10, costs: { heavy: 12 } } } },
        { label: 'unreachable', limits: { maxToolCalls: 10, maxCallsPerTool: { probe: 30 } } },
      ],
    });
    const byCode = new Map(report.findings.map((finding) => [finding.code, finding]));
    expect(byCode.get('inert-finalization-reserve')?.spawn).toBe('inert-reserve');
    expect(byCode.get('inert-tool-budget-notices')?.spawn).toBe('inert-notices');
    expect(byCode.get('tool-unaffordable')?.spawn).toBe('unaffordable');
    expect(byCode.get('tool-unaffordable')?.message).toContain('can never execute');
    expect(byCode.get('per-tool-cap-unreachable')?.severity).toBe('info');
    expect(byCode.get('per-tool-cap-unreachable')?.message).toContain('maxToolCalls');
  });

  it('computes the concurrency, provider, and overshoot exposure floors', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    const report = preflightEstimate({
      engine: {
        adapters: [adapter],
        defaults: { routing: { loop: SERVED } },
        concurrency: { perRun: 3, perProvider: { fake: 2 } },
      },
      run: { budgetUsd: 5 },
      spawns: [
        {
          label: 'fleet',
          count: 5,
          estInputTokens: 1_000,
          limits: { maxOutputTokensPerTurn: 1_000 },
        },
      ],
    });
    expect(report.exposure.maxInFlight).toBe(3);
    const provider = report.exposure.perProvider.fake;
    expect(provider.inFlight).toBe(2);
    expect(provider.requestsPerWave).toBe(2);
    expect(provider.tokensPerWaveFloor).toBe(4_000);
    // Each turn floor: 1000 in at 1 USD/MTok + 1000 out at 10 USD/MTok.
    expect(report.spawns[0].turnFloorUsd).toBeCloseTo(0.011, 10);
    expect(report.exposure.overshootOneTurnFloorUsd).toBeCloseTo(0.033, 10);
    const overshoot = report.findings.find((f) => f.code === 'overshoot-exposure');
    expect(overshoot?.severity).toBe('info');
    expect(overshoot?.message).toContain('growing with prompt size');
    // Without the cap the report never claims one is on.
    expect(report.findings.some((f) => f.code === 'in-flight-exposure-cap')).toBe(false);
  });

  it('reports the configured in-flight exposure cap beside the overshoot (RV711)', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }), {
      caps: testCaps(),
    });
    const report = preflightEstimate({
      engine: {
        adapters: [adapter],
        defaults: { routing: { loop: SERVED } },
        concurrency: { perRun: 3 },
      },
      run: { budgetUsd: 5, maxInFlightExposureUsd: 0.5 },
      spawns: [
        {
          label: 'fleet',
          count: 5,
          estInputTokens: 1_000,
          limits: { maxOutputTokensPerTurn: 1_000 },
        },
      ],
    });
    const capFinding = report.findings.find((f) => f.code === 'in-flight-exposure-cap');
    expect(capFinding?.severity).toBe('info');
    expect(capFinding?.message).toContain('0.5000 USD');
    expect(capFinding?.message).toContain('refused typed');
    // The layer-3 overshoot statement stays: severed streams still run
    // past a crossing; the cap bounds admissions, not live cuts.
    expect(report.findings.some((f) => f.code === 'overshoot-exposure')).toBe(true);
  });

  it('compares the declared wave against the quota rule windows', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    const report = preflightEstimate({
      engine: {
        adapters: [adapter],
        defaults: { routing: { loop: SERVED } },
      },
      spawns: [{ label: 'sweep', count: 6, estInputTokens: 500 }],
      quotaRules: [
        { provider: 'fake', requestsPerMinute: 2 },
        { model: 'm1', tokensPerMinute: 1_000 },
        { provider: 'elsewhere', requestsPerMinute: 1 },
      ],
    });
    const requests = report.findings.find((f) => f.code === 'quota-requests-below-wave');
    expect(requests?.message).toContain('6 matching dispatches');
    expect(requests?.message).toContain('requestsPerMinute 2');
    const tokens = report.findings.find((f) => f.code === 'quota-tokens-below-wave');
    expect(tokens?.message).toContain('tokensPerMinute 1000');
    // The rule of another provider matches no declared unit: no finding.
    expect(report.findings.filter((f) => f.code === 'quota-requests-below-wave')).toHaveLength(1);
    expect(report.quota.rules).toBe(3);
    // Disjointness: a wave that already exceeds the window keeps the
    // stronger wave diagnosis and never doubles it with the run one.
    expect(report.findings.filter((f) => f.code === 'quota-requests-below-run')).toHaveLength(0);
    expect(report.findings.filter((f) => f.code === 'quota-tokens-below-run')).toHaveLength(0);
  });

  it('derives the per-spawn provider-turn ceiling from the limits vocabulary', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      spawns: [
        { label: 'unbounded-tools' },
        { label: 'turn-capped', limits: { maxTurns: 5 } },
        { label: 'tool-capped', limits: { maxToolCalls: 3 } },
        { label: 'finalized', limits: { maxToolCalls: 3, finalizationReserve: {} } },
        { label: 'turns-win', limits: { maxTurns: 2, maxToolCalls: 10 } },
        { label: 'unit-capped', limits: { toolUnits: { max: 6 } } },
      ],
    });
    const turnsOf = new Map(report.spawns.map((s) => [s.label, s.projectedProviderTurns]));
    expect(turnsOf.get('unbounded-tools')).toBe(32); // the maxTurns default
    expect(turnsOf.get('turn-capped')).toBe(5);
    expect(turnsOf.get('tool-capped')).toBe(4); // 3 executed calls + the final no-tool turn
    expect(turnsOf.get('finalized')).toBe(5); // plus the armed summary turn
    expect(turnsOf.get('turns-win')).toBe(2); // maxTurns binds below the tool chain
    expect(turnsOf.get('unit-capped')).toBe(7); // 6 weighted executions + the final turn
    expect(report.exposure.runCeiling?.requests).toBe(32 + 5 + 4 + 5 + 2 + 7);
  });

  it('counts the orchestrator loop into the run ceiling and echoes its turns', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED, orchestrate: SERVED } } },
      orchestrator: { limits: { maxToolCalls: 2 } },
      spawns: [{ label: 'child', limits: { maxToolCalls: 1 } }],
    });
    expect(report.budget.orchestrator?.projectedProviderTurns).toBe(3);
    // Orchestrator 3 turns + the child's 2; token growth at the 4096
    // output bound of the test caps with no declared input floors.
    expect(report.exposure.runCeiling).toEqual({
      requests: 5,
      tokens: (4_096 * 3 * 4) / 2 + (4_096 * 2 * 3) / 2,
    });
  });

  it('flags the turn whose context-grown reservation can never fit the token window', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      spawns: [
        {
          label: 'greedy',
          estInputTokens: 100,
          limits: { maxToolCalls: 9, maxOutputTokensPerTurn: 50 },
        },
      ],
      quotaRules: [{ provider: 'fake', tokensPerMinute: 300 }],
    });
    // Turn k reserves 100 + k x 50; k = 4 sits exactly AT the window
    // (300 admits, the denial is strictly greater), so k = 5 is the
    // first never-fitting reservation of the 10-turn loop.
    const neverFits = report.findings.find((f) => f.code === 'quota-turn-never-fits');
    expect(neverFits?.severity).toBe('warning');
    expect(neverFits?.spawn).toBe('greedy');
    expect(neverFits?.message).toContain('by turn 5 of 10');
    expect(neverFits?.message).toContain('about 350 tokens');
    // The wave fits (150 tokens), so the run-level token warning rides
    // beside the never-fits diagnosis.
    expect(report.findings.filter((f) => f.code === 'quota-tokens-below-wave')).toHaveLength(0);
    const run = report.findings.find((f) => f.code === 'quota-tokens-below-run');
    expect(run?.message).toContain('3750');
  });

  it('stays silent when the run ceiling fits the quota windows', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      spawns: [
        {
          label: 'calm',
          estInputTokens: 10,
          limits: { maxTurns: 2, maxOutputTokensPerTurn: 5 },
        },
      ],
      quotaRules: [{ provider: 'fake', requestsPerMinute: 100, tokensPerMinute: 1_000 }],
    });
    expect(report.exposure.runCeiling).toEqual({ requests: 2, tokens: 35 });
    expect(report.findings.filter((f) => f.code.startsWith('quota-'))).toHaveLength(0);
  });

  it('projects the run past the first wave: fan-out times turn ceilings with context regrowth (the second report, rec 9)', () => {
    // The experiment shape: 8 workers under 20 RPM / 900k TPM fit the
    // first wave comfortably (8 dispatches, ~104k tokens), yet their
    // tool loops legally demand 200 provider calls and ~12.4M tokens.
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      spawns: [
        {
          label: 'worker',
          count: 8,
          estInputTokens: 9_000,
          limits: { maxToolCalls: 24, maxOutputTokensPerTurn: 4_096 },
        },
      ],
      quotaRules: [
        { provider: 'fake', requestsPerMinute: 20 },
        { provider: 'fake', tokensPerMinute: 900_000 },
      ],
    });
    // No first-wave finding: the wave alone fits both rules.
    expect(report.findings.filter((f) => f.code.endsWith('below-wave'))).toHaveLength(0);
    // The per-spawn loop ceiling: min(maxTurns 32, maxToolCalls 24 + 1).
    expect(report.spawns[0].projectedProviderTurns).toBe(25);
    // Fan-out times turns; cumulative tokens with per-turn regrowth:
    // turn k reserves est + k x outputBound, so K turns cost
    // K x est + outputBound x K(K+1)/2 per worker.
    expect(report.exposure.runCeiling).toEqual({
      requests: 200,
      tokens: 8 * (25 * 9_000 + (4_096 * 25 * 26) / 2),
    });
    const requests = report.findings.find((f) => f.code === 'quota-requests-below-run');
    expect(requests?.severity).toBe('warning');
    expect(requests?.message).toContain('200 provider calls');
    expect(requests?.message).toContain('requestsPerMinute 20');
    expect(requests?.message).toContain('10 windows');
    const tokens = report.findings.find((f) => f.code === 'quota-tokens-below-run');
    expect(tokens?.severity).toBe('warning');
    expect(tokens?.message).toContain('tokensPerMinute 900000');
    expect(tokens?.message).toContain('14 windows');
  });

  it('denies past the lifetime spawn cap and the orchestrator maxSpawns in projection', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    const capped = preflightEstimate({
      engine: {
        adapters: [adapter],
        defaults: { routing: { loop: SERVED } },
        budgetDefaults: { lifetimeSpawnCap: 3 },
      },
      spawns: [{ label: 'many', count: 5 }],
    });
    expect(capped.admission.wave.map((row) => row.admitted)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(capped.admission.wave[3].deniedBy).toBe('spawn-cap');

    const orch = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED, orchestrate: SERVED } } },
      orchestrator: { maxSpawns: 1 },
      spawns: [{ label: 'a' }, { label: 'b' }],
    });
    const rows = orch.admission.wave;
    expect(rows.map((row) => row.label)).toEqual(['orchestrator', 'a', 'b']);
    expect(rows[1].admitted).toBe(true);
    expect(rows[2].admitted).toBe(false);
    expect(rows[2].deniedBy).toBe('orchestrator-max-spawns');
  });

  it('stays machine readable end to end', () => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      run: { budgetUsd: 1 },
      spawns: [{ label: 'one', estCost: 0.2, limits: { maxToolCalls: 4 } }],
    });
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
    expect(report.concurrency.perRun).toBe(12);
    expect(report.budget.flatReserveUsd).toBe(0.5);
    expect(report.budget.lifetimeSpawnCap).toBe(500);
    expect(report.budget.childBudgetFraction).toBe(0.3);
    expect(report.budget.maxDepth).toBe(1);
    expect(report.quota.configured).toBe(false);
  });
});

/** The telemetry namespace tells orchestrator requests from child ones. */
function agentTypeOf(req: { providerOptions?: unknown }): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

describe('orchestrate-wave parity (the 1.63.0 experiment review, P0.3)', () => {
  it('a capped orchestrator below the flat reserve admits at exact fill, matching the live run', async () => {
    const engineOptions = {
      defaults: {
        routing: { loop: SERVED, orchestrate: SERVED },
        profiles: { worker: { description: 'does one task', estCost: 0.2 } },
      },
    };
    const report = preflightEstimate({
      engine: { ...engineOptions, adapters: [scriptedAdapter(() => ({ text: 'x' }))] },
      run: { budgetUsd: 0.9 },
      orchestrator: { budget: { capUsd: 0.7 } },
      spawns: [{ label: 'worker', profile: 'worker' }],
    });
    // Published 1.63.0 DENIED the orchestrator here with an error-tier
    // finding (exit 1 in CI) while the live run started fine: the
    // shared hint admits at exact fill.
    expect(report.admission.wave[0].admitted).toBe(true);
    expect(report.admission.wave[0].reserveUsd).toBeCloseTo(0.18, 10);
    expect(report.admission.admitted).toBe(2);
    expect(report.findings.filter((f) => f.severity === 'error')).toEqual([]);

    let orchTurn = 0;
    const adapter = scriptedAdapter((req) => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'did the task' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'go' } },
        };
      }
      return { toolCall: { name: 'finish', args: { result: { done: true } } } };
    });
    const engine = createEngine({ ...engineOptions, adapters: [adapter] });
    const outcome = await orchestrate(
      engine,
      'audit the ledger',
      { profiles: ['worker'], budget: { capUsd: 0.7 } },
      { budgetUsd: 0.9 },
    ).result;
    expect(outcome.status).toBe('ok');
    const workerCalls = adapter.calls.filter((req) => agentTypeOf(req) === 'worker');
    // The live wave admits exactly what the projection admits: the
    // orchestrator plus the one worker.
    expect(workerCalls.length).toBe(report.admission.admitted - 1);
  });

  it('children the live layer-2 gate denies are denied by the projection too', async () => {
    const engineOptions = {
      defaults: {
        routing: { loop: SERVED, orchestrate: SERVED },
        profiles: { worker: { description: 'does one task' } },
      },
    };
    const report = preflightEstimate({
      engine: { ...engineOptions, adapters: [scriptedAdapter(() => ({ text: 'x' }))] },
      run: { budgetUsd: 0.6 },
      orchestrator: { budget: { capFraction: 1.0 } },
      spawns: [
        { label: 'w1', estInputTokens: 1000 },
        { label: 'w2', estInputTokens: 1000 },
        { label: 'w3', estInputTokens: 1000 },
      ],
    });
    // Published 1.63.0 projected 4 of 4 admitted (green) because the
    // priced layer-1 arm is tiny; the live layer-2 gate evaluates the
    // flat default against the remainder NET of the orchestrator's own
    // exact-fill hold (0.6 - 0.6 = 0) and rejects every spawn.
    expect(report.admission.wave[0].label).toBe('orchestrator');
    expect(report.admission.wave[0].admitted).toBe(true);
    expect(report.admission.wave[0].reserveUsd).toBeCloseTo(0.6, 10);
    expect(report.admission.admitted).toBe(1);
    for (const row of report.admission.wave.slice(1)) {
      expect(row.admitted).toBe(false);
      expect(row.deniedBy).toBe('budget');
    }
    expect(report.findings.map((f) => f.code)).toContain('partial-admission');

    let orchTurn = 0;
    const adapter = scriptedAdapter((req) => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'never reached' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'one' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'two' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'three' } },
          ],
        };
      }
      return { toolCall: { name: 'finish', args: { result: { done: true } } } };
    });
    const engine = createEngine({ ...engineOptions, adapters: [adapter] });
    const rejected: string[] = [];
    const handle = orchestrate(
      engine,
      'research the corpus',
      { profiles: ['worker'], budget: { capFraction: 1.0 } },
      { budgetUsd: 0.6 },
    );
    handle.on('spawn:rejected', (event) => {
      rejected.push((event as { code: string }).code);
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(rejected).toEqual(['budget', 'budget', 'budget']);
    expect(adapter.calls.filter((req) => agentTypeOf(req) === 'worker')).toHaveLength(0);
  });

  it('a spawn passing layer 2 on its explicit budget still dies on the layer-1 chain, both sides', async () => {
    const engineOptions = {
      defaults: {
        routing: { loop: SERVED, orchestrate: SERVED },
        profiles: { worker: { description: 'does one task' } },
      },
    };
    const report = preflightEstimate({
      engine: { ...engineOptions, adapters: [scriptedAdapter(() => ({ text: 'x' }))] },
      run: { budgetUsd: 0.6 },
      orchestrator: { budget: { capFraction: 0.5 } },
      spawns: [{ label: 'worker', budgetUsd: 0.2 }],
    });
    // Layer 2 clamps to the explicit budget (min(0.5, 0.2) = 0.2, fits
    // the 0.3 remainder) but the layer-1 chain commits the flat 0.5 (a
    // dynamic spawn's budget never becomes an account), which busts the
    // ceiling: the live spawn dies at dispatch, and the projection
    // denies the same row.
    expect(report.admission.wave[0].reserveUsd).toBeCloseTo(0.3, 10);
    const row = report.admission.wave.find((r) => r.label === 'worker');
    expect(row?.admitted).toBe(false);
    expect(row?.deniedBy).toBe('budget');

    let orchTurn = 0;
    const adapter = scriptedAdapter((req) => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'never reached' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: {
            name: 'spawn_agent',
            args: { agentType: 'worker', prompt: 'go', budgetUsd: 0.2 },
          },
        };
      }
      return { toolCall: { name: 'finish', args: { result: { done: true } } } };
    });
    const engine = createEngine({ ...engineOptions, adapters: [adapter] });
    const outcome = await orchestrate(
      engine,
      'one bounded task',
      { profiles: ['worker'], budget: { capFraction: 0.5 } },
      { budgetUsd: 0.6 },
    ).result;
    // A layer-2 rejection is a polite spawn:rejected and the run goes
    // on; a layer-1 bust AT DISPATCH is a ceiling event and settles the
    // run exhausted. Either way the worker never dispatches, exactly
    // as the projection's denied row says.
    expect(outcome.status).toBe('exhausted');
    expect(adapter.calls.filter((req) => agentTypeOf(req) === 'worker')).toHaveLength(0);
  });

  it('exports the two shared formulas the live paths call', () => {
    expect(dispatchProjectionReserveUsd({}, 0.5)).toBe(0.5);
    expect(dispatchProjectionReserveUsd({ estCostUsd: 2, budgetUsd: 0.4 }, 0.5)).toBe(0.4);
    expect(dispatchProjectionReserveUsd({ budgetUsd: 0.1 }, 0.5)).toBe(0.1);
    expect(orchestratorAdmissionEstCostUsd(0.18, 0)).toBeCloseTo(0.18, 10);
    expect(orchestratorAdmissionEstCostUsd(0.7, 0.3)).toBeCloseTo(0.4, 10);
  });

  it('an orchestrate child admitted only at exact fill is denied by the projection (the sixth comparison experiment, cycle 76)', () => {
    const engineOptions = {
      defaults: {
        routing: { loop: SERVED, orchestrate: SERVED },
        profiles: { worker: { description: 'one specialist', estCost: 1.5 } },
      },
    };
    const declaredSpawns = ['w1', 'w2', 'w3', 'w4'].map((label) => ({
      label,
      profile: 'worker',
      estCost: 1.5,
      budgetUsd: 1.5,
    }));
    const report = preflightEstimate({
      engine: { ...engineOptions, adapters: [scriptedAdapter(() => ({ text: 'x' }))] },
      run: { budgetUsd: 10 },
      orchestrator: { maxSpawns: 4, budget: { capUsd: 4, capFraction: 1.0 } },
      spawns: declaredSpawns,
    });
    // The rematch run 2 shape: the orchestrator hold (4) plus three
    // admitted reserves (4.5) leaves exactly the fourth reserve (1.5)
    // of the 10 ceiling. The coordination turn that issues the spawn
    // tools is paid strictly before any spawn executes, so a child that
    // fits only at exact fill is certain to be denied live; the
    // projection must say so instead of promising 5 of 5.
    expect(report.admission.wave[0].label).toBe('orchestrator');
    expect(report.admission.wave[0].reserveUsd).toBeCloseTo(4, 10);
    expect(report.admission.wave.map((row) => row.admitted)).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
    expect(report.admission.wave[4].deniedBy).toBe('budget');
    const partial = report.findings.find((finding) => finding.code === 'partial-admission');
    expect(partial?.severity).toBe('warning');
    expect(partial?.message).toContain('4 of 5');
    expect(partial?.message).toContain('w4');
    // The live half of this parity is the sixth comparison experiment's
    // own journal: the byte-same declared wave (parallel_agents, four
    // tasks at budgetUsd 1.5 under capUsd 4 and ceiling 10) recorded
    // verdict {kind: 'reject', reason: {code: 'budget'}} for the fourth
    // task, because the live remainder additionally carries the
    // coordination spend and the already-dispatched siblings' commits.
    // In process the exact moment reserves commit and release is
    // scheduler dependent (a settled scripted child frees its reserve
    // again), so the live rejection is asserted by the recorded run,
    // not re-raced here; the projection must be strictly conservative
    // at exact fill either way.
  });

  it('an orchestrate wave below exact fill keeps admitting everyone (the revision 2.3 arithmetic)', () => {
    const report = preflightEstimate({
      engine: {
        adapters: [scriptedAdapter(() => ({ text: 'x' }))],
        defaults: {
          routing: { loop: SERVED, orchestrate: SERVED },
          profiles: { worker: { description: 'one specialist', estCost: 1.5 } },
        },
      },
      run: { budgetUsd: 10 },
      orchestrator: { maxSpawns: 4, budget: { capUsd: 3, capFraction: 1.0 } },
      spawns: ['w1', 'w2', 'w3', 'w4'].map((label) => ({
        label,
        profile: 'worker',
        estCost: 1.5,
        budgetUsd: 1.5,
      })),
    });
    expect(report.admission.admitted).toBe(5);
    expect(report.admission.denied).toBe(0);
    expect(report.findings.find((f) => f.code === 'partial-admission')).toBeUndefined();
  });

  it('warns when the whole tool budget fits one parallel batch before any checkpoint (P1.8)', () => {
    const adapter = scriptedAdapter(() => ({ text: 'unused' }));
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      run: { budgetUsd: 5 },
      spawns: [{ label: 'worker', limits: { maxTurns: 4, maxToolCalls: 5 } }],
    });
    const finding = report.findings.find((entry) => entry.code === 'tool-cap-before-checkpoint');
    expect(finding?.severity).toBe('warning');
    expect(finding?.spawn).toBe('worker');
    // The count in the message is the effective executed-call ceiling.
    expect(finding?.message).toContain('5 calls');
    expect(finding?.message).toContain('one parallel tool batch');

    // The units-bound ceiling is the one named, not the nominal cap.
    const weighted = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      run: { budgetUsd: 5 },
      spawns: [
        {
          label: 'searcher',
          limits: { maxToolCalls: 40, toolUnits: { max: 10, costs: { web_search: 5 } } },
        },
      ],
    });
    const bound = weighted.findings.find((entry) => entry.code === 'tool-cap-before-checkpoint');
    expect(bound?.message).toContain(
      `${String(weighted.spawns[0]?.executedToolCallCeiling ?? -1)} calls`,
    );
  });

  it('the mid-batch cadence below the ceiling silences the warning (RV408)', () => {
    const adapter = scriptedAdapter(() => ({ text: 'unused' }));
    const mitigated = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      run: { budgetUsd: 5 },
      spawns: [
        {
          label: 'worker',
          limits: { maxTurns: 4, maxToolCalls: 5, checkpointEveryToolCalls: 2 },
        },
      ],
    });
    expect(mitigated.findings.some((entry) => entry.code === 'tool-cap-before-checkpoint')).toBe(
      false,
    );

    // A cadence at or above the ceiling bounds nothing and still warns,
    // and the warning names the mitigation.
    const inert = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      run: { budgetUsd: 5 },
      spawns: [
        {
          label: 'worker',
          limits: { maxTurns: 4, maxToolCalls: 5, checkpointEveryToolCalls: 5 },
        },
      ],
    });
    const finding = inert.findings.find((entry) => entry.code === 'tool-cap-before-checkpoint');
    expect(finding?.severity).toBe('warning');
    expect(finding?.message).toContain('checkpointEveryToolCalls');
  });

  it('stays silent on serial adapters, uncapped spawns, and a zero cap', () => {
    const serial = scriptedAdapter(() => ({ text: 'unused' }), {
      caps: testCaps({ supportsParallelTools: false }),
    });
    const serialReport = preflightEstimate({
      engine: { adapters: [serial], defaults: { routing: { loop: SERVED } } },
      run: { budgetUsd: 5 },
      spawns: [{ label: 'worker', limits: { maxToolCalls: 5 } }],
    });
    expect(serialReport.findings.some((entry) => entry.code === 'tool-cap-before-checkpoint')).toBe(
      false,
    );

    const parallel = scriptedAdapter(() => ({ text: 'unused' }));
    const uncapped = preflightEstimate({
      engine: { adapters: [parallel], defaults: { routing: { loop: SERVED } } },
      run: { budgetUsd: 5 },
      spawns: [{ label: 'worker', limits: { maxTurns: 4 } }],
    });
    expect(uncapped.findings.some((entry) => entry.code === 'tool-cap-before-checkpoint')).toBe(
      false,
    );

    const zero = preflightEstimate({
      engine: { adapters: [parallel], defaults: { routing: { loop: SERVED } } },
      run: { budgetUsd: 5 },
      spawns: [{ label: 'no-tools', limits: { maxToolCalls: 0 } }],
    });
    expect(zero.findings.some((entry) => entry.code === 'tool-cap-before-checkpoint')).toBe(false);
  });

  it('surfaces output contract drift as an error finding before any paid call (P1.1)', () => {
    // The v1.71 experiment shape: the question renamed the sections,
    // the harness validator kept the old names, and the run burned to
    // its turn ceiling. Declared here, the drift is a red finding.
    const contract = finishContract({ sections: ['## 5. Kill-point analysis'] });
    const report = preflightEstimate({
      finishValidation: {
        validators: [
          ...contract.validators,
          requiredSectionsValidator({
            sections: ['## 5. Failure and recovery analysis'],
            name: 'legacy-sections',
          }),
        ],
        contract,
      },
    });
    const finding = report.findings.find(
      (entry) => entry.code === 'output-contract-validator-mismatch',
    );
    expect(finding?.severity).toBe('error');
    expect(finding?.message).toContain('legacy-sections');
    expect(finding?.message).toContain('## 5. Failure and recovery analysis');
    expect(report.finishValidation).toEqual({
      contractHash: contract.hash,
      validators: ['contract-sections', 'legacy-sections'],
      selfTest: 'failed',
    });
  });

  it('a same-name weakened replacement draws the weakened error finding (cycle 74)', () => {
    const strict = finishContract({ sections: ['## Report'], words: { min: 50 } });
    const report = preflightEstimate({
      finishValidation: {
        validators: [
          requiredSectionsValidator({ sections: ['## Report'], name: 'contract-sections' }),
          wordCountValidator({ min: 1, name: 'contract-words' }),
        ],
        contract: strict,
      },
    });
    const finding = report.findings.find(
      (entry) => entry.code === 'output-contract-validator-weakened',
    );
    expect(finding?.severity).toBe('error');
    expect(finding?.message).toContain("'contract-words'");
    expect(report.finishValidation?.selfTest).toBe('failed');
    const clean = preflightEstimate({
      finishValidation: { validators: [...strict.validators], contract: strict },
    });
    expect(clean.findings.filter((f) => f.code.startsWith('output-contract-validator'))).toEqual(
      [],
    );
    expect(clean.finishValidation?.selfTest).toBe('passed');
  });

  it('echoes a passing self test and a missing contract validator separately', () => {
    const contract = finishContract({ sections: ['FINDINGS'], words: { min: 5, max: 500 } });
    const clean = preflightEstimate({
      finishValidation: { validators: contract.validators, contract },
    });
    expect(clean.findings.filter((f) => f.code === 'output-contract-validator-mismatch')).toEqual(
      [],
    );
    expect(clean.finishValidation?.selfTest).toBe('passed');

    // Containment drift: the contract is declared but nobody enforces
    // its validators; the goldens still pass the configured set, so the
    // echo says 'passed' while the finding carries the omission.
    const omitted = preflightEstimate({
      finishValidation: {
        validators: [requiredSectionsValidator({ sections: ['FINDINGS'] })],
        contract,
      },
    });
    const codes = omitted.findings.filter((f) => f.code === 'output-contract-validator-mismatch');
    expect(codes.map((f) => f.message).join(' ')).toContain('contract-sections');
    expect(codes.map((f) => f.message).join(' ')).toContain('contract-words');
    // A report without the input keeps the pre 1.72 shape exactly.
    const absent = preflightEstimate({ run: { budgetUsd: 1 } });
    expect(absent.finishValidation).toBeUndefined();
  });

  it('models the separate synthesis invocation in the echo and the run ceiling (v1.71 review)', () => {
    const adapter = scriptedAdapter(() => ({ text: 'unused' }));
    const engine = {
      adapters: [adapter],
      defaults: { routing: { orchestrate: SERVED, synthesize: SERVED } },
    };
    const report = preflightEstimate({
      engine,
      orchestrator: {
        limits: { maxTurns: 2 },
        estInputTokens: 1000,
        synthesis: { limits: { maxTurns: 3 }, estInputTokens: 500 },
      },
    });
    expect(report.budget.orchestrator?.synthesis).toEqual({
      projectedProviderTurns: 3,
      servedBy: SERVED,
    });
    // orchestrator 2 turns over est 1000 + synthesis 3 turns over est
    // 500, context regrowth at the 4096 output bound on both.
    expect(report.exposure.runCeiling).toEqual({
      requests: 5,
      tokens: 2 * 1000 + 4096 * 3 + (3 * 500 + 4096 * 6),
    });

    // The undeclared-limits invocation projects the RV-211 default.
    const defaulted = preflightEstimate({
      engine,
      orchestrator: { limits: { maxTurns: 2 }, synthesis: {} },
    });
    expect(defaulted.budget.orchestrator?.synthesis?.projectedProviderTurns).toBe(4);

    // An unroutable synthesis role is the same error an unrouted spawn gets.
    const unrouted = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { orchestrate: SERVED } } },
      orchestrator: { limits: { maxTurns: 2 }, synthesis: {} },
    });
    const finding = unrouted.findings.find(
      (entry) => entry.code === 'unrouted-role' && entry.spawn === 'synthesis',
    );
    expect(finding?.severity).toBe('error');
    expect(unrouted.budget.orchestrator?.synthesis).toBeUndefined();
  });

  it('folds the repair turn reserve into the invocation the validators bind', () => {
    const adapter = scriptedAdapter(() => ({ text: 'unused' }));
    const engine = {
      adapters: [adapter],
      defaults: { routing: { orchestrate: SERVED, synthesize: SERVED } },
    };
    const validators = [requiredSectionsValidator({ sections: ['## Findings'] })];
    // With synthesis declared, the reserve extends the SYNTHESIS turns
    // and the coordination loop stays untouched.
    const bound = preflightEstimate({
      engine,
      orchestrator: {
        limits: { maxTurns: 2 },
        estInputTokens: 1000,
        synthesis: { limits: { maxTurns: 3 }, estInputTokens: 500 },
      },
      finishValidation: { validators, repairTurnReserve: 2 },
    });
    expect(bound.budget.orchestrator?.projectedProviderTurns).toBe(2);
    expect(bound.budget.orchestrator?.synthesis?.projectedProviderTurns).toBe(5);
    expect(bound.exposure.runCeiling?.requests).toBe(7);

    // Without synthesis the validators bind the coordination loop.
    const coordination = preflightEstimate({
      engine,
      orchestrator: { limits: { maxTurns: 2 }, estInputTokens: 1000 },
      finishValidation: { validators, repairTurnReserve: 2 },
    });
    expect(coordination.budget.orchestrator?.projectedProviderTurns).toBe(4);
    expect(coordination.exposure.runCeiling?.requests).toBe(4);

    // A declared zero reserve keeps every projection identical.
    const zeroReserve = preflightEstimate({
      engine,
      orchestrator: { limits: { maxTurns: 2 }, estInputTokens: 1000 },
      finishValidation: { validators, repairTurnReserve: 0 },
    });
    expect(zeroReserve.budget.orchestrator?.projectedProviderTurns).toBe(2);
    expect(() =>
      preflightEstimate({
        finishValidation: { validators, repairTurnReserve: -1 },
      }),
    ).toThrow(/repairTurnReserve/);
  });
});

describe('output caps below the provider minimum (the v1.74 experiment review)', () => {
  const flooredAdapter = () =>
    scriptedAdapter(() => ({ text: 'x' }), { caps: testCaps({ minOutputTokensPerTurn: 16 }) });

  it('flags a spawn per-turn output cap below the serving model minimum', () => {
    const report = preflightEstimate({
      engine: { adapters: [flooredAdapter()], defaults: { routing: { loop: SERVED } } },
      spawns: [{ label: 'worker', limits: { maxOutputTokensPerTurn: 10 } }],
    });
    const finding = report.findings.find(
      (candidate) => candidate.code === 'output-cap-below-provider-minimum',
    );
    expect(finding?.severity).toBe('error');
    expect(finding?.message).toContain("'worker'");
    expect(finding?.message).toContain('16');
  });

  it('flags the synthesis cap below the minimum and stays quiet at or above it', () => {
    const below = preflightEstimate({
      engine: {
        adapters: [flooredAdapter()],
        defaults: { routing: { orchestrate: SERVED, synthesize: SERVED } },
      },
      orchestrator: {
        limits: { maxTurns: 2 },
        synthesis: { limits: { maxTurns: 2, maxOutputTokensPerTurn: 10 } },
      },
    });
    const finding = below.findings.find(
      (candidate) => candidate.code === 'output-cap-below-provider-minimum',
    );
    expect(finding?.severity).toBe('error');
    expect(finding?.message).toContain('synthesis');

    const atFloor = preflightEstimate({
      engine: {
        adapters: [flooredAdapter()],
        defaults: { routing: { orchestrate: SERVED, synthesize: SERVED } },
      },
      orchestrator: {
        limits: { maxTurns: 2 },
        synthesis: { limits: { maxTurns: 2, maxOutputTokensPerTurn: 16 } },
      },
    });
    expect(
      atFloor.findings.find((candidate) => candidate.code === 'output-cap-below-provider-minimum'),
    ).toBeUndefined();
  });
});

describe('synthesis evidence asymmetry (the v1.74 experiment review)', () => {
  const engineOf = () => ({
    adapters: [scriptedAdapter(() => ({ text: 'x' }))],
    defaults: { routing: { orchestrate: SERVED, synthesize: SERVED } },
  });

  it('warns when evidence validators bind a digest-blind synthesis', () => {
    const report = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        limits: { maxTurns: 4 },
        synthesis: { limits: { maxTurns: 2 } },
      },
      finishValidation: {
        validators: [evidencePreservedValidator({ minShare: 0.75 })],
      },
    });
    const finding = report.findings.find(
      (candidate) => candidate.code === 'synthesis-evidence-asymmetry',
    );
    expect(finding?.severity).toBe('warning');
    expect(finding?.message).toContain('digest');
    expect(finding?.message).toContain('evidence-preserved');
  });

  it('stays quiet when the synthesis can actually reach the evidence', () => {
    const base = {
      engine: engineOf(),
      finishValidation: {
        validators: [evidencePreservedValidator({ minShare: 0.75 })],
      },
    };
    const withTools = preflightEstimate({
      ...base,
      orchestrator: {
        limits: { maxTurns: 4 },
        synthesis: { limits: { maxTurns: 2 }, exposeChildResultTools: true },
      },
    });
    const withFull = preflightEstimate({
      ...base,
      orchestrator: {
        limits: { maxTurns: 4 },
        synthesis: { limits: { maxTurns: 2 }, context: 'full' },
      },
    });
    const noEvidence = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        limits: { maxTurns: 4 },
        synthesis: { limits: { maxTurns: 2 } },
      },
      finishValidation: {
        validators: [requiredSectionsValidator({ sections: ['## A'] })],
      },
    });
    const noSynthesis = preflightEstimate({
      ...base,
      orchestrator: { limits: { maxTurns: 4 } },
    });
    for (const report of [withTools, withFull, noEvidence, noSynthesis]) {
      expect(
        report.findings.find((candidate) => candidate.code === 'synthesis-evidence-asymmetry'),
      ).toBeUndefined();
    }
  });
});

describe('contract turn feasibility and the repair funding (the v1.74 experiment review, cycle 73)', () => {
  const engineOf = () => ({
    adapters: [scriptedAdapter(() => ({ text: 'x' }))],
    defaults: { routing: { orchestrate: SERVED, synthesize: SERVED } },
  });
  /** Minimal payload about 9106 tokens: the v1.74 experiment's contract shape. */
  const bigContract = () =>
    finishContract({ sections: ['## Findings'], words: { min: 3000 }, citations: { min: 30 } });
  const codesOf = (report: { findings: { code: string }[] }): string[] =>
    report.findings.map((finding) => finding.code);

  it('an impossible contract against the synthesis turn cap is an error finding', () => {
    const contract = bigContract();
    const report = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        limits: { maxTurns: 4 },
        synthesis: { limits: { maxTurns: 2, maxOutputTokensPerTurn: 2000 } },
      },
      finishValidation: { validators: contract.validators, contract, repairTurnReserve: 1 },
    });
    const finding = report.findings.find(
      (candidate) => candidate.code === 'output-contract-turn-infeasible',
    );
    expect(finding?.severity).toBe('error');
    expect(finding?.spawn).toBe('synthesis');
    expect(finding?.message).toContain('2000');
    expect(finding?.message).toMatch(/minimal accepting payload/);
  });

  it('the provider output ceiling alone can make the contract infeasible', () => {
    // No per-turn cap configured: the serving model's own 4096 token
    // maxOutputTokens is the bound, and the 9106 token minimum exceeds it.
    const contract = bigContract();
    const report = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        limits: { maxTurns: 4 },
        synthesis: { limits: { maxTurns: 2 } },
      },
      finishValidation: { validators: contract.validators, contract, repairTurnReserve: 1 },
    });
    expect(codesOf(report)).toContain('output-contract-turn-infeasible');
  });

  it('with no synthesis the finding lands on the coordination loop', () => {
    const contract = bigContract();
    const report = preflightEstimate({
      engine: engineOf(),
      orchestrator: { limits: { maxTurns: 4, maxOutputTokensPerTurn: 2000 } },
      finishValidation: { validators: contract.validators, contract, repairTurnReserve: 1 },
    });
    const finding = report.findings.find(
      (candidate) => candidate.code === 'output-contract-turn-infeasible',
    );
    expect(finding?.severity).toBe('error');
    expect(finding?.spawn).toBe('orchestrator');
  });

  it('a feasible but thin margin is a headroom warning, and real headroom is silent', () => {
    // About 2410 minimal payload tokens against the 4096 provider bound:
    // under the doubled margin, so the warning names the thin headroom.
    const thin = finishContract({ words: { min: 800 } });
    const thinReport = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        limits: { maxTurns: 4 },
        synthesis: { limits: { maxTurns: 2 } },
      },
      finishValidation: { validators: thin.validators, contract: thin, repairTurnReserve: 1 },
    });
    const finding = thinReport.findings.find(
      (candidate) => candidate.code === 'output-contract-turn-headroom',
    );
    expect(finding?.severity).toBe('warning');
    expect(finding?.spawn).toBe('synthesis');
    expect(codesOf(thinReport)).not.toContain('output-contract-turn-infeasible');

    const roomy = finishContract({ words: { min: 100 } });
    const roomyReport = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        limits: { maxTurns: 4 },
        synthesis: { limits: { maxTurns: 2 } },
      },
      finishValidation: { validators: roomy.validators, contract: roomy, repairTurnReserve: 1 },
    });
    expect(codesOf(roomyReport)).not.toContain('output-contract-turn-infeasible');
    expect(codesOf(roomyReport)).not.toContain('output-contract-turn-headroom');
  });

  it('validators with repairs possible but no funded reserve draw the unfunded warning', () => {
    const unfunded = preflightEstimate({
      engine: engineOf(),
      orchestrator: { limits: { maxTurns: 4 } },
      finishValidation: {
        validators: [requiredSectionsValidator({ sections: ['## A'] })],
      },
    });
    const finding = unfunded.findings.find(
      (candidate) => candidate.code === 'repair-reserve-unfunded',
    );
    expect(finding?.severity).toBe('warning');
    expect(finding?.message).toContain('repairTurnReserve');

    const funded = preflightEstimate({
      engine: engineOf(),
      orchestrator: { limits: { maxTurns: 4 } },
      finishValidation: {
        validators: [requiredSectionsValidator({ sections: ['## A'] })],
        repairTurnReserve: 1,
      },
    });
    expect(codesOf(funded)).not.toContain('repair-reserve-unfunded');

    // maxRepairs 0 means the first rejection is final: there is no
    // repair exchange to fund, so the mirror silences the warning.
    const noRepairs = preflightEstimate({
      engine: engineOf(),
      orchestrator: { limits: { maxTurns: 4 } },
      finishValidation: {
        validators: [requiredSectionsValidator({ sections: ['## A'] })],
        maxRepairs: 0,
      },
    });
    expect(codesOf(noRepairs)).not.toContain('repair-reserve-unfunded');
  });
});

describe('the synthesis tool headroom and the draft gate findings (the fifth experiment, cycle 75)', () => {
  const engineOf = () => ({
    adapters: [scriptedAdapter(() => ({ text: 'x' }))],
    defaults: { routing: { orchestrate: SERVED, synthesize: SERVED } },
  });
  const codesOf = (report: { findings: { code: string }[] }): string[] =>
    report.findings.map((finding) => finding.code);

  it('a synthesis tool cap below the child count with read tools exposed is a warning', () => {
    const report = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        maxSpawns: 4,
        limits: { maxTurns: 6 },
        synthesis: {
          limits: { maxTurns: 4, maxToolCalls: 3 },
          exposeChildResultTools: true,
        },
      },
    });
    const finding = report.findings.find(
      (candidate) => candidate.code === 'synthesis-terminal-tool-headroom',
    );
    expect(finding?.severity).toBe('warning');
    expect(finding?.spawn).toBe('synthesis');
    expect(finding?.message).toContain('3');
    expect(finding?.message).toContain('4');
  });

  it('a cap covering one read per child is quiet, as are undeclared shapes', () => {
    const covered = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        maxSpawns: 4,
        limits: { maxTurns: 6 },
        synthesis: {
          limits: { maxTurns: 4, maxToolCalls: 4 },
          exposeChildResultTools: true,
        },
      },
    });
    expect(codesOf(covered)).not.toContain('synthesis-terminal-tool-headroom');

    const noTools = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        maxSpawns: 4,
        limits: { maxTurns: 6 },
        synthesis: { limits: { maxTurns: 4, maxToolCalls: 1 }, context: 'full' },
      },
    });
    expect(codesOf(noTools)).not.toContain('synthesis-terminal-tool-headroom');

    const noCap = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        maxSpawns: 4,
        limits: { maxTurns: 6 },
        synthesis: { limits: { maxTurns: 4 }, exposeChildResultTools: true },
      },
    });
    expect(codesOf(noCap)).not.toContain('synthesis-terminal-tool-headroom');
  });

  it('without a declared maxSpawns a zero cap still warns (one read is the floor)', () => {
    const report = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        limits: { maxTurns: 6 },
        synthesis: {
          limits: { maxTurns: 4, maxToolCalls: 0 },
          exposeChildResultTools: true,
        },
      },
    });
    expect(codesOf(report)).toContain('synthesis-terminal-tool-headroom');
  });

  it('a draft gate below the contract word minimum is a warning naming both bounds', () => {
    const contract = finishContract({ sections: ['## R'], words: { min: 60 } });
    const report = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        limits: { maxTurns: 6 },
        synthesis: { limits: { maxTurns: 3 } },
      },
      finishValidation: {
        validators: [...contract.validators],
        contract,
        repairTurnReserve: 1,
        draftPolicy: { minWords: 10 },
      },
    });
    const finding = report.findings.find(
      (candidate) => candidate.code === 'draft-gate-below-contract',
    );
    expect(finding?.severity).toBe('warning');
    expect(finding?.message).toContain('10');
    expect(finding?.message).toContain('60');
  });

  it('a draft gate at or above the contract minimum is quiet, as is a wordless contract', () => {
    const contract = finishContract({ sections: ['## R'], words: { min: 60 } });
    const atMinimum = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        limits: { maxTurns: 6 },
        synthesis: { limits: { maxTurns: 3 } },
      },
      finishValidation: {
        validators: [...contract.validators],
        contract,
        repairTurnReserve: 1,
        draftPolicy: { minWords: 60 },
      },
    });
    expect(codesOf(atMinimum)).not.toContain('draft-gate-below-contract');

    const wordless = finishContract({ sections: ['## R'] });
    const noWords = preflightEstimate({
      engine: engineOf(),
      orchestrator: {
        limits: { maxTurns: 6 },
        synthesis: { limits: { maxTurns: 3 } },
      },
      finishValidation: {
        validators: [...wordless.validators],
        contract: wordless,
        repairTurnReserve: 1,
        draftPolicy: { minWords: 10 },
      },
    });
    expect(codesOf(noWords)).not.toContain('draft-gate-below-contract');
  });
});

describe('the synthesis reserve finding (the sixth comparison experiment, cycle 76)', () => {
  const CONTRACT = finishContract({
    sections: ['## A', '## B'],
    words: { min: 40, max: 4000 },
    citations: { min: 2, perSection: 1 },
  });
  function reserveInput(budget?: {
    capUsd?: number;
    capFraction?: number;
    synthesisReserveUsd?: number;
  }): Parameters<typeof preflightEstimate>[0] {
    return {
      engine: {
        adapters: [scriptedAdapter(() => ({ text: 'x' }))],
        defaults: { routing: { orchestrate: SERVED, synthesize: SERVED } },
      },
      run: { budgetUsd: 10 },
      orchestrator: {
        maxSpawns: 2,
        ...(budget === undefined ? {} : { budget }),
        synthesis: {
          limits: { maxTurns: 4 },
          exposeChildResultTools: true,
          context: 'full',
        },
      },
      finishValidation: {
        validators: [...CONTRACT.validators],
        contract: CONTRACT,
        repairTurnReserve: 1,
      },
    };
  }

  it('fires when a contract binds the synthesis and no reserve is declared', () => {
    const report = preflightEstimate(reserveInput({ capUsd: 2, capFraction: 1.0 }));
    const finding = report.findings.find((f) => f.code === 'synthesis-reserve-unfunded');
    expect(finding?.severity).toBe('warning');
    expect(finding?.spawn).toBe('synthesis');
    expect(finding?.message).toContain('no synthesis reserve');
    expect(finding?.message).toContain('budget.synthesisReserveUsd');
  });

  it('fires when the declared reserve sits below the priced payload, naming both numbers', () => {
    const report = preflightEstimate(
      reserveInput({ capUsd: 2, capFraction: 1.0, synthesisReserveUsd: 0.0000005 }),
    );
    const finding = report.findings.find((f) => f.code === 'synthesis-reserve-unfunded');
    expect(finding?.severity).toBe('warning');
    expect(finding?.message).toContain('only 0.0000 USD');
    expect(finding?.message).toMatch(/about \d+ output tokens/);
  });

  it('stays quiet at or above the payload price, and without a contract', () => {
    const funded = preflightEstimate(
      reserveInput({ capUsd: 2, capFraction: 1.0, synthesisReserveUsd: 1.0 }),
    );
    expect(funded.findings.find((f) => f.code === 'synthesis-reserve-unfunded')).toBeUndefined();
    const contractless = reserveInput({ capUsd: 2, capFraction: 1.0 });
    delete (contractless as { finishValidation?: unknown }).finishValidation;
    const report = preflightEstimate(contractless);
    expect(report.findings.find((f) => f.code === 'synthesis-reserve-unfunded')).toBeUndefined();
  });
});

describe('the synthesis hold in the admission wave (RV1901, the four-role benchmark)', () => {
  // The exact primary-arm shape of the 2026-08-05 benchmark: $6.00
  // ceiling, an explicit $4.50 orchestrator cap, a $1.00 synthesis
  // reserve and four workers declaring estCost $0.62. The projection
  // used to net the synthesis reserve out of the orchestrator's own
  // row ($3.50) and then hold NOTHING for it at the root, reading
  // 5/5 green; the live gate held it and refused the third child at
  // $0.0737 spent + $4.74 committed + $1.00 synthesis + $0.62
  // proposed = $6.43 > $6.00.
  const WORKERS = ['product', 'finops', 'durability', 'adversarial'];
  function benchmarkInput(options?: {
    synthesisReserveUsd?: number;
    acceptance?: {
      childPolicy?: 'all-ok' | { minSuccessful: number };
      minSpawnedChildren?: number;
    };
    budgetUsd?: number;
    workers?: string[];
  }): Parameters<typeof preflightEstimate>[0] {
    return {
      engine: {
        adapters: [scriptedAdapter(() => ({ text: 'unused' }))],
        defaults: { routing: { loop: SERVED, orchestrate: SERVED } },
      },
      run: { budgetUsd: options?.budgetUsd ?? 6 },
      orchestrator: {
        budget: {
          capUsd: 4.5,
          capFraction: 1.0,
          ...(options?.synthesisReserveUsd === undefined
            ? {}
            : { synthesisReserveUsd: options.synthesisReserveUsd }),
        },
        ...(options?.acceptance === undefined ? {} : { acceptance: options.acceptance }),
      },
      spawns: (options?.workers ?? WORKERS).map((label) => ({ label, estCost: 0.62 })),
    };
  }

  it('holds the synthesis reserve at the root and denies the third and fourth workers', () => {
    const report = preflightEstimate(benchmarkInput({ synthesisReserveUsd: 1.0 }));
    expect(report.admission.synthesisReserveUsd).toBe(1.0);
    expect(report.admission.wave.map((row) => [row.label, row.admitted, row.deniedBy])).toEqual([
      ['orchestrator', true, undefined],
      ['product', true, undefined],
      ['finops', true, undefined],
      ['durability', false, 'budget'],
      ['adversarial', false, 'budget'],
    ]);
    // The audit terms: the orchestrator row was evaluated against the
    // synthesis hold alone; every later row adds the admitted reserves.
    const held = report.admission.wave.map((row) => row.heldAtEvaluationUsd);
    expect(held[0]).toBeCloseTo(1.0, 10);
    expect(held[1]).toBeCloseTo(4.5, 10);
    expect(held[2]).toBeCloseTo(5.12, 10);
    expect(held[3]).toBeCloseTo(5.74, 10);
    expect(held[4]).toBeCloseTo(5.74, 10);
    expect(report.admission.wave[0]?.reserveUsd).toBeCloseTo(3.5, 10);
    expect(report.findings.some((finding) => finding.code === 'partial-admission')).toBe(true);
  });

  it('without the declared reserve the cap money stays on the orchestrator row, same seats', () => {
    // Conservation: netting plus hold always equals the cap, so the
    // seat count cannot be gamed by moving money between the two.
    const report = preflightEstimate(benchmarkInput());
    expect(report.admission.synthesisReserveUsd).toBe(0);
    expect(report.admission.wave[0]?.reserveUsd).toBeCloseTo(4.5, 10);
    expect(report.admission.wave[0]?.heldAtEvaluationUsd).toBe(0);
    expect(report.admission.wave.map((row) => row.admitted)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it('names the roster floor the budget cannot seat (admission-below-roster-floor)', () => {
    const report = preflightEstimate(
      benchmarkInput({ synthesisReserveUsd: 1.0, acceptance: { minSpawnedChildren: 4 } }),
    );
    const finding = report.findings.find((entry) => entry.code === 'admission-below-roster-floor');
    expect(finding?.severity).toBe('error');
    expect(finding?.message).toContain('seats 2 of the 4 children');
    expect(finding?.message).toContain('acceptance.minSpawnedChildren');
    expect(finding?.message).toContain('2 denied by budget');
  });

  it('the childPolicy minSuccessful floor fires the same finding', () => {
    const report = preflightEstimate(
      benchmarkInput({
        synthesisReserveUsd: 1.0,
        acceptance: { childPolicy: { minSuccessful: 3 } },
      }),
    );
    const finding = report.findings.find((entry) => entry.code === 'admission-below-roster-floor');
    expect(finding?.severity).toBe('error');
    expect(finding?.message).toContain('seats 2 of the 3 children');
    expect(finding?.message).toContain('acceptance.childPolicy.minSuccessful');
  });

  it('stays silent when the floor is met and when the shortage is declarative, not budget', () => {
    // Floor met: two seats, floor of two.
    const met = preflightEstimate(
      benchmarkInput({ synthesisReserveUsd: 1.0, acceptance: { minSpawnedChildren: 2 } }),
    );
    expect(met.findings.some((entry) => entry.code === 'admission-below-roster-floor')).toBe(false);
    // Declarative shortage: three declared workers all seat under a
    // generous ceiling, the floor of four stays a declaration gap the
    // orchestrator may still fill live with undeclared spawns.
    const declarative = preflightEstimate(
      benchmarkInput({
        synthesisReserveUsd: 1.0,
        acceptance: { minSpawnedChildren: 4 },
        budgetUsd: 20,
        workers: WORKERS.slice(0, 3),
      }),
    );
    expect(declarative.admission.denied).toBe(0);
    expect(
      declarative.findings.some((entry) => entry.code === 'admission-below-roster-floor'),
    ).toBe(false);
  });

  it('rejects a malformed minSpawnedChildren before projecting anything', () => {
    expect(() =>
      preflightEstimate(
        benchmarkInput({ synthesisReserveUsd: 1.0, acceptance: { minSpawnedChildren: 0 } }),
      ),
    ).toThrow(/minSpawnedChildren/);
  });
});

describe('the exposure floor over time (RV1907, the recovery arm stall)', () => {
  const WORKERS_1907 = ['product', 'finops', 'durability', 'adversarial'];
  function shapedInput(options?: {
    exposureCapUsd?: number;
    synthesisReserveUsd?: number;
  }): Parameters<typeof preflightEstimate>[0] {
    return {
      engine: {
        adapters: [scriptedAdapter(() => ({ text: 'unused' }))],
        defaults: { routing: { loop: SERVED, orchestrate: SERVED, synthesize: SERVED } },
      },
      run: {
        budgetUsd: 6,
        ...(options?.exposureCapUsd === undefined
          ? {}
          : { maxInFlightExposureUsd: options.exposureCapUsd }),
      },
      orchestrator: {
        budget: {
          capUsd: 4.5,
          capFraction: 1.0,
          ...(options?.synthesisReserveUsd === undefined
            ? {}
            : { synthesisReserveUsd: options.synthesisReserveUsd }),
        },
        synthesis: { limits: { maxTurns: 2 } },
        limits: { maxOutputTokensPerTurn: 4000 },
      },
      spawns: WORKERS_1907.map((label) => ({
        label,
        estCost: 0.62,
        limits: { maxOutputTokensPerTurn: 2500 },
      })),
    };
  }

  it('reports the whole-wave ceiling floor the benchmark needed', () => {
    const report = preflightEstimate(shapedInput({ synthesisReserveUsd: 1.0 }));
    // 3.50 orchestrator + 4 x 0.62 workers + 1.00 synthesis = 6.98,
    // plus the live-root-exposure term (RV2004): the orchestrator's
    // own 4000-token turn floor, 0.04 at $10/MTok. The $6.00 benchmark
    // ceiling sat below its own wave, and the parity rerun's fourth
    // seat proved the plain 5.95-style figure still lies without the
    // coordination term: the seat fit preflight and was refused live.
    expect(report.admission.liveRootExposureTermUsd).toBeCloseTo(0.04, 10);
    expect(report.admission.requiredMinimumCeilingUsd).toBeCloseTo(7.02, 10);
  });

  it('names a cap below the breathing floor and prices the equation', () => {
    const report = preflightEstimate(
      shapedInput({ synthesisReserveUsd: 1.0, exposureCapUsd: 0.08 }),
    );
    const finding = report.findings.find((entry) => entry.code === 'exposure-cap-tight');
    expect(finding?.severity).toBe('warning');
    expect(finding?.message).toContain('breathing floor');
    expect(finding?.message).toContain('RV1902');
    // Re-priced by RV2101: the tail reserves are fenced by the budget
    // chain, not the exposure cap, so the floor is the concurrent turn
    // floors alone (0.04 orchestrator + 0.10 across the wave).
    expect(report.exposure.requiredMinimumExposureUsd).toBeCloseTo(0.14, 10);
  });

  it('stays silent at a generous cap and still reports the floor without one', () => {
    const generous = preflightEstimate(
      shapedInput({ synthesisReserveUsd: 1.0, exposureCapUsd: 5 }),
    );
    expect(generous.findings.some((entry) => entry.code === 'exposure-cap-tight')).toBe(false);
    const uncapped = preflightEstimate(shapedInput({ synthesisReserveUsd: 1.0 }));
    expect(uncapped.findings.some((entry) => entry.code === 'exposure-cap-tight')).toBe(false);
    expect(uncapped.exposure.requiredMinimumExposureUsd).toBeCloseTo(0.14, 10);
    expect(uncapped.exposure.requiredMinimumExposureUsd).toBe(
      generous.exposure.requiredMinimumExposureUsd,
    );
  });
});

describe('the reserve line headroom (RV2101, the fourth parity run)', () => {
  const WORKERS_2101 = ['product', 'finops', 'durability', 'adversarial'];
  function parityInput(options: {
    workerEstCostUsd: number;
    synthesisReserveUsd?: number;
  }): Parameters<typeof preflightEstimate>[0] {
    return {
      engine: {
        adapters: [
          scriptedAdapter(() => ({ text: 'unused' }), {
            caps: testCaps({ maxOutputTokens: 200000 }),
          }),
        ],
        defaults: { routing: { loop: SERVED, orchestrate: SERVED, synthesize: SERVED } },
      },
      run: { budgetUsd: 6 },
      orchestrator: {
        budget: {
          capUsd: 2.95,
          capFraction: 1.0,
          ...(options.synthesisReserveUsd === undefined
            ? {}
            : { synthesisReserveUsd: options.synthesisReserveUsd }),
        },
        synthesis: { limits: { maxTurns: 2 } },
        limits: { maxOutputTokensPerTurn: 36000 },
      },
      spawns: WORKERS_2101.map((label) => ({
        label,
        estCost: options.workerEstCostUsd,
        limits: { maxOutputTokensPerTurn: 14000 },
      })),
    };
  }

  it('warns when the admitted wave sits within two coordination turns of the line', () => {
    const report = preflightEstimate(
      parityInput({ workerEstCostUsd: 0.66, synthesisReserveUsd: 1.0 }),
    );
    // The fourth parity envelope: steady state 1.95 + 4 x 0.66 = 4.59
    // against the 5.00 line, 0.41 of headroom under two 0.36
    // coordination turn floors. The run cleared the static minimum by
    // $0.05 and still died $0.065 past the line.
    expect(report.admission.reserveLineUsd).toBeCloseTo(5.0, 10);
    expect(report.admission.reserveLineHeadroomUsd).toBeCloseTo(0.41, 10);
    const finding = report.findings.find((entry) => entry.code === 'reserve-line-headroom');
    expect(finding?.severity).toBe('warning');
    expect(finding?.message).toContain('redeemed from its reserve');
  });

  it('stays silent with real coordination room and absent without a synthesis reserve', () => {
    const roomy = preflightEstimate(
      parityInput({ workerEstCostUsd: 0.5, synthesisReserveUsd: 1.0 }),
    );
    expect(roomy.findings.some((entry) => entry.code === 'reserve-line-headroom')).toBe(false);
    expect(roomy.admission.reserveLineHeadroomUsd).toBeCloseTo(1.05, 10);
    const unreserved = preflightEstimate(parityInput({ workerEstCostUsd: 0.66 }));
    expect(unreserved.admission.reserveLineUsd).toBeUndefined();
    expect(unreserved.findings.some((entry) => entry.code === 'reserve-line-headroom')).toBe(false);
  });
});

describe('the synthesis reserve against the cap-sized composition (RV2104, the seventh parity run)', () => {
  // The seventh parity run held a 0.70 reserve that passed the
  // minimal-payload check, and the synthesis spent it whole on a
  // composition truncated exactly at the 40000-token output cap; the
  // granted repair turn was refused at a zero remainder. The finding
  // prices ONE turn writing to the allowance (plus the declared input
  // floor) and one more such turn when a repair reserve is declared.
  function capInput(options: {
    synthesisReserveUsd?: number;
    repairTurnReserve?: number;
  }): Parameters<typeof preflightEstimate>[0] {
    return {
      engine: {
        adapters: [
          scriptedAdapter(() => ({ text: 'unused' }), {
            caps: testCaps({ maxOutputTokens: 200000 }),
          }),
        ],
        defaults: { routing: { loop: SERVED, orchestrate: SERVED, synthesize: SERVED } },
      },
      run: { budgetUsd: 6 },
      orchestrator: {
        budget: {
          capUsd: 2.95,
          capFraction: 1.0,
          ...(options.synthesisReserveUsd === undefined
            ? {}
            : { synthesisReserveUsd: options.synthesisReserveUsd }),
        },
        synthesis: {
          limits: { maxTurns: 2, maxOutputTokensPerTurn: 40000 },
          estInputTokens: 110000,
        },
        limits: { maxOutputTokensPerTurn: 36000 },
      },
      spawns: [{ label: 'worker', estCost: 0.42, limits: { maxOutputTokensPerTurn: 14000 } }],
      ...(options.repairTurnReserve === undefined
        ? {}
        : {
            finishValidation: {
              validators: [
                { name: 'sections', validate: () => ({ ok: false, reasons: ['unused'] }) },
              ],
              repairTurnReserve: options.repairTurnReserve,
            },
          }),
    };
  }

  it('warns when the reserve funds a composition it cannot repair', () => {
    // At the harness rates ($1/MTok in, $10/MTok out): 110000 input +
    // 40000 output = $0.51 per allowance-sized turn, $1.02 with the
    // declared repair turn, against the seventh envelope's 0.70 hold.
    const report = preflightEstimate(capInput({ synthesisReserveUsd: 0.7, repairTurnReserve: 3 }));
    const finding = report.findings.find(
      (entry) => entry.code === 'synthesis-reserve-below-cap-composition',
    );
    expect(finding?.severity).toBe('warning');
    expect(finding?.message).toContain('0.5100');
    expect(finding?.message).toContain('1.0200');
    expect(finding?.message).toContain('0.7000');
  });

  it('prices the composition alone without a repair reserve and stays silent above the arithmetic', () => {
    // Composition only: $0.51 against a 0.45 hold warns, a 0.55 hold
    // does not; with the repair turn declared, 1.05 clears the 1.02.
    const bare = preflightEstimate(capInput({ synthesisReserveUsd: 0.45 }));
    const bareFinding = bare.findings.find(
      (entry) => entry.code === 'synthesis-reserve-below-cap-composition',
    );
    expect(bareFinding?.severity).toBe('warning');
    expect(bareFinding?.message).toContain('0.5100');
    expect(bareFinding?.message).not.toContain('one more such turn');
    const funded = preflightEstimate(capInput({ synthesisReserveUsd: 0.55 }));
    expect(
      funded.findings.some((entry) => entry.code === 'synthesis-reserve-below-cap-composition'),
    ).toBe(false);
    const repairFunded = preflightEstimate(
      capInput({ synthesisReserveUsd: 1.05, repairTurnReserve: 3 }),
    );
    expect(
      repairFunded.findings.some(
        (entry) => entry.code === 'synthesis-reserve-below-cap-composition',
      ),
    ).toBe(false);
  });
});

describe('the tool budget extension projection (RV301, the seventh comparison experiment)', () => {
  it('the projections assume the fully extended cap', () => {
    const adapter = scriptedAdapter(() => ({ text: 'unused' }));
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      run: { budgetUsd: 5 },
      spawns: [
        {
          label: 'worker',
          limits: {
            maxTurns: 20,
            maxToolCalls: 5,
            toolBudgetExtension: { increment: 2, maxExtensions: 3 },
          },
        },
      ],
    });
    // 5 base calls + 3 grants x 2 = 11 executed calls, + the final
    // no-tool turn = 12 projected provider turns.
    expect(report.spawns[0]?.executedToolCallCeiling).toBe(11);
    expect(report.spawns[0]?.projectedProviderTurns).toBe(12);
    const checkpointWarning = report.findings.find(
      (entry) => entry.code === 'tool-cap-before-checkpoint',
    );
    expect(checkpointWarning?.message).toContain('11 calls');
  });

  it('the exposure is an info finding naming the worst case', () => {
    const adapter = scriptedAdapter(() => ({ text: 'unused' }));
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      run: { budgetUsd: 5 },
      spawns: [
        {
          label: 'worker',
          limits: {
            maxTurns: 20,
            maxToolCalls: 5,
            toolBudgetExtension: { increment: 2, maxExtensions: 3 },
          },
        },
      ],
    });
    const finding = report.findings.find(
      (entry) => entry.code === 'tool-budget-extension-exposure',
    );
    expect(finding?.severity).toBe('info');
    expect(finding?.spawn).toBe('worker');
    expect(finding?.message).toContain('up to 6 extra calls');
    expect(finding?.message).toContain('remaining budget headroom');
  });

  it('an extension without maxToolCalls is inert and warned', () => {
    const adapter = scriptedAdapter(() => ({ text: 'unused' }));
    const report = preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      run: { budgetUsd: 5 },
      spawns: [
        {
          label: 'worker',
          limits: {
            maxTurns: 4,
            toolBudgetExtension: { increment: 2, maxExtensions: 3 },
          },
        },
      ],
    });
    const finding = report.findings.find((entry) => entry.code === 'inert-tool-budget-extension');
    expect(finding?.severity).toBe('warning');
    expect(finding?.spawn).toBe('worker');
    expect(report.spawns[0]?.executedToolCallCeiling).toBeNull();
    expect(report.findings.some((entry) => entry.code === 'tool-budget-extension-exposure')).toBe(
      false,
    );
  });
});

describe('the finalization window findings (RV302)', () => {
  const reportOf = (limits: object) =>
    preflightEstimate({
      engine: {
        adapters: [scriptedAdapter(() => ({ text: 'unused' }))],
        defaults: { routing: { loop: SERVED } },
      },
      run: { budgetUsd: 5 },
      spawns: [{ label: 'worker', limits }],
    });

  it('a window without any tool budget limiter is inert and warned', () => {
    const report = reportOf({ maxTurns: 4, finalizationWindow: { reserveCalls: 2 } });
    const finding = report.findings.find((entry) => entry.code === 'inert-finalization-window');
    expect(finding?.severity).toBe('warning');
    expect(finding?.spawn).toBe('worker');
  });

  it('a window at or above the cap governs from the first call and is warned', () => {
    const report = reportOf({
      maxTurns: 4,
      maxToolCalls: 3,
      finalizationWindow: { reserveCalls: 3 },
    });
    const finding = report.findings.find(
      (entry) => entry.code === 'finalization-window-covers-cap',
    );
    expect(finding?.severity).toBe('warning');
    expect(finding?.spawn).toBe('worker');
    const smaller = reportOf({
      maxTurns: 4,
      maxToolCalls: 3,
      finalizationWindow: { reserveCalls: 2, allow: ['record'] },
    });
    expect(smaller.findings.some((entry) => entry.code === 'finalization-window-covers-cap')).toBe(
      false,
    );
  });

  it('an explicitly empty allowlist is warned: only the terminal tool remains callable', () => {
    const report = reportOf({
      maxTurns: 4,
      maxToolCalls: 6,
      finalizationWindow: { reserveCalls: 2, allow: [] },
    });
    const finding = report.findings.find(
      (entry) => entry.code === 'finalization-window-empty-allowlist',
    );
    expect(finding?.severity).toBe('warning');
    expect(finding?.spawn).toBe('worker');
  });
});

describe('the bare tool cap warning (RV305)', () => {
  const reportOf = (limits: object) =>
    preflightEstimate({
      engine: {
        adapters: [scriptedAdapter(() => ({ text: 'unused' }))],
        defaults: { routing: { loop: SERVED } },
      },
      run: { budgetUsd: 5 },
      spawns: [{ label: 'worker', limits }],
    });

  it('a cap with no softener is warned', () => {
    const report = reportOf({ maxTurns: 8, maxToolCalls: 6 });
    const finding = report.findings.find((entry) => entry.code === 'bare-tool-cap');
    expect(finding?.severity).toBe('warning');
    expect(finding?.spawn).toBe('worker');
    expect(finding?.message).toContain('maxToolCalls');
  });

  it('weighted units alone are a bare cap too', () => {
    const report = reportOf({ maxTurns: 8, toolUnits: { max: 6 } });
    expect(report.findings.some((entry) => entry.code === 'bare-tool-cap')).toBe(true);
  });

  it('any softener silences the warning', () => {
    for (const limits of [
      { maxTurns: 8, maxToolCalls: 6, toolBudgetNotices: true },
      { maxTurns: 8, maxToolCalls: 6, finalizationReserve: {} },
      { maxTurns: 8, maxToolCalls: 6, toolBudgetExtension: { increment: 2, maxExtensions: 1 } },
      { maxTurns: 8, maxToolCalls: 6, finalizationWindow: { reserveCalls: 2 } },
    ]) {
      const report = reportOf(limits);
      expect(report.findings.some((entry) => entry.code === 'bare-tool-cap')).toBe(false);
    }
  });

  it('a zero cap is a deliberate no-tools spawn, never warned', () => {
    const report = reportOf({ maxTurns: 8, maxToolCalls: 0 });
    expect(report.findings.some((entry) => entry.code === 'bare-tool-cap')).toBe(false);
  });
});

describe('capped children without a salvage policy (RV305, orchestrate)', () => {
  const reportOf = (acceptance?: {
    childPolicy?: 'all-ok' | { minSuccessful: number };
    acceptPartialChildren?: boolean;
    acceptValidatedTerminalOutputOnLimit?: boolean;
  }) =>
    preflightEstimate({
      engine: {
        adapters: [scriptedAdapter(() => ({ text: 'unused' }))],
        defaults: { routing: { loop: SERVED, orchestrate: SERVED } },
      },
      run: { budgetUsd: 5 },
      orchestrator: {
        budget: { capFraction: 1.0 },
        ...(acceptance === undefined ? {} : { acceptance }),
      },
      spawns: [
        {
          label: 'worker',
          limits: { maxTurns: 8, maxToolCalls: 6, toolBudgetNotices: true },
        },
      ],
    });

  it('a declared acceptance with no salvage over capped children is an info finding', () => {
    const report = reportOf({ childPolicy: 'all-ok' });
    const finding = report.findings.find(
      (entry) => entry.code === 'capped-children-without-salvage',
    );
    expect(finding?.severity).toBe('info');
    expect(finding?.message).toContain('salvage');
  });

  it('an enabled salvage arm silences it, and so does an undeclared acceptance', () => {
    const salvaged = reportOf({
      childPolicy: 'all-ok',
      acceptValidatedTerminalOutputOnLimit: true,
    });
    expect(
      salvaged.findings.some((entry) => entry.code === 'capped-children-without-salvage'),
    ).toBe(false);
    const undeclared = reportOf(undefined);
    expect(
      undeclared.findings.some((entry) => entry.code === 'capped-children-without-salvage'),
    ).toBe(false);
  });
});

describe('the evidence floor finding (RV303, the seventh comparison experiment)', () => {
  const reportOf = (
    spawn: object,
    profiles?: Record<string, object>,
  ): ReturnType<typeof preflightEstimate> =>
    preflightEstimate({
      engine: {
        adapters: [scriptedAdapter(() => ({ text: 'unused' }))],
        defaults: {
          routing: { loop: SERVED },
          ...(profiles === undefined ? {} : { profiles: profiles }),
        },
      },
      run: { budgetUsd: 5 },
      spawns: [spawn],
    });

  it('warns when the effective executed ceiling is below the declared evidence floor', () => {
    // The experiment shape: 14 mandatory entries at the default 3 calls
    // per entry plus 8 overhead calls = a floor of 50 against the
    // research template cap of 48.
    const report = reportOf({
      label: 'worker',
      limits: { maxTurns: 24, maxToolCalls: 48, toolBudgetNotices: true },
      evidenceContract: { minEntries: 14 },
    });
    const finding = report.findings.find((entry) => entry.code === 'tool-cap-below-evidence-floor');
    expect(finding?.severity).toBe('warning');
    expect(finding?.spawn).toBe('worker');
    expect(finding?.message).toContain('50');
    expect(finding?.message).toContain('48');
    expect(finding?.message).toContain('14');
  });

  it('stays silent at or above the floor and honors the declared estimates', () => {
    const atFloor = reportOf({
      label: 'worker',
      limits: { maxTurns: 24, maxToolCalls: 48, toolBudgetNotices: true },
      evidenceContract: { minEntries: 13 },
    });
    expect(atFloor.findings.some((entry) => entry.code === 'tool-cap-below-evidence-floor')).toBe(
      false,
    );
    const declared = reportOf({
      label: 'worker',
      limits: { maxTurns: 24, maxToolCalls: 48, toolBudgetNotices: true },
      evidenceContract: { minEntries: 14, estCallsPerEntry: 2, overheadCalls: 4 },
    });
    expect(declared.findings.some((entry) => entry.code === 'tool-cap-below-evidence-floor')).toBe(
      false,
    );
  });

  it('compares against the binding ceiling: weighted units and the extension both count', () => {
    const unitsBound = reportOf({
      label: 'worker',
      limits: {
        maxTurns: 24,
        maxToolCalls: 48,
        toolBudgetNotices: true,
        toolUnits: { max: 30 },
      },
      evidenceContract: { minEntries: 14 },
    });
    const finding = unitsBound.findings.find(
      (entry) => entry.code === 'tool-cap-below-evidence-floor',
    );
    expect(finding?.message).toContain('30');
    const extended = reportOf({
      label: 'worker',
      limits: {
        maxTurns: 24,
        maxToolCalls: 40,
        toolBudgetNotices: true,
        toolBudgetExtension: { increment: 5, maxExtensions: 2 },
      },
      evidenceContract: { minEntries: 14 },
    });
    expect(extended.findings.some((entry) => entry.code === 'tool-cap-below-evidence-floor')).toBe(
      false,
    );
  });

  it('reads the contract from the registered profile, and the spawn declaration wins', () => {
    const profiles = {
      researcher: {
        description: 'research',
        limits: { maxTurns: 24, maxToolCalls: 20, toolBudgetNotices: true },
        evidenceContract: { minEntries: 10 },
      },
    };
    const viaProfile = reportOf({ label: 'w', profile: 'researcher' }, profiles);
    expect(
      viaProfile.findings.some((entry) => entry.code === 'tool-cap-below-evidence-floor'),
    ).toBe(true);
    const overridden = reportOf(
      { label: 'w', profile: 'researcher', evidenceContract: { minEntries: 2 } },
      profiles,
    );
    expect(
      overridden.findings.some((entry) => entry.code === 'tool-cap-below-evidence-floor'),
    ).toBe(false);
  });

  it('an uncapped spawn has no floor to compare and stays silent', () => {
    const report = reportOf({
      label: 'worker',
      limits: { maxTurns: 24 },
      evidenceContract: { minEntries: 14 },
    });
    expect(report.findings.some((entry) => entry.code === 'tool-cap-below-evidence-floor')).toBe(
      false,
    );
  });

  it('rejects a malformed declared contract with a typed ConfigError', () => {
    expect(() =>
      reportOf({
        label: 'worker',
        limits: { maxTurns: 24, maxToolCalls: 48 },
        evidenceContract: { minEntries: 0 },
      }),
    ).toThrow(/evidenceContract\.minEntries/);
    expect(() =>
      reportOf({
        label: 'worker',
        limits: { maxTurns: 24, maxToolCalls: 48 },
        evidenceContract: { minEntries: 5, estCallsPerEntry: 1.5 },
      }),
    ).toThrow(/evidenceContract\.estCallsPerEntry/);
    expect(() =>
      reportOf({
        label: 'worker',
        limits: { maxTurns: 24, maxToolCalls: 48 },
        evidenceContract: { minEntries: 5, overheadCalls: -1 },
      }),
    ).toThrow(/evidenceContract\.overheadCalls/);
  });
});

describe('run.budgetUsd validation symmetry (RV803)', () => {
  it('refuses NaN, negative, and infinite ceilings typed, like the runtime guard', () => {
    // The twelfth experiment's finding: preflight validated run.limits,
    // run.maxInFlightExposureUsd, and spawn budgets, but read the run
    // ceiling raw, so a NaN ceiling flowed silently into every
    // projection while the runtime's own guard would have refused it.
    for (const bad of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      expect(() => preflightEstimate({ run: { budgetUsd: bad } })).toThrow(
        /preflight\.run\.budgetUsd/,
      );
    }
  });

  it('accepts zero and positive ceilings exactly like the runtime', () => {
    expect(() => preflightEstimate({ run: { budgetUsd: 0 } })).not.toThrow();
    expect(() => preflightEstimate({ run: { budgetUsd: 2.5 } })).not.toThrow();
  });
});

describe('rates verification age on the spawn report (RV814)', () => {
  it('stamps the serving row ratesVerifiedAt and omits the field when the row names none', () => {
    const adapter = scriptedAdapter(() => ({ text: 'done', finish: 'stop' }));
    const reportOf = (row: Pricing) =>
      preflightEstimate({
        engine: {
          adapters: [adapter],
          defaults: { routing: { loop: SERVED } },
          pricing: { pricingVersion: 'audit-v1', models: { [SERVED]: row } },
        },
        run: { budgetUsd: 1 },
        spawns: [{ label: 'digger', estInputTokens: 1_000 }],
      });

    const dated = reportOf({
      inputUsdPerMTok: 3,
      outputUsdPerMTok: 15,
      ratesVerifiedAt: '2026-07-18',
    });
    expect(dated.spawns[0]?.ratesVerifiedAt).toBe('2026-07-18');

    const undated = reportOf({ inputUsdPerMTok: 3, outputUsdPerMTok: 15 });
    expect(undated.spawns[0]?.ratesVerifiedAt).toBeUndefined();
    expect('ratesVerifiedAt' in (undated.spawns[0] ?? {})).toBe(false);
  });
});

describe('the turns-axis projection (RV1406, the seventeenth comparison experiment)', () => {
  const reportFor = (limits: Record<string, unknown>) => {
    const adapter = scriptedAdapter(() => ({ text: 'x', finish: 'stop' }));
    return preflightEstimate({
      engine: { adapters: [adapter], defaults: { routing: { loop: SERVED } } },
      spawns: [{ label: 'burner', limits }],
    });
  };

  it('warns when maxTurns binds before the tool budget and no turns reserve exists', () => {
    // The seventeenth experiment's worker: maxTurns 28 expired at 66 of
    // 96 executed tool calls, with no finalize phase on the turns axis.
    const report = reportFor({ maxTurns: 28, maxToolCalls: 96 });
    const finding = report.findings.find((f) => f.code === 'turns-bind-before-tool-budget');
    expect(finding?.severity).toBe('warning');
    expect(finding?.spawn).toBe('burner');
    expect(finding?.message).toContain('maxTurns 28');
    expect(finding?.message).toContain('27 serial executed tool calls');
    expect(finding?.message).toContain('96');
    expect(finding?.message).toContain('finalizationTurns');
  });

  it('downgrades to info when the turns reserve is configured', () => {
    const report = reportFor({
      maxTurns: 28,
      maxToolCalls: 96,
      finalizationTurns: { reserveTurns: 3 },
    });
    const findings = report.findings.filter((f) => f.code === 'turns-bind-before-tool-budget');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('info');
  });

  it('stays silent when the turns axis covers the serial spend, or when no tool budget exists', () => {
    const covered = reportFor({ maxTurns: 32, maxToolCalls: 31 });
    expect(covered.findings.filter((f) => f.code === 'turns-bind-before-tool-budget')).toHaveLength(
      0,
    );
    const bound = reportFor({ maxTurns: 32, maxToolCalls: 32 });
    expect(bound.findings.filter((f) => f.code === 'turns-bind-before-tool-budget')).toHaveLength(
      1,
    );
    const unbounded = reportFor({ maxTurns: 5 });
    expect(
      unbounded.findings.filter((f) => f.code === 'turns-bind-before-tool-budget'),
    ).toHaveLength(0);
  });

  it('projects against the fully extended cap, like every other tool-budget projection', () => {
    const report = reportFor({
      maxTurns: 10,
      maxToolCalls: 4,
      toolBudgetExtension: { increment: 6, maxExtensions: 1 },
    });
    const finding = report.findings.find((f) => f.code === 'turns-bind-before-tool-budget');
    expect(finding?.message).toContain('maxTurns 10');
    expect(finding?.message).toContain('10-call executed ceiling');
  });

  it('warns when the turns reserve is not below maxTurns', () => {
    const covering = reportFor({ maxTurns: 4, finalizationTurns: { reserveTurns: 4 } });
    const finding = covering.findings.find((f) => f.code === 'finalization-turns-covers-max-turns');
    expect(finding?.severity).toBe('warning');
    expect(finding?.message).toContain('reserveTurns 4');
    const sane = reportFor({ maxTurns: 4, finalizationTurns: { reserveTurns: 3 } });
    expect(
      sane.findings.filter((f) => f.code === 'finalization-turns-covers-max-turns'),
    ).toHaveLength(0);
  });
});

/**
 * The cache-aware loop economics (RV2007). The parity rerun's workers
 * re-paid a ~550k-token prompt at the full input rate on every turn
 * (~$1.10 per worker per cycle at $2 per MTok) because the RV2006
 * policy did not exist yet; the $6 envelope, sized on OpenAI's
 * implicit cache, was incomparable on Anthropic. Preflight now prices
 * BOTH loop floors per spawn and warns when a long cycle is about to
 * run uncached on an explicit-caching adapter.
 */
describe('the cache-aware loop floors (RV2007)', () => {
  const SONNET_LIKE = testCaps({
    promptCaching: 'explicit',
    pricing: {
      inputUsdPerMTok: 2,
      outputUsdPerMTok: 10,
      cacheReadUsdPerMTok: 0.2,
      cacheWriteUsdPerMTok: 2.5,
    },
  });

  function parityWorkerReport(options?: { cacheMode?: 'off' }) {
    const adapter = scriptedAdapter(() => ({ text: 'x' }), { caps: SONNET_LIKE });
    return preflightEstimate({
      engine: {
        adapters: [adapter],
        defaults: {
          routing: { loop: SERVED },
          ...(options?.cacheMode === undefined ? {} : { cache: { mode: options.cacheMode } }),
        },
      },
      run: { budgetUsd: 6 },
      spawns: [
        {
          label: 'parity-worker',
          estCost: 0.7,
          estInputTokens: 36_000,
          limits: { maxTurns: 15, maxOutputTokensPerTurn: 2500 },
        },
      ],
    });
  }

  it('prices the cached loop floor beside the uncached one, several-fold apart', () => {
    const report = parityWorkerReport();
    const spawn = report.spawns[0];
    expect(spawn).toBeDefined();
    const turns = spawn?.projectedProviderTurns ?? 0;
    expect(turns).toBeGreaterThan(1);
    // Uncached: the 36k-token floor re-billed at $2/MTok every turn.
    expect(spawn?.uncachedLoopInputFloorUsd).toBeCloseTo(turns * 0.072, 10);
    // Cached: one $2.5/MTok write plus $0.2/MTok reads on later turns.
    expect(spawn?.cachedLoopInputFloorUsd).toBeCloseTo(0.09 + (turns - 1) * 0.0072, 10);
    // The parity economics: the policy cuts the loop input floor
    // several-fold (about $1.1 down to about $0.2 at 15 turns).
    expect(
      (spawn?.uncachedLoopInputFloorUsd ?? 0) / (spawn?.cachedLoopInputFloorUsd ?? 1),
    ).toBeGreaterThan(3);
    // Under the default policy (auto), no warning fires: the loop WILL
    // cache.
    expect(report.findings.filter((f) => f.code === 'uncached-long-loop')).toHaveLength(0);
  });

  it("warns 'uncached-long-loop' when the policy is off under a long cycle", () => {
    const report = parityWorkerReport({ cacheMode: 'off' });
    const finding = report.findings.find((f) => f.code === 'uncached-long-loop');
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('warning');
    expect(finding?.message).toContain('parity-worker');
    expect(finding?.message).toContain('USD uncached');
  });

  it('stays silent without cache rates or on short loops', () => {
    const noRates = scriptedAdapter(() => ({ text: 'x' }), {
      caps: testCaps({ promptCaching: 'explicit' }),
    });
    const report = preflightEstimate({
      engine: {
        adapters: [noRates],
        defaults: { routing: { loop: SERVED }, cache: { mode: 'off' } },
      },
      run: { budgetUsd: 6 },
      spawns: [
        {
          label: 'unrated',
          estCost: 0.5,
          estInputTokens: 36_000,
          limits: { maxTurns: 15, maxOutputTokensPerTurn: 2500 },
        },
      ],
    });
    // The uncached figure still prices (input rate exists); the cached
    // one cannot, so the finding never fires half-informed.
    expect(report.spawns[0]?.uncachedLoopInputFloorUsd).toBeGreaterThan(0);
    expect(report.spawns[0]?.cachedLoopInputFloorUsd).toBeUndefined();
    expect(report.findings.filter((f) => f.code === 'uncached-long-loop')).toHaveLength(0);
  });
});
