/**
 * createWorker integration (M8-T02 acceptance; FR-703): two store
 * connections over one sqlite file stand in for two
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
  ConfigError,
  createEngine,
  CURRENT_HASH_VERSION,
  defineWorkflow,
  InMemoryStore,
  JournalCompatibilityError,
  LeaseHeldError,
  normalizeEntry,
  Replayer,
  type Engine,
  type JournalEntry,
  type Lease,
  type RunMeta,
  type Workflow,
  type WorkflowRegistry,
} from '@rulvar/core';
import { SqliteStore } from '@rulvar/store-sqlite';
import { FAKE_MODEL_REF, FakeAdapter } from '@rulvar/testing';

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
  return join(mkdtempSync(join(tmpdir(), 'rulvar-worker-')), 'journal.db');
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

  it.each([
    ['ttlMs', { ttlMs: Number.NaN }],
    ['ttlMs', { ttlMs: 0 }],
    ['ttlMs', { ttlMs: -1 }],
    ['ttlMs', { ttlMs: 1.5 }],
    ['ttlMs', { ttlMs: Number.POSITIVE_INFINITY }],
    ['pollMs', { pollMs: Number.NaN }],
    ['pollMs', { pollMs: 0 }],
    ['pollMs', { pollMs: -5 }],
    ['pollMs', { pollMs: 2_147_483_648 }],
    ['pollMs', { pollMs: Number.POSITIVE_INFINITY }],
  ])(
    'a malformed %s is a typed ConfigError at construction (v1.35.0 review P2-4)',
    (field, overrides) => {
      // Overflow, non finite, zero, negative, and fractional cadences
      // all collapse to Node's 1 ms interval floor: a renew/poll storm
      // against the store instead of a loud refusal.
      const store = new SqliteStore({ path: dbPath(), now: wallClock });
      const engine = makeEngine(store, {});
      expect(() => createWorker(engine, { store, ...overrides })).toThrowError(ConfigError);
      expect(() => createWorker(engine, { store, ...overrides })).toThrowError(
        new RegExp(`${field} must be an integer between 1 and 2147483647 ms`),
      );
    },
  );

  it('the TTL match promise is executable: a mismatch against leaseTtlMs refuses loudly', () => {
    const store = new SqliteStore({ path: dbPath(), ttlMs: 45_000, now: wallClock });
    const engine = makeEngine(store, {});
    expect(() => createWorker(engine, { store, ttlMs: 60_000 })).toThrowError(
      /does not match the store's configured lease ttl 45000/,
    );
    // Omitted, the worker ADOPTS the store's exposed ttl.
    expect(() => createWorker(engine, { store })).not.toThrow();
    // The exact match stays accepted.
    expect(() => createWorker(engine, { store, ttlMs: 45_000 })).not.toThrow();
  });

  it('a leasable store without the leaseTtlMs capability is trusted with the worker ttl', () => {
    const store = new InMemoryStore() as InMemoryStore & {
      acquire?: unknown;
      renew?: unknown;
      release?: unknown;
    };
    store.acquire = () => Promise.resolve({ runId: 'r', owner: 'o', epoch: 1 });
    store.renew = () => Promise.resolve(undefined);
    store.release = () => Promise.resolve(undefined);
    const engine = createEngine({
      adapters: [new FakeAdapter({ agents: { '*': 'x' } })],
      stores: { journal: store },
    });
    expect(() =>
      createWorker(engine, { store: store as unknown as SqliteStore, ttlMs: 30_000 }),
    ).not.toThrow();
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
    const beforeMeta = await storeA.getMeta(first.runId);
    const stale = engineA.resume(first.runId, undefined, {
      args: { item: 5 },
      lease: leaseA,
    });
    // The fencedWrites store refuses the segment's very FIRST durable
    // write (the running meta), so the stale segment dies typed before
    // any paid call. Until phase 2 this boot write landed unfenced (it
    // overwrote the successor's meta, RFC F1) and the stale segment
    // paid a live call before its first append bounced.
    await expect(stale.result).rejects.toThrowError(LeaseHeldError);
    expect((await storeB.load(first.runId)).length).toBe(before);
    expect(await storeA.getMeta(first.runId)).toEqual(beforeMeta);

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

  it('opt-in retention: a sweep deletes settled runs under a brief lease, cascade included', async () => {
    const path = dbPath();
    const store = new SqliteStore({ path, now: wallClock });
    const gated = gatedWorkflow();
    const engine = makeEngine(store, { gated });
    const first = engine.run(gated as unknown as Workflow<unknown, unknown>, { item: 4 });
    expect((await first.result).status).toBe('suspended');
    await offlineResolve(store, first.runId, { approved: true });

    const worker = createWorker(engine, {
      store,
      argsFor: () => ({ item: 4 }),
      retention: (meta) => meta.status === 'ok',
    });
    // First sweep completes the run; the next one applies retention.
    expect(await worker.sweep()).toBe(1);
    await untilMeta(store, first.runId, 'ok');
    await worker.sweep();
    expect(await metaStatus(store, first.runId)).toBe('missing');
    expect(await store.load(first.runId)).toEqual([]);
    expect(await engine.stores.transcripts.list(first.runId)).toEqual([]);
    await worker.stop();
  });

  it('retention passes its brief lease into the deleteRun cascade (RFC F4)', async () => {
    const path = dbPath();
    const store = new SqliteStore({ path, now: wallClock });
    const gated = gatedWorkflow();
    const engine = makeEngine(store, { gated });
    const first = engine.run(gated as unknown as Workflow<unknown, unknown>, { item: 4 });
    expect((await first.result).status).toBe('suspended');
    await offlineResolve(store, first.runId, { approved: true });

    // The spy proves the worker HANDS its brief lease to the cascade;
    // the sqlite store underneath is a fencedWrites store, so the
    // fenced delete succeeding end to end is part of the assertion.
    const seen: Array<{ runId: string; lease?: Lease }> = [];
    const spy: Engine = {
      ...engine,
      deleteRun: (runId, opts) => {
        seen.push({ runId, ...(opts?.lease === undefined ? {} : { lease: opts.lease }) });
        return engine.deleteRun(runId, opts);
      },
    };
    const worker = createWorker(spy, {
      store,
      argsFor: () => ({ item: 4 }),
      retention: (meta) => meta.status === 'ok',
    });
    expect(await worker.sweep()).toBe(1);
    await untilMeta(store, first.runId, 'ok');
    await worker.sweep();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.runId).toBe(first.runId);
    expect(seen[0]?.lease?.runId).toBe(first.runId);
    expect(typeof seen[0]?.lease?.epoch).toBe('number');
    expect(await metaStatus(store, first.runId)).toBe('missing');
    await worker.stop();
  });
});

describe('generation identity and sweep hygiene (v1.25.0 scale review)', () => {
  async function untilIdle(worker: { active(): string[] }): Promise<void> {
    for (let attempt = 0; attempt < 500 && worker.active().length > 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    // The settle chain caches the skip entry right before the slot
    // frees; one more tick lets the release land.
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  it('a deleteRun and recreate of the same runId is picked, never skipped as unchanged', async () => {
    const store = new SqliteStore({ path: dbPath(), now: wallClock });
    const gated = gatedWorkflow();
    const engine = makeEngine(store, { gated });
    const runId = 'reused-run-id';
    const first = await engine.run(
      gated as unknown as Workflow<unknown, unknown>,
      { item: 1 },
      { runId },
    ).result;
    expect(first.status).toBe('suspended');
    const lengthBefore = (await store.load(runId)).length;

    const worker = createWorker(engine, { store, argsFor: () => ({ item: 1 }) });
    // First sweep observes the suspended run, replays, re-suspends, and
    // caches the skip entry; the second sweep skips it as unchanged.
    expect(await worker.sweep()).toBe(1);
    await untilIdle(worker);
    expect(await worker.sweep()).toBe(0);

    // External delete, then a NEW run under the same explicit runId with
    // an identical journal length: length alone cannot tell them apart.
    await engine.deleteRun(runId);
    const second = await engine.run(
      gated as unknown as Workflow<unknown, unknown>,
      { item: 1 },
      { runId },
    ).result;
    expect(second.status).toBe('suspended');
    expect((await store.load(runId)).length).toBe(lengthBefore);

    // The generation differs, so the sweep MUST pick the new run.
    expect(await worker.sweep()).toBe(1);
    await untilIdle(worker);
    await worker.stop();
  });

  it('the sweep queries candidate statuses only; retention widens it to the full catalog', async () => {
    const path = dbPath();
    const inner = new SqliteStore({ path, now: wallClock });
    const recorded: unknown[] = [];
    const spy = {
      append: (runId: string, e: never, lease?: never) => inner.append(runId, e, lease),
      load: (runId: string) => inner.load(runId),
      putMeta: (m: never) => inner.putMeta(m),
      listRuns: (f?: never) => {
        recorded.push(f);
        return inner.listRuns(f);
      },
      getMeta: (runId: string) => inner.getMeta(runId),
      delete: (runId: string) => inner.delete(runId),
      acquire: (runId: string, owner: string) => inner.acquire(runId, owner),
      renew: (l: never) => inner.renew(l),
      release: (l: never) => inner.release(l),
    };
    const engine = createEngine({
      adapters: [new FakeAdapter({ agents: { '*': 'queued analysis' } })],
      stores: { journal: spy },
      defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
    });
    const worker = createWorker(engine, { store: spy });
    expect(await worker.sweep()).toBe(0);
    expect(recorded).toEqual([{ statuses: ['running', 'suspended'] }]);
    await worker.stop();

    const retentive = createWorker(engine, { store: spy, retention: () => false });
    expect(await retentive.sweep()).toBe(0);
    expect(recorded[1]).toBeUndefined();
    expect(recorded).toHaveLength(2);
    await retentive.stop();
  });

  it('sweeps never overlap: a second call returns 0 while the first scans', async () => {
    const inner = new SqliteStore({ path: dbPath(), now: wallClock });
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const blocking = {
      append: (runId: string, e: never, lease?: never) => inner.append(runId, e, lease),
      load: (runId: string) => inner.load(runId),
      putMeta: (m: never) => inner.putMeta(m),
      listRuns: async (f?: never) => {
        await gate;
        return inner.listRuns(f);
      },
      getMeta: (runId: string) => inner.getMeta(runId),
      delete: (runId: string) => inner.delete(runId),
      acquire: (runId: string, owner: string) => inner.acquire(runId, owner),
      renew: (l: never) => inner.renew(l),
      release: (l: never) => inner.release(l),
    };
    const engine = createEngine({
      adapters: [new FakeAdapter({ agents: { '*': 'queued analysis' } })],
      stores: { journal: blocking },
      defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
    });
    const worker = createWorker(engine, { store: blocking });
    const inFlight = worker.sweep();
    expect(await worker.sweep()).toBe(0);
    release();
    expect(await inFlight).toBe(0);
    await worker.stop();
  });

  it('a poisoned runId gets a fresh chance when the run is deleted and recreated', async () => {
    const path = dbPath();
    const hostStore = new SqliteStore({ path, now: wallClock });
    const gated = gatedWorkflow();
    const hostEngine = makeEngine(hostStore, { gated });
    const runId = 'poison-reborn';
    const first = hostEngine.run(
      gated as unknown as Workflow<unknown, unknown>,
      { item: 1 },
      { runId },
    );
    expect((await first.result).status).toBe('suspended');
    await offlineResolve(hostStore, runId, { approved: true });

    // The worker's engine has an EMPTY registry: bare resume cannot
    // bind, and the run poisons for this worker.
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
    expect(errors).toHaveLength(1);
    expect(await worker.sweep()).toBe(0);
    expect(errors).toHaveLength(1);

    // Delete and recreate under the same runId: a NEW generation must
    // not inherit the old poison, so the worker attempts it again.
    await hostEngine.deleteRun(runId);
    const second = hostEngine.run(
      gated as unknown as Workflow<unknown, unknown>,
      { item: 1 },
      { runId },
    );
    expect((await second.result).status).toBe('suspended');
    await offlineResolve(hostStore, runId, { approved: true });
    expect(await worker.sweep()).toBe(1);
    for (let attempt = 0; attempt < 500 && worker.active().length > 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(errors).toHaveLength(2);
    await worker.stop();
  });

  it('a sweep never adopts a LIVE fresh run: the genesis lease excludes it (P0.2)', async () => {
    const store = new SqliteStore({ path: dbPath() });
    let openGate: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    const live = defineWorkflow({ name: 'live' }, async (ctx) => {
      const first = await ctx.agent('turn one');
      await gate;
      const second = await ctx.agent('turn two');
      return { first: String(first).length, second: String(second).length };
    }) as unknown as Workflow<never, unknown>;
    const engineA = makeEngine(store, { live });
    const workerEngine = makeEngine(store, { live });
    const worker = createWorker(workerEngine, { store });
    const handle = engineA.run(live as unknown as Workflow<unknown, unknown>, undefined);
    await untilMeta(store, handle.runId, 'running');
    // Before the genesis ownership protocol this sweep ADOPTED the live
    // run (its meta says running, nothing held its lease), redispatched
    // the in-flight turn, and raced the journal from a stale tail. Now
    // the fresh segment holds the lease from its own boot, so the
    // sweep's acquire rejects and the run is skipped, not adopted.
    expect(await worker.sweep()).toBe(0);
    openGate();
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    // Settle released the genesis lease: terminal meta, nothing for a
    // later sweep to pick up either.
    expect(await worker.sweep()).toBe(0);
    await worker.stop();
  });
});

describe('createWorker retention under load (cycle 80)', () => {
  it('retention still runs while every concurrency slot is busy', async () => {
    const path = dbPath();
    const store = new SqliteStore({ path, now: wallClock });
    const gated = gatedWorkflow();
    const plain = defineWorkflow({ name: 'plain' }, async (ctx) => {
      await ctx.agent('quick check');
      return 'done';
    }) as unknown as Workflow<never, unknown>;
    const engine = createEngine({
      adapters: [
        new FakeAdapter({
          agents: {
            // The post-resolution agent hangs (abort-aware through the
            // adapter's abort race), pinning the only concurrency slot.
            post: () => new Promise(() => undefined),
            '*': 'queued analysis',
          },
        }),
      ],
      stores: { journal: store },
      defaults: {
        routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF },
        workflows: { gated, plain },
      },
    });
    // 'a-...' sorts before 'z-...' (listRuns orders by run_id), so the
    // sweep meets the resumable run first and fills the only slot.
    const hang = engine.run(
      gated as unknown as Workflow<unknown, unknown>,
      { item: 1 },
      {
        runId: 'a-hanging-run',
      },
    );
    expect((await hang.result).status).toBe('suspended');
    const done = engine.run(plain as unknown as Workflow<unknown, unknown>, undefined, {
      runId: 'z-settled-run',
    });
    expect((await done.result).status).toBe('ok');
    await offlineResolve(store, 'a-hanging-run', { approved: true });

    const worker = createWorker(engine, {
      store,
      argsFor: () => ({ item: 1 }),
      retention: (meta) => meta.status === 'ok',
    });
    expect(await worker.sweep()).toBe(1);
    expect(worker.active()).toEqual(['a-hanging-run']);
    // The settled run was retention-deleted DURING the same sweep, even
    // though the single concurrency slot was already busy.
    expect((await store.listRuns()).map((meta) => meta.runId)).toEqual(['a-hanging-run']);
    await worker.stop();
  });
});

describe('createWorker stop discipline (cycle 79)', () => {
  it('stop() during an in-flight sweep picks nothing new and leaves nothing live', async () => {
    const path = dbPath();
    let openGate: () => void = () => undefined;
    let gateArmed = false;
    const gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    class GatedStore extends SqliteStore {
      override async listRuns(
        ...args: Parameters<SqliteStore['listRuns']>
      ): ReturnType<SqliteStore['listRuns']> {
        if (gateArmed) {
          await gate;
        }
        return super.listRuns(...args);
      }
    }
    const store = new GatedStore({ path, now: wallClock });
    const gated = gatedWorkflow();
    const engine = makeEngine(store, { gated });
    const first = engine.run(gated as unknown as Workflow<unknown, unknown>, { item: 3 });
    expect((await first.result).status).toBe('suspended');

    const worker = createWorker(engine, { store, argsFor: () => ({ item: 3 }) });
    gateArmed = true;
    // The sweep parks inside listRuns; stop() arrives while it scans.
    const sweepP = worker.sweep();
    await new Promise((resolve) => setImmediate(resolve));
    const stopP = worker.stop();
    openGate();
    await stopP;
    // A stopped worker must not have picked the suspended run after the
    // cancel snapshot: nothing counted, nothing live, no lease held.
    expect(await sweepP).toBe(0);
    expect(worker.active()).toEqual([]);
    const probe = await store.acquire(first.runId, 'probe');
    await store.release(probe);
  });
});

/**
 * Production fitness (RV4913): the defects a code review of the tenth
 * comparison experiment confirmed on the stock worker. The event
 * stream was never read (the engine buffers it unbounded from handle
 * creation), a failed renew freed the slot before the cancel landed
 * and stop() never saw the evicted run, the timer path swallowed every
 * sweep failure (a store outage was a silent idle), and the resume was
 * blind (`{ lease, args }` only), so a run holding open wire intents
 * poisoned forever and no host check could ride in.
 */
describe('production fitness (RV4913)', () => {
  async function untilIdle(worker: { active(): string[] }): Promise<void> {
    for (let attempt = 0; attempt < 500 && worker.active().length > 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  async function until(predicate: () => boolean, what: string): Promise<void> {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      if (predicate()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`timed out waiting for ${what}`);
  }

  /** A suspended gated run whose resolution already landed: the next segment goes live. */
  async function resolvedCandidate(
    path: string,
    item: number,
  ): Promise<{ runId: string; gated: Workflow<never, unknown> }> {
    const hostStore = new SqliteStore({ path, now: wallClock });
    const gated = gatedWorkflow();
    const hostEngine = makeEngine(hostStore, { gated });
    const first = hostEngine.run(gated as unknown as Workflow<unknown, unknown>, { item });
    expect((await first.result).status).toBe('suspended');
    await offlineResolve(hostStore, first.runId, { approved: true });
    return { runId: first.runId, gated };
  }

  it('a failed renew evicts the run: cancelled, still active until the cancel settles, awaited by stop()', async () => {
    const path = dbPath();
    const { runId, gated } = await resolvedCandidate(path, 7);
    class RejectingRenew extends SqliteStore {
      override renew(): Promise<void> {
        return Promise.reject(new Error('renew: connection reset by peer'));
      }
    }
    // A 30 ms ttl makes the worker renew every 10 ms; the store clock
    // is frozen so the lease itself never expires and every fenced
    // write of the unwinding segment still lands (the eviction is the
    // worker's decision, not the store's).
    const store = new RejectingRenew({ path, ttlMs: 30, now: () => 1_000_000 });
    const engine = createEngine({
      adapters: [
        new FakeAdapter({
          agents: {
            // The live tail hangs until cancelled (abort aware).
            post: () => new Promise(() => undefined),
            '*': 'queued analysis',
          },
        }),
      ],
      stores: { journal: store },
      defaults: {
        routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF },
        workflows: { gated },
      },
    });
    // The cancel is gated so the window between "cancel issued" and
    // "cancel settled" is observable: the old worker freed the slot
    // inside that window.
    let openCancel: () => void = () => undefined;
    const cancelGate = new Promise<void>((resolve) => {
      openCancel = resolve;
    });
    const cancels: string[] = [];
    const spy: Engine = {
      ...engine,
      resume: (id, wf, opts) => {
        const handle = engine.resume(id, wf, opts);
        return {
          ...handle,
          cancel: async (reason?: string) => {
            cancels.push(reason ?? '');
            await cancelGate;
            await handle.cancel(reason);
          },
        };
      },
    };
    const errors: unknown[] = [];
    const worker = createWorker(spy, {
      store,
      argsFor: () => ({ item: 7 }),
      onError: (_runId, error) => {
        errors.push(error);
      },
    });
    expect(await worker.sweep()).toBe(1);
    await until(() => cancels.length > 0, 'the lease lost cancel');
    expect(cancels).toEqual(['lease lost: fencing epoch superseded']);
    expect(String(errors[0])).toContain('connection reset');
    // Evicted, not forgotten: the slot is still occupied while the
    // cancel is in flight.
    expect(worker.active()).toEqual([runId]);
    // stop() waits for the evicted run instead of resolving over a
    // run that is still live.
    const stopP = worker.stop();
    const raced = await Promise.race([
      stopP.then(() => 'stopped'),
      new Promise<string>((resolve) => setTimeout(() => resolve('pending'), 50)),
    ]);
    expect(raced).toBe('pending');
    expect(cancels).toHaveLength(1);
    openCancel();
    await stopP;
    expect(worker.active()).toEqual([]);
    // The settle chain freed the slot a single time and handed the
    // lease back: an immediate acquire succeeds.
    const probe = await store.acquire(runId, 'probe');
    await store.release(probe);
  });

  it('a store the sweep cannot read is a loud fact: onSweepError, lastSweepError, cleared by the next completed sweep', async () => {
    let outage = true;
    class FlakyStore extends SqliteStore {
      override listRuns(
        ...args: Parameters<SqliteStore['listRuns']>
      ): ReturnType<SqliteStore['listRuns']> {
        if (outage) {
          return Promise.reject(new Error('listRuns: database is locked'));
        }
        return super.listRuns(...args);
      }
    }
    const store = new FlakyStore({ path: dbPath(), now: wallClock });
    const engine = makeEngine(store, {});
    const sweepErrors: unknown[] = [];
    const worker = createWorker(engine, {
      store,
      pollMs: 5,
      onSweepError: (error) => {
        sweepErrors.push(error);
      },
    });
    expect(worker.lastSweepError()).toBeUndefined();
    // A direct sweep rejects to its caller and raises the flag.
    await expect(worker.sweep()).rejects.toThrowError(/database is locked/);
    expect(String(worker.lastSweepError())).toContain('database is locked');
    expect(sweepErrors).toHaveLength(0);
    // The timer path reports every failed sweep instead of idling
    // silently over the dead store.
    worker.start();
    await until(() => sweepErrors.length >= 2, 'two reported sweep failures');
    expect(String(sweepErrors[0])).toContain('database is locked');
    expect(String(worker.lastSweepError())).toContain('database is locked');
    // The store heals: the next completed sweep clears the flag.
    outage = false;
    await until(() => worker.lastSweepError() === undefined, 'the flag to clear');
    await worker.stop();
    const reported = sweepErrors.length;
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(sweepErrors).toHaveLength(reported);
  });

  it('a run emitting 100k events under the worker is drained as it goes: never more than one burst buffered', async () => {
    const path = dbPath();
    const BURST = 1000;
    const BURSTS = 100;
    let deliveredLogs = 0;
    const lag: number[] = [];
    const chatty = defineWorkflow({ name: 'chatty' }, async (ctx) => {
      await ctx.agent('analyze');
      await ctx.awaitExternal<{ approved: boolean }>('editor-approval', { prompt: 'ship it?' });
      let emitted = 0;
      for (let burst = 0; burst < BURSTS; burst += 1) {
        for (let i = 0; i < BURST; i += 1) {
          ctx.log('info', `event ${String(emitted)}`);
          emitted += 1;
        }
        // A macrotask boundary between bursts: a consumer that keeps up
        // drains the whole burst here, a consumer that never arrives
        // leaves every burst buffered (the old worker never arrived).
        await new Promise((resolve) => setImmediate(resolve));
        lag.push(emitted - deliveredLogs);
      }
      const post = await ctx.agent('post');
      return { emitted, post };
    }) as unknown as Workflow<never, unknown>;
    const hostStore = new SqliteStore({ path, now: wallClock });
    const hostEngine = makeEngine(hostStore, { chatty });
    const first = hostEngine.run(chatty as unknown as Workflow<unknown, unknown>, undefined);
    expect((await first.result).status).toBe('suspended');
    await offlineResolve(hostStore, first.runId, { approved: true });

    const workerStore = new SqliteStore({ path, now: wallClock });
    const worker = createWorker(makeEngine(workerStore, { chatty }), {
      store: workerStore,
      onEvent: (event) => {
        if (event.type === 'log') {
          deliveredLogs += 1;
        }
      },
    });
    expect(await worker.sweep()).toBe(1);
    await untilMeta(workerStore, first.runId, 'ok');
    await worker.stop();
    expect(lag).toHaveLength(BURSTS);
    // The buffer never held more than the burst in flight: the drain
    // kept pace with emission across all 100k events.
    expect(Math.max(...lag)).toBeLessThanOrEqual(BURST);
    expect(deliveredLogs).toBeGreaterThanOrEqual(BURST * BURSTS);
  });

  it('a run holding open wire intents resumes through resumeOptions; without the acknowledgment the worker poisons it', async () => {
    const path = dbPath();
    const { runId, gated } = await resolvedCandidate(path, 6);
    // The crash window, reconstructed (RV4006): an intent journaled
    // before a dispatch that never came back, no receipt, no terminal.
    const hostStore = new SqliteStore({ path, now: wallClock });
    const entries = await hostStore.load(runId);
    const maxSeq = Math.max(...entries.map((entry) => entry.seq));
    const orphan = {
      hashVersion: CURRENT_HASH_VERSION,
      seq: maxSeq + 1,
      kind: 'decision',
      scope: '',
      key: 'pi:99999:1:1',
      status: 'ok',
      spanId: 'crash-window',
      site: 'provider-intent',
      value: {
        decisionType: 'provider-intent',
        agentRef: 99999,
        ordinal: 1,
        attempt: 1,
        servedBy: FAKE_MODEL_REF,
        requestFingerprint: 'f'.repeat(64),
      },
    };
    await hostStore.append(runId, orphan as unknown as JournalEntry);

    // The blind worker (the historical shape): the typed refusal
    // poisons the run for this worker, and nothing could ever lift it.
    const blindStore = new SqliteStore({ path, now: wallClock });
    const errors: unknown[] = [];
    const blind = createWorker(makeEngine(blindStore, { gated }), {
      store: blindStore,
      argsFor: () => ({ item: 6 }),
      onError: (_runId, error) => {
        errors.push(error);
      },
    });
    expect(await blind.sweep()).toBe(1);
    await untilIdle(blind);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(ConfigError);
    expect(String(errors[0])).toContain('acknowledgeOpenWireIntents');
    expect(await blind.sweep()).toBe(0);
    expect(await metaStatus(blindStore, runId)).toBe('suspended');
    await blind.stop();

    // The acknowledging worker: the posture is computed per run from
    // the meta and reaches engine.resume, which journals the
    // acknowledgment and completes the run.
    const ackStore = new SqliteStore({ path, now: wallClock });
    const seen: RunMeta[] = [];
    const acknowledging = createWorker(makeEngine(ackStore, { gated }), {
      store: ackStore,
      argsFor: () => ({ item: 6 }),
      resumeOptions: (meta) => {
        seen.push(meta);
        return { acknowledgeOpenWireIntents: true };
      },
    });
    expect(await acknowledging.sweep()).toBe(1);
    await untilMeta(ackStore, runId, 'ok');
    await acknowledging.stop();
    expect(seen.map((meta) => meta.runId)).toEqual([runId]);
    const after = (await ackStore.load(runId)).map((raw) => normalizeEntry(raw));
    const ack = after.find(
      (entry) =>
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
        'open_wire_intents_acknowledged',
    );
    expect(ack).toBeDefined();
    expect((ack?.value as { count?: number } | undefined)?.count).toBe(1);
  });

  it("resumeOptions.bodyHash 'refuse' reaches the engine: an edited body is refused and poisoned, not warned past", async () => {
    const path = dbPath();
    const { runId } = await resolvedCandidate(path, 8);
    // The same name over an edited body: the historical worker resumed
    // it under the loud warning; the pinned posture refuses typed.
    const edited = defineWorkflow({ name: 'gated' }, async (ctx, args: { item: number }) => {
      const analysis = await ctx.agent(`analyze ${String(args.item)}`);
      const approval = await ctx.awaitExternal<{ approved: boolean }>('editor-approval', {
        prompt: 'ship it?',
      });
      const post = await ctx.agent(`post ${String(approval.approved)}`);
      return { edited: true, analysis, post };
    }) as unknown as Workflow<never, unknown>;
    const store = new SqliteStore({ path, now: wallClock });
    const errors: unknown[] = [];
    const worker = createWorker(makeEngine(store, { gated: edited }), {
      store,
      argsFor: () => ({ item: 8 }),
      resumeOptions: { bodyHash: 'refuse' },
      onError: (_runId, error) => {
        errors.push(error);
      },
    });
    expect(await worker.sweep()).toBe(1);
    await untilIdle(worker);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(ConfigError);
    expect(String(errors[0])).toContain("bodyHash is 'refuse'");
    expect(await worker.sweep()).toBe(0);
    expect(await metaStatus(store, runId)).toBe('suspended');
    await worker.stop();
  });

  it('a throwing resumeOptions callback is reported and the lease handed back; a ConfigError poisons', async () => {
    const path = dbPath();
    const { runId, gated } = await resolvedCandidate(path, 9);
    const store = new SqliteStore({ path, now: wallClock });
    const errors: unknown[] = [];
    let refuse = false;
    const worker = createWorker(makeEngine(store, { gated }), {
      store,
      argsFor: () => ({ item: 9 }),
      resumeOptions: () => {
        if (refuse) {
          throw new ConfigError('the host refuses this run');
        }
        throw new Error('config service unreachable');
      },
      onError: (_runId, error) => {
        errors.push(error);
      },
    });
    // A plain failure: reported, the lease released, retried next sweep.
    expect(await worker.sweep()).toBe(1);
    await untilIdle(worker);
    expect(String(errors[0])).toContain('config service unreachable');
    const probe = await store.acquire(runId, 'probe');
    await store.release(probe);
    expect(await worker.sweep()).toBe(1);
    await untilIdle(worker);
    expect(errors).toHaveLength(2);
    // A ConfigError: the binding rule, poisoned for this worker.
    refuse = true;
    expect(await worker.sweep()).toBe(1);
    await untilIdle(worker);
    expect(errors).toHaveLength(3);
    expect(errors[2]).toBeInstanceOf(ConfigError);
    expect(await worker.sweep()).toBe(0);
    expect(await metaStatus(store, runId)).toBe('suspended');
    await worker.stop();
  });
});
