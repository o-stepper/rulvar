/**
 * SqliteStore (M5-T02): JournalStore plus LeasableStore with fencing
 * epochs over the builtin node:sqlite driver; the reference
 * implementation for community stores (see
 * https://docs.rulvar.com/guide/stores). Zero native dependencies by
 * design.
 *
 * Contract highlights (executable definition: @rulvar/store-conformance):
 * - A1-A4: single-statement inserts are atomic; per-run order is the
 *   append order (rowid); payloads are opaque JSON, unknown fields pass
 *   through untouched.
 * - Fencing: the epoch is monotonic per run for the store's lifetime;
 *   an append carrying a stale or released lease rejects with the typed
 *   LeaseHeldError and the entry never becomes visible.
 * - acquire on a held, unexpired lease rejects with LeaseHeldError; the
 *   holder MUST renew at an interval of at most ttl/3; an unrenewed
 *   lease is reclaimable after ttl and reclaiming advances the epoch.
 * - The lease ttl default is the Appendix A interim reference for this
 *   store (60000 ms; the committed value is decided before M8).
 */
import { DatabaseSync } from 'node:sqlite';

import {
  LeaseHeldError,
  type JournalEntry,
  type JournalStore,
  type LeasableStore,
  type Lease,
  type RunFilter,
  type RunMeta,
} from '@rulvar/core';

/** Appendix A interim reference for the sqlite store. */
export const DEFAULT_LEASE_TTL_MS = 60_000;

export interface SqliteStoreOptions {
  /** Database file path, or ':memory:' for an in-process store. */
  path: string;
  /** Lease ttl; default the Appendix A interim reference (60000 ms). */
  ttlMs?: number;
  /** Injectable clock for lease-expiry tests. */
  now?: () => number;
}

interface LeaseRow {
  owner: string;
  epoch: number;
  expires_at: number;
}

export class SqliteStore implements JournalStore, LeasableStore {
  private readonly db: DatabaseSync;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(options: SqliteStoreOptions) {
    this.db = new DatabaseSync(options.path);
    this.ttlMs = options.ttlMs ?? DEFAULT_LEASE_TTL_MS;
    this.now = options.now ?? Date.now;
    // WAL keeps concurrent readers consistent with the single writer on
    // file-backed databases; a no-op for ':memory:'.
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS entries_by_run ON entries (run_id, id);
      CREATE TABLE IF NOT EXISTS meta (
        run_id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS leases (
        run_id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        epoch INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS epochs (
        run_id TEXT PRIMARY KEY,
        epoch INTEGER NOT NULL
      );
    `);
  }

  close(): void {
    this.db.close();
  }

  private liveLease(runId: string): LeaseRow | undefined {
    const row = this.db
      .prepare('SELECT owner, epoch, expires_at FROM leases WHERE run_id = ?')
      .get(runId) as LeaseRow | undefined;
    if (row === undefined || row.expires_at <= this.now()) {
      return undefined;
    }
    return row;
  }

  /** Rejects unless `lease` is the CURRENT live lease for its run. */
  private assertFencing(lease: Lease): void {
    const live = this.liveLease(lease.runId);
    if (live === undefined || live.owner !== lease.owner || live.epoch !== lease.epoch) {
      throw new LeaseHeldError(
        `stale fencing epoch for run '${lease.runId}': lease (owner ${lease.owner}, epoch ` +
          `${lease.epoch}) is not the current holder; the append or renew is rejected and ` +
          'nothing became visible (docs/03, section 12.3)',
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async append(runId: string, e: JournalEntry, lease?: Lease): Promise<void> {
    if (lease !== undefined) {
      this.assertFencing(lease);
    }
    // A single INSERT is atomic (A1); rowid order IS the append order
    // (A2); the payload is opaque JSON (A4).
    this.db
      .prepare('INSERT INTO entries (run_id, payload) VALUES (?, ?)')
      .run(runId, JSON.stringify(e));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async load(runId: string): Promise<JournalEntry[]> {
    const rows = this.db
      .prepare('SELECT payload FROM entries WHERE run_id = ? ORDER BY id')
      .all(runId) as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as JournalEntry);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async putMeta(m: RunMeta): Promise<void> {
    this.db
      .prepare(
        'INSERT INTO meta (run_id, payload) VALUES (?, ?) ' +
          'ON CONFLICT(run_id) DO UPDATE SET payload = excluded.payload',
      )
      .run(m.runId, JSON.stringify(m));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async listRuns(f?: RunFilter): Promise<RunMeta[]> {
    const rows = this.db.prepare('SELECT payload FROM meta ORDER BY run_id').all() as Array<{
      payload: string;
    }>;
    const metas = rows.map((row) => JSON.parse(row.payload) as RunMeta);
    return metas.filter((meta) => {
      if (f?.status !== undefined && meta.status !== f.status) {
        return false;
      }
      if (f?.name !== undefined && meta.name !== f.name) {
        return false;
      }
      if (f?.tags !== undefined && !f.tags.every((tag) => meta.tags?.includes(tag) === true)) {
        return false;
      }
      return true;
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(runId: string): Promise<void> {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('DELETE FROM entries WHERE run_id = ?').run(runId);
      this.db.prepare('DELETE FROM meta WHERE run_id = ?').run(runId);
      this.db.prepare('DELETE FROM leases WHERE run_id = ?').run(runId);
      this.db.prepare('DELETE FROM epochs WHERE run_id = ?').run(runId);
      this.db.exec('COMMIT');
    } catch (thrown) {
      this.db.exec('ROLLBACK');
      throw thrown;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async acquire(runId: string, owner: string): Promise<Lease> {
    // BEGIN IMMEDIATE serializes competing acquirers on file-backed
    // databases: the check and the epoch bump commit atomically.
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const live = this.liveLease(runId);
      if (live !== undefined) {
        throw new LeaseHeldError(
          `run '${runId}' is leased by '${live.owner}' (epoch ${live.epoch}); acquire on a ` +
            'held lease rejects (docs/03, section 12.3)',
        );
      }
      const prior = this.db.prepare('SELECT epoch FROM epochs WHERE run_id = ?').get(runId) as
        { epoch: number } | undefined;
      const epoch = (prior?.epoch ?? 0) + 1;
      this.db
        .prepare(
          'INSERT INTO epochs (run_id, epoch) VALUES (?, ?) ' +
            'ON CONFLICT(run_id) DO UPDATE SET epoch = excluded.epoch',
        )
        .run(runId, epoch);
      this.db
        .prepare(
          'INSERT INTO leases (run_id, owner, epoch, expires_at) VALUES (?, ?, ?, ?) ' +
            'ON CONFLICT(run_id) DO UPDATE SET owner = excluded.owner, ' +
            'epoch = excluded.epoch, expires_at = excluded.expires_at',
        )
        .run(runId, owner, epoch, this.now() + this.ttlMs);
      this.db.exec('COMMIT');
      return { runId, owner, epoch };
    } catch (thrown) {
      this.db.exec('ROLLBACK');
      throw thrown;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async renew(l: Lease): Promise<void> {
    this.assertFencing(l);
    this.db
      .prepare('UPDATE leases SET expires_at = ? WHERE run_id = ?')
      .run(this.now() + this.ttlMs, l.runId);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async release(l: Lease): Promise<void> {
    this.assertFencing(l);
    this.db.prepare('DELETE FROM leases WHERE run_id = ?').run(l.runId);
  }
}
