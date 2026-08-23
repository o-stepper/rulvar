/**
 * The persisted terminal (RV1209, the P1-4 arc): rebuilding a run's
 * terminal envelope from the journal that recorded it, for readers
 * that never held the run. A restart, a second replica, or an offline
 * auditor used to see a bare status projection where a live consumer
 * saw the whole envelope (RV1105), so the durability story ("the
 * journal is the record") did not reach the surface a host actually
 * reads after a redeploy.
 *
 * Two rules make the reconstruction honest:
 *
 * - The journal is the AUTHORITY, not the meta row. The verdict comes
 *   from the journaled run settle (`decisionType: 'run_settle'`), the
 *   dollars from the same fold `GET /runs/:id/cost` runs under the
 *   settle's own rate pin (RV407/RV611), and the usage plus the agent
 *   count from the same ledger fold the resume budget seed uses. A
 *   journal with no settle proves no terminal, and this module refuses
 *   with a typed reason instead of dressing the meta projection up as
 *   an envelope.
 * - `completion` is recoverable exactly when the settle recorded the
 *   semantic lift beside its output digest (the persisted-terminal
 *   tail): the digest proves WHICH value settled, the lift records
 *   what the workflow CLAIMED about it, and this module reads the
 *   claim back instead of re-deriving it from a value the journal
 *   only digests. A settle written before the lift rode it stays
 *   absent. `error` remains NOT recoverable (the run's terminal wire
 *   error is the thrown error's projection, journaled per operation,
 *   never as the run's own). `provenance: 'journal'` marks every
 *   rebuilt copy so absence reads as "not recorded", which is what it
 *   is.
 *
 * The assembly goes through `terminalEnvelopeOf`, the ONE producer, so
 * a persisted reader can never drift into a second lookalike shape.
 */
import type { JournalEntry } from '../l0/entries.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import type { RunMeta } from '../l0/spi/store.js';
import type { TerminalEnvelope } from '../l0/terminal-envelope.js';
import { buildAbandonFold } from '../journal/disposition.js';
import { foldLedger } from '../journal/replayer.js';
import { parseTerminalEnvelope } from '../l0/terminal-envelope.js';
import { lastRunSettle } from '../stores/reconcile.js';
import { costReportFromJournal } from './cost-report.js';
import { terminalEnvelopeOf } from './terminal-envelope.js';

/**
 * Why no persisted terminal could be served. `unsettled`: the journal
 * carries no run settle, so nothing durable records a terminal (a run
 * still in flight elsewhere, a segment fenced out by a successor
 * (RV1009), or a settlement write that failed). `not-terminal`: the
 * journaled settle is not the journal's last word, either because it
 * records a status that is not terminal (a run whose latest segment is
 * still running) or because entries continued PAST it (RV1407: a
 * detached resolution awaiting its resume, or a successor segment over
 * a stale settle), which is exactly the evidence `auditRun` derives a
 * non-terminal status from. `unknown-workflow`: nothing names the
 * workflow the terminal belongs to, and an envelope that invented one
 * would be a lie on its most-read field. `malformed-envelope` (RV3903):
 * the rebuilt envelope failed the runtime contract gate
 * (`parseTerminalEnvelope`), which means the journal bytes this fold
 * read produced values the terminal contract forbids (NaN money, a
 * negative counter, an unknown status literal); the reconstruction is
 * withheld typed instead of served green, and the message names the
 * field and the defect.
 */
export type PersistedTerminalRefusal =
  'unsettled' | 'not-terminal' | 'unknown-workflow' | 'malformed-envelope';

/** The reconstruction verdict: an envelope, or a typed refusal. */
export type PersistedTerminalResult =
  | { available: true; envelope: TerminalEnvelope }
  | { available: false; reason: PersistedTerminalRefusal; message: string };

const REFUSAL_MESSAGES: Record<PersistedTerminalRefusal, string> = {
  unsettled: 'no run settle is journaled for this run: nothing durable records a terminal',
  'not-terminal': 'the journaled run settle records a running segment, not a terminal',
  'unknown-workflow': 'no stored metadata names the workflow this run belongs to',
  'malformed-envelope':
    'the rebuilt envelope failed the runtime terminal contract gate: the journal bytes ' +
    'produced values the contract forbids',
};

/** Every envelope status; a settle may also record the non-terminal 'running'. */
const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'ok',
  'error',
  'cancelled',
  'exhausted',
  'suspended',
]);

function refuse(
  reason: PersistedTerminalRefusal,
  message: string = REFUSAL_MESSAGES[reason],
): PersistedTerminalResult {
  return { available: false, reason, message };
}

/**
 * Rebuilds one run's terminal envelope from its journal (RV1209).
 * `priceUsd` is the caller's composed pricing, exactly what the cost
 * endpoint passes: the settle's pinned rows composed over the host's
 * current table, so a rebuilt envelope reports the dollars the run
 * settled at rather than today's rates.
 */
export function persistedTerminalEnvelope(input: {
  runId: string;
  meta: RunMeta | undefined;
  entries: readonly JournalEntry[];
  priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined;
}): PersistedTerminalResult {
  const settle = lastRunSettle(input.entries);
  if (settle === undefined) {
    return refuse('unsettled');
  }
  if (!TERMINAL_STATUSES.has(settle.runStatus)) {
    return refuse('not-terminal');
  }
  // The tail rule (RV1407): a settle the journal ran past is a stale
  // claim, not the run's terminal. Any entry after the last settle (a
  // detached resolution awaiting its resume, a successor segment over
  // a stale settle) is exactly the evidence auditRun derives a
  // non-terminal status from, and the persisted surface must read the
  // same journal the same way instead of serving yesterday's envelope.
  const tail = input.entries.filter((entry) => entry.seq > settle.seq).length;
  if (tail > 0) {
    return refuse(
      'not-terminal',
      `the journal continued ${String(tail)} entr${tail === 1 ? 'y' : 'ies'} past the settle ` +
        `at seq ${String(settle.seq)}: the latest segment is not settled`,
    );
  }
  const workflow = input.meta?.workflowName;
  if (workflow === undefined) {
    return refuse('unknown-workflow');
  }
  // The runtime contract gate (RV3903): by the time a restarted reader
  // folds it, the journal is external bytes and the pricing is a
  // host-supplied function, and the typed producer cannot vouch for
  // either (the fourth comparison experiment's probe pushed NaN
  // dollars and negative counters straight through the typed copy).
  // The whole assembly sits under one catch, so a fold overflow guard
  // (RV610) and the envelope gate below refuse the same way: a typed
  // `malformed-envelope` refusal naming the defect, never a green
  // envelope and never a bare throw at a serving surface.
  try {
    return assemble(input, workflow, settle);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return refuse('malformed-envelope', `${REFUSAL_MESSAGES['malformed-envelope']}: ${detail}`);
  }
}

function assemble(
  input: Parameters<typeof persistedTerminalEnvelope>[0],
  workflow: string,
  settle: NonNullable<ReturnType<typeof lastRunSettle>>,
): PersistedTerminalResult {
  const ledger = foldLedger(input.entries, buildAbandonFold(input.entries));
  const envelope = terminalEnvelopeOf({
    runId: input.runId,
    workflow,
    outcome: {
      status: settle.runStatus as TerminalEnvelope['status'],
      // The semantic completion, when the settle recorded the lift
      // (the persisted-terminal tail): the one envelope field that
      // used to be unrecoverable by construction. A settle written
      // before the lift rode it stays absent, which still honestly
      // reads "not recorded" under provenance 'journal'.
      ...(settle.completion === undefined ? {} : { completion: settle.completion }),
      // The semantic outcome (RV3304), read back from the same lift:
      // the 2026-08-12 comparison run settled ok/complete over a
      // retained contradiction, and a restarted reader could not see
      // the acceptance verdict or the judge meta a live consumer
      // gated on. Absent fields stay absent: NOT RECORDED, never a
      // verdict.
      ...(settle.deliverableAccepted === undefined
        ? {}
        : { deliverableAccepted: settle.deliverableAccepted }),
      ...(settle.resultAvailable === undefined ? {} : { resultAvailable: settle.resultAvailable }),
      ...(settle.acceptedArtifactRef === undefined
        ? {}
        : { acceptedArtifactRef: settle.acceptedArtifactRef }),
      ...(settle.claimConsistencyMeta === undefined
        ? {}
        : { claimConsistencyMeta: settle.claimConsistencyMeta }),
      // The audit meta and the one-word verdict (RV4403), read back
      // from the same settle lift: the seventh comparison run's
      // restart reader answered 'not-judged' about a failure whose
      // own message counted ten unsupported citations.
      ...(settle.citationAuditMeta === undefined
        ? {}
        : { citationAuditMeta: settle.citationAuditMeta }),
      ...(settle.semanticTerminalVerdict === undefined
        ? {}
        : { semanticTerminalVerdict: settle.semanticTerminalVerdict }),
      usage: ledger.usage,
      cost: costReportFromJournal(input.entries, input.priceUsd),
    },
    agentsSpawned: ledger.agentsSpawned,
    // The recorded config identity (RV3210) rides the rebuilt envelope
    // too (RV3304), from the same meta row that names the workflow.
    ...(input.meta?.configFingerprint === undefined
      ? {}
      : { configFingerprint: input.meta.configFingerprint }),
    // A journaled settle IS the durable record of the terminal, so the
    // envelope reads `settled: true` by construction: the settlement
    // failures that produce `settled: false` never reach the journal
    // this fold reads.
    provenance: 'journal',
  });
  // The gate itself: a rebuild the contract refuses never leaves this
  // function as an envelope; the enclosing catch turns the typed throw
  // into the `malformed-envelope` refusal.
  return { available: true, envelope: parseTerminalEnvelope(envelope) };
}
