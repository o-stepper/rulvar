/**
 * SqliteStore conformance (M5-T02 acceptance): the FULL
 * @lurker/store-conformance suites (A1-A4, meta separation, golden fold
 * fixture, decide-once oracle, abandon skip; lease exclusivity, fencing
 * epochs, release fencing, ttl expiry and renew cadence) plus
 * cross-instance concurrency over one database file.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { LeaseHeldError, type JournalEntry } from '@lurker/core';
import {
  journalStoreConformance,
  leasableStoreConformance,
  registerConformance,
} from '@lurker/store-conformance';

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

describe('SqliteStore cross-instance concurrency (one database file)', () => {
  it('fences a stale writer from another store instance', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lurker-sqlite-'));
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
    const dir = mkdtempSync(join(tmpdir(), 'lurker-sqlite-'));
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
