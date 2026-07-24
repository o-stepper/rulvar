/**
 * The genesis ownership protocol (P0.2): over a leasable journal store,
 * fresh start, in-process resume, and worker takeover share ONE
 * owner/lease contract. A segment not handed a lease acquires its own
 * before its first durable mutation, renews it at ttl/3, and releases
 * it at settle; a second driver rejects typed at its own boot with zero
 * writes and zero provider dispatches.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError, LeaseHeldError } from '../l0/errors.js';
import type { Lease, LeasableStore } from '../l0/spi/store.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';

interface LeasableFixture {
  store: LeasableStore;
  leases: Map<string, Lease>;
  acquires: Array<{ runId: string; owner: string }>;
  appendLeases: Array<Lease | undefined>;
  putMetaLeases: Array<Lease | undefined>;
  renewRejections: () => number;
  setFailRenew: (value: boolean) => void;
}

/** An InMemoryStore with the reference lease semantics stacked on top. */
function leasableStore(options?: { ttlMs?: number }): LeasableFixture {
  const inner = new InMemoryStore();
  const leases = new Map<string, Lease>();
  const acquires: Array<{ runId: string; owner: string }> = [];
  const appendLeases: Array<Lease | undefined> = [];
  const putMetaLeases: Array<Lease | undefined> = [];
  let epoch = 0;
  let failRenew = false;
  let rejectedRenews = 0;
  const store: LeasableStore = {
    append: (runId, entry, lease) => {
      appendLeases.push(lease);
      return inner.append(runId, entry, lease);
    },
    load: (runId) => inner.load(runId),
    putMeta: (meta, lease) => {
      putMetaLeases.push(lease);
      return inner.putMeta(meta, lease);
    },
    listRuns: (filter) => inner.listRuns(filter),
    delete: (runId, lease) => inner.delete(runId, lease),
    acquire: (runId, owner) => {
      const held = leases.get(runId);
      if (held !== undefined) {
        return Promise.reject(
          new LeaseHeldError(`run '${runId}' is leased by '${held.owner}' (epoch ${held.epoch})`),
        );
      }
      epoch += 1;
      const lease = { runId, owner, epoch };
      leases.set(runId, lease);
      acquires.push({ runId, owner });
      return Promise.resolve(lease);
    },
    renew: (lease) => {
      const held = leases.get(lease.runId);
      if (failRenew || held === undefined || held.epoch !== lease.epoch) {
        rejectedRenews += 1;
        return Promise.reject(new LeaseHeldError('renew rejected: not the current holder'));
      }
      return Promise.resolve();
    },
    release: (lease) => {
      const held = leases.get(lease.runId);
      if (held === undefined || held.epoch !== lease.epoch || held.owner !== lease.owner) {
        return Promise.reject(new LeaseHeldError('release rejected: not the current holder'));
      }
      leases.delete(lease.runId);
      return Promise.resolve();
    },
    ...(options?.ttlMs === undefined ? {} : { leaseTtlMs: options.ttlMs }),
  };
  return {
    store,
    leases,
    acquires,
    appendLeases,
    putMetaLeases,
    renewRejections: () => rejectedRenews,
    setFailRenew: (value) => {
      failRenew = value;
    },
  };
}

const ENGINE_OWNER = /^rulvar-engine:\d+:\d+$/;

describe('genesis ownership (P0.2)', () => {
  it('a fresh run acquires its own lease, fences every write, and releases at settle', async () => {
    const fixture = leasableStore();
    const adapter = scriptedAdapter(() => ({ text: 'done' }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: fixture.store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'owned' }, async (ctx) => ctx.agent('one turn'));
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('ok');
    expect(fixture.acquires).toHaveLength(1);
    expect(fixture.acquires[0]?.owner).toMatch(ENGINE_OWNER);
    // Every journal append and every meta write of the segment carried
    // the engine's lease.
    expect(fixture.appendLeases.length).toBeGreaterThan(0);
    expect(fixture.appendLeases.every((lease) => lease?.owner === fixture.acquires[0]?.owner)).toBe(
      true,
    );
    expect(fixture.putMetaLeases.length).toBeGreaterThan(0);
    expect(
      fixture.putMetaLeases.every((lease) => lease?.owner === fixture.acquires[0]?.owner),
    ).toBe(true);
    // Released at settle: the next owner (a worker sweep) can acquire.
    expect(fixture.leases.size).toBe(0);
  });

  it('a second driver rejects typed at boot with zero writes and zero dispatches', async () => {
    const fixture = leasableStore();
    const adapter = scriptedAdapter(() => ({ text: 'never' }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: fixture.store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const holder = await fixture.store.acquire('contested', 'other-process');
    const wf = defineWorkflow({ name: 'second' }, async (ctx) => ctx.agent('should not run'));
    const handle = engine.run(wf, undefined, { runId: 'contested' });
    await expect(handle.result).rejects.toBeInstanceOf(LeaseHeldError);
    // The event stream terminates instead of hanging consumers.
    for await (const event of handle.events) {
      void event;
    }
    expect(adapter.calls).toHaveLength(0);
    expect(await fixture.store.load('contested')).toHaveLength(0);
    expect(fixture.putMetaLeases).toHaveLength(0);
    await fixture.store.release(holder);
  });

  it('resume under a held lease rejects typed before any write', async () => {
    const fixture = leasableStore();
    const adapter = scriptedAdapter(() => ({ text: 'ok' }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: fixture.store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'held' }, async (ctx) => {
      await ctx.agent('first');
      await ctx.awaitExternal<{ ok: boolean }>('gate', { prompt: 'continue?' });
      return 'after';
    });
    const first = await engine.run(wf, undefined, { runId: 'run-held' }).result;
    expect(first.status).toBe('suspended');
    const appendsBefore = fixture.appendLeases.length;
    const holder = await fixture.store.acquire('run-held', 'worker-elsewhere');
    const resumed = engine.resume('run-held', wf, {});
    await expect(resumed.result).rejects.toBeInstanceOf(LeaseHeldError);
    expect(fixture.appendLeases.length).toBe(appendsBefore);
    await fixture.store.release(holder);
  });

  it('a caller-supplied genesis lease wins: no engine acquire, caller keeps the lifecycle', async () => {
    const fixture = leasableStore();
    const adapter = scriptedAdapter(() => ({ text: 'handed' }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: fixture.store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const lease = await fixture.store.acquire('handed-run', 'host-admission');
    const wf = defineWorkflow({ name: 'handed' }, async (ctx) => ctx.agent('one turn'));
    const outcome = await engine.run(wf, undefined, { runId: 'handed-run', lease }).result;
    expect(outcome.status).toBe('ok');
    // Exactly the host's acquire; the engine neither acquired nor
    // released, so the host still holds the run.
    expect(fixture.acquires).toHaveLength(1);
    expect(fixture.acquires[0]?.owner).toBe('host-admission');
    expect(fixture.appendLeases.every((entry) => entry?.owner === 'host-admission')).toBe(true);
    expect(fixture.leases.get('handed-run')?.owner).toBe('host-admission');
    await fixture.store.release(lease);
  });

  it('a supplied lease for another run is a typed ConfigError before any side effect', () => {
    const fixture = leasableStore();
    const adapter = scriptedAdapter(() => ({ text: 'x' }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: fixture.store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'mismatch' }, async (ctx) => ctx.agent('x'));
    expect(() =>
      engine.run(wf, undefined, {
        runId: 'run-a',
        lease: { runId: 'run-b', owner: 'host', epoch: 1 },
      }),
    ).toThrowError(ConfigError);
    expect(fixture.appendLeases).toHaveLength(0);
  });

  it("ownership 'none' restores the pre-protocol behavior", async () => {
    const fixture = leasableStore();
    const adapter = scriptedAdapter(() => ({ text: 'free' }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: fixture.store },
      defaults: { routing: { loop: 'fake:model' } },
      ownership: 'none',
    });
    const wf = defineWorkflow({ name: 'unowned' }, async (ctx) => ctx.agent('one turn'));
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('ok');
    expect(fixture.acquires).toHaveLength(0);
    expect(fixture.appendLeases.every((lease) => lease === undefined)).toBe(true);
  });

  it('a dry-run preview never acquires and works while another owner holds the run', async () => {
    const fixture = leasableStore();
    const adapter = scriptedAdapter(() => ({ text: 'first' }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: fixture.store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'preview' }, async (ctx) => {
      await ctx.agent('first');
      await ctx.awaitExternal<{ ok: boolean }>('gate', { prompt: 'continue?' });
      return 'after';
    });
    const first = await engine.run(wf, undefined, { runId: 'previewed' }).result;
    expect(first.status).toBe('suspended');
    const holder = await fixture.store.acquire('previewed', 'live-worker');
    const acquiresBefore = fixture.acquires.length;
    const appendsBefore = fixture.appendLeases.length;
    const dry = engine.resume('previewed', wf, { dryRun: true });
    const outcome = await dry.result;
    expect(outcome.status).toBe('suspended');
    await dry.preview;
    expect(fixture.acquires.length).toBe(acquiresBefore);
    expect(fixture.appendLeases.length).toBe(appendsBefore);
    await fixture.store.release(holder);
  });

  it('a suspended settle releases the lease so the next owner can take the run', async () => {
    const fixture = leasableStore();
    const adapter = scriptedAdapter(() => ({ text: 'first' }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: fixture.store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'parked' }, async (ctx) => {
      await ctx.agent('first');
      await ctx.awaitExternal<{ ok: boolean }>('gate', { prompt: 'continue?' });
      return 'after';
    });
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('suspended');
    expect(fixture.acquires).toHaveLength(1);
    expect(fixture.leases.size).toBe(0);
  });

  it('losing the lease mid-run cancels the segment instead of burning live calls', async () => {
    // ttl 30 puts the renew cadence at 10 ms.
    const fixture = leasableStore({ ttlMs: 30 });
    let openGate: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    const adapter = scriptedAdapter(() => ({ text: 'turn' }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: fixture.store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'lost' }, async (ctx) => {
      await ctx.agent('first');
      await gate;
      await ctx.agent('second');
      return 'done';
    });
    const handle = engine.run(wf, undefined);
    // Let the segment boot and do its first turn, then break renewal.
    for (let attempt = 0; attempt < 200 && adapter.calls.length < 1; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    fixture.setFailRenew(true);
    for (let attempt = 0; attempt < 200 && fixture.renewRejections() < 1; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    openGate();
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    expect(outcome.error?.message).toContain('ownership lost');
    // The second turn was never dispatched live.
    expect(adapter.calls).toHaveLength(1);
  });

  it('a leasable store exposing a malformed ttl fails typed at construction', () => {
    const fixture = leasableStore({ ttlMs: 1.5 });
    const adapter = scriptedAdapter(() => ({ text: 'x' }));
    expect(() =>
      createEngine({
        adapters: [adapter],
        stores: { journal: fixture.store },
        defaults: { routing: { loop: 'fake:model' } },
      }),
    ).toThrowError(ConfigError);
    expect(() =>
      createEngine({
        adapters: [adapter],
        stores: { journal: fixture.store },
        defaults: { routing: { loop: 'fake:model' } },
        ownership: 'none',
      }),
    ).not.toThrow();
  });
});
