/**
 * SqliteQuotaLimiter (RV-215): the cross-process reference
 * implementation of the core QuotaLimiter SPI over the builtin
 * node:sqlite driver. Engine processes sharing one database file
 * enforce ONE global quota: admission consumes window counters inside
 * a single BEGIN IMMEDIATE transaction (the fenced-run-state lesson:
 * checking in one autocommit statement and mutating in the next
 * leaves a cross-process window where two admitters both read the
 * last slot), so two processes can never both take it.
 *
 * Contract highlights:
 * - The rule model, window math, and admission decision are the
 *   core's own (`quotaRuleAdmission` over fixed epoch-aligned
 *   one-minute windows), so this limiter and `memoryQuotaLimiter`
 *   agree byte-for-byte on every verdict.
 * - Buckets key on the rule CONTENT (a canonical fixed-order JSON of
 *   the rule), not on array position: every process sharing the file
 *   must configure the same rules, and equal rules land on the same
 *   bucket regardless of order.
 * - Reservations are rows, so reconcile works from any process. A
 *   crashed process that never reconciles leaves its estimate in the
 *   window until the window ages out; the lazy prune keeps both
 *   tables bounded to two windows.
 * - Runtime contention queues briefly on the connection's
 *   busy_timeout instead of failing raw: a hot limiter is EXPECTED to
 *   serialize admissions. A still-busy call past the bound throws,
 *   and the engine's `onLimiterError` policy decides what that means.
 *
 * Docs: https://docs.rulvar.com/guide/model-routing
 */
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

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

import { BOOT_BUSY_TIMEOUT_MS } from './store.js';

/**
 * How long a runtime reserve/reconcile transaction waits for a
 * sibling process's transaction before the driver reports busy. Quota
 * admissions are short single-writer transactions; queueing here IS
 * the cross-process serialization working.
 */
export const QUOTA_BUSY_TIMEOUT_MS = 2_000;

/** The SQLITE_BUSY family; the primary code is the low byte. */
function isSqliteBusy(thrown: unknown): boolean {
  const errcode = (thrown as { errcode?: number } | undefined)?.errcode;
  return errcode !== undefined && (errcode & 0xff) === 5;
}

/** Synchronous bounded sleep for the boot retry loop. */
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Bound at module load, before any dev-mode bare-Date.now patch can
// install (the SqliteStore convention): the limiter's clock is engine
// infrastructure on the live-only dispatch path.
const wallClock: () => number = Date.now.bind(globalThis);

/**
 * The canonical bucket key of one rule: a fixed-field-order JSON of
 * its content, identical across processes for identical rules.
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

export interface SqliteQuotaLimiterOptions {
  /** Database file path shared by every coordinating process. */
  path: string;
  /** The shared rule set; must be identical across processes. */
  rules: readonly QuotaRule[];
  /** Injectable clock for window tests. */
  now?: () => number;
}

export class SqliteQuotaLimiter implements QuotaLimiter {
  private readonly db: DatabaseSync;
  private readonly rules: readonly QuotaRule[];
  private readonly now: () => number;

  constructor(options: SqliteQuotaLimiterOptions) {
    if (typeof options.path !== 'string' || options.path === '') {
      throw new ConfigError('SqliteQuotaLimiterOptions.path must be a nonempty string');
    }
    validateQuotaRules(options.rules, 'SqliteQuotaLimiterOptions.rules');
    this.rules = options.rules;
    this.now = options.now ?? wallClock;
    this.db = new DatabaseSync(options.path);
    // Boot-scoped busy handling, the SqliteStore pattern: N processes
    // constructing over the SAME fresh file at once collide on the WAL
    // switch and the DDL, and the journal-mode conversion skips the
    // busy handler on some lock transitions, so the whole (idempotent)
    // bootstrap retries as a unit under a wall-clock bound.
    const schema = `
      PRAGMA busy_timeout = ${String(QUOTA_BUSY_TIMEOUT_MS)};
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS quota_buckets (
        rule_key TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        requests INTEGER NOT NULL,
        tokens INTEGER NOT NULL,
        PRIMARY KEY (rule_key, window_start)
      );
      CREATE TABLE IF NOT EXISTS quota_reservations (
        id TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        estimate_tokens INTEGER NOT NULL,
        rule_keys TEXT NOT NULL
      );
    `;
    const bootDeadline = wallClock() + BOOT_BUSY_TIMEOUT_MS;
    for (;;) {
      try {
        this.db.exec(schema);
        break;
      } catch (thrown) {
        if (!isSqliteBusy(thrown) || wallClock() > bootDeadline) {
          throw thrown;
        }
        sleepSync(25);
      }
    }
  }

  reserve(request: QuotaReservationRequest): Promise<QuotaDecision> {
    const at = this.now();
    const windowStart = at - (at % QUOTA_WINDOW_MS);
    const estimateTokens = quotaEstimateTokens(request);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.prune(windowStart);
      const read = this.db.prepare(
        'SELECT requests, tokens FROM quota_buckets WHERE rule_key = ? AND window_start = ?',
      );
      const matched: string[] = [];
      let denial: { retryAfterMs: number; reason: string } | undefined;
      for (const rule of this.rules) {
        if (!quotaRuleMatches(rule, request)) {
          continue;
        }
        const key = ruleKey(rule);
        matched.push(key);
        const row = read.get(key, windowStart) as { requests: number; tokens: number } | undefined;
        const verdict = quotaRuleAdmission(
          rule,
          row ?? { requests: 0, tokens: 0 },
          { requests: request.estimate.requests, tokens: estimateTokens },
          windowStart + QUOTA_WINDOW_MS - at,
        );
        if (!verdict.admit) {
          denial = mergeQuotaDenial(denial, verdict);
        }
      }
      if (denial !== undefined) {
        // The prune still commits; no counter moved.
        this.db.exec('COMMIT');
        return Promise.resolve({ granted: false, ...denial });
      }
      const consume = this.db.prepare(
        'INSERT INTO quota_buckets (rule_key, window_start, requests, tokens) ' +
          'VALUES (?, ?, ?, ?) ' +
          'ON CONFLICT (rule_key, window_start) DO UPDATE SET ' +
          'requests = requests + excluded.requests, tokens = tokens + excluded.tokens',
      );
      for (const key of matched) {
        consume.run(key, windowStart, request.estimate.requests, estimateTokens);
      }
      const reservationId = randomUUID();
      this.db
        .prepare(
          'INSERT INTO quota_reservations (id, window_start, estimate_tokens, rule_keys) ' +
            'VALUES (?, ?, ?, ?)',
        )
        .run(reservationId, windowStart, estimateTokens, JSON.stringify(matched));
      this.db.exec('COMMIT');
      return Promise.resolve({ granted: true, reservationId });
    } catch (thrown) {
      this.rollbackQuietly();
      throw thrown;
    }
  }

  reconcile(reservationId: string, usage: Usage): Promise<void> {
    const at = this.now();
    const windowStart = at - (at % QUOTA_WINDOW_MS);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db
        .prepare(
          'SELECT window_start, estimate_tokens, rule_keys FROM quota_reservations WHERE id = ?',
        )
        .get(reservationId) as
        { window_start: number; estimate_tokens: number; rule_keys: string } | undefined;
      if (row === undefined) {
        // Unknown or already-reconciled: idempotent no-op by contract.
        this.db.exec('COMMIT');
        return Promise.resolve();
      }
      this.db.prepare('DELETE FROM quota_reservations WHERE id = ?').run(reservationId);
      if (row.window_start === windowStart) {
        const delta = quotaActualTokens(usage) - row.estimate_tokens;
        const adjust = this.db.prepare(
          'UPDATE quota_buckets SET tokens = MAX(0, tokens + ?) ' +
            'WHERE rule_key = ? AND window_start = ?',
        );
        for (const key of JSON.parse(row.rule_keys) as string[]) {
          adjust.run(delta, key, windowStart);
        }
      }
      // A rolled-over window aged the estimate out with it.
      this.db.exec('COMMIT');
      return Promise.resolve();
    } catch (thrown) {
      this.rollbackQuietly();
      throw thrown;
    }
  }

  /** Current-window counters per rule, for telemetry and referees. */
  snapshot(): Array<{ rule: QuotaRule; windowStart: number; requests: number; tokens: number }> {
    const at = this.now();
    const windowStart = at - (at % QUOTA_WINDOW_MS);
    const read = this.db.prepare(
      'SELECT requests, tokens FROM quota_buckets WHERE rule_key = ? AND window_start = ?',
    );
    return this.rules.map((rule) => {
      const row = read.get(ruleKey(rule), windowStart) as
        { requests: number; tokens: number } | undefined;
      return {
        rule,
        windowStart,
        requests: row?.requests ?? 0,
        tokens: row?.tokens ?? 0,
      };
    });
  }

  close(): void {
    this.db.close();
  }

  /** Both tables stay bounded to the current and previous window. */
  private prune(windowStart: number): void {
    const cutoff = windowStart - QUOTA_WINDOW_MS;
    this.db.prepare('DELETE FROM quota_buckets WHERE window_start < ?').run(cutoff);
    this.db.prepare('DELETE FROM quota_reservations WHERE window_start < ?').run(cutoff);
  }

  private rollbackQuietly(): void {
    try {
      this.db.exec('ROLLBACK');
    } catch {
      // The transaction never opened or the connection is gone; the
      // original error is the one worth surfacing.
    }
  }
}
