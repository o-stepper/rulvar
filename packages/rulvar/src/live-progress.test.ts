/**
 * The live progress view over a synthetic WorkflowEvent stream: injected
 * clock and sink make every frame deterministic. Rendering is telemetry
 * folding, so the tests assert CONTENT (statuses, timers, tokens, roles,
 * dollars), not byte-exact frames.
 */
import { describe, expect, it } from 'vitest';
import type { CostReport, RunHandle, RunOutcome, WorkflowEvent } from '@rulvar/core';

import { progress, type ProgressClock, type ProgressSink } from './live-progress.js';

/* ------------------------------ test rig -------------------------------- */

function fakeClock(startMs = 1000): ProgressClock & { advance(ms: number): void; fire(): void } {
  let now = startMs;
  const ticks: Array<() => void> = [];
  return {
    now: () => now,
    every: (_ms, fn) => {
      ticks.push(fn);
      return () => {
        const index = ticks.indexOf(fn);
        if (index >= 0) ticks.splice(index, 1);
      };
    },
    advance: (ms) => {
      now += ms;
    },
    fire: () => {
      for (const fn of [...ticks]) fn();
    },
  };
}

function fakeSink(columns = 120): ProgressSink & { chunks: string[]; text(): string } {
  const chunks: string[] = [];
  return {
    chunks,
    isTTY: true,
    columns,
    write: (chunk) => {
      chunks.push(chunk);
    },
    text: () =>
      chunks
        .join('')
        // eslint-disable-next-line no-control-regex
        .replace(/\u001B\[[0-9;?]*[A-Za-z]/gu, ''),
  };
}

let seq = 0;
function ev(
  body: Record<string, unknown>,
  span = 's1',
  extra?: Record<string, unknown>,
): WorkflowEvent {
  seq += 1;
  return {
    runId: 'R1',
    seq,
    ts: new Date(1_700_000_000_000 + seq).toISOString(),
    spanId: span,
    ...extra,
    ...body,
  } as unknown as WorkflowEvent;
}

interface Queue {
  push(event: WorkflowEvent): void;
  end(): void;
  iterable: AsyncIterable<WorkflowEvent>;
}

function queueSource(): Queue {
  const buffer: WorkflowEvent[] = [];
  let notify: (() => void) | undefined;
  let closed = false;
  const iterable = (async function* stream(): AsyncGenerator<WorkflowEvent> {
    for (;;) {
      while (buffer.length > 0) {
        yield buffer.shift() as WorkflowEvent;
      }
      if (closed) {
        return;
      }
      await new Promise<void>((resolve) => {
        notify = resolve;
      });
    }
  })();
  return {
    iterable,
    push: (event) => {
      buffer.push(event);
      notify?.();
      notify = undefined;
    },
    end: () => {
      closed = true;
      notify?.();
      notify = undefined;
    },
  };
}

const settle = async (): Promise<void> => {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
};

/* -------------------------------- tests --------------------------------- */

describe('tty mode', () => {
  it('renders status, timer, tokens, cost, and per-role slices for one agent', async () => {
    const clock = fakeClock();
    const sink = fakeSink();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'tty', clock, sink, color: false });

    queue.push(ev({ type: 'run:start', workflow: 'demo', resumed: false }, 'root'));
    queue.push(
      ev(
        {
          type: 'agent:start',
          agentType: 'worker',
          label: 'web',
          model: 'openai:gpt-5.6-terra',
          role: 'loop',
        },
        'a1',
      ),
    );
    await settle();
    clock.advance(2100);
    view.render();
    const midFrame = sink.text();
    expect(midFrame).toContain('demo');
    expect(midFrame).toContain('worker (web)');
    expect(midFrame).toContain('openai:gpt-5.6-terra');
    expect(midFrame).toContain('2.1s');

    queue.push(ev({ type: 'agent:stream', agentType: 'worker', delta: 'x'.repeat(4000) }, 'a1'));
    await settle();
    view.render();
    expect(sink.text()).toContain('~1.0k out');

    // An inner finalize phase takes over the same span.
    queue.push(
      ev(
        {
          type: 'agent:start',
          agentType: 'worker',
          label: 'web',
          model: 'openai:gpt-5.6-terra',
          role: 'finalize',
        },
        'a1',
      ),
    );
    await settle();
    clock.advance(900);
    queue.push(
      ev(
        {
          type: 'agent:end',
          agentType: 'worker',
          label: 'web',
          status: 'ok',
          usage: { inputTokens: 8200, outputTokens: 1150, cacheReadTokens: 0, cacheWriteTokens: 0 },
          costUsd: 0.0189,
          entryRef: 2,
        },
        'a1',
      ),
    );
    queue.push(ev({ type: 'run:end', status: 'ok', totalUsd: 0.0189 }, 'root'));
    queue.end();
    await view.done;

    const finalFrame = sink.text();
    expect(finalFrame).toContain('in 8.2k out 1.1k');
    expect(finalFrame).toContain('$0.019');
    expect(finalFrame).toContain('roles: loop 2.1s');
    expect(finalFrame).toContain('finalize 0.9s');
    expect(finalFrame).toContain('ok  total $0.019');
    // The cursor is hidden during the run and restored at stop.
    expect(sink.chunks.join('')).toContain('\u001B[?25l');
    expect(sink.chunks.join('')).toContain('\u001B[?25h');
  });

  it('shows the budget header and marks replayed rows without timers', async () => {
    const clock = fakeClock();
    const sink = fakeSink();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'tty', clock, sink, color: false });

    queue.push(ev({ type: 'run:start', workflow: 'resumed-run', resumed: true }, 'root'));
    queue.push(
      ev(
        { type: 'budget:update', spentUsd: 0.25, remainingUsd: 0.75, committedReserveUsd: 0 },
        'root',
      ),
    );
    queue.push(
      ev(
        {
          type: 'agent:end',
          agentType: 'old',
          status: 'ok',
          usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
          costUsd: 0.1,
          entryRef: 1,
        },
        'r1',
        { replayed: true },
      ),
    );
    await settle();
    view.render();
    const frame = sink.text();
    expect(frame).toContain('(resumed)');
    expect(frame).toContain('$0.250 / $1.00');
    expect(frame).toContain('replay');
    queue.end();
    await view.done;
  });

  it('nests children, counts tools, and surfaces banners and notices', async () => {
    const clock = fakeClock();
    const sink = fakeSink();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'tty', clock, sink, color: false });

    queue.push(ev({ type: 'run:start', workflow: 'tree', resumed: false }, 'root'));
    queue.push(ev({ type: 'child:start', workflow: 'sub', scope: 'c0' }, 'c1'));
    queue.push(
      ev({ type: 'agent:start', agentType: 'inner', model: 'fake:model', role: 'loop' }, 'a2', {
        parentSpanId: 'c1',
      }),
    );
    queue.push(ev({ type: 'tool:start', toolName: 'web_fetch' }, 'a2'));
    await settle();
    view.render();
    expect(sink.text()).toContain('tool: web_fetch');

    queue.push(
      ev({ type: 'tool:end', toolName: 'web_fetch', outcome: 'ok', durationMs: 10 }, 'a2'),
    );
    queue.push(ev({ type: 'approval:pending', toolName: 'rm_rf', entryRef: 9 }, 'a2'));
    queue.push(ev({ type: 'log', level: 'warn', msg: 'unpriced model somewhere' }, 'root'));
    await settle();
    view.render();
    const frame = sink.text();
    expect(frame).toContain('sub (c0)');
    expect(frame).toContain('approval pending: rm_rf');
    expect(frame).toContain('warn: unpriced model somewhere');
    expect(frame).toContain('1 tool');
    queue.end();
    await view.done;
  });
});

describe('lines mode', () => {
  it('appends one line per lifecycle fact with tokens, cost, elapsed, and the role chain', async () => {
    const clock = fakeClock();
    const sink = fakeSink();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'lines', clock, sink });

    queue.push(ev({ type: 'run:start', workflow: 'demo', resumed: false }, 'root'));
    queue.push(
      ev({ type: 'agent:start', agentType: 'worker', model: 'fake:model', role: 'loop' }, 'a1'),
    );
    await settle();
    clock.advance(1500);
    queue.push(
      ev({ type: 'agent:start', agentType: 'worker', model: 'fake:model', role: 'extract' }, 'a1'),
    );
    await settle();
    clock.advance(500);
    queue.push(
      ev(
        {
          type: 'agent:end',
          agentType: 'worker',
          status: 'ok',
          usage: { inputTokens: 900, outputTokens: 120, cacheReadTokens: 0, cacheWriteTokens: 0 },
          costUsd: 0.002,
          entryRef: 3,
        },
        'a1',
      ),
    );
    queue.push(ev({ type: 'run:end', status: 'ok', totalUsd: 0.002 }, 'root'));
    queue.end();
    await view.done;

    const text = sink.text();
    expect(text).toContain('run R1 started: demo');
    expect(text).toContain('agent worker -> fake:model (loop)');
    expect(text).toContain('(extract) [inner phase]');
    expect(text).toContain('agent worker ok in 2.0s: in 900 out 120, $0.0020 [loop > extract]');
    expect(text).toContain('run finished: ok (total $0.0020)');
    // No cursor control in pipes.
    expect(sink.chunks.join('')).not.toContain('\u001B[');
  });

  it('throttles budget lines to one per second', async () => {
    const clock = fakeClock();
    const sink = fakeSink();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'lines', clock, sink });
    for (let i = 0; i < 5; i += 1) {
      queue.push(
        ev(
          { type: 'budget:update', spentUsd: i / 100, remainingUsd: 1, committedReserveUsd: 0 },
          'root',
        ),
      );
      await settle();
      clock.advance(100);
    }
    clock.advance(1000);
    queue.push(
      ev(
        { type: 'budget:update', spentUsd: 0.09, remainingUsd: 1, committedReserveUsd: 0 },
        'root',
      ),
    );
    await settle();
    queue.end();
    await view.done;
    const budgetLines = sink
      .text()
      .split('\n')
      .filter((line) => line.startsWith('budget:'));
    expect(budgetLines.length).toBe(2);
  });
});

describe('handle sources and lifecycle', () => {
  function fakeHandle(outcome: RunOutcome<unknown>): {
    handle: RunHandle<unknown>;
    emit(event: WorkflowEvent): void;
    resolve(): void;
    unsubscribed(): number;
  } {
    const listeners = new Map<string, Array<(event: WorkflowEvent) => void>>();
    let resolveResult: (value: RunOutcome<unknown>) => void = () => undefined;
    let removed = 0;
    const handle = {
      runId: 'R1',
      result: new Promise<RunOutcome<unknown>>((resolve) => {
        resolveResult = resolve;
      }),
      events: {
        [Symbol.asyncIterator]: () => ({
          next: () => Promise.resolve({ done: true as const, value: undefined }),
        }),
      },
      on: (type: string, cb: (event: WorkflowEvent) => void) => {
        const list = listeners.get(type) ?? [];
        list.push(cb);
        listeners.set(type, list);
        return () => {
          removed += 1;
        };
      },
      resolveExternal: () => undefined,
      cancel: () => undefined,
    } as unknown as RunHandle<unknown>;
    return {
      handle,
      emit: (event) => {
        for (const cb of listeners.get(event.type) ?? []) {
          cb(event);
        }
      },
      resolve: () => {
        resolveResult(outcome);
      },
      unsubscribed: () => removed,
    };
  }

  const COST: CostReport = {
    totalUsd: 0.021,
    byModel: { 'fake:model': 0.021 },
    byPhase: {},
    byAgentType: { worker: 0.021 },
    byRole: {
      orchestrate: 0,
      plan: 0,
      loop: 0.015,
      finalize: 0.006,
      extract: 0,
      summarize: 0,
      synthesize: 0,
    },
    orchestrator: { spentUsd: 0, share: 0, wakes: 0, forcedFinish: false, reserveUsedUsd: 0 },
    unpriced: [],
  };

  it('subscribes through on(), renders the byRole summary, and unsubscribes at stop', async () => {
    const clock = fakeClock();
    const sink = fakeSink();
    const rig = fakeHandle({
      status: 'ok',
      dropped: [],
      pending: [],
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      cost: COST,
    } as unknown as RunOutcome<unknown>);
    const view = progress(rig.handle, { mode: 'tty', clock, sink, color: false });

    rig.emit(ev({ type: 'run:start', workflow: 'handled', resumed: false }, 'root'));
    rig.emit(
      ev({ type: 'agent:start', agentType: 'worker', model: 'fake:model', role: 'loop' }, 'a1'),
    );
    rig.resolve();
    await view.done;

    const frame = sink.text();
    expect(frame).toContain('loop $0.015');
    expect(frame).toContain('finalize $0.006');
    expect(frame).toContain('total $0.021');
    expect(rig.unsubscribed()).toBeGreaterThan(0);
  });

  it('off mode writes nothing and resolves immediately; stop is idempotent', async () => {
    const sink = fakeSink();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'off', sink });
    await view.done;
    view.stop();
    view.stop();
    expect(sink.chunks).toEqual([]);
    queue.end();
  });

  it('never emits a line wider than the terminal, and bounds frame height to the sink rows', async () => {
    const clock = fakeClock();
    const sink = fakeSink(40);
    sink.rows = 6;
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'tty', clock, sink, color: false, maxRows: 100 });
    queue.push(ev({ type: 'run:start', workflow: 'wide-and-tall', resumed: false }, 'root'));
    for (let i = 0; i < 20; i += 1) {
      queue.push(
        ev(
          {
            type: 'agent:start',
            agentType: 'x'.repeat(80),
            model: 'openai:some-very-long-model-id-that-overflows',
            role: 'loop',
          },
          `a${String(i)}`,
        ),
      );
    }
    await settle();
    view.render();
    const lastFrame = sink.chunks[sink.chunks.length - 1] ?? '';
    const rendered = lastFrame

      .replace(/\[[0-9;?]*[A-Za-z]/gu, '')
      .split('\n')
      .filter((l) => l !== '');
    for (const line of rendered) {
      expect(line.length).toBeLessThanOrEqual(40);
    }
    // Header + hidden marker + one running tail line, within rows - 1.
    expect(rendered.length).toBeLessThanOrEqual(5);
    expect(lastFrame).toContain('lines hidden');
    queue.end();
    await view.done;
  });

  it('scrubs control characters out of untrusted wire strings', async () => {
    const clock = fakeClock();
    const sink = fakeSink();
    const queue = queueSource();
    const esc = String.fromCharCode(27);
    const view = progress(queue.iterable, { mode: 'tty', clock, sink, color: false });
    queue.push(ev({ type: 'run:start', workflow: 'x', resumed: false }, 'root'));
    queue.push(
      ev(
        { type: 'agent:start', agentType: `evil\n${esc}[2Jinjected`, model: 'm', role: 'loop' },
        'a1',
      ),
    );
    await settle();
    view.render();
    const body = sink.chunks.join('');
    // The injected newline and raw clear-screen escape are gone; the
    // visible text survives on one line, so the repaint math is safe.
    expect(body).not.toContain('evil\n');
    expect(body).not.toContain(`${esc}[2J`);
    expect(body).toContain('evil');
    expect(body).toContain('injected');
    queue.end();
    await view.done;
  });

  it('a self-referential parentSpanId does not recurse without bound', async () => {
    const clock = fakeClock();
    const sink = fakeSink();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'tty', clock, sink, color: false });
    queue.push(ev({ type: 'run:start', workflow: 'x', resumed: false }, 'root'));
    queue.push(
      ev({ type: 'agent:start', agentType: 'loopy', model: 'm', role: 'loop' }, 'self', {
        parentSpanId: 'self',
      }),
    );
    await settle();
    view.render();
    expect(sink.text()).toContain('loopy');
    queue.end();
    await view.done;
  });

  it('off mode observes a rejecting promise source instead of orphaning it', async () => {
    const rejection = Promise.reject(new Error('boom'));
    const view = progress(rejection, { mode: 'off' });
    await view.done;
    // If the rejection were unobserved this would surface as an
    // unhandled rejection; awaiting done is enough to prove it was caught.
    await rejection.catch(() => undefined);
    expect(view.mode).toBe('off');
  });

  it('tolerates unknown event types and missing parents', async () => {
    const clock = fakeClock();
    const sink = fakeSink();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'tty', clock, sink, color: false });
    queue.push(ev({ type: 'totally:unknown', anything: 1 }, 'z9'));
    queue.push(
      ev({ type: 'agent:start', agentType: 'orphan', model: 'fake:model', role: 'loop' }, 'a7', {
        parentSpanId: 'never-seen',
      }),
    );
    await settle();
    view.render();
    expect(sink.text()).toContain('orphan');
    queue.end();
    await view.done;
  });

  it('degrades a recognized event missing a required field instead of stopping the view', async () => {
    const clock = fakeClock();
    const sink = fakeSink();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'lines', clock, sink });
    // agent:error with no .error, agent:end with no .usage: both would
    // throw on unguarded nested access and stop the raw-iterable consumer.
    queue.push(ev({ type: 'run:start', workflow: 'w', resumed: false }, 'root'));
    queue.push(ev({ type: 'agent:error', agentType: 'x', willRetry: false }, 'a1'));
    queue.push(ev({ type: 'agent:end', agentType: 'x', status: 'ok', costUsd: 0.001 }, 'a1'));
    queue.push(ev({ type: 'run:end', status: 'ok', totalUsd: 0.001 }, 'root'));
    queue.end();
    await view.done;
    const text = sink.text();
    // The view survived to the end and still printed later facts.
    expect(text).toContain('run finished: ok');
    expect(text).toContain('agent x ok');
  });
});

const ESC = String.fromCharCode(0x1b);
const CR = String.fromCharCode(0x0d);
const badByteInLine = (line: string): boolean =>
  [...line].some((c) => {
    const n = c.charCodeAt(0);
    return (n <= 0x1f && n !== 0x0a) || (n >= 0x7f && n <= 0x9f);
  });

describe('terminal safety (v1.21.0 review P2-1)', () => {
  const EVIL = `ERR${CR}\n${ESC}[2J${ESC}[31mINJECT`;

  it('lines mode neutralizes control characters in every dynamic field', async () => {
    const clock = fakeClock();
    const sink = fakeSink();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'lines', clock, sink, title: `T${EVIL}` });
    queue.push(ev({ type: 'run:start', workflow: `wf${EVIL}`, resumed: false }, 'root'));
    queue.push(ev({ type: 'phase:start', phase: `p${EVIL}` }, 'root'));
    queue.push(
      ev({ type: 'agent:start', agentType: `w${EVIL}`, model: `m${EVIL}`, role: 'loop' }, 'a1'),
    );
    queue.push(
      ev(
        {
          type: 'agent:error',
          agentType: 'w',
          error: { message: EVIL, code: 'agent', retryable: false },
          willRetry: false,
        },
        'a1',
      ),
    );
    queue.push(ev({ type: 'log', level: 'error', msg: EVIL }, 'root'));
    queue.push(ev({ type: 'external:waiting', key: EVIL, entryRef: 1 }, 'root'));
    queue.push(ev({ type: 'approval:pending', toolName: EVIL, entryRef: 1 }, 'root'));
    queue.push(ev({ type: 'run:end', status: 'ok', totalUsd: 0 }, 'root'));
    queue.end();
    await view.done;
    const raw = sink.chunks.join('');
    expect(raw).not.toContain(ESC);
    for (const line of raw.split('\n')) {
      expect(badByteInLine(line), JSON.stringify(line)).toBe(false);
    }
    // Visible text survives; each of the 8 fact-producing events yields
    // exactly one physical line (no injected newline inflation).
    expect(raw).toContain('ERR');
    expect(raw).toContain('INJECT');
    const factLines = raw.split('\n').filter((l) => l.length > 0);
    expect(factLines).toHaveLength(8);
  });

  it('tty mode scrubs the title and event fields but keeps its own SGR', async () => {
    const clock = fakeClock();
    const sink = fakeSink(200);
    const queue = queueSource();
    const view = progress(queue.iterable, {
      mode: 'tty',
      clock,
      sink,
      color: true,
      title: `T${EVIL}`,
      width: 200,
    });
    queue.push(ev({ type: 'run:start', workflow: 'wf', resumed: false }, 'root'));
    queue.push(
      ev({ type: 'agent:start', agentType: `w${EVIL}`, model: `m${EVIL}`, role: 'loop' }, 'a1'),
    );
    await settle();
    view.render();
    const raw = sink.chunks.join('');
    // Renderer color codes are present (color: true), but the injected
    // clear-screen and the raw CR/LF from the fields are gone.
    expect(raw).toContain(`${ESC}[`);
    expect(raw).not.toContain(`${ESC}[2J`);
    // After stripping the renderer's OWN CSI, no control byte remains
    // besides the structural row-separator newlines.
    // eslint-disable-next-line no-control-regex
    const rendererStripped = raw.replace(new RegExp('\\u001B\\[[0-9;?]*[A-Za-z]', 'gu'), '');
    for (const line of rendererStripped.split('\n')) {
      expect(badByteInLine(line)).toBe(false);
    }
    queue.end();
    await view.done;
  });
});

describe('geometry and timing validation (v1.21.0 review P3-2)', () => {
  it.each([0, 1, 2, 3, 4, 5, 80, Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'holds every rendered line strictly under width for width=%s',
    async (width) => {
      const clock = fakeClock();
      const sink = fakeSink();
      const queue = queueSource();
      const view = progress(queue.iterable, { mode: 'tty', clock, sink, color: false, width });
      queue.push(
        ev(
          {
            type: 'run:start',
            workflow: 'a-very-long-workflow-title-that-overflows',
            resumed: false,
          },
          'root',
        ),
      );
      queue.push(
        ev(
          {
            type: 'agent:start',
            agentType: 'worker-with-a-long-name',
            model: 'openai:gpt-5.6-terra',
            role: 'loop',
          },
          'a1',
        ),
      );
      await settle();
      view.render();
      const rendered = sink.chunks[sink.chunks.length - 1] ?? '';
      // eslint-disable-next-line no-control-regex
      const plain = rendered.replace(new RegExp('\\u001B\\[[0-9;?]*[A-Za-z]', 'gu'), '');
      const effectiveWidth = Number.isFinite(width) && width >= 1 ? Math.floor(width) : 80;
      for (const line of plain.split('\n').filter((l) => l.length > 0)) {
        expect(
          line.length,
          `width=${String(width)} line=${JSON.stringify(line)}`,
        ).toBeLessThanOrEqual(Math.max(0, effectiveWidth - 1));
      }
      queue.end();
      await view.done;
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 0, 31])(
    'never creates a non-finite repaint interval for fps=%s',
    async (fps) => {
      let scheduledMs: number | undefined;
      const clock: ProgressClock = {
        now: () => 0,
        every: (ms) => {
          scheduledMs = ms;
          return () => undefined;
        },
      };
      const sink = fakeSink();
      const queue = queueSource();
      const view = progress(queue.iterable, { mode: 'tty', clock, sink, color: false, fps });
      await settle();
      expect(scheduledMs).toBeDefined();
      expect(Number.isFinite(scheduledMs)).toBe(true);
      expect(scheduledMs).toBeGreaterThanOrEqual(Math.round(1000 / 30));
      expect(scheduledMs).toBeLessThanOrEqual(1000);
      queue.end();
      await view.done;
    },
  );

  it('a NaN maxRows still collapses an overflowing body', async () => {
    const clock = fakeClock();
    const sink = fakeSink();
    const queue = queueSource();
    const view = progress(queue.iterable, {
      mode: 'tty',
      clock,
      sink,
      color: false,
      maxRows: Number.NaN,
    });
    queue.push(ev({ type: 'run:start', workflow: 'w', resumed: false }, 'root'));
    for (let i = 0; i < 60; i += 1) {
      queue.push(
        ev(
          { type: 'agent:start', agentType: `a${String(i)}`, model: 'm', role: 'loop' },
          `s${String(i)}`,
        ),
      );
    }
    await settle();
    view.render();
    expect(sink.text()).toContain('earlier rows hidden');
    queue.end();
    await view.done;
  });

  it('a NaN or backward clock renders a zero timer, never NaN', async () => {
    let t = 1000;
    const clock: ProgressClock = { now: () => t, every: () => () => undefined };
    const sink = fakeSink();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'tty', clock, sink, color: false });
    queue.push(ev({ type: 'run:start', workflow: 'w', resumed: false }, 'root'));
    queue.push(ev({ type: 'agent:start', agentType: 'x', model: 'm', role: 'loop' }, 'a1'));
    await settle();
    t = Number.NaN;
    view.render();
    expect(sink.text()).not.toContain('NaN');
    t = 500; // backward
    view.render();
    // A negative duration would render a minus before a digit; the
    // spinner's own '-' glyph never precedes a digit.
    expect(sink.text()).not.toMatch(/-\d/u);
    queue.end();
    await view.done;
  });
});

describe('catch path sanitization and masking (v1.22.0 review P2-2)', () => {
  const ESC = String.fromCharCode(0x1b);
  const CR = String.fromCharCode(0x0d);
  const SECRET = 'sk-proj-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const evil = (): Error => new Error(`故障 ${ESC}[2J${CR}\nFORGED-LINE ${SECRET}`);
  const assertClean = (raw: string): void => {
    expect(raw).not.toContain(`${ESC}[2J`);
    expect(raw).not.toContain(CR);
    expect(raw).not.toContain(SECRET);
    expect(raw).toContain('[masked-secret]');
    // Readability: the visible part of the message survives.
    expect(raw).toContain('故障');
  };

  it('a rejected Promise<RunHandle> source cannot inject into the tty sink', async () => {
    const sink = fakeSink();
    const clock = fakeClock();
    const view = progress(Promise.reject(evil()), { mode: 'tty', sink, clock });
    await view.done;
    assertClean(sink.chunks.join(''));
  });

  it('a RunHandle whose result rejects cannot inject into the tty sink', async () => {
    const sink = fakeSink();
    const clock = fakeClock();
    const handle = {
      on: () => () => undefined,
      result: Promise.reject(evil()),
    } as unknown as RunHandle<unknown>;
    const view = progress(handle, { mode: 'tty', sink, clock });
    await view.done;
    assertClean(sink.chunks.join(''));
  });

  it('a throwing async iterable cannot inject, in tty and in lines mode', async () => {
    for (const mode of ['tty', 'lines'] as const) {
      const sink = fakeSink();
      const clock = fakeClock();
      const source = (async function* stream(): AsyncGenerator<WorkflowEvent> {
        yield ev({ type: 'run:start', workflow: 'wf', resumed: false });
        await Promise.resolve();
        throw evil();
      })();
      const view = progress(source, { mode, sink, clock });
      await view.done;
      assertClean(sink.chunks.join(''));
    }
  });
});

describe('malformed external events (v1.22.0 review P2-3)', () => {
  // Mirror of the reducer's consumed set: every recognized type is fed
  // as a bare envelope with every presentation field missing.
  const consumed = [
    'run:start',
    'run:end',
    'phase:start',
    'budget:update',
    'log',
    'external:waiting',
    'approval:pending',
    'child:start',
    'child:end',
    'agent:queued',
    'agent:start',
    'agent:stream',
    'agent:error',
    'agent:schema-retry',
    'agent:end',
    'tool:start',
    'tool:end',
    'orchestrator:woke',
    'spawn:admitted',
    'spawn:rejected',
  ];

  it('a bare envelope of every consumed type degrades its row, never the view', async () => {
    const sink = fakeSink();
    const clock = fakeClock();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'lines', sink, clock });
    for (const type of consumed) {
      queue.push({ runId: 'R1', seq: 0, ts: 't', spanId: 'sX', type } as unknown as WorkflowEvent);
    }
    queue.push(
      ev({ type: 'agent:start', agentType: 'VISIBLE-AGENT', model: 'm', role: 'loop' }, 'sV'),
    );
    queue.push(ev({ type: 'run:end', status: 'ok', totalUsd: 0 }, 's1'));
    await settle();
    queue.end();
    await view.done;
    const text = sink.chunks.join('');
    expect(text).toContain('VISIBLE-AGENT');
    expect(text).toContain('run finished: ok');
  });

  it('wrong-typed fields (including a stream delta on a live node) are tolerated', async () => {
    const sink = fakeSink();
    const clock = fakeClock();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'lines', sink, clock });
    queue.push(ev({ type: 'agent:start', agentType: 'first', model: 'm', role: 'loop' }, 'sA'));
    const hostile = {
      toString(): string {
        throw new Error('never coerce me');
      },
    };
    queue.push(ev({ type: 'agent:stream', delta: 42 }, 'sA'));
    queue.push(ev({ type: 'phase:start', phase: hostile }, 'sP'));
    queue.push(ev({ type: 'budget:update', spentUsd: 'x', remainingUsd: hostile }, 's1'));
    queue.push(ev({ type: 'log', level: 'error', msg: hostile }, 's1'));
    queue.push(ev({ type: 'agent:end', status: 7, usage: 'no', costUsd: 'free' }, 'sA'));
    queue.push(
      ev({ type: 'agent:start', agentType: 'VISIBLE-AGENT', model: 'm', role: 'loop' }, 'sV'),
    );
    queue.push(ev({ type: 'run:end', status: 'ok', totalUsd: 'later' }, 's1'));
    await settle();
    queue.end();
    await view.done;
    const text = sink.chunks.join('');
    expect(text).toContain('VISIBLE-AGENT');
    expect(text).toContain('run finished: ok');
  });

  it('tty mode paints frames after malformed events without throwing', async () => {
    const sink = fakeSink();
    const clock = fakeClock();
    const queue = queueSource();
    const view = progress(queue.iterable, { mode: 'tty', sink, clock });
    queue.push({
      runId: 'R1',
      seq: 0,
      ts: 't',
      spanId: 's1',
      type: 'run:start',
    } as unknown as WorkflowEvent);
    queue.push(
      ev({ type: 'agent:start', agentType: 'VISIBLE-AGENT', model: 'm', role: 'loop' }, 'sV'),
    );
    await settle();
    clock.fire();
    queue.push(ev({ type: 'run:end', status: 'ok', totalUsd: 0 }, 's1'));
    await settle();
    queue.end();
    await view.done;
    expect(sink.text()).toContain('VISIBLE-AGENT');
  });
});
