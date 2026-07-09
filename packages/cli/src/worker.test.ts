/**
 * createWorker integration (M8-T02 acceptance; docs/02, section 8.3;
 * FR-703): two store connections over one sqlite file stand in for two
 * processes (the same isolation boundary the fencing epoch guards).
 * Covers: the non-leasable ConfigError at start, the queue round-trip
 * (suspended run picked up after an offline resolution, resolved through
 * the engine's registry with re-supplied args), the unchanged-suspended
 * skip, acquire-on-held rejection, DEF-6 at acquire, binding-error
 * poisoning, and the acceptance scenario: lease theft is impossible
 * because a stale writer's appends are rejected and invisible.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  defineWorkflow,
  InMemoryStore,
  JournalCompatibilityError,
  LeaseHeldError,
  normalizeEntry,
  Replayer,
  type Engine,
  type JournalEntry,
  type Workflow,
  type WorkflowRegistry,
} from '@lurker/core';
import { SqliteStore } from '@lurker/store-sqlite';
import { FAKE_MODEL_REF, FakeAdapter } from '@lurker/testing';

import { createWorker } from './worker.js';

const wallClock: () => number = Date.now.bind(globalThis);

function gatedWorkflow(): Workflow<never, unknown> {
  return defineWorkflow({ name: 'gated' }, async (ctx, args: { item: number }) => {
    const analysis = await ctx.agent(`analyze ${String(args.item)}`);
    const approval = await ctx.awaitExternal<{ approved: boolean }>('editor-approval', {
      prompt: 'ship it?',
    });
    // LIVE work strictly after the resolution point: a resume that
    // consumes the resolution MUST append (the fencing test rides this).
    const post = await ctx.agent(`post ${String(approval.approved)}`);
    return { analysis, post, approved: approval.approved, item: args.item };
  }) as unknown as Workflow<never, unknown>;
}

function makeEngine(store: SqliteStore, workflows: WorkflowRegistry): Engine {
  return createEngine({
    adapters: [new FakeAdapter({ agents: { '*': 'queued analysis' } })],
    stores: { journal: store },
    defaults: {
      routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF },
      workflows,
    },
  });
}

function dbPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'lurker-worker-')), 'journal.db');
}

/** Appends the offline external resolution the way a server shell does. */
async function offlineResolve(store: SqliteStore, runId: string, value: unknown): Promise<void> {
  const lease = await store.acquire(runId, 'resolver');
  try {
    const entries = (await store.load(runId)).map((raw) => normalizeEntry(raw));
    const target = entries.find(
      (entry) =>
        entry.kind === 'external' &&
        entry.status === 'suspended' &&
        (entry.value as { key?: string }).key === 'editor-approval',
    ) as JournalEntry;
    const replayer = new Replayer({
      runId,
      store,
      now: wallClock,
      priorEntries: entries,
      lease,
    });
    const outcome = await replayer.resolveSuspended(target.seq, {
      by: 'external',
      value: value as never,
    });
    expect(outcome.applied).toBe(true);
  } finally {
    await store.release(lease);
  }
}

async function metaStatus(store: SqliteStore, runId: string): Promise<string> {
  const metas = await store.listRuns();
  return metas.find((meta) => meta.runId === runId)?.status ?? 'missing';
}

/** Polls by attempts (never Date.now: the dev clock guard may be armed). */
async function untilMeta(store: SqliteStore, runId: string, status: string): Promise<void> {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if ((await metaStatus(store, runId)) === status) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`run ${runId} never reached meta '${status}'`);
}

describe('createWorker (M8-T02)', () => {
  it('a store without lease capability is a typed ConfigError at start, never a silent split-brain', () => {
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [new FakeAdapter({ agents: { '*': 'x' } })],
      stores: { journal: store },
    });
    expect(() => createWorker(engine, { store: store as unknown as SqliteStore })).toThrowError(
      /lease capability/,
    );
  });

  it('leasing a store other than the engine journal is a typed ConfigError', () => {
    const path = dbPath();
    const storeA = new SqliteStore({ path, now: wallClock });
    const storeB = new SqliteStore({ path, now: wallClock });
    const engine = makeEngine(storeA, {});
    expect(() => createWorker(engine, { store: storeB })).toThrowError(/SAME journal store/);
  });

  it('queue round-trip: a suspended run resumes through the registry after an offline resolution', async () => {
    const path = dbPath();
    const hostStore = new SqliteStore({ path, now: wallClock });
    const gated = gatedWorkflow();
    const hostEngine = makeEngine(hostStore, { gated });

    // The host starts the run; it suspends into the shared journal.
    const first = hostEngine.run(gated as unknown as Workflow<unknown, unknown>, { item: 9 });
    const outcome = await first.result;
    expect(outcome.status).toBe('suspended');

    // A second connection = a second process: the worker's own engine.
    const workerStore = new SqliteStore({ path, now: wallClock });
    const workerEngine = makeEngine(workerStore, { gated });
    const errors: unknown[] = [];
    const worker = createWorker(workerEngine, {
      store: workerStore,
      argsFor: () => ({ item: 9 }),
      onError: (_runId, error) => {
        errors.push(error);
      },
    });

    // First sweep drives the unchanged suspended run once (at-least-once
    // is honest: the replay costs zero live calls) and re-settles it.
    expect(await worker.sweep()).toBe(1);
    for (let attempt = 0; attempt < 500 && worker.active().length > 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(worker.active()).toHaveLength(0);
    expect(await metaStatus(workerStore, first.runId)).toBe('suspended');

    // Unchanged since that settle: the worker skips it now.
    expect(await worker.sweep()).toBe(0);

    // An offline resolution grows the journal; the next sweep completes
    // the run through the registry (bare resume) with re-supplied args.
    await offlineResolve(workerStore, first.runId, { approved: true });
    expect(await worker.sweep()).toBe(1);
    await untilMeta(workerStore, first.runId, 'ok');
    expect(errors).toHaveLength(0);
    await worker.stop();

    // Deduplication by the journal: each agent ran exactly once (one
    // two-phase pair each), no matter how many times the run was leased
    // and resumed.
    const entries = (await hostStore.load(first.runId)).map((raw) => normalizeEntry(raw));
    const agentEntries = entries.filter((entry) => entry.kind === 'agent');
    expect(agentEntries).toHaveLength(4);
  });

  it('acceptance: lease theft is impossible; the stale writer appends are rejected and invisible', async () => {
    const path = dbPath();
    // One controllable clock shared by both connections: expiry is a
    // fact in the shared leases table, exactly like two processes.
    let nowMs = 1_000_000;
    const clock = (): number => nowMs;
    const storeA = new SqliteStore({ path, ttlMs: 60_000, now: clock });
    const storeB = new SqliteStore({ path, ttlMs: 60_000, now: clock });
    const gated = gatedWorkflow();
    const engineA = makeEngine(storeA, { gated });
    const engineB = makeEngine(storeB, { gated });

    const first = engineA.run(gated as unknown as Workflow<unknown, unknown>, { item: 5 });
    expect((await first.result).status).toBe('suspended');

    // The resolution lands first (so a resume continues LIVE and must
    // append), then worker A acquires and stalls (no renew past the ttl).
    await offlineResolve(new SqliteStore({ path, ttlMs: 60_000, now: clock }), first.runId, {
      approved: true,
    });
    const leaseA = await storeA.acquire(first.runId, 'worker-a');

    // While A holds, acquire rejects with the typed LeaseHeldError.
    await expect(storeB.acquire(first.runId, 'worker-b')).rejects.toThrowError(LeaseHeldError);

    // A's lease expires unrenewed; B reclaims with a bumped epoch.
    nowMs += 61_000;
    const leaseB = await storeB.acquire(first.runId, 'worker-b');
    expect(leaseB.epoch).toBeGreaterThan(leaseA.epoch);

    // The stale writer resumes anyway (a paused process never notices).
    const before = (await storeB.load(first.runId)).length;
    const stale = engineA.resume(first.runId, undefined, {
      args: { item: 5 },
      lease: leaseA,
    });
    const staleOutcome = await stale.result;
    // Its first live append was rejected by the fencing epoch: the run
    // fails loudly instead of split-braining the journal.
    expect(staleOutcome.status).toBe('error');
    expect((await storeB.load(first.runId)).length).toBe(before);

    // The rightful holder completes the run under its lease.
    const fresh = engineB.resume(first.runId, undefined, {
      args: { item: 5 },
      lease: leaseB,
    });
    const outcome = await fresh.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({
      analysis: 'queued analysis',
      post: 'queued analysis',
      approved: true,
      item: 5,
    });
    await storeB.release(leaseB);

    // Zero double pay: each agent's two-phase pair exists exactly once;
    // the stale attempt contributed nothing.
    const entries = (await storeB.load(first.runId)).map((raw) => normalizeEntry(raw));
    expect(entries.filter((entry) => entry.kind === 'agent')).toHaveLength(4);
  });

  it('DEF-6 at acquire: a journal from a newer library poisons the run and releases the lease', async () => {
    const path = dbPath();
    const store = new SqliteStore({ path, now: wallClock });
    const gated = gatedWorkflow();
    const engine = makeEngine(store, { gated });
    const runId = 'run-from-the-future';
    await store.append(runId, {
      hashVersion: 99,
      seq: 0,
      scope: 'run',
      key: 'k',
      ordinal: 0,
      kind: 'agent',
      status: 'running',
      spanId: 's0',
      startedAt: '2026-01-01T00:00:00.000Z',
    });
    await store.putMeta({ runId, status: 'suspended', updatedAt: '2026-01-01T00:00:00.000Z' });

    const errors: unknown[] = [];
    const worker = createWorker(engine, {
      store,
      onError: (_runId, error) => {
        errors.push(error);
      },
    });
    expect(await worker.sweep()).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(JournalCompatibilityError);
    expect((errors[0] as JournalCompatibilityError).data).toMatchObject({
      subCode: 'HASH_VERSION_TOO_NEW',
    });

    // The lease was released, not leaked: an immediate acquire succeeds.
    const lease = await store.acquire(runId, 'probe');
    await store.release(lease);

    // Poisoned: the worker never retries it.
    expect(await worker.sweep()).toBe(0);
    expect(errors).toHaveLength(1);
    await worker.stop();
  });

  it('a run whose workflow is not registered poisons with the binding ConfigError', async () => {
    const path = dbPath();
    const hostStore = new SqliteStore({ path, now: wallClock });
    const gated = gatedWorkflow();
    const hostEngine = makeEngine(hostStore, { gated });
    const first = hostEngine.run(gated as unknown as Workflow<unknown, unknown>, { item: 1 });
    expect((await first.result).status).toBe('suspended');
    await offlineResolve(hostStore, first.runId, { approved: true });

    // The worker's engine has an EMPTY registry: bare resume cannot bind.
    const workerStore = new SqliteStore({ path, now: wallClock });
    const workerEngine = makeEngine(workerStore, {});
    const errors: unknown[] = [];
    const worker = createWorker(workerEngine, {
      store: workerStore,
      onError: (_runId, error) => {
        errors.push(error);
      },
    });
    expect(await worker.sweep()).toBe(1);
    for (let attempt = 0; attempt < 500 && worker.active().length > 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(String(errors[0])).toContain('defaults.workflows');
    // Poisoned for this worker; the journal is untouched (still suspended).
    expect(await worker.sweep()).toBe(0);
    expect(await metaStatus(workerStore, first.runId)).toBe('suspended');
    await worker.stop();
  });

  it('two workers, one run: exactly one holds the lease, the other skips', async () => {
    const path = dbPath();
    const hostStore = new SqliteStore({ path, now: wallClock });
    const gated = gatedWorkflow();
    const hostEngine = makeEngine(hostStore, { gated });
    const first = hostEngine.run(gated as unknown as Workflow<unknown, unknown>, { item: 2 });
    expect((await first.result).status).toBe('suspended');
    await offlineResolve(hostStore, first.runId, { approved: true });

    const storeA = new SqliteStore({ path, now: wallClock });
    const storeB = new SqliteStore({ path, now: wallClock });
    const workerA = createWorker(makeEngine(storeA, { gated }), {
      store: storeA,
      argsFor: () => ({ item: 2 }),
    });
    const workerB = createWorker(makeEngine(storeB, { gated }), {
      store: storeB,
      argsFor: () => ({ item: 2 }),
    });

    const [pickedA, pickedB] = await Promise.all([workerA.sweep(), workerB.sweep()]);
    expect(pickedA + pickedB).toBe(1);
    await untilMeta(hostStore, first.runId, 'ok');
    await workerA.stop();
    await workerB.stop();

    const entries = (await hostStore.load(first.runId)).map((raw) => normalizeEntry(raw));
    expect(entries.filter((entry) => entry.kind === 'agent')).toHaveLength(4);
  });
});
