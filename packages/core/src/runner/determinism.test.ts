/**
 * Bare-nondeterminism detection (RV-209): localization, provenance
 * classification, modes, allowlist, redaction, the settle output digest,
 * and replay re-detection, all through real engine runs.
 */
import { describe, expect, it, vi } from 'vitest';

import type { DeterminismEvents, WorkflowEvent } from '../l0/events.js';
import { ConfigError, DeterminismError } from '../l0/errors.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { lastRunSettle } from '../stores/reconcile.js';
import { createEngine, hashRunOutput, type CreateEngineOptions } from '../engine/engine.js';
import { defineWorkflow } from '../engine/ctx.js';
import { validateDeterminismConfig } from './determinism.js';

/** The 1-based line of the CALLER of this helper, from its own stack. */
function hereLine(): number {
  const frame = new Error().stack?.split('\n')[2] ?? '';
  const match = /:(\d+):\d+\)?\s*$/.exec(frame);
  return match === null ? -1 : Number(match[1]);
}

type Collected = { events: WorkflowEvent[]; determinism: (WorkflowEvent & DeterminismEvents)[] };

async function collect(handle: {
  events: AsyncIterable<WorkflowEvent>;
  result: Promise<unknown>;
}): Promise<Collected> {
  const events: WorkflowEvent[] = [];
  const consumer = (async () => {
    for await (const event of handle.events) {
      events.push(event);
    }
  })().catch(() => undefined);
  await handle.result.catch(() => undefined);
  await consumer;
  return {
    events,
    determinism: events.filter(
      (event): event is WorkflowEvent & DeterminismEvents => event.type === 'determinism:warning',
    ),
  };
}

function spyWarnings(): { codes: string[]; restore: () => void } {
  const codes: string[] = [];
  const spy = vi
    .spyOn(process, 'emitWarning')
    .mockImplementation((warning: string | Error, opts?: { code?: string }) => {
      codes.push(typeof opts?.code === 'string' ? opts.code : String(warning));
    });
  return { codes, restore: () => spy.mockRestore() };
}

function engineWith(determinism?: CreateEngineOptions['determinism'], store?: InMemoryStore) {
  return createEngine({
    adapters: [],
    ...(store === undefined ? {} : { stores: { journal: store } }),
    ...(determinism === undefined ? {} : { determinism }),
  });
}

describe('determinism detection (RV-209)', () => {
  it('localizes a workflow-origin bare Math.random to this file and line, once per category', async () => {
    const warnings = spyWarnings();
    try {
      let expectedLine = -1;
      const wf = defineWorkflow({ name: 'localize' }, () => {
        expectedLine = hereLine() + 1;
        Math.random();
        Math.random();
        return Promise.resolve(1);
      });
      const handle = engineWith().run(wf, undefined);
      const { determinism } = await collect(handle);
      expect(determinism).toHaveLength(1);
      const event = determinism[0];
      expect(event.category).toBe('bare-math-random');
      expect(event.provenance).toBe('workflow');
      expect(event.file?.endsWith('determinism.test.ts')).toBe(true);
      expect(event.line).toBe(expectedLine);
      expect(typeof event.column).toBe('number');
      expect(event.frame).toContain('determinism.test.ts');
      // The process warning still fires (back-compat) and now carries
      // the callsite in its message.
      expect(warnings.codes.filter((code) => code === 'RULVAR_BARE_MATH_RANDOM')).toHaveLength(1);
    } finally {
      warnings.restore();
    }
  });

  it('emits one event per category: Date.now and Math.random each localize', async () => {
    const warnings = spyWarnings();
    try {
      const wf = defineWorkflow({ name: 'both' }, () => {
        Date.now();
        Math.random();
        return Promise.resolve(1);
      });
      const { determinism } = await collect(engineWith().run(wf, undefined));
      expect(determinism.map((event) => event.category).sort()).toEqual([
        'bare-date-now',
        'bare-math-random',
      ]);
      expect(determinism.every((event) => event.provenance === 'workflow')).toBe(true);
      expect(determinism.every((event) => typeof event.line === 'number')).toBe(true);
    } finally {
      warnings.restore();
    }
  });

  it("mode 'error' rejects the run at the call site with a typed DeterminismError", async () => {
    let thrownAtCallsite: unknown;
    const wf = defineWorkflow({ name: 'strict' }, () => {
      try {
        Math.random();
      } catch (thrown) {
        thrownAtCallsite = thrown;
        throw thrown;
      }
      return Promise.resolve(1);
    });
    const handle = engineWith({ mode: 'error' }).run(wf, undefined);
    const { determinism } = await collect(handle);
    const outcome = await handle.result;
    expect(thrownAtCallsite).toBeInstanceOf(DeterminismError);
    expect(outcome.status).toBe('error');
    expect(outcome.error?.code).toBe('determinism');
    const data = outcome.error?.data as { category?: string; file?: string; line?: number };
    expect(data.category).toBe('bare-math-random');
    expect(data.file?.endsWith('determinism.test.ts')).toBe(true);
    expect(typeof data.line).toBe('number');
    // The event is emitted even though the run rejects.
    expect(determinism).toHaveLength(1);
  });

  it("mode 'error': a workflow that swallows the throw still rejects at settle", async () => {
    const wf = defineWorkflow({ name: 'swallow' }, () => {
      try {
        Math.random();
      } catch {
        // Swallowed: the workflow pretends nothing happened.
      }
      return Promise.resolve('completed anyway');
    });
    const outcome = await engineWith({ mode: 'error' }).run(wf, undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.code).toBe('determinism');
    expect(outcome.value).toBeUndefined();
  });

  it('allowlisted frames classify as allowlisted: event only, no warning, no rejection', async () => {
    const warnings = spyWarnings();
    try {
      const wf = defineWorkflow({ name: 'allowed' }, () => {
        Math.random();
        return Promise.resolve(1);
      });
      const outcome = await (async () => {
        const handle = engineWith({
          mode: 'error',
          allowlist: ['determinism.test.ts'],
        }).run(wf, undefined);
        const collected = await collect(handle);
        return { collected, outcome: await handle.result };
      })();
      expect(outcome.outcome.status).toBe('ok');
      expect(outcome.collected.determinism).toHaveLength(1);
      expect(outcome.collected.determinism[0].provenance).toBe('allowlisted');
      expect(warnings.codes.filter((code) => code.startsWith('RULVAR_BARE'))).toHaveLength(0);
    } finally {
      warnings.restore();
    }
  });

  it('RegExp allowlist entries match by test', async () => {
    const wf = defineWorkflow({ name: 'allowed-re' }, () => {
      Date.now();
      return Promise.resolve(1);
    });
    const handle = engineWith({ mode: 'error', allowlist: [/determinism\.test\.ts/] }).run(
      wf,
      undefined,
    );
    const { determinism } = await collect(handle);
    expect((await handle.result).status).toBe('ok');
    expect(determinism[0]?.provenance).toBe('allowlisted');
  });

  it('the redact hook rewrites frame and file before they leave in events and errors', async () => {
    const redact = (frame: string): string => frame.replace(/\/[^\s():]*\//g, '<redacted>/');
    const wf = defineWorkflow({ name: 'redacted' }, () => {
      Math.random();
      return Promise.resolve(1);
    });
    const handle = engineWith({ mode: 'error', redact }).run(wf, undefined);
    const { determinism } = await collect(handle);
    const outcome = await handle.result;
    expect(determinism[0]?.file).toBe('<redacted>/determinism.test.ts');
    expect(determinism[0]?.frame).not.toContain('/Users/');
    const data = outcome.error?.data as { file?: string };
    expect(data.file).toBe('<redacted>/determinism.test.ts');
    expect(outcome.error?.message).not.toContain('/Users/');
  });

  it("NODE_ENV=production disables 'warn' but never 'error'", async () => {
    const warnings = spyWarnings();
    const prior = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const wf = defineWorkflow({ name: 'prod' }, () => {
        Math.random();
        return Promise.resolve(1);
      });
      const relaxed = engineWith().run(wf, undefined);
      const relaxedEvents = await collect(relaxed);
      expect((await relaxed.result).status).toBe('ok');
      expect(relaxedEvents.determinism).toHaveLength(0);
      expect(warnings.codes.filter((code) => code.startsWith('RULVAR_BARE'))).toHaveLength(0);
      const strict = engineWith({ mode: 'error' }).run(wf, undefined);
      const strictEvents = await collect(strict);
      expect((await strict.result).status).toBe('error');
      expect(strictEvents.determinism).toHaveLength(1);
    } finally {
      if (prior === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = prior;
      }
      warnings.restore();
    }
  });

  it("mode 'off' detects nothing", async () => {
    const warnings = spyWarnings();
    try {
      const wf = defineWorkflow({ name: 'off' }, () => {
        Math.random();
        Date.now();
        return Promise.resolve(1);
      });
      const { determinism } = await collect(engineWith({ mode: 'off' }).run(wf, undefined));
      expect(determinism).toHaveLength(0);
      expect(warnings.codes.filter((code) => code.startsWith('RULVAR_BARE'))).toHaveLength(0);
    } finally {
      warnings.restore();
    }
  });

  it('replay re-detects: the event fires again on a dry-run resume because the body re-executes', async () => {
    const warnings = spyWarnings();
    try {
      const store = new InMemoryStore();
      const wf = defineWorkflow({ name: 'replayed' }, () => {
        Math.random();
        return Promise.resolve({ fixed: true });
      });
      const live = engineWith(undefined, store).run(wf, undefined);
      const liveCollected = await collect(live);
      expect(liveCollected.determinism).toHaveLength(1);
      const resumed = engineWith(undefined, store).resume(live.runId, wf, { dryRun: true });
      const replayCollected = await collect(resumed);
      expect(replayCollected.determinism).toHaveLength(1);
      expect(replayCollected.determinism[0].provenance).toBe('workflow');
    } finally {
      warnings.restore();
    }
  });

  it('config validation fails loud at construction', () => {
    expect(() => validateDeterminismConfig({ mode: 'strict' as never })).toThrow(ConfigError);
    expect(() => validateDeterminismConfig({ allowlist: [42 as never] })).toThrow(ConfigError);
    expect(() => validateDeterminismConfig({ redact: 'trim' as never })).toThrow(ConfigError);
    expect(() => createEngine({ adapters: [], determinism: { mode: 'strict' as never } })).toThrow(
      ConfigError,
    );
    expect(() => validateDeterminismConfig(undefined)).not.toThrow();
    expect(() =>
      validateDeterminismConfig({ mode: 'error', allowlist: ['x', /y/], redact: (frame) => frame }),
    ).not.toThrow();
  });
});

describe('run output digest (RV-209)', () => {
  it('hashRunOutput: stable JCS sha256; undefined and unserializable values record none', () => {
    expect(hashRunOutput({ b: 2, a: 1 })).toBe(hashRunOutput({ a: 1, b: 2 }));
    expect(hashRunOutput({ a: 1 })).not.toBe(hashRunOutput({ a: 2 }));
    expect(hashRunOutput(undefined)).toBeUndefined();
    expect(hashRunOutput({ fn: () => 1 })).toBeUndefined();
  });

  it('the settle decision records outputHash for the computed value; pure replay appends nothing', async () => {
    const warnings = spyWarnings();
    try {
      const store = new InMemoryStore();
      // At least one journaled effect: an empty-journal run appends no
      // settle at all (by design), so the digest rides a real journal.
      const wf = defineWorkflow({ name: 'hashed' }, async (ctx) => {
        ctx.random();
        return Promise.resolve({ answer: 42 });
      });
      const live = engineWith(undefined, store).run(wf, undefined);
      const outcome = await live.result;
      expect(outcome.status).toBe('ok');
      const entries = await store.load(live.runId);
      const settle = lastRunSettle(entries);
      expect(settle?.runStatus).toBe('ok');
      expect(settle?.outputHash).toBe(hashRunOutput({ answer: 42 }));
      const resumed = engineWith(undefined, store).resume(live.runId, wf, { dryRun: true });
      await resumed.result;
      expect((await store.load(live.runId)).length).toBe(entries.length);
    } finally {
      warnings.restore();
    }
  });

  it('an unserializable result settles ok with no recorded hash', async () => {
    const store = new InMemoryStore();
    const wf = defineWorkflow({ name: 'unhashable' }, async (ctx) => {
      ctx.random();
      return Promise.resolve({ callback: () => 'not JCS' });
    });
    const live = engineWith(undefined, store).run(wf, undefined);
    expect((await live.result).status).toBe('ok');
    const settle = lastRunSettle(await store.load(live.runId));
    expect(settle?.runStatus).toBe('ok');
    expect(settle?.outputHash).toBeUndefined();
  });
});
