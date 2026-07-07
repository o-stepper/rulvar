/**
 * Engine assembly for CLI commands: the host's config supplies adapters
 * and defaults (the CLI depends only on @lurker/core, docs/02 section
 * 4); --store selects the JsonlFileStore directory (default `.lurker`),
 * and an explicit stores entry in engineOptions wins over it.
 */
import { resolve } from 'node:path';

import {
  createEngine,
  JsonlFileStore,
  parseModelRef,
  priceUsdOf,
  resolvePricing,
  type CreateEngineOptions,
  type Engine,
  type JournalStore,
  type ModelRef,
  type ProviderAdapter,
  type Usage,
  type WorkflowRegistry,
} from '@lurker/core';

import type { CliConfig, LoadedWorkflowModule } from './config.js';

export const DEFAULT_STORE_DIR = '.lurker';

export interface AssembledCli {
  engine: Engine;
  store: JournalStore;
  workflows: WorkflowRegistry;
  /** The journal-fold price function (table wins over caps; docs/04, section 10). */
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined;
}

export function assembleEngine(options: {
  config: CliConfig;
  module?: LoadedWorkflowModule;
  storePath?: string;
  cwd: string;
}): AssembledCli {
  const { config, module } = options;
  const engineOptions: Partial<CreateEngineOptions> = {
    ...config.engineOptions,
    ...module?.engineOptions,
  };
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
