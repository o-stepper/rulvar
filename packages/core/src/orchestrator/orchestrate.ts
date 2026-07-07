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
import type { ModelSpec } from '../l0/messages.js';
import { agentScope } from '../journal/scope.js';
import type { AgentResult } from '../runtime/agent-loop.js';
import type { UsageLimits } from '../runtime/usage-limits.js';
import { profileCard } from '../model/profile-card.js';
import {
  kOnRunning,
  kTerminalTool,
  runtimeOf,
  type CtxScopeState,
  type InternalAgentHooks,
} from '../engine/internal.js';
import { ROOT_ACCOUNT } from '../engine/budget.js';
import type { AgentOpts, AgentProfile, Workflow } from '../engine/ctx.js';
import { defineWorkflow } from '../engine/ctx.js';
import type { Engine } from '../engine/engine.js';
import type { RunHandle } from '../engine/run-handle.js';
import type { AdmissionDecision } from './admission.js';
import {
  digestOf,
  type OrchestratorRuntime,
  type SpawnAdmissionValue,
  type SpawnRecord,
  type TaskDigest,
} from './handles.js';
import { buildOrchestratorTools, FINISH_TOOL_NAME, type SpawnAgentParams } from './spawn-tools.js';

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
  /** UsageLimits of the orchestrator agent itself (maxTurns etc.). */
  limits?: UsageLimits;
}

export const ORCHESTRATE_WORKFLOW_NAME = 'lurker-orchestrate';

function orchestratorPrompt(goal: string, maxSpawns: number | undefined): string {
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
  ].join('\n');
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
    const cardText = profileCard(filterProfiles(internals.defaults.profiles, opts?.profiles));

    // The orchestrator's own sub-account (docs/06 5.5). M6 wires the
    // account and its layer-2/3 enforcement when a cap resolves; the
    // reserve decision entries and the at-cap freeze are M7 (DEF-7).
    let orchestratorAccount: string | undefined;
    if (opts?.budget !== undefined) {
      const runCeiling = internals.budget.accountView(
        callingState.budgetScope ?? ROOT_ACCOUNT,
      )?.ceilingUsd;
      const fraction = opts.budget.capFraction ?? 0.2;
      const fromFraction = runCeiling === undefined ? undefined : fraction * runCeiling;
      const bounds = [opts.budget.capUsd, fromFraction].filter(
        (bound): bound is number => bound !== undefined,
      );
      if (bounds.length > 0) {
        orchestratorAccount =
          callingState.scope === '' ? 'orchestrator' : `${callingState.scope}/orchestrator`;
        internals.budget.openAccount(orchestratorAccount, {
          parentScope: callingState.budgetScope ?? ROOT_ACCOUNT,
          ceilingUsd: Math.min(...bounds),
        });
      }
    }

    const records = new Map<number, SpawnRecord>();
    const byOrdinal = new Map<number, SpawnRecord>();
    const rejectedByOrdinal = new Map<number, AdmissionDecision>();
    let nextOrdinal = 0;
    let orchSeq: number | undefined;
    let releaseRecovery: () => void = () => undefined;
    const recoveryDone = new Promise<void>((resolve) => {
      releaseRecovery = resolve;
    });

    const childScopeOf = (): string => {
      if (orchSeq === undefined) {
        throw new ConfigError('orchestrator dispatch seq unknown before the loop started');
      }
      return agentScope(callingState.scope, orchSeq);
    };

    const dispatchChild = async (
      spec: SpawnAgentParams,
      spawnOrdinal: number,
      identity: { nodeId: string; logicalTaskId: string },
    ): Promise<SpawnRecord> => {
      const controller = new AbortController();
      const upstream = callingState.signal ?? internals.runSignal;
      const childState: CtxScopeState = {
        scope: childScopeOf(),
        spanId: internals.spans.mint(callingState.spanId),
        signal:
          upstream === undefined
            ? controller.signal
            : AbortSignal.any([upstream, controller.signal]),
      };
      if (callingState.budgetScope !== undefined) {
        childState.budgetScope = callingState.budgetScope;
      }
      let resolveHandle: (seq: number) => void = () => undefined;
      const handlePromise = new Promise<number>((resolve) => {
        resolveHandle = resolve;
      });
      const agentOpts: AgentOpts & InternalAgentHooks & { result: 'full' } = {
        agentType: spec.agentType,
        result: 'full',
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
      // record with a synthesized error result.
      const settledResult: Promise<AgentResult<unknown>> = result.catch(
        (thrown: unknown): AgentResult<unknown> => ({
          status: 'error',
          output: null,
          usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
          costUsd: 0,
          turns: 0,
          servedBy: 'unknown:unknown',
          transcriptRef: '',
          errorMessage: thrown instanceof Error ? thrown.message : String(thrown),
        }),
      );
      const handle = await handlePromise;
      const record: SpawnRecord = {
        handle,
        spawnOrdinal,
        nodeId: identity.nodeId,
        logicalTaskId: identity.logicalTaskId,
        result: settledResult,
        abort: () => {
          controller.abort('lurker:cancel_agent');
        },
      };
      void settledResult.then((settled) => {
        record.settled = settled;
      });
      records.set(handle, record);
      byOrdinal.set(spawnOrdinal, record);
      return record;
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
    };

    const orchestratorRuntime: OrchestratorRuntime = {
      async spawn(params: SpawnAgentParams): Promise<{ handle: number }> {
        await recoveryDone;
        if (params.outputSchemaRef !== undefined || params.toolsetRef !== undefined) {
          throw new ConfigError(
            'outputSchemaRef and toolsetRef resolve against registries that land in M7 ' +
              '(docs/07, 4.2 M6 note); omit them for now',
          );
        }
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
              : { lineage: { continues: params.lineage.continues } }),
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
      async cancel(
        handle: number,
        _reason?: string,
      ): Promise<{ cancelled: boolean; handle: number }> {
        await recoveryDone;
        const record = records.get(handle);
        if (record === undefined) {
          throw new ConfigError(`cancel_agent: unknown handle ${String(handle)}`);
        }
        if (record.settled !== undefined) {
          return { cancelled: false, handle };
        }
        // Caller intent (docs/07 4.5, M6 note): the child terminal
        // journals 'cancelled' and reruns on a later resume unless
        // covered by abandon; the abandon compilation activates with
        // PlanRunner cancel_task in M7.
        record.abort();
        await record.result;
        return { cancelled: true, handle };
      },
    };

    const tools = buildOrchestratorTools(orchestratorRuntime, cardText);
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
    const result = await runtime.runInScope(orchestratorState, () =>
      (ctx.agent as (prompt: string, o?: unknown) => Promise<AgentResult<unknown>>)(
        orchestratorPrompt(goal, opts?.maxSpawns),
        agentOpts,
      ),
    );
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
