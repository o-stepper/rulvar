/**
 * EffectLaneWriter (plan 45, rfcs/effects.md sections 4.3 to 4.5): the
 * append surface of the effect lane. `consumeApprovalAndRecordIntent`
 * is ONE append, not one transaction: the writer folds the journal,
 * computes the tail, evaluates the consumption verdict, and contends
 * the position through the store's `(runId, seq)` uniqueness (store
 * obligation A5). Every lane append follows the universal contention
 * rule: an uncertain append result reloads and searches for its own
 * operation id BEFORE any retry (an append can commit and its ack can
 * be lost), a loser re-verdicts at the new tail, and a give-up is a
 * durable standalone `refused` record, never a silent return.
 *
 * The verdict authority is the fold itself: the writer evaluates a
 * candidate entry by running EffectLaneFold over the loaded prefix
 * plus the hypothetical append, so writer and reader can never
 * disagree about what a position means.
 *
 * Stores: production mode REQUIRES a LeasableStore with `fencedWrites`
 * (a superseded holder's lane append dies on the store's fence, kill
 * point 16) and honors the EffectLaneStore restoration generation when
 * the store exposes one (kill point 25: a restored store comes up with
 * dispatch disabled until a fresh epoch cites the bumped generation).
 * `singleProcess: true` admits a plain store with explicitly
 * single-process semantics, the conformance posture for the in-memory
 * reference store, which is not leasable at all.
 */
import { CURRENT_HASH_VERSION, type JournalEntry } from '../l0/entries.js';
import type { Json } from '../l0/json.js';
import { ConfigError, EffectLaneRefusedError, LeaseHeldError, RulvarError } from '../l0/errors.js';
import type { EffectLaneStore, JournalStore, Lease, LeasableStore } from '../l0/spi/store.js';
import { EffectLaneFold, type EffectMachine } from './fold.js';
import {
  approvalLicensedKey,
  readApprovalExpired,
  type EffectBudgets,
  type EffectCapabilityRow,
  type EffectClass,
  type EffectLookupQualification,
  type EffectTerminalState,
} from './types.js';

const isLeasable = (store: JournalStore): store is LeasableStore => {
  const candidate = store as Partial<LeasableStore>;
  return (
    typeof candidate.acquire === 'function' &&
    typeof candidate.renew === 'function' &&
    typeof candidate.release === 'function'
  );
};

const hasEffectLane = (store: JournalStore): store is EffectLaneStore =>
  (store as Partial<EffectLaneStore>).effectLane === true &&
  typeof (store as Partial<EffectLaneStore>).restorationGeneration === 'function';

export interface EffectLaneWriterOptions {
  store: JournalStore;
  runId: string;
  /** Lease owner identity for the lane session (production mode). */
  owner?: string;
  /**
   * Explicitly single-process semantics: admits a store without leases
   * and without `fencedWrites` (the in-memory reference store). A
   * production effect lane never sets this; the conformance kit does.
   */
  singleProcess?: boolean;
  /** Injectable clock (ISO instants); tests pin it. */
  now?: () => string;
}

export interface EffectIntentSpec {
  opId: string;
  logicalKey: string;
  approvalRef: number;
  effectClass: EffectClass;
  capabilityRow: EffectCapabilityRow;
  lookupQualification?: EffectLookupQualification;
  argumentsHash: string;
  artifactHash?: string;
  configFingerprint?: string;
  budgets: EffectBudgets;
  compensates?: number;
  successorOf?: number;
}

export interface EffectConsumeResult {
  intentSeq: number;
  machine: EffectMachine;
  /** True when the opId was already in the journal (recovery). */
  replayed: boolean;
}

export interface EffectAppendResult {
  seq: number;
  replayed: boolean;
}

const APPEND_RETRIES = 8;

/**
 * Opens the effect lane on one run's journal: acquires the lane lease
 * in production mode and validates the store capabilities. The lane
 * operates on SETTLED runs (the admission predicate requires
 * `settled: true`), so it never contends with a live engine segment,
 * only with other lane holders, which is exactly what the lease and
 * the A5 contention rule arbitrate.
 */
export async function openEffectLane(options: EffectLaneWriterOptions): Promise<EffectLaneWriter> {
  const writer = new EffectLaneWriter(options);
  await writer.open();
  return writer;
}

export class EffectLaneWriter {
  private readonly store: JournalStore;
  private readonly runId: string;
  private readonly owner: string;
  private readonly singleProcess: boolean;
  private readonly now: () => string;
  private lease?: Lease;
  private entries: JournalEntry[] = [];
  private fold: EffectLaneFold;
  private opened = false;
  private closed = false;

  constructor(options: EffectLaneWriterOptions) {
    this.store = options.store;
    this.runId = options.runId;
    this.owner = options.owner ?? 'effect-lane';
    this.singleProcess = options.singleProcess ?? false;
    this.now = options.now ?? ((): string => new Date().toISOString());
    if (!this.singleProcess) {
      if (!isLeasable(this.store)) {
        throw new ConfigError(
          'the effect lane requires a LeasableStore in production mode; a store without ' +
            'leases is admitted only under singleProcess: true, which is the conformance ' +
            'posture for explicitly single-process semantics (rfcs/effects.md section 4.4)',
        );
      }
      if (this.store.fencedWrites !== true) {
        throw new ConfigError(
          'the effect lane requires fencedWrites in production mode: without the fence a ' +
            'superseded holder can append lane traffic under a stale lease (kill point 16)',
        );
      }
    }
    this.fold = new EffectLaneFold([]);
  }

  async open(): Promise<void> {
    if (this.opened) {
      return;
    }
    if (!this.singleProcess && isLeasable(this.store)) {
      this.lease = await this.store.acquire(this.runId, this.owner);
    }
    await this.reload();
    this.opened = true;
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    if (this.lease !== undefined && isLeasable(this.store)) {
      await this.store.release(this.lease);
    }
  }

  /** The current fold over the writer's loaded view. */
  view(): EffectLaneFold {
    return this.fold;
  }

  /** Reloads the journal and returns the fresh fold. */
  async refresh(): Promise<EffectLaneFold> {
    await this.reload();
    return this.fold;
  }

  private async reload(): Promise<void> {
    this.entries = await this.store.load(this.runId);
    this.fold = new EffectLaneFold(this.entries);
  }

  private tail(): number {
    let max = -1;
    for (const entry of this.entries) {
      if (entry.seq > max) {
        max = entry.seq;
      }
    }
    return max;
  }

  private template(seq: number, opId: string, value: Json): JournalEntry {
    return {
      hashVersion: CURRENT_HASH_VERSION,
      seq,
      scope: 'effects',
      key: opId,
      ordinal: 0,
      kind: 'decision',
      status: 'ok',
      spanId: 'effects',
      startedAt: this.now(),
      value,
    };
  }

  private findOpId(opId: string): number | undefined {
    for (const entry of this.entries) {
      const value = entry.value as { opId?: unknown } | null | undefined;
      if (entry.kind === 'decision' && value?.opId === opId) {
        return entry.seq;
      }
    }
    return undefined;
  }

  /**
   * Validates the store's restoration generation against the latest
   * epoch (kill point 25): a mismatch disables every lane append until
   * a fresh epoch cites the bumped generation.
   */
  private async assertRestorationCurrent(context: string): Promise<void> {
    if (!hasEffectLane(this.store)) {
      return;
    }
    const storeGeneration = await this.store.restorationGeneration();
    const epoch = this.fold.currentEpoch();
    if (epoch === undefined) {
      return;
    }
    if ((epoch.restorationGeneration ?? 0) !== storeGeneration) {
      throw new EffectLaneRefusedError(
        'restoration-generation-stale',
        `${context}: the store's restoration generation is ${String(storeGeneration)} but ` +
          `the journal's latest effect_epoch recorded ` +
          `${String(epoch.restorationGeneration ?? 0)}; the store was restored, so effect ` +
          'dispatch is disabled until an operator appends a fresh epoch citing the bumped ' +
          'generation and reconciliation completes (rfcs/effects.md section 4.5, item 3)',
      );
    }
  }

  /**
   * The universal lane append (RFC section 4.3, item 2): append at the
   * tail, and on ANY uncertain result reload and search for the
   * operation id before retrying. `verdict` re-evaluates the caller's
   * precondition at each fresh tail; returning a string refuses with
   * that reason instead of appending.
   */
  private async laneAppend(
    opId: string,
    payload: Json,
    verdict?: () => string | undefined,
  ): Promise<EffectAppendResult> {
    if (this.closed) {
      throw new ConfigError('the effect lane writer is closed');
    }
    for (let attempt = 0; attempt < APPEND_RETRIES; attempt += 1) {
      const existing = this.findOpId(opId);
      if (existing !== undefined) {
        return { seq: existing, replayed: true };
      }
      const reason = verdict?.();
      if (reason !== undefined) {
        throw new EffectLaneRefusedError('verdict-refused', reason);
      }
      const seq = this.tail() + 1;
      const entry = this.template(seq, opId, payload);
      try {
        await this.store.append(this.runId, entry, this.lease);
        this.entries.push(entry);
        this.fold = new EffectLaneFold(this.entries);
        return { seq, replayed: false };
      } catch (thrown) {
        if (thrown instanceof LeaseHeldError) {
          throw thrown;
        }
        await this.reload();
        const landed = this.findOpId(opId);
        if (landed !== undefined) {
          // The ambiguous commit: the append committed and the ack
          // was lost. The reload found our own operation id, so this
          // IS our transition: the committed row is reused and no
          // duplicate is appended.
          return { seq: landed, replayed: false };
        }
        const contention =
          thrown instanceof RulvarError && thrown.code === 'journal_order_violation';
        if (!contention) {
          throw thrown;
        }
        // A loser at the contended position: loop, re-verdict at the
        // new tail.
      }
    }
    throw new EffectLaneRefusedError(
      'append-contention',
      `the lane append for operation '${opId}' lost the tail ${String(APPEND_RETRIES)} ` +
        'times; giving up',
    );
  }

  /**
   * Appends the run incarnation's epoch fact (RFC section 4.5, item
   * 2) when the latest epoch does not already record this generation
   * and the store's current restoration generation. Idempotent by its
   * derived operation id.
   */
  async ensureEpoch(generation: string): Promise<EffectAppendResult> {
    await this.reload();
    const storeGeneration = hasEffectLane(this.store)
      ? await this.store.restorationGeneration()
      : undefined;
    const current = this.fold.currentEpoch();
    if (
      current !== undefined &&
      current.generation === generation &&
      (current.restorationGeneration ?? 0) === (storeGeneration ?? 0)
    ) {
      return { seq: current.seq, replayed: true };
    }
    const opId = `effect-epoch:${generation}:${String(storeGeneration ?? 0)}`;
    return this.laneAppend(opId, {
      decisionType: 'effect_epoch',
      opId,
      generation,
      ...(storeGeneration === undefined ? {} : { restorationGeneration: storeGeneration }),
    });
  }

  /**
   * Consumes a standing approval and records the intent as ONE append
   * (RFC section 4.3). Intake refusals (an effect approval without a
   * deadline; a grant expiry the local clock has crossed, which the
   * writer first materializes as an appended `approval_expired`
   * decision, the deterministic truth) throw typed WITHOUT appending
   * an intent. A contention give-up appends a durable standalone
   * `refused` record, then throws.
   */
  async consumeApprovalAndRecordIntent(spec: EffectIntentSpec): Promise<EffectConsumeResult> {
    await this.reload();
    await this.assertRestorationCurrent('consumeApprovalAndRecordIntent');
    const existing = this.findOpId(spec.opId);
    if (existing !== undefined) {
      const machine = this.fold.machineAt(existing);
      if (machine === undefined) {
        throw new EffectLaneRefusedError(
          'operation-id-collision',
          `operation '${spec.opId}' landed at seq ${String(existing)} but is not an intent`,
        );
      }
      return { intentSeq: existing, machine, replayed: true };
    }
    await this.intakeApproval(spec);
    const payload: Json = {
      decisionType: 'effect_intent',
      opId: spec.opId,
      logicalKey: spec.logicalKey,
      approvalRef: spec.approvalRef,
      epochRef: this.fold.currentEpoch()?.seq ?? -1,
      effectClass: spec.effectClass,
      capabilityRow: spec.capabilityRow,
      ...(spec.lookupQualification === undefined
        ? {}
        : { lookupQualification: spec.lookupQualification }),
      argumentsHash: spec.argumentsHash,
      ...(spec.artifactHash === undefined ? {} : { artifactHash: spec.artifactHash }),
      ...(spec.configFingerprint === undefined
        ? {}
        : { configFingerprint: spec.configFingerprint }),
      budgets: spec.budgets as unknown as Json,
      ...(spec.compensates === undefined ? {} : { compensates: spec.compensates }),
      ...(spec.successorOf === undefined ? {} : { successorOf: spec.successorOf }),
    };
    const verdict = (): string | undefined => {
      const epoch = this.fold.currentEpoch();
      if (epoch === undefined) {
        return 'no effect_epoch precedes the intent; call ensureEpoch first';
      }
      (payload as Record<string, Json>).epochRef = epoch.seq;
      const seq = this.tail() + 1;
      const candidate = this.template(seq, spec.opId, payload);
      const folded = new EffectLaneFold([...this.entries, candidate]);
      const classification = folded.classificationOf(seq);
      if (classification?.classification === 'applied') {
        return undefined;
      }
      if (classification?.classification === 'void') {
        return `the consumption verdict refused: ${classification.reason} (${classification.detail})`;
      }
      return `the candidate intent did not fold applied: ${JSON.stringify(classification)}`;
    };
    try {
      const landed = await this.laneAppend(spec.opId, payload, verdict);
      const machine = this.fold.machineAt(landed.seq);
      if (machine === undefined || !machine.consumed) {
        throw new EffectLaneRefusedError(
          'intent-folded-void',
          `the landed intent at seq ${String(landed.seq)} folded void: ` +
            `${JSON.stringify(machine?.voidReason)}`,
        );
      }
      return { intentSeq: landed.seq, machine, replayed: landed.replayed };
    } catch (thrown) {
      if (
        thrown instanceof EffectLaneRefusedError &&
        (thrown.rule === 'append-contention' || thrown.rule === 'verdict-refused')
      ) {
        const refuseOp = `effect-refused:${spec.opId}`;
        await this.laneAppend(refuseOp, {
          decisionType: 'effect_terminal',
          opId: refuseOp,
          terminal: 'refused',
          logicalKey: spec.logicalKey,
          reason: thrown.message,
        });
      }
      throw thrown;
    }
  }

  /** Intake rules that refuse BEFORE any intent append. */
  private async intakeApproval(spec: EffectIntentSpec): Promise<void> {
    const approval = this.entries.find((entry) => entry.seq === spec.approvalRef);
    if (approval === undefined || approval.kind !== 'approval') {
      throw new EffectLaneRefusedError(
        'no-such-approval',
        `no approval suspension at seq ${String(spec.approvalRef)}`,
      );
    }
    if (approval.deadlineAt === undefined) {
      throw new EffectLaneRefusedError(
        'approval-deadline-required',
        'an approval that licenses an effect MUST carry a deadline (rfcs/effects.md ' +
          'section 3.1, item 1); this one has none, so the effect is refused at intake',
      );
    }
    const licensed = approvalLicensedKey(approval);
    if (licensed !== spec.logicalKey) {
      throw new EffectLaneRefusedError(
        'approval-key-mismatch',
        `the approval licenses '${licensed ?? '<none>'}' and the intent claims ` +
          `'${spec.logicalKey}'`,
      );
    }
    // The grant expiry, materialized: the fold never reads a wall
    // clock, so a crossing becomes effective only as an appended
    // decision; the local comparison here is the fail-closed advisory
    // guard that triggers the append.
    const resolutionValue = this.allowValueOf(spec.approvalRef);
    const expiresAt =
      typeof resolutionValue?.expiresAt === 'string' ? resolutionValue.expiresAt : undefined;
    if (expiresAt !== undefined && this.now() > expiresAt) {
      const alreadyExpired = this.entries.some(
        (entry) => readApprovalExpired(entry)?.targetRef === spec.approvalRef,
      );
      if (!alreadyExpired) {
        const opId = `approval-expired:${String(spec.approvalRef)}`;
        await this.laneAppend(opId, {
          decisionType: 'approval_expired',
          opId,
          targetRef: spec.approvalRef,
          expiresAt,
          observer: this.owner,
        });
      }
      throw new EffectLaneRefusedError(
        'approval-expired',
        `the allow's recorded expiry ${expiresAt} has crossed; the crossing is ` +
          'materialized as an appended approval_expired decision and the intent is refused',
      );
    }
  }

  private allowValueOf(
    approvalRef: number,
  ): { decision?: unknown; expiresAt?: unknown } | undefined {
    for (const entry of this.entries) {
      if (entry.kind === 'resolution' && entry.resolution?.target === approvalRef) {
        return entry.resolution.value as { decision?: unknown; expiresAt?: unknown } | undefined;
      }
    }
    return undefined;
  }

  /**
   * Opens one dispatch attempt (RFC section 3.1, item 3), with the
   * pre-attempt re-fold of section 4.3, item 5: a revocation or expiry
   * with ZERO attempts cancels cleanly (the writer appends
   * `cancelled-before-dispatch` and reports it); with an open history
   * it refuses typed, because recovery from that position is
   * reconcile-only on every capability row.
   */
  async openAttempt(
    intentSeq: number,
    spec: { opId: string; notAfter: string; idempotencyKey?: string; transport?: string },
  ): Promise<
    | { cancelled: true; terminalSeq: number }
    | { cancelled: false; attemptSeq: number; replayed: boolean }
  > {
    await this.reload();
    await this.assertRestorationCurrent('openAttempt');
    const epoch = this.fold.currentEpoch();
    if (epoch !== undefined && epoch.needsReconciliation && !epoch.reconciled) {
      throw new EffectLaneRefusedError(
        'reconciliation-pending',
        `the current epoch (seq ${String(epoch.seq)}) was born from a restore and its ` +
          'reconciliation sweep has not completed; attempt dispatch is disabled until an ' +
          'effect_reconciliation_complete decision cites it (RFC section 4.5, item 3)',
      );
    }
    const machine = this.requireMachine(intentSeq);
    const existing = this.findOpId(spec.opId);
    if (existing !== undefined) {
      return { cancelled: false, attemptSeq: existing, replayed: true };
    }
    if (machine.terminal !== undefined) {
      throw new EffectLaneRefusedError(
        'machine-closed',
        `the intent at seq ${String(intentSeq)} closed '${machine.terminal.terminal}' at ` +
          `seq ${String(machine.terminal.seq)}`,
      );
    }
    if (machine.postIntentCloser !== undefined) {
      if (machine.attempts.length === 0) {
        const opId = `effect-cancel:${String(intentSeq)}:${String(machine.postIntentCloser.seq)}`;
        const landed = await this.laneAppend(opId, {
          decisionType: 'effect_terminal',
          opId,
          intentRef: intentSeq,
          terminal: 'cancelled-before-dispatch',
          reason:
            `the approval was ${machine.postIntentCloser.kind} at seq ` +
            `${String(machine.postIntentCloser.seq)} with zero attempt records; the journal ` +
            'proves no conforming send ever happened',
          causalRef: machine.postIntentCloser.seq,
        });
        return { cancelled: true, terminalSeq: landed.seq };
      }
      throw new EffectLaneRefusedError(
        'reconcile-only',
        `the approval was ${machine.postIntentCloser.kind} at seq ` +
          `${String(machine.postIntentCloser.seq)} and this intent has attempt history; ` +
          're-dispatch is disabled on EVERY capability row (RFC section 4.7); recover to a ' +
          'receipt, an acceptance-closing negative, or quarantine',
      );
    }
    if (machine.attempts.length >= machine.budgets.attempts) {
      throw new EffectLaneRefusedError(
        'attempts-exhausted',
        `the intent's attempt budget (${String(machine.budgets.attempts)}) is spent; the ` +
          'reconciler quarantines an exhausted intent, it never loops',
      );
    }
    const ordinal = machine.attempts.length + 1;
    const landed = await this.laneAppend(spec.opId, {
      decisionType: 'effect_attempt',
      opId: spec.opId,
      intentRef: intentSeq,
      ordinal,
      notAfter: spec.notAfter,
      ...(spec.idempotencyKey === undefined ? {} : { idempotencyKey: spec.idempotencyKey }),
      ...(spec.transport === undefined ? {} : { transport: spec.transport }),
    });
    return { cancelled: false, attemptSeq: landed.seq, replayed: landed.replayed };
  }

  /** Classifies one open attempt's result. */
  async appendOutcome(
    intentSeq: number,
    attemptSeq: number,
    spec: { opId: string; outcome: 'accepted' | 'failed' | 'unknown'; detail?: string },
  ): Promise<EffectAppendResult> {
    await this.reload();
    this.requireMachine(intentSeq);
    return this.laneAppend(spec.opId, {
      decisionType: 'effect_outcome',
      opId: spec.opId,
      intentRef: intentSeq,
      attemptRef: attemptSeq,
      outcome: spec.outcome,
      ...(spec.detail === undefined ? {} : { detail: spec.detail }),
    });
  }

  /** Records a receipt observation with the caller's verification verdict. */
  async appendReceipt(
    intentSeq: number,
    spec: {
      opId: string;
      verification: 'verified' | 'unverified';
      transferId?: string;
      amount?: number;
      currency?: string;
      documentHash?: string;
      providerRef?: string;
      timestamp?: string;
      detail?: string;
    },
  ): Promise<EffectAppendResult> {
    await this.reload();
    this.requireMachine(intentSeq);
    const { opId, ...rest } = spec;
    return this.laneAppend(opId, {
      decisionType: 'effect_receipt',
      opId,
      intentRef: intentSeq,
      ...rest,
    });
  }

  /** Appends a terminal transition; the fold's legality rules decide. */
  async appendTerminal(
    intentSeq: number,
    spec: { opId: string; terminal: EffectTerminalState; reason?: string; causalRef?: number },
  ): Promise<EffectAppendResult> {
    await this.reload();
    this.requireMachine(intentSeq);
    const landed = await this.laneAppend(spec.opId, {
      decisionType: 'effect_terminal',
      opId: spec.opId,
      intentRef: intentSeq,
      terminal: spec.terminal,
      ...(spec.reason === undefined ? {} : { reason: spec.reason }),
      ...(spec.causalRef === undefined ? {} : { causalRef: spec.causalRef }),
    });
    const classification = this.fold.classificationOf(landed.seq);
    if (classification !== undefined && classification.classification === 'invalid') {
      throw new EffectLaneRefusedError('terminal-invalid', classification.detail);
    }
    return landed;
  }

  /** Records a linked incident on a machine. */
  async appendIncident(
    intentSeq: number,
    spec: { opId: string; incident: string; causalRef?: number; detail?: string },
  ): Promise<EffectAppendResult> {
    await this.reload();
    this.requireMachine(intentSeq);
    const { opId, ...rest } = spec;
    return this.laneAppend(opId, {
      decisionType: 'effect_incident',
      opId,
      intentRef: intentSeq,
      ...rest,
    });
  }

  /** Records a human disposition of a quarantine or an incident. */
  async appendDisposition(
    intentSeq: number,
    spec: {
      opId: string;
      principal: string;
      reason: string;
      disposition: string;
      causalRef?: number;
    },
  ): Promise<EffectAppendResult> {
    await this.reload();
    this.requireMachine(intentSeq);
    const { opId, ...rest } = spec;
    return this.laneAppend(opId, {
      decisionType: 'effect_disposition',
      opId,
      intentRef: intentSeq,
      ...rest,
    });
  }

  /** The writer's current loaded entries (read-only snapshot). */
  async entriesSnapshot(): Promise<readonly JournalEntry[]> {
    await this.reload();
    return [...this.entries];
  }

  /** A durable standalone refusal for a logical key (no machine). */
  async appendStandaloneRefusal(spec: {
    opId: string;
    logicalKey: string;
    reason: string;
  }): Promise<EffectAppendResult> {
    await this.reload();
    return this.laneAppend(spec.opId, {
      decisionType: 'effect_terminal',
      opId: spec.opId,
      terminal: 'refused',
      logicalKey: spec.logicalKey,
      reason: spec.reason,
    });
  }

  /** A durable standalone quarantine (the kill 25 sweep records). */
  async appendStandaloneQuarantine(spec: {
    opId: string;
    logicalKey: string;
    reason: string;
  }): Promise<EffectAppendResult> {
    await this.reload();
    return this.laneAppend(spec.opId, {
      decisionType: 'effect_terminal',
      opId: spec.opId,
      terminal: 'quarantined',
      logicalKey: spec.logicalKey,
      reason: spec.reason,
    });
  }

  /** Journals one provider probe (the durable lookup budget row). */
  async appendProbe(
    intentSeq: number,
    spec: {
      opId?: string;
      probe: 'lookup' | 'close-acceptance';
      found: boolean;
      acceptanceClosed?: boolean;
    },
  ): Promise<EffectAppendResult> {
    await this.reload();
    const machine = this.requireMachine(intentSeq);
    if (machine.probes.length >= machine.budgets.lookups) {
      throw new EffectLaneRefusedError(
        'lookups-exhausted',
        `the intent's lookup budget (${String(machine.budgets.lookups)}) is spent; the ` +
          'reconciler quarantines an exhausted intent, it never loops',
      );
    }
    const { opId: given, ...rest } = spec;
    const opId = given ?? `probe:${String(intentSeq)}:${String(machine.probes.length + 1)}`;
    return this.laneAppend(opId, {
      decisionType: 'effect_probe',
      opId,
      intentRef: intentSeq,
      ...rest,
    });
  }

  /** Releases a restoration epoch after its sweep (RFC 4.5, item 3). */
  async appendReconciliationComplete(spec: {
    opId: string;
    epochRef: number;
    swept: number;
  }): Promise<EffectAppendResult> {
    await this.reload();
    const { opId, ...rest } = spec;
    return this.laneAppend(opId, {
      decisionType: 'effect_reconciliation_complete',
      opId,
      ...rest,
    });
  }

  private requireMachine(intentSeq: number): EffectMachine {
    const machine = this.fold.machineAt(intentSeq);
    if (machine === undefined || !machine.consumed) {
      throw new EffectLaneRefusedError(
        'no-such-intent',
        `no consumed effect intent at seq ${String(intentSeq)}`,
      );
    }
    return machine;
  }
}
