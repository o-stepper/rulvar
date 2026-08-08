/**
 * The semantic completion lift (RV-207 tail). Reproduced on published
 * 1.53.0: the acceptance machinery computed `completion` and
 * `childStatusCounts` into the result envelope (and the typed rejection
 * data), but `run:end` carried neither, so telemetry consumers had to
 * parse workflow-specific result shapes to learn whether an ok run was
 * actually complete. These tests pin the lift contract: valid envelope
 * fields surface on `run:end` for ok/exhausted runs, valid typed-error
 * data surfaces for error runs, malformed shapes stay silently absent,
 * and replay recomputes the same fields.
 */
import { describe, expect, it } from 'vitest';

import { BudgetExhaustedError, FailRunError } from '../l0/errors.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';

type RunEndEvent = {
  status: string;
  completion?: 'complete' | 'partial' | 'rejected';
  childStatusCounts?: Record<string, number>;
  degradedReasons?: string[];
  salvagedPartialChildren?: string[];
  salvagedTerminalOutputChildren?: string[];
};

type OutcomeLift = {
  status: string;
  completion?: 'complete' | 'partial' | 'rejected';
  childStatusCounts?: Record<string, number>;
  degradedReasons?: string[];
  salvagedPartialChildren?: string[];
  salvagedTerminalOutputChildren?: string[];
};

async function runAndCaptureEnd(
  engine: ReturnType<typeof createEngine>,
  wf: Parameters<ReturnType<typeof createEngine>['run']>[0],
  runId?: string,
): Promise<{ outcome: OutcomeLift; runEnd: RunEndEvent | undefined }> {
  const handle = engine.run(wf, undefined, runId === undefined ? undefined : { runId });
  let runEnd: RunEndEvent | undefined;
  handle.on('run:end', (event) => {
    runEnd = event;
  });
  const outcome = await handle.result;
  // run:end races handle.result; drain the microtask queue twice.
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  return { outcome, runEnd };
}

describe('the run:end semantic completion lift (RV-207 tail)', () => {
  it('lifts a valid completion envelope from an ok result', async () => {
    const engine = createEngine({ adapters: [] });
    const wf = defineWorkflow({ name: 'envelope' }, () =>
      Promise.resolve({
        result: 'the merged report',
        completion: 'partial' as const,
        childStatusCounts: { ok: 3, limit: 1 },
        degradedReasons: ["child worker-3 settled 'limit'"],
      }),
    );
    const { outcome, runEnd } = await runAndCaptureEnd(engine, wf);
    expect(outcome.status).toBe('ok');
    expect(runEnd?.status).toBe('ok');
    expect(runEnd?.completion).toBe('partial');
    expect(runEnd?.childStatusCounts).toEqual({ ok: 3, limit: 1 });
  });

  it('lifts completion and counts from typed error data on a rejected run', async () => {
    const engine = createEngine({ adapters: [] });
    const wf = defineWorkflow({ name: 'rejected' }, () => {
      throw new FailRunError('the acceptance policy rejected the finish', {
        data: {
          source: 'orchestrator_acceptance',
          completion: 'rejected',
          childStatusCounts: { ok: 1, limit: 2 },
        },
      });
    });
    const { outcome, runEnd } = await runAndCaptureEnd(engine, wf);
    expect(outcome.status).toBe('error');
    expect(runEnd?.status).toBe('error');
    expect(runEnd?.completion).toBe('rejected');
    expect(runEnd?.childStatusCounts).toEqual({ ok: 1, limit: 2 });
  });

  it('stays absent for plain results and invalid completion literals', async () => {
    const engine = createEngine({ adapters: [] });
    const plain = await runAndCaptureEnd(
      engine,
      defineWorkflow({ name: 'plain' }, () => Promise.resolve('just a string')),
    );
    expect(plain.runEnd?.completion).toBeUndefined();
    expect(plain.runEnd?.childStatusCounts).toBeUndefined();

    const invalid = await runAndCaptureEnd(
      engine,
      defineWorkflow({ name: 'invalid' }, () =>
        Promise.resolve({
          completion: 'done',
          childStatusCounts: { ok: 1 },
        }),
      ),
    );
    expect(invalid.runEnd?.completion).toBeUndefined();
    expect(invalid.runEnd?.childStatusCounts).toBeUndefined();
  });

  it('keeps a valid completion and drops a malformed counts record', async () => {
    const engine = createEngine({ adapters: [] });
    const wf = defineWorkflow({ name: 'partial-shape' }, () =>
      Promise.resolve({
        completion: 'complete',
        childStatusCounts: { ok: 1.5 },
      }),
    );
    const { runEnd } = await runAndCaptureEnd(engine, wf);
    expect(runEnd?.completion).toBe('complete');
    expect(runEnd?.childStatusCounts).toBeUndefined();
  });

  it('recomputes the same lifted fields on replay', async () => {
    const store = new InMemoryStore();
    const wf = defineWorkflow({ name: 'stable' }, () =>
      Promise.resolve({
        completion: 'complete' as const,
        childStatusCounts: { ok: 2 },
      }),
    );
    const engineA = createEngine({ adapters: [], stores: { journal: store } });
    const first = await runAndCaptureEnd(engineA, wf, 'LIFT');
    expect(first.runEnd?.completion).toBe('complete');

    const engineB = createEngine({ adapters: [], stores: { journal: store } });
    const handle = engineB.resume('LIFT', wf);
    let runEnd: RunEndEvent | undefined;
    handle.on('run:end', (event) => {
      runEnd = event;
    });
    const resumed = await handle.result;
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    expect(resumed.status).toBe('ok');
    expect(runEnd?.completion).toBe('complete');
    expect(runEnd?.childStatusCounts).toEqual({ ok: 2 });
  });
});

/**
 * The RunOutcome completion mirror (the 1.65.0 experiment review,
 * P0.5). Reproduced on published 1.65.0: the lift rode ONLY the run:end
 * telemetry event, so a host consuming handle.result had to parse the
 * workflow-shaped value on the accepted path and dig the typed error
 * data on the rejected one. The engine now computes the lift once and
 * both surfaces spread the same object.
 */
describe('the RunOutcome completion mirror (P0.5)', () => {
  it('mirrors the envelope of an ok result onto the outcome', async () => {
    const engine = createEngine({ adapters: [] });
    const wf = defineWorkflow({ name: 'envelope-mirror' }, () =>
      Promise.resolve({
        result: 'the merged report',
        completion: 'partial' as const,
        childStatusCounts: { ok: 3, limit: 1 },
      }),
    );
    const { outcome, runEnd } = await runAndCaptureEnd(engine, wf);
    expect(outcome.completion).toBe('partial');
    expect(outcome.childStatusCounts).toEqual({ ok: 3, limit: 1 });
    // The event and the outcome spread the SAME lift.
    expect(outcome.completion).toBe(runEnd?.completion);
    expect(outcome.childStatusCounts).toEqual(runEnd?.childStatusCounts);
  });

  it('mirrors typed error data onto the outcome of a rejected run', async () => {
    const engine = createEngine({ adapters: [] });
    const wf = defineWorkflow({ name: 'rejected-mirror' }, () => {
      throw new FailRunError('the acceptance policy rejected the finish', {
        data: {
          source: 'orchestrator_acceptance',
          completion: 'rejected',
          childStatusCounts: { ok: 1, limit: 2 },
        },
      });
    });
    const { outcome, runEnd } = await runAndCaptureEnd(engine, wf);
    expect(outcome.status).toBe('error');
    expect(outcome.completion).toBe('rejected');
    expect(outcome.childStatusCounts).toEqual({ ok: 1, limit: 2 });
    expect(outcome.completion).toBe(runEnd?.completion);
  });

  it('stays absent on the outcome for plain results and invalid literals', async () => {
    const engine = createEngine({ adapters: [] });
    const plain = await runAndCaptureEnd(
      engine,
      defineWorkflow({ name: 'plain-mirror' }, () => Promise.resolve('just a string')),
    );
    expect(plain.outcome.completion).toBeUndefined();
    expect(plain.outcome.childStatusCounts).toBeUndefined();

    const invalid = await runAndCaptureEnd(
      engine,
      defineWorkflow({ name: 'invalid-mirror' }, () =>
        Promise.resolve({ completion: 'done', childStatusCounts: { ok: 1 } }),
      ),
    );
    expect(invalid.outcome.completion).toBeUndefined();
    expect(invalid.outcome.childStatusCounts).toBeUndefined();
  });

  it('keeps a valid completion and drops malformed counts on the outcome', async () => {
    const engine = createEngine({ adapters: [] });
    const wf = defineWorkflow({ name: 'partial-shape-mirror' }, () =>
      Promise.resolve({ completion: 'complete', childStatusCounts: { ok: 1.5 } }),
    );
    const { outcome } = await runAndCaptureEnd(engine, wf);
    expect(outcome.completion).toBe('complete');
    expect(outcome.childStatusCounts).toBeUndefined();
  });

  it('a resumed run mirrors the same fields on its outcome', async () => {
    const store = new InMemoryStore();
    const wf = defineWorkflow({ name: 'stable-mirror' }, () =>
      Promise.resolve({
        completion: 'complete' as const,
        childStatusCounts: { ok: 2 },
      }),
    );
    const engineA = createEngine({ adapters: [], stores: { journal: store } });
    const first = await runAndCaptureEnd(engineA, wf, 'LIFT-MIRROR');
    expect(first.outcome.completion).toBe('complete');

    const engineB = createEngine({ adapters: [], stores: { journal: store } });
    const resumed = (await engineB.resume('LIFT-MIRROR', wf).result) as OutcomeLift;
    expect(resumed.status).toBe('ok');
    expect(resumed.completion).toBe('complete');
    expect(resumed.childStatusCounts).toEqual({ ok: 2 });
  });
});

/**
 * The degradation mirror (the fifth experiment, cycle 75). The
 * experiment's error outcome carried degradedReasons and the salvage
 * lists ONLY inside error.data; the top level RunOutcome mirrored just
 * completion and childStatusCounts, so the harness serialized empty
 * top-level arrays while the truth sat one level deeper. The lift now
 * carries the three degradation fields the acceptance envelope already
 * emits, on both surfaces, both paths.
 */
describe('the degradation mirror (cycle 75)', () => {
  it('mirrors degradedReasons and the salvage lists from an ok envelope', async () => {
    const engine = createEngine({ adapters: [] });
    const wf = defineWorkflow({ name: 'degraded-ok' }, () =>
      Promise.resolve({
        result: 'the merged report',
        completion: 'partial' as const,
        childStatusCounts: { ok: 3, limit: 1 },
        degradedReasons: ["child w3 settled 'limit' after the finalization reserve summary"],
        salvagedTerminalOutputChildren: ['w3'],
      }),
    );
    const { outcome, runEnd } = await runAndCaptureEnd(engine, wf);
    expect(outcome.degradedReasons).toEqual([
      "child w3 settled 'limit' after the finalization reserve summary",
    ]);
    expect(outcome.salvagedTerminalOutputChildren).toEqual(['w3']);
    expect(outcome.salvagedPartialChildren).toBeUndefined();
    expect(runEnd?.degradedReasons).toEqual(outcome.degradedReasons);
    expect(runEnd?.salvagedTerminalOutputChildren).toEqual(outcome.salvagedTerminalOutputChildren);
  });

  it('mirrors the degradation facts from typed error data on the rejected path', async () => {
    const engine = createEngine({ adapters: [] });
    const wf = defineWorkflow({ name: 'degraded-error' }, () => {
      throw new FailRunError('the synthesis invocation terminated', {
        data: {
          source: 'orchestrator_synthesis',
          completion: 'partial',
          childStatusCounts: { ok: 2, limit: 2 },
          degradedReasons: ["child a settled 'limit'", "child b settled 'limit'"],
          salvagedTerminalOutputChildren: ['a', 'b'],
          salvagedPartialChildren: [],
        },
      });
    });
    const { outcome } = await runAndCaptureEnd(engine, wf);
    expect(outcome.status).toBe('error');
    expect(outcome.degradedReasons).toHaveLength(2);
    expect(outcome.salvagedTerminalOutputChildren).toEqual(['a', 'b']);
    // An empty claimed list mirrors as the claim it is, not as absence.
    expect(outcome.salvagedPartialChildren).toEqual([]);
  });

  it('drops malformed degradation shapes while keeping the valid completion', async () => {
    const engine = createEngine({ adapters: [] });
    const wf = defineWorkflow({ name: 'degraded-malformed' }, () =>
      Promise.resolve({
        completion: 'partial' as const,
        degradedReasons: 'not an array',
        salvagedTerminalOutputChildren: [1, 2],
      }),
    );
    const { outcome } = await runAndCaptureEnd(engine, wf);
    expect(outcome.completion).toBe('partial');
    expect(outcome.degradedReasons).toBeUndefined();
    expect(outcome.salvagedTerminalOutputChildren).toBeUndefined();
  });
});

describe('the acceptance children lift (RV806)', () => {
  const CHILDREN = [
    { child: 'w1', status: 'ok' },
    {
      child: 'w2',
      status: 'limit',
      salvage: 'partial',
      evidence: { recordedEntries: 1, minEntries: 2, met: false, waivedBySalvage: true },
    },
  ];

  it('lifts a valid per-child summary onto the outcome and run:end', async () => {
    const engine = createEngine({ adapters: [] });
    const wf = defineWorkflow({ name: 'summary' }, () =>
      Promise.resolve({
        result: 'the merged report',
        completion: 'partial' as const,
        acceptanceChildren: CHILDREN,
      }),
    );
    const { outcome, runEnd } = await runAndCaptureEnd(engine, wf);
    expect((outcome as { acceptanceChildren?: unknown }).acceptanceChildren).toEqual(CHILDREN);
    expect((runEnd as { acceptanceChildren?: unknown } | undefined)?.acceptanceChildren).toEqual(
      CHILDREN,
    );
  });

  it('drops a malformed summary silently while keeping the valid completion', async () => {
    const engine = createEngine({ adapters: [] });
    const wf = defineWorkflow({ name: 'malformed' }, () =>
      Promise.resolve({
        result: 'x',
        completion: 'complete' as const,
        acceptanceChildren: [{ child: 5, status: 'ok' }],
      }),
    );
    const { outcome, runEnd } = await runAndCaptureEnd(engine, wf);
    expect(runEnd?.completion).toBe('complete');
    expect((outcome as { acceptanceChildren?: unknown }).acceptanceChildren).toBeUndefined();
    expect(
      (runEnd as { acceptanceChildren?: unknown } | undefined)?.acceptanceChildren,
    ).toBeUndefined();
  });
});

describe('the failure envelope carries the pass truth (RV2203)', () => {
  // The seventh subscription parity resume settled exhausted on a
  // spawn-cap refusal AFTER its acceptance verdict recorded
  // accepted/complete with four ok children, and the terminal read
  // completion null with children null; the RV2106 mirror run's error
  // terminal read claimConsistencyMeta null over a journal holding the
  // declined-judge verdict. The lift now reads the enriched error data
  // on the exhausted path and mirrors the claim meta on every path.
  it('an exhausted run with no value envelope lifts from its enriched error data', async () => {
    const engine = createEngine({ adapters: [], stores: { journal: new InMemoryStore() } });
    const wf = defineWorkflow({ name: 'famine' }, async () => {
      await Promise.resolve();
      throw new BudgetExhaustedError('engine lifetime spawn cap reached (8 spawns per run)', {
        data: {
          completion: 'complete',
          childStatusCounts: { ok: 4 },
          degradedReasons: [],
          claimConsistencyMeta: { judgeInvoked: false, judgeDeclined: true },
        },
      });
    });
    const { outcome, runEnd } = await runAndCaptureEnd(engine, wf);
    expect(outcome.status).toBe('exhausted');
    expect(outcome.completion).toBe('complete');
    expect(outcome.childStatusCounts).toEqual({ ok: 4 });
    expect(
      (outcome as { claimConsistencyMeta?: Record<string, unknown> }).claimConsistencyMeta,
    ).toEqual({ judgeInvoked: false, judgeDeclined: true });
    expect(
      (runEnd as { claimConsistencyMeta?: Record<string, unknown> } | undefined)
        ?.claimConsistencyMeta,
    ).toEqual({ judgeInvoked: false, judgeDeclined: true });
  });

  it('an error run lifts the claim meta and the synthesis-skip marker from its typed data', async () => {
    const engine = createEngine({ adapters: [], stores: { journal: new InMemoryStore() } });
    const wf = defineWorkflow({ name: 'rejected' }, async () => {
      await Promise.resolve();
      throw new FailRunError('finish failed host validation', {
        data: {
          completion: 'complete',
          childStatusCounts: { ok: 4 },
          claimConsistencyMeta: { judgeInvoked: false, judgeDeclined: true },
          synthesisSkipped: false,
        },
      });
    });
    const { outcome } = await runAndCaptureEnd(engine, wf);
    expect(outcome.status).toBe('error');
    expect(outcome.completion).toBe('complete');
    expect(
      (outcome as { claimConsistencyMeta?: Record<string, unknown> }).claimConsistencyMeta,
    ).toEqual({ judgeInvoked: false, judgeDeclined: true });
    expect((outcome as { synthesisSkipped?: boolean | string }).synthesisSkipped).toBe(false);
  });

  it('malformed claim meta drops silently, exactly like the roster', async () => {
    const engine = createEngine({ adapters: [], stores: { journal: new InMemoryStore() } });
    const wf = defineWorkflow({ name: 'malformed' }, async () => {
      await Promise.resolve();
      throw new FailRunError('rejected', {
        data: { completion: 'rejected', claimConsistencyMeta: 'nonsense', synthesisSkipped: 7 },
      });
    });
    const { outcome } = await runAndCaptureEnd(engine, wf);
    expect(outcome.completion).toBe('rejected');
    expect((outcome as { claimConsistencyMeta?: unknown }).claimConsistencyMeta).toBeUndefined();
    expect((outcome as { synthesisSkipped?: unknown }).synthesisSkipped).toBeUndefined();
  });
});
