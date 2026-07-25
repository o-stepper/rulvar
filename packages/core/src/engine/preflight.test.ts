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
import { dispatchProjectionReserveUsd } from '../orchestrator/admission.js';
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
});
