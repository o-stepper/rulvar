/**
 * ModelCaps consumption helpers (M1-T05): structured-output tier selection
 * and the strict-compatibility predicate the native tier depends on.
 *
 * Full contract: https://docs.rulvar.com/guide/adapter-authors.
 */
import type { JsonSchema } from '../l0/messages.js';
import type { ModelCaps } from '../l0/spi/provider.js';

export type StructuredOutputTier = 'native' | 'forced-tool' | 'prompt';

const TIER_ORDER: Record<StructuredOutputTier, number> = {
  native: 2,
  'forced-tool': 1,
  prompt: 0,
};

/**
 * Strict-schema compatibility as both first-class providers define it:
 * every object node declares `additionalProperties: false` and lists every
 * property in `required`. Boolean schemas and
 * non-object shapes are trivially compatible.
 */
export function isStrictCompatibleSchema(schema: JsonSchema | boolean): boolean {
  if (typeof schema === 'boolean') {
    return true;
  }
  const isObjectNode =
    schema.type === 'object' ||
    schema.properties !== undefined ||
    schema.additionalProperties !== undefined;
  if (isObjectNode) {
    if (schema.additionalProperties !== false) {
      return false;
    }
    const properties =
      typeof schema.properties === 'object' && schema.properties !== null
        ? (schema.properties as Record<string, unknown>)
        : {};
    const required = Array.isArray(schema.required) ? (schema.required as unknown[]) : [];
    for (const name of Object.keys(properties)) {
      if (!required.includes(name)) {
        return false;
      }
    }
    for (const value of Object.values(properties)) {
      if ((typeof value === 'object' && value !== null) || typeof value === 'boolean') {
        if (!isStrictCompatibleSchema(value as JsonSchema | boolean)) {
          return false;
        }
      }
    }
  }
  for (const key of ['items', 'additionalProperties', 'contains'] as const) {
    const value = schema[key];
    if ((typeof value === 'object' && value !== null) || typeof value === 'boolean') {
      if (!isStrictCompatibleSchema(value as JsonSchema | boolean)) {
        return false;
      }
    }
  }
  for (const key of ['allOf', 'anyOf', 'oneOf', 'prefixItems'] as const) {
    const value = schema[key];
    if (Array.isArray(value)) {
      for (const element of value) {
        if ((typeof element === 'object' && element !== null) || typeof element === 'boolean') {
          if (!isStrictCompatibleSchema(element as JsonSchema | boolean)) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

/**
 * Tier selection: the model's declared ceiling
 * bounds the tier; the native tier additionally requires a
 * strict-compatible canonical schema (relying on silent server-side
 * fallback is forbidden), degrading to forced-tool.
 * Prefill is not a tier.
 */
export function selectStructuredOutputTier(
  caps: ModelCaps,
  canonicalSchema: JsonSchema,
): StructuredOutputTier {
  const ceiling = caps.structuredOutput;
  if (ceiling === 'native' && !isStrictCompatibleSchema(canonicalSchema)) {
    return 'forced-tool';
  }
  return ceiling;
}

/** True when `tier` is at or below the model's declared ceiling. */
export function tierWithinCaps(tier: StructuredOutputTier, caps: ModelCaps): boolean {
  return TIER_ORDER[tier] <= TIER_ORDER[caps.structuredOutput];
}
