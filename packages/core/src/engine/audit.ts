/**
 * The audit trail reducer (RV-217): a pure fold of one run's journal
 * into the reviewable sequence of authority events, approvals and
 * external suspensions, who resolved them and how, abandons, engine
 * decisions (escalation verdicts, acceptance, admission, fallbacks),
 * termination denials, and run settles. The journal has always been
 * the audit log; this gives it a first-class, typed reader, so a
 * compliance review never spelunks raw entries.
 *
 * Read entries through `Engine.stores` (or take them from
 * `exportRun`), so an encrypted deployment audits plaintext through
 * the one policy point. The reducer is tolerant by construction:
 * unknown kinds and malformed payloads are skipped, never thrown on,
 * so it works across journal vintages (the store obligation A4 reader
 * tolerance rule).
 *
 * Docs: https://docs.rulvar.com/guide/data-protection
 */
import type { JournalEntry } from '../l0/entries.js';
import type { Json } from '../l0/json.js';

export type AuditCategory =
  'suspension' | 'resolution' | 'abandon' | 'decision' | 'termination-denied' | 'run-settle';

/** One reviewable authority event, in journal order. */
export interface AuditRecord {
  /** The journal seq of the entry behind this record. */
  seq: number;
  /** The entry's startedAt timestamp. */
  at: string;
  scope: string;
  category: AuditCategory;
  /**
   * The finer type: the suspension kind ('external' | 'approval') for
   * suspensions, the journaled decisionType for decisions.
   */
  type?: string;
  /** Who acted: a ResolutionBy for resolutions, 'engine' for decisions. */
  by?: string;
  /** The seq of the entry this record acts on (resolution/abandon target). */
  target?: number;
  /** One deterministic reviewable line. */
  summary: string;
  /** The journaled payload, verbatim (plaintext through Engine.stores). */
  value?: Json;
}

function record(
  entry: JournalEntry,
  fields: Omit<AuditRecord, 'seq' | 'at' | 'scope'>,
): AuditRecord {
  return {
    seq: entry.seq,
    at: entry.startedAt,
    scope: entry.scope,
    ...fields,
  };
}

/**
 * Folds a loaded journal into the audit trail, in seq order. Pass the
 * FULL entry list (`Engine.stores.journal.load(runId)` or
 * `exportRun(runId).entries`); filtering is the reducer's job.
 */
export function reduceAuditTrail(entries: readonly JournalEntry[]): AuditRecord[] {
  const trail: AuditRecord[] = [];
  for (const entry of entries) {
    if ((entry.kind === 'external' || entry.kind === 'approval') && entry.status === 'suspended') {
      trail.push(
        record(entry, {
          category: 'suspension',
          type: entry.kind,
          summary:
            `${entry.kind} suspension opened` +
            (entry.deadlineAt === undefined ? '' : ` (deadline ${entry.deadlineAt})`),
          ...(entry.value === undefined ? {} : { value: entry.value }),
        }),
      );
      continue;
    }
    if (entry.kind === 'resolution') {
      const payload = entry.resolution;
      if (payload === undefined) {
        continue;
      }
      trail.push(
        record(entry, {
          category: 'resolution',
          by: payload.by,
          target: payload.target,
          summary:
            `suspension #${String(payload.target)} resolved by ${payload.by}` +
            (payload.decisionRef === undefined
              ? ''
              : ` (class decision #${String(payload.decisionRef)})`),
          value: payload.value,
        }),
      );
      continue;
    }
    if (entry.kind === 'abandon') {
      const payload = entry.abandon;
      if (payload === undefined) {
        continue;
      }
      trail.push(
        record(entry, {
          category: 'abandon',
          target: payload.target,
          by: `decision #${String(payload.authorizedBy)}`,
          summary: `#${String(payload.target)} abandoned: ${payload.reason}`,
        }),
      );
      continue;
    }
    if (entry.kind === 'termination.denied') {
      trail.push(
        record(entry, {
          category: 'termination-denied',
          by: 'engine',
          summary: 'a termination-limit action was denied',
          ...(entry.value === undefined ? {} : { value: entry.value }),
        }),
      );
      continue;
    }
    if (entry.kind === 'decision') {
      const value = entry.value as { decisionType?: unknown; runStatus?: unknown } | undefined;
      const decisionType = typeof value?.decisionType === 'string' ? value.decisionType : undefined;
      if (decisionType === undefined) {
        continue;
      }
      if (decisionType === 'run_settle') {
        trail.push(
          record(entry, {
            category: 'run-settle',
            by: 'engine',
            type: decisionType,
            summary: `run settled ${typeof value?.runStatus === 'string' ? value.runStatus : 'unknown'}`,
            ...(entry.value === undefined ? {} : { value: entry.value }),
          }),
        );
        continue;
      }
      trail.push(
        record(entry, {
          category: 'decision',
          by: 'engine',
          type: decisionType,
          summary: `engine decision ${decisionType}`,
          ...(entry.value === undefined ? {} : { value: entry.value }),
        }),
      );
    }
  }
  return trail;
}
