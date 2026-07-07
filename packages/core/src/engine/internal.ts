/**
 * Package-internal ctx runtime access (M6-T02). NOT exported from the
 * package index: the public seam for runners is createSandboxBridge
 * (src/runner/sandbox-bridge.ts, docs/06 8.2); the mode (c) orchestrator
 * (src/orchestrator, M6-T07) is the other in-package consumer. Shells and
 * orchestration packages never import this module (docs/02, section
 * "Dependency rules": they build exclusively from the public API).
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
