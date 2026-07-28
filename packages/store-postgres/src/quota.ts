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
  QUOTA_WINDOW_MS,
  mergeQuotaDenial,
  quotaActualTokens,
  quotaEstimateTokens,
  quotaRuleAdmission,
  quotaRuleMatches,
  validateQuotaRules,
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
  /** Where the path stood: acquiring a connection, or mid-transaction. */
  readonly phase: 'acquire' | 'transaction';

  constructor(deadlineMs: number, schema: string, phase: 'acquire' | 'transaction') {
    super(
      `PostgresQuotaLimiter admission over schema "${schema}" missed its ${String(deadlineMs)}ms deadline ` +
        (phase === 'acquire'
          ? 'while waiting for bootstrap or a pooled connection'
          : 'inside the admission transaction') +
        '; the in-flight admission was abandoned and its connection destroyed',
    );
    this.name = 'QuotaDeadlineError';
    this.deadlineMs = deadlineMs;
    this.schema = schema;
    this.phase = phase;
  }
}

// Bound at module load, before any dev-mode bare-Date.now patch can
// install (the PostgresStore convention): the limiter's clock is
// engine infrastructure on the live-only dispatch path.
const wallClock: () => number = Date.now.bind(globalThis);

/**
 * The canonical bucket key of one rule: a fixed-field-order JSON of
 * its content, identical across hosts for identical rules (and
 * identical to the SqliteQuotaLimiter encoding).
 */
function ruleKey(rule: QuotaRule): string {
  return JSON.stringify({
    provider: rule.provider ?? null,
    model: rule.model ?? null,
    tenant: rule.tenant ?? null,
    requestsPerMinute: rule.requestsPerMinute ?? null,
    tokensPerMinute: rule.tokensPerMinute ?? null,
  });
}

/**
 * The canonical fingerprint of one rule SET (RV506): sha256 hex over
 * the sorted canonical rule keys. Order-insensitive on purpose,
 * matching bucket semantics (equal rules land on the same bucket
 * regardless of array position), so reordering a config never reads as
 * a rules change. Exported so a deployment can precompute the value it
 * expects a schema to have recorded.
 */
export function quotaRulesFingerprint(rules: readonly QuotaRule[]): string {
  const keys = rules.map(ruleKey).sort();
  return createHash('sha256').update(JSON.stringify(keys)).digest('hex');
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
  private readonly admissionDeadlineMs: number;
  private readonly acceptRulesUpdate: boolean;
  private readonly now: () => number;
  private boot: Promise<void> | undefined;

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
    validateQuotaRules(options.rules, 'PostgresQuotaLimiterOptions.rules');
    if (options.max !== undefined && (!Number.isInteger(options.max) || options.max < 1)) {
      throw new ConfigError(
        `PostgresQuotaLimiterOptions.max must be a positive integer; got ${String(options.max)}`,
      );
    }
    if (
      options.admissionDeadlineMs !== undefined &&
      (!Number.isInteger(options.admissionDeadlineMs) ||
        options.admissionDeadlineMs <= QUOTA_LOCK_TIMEOUT_MS)
    ) {
      throw new ConfigError(
        'PostgresQuotaLimiterOptions.admissionDeadlineMs must be an integer greater than ' +
          `QUOTA_LOCK_TIMEOUT_MS (${String(QUOTA_LOCK_TIMEOUT_MS)}), the lock-wait stage it bounds; ` +
          `got ${String(options.admissionDeadlineMs)}`,
      );
    }
    this.schema = schema;
    this.rules = options.rules;
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
    const fingerprint = quotaRulesFingerprint(this.rules);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
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
      // The fingerprint check rides the SAME boot lock and transaction:
      // two hosts booting a fresh schema with different rules serialize
      // here, one records its set, the other is refused. A pre-RV506
      // instance knows nothing of the meta table and skips the check;
      // only instances that participate are bound by it.
      const recorded = (
        (
          await client.query(
            `SELECT value FROM ${this.table('quota_meta')} WHERE key = 'rules_fingerprint'`,
          )
        ).rows as Array<{ value: string }>
      )[0]?.value;
      if (recorded === undefined || this.acceptRulesUpdate) {
        await client.query(
          `INSERT INTO ${this.table('quota_meta')} (key, value) VALUES ('rules_fingerprint', $1)
           ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
          [fingerprint],
        );
      } else if (recorded !== fingerprint) {
        throw new ConfigError(
          `PostgresQuotaLimiter rules mismatch over schema "${this.schema}": the schema records ` +
            `rules fingerprint ${recorded}, this instance computes ${fingerprint}. Every ` +
            'coordinating process must configure the identical rule set (buckets key on rule ' +
            'content, so a drifted host would silently split the budget). To rotate the rules, ' +
            'boot the new deployment with acceptRulesUpdate: true, then remove the flag.',
          { data: { schema: this.schema, recorded, computed: fingerprint } },
        );
      }
      await client.query('COMMIT');
    } catch (thrown) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw thrown;
    } finally {
      client.release();
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
        client === undefined ? 'acquire' : 'transaction',
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
        client?.release(reason);
        client = undefined;
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

  reserve(request: QuotaReservationRequest): Promise<QuotaDecision> {
    const at = this.now();
    const windowStart = at - (at % QUOTA_WINDOW_MS);
    const estimateTokens = quotaEstimateTokens(request);
    return this.withQuotaLock(async (client) => {
      await this.prune(client, windowStart);
      const matched: string[] = [];
      let denial: { retryAfterMs: number; reason: string } | undefined;
      for (const rule of this.rules) {
        if (!quotaRuleMatches(rule, request)) {
          continue;
        }
        const key = ruleKey(rule);
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

  reconcile(reservationId: string, usage: Usage): Promise<void> {
    const at = this.now();
    const windowStart = at - (at % QUOTA_WINDOW_MS);
    return this.withQuotaLock(async (client) => {
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
        for (const key of JSON.parse(row.rule_keys) as string[]) {
          await client.query(
            `UPDATE ${this.table('quota_buckets')} SET tokens = GREATEST(0, tokens + $1)
               WHERE rule_key = $2 AND window_start = $3`,
            [delta, key, windowStart],
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
          [ruleKey(rule), windowStart],
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
