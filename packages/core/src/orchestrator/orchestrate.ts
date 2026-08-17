/**
 * The mode (c) dynamic orchestrator (M6-T07/T08).
 *
 * Full contract: https://docs.rulvar.com/guide/adaptive-orchestration. An ordinary
 * workflow whose agent (role 'orchestrate') holds the typed spawn tools;
 * both surfaces (top-level orchestrate() and ctx.orchestrate) share this
 * one implementation, the nested surface riding ctx.workflow so the
 * AdmissionController clamps depth and budget for free.
 *
 * Resume semantics (the M6 gate): orchestrator turns checkpoint at every
 * turn boundary (mandatory for the orchestrate role); every spawn is an
 * ordinary kind 'agent' entry; a crashed orchestrate() restores its
 * history from the checkpoint and finds child results by content keys,
 * WITHOUT regenerating spawn decisions and without re-paying children.
 * Non-PlanRunner applicability: only the lifetime
 * cap, maxDepth, and the budget layers apply; no termination.init is
 * written; escalated children simply settle into their digests.
 */
import { createHash } from 'node:crypto';
import {
  AdmissionRejectedError,
  BudgetExhaustedError,
  ConfigError,
  FailRunError,
} from '../l0/errors.js';
import {
  CLAIM_JUDGE_LABEL,
  FINAL_COMPOSITION_LABEL,
  FINISH_REJECTION_ABORT_REASON,
  SYNTHESIS_NOTE_LABEL,
} from '../l0/telemetry-reduce.js';
import { jcsSerialize } from '../l0/jcs.js';
import {
  requireFraction,
  requireNonNegativeInteger,
  requireNonNegativeNumber,
  requirePositiveInteger,
} from '../l0/validate-numbers.js';
import { truncateToBudget } from '../l0/truncate.js';
import type { Json } from '../l0/json.js';
import { createCanonicalIdMinter, type Effort, type ModelSpec } from '../l0/messages.js';
import { canonicalIsolationTag, type SpawnLineageOpt } from '../journal/lineage.js';
import { agentScope } from '../journal/scope.js';
import type { AgentResult } from '../runtime/agent-loop.js';
import { validateUsageLimits, type UsageLimits } from '../runtime/usage-limits.js';
import { profileCard } from '../model/profile-card.js';
import {
  collectDeclaredLadders,
  filterClaimsForRun,
  modelKnowledgeCard,
} from '../knowledge/card.js';
import {
  kBootCheckpoint,
  kExposureWait,
  kFinalizeReserve,
  kOnRunning,
  kTerminalTool,
  runtimeOf,
  type CtxScopeState,
  type InternalAgentHooks,
} from '../engine/internal.js';
import { ROOT_ACCOUNT } from '../engine/budget.js';
import { emitSpawnAdmitted, emitSpawnRejected } from '../engine/spawn-events.js';
import { OrchestratorCapConfigError } from '../l0/errors.js';
import { deriverV2 } from '../journal/keyderiver.js';
import { lastRunSettle } from '../stores/reconcile.js';
import { lastMechanicalRepairCostUsd } from '../stores/synthesis-candidates.js';
import type { AgentOpts, AgentProfile, Ctx, Workflow } from '../engine/ctx.js';
import { defineWorkflow } from '../engine/ctx.js';
import type { Engine, RunOptions } from '../engine/engine.js';
import type {
  AcceptanceChildSummary,
  ChildrenAtFailure,
  RejectedFinishCandidate,
  RunHandle,
} from '../engine/run-handle.js';
import type { AdmissionDecision } from './admission.js';
import { dedupeRepeatedClaims, type RepeatedClaim } from './claims.js';
import {
  digestOf,
  executionFactsOf,
  WAKE_SUMMARY_RENDER_BUDGET_CHARS,
  type ChildArtifactPage,
  type ChildResultPage,
  type OrchestratorRuntime,
  type SpawnAdmissionValue,
  type SpawnRecord,
  type TaskDigest,
} from './handles.js';
import {
  buildOrchestratorTools,
  DEFAULT_CHILD_RESULT_PAGE_CHARS,
  FINISH_TOOL_NAME,
  GET_CHILD_RESULT_TOOL_NAME,
  MAX_CHILD_RESULT_PAGE_CHARS,
  READ_CHILD_ARTIFACT_TOOL_NAME,
  type SpawnAgentParams,
} from './spawn-tools.js';
import {
  DEFAULT_CITATION_PATTERN,
  applyFinishRepairHints,
  spliceSections,
  type FinishRepairHint,
  type FinishValidationInput,
  type FinishValidationVerdict,
  type FinishValidator,
} from './finish-validators.js';
import {
  DEFAULT_MAX_CONTRADICTIONS,
  findContradictions,
  type Contradiction,
  type ContradictionSource,
} from './contradictions.js';
import {
  claimCoverageOf,
  DEFAULT_MAX_CLAIM_PAIRS,
  pairDraftClaims,
  pairRunFactClaims,
  type ClaimCoverageGrade,
  type ClaimPair,
} from './consistency.js';
import type { SchemaSpec } from '../l0/schema.js';
import {
  selfTestFinishValidation,
  type FinishContract,
  type FinishSelfTestFixtures,
} from './output-contract.js';
import type {
  ExtensionDispatchSpec,
  OrchestratorExtension,
  OrchestratorExtensionIO,
} from './extension.js';
import { emptyDigestBlocks } from './wake.js';
import type { EscalationDigest, WakeDigest, WakeTrigger } from './wake.js';

/**
 * Budget contract: https://docs.rulvar.com/guide/budgets; the cap
 * machinery (reserves, freeze) completes in M7 (DEF-7).
 */
export interface OrchestratorBudgetSpec {
  /**
   * Absolute bound in USD: a finite number >= 0, validated before any
   * journal entry or dispatch (a malformed value is a ConfigError). It
   * never REPLACES the fraction bound:
   * effectiveCap = min(capUsd, (capFraction ?? 0.2) * ceiling), so an
   * explicit capUsd larger than the default fraction of the run ceiling
   * is still cut to that fraction (and a warn log says so). Pass
   * capFraction: 1.0 to make capUsd the sole bound.
   */
  capUsd?: number;
  /**
   * A fraction in (0, 1], default 0.2; effectiveCap = min of the given
   * bounds. Zero does not lift the cap (it would make every turn
   * unpayable): anything outside (0, 1] is a ConfigError before any
   * journal entry or dispatch.
   */
  capFraction?: number;
  /**
   * A finite number >= 0, validated before any journal entry or
   * dispatch. The reserve is SUBTRACTED from the soft boundary, so a
   * negative value would widen the cap instead of reserving.
   */
  finalizeReserveUsd?: number;
  /**
   * The synthesis payload reserve (the sixth comparison experiment,
   * cycle 76): absolute USD held out of the orchestrator sub account
   * while the coordination loop runs, released to the synthesis
   * invocation just before it dispatches. Without it a pricey
   * coordination can leave the synthesis turns a remainder the budget
   * clamp shrinks below the contract's minimal accepting payload: the
   * finish is then cut at the output allowance before any tool call,
   * the invocation dies at maxTurns, and a validator-bound run fails
   * closed (the rematch run 1 lost an entire paid run exactly there).
   * Requires the `synthesis` option (single mode); must stay below the
   * effective cap. Declaring it changes budget arithmetic only; absent
   * keeps every account byte identical.
   */
  synthesisReserveUsd?: number;
  /**
   * A positive integer, validated before any journal entry or dispatch:
   * the turn limit of the reserved final wake.
   */
  finalizeTurns?: number;
  /**
   * The policy at the cap, validated as exactly one of the two literals
   * even at a plain JS/JSON boundary. 'finish-with-partial' (default)
   * runs the reserved finalizer and settles run status 'ok' with the
   * completion envelope { result, completion } as the value (RV906):
   * completion is 'partial' unless the finalizer's finish provably
   * passed the FULL declared contract (the declared finish validators
   * bind the reserved finalizer; a declared acceptance policy is never
   * judged at the cap, so with one declared the terminal stays
   * 'partial'). The engine lifts the same literal onto run:end and the
   * outcome mirror, so a consumer reading only status cannot execute a
   * truncated plan as a full success. A finalizer that cannot produce
   * an accepted finish falls back to the deterministic partial on the
   * 'exhausted' outcome, itself carrying completion 'partial'.
   * 'fail-run' skips the finalizer entirely: the run
   * fails with outcome 'error' carrying FailRunError (code 'fail_run',
   * data.source 'orchestrator_budget_cap', data.capDecisionRef); resume
   * rolls the same failure forward from the journaled cap decision
   * without another model call.
   */
  atCap?: 'finish-with-partial' | 'fail-run';
}

/** Options for orchestrate(engine, goal, o?). */
/**
 * The opt-in child completion policy (the v1.40.0 improvement plan's
 * completion contract): run status 'ok' alone never proves the children
 * succeeded, because the model may call finish after any mix of child
 * outcomes. When acceptance is set, the policy is evaluated exactly when
 * the model's finish validates, the verdict is journaled as ONE decision
 * entry (so a resume rolls the SAME verdict forward, immune to drift of
 * the live options), and the workflow result becomes the acceptance
 * envelope { result, completion, childStatusCounts, degradedReasons }. A
 * violated policy fails the run with the typed FailRunError (code
 * 'fail_run', data.source 'orchestrator_acceptance') instead of settling
 * ok. A budget cap settle keeps its atCap policy and acceptance is not
 * judged at the cap: under 'finish-with-partial' the capped terminal
 * carries completion 'partial' in its envelope (RV906) precisely
 * because the declared acceptance went unjudged, and under 'fail-run'
 * the typed failure stands, so the cap can never impersonate an
 * accepted finish.
 */
export interface OrchestrateAcceptance {
  /**
   * 'all-ok' requires EVERY spawned child to have settled 'ok' when
   * finish validates: a child still running counts against the policy,
   * and so does a deliberately cancelled straggler (spawn nothing you do
   * not need to succeed; zero spawned children are vacuously complete).
   * { minSuccessful: N } requires at least N children settled 'ok' and
   * reports every other child in degradedReasons.
   */
  childPolicy: 'all-ok' | { minSuccessful: number };
  /**
   * The partial-child salvage switch (RV-210 close-out; default false).
   * When true, a child that settled 'limit' WITH a structured terminal
   * partial (it recorded progress through the stock `report_progress`
   * tool before the budget expired) counts as a successful child for the
   * policy: under 'all-ok' it no longer rejects the run, and under
   * { minSuccessful: N } it counts toward N. The acceptance verdict then
   * reports completion 'partial' (never 'complete'), lists the salvaged
   * children in `salvagedPartialChildren` on the result envelope, and
   * keeps a per-child note in degradedReasons. A limit child WITHOUT a
   * partial gave the caller nothing to salvage and still counts against
   * the policy. The whole fold is journaled in the single acceptance
   * decision, so a resume rolls the same verdict forward.
   */
  acceptPartialChildren?: boolean;
  /**
   * The spawned-roster floor (RV507): finish is rejected when FEWER
   * than this many children were spawned, under BOTH child policies.
   * 'all-ok' alone treats zero spawned children as vacuously complete
   * (spawn nothing you do not need to succeed), which lets a
   * fan-out-shaped task settle ok without ever fanning out; the floor
   * makes the intended decomposition binding. The journaled decision
   * (and a rejection's error data) carries the actual
   * `spawnedChildren` beside the configured floor, so a resume rolls
   * the same verdict forward. Positive integer; policy only, never
   * part of any identity.
   */
  minSpawnedChildren?: number;
  /**
   * The terminal-output salvage switch (the 1.64.0 experiment review,
   * P0.4 + P1.1; default false). When true, a child that settled
   * 'limit' CARRYING a terminal output counts as a successful child for
   * the policy, exactly like acceptPartialChildren counts a
   * partial-bearing one. A limit terminal carries an output ONLY when
   * the child's limits.finalizationReserve summary turn produced one
   * AND, for a schema child, that summary already validated against the
   * declared output schema (an invalid summary keeps output null and is
   * never salvaged), so validation runs BEFORE acceptance by
   * construction. The verdict then reports completion 'partial' (never
   * 'complete'), lists the children in `salvagedTerminalOutputChildren`
   * on the result envelope, and keeps a per-child note in
   * degradedReasons. A child carrying BOTH an output and a progress
   * partial salvages by its output. The child's digest and
   * get_child_result surface the output unconditionally (paid, journaled
   * evidence is never withheld); this option gates only the acceptance
   * fold, the evidencePreservedValidator cited pool (via
   * FinishValidationChild.salvageableOutput), and the coordination
   * prompt line. The whole fold is journaled in the single acceptance
   * decision, so a resume rolls the same verdict forward.
   */
  acceptValidatedTerminalOutputOnLimit?: boolean;
  /**
   * The binding evidence floor (RV1207, the sixteenth comparison run;
   * default false). A salvage arm above accepts a limit child by the
   * work it carries, which says nothing about the DECLARED evidence
   * contract: in that run a worker settled 'limit' with 10 of 14
   * declared entries and was promoted through terminal-output salvage
   * with the floor waived, so an 'all-ok' run reported status ok
   * (completion 'partial') over an unmet contract. With this true, a
   * child that declared an evidence contract it did not meet is NEVER
   * promoted by a salvage arm: it counts against the policy exactly
   * like an unsalvageable limit child, so 'all-ok' rejects and
   * { minSuccessful: N } does not count it toward N. Salvage stays
   * DIAGNOSTIC: the roster still records the arm that would have
   * applied and the evidence verdict (marked `floorRequired` instead
   * of `waivedBySalvage`), the degradedReasons name the shortfall with
   * its counts, and the child's output stays visible through the
   * digest and get_child_result exactly as before. A child with no
   * declared contract, or one that met its floor, is untouched.
   *
   * Since RV1412 the same flag binds the floor for OK children too: a
   * child that settled 'ok' below its declared floor counts against
   * the policy ('all-ok' rejects; `{ minSuccessful: N }` does not
   * count it toward N), its roster row is marked `floorRequired`, and
   * `belowFloorOkChildren` lists it. WITHOUT the flag such a child is
   * visible but uncounted: the shortfall is a degradation note (so
   * completion honestly reads 'partial', never 'complete' over an
   * unmet declared contract), the list is present, and the verdict is
   * exactly what it was before this shipped.
   */
  requireEvidenceFloor?: boolean;
}

/** How many rejected finishes are repaired by default: the plan's repair once. */
export const DEFAULT_FINISH_MAX_REPAIRS = 1;

/**
 * The most hinted edits one deterministic repair attempt will apply
 * (RV3801): a validator caps its own hints well below this, so the
 * bound only guards against a custom validator flooding the journal
 * with patch rows; past it the candidate goes to the model pool.
 */
const MAX_DETERMINISTIC_PATCHES = 64;

/** The sectional round's owning sections and marker roster (RV3803). */
export interface SectionalRoundPlan {
  /** Every H2 marker of the retained document, in document order. */
  sections: string[];
  /** The markers owning at least one finding excerpt, document order. */
  targets: string[];
}

/**
 * Plans the sectional claim repair round (RV3803): which H2 sections
 * of the accepted pre-repair document own the judged findings. The
 * third comparison run's round regenerated the WHOLE 43k character
 * document to consume findings that lived in a handful of sentences,
 * and the tail after fan-in was 80.1 percent of the run's wall. Each
 * finding's `draftExcerpt` (whitespace collapsed by the pairing fold)
 * is located in the document through a collapse-aware scan, and its
 * owning section is the nearest H2 line above it. Fail closed to the
 * FULL regeneration (undefined, the historical round byte for byte)
 * whenever the plan cannot be exact: no excerpts, a document without
 * H2 headings, duplicated markers (the splice grammar needs unique
 * lines), or any excerpt the scan cannot locate.
 */
export function sectionalRoundPlan(
  document: string,
  excerpts: readonly string[],
): SectionalRoundPlan | undefined {
  if (excerpts.length === 0) {
    return undefined;
  }
  const markers: { marker: string; start: number }[] = [];
  let offset = 0;
  for (const line of document.split('\n')) {
    if (line.trim().startsWith('## ')) {
      markers.push({ marker: line.trim(), start: offset });
    }
    offset += line.length + 1;
  }
  if (markers.length === 0 || new Set(markers.map((m) => m.marker)).size !== markers.length) {
    return undefined;
  }
  // The collapse-aware index: the excerpt bytes went through
  // `trim().replace(/\s+/gu, ' ')` in the pairing fold, so the raw
  // document is walked into the same shape with each collapsed
  // character remembering its raw offset.
  const collapsed: string[] = [];
  const rawAt: number[] = [];
  let pendingSpace = false;
  for (let index = 0; index < document.length; index += 1) {
    const char = document[index] ?? '';
    if (/\s/u.test(char)) {
      pendingSpace = collapsed.length > 0;
      continue;
    }
    if (pendingSpace) {
      collapsed.push(' ');
      rawAt.push(index);
      pendingSpace = false;
    }
    collapsed.push(char);
    rawAt.push(index);
  }
  const haystack = collapsed.join('');
  const targets: string[] = [];
  for (const excerpt of excerpts) {
    const at = haystack.indexOf(excerpt.trim());
    if (at < 0) {
      return undefined;
    }
    const raw = rawAt[at] ?? -1;
    const owner = [...markers].reverse().find((m) => m.start <= raw);
    if (owner === undefined) {
      return undefined;
    }
    if (!targets.includes(owner.marker)) {
      targets.push(owner.marker);
    }
  }
  targets.sort(
    (a, b) => markers.findIndex((m) => m.marker === a) - markers.findIndex((m) => m.marker === b),
  );
  return { sections: markers.map((m) => m.marker), targets };
}

/**
 * Character cap of the HOST VALIDATION LESSONS prompt block (RV3603):
 * the bounded repair round's prompt folds the run's journaled finish
 * validation failures so the round does not relearn a lesson the run
 * already bought, and a pathological history must not flood the
 * composition context. Rows keep journal order; the tail is dropped
 * and the block names how many rows it dropped.
 */
export const FINISH_LESSON_CAP_CHARS = 2000;

/**
 * Default maxTurns of the synthesize invocation (RV-211): the finish
 * call plus headroom for one validator repair exchange.
 */
export const DEFAULT_SYNTHESIS_MAX_TURNS = 4;

/**
 * Default maxTurns of ONE incremental synthesis note (RV-211 remainder):
 * a note summarizes a single settled child into a bounded finish call,
 * so it needs less headroom than the full synthesis invocation.
 */
export const DEFAULT_SYNTHESIS_NOTE_MAX_TURNS = 2;

/**
 * Default maxTurns of the claim-consistency judge invocation
 * (RV1502): one structured-output turn plus headroom for schema
 * repair exchanges.
 */
export const DEFAULT_CLAIM_JUDGE_MAX_TURNS = 3;

/**
 * The judge invocation's output schema (RV1502): one row per judged
 * contradiction, naming the zero-based pair index and one short
 * reason. Static on purpose: schemaHash enters identity, and a schema
 * derived from the pair count would re-key the invocation on every
 * pool change without buying any validation the defensive row check
 * does not already perform.
 */
const CLAIM_JUDGE_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['contradictions'],
  properties: {
    contradictions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['pair', 'reason'],
        properties: {
          pair: { type: 'integer', minimum: 0 },
          reason: { type: 'string', minLength: 1 },
        },
      },
    },
  },
};

/**
 * The opt in deterministic validation of the orchestrator finish result
 * (the v1.40.0 improvement plan's RV-204 slice). Every SCHEMA valid
 * finish({ result }) call first passes the configured host validators;
 * a rejection returns the failure reasons to the model as the call's
 * error tool result and the turn continues (a repair turn: the model
 * fixes the result and calls finish again), bounded by maxRepairs
 * within the composition invocation (RV3602). A
 * rejection past the bound fails the run with the typed FailRunError
 * (code 'fail_run', data.source 'orchestrator_finish_validation'),
 * BEFORE the acceptance settle, so acceptance never judges a finish the
 * validators rejected. Every verdict journals as ONE decision entry
 * keyed by the finish call id (decisionType
 * 'orchestrator_finish_validation'), so a resume rolls the SAME
 * verdicts forward without re-running validator code, and the whole
 * exchange replays without new paid calls. The toolset never changes
 * (the contract rides the orchestrator prompt), zero configuration adds
 * zero journal entries, and the budget cap paths keep their posture:
 * the reserved finalize dispatch is never validated, exactly as
 * acceptance never judges it. Repair turns spend from the
 * orchestrator's ordinary limits and ceilings (maxTurns, budget caps,
 * the root budgetUsd); maxRepairs is the explicit bound, and a
 * dedicated repair budget reserve is deliberately out of scope here.
 */
export interface FinishValidationSpec {
  /**
   * Run in configuration order on every schema valid finish call; names
   * must be unique (pass `name` to a factory to run several instances).
   * A validator that THROWS is a host defect: the run fails as
   * ConfigError, nothing journals, and no repair turn is granted.
   */
  validators: FinishValidator[];
  /**
   * How many rejected finishes are returned to the model for repair
   * before the run fails; a nonnegative integer, default
   * {@link DEFAULT_FINISH_MAX_REPAIRS}. Zero means the first rejected
   * finish fails the run. The bound belongs to one composition
   * invocation (RV3602): with the bounded claim repair round armed
   * (`claimConsistency.onFound: 'repair'`), the initial composition
   * and the round each enter with the full bound, because the third
   * comparison run's round inherited a spent run wide pool and its
   * first regression was final by construction. At most two
   * invocations exist, so the worst case is `maxRepairs + 1` judged
   * finishes per invocation, twice.
   */
  maxRepairs?: number;
  /**
   * Retain the BYTES of every rejected finish candidate as its own
   * addressable transcript blob (RV2507, the 1.226.0 comparison run),
   * default off. The identity of a rejected candidate always rides the
   * terminal (`rejectedFinishCandidates`: the call id, the sha256 that
   * names WHICH document drew the verdict, its size, and the validator
   * diffs); that costs nothing, because it is derived from decisions
   * the journal already holds. A COPY of the document costs storage,
   * so it is a decision the host makes: with this on, each rejected
   * candidate is written to `<runId>/finish-rejected/<callId>` and the
   * terminal row carries its `ref`, one `transcripts.get` away from the
   * bytes. Turn it on for evaluation and comparison runs. The
   * comparison run's three rejected syntheses were reachable only by an
   * external script that re-parsed the whole agent transcript; nothing
   * on the terminal or in the journal said where they were, or even
   * that they differed from each other.
   *
   * Bounded by construction: at most `maxRepairs + 1` candidates per
   * finish-validated invocation, under the run's own prefix, so
   * `Engine.deleteRun` cascades over them like every other run blob. A
   * store that refuses the write costs the run nothing: the row keeps
   * its identity and drops its `ref`, and absence means NOT RECORDED.
   */
  retainRejectedCandidates?: boolean;
  /**
   * The repair turn reserve (the v1.71 experiment review, P0.4; the
   * reserve RV-204 deliberately deferred). A nonnegative integer,
   * default 0: max EXTRA turns the invocation the validators bind (the
   * synthesis invocation when `synthesis` is configured, the
   * coordination loop otherwise) may consume past its `maxTurns`, one
   * granted per rejected finish exchange, schema-invalid finish
   * arguments and host validation rejections alike. Without it, repair
   * exchanges and generation compete for the same turn budget: the
   * v1.71 experiment lost its whole run to one malformed finish plus
   * one validator rejection inside maxTurns 3. The reserve is bounded,
   * spends from the ordinary budget ceilings (a granted turn is a paid
   * provider turn), and folds into the preflight turn projection
   * (`projectedProviderTurns` and the run ceiling) when declared
   * there. Zero keeps the pre 1.73 ceiling byte identical.
   */
  repairTurnReserve?: number;
  /**
   * The declared price of ONE mechanical repair turn in USD (RV3802),
   * the money twin of `repairTurnReserve`'s turn grant: the bounded
   * claim repair round (`claimConsistency.onFound: 'repair'`) holds
   * this beside the verdict money (RV3701) from the moment the round
   * is admitted, so the one repair turn the round's own finish
   * contract can grant is funded when the candidate materializes; the
   * leg releases to the round's finish loop at its first journaled
   * verdict. Undeclared, the hold falls back to the run's own observed
   * last mechanical repair price (`lastMechanicalRepairCostUsd` over
   * the journal, absent when no priced repair window exists), else
   * zero, which keeps every pre-RV3802 admission byte identical. A
   * nonnegative finite number; refused typed otherwise.
   */
  estRepairCostUsd?: number;
  /**
   * The coordination draft gate (the v1.74 experiment review, P0.3),
   * meaningful ONLY with `synthesis` configured: with validators bound
   * to the synthesis finish, the coordination finish is an unvalidated
   * draft, and the experiment's model escaped six failed finish
   * exchanges with the schema-valid draft 'test', which then starved
   * synthesis of every citation the validators demanded. The policy
   * runs deterministic library checks on each coordination finish
   * (whitespace-token `minWords`, literal `requireSections` markers,
   * the wordCountValidator and requiredSectionsValidator semantics);
   * a failing draft returns to the model as the finish call's error
   * result and the turn continues, exactly like a host validation
   * rejection, and `repairTurnReserve` grants coordination the same
   * per-rejected-exchange headroom it grants the synthesis finish.
   * Pure text checks over the durable exchange: nothing journals, a
   * resumed segment recounts identically, and `maxRepairs` is not
   * consumed (it belongs to the synthesis-bound validators). Absent =
   * byte identical pre 1.76 behavior; configured without `synthesis` =
   * ConfigError.
   *
   * The sentinel `'contract'` (RV808a) gates the draft by the FULL
   * declared validator set instead of a hand-written subset, with the
   * same children snapshot the synthesis-bound validation reads. The
   * twelfth comparison run showed why the subset starves the
   * `skipWhenDraftValid` gate: the coordination repair loop drove the
   * draft only to the weak policy, the pre-pass then judged it by the
   * full contract and failed, and the run paid the whole synthesis
   * plus its own repair for defects a coordination exchange could
   * have fixed. Under `'contract'` the rejection feedback names the
   * failing validators, so coordination repairs drive the draft
   * toward exactly what the pre-pass will judge, making the skip
   * reachable. Same posture otherwise: nothing journals, the durable
   * exchange recounts identically, `maxRepairs` untouched. Honest
   * bound: validators that fold the children snapshot (the evidence
   * share) can still fail the pre-pass when a child settles between
   * the draft finish and synthesis; the pre-pass stays the authority.
   */
  draftPolicy?:
    | {
        /** Minimum whitespace-separated words the draft must carry. */
        minWords?: number;
        /** Literal markers the draft text must contain. */
        requireSections?: string[];
      }
    | 'contract';
  /**
   * Sectional bounded repair (RV808b). A rejected finish used to
   * resend the WHOLE document to fix one violated section: on the
   * twelfth comparison run the coordination draft plus its repairs
   * alone cost 406 s of model output. With this declared, every
   * rejection feedback of a gated finish teaches the sectional
   * vocabulary, and the model may repair by calling
   * `finish({ sections: { '<declared marker>': '<new body>' } })`
   * instead of resending the document: the host splices the patch
   * into the RETAINED rejected attempt (line-anchored, the exported
   * {@link spliceSections} semantics: a marker absent from the
   * attempt is appended in declared order) and validates the
   * reconstructed document whole. The vocabulary rides every finish
   * the host actually gates: the validator-bound finish (the
   * synthesis invocation when `synthesis` is configured, the
   * coordination loop otherwise) and, when a `draftPolicy` is
   * declared, the coordination draft gate; the synthesis invocation
   * is additionally SEEDED with the coordination draft as its
   * retained base, so a synthesis that agrees with the draft repairs
   * only the named gaps without ever resending it (the carryDraftGaps
   * pairing). Mechanics refusals (sections beside result, an
   * undeclared marker, no retained attempt to splice into) are typed
   * error results, the moral twin of a schema rejection: they journal
   * nothing, spend no `maxRepairs`, and stay bounded by the turn
   * budget; only the verdict over the SPLICED document spends the
   * repair bound. Nothing new journals anywhere: the exchange is
   * durable in the transcript, the splice is a pure function of it,
   * and the accepted invocation output IS the reconstructed
   * document. Honest bound: the retained attempt lives in the
   * invocation; a segment resumed from a mid-invocation checkpoint
   * retains nothing yet and refuses the first sectional call with the
   * full-resubmission remedy (the synthesis seed re-derives from the
   * journaled draft and never has this window). Declaring the option
   * swaps the finish tool schema and description for the gated
   * invocations, so their toolset hash moves BY DESIGN (the
   * exposeChildResultTools precedent); absent = every byte
   * identical.
   */
  sectionalRepair?: {
    /** The marker lines that partition the document, unique, in document order. */
    sections: string[];
  };
  /**
   * The unified output contract this validator set enforces (the v1.71
   * experiment review, P0.1/P0.2). Construction then runs the golden
   * self test with the contract's fixtures as defaults, the contract's
   * promptLines join the validator statement in BOTH the coordination
   * and synthesis prompts, every contract validator must appear in
   * `validators` by name (a promised contract nobody enforces is drift
   * by omission, a ConfigError), and the run journals ONE frozen
   * bundle descriptor (decisionType
   * 'orchestrator_finish_validation_bundle') recording the contract
   * hash and the validator names. A resumed segment whose live
   * contract hash differs appends a SUPERSEDING descriptor instead of
   * failing, because fixing a stale validator and resuming is the
   * intended remedy, never a fault. The remedy is generation-scoped
   * (cycle 73): every decision entry written under a contract carries
   * `contractHash`, and only the CURRENT generation is judged, so
   * repairsUsed restarts under a fixed contract and a final rejection
   * a superseded generation left in the crash window neither rolls
   * forward at boot nor re-arms on replay (its exchange replays byte
   * identical and the loop continues to a live repair turn). Decisions
   * recorded before 1.77 carry no hash and bind to the current
   * contract only while the journal holds a single bundle descriptor;
   * once a supersession is recorded they are stale. The bundle is
   * deeply frozen and the construction self test also runs the
   * contract's per validator reject goldens against the CONFIGURED
   * set (cycle 74), so a post construction mutation throws and a
   * same-name replacement weaker than the contract's own validator is
   * a ConfigError before any provider call. Absent = byte identical
   * pre 1.72 behavior.
   */
  contract?: FinishContract;
  /**
   * Golden fixtures of the construction self test (the v1.71
   * experiment review, P0.3), overriding the contract's generated
   * fixtures: a host with custom validators supplies an accept fixture
   * those validators actually accept. Fixtures without a contract run
   * the self test on their own. Absent with no contract = no self
   * test, the pre 1.72 behavior.
   */
  selfTest?: FinishSelfTestFixtures;
}

export interface OrchestrateOptions {
  model?: ModelSpec;
  /** Registered profile names to advertise; default: every profile. */
  profiles?: string[];
  /**
   * Per-orchestrate spawn cap: a nonnegative integer (zero admits no
   * spawns), validated before any journal entry or dispatch. The engine
   * lifetime cap applies regardless. The cap counts ADMITTED children:
   * an admission-rejected spawn (budget, quota, depth) consumes no slot,
   * so the orchestrator may retry a rejected role at a viable budget
   * (v1.81; the sixth comparison experiment's run 2). Attempts stay
   * bounded regardless through the coordination turn's own tool budget.
   */
  maxSpawns?: number;
  /** The orchestrator's own budget sub-account (cap enforcement layers only in M6). */
  budget?: OrchestratorBudgetSpec;
  /**
   * Deterministic digest render bound: a nonnegative integer, validated
   * before any journal entry or dispatch. Each TaskDigest outputSummary
   * is truncated to AT MOST this many CHARACTERS, the truncation marker
   * included (a budget below 3 keeps the bound with a bare slice; the
   * model-independent measure; OQ-04 closed at M10 entry). Default
   * WAKE_SUMMARY_RENDER_BUDGET_CHARS.
   */
  renderBudgetChars?: number;
  /** UsageLimits of the orchestrator agent itself (maxTurns etc.). */
  limits?: UsageLimits;
  /**
   * The opt-in mode (c) extension seam (M7-T05): PlanRunner from
   * @rulvar/plan attaches here. The extension boots
   * strictly before the orchestrator's first agent entry, contributes
   * tools, schedules ready plan nodes on every settlement, and
   * participates in the mandatory quiescence trigger.
   */
  extension?: OrchestratorExtension;
  /** The opt in child completion policy; see {@link OrchestrateAcceptance}. */
  acceptance?: OrchestrateAcceptance;
  /**
   * The terminal child barrier policy (RV1903, the four-role
   * benchmark's recovery arm): what happens to children still running
   * when the orchestration exits, on EVERY exit path (an accepted or
   * rejected finish, a typed failure, a budget or exposure terminal).
   * 'cancel' (the default) aborts them and awaits their journaled
   * cancelled terminals; 'drain' awaits their natural terminals,
   * bounded by their own limits and budgets, preserving their evidence
   * at the price of the wait. Either way the orchestration returns
   * only after every spawned child has a terminal journal entry, so
   * `run_settle` can never precede a child's billing row again: the
   * benchmark's recovery journal recorded three child terminals AFTER
   * the settle decision, and four mutually inconsistent cost views
   * followed. The verdict the run settled with is already frozen
   * before the barrier runs, so late children never change it.
   */
  onUnsettledAtExit?: 'cancel' | 'drain';
  /**
   * The parallel_agents admission policy (RV1908). 'fail-fast' (the
   * default, the RV805 shape) admits in submission order and stops at
   * the first refusal, tasks after it never attempted. 'try-all'
   * attempts every task and reports every refusal, so one refused
   * sibling no longer hides whether the rest would seat. 'all-or-none'
   * projects the WHOLE batch against the live remainder first and
   * refuses it typed with zero admissions when it cannot seat
   * entirely; a non-budget failure mid-batch cancels the admitted
   * siblings, best-effort atomicity over a machinery that cannot
   * un-admit. Independent of the policy, a declared
   * acceptance.minSpawnedChildren arms the roster pre-check: a batch
   * large enough to seat the floor whose feasible count cannot reach
   * it is refused before paying for the first child, the four-role
   * benchmark's primary arm shape, where two workers were paid in
   * full and the settle verdict was bound to reject them.
   */
  parallelAdmission?: 'fail-fast' | 'try-all' | 'all-or-none';
  /**
   * The batch-spawn discipline (RV2005). The third parity rerun's
   * model ignored the instruction to spawn its roster in one
   * parallel_agents call and spawned seat by seat through spawn_agent,
   * so the RV1908 batchGate never saw a batch and the roster
   * feasibility rode on per-seat luck. 'reject-spawn-agent' refuses
   * every SINGLE spawn_agent call typed (code 'batch_required',
   * nothing journaled, nothing paid) so model disobedience cannot
   * split the policy: the model reads the refusal and re-issues the
   * wave as one parallel_agents batch. Absent, both tools behave as
   * documented.
   */
  requireBatchSpawn?: 'reject-spawn-agent';
  /**
   * The opt in deterministic host validation of the finish result, with
   * bounded repair; see {@link FinishValidationSpec}.
   */
  finishValidation?: FinishValidationSpec;
  /**
   * Opt in to the evidence tools `get_child_result` and
   * `read_child_artifact` (the v1.40.0 improvement plan's narrow RV-201
   * slice). The digest an await returns is a wake signal truncated to 400
   * characters; with this set, the orchestrator can page a settled
   * child's FULL output and its artifact contents, both pure reads of
   * durable journal state. Adding the tools changes the orchestrator
   * toolset hash by design (exactly like the extension's plan tools), so
   * leave it off and the default toolset, and every frozen cassette, stay
   * unchanged.
   */
  exposeChildResultTools?: boolean;
  /**
   * Opt in the bulk settled-set read `get_settled_child_results`
   * (RV1807). The nineteenth benchmark's root made fourteen
   * `get_child_result` calls to consume six children, eight of them
   * speculative probes that returned not-settled errors; with this
   * set, the model consumes the exact `settledHandles` set an
   * `await_any` digest returns in ONE call, refused typed BEFORE any
   * read when a handle is unknown or still running. Its own opt-in
   * rather than a rider on `exposeChildResultTools`, because adding a
   * tool under the existing flag would move every opted-in run's
   * toolset hash and re-key their resumes.
   */
  exposeSettledResultsTool?: boolean;
  /**
   * Opt in per-child execution facts on the await digests and the
   * child result page (RV1503, the eighteenth improvement plan). The
   * seventeenth comparison run graded its whole dossier
   * `live-observed: no` while the harness had just watched 118 wire
   * requests settle, because no surface ever showed the composing root
   * what its run actually executed. With this set, every TaskDigest an
   * await returns (and every `get_child_result` page) carries
   * `facts`: wire request and missing-response-id counts folded from
   * the journaled per-dispatch reconciliation records, plus the
   * journaled token totals ({@link executionFactsOf}), all
   * replay-stable by construction. Dollars are deliberately absent
   * (replay re-prices from the current table). Off by default: tool
   * result bytes enter the window, and the window is journal identity,
   * so the historical bytes stay exact without the opt-in.
   */
  executionFacts?: boolean;
  /**
   * The opt in post-fan-in synthesis invocation (RV-211): with this set,
   * the coordination loop's finish({ result }) becomes a DRAFT, and a
   * SEPARATE fresh invocation with role 'synthesize' (its own model,
   * effort, and limits through the ordinary resolution chain; the
   * routing key 'synthesize' picks its model and never summons it)
   * composes the final run result from the goal, the draft, and the
   * settled child digest, on the finish-only toolset. When
   * finishValidation is configured its validators bind the SYNTHESIS
   * finish (the final output), not the draft. See
   * {@link OrchestrateSynthesis}.
   */
  synthesis?: OrchestrateSynthesis;
  /**
   * The opt-in bounded contradiction pass (RV1302, the sixteenth
   * comparison experiment's P2-1 remainder). A fan-out produces N
   * independent children and nothing else in the pipeline compares
   * their claims against EACH OTHER: acceptance judges each child
   * alone, the finish validators judge the final text mechanically, and
   * `synthesis.dedupeClaims` matches on agreement, so it is blind to
   * disagreement by construction. With this set, the settled evidence
   * pool is folded through {@link findContradictions} at the post-fan-in
   * chokepoint and the run says what it found. See
   * {@link OrchestrateContradictions}.
   */
  contradictions?: OrchestrateContradictions;
  /**
   * The opt-in claim-consistency pass (RV1501/RV1502, the eighteenth
   * improvement plan). The contradiction pass compares the children
   * against EACH OTHER; nothing compares the COMPOSED text against the
   * pool it composed from, so a root that inverts a child's finding
   * while citing the child's own span passes every mechanical check
   * (the seventeenth comparison run shipped exactly that inversion
   * over `subprocess.ts:256-296`). With this set, the accepted draft's
   * citing sentences are paired with the pool sentences reading an
   * intersecting span of the same file ({@link pairDraftClaims}, a
   * pure fold), and ONE bounded judge invocation rules on the pairs.
   * The judge is a PAID model call, journaled like any agent entry, so
   * a resume replays its verdict with zero adapter calls; when the
   * fold pairs nothing, no judge is ever dispatched. See
   * {@link OrchestrateClaimConsistency}.
   */
  claimConsistency?: OrchestrateClaimConsistency;
}

/**
 * The bounded contradiction pass's knobs (RV1302). The pass itself is a
 * PURE fold over the settled children the journal replays verbatim, so
 * it costs no model call, no clock, and no wall time worth measuring in
 * the post-fan-in window, and it journals nothing: a resume re-derives
 * the identical finding (the `dedupeClaims`, `policyFacts`, and
 * `evidenceIndex` precedent). The evidence pool it judges is the one
 * `evidenceIndex` indexes: ok children plus salvage-accepted ones, so a
 * dead child's error text can never contradict a real finding.
 */
export interface OrchestrateContradictions {
  /**
   * What a detected contradiction does. 'report' (the default) puts the
   * findings on the acceptance envelope and in an info log, and changes
   * nothing else. 'carry' additionally names them in the 'single'
   * synthesis prompt with the instruction to resolve each explicitly
   * instead of silently picking one, and REQUIRES that synthesis (a
   * ConfigError otherwise, the `evidenceIndex` precedent: there is no
   * prompt to ride without it). 'fail' fails the run typed with
   * `data.source` 'orchestrator_contradictions' BEFORE any synthesis
   * dispatch, so a pool that contradicts itself never pays to have the
   * disagreement composed away.
   */
  onFound?: 'report' | 'carry' | 'fail';
  /** Overrides {@link DEFAULT_CITATION_PATTERN} for the anchors; fail-closed at intake. */
  pattern?: string;
  /** Bound on reported contradictions; default {@link DEFAULT_MAX_CONTRADICTIONS}. */
  max?: number;
}

/**
 * What the contradiction pass looked at, beside its findings (RV1404).
 * Rides the acceptance envelope as `contradictionsMeta` whenever the
 * pass is configured, exactly like `contradictions` itself: `[]` plus
 * this meta says "the pass judged `poolChildren` accepted children and
 * the pool agreed", while an absent pair says nothing looked. The
 * `truncated` flag makes the `max` bound honest: without it, a capped
 * list is indistinguishable from a complete one.
 */
export interface OrchestrateContradictionsMeta {
  /** How many accepted children the pass actually judged. */
  poolChildren: number;
  /** True when more contradictions existed than `max` allowed to report. */
  truncated: boolean;
}

/**
 * The claim-consistency pass's knobs (RV1501/RV1502). The pairing half
 * is a PURE fold ({@link pairDraftClaims}) over the accepted draft and
 * the same settled pool the contradiction pass judges, so it costs
 * nothing and journals nothing. The judge half is ONE bounded
 * structured-output invocation under role 'synthesize' (the routing
 * key picks its model unless `judge.model` overrides), dispatched only
 * when the fold produced at least one pair; its verdict is an ordinary
 * journaled agent entry, so a resumed run replays it with zero paid
 * calls and the derived findings are byte identical.
 */
export interface OrchestrateClaimConsistency {
  /**
   * What a judged contradiction does. 'report' (the default) puts the
   * findings on the acceptance envelope and in an info log, and
   * changes nothing else. 'carry' additionally names them in the
   * 'single' synthesis prompt with the instruction to resolve each
   * explicitly (a ConfigError without that synthesis, the
   * contradictions precedent), and non-empty findings block the
   * `skipWhenDraftValid` gate: a draft contradicting its own pool
   * never earns the skip. The carry can only ride a prompt that still
   * lies ahead, so it binds the pass that runs BEFORE the synthesis:
   * under `stage: 'both'` the draft pass carries and the final pass
   * reports, and `stage: 'final'` with 'carry' is a ConfigError at
   * intake, because a posture that reads as a gate must not quietly
   * behave as 'report'. 'repair' (RV3307) is the honest carry for the
   * final pass: judged findings ride ONE more synthesis invocation
   * (the same CLAIM CONTRADICTIONS block, over a prompt that now lies
   * ahead again), the repaired document is judged again, and findings
   * that survive the round fail the run typed, exactly like a dead or
   * declined judge under this posture, because a gate armed to repair
   * must not pass silently. It needs a pass that runs AFTER a
   * synthesis, so `stage` must be 'final' or 'both' (a ConfigError
   * beside the default 'draft', whose findings the ordinary carry
   * already consumes). 'fail' fails the run typed with
   * `data.source` 'orchestrator_claim_consistency' BEFORE any
   * synthesis dispatch; the judge itself has already been paid, which
   * is the honest minimum for a semantic verdict. A judge that does
   * not settle ok is named on the meta (`judgeFailed`) and fails the
   * run only under 'fail': a gate armed to stop the run must not pass
   * silently when its judge dies.
   */
  onFound?: 'report' | 'carry' | 'fail' | 'repair';
  /**
   * WHICH document the pass judges (RV2509), default `'draft'`, the
   * historical behavior byte for byte. The pass has always read the
   * coordination draft, strictly BEFORE the synthesis, so that a draft
   * contradicting its own pool fails before anything pays to compose
   * it. That ordering is right and stays; what it cannot do is verify
   * the document that actually SHIPPED. The synthesis rewrites the
   * draft, and under `'draft'` the semantic verdict on the terminal
   * describes a document no consumer ever receives: the twenty-fifth
   * comparison run's judge cleared a draft and the synthesis then
   * composed a different text three times over.
   *
   * `'final'` moves the pass after the synthesis, over the artifact the
   * run settles on. `'both'` keeps the pre-synthesis gate AND judges
   * the final, at the price of a second judge invocation; the terminal
   * then reports the FINAL pass in `claimConsistencyMeta` (the shipped
   * document is what a consumer gates on) and the earlier one in
   * `claimConsistencyDraftMeta`.
   *
   * Every meta says which document it read (`judgedStage`,
   * `judgedHash`), and the envelope's `draftToFinal` says whether the
   * synthesis changed the document at all, so the question "is this
   * verdict about what I received" is a field read under every setting,
   * including the default.
   *
   * Meaningful only with a `synthesis` configured: without one the
   * draft IS the final and all three settings judge the same document.
   */
  stage?: 'draft' | 'final' | 'both';
  /** The judge invocation's own knobs; the routing chain applies otherwise. */
  judge?: {
    /** Model override for the judge invocation. */
    model?: ModelSpec;
    /** Canonical effort of the judge invocation. */
    effort?: Effort;
    /** UsageLimits of the judge invocation; default { maxTurns: 3 }. */
    limits?: UsageLimits;
    /** Admission estimate for the judge invocation, like AgentOpts.estCost. */
    estCost?: number;
  };
  /** Overrides {@link DEFAULT_ANCHOR_PATTERN} for both sides; fail-closed at intake. */
  pattern?: string;
  /** Bound on judged pairs; default {@link DEFAULT_MAX_CLAIM_PAIRS}. */
  max?: number;
  /** Bound on each pair's pool readings; default {@link DEFAULT_MAX_POOL_PER_PAIR}. */
  maxPoolPerPair?: number;
  /** Bound on each excerpt; default {@link DEFAULT_MAX_PAIR_EXCERPT_CHARS}. */
  maxExcerptChars?: number;
  /**
   * The declared coverage target (RV2903), in (0, 1]: the pass sizes
   * itself to COVER this share of the draft's citing sentences instead
   * of judging the first `max` pairs blind. The ninth comparison run
   * covered 43 of 115 citing sentences because its host guessed
   * `max: 56` plus the default run-fact bound, and the honest
   * 'partial' grade was the constant's echo, not a policy. Under a
   * target the pairing selects coverage-first (criticals, then one
   * pair per uncovered sentence until the target is met; `max` stays a
   * hard ceiling), the run-fact pass judges EVERY matched candidate
   * instead of the default bound, and an undeclared
   * `minimumCoverageRatio` defaults to the target, so the RV1809
   * floor machinery (the `lowCoverage` block, `onLowCoverage`, the
   * strict CLI exit) enforces the same number that sized the pass.
   */
  coverageTarget?: number;
  /**
   * Critical anchor declarations (RV1603): paths (a file, or a
   * directory matched as a prefix) or span anchors
   * (`src/exec.ts:250-300`). Pairs whose draft anchor matches sort
   * FIRST, before the `max` cap, so the bounded judge spends its
   * budget on the declared claims, and the meta names every critical
   * draft anchor that ended up unjudged (`criticalUncovered`). The
   * eighteenth comparison benchmark judged 40 of 144 citing sentences
   * with nothing steering which 40 and nothing saying what was left
   * out. Unset = the exact historical pairing order, byte for byte.
   */
  critical?: string[];
  /**
   * What an unjudged critical anchor does (RV1603): 'report' (the
   * default) names them on the meta only; 'fail' fails the run typed
   * with `data.source` 'orchestrator_claim_consistency' BEFORE the
   * judge dispatch, so a run whose declared claims cannot be verified
   * never pays for a partial verdict. Requires `critical`.
   */
  onUncoveredCritical?: 'report' | 'fail';
  /**
   * The run-facts grounding opt-in (RV1603): the run's own recorded
   * execution facts (accepted children, statuses, recorded evidence
   * entry counts, wire request and token totals; the
   * {@link executionFactsOf} material plus the entries plumbing) become
   * one more pool reading, and draft sentences that SPEAK about the
   * run (naming a minted id, a recorded fact value of two or more
   * digits, or a `runFactTerms` phrase) are paired with that sheet
   * under the `(run-facts)` anchor, judged by the same invocation.
   * Closes the eighteenth benchmark's live gap: a dossier claimed
   * "each role recorded 18-20 evidence entries" over recorded profiles
   * of 23/18/22/20/20/20 and "real models were not run" beside 125
   * recorded wire requests, with `executionFacts` enabled; facts
   * offered to the composer verify nothing about what it composed.
   * Off by default: judge prompt bytes stay identical when unset.
   */
  runFacts?: boolean;
  /**
   * Case-insensitive phrases that mark a draft sentence as a run
   * claim for the `runFacts` pass (negations carry no number: "real
   * models were not run" pairs only through a term). Requires
   * `runFacts: true`.
   */
  runFactTerms?: string[];
  /**
   * The declared coverage floor (RV1809): the minimum
   * coveredCitingSentences over draftCitingSentences ratio, in
   * (0, 1]. The nineteenth benchmark's pass covered 36 of 122 citing
   * sentences and graded itself 'partial' honestly, but nothing could
   * ENFORCE a floor: a consumer had to read the counts and decide
   * externally. Below the floor, `onLowCoverage` decides. A draft
   * with zero citing sentences is vacuously full and never trips it.
   */
  minimumCoverageRatio?: number;
  /**
   * The run-fact coverage floor (RV1809): the minimum judged run-fact
   * pairs over matched run-fact candidates ratio, in (0, 1]. Requires
   * `runFacts: true`; a draft with zero matched run claims never
   * trips it.
   */
  runFactCoverageRatio?: number;
  /**
   * What a below-floor ratio does (RV1809): 'report' (the default)
   * stamps the machine-readable `lowCoverage` block on the meta;
   * 'fail' fails the run typed BEFORE the judge dispatch, exactly
   * like `onUncoveredCritical`, so a run that cannot meet its
   * declared verification floor never pays for a partial verdict.
   * Requires at least one declared floor.
   */
  onLowCoverage?: 'report' | 'fail';
}

/** One judged contradiction: the pair plus the judge's one-sentence reason. */
export interface ClaimContradictionFinding extends ClaimPair {
  reason: string;
}

/**
 * What the claim-consistency pass looked at, beside its findings.
 * Rides the acceptance envelope as `claimConsistencyMeta` whenever the
 * pass is configured, exactly like `contradictionsMeta`: `[]` plus
 * this meta says "the fold paired `pairs` sentences and the judge
 * cleared them", while an absent pair of fields says nothing looked.
 * `judgeInvoked` false records that no pair existed to judge, and
 * `judgeFailed` names a judge invocation that did not settle ok, in
 * which case `claimContradictions` is absent: nothing was judged, and
 * an empty list would claim the pool agreed.
 */
export interface OrchestrateClaimConsistencyMeta {
  /** How many accepted children the fold read. */
  poolChildren: number;
  /** Draft sentences carrying at least one parsable anchor. */
  draftCitingSentences: number;
  /** Pairs the fold produced (and the judge ruled on, when invoked). */
  pairs: number;
  /** True when more pairs existed than `max` allowed to judge. */
  truncated: boolean;
  /**
   * Citing sentences with at least one judged pair (RV1603): the honest
   * coverage numerator against `draftCitingSentences`, so `[]` findings
   * over 40 of 144 sentences can never read as "fully verified".
   */
  coveredCitingSentences: number;
  /**
   * Present when `coverageTarget` was declared (RV2903): the share the
   * pass sized itself for, echoed so a persisted outcome says WHAT the
   * coverage was held against, not only what it reached.
   */
  coverageTarget?: number;
  /**
   * Present when `critical` was declared: the critical draft anchors
   * with no judged pair (capped at {@link MAX_CRITICAL_UNCOVERED});
   * `[]` means every declared claim the draft cited was judged.
   */
  criticalUncovered?: string[];
  /** The uncapped count behind `criticalUncovered`; present with it. */
  criticalUncoveredTotal?: number;
  /** Present under `runFacts`: run-claim pairs judged against the fact sheet. */
  runFactPairs?: number;
  /** Present under `runFacts` when more run claims matched than the bound. */
  runFactPairsTruncated?: true;
  /**
   * Present under `runFacts` (RV1809): the UNCAPPED count of matched
   * run-claim sentences, so the run-fact coverage ratio is computable
   * from the meta alone, live or from a persisted outcome.
   */
  runFactCandidates?: number;
  /**
   * Present when a declared coverage floor was not met under
   * `onLowCoverage: 'report'` (RV1809): each ratio beside its floor,
   * machine-readable, so "complete but under-verified by the declared
   * floor" is a field, not an external computation. Under 'fail' the
   * run fails typed instead and the meta stamps this block on the way
   * out.
   */
  lowCoverage?: {
    coverageRatio: number;
    coverageFloor?: number;
    runFactRatio?: number;
    runFactFloor?: number;
  };
  /** True when the judge invocation was dispatched. */
  judgeInvoked: boolean;
  /** Present when the judge invocation did not settle ok. */
  judgeFailed?: true;
  /**
   * Present when the judge invocation was refused ADMISSION and never
   * dispatched (RV2106): the ninth parity run's judge estimate did not
   * fit the orchestrator account's working room past the held
   * synthesis reserve, and the bare refusal killed a run whose fan-out
   * and draft were already complete. The declined pass degrades like a
   * failed judge (the meta names it, the journaled decision carries
   * the arithmetic, only the armed 'fail' posture stops the run) and
   * the synthesis its reserve was holding money for still dispatches.
   */
  judgeDeclined?: true;
  /**
   * How many judged contradictions the pass FOUND on the judged
   * document, present exactly when the judge settled ok (RV3304): `0`
   * is a clean verdict, a positive count is a disagreement that stayed
   * wherever the posture did not stop the run. The findings themselves
   * ride `claimContradictions` beside this meta on the acceptance
   * envelope, and since RV3601 the engine lifts them onto RunOutcome,
   * the journaled settle and `run:end` beside the meta, from the
   * envelope or the typed error data alike: the 2026-08-12 comparison
   * run settled ok/complete over a retained finding no terminal
   * surface could count (this count is that fix, RV3304), then the
   * 2026-08-13 run failed typed with the findings buried in error
   * data while the outcome's top level read null. Only the compact
   * terminal envelope still carries the meta alone, this count
   * standing in for the details.
   */
  findings?: number;
  /**
   * The one field a consumer reads INSTEAD of inferring semantic
   * health from an empty findings array (RV1702):
   * {@link claimCoverageOf} over this meta, so `completion:
   * 'complete'` plus `contradictions: []` can never again read as
   * "fully verified" when the judge saw 40 of 144 citing sentences.
   */
  coverage: ClaimCoverageGrade;
  /**
   * WHICH document this verdict describes (RV2509): `'draft'` for the
   * pre-synthesis pass, `'final'` for a pass over the artifact the run
   * settles on. Always present since RV2509, so a coverage grade can
   * never be read as a claim about the shipped document when it was
   * rendered over the draft the synthesis replaced.
   */
  judgedStage: 'draft' | 'final';
  /**
   * sha256 over the canonical document this verdict read (RV2509).
   * Compare it against the envelope's `draftToFinal.finalHash`: equal
   * means the judged document IS the one that shipped, unequal means
   * the synthesis rewrote what the judge cleared.
   */
  judgedHash: string;
}

/**
 * How the shipped artifact relates to the draft the run composed it
 * from (RV2509), present on the acceptance envelope whenever a
 * synthesis was configured. Two hashes and the answer they imply: a
 * semantic verdict rendered over the draft describes the final only
 * when `rewritten` is false, and until this shipped a consumer had no
 * way to ask.
 */
export interface OrchestrateDraftToFinal {
  /** sha256 over the canonical coordination draft. */
  draftHash: string;
  /** sha256 over the canonical artifact the run settled on. */
  finalHash: string;
  /** False exactly when the two hashes agree: the synthesis returned the draft unchanged. */
  rewritten: boolean;
  /** Which documents the claim-consistency pass actually judged; absent when it never ran. */
  claimsJudgedOn?: 'draft' | 'final' | 'both';
}

/**
 * The synthesis invocation's own knobs (RV-211). Everything else about
 * the invocation is deterministic: the prompt derives from the journaled
 * draft and the settled child digest, the toolset is the single finish
 * tool (a distinct toolsetHash, exactly like the reserved cap
 * finalizer), the invocation journals as an ordinary agent entry (a
 * resume replays it with zero paid calls), and its telemetry is a full
 * agent span with role 'synthesize' phase pairs, so
 * `CostReport.byRole.synthesize` and `reduceCriticalPath` attribute it
 * without heuristics. Failure posture: with finishValidation configured
 * a failed synthesis fails the run typed (the validated path is
 * mandatory); without validators the run falls back to the coordination
 * draft under a journaled 'orchestrator_synthesis_fallback' decision and
 * a warn log, never silently.
 */
export interface OrchestrateSynthesis {
  /** Model override for the synthesize invocation; the routing key and chain apply otherwise. */
  model?: ModelSpec;
  /** Canonical effort of the synthesize invocation. */
  effort?: Effort;
  /** UsageLimits of the synthesize invocation; default { maxTurns: 4 }. */
  limits?: UsageLimits;
  /** Extra deterministic instruction lines appended to the synthesis prompt. */
  instructions?: string;
  /**
   * Opt-in policy-facts line in the 'single' synthesis prompt (RV709):
   * a deterministic digest of the settled children's durable
   * tool-budget facts (statuses, extension grants, finalization
   * windows and reserves), so the composing model can cite the run's
   * own observed evidence instead of underclaiming it. Folded ONLY
   * from replay-stable material (the settled results the journal
   * replays verbatim), so a resumed synthesis re-derives identical
   * prompt bytes; off by default, and the prompt stays byte identical
   * when unset (prompt bytes are journal identity).
   */
  policyFacts?: boolean;
  /**
   * Opt-in RUN FACTS line in the 'single' synthesis prompt (RV1503),
   * the policyFacts sibling: the aggregate of the settled children's
   * replay-stable execution facts ({@link executionFactsOf}: wire
   * requests, missing response ids, token totals, statuses), so the
   * composing model can grade `live-observed` truthfully instead of
   * erasing the run it is part of. The line names its own boundary
   * (harness-observed, not production evidence). Folded ONLY from
   * journal-replayed material; off by default, and the prompt stays
   * byte identical when unset.
   *
   * The object form (RV3004) keeps the child line and adds opt-ins.
   * `workflowSoFar: true` appends a RUN FACTS SO FAR line: the same
   * counters folded over the settled children PLUS this
   * orchestration's own settled internal spans as of this dispatch's
   * composition (coordination turns, draft claim judges, judged
   * contradiction passes, synthesis notes), so the number the model
   * quotes sits next to the invoice instead of a third of it. The
   * composing dispatch itself and anything still running are excluded
   * by construction, the line says so, and dollars stay absent for
   * the same replay reason as the child line. `runFacts: true` keeps
   * today's prompt bytes exactly; the SO FAR line exists only under
   * the object opt-in.
   */
  runFacts?: boolean | { workflowSoFar?: boolean };
  /**
   * Admission estimate for the synthesize invocation, like
   * AgentOpts.estCost: under a tight orchestrator cap the default
   * reserve (full maxOutputTokens pricing) can refuse the dispatch; an
   * explicit estimate is the host speaking. In 'incremental' mode the
   * estimate applies to EACH note invocation.
   */
  estCost?: number;
  /**
   * The synthesis shape (RV-211 remainder). Default 'single': one
   * post-fan-in synthesize invocation composes the final result from the
   * draft and the whole settled digest. 'incremental': every settled
   * child triggers ONE bounded synthesize-role NOTE invocation as soon
   * as it settles (concurrent with the still-running fan-out, which is
   * what moves synthesis wall time off the post-fan-in critical path),
   * and the FINAL result is a DETERMINISTIC reconciliation, never
   * another model call: an {@link IncrementalSynthesisResult} envelope
   * composed from the draft and the notes in spawn order. The tradeoffs
   * are explicit: notes are paid DURING the run, so an acceptance
   * rejection can no longer guarantee "a rejected run never paid for
   * synthesis"; and because the reconciliation has no model-composed
   * finish, `finishValidation` cannot bind it: configuring both is a
   * ConfigError at intake. A note that dies falls back to the child's
   * raw digest summary under a journaled per-child
   * 'orchestrator_synthesis_note_fallback' decision and a warn log.
   * Cap paths are unchanged: a capped run settles through the reserved
   * finalizer and never reconciles.
   */
  mode?: 'single' | 'incremental';
  /**
   * Deduplicate repeated claim lines across children BEFORE any model
   * call (RV-211 remainder; default false, and the prompt stays byte
   * identical when unset). In 'single' mode the digest entering the
   * synthesis prompt keeps only the FIRST occurrence of every repeated
   * line and a REPEATED CLAIMS index (each claim with its reporters)
   * rides the prompt beside it. In 'incremental' mode the deterministic
   * reconciliation dedupes the note texts the same way and the envelope
   * carries the `repeatedClaims` index. Matching is whitespace-collapsed
   * exact line equality: nothing fuzzy ever merges two distinct claims.
   */
  dedupeClaims?: boolean;
  /**
   * UsageLimits of ONE incremental note invocation; default
   * { maxTurns: 2 }. In mode 'single' the declaration is a typed
   * ConfigError (RV3102): no note invocation exists for the limits to
   * bound, and until the gate it was silently ignored.
   */
  noteLimits?: UsageLimits;
  /**
   * Give the 'single' synthesis invocation the RV-201 evidence tools
   * `get_child_result` and `read_child_artifact` beside `finish` (the
   * v1.74 experiment review, P0.2): the finish validators hold the
   * result against the FULL child outputs while the synthesis model
   * sees 400 char digests, so when the coordination draft collapses the
   * evidence the validators demand is model-invisible. With the tools
   * exposed the digest rows in the synthesis prompt carry each child's
   * `handle`, and the model pages any settled child's full output or
   * artifacts before finishing. Off by default: the synthesis toolset
   * and prompt stay byte identical, exactly like the coordination
   * `exposeChildResultTools`.
   */
  exposeChildResultTools?: boolean;
  /**
   * What the 'single' synthesis prompt embeds beside the draft (the
   * v1.74 experiment review, P0.2). Default 'digests': the 400 char
   * settled digest rows, byte identical to pre 1.76. 'full' appends a
   * CHILD OUTPUTS section carrying every settled child's FULL
   * serialized output after the digest rows: the whole evidence pool
   * the validators judge against rides the prompt, paid as input
   * tokens (declare `estCost` or the preflight `estInputTokens`
   * accordingly).
   */
  context?: 'digests' | 'full';
  /**
   * The conditional synthesis gate (RV510, the ninth comparison
   * experiment: synthesis returned the byte-identical draft after
   * 101.3 s and 0.5512 USD, 57.3% of post-fan-in wall time). With
   * `true`, before the 'single' synthesis span starts the coordination
   * draft is run through the FULL declared finish contract (the same
   * `finishValidation.validators` that would bind the synthesis
   * finish): a draft that passes skips the synthesis invocation
   * entirely under a journaled 'orchestrator_synthesis_skip' decision
   * with reason 'synthesis_skipped_by_valid_draft' (the existing skip
   * vocabulary; the info log and the acceptance envelope carry it), and
   * a resume rolls the journaled skip forward with zero paid calls. A
   * draft that fails any validator goes to synthesis exactly as before,
   * with the repair budget untouched (the gate is a pre-pass, never a
   * journaled validation verdict). Deterministic by construction: only
   * the declared contract judges, never a semantic delta heuristic.
   * Requires `finishValidation` (a ConfigError at intake otherwise:
   * without a contract there is nothing to judge the draft valid by),
   * which transitively limits it to mode 'single'. With a configured
   * `budget.synthesisReserveUsd` the held money is released unconsumed
   * on the skip and no reserve lifecycle journals: there was no
   * synthesis invocation to account. Default false: the gate, the
   * decision entry, and the envelope field are all absent, byte for
   * byte.
   */
  skipWhenDraftValid?: boolean;
  /**
   * Carry a FAILED skip pre-pass into the synthesis prompt (RV808a).
   * The pre-pass verdict used to be discarded on failure, and the
   * twelfth comparison run paid for exactly that: synthesis re-derived
   * the whole document blind to which validators the draft had already
   * failed, then failed the same contract once more itself. With
   * `true`, a failing pre-pass journals its verdict (decisionType
   * 'orchestrator_synthesis_draft_gaps': the failed validator names
   * with their reasons, bound to the contract generation and the
   * draft hash exactly like the skip decision), and the synthesis
   * prompt gains a `DRAFT CONTRACT GAPS:` line naming those failures
   * with the instruction to repair the named gaps and preserve the
   * draft otherwise. A resume reuses the journaled verdict without
   * re-running a validator, so the prompt bytes re-derive identically
   * and the paid invocation replays. Requires `skipWhenDraftValid`
   * (the gaps ARE the pre-pass verdict; there is nothing to carry
   * without it). Default false: no decision entry, prompt bytes
   * identical.
   */
  carryDraftGaps?: boolean;
  /**
   * The no-regression floor under the synthesis (RV2505, the 1.226.0
   * comparison run). That run's coordination draft satisfied the FULL
   * declared contract, `skipWhenDraftValid` was off because the
   * operator wanted the composing pass anyway, and the synthesis then
   * failed the same bundle three times and died mid repair: the run
   * settled with NO result at all, having paid for four workers, the
   * draft that would have passed, and three rejected compositions.
   * With `true`, a synthesis that fails terminally does not throw away
   * a draft the contract accepts. The failure is caught at the
   * post-fan-in chokepoint, the coordination draft is judged by the
   * same `finishValidation.validators` that bind the synthesis finish,
   * and a draft every validator accepts becomes the run result under a
   * journaled 'orchestrator_synthesis_regressed' decision (the failure
   * message, the validator names, the draft hash, the contract
   * generation) plus a warn 'orchestrator synthesis regressed' log; the
   * envelope carries `synthesisRegressed`. A draft that fails too
   * journals 'orchestrator_synthesis_fallback_declined' naming ITS
   * failing validators and the original failure rethrows untouched, so
   * the decline is auditable instead of silent. Deterministic by
   * construction: only the declared contract judges, never a quality
   * heuristic, and the verdict is a pure function of the draft, so a
   * resume re-derives it without re-running the paid invocation.
   * Requires `finishValidation` (a ConfigError at intake otherwise:
   * without a contract there is nothing to judge either document by),
   * which transitively limits it to mode 'single'. Orthogonal to
   * `skipWhenDraftValid`: that gate decides whether to PAY for the
   * synthesis, this floor decides what to do when the paid one comes
   * back worse than the draft, and with both on a valid draft skips
   * before there is anything to regress. Default false: no catch, no
   * decision entry, no envelope field, byte for byte.
   */
  fallbackToValidDraft?: boolean;
  /**
   * The structured evidence index (RV808b): a deterministic per-child
   * citation map in the 'single' synthesis prompt, so the composing
   * model can target its reads instead of re-reading the whole
   * evidence pool (`context: 'full'` re-pays every child output as
   * input tokens; the twelfth comparison run spent 357 s of synthesis
   * on exactly that re-derivation). One `EVIDENCE INDEX:` line rides
   * the prompt after the digest rows: per SETTLED child in spawn
   * order, its nodeId, terminal status, the DISTINCT citations its
   * output actually carries (matches of `pattern`, default
   * {@link DEFAULT_CITATION_PATTERN}; extracted ONLY from
   * evidence-pool children, ok and salvage-accepted, exactly the pool
   * evidencePreservedValidator judges, so an indexed citation is
   * never one the validators would reject as fabricated), its
   * artifact descriptors (the read_child_artifact vocabulary), and
   * its output size in chars. With `exposeChildResultTools` the rows
   * carry the child handle, so the index and the pagination tools
   * compose: read exactly the child whose citation you need. Folded
   * ONLY from replay-stable settled results (the policyFacts
   * precedent), so a resumed synthesis re-derives identical prompt
   * bytes; `true` uses the default pattern, an object overrides it
   * (fail-closed: a pattern that can match the empty string is
   * refused at intake, the RV610 posture). Meaningless in
   * 'incremental' mode (no single synthesis prompt exists): a
   * ConfigError. Absent = the prompt stays byte identical.
   */
  evidenceIndex?: true | { pattern?: string; flags?: string };
}

/**
 * The deterministic reconciliation envelope an 'incremental' synthesis
 * returns as the run result (RV-211 remainder): the coordination draft
 * plus one section per settled child in spawn order, each carrying the
 * child's terminal status and its note (the note invocation's finish
 * output, or the child's raw digest summary when the note fell back).
 * With `dedupeClaims`, repeated claim lines keep their first occurrence
 * only and the `repeatedClaims` index lists each with its reporters.
 * Everything here derives from journaled state, so a resume reproduces
 * the envelope byte for byte with zero paid calls.
 */
export interface IncrementalSynthesisResult {
  synthesis: 'incremental';
  draft: unknown;
  sections: {
    nodeId: string;
    logicalTaskId: string;
    /** The child's terminal status. */
    status: string;
    /** The note invocation's terminal status ('ok' unless it fell back). */
    noteStatus: string;
    note: string;
  }[];
  repeatedClaims?: RepeatedClaim[];
}

/**
 * The machine-readable reason a CONFIGURED synthesis step was skipped
 * (the 1.65.0 experiment review, item 11.4): telemetry that shows zero
 * synthesize spend must say why instead of leaving the host to infer it
 * from the acceptance decision. 'synthesis_skipped_by_acceptance': the
 * acceptance policy rejected the finish, and a rejected run never pays
 * for the post-fan-in composing step (in 'incremental' mode the settled
 * notes were already paid during the run; the skipped step is the free
 * deterministic reconciliation). 'synthesis_skipped_by_budget_cap': the
 * orchestrator budget cap froze the plan, and a capped run settles
 * through the reserved finalizer, never synthesis.
 * 'synthesis_skipped_by_valid_draft' (RV510): the opt-in
 * `synthesis.skipWhenDraftValid` gate ran the coordination draft
 * through the full declared finish contract and every validator
 * passed, so the synthesis invocation had nothing to add and never
 * started; unlike the other two reasons the run still settles ok with
 * the draft as its result. The reason is frozen into the journaled
 * decision that caused the skip (the acceptance decision, the
 * budget-cap decision, or the 'orchestrator_synthesis_skip' decision),
 * spread into the typed FailRunError data on the failing paths and
 * into the acceptance envelope on the valid-draft path, and announced
 * by an info 'orchestrator synthesis skipped' log event; it is absent
 * everywhere when synthesis is not configured or actually ran, so
 * existing runs stay byte identical.
 */
export type OrchestrateSynthesisSkipReason =
  | 'synthesis_skipped_by_acceptance'
  | 'synthesis_skipped_by_budget_cap'
  | 'synthesis_skipped_by_valid_draft';

export const ORCHESTRATE_WORKFLOW_NAME = 'rulvar-orchestrate';

/**
 * One page of a string, for the child result evidence tools: maxChars is
 * clamped to [1, MAX] and offset to [0, length], so a hostile or absent
 * paging argument can never throw or read past the end. The window is measured in
 * UTF-16 code units, the same unit the model counts, so hasMore and the
 * next offset are exact.
 */
function pageOf(
  content: string,
  rawOffset: number | undefined,
  rawMaxChars: number | undefined,
): { totalChars: number; offset: number; content: string; hasMore: boolean } {
  const totalChars = content.length;
  const offset = Math.min(Math.max(0, Math.trunc(rawOffset ?? 0)), totalChars);
  const maxChars = Math.min(
    Math.max(1, Math.trunc(rawMaxChars ?? DEFAULT_CHILD_RESULT_PAGE_CHARS)),
    MAX_CHILD_RESULT_PAGE_CHARS,
  );
  const end = Math.min(offset + maxChars, totalChars);
  return { totalChars, offset, content: content.slice(offset, end), hasMore: end < totalChars };
}

/** The serialized full result of a settled child: the raw string, or JSON. */
function serializeChildOutput(result: AgentResult<unknown>): string {
  if (result.status !== 'ok') {
    const base = result.errorMessage ?? `terminal status ${result.status}`;
    const limitOutput =
      result.status === 'limit' && result.output !== null && result.output !== undefined;
    // The structured terminal partial (RV-210 close-out) and the
    // validated terminal output (the 1.64.0 experiment review, P0.4):
    // get_child_result pages the WHOLE partial and the finalization
    // reserve's final output of a limit child, so the orchestrator can
    // salvage or respawn narrowed without losing the collected work.
    // Shape change only when either exists (the tool is opt-in).
    if (limitOutput || result.partial !== undefined) {
      return JSON.stringify({
        error: base,
        ...(limitOutput ? { output: result.output } : {}),
        ...(result.partial === undefined ? {} : { partial: result.partial }),
      });
    }
    return base;
  }
  return typeof result.output === 'string' ? result.output : JSON.stringify(result.output ?? null);
}

/**
 * The orchestrate intake gate (v1.35.0 review P2-2): every numeric
 * option and the atCap literal validate SYNCHRONOUSLY at workflow
 * construction, shared by both surfaces (the top level orchestrate() throws
 * before a run exists; ctx.orchestrate throws before any journal entry,
 * provider call, or child dispatch). A NaN here previously disabled the
 * spawn cap (`spawnOrdinal >= NaN` is false forever) and the digest
 * render bound, and a negative finalize reserve WIDENED the soft cap
 * boundary instead of reserving from it.
 */
function validateOrchestrateOptions(opts: OrchestrateOptions | undefined): void {
  if (opts === undefined) {
    return;
  }
  if (opts.maxSpawns !== undefined) {
    requireNonNegativeInteger(opts.maxSpawns, 'orchestrate maxSpawns');
  }
  if (opts.renderBudgetChars !== undefined) {
    requireNonNegativeInteger(opts.renderBudgetChars, 'orchestrate renderBudgetChars');
  }
  if (
    opts.onUnsettledAtExit !== undefined &&
    opts.onUnsettledAtExit !== 'cancel' &&
    opts.onUnsettledAtExit !== 'drain'
  ) {
    // The runtime JS/JSON boundary: the type system cannot hold it.
    throw new ConfigError(
      "orchestrate onUnsettledAtExit must be 'cancel' or 'drain'; got " +
        `${String(opts.onUnsettledAtExit)}`,
    );
  }
  if (
    opts.parallelAdmission !== undefined &&
    opts.parallelAdmission !== 'fail-fast' &&
    opts.parallelAdmission !== 'try-all' &&
    opts.parallelAdmission !== 'all-or-none'
  ) {
    // The runtime JS/JSON boundary: the type system cannot hold it.
    throw new ConfigError(
      "orchestrate parallelAdmission must be 'fail-fast', 'try-all' or 'all-or-none'; got " +
        `${String(opts.parallelAdmission)}`,
    );
  }
  if (opts.acceptance !== undefined) {
    // The runtime JS/JSON boundary: the type system cannot hold it.
    const policy = (opts.acceptance as { childPolicy?: unknown }).childPolicy;
    const minSuccessful =
      typeof policy === 'object' && policy !== null && !Array.isArray(policy)
        ? (policy as { minSuccessful?: unknown }).minSuccessful
        : undefined;
    if (policy !== 'all-ok' && minSuccessful === undefined) {
      throw new ConfigError(
        "orchestrate acceptance.childPolicy must be 'all-ok' or { minSuccessful: N }; got " +
          `${JSON.stringify(policy)}`,
      );
    }
    if (policy !== 'all-ok') {
      requirePositiveInteger(
        minSuccessful as number,
        'orchestrate acceptance.childPolicy.minSuccessful',
      );
    }
    const acceptPartial = (opts.acceptance as { acceptPartialChildren?: unknown })
      .acceptPartialChildren;
    if (acceptPartial !== undefined && typeof acceptPartial !== 'boolean') {
      throw new ConfigError(
        `orchestrate acceptance.acceptPartialChildren must be a boolean; got ${typeof acceptPartial}`,
      );
    }
    const acceptOutput = (opts.acceptance as { acceptValidatedTerminalOutputOnLimit?: unknown })
      .acceptValidatedTerminalOutputOnLimit;
    if (acceptOutput !== undefined && typeof acceptOutput !== 'boolean') {
      throw new ConfigError(
        'orchestrate acceptance.acceptValidatedTerminalOutputOnLimit must be a boolean; got ' +
          typeof acceptOutput,
      );
    }
    const requireFloor = (opts.acceptance as { requireEvidenceFloor?: unknown })
      .requireEvidenceFloor;
    if (requireFloor !== undefined && typeof requireFloor !== 'boolean') {
      throw new ConfigError(
        `orchestrate acceptance.requireEvidenceFloor must be a boolean; got ${typeof requireFloor}`,
      );
    }
    const minSpawned = (opts.acceptance as { minSpawnedChildren?: unknown }).minSpawnedChildren;
    if (minSpawned !== undefined) {
      requirePositiveInteger(minSpawned as number, 'orchestrate acceptance.minSpawnedChildren');
    }
  }
  if (opts.finishValidation !== undefined) {
    // The runtime JS/JSON boundary: the type system cannot hold it.
    const fv = opts.finishValidation as {
      validators?: unknown;
      maxRepairs?: unknown;
      contract?: unknown;
      selfTest?: unknown;
    };
    if (!Array.isArray(fv.validators) || fv.validators.length === 0) {
      throw new ConfigError(
        'orchestrate finishValidation.validators must be a non empty array of validators',
      );
    }
    const seen = new Set<string>();
    for (const candidate of fv.validators) {
      const validator = candidate as { name?: unknown; validate?: unknown };
      if (typeof validator.name !== 'string' || validator.name.length === 0) {
        throw new ConfigError(
          'every orchestrate finish validator must carry a non empty string name',
        );
      }
      if (typeof validator.validate !== 'function') {
        throw new ConfigError(
          `orchestrate finish validator '${validator.name}' has no validate function`,
        );
      }
      if (seen.has(validator.name)) {
        throw new ConfigError(
          `orchestrate finishValidation.validators names must be unique; '${validator.name}' ` +
            'repeats (pass name to the factory to run several instances)',
        );
      }
      seen.add(validator.name);
    }
    if (fv.maxRepairs !== undefined) {
      requireNonNegativeInteger(fv.maxRepairs as number, 'orchestrate finishValidation.maxRepairs');
    }
    if ((fv as { repairTurnReserve?: unknown }).repairTurnReserve !== undefined) {
      requireNonNegativeInteger(
        (fv as { repairTurnReserve?: unknown }).repairTurnReserve as number,
        'orchestrate finishValidation.repairTurnReserve',
      );
    }
    const estRepair = (fv as { estRepairCostUsd?: unknown }).estRepairCostUsd;
    if (
      estRepair !== undefined &&
      (typeof estRepair !== 'number' || !Number.isFinite(estRepair) || estRepair < 0)
    ) {
      throw new ConfigError(
        'orchestrate finishValidation.estRepairCostUsd must be a nonnegative finite number; ' +
          `got ${JSON.stringify(estRepair)}`,
      );
    }
    const retain = (fv as { retainRejectedCandidates?: unknown }).retainRejectedCandidates;
    if (retain !== undefined && typeof retain !== 'boolean') {
      throw new ConfigError(
        'orchestrate finishValidation.retainRejectedCandidates must be a boolean',
      );
    }
    const draftPolicy = (fv as { draftPolicy?: unknown }).draftPolicy;
    if (draftPolicy !== undefined) {
      if (draftPolicy !== 'contract' && (typeof draftPolicy !== 'object' || draftPolicy === null)) {
        throw new ConfigError(
          "orchestrate finishValidation.draftPolicy must be an object or the sentinel 'contract'",
        );
      }
      if (opts.synthesis === undefined) {
        throw new ConfigError(
          'orchestrate finishValidation.draftPolicy requires synthesis: without a synthesis ' +
            'invocation the validators bind the coordination finish itself and there is no ' +
            'unvalidated draft to gate',
        );
      }
      const policy =
        draftPolicy === 'contract'
          ? undefined
          : (draftPolicy as { minWords?: unknown; requireSections?: unknown });
      if (policy !== undefined) {
        if (policy.minWords === undefined && policy.requireSections === undefined) {
          throw new ConfigError(
            'orchestrate finishValidation.draftPolicy must declare minWords, requireSections, ' +
              'or both',
          );
        }
        if (policy.minWords !== undefined) {
          if (
            typeof policy.minWords !== 'number' ||
            !Number.isInteger(policy.minWords) ||
            policy.minWords < 1
          ) {
            throw new ConfigError(
              'orchestrate finishValidation.draftPolicy.minWords must be a positive integer; ' +
                `got ${JSON.stringify(policy.minWords)}`,
            );
          }
        }
        if (policy.requireSections !== undefined) {
          if (
            !Array.isArray(policy.requireSections) ||
            policy.requireSections.length === 0 ||
            policy.requireSections.some(
              (section) => typeof section !== 'string' || section.length === 0,
            )
          ) {
            throw new ConfigError(
              'orchestrate finishValidation.draftPolicy.requireSections must be a non empty ' +
                'array of non empty strings',
            );
          }
        }
      }
    }
    const sectionalRepair = (fv as { sectionalRepair?: unknown }).sectionalRepair;
    if (sectionalRepair !== undefined) {
      if (typeof sectionalRepair !== 'object' || sectionalRepair === null) {
        throw new ConfigError(
          'orchestrate finishValidation.sectionalRepair must be an object with sections',
        );
      }
      const declared = (sectionalRepair as { sections?: unknown }).sections;
      if (
        !Array.isArray(declared) ||
        declared.length === 0 ||
        declared.some((section) => typeof section !== 'string' || section.length === 0)
      ) {
        throw new ConfigError(
          'orchestrate finishValidation.sectionalRepair.sections must be a non empty array ' +
            'of non empty marker strings',
        );
      }
      const uniqueSections = new Set<string>();
      for (const section of declared as string[]) {
        if (uniqueSections.has(section)) {
          throw new ConfigError(
            'orchestrate finishValidation.sectionalRepair.sections must be unique; ' +
              `'${section}' repeats`,
          );
        }
        uniqueSections.add(section);
      }
    }
    // The output contract wiring (the v1.71 experiment review): the
    // containment check and the golden self test run HERE, at
    // construction, before any journal entry, dispatch, or provider
    // call, so a stale validator costs a ConfigError instead of a paid
    // run. Absent contract and selfTest = byte identical validation.
    const contract = fv.contract as FinishContract | undefined;
    if (contract !== undefined) {
      const shape = contract as unknown as {
        hash?: unknown;
        validators?: unknown;
        promptLines?: unknown;
        goldenAccept?: unknown;
      };
      if (
        typeof shape.hash !== 'string' ||
        !Array.isArray(shape.validators) ||
        !Array.isArray(shape.promptLines) ||
        shape.goldenAccept === undefined
      ) {
        throw new ConfigError(
          'orchestrate finishValidation.contract must be a finishContract(...) product',
        );
      }
      for (const contractValidator of contract.validators) {
        if (!seen.has(contractValidator.name)) {
          throw new ConfigError(
            `orchestrate finishValidation.contract validator '${contractValidator.name}' is ` +
              'not in finishValidation.validators; spread contract.validators into the set ' +
              'so the promised contract is actually enforced',
          );
        }
      }
    }
    const selfTest = fv.selfTest as FinishSelfTestFixtures | undefined;
    if (selfTest !== undefined && (typeof selfTest !== 'object' || selfTest === null)) {
      throw new ConfigError('orchestrate finishValidation.selfTest must be an object');
    }
    const acceptFixture = selfTest?.accept ?? contract?.goldenAccept;
    const rejectFixture = selfTest?.reject ?? contract?.goldenReject;
    if (selfTest !== undefined && acceptFixture === undefined && rejectFixture === undefined) {
      throw new ConfigError(
        'orchestrate finishValidation.selfTest requires an accept or reject fixture',
      );
    }
    const rejectGoldens = contract?.goldenRejects;
    if (acceptFixture !== undefined || rejectFixture !== undefined || rejectGoldens !== undefined) {
      const report = selfTestFinishValidation({
        validators: fv.validators as FinishValidator[],
        ...(acceptFixture === undefined ? {} : { accept: acceptFixture }),
        ...(rejectFixture === undefined ? {} : { reject: rejectFixture }),
        // The per validator reject goldens (cycle 74): the configured
        // validator carrying each contract name must itself reject
        // the contract's fixture, so a same-name weakened replacement
        // is a ConfigError here, never a silently accepted result the
        // journaled contract hash forbids.
        ...(rejectGoldens === undefined ? {} : { rejects: rejectGoldens }),
      });
      if (!report.ok) {
        throw new ConfigError(
          'the finish validation self test failed BEFORE any provider call: ' +
            report.failures
              .map((failure) =>
                failure.validator === undefined
                  ? failure.reasons.join('; ')
                  : failure.fixture === 'reject'
                    ? `validator '${failure.validator}' failed its reject golden: ` +
                      failure.reasons.join('; ')
                    : `validator '${failure.validator}' rejected the accept fixture: ` +
                      failure.reasons.join('; '),
              )
              .join('; '),
        );
      }
    }
  }
  if (opts.synthesis !== undefined) {
    // The runtime JS/JSON boundary: the type system cannot hold it.
    const synthesis = opts.synthesis as {
      effort?: unknown;
      limits?: unknown;
      instructions?: unknown;
      estCost?: unknown;
      mode?: unknown;
      dedupeClaims?: unknown;
      noteLimits?: unknown;
    };
    if (
      synthesis.mode !== undefined &&
      synthesis.mode !== 'single' &&
      synthesis.mode !== 'incremental'
    ) {
      throw new ConfigError(
        "orchestrate synthesis.mode must be 'single' or 'incremental'; got " +
          JSON.stringify(synthesis.mode),
      );
    }
    if (synthesis.mode === 'incremental' && opts.finishValidation !== undefined) {
      throw new ConfigError(
        "orchestrate synthesis.mode 'incremental' reconciles deterministically and has no " +
          'model-composed final finish for finishValidation to bind; configure validators ' +
          "with mode 'single', or drop them",
      );
    }
    if (synthesis.dedupeClaims !== undefined && typeof synthesis.dedupeClaims !== 'boolean') {
      throw new ConfigError(
        'orchestrate synthesis.dedupeClaims must be a boolean; got ' +
          typeof synthesis.dedupeClaims,
      );
    }
    const symmetry = synthesis as { exposeChildResultTools?: unknown; context?: unknown };
    if (
      symmetry.exposeChildResultTools !== undefined &&
      typeof symmetry.exposeChildResultTools !== 'boolean'
    ) {
      throw new ConfigError(
        'orchestrate synthesis.exposeChildResultTools must be a boolean; got ' +
          typeof symmetry.exposeChildResultTools,
      );
    }
    const conditional = synthesis as { skipWhenDraftValid?: unknown; carryDraftGaps?: unknown };
    if (conditional.skipWhenDraftValid !== undefined) {
      if (typeof conditional.skipWhenDraftValid !== 'boolean') {
        throw new ConfigError(
          'orchestrate synthesis.skipWhenDraftValid must be a boolean; got ' +
            typeof conditional.skipWhenDraftValid,
        );
      }
      if (conditional.skipWhenDraftValid && opts.finishValidation === undefined) {
        throw new ConfigError(
          'orchestrate synthesis.skipWhenDraftValid requires finishValidation: without a ' +
            'declared finish contract there is nothing to judge the draft valid by',
        );
      }
    }
    if (conditional.carryDraftGaps !== undefined) {
      if (typeof conditional.carryDraftGaps !== 'boolean') {
        throw new ConfigError(
          'orchestrate synthesis.carryDraftGaps must be a boolean; got ' +
            typeof conditional.carryDraftGaps,
        );
      }
      if (conditional.carryDraftGaps && conditional.skipWhenDraftValid !== true) {
        throw new ConfigError(
          'orchestrate synthesis.carryDraftGaps requires skipWhenDraftValid: the gaps ARE the ' +
            'failed pre-pass verdict, and without the pre-pass there is nothing to carry',
        );
      }
    }
    const floor = (synthesis as { fallbackToValidDraft?: unknown }).fallbackToValidDraft;
    if (floor !== undefined) {
      if (typeof floor !== 'boolean') {
        throw new ConfigError(
          'orchestrate synthesis.fallbackToValidDraft must be a boolean; got ' + typeof floor,
        );
      }
      if (floor && opts.finishValidation === undefined) {
        throw new ConfigError(
          'orchestrate synthesis.fallbackToValidDraft requires finishValidation: without a ' +
            'declared finish contract there is nothing to judge the draft valid by',
        );
      }
    }
    if (
      symmetry.context !== undefined &&
      symmetry.context !== 'digests' &&
      symmetry.context !== 'full'
    ) {
      throw new ConfigError(
        "orchestrate synthesis.context must be 'digests' or 'full'; got " +
          JSON.stringify(symmetry.context),
      );
    }
    // The mode gates for the single-prompt surfaces (RV3102, the
    // evidenceIndex precedent): each renders only into the 'single'
    // synthesis dispatch, and the deterministic 'incremental'
    // reconciliation dispatches no model, so an armed opt-in was a
    // silent no-op. Inert forms (explicit false, the 'digests'
    // default) stay valid: they promise nothing. The draft-gate family
    // (skipWhenDraftValid, carryDraftGaps, fallbackToValidDraft) is
    // gated transitively through its finishValidation requirement.
    if (synthesis.mode === 'incremental') {
      if (symmetry.exposeChildResultTools === true) {
        throw new ConfigError(
          "orchestrate synthesis.exposeChildResultTools is meaningless in mode 'incremental': " +
            'the deterministic reconciliation dispatches no synthesis to hold the tools',
        );
      }
      if (symmetry.context === 'full') {
        throw new ConfigError(
          "orchestrate synthesis.context 'full' is meaningless in mode 'incremental': " +
            'the deterministic reconciliation composes no prompt to embed the outputs in',
        );
      }
      if (synthesis.limits !== undefined) {
        throw new ConfigError(
          "orchestrate synthesis.limits is meaningless in mode 'incremental': " +
            'no single synthesis invocation exists for the limits to bound; declare ' +
            'noteLimits for the note invocations instead',
        );
      }
    }
    const index = (synthesis as { evidenceIndex?: unknown }).evidenceIndex;
    if (index !== undefined) {
      if (index !== true && (typeof index !== 'object' || index === null)) {
        throw new ConfigError(
          'orchestrate synthesis.evidenceIndex must be true or an object with pattern and ' +
            `flags; got ${JSON.stringify(index)}`,
        );
      }
      if (synthesis.mode === 'incremental') {
        throw new ConfigError(
          "orchestrate synthesis.evidenceIndex is meaningless in mode 'incremental': " +
            'there is no single synthesis prompt for the index to ride',
        );
      }
      if (index !== true) {
        const shape = index as { pattern?: unknown; flags?: unknown };
        if (shape.pattern !== undefined && typeof shape.pattern !== 'string') {
          throw new ConfigError(
            'orchestrate synthesis.evidenceIndex.pattern must be a string; got ' +
              typeof shape.pattern,
          );
        }
        if (shape.flags !== undefined && typeof shape.flags !== 'string') {
          throw new ConfigError(
            'orchestrate synthesis.evidenceIndex.flags must be a string; got ' + typeof shape.flags,
          );
        }
        const pattern = shape.pattern ?? DEFAULT_CITATION_PATTERN;
        const flags = typeof shape.flags === 'string' ? shape.flags : '';
        let probe: RegExp;
        try {
          probe = new RegExp(pattern, flags.replace('g', ''));
        } catch (thrown) {
          throw new ConfigError(
            'orchestrate synthesis.evidenceIndex.pattern does not compile: ' +
              (thrown instanceof Error ? thrown.message : String(thrown)),
          );
        }
        // The RV610 posture: an empty match would enter the index as
        // fabricated evidence, so the pattern is refused fail closed
        // exactly like evidencePreservedValidator's intake.
        if (probe.test('')) {
          throw new ConfigError(
            'orchestrate synthesis.evidenceIndex.pattern must not be able to match the ' +
              `empty string (an empty match would index fabricated evidence); got ` +
              JSON.stringify(pattern),
          );
        }
      }
    }
    if (synthesis.noteLimits !== undefined) {
      validateUsageLimits(synthesis.noteLimits as UsageLimits, 'orchestrate synthesis.noteLimits');
      // The mode gate (RV3102, the evidenceIndex precedent): noteLimits
      // bounds the incremental note invocation, and mode 'single'
      // dispatches none, so the declaration silently bound nothing. A
      // promised surface nobody renders is drift.
      if (synthesis.mode !== 'incremental') {
        throw new ConfigError(
          "orchestrate synthesis.noteLimits is meaningless in mode 'single': " +
            "only 'incremental' dispatches note invocations for the limits to bound",
        );
      }
    }
    if (
      synthesis.effort !== undefined &&
      !['low', 'medium', 'high', 'xhigh', 'max'].includes(synthesis.effort as string)
    ) {
      throw new ConfigError(
        "orchestrate synthesis.effort must be one of 'low' | 'medium' | 'high' | 'xhigh' | " +
          `'max'; got ${JSON.stringify(synthesis.effort)}`,
      );
    }
    if (synthesis.limits !== undefined) {
      validateUsageLimits(synthesis.limits as UsageLimits, 'orchestrate synthesis.limits');
    }
    if (synthesis.instructions !== undefined && typeof synthesis.instructions !== 'string') {
      throw new ConfigError(
        `orchestrate synthesis.instructions must be a string; got ${typeof synthesis.instructions}`,
      );
    }
    const facts = synthesis as { policyFacts?: unknown; runFacts?: unknown };
    if (facts.policyFacts !== undefined && typeof facts.policyFacts !== 'boolean') {
      throw new ConfigError(
        `orchestrate synthesis.policyFacts must be a boolean; got ${typeof facts.policyFacts}`,
      );
    }
    // The mode gates (RV3102, the evidenceIndex precedent): both facts
    // surfaces render only into the single-mode synthesis prompt, and
    // the deterministic 'incremental' reconciliation dispatches no
    // model at all, so an armed opt-in was a silent no-op. An explicit
    // `false` stays valid in both modes: it promises nothing.
    if (facts.policyFacts === true && synthesis.mode === 'incremental') {
      throw new ConfigError(
        "orchestrate synthesis.policyFacts is meaningless in mode 'incremental': " +
          'the deterministic reconciliation dispatches no synthesis for the facts to ride',
      );
    }
    if (
      (facts.runFacts === true ||
        (typeof facts.runFacts === 'object' && facts.runFacts !== null)) &&
      synthesis.mode === 'incremental'
    ) {
      throw new ConfigError(
        "orchestrate synthesis.runFacts is meaningless in mode 'incremental': " +
          'the deterministic reconciliation dispatches no synthesis for the facts to ride',
      );
    }
    if (facts.runFacts !== undefined && typeof facts.runFacts !== 'boolean') {
      if (
        typeof facts.runFacts !== 'object' ||
        facts.runFacts === null ||
        Array.isArray(facts.runFacts)
      ) {
        throw new ConfigError(
          `orchestrate synthesis.runFacts must be a boolean or ` +
            `{ workflowSoFar?: boolean }; got ${typeof facts.runFacts}`,
        );
      }
      const runFactsSpec = facts.runFacts as Record<string, unknown>;
      for (const key of Object.keys(runFactsSpec)) {
        if (key !== 'workflowSoFar') {
          throw new ConfigError(
            `orchestrate synthesis.runFacts carries unknown key '${key}'; ` +
              `the object form takes only workflowSoFar`,
          );
        }
      }
      if (
        runFactsSpec['workflowSoFar'] !== undefined &&
        typeof runFactsSpec['workflowSoFar'] !== 'boolean'
      ) {
        throw new ConfigError(
          `orchestrate synthesis.runFacts.workflowSoFar must be a boolean; ` +
            `got ${typeof runFactsSpec['workflowSoFar']}`,
        );
      }
    }
    if (synthesis.estCost !== undefined) {
      requireNonNegativeNumber(synthesis.estCost as number, 'orchestrate synthesis.estCost');
    }
  }
  if (opts.contradictions !== undefined) {
    const dispute = opts.contradictions as {
      onFound?: unknown;
      pattern?: unknown;
      max?: unknown;
    };
    if (typeof dispute !== 'object' || Array.isArray(dispute)) {
      throw new ConfigError(
        `orchestrate contradictions must be an object; got ${JSON.stringify(opts.contradictions)}`,
      );
    }
    const onFound = dispute.onFound ?? 'report';
    if (onFound !== 'report' && onFound !== 'carry' && onFound !== 'fail') {
      throw new ConfigError(
        "orchestrate contradictions.onFound must be 'report', 'carry' or 'fail'; got " +
          JSON.stringify(dispute.onFound),
      );
    }
    if (onFound === 'carry') {
      if (opts.synthesis === undefined) {
        throw new ConfigError(
          "orchestrate contradictions.onFound 'carry' requires synthesis: without the " +
            'post-fan-in invocation there is no prompt to carry the findings into; use ' +
            "'report' or 'fail'",
        );
      }
      if (opts.synthesis.mode === 'incremental') {
        throw new ConfigError(
          "orchestrate contradictions.onFound 'carry' needs a 'single' synthesis: the " +
            "deterministic 'incremental' reconciliation has no prompt for the findings to ride",
        );
      }
    }
    if (dispute.pattern !== undefined) {
      if (typeof dispute.pattern !== 'string') {
        throw new ConfigError(
          `orchestrate contradictions.pattern must be a string; got ${typeof dispute.pattern}`,
        );
      }
      let probe: RegExp;
      try {
        probe = new RegExp(dispute.pattern, '');
      } catch (thrown) {
        throw new ConfigError(
          'orchestrate contradictions.pattern does not compile: ' +
            (thrown instanceof Error ? thrown.message : String(thrown)),
        );
      }
      // The RV610 posture: a pattern matching the empty string turns
      // every inline span into an anchor, which floods the pass instead
      // of arming it.
      if (probe.test('')) {
        throw new ConfigError(
          'orchestrate contradictions.pattern must not be able to match the empty string; got ' +
            JSON.stringify(dispute.pattern),
        );
      }
    }
    if (
      dispute.max !== undefined &&
      (!Number.isInteger(dispute.max) || (dispute.max as number) < 1)
    ) {
      throw new ConfigError(
        `orchestrate contradictions.max must be a positive integer; got ${JSON.stringify(
          dispute.max,
        )}`,
      );
    }
  }
  if (opts.claimConsistency !== undefined) {
    const consistency = opts.claimConsistency as {
      onFound?: unknown;
      judge?: unknown;
      pattern?: unknown;
      max?: unknown;
      maxPoolPerPair?: unknown;
      maxExcerptChars?: unknown;
      critical?: unknown;
      onUncoveredCritical?: unknown;
      runFacts?: unknown;
      runFactTerms?: unknown;
      minimumCoverageRatio?: unknown;
      runFactCoverageRatio?: unknown;
      onLowCoverage?: unknown;
      coverageTarget?: unknown;
    };
    if (typeof consistency !== 'object' || Array.isArray(consistency)) {
      throw new ConfigError(
        `orchestrate claimConsistency must be an object; got ${JSON.stringify(
          opts.claimConsistency,
        )}`,
      );
    }
    const onFound = consistency.onFound ?? 'report';
    if (onFound !== 'report' && onFound !== 'carry' && onFound !== 'fail' && onFound !== 'repair') {
      throw new ConfigError(
        "orchestrate claimConsistency.onFound must be 'report', 'carry', 'fail' or 'repair'; " +
          `got ${JSON.stringify(consistency.onFound)}`,
      );
    }
    if (onFound === 'repair') {
      // The repair rides a synthesis prompt exactly like the carry
      // (RV3307): without a 'single' synthesis there is nothing to
      // re-dispatch with the findings on board.
      if (opts.synthesis === undefined) {
        throw new ConfigError(
          "orchestrate claimConsistency.onFound 'repair' requires synthesis: the bounded " +
            'repair round re-dispatches it with the judged findings carried',
        );
      }
      if (opts.synthesis.mode === 'incremental') {
        throw new ConfigError(
          "orchestrate claimConsistency.onFound 'repair' needs a 'single' synthesis: the " +
            "deterministic 'incremental' reconciliation has no prompt for the findings to ride",
        );
      }
    }
    if (onFound === 'carry') {
      if (opts.synthesis === undefined) {
        throw new ConfigError(
          "orchestrate claimConsistency.onFound 'carry' requires synthesis: without the " +
            'post-fan-in invocation there is no prompt to carry the findings into; use ' +
            "'report' or 'fail'",
        );
      }
      if (opts.synthesis.mode === 'incremental') {
        throw new ConfigError(
          "orchestrate claimConsistency.onFound 'carry' needs a 'single' synthesis: the " +
            "deterministic 'incremental' reconciliation has no prompt for the findings to ride",
        );
      }
    }
    // Which document the pass judges (RV2509). A stage that reaches
    // past the draft needs a synthesis to reach past: without one the
    // draft IS the final, and silently accepting the setting would let
    // a host believe it verified a composition that never happened.
    const stage = (consistency as { stage?: unknown }).stage ?? 'draft';
    if (stage !== 'draft' && stage !== 'final' && stage !== 'both') {
      throw new ConfigError(
        "orchestrate claimConsistency.stage must be 'draft', 'final' or 'both'; got " +
          JSON.stringify((consistency as { stage?: unknown }).stage),
      );
    }
    if (stage !== 'draft' && opts.synthesis === undefined) {
      throw new ConfigError(
        `orchestrate claimConsistency.stage '${stage}' requires synthesis: without the ` +
          'post-fan-in invocation the coordination draft IS the final artifact, and the ' +
          "default 'draft' already judges it",
      );
    }
    // The carry posture rides the 'single' synthesis prompt, and the
    // 'final' pass runs strictly AFTER that prompt was built and
    // consumed: under `stage: 'final'` a judged finding has no prompt
    // left to ride, so the pair would silently behave as 'report'
    // while reading as a gate. The 2026-08-12 comparison run settled
    // ok/complete with a contradiction its own final judge had
    // already named, under exactly this pair. Under 'both' the carry
    // binds the DRAFT pass, whose findings the synthesis prompt still
    // lies ahead of, and the final pass reports.
    if (stage === 'final' && onFound === 'carry') {
      throw new ConfigError(
        "orchestrate claimConsistency.onFound 'carry' cannot pair with stage 'final': the " +
          'final pass runs after the synthesis, so there is no prompt left to carry the ' +
          "findings into; use 'report' or 'fail', or keep a carried draft pass with stage 'both'",
      );
    }
    // The mirror rule (RV3307): 'repair' is the carry for a pass that
    // runs AFTER the synthesis, so it demands such a pass; under the
    // default 'draft' the ordinary carry already consumes the findings
    // and a repair round would re-dispatch a synthesis that never saw
    // a verdict about its own output.
    if (stage === 'draft' && onFound === 'repair') {
      throw new ConfigError(
        "orchestrate claimConsistency.onFound 'repair' needs stage 'final' or 'both': the " +
          "repair consumes the FINAL pass's findings, and the draft pass already has 'carry'",
      );
    }
    if (consistency.pattern !== undefined) {
      if (typeof consistency.pattern !== 'string') {
        throw new ConfigError(
          `orchestrate claimConsistency.pattern must be a string; got ${typeof consistency.pattern}`,
        );
      }
      let probe: RegExp;
      try {
        probe = new RegExp(consistency.pattern, '');
      } catch (thrown) {
        throw new ConfigError(
          'orchestrate claimConsistency.pattern does not compile: ' +
            (thrown instanceof Error ? thrown.message : String(thrown)),
        );
      }
      // The RV610 posture, exactly like the contradiction pass: a
      // pattern matching the empty string floods the fold instead of
      // arming it.
      if (probe.test('')) {
        throw new ConfigError(
          'orchestrate claimConsistency.pattern must not be able to match the empty string; ' +
            `got ${JSON.stringify(consistency.pattern)}`,
        );
      }
    }
    for (const [label, bound] of [
      ['max', consistency.max],
      ['maxPoolPerPair', consistency.maxPoolPerPair],
      ['maxExcerptChars', consistency.maxExcerptChars],
    ] as const) {
      if (bound !== undefined && (!Number.isInteger(bound) || (bound as number) < 1)) {
        throw new ConfigError(
          `orchestrate claimConsistency.${label} must be a positive integer; got ` +
            JSON.stringify(bound),
        );
      }
    }
    if (consistency.critical !== undefined) {
      if (
        !Array.isArray(consistency.critical) ||
        consistency.critical.some((entry) => typeof entry !== 'string' || entry.length === 0)
      ) {
        throw new ConfigError(
          'orchestrate claimConsistency.critical must be an array of nonempty strings; got ' +
            JSON.stringify(consistency.critical),
        );
      }
    }
    if (
      consistency.onUncoveredCritical !== undefined &&
      consistency.onUncoveredCritical !== 'report' &&
      consistency.onUncoveredCritical !== 'fail'
    ) {
      throw new ConfigError(
        "orchestrate claimConsistency.onUncoveredCritical must be 'report' or 'fail'; got " +
          JSON.stringify(consistency.onUncoveredCritical),
      );
    }
    if (consistency.onUncoveredCritical !== undefined && consistency.critical === undefined) {
      throw new ConfigError(
        'orchestrate claimConsistency.onUncoveredCritical needs critical anchors to watch; ' +
          'declare claimConsistency.critical',
      );
    }
    if (consistency.runFacts !== undefined && typeof consistency.runFacts !== 'boolean') {
      // The RV610 posture: the opt-in authorizes new judge-prompt
      // bytes, and a stray 'true' string must not silently disarm it.
      throw new ConfigError(
        `orchestrate claimConsistency.runFacts must be a boolean; got ${typeof consistency.runFacts}`,
      );
    }
    if (consistency.runFactTerms !== undefined) {
      if (consistency.runFacts !== true) {
        throw new ConfigError(
          'orchestrate claimConsistency.runFactTerms rides the runFacts pass; set ' +
            'claimConsistency.runFacts true',
        );
      }
      if (
        !Array.isArray(consistency.runFactTerms) ||
        consistency.runFactTerms.some((term) => typeof term !== 'string' || term.length === 0)
      ) {
        throw new ConfigError(
          'orchestrate claimConsistency.runFactTerms must be an array of nonempty strings; got ' +
            JSON.stringify(consistency.runFactTerms),
        );
      }
    }
    for (const [label, ratio] of [
      ['minimumCoverageRatio', consistency.minimumCoverageRatio],
      ['runFactCoverageRatio', consistency.runFactCoverageRatio],
      ['coverageTarget', consistency.coverageTarget],
    ] as const) {
      if (
        ratio !== undefined &&
        (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio <= 0 || ratio > 1)
      ) {
        throw new ConfigError(
          `orchestrate claimConsistency.${label} must be a number in (0, 1]; got ` +
            JSON.stringify(ratio),
        );
      }
    }
    if (consistency.runFactCoverageRatio !== undefined && consistency.runFacts !== true) {
      throw new ConfigError(
        'orchestrate claimConsistency.runFactCoverageRatio rides the runFacts pass; set ' +
          'claimConsistency.runFacts true',
      );
    }
    if (
      consistency.onLowCoverage !== undefined &&
      consistency.onLowCoverage !== 'report' &&
      consistency.onLowCoverage !== 'fail'
    ) {
      throw new ConfigError(
        "orchestrate claimConsistency.onLowCoverage must be 'report' or 'fail'; got " +
          JSON.stringify(consistency.onLowCoverage),
      );
    }
    if (
      consistency.onLowCoverage !== undefined &&
      consistency.minimumCoverageRatio === undefined &&
      consistency.runFactCoverageRatio === undefined &&
      consistency.coverageTarget === undefined
    ) {
      throw new ConfigError(
        'orchestrate claimConsistency.onLowCoverage needs a declared floor; set ' +
          'minimumCoverageRatio, runFactCoverageRatio, or coverageTarget',
      );
    }
    if (consistency.judge !== undefined) {
      const judge = consistency.judge as {
        effort?: unknown;
        limits?: unknown;
        estCost?: unknown;
      };
      if (typeof judge !== 'object' || judge === null || Array.isArray(judge)) {
        throw new ConfigError(
          `orchestrate claimConsistency.judge must be an object; got ${JSON.stringify(
            consistency.judge,
          )}`,
        );
      }
      if (
        judge.effort !== undefined &&
        !['low', 'medium', 'high', 'xhigh', 'max'].includes(judge.effort as string)
      ) {
        throw new ConfigError(
          "orchestrate claimConsistency.judge.effort must be one of 'low' | 'medium' | " +
            `'high' | 'xhigh' | 'max'; got ${JSON.stringify(judge.effort)}`,
        );
      }
      if (judge.limits !== undefined) {
        validateUsageLimits(
          judge.limits as UsageLimits,
          'orchestrate claimConsistency.judge.limits',
        );
      }
      if (judge.estCost !== undefined) {
        requireNonNegativeNumber(
          judge.estCost as number,
          'orchestrate claimConsistency.judge.estCost',
        );
      }
    }
  }
  if (opts.executionFacts !== undefined && typeof opts.executionFacts !== 'boolean') {
    // The RV610 posture: the opt-in authorizes new tool-result bytes,
    // and a stray 'true' string must not silently disarm it.
    throw new ConfigError(
      `orchestrate executionFacts must be a boolean; got ${typeof opts.executionFacts}`,
    );
  }
  const spec = opts.budget;
  if (spec === undefined) {
    return;
  }
  if (spec.capUsd !== undefined) {
    requireNonNegativeNumber(spec.capUsd, 'orchestrate budget.capUsd');
  }
  if (spec.capFraction !== undefined) {
    requireFraction(spec.capFraction, 'orchestrate budget.capFraction');
  }
  if (spec.finalizeReserveUsd !== undefined) {
    requireNonNegativeNumber(spec.finalizeReserveUsd, 'orchestrate budget.finalizeReserveUsd');
  }
  if (spec.synthesisReserveUsd !== undefined) {
    requireNonNegativeNumber(spec.synthesisReserveUsd, 'orchestrate budget.synthesisReserveUsd');
    if (opts.synthesis === undefined) {
      throw new ConfigError(
        'orchestrate budget.synthesisReserveUsd requires the synthesis option: the reserve ' +
          'holds sub account money for the separate synthesis invocation',
      );
    }
    if ((opts.synthesis as { mode?: string }).mode === 'incremental') {
      throw new ConfigError(
        'orchestrate budget.synthesisReserveUsd is incompatible with synthesis.mode ' +
          "'incremental': the reserve protects the single post-fan-in invocation",
      );
    }
  }
  if (spec.finalizeTurns !== undefined) {
    requirePositiveInteger(spec.finalizeTurns, 'orchestrate budget.finalizeTurns');
  }
  if (
    spec.atCap !== undefined &&
    spec.atCap !== 'finish-with-partial' &&
    spec.atCap !== 'fail-run'
  ) {
    // The runtime JS/JSON boundary: the type system cannot hold it.
    throw new ConfigError(
      "orchestrate budget.atCap must be 'finish-with-partial' or 'fail-run'; got " +
        `${String(spec.atCap)}`,
    );
  }
}

function orchestratorPrompt(
  goal: string,
  maxSpawns: number | undefined,
  extensionLines?: string[],
): string {
  return [
    'You are the orchestrator of a multi-agent run.',
    `GOAL: ${goal}`,
    '',
    'Decompose the goal into child agents with spawn_agent or parallel_agents,',
    'wait on their handles with await_any or await_all, cancel stragglers with',
    'cancel_agent, and terminate with finish({ result }) when the goal is met.',
    maxSpawns === undefined
      ? 'Spawn only what the goal needs.'
      : `You may spawn at most ${String(maxSpawns)} children.`,
    ...(extensionLines ?? []),
  ].join('\n');
}

/**
 * The finish validation contract rides the PROMPT, never the toolset:
 * the finish tool definition stays byte identical in every
 * configuration, so the orchestrator toolset hash never moves (stricter
 * than the evidence tools opt in, which changes it by design).
 */
function finishValidationPromptLines(
  spec: FinishValidationSpec | undefined,
  sectionalBase?: 'rejected-attempt' | 'draft-base',
): string[] {
  if (spec === undefined) {
    return [];
  }
  const names = spec.validators.map((validator) => validator.name).join(', ');
  const repairs = spec.maxRepairs ?? DEFAULT_FINISH_MAX_REPAIRS;
  return [
    `The host validates every finish({ result }) with deterministic validators: ${names}.`,
    // The contract statement (P0.1): the SAME manifest that built the
    // validators renders these demands, so the prompt cannot promise
    // one shape while the validators enforce another. Reaches the
    // coordination AND synthesis prompts through this one function;
    // absent contract keeps both byte identical.
    ...(spec.contract === undefined ? [] : spec.contract.promptLines),
    'A rejected finish returns the failure reasons as the tool error result; repair the ' +
      'result and call finish again. ' +
      (repairs === 0
        ? 'No repair attempt is granted: the first rejected finish fails the run.'
        : repairs === 1
          ? 'At most one repair attempt is granted before the run fails.'
          : `At most ${String(repairs)} repair attempts are granted before the run fails.`),
    // The sectional repair vocabulary (RV808b): present exactly for
    // the invocations whose finish tool actually carries the sectional
    // schema, so the prompt never advertises an argument the schema
    // would reject. Prompt bytes are journal identity: absent opt-in
    // keeps every prompt byte identical.
    ...(spec.sectionalRepair === undefined || sectionalBase === undefined
      ? []
      : [
          'Sectional repair is on: after a rejected attempt you may resubmit ONLY the ' +
            'repaired sections as finish({ sections: { "<marker>": "<new body>" } }); ' +
            'unchanged sections are retained from the rejected attempt, a declared marker ' +
            'absent from it is appended at the end, and the spliced document is validated ' +
            `whole. Declared markers: ${JSON.stringify(spec.sectionalRepair.sections)}.` +
            (sectionalBase === 'draft-base'
              ? ' The coordination draft is the retained base: finish({ sections }) may ' +
                'patch only its gap sections without resending the document.'
              : ''),
        ]),
  ];
}

/**
 * The partial-salvage contract rides the PROMPT exactly like finish
 * validation (RV-210 close-out): present only when
 * acceptance.acceptPartialChildren is set, so every other configuration
 * keeps byte-identical coordination prompts.
 */
function acceptancePromptLines(acceptance: OrchestrateAcceptance | undefined): string[] {
  const lines: string[] = [];
  if (acceptance?.acceptPartialChildren === true) {
    lines.push(
      'Partial salvage is on: a child that ends at its limit AFTER recording progress with ' +
        'report_progress counts as a partial success for acceptance; its digest carries the ' +
        'partial and get_child_result (when enabled) pages the full report. When the gap ' +
        'matters, respawn a NARROWED child carrying the partial instead of repeating the task.',
    );
  }
  if (acceptance?.acceptValidatedTerminalOutputOnLimit === true) {
    lines.push(
      'Terminal-output salvage is on: a child that ends at its limit WITH a final answer ' +
        '(its finalization reserve summary, already validated against the declared output ' +
        'schema) counts as a successful child for acceptance; its digest carries it after ' +
        "the 'final:' marker and get_child_result (when enabled) pages it in full.",
    );
  }
  return lines;
}

/**
 * Resolves per-spawn dispatch options against the engine registries
 * (registered SchemaSpec and tool profile names; M7-T05). An
 * unknown ref is a typed ConfigError, surfaced as a tool error to the
 * orchestrator and never a run failure.
 */
/**
 * The capped orchestrator's own admission estimate (the 1.63.0
 * experiment review, P0.3): the effective cap MINUS the finalize
 * carve-out already committed on the cap account, so the dispatch
 * admits at EXACT FILL by construction (a capped orchestrator can never
 * spend past its effectiveCap, and pricing the model's full
 * maxOutputTokens instead pinned small run ceilings at zero remainder;
 * the M12 checkpoint measured a self-solving orchestrator because no
 * child was ever admitted). Exported so the live dispatch and
 * preflightEstimate share ONE formula: both call this function.
 */
export function orchestratorAdmissionEstCostUsd(
  effectiveCapUsd: number,
  committedFinalizeReserveUsd: number,
): number {
  return effectiveCapUsd - committedFinalizeReserveUsd;
}

function resolveDispatchOpts(
  spec: SpawnAgentParams | ExtensionDispatchSpec,
  defaults: {
    schemas?: Record<string, unknown>;
    toolsets?: Record<string, unknown>;
  },
): Record<string, unknown> {
  const opts: Record<string, unknown> = {};
  if (spec.outputSchemaRef !== undefined) {
    const schema = defaults.schemas?.[spec.outputSchemaRef];
    if (schema === undefined) {
      throw new ConfigError(
        `unknown outputSchemaRef '${spec.outputSchemaRef}': register it under ` +
          'defaults.schemas',
      );
    }
    opts.schema = schema;
  }
  if (spec.toolsetRef !== undefined) {
    const tools = defaults.toolsets?.[spec.toolsetRef];
    if (tools === undefined) {
      throw new ConfigError(
        `unknown toolsetRef '${spec.toolsetRef}': register it under ` +
          'defaults.toolsets (https://docs.rulvar.com/guide/tools)',
      );
    }
    opts.tools = tools;
  }
  const extended = spec as ExtensionDispatchSpec;
  if (extended.isolation !== undefined) {
    opts.isolation = extended.isolation;
  }
  if (extended.usageLimits !== undefined) {
    opts.limits = extended.usageLimits;
  }
  if (extended.escalation !== undefined) {
    opts.escalation = extended.escalation;
  }
  if (extended.bootCheckpointRef !== undefined) {
    (opts as Record<PropertyKey, unknown>)[kBootCheckpoint] = extended.bootCheckpointRef;
  }
  if (extended.model !== undefined) {
    // The ladder driver's concrete rung resolution: the call-layer
    // override shadows the profile's declared ladder
    // in the resolution chain, so the attempt hashes the concrete ref.
    opts.model = extended.model;
  }
  if (extended.memoizeOutcome !== undefined) {
    opts.memoizeOutcome = extended.memoizeOutcome;
  }
  if (extended.schema !== undefined && opts.schema === undefined) {
    // Inline SchemaSpec for engine-synthesized children (the judge
    // verdict); outputSchemaRef keeps precedence for authored specs.
    opts.schema = extended.schema;
  }
  return opts;
}

function filterProfiles(
  registered: Record<string, AgentProfile> | undefined,
  names: string[] | undefined,
): Record<string, AgentProfile> {
  if (registered === undefined) {
    return {};
  }
  if (names === undefined) {
    return registered;
  }
  // Null-prototype (RV1205): the advertised map inherits nothing, so a
  // later read of a prototype member finds nothing to resolve and an
  // allowlisted '__proto__' lands as ordinary data instead of hitting
  // the assignment trap.
  const filtered = Object.create(null) as Record<string, AgentProfile>;
  for (const name of names) {
    // Own properties only: the registry is a host-provided plain
    // object, and a bare index read resolves prototype members, so an
    // allowlist naming 'toString' used to advertise
    // Object.prototype.toString as a spawnable profile (the sixteenth
    // experiment, judge repro R3). A prototype name is simply not
    // registered.
    if (Object.hasOwn(registered, name) && registered[name] !== undefined) {
      filtered[name] = registered[name];
    }
  }
  return filtered;
}

/**
 * Builds the orchestrator workflow: ONE implementation behind both
 * surfaces. The body wires the spawn tools over the per-call runtime,
 * recovers spawn records from the journal on resume, and runs the
 * orchestrator agent with the finish terminal tool.
 */
export function makeOrchestratorWorkflow(
  goal: string,
  opts?: OrchestrateOptions,
): Workflow<undefined, unknown> {
  validateOrchestrateOptions(opts);
  // The terminal child barrier holder (RV1903): the orchestration body
  // registers its exitBarrier here once the spawn roster exists, and
  // the thin workflow wrapper below runs it in a finally, so EVERY
  // exit, returned or thrown, waits for the stragglers' journaled
  // terminals. The body keeps its exact indentation depth on purpose:
  // the wrapper is the only new nesting.
  const orchestrationBody = async (
    ctx: Ctx<'strict'>,
    barrier: { run?: () => Promise<void>; roster?: () => ChildrenAtFailure | undefined },
  ): Promise<unknown> => {
    const runtime = runtimeOf(ctx);
    const { internals } = runtime;
    if (internals.admission === undefined) {
      throw new ConfigError('orchestrate requires the engine run context (createEngine)');
    }
    const admission = internals.admission;
    const callingState = runtime.currentState();
    const advertisedProfiles = filterProfiles(internals.defaults.profiles, opts?.profiles);
    // Ladder-declaring profiles are declaration-only under spawn_agent:
    // rung execution needs the plan extension's concrete per-attempt
    // overrides, so a spawn of one dies at wire
    // resolution. The spawn vocabulary therefore advertises only
    // concrete profiles and names the declarers as context; the full
    // advertised set still reaches the extension IO and the kb card's
    // ladder collection. Found live by the M12 checkpoint: the kb card
    // praised ladder tiers by profile name and steered the orchestrator
    // into doomed spawns.
    const spawnableProfiles: Record<string, AgentProfile> = {};
    const declaredLadderNames: string[] = [];
    for (const [name, profile] of Object.entries(advertisedProfiles)) {
      const spec = profile.model;
      if (spec !== undefined && typeof spec !== 'string' && 'ladder' in spec) {
        declaredLadderNames.push(name);
      } else {
        spawnableProfiles[name] = profile;
      }
    }
    declaredLadderNames.sort();
    const cardText =
      declaredLadderNames.length === 0
        ? profileCard(advertisedProfiles)
        : `${profileCard(spawnableProfiles)}\nDeclared ladders (tier context for the ` +
          `knowledge card; NOT agentType values, never spawn them): ` +
          `${declaredLadderNames.join(', ')}.`;

    // The orchestrator's own sub-account. M6 wires the
    // account and its layer-2/3 enforcement when a cap resolves; the
    // reserve decision entries and the at-cap freeze are M7 (DEF-7).
    const extension = opts?.extension;
    let orchestratorAccount: string | undefined;
    /** DEF-2 cap drift found in the sync prologue; emitted after boot. */
    const pendingCapDrifts: Array<{
      field: string;
      frozenValue: number | string;
      liveValue: number | string;
    }> = [];
    let capState:
      | {
          effectiveCapUsd: number;
          finalizeReserveUsd: number;
          finalizeTurns: number;
          turnEstimateUsd: number;
          atCap: 'finish-with-partial' | 'fail-run';
          source: 'call' | 'profile' | 'engine';
        }
      | undefined;
    {
      const runCeiling = internals.budget.accountView(
        callingState.budgetScope ?? ROOT_ACCOUNT,
      )?.ceilingUsd;
      const spec = opts?.budget;
      // The (0, 1] bound already held at the intake gate
      // (validateOrchestrateOptions); only the default remains here.
      const fraction = spec?.capFraction ?? 0.2;
      const fromFraction = runCeiling === undefined ? undefined : fraction * runCeiling;
      const bounds = [spec?.capUsd, fromFraction].filter(
        (bound): bound is number => bound !== undefined,
      );
      // DEF-2 config-drift-resume for the cap dollars: a resumed run
      // recovers the FROZEN reserve decision (absolute USD) instead of
      // re-deriving from live options; a diverging live knob is reported,
      // never honored. The decision exists only for extension runs, so
      // plain dynamic orchestrations always take the live path.
      const priorReserveDecision = internals.replayer.snapshot().find((entry) => {
        if (entry.kind !== 'decision' || entry.scope !== callingState.scope) {
          return false;
        }
        return (
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_budget_reserve'
        );
      });
      if (priorReserveDecision !== undefined) {
        const frozen = priorReserveDecision.value as {
          capUsd: number;
          finalizeReserveUsd: number;
          finalizeTurns: number;
          source: 'call' | 'profile' | 'engine';
          pricingVersion?: string;
        };
        const turnEstimateUsd = internals.flatReserveUsd ?? 0.5;
        const liveFinalizeReserveUsd =
          spec?.finalizeReserveUsd ?? (spec?.finalizeTurns ?? 2) * turnEstimateUsd;
        // Emission is DEFERRED past the synchronous prologue: a caller
        // attaches handle listeners after run()/resume() returns, and
        // this block runs before the first await.
        pendingCapDrifts.push(
          ...(bounds.length > 0 && Math.min(...bounds) !== frozen.capUsd
            ? [
                {
                  field: 'orchestratorCapUsd',
                  frozenValue: frozen.capUsd,
                  liveValue: Math.min(...bounds),
                },
              ]
            : []),
          ...(liveFinalizeReserveUsd !== frozen.finalizeReserveUsd
            ? [
                {
                  field: 'finalizeReserveUsd',
                  frozenValue: frozen.finalizeReserveUsd,
                  liveValue: liveFinalizeReserveUsd,
                },
              ]
            : []),
          // Price interpretation is LIVE by design (usage is journaled,
          // dollars are re-derived), so a version change cannot be
          // honored-or-refused like the cap dollars; it is REPORTED so a
          // resumed run never reprices under a different table silently.
          // Decisions journaled before the field shipped stay quiet.
          ...(frozen.pricingVersion !== undefined &&
          frozen.pricingVersion !== (internals.pricingVersion ?? 'unpriced')
            ? [
                {
                  field: 'pricingVersion',
                  frozenValue: frozen.pricingVersion,
                  liveValue: internals.pricingVersion ?? 'unpriced',
                },
              ]
            : []),
        );
        orchestratorAccount =
          callingState.scope === '' ? 'orchestrator' : `${callingState.scope}/orchestrator`;
        if (spec?.synthesisReserveUsd !== undefined && frozen.capUsd <= spec.synthesisReserveUsd) {
          throw new OrchestratorCapConfigError(
            `effectiveCap ${frozen.capUsd.toFixed(4)} USD is not above the synthesis reserve ` +
              `${spec.synthesisReserveUsd.toFixed(4)} USD`,
          );
        }
        internals.budget.openAccount(orchestratorAccount, {
          parentScope: callingState.budgetScope ?? ROOT_ACCOUNT,
          ceilingUsd: frozen.capUsd,
          kind: 'orchestrator-cap',
        });
        if (extension !== undefined) {
          internals.budget.commitFinalizeReserve(orchestratorAccount, frozen.finalizeReserveUsd);
        }
        if (spec?.synthesisReserveUsd !== undefined && spec.synthesisReserveUsd > 0) {
          internals.budget.commitSynthesisReserve(orchestratorAccount, spec.synthesisReserveUsd);
        }
        capState = {
          effectiveCapUsd: frozen.capUsd,
          finalizeReserveUsd: frozen.finalizeReserveUsd,
          finalizeTurns: frozen.finalizeTurns,
          turnEstimateUsd,
          atCap: spec?.atCap ?? 'finish-with-partial',
          source: frozen.source,
        };
      }
      if (capState === undefined && extension !== undefined && bounds.length === 0) {
        // An uncapped orchestrator was precisely the defect (DEF-7):
        // PlanRunner refuses to start BEFORE the first LLM call and
        // before any journal entries.
        throw new OrchestratorCapConfigError(
          'the orchestrator cap is unresolvable: the run has no USD ceiling and no explicit ' +
            'budget.capUsd; PlanRunner requires a resolved effectiveCap',
        );
      }
      if (capState === undefined && bounds.length > 0) {
        const effectiveCapUsd = Math.min(...bounds);
        // The deterministic per-turn estimate of v1: the engine flat
        // reserve default; the journaled reserve entry freezes the
        // ABSOLUTE dollars, so replay never re-derives.
        const turnEstimateUsd = internals.flatReserveUsd ?? 0.5;
        const finalizeTurns = spec?.finalizeTurns ?? 2;
        const finalizeReserveUsd = spec?.finalizeReserveUsd ?? finalizeTurns * turnEstimateUsd;
        if (extension !== undefined && effectiveCapUsd < finalizeReserveUsd) {
          throw new OrchestratorCapConfigError(
            `effectiveCap ${effectiveCapUsd.toFixed(4)} USD is below the finalize reserve ` +
              `${finalizeReserveUsd.toFixed(4)} USD`,
          );
        }
        if (
          spec?.capUsd !== undefined &&
          spec.capFraction === undefined &&
          effectiveCapUsd < spec.capUsd
        ) {
          // An explicit capUsd is STILL bounded by the DEFAULT fraction:
          // min(0.70, 0.2 * 0.90) = 0.18 surprised the v1.6.0 follow-up
          // review's live probe. The semantics stay (the default
          // fraction is a safety net); the surprise gets loud.
          internals.events.emit(
            {
              type: 'log',
              level: 'warn',
              msg:
                `orchestrator budget.capUsd ${spec.capUsd.toFixed(4)} USD is bounded to ` +
                `${effectiveCapUsd.toFixed(4)} USD by the default capFraction 0.2 of the run ` +
                `ceiling (effectiveCap = min(capUsd, capFraction * ceiling)); pass ` +
                `capFraction: 1.0 to make capUsd the sole bound`,
            },
            callingState.spanId,
          );
        }
        if (
          spec?.synthesisReserveUsd !== undefined &&
          effectiveCapUsd <= spec.synthesisReserveUsd
        ) {
          throw new OrchestratorCapConfigError(
            `effectiveCap ${effectiveCapUsd.toFixed(4)} USD is not above the synthesis reserve ` +
              `${spec.synthesisReserveUsd.toFixed(4)} USD: the coordination loop would have no ` +
              'money at all',
          );
        }
        orchestratorAccount =
          callingState.scope === '' ? 'orchestrator' : `${callingState.scope}/orchestrator`;
        internals.budget.openAccount(orchestratorAccount, {
          parentScope: callingState.budgetScope ?? ROOT_ACCOUNT,
          ceilingUsd: effectiveCapUsd,
          kind: 'orchestrator-cap',
        });
        if (extension !== undefined) {
          // The reserve registers in the orchestrator account AND the
          // run root: admission never eats the finalization money, even
          // against whole-run exhaustion.
          internals.budget.commitFinalizeReserve(orchestratorAccount, finalizeReserveUsd);
        }
        if (spec?.synthesisReserveUsd !== undefined && spec.synthesisReserveUsd > 0) {
          internals.budget.commitSynthesisReserve(orchestratorAccount, spec.synthesisReserveUsd);
        }
        capState = {
          effectiveCapUsd,
          finalizeReserveUsd,
          finalizeTurns,
          turnEstimateUsd,
          atCap: spec?.atCap ?? 'finish-with-partial',
          source: spec?.capUsd !== undefined || spec?.capFraction !== undefined ? 'call' : 'engine',
        };
      }
    }

    // `records` is the HANDLE lookup: several handles can map to one
    // record once recovery aliases prior attempts to their reborn
    // dispatch (RV609). Every roster-shaped walk (digests, quiescence,
    // validation children, acceptance) therefore iterates `byOrdinal`,
    // exactly one record per admitted spawn, so an aliased child can
    // never be counted twice.
    const records = new Map<number, SpawnRecord>();
    const byOrdinal = new Map<number, SpawnRecord>();
    const rejectedByOrdinal = new Map<number, { decision: AdmissionDecision; entrySeq: number }>();
    /**
     * The terminal child barrier (RV1903): every exit of this
     * orchestration, returned or thrown, passes through the finally
     * below, so a child still running when the verdict froze reaches a
     * journaled terminal BEFORE the workflow settles. The benchmark's
     * recovery journal recorded run_settle at sequence 18 and three
     * child terminals at 19..21; the returned outcome, the terminal
     * invoice and the event snapshot all disagreed with the final
     * journal. 'cancel' (default) aborts the stragglers and awaits
     * their cancelled terminals; 'drain' awaits their natural
     * terminals, bounded by their own limits. The frozen verdict is
     * journaled before the barrier runs, so late children never change
     * it; result promises never reject (SpawnRecord contract), so the
     * barrier never masks the exit's own error.
     */
    const exitBarrier = async (): Promise<void> => {
      const live = [...byOrdinal.values()].filter((record) => record.settled === undefined);
      if (live.length === 0) {
        return;
      }
      if ((opts?.onUnsettledAtExit ?? 'cancel') === 'cancel') {
        for (const record of live) {
          record.abort();
        }
      }
      await Promise.allSettled(live.map((record) => record.result));
    };
    barrier.run = exitBarrier;
    /**
     * Whether an acceptance verdict exists (RV2602). The roster fold
     * below reports only where no policy ever spoke: two folds of the
     * same children under two different authorities would be one
     * reading too many, and the acceptance decision is the authority
     * wherever it exists.
     */
    let acceptanceRendered = false;
    /**
     * The pre-acceptance roster (RV2602): what the children had
     * produced at the moment the run gave up. The facts are already in
     * the journal, one child terminal at a time, and the terminal said
     * nothing about them because every surface that names children
     * hangs off the acceptance fold. The fourth parity run is the
     * shape: a worker settled `ok` with zero recorded evidence entries
     * under a declared contract, and the run died before acceptance
     * could say so.
     *
     * Read BEFORE the exit barrier, so it is the roster the verdict
     * would have frozen, not the one the stragglers land on later.
     */
    const rosterAtFailure = (): ChildrenAtFailure | undefined => {
      if (acceptanceRendered) {
        return undefined;
      }
      const roster = [...byOrdinal.values()];
      if (roster.length === 0) {
        return undefined;
      }
      const statusCounts: Record<string, number> = {};
      const belowFloor: string[] = [];
      const unsettled: string[] = [];
      for (const record of roster) {
        const settled = record.settled;
        if (settled === undefined) {
          unsettled.push(record.nodeId);
          continue;
        }
        statusCounts[settled.status] = (statusCounts[settled.status] ?? 0) + 1;
        // The same verdict the acceptance fold reads (RV806), counted
        // here because nothing else will: an ok child under an unmet
        // contract is the one that looks healthiest and is not.
        if (settled.status === 'ok' && settled.evidence !== undefined && !settled.evidence.met) {
          belowFloor.push(record.nodeId);
        }
      }
      return {
        spawned: roster.length,
        settled: roster.length - unsettled.length,
        statusCounts,
        ...(belowFloor.length === 0 ? {} : { belowFloorOkChildren: belowFloor }),
        ...(unsettled.length === 0 ? {} : { unsettled }),
      };
    };
    barrier.roster = rosterAtFailure;
    /**
     * The journaled spec behind each recovered ordinal: the idempotent
     * re-execution guard compares it against the incoming call, because
     * after a cross-attempt resume a REGENERATED turn (the boundary
     * checkpoint predates the lost turn) may decide differently, and
     * handing it the prior ordinal's handle would bind the transcript
     * to a stranger's child.
     */
    // Unclaimed recovered admissions by their CANONICAL spec (RV1605):
    // jcsSerialize(spec) -> spawn ordinals in journal order. A
    // regenerated spawn call claims the first unclaimed decision whose
    // full spec matches byte for byte; anything else decides fresh.
    const unclaimedRecoveredBySpec = new Map<string, number[]>();
    let nextOrdinal = 0;
    /**
     * The maxSpawns ledger counts ADMITTED children, never attempt
     * ordinals: an admission-rejected spawn spends nothing, so it must
     * not consume a slot (the sixth comparison experiment's run 2, where
     * a transient budget rejection burned the fourth slot and the
     * orchestrator's viable retry was refused). Ordinals keep advancing
     * per attempt regardless: they are journal identity, not quota.
     */
    let admittedSpawnCount = 0;
    let orchSeq: number | undefined;
    // Wake substrate (M6-T09): coalescing state plus settle listeners.
    const deliveredNodeIds = new Set<string>();
    const settleListeners = new Set<() => void>();
    let wakeOrdinal = 0;
    let coversToOrdinal = -1;
    let releaseRecovery: () => void = () => undefined;
    const recoveryDone = new Promise<void>((resolve) => {
      releaseRecovery = resolve;
    });
    /**
     * Incremental synthesis notes (RV-211 remainder): one bounded
     * synthesize-role invocation per settled child, keyed by nodeId so a
     * note can never double-dispatch. The settle hook fires the note the
     * moment its child settles (overlapping the still-running fan-out);
     * the deterministic reconciliation is the completeness backstop and
     * dispatches any note the hook missed. The dispatcher installs right
     * before the coordination loop because it closes over runtime pieces
     * built below; these bindings are declared HERE, before
     * dispatchChild, so a recovered child's settle hook (which can fire
     * during the recovery scan) never touches a binding in its temporal
     * dead zone.
     */
    const synthesisNotes = new Map<string, Promise<AgentResult<unknown>>>();
    let synthesisNoteDispatcher:
      ((record: SpawnRecord) => Promise<AgentResult<unknown>>) | undefined;
    let synthesisSettleFrozen = false;
    // Extension activity (scheduling edges) serializes on one chain and
    // always precedes wake-trigger evaluation for the settlement that
    // caused it (quiescence sees the post-scheduling state).
    let activityChain: Promise<void> = Promise.resolve();

    const childScopeOf = (): string => {
      if (orchSeq === undefined) {
        throw new ConfigError('orchestrator dispatch seq unknown before the loop started');
      }
      return agentScope(callingState.scope, orchSeq);
    };

    const runExtensionActivity = (): Promise<void> => {
      if (extension?.onActivity === undefined) {
        return Promise.resolve();
      }
      activityChain = activityChain.then(async () => {
        try {
          await extension.onActivity?.(io);
        } catch (thrown) {
          // A scheduling fault never tears the run down silently: it is
          // surfaced as telemetry and the plan stalls toward quiescence.
          internals.events.emit(
            {
              type: 'log',
              level: 'error',
              msg: `orchestrator extension '${extension.name}' onActivity failed`,
              data: { message: thrown instanceof Error ? thrown.message : String(thrown) },
            },
            callingState.spanId,
          );
        }
      });
      return activityChain;
    };

    const dispatchChild = async (
      spec: SpawnAgentParams | ExtensionDispatchSpec,
      spawnOrdinal: number,
      identity: { nodeId: string; logicalTaskId: string },
      placement?: { childScope: string; childCeilingUsd?: number; ownAccount?: boolean },
    ): Promise<SpawnRecord> => {
      const controller = new AbortController();
      const upstream = callingState.signal ?? internals.runSignal;
      const scope = placement?.childScope ?? childScopeOf();
      if (placement?.ownAccount === true) {
        // Plan nodes get their own sub-account beside the orchestrator
        // account; reopening on resume keeps state. Recovery placements
        // pin only the SCOPE (so forward matching finds the prior
        // attempt's children); their budget flows like a plain spawn.
        internals.budget.openAccount(scope, {
          parentScope: callingState.budgetScope ?? ROOT_ACCOUNT,
          ...(placement.childCeilingUsd === undefined
            ? {}
            : // The node's own allowance: spawn reserves inside it clamp
              // to its headroom instead of denying on estimates the
              // ceiling already bounds ("admit implies dispatchable").
              { ceilingUsd: placement.childCeilingUsd, kind: 'child-allowance' as const }),
        });
      }
      const childState: CtxScopeState = {
        scope,
        spanId: internals.spans.mint(callingState.spanId),
        // The dynamic stage phase (RV3905): children fold under
        // 'fan-out' unless the host wrapped the orchestration in an
        // explicit ctx.phase, which then wins. The child state never
        // inherited the calling phase before, so phase-wrapped hosts
        // also stop losing their own bucket here.
        phase: callingState.phase ?? 'fan-out',
        signal:
          upstream === undefined
            ? controller.signal
            : AbortSignal.any([upstream, controller.signal]),
        budgetScope:
          placement?.ownAccount === true ? scope : (callingState.budgetScope ?? ROOT_ACCOUNT),
      };
      let resolveHandle: (seq: number) => void = () => undefined;
      const handlePromise = new Promise<number>((resolve) => {
        resolveHandle = resolve;
      });
      const agentOpts: AgentOpts & InternalAgentHooks & { result: 'full' } = {
        agentType: spec.agentType,
        result: 'full',
        ...resolveDispatchOpts(spec, internals.defaults),
        [kOnRunning]: (seq: number) => resolveHandle(seq),
        // The child exposure wait (RV2002): a pre-wire exposure
        // refusal parks the child until a live hold releases instead
        // of killing it mid-research (the third parity rerun lost
        // three workers with ~550k-token contexts to exactly that
        // death); the drained arm dies as the typed cheap
        // 'exposure-drained' refusal the orchestrator can re-spawn.
        [kExposureWait]: 'child',
      };
      const result = runtime.runInScope(childState, () =>
        (ctx.agent as (prompt: string, o?: unknown) => Promise<AgentResult<unknown>>)(
          spec.prompt,
          agentOpts,
        ),
      );
      // The full-result form never throws on terminal statuses; infra
      // errors must not crash the orchestrator either: they settle the
      // record with a synthesized error result. A rejection BEFORE the
      // root entry lands additionally releases the handle await with the
      // sentinel (the pre-root cousin of the stale-writer liveness rule),
      // so a dispatch that dies pre-flight surfaces loudly instead of
      // hanging the dispatching caller forever. The sentinel resolution
      // is inert on healthy paths: the root seq always resolves first.
      const PRE_ROOT_FAILED = -1;
      let preRootFailure: unknown;
      const settledResult: Promise<AgentResult<unknown>> = result.catch(
        (thrown: unknown): AgentResult<unknown> => {
          preRootFailure = thrown;
          resolveHandle(PRE_ROOT_FAILED);
          return {
            status: 'error',
            output: null,
            usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
            costUsd: 0,
            costBasis: 'per-call',
            turns: 0,
            servedBy: 'unknown:unknown',
            transcriptRef: '',
            errorMessage: thrown instanceof Error ? thrown.message : String(thrown),
          };
        },
      );
      const handle = await handlePromise;
      if (handle === PRE_ROOT_FAILED) {
        throw preRootFailure instanceof Error
          ? preRootFailure
          : new ConfigError(
              'extension dispatch failed before the agent root entry landed' +
                (preRootFailure === undefined ? '' : `: ${JSON.stringify(preRootFailure)}`),
            );
      }
      const record: SpawnRecord = {
        handle,
        spawnOrdinal,
        nodeId: identity.nodeId,
        logicalTaskId: identity.logicalTaskId,
        result: settledResult,
        abort: () => {
          controller.abort('rulvar:cancel_agent');
        },
        ...((spec as ExtensionDispatchSpec).escalation?.flavor === undefined
          ? {}
          : { escalationFlavor: (spec as ExtensionDispatchSpec).escalation?.flavor }),
      };
      void settledResult.then(async (settled) => {
        record.settled = settled;
        // Incremental synthesis (RV-211 remainder): the note dispatches
        // the moment the child settles, so note wall time overlaps the
        // still-running fan-out instead of stacking post-fan-in. Inert
        // until the dispatcher installs (mode 'incremental' only) and
        // after the reconciliation froze its snapshot.
        if (!synthesisSettleFrozen) {
          void synthesisNoteDispatcher?.(record);
        }
        // The scheduling edge runs BEFORE wake evaluation so quiescence
        // sees newly-ready nodes.
        await runExtensionActivity();
        for (const listener of [...settleListeners]) {
          listener();
        }
      });
      records.set(handle, record);
      byOrdinal.set(spawnOrdinal, record);
      return record;
    };

    /**
     * The declared fail-run terminal (v1.35.0 review P2-1): the first
     * extension terminate() call stores its failure and aborts the
     * orchestrator loop; the settle boundary rethrows it deterministically
     * (boot terminates again from the journaled verdict on resume, so the
     * same failure rolls forward without a model call).
     */
    let extensionTermination: Error | undefined;
    const forcedFinishController = new AbortController();

    // The public extension IO (M7-T05): every capability maps to a
    // contract requirement; see orchestrator/extension.ts.
    const io: OrchestratorExtensionIO = {
      runId: internals.runId,
      baseScope: callingState.scope,
      orchestratorScope: () => childScopeOf(),
      profiles: advertisedProfiles,
      gates: internals.defaults.gates ?? {},
      ...(internals.budget.ceilingUsd === undefined
        ? {}
        : { runCeilingUsd: internals.budget.ceilingUsd }),
      // The authoritative cap dollars (DEF-7; XF-09): resolved strictly
      // before boot, recovered from the frozen reserve decision on
      // resume, so an extension can freeze them into termination.init.
      ...(capState === undefined
        ? {}
        : {
            orchestratorCapUsd: capState.effectiveCapUsd,
            finalizeReserveUsd: capState.finalizeReserveUsd,
          }),
      mintId: createCanonicalIdMinter(),
      // The journaled draw lands in the orchestrate call's own scope so a
      // re-executed turn replays the SAME value by content-key match.
      random: (key?: string) =>
        runtime.runInScope(callingState, () => Promise.resolve(ctx.random(key))),
      append: (input) =>
        internals.replayer.appendSinglePhase({
          scope: input.scope,
          key: input.key,
          kind: input.kind,
          status: 'ok',
          spanId: internals.spans.mint(callingState.spanId),
          value: input.value,
          site: `extension:${extension?.name ?? 'none'}`,
        }),
      snapshot: () => internals.replayer.snapshot(),
      flush: () => internals.replayer.flush(),
      admission,
      dispatch: async (spec, childScope, identity) => {
        const spawnOrdinal = nextOrdinal;
        nextOrdinal += 1;
        // Extension dispatches are real children: they consume a slot at
        // entry, exactly as their ordinal did before the ledger split.
        admittedSpawnCount += 1;
        const record = await dispatchChild(spec, spawnOrdinal, identity, {
          childScope,
          ownAccount: true,
          ...(spec.budgetUsd === undefined ? {} : { childCeilingUsd: spec.budgetUsd }),
        });
        return { handle: record.handle };
      },
      settledOf: (handle) => records.get(handle)?.settled,
      cancel: (handle, reason) => cancelByHandle(handle, reason),
      abandonBranch: async (attempt) => {
        const outcome = await internals.replayer.abandonBranch(attempt);
        return { applied: outcome.applied, seq: outcome.seq };
      },
      registerAlias: (donorScope, targetScope) =>
        internals.replayer.registerAlias(donorScope, targetScope),
      priceUsd: (servedBy, usage) =>
        servedBy === undefined
          ? undefined
          : internals.priceUsd(servedBy as `${string}:${string}`, usage),
      emit: (event, options) =>
        internals.events.emit(event, callingState.spanId, options?.replayed),
      terminate: (error) => {
        if (extensionTermination !== undefined) {
          return;
        }
        extensionTermination = error;
        forcedFinishController.abort('rulvar:extension-terminate');
      },
    };

    const cancelByHandle = async (
      handle: number,
      _reason?: string,
    ): Promise<{ cancelled: boolean; handle: number }> => {
      const record = records.get(handle);
      if (record === undefined) {
        throw new ConfigError(`cancel_agent: unknown handle ${String(handle)}`);
      }
      if (record.settled !== undefined) {
        return { cancelled: false, handle };
      }
      // Caller intent (M6 note): the child terminal
      // journals 'cancelled' and reruns on a later resume unless
      // covered by abandon; the abandon compilation rides the DEF-5
      // machinery (M7-T07).
      record.abort();
      await record.result;
      return { cancelled: true, handle };
    };

    /**
     * True when `scope` is a root-attempt scope of THIS orchestration:
     * agentScope(callingState.scope, n) for some dispatch seq n. Nested
     * orchestrations live under their own wf: child scopes and never
     * match a foreign calling scope.
     */
    const scopeOfThisOrchestration = (scope: string): boolean => {
      const prefix = callingState.scope === '' ? '' : `${callingState.scope}/`;
      return scope.startsWith(prefix) && /^agent:\d+$/.test(scope.slice(prefix.length));
    };

    /**
     * Rebuilds spawn records from the journal (the crash-resume
     * contract). Recovery is ORCHESTRATION-scoped, not attempt-scoped:
     * decisions journal at the orchestrate call's own scope, which is
     * stable across root attempts, so a rerun after a cancelled root
     * (the budget-abort shape the v1.6.0 follow-up review resumed) sees
     * every prior decision instead of re-deciding and re-paying.
     * Recovered children re-dispatch PINNED to their journaled child
     * scope: settled ones forward-match and replay for free, a dangling
     * one redispatches live (at-least-once), and a decision without a
     * dispatch entry rolls forward to a fresh dispatch.
     */
    const recover = async (): Promise<void> => {
      const currentScope = childScopeOf();
      const admissions = internals.replayer
        .snapshot()
        .filter((entry) => {
          if (entry.kind !== 'decision' || entry.scope !== callingState.scope) {
            return false;
          }
          const value = entry.value as Partial<SpawnAdmissionValue> | undefined;
          return (
            value?.decisionType === 'spawn-admission' &&
            (value.origin === 'spawn_agent' || value.origin === 'parallel_agents')
          );
        })
        .map((entry) => ({
          entrySeq: entry.seq,
          value: entry.value as unknown as SpawnAdmissionValue,
        }))
        .sort((a, b) => a.value.spawnOrdinal - b.value.spawnOrdinal);
      for (const { entrySeq, value } of admissions) {
        nextOrdinal = Math.max(nextOrdinal, value.spawnOrdinal + 1);
        const decision = value.decision as unknown as AdmissionDecision;
        {
          const specKey = jcsSerialize(value.spec);
          const queue = unclaimedRecoveredBySpec.get(specKey);
          if (queue === undefined) {
            unclaimedRecoveredBySpec.set(specKey, [value.spawnOrdinal]);
          } else {
            queue.push(value.spawnOrdinal);
          }
        }
        const recoveredAgentType =
          (value.spec as { agentType?: string } | undefined)?.agentType ?? 'unknown';
        if (decision.verdict.kind !== 'admit') {
          rejectedByOrdinal.set(value.spawnOrdinal, { decision, entrySeq });
          continue;
        }
        // The recovered slot ledger mirrors the live one: admits count,
        // rejections never do.
        admittedSpawnCount += 1;
        // The recovered admission takes effect here (the child
        // re-dispatches), so the event fires now, with the standard
        // replayed marker, never as a fresh live admission (v1.22.0
        // review P2-5).
        emitSpawnAdmitted(internals.events, {
          entryRef: entrySeq,
          verdict: decision.verdict.kind,
          agentType: recoveredAgentType,
          logicalTaskId: decision.verdict.lineage.logicalTaskId,
          spawnUnitsAfter: decision.verdict.spawnUnitsAfter,
          spanId: callingState.spanId,
          replayed: true,
        });
        // Quota continuity: recovered children count against the node
        // key future admissions of THIS attempt will use.
        admission.recoverChild(currentScope);
        const childScope = value.childScope ?? value.orchestratorScope;
        const record = await dispatchChild(
          value.spec as unknown as SpawnAgentParams,
          value.spawnOrdinal,
          {
            nodeId: decision.nodeId ?? 'unknown',
            logicalTaskId: decision.verdict.lineage.logicalTaskId,
          },
          { childScope },
        );
        // Handle stability across attempts (RV609): a restored
        // transcript holds the handles its turns saw, and every handle
        // is a RUNNING row's seq, so the claimable set is exactly the
        // prior running rows of this admission's (scope, key) (the
        // cancelled or errored attempt keeps its running row; its
        // terminal is a separate row and never a handle). A replayed or
        // re-attached child keeps its seq, but a cancelled or
        // unmemoized-terminal child RERUNS under a new one, and a rerun
        // takes the NEXT occurrence ordinal (ordinals are strictly
        // monotonic per (scope, key)), so the old ordinal-equality
        // condition could never link attempts: the alias was
        // unreachable for ANY rerun and the old handle exhausted the
        // coordinator on "unknown handle" repair turns. Same (scope,
        // key) under the pinned child scope means a prior attempt of a
        // same-content spawn; a transiently mis-claimed same-key
        // sibling is content-interchangeable and is rebound the moment
        // its own redispatch lands (dispatchChild's records.set
        // overwrites the alias with the direct binding).
        const dispatched = internals.replayer
          .snapshot()
          .find((entry) => entry.seq === record.handle);
        if (dispatched !== undefined) {
          for (const prior of internals.replayer.snapshot()) {
            if (
              prior.kind === 'agent' &&
              prior.status === 'running' &&
              prior.seq !== record.handle &&
              prior.scope === dispatched.scope &&
              prior.key === dispatched.key &&
              !records.has(prior.seq)
            ) {
              records.set(prior.seq, record);
            }
          }
        }
      }
      // Wake recovery (M6-T09): prior wake suspensions restore the
      // coalescing state; resolved digests are authoritative (pinned).
      // The scan spans attempts exactly like decision recovery: a wake
      // key is 'wake:<dispatch seq>:<ordinal>' under its attempt's
      // scope, so membership tests the scope's orchestration, never the
      // current seq.
      for (const entry of internals.replayer.snapshot()) {
        if (entry.status !== 'suspended' || entry.kind !== 'external') {
          continue;
        }
        if (!scopeOfThisOrchestration(entry.scope)) {
          continue;
        }
        const payload = entry.value as { key?: string } | undefined;
        const match =
          typeof payload?.key === 'string' ? /^wake:\d+:(\d+)$/.exec(payload.key) : null;
        if (match === null) {
          continue;
        }
        wakeOrdinal = Math.max(wakeOrdinal, Number(match[1]) + 1);
        const suspension = internals.replayer.suspensionState(entry.seq);
        if (suspension.state === 'resolved') {
          markDelivered(suspension.value as unknown as WakeDigest);
        }
      }
      // The extension re-schedules ready plan nodes after recovery
      // (forward matching pays nothing for settled children).
      await runExtensionActivity();
    };

    let capDecisionRef: number | undefined = internals.replayer
      .snapshot()
      .find(
        (entry) =>
          entry.kind === 'decision' &&
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
            'orchestrator_budget_cap',
      )?.seq;
    let capInFlight = false;

    /**
     * The at-cap freeze: EXACTLY one decision entry
     * strictly before any effects; then the plan freezes for adaptation,
     * wake triggers except quiescence disarm, and the orchestrator is
     * driven to the reserved final wake. Crash between the entry and the
     * effects is ordinary roll-forward: the frozen state re-derives from
     * the journaled entry (capDecisionRef recovers it at boot).
     */
    const triggerCap = async (cause: 'pre-wake' | 'per-turn'): Promise<void> => {
      // The DEF-7 freeze protocol engages only under PlanRunner (the
      // extension); plain mode (c) keeps the M6 enforcement layers.
      if (
        capDecisionRef !== undefined ||
        capInFlight ||
        capState === undefined ||
        extension === undefined
      ) {
        return;
      }
      // Exactly ONE cap decision: the latch closes the
      // race between concurrently-evaluated wake ordinals.
      capInFlight = true;
      const view =
        orchestratorAccount === undefined
          ? undefined
          : internals.budget.accountView(orchestratorAccount);
      const extras = extension?.digestExtras?.(io) as { planHash?: string } | undefined;
      const entry = await internals.replayer.appendSinglePhase({
        scope: callingState.scope,
        key: deriverV2.deriveKey({ kind: 'orchestrator-budget-cap' }),
        kind: 'decision',
        status: 'ok',
        spanId: internals.spans.mint(callingState.spanId),
        site: 'orchestrator-budget',
        value: {
          decisionType: 'orchestrator_budget_cap',
          spentUsd: view?.spentUsd ?? 0,
          capUsd: capState.effectiveCapUsd,
          finalizeReserveUsd: capState.finalizeReserveUsd,
          cause,
          snapshot: {
            planHash: extras?.planHash ?? '',
            ledgerSnapshot: internals.replayer.snapshot().length,
            wakeOrdinal,
          },
          fallback: capState.atCap,
          disarmedTriggers: ['child_terminal', 'escalation', 'budget_threshold'],
          // A configured synthesis step will never run on a capped run
          // (the reserved finalizer settles it): the machine reason is
          // frozen at trip time, immune to option drift (11.4).
          ...(opts?.synthesis === undefined
            ? {}
            : { synthesisSkipped: 'synthesis_skipped_by_budget_cap' }),
        },
      });
      capDecisionRef = entry.seq;
      internals.events.emit(
        {
          type: 'orchestrator:budget',
          atCap: true,
          spentUsd: view?.spentUsd ?? 0,
          capUsd: capState.effectiveCapUsd,
          finalizeReserveUsd: capState.finalizeReserveUsd,
        },
        callingState.spanId,
      );
      // The orchestrator's own loop ends at the wake boundary; the
      // reserved final wake is a FRESH agent entry with the restricted
      // toolset.
      forcedFinishController.abort('rulvar:forced-finish');
    };

    /** Layer-1 soft boundary before delivering each wake. */
    const overSoftBoundary = (): boolean => {
      if (capState === undefined || orchestratorAccount === undefined || extension === undefined) {
        return false;
      }
      const view = internals.budget.accountView(orchestratorAccount);
      return (
        (view?.spentUsd ?? 0) + capState.turnEstimateUsd >
        capState.effectiveCapUsd - capState.finalizeReserveUsd
      );
    };

    const markDelivered = (digest: WakeDigest): void => {
      for (const item of digest.completedDigests) {
        deliveredNodeIds.add(item.nodeId);
      }
      coversToOrdinal = Math.max(coversToOrdinal, digest.coversToOrdinal);
      // Pinning bookkeeping for the extension (plan_view and rebase base
      // validation consume recorded digests).
      extension?.onWake?.(digest);
    };

    const buildDigest = (ordinal: number): WakeDigest => {
      const undelivered = [...byOrdinal.values()]
        .filter((record) => record.settled !== undefined && !deliveredNodeIds.has(record.nodeId))
        .sort((a, b) => a.spawnOrdinal - b.spawnOrdinal);
      const escalations: EscalationDigest[] = [];
      for (const record of undelivered) {
        const settled = record.settled;
        if (settled?.status !== 'escalated') {
          continue;
        }
        const terminal = internals.replayer
          .snapshot()
          .find(
            (entry) =>
              entry.kind === 'agent' && entry.ref === record.handle && entry.status === 'escalated',
          );
        escalations.push({
          nodeId: record.nodeId,
          logicalTaskId: record.logicalTaskId,
          reportRef: terminal?.seq ?? record.handle,
          kind: (settled.escalation as { kind?: string } | undefined)?.kind ?? 'scope_bigger',
          // The dispatch-captured flavor: a flavor B report reaching the
          // digest is already DECIDED (the child terminates only after
          // the suspension resolves).
          flavor: record.escalationFlavor ?? 'A',
        });
      }
      const digest: WakeDigest = {
        digestSeq: ordinal + 1,
        ...emptyDigestBlocks(),
        coversToOrdinal: undelivered.reduce(
          (max, record) => Math.max(max, record.spawnOrdinal),
          coversToOrdinal,
        ),
        completedDigests: undelivered.map((record) => {
          const row = digestOf(record, record.settled as AgentResult<unknown>);
          const budgetChars = opts?.renderBudgetChars ?? WAKE_SUMMARY_RENDER_BUDGET_CHARS;
          // The deterministic character measure: identical live and on
          // replay, no tokenizer dependence; the budget bounds the WHOLE
          // rendered row, marker included (v1.35.0 review P2-2).
          const outputSummary = truncateToBudget(row.outputSummary, budgetChars);
          return outputSummary === row.outputSummary ? row : { ...row, outputSummary };
        }),
        escalations,
      };
      if (capState !== undefined && orchestratorAccount !== undefined) {
        // Passive visibility: the budget block rides
        // every digest; there is NO wake trigger on the orchestrator's
        // own spend.
        const view = internals.budget.accountView(orchestratorAccount);
        const root = internals.budget.accountView(callingState.budgetScope ?? ROOT_ACCOUNT);
        const orchestratorSpentUsd = view?.spentUsd ?? 0;
        const runSpentUsd = root?.spentUsd ?? 0;
        digest.budget = {
          runSpentUsd,
          runCeilingUsd: root?.ceilingUsd ?? 0,
          orchestratorSpentUsd,
          orchestratorCapUsd: capState.effectiveCapUsd,
          finalizeReserveUsd: capState.finalizeReserveUsd,
          orchestratorShare: orchestratorSpentUsd / Math.max(runSpentUsd, 0.01),
          softWarning:
            orchestratorSpentUsd >= 0.8 * (capState.effectiveCapUsd - capState.finalizeReserveUsd),
        };
        internals.events.emit(
          { type: 'orchestrator:budget', atCap: capDecisionRef !== undefined, ...digest.budget },
          callingState.spanId,
        );
      }
      // The extension merges its digest blocks (planHash now; the
      // termination, budget, and reuse blocks complete the coordinated
      // schema in M7-T13).
      const extras = extension?.digestExtras?.(io);
      return extras === undefined ? digest : { ...digest, ...extras };
    };

    // The executionFacts opt-in (RV1503), captured once: runtime
    // methods with their own `opts` parameter shadow the workflow
    // options.
    const executionFactsEnabled = opts?.executionFacts === true;
    const orchestratorRuntime: OrchestratorRuntime = {
      async spawn(
        params: SpawnAgentParams,
        origin: 'spawn_agent' | 'parallel_agents' = 'spawn_agent',
      ): Promise<{ handle: number }> {
        await recoveryDone;
        if (origin === 'spawn_agent' && opts?.requireBatchSpawn === 'reject-spawn-agent') {
          // The batch-spawn discipline (RV2005): a config-gate refusal
          // strictly before any journal append or payment, exactly the
          // maxSpawns gate's shape. The parity model spawned its
          // roster seat by seat past the batchGate; under this option
          // the single spawn is refused typed and the model re-issues
          // the wave as ONE parallel_agents batch.
          internals.events.emit(
            { type: 'spawn:rejected', code: 'batch_required', agentType: params.agentType },
            callingState.spanId,
          );
          throw new AdmissionRejectedError(
            "orchestrate requireBatchSpawn 'reject-spawn-agent': single spawn_agent calls are " +
              'refused; submit the whole wave as ONE parallel_agents call so the batch roster ' +
              'feasibility gate sees it entire',
            { data: { reason: { code: 'batch_required' } } },
          );
        }
        // Idempotent re-execution after a resume that REGENERATES the
        // spawn turn (a lost or pre-spawn checkpoint): the recovered
        // verdict binds by the FULL canonical spec (RV1605), never by
        // position. The pre-RV1605 form compared agentType and prompt
        // at a colliding ordinal, but recovery advances `nextOrdinal`
        // past every journaled admission, so the collision could not
        // occur and every regenerated spawn re-decided and re-paid; the
        // eighteenth comparison benchmark separately flagged the
        // two-field comparison as a stale-child hazard had it fired. A
        // matching call claims the first unclaimed recovered decision
        // in journal order (its settled child replays free, a dangling
        // one redispatches pinned, a rejection rolls forward); a call
        // diverging in ANY field decides fresh instead of receiving a
        // stranger's handle (the prior decision's child stays paid,
        // at-least-once).
        const specKey = jcsSerialize(params);
        const recoveredOrdinal = unclaimedRecoveredBySpec.get(specKey)?.shift();
        if (recoveredOrdinal !== undefined) {
          const recovered = byOrdinal.get(recoveredOrdinal);
          if (recovered !== undefined) {
            return { handle: recovered.handle };
          }
          const recoveredRejection = rejectedByOrdinal.get(recoveredOrdinal);
          if (recoveredRejection !== undefined) {
            const reason = recoveredRejection.decision.verdict as { reason?: { code?: string } };
            emitSpawnRejected(internals.events, {
              entryRef: recoveredRejection.entrySeq,
              code: reason.reason?.code ?? 'unknown',
              agentType: params.agentType,
              spanId: callingState.spanId,
              replayed: true,
            });
            throw new AdmissionRejectedError(
              `admission rejected spawn ordinal ${String(recoveredOrdinal)} (recovered verdict)`,
              { data: { decision: recoveredRejection.decision as unknown as Json } },
            );
          }
        }
        const spawnOrdinal = nextOrdinal;
        nextOrdinal += 1;
        if (opts?.maxSpawns !== undefined && admittedSpawnCount >= opts.maxSpawns) {
          // A config-gate rejection precedes any journal append, so the
          // event carries no entryRef. The gate reads the slot ledger of
          // ADMITTED children: attempts the admission itself rejected
          // never counted (the run-2 burned-slot class).
          internals.events.emit(
            { type: 'spawn:rejected', code: 'lifetime', agentType: params.agentType },
            callingState.spanId,
          );
          throw new AdmissionRejectedError(
            `orchestrate maxSpawns ${String(opts.maxSpawns)} reached`,
            { data: { reason: { code: 'lifetime' } } },
          );
        }
        const scope = childScopeOf();
        // The advertised set is the ENFORCED set (RV1011): with
        // opts.profiles passed, a spawn naming anything outside the
        // allowlist refuses typed BEFORE admission, because a
        // registered-but-hidden profile reachable by a guessed name
        // would widen the vocabulary the host deliberately limited.
        // Without opts.profiles the advertised set IS the registry and
        // behavior is unchanged.
        // Own-property reads on both the refusal and the resolution
        // (RV1205), belt and suspenders: the observable contract is
        // already held by filterProfiles (which builds a null-prototype
        // advertised map from own registry entries) and by ctx's own
        // registration check, so these two reads are the third line,
        // kept because either of the others could be refactored and a
        // prototype member must NEVER become a profile.
        if (opts?.profiles !== undefined && !Object.hasOwn(advertisedProfiles, params.agentType)) {
          throw new ConfigError(
            `agentType '${params.agentType}' is not in this orchestrate's profiles ` +
              `allowlist (advertised: ${Object.keys(advertisedProfiles).sort().join(', ') || 'none'})`,
          );
        }
        // The approach signature is computed from the profile-resolved
        // identity inputs available at admission (DEF-3); the toolset and
        // schema registries land in M7-T05 and upgrade the hashes there.
        const profile = Object.hasOwn(advertisedProfiles, params.agentType)
          ? advertisedProfiles[params.agentType]
          : undefined;
        const profileModel = profile?.model;
        if (
          profileModel !== undefined &&
          typeof profileModel !== 'string' &&
          'ladder' in profileModel
        ) {
          // Rejected BEFORE admission: the spawn would only die later at
          // wire resolution (router) after burning an
          // admission slot and journal entries.
          throw new ConfigError(
            `agentType '${params.agentType}' declares a ladder; ladder execution is owned ` +
              'by the plan extension, which resolves each rung attempt to a concrete model ' +
              'override; spawn a concrete profile instead',
          );
        }
        // The sequential roster feasibility inputs (RV2005): a SINGLE
        // spawn_agent call under a declared acceptance floor checks
        // whether the whole remaining roster can still be paid, the
        // batchGate arithmetic on the path model disobedience actually
        // takes. The parity rerun paid three seats one by one under a
        // floor of four the money could never reach; the batch gate
        // never saw a batch. Batch seats skip this (the batchGate
        // already judged the batch entire).
        const rosterFloor = (opts?.acceptance as { minSpawnedChildren?: number } | undefined)
          ?.minSpawnedChildren;
        const decision = admission.admit(
          {
            origin,
            name: params.agentType,
            childScope: scope,
            parentAccountScope: callingState.budgetScope ?? ROOT_ACCOUNT,
            nodeKey: scope,
            ...(params.budgetUsd === undefined ? {} : { budgetUsd: params.budgetUsd }),
            // The profile's estimate rides the read-only projection so
            // layer 2 evaluates the SAME reserve layer 1 will commit
            // (without it, the flat default over-rejects under small
            // ceilings; the v1.7.0 follow-up review's P1).
            ...(profile?.estCost === undefined ? {} : { estCostUsd: profile.estCost }),
            ...(origin === 'spawn_agent' && rosterFloor !== undefined
              ? {
                  roster: {
                    floor: rosterFloor,
                    admittedChildren: admittedSpawnCount,
                    liveExposureUsd: internals.budget.liveExposureUsd,
                  },
                }
              : {}),
            ...(params.lineage === undefined
              ? {}
              : {
                  lineage: {
                    continues: params.lineage.continues,
                    causeRef: params.lineage.causeRef,
                    // The tool schema already validates the enum (4.2).
                    ...(params.lineage.relation === undefined
                      ? {}
                      : { relation: params.lineage.relation as SpawnLineageOpt['relation'] }),
                  },
                }),
            ...(params.approach === undefined ? {} : { approach: params.approach }),
            signature: {
              agentType: params.agentType,
              isolation: canonicalIsolationTag(profile?.isolation),
            },
          },
          // The child dispatches through ctx.agent, whose own layer-1
          // admission commits the reserve: one debit, never two.
          { commitReserve: false },
        );
        const admissionValue: SpawnAdmissionValue = {
          decisionType: 'spawn-admission',
          origin,
          orchestratorScope: scope,
          spawnOrdinal,
          name: params.agentType,
          childScope: scope,
          parentAccountScope: callingState.budgetScope ?? ROOT_ACCOUNT,
          spec: params as unknown as Json,
          decision: decision as unknown as Json,
        };
        if (decision.verdict.kind !== 'reject') {
          // The slot is taken in the same synchronous slice as the
          // verdict, before the journal await, so an interleaved sibling
          // spawn can never read a stale ledger.
          admittedSpawnCount += 1;
        }
        const decisionEntry = await internals.replayer.appendSinglePhase({
          scope: callingState.scope,
          key: '',
          kind: 'decision',
          status: 'ok',
          spanId: callingState.spanId,
          value: admissionValue,
        });
        if (decision.verdict.kind === 'reject') {
          rejectedByOrdinal.set(spawnOrdinal, { decision, entrySeq: decisionEntry.seq });
          emitSpawnRejected(internals.events, {
            entryRef: decisionEntry.seq,
            code: decision.verdict.reason.code,
            agentType: params.agentType,
            spanId: callingState.spanId,
          });
          throw new AdmissionRejectedError(
            `admission rejected spawn_agent '${params.agentType}' ` +
              `(${decision.verdict.reason.code})`,
            { data: { reason: decision.verdict.reason as unknown as Json } },
          );
        }
        if (decision.verdict.kind !== 'admit') {
          throw new ConfigError(
            `admission verdict '${decision.verdict.kind}' has no producer before M7 (DEF-5)`,
          );
        }
        emitSpawnAdmitted(internals.events, {
          entryRef: decisionEntry.seq,
          verdict: decision.verdict.kind,
          agentType: params.agentType,
          logicalTaskId: decision.verdict.lineage.logicalTaskId,
          spawnUnitsAfter: decision.verdict.spawnUnitsAfter,
          spanId: callingState.spanId,
        });
        const record = await dispatchChild(params, spawnOrdinal, {
          nodeId: decision.nodeId ?? 'unknown',
          logicalTaskId: decision.verdict.lineage.logicalTaskId,
        });
        return { handle: record.handle };
      },
      async awaitAny(handles: number[]): Promise<TaskDigest> {
        await recoveryDone;
        const waited = handles.map((handle) => {
          const record = records.get(handle);
          if (record === undefined) {
            throw new ConfigError(`await_any: unknown handle ${String(handle)}`);
          }
          return record;
        });
        const first = await Promise.race(
          waited.map(async (record) => ({ record, result: await record.result })),
        );
        // The executionFacts opt-in (RV1503) rides the await digests:
        // tool result bytes are journal identity, so the flag is what
        // authorizes them.
        const digest = digestOf(first.record, first.result, executionFactsEnabled);
        // The settled subset of the waited set (RV1807): the exact
        // consume set for result reads, so the model never probes
        // handles by error. Recorded truth like the digest itself: a
        // replay reads the journaled bytes, never re-races.
        const settledHandles = waited
          .filter((record) => record.settled !== undefined)
          .map((record) => record.handle)
          .sort((a, b) => a - b);
        return { ...digest, settledHandles };
      },
      async awaitAll(handles: number[]): Promise<TaskDigest[]> {
        await recoveryDone;
        const waited = handles.map((handle) => {
          const record = records.get(handle);
          if (record === undefined) {
            throw new ConfigError(`await_all: unknown handle ${String(handle)}`);
          }
          return record;
        });
        return Promise.all(
          waited.map(async (record) =>
            digestOf(record, await record.result, executionFactsEnabled),
          ),
        );
      },
      async waitForEvents(rawTriggers: unknown): Promise<unknown> {
        await recoveryDone;
        if (internals.external === undefined) {
          throw new ConfigError('wait_for_events requires the engine run context (createEngine)');
        }
        const external = internals.external;
        const triggers = rawTriggers as WakeTrigger[];
        // An embedded run can never hang unrecoverably: a REQUESTED
        // trigger set that can never fire is an immediate typed error,
        // even though quiescence is engine-armed anyway.
        for (const trigger of triggers) {
          if (trigger.kind === 'budget_threshold' && internals.budget.ceilingUsd === undefined) {
            throw new ConfigError('budget_threshold can never fire: the run has no USD ceiling');
          }
          if (trigger.kind === 'child_terminal' && trigger.handles !== undefined) {
            for (const handle of trigger.handles) {
              if (!records.has(handle)) {
                throw new ConfigError(`child_terminal references unknown handle ${String(handle)}`);
              }
            }
            const canFire = trigger.handles.some((handle) => {
              const record = records.get(handle);
              return (
                record !== undefined &&
                (record.settled === undefined || !deliveredNodeIds.has(record.nodeId))
              );
            });
            if (!canFire) {
              throw new ConfigError(
                'child_terminal can never fire: every referenced child already settled ' +
                  'and was delivered in a prior digest',
              );
            }
          }
          if (trigger.kind === 'escalation') {
            const possible = [...byOrdinal.values()].some(
              (record) =>
                record.settled === undefined ||
                (record.settled.status === 'escalated' && !deliveredNodeIds.has(record.nodeId)),
            );
            if (!possible) {
              throw new ConfigError(
                'escalation can never fire: no live or undelivered escalated children',
              );
            }
          }
        }
        const ordinal = wakeOrdinal;
        wakeOrdinal += 1;
        const wakeScope = childScopeOf();
        const wakeKey = `wake:${String(orchSeq ?? -1)}:${String(ordinal)}`;
        const digestPromise = external.awaitExternal(
          wakeScope,
          internals.spans.mint(callingState.spanId),
          wakeKey,
          {},
        );
        // The suspended append rides the serialized queue; flush before
        // looking the entry up for engine-side resolution.
        await internals.replayer.flush();
        const entryRef = external
          .pending()
          .find((item) => item.key === wakeKey && item.scope === wakeScope)?.entryRef;
        const isReady = (trigger: WakeTrigger): boolean => {
          const undelivered = [...byOrdinal.values()].filter(
            (record) => record.settled !== undefined && !deliveredNodeIds.has(record.nodeId),
          );
          switch (trigger.kind) {
            case 'quiescence':
              // Nothing running AND nothing ready: the extension owns the
              // "nothing ready" half (M7-T05).
              return (
                [...byOrdinal.values()].every((record) => record.settled !== undefined) &&
                (extension?.quiescent?.() ?? true)
              );
            case 'child_terminal':
              if (trigger.handles === undefined) {
                return undelivered.length > 0;
              }
              return trigger.handles.some((handle) =>
                undelivered.some((record) => record.handle === handle),
              );
            case 'escalation':
              return undelivered.some((record) => record.settled?.status === 'escalated');
            case 'budget_threshold': {
              const ceiling = internals.budget.ceilingUsd;
              if (ceiling === undefined) {
                return false;
              }
              return internals.budget.spent().usd >= (trigger.percent / 100) * ceiling;
            }
          }
        };
        const withQuiescence: WakeTrigger[] = triggers.some((t) => t.kind === 'quiescence')
          ? triggers
          : [...triggers, { kind: 'quiescence' }];
        const evaluateAndFire = (): void => {
          if (entryRef === undefined) {
            return;
          }
          // After the cap only quiescence stays armed.
          const armed =
            capDecisionRef === undefined
              ? withQuiescence
              : withQuiescence.filter((trigger) => trigger.kind === 'quiescence');
          const ready = armed.filter((trigger) => isReady(trigger));
          if (ready.length === 0) {
            return;
          }
          if (capDecisionRef === undefined && overSoftBoundary()) {
            // Layer 1: crossing the soft boundary yields
            // forced finalization INSTEAD of a normal wake. The pending
            // suspension still resolves (the loop must unwind through the
            // aborted signal to reach the reserved final wake).
            void triggerCap('pre-wake').then(() =>
              external.submitResolution(entryRef, {
                by: 'engine_fallback',
                value: buildDigest(ordinal) as unknown as Json,
              }),
            );
            return;
          }
          const digest = buildDigest(ordinal) as unknown as Json;
          // Every ready trigger submits its attempt; the DEF-4
          // first-closing-wins fold classifies the losers noop.
          for (const trigger of ready) {
            void external.submitResolution(entryRef, {
              by: trigger.kind === 'quiescence' ? 'quiescence' : 'engine_fallback',
              value: digest,
            });
          }
        };
        if (entryRef !== undefined) {
          settleListeners.add(evaluateAndFire);
          evaluateAndFire();
        }
        try {
          const digest = (await digestPromise) as unknown as WakeDigest;
          if (internals.knowledge !== undefined) {
            // A resume from suspension re-pins under the same filtering
            // rules: expired, stale, and archived claims
            // never steer spawns after multi-day pauses. Zero extra
            // awaits when no store is configured (timing neutrality).
            await appendKbRepin(wakeKey);
          }
          markDelivered(digest);
          internals.cost.orchestrator.wakes += 1;
          internals.events.emit(
            {
              type: 'orchestrator:woke',
              digestSeq: digest.digestSeq,
              planHash: digest.planHash,
              coversToOrdinal: digest.coversToOrdinal,
              // the wake-render-size metric: the deterministic
              // character measure of the delivered digest bytes.
              renderSize: JSON.stringify(digest).length,
              completed: digest.completedDigests.length,
              escalations: digest.escalations.length,
            },
            callingState.spanId,
          );
          return digest;
        } finally {
          settleListeners.delete(evaluateAndFire);
        }
      },
      async cancel(
        handle: number,
        reason?: string,
      ): Promise<{ cancelled: boolean; handle: number }> {
        await recoveryDone;
        return cancelByHandle(handle, reason);
      },
      async getChildResult(
        handle: number,
        opts?: { offset?: number; maxChars?: number },
      ): Promise<ChildResultPage> {
        await recoveryDone;
        const record = records.get(handle);
        if (record === undefined) {
          throw new ConfigError(`get_child_result: unknown handle ${String(handle)}`, {
            data: { errorCode: 'unknown-handle' },
          });
        }
        const settled = record.settled;
        if (settled === undefined) {
          throw new ConfigError(
            `get_child_result: child ${String(handle)} has not settled; await it first`,
            { data: { errorCode: 'child-not-settled' } },
          );
        }
        const page = pageOf(serializeChildOutput(settled), opts?.offset, opts?.maxChars);
        return {
          handle,
          status: settled.status,
          ...page,
          artifacts: (settled.artifacts ?? []).map((artifact) => ({
            id: artifact.id,
            kind: artifact.kind,
            ...(artifact.label === undefined ? {} : { label: artifact.label }),
          })),
          // The executionFacts opt-in (RV1503), the await digests' rule.
          ...(executionFactsEnabled ? { facts: executionFactsOf(settled) } : {}),
        };
      },
      async getSettledChildResults(
        handles: number[],
        opts?: { maxCharsPerChild?: number },
      ): Promise<ChildResultPage[]> {
        await recoveryDone;
        // The whole set validates BEFORE any read (RV1807): the tool
        // exists so the model consumes the exact settledHandles set of
        // an await digest instead of probing handles by error, so a
        // running handle in the set is a caller mistake refused typed,
        // never a partial answer.
        const unknown = handles.filter((handle) => !records.has(handle));
        if (unknown.length > 0) {
          throw new ConfigError(
            `get_settled_child_results: unknown handle${unknown.length === 1 ? '' : 's'} ` +
              unknown.map(String).join(', '),
            { data: { errorCode: 'unknown-handle', handles: unknown } },
          );
        }
        const running = handles.filter((handle) => records.get(handle)?.settled === undefined);
        if (running.length > 0) {
          throw new ConfigError(
            `get_settled_child_results: child${running.length === 1 ? '' : 'ren'} ` +
              `${running.map(String).join(', ')} ` +
              `${running.length === 1 ? 'has' : 'have'} not settled; consume the settledHandles ` +
              'set of an await_any digest, or await first',
            { data: { errorCode: 'child-not-settled', handles: running } },
          );
        }
        return handles.map((handle) => {
          const settled = records.get(handle)?.settled as AgentResult<unknown>;
          const page = pageOf(serializeChildOutput(settled), undefined, opts?.maxCharsPerChild);
          return {
            handle,
            status: settled.status,
            ...page,
            artifacts: (settled.artifacts ?? []).map((artifact) => ({
              id: artifact.id,
              kind: artifact.kind,
              ...(artifact.label === undefined ? {} : { label: artifact.label }),
            })),
            ...(executionFactsEnabled ? { facts: executionFactsOf(settled) } : {}),
          };
        });
      },
      async readChildArtifact(
        handle: number,
        artifactId: string,
        opts?: { offset?: number; maxChars?: number },
      ): Promise<ChildArtifactPage> {
        await recoveryDone;
        const record = records.get(handle);
        if (record === undefined) {
          throw new ConfigError(`read_child_artifact: unknown handle ${String(handle)}`, {
            data: { errorCode: 'unknown-handle' },
          });
        }
        const settled = record.settled;
        if (settled === undefined) {
          throw new ConfigError(
            `read_child_artifact: child ${String(handle)} has not settled; await it first`,
            { data: { errorCode: 'child-not-settled' } },
          );
        }
        const artifact = (settled.artifacts ?? []).find((a) => a.id === artifactId);
        if (artifact === undefined) {
          throw new ConfigError(
            `read_child_artifact: child ${String(handle)} has no artifact '${artifactId}'`,
            { data: { errorCode: 'unknown-artifact' } },
          );
        }
        // Inline data serializes directly; an offloaded ref is fetched
        // from the (durable) transcript store and decoded as UTF-8; a
        // patch with only a file list carries no content string.
        let raw = '';
        if (artifact.data !== undefined) {
          raw = typeof artifact.data === 'string' ? artifact.data : JSON.stringify(artifact.data);
        } else if (artifact.ref !== undefined) {
          const blob = await internals.transcripts.get(artifact.ref);
          raw = blob === null ? '' : new TextDecoder().decode(blob);
        }
        const page = pageOf(raw, opts?.offset, opts?.maxChars);
        return {
          handle,
          artifactId,
          kind: artifact.kind,
          ...(artifact.label === undefined ? {} : { label: artifact.label }),
          ...page,
          ...(artifact.files === undefined ? {} : { files: artifact.files }),
        };
      },
    };

    // The extension boots strictly BEFORE the orchestrator agent's first
    // entry (termination.init precedes the first
    // scheduling entry); on resume it rebuilds state from the journal.
    if (extension?.boot !== undefined) {
      await extension.boot(io);
    }
    for (const drift of pendingCapDrifts) {
      internals.events.emit(
        {
          type: 'termination:config-drift',
          field: drift.field,
          frozenValue: drift.frozenValue,
          liveValue: drift.liveValue,
        },
        callingState.spanId,
      );
    }
    // Model knowledge pinning (M10-T03): one knowledge read at run admission,
    // ONLY for orchestrate-role runs over a CONFIGURED store; the pin
    // embeds the card bytes, so resume and replay read the entry and
    // never touch the live store. Engines without stores.modelKnowledge
    // take zero extra awaits here (timing neutrality for cassettes).
    let kbCardText: string | undefined;
    const appendKbPin = async (
      decisionType: 'kb_pinned' | 'kb_repinned',
      key: string,
    ): Promise<string> => {
      const handle = internals.knowledge;
      if (handle === undefined) {
        return '';
      }
      const snapshot = await handle.current();
      const ladders = collectDeclaredLadders(advertisedProfiles);
      const filtered = filterClaimsForRun(snapshot.claims, {
        ladders,
        ...(internals.floors === undefined ? {} : { floors: internals.floors }),
        now: new Date(internals.now()).toISOString(),
      });
      // The full advertised set: the renderer itself keeps only
      // concrete-model profiles for the profile-evidence section,
      // so declarers stay tier-only.
      const rendered = modelKnowledgeCard(filtered, ladders, { profiles: advertisedProfiles });
      await internals.replayer.appendSinglePhase({
        scope: callingState.scope,
        key,
        kind: 'decision',
        status: 'ok',
        spanId: internals.spans.mint(callingState.spanId),
        site: 'kb-pin',
        value: { decisionType, version: snapshot.version, hash: snapshot.hash, cardText: rendered },
      });
      return rendered;
    };
    const appendKbRepin = async (wakeKey: string): Promise<void> => {
      const key = deriverV2.deriveKey({ kind: 'kb-repinned', wakeKey });
      await internals.replayer.flush();
      if (
        internals.replayer
          .snapshot()
          .some((entry) => entry.kind === 'decision' && entry.key === key)
      ) {
        // The journaled repin (a resumed life or a replay) wins: entry
        // bytes, never the live store.
        return;
      }
      await appendKbPin('kb_repinned', key);
    };
    if (internals.knowledge !== undefined) {
      const pinKey = deriverV2.deriveKey({ kind: 'kb-pinned' });
      const priorPin = internals.replayer
        .snapshot()
        .find((entry) => entry.kind === 'decision' && entry.key === pinKey);
      kbCardText =
        priorPin === undefined
          ? await appendKbPin('kb_pinned', pinKey)
          : ((priorPin.value as { cardText?: string } | undefined)?.cardText ?? '');
    }
    const fullCardText = kbCardText === undefined ? cardText : `${cardText}\n${kbCardText}`;
    const reserveKey = deriverV2.deriveKey({ kind: 'orchestrator-budget-reserve' });
    if (
      extension !== undefined &&
      capState !== undefined &&
      !internals.replayer
        .snapshot()
        .some(
          (entry) =>
            entry.kind === 'decision' &&
            entry.scope === callingState.scope &&
            entry.key === reserveKey,
        )
    ) {
      // ONE decision entry strictly AFTER termination.init and strictly
      // BEFORE the orchestrator's first agent entry (XF-09): absolute
      // dollars, recovered by content key on resume, never re-evaluated.
      const initRef = internals.replayer
        .snapshot()
        .find((entry) => entry.kind === 'termination.init')?.seq;
      await internals.replayer.appendSinglePhase({
        scope: callingState.scope,
        key: reserveKey,
        kind: 'decision',
        status: 'ok',
        spanId: internals.spans.mint(callingState.spanId),
        site: 'orchestrator-budget',
        value: {
          decisionType: 'orchestrator_budget_reserve',
          capUsd: capState.effectiveCapUsd,
          finalizeReserveUsd: capState.finalizeReserveUsd,
          finalizeTurns: capState.finalizeTurns,
          source: capState.source,
          pricingVersion: internals.pricingVersion ?? 'unpriced',
          ...(initRef === undefined ? {} : { terminationInitRef: initRef }),
        },
      });
    }
    /**
     * Where the sectional finish vocabulary rides (RV808b): only the
     * invocations whose finish is actually GATED, so the schema never
     * advertises an argument nothing would splice. The coordination
     * finish is gated when the validators bind it (no synthesis) or a
     * draftPolicy is declared; the synthesis finish is gated whenever
     * the validators exist (sectionalRepair rides finishValidation, so
     * they do). The finalize-reserve and note toolsets stay plain: the
     * reserved dispatch is never validated, and incremental notes
     * cannot coexist with finishValidation at intake.
     */
    const coordSectionalFinish =
      opts?.finishValidation?.sectionalRepair !== undefined &&
      (opts.synthesis === undefined || opts.finishValidation.draftPolicy !== undefined);
    const synthSectionalFinish = opts?.finishValidation?.sectionalRepair !== undefined;
    const tools = [
      ...buildOrchestratorTools(orchestratorRuntime, fullCardText, {
        childResultTools: opts?.exposeChildResultTools === true,
        settledResultsTool: opts?.exposeSettledResultsTool === true,
        sectionalFinish: coordSectionalFinish,
        ...(opts?.parallelAdmission === undefined
          ? {}
          : { parallelAdmission: opts.parallelAdmission }),
        // The batch projection seam (RV1908): the SAME remainder and
        // dispatch projection the embedded spawn gate reads, plus the
        // run's admitted-children count and the declared roster floor.
        batchGate: {
          ...((opts?.acceptance as { minSpawnedChildren?: number } | undefined)
            ?.minSpawnedChildren === undefined
            ? {}
            : {
                rosterFloor: (opts?.acceptance as { minSpawnedChildren?: number })
                  ?.minSpawnedChildren,
              }),
          admittedChildren: () => admittedSpawnCount,
          projectionUsd: (task) => {
            const profile = internals.defaults.profiles?.[task.agentType];
            return admission.projectedDispatchReserveUsd({
              ...(profile?.estCost === undefined ? {} : { estCostUsd: profile.estCost }),
              ...(task.budgetUsd === undefined ? {} : { budgetUsd: task.budgetUsd }),
            });
          },
          remainderUsd: () =>
            internals.budget.remainderOf(callingState.budgetScope ?? ROOT_ACCOUNT),
        },
      }),
      ...(extension?.tools(io) ?? []),
    ];

    /**
     * The RV-204 finish validation hook, installed on the terminal tool
     * channel only when validators are configured (zero configuration =
     * zero new journal entries and byte identical loop behavior; the
     * toolset never changes either way). Verdicts are decision entries
     * keyed by the finish call id: a replayed call returns the JOURNALED
     * verdict without re-running validator code, so the accepted result,
     * every repair exchange, and the final rejection reproduce on resume
     * even when the live validators drifted (the acceptance precedent).
     * The final rejection journals verdict 'rejected', arms the typed
     * FailRunError, and aborts the loop; the settle path throws it
     * BEFORE the acceptance settle (and the boot scan covers the crash
     * window between the entry and the run terminal), so acceptance
     * never judges a finish the validators rejected. A THROWING
     * validator is a host defect: the run fails as ConfigError, nothing
     * journals, and no repair turn is granted, so a fixed validator
     * re-runs live on the next resume.
     */
    const validationSpec = opts?.finishValidation;
    const validationAbort = new AbortController();
    let validationTermination: Error | undefined;
    /**
     * The synthesis invocation's schema-dead finish exchanges (cycle
     * 73), captured from its full agent result so the failure
     * enrichment can fold BOTH windows into one honest counter.
     */
    let synthesisSchemaRejectedExchanges = 0;
    /**
     * The recovered twin (cycle 77): near-JSON finish exchanges the
     * unparsed second chance salvaged, folded from the same two windows
     * onto the ok envelope and the failure enrichment.
     */
    let synthesisSchemaRecoveredExchanges = 0;
    interface FinishValidationDecision {
      decisionType: 'orchestrator_finish_validation';
      callId: string;
      verdict: 'accepted' | 'repair' | 'rejected';
      failed: { name: string; reasons: string[] }[];
      /**
       * Non accepted verdicts of the current contract generation
       * rendered before this one WITHIN the current composition
       * invocation (RV3602; the count was run wide before that, which
       * is how the third comparison run's repair round entered spent).
       */
      repairsUsed: number;
      maxRepairs: number;
      /**
       * The contract generation this verdict was rendered under (cycle
       * 73): present exactly when a contract is configured. Absent on
       * decisions written without a contract and on every decision
       * recorded before 1.77.
       */
      contractHash?: string;
      /**
       * The rejected candidate's identity and address (RV2507),
       * written on every NON-accepted verdict: the sha256 over the
       * canonical candidate says WHICH document drew this verdict, the
       * char count says how big it was, and `candidateRef` is the
       * transcript blob holding the bytes verbatim, present only under
       * `retainRejectedCandidates`. All three absent on an accepted
       * verdict and on every decision journaled before RV2507.
       */
      candidateHash?: string;
      candidateChars?: number;
      candidateRef?: string;
      /**
       * The deterministic host repair attempted on this call's
       * candidate (RV3801): present exactly when every failure of the
       * submitted document carried applicable repair hints and the
       * document was a string. Outcome 'accepted' means the patched
       * document survived the FULL validator set, this decision's
       * verdict is 'accepted' with `failed` empty, no repair was
       * spent, and the accepted result is the PATCHED bytes; the
       * failures the patch healed ride `healed` so the lessons block
       * keeps teaching them. Outcome 'failed' means the patch did not
       * survive re-validation (`residual` names the validators that
       * still rejected it), the attempt cost nothing, and the
       * decision reads exactly as it would without one.
       */
      deterministicRepair?: {
        mechanism: 'insert-run-id';
        patches: { start: number; end: number; insert: string }[];
        beforeHash: string;
        afterHash: string;
        outcome: 'accepted' | 'failed';
        healed?: { name: string; reasons: string[] }[];
        residual?: string[];
      };
    }
    const finishValidationError = (decision: FinishValidationDecision): FailRunError =>
      new FailRunError(
        'the orchestrator finish failed host validation with all ' +
          `${String(decision.maxRepairs)} repair attempts spent: ` +
          decision.failed
            .map((f) => `validator '${f.name}' rejected: ${f.reasons.join('; ')}`)
            .join('; '),
        {
          data: {
            source: 'orchestrator_finish_validation',
            callId: decision.callId,
            failed: decision.failed as unknown as Json,
            repairsUsed: decision.repairsUsed,
            maxRepairs: decision.maxRepairs,
            // The rejected candidate's identity and size (RV3601), the
            // facts the decision already journals (RV2507): the third
            // comparison run's terminal could not name WHICH document
            // its repair round produced and lost, and the only route
            // to the hash was a journal dig. Absent exactly when the
            // decision carries none (a pre RV2507 journal).
            ...(decision.candidateHash === undefined
              ? {}
              : { candidateHash: decision.candidateHash }),
            ...(decision.candidateChars === undefined
              ? {}
              : { candidateChars: decision.candidateChars }),
          },
        },
      );
    const validationDecisions = (): FinishValidationDecision[] =>
      internals.replayer
        .snapshot()
        .filter(
          (entry) =>
            entry.kind === 'decision' &&
            entry.scope === callingState.scope &&
            (entry.value as { decisionType?: string } | undefined)?.decisionType ===
              'orchestrator_finish_validation',
        )
        .map((entry) => entry.value as unknown as FinishValidationDecision);
    /**
     * Where the CURRENT composition invocation's verdicts begin
     * (RV3602): an index into validationDecisions(), captured from the
     * journaled verdict count at each synthesis dispatch, so the
     * mechanical repair pool belongs to one composition invocation.
     * The third comparison run's initial composition spent the single
     * run wide repair (default maxRepairs 1), so the bounded claim
     * repair round (RV3307) entered with zero mechanical retries BY
     * CONSTRUCTION and its first regression was final: the round was
     * structurally doomed whenever the initial composition had used
     * its retry. Cycle 73 scoped the pool to the contract generation;
     * this scopes it to the invocation on the same doctrine, the pool
     * spender must be the thing that gets the bound. Replay stable:
     * a resume replays the identical decision prefix, so the captured
     * index is identical. Validators bound to the coordination loop
     * (no synthesis) keep the zero baseline: one loop, one invocation,
     * the pre RV3602 pool byte for byte. Worst case stays bounded:
     * at most two composition invocations exist (the initial and one
     * RV3307 round), each granting at most maxRepairs repair turns.
     */
    let validationInvocationStart = 0;
    /**
     * The staged release of the round's mechanical money leg (RV3802),
     * armed by the bounded claim repair round right before its
     * composition dispatches and fired at the round invocation's FIRST
     * journaled finish verdict: a 'repair' verdict is about to spend
     * the freed money on the granted turn, an 'accepted' one never
     * needed it, and a 'rejected' one dies into the round's own
     * finally, which releases whatever is still armed. Live-only state
     * on the RV808b doctrine: the hold itself is re-committed by the
     * re-executed round code on a resume, and full replay never runs
     * validateFinish at all.
     */
    let releaseRepairLeg: (() => void) | undefined;
    /**
     * The sectional round context (RV3803), armed by the bounded claim
     * repair round exactly when {@link sectionalRoundPlan} is exact
     * over the accepted pre-repair document and the judged findings:
     * the retained base, its full H2 marker roster, and the target
     * sections owning the findings. Live state cleared in the round's
     * finally; a resume re-derives it from replayed material (the
     * judged findings and the accepted document both replay verbatim),
     * so the round's prompt bytes stay identical without journaling
     * anything new.
     */
    let sectionalRoundContext: { base: string; sections: string[]; targets: string[] } | undefined;
    /**
     * The contract generation membership test (cycle 73). Without a
     * contract there are no generations and every decision is current
     * (the pre 1.77 behavior, byte identical). With one, a decision
     * belongs to the current generation when its journaled hash matches
     * the live contract; a pre 1.77 decision carries no hash and counts
     * as current only while the journal has never recorded a
     * superseding bundle descriptor, because a single descriptor means
     * every decision was necessarily rendered under it.
     */
    const contractGenerationCurrent = (decision: { contractHash?: string }): boolean => {
      const hash = validationSpec?.contract?.hash;
      if (hash === undefined) {
        return true;
      }
      if (decision.contractHash !== undefined) {
        return decision.contractHash === hash;
      }
      return (
        internals.replayer
          .snapshot()
          .filter(
            (entry) =>
              entry.kind === 'decision' &&
              entry.scope === callingState.scope &&
              (entry.value as { decisionType?: string } | undefined)?.decisionType ===
                'orchestrator_finish_validation_bundle',
          ).length <= 1
      );
    };
    /**
     * The HOST VALIDATION LESSONS block (RV3603): the third comparison
     * run's repair round regressed provenance, the exact class the
     * initial composition's mechanical loop had fixed minutes earlier,
     * because the round is a FRESH invocation with no memory of
     * exchanges it never saw. The block folds the run's journaled
     * finish validation failures (current contract generation only,
     * deduplicated by validator and reasons, journal order) so the
     * round keeps the lessons the run already paid for. Derived ONLY
     * from journaled decisions: a resume re-derives identical bytes.
     * Capped at {@link FINISH_LESSON_CAP_CHARS}; the dropped row count
     * is named, never silent.
     */
    const hostValidationLessons = (): string[] => {
      const rows: { validator: string; reasons: string[] }[] = [];
      const seen = new Set<string>();
      for (const decision of validationDecisions()) {
        // A failure the deterministic patch healed (RV3801) is still a
        // lesson the run paid for: the submitted document DID fail the
        // contract exactly so, and a later invocation should not need
        // the host to heal the same class again.
        const taught = [...decision.failed, ...(decision.deterministicRepair?.healed ?? [])];
        if (taught.length === 0 || !contractGenerationCurrent(decision)) {
          continue;
        }
        for (const failure of taught) {
          const key = JSON.stringify([failure.name, failure.reasons]);
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          rows.push({ validator: failure.name, reasons: failure.reasons });
        }
      }
      if (rows.length === 0) {
        return [];
      }
      let kept = rows.length;
      while (kept > 1 && JSON.stringify(rows.slice(0, kept)).length > FINISH_LESSON_CAP_CHARS) {
        kept -= 1;
      }
      const dropped = rows.length - kept;
      return [
        'HOST VALIDATION LESSONS: earlier composition attempts in this run failed the ' +
          'declared finish contract exactly so; keep the repaired result clear of these ' +
          'failures while resolving the contradictions. ' +
          JSON.stringify(rows.slice(0, kept)) +
          (dropped === 0
            ? ''
            : ` (${String(dropped)} lesson row${dropped === 1 ? '' : 's'} truncated)`),
      ];
    };
    /**
     * The children snapshot (RV-202): spawn order, pure reads of the
     * records the orchestrator already tracks, so validators can hold
     * a finish result (or the RV510 draft pre-pass) against the
     * evidence the children produced. Only the JOURNALED verdict of
     * validateFinish survives; on replay the snapshot is never rebuilt
     * because the entry is read by call id there.
     */
    /**
     * The salvage arm acceptance WILL apply to a limit child, mirrored
     * from the acceptance loop's own arms (RV1403): the output arm wins
     * over the partial arm, and under requireEvidenceFloor a child
     * below its declared floor is never predicted as salvageable,
     * exactly as RV1207 never lets an arm promote it. A prediction
     * because it runs at finish-validation time, BEFORE the acceptance
     * decision exists; the decision itself stays the authority for the
     * roster the pools read.
     */
    const predictedSalvage = (
      settled: AgentResult<unknown> | undefined,
    ): 'terminal-output' | 'partial' | undefined => {
      if (settled?.status !== 'limit') {
        return undefined;
      }
      if (
        opts?.acceptance?.requireEvidenceFloor === true &&
        settled.evidence !== undefined &&
        !settled.evidence.met
      ) {
        return undefined;
      }
      if (
        opts?.acceptance?.acceptValidatedTerminalOutputOnLimit === true &&
        settled.output !== null &&
        settled.output !== undefined
      ) {
        return 'terminal-output';
      }
      if (opts?.acceptance?.acceptPartialChildren === true && settled.partial !== undefined) {
        return 'partial';
      }
      return undefined;
    };
    const validationChildren = (): FinishValidationInput['children'] => {
      return [...byOrdinal.values()]
        .sort((a, b) => a.spawnOrdinal - b.spawnOrdinal)
        .map((record) => {
          // The salvage markers (P0.4; the partial twin and the floor
          // guard since RV1403): set only for a limit child an
          // acceptance arm WILL count as a success, so
          // evidencePreservedValidator includes its text in the cited
          // pool and never a rejected child's.
          const salvage = predictedSalvage(record.settled);
          return {
            handle: record.handle,
            nodeId: record.nodeId,
            status: record.settled?.status ?? 'running',
            text: record.settled === undefined ? '' : serializeChildOutput(record.settled),
            ...(salvage === 'terminal-output' ? { salvageableOutput: true } : {}),
            ...(salvage === 'partial' ? { salvageablePartial: true } : {}),
          };
        });
    };
    /**
     * The sectional repair state of ONE gated invocation (RV808b): the
     * last rejected attempt's text, spliced into by a sections-only
     * resubmission. Two independent instances exist (the draft gate
     * and the validator-bound finish), because a draft attempt must
     * never splice into a synthesis attempt. In-memory by design: the
     * exchange is durable in the transcript and the splice is a pure
     * function of it, so nothing new journals; a segment resumed from
     * a mid-invocation checkpoint retains nothing yet and refuses the
     * first sectional call with the full-resubmission remedy (the
     * synthesis seed below re-derives from the journaled draft and
     * never has this window).
     */
    const makeSectionalRepair = (): {
      resolve(call: {
        result: unknown;
        args?: unknown;
      }):
        | { kind: 'plain'; result: unknown }
        | { kind: 'spliced'; result: string }
        | { kind: 'refused'; feedback: Record<string, unknown> };
      retain(result: unknown): void;
      guidance(): Record<string, unknown>;
    } => {
      const spec = validationSpec?.sectionalRepair;
      if (spec === undefined) {
        throw new ConfigError('makeSectionalRepair without sectionalRepair configured');
      }
      const declared = spec.sections;
      let retained: string | undefined;
      const guidance = (): Record<string, unknown> => ({
        declaredSections: declared,
        instruction:
          'you may resubmit ONLY the repaired sections: call finish({ sections: ' +
          '{ "<declared marker>": "<new section body>" } }); unchanged sections are ' +
          'retained from the rejected attempt, a declared marker absent from it is ' +
          'appended at the end, and the spliced document is validated whole',
      });
      return {
        guidance,
        retain(result: unknown): void {
          // Only a text document is spliceable; a JSON object attempt
          // clears the base, so a later sectional call is refused with
          // the full-resubmission remedy instead of splicing into a
          // serialization the output schema would reject.
          retained = typeof result === 'string' ? result : undefined;
        },
        resolve(call) {
          const args = (call.args ?? {}) as Record<string, unknown>;
          const hasSections = Object.hasOwn(args, 'sections');
          const hasResult = Object.hasOwn(args, 'result');
          if (!hasSections && !hasResult) {
            return {
              kind: 'refused',
              feedback: {
                error:
                  'the finish call must carry result (the full document) or sections ' +
                  '(a sectional resubmission of a rejected attempt)',
                ...guidance(),
              },
            };
          }
          if (hasSections && hasResult) {
            return {
              kind: 'refused',
              feedback: {
                error:
                  'pass either result (the full document) or sections (a sectional ' +
                  'resubmission), never both',
                ...guidance(),
              },
            };
          }
          if (!hasSections) {
            return { kind: 'plain', result: call.result };
          }
          const patch = args.sections as Record<string, string>;
          const markers = Object.keys(patch);
          if (markers.length === 0) {
            return {
              kind: 'refused',
              feedback: {
                error: 'sections must name at least one declared section marker',
                ...guidance(),
              },
            };
          }
          const unknown = markers.filter((marker) => !declared.includes(marker));
          if (unknown.length > 0) {
            return {
              kind: 'refused',
              feedback: {
                error: `sections names an undeclared section ${unknown
                  .map((marker) => `'${marker}'`)
                  .join(', ')}; only declared markers splice`,
                ...guidance(),
              },
            };
          }
          if (retained === undefined) {
            return {
              kind: 'refused',
              feedback: {
                error:
                  'no rejected attempt is retained to splice into; resubmit the full ' +
                  'document as result',
                ...guidance(),
              },
            };
          }
          return { kind: 'spliced', result: spliceSections(retained, declared, patch) };
        },
      };
    };
    const finishSectional =
      validationSpec?.sectionalRepair === undefined ? undefined : makeSectionalRepair();
    const draftSectional =
      validationSpec?.sectionalRepair !== undefined &&
      validationSpec.draftPolicy !== undefined &&
      opts?.synthesis !== undefined
        ? makeSectionalRepair()
        : undefined;
    const validateFinish = async (call: {
      id: string;
      result: unknown;
      args?: unknown;
    }): Promise<
      | { ok: true; resolved?: { result: unknown } }
      | { ok: false; feedback: Record<string, unknown> }
    > => {
      if (validationSpec === undefined) {
        return { ok: true };
      }
      // The sectional resolve precedes every verdict (RV808b): a
      // mechanics refusal is the moral twin of a schema rejection
      // (typed feedback, nothing journals, no repair spent, bounded by
      // the turn budget); only the verdict over the resolved document
      // spends the repair bound. The ROUND's dynamic context (RV3803)
      // wins over the statically declared vocabulary while armed: its
      // base is the accepted pre-repair document and its markers are
      // that document's own headings, which is exactly what the round
      // was asked to repair.
      let effective = (call.result ?? null) as Json | null;
      let spliced = false;
      if (sectionalRoundContext !== undefined) {
        const round = sectionalRoundContext;
        const args = (call.args ?? {}) as Record<string, unknown>;
        const hasSections = Object.hasOwn(args, 'sections');
        const hasResult = Object.hasOwn(args, 'result');
        const guidance = (): Record<string, unknown> => ({
          declaredSections: round.sections,
          targetSections: round.targets,
          instruction:
            'repair ONLY the target sections: call finish({ sections: { "<marker>": "<new ' +
            'section body>" } }); unchanged sections are spliced from the retained accepted ' +
            'document byte for byte and the spliced whole is validated and judged. Resubmit ' +
            'the full document as result only when a targeted repair is impossible.',
        });
        if (hasSections && hasResult) {
          return {
            ok: false,
            feedback: {
              error:
                'pass either result (the full document) or sections (a sectional repair of ' +
                'the retained accepted document), never both',
              ...guidance(),
            },
          };
        }
        if (hasSections) {
          const patch = args.sections as Record<string, string>;
          const markers = Object.keys(patch);
          if (markers.length === 0) {
            return {
              ok: false,
              feedback: {
                error: 'sections must name at least one declared section marker',
                ...guidance(),
              },
            };
          }
          const unknown = markers.filter((marker) => !round.sections.includes(marker));
          if (unknown.length > 0) {
            return {
              ok: false,
              feedback: {
                error: `sections names an undeclared section ${unknown
                  .map((marker) => `'${marker}'`)
                  .join(', ')}; only the retained document's own markers splice`,
                ...guidance(),
              },
            };
          }
          effective = spliceSections(round.base, round.sections, patch);
          spliced = true;
        }
      } else if (finishSectional !== undefined) {
        const resolution = finishSectional.resolve(call);
        if (resolution.kind === 'refused') {
          return { ok: false, feedback: resolution.feedback };
        }
        effective = (resolution.result ?? null) as Json | null;
        spliced = resolution.kind === 'spliced';
      }
      const maxRepairs = validationSpec.maxRepairs ?? DEFAULT_FINISH_MAX_REPAIRS;
      const known = validationDecisions();
      let patchedResult: string | undefined;
      let decision = known.find((candidate) => candidate.callId === call.id);
      if (decision === undefined) {
        const result = effective;
        const input: FinishValidationInput = {
          result,
          text: typeof result === 'string' ? result : JSON.stringify(result),
          children: validationChildren(),
          runId: internals.runId,
        };
        const failed: { name: string; reasons: string[] }[] = [];
        const failureHints: (readonly FinishRepairHint[] | undefined)[] = [];
        for (const validator of validationSpec.validators) {
          let verdict: FinishValidationVerdict;
          try {
            verdict = validator.validate(input);
          } catch (thrown) {
            validationTermination = new ConfigError(
              `finish validator '${validator.name}' threw instead of returning a verdict: ` +
                (thrown instanceof Error ? thrown.message : String(thrown)),
            );
            // The defect reason is DISTINCT from the rejection reason
            // (RV3702): a throwing validator is a host defect, not a
            // verdict on the candidate, so the settle layer must not
            // stamp this span hostRejected.
            validationAbort.abort('rulvar:finish-validation-defect');
            return {
              ok: false,
              feedback: {
                error: `finish validator '${validator.name}' is defective; the run fails`,
              },
            };
          }
          if (!verdict.ok) {
            failed.push({ name: validator.name, reasons: verdict.reasons });
            failureHints.push(verdict.repairHints);
          }
        }
        // The deterministic remedy (RV3801). The third comparison run
        // died twice on a failure class whose fix the evidence-grade
        // verdict prescribes word for word (write this run's id inside
        // each offending sentence): the initial composition spent the
        // mechanical pool on it, and the repair round's candidate hit
        // it again with nothing left. When EVERY failure of a string
        // candidate carries applicable hints, the loop performs the
        // prescription itself and re-judges the patched document with
        // the FULL validator set: no provider wire, no repair spent,
        // one attempt per candidate. Fail closed at every step:
        // partial hint coverage, a non-string candidate, structurally
        // unsound hints, or residual failures on the patched document
        // all fall through to the ordinary model repair pool with the
        // original verdict bytes. Masking is excluded downstream: the
        // claim judge rules on the PATCHED document, so an inserted id
        // can satisfy provenance mechanics but never a false claim.
        let deterministicRepair: FinishValidationDecision['deterministicRepair'];
        if (
          failed.length > 0 &&
          typeof result === 'string' &&
          failureHints.every((hints) => hints !== undefined && hints.length > 0)
        ) {
          const merged: FinishRepairHint[] = [];
          const seenHints = new Set<string>();
          for (const hints of failureHints) {
            for (const hint of hints ?? []) {
              const key = `${String(hint.start)}:${String(hint.end)}:${hint.insert}`;
              if (!seenHints.has(key)) {
                seenHints.add(key);
                merged.push(hint);
              }
            }
          }
          const sound =
            merged.length <= MAX_DETERMINISTIC_PATCHES &&
            merged.every(
              (hint) =>
                hint.mechanism === 'insert-run-id' &&
                result.slice(hint.start, hint.end) === hint.sentence,
            );
          const patched = sound ? applyFinishRepairHints(result, merged) : undefined;
          if (patched !== undefined) {
            const patchedInput: FinishValidationInput = {
              result: patched,
              text: patched,
              children: input.children,
              runId: internals.runId,
            };
            const residual: string[] = [];
            for (const validator of validationSpec.validators) {
              let verdict: FinishValidationVerdict;
              try {
                verdict = validator.validate(patchedInput);
              } catch (thrown) {
                // A validator that throws on the patched document is
                // the same host defect it would be on the submitted
                // one: nothing journals, no repair is granted.
                validationTermination = new ConfigError(
                  `finish validator '${validator.name}' threw instead of returning a verdict: ` +
                    (thrown instanceof Error ? thrown.message : String(thrown)),
                );
                validationAbort.abort('rulvar:finish-validation-defect');
                return {
                  ok: false,
                  feedback: {
                    error: `finish validator '${validator.name}' is defective; the run fails`,
                  },
                };
              }
              if (!verdict.ok) {
                residual.push(validator.name);
              }
            }
            const patchSurvived = residual.length === 0;
            deterministicRepair = {
              mechanism: 'insert-run-id',
              patches: merged.map(({ start, end, insert }) => ({ start, end, insert })),
              beforeHash: createHash('sha256').update(jcsSerialize(result), 'utf8').digest('hex'),
              afterHash: createHash('sha256').update(jcsSerialize(patched), 'utf8').digest('hex'),
              outcome: patchSurvived ? 'accepted' : 'failed',
              ...(patchSurvived ? { healed: failed } : { residual }),
            };
            if (patchSurvived) {
              patchedResult = patched;
            }
          }
        }
        // Only the CURRENT contract generation spends the repair budget
        // (cycle 73), and only the CURRENT composition invocation does
        // (RV3602): a fixed contract starts with the full bound again,
        // and so does the bounded claim repair round, instead of
        // inheriting a pool the initial composition already spent.
        const repairsUsed = known.filter(
          (candidate, index) =>
            index >= validationInvocationStart &&
            candidate.verdict !== 'accepted' &&
            contractGenerationCurrent(candidate),
        ).length;
        // The rejected candidate becomes addressable (RV2507). The
        // identity is free and always recorded: the hash names WHICH
        // document drew the verdict and the count says how big it was,
        // both derived from bytes already in hand. The BYTES are
        // retained only under the declared opt-in, because a copy is a
        // storage decision the host owns, and the guide says to turn
        // it on for evaluation runs. A store that refuses the write
        // must never cost a run its verdict: the ref stays absent, and
        // absence means NOT RECORDED (RV1209).
        const rejectedCandidate = failed.length > 0 && deterministicRepair?.outcome !== 'accepted';
        let candidateRef: string | undefined;
        if (rejectedCandidate && validationSpec.retainRejectedCandidates === true) {
          const ref = `${internals.runId}/finish-rejected/${call.id}`;
          try {
            await internals.transcripts.put(
              ref,
              new TextEncoder().encode(input.text),
              internals.lease,
            );
            candidateRef = ref;
          } catch (writeFailed) {
            internals.events.emit(
              {
                type: 'log',
                level: 'warn',
                msg: 'orchestrator rejected finish candidate not retained',
                data: {
                  ref,
                  reason: (writeFailed instanceof Error
                    ? writeFailed.message
                    : String(writeFailed)
                  ).slice(0, 200),
                },
              },
              callingState.spanId,
            );
          }
        }
        decision = {
          decisionType: 'orchestrator_finish_validation',
          callId: call.id,
          // A candidate the deterministic patch healed is ACCEPTED
          // (RV3801): the verdict judges the resolved document, the
          // sectional splice precedent, and the healed failures ride
          // deterministicRepair.healed instead of `failed` so every
          // consumer's accepted-means-clean invariant holds.
          verdict:
            failed.length === 0 || deterministicRepair?.outcome === 'accepted'
              ? 'accepted'
              : repairsUsed < maxRepairs
                ? 'repair'
                : 'rejected',
          failed: deterministicRepair?.outcome === 'accepted' ? [] : failed,
          repairsUsed,
          maxRepairs,
          ...(deterministicRepair === undefined ? {} : { deterministicRepair }),
          ...(validationSpec.contract === undefined
            ? {}
            : { contractHash: validationSpec.contract.hash }),
          ...(rejectedCandidate
            ? {
                candidateHash: createHash('sha256')
                  .update(jcsSerialize(result), 'utf8')
                  .digest('hex'),
                candidateChars: input.text.length,
                ...(candidateRef === undefined ? {} : { candidateRef }),
              }
            : {}),
        };
        await internals.replayer.appendSinglePhase({
          scope: callingState.scope,
          key: `finish-validation:${call.id}`,
          kind: 'decision',
          status: 'ok',
          spanId: internals.spans.mint(callingState.spanId),
          site: 'orchestrator-finish-validation',
          value: decision,
        });
        // The staged release (RV3802): the round's first journaled
        // verdict is the moment the mechanical leg's purpose resolves,
        // whichever way it resolved; fires at most once.
        releaseRepairLeg?.();
      }
      if (decision.verdict === 'accepted') {
        // An accepted PATCHED call resolves the invocation output to
        // the deterministically repaired document (RV3801), and an
        // accepted SPLICED call to the reconstructed full one
        // (RV808b). Unreachable on a re-executed exchange either way:
        // an accepted finish terminates its invocation, so checkpoint
        // boots (which re-execute only the pending calls of a
        // cancelled root) never replay one, and the fresh path above
        // always has the patched bytes in hand.
        if (patchedResult !== undefined) {
          return { ok: true, resolved: { result: patchedResult } };
        }
        return spliced ? { ok: true, resolved: { result: effective } } : { ok: true };
      }
      // Every rejection retains the resolved attempt as the sectional
      // base (RV808b): the newest full document is what a sections-only
      // repair splices into.
      finishSectional?.retain(effective);
      if (decision.verdict === 'rejected') {
        // A STALE final rejection (a fixed contract superseded its
        // generation, cycle 73) replays its exact feedback bytes so the
        // exchange window stays identical, but no longer arms the
        // failure: the loop continues into a live repair turn judged by
        // the current generation. A current-generation rejection fails
        // the run exactly as before.
        if (contractGenerationCurrent(decision)) {
          validationTermination = finishValidationError(decision);
          // The typed reason the settle layer stamps `hostRejected`
          // from (RV3702): exactly the final rejection, never the
          // defective validator path above.
          validationAbort.abort(FINISH_REJECTION_ABORT_REASON);
        }
        return {
          ok: false,
          feedback: {
            error:
              'the finish result failed host validation and the repair bound is exhausted; ' +
              'the run fails',
            failed: decision.failed,
          },
        };
      }
      return {
        ok: false,
        feedback: {
          error:
            'the finish result failed host validation; repair the result and call finish again',
          failed: decision.failed,
          repairsRemaining: decision.maxRepairs - decision.repairsUsed - 1,
          // The sectional vocabulary rides every repairable rejection
          // (RV808b), derived from configuration alone so a replayed
          // exchange re-renders identical feedback bytes. Under the
          // armed round context (RV3803) the ROUND's own vocabulary
          // rides instead: same replay argument, the context re-derives
          // from replayed material.
          ...(sectionalRoundContext !== undefined
            ? {
                sectionalRepair: {
                  declaredSections: sectionalRoundContext.sections,
                  targetSections: sectionalRoundContext.targets,
                  instruction:
                    'repair ONLY the target sections: call finish({ sections: { "<marker>": ' +
                    '"<new section body>" } }); unchanged sections are spliced from the ' +
                    'retained accepted document byte for byte and the spliced whole is ' +
                    'validated and judged. Resubmit the full document as result only when a ' +
                    'targeted repair is impossible.',
                },
              }
            : finishSectional === undefined
              ? {}
              : { sectionalRepair: finishSectional.guidance() }),
        },
      };
    };
    /**
     * The coordination draft gate (the v1.74 experiment review, P0.3):
     * deterministic library text checks over the draft finish, run only
     * when the validators bind synthesis. Unlike validateFinish nothing
     * journals: the checks are pure functions of the exchange, the
     * rejected exchange is durable in the transcript itself, and a
     * resumed segment recounts identically. The rejection is the finish
     * call's error result, so the loop's repair-reserve grants count it
     * exactly like a host validation rejection.
     */
    const validateDraft = (call: {
      id: string;
      result: unknown;
      args?: unknown;
    }): Promise<
      | { ok: true; resolved?: { result: unknown } }
      | { ok: false; feedback: Record<string, unknown> }
    > => {
      const policy = validationSpec?.draftPolicy;
      if (policy === undefined) {
        return Promise.resolve({ ok: true });
      }
      // The sectional resolve mirrors validateFinish exactly (RV808b):
      // a mechanics refusal is typed feedback, nothing journals, and
      // only the resolved document is judged; a rejected resolved
      // attempt becomes the retained base of the next sectional call.
      let effective = (call.result ?? null) as Json | null;
      let spliced = false;
      if (draftSectional !== undefined) {
        const resolution = draftSectional.resolve(call);
        if (resolution.kind === 'refused') {
          return Promise.resolve({ ok: false, feedback: resolution.feedback });
        }
        effective = (resolution.result ?? null) as Json | null;
        spliced = resolution.kind === 'spliced';
      }
      const result = effective;
      const text = typeof result === 'string' ? result : JSON.stringify(result);
      const accept = (): Promise<{ ok: true; resolved?: { result: unknown } }> =>
        Promise.resolve(spliced ? { ok: true, resolved: { result } } : { ok: true });
      const reject = (
        feedback: Record<string, unknown>,
      ): Promise<{ ok: false; feedback: Record<string, unknown> }> => {
        draftSectional?.retain(result);
        return Promise.resolve({
          ok: false,
          feedback: {
            ...feedback,
            ...(draftSectional === undefined ? {} : { sectionalRepair: draftSectional.guidance() }),
          },
        });
      };
      if (policy === 'contract') {
        // The full-contract draft gate (RV808a): the SAME validators
        // and children snapshot the synthesis-bound validation reads,
        // run as a pure per-exchange check. The rejection names the
        // failing validators so the coordination repair loop drives
        // the draft toward exactly what the skip pre-pass will judge.
        // Same posture as the literal policy: nothing journals, the
        // durable exchange recounts identically, maxRepairs untouched.
        // A throwing validator is the same host defect it is in
        // validateFinish and fails the run typed.
        const failed: { name: string; reasons: string[] }[] = [];
        const input: FinishValidationInput = {
          result,
          text,
          children: validationChildren(),
          runId: internals.runId,
        };
        for (const validator of validationSpec?.validators ?? []) {
          let verdict: FinishValidationVerdict;
          try {
            verdict = validator.validate(input);
          } catch (thrown) {
            throw new ConfigError(
              `finish validator '${validator.name}' threw instead of returning a verdict ` +
                'during the contract draft gate: ' +
                (thrown instanceof Error ? thrown.message : String(thrown)),
            );
          }
          if (!verdict.ok) {
            failed.push({ name: validator.name, reasons: verdict.reasons });
          }
        }
        if (failed.length === 0) {
          return accept();
        }
        return reject({
          error:
            'the coordination draft failed the declared finish contract; repair the draft ' +
            'and call finish again: a contract-valid draft skips the synthesis invocation ' +
            'entirely, and every gap left here is paid for again downstream',
          failed,
        });
      }
      const reasons: string[] = [];
      if (policy.minWords !== undefined) {
        const trimmed = text.trim();
        const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
        if (words < policy.minWords) {
          reasons.push(
            `the draft carries ${String(words)} words, below the required ${String(policy.minWords)}`,
          );
        }
      }
      for (const section of policy.requireSections ?? []) {
        if (!text.includes(section)) {
          reasons.push(`required draft section '${section}' is missing`);
        }
      }
      if (reasons.length === 0) {
        return accept();
      }
      return reject({
        error:
          'the coordination draft failed the draft policy; repair the draft and call finish ' +
          'again: the synthesis invocation composes the FINAL result from this draft, and a ' +
          'collapsed draft starves it of the evidence the validators demand',
        reasons,
      });
    };
    /**
     * The extension finish gate (RV3202, the 2026-08-11 experiment's
     * second confirmed blocker): the extension's quiescence answer used
     * to gate WAKES only, so a coordination model could call finish
     * over a still-running plan node and, without an acceptance policy,
     * settle a bare ok while the exit barrier cancelled the node. The
     * gate runs FIRST inside the coordination finish channel: a refusal
     * is the mechanics posture of the sectional resolve above (typed
     * feedback as the tool error result, nothing journals, no repair
     * spent, bounded by the turn budget), so the model cancels or waits
     * and calls finish again. Replay stays deterministic because the
     * contract requires the gate to be pure over journal-derived state:
     * a re-executed turn re-evaluates it over the rebuilt fold and
     * renders the same verdict. The forced-finalization and synthesis
     * invocations are NOT gated: forced finalization is the budget
     * emergency lane where refusing the reserved finish would strand
     * the reserve, and by the synthesis dispatch the coordination loop
     * has already settled.
     */
    const withFinishGate = (
      inner:
        | ((call: {
            id: string;
            result: unknown;
            args?: unknown;
          }) => Promise<
            | { ok: true; resolved?: { result: unknown } }
            | { ok: false; feedback: Record<string, unknown> }
          >)
        | undefined,
    ):
      | ((call: {
          id: string;
          result: unknown;
          args?: unknown;
        }) => Promise<
          | { ok: true; resolved?: { result: unknown } }
          | { ok: false; feedback: Record<string, unknown> }
        >)
      | undefined => {
      if (extension?.finishGate === undefined) {
        return inner;
      }
      return async (call) => {
        const verdict = extension.finishGate?.() ?? ({ ok: true } as const);
        if (!verdict.ok) {
          return { ok: false, feedback: { error: verdict.reason } };
        }
        return inner === undefined ? { ok: true } : inner(call);
      };
    };
    /**
     * The frozen bundle descriptor (the v1.71 experiment review,
     * P0.2): with a contract configured, the run durably records WHAT
     * validates it. One decision entry per distinct contract hash, in
     * supersession order: a resume under the SAME contract appends
     * nothing (the descriptor already exists), and a resume under a
     * FIXED contract appends a superseding descriptor instead of
     * failing, because repairing a stale validator and resuming is the
     * intended remedy. No contract (or no validators at all) keeps the
     * journal byte identical, awaits included.
     */
    if (validationSpec?.contract !== undefined) {
      const bundles = internals.replayer
        .snapshot()
        .filter(
          (entry) =>
            entry.kind === 'decision' &&
            entry.scope === callingState.scope &&
            (entry.value as { decisionType?: string } | undefined)?.decisionType ===
              'orchestrator_finish_validation_bundle',
        )
        .map((entry) => entry.value as { ordinal?: number; contractHash?: string });
      const last = bundles.at(-1);
      if (last?.contractHash !== validationSpec.contract.hash) {
        await internals.replayer.appendSinglePhase({
          scope: callingState.scope,
          key: `finish-validation-bundle:${String(bundles.length)}`,
          kind: 'decision',
          status: 'ok',
          spanId: internals.spans.mint(callingState.spanId),
          site: 'orchestrator-finish-validation-bundle',
          value: {
            decisionType: 'orchestrator_finish_validation_bundle',
            ordinal: bundles.length,
            contractHash: validationSpec.contract.hash,
            validators: validationSpec.validators.map((validator) => validator.name),
            maxRepairs: validationSpec.maxRepairs ?? DEFAULT_FINISH_MAX_REPAIRS,
            ...(last?.contractHash === undefined ? {} : { supersedes: last.contractHash }),
          },
        });
      }
    }
    const agentOpts: AgentOpts & InternalAgentHooks & { result: 'full' } = {
      role: 'orchestrate',
      result: 'full',
      tools,
      // The coordination loop waits out transient exposure refusals
      // (RV1902): its settle would tear down the run its own admitted
      // children are still funding.
      [kExposureWait]: true,
      // A capped orchestrator can never spend past its effectiveCap
      // (layer 2), so its admission worst case is the cap MINUS the
      // finalize carve-out (the forced-finish wake is a separate spawn
      // with its own estCost drawn from the released finalize reserve):
      // under projected admission, cap + finalizeReserve on the cap-sized
      // account would double-count that carve-out and self-reject. The
      // hint itself exists because the default reserve prices the model's
      // FULL maxOutputTokens (about one dollar on strong tiers), pins
      // small run ceilings at zero remainder for the whole orchestration,
      // and every child spawn dies with a budget rejection (found live by
      // the M12 checkpoint: no orchestrated child was EVER admitted under
      // the case ceilings, both A/B arms measured a self-solving
      // orchestrator).
      ...(capState === undefined
        ? {}
        : {
            estCost: orchestratorAdmissionEstCostUsd(
              capState.effectiveCapUsd,
              // Both carve-outs already committed on the cap account net
              // out of the exact-fill hint: the finalize reserve and the
              // synthesis payload reserve (cycle 76), or the hint plus
              // the holds would overfill the account's own chain.
              orchestratorAccount === undefined
                ? 0
                : (internals.budget.accountView(orchestratorAccount)?.finalizeReserveUsd ?? 0) +
                    (internals.budget.accountView(orchestratorAccount)?.synthesisReserveUsd ?? 0),
            ),
          }),
      ...(opts?.model === undefined ? {} : { model: opts.model }),
      ...(opts?.limits === undefined ? {} : { limits: opts.limits }),
      [kOnRunning]: (seq: number) => {
        if (orchSeq !== undefined) {
          return;
        }
        orchSeq = seq;
        // Recovery completes before any tool executes; the tools gate
        // on recoveryDone.
        void recover().then(releaseRecovery, releaseRecovery);
      },
      [kTerminalTool]: {
        name: FINISH_TOOL_NAME,
        // With synthesis configured (RV-211) the coordination finish is
        // a DRAFT: the validators bind the synthesis finish instead,
        // because they must judge the FINAL output. The repair reserve
        // rides exactly with the validators, so a draft finish can
        // never spend it. With a draftPolicy declared (the v1.74
        // experiment review, P0.3), the DRAFT gate rides here instead,
        // and the same repair reserve grants coordination its own
        // per-rejected-exchange headroom. The extension finish gate
        // (RV3202) wraps whichever arm applies, gate first, and rides
        // alone when no validator arm does; the reserve still binds to
        // the validator arms only, because a gate refusal is mechanics
        // (a normal turn), never a repair.
        ...((): Record<string, unknown> => {
          const inner =
            validationSpec === undefined || opts?.synthesis !== undefined
              ? validationSpec?.draftPolicy !== undefined && opts?.synthesis !== undefined
                ? validateDraft
                : undefined
              : validateFinish;
          const reserve =
            inner === undefined || validationSpec?.repairTurnReserve === undefined
              ? {}
              : { repairTurnReserve: validationSpec.repairTurnReserve };
          const gated = withFinishGate(inner);
          return gated === undefined ? {} : { validate: gated, ...reserve };
        })(),
      },
      // Checkpoint lineage across root attempts (the v1.6.0 follow-up
      // review's mode (c) contract): a rerun after a cancelled root
      // (the budget abort mid-wait) boots from the prior attempt's last
      // turn-boundary checkpoint, so the restored transcript re-executes
      // its pending calls against the recovered decisions instead of
      // re-planning and re-paying from scratch. Cancelled agents
      // normally rerun from scratch because their tools may have
      // half-executed; the orchestration toolset is idempotent BY the
      // recovery maps, which is what makes the boot safe exactly here.
      // Errored attempts stay from-scratch (a poisoned transcript must
      // not replay), and without a saved boundary (first-turn
      // cancellation) nothing restores and at most one turn's decisions
      // existed.
      ...(() => {
        const priorCancelledRoot = internals.replayer
          .snapshot()
          .filter(
            (entry) =>
              entry.kind === 'agent' &&
              entry.scope === callingState.scope &&
              entry.status === 'cancelled' &&
              entry.checkpointRef !== undefined,
          )
          .at(-1);
        return priorCancelledRoot?.checkpointRef === undefined
          ? {}
          : { [kBootCheckpoint]: priorCancelledRoot.checkpointRef };
      })(),
    };
    const orchestratorState: CtxScopeState = { ...callingState };
    if (orchestratorAccount !== undefined) {
      orchestratorState.budgetScope = orchestratorAccount;
    }
    // The dynamic stage phase (RV3905, the fourth comparison
    // experiment): the run's byPhase read 100% 'unknown' while the
    // orchestrator's own stages were plainly separable, because
    // `costAttribution.phase` is stamped from the dispatch scope state
    // and the dynamic path never set one. Each engine-owned dispatch
    // now names its stage; an EXPLICIT host phase (a workflow that
    // wrapped ctx.orchestrate in ctx.phase) wins, so phase-wrapped
    // runs keep their buckets and only the vacuum is filled.
    orchestratorState.phase = orchestratorState.phase ?? 'coordination';
    // Without validators the break signal IS the forced finish signal,
    // byte identical to the pre RV-204 behavior.
    const loopBreakSignal =
      validationSpec === undefined
        ? forcedFinishController.signal
        : AbortSignal.any([forcedFinishController.signal, validationAbort.signal]);
    orchestratorState.signal =
      callingState.signal === undefined
        ? loopBreakSignal
        : AbortSignal.any([callingState.signal, loopBreakSignal]);

    /**
     * The reserved final wake: a FRESH agent entry on
     * the restricted single-tool toolset (a different toolsetHash), a
     * prompt deterministically derived from the journaled cap decision
     * and the pinned digest, and a finalizeTurns limit, paid from the
     * reserve. On its failure the engine writes
     * orchestrator_finalize_fallback and SYNTHESIZES a deterministic
     * partial result by pure fold, without a single LLM call. Both
     * arms settle the completion envelope (RV906): the finalizer's ok
     * wraps as { result, completion } and the synthesized fold names
     * itself partial, so every forced terminal carries its honesty
     * machine readably.
     */
    const runForcedFinish = async (): Promise<unknown> => {
      const capEntry = internals.replayer.snapshot().find((entry) => entry.seq === capDecisionRef);
      const capValue = capEntry?.value as
        { snapshot?: { planHash?: string; wakeOrdinal?: number } } | undefined;
      const finishOnly = buildOrchestratorTools(orchestratorRuntime, fullCardText).filter(
        (tool) => tool.name === FINISH_TOOL_NAME,
      );
      internals.cost.orchestrator.forcedFinish = true;
      /**
       * The journaled finalize effects roll forward (RV906): the
       * finalize terminal (stamped costAttribution.finalizeReserve,
       * strictly after the cap decision) and the fallback decision ARE
       * the cap's recorded effects, so a resume that finds either must
       * reuse it instead of paying a second dispatch. The prompt below
       * derives from the LIVE digest, whose spend folds and ordinals a
       * settled journal has moved past: re-deriving it on resume would
       * mint a fresh agent identity and re-pay the reserve on every
       * resume of an already settled capped run.
       */
      const fallbackKey = deriverV2.deriveKey({ kind: 'orchestrator-finalize-fallback' });
      const priorFallback = internals.replayer
        .snapshot()
        .find((entry) => entry.kind === 'decision' && entry.key === fallbackKey);
      const priorFinalize = internals.replayer
        .snapshot()
        .filter(
          (entry) =>
            entry.kind === 'agent' &&
            entry.scope === callingState.scope &&
            entry.seq > (capDecisionRef ?? -1) &&
            entry.status !== 'running' &&
            entry.costAttribution?.finalizeReserve === true,
        )
        .at(-1);
      const finalizeTurns = capState?.finalizeTurns ?? 2;
      const finalOpts: AgentOpts & InternalAgentHooks & { result: 'full' } = {
        role: 'orchestrate',
        result: 'full',
        tools: finishOnly,
        [kExposureWait]: true,
        limits: { maxTurns: finalizeTurns },
        // The finalize dispatch spends from the released reserve, so
        // that reserve is its admission worst case: the default hint
        // (full maxOutputTokens pricing) could refuse the very agent
        // the reserve exists to fund.
        ...(capState === undefined ? {} : { estCost: capState.finalizeReserveUsd }),
        ...(opts?.model === undefined ? {} : { model: opts.model }),
        // The declared finish validators bind the reserved finalizer
        // (RV906): a capped run's final output obeys the same declared
        // contract as any other finish (on capped runs synthesis never
        // runs, so this finish IS the final output the validators must
        // judge). A finish they reject never becomes the run value: the
        // finalizer exhausts its turns and the deterministic fallback
        // below settles the run. Without a declared contract the
        // dispatch keeps its exact historical bytes.
        [kTerminalTool]: {
          name: FINISH_TOOL_NAME,
          ...(validationSpec === undefined
            ? {}
            : {
                validate: validateFinish,
                ...(validationSpec.repairTurnReserve === undefined
                  ? {}
                  : { repairTurnReserve: validationSpec.repairTurnReserve }),
              }),
        },
        // Stamped into the terminal's cost attribution: the journal
        // fold derives reserveUsedUsd from it.
        [kFinalizeReserve]: true,
      };
      const runFinalizeDispatch = async (): Promise<AgentResult<unknown>> => {
        if (orchestratorAccount !== undefined) {
          // The finalize dispatch draws FROM the reserve (DEF-7): stop
          // subtracting it from the remainder now that it is being
          // spent.
          internals.budget.releaseFinalizeReserve(orchestratorAccount);
        }
        const finalState: CtxScopeState = { ...callingState };
        if (orchestratorAccount !== undefined) {
          finalState.budgetScope = orchestratorAccount;
        }
        // The forced-finish wake is a coordination turn (RV3905): it
        // spends the finalize reserve of the SAME loop it concludes.
        finalState.phase = finalState.phase ?? 'coordination';
        const digest = buildDigest(wakeOrdinal);
        const reserveBaseline =
          orchestratorAccount === undefined
            ? 0
            : (internals.budget.accountView(orchestratorAccount)?.spentUsd ?? 0);
        const dispatched = await runtime.runInScope(finalState, () =>
          (ctx.agent as (prompt: string, o?: unknown) => Promise<AgentResult<unknown>>)(
            [
              'The orchestrator budget cap was reached (decision entry ' +
                `${String(capDecisionRef ?? -1)}). The plan is frozen; admitted work has ` +
                'settled. Produce the FINAL result of the run from the digest below by ' +
                'calling finish({ result }) EXACTLY once. No other tool exists.',
              `PLAN HASH: ${capValue?.snapshot?.planHash ?? ''}`,
              `DIGEST: ${JSON.stringify(digest)}`,
            ].join('\n'),
            finalOpts,
          ),
        );
        if (orchestratorAccount !== undefined) {
          const view = internals.budget.accountView(orchestratorAccount);
          internals.cost.orchestrator.spentUsd = view?.spentUsd ?? 0;
          internals.cost.orchestrator.reserveUsedUsd = Math.max(
            0,
            (view?.spentUsd ?? 0) - reserveBaseline,
          );
        }
        return dispatched;
      };
      // The recorded effect wins over a fresh dispatch: a restored
      // terminal replays its journaled value (and a restored fallback
      // replays as the non-ok arm below), with zero paid calls and no
      // reserve mutation, because the journal fold already carries the
      // spend and the reserveUsedUsd attribution.
      const final: {
        status: string;
        output: unknown;
        turns: number;
        error?: { kind?: string };
      } =
        priorFinalize !== undefined || priorFallback !== undefined
          ? {
              status: priorFinalize?.status ?? 'limit',
              // An ok finish whose result was exactly null journals no
              // value; null restores the live envelope byte for byte.
              output: priorFinalize?.value ?? null,
              turns: (priorFallback?.value as { turnsUsed?: number } | undefined)?.turnsUsed ?? 0,
            }
          : await runFinalizeDispatch();
      if (final.status === 'ok') {
        // The honest completion of a forced finish (RV906): the value
        // is the completion envelope, and the literal is 'partial'
        // UNLESS the finish provably passed the FULL declared contract.
        // The proof is the journaled accepted validation decision of
        // the finalize dispatch (strictly after the cap decision, in
        // this scope), so a resume recomputes the identical claim from
        // the journal, and a journal written before the validators
        // bound this path honestly stays 'partial'. A declared
        // acceptance policy is never judged at the cap, so with one
        // declared the full contract is unproven and the terminal
        // stays 'partial'; with nothing declared there is no proof of
        // completeness at all.
        const contractComplete =
          validationSpec !== undefined &&
          opts?.acceptance === undefined &&
          internals.replayer
            .snapshot()
            .some(
              (entry) =>
                entry.kind === 'decision' &&
                entry.scope === callingState.scope &&
                entry.seq > (capDecisionRef ?? -1) &&
                (entry.value as { decisionType?: string } | undefined)?.decisionType ===
                  'orchestrator_finish_validation' &&
                (entry.value as { verdict?: string }).verdict === 'accepted',
            );
        return {
          result: final.output,
          completion: contractComplete ? 'complete' : 'partial',
        };
      }
      const reason =
        final.error?.kind === 'schema-mismatch'
          ? 'schema-exhausted'
          : final.error?.kind === 'budget'
            ? 'ceiling-abort'
            : 'turns-exhausted';
      if (
        !internals.replayer
          .snapshot()
          .some((entry) => entry.kind === 'decision' && entry.key === fallbackKey)
      ) {
        await internals.replayer.appendSinglePhase({
          scope: callingState.scope,
          key: fallbackKey,
          kind: 'decision',
          status: 'ok',
          spanId: internals.spans.mint(callingState.spanId),
          site: 'orchestrator-budget',
          value: {
            decisionType: 'orchestrator_finalize_fallback',
            reason,
            turnsUsed: final.turns,
            foldParams: {
              planHash: capValue?.snapshot?.planHash ?? '',
              digestOrdinalMax: wakeOrdinal,
            },
          },
        });
      }
      // The synthesized partial: a pure fold over the settled records
      // and the frozen plan snapshot; exhaustion is never null, and the
      // fold names itself partial (RV906) so the exhausted terminal
      // lifts the same honest literal as the finalizer's envelope.
      internals.budget.markExhausted();
      return {
        forcedFinishFallback: true,
        completion: 'partial',
        planHash: capValue?.snapshot?.planHash ?? '',
        completed: [...byOrdinal.values()]
          .filter((record) => record.settled !== undefined)
          .sort((a, b) => a.spawnOrdinal - b.spawnOrdinal)
          .map((record) => digestOf(record, record.settled as AgentResult<unknown>)),
      };
    };

    /**
     * One incremental synthesis note (RV-211 remainder): a FRESH agent
     * entry with role 'synthesize' on the finish-only toolset whose
     * prompt derives deterministically from the goal and the ONE settled
     * child's digest, so a resume replays it by identity with zero paid
     * calls. The invocation itself never throws out of here: an infra
     * failure settles as a synthesized error result and the
     * reconciliation falls back to the raw digest summary.
     */
    const runSynthesisNote = async (record: SpawnRecord): Promise<AgentResult<unknown>> => {
      const spec = opts?.synthesis as OrchestrateSynthesis;
      const finishOnly = buildOrchestratorTools(orchestratorRuntime, fullCardText).filter(
        (tool) => tool.name === FINISH_TOOL_NAME,
      );
      const digest = digestOf(record, record.settled as AgentResult<unknown>);
      const prompt = [
        'You are an incremental synthesis note of an orchestrated run. Digest the SINGLE ' +
          'settled child below into a self-contained note for the final deterministic ' +
          'reconciliation by calling finish({ result }) EXACTLY once, where result is a ' +
          'STRING. Preserve concrete evidence and citations; do not invent findings. No ' +
          'other tool exists.',
        ...(spec.instructions === undefined ? [] : [spec.instructions]),
        `GOAL: ${goal}`,
        `CHILD: ${JSON.stringify(digest)}`,
      ].join('\n');
      const noteState: CtxScopeState = { ...callingState };
      if (orchestratorAccount !== undefined) {
        noteState.budgetScope = orchestratorAccount;
      }
      // Incremental notes are synthesis machinery (RV3905): they fold
      // with the composition they feed, not with the loop they ride.
      noteState.phase = noteState.phase ?? 'composition';
      const noteOpts: AgentOpts & InternalAgentHooks & { result: 'full' } = {
        role: 'synthesize',
        result: 'full',
        // The engine labels its own dispatch (RV2901): policy, never
        // identity, and what keeps the offline split honest instead of
        // refused on every journal this engine writes.
        label: SYNTHESIS_NOTE_LABEL,
        tools: finishOnly,
        limits: spec.noteLimits ?? { maxTurns: DEFAULT_SYNTHESIS_NOTE_MAX_TURNS },
        ...(spec.model === undefined ? {} : { model: spec.model }),
        ...(spec.effort === undefined ? {} : { effort: spec.effort }),
        ...(spec.estCost === undefined ? {} : { estCost: spec.estCost }),
        [kTerminalTool]: { name: FINISH_TOOL_NAME },
      };
      return runtime
        .runInScope(noteState, () =>
          (ctx.agent as (prompt: string, o?: unknown) => Promise<AgentResult<unknown>>)(
            prompt,
            noteOpts,
          ),
        )
        .then((settled) => {
          // Settled spans only (RV3004): the ensureSynthesisNote catch
          // arm synthesizes an unjournaled error result, which must
          // never enter the SO FAR fold.
          noteInternalSettle(settled);
          return settled;
        });
    };

    /**
     * Note dispatch is idempotent per child: the settle hook and the
     * reconciliation both come through here, and the map guarantees one
     * dispatch per nodeId (a concurrent identical dispatch would mint a
     * second occurrence and PAY twice: the v1.32.0 lesson).
     */
    const ensureSynthesisNote = (record: SpawnRecord): Promise<AgentResult<unknown>> => {
      const existing = synthesisNotes.get(record.nodeId);
      if (existing !== undefined) {
        return existing;
      }
      const note = runSynthesisNote(record).catch((thrown: unknown): AgentResult<unknown> => ({
        status: 'error',
        output: null,
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        costUsd: 0,
        costBasis: 'per-call',
        turns: 0,
        servedBy: 'unknown:unknown',
        transcriptRef: '',
        errorMessage: thrown instanceof Error ? thrown.message : String(thrown),
      }));
      synthesisNotes.set(record.nodeId, note);
      return note;
    };
    if (opts?.synthesis?.mode === 'incremental' && capDecisionRef === undefined) {
      // Install the settle-hook dispatcher (declared before dispatchChild
      // so recovered settle hooks never hit a TDZ). A run that booted at
      // the cap never installs it: the cap settle path never reconciles,
      // so eager notes would be pure waste.
      synthesisNoteDispatcher = ensureSynthesisNote;
    }

    /**
     * The deterministic reconciliation of 'incremental' synthesis: the
     * final result is a PURE fold of the journaled draft and the note
     * results in spawn order, never another model call. A note that died
     * falls back to the child's raw digest summary under a journaled
     * per-child decision and a warn log. With dedupeClaims, repeated
     * claim lines keep their first occurrence and the envelope carries
     * the repeatedClaims index.
     */
    const reconcileIncremental = async (
      draft: unknown,
      spec: OrchestrateSynthesis,
    ): Promise<IncrementalSynthesisResult> => {
      synthesisSettleFrozen = true;
      const settledRecords = [...byOrdinal.values()]
        .filter((record) => record.settled !== undefined)
        .sort((a, b) => a.spawnOrdinal - b.spawnOrdinal);
      const sections: IncrementalSynthesisResult['sections'] = [];
      for (const record of settledRecords) {
        const settled = record.settled as AgentResult<unknown>;
        const note = await ensureSynthesisNote(record);
        let noteText: string;
        if (note.status === 'ok') {
          noteText =
            typeof note.output === 'string' ? note.output : JSON.stringify(note.output ?? null);
        } else {
          const fallbackKey = deriverV2.deriveKey({
            kind: 'orchestrator-synthesis-note-fallback',
            nodeId: record.nodeId,
          });
          if (
            !internals.replayer
              .snapshot()
              .some((entry) => entry.kind === 'decision' && entry.key === fallbackKey)
          ) {
            await internals.replayer.appendSinglePhase({
              scope: callingState.scope,
              key: fallbackKey,
              kind: 'decision',
              status: 'ok',
              spanId: internals.spans.mint(callingState.spanId),
              site: 'orchestrator-synthesis',
              value: {
                decisionType: 'orchestrator_synthesis_note_fallback',
                nodeId: record.nodeId,
                status: note.status,
                turnsUsed: note.turns,
              },
            });
          }
          internals.events.emit(
            {
              type: 'log',
              level: 'warn',
              msg:
                `the synthesis note for child '${record.nodeId}' terminated with status ` +
                `'${note.status}'; falling back to the raw digest summary (journaled ` +
                "decision 'orchestrator_synthesis_note_fallback')",
            },
            callingState.spanId,
          );
          noteText = digestOf(record, settled).outputSummary;
        }
        sections.push({
          nodeId: record.nodeId,
          logicalTaskId: record.logicalTaskId,
          status: settled.status,
          noteStatus: note.status,
          note: noteText,
        });
      }
      let repeatedClaims: RepeatedClaim[] | undefined;
      if (spec.dedupeClaims === true) {
        const deduped = dedupeRepeatedClaims(
          sections.map((section) => ({ nodeId: section.nodeId, text: section.note })),
        );
        const textByNode = new Map(deduped.rows.map((row) => [row.nodeId, row.text]));
        for (const section of sections) {
          section.note = textByNode.get(section.nodeId) ?? section.note;
        }
        repeatedClaims = deduped.repeated;
      }
      const draftJson = JSON.stringify(draft ?? null);
      internals.events.emit(
        {
          type: 'log',
          level: 'debug',
          msg: 'orchestrator synthesis reconciliation',
          data: {
            children: sections.length,
            draftChars: draftJson.length,
            notesChars: sections.reduce((sum, section) => sum + section.note.length, 0),
            perChild: sections.map((section) => ({
              nodeId: section.nodeId,
              chars: section.note.length,
            })),
            ...(repeatedClaims === undefined ? {} : { repeatedClaims: repeatedClaims.length }),
          },
        },
        callingState.spanId,
      );
      return {
        synthesis: 'incremental',
        draft,
        sections,
        ...(repeatedClaims === undefined ? {} : { repeatedClaims }),
      };
    };

    /**
     * The post-fan-in synthesis invocation (RV-211): a FRESH agent entry
     * with role 'synthesize' on the finish-only toolset (a distinct
     * toolsetHash, the reserved-finalizer precedent), its prompt derived
     * deterministically from the goal, the journaled coordination draft,
     * and the settled child digest, so a resume replays it by identity
     * with zero paid calls. Runs strictly AFTER the acceptance verdict
     * (a rejected run never pays for synthesis; in 'incremental' mode
     * the per-child notes are paid DURING the run, so only the
     * reconciliation itself is deferred) and owns the finish validators
     * when they are configured. Failure posture: with validators the run
     * fails typed (the validated path is mandatory); without them the
     * run falls back to the draft under a journaled decision and a warn
     * log, never silently.
     */
    /**
     * The reserve lifecycle snapshot (RV304 second half, the seventh
     * comparison experiment review, P1.7): configured is the declared
     * hold, held what actually registered on the cap account (zero when
     * no cap resolved and the config was silently inert), released
     * what the synthesis dispatch freed, remainingBeforeSynthesisUsd
     * the chain headroom the invocation saw right after the release,
     * and consumedUsd its own priced spend. Frozen into a journaled
     * decision at first completion, so a resume reports the identical
     * facts; absent everywhere when no reserve is configured.
     */
    let synthesisReserveLifecycle:
      | {
          configuredUsd: number;
          heldUsd: number;
          releasedUsd: number;
          remainingBeforeSynthesisUsd?: number;
          consumedUsd?: number;
        }
      | undefined;
    /**
     * Set exactly when the RV510 gate skipped the synthesis span (live
     * pass and resume roll-forward alike); the acceptance envelope
     * reports the machine reason through it.
     */
    let synthesisSkippedByValidDraft = false;
    /**
     * The journal seq of the skip decision that carried the RV510 gate
     * (RV2506): the addressable provenance of the artifact a skipped
     * run settles on, since a skipped synthesis leaves no accepted
     * finish-validation decision behind and the draft's acceptance
     * lives in the skip entry instead.
     */
    let synthesisSkipDecisionRef: number | undefined;

    /**
     * The orchestration's own settled internal spans so far (RV3004):
     * the coordination dispatch, claim judges, synthesis notes, and
     * settled compositions, folded through
     * {@link executionFactsOf} in dispatch order the moment each
     * settles. Replay-stable by the same argument as the RUN FACTS
     * child line: every ingredient restores verbatim from the journal
     * and the settle order is deterministic, so a resumed composition
     * re-derives identical SO FAR bytes. A dispatch that never settled
     * (a declined judge admission, a crash) contributes nothing, which
     * is RV1209, not an undercount.
     */
    const internalSpansSoFar = {
      spans: 0,
      wireRequests: 0,
      wireIdsMissing: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
    const noteInternalSettle = (settled: AgentResult<unknown>): void => {
      const facts = executionFactsOf(settled);
      internalSpansSoFar.spans += 1;
      internalSpansSoFar.wireRequests += facts.wireRequests;
      internalSpansSoFar.wireIdsMissing += facts.wireIdsMissing;
      internalSpansSoFar.inputTokens += facts.inputTokens;
      internalSpansSoFar.outputTokens += facts.outputTokens;
    };
    /**
     * The bounded contradiction pass's findings (RV1302), set exactly
     * when the pass is configured: an EMPTY array is a fact (the pass
     * ran and the pool agreed) and `undefined` is a different fact
     * (nothing looked), which is why the envelope distinguishes them.
     */
    let contradictionsFound: Contradiction[] | undefined;
    /** Set beside {@link contradictionsFound}, always as a pair (RV1404). */
    let contradictionsMeta: OrchestrateContradictionsMeta | undefined;
    /**
     * The claim-consistency findings (RV1502): undefined until the pass
     * ran (or when it is not configured), an array once the judge ruled
     * (empty = every pair cleared), and left undefined with
     * `claimConsistencyMeta.judgeFailed` when the judge invocation did
     * not settle ok, because an empty list would claim the pool agreed.
     */
    let claimFindingsFound: ClaimContradictionFinding[] | undefined;
    /**
     * The observed price of this run's own latest post draft claim
     * judge pass (RV3701): the fallback sizing of the repair round's
     * convergence hold when the host declared no `judge.estCost`. By
     * the time the bounded round can dispatch, a post draft pass has
     * always settled (the round's findings came from it), so the
     * fallback is this run's own money, never an invented constant.
     */
    let observedFinalJudgeCostUsd: number | undefined;
    /** Set whenever the pass ran, findings or not (the RV1404 pairing). */
    let claimConsistencyMeta: OrchestrateClaimConsistencyMeta | undefined;
    /**
     * Which document the claim-consistency pass judges (RV2509),
     * default `'draft'`: the historical ordering, byte for byte.
     */
    const claimStage = opts?.claimConsistency?.stage ?? 'draft';
    /**
     * Under `stage: 'both'` the pre-synthesis verdict, kept beside the
     * final one (RV2509): `claimConsistencyMeta` reports the SHIPPED
     * document because that is what a consumer gates on, and the draft
     * verdict is the record of the gate that let the synthesis run.
     */
    let claimConsistencyDraftMeta: OrchestrateClaimConsistencyMeta | undefined;
    /**
     * The salvage arms the acceptance decision counted (RV1403), set on
     * the accepted path AFTER the decision, fresh or rolled forward
     * from the journal, so live and resume read the same lists; a
     * floor-blocked child never entered them. Undefined when no
     * acceptance is configured.
     */
    let acceptedSalvage:
      | { partial: readonly string[]; output: readonly string[]; excludedOk: readonly string[] }
      | undefined = undefined;
    /**
     * The nodeIds the acceptance decision counted as successes (RV1403):
     * ok children plus both salvage arms. Derived LAZILY because the ok
     * children come from `byOrdinal`, which the async recovery rebuilds
     * on a replayed root: every caller first awaits `recoveryDone`,
     * exactly like the synthesis prompt fold. Undefined without
     * acceptance, in which case the pools fall back to the ok children.
     * An ok child the binding evidence floor excluded from the policy
     * count (RV1412) is excluded here too, from the DECISION's own
     * roster rows (`floorRequired` on an ok row), so live and resume
     * derive the same pool: a reading the policy refused to count must
     * not steer what composes the result, exactly the RV1403 line.
     */
    const acceptedRosterNow = (): ReadonlySet<string> | undefined => {
      if (acceptedSalvage === undefined) {
        return undefined;
      }
      const roster = new Set<string>();
      for (const record of byOrdinal.values()) {
        if (record.settled?.status === 'ok') {
          roster.add(record.nodeId);
        }
      }
      for (const node of acceptedSalvage.excludedOk) {
        roster.delete(node);
      }
      for (const node of acceptedSalvage.partial) {
        roster.add(node);
      }
      for (const node of acceptedSalvage.output) {
        roster.add(node);
      }
      return roster;
    };
    /**
     * Folds the settled evidence pool through {@link findContradictions}
     * at the post-fan-in chokepoint: after the accepted acceptance
     * verdict and BEFORE any synthesis dispatch, so the 'fail' posture
     * never pays to have a disagreement composed away. Journals nothing:
     * the fold is pure over the settled children the journal replays
     * verbatim, so a resume re-derives the identical finding (the
     * dedupeClaims / policyFacts / evidenceIndex precedent).
     */
    const runContradictionPass = async (snapshot?: Record<string, Json>): Promise<void> => {
      const dispute = opts?.contradictions;
      if (dispute === undefined) {
        return;
      }
      // A REPLAYED root returns before the async recovery has rebuilt
      // `records`, exactly like the synthesis prompt fold below.
      await recoveryDone;
      const acceptedRoster = acceptedRosterNow();
      const pool: ContradictionSource[] = [];
      for (const record of [...byOrdinal.values()].sort(
        (a, b) => a.spawnOrdinal - b.spawnOrdinal,
      )) {
        const settled = record.settled;
        if (settled === undefined) {
          continue;
        }
        // The ACCEPTED roster exactly (RV1403): with an acceptance
        // decision on record, membership is what the decision counted,
        // ok children plus both salvage arms, so a structured partial
        // the policy accepted can dispute the pool and a floor-blocked
        // child never can; without acceptance, the ok children. A dead
        // child's error text is not evidence either way.
        const accepted =
          acceptedRoster === undefined
            ? settled.status === 'ok'
            : acceptedRoster.has(record.nodeId);
        if (!accepted) {
          continue;
        }
        pool.push({ nodeId: record.nodeId, text: serializeChildOutput(settled) });
      }
      // One group past the bound is probed for deliberately (RV1404):
      // the fold caps at `max`, and a result AT the cap would otherwise
      // be indistinguishable from a complete one, so the report could
      // never say it truncated.
      const limit = dispute.max ?? DEFAULT_MAX_CONTRADICTIONS;
      const found = findContradictions(pool, {
        ...(dispute.pattern === undefined ? {} : { pattern: dispute.pattern }),
        max: limit + 1,
      });
      const truncated = found.length > limit;
      contradictionsFound = truncated ? found.slice(0, limit) : found;
      contradictionsMeta = { poolChildren: pool.length, truncated };
      const onFound = dispute.onFound ?? 'report';
      internals.events.emit(
        {
          type: 'log',
          level: contradictionsFound.length === 0 ? 'debug' : 'info',
          msg: 'orchestrator contradiction pass',
          data: {
            children: pool.length,
            contradictions: contradictionsFound.length,
            truncated,
            onFound,
            anchors: contradictionsFound.map((entry) => entry.anchor),
          },
        },
        callingState.spanId,
      );
      if (onFound !== 'fail' || contradictionsFound.length === 0) {
        return;
      }
      const named = contradictionsFound;
      throw new FailRunError(
        `the orchestrator contradiction pass found ${String(named.length)} contradiction` +
          `${named.length === 1 ? '' : 's'} in the settled child pool: ` +
          named
            .map(
              (entry) =>
                `${entry.anchor} is read differently for '${entry.key}' (` +
                `${entry.claims.map((claim) => JSON.stringify(claim.value)).join(' vs ')})`,
            )
            .join('; '),
        {
          data: {
            source: 'orchestrator_contradictions',
            contradictions: named as unknown as Json,
            contradictionsMeta: contradictionsMeta as unknown as Json,
            // The acceptance snapshot the run already earned (cycle 73):
            // the fan-out work IS complete, the failure is downstream.
            ...(snapshot ?? {}),
          },
        },
      );
    };

    /**
     * The claim-consistency pass (RV1501/RV1502): pairs the accepted
     * draft's citing sentences with the settled pool (a pure fold,
     * free) and lets ONE bounded judge invocation rule on the pairs.
     * Sits at the same post-fan-in chokepoint as the contradiction
     * pass, strictly AFTER it (the pure fold fails first, so a
     * self-contradicting pool never pays for the judge) and BEFORE any
     * synthesis dispatch. The judge is an ordinary journaled agent
     * entry, so a resume replays the verdict with zero paid calls and
     * this pass journals nothing of its own.
     */
    const runClaimConsistencyPass = async (
      draft: unknown,
      snapshot?: Record<string, Json>,
      stage: 'draft' | 'final' = 'draft',
    ): Promise<void> => {
      const spec = opts?.claimConsistency;
      if (spec === undefined) {
        return;
      }
      // A REPLAYED root returns before the async recovery has rebuilt
      // `records`, exactly like the contradiction pass above.
      await recoveryDone;
      const acceptedRoster = acceptedRosterNow();
      const pool: ContradictionSource[] = [];
      let poolChildren = 0;
      // The run-facts sheet raw material (RV1603), folded from the same
      // accepted roster the pool reads: deterministic per-child rows
      // plus the trigger vocabularies (minted ids and recorded values).
      const factRows: string[] = [];
      const factIds: string[] = [internals.runId];
      const factNumbers: number[] = [];
      let factWires = 0;
      let factInput = 0;
      let factOutput = 0;
      for (const record of [...byOrdinal.values()].sort(
        (a, b) => a.spawnOrdinal - b.spawnOrdinal,
      )) {
        const settled = record.settled;
        if (settled === undefined) {
          continue;
        }
        // The ACCEPTED roster exactly, the contradiction pass's own
        // membership rule (RV1403): what the decision counted, ok
        // children plus both salvage arms; without acceptance, the ok
        // children. A dead child's error text is not evidence. Named
        // `inPool` (not `accepted`) so the contradiction pass keeps the
        // only occurrence of its own doctrine bytes.
        const inPool =
          acceptedRoster === undefined
            ? settled.status === 'ok'
            : acceptedRoster.has(record.nodeId);
        if (!inPool) {
          continue;
        }
        poolChildren += 1;
        pool.push({ nodeId: record.nodeId, text: serializeChildOutput(settled) });
        // The recorded evidence entries of the same child (the RV1501
        // entries plumbing): a second pool source per accepted child,
        // one sentence per entry with its citation in the anchor
        // syntax, so the draft pairs against what the child RECORDED
        // even when its composed output paraphrases it away. Restored
        // from the terminal on resume, so live and resumed pools pair
        // identically.
        const recorded = settled.evidenceEntries ?? [];
        if (recorded.length > 0) {
          pool.push({
            nodeId: record.nodeId,
            text: recorded
              .map(
                (entry) =>
                  `${entry.claim.replace(/\.\s*$/u, '')}` +
                  `${entry.citation === undefined ? '' : ` (\`${entry.citation}\`)`}.`,
              )
              .join(' '),
          });
        }
        if (spec.runFacts === true) {
          const facts = executionFactsOf(settled);
          factRows.push(
            `Child ${record.nodeId} settled '${settled.status}' with ` +
              `${String(recorded.length)} recorded evidence entries and ` +
              `${String(facts.wireRequests)} wire requests.`,
          );
          factIds.push(record.nodeId);
          factNumbers.push(recorded.length, facts.wireRequests);
          factWires += facts.wireRequests;
          factInput += facts.inputTokens;
          factOutput += facts.outputTokens;
        }
      }
      const draftText = typeof draft === 'string' ? draft : JSON.stringify(draft ?? null);
      const fold = pairDraftClaims(draftText, pool, {
        ...(spec.pattern === undefined ? {} : { pattern: spec.pattern }),
        max: spec.max ?? DEFAULT_MAX_CLAIM_PAIRS,
        ...(spec.maxPoolPerPair === undefined ? {} : { maxPoolPerPair: spec.maxPoolPerPair }),
        ...(spec.maxExcerptChars === undefined ? {} : { maxExcerptChars: spec.maxExcerptChars }),
        ...(spec.critical === undefined ? {} : { critical: spec.critical }),
        // The declared coverage target (RV2903) sizes the selection
        // coverage-first; without it the historical first-max pairing
        // reproduces byte for byte.
        ...(spec.coverageTarget === undefined ? {} : { targetCoverageShare: spec.coverageTarget }),
      });
      const runFold =
        spec.runFacts === true
          ? pairRunFactClaims(
              draftText,
              {
                text:
                  `The run ${internals.runId} made ${String(factWires)} provider wire ` +
                  `requests across ${String(poolChildren)} accepted children, with token ` +
                  `totals ${String(factInput)} input and ${String(factOutput)} output ` +
                  `(the run's own recorded execution facts; harness-observed, not ` +
                  `production evidence). ${factRows.join(' ')}`,
                ids: factIds,
                numbers: [...factNumbers, factWires, factInput, factOutput],
              },
              {
                ...(spec.runFactTerms === undefined ? {} : { terms: spec.runFactTerms }),
                ...(spec.maxExcerptChars === undefined
                  ? {}
                  : { maxExcerptChars: spec.maxExcerptChars }),
                // Under a declared coverage target (RV2903) the
                // run-fact pass judges EVERY matched candidate: the
                // ninth comparison run cut 30 candidates to the
                // default 8 with no way to raise the bound.
                ...(spec.coverageTarget === undefined ? {} : { max: Number.MAX_SAFE_INTEGER }),
              },
            )
          : undefined;
      const allPairs = runFold === undefined ? fold.pairs : [...fold.pairs, ...runFold.pairs];
      const onFound = spec.onFound ?? 'report';
      const metaBase = {
        // Children, not pool sources: the entries source of a child does
        // not double-count it.
        poolChildren,
        draftCitingSentences: fold.draftCitingSentences,
        pairs: allPairs.length,
        truncated: fold.truncated,
        coveredCitingSentences: fold.coveredCitingSentences,
        ...(spec.coverageTarget === undefined ? {} : { coverageTarget: spec.coverageTarget }),
        ...(fold.criticalUncovered === undefined
          ? {}
          : {
              criticalUncovered: fold.criticalUncovered,
              criticalUncoveredTotal: fold.criticalUncoveredTotal ?? 0,
            }),
        ...(runFold === undefined
          ? {}
          : {
              runFactPairs: runFold.pairs.length,
              ...(runFold.truncated ? { runFactPairsTruncated: true as const } : {}),
              // The uncapped matched count (RV1809): the run-fact
              // coverage ratio's denominator, on the meta itself.
              runFactCandidates: runFold.candidates,
            }),
        ...((): { lowCoverage?: OrchestrateClaimConsistencyMeta['lowCoverage'] } => {
          // The declared coverage floors (RV1809), computed from the
          // FOLD alone (covered sentences are a pairing fact, not a
          // judge verdict), so the gate below can fire before the
          // judge pays. A zero denominator is vacuous and never trips.
          // A declared coverage target IS a floor when none is set
          // explicitly (RV2903): the same number that sized the pass
          // judges what it reached, so an unreachable target under
          // the hard `max` ceiling surfaces here instead of passing
          // as an honest-but-unenforced 'partial'.
          const coverageFloor = spec.minimumCoverageRatio ?? spec.coverageTarget;
          const coverageRatio =
            fold.draftCitingSentences === 0
              ? 1
              : fold.coveredCitingSentences / fold.draftCitingSentences;
          const runFactRatio =
            runFold === undefined || runFold.candidates === 0
              ? undefined
              : runFold.pairs.length / runFold.candidates;
          const belowCoverage =
            coverageFloor !== undefined &&
            fold.draftCitingSentences > 0 &&
            coverageRatio < coverageFloor;
          const belowRunFacts =
            spec.runFactCoverageRatio !== undefined &&
            runFactRatio !== undefined &&
            runFactRatio < spec.runFactCoverageRatio;
          if (!belowCoverage && !belowRunFacts) {
            return {};
          }
          return {
            lowCoverage: {
              coverageRatio,
              ...(coverageFloor === undefined ? {} : { coverageFloor }),
              ...(runFactRatio === undefined ? {} : { runFactRatio }),
              ...(spec.runFactCoverageRatio === undefined
                ? {}
                : { runFactFloor: spec.runFactCoverageRatio }),
            },
          };
        })(),
      };
      // Every assembly of the meta carries the grade (RV1702): the
      // derivation runs over the finished bare meta, so the four exit
      // paths below cannot disagree with a consumer re-deriving it.
      const finishMeta = (flags: {
        judgeInvoked: boolean;
        judgeFailed?: true;
        judgeDeclined?: true;
        findings?: number;
      }): OrchestrateClaimConsistencyMeta => {
        const bare = { ...metaBase, ...flags };
        // The provenance of the verdict (RV2509), stamped at the one
        // assembly every exit path passes through: WHICH document this
        // meta read, and its hash, so a grade rendered over a draft the
        // synthesis then replaced can never be read as a claim about
        // the shipped artifact.
        return {
          ...bare,
          coverage: claimCoverageOf(bare),
          judgedStage: stage,
          judgedHash: createHash('sha256')
            .update(jcsSerialize(draft ?? null), 'utf8')
            .digest('hex'),
        };
      };
      // The low-coverage gate (RV1809) fires BEFORE the judge
      // dispatch, exactly like the uncovered-critical gate below: a
      // run that cannot meet its declared verification floor never
      // pays for a partial verdict.
      if (spec.onLowCoverage === 'fail' && metaBase.lowCoverage !== undefined) {
        claimConsistencyMeta = finishMeta({ judgeInvoked: false });
        const low = metaBase.lowCoverage;
        throw new FailRunError(
          `the claim-consistency pass is below a declared coverage floor ` +
            `(coverage ${low.coverageRatio.toFixed(3)}` +
            (low.coverageFloor === undefined ? '' : ` under floor ${String(low.coverageFloor)}`) +
            (low.runFactRatio === undefined
              ? ''
              : `; run facts ${low.runFactRatio.toFixed(3)}` +
                (low.runFactFloor === undefined
                  ? ''
                  : ` under floor ${String(low.runFactFloor)}`)) +
            '), and the armed onLowCoverage posture cannot pass the draft',
          {
            data: {
              source: 'orchestrator_claim_consistency',
              lowCoverage: low as unknown as Json,
              claimConsistencyMeta: claimConsistencyMeta as unknown as Json,
              ...(snapshot ?? {}),
            },
          },
        );
      }
      // The uncovered-critical gate (RV1603) fires BEFORE the judge
      // dispatch: a run whose declared claims cannot be verified never
      // pays for a partial verdict.
      if (
        spec.onUncoveredCritical === 'fail' &&
        fold.criticalUncovered !== undefined &&
        fold.criticalUncovered.length > 0
      ) {
        claimConsistencyMeta = finishMeta({ judgeInvoked: false });
        throw new FailRunError(
          `the claim-consistency pass left ${String(fold.criticalUncoveredTotal ?? 0)} critical ` +
            `draft anchor(s) unjudged (${fold.criticalUncovered.join(', ')}), and the armed ` +
            'onUncoveredCritical posture cannot pass the draft',
          {
            data: {
              source: 'orchestrator_claim_consistency',
              criticalUncovered: fold.criticalUncovered,
              claimConsistencyMeta: claimConsistencyMeta as unknown as Json,
              ...(snapshot ?? {}),
            },
          },
        );
      }
      const announce = (): void => {
        internals.events.emit(
          {
            type: 'log',
            level: (claimFindingsFound?.length ?? 0) === 0 ? 'debug' : 'info',
            msg: 'orchestrator claim consistency pass',
            data: {
              children: poolChildren,
              pairs: allPairs.length,
              findings: claimFindingsFound?.length ?? 0,
              truncated: fold.truncated,
              onFound,
              judgeInvoked: claimConsistencyMeta?.judgeInvoked ?? false,
              ...(claimConsistencyMeta?.judgeFailed === true ? { judgeFailed: true } : {}),
            },
          },
          callingState.spanId,
        );
      };
      if (allPairs.length === 0) {
        // Nothing to judge is a verdict of its own: the fold looked and
        // paired nothing, and no judge invocation is ever dispatched.
        claimFindingsFound = [];
        claimConsistencyMeta = finishMeta({ judgeInvoked: false });
        announce();
        return;
      }
      const judgePrompt = [
        'You are the claim-consistency judge of an orchestrated run. Each PAIR below holds ' +
          'one sentence of the COMPOSED DRAFT beside the settled child sentences citing an ' +
          'intersecting span of the same file. Report ONLY real contradictions: a pair whose ' +
          'draft sentence asserts about the cited location something a pool reading denies ' +
          '(an inverted behavior, a negated default, a different value). Restating, ' +
          'summarizing, or narrowing a reading is NOT a contradiction. Answer with ' +
          '{ contradictions: [{ pair, reason }] }: pair is the zero-based PAIR index and ' +
          'reason is one short sentence naming the disagreement; an empty array means every ' +
          'pair agrees.',
        // The run-facts instruction rides ONLY when such pairs exist, so
        // an unconfigured (or unmatched) pass derives byte-identical
        // prompts (prompt bytes are journal identity on resume).
        ...(runFold !== undefined && runFold.pairs.length > 0
          ? [
              "Pairs anchored '(run-facts)' hold the run's own recorded execution facts as " +
                'the pool reading. A draft sentence asserting something those facts deny (a ' +
                'count outside the recorded values, a negation of recorded activity) is a ' +
                'contradiction on the same terms.',
            ]
          : []),
        `PAIRS: ${JSON.stringify(
          allPairs.map((pair, index) => ({
            pair: index,
            anchor: pair.anchor,
            draft: pair.draftExcerpt,
            pool: pair.pool,
          })),
        )}`,
      ].join('\n');
      const judgeState: CtxScopeState = { ...callingState };
      if (orchestratorAccount !== undefined) {
        judgeState.budgetScope = orchestratorAccount;
      }
      // Both judge passes fold under one stage (RV3905): the labels
      // already split draft from final where a reader needs it.
      judgeState.phase = judgeState.phase ?? 'judge';
      const judgeOpts: AgentOpts & { result: 'full' } = {
        role: 'synthesize',
        result: 'full',
        // The final pass gets its own label (RV2509) so the two judge
        // invocations of `stage: 'both'` are separable in telemetry;
        // the draft label is unchanged, so every existing run reduces
        // exactly as before.
        label: stage === 'draft' ? CLAIM_JUDGE_LABEL : `${CLAIM_JUDGE_LABEL}-final`,
        schema: CLAIM_JUDGE_SCHEMA,
        limits: spec.judge?.limits ?? { maxTurns: DEFAULT_CLAIM_JUDGE_MAX_TURNS },
        ...(spec.judge?.model === undefined ? {} : { model: spec.judge.model }),
        ...(spec.judge?.effort === undefined ? {} : { effort: spec.judge.effort }),
        ...(spec.judge?.estCost === undefined ? {} : { estCost: spec.judge.estCost }),
      };
      let judged: AgentResult<unknown>;
      try {
        judged = await runtime.runInScope(judgeState, () =>
          (ctx.agent as (prompt: string, o?: unknown) => Promise<AgentResult<unknown>>)(
            judgePrompt,
            judgeOpts,
          ),
        );
        noteInternalSettle(judged);
        // The convergence hold's fallback sizing (RV3701): captured on
        // every settle (a failed judge was still paid for) and only for
        // post draft passes, because the hold funds a second judge pass over the
        // composed document and the draft pass prices a different
        // prompt.
        if (stage !== 'draft' && typeof judged.costUsd === 'number') {
          observedFinalJudgeCostUsd = judged.costUsd;
        }
      } catch (declined) {
        // The declined judge admission degrades typed (RV2106): the
        // ninth parity run's judge estimate did not fit the
        // orchestrator account's working room past the held synthesis
        // reserve, and the pre-dispatch refusal flew out of the
        // coordination bare: exhausted, no fold, the synthesis its
        // reserve was holding money for never dispatched, four ok
        // children and a composed draft lost. The judge is optional
        // enrichment: the refusal journals its verdict with the
        // arithmetic, the meta names the declined pass beside the
        // judgeFailed precedent, and only the armed 'fail' posture
        // stops the run, because a gate armed to stop the run must
        // not pass silently when its judge cannot be seated.
        if (!(declined instanceof BudgetExhaustedError)) {
          throw declined;
        }
        claimConsistencyMeta = finishMeta({ judgeInvoked: false, judgeDeclined: true });
        // The key stays byte identical for the draft pass and gains a
        // suffix for the final one (RV2509): under `stage: 'both'` two
        // declines can happen in one run, and a shared key would let
        // the second reuse the first's entry and report the wrong
        // arithmetic.
        const declineKey = deriverV2.deriveKey({
          kind:
            stage === 'draft'
              ? 'orchestrator-claim-judge-declined'
              : 'orchestrator-claim-judge-declined-final',
        });
        if (
          !internals.replayer
            .snapshot()
            .some((entry) => entry.kind === 'decision' && entry.key === declineKey)
        ) {
          await internals.replayer.appendSinglePhase({
            scope: callingState.scope,
            key: declineKey,
            kind: 'decision',
            status: 'ok',
            spanId: internals.spans.mint(callingState.spanId),
            site: 'orchestrator-budget',
            value: {
              decisionType: 'orchestrator_claim_judge_declined',
              reason: declined.message.slice(0, 300),
              remainingUsd:
                internals.budget.remainingUsd(orchestratorAccount ?? ROOT_ACCOUNT) ?? null,
            },
          });
        }
        internals.events.emit(
          {
            type: 'log',
            level: 'warn',
            msg: 'orchestrator claim consistency judge declined by admission',
            data: { reason: declined.message.slice(0, 300) },
          },
          callingState.spanId,
        );
        if (onFound === 'fail' || onFound === 'repair') {
          // 'repair' joins 'fail' here (RV3307): both postures are
          // ARMED, and a gate that promised to consume or stop on
          // findings must not pass silently when nothing could rule.
          throw new FailRunError(
            'the claim-consistency judge could not be admitted within the orchestrator ' +
              `account, so the armed ${onFound} posture cannot pass the draft: ` +
              declined.message.slice(0, 300),
            {
              data: {
                source: 'orchestrator_claim_consistency',
                claimConsistencyMeta: claimConsistencyMeta as unknown as Json,
                ...(snapshot ?? {}),
              },
            },
          );
        }
        return;
      }
      if (judged.status !== 'ok' || judged.output === null || judged.output === undefined) {
        // The judge died: nothing was judged, and saying "no findings"
        // would claim the pool agreed. The meta names the failure; only
        // the 'fail' posture turns it into a run failure, because a
        // gate armed to stop the run must not pass silently when its
        // judge cannot rule.
        claimConsistencyMeta = finishMeta({ judgeInvoked: true, judgeFailed: true });
        internals.events.emit(
          {
            type: 'log',
            level: 'warn',
            msg: 'orchestrator claim consistency judge failed',
            data: {
              status: judged.status,
              ...(judged.errorMessage === undefined ? {} : { error: judged.errorMessage }),
            },
          },
          callingState.spanId,
        );
        if (onFound === 'fail' || onFound === 'repair') {
          throw new FailRunError(
            'the claim-consistency judge did not settle ok ' +
              `(status '${judged.status}'), so the armed ${onFound} posture cannot pass the draft`,
            {
              data: {
                source: 'orchestrator_claim_consistency',
                judgeStatus: judged.status,
                claimConsistencyMeta: claimConsistencyMeta as unknown as Json,
                ...(snapshot ?? {}),
              },
            },
          );
        }
        return;
      }
      // The judged rows, validated shape by shape (the lift posture): a
      // malformed or out-of-range row is dropped, a repeated pair index
      // keeps its first reason, and the findings sort by pair index so
      // the envelope order is the fold's, never the model's.
      const rows = (judged.output as { contradictions?: unknown }).contradictions;
      const byPair = new Map<number, string>();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const candidate = row as { pair?: unknown; reason?: unknown };
          if (
            typeof candidate.pair !== 'number' ||
            !Number.isInteger(candidate.pair) ||
            candidate.pair < 0 ||
            candidate.pair >= allPairs.length ||
            typeof candidate.reason !== 'string' ||
            candidate.reason.length === 0 ||
            byPair.has(candidate.pair)
          ) {
            continue;
          }
          byPair.set(candidate.pair, candidate.reason);
        }
      }
      const findings: ClaimContradictionFinding[] = [...byPair.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([index, reason]) => ({ ...allPairs[index], reason }));
      claimFindingsFound = findings;
      // The count rides the meta (RV3304): the meta travels alone onto
      // surfaces the findings array never reaches, and a retained
      // finding must stay countable there.
      claimConsistencyMeta = finishMeta({ judgeInvoked: true, findings: findings.length });
      announce();
      if (onFound !== 'fail' || findings.length === 0) {
        return;
      }
      throw new FailRunError(
        `the claim-consistency judge found ${String(findings.length)} contradiction` +
          `${findings.length === 1 ? '' : 's'} between the draft and the settled child pool: ` +
          findings.map((finding) => `${finding.anchor} (${finding.reason})`).join('; '),
        {
          data: {
            source: 'orchestrator_claim_consistency',
            claimContradictions: findings as unknown as Json,
            claimConsistencyMeta: claimConsistencyMeta as unknown as Json,
            // The acceptance snapshot the run already earned (cycle
            // 73): the fan-out work IS complete, the failure is
            // downstream.
            ...(snapshot ?? {}),
          },
        },
      );
    };

    const runSynthesis = async (
      draft: unknown,
      // The stage the dispatch folds under (RV3905): the initial
      // composition and the redemption default to 'composition'; the
      // bounded claim repair round names itself 'repair', so the money
      // the round spends is separable from the composition it repairs.
      stagePhase: 'composition' | 'repair' = 'composition',
    ): Promise<unknown> => {
      const spec = opts?.synthesis;
      if (spec === undefined) {
        return draft;
      }
      // A REPLAYED root returns before the async recovery has rebuilt
      // `records` (live roots gate on it through the tools; a replayed
      // one executes none), and an empty digest here would change the
      // synthesis identity and re-pay the invocation on every resume.
      await recoveryDone;
      if (spec.mode === 'incremental') {
        // The final step of incremental synthesis is deterministic:
        // no model call composes the final result.
        return await reconcileIncremental(draft, spec);
      }
      /**
       * The failed pre-pass verdict carried to synthesis (RV808a),
       * set only under `carryDraftGaps`: the failed validator names
       * with their reasons, journaled or reused below, folded into
       * the prompt as the DRAFT CONTRACT GAPS line.
       */
      let draftGaps: { name: string; reasons: string[] }[] | undefined;
      if (spec.skipWhenDraftValid === true && validationSpec !== undefined) {
        // The conditional synthesis gate (RV510): the draft is judged by
        // the FULL declared finish contract before the span starts. The
        // journaled skip is the authority on resume (the acceptance and
        // cap precedents); a failed pre-pass journals nothing (a pure
        // function of the draft re-derives identically) and spends no
        // repair budget, UNLESS `carryDraftGaps` opted in (RV808a):
        // the failure is then journaled as the draft-gaps decision and
        // carried into the synthesis prompt instead of discarded.
        const skipKey = 'synthesis-draft-valid-skip';
        const gapsKey = 'synthesis-draft-gaps';
        const carryGaps = spec.carryDraftGaps === true;
        const announceSkip = (entryRef: number): void => {
          internals.events.emit(
            {
              type: 'log',
              level: 'info',
              msg: 'orchestrator synthesis skipped',
              data: {
                reason: 'synthesis_skipped_by_valid_draft' satisfies OrchestrateSynthesisSkipReason,
                skipDecisionRef: entryRef,
              },
            },
            callingState.spanId,
          );
        };
        const draftValue = (draft ?? null) as Json | null;
        const draftHash = createHash('sha256')
          .update(jcsSerialize(draftValue), 'utf8')
          .digest('hex');
        const validatorNames = validationSpec.validators.map((validator) => validator.name);
        /**
         * A journaled skip is the authority only for the generation and
         * the draft it judged (RV603). The documented remedy for a
         * broken contract is to fix it and resume, and a verdict that
         * outlives its contract defeats exactly that: the run would
         * settle ok carrying output the CURRENT contract rejects.
         * Bound by three facts, in descending strength: the contract
         * identity (the same `contractGenerationCurrent` test the
         * finish-validation decisions already use), the draft the
         * verdict actually judged, and the validator names that
         * rendered it. Entries written before this field existed carry
         * no draftHash and stay reusable, so journals in flight roll
         * forward byte for byte.
         */
        const applies = (value: {
          contractHash?: string;
          draftHash?: string;
          validators?: unknown;
        }): boolean =>
          contractGenerationCurrent(value) &&
          (value.draftHash === undefined || value.draftHash === draftHash) &&
          (!Array.isArray(value.validators) ||
            JSON.stringify(value.validators) === JSON.stringify(validatorNames));
        // The LAST matching entry, not the first: a superseded skip
        // stays in the journal as the historical fact it is, and the
        // re-derived one after it is what a later resume reads.
        const prior = internals.replayer
          .snapshot()
          .filter(
            (entry) =>
              entry.kind === 'decision' &&
              entry.scope === callingState.scope &&
              entry.key === skipKey,
          )
          .at(-1);
        if (prior !== undefined && applies(prior.value as Parameters<typeof applies>[0])) {
          synthesisSkippedByValidDraft = true;
          synthesisSkipDecisionRef = prior.seq;
          announceSkip(prior.seq);
          return draft;
        }
        const announceGaps = (entryRef: number, failedNames: string[]): void => {
          internals.events.emit(
            {
              type: 'log',
              level: 'info',
              msg: 'orchestrator synthesis draft gaps carried',
              data: { failed: failedNames, gapsDecisionRef: entryRef },
            },
            callingState.spanId,
          );
        };
        /**
         * The journaled failure rows, validated shape by shape; a
         * malformed entry re-derives instead of poisoning the prompt
         * (the lift posture).
         */
        const journaledFailed = (
          value: unknown,
        ): { name: string; reasons: string[] }[] | undefined => {
          const failed = (value as { failed?: unknown } | undefined)?.failed;
          if (!Array.isArray(failed) || failed.length === 0) {
            return undefined;
          }
          const rows: { name: string; reasons: string[] }[] = [];
          for (const row of failed) {
            const candidate = row as { name?: unknown; reasons?: unknown };
            if (
              typeof candidate.name !== 'string' ||
              !Array.isArray(candidate.reasons) ||
              candidate.reasons.some((reason) => typeof reason !== 'string')
            ) {
              return undefined;
            }
            rows.push({ name: candidate.name, reasons: candidate.reasons as string[] });
          }
          return rows;
        };
        if (carryGaps) {
          // The journaled gaps verdict is the authority exactly like
          // the skip decision: same binding (generation, draft hash,
          // validator names), so a resume folds the identical prompt
          // line without re-running a validator.
          const priorGaps = internals.replayer
            .snapshot()
            .filter(
              (entry) =>
                entry.kind === 'decision' &&
                entry.scope === callingState.scope &&
                entry.key === gapsKey,
            )
            .at(-1);
          if (
            priorGaps !== undefined &&
            applies(priorGaps.value as Parameters<typeof applies>[0])
          ) {
            const rows = journaledFailed(priorGaps.value);
            if (rows !== undefined) {
              draftGaps = rows;
              announceGaps(
                priorGaps.seq,
                rows.map((row) => row.name),
              );
            }
          }
        }
        if (draftGaps === undefined) {
          const input: FinishValidationInput = {
            result: draftValue,
            text: typeof draftValue === 'string' ? draftValue : JSON.stringify(draftValue),
            children: validationChildren(),
            runId: internals.runId,
          };
          const failed: { name: string; reasons: string[] }[] = [];
          for (const validator of validationSpec.validators) {
            let verdict: FinishValidationVerdict;
            try {
              verdict = validator.validate(input);
            } catch (thrown) {
              throw new ConfigError(
                `finish validator '${validator.name}' threw instead of returning a verdict ` +
                  'during the skipWhenDraftValid pre-pass: ' +
                  (thrown instanceof Error ? thrown.message : String(thrown)),
              );
            }
            if (!verdict.ok) {
              failed.push({ name: validator.name, reasons: verdict.reasons });
              if (!carryGaps) {
                // The historical pre-pass short-circuits at the first
                // failure; only the gaps opt-in pays for the full list.
                break;
              }
            }
          }
          if (failed.length > 0 && carryGaps) {
            const gapsEntry = await internals.replayer.appendSinglePhase({
              scope: callingState.scope,
              key: gapsKey,
              kind: 'decision',
              status: 'ok',
              spanId: internals.spans.mint(callingState.spanId),
              site: 'orchestrator-synthesis-draft-gaps',
              value: {
                decisionType: 'orchestrator_synthesis_draft_gaps',
                failed: failed as unknown as Json,
                validators: validatorNames,
                // The same binding the skip decision carries (RV603):
                // the contract generation and the judged draft.
                ...(validationSpec.contract === undefined
                  ? {}
                  : { contractHash: validationSpec.contract.hash }),
                draftHash,
              },
            });
            draftGaps = failed;
            announceGaps(
              gapsEntry.seq,
              failed.map((row) => row.name),
            );
          }
          // The carry invariant (RV1404): non-empty findings under
          // 'carry' make the skip a silent no-op of the carry promise,
          // because the draft was composed without the CHILD
          // CONTRADICTIONS line and skipping the synthesis means
          // nothing was ever asked to resolve the dispute. The LIVE
          // gate therefore never skips over them; a skip already
          // journaled stays the authority on resume, like every
          // journaled decision.
          const carryBlocked =
            opts?.contradictions?.onFound === 'carry' &&
            contradictionsFound !== undefined &&
            contradictionsFound.length > 0;
          // The claim-consistency carry joins the same invariant
          // (RV1502): judged findings the synthesis was never asked
          // to resolve must not be skipped over either.
          const claimCarryBlocked =
            (opts?.claimConsistency?.onFound === 'carry' ||
              opts?.claimConsistency?.onFound === 'repair') &&
            claimFindingsFound !== undefined &&
            claimFindingsFound.length > 0;
          if (failed.length === 0 && (carryBlocked || claimCarryBlocked)) {
            internals.events.emit(
              {
                type: 'log',
                level: 'info',
                msg: 'orchestrator synthesis skip blocked by contradictions',
                data: {
                  contradictions: contradictionsFound?.length ?? 0,
                  claimFindings: claimFindingsFound?.length ?? 0,
                },
              },
              callingState.spanId,
            );
          }
          if (failed.length === 0 && !carryBlocked && !claimCarryBlocked) {
            const skipEntry = await internals.replayer.appendSinglePhase({
              scope: callingState.scope,
              key: skipKey,
              kind: 'decision',
              status: 'ok',
              spanId: internals.spans.mint(callingState.spanId),
              site: 'orchestrator-synthesis-skip',
              value: {
                decisionType: 'orchestrator_synthesis_skip',
                reason: 'synthesis_skipped_by_valid_draft',
                validators: validatorNames,
                // What the verdict is bound to (RV603): the contract
                // generation when one is declared, and the draft it
                // actually judged. Without a contract descriptor the pair
                // is honestly weaker (a same-name validator can change
                // behavior underneath it), and that is documented.
                ...(validationSpec.contract === undefined
                  ? {}
                  : { contractHash: validationSpec.contract.hash }),
                draftHash,
              },
            });
            if (orchestratorAccount !== undefined && (opts?.budget?.synthesisReserveUsd ?? 0) > 0) {
              // A held reserve is released unconsumed: there is no
              // synthesis invocation to fund, and no lifecycle decision
              // journals because there is no invocation to account.
              internals.budget.releaseSynthesisReserve(orchestratorAccount);
            }
            synthesisSkippedByValidDraft = true;
            synthesisSkipDecisionRef = skipEntry.seq;
            announceSkip(skipEntry.seq);
            return draft;
          }
        }
      }
      // The evidence symmetry options (the v1.74 experiment review,
      // P0.2): both default off, and the synthesis toolset and prompt
      // stay byte identical without them.
      const exposeTools = spec.exposeChildResultTools === true;
      const fullContext = spec.context === 'full';
      const synthesisToolNames = new Set<string>([
        FINISH_TOOL_NAME,
        ...(exposeTools ? [GET_CHILD_RESULT_TOOL_NAME, READ_CHILD_ARTIFACT_TOOL_NAME] : []),
      ]);
      const synthesisTools = buildOrchestratorTools(orchestratorRuntime, fullCardText, {
        childResultTools: exposeTools,
        // The sections argument exists on the finish tool exactly when
        // something can splice it: the declared vocabulary (RV808b) or
        // the armed sectional round (RV3803). Deterministic on resume:
        // the round context re-derives from replayed material.
        sectionalFinish: synthSectionalFinish || sectionalRoundContext !== undefined,
      }).filter((tool) => synthesisToolNames.has(tool.name));
      if (finishSectional !== undefined && synthSectionalFinish) {
        // The synthesis invocation is SEEDED with the coordination
        // draft as its retained sectional base (RV808b): the draft is
        // journaled and rides the prompt, so a synthesis that agrees
        // with it repairs only the named gaps (the carryDraftGaps
        // pairing) without ever resending the document. Re-derives on
        // every path, live or resumed: runSynthesis always holds the
        // draft.
        finishSectional.retain(draft);
      }
      // ALL settled children in spawn order (the finalize-fallback fold),
      // not the wake digest: at synthesis time every settlement has been
      // delivered, so an undelivered-only view would be empty. One row
      // per SPAWN under its current handle (RV609): several handles can
      // alias one reborn child, and per-handle rows would double its
      // evidence; without aliases this is byte-identical to the
      // per-handle walk, so existing journals roll forward unchanged.
      const settledEntries = [...byOrdinal.values()]
        .filter((record) => record.settled !== undefined)
        .sort((a, b) => a.spawnOrdinal - b.spawnOrdinal)
        .map((record) => [record.handle, record] as const);
      const settledDigests = settledEntries.map(([handle, record]) => ({
        // The handle rides the digest rows ONLY when the read tools are
        // exposed: it is what get_child_result takes, and prompt bytes
        // are journal identity for every run that never opts in.
        ...(exposeTools ? { handle } : {}),
        ...digestOf(record, record.settled as AgentResult<unknown>),
      }));
      // Pre-model claim deduplication (RV-211 remainder): opt in, and
      // the prompt stays byte identical when unset (prompt bytes are
      // journal identity: a default change would re-pay every existing
      // synthesis on resume).
      let digestRows = settledDigests;
      let repeatedClaims: RepeatedClaim[] | undefined;
      if (spec.dedupeClaims === true) {
        const deduped = dedupeRepeatedClaims(
          settledDigests.map((row) => ({ nodeId: row.nodeId, text: row.outputSummary })),
        );
        const textByNode = new Map(deduped.rows.map((row) => [row.nodeId, row.text]));
        digestRows = settledDigests.map((row) => ({
          ...row,
          outputSummary: textByNode.get(row.nodeId) ?? row.outputSummary,
        }));
        repeatedClaims = deduped.repeated;
      }
      const draftJson = JSON.stringify(draft ?? null);
      const digestJson = JSON.stringify(digestRows);
      /**
       * The structured evidence index rows (RV808b): deterministic
       * per-child citation extraction over the SAME serialized outputs
       * the validators judge, citations taken only from the ACCEPTED
       * roster (RV1403: ok children plus the salvage arms the decision
       * counted, a floor-blocked child never among them), so nothing
       * indexed is a citation the validators would reject as
       * fabricated. Folded only from replay-stable settled results
       * (the policyFacts precedent).
       */
      const indexSpec = spec.evidenceIndex;
      const evidenceIndexRows =
        indexSpec === undefined
          ? undefined
          : ((): Json => {
              const pattern =
                indexSpec === true
                  ? DEFAULT_CITATION_PATTERN
                  : (indexSpec.pattern ?? DEFAULT_CITATION_PATTERN);
              const flags = indexSpec === true ? '' : (indexSpec.flags ?? '');
              const globalFlags = flags.includes('g') ? flags : `${flags}g`;
              const acceptedRoster = acceptedRosterNow();
              return settledEntries.map(([handle, record]) => {
                const settled = record.settled as AgentResult<unknown>;
                const text = serializeChildOutput(settled);
                // The ACCEPTED roster (RV1403), exactly the pool the
                // contradiction pass judges: an accepted structured
                // partial's citations index, a floor-blocked child's
                // never do, and without acceptance the ok children.
                const eligible =
                  acceptedRoster === undefined
                    ? settled.status === 'ok'
                    : acceptedRoster.has(record.nodeId);
                const citations: string[] = [];
                if (eligible) {
                  const distinct = new Set<string>();
                  // Fresh RegExp per child: the 'g' flag makes matching
                  // stateful; zero-length matches never index (RV610).
                  for (const match of text.match(new RegExp(pattern, globalFlags)) ?? []) {
                    if (match.length > 0 && !distinct.has(match)) {
                      distinct.add(match);
                      citations.push(match);
                    }
                  }
                }
                return {
                  ...(exposeTools ? { handle } : {}),
                  nodeId: record.nodeId,
                  status: settled.status,
                  citations,
                  artifacts: (settled.artifacts ?? []).map((artifact) => ({
                    id: artifact.id,
                    kind: artifact.kind,
                    ...(artifact.label === undefined ? {} : { label: artifact.label }),
                  })),
                  chars: text.length,
                };
              });
            })();
      // The RV3004 widening: `true` keeps the historical child line and
      // its exact bytes; the object form keeps that line and arms the
      // SO FAR sibling. Prompt bytes are journal identity, so each form
      // is its own stable shape.
      const runFactsEnabled =
        spec.runFacts === true || (typeof spec.runFacts === 'object' && spec.runFacts !== null);
      const runFactsSoFar =
        typeof spec.runFacts === 'object' &&
        spec.runFacts !== null &&
        spec.runFacts.workflowSoFar === true;
      const promptLines = [
        'You are the synthesis invocation of an orchestrated run. Compose the FINAL ' +
          'result of the run from the goal, the coordination draft, and the settled child ' +
          'evidence below by calling finish({ result }) EXACTLY once. Preserve the evidence ' +
          'and citations the draft relies on; do not invent findings. ' +
          (exposeTools
            ? 'Beside finish, get_child_result and read_child_artifact page any SETTLED ' +
              "child's FULL output and artifacts by handle (each DIGEST row carries its " +
              'handle); read what the validators will hold you to before finishing.'
            : 'No other tool exists.'),
        ...(repeatedClaims === undefined
          ? []
          : [
              'Repeated claims across children were deduplicated before this prompt: only ' +
                'the first occurrence of each repeated line remains in the digest, and the ' +
                'REPEATED CLAIMS index below lists each one with its reporters.',
            ]),
        ...(evidenceIndexRows === undefined
          ? []
          : [
              'An EVIDENCE INDEX below lists, per settled child, the citations its output ' +
                'actually carries (evidence-pool children only: ok and salvage-accepted), ' +
                'its artifacts, and its output size in chars' +
                (exposeTools
                  ? '; page only what you need with get_child_result and ' +
                    'read_child_artifact instead of re-reading whole outputs.'
                  : '.'),
            ]),
        ...(spec.instructions === undefined ? [] : [spec.instructions]),
        ...finishValidationPromptLines(
          validationSpec,
          synthSectionalFinish ? 'draft-base' : undefined,
        ),
        // The carried pre-pass verdict (RV808a): derived from the
        // journaled gaps decision, so a resumed synthesis re-derives
        // the identical bytes. Absent without the opt-in, byte for
        // byte.
        ...(draftGaps === undefined
          ? []
          : [
              'DRAFT CONTRACT GAPS: the coordination draft failed exactly these declared ' +
                'validators; repair the named gaps and preserve the draft otherwise. ' +
                JSON.stringify(draftGaps),
            ]),
        // The carried pool disagreement (RV1302), under onFound 'carry'
        // only and only when the pass actually found something: the
        // prompt stays byte identical for an agreeing pool, so a run
        // that opts in pays nothing in journal identity for the quiet
        // case.
        ...(opts?.contradictions?.onFound !== 'carry' ||
        contradictionsFound === undefined ||
        contradictionsFound.length === 0
          ? []
          : [
              'CHILD CONTRADICTIONS: the settled children read these cited locations ' +
                'differently; resolve each one EXPLICITLY in the final result (say which ' +
                'reading holds and why it does) instead of silently picking one. ' +
                JSON.stringify(contradictionsFound),
            ]),
        // The carried draft/pool disagreement (RV1502), under onFound
        // 'carry' only and only when the judge actually found
        // something: the prompt stays byte identical for a clean
        // verdict, exactly like the CHILD CONTRADICTIONS line above.
        ...((opts?.claimConsistency?.onFound !== 'carry' &&
          opts?.claimConsistency?.onFound !== 'repair') ||
        claimFindingsFound === undefined ||
        claimFindingsFound.length === 0
          ? []
          : [
              'CLAIM CONTRADICTIONS: the composed draft contradicts the settled child pool ' +
                'at these cited locations; resolve each one EXPLICITLY in the final result ' +
                '(say which reading holds and why) instead of keeping the inverted claim. ' +
                JSON.stringify(claimFindingsFound),
            ]),
        // The bought lessons ride beside the findings (RV3603): folded
        // only from journaled finish validation decisions, present
        // exactly when the prompt already carries judged findings AND
        // a rejected attempt exists, so every existing prompt stays
        // byte identical (the initial composition predates any
        // findings, and a clean history folds nothing).
        ...((opts?.claimConsistency?.onFound !== 'carry' &&
          opts?.claimConsistency?.onFound !== 'repair') ||
        claimFindingsFound === undefined ||
        claimFindingsFound.length === 0
          ? []
          : hostValidationLessons()),
        // The sectional round block (RV3803), present exactly when the
        // round armed an exact plan: the retained accepted document
        // rides the prompt beside its target sections, so the model
        // repairs sections instead of regenerating a 43k character
        // document to consume findings living in a handful of
        // sentences (the third comparison run's tail after fan-in was
        // 80.1 percent of its wall). Absent otherwise, so every
        // existing prompt stays byte identical; re-derived from
        // replayed material on resume, so the bytes are stable.
        ...(sectionalRoundContext === undefined
          ? []
          : [
              `RETAINED FINAL: ${JSON.stringify(sectionalRoundContext.base)}`,
              'SECTIONAL ROUND: the accepted document above is RETAINED; repair ONLY the ' +
                'sections owning the contradicted claims by calling finish({ sections: { ' +
                '"<marker>": "<new section body>" } }). Unchanged sections are spliced from ' +
                'the retained document byte for byte and the spliced whole is validated and ' +
                'judged. Target sections: ' +
                JSON.stringify(sectionalRoundContext.targets) +
                '. Declared markers: ' +
                JSON.stringify(sectionalRoundContext.sections) +
                '. Resubmit the full document as result only when a targeted repair is ' +
                'impossible.',
            ]),
        // The opt-in policy-facts line (RV709): folded ONLY from
        // replay-stable material (the settled child results' durable
        // tool-budget subsets, which the journal replays verbatim), so
        // a resumed synthesis re-derives the identical prompt bytes;
        // prompt bytes are journal identity, so the line exists exactly
        // under the opt-in.
        ...(spec.policyFacts === true
          ? [
              ((): string => {
                const byStatus: Record<string, number> = {};
                let extensionsGranted = 0;
                let windowsEntered = 0;
                let reservesUsed = 0;
                for (const [, record] of settledEntries) {
                  const settled = record.settled as AgentResult<unknown>;
                  byStatus[settled.status] = (byStatus[settled.status] ?? 0) + 1;
                  extensionsGranted += settled.toolBudget?.extensionsGranted ?? 0;
                  if (settled.toolBudget?.finalizationWindowEntered === true) {
                    windowsEntered += 1;
                  }
                  if (settled.toolBudget?.finalizationReserveUsed === true) {
                    reservesUsed += 1;
                  }
                }
                return `POLICY FACTS: ${JSON.stringify({
                  children: settledEntries.length,
                  byStatus: Object.fromEntries(
                    Object.keys(byStatus)
                      .sort()
                      .map((status) => [status, byStatus[status]]),
                  ),
                  extensionsGranted,
                  finalizationWindowsEntered: windowsEntered,
                  finalizationReservesUsed: reservesUsed,
                })}`;
              })(),
            ]
          : []),
        // The opt-in RUN FACTS line (RV1503), the policyFacts sibling:
        // the aggregate of the settled children's replay-stable
        // execution facts, so the composing model can grade
        // `live-observed` truthfully instead of erasing the run it is
        // part of. Folded ONLY from journal-replayed material
        // (providerCalls and usage restore verbatim; dollars are
        // deliberately absent because replay re-prices from the
        // current table), so a resumed synthesis re-derives identical
        // prompt bytes; the line exists exactly under the opt-in.
        ...(runFactsEnabled
          ? [
              ((): string => {
                const byStatus: Record<string, number> = {};
                let wireRequests = 0;
                let wireIdsMissing = 0;
                let inputTokens = 0;
                let outputTokens = 0;
                for (const [, record] of settledEntries) {
                  const settled = record.settled as AgentResult<unknown>;
                  byStatus[settled.status] = (byStatus[settled.status] ?? 0) + 1;
                  const facts = executionFactsOf(settled);
                  wireRequests += facts.wireRequests;
                  wireIdsMissing += facts.wireIdsMissing;
                  inputTokens += facts.inputTokens;
                  outputTokens += facts.outputTokens;
                }
                return (
                  `RUN FACTS: ${JSON.stringify({
                    // The explicit scope (RV1807): the nineteenth
                    // benchmark's answer printed these child-only totals
                    // as "the current workflow" and invited a false
                    // drift reading against the terminal invoice, which
                    // additionally carries the orchestrator, judges, and
                    // synthesis. The label makes the boundary part of
                    // the bytes the model quotes.
                    scope: 'settled-children-only',
                    // The id these facts belong to (RV2501). The line
                    // ends in the `live-observed` register and used to
                    // name no artifact at all, so a model quoting it
                    // faithfully wrote a sentence evidenceGradeValidator
                    // rejects: the comparison run burned both repairs
                    // and died on exactly that sentence. The id is the
                    // artifact, it is replay stable like every other
                    // field here, and it rides the same sentence as the
                    // graded phrase so the quote passes the grade.
                    runId: internals.runId,
                    children: settledEntries.length,
                    byStatus: Object.fromEntries(
                      Object.keys(byStatus)
                        .sort()
                        .map((status) => [status, byStatus[status]]),
                    ),
                    wireRequests,
                    wireIdsMissing,
                    inputTokens,
                    outputTokens,
                  })} (live-observed by run ${internals.runId}, this run's own harness; ` +
                  'production evidence it is not; the settled children ONLY, excluding this ' +
                  "orchestrator, judges, and synthesis; the whole run's totals are the " +
                  'terminal envelope and invoice)'
                );
              })(),
            ]
          : []),
        // The SO FAR sibling (RV3004): the child totals PLUS this
        // orchestration's own settled internal spans at this dispatch's
        // composition, so the number the composing model quotes sits
        // next to the invoice instead of a third of it (the nineteenth
        // benchmark's false-drift reading, now closable from inside the
        // prompt). Folded from the same replay-stable material as the
        // child line plus the internalSpansSoFar accumulator, whose
        // settle order is deterministic, so a resumed composition
        // re-derives identical bytes. Dollars stay absent for the same
        // replay reason.
        ...(runFactsSoFar
          ? [
              ((): string => {
                let wireRequests = internalSpansSoFar.wireRequests;
                let wireIdsMissing = internalSpansSoFar.wireIdsMissing;
                let inputTokens = internalSpansSoFar.inputTokens;
                let outputTokens = internalSpansSoFar.outputTokens;
                for (const [, record] of settledEntries) {
                  const facts = executionFactsOf(record.settled as AgentResult<unknown>);
                  wireRequests += facts.wireRequests;
                  wireIdsMissing += facts.wireIdsMissing;
                  inputTokens += facts.inputTokens;
                  outputTokens += facts.outputTokens;
                }
                return (
                  `RUN FACTS SO FAR: ${JSON.stringify({
                    scope: 'run-so-far-at-this-dispatch',
                    runId: internals.runId,
                    children: settledEntries.length,
                    internalSpans: internalSpansSoFar.spans,
                    wireRequests,
                    wireIdsMissing,
                    inputTokens,
                    outputTokens,
                  })} (live-observed by run ${internals.runId}, this run's own harness; ` +
                  'production evidence it is not; the settled children PLUS this ' +
                  "orchestration's settled coordination, judge, note, and composition spans " +
                  'as of THIS dispatch; it excludes this dispatch itself and anything still ' +
                  "running, so the whole run's totals remain the terminal envelope and " +
                  'invoice)'
                );
              })(),
            ]
          : []),
        `GOAL: ${goal}`,
        `DRAFT: ${draftJson}`,
        `DIGEST: ${digestJson}`,
        // The evidence index data line (RV808b), beside the digest it
        // annotates; absent without the opt-in, byte for byte.
        ...(evidenceIndexRows === undefined
          ? []
          : [`EVIDENCE INDEX: ${JSON.stringify(evidenceIndexRows)}`]),
        // The full evidence pool (the v1.74 experiment review, P0.2):
        // with context 'full' every settled child's serialized output
        // rides the prompt AFTER the digest rows, so the model sees
        // exactly what the validators will judge against.
        ...(fullContext
          ? [
              `CHILD OUTPUTS: ${JSON.stringify(
                settledEntries.map(([handle, record]) => ({
                  ...(exposeTools ? { handle } : {}),
                  nodeId: record.nodeId,
                  status: (record.settled as AgentResult<unknown>).status,
                  text: serializeChildOutput(record.settled as AgentResult<unknown>),
                })),
              )}`,
            ]
          : []),
        ...(repeatedClaims === undefined
          ? []
          : [`REPEATED CLAIMS: ${JSON.stringify(repeatedClaims)}`]),
      ];
      const prompt = promptLines.join('\n');
      // Root context diagnostics (RV-211): the actual sizes entering the
      // synthesis prompt, debug-level so ordinary consoles stay quiet.
      internals.events.emit(
        {
          type: 'log',
          level: 'debug',
          msg: 'orchestrator synthesis context',
          data: {
            children: settledDigests.length,
            draftChars: draftJson.length,
            digestChars: digestJson.length,
            promptChars: prompt.length,
            perChild: digestRows.map((entry) => ({
              nodeId: entry.nodeId,
              chars: JSON.stringify(entry).length,
            })),
            ...(repeatedClaims === undefined ? {} : { repeatedClaims: repeatedClaims.length }),
          },
        },
        callingState.spanId,
      );
      const configuredReserveUsd = opts?.budget?.synthesisReserveUsd ?? 0;
      const heldReserveUsd =
        orchestratorAccount === undefined
          ? 0
          : (internals.budget.accountView(orchestratorAccount)?.synthesisReserveUsd ?? 0);
      const synthesisState: CtxScopeState = { ...callingState };
      // The stage phase fills only the vacuum (RV3905): an explicit
      // host phase keeps its bucket.
      synthesisState.phase = synthesisState.phase ?? stagePhase;
      if (orchestratorAccount !== undefined) {
        synthesisState.budgetScope = orchestratorAccount;
        // The reserve's whole purpose arrives here: the held money is
        // released to the invocation it was held FOR (cycle 76), so the
        // per-turn clamp prices the synthesis finish from the freed
        // remainder.
        internals.budget.releaseSynthesisReserve(orchestratorAccount);
      }
      const remainingBeforeSynthesisUsd =
        configuredReserveUsd > 0
          ? internals.budget.remainingUsd(
              orchestratorAccount ?? callingState.budgetScope ?? undefined,
            )
          : undefined;
      // A validator rejection aborts the synthesis loop exactly like the
      // coordination loop; the caller throws the armed termination.
      const synthesisBreak = validationSpec === undefined ? undefined : validationAbort.signal;
      if (synthesisBreak !== undefined) {
        synthesisState.signal =
          callingState.signal === undefined
            ? synthesisBreak
            : AbortSignal.any([callingState.signal, synthesisBreak]);
      }
      const synthesisOpts: AgentOpts & InternalAgentHooks & { result: 'full' } = {
        role: 'synthesize',
        result: 'full',
        // The engine labels its own dispatch (RV2901). The comparison
        // run's journal refused the RV1604 split because this one span
        // stayed anonymous while the claim judge carried its label.
        label: FINAL_COMPOSITION_LABEL,
        tools: synthesisTools,
        [kExposureWait]: true,
        limits: spec.limits ?? { maxTurns: DEFAULT_SYNTHESIS_MAX_TURNS },
        ...(spec.model === undefined ? {} : { model: spec.model }),
        ...(spec.effort === undefined ? {} : { effort: spec.effort }),
        ...(spec.estCost === undefined ? {} : { estCost: spec.estCost }),
        [kTerminalTool]: {
          name: FINISH_TOOL_NAME,
          ...(validationSpec === undefined
            ? {}
            : {
                validate: validateFinish,
                ...(validationSpec.repairTurnReserve === undefined
                  ? {}
                  : { repairTurnReserve: validationSpec.repairTurnReserve }),
              }),
        },
      };
      // The mechanical repair pool belongs to THIS invocation (RV3602):
      // the boundary is the journaled verdict count at dispatch, so a
      // resume derives the identical index from the identical prefix
      // and the bounded claim repair round enters with the full
      // maxRepairs instead of the initial composition's leftovers.
      validationInvocationStart = validationDecisions().length;
      const synthesized = await runtime.runInScope(synthesisState, () =>
        (ctx.agent as (prompt: string, o?: unknown) => Promise<AgentResult<unknown>>)(
          prompt,
          synthesisOpts,
        ),
      );
      noteInternalSettle(synthesized);
      synthesisSchemaRejectedExchanges = synthesized.schemaRejectedTerminalExchanges ?? 0;
      synthesisSchemaRecoveredExchanges = synthesized.schemaRecoveredTerminalExchanges ?? 0;
      if (configuredReserveUsd > 0) {
        // The lifecycle decision (RV304 second half): the first pass
        // freezes the live numbers; a resume finds the entry by key and
        // reports the identical facts, immune to price-table or
        // budget-rebuild drift, exactly like the cap and acceptance
        // decisions. Only reserve-configured runs journal it. It
        // journals BEFORE the validation-termination throw below (RV402,
        // the eighth comparison experiment): the rejected synthesis was
        // still paid for out of the released reserve, and a run that
        // fails validation without this record has no audit trail of
        // where the held money went.
        const reserveKey = 'synthesis-reserve-lifecycle';
        const prior = internals.replayer
          .snapshot()
          .find(
            (entry) =>
              entry.kind === 'decision' &&
              entry.scope === callingState.scope &&
              entry.key === reserveKey,
          );
        if (prior !== undefined) {
          // The frozen facts minus the decision marker: the envelope
          // block must be byte identical between the first pass and a
          // resume.
          const frozen = prior.value as {
            configuredUsd: number;
            heldUsd: number;
            releasedUsd: number;
            remainingBeforeSynthesisUsd?: number;
            consumedUsd?: number;
          };
          synthesisReserveLifecycle = {
            configuredUsd: frozen.configuredUsd,
            heldUsd: frozen.heldUsd,
            releasedUsd: frozen.releasedUsd,
            ...(frozen.remainingBeforeSynthesisUsd === undefined
              ? {}
              : { remainingBeforeSynthesisUsd: frozen.remainingBeforeSynthesisUsd }),
            ...(frozen.consumedUsd === undefined ? {} : { consumedUsd: frozen.consumedUsd }),
          };
        } else {
          synthesisReserveLifecycle = {
            configuredUsd: configuredReserveUsd,
            heldUsd: heldReserveUsd,
            releasedUsd: heldReserveUsd,
            ...(remainingBeforeSynthesisUsd === undefined ? {} : { remainingBeforeSynthesisUsd }),
            consumedUsd: synthesized.costUsd,
          };
          await internals.replayer.appendSinglePhase({
            scope: callingState.scope,
            key: reserveKey,
            kind: 'decision',
            status: 'ok',
            spanId: internals.spans.mint(callingState.spanId),
            site: 'orchestrator-synthesis-reserve',
            value: {
              decisionType: 'orchestrator_synthesis_reserve',
              ...synthesisReserveLifecycle,
            },
          });
        }
        internals.events.emit(
          {
            type: 'log',
            level: 'info',
            msg: 'orchestrator synthesis reserve lifecycle',
            data: { ...synthesisReserveLifecycle },
          },
          callingState.spanId,
        );
      }
      if (validationTermination !== undefined) {
        // The synthesis finish rejection (or a defective validator)
        // aborted the invocation; the typed failure wins.
        throw validationTermination;
      }
      if (synthesized.status === 'ok') {
        return synthesized.output;
      }
      if (validationSpec !== undefined) {
        throw new FailRunError(
          `the synthesis invocation terminated with status '${synthesized.status}'` +
            (synthesized.errorMessage === undefined ? '' : `: ${synthesized.errorMessage}`) +
            '; finish validators are configured, so the unvalidated draft cannot stand',
          {
            data: {
              source: 'orchestrator_synthesis',
              status: synthesized.status,
              turnsUsed: synthesized.turns,
            },
          },
        );
      }
      const fallbackKey = deriverV2.deriveKey({ kind: 'orchestrator-synthesis-fallback' });
      if (
        !internals.replayer
          .snapshot()
          .some((entry) => entry.kind === 'decision' && entry.key === fallbackKey)
      ) {
        await internals.replayer.appendSinglePhase({
          scope: callingState.scope,
          key: fallbackKey,
          kind: 'decision',
          status: 'ok',
          spanId: internals.spans.mint(callingState.spanId),
          site: 'orchestrator-synthesis',
          value: {
            decisionType: 'orchestrator_synthesis_fallback',
            status: synthesized.status,
            turnsUsed: synthesized.turns,
          },
        });
      }
      internals.events.emit(
        {
          type: 'log',
          level: 'warn',
          msg:
            `the synthesis invocation terminated with status '${synthesized.status}'; ` +
            'falling back to the coordination draft (journaled decision ' +
            "'orchestrator_synthesis_fallback')",
        },
        callingState.spanId,
      );
      return draft;
    };

    /**
     * The settle at the cap: the JOURNALED cap decision drives the policy
     * branch (its `fallback` field froze budget.atCap when the cap
     * tripped), so a crash between the decision and its effect rolls the
     * SAME outcome forward on resume, immune to drift of the live options.
     * 'finish-with-partial' runs the reserved finalizer;
     * 'fail-run' skips it and fails the run typed (v1.35.0 review P2-1:
     * the policy used to be journaled and then ignored).
     */
    const settleCapOutcome = async (): Promise<unknown> => {
      const capEntry = internals.replayer.snapshot().find((entry) => entry.seq === capDecisionRef);
      const capValue = capEntry?.value as
        | { fallback?: string; spentUsd?: number; capUsd?: number; synthesisSkipped?: string }
        | undefined;
      if (capValue?.synthesisSkipped !== undefined) {
        // The skip is a designed outcome, not a failure: the info log
        // names the machine reason beside the zero synthesize spend
        // (11.4), on the live pass and on every roll-forward alike.
        internals.events.emit(
          {
            type: 'log',
            level: 'info',
            msg: 'orchestrator synthesis skipped',
            data: { reason: capValue.synthesisSkipped, capDecisionRef: capDecisionRef ?? -1 },
          },
          callingState.spanId,
        );
      }
      if (capValue?.fallback === 'fail-run') {
        throw new FailRunError(
          `the orchestrator budget cap was reached (decision entry ` +
            `${String(capDecisionRef ?? -1)}) and budget.atCap is 'fail-run': the reserved ` +
            'finalizer is skipped and the run fails instead of returning a partial result',
          {
            data: {
              source: 'orchestrator_budget_cap',
              capDecisionRef: capDecisionRef ?? -1,
              spentUsd: capValue.spentUsd ?? 0,
              capUsd: capValue.capUsd ?? 0,
              ...(capValue.synthesisSkipped === undefined
                ? {}
                : { synthesisSkipped: capValue.synthesisSkipped }),
            },
          },
        );
      }
      return await runForcedFinish();
    };

    const bootTermination = extensionTermination;
    if (bootTermination !== undefined) {
      // A terminate at boot (the journaled guards verdict folded again on
      // resume): the failure rolls forward before any model call.
      throw bootTermination;
    }
    if (capDecisionRef !== undefined) {
      // Resume roll-forward (crash between the cap decision and its
      // effects): the frozen state re-derives from the entry; the main
      // loop is not re-entered.
      return await settleCapOutcome();
    }
    if (validationSpec !== undefined) {
      // The crash window between the journaled final rejection and the
      // run terminal: the rejected verdict rolls forward at boot before
      // any model call (the cap roll forward precedent). Only the
      // CURRENT contract generation's rejection rolls (cycle 73): a
      // rejection a superseded generation left behind is exactly what
      // the fix-and-resume remedy repairs, so the loop resumes instead.
      // The scoping rescues the CRASH WINDOW alone: a journal whose
      // last run settle is terminal belongs to a run that already
      // settled with this failure, and a re-settle by replay must roll
      // the SAME rejection forward whatever the live contract says,
      // with zero paid calls. The boot re-throw carries the
      // journal-derived fields alone; the window-derived counter needs
      // a live window and stays absent.
      const priorRejection = validationDecisions().find(
        (decision) => decision.verdict === 'rejected',
      );
      if (priorRejection !== undefined) {
        const settle = lastRunSettle(internals.replayer.snapshot());
        const settledTerminal =
          settle !== undefined &&
          settle.runStatus !== 'running' &&
          settle.runStatus !== 'suspended';
        if (settledTerminal || contractGenerationCurrent(priorRejection)) {
          throw finishValidationError(priorRejection);
        }
      }
    }
    const promptLines = [
      ...(extension?.promptLines?.() ?? []),
      // The progressive-drafting nudge (RV1607) rides ONLY under the
      // child-result opt-in, whose toolset carries the tools the line
      // names: a plain run keeps its exact historical prompt bytes.
      // The eighteenth comparison benchmark's largest post-fan-in cost
      // was a first full draft composed only after await_all, while
      // every primitive for drafting earlier already existed.
      ...(opts?.exposeChildResultTools === true
        ? [
            'While children run: await_any returns the first settled digest, and a settled',
            "child's full output is readable immediately with get_child_result, so outline",
            'and draft from early results instead of composing everything after the last',
            'child settles.',
          ]
        : []),
      // The settled-set vocabulary (RV1807) rides ONLY under its own
      // opt-in, whose toolset carries the tool the lines name: a run
      // without it keeps its exact historical prompt bytes.
      ...(opts?.exposeSettledResultsTool === true
        ? [
            'Every await_any digest carries settledHandles: the exact settled subset of the',
            'handles you waited on. Read those with ONE get_settled_child_results call;',
            'never probe a handle with get_child_result to discover whether it settled.',
          ]
        : []),
      // The sectional line rides the coordination prompt only when the
      // coordination finish actually carries the sectional schema
      // (RV808b): the validator-bound loop or the draft gate.
      ...finishValidationPromptLines(
        validationSpec,
        coordSectionalFinish ? 'rejected-attempt' : undefined,
      ),
      ...acceptancePromptLines(opts?.acceptance),
    ];
    let result: AgentResult<unknown>;
    try {
      result = await runtime.runInScope(orchestratorState, () =>
        (ctx.agent as (prompt: string, o?: unknown) => Promise<AgentResult<unknown>>)(
          orchestratorPrompt(
            goal,
            opts?.maxSpawns,
            promptLines.length === 0 ? undefined : promptLines,
          ),
          agentOpts,
        ),
      );
      noteInternalSettle(result);
    } catch (thrown) {
      // The unfunded repair grant declines typed (RV2207): the seventh
      // parity run's synthesis died between a granted repair verdict
      // and its dispatch, and even with the refusal's message riding
      // the terminal (RV2104) the death stayed an untyped budget error
      // with no journal record of the grant the money never covered.
      // The ctx boundary re-mints budget deaths generically, so the
      // agent-loop marker survives only on the terminal entry behind
      // data.entryRef (the RV2103 pattern): the decline journals the
      // arithmetic and the run fails as a TYPED validation failure,
      // enriched with the same pass truth every other synthesis-path
      // failure carries (RV2203).
      if (thrown instanceof BudgetExhaustedError) {
        const repairEntryRef = (thrown.data as { entryRef?: unknown } | undefined)?.entryRef;
        const repairTerminal =
          typeof repairEntryRef === 'number'
            ? internals.replayer.snapshot().find((entry) => entry.seq === repairEntryRef)
            : undefined;
        const repairMessage = repairTerminal?.error?.message ?? '';
        if (repairMessage.includes('the granted repair turn could not be funded: ')) {
          const repairDeclineKey = deriverV2.deriveKey({
            kind: 'orchestrator-repair-grant-declined',
          });
          if (
            !internals.replayer
              .snapshot()
              .some((entry) => entry.kind === 'decision' && entry.key === repairDeclineKey)
          ) {
            await internals.replayer.appendSinglePhase({
              scope: callingState.scope,
              key: repairDeclineKey,
              kind: 'decision',
              status: 'ok',
              spanId: internals.spans.mint(callingState.spanId),
              site: 'orchestrator-budget',
              value: {
                decisionType: 'orchestrator_repair_grant_declined',
                reason: repairMessage.slice(0, 300),
                terminalRef: repairTerminal?.seq ?? null,
                remainingUsd: internals.budget.remainingUsd() ?? null,
              },
            });
          }
          throw new FailRunError(
            `the orchestrator finish could not complete its granted repair: ${repairMessage}`,
            { data: { source: 'orchestrator_finish_validation' } },
          );
        }
      }
      const budgetReason =
        thrown instanceof BudgetExhaustedError
          ? (thrown.data as { reason?: string } | undefined)?.reason
          : undefined;
      // The bare root ceiling folds documented (RV2205): a coordination
      // turn refused by the RUN account's own hard crossing (the ctx
      // boundary re-mint with source 'root', or a pre-admission refusal
      // of the coordinator's own seat with account 'run') used to
      // rethrow bare, the last undocumented money death of the loop. It
      // folds through the SAME machinery as the exposure and floor
      // arms, and the synthesis redemption below stays free to TRY:
      // past a crossed run ceiling its spawn admission declines with
      // the arithmetic and journals the declined verdict (RV2102). The
      // orchestrator cap keeps its dedicated atCap machinery, and any
      // other unrecognized budget shape still rethrows.
      const crossed =
        thrown instanceof BudgetExhaustedError
          ? (thrown.data as { source?: string; account?: string } | undefined)
          : undefined;
      if (
        budgetReason !== 'in-flight-exposure' &&
        budgetReason !== 'output-floor' &&
        crossed?.source !== 'root' &&
        crossed?.account !== 'run'
      ) {
        throw thrown;
      }
      // The refused coordination turn (RV1902, widened by RV2101): the
      // exposure arm cannot fit the cap with no live hold left to wait
      // out, and the output-floor arm cannot afford one output token
      // past the reserve line. Both are genuine terminals, but the
      // DOCUMENTED ones: exhaustion with the settled partial, never a
      // bare escape that tears the run down around its own evidence
      // (the four-role benchmark's recovery arm settled a null-valued
      // exhausted on the first shape, and the fourth parity run died
      // bare on the second, one turn short of the synthesis its
      // reserve was holding money for). No further coordination
      // dispatch is attempted, because it faces the same refused
      // arithmetic; the fold below is pure over the settled records
      // and journals its decision for replay identity.
      const exposureKey = deriverV2.deriveKey({ kind: 'orchestrator-exposure-fallback' });
      if (
        !internals.replayer
          .snapshot()
          .some((entry) => entry.kind === 'decision' && entry.key === exposureKey)
      ) {
        await internals.replayer.appendSinglePhase({
          scope: callingState.scope,
          key: exposureKey,
          kind: 'decision',
          status: 'ok',
          spanId: internals.spans.mint(callingState.spanId),
          site: 'orchestrator-budget',
          value: {
            decisionType: 'orchestrator_finalize_fallback',
            reason:
              budgetReason === 'output-floor'
                ? 'budget-floor'
                : budgetReason === 'in-flight-exposure'
                  ? 'exposure-abort'
                  : 'budget-ceiling',
            turnsUsed: 0,
            foldParams: { planHash: '', digestOrdinalMax: wakeOrdinal },
          },
        });
      }
      internals.budget.markExhausted();
      const foldEnvelope = () => ({
        forcedFinishFallback: true,
        completion: 'partial',
        planHash: '',
        completed: [...byOrdinal.values()]
          .filter((record) => record.settled !== undefined)
          .sort((a, b) => a.spawnOrdinal - b.spawnOrdinal)
          .map((record) => digestOf(record, record.settled as AgentResult<unknown>)),
      });
      // The synthesis promise is redeemed, not abandoned (RV2101): the
      // reserve was held all run exactly so the tail could still run
      // at this boundary. With a configured synthesis step, the
      // reserve still committed, and at least one settled child to
      // synthesize from, the EXISTING synthesis path runs with no
      // coordination draft (runSynthesis releases the reserve before
      // its dispatch, so the freed money funds it); its contracted
      // output rides the fold envelope as `result`.
      const synthesisReserveStillCommitted =
        orchestratorAccount !== undefined &&
        (internals.budget.accountView(orchestratorAccount)?.synthesisReserveUsd ?? 0) > 0;
      const anySettled = [...byOrdinal.values()].some((record) => record.settled !== undefined);
      if (opts?.synthesis !== undefined && synthesisReserveStillCommitted && anySettled) {
        // The stragglers drain FIRST (RV2102): at the reserve line
        // every remaining child's next turn faces the same refused
        // arithmetic, but its committed admission reserve and any
        // in-flight wire block the synthesis spawn the redemption
        // exists for. The fifth parity pair proved both arms: a live
        // worker's 0.66 reserve pushed the synthesis admission past
        // the ceiling, and its post-boundary finalize burned 148k
        // input tokens before teardown cancelled it. Abort every
        // unsettled child and await its terminal: the reserves release
        // at the terminals, no NEW wire dispatches past the boundary,
        // and a severed in-flight stream bills as the documented
        // layer-3 overshoot. Result promises never reject (the
        // SpawnRecord contract), so the drain always settles.
        const stragglers = [...byOrdinal.values()].filter((record) => record.settled === undefined);
        for (const record of stragglers) {
          record.abort();
        }
        await Promise.all(stragglers.map((record) => record.result));
        // The terminal behind the boundary re-mint (RV2103): the
        // exhausted flag is armed at this fallback by design, so a
        // synthesis attempt that dies ON the wire reaches the catch
        // below as the ctx boundary's generic budget error, and the
        // sixth parity run journaled "run budget ceiling reached" over
        // a stream that idled out with $0.9077 uncommitted. The
        // re-mint carries the terminal's seq in data.entryRef; the
        // terminal entry carries the message and the error class that
        // actually ended the attempt. A refusal thrown BEFORE dispatch
        // (the admission arithmetic) has no terminal and its own
        // message already tells the truth.
        const synthesisTerminalOf = (declined: unknown) => {
          if (!(declined instanceof BudgetExhaustedError)) {
            return undefined;
          }
          const entryRef = (declined.data as { entryRef?: unknown } | undefined)?.entryRef;
          if (typeof entryRef !== 'number') {
            return undefined;
          }
          return internals.replayer.snapshot().find((entry) => entry.seq === entryRef);
        };
        let synthesisTransportRetried = false;
        for (;;) {
          try {
            const synthesized = await runSynthesis(undefined);
            return { ...foldEnvelope(), result: synthesized };
          } catch (declined) {
            const terminal = synthesisTerminalOf(declined);
            // One transport retry of the severed attempt (RV2103): a
            // cut stream is a death of the ATTEMPT, not of the money,
            // and the loop's own wire retries never cover a mid-stream
            // idle abort (the loop terminates with retryable true,
            // addressed to exactly this caller). The second attempt
            // re-passes spawn admission from the live remainder, so an
            // unaffordable retry declines below with the admission
            // arithmetic instead of dispatching; the journaled retry
            // decision keeps the second wire auditable, and a resume
            // reruns the errored attempt under the memoize rules with
            // the decision guard holding the record single.
            if (
              !synthesisTransportRetried &&
              terminal !== undefined &&
              terminal.error !== undefined &&
              (terminal.error.data as { kind?: unknown } | undefined)?.kind === 'transport' &&
              terminal.error.retryable === true
            ) {
              synthesisTransportRetried = true;
              const retryKey = deriverV2.deriveKey({
                kind: 'orchestrator-synthesis-redemption-retry',
              });
              if (
                !internals.replayer
                  .snapshot()
                  .some((entry) => entry.kind === 'decision' && entry.key === retryKey)
              ) {
                await internals.replayer.appendSinglePhase({
                  scope: callingState.scope,
                  key: retryKey,
                  kind: 'decision',
                  status: 'ok',
                  spanId: internals.spans.mint(callingState.spanId),
                  site: 'orchestrator-budget',
                  value: {
                    decisionType: 'orchestrator_synthesis_redemption_retry',
                    reason: terminal.error.message.slice(0, 300),
                    terminalRef: terminal.seq,
                    remainingUsd: internals.budget.remainingUsd() ?? null,
                  },
                });
              }
              continue;
            }
            // The declined redemption journals its verdict (RV2102):
            // the fifth pair's silent fold hid WHY no synthesis ran
            // (an admission refusal lived only in a swallowed throw).
            // The reason is the terminal's own message when the
            // attempt died on the wire (RV2103), the thrown text
            // otherwise, beside the post-release remainder, so a
            // journal reader can audit the arithmetic or the transport
            // fault that declined the tail.
            const declineKey = deriverV2.deriveKey({
              kind: 'orchestrator-synthesis-redemption-declined',
            });
            if (
              !internals.replayer
                .snapshot()
                .some((entry) => entry.kind === 'decision' && entry.key === declineKey)
            ) {
              await internals.replayer.appendSinglePhase({
                scope: callingState.scope,
                key: declineKey,
                kind: 'decision',
                status: 'ok',
                spanId: internals.spans.mint(callingState.spanId),
                site: 'orchestrator-budget',
                value: {
                  decisionType: 'orchestrator_synthesis_redemption_declined',
                  reason: (
                    terminal?.error?.message ??
                    (declined instanceof Error ? declined.message : String(declined))
                  ).slice(0, 300),
                  ...(terminal === undefined ? {} : { terminalRef: terminal.seq }),
                  remainingUsd: internals.budget.remainingUsd() ?? null,
                  stragglersDrained: stragglers.length,
                  transportRetries: synthesisTransportRetried ? 1 : 0,
                },
              });
            }
            return foldEnvelope();
          }
        }
      }
      return foldEnvelope();
    }
    const liveTermination = extensionTermination;
    if (liveTermination !== undefined) {
      // The declared fail-run policy engaged during the run and aborted the loop.
      throw liveTermination;
    }
    if (capDecisionRef !== undefined) {
      // The cap fired while the loop was suspended in a wake; the
      // forced-finish abort ended it.
      return await settleCapOutcome();
    }
    /**
     * The finish-validation failure enrichment (the v1.71 experiment
     * review, P0.8 remainder + P1.7; widened by cycle 73): every typed
     * failure a finish rejection produces gains the verdict-derived
     * repair taxonomy read from the JOURNALED validation decisions of
     * the CURRENT contract generation (identical live and on replay),
     * the schema-dead finish exchange counter derived from the
     * coordination and synthesis windows (the class the v1.74 run lost
     * six payloads to, invisible in every other field), and, when an
     * acceptance verdict exists, the acceptance snapshot the children
     * already earned: completion and childStatusCounts, and now the
     * degradation facts beside them (degradedReasons and the salvage
     * lists), exactly what the ok envelope reports. The
     * rejection-past-the-bound error keeps its own
     * repairsUsed/maxRepairs/failed untouched.
     */
    // The post-acceptance synthesis decline journals its verdict
    // (RV2201): the seventh subscription parity run resumed into a
    // starved lifetime spawn counter, the synthesis admission refused
    // AFTER the accepted acceptance verdict, and the refusal reached
    // the terminal as a bare message with no decision entry: the
    // reserve's money was whole and the journal said nothing about why
    // no synthesis ran. Same decision type as the redemption decline
    // (RV2102), because a journal reader asks one question either way:
    // why did the tail not run. The two sites cannot both fire in one
    // run: the redemption path exists only when the coordination loop
    // died at its budget boundary, this one only when it finished.
    const journalSynthesisAdmissionDecline = async (thrown: unknown): Promise<void> => {
      if (!(thrown instanceof BudgetExhaustedError)) {
        return;
      }
      const declineKey = deriverV2.deriveKey({
        kind: 'orchestrator-synthesis-redemption-declined',
      });
      if (
        internals.replayer
          .snapshot()
          .some((entry) => entry.kind === 'decision' && entry.key === declineKey)
      ) {
        return;
      }
      await internals.replayer.appendSinglePhase({
        scope: callingState.scope,
        key: declineKey,
        kind: 'decision',
        status: 'ok',
        spanId: internals.spans.mint(callingState.spanId),
        site: 'orchestrator-budget',
        value: {
          decisionType: 'orchestrator_synthesis_redemption_declined',
          reason: thrown.message.slice(0, 300),
          remainingUsd: internals.budget.remainingUsd() ?? null,
          spawnHeadroom: internals.budget.spawnHeadroom,
          path: 'accepted-finish',
        },
      });
    };
    /**
     * The pass summaries as one builder (RV2203): the ok envelope and
     * the failure enrichment must tell the same {ran, reason} story,
     * with only the synthesis arm differing by path.
     */
    const semanticPassesSummary = (synthesis: { ran: boolean; reason?: string }): Json => ({
      contradictions:
        opts?.contradictions === undefined
          ? { ran: false, reason: 'not-configured' }
          : contradictionsFound === undefined
            ? { ran: false, reason: 'not-run' }
            : { ran: true },
      claimConsistency:
        opts?.claimConsistency === undefined
          ? { ran: false, reason: 'not-configured' }
          : claimConsistencyMeta === undefined
            ? { ran: false, reason: 'not-run' }
            : { ran: true },
      synthesis,
    });
    /**
     * The no-regression fallback verdict (RV2505), set only when the
     * floor actually caught a failing synthesis: the truncated failure
     * message and the journal seq of the decision that recorded it.
     */
    let synthesisRegressed: { reason: string; decisionRef: number } | undefined;
    /**
     * The no-regression floor under the synthesis (RV2505, the 1.226.0
     * comparison run): a synthesis that fails terminally must not throw
     * away a coordination draft the SAME declared contract accepts.
     * Judges the draft with the validator bundle, journals what it
     * found either way, and answers whether the caller should settle on
     * the draft instead of rethrowing. Pure: the verdict is a function
     * of the draft and the validators, so a resume that re-fails the
     * synthesis re-derives the identical answer, and the journaled
     * decision is reused rather than duplicated.
     */
    const draftFallbackOnRegression = async (
      draft: unknown,
      thrown: unknown,
    ): Promise<{ used: boolean }> => {
      const floorOn = opts?.synthesis?.fallbackToValidDraft === true;
      if (!floorOn || validationSpec === undefined) {
        return { used: false };
      }
      if (thrown instanceof ConfigError) {
        // A ConfigError is the CONTRACT being broken, not the model
        // failing it: the documented remedy is to fix the config and
        // resume, and settling on a draft would bury the defect. The
        // skip pre-pass rethrows validator ConfigErrors for the same
        // reason.
        return { used: false };
      }
      const draftValue = (draft ?? null) as Json | null;
      const draftHash = createHash('sha256').update(jcsSerialize(draftValue), 'utf8').digest('hex');
      const validatorNames = validationSpec.validators.map((validator) => validator.name);
      const input: FinishValidationInput = {
        result: draftValue,
        text: typeof draftValue === 'string' ? draftValue : JSON.stringify(draftValue),
        children: validationChildren(),
      };
      // Every validator runs: the whole point of the decline entry is
      // to name what the draft itself failed, so the first-failure
      // short circuit of the skip pre-pass would under-report here.
      const failed: { name: string; reasons: string[] }[] = [];
      for (const validator of validationSpec.validators) {
        let verdict: FinishValidationVerdict;
        try {
          verdict = validator.validate(input);
        } catch (validatorThrew) {
          throw new ConfigError(
            `finish validator '${validator.name}' threw instead of returning a verdict ` +
              'during the fallbackToValidDraft judgement: ' +
              (validatorThrew instanceof Error ? validatorThrew.message : String(validatorThrew)),
          );
        }
        if (!verdict.ok) {
          failed.push({ name: validator.name, reasons: verdict.reasons });
        }
      }
      const regressed = failed.length === 0;
      const reason = (thrown instanceof Error ? thrown.message : String(thrown)).slice(0, 300);
      const key = deriverV2.deriveKey({
        kind: regressed
          ? 'orchestrator-synthesis-regressed'
          : 'orchestrator-synthesis-fallback-declined',
      });
      const prior = internals.replayer
        .snapshot()
        .find((entry) => entry.kind === 'decision' && entry.key === key);
      const entryRef =
        prior?.seq ??
        (
          await internals.replayer.appendSinglePhase({
            scope: callingState.scope,
            key,
            kind: 'decision',
            status: 'ok',
            spanId: internals.spans.mint(callingState.spanId),
            site: 'orchestrator-synthesis-fallback',
            value: {
              decisionType: regressed
                ? 'orchestrator_synthesis_regressed'
                : 'orchestrator_synthesis_fallback_declined',
              reason,
              validators: validatorNames,
              ...(regressed ? {} : { failed: failed as unknown as Json }),
              // The same binding the skip and gaps decisions carry
              // (RV603): the contract generation and the judged draft.
              ...(validationSpec.contract === undefined
                ? {}
                : { contractHash: validationSpec.contract.hash }),
              draftHash,
            },
          })
        ).seq;
      internals.events.emit(
        {
          type: 'log',
          level: 'warn',
          msg: regressed
            ? 'orchestrator synthesis regressed'
            : 'orchestrator synthesis fallback declined',
          data: {
            reason,
            decisionRef: entryRef,
            ...(regressed ? {} : { draftFailed: failed.map((row) => row.name) }),
          },
        },
        callingState.spanId,
      );
      if (!regressed) {
        return { used: false };
      }
      synthesisRegressed = { reason, decisionRef: entryRef };
      return { used: true };
    };
    /**
     * The explicit deliverable verdict (RV2506, the 1.226.0 comparison
     * run): whether the artifact THIS terminal carries was accepted by
     * the declared finish contract, whether there is an artifact to
     * read at all, and where its acceptance is journaled. The harness
     * that scored the comparison could not answer the first question
     * from the terminal: it read `status: 'ok'`, and the run had in
     * fact accepted its children, failed its synthesis three times,
     * and settled carrying nothing the contract ever accepted. Every
     * input is a fact the run already journaled, so the verdict is
     * derived, never remembered, and a resume re-derives the same one.
     *
     * `deliverableAccepted` is ABSENT (never false) when no
     * `finishValidation` was declared: nothing judged anything, and
     * the RV1209 provenance doctrine says absence means NOT RECORDED.
     * `acceptedArtifactRef` names the decision entry that holds the
     * acceptance, which is the finish-validation decision on the
     * ordinary path, the RV510 skip decision when the gate skipped the
     * synthesis, and the RV2505 regression decision when a failing
     * synthesis handed the run back to its draft: three different
     * entries, one question, one field.
     */
    const deliverableVerdict = (
      artifact: unknown,
    ): {
      deliverableAccepted?: boolean;
      resultAvailable: boolean;
      acceptedArtifactRef?: number;
    } => {
      const resultAvailable = artifact !== undefined && artifact !== null;
      if (validationSpec === undefined) {
        return { resultAvailable };
      }
      if (synthesisRegressed !== undefined) {
        return {
          resultAvailable,
          deliverableAccepted: true,
          acceptedArtifactRef: synthesisRegressed.decisionRef,
        };
      }
      if (synthesisSkipDecisionRef !== undefined) {
        return {
          resultAvailable,
          deliverableAccepted: true,
          acceptedArtifactRef: synthesisSkipDecisionRef,
        };
      }
      // The LAST accepted verdict of the CURRENT contract generation:
      // a fixed contract supersedes the acceptance rendered under the
      // old one (cycle 73), exactly as the repair budget does.
      const accepted = internals.replayer
        .snapshot()
        .filter((entry) => {
          if (entry.kind !== 'decision' || entry.scope !== callingState.scope) {
            return false;
          }
          const value = entry.value as
            { decisionType?: string; verdict?: string; contractHash?: string } | undefined;
          return (
            value?.decisionType === 'orchestrator_finish_validation' &&
            value.verdict === 'accepted' &&
            contractGenerationCurrent(value)
          );
        })
        .at(-1);
      return accepted === undefined
        ? { resultAvailable, deliverableAccepted: false }
        : { resultAvailable, deliverableAccepted: true, acceptedArtifactRef: accepted.seq };
    };
    /**
     * The rejected candidates of the CURRENT contract generation, in
     * judgement order (RV2507): a pure fold over decisions the journal
     * already holds, so a resume re-derives the identical list without
     * re-running a validator. A superseded generation's rejections stay
     * in the journal as the history they are and drop out here, exactly
     * as they drop out of the repair budget.
     */
    const rejectedFinishCandidates = (): RejectedFinishCandidate[] =>
      validationDecisions()
        .filter(
          (decision) =>
            decision.verdict !== 'accepted' &&
            contractGenerationCurrent(decision) &&
            decision.candidateHash !== undefined,
        )
        .map((decision) => ({
          callId: decision.callId,
          verdict: decision.verdict as 'repair' | 'rejected',
          hash: decision.candidateHash ?? '',
          chars: decision.candidateChars ?? 0,
          failed: decision.failed,
          ...(decision.candidateRef === undefined ? {} : { ref: decision.candidateRef }),
        }));
    const enrichSynthesisFailure = (
      thrown: unknown,
      snapshot?: {
        completion: Json;
        childStatusCounts: Json;
        degradedReasons: Json;
        salvagedPartialChildren?: Json;
        salvagedTerminalOutputChildren?: Json;
      },
    ): never => {
      // The failure envelope carries the pass truth (RV2203): the
      // RV2106 mirror run's error terminal read claimConsistencyMeta
      // null over a journal holding the declined-judge verdict, and
      // the seventh subscription parity resume settled exhausted with
      // completion null over a journaled accepted acceptance. The same
      // facts the ok envelope reports ride every enriched failure.
      const passTruth: Record<string, Json> = {
        ...(claimConsistencyMeta === undefined
          ? {}
          : { claimConsistencyMeta: claimConsistencyMeta as unknown as Json }),
        semanticPasses: semanticPassesSummary({ ran: false, reason: 'synthesis-failed' }),
        // The deliverable verdict rides the FAILED terminal too
        // (RV2506). Nothing reaches this enrichment with an accepted
        // artifact: an accepted synthesis never throws, and the RV2505
        // floor returns before the rethrow, so the honest reading of
        // every enriched failure is the same one, and it stays absent
        // where no contract was ever declared.
        resultAvailable: false,
        ...(validationSpec === undefined ? {} : { deliverableAccepted: false }),
      };
      // What the contract rejected on the way here (RV2507): the
      // failure terminal is exactly where a post-mortem looks, and it
      // used to name the LAST verdict's validators and nothing else.
      const rejected = rejectedFinishCandidates();
      if (rejected.length > 0) {
        passTruth.rejectedFinishCandidates = rejected as unknown as Json;
      }
      if (thrown instanceof BudgetExhaustedError) {
        // The class is the status: BudgetExhaustedError derives the
        // 'exhausted' outcome, so the enrichment rebuilds the same
        // class with the same message and the widened data.
        throw new BudgetExhaustedError(thrown.message, {
          data: {
            ...((thrown.data ?? {}) as Record<string, Json>),
            ...(snapshot ?? {}),
            ...passTruth,
          },
        });
      }
      if (!(thrown instanceof FailRunError)) {
        throw thrown;
      }
      const base = (thrown.data ?? {}) as Record<string, Json>;
      const spent = validationDecisions().filter(
        (candidate) => candidate.verdict !== 'accepted' && contractGenerationCurrent(candidate),
      );
      const rejectedValidators = [
        ...new Set(spent.flatMap((candidate) => candidate.failed.map((f) => f.name))),
      ];
      const schemaRejected =
        (result.schemaRejectedTerminalExchanges ?? 0) + synthesisSchemaRejectedExchanges;
      const schemaRecovered =
        (result.schemaRecoveredTerminalExchanges ?? 0) + synthesisSchemaRecoveredExchanges;
      throw new FailRunError(thrown.message, {
        data: {
          ...base,
          ...(snapshot ?? {}),
          ...passTruth,
          ...(spent.length === 0 || base.repairsUsed !== undefined
            ? {}
            : {
                repairsUsed: spent.length,
                maxRepairs: validationSpec?.maxRepairs ?? DEFAULT_FINISH_MAX_REPAIRS,
                rejectedValidators,
              }),
          ...(schemaRejected === 0 || base.schemaRejectedFinishExchanges !== undefined
            ? {}
            : { schemaRejectedFinishExchanges: schemaRejected }),
          ...(schemaRecovered === 0 || base.schemaRecoveredFinishExchanges !== undefined
            ? {}
            : { schemaRecoveredFinishExchanges: schemaRecovered }),
        },
      });
    };
    if (validationTermination !== undefined) {
      // The final finish rejection (or a defective validator) aborted
      // the loop; the typed failure wins over the cancelled status, and
      // the journaled rejected verdict makes a resume identical. The
      // enrichment adds the window-derived schema counter (a defective
      // validator's ConfigError passes through untouched).
      enrichSynthesisFailure(validationTermination);
    }
    if (orchestratorAccount !== undefined) {
      internals.cost.orchestrator.spentUsd =
        internals.budget.accountView(orchestratorAccount)?.spentUsd ?? 0;
    }
    // The loop's terminal-tool discipline makes 'ok' here PROOF that
    // finish({ result }) validated and was intercepted: a turn ending
    // without the tool re-prompts and terminates as a bounded 'limit'
    // when the model never complies, so unproven output cannot reach
    // this return (the forced-finish path above owns the exhaustion
    // exception and synthesizes its partial without the tool).
    if (result.status !== 'ok') {
      throw new ConfigError(
        `the orchestrator agent terminated with status '${result.status}'` +
          (result.errorMessage === undefined ? '' : `: ${result.errorMessage}`),
      );
    }
    if (opts?.acceptance === undefined) {
      // Without an acceptance policy there is no verdict to order
      // against, but the chokepoint is the same one: the pass runs
      // before the synthesis dispatch it may cancel.
      await runContradictionPass();
      if (claimStage !== 'final') {
        await runClaimConsistencyPass(result.output);
      }
      let bare: unknown;
      try {
        bare = await runSynthesis(result.output);
      } catch (thrown) {
        await journalSynthesisAdmissionDecline(thrown);
        // The no-regression floor (RV2505). Without an acceptance
        // policy the return value is the bare result, so the draft
        // rides it directly and the journaled decision is the record.
        if ((await draftFallbackOnRegression(result.output, thrown)).used) {
          bare = result.output;
        } else {
          return enrichSynthesisFailure(thrown);
        }
      }
      // The final gate (RV2509): the shipped artifact judged by the
      // same pass, after the synthesis rewrote it. Without an
      // acceptance envelope there is nowhere to report the meta, so
      // this arm exists for its GATE: an armed 'fail' posture still
      // stops a run whose composition contradicts its own pool.
      if (claimStage !== 'draft') {
        await runClaimConsistencyPass(bare, undefined, 'final');
      }
      return bare;
    }

    // The acceptance settle: the JOURNALED decision entry is the
    // authority. On the first pass the child fold runs live and the
    // verdict is appended; a resume finds the entry and rolls the SAME
    // verdict, counts, and reasons forward, so the settle branch and the
    // envelope are immune to drift of the live options and to children
    // whose settle raced the finish.
    interface AcceptanceDecision {
      decisionType: 'orchestrator_acceptance';
      verdict: 'accepted' | 'rejected';
      completion: 'complete' | 'partial' | 'rejected';
      childPolicy: 'all-ok' | { minSuccessful: number };
      childStatusCounts: Record<string, number>;
      degradedReasons: string[];
      /**
       * The spawned-roster floor and the actual roster (RV507): present
       * ONLY when acceptance.minSpawnedChildren was configured, so every
       * earlier decision (and every run without the floor) keeps its
       * exact bytes.
       */
      minSpawnedChildren?: number;
      spawnedChildren?: number;
      /** Limit children salvaged by acceptPartialChildren (RV-210 close-out); absent before it. */
      salvagedPartialChildren?: string[];
      /**
       * Limit children salvaged by acceptValidatedTerminalOutputOnLimit
       * (the 1.64.0 experiment review, P0.4 + P1.1); absent before it.
       */
      salvagedTerminalOutputChildren?: string[];
      /**
       * Present when this rejection skipped a CONFIGURED synthesis step
       * (the 1.65.0 experiment review, item 11.4): the machine-readable
       * cause, frozen into the journaled decision so a resume re-throws
       * the identical fact. Absent on accepted verdicts, on runs without
       * synthesis, and on decisions written before this shipped.
       */
      synthesisSkipped?: OrchestrateSynthesisSkipReason;
      /**
       * Children that settled 'ok' BELOW their declared evidence floor
       * (RV1412), a fact list in both modes: present whenever such
       * children exist, absent otherwise (and on decisions written
       * before this shipped). Under the default the verdict is
       * untouched and the shortfall is a degradation note; under
       * `requireEvidenceFloor` these children also count against the
       * policy, exactly like the salvage arms under RV1207.
       */
      belowFloorOkChildren?: string[];
      /**
       * The per-child machine roster (RV806): status, salvage arm, and
       * the evidence verdict where the child declared a contract,
       * `waivedBySalvage` marking a below-floor child a salvage arm
       * accepted. Journaled with the decision so the envelope and every
       * resume read the same roster; absent on decisions written before
       * this shipped. Children restored from a journal without live
       * settled results may lack the evidence verdict, honestly.
       */
      children?: AcceptanceChildSummary[];
      /**
       * Children still RUNNING when finish validated (RV1807), the
       * structured form of the degradedReasons prose: the late-child
       * boundary is explicit and machine-readable. A late child's
       * later settle never re-enters the contradiction or claim pools
       * (the pools are the acceptance roster, frozen here); a consumer
       * that needs late output waits on `all-ok` or re-reads the
       * journal. Present only when such children existed, so every
       * earlier decision keeps its exact bytes.
       */
      unsettledAtFinish?: string[];
    }
    const acceptanceKey = 'acceptance';
    const priorAcceptance = internals.replayer
      .snapshot()
      .find(
        (entry) =>
          entry.kind === 'decision' &&
          entry.scope === callingState.scope &&
          entry.key === acceptanceKey,
      );
    let decision: AcceptanceDecision;
    // From here a verdict exists, live or rolled forward from the
    // journal, and it is the authority on the roster (RV2602): the
    // pre-acceptance fold stands down so the two never both report.
    acceptanceRendered = true;
    if (priorAcceptance !== undefined) {
      decision = priorAcceptance.value as unknown as AcceptanceDecision;
    } else {
      const childStatusCounts: Record<string, number> = {};
      const degradedReasons: string[] = [];
      const salvaged: string[] = [];
      const salvagedOutput: string[] = [];
      // Children still running when finish validated (RV1807).
      const unsettledAtFinish: string[] = [];
      // Ok children below their declared evidence floor (RV1412): a
      // fact list in both modes, and under requireEvidenceFloor also
      // the children the policy count excludes.
      const belowFloorOk: string[] = [];
      let okGatedBelowFloor = 0;
      // Degradations the policy still counts: with acceptPartialChildren
      // a limit child carrying a structured partial moves to `salvaged`
      // instead (RV-210 close-out) and keeps only its degradedReasons
      // note; with acceptValidatedTerminalOutputOnLimit a limit child
      // carrying a terminal output moves to `salvagedOutput` (the
      // 1.64.0 experiment review, P0.4 + P1.1), and the output arm wins
      // when both apply (the reserve summary already passed the child's
      // output validation, so it is the stronger evidence).
      let hardDegraded = 0;
      const acceptPartial = opts.acceptance.acceptPartialChildren === true;
      const acceptOutput = opts.acceptance.acceptValidatedTerminalOutputOnLimit === true;
      const sortedRecords = [...byOrdinal.values()].sort((a, b) => a.spawnOrdinal - b.spawnOrdinal);
      // The per-child machine roster (RV806): one row per spawned
      // child, in spawn order, carrying what the name lists above
      // cannot: the evidence verdict of each child that declared a
      // contract, with waivedBySalvage on a below-floor child a
      // salvage arm accepted anyway.
      const childrenSummary: AcceptanceChildSummary[] = [];
      const noteChild = (
        record: (typeof sortedRecords)[number],
        status: string,
        salvage?: 'partial' | 'terminal-output',
        /** RV1207: the arm applied but the declared floor blocked promotion. */
        floorBlocked?: true,
      ): void => {
        const evidence = record.settled?.evidence;
        childrenSummary.push({
          child: record.nodeId,
          status,
          ...(salvage === undefined ? {} : { salvage }),
          ...(evidence === undefined
            ? {}
            : {
                evidence: {
                  ...evidence,
                  ...(floorBlocked === true
                    ? { floorRequired: true as const }
                    : salvage !== undefined && !evidence.met
                      ? { waivedBySalvage: true as const }
                      : {}),
                },
              }),
        });
      };
      // The binding evidence floor (RV1207): a child that declared a
      // contract it did not meet is never PROMOTED by a salvage arm.
      // The arm still runs for the roster and the degraded note, so the
      // report stays diagnostic; only the acceptance count changes.
      const requireFloor = opts.acceptance.requireEvidenceFloor === true;
      const floorBlocks = (record: (typeof sortedRecords)[number]): boolean => {
        const evidence = record.settled?.evidence;
        return requireFloor && evidence !== undefined && !evidence.met;
      };
      const noteFloorShortfall = (record: (typeof sortedRecords)[number]): void => {
        const evidence = record.settled?.evidence;
        degradedReasons.push(
          `child ${record.nodeId} is below its declared evidence floor ` +
            `(${String(evidence?.recordedEntries ?? 0)} of ${String(evidence?.minEntries ?? 0)} ` +
            'entries recorded) and the acceptance policy requires the evidence floor',
        );
      };
      for (const record of sortedRecords) {
        const status = record.settled?.status ?? 'running';
        childStatusCounts[status] = (childStatusCounts[status] ?? 0) + 1;
        if (status === 'ok') {
          // The ok-child evidence floor (RV1412): RV1207 bound the
          // floor for the salvage arms, but a child that settled 'ok'
          // below its declared floor sailed through with a clean
          // headline (the roster row said met: false while completion
          // said 'complete'). The shortfall is a degradation note by
          // default, so the completion claim stays honest; the verdict
          // changes only under the same opt-in flag, where the child
          // counts against the policy exactly like a floor-blocked
          // salvage arm. The status count above stays factual either
          // way, and the child's output stays visible everywhere.
          const evidence = record.settled?.evidence;
          if (evidence !== undefined && !evidence.met) {
            belowFloorOk.push(record.nodeId);
            if (requireFloor) {
              hardDegraded += 1;
              okGatedBelowFloor += 1;
              noteChild(record, status, undefined, true);
              noteFloorShortfall(record);
            } else {
              noteChild(record, status);
              degradedReasons.push(
                `child ${record.nodeId} settled 'ok' below its declared evidence floor ` +
                  `(${String(evidence.recordedEntries)} of ${String(evidence.minEntries)} ` +
                  'entries recorded)',
              );
            }
            continue;
          }
          noteChild(record, status);
          continue;
        }
        if (
          acceptOutput &&
          status === 'limit' &&
          record.settled?.output !== null &&
          record.settled?.output !== undefined
        ) {
          if (floorBlocks(record)) {
            hardDegraded += 1;
            noteChild(record, status, 'terminal-output', true);
            noteFloorShortfall(record);
            continue;
          }
          salvagedOutput.push(record.nodeId);
          noteChild(record, status, 'terminal-output');
          degradedReasons.push(
            `child ${record.nodeId} accepted with its validated terminal output ` +
              `(settled 'limit' after the finalization reserve summary)`,
          );
          continue;
        }
        if (acceptPartial && status === 'limit' && record.settled?.partial !== undefined) {
          if (floorBlocks(record)) {
            hardDegraded += 1;
            noteChild(record, status, 'partial', true);
            noteFloorShortfall(record);
            continue;
          }
          salvaged.push(record.nodeId);
          noteChild(record, status, 'partial');
          degradedReasons.push(
            `child ${record.nodeId} accepted as partial (settled 'limit' with a structured partial)`,
          );
          continue;
        }
        hardDegraded += 1;
        noteChild(record, status);
        if (status === 'running') {
          unsettledAtFinish.push(record.nodeId);
        }
        degradedReasons.push(
          status === 'running'
            ? `child ${record.nodeId} was still running when finish validated`
            : `child ${record.nodeId} settled '${status}'`,
        );
      }
      const childPolicy = opts.acceptance.childPolicy;
      // The spawned-roster floor (RV507) binds under BOTH policies: a
      // policy over the settled statuses cannot see children that were
      // never spawned, so an intended fan-out that finished solo would
      // otherwise pass vacuously.
      const minSpawned = opts.acceptance.minSpawnedChildren;
      const rosterMet = minSpawned === undefined || sortedRecords.length >= minSpawned;
      if (!rosterMet) {
        degradedReasons.push(
          `only ${String(sortedRecords.length)} children were spawned; the acceptance policy ` +
            `requires at least ${String(minSpawned)} spawned children`,
        );
      }
      const accepted =
        rosterMet &&
        (childPolicy === 'all-ok'
          ? hardDegraded === 0
          : // The status count stays factual; under requireEvidenceFloor
            // the gated below-floor ok children are excluded from the
            // POLICY comparison only (RV1412).
            (childStatusCounts.ok ?? 0) -
              okGatedBelowFloor +
              salvaged.length +
              salvagedOutput.length >=
            childPolicy.minSuccessful);
      decision = {
        decisionType: 'orchestrator_acceptance',
        verdict: accepted ? 'accepted' : 'rejected',
        completion: !accepted ? 'rejected' : degradedReasons.length === 0 ? 'complete' : 'partial',
        childPolicy,
        childStatusCounts,
        degradedReasons,
        ...(minSpawned === undefined
          ? {}
          : { minSpawnedChildren: minSpawned, spawnedChildren: sortedRecords.length }),
        ...(salvaged.length === 0 ? {} : { salvagedPartialChildren: salvaged }),
        ...(salvagedOutput.length === 0 ? {} : { salvagedTerminalOutputChildren: salvagedOutput }),
        ...(belowFloorOk.length === 0 ? {} : { belowFloorOkChildren: belowFloorOk }),
        // The late-child boundary, machine-readable (RV1807).
        ...(unsettledAtFinish.length === 0 ? {} : { unsettledAtFinish }),
        children: childrenSummary,
        // A rejected verdict skips a configured synthesis step by design
        // (RV-211): the machine reason rides the decision (11.4), so the
        // journal, not the live options, is the authority on resume.
        ...(accepted || opts.synthesis === undefined
          ? {}
          : { synthesisSkipped: 'synthesis_skipped_by_acceptance' as const }),
      };
      await internals.replayer.appendSinglePhase({
        scope: callingState.scope,
        key: acceptanceKey,
        kind: 'decision',
        status: 'ok',
        spanId: internals.spans.mint(callingState.spanId),
        site: 'orchestrator-acceptance',
        value: decision,
      });
    }
    // The verdict speaks for itself on the stream (RV1906): between the
    // root's honest agent:end ok and a rejected run:end there used to
    // be silence, and the benchmark's operator had to reconstruct the
    // policy fold by hand. Emitted from the ONE journaled decision,
    // fresh and on the resume roll-forward alike.
    internals.events.emit(
      {
        type: 'orchestrator:acceptance',
        verdict: decision.verdict,
        completion: decision.completion,
        childStatusCounts: decision.childStatusCounts,
        ...(decision.minSpawnedChildren === undefined
          ? {}
          : {
              minSpawnedChildren: decision.minSpawnedChildren,
              spawnedChildren: decision.spawnedChildren ?? 0,
            }),
      },
      callingState.spanId,
    );
    if (decision.verdict === 'rejected') {
      if (decision.synthesisSkipped !== undefined) {
        // The skip is a designed outcome, not a failure: the info log
        // names the machine reason beside the zero synthesize spend
        // (11.4), on the live pass and on the resume roll-forward alike.
        internals.events.emit(
          {
            type: 'log',
            level: 'info',
            msg: 'orchestrator synthesis skipped',
            data: { reason: decision.synthesisSkipped },
          },
          callingState.spanId,
        );
      }
      const required =
        (decision.childPolicy === 'all-ok'
          ? 'every child ok'
          : `at least ${String(decision.childPolicy.minSuccessful)} children ok`) +
        (decision.minSpawnedChildren === undefined
          ? ''
          : `, with at least ${String(decision.minSpawnedChildren)} spawned children`);
      throw new FailRunError(
        `the orchestrator acceptance policy rejected the finish: ` +
          `${String(decision.childStatusCounts.ok ?? 0)} children settled 'ok' but the policy ` +
          `requires ${required}; degraded: ${decision.degradedReasons.join('; ')}`,
        {
          data: {
            source: 'orchestrator_acceptance',
            // The completion envelope contract (RV-207 tail): the engine
            // lifts these two onto run:end for the rejected terminal.
            completion: 'rejected',
            childPolicy: decision.childPolicy as unknown as Json,
            childStatusCounts: decision.childStatusCounts,
            degradedReasons: decision.degradedReasons,
            ...(decision.minSpawnedChildren === undefined
              ? {}
              : {
                  minSpawnedChildren: decision.minSpawnedChildren,
                  spawnedChildren: decision.spawnedChildren ?? 0,
                }),
            ...(decision.salvagedPartialChildren === undefined
              ? {}
              : { salvagedPartialChildren: decision.salvagedPartialChildren }),
            ...(decision.salvagedTerminalOutputChildren === undefined
              ? {}
              : { salvagedTerminalOutputChildren: decision.salvagedTerminalOutputChildren }),
            ...(decision.belowFloorOkChildren === undefined
              ? {}
              : { belowFloorOkChildren: decision.belowFloorOkChildren }),
            ...(decision.unsettledAtFinish === undefined
              ? {}
              : { unsettledAtFinish: decision.unsettledAtFinish }),
            ...(decision.children === undefined
              ? {}
              : { acceptanceChildren: decision.children as unknown as Json }),
            ...(decision.synthesisSkipped === undefined
              ? {}
              : { synthesisSkipped: decision.synthesisSkipped }),
            // The explicit pass summary (RV1906): a rejected run's
            // absent contradictions field used to be indistinguishable
            // from a pass that ran and found nothing; the summary says
            // WHY nothing looked.
            semanticPasses: {
              contradictions:
                opts.contradictions === undefined
                  ? { ran: false, reason: 'not-configured' }
                  : { ran: false, reason: 'run-rejected' },
              claimConsistency:
                opts.claimConsistency === undefined
                  ? { ran: false, reason: 'not-configured' }
                  : { ran: false, reason: 'run-rejected' },
              synthesis:
                opts.synthesis === undefined
                  ? { ran: false, reason: 'not-configured' }
                  : { ran: false, reason: 'run-rejected' },
            } as unknown as Json,
          },
        },
      );
    }
    // The ACCEPTED salvage lists (RV1403), from the decision itself,
    // fresh or rolled forward, so the journal stays the authority on
    // resume and a floor-blocked child, which never entered them, never
    // enters the roster. The contradiction pass and the synthesis
    // evidence index judge exactly the roster these lists complete.
    acceptedSalvage = {
      partial: decision.salvagedPartialChildren ?? [],
      output: decision.salvagedTerminalOutputChildren ?? [],
      // Ok children the binding floor excluded from the policy count
      // (RV1412), read from the decision's own roster rows so a resume
      // derives the identical pool without consulting live options.
      excludedOk: (decision.children ?? [])
        .filter((row) => row.status === 'ok' && row.evidence?.floorRequired === true)
        .map((row) => row.child),
    };
    // The contradiction pass sits between the accepted verdict and the
    // synthesis dispatch (RV1302): a rejected run never reaches it, and
    // under 'fail' a self-contradicting pool never pays for the
    // invocation that would compose the disagreement away.
    await runContradictionPass({
      completion: decision.completion,
      childStatusCounts: decision.childStatusCounts,
      degradedReasons: decision.degradedReasons,
      ...(decision.salvagedPartialChildren === undefined
        ? {}
        : { salvagedPartialChildren: decision.salvagedPartialChildren }),
      ...(decision.salvagedTerminalOutputChildren === undefined
        ? {}
        : { salvagedTerminalOutputChildren: decision.salvagedTerminalOutputChildren }),
    });
    // The claim-consistency pass follows at the same chokepoint
    // (RV1502), strictly after the pure pool fold: a pool that
    // contradicts ITSELF fails before anything pays for a judge, and a
    // draft that contradicts its pool fails before anything pays for a
    // synthesis.
    const acceptanceSnapshot = {
      completion: decision.completion,
      childStatusCounts: decision.childStatusCounts,
      degradedReasons: decision.degradedReasons,
      ...(decision.salvagedPartialChildren === undefined
        ? {}
        : { salvagedPartialChildren: decision.salvagedPartialChildren }),
      ...(decision.salvagedTerminalOutputChildren === undefined
        ? {}
        : { salvagedTerminalOutputChildren: decision.salvagedTerminalOutputChildren }),
    };
    // Under `stage: 'final'` there is no pre-synthesis verdict at all
    // (RV2509): the gate the host asked for is over the composition,
    // and paying a judge to clear a draft it will not ship is exactly
    // the spend that setting exists to avoid.
    if (claimStage !== 'final') {
      await runClaimConsistencyPass(result.output, acceptanceSnapshot);
    }
    // Synthesis runs strictly AFTER the accepted verdict: a rejected run
    // never pays for a synthesis invocation (RV-211).
    let synthesizedFinal: unknown;
    try {
      synthesizedFinal = await runSynthesis(result.output);
    } catch (thrown) {
      await journalSynthesisAdmissionDecline(thrown);
      // The no-regression floor (RV2505): a draft the declared contract
      // accepts becomes the result instead of the run settling with
      // nothing, and the envelope says so.
      if ((await draftFallbackOnRegression(result.output, thrown)).used) {
        synthesizedFinal = result.output;
      } else {
        // The full acceptance snapshot rides the failure (cycle 73): the
        // error outcome names the same degradation facts the ok envelope
        // below reports, salvage lists included.
        enrichSynthesisFailure(thrown, {
          completion: decision.completion,
          childStatusCounts: decision.childStatusCounts,
          degradedReasons: decision.degradedReasons,
          ...(decision.salvagedPartialChildren === undefined
            ? {}
            : { salvagedPartialChildren: decision.salvagedPartialChildren }),
          ...(decision.salvagedTerminalOutputChildren === undefined
            ? {}
            : { salvagedTerminalOutputChildren: decision.salvagedTerminalOutputChildren }),
          ...(decision.belowFloorOkChildren === undefined
            ? {}
            : { belowFloorOkChildren: decision.belowFloorOkChildren }),
          ...(decision.children === undefined
            ? {}
            : { acceptanceChildren: decision.children as unknown as Json }),
        });
      }
    }
    // The final gate (RV2509), strictly AFTER the synthesis and before
    // the envelope: the pass judges the document the run actually
    // ships, and its failure posture is the pass's own, so an armed
    // 'fail' stops the run over a composition that contradicts the
    // pool it was composed from. Under 'both' the draft verdict is
    // preserved first, because this call overwrites the live one.
    if (claimStage !== 'draft') {
      claimConsistencyDraftMeta = claimStage === 'both' ? claimConsistencyMeta : undefined;
      await runClaimConsistencyPass(synthesizedFinal, acceptanceSnapshot, 'final');
      // The bounded post judge repair (RV3307), the honest carry for
      // the final stage: the 2026-08-12 comparison run settled
      // ok/complete over a finding its own final judge had named,
      // because nothing after the final pass could consume it. Under
      // 'repair' the findings ride ONE more synthesis invocation (the
      // same CLAIM CONTRADICTIONS block, over a prompt that now lies
      // ahead again), the repaired document is judged again, and
      // findings that survive the round fail the run typed: a gate
      // armed to repair must not pass silently when the repair did
      // not take. One round exactly, the evidence grade precedent.
      if (
        (opts?.claimConsistency?.onFound ?? 'report') === 'repair' &&
        claimFindingsFound !== undefined &&
        claimFindingsFound.length > 0
      ) {
        const hashOfDocument = (value: unknown): string =>
          createHash('sha256')
            .update(jcsSerialize(value ?? null), 'utf8')
            .digest('hex');
        const preRepairHash = hashOfDocument(synthesizedFinal);
        const carried = claimFindingsFound;
        // The convergence hold (RV3701, the third comparison
        // experiment's arc): the round is a two invocation bargain, and
        // admitting its composition on money that cannot also seat its
        // verdict pass buys a candidate nobody can rule on. The verdict
        // money is held BEFORE the round's admission runs, so the
        // round's own synthesis admission (and every concurrent spawn)
        // is checked against a remainder that already prices the
        // verdict, and a round the budget can only start refuses
        // pre dispatch through the honest 'could not dispatch' class
        // instead of dying past the candidate. Sized from the host's
        // declared `judge.estCost` first (exactly the figure the
        // second judge pass will reserve at its own admission, byte
        // for byte), else from this run's own observed post draft
        // judge price; zero (inert) only when neither exists.
        const convergenceHoldUsd =
          opts?.claimConsistency?.judge?.estCost ?? observedFinalJudgeCostUsd ?? 0;
        const convergenceScope = orchestratorAccount ?? ROOT_ACCOUNT;
        if (convergenceHoldUsd > 0) {
          internals.budget.commitConvergenceReserve(convergenceScope, convergenceHoldUsd);
        }
        // The MECHANICAL leg of the same bargain (RV3802): the round's
        // finish contract can grant one bounded repair turn, and the
        // third comparison run's round entered exactly that turn's
        // price short of certainty. Sized from the host's declared
        // `finishValidation.estRepairCostUsd` first, else from this
        // run's own observed last mechanical repair window (a priced
        // fact of the journal by the time the round is admitted), else
        // zero, inert. Held beside the verdict leg, released EARLY at
        // the round invocation's first journaled verdict (the staged
        // release the validateFinish hook fires), and by the finally
        // below on every path that never reached one.
        const repairHoldUsd =
          validationSpec === undefined
            ? 0
            : (validationSpec.estRepairCostUsd ??
              lastMechanicalRepairCostUsd(internals.replayer.snapshot(), (servedBy, usage) =>
                internals.priceUsd(servedBy, usage),
              ) ??
              0);
        if (repairHoldUsd > 0) {
          internals.budget.commitRepairReserve(convergenceScope, repairHoldUsd);
          releaseRepairLeg = () => {
            releaseRepairLeg = undefined;
            internals.budget.releaseRepairReserve(convergenceScope);
          };
        }
        // The sectional plan (RV3803): exact, or the round regenerates
        // in full exactly as before. Derived purely from replayed
        // material (the accepted document and the judged findings), so
        // a resume re-arms the identical context and the round's
        // prompt bytes hold.
        // The sectional vocabulary rides the VALIDATED finish channel
        // only: without a finish contract there is no resolution hook
        // to splice through, and the round regenerates in full as it
        // always did.
        const roundPlan =
          validationSpec !== undefined && typeof synthesizedFinal === 'string'
            ? sectionalRoundPlan(
                synthesizedFinal,
                carried.map((finding) => finding.draftExcerpt),
              )
            : undefined;
        if (roundPlan !== undefined) {
          sectionalRoundContext = { base: synthesizedFinal as string, ...roundPlan };
          internals.events.emit(
            {
              type: 'log',
              level: 'debug',
              msg: 'orchestrator sectional round armed',
              data: {
                targets: roundPlan.targets,
                sections: roundPlan.sections.length,
              },
            },
            callingState.spanId,
          );
        }
        try {
          synthesizedFinal = await runSynthesis(result.output, 'repair');
        } catch (thrown) {
          await journalSynthesisAdmissionDecline(thrown);
          // The round's two deaths are different facts (RV3601). The
          // third comparison run's round DISPATCHED, paid two wires
          // and produced a 43k char candidate its own finish contract
          // rejected, and this catch called it 'could not dispatch'
          // with repairsUsed 0: the message was factually wrong on
          // both counts. A throw carrying the finish validation source
          // is that second death, so its class names the host
          // rejection, mirrors the inner verdict facts verbatim, and
          // counts the bounded round as spent. Both classes carry the
          // judge meta beside the findings: the error terminal used to
          // read claimConsistencyMeta null over a journal holding the
          // verdict (the RV2203 lesson, relearned on this path).
          const hostRejection =
            thrown instanceof FailRunError &&
            typeof thrown.data === 'object' &&
            thrown.data !== null &&
            !Array.isArray(thrown.data) &&
            (thrown.data as { source?: unknown }).source === 'orchestrator_finish_validation'
              ? (thrown.data as Record<string, Json | undefined>)
              : undefined;
          if (hostRejection !== undefined) {
            throw new FailRunError(
              'the claim-consistency repair round dispatched and its repaired candidate ' +
                'failed host validation ' +
                `(${thrown instanceof Error ? thrown.message.slice(0, 300) : String(thrown)}); ` +
                `${String(carried.length)} judged contradiction${carried.length === 1 ? '' : 's'} ` +
                'stand unconsumed and a gate armed to repair must not pass silently',
              {
                data: {
                  source: 'orchestrator_claim_consistency',
                  claimContradictions: carried as unknown as Json,
                  claimConsistencyMeta: claimConsistencyMeta as unknown as Json,
                  repairsUsed: 1,
                  roundDispatched: true,
                  preRepairHash,
                  finishValidation: {
                    ...(hostRejection.callId === undefined ? {} : { callId: hostRejection.callId }),
                    ...(hostRejection.failed === undefined ? {} : { failed: hostRejection.failed }),
                    ...(hostRejection.repairsUsed === undefined
                      ? {}
                      : { repairsUsed: hostRejection.repairsUsed }),
                    ...(hostRejection.maxRepairs === undefined
                      ? {}
                      : { maxRepairs: hostRejection.maxRepairs }),
                    ...(hostRejection.candidateHash === undefined
                      ? {}
                      : { candidateHash: hostRejection.candidateHash }),
                    ...(hostRejection.candidateChars === undefined
                      ? {}
                      : { candidateChars: hostRejection.candidateChars }),
                  } as unknown as Json,
                  ...(acceptanceSnapshot as unknown as Record<string, Json>),
                },
              },
            );
          }
          throw new FailRunError(
            'the claim-consistency repair round could not dispatch ' +
              `(${thrown instanceof Error ? thrown.message.slice(0, 300) : String(thrown)}); ` +
              `${String(carried.length)} judged contradiction${carried.length === 1 ? '' : 's'} ` +
              'stand unconsumed and a gate armed to repair must not pass silently',
            {
              data: {
                source: 'orchestrator_claim_consistency',
                claimContradictions: carried as unknown as Json,
                claimConsistencyMeta: claimConsistencyMeta as unknown as Json,
                repairsUsed: 0,
                roundDispatched: false,
                preRepairHash,
                ...(acceptanceSnapshot as unknown as Record<string, Json>),
              },
            },
          );
        } finally {
          // The hold's whole purpose arrives here (the cycle 76 rule):
          // released to the verdict pass it was held FOR, right before that
          // dispatch admits, and released on both deaths too, so no
          // terminal arithmetic ever carries a hold for a verdict that
          // can no longer happen. The mechanical leg (RV3802) normally
          // released earlier, at the round's first verdict; a path that
          // never reached one (a pre dispatch refusal, a death before
          // any finish call) disarms and releases it here. The
          // sectional context (RV3803) is live state of THIS round and
          // dies with it on every path.
          sectionalRoundContext = undefined;
          releaseRepairLeg = undefined;
          if (repairHoldUsd > 0) {
            internals.budget.releaseRepairReserve(convergenceScope);
          }
          if (convergenceHoldUsd > 0) {
            internals.budget.releaseConvergenceReserve(convergenceScope);
          }
        }
        try {
          await runClaimConsistencyPass(synthesizedFinal, acceptanceSnapshot, 'final');
        } catch (thrown) {
          // The round's THIRD death (RV3701): the candidate repaired
          // and materialized, then the verdict pass could not rule (an
          // admission decline the hold's estimate undershot, or a judge
          // that did not settle ok). The typed throws below the judge
          // already fail the run closed; what they cannot know is that
          // they fired INSIDE the bounded round, so the terminal used
          // to describe a draft death while a paid repaired candidate
          // sat in the journal. The round context rides the same data,
          // message untouched.
          if (
            thrown instanceof FailRunError &&
            typeof thrown.data === 'object' &&
            thrown.data !== null &&
            !Array.isArray(thrown.data) &&
            (thrown.data as { source?: unknown }).source === 'orchestrator_claim_consistency'
          ) {
            throw new FailRunError(thrown.message, {
              data: {
                ...(thrown.data as Record<string, Json | undefined>),
                // The unconsumed findings ride every round death (the
                // RV3601 rule); the judge side throws cannot know them.
                ...((thrown.data as { claimContradictions?: unknown }).claimContradictions ===
                undefined
                  ? { claimContradictions: carried as unknown as Json }
                  : {}),
                roundDispatched: true,
                repairsUsed: 1,
                preRepairHash,
              },
            });
          }
          throw thrown;
        }
        if (claimFindingsFound !== undefined && claimFindingsFound.length > 0) {
          throw new FailRunError(
            `the claim-consistency judge still found ${String(claimFindingsFound.length)} ` +
              `contradiction${claimFindingsFound.length === 1 ? '' : 's'} after the bounded ` +
              'repair round: the repaired composition keeps contradicting the settled pool',
            {
              data: {
                source: 'orchestrator_claim_consistency',
                claimContradictions: claimFindingsFound as unknown as Json,
                claimConsistencyMeta: claimConsistencyMeta as unknown as Json,
                repairsUsed: 1,
                preRepairHash,
                repairedHash: hashOfDocument(synthesizedFinal),
                ...(acceptanceSnapshot as unknown as Record<string, Json>),
              },
            },
          );
        }
      }
    }
    const envelopeSchemaRecovered =
      (result.schemaRecoveredTerminalExchanges ?? 0) + synthesisSchemaRecoveredExchanges;
    const deliverable = deliverableVerdict(synthesizedFinal);
    // The draft-to-final provenance (RV2509), present whenever a
    // synthesis was configured: two hashes and the answer they imply,
    // so "is this semantic verdict about what I received" is a field
    // read rather than an inference from ordering rules.
    const draftToFinal: OrchestrateDraftToFinal | undefined =
      opts?.synthesis === undefined
        ? undefined
        : (() => {
            const hashOf = (value: unknown): string =>
              createHash('sha256')
                .update(jcsSerialize(value ?? null), 'utf8')
                .digest('hex');
            const draftHash = hashOf(result.output);
            const finalHash = hashOf(synthesizedFinal);
            return {
              draftHash,
              finalHash,
              rewritten: draftHash !== finalHash,
              ...(claimConsistencyMeta === undefined ? {} : { claimsJudgedOn: claimStage }),
            };
          })();
    const envelopeRejectedCandidates = rejectedFinishCandidates();
    return {
      result: synthesizedFinal,
      completion: decision.completion,
      // The explicit deliverable verdict (RV2506): the three questions
      // a consumer used to answer by parsing the result shape and
      // digging the journal. `resultAvailable` always rides;
      // `deliverableAccepted` and `acceptedArtifactRef` ride exactly
      // when a finish contract judged something, so an envelope from a
      // run without one stays byte identical.
      resultAvailable: deliverable.resultAvailable,
      ...(deliverable.deliverableAccepted === undefined
        ? {}
        : { deliverableAccepted: deliverable.deliverableAccepted }),
      ...(deliverable.acceptedArtifactRef === undefined
        ? {}
        : { acceptedArtifactRef: deliverable.acceptedArtifactRef }),
      // What the contract rejected before it accepted (RV2507): absent
      // when a finish passed first try, so every envelope of a clean
      // run stays byte identical.
      ...(envelopeRejectedCandidates.length === 0
        ? {}
        : { rejectedFinishCandidates: envelopeRejectedCandidates }),
      childStatusCounts: decision.childStatusCounts,
      degradedReasons: decision.degradedReasons,
      ...(decision.salvagedPartialChildren === undefined
        ? {}
        : { salvagedPartialChildren: decision.salvagedPartialChildren }),
      ...(decision.salvagedTerminalOutputChildren === undefined
        ? {}
        : { salvagedTerminalOutputChildren: decision.salvagedTerminalOutputChildren }),
      // Ok children below their declared evidence floor (RV1412):
      // absent when none, so every pre-existing envelope stays byte
      // identical.
      ...(decision.belowFloorOkChildren === undefined
        ? {}
        : { belowFloorOkChildren: decision.belowFloorOkChildren }),
      // Children still running when finish validated (RV1807): the
      // machine-readable late-child boundary; absent when none, so
      // every pre-existing envelope stays byte identical.
      ...(decision.unsettledAtFinish === undefined
        ? {}
        : { unsettledAtFinish: decision.unsettledAtFinish }),
      // The per-child machine roster (RV806): absent on decisions
      // journaled before it shipped, so those envelopes stay byte
      // identical.
      ...(decision.children === undefined ? {} : { acceptanceChildren: decision.children }),
      // The recovery trace (cycle 77): absent when zero, so every
      // pre-existing envelope stays byte identical.
      ...(envelopeSchemaRecovered === 0
        ? {}
        : { schemaRecoveredFinishExchanges: envelopeSchemaRecovered }),
      // The reserve lifecycle (RV304 second half): absent without a
      // configured reserve, so every pre-existing envelope stays byte
      // identical.
      ...(synthesisReserveLifecycle === undefined
        ? {}
        : { synthesisReserve: synthesisReserveLifecycle }),
      // The conditional-synthesis skip (RV510): absent unless the gate
      // fired, so every pre-existing envelope stays byte identical.
      ...(synthesisSkippedByValidDraft
        ? { synthesisSkipped: 'synthesis_skipped_by_valid_draft' as const }
        : {}),
      // The no-regression floor (RV2505): present only when a failing
      // synthesis was actually caught and the draft settled the run, so
      // every pre-existing envelope stays byte identical.
      ...(synthesisRegressed === undefined ? {} : { synthesisRegressed }),
      // The contradiction pass (RV1302): present whenever the pass was
      // configured, EMPTY when it ran and the pool agreed. The
      // distinction is the point: an absent field says nothing looked,
      // and an empty list says something looked and found nothing (the
      // RV1209 provenance doctrine, absence means NOT RECORDED).
      ...(contradictionsFound === undefined
        ? {}
        : {
            contradictions: contradictionsFound,
            contradictionsMeta: contradictionsMeta as unknown as Json,
          }),
      // The claim-consistency pass (RV1502): present whenever the pass
      // ran, EMPTY when the judge cleared every pair. A dead judge
      // leaves `claimContradictions` absent while the meta names
      // `judgeFailed`: nothing was judged, and an empty list would
      // claim the pool agreed (the RV1209 provenance doctrine, absence
      // means NOT RECORDED).
      ...(claimConsistencyMeta === undefined
        ? {}
        : {
            ...(claimFindingsFound === undefined
              ? {}
              : { claimContradictions: claimFindingsFound }),
            claimConsistencyMeta: claimConsistencyMeta as unknown as Json,
          }),
      // The pre-synthesis verdict under `stage: 'both'` (RV2509),
      // absent under every other setting so each existing envelope
      // stays byte identical. Its `judgedStage` says 'draft' and its
      // `judgedHash` names the document it read, so the pair is
      // self-describing without reference to which field it rides.
      ...(claimConsistencyDraftMeta === undefined
        ? {}
        : { claimConsistencyDraftMeta: claimConsistencyDraftMeta as unknown as Json }),
      // The draft-to-final provenance (RV2509): present whenever a
      // synthesis was configured, so a consumer holding a semantic
      // verdict can tell whether the document it judged is the one
      // that shipped.
      ...(draftToFinal === undefined ? {} : { draftToFinal: draftToFinal as unknown as Json }),
      // The explicit pass summary (RV1906): {ran, reason} for every
      // semantic pass, so an absent findings field can never read as a
      // clean pass. The benchmark's recovery artifacts carried
      // contradictions: null and claimConsistencyMeta: null, and the
      // judge had to annotate by hand that null meant NOT RUN.
      semanticPasses: semanticPassesSummary(
        opts?.synthesis === undefined
          ? { ran: false, reason: 'not-configured' }
          : synthesisSkippedByValidDraft
            ? { ran: false, reason: 'valid-draft' }
            : { ran: true },
      ),
    };
  };
  return defineWorkflow({ name: ORCHESTRATE_WORKFLOW_NAME }, async (ctx): Promise<unknown> => {
    const barrier: {
      run?: () => Promise<void>;
      roster?: () => ChildrenAtFailure | undefined;
    } = {};
    try {
      return await orchestrationBody(ctx, barrier);
    } catch (thrown) {
      // The pre-acceptance roster (RV2602). A run that crosses its
      // ceiling mid-roster throws from wherever it was, and every
      // surface that names children hangs off an acceptance fold that
      // never ran, so the terminal used to say nothing at all about
      // work already paid for. The fold reports only where no verdict
      // exists, so this can never contradict an acceptance envelope.
      //
      // The error CLASS is preserved exactly (it derives the outcome
      // status) and only `data` widens; anything not carrying typed
      // data rethrows untouched, and an existing field is never
      // overwritten. Runs that spawned no child add nothing.
      const roster = barrier.roster?.();
      if (roster === undefined) {
        throw thrown;
      }
      const widen = (data: Record<string, Json> | undefined): Record<string, Json> => ({
        ...(data ?? {}),
        ...(data?.childrenAtFailure === undefined
          ? { childrenAtFailure: roster as unknown as Json }
          : {}),
      });
      if (thrown instanceof BudgetExhaustedError) {
        throw new BudgetExhaustedError(thrown.message, {
          data: widen(thrown.data as Record<string, Json> | undefined),
        });
      }
      if (thrown instanceof FailRunError) {
        throw new FailRunError(thrown.message, {
          data: widen(thrown.data as Record<string, Json> | undefined),
        });
      }
      throw thrown;
    } finally {
      // RV1903: the one funnel every exit passes through; see
      // OrchestrateOptions.onUnsettledAtExit.
      await barrier.run?.();
    }
  });
}

/**
 * Top-level surface: creates a run. `runOptions` are the ordinary
 * engine {@link RunOptions} of the created run; in particular
 * `runOptions.budgetUsd` is the ROOT hard ceiling over the WHOLE tree
 * (the orchestrator and every child), immutable after start, while
 * `opts.budget` only shapes the orchestrator's own sub-account inside
 * that ceiling. The shortcut previously accepted no RunOptions at all,
 * so the canonical entry point could not set a root ceiling without
 * dropping to `engine.run(makeOrchestratorWorkflow(...))` (v1.18.0
 * review P1-5).
 */
export function orchestrate(
  engine: Engine,
  goal: string,
  opts?: OrchestrateOptions,
  runOptions?: RunOptions,
): RunHandle<unknown> {
  return engine.run(makeOrchestratorWorkflow(goal, opts), undefined, runOptions);
}
