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
/** The journaled by-source of a resolution (docs/03, section 8.6 mapping table). */
type ResolutionBy = "external" | "timeout" | "class_decision" | "operator" | "quiescence" | "engine_fallback";
/** Payload of resolution ref-entries (docs/03, section 8.6; DEF-4). */
type ResolutionPayload = {
  /** Duplicates ref for self-description. */target: number;
  by: ResolutionBy; /** awaitExternal resolution / EscalationDecision / WakeDigest. */
  value: Json; /** Seq of the class-level EscalationDecision when by = 'class_decision'. */
  decisionRef?: number; /** Lineage-fold attribution (DEF-3, M7). */
  logicalTaskId?: string; /** Only on escalation resolutions (DEF-3, M7). */
  countsAgainstLimit?: boolean;
};
/** Payload of abandon ref-entries (docs/03, section 8.6; DEF-4/DEF-5). */
type AbandonPayload = {
  /** Seq of the abandoned branch's spawn entry. */target: number; /** Seq of the plan.revision or decision entry sanctioning it. */
  authorizedBy: number;
  nodeId?: string;
  logicalTaskId?: string;
  reason: string; /** Default true (DEF-5). */
  retainCheckpoint?: boolean; /** Default false; counts against the pin cap (DEF-5). */
  retainWorktree?: boolean;
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
  checkpointRef?: string;
  /**
  * Terminal agent entries: the Artifact list (worktree patch refs and
  * inline values); rides the terminal payload so replay reconstructs
  * AgentResult.artifacts without live calls (docs/06, section 2.1).
  */
  artifacts?: Json;
  /**
  * Terminal escalated entries ONLY: the schema-validated
  * EscalationReport with runtime-filled costToDate and salvage; replay
  * synthesizes the byte-identical report from here (docs/03, section
  * 5.4; DEF-1).
  */
  escalation?: Json; /** Only when kind === 'resolution'. */
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
//#region src/l0/spi/toolsource.d.ts
/**
* Declarative risk metadata on the tool contract. Policy input, not
* identity: it does NOT enter toolsetHash (docs/08, section "Risk
* metadata and permission presets").
*/
type ToolRisk = "read" | "write" | "network" | "execute" | "destructive";
/**
* The context handed to execute (and to permission hooks and canUseTool).
* Deliberately exposes NO spawn primitives: tools are leaves of the
* call-and-return tree (invariant I3); all spawning flows through Ctx
* primitives (docs/08, section "ToolContext").
*/
interface ToolContext {
  runId: string;
  /** Tool span in the run > phase > agent > tool hierarchy (docs/09). */
  spanId: string;
  agent: {
    agentType: string;
    label?: string;
  };
  /** Isolation working directory; host cwd under isolation 'none'. */
  cwd: string;
  /** The spawn's declared isolation. */
  isolation: IsolationSpec;
  /** Fires on cancellation, budget ceiling, UsageLimits expiry. */
  signal: AbortSignal;
  /** Emits telemetry log events; never writes journal entries. */
  log(level: "debug" | "info" | "warn" | "error", msg: string, data?: Json): void;
}
/**
* Where execute runs. A declared capability consumed by dispatch and
* policy; only 'inprocess' is enforced in v1, subprocess/container remain
* declared capability until the executor spec closes (docs/08, section
* "Executors"; OQ in docs/14).
*/
type ToolExecutor = "inprocess" | "subprocess" | "container";
/**
* A defined tool. The identity projection is the ToolContract
* { name, description, parameters, version }: exactly what the model sees
* and exactly what toolsetHash hashes; execute and every other
* non-contract field are excluded by construction (docs/08, section
* "tool() definition and ToolDef").
*/
interface ToolDef<S extends SchemaSpec = SchemaSpec> {
  readonly kind: "tool";
  readonly name: string;
  readonly description: string;
  readonly parameters: S;
  /** Opaque contract version; part of toolsetHash (docs/08, section 1.2). */
  readonly version?: string;
  /** Default 'inprocess'. */
  readonly executor: ToolExecutor;
  /** Default false; the terminal permission default asks when true. */
  readonly needsApproval: boolean;
  readonly risk?: ToolRisk;
  execute: (input: Out<S>, ctx: ToolContext) => Promise<unknown>;
}
/** Session handle passed to ToolSource.tools (minimal in v1; audited at M9). */
interface ToolSourceSession {
  runId: string;
}
/**
* The ToolSource seam: tools() yields the source's current ToolDefs. The
* toolset snapshot for a given agent spawn is captured at spawn time and
* hashed into the spawn's identity via toolsetHash; a mid-run change MUST
* NOT mutate an in-flight agent's toolset (docs/08, section "MCP bus").
*/
interface ToolSource {
  id: string;
  tools(session: ToolSourceSession): Promise<ToolDef[]>;
}
//#endregion
//#region src/tools/tool.d.ts
/** First-party provider tool-name constraint intersection (docs/08, section 1.1). */
declare const TOOL_NAME_PATTERN: RegExp;
interface ToolInit<S extends SchemaSpec> {
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
declare function tool<S extends SchemaSpec>(init: ToolInit<S>): ToolDef<S>;
/**
* The identity projection: the contract tuple that enters toolsetHash.
* parameters is the canonicalized derived JSON Schema (docs/03, section
* "schemaHash and toolsetHash derivation").
*/
declare function toolContract(def: ToolDef): ToolContract;
//#endregion
//#region src/tools/toolset-hash.d.ts
/** The per-spawn tools option value domain (docs/06, section "ctx.agent and AgentOpts"). */
type ToolsOption = ReadonlyArray<ToolDef | ToolSource | string>;
/** The spawn's frozen toolset snapshot plus its identity hash. */
interface ResolvedToolset {
  tools: ToolDef[];
  contracts: ToolContract[];
  hash: string;
}
/** The empty toolset (no tools declared anywhere). */
declare function emptyToolset(): ResolvedToolset;
/**
* Expands sources, validates every tool name and duplicate names across
* the whole toolset (ConfigError at spawn time; docs/08 sections 1.1 and
* 6.4), and computes the toolsetHash over contracts sorted by name.
*/
declare function resolveToolset(specs: ToolsOption | undefined, session: ToolSourceSession): Promise<ResolvedToolset>;
//#endregion
//#region src/tools/context.d.ts
interface ToolContextSeed {
  runId: string;
  agentType: string;
  label?: string;
  /** Isolation working directory; the host cwd under isolation 'none'. */
  cwd: string;
  isolation: IsolationSpec;
  /** Fires on cancellation, budget ceiling, UsageLimits expiry. */
  signal: AbortSignal;
  /** Mints the tool span under the agent span. */
  mintSpan(): string;
  emitLog(spanId: string, level: "debug" | "info" | "warn" | "error", msg: string, data?: Json): void;
}
/** Builds the per-call ToolContext; one fresh span per tool call. */
declare function buildToolContext(seed: ToolContextSeed): ToolContext;
//#endregion
//#region src/tools/mcp.d.ts
interface McpConfig {
  transport: "stdio" | "streamable-http" | "inprocess";
  /** stdio: child process to spawn. */
  command?: string;
  args?: string[];
  /** streamable-http: server endpoint. */
  url?: string;
  /** inprocess: in-memory server instance (anything with connect()). */
  server?: unknown;
  /** Tool-name filter on ORIGINAL names; omitted = all. */
  allow?: string[];
  /** Deny wins over allow (pre-prefix names). */
  deny?: string[];
  /** Namespaces imported names as `${prefix}_${name}` (docs/08 6.4). */
  prefix?: string;
  /** true = every imported tool needsApproval; record form is per name. */
  approval?: boolean | Record<string, boolean>;
  /** Host-supplied risk labels for imported tools (docs/08 6.2). */
  risk?: Record<string, ToolRisk>;
}
/**
* Imports MCP tools as a ToolSource. The client connects lazily on the
* first tools() call; tools/list is fetched with cursor pagination until
* exhaustion and cached per session; a listChanged notification
* invalidates the cache, affecting subsequently spawned agents only (a
* spawn's toolset snapshot is immutable by construction; docs/08 6.3).
*/
declare function mcp(cfg: McpConfig): ToolSource;
//#endregion
//#region src/tools/isolation.d.ts
/** docs/06 Appendix A: the shared pin cap (park/unpark and retainWorktree). */
declare const DEFAULT_MAX_PINNED_WORKTREES = 4;
interface GitWorktreeProviderOptions {
  /** Host repository root; default process.cwd(). */
  repoRoot?: string;
  /**
  * Retain the tree of a FAILED agent for inspection when the engine
  * requests keep on dispose (docs/08, section 8.3). Default false.
  */
  keepOnError?: boolean;
  /** Pin cap shared by park/unpark and retainWorktree (default 4). */
  maxPinnedWorktrees?: number;
  /** Warning sink (cap overflow); defaults to process.emitWarning. */
  onWarn?: (msg: string) => void;
}
/**
* The shipped git worktree lifecycle. A non-git host is a typed
* ConfigError at acquire (docs/08, section 8.3, rule 1).
*/
declare class GitWorktreeProvider implements IsolationProvider {
  private readonly repoRoot;
  private readonly keepOnError;
  private readonly maxPinned;
  private readonly onWarn;
  private readonly pinned;
  constructor(options?: GitWorktreeProviderOptions);
  /** Trees currently retained under the pin cap. */
  get pinnedWorktrees(): ReadonlySet<string>;
  acquire(spawn: {
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
* The canonical identity object of an IdentityInput under the hashVersion
* 2 profile: what JCS serializes and sha256 hashes. The agent kind
* projects modelSpec through modelSpecIdentity; every other kind
* serializes its fields verbatim. Fields not listed for a kind are never
* included (the types make them unrepresentable).
*/
declare function projectIdentity(input: IdentityInput): Record<string, unknown>;
/** The JCS form of an IdentityInput under the hashVersion 2 profile. */
declare function identityJcs(input: IdentityInput): string;
/**
* key = sha256(JCS(IdentityInput)) (docs/03, section "Content key").
*/
declare function deriveContentKey(input: IdentityInput): string;
//#endregion
//#region src/journal/checkpoint.d.ts
/** Leading format byte of the v1 checkpoint blob. */
declare const CHECKPOINT_FORMAT_V1 = 1;
/**
* Mid-turn suspension state (M3-T03): the turn's already-executed tool
* results plus the call awaiting an approval resolution, so resume
* continues the SAME turn without re-running executed tools.
*/
interface PendingToolTurn {
  /** tool-result parts already produced this turn, in execution order. */
  executed: Array<{
    id: string;
    name: string;
    result: unknown;
    isError?: boolean;
  }>;
  /** The model-issued call whose ask verdict suspended the turn. */
  awaiting: {
    id: string;
    name: string;
    args: unknown;
  };
  /** Calls after the awaiting one, still to execute on resume. */
  remaining: Array<{
    id: string;
    name: string;
    args: unknown;
  }>;
}
/** The canonical-history snapshot at a turn boundary. */
interface CheckpointState {
  v: 1;
  /** Canonical history up to and including the boundary. */
  messages: Msg[];
  /** Model turns already paid. */
  turns: number;
  /** Usage accumulated so far (not yet journaled: terminals carry totals). */
  usage: Usage;
  toolCallsUsed: number;
  schemaAttempts: number;
  /** Compaction points; producers arrive with M4-T03. */
  compaction: number[];
  /** Present while an ask suspension holds the turn open (M3-T03). */
  pending?: PendingToolTurn;
}
/** Deterministic checkpoint blob ref for an agent dispatch (running seq). */
declare function checkpointRefFor(runId: string, runningSeq: number): string;
/** Serializes a checkpoint to its blob: format byte then UTF-8 JSON. */
declare function encodeCheckpoint(state: CheckpointState): Uint8Array;
/**
* Decodes a checkpoint blob. Returns undefined for an empty blob or an
* unknown format byte: a resume never trusts a checkpoint it cannot
* parse; the dangling dispatch reruns from the top instead (at-least-once
* is the documented floor).
*/
declare function decodeCheckpoint(blob: Uint8Array): CheckpointState | undefined;
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
/** A parsed scope-path segment (docs/03, section 2.1). */
type ScopeSegment = {
  kind: "parallel";
  site: number;
  branch: number;
} | {
  kind: "pipeline";
  stage: number;
  item: number;
} | {
  kind: "workflow";
  name: string;
  ordinal: number;
} | {
  kind: "agent";
  seq: number;
} | {
  kind: "plan-node";
  nodeId: string;
};
/**
* Parses a scope path against the frozen grammar (M2-T04):
*
*   scope-path   ::= "" | scope-path "/" segment
*   segment      ::= "par:" site ":" branch
*                  | "pipe:" stage ":" item
*                  | "wf:" name ":" ordinal
*                  | "agent:" seq
*                  | "plan" ("/" NodeId follows as its own segment)
*   NodeId       ::= Crockford ULID (26 chars)
*
* Registered workflow names may contain ':' (the ordinal is the final
* segment field). Throws on malformed paths.
*/
declare function parseScopePath(path: string): ScopeSegment[];
/** Serializes parsed segments back to the canonical path (round-trip). */
declare function formatScopePath(segments: readonly ScopeSegment[]): string;
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
//#region src/journal/matching.d.ts
/** One logical journaled operation: its dispatch entry plus its terminal, when present. */
interface JournalOperation {
  running: JournalEntry;
  terminal?: JournalEntry;
}
/**
* Versioned key derivation for matching: the live call is compared
* against every unconsumed entry with the key computed UNDER THAT ENTRY'S
* VERSION; 'incomparable' is a guaranteed non-match (docs/03, section
* 4.4). M2-T05 supplies the real registry; the default ring knows only
* the current version.
*/
/** A derived key, or the guaranteed non-match marker. */
type DerivedKey = {
  key: string;
} | "incomparable";
interface KeyRing {
  keyFor(identity: IdentityInput, hashVersion: number): DerivedKey;
}
declare function currentOnlyKeyRing(): KeyRing;
type OperationDisposition = "replay" | "rerun" | "skip";
/** The round-1 interim disposition; replaced by replayDisposition (M2-T06). */
declare function roundOneDisposition(op: JournalOperation): OperationDisposition;
type MatchResult = {
  kind: "replay";
  running: JournalEntry;
  terminal: JournalEntry;
} | {
  kind: "skip";
  running: JournalEntry;
  terminal?: JournalEntry;
} | {
  /** A dangling running entry: redispatch live; the terminal reuses running.seq. */kind: "rerun-dangling";
  running: JournalEntry;
} | {
  /** A terminal non-replayable entry: rerun live as a fresh operation. */kind: "rerun";
  running: JournalEntry;
} | {
  kind: "live";
};
interface ResumeReport {
  hits: number;
  misses: number;
  skipped: number;
  reruns: number;
  /** Journaled operations never consumed by any live call (deleted calls). */
  orphaned: number[];
}
/**
* The matching engine over a loaded journal. Consumption is per logical
* operation (running/terminal pairs count once); candidates are consumed
* in journal order, first unconsumed match wins (this also resolves
* cross-version double matches deterministically).
*/
declare class JournalMatcher {
  private readonly byScope;
  private readonly all;
  private readonly consumed;
  private readonly keyRing;
  private disposition;
  private readonly keyCache;
  private hitsInternal;
  private missesInternal;
  private skippedInternal;
  private rerunsInternal;
  constructor(entries: readonly JournalEntry[], options?: {
    keyRing?: KeyRing;
    disposition?: (op: JournalOperation) => OperationDisposition;
  });
  /** M2-T06 swaps in the full DEF-1 predicate after folds are built. */
  setDisposition(disposition: (op: JournalOperation) => OperationDisposition): void;
  private keyOf;
  /**
  * Forward-matches one live call. A miss does not advance any cursor and
  * does not extinguish future hits: the scan always starts at the scope
  * head and skips consumed operations, so insertion stability holds by
  * construction (docs/03, section 7.1).
  */
  match(scope: string, identity: IdentityInput, mode: "scoped" | "cache" | "never"): MatchResult;
  /** Marks an operation consumed without matching (fold-driven paths). */
  consume(runningSeq: number): void;
  report(): ResumeReport;
}
//#endregion
//#region src/journal/keyderiver.d.ts
/** The projected, JCS-serializable identity under one profile. */
type CanonicalIdentity = Record<string, unknown>;
/**
* Per-effective-status disposition rules; DATA on the profile, consumed
* only by the single canonical replayDisposition function (docs/03,
* section 4.2: there is NO replayAction method).
*/
type DispositionRule = "replay" | "rerun" | "memoize-limit" | "memoize-task-error";
type DispositionTable = Readonly<Partial<Record<"ok" | "escalated" | "limit" | "error" | "cancelled" | "running", DispositionRule>>>;
interface KeyDeriver {
  readonly hashVersion: HashVersion;
  /** Features not expressible in this profile yield 'incomparable' (a guaranteed non-match). */
  project(input: IdentityInput): CanonicalIdentity | "incomparable";
  deriveKey(c: CanonicalIdentity): string;
  schemaHash(schema: JsonSchema): string;
  toolsetHash(tools: ToolContract[]): string;
  readonly dispositionTable: DispositionTable;
  readonly foldDefaults: Readonly<{
    effort: Effort;
    memoizeOutcome: boolean;
    budgetAccount: "root";
  }>;
}
/** The current (hashVersion 2) frozen profile. */
declare const deriverV2: KeyDeriver;
/**
* The frozen v1 (round 1) profile: the projection removes effort from the
* requested modelSpec (the v1 predicate is effort-insensitive by
* construction); features outside the v1 domain are incomparable.
*/
declare const deriverV1: KeyDeriver;
type DeriverRegistry = ReadonlyMap<HashVersion, KeyDeriver>;
/**
* Builds the per-engine deriver registry: the shipped v1/v2 profiles plus
* EngineOptions.extraDerivers, the ONLY window extender (docs/03, section
* 4.5). A malformed extra deriver is a ConfigError before any run effect.
*/
declare function buildDeriverRegistry(extraDerivers?: readonly unknown[]): DeriverRegistry;
/**
* The one compatibility scan: immediately after load, strictly BEFORE any
* live call, any append, and any admission reserve; repeated at lease
* acquire in queue mode (docs/03, section 4.5). Side-effect free.
*/
declare function scanJournalCompatibility(runId: string, entries: readonly JournalEntry[], registry: DeriverRegistry): void;
/**
* KeyRing over the registry: the live call is projected DOWN into the
* profile of the stored entry; there is no upward canonization (docs/03,
* section 4.7).
*/
declare function registryKeyRing(registry: DeriverRegistry): KeyRing;
//#endregion
//#region src/journal/disposition.d.ts
type ReplayDisposition = OperationDisposition;
interface AbandonFold {
  /** Projection of the DEF-4 first-wins fold over kind 'abandon' entries. */
  isAbandoned(ref: number): boolean;
}
type ErrorClass = "transport" | "task";
/**
* task-class: schema-mismatch, terminal, non-retryable tool. transport,
* rate-limit, and budget are never memoized (docs/03, section 6.4).
*/
declare function classifyAgentError(e: AgentError): ErrorClass;
/**
* Builds the AbandonFold in ONE pass at load, in append order, pinned for
* the entire resume (DEF-1 ordering rule 4). Coverage is the target seq
* itself plus, transitively, every entry under the target's child
* scope-prefix (docs/03, sections 6.2 and 8.4). Repeated abandons over an
* already-covered target fold to noop.
*/
declare function buildAbandonFold(entries: readonly JournalEntry[]): AbandonFold;
/**
* The single canonical predicate, dispatched on the entry's own
* hashVersion (compatibility lemma: on the v1 domain the tables
* coincide). Suspended entries are outside the table (the DEF-4 fold
* consumes them); the alias column (DEF-5) activates with node.link
* producers in M7: a skipped entry WITHOUT an incoming alias is always
* skipped.
*/
declare function replayDisposition(entry: JournalEntry, fold: AbandonFold, options?: {
  registry?: DeriverRegistry;
  terminal?: JournalEntry;
  invalidated?: ReadonlySet<number>;
}): ReplayDisposition;
/**
* Adapts the predicate to the matcher's disposition hook: two-phase
* operations dispatch on their terminal, single-phase on themselves.
*/
declare function dispositionHook(fold: AbandonFold, registry: DeriverRegistry, invalidated?: ReadonlySet<number>): (op: JournalOperation) => ReplayDisposition;
//#endregion
//#region src/journal/resolution.d.ts
type ResolutionAttempt = {
  by: ResolutionBy;
  value: Json;
  decisionRef?: number;
};
type AbandonAttempt = {
  target: number;
  authorizedBy: number;
  nodeId?: string;
  reason: string;
  retainCheckpoint?: boolean;
  retainWorktree?: boolean;
};
type ResolutionOutcome = {
  applied: true;
  seq: number;
} | {
  applied: false;
  seq: number;
  supersededBy: number;
  reason: "already_resolved" | "target_abandoned";
};
type SuspensionState = {
  state: "suspended";
  deadlineAt?: string;
} | {
  state: "resolved";
  by: number;
  value: Json;
} | {
  state: "abandoned";
  by: number;
};
/** Fold classification of one ref-entry; NEVER persisted (docs/03, section 8.4). */
type RefEntryClassification = {
  classification: "applied";
} | {
  classification: "noop";
  supersededBy: number;
  reason: "already_resolved" | "target_abandoned";
} | {
  classification: "invalid";
  detail: string;
};
/**
* The first-closing-wins fold over a loaded journal: one pass by seq,
* bit-identical on every store returning the same entries. Resolution
* values are validated at consumption against the schema pinned INSIDE
* the suspended entry payload (canonical bare JSON Schema); a
* schema-invalid offline resolution classifies invalid and does NOT close
* the target. Abandon coverage is the target seq plus the transitive
* child scope-prefix; the AbandonFold consumed by the replay predicate is
* a projection of THIS fold (docs/03, section 6.2: not a separate pass).
*/
declare class ResolutionFold {
  private readonly targets;
  private readonly bySeq;
  private readonly classifications;
  private readonly coveredSeqs;
  private readonly coveredPrefixes;
  constructor(entries: readonly JournalEntry[]);
  private isCoveredEntry;
  private applyResolution;
  private applyAbandon;
  /** Registers a live-appended suspended entry with the fold. */
  registerSuspended(entry: JournalEntry): void;
  /** Registers a live-appended ref-entry, returning its classification. */
  registerRefEntry(entry: JournalEntry): RefEntryClassification;
  /** Registers any other live-appended entry (abandon coverage needs scopes). */
  registerEntry(entry: JournalEntry): void;
  suspensionState(target: number): SuspensionState;
  classificationOf(seq: number): RefEntryClassification | undefined;
  /** Invalid offline resolutions surfaced in the resume report. */
  invalidResolutions(): Array<{
    seq: number;
    detail: string;
  }>;
  /** The AbandonFold projection consumed by the replay predicate. */
  get abandonFold(): AbandonFold;
  /** Open suspended entries (for pending[] and re-arming at resume). */
  openSuspensions(): JournalEntry[];
}
/** The append surface the arbiter drives (implemented by the Replayer). */
interface RefEntryAppender {
  appendRefEntry(input: {
    kind: "resolution" | "abandon";
    ref: number;
    scope: string;
    spanId: string;
    resolution?: ResolutionPayload;
    abandon?: AbandonPayload;
  }): Promise<JournalEntry>;
}
/**
* Per-run, per-target FIFO serializer of resolution/abandon attempts
* (docs/03, section 8.5): classification against the in-memory fold ->
* durable append -> settle exactly once; losing attempts are ALSO
* appended and become journaled noops by fold classification. Winner
* effects run strictly after the critical section (the caller's job).
* Cross-process protection remains the LeasableStore fencing epoch.
*/
declare class ResolutionArbiter {
  private readonly fold;
  private readonly appender;
  private readonly queues;
  constructor(fold: ResolutionFold, appender: RefEntryAppender);
  private enqueue;
  submitResolution(target: number, targetScope: string, spanId: string, attempt: ResolutionAttempt): Promise<ResolutionOutcome>;
  submitAbandon(targetScope: string, spanId: string, attempt: AbandonAttempt): Promise<ResolutionOutcome>;
}
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
  /** Terminal agent entries: Artifact list (docs/06, section 2.1). */
  artifacts?: unknown;
  /** Terminal escalated entries: the validated EscalationReport. */
  escalation?: unknown;
  /**
  * Engine-decided terminal abort classes (the no-progress abort) stamp
  * memoizeOutcome on the TERMINAL entry so the frozen memoize rules
  * replay them on every resume; the running entry keeps the user's
  * policy verbatim (docs/03, section 6.6, M3 amendment).
  */
  memoizeOutcome?: boolean;
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
  private readonly matcher;
  private readonly foldInternal;
  private readonly arbiter;
  private readonly strict;
  private readonly invalidated;
  private queue;
  private seq;
  constructor(options: {
    runId: string;
    store: JournalStore;
    now?: () => number;
    priceUsd?: (servedBy: ModelRef | undefined, usage: Usage) => number | undefined; /** Receives large-value soft warnings (docs/03: never an error). */
    onWarn?: (msg: string) => void;
    largeValueWarnBytes?: number; /** The loaded, normalized prior journal (resume; docs/03 section 7). */
    priorEntries?: readonly JournalEntry[];
    keyRing?: KeyRing;
    disposition?: (op: JournalOperation) => OperationDisposition; /** Replay-strict: any live-class match throws JournalMissError. */
    strict?: boolean;
  });
  /**
  * Forward-matches one live call against the prior journal (docs/03,
  * section 7). Fresh runs always miss; the M2-T06 predicate is injected
  * through setDisposition once folds are built.
  */
  match(scope: string, identity: IdentityInput, mode: ReplayMode): MatchResult;
  setDisposition(disposition: (op: JournalOperation) => OperationDisposition): void;
  /**
  * invalidate/retry (docs/03, section 6.5): explicit unpinning of a
  * memoized failure; the invalidated entry reruns on this resume. The
  * safety boundary is an open question (docs/14).
  */
  invalidate(seq: number): void;
  get invalidatedSeqs(): ReadonlySet<number>;
  resumeReport(): ResumeReport;
  /** The DEF-4 fold over this run's journal (prior plus live appends). */
  get fold(): ResolutionFold;
  /** Ref-entry append used by the ResolutionArbiter; O2-checked by shape validation. */
  appendRefEntry(input: {
    kind: "resolution" | "abandon";
    ref: number;
    scope: string;
    spanId: string;
    resolution?: ResolutionPayload;
    abandon?: AbandonPayload;
  }): Promise<JournalEntry>;
  /**
  * Submits a resolution attempt through the per-target FIFO arbiter
  * (docs/03, section 8.7). Losing attempts are journaled noops.
  */
  resolveSuspended(target: number, attempt: ResolutionAttempt): Promise<ResolutionOutcome>;
  abandonBranch(attempt: AbandonAttempt): Promise<ResolutionOutcome>;
  /** Pure fold view, snapshot-pinned (docs/03, section 8.7). */
  suspensionState(target: number): SuspensionState;
  /**
  * Value size policy (docs/03, section "Normative payload schemas"):
  * there is NO automatic offload in v1; oversized values warn and
  * proceed. Large artifacts belong in TranscriptStore by reference.
  */
  private warnIfLarge;
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
//#region src/journal/kinds.d.ts
/**
* Validates the shape the engine is about to append. Returns issues;
* empty means valid. Unknown kinds are rejected here (the engine never
* writes them); stores still pass them through on read.
*/
declare function validateEntryShape(entry: JournalEntry): Issue$1[];
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
//#region src/runtime/escalation.d.ts
/** Closed in v1 (docs/07, section 6.3). */
type EscalationKind = "scope_bigger" | "scope_different" | "blocked_with_evidence";
/**
* Minimal TaskSpec stand-in: the full typed TaskSpec is owned by the
* PlanRunner surface (docs/07, section 4.1) and ships with M7; script
* modes carry proposals opaquely until then.
*/
type TaskSpec = Json;
interface EscalationReport {
  kind: EscalationKind;
  scopeDelta: string;
  revisedEstimate: {
    usd: number;
    turns: number;
  };
  blockers: string[];
  proposedDecomposition: TaskSpec[];
  /** Runtime-filled; model-authored values are rejected at validation. */
  costToDate: {
    usd: number;
    turns: number;
  };
  /** Runtime-filled; model-authored values are rejected at validation. */
  salvage: {
    transcriptRef: string;
    artifacts: string[];
    worktreePatchRef?: string;
  };
}
type EscalationDecision = {
  kind: "retry";
  amendedPrompt?: string;
  startTier?: number;
} | {
  kind: "decompose";
  children: TaskSpec[];
} | {
  kind: "cancel";
  reason?: string;
} | {
  kind: "accept";
  note?: string;
};
interface EscalationOptions {
  /** Default 'A'. */
  flavor?: "A" | "B";
  /** Flavor B suspension deadline; REQUIRED for flavor B (Appendix A). */
  deadlineMs?: number;
  /** Applied by the timeout resolution (by: 'timeout'); default accept. */
  defaultDecision?: EscalationDecision;
  /** In-run minimum spend before scope_bigger; default 0 (M3-T09). */
  minSpendUsd?: number;
}
/** The model-facing request: the report minus the runtime-filled fields. */
interface EscalationRequest {
  kind: EscalationKind;
  scopeDelta: string;
  revisedEstimate: {
    usd: number;
    turns: number;
  };
  blockers?: string[];
  proposedDecomposition?: TaskSpec[];
}
declare const ESCALATE_TOOL_NAME = "escalate";
/**
* The exact tool schema of docs/07, section 4.9. costToDate and salvage
* MUST NOT appear here: additionalProperties false rejects model-authored
* values for them at argument validation.
*/
declare const ESCALATION_REQUEST_SCHEMA: JsonSchema;
/** The full-report schema applied BEFORE append (docs/03, section 5.4). */
declare const ESCALATION_REPORT_SCHEMA: JsonSchema;
/**
* The engine opt-in tool (docs/08, section 6.6): registered through the
* same path as any tool under escalation opt-in of EITHER flavor (the
* worker's only authoring channel for a report), never available without
* opt-in, and dispatched through the same permission chain. The loop
* intercepts accepted calls; execute is unreachable by construction.
*/
declare function escalateTool(): ToolDef;
/** Validates the runtime-completed report BEFORE append; returns issues. */
declare function validateEscalationReport(report: EscalationReport): Promise<Issue$1[]>;
/**
* countsAgainstLimit derivation (docs/07, section 6.3, XF-06): true iff
* scope_bigger; scope_different and blocked_with_evidence are exempt and
* never debit the escalation counter.
*/
declare function countsAgainstLimit(kind: EscalationKind): boolean;
//#endregion
//#region src/runtime/no-progress.d.ts
/**
* The no-progress abort class (M3-T08): an engine-defined detector
* journaled as a first-class terminal abort distinct from user
* cancellation (a cancelled entry always reruns; a no-progress abort
* must replay, or every resume would re-pay the stuck turns). The
* interim heuristic is committed in docs/06 Appendix A: N consecutive
* turns without tool calls or artifact deltas, N = 3; the broader
* heuristic stays OQ-15 (docs/14), revisited on dogfood traces.
*
* Encoding (docs/03, sections 6.3 and 6.6): the abort is the agent's
* terminal entry with status 'limit', an error payload carrying
* abortClass 'no-progress', and memoizeOutcome stamped by the ENGINE on
* the terminal entry, so the frozen memoize-limit rule replays it on
* every subsequent resume without a live rerun. In M3 the runtime has no
* per-turn artifact channel, so the tool-call test subsumes artifact
* deltas; per-turn artifact producers arrive with M4 compaction.
*/
/** docs/06 Appendix A: the committed no-progress detector N. */
declare const DEFAULT_NO_PROGRESS_TURNS = 3;
/** The consumer-visible dedicated class marker (FR-424). */
type AbortClass = "no-progress";
/**
* Counts consecutive progress-free turns. A turn with at least one tool
* call (or, later, an artifact delta) resets the streak; a turn with
* neither lengthens it; the detector trips when the streak reaches the
* threshold AND the loop would otherwise continue.
*/
declare class NoProgressDetector {
  private streakInternal;
  private readonly threshold;
  constructor(threshold?: number);
  get streak(): number;
  /** Records one completed model turn. */
  recordTurn(progress: {
    toolCalls: number;
    artifactDeltas?: number;
  }): void;
  get tripped(): boolean;
  describe(): string;
}
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
  /**
  * The no-progress detector N (docs/06 Appendix A, committed at 3):
  * consecutive turns without tool calls or artifact deltas before the
  * engine aborts with the dedicated class (M3-T08).
  */
  noProgressTurns?: number;
}
declare const DEFAULT_MAX_TURNS = 32;
declare const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 12e4;
interface EffectiveUsageLimits {
  maxTurns: number;
  maxToolCalls?: number;
  maxOutputTokensPerTurn?: number;
  timeoutMs?: number;
  streamIdleTimeoutMs: number;
  /** Default DEFAULT_NO_PROGRESS_TURNS (docs/06 Appendix A). */
  noProgressTurns?: number;
}
/**
* Limits merge per spawn: AgentOpts.limits over profile limits over engine
* defaults.limits (docs/06, section "UsageLimits").
*/
declare function mergeUsageLimits(call?: UsageLimits, profile?: UsageLimits, engine?: UsageLimits): EffectiveUsageLimits;
//#endregion
//#region src/runtime/agent-loop.d.ts
type AgentStatus = "ok" | "error" | "limit" | "cancelled" | "skipped" | "escalated";
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
  /**
  * Engine-internal: the accepted escalate request before the runtime
  * fills costToDate and salvage into the full report. The ctx layer
  * consumes and removes it; consumers read `escalation`.
  */
  escalationRequest?: EscalationRequest;
  /**
  * The dedicated first-class abort class (M3-T08): present on the
  * engine-decided no-progress abort (status 'limit'), never on user
  * cancellation or ordinary cap hits.
  */
  abortClass?: AbortClass;
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
/** One model-issued tool call as the loop dispatches it. */
interface ToolCallRequest {
  id: string;
  name: string;
  args: unknown;
}
/**
* The ctx-side verdict for one dispatch, produced by the permission
* chain (M3-T03). For 'ask' the loop writes the turn checkpoint with the
* pending state FIRST, then suspend() journals the approval entry (or
* re-matches an existing one) and parks until a resolution closes it.
*/
type PermissionGate = {
  kind: "allow";
  input: unknown;
} | {
  kind: "deny";
  reason: string;
} | {
  kind: "ask";
  input: unknown;
  suspend: () => Promise<{
    decision: "allow" | "deny";
    reason?: string;
  }>;
};
/**
* The spawn's frozen toolset plus the per-call context factory, prepared
* by the ctx layer (M3-T01). The contracts are the canonical identity
* projection already hashed into the spawn's content key; the loop sends
* exactly them to the model.
*/
interface ToolRuntime {
  defs: ToolDef[];
  contracts: ToolContract[];
  /** Mints a per-call ToolContext (fresh tool span under the agent span). */
  contextFor(toolName: string): ToolContext;
  /** Permission chain evaluation (M3-T03); absent = every call allowed. */
  permission?: (call: ToolCallRequest) => Promise<PermissionGate>;
}
interface RunAgentOptions<S extends SchemaSpec = JsonSchema> {
  prompt: string;
  schema?: S;
  /** Canonicalized JSON Schema projection of `schema` (precomputed for identity). */
  canonicalSchema?: JsonSchema;
  adapter: ProviderAdapter;
  resolved: ResolvedInvocation;
  /** The resolved toolset; absent = no tools declared (docs/08). */
  tools?: ToolRuntime;
  /**
  * Separate final extract invocation, present only when the role trigger
  * protocol demands one: schema set AND (routing directs extract to a
  * different model OR the loop model's caps cannot serve the required
  * tier OR finalize is routed). Otherwise the schema rides the last loop
  * turn (docs/06, section "Agent runtime binding"; the necessity rule is
  * decided by the ctx layer via model/roles.ts).
  */
  extract?: {
    adapter: ProviderAdapter;
    resolved: ResolvedInvocation;
  };
  /**
  * Finalize synthesis invocation (M4-T01), present only when the role
  * trigger protocol fires it: configured in routing AND the toolset is
  * non-empty. Runs after tools stop with toolChoice 'none' over the
  * full transcript; its text becomes the output for schema-less calls,
  * and a schema-bearing call always pairs it with a separate extract
  * (the ctx layer guarantees `extract` is present in that case). Like
  * extract, the finalize invocation is not checkpointed in v1.
  */
  finalize?: {
    adapter: ProviderAdapter;
    resolved: ResolvedInvocation;
  };
  /**
  * Turn-boundary checkpointing (M3-T02; docs/03, section "Checkpoints").
  * load() restores the last boundary on a dangling-dispatch resume;
  * save() persists each boundary where the loop continues. The separate
  * extract invocation is not checkpointed in v1: an extract-phase crash
  * re-pays from the last loop boundary.
  */
  checkpoint?: {
    load(): Promise<CheckpointState | undefined>;
    save(state: CheckpointState): Promise<void>;
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
  /** Bounded ModelRetry conversions per tool call chain; default 2 (Appendix A). */
  modelRetryAttempts?: number;
  /**
  * Escalation opt-in (M3-T07): the loop intercepts accepted calls to
  * the escalate tool and terminates with status 'escalated'; the
  * in-run minSpend gate rejects early scope_bigger escalations with a
  * "keep working" error tool result (M3-T09, docs/07 section 6.4).
  */
  escalation?: {
    minSpendUsd: number;
  };
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
//#region src/runtime/permission-chain.d.ts
type HookVerdict = "allow" | "deny" | "ask" | {
  modifiedInput: unknown;
} | undefined;
type PermissionHook = (toolName: string, input: unknown, ctx: ToolContext) => HookVerdict | Promise<HookVerdict>;
/**
* Declarative rule tables (no closures). The argv and domain forms are
* part of the normative vocabulary but their matchers land in M5;
* compiling them before that is a fail-early ConfigError.
*/
type PermissionRule = {
  tool: string | string[];
} | {
  risk: ToolRisk | ToolRisk[];
} | {
  tool: string;
  argv: string | string[];
} | {
  tool: string;
  domains: string[];
};
type CanUseTool = (toolName: string, input: unknown, ctx: ToolContext) => "allow" | "deny" | {
  modifiedInput: unknown;
} | Promise<"allow" | "deny" | {
  modifiedInput: unknown;
}>;
/** Host-side permission configuration (engine defaults.permissions). */
interface PermissionConfig {
  hooks?: PermissionHook[];
  deny?: PermissionRule[];
  ask?: PermissionRule[];
  canUseTool?: CanUseTool;
}
/**
* Profile-level permissions (docs/08, section "Subagent inheritance").
* inheritPermissions governs SUBAGENT inheritance (mode c orchestrators,
* M6+): children get their own config only unless explicitly opted in.
* It is carried as data here and consumed by the spawning layers.
*/
interface AgentProfilePermissions extends PermissionConfig {
  /** Compiles into deny/ask rules; ships in M5. */
  preset?: "strict" | "standard" | "open";
  /** Default false. */
  inheritPermissions?: boolean;
}
interface CompiledPermissionChain {
  hooks: PermissionHook[];
  deny: PermissionRule[];
  ask: PermissionRule[];
  canUseTool?: CanUseTool;
}
type PermissionVerdict = {
  verdict: "allow";
  decidedBy: "hook" | "canUseTool" | "default";
  input: unknown;
} | {
  verdict: "deny";
  decidedBy: "hook" | "deny-rule" | "canUseTool";
  rule?: PermissionRule;
  input: unknown;
} | {
  verdict: "ask";
  decidedBy: "hook" | "ask-rule" | "default";
  rule?: PermissionRule;
  input: unknown;
};
/**
* Merges the engine-wide config and the profile config into one chain.
* Layers concatenate engine-first; since rules only deny or ask, ordering
* within a layer cannot change the verdict (docs/08, section 4.2). The
* profile's canUseTool wins over the engine's (a single slot by
* construction).
*/
declare function compilePermissionChain(engine?: PermissionConfig, profile?: AgentProfilePermissions): CompiledPermissionChain;
/**
* Evaluates the chain for one dispatch. Hooks run in deterministic
* registration order; { modifiedInput } substitutes the input and
* continues; the first decisive verdict wins. The returned input is what
* execute receives and what the approval identity hashes (docs/03,
* section 1.2: post hook modification).
*/
declare function evaluatePermission(chain: CompiledPermissionChain, def: Pick<ToolDef, "name" | "needsApproval" | "risk">, input: unknown, ctx: ToolContext): Promise<PermissionVerdict>;
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
    /**
    * The resume ledger fold (docs/03, section 13.3): spend is never
    * reset and never double-counted; replayed entries are already inside
    * this seed and add no increments.
    */
    seed?: {
      usd: number;
      usage: Usage;
      agentsSpawned: number;
    };
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
  /** Toolset default; the resolved snapshot enters identity via toolsetHash. */
  tools?: ToolsOption;
  /** Chain layers merged over engine defaults (docs/08, section 3.7). */
  permissions?: AgentProfilePermissions;
  /** Isolation default; the RESOLVED value enters identity (docs/08). */
  isolation?: IsolationSpec;
  /** Flavor B opt-in lives here or on the call (docs/07, section 6). */
  escalation?: EscalationOptions;
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
  /** toolsetHash enters identity; wins over profile.tools (docs/08). */
  tools?: ToolsOption;
  /** docs/08; the RESOLVED value enters identity; worktree needs defaults.isolation. */
  isolation?: IsolationSpec;
  /** Explicit discriminator; replaces the prompt in the content key. */
  key?: string;
  onError?: "throw" | "null";
  /** Per-call replay mode; default scoped forward-matching (docs/03, section 7.3). */
  replay?: "cache" | "never";
  /** Journaled as a policy field from day one; consumed by the M2 predicate. */
  memoizeOutcome?: boolean;
  /** Opt-in; without it 'escalated' is physically unproducible (docs/07 6.4). */
  escalation?: EscalationOptions;
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
  result: EscalatedResult<unknown>;
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
  /**
  * Suspends this position on a journaled entry until an external
  * resolution arrives (docs/06, section 2.7). NO deadline in v1.
  */
  awaitExternal<T = Json>(key: string, o?: {
    schema?: SchemaSpec;
    prompt?: string;
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
  } & Record<string, unknown>, spanId?: string, replayed?: boolean): void;
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
    limits?: UsageLimits; /** Engine-wide permission chain layers (docs/08, section 3). */
    permissions?: PermissionConfig;
  };
  errorPolicy: ErrorPolicy;
  dropped: DroppedItem[];
  cost: CostAttribution;
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined;
  runSignal?: AbortSignal;
  /** The worktree lifecycle provider (docs/08, section 8). */
  isolation?: IsolationProvider;
  /**
  * The InProcessRunner escalation hook (docs/06, section 2.10): receives
  * escalated results when the call form cannot carry them; its decision
  * is journaled as the authoritative escalation-decision entry.
  */
  onEscalation?: (result: EscalatedResult<unknown>) => EscalationDecision | Promise<EscalationDecision>;
  /** Open external suspensions plus the quiescence activity counter (M2-T08). */
  external?: ExternalRegistry;
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
  /**
  * Resolves an open awaitExternal suspension (DEF-4 signature): applied
  * when this attempt wins the first-closing-wins fold; repeated
  * resolution is defined behavior, not an error. An invalid live payload
  * throws InvalidResolutionError and journals nothing.
  */
  resolveExternal(key: string, value: Json): Promise<ResolutionOutcome>;
  /** Cooperative cancellation; the run settles 'cancelled' with a complete CostReport. */
  cancel(reason?: string): Promise<void>;
}
/** Folds the per-run attribution buckets into the normative CostReport. */
declare function buildCostReport(attribution: CostAttribution, totalUsd: number): CostReport;
//#endregion
//#region src/engine/external.d.ts
/** The resolution value shape of a tool-approval suspension (M3-T03). */
interface ApprovalDecision {
  decision: "allow" | "deny";
  reason?: string;
}
/**
* Normalizes a resolution value into an ApprovalDecision. Anything that
* is not an explicit allow is a deny: an approval never fails open.
*/
declare function toApprovalDecision(value: Json): ApprovalDecision;
/**
* Per-run registry of open external suspensions plus the run's activity
* counter: when every in-flight branch is blocked on suspensions
* (activity zero, waiters open), the run quiesces into outcome
* 'suspended' (docs/06, section 2.7).
*/
declare class ExternalRegistry {
  private readonly replayer;
  private readonly waiters;
  private readonly keysByScope;
  private activity;
  private quiesceListener?;
  private quiesceScheduled;
  constructor(replayer: Replayer);
  /** Wraps every non-suspension async operation (agents, steps). */
  enter(): () => void;
  /**
  * An agent parking on a mid-turn approval is BLOCKED, not active: its
  * held activity is released so the run can settle 'suspended', and
  * re-taken when the resolution lands (M3-T03).
  */
  private suspendActivity;
  onQuiesce(listener: (pending: PendingExternal[]) => void): void;
  pending(): PendingExternal[];
  /** The synthesized resolveExternal key of an approval suspension. */
  static approvalKey(entryRef: number): string;
  private scheduleQuiesceCheck;
  /**
  * ctx.awaitExternal: journal (or re-match) the suspended entry and park
  * until a resolution wins the first-closing-wins fold.
  */
  awaitExternal(scope: string, spanId: string, key: string, options?: {
    schema?: SchemaSpec;
    prompt?: string;
  }): Promise<Json>;
  /**
  * Tool-approval suspension (M3-T03; docs/08, section 3.6): journals (or
  * re-matches) the suspended approval entry keyed by (toolName, input)
  * in the agent's child scope and parks until a resolution closes it.
  * The ask verdict is journaled together with the turn checkpoint; on
  * resume an already-resolved entry applies its decision immediately and
  * is never re-suspended.
  */
  awaitApproval(options: {
    scope: string;
    spanId: string;
    toolName: string;
    input: Json;
    risk?: string; /** Called with the suspended entry once it is open (live or re-parked). */
    onPending?: (entry: JournalEntry, replayed: boolean) => void;
  }): Promise<ApprovalDecision>;
  /**
  * Flavor B escalation suspension (M3-T07; docs/07, section 6.2): the
  * escalate tool suspends the agent on the SAME machinery as approvals
  * (kind 'approval', toolName 'escalate') with a journaled deadlineAt so
  * deadlines survive resume; the resolution VALUE is the raw
  * EscalationDecision. A timeout is expressed as a resolution by
  * 'timeout' through the arbiter; first-closing-wins guarantees the
  * defaultDecision and a racing live decision never both apply.
  */
  awaitDecision(options: {
    scope: string;
    spanId: string;
    toolName: string;
    input: Json;
    deadlineAt: string;
    onPending?: (entry: JournalEntry, replayed: boolean) => void;
  }): Promise<{
    value: Json;
    entryRef: number;
  }>;
  /**
  * Submits a resolution attempt for a parked suspension and, when it
  * wins the first-closing-wins fold, settles the in-process waiter with
  * the value (timers and engine-side deciders use this; operator
  * resolutions ride resolveExternal).
  */
  submitResolution(entryRef: number, attempt: Parameters<Replayer["resolveSuspended"]>[1]): Promise<ResolutionOutcome>;
  /**
  * RunHandle.resolveExternal: the live path validates BEFORE append and
  * throws InvalidResolutionError without journaling; a winning attempt
  * settles the waiting promise in place (docs/03, section 8.7).
  */
  resolveExternal(key: string, value: Json): Promise<ResolutionOutcome>;
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
//#region src/model/roles.d.ts
/**
* True when the given structured-output tier can ride the last loop turn.
* `native` and `prompt` coexist with tool availability; `forced-tool`
* pins toolChoice to the synthesized emit_result contract and therefore
* cannot ride while the agent's tools must remain available. For an
* agent with no tools every tier rides (the M1 behavior, unchanged).
*/
declare function canRideLoopTurn(tier: StructuredOutputTier, toolsAvailable: boolean): boolean;
/** The inputs of the extract-necessity rule (docs/04, section 8.3, extract row). */
interface ExtractNecessityInput {
  /** A schema is set on the call; without one extract never fires. */
  schemaSet: boolean;
  /** The loop-resolved model. */
  loopRef: ModelRef;
  /** The extract-resolved model (same chain, role 'extract'). */
  extractRef: ModelRef;
  /** The required tier for the schema on the LOOP model (docs/04, section 8.4). */
  loopTier: StructuredOutputTier;
  /** The agent's toolset is non-empty (escalate opt-in counts). */
  toolsAvailable: boolean;
  /** Finalize is configured in routing (`finalizeConfigured`). */
  finalizeRouted: boolean;
}
/**
* The completed extract-necessity rule: a separate final structured-output
* invocation fires only when a schema is set AND (routing directs extract
* to a different model OR the loop model's caps cannot serve the required
* tier OR finalize is routed, in which case the schema never rides a loop
* or synthesis turn). Otherwise the schema rides the last loop turn with
* no extra call (docs/04, sections 8.3 and 8.4 as amended in M4-T01).
*/
declare function needsSeparateExtract(input: ExtractNecessityInput): boolean;
/**
* True when any resolution layer configures the given role in its routing
* map. This is the finalize TRIGGER: firing is decided by the presence of
* a routing entry at any layer; the model it fires ON still resolves
* through the full chain (a higher layer's all-roles `model` may override
* the routed choice per docs/04, section 8.2).
*/
declare function roleConfiguredInRouting(role: InvocationRole, layers: Array<ResolutionLayer | undefined>): boolean;
/**
* The finalize firing rule: only if configured in routing, and only after
* tools stop, which presupposes a non-empty toolset. A no-tools agent's
* single loop turn is already its synthesis (docs/04, section 8.4 as
* amended in M4-T01). The caller additionally gates on the loop having
* ended without an abort: a limit/error/cancelled/escalated loop never
* reaches synthesis.
*/
declare function finalizeFires(options: {
  routed: boolean;
  toolsAvailable: boolean;
}): boolean;
/**
* The summarize trigger: the compaction threshold on the context window
* (docs/06, Appendix A: default 0.8). Pure predicate; the compaction
* pipeline that acts on it is M4-T03.
*/
declare function atCompactionThreshold(usedTokens: number, contextWindow: number, threshold: number): boolean;
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
  emit(body: WorkflowEventBody, spanId: string, replayed?: boolean): WorkflowEvent;
  on<T extends WorkflowEvent["type"]>(type: T, cb: (event: Extract<WorkflowEvent, {
    type: T;
  }>) => void): () => void;
  /** Ends every open iterator once the run has settled. */
  end(): void;
  iterate(): AsyncIterable<WorkflowEvent>;
}
//#endregion
//#region src/engine/engine.d.ts
interface EngineDefaults {
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  profiles?: Record<string, AgentProfile>;
  limits?: UsageLimits;
  /** Engine-wide permission chain layers (docs/08, section 3). */
  permissions?: PermissionConfig;
  /** The worktree lifecycle provider (docs/08, section 8). */
  isolation?: IsolationProvider;
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
  * The InProcessRunner escalation hook (docs/06, sections 2.10 and 8.1):
  * receives escalated results when the call form cannot carry them; the
  * returned decision is journaled as the authoritative
  * escalation-decision entry.
  */
  onEscalation?: (result: EscalatedResult<unknown>) => EscalationDecision | Promise<EscalationDecision>;
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
/** Resume-time hit/miss/orphan accounting (docs/03, section 11.3). */
interface ResumePreview extends ResumeReport {
  invalidResolutions: Array<{
    seq: number;
    detail: string;
  }>;
}
interface ResumeOptions {
  /**
  * The run's original arguments: not journaled for in-process workflows
  * in v1, so the host supplies them (resume binding residuals, docs/14).
  */
  args?: unknown;
  /**
  * Dry-run: replay-strict matching; the first would-be-live call throws
  * JournalMissError and the run settles with that typed error, zero live
  * calls performed (docs/03, section 11.3).
  */
  dryRun?: boolean;
  /** invalidate/retry: entries to unpin before matching (docs/03, section 6.5). */
  invalidate?: number[];
}
interface ResumeHandle<R> extends RunHandle<R> {
  /** Resolves at settle with the replay accounting. */
  preview: Promise<ResumePreview>;
}
interface Engine {
  run<A, R>(wf: Workflow<A, R>, args: A, opts?: RunOptions): RunHandle<R>;
  /**
  * Rebinds a journal to a workflow definition and resumes (docs/06,
  * section "Engine and ops API"). Requires wf for in-process workflows;
  * a name mismatch is a typed ConfigError; a body-hash mismatch warns
  * loudly and proceeds (the journal decides replay per content keys).
  */
  resume<A, R>(runId: string, wf?: Workflow<A, R>, options?: ResumeOptions): ResumeHandle<R>;
}
/** Content hash of an in-process workflow body (run-to-definition binding, docs/06 10.2). */
declare function hashWorkflowBody(wf: Workflow<never, never> | Workflow<unknown, unknown>): string;
declare function createEngine(options: CreateEngineOptions): Engine;
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
/** Escalation hook (docs/06, section 2.10): decides for value-form calls. */
type OnEscalation = (result: EscalatedResult<unknown>) => EscalationDecision | Promise<EscalationDecision>;
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
export { AbandonAttempt, AbandonFold, AbandonPayload, AbortClass, AgentCallError, AgentError, type AgentEvents, AgentIdentityInput, AgentOpts, AgentProfile, AgentProfilePermissions, AgentResult, AgentStatus, ApprovalDecision, ApprovalIdentityInput, Artifact, BUDGET_ABORT_REASON, BudgetDefaults, BudgetExhaustedError, BudgetHooks, type Bytes, CHECKPOINT_FORMAT_V1, CURRENT_HASH_VERSION, CacheHint, CacheTtl, CanUseTool, CanonicalId, CanonicalIdentity, CanonicalLadderSpec, CanonicalModelSpec, ChatEvent, ChatRequest, CheckpointState, ChildIdentityInput, CollectOpts, CollectedTurn, CompiledPermissionChain, CompiledWorkflow, ConfigError, type CoreEvents, CostAttribution, CostReport, CreateEngineOptions, Ctx, DEFAULT_FLAT_RESERVE_USD, DEFAULT_MAX_PINNED_WORKTREES, DEFAULT_MAX_TURNS, DEFAULT_MODEL_RETRY_ATTEMPTS, DEFAULT_NO_PROGRESS_TURNS, DEFAULT_PER_RUN_CONCURRENCY, DEFAULT_STREAM_IDLE_TIMEOUT_MS, DerivedKey, DeriverRegistry, DispositionRule, DispositionTable, DroppedItem, EMIT_RESULT_TOOL, EMPTY_SCHEMA_HASH, EMPTY_TOOLSET_HASH, ESCALATE_TOOL_NAME, ESCALATION_REPORT_SCHEMA, ESCALATION_REQUEST_SCHEMA, EffectiveUsageLimits, Effort, Engine, EngineDefaults, EntryKind, EntryRef, EntryStatus, ErrorClass, ErrorCode, ErrorPolicy, EscalatedResult, EscalationDecision, EscalationKind, EscalationOptions, EscalationReport, EscalationRequest, EventBus, ExternalIdentityInput, ExternalRegistry, ExtractNecessityInput, FinishInfo, Gate, GitWorktreeProvider, GitWorktreeProviderOptions, HashVersion, HookVerdict, IdentityInput, InMemoryStore, InMemoryTranscriptStore, InProcessRunner, InvalidResolutionError, InvocationRole, type IsolationProvider, type IsolationSpec, Issue$1 as Issue, JournalCompatSubCode, JournalCompatibilityError, JournalEntry, JournalMatcher, JournalMissError, JournalOperation, JournalOrderViolation, type JournalStore, type Json, JsonSchema, JsonlFileStore, KeyDeriver, KeyRing, LARGE_VALUE_WARN_BYTES, LadderSpec, type LeasableStore, type Lease, LeaseHeldError, Ledger, LurkerError, LurkerErrorCode, MatchResult, McpConfig, type ModelCaps, ModelChoice, ModelRef, ModelRetry, ModelSpec, Msg, NoProgressDetector, NonSerializableValueError, OnEscalation, OperationDisposition, OrchestratorCapConfigError, Out, ParallelSiteCounter, Part, PendingExternal, PendingToolTurn, PermissionConfig, PermissionGate, PermissionHook, PermissionRule, PermissionVerdict, PipelineCollected, PipelineOpts, PlanInvariantError, type Pricing, type ProviderAdapter, ROLE_EFFORT_DEFAULTS, ROOT_SCOPE, RandIdentityInput, RandPayload, RefEntryAppender, RefEntryClassification, RefusalInfo, ReplayDisposition, ReplayMode, ReplayPlanHashMismatch, Replayer, ResolutionArbiter, ResolutionAttempt, ResolutionBy, ResolutionFold, ResolutionLayer, ResolutionOutcome, ResolutionPayload, ResolvedInvocation, ResolvedToolset, ResumeHandle, ResumeOptions, ResumePreview, ResumeReport, Role, RunAgentOptions, RunBudget, RunEventSink, type RunFilter, RunHandle, RunInternals, type RunMeta, RunOptions, RunOutcome, RunStatus, RuntimeEventSink, SchemaPair, SchemaSpec, SchemaValidationResult, ScopeSegment, ScriptRejected, ScriptRunner, ScrubNote, Semaphore, Settled, SinglePhaseAppend, SpanMinter, SpanRegistry, Spend, Stage, type StandardJSONSchemaV1, type StandardSchemaV1, StepIdentityInput, StructuredOutputTier, SuspendedAppend, SuspensionState, TOOL_NAME_PATTERN, TaskSpec, TerminalPatch, ToolCallRequest, ToolChoice, type ToolContext, ToolContextSeed, ToolContract, type ToolDef, type ToolEvents, type ToolExecutor, ToolInit, type ToolRisk, ToolRuntime, type ToolSource, type ToolSourceSession, ToolsOption, type TranscriptStore, TriggerClass, Usage, UsageLimits, WireError, Workflow, type WorkflowEvent, type WorkflowEventBody, admissionReserveUsd, agentErrorFromWire, agentErrorToWire, agentScope, applyStructuredOutputTier, atCompactionThreshold, buildAbandonFold, buildAdapterRegistry, buildCostReport, buildDeriverRegistry, buildToolContext, canRideLoopTurn, canonicalizeSchema, checkpointRefFor, classifyAgentError, compilePermissionChain, countsAgainstLimit, createCanonicalIdMinter, createCtx, createEngine, currentOnlyKeyRing, decodeCheckpoint, defineWorkflow, deriveContentKey, deriverV1, deriverV2, dispositionHook, emptyToolset, encodeCheckpoint, escalateTool, evaluatePermission, executeWorkflow, extractCandidate, finalizeFires, formatRePrompt, formatScopePath, hashWorkflowBody, identityJcs, isEscalated, isSchemaPairSpec, isStandardSchemaSpec, isStrictCompatibleSchema, mcp, mergeUsageLimits, modelSpecIdentity, needsSeparateExtract, normalizeEntry, parallelScope, parseModelRef, parseScopePath, pipelineScope, planNodeScope, projectIdentity, projectToJsonSchema, registryKeyRing, replayDisposition, resolveModelInvocation, resolveToolset, roleConfiguredInRouting, roundOneDisposition, runAgent, scanJournalCompatibility, schemaHash, schemaHashOfSpec, selectStructuredOutputTier, tierWithinCaps, toApprovalDecision, toJournalValue, tool, toolContract, toolsetHash, validateEntryShape, validateEscalationReport, validateSchemaSpec, workflowScope };