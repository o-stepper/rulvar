/**
 * Engine assembly for CLI commands: the host's config supplies adapters
 * and defaults (the CLI depends only on @rulvar/core);
 * --store selects the JsonlFileStore directory (default `.rulvar`),
 * and an explicit stores entry in engineOptions wins over it.
 */
import { resolve } from 'node:path';

import {
  createEngine,
  JsonlFileStore,
  parseModelRef,
  priceUsdOf,
  resolvePricing,
  runProfile,
  type CreateEngineOptions,
  type Effort,
  type Engine,
  type InvocationRole,
  type JournalStore,
  type ModelRef,
  type ModelSpec,
  type ProviderAdapter,
  type RunProfile,
  type Usage,
  type WorkflowRegistry,
} from '@rulvar/core';

import { compilePermissionPreset, ConfigError } from '@rulvar/core';

import type { CliConfig, LoadedWorkflowModule } from './config.js';

export const DEFAULT_STORE_DIR = '.rulvar';

export interface AssembledCli {
  engine: Engine;
  store: JournalStore;
  workflows: WorkflowRegistry;
  /** The journal-fold price function (table wins over caps). */
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined;
}

export function assembleEngine(options: {
  config: CliConfig;
  module?: LoadedWorkflowModule;
  storePath?: string;
  profile?: string;
  cwd: string;
}): AssembledCli {
  const { config, module } = options;
  let engineOptions: Partial<CreateEngineOptions> = {
    ...config.engineOptions,
    ...module?.engineOptions,
  };
  // A RunProfile is pure data applied UNDER the host's own options: the
  // host always wins, and the engine sees only ordinary options
  // afterward (M5-T07).
  if (options.profile !== undefined) {
    const profile = runProfile(options.profile);
    if (profile === undefined) {
      throw new ConfigError(
        `unknown run profile '${options.profile}'; shipped: fast, standard, deep, ultra`,
      );
    }
    engineOptions = applyRunProfile(profile, engineOptions);
  }
  const store: JournalStore =
    engineOptions.stores?.journal ??
    new JsonlFileStore({ dir: resolve(options.cwd, options.storePath ?? DEFAULT_STORE_DIR) });
  const workflows: WorkflowRegistry = {
    ...config.workflows,
    ...module?.workflows,
  };
  const adapters: ProviderAdapter[] = engineOptions.adapters ?? [];
  const engine = createEngine({
    adapters,
    ...engineOptions,
    stores: { ...engineOptions.stores, journal: store },
    defaults: { ...engineOptions.defaults, workflows },
  });
  const byId = new Map(adapters.map((adapter) => [adapter.id, adapter]));
  const priceUsd = (servedBy: ModelRef, usage: Usage): number | undefined => {
    const { adapterId, model } = parseModelRef(servedBy);
    const pricing = resolvePricing(
      servedBy,
      engineOptions.pricing,
      byId.get(adapterId)?.caps(model).pricing,
    );
    return pricing === undefined ? undefined : priceUsdOf(pricing, usage);
  };
  return { engine, store, workflows, priceUsd };
}

/**
 * Merges a RunProfile UNDER host engineOptions (host wins). Effort hints
 * seed per-role defaults on routing entries that carry none; concurrency
 * and budget defaults fill unset slots; the permission preset applies to
 * the engine-wide chain when the host set none.
 */
export function applyRunProfile(
  profile: RunProfile,
  host: Partial<CreateEngineOptions>,
): Partial<CreateEngineOptions> {
  const merged: Partial<CreateEngineOptions> = { ...host };
  if (profile.perRunConcurrency !== undefined) {
    merged.concurrency = { perRun: profile.perRunConcurrency, ...host.concurrency };
  }
  if (profile.lifetimeSpawnCap !== undefined || profile.maxDepth !== undefined) {
    merged.budgetDefaults = {
      ...(profile.lifetimeSpawnCap === undefined
        ? {}
        : { lifetimeSpawnCap: profile.lifetimeSpawnCap }),
      ...(profile.maxDepth === undefined ? {} : { maxDepth: profile.maxDepth }),
      ...host.budgetDefaults,
    };
  }
  if (profile.permissionPreset !== undefined && host.defaults?.permissions === undefined) {
    // The preset compiles into the engine-wide deny/ask layers as data:
    // the engine config carries no `preset`
    // field, so the profile emits the compiled rules directly.
    const compiled = compilePermissionPreset(profile.permissionPreset);
    merged.defaults = { ...merged.defaults, permissions: compiled };
  }
  if (profile.effortByRole !== undefined && merged.defaults?.routing !== undefined) {
    // Effort hints seed routing entries that carry none; an explicit
    // host effort always wins, and a role the host does not route stays
    // unrouted (profiles carry no model names by construction).
    const routing: Partial<Record<InvocationRole, ModelSpec>> = { ...merged.defaults.routing };
    let seeded = false;
    for (const [role, effort] of Object.entries(profile.effortByRole) as [
      InvocationRole,
      Effort,
    ][]) {
      const entry = routing[role];
      if (entry === undefined) {
        continue;
      }
      if (typeof entry === 'string') {
        routing[role] = { model: entry, effort };
        seeded = true;
      } else if ('model' in entry && entry.effort === undefined) {
        // Ladder specs stay untouched: every rung carries its own effort.
        routing[role] = { ...entry, effort };
        seeded = true;
      }
    }
    if (seeded) {
      merged.defaults = { ...merged.defaults, routing };
    }
  }
  return merged;
}
