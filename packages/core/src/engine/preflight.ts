/**
 * The preflight effective-limits estimator and effective-config linter
 * (the experiment-review P2.2): everything the engine would DERIVE from
 * a configuration, computed BEFORE any provider dispatch, machine
 * readable, with zero paid requests by construction (the only adapter
 * surface it touches is the pure caps() lookup).
 *
 * The estimate cannot drift from the engine because it reuses the SAME
 * functions the runtime folds through: mergeUsageLimits for the
 * per-spawn limit merge, admissionReserveUsd for the layer-1 reserve
 * formula, resolvePricing/priceUsdOf for the price interpretation, and
 * quotaRuleMatches for the shared-quota dimension match. Where the
 * runtime consults live state the preflight cannot know (an adapter's
 * countTokens over the real prompt, the actual tool mix a model
 * chooses), the input carries explicit host estimates
 * (`estInputTokens`) and the report says which numbers are floors.
 *
 * Docs: https://docs.rulvar.com/guide/budgets
 */
import type { InvocationRole, ModelRef, ModelSpec } from '../l0/messages.js';
import { parseModelRef } from '../model/router.js';
import type { ModelCaps, Pricing } from '../l0/spi/provider.js';
import {
  requireNonNegativeInteger,
  requireNonNegativeNumber,
  requirePositiveInteger,
  validateEvidenceContract,
} from '../l0/validate-numbers.js';
import type { EvidenceContract } from './ctx.js';
import { priceUsdOf, resolvePricing } from '../model/pricing.js';
import { quotaRuleMatches, type QuotaRule } from '../model/quota.js';
import {
  mergeUsageLimits,
  validateUsageLimits,
  type EffectiveUsageLimits,
  type UsageLimits,
} from '../runtime/usage-limits.js';
import {
  acceptanceJudgePasses,
  acceptanceTailRequiredUsd,
  DEFAULT_CHILD_BUDGET_FRACTION,
  DEFAULT_MAX_DEPTH,
  dispatchProjectionReserveUsd,
  formatAcceptanceTailTerms,
  type AcceptanceTailTerms,
} from '../orchestrator/admission.js';
import {
  DEFAULT_FINISH_MAX_REPAIRS,
  DEFAULT_SYNTHESIS_MAX_TURNS,
  orchestratorAdmissionEstCostUsd,
  type OrchestratorBudgetSpec,
} from '../orchestrator/orchestrate.js';
import { ConfigError } from '../l0/errors.js';
import type { FinishValidator } from '../orchestrator/finish-validators.js';
import {
  selfTestFinishValidation,
  type FinishContract,
  type FinishSelfTestFixtures,
} from '../orchestrator/output-contract.js';
import { admissionReserveUsd, DEFAULT_FLAT_RESERVE_USD } from './budget.js';
import type { CreateEngineOptions, RunOptions } from './engine.js';
import { DEFAULT_PER_RUN_CONCURRENCY } from './scheduler.js';

/**
 * One intended spawn of the wave under estimation: the same layers the
 * engine reads at ctx.agent time (call limits over profile limits over
 * engine defaults; call estCost over profile estCost over the priced
 * estimate over the flat default), plus the two stand-ins a static
 * estimate needs: `estInputTokens` replaces the adapter countTokens the
 * runtime would call over the real prompt, and `count` declares how
 * many spawns of this shape the first wave holds.
 */
export interface PreflightSpawnSpec {
  /** Display label; defaults to the role name. */
  label?: string;
  /** Default 'loop', exactly like ctx.agent. */
  role?: InvocationRole;
  /** A registered AgentProfile name from defaults.profiles. */
  profile?: string;
  /** Wins over the profile model over defaults.routing[role]. */
  model?: ModelSpec;
  /** The call-layer limits, merged exactly like AgentOpts.limits. */
  limits?: UsageLimits;
  /**
   * The declared admission estimate. In a PLAIN wave this is
   * AgentOpts.estCost verbatim. In an orchestrate wave (an
   * `orchestrator` spec is present) a spawn tool has no per-call
   * estCost channel, so declare the agentType PROFILE's estimate here:
   * the layer-2 spawn gate evaluates exactly that (or the flat
   * default), never the priced estimate.
   */
  estCost?: number;
  /**
   * The spawn's explicit budget, exactly the spawn_agent `budgetUsd`
   * param. Consumed by the layer-2 spawn-gate projection only (the
   * shared `dispatchProjectionReserveUsd` clamp); a dynamic spawn's
   * budget never becomes an account, so the layer-1 chain reserve is
   * NOT clamped by it, exactly like the runtime.
   */
  budgetUsd?: number;
  /**
   * The prompt-size stand-in for the runtime's adapter countTokens:
   * feeds the priced admission estimate and the per-turn and quota
   * exposure floors. Absent, the reserve falls through to the flat
   * default exactly like a runtime spawn whose adapter cannot count.
   */
  estInputTokens?: number;
  /** How many spawns of this shape the wave declares; default 1. */
  count?: number;
  /**
   * The declared evidence contract this spawn must fill (RV303): wins
   * over the registered profile's declaration. The estimator compares
   * the call floor (`minEntries * estCallsPerEntry + overheadCalls`,
   * defaults 3 and 8) against the spawn's effective executed-call
   * ceiling and warns `tool-cap-below-evidence-floor` when the cap
   * cannot fit the contract.
   */
  evidenceContract?: EvidenceContract;
}

/** The OrchestrateOptions slice the estimator consumes. */
export interface PreflightOrchestratorSpec {
  budget?: OrchestratorBudgetSpec;
  /** The per-orchestrate spawn cap, exactly OrchestrateOptions.maxSpawns. */
  maxSpawns?: number;
  /** The orchestrator agent's own limits, exactly OrchestrateOptions.limits. */
  limits?: UsageLimits;
  /**
   * The prompt-size stand-in for the UNCAPPED orchestrator's priced
   * admission estimate (the goal prompt the runtime would countTokens).
   * A CAPPED orchestrator ignores it: its admission estimate is the
   * shared exact-fill hint (effectiveCap minus the committed finalize
   * carve-out), exactly the live dispatch.
   */
  estInputTokens?: number;
  /**
   * Whether the orchestration runs under a plan extension (PlanRunner):
   * only extension runs commit the finalize reserve against the run
   * root, so only they subtract it from spawn-admission headroom.
   */
  extension?: boolean;
  /**
   * The OrchestrateAcceptance slice the estimator judges (RV305):
   * declaring it lets preflight relate capped children to the salvage
   * arms. Absent, the salvage findings stay silent, exactly like every
   * other undeclared input.
   */
  acceptance?: {
    childPolicy?: 'all-ok' | { minSuccessful: number };
    acceptPartialChildren?: boolean;
    acceptValidatedTerminalOutputOnLimit?: boolean;
    /**
     * Mirrors OrchestrateAcceptance.minSpawnedChildren (RV1901, the
     * four-role benchmark's primary defect): declaring it lets the
     * admission projection judge whether the declared wave can seat
     * the roster the acceptance policy demands, instead of green-
     * lighting a wave the settle verdict is bound to reject.
     */
    minSpawnedChildren?: number;
  };
  /**
   * The separate synthesis invocation (RV-211), when the orchestration
   * configures one (the v1.71 experiment review: the run ceiling used
   * to stop at the coordination loop, undercounting the synthesis
   * turns). `limits` mirrors OrchestrateSynthesis.limits exactly
   * (absent = the DEFAULT_SYNTHESIS_MAX_TURNS invocation), `model`
   * mirrors its model override (absent = defaults.routing.synthesize),
   * and `estInputTokens` is the prompt-size stand-in for the derived
   * synthesis prompt. When `finishValidation.repairTurnReserve` is
   * declared, the reserve folds into THIS invocation's projected turns,
   * because the validators bind the synthesis finish.
   */
  synthesis?: {
    model?: ModelSpec;
    limits?: UsageLimits;
    estInputTokens?: number;
    /**
     * Mirrors OrchestrateSynthesis.estCost (RV4001): the declared
     * price of one composition, the armed repair round's second
     * invocation among them. The `acceptanceReserve` block prices the
     * round's composition at exactly this figure, the same term the
     * RV3907 runtime gate holds, so declaring it here is what makes
     * the preflight verdict and the boot verdict one number.
     */
    estCost?: number;
    /**
     * Mirrors OrchestrateSynthesis.exposeChildResultTools (the v1.74
     * experiment review, P0.2): declaring it lets the evidence
     * asymmetry check see that the synthesis model can page the full
     * child outputs the validators judge against.
     */
    exposeChildResultTools?: boolean;
    /** Mirrors OrchestrateSynthesis.context; default 'digests'. */
    context?: 'digests' | 'full';
  };
  /**
   * The claim-consistency judge's admission estimate (RV2106), exactly
   * OrchestrateClaimConsistency.judge.estCost: the post-fan-in judge
   * admits against the ORCHESTRATOR account, whose working room past
   * the held synthesis reserve the coordination loop's own turns spend
   * from first. Declaring the estimate lets the estimator judge that
   * room statically (`orchestrator-working-room`); absent, the finding
   * stays silent, exactly like every other undeclared input.
   */
  claimConsistency?: {
    judge?: { estCost?: number };
    /**
     * Mirrors OrchestrateClaimConsistency.onFound (RV3402). Declaring
     * `'repair'` prices the bounded post judge round (RV3307) into the
     * static arithmetic: the working room adds one more judge pass and
     * one more composition (priced at the declared
     * `budget.synthesisReserveUsd`, the host's own estimate of one
     * composition), and the tail spawn count adds the round's two
     * invocations. The 2026-08-12 comparison shape motivates the
     * polarity: a ceiling sized to the exact plan converts a triggered
     * repair into the typed decline, and preflight should say so
     * before the first wire, not the journal after the last. Pairings
     * orchestrate() refuses at intake (repair at the draft stage,
     * repair without a synthesis, carry at the final stage, RV3301)
     * surface as error findings: the run would refuse to start. This
     * static arithmetic has a runtime twin (RV3701): at the moment a
     * round actually dispatches, the engine holds the money of the round's second judge pass
     * (this same `judge.estCost` first, else the run's own observed
     * post draft judge price) until that pass admits, so the
     * declared estimate is not only judged before the run but enforced
     * inside it. The mechanical leg has the same twin (RV3802): the
     * one repair turn the round's finish contract can grant is held as
     * `finishValidation.estRepairCostUsd` (else the run's observed
     * last mechanical repair price) beside the verdict money, released
     * to the round's finish loop at its first verdict; the runtime
     * enforcement of the `repairTurnReserve` turn grant's price.
     */
    onFound?: 'report' | 'carry' | 'fail' | 'repair';
    /**
     * Mirrors OrchestrateClaimConsistency.stage (RV3402): `'both'`
     * dispatches the judge twice at worst, and the working room and
     * tail spawn arithmetic price passes, not declarations. Absent
     * keeps the historical one pass reading byte for byte.
     */
    stage?: 'draft' | 'final' | 'both';
  };
  /**
   * The citation entailment audit's admission slice (RV4004), exactly
   * OrchestrateCitationAudit's judge estimate and posture: the audit
   * judge pays one pass (two under its own armed round, which also
   * arms the round composition term and one more claim rejudge when a
   * claim pass is declared past the draft), and the acceptanceReserve
   * block prices it with the SAME shared formula the runtime gate
   * holds. Absent keeps every figure byte identical.
   */
  citationAudit?: {
    judge?: { estCost?: number };
    onFound?: 'report' | 'repair' | 'fail';
  };
  /**
   * Mirrors OrchestrateOptions.maxTotalRepairRounds (RV4406): the one
   * run-wide pool every provider-dispatching repair grant consumes
   * from. Declaring it lets the estimator judge the pool against the
   * armed semantic round and the mechanical grants that share it
   * (RV4705): the eighth comparison rerun's mechanical composition
   * repair drained a one-token pool before the judges ruled, and the
   * armed round was refused over 38 standing findings; preflight said
   * nothing. Absent keeps the report and findings byte identical.
   */
  maxTotalRepairRounds?: number;
  /**
   * Mirrors OrchestrateOptions.maxSemanticRepairRounds (RV4705): the
   * scoped semantic reserve inside the pool. Declared beside a total
   * pool it shrinks the mechanical allowance the findings judge;
   * greater than the total mirrors the intake ConfigError as an error
   * finding, because the run would refuse to start.
   */
  maxSemanticRepairRounds?: number;
  /**
   * The `reserve-line-headroom` threshold in coordination turn floors
   * (RV2201; previously hardwired to 2): the finding warns when the
   * admitted wave's steady state sits closer to the reserve line than
   * this many coordination turn floors. Raise it for waves whose
   * children routinely overrun their declared estimates; 0 silences
   * the finding entirely. Default 2.
   */
  headroomTurns?: number;
  /**
   * The `ceiling-headroom-thin` threshold as a fraction of the ceiling
   * (RV3208, the 2026-08-11 experiment's admission cliff: a $7.00
   * ceiling over a $6.80 required minimum left 2.86 percent headroom,
   * and a small pricing or context drift would have refused the whole
   * workflow at admission). The finding warns when
   * `ceilingHeadroomShare` sits below this fraction. A number in
   * [0, 1]; 0 (the default) keeps the finding silent, so declared
   * configs are byte identical until a host opts in.
   */
  minCeilingHeadroomShare?: number;
  /**
   * What a breached headroom floor emits (RV3310). The default
   * 'warning' keeps RV3208's behavior byte for byte: advisory, and a
   * host that only throws on errors sails past it. 'error' makes the
   * breach blocking for exactly such hosts: the 2026-08-12 comparison
   * harness threw on error findings only, its 2 percent floor held
   * against a 2.857 percent headroom, and the assurance answer to
   * "this plan is too thin to survive drift" must be refusal before
   * the first wire, not a line in a report nobody gates on.
   * Meaningful only beside a positive `minCeilingHeadroomShare`.
   */
  ceilingHeadroomSeverity?: 'warning' | 'error';
}

/** The full input: engine surface, run surface, and the declared wave. */
export interface PreflightInput {
  /** The same object createEngine would receive (adapters used for pure caps() only). */
  engine?: Partial<
    Pick<
      CreateEngineOptions,
      'adapters' | 'defaults' | 'budgetDefaults' | 'concurrency' | 'quota' | 'pricing'
    >
  >;
  /** The RunOptions slice: the ceiling, run-level limits, and the RV711 exposure cap. */
  run?: Pick<RunOptions, 'budgetUsd' | 'limits' | 'maxInFlightExposureUsd'>;
  /** Present when the run is a dynamic orchestration. */
  orchestrator?: PreflightOrchestratorSpec;
  /** The declared first spawn wave, in admission order. */
  spawns?: PreflightSpawnSpec[];
  /**
   * The quota rule set behind the configured limiter, when the host
   * uses a rule-driven implementation (memoryQuotaLimiter,
   * SqliteQuotaLimiter): the SPI hides rules behind reserve(), so the
   * demand comparison needs them declared here.
   */
  quotaRules?: readonly QuotaRule[];
  /**
   * The opt in finish validation self test (the v1.71 experiment
   * review, P1.1). Programmatic only: validator functions cannot ride
   * a JSON config file, so the CLI never carries this. When present,
   * preflight runs the SAME golden self test orchestrate runs at
   * construction and reports every drift as an error finding instead
   * of throwing, so a planner surfaces it next to the quota and budget
   * findings: 'output-contract-validator-mismatch' for containment and
   * accept-side drift, 'output-contract-validator-weakened' (cycle 74)
   * when a configured validator fails the contract's per validator
   * reject golden, the same-name weakened replacement.
   */
  finishValidation?: {
    validators: FinishValidator[];
    contract?: FinishContract;
    selfTest?: FinishSelfTestFixtures;
    /**
     * Mirrors FinishValidationSpec.repairTurnReserve: folds the
     * declared repair headroom into the projected turns of the
     * invocation the validators bind (the synthesis invocation when
     * orchestrator.synthesis is declared, the coordination loop
     * otherwise), so the run ceiling prices the repair exchange the
     * runtime would actually grant.
     */
    repairTurnReserve?: number;
    /**
     * Mirrors FinishValidationSpec.maxRepairs (default
     * {@link DEFAULT_FINISH_MAX_REPAIRS}): with zero, the first
     * rejection is final and there is no repair exchange to fund, so
     * the repair-reserve-unfunded warning stays silent. It also SIZES
     * the mandatory synthesis tail (RV2504): every granted repair can
     * write to the output allowance, so the tail
     * `synthesis-reserve-below-cap-composition` prices is one
     * composition plus this many turns, whatever the turn reserve
     * says. Since RV3602 the bound belongs to one composition
     * invocation, so this tail is the price of EACH invocation: the
     * armed claim repair round (RV3307) runs a second invocation with
     * its own full bound, and the working room finding already prices
     * that round at the declared synthesis reserve, the host's own
     * estimate of exactly this tail.
     */
    maxRepairs?: number;
    /**
     * Mirrors FinishValidationSpec.draftPolicy (the fifth experiment,
     * cycle 75): declaring it lets the estimator compare the draft
     * gate's word floor against the contract's own word minimum. The
     * experiment gated drafts at 3200 words under a 4500 word contract,
     * so the gate admitted a draft the final validators had to reject
     * and the synthesis started from an underlength base; the
     * draft-gate-below-contract warning names exactly that shape. The
     * sentinel `'contract'` (RV808a) gates the draft by the full
     * validator set, so the below-contract shape cannot exist and the
     * warning never fires.
     */
    draftPolicy?:
      | {
          minWords?: number;
          requireSections?: string[];
        }
      | 'contract';
    /**
     * Mirrors FinishValidationSpec.estRepairCostUsd (RV4001): the
     * declared price of the one mechanical repair turn the finish
     * contract can grant (RV3802 holds exactly this figure live). The
     * `acceptanceReserve` block folds it into the required tail, the
     * same term the RV3907 runtime gate sums, so a declared repair
     * price is judged before the run and enforced inside it by the
     * SAME arithmetic.
     */
    estRepairCostUsd?: number;
  };
}

/** One linter verdict; `spawn` names the wave entry it is about. */
export interface PreflightFinding {
  severity: 'error' | 'warning' | 'info';
  /** Stable kebab-case code for machine consumption. */
  code: string;
  message: string;
  spawn?: string;
}

/** Per-tool executed-call ceiling and the limiter that provides it. */
export interface PreflightToolCeiling {
  /** A named tool, or '(any)' for a tool no cap or cost names. */
  tool: string;
  /** Executed calls possible for this tool alone; null = unlimited. */
  ceiling: number | null;
  /** The limiter producing the ceiling, when one binds. */
  boundBy?: 'maxCallsPerTool' | 'toolUnits' | 'maxToolCalls';
}

/** The effective picture of one declared spawn shape. */
export interface PreflightSpawnReport {
  label: string;
  role: InvocationRole;
  count: number;
  /** The resolved serving target; absent when no model resolves (see findings). */
  servedBy?: ModelRef;
  /** True when the serving model has no price row: a USD ceiling cannot bound it. */
  unpriced?: true;
  /**
   * The serving row's last rates verification date (RV814), copied
   * from the resolved pricing; absent when the row names none. Every
   * dollar in this report is priced under that row, so its staleness
   * is part of the projection's honesty.
   */
  ratesVerifiedAt?: string;
  /** The SAME merge the runtime applies: call over profile over engine defaults. */
  limits: EffectiveUsageLimits;
  /** The layer-1 admission reserve this spawn would be admitted under. */
  admissionReserveUsd: number;
  /** Which arm of the reserve formula produced the number. */
  reserveSource:
    'estCost' | 'profile-estCost' | 'priced-estimate' | 'flat-default' | 'unpriced-zero';
  /** The per-turn output bound: caps.maxOutputTokens clamped by the limits field. */
  maxOutputTokensPerTurn?: number;
  /**
   * The cost floor of ONE turn at the declared estimates: estInputTokens
   * (default 0) plus the output bound, priced like settlement. A real
   * turn grows with the prompt, so this is a floor, never a cap.
   */
  turnFloorUsd?: number;
  /**
   * The loop's input floor over its projected turns, UNCACHED
   * (RV2007): the declared prompt floor (`estInputTokens`) re-billed
   * at the full input rate on every projected provider turn. A floor
   * over the static prefix: real prompts grow. Present when the shape
   * prices and projects more than one turn.
   */
  uncachedLoopInputFloorUsd?: number;
  /**
   * The same loop under the RV2006 cache policy: one cache write of
   * the prompt floor plus a cache read on every later turn, priced by
   * the row's cache rates. Present beside the uncached figure when
   * the row carries cache rates. The parity worker shape (36k-token
   * prompt floor, a long cycle) prices the difference at roughly
   * three to four times, the gap between four seats fitting a $6
   * envelope and three seats dying against it.
   */
  cachedLoopInputFloorUsd?: number;
  /**
   * The estIsCeiling feasibility line (RV4702, the eighth comparison
   * experiment's first run): present exactly when the orchestrator
   * budget declares `estIsCeiling: true` and the floors price.
   * `ceilingUsd` is the child's hard ceiling under that flag (the
   * explicit spawn budget, else the declared estimate), and
   * `requiredFloorUsd` the cheapest honest reading of the declared
   * posture: the loop input floor across the projected turns
   * (cache-aware when the policy allows) plus ONE tail turn at the
   * declared floor, the finalize-shaped dispatch that run died on. A
   * ceiling below the floor cannot finish the loop it admits at the
   * declared prices, by construction; that run shipped 1.35 against
   * roughly 1.88, preflight said nothing, and the death cost 6.74
   * USD.
   */
  estCeiling?: { ceilingUsd: number; requiredFloorUsd: number; fits: boolean };
  /** Executed-call ceiling across any tool mix; null = unlimited. */
  executedToolCallCeiling: number | null;
  /**
   * The provider-call ceiling of ONE spawn's whole loop: maxTurns
   * bounded by the executed-call ceiling plus its final no-tool turn,
   * plus the finalization summary turn when a tool budget limiter arms
   * it. Every provider turn is one wire request and one quota
   * reservation, so this is the per-spawn multiplier of quota demand;
   * retries sit on top of it.
   */
  projectedProviderTurns: number;
  /** Per-tool ceilings for every tool a cap or a unit cost names. */
  toolCeilings: PreflightToolCeiling[];
}

/** One wave entry of the admission projection. */
export interface PreflightAdmissionRow {
  label: string;
  reserveUsd: number;
  admitted: boolean;
  deniedBy?: 'budget' | 'spawn-cap' | 'orchestrator-max-spawns';
  /**
   * The run-root money already held when this row was evaluated:
   * committed reserves of the earlier rows plus the finalization and
   * synthesis carve-outs (RV1901). The row admits iff held + reserveUsd
   * fits the ceiling (children strictly below it at exact fill), so a
   * denied row's arithmetic is auditable term by term. Present only
   * under a USD ceiling.
   */
  heldAtEvaluationUsd?: number;
}

/** The machine-readable preflight report; JSON-serializable throughout. */
export interface PreflightReport {
  concurrency: { perRun: number; perProvider?: Record<string, number> };
  budget: {
    ceilingUsd?: number;
    flatReserveUsd: number;
    lifetimeSpawnCap: number;
    childBudgetFraction: number;
    maxDepth: number;
    orchestrator?: {
      /** min(capUsd, (capFraction ?? 0.2) x ceiling); absent when unresolvable. */
      effectiveCapUsd?: number;
      finalizeReserveUsd: number;
      finalizeTurns: number;
      /** Whether the finalize reserve is committed against the run root (extension runs). */
      reserveCommitted: boolean;
      /** The orchestrator agent's own loop ceiling, derived exactly like a spawn's. */
      projectedProviderTurns: number;
      /**
       * The separate synthesis invocation's projection, present when
       * input.orchestrator.synthesis was declared and the role
       * resolves: its turn ceiling (the repair turn reserve folded in
       * when declared) and its serving model.
       */
      synthesis?: {
        projectedProviderTurns: number;
        servedBy?: ModelRef;
      };
      /**
       * The acceptance-tail verdict (RV4001), present exactly when
       * budget.acceptanceReserve is declared: the SAME
       * acceptanceTailRequiredUsd arithmetic the RV3907 runtime gate
       * holds the boot against, term by term, so `fits` here IS the
       * gate's answer. The fifth comparison experiment ran a plan
       * preflight passed green at a $4.54 cap into a typed runtime
       * refusal at $4.82 because the two sides computed different
       * formulas; they now compute one.
       */
      acceptanceReserve?: {
        declared: 'warn' | 'require' | 'checkpoint';
        requiredUsd: number;
        /** Absent when no cap resolves; the runtime then refuses under 'require'. */
        effectiveCapUsd?: number;
        /** Exact fill admits, exactly the runtime gate. */
        fits: boolean;
        terms: AcceptanceTailTerms;
      };
      /**
       * The run repair pool and its scoped semantic reserve (RV4705),
       * present when either bound is declared: `mechanicalAllowance`
       * is what finish-validation grants can actually draw (the total
       * minus the unspent reserve), the figure the eighth comparison
       * rerun needed before its mechanical repair ate the armed
       * round's only token.
       */
      repairPool?: {
        maxTotalRepairRounds?: number;
        maxSemanticRepairRounds?: number;
        /** The pool minus the reserve; absent without a declared total. */
        mechanicalAllowance?: number;
      };
    };
  };
  quota: { configured: boolean; tenant?: string; rules?: number };
  /** The run-level merge an undeclared spawn would receive. */
  runLimits: EffectiveUsageLimits;
  spawns: PreflightSpawnReport[];
  admission: {
    ceilingUsd?: number;
    reservedForFinalizationUsd: number;
    /**
     * The synthesis payload carve-out the projection holds against the
     * run root, exactly the live commitSynthesisReserve mirror (RV1901):
     * a capped orchestrator with budget.synthesisReserveUsd registers it
     * on the root before any spawn admits, so the wave arithmetic must
     * hold it too. Zero when the orchestrator is uncapped or declares no
     * synthesis reserve, matching the runtime that then commits none.
     */
    synthesisReserveUsd: number;
    /**
     * The smallest run ceiling that seats the WHOLE declared wave
     * (RV1907): every row's reserve plus the finalization and synthesis
     * carve-outs. Children admit strictly below exact fill, so a viable
     * ceiling must sit strictly ABOVE this figure; the four-role
     * benchmark's $6.00 sat $0.98 below it and lost its third and
     * fourth workers. Present whenever the wave has rows.
     */
    requiredMinimumCeilingUsd?: number;
    /**
     * The ceiling minus the required minimum (RV3208): the absolute
     * dollars of drift the admission survives before the wave stops
     * seating. Present beside requiredMinimumCeilingUsd whenever a
     * ceiling is declared.
     */
    ceilingHeadroomUsd?: number;
    /**
     * The same headroom as a fraction of the ceiling (RV3208): the
     * one-field read of the admission cliff (the 2026-08-11 experiment
     * ran at 0.0286). Present beside ceilingHeadroomUsd on positive
     * ceilings.
     */
    ceilingHeadroomShare?: number;
    /**
     * The live-root-exposure term of the wave projection (RV2004): the
     * orchestrator's own worst-case turn floor, the money coordination
     * has ALWAYS already spent (and holds in flight) by the time any
     * spawn tool runs. The parity rerun's fourth seat fit the plain
     * wave (5.95 under 6.00) and was refused live by exactly this
     * term; the embedded spawn gate and requiredMinimumCeilingUsd now
     * carry it, so a seat that cannot admit live cannot admit in
     * preflight either. Present on orchestrate waves whose
     * coordination turn prices.
     */
    liveRootExposureTermUsd?: number;
    /**
     * The reserve line (RV2101): the run ceiling minus the synthesis
     * reserve, the boundary the budget chain fences every non-tail
     * dispatch at while the promise is held. Present when a ceiling
     * and a positive synthesis reserve are both declared.
     */
    reserveLineUsd?: number;
    /**
     * How far the admitted wave's steady state sits under the reserve
     * line (RV2101). Child spend past the declared estimates consumes
     * this headroom before the coordination loop is refused at the
     * line; under two coordination turn floors the projection warns
     * with `reserve-line-headroom`. Present beside reserveLineUsd.
     */
    reserveLineHeadroomUsd?: number;
    wave: PreflightAdmissionRow[];
    admitted: number;
    denied: number;
  };
  exposure: {
    /** Concurrent in-flight turns the declared wave can hold. */
    maxInFlight: number;
    /**
     * The one-more-turn cost floor past a ceiling crossing: the sum of
     * the maxInFlight most expensive declared turn floors. The
     * documented overshoot bound is one turn per in-flight agent; real
     * turns grow with the prompt, so this is the floor of that bound.
     */
    overshootOneTurnFloorUsd?: number;
    /**
     * The smallest in-flight exposure cap under which the declared wave
     * can breathe (RV1907): the finalization and synthesis carve-outs
     * plus the turn floors of the maxInFlight most expensive declared
     * dispatches, the orchestrator's own turn among them. Below it the
     * root's next turn is refused beside a full child wave, the
     * recovery arm's exact death; the RV1902 wait recovers the run, but
     * only a cap at or above this floor avoids the stall entirely.
     * Absent when no declared turn prices.
     */
    requiredMinimumExposureUsd?: number;
    /** Per-provider first-wave demand at the declared estimates. */
    perProvider: Record<
      string,
      { inFlight: number; requestsPerWave: number; tokensPerWaveFloor: number }
    >;
    /**
     * The declared wave run to its derived turn ceilings, at the
     * declared estimates (the second experiment report, rec 9): total
     * provider calls (fan-out times per-spawn projected turns, before
     * any retries) and the cumulative token demand with the context
     * regrowing every turn (turn k re-sends the declared prompt plus
     * the k-1 prior output bounds, so K turns cost K x est +
     * outputBound x K(K+1)/2). Absent when nothing is declared.
     */
    runCeiling?: { requests: number; tokens: number };
  };
  /**
   * Present when input.finishValidation was provided: the self test
   * echo. `selfTest` reflects the golden fixture run alone
   * ('skipped' = no fixture resolvable); containment drift between a
   * contract and the validator set reports through findings either
   * way.
   */
  finishValidation?: {
    contractHash?: string;
    validators: string[];
    selfTest: 'passed' | 'failed' | 'skipped';
  };
  findings: PreflightFinding[];
}

interface SpawnUnit {
  label: string;
  provider?: string;
  model?: string;
  turnFloorUsd?: number;
  tokensFloor: number;
}

/** One declared spawn shape of the run-ceiling quota projection. */
interface QuotaShape {
  label: string;
  provider?: string;
  model?: string;
  /** The declared prompt floor (estInputTokens); 0 when undeclared. */
  inputFloor: number;
  /** The per-turn output bound; 0 when nothing bounds output. */
  outputBound: number;
  /** The provider-call ceiling of one spawn's loop. */
  turns: number;
  count: number;
}

/**
 * The overall executed-call ceiling across any tool mix: the cheapest
 * single-tool strategy bounds it from above; maxToolCalls bounds it
 * regardless of mix. A free tool (unit cost 0) lifts the units bound
 * entirely for calls of that tool.
 */
/**
 * maxToolCalls at the fully extended cap (RV301): the projections
 * assume every grant lands, because quota demand and the checkpoint
 * loss window must hold at the worst case, not the base cap.
 */
function extendedMaxToolCalls(limits: EffectiveUsageLimits): number | undefined {
  if (limits.maxToolCalls === undefined) {
    return undefined;
  }
  const extension = limits.toolBudgetExtension;
  return extension === undefined
    ? limits.maxToolCalls
    : limits.maxToolCalls + extension.maxExtensions * extension.increment;
}

function overallExecutedCeiling(
  limits: EffectiveUsageLimits,
  toolCeilings: PreflightToolCeiling[],
): number | null {
  const overall = toolCeilings.reduce<number | null>(
    (best, row) =>
      row.ceiling === null ? best : best === null ? row.ceiling : Math.max(best, row.ceiling),
    null,
  );
  const callCap = extendedMaxToolCalls(limits);
  return callCap !== undefined && (overall === null || callCap < overall) ? callCap : overall;
}

/**
 * The provider-call ceiling of one whole loop: maxTurns bounded by the
 * executed-call ceiling plus the final no-tool turn, plus the
 * finalization summary turn when a tool budget limiter arms it.
 */
function projectedProviderTurnsOf(
  limits: EffectiveUsageLimits,
  executedToolCallCeiling: number | null,
): number {
  const toolBound = executedToolCallCeiling === null ? undefined : executedToolCallCeiling + 1;
  const finalizeTurn =
    limits.finalizationReserve !== undefined &&
    (limits.maxToolCalls !== undefined || limits.toolUnits !== undefined)
      ? 1
      : 0;
  const base = toolBound === undefined ? limits.maxTurns : Math.min(limits.maxTurns, toolBound);
  return base + finalizeTurn;
}

/** Cumulative token demand of one whole loop at the declared estimates. */
function shapeRunTokens(shape: QuotaShape): number {
  return shape.turns * shape.inputFloor + (shape.outputBound * shape.turns * (shape.turns + 1)) / 2;
}

const ANY_TOOL = '(any)';

/** Default estimated executed calls per recorded evidence entry (RV303). */
export const DEFAULT_EVIDENCE_CALLS_PER_ENTRY = 3;
/** Default estimated non-evidence overhead calls of a research spawn (RV303). */
export const DEFAULT_EVIDENCE_OVERHEAD_CALLS = 8;

function resolveServing(spec: ModelSpec | undefined): ModelRef | undefined {
  if (spec === undefined) {
    return undefined;
  }
  if (typeof spec === 'string') {
    return spec;
  }
  if ('model' in spec) {
    return spec.model;
  }
  const rung = spec.ladder.rungs[spec.ladder.startTier];
  return rung?.model;
}

/**
 * Per-tool executed-call ceilings from the merged limits: for every
 * tool a per-tool cap or a unit cost names (plus the '(any)' tool that
 * nothing names, unit cost 1), the smallest of maxCallsPerTool[T],
 * floor(toolUnits.max / cost(T)) for a positive cost (a zero cost is
 * free), and maxToolCalls.
 */
function toolCeilingsOf(limits: EffectiveUsageLimits): PreflightToolCeiling[] {
  const names = new Set<string>();
  for (const name of Object.keys(limits.maxCallsPerTool ?? {})) {
    names.add(name);
  }
  for (const name of Object.keys(limits.toolUnits?.costs ?? {})) {
    names.add(name);
  }
  const rows: PreflightToolCeiling[] = [];
  for (const tool of [...[...names].sort(), ANY_TOOL]) {
    const terms: Array<{ boundBy: PreflightToolCeiling['boundBy']; ceiling: number }> = [];
    const cap = tool === ANY_TOOL ? undefined : limits.maxCallsPerTool?.[tool];
    if (cap !== undefined) {
      terms.push({ boundBy: 'maxCallsPerTool', ceiling: cap });
    }
    if (limits.toolUnits !== undefined) {
      const cost = tool === ANY_TOOL ? 1 : (limits.toolUnits.costs?.[tool] ?? 1);
      if (cost > 0) {
        terms.push({ boundBy: 'toolUnits', ceiling: Math.floor(limits.toolUnits.max / cost) });
      }
    }
    const callCap = extendedMaxToolCalls(limits);
    if (callCap !== undefined) {
      // The fully extended cap (RV301): a grant only ever raises the
      // executed-call limiter, so the ceiling it contributes is the
      // worst case, like every other projection here.
      terms.push({ boundBy: 'maxToolCalls', ceiling: callCap });
    }
    if (terms.length === 0) {
      rows.push({ tool, ceiling: null });
      continue;
    }
    const min = terms.reduce((best, term) => (term.ceiling < best.ceiling ? term : best));
    rows.push({ tool, ceiling: min.ceiling, boundBy: min.boundBy });
  }
  return rows;
}

function validateSpawnSpec(spec: PreflightSpawnSpec, index: number): void {
  const site = `preflight.spawns[${index}]`;
  if (spec.limits !== undefined) {
    validateUsageLimits(spec.limits, `${site}.limits`);
  }
  if (spec.evidenceContract !== undefined) {
    validateEvidenceContract(spec.evidenceContract, `${site}.evidenceContract`);
  }
  if (spec.estCost !== undefined) {
    requireNonNegativeNumber(spec.estCost, `${site}.estCost`);
  }
  if (spec.estInputTokens !== undefined) {
    requireNonNegativeInteger(spec.estInputTokens, `${site}.estInputTokens`);
  }
  if (spec.count !== undefined) {
    requirePositiveInteger(spec.count, `${site}.count`);
  }
  if (spec.budgetUsd !== undefined) {
    requireNonNegativeNumber(spec.budgetUsd, `${site}.budgetUsd`);
  }
}

/**
 * Computes the preflight report: the effective merged limits per
 * declared spawn, the layer-1 admission projection over the declared
 * wave, the per-tool and weighted-unit bottleneck ordering, the
 * concurrency and quota exposure at the declared estimates, and the
 * linter findings. Pure: no engine is constructed, no store is opened,
 * no adapter stream is dispatched, and no journal entry is written.
 */
export function preflightEstimate(input: PreflightInput): PreflightReport {
  const engine = input.engine ?? {};
  const defaults = engine.defaults ?? {};
  if (defaults.limits !== undefined) {
    validateUsageLimits(defaults.limits, 'preflight.engine.defaults.limits');
  }
  if (input.run?.limits !== undefined) {
    validateUsageLimits(input.run.limits, 'preflight.run.limits');
  }
  if (input.run?.maxInFlightExposureUsd !== undefined) {
    requireNonNegativeNumber(
      input.run.maxInFlightExposureUsd,
      'preflight.run.maxInFlightExposureUsd',
    );
  }
  // The same guard the runtime applies to RunOptions.budgetUsd (RV803):
  // preflight validated the limits, the exposure cap, and every spawn
  // budget, but read the run ceiling raw, so a NaN or negative ceiling
  // flowed silently into every projection this report is built from.
  if (input.run?.budgetUsd !== undefined) {
    requireNonNegativeNumber(input.run.budgetUsd, 'preflight.run.budgetUsd');
  }
  if (input.orchestrator?.limits !== undefined) {
    validateUsageLimits(input.orchestrator.limits, 'preflight.orchestrator.limits');
  }
  const findings: PreflightFinding[] = [];
  const say = (finding: PreflightFinding): void => {
    findings.push(finding);
  };

  /**
   * The contract turn feasibility check (the v1.74 experiment review,
   * cycle 73), run against the invocation the validators bind. The
   * floor is the contract's own minimal accepting payload, serialized
   * exactly as the model must emit it ({ result }) and priced at the
   * loop's four-characters-per-token output heuristic: the v1.74 run's
   * conforming payloads truncated at their 9000 token turn cap, and its
   * contract's minimum alone prices above that cap. A minimum at or
   * over the bound is an error (every conforming finish truncates mid
   * payload); a minimum within double of the bound is a warning,
   * because real conforming payloads run richer than the minimum.
   */
  const contractFeasibilityFindings = (
    outputBound: number | undefined,
    spawn: 'orchestrator' | 'synthesis',
    servedBy: ModelRef,
  ): void => {
    const contract = input.finishValidation?.contract;
    if (contract === undefined || outputBound === undefined) {
      return;
    }
    const minTokens = Math.ceil(JSON.stringify({ result: contract.goldenAccept.text }).length / 4);
    const which = spawn === 'synthesis' ? 'the synthesis invocation' : 'the coordination loop';
    if (minTokens >= outputBound) {
      say({
        severity: 'error',
        code: 'output-contract-turn-infeasible',
        message:
          `the finish contract's minimal accepting payload is about ${String(minTokens)} ` +
          `tokens (four characters per token over the golden accept fixture) but ${which} ` +
          `dispatches at most ${String(outputBound)} output tokens per turn ('${servedBy}'): ` +
          'every conforming finish truncates mid payload; raise maxOutputTokensPerTurn or ' +
          'shrink the contract',
        spawn,
      });
      return;
    }
    if (minTokens * 2 > outputBound) {
      say({
        severity: 'warning',
        code: 'output-contract-turn-headroom',
        message:
          `the finish contract's minimal accepting payload is about ${String(minTokens)} ` +
          `tokens against the ${String(outputBound)} token output bound of ${which} ` +
          `('${servedBy}'): real conforming payloads run richer than the minimum and the ` +
          'margin is under double; raise the bound or trim the contract',
        spawn,
      });
    }
  };

  const adapters = new Map((engine.adapters ?? []).map((adapter) => [adapter.id, adapter]));
  const capsOf = (ref: ModelRef): ModelCaps | undefined => {
    const { adapterId, model } = parseModelRef(ref);
    return adapters.get(adapterId)?.caps(model);
  };
  const pricingOf = (ref: ModelRef): Pricing | undefined =>
    resolvePricing(ref, engine.pricing, capsOf(ref)?.pricing);

  const ceilingUsd = input.run?.budgetUsd;
  const flatReserveUsd = engine.budgetDefaults?.flatReserveUsd ?? DEFAULT_FLAT_RESERVE_USD;
  const lifetimeSpawnCap = engine.budgetDefaults?.lifetimeSpawnCap ?? 500;
  const childBudgetFraction =
    engine.budgetDefaults?.childBudgetFraction ?? DEFAULT_CHILD_BUDGET_FRACTION;
  const maxDepth = engine.budgetDefaults?.maxDepth ?? DEFAULT_MAX_DEPTH;
  const perRun = engine.concurrency?.perRun ?? DEFAULT_PER_RUN_CONCURRENCY;

  // The run-level merge an undeclared spawn receives: RunOptions.limits
  // over engine defaults (no call layer, no profile layer).
  const runLimits = mergeUsageLimits(undefined, input.run?.limits, defaults.limits);

  // ---- The orchestrator cap and finalize reserve, exactly the boot
  // derivation in orchestrate(): effectiveCap = min(capUsd,
  // (capFraction ?? 0.2) x ceiling); finalize reserve defaults to
  // finalizeTurns x the flat reserve; only extension runs commit it
  // against the run root.
  // The finish repair reserve (the v1.71 experiment review, P0.4) folds
  // into the turn projection of the invocation the validators bind: the
  // synthesis invocation when one is declared, the coordination loop
  // otherwise. Zero (or no declaration) changes nothing.
  const finishRepairReserve = input.finishValidation?.repairTurnReserve ?? 0;
  const coordinationRepairReserve =
    input.orchestrator?.synthesis === undefined ? finishRepairReserve : 0;
  let orchestratorEcho: NonNullable<PreflightReport['budget']['orchestrator']> | undefined;
  let reservedForFinalizationUsd = 0;
  // The synthesis payload hold the WAVE arithmetic must carry (RV1901):
  // the runtime registers commitSynthesisReserve on the run root the
  // moment a capped orchestrator account opens, strictly before any
  // spawn admission, and both live gates (refuseSpawnIfInfeasible and
  // remainderOf) count it. The projection used to net it out of the
  // orchestrator's own reserve row and then FORGET the root-level hold,
  // so the four-role benchmark's wave read 5/5 green while the live
  // gate refused the third child.
  let synthesisHoldUsd = 0;
  let effectiveCapUsd: number | undefined;
  if (input.orchestrator !== undefined) {
    if (input.orchestrator.estInputTokens !== undefined) {
      requireNonNegativeInteger(
        input.orchestrator.estInputTokens,
        'preflight.orchestrator.estInputTokens',
      );
    }
    if (input.orchestrator.acceptance?.minSpawnedChildren !== undefined) {
      requirePositiveInteger(
        input.orchestrator.acceptance.minSpawnedChildren,
        'preflight.orchestrator.acceptance.minSpawnedChildren',
      );
    }
    if (input.orchestrator.claimConsistency?.judge?.estCost !== undefined) {
      requireNonNegativeNumber(
        input.orchestrator.claimConsistency.judge.estCost,
        'preflight.orchestrator.claimConsistency.judge.estCost',
      );
    }
    {
      // The declared pass posture (RV3402): garbage values throw like
      // every malformed input, while well typed pairings orchestrate()
      // refuses at intake surface as error findings below, the
      // orchestrator-cap-below-finalize-reserve precedent: the run
      // would refuse to start, and a planner should read that beside
      // the budget findings instead of meeting the ConfigError live.
      const posture = input.orchestrator.claimConsistency;
      if (
        posture?.onFound !== undefined &&
        !['report', 'carry', 'fail', 'repair'].includes(posture.onFound)
      ) {
        throw new ConfigError(
          "preflight.orchestrator.claimConsistency.onFound must be 'report', 'carry', 'fail' " +
            `or 'repair'; got ${JSON.stringify(posture.onFound)}`,
        );
      }
      if (posture?.stage !== undefined && !['draft', 'final', 'both'].includes(posture.stage)) {
        throw new ConfigError(
          "preflight.orchestrator.claimConsistency.stage must be 'draft', 'final' or 'both'; " +
            `got ${JSON.stringify(posture.stage)}`,
        );
      }
      const stage = posture?.stage ?? 'draft';
      if (posture?.onFound === 'repair' && stage === 'draft') {
        say({
          severity: 'error',
          code: 'claim-posture-refused-at-intake',
          message:
            "claimConsistency.onFound 'repair' needs stage 'final' or 'both' (at the draft " +
            'stage the repair IS the carry, RV3307): the run would refuse to start',
        });
      }
      if (posture?.onFound === 'repair' && input.orchestrator.synthesis === undefined) {
        say({
          severity: 'error',
          code: 'claim-posture-refused-at-intake',
          message:
            "claimConsistency.onFound 'repair' requires a synthesis: the bounded round is one " +
            'more composition, and without one there is nothing to repair with: the run would ' +
            'refuse to start',
        });
      }
      if (posture?.onFound === 'carry' && stage === 'final') {
        say({
          severity: 'error',
          code: 'claim-posture-refused-at-intake',
          message:
            "claimConsistency.onFound 'carry' cannot pair with stage 'final' (RV3301): the " +
            'final pass has no synthesis prompt left to ride, and the run would refuse to ' +
            "start; declare onFound 'repair' for the bounded post judge round",
        });
      }
    }
    const spec = input.orchestrator.budget;
    if (
      spec?.acceptanceReserve !== undefined &&
      spec.acceptanceReserve !== 'warn' &&
      spec.acceptanceReserve !== 'require' &&
      spec.acceptanceReserve !== 'checkpoint'
    ) {
      // The full engine vocabulary (RV4701): the runtime has accepted
      // 'checkpoint' since RV4404 while this intake knew only the
      // first two, so the eighth comparison driver had to estimate
      // its genesis arithmetic under a substituted 'require'.
      throw new ConfigError(
        "preflight.orchestrator.budget.acceptanceReserve must be 'warn', 'require' or " +
          `'checkpoint'; got ${JSON.stringify(spec.acceptanceReserve)}`,
      );
    }
    if (input.orchestrator.synthesis?.estCost !== undefined) {
      requireNonNegativeNumber(
        input.orchestrator.synthesis.estCost,
        'preflight.orchestrator.synthesis.estCost',
      );
    }
    if (input.finishValidation?.estRepairCostUsd !== undefined) {
      requireNonNegativeNumber(
        input.finishValidation.estRepairCostUsd,
        'preflight.finishValidation.estRepairCostUsd',
      );
    }
    if (input.orchestrator.citationAudit?.judge?.estCost !== undefined) {
      requireNonNegativeNumber(
        input.orchestrator.citationAudit.judge.estCost,
        'preflight.orchestrator.citationAudit.judge.estCost',
      );
    }
    if (
      input.orchestrator.citationAudit?.onFound !== undefined &&
      !['report', 'repair', 'fail'].includes(input.orchestrator.citationAudit.onFound)
    ) {
      throw new ConfigError(
        "preflight.orchestrator.citationAudit.onFound must be 'report', 'repair' or 'fail'; " +
          `got ${JSON.stringify(input.orchestrator.citationAudit.onFound)}`,
      );
    }
    const fraction = spec?.capFraction ?? 0.2;
    const fromFraction = ceilingUsd === undefined ? undefined : fraction * ceilingUsd;
    const bounds = [spec?.capUsd, fromFraction].filter(
      (bound): bound is number => bound !== undefined,
    );
    effectiveCapUsd = bounds.length === 0 ? undefined : Math.min(...bounds);
    const finalizeTurns = spec?.finalizeTurns ?? 2;
    const finalizeReserveUsd = spec?.finalizeReserveUsd ?? finalizeTurns * flatReserveUsd;
    const reserveCommitted = input.orchestrator.extension === true;
    if (reserveCommitted) {
      reservedForFinalizationUsd = finalizeReserveUsd;
    }
    if (effectiveCapUsd !== undefined) {
      // Only a CAPPED orchestrator commits the synthesis reserve live
      // (both orchestrate cap paths call commitSynthesisReserve right
      // after openAccount); an uncapped one registers nothing, so the
      // mirror holds nothing.
      synthesisHoldUsd = Math.max(0, spec?.synthesisReserveUsd ?? 0);
    }
    const echoLimits = mergeUsageLimits(input.orchestrator.limits, undefined, defaults.limits);
    orchestratorEcho = {
      ...(effectiveCapUsd === undefined ? {} : { effectiveCapUsd }),
      finalizeReserveUsd,
      finalizeTurns,
      reserveCommitted,
      projectedProviderTurns:
        projectedProviderTurnsOf(
          echoLimits,
          overallExecutedCeiling(echoLimits, toolCeilingsOf(echoLimits)),
        ) + coordinationRepairReserve,
    };
    // The run repair pool against its consumers (RV4705, the eighth
    // comparison rerun): the pool is shared by mechanical
    // finish-validation grants and the armed semantic round, and that
    // rerun's mechanical composition repair drained a one-token pool
    // before the judges ruled, so the armed round was refused over 38
    // standing findings; preflight had said nothing. The findings
    // below are the static twin of the runtime split: a reserve
    // contradiction mirrors the intake ConfigError, an undivided pool
    // the mechanics can drain warns about the armed round, and a
    // stage bound promising more grants than the mechanical allowance
    // warns that the pool, not the stage, will do the refusing.
    {
      const totalPool = input.orchestrator.maxTotalRepairRounds;
      const semanticReserve = input.orchestrator.maxSemanticRepairRounds;
      if (totalPool !== undefined) {
        requireNonNegativeInteger(totalPool, 'preflight.orchestrator.maxTotalRepairRounds');
      }
      if (semanticReserve !== undefined) {
        requireNonNegativeInteger(
          semanticReserve,
          'preflight.orchestrator.maxSemanticRepairRounds',
        );
      }
      if (totalPool !== undefined || semanticReserve !== undefined) {
        const contradiction =
          totalPool !== undefined && semanticReserve !== undefined && semanticReserve > totalPool;
        const mechanicalAllowance =
          totalPool === undefined
            ? undefined
            : Math.max(0, totalPool - Math.min(semanticReserve ?? 0, totalPool));
        orchestratorEcho.repairPool = {
          ...(totalPool === undefined ? {} : { maxTotalRepairRounds: totalPool }),
          ...(semanticReserve === undefined ? {} : { maxSemanticRepairRounds: semanticReserve }),
          ...(mechanicalAllowance === undefined ? {} : { mechanicalAllowance }),
        };
        const claimPosture = input.orchestrator.claimConsistency;
        const roundArmed =
          (claimPosture?.onFound === 'repair' && (claimPosture.stage ?? 'draft') !== 'draft') ||
          input.orchestrator.citationAudit?.onFound === 'repair';
        const grantedRepairs =
          input.finishValidation === undefined
            ? 0
            : (input.finishValidation.maxRepairs ?? DEFAULT_FINISH_MAX_REPAIRS);
        if (contradiction) {
          say({
            severity: 'error',
            code: 'repair-pool-refused-at-intake',
            message:
              `maxSemanticRepairRounds ${String(semanticReserve)} cannot exceed ` +
              `maxTotalRepairRounds ${String(totalPool)} (the semantic reserve lives inside ` +
              'the run repair pool, RV4705): the run would refuse to start',
          });
        } else {
          if (
            roundArmed &&
            totalPool !== undefined &&
            semanticReserve === undefined &&
            grantedRepairs >= totalPool
          ) {
            say({
              severity: 'warning',
              code: 'repair-pool-starves-semantic-round',
              message:
                `the armed semantic round shares the undivided run repair pool ` +
                `(maxTotalRepairRounds ${String(totalPool)}) with up to ` +
                `${String(grantedRepairs)} mechanical finish-validation grant(s): the ` +
                'mechanics can drain the pool before the judges rule and the armed round ' +
                'is then refused over standing findings (the eighth comparison rerun); ' +
                'declare maxSemanticRepairRounds to reserve the round, or raise the pool',
            });
          }
          if (mechanicalAllowance !== undefined && grantedRepairs > mechanicalAllowance) {
            say({
              severity: 'warning',
              code: 'finish-repairs-exceed-repair-pool',
              message:
                `finishValidation grants up to ${String(grantedRepairs)} mechanical ` +
                `repair(s) but the run repair pool leaves mechanics only ` +
                `${String(mechanicalAllowance)} (maxTotalRepairRounds ` +
                `${String(totalPool)}` +
                (semanticReserve === undefined
                  ? ''
                  : ` minus the semantic reserve ${String(semanticReserve)}`) +
                '): the pool, not the stage bound, will refuse the excess grants',
            });
          }
        }
      }
    }
    if (
      spec?.capUsd !== undefined &&
      spec.capFraction === undefined &&
      effectiveCapUsd !== undefined &&
      effectiveCapUsd < spec.capUsd
    ) {
      say({
        severity: 'warning',
        code: 'orchestrator-cap-fraction-bound',
        message:
          `orchestrator budget.capUsd ${spec.capUsd.toFixed(4)} USD is bounded to ` +
          `${effectiveCapUsd.toFixed(4)} USD by the default capFraction 0.2 of the run ` +
          `ceiling; pass capFraction: 1.0 to make capUsd the sole bound`,
      });
    }
    if (
      input.orchestrator.extension === true &&
      effectiveCapUsd !== undefined &&
      effectiveCapUsd < finalizeReserveUsd
    ) {
      say({
        severity: 'error',
        code: 'orchestrator-cap-below-finalize-reserve',
        message:
          `effectiveCap ${effectiveCapUsd.toFixed(4)} USD is below the finalize reserve ` +
          `${finalizeReserveUsd.toFixed(4)} USD: the run would refuse to start`,
      });
    }
    // The acceptance-tail twin of the RV3907 runtime gate (RV4001, the
    // fifth comparison experiment): the SAME acceptanceTailRequiredUsd
    // arithmetic, term for term, against the SAME effective cap, with
    // the working room at the runtime's own resolution (the flat
    // reserve; the boot gate reads capState.turnEstimateUsd, which is
    // exactly that figure). Present only when the posture is declared,
    // so undeclared inputs keep the report and findings byte
    // identical. Under 'require' an unfit tail is an ERROR: the run
    // would refuse to start before its first wire, and a planner that
    // only gates on errors (the experiment's harness) must not sail
    // past it the way it sailed past the advisory warnings. Under
    // 'warn' the same arithmetic surfaces as a warning, exactly the
    // declared posture's contract: findings in preflight, nothing at
    // runtime. Under 'checkpoint' (RV4701/RV4404) the genesis
    // arithmetic is require's, so an unfit tail is the same ERROR:
    // the first paid acceptance-tail dispatch re-checks this exact
    // sum at the money actually spent and would refuse it already at
    // the genesis numbers.
    if (spec?.acceptanceReserve !== undefined) {
      const { requiredUsd, terms } = acceptanceTailRequiredUsd({
        ...(spec.synthesisReserveUsd === undefined
          ? {}
          : { synthesisReserveUsd: spec.synthesisReserveUsd }),
        ...(input.orchestrator.claimConsistency?.stage === undefined
          ? {}
          : { claimStage: input.orchestrator.claimConsistency.stage }),
        ...(input.orchestrator.claimConsistency?.onFound === undefined
          ? {}
          : { claimOnFound: input.orchestrator.claimConsistency.onFound }),
        ...(input.orchestrator.claimConsistency?.judge?.estCost === undefined
          ? {}
          : { claimJudgeEstCostUsd: input.orchestrator.claimConsistency.judge.estCost }),
        ...(input.finishValidation?.estRepairCostUsd === undefined
          ? {}
          : { finishEstRepairCostUsd: input.finishValidation.estRepairCostUsd }),
        ...(input.orchestrator.synthesis?.estCost === undefined
          ? {}
          : { synthesisEstCostUsd: input.orchestrator.synthesis.estCost }),
        ...(input.orchestrator.citationAudit?.judge?.estCost === undefined
          ? {}
          : { citationJudgeEstCostUsd: input.orchestrator.citationAudit.judge.estCost }),
        ...(input.orchestrator.citationAudit?.onFound === undefined
          ? {}
          : { citationOnFound: input.orchestrator.citationAudit.onFound }),
        ...(input.orchestrator.claimConsistency === undefined ? {} : { claimConfigured: true }),
        workingRoomUsd: flatReserveUsd,
      });
      const fits = effectiveCapUsd !== undefined && effectiveCapUsd >= requiredUsd;
      orchestratorEcho.acceptanceReserve = {
        declared: spec.acceptanceReserve,
        requiredUsd,
        ...(effectiveCapUsd === undefined ? {} : { effectiveCapUsd }),
        fits,
        terms,
      };
      if (!fits) {
        const termsLine = formatAcceptanceTailTerms(terms);
        say({
          severity: spec.acceptanceReserve === 'warn' ? 'warning' : 'error',
          code: 'acceptance-reserve-unfit',
          message:
            (effectiveCapUsd === undefined
              ? `budget.acceptanceReserve '${spec.acceptanceReserve}': no effective cap ` +
                `resolves to hold the declared acceptance tail against (${termsLine})`
              : `budget.acceptanceReserve '${spec.acceptanceReserve}': the declared acceptance ` +
                `tail does not fit the effective cap ${effectiveCapUsd.toFixed(4)} USD ` +
                `(${termsLine})`) +
            (spec.acceptanceReserve === 'require'
              ? '; the run would refuse to start before its first wire (RV3907): raise the ' +
                'cap or lower the declared tail'
              : spec.acceptanceReserve === 'checkpoint'
                ? '; the first paid acceptance-tail dispatch re-checks this same arithmetic ' +
                  'at the money actually spent (RV4404) and would refuse it already at the ' +
                  'genesis numbers: raise the cap or lower the declared tail'
                : '; the run would start with its acceptance machinery funded by luck: raise ' +
                  "the cap, lower the declared tail, or declare 'require' to refuse instead"),
        });
      }
    }
  }

  // ---- Per-spawn effective reports.
  const spawnSpecs = input.spawns ?? [];
  spawnSpecs.forEach(validateSpawnSpec);
  const spawnReports: PreflightSpawnReport[] = [];
  /**
   * The layer-2 spawn-gate inputs per report, in report order: the
   * DECLARED estimate (estCost or the profile's; never the priced
   * arm, which the embedded gate cannot reach) and the explicit spawn
   * budget. Only an orchestrate wave consumes them.
   */
  const waveGateInputs: Array<{ estCostUsd?: number; budgetUsd?: number }> = [];
  const units: SpawnUnit[] = [];
  const shapes: QuotaShape[] = [];
  /** Whether any declared spawn caps its tool budget (RV305). */
  let anyCappedSpawn = false;
  for (const spec of spawnSpecs) {
    const role = spec.role ?? 'loop';
    const label = spec.label ?? role;
    const count = spec.count ?? 1;
    // Own properties only (RV1205): a spec naming a prototype member
    // ('toString') must read as an unknown profile, never resolve one.
    const profile =
      spec.profile === undefined ||
      defaults.profiles === undefined ||
      !Object.hasOwn(defaults.profiles, spec.profile)
        ? undefined
        : defaults.profiles[spec.profile];
    if (spec.profile !== undefined && profile === undefined) {
      say({
        severity: 'error',
        code: 'unknown-profile',
        message: `spawn '${label}' names profile '${spec.profile}', which defaults.profiles does not register`,
        spawn: label,
      });
    }
    const limits = mergeUsageLimits(spec.limits, profile?.limits, defaults.limits);
    // The router's layering: the call model, then within the profile
    // layer per-role routing over the all-roles model, then engine
    // routing (layerFields in model/router.ts).
    const servedBy = resolveServing(
      spec.model ?? profile?.routing?.[role] ?? profile?.model ?? defaults.routing?.[role],
    );
    if (servedBy === undefined) {
      say({
        severity: 'error',
        code: 'unrouted-role',
        message:
          `spawn '${label}' resolves no model for role '${role}': the run would fail with a ` +
          `ConfigError at spawn time; set a model, a profile model, or defaults.routing.${role}`,
        spawn: label,
      });
    }
    const caps = servedBy === undefined ? undefined : capsOf(servedBy);
    const pricing = servedBy === undefined ? undefined : pricingOf(servedBy);
    const unpriced = servedBy !== undefined && pricing === undefined;

    // The reserve formula, arm for arm the runtime chain: estCost over
    // profile estCost over the priced estimate over the flat default,
    // with the unpriced-model zero exactly like ctx spawn admission.
    let reserveSource: PreflightSpawnReport['reserveSource'];
    let reserveUsd: number;
    if (unpriced && spec.estCost === undefined && profile?.estCost === undefined) {
      reserveSource = 'unpriced-zero';
      reserveUsd = 0;
    } else {
      reserveSource =
        spec.estCost !== undefined
          ? 'estCost'
          : profile?.estCost !== undefined
            ? 'profile-estCost'
            : spec.estInputTokens !== undefined && caps?.pricing !== undefined
              ? 'priced-estimate'
              : 'flat-default';
      reserveUsd = admissionReserveUsd({
        ...(spec.estCost === undefined ? {} : { estCost: spec.estCost }),
        ...(profile?.estCost === undefined ? {} : { profileEstCost: profile.estCost }),
        ...(spec.estInputTokens === undefined ? {} : { inputTokens: spec.estInputTokens }),
        ...(caps === undefined ? {} : { caps }),
        ...(limits.maxOutputTokensPerTurn === undefined
          ? {}
          : { maxOutputTokensPerTurn: limits.maxOutputTokensPerTurn }),
        flatReserveUsd,
      });
    }

    const outputBound =
      caps === undefined
        ? limits.maxOutputTokensPerTurn
        : limits.maxOutputTokensPerTurn === undefined
          ? caps.maxOutputTokens
          : Math.min(caps.maxOutputTokens, limits.maxOutputTokensPerTurn);
    if (
      caps !== undefined &&
      limits.maxOutputTokensPerTurn !== undefined &&
      limits.maxOutputTokensPerTurn > caps.maxOutputTokens
    ) {
      say({
        severity: 'warning',
        code: 'output-cap-above-model',
        message:
          `spawn '${label}' sets maxOutputTokensPerTurn ${String(limits.maxOutputTokensPerTurn)} ` +
          `above the model's maxOutputTokens ${String(caps.maxOutputTokens)}: the model clamp wins`,
        spawn: label,
      });
    }
    if (
      caps?.minOutputTokensPerTurn !== undefined &&
      limits.maxOutputTokensPerTurn !== undefined &&
      limits.maxOutputTokensPerTurn < caps.minOutputTokensPerTurn
    ) {
      // The provider output floor (the v1.74 experiment review, P0.1):
      // the runtime refuses every below-floor dispatch typed, so this
      // configuration can never produce a provider turn.
      say({
        severity: 'error',
        code: 'output-cap-below-provider-minimum',
        message:
          `spawn '${label}' sets maxOutputTokensPerTurn ${String(limits.maxOutputTokensPerTurn)} ` +
          `below the ${String(caps.minOutputTokensPerTurn)} token output floor of ` +
          `'${servedBy ?? ''}': every dispatch would be refused typed before the wire; raise ` +
          'the cap to at least the floor',
        spawn: label,
      });
    }
    const turnFloorUsd =
      pricing === undefined || outputBound === undefined
        ? undefined
        : priceUsdOf(pricing, {
            inputTokens: spec.estInputTokens ?? 0,
            outputTokens: outputBound,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          });

    const toolCeilings = toolCeilingsOf(limits);
    const executedToolCallCeiling = overallExecutedCeiling(limits, toolCeilings);
    const projectedProviderTurns = projectedProviderTurnsOf(limits, executedToolCallCeiling);

    // The cache-aware loop economics (RV2007): a tool cycle re-sends
    // its prompt floor every turn. Uncached, the floor bills at the
    // full input rate each time; under the RV2006 policy on an
    // explicit-caching adapter it bills one cache write plus a read
    // per later turn. Both are floors over the STATIC prefix (real
    // prompts grow), priced by the same rows as settlement, so the
    // report can say what a long cycle costs with and without the
    // policy instead of leaving the operator to discover it live, the
    // parity rerun's way.
    let uncachedLoopInputFloorUsd: number | undefined;
    let cachedLoopInputFloorUsd: number | undefined;
    if (
      pricing !== undefined &&
      (spec.estInputTokens ?? 0) > 0 &&
      Number.isFinite(projectedProviderTurns) &&
      projectedProviderTurns > 1
    ) {
      const loopInputTokens = spec.estInputTokens ?? 0;
      uncachedLoopInputFloorUsd =
        projectedProviderTurns *
        priceUsdOf(pricing, {
          inputTokens: loopInputTokens,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        });
      if (pricing.cacheReadUsdPerMTok !== undefined && pricing.cacheWriteUsdPerMTok !== undefined) {
        cachedLoopInputFloorUsd = priceUsdOf(pricing, {
          inputTokens: projectedProviderTurns * loopInputTokens,
          outputTokens: 0,
          cacheReadTokens: (projectedProviderTurns - 1) * loopInputTokens,
          cacheWriteTokens: loopInputTokens,
        });
      }
    }
    if (
      caps?.promptCaching === 'explicit' &&
      engine.defaults?.cache?.mode === 'off' &&
      uncachedLoopInputFloorUsd !== undefined &&
      cachedLoopInputFloorUsd !== undefined &&
      projectedProviderTurns >= 4
    ) {
      say({
        severity: 'warning',
        code: 'uncached-long-loop',
        message:
          `spawn '${label}' projects ${String(projectedProviderTurns)} provider turns on the ` +
          `explicit-caching '${servedBy ?? ''}' with the cache policy OFF: the loop's input ` +
          `floor re-bills every turn (${uncachedLoopInputFloorUsd.toFixed(4)} USD uncached ` +
          `against ${cachedLoopInputFloorUsd.toFixed(4)} USD under the default policy); drop ` +
          "defaults.cache { mode: 'off' } or scope the opt-out to the profiles that need it",
        spawn: label,
      });
    }

    // The child-ceiling feasibility line (RV4702, the eighth
    // comparison experiment's first run): under budget.estIsCeiling
    // the spawn's declared estimate IS the child's hard ceiling
    // (the explicit spawn budget wins, RV4404), and that run's 1.35
    // ceiling deterministically starved its child's finalize dispatch
    // after an honest loop; preflight admitted the plan without a
    // word, and the death cost 6.74 USD. The floor here is the
    // cheapest honest reading of the declared posture: the loop's
    // input floor across its projected turns (cache-aware unless the
    // policy is off) plus ONE tail turn at the declared floor, the
    // finalize-shaped dispatch that run died on. A ceiling below it
    // cannot finish the loop it admits at the declared prices, by
    // construction; error level, because the starvation is
    // deterministic, not a headroom taste.
    let estCeilingRow: { ceilingUsd: number; requiredFloorUsd: number; fits: boolean } | undefined;
    if (input.orchestrator?.budget?.estIsCeiling === true) {
      const ceilingUsd = spec.budgetUsd ?? spec.estCost ?? profile?.estCost;
      const loopFloorUsd =
        engine.defaults?.cache?.mode === 'off'
          ? uncachedLoopInputFloorUsd
          : (cachedLoopInputFloorUsd ?? uncachedLoopInputFloorUsd);
      if (ceilingUsd !== undefined && loopFloorUsd !== undefined && turnFloorUsd !== undefined) {
        const requiredFloorUsd = loopFloorUsd + turnFloorUsd;
        estCeilingRow = { ceilingUsd, requiredFloorUsd, fits: ceilingUsd >= requiredFloorUsd };
        if (ceilingUsd < requiredFloorUsd) {
          say({
            severity: 'error',
            code: 'child-ceiling-below-loop-floor',
            message:
              `spawn '${label}' rides budget.estIsCeiling with a hard child ceiling of ` +
              `${ceilingUsd.toFixed(4)} USD, below the ${requiredFloorUsd.toFixed(4)} USD ` +
              `floor of its own declared posture (loop input floor ${loopFloorUsd.toFixed(4)} ` +
              `across ${String(projectedProviderTurns)} projected turns plus one tail turn at ` +
              `${turnFloorUsd.toFixed(4)}): the ceiling deterministically starves the child's ` +
              'tail dispatch at the declared prices (the eighth comparison experiment died at ' +
              'exactly this line); raise the estimate, declare an explicit spawn budget, or ' +
              'drop estIsCeiling',
            spawn: label,
          });
        }
      }
    }

    for (const row of toolCeilings) {
      if (row.tool === ANY_TOOL) {
        continue;
      }
      const cost = limits.toolUnits?.costs?.[row.tool];
      if (
        cost !== undefined &&
        cost > 0 &&
        limits.toolUnits !== undefined &&
        cost > limits.toolUnits.max
      ) {
        say({
          severity: 'warning',
          code: 'tool-unaffordable',
          message:
            `spawn '${label}' prices tool '${row.tool}' at ${String(cost)} units against ` +
            `toolUnits.max ${String(limits.toolUnits.max)}: the tool can never execute`,
          spawn: label,
        });
        continue;
      }
      if (row.boundBy === 'toolUnits' && row.ceiling !== null) {
        const nominal = limits.maxToolCalls;
        const cap = limits.maxCallsPerTool?.[row.tool];
        if (
          (nominal !== undefined && row.ceiling < nominal) ||
          (cap !== undefined && row.ceiling < cap)
        ) {
          say({
            severity: 'warning',
            code: 'weighted-units-bind-first',
            message:
              `spawn '${label}': toolUnits is the first bottleneck for '${row.tool}': ` +
              `${String(row.ceiling)} executed calls (cost ${String(
                limits.toolUnits?.costs?.[row.tool] ?? 1,
              )} of max ${String(limits.toolUnits?.max ?? 0)})` +
              (nominal === undefined ? '' : ` while maxToolCalls suggests ${String(nominal)}`),
            spawn: label,
          });
        }
      }
      const cap = limits.maxCallsPerTool?.[row.tool];
      if (
        cap !== undefined &&
        cap > 0 &&
        row.ceiling !== null &&
        row.boundBy !== 'maxCallsPerTool'
      ) {
        say({
          severity: 'info',
          code: 'per-tool-cap-unreachable',
          message:
            `spawn '${label}': maxCallsPerTool['${row.tool}'] ${String(cap)} can never bind: ` +
            `${row.boundBy ?? 'another limiter'} already stops at ${String(row.ceiling)}`,
          spawn: label,
        });
      }
    }
    if (
      executedToolCallCeiling !== null &&
      executedToolCallCeiling > 0 &&
      caps?.supportsParallelTools === true &&
      // The mid-batch boundary (RV408) bounds the re-paid window below
      // the ceiling: a cadence at or above it mitigates nothing and
      // still warns.
      (limits.checkpointEveryToolCalls === undefined ||
        limits.checkpointEveryToolCalls >= executedToolCallCeiling)
    ) {
      // The experiment review P1.8: the runtime checkpoints once per
      // COMPLETED tool turn, and nothing in the limits vocabulary bounds
      // a parallel batch below the executed-call ceiling, so the whole
      // tool budget can burn inside the first batch before any
      // checkpoint exists. Serial adapters (one call per turn) keep the
      // loss window at one call and stay silent.
      say({
        severity: 'warning',
        code: 'tool-cap-before-checkpoint',
        message:
          `spawn '${label}': the whole executed-call budget ` +
          `(${String(executedToolCallCeiling)} calls) fits into one parallel tool batch, and ` +
          `checkpoints write once per completed tool turn: the cap can be reached before any ` +
          `checkpoint exists, and a kill mid-batch re-pays every executed call on resume; ` +
          `bound the window with limits.checkpointEveryToolCalls (RV408)`,
        spawn: label,
      });
    }
    if (limits.toolBudgetExtension !== undefined) {
      if (limits.maxToolCalls === undefined) {
        say({
          severity: 'warning',
          code: 'inert-tool-budget-extension',
          message:
            `spawn '${label}' sets toolBudgetExtension without maxToolCalls: the extension ` +
            `only ever raises the executed-call cap, so there is nothing to extend`,
          spawn: label,
        });
      } else {
        // Transparency, not a mistake (RV301): the worst case is the
        // fully extended cap, which every projection above already
        // assumes.
        const { increment, maxExtensions } = limits.toolBudgetExtension;
        say({
          severity: 'info',
          code: 'tool-budget-extension-exposure',
          message:
            `spawn '${label}': toolBudgetExtension can raise maxToolCalls ` +
            `${String(limits.maxToolCalls)} by up to ${String(maxExtensions * increment)} ` +
            `extra calls (${String(maxExtensions)} grants of ${String(increment)}); every ` +
            `grant is admitted only under remaining budget headroom, and the projections ` +
            `already assume the fully extended cap`,
          spawn: label,
        });
      }
    }
    if (
      limits.finalizationReserve !== undefined &&
      limits.maxToolCalls === undefined &&
      limits.toolUnits === undefined &&
      // The reserve stopped being inert without tool limiters once the
      // exposure drain learned to spend it (RV2204): under a declared
      // in-flight cap a mid-work drained seat runs one clamped
      // finalization turn on exactly this reserve.
      input.run?.maxInFlightExposureUsd === undefined
    ) {
      say({
        severity: 'warning',
        code: 'inert-finalization-reserve',
        message:
          `spawn '${label}' sets finalizationReserve without maxToolCalls or toolUnits: ` +
          `no tool budget limiter exists for it to fire on, and no in-flight exposure cap ` +
          `is declared for the drained-finalization grant (RV2204) to spend it at`,
        spawn: label,
      });
    }
    if (
      limits.finalizationWindow !== undefined &&
      limits.finalizationReserve?.maxOutputTokens === undefined &&
      input.run?.maxInFlightExposureUsd !== undefined
    ) {
      // The drain against the window (RV2204, the third parity rerun):
      // the drain refuses the very wire the window's play needs, and
      // the grant that resolves the contradiction is funded by the
      // clamped finalizationReserve turn. Without the reserve the
      // window stays unreachable at the drain: the third rerun's
      // workers died with evidence pools of 17 and 22 under a floor of
      // 24 and a configured window that never got to play.
      say({
        severity: 'info',
        code: 'drained-finalization-unfunded',
        message:
          `spawn '${label}' declares finalizationWindow under an in-flight exposure cap but no ` +
          `finalizationReserve.maxOutputTokens: a mid-work exposure drain refuses the wire the ` +
          `window needs, and without the reserve's clamped turn the seat dies with its window ` +
          `unplayed (RV2204); declare the reserve to fund one drained-finalization turn`,
        spawn: label,
      });
    }
    if (limits.toolBudgetNotices === true && limits.maxToolCalls === undefined) {
      say({
        severity: 'warning',
        code: 'inert-tool-budget-notices',
        message: `spawn '${label}' sets toolBudgetNotices without maxToolCalls: the notices never fire`,
        spawn: label,
      });
    }
    if (limits.finalizationWindow !== undefined) {
      if (limits.maxToolCalls === undefined && limits.toolUnits === undefined) {
        say({
          severity: 'warning',
          code: 'inert-finalization-window',
          message:
            `spawn '${label}' sets finalizationWindow without maxToolCalls or toolUnits: ` +
            `no tool budget exists for the window to reserve a tail of`,
          spawn: label,
        });
      } else {
        const reserve = limits.finalizationWindow.reserveCalls;
        const windowCallCap = extendedMaxToolCalls(limits);
        const unitsMax = limits.toolUnits?.max;
        if (
          (windowCallCap !== undefined && reserve >= windowCallCap) ||
          (unitsMax !== undefined && reserve >= unitsMax)
        ) {
          say({
            severity: 'warning',
            code: 'finalization-window-covers-cap',
            message:
              `spawn '${label}': finalizationWindow.reserveCalls ${String(reserve)} is not ` +
              `below the tool budget, so the window governs from the very first call and ` +
              `nothing but the allowlisted finalization tools ever executes`,
            spawn: label,
          });
        }
        if (
          limits.finalizationWindow.allow !== undefined &&
          limits.finalizationWindow.allow.length === 0
        ) {
          say({
            severity: 'warning',
            code: 'finalization-window-empty-allowlist',
            message:
              `spawn '${label}': finalizationWindow.allow is empty, so inside the window ` +
              `only the engine terminal tool (when one exists) remains callable and every ` +
              `other call is refused`,
            spawn: label,
          });
        }
      }
    }
    // The turns-axis reserve (RV1405) config smell, mirroring
    // finalization-window-covers-cap: a reserve at or above maxTurns
    // governs from the very first turn.
    if (
      limits.finalizationTurns !== undefined &&
      limits.finalizationTurns.reserveTurns >= limits.maxTurns
    ) {
      say({
        severity: 'warning',
        code: 'finalization-turns-covers-max-turns',
        message:
          `spawn '${label}': finalizationTurns.reserveTurns ` +
          `${String(limits.finalizationTurns.reserveTurns)} is not below maxTurns ` +
          `${String(limits.maxTurns)}, so the finalization regime governs from the very ` +
          `first turn and nothing but the allowlisted finalization tools ever executes`,
        spawn: label,
      });
    }
    // The turns-axis projection (RV1406, the seventeenth comparison
    // experiment: a worker burned maxTurns 28 at 66 of 96 executed
    // calls and settled 'limit' with no finalize phase on the turns
    // axis). One executed call per turn plus the final no-tool answer
    // turn is the serial floor; parallel batches can stretch it, so
    // this is visibility, never a stop: the 29th projected turn of
    // that worker WAS the legitimate summary turn.
    if (
      executedToolCallCeiling !== null &&
      executedToolCallCeiling > 0 &&
      limits.maxTurns < executedToolCallCeiling + 1
    ) {
      say({
        severity: limits.finalizationTurns === undefined ? 'warning' : 'info',
        code: 'turns-bind-before-tool-budget',
        message:
          `spawn '${label}': maxTurns ${String(limits.maxTurns)} fits at most ` +
          `${String(limits.maxTurns - 1)} serial executed tool calls plus the final answer ` +
          `turn, below the ${String(executedToolCallCeiling)}-call executed ceiling: the ` +
          `turns axis binds first unless calls batch` +
          (limits.finalizationTurns === undefined
            ? `, and no turns-axis finalization exists: expiry is a silent hard 'limit' ` +
              `mid-work; reserve a finalization tail with limits.finalizationTurns`
            : `; limits.finalizationTurns reserves the final ` +
              `${String(limits.finalizationTurns.reserveTurns)} turns for finalization`),
        spawn: label,
      });
    }
    // The bare cap warning (RV305): the seventh comparison experiment
    // starved two mandatory workers at a naked 84-call cap while 38% of
    // the ceiling sat unspent; the reserve-plus-salvage combination is
    // what saved the run. A cap of 0 is a deliberate no-tools spawn and
    // stays silent.
    const positiveCallCap = limits.maxToolCalls !== undefined && limits.maxToolCalls > 0;
    if (
      (positiveCallCap || limits.toolUnits !== undefined) &&
      limits.toolBudgetNotices !== true &&
      limits.finalizationReserve === undefined &&
      limits.toolBudgetExtension === undefined &&
      limits.finalizationWindow === undefined
    ) {
      const capText = positiveCallCap
        ? `maxToolCalls ${String(limits.maxToolCalls)}`
        : `toolUnits.max ${String(limits.toolUnits?.max ?? 0)}`;
      say({
        severity: 'warning',
        code: 'bare-tool-cap',
        message:
          `spawn '${label}' caps its tool budget (${capText}) with no softener: no ` +
          `toolBudgetNotices, no toolBudgetExtension, no finalizationReserve, no ` +
          `finalizationWindow. Expiry is a silent hard 'limit' the model never saw coming; ` +
          `enable a notice or a reserve, or drop the cap and rely on the USD ceiling`,
        spawn: label,
      });
    }
    if (positiveCallCap || limits.toolUnits !== undefined) {
      anyCappedSpawn = true;
    }
    // The evidence floor (RV303): the experiment relation nobody
    // computed: 14 mandatory evidence entries against an 84-call cap.
    // Declared estimates only, in the spirit of every honest floor
    // here: the spawn declaration wins over the registered profile's.
    const evidenceContract = spec.evidenceContract ?? profile?.evidenceContract;
    if (evidenceContract !== undefined && executedToolCallCeiling !== null) {
      const declaredPerEntry =
        evidenceContract.estCallsPerEntry ?? DEFAULT_EVIDENCE_CALLS_PER_ENTRY;
      // The journal observed prior (RV3309): the HIGHER of the
      // declared estimate and the supplied calibration, never the
      // lower, so a generous declaration still holds while an
      // optimistic one stops hiding the observed reality. The
      // 2026-08-12 comparison run observed 4.211 calls per entry
      // against the default estimate of 3; a floor computed from the
      // wish instead of the observation is how an evidence contract
      // meets a cap it cannot actually fit.
      const observed = evidenceContract.calibration?.callsPerEntry;
      const perEntry =
        observed === undefined ? declaredPerEntry : Math.max(declaredPerEntry, observed);
      if (observed !== undefined && observed > declaredPerEntry) {
        const source =
          evidenceContract.calibration?.source === undefined
            ? ''
            : ` (source: ${evidenceContract.calibration.source})`;
        say({
          severity: 'info',
          code: 'evidence-estimate-below-observed',
          message:
            `spawn '${label}' declares ${String(declaredPerEntry)} estimated calls per ` +
            `evidence entry, but the supplied calibration observed ` +
            `${String(observed)}${source}: the evidence call floor uses the observed figure`,
          spawn: label,
        });
      }
      const overhead = evidenceContract.overheadCalls ?? DEFAULT_EVIDENCE_OVERHEAD_CALLS;
      const floor = Math.ceil(evidenceContract.minEntries * perEntry) + overhead;
      if (executedToolCallCeiling < floor) {
        say({
          severity: 'warning',
          code: 'tool-cap-below-evidence-floor',
          message:
            `spawn '${label}' declares an evidence contract of ` +
            `${String(evidenceContract.minEntries)} entries; at ${String(perEntry)} estimated ` +
            `calls per entry plus ${String(overhead)} overhead calls the floor is ` +
            `${String(floor)} executed calls, but the effective executed-call ceiling is ` +
            `${String(executedToolCallCeiling)}: the cap cannot fit the contract; raise the ` +
            `budget, enable the extension, or lower the contract`,
          spawn: label,
        });
      }
    }
    if (unpriced && ceilingUsd !== undefined) {
      say({
        severity: 'warning',
        code: 'unpriced-under-ceiling',
        message:
          `spawn '${label}' is served by '${servedBy ?? ''}' with no price row: the ` +
          `${ceilingUsd.toFixed(4)} USD run ceiling does NOT bound it and its admission reserve is zero`,
        spawn: label,
      });
    }

    spawnReports.push({
      label,
      role,
      count,
      ...(servedBy === undefined ? {} : { servedBy }),
      ...(unpriced ? { unpriced: true as const } : {}),
      ...(pricing?.ratesVerifiedAt === undefined
        ? {}
        : { ratesVerifiedAt: pricing.ratesVerifiedAt }),
      limits,
      admissionReserveUsd: reserveUsd,
      reserveSource,
      ...(outputBound === undefined ? {} : { maxOutputTokensPerTurn: outputBound }),
      ...(turnFloorUsd === undefined ? {} : { turnFloorUsd }),
      ...(uncachedLoopInputFloorUsd === undefined ? {} : { uncachedLoopInputFloorUsd }),
      ...(cachedLoopInputFloorUsd === undefined ? {} : { cachedLoopInputFloorUsd }),
      ...(estCeilingRow === undefined ? {} : { estCeiling: estCeilingRow }),
      executedToolCallCeiling,
      projectedProviderTurns,
      toolCeilings,
    });
    {
      const declaredEstCostUsd = spec.estCost ?? profile?.estCost;
      waveGateInputs.push({
        ...(declaredEstCostUsd === undefined ? {} : { estCostUsd: declaredEstCostUsd }),
        ...(spec.budgetUsd === undefined ? {} : { budgetUsd: spec.budgetUsd }),
      });
    }
    for (let i = 0; i < count; i += 1) {
      const unit: SpawnUnit = {
        label: count === 1 ? label : `${label}#${String(i + 1)}`,
        tokensFloor: (spec.estInputTokens ?? 0) + (outputBound ?? 0),
      };
      if (servedBy !== undefined) {
        const { adapterId, model } = parseModelRef(servedBy);
        unit.provider = adapterId;
        unit.model = model;
      }
      if (turnFloorUsd !== undefined) {
        unit.turnFloorUsd = turnFloorUsd;
      }
      units.push(unit);
    }
    {
      const shape: QuotaShape = {
        label,
        inputFloor: spec.estInputTokens ?? 0,
        outputBound: outputBound ?? 0,
        turns: projectedProviderTurns,
        count,
      };
      if (servedBy !== undefined) {
        const { adapterId, model } = parseModelRef(servedBy);
        shape.provider = adapterId;
        shape.model = model;
      }
      shapes.push(shape);
    }
  }
  // The orchestrator agent is a declared unit too: its serving model
  // comes from routing.orchestrate, and an orchestration without one
  // would fail at spawn time exactly like an unrouted child.
  let orchestratorReserveUsd: number | undefined;
  if (input.orchestrator !== undefined) {
    // Capped children under a no-salvage acceptance (RV305): a child
    // that expires settles 'limit' and counts against the policy with
    // nothing to salvage; the seventh comparison experiment survived
    // exactly this shape only because salvage was on. Judged only when
    // the acceptance is DECLARED here, like every declared-input
    // finding.
    const acceptance = input.orchestrator.acceptance;
    if (
      acceptance !== undefined &&
      anyCappedSpawn &&
      acceptance.acceptPartialChildren !== true &&
      acceptance.acceptValidatedTerminalOutputOnLimit !== true
    ) {
      say({
        severity: 'info',
        code: 'capped-children-without-salvage',
        message:
          'children in the declared wave cap their tool budgets and the declared acceptance ' +
          'policy enables no salvage arm (acceptPartialChildren, ' +
          'acceptValidatedTerminalOutputOnLimit): a child that expires settles limit and ' +
          'counts against the policy with nothing to salvage',
      });
    }
    const servedBy = resolveServing(defaults.routing?.orchestrate);
    if (servedBy === undefined) {
      say({
        severity: 'error',
        code: 'unrouted-role',
        message:
          "the orchestrator resolves no model for role 'orchestrate': set " +
          'defaults.routing.orchestrate or an orchestrate model on the call',
        spawn: 'orchestrator',
      });
    } else {
      const caps = capsOf(servedBy);
      const pricing = pricingOf(servedBy);
      const orchLimits = mergeUsageLimits(input.orchestrator.limits, undefined, defaults.limits);
      const outputBound =
        caps === undefined
          ? orchLimits.maxOutputTokensPerTurn
          : orchLimits.maxOutputTokensPerTurn === undefined
            ? caps.maxOutputTokens
            : Math.min(caps.maxOutputTokens, orchLimits.maxOutputTokensPerTurn);
      if (
        caps?.minOutputTokensPerTurn !== undefined &&
        orchLimits.maxOutputTokensPerTurn !== undefined &&
        orchLimits.maxOutputTokensPerTurn < caps.minOutputTokensPerTurn
      ) {
        say({
          severity: 'error',
          code: 'output-cap-below-provider-minimum',
          message:
            `the orchestrator sets maxOutputTokensPerTurn ` +
            `${String(orchLimits.maxOutputTokensPerTurn)} below the ` +
            `${String(caps.minOutputTokensPerTurn)} token output floor of '${servedBy}': every ` +
            'dispatch would be refused typed before the wire; raise the cap to at least the floor',
          spawn: 'orchestrator',
        });
      }
      // Without a synthesis invocation the validators bind the
      // coordination finish, so the contract must fit THIS loop's turns.
      if (input.orchestrator.synthesis === undefined) {
        contractFeasibilityFindings(outputBound, 'orchestrator', servedBy);
      }
      const { adapterId, model } = parseModelRef(servedBy);
      const unit: SpawnUnit = {
        label: 'orchestrator',
        provider: adapterId,
        model,
        tokensFloor: outputBound ?? 0,
      };
      if (pricing !== undefined && outputBound !== undefined) {
        unit.turnFloorUsd = priceUsdOf(pricing, {
          inputTokens: 0,
          outputTokens: outputBound,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        });
      }
      units.push(unit);
      shapes.push({
        label: 'orchestrator',
        provider: adapterId,
        model,
        inputFloor: input.orchestrator.estInputTokens ?? 0,
        outputBound: outputBound ?? 0,
        turns:
          projectedProviderTurnsOf(
            orchLimits,
            overallExecutedCeiling(orchLimits, toolCeilingsOf(orchLimits)),
          ) + coordinationRepairReserve,
        count: 1,
      });
      // The orchestrator's own admission reserve, exactly the live
      // dispatch (the shared formulas of the 1.63.0 experiment review,
      // P0.3): a CAPPED orchestrator admits at exact fill with the
      // effectiveCap-minus-committed-finalize hint, so its cap chain
      // can never deny it; an UNCAPPED one runs the same ctx.agent
      // reserve chain every spawn runs (there is no estCost channel
      // for the main orchestrator dispatch, so the arms are the priced
      // estimate from the estInputTokens stand-in, the flat default,
      // and the unpriced-model zero).
      if (effectiveCapUsd !== undefined) {
        // Floored at zero for the report: a cap below the committed
        // finalize reserve makes the hint negative, but that config
        // never dispatches (the boot refuses typed, and the
        // orchestrator-cap-below-finalize-reserve error says so).
        orchestratorReserveUsd = Math.max(
          0,
          orchestratorAdmissionEstCostUsd(
            effectiveCapUsd,
            // The synthesis payload reserve (cycle 76) is a committed
            // carve-out exactly like the finalize reserve: the live
            // exact-fill hint nets both, so the projection must too.
            reservedForFinalizationUsd + (input.orchestrator.budget?.synthesisReserveUsd ?? 0),
          ),
        );
      } else if (pricing === undefined) {
        orchestratorReserveUsd = 0;
      } else {
        orchestratorReserveUsd = admissionReserveUsd({
          ...(input.orchestrator.estInputTokens === undefined
            ? {}
            : { inputTokens: input.orchestrator.estInputTokens }),
          ...(caps === undefined ? {} : { caps }),
          ...(orchLimits.maxOutputTokensPerTurn === undefined
            ? {}
            : { maxOutputTokensPerTurn: orchLimits.maxOutputTokensPerTurn }),
          flatReserveUsd,
        });
      }
    }
    // The separate synthesis invocation (RV-211; the v1.71 experiment
    // review): one more provider loop the run ceiling must price, the
    // one the projection used to stop short of. Its serving model
    // resolves like the runtime would (the declared override, else
    // routing.synthesize), its limits mirror the OrchestrateSynthesis
    // default wholesale, and the repair turn reserve folds in HERE,
    // because with synthesis configured the validators bind the
    // synthesis finish. Post-fan-in by construction, so it joins the
    // run ceiling shapes but never the first-wave exposure or the
    // admission wave.
    if (input.orchestrator.synthesis !== undefined) {
      const synthesis = input.orchestrator.synthesis;
      if (synthesis.limits !== undefined) {
        validateUsageLimits(synthesis.limits, 'preflight orchestrator.synthesis.limits');
      }
      if (synthesis.estInputTokens !== undefined) {
        requireNonNegativeInteger(
          synthesis.estInputTokens,
          'preflight orchestrator.synthesis.estInputTokens',
        );
      }
      if (
        synthesis.context !== undefined &&
        synthesis.context !== 'digests' &&
        synthesis.context !== 'full'
      ) {
        throw new ConfigError(
          "preflight orchestrator.synthesis.context must be 'digests' or 'full'; got " +
            JSON.stringify(synthesis.context),
        );
      }
      // The evidence asymmetry check (the v1.74 experiment review,
      // P0.2): the stock evidence validators judge the finish against
      // the FULL child outputs while a digest-blind synthesis model
      // sees 400 char rows, so when the coordination draft collapses,
      // preserving the demanded citations is model-impossible. The
      // detection is by the stock validator names and the contract's
      // citation demand; a custom-named validator is out of its reach.
      {
        const evidenceNames = new Set([
          'evidence-preserved',
          'contract-citations',
          'contract-section-citations',
        ]);
        const declaredValidators = (input.finishValidation?.validators ?? []).map(
          (validator) => validator.name,
        );
        const evidenceValidators = declaredValidators.filter((name) => evidenceNames.has(name));
        const demandsEvidence =
          evidenceValidators.length > 0 ||
          input.finishValidation?.contract?.manifest.citations !== undefined;
        if (
          demandsEvidence &&
          synthesis.exposeChildResultTools !== true &&
          (synthesis.context ?? 'digests') === 'digests'
        ) {
          say({
            severity: 'warning',
            code: 'synthesis-evidence-asymmetry',
            message:
              `the finish validators demand child evidence (${
                evidenceValidators.length > 0 ? evidenceValidators.join(', ') : 'contract citations'
              }) but the synthesis invocation sees only truncated digest rows and has no child ` +
              'read tools: a collapsed coordination draft starves it of every citation (the ' +
              'v1.74 experiment shape); set synthesis.exposeChildResultTools, synthesis.context ' +
              "'full', or bind the validators to coordination by dropping synthesis",
            spawn: 'synthesis',
          });
        }
      }
      // The synthesis tool headroom check (the fifth experiment, cycle
      // 75): the experiment harness set the synthesis tool cap to the
      // child count, the mandatory get_child_result reads exhausted the
      // whole budget, and evidence access ended there. The terminal
      // finish itself is admitted budget free, so the finding is about
      // the READS: a cap below one read per possible child cannot cover
      // the evidence the read tools exist to deliver.
      {
        const synthesisToolCap = synthesis.limits?.maxToolCalls;
        const expectedReads = input.orchestrator?.maxSpawns ?? 1;
        if (
          synthesis.exposeChildResultTools === true &&
          synthesisToolCap !== undefined &&
          synthesisToolCap < expectedReads
        ) {
          say({
            severity: 'warning',
            code: 'synthesis-terminal-tool-headroom',
            message:
              `synthesis.limits.maxToolCalls ${String(synthesisToolCap)} cannot cover one ` +
              `get_child_result read per child (${
                input.orchestrator?.maxSpawns === undefined
                  ? 'at least 1 read'
                  : `maxSpawns ${String(expectedReads)}`
              }): the reads exhaust the tool budget and the synthesis loses evidence access ` +
              '(the terminal finish is admitted budget free and needs no slot); raise the cap ' +
              "to at least the child count plus paging margin, or use context 'full' without " +
              'the read tools',
            spawn: 'synthesis',
          });
        }
      }
      const servedBy =
        resolveServing(synthesis.model) ?? resolveServing(defaults.routing?.synthesize);
      if (servedBy === undefined) {
        say({
          severity: 'error',
          code: 'unrouted-role',
          message:
            "the synthesis invocation resolves no model for role 'synthesize': set " +
            'defaults.routing.synthesize or a synthesis model on the call',
          spawn: 'synthesis',
        });
      } else {
        const caps = capsOf(servedBy);
        const merged = mergeUsageLimits(
          synthesis.limits ?? { maxTurns: DEFAULT_SYNTHESIS_MAX_TURNS },
          undefined,
          defaults.limits,
        );
        const outputBound =
          caps === undefined
            ? merged.maxOutputTokensPerTurn
            : merged.maxOutputTokensPerTurn === undefined
              ? caps.maxOutputTokens
              : Math.min(caps.maxOutputTokens, merged.maxOutputTokensPerTurn);
        if (
          caps?.minOutputTokensPerTurn !== undefined &&
          merged.maxOutputTokensPerTurn !== undefined &&
          merged.maxOutputTokensPerTurn < caps.minOutputTokensPerTurn
        ) {
          say({
            severity: 'error',
            code: 'output-cap-below-provider-minimum',
            message:
              `the synthesis invocation sets maxOutputTokensPerTurn ` +
              `${String(merged.maxOutputTokensPerTurn)} below the ` +
              `${String(caps.minOutputTokensPerTurn)} token output floor of '${servedBy}': ` +
              'every dispatch would be refused typed before the wire; raise the cap to at ' +
              'least the floor',
            spawn: 'synthesis',
          });
        }
        // With synthesis configured the validators bind ITS finish: the
        // contract must fit the synthesis invocation's turns.
        contractFeasibilityFindings(outputBound, 'synthesis', servedBy);
        // The synthesis payload reserve check (the sixth comparison
        // experiment, cycle 76): the rematch's first run spent the
        // orchestrator sub account on the coordination prefix and the
        // budget clamp shrank the synthesis turns below the contract's
        // minimal accepting payload, so the finish was cut at the output
        // allowance before any tool call and the validator-bound run
        // failed closed at maxTurns. With a contract bound to the
        // synthesis, the sub account must HOLD the payload money.
        {
          const contract = input.finishValidation?.contract;
          const pricing = pricingOf(servedBy);
          if (contract !== undefined && pricing !== undefined && pricing.outputUsdPerMTok > 0) {
            const minTokens = Math.ceil(
              JSON.stringify({ result: contract.goldenAccept.text }).length / 4,
            );
            const payloadUsd = (minTokens / 1_000_000) * pricing.outputUsdPerMTok;
            const declared = input.orchestrator?.budget?.synthesisReserveUsd;
            if (declared === undefined || declared < payloadUsd) {
              say({
                severity: 'warning',
                code: 'synthesis-reserve-unfunded',
                message:
                  `the contract's minimal accepting payload is about ${String(minTokens)} ` +
                  `output tokens, about ${payloadUsd.toFixed(4)} USD at the output rate of ` +
                  `'${servedBy}', and the orchestrator sub account holds ` +
                  `${
                    declared === undefined
                      ? 'no synthesis reserve'
                      : `only ${declared.toFixed(4)} USD`
                  } ` +
                  'for it: a pricey coordination prefix can leave the synthesis turns a ' +
                  'remainder the budget clamp shrinks below the payload, cutting the finish ' +
                  'before any tool call; declare budget.synthesisReserveUsd at or above the ' +
                  'payload price',
                spawn: 'synthesis',
              });
            }
          }
        }
        // The cap-sized composition against the reserve (RV2104, the
        // seventh parity run): the minimal-payload check above prices
        // the SHORTEST accepting finish, but a reasoning model writes
        // to its allowance. The seventh run's synthesis spent its
        // whole 0.70 reserve on a composition truncated exactly at
        // the 40000-token output cap, failed the section validator on
        // the truncation, and the granted repair turn was refused at
        // a zero remainder: the reserve funded a composition it could
        // not repair. Price ONE turn at the output allowance plus the
        // declared input floor, and one more for EVERY repair the
        // validation grants; a committed reserve below that number
        // carries exactly that risk.
        //
        // The tail is counted off maxRepairs, not off repairTurnReserve
        // (RV2504, the 1.226.0 comparison run). The reserve is a TURN
        // budget; the money is spent by every repair the runtime is
        // willing to GRANT, whether it comes out of reserved turns or
        // ordinary ones. That run declared maxRepairs 2 with a 1.53
        // hold under exactly two composition turns of price, so the
        // old one-repair arithmetic passed the config that then died
        // on its second repair with the first still uncomposed.
        // Under RV3602 the bound is per composition invocation, and
        // this requirement prices ONE invocation's tail: the armed
        // claim repair round is a second invocation with the same
        // worst case, priced by the RV3402 working room term at the
        // same declared reserve, so the multiplication here needs no
        // doubling.
        {
          const pricing = pricingOf(servedBy);
          const declared = input.orchestrator?.budget?.synthesisReserveUsd;
          if (
            pricing !== undefined &&
            outputBound !== undefined &&
            declared !== undefined &&
            declared > 0
          ) {
            const compositionUsd = priceUsdOf(pricing, {
              inputTokens: synthesis.estInputTokens ?? 0,
              outputTokens: outputBound,
              cacheReadTokens: 0,
              cacheWriteTokens: 0,
            });
            const grantedRepairs =
              input.finishValidation === undefined
                ? 0
                : (input.finishValidation.maxRepairs ?? DEFAULT_FINISH_MAX_REPAIRS);
            const tailTurns = 1 + grantedRepairs;
            const requiredUsd = compositionUsd * tailTurns;
            // Two rooms hold the tail, and the declared plan
            // guarantees each of them only at the reserve line, the
            // worst case where the coordination loop has spent every
            // dollar the fence lets it (RV2101). The reserve room is
            // the hold itself. The exposure room is what the RV711
            // ceiling still allows above that line: the exposure cap
            // bounds spent-plus-in-flight on the RUN account, so a cap
            // below the ceiling silently shortens the tail no matter
            // how much money the hold carries. The comparison run held
            // 1.53 for a 2.295 tail and left it 1.23 of exposure room:
            // both rooms were short, and the synthesis died mid repair
            // with 0.385 of its envelope unspent.
            const exposureCapUsd = input.run?.maxInFlightExposureUsd;
            const reserveLineUsd = ceilingUsd === undefined ? undefined : ceilingUsd - declared;
            const exposureRoomUsd =
              exposureCapUsd === undefined || reserveLineUsd === undefined
                ? undefined
                : exposureCapUsd - reserveLineUsd;
            const reserveShort = declared < requiredUsd;
            const exposureShort = exposureRoomUsd !== undefined && exposureRoomUsd < requiredUsd;
            if (reserveShort || exposureShort) {
              say({
                // Both rooms short is not a tighter warning, it is a
                // tail the declared numbers cannot finish on either
                // ceiling: no coordination frugality reaches past the
                // smaller of two rooms that are both under the price.
                severity: reserveShort && exposureShort ? 'error' : 'warning',
                code: 'synthesis-reserve-below-cap-composition',
                message:
                  `the mandatory synthesis tail is ${String(tailTurns)} turn(s) (one composition ` +
                  (grantedRepairs === 0
                    ? 'and no granted repair'
                    : `plus the ${String(grantedRepairs)} granted repair(s)`) +
                  `), each writing to its ${String(outputBound)} token output allowance over the ` +
                  `declared ${String(synthesis.estInputTokens ?? 0)} input floor: ` +
                  `${String(tailTurns)} x ${compositionUsd.toFixed(4)} = ` +
                  `${requiredUsd.toFixed(4)} USD at the rates of '${servedBy}'` +
                  (reserveShort
                    ? `; the committed synthesis reserve holds only ${declared.toFixed(4)} USD`
                    : `; the committed ${declared.toFixed(4)} USD reserve covers it`) +
                  (exposureRoomUsd === undefined
                    ? ''
                    : exposureShort
                      ? `, and maxInFlightExposureUsd ` +
                        `${(exposureCapUsd ?? 0).toFixed(4)} leaves only ` +
                        `${exposureRoomUsd.toFixed(4)} USD above the reserve line ` +
                        `${(reserveLineUsd ?? 0).toFixed(4)} USD`
                      : `, and the exposure ceiling leaves ${exposureRoomUsd.toFixed(4)} USD ` +
                        `above the reserve line`) +
                  ': a composition cut at the allowance can fail its validators with no room ' +
                  'left for the repairs the runtime will grant; hold the reserve at the tail ' +
                  'arithmetic, raise maxInFlightExposureUsd toward the ceiling, lower ' +
                  'maxOutputTokensPerTurn, or grant fewer repairs',
                spawn: 'synthesis',
              });
            }
          }
        }
        const projected =
          projectedProviderTurnsOf(merged, overallExecutedCeiling(merged, toolCeilingsOf(merged))) +
          finishRepairReserve;
        if (orchestratorEcho !== undefined) {
          orchestratorEcho.synthesis = { projectedProviderTurns: projected, servedBy };
        }
        const { adapterId, model } = parseModelRef(servedBy);
        shapes.push({
          label: 'synthesis',
          provider: adapterId,
          model,
          inputFloor: synthesis.estInputTokens ?? 0,
          outputBound: outputBound ?? 0,
          turns: projected,
          count: 1,
        });
      }
    }
  }

  // ---- The layer-1 admission projection over the declared wave, in
  // order, mirroring RunBudget.admitSpawn: exact fill admitted, one
  // dollar past the ceiling denied, a rejection mutating nothing. The
  // orchestrator agent itself admits first (against its cap account
  // chain); children admit against the run root.
  const wave: PreflightAdmissionRow[] = [];
  let committed = 0;
  let spawned = 0;
  let children = 0;
  let childrenDeniedByBudget = 0;
  // `strictAtFill` mirrors the one certainty a static projection has
  // about an orchestrate wave (the sixth comparison experiment, cycle
  // 76): the coordination turn that issues the spawn tools is PAID
  // strictly before any spawn tool executes, so the live remainder at
  // evaluation is always below the static one, and a child whose
  // reserve fits only at exact fill is certain to be rejected live
  // (the run 2 rematch lost its mandated fourth specialist to exactly
  // that promise: the projection said 5 of 5, the live gate rejected
  // with reason budget). The orchestrator's OWN row keeps the exact
  // fill admission: it admits at run start, before any spend exists.
  // The one held total BOTH wave gates and the report rows read: the
  // live mirror is spent (zero at projection time) + committedReserveUsd
  // + finalizeReserveUsd + synthesisReserveUsd, exactly the terms of
  // refuseSpawnIfInfeasible and remainderOf (RV1901).
  const heldAgainstRoot = (): number => committed + reservedForFinalizationUsd + synthesisHoldUsd;
  const admitAgainstRoot = (reserveUsd: number, strictAtFill = false): boolean => {
    if (ceilingUsd === undefined) {
      return true;
    }
    const held = heldAgainstRoot();
    if (held >= ceilingUsd) {
      return false;
    }
    const fill = held + reserveUsd;
    return strictAtFill ? fill < ceilingUsd : fill <= ceilingUsd;
  };
  if (input.orchestrator !== undefined) {
    // A capped orchestrator's reserve is the exact-fill hint, so its
    // own cap chain admits it by construction (the shared formula);
    // only the spawn cap or an exotic root ceiling can deny the row.
    const reserveUsd = orchestratorReserveUsd ?? flatReserveUsd;
    let deniedBy: PreflightAdmissionRow['deniedBy'];
    if (spawned >= lifetimeSpawnCap) {
      deniedBy = 'spawn-cap';
    } else if (!admitAgainstRoot(reserveUsd)) {
      deniedBy = 'budget';
    }
    wave.push({
      label: 'orchestrator',
      reserveUsd,
      admitted: deniedBy === undefined,
      ...(deniedBy === undefined ? {} : { deniedBy }),
      ...(ceilingUsd === undefined ? {} : { heldAtEvaluationUsd: heldAgainstRoot() }),
    });
    if (deniedBy === undefined) {
      committed += reserveUsd;
      spawned += 1;
    }
  }
  const maxSpawns = input.orchestrator?.maxSpawns;
  const orchestrateWave = input.orchestrator !== undefined;
  // The live-root-exposure term (RV2004): by the time any spawn tool
  // runs live, the coordination loop has ALWAYS paid at least one of
  // its own turns and typically holds one in flight, money the static
  // wave used to ignore. The parity rerun's fourth seat fit the plain
  // arithmetic (5.95 under 6.00) and was refused live by exactly this
  // delta. The orchestrator's worst-case turn floor is its priced
  // lower bound, so the embedded gate and the required minimum carry
  // it and a seat that cannot admit live cannot admit here either.
  const liveRootExposureTermUsd = orchestrateWave
    ? (units.find((unit) => unit.label === 'orchestrator')?.turnFloorUsd ?? 0)
    : 0;
  for (const [reportIndex, report] of spawnReports.entries()) {
    const gate = waveGateInputs[reportIndex] ?? {};
    for (let i = 0; i < report.count; i += 1) {
      const label = report.count === 1 ? report.label : `${report.label}#${String(i + 1)}`;
      const reserveUsd = report.admissionReserveUsd;
      let deniedBy: PreflightAdmissionRow['deniedBy'];
      if (spawned >= lifetimeSpawnCap) {
        deniedBy = 'spawn-cap';
      } else if (maxSpawns !== undefined && children >= maxSpawns) {
        deniedBy = 'orchestrator-max-spawns';
      } else {
        if (orchestrateWave && ceilingUsd !== undefined) {
          // Layer 2, the embedded spawn gate: the SAME projection the
          // live spawn_agent evaluation runs (the shared
          // dispatchProjectionReserveUsd), against the remainder net of
          // everything already committed AND the live-root-exposure
          // term above. Strict AT exact fill (cycle 76): a remainder
          // that only just equals the projection is a certain live
          // rejection. The gate never sees the priced estimate, so a
          // wave the layer-1 chain would afford can still die here,
          // exactly like the runtime.
          const remainder = ceilingUsd - heldAgainstRoot() - liveRootExposureTermUsd;
          const projection = dispatchProjectionReserveUsd(gate, flatReserveUsd);
          if (remainder <= 0 || remainder <= projection) {
            deniedBy = 'budget';
          }
        }
        if (deniedBy === undefined && !admitAgainstRoot(reserveUsd, orchestrateWave)) {
          deniedBy = 'budget';
        }
      }
      wave.push({
        label,
        reserveUsd,
        admitted: deniedBy === undefined,
        ...(deniedBy === undefined ? {} : { deniedBy }),
        ...(ceilingUsd === undefined ? {} : { heldAtEvaluationUsd: heldAgainstRoot() }),
      });
      if (deniedBy === undefined) {
        committed += reserveUsd;
        spawned += 1;
        children += 1;
      } else if (deniedBy === 'budget') {
        childrenDeniedByBudget += 1;
      }
    }
  }
  const admitted = wave.filter((row) => row.admitted).length;
  const denied = wave.length - admitted;
  // The whole-wave fill (RV1907): what the ceiling must strictly
  // exceed to seat every declared row. The benchmark's $6.00 sat
  // $0.98 below this figure and the projection now says so with a
  // number instead of leaving the operator to solve the wave by hand.
  const requiredMinimumCeilingUsd =
    wave.length === 0
      ? undefined
      : wave.reduce((sum, row) => sum + row.reserveUsd, 0) +
        reservedForFinalizationUsd +
        synthesisHoldUsd +
        // The live-root-exposure term (RV2004): without it the parity
        // envelope read 5.95 under a 6.00 ceiling and still lost its
        // fourth seat live to the coordination money this term prices.
        liveRootExposureTermUsd;
  // The reserve line (RV2101): with a synthesis promise held, the
  // budget chain fences every non-tail dispatch at ceiling minus the
  // reserve. The admitted wave's steady state is the spend that line
  // must absorb, and child spend past the declared estimates consumes
  // whatever headroom is left before the coordination loop itself is
  // refused there: the fourth parity run cleared the static minimum by
  // $0.05 and still missed the line by $0.065, one turn short of the
  // synthesis its reserve was funding. The loop now settles partial at
  // the line and redeems the reserve, but a wave sized onto the line
  // still forfeits its coordination room, so the trajectory gets loud.
  const reserveLineUsd =
    ceilingUsd === undefined || synthesisHoldUsd <= 0 ? undefined : ceilingUsd - synthesisHoldUsd;
  const reserveLineHeadroomUsd =
    reserveLineUsd === undefined
      ? undefined
      : reserveLineUsd -
        wave.filter((row) => row.admitted).reduce((sum, row) => sum + row.reserveUsd, 0);
  // The threshold is a declared knob since RV2201 (headroomTurns,
  // default the old hardwired 2): waves whose children routinely
  // overrun their estimates deserve a wider fence, and 0 silences the
  // finding for hosts that size onto the line deliberately.
  const headroomTurns = input.orchestrator?.headroomTurns ?? 2;
  if (
    orchestrateWave &&
    reserveLineUsd !== undefined &&
    reserveLineHeadroomUsd !== undefined &&
    wave.some((row) => row.admitted) &&
    headroomTurns > 0 &&
    reserveLineHeadroomUsd < headroomTurns * Math.max(liveRootExposureTermUsd, 0.0001)
  ) {
    say({
      severity: 'warning',
      code: 'reserve-line-headroom',
      message:
        `the admitted wave's steady state sits ${reserveLineHeadroomUsd.toFixed(4)} USD under ` +
        `the reserve line ${reserveLineUsd.toFixed(4)} USD (the ceiling minus the synthesis ` +
        `reserve), less than ${String(headroomTurns)} coordination turn floors of headroom ` +
        `(${liveRootExposureTermUsd.toFixed(4)} USD each): child spend past the declared ` +
        'estimates eats that headroom, the coordination loop is then refused at the line, and ' +
        'the run settles partial with the synthesis redeemed from its reserve (RV2101); size ' +
        'the wave below the line or raise the ceiling to keep coordinating past it',
    });
  }
  // The ceiling headroom, a first-class field (RV3208): the whole-wave
  // fill already names the smallest viable ceiling, but the DISTANCE
  // between it and the declared ceiling was left to the operator's
  // subtraction, and the 2026-08-11 experiment ran the whole workflow
  // on a $0.20 remainder of a $7.00 ceiling (2.86 percent) that a
  // small pricing or context drift would have refused at admission.
  // The share is the one-field read; the opt-in threshold turns it
  // into a finding without changing any declared config by default.
  const ceilingHeadroomUsd =
    ceilingUsd === undefined || requiredMinimumCeilingUsd === undefined
      ? undefined
      : ceilingUsd - requiredMinimumCeilingUsd;
  const ceilingHeadroomShare =
    ceilingHeadroomUsd === undefined || ceilingUsd === undefined || ceilingUsd <= 0
      ? undefined
      : ceilingHeadroomUsd / ceilingUsd;
  const minCeilingHeadroomShare = input.orchestrator?.minCeilingHeadroomShare ?? 0;
  // The breach posture (RV3310): 'warning' keeps RV3208 byte for
  // byte; 'error' makes the thin plan blocking for hosts that gate on
  // error findings, which is the assurance posture the 2026-08-12
  // harness already practiced (it threw on errors and sailed past its
  // own warning class).
  const ceilingHeadroomSeverity = input.orchestrator?.ceilingHeadroomSeverity ?? 'warning';
  if (ceilingHeadroomSeverity !== 'warning' && ceilingHeadroomSeverity !== 'error') {
    throw new ConfigError(
      "preflight orchestrator.ceilingHeadroomSeverity must be 'warning' or 'error'; got " +
        JSON.stringify(input.orchestrator?.ceilingHeadroomSeverity),
    );
  }
  if (
    ceilingHeadroomShare !== undefined &&
    minCeilingHeadroomShare > 0 &&
    ceilingHeadroomShare < minCeilingHeadroomShare
  ) {
    say({
      severity: ceilingHeadroomSeverity,
      code: 'ceiling-headroom-thin',
      message:
        `the ceiling headroom is ${(ceilingHeadroomShare * 100).toFixed(2)} percent of the ` +
        `ceiling (${(ceilingHeadroomUsd ?? 0).toFixed(4)} USD over the required minimum ` +
        `${(requiredMinimumCeilingUsd ?? 0).toFixed(4)} USD), below the declared ` +
        `${(minCeilingHeadroomShare * 100).toFixed(2)} percent floor: a small pricing or ` +
        'context drift refuses the whole wave at admission; raise the ceiling or slim the wave',
    });
  }
  // The orchestrator working room (RV2106): the post-fan-in judge
  // admits against the ORCHESTRATOR account, whose room past the held
  // synthesis reserve the coordination loop's own turns spend from
  // first. The ninth parity run held a 1.40 reserve under a 1.90 cap,
  // the root's turns took 0.38 of the 0.50 room, and the declared 0.28
  // judge estimate was refused after acceptance: the fan-out was
  // complete, the draft composed, and the synthesis its reserve was
  // funding never dispatched. The static minimum is one coordination
  // turn floor plus the declared judge estimate.
  // The pass posture the room must seat (RV3402): `'both'` dispatches
  // the judge twice at worst, and an armed repair round adds one more
  // judge pass AND one more composition, priced at the declared
  // synthesis reserve because that is the host's own estimate of one
  // composition. Absent declarations keep the historical one pass
  // reading byte for byte. The count itself is the shared
  // acceptanceJudgePasses (RV4001): the same figure the RV3907 gate
  // and the acceptanceReserve block hold, so the advisory warning and
  // the binding arithmetic can never count passes differently again
  // (the runtime undercounted 'both' for one release exactly because
  // this line and the gate each kept their own copy).
  const claimPosture = input.orchestrator?.claimConsistency;
  const repairArmed =
    claimPosture?.onFound === 'repair' && (claimPosture?.stage ?? 'draft') !== 'draft';
  const worstJudgePasses = acceptanceJudgePasses(claimPosture?.stage, claimPosture?.onFound);
  {
    const judgeEstUsd = input.orchestrator?.claimConsistency?.judge?.estCost;
    if (judgeEstUsd !== undefined && effectiveCapUsd !== undefined && synthesisHoldUsd > 0) {
      const workingRoomUsd = effectiveCapUsd - synthesisHoldUsd;
      const repairCompositionUsd = repairArmed ? synthesisHoldUsd : 0;
      const neededUsd =
        liveRootExposureTermUsd + judgeEstUsd * worstJudgePasses + repairCompositionUsd;
      if (workingRoomUsd < neededUsd) {
        say({
          severity: 'warning',
          code: 'orchestrator-working-room',
          message:
            `the orchestrator account's working room past the held synthesis reserve is ` +
            `${workingRoomUsd.toFixed(4)} USD (cap ${effectiveCapUsd.toFixed(4)} minus the ` +
            `${synthesisHoldUsd.toFixed(4)} USD hold), below one coordination turn floor ` +
            `(${liveRootExposureTermUsd.toFixed(4)} USD) plus the declared ` +
            `${judgeEstUsd.toFixed(4)} USD claim-consistency judge estimate` +
            (worstJudgePasses === 1
              ? ''
              : ` across ${String(worstJudgePasses)} passes at worst (RV3402)`) +
            (repairArmed
              ? ` plus one repair round composition priced at the ${synthesisHoldUsd.toFixed(4)} ` +
                'USD reserve (RV3307)'
              : '') +
            ': the judge admission will be declined once the coordination loop has taken even ' +
            'one turn, and ' +
            (claimPosture?.onFound === 'fail' || claimPosture?.onFound === 'repair'
              ? `under the armed '${claimPosture.onFound}' posture the declined judge stops ` +
                'the run typed (RV3307)'
              : 'the pass degrades to its journaled declined verdict (RV2106)') +
            '; raise the cap, shrink the judge estimate, or shrink the synthesis reserve',
        });
      }
    }
  }
  // The lifetime spawn budget of the tail (RV2201): every agent
  // invocation draws from budgetDefaults.lifetimeSpawnCap: the wave
  // rows above (the orchestrator row included) the projection already
  // denies row by row (`deniedBy: 'spawn-cap'`), but the
  // claim-consistency judge and the synthesis spawn AFTER the fan-out
  // and no row prices them against the counter. The seventh
  // subscription parity run seated its whole plan under a cap of 8 and
  // starved the post-acceptance tail with its money whole; the counter
  // now counts each agent once across segments, but a cap sized below
  // the declared plan still starves the tail deterministically, and an
  // exact fill leaves no headroom for anything the plan did not name.
  // Fires only on a fully admitted wave: a denied wave is already loud
  // through partial-admission or nothing-admitted.
  if (orchestrateWave && wave.length > 0 && admitted === wave.length) {
    const lifetimeSpawnCap = input.engine?.budgetDefaults?.lifetimeSpawnCap ?? 500;
    // A configured pass spawns its judge whether or not an estimate was
    // declared, so the marker is the pass itself (RV3402); every input
    // that existed before this field carried the judge object inside,
    // so the reading is byte identical for them.
    const judgeDeclared = input.orchestrator?.claimConsistency !== undefined;
    const synthesisDeclared = input.orchestrator?.synthesis !== undefined;
    // Passes, not declarations (RV3402): `'both'` dispatches two judge
    // invocations at worst, and an armed repair round adds one more
    // judge pass and one more composition against the same counter.
    const judgeSpawns = judgeDeclared ? worstJudgePasses : 0;
    const repairSpawns = repairArmed && synthesisDeclared ? 1 : 0;
    const plannedSpawns = wave.length + judgeSpawns + (synthesisDeclared ? 1 : 0) + repairSpawns;
    const spawnHeadroom = lifetimeSpawnCap - plannedSpawns;
    if (spawnHeadroom <= 0) {
      const breakdown =
        `the admitted wave of ${String(wave.length)} agent invocations` +
        (judgeDeclared
          ? judgeSpawns === 1
            ? ' plus the claim-consistency judge'
            : ` plus ${String(judgeSpawns)} claim-consistency judge passes at worst`
          : '') +
        (synthesisDeclared ? ' plus the synthesis invocation' : '') +
        (repairSpawns === 0 ? '' : ' plus the repair round composition') +
        ` is ${String(plannedSpawns)} against budgetDefaults.lifetimeSpawnCap ` +
        String(lifetimeSpawnCap);
      say({
        severity: 'warning',
        code: 'tail-spawn-budget',
        message:
          spawnHeadroom < 0
            ? breakdown +
              ': the post-fan-in tail starves on the counter with its money whole: the judge ' +
              'admission declines typed (RV2106) and the synthesis spawn journals its declined ' +
              'verdict (RV2201) instead of composing; raise the cap to seat the declared tail'
            : breakdown +
              ': an exact fill leaves zero spawn headroom, so nothing the plan did not name (a ' +
              're-spawned child, a second pass) can ever be admitted; raise the cap for margin',
      });
    }
  }
  if (wave.length > 0 && denied > 0) {
    const deniedLabels = wave.filter((row) => !row.admitted).map((row) => row.label);
    if (admitted === 0) {
      say({
        severity: 'error',
        code: 'nothing-admitted',
        message:
          `the declared wave admits NOTHING: every spawn is denied ` +
          `(${deniedLabels.join(', ')}); no paid work can start`,
      });
    } else {
      say({
        severity: 'warning',
        code: 'partial-admission',
        message:
          `the declared wave admits ${String(admitted)} of ${String(wave.length)} spawns; ` +
          `denied before any work: ${deniedLabels.join(', ')}`,
      });
    }
  }
  // The roster floor cross-check (RV1901): with the acceptance policy
  // demanding N spawned (or N successful) children, a wave whose BUDGET
  // seats fewer is a projected settle rejection; the run would pay for
  // the seated work and still reject. Judged only when the acceptance
  // slice is declared AND the shortage is the budget's doing; a wave
  // that merely declares fewer children than the floor stays silent,
  // because the orchestrator may spawn undeclared children live.
  {
    const acceptance = input.orchestrator?.acceptance;
    const minSuccessfulFloor =
      acceptance?.childPolicy !== undefined && acceptance.childPolicy !== 'all-ok'
        ? acceptance.childPolicy.minSuccessful
        : undefined;
    const rosterFloor = Math.max(acceptance?.minSpawnedChildren ?? 0, minSuccessfulFloor ?? 0);
    if (rosterFloor > 0 && children < rosterFloor && childrenDeniedByBudget > 0) {
      const demandedBy =
        (acceptance?.minSpawnedChildren ?? 0) >= (minSuccessfulFloor ?? 0)
          ? 'acceptance.minSpawnedChildren'
          : 'acceptance.childPolicy.minSuccessful';
      say({
        severity: 'error',
        code: 'admission-below-roster-floor',
        message:
          `the declared wave seats ${String(children)} of the ${String(rosterFloor)} children ` +
          `${demandedBy} demands (${String(childrenDeniedByBudget)} denied by budget): the run ` +
          `would pay for the seated work and still settle rejected; re-admission after a child ` +
          `settles frees money only when its settled spend stays below the released reserve`,
      });
    }
  }
  if (ceilingUsd === undefined && wave.length > 0) {
    say({
      severity: 'info',
      code: 'no-usd-ceiling',
      message:
        'the run has no budgetUsd ceiling: only turn, tool, and time limits bound spend, ' +
        'and the whole declared wave admits',
    });
  }

  // ---- Concurrency and quota exposure at the declared estimates.
  const declaredUnits = units.length;
  const maxInFlight = declaredUnits === 0 ? perRun : Math.min(perRun, declaredUnits);
  const perProviderCaps = engine.concurrency?.perProvider;
  const perProvider: PreflightReport['exposure']['perProvider'] = {};
  const byProvider = new Map<string, SpawnUnit[]>();
  for (const unit of units) {
    if (unit.provider === undefined) {
      continue;
    }
    const list = byProvider.get(unit.provider) ?? [];
    list.push(unit);
    byProvider.set(unit.provider, list);
  }
  for (const [provider, list] of [...byProvider.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const cap = perProviderCaps?.[provider];
    const inFlight = Math.min(list.length, maxInFlight, cap ?? Number.POSITIVE_INFINITY);
    const heaviest = [...list].sort((a, b) => b.tokensFloor - a.tokensFloor).slice(0, inFlight);
    perProvider[provider] = {
      inFlight,
      requestsPerWave: inFlight,
      tokensPerWaveFloor: heaviest.reduce((sum, unit) => sum + unit.tokensFloor, 0),
    };
  }
  const pricedTurns = units
    .map((unit) => unit.turnFloorUsd)
    .filter((usd): usd is number => usd !== undefined)
    .sort((a, b) => b - a)
    .slice(0, maxInFlight);
  const overshootOneTurnFloorUsd =
    pricedTurns.length === 0 ? undefined : pricedTurns.reduce((sum, usd) => sum + usd, 0);
  if (ceilingUsd !== undefined && overshootOneTurnFloorUsd !== undefined && units.length > 0) {
    say({
      severity: 'info',
      code: 'overshoot-exposure',
      message:
        `past a ceiling crossing, up to ${String(Math.min(maxInFlight, units.length))} in-flight ` +
        `turns may still complete: at least ${overshootOneTurnFloorUsd.toFixed(4)} USD past the ` +
        `${ceilingUsd.toFixed(4)} USD ceiling at the declared estimates, growing with prompt size`,
    });
  }
  // The RV711 admission-side bound, reported beside the layer-3
  // statement above: the cap bounds what concurrent admissions can
  // expose, while severed streams past a crossing still run to their
  // cut, so both findings stand together.
  const exposureCapUsd = input.run?.maxInFlightExposureUsd;
  if (exposureCapUsd !== undefined) {
    say({
      severity: 'info',
      code: 'in-flight-exposure-cap',
      message:
        `RunOptions.maxInFlightExposureUsd ${exposureCapUsd.toFixed(4)} USD bounds spent money ` +
        'plus live dispatch estimates: a dispatch whose estimate does not fit is refused typed ' +
        'before the provider call, so the worst concurrent overshoot past the cap is the ' +
        'estimate error of the in-flight turns, not one whole turn per agent',
    });
  }
  // The exposure floor over time (RV1907, re-priced by RV2101): the
  // recovery arm admitted all four workers and then had its root turn
  // refused BESIDE them. The live sum now counts spent money plus live
  // dispatch estimates ONLY (the tail reserves are fenced by the
  // budget chain, not the exposure cap), so the static floor is the
  // concurrent wave's turn floors alone, priced from the declared
  // shapes with the same rows as settlement.
  const requiredMinimumExposureUsd = overshootOneTurnFloorUsd;
  if (
    exposureCapUsd !== undefined &&
    requiredMinimumExposureUsd !== undefined &&
    requiredMinimumExposureUsd > exposureCapUsd
  ) {
    say({
      severity: 'warning',
      code: 'exposure-cap-tight',
      message:
        `maxInFlightExposureUsd ${exposureCapUsd.toFixed(4)} USD sits below the declared ` +
        `wave's breathing floor ${requiredMinimumExposureUsd.toFixed(4)} USD (the ` +
        `${String(pricedTurns.length)} most expensive concurrent turn floors): a coordinating ` +
        'turn beside a full child wave will be refused pre-wire and park until a hold ' +
        'releases (RV1902); raise the cap to at least the floor to avoid the stall entirely',
    });
  }

  const quotaConfigured = engine.quota !== undefined;
  if (!quotaConfigured && maxInFlight > 1 && units.length > 0) {
    say({
      severity: 'info',
      code: 'no-quota',
      message:
        `no shared quota limiter is configured while up to ${String(maxInFlight)} turns run ` +
        'concurrently: provider-side rate limits are unprotected (createEngine quota)',
    });
  }
  if (input.quotaRules !== undefined) {
    input.quotaRules.forEach((rule, index) => {
      let requests = 0;
      let tokens = 0;
      for (const unit of units) {
        if (unit.provider === undefined || unit.model === undefined) {
          continue;
        }
        const request = {
          provider: unit.provider,
          model: unit.model,
          ...(engine.quota?.tenant === undefined ? {} : { tenant: engine.quota.tenant }),
          estimate: { requests: 1, inputTokens: 0 },
        };
        if (quotaRuleMatches(rule, request)) {
          requests += 1;
          tokens += unit.tokensFloor;
        }
      }
      const dims = [
        rule.provider === undefined ? undefined : `provider=${rule.provider}`,
        rule.model === undefined ? undefined : `model=${rule.model}`,
        rule.tenant === undefined ? undefined : `tenant=${rule.tenant}`,
      ]
        .filter((dim): dim is string => dim !== undefined)
        .join(' ');
      const name = dims === '' ? `rule[${String(index)}]` : `rule[${String(index)}] (${dims})`;
      if (rule.requestsPerMinute !== undefined && requests > rule.requestsPerMinute) {
        say({
          severity: 'warning',
          code: 'quota-requests-below-wave',
          message:
            `${name}: the declared wave holds ${String(requests)} matching dispatches against ` +
            `requestsPerMinute ${String(rule.requestsPerMinute)}: expect synthetic rate-limit ` +
            'denials and backoff inside one window',
        });
      }
      if (rule.tokensPerMinute !== undefined && tokens > rule.tokensPerMinute) {
        say({
          severity: 'warning',
          code: 'quota-tokens-below-wave',
          message:
            `${name}: the declared wave demands at least ${String(tokens)} tokens against ` +
            `tokensPerMinute ${String(rule.tokensPerMinute)}: expect estimate-driven throttling ` +
            'inside one window',
        });
      }
      // ---- Past the first wave (the second experiment report, rec
      // 9): the same rule against the run ceiling. Every provider turn
      // is one wire request, a loop is bounded by
      // projectedProviderTurns, and the context regrows every turn, so
      // at the declared estimates turn k reserves inputFloor + k x
      // outputBound. The below-run checks fire only when the wave
      // check for the same dimension stayed silent: a wave that
      // already exceeds the window is the stronger, certain diagnosis.
      let runRequests = 0;
      let runTokens = 0;
      for (const shape of shapes) {
        if (shape.provider === undefined || shape.model === undefined) {
          continue;
        }
        const shapeRequest = {
          provider: shape.provider,
          model: shape.model,
          ...(engine.quota?.tenant === undefined ? {} : { tenant: engine.quota.tenant }),
          estimate: { requests: 1, inputTokens: 0 },
        };
        if (!quotaRuleMatches(rule, shapeRequest)) {
          continue;
        }
        runRequests += shape.count * shape.turns;
        runTokens += shape.count * shapeRunTokens(shape);
        if (rule.tokensPerMinute !== undefined && shape.outputBound > 0) {
          // The smallest k whose single reservation exceeds the whole
          // window: the limiter denies it with retryAfterMs 0 (the
          // estimate can never fit), so the loop dies there after
          // paying for the earlier turns.
          const k = Math.max(
            1,
            Math.floor((rule.tokensPerMinute - shape.inputFloor) / shape.outputBound) + 1,
          );
          if (k <= shape.turns) {
            say({
              severity: 'warning',
              code: 'quota-turn-never-fits',
              message:
                `spawn '${shape.label}': by turn ${String(k)} of ${String(shape.turns)} the ` +
                `context-grown reservation (about ` +
                `${String(shape.inputFloor + k * shape.outputBound)} tokens) exceeds ${name} ` +
                `tokensPerMinute ${String(rule.tokensPerMinute)} outright: the limiter denies ` +
                `it as never fitting the window (no wait helps) and the invocation fails after ` +
                `paying for the earlier turns`,
              spawn: shape.label,
            });
          }
        }
      }
      if (
        rule.requestsPerMinute !== undefined &&
        requests <= rule.requestsPerMinute &&
        runRequests > rule.requestsPerMinute
      ) {
        say({
          severity: 'warning',
          code: 'quota-requests-below-run',
          message:
            `${name}: the declared wave fits ${String(requests)} dispatches under ` +
            `requestsPerMinute ${String(rule.requestsPerMinute)}, but run to its turn ceilings ` +
            `it projects up to ${String(runRequests)} provider calls (fan-out times per-spawn ` +
            `turns, before any retries): expect synthetic rate-limit denials and backoff across ` +
            `about ${String(Math.ceil(runRequests / rule.requestsPerMinute))} windows`,
        });
      }
      if (
        rule.tokensPerMinute !== undefined &&
        tokens <= rule.tokensPerMinute &&
        runTokens > rule.tokensPerMinute
      ) {
        say({
          severity: 'warning',
          code: 'quota-tokens-below-run',
          message:
            `${name}: the declared wave demands ${String(tokens)} tokens up front, but with ` +
            `the context regrowing every turn its loops project about ${String(runTokens)} ` +
            `tokens against tokensPerMinute ${String(rule.tokensPerMinute)}: expect ` +
            `estimate-driven throttling across about ` +
            `${String(Math.ceil(runTokens / rule.tokensPerMinute))} windows`,
        });
      }
    });
  }

  const runCeiling =
    shapes.length === 0
      ? undefined
      : shapes.reduce(
          (sum, shape) => ({
            requests: sum.requests + shape.count * shape.turns,
            tokens: sum.tokens + shape.count * shapeRunTokens(shape),
          }),
          { requests: 0, tokens: 0 },
        );

  /**
   * The finish validation self test (the v1.71 experiment review,
   * P1.1): the SAME golden checks orchestrate runs at construction,
   * reported as error findings instead of throws. The experiment's
   * initial preflight was silent while a stale validator waited to
   * reject every correct answer; with the contract declared here, that
   * drift is a red finding before the first paid call.
   */
  let finishValidationEcho: PreflightReport['finishValidation'];
  if (input.finishValidation !== undefined) {
    const fv = input.finishValidation;
    if (!Array.isArray(fv.validators) || fv.validators.length === 0) {
      throw new ConfigError(
        'preflight finishValidation.validators must be a non empty array of validators',
      );
    }
    const names = new Set<string>();
    for (const candidate of fv.validators) {
      const validator = candidate as { name?: unknown; validate?: unknown };
      if (typeof validator.name !== 'string' || validator.name.length === 0) {
        throw new ConfigError('every preflight finish validator must carry a non empty name');
      }
      if (typeof validator.validate !== 'function') {
        throw new ConfigError(
          `preflight finish validator '${validator.name}' has no validate function`,
        );
      }
      names.add(validator.name);
    }
    if (fv.repairTurnReserve !== undefined) {
      requireNonNegativeInteger(
        fv.repairTurnReserve,
        'preflight finishValidation.repairTurnReserve',
      );
    }
    if (fv.maxRepairs !== undefined) {
      requireNonNegativeInteger(fv.maxRepairs, 'preflight finishValidation.maxRepairs');
    }
    // The unfunded repair warning (cycle 73): the runtime grants repair
    // exchanges, but without a declared reserve each one burns an
    // ordinary turn, so a window sized at maxTurns settles 'limit' with
    // its repairs unspent (the v1.74 run's terminal repair starved
    // exactly this way).
    {
      const grantedRepairs = fv.maxRepairs ?? DEFAULT_FINISH_MAX_REPAIRS;
      if (grantedRepairs > 0 && fv.repairTurnReserve === undefined) {
        findings.push({
          severity: 'warning',
          code: 'repair-reserve-unfunded',
          message:
            `finishValidation grants up to ${String(grantedRepairs)} repair ` +
            'exchange(s) but declares no repairTurnReserve: a rejected finish burns an ' +
            "ordinary turn and a window at maxTurns settles 'limit' with the repair " +
            'unspent; set finishValidation.repairTurnReserve to fund the repair exchanges',
        });
      }
    }
    // The underlength draft gate warning (the fifth experiment, cycle
    // 75): a draft word floor below the contract's own word minimum
    // admits drafts the final validators must reject, so the paid
    // synthesis starts from a base that already needs expansion (the
    // experiment gated 3984 word drafts at 3200 under a 4500 minimum,
    // and the synthesis copied the draft nearly verbatim).
    {
      const draftMinWords =
        typeof fv.draftPolicy === 'object' ? fv.draftPolicy.minWords : undefined;
      if (draftMinWords !== undefined) {
        requireNonNegativeInteger(draftMinWords, 'preflight finishValidation.draftPolicy.minWords');
      }
      const contractMinWords = fv.contract?.manifest.words?.min;
      if (
        draftMinWords !== undefined &&
        contractMinWords !== undefined &&
        draftMinWords < contractMinWords
      ) {
        findings.push({
          severity: 'warning',
          code: 'draft-gate-below-contract',
          message:
            `draftPolicy.minWords ${String(draftMinWords)} sits below the contract word ` +
            `minimum ${String(contractMinWords)}: the draft gate admits drafts the final ` +
            'validators must reject, so the synthesis starts from an underlength base; raise ' +
            'draftPolicy.minWords to the contract minimum or above',
        });
      }
    }
    if (fv.contract !== undefined) {
      for (const contractValidator of fv.contract.validators) {
        if (!names.has(contractValidator.name)) {
          findings.push({
            severity: 'error',
            code: 'output-contract-validator-mismatch',
            message:
              `contract validator '${contractValidator.name}' is not in the configured ` +
              'validator set; the promised contract is not enforced',
          });
        }
      }
    }
    const acceptFixture = fv.selfTest?.accept ?? fv.contract?.goldenAccept;
    const rejectFixture = fv.selfTest?.reject ?? fv.contract?.goldenReject;
    const rejectGoldens = fv.contract?.goldenRejects;
    let selfTestOutcome: 'passed' | 'failed' | 'skipped' = 'skipped';
    if (acceptFixture !== undefined || rejectFixture !== undefined || rejectGoldens !== undefined) {
      const report = selfTestFinishValidation({
        validators: fv.validators,
        ...(acceptFixture === undefined ? {} : { accept: acceptFixture }),
        ...(rejectFixture === undefined ? {} : { reject: rejectFixture }),
        ...(rejectGoldens === undefined ? {} : { rejects: rejectGoldens }),
      });
      selfTestOutcome = report.ok ? 'passed' : 'failed';
      for (const failure of report.failures) {
        // A reject-side failure carrying a validator name is the per
        // validator golden (cycle 74): the configured validator is
        // WEAKER than the contract's own, its own finding code.
        const weakened = failure.fixture === 'reject' && failure.validator !== undefined;
        findings.push({
          severity: 'error',
          code: weakened
            ? 'output-contract-validator-weakened'
            : 'output-contract-validator-mismatch',
          message:
            failure.validator === undefined
              ? failure.reasons.join('; ')
              : weakened
                ? `validator '${failure.validator}' failed its reject golden: ` +
                  failure.reasons.join('; ')
                : `validator '${failure.validator}' rejected the golden accept fixture: ` +
                  failure.reasons.join('; '),
        });
      }
    }
    finishValidationEcho = {
      ...(fv.contract === undefined ? {} : { contractHash: fv.contract.hash }),
      validators: fv.validators.map((validator) => validator.name),
      selfTest: selfTestOutcome,
    };
  }

  const severityRank = { error: 0, warning: 1, info: 2 } as const;
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    concurrency: {
      perRun,
      ...(perProviderCaps === undefined ? {} : { perProvider: { ...perProviderCaps } }),
    },
    budget: {
      ...(ceilingUsd === undefined ? {} : { ceilingUsd }),
      flatReserveUsd,
      lifetimeSpawnCap,
      childBudgetFraction,
      maxDepth,
      ...(orchestratorEcho === undefined ? {} : { orchestrator: orchestratorEcho }),
    },
    quota: {
      configured: quotaConfigured,
      ...(engine.quota?.tenant === undefined ? {} : { tenant: engine.quota.tenant }),
      ...(input.quotaRules === undefined ? {} : { rules: input.quotaRules.length }),
    },
    runLimits,
    spawns: spawnReports,
    admission: {
      ...(ceilingUsd === undefined ? {} : { ceilingUsd }),
      reservedForFinalizationUsd,
      synthesisReserveUsd: synthesisHoldUsd,
      ...(requiredMinimumCeilingUsd === undefined ? {} : { requiredMinimumCeilingUsd }),
      ...(ceilingHeadroomUsd === undefined ? {} : { ceilingHeadroomUsd }),
      ...(ceilingHeadroomShare === undefined ? {} : { ceilingHeadroomShare }),
      ...(liveRootExposureTermUsd > 0 ? { liveRootExposureTermUsd } : {}),
      ...(reserveLineUsd === undefined ? {} : { reserveLineUsd }),
      ...(reserveLineHeadroomUsd === undefined ? {} : { reserveLineHeadroomUsd }),
      wave,
      admitted,
      denied,
    },
    exposure: {
      maxInFlight,
      ...(overshootOneTurnFloorUsd === undefined ? {} : { overshootOneTurnFloorUsd }),
      ...(requiredMinimumExposureUsd === undefined ? {} : { requiredMinimumExposureUsd }),
      perProvider,
      ...(runCeiling === undefined ? {} : { runCeiling }),
    },
    ...(finishValidationEcho === undefined ? {} : { finishValidation: finishValidationEcho }),
    findings,
  };
}
