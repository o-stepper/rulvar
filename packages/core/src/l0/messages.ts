/**
 * L0 wire contracts (M1-T01).
 *
 * Owning spec: docs/04-model-layer-spec.md, sections "Wire contract (L0)"
 * and "Router and resolution chain". This file is the single declaration
 * site for the wire vocabulary and the model-spec family; other packages
 * and docs reference these types and never redeclare them.
 */
import type { WireError } from './errors.js';
import { monotonicUlidFactory } from '../vendor/ulid.js';

export type Role = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Engine-minted ULID identifying a tool call across providers. The library,
 * not the provider, mints tool-call ids; each adapter keeps a bijective map
 * between canonical ids and wire ids (toolu_* / call_*) in both directions
 * (docs/04, section "Canonical tool-call ids").
 */
export type CanonicalId = string;

/**
 * Returns a per-engine minter of CanonicalId values. Monotonic within the
 * factory instance; never a module-level singleton (docs/02, section
 * "Dependency rules": no module state).
 */
export function createCanonicalIdMinter(options?: {
  now?: () => number;
  random?: (byteLength: number) => Uint8Array;
}): () => CanonicalId {
  return monotonicUlidFactory(options);
}

export interface Msg {
  role: Role;
  /** Parts are ordered; adapters MUST preserve part order in both directions. */
  parts: Part[];
}

/**
 * The canonical part union. provider-raw parts carry opaque provider blocks
 * that must survive round trips (thinking blocks with signatures, reasoning
 * items including encrypted_content). Retention is unconditional; dropping
 * happens only in projection, never in retention (docs/04, section
 * "Messages and parts").
 */
export type Part =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: string; data: Uint8Array | string }
  | { type: 'tool-call'; id: CanonicalId; name: string; args: unknown }
  | { type: 'tool-result'; id: CanonicalId; name: string; result: unknown; isError?: boolean }
  | { type: 'provider-raw'; provider: string; block: unknown };

/**
 * A JSON Schema document (draft 2020-12) as plain JSON data. Canonical
 * serialization and hashing rules live with the KeyDeriver (docs/03,
 * section "schemaHash and toolsetHash derivation").
 */
export type JsonSchema = { [key: string]: unknown };

/**
 * The identity-bearing tool contract: exactly what the model sees and
 * exactly what toolsetHash hashes. Never contains execute or any closure
 * (docs/08, section "Tool definition and toolsetHash").
 */
export interface ToolContract {
  name: string;
  description: string;
  /** Canonical JSON Schema projection of the tool's SchemaSpec. */
  parameters: JsonSchema;
  /** Opaque semantic-change signal; participates as absent when absent. */
  version?: string;
}

export type ToolChoice = 'auto' | 'none' | 'required' | { name: string };

/**
 * Canonical effort: exactly five levels, a string-literal union, never a TS
 * enum (docs/04, section "Canonical effort"). OpenAI 'none' has no
 * canonical equivalent and is reachable only via providerOptions.
 */
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export type CacheTtl = '5m' | '1h';

/**
 * Provider-neutral declaration of intended prompt-cache boundaries.
 * Transport-level cost optimization only: MUST NOT enter IdentityInput and
 * MUST NOT change response semantics (docs/04, section "cacheHint").
 */
export interface CacheHint {
  /** Desired cache boundaries, ordered from shallowest to deepest prefix. */
  breakpoints: Array<{
    after: 'tools' | 'system' | { messageIndex: number };
    /** Default '5m'. */
    ttl?: CacheTtl;
  }>;
}

/**
 * The provider-neutral chat request. Sampling parameters (temperature,
 * top_p, top_k) are deliberately absent from the first-class surface: both
 * first-class providers reject them on current reasoning models; where a
 * target legitimately supports them they travel through the adapter's
 * providerOptions namespace, subject to caps scrubbing (docs/04, section
 * "ChatRequest").
 */
export interface ChatRequest {
  /** Wire model id: the segment after 'adapterId:' in ModelRef. */
  model: string;
  /** System messages are Msg entries with role 'system'. */
  messages: Msg[];
  tools?: ToolContract[];
  toolChoice?: ToolChoice;
  /** Structured-output target; tier already chosen by the router. */
  schema?: JsonSchema;
  /** Canonical effort, already resolved and scrubbed by the router. */
  effort?: Effort;
  maxOutputTokens?: number;
  stopSequences?: string[];
  cacheHint?: CacheHint;
  /**
   * Namespaced by adapter id: { anthropic: {...}, openai: {...} }. An
   * adapter MUST read only its own namespace and MUST ignore unknown
   * namespaces without error. Canonical fields always win where both
   * express the same thing; a namespaced option silently contradicting a
   * canonical field is a typed ConfigError (docs/04, section
   * "providerOptions and providerMetadata namespacing").
   */
  providerOptions?: Record<string, Record<string, unknown>>;
}

/**
 * Usage under the Usage invariant: inputTokens is the FULL prompt size
 * including cache reads and cache writes. Adapters MUST normalize
 * provider-reported usage to satisfy this invariant, and the core verifies
 * it at the adapter boundary (docs/04, section "Usage invariant").
 */
export type Usage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens?: number;
};

export interface RefusalInfo {
  /** Adapter id. */
  provider: string;
  /** Provider stop details, passed through when available. */
  stopDetails?: {
    type?: string;
    category?: string;
    explanation?: string;
  };
}

/**
 * Typed finish outcomes. A refusal MUST surface as a typed finish outcome
 * carrying the provider stop details; it MUST NOT be projected to a null
 * output silently (docs/04, section "Finish outcomes and typed refusal").
 */
export type FinishInfo =
  | { reason: 'stop' }
  | { reason: 'tool-calls' }
  | { reason: 'max-tokens' }
  | { reason: 'context-window-exceeded' }
  | { reason: 'refusal'; refusal: RefusalInfo };

/**
 * The single canonical stream-event vocabulary yielded by
 * ProviderAdapter.stream. Adapters MUST emit exactly one terminal event per
 * stream (finish or error) (docs/04, section "ChatEvent stream").
 */
export type ChatEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'reasoning-delta'; text: string }
  | { type: 'tool-call-start'; id: CanonicalId; name: string }
  | { type: 'tool-call-delta'; id: CanonicalId; argsTextDelta: string }
  | { type: 'tool-call-end'; id: CanonicalId; args: unknown }
  | { type: 'usage'; usage: Partial<Usage> }
  | { type: 'finish'; finish: FinishInfo; usage: Usage; providerMetadata?: Record<string, unknown> }
  | { type: 'error'; error: WireError };

/** Strictly 'adapterId:model', no query parameters (docs/04, section "Registry and ModelRef"). */
export type ModelRef = `${string}:${string}`;

export type InvocationRole = 'orchestrate' | 'plan' | 'loop' | 'finalize' | 'extract' | 'summarize';

/**
 * What authors write wherever a model is configurable: a call override, an
 * agent profile, a workflow default, or an engine default (docs/04, section
 * "Router and resolution chain").
 */
export type ModelSpec = ModelRef | ModelChoice | { ladder: LadderSpec };

export interface ModelChoice {
  model: ModelRef;
  /** Absent: resolved by the chain, including role effort defaults. */
  effort?: Effort;
  /** Namespaced by adapter id (docs/04, section "providerOptions and providerMetadata namespacing"). */
  providerOptions?: Record<string, Record<string, unknown>>;
  /** Transport-failure failover list; never enters identity (docs/04, section "RetryPolicy and failover"). */
  fallbacks?: ModelRef[];
}

/**
 * Identity-facing canonical form of a RESOLVED model request; the value
 * that enters AgentIdentityInput.modelSpec (docs/03, section "Identity
 * model"). providerOptions and fallbacks NEVER enter this form: they are
 * delivery options, excluded from identity exactly like label, phase,
 * onError, retry, and replay. `effort` is absent exactly when no layer of
 * the chain and no role effort default resolves one (docs/04, section
 * "Router and resolution chain").
 */
export type CanonicalModelSpec =
  | { kind: 'model'; model: ModelRef; effort?: Effort }
  | { kind: 'ladder'; ladder: CanonicalLadderSpec };

export type TriggerClass = 'error' | 'limit' | 'schema-exhausted' | 'verify-failed' | 'no-progress';

/**
 * Ladder acceptance gates. Spot-check sibling selection is strictly via
 * ctx.random, never Math.random (docs/04, section "ModelLadder summary").
 */
export type Gate =
  | { kind: 'mechanical'; profile: string }
  | { kind: 'judge'; rung: number | ModelRef }
  | { kind: 'spot-check'; fraction: number };

/**
 * The author-facing ladder declaration. This is the SINGLE declaration of
 * the ladder family: docs/07 references it and never redeclares (runtime
 * semantics land in M7).
 */
export interface LadderSpec {
  rungs: Array<{
    model: ModelRef;
    effort?: Effort;
    /** Binding cap per rung. */
    maxTurns: number;
    /** Binding cap per rung. */
    maxTokens: number;
    /** Optional: local openaiCompatible models have no meaningful price. */
    maxCostUsd?: number;
    /** Opt-in per rung; the global default errors-re-run-live is preserved (DEF-1). */
    memoizeOutcome?: boolean;
  }>;
  startTier: number;
  escalateOn: TriggerClass[];
  acceptance?: Gate[];
}

/** LadderSpec after canonicalization: every rung's effort resolved to an explicit value. */
export interface CanonicalLadderSpec {
  rungs: Array<{
    model: ModelRef;
    effort: Effort;
    maxTurns: number;
    maxTokens: number;
    maxCostUsd?: number;
    memoizeOutcome?: boolean;
  }>;
  /** After clamping of any orchestrator model_hint (docs/07). */
  startTier: number;
  escalateOn: TriggerClass[];
  acceptance?: Gate[];
}
