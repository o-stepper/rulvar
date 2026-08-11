// The observed tool-budget calibration a journal already holds (RV3003).
//
// The ninth comparison run declared the stock evidence-contract
// estimate (3 executed calls per recorded entry, RV303) and its
// workers actually spent 5.5: the declared call floor undershot the
// real spend by almost half, and the number had to be recomputed by
// hand from worker transcripts because the executed-call counter lived
// in checkpoint blobs. RV3002 moved the durable subset onto the
// terminal entry, so the pairing is now a pure fold: the RV806
// evidence verdict and the RV3002 counter ride the same terminal, and
// a host can judge its declared `estCallsPerEntry` against what its
// own runs observe, journal in, number out.
//
// What it refuses to claim (RV1209: absence means NOT RECORDED, never
// zero). A dispatch carrying only one side of the pair is named in its
// own list and never enters the rate: a declared contract whose
// counter was never journaled (every pre-RV3002 journal) is an
// unobserved child, not a zero-call one, and a journaled counter with
// no declared contract has no entries to divide by. The aggregate
// divides summed calls by summed entries across the PAIRED rows only,
// unproductive calls included, because the declared floor predicts
// total spend, not efficient spend; a paired row with zero recorded
// entries keeps its calls in the numerator and its anomaly visible
// (the deficit-observability hole the twenty-fifth plan named).
import type { JournalEntry } from '../l0/entries.js';

/** One dispatch carrying BOTH sides of the calibration pair (RV3003). */
export interface ToolCalibrationRow {
  /** The scope the dispatch journaled under. */
  scope: string;
  /** The dispatch seq (the terminal's `ref`): the child's handle. */
  handle: number;
  /** The profile the dispatch ran under, when the terminal recorded it. */
  agentType?: string;
  /** The journaled terminal status. */
  status: string;
  /** Successful `record_evidence` executions the RV806 verdict counted. */
  recordedEntries: number;
  /** The declared floor the verdict was judged against. */
  minEntries: number;
  /** Executed tool calls the RV3002 terminal subset journaled. */
  toolCallsUsed: number;
  /** `toolCallsUsed / recordedEntries`; absent when recordedEntries is 0. */
  callsPerEntry?: number;
}

/** A dispatch named but excluded from the rate: one side is NOT RECORDED. */
export interface ToolCalibrationExclusion {
  scope: string;
  handle: number;
  status: string;
}

/** The observed calls-per-evidence-entry calibration of one journal (RV3003). */
export interface ToolCalibrationReport {
  /** Terminal agent dispatches the journal holds, the partition's whole. */
  dispatches: number;
  /** Dispatches carrying both the verdict and the counter, in seq order. */
  observed: ToolCalibrationRow[];
  /**
   * The observed aggregate over `observed` rows: summed executed calls
   * against summed recorded entries, with the rate absent when the
   * entry sum is 0. Absent entirely when no row paired.
   */
  aggregate?: { toolCallsUsed: number; recordedEntries: number; callsPerEntry?: number };
  /** A declared contract whose counter was never journaled (pre-RV3002 journals). */
  evidenceOnly: ToolCalibrationExclusion[];
  /** A journaled counter with no declared contract: nothing to divide by. */
  budgetOnly: ToolCalibrationExclusion[];
  /** Dispatches carrying neither side. */
  unobserved: number;
}

/**
 * Folds the observed tool-budget calibration from a journal (RV3003):
 * every terminal agent entry is partitioned by which sides of the
 * evidence/counter pair it recorded, the paired rows carry their
 * per-dispatch rate, and the aggregate is the number a host compares
 * against its declared `estCallsPerEntry`. Pure over the entries, so
 * live and resumed journals fold identically; nothing is re-derived
 * and no checkpoint blob is read.
 */
export function toolCalibrationFromJournal(
  entries: readonly JournalEntry[],
): ToolCalibrationReport {
  const ordered = [...entries].sort((a, b) => a.seq - b.seq);
  const observed: ToolCalibrationRow[] = [];
  const evidenceOnly: ToolCalibrationExclusion[] = [];
  const budgetOnly: ToolCalibrationExclusion[] = [];
  let dispatches = 0;
  let unobserved = 0;
  for (const entry of ordered) {
    if (entry.kind !== 'agent' || entry.ref === undefined || entry.status === 'running') {
      continue;
    }
    dispatches += 1;
    const named = {
      scope: entry.scope,
      handle: entry.ref,
      status: String(entry.status ?? ''),
    };
    if (entry.evidence !== undefined && entry.toolBudget !== undefined) {
      observed.push({
        ...named,
        ...(entry.costAttribution?.agentType === undefined || entry.costAttribution.agentType === ''
          ? {}
          : { agentType: entry.costAttribution.agentType }),
        recordedEntries: entry.evidence.recordedEntries,
        minEntries: entry.evidence.minEntries,
        toolCallsUsed: entry.toolBudget.used,
        ...(entry.evidence.recordedEntries > 0
          ? { callsPerEntry: entry.toolBudget.used / entry.evidence.recordedEntries }
          : {}),
      });
    } else if (entry.evidence !== undefined) {
      evidenceOnly.push(named);
    } else if (entry.toolBudget !== undefined) {
      budgetOnly.push(named);
    } else {
      unobserved += 1;
    }
  }
  const report: ToolCalibrationReport = {
    dispatches,
    observed,
    evidenceOnly,
    budgetOnly,
    unobserved,
  };
  if (observed.length > 0) {
    const toolCallsUsed = observed.reduce((sum, row) => sum + row.toolCallsUsed, 0);
    const recordedEntries = observed.reduce((sum, row) => sum + row.recordedEntries, 0);
    report.aggregate = {
      toolCallsUsed,
      recordedEntries,
      ...(recordedEntries > 0 ? { callsPerEntry: toolCallsUsed / recordedEntries } : {}),
    };
  }
  return report;
}
