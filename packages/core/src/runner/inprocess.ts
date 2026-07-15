/**
 * ScriptRunner SPI and InProcessRunner (M1-T11).
 *
 * Script runner contract: https://docs.rulvar.com/guide/planner
 * Workflow (a closure value) runs in process only; CompiledWorkflow is the
 * only form admissible to the worker sandbox and first exists at M6
 * (compileScript in @rulvar/planner), so until then the engine accepts
 * only in-process Workflow values. The SPI's L0 listing refers
 * to its frozen-seam status; the declaration lives here with its types.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

import type { Ctx, ErrorPolicy, Workflow } from '../engine/ctx.js';

/**
 * Source-backed workflow admissible to the worker sandbox; produced by
 * compileScript (M6). Declared now so the ScriptRunner seam is shaped
 * once; feeding a closure to the sandbox stays impossible by types.
 */
export interface CompiledWorkflow {
  readonly kind: 'compiled-workflow';
  readonly name: string;
  readonly source: string;
  readonly errorPolicy: ErrorPolicy;
}

export interface ScriptRunner {
  execute<A, R>(wf: Workflow<A, R> | CompiledWorkflow, ctx: Ctx<never>, args: A): Promise<R>;
}

import type { EscalatedResult } from '../runtime/agent-loop.js';
import type { EscalationDecision } from '../runtime/escalation.js';

/** Escalation hook: decides for value-form calls. */
export type OnEscalation = (
  result: EscalatedResult<unknown>,
) => EscalationDecision | Promise<EscalationDecision>;

/**
 * Dev-mode bare-nondeterminism detection state, one per execute, carried
 * by the workflow body's ASYNC CONTEXT rather than a global window. Host
 * code, engine code awaiting the result, and concurrent runs never see a
 * store and stay silent; each run warns at most once per global.
 */
interface DetectionState {
  warnedNow: boolean;
  warnedRandom: boolean;
}

const detection = new AsyncLocalStorage<DetectionState>();
let globalsPatched = false;

/**
 * Stack line 0 names the Error, line 1 this helper, line 2 the patched
 * global, line 3 the caller whose provenance decides. Library code (a
 * provider SDK, any installed dependency, rulvar's own published dist)
 * lives under node_modules and is exempt: the guard exists for workflow
 * code, which imports from node_modules but does not live there.
 */
function libraryCaller(): boolean {
  const caller = new Error().stack?.split('\n')[3];
  return caller !== undefined && caller.includes('node_modules');
}

/**
 * Patches Date.now and Math.random ONCE per process and never restores:
 * outside a workflow's async context the store is absent and the patch is
 * a transparent passthrough. The previous per-execute patch/restore pair
 * could race under concurrent runs (one run's restore removed another's
 * patch, and the second restore re-installed a stale patched function
 * PERMANENTLY, which could then warn on host code outside any run: the
 * false RULVAR_BARE_DATE_NOW class the 1.5.2 review reproduced).
 */
function patchGlobalsOnce(): void {
  if (globalsPatched) {
    return;
  }
  globalsPatched = true;
  const priorNow = Date.now;
  const priorRandom = Math.random;
  Date.now = function rulvarPatchedDateNow(): number {
    const state = detection.getStore();
    if (state !== undefined && !state.warnedNow && !libraryCaller()) {
      state.warnedNow = true;
      process.emitWarning(
        'bare Date.now() called inside a rulvar run; use ctx.now() so the value is ' +
          'journaled and stable on replay',
        { code: 'RULVAR_BARE_DATE_NOW', type: 'RulvarWarning' },
      );
    }
    return priorNow();
  };
  Math.random = function rulvarPatchedMathRandom(): number {
    const state = detection.getStore();
    if (state !== undefined && !state.warnedRandom && !libraryCaller()) {
      state.warnedRandom = true;
      process.emitWarning(
        'bare Math.random() called inside a rulvar run; use ctx.random() so the value is ' +
          'journaled and stable on replay',
        { code: 'RULVAR_BARE_MATH_RANDOM', type: 'RulvarWarning' },
      );
    }
    return priorRandom();
  };
}

/**
 * The mode (a) runner for human-authored closures. Determinism is enforced
 * by convention, lint, and the ctx shims, NOT by a VM: only the sequence
 * of keys must be stable. Dev mode (NODE_ENV !== 'production') detects
 * bare Date.now and Math.random and emits one warning per run pointing at
 * ctx.now()/ctx.random(). Detection is attributed by AsyncLocalStorage:
 * only code inside the workflow body's async context can trigger it, so
 * host code running concurrently, engine internals outside the body, and
 * other runs never produce a false warning, and nothing is ever restored,
 * so concurrent executes cannot race the patch state.
 */
export class InProcessRunner implements ScriptRunner {
  private readonly onEscalation?: OnEscalation;

  constructor(o?: { onEscalation?: OnEscalation }) {
    if (o?.onEscalation !== undefined) {
      this.onEscalation = o.onEscalation;
    }
  }

  /** The hook is read by the escalation delivery path from M3 onward. */
  get escalationHook(): OnEscalation | undefined {
    return this.onEscalation;
  }

  async execute<A, R>(wf: Workflow<A, R> | CompiledWorkflow, ctx: Ctx<never>, args: A): Promise<R> {
    if (wf.kind !== 'workflow') {
      // Typed guard for the JS boundary; the type split already prevents this in TS.
      throw new TypeError(
        'InProcessRunner executes closure Workflow values only; CompiledWorkflow runs in the ' +
          'worker sandbox (@rulvar/planner, M6)',
      );
    }
    if (process.env.NODE_ENV !== 'production') {
      patchGlobalsOnce();
      return detection.run({ warnedNow: false, warnedRandom: false }, () => wf.body(ctx, args));
    }
    return await wf.body(ctx, args);
  }
}
