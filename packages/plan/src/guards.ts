/**
 * RevisionGuards, the oscillation detector, and hysteresis (M7-T06).
 *
 * Guide: https://docs.rulvar.com/guide/adaptive-orchestration
 * (DEF-8; DEF-2/DEF-5 interactions). The guards are non-HITL and
 * terminating: a human in the loop is NEVER required for a run to end.
 * Every guard verdict is a decision entry written strictly BEFORE its
 * effects; verdict state is a pure fold of those entries, so replay
 * re-derives the same freezes with zero live calls.
 *
 * Three detectors:
 *
 * - droppedRevisionStreak: `effectiveDroppedStreak` (the hashed counter
 *   plus trailing bad_base entries) reaching `droppedRevisionLimit`
 *   (default 3) fires the configured terminating fallback
 *   (reject-revision -> finish-with-partial -> fail-run; default
 *   finish-with-partial).
 * - Oscillation: keyed on approachSigCoarse ACROSS LogicalTaskId
 *   boundaries (a content-identical rebirth under a fresh lineage root
 *   is still flagged): a re-add after a severing cancel of the same
 *   coarse signature counts one oscillation; at the per-key limit
 *   further re-adds FREEZE (the per-SpawnKey osc_guard of DEF-5 lands
 *   in M7-T07 and keys the DedupIndex instead).
 * - Stall replans: hard-bounded per run; the streak already excludes
 *   transient and environment classes.
 *
 * Hysteresis on almost-done nodes is structural: park and cancel against
 * RUNNING nodes only ever land as boundary flags (requestOnly), so a
 * nearly-finished child is never killed mid-turn, and park/unpark churn
 * feeds the oscillation counter.
 */
import type { Json } from '@rulvar/core';

/** RevisionGuards configuration. */
export interface RevisionGuardsOptions {
  /** Default 'finish-with-partial'; the chain is non-HITL and terminating. */
  fallback?: 'reject-revision' | 'finish-with-partial' | 'fail-run';
  /** Default 3 consecutive fully-dropped revisions. */
  droppedRevisionLimit?: number;
  /** Optional netLostUsd trigger as a fraction of the starting budget (DEF-5). */
  maxAbandonedNetUsdFraction?: number;
}

export type GuardFallback = NonNullable<RevisionGuardsOptions['fallback']>;

/** The journaled guard verdict payload (kind 'decision'). */
export interface GuardVerdictValue {
  decisionType: 'guard-verdict';
  guard: 'dropped-revision-streak' | 'oscillation-freeze' | 'stall-replan-cap' | 'net-lost';
  fallback: GuardFallback | 'freeze-key';
  /** The streak at trip time (dropped-revision-streak). */
  streak?: number;
  /** The frozen coarse signature (oscillation-freeze). */
  approachSigCoarse?: string;
  oscillationCount?: number;
  /** The capped counter (stall-replan-cap). */
  stallReplans?: number;
  netLostUsd?: number;
}

/** Appendix A: osc_guard reject threshold per key (shared default). */
export const DEFAULT_MAX_OSCILLATIONS_PER_KEY = 2;
/** The hard per-run stall replan bound. */
export const DEFAULT_STALL_REPLAN_CAP = 4;
export const DEFAULT_DROPPED_REVISION_LIMIT = 3;

export interface GuardsState {
  /** The engaged terminating fallback, once tripped (single-shot). */
  engaged?: GuardFallback;
  /** Coarse signatures whose re-adds are frozen. */
  frozenSignatures: ReadonlySet<string>;
  stallReplansUsed: number;
}

/**
 * The guard state machine. All counting inputs arrive from pure folds
 * (the caller feeds landed revisions, severs, and re-adds in journal
 * order), so live and replay converge on identical verdicts; the caller
 * journals each verdict BEFORE applying its effects.
 */
export class RevisionGuards {
  private readonly fallback: GuardFallback;
  private readonly droppedRevisionLimit: number;
  private readonly maxOscillationsPerKey: number;
  private readonly stallReplanCap: number;
  private engaged?: GuardFallback;
  /** Severed (cancelled/abandoned) spend per coarse signature. */
  private readonly severedSignatures = new Map<string, number>();
  /** Oscillation counts per coarse signature, across LTID boundaries. */
  private readonly oscillations = new Map<string, number>();
  private readonly frozen = new Set<string>();
  private stallReplans = 0;

  constructor(
    options?: RevisionGuardsOptions & { maxOscillationsPerKey?: number; stallReplanCap?: number },
  ) {
    this.fallback = options?.fallback ?? 'finish-with-partial';
    this.droppedRevisionLimit = options?.droppedRevisionLimit ?? DEFAULT_DROPPED_REVISION_LIMIT;
    this.maxOscillationsPerKey = options?.maxOscillationsPerKey ?? DEFAULT_MAX_OSCILLATIONS_PER_KEY;
    this.stallReplanCap = options?.stallReplanCap ?? DEFAULT_STALL_REPLAN_CAP;
  }

  get state(): GuardsState {
    return {
      ...(this.engaged === undefined ? {} : { engaged: this.engaged }),
      frozenSignatures: new Set(this.frozen),
      stallReplansUsed: this.stallReplans,
    };
  }

  /** True once a terminating fallback engaged: the plan is frozen for adaptation. */
  get planFrozen(): boolean {
    return this.engaged === 'finish-with-partial' || this.engaged === 'fail-run';
  }

  /** True when further plan_revise calls are rejected outright. */
  get revisionsRejected(): boolean {
    return this.engaged !== undefined;
  }

  /**
   * Feeds one landed revision's effective streak; returns the verdict to
   * journal when the limit is reached (single-shot).
   */
  onRevisionLanded(effectiveDroppedStreak: number): GuardVerdictValue | undefined {
    if (this.engaged !== undefined || effectiveDroppedStreak < this.droppedRevisionLimit) {
      return undefined;
    }
    this.engaged = this.fallback;
    return {
      decisionType: 'guard-verdict',
      guard: 'dropped-revision-streak',
      fallback: this.fallback,
      streak: effectiveDroppedStreak,
    };
  }

  /** Feeds a severing cancel/abandon of a node with this coarse signature. */
  onSevered(approachSigCoarse: string): void {
    this.severedSignatures.set(
      approachSigCoarse,
      (this.severedSignatures.get(approachSigCoarse) ?? 0) + 1,
    );
  }

  /**
   * Feeds one admitted add of this coarse signature; a re-add after a
   * sever counts one oscillation ACROSS LTID boundaries. Returns the
   * freeze verdict to journal when the per-key limit is reached.
   */
  onReAdd(approachSigCoarse: string): GuardVerdictValue | undefined {
    const severs = this.severedSignatures.get(approachSigCoarse) ?? 0;
    if (severs === 0) {
      return undefined;
    }
    const count = (this.oscillations.get(approachSigCoarse) ?? 0) + 1;
    this.oscillations.set(approachSigCoarse, count);
    if (count < this.maxOscillationsPerKey || this.frozen.has(approachSigCoarse)) {
      return undefined;
    }
    this.frozen.add(approachSigCoarse);
    return {
      decisionType: 'guard-verdict',
      guard: 'oscillation-freeze',
      fallback: 'freeze-key',
      approachSigCoarse,
      oscillationCount: count,
    };
  }

  /** True when further re-adds of this coarse signature are frozen. */
  isFrozenSignature(approachSigCoarse: string): boolean {
    return this.frozen.has(approachSigCoarse);
  }

  oscillationCountOf(approachSigCoarse: string): number {
    return this.oscillations.get(approachSigCoarse) ?? 0;
  }

  /**
   * Consumes one stall-triggered replan slot; returns the cap verdict
   * when the hard per-run bound is exhausted (single-shot per call site).
   */
  onStallReplan(): GuardVerdictValue | undefined {
    this.stallReplans += 1;
    if (this.stallReplans !== this.stallReplanCap + 1) {
      return undefined;
    }
    return {
      decisionType: 'guard-verdict',
      guard: 'stall-replan-cap',
      fallback: this.fallback,
      stallReplans: this.stallReplans - 1,
    };
  }

  get stallReplanExhausted(): boolean {
    return this.stallReplans > this.stallReplanCap;
  }

  /** Rebuilds guard state from a journaled verdict (replay path). */
  absorbVerdict(value: GuardVerdictValue): void {
    if (value.guard === 'dropped-revision-streak' || value.guard === 'stall-replan-cap') {
      if (value.fallback !== 'freeze-key') {
        this.engaged = value.fallback;
      }
      return;
    }
    if (value.guard === 'oscillation-freeze' && value.approachSigCoarse !== undefined) {
      this.frozen.add(value.approachSigCoarse);
      if (value.oscillationCount !== undefined) {
        this.oscillations.set(value.approachSigCoarse, value.oscillationCount);
      }
    }
  }

  /** Serializes a verdict for the journal append. */
  static verdictJson(value: GuardVerdictValue): Json {
    return value as unknown as Json;
  }
}
