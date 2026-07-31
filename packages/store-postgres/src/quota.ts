/**
 * PostgresQuotaLimiter (RV410): the multi-host reference
 * implementation of the core QuotaLimiter SPI over node-postgres.
 * Engine processes on ANY number of hosts pointing instances at one
 * database and schema enforce ONE global quota: admission consumes the
 * window counters inside a single transaction that first takes a
 * schema-wide advisory transaction lock (the PostgresStore translation
 * of the sqlite BEGIN IMMEDIATE lesson: checking in one statement and
 * mutating in the next leaves a window where two admitters both read
 * the last slot), so two hosts can never both take it.
 *
 * Contract highlights:
 * - The rule model, window math, and admission decision are the
 *   core's own (`quotaRuleAdmission` over fixed epoch-aligned
 *   one-minute windows), so this limiter, `memoryQuotaLimiter`, and
 *   `SqliteQuotaLimiter` agree byte-for-byte on every verdict.
 * - Buckets key on the rule CONTENT (a canonical fixed-order JSON of
 *   the rule), not on array position: every process sharing the
 *   database must configure the same rules, and equal rules land on
 *   the same bucket regardless of order.
 * - Reservations are rows, so reconcile works from any host. A
 *   crashed process that never reconciles leaves its estimate in the
 *   window until the window ages out; the lazy prune keeps both
 *   tables bounded to two windows.
 * - Runtime contention queues on the advisory lock instead of failing
 *   raw: a hot limiter is EXPECTED to serialize admissions. A call
 *   still waiting past `QUOTA_LOCK_TIMEOUT_MS` throws (postgres
 *   cancels the statement under `SET LOCAL lock_timeout`), and the
 *   engine's `onLimiterError` policy decides what that means. The lock
 *   serializes `reserve` AND `reconcile`, so its arrival rate is
 *   admission attempts PLUS grants, not attempts alone.
 * - The lock bound is one STAGE; the whole admission path (bootstrap,
 *   pool checkout, transaction) is bounded by `admissionDeadlineMs`
 *   (default `QUOTA_ADMISSION_DEADLINE_MS`, RV506). Expiry throws a
 *   typed `QuotaDeadlineError` into the same `onLimiterError` surface
 *   and destroys the held connection instead of returning it dirty.
 * - Boot records the sha256 fingerprint of the canonical rule set in
 *   `rulvar_quota_meta` under the boot lock; a host with a drifted
 *   rule set is refused typed with both hashes instead of silently
 *   splitting the budget across mismatched bucket keys. Rotation is
 *   the explicit `acceptRulesUpdate` opt-in (RV506).
 * - The durable admission QUEUE stays the host's: a denial carries the
 *   honest window remainder, and what to do while waiting (park the
 *   run, spill to another provider, surface backpressure) is host
 *   policy, exactly as documented for the other references.
 *
 * Docs: https://docs.rulvar.com/guide/model-routing
 */
import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';

import {
  ConfigError,
  MAX_TIMER_DELAY_MS,
  QUOTA_WINDOW_MS,
  mergeQuotaDenial,
  quotaActualRequestsDelta,
  quotaActualTokens,
  quotaEstimateTokens,
  quotaRuleAdmission,
  quotaRuleKey,
  quotaRuleMatches,
  snapshotQuotaRules,
  type QuotaDecision,
  type QuotaLimiter,
  type QuotaReservationRequest,
  type QuotaRule,
  type Usage,
} from '@rulvar/core';

import { DEFAULT_POOL_MAX, IDENTIFIER, LOCK_SEED } from './store.js';

/**
 * How long a reserve/reconcile transaction waits for the schema-wide
 * admission lock before postgres cancels the statement. Quota
 * admissions are short single-writer transactions; queueing here IS
 * the cross-host serialization working.
 */
export const QUOTA_LOCK_TIMEOUT_MS = 2_000;

/**
 * The default bound on one WHOLE admission path (RV506): lazy
 * bootstrap, pool checkout, and the admission transaction together.
 * `QUOTA_LOCK_TIMEOUT_MS` bounds only the lock-wait stage inside the
 * transaction; before RV506 a call could spend that bound once at
 * checkout and again at the lock and still not be refused. Overridable
 * per limiter through `admissionDeadlineMs`.
 */
export const QUOTA_ADMISSION_DEADLINE_MS = 5_000;

/**
 * Thrown when one quota admission (reserve or reconcile) misses the
 * full-path deadline. It surfaces exactly where the lock timeout
 * surfaces, as a limiter error consumed by the engine's
 * `onLimiterError` policy: `'deny'` (the default) turns it into a
 * retryable transport-class denial, so nothing dispatches unpoliced.
 * The connection the refused call held is destroyed, never returned
 * dirty to the pool; a transaction cut mid-flight is rolled back by
 * the server. Like any client-side timeout, expiry exactly at the
 * commit boundary can leave a committed reservation behind; it ages
 * out with its window unreconciled, the same bounded residue a
 * crashed process leaves.
 */
export class QuotaDeadlineError extends Error {
  /** The deadline that expired, in milliseconds. */
  readonly deadlineMs: number;
  /** The schema whose admission missed it. */
  readonly schema: string;
  /**
   * Where the path stood: inside the schema bootstrap transaction,
   * waiting for a pooled connection, or mid-admission-transaction. The
   * message narrates only what actually happened to a connection in
   * that phase (RV608): a refusal while WAITING held nothing, so it
   * destroyed nothing.
   */
  readonly phase: 'bootstrap' | 'acquire' | 'transaction';

  constructor(deadlineMs: number, schema: string, phase: 'bootstrap' | 'acquire' | 'transaction') {
    super(
      `PostgresQuotaLimiter admission over schema "${schema}" missed its ${String(deadlineMs)}ms deadline ` +
        (phase === 'bootstrap'
          ? 'during schema bootstrap; the bootstrap transaction was abandoned and its connection ' +
            'destroyed, so nothing it staged (DDL, fingerprint, generation) was committed'
          : phase === 'acquire'
            ? 'while waiting for a pooled connection; the admission was abandoned before it held one'
            : 'inside the admission transaction; the admission was abandoned and its connection destroyed'),
    );
    this.name = 'QuotaDeadlineError';
    this.deadlineMs = deadlineMs;
    this.schema = schema;
    this.phase = phase;
  }
}

/**
 * Thrown by an admission whose booted rule identity no longer matches
 * the schema's (RV608): another deployment rotated the recorded rules
 * fingerprint and generation after this host booted, so admitting under
 * the retired rules would silently split the budget across mismatched
 * bucket keys. The refused host must restart with the current rule set;
 * its outstanding reservations age out with their window (the same
 * bounded residue a crashed process leaves), and the rotation carried
 * current-window consumption conservatively. Like every limiter throw,
 * it lands in the engine's `onLimiterError` policy.
 */
export class QuotaGenerationError extends Error {
  /** The schema whose recorded identity moved. */
  readonly schema: string;
  /** What this instance booted with. */
  readonly booted: { fingerprint: string; generation: number };
  /** What the schema records now (absent fields mean a wiped meta row). */
  readonly recorded: { fingerprint: string | undefined; generation: number | undefined };

  constructor(
    schema: string,
    booted: { fingerprint: string; generation: number },
    recorded: { fingerprint: string | undefined; generation: number | undefined },
  ) {
    super(
      `PostgresQuotaLimiter admission over schema "${schema}" was fenced: the schema now records ` +
        `rules fingerprint ${recorded.fingerprint ?? '(none)'} at generation ` +
        `${String(recorded.generation ?? '(none)')}, this instance booted fingerprint ` +
        `${booted.fingerprint} at generation ${String(booted.generation)}. The rules rotated after ` +
        'this host booted; restart it with the current rule set. Its outstanding reservations age ' +
        'out with their window, and the rotation carried current-window consumption conservatively.',
    );
    this.name = 'QuotaGenerationError';
    this.schema = schema;
    this.booted = booted;
    this.recorded = recorded;
  }
}

// Bound at module load, before any dev-mode bare-Date.now patch can
// install (the PostgresStore convention): the limiter's clock is
// engine infrastructure on the live-only dispatch path.
const wallClock: () => number = Date.now.bind(globalThis);

/**
 * The canonical fingerprint of one rule SET (RV506): sha256 hex over
 * the sorted canonical rule keys (the core's `quotaRuleKey`, the same
 * encoding both store references bucket on). Order-insensitive on
 * purpose, matching bucket semantics (equal rules land on the same
 * bucket regardless of array position), so reordering a config never
 * reads as a rules change. Exported so a deployment can precompute the
 * value it expects a schema to have recorded.
 */
export function quotaRulesFingerprint(rules: readonly QuotaRule[]): string {
  const keys = rules.map(quotaRuleKey).sort();
  return createHash('sha256').update(JSON.stringify(keys)).digest('hex');
}

/** The dimension triple of one canonical rule key, the identity the
 * rotation carry maps consumption across cap changes by. */
function dimensionTriple(key: string): string {
  const parsed = JSON.parse(key) as { provider: unknown; model: unknown; tenant: unknown };
  return JSON.stringify({
    provider: parsed.provider ?? null,
    model: parsed.model ?? null,
    tenant: parsed.tenant ?? null,
  });
}

export interface PostgresQuotaLimiterOptions {
  /**
   * A postgres connection string shared by every coordinating process
   * and host (the database may also hold a PostgresStore; the tables
   * do not collide).
   */
  url: string;
  /**
   * Schema holding the two quota tables; default `public`. A
   * non-public schema is created on boot. Must be a plain SQL
   * identifier.
   */
  schema?: string;
  /**
   * The shared rule set; must be identical across hosts. Enforced: the
   * schema records `quotaRulesFingerprint(rules)` on first boot, and an
   * instance whose fingerprint differs is refused with a typed
   * `ConfigError` naming both hashes.
   */
  rules: readonly QuotaRule[];
  /** Pool size ceiling; default 10. Admissions are short transactions. */
  max?: number;
  /**
   * Bound on one whole admission path (bootstrap, pool checkout, and
   * the admission transaction together); default
   * `QUOTA_ADMISSION_DEADLINE_MS` (5000). Must be an integer strictly
   * greater than `QUOTA_LOCK_TIMEOUT_MS`, which bounds only the
   * lock-wait stage inside it. Expiry throws `QuotaDeadlineError` into
   * the engine's `onLimiterError` policy and destroys the connection
   * the refused call held.
   */
  admissionDeadlineMs?: number;
  /**
   * Rules rotation opt-in: rewrite the schema's recorded rules
   * fingerprint with this instance's own at boot instead of refusing on
   * a mismatch. Procedure: enable on the NEW deployment, roll every
   * host to the new rule set, then remove the flag so drift is refused
   * again. Default false.
   */
  acceptRulesUpdate?: boolean;
  /** Injectable clock for window tests. */
  now?: () => number;
}

/**
 * The multi-host reference implementation of the core QuotaLimiter
 * SPI: engine processes pointing instances at ONE database and schema
 * (a PostgresStore's database or their own) enforce one global
 * provider quota. Admission consumes the window counters inside a
 * single transaction serialized on a schema-wide advisory transaction
 * lock, so two processes or HOSTS can never both take the last slot;
 * reservations are rows, so `reconcile` settles a grant from any host;
 * both tables are lazily pruned to the current and previous accounting
 * window. The rule model, the fixed epoch-aligned one-minute windows,
 * and the admission decision are the core's own exported functions, so
 * this limiter, `memoryQuotaLimiter`, and `SqliteQuotaLimiter` agree
 * on every verdict. The `rules` MUST be identical across coordinating
 * processes (buckets key on rule content), and since RV506 that is
 * enforced: boot records `quotaRulesFingerprint(rules)` in the
 * schema's `rulvar_quota_meta` row and refuses a drifted instance with
 * a typed `ConfigError` naming both hashes (`acceptRulesUpdate: true`
 * rotates the record). Runtime contention queues on the advisory lock
 * (a hot limiter is EXPECTED to serialize; note the lock serializes
 * `reserve` AND `reconcile`, so it sees admission attempts plus
 * grants); a call still waiting past `QUOTA_LOCK_TIMEOUT_MS` throws,
 * and the whole admission path (bootstrap, checkout, transaction) is
 * bounded by `admissionDeadlineMs`, whose expiry throws a typed
 * `QuotaDeadlineError` and destroys the held connection. Both throws
 * land in the engine's `onLimiterError` policy, which decides what
 * they mean. Call `close()` when done.
 */
export class PostgresQuotaLimiter implements QuotaLimiter {
  private readonly pool: pg.Pool;
  private readonly schema: string;
  private readonly rules: readonly QuotaRule[];
  /** Matching order for the denial fold: canonical rule-key order
   * (RV608), so permuted identical sets produce byte-identical
   * refusals. Telemetry keeps the declared order. */
  private readonly ordered: ReadonlyArray<{ rule: QuotaRule; key: string }>;
  /** Computed ONCE from the immutable snapshot at construction (RV608):
   * what boot records and every admission re-verifies. */
  private readonly fingerprint: string;
  /** The schema generation this instance booted at; admissions re-read
   * the schema's and are fenced typed on a mismatch (RV608). */
  private generation = 0;
  private readonly admissionDeadlineMs: number;
  private readonly acceptRulesUpdate: boolean;
  private readonly now: () => number;
  private boot: Promise<void> | undefined;
  /** The bootstrap transaction's connection while one is in flight, so
   * a deadline can destroy it instead of letting an abandoned bootstrap
   * commit DDL or a rotation late (RV608). */
  private bootClient: pg.PoolClient | undefined;

  constructor(options: PostgresQuotaLimiterOptions) {
    if (typeof options.url !== 'string' || options.url === '') {
      throw new ConfigError('PostgresQuotaLimiterOptions.url must be a nonempty connection string');
    }
    const schema = options.schema ?? 'public';
    if (!IDENTIFIER.test(schema)) {
      throw new ConfigError(
        `PostgresQuotaLimiterOptions.schema must be a plain SQL identifier; got '${schema}'`,
      );
    }
    if (options.max !== undefined && (!Number.isInteger(options.max) || options.max < 1)) {
      throw new ConfigError(
        `PostgresQuotaLimiterOptions.max must be a positive integer; got ${String(options.max)}`,
      );
    }
    if (
      options.admissionDeadlineMs !== undefined &&
      (!Number.isInteger(options.admissionDeadlineMs) ||
        options.admissionDeadlineMs <= QUOTA_LOCK_TIMEOUT_MS ||
        options.admissionDeadlineMs > MAX_TIMER_DELAY_MS)
    ) {
      throw new ConfigError(
        'PostgresQuotaLimiterOptions.admissionDeadlineMs must be an integer greater than ' +
          `QUOTA_LOCK_TIMEOUT_MS (${String(QUOTA_LOCK_TIMEOUT_MS)}), the lock-wait stage it bounds, ` +
          `and at most ${String(MAX_TIMER_DELAY_MS)} (the Node timer maximum, above which a timer ` +
          `fires after about a millisecond); got ${String(options.admissionDeadlineMs)}`,
      );
    }
    if (options.acceptRulesUpdate !== undefined && typeof options.acceptRulesUpdate !== 'boolean') {
      throw new ConfigError(
        'PostgresQuotaLimiterOptions.acceptRulesUpdate must be a boolean when given (it authorizes ' +
          `rewriting the schema's recorded rule identity, so truthiness is not enough); got ` +
          `${JSON.stringify(options.acceptRulesUpdate)}`,
      );
    }
    this.schema = schema;
    // The immutable snapshot (RV608): decisions, bucket keys, the
    // recorded fingerprint, and telemetry read ONLY this copy, so
    // caller mutation after the constructor can never move a cap, a
    // bucket, or the identity boot records.
    this.rules = snapshotQuotaRules(options.rules, 'PostgresQuotaLimiterOptions.rules');
    this.ordered = this.rules
      .map((rule) => ({ rule, key: quotaRuleKey(rule) }))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    this.fingerprint = quotaRulesFingerprint(this.rules);
    this.admissionDeadlineMs = options.admissionDeadlineMs ?? QUOTA_ADMISSION_DEADLINE_MS;
    this.acceptRulesUpdate = options.acceptRulesUpdate ?? false;
    this.now = options.now ?? wallClock;
    this.pool = new pg.Pool({
      connectionString: options.url,
      max: options.max ?? DEFAULT_POOL_MAX,
      // The checkout stage can never outlive the full-path deadline;
      // this also bounds the bootstrap client's connect.
      connectionTimeoutMillis: this.admissionDeadlineMs,
    });
    // An idle pool client that loses its server emits 'error' on the
    // pool; without a listener that is a process crash. The next
    // checkout simply opens a fresh connection.
    this.pool.on('error', () => undefined);
  }

  /** `"schema".rulvar_<name>`, always schema-qualified. */
  private table(name: string): string {
    return `"${this.schema}".rulvar_${name}`;
  }

  /**
   * The lazy idempotent bootstrap, memoized so it runs once per
   * limiter; a rejected boot clears the memo so the next call retries.
   * The schema-scoped advisory transaction lock serializes a fleet of
   * processes bootstrapping the same fresh database (the PostgresStore
   * pattern: postgres queues on the lock and needs no busy retry).
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
    // Registered so a full-path deadline can destroy an in-flight
    // bootstrap instead of letting it commit DDL or a rotation AFTER
    // the caller was already refused (RV608). A concurrent caller's
    // timer may destroy a bootstrap it did not start; that only aborts
    // one idempotent transaction, which the next call retries.
    this.bootClient = client;
    let destroyed = false;
    try {
      await client.query('BEGIN');
      // The boot lock wait is bounded exactly like the admission lock
      // wait (RV608): an unbounded wait here used to outlive every
      // full-path deadline and then commit late.
      await client.query(`SET LOCAL lock_timeout = '${String(QUOTA_LOCK_TIMEOUT_MS)}ms'`);
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, $2))', [
        `rulvar-quota-boot:${this.schema}`,
        LOCK_SEED,
      ]);
      if (this.schema !== 'public') {
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);
      }
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.table('quota_buckets')} (
          rule_key TEXT NOT NULL,
          window_start BIGINT NOT NULL,
          requests BIGINT NOT NULL,
          tokens BIGINT NOT NULL,
          PRIMARY KEY (rule_key, window_start)
        );
        CREATE TABLE IF NOT EXISTS ${this.table('quota_reservations')} (
          id TEXT PRIMARY KEY,
          window_start BIGINT NOT NULL,
          estimate_tokens BIGINT NOT NULL,
          rule_keys TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ${this.table('quota_meta')} (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);
      // The identity check rides the SAME boot lock and transaction:
      // two hosts booting a fresh schema with different rules serialize
      // here, one records its set, the other is refused. A pre-RV506
      // instance knows nothing of the meta table and skips the check;
      // only instances that participate are bound by it.
      const meta = new Map(
        (
          (
            await client.query(
              `SELECT key, value FROM ${this.table('quota_meta')}
                 WHERE key IN ('rules_fingerprint', 'rules_generation')`,
            )
          ).rows as Array<{ key: string; value: string }>
        ).map((row) => [row.key, row.value]),
      );
      const recorded = meta.get('rules_fingerprint');
      const recordedGeneration = meta.get('rules_generation');
      const writeIdentity = async (generation: number): Promise<void> => {
        await client.query(
          `INSERT INTO ${this.table('quota_meta')} (key, value)
             VALUES ('rules_fingerprint', $1), ('rules_generation', $2)
           ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
          [this.fingerprint, String(generation)],
        );
      };
      if (recorded === undefined) {
        // Fresh schema: record this set at generation 1.
        this.generation = 1;
        await writeIdentity(this.generation);
      } else if (recorded === this.fingerprint) {
        // Same rules: adopt the schema's generation (backfilling 1 on a
        // pre-generation schema, idempotently).
        this.generation = recordedGeneration === undefined ? 1 : Number(recordedGeneration);
        if (recordedGeneration === undefined) {
          await writeIdentity(this.generation);
        }
      } else if (this.acceptRulesUpdate) {
        // ROTATION (RV608): serialized against every in-flight
        // admission on the SAME advisory lock admissions take, so the
        // counter handover cannot interleave with a grant.
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, $2))', [
          `${this.schema}:rulvar-quota`,
          LOCK_SEED,
        ]);
        const at = this.now();
        const windowStart = at - (at % QUOTA_WINDOW_MS);
        // Conservative carry: a new bucket inherits the current
        // window's consumption from the retired bucket(s) with the SAME
        // dimension triple (provider, model, tenant), taking the
        // maximum, so a raised cap grants the difference and a lowered
        // cap denies immediately, never a fresh full window on top of
        // consumption that already happened. A genuinely NEW dimension
        // starts empty.
        const oldBuckets = (
          await client.query(
            `SELECT rule_key, requests::int8 AS requests, tokens::int8 AS tokens
               FROM ${this.table('quota_buckets')} WHERE window_start = $1`,
            [windowStart],
          )
        ).rows as Array<{ rule_key: string; requests: string | number; tokens: string | number }>;
        const byTriple = new Map<string, { requests: number; tokens: number }>();
        for (const row of oldBuckets) {
          const triple = dimensionTriple(row.rule_key);
          const prior = byTriple.get(triple) ?? { requests: 0, tokens: 0 };
          byTriple.set(triple, {
            requests: Math.max(prior.requests, Number(row.requests)),
            tokens: Math.max(prior.tokens, Number(row.tokens)),
          });
        }
        for (const { rule, key } of this.ordered) {
          const carried = byTriple.get(
            JSON.stringify({
              provider: rule.provider ?? null,
              model: rule.model ?? null,
              tenant: rule.tenant ?? null,
            }),
          );
          if (carried === undefined || (carried.requests === 0 && carried.tokens === 0)) {
            continue;
          }
          await client.query(
            `INSERT INTO ${this.table('quota_buckets')} AS b
               (rule_key, window_start, requests, tokens) VALUES ($1, $2, $3, $4)
             ON CONFLICT (rule_key, window_start) DO UPDATE SET
               requests = GREATEST(b.requests, excluded.requests),
               tokens = GREATEST(b.tokens, excluded.tokens)`,
            [key, windowStart, carried.requests, carried.tokens],
          );
        }
        this.generation = (recordedGeneration === undefined ? 1 : Number(recordedGeneration)) + 1;
        await writeIdentity(this.generation);
      } else {
        throw new ConfigError(
          `PostgresQuotaLimiter rules mismatch over schema "${this.schema}": the schema records ` +
            `rules fingerprint ${recorded}, this instance computes ${this.fingerprint}. Every ` +
            'coordinating process must configure the identical rule set (buckets key on rule ' +
            'content, so a drifted host would silently split the budget). To rotate the rules, ' +
            'boot the new deployment with acceptRulesUpdate: true, then remove the flag.',
          { data: { schema: this.schema, recorded, computed: this.fingerprint } },
        );
      }
      await client.query('COMMIT');
    } catch (thrown) {
      destroyed = this.bootClient === undefined;
      if (!destroyed) {
        await client.query('ROLLBACK').catch(() => undefined);
      }
      throw thrown;
    } finally {
      // A deadline that fired mid-bootstrap already destroyed the
      // connection through release(err); releasing again would
      // double-release.
      if (this.bootClient !== undefined) {
        this.bootClient = undefined;
        if (!destroyed) {
          client.release();
        }
      }
    }
  }

  /**
   * One serialized admission transaction: BEGIN, bound the lock wait,
   * take the schema-wide quota advisory lock, run `fn`, COMMIT. Every
   * counter mutation goes through here, which is what makes the
   * verdict read and the consume one unit across processes and hosts.
   *
   * The WHOLE path (lazy bootstrap, pool checkout, transaction) races
   * `admissionDeadlineMs` (RV506): `lock_timeout` bounds one stage, and
   * before the deadline a call could spend that bound at checkout and
   * again at the lock without ever being refused. On expiry the caller
   * gets a typed `QuotaDeadlineError`, and a connection the refused
   * call holds is destroyed through `release(err)`, never returned
   * mid-transaction to the pool; destroying it also cancels the
   * abandoned wait server-side. The deadline runs on the REAL clock
   * (an injected test `now` freezes window math, not infrastructure
   * timeouts).
   */
  private async withQuotaLock<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    let client: pg.PoolClient | undefined;
    let expired = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refusal = (): QuotaDeadlineError =>
      new QuotaDeadlineError(
        this.admissionDeadlineMs,
        this.schema,
        client !== undefined
          ? 'transaction'
          : this.bootClient !== undefined
            ? 'bootstrap'
            : 'acquire',
      );

    const work = (async (): Promise<T> => {
      await this.booted();
      if (expired) {
        throw refusal();
      }
      const checkout = await this.pool.connect();
      if (expired) {
        // The caller was already refused; the connection is still
        // clean (no transaction began), so it goes back to the pool.
        checkout.release();
        throw refusal();
      }
      client = checkout;
      try {
        await client.query('BEGIN');
        // SET does not take bind parameters; the interpolated value is
        // a module constant, never input.
        await client.query(`SET LOCAL lock_timeout = '${String(QUOTA_LOCK_TIMEOUT_MS)}ms'`);
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, $2))', [
          `${this.schema}:rulvar-quota`,
          LOCK_SEED,
        ]);
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (thrown) {
        if (!expired) {
          await client.query('ROLLBACK').catch(() => undefined);
        }
        throw thrown;
      } finally {
        // On expiry the deadline handler already destroyed the
        // connection; releasing it here again would double-release.
        if (!expired) {
          client.release();
        }
        client = undefined;
      }
    })();

    const gate = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const reason = refusal();
        expired = true;
        // Destroy a held connection instead of returning it dirty:
        // release(err) removes it from the pool and ends it, which
        // also rejects whatever query the abandoned work was awaiting.
        // The bootstrap's connection is covered the same way (RV608):
        // an abandoned bootstrap must never commit DDL or a rotation
        // AFTER the caller was refused. Destroying it aborts the whole
        // (idempotent) bootstrap transaction server-side.
        client?.release(reason);
        client = undefined;
        this.bootClient?.release(reason);
        this.bootClient = undefined;
        reject(reason);
      }, this.admissionDeadlineMs);
    });

    try {
      // Promise.race subscribes to both, so the loser's eventual
      // settlement (the abandoned work rejecting after a destroyed
      // connection) is always observed, never an unhandled rejection.
      return await Promise.race([work, gate]);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * The generation fence (RV608), run INSIDE every admission
   * transaction after the lock is taken: the schema's recorded rule
   * identity is re-read and compared to what this instance booted, so a
   * host whose rules were rotated away admits NOTHING under retired
   * bucket keys. The refusal is typed, and the boot memo is cleared so
   * the host's next call re-boots into the honest boot-time refusal
   * naming both fingerprints.
   */
  private async assertCurrentIdentity(client: pg.PoolClient): Promise<void> {
    const meta = new Map(
      (
        (
          await client.query(
            `SELECT key, value FROM ${this.table('quota_meta')}
               WHERE key IN ('rules_fingerprint', 'rules_generation')`,
          )
        ).rows as Array<{ key: string; value: string }>
      ).map((row) => [row.key, row.value]),
    );
    const fingerprint = meta.get('rules_fingerprint');
    const generationRaw = meta.get('rules_generation');
    const generation = generationRaw === undefined ? undefined : Number(generationRaw);
    if (fingerprint !== this.fingerprint || generation !== this.generation) {
      this.boot = undefined;
      throw new QuotaGenerationError(
        this.schema,
        { fingerprint: this.fingerprint, generation: this.generation },
        { fingerprint, generation },
      );
    }
  }

  reserve(request: QuotaReservationRequest): Promise<QuotaDecision> {
    const at = this.now();
    const windowStart = at - (at % QUOTA_WINDOW_MS);
    const estimateTokens = quotaEstimateTokens(request);
    return this.withQuotaLock(async (client) => {
      await this.assertCurrentIdentity(client);
      await this.prune(client, windowStart);
      const matched: string[] = [];
      let denial: { retryAfterMs: number; reason: string } | undefined;
      for (const { rule, key } of this.ordered) {
        if (!quotaRuleMatches(rule, request)) {
          continue;
        }
        matched.push(key);
        const rows = (
          await client.query(
            `SELECT requests::int8 AS requests, tokens::int8 AS tokens
               FROM ${this.table('quota_buckets')} WHERE rule_key = $1 AND window_start = $2`,
            [key, windowStart],
          )
        ).rows as Array<{ requests: string | number; tokens: string | number }>;
        const row = rows[0];
        const verdict = quotaRuleAdmission(
          rule,
          row === undefined
            ? { requests: 0, tokens: 0 }
            : { requests: Number(row.requests), tokens: Number(row.tokens) },
          { requests: request.estimate.requests, tokens: estimateTokens },
          windowStart + QUOTA_WINDOW_MS - at,
        );
        if (!verdict.admit) {
          denial = mergeQuotaDenial(denial, verdict);
        }
      }
      if (denial !== undefined) {
        // The transaction still commits; the prune landed, no counter
        // moved.
        return { granted: false, ...denial };
      }
      for (const key of matched) {
        await client.query(
          `INSERT INTO ${this.table('quota_buckets')} AS b
             (rule_key, window_start, requests, tokens) VALUES ($1, $2, $3, $4)
           ON CONFLICT (rule_key, window_start) DO UPDATE SET
             requests = b.requests + excluded.requests, tokens = b.tokens + excluded.tokens`,
          [key, windowStart, request.estimate.requests, estimateTokens],
        );
      }
      const reservationId = randomUUID();
      await client.query(
        `INSERT INTO ${this.table('quota_reservations')}
           (id, window_start, estimate_tokens, rule_keys) VALUES ($1, $2, $3, $4)`,
        [reservationId, windowStart, estimateTokens, JSON.stringify(matched)],
      );
      return { granted: true, reservationId };
    });
  }

  reconcile(reservationId: string, usage: Usage, actual?: { requests?: number }): Promise<void> {
    const at = this.now();
    const windowStart = at - (at % QUOTA_WINDOW_MS);
    return this.withQuotaLock(async (client) => {
      await this.assertCurrentIdentity(client);
      const rows = (
        await client.query(
          `SELECT window_start::int8 AS window_start, estimate_tokens::int8 AS estimate_tokens,
                  rule_keys
             FROM ${this.table('quota_reservations')} WHERE id = $1`,
          [reservationId],
        )
      ).rows as Array<{
        window_start: string | number;
        estimate_tokens: string | number;
        rule_keys: string;
      }>;
      const row = rows[0];
      if (row === undefined) {
        // Unknown or already-reconciled: idempotent no-op by contract.
        return;
      }
      await client.query(`DELETE FROM ${this.table('quota_reservations')} WHERE id = $1`, [
        reservationId,
      ]);
      if (Number(row.window_start) === windowStart) {
        const delta = quotaActualTokens(usage) - Number(row.estimate_tokens);
        // The reservation admitted one request; absorbed provider-side
        // continuations settle the difference into the same window
        // (RV905), shared arithmetic with every reference limiter.
        const requestsDelta = quotaActualRequestsDelta(actual);
        for (const key of JSON.parse(row.rule_keys) as string[]) {
          await client.query(
            `UPDATE ${this.table('quota_buckets')}
                SET tokens = GREATEST(0, tokens + $1), requests = requests + $2
               WHERE rule_key = $3 AND window_start = $4`,
            [delta, requestsDelta, key, windowStart],
          );
        }
      }
      // A rolled-over window aged the estimate out with it.
    });
  }

  /** Current-window counters per rule, for telemetry and referees. */
  async snapshot(): Promise<
    Array<{ rule: QuotaRule; windowStart: number; requests: number; tokens: number }>
  > {
    await this.booted();
    const at = this.now();
    const windowStart = at - (at % QUOTA_WINDOW_MS);
    const out: Array<{ rule: QuotaRule; windowStart: number; requests: number; tokens: number }> =
      [];
    for (const rule of this.rules) {
      const rows = (
        await this.pool.query(
          `SELECT requests::int8 AS requests, tokens::int8 AS tokens
             FROM ${this.table('quota_buckets')} WHERE rule_key = $1 AND window_start = $2`,
          [quotaRuleKey(rule), windowStart],
        )
      ).rows as Array<{ requests: string | number; tokens: string | number }>;
      const row = rows[0];
      out.push({
        rule,
        windowStart,
        requests: row === undefined ? 0 : Number(row.requests),
        tokens: row === undefined ? 0 : Number(row.tokens),
      });
    }
    return out;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  /** Both tables stay bounded to the current and previous window. */
  private async prune(client: pg.PoolClient, windowStart: number): Promise<void> {
    const cutoff = windowStart - QUOTA_WINDOW_MS;
    await client.query(`DELETE FROM ${this.table('quota_buckets')} WHERE window_start < $1`, [
      cutoff,
    ]);
    await client.query(`DELETE FROM ${this.table('quota_reservations')} WHERE window_start < $1`, [
      cutoff,
    ]);
  }
}
