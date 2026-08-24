/**
 * Effect lane decision payloads (plan 45, rfcs/effects.md): the entry
 * vocabulary of the effect intent protocol. One recorded deviation from
 * the RFC's wording, with its reason: the lane mints NO new EntryKind.
 * The kinds registry is versioned as part of the hashVersion 2 identity
 * profile, so a new kind would be a compatibility break; every effect
 * lane fact therefore rides a kind-'decision' entry whose payload
 * carries a `decisionType` discriminator, exactly like the shipped
 * `execution_scope` and `approval_revoked` decisions. Stores stay dumb
 * byte stores (obligation A4); the fold in ./fold.js is the single
 * reader of these shapes.
 *
 * Every lane payload except `approval_expired` carries a caller-minted
 * stable operation id (`opId`, the RFC's universal contention rule): an
 * uncertain append result reloads and searches for its own opId before
 * any retry, and the fold treats a same-opId replay as the same
 * transition, never a duplicate. `approval_expired` mirrors the shipped
 * `approval_revoked` shape instead (idempotent by content: any number
 * of appends materialize the same crossing).
 */
import type { Json } from '../l0/json.js';
import type { JournalEntry } from '../l0/entries.js';

/** Provider capability rows (RFC section 6); contract vocabulary. */
export type EffectCapabilityRow = 'idempotency-key' | 'lookup' | 'neither';

/**
 * What earns a provider the `lookup` row (RFC section 6): either a
 * negative that provably CLOSES acceptance, or a provider-enforced
 * unique natural key on create. Recorded on the intent so recovery
 * policy is derivable from the journal alone.
 */
export type EffectLookupQualification = 'acceptance-closing' | 'conditional-create';

/** Effect classes (RFC section 3); compensation semantics differ. */
export type EffectClass = 'monetary' | 'signing' | 'case';

/** The five appendable terminal states (RFC section 4.6). */
export type EffectTerminalState =
  'confirmed' | 'quarantined' | 'cancelled-before-dispatch' | 'compensated' | 'refused';

export const EFFECT_TERMINAL_STATES: readonly EffectTerminalState[] = [
  'confirmed',
  'quarantined',
  'cancelled-before-dispatch',
  'compensated',
  'refused',
];

/**
 * Recovery budgets recorded ON the intent (RFC section 3.1, item 2):
 * every non-terminal state is bounded, and every exhaustion path lands
 * in `quarantined`. `reconcileBy` is the overall deadline; crossing it
 * in any non-terminal state quarantines with the state recorded.
 */
export interface EffectBudgets {
  /** Dispatch attempts the intent may open, total. */
  attempts: number;
  /** Provider lookups, bounded separately from dispatch attempts. */
  lookups: number;
  /** How long `awaiting-receipt` may wait, in milliseconds. */
  receiptWaitMs: number;
  /**
   * How long a compensation may wait for its own authorization, in
   * milliseconds (RFC section 3.1, items 1 and 8); absent on effects
   * that are not compensations.
   */
  authorizationWaitMs?: number;
  /** ISO instant: the overall reconcile deadline of the intent. */
  reconcileBy: string;
}

/** The lane's decisionType discriminators, exactly. */
export type EffectLaneDecisionType =
  | 'effect_epoch'
  | 'effect_declared'
  | 'effect_intent'
  | 'effect_attempt'
  | 'effect_outcome'
  | 'effect_receipt'
  | 'effect_terminal'
  | 'effect_incident'
  | 'effect_disposition';

export const EFFECT_LANE_DECISION_TYPES: readonly EffectLaneDecisionType[] = [
  'effect_epoch',
  'effect_declared',
  'effect_intent',
  'effect_attempt',
  'effect_outcome',
  'effect_receipt',
  'effect_terminal',
  'effect_incident',
  'effect_disposition',
];

/**
 * The epoch fact (RFC section 4.5): before the first effect intent of a
 * run incarnation the engine appends the run's generation token (from
 * RunMeta.genesis, which is meta and invisible to a journal-only fold)
 * and the store-level restoration generation when the store exposes
 * one. Every intent cites the epoch entry by seq; an intent citing a
 * non-latest epoch folds void.
 */
export interface EffectEpochDecision {
  decisionType: 'effect_epoch';
  opId: string;
  /** The run incarnation's generation token (RunMeta.genesis). */
  generation: string;
  /** The store's restoration generation at append time, when exposed. */
  restorationGeneration?: number;
}

/**
 * The descriptive `declared` state (RFC section 3.1, item 1): the
 * effect is described but not yet authorized; no provider interaction
 * is legal. The bounded wait for authorization rides the licensing
 * approval's own `deadlineAt` (refused at intake without one), so this
 * record is descriptive, never load-bearing for consumption.
 */
export interface EffectDeclaredDecision {
  decisionType: 'effect_declared';
  opId: string;
  logicalKey: string;
  effectClass: EffectClass;
  capabilityRow: EffectCapabilityRow;
  argumentsHash: string;
  /** Monetary amount or document hash, per class; descriptive. */
  amountOrDocumentHash?: string;
}

/**
 * The single linearization append (RFC section 4.3): consuming the
 * approval and recording the intent is THIS one entry. Whether it
 * consumed is a pure function of the strict journal prefix before it;
 * the fold computes the verdict, and a void intent derives the
 * `refused` terminal.
 */
export interface EffectIntentDecision {
  decisionType: 'effect_intent';
  opId: string;
  logicalKey: string;
  /** Seq of the approval suspension this intent consumes. */
  approvalRef: number;
  /** Seq of the `effect_epoch` decision this intent cites. */
  epochRef: number;
  effectClass: EffectClass;
  capabilityRow: EffectCapabilityRow;
  /** Required when capabilityRow is 'lookup' (RFC section 6). */
  lookupQualification?: EffectLookupQualification;
  argumentsHash: string;
  /** The accepted artifact's hash (RV4207); binds bytes to the effect. */
  artifactHash?: string;
  /** The terminal envelope's configFingerprint at admission. */
  configFingerprint?: string;
  budgets: EffectBudgets;
  /** Seq of the intent this one reverses (depth one, distinct key). */
  compensates?: number;
  /** Seq of the intent this one succeeds (corrections, distinct key). */
  successorOf?: number;
}

/**
 * One dispatch attempt, appended BEFORE the network send (RFC section
 * 3.1, item 3): at most one attempt may be open at a time, and attempts
 * are sub-records of the ONE intent, never new intents.
 */
export interface EffectAttemptDecision {
  decisionType: 'effect_attempt';
  opId: string;
  intentRef: number;
  /** 1-based attempt order under the intent. */
  ordinal: number;
  /** The attempt's send deadline (defense in depth, never proof). */
  notAfter: string;
  /** The provider idempotency key, when the row carries one. */
  idempotencyKey?: string;
  transport?: string;
}

/** The classified result of one attempt. */
export interface EffectOutcomeDecision {
  decisionType: 'effect_outcome';
  opId: string;
  intentRef: number;
  attemptRef: number;
  /**
   * 'accepted': the provider took the request (receipt expected);
   * 'failed': a classified failure that provably did not execute;
   * 'unknown': unclassifiable from what the journal holds.
   */
  outcome: 'accepted' | 'failed' | 'unknown';
  detail?: string;
}

/**
 * A receipt observation, verified against the trust envelope BEFORE it
 * is appended as 'verified' (RFC section 7): an unverifiable receipt
 * appends as 'unverified' and routes the machine to `unknown`, never to
 * `confirmed` and never to silent discard.
 */
export interface EffectReceiptDecision {
  decisionType: 'effect_receipt';
  opId: string;
  intentRef: number;
  verification: 'verified' | 'unverified';
  /** Provider transfer id (monetary); duplicate classification key. */
  transferId?: string;
  amount?: number;
  currency?: string;
  /** Signed document hash (signing class). */
  documentHash?: string;
  /** Provider case or object reference. */
  providerRef?: string;
  timestamp?: string;
  detail?: string;
}

/**
 * A terminal transition (RFC section 4.6): the first terminal append
 * for an intent closes it; later would-be transitions fold as durable
 * no-ops with a superseded-by reason. A terminal without `intentRef`
 * is a standalone `refused` record (the writer's durable give-up when
 * no intent ever landed); it requires `logicalKey`.
 */
export interface EffectTerminalDecision {
  decisionType: 'effect_terminal';
  opId: string;
  intentRef?: number;
  logicalKey?: string;
  terminal: EffectTerminalState;
  reason?: string;
  /** Causal reference (for 'compensated': the compensation intent). */
  causalRef?: number;
}

/**
 * A linked incident (RFC section 4.6, item 2): a fact that arrived
 * after a terminal and genuinely matters. Durable, causally linked,
 * surfaced, requiring disposition; never a mutation of the terminal.
 */
export interface EffectIncidentDecision {
  decisionType: 'effect_incident';
  opId: string;
  intentRef: number;
  incident: string;
  causalRef?: number;
  detail?: string;
}

/** A journaled human disposition of a quarantine or an incident. */
export interface EffectDispositionDecision {
  decisionType: 'effect_disposition';
  opId: string;
  intentRef: number;
  principal: string;
  reason: string;
  disposition: string;
  /** The incident this disposition answers, when not the quarantine. */
  causalRef?: number;
}

/**
 * The clock fact for grant expiry (RFC section 4.5, item 1): the fold
 * never compares wall clocks, so an approval's `expiresAt` becomes
 * effective only through this appended decision. Mirrors the shipped
 * `approval_revoked` decision shape (targetRef addressing, no opId:
 * idempotent by content, appendable by any observer with append
 * rights, because it only materializes a crossing the approval's own
 * recorded expiry already determines).
 */
export interface ApprovalExpiredDecision {
  decisionType: 'approval_expired';
  targetRef: number;
  /** The recorded expiry instant this decision materializes. */
  expiresAt: string;
  observer?: string;
}

export type EffectLaneDecision =
  | EffectEpochDecision
  | EffectDeclaredDecision
  | EffectIntentDecision
  | EffectAttemptDecision
  | EffectOutcomeDecision
  | EffectReceiptDecision
  | EffectTerminalDecision
  | EffectIncidentDecision
  | EffectDispositionDecision;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isSeq = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const isPositiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const isCapabilityRow = (value: unknown): value is EffectCapabilityRow =>
  value === 'idempotency-key' || value === 'lookup' || value === 'neither';

const isEffectClass = (value: unknown): value is EffectClass =>
  value === 'monetary' || value === 'signing' || value === 'case';

const isTerminalState = (value: unknown): value is EffectTerminalState =>
  (EFFECT_TERMINAL_STATES as readonly unknown[]).includes(value);

const isBudgets = (value: unknown): value is EffectBudgets => {
  const record = value as EffectBudgets | null | undefined;
  return (
    typeof record === 'object' &&
    record !== null &&
    isPositiveInt(record.attempts) &&
    typeof record.lookups === 'number' &&
    Number.isInteger(record.lookups) &&
    record.lookups >= 0 &&
    typeof record.receiptWaitMs === 'number' &&
    record.receiptWaitMs >= 0 &&
    (record.authorizationWaitMs === undefined ||
      (typeof record.authorizationWaitMs === 'number' && record.authorizationWaitMs >= 0)) &&
    isNonEmptyString(record.reconcileBy)
  );
};

/** The read verdict of one journal entry against the lane vocabulary. */
export type EffectLaneRead =
  | { lane: false }
  | { lane: true; decision: EffectLaneDecision }
  | { lane: true; malformed: string };

/**
 * Reads one journal entry as an effect lane decision, fail closed: an
 * entry that is not a kind-'decision' entry with a lane decisionType is
 * not lane traffic; a lane decisionType whose payload fails validation
 * reads `malformed` and participates in NOTHING (a hand-written broken
 * row must never confuse the machine). `approval_expired` is read by
 * the fold directly (it targets approvals, not machines).
 */
export function readEffectLaneDecision(entry: JournalEntry): EffectLaneRead {
  if (entry.kind !== 'decision') {
    return { lane: false };
  }
  const value = entry.value as { decisionType?: unknown } | null | undefined;
  const decisionType = value?.decisionType;
  if (!(EFFECT_LANE_DECISION_TYPES as readonly unknown[]).includes(decisionType)) {
    return { lane: false };
  }
  const record = value as Record<string, unknown>;
  if (!isNonEmptyString(record.opId)) {
    return { lane: true, malformed: 'missing opId' };
  }
  switch (decisionType as EffectLaneDecisionType) {
    case 'effect_epoch': {
      if (!isNonEmptyString(record.generation)) {
        return { lane: true, malformed: 'effect_epoch requires a generation token' };
      }
      if (
        record.restorationGeneration !== undefined &&
        !Number.isInteger(record.restorationGeneration)
      ) {
        return { lane: true, malformed: 'restorationGeneration must be an integer' };
      }
      return { lane: true, decision: record as unknown as EffectEpochDecision };
    }
    case 'effect_declared': {
      if (
        !isNonEmptyString(record.logicalKey) ||
        !isEffectClass(record.effectClass) ||
        !isCapabilityRow(record.capabilityRow) ||
        !isNonEmptyString(record.argumentsHash)
      ) {
        return { lane: true, malformed: 'effect_declared payload incomplete' };
      }
      return { lane: true, decision: record as unknown as EffectDeclaredDecision };
    }
    case 'effect_intent': {
      if (
        !isNonEmptyString(record.logicalKey) ||
        !isSeq(record.approvalRef) ||
        !isSeq(record.epochRef) ||
        !isEffectClass(record.effectClass) ||
        !isCapabilityRow(record.capabilityRow) ||
        !isNonEmptyString(record.argumentsHash) ||
        !isBudgets(record.budgets)
      ) {
        return { lane: true, malformed: 'effect_intent payload incomplete' };
      }
      if (
        record.capabilityRow === 'lookup' &&
        record.lookupQualification !== 'acceptance-closing' &&
        record.lookupQualification !== 'conditional-create'
      ) {
        return {
          lane: true,
          malformed: "the 'lookup' row requires a recorded qualification (RFC section 6)",
        };
      }
      if (record.compensates !== undefined && !isSeq(record.compensates)) {
        return { lane: true, malformed: 'compensates must be a seq' };
      }
      if (record.successorOf !== undefined && !isSeq(record.successorOf)) {
        return { lane: true, malformed: 'successorOf must be a seq' };
      }
      return { lane: true, decision: record as unknown as EffectIntentDecision };
    }
    case 'effect_attempt': {
      if (
        !isSeq(record.intentRef) ||
        !isPositiveInt(record.ordinal) ||
        !isNonEmptyString(record.notAfter)
      ) {
        return { lane: true, malformed: 'effect_attempt payload incomplete' };
      }
      return { lane: true, decision: record as unknown as EffectAttemptDecision };
    }
    case 'effect_outcome': {
      if (
        !isSeq(record.intentRef) ||
        !isSeq(record.attemptRef) ||
        (record.outcome !== 'accepted' &&
          record.outcome !== 'failed' &&
          record.outcome !== 'unknown')
      ) {
        return { lane: true, malformed: 'effect_outcome payload incomplete' };
      }
      return { lane: true, decision: record as unknown as EffectOutcomeDecision };
    }
    case 'effect_receipt': {
      if (
        !isSeq(record.intentRef) ||
        (record.verification !== 'verified' && record.verification !== 'unverified')
      ) {
        return { lane: true, malformed: 'effect_receipt payload incomplete' };
      }
      return { lane: true, decision: record as unknown as EffectReceiptDecision };
    }
    case 'effect_terminal': {
      if (!isTerminalState(record.terminal)) {
        return { lane: true, malformed: 'effect_terminal requires a terminal state' };
      }
      if (record.intentRef === undefined) {
        if (record.terminal !== 'refused' || !isNonEmptyString(record.logicalKey)) {
          return {
            lane: true,
            malformed: "a terminal without intentRef must be a 'refused' record naming logicalKey",
          };
        }
      } else if (!isSeq(record.intentRef)) {
        return { lane: true, malformed: 'intentRef must be a seq' };
      }
      return { lane: true, decision: record as unknown as EffectTerminalDecision };
    }
    case 'effect_incident': {
      if (!isSeq(record.intentRef) || !isNonEmptyString(record.incident)) {
        return { lane: true, malformed: 'effect_incident payload incomplete' };
      }
      return { lane: true, decision: record as unknown as EffectIncidentDecision };
    }
    case 'effect_disposition': {
      if (
        !isSeq(record.intentRef) ||
        !isNonEmptyString(record.principal) ||
        !isNonEmptyString(record.reason) ||
        !isNonEmptyString(record.disposition)
      ) {
        return { lane: true, malformed: 'effect_disposition payload incomplete' };
      }
      return { lane: true, decision: record as unknown as EffectDispositionDecision };
    }
  }
}

/**
 * Reads one journal entry as an `approval_expired` decision (the clock
 * fact of RFC section 4.5), fail closed like the lane reader.
 */
export function readApprovalExpired(
  entry: JournalEntry,
): { targetRef: number; expiresAt: string } | undefined {
  if (entry.kind !== 'decision') {
    return undefined;
  }
  const value = entry.value as
    { decisionType?: unknown; targetRef?: unknown; expiresAt?: unknown } | null | undefined;
  if (value?.decisionType !== 'approval_expired') {
    return undefined;
  }
  if (!isSeq(value.targetRef) || !isNonEmptyString(value.expiresAt)) {
    return undefined;
  }
  return { targetRef: value.targetRef, expiresAt: value.expiresAt };
}

/**
 * Reads one journal entry as the shipped `approval_revoked` decision
 * (RV4008), by the exact shape ExternalRegistry.revokeApproval appends.
 */
export function readApprovalRevoked(entry: JournalEntry): { targetRef: number } | undefined {
  if (entry.kind !== 'decision') {
    return undefined;
  }
  const value = entry.value as { decisionType?: unknown; targetRef?: unknown } | null | undefined;
  if (value?.decisionType !== 'approval_revoked' || !isSeq(value.targetRef)) {
    return undefined;
  }
  return { targetRef: value.targetRef };
}

/**
 * The effect logical key an approval licenses (RFC section 4.3, item
 * 4), read from the approval suspension's own payload: recorded on the
 * approval request, so the fold can refuse an intent whose key differs
 * from the key the approval named. Fail closed: an approval that names
 * no key licenses no effect.
 */
export function approvalLicensedKey(entry: JournalEntry): string | undefined {
  const value = entry.value as { effectLogicalKey?: unknown } | null | undefined;
  return isNonEmptyString(value?.effectLogicalKey) ? value.effectLogicalKey : undefined;
}

/** Narrow Json helper for payload builders in the writer train. */
export type EffectLaneJson = Json;
