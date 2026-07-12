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
 * The mode (a) runner for human-authored closures. Determinism is enforced
 * by convention, lint, and the ctx shims, NOT by a VM: only the sequence
 * of keys must be stable. Dev mode (NODE_ENV !== 'production') patches
 * Date.now and Math.random for the duration of execute to emit one warning
 * per run pointing at ctx.now()/ctx.random(); the patch preserves behavior
 * and restores the prior functions on exit (nesting-safe by capturing the
 * prior value; concurrent runs may lose the warning, never correctness).
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
    const devMode = process.env.NODE_ENV !== 'production';
    let restore: (() => void) | undefined;
    if (devMode) {
      const priorNow = Date.now;
      const priorRandom = Math.random;
      let warnedNow = false;
      let warnedRandom = false;
      Date.now = function rulvarPatchedDateNow(): number {
        if (!warnedNow) {
          warnedNow = true;
          process.emitWarning(
            'bare Date.now() called inside a rulvar run; use ctx.now() so the value is ' +
              'journaled and stable on replay',
            { code: 'RULVAR_BARE_DATE_NOW', type: 'RulvarWarning' },
          );
        }
        return priorNow();
      };
      Math.random = function rulvarPatchedMathRandom(): number {
        if (!warnedRandom) {
          warnedRandom = true;
          process.emitWarning(
            'bare Math.random() called inside a rulvar run; use ctx.random() so the value is ' +
              'journaled and stable on replay',
            { code: 'RULVAR_BARE_MATH_RANDOM', type: 'RulvarWarning' },
          );
        }
        return priorRandom();
      };
      restore = () => {
        Date.now = priorNow;
        Math.random = priorRandom;
      };
    }
    try {
      return await wf.body(ctx, args);
    } finally {
      restore?.();
    }
  }
}
