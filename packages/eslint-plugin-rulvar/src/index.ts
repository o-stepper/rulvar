/**
 * eslint-plugin-rulvar: determinism lint rules with structural JSON
 * diagnostics for the planner self-repair loop (M6-T03).
 *
 * Docs: https://docs.rulvar.com/guide/planner. Lockstep-versioned
 * with the fixed group despite the npm-required unscoped name
 * (https://docs.rulvar.com/reference/versioning). The flat preset `configs.workflows`
 * wires every rule at its intended severity; hosts scope it to their
 * workflow modules.
 */
import type { ESLint, Linter, Rule } from 'eslint';

import { noBareDate, noBareRandom, noFetch, noProcessEnv } from './rules/determinism.js';
import { noCodeGeneration } from './rules/dialect.js';
import { duplicateIdenticalCall, noPromiseAllOverCtx } from './rules/scheduling.js';

export { toJsonDiagnostics, type RulvarLintDiagnostic } from './diagnostics.js';
export { scanDialect, type DialectFinding } from './dialect-scan.js';

export const rules: Record<string, Rule.RuleModule> = {
  'no-bare-date': noBareDate,
  'no-bare-random': noBareRandom,
  'no-fetch': noFetch,
  'no-process-env': noProcessEnv,
  'no-code-generation': noCodeGeneration,
  'no-promise-all-over-ctx': noPromiseAllOverCtx,
  'duplicate-identical-call': duplicateIdenticalCall,
};

const plugin: ESLint.Plugin = {
  meta: { name: 'eslint-plugin-rulvar' },
  rules,
};

/**
 * The flat-config preset for workflow modules: the determinism bans as
 * errors, the duplicate-identical-call advisory as a warning.
 */
export const workflowsConfig: Linter.Config = {
  name: 'rulvar/workflows',
  plugins: { rulvar: plugin },
  rules: {
    'rulvar/no-bare-date': 'error',
    'rulvar/no-bare-random': 'error',
    'rulvar/no-fetch': 'error',
    'rulvar/no-process-env': 'error',
    'rulvar/no-code-generation': 'error',
    'rulvar/no-promise-all-over-ctx': 'error',
    'rulvar/duplicate-identical-call': 'warn',
  },
};

plugin.configs = { workflows: workflowsConfig };

export default plugin;
