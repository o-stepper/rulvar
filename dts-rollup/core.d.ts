//#region src/l0/json.d.ts
/**
* L0 JSON value domain.
*
* Everything that enters the journal (entry values, error data, artifacts)
* MUST be JSON-serializable (docs/03-journal-spec.md, section "Two-phase
* entries, dispatch, and the budget ledger"); `Json` is the type-level face
* of that rule.
*/
type Json = null | boolean | number | string | Json[] | {
  [key: string]: Json;
};
/** L0 byte-blob alias consumed by TranscriptStore and IsolationProvider. */
type Bytes = Uint8Array;
//#endregion
//#region src/l0/errors.d.ts
/**
* JSON-serializable error projection stored in journal entries
* (JournalEntry.error) and sent across process boundaries (worker sandbox
* RPC, HTTP server). Raw Error objects never enter the journal.
*/
type WireError = {
  code: string;
  message: string;
  retryable: boolean;
  data?: Json;
};
/**
* The closed error-code registry (docs/02, section "Error taxonomy").
* 'agent' is carried by the AgentError value projection, not by a
* LurkerError subclass.
*/
type ErrorCode = "agent" | "config" | "non_serializable_value" | "script_rejected" | "journal_compat" | "invalid_resolution" | "journal_order_violation" | "plan_invariant" | "replay_plan_hash_mismatch" | "orchestrator_cap_config" | "journal_miss" | "budget_exhausted" | "lease_held";
/** docs/02 names the registry type LurkerErrorCode; both names are public. */
type LurkerErrorCode = ErrorCode;
/**
* Base class for all engine-raised errors. "Retryable" means the engine's
* own retry machinery (RetryPolicy under the journal, docs/04) MAY retry;
* it never means a provider SDK autoretry, which is disabled.
*/
declare abstract class LurkerError extends Error {
  abstract readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly data?: Json;
  constructor(message: string, opts?: {
    retryable?: boolean;
    data?: Json;
    cause?: unknown;
  });
  toWire(): WireError;
}
/**
* Construction- and definition-time misconfiguration: duplicate adapterId,
* non-git host for worktree isolation, worker over a non-leasable store,
* failed schema projection. Never journaled; raised before any run effect.
*/
declare class ConfigError extends LurkerError {
  readonly code = "config";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* A value failed the journal append JSON-serializability check. Never
* journaled; thrown at the call site whose value failed the check.
*/
declare class NonSerializableValueError extends LurkerError {
  readonly code = "non_serializable_value";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* compileScript rejected planner-generated source. Never journaled as its
* own entry; surfaced as diagnostics to the plan() self-repair loop
* (producers ship in M6).
*/
declare class ScriptRejected extends LurkerError {
  readonly code = "script_rejected";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/** Sub-code detail of JournalCompatibilityError (docs/03, section "hashVersion"). */
type JournalCompatSubCode = "HASH_VERSION_TOO_OLD" | "HASH_VERSION_TOO_NEW";
/**
* Refusal to open a journal whose hashVersion falls outside the engine's
* support window (docs/03, section "hashVersion"; producers ship in M2).
* The registry code is 'journal_compat'; the docs/03 sub-codes live on
* `subCode` and in `data`.
*/
declare class JournalCompatibilityError extends LurkerError {
  readonly code = "journal_compat";
  readonly subCode: JournalCompatSubCode;
  readonly runId: string;
  /** Seq of the first violating entry. */
  readonly entrySeq: number;
  readonly entryHashVersion: number;
  readonly supportedRange: {
    min: number;
    max: number;
  };
  /** 'enable deriverV1 from @lurker/compat' or 'upgrade lurker'. */
  readonly hint: string;
  constructor(message: string, detail: {
    subCode: JournalCompatSubCode;
    runId: string;
    entrySeq: number;
    entryHashVersion: number;
    supportedRange: {
      min: number;
      max: number;
    };
    hint: string;
  });
}
/**
* A resolution attempt against an already-closed suspension, rejected under
* the first-closing-wins fold; appends no entry (docs/03, section
* "Suspension and resolutions"; producers ship in M2).
*/
declare class InvalidResolutionError extends LurkerError {
  readonly code = "invalid_resolution";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* A breach of the total per-run append order: an unfenced concurrent writer
* or a store violating contract A2 (docs/03, section "Storage SPI").
*/
declare class JournalOrderViolation extends LurkerError {
  readonly code = "journal_order_violation";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/** PlanRunner plan-invariant rejection (docs/07; producers ship in M7). */
declare class PlanInvariantError extends LurkerError {
  readonly code = "plan_invariant";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* Raised at resume when the refolded plan state disagrees with the
* journaled planHash chain (docs/07; producers ship in M7).
*/
declare class ReplayPlanHashMismatch extends LurkerError {
  readonly code = "replay_plan_hash_mismatch";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* Invalid orchestrator cap and finalize-reserve configuration, thrown
* before the first LLM call (docs/06, section "Three-layer budget", DEF-7;
* producers ship in M6/M7).
*/
declare class OrchestratorCapConfigError extends LurkerError {
  readonly code = "orchestrator_cap_config";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* A replay-strict run encountered a call that would go live
* (@lurker/testing; producers ship in M2).
*/
declare class JournalMissError extends LurkerError {
  readonly code = "journal_miss";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* The run budget ceiling blocked further work. The budget guard denial is
* a decision entry; ctx primitives throw this as AgentError kind 'budget';
* the run reports outcome 'exhausted', overriding 'error' (docs/06, section
* "Three-layer budget").
*/
declare class BudgetExhaustedError extends LurkerError {
  readonly code = "budget_exhausted";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* acquire() on a currently held lease. Retryable by contract: retry after
* the lease ttl elapses or the holder releases (docs/03, section
* "Storage SPI").
*/
declare class LeaseHeldError extends LurkerError {
  readonly code = "lease_held";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* The vendored Standard Schema issue shape (docs/06, section "Canonical Ctx
* interface"): validation issues carried on AgentError and surfaced to the
* model during bounded schema re-prompts.
*/
type Issue$1 = {
  message: string;
  path?: ReadonlyArray<PropertyKey | {
    key: PropertyKey;
  }>;
};
/**
* The structured error value carried on AgentResult.error and journaled
* inside the agent terminal entry. Deliberately NOT a LurkerError subclass
* (docs/02, section "Error taxonomy").
*/
type AgentError = {
  kind: "transport" | "rate-limit" | "schema-mismatch" | "tool" | "budget" | "terminal";
  retryable: boolean;
  retryAfterMs?: number;
  issues?: Issue$1[];
};
/**
* Projects an AgentError to its WireError form: code 'agent', with kind,
* retryAfterMs, and issues carried in data (docs/02, section "Error
* taxonomy"). Issue paths are flattened to JSON-safe segments.
*/
declare function agentErrorToWire(error: AgentError, message: string): WireError;
/**
* Reads an AgentError back from its WireError projection. Throws a
* ConfigError when the wire code is not 'agent'.
*/
declare function agentErrorFromWire(wire: WireError): AgentError;
//#endregion
//#region src/l0/messages.d.ts
type Role = "system" | "user" | "assistant" | "tool";
/**
* Engine-minted ULID identifying a tool call across providers. The library,
* not the provider, mints tool-call ids; each adapter keeps a bijective map
* between canonical ids and wire ids (toolu_* / call_*) in both directions
* (docs/04, section "Canonical tool-call ids").
*/
type CanonicalId = string;
/**
* Returns a per-engine minter of CanonicalId values. Monotonic within the
* factory instance; never a module-level singleton (docs/02, section
* "Dependency rules": no module state).
*/
declare function createCanonicalIdMinter(options?: {
  now?: () => number;
  random?: (byteLength: number) => Uint8Array;
}): () => CanonicalId;
interface Msg {
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
type Part = {
  type: "text";
  text: string;
} | {
  type: "image";
  mediaType: string;
  data: Uint8Array | string;
} | {
  type: "tool-call";
  id: CanonicalId;
  name: string;
  args: unknown;
} | {
  type: "tool-result";
  id: CanonicalId;
  name: string;
  result: unknown;
  isError?: boolean;
} | {
  type: "provider-raw";
  provider: string;
  block: unknown;
};
/**
* A JSON Schema document (draft 2020-12) as plain JSON data. Canonical
* serialization and hashing rules live with the KeyDeriver (docs/03,
* section "schemaHash and toolsetHash derivation").
*/
type JsonSchema = {
  [key: string]: unknown;
};
/**
* The identity-bearing tool contract: exactly what the model sees and
* exactly what toolsetHash hashes. Never contains execute or any closure
* (docs/08, section "Tool definition and toolsetHash").
*/
interface ToolContract {
  name: string;
  description: string;
  /** Canonical JSON Schema projection of the tool's SchemaSpec. */
  parameters: JsonSchema;
  /** Opaque semantic-change signal; participates as absent when absent. */
  version?: string;
}
type ToolChoice = "auto" | "none" | "required" | {
  name: string;
};
/**
* Canonical effort: exactly five levels, a string-literal union, never a TS
* enum (docs/04, section "Canonical effort"). OpenAI 'none' has no
* canonical equivalent and is reachable only via providerOptions.
*/
type Effort = "low" | "medium" | "high" | "xhigh" | "max";
type CacheTtl = "5m" | "1h";
/**
* Provider-neutral declaration of intended prompt-cache boundaries.
* Transport-level cost optimization only: MUST NOT enter IdentityInput and
* MUST NOT change response semantics (docs/04, section "cacheHint").
*/
interface CacheHint {
  /** Desired cache boundaries, ordered from shallowest to deepest prefix. */
  breakpoints: Array<{
    after: "tools" | "system" | {
      messageIndex: number;
    }; /** Default '5m'. */
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
interface ChatRequest {
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
type Usage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens?: number;
};
interface RefusalInfo {
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
type FinishInfo = {
  reason: "stop";
} | {
  reason: "tool-calls";
} | {
  reason: "max-tokens";
} | {
  reason: "context-window-exceeded";
} | {
  reason: "refusal";
  refusal: RefusalInfo;
};
/**
* The single canonical stream-event vocabulary yielded by
* ProviderAdapter.stream. Adapters MUST emit exactly one terminal event per
* stream (finish or error) (docs/04, section "ChatEvent stream").
*/
type ChatEvent = {
  type: "text-delta";
  text: string;
} | {
  type: "reasoning-delta";
  text: string;
} | {
  type: "tool-call-start";
  id: CanonicalId;
  name: string;
} | {
  type: "tool-call-delta";
  id: CanonicalId;
  argsTextDelta: string;
} | {
  type: "tool-call-end";
  id: CanonicalId;
  args: unknown;
} | {
  type: "usage";
  usage: Partial<Usage>;
} | {
  type: "finish";
  finish: FinishInfo;
  usage: Usage;
  providerMetadata?: Record<string, unknown>;
} | {
  type: "error";
  error: WireError;
};
/** Strictly 'adapterId:model', no query parameters (docs/04, section "Registry and ModelRef"). */
type ModelRef = `${string}:${string}`;
type InvocationRole = "orchestrate" | "plan" | "loop" | "finalize" | "extract" | "summarize";
/**
* What authors write wherever a model is configurable: a call override, an
* agent profile, a workflow default, or an engine default (docs/04, section
* "Router and resolution chain").
*/
type ModelSpec = ModelRef | ModelChoice | {
  ladder: LadderSpec;
};
interface ModelChoice {
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
* onError, retry, and replay.
*/
type CanonicalModelSpec = {
  kind: "model";
  model: ModelRef;
  effort: Effort;
} | {
  kind: "ladder";
  ladder: CanonicalLadderSpec;
};
type TriggerClass = "error" | "limit" | "schema-exhausted" | "verify-failed" | "no-progress";
/**
* Ladder acceptance gates. Spot-check sibling selection is strictly via
* ctx.random, never Math.random (docs/04, section "ModelLadder summary").
*/
type Gate = {
  kind: "mechanical";
  profile: string;
} | {
  kind: "judge";
  rung: number | ModelRef;
} | {
  kind: "spot-check";
  fraction: number;
};
/**
* The author-facing ladder declaration. This is the SINGLE declaration of
* the ladder family: docs/07 references it and never redeclares (runtime
* semantics land in M7).
*/
interface LadderSpec {
  rungs: Array<{
    model: ModelRef;
    effort?: Effort; /** Binding cap per rung. */
    maxTurns: number; /** Binding cap per rung. */
    maxTokens: number; /** Optional: local openaiCompatible models have no meaningful price. */
    maxCostUsd?: number; /** Opt-in per rung; the global default errors-re-run-live is preserved (DEF-1). */
    memoizeOutcome?: boolean;
  }>;
  startTier: number;
  escalateOn: TriggerClass[];
  acceptance?: Gate[];
}
/** LadderSpec after canonicalization: every rung's effort resolved to an explicit value. */
interface CanonicalLadderSpec {
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
//#endregion
//#region src/vendor/standard-schema.d.ts
// Vendored from @standard-schema/spec@1.1.0 (MIT, Copyright (c) 2024 Colin
// McDonnell), file dist/index.d.ts, byte-identical below this header.
// Upstream: https://github.com/standard-schema/standard-schema
// Types only, never a runtime dependency (docs/13-toolchain-repo.md,
// section "Dependency baseline pins"; docs/08, section "SchemaSpec";
// task M0-T08). StandardJSONSchemaV1 carries the JSON Schema projection
// surface: ~standard.jsonSchema.input() with target draft-2020-12 and
// fallback draft-07.
/** The Standard Typed interface. This is a base type extended by other specs. */
interface StandardTypedV1<Input = unknown, Output = Input> {
  /** The Standard properties. */
  readonly '~standard': StandardTypedV1.Props<Input, Output>;
}
declare namespace StandardTypedV1 {
  /** The Standard Typed properties interface. */
  interface Props<Input = unknown, Output = Input> {
    /** The version number of the standard. */
    readonly version: 1;
    /** The vendor name of the schema library. */
    readonly vendor: string;
    /** Inferred types associated with the schema. */
    readonly types?: Types<Input, Output> | undefined;
  }
  /** The Standard Typed types interface. */
  interface Types<Input = unknown, Output = Input> {
    /** The input type of the schema. */
    readonly input: Input;
    /** The output type of the schema. */
    readonly output: Output;
  }
  /** Infers the input type of a Standard Typed. */
  type InferInput<Schema extends StandardTypedV1> = NonNullable<Schema['~standard']['types']>['input'];
  /** Infers the output type of a Standard Typed. */
  type InferOutput<Schema extends StandardTypedV1> = NonNullable<Schema['~standard']['types']>['output'];
}
/** The Standard Schema interface. */
interface StandardSchemaV1<Input = unknown, Output = Input> {
  /** The Standard Schema properties. */
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}
declare namespace StandardSchemaV1 {
  /** The Standard Schema properties interface. */
  interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
    /** Validates unknown input values. */
    readonly validate: (value: unknown, options?: StandardSchemaV1.Options | undefined) => Result<Output> | Promise<Result<Output>>;
  }
  /** The result interface of the validate function. */
  type Result<Output> = SuccessResult<Output> | FailureResult;
  /** The result interface if validation succeeds. */
  interface SuccessResult<Output> {
    /** The typed output value. */
    readonly value: Output;
    /** A falsy value for `issues` indicates success. */
    readonly issues?: undefined;
  }
  interface Options {
    /** Explicit support for additional vendor-specific parameters, if needed. */
    readonly libraryOptions?: Record<string, unknown> | undefined;
  }
  /** The result interface if validation fails. */
  interface FailureResult {
    /** The issues of failed validation. */
    readonly issues: ReadonlyArray<Issue>;
  }
  /** The issue interface of the failure output. */
  interface Issue {
    /** The error message of the issue. */
    readonly message: string;
    /** The path of the issue, if any. */
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }
  /** The path segment interface of the issue. */
  interface PathSegment {
    /** The key representing a path segment. */
    readonly key: PropertyKey;
  }
  /** The Standard types interface. */
  interface Types<Input = unknown, Output = Input> extends StandardTypedV1.Types<Input, Output> {}
  /** Infers the input type of a Standard. */
  type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;
  /** Infers the output type of a Standard. */
  type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}
/** The Standard JSON Schema interface. */
interface StandardJSONSchemaV1<Input = unknown, Output = Input> {
  /** The Standard JSON Schema properties. */
  readonly '~standard': StandardJSONSchemaV1.Props<Input, Output>;
}
declare namespace StandardJSONSchemaV1 {
  /** The Standard JSON Schema properties interface. */
  interface Props<Input = unknown, Output = Input> extends StandardTypedV1.Props<Input, Output> {
    /** Methods for generating the input/output JSON Schema. */
    readonly jsonSchema: StandardJSONSchemaV1.Converter;
  }
  /** The Standard JSON Schema converter interface. */
  interface Converter {
    /** Converts the input type to JSON Schema. May throw if conversion is not supported. */
    readonly input: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
    /** Converts the output type to JSON Schema. May throw if conversion is not supported. */
    readonly output: (options: StandardJSONSchemaV1.Options) => Record<string, unknown>;
  }
  /**
   * The target version of the generated JSON Schema.
   *
   * It is *strongly recommended* that implementers support `"draft-2020-12"` and `"draft-07"`, as they are both in wide use. All other targets can be implemented on a best-effort basis. Libraries should throw if they don't support a specified target.
   *
   * The `"openapi-3.0"` target is intended as a standardized specifier for OpenAPI 3.0 which is a superset of JSON Schema `"draft-04"`.
   */
  type Target = 'draft-2020-12' | 'draft-07' | 'openapi-3.0' | ({} & string);
  /** The options for the input/output methods. */
  interface Options {
    /** Specifies the target version of the generated JSON Schema. Support for all versions is on a best-effort basis. If a given version is not supported, the library should throw. */
    readonly target: Target;
    /** Explicit support for additional vendor-specific parameters, if needed. */
    readonly libraryOptions?: Record<string, unknown> | undefined;
  }
  /** The Standard types interface. */
  interface Types<Input = unknown, Output = Input> extends StandardTypedV1.Types<Input, Output> {}
  /** Infers the input type of a Standard. */
  type InferInput<Schema extends StandardTypedV1> = StandardTypedV1.InferInput<Schema>;
  /** Infers the output type of a Standard. */
  type InferOutput<Schema extends StandardTypedV1> = StandardTypedV1.InferOutput<Schema>;
}
//#endregion
//#region src/l0/schema.d.ts
/** Form 2 of SchemaSpec: an explicit JSON Schema plus a runtime type guard. */
type SchemaPair<T = unknown> = {
  jsonSchema: JsonSchema;
  validate: (value: unknown) => value is T;
};
/**
* The L0 schema contract with exactly three accepted forms: a Standard
* Schema (Zod, ArkType, Valibot, ...), a { jsonSchema, validate } pair, or
* a bare JSON Schema literal (docs/08, section "The three forms").
*/
type SchemaSpec<T = unknown> = StandardSchemaV1<unknown, T> | SchemaPair<T> | JsonSchema;
/**
* Inferred output type per form: the Standard Schema output type; the
* type-guard target of validate(); unknown for a bare JSON Schema
* (docs/08, section "Out<S> inference").
*/
type Out<S> = S extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<S> : S extends {
  validate: (value: unknown) => value is infer T;
} ? T : unknown;
/**
* Form-1 guard: the value implements the Standard Schema interface. Some
* libraries expose callable schemas (ArkType types are functions), so both
* object- and function-typed values qualify.
*/
declare function isStandardSchemaSpec(spec: SchemaSpec): spec is StandardSchemaV1;
/** Form-2 guard: an explicit { jsonSchema, validate } pair. */
declare function isSchemaPairSpec(spec: SchemaSpec): spec is SchemaPair;
/**
* Derives the JSON Schema of a SchemaSpec (docs/08, section "JSON Schema
* derivation and acceptance rules"). Form 1 projects via the
* StandardJSONSchemaV1 input() converter, target draft 2020-12 with
* draft-07 fallback; a library without the projection is a typed
* ConfigError at definition time, never at first call. Transforming
* schemas therefore project their INPUT type. Forms 2 and 3 are taken
* verbatim.
*/
declare function projectToJsonSchema(spec: SchemaSpec): JsonSchema;
/**
* Canonical schema derivation (docs/03, section "schemaHash and
* toolsetHash derivation"): local fragment-only $ref inlined (recursion is
* a ConfigError), remote and dynamic references forbidden, annotation
* keywords stripped (format retained), reference infrastructure ($defs,
* definitions, $anchor) removed once inlined. The result feeds JCS
* serialization and sha256.
*/
declare function canonicalizeSchema(schema: JsonSchema): JsonSchema;
/**
* The schemaHash used when no structured-output schema is declared: the
* hash of the canonical `true` schema (docs/03, section "schemaHash and
* toolsetHash derivation").
*/
declare const EMPTY_SCHEMA_HASH: string;
/** The toolsetHash of an empty toolset: the hash of the canonical empty contract array. */
declare const EMPTY_TOOLSET_HASH: string;
/**
* schemaHash = sha256(JCS(canonicalize(schema))). Accepts the derived JSON
* Schema (or a boolean schema); pass undefined for "no schema declared".
*/
declare function schemaHash(schema: JsonSchema | boolean | undefined): string;
/** Derives and hashes a SchemaSpec in one step (identity path for spawns). */
declare function schemaHashOfSpec(spec: SchemaSpec | undefined): string;
/**
* toolsetHash = sha256 over the JCS-canonical JSON array of per-tool
* contract tuples (name, description, canonical parameters, version)
* sorted by name. Tool description IS part of the contract; schema
* annotations inside parameters are not. An absent version participates as
* absent (docs/03, section "schemaHash and toolsetHash derivation";
* docs/08, section "toolsetHash contract").
*/
declare function toolsetHash(contracts: ToolContract[]): string;
/** Result of validating a value against a SchemaSpec. */
type SchemaValidationResult<T = unknown> = {
  valid: true;
  value: T;
} | {
  valid: false;
  issues: Issue$1[];
};
/**
* Runtime validation per form (docs/08, section "Runtime validation"):
* form 1 via the Standard Schema's own validate, form 2 via the pair's
* type guard, form 3 via the vendored draft 2020-12 validator. The same
* machinery backs the structured-output tiers of the Agent Runtime.
*/
declare function validateSchemaSpec<S extends SchemaSpec>(spec: S, value: unknown): Promise<SchemaValidationResult<Out<S>>>;
//#endregion
//#region src/l0/spi/provider.d.ts
/**
* Per-model pricing in USD per million tokens (docs/04, section
* "Pricing"). The registry's versioned price table wins over adapter-
* reported caps.pricing, which is a fallback only.
*/
interface Pricing {
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
  cacheReadUsdPerMTok?: number;
  /** 5m write premium rate. */
  cacheWriteUsdPerMTok?: number;
  /** 1h write premium rate where the provider distinguishes. */
  cacheWrite1hUsdPerMTok?: number;
}
/** Capability facts the router consumes for tier selection and scrubbing. */
type ModelCaps = {
  structuredOutput: "native" | "forced-tool" | "prompt";
  supportsTemperature: boolean;
  supportsParallelTools: boolean; /** Canonical efforts this model accepts after mapping. */
  reasoningEfforts: Effort[];
  contextWindow: number;
  maxOutputTokens: number; /** Adapter-reported fallback only; the versioned price table wins. */
  pricing?: Pricing;
};
interface ProviderAdapter {
  /** Stable adapter id; the left segment of ModelRef. */
  id: string;
  caps(model: string): ModelCaps;
  /** Refresh the capability table from live model lists. */
  refreshCaps?(): Promise<void>;
  stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent>;
  countTokens?(req: ChatRequest): Promise<number>;
}
//#endregion
//#region src/l0/spi/isolation.d.ts
/**
* The canonical identity encoding of spawn isolation: this exact value
* domain enters spawn identity (docs/03, section "Identity model").
* 'readonly' is a determinism and blast-radius declaration, not
* containment.
*/
type IsolationSpec = "none" | "readonly" | {
  kind: "worktree";
  ref?: string;
};
interface IsolationProvider {
  acquire(s: {
    runId: string;
    spanId: string;
    ref?: string;
  }): Promise<{
    cwd: string;
    collect(): Promise<{
      files: string[];
      patch: Bytes;
    }>;
    dispose(keep?: boolean): Promise<void>;
  }>;
}
//#endregion
export { AgentError, BudgetExhaustedError, type Bytes, CacheHint, CacheTtl, CanonicalId, CanonicalLadderSpec, CanonicalModelSpec, ChatEvent, ChatRequest, ConfigError, EMPTY_SCHEMA_HASH, EMPTY_TOOLSET_HASH, Effort, ErrorCode, FinishInfo, Gate, InvalidResolutionError, InvocationRole, type IsolationProvider, type IsolationSpec, Issue$1 as Issue, JournalCompatSubCode, JournalCompatibilityError, JournalMissError, JournalOrderViolation, type Json, JsonSchema, LadderSpec, LeaseHeldError, LurkerError, LurkerErrorCode, type ModelCaps, ModelChoice, ModelRef, ModelSpec, Msg, NonSerializableValueError, OrchestratorCapConfigError, Out, Part, PlanInvariantError, type Pricing, type ProviderAdapter, RefusalInfo, ReplayPlanHashMismatch, Role, SchemaPair, SchemaSpec, SchemaValidationResult, ScriptRejected, type StandardJSONSchemaV1, type StandardSchemaV1, ToolChoice, ToolContract, TriggerClass, Usage, WireError, agentErrorFromWire, agentErrorToWire, canonicalizeSchema, createCanonicalIdMinter, isSchemaPairSpec, isStandardSchemaSpec, projectToJsonSchema, schemaHash, schemaHashOfSpec, toolsetHash, validateSchemaSpec };