/**
 * AdmissionController v1 (M6-T06; DEF-2, DEF-3, DEF-5 substrate).
 *
 * Public contract: https://docs.rulvar.com/guide/adaptive-orchestration.
 * The single admission point for ALL spawns of any
 * origin: ctx.workflow, the orchestrator spawn tools (M6-T07), escalation
 * decomposition and rung respawns (M7). `admit(spec)` is called BEFORE
 * the carrying spawn-admission decision entry is journaled; the verdict
 * plus reserved amounts plus statsBefore are embedded IN the entry, so
 * replay NEVER re-evaluates admission against the live budget.
 *
 * The AdmitVerdict union is CLOSED here (XF-11) so consumer switches are
 * written once; the reuse_full and admit_graft branches are produced by
 * the DEF-5 reuse machinery in M7-T07, never in M6. M6 enforces maxDepth,
 * maxChildrenPerNode, childBudgetFraction, and the engine lifetime cap;
 * the lineage folds, termination account, and oscillation guard arrive in
 * M7 with their reject codes already registered below.
 */
import { ConfigError } from '../l0/errors.js';
import {
  requireFraction,
  requireNonNegativeNumber,
  requirePositiveInteger,
} from '../l0/validate-numbers.js';
import type { JournalEntry } from '../l0/entries.js';
import { createCanonicalIdMinter } from '../l0/messages.js';
import { parseScopePath } from '../journal/scope.js';
import {
  approachSigCoarse,
  approachSigOf,
  LEGACY_SIGNATURE_INPUTS,
  LINEAGE_SIG_VERSION,
  LineageIndex,
  normalizeApproachTag,
  validateEscalationLimits,
  type ApproachSignatureInputs,
  type EscalationLimits,
  type LineageRelation,
  type LineageStats,
  type LogicalTaskId,
  type SpawnLineage,
  type SpawnLineageOpt,
} from '../journal/lineage.js';
import type { TerminationAccount } from '../journal/termination.js';
import { DEFAULT_FLAT_RESERVE_USD, type RunBudget } from '../engine/budget.js';

export type { LogicalTaskId } from '../journal/lineage.js';
export type { DedupNote, DonorRef, GraftBoot, SpawnKey } from '../journal/reuse.js';
import type { DedupNote, DonorRef, GraftBoot, SpawnKey } from '../journal/reuse.js';

/** Plan-node identity; engine-minted ULID. */
export type NodeId = string;

/** Layer-1 reservation embedded in the carrying decision entry. */
export interface BudgetReserve {
  reserveUsd: number;
  /** The child sub-account ceiling; absent when the parent is uncapped. */
  childCeilingUsd?: number;
  /**
   * The reserve derivation (RV2004): where reserveUsd came from, so a
   * journal reader never reverse-engineers the arithmetic. 'estCost'
   * is the declared estimate (spawn opts or the agentType profile),
   * 'default' the engine flat reserve.
   */
  source?: 'estCost' | 'default';
  /**
   * Set when the derived reserve was clamped DOWN to the child's
   * ceiling: 'explicit-budget' by a declared budgetUsd,
   * 'fraction-ceiling' by the childBudgetFraction allowance an ORIGIN
   * WITH a materialized allowance account enforces (ctx.workflow).
   * The spawn-tool path never carries 'fraction-ceiling': its
   * dispatch enforces no fraction account, and journaling that clamp
   * is exactly the parity rerun's 0.50-versus-0.70 lie (RV2004).
   */
  clampedBy?: 'explicit-budget' | 'fraction-ceiling';
}

/** The lineage block every non-reject verdict carries (DEF-3). */
export interface AdmitLineage {
  logicalTaskId: LogicalTaskId;
  isNew: boolean;
  depth: number;
}

/**
 * The unified admission verdict (XF-11). One union,
 * closed now; every debit is atomic with its carrying decision entry and
 * embeds the balance-after (DEF-2).
 */
export type AdmitVerdict =
  | {
      kind: 'admit';
      reserve: BudgetReserve;
      dedup?: DedupNote;
      spawnUnitsAfter: number;
      lineage: AdmitLineage;
    }
  | {
      kind: 'reuse_full';
      donor: DonorRef;
      spawnUnitsAfter: number;
      lineage: AdmitLineage & { isNew: false };
    }
  | {
      kind: 'admit_graft';
      donor: DonorRef;
      reserve: BudgetReserve;
      boot: GraftBoot;
      spawnUnitsAfter: number;
      lineage: AdmitLineage;
    }
  | { kind: 'reject'; reason: AdmitRejectReason };

/** The merged reject-code set. */
export type AdmitRejectReason =
  | {
      code:
        | 'depth'
        | 'quota'
        | 'budget'
        | 'lifetime'
        | 'termination_exhausted'
        | 'ladder_exceeds_frozen'
        | 'lineage_exhausted'
        | 'lineage_busy';
    }
  | { code: 'osc_guard'; spawnKey: SpawnKey; oscillationCount: number }
  | {
      /**
       * The sequential roster feasibility refusal (RV2005): under a
       * declared acceptance.minSpawnedChildren, the whole remaining
       * roster (priced at this seat's own projection) plus the live
       * in-flight exposure does not fit the parent remainder, so the
       * FIRST infeasible seat refuses before any child is paid. The
       * batchGate symmetry (RV1908) on the seat-by-seat path the
       * parity rerun's model actually took, where three seats were
       * paid in full under a floor of four the money could never
       * reach.
       */
      code: 'roster_floor';
      floor: number;
      admittedChildren: number;
      seatsRemaining: number;
      perSeatProjectionUsd: number;
      liveExposureUsd: number;
      remainderUsd: number;
    }
  | {
      /**
       * The declared estimate cannot fit the child's own ceiling: the
       * host said the work costs more than the budget buys, so the op
       * is bounced with the actionable correction BEFORE it changes
       * plan state or consumes a spawn unit (the v1.7.0 follow-up
       * review's P1). Heuristic reserves never produce this code; they
       * clamp to the allowance instead.
       */
      code: 'reserve_exceeds_budget';
      agentType: string;
      childAccount: string;
      estCostUsd: number;
      resolvedReserveUsd: number;
      childCeilingUsd: number;
      minimumBudgetUsd: number;
      message: string;
    };

/** Every spawn origin routed through the single admission point. */
export type SpawnOrigin =
  | 'ctx.workflow'
  | 'ctx.orchestrate'
  | 'spawn_agent'
  | 'parallel_agents'
  | 'escalation-decomposition'
  | 'rung-respawn'
  | 'reuse-link';

/** What the admission point needs to know about one spawn. */
export interface AdmitSpec {
  origin: SpawnOrigin;
  /** Registered workflow name or agent profile name; telemetry and cards only. */
  name: string;
  /** The child's journal scope; doubles as its budget account scope. */
  childScope: string;
  /** The nearest enclosing budget account of the spawner. */
  parentAccountScope: string;
  /** Explicit child budget; clamped by childBudgetFraction. */
  budgetUsd?: number;
  /** Reserve hint; falls back to the flat engine default. */
  estCostUsd?: number;
  /**
   * Same-batch reserves already admitted read-only but not yet
   * committed (a multi-op plan revision): the read-only branch adds
   * them to this spawn's reserve so every embedded admit of one batch
   * is dispatchable under the same snapshot, not just the first.
   */
  pendingReserveUsd?: number;
  /**
   * The sequential roster feasibility inputs (RV2005), passed by the
   * SINGLE spawn_agent path when acceptance.minSpawnedChildren is
   * declared: the admission projects the whole REMAINING roster at
   * this seat's own dispatch projection, live in-flight exposure
   * included, and refuses the first infeasible seat typed
   * 'roster_floor' before any child is paid. Batch seats never carry
   * this: the RV1908 batchGate already judged their batch entire.
   */
  roster?: {
    floor: number;
    admittedChildren: number;
    liveExposureUsd: number;
  };
  /**
   * Lineage continuation (DEF-3); absence mints a fresh lineage root. A
   * continuation demands a causeRef: the seq of the entry that caused the
   * rebirth.
   */
  lineage?: SpawnLineageOpt;
  /** Raw approach tag; normalized by the engine. */
  approach?: string;
  /** Decomposition parent-LTID chain (relation 'decompose-child' only). */
  ancestry?: LogicalTaskId[];
  /**
   * Coarse-signature identity inputs; unspecified fields canonize onto
   * the deterministic legacy constants so signatures stay byte-stable
   * (the toolset/schema registries land in M7-T05).
   */
  signature?: Partial<ApproachSignatureInputs>;
  /**
   * The declared ladder length of the resolved profile (K_l); default 1,
   * the single implicit rung. Under a termination account, a length
   * beyond the frozen kMax rejects with ladder_exceeds_frozen and a NEW
   * lineage is allocated E0 escalation units plus K_l - 1 rungs (DEF-2).
   */
  ladderLength?: number;
  /**
   * The children-quota key (maxChildrenPerNode); defaults to
   * parentAccountScope. Orchestrators pass their own scope so each node
   * counts its own children.
   */
  nodeKey?: string;
}

/** Live pre-append snapshot embedded in the decision entry (DEF-2/DEF-3). */
export interface AdmissionStatsBefore {
  spawnsBefore: number;
  childrenOfParentBefore: number;
  depth: number;
  /** The LTID's pinned lineage fold at admit time (DEF-3). */
  lineage?: LineageStats;
}

/** The full admission decision embedded in the carrying entry. */
export interface AdmissionDecision {
  verdict: AdmitVerdict;
  statsBefore: AdmissionStatsBefore;
  /** Node identity minted inside the decision; absent on reject. */
  nodeId?: NodeId;
  /**
   * The computed value-part lineage block (DEF-3): reused byte-exact on
   * replay, never recomputed. Absent on reject.
   */
  lineage?: SpawnLineage;
  /**
   * The declared ladder length recorded for the termination fold
   * (DEF-2): the replay recomputation reads K_l from the entry, never
   * from the live registry. Present only under a termination account.
   */
  ladderLength?: number;
}

export const DEFAULT_MAX_DEPTH = 1;
export const MAX_DEPTH_CEILING = 4;
export const DEFAULT_MAX_CHILDREN_PER_NODE = 16;
export const DEFAULT_CHILD_BUDGET_FRACTION = 0.3;

/**
 * The ONE dispatch-projection reserve formula (the 1.63.0 experiment
 * review, P0.3): the spawn's declared estimate (a spawn tool has no
 * per-call estCost channel, so the estimate is the agentType profile's)
 * or the flat default, clamped by the explicit child budget when one
 * exists. This is the reserve the embedded layer-2 gate evaluates a
 * spawn_agent call against BEFORE dispatch, and the number
 * preflightEstimate projects for the same gate, so the linter and the
 * runtime cannot drift: both call this function.
 */
export function dispatchProjectionReserveUsd(
  spec: { estCostUsd?: number; budgetUsd?: number },
  flatReserveUsd: number,
): number {
  const base = spec.estCostUsd ?? flatReserveUsd;
  return spec.budgetUsd === undefined ? base : Math.min(base, spec.budgetUsd);
}

/**
 * Worst-case claim judge dispatches of a declared posture
 * (RV3402/RV4001): `'both'` dispatches the judge at the draft AND the
 * final, and an armed repair round (`onFound: 'repair'`, which intake
 * refuses at stage 'draft') rejudges the repaired composition once
 * more. Absent declarations read as the historical one pass.
 */
export function acceptanceJudgePasses(
  stage?: 'draft' | 'final' | 'both',
  onFound?: 'report' | 'carry' | 'fail' | 'repair',
): number {
  const resolvedStage = stage ?? 'draft';
  const roundArmed = (onFound ?? 'report') === 'repair' && resolvedStage !== 'draft';
  return (resolvedStage === 'both' ? 2 : 1) + (roundArmed ? 1 : 0);
}

/** The declared inputs of the acceptance tail (RV4001); undeclared estimates are zero. */
export interface AcceptanceTailSpec {
  /** The held synthesis payload reserve, exactly budget.synthesisReserveUsd. */
  synthesisReserveUsd?: number;
  /** Mirrors OrchestrateClaimConsistency.stage; absent reads 'draft'. */
  claimStage?: 'draft' | 'final' | 'both';
  /** Mirrors OrchestrateClaimConsistency.onFound; absent reads 'report'. */
  claimOnFound?: 'report' | 'carry' | 'fail' | 'repair';
  /** The claim judge's declared admission estimate, claimConsistency.judge.estCost. */
  claimJudgeEstCostUsd?: number;
  /** The mechanical repair turn's declared price, finishValidation.estRepairCostUsd. */
  finishEstRepairCostUsd?: number;
  /** The declared price of one composition, synthesis.estCost. */
  synthesisEstCostUsd?: number;
  /**
   * The citation audit judge's declared estimate (RV4004),
   * citationAudit.judge.estCost. The audit pays one pass, two under
   * its own armed repair round, and that round also pays one more
   * composition plus (when a claim pass is configured past the draft)
   * one more claim rejudge; all of it enters the tail exactly like
   * the claim terms, declared or zero.
   */
  citationJudgeEstCostUsd?: number;
  /** Mirrors OrchestrateCitationAudit.onFound; 'repair' arms the audit's round. */
  citationOnFound?: 'report' | 'repair' | 'fail';
  /** True when a claim-consistency pass is declared (its rejudge after a citation round is priced). */
  claimConfigured?: boolean;
  /** One coordination turn floor: the resolved flat reserve of the run. */
  workingRoomUsd: number;
}

/** The resolved terms behind {@link acceptanceTailRequiredUsd}; journal-ready numbers. */
export interface AcceptanceTailTerms {
  synthesisReserveUsd: number;
  judgeEstUsd: number;
  /** Worst-case judge dispatches: ('both' ? 2 : 1) plus one under an armed repair round. */
  judgePasses: number;
  estRepairCostUsd: number;
  /** One more composition when the repair round is armed, priced at synthesis.estCost. */
  roundCompositionUsd: number;
  /**
   * The citation audit judge terms (RV4004), present in the sum only
   * when the audit is declared: `citationJudgePasses` is 1, 2 under
   * the audit's own armed round (which also arms the composition term
   * above and, with a claim pass configured past the draft, one more
   * claim rejudge inside `judgePasses`).
   */
  citationJudgeEstUsd?: number;
  citationJudgePasses?: number;
  workingRoomUsd: number;
}

/**
 * The ONE acceptance-tail formula (RV4001, the fifth comparison
 * experiment): what the effective cap must cover, at exact fill or
 * better, so the acceptance machinery the host declared is funded and
 * not started on luck. The RV3907 runtime gate landed WITHOUT a
 * preflight twin: preflight kept its own advisory arithmetic on
 * different terms, passed the experiment's plan green at a $4.54 cap,
 * and the runtime then refused the same plan typed at $4.82 before the
 * first wire; worse, the runtime undercounted the judge passes of
 * `stage: 'both'` (one where the worst case dispatches two) while
 * preflight counted them right, so the two calculators disagreed in
 * BOTH directions. The gate and the preflight `acceptanceReserve`
 * report block now both call this function, exactly the
 * {@link dispatchProjectionReserveUsd} precedent: one formula, so the
 * linter and the runtime cannot drift. Undeclared estimates contribute
 * zero: the tail binds exactly what the host declared. The armed
 * repair round (`onFound: 'repair'`, never at stage 'draft', which
 * intake refuses) adds one judge pass and one composition priced at
 * the declared `synthesis.estCost`.
 */
export function acceptanceTailRequiredUsd(spec: AcceptanceTailSpec): {
  requiredUsd: number;
  terms: AcceptanceTailTerms;
} {
  const stage = spec.claimStage ?? 'draft';
  const onFound = spec.claimOnFound ?? 'report';
  // Either round (the claim pass's or the citation audit's; intake
  // refuses arming both) buys one more composition.
  const citationDeclared =
    spec.citationJudgeEstCostUsd !== undefined || spec.citationOnFound !== undefined;
  const citationRoundArmed = spec.citationOnFound === 'repair';
  const roundArmed = (onFound === 'repair' && stage !== 'draft') || citationRoundArmed;
  // A citation round rewrites the shipped document, so a configured
  // claim pass past the draft rejudges it: one more claim pass.
  const judgePasses =
    acceptanceJudgePasses(spec.claimStage, spec.claimOnFound) +
    (citationRoundArmed && spec.claimConfigured === true && stage !== 'draft' ? 1 : 0);
  const citationJudgePasses = citationDeclared ? 1 + (citationRoundArmed ? 1 : 0) : 0;
  const citationJudgeEstUsd = spec.citationJudgeEstCostUsd ?? 0;
  const terms: AcceptanceTailTerms = {
    synthesisReserveUsd: spec.synthesisReserveUsd ?? 0,
    judgeEstUsd: spec.claimJudgeEstCostUsd ?? 0,
    judgePasses,
    estRepairCostUsd: spec.finishEstRepairCostUsd ?? 0,
    roundCompositionUsd: roundArmed ? (spec.synthesisEstCostUsd ?? 0) : 0,
    ...(citationDeclared ? { citationJudgeEstUsd, citationJudgePasses } : {}),
    workingRoomUsd: spec.workingRoomUsd,
  };
  return {
    requiredUsd:
      terms.synthesisReserveUsd +
      terms.judgeEstUsd * terms.judgePasses +
      terms.estRepairCostUsd +
      terms.roundCompositionUsd +
      citationJudgeEstUsd * citationJudgePasses +
      terms.workingRoomUsd,
    terms,
  };
}

/**
 * The one rendering of the tail arithmetic (RV4001): the runtime
 * refusal message and the preflight finding print this same string, so
 * an operator can diff them by eye and a test can assert them equal.
 */
export function formatAcceptanceTailTerms(terms: AcceptanceTailTerms): string {
  const citationUsd = (terms.citationJudgeEstUsd ?? 0) * (terms.citationJudgePasses ?? 0);
  const requiredUsd =
    terms.synthesisReserveUsd +
    terms.judgeEstUsd * terms.judgePasses +
    terms.estRepairCostUsd +
    terms.roundCompositionUsd +
    citationUsd +
    terms.workingRoomUsd;
  return (
    `synthesisReserveUsd ${terms.synthesisReserveUsd.toFixed(4)} + judge ` +
    `${terms.judgeEstUsd.toFixed(4)} x ${String(terms.judgePasses)} pass(es) + ` +
    `estRepairCostUsd ${terms.estRepairCostUsd.toFixed(4)} + round composition ` +
    `${terms.roundCompositionUsd.toFixed(4)} + ` +
    (terms.citationJudgePasses === undefined || terms.citationJudgePasses === 0
      ? ''
      : `citation judge ${(terms.citationJudgeEstUsd ?? 0).toFixed(4)} x ` +
        `${String(terms.citationJudgePasses)} pass(es) + `) +
    `working room ${terms.workingRoomUsd.toFixed(4)} = ${requiredUsd.toFixed(4)} USD`
  );
}

/** The declared wire counts of one orchestration plan (RV4005). */
export interface WireCapacitySpec {
  /** Fan-out provider dispatches: children times their turns. */
  childWires: number;
  /** Coordination loop dispatches, the finish exchanges included. */
  coordinationWires?: number;
  /** Composition invocations of the base plan (the initial synthesis). */
  synthesisWires?: number;
  /**
   * Worst-case claim judge dispatches; feed
   * {@link acceptanceJudgePasses} the declared posture to get it. NOTE:
   * that count already includes the armed round's rejudge, while the
   * estimate below prices the round's delta separately, so pass the
   * UNARMED reading here ((stage === 'both') ? 2 : 1) when you intend
   * to read `repairRoundDeltaWires` as the whole round.
   */
  judgeWires?: number;
  /** Separate extract dispatches, when the finish rides one (RV3908 spares the schema'd final). */
  extractWires?: number;
}

/** What one orchestration plan costs in wires, base and worst case (RV4005). */
export interface WireCapacityEstimate {
  /** The plan's wire total with no repair of any kind. */
  baseWires: number;
  /**
   * The armed semantic repair round's delta: ONE more composition
   * PLUS ONE more judge pass (RV3307), never one. The fifth
   * comparison run's own answer modeled 34 to 35 and lost the
   * decisive correctness point to exactly this constant.
   */
  repairRoundDeltaWires: number;
  /** Each granted mechanical repair turn is one more wire on its invocation. */
  mechanicalRepairDeltaWires: number;
  /** baseWires + repairRoundDeltaWires. */
  wiresWithRound: number;
  /** repairRoundDeltaWires / baseWires: the round's overhead share. */
  roundOverheadShare: number;
}

/**
 * The wire capacity of a declared orchestration plan (RV4005, the
 * fifth comparison experiment): base wires by declaration, the armed
 * repair round's delta, and the round's overhead share, from ONE
 * exported function so an answer about the runtime's own economics
 * has a source instead of an improvisation. The experiment's terminal
 * answer wrote "34 wires without repair, 35 with" and multiplied
 * retry share as `1 + r`: the round is TWO wires (its composition
 * plus the rejudge, `orchestrate.ts`'s own doctrine), so 34 becomes
 * 36 at 5.88 percent overhead, and r retries over a base of B
 * multiply wires by `1 + r/B` ({@link retryWireMultiplier}), not by
 * `1 + r`.
 */
export function wireCapacityEstimate(spec: WireCapacitySpec): WireCapacityEstimate {
  requireNonNegativeNumber(spec.childWires, 'wireCapacityEstimate childWires');
  const coordinationWires = spec.coordinationWires ?? 0;
  const synthesisWires = spec.synthesisWires ?? 0;
  const judgeWires = spec.judgeWires ?? 0;
  const extractWires = spec.extractWires ?? 0;
  requireNonNegativeNumber(coordinationWires, 'wireCapacityEstimate coordinationWires');
  requireNonNegativeNumber(synthesisWires, 'wireCapacityEstimate synthesisWires');
  requireNonNegativeNumber(judgeWires, 'wireCapacityEstimate judgeWires');
  requireNonNegativeNumber(extractWires, 'wireCapacityEstimate extractWires');
  const baseWires =
    spec.childWires + coordinationWires + synthesisWires + judgeWires + extractWires;
  const repairRoundDeltaWires = 2;
  return {
    baseWires,
    repairRoundDeltaWires,
    mechanicalRepairDeltaWires: 1,
    wiresWithRound: baseWires + repairRoundDeltaWires,
    roundOverheadShare: baseWires === 0 ? 0 : repairRoundDeltaWires / baseWires,
  };
}

/**
 * The retry share of a wire plan (RV4005): r retries over a base of B
 * wires re-dispatch r of the B, so totals scale by `1 + r/B`. The
 * fifth comparison run's answer multiplied by `1 + r`, reading every
 * retry as a whole extra plan.
 */
export function retryWireMultiplier(baseWires: number, retries: number): number {
  requireNonNegativeNumber(retries, 'retryWireMultiplier retries');
  if (!Number.isFinite(baseWires) || baseWires <= 0) {
    throw new ConfigError(
      `retryWireMultiplier baseWires must be a positive finite number; got ${String(baseWires)}`,
    );
  }
  return 1 + retries / baseWires;
}

/** Nesting depth of a child scope: its workflow, agent, and plan-node segments. */
export function spawnDepthOf(childScope: string): number {
  return parseScopePath(childScope).filter(
    (segment) =>
      segment.kind === 'workflow' || segment.kind === 'agent' || segment.kind === 'plan-node',
  ).length;
}

export class AdmissionController {
  private readonly budget: RunBudget;
  private readonly maxDepth: number;
  private readonly maxChildrenPerNode: number;
  private readonly childBudgetFraction: number;
  private readonly flatReserveUsd: number;
  private readonly maxTotalSpawns?: number;
  private readonly mintId: () => string;
  private readonly journalView?: () => readonly JournalEntry[];
  private readonly lineageIndex?: LineageIndex;
  private readonly lineageLimits: EscalationLimits;
  private terminationAccount?: TerminationAccount;
  /** Children admitted per parent node this process lifetime. */
  private readonly childrenOf = new Map<string, number>();
  private admittedTotal = 0;

  constructor(options: {
    budget: RunBudget;
    maxDepth?: number;
    maxChildrenPerNode?: number;
    childBudgetFraction?: number;
    flatReserveUsd?: number;
    /**
     * Controller-lifetime cap on ADMITTED spawns, enforced at this
     * controller's own gate with the 'lifetime' reject reason, for
     * hosts driving an AdmissionController directly. Engine runs do
     * not wire this option: they cap total spawns through the budget
     * (`budgetDefaults.lifetimeSpawnCap`, the same 'lifetime' reason).
     */
    maxTotalSpawns?: number;
    mintId?: () => string;
    /**
     * The lineage binding (DEF-3): a journal view for the pure counter
     * folds plus the configured limits. Without it the controller mints
     * and embeds lineage but enforces no lineage limits (unit contexts).
     */
    lineage?: {
      journalView: () => readonly JournalEntry[];
      limits?: Partial<EscalationLimits> | Record<string, unknown>;
    };
  }) {
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    // Accepting polarity, not rejecting: `maxDepth < 1 || maxDepth > 4`
    // let NaN through because every comparison with NaN is false, and a
    // NaN ceiling then disabled the depth check entirely (v1.34.0
    // review P2-3).
    if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > MAX_DEPTH_CEILING) {
      throw new ConfigError(
        `maxDepth ${String(maxDepth)} is outside [1, ${String(MAX_DEPTH_CEILING)}] ` +
          '(default 1, hard ceiling 4)',
      );
    }
    if (options.maxChildrenPerNode !== undefined) {
      requirePositiveInteger(options.maxChildrenPerNode, 'maxChildrenPerNode');
    }
    if (options.childBudgetFraction !== undefined) {
      requireFraction(options.childBudgetFraction, 'childBudgetFraction');
    }
    if (options.flatReserveUsd !== undefined) {
      requireNonNegativeNumber(options.flatReserveUsd, 'flatReserveUsd');
    }
    if (options.maxTotalSpawns !== undefined) {
      requirePositiveInteger(options.maxTotalSpawns, 'maxTotalSpawns');
    }
    this.budget = options.budget;
    this.maxDepth = maxDepth;
    this.maxChildrenPerNode = options.maxChildrenPerNode ?? DEFAULT_MAX_CHILDREN_PER_NODE;
    this.childBudgetFraction = options.childBudgetFraction ?? DEFAULT_CHILD_BUDGET_FRACTION;
    this.flatReserveUsd = options.flatReserveUsd ?? DEFAULT_FLAT_RESERVE_USD;
    if (options.maxTotalSpawns !== undefined) {
      this.maxTotalSpawns = options.maxTotalSpawns;
    }
    this.mintId = options.mintId ?? createCanonicalIdMinter();
    this.lineageLimits = validateEscalationLimits(options.lineage?.limits);
    if (options.lineage !== undefined) {
      this.journalView = options.lineage.journalView;
      this.lineageIndex = new LineageIndex();
    }
  }

  /** The lineage counter folds over the run journal (absorbed lazily). */
  lineage(): LineageIndex | undefined {
    if (this.lineageIndex !== undefined && this.journalView !== undefined) {
      this.lineageIndex.absorb(this.journalView());
    }
    return this.lineageIndex;
  }

  /** The validated lineage limits this controller enforces (DEF-3). */
  get escalationLimits(): EscalationLimits {
    return this.lineageLimits;
  }

  /**
   * Binds the run's TerminationAccount (DEF-2; PlanRunner runs only):
   * from bind time on, every admitted spawn of any
   * origin debits one spawnUnit atomically with its decision entry, and
   * a declared ladder longer than the frozen kMax rejects with
   * ladder_exceeds_frozen. Non-PlanRunner runs never bind an account and
   * keep the engine lifetime cap semantics unchanged.
   */
  bindTermination(account: TerminationAccount): void {
    if (this.terminationAccount !== undefined && this.terminationAccount !== account) {
      throw new ConfigError('one run carries exactly one TerminationAccount');
    }
    this.terminationAccount = account;
  }

  /** The bound account, when this is a PlanRunner run (DEF-2). */
  get termination(): TerminationAccount | undefined {
    return this.terminationAccount;
  }

  /**
   * The lineage half of admission (DEF-3): folds are
   * computed live STRICTLY BEFORE the carrying decision entry is appended;
   * the caller embeds the returned block in the entry and replay reads it
   * back byte-exact. Enforces the single-live-attempt invariant
   * (`lineage_busy`) and monotonic attempt consumption
   * (`lineage_exhausted`); never touches budget or structural limits.
   */
  evaluateLineage(spec: {
    name: string;
    lineage?: SpawnLineageOpt;
    approach?: string;
    ancestry?: LogicalTaskId[];
    signature?: Partial<ApproachSignatureInputs>;
  }): {
    decision:
      | { kind: 'ok'; lineage: SpawnLineage }
      | { kind: 'reject'; reason: { code: 'lineage_busy' | 'lineage_exhausted' } };
    statsBefore?: LineageStats;
  } {
    if (spec.lineage !== undefined && typeof spec.lineage.causeRef !== 'number') {
      throw new ConfigError(
        'a lineage continuation demands a causeRef: the seq of the entry that caused the ' +
          'rebirth',
      );
    }
    const index = this.lineage();
    const continued = spec.lineage?.continues;
    const statsBefore =
      index !== undefined && continued !== undefined ? index.statsOf(continued) : undefined;
    if (index !== undefined && continued !== undefined) {
      if (index.hasLiveAttempt(continued)) {
        return {
          decision: { kind: 'reject', reason: { code: 'lineage_busy' } },
          ...(statsBefore === undefined ? {} : { statsBefore }),
        };
      }
      if (index.attemptsUsed(continued) >= this.lineageLimits.maxAttemptsPerLogicalTask) {
        return {
          decision: { kind: 'reject', reason: { code: 'lineage_exhausted' } },
          ...(statsBefore === undefined ? {} : { statsBefore }),
        };
      }
    }
    const logicalTaskId = continued ?? this.mintId();
    const relation: LineageRelation =
      spec.lineage === undefined ? 'first' : (spec.lineage.relation ?? 'respawn');
    const signature: ApproachSignatureInputs = {
      agentType: spec.signature?.agentType ?? spec.name,
      toolsetHash: spec.signature?.toolsetHash ?? LEGACY_SIGNATURE_INPUTS.toolsetHash,
      schemaHash: spec.signature?.schemaHash ?? LEGACY_SIGNATURE_INPUTS.schemaHash,
      isolation: spec.signature?.isolation ?? LEGACY_SIGNATURE_INPUTS.isolation,
    };
    const coarse = approachSigCoarse(signature);
    const lineage: SpawnLineage = {
      logicalTaskId,
      relation,
      attemptOrdinal: index?.attemptsUsed(logicalTaskId) ?? 0,
      ...(spec.lineage?.causeRef === undefined ? {} : { causeRef: spec.lineage.causeRef }),
      ancestry: spec.ancestry ?? [],
      approachSig: approachSigOf(coarse, spec.approach),
      approachSigCoarse: coarse,
      sigVersion: LINEAGE_SIG_VERSION,
      approachTag: normalizeApproachTag(spec.approach),
    };
    return {
      decision: { kind: 'ok', lineage },
      ...(statsBefore === undefined ? {} : { statsBefore }),
    };
  }

  /**
   * Registers a live lineage admit the moment its caller commits to
   * appending the decision entry, closing the single-live-attempt window
   * until the journal absorbs the entry (DEF-3).
   */
  registerLineageAdmit(logicalTaskId: LogicalTaskId): void {
    this.lineageIndex?.noteAdmitted(logicalTaskId);
  }

  /**
   * Evaluates one spawn live, strictly BEFORE its decision entry is
   * appended. On admit the reserve is committed on the whole ancestor
   * account chain atomically with the evaluation; the caller journals the
   * returned decision and only then produces effects (child account,
   * dispatch). On reject nothing is committed and the reject verdict is
   * journaled by the caller so replay re-delivers it without
   * re-evaluation.
   */
  /**
   * The reserve the DISPATCH layer will actually commit for this spec:
   * the estimate (or the flat default) clamped by the explicit child
   * budget when one exists, because only an explicit budget opens a
   * child-allowance account at dispatch; the childBudgetFraction cap
   * never materializes as an account and must not shrink the
   * projection. The token-count-priced estimate of ctx.agent is
   * unreachable here (async); a divergence there lands as a journaled
   * dispatch rejection instead of a strand. Delegates to the exported
   * {@link dispatchProjectionReserveUsd} so the live gate and
   * preflightEstimate share ONE formula (the 1.63.0 experiment review,
   * P0.3).
   */
  projectedDispatchReserveUsd(spec: Pick<AdmitSpec, 'estCostUsd' | 'budgetUsd'>): number {
    return dispatchProjectionReserveUsd(spec, this.flatReserveUsd);
  }

  admit(spec: AdmitSpec, options?: { commitReserve?: boolean }): AdmissionDecision {
    const commitReserve = options?.commitReserve ?? true;
    const nodeKey = spec.nodeKey ?? spec.parentAccountScope;
    const depth = spawnDepthOf(spec.childScope);
    const childrenBefore = this.childrenOf.get(nodeKey) ?? 0;
    // Lineage folds are computed live STRICTLY BEFORE the decision entry
    // is appended; the pinned stats embed into the entry.
    const evaluated = this.evaluateLineage(spec);
    const statsBefore: AdmissionStatsBefore = {
      spawnsBefore: this.budget.spent().agentsSpawned,
      childrenOfParentBefore: childrenBefore,
      depth,
      ...(evaluated.statsBefore === undefined ? {} : { lineage: evaluated.statsBefore }),
    };
    if (evaluated.decision.kind === 'reject') {
      // Single-live-attempt (lineage_busy) and monotonic attempt
      // consumption (lineage_exhausted), never replenished.
      return { verdict: { kind: 'reject', reason: evaluated.decision.reason }, statsBefore };
    }
    if (this.terminationAccount !== undefined) {
      // DEF-2: a ladder longer than the frozen kMax would break the
      // variant function's weight C; the new profile serves later runs.
      if ((spec.ladderLength ?? 1) > this.terminationAccount.limits.kMax) {
        return {
          verdict: { kind: 'reject', reason: { code: 'ladder_exceeds_frozen' } },
          statsBefore,
        };
      }
      if (this.terminationAccount.spawnUnitsExhausted) {
        // The caller writes termination.denied strictly before surfacing
        // the typed error, then journals this verdict.
        return {
          verdict: { kind: 'reject', reason: { code: 'termination_exhausted' } },
          statsBefore,
        };
      }
    }
    if (depth > this.maxDepth) {
      return { verdict: { kind: 'reject', reason: { code: 'depth' } }, statsBefore };
    }
    if (childrenBefore >= this.maxChildrenPerNode) {
      return { verdict: { kind: 'reject', reason: { code: 'quota' } }, statsBefore };
    }
    if (this.maxTotalSpawns !== undefined && this.admittedTotal >= this.maxTotalSpawns) {
      return { verdict: { kind: 'reject', reason: { code: 'lifetime' } }, statsBefore };
    }
    if (spec.roster !== undefined) {
      // The sequential roster feasibility (RV2005): the shared RV2004
      // arithmetic over the whole remaining roster, live exposure
      // included. Exact fill passes (remainder < needed refuses),
      // mirroring the embedded gate; a refusal here pays for nothing
      // and mutates nothing.
      const seatsRemaining = spec.roster.floor - spec.roster.admittedChildren;
      if (seatsRemaining > 0) {
        const perSeatProjectionUsd = this.projectedDispatchReserveUsd(spec);
        const remainder = this.budget.remainderOf(spec.parentAccountScope);
        if (
          remainder !== undefined &&
          remainder < seatsRemaining * perSeatProjectionUsd + spec.roster.liveExposureUsd
        ) {
          return {
            verdict: {
              kind: 'reject',
              reason: {
                code: 'roster_floor',
                floor: spec.roster.floor,
                admittedChildren: spec.roster.admittedChildren,
                seatsRemaining,
                perSeatProjectionUsd,
                liveExposureUsd: spec.roster.liveExposureUsd,
                remainderUsd: remainder,
              },
            },
            statsBefore,
          };
        }
      }
    }
    // ONE reserve arithmetic per dispatch posture (RV2004). The spawn
    // tools dispatch through ctx.agent, where only an EXPLICIT
    // budgetUsd materializes as a child-allowance account; the derived
    // childBudgetFraction ceiling never does. The parity rerun's
    // verdicts journaled reserve/childCeiling 0.50 (the fraction cap
    // over the orchestrator remainder) while dispatch committed the
    // declared estCost 0.70: the journal lied about the money the
    // spawn held, resume would have rolled the lie forward, and the
    // 0.50 allowance would have severed the child mid-work. On the
    // spawn-tool path the verdict now IS the dispatch projection
    // (dispatchProjectionReserveUsd, the same formula the embedded
    // gate and preflight evaluate); origins whose allowance account
    // materializes (ctx.workflow and kin) keep the fraction ceiling
    // and its clamp, which are real there.
    const spawnToolOrigin = spec.origin === 'spawn_agent' || spec.origin === 'parallel_agents';
    let childCeilingUsd: number | undefined;
    const parentRemainder = this.budget.remainderOf(spec.parentAccountScope);
    if (spawnToolOrigin) {
      if (spec.budgetUsd !== undefined) {
        childCeilingUsd = spec.budgetUsd;
      }
    } else if (parentRemainder !== undefined) {
      const fractionCap = this.childBudgetFraction * parentRemainder;
      childCeilingUsd =
        spec.budgetUsd === undefined ? fractionCap : Math.min(spec.budgetUsd, fractionCap);
    } else if (spec.budgetUsd !== undefined) {
      childCeilingUsd = spec.budgetUsd;
    }
    // The reserve never exceeds the child's own ceiling: a sub-account
    // bounded to X can never spend more than X, so projected admission
    // must not hold more than X against the parent chain (a flat reserve
    // above a small run ceiling would otherwise deny every capped child).
    let reserveUsd = spec.estCostUsd ?? this.flatReserveUsd;
    const source: NonNullable<BudgetReserve['source']> =
      spec.estCostUsd === undefined ? 'default' : 'estCost';
    let clampedBy: BudgetReserve['clampedBy'];
    if (childCeilingUsd !== undefined && reserveUsd > childCeilingUsd) {
      clampedBy =
        spec.budgetUsd !== undefined && childCeilingUsd === spec.budgetUsd
          ? 'explicit-budget'
          : 'fraction-ceiling';
      reserveUsd = childCeilingUsd;
    }
    const reserve: BudgetReserve = { reserveUsd, source };
    if (clampedBy !== undefined) {
      reserve.clampedBy = clampedBy;
    }
    if (childCeilingUsd !== undefined) {
      reserve.childCeilingUsd = childCeilingUsd;
    }
    if (this.budget.spawnHeadroom <= 0) {
      return { verdict: { kind: 'reject', reason: { code: 'lifetime' } }, statsBefore };
    }
    if (commitReserve) {
      try {
        this.budget.admitSpawn(reserveUsd, spec.parentAccountScope);
      } catch {
        // The layer-1 refusal maps onto the embedded verdict: the caller
        // journals the rejection and surfaces the typed error; the run
        // never tears down here.
        return { verdict: { kind: 'reject', reason: { code: 'budget' } }, statsBefore };
      }
    } else {
      // The spawn tools dispatch through ctx.agent, whose OWN layer-1
      // admission commits the real reserve moments later (one debit,
      // never two); admission still evaluates the parent read-only with
      // the SAME arithmetic that dispatch will apply (the projection
      // below, NOT the fraction-clamped verdict reserve), plus the
      // caller's pending same-batch reserves, so an embedded admit is
      // dispatchable under the snapshot it was decided on (M6-T07; the
      // v1.7.0 follow-up review's P1). Exact fill passes, like
      // admitSpawn.
      const remainder = this.budget.remainderOf(spec.parentAccountScope);
      const projection = this.projectedDispatchReserveUsd(spec);
      if (
        remainder !== undefined &&
        (remainder <= 0 || remainder < projection + (spec.pendingReserveUsd ?? 0))
      ) {
        return { verdict: { kind: 'reject', reason: { code: 'budget' } }, statsBefore };
      }
    }
    this.childrenOf.set(nodeKey, childrenBefore + 1);
    this.admittedTotal += 1;
    const lineage = evaluated.decision.lineage;
    this.registerLineageAdmit(lineage.logicalTaskId);
    // Under a termination account the spawn debit is atomic with this
    // decision: minus one spawnUnit for an admitted spawn of ANY origin;
    // a NEW lineage receives its frozen allocation in the same step, and
    // the balance-after is embedded in the verdict (DEF-2).
    let spawnUnitsAfter = this.budget.spawnHeadroom;
    if (this.terminationAccount !== undefined) {
      const debited = this.terminationAccount.debitSpawn({
        logicalTaskId: lineage.logicalTaskId,
        isNew: spec.lineage === undefined,
        ladderLength: spec.ladderLength ?? 1,
      });
      if (!debited.ok) {
        // Unreachable in a single-threaded admit (pre-checked above);
        // kept total for safety.
        return {
          verdict: { kind: 'reject', reason: { code: 'termination_exhausted' } },
          statsBefore,
        };
      }
      spawnUnitsAfter = debited.spawnUnitsAfter;
    }
    const verdict: AdmitVerdict = {
      kind: 'admit',
      reserve,
      spawnUnitsAfter,
      lineage: {
        logicalTaskId: lineage.logicalTaskId,
        isNew: spec.lineage === undefined,
        depth,
      },
    };
    return {
      verdict,
      statsBefore,
      nodeId: this.mintId(),
      lineage,
      ...(this.terminationAccount === undefined ? {} : { ladderLength: spec.ladderLength ?? 1 }),
    };
  }

  /**
   * Resume roll-forward for an orchestrator child (M6-T07): restores the
   * children-quota counter only. The budget seed already counts settled
   * agent dispatches, and an in-flight child re-commits its reserve
   * through the ctx.agent dispatch path.
   */
  recoverChild(nodeKey: string): void {
    this.childrenOf.set(nodeKey, (this.childrenOf.get(nodeKey) ?? 0) + 1);
    this.admittedTotal += 1;
  }

  /**
   * Resume roll-forward for a child that already SETTLED before the
   * resume: re-registers the counters (maxChildrenPerNode, the lifetime
   * cap, statsBefore fidelity) without committing any reserve; the spend
   * itself sits in the root ledger seed.
   */
  recoverSettled(parentAccountScope: string): void {
    this.budget.admitRecovered(0, parentAccountScope);
    this.childrenOf.set(parentAccountScope, (this.childrenOf.get(parentAccountScope) ?? 0) + 1);
    this.admittedTotal += 1;
  }

  /**
   * Resume roll-forward for an admission whose decision entry exists but
   * whose child has NOT settled: re-applies the recorded reserve and
   * counters without re-evaluating any limit (replay never
   * re-evaluates admission; reserves are recovered, never
   * re-estimated).
   */
  recoverInFlight(parentAccountScope: string, verdict: AdmitVerdict): void {
    if (verdict.kind === 'reject') {
      return;
    }
    const reserveUsd = verdict.kind === 'reuse_full' ? 0 : verdict.reserve.reserveUsd;
    this.budget.admitRecovered(reserveUsd, parentAccountScope);
    this.childrenOf.set(parentAccountScope, (this.childrenOf.get(parentAccountScope) ?? 0) + 1);
    this.admittedTotal += 1;
  }
}
