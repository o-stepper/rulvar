/**
 * @lurker/planner: lurker flagship hybrid mode: plan agent, compileScript,
 * WorkerSandboxRunner, self-repair loop (docs/02, package map; docs/06,
 * section "Script runners"). The surface lands across M6
 * (docs/10-implementation-plan.md, section 3.7).
 */
export {
  SANDBOX_GLOBALS,
  compileScript,
  scriptDiagnosticsOf,
  type CompileScriptOptions,
  type ScriptDiagnostic,
} from './compile.js';
export { apiCard } from './api-card.js';
export {
  normalizeCassetteEntries,
  runPlannerSelfRepair,
  runSandboxDeterminism,
  SANDBOX_DETERMINISM_RUN_ID,
  SANDBOX_DETERMINISM_SOURCE,
  SELF_REPAIR_BAD_DRAFT,
  SELF_REPAIR_GOOD_DRAFT,
  SELF_REPAIR_GOAL,
  SELF_REPAIR_RUN_ID,
  type M6CassetteFixture,
} from './cassettes.js';
export {
  extractScript,
  lintScript,
  plan,
  planRunIdOf,
  runPlanned,
  type PlanDiagnostic,
  type PlanOptions,
  type PlanResult,
} from './plan.js';
export {
  DEFAULT_SANDBOX_MEMORY_MB,
  DEFAULT_SANDBOX_TIMEOUT_MS,
  WorkerSandboxRunner,
  type WorkerSandboxRunnerOptions,
} from './sandbox-runner.js';
