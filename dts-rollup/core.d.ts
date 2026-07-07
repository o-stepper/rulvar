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
* onError, retry, and replay. `effort` is absent exactly when no layer of
* the chain and no role effort default resolves one (docs/04, section
* "Router and resolution chain").
*/
type CanonicalModelSpec = {
  kind: "model";
  model: ModelRef;
  effort?: Effort;
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
//#region src/l0/entries.d.ts
/**
* Versions the ENTIRE identity and replay pipeline as one unit: canonical
* JSON algorithm, identity field sets, hash function, schema/toolset hash
* derivation, scope grammar and ordinal rules, replay predicate, fold
* defaults, and the kind/status vocabularies (docs/03, section
* "hashVersion").
*/
type HashVersion = number;
/** 1 = round 1; 2 = current. */
declare const CURRENT_HASH_VERSION: HashVersion;
/**
* The single kinds registry v2 (docs/03, section "Kinds registry v2").
* Readers MUST tolerate unknown kinds; stores pass them through
* byte-for-byte (obligation A4).
*/
type EntryKind = "agent" | "step" | "child" | "external" | "approval" | "rand" | "decision" | "plan.revision" | "plan.decision" | "ledger.op" | "resolution" | "abandon" | "node.link" | "termination.init" | "termination.denied";
/**
* The stored status vocabulary, exactly. 'skipped' is DELIBERATELY absent:
* it is a derived fold status, never persisted (docs/03, section "Stored
* status vocabulary").
*/
type EntryStatus = "running" | "ok" | "error" | "limit" | "suspended" | "cancelled" | "escalated";
/** The canonical EntryRef between entries is seq (docs/03, section "Full entry identity"). */
type EntryRef = number;
/** Payload of resolution ref-entries; the full schema lands with DEF-4 in M2. */
type ResolutionPayload = {
  by: string;
  value?: Json;
  [key: string]: Json | undefined;
};
/** Payload of abandon ref-entries; the full schema lands with DEF-5 in M2/M7. */
type AbandonPayload = {
  reason: string;
  authorizedBy?: EntryRef;
  retainCheckpoint?: boolean;
  retainWorktree?: boolean;
  [key: string]: Json | undefined;
};
/**
* Final entry form (hashVersion 2; docs/03, section "JournalEntry form").
* All journaled values MUST be JSON-serializable; a violation raises a
* typed NonSerializableValueError at the call site. append is serialized
* by a per-run queue.
*/
type JournalEntry = {
  /** Identity-derivation and replay-semantics version of THIS entry. */hashVersion: HashVersion; /** Total order per run; canonical EntryRef = seq. */
  seq: number;
  /**
  * Backward reference by seq, always ref < seq: on ref-entries
  * (resolution/abandon) the seq of the target; on terminal phase entries
  * the seq of the running entry.
  */
  ref?: number;
  scope: string;
  key: string;
  ordinal: number;
  kind: EntryKind;
  status: EntryStatus;
  value?: Json;
  error?: WireError;
  usage?: Usage; /** True when the stream was cut at the budget ceiling or by a stream failure. */
  usageApprox?: boolean; /** Who actually served (failover changes only this, never the key). */
  servedBy?: ModelRef;
  transcriptRef?: string;
  checkpointRef?: string; /** Only when kind === 'resolution'. */
  resolution?: ResolutionPayload; /** Only when kind === 'abandon'. */
  abandon?: AbandonPayload;
  /**
  * Policy field on agent entries, fixed in the payload at dispatch time
  * (docs/03, section "Normative payload schemas"): the M2 predicate reads
  * the flag from the ENTRY, never from current code. Excluded from
  * identity like every policy field.
  */
  memoizeOutcome?: boolean; /** On suspended entries: the journaled deadline. */
  deadlineAt?: string;
  spanId: string;
  startedAt: string;
  endedAt?: string;
};
/** Rand-entry payload (docs/03, section "Normative payload schemas"). */
type RandPayload = {
  subtype: "now";
  value: number;
} | {
  subtype: "random";
  value: number;
  key?: string;
} | {
  subtype: "uuid";
  value: string;
};
/**
* Round-1 normalization: hashVersion is taken from `hashVersion`, else
* from the legacy `v` field, else 1. Stores are never rewritten;
* normalization happens at read (docs/03, section "The single versioning
* mechanism").
*/
declare function normalizeEntry(raw: unknown): JournalEntry;
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
//#region src/l0/spi/store.d.ts
/** Lease token for queue-mode ownership; epoch is the fencing token. */
type Lease = {
  runId: string;
  owner: string;
  epoch: number;
};
/**
* Run-level metadata written by the ENGINE via putMeta as a separate
* record, so listRuns never parses payloads. The hashVersion range fields
* are advisory only; the journal is authoritative (docs/03, section
* "RunMeta").
*/
type RunMeta = {
  runId: string;
  status: string;
  name?: string;
  tags?: string[];
  updatedAt: string;
  hashVersionLow?: number;
  hashVersionHigh?: number; /** Registered workflow name (in-process Workflow). */
  workflowName?: string; /** Content hash of the body or of the compiled source. */
  workflowHash?: string; /** TranscriptStore ref of the persisted CompiledWorkflow source. */
  workflowSourceRef?: string;
};
type RunFilter = {
  status?: string;
  tags?: string[];
  name?: string;
};
interface JournalStore {
  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  putMeta(m: RunMeta): Promise<void>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  delete(runId: string): Promise<void>;
}
/**
* Lease capability: acquire on a held lease MUST reject with a typed
* LeaseHeldError; renew MUST run at an interval of at most ttl/3; an
* append carrying a stale epoch MUST be rejected and never appear in load
* (docs/03, section "LeasableStore").
*/
interface LeasableStore extends JournalStore {
  acquire(runId: string, owner: string): Promise<Lease>;
  renew(l: Lease): Promise<void>;
  release(l: Lease): Promise<void>;
}
//#endregion
//#region src/l0/spi/transcript.d.ts
interface TranscriptStore {
  put(ref: string, blob: Bytes): Promise<void>;
  get(ref: string): Promise<Bytes | null>;
  list(runId: string): Promise<string[]>;
}
//#endregion
//#region src/journal/identity.d.ts
/** Spawn entries: ctx.agent and orchestrator spawn tools (kind 'agent'). */
interface AgentIdentityInput {
  kind: "agent";
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
interface ChildIdentityInput {
  kind: "child";
  /** Registered workflow name. */
  workflow: string;
  /** Canonical JSON of the arguments; opts.key, when set, replaces args. */
  args: Json;
}
/** Journaled effectful steps: ctx.step (kind 'step'). */
interface StepIdentityInput {
  kind: "step";
  /** opts.key when set, otherwise the step label. */
  key: string;
  /** Declared dependency values (useMemo-style keying). */
  deps: Json[];
}
/** External inputs: ctx.awaitExternal (kind 'external'). */
interface ExternalIdentityInput {
  kind: "external";
  key: string;
}
/** Tool-approval suspensions (kind 'approval'). */
interface ApprovalIdentityInput {
  kind: "approval";
  toolName: string;
  /** The tool input as submitted to the permission chain. */
  input: Json;
}
/** Deterministic shims: ctx.now / ctx.random / ctx.uuid (kind 'rand'). */
interface RandIdentityInput {
  kind: "rand";
  subtype: "now" | "random" | "uuid";
  /** ctx.random(key) provides a stable alternative to positional binding. */
  key?: string;
}
type IdentityInput = AgentIdentityInput | ChildIdentityInput | StepIdentityInput | ExternalIdentityInput | ApprovalIdentityInput | RandIdentityInput;
/**
* The identity projection of a CanonicalModelSpec. For the plain-model
* kind the projection is `{ model, effort? }` WITHOUT the kind
* discriminant, exactly as fixed by the docs/03 section 1.5 worked
* example; `effort` is omitted when unresolved. The ladder embedding lands
* with ladder execution (M7).
*/
declare function modelSpecIdentity(spec: CanonicalModelSpec): {
  model: ModelRef;
  effort?: Effort;
} | {
  ladder: Json;
};
/**
* The JCS form of an IdentityInput under the hashVersion 2 profile. The
* agent kind projects modelSpec through modelSpecIdentity; every other
* kind serializes its fields verbatim. Fields not listed for a kind are
* never included (the types make them unrepresentable).
*/
declare function identityJcs(input: IdentityInput): string;
/**
* key = sha256(JCS(IdentityInput)) (docs/03, section "Content key").
*/
declare function deriveContentKey(input: IdentityInput): string;
//#endregion
//#region src/journal/scope.d.ts
/**
* Scope-path grammar (M1-T04): deterministic structural paths, independent
* of wall-clock (invariant I3: structure comes from call-and-return only).
* The grammar is part of the hashVersion 2 profile.
*
* Owning spec: docs/03-journal-spec.md, section "Scope-path grammar".
*
* Segment rules: a sequential body is ONE scope (sequential calls add no
* segment; they are distinguished by key and ordinal only). ctx.phase is
* cosmetic for identity and adds no segment. Parallel site numbers come
* from a monotonic counter per enclosing scope in execution order; the
* pipeline item index is the index of the ORIGINAL input item, so
* streaming reorder never shifts identity.
*/
/** The root sequential body of the run is the empty path. */
declare const ROOT_SCOPE: string;
/** Branch `branch` of parallel site `site`: `par:<site>:<branch>`. */
declare function parallelScope(parent: string, site: number, branch: number): string;
/** Stage `stage` processing source item `item`: `pipe:<stage>:<item>`. */
declare function pipelineScope(parent: string, stage: number, item: number): string;
/** ctx.workflow child scope: `wf:<name>:<ordinal>` (ordinal counts invocations of that name). */
declare function workflowScope(parent: string, name: string, ordinal: number): string;
/** Orchestrator handle spawns nest under the orchestrator's own spawn entry: `agent:<seq>`. */
declare function agentScope(parent: string, seq: number): string;
/** PlanRunner node scopes: `plan/<NodeId>` (NodeIds are engine-minted ULIDs). */
declare function planNodeScope(nodeId: string): string;
/**
* Allocates parallel site numbers per enclosing scope: a monotonic counter
* in execution order, not source position. Because every scope body is
* sequential by construction (I3), allocation order is deterministic and
* identical on every replay.
*/
declare class ParallelSiteCounter {
  private readonly bySite;
  next(enclosingScope: string): number;
}
//#endregion
//#region src/journal/serializable.d.ts
/**
* Validates and snapshots a value for the journal: the returned value is a
* JSON round-trip clone, decoupled from later caller mutations, with
* undefined object members dropped.
*/
declare function toJournalValue(value: unknown, site: string): Json;
//#endregion
//#region src/journal/replayer.d.ts
type ReplayMode = "scoped" | "cache" | "never";
/** docs/06 Appendix A: large-value soft warn threshold (committed for M2). */
declare const LARGE_VALUE_WARN_BYTES = 262144;
interface Ledger {
  usage: Usage;
  usd: number;
  agentsSpawned: number;
}
/** Fields common to every append through the kernel. */
interface BaseAppend {
  scope: string;
  key: string;
  kind: EntryKind;
  spanId: string;
  /** Call-site label used in NonSerializableValueError messages. */
  site?: string;
}
interface SinglePhaseAppend extends BaseAppend {
  status: "ok";
  value?: unknown;
  usage?: Usage;
  servedBy?: ModelRef;
}
interface SuspendedAppend extends BaseAppend {
  deadlineAt?: string;
  value?: unknown;
}
interface TerminalPatch {
  status: Exclude<EntryStatus, "running" | "suspended">;
  value?: unknown;
  error?: WireError;
  usage?: Usage;
  usageApprox?: boolean;
  servedBy?: ModelRef;
  transcriptRef?: string;
  checkpointRef?: string;
  site?: string;
}
/**
* Per-run journal kernel front end. Everything is per instance: no module
* state anywhere (docs/02, section "Dependency rules").
*/
declare class Replayer {
  private readonly runId;
  private readonly store;
  private readonly now;
  private readonly priceUsd?;
  private readonly onWarn?;
  private readonly largeValueWarnBytes;
  private readonly entries;
  private readonly ordinals;
  private queue;
  private seq;
  constructor(options: {
    runId: string;
    store: JournalStore;
    now?: () => number;
    priceUsd?: (servedBy: ModelRef | undefined, usage: Usage) => number | undefined; /** Receives large-value soft warnings (docs/03: never an error). */
    onWarn?: (msg: string) => void;
    largeValueWarnBytes?: number;
  });
  /**
  * Value size policy (docs/03, section "Normative payload schemas"):
  * there is NO automatic offload in v1; oversized values warn and
  * proceed. Large artifacts belong in TranscriptStore by reference.
  */
  private warnIfLarge;
  /**
  * Scoped forward-matching lands with resume in M2; a fresh M1 run has no
  * prior journal, so every lookup is live by construction.
  */
  lookup(_scope: string, _key: string, _ordinal: number, _mode: ReplayMode): JournalEntry | "live";
  /** Single-phase fact entries: rand, decisions, termination facts. */
  appendSinglePhase(input: SinglePhaseAppend): Promise<JournalEntry>;
  /** Two-phase dispatch: the running entry (kinds agent, step, child). */
  appendRunning(input: BaseAppend & {
    memoizeOutcome?: boolean;
  }): Promise<JournalEntry>;
  /**
  * Two-phase completion: a terminal entry referencing the running entry
  * by ref. Scope, key, ordinal, kind, and hashVersion are inherited from
  * the running entry (running/terminal pairs are always single-version;
  * the pair shares one ordinal because it is one logical operation).
  */
  appendTerminal(runningSeq: number, patch: TerminalPatch): Promise<JournalEntry>;
  /** Suspended kinds (external, approval): appended once, closed by ref-entries (M2). */
  appendSuspended(input: SuspendedAppend): Promise<JournalEntry>;
  /**
  * The budget ledger fold (docs/03, section "Budget ledger fold on
  * resume"): usage sums over terminal entries exactly once; agentsSpawned
  * counts agent dispatches.
  */
  ledger(): Ledger;
  /** Read-only view of the appended entries, in per-run total order. */
  snapshot(): readonly JournalEntry[];
  /**
  * Resolves when every append enqueued so far has persisted. Deterministic
  * shims journal fire-and-forget; the engine awaits this before settling a
  * run.
  */
  flush(): Promise<void>;
  private mint;
  private persist;
  private enqueue;
}
//#endregion
//#region src/stores/inmemory.d.ts
declare class InMemoryStore implements JournalStore {
  private readonly runs;
  private readonly metas;
  private warned;
  append(runId: string, e: JournalEntry): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  putMeta(m: RunMeta): Promise<void>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  delete(runId: string): Promise<void>;
  private warnOnce;
}
/**
* In-memory TranscriptStore. Refs follow the `<runId>/<name>` convention
* so list(runId) can filter without a side index.
*/
declare class InMemoryTranscriptStore implements TranscriptStore {
  private readonly blobs;
  put(ref: string, blob: Bytes): Promise<void>;
  get(ref: string): Promise<Bytes | null>;
  list(runId: string): Promise<string[]>;
}
//#endregion
//#region src/stores/jsonl.d.ts
declare class JsonlFileStore implements JournalStore {
  private readonly dir;
  constructor(options: {
    dir: string;
  });
  private journalPath;
  private metaPath;
  append(runId: string, e: JournalEntry): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  private repairTornTail;
  putMeta(m: RunMeta): Promise<void>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  delete(runId: string): Promise<void>;
}
//#endregion
//#region src/model/caps.d.ts
type StructuredOutputTier = "native" | "forced-tool" | "prompt";
/**
* Strict-schema compatibility as both first-class providers define it:
* every object node declares `additionalProperties: false` and lists every
* property in `required` (docs/04, section 5.2). Boolean schemas and
* non-object shapes are trivially compatible.
*/
declare function isStrictCompatibleSchema(schema: JsonSchema | boolean): boolean;
/**
* Tier selection (docs/04, section 8.4): the model's declared ceiling
* bounds the tier; the native tier additionally requires a
* strict-compatible canonical schema (docs/04, section 5.2: relying on
* silent server-side fallback is forbidden), degrading to forced-tool.
* Prefill is not a tier.
*/
declare function selectStructuredOutputTier(caps: ModelCaps, canonicalSchema: JsonSchema): StructuredOutputTier;
/** True when `tier` is at or below the model's declared ceiling. */
declare function tierWithinCaps(tier: StructuredOutputTier, caps: ModelCaps): boolean;
//#endregion
//#region src/model/router.d.ts
/**
* Per-engine adapter registry: strictly per engine, no global mutable
* registry exists. A duplicate adapterId is a typed ConfigError
* (docs/04, section "Registry and ModelRef").
*/
declare function buildAdapterRegistry(adapters: ProviderAdapter[]): ReadonlyMap<string, ProviderAdapter>;
/**
* ModelRef is strictly 'adapterId:model', no query parameters. The wire
* model id may itself contain colons (for example ollama tags), so only
* the FIRST colon splits.
*/
declare function parseModelRef(ref: ModelRef): {
  adapterId: string;
  model: string;
};
/**
* Role effort defaults (docs/04, section "Invocation roles and firing
* protocol"): orchestrate and plan default to high; summarize and extract
* default to low. loop and finalize have NO role default: when the chain
* resolves nothing, the wire omits effort and identity records the spec
* with the effort member absent (docs/04, section "Router and resolution
* chain", as amended).
*/
declare const ROLE_EFFORT_DEFAULTS: Partial<Record<InvocationRole, Effort>>;
/** One layer's contribution to the resolution merge. */
interface ResolutionLayer {
  /** Applies to all roles at once (AgentOpts.model / profile.model). */
  model?: ModelSpec;
  /** Per-role override; wins over `model` within the same layer. */
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  /** Explicit effort field; wins over a ModelChoice-carried effort within the layer. */
  effort?: Effort;
}
/** A scrub performed by the router; surfaced as a warning-level event by the engine. */
interface ScrubNote {
  scrubbed: "effort" | "sampling";
  model: ModelRef;
  detail: string;
}
/** The resolved, scrubbed result of one invocation's resolution. */
interface ResolvedInvocation {
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
declare function resolveModelInvocation(options: {
  role: InvocationRole;
  call?: ResolutionLayer;
  profile?: ResolutionLayer;
  workflow?: ResolutionLayer;
  engine?: ResolutionLayer;
  capsOf: (ref: ModelRef) => ModelCaps;
}): ResolvedInvocation;
//#endregion
//#region src/runtime/usage-limits.d.ts
/**
* UsageLimits (M1-T06): normative limit vocabulary and the per-spawn merge.
*
* Owning spec: docs/06-execution-spec.md, section "UsageLimits
* (normative)"; defaults from Appendix A. Expiry of maxTurns, maxToolCalls,
* or timeoutMs produces the terminal status 'limit' (paid partial work);
* streamIdleTimeoutMs expiry is a retryable transport-class AgentError,
* never 'limit'. The run-level deadline is RunOptions.deadlineAt, not a
* UsageLimits field.
*/
interface UsageLimits {
  /** Default 32. */
  maxTurns?: number;
  /** Unlimited by default. */
  maxToolCalls?: number;
  /** Unlimited by default (model caps still apply). */
  maxOutputTokensPerTurn?: number;
  /** Per-agent wall clock; unlimited by default. */
  timeoutMs?: number;
  /** Gap between stream events; default 120000. */
  streamIdleTimeoutMs?: number;
}
declare const DEFAULT_MAX_TURNS = 32;
declare const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 12e4;
interface EffectiveUsageLimits {
  maxTurns: number;
  maxToolCalls?: number;
  maxOutputTokensPerTurn?: number;
  timeoutMs?: number;
  streamIdleTimeoutMs: number;
}
/**
* Limits merge per spawn: AgentOpts.limits over profile limits over engine
* defaults.limits (docs/06, section "UsageLimits").
*/
declare function mergeUsageLimits(call?: UsageLimits, profile?: UsageLimits, engine?: UsageLimits): EffectiveUsageLimits;
//#endregion
//#region src/runtime/model-retry.d.ts
declare class ModelRetry extends Error {
  readonly data?: Json;
  constructor(message: string, opts?: {
    data?: Json;
  });
}
/** Bounded semantic retries per tool call chain (docs/06, Appendix A). */
declare const DEFAULT_MODEL_RETRY_ATTEMPTS = 2;
//#endregion
//#region src/runtime/structured-output.d.ts
/** The synthesized forced-tool contract name. */
declare const EMIT_RESULT_TOOL = "emit_result";
/**
* Applies the selected tier to an outgoing request. Native rides
* ChatRequest.schema; forced-tool synthesizes a single emit_result tool
* with toolChoice pinned to it; prompt injects the schema into the last
* user message.
*/
declare function applyStructuredOutputTier(req: ChatRequest, tier: StructuredOutputTier, schema: JsonSchema): ChatRequest;
/** One collected model turn, assembled from the stream by the agent loop. */
interface CollectedTurn {
  text: string;
  toolCalls: Array<{
    id: string;
    name: string;
    args: unknown;
  }>;
}
/**
* Extracts the structured-output candidate from a collected turn per tier.
* Returns `undefined` when the turn carries no candidate (for example the
* model answered prose without the forced tool call).
*/
declare function extractCandidate(turn: CollectedTurn, tier: StructuredOutputTier): {
  raw: unknown;
} | undefined;
/** The bounded re-prompt message sent back to the model on a validation miss. */
declare function formatRePrompt(issues: Issue$1[], attempt: number, maxAttempts: number): Msg;
//#endregion
//#region src/runtime/agent-loop.d.ts
type AgentStatus = "ok" | "error" | "limit" | "cancelled" | "skipped" | "escalated";
/**
* EscalationReport is owned by docs/07 (EscalationProtocol) and its
* producers ship in M3; the field exists now so AgentResult is shaped
* once. costToDate and salvage are filled by the runtime, never the model.
*/
interface EscalationReport {
  kind: string;
  scopeDelta?: Json;
  revisedEstimate?: Json;
  blockers?: Json;
  proposedDecomposition?: Json;
  costToDate?: number;
  salvage?: Json;
}
/** Artifact: the normative shape of AgentResult.artifacts entries (docs/06, section 2.1). */
interface Artifact {
  /** Stable within the result. */
  id: string;
  /** Closed in v1. */
  kind: "file" | "patch" | "json" | "text";
  /** Telemetry only. */
  label?: string;
  /** Changed-file list (kind 'patch': worktree collect()). */
  files?: string[];
  /** TranscriptStore blob ref for offloaded content. */
  ref?: string;
  /** Inline JSON content for small values. */
  data?: Json;
}
interface AgentResult<T> {
  status: AgentStatus;
  output: T | null;
  usage: Usage;
  costUsd: number;
  turns: number;
  transcriptRef: string;
  artifacts?: Artifact[];
  error?: AgentError;
  /**
  * Human-readable detail behind `error` (provider message, first schema
  * issue): feeds the journaled WireError message. Additive to the
  * docs/06 sketch; never part of identity.
  */
  errorMessage?: string;
  /** Present if and only if status === 'escalated'. */
  escalation?: EscalationReport;
}
type EscalatedResult<T> = AgentResult<T> & {
  status: "escalated";
  escalation: EscalationReport;
};
declare function isEscalated<T>(r: AgentResult<T>): r is EscalatedResult<T>;
/** Minimal internal event sink; the typed WorkflowEvent envelope wraps it in M1-T10. */
interface RuntimeEventSink {
  emit(body: {
    type: string;
  } & Record<string, unknown>): void;
}
/** Budget hooks bound by the three-layer budget (docs/06, section "Three-layer budget"). */
interface BudgetHooks {
  /** Layer 2: before every turn; throws BudgetExhaustedError to block dispatch. */
  beforeTurn(): void;
  /** Live usage accounting; layer 3 may respond by aborting `signal`. */
  onUsage(usage: Usage, servedBy: ModelRef): void;
  /** Layer 3: the ceiling AbortSignal. */
  signal?: AbortSignal;
}
/** Reason marker distinguishing a budget-ceiling abort from host cancellation. */
declare const BUDGET_ABORT_REASON = "lurker:budget-ceiling";
interface RunAgentOptions<S extends SchemaSpec = JsonSchema> {
  prompt: string;
  schema?: S;
  /** Canonicalized JSON Schema projection of `schema` (precomputed for identity). */
  canonicalSchema?: JsonSchema;
  adapter: ProviderAdapter;
  resolved: ResolvedInvocation;
  /**
  * Separate final extract invocation, present only when the role trigger
  * protocol demands one: schema set AND (routing directs extract to a
  * different model OR the loop model's caps cannot serve the required
  * tier). Otherwise the schema rides the last loop turn (docs/06,
  * section "Agent runtime binding").
  */
  extract?: {
    adapter: ProviderAdapter;
    resolved: ResolvedInvocation;
  };
  limits: EffectiveUsageLimits;
  /** Emits agent:stream deltas when true (telemetry only). */
  stream?: boolean;
  /** Host or sibling cancellation. */
  signal?: AbortSignal;
  budget?: BudgetHooks;
  events?: RuntimeEventSink;
  transcript?: {
    mintRef(): string;
    put(ref: string, blob: Uint8Array): Promise<void>;
  };
  priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined;
  /** Bounded schema re-prompt attempts; default 2 (docs/06, Appendix A). */
  schemaRetryAttempts?: number;
  agentType?: string;
  label?: string;
  now?: () => number;
}
/**
* Runs one agent to a typed AgentResult. Never throws past policy: every
* failure mode becomes a typed status on the result.
*/
declare function runAgent<S extends SchemaSpec>(options: RunAgentOptions<S>): Promise<AgentResult<Out<S>>>;
//#endregion
//#region src/engine/budget.d.ts
type Spend = {
  usd: number;
  usage: Usage;
  agentsSpawned: number;
};
/** Last resort of the admission reserve formula (docs/06, Appendix A). */
declare const DEFAULT_FLAT_RESERVE_USD = .5;
/**
* The admission reserve for a spawn (docs/06, section "Layer 1: admission
* before spawn"): opts.estCost, else profile.estCost, else
* price(countTokens(input) + caps.maxOutputTokens), else the engine flat
* default.
*/
declare function admissionReserveUsd(options: {
  estCost?: number;
  profileEstCost?: number;
  inputTokens?: number;
  caps?: ModelCaps;
  flatReserveUsd?: number;
}): number;
/**
* The run-root budget account. All spend accounting is per instance; the
* journal remains the durable source (the ledger fold restores spend on
* resume, M2).
*/
declare class RunBudget {
  /** B0; immutable after start. Undefined means no USD ceiling. */
  readonly ceilingUsd?: number;
  private readonly lifetimeSpawnCap;
  private readonly events?;
  private readonly priceUsd?;
  private readonly controller;
  private spentUsdInternal;
  private usageInternal;
  private committedReserveUsdInternal;
  private agentsSpawnedInternal;
  private exhaustedInternal;
  constructor(options: {
    ceilingUsd?: number;
    lifetimeSpawnCap?: number;
    events?: RuntimeEventSink;
    priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined;
  });
  /** Layer 3 ceiling signal; live streams are severed through it. */
  get signal(): AbortSignal;
  get exhausted(): boolean;
  get committedReserveUsd(): number;
  /**
  * Layer 1: admission before spawn. Blocks when spent + committedReserve
  * has reached the ceiling, otherwise commits the reserve. Also enforces
  * the engine lifetime spawn cap (docs/06, section "Scheduler").
  */
  admitSpawn(reserveUsd: number): void;
  /** The reserve is replaced by real spend when the spawn settles. */
  releaseReserve(reserveUsd: number): void;
  /** Layer 2: the per-turn guard. A turn that would cross the ceiling is not dispatched. */
  beforeTurn(): void;
  /**
  * Live accounting; crossing the ceiling severs in-flight streams via the
  * layer-3 AbortSignal (overshoot bounded by one turn per in-flight
  * agent; providers bill severed streams).
  */
  onUsage(usage: Usage, servedBy: ModelRef): void;
  spent(): Spend;
  /** Null when the run has no USD ceiling (docs/06, section "Canonical Ctx interface"). */
  remaining(): Spend | null;
  private emitUpdate;
}
//#endregion
//#region src/engine/scheduler.d.ts
/**
* Scheduler and concurrency (M1-T08): the per-run semaphore with a FIFO
* queue (default 12 concurrent model calls). The engine lifetime spawn cap
* is enforced by the budget layer at admission; parallel/pipeline
* composition semantics live with ctx (docs/06, section "Scheduler").
* Per-provider concurrency keys land with M4.
*/
/** FIFO semaphore; default per-run width is 12 (docs/06, Appendix A). */
declare const DEFAULT_PER_RUN_CONCURRENCY = 12;
declare class Semaphore {
  private readonly limit;
  private active;
  private readonly waiters;
  constructor(limit: number);
  get pending(): number;
  /**
  * Acquires a slot, resolving in FIFO order. `onQueued` fires only when
  * the caller actually has to wait (feeds the agent:queued event).
  */
  acquire(onQueued?: () => void): Promise<() => void>;
  withSlot<T>(fn: () => Promise<T>, onQueued?: () => void): Promise<T>;
  private release;
}
//#endregion
//#region src/engine/ctx.d.ts
type ErrorPolicy = "strict" | "lenient";
/**
* The canonical, complete AgentProfile shape (docs/06, section
* "AgentProfile"); M1 honors description, model, routing, effort, limits,
* and estCost. A profile never carries a prompt or a schema.
*/
interface AgentProfile {
  description?: string;
  model?: ModelSpec;
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  effort?: Effort;
  limits?: UsageLimits;
  /** Admission reserve hint in USD (budget layer 1). */
  estCost?: number;
}
/**
* Per-spawn options (docs/06, section "ctx.agent and AgentOpts"). The
* identity split is normative: agentType, model/routing/effort (the
* requested modelSpec), schema (schemaHash), and key enter the content
* key; everything else is policy or telemetry and never re-keys entries.
* Fields whose machinery lands later (tools, isolation, escalation,
* lineage, ladder, retry) arrive with their milestones.
*/
interface AgentOpts<S extends SchemaSpec = SchemaSpec> {
  agentType?: string;
  /** Overrides all roles at once. */
  model?: ModelSpec;
  /** Per-role, wins over profile.routing. */
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  /** Canonical effort, part of identity. */
  effort?: Effort;
  /** schemaHash enters identity. */
  schema?: S;
  /** docs/08; enters identity. Only 'none' is executable before M3. */
  isolation?: IsolationSpec;
  /** Explicit discriminator; replaces the prompt in the content key. */
  key?: string;
  onError?: "throw" | "null";
  /** Journaled as a policy field from day one; consumed by the M2 predicate. */
  memoizeOutcome?: boolean;
  /** Admission reserve hint (USD). */
  estCost?: number;
  /** Merged over profile and engine limits (docs/06, section "UsageLimits"). */
  limits?: UsageLimits;
  result?: "value" | "full";
  /** Telemetry only. */
  label?: string;
  /** Enables agent:stream delta events. */
  stream?: boolean;
}
/** docs/06, section "Error policy and dropped results". */
interface DroppedItem {
  source: "pipeline" | "agent-onerror-null" | "parallel-settled";
  /** Scope path of the failed call. */
  scope: string;
  /** Seq of the terminal journal entry when one exists. */
  entryRef?: number;
  label?: string;
  error: WireError;
}
/**
* The discriminated union over AgentStatus carrying the underlying
* AgentResult where one exists (docs/06, section "ctx.parallel and
* Settled").
*/
type Settled<T> = {
  status: "ok";
  value: T;
  result?: AgentResult<unknown>;
} | {
  status: "error";
  error: WireError;
  result?: AgentResult<unknown>;
} | {
  status: "limit";
  result: AgentResult<unknown>;
} | {
  status: "cancelled";
  result?: AgentResult<unknown>;
} | {
  status: "skipped";
  result: AgentResult<unknown>;
} | {
  status: "escalated";
  result: AgentResult<unknown>;
};
type Stage<I, O> = (item: I) => Promise<O>;
/**
* The rejection carrier of ctx.agent value-form calls: a real Error that
* structurally satisfies the typed AgentError (docs/06, section "ctx.agent
* and AgentOpts") and carries the full AgentResult for Settled mapping.
* Deliberately not a LurkerError: AgentError is not in the closed code
* registry (docs/02, section "Error taxonomy").
*/
declare class AgentCallError extends Error implements AgentError {
  readonly kind: AgentError["kind"];
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly issues?: Issue$1[];
  readonly result: AgentResult<unknown>;
  readonly scope: string;
  readonly entryRef?: number;
  constructor(message: string, result: AgentResult<unknown>, scope: string, entryRef?: number);
}
/** Pipeline results plus the dropped evidence, returned by onItemError: 'collect'. */
interface PipelineCollected<T> {
  results: T[];
  dropped: DroppedItem[];
}
/** The canonical Ctx interface, M1 members (docs/06, section "Canonical Ctx interface"). */
interface Ctx<P extends ErrorPolicy = "strict"> {
  agent(prompt: string): Promise<P extends "lenient" ? string | null : string>;
  agent<S extends SchemaSpec>(prompt: string, o: AgentOpts<S> & {
    result: "full";
  }): Promise<AgentResult<Out<S>>>;
  agent<S extends SchemaSpec>(prompt: string, o: AgentOpts<S> & {
    onError: "throw";
  }): Promise<Out<S>>;
  agent<S extends SchemaSpec>(prompt: string, o?: AgentOpts<S>): Promise<P extends "lenient" ? Out<S> | null : Out<S>>;
  parallel<T>(tasks: Array<() => Promise<T>>, o?: {
    settle?: false;
    abortSiblings?: boolean;
  }): Promise<T[]>;
  parallel<T>(tasks: Array<() => Promise<T>>, o: {
    settle: true;
  }): Promise<Settled<T>[]>;
  pipeline<I, A>(items: I[], s1: Stage<I, A>, o: CollectOpts): Promise<PipelineCollected<A>>;
  pipeline<I, A>(items: I[], s1: Stage<I, A>, o?: PipelineOpts): Promise<A[]>;
  pipeline<I, A, B>(items: I[], s1: Stage<I, A>, s2: Stage<A, B>, o: CollectOpts): Promise<PipelineCollected<B>>;
  pipeline<I, A, B>(items: I[], s1: Stage<I, A>, s2: Stage<A, B>, o?: PipelineOpts): Promise<B[]>;
  pipeline<I, A, B, C>(items: I[], s1: Stage<I, A>, s2: Stage<A, B>, s3: Stage<B, C>, o: CollectOpts): Promise<PipelineCollected<C>>;
  pipeline<I, A, B, C>(items: I[], s1: Stage<I, A>, s2: Stage<A, B>, s3: Stage<B, C>, o?: PipelineOpts): Promise<C[]>;
  pipeline<I, A, B, C, D>(items: I[], s1: Stage<I, A>, s2: Stage<A, B>, s3: Stage<B, C>, s4: Stage<C, D>, o: CollectOpts): Promise<PipelineCollected<D>>;
  pipeline<I, A, B, C, D>(items: I[], s1: Stage<I, A>, s2: Stage<A, B>, s3: Stage<B, C>, s4: Stage<C, D>, o?: PipelineOpts): Promise<D[]>;
  pipeline<I, A, B, C, D, E>(items: I[], s1: Stage<I, A>, s2: Stage<A, B>, s3: Stage<B, C>, s4: Stage<C, D>, s5: Stage<D, E>, o: CollectOpts): Promise<PipelineCollected<E>>;
  pipeline<I, A, B, C, D, E>(items: I[], s1: Stage<I, A>, s2: Stage<A, B>, s3: Stage<B, C>, s4: Stage<C, D>, s5: Stage<D, E>, o?: PipelineOpts): Promise<E[]>;
  pipeline<I, A, B, C, D, E, F>(items: I[], s1: Stage<I, A>, s2: Stage<A, B>, s3: Stage<B, C>, s4: Stage<C, D>, s5: Stage<D, E>, s6: Stage<E, F>, o: CollectOpts): Promise<PipelineCollected<F>>;
  pipeline<I, A, B, C, D, E, F>(items: I[], s1: Stage<I, A>, s2: Stage<A, B>, s3: Stage<B, C>, s4: Stage<C, D>, s5: Stage<D, E>, s6: Stage<E, F>, o?: PipelineOpts): Promise<F[]>;
  step<T extends Json>(label: string, fn: () => Promise<T> | T, o?: {
    deps?: Json[];
    key?: string;
  }): Promise<T>;
  phase<T>(name: string, fn: () => Promise<T>): Promise<T>;
  log(level: "debug" | "info" | "warn" | "error", msg: string, data?: Json): void;
  budget: {
    spent(): Spend;
    remaining(): Spend | null;
  };
  now(): number;
  random(key?: string): number;
  uuid(): string;
}
interface PipelineOpts {
  onItemError?: "drop" | "throw";
}
interface CollectOpts {
  onItemError: "collect";
}
/** Closure-form workflow value; in-process only (docs/06, section "Execution model"). */
interface Workflow<A = unknown, R = unknown> {
  readonly kind: "workflow";
  readonly name: string;
  readonly argsSchema?: SchemaSpec<A>;
  readonly errorPolicy: ErrorPolicy;
  readonly body: (ctx: Ctx<never>, args: A) => Promise<R>;
}
declare function defineWorkflow<A, R, P extends ErrorPolicy = "strict">(meta: {
  name: string;
  args?: SchemaSpec<A>;
  errorPolicy?: P;
}, body: (ctx: Ctx<P>, args: A) => Promise<R>): Workflow<A, R>;
/**
* Span-aware event sink: bodies are stamped into the WorkflowEvent
* envelope by the per-run EventBus (M1-T10); spanId defaults to the run
* root span when omitted.
*/
interface RunEventSink {
  emit(body: {
    type: string;
  } & Record<string, unknown>, spanId?: string): void;
}
/** Mints span ids in the run > phase > agent > tool > child hierarchy. */
interface SpanMinter {
  mint(parentSpanId?: string): string;
}
/** Per-run cost attribution buckets consumed by CostReport (M1-T10/T11). */
interface CostAttribution {
  byModel: Map<string, number>;
  byPhase: Map<string, number>;
  byAgentType: Map<string, number>;
  byRole: Map<InvocationRole, number>;
  unpriced: Array<{
    model: string;
    usage: Usage;
  }>;
}
/** Everything one run's ctx needs; created per run by the engine (M1-T11). */
interface RunInternals {
  runId: string;
  replayer: Replayer;
  budget: RunBudget;
  semaphore: Semaphore;
  events: RunEventSink;
  spans: SpanMinter;
  /** The run root span; every top-level span parents on it. */
  rootSpanId: string;
  transcripts: TranscriptStore;
  adapters: ReadonlyMap<string, ProviderAdapter>;
  defaults: {
    routing?: Partial<Record<InvocationRole, ModelSpec>>;
    profiles?: Record<string, AgentProfile>;
    limits?: UsageLimits;
  };
  errorPolicy: ErrorPolicy;
  dropped: DroppedItem[];
  cost: CostAttribution;
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined;
  runSignal?: AbortSignal;
  mintTranscriptRef: () => string;
  now: () => number;
}
/**
* Creates the per-run Ctx bound to `internals`. The current scope travels
* through AsyncLocalStorage so parallel branches and pipeline stages keep
* one ctx object while journaling under their own scope paths (I3:
* structure from call-and-return only).
*/
declare function createCtx(internals: RunInternals): Ctx<ErrorPolicy>;
/**
* Runs a workflow body against a fresh ctx: the engine core that
* engine.run wraps with RunHandle, events, and outcome assembly (M1-T11).
* Validates args against the declared schema, then executes single-pass.
*/
declare function executeWorkflow<A, R>(internals: RunInternals, wf: Workflow<A, R>, args: A): Promise<R>;
//#endregion
//#region src/l0/events.d.ts
/** docs/09 section 1.4, run lifecycle and core telemetry (M1 subset). */
type CoreEvents = {
  type: "run:start";
  workflow: string;
  resumed: boolean;
} | {
  type: "run:end";
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  totalUsd: number;
} | {
  type: "phase:start";
  phase: string;
} | {
  type: "log";
  level: "debug" | "info" | "warn" | "error";
  msg: string;
  data?: Json;
} | {
  type: "budget:update";
  spentUsd: number;
  remainingUsd: number | null;
  committedReserveUsd: number;
} | {
  type: "external:waiting";
  key: string;
  entryRef: number;
  prompt?: string;
  deadlineAt?: string;
} | {
  type: "approval:pending";
  toolName: string;
  entryRef: number;
  deadlineAt?: string;
} | {
  type: "child:start";
  workflow: string;
  scope: string;
} | {
  type: "child:end";
  workflow: string;
  scope: string;
  status: string;
};
/** docs/09 section 1.4, agent lifecycle. */
type AgentEvents = {
  type: "agent:queued";
  agentType: string;
  label?: string;
} | {
  type: "agent:start";
  agentType: string;
  label?: string;
  model: string;
  role: string;
} | {
  type: "agent:end";
  agentType: string;
  label?: string;
  status: string;
  usage: Usage;
  costUsd: number;
  entryRef: number;
} | {
  type: "agent:error";
  agentType: string;
  label?: string;
  error: WireError;
  willRetry: boolean;
} | {
  type: "agent:schema-retry";
  agentType: string;
  attempt: number;
  maxAttempts: number;
} | {
  type: "agent:stream";
  delta: string;
};
/** docs/09 section 1.4, tool lifecycle (emitters arrive with the tool system, M3). */
type ToolEvents = {
  type: "tool:start";
  toolName: string;
  risk?: Json;
} | {
  type: "tool:end";
  toolName: string;
  outcome: "ok" | "error" | "denied";
  durationMs: number;
};
type WorkflowEventBody = CoreEvents | AgentEvents | ToolEvents;
/**
* The envelope (docs/09 section 1.1): seq is an independent per-run
* telemetry counter, strictly increasing in emission order and DISTINCT
* from JournalEntry.seq (never compare or join the two; entryRef fields
* carry journal seqs explicitly). ts is wall clock, telemetry only.
* replayed is true only on re-emitted journal-backed lifecycle events
* (docs/09 section 1.5); stream deltas are never re-emitted.
*/
type WorkflowEvent = {
  runId: string;
  seq: number;
  ts: string;
  spanId: string;
  parentSpanId?: string;
  replayed?: boolean;
} & WorkflowEventBody;
//#endregion
//#region src/engine/events.d.ts
/**
* Spans form a tree per run; spanId values are engine-minted opaque
* strings, unique per run, pure telemetry, never identity (docs/09,
* section "Span hierarchy").
*/
declare class SpanRegistry {
  private readonly parents;
  private counter;
  mint(parentSpanId?: string): string;
  parentOf(spanId: string): string | undefined;
}
/**
* The per-run event bus. seq is strictly increasing in emission order;
* `iterate()` yields events from subscription onward; `on()` is the
* callback form over the same stream and the same seq values.
*/
declare class EventBus {
  private readonly runId;
  private readonly spans;
  private readonly now;
  private readonly subscribers;
  private readonly listeners;
  private seq;
  private ended;
  constructor(options: {
    runId: string;
    spans: SpanRegistry;
    now?: () => number;
  });
  emit(body: WorkflowEventBody, spanId: string): WorkflowEvent;
  on<T extends WorkflowEvent["type"]>(type: T, cb: (event: Extract<WorkflowEvent, {
    type: T;
  }>) => void): () => void;
  /** Ends every open iterator once the run has settled. */
  end(): void;
  iterate(): AsyncIterable<WorkflowEvent>;
}
//#endregion
//#region src/engine/run-handle.d.ts
/** Suspensions still open at settle time; producers arrive with M2. */
interface PendingExternal {
  key: string;
  scope: string;
  entryRef: number;
  prompt?: string;
  /** Approvals and Flavor B escalations only. */
  deadlineAt?: string;
}
/** docs/09, section "CostReport". */
interface CostReport {
  totalUsd: number;
  /** Keyed by canonical ModelRef 'adapterId:model'. */
  byModel: Record<string, number>;
  /** ctx.phase names; phase is structural for this map. */
  byPhase: Record<string, number>;
  byAgentType: Record<string, number>;
  byRole: Record<InvocationRole, number>;
  /** All-zero with forcedFinish false in runs without a dynamic orchestrator. */
  orchestrator: {
    spentUsd: number; /** spentUsd / max(totalUsd, 0.01): the epsilon-floored H-OrchShare input. */
    share: number;
    wakes: number;
    forcedFinish: boolean;
    reserveUsedUsd: number;
  };
  /** Usage on models absent from pricing; never a silent zero. */
  unpriced: Array<{
    model: string;
    usage: Usage;
  }>;
}
type RunOutcome<R> = {
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  value?: R;
  error?: WireError; /** Pipeline drops and onError:'null' losses; silent losses are forbidden. */
  dropped: DroppedItem[]; /** Suspensions open at settle time (M2). */
  pending: PendingExternal[];
  usage: Usage;
  cost: CostReport;
};
/** Adds 'running' for in-flight inspection (docs/06, section "Engine and ops API"). */
type RunStatus = RunOutcome<unknown>["status"] | "running";
interface RunHandle<R> {
  runId: string;
  result: Promise<RunOutcome<R>>;
  events: AsyncIterable<WorkflowEvent>;
  on<T extends WorkflowEvent["type"]>(type: T, cb: (e: Extract<WorkflowEvent, {
    type: T;
  }>) => void): () => void;
  /** Cooperative cancellation; the run settles 'cancelled' with a complete CostReport. */
  cancel(reason?: string): Promise<void>;
}
/** Folds the per-run attribution buckets into the normative CostReport. */
declare function buildCostReport(attribution: CostAttribution, totalUsd: number): CostReport;
//#endregion
//#region src/runner/inprocess.d.ts
/**
* Source-backed workflow admissible to the worker sandbox; produced by
* compileScript (M6). Declared now so the ScriptRunner seam is shaped
* once; feeding a closure to the sandbox stays impossible by types.
*/
interface CompiledWorkflow {
  readonly kind: "compiled-workflow";
  readonly name: string;
  readonly source: string;
  readonly errorPolicy: ErrorPolicy;
}
interface ScriptRunner {
  execute<A, R>(wf: Workflow<A, R> | CompiledWorkflow, ctx: Ctx<never>, args: A): Promise<R>;
}
/** Escalation hook shape; consumed from M3 (docs/06, section 2.10). */
type OnEscalation = (report: unknown) => unknown;
/**
* The mode (a) runner for human-authored closures. Determinism is enforced
* by convention, lint, and the ctx shims, NOT by a VM: only the sequence
* of keys must be stable. Dev mode (NODE_ENV !== 'production') patches
* Date.now and Math.random for the duration of execute to emit one warning
* per run pointing at ctx.now()/ctx.random(); the patch preserves behavior
* and restores the prior functions on exit (nesting-safe by capturing the
* prior value; concurrent runs may lose the warning, never correctness).
*/
declare class InProcessRunner implements ScriptRunner {
  private readonly onEscalation?;
  constructor(o?: {
    onEscalation?: OnEscalation;
  });
  /** The hook is read by the escalation delivery path from M3 onward. */
  get escalationHook(): OnEscalation | undefined;
  execute<A, R>(wf: Workflow<A, R> | CompiledWorkflow, ctx: Ctx<never>, args: A): Promise<R>;
}
//#endregion
//#region src/engine/engine.d.ts
interface EngineDefaults {
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  profiles?: Record<string, AgentProfile>;
  limits?: UsageLimits;
}
interface BudgetDefaults {
  /** Last resort of the admission reserve formula; default 0.50. */
  flatReserveUsd?: number;
  /** Engine kill switch; default 500 spawns per run. */
  lifetimeSpawnCap?: number;
}
interface CreateEngineOptions {
  adapters: ProviderAdapter[];
  stores?: {
    /** Default InMemoryStore (resume disabled, loud warning). */journal?: JournalStore;
    transcripts?: TranscriptStore;
  };
  defaults?: EngineDefaults;
  budgetDefaults?: BudgetDefaults;
  concurrency?: {
    perRun?: number;
  };
  /**
  * KeyDeriver registry extension (docs/03, section "hashVersion").
  * Plumbed now, consumed by the matching kernel from M2.
  */
  extraDerivers?: readonly unknown[];
}
interface RunOptions {
  /** Explicit id; otherwise the engine mints a ULID. */
  runId?: string;
  /** Run ceiling B0; immutable after start. */
  budgetUsd?: number;
  /** Run-level defaults merged over engine defaults. */
  limits?: UsageLimits;
  /** Run-level deadline (ISO 8601); crossing cancels the run. */
  deadlineAt?: string;
  name?: string;
  tags?: string[];
  /** Host-initiated cancellation. */
  signal?: AbortSignal;
}
interface Engine {
  run<A, R>(wf: Workflow<A, R>, args: A, opts?: RunOptions): RunHandle<R>;
  /** Lands with the journal kernel in M2; throws a typed ConfigError until then. */
  resume(runId: string, wf?: Workflow<unknown, unknown> | CompiledWorkflow): RunHandle<unknown>;
}
/** Content hash of an in-process workflow body (run-to-definition binding, docs/06 10.2). */
declare function hashWorkflowBody(wf: Workflow<never, never> | Workflow<unknown, unknown>): string;
declare function createEngine(options: CreateEngineOptions): Engine;
//#endregion
export { AbandonPayload, AgentCallError, AgentError, type AgentEvents, AgentIdentityInput, AgentOpts, AgentProfile, AgentResult, AgentStatus, ApprovalIdentityInput, Artifact, BUDGET_ABORT_REASON, BudgetDefaults, BudgetExhaustedError, BudgetHooks, type Bytes, CURRENT_HASH_VERSION, CacheHint, CacheTtl, CanonicalId, CanonicalLadderSpec, CanonicalModelSpec, ChatEvent, ChatRequest, ChildIdentityInput, CollectOpts, CollectedTurn, CompiledWorkflow, ConfigError, type CoreEvents, CostAttribution, CostReport, CreateEngineOptions, Ctx, DEFAULT_FLAT_RESERVE_USD, DEFAULT_MAX_TURNS, DEFAULT_MODEL_RETRY_ATTEMPTS, DEFAULT_PER_RUN_CONCURRENCY, DEFAULT_STREAM_IDLE_TIMEOUT_MS, DroppedItem, EMIT_RESULT_TOOL, EMPTY_SCHEMA_HASH, EMPTY_TOOLSET_HASH, EffectiveUsageLimits, Effort, Engine, EngineDefaults, EntryKind, EntryRef, EntryStatus, ErrorCode, ErrorPolicy, EscalatedResult, EscalationReport, EventBus, ExternalIdentityInput, FinishInfo, Gate, HashVersion, IdentityInput, InMemoryStore, InMemoryTranscriptStore, InProcessRunner, InvalidResolutionError, InvocationRole, type IsolationProvider, type IsolationSpec, Issue$1 as Issue, JournalCompatSubCode, JournalCompatibilityError, JournalEntry, JournalMissError, JournalOrderViolation, type JournalStore, type Json, JsonSchema, JsonlFileStore, LARGE_VALUE_WARN_BYTES, LadderSpec, type LeasableStore, type Lease, LeaseHeldError, Ledger, LurkerError, LurkerErrorCode, type ModelCaps, ModelChoice, ModelRef, ModelRetry, ModelSpec, Msg, NonSerializableValueError, OnEscalation, OrchestratorCapConfigError, Out, ParallelSiteCounter, Part, PendingExternal, PipelineCollected, PipelineOpts, PlanInvariantError, type Pricing, type ProviderAdapter, ROLE_EFFORT_DEFAULTS, ROOT_SCOPE, RandIdentityInput, RandPayload, RefusalInfo, ReplayMode, ReplayPlanHashMismatch, Replayer, ResolutionLayer, ResolutionPayload, ResolvedInvocation, Role, RunAgentOptions, RunBudget, RunEventSink, type RunFilter, RunHandle, RunInternals, type RunMeta, RunOptions, RunOutcome, RunStatus, RuntimeEventSink, SchemaPair, SchemaSpec, SchemaValidationResult, ScriptRejected, ScriptRunner, ScrubNote, Semaphore, Settled, SinglePhaseAppend, SpanMinter, SpanRegistry, Spend, Stage, type StandardJSONSchemaV1, type StandardSchemaV1, StepIdentityInput, StructuredOutputTier, SuspendedAppend, TerminalPatch, ToolChoice, ToolContract, type ToolEvents, type TranscriptStore, TriggerClass, Usage, UsageLimits, WireError, Workflow, type WorkflowEvent, type WorkflowEventBody, admissionReserveUsd, agentErrorFromWire, agentErrorToWire, agentScope, applyStructuredOutputTier, buildAdapterRegistry, buildCostReport, canonicalizeSchema, createCanonicalIdMinter, createCtx, createEngine, defineWorkflow, deriveContentKey, executeWorkflow, extractCandidate, formatRePrompt, hashWorkflowBody, identityJcs, isEscalated, isSchemaPairSpec, isStandardSchemaSpec, isStrictCompatibleSchema, mergeUsageLimits, modelSpecIdentity, normalizeEntry, parallelScope, parseModelRef, pipelineScope, planNodeScope, projectToJsonSchema, resolveModelInvocation, runAgent, schemaHash, schemaHashOfSpec, selectStructuredOutputTier, tierWithinCaps, toJournalValue, toolsetHash, validateSchemaSpec, workflowScope };