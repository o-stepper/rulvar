/**
 * The opt-in in-flight exposure cap end to end (RV711). The hole: the
 * per-turn guard checks money already SPENT, so N concurrent turns
 * each pass it before any settles and together cross the ceiling by up
 * to one whole turn each (the eleventh dossier priced a five-turn wave
 * at 1.70 USD past the ceiling; preflight reports the number but
 * nothing could bound it). With RunOptions.maxInFlightExposureUsd the
 * admission holds each turn's own estimate from right before the
 * provider call until the attempt settles, and the dispatch whose
 * estimate does not fit spent + reserves + live estimates is refused
 * with a typed BudgetExhaustedError instead of waiting. Off by
 * default with byte-identical wire traffic.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';

/** Three concurrent one-turn agents, then one sequential straggler. */
const CONCURRENT_WF = defineWorkflow({ name: 'wave' }, async (ctx) => {
  const full = { result: 'full' } as const;
  const wave = await Promise.allSettled([
    ctx.agent('probe', full),
    ctx.agent('probe', full),
    ctx.agent('probe', full),
  ]);
  const after = await ctx.agent('probe', full);
  return {
    wave: wave.map((settled) =>
      settled.status === 'fulfilled'
        ? { status: settled.value.status, errorMessage: settled.value.errorMessage }
        : { status: 'rejected', errorMessage: String(settled.reason) },
    ),
    after: after.status,
  };
});

interface WaveResult {
  wave: Array<{ status: string; errorMessage?: string }>;
  after: string;
}

function waveEngine() {
  // Every turn hangs 150ms before finishing, so the three dispatches
  // are in flight simultaneously and none has settled when the last
  // one asks for admission.
  const adapter = scriptedAdapter(() => ({ hangMs: 150, text: 'ok' }));
  const engine = createEngine({
    adapters: [adapter],
    concurrency: { perRun: 4 },
    defaults: { routing: { loop: 'fake:model' } },
  });
  return { adapter, engine };
}

describe('RunOptions.maxInFlightExposureUsd (RV711)', () => {
  // testCaps pricing: 1 USD per MTok input, 10 USD per MTok output.
  // With maxOutputTokensPerTurn 100 the planned output term is exactly
  // 0.001 USD; the prompt estimate adds a few hundredths of that. A
  // 0.0025 cap therefore admits two concurrent estimates and refuses
  // the third.
  const LIMITS = { maxOutputTokensPerTurn: 100 };

  it('without the option every concurrent dispatch admits (the hole, pinned)', async () => {
    const { engine } = waveEngine();
    const outcome = await engine.run(CONCURRENT_WF, undefined, { limits: LIMITS }).result;
    expect(outcome.status).toBe('ok');
    const value = outcome.value as WaveResult;
    expect(value.wave.map((entry) => entry.status)).toEqual(['ok', 'ok', 'ok']);
    expect(value.after).toBe('ok');
  });

  it('the cap refuses the dispatch whose estimate does not fit, typed, and frees at settle', async () => {
    const { adapter, engine } = waveEngine();
    const outcome = await engine.run(CONCURRENT_WF, undefined, {
      limits: LIMITS,
      maxInFlightExposureUsd: 0.0025,
    }).result;
    expect(outcome.status).toBe('ok');
    const value = outcome.value as WaveResult;
    const statuses = value.wave.map((entry) => entry.status).sort();
    // Two admitted, one refused. The refusal rides the uniform ctx
    // budget surface (a typed BudgetExhaustedError, never a silent
    // wait) and carries the exposure arithmetic, not a false claim
    // that a ceiling crossed.
    expect(statuses).toEqual(['ok', 'ok', 'rejected']);
    const refused = value.wave.find((entry) => entry.status === 'rejected');
    expect(refused?.errorMessage).toContain('BudgetExhaustedError');
    expect(refused?.errorMessage).toContain('in flight exposure cap reached');
    expect(refused?.errorMessage).toContain('maxInFlightExposureUsd');
    expect(refused?.errorMessage).not.toContain('run budget ceiling reached');
    // The refused agent never reached the provider: exactly the two
    // admitted wave turns plus the sequential straggler dispatched.
    expect(adapter.calls).toHaveLength(3);
    // The straggler admitted AFTER the wave settled: the reservations
    // were released with their attempts, not leaked.
    expect(value.after).toBe('ok');
  });

  it('a high cap leaves the wire traffic byte identical', async () => {
    const run = async (withCap: boolean): Promise<string> => {
      const { adapter, engine } = waveEngine();
      const outcome = await engine.run(CONCURRENT_WF, undefined, {
        limits: LIMITS,
        ...(withCap ? { maxInFlightExposureUsd: 999 } : {}),
      }).result;
      expect(outcome.status).toBe('ok');
      return JSON.stringify(adapter.calls);
    };
    expect(await run(true)).toBe(await run(false));
  });

  it('a malformed cap is a synchronous ConfigError before any journal write', () => {
    const { engine } = waveEngine();
    expect(() => engine.run(CONCURRENT_WF, undefined, { maxInFlightExposureUsd: -1 })).toThrow(
      ConfigError,
    );
    expect(() =>
      engine.run(CONCURRENT_WF, undefined, { maxInFlightExposureUsd: Number.NaN }),
    ).toThrow(ConfigError);
  });
});

/**
 * The cap survives resume (RV1504, the eighteenth improvement plan).
 * The option used to be per-invocation and unrecorded, so a resumed
 * segment ran WITHOUT the exposure bound the original invocation
 * declared: the seventeenth comparison benchmark named the silent
 * uncapping its top FinOps gap. The cap is now recorded in RunMeta at
 * genesis, exactly like budgetUsd, and travels back in on resume;
 * the only thing that changes it is the explicit, journaled
 * ResumeOptions.run override (RV2208).
 */
describe('the exposure cap on resume (RV1504)', () => {
  const LIMITS = { maxOutputTokensPerTurn: 100 };

  /**
   * One settled agent, a host crash point, then the concurrent wave.
   * The turn limits ride the AGENT calls, not RunOptions: run-level
   * limits are per-invocation and deliberately unrecorded, so pinning
   * the estimate to the calls is what keeps it identical across the
   * two segments this test spans.
   */
  const phasedWorkflow = (crash: { now: boolean }) =>
    defineWorkflow({ name: 'phased' }, async (ctx) => {
      const full = { result: 'full', limits: LIMITS } as const;
      const first = await ctx.agent('probe', full);
      if (crash.now) {
        throw new Error('host crash between the phases');
      }
      const wave = await Promise.allSettled([
        ctx.agent('wave probe', full),
        ctx.agent('wave probe', full),
        ctx.agent('wave probe', full),
      ]);
      return {
        first: first.status,
        wave: wave.map((settled) =>
          settled.status === 'fulfilled'
            ? { status: settled.value.status, errorMessage: settled.value.errorMessage }
            : { status: 'rejected', errorMessage: String(settled.reason) },
        ),
      };
    });

  function storedEngine() {
    const store = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const make = () => {
      const adapter = scriptedAdapter(() => ({ hangMs: 150, text: 'ok' }));
      return {
        adapter,
        engine: createEngine({
          adapters: [adapter],
          concurrency: { perRun: 4 },
          stores: { journal: store, transcripts },
          defaults: { routing: { loop: 'fake:model' } },
        }),
      };
    };
    return { store, make };
  }

  it('records the cap at genesis and a resumed segment enforces it without re-supply', async () => {
    const { store, make } = storedEngine();
    const crash = { now: true };
    const wf = phasedWorkflow(crash);
    const first = await make().engine.run(wf, undefined, {
      runId: 'CAPPED',
      maxInFlightExposureUsd: 0.0025,
    }).result;
    expect(first.status).toBe('error');
    // The cap is durable meta now, the budgetUsd rule.
    const meta = (await store.listRuns()).find((candidate) => candidate.runId === 'CAPPED');
    expect(meta?.maxInFlightExposureUsd).toBe(0.0025);

    crash.now = false;
    const { adapter, engine } = make();
    const resumed = await engine.resume('CAPPED', wf).result;
    expect(resumed.status).toBe('ok');
    const value = resumed.value as {
      first: string;
      wave: Array<{ status: string; errorMessage?: string }>;
    };
    expect(value.first).toBe('ok');
    const statuses = value.wave.map((entry) => entry.status).sort();
    // The restored cap admits two concurrent estimates and refuses the
    // third, exactly what the original invocation declared; nothing
    // re-supplied it on resume.
    expect(statuses).toEqual(['ok', 'ok', 'rejected']);
    const refused = value.wave.find((entry) => entry.status === 'rejected');
    expect(refused?.errorMessage).toContain('in flight exposure cap reached');
    expect(refused?.errorMessage).toContain('maxInFlightExposureUsd');
    // The first agent replayed (one journaled call), the wave ran live:
    // exactly two admitted dispatches in the resume segment.
    expect(adapter.calls).toHaveLength(2);
  });

  it('a meta without the field resumes uncapped, exactly as before', async () => {
    const { make } = storedEngine();
    const crash = { now: true };
    const wf = phasedWorkflow(crash);
    const first = await make().engine.run(wf, undefined, {
      runId: 'LEGACY',
    }).result;
    expect(first.status).toBe('error');

    crash.now = false;
    const resumed = await make().engine.resume('LEGACY', wf).result;
    expect(resumed.status).toBe('ok');
    const value = resumed.value as { wave: Array<{ status: string }> };
    expect(value.wave.map((entry) => entry.status)).toEqual(['ok', 'ok', 'ok']);
  });
});

/**
 * The exposure room clamps a lone dispatch instead of refusing it
 * (RV2503). The 1.226.0 comparison run's mandatory repair turn was
 * refused before any provider call: nothing else was in flight, the
 * budget still held 0.8642 USD, and the FULL 18000 token plan priced
 * 0.7066 USD against 0.5642 USD of room. Re-issued after the operator
 * raised the ceiling, the same work wrote 12840 output tokens and cost
 * 0.4788 USD. A refusal with nothing live buys nothing: no hold will
 * release, so the only choices are a shorter turn or no turn. With
 * siblings live the refusal stays exactly as RV711 wrote it.
 */
describe('a lone dispatch is clamped, not refused (RV2503)', () => {
  const SOLO_WF = defineWorkflow({ name: 'solo' }, async (ctx) => {
    const one = await ctx.agent('probe', { result: 'full' });
    return one.status;
  });

  function soloEngine() {
    const adapter = scriptedAdapter(() => ({ text: 'ok' }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    return { adapter, engine };
  }

  // testCaps pricing: 1 USD per MTok input, 10 USD per MTok output. A
  // 1000 token plan is therefore 0.01 USD of output, which does not fit
  // a 0.004 USD cap, while a few hundred tokens do.
  const LIMITS = { maxOutputTokensPerTurn: 1000 };

  it('shortens the plan to what the room affords and dispatches it', async () => {
    const { adapter, engine } = soloEngine();
    const outcome = await engine.run(SOLO_WF, undefined, {
      limits: LIMITS,
      maxInFlightExposureUsd: 0.004,
      clampTurnToExposure: true,
    }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('ok');
    // The turn ran, and it ran shorter: the historical path refused it
    // outright with the cap arithmetic in a typed error.
    expect(adapter.calls).toHaveLength(1);
    const planned = adapter.calls[0]?.maxOutputTokens;
    expect(planned).toBeGreaterThan(0);
    expect(planned).toBeLessThan(LIMITS.maxOutputTokensPerTurn);
  });

  it('clamps with no USD ceiling configured at all: the two ceilings are independent', async () => {
    const { adapter, engine } = soloEngine();
    const outcome = await engine.run(SOLO_WF, undefined, {
      limits: LIMITS,
      maxInFlightExposureUsd: 0.004,
      clampTurnToExposure: true,
      budgetUsd: undefined,
    }).result;
    expect(outcome.status).toBe('ok');
    expect(adapter.calls[0]?.maxOutputTokens).toBeLessThan(LIMITS.maxOutputTokensPerTurn);
  });

  it('leaves the full plan alone when the room affords it', async () => {
    const { adapter, engine } = soloEngine();
    const outcome = await engine.run(SOLO_WF, undefined, {
      limits: LIMITS,
      maxInFlightExposureUsd: 999,
      clampTurnToExposure: true,
    }).result;
    expect(outcome.status).toBe('ok');
    expect(adapter.calls[0]?.maxOutputTokens).toBe(LIMITS.maxOutputTokensPerTurn);
  });

  it('a room below the output floor still refuses typed, never a truncated turn', async () => {
    const { adapter, engine } = soloEngine();
    const outcome = await engine.run(SOLO_WF, undefined, {
      limits: LIMITS,
      maxInFlightExposureUsd: 0.0000001,
      clampTurnToExposure: true,
    }).result;
    expect(outcome.status).toBe('exhausted');
    expect(outcome.error?.message ?? '').toContain('in flight exposure cap reached');
    // Not an output-floor verdict: the orchestrator's coordination
    // catch reads that one as a still fundable tail (RV2101).
    expect(outcome.error?.message ?? '').not.toContain('cannot afford one output token');
    expect(adapter.calls).toHaveLength(0);
  });

  it('without the opt-in the same room refuses, the historical path', async () => {
    const { adapter, engine } = soloEngine();
    const outcome = await engine.run(SOLO_WF, undefined, {
      limits: LIMITS,
      maxInFlightExposureUsd: 0.004,
    }).result;
    expect(outcome.status).toBe('exhausted');
    expect(outcome.error?.message ?? '').toContain('in flight exposure cap reached');
    expect(adapter.calls).toHaveLength(0);
  });

  it('a non boolean opt-in is a synchronous ConfigError before any journal write', () => {
    const { engine } = soloEngine();
    expect(() =>
      engine.run(SOLO_WF, undefined, {
        clampTurnToExposure: 'yes' as unknown as boolean,
      }),
    ).toThrow(ConfigError);
  });
});
