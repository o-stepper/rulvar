/**
 * RunProfile presets as DATA (M5-T07). A RunProfile
 * is a bundle of role routing hints, effort, concurrency, budget,
 * permission preset, and spawn limits: a starting point a host applies
 * to createEngine options plus per-run options. Presets are NEVER engine
 * semantics; the engine has no strategy enums (EXC registry). Applying a
 * profile is a pure data merge (host values win); the engine sees only
 * ordinary options afterward.
 *
 * The shipped presets carry NO named models (named strong defaults live
 * only in the umbrella): routing here is by effort
 * and role shape, and hosts supply the actual model refs.
 */
import type { Effort, InvocationRole } from '../l0/messages.js';
import type { PermissionPreset } from '../tools/presets.js';

export interface RunProfile {
  /** Per-role canonical effort hints (the model refs come from the host). */
  effortByRole?: Partial<Record<InvocationRole, Effort>>;
  /** Per-run concurrency width (createEngine concurrency.perRun). */
  perRunConcurrency?: number;
  /** Default run budget ceiling in USD, when the host does not set one. */
  budgetUsd?: number;
  /** Permission preset applied to the engine-wide chain. */
  permissionPreset?: PermissionPreset;
  /** Engine lifetime spawn cap (budgetDefaults.lifetimeSpawnCap). */
  lifetimeSpawnCap?: number;
  /** Nesting depth ceiling (budgetDefaults.maxDepth). */
  maxDepth?: number;
}

/**
 * The shipped presets (fast / standard / deep / ultra "and similar").
 * Data only; a review-time assertion checks the
 * engine has zero behavioral branches keyed on these names.
 */
export const RUN_PROFILES: Record<string, RunProfile> = {
  fast: {
    effortByRole: { orchestrate: 'low', plan: 'low', summarize: 'low', extract: 'low' },
    perRunConcurrency: 16,
    permissionPreset: 'standard',
    lifetimeSpawnCap: 64,
    maxDepth: 1,
  },
  standard: {
    effortByRole: { orchestrate: 'high', plan: 'high', summarize: 'low', extract: 'low' },
    perRunConcurrency: 12,
    permissionPreset: 'standard',
    lifetimeSpawnCap: 500,
    maxDepth: 1,
  },
  deep: {
    effortByRole: { orchestrate: 'high', plan: 'high', summarize: 'medium', extract: 'medium' },
    perRunConcurrency: 8,
    permissionPreset: 'standard',
    lifetimeSpawnCap: 500,
    maxDepth: 2,
  },
  ultra: {
    effortByRole: { orchestrate: 'max', plan: 'max', summarize: 'high', extract: 'high' },
    perRunConcurrency: 8,
    permissionPreset: 'strict',
    lifetimeSpawnCap: 500,
    maxDepth: 3,
  },
};

/** Looks up a shipped RunProfile by name; undefined for unknown names. */
export function runProfile(name: string): RunProfile | undefined {
  return RUN_PROFILES[name];
}
