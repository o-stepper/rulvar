/**
 * The effect reconciler (plan 45, rfcs/effects.md sections 3.1, 4.5,
 * 8): the sweep that makes "every intent deterministically reaches
 * confirmed, compensated, or quarantined" true. Every non-terminal
 * state carries an explicit journaled budget, and every exhaustion
 * path lands in `quarantined`; the sweep is the process that appends
 * those quarantines, drives crash-window recovery through the
 * dispatcher, refuses effect authorizations whose deadline crossed,
 * and runs the post-restore reconciliation that re-enables a
 * restoration epoch (kill point 25).
 */
import {
  approvalLicensedKey,
  EffectLaneRefusedError,
  type EffectLaneWriter,
  type EffectMachine,
  type JournalEntry,
} from '@rulvar/core';

import type { EffectDispatcher, EffectRecoveryReport } from './dispatcher.js';
import type { EffectReceiptObservation } from './adapter.js';

export interface EffectSweepReport {
  /** Machines the sweep examined. */
  swept: number;
  quarantined: Array<{ intentSeq: number; reason: string }>;
  recovered: Array<{ intentSeq: number; report: EffectRecoveryReport }>;
  /** Open machines legitimately waiting inside their budgets. */
  waiting: number;
  /** Standalone authorization-timeout refusals appended. */
  authorizationTimeouts: number;
}

export interface RestorationReport {
  /** Provider effects with no journaled intent: quarantined by name. */
  unreconstructable: string[];
  /** True when no enumeration exists and the range quarantined whole. */
  rangeQuarantined: boolean;
  sweep: EffectSweepReport;
  /** Seq of the appended effect_reconciliation_complete decision. */
  completionSeq: number;
}

export interface EffectReconcilerOptions {
  writer: EffectLaneWriter;
  /** Optional: without it the sweep only quarantines and reports. */
  dispatcher?: EffectDispatcher;
  now?: () => string;
}

export class EffectReconciler {
  private readonly writer: EffectLaneWriter;
  private readonly dispatcher?: EffectDispatcher;
  private readonly now: () => string;

  constructor(options: EffectReconcilerOptions) {
    this.writer = options.writer;
    if (options.dispatcher !== undefined) {
      this.dispatcher = options.dispatcher;
    }
    this.now = options.now ?? ((): string => new Date().toISOString());
  }

  private async quarantine(intentSeq: number, opTag: string, reason: string): Promise<void> {
    await this.writer.appendTerminal(intentSeq, {
      opId: `quarantine:${opTag}:${String(intentSeq)}`,
      terminal: 'quarantined',
      reason,
    });
  }

  /** Why this machine's budgets demand a quarantine, if they do. */
  private exhaustion(machine: EffectMachine, now: string): { tag: string; reason: string } | undefined {
    if (now > machine.budgets.reconcileBy) {
      // Kill 21: whatever non-terminal state the machine is in,
      // crossing reconcileBy quarantines it with the state recorded.
      return {
        tag: 'reconcile-by',
        reason:
          `reconcileBy ${machine.budgets.reconcileBy} crossed in state '${machine.state}'; ` +
          'the machine cannot loiter in a non-terminal state past its overall deadline',
      };
    }
    if (machine.pendingConflict !== undefined) {
      // Kill 10, the pre-terminal half: a conflicting duplicate
      // receipt before any terminal quarantines the intent.
      return {
        tag: 'conflict',
        reason:
          'a conflicting duplicate receipt (same logical key, different provider identity ' +
          'or amount) arrived before any terminal; human disposition decides which is real',
      };
    }
    if (machine.state === 'awaiting-receipt') {
      const accepted = machine.attempts.find((a) => a.outcome === 'accepted');
      const since = accepted?.outcomeAt;
      if (
        since !== undefined &&
        Date.parse(now) - Date.parse(since) > machine.budgets.receiptWaitMs
      ) {
        // Kill 20: awaiting-receipt past the receipt wait budget.
        return {
          tag: 'receipt-wait',
          reason:
            `the provider accepted at ${since} and no verifiable receipt arrived within ` +
            `${String(machine.budgets.receiptWaitMs)} ms`,
        };
      }
    }
    if (machine.state === 'intent' && machine.attempts.length >= machine.budgets.attempts) {
      // Kill 18: the attempt budget ran out; never an unbounded loop.
      return {
        tag: 'attempts',
        reason: `the attempt budget (${String(machine.budgets.attempts)}) is exhausted`,
      };
    }
    if (machine.state === 'unknown' && machine.probes.length >= machine.budgets.lookups) {
      // Kill 19: lookups are bounded separately from attempts.
      return {
        tag: 'lookups',
        reason: `the lookup budget (${String(machine.budgets.lookups)}) is exhausted with ` +
          'the outcome still unknown',
      };
    }
    return undefined;
  }

  /**
   * Effect authorizations whose deadline crossed while still open
   * (kill 22, the compensation wait included): the sweep appends a
   * durable standalone refusal for the licensed key, so nothing waits
   * forever on an authorization that can no longer arrive in time.
   */
  private async refuseTimedOutAuthorizations(entries: readonly JournalEntry[]): Promise<number> {
    const now = this.now();
    let appended = 0;
    for (const entry of entries) {
      if (entry.kind !== 'approval' || entry.deadlineAt === undefined) {
        continue;
      }
      const licensed = approvalLicensedKey(entry);
      if (licensed === undefined || now <= entry.deadlineAt) {
        continue;
      }
      const resolved = entries.some(
        (e) => e.kind === 'resolution' && e.resolution?.target === entry.seq,
      );
      if (resolved) {
        continue;
      }
      const landed = await this.writer.appendStandaloneRefusal({
        opId: `authz-timeout:${String(entry.seq)}`,
        logicalKey: licensed,
        reason:
          `the effect authorization at seq ${String(entry.seq)} crossed its deadline ` +
          `${entry.deadlineAt} unresolved; the wait for authorization is bounded ` +
          '(RFC section 3.1, item 1)',
      });
      if (!landed.replayed) {
        appended += 1;
      }
    }
    return appended;
  }

  async sweep(options: { recover?: boolean } = {}): Promise<EffectSweepReport> {
    const recover = options.recover ?? true;
    const fold = await this.writer.refresh();
    const now = this.now();
    const report: EffectSweepReport = {
      swept: 0,
      quarantined: [],
      recovered: [],
      waiting: 0,
      authorizationTimeouts: 0,
    };
    report.authorizationTimeouts = await this.refuseTimedOutAuthorizations(
      await this.writer.entriesSnapshot(),
    );
    for (const machine of fold.machines()) {
      if (!machine.consumed || machine.terminal !== undefined) {
        continue;
      }
      report.swept += 1;
      const exhaustion = this.exhaustion(machine, now);
      if (exhaustion !== undefined) {
        await this.quarantine(machine.intentSeq, exhaustion.tag, exhaustion.reason);
        report.quarantined.push({ intentSeq: machine.intentSeq, reason: exhaustion.reason });
        continue;
      }
      if (recover && this.dispatcher !== undefined) {
        try {
          const recovery = await this.dispatcher.recover(machine.intentSeq);
          if (recovery.kind === 'waiting') {
            report.waiting += 1;
          } else if (recovery.kind !== 'noop') {
            report.recovered.push({ intentSeq: machine.intentSeq, report: recovery });
          }
        } catch (thrown) {
          if (
            thrown instanceof EffectLaneRefusedError &&
            thrown.rule === 'reconciliation-pending'
          ) {
            // Dispatch re-enables only at the completion decision; the
            // machine waits for the ordinary sweep after release.
            report.waiting += 1;
            continue;
          }
          throw thrown;
        }
        continue;
      }
      report.waiting += 1;
    }
    return report;
  }

  /**
   * The post-restore reconciliation (RFC section 4.5, item 3; kill
   * 25). Requires the current epoch to be a restoration epoch awaiting
   * release. With `enumerate`, every provider effect whose logical key
   * has no consumed intent anywhere in the journal quarantines
   * standalone by name (what could NOT be reconstructed), and open
   * machines re-enter recovery through the ordinary sweep. Without
   * authoritative enumeration the whole affected range quarantines as
   * one named record and automatic recovery is forbidden. Either way
   * the sweep runs, the completion decision appends, and attempt
   * dispatch re-enables for the epoch.
   */
  async reconcileRestoration(options?: {
    enumerate?: () => Promise<Array<{ logicalKey: string; receipt?: EffectReceiptObservation }>>;
  }): Promise<RestorationReport> {
    const fold = await this.writer.refresh();
    const epoch = fold.currentEpoch();
    if (epoch === undefined || !epoch.needsReconciliation || epoch.reconciled) {
      throw new EffectLaneRefusedError(
        'no-restoration-pending',
        'reconcileRestoration requires a restoration epoch awaiting release',
      );
    }
    const unreconstructable: string[] = [];
    let rangeQuarantined = false;
    if (options?.enumerate !== undefined) {
      const consumedKeys = new Set(
        fold
          .machines()
          .filter((m) => m.consumed)
          .map((m) => m.logicalKey),
      );
      for (const effect of await options.enumerate()) {
        if (consumedKeys.has(effect.logicalKey)) {
          continue;
        }
        await this.writer.appendStandaloneQuarantine({
          opId: `unreconstructable:${effect.logicalKey}`,
          logicalKey: effect.logicalKey,
          reason:
            'a provider effect exists with no journaled intent after the restore; the ' +
            'journal cannot reconstruct who licensed it, so it parks for disposition',
        });
        unreconstructable.push(effect.logicalKey);
      }
    } else {
      await this.writer.appendStandaloneQuarantine({
        opId: `restoration-range:${String(epoch.seq)}`,
        logicalKey: `epoch:${String(epoch.seq)}`,
        reason:
          'the provider offers no authoritative enumeration: the whole affected range ' +
          'quarantines and automatic recovery inside it is forbidden',
      });
      rangeQuarantined = true;
    }
    // Quarantine-only: dispatch stays disabled until the completion
    // decision, so crash-window redispatch waits for the next sweep.
    const sweep = await this.sweep({ recover: false });
    const completion = await this.writer.appendReconciliationComplete({
      opId: `reconciliation-complete:${String(epoch.seq)}`,
      epochRef: epoch.seq,
      swept: sweep.swept,
    });
    return { unreconstructable, rangeQuarantined, sweep, completionSeq: completion.seq };
  }
}
