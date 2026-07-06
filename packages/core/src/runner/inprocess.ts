/**
 * ScriptRunner SPI and InProcessRunner (M1-T11).
 *
 * Owning spec: docs/06-execution-spec.md, section "Script runners".
 * Workflow (a closure value) runs in process only; CompiledWorkflow is the
 * only form admissible to the worker sandbox and first exists at M6
 * (compileScript in @lurker/planner), so until then the engine accepts
 * only in-process Workflow values. The SPI's L0 listing in docs/02 refers
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

/** Escalation hook shape; consumed from M3 (docs/06, section 2.10). */
export type OnEscalation = (report: unknown) => unknown;

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
          'worker sandbox (@lurker/planner, M6)',
      );
    }
    const devMode = process.env.NODE_ENV !== 'production';
    let restore: (() => void) | undefined;
    if (devMode) {
      const priorNow = Date.now;
      const priorRandom = Math.random;
      let warnedNow = false;
      let warnedRandom = false;
      Date.now = function lurkerPatchedDateNow(): number {
        if (!warnedNow) {
          warnedNow = true;
          process.emitWarning(
            'bare Date.now() called inside a lurker run; use ctx.now() so the value is ' +
              'journaled and stable on replay',
            { code: 'LURKER_BARE_DATE_NOW', type: 'LurkerWarning' },
          );
        }
        return priorNow();
      };
      Math.random = function lurkerPatchedMathRandom(): number {
        if (!warnedRandom) {
          warnedRandom = true;
          process.emitWarning(
            'bare Math.random() called inside a lurker run; use ctx.random() so the value is ' +
              'journaled and stable on replay',
            { code: 'LURKER_BARE_MATH_RANDOM', type: 'LurkerWarning' },
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
