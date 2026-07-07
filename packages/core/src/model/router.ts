/**
 * Model router core (M1-T05): the per-engine adapter registry, ModelRef
 * parsing, the per-invocation resolution chain, canonicalization into
 * CanonicalModelSpec, and caps scrubbing with visible scrub notes.
 *
 * Owning spec: docs/04-model-layer-spec.md, sections "Router and
 * resolution chain", "Canonical effort", and "Caps scrubbing and
 * structured-output tier selection".
 */
import { ConfigError } from '../l0/errors.js';
import { checkFloors, type QualityFloors } from './floors.js';
import type {
  CanonicalModelSpec,
  Effort,
  InvocationRole,
  ModelChoice,
  ModelRef,
  ModelSpec,
} from '../l0/messages.js';
import type { ModelCaps, ProviderAdapter } from '../l0/spi/provider.js';

/**
 * Per-engine adapter registry: strictly per engine, no global mutable
 * registry exists. A duplicate adapterId is a typed ConfigError
 * (docs/04, section "Registry and ModelRef").
 */
export function buildAdapterRegistry(
  adapters: ProviderAdapter[],
): ReadonlyMap<string, ProviderAdapter> {
  const registry = new Map<string, ProviderAdapter>();
  for (const adapter of adapters) {
    if (registry.has(adapter.id)) {
      throw new ConfigError(`duplicate adapterId '${adapter.id}' at createEngine`);
    }
    registry.set(adapter.id, adapter);
  }
  return registry;
}

/**
 * ModelRef is strictly 'adapterId:model', no query parameters. The wire
 * model id may itself contain colons (for example ollama tags), so only
 * the FIRST colon splits.
 */
export function parseModelRef(ref: ModelRef): { adapterId: string; model: string } {
  const colon = ref.indexOf(':');
  if (colon <= 0 || colon === ref.length - 1) {
    throw new ConfigError(`invalid ModelRef '${ref}': expected the strict 'adapterId:model' form`);
  }
  return { adapterId: ref.slice(0, colon), model: ref.slice(colon + 1) };
}

/**
 * Role effort defaults (docs/04, section "Invocation roles and firing
 * protocol"): orchestrate and plan default to high; summarize and extract
 * default to low. loop and finalize have NO role default: when the chain
 * resolves nothing, the wire omits effort and identity records the spec
 * with the effort member absent (docs/04, section "Router and resolution
 * chain", as amended).
 */
export const ROLE_EFFORT_DEFAULTS: Partial<Record<InvocationRole, Effort>> = {
  orchestrate: 'high',
  plan: 'high',
  summarize: 'low',
  extract: 'low',
};

/** One layer's contribution to the resolution merge. */
export interface ResolutionLayer {
  /** Applies to all roles at once (AgentOpts.model / profile.model). */
  model?: ModelSpec;
  /** Per-role override; wins over `model` within the same layer. */
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  /** Explicit effort field; wins over a ModelChoice-carried effort within the layer. */
  effort?: Effort;
}

/** A scrub performed by the router; surfaced as a warning-level event by the engine. */
export interface ScrubNote {
  scrubbed: 'effort' | 'sampling';
  model: ModelRef;
  detail: string;
}

/** The resolved, scrubbed result of one invocation's resolution. */
export interface ResolvedInvocation {
  ref: ModelRef;
  adapterId: string;
  /** Wire model id: the segment after 'adapterId:'. */
  model: string;
  /** Effort to SEND (post-scrub); absent when unresolved or scrubbed. */
  wireEffort?: Effort;
  /** Effort REQUESTED (pre-scrub); this one enters identity. */
  requestedEffort?: Effort;
  providerOptions?: Record<string, Record<string, unknown>>;
  fallbacks?: ModelRef[];
  /** Identity-facing canonical form (docs/04, section "Router and resolution chain"). */
  canonical: CanonicalModelSpec;
  scrubs: ScrubNote[];
}

interface MergedFields {
  model?: ModelRef;
  effort?: Effort;
  providerOptions?: Record<string, Record<string, unknown>>;
  fallbacks?: ModelRef[];
}

function contribution(spec: ModelSpec | undefined, role: InvocationRole): MergedFields {
  if (spec === undefined) {
    return {};
  }
  if (typeof spec === 'string') {
    return { model: spec };
  }
  if ('ladder' in spec) {
    throw new ConfigError(
      `a ladder ModelSpec was resolved for role '${role}', but ModelLadder execution lands ` +
        'with @lurker/plan in M7 (docs/10); use a plain ModelRef or ModelChoice',
    );
  }
  const choice: ModelChoice = spec;
  const fields: MergedFields = { model: choice.model };
  if (choice.effort !== undefined) {
    fields.effort = choice.effort;
  }
  if (choice.providerOptions !== undefined) {
    fields.providerOptions = choice.providerOptions;
  }
  if (choice.fallbacks !== undefined) {
    fields.fallbacks = choice.fallbacks;
  }
  return fields;
}

function layerFields(layer: ResolutionLayer | undefined, role: InvocationRole): MergedFields {
  if (layer === undefined) {
    return {};
  }
  const fromModel = contribution(layer.model, role);
  const fromRouting = contribution(layer.routing?.[role], role);
  // Within one layer the per-role routing beats the all-roles model, and
  // the explicit effort field beats a ModelChoice-carried effort
  // (docs/04, section "Router and resolution chain").
  const merged: MergedFields = { ...fromModel, ...pruneUndefined(fromRouting) };
  if (layer.effort !== undefined) {
    merged.effort = layer.effort;
  }
  return merged;
}

function pruneUndefined<T extends object>(value: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, member] of Object.entries(value)) {
    if (member !== undefined) {
      (out as Record<string, unknown>)[key] = member;
    }
  }
  return out;
}

function mergeProviderOptions(
  lower: Record<string, Record<string, unknown>> | undefined,
  higher: Record<string, Record<string, unknown>> | undefined,
): Record<string, Record<string, unknown>> | undefined {
  if (lower === undefined) {
    return higher;
  }
  if (higher === undefined) {
    return lower;
  }
  const merged: Record<string, Record<string, unknown>> = { ...lower };
  for (const [namespace, options] of Object.entries(higher)) {
    merged[namespace] = { ...merged[namespace], ...options };
  }
  return merged;
}

/** Sampling parameters both first-class providers reject on reasoning models. */
const SAMPLING_KEYS = ['temperature', 'top_p', 'top_k'] as const;

/**
 * Resolution runs on every model invocation, not once per agent: a layered
 * merge of { model, effort, providerOptions, fallbacks } in the order call
 * override > agent profile > workflow defaults > engine defaults, with the
 * invocation role attached as a tag (docs/04, section "Resolution chain").
 * After resolution the router reads ModelCaps and scrubs illegal
 * parameters visibly: unsupported effort is removed from the wire but
 * kept in identity; sampling params rejected by the model are removed
 * from the adapter's namespace, never silently sent.
 */
export function resolveModelInvocation(options: {
  role: InvocationRole;
  call?: ResolutionLayer;
  profile?: ResolutionLayer;
  workflow?: ResolutionLayer;
  engine?: ResolutionLayer;
  capsOf: (ref: ModelRef) => ModelCaps;
  /** Hard router constraints; violation is a typed ConfigError (M4-T09). */
  floors?: QualityFloors;
  /** Profile-declared task class; absent = unclassified, byRole only. */
  taskClass?: string;
}): ResolvedInvocation {
  const { role } = options;
  // Merge from lowest to highest priority; higher layers override per field.
  const layers = [options.engine, options.workflow, options.profile, options.call];
  let merged: MergedFields = {};
  for (const layer of layers) {
    const fields = layerFields(layer, role);
    merged = {
      ...merged,
      ...pruneUndefined(fields),
      providerOptions: mergeProviderOptions(merged.providerOptions, fields.providerOptions),
    };
  }

  if (merged.model === undefined) {
    throw new ConfigError(
      `no model resolves for role '${role}': set AgentOpts.model, a profile model, ` +
        'or engine defaults.routing',
    );
  }

  // Quality floors are enforced AT resolution, before any live call,
  // for every invocation the chain produces: primaries, failover
  // fallbacks, and the summarize fallback alike (docs/04, section 9).
  checkFloors({
    ref: merged.model,
    role,
    ...(options.floors === undefined ? {} : { floors: options.floors }),
    ...(options.taskClass === undefined ? {} : { taskClass: options.taskClass }),
  });

  const requestedEffort = merged.effort ?? ROLE_EFFORT_DEFAULTS[role];
  const { adapterId, model } = parseModelRef(merged.model);
  const caps = options.capsOf(merged.model);
  const scrubs: ScrubNote[] = [];

  let wireEffort = requestedEffort;
  if (wireEffort !== undefined && !caps.reasoningEfforts.includes(wireEffort)) {
    scrubs.push({
      scrubbed: 'effort',
      model: merged.model,
      detail:
        `effort '${wireEffort}' is not in caps.reasoningEfforts for ${merged.model}; ` +
        'the request proceeds without it (identity keeps the requested effort)',
    });
    wireEffort = undefined;
  }

  let providerOptions = merged.providerOptions;
  if (providerOptions?.[adapterId] !== undefined && !caps.supportsTemperature) {
    const namespace = { ...providerOptions[adapterId] };
    const removed = SAMPLING_KEYS.filter((key) => key in namespace);
    if (removed.length > 0) {
      for (const key of removed) {
        delete namespace[key];
      }
      providerOptions = { ...providerOptions, [adapterId]: namespace };
      scrubs.push({
        scrubbed: 'sampling',
        model: merged.model,
        detail:
          `sampling parameter(s) ${removed.join(', ')} removed for ${merged.model}: ` +
          'the model rejects them (caps.supportsTemperature is false); never silently sent',
      });
    }
  }

  const canonical: CanonicalModelSpec =
    requestedEffort === undefined
      ? { kind: 'model', model: merged.model }
      : { kind: 'model', model: merged.model, effort: requestedEffort };

  const resolved: ResolvedInvocation = {
    ref: merged.model,
    adapterId,
    model,
    canonical,
    scrubs,
  };
  if (wireEffort !== undefined) {
    resolved.wireEffort = wireEffort;
  }
  if (requestedEffort !== undefined) {
    resolved.requestedEffort = requestedEffort;
  }
  if (providerOptions !== undefined) {
    resolved.providerOptions = providerOptions;
  }
  if (merged.fallbacks !== undefined) {
    resolved.fallbacks = merged.fallbacks;
  }
  return resolved;
}
