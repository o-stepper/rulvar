/**
 * EffectDispatcher (plan 45, rfcs/effects.md sections 4.4, 4.7, 6, 8):
 * the crash-window recovery engine over the writer and the adapter
 * seam. Two rules carry everything:
 *
 * 1. An attempt record is appended BEFORE every network send, so the
 *    journal distinguishes crash windows by what it proves afterwards
 *    (the kill point catalog). Re-dispatch after an ambiguous window is
 *    licensed EXCLUSIVELY by provider-side fencing: the idempotency
 *    key dedup, the conditional-create unique key, or an acceptance
 *    closing negative. Elapsed time licenses nothing; a 'neither'
 *    provider quarantines every ambiguous window, and the quarantine
 *    record names the possible late stale send.
 * 2. From a revocation or expiry position on, recovery is reconcile
 *    only on EVERY row (RFC section 4.7): a verified receipt or a
 *    qualified positive confirms (with the compensation decision path
 *    opened by a revocation incident; expiry opens none, because the
 *    send predated the crossing and expiry bounds the grant, not the
 *    past); a qualified negative that closed acceptance cancels; and
 *    anything unresolvable quarantines with the closer on the record.
 */
import {
  EffectLaneRefusedError,
  type EffectLaneWriter,
  type EffectMachine,
  type EffectReceiptDecision,
} from '@rulvar/core';

import {
  effectIdempotencyKey,
  type EffectAdapter,
  type EffectDispatchResult,
  type EffectLookupAnswer,
  type EffectReceiptObservation,
} from './adapter.js';

/**
 * Trust-envelope verification of one receipt observation (the full
 * envelope machinery is the reconciler train's; the seam is here).
 * The default fails closed: an unverified receipt routes the machine
 * to `unknown`, never to `confirmed`.
 */
export type ReceiptVerifier = (observation: EffectReceiptObservation) => 'verified' | 'unverified';

export interface EffectDispatcherOptions {
  writer: EffectLaneWriter;
  adapter: EffectAdapter;
  runId: string;
  verifyReceipt?: ReceiptVerifier;
  now?: () => string;
  /** Milliseconds of send-deadline headroom on minted attempts. */
  attemptTtlMs?: number;
}

export type EffectDispatchReport =
  | { kind: 'cancelled'; terminalSeq: number }
  | { kind: 'confirmed'; receiptSeq: number; terminalSeq: number }
  | { kind: 'accepted-awaiting-receipt'; attemptSeq: number }
  | { kind: 'receipt-unverified'; attemptSeq: number; receiptSeq: number }
  | { kind: 'failed'; attemptSeq: number; detail: string }
  | { kind: 'unknown'; attemptSeq: number; detail?: string };

export type EffectRecoveryReport =
  | { kind: 'noop'; reason: string }
  | { kind: 'cancelled'; terminalSeq: number }
  | { kind: 'confirmed'; receiptSeq: number; terminalSeq: number }
  | { kind: 'quarantined'; terminalSeq: number; reason: string }
  | { kind: 'redispatched'; report: EffectDispatchReport }
  | { kind: 'waiting'; reason: string }
  | { kind: 'receipt-unverified'; receiptSeq: number };

const DEFAULT_ATTEMPT_TTL_MS = 60_000;

export class EffectDispatcher {
  private readonly writer: EffectLaneWriter;
  private readonly adapter: EffectAdapter;
  private readonly runId: string;
  private readonly verifyReceipt: ReceiptVerifier;
  private readonly now: () => string;
  private readonly attemptTtlMs: number;

  constructor(options: EffectDispatcherOptions) {
    this.writer = options.writer;
    this.adapter = options.adapter;
    this.runId = options.runId;
    this.verifyReceipt = options.verifyReceipt ?? ((): 'unverified' => 'unverified');
    this.now = options.now ?? ((): string => new Date().toISOString());
    this.attemptTtlMs = options.attemptTtlMs ?? DEFAULT_ATTEMPT_TTL_MS;
  }

  private notAfter(): string {
    return new Date(Date.parse(this.now()) + this.attemptTtlMs).toISOString();
  }

  private async machine(intentSeq: number): Promise<EffectMachine> {
    const fold = await this.writer.refresh();
    const machine = fold.machineAt(intentSeq);
    if (machine === undefined || !machine.consumed) {
      throw new EffectLaneRefusedError(
        'no-such-intent',
        `no consumed effect intent at seq ${String(intentSeq)}`,
      );
    }
    return machine;
  }

  /**
   * The normal path: open the attempt (the writer's pre-attempt
   * re-fold cancels or refuses per RFC section 4.7), send through the
   * seam, classify the outcome, and confirm on a verified receipt.
   */
  async dispatch(intentSeq: number): Promise<EffectDispatchReport> {
    const machine = await this.machine(intentSeq);
    const ordinal = machine.attempts.length + 1;
    const idempotencyKey =
      this.adapter.descriptor.capabilityRow === 'idempotency-key'
        ? effectIdempotencyKey(machine)
        : undefined;
    const notAfter = this.notAfter();
    const opened = await this.writer.openAttempt(intentSeq, {
      opId: `attempt:${String(intentSeq)}:${String(ordinal)}`,
      notAfter,
      ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
    });
    if (opened.cancelled) {
      return { kind: 'cancelled', terminalSeq: opened.terminalSeq };
    }
    const attemptSeq = opened.attemptSeq;
    let result: EffectDispatchResult;
    try {
      result = await this.adapter.dispatch({
        runId: this.runId,
        intent: machine,
        attemptSeq,
        ordinal,
        ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
        notAfter,
      });
    } catch (thrown) {
      // A thrown transport is ambiguous by construction: the bytes may
      // or may not have left. Never a silent retry.
      result = { outcome: 'unknown', detail: `the transport threw: ${String(thrown)}` };
    }
    await this.writer.appendOutcome(intentSeq, attemptSeq, {
      opId: `outcome:${String(attemptSeq)}`,
      outcome: result.outcome,
      ...('detail' in result && result.detail !== undefined ? { detail: result.detail } : {}),
    });
    if (result.outcome === 'accepted') {
      if (result.receipt !== undefined) {
        return this.recordReceipt(intentSeq, `attempt:${String(attemptSeq)}`, result.receipt, {
          attemptSeq,
        });
      }
      return { kind: 'accepted-awaiting-receipt', attemptSeq };
    }
    if (result.outcome === 'failed') {
      return { kind: 'failed', attemptSeq, detail: result.detail };
    }
    return {
      kind: 'unknown',
      attemptSeq,
      ...(result.detail === undefined ? {} : { detail: result.detail }),
    };
  }

  private async recordReceipt(
    intentSeq: number,
    tag: string,
    observation: EffectReceiptObservation,
    context: { attemptSeq?: number },
  ): Promise<
    | { kind: 'confirmed'; receiptSeq: number; terminalSeq: number }
    | { kind: 'receipt-unverified'; attemptSeq: number; receiptSeq: number }
  > {
    const verification = this.verifyReceipt(observation);
    const payload: Omit<EffectReceiptDecision, 'decisionType' | 'intentRef'> = {
      opId: `receipt:${tag}`,
      verification,
      ...(observation.transferId === undefined ? {} : { transferId: observation.transferId }),
      ...(observation.amount === undefined ? {} : { amount: observation.amount }),
      ...(observation.currency === undefined ? {} : { currency: observation.currency }),
      ...(observation.documentHash === undefined ? {} : { documentHash: observation.documentHash }),
      ...(observation.providerRef === undefined ? {} : { providerRef: observation.providerRef }),
      ...(observation.timestamp === undefined ? {} : { timestamp: observation.timestamp }),
    };
    const receipt = await this.writer.appendReceipt(intentSeq, payload);
    if (verification !== 'verified') {
      return {
        kind: 'receipt-unverified',
        attemptSeq: context.attemptSeq ?? -1,
        receiptSeq: receipt.seq,
      };
    }
    const terminal = await this.writer.appendTerminal(intentSeq, {
      opId: `confirm:${String(intentSeq)}`,
      terminal: 'confirmed',
      causalRef: receipt.seq,
    });
    await this.settleCloserAfterConfirm(intentSeq);
    return { kind: 'confirmed', receiptSeq: receipt.seq, terminalSeq: terminal.seq };
  }

  /**
   * RFC section 4.7, rows 2 and 3: a REVOCATION whose position lost to
   * the execution opens the compensation decision path as a linked
   * incident; an EXPIRY opens none, because the send predated the
   * crossing and expiry bounds the grant, not the past.
   */
  private async settleCloserAfterConfirm(intentSeq: number): Promise<void> {
    const machine = await this.machine(intentSeq);
    if (machine.postIntentCloser?.kind === 'revoked') {
      await this.writer.appendIncident(intentSeq, {
        opId: `incident:closer:${String(intentSeq)}`,
        incident: 'revocation-after-confirmation',
        causalRef: machine.postIntentCloser.seq,
        detail:
          'the effect executed before the revocation landed; the incident opens the ' +
          'compensation decision path and the causal chain records both',
      });
    }
  }

  /** The provider's truth, by the strongest primitive the row offers. */
  private async providerTruth(
    machine: EffectMachine,
    attemptSeq?: number,
  ): Promise<EffectLookupAnswer | undefined> {
    const request = {
      runId: this.runId,
      intent: machine,
      ...(this.adapter.descriptor.capabilityRow === 'idempotency-key'
        ? { idempotencyKey: effectIdempotencyKey(machine) }
        : {}),
      ...(attemptSeq === undefined ? {} : { attemptSeq }),
    };
    if (
      this.adapter.descriptor.lookupQualification === 'acceptance-closing' &&
      this.adapter.closeAcceptance !== undefined
    ) {
      return this.adapter.closeAcceptance(request);
    }
    if (this.adapter.lookup !== undefined) {
      return this.adapter.lookup(request);
    }
    return undefined;
  }

  private async quarantine(intentSeq: number, reason: string): Promise<EffectRecoveryReport> {
    const terminal = await this.writer.appendTerminal(intentSeq, {
      opId: `quarantine:${String(intentSeq)}`,
      terminal: 'quarantined',
      reason,
    });
    return { kind: 'quarantined', terminalSeq: terminal.seq, reason };
  }

  /**
   * The crash-window recovery (RFC section 8): derived from what the
   * journal proves and what the capability row licenses. Never a blind
   * retry; never a provider contact on an already-closed machine.
   */
  async recover(intentSeq: number): Promise<EffectRecoveryReport> {
    const machine = await this.machine(intentSeq);
    if (machine.terminal !== undefined) {
      // Kill point 7: resume after a terminal is a no-op and must not
      // contact the provider again.
      return { kind: 'noop', reason: `already closed '${machine.terminal.terminal}'` };
    }
    const closer = machine.postIntentCloser;
    if (closer !== undefined) {
      return this.reconcileUnderCloser(intentSeq, machine);
    }
    const open = machine.attempts.find((a) => a.open);
    const row = this.adapter.descriptor.capabilityRow;
    const qualification = this.adapter.descriptor.lookupQualification;
    if (open !== undefined) {
      // Kill points 4, 5, 6, 8, 17: the ambiguous window. The send may
      // or may not have left; only provider-side fencing licenses a
      // re-dispatch.
      if (row === 'neither') {
        return this.quarantine(
          intentSeq,
          'an attempt is open on a provider with no fencing (no idempotency key, no ' +
            'acceptance closure): re-dispatch is forbidden, a stale send may still land ' +
            'later, and the disposition happens with that fact on the table',
        );
      }
      if (row === 'lookup') {
        const answer = await this.providerTruth(machine, open.seq);
        if (answer === undefined) {
          return this.quarantine(
            intentSeq,
            'the row claims lookup but the adapter offers no primitive',
          );
        }
        if (answer.found) {
          await this.writer.appendOutcome(intentSeq, open.seq, {
            opId: `outcome:${String(open.seq)}`,
            outcome: 'accepted',
            detail: 'recovered: the provider holds the effect',
          });
          return this.recordReceipt(intentSeq, `recovered:${String(open.seq)}`, answer.receipt, {
            attemptSeq: open.seq,
          });
        }
        if (qualification === 'acceptance-closing') {
          if (!answer.acceptanceClosed) {
            return this.quarantine(
              intentSeq,
              'the closure primitive could not close acceptance; the negative proves nothing',
            );
          }
          // The negative CLOSED acceptance for this attempt identity:
          // it provably never executed and can no longer execute.
          await this.writer.appendOutcome(intentSeq, open.seq, {
            opId: `outcome:${String(open.seq)}`,
            outcome: 'failed',
            detail: 'recovered: acceptance closed with no effect',
          });
          return { kind: 'redispatched', report: await this.dispatch(intentSeq) };
        }
        // Conditional create: the send itself is fenced by the unique
        // natural key, so the ambiguous attempt closes unknown and the
        // re-dispatch is safe.
        await this.writer.appendOutcome(intentSeq, open.seq, {
          opId: `outcome:${String(open.seq)}`,
          outcome: 'unknown',
          detail: 'recovered: the unique natural key arbitrates the re-dispatch',
        });
        return { kind: 'redispatched', report: await this.dispatch(intentSeq) };
      }
      // idempotency-key: the provider dedup arbitrates; close the
      // ambiguous attempt as unknown and re-dispatch under the SAME key.
      await this.writer.appendOutcome(intentSeq, open.seq, {
        opId: `outcome:${String(open.seq)}`,
        outcome: 'unknown',
        detail: 'recovered: the crash window is ambiguous; the provider fence arbitrates',
      });
      return { kind: 'redispatched', report: await this.dispatch(intentSeq) };
    }
    switch (machine.state) {
      case 'intent':
        return { kind: 'redispatched', report: await this.dispatch(intentSeq) };
      case 'awaiting-receipt': {
        const answer = await this.providerTruth(machine);
        if (answer !== undefined && answer.found) {
          return this.recordReceipt(
            intentSeq,
            `recovered:${String(machine.receipts.length + 1)}`,
            answer.receipt,
            {},
          );
        }
        return { kind: 'waiting', reason: 'the provider accepted; a receipt is expected' };
      }
      case 'unknown': {
        if (row === 'neither') {
          return this.quarantine(
            intentSeq,
            'the outcome is unknown on a provider with no fencing: re-dispatch is ' +
              'forbidden and a stale effect may still surface; manual disposition only',
          );
        }
        if (row === 'lookup') {
          const last = machine.attempts[machine.attempts.length - 1];
          const answer = await this.providerTruth(machine, last?.seq);
          if (answer !== undefined && answer.found) {
            return this.recordReceipt(
              intentSeq,
              `recovered:${String(machine.receipts.length + 1)}`,
              answer.receipt,
              {},
            );
          }
          if (
            qualification === 'acceptance-closing' &&
            (answer === undefined || !answer.acceptanceClosed)
          ) {
            return this.quarantine(
              intentSeq,
              'the closure primitive could not close acceptance; the negative proves nothing',
            );
          }
          return { kind: 'redispatched', report: await this.dispatch(intentSeq) };
        }
        return { kind: 'redispatched', report: await this.dispatch(intentSeq) };
      }
      default:
        return { kind: 'noop', reason: `state '${machine.state}' needs no recovery` };
    }
  }

  /**
   * RFC section 4.7 rows 2 and 3: reconcile-only recovery once a
   * revocation or expiry landed after the intent. No re-dispatch on
   * ANY row, the idempotency key included: the dedup makes a late send
   * safe against duplication, not against revocation.
   */
  private async reconcileUnderCloser(
    intentSeq: number,
    machine: EffectMachine,
  ): Promise<EffectRecoveryReport> {
    const closer = machine.postIntentCloser;
    const closerName = closer?.kind === 'expired' ? 'expiry' : 'revocation';
    if (machine.attempts.length === 0) {
      const opened = await this.writer.openAttempt(intentSeq, {
        opId: `cancel-probe:${String(intentSeq)}`,
        notAfter: this.notAfter(),
      });
      if (opened.cancelled) {
        return { kind: 'cancelled', terminalSeq: opened.terminalSeq };
      }
      // Unreachable under a closer; fail loud rather than dispatch.
      throw new EffectLaneRefusedError(
        'reconcile-only',
        'the pre-attempt re-fold did not cancel under a closer with zero attempts',
      );
    }
    const open = machine.attempts.find((a) => a.open);
    const last = machine.attempts[machine.attempts.length - 1];
    const truth = await this.providerTruth(machine, open?.seq ?? last?.seq);
    if (truth !== undefined && truth.found) {
      if (open !== undefined) {
        await this.writer.appendOutcome(intentSeq, open.seq, {
          opId: `outcome:${String(open.seq)}`,
          outcome: 'accepted',
          detail: `recovered under the ${closerName}: the provider holds the effect`,
        });
      }
      return this.recordReceipt(
        intentSeq,
        `recovered:${String(open?.seq ?? machine.receipts.length + 1)}`,
        truth.receipt,
        {},
      );
    }
    if (truth !== undefined && !truth.found && truth.acceptanceClosed) {
      if (open !== undefined) {
        await this.writer.appendOutcome(intentSeq, open.seq, {
          opId: `outcome:${String(open.seq)}`,
          outcome: 'failed',
          detail: `recovered under the ${closerName}: acceptance closed with no effect`,
        });
      }
      const fresh = await this.machine(intentSeq);
      const provablyNoEffect = fresh.attempts.every((a) => !a.open && a.outcome === 'failed');
      if (provablyNoEffect) {
        const terminal = await this.writer.appendTerminal(intentSeq, {
          opId: `cancel:${String(intentSeq)}`,
          terminal: 'cancelled-before-dispatch',
          reason:
            `the ${closerName} at seq ${String(closer?.seq ?? -1)} plus an acceptance ` +
            'closing negative: every attempt provably failed, so the journal proves no effect',
          ...(closer === undefined ? {} : { causalRef: closer.seq }),
        });
        return { kind: 'cancelled', terminalSeq: terminal.seq };
      }
    }
    return this.quarantine(
      intentSeq,
      `recovery under the ${closerName} at seq ${String(closer?.seq ?? -1)} is reconcile ` +
        'only, and the provider could neither prove the effect nor close acceptance; ' +
        'manual disposition with the closer on the record',
    );
  }
}
