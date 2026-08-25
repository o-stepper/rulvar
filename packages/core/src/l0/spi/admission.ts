/**
 * The durable admission SPI (plan 45, rfcs/admission.md): the
 * scheduler and queue seam that answers "when may this work START,
 * and in what order relative to competing tenants". Deliberately
 * SPLIT from QuotaLimiter (the hot-path wire counter, live only, no
 * ordering): fairness is an ordering property over waiting work, a
 * counter has no queue, and the two seams degrade independently. A
 * granted ticket never exempts a wire from quota; the engine keeps
 * consulting the limiter per wire, unchanged.
 *
 * Contract highlights implementations MUST honor:
 * - `enqueue` is a conditional create under the caller-minted
 *   `(unitId, generation)` identity: enqueueing the same unit twice
 *   returns the SAME ticket, so a caller that crashed after enqueue
 *   recovers its ticket by its own identity instead of minting an
 *   orphan grant plus a duplicate queue entry.
 * - Every lifecycle call carries a stable operation id and is
 *   idempotent by it; each transition updates the ticket state AND all
 *   matched bucket rows atomically (one transaction or CAS), so no
 *   crash between "state moved" and "buckets moved" double-counts or
 *   leaks capacity.
 * - `denied` is a TERMINAL verdict distinct from waiting in `queued`:
 *   an infeasible request (its reservation exceeds a matched bucket's
 *   TOTAL capacity) refuses at enqueue and never camps at the head of
 *   a queue starving everyone behind it.
 * - Of a racing release, expiry, and cancel exactly one wins per
 *   ticket; the losers are durable no-ops, never second refunds.
 * - Admission is an environmental fact, like the limiter: the run
 *   journal never records scheduler state, and replay of a run must
 *   not depend on it. A resumed run recovers its ticket by
 *   `(unitId, generation)`, never by hoping it retained an id.
 * - A denial surfaces to the engine as the same synthetic
 *   rate-limit-class refusal the limiter uses; `retryAfterMs` on a
 *   queued verdict is honored verbatim by the caller's backoff.
 */

/** The four reservation measures (RFC section 4.3). */
export interface AdmissionReservation {
  /** The one scheduler COST unit; everything else gates feasibility. */
  wires: number;
  inputTokens?: number;
  usd?: number;
  exposureUsd?: number;
}

/** Normalized scope dimensions, exactly the quota request's shape. */
export interface AdmissionScopeDimensions {
  tenant?: string;
  account?: string;
  project?: string;
  legalDomain?: string;
  region?: string;
  providerAccount?: string;
  sponsor?: string;
}

export interface AdmissionRequest {
  /** Caller-minted unit identity: the run id, typically. */
  unitId: string;
  /** The unit's incarnation token (RunMeta.genesis, typically). */
  generation: string;
  /**
   * The RESOLVED effective tenant, computed by exactly the tenantFrom
   * resolution the limiter request uses: the engine-configured tenant
   * by default, the scope's under `quota.tenantFrom: 'scope'`. Carried
   * as its own field so the two seams debit the SAME identity.
   */
  resolvedTenant?: string;
  /**
   * True when the deployment declared `tenantFrom: 'scope'`, the one
   * configuration in which a disagreement between `resolvedTenant`
   * and `scope.tenant` has a documented meaning; outside it the
   * disagreement refuses typed (RFC section 4.1, item 1).
   */
  tenantFromScope?: boolean;
  scope?: AdmissionScopeDimensions;
  /** Fairness weight of the member; positive, default 1. */
  weight?: number;
  reservation: AdmissionReservation;
  /** Host-flagged emergency work; admitted from the reserve fraction. */
  emergency?: boolean;
}

export type AdmissionTicketState =
  'queued' | 'granted' | 'released' | 'refunded' | 'expired' | 'denied';

export interface AdmissionTicket {
  unitId: string;
  generation: string;
  state: AdmissionTicketState;
  resolvedTenant?: string;
  scope?: AdmissionScopeDimensions;
  reservation: AdmissionReservation;
  weight: number;
  /** Store-assigned, totally ordered per queue; the SFQ tie-break. */
  arrivalSeq: number;
  /** Start-time fair queuing tags (RFC section 4.2, item 3). */
  startTag: number;
  finishTag: number;
  /** Millisecond instants of the injectable clock. */
  enqueuedAtMs: number;
  grantedAtMs?: number;
  /** The grant lease; expiry settles conservatively (section 4.3). */
  leaseExpiresAtMs?: number;
  /** Monotone high-water cover of consumption (checkpoint THEN consume). */
  cover?: AdmissionReservation;
  deniedReason?: string;
}

export type AdmissionTicketDecision =
  | { state: 'granted'; ticket: AdmissionTicket }
  | { state: 'queued'; ticket: AdmissionTicket; position: number; retryAfterMs?: number }
  | { state: 'denied'; reason: string };

/** The recovery answer for a resumed unit (RFC section 4, item 5). */
export type AdmissionRecovery =
  | { state: 'granted'; ticket: AdmissionTicket }
  | { state: 'queued'; ticket: AdmissionTicket; position: number }
  | { state: 'unknown' };

export interface AdmissionScheduler {
  /**
   * Conditional create by `(unitId, generation)` plus immediate grant
   * when every matched level admits; `opId` makes retries idempotent.
   */
  enqueue(request: AdmissionRequest, opId: string): Promise<AdmissionTicketDecision>;
  /**
   * The resumed unit's recovery: `granted` renews the lease, a queued
   * ticket reports its surviving position, and `unknown` means
   * re-enqueue (the conservative direction).
   */
  recover(unitId: string, generation: string, opId: string): Promise<AdmissionRecovery>;
  /** Renews a granted ticket's lease; unknown tickets are no-ops. */
  renew(unitId: string, generation: string, opId: string): Promise<void>;
  /**
   * Durably checkpoints a consumption cover BEFORE the covered batch
   * (the intent-before-effect doctrine applied to capacity): monotone
   * high-water, idempotent by opId, and lease-carried: a fenced store
   * rejects an expired lease's cover write, which is what makes the
   * conservative expiry refund provable rather than optimistic.
   */
  checkpointCover(
    unitId: string,
    generation: string,
    cover: AdmissionReservation,
    opId: string,
  ): Promise<void>;
  /**
   * Release with actuals: the unused remainder refunds to each level,
   * over-consumption beyond the reservation lands as bucket debt (it
   * never denies retroactively), and a late settlement after expiry is
   * accepted idempotently as debt rather than discarded.
   */
  release(
    unitId: string,
    generation: string,
    actuals: AdmissionReservation,
    opId: string,
  ): Promise<void>;
  /** Cancels a queued ticket (nothing to refund); granted ones release. */
  cancel(unitId: string, generation: string, opId: string): Promise<void>;
  /**
   * The failover transfer (RFC section 4.2, item 4): atomically
   * acquires the TARGET hierarchy's capacity and level-2 slot and
   * releases the source hierarchy in the same transition, BEFORE the
   * target dispatches. A failed transfer leaves the source binding
   * unchanged and the target undispatchable: no window exists in which
   * work runs on a provider account whose slot it never held.
   */
  rebind(
    unitId: string,
    generation: string,
    target: { scope: AdmissionScopeDimensions },
    opId: string,
  ): Promise<AdmissionTicketDecision>;
  /**
   * Advances the scheduler: expires stale leases (conservative
   * settlement), then grants queued tickets in SFQ order while every
   * matched level admits. Returns the newly granted tickets.
   */
  pump(opId: string): Promise<AdmissionTicket[]>;
}
