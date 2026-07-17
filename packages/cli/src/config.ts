/**
 * CLI configuration convention (shell-owned; the canonical CLI grammar
 * says nothing about engine assembly, and the CLI builds exclusively
 * from the public API):
 *
 * - `rulvar.config.mjs` (or .js) in the working directory default-exports
 *   `{ engineOptions?, workflows? }`: adapters, stores, defaults come
 *   from the HOST's module, so @rulvar/cli itself depends only on
 *   @rulvar/core.
 * - `rulvar run <file>` imports the module at <file>: its default export
 *   (or named `workflow`) is the Workflow; optional named exports
 *   `engineOptions` and `workflows` merge OVER the config file's.
 * - `rulvar run <name>` and `rulvar resume <runId>` resolve names
 *   against the merged workflow registry (config first, file second).
 */
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  ConfigError,
  type CreateEngineOptions,
  type Workflow,
  type WorkflowRegistry,
} from '@rulvar/core';

/** The shape both the config module and a workflow module may export. */
export interface CliConfig {
  engineOptions?: Partial<CreateEngineOptions>;
  workflows?: WorkflowRegistry;
  /** rulvar kb sweep configuration (M11-T05). */
  kbSweep?: KbSweepCliConfig;
}

/**
 * The kb sweep config: a FIXED pool (sweep volume is never authorized
 * by proposal volume) plus the cases per taskClass. Structural sweep
 * shapes only: the CLI's static dependency stays @rulvar/core and
 * @rulvar/evals loads dynamically at command time (the plan-command
 * precedent), so graders and cases are typed by the config module.
 */
export interface KbSweepCliConfig {
  /** The dedicated committer identity recorded on gates and authors. */
  committerId: string;
  /** The fixed pool; falsification UNIONS in the store's negative-claim and re-measure subjects. */
  models: Array<{ model: `${string}:${string}`; effort?: string }>;
  /** Eval cases tagged by taskClass (constructed with @rulvar/evals inside the config module). */
  cases: Array<{ taskClass: string; case: unknown }>;
  thresholds?: { strength?: number; weakness?: number };
  /** Optional canary probes run per pool member BEFORE the sweep; drift flips stale. */
  canary?: { agentType: string; prompts: string[] };
  /** Default: kb-sweep-<observedAt ISO>. */
  reportId?: string;
  /** Per-member engine override; default: engineOptions with loop/extract routed at the member. */
  engineFor?: (member: { model: `${string}:${string}`; effort?: string }) => unknown;
  /**
   * Immutable per-run ceilings and the aggregate debit-only envelope
   * (v1.16.2 review P1-2). A sweep multiplies paid runs: pool members
   * times cases for targets, one judge run per judge-grader call, one
   * canary run per probe per member, and the falsification union can
   * grow the pool past the configured models. Per-run ceilings alone do
   * not bound that product, so maxTotalUsd is the hard aggregate ceiling
   * every target, judge, and canary run authorizes against BEFORE it
   * starts. Required unless allowUnbounded is set: a sweep is never
   * silently unbounded.
   */
  budgets?: {
    /** Immutable ceiling B0 of every eval target run. */
    targetUsd: number;
    /** Immutable ceiling of every judge run. */
    judgeUsd: number;
    /** Immutable ceiling of every canary probe run. */
    canaryUsd: number;
    /** The debit-only envelope over the WHOLE sweep (targets, judges, canary). */
    maxTotalUsd: number;
  };
  /**
   * Explicitly waive the ceilings and run every target, judge, and
   * canary run unbounded (the pre-v1.16.2 behavior). A sweep with
   * neither budgets nor this flag set fails loudly: an unbounded paid
   * matrix is never the silent default.
   */
  allowUnbounded?: boolean;
}

const CONFIG_BASENAMES = ['rulvar.config.mjs', 'rulvar.config.js'];

/**
 * ESM caches by URL for the process lifetime; a CLI process imports each
 * module once, but long-lived hosts (and the e2e suite) re-read edited
 * configs, so the mtime rides the URL.
 */
function moduleUrl(path: string): string {
  return `${pathToFileURL(path).href}?mtime=${statSync(path).mtimeMs}`;
}

interface ConfigModule {
  default?: CliConfig | Workflow<never, unknown>;
  workflow?: Workflow<never, unknown>;
  engineOptions?: Partial<CreateEngineOptions>;
  workflows?: WorkflowRegistry;
}

function isWorkflowValue(value: unknown): value is Workflow<never, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { name?: unknown }).name === 'string' &&
    typeof (value as { body?: unknown }).body === 'function'
  );
}

/** Loads `rulvar.config.mjs`/`.js` from cwd; absent config is fine. */
export async function loadCliConfig(cwd: string): Promise<CliConfig> {
  for (const basename of CONFIG_BASENAMES) {
    const path = resolve(cwd, basename);
    if (!existsSync(path)) {
      continue;
    }
    const mod = (await import(moduleUrl(path))) as ConfigModule;
    const config = mod.default;
    if (config !== undefined && isWorkflowValue(config)) {
      throw new ConfigError(
        `${basename} default-exports a workflow; it must default-export { engineOptions?, workflows? }`,
      );
    }
    return {
      ...(config ?? {}),
      ...(mod.engineOptions === undefined ? {} : { engineOptions: mod.engineOptions }),
      ...(mod.workflows === undefined ? {} : { workflows: mod.workflows }),
    };
  }
  return {};
}

export interface LoadedWorkflowModule {
  workflow?: Workflow<never, unknown>;
  engineOptions?: Partial<CreateEngineOptions>;
  workflows?: WorkflowRegistry;
}

/** Imports a workflow module given on the command line. */
export async function loadWorkflowModule(file: string, cwd: string): Promise<LoadedWorkflowModule> {
  const path = resolve(cwd, file);
  if (!existsSync(path)) {
    throw new ConfigError(`workflow file not found: ${path}`);
  }
  const mod = (await import(moduleUrl(path))) as ConfigModule;
  const candidate = mod.workflow ?? mod.default;
  const loaded: LoadedWorkflowModule = {};
  if (candidate !== undefined && isWorkflowValue(candidate)) {
    loaded.workflow = candidate;
  }
  if (mod.engineOptions !== undefined) {
    loaded.engineOptions = mod.engineOptions;
  }
  if (mod.workflows !== undefined) {
    loaded.workflows = mod.workflows;
  }
  return loaded;
}

/** True when the `run` target names a file rather than a registry entry. */
export function looksLikeFile(target: string): boolean {
  return target.includes('/') || target.includes('\\') || /\.(ts|mts|cts|js|mjs|cjs)$/.test(target);
}
