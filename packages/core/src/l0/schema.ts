/**
 * SchemaSpec, Out<S> inference, JSON Schema projection, canonical schema
 * derivation, and the schemaHash/toolsetHash functions (M1-T03).
 *
 * Public contracts: https://docs.rulvar.com/guide/tools (SchemaSpec) and
 * https://docs.rulvar.com/guide/journal (hash derivation).
 */
import { createHash } from 'node:crypto';
import type { StandardJSONSchemaV1, StandardSchemaV1 } from '../vendor/standard-schema.js';
import { Validator } from '../vendor/json-schema/index.js';
import { ConfigError, type Issue } from './errors.js';
import type { JsonSchema, ToolContract } from './messages.js';
import { jcsSerialize } from './jcs.js';

export type { StandardJSONSchemaV1, StandardSchemaV1 } from '../vendor/standard-schema.js';

/** Form 2 of SchemaSpec: an explicit JSON Schema plus a runtime type guard. */
export type SchemaPair<T = unknown> = {
  jsonSchema: JsonSchema;
  validate: (value: unknown) => value is T;
};

/**
 * The L0 schema contract with exactly three accepted forms: a Standard
 * Schema (Zod, ArkType, Valibot, ...), a { jsonSchema, validate } pair, or
 * a bare JSON Schema literal.
 */
export type SchemaSpec<T = unknown> = StandardSchemaV1<unknown, T> | SchemaPair<T> | JsonSchema;

/**
 * Inferred output type per form: the Standard Schema output type; the
 * type-guard target of validate(); unknown for a bare JSON Schema.
 */
export type Out<S> = S extends StandardSchemaV1
  ? StandardSchemaV1.InferOutput<S>
  : S extends { validate: (value: unknown) => value is infer T }
    ? T
    : unknown;

/**
 * Form-1 guard: the value implements the Standard Schema interface. Some
 * libraries expose callable schemas (ArkType types are functions), so both
 * object- and function-typed values qualify.
 */
export function isStandardSchemaSpec(spec: SchemaSpec): spec is StandardSchemaV1 {
  return (
    (typeof spec === 'object' || typeof spec === 'function') &&
    spec !== null &&
    '~standard' in spec &&
    typeof (spec as StandardSchemaV1)['~standard'] === 'object'
  );
}

/** Form-2 guard: an explicit { jsonSchema, validate } pair. */
export function isSchemaPairSpec(spec: SchemaSpec): spec is SchemaPair {
  return (
    typeof spec === 'object' &&
    spec !== null &&
    !('~standard' in spec) &&
    'jsonSchema' in spec &&
    typeof (spec as SchemaPair).validate === 'function'
  );
}

/**
 * Derives the JSON Schema of a SchemaSpec. Form 1 projects via the
 * StandardJSONSchemaV1 input() converter, target draft 2020-12 with
 * draft-07 fallback; a library without the projection is a typed
 * ConfigError at definition time, never at first call. Transforming
 * schemas therefore project their INPUT type. Forms 2 and 3 are taken
 * verbatim.
 */
export function projectToJsonSchema(spec: SchemaSpec): JsonSchema {
  if (isStandardSchemaSpec(spec)) {
    const props = spec['~standard'] as Partial<StandardJSONSchemaV1.Props>;
    const converter = props.jsonSchema;
    if (converter === undefined || typeof converter.input !== 'function') {
      throw new ConfigError(
        `Schema library '${props.vendor ?? 'unknown'}' does not implement the ` +
          `StandardJSONSchemaV1 projection ('~standard'.jsonSchema.input); ` +
          `supply a { jsonSchema, validate } pair or a bare JSON Schema instead`,
      );
    }
    try {
      return converter.input({ target: 'draft-2020-12' });
    } catch (draft2020Error) {
      try {
        return converter.input({ target: 'draft-07' });
      } catch {
        throw new ConfigError(
          `Schema library '${props.vendor ?? 'unknown'}' could not project this schema ` +
            `to JSON Schema draft 2020-12 or draft-07`,
          { cause: draft2020Error },
        );
      }
    }
  }
  if (isSchemaPairSpec(spec)) {
    return spec.jsonSchema;
  }
  return spec;
}

/**
 * Annotation-only keywords stripped by canonicalization; `format` is
 * retained because it is validation-relevant in the vendored validator.
 */
const ANNOTATION_KEYWORDS: ReadonlySet<string> = new Set([
  'title',
  'description',
  'default',
  'deprecated',
  'readOnly',
  'writeOnly',
  'examples',
  '$comment',
]);

/** Keywords whose value is a single subschema. */
const SUBSCHEMA_KEYWORDS: ReadonlySet<string> = new Set([
  'additionalProperties',
  'contains',
  'items',
  'not',
  'if',
  'then',
  'else',
  'propertyNames',
  'unevaluatedItems',
  'unevaluatedProperties',
  'contentSchema',
]);

/** Keywords whose value is a map of subschemas. */
const SUBSCHEMA_MAP_KEYWORDS: ReadonlySet<string> = new Set([
  'properties',
  'patternProperties',
  'dependentSchemas',
  '$defs',
  'definitions',
]);

/** Keywords whose value is an array of subschemas. */
const SUBSCHEMA_ARRAY_KEYWORDS: ReadonlySet<string> = new Set([
  'allOf',
  'anyOf',
  'oneOf',
  'prefixItems',
]);

/**
 * Keywords that are pure reference infrastructure: dead weight once every
 * local $ref has been inlined, removed from the canonical form so that a
 * $defs rename or an unused definition never shifts a content key.
 */
const REF_INFRASTRUCTURE_KEYWORDS: ReadonlySet<string> = new Set([
  '$defs',
  'definitions',
  '$anchor',
]);

type SchemaNode = JsonSchema | boolean;

function resolvePointer(root: JsonSchema, pointer: string): unknown {
  let current: unknown = root;
  if (pointer === '') {
    return current;
  }
  for (const rawSegment of pointer.split('/').slice(1)) {
    const segment = rawSegment.replace(/~1/g, '/').replace(/~0/g, '~');
    if (Array.isArray(current)) {
      current = current[Number(segment)];
    } else if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

function findAnchor(node: unknown, anchor: string): JsonSchema | undefined {
  if (typeof node !== 'object' || node === null) {
    return undefined;
  }
  if (Array.isArray(node)) {
    for (const element of node) {
      const found = findAnchor(element, anchor);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }
  const record = node as Record<string, unknown>;
  if (record.$anchor === anchor) {
    return record;
  }
  for (const value of Object.values(record)) {
    const found = findAnchor(value, anchor);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

function canonicalizeNode(node: SchemaNode, root: JsonSchema, refStack: string[]): SchemaNode {
  if (typeof node === 'boolean') {
    return node;
  }

  if ('$dynamicRef' in node || '$dynamicAnchor' in node) {
    throw new ConfigError(
      'Dynamic references ($dynamicRef/$dynamicAnchor) are forbidden in rulvar schemas ' + '',
    );
  }

  const ref = node.$ref;
  if (typeof ref === 'string') {
    if (!ref.startsWith('#')) {
      throw new ConfigError(
        `Remote $ref '${ref}' is forbidden in rulvar schemas; only fragment-only local ` +
          'references resolve',
      );
    }
    if (refStack.includes(ref)) {
      throw new ConfigError(
        `Recursive local $ref '${ref}' cannot be inlined; recursive schemas are not ` +
          'canonicalizable',
      );
    }
    const target = ref.startsWith('#/')
      ? resolvePointer(root, ref.slice(1))
      : ref === '#'
        ? root
        : findAnchor(root, ref.slice(1));
    if (target === undefined || (typeof target !== 'object' && typeof target !== 'boolean')) {
      throw new ConfigError(`Local $ref '${ref}' does not resolve to a schema`);
    }
    refStack.push(ref);
    const inlined = canonicalizeNode(target as SchemaNode, root, refStack);
    refStack.pop();

    const siblings = Object.keys(node).filter(
      (key) =>
        key !== '$ref' && !ANNOTATION_KEYWORDS.has(key) && !REF_INFRASTRUCTURE_KEYWORDS.has(key),
    );
    if (siblings.length === 0) {
      return inlined;
    }
    // Draft 2020-12 applies $ref alongside sibling keywords as one
    // conjunction; the canonical composition is an explicit allOf.
    const siblingNode: JsonSchema = {};
    for (const key of siblings) {
      siblingNode[key] = node[key];
    }
    const canonicalSiblings = canonicalizeNode(siblingNode, root, refStack) as JsonSchema;
    const existingAllOf = Array.isArray(canonicalSiblings.allOf)
      ? (canonicalSiblings.allOf as unknown[])
      : [];
    const rest: JsonSchema = { ...canonicalSiblings };
    delete rest.allOf;
    return { ...rest, allOf: [...existingAllOf, inlined] };
  }

  const out: JsonSchema = {};
  for (const key of Object.keys(node)) {
    if (ANNOTATION_KEYWORDS.has(key) || REF_INFRASTRUCTURE_KEYWORDS.has(key)) {
      continue;
    }
    const value = node[key];
    if (SUBSCHEMA_KEYWORDS.has(key) && (typeof value === 'object' || typeof value === 'boolean')) {
      out[key] = value === null ? value : canonicalizeNode(value as SchemaNode, root, refStack);
    } else if (SUBSCHEMA_MAP_KEYWORDS.has(key) && typeof value === 'object' && value !== null) {
      const map: JsonSchema = {};
      for (const [mapKey, mapValue] of Object.entries(value as Record<string, unknown>)) {
        map[mapKey] =
          typeof mapValue === 'object' || typeof mapValue === 'boolean'
            ? mapValue === null
              ? mapValue
              : canonicalizeNode(mapValue as SchemaNode, root, refStack)
            : mapValue;
      }
      out[key] = map;
    } else if (SUBSCHEMA_ARRAY_KEYWORDS.has(key) && Array.isArray(value)) {
      out[key] = value.map((element: unknown) =>
        typeof element === 'object' || typeof element === 'boolean'
          ? element === null
            ? element
            : canonicalizeNode(element as SchemaNode, root, refStack)
          : element,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Canonical schema derivation: local fragment-only $ref inlined (recursion is
 * a ConfigError), remote and dynamic references forbidden, annotation
 * keywords stripped (format retained), reference infrastructure ($defs,
 * definitions, $anchor) removed once inlined. The result feeds JCS
 * serialization and sha256.
 */
export function canonicalizeSchema(schema: JsonSchema): JsonSchema {
  return canonicalizeNode(schema, schema, []) as JsonSchema;
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * The schemaHash used when no structured-output schema is declared: the
 * hash of the canonical `true` schema.
 */
export const EMPTY_SCHEMA_HASH: string = sha256Hex('true');

/** The toolsetHash of an empty toolset: the hash of the canonical empty contract array. */
export const EMPTY_TOOLSET_HASH: string = sha256Hex('[]');

/**
 * schemaHash = sha256(JCS(canonicalize(schema))). Accepts the derived JSON
 * Schema (or a boolean schema); pass undefined for "no schema declared".
 */
export function schemaHash(schema: JsonSchema | boolean | undefined): string {
  if (schema === undefined) {
    return EMPTY_SCHEMA_HASH;
  }
  const canonical = typeof schema === 'boolean' ? schema : canonicalizeSchema(schema);
  return sha256Hex(jcsSerialize(canonical));
}

/** Derives and hashes a SchemaSpec in one step (identity path for spawns). */
export function schemaHashOfSpec(spec: SchemaSpec | undefined): string {
  if (spec === undefined) {
    return EMPTY_SCHEMA_HASH;
  }
  return schemaHash(projectToJsonSchema(spec));
}

/**
 * toolsetHash = sha256 over the JCS-canonical JSON array of per-tool
 * contract tuples (name, description, canonical parameters, version)
 * sorted by name. Tool description IS part of the contract; schema
 * annotations inside parameters are not. An absent version participates as
 * absent.
 */
export function toolsetHash(contracts: ToolContract[]): string {
  const canonical = [...contracts]
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map((contract) => {
      const tuple: Record<string, unknown> = {
        name: contract.name,
        description: contract.description,
        parameters: canonicalizeSchema(contract.parameters),
      };
      if (contract.version !== undefined) {
        tuple.version = contract.version;
      }
      return tuple;
    });
  return sha256Hex(jcsSerialize(canonical));
}

/** Result of validating a value against a SchemaSpec. */
export type SchemaValidationResult<T = unknown> =
  { valid: true; value: T } | { valid: false; issues: Issue[] };

function pointerToPath(instanceLocation: string): Array<string | number> | undefined {
  const pointer = instanceLocation.startsWith('#') ? instanceLocation.slice(1) : instanceLocation;
  if (pointer === '') {
    return undefined;
  }
  return pointer
    .split('/')
    .slice(1)
    .map((segment) => {
      const decoded = segment.replace(/~1/g, '/').replace(/~0/g, '~');
      return /^(0|[1-9][0-9]*)$/.test(decoded) ? Number(decoded) : decoded;
    });
}

/**
 * Runtime validation per form:
 * form 1 via the Standard Schema's own validate, form 2 via the pair's
 * type guard, form 3 via the vendored draft 2020-12 validator. The same
 * machinery backs the structured-output tiers of the Agent Runtime.
 */
export async function validateSchemaSpec<S extends SchemaSpec>(
  spec: S,
  value: unknown,
): Promise<SchemaValidationResult<Out<S>>> {
  if (isStandardSchemaSpec(spec)) {
    const result = await spec['~standard'].validate(value);
    if (result.issues === undefined || result.issues.length === 0) {
      return { valid: true, value: (result as { value: unknown }).value as Out<S> };
    }
    return {
      valid: false,
      issues: result.issues.map((issue): Issue => {
        const out: Issue = { message: issue.message };
        if (issue.path !== undefined) {
          out.path = issue.path;
        }
        return out;
      }),
    };
  }
  if (isSchemaPairSpec(spec)) {
    if (spec.validate(value)) {
      return { valid: true, value: value as Out<S> };
    }
    return {
      valid: false,
      issues: [{ message: 'value rejected by the schema pair validate() type guard' }],
    };
  }
  const validator = new Validator(spec, '2020-12', false);
  const result = validator.validate(value);
  if (result.valid) {
    return { valid: true, value: value as Out<S> };
  }
  return {
    valid: false,
    issues: result.errors.map((unit): Issue => {
      const issue: Issue = { message: `${unit.error} (at ${unit.instanceLocation})` };
      const path = pointerToPath(unit.instanceLocation);
      if (path !== undefined) {
        issue.path = path;
      }
      return issue;
    }),
  };
}
