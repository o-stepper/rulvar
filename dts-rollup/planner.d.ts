import { CompiledWorkflow, ScriptRejected } from "@lurker/core";

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
export { type CompileScriptOptions, SANDBOX_GLOBALS, type ScriptDiagnostic, compileScript, scriptDiagnosticsOf };