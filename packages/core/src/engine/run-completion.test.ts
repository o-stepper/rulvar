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

import { FailRunError } from '../l0/errors.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';

type RunEndEvent = {
  status: string;
  completion?: 'complete' | 'partial' | 'rejected';
  childStatusCounts?: Record<string, number>;
};

async function runAndCaptureEnd(
  engine: ReturnType<typeof createEngine>,
  wf: Parameters<ReturnType<typeof createEngine>['run']>[0],
  runId?: string,
): Promise<{ outcome: { status: string }; runEnd: RunEndEvent | undefined }> {
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
