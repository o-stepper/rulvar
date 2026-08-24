/**
 * EffectLaneFold (plan 45, rfcs/effects.md section 4): the pure fold
 * that decides what the effect lane's journal bytes MEAN. One pass by
 * seq, bit-identical on every store returning the same entries, no
 * clocks (clock facts enter only as appended decisions, RFC section
 * 4.5) and no store calls. The fold is the single authority: the
 * writer (plan 45 train two) appends what this fold licenses and the
 * reconciler recovers from what this fold reports.
 *
 * The rules, exactly:
 * - Consumption (section 4.3): an `effect_intent` consumed its approval
 *   when, over the STRICT prefix of its position, the referenced
 *   approval resolved 'allow', no `approval_revoked` and no
 *   `approval_expired` decision targeting that approval precedes the
 *   intent, the cited epoch is the latest `effect_epoch` in the prefix,
 *   the approval's own recorded key equals the intent's logical key,
 *   and no earlier non-void intent claimed the key in this epoch. A
 *   failing intent folds void with a named reason and derives the
 *   `refused` terminal.
 * - Operation ids: every lane append carries a caller-minted stable
 *   opId; a same-opId replay classifies `replay` and transitions
 *   nothing (the ambiguous-commit recovery of section 4.3, item 2).
 * - First terminal wins (section 4.6): later would-be transitions fold
 *   `superseded`; facts after a terminal that genuinely matter fold as
 *   linked incidents on the machine, never mutations of the terminal.
 * - Re-dispatch dies at revocation (section 4.7): an `effect_attempt`
 *   whose position follows a revocation or expiry decision targeting
 *   the consumed approval classifies invalid on EVERY capability row;
 *   outcomes, receipts, and terminals stay legal, because recovery
 *   after that position is reconcile-only.
 * - `compensated` on the ORIGINAL is a derived overlay, one recorded
 *   deviation from the RFC's list of appendable terminals, with its
 *   reason: terminals are immutable and the original in the
 *   revoked-after-confirmation flow is already closed 'confirmed', so
 *   a second terminal append would violate section 4.6 itself. The
 *   fold derives the compensated disposition (confirmed original plus
 *   a confirmed compensation citing it) via effectiveEffectState; the
 *   appendable 'compensated' terminal remains legal only for a machine
 *   whose prefix already holds the confirmed compensation.
 */
import type { JournalEntry } from '../l0/entries.js';
import { ResolutionFold } from '../journal/resolution.js';
import {
  approvalLicensedKey,
  readApprovalExpired,
  readApprovalRevoked,
  readEffectLaneDecision,
  type EffectBudgets,
  type EffectCapabilityRow,
  type EffectClass,
  type EffectDeclaredDecision,
  type EffectLookupQualification,
  type EffectTerminalState,
} from './types.js';

/** Why a consumption fold refused an intent (RFC section 4.3). */
export type EffectVoidReason =
  | 'no-epoch'
  | 'stale-epoch'
  | 'no-such-approval'
  | 'approval-not-allowed'
  | 'approval-revoked'
  | 'approval-expired'
  | 'approval-names-no-key'
  | 'approval-key-mismatch'
  | 'duplicate-logical-key'
  | 'compensation-depth'
  | 'bad-causal-ref';

/** Fold classification of one lane entry; NEVER persisted. */
export type EffectLaneClassification =
  | { classification: 'applied' }
  | { classification: 'replay'; firstSeq: number }
  | { classification: 'void'; reason: EffectVoidReason; detail: string }
  | { classification: 'superseded'; supersededBy: number }
  | { classification: 'incident'; intentRef: number; detail: string }
  | { classification: 'invalid'; detail: string }
  | { classification: 'malformed'; detail: string };

export type EffectMachineState =
  'intent' | 'dispatching' | 'awaiting-receipt' | 'unknown' | EffectTerminalState;

export interface EffectAttemptState {
  seq: number;
  ordinal: number;
  notAfter: string;
  idempotencyKey?: string;
  transport?: string;
  open: boolean;
  outcome?: 'accepted' | 'failed' | 'unknown';
  outcomeSeq?: number;
}

export interface EffectReceiptState {
  seq: number;
  verification: 'verified' | 'unverified';
  transferId?: string;
  amount?: number;
  currency?: string;
  documentHash?: string;
  providerRef?: string;
  timestamp?: string;
  /** Seq of the earlier verified receipt this one benignly duplicates. */
  benignDuplicateOf?: number;
  /** Seq of the earlier verified receipt this one conflicts with. */
  conflictWith?: number;
}

export interface EffectIncidentState {
  seq: number;
  incident: string;
  causalRef?: number;
  detail?: string;
}

export interface EffectDispositionState {
  seq: number;
  principal: string;
  reason: string;
  disposition: string;
  causalRef?: number;
}

/** The first revocation or expiry decision AFTER the intent position. */
export interface PostIntentCloser {
  seq: number;
  kind: 'revoked' | 'expired';
}

export interface EffectMachine {
  intentSeq: number;
  opId: string;
  logicalKey: string;
  approvalRef: number;
  epochRef: number;
  effectClass: EffectClass;
  capabilityRow: EffectCapabilityRow;
  lookupQualification?: EffectLookupQualification;
  argumentsHash: string;
  artifactHash?: string;
  configFingerprint?: string;
  budgets: EffectBudgets;
  compensates?: number;
  successorOf?: number;
  /** True when the consumption fold licensed the intent. */
  consumed: boolean;
  voidReason?: { reason: EffectVoidReason; detail: string };
  state: EffectMachineState;
  attempts: EffectAttemptState[];
  receipts: EffectReceiptState[];
  incidents: EffectIncidentState[];
  dispositions: EffectDispositionState[];
  terminal?: { seq: number; terminal: EffectTerminalState; reason?: string; causalRef?: number };
  /** A pre-terminal conflicting receipt awaiting the quarantine append. */
  pendingConflict?: { seq: number; detail: string };
  /** Set at finalize; re-dispatch is disabled from this position on. */
  postIntentCloser?: PostIntentCloser;
  /** The confirmed compensation citing this intent (derived overlay). */
  compensatedBy?: number;
}

export interface EffectEpochState {
  seq: number;
  generation: string;
  restorationGeneration?: number;
}

export interface EffectDeclarationState {
  seq: number;
  declaration: EffectDeclaredDecision;
}

export interface StandaloneRefusal {
  seq: number;
  logicalKey: string;
  reason?: string;
}

/**
 * The compensated overlay (see the module doc): 'compensated' when a
 * confirmed compensation cites a confirmed original, else the
 * machine's own state.
 */
export function effectiveEffectState(machine: EffectMachine): EffectMachineState {
  if (machine.state === 'confirmed' && machine.compensatedBy !== undefined) {
    return 'compensated';
  }
  return machine.state;
}

export class EffectLaneFold {
  private readonly bySeq = new Map<number, JournalEntry>();
  private readonly machinesByIntent = new Map<number, EffectMachine>();
  private readonly canonicalByEpochKey = new Map<string, number>();
  private readonly classifications = new Map<number, EffectLaneClassification>();
  private readonly opIds = new Map<string, number>();
  private readonly epochList: EffectEpochState[] = [];
  private readonly declarationList: EffectDeclarationState[] = [];
  private readonly refusalList: StandaloneRefusal[] = [];
  /** targetRef -> ascending seqs of approval_revoked decisions. */
  private readonly revokedIndex = new Map<number, number[]>();
  /** targetRef -> ascending seqs of approval_expired decisions. */
  private readonly expiredIndex = new Map<number, number[]>();
  private readonly resolutions: ResolutionFold;

  constructor(entries: readonly JournalEntry[], resolutions?: ResolutionFold) {
    this.resolutions = resolutions ?? new ResolutionFold(entries);
    for (const entry of entries) {
      this.bySeq.set(entry.seq, entry);
      const revoked = readApprovalRevoked(entry);
      if (revoked !== undefined) {
        const list = this.revokedIndex.get(revoked.targetRef) ?? [];
        list.push(entry.seq);
        this.revokedIndex.set(revoked.targetRef, list);
      }
      const expired = readApprovalExpired(entry);
      if (expired !== undefined) {
        const list = this.expiredIndex.get(expired.targetRef) ?? [];
        list.push(entry.seq);
        this.expiredIndex.set(expired.targetRef, list);
      }
    }
    for (const entry of entries) {
      this.applyEntry(entry);
    }
    this.finalize();
  }

  machines(): EffectMachine[] {
    return [...this.machinesByIntent.values()];
  }

  machineAt(intentSeq: number): EffectMachine | undefined {
    return this.machinesByIntent.get(intentSeq);
  }

  /** The consumed intent holding `logicalKey` in the CURRENT epoch. */
  canonicalIntent(logicalKey: string): EffectMachine | undefined {
    const epoch = this.currentEpoch();
    if (epoch === undefined) {
      return undefined;
    }
    const seq = this.canonicalByEpochKey.get(`${String(epoch.seq)}:${logicalKey}`);
    return seq === undefined ? undefined : this.machinesByIntent.get(seq);
  }

  epochs(): EffectEpochState[] {
    return [...this.epochList];
  }

  currentEpoch(): EffectEpochState | undefined {
    return this.epochList[this.epochList.length - 1];
  }

  classificationOf(seq: number): EffectLaneClassification | undefined {
    return this.classifications.get(seq);
  }

  declarations(): EffectDeclarationState[] {
    return [...this.declarationList];
  }

  standaloneRefusals(): StandaloneRefusal[] {
    return [...this.refusalList];
  }

  /** Consumed machines that have not reached a terminal. */
  openMachines(): EffectMachine[] {
    return this.machines().filter((m) => m.consumed && m.terminal === undefined);
  }

  private classify(seq: number, classification: EffectLaneClassification): void {
    this.classifications.set(seq, classification);
  }

  private firstAtOrBelow(list: number[] | undefined, position: number): number | undefined {
    if (list === undefined) {
      return undefined;
    }
    for (const seq of list) {
      if (seq < position) {
        return seq;
      }
    }
    return undefined;
  }

  private firstAbove(list: number[] | undefined, position: number): number | undefined {
    if (list === undefined) {
      return undefined;
    }
    for (const seq of list) {
      if (seq > position) {
        return seq;
      }
    }
    return undefined;
  }

  private latestEpochBefore(position: number): EffectEpochState | undefined {
    let latest: EffectEpochState | undefined;
    for (const epoch of this.epochList) {
      if (epoch.seq < position) {
        latest = epoch;
      }
    }
    return latest;
  }

  private applyEntry(entry: JournalEntry): void {
    const read = readEffectLaneDecision(entry);
    if (!read.lane) {
      return;
    }
    if ('malformed' in read) {
      this.classify(entry.seq, { classification: 'malformed', detail: read.malformed });
      return;
    }
    const decision = read.decision;
    const firstSeq = this.opIds.get(decision.opId);
    if (firstSeq !== undefined) {
      this.classify(entry.seq, { classification: 'replay', firstSeq });
      return;
    }
    this.opIds.set(decision.opId, entry.seq);
    switch (decision.decisionType) {
      case 'effect_epoch': {
        this.epochList.push({
          seq: entry.seq,
          generation: decision.generation,
          ...(decision.restorationGeneration === undefined
            ? {}
            : { restorationGeneration: decision.restorationGeneration }),
        });
        this.classify(entry.seq, { classification: 'applied' });
        return;
      }
      case 'effect_declared': {
        this.declarationList.push({ seq: entry.seq, declaration: decision });
        this.classify(entry.seq, { classification: 'applied' });
        return;
      }
      case 'effect_intent': {
        this.applyIntent(entry, decision);
        return;
      }
      case 'effect_attempt': {
        const machine = this.liveMachine(entry.seq, decision.intentRef);
        if (machine === undefined) {
          return;
        }
        if (machine.terminal !== undefined) {
          this.classify(entry.seq, {
            classification: 'superseded',
            supersededBy: machine.terminal.seq,
          });
          return;
        }
        const closer = this.closerAfterIntent(machine);
        if (closer !== undefined && entry.seq > closer.seq) {
          this.classify(entry.seq, {
            classification: 'invalid',
            detail:
              `re-dispatch is disabled on every capability row from the ` +
              `${closer.kind === 'revoked' ? 'revocation' : 'expiry'} at seq ` +
              `${String(closer.seq)} on (RFC section 4.7); recovery is reconcile-only`,
          });
          return;
        }
        if (machine.attempts.some((attempt) => attempt.open)) {
          this.classify(entry.seq, {
            classification: 'invalid',
            detail: 'at most one attempt may be open at a time (RFC section 3.1)',
          });
          return;
        }
        machine.attempts.push({
          seq: entry.seq,
          ordinal: decision.ordinal,
          notAfter: decision.notAfter,
          ...(decision.idempotencyKey === undefined
            ? {}
            : { idempotencyKey: decision.idempotencyKey }),
          ...(decision.transport === undefined ? {} : { transport: decision.transport }),
          open: true,
        });
        machine.state = 'dispatching';
        this.classify(entry.seq, { classification: 'applied' });
        return;
      }
      case 'effect_outcome': {
        const machine = this.liveMachine(entry.seq, decision.intentRef);
        if (machine === undefined) {
          return;
        }
        const attempt = machine.attempts.find((a) => a.seq === decision.attemptRef);
        if (attempt === undefined) {
          this.classify(entry.seq, {
            classification: 'invalid',
            detail: `no attempt at seq ${String(decision.attemptRef)} under this intent`,
          });
          return;
        }
        if (!attempt.open) {
          this.classify(entry.seq, {
            classification: 'invalid',
            detail: `attempt ${String(decision.attemptRef)} already closed`,
          });
          return;
        }
        attempt.open = false;
        attempt.outcome = decision.outcome;
        attempt.outcomeSeq = entry.seq;
        if (machine.terminal !== undefined) {
          const incident: EffectIncidentState = {
            seq: entry.seq,
            incident: 'post-terminal-outcome',
            causalRef: decision.attemptRef,
          };
          machine.incidents.push(incident);
          this.classify(entry.seq, {
            classification: 'incident',
            intentRef: machine.intentSeq,
            detail: 'outcome landed after the terminal; folded as a linked incident',
          });
          return;
        }
        machine.state =
          decision.outcome === 'accepted'
            ? 'awaiting-receipt'
            : decision.outcome === 'failed'
              ? 'intent'
              : 'unknown';
        this.classify(entry.seq, { classification: 'applied' });
        return;
      }
      case 'effect_receipt': {
        const machine = this.liveMachine(entry.seq, decision.intentRef);
        if (machine === undefined) {
          return;
        }
        this.applyReceipt(entry.seq, machine, decision);
        return;
      }
      case 'effect_terminal': {
        if (decision.intentRef === undefined) {
          this.refusalList.push({
            seq: entry.seq,
            logicalKey: decision.logicalKey ?? '',
            ...(decision.reason === undefined ? {} : { reason: decision.reason }),
          });
          this.classify(entry.seq, { classification: 'applied' });
          return;
        }
        const machine = this.liveMachine(entry.seq, decision.intentRef);
        if (machine === undefined) {
          return;
        }
        if (machine.terminal !== undefined) {
          this.classify(entry.seq, {
            classification: 'superseded',
            supersededBy: machine.terminal.seq,
          });
          return;
        }
        const illegality = this.terminalIllegality(entry.seq, machine, decision.terminal, decision);
        if (illegality !== undefined) {
          this.classify(entry.seq, { classification: 'invalid', detail: illegality });
          return;
        }
        machine.terminal = {
          seq: entry.seq,
          terminal: decision.terminal,
          ...(decision.reason === undefined ? {} : { reason: decision.reason }),
          ...(decision.causalRef === undefined ? {} : { causalRef: decision.causalRef }),
        };
        machine.state = decision.terminal;
        this.classify(entry.seq, { classification: 'applied' });
        return;
      }
      case 'effect_incident': {
        const machine = this.liveMachine(entry.seq, decision.intentRef);
        if (machine === undefined) {
          return;
        }
        machine.incidents.push({
          seq: entry.seq,
          incident: decision.incident,
          ...(decision.causalRef === undefined ? {} : { causalRef: decision.causalRef }),
          ...(decision.detail === undefined ? {} : { detail: decision.detail }),
        });
        this.classify(entry.seq, { classification: 'applied' });
        return;
      }
      case 'effect_disposition': {
        const machine = this.liveMachine(entry.seq, decision.intentRef);
        if (machine === undefined) {
          return;
        }
        machine.dispositions.push({
          seq: entry.seq,
          principal: decision.principal,
          reason: decision.reason,
          disposition: decision.disposition,
          ...(decision.causalRef === undefined ? {} : { causalRef: decision.causalRef }),
        });
        this.classify(entry.seq, { classification: 'applied' });
        return;
      }
    }
  }

  /** The machine a sub-record addresses, or an invalid classification. */
  private liveMachine(seq: number, intentRef: number): EffectMachine | undefined {
    const machine = this.machinesByIntent.get(intentRef);
    if (machine === undefined) {
      this.classify(seq, {
        classification: 'invalid',
        detail: `no effect intent at seq ${String(intentRef)}`,
      });
      return undefined;
    }
    if (!machine.consumed) {
      this.classify(seq, {
        classification: 'invalid',
        detail: `the intent at seq ${String(intentRef)} folded void; it has no machine`,
      });
      return undefined;
    }
    return machine;
  }

  private closerAfterIntent(machine: EffectMachine): PostIntentCloser | undefined {
    const revoked = this.firstAbove(this.revokedIndex.get(machine.approvalRef), machine.intentSeq);
    const expired = this.firstAbove(this.expiredIndex.get(machine.approvalRef), machine.intentSeq);
    if (revoked === undefined && expired === undefined) {
      return undefined;
    }
    if (revoked !== undefined && (expired === undefined || revoked <= expired)) {
      return { seq: revoked, kind: 'revoked' };
    }
    return { seq: expired as number, kind: 'expired' };
  }

  private applyIntent(
    entry: JournalEntry,
    decision: {
      opId: string;
      logicalKey: string;
      approvalRef: number;
      epochRef: number;
      effectClass: EffectClass;
      capabilityRow: EffectCapabilityRow;
      lookupQualification?: EffectLookupQualification;
      argumentsHash: string;
      artifactHash?: string;
      configFingerprint?: string;
      budgets: EffectBudgets;
      compensates?: number;
      successorOf?: number;
    },
  ): void {
    const machine: EffectMachine = {
      intentSeq: entry.seq,
      opId: decision.opId,
      logicalKey: decision.logicalKey,
      approvalRef: decision.approvalRef,
      epochRef: decision.epochRef,
      effectClass: decision.effectClass,
      capabilityRow: decision.capabilityRow,
      ...(decision.lookupQualification === undefined
        ? {}
        : { lookupQualification: decision.lookupQualification }),
      argumentsHash: decision.argumentsHash,
      ...(decision.artifactHash === undefined ? {} : { artifactHash: decision.artifactHash }),
      ...(decision.configFingerprint === undefined
        ? {}
        : { configFingerprint: decision.configFingerprint }),
      budgets: decision.budgets,
      ...(decision.compensates === undefined ? {} : { compensates: decision.compensates }),
      ...(decision.successorOf === undefined ? {} : { successorOf: decision.successorOf }),
      consumed: false,
      state: 'refused',
      attempts: [],
      receipts: [],
      incidents: [],
      dispositions: [],
    };
    this.machinesByIntent.set(entry.seq, machine);
    const voided = (reason: EffectVoidReason, detail: string): void => {
      machine.voidReason = { reason, detail };
      this.classify(entry.seq, { classification: 'void', reason, detail });
    };
    // Epoch: the cited epoch must be the latest in the strict prefix.
    const epoch = this.latestEpochBefore(entry.seq);
    if (epoch === undefined) {
      voided('no-epoch', 'no effect_epoch precedes this intent (RFC section 4.5)');
      return;
    }
    if (epoch.seq !== decision.epochRef) {
      voided(
        'stale-epoch',
        `the intent cites epoch ${String(decision.epochRef)} but the latest epoch is ` +
          `${String(epoch.seq)}; a recreated run never spends a dead incarnation's approvals`,
      );
      return;
    }
    // The approval: exists, resolved 'allow' BEFORE this position.
    const approval = this.bySeq.get(decision.approvalRef);
    if (approval === undefined || approval.kind !== 'approval') {
      voided('no-such-approval', `no approval suspension at seq ${String(decision.approvalRef)}`);
      return;
    }
    const state = this.resolutions.suspensionState(decision.approvalRef);
    const allow =
      state.state === 'resolved' &&
      state.by < entry.seq &&
      (state.value as { decision?: unknown } | null)?.decision === 'allow';
    if (!allow) {
      voided(
        'approval-not-allowed',
        `the approval at seq ${String(decision.approvalRef)} had not resolved 'allow' ` +
          'before this position; an approval never fails open',
      );
      return;
    }
    // No revocation and no expiry decision precedes the intent.
    const revokedBefore = this.firstAtOrBelow(
      this.revokedIndex.get(decision.approvalRef),
      entry.seq,
    );
    if (revokedBefore !== undefined) {
      voided(
        'approval-revoked',
        `an approval_revoked decision at seq ${String(revokedBefore)} precedes the intent`,
      );
      return;
    }
    const expiredBefore = this.firstAtOrBelow(
      this.expiredIndex.get(decision.approvalRef),
      entry.seq,
    );
    if (expiredBefore !== undefined) {
      voided(
        'approval-expired',
        `an approval_expired decision at seq ${String(expiredBefore)} precedes the intent`,
      );
      return;
    }
    // The approval licenses exactly one effect logical key.
    const licensed = approvalLicensedKey(approval);
    if (licensed === undefined) {
      voided(
        'approval-names-no-key',
        'the approval names no effectLogicalKey; it licenses no effect (fail closed)',
      );
      return;
    }
    if (licensed !== decision.logicalKey) {
      voided(
        'approval-key-mismatch',
        `the approval licenses '${licensed}', the intent claims '${decision.logicalKey}'`,
      );
      return;
    }
    // Causal references: compensation depth one, successors must exist.
    if (decision.compensates !== undefined) {
      const target = this.machinesByIntent.get(decision.compensates);
      if (target === undefined || !target.consumed) {
        voided(
          'bad-causal-ref',
          `compensates cites seq ${String(decision.compensates)}, which is not a consumed intent`,
        );
        return;
      }
      if (target.compensates !== undefined) {
        voided(
          'compensation-depth',
          'a failed compensation quarantines; it is never auto-compensated at depth two',
        );
        return;
      }
    }
    if (decision.successorOf !== undefined) {
      const target = this.machinesByIntent.get(decision.successorOf);
      if (target === undefined || !target.consumed) {
        voided(
          'bad-causal-ref',
          `successorOf cites seq ${String(decision.successorOf)}, which is not a consumed intent`,
        );
        return;
      }
    }
    // One canonical intent per logical key per epoch, whatever approval
    // it cites: two approvals never license two sends of one effect.
    const canonicalKey = `${String(epoch.seq)}:${decision.logicalKey}`;
    const holder = this.canonicalByEpochKey.get(canonicalKey);
    if (holder !== undefined) {
      voided(
        'duplicate-logical-key',
        `the canonical intent for '${decision.logicalKey}' in this epoch is seq ` +
          `${String(holder)}; retries are attempts under the one intent, never new intents`,
      );
      return;
    }
    this.canonicalByEpochKey.set(canonicalKey, entry.seq);
    machine.consumed = true;
    machine.state = 'intent';
    this.classify(entry.seq, { classification: 'applied' });
  }

  private applyReceipt(
    seq: number,
    machine: EffectMachine,
    decision: {
      verification: 'verified' | 'unverified';
      transferId?: string;
      amount?: number;
      currency?: string;
      documentHash?: string;
      providerRef?: string;
      timestamp?: string;
    },
  ): void {
    const receipt: EffectReceiptState = {
      seq,
      verification: decision.verification,
      ...(decision.transferId === undefined ? {} : { transferId: decision.transferId }),
      ...(decision.amount === undefined ? {} : { amount: decision.amount }),
      ...(decision.currency === undefined ? {} : { currency: decision.currency }),
      ...(decision.documentHash === undefined ? {} : { documentHash: decision.documentHash }),
      ...(decision.providerRef === undefined ? {} : { providerRef: decision.providerRef }),
      ...(decision.timestamp === undefined ? {} : { timestamp: decision.timestamp }),
    };
    if (decision.verification === 'unverified') {
      machine.receipts.push(receipt);
      if (machine.terminal === undefined) {
        // Unverifiable routes to unknown, never to confirmed and never
        // to silent discard (RFC section 7).
        machine.state = 'unknown';
        this.classify(seq, { classification: 'applied' });
      } else {
        machine.incidents.push({ seq, incident: 'receipt-after-terminal', causalRef: seq });
        this.classify(seq, {
          classification: 'incident',
          intentRef: machine.intentSeq,
          detail: 'unverified receipt after the terminal; disposition input, not a resurrection',
        });
      }
      return;
    }
    const prior = machine.receipts.find((r) => r.verification === 'verified');
    if (prior !== undefined) {
      const same =
        prior.transferId === receipt.transferId &&
        prior.amount === receipt.amount &&
        prior.documentHash === receipt.documentHash;
      if (same) {
        receipt.benignDuplicateOf = prior.seq;
        machine.receipts.push(receipt);
        // Confirms once, counts once (kill point 9): benign duplicates
        // are recorded, never incidents and never double confirmation.
        this.classify(seq, { classification: 'applied' });
        return;
      }
      receipt.conflictWith = prior.seq;
      machine.receipts.push(receipt);
      if (machine.terminal !== undefined) {
        machine.incidents.push({
          seq,
          incident: 'conflicting-duplicate',
          causalRef: prior.seq,
          detail: 'same logical key, different provider identity or amount, after the terminal',
        });
        this.classify(seq, {
          classification: 'incident',
          intentRef: machine.intentSeq,
          detail: 'conflicting duplicate after the terminal stands as a linked incident',
        });
        return;
      }
      machine.pendingConflict = {
        seq,
        detail: 'conflicting receipt before any terminal; the machinery quarantines the intent',
      };
      this.classify(seq, { classification: 'applied' });
      return;
    }
    machine.receipts.push(receipt);
    if (machine.terminal !== undefined) {
      machine.incidents.push({ seq, incident: 'receipt-after-terminal', causalRef: seq });
      this.classify(seq, {
        classification: 'incident',
        intentRef: machine.intentSeq,
        detail: 'a verified receipt after the terminal is disposition input, never a resurrection',
      });
      return;
    }
    this.classify(seq, { classification: 'applied' });
  }

  /** Why a terminal append is illegal in this machine state, if it is. */
  private terminalIllegality(
    seq: number,
    machine: EffectMachine,
    terminal: EffectTerminalState,
    decision: { causalRef?: number },
  ): string | undefined {
    if (terminal === 'cancelled-before-dispatch' && machine.attempts.length > 0) {
      return (
        'cancelled-before-dispatch requires ZERO attempt records: the journal must prove ' +
        'no conforming send ever happened (RFC section 3.1, item 9)'
      );
    }
    if (terminal === 'confirmed' && !machine.receipts.some((r) => r.verification === 'verified')) {
      return 'confirmed requires a verified receipt in the prefix (RFC section 3.1, item 5)';
    }
    if (terminal === 'compensated') {
      const causalRef = decision.causalRef;
      const compensation =
        causalRef === undefined ? undefined : this.machinesByIntent.get(causalRef);
      const licensed =
        compensation !== undefined &&
        compensation.consumed &&
        compensation.compensates === machine.intentSeq &&
        compensation.terminal?.terminal === 'confirmed' &&
        compensation.terminal.seq < seq;
      if (!licensed) {
        return (
          'a compensated terminal requires a confirmed compensation citing this intent in ' +
          'the prefix; the ordinary path derives the overlay instead (effectiveEffectState)'
        );
      }
    }
    return undefined;
  }

  private finalize(): void {
    for (const machine of this.machinesByIntent.values()) {
      if (!machine.consumed) {
        continue;
      }
      const closer = this.closerAfterIntent(machine);
      if (closer !== undefined) {
        machine.postIntentCloser = closer;
      }
      if (machine.terminal?.terminal === 'confirmed' && machine.compensates !== undefined) {
        const original = this.machinesByIntent.get(machine.compensates);
        if (original !== undefined && original.terminal?.terminal === 'confirmed') {
          original.compensatedBy = machine.intentSeq;
        }
      }
    }
  }
}
