/**
 * Kinds registry v2 payload validators and the frozen shape rules
 * (M2-T04). The registry and the scope grammar freeze NOW so the v2
 * identity profile never moves; producers of the later kinds arrive in
 * M6/M7 (docs/03, sections "JournalEntry form and the kinds registry v2"
 * and "Normative payload schemas for kernel-owned kinds").
 *
 * Validators apply to entries the ENGINE writes; loaded entries with
 * unknown kinds or fields pass through untouched (store obligation A4,
 * reader tolerance rule).
 */
import type { Issue } from '../l0/errors.js';
import type { EntryKind, EntryStatus, JournalEntry } from '../l0/entries.js';

const KNOWN_KINDS: ReadonlySet<string> = new Set([
  'agent',
  'step',
  'child',
  'external',
  'approval',
  'rand',
  'decision',
  'plan.revision',
  'plan.decision',
  'ledger.op',
  'resolution',
  'abandon',
  'node.link',
  'termination.init',
  'termination.denied',
]);

/** Legal stored statuses per kind (docs/03, section 5.3). */
const LEGAL_STATUSES: Readonly<Partial<Record<EntryKind, readonly EntryStatus[]>>> = {
  agent: ['running', 'ok', 'error', 'limit', 'cancelled', 'escalated'],
  step: ['running', 'ok', 'error'],
  child: ['running', 'ok', 'error', 'limit', 'cancelled'],
  external: ['suspended'],
  approval: ['suspended'],
  rand: ['ok'],
  decision: ['ok'],
  'plan.revision': ['ok'],
  'plan.decision': ['ok'],
  'ledger.op': ['ok'],
  resolution: ['ok'],
  abandon: ['ok'],
  'node.link': ['ok'],
  'termination.init': ['ok'],
  'termination.denied': ['ok'],
};

const TWO_PHASE_KINDS: ReadonlySet<string> = new Set(['agent', 'step', 'child']);
const REF_ENTRY_KINDS: ReadonlySet<string> = new Set(['resolution', 'abandon']);

function issue(message: string, path?: Array<string | number>): Issue {
  return path === undefined ? { message } : { message, path };
}

/**
 * Validates the shape the engine is about to append. Returns issues;
 * empty means valid. Unknown kinds are rejected here (the engine never
 * writes them); stores still pass them through on read.
 */
export function validateEntryShape(entry: JournalEntry): Issue[] {
  const issues: Issue[] = [];
  if (!KNOWN_KINDS.has(entry.kind)) {
    issues.push(issue(`unknown kind '${entry.kind}' (engine-written entries use the v2 registry)`));
    return issues;
  }
  const legal = LEGAL_STATUSES[entry.kind];
  if (legal !== undefined && !legal.includes(entry.status)) {
    issues.push(
      issue(`status '${entry.status}' is not legal for kind '${entry.kind}' (docs/03 section 5.3)`),
    );
  }
  if ((entry.status as string) === 'skipped') {
    issues.push(issue("'skipped' is a derived fold status and is never persisted"));
  }

  if (REF_ENTRY_KINDS.has(entry.kind)) {
    if (entry.ref === undefined) {
      issues.push(issue(`ref-entry kind '${entry.kind}' requires ref (the target seq)`));
    } else if (entry.ref >= entry.seq) {
      issues.push(issue('backward references only: ref < seq (rule O2)'));
    }
    if (entry.kind === 'resolution' && entry.resolution === undefined) {
      issues.push(issue("kind 'resolution' requires the resolution payload"));
    }
    if (entry.kind === 'abandon' && entry.abandon === undefined) {
      issues.push(issue("kind 'abandon' requires the abandon payload"));
    }
  } else if (entry.ref !== undefined) {
    // Terminal phase of a two-phase operation.
    if (!TWO_PHASE_KINDS.has(entry.kind)) {
      issues.push(issue(`kind '${entry.kind}' is single-phase and must not carry ref`));
    } else if (entry.status === 'running') {
      issues.push(issue('a terminal entry cannot carry status running'));
    } else if (entry.ref >= entry.seq) {
      issues.push(issue('backward references only: ref < seq (rule O2)'));
    }
  }

  if (entry.kind === 'rand') {
    const payload = entry.value as { subtype?: unknown; value?: unknown } | undefined;
    if (
      payload === undefined ||
      (payload.subtype !== 'now' && payload.subtype !== 'random' && payload.subtype !== 'uuid')
    ) {
      issues.push(issue("rand entries carry { subtype: 'now'|'random'|'uuid', value }", ['value']));
    } else if (
      (payload.subtype === 'uuid' && typeof payload.value !== 'string') ||
      (payload.subtype !== 'uuid' && typeof payload.value !== 'number')
    ) {
      issues.push(issue(`rand subtype '${String(payload.subtype)}' carries the wrong value type`));
    }
  }

  if (entry.kind === 'decision') {
    const payload = entry.value as { decisionType?: unknown } | undefined;
    if (payload === undefined || typeof payload.decisionType !== 'string') {
      issues.push(issue('decision entries carry a decisionType discriminator', ['value']));
    }
  }

  if (entry.kind === 'external' || entry.kind === 'approval') {
    if (entry.kind === 'external' && entry.deadlineAt !== undefined) {
      issues.push(issue('awaitExternal has NO deadline in v1 (docs/03 section 8.1)'));
    }
  }

  if (entry.deadlineAt !== undefined && entry.status !== 'suspended') {
    issues.push(issue('deadlineAt is legal only on suspended entries'));
  }

  return issues;
}
