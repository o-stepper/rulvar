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
} from '../l0/validate-numbers.js';
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
  orchestratorAdmissionEstCostUsd,
  type OrchestratorBudgetSpec,
} from '../orchestrator/orchestrate.js';
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
  /** The RunOptions slice: the run ceiling and run-level limits. */
  run?: Pick<RunOptions, 'budgetUsd' | 'limits'>;
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

const ANY_TOOL = '(any)';

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
    if (limits.maxToolCalls !== undefined) {
      terms.push({ boundBy: 'maxToolCalls', ceiling: limits.maxToolCalls });
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
  if (input.orchestrator?.limits !== undefined) {
    validateUsageLimits(input.orchestrator.limits, 'preflight.orchestrator.limits');
  }
  const findings: PreflightFinding[] = [];
  const say = (finding: PreflightFinding): void => {
    findings.push(finding);
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
    orchestratorEcho = {
      ...(effectiveCapUsd === undefined ? {} : { effectiveCapUsd }),
      finalizeReserveUsd,
      finalizeTurns,
      reserveCommitted,
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
    const overall = toolCeilings.reduce<number | null>(
      (best, row) =>
        row.ceiling === null ? best : best === null ? row.ceiling : Math.max(best, row.ceiling),
      null,
    );
    // The overall executed-call ceiling across any mix: the cheapest
    // single-tool strategy bounds it from above; maxToolCalls bounds it
    // regardless of mix. A free tool (unit cost 0) lifts the units
    // bound entirely for calls of that tool.
    const executedToolCallCeiling =
      limits.maxToolCalls !== undefined && (overall === null || limits.maxToolCalls < overall)
        ? limits.maxToolCalls
        : overall;

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
      caps?.supportsParallelTools === true
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
          `checkpoint exists, and a kill mid-batch re-pays every executed call on resume`,
        spawn: label,
      });
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
  }
  // The orchestrator agent is a declared unit too: its serving model
  // comes from routing.orchestrate, and an orchestration without one
  // would fail at spawn time exactly like an unrouted child.
  let orchestratorReserveUsd: number | undefined;
  if (input.orchestrator !== undefined) {
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
          orchestratorAdmissionEstCostUsd(effectiveCapUsd, reservedForFinalizationUsd),
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
  const admitAgainstRoot = (reserveUsd: number): boolean => {
    if (ceilingUsd === undefined) {
      return true;
    }
    const held = committed + reservedForFinalizationUsd;
    return !(held >= ceilingUsd || held + reserveUsd > ceilingUsd);
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
          // everything already committed, strict past exact fill. The
          // gate never sees the priced estimate, so a wave the layer-1
          // chain would afford can still die here, exactly like the
          // runtime.
          const remainder = ceilingUsd - committed - reservedForFinalizationUsd;
          const projection = dispatchProjectionReserveUsd(gate, flatReserveUsd);
          if (remainder <= 0 || remainder < projection) {
            deniedBy = 'budget';
          }
        }
        if (deniedBy === undefined && !admitAgainstRoot(reserveUsd)) {
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
    });
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
    },
    findings,
  };
}
