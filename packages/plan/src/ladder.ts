/**
 * ModelLadder runtime pieces (M7-T10).
 *
 * Owning spec: docs/07-adaptive-orchestration-spec.md, section 10 (runtime
 * semantics); docs/04-model-layer-spec.md, section 12 (the type family and
 * canonicalization, declared once in core). This module is PURE: the
 * PlanRunner drives it through the extension IO. Every ladder control-flow
 * verdict (trigger classification result, gate verdicts, spot-check
 * selection) journals as a decision entry computed once live and replayed
 * by match; the folds consume ONLY journaled values (DEF-1).
 */
import { canonicalizeLadder, deriverV2 } from '@lurker/core';
import type {
  AgentResult,
  CanonicalLadderSpec,
  Effort,
  EntryRef,
  Json,
  LadderSpec,
  LogicalTaskId,
  TriggerClass,
} from '@lurker/core';

/**
 * Extracts the declared ladder from an agent profile: the ModelSpec union
 * carries it (`model: { ladder }`), or the loop-role routing entry
 * (docs/04, section 12). The same declaration points feed ladderLengthOf
 * and the frozen kMax, so admission and execution can never disagree on
 * the ladder length.
 */
export function ladderOfProfile(profile: unknown): LadderSpec | undefined {
  const record = profile as
    { model?: unknown; routing?: { loop?: unknown } | undefined } | undefined;
  for (const spec of [record?.model, record?.routing?.loop]) {
    const ladder = (spec as { ladder?: LadderSpec } | undefined)?.ladder;
    if (ladder !== undefined) {
      return ladder;
    }
  }
  return undefined;
}

/** The profile's chain effort feeding canonicalization, when declared. */
export function chainEffortOf(profile: unknown): Effort | undefined {
  const effort = (profile as { effort?: unknown } | undefined)?.effort;
  return typeof effort === 'string' ? (effort as Effort) : undefined;
}

/** Canonicalizes the profile's declared ladder once per dispatch site. */
export function canonicalLadderOf(profile: unknown): CanonicalLadderSpec | undefined {
  const declared = ladderOfProfile(profile);
  if (declared === undefined) {
    return undefined;
  }
  const chainEffort = chainEffortOf(profile);
  return canonicalizeLadder(declared, chainEffort === undefined ? undefined : { chainEffort });
}

/**
 * Clamps the orchestrator's `model_hint.startTier` to the declared ladder
 * (docs/07, section 4.2): the hint is the ONLY model influence the
 * orchestrator has, and it never names a model.
 */
export function clampStartTier(ladder: CanonicalLadderSpec, hint?: number): number {
  if (hint === undefined || !Number.isInteger(hint)) {
    return ladder.startTier;
  }
  return Math.min(Math.max(hint, 0), ladder.rungs.length - 1);
}

/**
 * The rung an attempt executes on: the clamped start tier plus the
 * journaled raise count, hard-clamped at the top rung. `rungIndex` per
 * lineage is strictly monotone; there are no demotions (docs/07, 10).
 */
export function executingRungOf(
  ladder: CanonicalLadderSpec,
  startTier: number,
  raises: number,
): number {
  return Math.min(startTier + raises, ladder.rungs.length - 1);
}

/**
 * Classifies a settled attempt into the typed transition trigger
 * (docs/04, section 12): schema-mismatch errors are 'schema-exhausted';
 * the engine's no-progress abort is first-class 'no-progress' (it rides
 * status 'limit' with the dedicated abort class, distinct from user
 * cancellation by construction); cancelled, escalated, and skipped never
 * trigger. 'verify-failed' comes from the acceptance gates, never from
 * the terminal status.
 */
export function ladderTriggerOf(
  settled: Pick<AgentResult<unknown>, 'status'> & {
    error?: { kind?: string };
    abortClass?: string;
  },
): Exclude<TriggerClass, 'verify-failed'> | undefined {
  if (settled.status === 'error') {
    return settled.error?.kind === 'schema-mismatch' ? 'schema-exhausted' : 'error';
  }
  if (settled.status === 'limit') {
    return settled.abortClass === 'no-progress' ? 'no-progress' : 'limit';
  }
  return undefined;
}

/** One journaled acceptance-gate evaluation (docs/07, section 10). */
export interface GateVerdictValue {
  decisionType: 'gate-verdict';
  logicalTaskId: LogicalTaskId;
  nodeId: string;
  /** The judged attempt's root dispatch seq. */
  attemptRef: EntryRef;
  gate: 'mechanical' | 'judge' | 'spot-check';
  /** The registered profile name (mechanical gates). */
  profile?: string;
  /** The executing rung of the judged attempt. */
  rung: number;
  pass: boolean;
  detail?: string;
  /** Spot-check only: the journaled draw and fraction behind `pass`. */
  spotCheck?: { draw: number; fraction: number; selected: boolean };
}

/** Content key of one gate verdict: attempt plus gate position. */
export function gateVerdictKey(attemptRef: EntryRef, gateIndex: number): string {
  return deriverV2.deriveKey({ kind: 'gate-verdict', attemptRef, gateIndex });
}

/**
 * The ladder verdict decision entry (docs/07, sections 10 and 11.3): the
 * producer contract both folds already consume. A RAISING verdict debits
 * one rung unit (rungIndexAfter/rungsRemainingAfter embedded, checked by
 * foldTermination) and carries the rung RESPAWN's embedded admission
 * (spawn debit) plus `nextAttempt` (the lineage registration: relation
 * 'rung-retry', docs/03 10.1 row 4). A non-raising verdict records the
 * ladder's end (exhausted rungs, top rung, or a denied respawn) and
 * authorizes nothing.
 */
export interface LadderVerdictValue {
  decisionType: 'ladder-verdict';
  logicalTaskId: LogicalTaskId;
  nodeId: string;
  trigger: TriggerClass;
  /** The judged attempt's root dispatch seq. */
  attemptRef: EntryRef;
  raisesRung: boolean;
  rungIndexAfter?: number;
  rungsRemainingAfter?: number;
  /** Present exactly when raising: the authorized next rung attempt. */
  nextAttempt?: {
    childScope: string;
    /** The full admission-computed lineage block (registerAttempt input). */
    lineage: Json;
    /** The concrete rung the next attempt executes on. */
    rungIndex: number;
  };
  /** The embedded respawn admission (the spawn debit; docs/07, 11.3 b). */
  admissions?: Json[];
  /** Non-raising verdicts: why the ladder ended here. */
  reason?: 'rungs_exhausted' | 'top_rung' | 'respawn_denied' | 'trigger_not_declared';
}

/** Content key of one ladder verdict: the judged attempt is unique. */
export function ladderVerdictKey(attemptRef: EntryRef): string {
  return deriverV2.deriveKey({ kind: 'ladder-verdict', attemptRef });
}

/** The forced verdict schema of the judge gate (docs/07, section 10). */
export const JUDGE_VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['pass', 'reason'],
  additionalProperties: false,
} as const;

/**
 * The judge prompt: artifact-grounded, assembled from journaled values
 * only (the attempt's output summary and artifact index), so a replayed
 * judge dispatch hashes identically.
 */
export function judgePrompt(input: {
  taskPrompt: string;
  outputSummary: string;
  artifactIds: readonly string[];
}): string {
  return [
    'You are an acceptance judge for one completed attempt of a task.',
    `TASK: ${input.taskPrompt}`,
    `RESULT SUMMARY: ${input.outputSummary}`,
    `ARTIFACTS: ${input.artifactIds.length === 0 ? '(none)' : input.artifactIds.join(', ')}`,
    'Judge whether the result satisfies the task. Respond ONLY with the',
    'verdict object: { "pass": boolean, "reason": string }.',
  ].join('\n');
}
