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
  DEFAULT_CHILD_BUDGET_FRACTION,
  DEFAULT_MAX_DEPTH,
  dispatchProjectionReserveUsd,
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
     * Mirrors OrchestrateSynthesis.exposeChildResultTools (the v1.74
     * experiment review, P0.2): declaring it lets the evidence
     * asymmetry check see that the synthesis model can page the full
     * child outputs the validators judge against.
     */
    exposeChildResultTools?: boolean;
    /** Mirrors OrchestrateSynthesis.context; default 'digests'. */
    context?: 'digests' | 'full';
  };
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
     * the repair-reserve-unfunded warning stays silent.
     */
    maxRepairs?: number;
    /**
     * Mirrors FinishValidationSpec.draftPolicy (the fifth experiment,
     * cycle 75): declaring it lets the estimator compare the draft
     * gate's word floor against the contract's own word minimum. The
     * experiment gated drafts at 3200 words under a 4500 word contract,
     * so the gate admitted a draft the final validators had to reject
     * and the synthesis started from an underlength base; the
     * draft-gate-below-contract warning names exactly that shape.
     */
    draftPolicy?: {
      minWords?: number;
      requireSections?: string[];
    };
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
    };
  };
  quota: { configured: boolean; tenant?: string; rules?: number };
  /** The run-level merge an undeclared spawn would receive. */
  runLimits: EffectiveUsageLimits;
  spawns: PreflightSpawnReport[];
  admission: {
    ceilingUsd?: number;
    reservedForFinalizationUsd: number;
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
  let effectiveCapUsd: number | undefined;
  if (input.orchestrator !== undefined) {
    if (input.orchestrator.estInputTokens !== undefined) {
      requireNonNegativeInteger(
        input.orchestrator.estInputTokens,
        'preflight.orchestrator.estInputTokens',
      );
    }
    const spec = input.orchestrator.budget;
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
    const profile = spec.profile === undefined ? undefined : defaults.profiles?.[spec.profile];
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
      limits.toolUnits === undefined
    ) {
      say({
        severity: 'warning',
        code: 'inert-finalization-reserve',
        message:
          `spawn '${label}' sets finalizationReserve without maxToolCalls or toolUnits: ` +
          `no tool budget limiter exists for it to fire on`,
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
      const perEntry = evidenceContract.estCallsPerEntry ?? DEFAULT_EVIDENCE_CALLS_PER_ENTRY;
      const overhead = evidenceContract.overheadCalls ?? DEFAULT_EVIDENCE_OVERHEAD_CALLS;
      const floor = evidenceContract.minEntries * perEntry + overhead;
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
      limits,
      admissionReserveUsd: reserveUsd,
      reserveSource,
      ...(outputBound === undefined ? {} : { maxOutputTokensPerTurn: outputBound }),
      ...(turnFloorUsd === undefined ? {} : { turnFloorUsd }),
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
  const admitAgainstRoot = (reserveUsd: number, strictAtFill = false): boolean => {
    if (ceilingUsd === undefined) {
      return true;
    }
    const held = committed + reservedForFinalizationUsd;
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
    });
    if (deniedBy === undefined) {
      committed += reserveUsd;
      spawned += 1;
    }
  }
  const maxSpawns = input.orchestrator?.maxSpawns;
  const orchestrateWave = input.orchestrator !== undefined;
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
          // everything already committed. Strict AT exact fill (cycle
          // 76): the live evaluation subtracts the coordination spend
          // that is always already paid by the time a spawn tool runs,
          // so a remainder that only just equals the projection is a
          // certain live rejection. The gate never sees the priced
          // estimate, so a wave the layer-1 chain would afford can
          // still die here, exactly like the runtime.
          const remainder = ceilingUsd - committed - reservedForFinalizationUsd;
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
      });
      if (deniedBy === undefined) {
        committed += reserveUsd;
        spawned += 1;
        children += 1;
      }
    }
  }
  const admitted = wave.filter((row) => row.admitted).length;
  const denied = wave.length - admitted;
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
      const draftMinWords = fv.draftPolicy?.minWords;
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
      wave,
      admitted,
      denied,
    },
    exposure: {
      maxInFlight,
      ...(overshootOneTurnFloorUsd === undefined ? {} : { overshootOneTurnFloorUsd }),
      perProvider,
      ...(runCeiling === undefined ? {} : { runCeiling }),
    },
    ...(finishValidationEcho === undefined ? {} : { finishValidation: finishValidationEcho }),
    findings,
  };
}
