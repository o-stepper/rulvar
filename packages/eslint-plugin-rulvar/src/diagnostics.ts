/**
 * Structural JSON diagnostics (M6-T03; docs/06, section 8.4): the
 * machine-readable projection of ESLint lint messages consumed by the
 * mode (b) self-repair loop (@rulvar/planner). The shape matches
 * ScriptDiagnostic from compileScript structurally, so one repair prompt
 * renders both sources.
 */
import type { Linter } from 'eslint';

export interface RulvarLintDiagnostic {
  ruleId: string;
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  endLine?: number;
  endColumn?: number;
}

export function toJsonDiagnostics(messages: readonly Linter.LintMessage[]): RulvarLintDiagnostic[] {
  return messages.map((message) => {
    const diagnostic: RulvarLintDiagnostic = {
      ruleId: message.ruleId ?? 'parse',
      message: message.message,
      line: message.line,
      column: message.column,
      severity: message.severity === 2 ? 'error' : 'warning',
    };
    if (message.endLine !== undefined) {
      diagnostic.endLine = message.endLine;
    }
    if (message.endColumn !== undefined) {
      diagnostic.endColumn = message.endColumn;
    }
    return diagnostic;
  });
}
