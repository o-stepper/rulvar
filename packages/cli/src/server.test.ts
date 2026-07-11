/**
 * createServer e2e (M8-T01 acceptance; docs/02, section 8.2; FR-702):
 * the HITL round-trip over HTTP (suspend, resolve via the endpoint,
 * resume), SSE streaming with Last-Event-ID resume from the event seq,
 * the offline resolution path for runs not live in this process, and
 * the route error surface. Everything runs on FakeAdapter over a
 * SqliteStore: zero live calls, and the offline path exercises the real
 * lease brackets (docs/03, section 8).
 */
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  defineWorkflow,
  type Engine,
  type Workflow,
  type WorkflowRegistry,
} from '@rulvar/core';
import { SqliteStore } from '@rulvar/store-sqlite';
import { FAKE_MODEL_REF, FakeAdapter } from '@rulvar/testing';

import { createServer, type RulvarServer } from './server.js';

interface GatedValue {
  analysis: unknown;
  approved: boolean;
  item: number;
}

function assemble(options?: { retention?: (meta: { status: string }) => boolean }): {
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
  const workflows: WorkflowRegistry = { gated };
  const server = createServer({
    engine,
    workflows,
    ...(options?.retention === undefined ? {} : { retention: options.retention }),
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
  // stays installed while a suspended body is parked (docs/06, 2.7).
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

    // An unknown cursor replays the whole buffer (at-least-once).
    const fromScratch = await get(server, `/runs/${runId}/events`, { 'last-event-id': '9999999' });
    const everything = parseFrames(await fromScratch.text());
    expect(everything[0].data).toMatchObject({ type: 'run:start', seq: 0 });
    expect(everything.length).toBeGreaterThan(replay.length);
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

    // The server did NOT resume it (no args channel; docs/14, OQ-21).
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
