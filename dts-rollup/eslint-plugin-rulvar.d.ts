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
//#region src/index.d.ts
declare const rules: Record<string, Rule.RuleModule>;
declare const plugin: ESLint.Plugin;
/**
* The flat-config preset for workflow modules: the determinism bans as
* errors, the duplicate-identical-call advisory as a warning (docs/06,
* 8.4).
*/
declare const workflowsConfig: Linter.Config;
//#endregion
export { type RulvarLintDiagnostic, plugin as default, rules, toJsonDiagnostics, workflowsConfig };