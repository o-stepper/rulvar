// The critical path a journal already holds (RV2803).
//
// `reduceCriticalPath` folds the shape of a run's wall clock (what ran
// in parallel, what waited, how much of the run sat AFTER the last
// worker settled) out of the event stream. A post-mortem has no event
// stream: the process that emitted it is gone, and what a paid run
// leaves behind is a journal. So the one number the comparison
// experiment steers by, `postFanInShare`, was a live-only reading, and
// the archived runs it was supposed to judge could not answer for
// themselves.
//
// Every ingredient was already written down. A terminal agent entry
// carries its own span: `startedAt` is copied from the running entry it
// closes and `endedAt` is stamped at the settle, so the interval is
// exact rather than reconstructed. `costAttribution.role` says whether
// the span was coordination, synthesis, or a worker. Nothing here is
// re-derived and no validator runs again, so a journal from any prior
// version reads exactly as well as today's, which is the point.
//
// Two things it refuses to claim. A run that was killed and resumed has
// a journal whose first stamp and last stamp are separated by however
// long the operator took to resume, and that difference is not a
// duration of anything: the wall figures are ABSENT for a multi-segment
// journal rather than reported as a run that took nine hours. And the
// synthesize bucket splits into final composition and claim judge only
// where the journal carries the dispatch label (RV2803 added it to the
// attribution facts), so the split is absent on every journal written
// before that and on every unlabelled dispatch, never zero.
import type { JournalEntry } from '../l0/entries.js';
import { CLAIM_JUDGE_LABEL } from '../l0/telemetry-reduce.js';
import { logicalRunTelemetry } from './reconcile.js';

/**
 * The critical path of a logical run, folded from its journal (RV2803).
 *
 * The live reading is {@link reduceCriticalPath}; this is the same
 * question asked of what survived the process. Fields are absent where
 * the journal cannot answer, never zero.
 */
export interface JournaledCriticalPath {
  /**
   * Settled agent spans that were neither coordination nor synthesis:
   * the fan-out this run actually paid for.
   */
  workerSpans: number;
  /** Summed wall of settled `'synthesize'` spans. */
  synthesisMs: number;
  /**
   * Settled agent spans whose entry records no role, so this fold could
   * not classify them (a journal older than the attribution facts).
   * Nonzero means the counts above are a floor, and saying so is the
   * whole point of the field.
   */
  unclassifiedSpans: number;
  /** How many segments the journal holds; the wall figures need one. */
  segments: number;
  /** First stamp to last, absent unless the journal holds ONE segment. */
  runWallMs?: number;
  /** Last worker settle to the end of the run; same condition. */
  postFanInMs?: number;
  /** `postFanInMs / runWallMs`, the RV2210 target's own quantity. */
  postFanInShare?: number;
  /** `synthesisMs / runWallMs`, under the same conditions. */
  synthesisShare?: number;
  /**
   * Synthesis that is NOT the claim judge (RV1604). Present only when
   * EVERY synthesize span in the journal carried a label: one
   * unlabelled span would make the split a guess, and the split exists
   * because a guess here read a 54 second judge as a second final
   * composition.
   */
  finalCompositionMs?: number;
  /** Synthesis that IS the claim judge; same all-or-nothing condition. */
  semanticJudgeMs?: number;
}

const parse = (at: string | undefined): number | undefined => {
  if (at === undefined) {
    return undefined;
  }
  const ms = Date.parse(at);
  return Number.isFinite(ms) ? ms : undefined;
};

/**
 * Fold a run's critical path out of its journal.
 *
 * @param entries the journal of one run, in any order
 */
export function criticalPathFromJournal(entries: readonly JournalEntry[]): JournaledCriticalPath {
  // Sorted once, like the roster fold: the bounds below are order
  // independent, but the segment count partitions at settle boundaries
  // and would mis-partition an out-of-order array.
  const ordered = [...entries].sort((a, b) => a.seq - b.seq);
  let runStart: number | undefined;
  let runEnd: number | undefined;
  let lastWorkerEnd: number | undefined;
  let workerSpans = 0;
  let unclassifiedSpans = 0;
  let synthesisMs = 0;
  let finalCompositionMs = 0;
  let semanticJudgeMs = 0;
  let labelledSynthesis = false;
  let unlabelledSynthesis = false;
  for (const entry of ordered) {
    const startedAt = parse(entry.startedAt);
    const endedAt = parse(entry.endedAt);
    // The run's bounds come from EVERY entry, not only the agent ones:
    // the settle decision that closes a run is the last stamp there is.
    if (startedAt !== undefined) {
      runStart = runStart === undefined ? startedAt : Math.min(runStart, startedAt);
    }
    const last = endedAt ?? startedAt;
    if (last !== undefined) {
      runEnd = runEnd === undefined ? last : Math.max(runEnd, last);
    }
    if (entry.kind !== 'agent' || entry.status === 'running' || entry.status === 'suspended') {
      continue;
    }
    const role = entry.costAttribution?.role;
    if (role === undefined) {
      unclassifiedSpans += 1;
      continue;
    }
    if (role === 'orchestrate') {
      continue;
    }
    if (role !== 'synthesize') {
      workerSpans += 1;
      if (endedAt !== undefined) {
        lastWorkerEnd = lastWorkerEnd === undefined ? endedAt : Math.max(lastWorkerEnd, endedAt);
      }
      continue;
    }
    if (startedAt === undefined || endedAt === undefined) {
      continue;
    }
    const wall = Math.max(0, endedAt - startedAt);
    synthesisMs += wall;
    const label = entry.costAttribution?.label;
    if (label === undefined) {
      // One unlabelled synthesize span makes the whole split a guess,
      // and the split exists because a guess here misread a benchmark
      // by 54 seconds. All or nothing.
      unlabelledSynthesis = true;
      continue;
    }
    labelledSynthesis = true;
    if (label === CLAIM_JUDGE_LABEL || label.startsWith(`${CLAIM_JUDGE_LABEL}-`)) {
      semanticJudgeMs += wall;
    } else {
      finalCompositionMs += wall;
    }
  }
  const segments = logicalRunTelemetry(ordered).segments;
  const path: JournaledCriticalPath = { workerSpans, synthesisMs, unclassifiedSpans, segments };
  if (labelledSynthesis && !unlabelledSynthesis) {
    path.finalCompositionMs = finalCompositionMs;
    path.semanticJudgeMs = semanticJudgeMs;
  }
  // One segment, or no wall: a journal that was resumed holds the
  // operator's coffee break between its stamps, and reporting that as
  // the run's duration would make every share it feeds a fiction.
  if (segments > 1 || runStart === undefined || runEnd === undefined) {
    return path;
  }
  path.runWallMs = Math.max(0, runEnd - runStart);
  if (lastWorkerEnd !== undefined) {
    path.postFanInMs = Math.max(0, runEnd - lastWorkerEnd);
  }
  if (path.runWallMs > 0) {
    if (path.postFanInMs !== undefined) {
      path.postFanInShare = path.postFanInMs / path.runWallMs;
    }
    path.synthesisShare = synthesisMs / path.runWallMs;
  }
  return path;
}
