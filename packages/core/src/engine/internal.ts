/**
 * Package-internal ctx runtime access (M6-T02). NOT exported from the
 * package index: the public seam for runners is createSandboxBridge
 * (src/runner/sandbox-bridge.ts); the mode (c) orchestrator
 * (src/orchestrator, M6-T07) is the other in-package consumer. Shells and
 * orchestration packages never import this module (they build
 * exclusively from the public API).
 */
import type { Ctx, RunInternals } from './ctx.js';

/** Mirror of the private ScopeState travelling through AsyncLocalStorage. */
export interface CtxScopeState {
  scope: string;
  spanId: string;
  phase?: string;
  signal?: AbortSignal;
  budgetScope?: string;
}

export interface CtxRuntime {
  internals: RunInternals;
  /** The current scope state of the calling async context. */
  currentState(): CtxScopeState;
  /** Runs `fn` under `state` exactly as the ctx primitives do. */
  runInScope<T>(state: CtxScopeState, fn: () => Promise<T>): Promise<T>;
}

/** Registered by createCtx; keyed by the ctx object identity. */
export const ctxRuntimes: WeakMap<Ctx<never>, CtxRuntime> = new WeakMap();

/**
 * Internal AgentOpts channel (M6-T07): agentImpl reports the agent
 * dispatch seq (the spawn handle) through this symbol-keyed callback on
 * the running append, on a dangling redispatch, AND on the replay
 * branch, so the orchestrator learns handles that are stable across
 * resume. Never part of the public AgentOpts surface.
 */
export const kOnRunning: unique symbol = Symbol('rulvar.onRunning');

/**
 * Internal AgentOpts channel (M6-T07): names the terminal tool whose
 * accepted call ends the loop with status ok (the orchestrator finish
 * tool), plus the optional host validation hook over the accepted call
 * (the RV-204 finish validators). Never part of the public AgentOpts
 * surface.
 */
export const kTerminalTool: unique symbol = Symbol('rulvar.terminalTool');

/**
 * Internal AgentOpts channel (M7-T08): a transcript checkpoint ref the
 * fresh dispatch boots from (park/unpark continuation and the DEF-5
 * graft boot). Dangling redispatch checkpoints take precedence.
 */
export const kBootCheckpoint: unique symbol = Symbol('rulvar.bootCheckpoint');

/**
 * Internal AgentOpts channel: marks the orchestrator forced-finish
 * dispatch, whose spend draws from the released finalize reserve
 * (DEF-7). Settlement stamps the flag into the terminal's cost
 * attribution so the journal fold reproduces reserveUsedUsd.
 */
export const kFinalizeReserve: unique symbol = Symbol('rulvar.finalizeReserve');

/**
 * Internal AgentOpts channel (RV1902): marks an orchestrate-owned root
 * dispatch (the coordination loop, the synthesis invocation, the
 * forced-finish wake) as one that WAITS OUT a transient in-flight
 * exposure refusal instead of settling a budget error. The four-role
 * benchmark's recovery arm died exactly there: the refusal is transient
 * by contract (budgets guide), but the refused agent was the workflow's
 * coordinating root, so its settle tore down the whole run while four
 * admitted children were still finalizing. The 'child' flavor (RV2002)
 * rides on orchestrator-spawned children (spawn_agent and
 * parallel_agents): the same park-and-retry, but a DRAINED refusal
 * (no live holder left to wait out) dies as the typed cheap
 * 'exposure-drained' child refusal the orchestrator can tell apart
 * from a crash and re-spawn, instead of the root's forced-finish
 * partial; the third parity rerun killed three mid-research workers
 * on exactly this path. Never part of the public AgentOpts surface;
 * plain agents keep the documented settle-as-budget-error behavior,
 * because their caller can catch and decide.
 */
export const kExposureWait: unique symbol = Symbol('rulvar.exposureWait');

export interface InternalAgentHooks {
  [kOnRunning]?: (seq: number) => void;
  [kTerminalTool]?: {
    name: string;
    validate?: (call: {
      id: string;
      result: unknown;
      /** The full schema-validated argument object (RV808b): sectional resubmissions ride beside result. */
      args?: unknown;
    }) => Promise<
      | {
          ok: true;
          /** Overrides the finished value (RV808b): a sectional splice resolves to the full document. */
          resolved?: { result: unknown };
        }
      | { ok: false; feedback: Record<string, unknown> }
    >;
    /**
     * Max EXTRA turns the loop may grant past limits.maxTurns, one per
     * rejected terminal-tool exchange (schema-invalid arguments or a
     * host validation rejection); see FinishValidationSpec.repairTurnReserve.
     */
    repairTurnReserve?: number;
  };
  [kBootCheckpoint]?: string;
  [kFinalizeReserve]?: boolean;
  [kExposureWait]?: boolean | 'child';
}

/** Typed accessor used by the in-package consumers. */
export function runtimeOf(ctx: Ctx<never>): CtxRuntime {
  const runtime = ctxRuntimes.get(ctx);
  if (runtime === undefined) {
    throw new Error(
      'ctx runtime missing: the ctx value was not created by createCtx (engine run context)',
    );
  }
  return runtime;
}
