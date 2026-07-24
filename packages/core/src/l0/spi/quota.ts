/**
 * QuotaLimiter SPI (RV-215): the extension seam for SHARED provider
 * rate/quota limiting across engine instances and OS processes. The
 * engine consults the configured limiter before EVERY live wire
 * dispatch (initial attempts, transport retries, and failover
 * takeovers alike, in every invocation phase) and reconciles each
 * granted reservation with the attempt's actual usage after the
 * outcome settles.
 *
 * Contract highlights implementations MUST honor:
 *
 * - reserve() is the admission point: a grant consumes capacity at
 *   admission time and returns a reservation id; a denial consumes
 *   nothing. The engine converts a denial into a synthetic
 *   rate-limit-class WireError that the retry and failover machinery
 *   treats exactly like a provider 429, except that no wire call was
 *   paid: `retryAfterMs` drives the interruptible backoff verbatim,
 *   attempts stay bounded by RetryPolicy, and exhaustion fails over
 *   to the next model in the chain (which reserves under its own
 *   dimensions).
 * - reconcile() settles a reservation against the attempt's actual
 *   usage. It MUST be idempotent and tolerate unknown or expired
 *   reservation ids as no-ops: a crashed process may never reconcile,
 *   and windowed implementations age such reservations out.
 * - Implementations own their clock and storage. The engine never
 *   journals limiter interactions: like transport retries, quota
 *   admission is live-only by construction, so replay and resume of
 *   memoized work never touch the limiter.
 * - Reference implementations: `memoryQuotaLimiter` (in-process, this
 *   package) and `SqliteQuotaLimiter` (cross-process over one
 *   database file, @rulvar/store-sqlite). A Redis- or Postgres-backed
 *   limiter implements this same interface; a provider-side gateway
 *   that enforces quotas behind the adapter is the alternative
 *   deployment that needs no limiter at all.
 *
 * Docs: https://docs.rulvar.com/guide/model-routing
 */
import type { Usage } from '../messages.js';

/**
 * The pre-dispatch estimate a reservation is admitted under. Token
 * estimates are heuristic (the engine uses its deterministic
 * four-characters-per-token prompt estimate plus the request's output
 * cap when one is set); reconcile() settles the difference against
 * actual usage inside the same accounting window.
 */
export interface QuotaEstimate {
  /** Wire calls this reservation admits; the engine always sends 1. */
  requests: number;
  /** Heuristic prompt estimate for the attempt. */
  inputTokens: number;
  /** The request's output token cap, when one is set. */
  maxOutputTokens?: number;
}

/** One admission request, dimensioned for tenant/model/provider rules. */
export interface QuotaReservationRequest {
  /**
   * The adapter id (the left segment of ModelRef), matching the keys
   * of `concurrency.perProvider`.
   */
  provider: string;
  /** The serving model, re-reserved per failover target. */
  model: string;
  /** The engine's configured tenant; absent when the host set none. */
  tenant?: string;
  /** The run paying for the attempt; observability only. */
  runId?: string;
  estimate: QuotaEstimate;
}

/**
 * The admission verdict. `retryAfterMs` on a denial is the
 * provider-shaped hint the retry engine honors verbatim: the time
 * until the limiter expects capacity (0 = retry immediately, e.g. a
 * request whose estimate can never fit its cap, so exhaustion and
 * failover happen without waiting; absent = the caller's backoff
 * policy applies).
 */
export type QuotaDecision =
  | { granted: true; reservationId: string }
  | { granted: false; retryAfterMs?: number; reason?: string };

/** The shared rate/quota limiter seam; see the module contract above. */
export interface QuotaLimiter {
  reserve(request: QuotaReservationRequest): Promise<QuotaDecision>;
  reconcile(reservationId: string, usage: Usage): Promise<void>;
}
