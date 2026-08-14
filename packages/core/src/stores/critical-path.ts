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
import { claimJudgeStageOf, unionOfIntervalsMs } from '../l0/telemetry-reduce.js';
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
  /**
   * The stage split of `semanticJudgeMs` (RV3404), same all-or-nothing
   * condition: the draft pass is the exact judge label and every
   * suffixed variant is a post draft pass over the composed document
   * (the final pass and the repair round's re-judge both dispatch
   * `-final`, RV2509/RV3307). One classifier decides on both surfaces:
   * {@link claimJudgeStageOf}.
   */
  draftJudgeMs?: number;
  /** The post draft half of the split; same condition. */
  finalJudgeMs?: number;
  /**
   * Settled synthesize spans counted by side, same condition (RV3404):
   * `compositionSpans: 2` in an archived journal is the legible
   * signature of the bounded repair round (RV3307), readable years
   * after the process that paid for it exited.
   */
  compositionSpans?: number;
  /** Settled judge-side synthesize spans, counted; same condition. */
  judgeSpans?: number;
  /**
   * First stamp to the FIRST settled composition-side span's end
   * (RV3605): when a candidate deliverable first existed, readable
   * from the archive. The third comparison run held a mechanically
   * accepted candidate 25 minutes before it lost typed, and the only
   * route to that fact was a span dig. Needs everything the wall
   * needs (one segment) plus everything the split needs (every
   * synthesize span labelled, or the milestone would count a judge as
   * a candidate); absent otherwise, never guessed.
   */
  firstCandidateMs?: number;
  /**
   * First stamp to the LAST settled composition-side span's end; same
   * conditions. Time to the accepted deliverable exactly when the
   * terminal says `deliverableAccepted: true`; on a failed run it is
   * when the last LOSING candidate settled, so pair it with the
   * acceptance verdict and never read it as a win on an error
   * terminal.
   */
  lastCandidateMs?: number;
  /**
   * The window itemization a journal CAN answer (RV3404); present
   * exactly when `postFanInMs` is.
   */
  postFanIn?: JournaledPostFanIn;
}

/**
 * The synthesis half of the RV710 decomposition, asked of a journal
 * (RV3404). The live breakdown also itemizes the coordinator's model
 * and tool time inside the window; a journal cannot: a terminal agent
 * entry spans the WHOLE invocation, and the coordinator's per turn
 * stamps died with the process that emitted them. So this block claims
 * exactly what the stamps prove: how much of the window settled
 * synthesize spans cover, the split of that cover when every span is
 * labelled, and how much of the window NO settled synthesize span
 * accounts for. `unaccountedMs` is a superset of the live `residueMs`
 * by construction (the coordinator's own tail time lives in it here),
 * which is why it refuses to share the name.
 */
export interface JournaledPostFanIn {
  /** Union of settled synthesize spans clipped to the window. */
  synthesisCoveredMs: number;
  /**
   * The composition half of the covered spans, clipped; present under
   * the same all-or-nothing labelling condition as the top level
   * split, and equal to the live breakdown's reading of the same run.
   */
  finalCompositionMs?: number;
  /** The judge half, clipped; same condition. */
  semanticJudgeMs?: number;
  /** `postFanInMs` minus `synthesisCoveredMs`, floored at zero. */
  unaccountedMs: number;
  /** `unaccountedMs / postFanInMs` when the window is positive. */
  unaccountedShare?: number;
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
  let draftJudgeMs = 0;
  let finalJudgeMs = 0;
  let compositionSpans = 0;
  let judgeSpans = 0;
  let firstCompositionEnd: number | undefined;
  let lastCompositionEnd: number | undefined;
  let labelledSynthesis = false;
  let unlabelledSynthesis = false;
  // Settled synthesize spans, kept for the window clip below; `judge`
  // is undefined on an unlabelled span (it still covers the window, it
  // just cannot pick a side).
  const synthSpans: Array<{ from: number; to: number; judge?: boolean }> = [];
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
      synthSpans.push({ from: startedAt, to: endedAt });
      continue;
    }
    labelledSynthesis = true;
    // One classifier for both surfaces (RV3302, extended to the stage
    // by RV3404): this fold and the live reduceCriticalPath must never
    // disagree on what counts as the judge, or on which pass it was,
    // or a benchmark reads the same run two different ways.
    const stage = claimJudgeStageOf(label);
    if (stage !== undefined) {
      semanticJudgeMs += wall;
      judgeSpans += 1;
      if (stage === 'draft') {
        draftJudgeMs += wall;
      } else {
        finalJudgeMs += wall;
      }
    } else {
      finalCompositionMs += wall;
      compositionSpans += 1;
      // The candidate milestones (RV3605): a settled composition
      // span's end stamp is the moment a candidate existed.
      firstCompositionEnd =
        firstCompositionEnd === undefined ? endedAt : Math.min(firstCompositionEnd, endedAt);
      lastCompositionEnd =
        lastCompositionEnd === undefined ? endedAt : Math.max(lastCompositionEnd, endedAt);
    }
    synthSpans.push({ from: startedAt, to: endedAt, judge: stage !== undefined });
  }
  const segments = logicalRunTelemetry(ordered).segments;
  const path: JournaledCriticalPath = { workerSpans, synthesisMs, unclassifiedSpans, segments };
  const splitLegible = labelledSynthesis && !unlabelledSynthesis;
  if (splitLegible) {
    path.finalCompositionMs = finalCompositionMs;
    path.semanticJudgeMs = semanticJudgeMs;
    path.draftJudgeMs = draftJudgeMs;
    path.finalJudgeMs = finalJudgeMs;
    path.compositionSpans = compositionSpans;
    path.judgeSpans = judgeSpans;
  }
  // One segment, or no wall: a journal that was resumed holds the
  // operator's coffee break between its stamps, and reporting that as
  // the run's duration would make every share it feeds a fiction.
  if (segments > 1 || runStart === undefined || runEnd === undefined) {
    return path;
  }
  path.runWallMs = Math.max(0, runEnd - runStart);
  // The candidate milestones (RV3605): the wall conditions (one
  // segment, both stamps) hold here, and the split condition keeps a
  // judge from being counted as a candidate.
  if (splitLegible && firstCompositionEnd !== undefined) {
    path.firstCandidateMs = Math.max(0, firstCompositionEnd - runStart);
  }
  if (splitLegible && lastCompositionEnd !== undefined) {
    path.lastCandidateMs = Math.max(0, lastCompositionEnd - runStart);
  }
  if (lastWorkerEnd !== undefined) {
    path.postFanInMs = Math.max(0, runEnd - lastWorkerEnd);
    // The window itemization (RV3404): the same clip-then-union
    // arithmetic the live RV710 decomposition runs, over the spans a
    // journal actually holds. An interval participates when it touches
    // the window at all, exactly like the live clip.
    const windowFrom = Math.min(lastWorkerEnd, runEnd);
    const windowTo = runEnd;
    const clipped: Array<{ from: number; to: number; judge?: boolean }> = [];
    for (const span of synthSpans) {
      if (span.to < windowFrom || span.from > windowTo) {
        continue;
      }
      clipped.push({
        from: Math.max(span.from, windowFrom),
        to: Math.min(span.to, windowTo),
        ...(span.judge === undefined ? {} : { judge: span.judge }),
      });
    }
    const synthesisCoveredMs = unionOfIntervalsMs(clipped);
    const block: JournaledPostFanIn = {
      synthesisCoveredMs,
      unaccountedMs: Math.max(0, path.postFanInMs - synthesisCoveredMs),
    };
    if (splitLegible) {
      let judgeClippedMs = 0;
      let compositionClippedMs = 0;
      for (const span of clipped) {
        const wall = span.to - span.from;
        if (span.judge === true) {
          judgeClippedMs += wall;
        } else {
          compositionClippedMs += wall;
        }
      }
      block.finalCompositionMs = compositionClippedMs;
      block.semanticJudgeMs = judgeClippedMs;
    }
    if (path.postFanInMs > 0) {
      block.unaccountedShare = block.unaccountedMs / path.postFanInMs;
    }
    path.postFanIn = block;
  }
  if (path.runWallMs > 0) {
    if (path.postFanInMs !== undefined) {
      path.postFanInShare = path.postFanInMs / path.runWallMs;
    }
    path.synthesisShare = synthesisMs / path.runWallMs;
  }
  return path;
}
