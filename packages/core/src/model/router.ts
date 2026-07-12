/**
 * Model router core (M1-T05): the per-engine adapter registry, ModelRef
 * parsing, the per-invocation resolution chain, canonicalization into
 * CanonicalModelSpec, and caps scrubbing with visible scrub notes.
 *
 * Public contract: https://docs.rulvar.com/guide/model-routing.
 */
import { ConfigError } from '../l0/errors.js';
import { checkFloors, type QualityFloors } from './floors.js';
import type {
  CanonicalLadderSpec,
  CanonicalModelSpec,
  Effort,
  Gate,
  InvocationRole,
  LadderSpec,
  ModelChoice,
  ModelRef,
  ModelSpec,
  TriggerClass,
} from '../l0/messages.js';
import type { ModelCaps, ProviderAdapter } from '../l0/spi/provider.js';

/**
 * Per-engine adapter registry: strictly per engine, no global mutable
 * registry exists. A duplicate adapterId is a typed ConfigError.
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
 * Role effort defaults: orchestrate and plan default to high; summarize and extract
 * default to low. loop and finalize have NO role default: when the chain
 * resolves nothing, the wire omits effort and identity records the spec
 * with the effort member absent.
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
  /** Identity-facing canonical form. */
  canonical: CanonicalModelSpec;
  scrubs: ScrubNote[];
}

interface MergedFields {
  model?: ModelRef;
  effort?: Effort;
  providerOptions?: Record<string, Record<string, unknown>>;
  fallbacks?: ModelRef[];
  /** A declared ladder travelling the chain. */
  ladder?: LadderSpec;
}

function contribution(spec: ModelSpec | undefined, _role: InvocationRole): MergedFields {
  if (spec === undefined) {
    return {};
  }
  if (typeof spec === 'string') {
    return { model: spec };
  }
  if ('ladder' in spec) {
    // Ladders resolve through the existing chain like any ModelSpec:
    // a higher layer's concrete model shadows a
    // lower ladder and vice versa; a ladder that WINS wire resolution is
    // rejected below (rung attempts always carry a concrete override).
    return { ladder: spec.ladder };
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
  // the explicit effort field beats a ModelChoice-carried effort.
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
 * invocation role attached as a tag.
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
    // A model and a ladder are mutually exclusive winners: whichever the
    // HIGHER layer contributes shadows the other.
    if (fields.ladder !== undefined) {
      delete merged.model;
    } else if (fields.model !== undefined) {
      delete merged.ladder;
    }
  }

  if (merged.ladder !== undefined) {
    throw new ConfigError(
      `a ladder ModelSpec wins wire resolution for role '${role}': ladder execution is ` +
        'owned by the PlanRunner ladder driver, which resolves each rung attempt to a ' +
        'concrete model override (docs/07, section 10); dispatch laddered profiles ' +
        'through orchestratePlanned or pass a plain ModelRef or ModelChoice',
    );
  }
  if (merged.model === undefined) {
    throw new ConfigError(
      `no model resolves for role '${role}': set AgentOpts.model, a profile model, ` +
        'or engine defaults.routing',
    );
  }

  // Quality floors are enforced AT resolution, before any live call,
  // for every invocation the chain produces: primaries, failover
  // fallbacks, and the summarize fallback alike.
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

/** The closed trigger vocabulary guard. */
const TRIGGER_CLASSES: readonly TriggerClass[] = [
  'error',
  'limit',
  'schema-exhausted',
  'verify-failed',
  'no-progress',
];

function validateGate(gate: Gate, rungCount: number, index: number): void {
  if (gate.kind === 'mechanical') {
    if (typeof gate.profile !== 'string' || gate.profile === '') {
      throw new ConfigError(
        `ladder acceptance gate ${String(index)}: a mechanical gate names a registered ` +
          'gate profile (docs/04, section 12)',
      );
    }
    return;
  }
  if (gate.kind === 'judge') {
    if (typeof gate.rung === 'number') {
      if (!Number.isInteger(gate.rung) || gate.rung < 0 || gate.rung >= rungCount) {
        // FR-119: a ladder spec with an undeclared judge rung is a
        // ConfigError; no cross-adapter quality ordering exists, so the
        // ordering constraint is replaced by declaration.
        throw new ConfigError(
          `ladder acceptance gate ${String(index)}: judge rung ${String(gate.rung)} is not ` +
            `a declared rung of a ${String(rungCount)}-rung ladder (FR-119)`,
        );
      }
      return;
    }
    // An explicitly named override must at least parse as a ModelRef.
    parseModelRef(gate.rung);
    return;
  }
  if (!(gate.fraction > 0 && gate.fraction <= 1)) {
    throw new ConfigError(
      `ladder acceptance gate ${String(index)}: a spot-check fraction lies in (0, 1], ` +
        `got ${String(gate.fraction)}`,
    );
  }
}

/**
 * Canonicalizes a declared LadderSpec: validates the
 * shape once (FR-119 judge declaration included) and resolves every rung's
 * effort to an explicit value. `chainEffort` is the effort the resolution
 * chain would contribute at the declaring layer; a rung that resolves no
 * effort at all is a ConfigError (the canonical form has no absent-effort
 * member by declaration).
 */
export function canonicalizeLadder(
  spec: LadderSpec,
  options?: { chainEffort?: Effort },
): CanonicalLadderSpec {
  if (!Array.isArray(spec.rungs) || spec.rungs.length === 0) {
    throw new ConfigError('a ladder declares at least one rung (docs/04, section 12)');
  }
  if (
    !Number.isInteger(spec.startTier) ||
    spec.startTier < 0 ||
    spec.startTier >= spec.rungs.length
  ) {
    throw new ConfigError(
      `ladder startTier ${String(spec.startTier)} is not a declared rung index of a ` +
        `${String(spec.rungs.length)}-rung ladder`,
    );
  }
  for (const trigger of spec.escalateOn) {
    if (!TRIGGER_CLASSES.includes(trigger)) {
      throw new ConfigError(
        `unknown ladder trigger '${String(trigger)}': the vocabulary is closed to ` +
          `${TRIGGER_CLASSES.join(', ')} (docs/04, section 12)`,
      );
    }
  }
  const rungs = spec.rungs.map((rung, index) => {
    parseModelRef(rung.model);
    if (!Number.isInteger(rung.maxTurns) || rung.maxTurns <= 0) {
      throw new ConfigError(`ladder rung ${String(index)}: maxTurns is a positive integer`);
    }
    if (!Number.isInteger(rung.maxTokens) || rung.maxTokens <= 0) {
      throw new ConfigError(`ladder rung ${String(index)}: maxTokens is a positive integer`);
    }
    if (rung.maxCostUsd !== undefined && !(rung.maxCostUsd > 0)) {
      throw new ConfigError(`ladder rung ${String(index)}: maxCostUsd is positive when present`);
    }
    const effort = rung.effort ?? options?.chainEffort;
    if (effort === undefined) {
      throw new ConfigError(
        `ladder rung ${String(index)} resolves no effort: the canonical ladder embeds ` +
          'explicit efforts (docs/04, section 8.2); declare rung.effort or a chain effort',
      );
    }
    return {
      model: rung.model,
      effort,
      maxTurns: rung.maxTurns,
      maxTokens: rung.maxTokens,
      ...(rung.maxCostUsd === undefined ? {} : { maxCostUsd: rung.maxCostUsd }),
      ...(rung.memoizeOutcome === undefined ? {} : { memoizeOutcome: rung.memoizeOutcome }),
    };
  });
  for (const [index, gate] of (spec.acceptance ?? []).entries()) {
    validateGate(gate, spec.rungs.length, index);
  }
  return {
    rungs,
    startTier: spec.startTier,
    escalateOn: [...spec.escalateOn],
    ...(spec.acceptance === undefined ? {} : { acceptance: spec.acceptance.map((gate) => gate) }),
  };
}

/**
 * The concrete ModelChoice of one rung attempt: each attempt is an
 * ordinary agent scope whose CanonicalModelSpec is that rung's
 * `{ kind: 'model' }` form.
 */
export function ladderRungChoice(ladder: CanonicalLadderSpec, index: number): ModelChoice {
  const rung = ladder.rungs[index];
  if (rung === undefined) {
    throw new ConfigError(
      `rung ${String(index)} is not declared on a ${String(ladder.rungs.length)}-rung ladder`,
    );
  }
  return { model: rung.model, effort: rung.effort };
}
