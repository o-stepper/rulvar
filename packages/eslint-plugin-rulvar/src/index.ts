/**
 * eslint-plugin-rulvar: determinism lint rules with structural JSON
 * diagnostics for the planner self-repair loop (M6-T03).
 *
 * Owning spec: docs/06-execution-spec.md, section 8.4. Lockstep-versioned
 * with the fixed group despite the npm-required unscoped name
 * (docs/12, section "Exemptions"). The flat preset `configs.workflows`
 * wires every rule at its intended severity; hosts scope it to their
 * workflow modules.
 */
import type { ESLint, Linter, Rule } from 'eslint';

import { noBareDate, noBareRandom, noFetch, noProcessEnv } from './rules/determinism.js';
import { duplicateIdenticalCall, noPromiseAllOverCtx } from './rules/scheduling.js';

export { toJsonDiagnostics, type RulvarLintDiagnostic } from './diagnostics.js';

export const rules: Record<string, Rule.RuleModule> = {
  'no-bare-date': noBareDate,
  'no-bare-random': noBareRandom,
  'no-fetch': noFetch,
  'no-process-env': noProcessEnv,
  'no-promise-all-over-ctx': noPromiseAllOverCtx,
  'duplicate-identical-call': duplicateIdenticalCall,
};

const plugin: ESLint.Plugin = {
  meta: { name: 'eslint-plugin-rulvar' },
  rules,
};

/**
 * The flat-config preset for workflow modules: the determinism bans as
 * errors, the duplicate-identical-call advisory as a warning (docs/06,
 * 8.4).
 */
export const workflowsConfig: Linter.Config = {
  name: 'rulvar/workflows',
  plugins: { rulvar: plugin },
  rules: {
    'rulvar/no-bare-date': 'error',
    'rulvar/no-bare-random': 'error',
    'rulvar/no-fetch': 'error',
    'rulvar/no-process-env': 'error',
    'rulvar/no-promise-all-over-ctx': 'error',
    'rulvar/duplicate-identical-call': 'warn',
  },
};

plugin.configs = { workflows: workflowsConfig };

export default plugin;
