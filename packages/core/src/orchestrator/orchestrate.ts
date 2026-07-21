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
import { AdmissionRejectedError, ConfigError, FailRunError } from '../l0/errors.js';
import {
  requireFraction,
  requireNonNegativeInteger,
  requireNonNegativeNumber,
  requirePositiveInteger,
} from '../l0/validate-numbers.js';
import { truncateToBudget } from '../l0/truncate.js';
import type { Json } from '../l0/json.js';
import { createCanonicalIdMinter, type ModelSpec } from '../l0/messages.js';
import { canonicalIsolationTag, type SpawnLineageOpt } from '../journal/lineage.js';
import { agentScope } from '../journal/scope.js';
import type { AgentResult } from '../runtime/agent-loop.js';
import type { UsageLimits } from '../runtime/usage-limits.js';
import { profileCard } from '../model/profile-card.js';
import {
  collectDeclaredLadders,
  filterClaimsForRun,
  modelKnowledgeCard,
} from '../knowledge/card.js';
import {
  kBootCheckpoint,
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
import type { AgentOpts, AgentProfile, Workflow } from '../engine/ctx.js';
import { defineWorkflow } from '../engine/ctx.js';
import type { Engine, RunOptions } from '../engine/engine.js';
import type { RunHandle } from '../engine/run-handle.js';
import type { AdmissionDecision } from './admission.js';
import {
  digestOf,
  WAKE_SUMMARY_RENDER_BUDGET_CHARS,
  type OrchestratorRuntime,
  type SpawnAdmissionValue,
  type SpawnRecord,
  type TaskDigest,
} from './handles.js';
import { buildOrchestratorTools, FINISH_TOOL_NAME, type SpawnAgentParams } from './spawn-tools.js';
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
   * A positive integer, validated before any journal entry or dispatch:
   * the turn limit of the reserved final wake.
   */
  finalizeTurns?: number;
  /**
   * The policy at the cap, validated as exactly one of the two literals
   * even at a plain JS/JSON boundary. 'finish-with-partial' (default)
   * runs the reserved finalizer and returns its partial result with run
   * outcome 'ok'. 'fail-run' skips the finalizer entirely: the run
   * fails with outcome 'error' carrying FailRunError (code 'fail_run',
   * data.source 'orchestrator_budget_cap', data.capDecisionRef); resume
   * rolls the same failure forward from the journaled cap decision
   * without another model call.
   */
  atCap?: 'finish-with-partial' | 'fail-run';
}

/** Options for orchestrate(engine, goal, o?). */
export interface OrchestrateOptions {
  model?: ModelSpec;
  /** Registered profile names to advertise; default: every profile. */
  profiles?: string[];
  /**
   * Per-orchestrate spawn cap: a nonnegative integer (zero admits no
   * spawns), validated before any journal entry or dispatch. The engine
   * lifetime cap applies regardless.
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
}

export const ORCHESTRATE_WORKFLOW_NAME = 'rulvar-orchestrate';

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
 * Resolves per-spawn dispatch options against the engine registries
 * (registered SchemaSpec and tool profile names; M7-T05). An
 * unknown ref is a typed ConfigError, surfaced as a tool error to the
 * orchestrator and never a run failure.
 */
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
  const filtered: Record<string, AgentProfile> = {};
  for (const name of names) {
    if (registered[name] !== undefined) {
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
  return defineWorkflow({ name: ORCHESTRATE_WORKFLOW_NAME }, async (ctx): Promise<unknown> => {
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
        internals.budget.openAccount(orchestratorAccount, {
          parentScope: callingState.budgetScope ?? ROOT_ACCOUNT,
          ceilingUsd: frozen.capUsd,
          kind: 'orchestrator-cap',
        });
        if (extension !== undefined) {
          internals.budget.commitFinalizeReserve(orchestratorAccount, frozen.finalizeReserveUsd);
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

    const records = new Map<number, SpawnRecord>();
    const byOrdinal = new Map<number, SpawnRecord>();
    const rejectedByOrdinal = new Map<number, { decision: AdmissionDecision; entrySeq: number }>();
    /**
     * The journaled spec behind each recovered ordinal: the idempotent
     * re-execution guard compares it against the incoming call, because
     * after a cross-attempt resume a REGENERATED turn (the boundary
     * checkpoint predates the lost turn) may decide differently, and
     * handing it the prior ordinal's handle would bind the transcript
     * to a stranger's child.
     */
    const recoveredSpecByOrdinal = new Map<number, SpawnAgentParams>();
    let nextOrdinal = 0;
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
        recoveredSpecByOrdinal.set(value.spawnOrdinal, value.spec as unknown as SpawnAgentParams);
        const recoveredAgentType =
          (value.spec as { agentType?: string } | undefined)?.agentType ?? 'unknown';
        if (decision.verdict.kind !== 'admit') {
          rejectedByOrdinal.set(value.spawnOrdinal, { decision, entrySeq });
          continue;
        }
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
        // Handle stability across attempts: a restored transcript holds
        // the handles its turns saw (running-entry seqs). A replayed
        // child keeps its seq, but a cancelled child RERUNS under a new
        // one, so prior attempts of the SAME call, the running entries
        // sharing the dispatched entry's (scope, key, ordinal) triple,
        // alias to the recovered record and await_all / cancel_agent
        // keep working on the old numbers. Identical siblings differ by
        // ordinal and never cross-link.
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
              prior.ordinal === dispatched.ordinal &&
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
      const undelivered = [...records.values()]
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

    const orchestratorRuntime: OrchestratorRuntime = {
      async spawn(params: SpawnAgentParams): Promise<{ handle: number }> {
        await recoveryDone;
        const spawnOrdinal = nextOrdinal;
        nextOrdinal += 1;
        // Idempotent re-execution after a mid-turn resume: the recovery
        // scan already rebuilt this ordinal's record or rejection. The
        // recovered verdict binds ONLY when the incoming call matches
        // the journaled spec: a cross-attempt rerun regenerating a lost
        // turn may decide differently, and a divergent call must decide
        // fresh instead of receiving a stranger's handle (the prior
        // decision's child stays paid, at-least-once).
        const priorSpec = recoveredSpecByOrdinal.get(spawnOrdinal);
        const specMatches =
          priorSpec === undefined ||
          (priorSpec.agentType === params.agentType && priorSpec.prompt === params.prompt);
        const recovered = byOrdinal.get(spawnOrdinal);
        if (recovered !== undefined && specMatches) {
          return { handle: recovered.handle };
        }
        const recoveredRejection = rejectedByOrdinal.get(spawnOrdinal);
        if (recoveredRejection !== undefined && specMatches) {
          const reason = recoveredRejection.decision.verdict as { reason?: { code?: string } };
          emitSpawnRejected(internals.events, {
            entryRef: recoveredRejection.entrySeq,
            code: reason.reason?.code ?? 'unknown',
            agentType: params.agentType,
            spanId: callingState.spanId,
            replayed: true,
          });
          throw new AdmissionRejectedError(
            `admission rejected spawn ordinal ${String(spawnOrdinal)} (recovered verdict)`,
            { data: { decision: recoveredRejection.decision as unknown as Json } },
          );
        }
        if (opts?.maxSpawns !== undefined && spawnOrdinal >= opts.maxSpawns) {
          // A config-gate rejection precedes any journal append, so the
          // event carries no entryRef.
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
        // The approach signature is computed from the profile-resolved
        // identity inputs available at admission (DEF-3); the toolset and
        // schema registries land in M7-T05 and upgrade the hashes there.
        const profile = internals.defaults.profiles?.[params.agentType];
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
        const decision = admission.admit(
          {
            origin: 'spawn_agent',
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
          origin: 'spawn_agent',
          orchestratorScope: scope,
          spawnOrdinal,
          name: params.agentType,
          childScope: scope,
          parentAccountScope: callingState.budgetScope ?? ROOT_ACCOUNT,
          spec: params as unknown as Json,
          decision: decision as unknown as Json,
        };
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
        return digestOf(first.record, first.result);
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
        return Promise.all(waited.map(async (record) => digestOf(record, await record.result)));
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
            const possible = [...records.values()].some(
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
          const undelivered = [...records.values()].filter(
            (record) => record.settled !== undefined && !deliveredNodeIds.has(record.nodeId),
          );
          switch (trigger.kind) {
            case 'quiescence':
              // Nothing running AND nothing ready: the extension owns the
              // "nothing ready" half (M7-T05).
              return (
                [...records.values()].every((record) => record.settled !== undefined) &&
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
    const tools = [
      ...buildOrchestratorTools(orchestratorRuntime, fullCardText),
      ...(extension?.tools(io) ?? []),
    ];
    const agentOpts: AgentOpts & InternalAgentHooks & { result: 'full' } = {
      role: 'orchestrate',
      result: 'full',
      tools,
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
            estCost:
              capState.effectiveCapUsd -
              (orchestratorAccount === undefined
                ? 0
                : (internals.budget.accountView(orchestratorAccount)?.finalizeReserveUsd ?? 0)),
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
      [kTerminalTool]: { name: FINISH_TOOL_NAME },
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
    orchestratorState.signal =
      callingState.signal === undefined
        ? forcedFinishController.signal
        : AbortSignal.any([callingState.signal, forcedFinishController.signal]);

    /**
     * The reserved final wake: a FRESH agent entry on
     * the restricted single-tool toolset (a different toolsetHash), a
     * prompt deterministically derived from the journaled cap decision
     * and the pinned digest, and a finalizeTurns limit, paid from the
     * reserve. On its failure the engine writes
     * orchestrator_finalize_fallback and SYNTHESIZES a deterministic
     * partial result by pure fold, without a single LLM call.
     */
    const runForcedFinish = async (): Promise<unknown> => {
      const capEntry = internals.replayer.snapshot().find((entry) => entry.seq === capDecisionRef);
      const capValue = capEntry?.value as
        { snapshot?: { planHash?: string; wakeOrdinal?: number } } | undefined;
      const finishOnly = buildOrchestratorTools(orchestratorRuntime, fullCardText).filter(
        (tool) => tool.name === FINISH_TOOL_NAME,
      );
      internals.cost.orchestrator.forcedFinish = true;
      if (orchestratorAccount !== undefined) {
        // The finalize dispatch draws FROM the reserve (DEF-7): stop
        // subtracting it from the remainder now that it is being spent.
        internals.budget.releaseFinalizeReserve(orchestratorAccount);
      }
      const finalizeTurns = capState?.finalizeTurns ?? 2;
      const finalOpts: AgentOpts & InternalAgentHooks & { result: 'full' } = {
        role: 'orchestrate',
        result: 'full',
        tools: finishOnly,
        limits: { maxTurns: finalizeTurns },
        // The finalize dispatch spends from the released reserve, so
        // that reserve is its admission worst case: the default hint
        // (full maxOutputTokens pricing) could refuse the very agent
        // the reserve exists to fund.
        ...(capState === undefined ? {} : { estCost: capState.finalizeReserveUsd }),
        ...(opts?.model === undefined ? {} : { model: opts.model }),
        [kTerminalTool]: { name: FINISH_TOOL_NAME },
        // Stamped into the terminal's cost attribution: the journal
        // fold derives reserveUsedUsd from it.
        [kFinalizeReserve]: true,
      };
      const finalState: CtxScopeState = { ...callingState };
      if (orchestratorAccount !== undefined) {
        finalState.budgetScope = orchestratorAccount;
      }
      const digest = buildDigest(wakeOrdinal);
      const reserveBaseline =
        orchestratorAccount === undefined
          ? 0
          : (internals.budget.accountView(orchestratorAccount)?.spentUsd ?? 0);
      const final = await runtime.runInScope(finalState, () =>
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
      if (final.status === 'ok') {
        return final.output;
      }
      const reason =
        final.error?.kind === 'schema-mismatch'
          ? 'schema-exhausted'
          : final.error?.kind === 'budget'
            ? 'ceiling-abort'
            : 'turns-exhausted';
      const fallbackKey = deriverV2.deriveKey({ kind: 'orchestrator-finalize-fallback' });
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
      // and the frozen plan snapshot; exhaustion is never null.
      internals.budget.markExhausted();
      return {
        forcedFinishFallback: true,
        planHash: capValue?.snapshot?.planHash ?? '',
        completed: [...records.values()]
          .filter((record) => record.settled !== undefined)
          .sort((a, b) => a.spawnOrdinal - b.spawnOrdinal)
          .map((record) => digestOf(record, record.settled as AgentResult<unknown>)),
      };
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
        { fallback?: string; spentUsd?: number; capUsd?: number } | undefined;
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
    const result = await runtime.runInScope(orchestratorState, () =>
      (ctx.agent as (prompt: string, o?: unknown) => Promise<AgentResult<unknown>>)(
        orchestratorPrompt(goal, opts?.maxSpawns, extension?.promptLines?.()),
        agentOpts,
      ),
    );
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
    return result.output;
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
