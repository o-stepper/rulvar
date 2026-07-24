/**
 * PostgresStore (RV-214): JournalStore plus LeasableStore with fencing
 * epochs over node-postgres (`pg`); the production reference for
 * multi-process AND multi-host deployments, where SqliteStore's
 * one-file-per-host boundary ends.
 *
 * Contract highlights (executable definition: @rulvar/store-conformance):
 * - A1-A4: a single INSERT is atomic; per-run order is the append order
 *   (a BIGSERIAL id); payloads are opaque TEXT JSON, unknown fields pass
 *   through byte-for-byte (deliberately NOT a jsonb column: jsonb
 *   normalizes key order and duplicate keys, and A4 forbids
 *   normalization; jsonb is used only in query-side casts and
 *   expression indexes).
 * - Serialization: every run-scoped mutation (fenced or not) runs inside
 *   one transaction that first takes a per-run advisory transaction lock
 *   (`pg_advisory_xact_lock` over a hash of schema and runId). That is
 *   this store's translation of the sqlite BEGIN IMMEDIATE lesson (the
 *   fenced-run-state RFC, F3): the fence check and the guarded mutation
 *   commit as ONE serialized unit, so a takeover from another process or
 *   HOST cannot land between the check and the write. The lock is
 *   per-run, so unrelated runs never queue behind each other.
 * - Fencing: the epoch is monotonic per run for the store's lifetime; an
 *   append carrying a stale or released lease rejects with the typed
 *   LeaseHeldError and the entry never becomes visible. `fencedWrites:
 *   true` on both the journal side and the transcript twin: putMeta,
 *   delete, and blob writes accept the same optional lease under the
 *   same atomic rule, and every lease-guarded mutation additionally
 *   requires the lease's runId to BE the mutated run.
 * - A5 monotonic seq: the tail check and the insert are one conditional
 *   INSERT under the run's advisory lock, so a second writer racing the
 *   journal from a stale tail loses with a typed JournalOrderViolation.
 * - Concurrent boot: the idempotent schema bootstrap runs lazily on
 *   first use, inside a schema-scoped advisory transaction lock, so a
 *   fleet start over one fresh database serializes instead of colliding
 *   in the DDL (the sqlite boot-race lesson, translated: postgres
 *   queues on the lock and needs no busy retry).
 * - Clocks: lease expiry uses the CLIENT clock (injectable `now`),
 *   mirroring SqliteStore, so coordinating worker hosts must be
 *   NTP-synced and the lease ttl must dwarf their skew (the default
 *   60000 ms dwarfs sane NTP drift). One write region per run: this
 *   store proves single-region multi-host fencing; a multi-region
 *   protocol is out of scope until proven.
 * - Pooling and backpressure: one pg Pool per store (default max 10
 *   connections); every operation is a short transaction, so the pool
 *   IS the backpressure (excess operations queue for a client). Size it
 *   below the server's connection budget across all workers, or front
 *   the fleet with pgbouncer in session mode.
 */
import pg from 'pg';

import {
  ConfigError,
  JournalOrderViolation,
  LeaseHeldError,
  metaMatchesFilter,
  type Bytes,
  type JournalEntry,
  type LeasableStore,
  type Lease,
  type MetaLookupStore,
  type RunFilter,
  type RunMeta,
  type TranscriptStore,
} from '@rulvar/core';

/** Appendix A interim reference, shared with the sqlite store. */
export const DEFAULT_LEASE_TTL_MS = 60_000;

/** Default pg Pool size; every operation is a short transaction. */
export const DEFAULT_POOL_MAX = 10;

/** The advisory-lock hash seed; a constant namespace for this store. */
const LOCK_SEED = 8_214;

// Bound at module load, before any dev-mode bare-Date.now patch can
// install (the SqliteStore convention).
const wallClock: () => number = Date.now.bind(globalThis);

/** A conservative SQL identifier gate for the schema option. */
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface LeaseRow {
  owner: string;
  epoch: number;
  expires_at: number;
}

/**
 * The fenced transcript twin over a PostgresStore database (the fenced
 * run state RFC, F2): blobs live in the SAME database as the lease
 * rows, so a lease-carrying put or delete verifies the current holder
 * atomically with the blob mutation. Obtain it from
 * {@link PostgresStore.transcripts}; its lifetime is the owning
 * store's (one shared pool, one `close()`).
 */
export interface PostgresTranscriptStore extends TranscriptStore {
  readonly fencedWrites: true;
}

export interface PostgresStoreOptions {
  /**
   * A postgres connection string
   * (`postgres://user:password@host:port/database`). Every coordinating
   * process and host points at the same database and schema.
   */
  url: string;
  /**
   * Schema holding this store's tables; default `public`. A non-public
   * schema is created on boot (`CREATE SCHEMA IF NOT EXISTS`), which
   * also gives tests and multi-tenant hosts cheap isolation. Must be a
   * plain SQL identifier.
   */
  schema?: string;
  /** Lease ttl; default the Appendix A interim reference (60000 ms). */
  ttlMs?: number;
  /** Pool size ceiling; default 10. */
  max?: number;
  /** Injectable clock for lease-expiry tests. */
  now?: () => number;
}

export class PostgresStore implements MetaLookupStore, LeasableStore {
  /** The fenced writes promise (fenced run state RFC, phase 2). */
  readonly fencedWrites = true as const;
  private readonly pool: pg.Pool;
  private readonly schema: string;
  private readonly ttlMs: number;
  private readonly now: () => number;
  private boot: Promise<void> | undefined;
  private transcriptTwin: PostgresTranscriptStore | undefined;
  /**
   * Per-run append chains: within ONE store instance, appends execute
   * in submission order. The synchronous drivers of the other shipped
   * stores get this for free (a sync append completes before the next
   * call starts); over a genuinely async pool, the advisory lock alone
   * hands the lock out in arrival order, and a later-submitted seq
   * reaching the server first would trip the A5 tail guard on its
   * earlier sibling. Cross-instance ordering stays the guard's job.
   */
  private readonly appendChains = new Map<string, Promise<void>>();

  constructor(options: PostgresStoreOptions) {
    if (typeof options.url !== 'string' || options.url === '') {
      throw new ConfigError('PostgresStoreOptions.url must be a nonempty connection string');
    }
    const schema = options.schema ?? 'public';
    if (!IDENTIFIER.test(schema)) {
      throw new ConfigError(
        `PostgresStoreOptions.schema must be a plain SQL identifier; got '${schema}'`,
      );
    }
    const ttlMs = options.ttlMs ?? DEFAULT_LEASE_TTL_MS;
    // Refused before the pool opens: no connection, no schema, no lease
    // row ever exists under a malformed ttl (the sqlite intake rule).
    if (!Number.isInteger(ttlMs) || ttlMs < 1 || ttlMs > 2_147_483_647) {
      throw new ConfigError(
        'PostgresStoreOptions.ttlMs must be an integer between 1 and 2147483647 ms ' +
          `(workers renew on Node timers at ttl/3); got ${String(ttlMs)}`,
      );
    }
    if (options.max !== undefined && (!Number.isInteger(options.max) || options.max < 1)) {
      throw new ConfigError(
        `PostgresStoreOptions.max must be a positive integer; got ${String(options.max)}`,
      );
    }
    this.schema = schema;
    this.ttlMs = ttlMs;
    this.now = options.now ?? wallClock;
    this.pool = new pg.Pool({
      connectionString: options.url,
      max: options.max ?? DEFAULT_POOL_MAX,
    });
    // An idle pool client that loses its server (a restart, a failover)
    // emits 'error' on the pool; without a listener that is a process
    // crash. The next checkout simply opens a fresh connection.
    this.pool.on('error', () => undefined);
  }

  /** `"schema".rulvar_<name>`, always schema-qualified. */
  private table(name: string): string {
    return `"${this.schema}".rulvar_${name}`;
  }

  /**
   * The lazy idempotent bootstrap, memoized so it runs once per store;
   * a rejected boot clears the memo so the next call retries. The
   * schema-scoped advisory transaction lock serializes a fleet of
   * processes bootstrapping the same fresh database.
   */
  private booted(): Promise<void> {
    this.boot ??= this.runBootstrap().catch((thrown: unknown) => {
      this.boot = undefined;
      throw thrown;
    });
    return this.boot;
  }

  private async runBootstrap(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, $2))', [
        `rulvar-boot:${this.schema}`,
        LOCK_SEED,
      ]);
      if (this.schema !== 'public') {
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);
      }
      // Payloads are TEXT on purpose (A4: byte-for-byte passthrough);
      // jsonb appears only in query-side casts and these expression
      // indexes.
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.table('entries')} (
          id BIGSERIAL PRIMARY KEY,
          run_id TEXT NOT NULL,
          payload TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS rulvar_entries_by_run
          ON ${this.table('entries')} (run_id, id);
        CREATE INDEX IF NOT EXISTS rulvar_entries_run_seq
          ON ${this.table('entries')} (run_id, (((payload::jsonb ->> 'seq'))::numeric));
        CREATE TABLE IF NOT EXISTS ${this.table('meta')} (
          run_id TEXT PRIMARY KEY,
          payload TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS rulvar_meta_by_status
          ON ${this.table('meta')} (((payload::jsonb ->> 'status')));
        CREATE INDEX IF NOT EXISTS rulvar_meta_by_name
          ON ${this.table('meta')} (((payload::jsonb ->> 'name')));
        CREATE TABLE IF NOT EXISTS ${this.table('leases')} (
          run_id TEXT PRIMARY KEY,
          owner TEXT NOT NULL,
          epoch BIGINT NOT NULL,
          expires_at BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ${this.table('epochs')} (
          run_id TEXT PRIMARY KEY,
          epoch BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ${this.table('blobs')} (
          ref TEXT PRIMARY KEY,
          run_id TEXT NOT NULL,
          data BYTEA NOT NULL
        );
        CREATE INDEX IF NOT EXISTS rulvar_blobs_by_run
          ON ${this.table('blobs')} (run_id);
      `);
      await client.query('COMMIT');
    } catch (thrown) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw thrown;
    } finally {
      client.release();
    }
  }

  /**
   * One serialized run-scoped transaction: BEGIN, take the per-run
   * advisory transaction lock, run `fn`, COMMIT. Every mutation of a
   * run's state goes through here, which is what makes the fence check
   * and the guarded mutation one unit across processes and hosts.
   */
  private async withRunLock<T>(
    runId: string,
    fn: (client: pg.PoolClient) => Promise<T>,
  ): Promise<T> {
    await this.booted();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, $2))', [
        `${this.schema}:${runId}`,
        LOCK_SEED,
      ]);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (thrown) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw thrown;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async liveLease(client: pg.PoolClient, runId: string): Promise<LeaseRow | undefined> {
    const rows = (
      await client.query(
        `SELECT owner, epoch::int8 AS epoch, expires_at::int8 AS expires_at
           FROM ${this.table('leases')} WHERE run_id = $1`,
        [runId],
      )
    ).rows as Array<{ owner: string; epoch: string | number; expires_at: string | number }>;
    const row = rows[0];
    if (row === undefined) {
      return undefined;
    }
    const lease: LeaseRow = {
      owner: row.owner,
      epoch: Number(row.epoch),
      expires_at: Number(row.expires_at),
    };
    return lease.expires_at <= this.now() ? undefined : lease;
  }

  /**
   * A lease fences exactly the run it names (the sqlite rule): guarding
   * a mutation of a DIFFERENT run would pass the holder check while
   * touching state the lease never protected.
   */
  private requireRunMatch(lease: Lease, runId: string, mutation: string): void {
    if (lease.runId !== runId) {
      throw new LeaseHeldError(
        `lease for run '${lease.runId}' (owner ${lease.owner}, epoch ${lease.epoch}) cannot ` +
          `guard a ${mutation} of run '${runId}'; the mutation is rejected and nothing changed`,
      );
    }
  }

  private async assertFencing(client: pg.PoolClient, lease: Lease): Promise<void> {
    const live = await this.liveLease(client, lease.runId);
    if (live === undefined || live.owner !== lease.owner || live.epoch !== lease.epoch) {
      throw new LeaseHeldError(
        `stale fencing epoch for run '${lease.runId}': lease (owner ${lease.owner}, epoch ` +
          `${lease.epoch}) is not the current holder; the append or renew is rejected and ` +
          'nothing became visible',
      );
    }
  }

  /** Fence check plus guarded mutation as ONE serialized transaction. */
  private fenced(lease: Lease, mutate: (client: pg.PoolClient) => Promise<void>): Promise<void> {
    return this.withRunLock(lease.runId, async (client) => {
      await this.assertFencing(client, lease);
      await mutate(client);
    });
  }

  private async insertEntry(client: pg.PoolClient, runId: string, e: JournalEntry): Promise<void> {
    // Entries without a finite seq (legacy or exotic shapes) skip the
    // monotonicity guard, exactly like the sqlite reference.
    if (!Number.isFinite(e.seq)) {
      await client.query(`INSERT INTO ${this.table('entries')} (run_id, payload) VALUES ($1, $2)`, [
        runId,
        JSON.stringify(e),
      ]);
      return;
    }
    // Monotonic seq (obligation A5) as one conditional INSERT under the
    // run's advisory lock: the tail check and the insert commit
    // atomically even across processes and hosts.
    const inserted = await client.query(
      `INSERT INTO ${this.table('entries')} (run_id, payload)
         SELECT $1, $2 WHERE NOT EXISTS (
           SELECT 1 FROM ${this.table('entries')}
            WHERE run_id = $1 AND ((payload::jsonb ->> 'seq'))::numeric >= $3)`,
      [runId, JSON.stringify(e), e.seq],
    );
    if (inserted.rowCount === 0) {
      throw new JournalOrderViolation(
        `PostgresStore: append of seq ${e.seq} to run '${runId}' is not after the stored ` +
          'tail seq; a concurrent writer raced this journal from a stale tail',
      );
    }
  }

  /** Chains run-scoped work in submission order for this instance. */
  private chained(runId: string, work: () => Promise<void>): Promise<void> {
    const prior = this.appendChains.get(runId) ?? Promise.resolve();
    // A failed predecessor never blocks the chain: its caller got the
    // rejection; the next append decides on the actual stored tail.
    const next = prior.catch(() => undefined).then(work);
    const tail = next.then(
      () => undefined,
      () => undefined,
    );
    this.appendChains.set(runId, tail);
    void tail.then(() => {
      if (this.appendChains.get(runId) === tail) {
        this.appendChains.delete(runId);
      }
    });
    return next;
  }

  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void> {
    if (lease !== undefined) {
      this.requireRunMatch(lease, runId, 'journal append');
      return this.chained(runId, () =>
        this.fenced(lease, (client) => this.insertEntry(client, runId, e)),
      );
    }
    // Unleased appends serialize on the run lock too: the A5 tail check
    // and the insert must not interleave with a concurrent writer.
    return this.chained(runId, () =>
      this.withRunLock(runId, (client) => this.insertEntry(client, runId, e)),
    );
  }

  async load(runId: string): Promise<JournalEntry[]> {
    await this.booted();
    const rows = (
      await this.pool.query(
        `SELECT payload FROM ${this.table('entries')} WHERE run_id = $1 ORDER BY id`,
        [runId],
      )
    ).rows as Array<{ payload: string }>;
    return rows.map((row) => JSON.parse(row.payload) as JournalEntry);
  }

  private async upsertMeta(client: pg.PoolClient | pg.Pool, m: RunMeta): Promise<void> {
    await client.query(
      `INSERT INTO ${this.table('meta')} (run_id, payload) VALUES ($1, $2)
         ON CONFLICT (run_id) DO UPDATE SET payload = excluded.payload`,
      [m.runId, JSON.stringify(m)],
    );
  }

  async putMeta(m: RunMeta, lease?: Lease): Promise<void> {
    if (lease !== undefined) {
      this.requireRunMatch(lease, m.runId, 'meta write');
      await this.fenced(lease, (client) => this.upsertMeta(client, m));
      return;
    }
    await this.booted();
    await this.upsertMeta(this.pool, m);
  }

  async getMeta(runId: string): Promise<RunMeta | undefined> {
    await this.booted();
    const rows = (
      await this.pool.query(`SELECT payload FROM ${this.table('meta')} WHERE run_id = $1`, [runId])
    ).rows as Array<{ payload: string }>;
    const row = rows[0];
    return row === undefined ? undefined : (JSON.parse(row.payload) as RunMeta);
  }

  async listRuns(f?: RunFilter): Promise<RunMeta[]> {
    await this.booted();
    // status/statuses/name narrow in SQL over the JSON payload (the
    // expression indexes serve them); the tags containment check stays
    // in JS over the reduced set, and metaMatchesFilter re-applies the
    // full predicate so SQL and JS semantics stay identical (the
    // sqlite reference shape).
    const where: string[] = [];
    const params: string[] = [];
    if (f?.status !== undefined || f?.statuses !== undefined) {
      const wanted = [...(f.status === undefined ? [] : [f.status]), ...(f.statuses ?? [])];
      if (wanted.length === 0) {
        where.push('1 = 0');
      } else {
        const marks = wanted.map((_, i) => `$${params.length + i + 1}`);
        where.push(`(payload::jsonb ->> 'status') IN (${marks.join(', ')})`);
        params.push(...wanted);
      }
    }
    if (f?.name !== undefined) {
      where.push(`(payload::jsonb ->> 'name') = $${params.length + 1}`);
      params.push(f.name);
    }
    const sql =
      `SELECT payload FROM ${this.table('meta')}` +
      (where.length === 0 ? '' : ` WHERE ${where.join(' AND ')}`) +
      ' ORDER BY run_id';
    const rows = (await this.pool.query(sql, params)).rows as Array<{ payload: string }>;
    return rows
      .map((row) => JSON.parse(row.payload) as RunMeta)
      .filter((meta) => metaMatchesFilter(meta, f));
  }

  private async deleteRows(client: pg.PoolClient, runId: string): Promise<void> {
    await client.query(`DELETE FROM ${this.table('entries')} WHERE run_id = $1`, [runId]);
    await client.query(`DELETE FROM ${this.table('meta')} WHERE run_id = $1`, [runId]);
    await client.query(`DELETE FROM ${this.table('leases')} WHERE run_id = $1`, [runId]);
    await client.query(`DELETE FROM ${this.table('epochs')} WHERE run_id = $1`, [runId]);
  }

  async delete(runId: string, lease?: Lease): Promise<void> {
    // Fenced when a lease rides along (RFC F4); the blob cascade stays
    // ENGINE-side, exactly as the TranscriptStore contract says.
    if (lease !== undefined) {
      this.requireRunMatch(lease, runId, 'run deletion');
      await this.fenced(lease, (client) => this.deleteRows(client, runId));
      return;
    }
    await this.withRunLock(runId, (client) => this.deleteRows(client, runId));
  }

  /**
   * The fenced transcript twin (RFC F2): blobs live in this store's
   * database beside the lease rows, so a lease-carrying put or delete
   * verifies the current holder of the run the ref's leading path
   * segment names atomically with the blob mutation. Wire it as the
   * engine's transcript store next to this store as the journal;
   * `assertFencedWrites({ journal, transcripts })` verifies the pair.
   */
  transcripts(): PostgresTranscriptStore {
    if (this.transcriptTwin !== undefined) {
      return this.transcriptTwin;
    }
    const runOf = (ref: string): string => ref.split('/', 1)[0] ?? ref;
    const upsertBlob = async (
      client: pg.PoolClient | pg.Pool,
      ref: string,
      blob: Bytes,
    ): Promise<void> => {
      await client.query(
        `INSERT INTO ${this.table('blobs')} (ref, run_id, data) VALUES ($1, $2, $3)
           ON CONFLICT (ref) DO UPDATE SET run_id = excluded.run_id, data = excluded.data`,
        [ref, runOf(ref), Buffer.from(blob)],
      );
    };
    const deleteBlob = async (client: pg.PoolClient | pg.Pool, ref: string): Promise<void> => {
      await client.query(`DELETE FROM ${this.table('blobs')} WHERE ref = $1`, [ref]);
    };
    this.transcriptTwin = {
      fencedWrites: true,
      put: async (ref: string, blob: Bytes, lease?: Lease): Promise<void> => {
        if (lease !== undefined) {
          this.requireRunMatch(lease, runOf(ref), 'transcript write');
          await this.fenced(lease, (client) => upsertBlob(client, ref, blob));
          return;
        }
        await this.booted();
        await upsertBlob(this.pool, ref, blob);
      },
      get: async (ref: string): Promise<Bytes | null> => {
        await this.booted();
        const rows = (
          await this.pool.query(`SELECT data FROM ${this.table('blobs')} WHERE ref = $1`, [ref])
        ).rows as Array<{ data: Buffer }>;
        const row = rows[0];
        // A fresh copy per read, so callers can never alias driver state.
        return row === undefined ? null : new Uint8Array(row.data);
      },
      list: async (runId: string): Promise<string[]> => {
        await this.booted();
        const rows = (
          await this.pool.query(
            `SELECT ref FROM ${this.table('blobs')} WHERE run_id = $1 AND ref <> run_id ORDER BY ref`,
            [runId],
          )
        ).rows as Array<{ ref: string }>;
        return rows.map((row) => row.ref);
      },
      delete: async (ref: string, lease?: Lease): Promise<void> => {
        if (lease !== undefined) {
          this.requireRunMatch(lease, runOf(ref), 'transcript deletion');
          await this.fenced(lease, (client) => deleteBlob(client, ref));
          return;
        }
        await this.booted();
        await deleteBlob(this.pool, ref);
      },
    };
    return this.transcriptTwin;
  }

  /** TTL introspection (the LeasableStore optional capability). */
  get leaseTtlMs(): number {
    return this.ttlMs;
  }

  acquire(runId: string, owner: string): Promise<Lease> {
    return this.withRunLock(runId, async (client) => {
      const live = await this.liveLease(client, runId);
      if (live !== undefined) {
        throw new LeaseHeldError(
          `run '${runId}' is leased by '${live.owner}' (epoch ${live.epoch}); acquire on a ` +
            'held lease rejects',
        );
      }
      const prior = (
        await client.query(
          `SELECT epoch::int8 AS epoch FROM ${this.table('epochs')} WHERE run_id = $1`,
          [runId],
        )
      ).rows as Array<{ epoch: string | number }>;
      const epoch = Number(prior[0]?.epoch ?? 0) + 1;
      await client.query(
        `INSERT INTO ${this.table('epochs')} (run_id, epoch) VALUES ($1, $2)
           ON CONFLICT (run_id) DO UPDATE SET epoch = excluded.epoch`,
        [runId, epoch],
      );
      await client.query(
        `INSERT INTO ${this.table('leases')} (run_id, owner, epoch, expires_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (run_id) DO UPDATE SET owner = excluded.owner,
             epoch = excluded.epoch, expires_at = excluded.expires_at`,
        [runId, owner, epoch, this.now() + this.ttlMs],
      );
      return { runId, owner, epoch };
    });
  }

  renew(l: Lease): Promise<void> {
    // owner and epoch ride the WHERE too: even if a check ever drifted,
    // the mutation itself can only touch the row this lease still owns.
    return this.fenced(l, async (client) => {
      await client.query(
        `UPDATE ${this.table('leases')} SET expires_at = $1
           WHERE run_id = $2 AND owner = $3 AND epoch = $4`,
        [this.now() + this.ttlMs, l.runId, l.owner, l.epoch],
      );
    });
  }

  release(l: Lease): Promise<void> {
    return this.fenced(l, async (client) => {
      await client.query(
        `DELETE FROM ${this.table('leases')} WHERE run_id = $1 AND owner = $2 AND epoch = $3`,
        [l.runId, l.owner, l.epoch],
      );
    });
  }
}
