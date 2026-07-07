import { CompiledWorkflow, Ctx, Engine, Json, ModelSpec, RunHandle, ScriptRejected, ScriptRunner } from "@lurker/core";

//#region src/compile.d.ts
/**
* The exact curated sandbox global set, in docs order (docs/06, 8.2).
* The worker binds the ctx methods as bare globals under these names and
* the API card teaches exactly this list.
*/
declare const SANDBOX_GLOBALS: readonly string[];
/** One machine-readable compileScript diagnostic (docs/02, ScriptRejected row). */
interface ScriptDiagnostic {
  ruleId: string;
  message: string;
  line?: number;
  column?: number;
}
interface CompileScriptOptions {
  /** Dynamic-import specifiers permitted in the source; default [] (none). */
  allowImports?: string[];
}
/**
* Validates and compiles planner-generated source into a CompiledWorkflow
* (docs/06, 8.3). The source is an async function body over the sandbox
* globals; its `return` value is the workflow result. The compiled form is
* pure data (the source is evaluated only inside the worker sandbox);
* machine scripts run under errorPolicy 'lenient' (docs/06, Appendix A).
*/
declare function compileScript(source: string, o?: CompileScriptOptions): CompiledWorkflow;
/** Typed accessor for the diagnostics carried on a ScriptRejected. */
declare function scriptDiagnosticsOf(error: ScriptRejected): ScriptDiagnostic[];
//#endregion
//#region src/api-card.d.ts
/** Renders the sandbox-dialect API card; pure and byte-stable. */
declare function apiCard(): string;
//#endregion
//#region src/plan.d.ts
/** One repair-loop diagnostic: lint and compile findings share the shape. */
interface PlanDiagnostic {
  ruleId: string;
  message: string;
  line?: number;
  column?: number;
  severity: "error" | "warning";
}
interface PlanOptions {
  /** The planner model; otherwise the chain resolves role 'plan'. */
  model?: ModelSpec;
  /** Registered profile names to advertise; default: every profile. */
  profiles?: string[];
  /** Self-repair rounds from JSON diagnostics; default 3 (Appendix A). */
  repairRounds?: number;
}
interface PlanResult {
  source: string;
  workflow: CompiledWorkflow;
  /** Diagnostics of the ACCEPTED draft: advisories only, never errors. */
  lint: PlanDiagnostic[];
}
/** The deterministic planner runId: one goal, one journal (docs/06, 9.2). */
declare function planRunIdOf(goal: string): string;
/**
* The model may fence the script; the extractor takes the first fenced
* block when one exists, else the whole reply, and is deterministic.
*/
declare function extractScript(reply: string): string;
/**
* Lints a script BODY with the workflows preset plus compileScript.
* The body is wrapped in an async function for parsing (top-level
* return/await are legal in the dialect); reported lines shift back so
* they index into the body source.
*/
declare function lintScript(source: string): {
  diagnostics: PlanDiagnostic[];
  errors: PlanDiagnostic[];
  workflow?: CompiledWorkflow;
};
declare function plan(engine: Engine, goal: string, o?: PlanOptions): Promise<PlanResult>;
/**
* plan-then-run in one call (docs/06, section 9; amended during M6-T05:
* the composition is async because planning itself is a run).
*/
declare function runPlanned(engine: Engine, goal: string, args?: Json): Promise<RunHandle<unknown>>;
//#endregion
//#region src/sandbox-runner.d.ts
declare const DEFAULT_SANDBOX_TIMEOUT_MS = 3e5;
declare const DEFAULT_SANDBOX_MEMORY_MB = 512;
interface WorkerSandboxRunnerOptions {
  /** Wall-clock ceiling for one execution; default 300000 (Appendix A). */
  timeoutMs?: number;
  /** Worker old-generation heap ceiling; default 512 (Appendix A). */
  memoryMb?: number;
  /**
  * The worker entry module; defaults to the built sandbox-worker.js next
  * to this module. Tests running from source point at the built dist.
  */
  workerUrl?: URL;
}
/** Accepts CompiledWorkflow ONLY: feeding a closure is a type error (docs/06, 8). */
declare class WorkerSandboxRunner implements ScriptRunner {
  private readonly timeoutMs;
  private readonly memoryMb;
  private readonly workerUrl;
  constructor(options?: WorkerSandboxRunnerOptions);
  execute<A, R>(wf: CompiledWorkflow, ctx: Ctx<never>, args: A): Promise<R>;
}
//#endregion
export { type CompileScriptOptions, DEFAULT_SANDBOX_MEMORY_MB, DEFAULT_SANDBOX_TIMEOUT_MS, type PlanDiagnostic, type PlanOptions, type PlanResult, SANDBOX_GLOBALS, type ScriptDiagnostic, WorkerSandboxRunner, type WorkerSandboxRunnerOptions, apiCard, compileScript, extractScript, lintScript, plan, planRunIdOf, runPlanned, scriptDiagnosticsOf };