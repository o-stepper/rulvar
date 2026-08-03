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
 * would be a lie on its most-read field.
 */
export type PersistedTerminalRefusal = 'unsettled' | 'not-terminal' | 'unknown-workflow';

/** The reconstruction verdict: an envelope, or a typed refusal. */
export type PersistedTerminalResult =
  | { available: true; envelope: TerminalEnvelope }
  | { available: false; reason: PersistedTerminalRefusal; message: string };

const REFUSAL_MESSAGES: Record<PersistedTerminalRefusal, string> = {
  unsettled: 'no run settle is journaled for this run: nothing durable records a terminal',
  'not-terminal': 'the journaled run settle records a running segment, not a terminal',
  'unknown-workflow': 'no stored metadata names the workflow this run belongs to',
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
      usage: ledger.usage,
      cost: costReportFromJournal(input.entries, input.priceUsd),
    },
    agentsSpawned: ledger.agentsSpawned,
    // A journaled settle IS the durable record of the terminal, so the
    // envelope reads `settled: true` by construction: the settlement
    // failures that produce `settled: false` never reach the journal
    // this fold reads.
    provenance: 'journal',
  });
  return { available: true, envelope };
}
