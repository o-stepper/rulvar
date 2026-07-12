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
 * tool). Never part of the public AgentOpts surface.
 */
export const kTerminalTool: unique symbol = Symbol('rulvar.terminalTool');

/**
 * Internal AgentOpts channel (M7-T08): a transcript checkpoint ref the
 * fresh dispatch boots from (park/unpark continuation and the DEF-5
 * graft boot). Dangling redispatch checkpoints take precedence.
 */
export const kBootCheckpoint: unique symbol = Symbol('rulvar.bootCheckpoint');

export interface InternalAgentHooks {
  [kOnRunning]?: (seq: number) => void;
  [kTerminalTool]?: { name: string };
  [kBootCheckpoint]?: string;
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
