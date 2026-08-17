/**
 * The resume-time budget override (RV2208). The RV1504 doctrine said a
 * resumed run keeps the original invocation's ceilings and
 * ResumeOptions deliberately had no field to change them; the seventh
 * subscription run then died against a ceiling one dollar short with
 * the host watching, and the only way forward was a new run that
 * re-paid the whole prefix. ResumeOptions.run is the ONE explicit door:
 * validated like RunOptions, floored at the settled spend (a ceiling
 * below spent exhausts the segment before its first turn), journaled
 * as a run_budget_override decision naming recorded and applied
 * values, and recorded back into RunMeta so a LATER bare resume
 * restores the overridden posture rather than the genesis one.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter, type ScriptedTurn } from './test-harness.js';

/** testCaps pricing: 1 USD per MTok input, 10 USD per MTok output. */
function storedEngine(script: (call: number) => ScriptedTurn) {
  const store = new InMemoryStore();
  const transcripts = new InMemoryTranscriptStore();
  const make = () => {
    const adapter = scriptedAdapter((_req, call) => script(call));
    return {
      adapter,
      engine: createEngine({
        adapters: [adapter],
        stores: { journal: store, transcripts },
        defaults: { routing: { loop: 'fake:model' } },
      }),
    };
  };
  return { store, make };
}

/**
 * Segment 1 burns 0.0006 USD (600 input tokens) inside a 0.001 USD
 * ceiling, then the second agent's 0.0008 USD estimate refuses
 * admission and the run settles exhausted. The exact c7 shape scaled
 * down: money died mid-plan, the journal holds a paid prefix.
 */
function exhaustedFirstSegment() {
  const harness = storedEngine((call) =>
    call === 0
      ? { text: 'probe done', usage: { inputTokens: 600, outputTokens: 0 } }
      : { text: 'tail done', usage: { inputTokens: 10, outputTokens: 5 } },
  );
  const wf = defineWorkflow({ name: 'stretch' }, async (ctx) => {
    const first = await ctx.agent('probe', { result: 'full', estCost: 0.0001 });
    const second = await ctx.agent('tail', { result: 'full', estCost: 0.0008 });
    return { first: first.status, second: second.status };
  });
  return { ...harness, wf };
}

describe('ResumeOptions.run raises the recorded ceiling (RV2208)', () => {
  it('a run exhausted against B0 resumes to completion under the override, journaled', async () => {
    const { store, make, wf } = exhaustedFirstSegment();
    const first = await make().engine.run(wf, undefined, {
      runId: 'OVERRIDE-RAISE',
      budgetUsd: 0.001,
    }).result;
    expect(first.status).toBe('exhausted');
    expect(first.error?.message ?? '').toContain('budget ceiling');

    // A bare resume keeps the recorded posture and dies the same way:
    // the override is a decision, never a default.
    const bare = await make().engine.resume('OVERRIDE-RAISE', wf).result;
    expect(bare.status).toBe('exhausted');
    expect(bare.error?.message ?? '').toContain('budget ceiling');

    const resumed = await make().engine.resume('OVERRIDE-RAISE', wf, {
      run: { budgetUsd: 0.002 },
    }).result;
    expect(resumed.status).toBe('ok');
    expect((resumed.value as { second: string }).second).toBe('ok');

    // The journaled decision carries the recorded value, the applied
    // value, the source, and the settled spend it was judged against.
    const entries = await store.load('OVERRIDE-RAISE');
    const decisions = entries.filter(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'run_budget_override',
    );
    expect(decisions).toHaveLength(1);
    const value = decisions[0]?.value as {
      source: string;
      segment: number;
      budgetUsd: { recorded: number | null; applied: number };
      settledSpendUsd: number;
    };
    expect(value.source).toBe('resume-options');
    expect(value.budgetUsd).toEqual({ recorded: 0.001, applied: 0.002 });
    expect(value.settledSpendUsd).toBeCloseTo(0.0006, 6);
    expect(value.segment).toBeGreaterThan(1);

    // The meta mirror records the new posture: a LATER bare resume
    // restores the overridden ceiling, not the genesis one.
    const meta = await store.getMeta('OVERRIDE-RAISE');
    expect(meta?.budgetUsd).toBe(0.002);
  });

  it('a bare resume after the override restores the overridden posture', async () => {
    const { store, make, wf } = exhaustedFirstSegment();
    await make().engine.run(wf, undefined, { runId: 'OVERRIDE-STICKS', budgetUsd: 0.001 }).result;
    const overridden = await make().engine.resume('OVERRIDE-STICKS', wf, {
      run: { budgetUsd: 0.002 },
    }).result;
    expect(overridden.status).toBe('ok');

    // Segment 3, bare: a pure replay of the settled run under the
    // RECORDED (overridden) ceiling; one decision entry, not two.
    const replayed = await make().engine.resume('OVERRIDE-STICKS', wf).result;
    expect(replayed.status).toBe('ok');
    const entries = await store.load('OVERRIDE-STICKS');
    const decisions = entries.filter(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'run_budget_override',
    );
    expect(decisions).toHaveLength(1);
    expect((await store.getMeta('OVERRIDE-STICKS'))?.budgetUsd).toBe(0.002);
  });
});

describe('the override floor and validation refuse typed (RV2208)', () => {
  it('a budgetUsd below the settled spend refuses before any side effect', async () => {
    const { store, make, wf } = exhaustedFirstSegment();
    await make().engine.run(wf, undefined, { runId: 'OVERRIDE-FLOOR', budgetUsd: 0.001 }).result;
    const before = (await store.load('OVERRIDE-FLOOR')).length;
    const metaBefore = await store.getMeta('OVERRIDE-FLOOR');

    await expect(
      make().engine.resume('OVERRIDE-FLOOR', wf, { run: { budgetUsd: 0.0004 } }).result,
    ).rejects.toThrow(ConfigError);
    await expect(
      make().engine.resume('OVERRIDE-FLOOR', wf, { run: { budgetUsd: 0.0004 } }).result,
    ).rejects.toThrow(/settled spend/);

    // Refused BEFORE ownership, meta, or any append: the journal and
    // the recorded posture are byte-identical to the pre-attempt state.
    expect((await store.load('OVERRIDE-FLOOR')).length).toBe(before);
    expect((await store.getMeta('OVERRIDE-FLOOR'))?.budgetUsd).toBe(metaBefore?.budgetUsd);
    expect((await store.getMeta('OVERRIDE-FLOOR'))?.segments).toBe(metaBefore?.segments);
  });

  it('a negative override refuses with the RunOptions validation, before any store read', async () => {
    const { make, wf } = exhaustedFirstSegment();
    await make().engine.run(wf, undefined, { runId: 'OVERRIDE-NEG', budgetUsd: 0.001 }).result;
    await expect(
      make().engine.resume('OVERRIDE-NEG', wf, { run: { budgetUsd: -1 } }).result,
    ).rejects.toThrow(/ResumeOptions\.run\.budgetUsd/);
    await expect(
      make().engine.resume('OVERRIDE-NEG', wf, { run: { maxInFlightExposureUsd: -1 } }).result,
    ).rejects.toThrow(/ResumeOptions\.run\.maxInFlightExposureUsd/);
  });

  it('an empty override object is a no-op, not a decision', async () => {
    const { store, make, wf } = exhaustedFirstSegment();
    await make().engine.run(wf, undefined, { runId: 'OVERRIDE-EMPTY', budgetUsd: 0.001 }).result;
    const resumed = await make().engine.resume('OVERRIDE-EMPTY', wf, { run: {} }).result;
    expect(resumed.status).toBe('exhausted');
    const entries = await store.load('OVERRIDE-EMPTY');
    expect(
      entries.filter(
        (entry) =>
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'run_budget_override',
      ),
    ).toHaveLength(0);
    expect((await store.getMeta('OVERRIDE-EMPTY'))?.budgetUsd).toBe(0.001);
  });
});

describe('the exposure cap override records beside the ceiling (RV2208)', () => {
  it('capping a run that started uncapped journals recorded null and mirrors into meta', async () => {
    const { store, make } = storedEngine(() => ({
      text: 'done',
      usage: { inputTokens: 10, outputTokens: 5 },
    }));
    const crash = { now: true };
    const wf = defineWorkflow({ name: 'capped-later' }, async (ctx) => {
      const first = await ctx.agent('probe', { result: 'full' });
      if (crash.now) {
        throw new Error('host crash after the probe');
      }
      return { first: first.status };
    });
    const first = await make().engine.run(wf, undefined, { runId: 'OVERRIDE-CAP' }).result;
    expect(first.status).toBe('error');

    crash.now = false;
    const resumed = await make().engine.resume('OVERRIDE-CAP', wf, {
      run: { maxInFlightExposureUsd: 0.5 },
    }).result;
    expect(resumed.status).toBe('ok');

    const entries = await store.load('OVERRIDE-CAP');
    const decisions = entries.filter(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'run_budget_override',
    );
    expect(decisions).toHaveLength(1);
    const value = decisions[0]?.value as {
      maxInFlightExposureUsd: { recorded: number | null; applied: number };
      budgetUsd?: unknown;
    };
    // 'was uncapped' is a fact the audit needs: null records it, and
    // the untouched ceiling stays out of the decision entirely.
    expect(value.maxInFlightExposureUsd).toEqual({ recorded: null, applied: 0.5 });
    expect(value.budgetUsd).toBeUndefined();
    expect((await store.getMeta('OVERRIDE-CAP'))?.maxInFlightExposureUsd).toBe(0.5);
  });
});

describe("budgetPolicy 'immutable-lifetime' welds the override door shut (RV3902)", () => {
  it('refuses a raising override typed, before ownership, meta writes, or any append', async () => {
    const { store, make, wf } = exhaustedFirstSegment();
    const first = await make().engine.run(wf, undefined, {
      runId: 'POLICY-RAISE',
      budgetUsd: 0.001,
      budgetPolicy: 'immutable-lifetime',
    }).result;
    expect(first.status).toBe('exhausted');
    expect((await store.getMeta('POLICY-RAISE'))?.budgetPolicy).toBe('immutable-lifetime');
    const entriesBefore = (await store.load('POLICY-RAISE')).length;
    const metaBefore = await store.getMeta('POLICY-RAISE');

    await expect(
      make().engine.resume('POLICY-RAISE', wf, { run: { budgetUsd: 0.002 } }).result,
    ).rejects.toMatchObject({
      code: 'config',
      message: expect.stringMatching(/immutable-lifetime/u) as unknown,
    });

    // Nothing durable moved: no append, no meta rewrite, no segment
    // bump, and the money is exactly where the settle left it.
    expect((await store.load('POLICY-RAISE')).length).toBe(entriesBefore);
    const metaAfter = await store.getMeta('POLICY-RAISE');
    expect(metaAfter?.segments).toBe(metaBefore?.segments);
    expect(metaAfter?.budgetUsd).toBe(0.001);
    expect(metaAfter?.budgetPolicy).toBe('immutable-lifetime');
  });

  it('refuses a lowering override and an exposure-only override alike', async () => {
    const { make, wf } = exhaustedFirstSegment();
    await make().engine.run(wf, undefined, {
      runId: 'POLICY-LOWER',
      budgetUsd: 0.001,
      budgetPolicy: 'immutable-lifetime',
    }).result;
    await expect(
      make().engine.resume('POLICY-LOWER', wf, { run: { budgetUsd: 0.0008 } }).result,
    ).rejects.toMatchObject({ code: 'config' });
    await expect(
      make().engine.resume('POLICY-LOWER', wf, { run: { maxInFlightExposureUsd: 1 } }).result,
    ).rejects.toMatchObject({ code: 'config' });
  });

  it('an empty override object stays the documented no-op, and a bare resume keeps the posture', async () => {
    const { store, make, wf } = exhaustedFirstSegment();
    await make().engine.run(wf, undefined, {
      runId: 'POLICY-NOOP',
      budgetUsd: 0.001,
      budgetPolicy: 'immutable-lifetime',
    }).result;
    // {} applies nothing and journals nothing, so there is nothing to
    // refuse; the run replays exhausted under its recorded ceiling.
    const noop = await make().engine.resume('POLICY-NOOP', wf, { run: {} }).result;
    expect(noop.status).toBe('exhausted');
    // The posture survives the bare resume: a second override attempt
    // in segment 3 refuses exactly like the first.
    await expect(
      make().engine.resume('POLICY-NOOP', wf, { run: { budgetUsd: 1 } }).result,
    ).rejects.toMatchObject({ code: 'config' });
    expect((await store.getMeta('POLICY-NOOP'))?.budgetPolicy).toBe('immutable-lifetime');
  });

  it("the default 'segment' posture and an explicit 'segment' record nothing and change nothing", async () => {
    const { store, make, wf } = exhaustedFirstSegment();
    await make().engine.run(wf, undefined, {
      runId: 'POLICY-DEFAULT',
      budgetUsd: 0.001,
      budgetPolicy: 'segment',
    }).result;
    // Absence means 'segment': the explicit default is not recorded,
    // so old stores and new read one meta shape.
    expect((await store.getMeta('POLICY-DEFAULT'))?.budgetPolicy).toBeUndefined();
    const resumed = await make().engine.resume('POLICY-DEFAULT', wf, {
      run: { budgetUsd: 0.002 },
    }).result;
    expect(resumed.status).toBe('ok');
  });

  it('a store that drops the field degrades to segment, never to an invented refusal', async () => {
    const { store, make, wf } = exhaustedFirstSegment();
    await make().engine.run(wf, undefined, {
      runId: 'POLICY-DROPPED',
      budgetUsd: 0.001,
      budgetPolicy: 'immutable-lifetime',
    }).result;
    // Simulate a legacy store that does not round-trip the field.
    const recorded = await store.getMeta('POLICY-DROPPED');
    expect(recorded).toBeDefined();
    if (recorded !== undefined) {
      const { budgetPolicy: _dropped, ...rest } = recorded;
      await store.putMeta(rest);
    }
    const resumed = await make().engine.resume('POLICY-DROPPED', wf, {
      run: { budgetUsd: 0.002 },
    }).result;
    expect(resumed.status).toBe('ok');
  });

  it('a malformed budgetPolicy refuses at genesis with the RunOptions validation', () => {
    const { make, wf } = exhaustedFirstSegment();
    // The intake validation throws synchronously, before any journal
    // entry or store read, exactly like the other RunOptions guards.
    expect(() =>
      make().engine.run(wf, undefined, {
        runId: 'POLICY-MALFORMED',
        budgetUsd: 0.001,
        budgetPolicy: 'frozen' as never,
      }),
    ).toThrowError(/RunOptions\.budgetPolicy must be 'segment' or 'immutable-lifetime'/u);
  });
});
