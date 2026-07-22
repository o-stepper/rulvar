/**
 * SqliteStore conformance (M5-T02 acceptance): the FULL
 * @rulvar/store-conformance suites (A1-A4, meta separation, golden fold
 * fixture, decide-once oracle, abandon skip; lease exclusivity, fencing
 * epochs, release fencing, ttl expiry and renew cadence) plus
 * cross-instance concurrency over one database file.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ConfigError, LeaseHeldError, type JournalEntry, type Lease } from '@rulvar/core';
import {
  journalStoreConformance,
  leasableStoreConformance,
  registerConformance,
} from '@rulvar/store-conformance';

import { SqliteStore } from './store.js';

function memoryStore(): SqliteStore {
  return new SqliteStore({ path: ':memory:' });
}

registerConformance(
  journalStoreConformance(() => memoryStore()),
  { describe, it },
);

registerConformance(
  leasableStoreConformance(() => new SqliteStore({ path: ':memory:', ttlMs: 150 }), {
    ttlMs: 150,
  }),
  { describe, it },
);

function entry(seq: number): JournalEntry {
  return {
    hashVersion: 2,
    seq,
    scope: '',
    key: `k-${seq}`,
    ordinal: 0,
    kind: 'step',
    status: 'ok',
    value: { seq },
    spanId: 's',
    startedAt: new Date(1_700_000_000_000 + seq).toISOString(),
  };
}

describe('lease ttl intake (v1.35.0 review P2-4)', () => {
  it.each([[0], [-1], [Number.NaN], [Number.POSITIVE_INFINITY], [1.5], [2_147_483_648]])(
    'refuses ttlMs %s before the database opens',
    (ttlMs) => {
      // Zero and negatives made every lease born expired (an immediate
      // takeover by a second owner), NaN failed the first acquire with a raw
      // sqlite NOT NULL error, Infinity never expired.
      expect(() => new SqliteStore({ path: ':memory:', ttlMs })).toThrow(ConfigError);
      expect(() => new SqliteStore({ path: ':memory:', ttlMs })).toThrow(
        /ttlMs must be an integer between 1 and 2147483647 ms/,
      );
    },
  );

  it('a valid ttl still leases, still fences, and exposes leaseTtlMs', async () => {
    const store = new SqliteStore({ path: ':memory:', ttlMs: 1000 });
    expect(store.leaseTtlMs).toBe(1000);
    const lease = await store.acquire('run-ttl', 'owner-a');
    expect(lease.epoch).toBe(1);
    await expect(store.acquire('run-ttl', 'owner-b')).rejects.toThrow(LeaseHeldError);
  });
});

describe('SqliteStore cross-instance concurrency (one database file)', () => {
  it('fences a stale writer from another store instance', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-sqlite-'));
    const path = join(dir, 'journal.db');
    let clock = 1_000_000;
    const now = () => clock;
    const a = new SqliteStore({ path, ttlMs: 100, now });
    const b = new SqliteStore({ path, ttlMs: 100, now });

    const leaseA = await a.acquire('RUN', 'worker-a');
    await a.append('RUN', entry(0), leaseA);
    // The competing worker cannot acquire while the lease is live.
    await expect(b.acquire('RUN', 'worker-b')).rejects.toThrow(LeaseHeldError);

    // The lease expires unrenewed; the successor reclaims with a higher
    // epoch, and the old holder's appends are rejected and invisible.
    clock += 150;
    const leaseB = await b.acquire('RUN', 'worker-b');
    expect(leaseB.epoch).toBeGreaterThan(leaseA.epoch);
    await b.append('RUN', entry(1), leaseB);
    await expect(a.append('RUN', entry(2), leaseA)).rejects.toThrow(LeaseHeldError);

    const loadedByA = await a.load('RUN');
    const loadedByB = await b.load('RUN');
    expect(loadedByA.map((e) => e.seq)).toEqual([0, 1]);
    expect(loadedByB.map((e) => e.seq)).toEqual([0, 1]);
    a.close();
    b.close();
  });

  it('keeps per-run append order stable across instances and reads (A2)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-sqlite-'));
    const path = join(dir, 'journal.db');
    const a = new SqliteStore({ path });
    const b = new SqliteStore({ path });
    for (let i = 0; i < 20; i += 1) {
      await (i % 2 === 0 ? a : b).append('ORDER', entry(i));
    }
    const first = await a.load('ORDER');
    const second = await b.load('ORDER');
    expect(first.map((e) => e.seq)).toEqual([...Array(20).keys()]);
    expect(second.map((e) => e.seq)).toEqual(first.map((e) => e.seq));
    a.close();
    b.close();
  });

  // The fence check and its guarded mutation must commit as ONE
  // immediate transaction (fenced-run-state RFC, finding F3). The shim
  // shadows the instance's private assertFencing so that right after the
  // real check passes, a competing takeover is ATTEMPTED from a second
  // connection; with the transaction in place the takeover cannot land
  // mid-call (the write lock is already held, so its BEGIN IMMEDIATE
  // throws SQLITE_BUSY), and once it lands after the call, every stale
  // operation rejects. As two autocommit statements (the pre-fix shape),
  // the takeover landed inside the window and the stale mutation won.
  function armInterleave(victim: SqliteStore, takeover: () => void): void {
    const target = victim as unknown as { assertFencing: (l: Lease) => void };
    const original = target.assertFencing.bind(victim);
    let armed = true;
    target.assertFencing = (lease) => {
      original(lease);
      if (armed) {
        armed = false;
        takeover();
      }
    };
  }

  function fencedPair(): { a: SqliteStore; b: SqliteStore; clock: { t: number } } {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-sqlite-'));
    const path = join(dir, 'journal.db');
    const clock = { t: 1_000_000 };
    const now = () => clock.t;
    return {
      a: new SqliteStore({ path, ttlMs: 100, now }),
      b: new SqliteStore({ path, ttlMs: 100, now }),
      clock,
    };
  }

  it('a takeover cannot land between an append fence check and its insert', async () => {
    const { a, b, clock } = fencedPair();
    const leaseA = await a.acquire('RUN', 'worker-a');
    await a.append('RUN', entry(0), leaseA);
    let leaseB: Lease | undefined;
    let blockedMidCall = false;
    armInterleave(a, () => {
      clock.t += 150; // worker-a's lease expires unrenewed
      b.acquire('RUN', 'worker-b').then(
        (lease) => {
          leaseB = lease;
        },
        () => {
          blockedMidCall = true;
        },
      );
    });
    // The check saw a live lease inside the same transaction, so this
    // append legitimately serializes BEFORE the takeover.
    await a.append('RUN', entry(1), leaseA);
    await new Promise((resolve) => setImmediate(resolve));
    expect(blockedMidCall).toBe(true);
    expect(leaseB).toBeUndefined();
    // After the call the reclaim lands, and the old holder is fenced.
    const reclaimed = await b.acquire('RUN', 'worker-b');
    expect(reclaimed.epoch).toBeGreaterThan(leaseA.epoch);
    await b.append('RUN', entry(2), reclaimed);
    await expect(a.append('RUN', entry(3), leaseA)).rejects.toThrow(LeaseHeldError);
    expect((await a.load('RUN')).map((e) => e.seq)).toEqual([0, 1, 2]);
    a.close();
    b.close();
  });

  it('a stale release cannot delete the lease a successor holds', async () => {
    const { a, b, clock } = fencedPair();
    const leaseA = await a.acquire('RUN', 'worker-a');
    let blockedMidCall = false;
    armInterleave(a, () => {
      clock.t += 150;
      b.acquire('RUN', 'worker-b').then(undefined, () => {
        blockedMidCall = true;
      });
    });
    // Serializes before the takeover: a legitimate release of a lease
    // that was live at check time, atomically with that check.
    await a.release(leaseA);
    await new Promise((resolve) => setImmediate(resolve));
    expect(blockedMidCall).toBe(true);
    const reclaimed = await b.acquire('RUN', 'worker-b');
    // The successor's lease survives the old holder's stale release, so
    // no third owner can slip in while it is unexpired.
    await expect(a.release(leaseA)).rejects.toThrow(LeaseHeldError);
    await expect(a.acquire('RUN', 'worker-c')).rejects.toThrow(LeaseHeldError);
    await b.append('RUN', entry(0), reclaimed);
    expect((await b.load('RUN')).map((e) => e.seq)).toEqual([0]);
    a.close();
    b.close();
  });

  it('a stale renew cannot extend the lease a successor holds', async () => {
    const { a, b, clock } = fencedPair();
    const leaseA = await a.acquire('RUN', 'worker-a');
    clock.t += 150; // expired unrenewed
    const reclaimed = await b.acquire('RUN', 'worker-b'); // expires at +250
    await expect(a.renew(leaseA)).rejects.toThrow(LeaseHeldError);
    // The stale renew touched nothing: the successor expires on ITS
    // schedule, neither extended by the stale holder's clock nor
    // shortened, and reclaim works exactly at that boundary.
    clock.t += 90; // +240: still held
    await expect(a.acquire('RUN', 'worker-c')).rejects.toThrow(LeaseHeldError);
    clock.t += 20; // +260: past the successor's genuine expiry
    const third = await a.acquire('RUN', 'worker-c');
    expect(third.epoch).toBeGreaterThan(reclaimed.epoch);
    a.close();
    b.close();
  });

  it('preserves unknown fields byte-for-byte through store and load (A4)', async () => {
    const store = memoryStore();
    const exotic = {
      ...entry(0),
      kind: 'future-kind',
      novelField: { nested: [1, 'two', null] },
    } as unknown as JournalEntry;
    await store.append('RUN', exotic);
    const [loaded] = await store.load('RUN');
    expect(loaded).toEqual(exotic);
    store.close();
  });
});

describe('exact meta lookup and filters computed in SQL (v1.25.0 scale review)', () => {
  const meta = (runId: string, status: string, over?: Record<string, unknown>) =>
    ({ runId, status, updatedAt: '2026-07-20T00:00:00.000Z', ...over }) as never;

  it('getMeta hits by primary key and resolves undefined on a miss', async () => {
    const store = memoryStore();
    await store.putMeta(meta('a', 'ok', { genesis: 'gen-a' }));
    await store.putMeta(meta('b', 'suspended'));
    expect((await store.getMeta('a'))?.genesis).toBe('gen-a');
    expect((await store.getMeta('b'))?.status).toBe('suspended');
    expect(await store.getMeta('missing')).toBeUndefined();
    store.close();
  });

  it('status, statuses, and name narrow in SQL with the shared filter semantics', async () => {
    const store = memoryStore();
    await store.putMeta(meta('a', 'ok', { name: 'wf-a', tags: ['team:core'] }));
    await store.putMeta(meta('b', 'suspended', { name: 'wf-b' }));
    await store.putMeta(meta('c', 'running', { name: 'wf-a' }));
    await store.putMeta(meta('d', 'error'));
    const ids = async (f?: never) => (await store.listRuns(f)).map((m) => m.runId);
    expect(await ids({ status: 'suspended' } as never)).toEqual(['b']);
    expect(await ids({ statuses: ['running', 'suspended'] } as never)).toEqual(['b', 'c']);
    // status and statuses combine as either-matches.
    expect(await ids({ status: 'error', statuses: ['running'] } as never)).toEqual(['c', 'd']);
    // An empty statuses list matches nothing, in SQL as in JS.
    expect(await ids({ statuses: [] } as never)).toEqual([]);
    expect(await ids({ name: 'wf-a' } as never)).toEqual(['a', 'c']);
    expect(await ids({ name: 'wf-a', statuses: ['ok'] } as never)).toEqual(['a']);
    // tags stay a JS containment check over the SQL-reduced set.
    expect(await ids({ statuses: ['ok'], tags: ['team:core'] } as never)).toEqual(['a']);
    expect(await ids({ statuses: ['ok'], tags: ['team:web'] } as never)).toEqual([]);
    store.close();
  });
});
