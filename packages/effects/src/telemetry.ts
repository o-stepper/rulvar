/**
 * Effect lane telemetry (plan 45, rfcs/effects.md section 9): a pure
 * fold over the fold. Counters by terminal class count EFFECTIVE
 * dispositions (the compensated overlay included), `unknownEntered` is
 * the pressure signal even though `unknown` is not terminal, and
 * `incidentsOpen` counts post-terminal conflicts still awaiting a
 * disposition. Ages are computed only when the caller supplies a
 * clock; the fold itself never reads one.
 */
import { effectiveEffectState, type EffectLaneFold } from '@rulvar/core';

export interface EffectsTelemetry {
  /** Consumed intents that have not reached a terminal. */
  openEffectIntents: number;
  /** Present only when `nowMs` was supplied. */
  oldestOpenIntentAgeMs?: number;
  confirmed: number;
  compensated: number;
  refused: number;
  cancelledBeforeDispatch: number;
  quarantined: number;
  /** Machines that entered `unknown` at least once. */
  unknownEntered: number;
  duplicateReceiptsBenign: number;
  duplicateReceiptsConflicting: number;
  /** Incidents with no disposition citing them. */
  incidentsOpen: number;
}

export function effectsTelemetryOf(
  fold: EffectLaneFold,
  options: { nowMs?: number } = {},
): EffectsTelemetry {
  const telemetry: EffectsTelemetry = {
    openEffectIntents: 0,
    confirmed: 0,
    compensated: 0,
    refused: fold.standaloneRefusals().length,
    cancelledBeforeDispatch: 0,
    quarantined: fold.standaloneQuarantines().length,
    unknownEntered: 0,
    duplicateReceiptsBenign: 0,
    duplicateReceiptsConflicting: 0,
    incidentsOpen: 0,
  };
  let oldestOpenStarted: number | undefined;
  for (const machine of fold.machines()) {
    if (!machine.consumed) {
      telemetry.refused += 1;
      continue;
    }
    if (machine.terminal === undefined) {
      telemetry.openEffectIntents += 1;
      const started = Date.parse(machine.at);
      if (!Number.isNaN(started)) {
        oldestOpenStarted =
          oldestOpenStarted === undefined ? started : Math.min(oldestOpenStarted, started);
      }
    }
    const effective = effectiveEffectState(machine);
    if (effective === 'confirmed') {
      telemetry.confirmed += 1;
    } else if (effective === 'compensated') {
      telemetry.compensated += 1;
    } else if (effective === 'quarantined') {
      telemetry.quarantined += 1;
    } else if (effective === 'cancelled-before-dispatch') {
      telemetry.cancelledBeforeDispatch += 1;
    } else if (effective === 'refused') {
      telemetry.refused += 1;
    }
    if (
      machine.attempts.some((a) => a.outcome === 'unknown') ||
      machine.receipts.some((r) => r.verification === 'unverified')
    ) {
      telemetry.unknownEntered += 1;
    }
    for (const receipt of machine.receipts) {
      if (receipt.benignDuplicateOf !== undefined) {
        telemetry.duplicateReceiptsBenign += 1;
      }
      if (receipt.conflictWith !== undefined) {
        telemetry.duplicateReceiptsConflicting += 1;
      }
    }
    const disposed = new Set(
      machine.dispositions.map((d) => d.causalRef).filter((ref) => ref !== undefined),
    );
    telemetry.incidentsOpen += machine.incidents.filter((i) => !disposed.has(i.seq)).length;
  }
  if (options.nowMs !== undefined && oldestOpenStarted !== undefined) {
    telemetry.oldestOpenIntentAgeMs = Math.max(0, options.nowMs - oldestOpenStarted);
  }
  return telemetry;
}
