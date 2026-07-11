/**
 * The mode (c) dynamic orchestrator (M6-T07/T08).
 *
 * Owning spec: docs/06-execution-spec.md section 9.3 and
 * docs/07-adaptive-orchestration-spec.md sections 1 and 4. An ordinary
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
 * Non-PlanRunner applicability (docs/07 section 1): only the lifetime
 * cap, maxDepth, and the budget layers apply; no termination.init is
 * written; escalated children simply settle into their digests.
 */
import { AdmissionRejectedError, ConfigError } from '../l0/errors.js';
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
  kOnRunning,
  kTerminalTool,
  runtimeOf,
  type CtxScopeState,
  type InternalAgentHooks,
} from '../engine/internal.js';
import { ROOT_ACCOUNT } from '../engine/budget.js';
import { OrchestratorCapConfigError } from '../l0/errors.js';
import { deriverV2 } from '../journal/keyderiver.js';
import type { AgentOpts, AgentProfile, Workflow } from '../engine/ctx.js';
import { defineWorkflow } from '../engine/ctx.js';
import type { Engine } from '../engine/engine.js';
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

/** docs/06 5.5; the cap machinery (reserves, freeze) completes in M7 (DEF-7). */
export interface OrchestratorBudgetSpec {
  capUsd?: number;
  /** default 0.2; effectiveCap = min of the given bounds */
  capFraction?: number;
  finalizeReserveUsd?: number;
  finalizeTurns?: number;
  atCap?: 'finish-with-partial' | 'fail-run';
}

/** docs/06 9.3: orchestrate(engine, goal, o?). */
export interface OrchestrateOptions {
  model?: ModelSpec;
  /** Registered profile names to advertise; default: every profile. */
  profiles?: string[];
  /** Per-orchestrate spawn cap; the engine lifetime cap applies regardless. */
  maxSpawns?: number;
  /** The orchestrator's own budget sub-account (cap enforcement layers only in M6). */
  budget?: OrchestratorBudgetSpec;
  /**
   * Deterministic digest render bound (docs/07, section 5): each
   * TaskDigest outputSummary is clamped to this many CHARACTERS (the
   * model-independent measure; OQ-04 closed at M10 entry). Default
   * WAKE_SUMMARY_RENDER_BUDGET_CHARS (docs/06, Appendix A).
   */
  renderBudgetChars?: number;
  /** UsageLimits of the orchestrator agent itself (maxTurns etc.). */
  limits?: UsageLimits;
  /**
   * The opt-in mode (c) extension seam (M7-T05): PlanRunner from
   * @rulvar/plan attaches here (docs/07, section 1). The extension boots
   * strictly before the orchestrator's first agent entry, contributes
   * tools, schedules ready plan nodes on every settlement, and
   * participates in the mandatory quiescence trigger.
   */
  extension?: OrchestratorExtension;
}

export const ORCHESTRATE_WORKFLOW_NAME = 'rulvar-orchestrate';

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
 * (docs/08: registered SchemaSpec and tool profile names; M7-T05). An
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
          'defaults.schemas (docs/08, section "SchemaSpec"; docs/07, 4.2)',
      );
    }
    opts.schema = schema;
  }
  if (spec.toolsetRef !== undefined) {
    const tools = defaults.toolsets?.[spec.toolsetRef];
    if (tools === undefined) {
      throw new ConfigError(
        `unknown toolsetRef '${spec.toolsetRef}': register it under ` +
          'defaults.toolsets (docs/08, section "tool() definition"; docs/07, 4.2)',
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
    // The ladder driver's concrete rung resolution (docs/07, section
    // 10): the call-layer override shadows the profile's declared ladder
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
    // overrides (docs/07, section 10), so a spawn of one dies at wire
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

    // The orchestrator's own sub-account (docs/06 5.5). M6 wires the
    // account and its layer-2/3 enforcement when a cap resolves; the
    // reserve decision entries and the at-cap freeze are M7 (DEF-7).
    const extension = opts?.extension;
    let orchestratorAccount: string | undefined;
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
      const fraction = spec?.capFraction ?? 0.2;
      if (fraction > 1) {
        throw new OrchestratorCapConfigError(
          `capFraction ${String(fraction)} exceeds 1.0 (docs/07, 12.2: opting out of the cap ` +
            'is explicit only, up to 1.0 inclusive)',
        );
      }
      const fromFraction = runCeiling === undefined ? undefined : fraction * runCeiling;
      const bounds = [spec?.capUsd, fromFraction].filter(
        (bound): bound is number => bound !== undefined,
      );
      if (extension !== undefined && bounds.length === 0) {
        // An uncapped orchestrator was precisely the defect (DEF-7):
        // PlanRunner refuses to start BEFORE the first LLM call and
        // before any journal entries (docs/07, 12.2).
        throw new OrchestratorCapConfigError(
          'the orchestrator cap is unresolvable: the run has no USD ceiling and no explicit ' +
            'budget.capUsd; PlanRunner requires a resolved effectiveCap (docs/07, 12.2)',
        );
      }
      if (bounds.length > 0) {
        const effectiveCapUsd = Math.min(...bounds);
        // The deterministic per-turn estimate of v1: the engine flat
        // reserve default; the journaled reserve entry freezes the
        // ABSOLUTE dollars, so replay never re-derives (docs/06, 5.5).
        const turnEstimateUsd = internals.flatReserveUsd ?? 0.5;
        const finalizeTurns = spec?.finalizeTurns ?? 2;
        const finalizeReserveUsd = spec?.finalizeReserveUsd ?? finalizeTurns * turnEstimateUsd;
        if (extension !== undefined && effectiveCapUsd < finalizeReserveUsd) {
          throw new OrchestratorCapConfigError(
            `effectiveCap ${effectiveCapUsd.toFixed(4)} USD is below the finalize reserve ` +
              `${finalizeReserveUsd.toFixed(4)} USD (docs/07, 12.2)`,
          );
        }
        orchestratorAccount =
          callingState.scope === '' ? 'orchestrator' : `${callingState.scope}/orchestrator`;
        internals.budget.openAccount(orchestratorAccount, {
          parentScope: callingState.budgetScope ?? ROOT_ACCOUNT,
          ceilingUsd: effectiveCapUsd,
        });
        if (extension !== undefined) {
          // The reserve registers in the orchestrator account AND the
          // run root: admission never eats the finalization money, even
          // against whole-run exhaustion (docs/07, 12.2, 12.6).
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
    const rejectedByOrdinal = new Map<number, AdmissionDecision>();
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
    // caused it (docs/07, 4.8: quiescence sees the post-scheduling state).
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
      placement?: { childScope: string; childCeilingUsd?: number },
    ): Promise<SpawnRecord> => {
      const controller = new AbortController();
      const upstream = callingState.signal ?? internals.runSignal;
      const scope = placement?.childScope ?? childScopeOf();
      if (placement !== undefined) {
        // Plan nodes get their own sub-account beside the orchestrator
        // account (docs/07, 12.1); reopening on resume keeps state.
        internals.budget.openAccount(scope, {
          parentScope: callingState.budgetScope ?? ROOT_ACCOUNT,
          ...(placement.childCeilingUsd === undefined
            ? {}
            : { ceilingUsd: placement.childCeilingUsd }),
        });
      }
      const childState: CtxScopeState = {
        scope,
        spanId: internals.spans.mint(callingState.spanId),
        signal:
          upstream === undefined
            ? controller.signal
            : AbortSignal.any([upstream, controller.signal]),
        budgetScope: placement !== undefined ? scope : (callingState.budgetScope ?? ROOT_ACCOUNT),
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
        // sees newly-ready nodes (docs/07, 4.8).
        await runExtensionActivity();
        for (const listener of [...settleListeners]) {
          listener();
        }
      });
      records.set(handle, record);
      byOrdinal.set(spawnOrdinal, record);
      return record;
    };

    // The public extension IO (M7-T05): every capability maps to a
    // docs/07 requirement; see orchestrator/extension.ts.
    const io: OrchestratorExtensionIO = {
      runId: internals.runId,
      baseScope: callingState.scope,
      orchestratorScope: () => childScopeOf(),
      profiles: advertisedProfiles,
      gates: internals.defaults.gates ?? {},
      ...(internals.budget.ceilingUsd === undefined
        ? {}
        : { runCeilingUsd: internals.budget.ceilingUsd }),
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
      emit: (event) => internals.events.emit(event, callingState.spanId),
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
      // Caller intent (docs/07 4.5, M6 note): the child terminal
      // journals 'cancelled' and reruns on a later resume unless
      // covered by abandon; the abandon compilation rides the DEF-5
      // machinery (M7-T07).
      record.abort();
      await record.result;
      return { cancelled: true, handle };
    };

    /** Rebuilds spawn records from the journal (the crash-resume contract). */
    const recover = async (): Promise<void> => {
      const scope = childScopeOf();
      const admissions = internals.replayer
        .snapshot()
        .filter((entry) => {
          if (entry.kind !== 'decision') {
            return false;
          }
          const value = entry.value as Partial<SpawnAdmissionValue> | undefined;
          return (
            value?.decisionType === 'spawn-admission' &&
            (value.origin === 'spawn_agent' || value.origin === 'parallel_agents') &&
            value.orchestratorScope === scope
          );
        })
        .map((entry) => entry.value as unknown as SpawnAdmissionValue)
        .sort((a, b) => a.spawnOrdinal - b.spawnOrdinal);
      for (const value of admissions) {
        nextOrdinal = Math.max(nextOrdinal, value.spawnOrdinal + 1);
        const decision = value.decision as unknown as AdmissionDecision;
        if (decision.verdict.kind !== 'admit') {
          rejectedByOrdinal.set(value.spawnOrdinal, decision);
          continue;
        }
        admission.recoverChild(scope);
        // Re-dispatch through forward matching: settled children replay
        // instantly, a dangling one redispatches live, and a decision
        // without a dispatch entry rolls forward to a fresh dispatch.
        await dispatchChild(value.spec as unknown as SpawnAgentParams, value.spawnOrdinal, {
          nodeId: decision.nodeId ?? 'unknown',
          logicalTaskId: decision.verdict.lineage.logicalTaskId,
        });
      }
      // Wake recovery (M6-T09): prior wake suspensions restore the
      // coalescing state; resolved digests are authoritative (pinned).
      const wakePrefix = `wake:${String(orchSeq ?? -1)}:`;
      for (const entry of internals.replayer.snapshot()) {
        if (entry.status !== 'suspended' || entry.kind !== 'external') {
          continue;
        }
        const payload = entry.value as { key?: string } | undefined;
        if (typeof payload?.key !== 'string' || !payload.key.startsWith(wakePrefix)) {
          continue;
        }
        wakeOrdinal = Math.max(wakeOrdinal, Number(payload.key.slice(wakePrefix.length)) + 1);
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
    const forcedFinishController = new AbortController();
    let capInFlight = false;

    /**
     * The at-cap freeze (docs/07, 12.4): EXACTLY one decision entry
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
      // Exactly ONE cap decision (docs/07, 12.4): the latch closes the
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
      // toolset (docs/07, 12.4 d).
      forcedFinishController.abort('rulvar:forced-finish');
    };

    /** Layer-1 soft boundary before delivering each wake (docs/07, 12.3). */
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
      // validation consume recorded digests, docs/07 3.5).
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
          // the suspension resolves; docs/07, 6.2).
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
          if (row.outputSummary.length > budgetChars) {
            // The deterministic character measure (docs/07, section 5):
            // identical live and on replay, no tokenizer dependence.
            return { ...row, outputSummary: `${row.outputSummary.slice(0, budgetChars)}...` };
          }
          return row;
        }),
        escalations,
      };
      if (capState !== undefined && orchestratorAccount !== undefined) {
        // Passive visibility (docs/07, 12.5): the budget block rides
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
        // scan already rebuilt this ordinal's record or rejection.
        const recovered = byOrdinal.get(spawnOrdinal);
        if (recovered !== undefined) {
          return { handle: recovered.handle };
        }
        const recoveredRejection = rejectedByOrdinal.get(spawnOrdinal);
        if (recoveredRejection !== undefined) {
          throw new AdmissionRejectedError(
            `admission rejected spawn ordinal ${String(spawnOrdinal)} (recovered verdict)`,
            { data: { decision: recoveredRejection as unknown as Json } },
          );
        }
        if (opts?.maxSpawns !== undefined && spawnOrdinal >= opts.maxSpawns) {
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
          // wire resolution (router, docs/04 section 12) after burning an
          // admission slot and journal entries.
          throw new ConfigError(
            `agentType '${params.agentType}' declares a ladder; ladder execution is owned ` +
              'by the plan extension, which resolves each rung attempt to a concrete model ' +
              'override (docs/07, section 10); spawn a concrete profile instead',
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
        await internals.replayer.appendSinglePhase({
          scope: callingState.scope,
          key: '',
          kind: 'decision',
          status: 'ok',
          spanId: callingState.spanId,
          value: admissionValue,
        });
        if (decision.verdict.kind === 'reject') {
          rejectedByOrdinal.set(spawnOrdinal, decision);
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
        internals.events.emit(
          {
            type: 'spawn:admitted',
            agentType: params.agentType,
            logicalTaskId: decision.verdict.lineage.logicalTaskId,
            spawnUnitsAfter: decision.verdict.spawnUnitsAfter,
          },
          callingState.spanId,
        );
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
        // trigger set that can never fire is an immediate typed error
        // (docs/07 4.8), even though quiescence is engine-armed anyway.
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
              // "nothing ready" half (docs/07, 4.8; M7-T05).
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
          // After the cap only quiescence stays armed (docs/07, 12.4 b).
          const armed =
            capDecisionRef === undefined
              ? withQuiescence
              : withQuiescence.filter((trigger) => trigger.kind === 'quiescence');
          const ready = armed.filter((trigger) => isReady(trigger));
          if (ready.length === 0) {
            return;
          }
          if (capDecisionRef === undefined && overSoftBoundary()) {
            // Layer 1 (docs/07, 12.3): crossing the soft boundary yields
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
          // first-closing-wins fold classifies the losers noop (the
          // race semantics of docs/07 section 5).
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
            // rules (docs/05, 4.2): expired, stale, and archived claims
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
              // wake-render-size (docs/09 metrics): the deterministic
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
    // entry (docs/07, 11.6: termination.init precedes the first
    // scheduling entry); on resume it rebuilds state from the journal.
    if (extension?.boot !== undefined) {
      await extension.boot(io);
    }
    // docs/05 4.1/4.2 (M10-T03): one knowledge read at run admission,
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
      // concrete-model profiles for the profile-evidence section
      // (docs/05, 4.3 as amended), so declarers stay tier-only.
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
        // bytes, never the live store (docs/05, security channel 8).
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
        .some((entry) => entry.kind === 'decision' && entry.key === reserveKey)
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
     * The reserved final wake (docs/07, 12.4 d): a FRESH agent entry on
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
        ...(opts?.model === undefined ? {} : { model: opts.model }),
        [kTerminalTool]: { name: FINISH_TOOL_NAME },
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

    if (capDecisionRef !== undefined) {
      // Resume roll-forward (crash between the cap decision and its
      // effects): the frozen state re-derives from the entry; the main
      // loop is not re-entered.
      return await runForcedFinish();
    }
    const result = await runtime.runInScope(orchestratorState, () =>
      (ctx.agent as (prompt: string, o?: unknown) => Promise<AgentResult<unknown>>)(
        orchestratorPrompt(goal, opts?.maxSpawns, extension?.promptLines?.()),
        agentOpts,
      ),
    );
    if (capDecisionRef !== undefined) {
      // The cap fired while the loop was suspended in a wake; the
      // forced-finish abort ended it (docs/07, 12.4 d).
      return await runForcedFinish();
    }
    if (orchestratorAccount !== undefined) {
      internals.cost.orchestrator.spentUsd =
        internals.budget.accountView(orchestratorAccount)?.spentUsd ?? 0;
    }
    if (result.status !== 'ok') {
      throw new ConfigError(
        `the orchestrator agent terminated with status '${result.status}'` +
          (result.errorMessage === undefined ? '' : `: ${result.errorMessage}`),
      );
    }
    return result.output;
  });
}

/** Top-level surface: creates a run (docs/06 9.3). */
export function orchestrate(
  engine: Engine,
  goal: string,
  opts?: OrchestrateOptions,
): RunHandle<unknown> {
  return engine.run(makeOrchestratorWorkflow(goal, opts), undefined);
}
