/**
 * Content-addressed entry identity (M1-T04): IdentityInput records per
 * spawn kind and content-key derivation, sha256 over RFC 8785 JCS
 * canonical JSON. Frozen as part of the hashVersion 2 profile in M2.
 *
 * Owning spec: docs/03-journal-spec.md, section "Identity model" (DEF-6
 * framing). Excluded from every content key: cosmetics (label, phase),
 * handling policy (onError, retry, replay), policy fields
 * (memoizeOutcome), lineage blocks, and spanId.
 */
import { createHash } from 'node:crypto';
import type { Json } from '../l0/json.js';
import type { CanonicalModelSpec, Effort, ModelRef } from '../l0/messages.js';
import type { IsolationSpec } from '../l0/spi/isolation.js';
import { jcsSerialize } from '../l0/jcs.js';

/** Spawn entries: ctx.agent and orchestrator spawn tools (kind 'agent'). */
export interface AgentIdentityInput {
  kind: 'agent';
  agentType: string;
  /**
   * The REQUESTED model spec, including canonical effort where resolved;
   * for laddered spawns it embeds the declared ladder together with
   * startTier (docs/04, section "Router and resolution chain").
   */
  modelSpec: CanonicalModelSpec;
  /** Replaced verbatim by opts.key when opts.key is set. */
  prompt: string;
  schemaHash: string;
  toolsetHash: string;
  /** Canonical encoding per docs/08, section "IsolationSpec". */
  isolation: IsolationSpec;
}

/** Nested workflow spawns: ctx.workflow (kind 'child'). */
export interface ChildIdentityInput {
  kind: 'child';
  /** Registered workflow name. */
  workflow: string;
  /** Canonical JSON of the arguments; opts.key, when set, replaces args. */
  args: Json;
}

/** Journaled effectful steps: ctx.step (kind 'step'). */
export interface StepIdentityInput {
  kind: 'step';
  /** opts.key when set, otherwise the step label. */
  key: string;
  /** Declared dependency values (useMemo-style keying). */
  deps: Json[];
}

/** External inputs: ctx.awaitExternal (kind 'external'). */
export interface ExternalIdentityInput {
  kind: 'external';
  key: string;
}

/** Tool-approval suspensions (kind 'approval'). */
export interface ApprovalIdentityInput {
  kind: 'approval';
  toolName: string;
  /** The tool input as submitted to the permission chain. */
  input: Json;
}

/** Deterministic shims: ctx.now / ctx.random / ctx.uuid (kind 'rand'). */
export interface RandIdentityInput {
  kind: 'rand';
  subtype: 'now' | 'random' | 'uuid';
  /** ctx.random(key) provides a stable alternative to positional binding. */
  key?: string;
}

export type IdentityInput =
  | AgentIdentityInput
  | ChildIdentityInput
  | StepIdentityInput
  | ExternalIdentityInput
  | ApprovalIdentityInput
  | RandIdentityInput;

/**
 * The identity projection of a CanonicalModelSpec. For the plain-model
 * kind the projection is `{ model, effort? }` WITHOUT the kind
 * discriminant, exactly as fixed by the docs/03 section 1.5 worked
 * example; `effort` is omitted when unresolved. The ladder embedding lands
 * with ladder execution (M7).
 */
export function modelSpecIdentity(
  spec: CanonicalModelSpec,
): { model: ModelRef; effort?: Effort } | { ladder: Json } {
  if (spec.kind === 'model') {
    return spec.effort === undefined
      ? { model: spec.model }
      : { model: spec.model, effort: spec.effort };
  }
  return { ladder: spec.ladder as unknown as Json };
}

/**
 * The canonical identity object of an IdentityInput under the hashVersion
 * 2 profile: what JCS serializes and sha256 hashes. The agent kind
 * projects modelSpec through modelSpecIdentity; every other kind
 * serializes its fields verbatim. Fields not listed for a kind are never
 * included (the types make them unrepresentable).
 */
export function projectIdentity(input: IdentityInput): Record<string, unknown> {
  if (input.kind === 'agent') {
    return {
      kind: input.kind,
      agentType: input.agentType,
      modelSpec: modelSpecIdentity(input.modelSpec),
      prompt: input.prompt,
      schemaHash: input.schemaHash,
      toolsetHash: input.toolsetHash,
      isolation: input.isolation,
    };
  }
  return input as unknown as Record<string, unknown>;
}

/** The JCS form of an IdentityInput under the hashVersion 2 profile. */
export function identityJcs(input: IdentityInput): string {
  return jcsSerialize(projectIdentity(input));
}

/**
 * key = sha256(JCS(IdentityInput)) (docs/03, section "Content key").
 */
export function deriveContentKey(input: IdentityInput): string {
  return createHash('sha256').update(identityJcs(input), 'utf8').digest('hex');
}
