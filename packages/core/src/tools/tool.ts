/**
 * tool() definition (M3-T01): typed tool definitions over SchemaSpec with
 * definition-time validation. The identity projection of a ToolDef is its
 * ToolContract (name, description, canonical parameters, version): exactly
 * what the model sees and exactly what toolsetHash hashes; execute and
 * every other non-contract field are excluded by construction. Editing an
 * execute body never invalidates a journal; changing semantics is
 * signaled by bumping version.
 *
 * Owning spec: docs/08-tools-permissions-spec.md, sections "Tool
 * definition and toolsetHash" and "SchemaSpec".
 */
import { ConfigError } from '../l0/errors.js';
import type { JsonSchema, ToolContract } from '../l0/messages.js';
import type { Out, SchemaSpec } from '../l0/schema.js';
import { canonicalizeSchema, projectToJsonSchema } from '../l0/schema.js';
import type { ToolContext, ToolDef, ToolExecutor, ToolRisk } from '../l0/spi/toolsource.js';

/** First-party provider tool-name constraint intersection (docs/08, section 1.1). */
export const TOOL_NAME_PATTERN: RegExp = /^[a-zA-Z0-9_-]{1,64}$/;

export interface ToolInit<S extends SchemaSpec> {
  name: string;
  description: string;
  parameters: S;
  /** Contract version, part of toolsetHash (docs/08, section 1.2). */
  version?: string;
  /** Default 'inprocess' (docs/08, section "Executors"). */
  executor?: ToolExecutor;
  /** Default false (docs/08, section "Terminal default"). */
  needsApproval?: boolean;
  /** Policy metadata; never identity (docs/08, section "ToolRisk"). */
  risk?: ToolRisk;
  execute: (input: Out<S>, ctx: ToolContext) => Promise<unknown>;
}

/**
 * Defines a tool. Definition-time failures are typed ConfigErrors, never
 * first-call surprises: an illegal name, a Standard Schema without the
 * JSON Schema projection, a recursive local $ref, or a remote/dynamic
 * reference all fail here (docs/08, sections 1.1 and 2.3).
 */
export function tool<S extends SchemaSpec>(init: ToolInit<S>): ToolDef<S> {
  if (!TOOL_NAME_PATTERN.test(init.name)) {
    throw new ConfigError(
      `tool name '${init.name}' must match ^[a-zA-Z0-9_-]{1,64}$ ` +
        '(docs/08, section "tool() definition and ToolDef")',
    );
  }
  // Derive and canonicalize NOW so schema problems surface at definition
  // time; the result is recomputed by toolContract (pure and cheap; no
  // module-level caches, docs/02 "Dependency rules").
  canonicalizeSchema(projectToJsonSchema(init.parameters));
  const def: ToolDef<S> = {
    kind: 'tool',
    name: init.name,
    description: init.description,
    parameters: init.parameters,
    executor: init.executor ?? 'inprocess',
    needsApproval: init.needsApproval ?? false,
    ...(init.version === undefined ? {} : { version: init.version }),
    ...(init.risk === undefined ? {} : { risk: init.risk }),
    execute: init.execute,
  };
  return def;
}

/**
 * The identity projection: the contract tuple that enters toolsetHash.
 * parameters is the canonicalized derived JSON Schema (docs/03, section
 * "schemaHash and toolsetHash derivation").
 */
export function toolContract(def: ToolDef): ToolContract {
  const parameters: JsonSchema = canonicalizeSchema(projectToJsonSchema(def.parameters));
  const contract: ToolContract = {
    name: def.name,
    description: def.description,
    parameters,
  };
  if (def.version !== undefined) {
    contract.version = def.version;
  }
  return contract;
}
