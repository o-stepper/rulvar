/**
 * EscalationProtocol completion (M7-T11).
 *
 * Full protocol: https://docs.rulvar.com/guide/adaptive-orchestration;
 * resolutions (the DEF-4 family): https://docs.rulvar.com/guide/durability.
 * The M3 producers (report, flavors, the
 * escalate tool, countsAgainstLimit derivation) live in core; this module
 * owns the DECISION side under PlanRunner: the authoritative
 * `escalation-decision` entries the lineage and termination folds consume,
 * the capExceeded flag, and the pure helpers of the decision flow.
 *
 * Channels, closed in v1:
 * - Live Flavor A: `cancel_task` on an escalated node transforms into an
 *   escalation resolution with verdict `cancel`; the
 *   other verdicts on a TERMINAL report are engine territory.
 * - Flavor B: the suspended report resolves through the DEF-4 family
 *   (timeout `defaultDecision`, a live `onEscalation` decision, or a
 *   class-level decision); the PlanRunner absorbs the winning resolution
 *   into the authoritative decision entry and applies the fate through
 *   `resolve_escalation` ops (retry re-opens in place, accept closes done,
 *   cancel closes cancelled, decompose admits the proposed children).
 */
import { deriverV2 } from '@rulvar/core';
import type { EntryRef, EscalationDecision, Json, LogicalTaskId } from '@rulvar/core';

/** One per-lineage debit row of a class-level decision. */
export interface EscalationDebitRow {
  logicalTaskId: LogicalTaskId;
  escalationUnitsAfter: number;
}

/**
 * The authoritative escalation-decision entry value (the
 * producer contract of LineageIndex and foldTermination). Exactly one
 * such entry per report; the debit is atomic with the append and the
 * balance-after is embedded (DEF-2). A decision whose counting debit was
 * DENIED carries `countsAgainstLimit: false` plus `capExceeded: true`:
 * the termination.denied entry written strictly before is the counting
 * record, and the folds stay replay-strict.
 */
export interface EscalationDecisionValue {
  decisionType: 'escalation-decision';
  /** Single-target form; the class form carries `debits` instead. */
  logicalTaskId?: LogicalTaskId;
  nodeId?: string;
  decision: EscalationDecision;
  /** Seq of the terminal escalated entry or the suspended escalate entry. */
  reportRef: EntryRef;
  countsAgainstLimit: boolean;
  /** Present exactly when a counting debit executed (fold-asserted). */
  escalationUnitsAfter?: number;
  /** How the decision was reached (the plan.decision origins). */
  resolvedBy: 'default' | 'class' | 'live' | 'revision-transform';
  /** Class-level form: one entry, an array of per-lineage debits. */
  debits?: EscalationDebitRow[];
  /** Decomposition admissions (spawn debits ride this entry; 11.3 b). */
  admissions?: Json[];
  /** The counting debit was denied: the cap is the message. */
  capExceeded?: boolean;
}

/** Content key: one authoritative decision per report (decide-once). */
export function escalationDecisionKey(reportRef: EntryRef): string {
  return deriverV2.deriveKey({ kind: 'escalation-decision', reportRef });
}

/** Maps a resolution `by` value onto the decision's resolvedBy field. */
export function resolvedByOf(by: string): 'default' | 'class' | 'live' {
  if (by === 'timeout') {
    return 'default';
  }
  if (by === 'class_decision') {
    return 'class';
  }
  return 'live';
}

/** The plan.decision origin of one resolvedBy value. */
export function decisionOriginOf(
  resolvedBy: 'default' | 'class' | 'live' | 'revision-transform',
): 'escalation-default' | 'escalation-class' | 'escalation-live' {
  if (resolvedBy === 'default') {
    return 'escalation-default';
  }
  if (resolvedBy === 'class') {
    return 'escalation-class';
  }
  return 'escalation-live';
}
