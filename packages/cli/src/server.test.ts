/**
 * createServer e2e (M8-T01 acceptance; FR-702):
 * the HITL round-trip over HTTP (suspend, resolve via the endpoint,
 * resume), SSE streaming with Last-Event-ID resume from the event seq,
 * the offline resolution path for runs not live in this process, and
 * the route error surface. Everything runs on FakeAdapter over a
 * SqliteStore: zero live calls, and the offline path exercises the real
 * lease brackets.
 */
import { describe, expect, it } from 'vitest';

import {
  ConfigError,
  createEngine,
  defineWorkflow,
  EVENT_SEGMENT_STRIDE,
  normalizeEntry,
  tool,
  type Engine,
  type Workflow,
  type WorkflowRegistry,
} from '@rulvar/core';
import { SqliteStore } from '@rulvar/store-sqlite';
import { FAKE_MODEL_REF, FakeAdapter, fakeToolCalls } from '@rulvar/testing';

import { createServer, type RulvarServer } from './server.js';

interface GatedValue {
  analysis: unknown;
  approved: boolean;
  item: number;
}

function assemble(options?: {
  retention?: (meta: { status: string }) => boolean;
  memoryRetention?: (meta: { status: string }) => boolean;
  maxTrackedRuns?: number;
  maxBufferedEventsPerRun?: number;
  maxPendingEventsPerClient?: number;
}): {
  engine: Engine;
  server: RulvarServer;
  workflows: WorkflowRegistry;
  gated: Workflow<never, unknown>;
} {
  const gated = defineWorkflow({ name: 'gated' }, async (ctx, args: { item: number }) => {
    const analysis = await ctx.agent(`analyze ${String(args.item)}`);
    const approval = await ctx.awaitExternal<{ approved: boolean }>('editor-approval', {
      prompt: 'ship it?',
      schema: {
        type: 'object',
        properties: { approved: { type: 'boolean' } },
        required: ['approved'],
      },
    });
    return { analysis, approved: approval.approved, item: args.item };
  }) as unknown as Workflow<never, unknown>;
  const engine = createEngine({
    adapters: [new FakeAdapter({ agents: { '*': 'server analysis' } })],
    stores: { journal: new SqliteStore({ path: ':memory:' }) },
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  });
  const burst = defineWorkflow({ name: 'burst' }, async (ctx, args: { events: number }) => {
    for (let i = 0; i < args.events; i += 1) {
      ctx.log('info', `burst event ${i}`);
    }
    return ctx.agent('summarize the burst');
  }) as unknown as Workflow<never, unknown>;
  // Suspends first, then emits the tail SYNCHRONOUSLY on resume: the
  // continuation settles faster than any pump could drain, which is
  // exactly the terminal race shape (v1.26.0 deep E2E review P1-1).
  const tail = defineWorkflow({ name: 'tail' }, async (ctx, args: { events: number }) => {
    await ctx.awaitExternal('gate');
    for (let i = 0; i < args.events; i += 1) {
      ctx.log('info', `tail event ${i}`);
    }
    return 'tail done';
  }) as unknown as Workflow<never, unknown>;
  // Yields the event loop periodically so the pump feeds connected
  // clients WHILE the run is alive (the slow-consumer shape, P1-2).
  const yieldy = defineWorkflow({ name: 'yieldy' }, async (ctx, args: { events: number }) => {
    for (let i = 0; i < args.events; i += 1) {
      ctx.log('info', `yieldy event ${i}`);
      if (i % 50 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }
    return 'yieldy done';
  }) as unknown as Workflow<never, unknown>;
  // Two gates: the feed must survive BOTH suspended settles.
  const twoGates = defineWorkflow({ name: 'twoGates' }, async (ctx, args: { events: number }) => {
    await ctx.awaitExternal('gate-one');
    for (let i = 0; i < args.events; i += 1) {
      ctx.log('info', `mid event ${i}`);
    }
    await ctx.awaitExternal('gate-two');
    for (let i = 0; i < args.events; i += 1) {
      ctx.log('info', `late event ${i}`);
    }
    return 'two gates done';
  }) as unknown as Workflow<never, unknown>;
  const workflows: WorkflowRegistry = { gated, burst, tail, yieldy, twoGates };
  const server = createServer({
    engine,
    workflows,
    ...(options?.retention === undefined ? {} : { retention: options.retention }),
    ...(options?.memoryRetention === undefined ? {} : { memoryRetention: options.memoryRetention }),
    ...(options?.maxTrackedRuns === undefined ? {} : { maxTrackedRuns: options.maxTrackedRuns }),
    ...(options?.maxBufferedEventsPerRun === undefined
      ? {}
      : { maxBufferedEventsPerRun: options.maxBufferedEventsPerRun }),
    ...(options?.maxPendingEventsPerClient === undefined
      ? {}
      : { maxPendingEventsPerClient: options.maxPendingEventsPerClient }),
  });
  return { engine, server, workflows, gated };
}

function get(
  server: RulvarServer,
  path: string,
  headers?: Record<string, string>,
): Promise<Response> {
  return server.fetch(new Request(`http://rulvar.local${path}`, { headers }));
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
  // stays installed while a suspended body is parked.
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
  id?: string;
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
      if (line.startsWith('id: ')) {
        frame.id = line.slice(4);
      } else if (line.startsWith('event: ')) {
        frame.event = line.slice(7);
      } else if (line.startsWith('data: ')) {
        frame.data = JSON.parse(line.slice(6)) as Record<string, unknown>;
      }
    }
    frames.push(frame);
  }
  return frames;
}

/** Reads a LIVE stream until a frame satisfies the predicate, then cancels. */
async function readUntil(
  response: Response,
  predicate: (frame: SseFrame) => boolean,
): Promise<SseFrame[]> {
  const reader = (response.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (let reads = 0; reads < 1000; reads += 1) {
    const { value, done } = await reader.read();
    if (value !== undefined) {
      text += decoder.decode(value, { stream: true });
    }
    const frames = parseFrames(text);
    if (frames.some(predicate)) {
      await reader.cancel();
      return frames;
    }
    if (done) {
      break;
    }
  }
  throw new Error(`stream ended before the expected frame; got:\n${text}`);
}

describe('createServer (M8-T01)', () => {
  it('HITL round-trip over HTTP: suspend, resolve via the endpoint, resume, outcome, cost', async () => {
    const { server } = assemble();

    const started = await post(server, '/runs', {
      workflow: 'gated',
      args: { item: 42 },
      options: { budgetUsd: 5, name: 'hitl' },
    });
    expect(started.status).toBe(201);
    const { runId } = (await bodyOf(started)) as { runId: string };
    expect(started.headers.get('location')).toBe(`/runs/${runId}`);

    const suspended = await untilStatus(server, runId, 'suspended');
    expect(suspended.pending).toEqual([
      expect.objectContaining({ key: 'editor-approval', prompt: 'ship it?' }),
    ]);

    // A schema-invalid resolution fails the request and journals nothing.
    const invalid = await post(server, `/runs/${runId}/external/editor-approval`, { nope: 1 });
    expect(invalid.status).toBe(400);

    // An unknown key 404s and names the open suspensions.
    const unknownKey = await post(server, `/runs/${runId}/external/wrong-key`, { approved: true });
    expect(unknownKey.status).toBe(404);
    const unknownBody = await bodyOf(unknownKey);
    expect(JSON.stringify(unknownBody)).toContain('editor-approval');

    const resolved = await post(server, `/runs/${runId}/external/editor-approval`, {
      approved: true,
    });
    expect(resolved.status).toBe(200);
    expect(await bodyOf(resolved)).toMatchObject({ applied: true, resumed: true });

    const settled = await untilStatus(server, runId, 'ok');
    expect(settled.value).toEqual({ analysis: 'server analysis', approved: true, item: 42 });
    expect(settled.live).toBe(true);

    const cost = await get(server, `/runs/${runId}/cost`);
    expect(cost.status).toBe(200);
    const report = await bodyOf(cost);
    expect(report).toHaveProperty('totalUsd');
    expect(report).toHaveProperty('byModel');

    // Resolving a settled run is a 409, not a crash.
    const late = await post(server, `/runs/${runId}/external/editor-approval`, { approved: true });
    expect(late.status).toBe(409);
  });

  it('SSE streams live events and Last-Event-ID resumes strictly after the cursor', async () => {
    const { server } = assemble();
    const started = await post(server, '/runs', { workflow: 'gated', args: { item: 7 } });
    const { runId } = (await bodyOf(started)) as { runId: string };

    // Live stream: read until the suspension is announced.
    const live = await get(server, `/runs/${runId}/events`);
    expect(live.headers.get('content-type')).toBe('text/event-stream');
    const seen = await readUntil(live, (frame) => frame.event === 'external:waiting');
    expect(seen[0].data).toMatchObject({ type: 'run:start', seq: 0 });
    const cursor = seen[seen.length - 1].id as string;
    expect(cursor).toBeDefined();

    // Resolve; the server resumes the run to completion.
    const resolved = await post(server, `/runs/${runId}/external/editor-approval`, {
      approved: true,
    });
    expect(await bodyOf(resolved)).toMatchObject({ applied: true, resumed: true });
    await untilStatus(server, runId, 'ok');

    // Reconnect with the cursor: replay starts strictly after it and the
    // stream closes at the terminal settle.
    const reconnected = await get(server, `/runs/${runId}/events`, { 'last-event-id': cursor });
    const replay = parseFrames(await reconnected.text());
    expect(replay.length).toBeGreaterThan(0);
    // The client missed the tail of segment 1 (its suspended settle) and
    // the whole resumed segment; replay starts strictly after the cursor.
    const first = replay[0];
    expect(first.data).toMatchObject({ type: 'run:end', status: 'suspended' });
    expect(
      replay.some((frame) => frame.data?.type === 'run:start' && frame.data.resumed === true),
    ).toBe(true);
    // The pre-cursor segment-1 events are not repeated.
    expect(replay.filter((frame) => frame.event === 'external:waiting')).toHaveLength(0);
    const last = replay[replay.length - 1];
    expect(last.event).toBe('run:end');
    expect(last.data).toMatchObject({ status: 'ok' });

    // A cursor seq the buffer does not hold replays everything strictly
    // AFTER it (at-least-once without the historical whole buffer
    // replay): this client claimed seq 9999999, so segment 1 (below
    // the stride) is skipped and the resumed segment replays in full.
    const between = await get(server, `/runs/${runId}/events`, { 'last-event-id': '9999999' });
    const afterCursor = parseFrames(await between.text());
    expect(afterCursor[0].data).toMatchObject({ type: 'run:start', resumed: true });
    expect(afterCursor.every((frame) => Number(frame.id) > 9_999_999)).toBe(true);
    // A cursor past the final seq replays nothing and closes.
    const beyond = await get(server, `/runs/${runId}/events`, {
      'last-event-id': String(Number.MAX_SAFE_INTEGER),
    });
    expect(parseFrames(await beyond.text())).toHaveLength(0);
  });

  it('seq stays strictly increasing across an in-server resume, so the SSE cursor is unambiguous (v1.22.0 review P1-2)', async () => {
    const { server } = assemble();
    const started = await post(server, '/runs', { workflow: 'gated', args: { item: 7 } });
    const { runId } = (await bodyOf(started)) as { runId: string };
    const live = await get(server, `/runs/${runId}/events`);
    await readUntil(live, (frame) => frame.event === 'external:waiting');
    await post(server, `/runs/${runId}/external/editor-approval`, { approved: true });
    await untilStatus(server, runId, 'ok');

    const everything = parseFrames(
      await (await get(server, `/runs/${runId}/events`, { 'last-event-id': '-1' })).text(),
    );
    const seqs = everything.map((frame) => Number(frame.id));
    expect(seqs.length).toBeGreaterThan(3);
    for (let i = 1; i < seqs.length; i += 1) {
      expect(seqs[i]).toBeGreaterThan(seqs[i - 1] ?? Number.NaN);
    }
    // The resumed segment's events sit at the next segment stride, so a
    // cursor minted in segment 1 can never collide with segment 2.
    const resumedStart = everything.find(
      (frame) => frame.data?.type === 'run:start' && frame.data.resumed === true,
    );
    expect(Number(resumedStart?.id)).toBeGreaterThanOrEqual(EVENT_SEGMENT_STRIDE);
  });

  it('offline resolution: append under the lease, resume stays with the host or a worker', async () => {
    const { engine, server, gated } = assemble();

    // The run is started OUTSIDE the server: not tracked in-process.
    const first = engine.run(gated as unknown as Workflow<unknown, unknown>, { item: 3 });
    const outcome = await first.result;
    expect(outcome.status).toBe('suspended');

    // The status route serves it from the store, honestly not live.
    const status = await bodyOf(await get(server, `/runs/${first.runId}`));
    expect(status).toMatchObject({ status: 'suspended', live: false, workflow: 'gated' });

    // The events route closes immediately with a comment: process-local
    // telemetry does not exist for this run here.
    const events = await get(server, `/runs/${first.runId}/events`);
    expect(await events.text()).toContain('not live in this process');

    // Schema validation guards the offline append too.
    const invalid = await post(server, `/runs/${first.runId}/external/editor-approval`, {
      wrong: true,
    });
    expect(invalid.status).toBe(400);

    const resolved = await post(server, `/runs/${first.runId}/external/editor-approval`, {
      approved: true,
    });
    expect(resolved.status).toBe(200);
    expect(await bodyOf(resolved)).toMatchObject({ applied: true, resumed: false });

    // The server did NOT resume it (no args channel; OQ-21).
    const after = await bodyOf(await get(server, `/runs/${first.runId}`));
    expect(after).toMatchObject({ status: 'suspended', live: false });

    // The host (or a queue worker) resumes; the fold consumes the value.
    const second = engine.resume(first.runId, gated as unknown as Workflow<unknown, unknown>, {
      args: { item: 3 },
    });
    const settled = await second.result;
    expect(settled.status).toBe('ok');
    expect(settled.value as GatedValue).toEqual({
      analysis: 'server analysis',
      approved: true,
      item: 3,
    });

    // A repeat resolution is DEFINED behavior: the fold answers noop.
    const repeat = await post(server, `/runs/${first.runId}/external/editor-approval`, {
      approved: false,
    });
    expect(repeat.status).toBe(200);
    expect(await bodyOf(repeat)).toMatchObject({ applied: false, reason: 'already_resolved' });

    // Cost for an untracked run folds the journal (unpriced fake usage).
    const cost = await bodyOf(await get(server, `/runs/${first.runId}/cost`));
    expect(cost).toHaveProperty('totalUsd');
  });

  it('routes: 404s, registry misses, malformed bodies, method mismatches', async () => {
    const { server } = assemble();

    expect((await get(server, '/runs/nope')).status).toBe(404);
    expect((await get(server, '/runs/nope/cost')).status).toBe(404);
    expect((await get(server, '/runs/nope/events')).status).toBe(404);
    expect((await post(server, '/runs/nope/external/key', { a: 1 })).status).toBe(404);

    const unknownWorkflow = await post(server, '/runs', { workflow: 'nope' });
    expect(unknownWorkflow.status).toBe(400);
    expect(JSON.stringify(await bodyOf(unknownWorkflow))).toContain('registry');

    const badJson = await server.fetch(
      new Request('http://rulvar.local/runs', { method: 'POST', body: 'not json' }),
    );
    expect(badJson.status).toBe(400);

    const wrongMethod = await server.fetch(
      new Request('http://rulvar.local/runs', { method: 'GET' }),
    );
    expect(wrongMethod.status).toBe(405);

    const wrongMethodStatus = await server.fetch(
      new Request('http://rulvar.local/runs/x', { method: 'DELETE' }),
    );
    expect(wrongMethodStatus.status).toBe(405);

    expect((await get(server, '/health')).status).toBe(404);

    const noBody = await post(server, '/runs', {});
    expect(noBody.status).toBe(400);

    // Malformed run options are refused as 400 config errors before any
    // run exists (v1.34.0 review P2-1/P2-3): engine.run throws the typed
    // ConfigError synchronously and the handler maps it.
    const badDeadline = await post(server, '/runs', {
      workflow: 'gated',
      args: { item: 1 },
      options: { deadlineAt: 'not-an-iso-date' },
    });
    expect(badDeadline.status).toBe(400);
    expect(JSON.stringify(await bodyOf(badDeadline))).toContain('ISO 8601');

    // NaN does not survive JSON.stringify (it arrives as null); the
    // typeof gate at the engine boundary refuses that too.
    const badBudget = await post(server, '/runs', {
      workflow: 'gated',
      args: { item: 1 },
      options: { budgetUsd: Number.NaN },
    });
    expect(badBudget.status).toBe(400);
    expect(JSON.stringify(await bodyOf(badBudget))).toContain('budgetUsd');
  });

  it('opt-in retention deletes settled runs: cascade leaves no journal, no meta, no track', async () => {
    const { engine, server } = assemble({ retention: (meta) => meta.status === 'ok' });
    const started = await post(server, '/runs', { workflow: 'gated', args: { item: 8 } });
    const { runId } = (await bodyOf(started)) as { runId: string };
    await untilStatus(server, runId, 'suspended');
    await post(server, `/runs/${runId}/external/editor-approval`, { approved: true });

    // The run settles ok, then retention removes every trace.
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const status = (await get(server, `/runs/${runId}`)).status;
      if (status === 404) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect((await get(server, `/runs/${runId}`)).status).toBe(404);
    expect(await engine.stores.journal.load(runId)).toEqual([]);
    expect(await engine.stores.transcripts.list(runId)).toEqual([]);
  });
});

/**
 * The suspension split-brain regression over HTTP (v1.10 deep E2E
 * review): resolving a tool approval on a run that already settled
 * 'suspended' must create exactly ONE continuation segment. The approved
 * tool executes once, the pre-approval turn is never re-paid, one
 * terminal agent entry lands, and every journal seq stays unique.
 */
function assembleGuarded(): {
  server: RulvarServer;
  engine: Engine;
  executions: string[];
  adapter: FakeAdapter;
} {
  const executions: string[] = [];
  const deploy = tool({
    name: 'deploy',
    description: 'deploys the site',
    parameters: { type: 'object' },
    needsApproval: true,
    execute: (input) => {
      executions.push(JSON.stringify(input));
      return Promise.resolve('deployed');
    },
  });
  const guarded = defineWorkflow({ name: 'guarded' }, async (ctx) =>
    ctx.agent('ship it', { tools: [deploy] }),
  ) as unknown as Workflow<never, unknown>;
  let turns = 0;
  const adapter = new FakeAdapter({
    agents: {
      '*': () => {
        turns += 1;
        return turns === 1 ? fakeToolCalls({ name: 'deploy', args: { site: 'prod' } }) : 'released';
      },
    },
  });
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: new SqliteStore({ path: ':memory:' }) },
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  });
  const server = createServer({ engine, workflows: { guarded } });
  return { server, engine, executions, adapter };
}

describe('tracked approval after the suspended settle (split-brain regression)', () => {
  it('allow: one tool execution, one continuation, unique seqs, clean SSE', async () => {
    const { server, engine, executions, adapter } = assembleGuarded();
    const started = await post(server, '/runs', { workflow: 'guarded' });
    expect(started.status).toBe(201);
    const { runId } = (await bodyOf(started)) as { runId: string };

    const suspended = await untilStatus(server, runId, 'suspended');
    const pending = suspended.pending as Array<{ key: string }>;
    expect(pending).toHaveLength(1);
    const key = pending[0]?.key ?? '';
    expect(key).toMatch(/^approval:/);
    // The settle closed the segment: nothing has executed yet.
    expect(executions).toEqual([]);
    expect(adapter.calls).toHaveLength(1);

    const resolved = await post(server, `/runs/${runId}/external/${key}`, {
      decision: 'allow',
    });
    expect(resolved.status).toBe(200);
    expect(await bodyOf(resolved)).toMatchObject({ applied: true, resumed: true });

    const settled = await untilStatus(server, runId, 'ok');
    expect(settled.value).toBe('released');

    // Exactly one execution segment did the work.
    expect(executions).toEqual(['{"site":"prod"}']);
    expect(adapter.calls).toHaveLength(2);
    const entries = (await engine.stores.journal.load(runId)).map((e) => normalizeEntry(e));
    const seqs = entries.map((e) => e.seq);
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(entries.filter((e) => e.kind === 'approval')).toHaveLength(1);
    expect(entries.filter((e) => e.kind === 'resolution')).toHaveLength(1);
    expect(
      entries.filter(
        (e) => e.kind === 'agent' && e.status !== 'running' && e.status !== 'suspended',
      ),
    ).toHaveLength(1);

    // The SSE buffer shows one terminal agent settle and one ok run:end
    // (the suspended run:end of segment 1 is part of the record).
    const replay = parseFrames(
      await (await get(server, `/runs/${runId}/events`, { 'last-event-id': '-1' })).text(),
    );
    const agentEnds = replay.filter((frame) => frame.data?.type === 'agent:end');
    expect(agentEnds).toHaveLength(1);
    const runEnds = replay.filter((frame) => frame.data?.type === 'run:end');
    expect(runEnds.map((frame) => frame.data?.status)).toEqual(['suspended', 'ok']);

    // A duplicate resolution against the now-ok run is a 409, never a
    // second continuation.
    const late = await post(server, `/runs/${runId}/external/${key}`, { decision: 'allow' });
    expect(late.status).toBe(409);
    expect(executions).toHaveLength(1);
  });

  it('deny: the tool never executes; only the post-denial turn runs', async () => {
    const { server, engine, executions, adapter } = assembleGuarded();
    const started = await post(server, '/runs', { workflow: 'guarded' });
    const { runId } = (await bodyOf(started)) as { runId: string };
    const suspended = await untilStatus(server, runId, 'suspended');
    const key = (suspended.pending as Array<{ key: string }>)[0]?.key ?? '';
    const resolved = await post(server, `/runs/${runId}/external/${key}`, {
      decision: 'deny',
      reason: 'not now',
    });
    expect(await bodyOf(resolved)).toMatchObject({ applied: true, resumed: true });
    const settled = await untilStatus(server, runId, 'ok');
    expect(settled.value).toBe('released');
    expect(executions).toEqual([]);
    expect(adapter.calls).toHaveLength(2);
    const entries = (await engine.stores.journal.load(runId)).map((e) => normalizeEntry(e));
    const seqs = entries.map((e) => e.seq);
    expect(new Set(seqs).size).toBe(seqs.length);
  });
});

describe('memory retention and bounded SSE buffer (v1.25.0 scale review P1-2)', () => {
  it('memoryRetention releases tracked state, durable journal and meta stay', async () => {
    const { engine, server } = assemble({ memoryRetention: (meta) => meta.status === 'ok' });
    const started = await post(server, '/runs', { workflow: 'gated', args: { item: 3 } });
    const { runId } = (await bodyOf(started)) as { runId: string };
    await untilStatus(server, runId, 'suspended');
    await post(server, `/runs/${runId}/external/editor-approval`, { approved: true });
    // The run settles ok, then the tracked state is released: status is
    // served from the store (live: false) while the record survives.
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const body = await bodyOf(await get(server, `/runs/${runId}`));
      if (body.status === 'ok' && body.live === false) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const after = await bodyOf(await get(server, `/runs/${runId}`));
    expect(after.status).toBe('ok');
    expect(after.live).toBe(false);
    expect((await engine.stores.journal.load(runId)).length).toBeGreaterThan(0);
    const meta = await engine.stores.journal.listRuns();
    expect(meta.some((m) => m.runId === runId && m.status === 'ok')).toBe(true);
  });

  it('maxTrackedRuns evicts the oldest settled run, never the live state of newer ones', async () => {
    const { engine, server } = assemble({ maxTrackedRuns: 1 });
    const first = await post(server, '/runs', { workflow: 'burst', args: { events: 1 } });
    const firstId = ((await bodyOf(first)) as { runId: string }).runId;
    await untilStatus(server, firstId, 'ok');
    const second = await post(server, '/runs', { workflow: 'burst', args: { events: 1 } });
    const secondId = ((await bodyOf(second)) as { runId: string }).runId;
    await untilStatus(server, secondId, 'ok');
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const body = await bodyOf(await get(server, `/runs/${firstId}`));
      if (body.live === false) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect((await bodyOf(await get(server, `/runs/${firstId}`))).live).toBe(false);
    expect((await bodyOf(await get(server, `/runs/${secondId}`))).live).toBe(true);
    // Eviction released memory, not the durable record.
    expect((await engine.stores.journal.load(firstId)).length).toBeGreaterThan(0);
  });

  it('maxBufferedEventsPerRun windows the replay, marks the gap, and keeps the journal whole', async () => {
    const { engine, server } = assemble({ maxBufferedEventsPerRun: 40 });
    const started = await post(server, '/runs', { workflow: 'burst', args: { events: 100 } });
    const { runId } = (await bodyOf(started)) as { runId: string };
    await untilStatus(server, runId, 'ok');
    const replay = await get(server, `/runs/${runId}/events`);
    expect(replay.headers.get('x-rulvar-events-dropped')).not.toBeNull();
    const text = await replay.text();
    // The gap marker leads the stream for a client with no cursor.
    expect(text.startsWith(': replay window starts at seq ')).toBe(true);
    const frames = parseFrames(text);
    expect(frames.length).toBeLessThanOrEqual(40);
    expect(frames.length).toBeGreaterThanOrEqual(35);
    expect(Number(replay.headers.get('x-rulvar-events-dropped'))).toBeGreaterThan(50);
    expect(frames[frames.length - 1]?.event).toBe('run:end');
    const ids = frames.map((frame) => Number(frame.id));
    for (let i = 1; i < ids.length; i += 1) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1]);
    }
    // A cursor INSIDE the retained window replays with no gap marker.
    const inside = await get(server, `/runs/${runId}/events`, {
      'last-event-id': String(ids[0]),
    });
    const insideText = await inside.text();
    expect(insideText.startsWith(': replay window')).toBe(false);
    const insideFrames = parseFrames(insideText);
    expect(insideFrames).toHaveLength(frames.length - 1);
    expect(Number(insideFrames[0]?.id)).toBeGreaterThan(ids[0]);
    // The journal is the durable record: untouched by the window.
    expect((await engine.stores.journal.load(runId)).length).toBeGreaterThan(0);
  });

  it('the Last-Event-ID cursor resumes strictly after the seq without drops configured', async () => {
    const { server } = assemble();
    const started = await post(server, '/runs', { workflow: 'burst', args: { events: 20 } });
    const { runId } = (await bodyOf(started)) as { runId: string };
    await untilStatus(server, runId, 'ok');
    const full = parseFrames(await (await get(server, `/runs/${runId}/events`)).text());
    const mid = full[Math.floor(full.length / 2)];
    const resumed = await get(server, `/runs/${runId}/events`, {
      'last-event-id': String(mid?.id),
    });
    expect(resumed.headers.get('x-rulvar-events-dropped')).toBeNull();
    const tail = parseFrames(await resumed.text());
    expect(tail.length).toBeGreaterThan(0);
    expect(Number(tail[0]?.id)).toBeGreaterThan(Number(mid?.id));
    expect(tail[tail.length - 1]?.event).toBe('run:end');
    expect(tail.map((frame) => frame.id)).toEqual(
      full.slice(full.length - tail.length).map((frame) => frame.id),
    );
  });
});

/** Reads a stream to ITS OWN close; returns the raw text. */
async function readToClose(response: Response): Promise<string> {
  const reader = (response.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (value !== undefined) {
      text += decoder.decode(value, { stream: true });
    }
    if (done) {
      return text;
    }
  }
}

function uniqueIds(frames: SseFrame[]): Set<string> {
  const ids = new Set<string>();
  for (const frame of frames) {
    if (frame.id !== undefined) {
      ids.add(frame.id);
    }
  }
  return ids;
}

/** The one terminal run:end (never replayed, never the suspended one). */
function terminalEnd(frames: SseFrame[]): SseFrame | undefined {
  return frames.find((frame) => frame.event === 'run:end' && frame.data?.status !== 'suspended');
}

describe('terminal drain, per-client pending bound, cap validation (v1.26.0 deep E2E review)', () => {
  it('a connected client receives the full terminal tail: run:end arrives before the close (P1-1)', async () => {
    const { server } = assemble();
    const started = await post(server, '/runs', { workflow: 'tail', args: { events: 5000 } });
    const { runId } = (await bodyOf(started)) as { runId: string };
    await untilStatus(server, runId, 'suspended');
    // Connect while suspended and STAY connected through the resume.
    const live = readToClose(await get(server, `/runs/${runId}/events`));
    const resolved = await bodyOf(await post(server, `/runs/${runId}/external/gate`, {}));
    expect(resolved.resumed).toBe(true);
    await untilStatus(server, runId, 'ok');
    const liveFrames = parseFrames(await live);
    expect(terminalEnd(liveFrames)).toBeDefined();
    const replayFrames = parseFrames(await readToClose(await get(server, `/runs/${runId}/events`)));
    // Everything the run ever emitted reached the connected client:
    // the ids seen live are exactly the ids a late replay serves.
    expect(uniqueIds(liveFrames)).toEqual(uniqueIds(replayFrames));
  });

  it('one hundred consecutive terminal tails lose nothing (P1-1 flake gate)', async () => {
    const { server } = assemble();
    for (let round = 0; round < 100; round += 1) {
      const started = await post(server, '/runs', { workflow: 'tail', args: { events: 120 } });
      const { runId } = (await bodyOf(started)) as { runId: string };
      await untilStatus(server, runId, 'suspended');
      const live = readToClose(await get(server, `/runs/${runId}/events`));
      await post(server, `/runs/${runId}/external/gate`, {});
      const liveFrames = parseFrames(await live);
      expect(terminalEnd(liveFrames)).toBeDefined();
      const replay = parseFrames(await readToClose(await get(server, `/runs/${runId}/events`)));
      expect(uniqueIds(liveFrames)).toEqual(uniqueIds(replay));
    }
  });

  it('the feed survives every suspended settle and delivers both resumed tails (P1-1)', async () => {
    const { server } = assemble();
    const started = await post(server, '/runs', { workflow: 'twoGates', args: { events: 400 } });
    const { runId } = (await bodyOf(started)) as { runId: string };
    await untilStatus(server, runId, 'suspended');
    const live = readToClose(await get(server, `/runs/${runId}/events`));
    await post(server, `/runs/${runId}/external/gate-one`, {});
    // The second suspension: poll until gate-two is the pending key.
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const body = await bodyOf(await get(server, `/runs/${runId}`));
      const pending = body.pending as Array<{ key?: string }> | undefined;
      if (body.status === 'suspended' && pending?.some((item) => item.key === 'gate-two')) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await post(server, `/runs/${runId}/external/gate-two`, {});
    await untilStatus(server, runId, 'ok');
    const liveFrames = parseFrames(await live);
    expect(terminalEnd(liveFrames)).toBeDefined();
    const replay = parseFrames(await readToClose(await get(server, `/runs/${runId}/events`)));
    expect(uniqueIds(liveFrames)).toEqual(uniqueIds(replay));
  });

  it('a consumer that stops reading closes at the bound and reconnects into the replay (P1-2)', async () => {
    const { server } = assemble({ maxPendingEventsPerClient: 100 });
    const started = await post(server, '/runs', { workflow: 'yieldy', args: { events: 1000 } });
    const { runId } = (await bodyOf(started)) as { runId: string };
    // Connect BEFORE the burst and read NOTHING until the run settles.
    const slow = await get(server, `/runs/${runId}/events`);
    await untilStatus(server, runId, 'ok');
    const firstText = await readToClose(slow);
    const firstFrames = parseFrames(firstText);
    // The queue was bounded, not O(events), and the close names the cap.
    expect(firstFrames.length).toBeLessThanOrEqual(101);
    expect(firstText).toContain('maxPendingEventsPerClient (100)');
    expect(terminalEnd(firstFrames)).toBeUndefined();
    // Standard reconnects with Last-Event-ID converge on the full set.
    const seen = uniqueIds(firstFrames);
    let cursor = firstFrames[firstFrames.length - 1]?.id;
    let sawEnd = false;
    for (let hop = 0; hop < 50 && !sawEnd; hop += 1) {
      const next = await get(server, `/runs/${runId}/events`, {
        ...(cursor === undefined ? {} : { 'last-event-id': cursor }),
      });
      const frames = parseFrames(await readToClose(next));
      expect(frames.length).toBeLessThanOrEqual(101);
      for (const id of uniqueIds(frames)) {
        seen.add(id);
      }
      if (frames.length > 0) {
        cursor = frames[frames.length - 1]?.id;
      }
      sawEnd = terminalEnd(frames) !== undefined;
    }
    expect(sawEnd).toBe(true);
    // Nothing was lost end to end: every id a full unwindowed replay
    // serves was eventually delivered across the bounded connections.
    const seenAll = new Set<string>();
    let checkCursor: string | undefined;
    for (let hop = 0; hop < 50; hop += 1) {
      const page = parseFrames(
        await readToClose(
          await get(server, `/runs/${runId}/events`, {
            ...(checkCursor === undefined ? {} : { 'last-event-id': checkCursor }),
          }),
        ),
      );
      if (page.length === 0) {
        break;
      }
      for (const id of uniqueIds(page)) {
        seenAll.add(id);
      }
      checkCursor = page[page.length - 1]?.id;
      if (terminalEnd(page) !== undefined) {
        break;
      }
    }
    expect(seen).toEqual(seenAll);
  });

  it('a client that keeps reading under the bound is never disconnected (P1-2 fast path)', async () => {
    const { server } = assemble({ maxPendingEventsPerClient: 1000 });
    const started = await post(server, '/runs', { workflow: 'yieldy', args: { events: 2000 } });
    const { runId } = (await bodyOf(started)) as { runId: string };
    const text = await readToClose(await get(server, `/runs/${runId}/events`));
    const frames = parseFrames(text);
    expect(text).not.toContain('maxPendingEventsPerClient');
    expect(terminalEnd(frames)).toBeDefined();
    expect(uniqueIds(frames).size).toBeGreaterThanOrEqual(2002);
  });

  it('combined stress: bounded replay window, complete fast client, slow client crosses the gap', async () => {
    const { server } = assemble({
      maxBufferedEventsPerRun: 200,
      maxPendingEventsPerClient: 150,
    });
    const started = await post(server, '/runs', { workflow: 'yieldy', args: { events: 2000 } });
    const { runId } = (await bodyOf(started)) as { runId: string };
    const fast = readToClose(await get(server, `/runs/${runId}/events`));
    const slow = await get(server, `/runs/${runId}/events`);
    await untilStatus(server, runId, 'ok');
    // The fast reader saw the whole run live, terminal end included.
    const fastFrames = parseFrames(await fast);
    expect(terminalEnd(fastFrames)).toBeDefined();
    expect(uniqueIds(fastFrames).size).toBeGreaterThanOrEqual(2002);
    // The slow client was cut at the bound mid-run...
    const slowText = await readToClose(slow);
    expect(slowText).toContain('maxPendingEventsPerClient (150)');
    // ...and its reconnect lands BEFORE the retained window: the gap
    // protocol marks it and the client converges on the terminal end.
    const slowFrames = parseFrames(slowText);
    const reconnect = await get(server, `/runs/${runId}/events`, {
      'last-event-id': String(slowFrames[slowFrames.length - 1]?.id),
    });
    expect(Number(reconnect.headers.get('x-rulvar-events-dropped'))).toBeGreaterThan(0);
    const reconnectText = await readToClose(reconnect);
    expect(reconnectText).toContain(': replay window starts at seq ');
    let frames = parseFrames(reconnectText);
    let cursor = frames[frames.length - 1]?.id;
    let sawEnd = terminalEnd(frames) !== undefined;
    for (let hop = 0; hop < 20 && !sawEnd; hop += 1) {
      frames = parseFrames(
        await readToClose(
          await get(server, `/runs/${runId}/events`, {
            ...(cursor === undefined ? {} : { 'last-event-id': cursor }),
          }),
        ),
      );
      if (frames.length > 0) {
        cursor = frames[frames.length - 1]?.id;
      }
      sawEnd = terminalEnd(frames) !== undefined;
    }
    expect(sawEnd).toBe(true);
  });

  it('createServer rejects every out-of-domain cap with a typed ConfigError (P2-1)', () => {
    const { engine, workflows } = assemble();
    const bad: Array<[string, number]> = [];
    for (const value of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
      1.5,
      2 ** 53,
      '5' as unknown as number,
    ]) {
      for (const key of [
        'maxTrackedRuns',
        'maxBufferedEventsPerRun',
        'maxPendingEventsPerClient',
      ]) {
        bad.push([key, value]);
      }
    }
    // Zero is in-domain ONLY for maxTrackedRuns (keep no settled runs).
    bad.push(['maxBufferedEventsPerRun', 0], ['maxPendingEventsPerClient', 0]);
    for (const [key, value] of bad) {
      expect(
        () => createServer({ engine, workflows, [key]: value }),
        `${key}=${String(value)}`,
      ).toThrowError(ConfigError);
      expect(() => createServer({ engine, workflows, [key]: value })).toThrowError(
        new RegExp(`createServer ${key}`),
      );
    }
    for (const options of [
      { maxTrackedRuns: 0 },
      { maxTrackedRuns: 1 },
      { maxTrackedRuns: 1_000_000 },
      { maxBufferedEventsPerRun: 1 },
      { maxBufferedEventsPerRun: 1_000_000 },
      { maxPendingEventsPerClient: 1 },
      { maxPendingEventsPerClient: 1_000_000 },
    ]) {
      expect(() => createServer({ engine, workflows, ...options })).not.toThrow();
    }
  });
});
