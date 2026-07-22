import { ESLint, Linter, Rule } from "eslint";

//#region src/diagnostics.d.ts
interface RulvarLintDiagnostic {
  ruleId: string;
  message: string;
  line: number;
  column: number;
  severity: "error" | "warning";
  endLine?: number;
  endColumn?: number;
}
declare function toJsonDiagnostics(messages: readonly Linter.LintMessage[]): RulvarLintDiagnostic[];
//#endregion
//#region src/dialect-scan.d.ts
/** Where a finding sits in the ORIGINAL source (line and column counted from 1). */
interface DialectFinding {
  kind: "eval" | "function-constructor" | "constructor-access";
  line: number;
  column: number;
}
/**
* Structural scan for compileScript: every dynamic code generation form the
* dialect rejects, as findings positioned in the original source. Covers bare
* `eval`/`Function` calls and `new`, `globalThis.eval`/`globalThis.Function`,
* and every constructor reconstruction form the shared predicates recognize.
* Member access on other objects (`response.eval`, `parser.Function`) and a
* property NAMED constructor in an object LITERAL are not code generation and
* are left alone.
*
* Takes a parsed ESTree Program, typed `unknown` so a caller needs neither the
* estree types nor a specific parser in its own public surface; any ESTree
* compatible parser (espree in the lint pass, acorn in compileScript) works.
*/
declare function scanDialect(program: unknown): DialectFinding[];
//#endregion
//#region src/index.d.ts
declare const rules: Record<string, Rule.RuleModule>;
declare const plugin: ESLint.Plugin;
/**
* The flat-config preset for workflow modules: the determinism bans as
* errors, the duplicate-identical-call advisory as a warning.
*/
declare const workflowsConfig: Linter.Config;
//#endregion
export { type DialectFinding, type RulvarLintDiagnostic, plugin as default, rules, scanDialect, toJsonDiagnostics, workflowsConfig };