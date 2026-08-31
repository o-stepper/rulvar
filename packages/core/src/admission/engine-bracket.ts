/**
 * The engine's admission bracket (RV4510, plan 45, rfcs/admission.md
 * section 5): the ticket brackets the RUN as the unit of work. The
 * bracket enqueues (or recovers, on resume) under the run's own
 * identity `(runId, genesis)`, waits while queued honoring
 * `retryAfterMs` verbatim (RV4804: the queued verdict's hint sets the
 * next sleep; pollMs is the fallback cadence), ends the wait with the
 * RUN when the run signal aborts (the ticket cancels best effort and
 * the caller's own cancellation machinery settles the run; before
 * RV4804 a cancelled run polled the queue forever), refuses typed on
 * the terminal `denied` verdict, checkpoints the FULL reservation as
 * the cover at grant (the maximally conservative cover: an upper bound
 * by construction, so a lease expiry refunds nothing it cannot prove;
 * sharper per-batch covers are a future refinement recorded here),
 * renews the lease on a timer, and releases at settle. Renew failures
 * are ANNOUNCED, never fatal (RV4804): the first failure warns, a
 * verify recover that no longer answers `granted` emits
 * `admission:lease-lost` once (the scheduler expired the lease and may
 * re-grant the capacity while this run is alive), and the run
 * continues, because the wire-level QuotaLimiter still gates every
 * dispatch and the settle release is idempotent. First-shape actuals
 * equal the reservation (no refund on the happy path; the deployment's
 * reservation is its estimate), also recorded here as the deliberate
 * first shape. Admission is an environmental fact: NOTHING here is
 * journaled, and the wire-level QuotaLimiter keeps being consulted per
 * dispatch, unchanged: a granted ticket never exempts a wire from
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
  /**
   * The run's cancel signal (RV4804): host abort and the run deadline
   * both ride it (requestCancel), so an abort while queued ends the
   * wait instead of polling a dead run's ticket forever.
   */
  signal?: AbortSignal;
  /**
   * The run's event sink (RV4804): renew failures and a lost lease are
   * environmental facts worth announcing; absent, the bracket stays
   * silent exactly as before.
   */
  telemetry?: { emit(body: { type: string } & Record<string, unknown>): void };
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const done = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener('abort', done, { once: true });
  });

/**
 * Admits one run unit: resolves when the ticket is granted (or when
 * the run signal aborts, after cancelling the ticket best effort),
 * throws the typed AdmissionRejectedError on the terminal denied
 * verdict, and returns the settle teardown (clear the renew timer,
 * release).
 */
export async function admitRunUnit(
  config: EngineAdmissionConfig,
  unit: AdmitRunUnitInput,
): Promise<() => Promise<void>> {
  const scheduler = config.scheduler;
  const reservation = config.reservation ?? { wires: 1 };
  const pollMs = config.pollMs ?? 250;
  const signal = unit.signal;
  const telemetry = unit.telemetry;
  const emit = (body: { type: string } & Record<string, unknown>): void => {
    telemetry?.emit(body);
  };
  const opBase = `admit:${unit.unitId}:${unit.generation}`;
  const request: AdmissionRequest = {
    unitId: unit.unitId,
    generation: unit.generation,
    ...(unit.resolvedTenant === undefined ? {} : { resolvedTenant: unit.resolvedTenant }),
    ...(unit.tenantFromScope === true ? { tenantFromScope: true } : {}),
    ...(unit.scope === undefined ? {} : { scope: unit.scope }),
    reservation,
  };
  // A function, not a direct read: TS keeps a readonly property's
  // narrowing across awaits, so a second literal check after the first
  // return would type as never-true.
  const aborted = (): boolean => signal?.aborted === true;
  const abandonWait = async (opId: string): Promise<() => Promise<void>> => {
    // The wait ends with the RUN, not with the grant (RV4804): the
    // ticket cancels best effort (a queued one refunds nothing, a
    // granted one releases through the cancel transition), and the
    // caller's own cancellation machinery settles the run. A cancel
    // the scheduler loses settles conservatively through lease expiry.
    try {
      await scheduler.cancel(unit.unitId, unit.generation, opId);
    } catch {
      // Conservative expiry owns the lost cancel.
    }
    return (): Promise<void> => Promise.resolve();
  };
  if (aborted()) {
    return abandonWait(`${opBase}:cancel:pre`);
  }
  // A resumed segment recovers its ticket by unit identity FIRST; only
  // an unknown unit enqueues (the conservative direction).
  const recovered = await scheduler.recover(unit.unitId, unit.generation, `${opBase}:recover`);
  let granted = recovered.state === 'granted';
  // The queued verdict's retryAfterMs is honored verbatim for the NEXT
  // sleep (RV4804); recover verdicts carry no hint, so the fallback
  // cadence resumes after every hintless wait.
  let nextWaitMs = pollMs;
  if (recovered.state === 'unknown') {
    const decision = await scheduler.enqueue(request, opBase);
    if (decision.state === 'denied') {
      throw new AdmissionRejectedError(
        `durable admission refused run '${unit.unitId}' terminally: ${decision.reason}`,
      );
    }
    granted = decision.state === 'granted';
    if (decision.state === 'queued' && decision.retryAfterMs !== undefined) {
      nextWaitMs = decision.retryAfterMs;
    }
  }
  let waitedMs = 0;
  while (!granted) {
    if (aborted()) {
      return abandonWait(`${opBase}:cancel:${String(waitedMs)}`);
    }
    await sleep(nextWaitMs, signal);
    waitedMs += nextWaitMs;
    nextWaitMs = pollMs;
    if (aborted()) {
      return abandonWait(`${opBase}:cancel:${String(waitedMs)}`);
    }
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
      if (decision.state === 'queued' && decision.retryAfterMs !== undefined) {
        nextWaitMs = decision.retryAfterMs;
      }
    }
  }
  // The maximally conservative cover: the full reservation, an upper
  // bound by construction (checkpoint THEN consume).
  await scheduler.checkpointCover(unit.unitId, unit.generation, reservation, `${opBase}:cover`);
  const renewMs = config.renewMs ?? pollMs * 4;
  let settled = false;
  let renewBusy = false;
  let renewFailed = false;
  let leaseLostAnnounced = false;
  let renewSeq = 0;
  const renewTick = async (): Promise<void> => {
    if (renewBusy || settled) {
      return;
    }
    renewBusy = true;
    renewSeq += 1;
    const opId = `${opBase}:renew:${String(renewSeq)}`;
    try {
      await scheduler.renew(unit.unitId, unit.generation, opId);
      if (renewFailed) {
        renewFailed = false;
        emit({
          type: 'log',
          level: 'info',
          msg: `durable admission lease renew recovered for run '${unit.unitId}'`,
        });
      }
    } catch (thrown) {
      // Announced, never fatal (RV4804): the silent catch used to hide
      // an expiring lease from the very holder it expired under. The
      // run continues either way, because the wire quota still gates
      // every dispatch and the settle release is idempotent.
      if (!renewFailed) {
        renewFailed = true;
        emit({
          type: 'log',
          level: 'warn',
          msg:
            `durable admission lease renew failed for run '${unit.unitId}': ` +
            `${thrown instanceof Error ? thrown.message : String(thrown)}; the scheduler may ` +
            'expire the lease and re-grant the capacity',
        });
      }
      // After a failed renew the truth is the scheduler's: verify by
      // recover, and a ticket no longer granted is the lost lease the
      // header promises to announce.
      try {
        const state = await scheduler.recover(unit.unitId, unit.generation, `${opId}:verify`);
        if (!settled && state.state !== 'granted' && !leaseLostAnnounced) {
          leaseLostAnnounced = true;
          emit({
            type: 'admission:lease-lost',
            unitId: unit.unitId,
            generation: unit.generation,
          });
          emit({
            type: 'log',
            level: 'warn',
            msg:
              `durable admission lease lost for run '${unit.unitId}': the scheduler expired ` +
              'the grant and may re-admit the capacity while this run is alive; the wire ' +
              'quota still gates every dispatch',
          });
        }
      } catch {
        // The verify itself failed; the next tick retries.
      }
    } finally {
      renewBusy = false;
    }
  };
  const renewTimer = setInterval(() => {
    void renewTick();
  }, renewMs);
  renewTimer.unref?.();
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
