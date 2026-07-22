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
 *   LeaseHeldError and the entry never becomes visible. The fence check
 *   and the guarded mutation (append's insert, renew's extension,
 *   release's deletion) commit as ONE immediate transaction: checking in
 *   one autocommit statement and mutating in the next left a
 *   cross-process window where a takeover landing between them let the
 *   superseded holder append a visible entry, extend the successor's
 *   lease, or delete it outright (the fenced-run-state RFC, finding F3).
 * - Fenced writes (`fencedWrites: true`, the RFC's phase 2): putMeta
 *   and delete accept the same optional lease under the same atomic
 *   rule, and every lease-guarded mutation additionally requires the
 *   lease's runId to BE the mutated run, so a superseded worker can
 *   neither strand a run through a stale terminal meta write (F1) nor
 *   delete live run state (F4).
 * - acquire on a held, unexpired lease rejects with LeaseHeldError; the
 *   holder MUST renew at an interval of at most ttl/3; an unrenewed
 *   lease is reclaimable after ttl and reclaiming advances the epoch.
 * - The lease ttl default is the Appendix A interim reference for this
 *   store (60000 ms; the committed value is decided before M8).
 */
import { DatabaseSync } from 'node:sqlite';

import {
  ConfigError,
  JournalOrderViolation,
  LeaseHeldError,
  metaMatchesFilter,
  type JournalEntry,
  type LeasableStore,
  type Lease,
  type MetaLookupStore,
  type RunFilter,
  type RunMeta,
} from '@rulvar/core';

/** Appendix A interim reference for the sqlite store. */
export const DEFAULT_LEASE_TTL_MS = 60_000;

export interface SqliteStoreOptions {
  /** Database file path, or ':memory:' for an in-process store. */
  path: string;
  /**
   * Lease ttl; default the Appendix A interim reference (60000 ms). An
   * integer between 1 and 2147483647 ms (workers renew on Node timers at
   * ttl/3), refused as a ConfigError BEFORE the database opens: zero or
   * a negative made every lease born expired (a second owner could take
   * over immediately), NaN failed the first acquire with a raw sqlite
   * NOT NULL error, and Infinity never expired (v1.35.0 review P2-4).
   */
  ttlMs?: number;
  /** Injectable clock for lease-expiry tests. */
  now?: () => number;
}

interface LeaseRow {
  owner: string;
  epoch: number;
  expires_at: number;
}

// Bound at module load, before any dev-mode bare-Date.now patch can
// install: a store constructed after a run must not capture the patched
// wrapper and false-warn from its own frames (v1.18.0 review P2-6; the
// same convention as createEngine's real clock).
const wallClock: () => number = Date.now.bind(globalThis);

export class SqliteStore implements MetaLookupStore, LeasableStore {
  /**
   * The fenced writes promise (fenced run state RFC, phase 2): every
   * lease-carrying mutation of this store (append, putMeta, delete)
   * verifies the lease is the current holder FOR THE MUTATED RUN,
   * atomically with the mutation, and rejects stale or mismatched
   * holders with the typed LeaseHeldError leaving nothing changed.
   */
  readonly fencedWrites = true as const;
  private readonly db: DatabaseSync;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(options: SqliteStoreOptions) {
    const ttlMs = options.ttlMs ?? DEFAULT_LEASE_TTL_MS;
    // Refused before the database opens: no file, no schema, no lease
    // row ever exists under a malformed ttl (v1.35.0 review P2-4).
    if (!Number.isInteger(ttlMs) || ttlMs < 1 || ttlMs > 2_147_483_647) {
      throw new ConfigError(
        'SqliteStoreOptions.ttlMs must be an integer between 1 and 2147483647 ms ' +
          `(workers renew on Node timers at ttl/3); got ${String(ttlMs)}`,
      );
    }
    this.db = new DatabaseSync(options.path);
    this.ttlMs = ttlMs;
    this.now = options.now ?? wallClock;
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
      CREATE INDEX IF NOT EXISTS entries_run_seq
        ON entries (run_id, CAST(json_extract(payload, '$.seq') AS INTEGER));
      CREATE TABLE IF NOT EXISTS meta (
        run_id TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS meta_by_status
        ON meta (json_extract(payload, '$.status'));
      CREATE INDEX IF NOT EXISTS meta_by_name
        ON meta (json_extract(payload, '$.name'));
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

  /**
   * A lease fences exactly the run it names: guarding a mutation of a
   * DIFFERENT run with it would pass the holder check while touching
   * state the lease never protected, so the mismatch rejects typed
   * before any check runs.
   */
  private requireRunMatch(lease: Lease, runId: string, mutation: string): void {
    if (lease.runId !== runId) {
      throw new LeaseHeldError(
        `lease for run '${lease.runId}' (owner ${lease.owner}, epoch ${lease.epoch}) cannot ` +
          `guard a ${mutation} of run '${runId}'; the mutation is rejected and nothing changed`,
      );
    }
  }

  /** Rejects unless `lease` is the CURRENT live lease for its run. */
  private assertFencing(lease: Lease): void {
    const live = this.liveLease(lease.runId);
    if (live === undefined || live.owner !== lease.owner || live.epoch !== lease.epoch) {
      throw new LeaseHeldError(
        `stale fencing epoch for run '${lease.runId}': lease (owner ${lease.owner}, epoch ` +
          `${lease.epoch}) is not the current holder; the append or renew is rejected and ` +
          'nothing became visible',
      );
    }
  }

  /**
   * Runs the fence check and the guarded mutation as ONE immediate
   * transaction, the same shape acquire already uses: BEGIN IMMEDIATE
   * takes the write lock BEFORE the check reads the lease row, so a
   * competing takeover cannot land between the check and the mutation
   * (it serializes behind the commit and the loser sees the final rows).
   * As two autocommit statements, a takeover in that window let a
   * superseded holder mutate live state (fenced-run-state RFC, F3).
   */
  private fenced(lease: Lease, mutate: () => void): void {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.assertFencing(lease);
      mutate();
      this.db.exec('COMMIT');
    } catch (thrown) {
      this.db.exec('ROLLBACK');
      throw thrown;
    }
  }

  private insertEntry(runId: string, e: JournalEntry): void {
    // A single INSERT is atomic (A1); rowid order IS the append order
    // (A2); the payload is opaque JSON (A4). Entries without a finite
    // seq (legacy or exotic shapes) skip the monotonicity guard.
    if (!Number.isFinite(e.seq)) {
      this.db
        .prepare('INSERT INTO entries (run_id, payload) VALUES (?, ?)')
        .run(runId, JSON.stringify(e));
      return;
    }
    // Monotonic seq (obligation A5) as ONE conditional statement, so the
    // tail check and the insert commit atomically even across
    // connections: a stale or duplicate seq means a second writer raced
    // this journal from an outdated tail, and exactly one may persist.
    const inserted = this.db
      .prepare(
        'INSERT INTO entries (run_id, payload) SELECT ?, ? WHERE NOT EXISTS (' +
          'SELECT 1 FROM entries WHERE run_id = ? ' +
          "AND CAST(json_extract(payload, '$.seq') AS INTEGER) >= ?)",
      )
      .run(runId, JSON.stringify(e), runId, e.seq);
    if (inserted.changes === 0) {
      throw new JournalOrderViolation(
        `SqliteStore: append of seq ${e.seq} to run '${runId}' is not after the stored ` +
          'tail seq; a concurrent writer raced this journal from a stale tail',
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async append(runId: string, e: JournalEntry, lease?: Lease): Promise<void> {
    if (lease !== undefined) {
      this.requireRunMatch(lease, runId, 'journal append');
      this.fenced(lease, () => {
        this.insertEntry(runId, e);
      });
      return;
    }
    this.insertEntry(runId, e);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async load(runId: string): Promise<JournalEntry[]> {
    const rows = this.db
      .prepare('SELECT payload FROM entries WHERE run_id = ? ORDER BY id')
      .all(runId) as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as JournalEntry);
  }

  private upsertMeta(m: RunMeta): void {
    this.db
      .prepare(
        'INSERT INTO meta (run_id, payload) VALUES (?, ?) ' +
          'ON CONFLICT(run_id) DO UPDATE SET payload = excluded.payload',
      )
      .run(m.runId, JSON.stringify(m));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async putMeta(m: RunMeta, lease?: Lease): Promise<void> {
    // Fenced when a lease rides along (the fencedWrites promise): a
    // superseded segment's terminal settle can no longer overwrite the
    // successor's status or regress its segments counter and strand the
    // run from worker sweeps (fenced run state RFC, F1).
    if (lease !== undefined) {
      this.requireRunMatch(lease, m.runId, 'meta write');
      this.fenced(lease, () => {
        this.upsertMeta(m);
      });
      return;
    }
    this.upsertMeta(m);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getMeta(runId: string): Promise<RunMeta | undefined> {
    // Exact lookup on the primary key, never a decode of the whole meta table
    // (v1.25.0 scale review: point lookups were O(all runs)).
    const row = this.db.prepare('SELECT payload FROM meta WHERE run_id = ?').get(runId) as
      { payload: string } | undefined;
    return row === undefined ? undefined : (JSON.parse(row.payload) as RunMeta);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async listRuns(f?: RunFilter): Promise<RunMeta[]> {
    // status/statuses/name narrow in SQL over the JSON payload (the
    // expression indexes above serve them), so a
    // selective filter decodes only the matching rows instead of the
    // whole catalog (v1.25.0 scale review); the tags containment check
    // stays in JS over that reduced set. metaMatchesFilter re-applies
    // the full predicate, keeping SQL and JS semantics identical.
    const where: string[] = [];
    const params: string[] = [];
    if (f?.status !== undefined || f?.statuses !== undefined) {
      const wanted = [...(f.status === undefined ? [] : [f.status]), ...(f.statuses ?? [])];
      if (wanted.length === 0) {
        // statuses: [] matches nothing, in SQL as in metaMatchesFilter.
        where.push('1 = 0');
      } else {
        where.push(`json_extract(payload, '$.status') IN (${wanted.map(() => '?').join(', ')})`);
        params.push(...wanted);
      }
    }
    if (f?.name !== undefined) {
      where.push("json_extract(payload, '$.name') = ?");
      params.push(f.name);
    }
    const sql =
      'SELECT payload FROM meta' +
      (where.length === 0 ? '' : ` WHERE ${where.join(' AND ')}`) +
      ' ORDER BY run_id';
    const rows = this.db.prepare(sql).all(...params) as Array<{ payload: string }>;
    return rows
      .map((row) => JSON.parse(row.payload) as RunMeta)
      .filter((meta) => metaMatchesFilter(meta, f));
  }

  private deleteRows(runId: string): void {
    this.db.prepare('DELETE FROM entries WHERE run_id = ?').run(runId);
    this.db.prepare('DELETE FROM meta WHERE run_id = ?').run(runId);
    this.db.prepare('DELETE FROM leases WHERE run_id = ?').run(runId);
    this.db.prepare('DELETE FROM epochs WHERE run_id = ?').run(runId);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(runId: string, lease?: Lease): Promise<void> {
    // Fenced when a lease rides along (fenced run state RFC, F4): a
    // retention sweep on a superseded worker cannot delete a run a live
    // owner still drives. The holder's own lease row goes with the run.
    if (lease !== undefined) {
      this.requireRunMatch(lease, runId, 'run deletion');
      this.fenced(lease, () => {
        this.deleteRows(runId);
      });
      return;
    }
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.deleteRows(runId);
      this.db.exec('COMMIT');
    } catch (thrown) {
      this.db.exec('ROLLBACK');
      throw thrown;
    }
  }

  /**
   * TTL introspection (the LeasableStore optional capability): lets
   * createWorker verify at construction that its renew cadence matches
   * this store's expiry instead of trusting two config sources to agree.
   */
  get leaseTtlMs(): number {
    return this.ttlMs;
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
            'held lease rejects',
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
    // owner and epoch ride the WHERE too: even if a check ever drifted,
    // the mutation itself can only touch the row this lease still owns.
    this.fenced(l, () => {
      this.db
        .prepare('UPDATE leases SET expires_at = ? WHERE run_id = ? AND owner = ? AND epoch = ?')
        .run(this.now() + this.ttlMs, l.runId, l.owner, l.epoch);
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async release(l: Lease): Promise<void> {
    this.fenced(l, () => {
      this.db
        .prepare('DELETE FROM leases WHERE run_id = ? AND owner = ? AND epoch = ?')
        .run(l.runId, l.owner, l.epoch);
    });
  }
}
