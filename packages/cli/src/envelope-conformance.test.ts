/**
 * The terminal envelope conformance table (RV1106, part B of the P1-5
 * arc): every terminal path (ok, error, exhausted, cancelled,
 * superseded) drives the REAL engine, and the envelope is compared
 * fact for fact across every surface that carries it: the resolved
 * outcome, the run:end event, the HTTP run status body, the SSE event
 * replay, and the OTel run span. One truth table holds the expected
 * facts; every surface reading is checked against the SAME row, so a
 * divergence between any two surfaces is a red test. The table is the
 * anchor future terminal fields extend.
 *
 * Surface honesty rules the table also pins:
 * - handle.result REJECTS typed on an unsettled terminal (RV907), so
 *   the outcome surface of the superseded row is the SupersededError,
 *   never an envelope.
 * - GET /runs/:id serves the typed wire error for a rejected segment,
 *   with no envelope: the settled-false envelope exists only on the
 *   event stream.
 * - toOtel completes its export over every terminal path, including
 *   the ones whose handle.result rejects after the stream already
 *   carried the refusal; a leftover span refuses green.
 */
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  defineWorkflow,
  InMemoryStore,
  LeaseHeldError,
  RUN_SETTLE_DECISION_TYPE,
  SupersededError,
  type ChatEvent,
  type ChatRequest,
  type JournalEntry,
  type ModelCaps,
  type ProviderAdapter,
  type RunMeta,
  type RunOutcome,
  type TerminalEnvelope,
  type Usage,
  type WireError,
  type Workflow,
  type WorkflowEvent,
  type WorkflowRegistry,
} from '@rulvar/core';

import { toOtel, type SpanLike, type TracerLike } from './otel.js';
import { createServer, type RulvarServer } from './server.js';

/** OTel status codes as otel.ts inlines them (UNSET 0, OK 1, ERROR 2). */
const STATUS_OK = 1;
const STATUS_ERROR = 2;

const PRICING = {
  pricingVersion: 'conformance-v1',
  models: { 'fake:m1': { inputUsdPerMTok: 10, outputUsdPerMTok: 50 } },
};

/** 100k in at 10/MTok + 10k out at 50/MTok = 1.5 USD per call, exactly. */
const CALL_USAGE: Usage = {
  inputTokens: 100_000,
  outputTokens: 10_000,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

const ZERO_USAGE: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

interface ConformanceTurn {
  text?: string;
  usage?: Usage;
  error?: WireError;
  hangMs?: number;
}

/**
 * A minimal deterministic ProviderAdapter: each call streams its
 * scripted turn with EXACT usage, so every row of the table prices to
 * the same dollars on every drive. The engine pricing table (not the
 * adapter caps) prices the calls, the precedence the terminal-envelope
 * suite already proved.
 */
function conformanceAdapter(script: (call: number) => ConformanceTurn): ProviderAdapter {
  let calls = 0;
  const caps: ModelCaps = {
    structuredOutput: 'native',
    supportsTemperature: false,
    supportsParallelTools: true,
    reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    pricing: { inputUsdPerMTok: 1, outputUsdPerMTok: 1 },
  };
  return {
    id: 'fake',
    caps: () => caps,
    async *stream(_req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
      const turn = script(calls);
      calls += 1;
      if (turn.hangMs !== undefined) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, turn.hangMs);
          signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve();
          });
        });
        if (signal?.aborted === true) {
          return;
        }
      }
      if (turn.error !== undefined) {
        yield { type: 'error', error: turn.error };
        return;
      }
      yield { type: 'text-delta', text: turn.text ?? 'done' };
      yield {
        type: 'finish',
        finish: { reason: 'stop' },
        usage: turn.usage ?? ZERO_USAGE,
      };
    },
  };
}

const isSettleEntry = (entry: JournalEntry): boolean =>
  (entry.value as { decisionType?: string } | undefined)?.decisionType === RUN_SETTLE_DECISION_TYPE;

/** Rejects BOTH settlement writes with the fencing rejection (RV1009). */
class SupersededSegmentStore extends InMemoryStore {
  override append(runId: string, entry: JournalEntry): Promise<void> {
    if (isSettleEntry(entry)) {
      return Promise.reject(new LeaseHeldError('stale fencing epoch: not the current holder'));
    }
    return super.append(runId, entry);
  }

  override putMeta(meta: RunMeta): Promise<void> {
    if (meta.status !== 'running' && meta.status !== 'suspended') {
      return Promise.reject(new LeaseHeldError('stale fencing epoch: not the current holder'));
    }
    return super.putMeta(meta);
  }
}

interface RecordedSpan {
  name: string;
  attributes: Record<string, string | number | boolean>;
  status?: { code: number; message?: string };
  ended: boolean;
}

function inMemoryTracer(): { tracer: TracerLike; spans: RecordedSpan[] } {
  const spans: RecordedSpan[] = [];
  const tracer: TracerLike = {
    startSpan(name, options) {
      const record: RecordedSpan = {
        name,
        attributes: { ...options?.attributes },
        ended: false,
      };
      spans.push(record);
      const span: SpanLike = {
        setAttribute: (key, value) => {
          record.attributes[key] = value;
        },
        addEvent: () => undefined,
        setStatus: (status) => {
          record.status = status;
        },
        end: () => {
          record.ended = true;
        },
      };
      return span;
    },
  };
  return { tracer, spans };
}

/** One row of the truth table: the fixture and the expected facts. */
interface ConformanceRow {
  path: 'ok' | 'error' | 'exhausted' | 'cancelled' | 'superseded';
  wfName: string;
  store: () => InMemoryStore;
  adapter: () => ProviderAdapter;
  workflow: () => Workflow<undefined, unknown>;
  options?: { budgetUsd?: number };
  /** The HTTP drive cancels through the run deadline (no cancel route). */
  httpDeadlineMs?: number;
  expected: {
    status: TerminalEnvelope['status'];
    settled: boolean;
    settledReason?: 'superseded';
    /** The typed error's stable facts (messages embed reasons and ids). */
    error?: { code: string; retryable: boolean };
    completion?: 'complete' | 'partial' | 'rejected';
    totalUsd: number;
    costByModel: Record<string, number>;
    usage: Usage;
    /** True where a call died without a usage report: a lower bound. */
    usageApprox: boolean;
    agentsSpawned: number;
    /** The outcome surface's honesty rule (RV907). */
    outcome: 'resolves' | 'rejects-superseded';
    /** The HTTP surface's honesty rule for rejected segments. */
    http: 'envelope' | 'typed-error';
  };
}

const ROWS: ConformanceRow[] = [
  {
    path: 'ok',
    wfName: 'conformance-ok',
    store: () => new InMemoryStore(),
    adapter: () => conformanceAdapter(() => ({ text: 'done', usage: CALL_USAGE })),
    workflow: () =>
      defineWorkflow({ name: 'conformance-ok' }, async (ctx) => {
        await ctx.agent('first');
        await ctx.agent('second');
        return { result: 'done', completion: 'complete' as const };
      }) as unknown as Workflow<undefined, unknown>,
    expected: {
      status: 'ok',
      settled: true,
      completion: 'complete',
      totalUsd: 3,
      costByModel: { 'fake:m1': 3 },
      usage: {
        inputTokens: 200_000,
        outputTokens: 20_000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
      usageApprox: false,
      agentsSpawned: 2,
      outcome: 'resolves',
      http: 'envelope',
    },
  },
  {
    path: 'error',
    wfName: 'conformance-error',
    store: () => new InMemoryStore(),
    adapter: () =>
      conformanceAdapter(() => ({
        error: {
          code: 'agent',
          message: 'scripted terminal failure',
          retryable: false,
          data: { kind: 'terminal' },
        },
      })),
    workflow: () =>
      defineWorkflow({ name: 'conformance-error' }, async (ctx) => {
        await ctx.agent('go');
        return 'unreachable';
      }) as unknown as Workflow<undefined, unknown>,
    expected: {
      status: 'error',
      settled: true,
      error: { code: 'agent', retryable: false },
      totalUsd: 0,
      // The settled fold keys every model the journal saw, zero included.
      costByModel: { 'fake:m1': 0 },
      usage: ZERO_USAGE,
      usageApprox: true,
      agentsSpawned: 1,
      outcome: 'resolves',
      http: 'envelope',
    },
  },
  {
    path: 'exhausted',
    wfName: 'conformance-exhausted',
    store: () => new InMemoryStore(),
    adapter: () =>
      conformanceAdapter(() => ({
        text: 'expensive',
        usage: {
          inputTokens: 500_000,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        },
      })),
    workflow: () =>
      defineWorkflow({ name: 'conformance-exhausted' }, async (ctx) => {
        await ctx.agent('big', { estCost: 0 });
        return 'done';
      }) as unknown as Workflow<undefined, unknown>,
    options: { budgetUsd: 4 },
    expected: {
      // The call itself lands, the ceiling crossing is found at settle:
      // the exhausted terminal keeps the value and carries no error.
      status: 'exhausted',
      settled: true,
      totalUsd: 5,
      costByModel: { 'fake:m1': 5 },
      usage: {
        inputTokens: 500_000,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
      usageApprox: false,
      agentsSpawned: 1,
      outcome: 'resolves',
      http: 'envelope',
    },
  },
  {
    path: 'cancelled',
    wfName: 'conformance-cancelled',
    store: () => new InMemoryStore(),
    adapter: () => conformanceAdapter(() => ({ text: 'never', hangMs: 30_000 })),
    workflow: () =>
      defineWorkflow({ name: 'conformance-cancelled' }, async (ctx) => {
        await ctx.agent('hang');
        return 'done';
      }) as unknown as Workflow<undefined, unknown>,
    httpDeadlineMs: 400,
    expected: {
      status: 'cancelled',
      settled: true,
      error: { code: 'error', retryable: false },
      totalUsd: 0,
      costByModel: { 'fake:m1': 0 },
      usage: ZERO_USAGE,
      usageApprox: true,
      agentsSpawned: 1,
      outcome: 'resolves',
      http: 'envelope',
    },
  },
  {
    path: 'superseded',
    wfName: 'conformance-superseded',
    store: () => new SupersededSegmentStore(),
    adapter: () => conformanceAdapter(() => ({ text: 'done', usage: CALL_USAGE })),
    workflow: () =>
      defineWorkflow({ name: 'conformance-superseded' }, async (ctx) => {
        await ctx.agent('go');
        return 'done';
      }) as unknown as Workflow<undefined, unknown>,
    expected: {
      status: 'ok',
      settled: false,
      settledReason: 'superseded',
      totalUsd: 1.5,
      costByModel: { 'fake:m1': 1.5 },
      usage: CALL_USAGE,
      usageApprox: false,
      agentsSpawned: 1,
      outcome: 'rejects-superseded',
      http: 'typed-error',
    },
  },
];

async function* replay(events: readonly WorkflowEvent[]): AsyncIterable<WorkflowEvent> {
  for (const event of events) {
    yield await Promise.resolve(event);
  }
}

interface SdkDrive {
  runId: string;
  envelope: TerminalEnvelope;
  /** The raw run:end event, for the sibling byte contract. */
  event: Record<string, unknown>;
  settled: { ok: true; outcome: RunOutcome<unknown> } | { ok: false; error: unknown };
  spans: RecordedSpan[];
}

/** Drives the row on the SDK surface: outcome, run:end, and OTel. */
async function driveSdk(row: ConformanceRow): Promise<SdkDrive> {
  const engine = createEngine({
    adapters: [row.adapter()],
    defaults: { routing: { loop: 'fake:m1' } },
    stores: { journal: row.store() },
    pricing: PRICING,
  });
  const handle = engine.run(row.workflow(), undefined, { ...(row.options ?? {}) });
  const events: WorkflowEvent[] = [];
  const collecting = (async () => {
    for await (const event of handle.events) {
      events.push(event);
    }
  })();
  if (row.path === 'cancelled') {
    // Cancel only after the agent was admitted, so agentsSpawned is
    // deterministically 1 on both drives.
    for (
      let attempt = 0;
      attempt < 500 && !events.some((event) => event.type === 'agent:start');
      attempt += 1
    ) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await handle.cancel('conformance cancel');
  }
  const settled = await handle.result.then(
    (outcome) => ({ ok: true as const, outcome }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  await collecting;
  const runEnd = events.find((event) => event.type === 'run:end');
  expect(runEnd).toBeDefined();
  const { tracer, spans } = inMemoryTracer();
  // The OTel surface consumes the SAME stream and the SAME result the
  // SDK consumer holds; rows whose result rejects must still export.
  await toOtel({ runId: handle.runId, events: replay(events), result: handle.result }, tracer);
  return {
    runId: handle.runId,
    envelope: (runEnd as unknown as { envelope: TerminalEnvelope }).envelope,
    event: runEnd as unknown as Record<string, unknown>,
    settled,
    spans,
  };
}

function get(server: RulvarServer, path: string): Promise<Response> {
  return server.fetch(new Request(`http://rulvar.local${path}`));
}

function post(server: RulvarServer, path: string, body: unknown): Promise<Response> {
  return server.fetch(
    new Request(`http://rulvar.local${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

/** Polls GET /runs/:id until the status matches (the run settles async). */
async function untilStatus(
  server: RulvarServer,
  runId: string,
  status: string,
): Promise<Record<string, unknown>> {
  // An attempt counter, not Date.now(): the dev-mode bare-clock guard
  // stays away from ambient clocks while a run is live.
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const body = await bodyOf(await get(server, `/runs/${runId}`));
    if (body.status === status) {
      return body;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`run ${runId} never reached '${status}'`);
}

interface SseFrame {
  event?: string;
  data?: Record<string, unknown>;
}

/** Parses COMPLETE frames only (the trailing partial chunk is dropped). */
function parseFrames(text: string): SseFrame[] {
  const pieces = text.split('\n\n');
  pieces.pop();
  const frames: SseFrame[] = [];
  for (const piece of pieces) {
    if (piece.length === 0 || piece.startsWith(':')) {
      continue;
    }
    const frame: SseFrame = {};
    for (const line of piece.split('\n')) {
      if (line.startsWith('event: ')) {
        frame.event = line.slice(7);
      } else if (line.startsWith('data: ')) {
        frame.data = JSON.parse(line.slice(6)) as Record<string, unknown>;
      }
    }
    frames.push(frame);
  }
  return frames;
}

interface HttpDrive {
  runId: string;
  body: Record<string, unknown>;
  sseData: Record<string, unknown> | undefined;
  sseEnvelope: TerminalEnvelope | undefined;
}

/** Drives the row over HTTP: the run status body and the SSE replay. */
async function driveHttp(row: ConformanceRow): Promise<HttpDrive> {
  const engine = createEngine({
    adapters: [row.adapter()],
    defaults: { routing: { loop: 'fake:m1' } },
    stores: { journal: row.store() },
    pricing: PRICING,
  });
  const workflows: WorkflowRegistry = {
    [row.wfName]: row.workflow() as unknown as Workflow<never, unknown>,
  };
  const server = createServer({ engine, workflows });
  // Computed BEFORE any run is live in this drive: the run deadline is
  // the only cancellation the HTTP surface offers.
  const deadlineAt =
    row.httpDeadlineMs === undefined
      ? undefined
      : new Date(Date.now() + row.httpDeadlineMs).toISOString();
  const started = await post(server, '/runs', {
    workflow: row.wfName,
    options: {
      ...(row.options ?? {}),
      ...(deadlineAt === undefined ? {} : { deadlineAt }),
    },
  });
  expect(started.status).toBe(201);
  const runId = (await bodyOf(started)).runId as string;
  const terminalStatus = row.expected.http === 'typed-error' ? 'error' : row.expected.status;
  const body = await untilStatus(server, runId, terminalStatus);
  // The SSE replay of a done run delivers the buffer and closes, so
  // the whole stream reads as one text body.
  const sse = await get(server, `/runs/${runId}/events`);
  const frames = parseFrames(await sse.text());
  const runEndFrame = frames.find((frame) => frame.data?.type === 'run:end');
  return {
    runId,
    body,
    sseData: runEndFrame?.data,
    sseEnvelope: runEndFrame?.data?.envelope as TerminalEnvelope | undefined,
  };
}

/** The row's truth-table facts, checked identically against every surface. */
function checkFacts(envelope: TerminalEnvelope, row: ConformanceRow, runId: string): void {
  const { expected } = row;
  expect(envelope.runId).toBe(runId);
  expect(envelope.workflow).toBe(row.wfName);
  expect(envelope.status).toBe(expected.status);
  expect(envelope.settled).toBe(expected.settled);
  if (expected.settledReason === undefined) {
    expect('settledReason' in envelope).toBe(false);
  } else {
    expect(envelope.settledReason).toBe(expected.settledReason);
  }
  if (expected.error === undefined) {
    expect('error' in envelope).toBe(false);
  } else {
    expect(envelope.error).toMatchObject(expected.error);
  }
  if (expected.completion === undefined) {
    expect('completion' in envelope).toBe(false);
  } else {
    expect(envelope.completion).toBe(expected.completion);
  }
  expect(envelope.totalUsd).toBe(expected.totalUsd);
  expect(envelope.grossUsd).toBe(expected.totalUsd);
  expect(envelope.costByModel).toEqual(expected.costByModel);
  expect(envelope.usage).toEqual(expected.usage);
  expect(envelope.usageApprox).toBe(expected.usageApprox);
  expect(envelope.agentsSpawned).toBe(expected.agentsSpawned);
}

/**
 * The sibling byte contract: run:end's own fields agree with the
 * envelope, including absent-means-settled and absent-means-exact.
 */
function checkSiblings(event: Record<string, unknown>, envelope: TerminalEnvelope): void {
  expect(event.status).toBe(envelope.status);
  expect(event.totalUsd).toBe(envelope.totalUsd);
  if (envelope.settled) {
    expect('settled' in event).toBe(false);
    expect('settledReason' in event).toBe(false);
  } else {
    expect(event.settled).toBe(false);
    if (envelope.settledReason === undefined) {
      expect('settledReason' in event).toBe(false);
    } else {
      expect(event.settledReason).toBe(envelope.settledReason);
    }
  }
  if (envelope.completion === undefined) {
    expect('completion' in event).toBe(false);
  } else {
    expect(event.completion).toBe(envelope.completion);
  }
  if (envelope.usageApprox) {
    expect(event.usageApprox).toBe(true);
  } else {
    expect('usageApprox' in event).toBe(false);
  }
}

/** The OTel surface: the run span carries the same facts. */
function checkOtel(spans: RecordedSpan[], envelope: TerminalEnvelope, row: ConformanceRow): void {
  const runSpan = spans.find((span) => span.name.startsWith('run '));
  expect(runSpan).toBeDefined();
  expect(runSpan?.name).toBe(`run ${row.wfName}`);
  expect(runSpan?.attributes['rulvar.run_id']).toBe(envelope.runId);
  expect(runSpan?.attributes['rulvar.status']).toBe(envelope.status);
  expect(runSpan?.attributes['rulvar.run.total_usd']).toBe(envelope.totalUsd);
  expect(runSpan?.attributes['rulvar.run.agents_spawned']).toBe(envelope.agentsSpawned);
  if (envelope.completion === undefined) {
    expect('rulvar.run.completion' in (runSpan?.attributes ?? {})).toBe(false);
  } else {
    expect(runSpan?.attributes['rulvar.run.completion']).toBe(envelope.completion);
  }
  if (envelope.settled) {
    expect('rulvar.run.settled' in (runSpan?.attributes ?? {})).toBe(false);
    expect('rulvar.run.settled_reason' in (runSpan?.attributes ?? {})).toBe(false);
    expect(runSpan?.status?.code).toBe(envelope.status === 'ok' ? STATUS_OK : STATUS_ERROR);
  } else {
    expect(runSpan?.attributes['rulvar.run.settled']).toBe(false);
    expect(runSpan?.status?.code).toBe(STATUS_ERROR);
    if (envelope.settledReason === 'superseded') {
      expect(runSpan?.attributes['rulvar.run.settled_reason']).toBe('superseded');
      expect(runSpan?.status?.message).toContain('superseded');
    }
  }
  expect(runSpan?.ended).toBe(true);
}

/** Cross-drive facts: everything but the run identity and the error text. */
function normalized(envelope: TerminalEnvelope): Record<string, unknown> {
  return {
    workflow: envelope.workflow,
    status: envelope.status,
    settled: envelope.settled,
    settledReason: envelope.settledReason,
    errorCode: envelope.error?.code,
    completion: envelope.completion,
    totalUsd: envelope.totalUsd,
    grossUsd: envelope.grossUsd,
    costByModel: envelope.costByModel,
    usage: envelope.usage,
    usageApprox: envelope.usageApprox,
    agentsSpawned: envelope.agentsSpawned,
  };
}

describe('the terminal envelope conformance table (RV1106)', () => {
  for (const row of ROWS) {
    it(`${row.path}: every surface reads the same terminal facts`, async () => {
      // The SDK drive: outcome, run:end, OTel.
      const sdk = await driveSdk(row);
      checkFacts(sdk.envelope, row, sdk.runId);
      checkSiblings(sdk.event, sdk.envelope);
      if (row.expected.outcome === 'resolves') {
        expect(sdk.settled.ok).toBe(true);
        if (sdk.settled.ok) {
          expect(sdk.settled.outcome.envelope).toEqual(sdk.envelope);
          checkFacts(sdk.settled.outcome.envelope, row, sdk.runId);
        }
      } else {
        expect(sdk.settled.ok).toBe(false);
        if (!sdk.settled.ok) {
          expect(sdk.settled.error).toBeInstanceOf(SupersededError);
        }
      }
      checkOtel(sdk.spans, sdk.envelope, row);

      // The HTTP drive: the run status body and the SSE replay.
      const http = await driveHttp(row);
      expect(http.sseEnvelope).toBeDefined();
      if (http.sseEnvelope !== undefined) {
        checkFacts(http.sseEnvelope, row, http.runId);
        if (http.sseData !== undefined) {
          checkSiblings(http.sseData, http.sseEnvelope);
        }
        // The two drives share every fact but the run identity and
        // the error text (a cancel reason names its trigger).
        expect(normalized(http.sseEnvelope)).toEqual(normalized(sdk.envelope));
      }
      if (row.expected.http === 'envelope') {
        expect(http.body.status).toBe(row.expected.status);
        const httpEnvelope = http.body.envelope as TerminalEnvelope;
        checkFacts(httpEnvelope, row, http.runId);
        // Same run, two transports: the status body and the event
        // replay carry byte-identical envelope facts.
        expect(httpEnvelope).toEqual(http.sseEnvelope);
      } else {
        // A rejected segment: the typed wire error, no envelope.
        expect(http.body.status).toBe('error');
        expect('envelope' in http.body).toBe(false);
        expect((http.body.error as WireError).code).toBe('superseded');
      }
    }, 30_000);
  }

  it('the table covers every terminal path of the doctrine', () => {
    expect(ROWS.map((row) => row.path).sort()).toEqual([
      'cancelled',
      'error',
      'exhausted',
      'ok',
      'superseded',
    ]);
  });
});

describe('toOtel over an unsettled terminal (RV1106)', () => {
  it('completes the export when handle.result rejects, a leftover span refuses green', async () => {
    const events: WorkflowEvent[] = [
      {
        runId: 'ru',
        seq: 0,
        ts: new Date(1_700_000_000_000).toISOString(),
        spanId: 's0',
        type: 'run:start',
        workflow: 'wf',
        resumed: false,
      },
    ];
    const { tracer, spans } = inMemoryTracer();
    // The stream was truncated before run:end AND the result rejects
    // (a settlement outage): the export still completes, and the
    // leftover run span refuses green, because nothing durable records
    // its terminal.
    const rejecting = Promise.reject(new Error('injected outage: run_settle append failed'));
    rejecting.catch(() => undefined);
    const created = await toOtel(
      { runId: 'ru', events: replay(events), result: rejecting },
      tracer,
    );
    expect(created).toBe(1);
    expect(spans[0]?.ended).toBe(true);
    expect(spans[0]?.status?.code).toBe(STATUS_ERROR);
  });
});
