import { CompiledWorkflow, Ctx, ScriptRejected, ScriptRunner } from "@lurker/core";

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
export { type CompileScriptOptions, DEFAULT_SANDBOX_MEMORY_MB, DEFAULT_SANDBOX_TIMEOUT_MS, SANDBOX_GLOBALS, type ScriptDiagnostic, WorkerSandboxRunner, type WorkerSandboxRunnerOptions, apiCard, compileScript, scriptDiagnosticsOf };