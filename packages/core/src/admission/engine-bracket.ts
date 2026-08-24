/**
 * The engine's admission bracket (RV4510, plan 45, rfcs/admission.md
 * section 5): the ticket brackets the RUN as the unit of work. The
 * bracket enqueues (or recovers, on resume) under the run's own
 * identity `(runId, genesis)`, waits while queued honoring
 * `retryAfterMs` verbatim, refuses typed on the terminal `denied`
 * verdict, checkpoints the FULL reservation as the cover at grant
 * (the maximally conservative cover: an upper bound by construction,
 * so a lease expiry refunds nothing it cannot prove; sharper per-batch
 * covers are a future refinement recorded here), renews the lease on
 * a timer, and releases at settle. First-shape actuals equal the
 * reservation (no refund on the happy path; the deployment's
 * reservation is its estimate), also recorded here as the deliberate
 * first shape. Admission is an environmental fact: NOTHING here is
 * journaled, and the wire-level QuotaLimiter keeps being consulted
 * per dispatch, unchanged: a granted ticket never exempts a wire from
 * quota.
 */
import { AdmissionRejectedError, ConfigError } from '../l0/errors.js';
import type {
  AdmissionRequest,
  AdmissionReservation,
  AdmissionScheduler,
  AdmissionScopeDimensions,
} from '../l0/spi/admission.js';

/** The `createEngine` admission configuration. */
export interface EngineAdmissionConfig {
  scheduler: AdmissionScheduler;
  /** The per-run reservation; default one wire. */
  reservation?: AdmissionReservation;
  /** Queued-wait poll interval when the scheduler names no retryAfterMs. */
  pollMs?: number;
  /** Lease renew cadence; default four polls. */
  renewMs?: number;
  /**
   * The effective tenant, when the deployment runs admission without a
   * quota limiter; a configured `quota.tenant` takes precedence so the
   * two seams debit the SAME identity (RFC section 4.1).
   */
  tenant?: string;
  /** Mirrors quota.tenantFrom for limiter-less deployments. */
  tenantFrom?: 'scope';
}

export function validateEngineAdmissionConfig(config: EngineAdmissionConfig | undefined): void {
  if (config === undefined) {
    return;
  }
  if (typeof config.scheduler?.enqueue !== 'function') {
    throw new ConfigError('createEngine admission.scheduler must implement AdmissionScheduler');
  }
  if (config.reservation !== undefined) {
    if (!Number.isInteger(config.reservation.wires) || config.reservation.wires < 1) {
      throw new ConfigError('createEngine admission.reservation.wires must be a positive integer');
    }
  }
  if (config.pollMs !== undefined && !(config.pollMs > 0)) {
    throw new ConfigError('createEngine admission.pollMs must be positive');
  }
}

export interface AdmitRunUnitInput {
  unitId: string;
  generation: string;
  scope?: AdmissionScopeDimensions;
  resolvedTenant?: string;
  tenantFromScope?: boolean;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Admits one run unit: resolves when the ticket is granted, throws the
 * typed AdmissionRejectedError on the terminal denied verdict, and
 * returns the settle teardown (clear the renew timer, release).
 */
export async function admitRunUnit(
  config: EngineAdmissionConfig,
  unit: AdmitRunUnitInput,
): Promise<() => Promise<void>> {
  const scheduler = config.scheduler;
  const reservation = config.reservation ?? { wires: 1 };
  const pollMs = config.pollMs ?? 250;
  const opBase = `admit:${unit.unitId}:${unit.generation}`;
  const request: AdmissionRequest = {
    unitId: unit.unitId,
    generation: unit.generation,
    ...(unit.resolvedTenant === undefined ? {} : { resolvedTenant: unit.resolvedTenant }),
    ...(unit.tenantFromScope === true ? { tenantFromScope: true } : {}),
    ...(unit.scope === undefined ? {} : { scope: unit.scope }),
    reservation,
  };
  // A resumed segment recovers its ticket by unit identity FIRST; only
  // an unknown unit enqueues (the conservative direction).
  const recovered = await scheduler.recover(unit.unitId, unit.generation, `${opBase}:recover`);
  let granted = recovered.state === 'granted';
  if (recovered.state === 'unknown') {
    const decision = await scheduler.enqueue(request, opBase);
    if (decision.state === 'denied') {
      throw new AdmissionRejectedError(
        `durable admission refused run '${unit.unitId}' terminally: ${decision.reason}`,
      );
    }
    granted = decision.state === 'granted';
  }
  let waitedMs = 0;
  while (!granted) {
    await sleep(pollMs);
    waitedMs += pollMs;
    await scheduler.pump(`${opBase}:pump:${String(waitedMs)}`);
    const state = await scheduler.recover(
      unit.unitId,
      unit.generation,
      `${opBase}:poll:${String(waitedMs)}`,
    );
    if (state.state === 'granted') {
      granted = true;
      break;
    }
    if (state.state === 'unknown') {
      // The ticket settled underneath the wait (an expiry sweep, an
      // operator cancel): re-enqueue is the conservative direction.
      const decision = await scheduler.enqueue(request, `${opBase}:requeue:${String(waitedMs)}`);
      if (decision.state === 'denied') {
        throw new AdmissionRejectedError(
          `durable admission refused run '${unit.unitId}' terminally: ${decision.reason}`,
        );
      }
      granted = decision.state === 'granted';
    }
  }
  // The maximally conservative cover: the full reservation, an upper
  // bound by construction (checkpoint THEN consume).
  await scheduler.checkpointCover(unit.unitId, unit.generation, reservation, `${opBase}:cover`);
  const renewMs = config.renewMs ?? pollMs * 4;
  const renewTimer = setInterval(() => {
    void scheduler.renew(unit.unitId, unit.generation, `${opBase}:renew`).catch(() => undefined);
  }, renewMs);
  renewTimer.unref?.();
  let settled = false;
  return async (): Promise<void> => {
    if (settled) {
      return;
    }
    settled = true;
    clearInterval(renewTimer);
    try {
      await scheduler.release(unit.unitId, unit.generation, reservation, `${opBase}:release`);
      await scheduler.pump(`${opBase}:release-pump`);
    } catch {
      // A lost release settles conservatively through lease expiry;
      // the settle path must never die on the environmental seam.
    }
  };
}
