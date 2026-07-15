/**
 * The no-progress abort class (M3-T08): an engine-defined detector
 * journaled as a first-class terminal abort distinct from user
 * cancellation (a cancelled entry always reruns; a no-progress abort
 * must replay, or every resume would re-pay the stuck turns). The
 * interim heuristic is committed: N consecutive
 * turns without tool calls or artifact deltas, N = 3; the broader
 * heuristic stays OQ-15, revisited on dogfood traces.
 *
 * Encoding: the abort is the agent's
 * terminal entry with status 'limit', an error payload carrying
 * abortClass 'no-progress', and memoizeOutcome stamped by the ENGINE on
 * the terminal entry, so the frozen memoize-limit rule replays it on
 * every subsequent resume without a live rerun. In M3 the runtime has no
 * per-turn artifact channel, so the tool-call test subsumes artifact
 * deltas; per-turn artifact producers arrive with M4 compaction.
 */

/** The committed no-progress detector N. */
export const DEFAULT_NO_PROGRESS_TURNS = 3;

/** The consumer-visible dedicated class marker (FR-424). */
export type AbortClass = 'no-progress';

/**
 * Counts consecutive progress-free turns. A turn with at least one tool
 * call (or, later, an artifact delta) resets the streak; a turn with
 * neither lengthens it; the detector trips when the streak reaches the
 * threshold AND the loop would otherwise continue.
 */
export class NoProgressDetector {
  private streakInternal = 0;
  private readonly threshold: number;

  constructor(threshold?: number) {
    this.threshold = threshold ?? DEFAULT_NO_PROGRESS_TURNS;
  }

  get streak(): number {
    return this.streakInternal;
  }

  /** Records one completed model turn. */
  recordTurn(progress: { toolCalls: number; artifactDeltas?: number }): void {
    if (progress.toolCalls > 0 || (progress.artifactDeltas ?? 0) > 0) {
      this.streakInternal = 0;
    } else {
      this.streakInternal += 1;
    }
  }

  get tripped(): boolean {
    return this.streakInternal >= this.threshold;
  }

  describe(): string {
    return (
      `no-progress abort after ${this.streakInternal} consecutive turns without tool calls ` +
      `or artifact deltas (threshold ${this.threshold}; ` +
      'https://docs.rulvar.com/guide/agents#the-agent-loop-and-turns)'
    );
  }
}
