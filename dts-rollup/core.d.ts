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
type ErrorCode = "agent" | "config" | "non_serializable_value" | "script_rejected" | "journal_compat" | "invalid_resolution" | "journal_order_violation" | "plan_invariant" | "replay_plan_hash_mismatch" | "orchestrator_cap_config" | "journal_miss" | "budget_exhausted" | "admission_rejected" | "sandbox_limit" | "lease_held";
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
* A structural admission rejection (maxDepth, maxChildrenPerNode,
* maxTotalSpawns) from the AdmissionController (docs/07, section
* "AdmissionController"; M6-T06). The rejection verdict is embedded in
* the carrying spawn-admission decision entry and replays identically;
* the error surfaces the embedded AdmitRejectReason in `data` to the
* caller (a typed tool error for orchestrators) and MUST NOT tear down
* the run. Budget-code rejections throw BudgetExhaustedError instead,
* keeping the docs/06 5.7 exhaustion semantics.
*/
declare class AdmissionRejectedError extends LurkerError {
  readonly code = "admission_rejected";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* A WorkerSandboxRunner resource-limit breach (docs/06, section 8.2;
* M6-T02): crossing timeoutMs or memoryMb terminates the worker and the
* run completes with outcome 'error' carrying this error's WireError
* projection; `data` records { reason: 'timeout' | 'memory', limit }.
* The class itself is never journaled as an entry of its own.
*/
declare class SandboxError extends LurkerError {
  readonly code = "sandbox_limit";
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
  /**
  * Provider family for provider-raw matching and retention (docs/04,
  * section 2.3; committed during M4-T02). Two adapters of the same
  * family share retained blocks and projections; default = id.
  */
  provider?: string;
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
//#region src/runtime/permission-chain.d.ts
type HookVerdict = "allow" | "deny" | "ask" | {
  modifiedInput: unknown;
} | undefined;
type PermissionHook = (toolName: string, input: unknown, ctx: ToolContext) => HookVerdict | Promise<HookVerdict>;
/**
* Declarative rule tables (no closures). `'undeclared'` in risk
* position matches every tool WITHOUT declared risk: presets treat the
* undeclared state conservatively (docs/08, section 4.3). Argv rules
* match through the real shell matcher (section 5); domain rules are
* ADVISORY outside the first-party fetch tool (section 4.4): they never
* change a verdict in M5, and matches surface in audit events.
*/
type RiskRuleValue = ToolRisk | "undeclared";
type PermissionRule = {
  tool: string | string[];
} | {
  risk: RiskRuleValue | RiskRuleValue[];
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
type PermissionVerdict = ({
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
}) & {
  /**
  * Advisory domain-rule matches (docs/08, 4.4): reported in audit
  * events, never enforced outside the first-party fetch tool.
  */
  advisory?: PermissionRule[];
};
/**
* Merges the engine-wide config and the profile config into one chain.
* Layers concatenate engine-first; since rules only deny or ask, ordering
* within a layer cannot change the verdict (docs/08, section 4.2). The
* profile's canUseTool wins over the engine's (a single slot by
* construction). A declared preset compiles INTO the same layers, after
* the host-authored rules, never as a fifth layer (M5-T05).
*/
declare function compilePermissionChain(engine?: PermissionConfig, profile?: AgentProfilePermissions): CompiledPermissionChain;
/**
* Evaluates the chain for one dispatch, or OFFLINE against a
* hypothetical call by tool name (the dry-run API of docs/08, section
* 4.5: nothing executes; shells and tests read the verdict, the
* deciding layer, and the matched rule). Hooks run in deterministic
* registration order; { modifiedInput } substitutes the input and
* continues; the first decisive verdict wins. The returned input is what
* execute receives and what the approval identity hashes (docs/03,
* section 1.2: post hook modification). Advisory domain-rule matches
* ride every verdict for the audit payload (docs/08, 4.4).
*/
declare function evaluatePermission(chain: CompiledPermissionChain, tool: string | Pick<ToolDef, "name" | "needsApproval" | "risk">, input: unknown, ctx?: ToolContext): Promise<PermissionVerdict>;
//#endregion
//#region src/tools/presets.d.ts
type PermissionPreset = "strict" | "standard" | "open";
declare function compilePermissionPreset(preset: PermissionPreset): {
  deny: PermissionRule[];
  ask: PermissionRule[];
};
//#endregion
//#region src/tools/shell-matcher.d.ts
/**
* Argv-parsing shell matcher (M5-T06; docs/08, section 5): shell
* allow/ask/deny is matched through a real argv parser, never a string
* prefix. The composition rule is the entire point: for a compound
* command the verdict is the strictest across segments, and any
* unmatched segment yields ask, never a silent allow: `npm test; rm -rf
* /` MUST yield ask (or deny when rm patterns are denied) even when
* `npm test` is allow-listed.
*
* Matching algorithm (5.2):
* 1. Lex with a POSIX-like shell lexer: quotes and escapes honored, no
*    expansion of any kind.
* 2. Split into segments at `;`, `&&`, `||`, `|`, `&`, and newline.
* 3. A segment containing command substitution ($(...) or backticks),
*    process substitution, or a here-doc is unmatchable: ask, always.
* 4. Leading environment assignments (FOO=bar cmd) are stripped; a
*    segment of only assignments is treated as unmatched.
* 5. Redirection operators and their targets are retained as tokens; a
*    pattern that does not account for them fails to match.
* 6. Each segment is evaluated deny, then ask, then allow.
*/
interface ShellSegment {
  /** Argv tokens after lexing and env-assignment stripping. */
  argv: string[];
  /** Substitutions and here-docs make a segment unmatchable (ask). */
  unmatchable: boolean;
}
/**
* Lexes a command into segments per the docs/08 5.2 algorithm. Quotes
* and escapes are honored; nothing is expanded; `$(`, backticks, `<(`,
* `>(`, and `<<` (outside single quotes) poison their segment.
*/
declare function lexShellCommand(command: string): ShellSegment[];
/**
* Pattern grammar (5.1): literal words match one identical token; `*`
* matches exactly one token; `**` matches zero or more remaining tokens
* and may appear only as the final word. A pattern matches only if it
* consumes the segment's ENTIRE argv.
*/
declare function matchArgvPattern(pattern: string, argv: string[]): boolean;
type ShellVerdict = "allow" | "ask" | "deny";
interface ShellPatternRules {
  deny?: string[];
  ask?: string[];
  allow?: string[];
}
/**
* The strictest-across-segments composition (5.3): deny if ANY segment
* denies; otherwise ask if ANY segment asks or fails to match an allow
* pattern; otherwise allow.
*/
declare function matchShellCommand(command: string, rules: ShellPatternRules): ShellVerdict;
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
//#region src/journal/lineage.d.ts
/** Logical-task identity across rebirths (DEF-3); engine-minted ULID. */
type LogicalTaskId = string;
/** The closed relation vocabulary of the minting and inheritance table. */
type LineageRelation = "first" | "respawn" | "rung-retry" | "decompose-child" | "unpark-restart";
/** approachSig/approachSigCoarse derivation version (docs/03, 10.7). */
declare const LINEAGE_SIG_VERSION: 1;
/** Deterministic LTIDs canonized onto legacy journals (docs/03, 10.7). */
declare const LEGACY_LTID_PREFIX = "legacy:";
/** The computed lineage record of one spawn-authorizing decision entry. */
interface LineageRef {
  logicalTaskId: LogicalTaskId;
  relation: LineageRelation;
  /** 0-based, journal order among the LTID's attempts, never wall clock. */
  attemptOrdinal: number;
  /** Seq of the causing entry; mandatory for every relation except 'first'. */
  causeRef?: EntryRef;
  /** Decomposition chain of parent LTIDs, length <= maxDepth. */
  ancestry: LogicalTaskId[];
  approachSig: string;
  approachSigCoarse: string;
  sigVersion: typeof LINEAGE_SIG_VERSION;
}
/**
* The value-part lineage block embedded in decision entries: the computed
* LineageRef plus the normalized tag (docs/03, 10.6: the request part
* holds the RAW proposal; the value part holds what was COMPUTED and is
* reused byte-exact on replay).
*/
interface SpawnLineage extends LineageRef {
  approachTag: string;
}
/** Attempt outcome classes entering LineageStats (docs/03, 10.3). */
type AttemptOutcomeClass = "ok" | "escalated" | "task-error" | "transient-error" | "no-progress" | "verify-failed" | "limit" | "abandoned";
/**
* The pure lineage fold rendered in plan_view and WakeDigest, always
* pinned to a snapshot (`uptoSeq`), never a live read inside a turn.
* `approaches` groups settled history by approachSig; a group whose
* attempts have not settled yet is omitted (there is no outcome to learn
* from), while `attemptsUsed` still counts every authorized attempt.
*/
interface LineageStats {
  attemptsUsed: number;
  escalationsUsed: number;
  stallStreak: number;
  approaches: Array<{
    approachSig: string;
    approachTag: string;
    attempts: number;
    lastOutcome: AttemptOutcomeClass;
  }>;
}
/** The spawn-options lineage block (ctx.agent, ctx.workflow, spawn_agent, add_task). */
interface SpawnLineageOpt {
  continues: LogicalTaskId;
  /** Default 'respawn'. */
  relation?: Exclude<LineageRelation, "first">;
  /** Seq of the journal entry that caused the rebirth; mandatory. */
  causeRef: EntryRef;
}
/** Lineage limits, monotonically consumed and never replenished (DEF-3). */
interface EscalationLimits {
  /** Default 2; the old name maxEscalationsPerNode is rejected (XF-10). */
  maxEscalationsPerLogicalTask: number;
  /** Default 8. */
  maxAttemptsPerLogicalTask: number;
}
declare const DEFAULT_ESCALATION_LIMITS: EscalationLimits;
/**
* Validates a lineage-limits config record. The pre-rename knob name is
* rejected with a migration hint (XF-10): silently honoring it would
* change semantics (per logical task, not per node).
*/
declare function validateEscalationLimits(raw?: Partial<EscalationLimits> | Record<string, unknown>): EscalationLimits;
/**
* Approach-tag normalization (docs/03, 10.2): NFC, lowercase, runs of
* non-alphanumerics collapse into a hyphen, truncate to 32 characters; an
* empty value canonicalizes to 'default'. Prompt prose never enters any
* signature: rephrasings collide by construction, not by heuristic.
*/
declare function normalizeApproachTag(raw?: string): string;
/** The isolation string entering approachSigCoarse (docs/03, 10.3). */
declare function canonicalIsolationTag(spec: IsolationSpec | undefined): string;
/** The identity inputs of the coarse signature (prompt prose excluded). */
interface ApproachSignatureInputs {
  agentType: string;
  toolsetHash: string;
  schemaHash: string;
  isolation: string;
}
/**
* approachSigCoarse = sha256(JCS({ sigVersion, agentType, toolsetHash,
* schemaHash, isolation })). Feeds the stall detector and the oscillation
* guard, which keys ACROSS LTID boundaries (docs/07, 3.8).
*/
declare function approachSigCoarse(inputs: ApproachSignatureInputs): string;
/** approachSig = sha256(JCS({ sigVersion, coarse, approachTag })); keys lessons. */
declare function approachSigOf(coarse: string, tag?: string): string;
/**
* The deterministic signature inputs assigned to legacy spawns (journals
* written before lineage existed) and to attempts whose producers did not
* record signature inputs: stable constants, never wall-clock, so replay
* canonizes identically on every engine (docs/03, 10.7).
*/
declare const LEGACY_SIGNATURE_INPUTS: ApproachSignatureInputs;
/** Classifies one settled root terminal into its attempt outcome class. */
declare function classifyAttemptOutcome(terminal: JournalEntry): AttemptOutcomeClass;
/**
* The incremental lineage fold: attempts, escalation debits, stall
* streaks, single-live-attempt, and legacy canonization, computed from
* journal entries only. `absorb` is idempotent by seq cursor; every read
* accepts an optional `uptoSeq` pin so renders stay snapshot-stable
* (docs/03, 10.4; docs/07, 8.3).
*/
declare class LineageIndex {
  private readonly attemptsByLtid;
  private readonly escalationsByLtid;
  /** Registration-order attempt queues per child (scope, key) slot. */
  private readonly queueByScope;
  private readonly recordByRootSeq;
  /** First-closing-wins projection over resolution targets (DEF-4). */
  private readonly closedTargets;
  /** Live admits journaled a moment later (single-live-attempt window). */
  private readonly pendingAdmits;
  private cursor;
  /** Registers a live admit strictly before its decision entry lands. */
  noteAdmitted(logicalTaskId: LogicalTaskId): void;
  /** Absorbs new entries (seq beyond the cursor); earlier ones are no-ops. */
  absorb(entries: readonly JournalEntry[]): void;
  private absorbEntry;
  private absorbDecision;
  private readEmbeddedAdmissions;
  private registerAttempt;
  private absorbResolution;
  private absorbAbandon;
  private absorbSpawnEntry;
  /**
  * Binds one dispatch entry to its attempt: the earliest registered
  * attempt of the slot still waiting for its first dispatch; else the
  * attempt whose bound key matches (an at-least-once redispatch of the
  * same slot after cancelled/error/limit); else a legacy attempt is
  * canonized with the deterministic 'legacy:' + contentHash LTID
  * (docs/03, 10.7: random ULIDs on replay are forbidden).
  */
  private bindRoot;
  private recordEscalation;
  private attemptsOf;
  attemptsUsed(logicalTaskId: LogicalTaskId, uptoSeq?: number): number;
  escalationsUsed(logicalTaskId: LogicalTaskId, uptoSeq?: number): number;
  /**
  * True while the LTID has an unsettled attempt (admitted, dispatched, or
  * redispatched without a terminal), including admits whose decision
  * entries have not landed yet. Backs the single-live-attempt invariant:
  * a competing admit gets `lineage_busy` (docs/03, 10.5).
  */
  hasLiveAttempt(logicalTaskId: LogicalTaskId): boolean;
  /** The stall streak per docs/03, 10.4 (pinnable to a snapshot seq). */
  stallStreak(logicalTaskId: LogicalTaskId, uptoSeq?: number): number;
  /** The pinned LineageStats render (docs/03, 10.3). */
  statsOf(logicalTaskId: LogicalTaskId, uptoSeq?: number): LineageStats;
  /** Every LTID the fold has seen (diagnostics and renders). */
  knownLogicalTaskIds(): LogicalTaskId[];
}
//#endregion
//#region src/journal/termination.d.ts
/** The frozen limits vector written into termination.init (docs/07, 11.2). */
interface TerminationLimits {
  /** V0, default 32; absolute and non-replenishable. */
  maxRevisionsPerRun: number;
  /** S0, default 128; debited on every admitted spawn of any origin. */
  maxTotalSpawns: number;
  /** E0, default 2, per lineage; the old name is rejected (XF-10). */
  maxEscalationsPerLogicalTask: number;
  /** D0, default 1, ceiling 4; static per-branch limit. */
  maxDepth: number;
  /** Maximum declared ladder length per the profile-registry snapshot. */
  kMax: number;
  /** B0; immutable after start, no API including HITL can top up. */
  runBudgetUsdCeiling: number;
  /** From the orchestrator budget (DEF-7; XF-09). */
  orchestratorCapUsd: number;
  /** From the orchestrator budget (DEF-7; XF-09). */
  finalizeReserveUsd: number;
}
/** Appendix A committed defaults for the countable resources. */
declare const DEFAULT_MAX_REVISIONS_PER_RUN = 32;
declare const DEFAULT_MAX_TOTAL_SPAWNS = 128;
/** The countable resource vocabulary (docs/07, 11.5). */
type TerminationResource = "revisionUnits" | "spawnUnits" | "escalationUnits" | "rungs" | "depth";
interface LineageCounters {
  escalationUnitsRemaining: number;
  rungsRemaining: number;
}
interface TerminationAccountSnapshot {
  revisionUnitsRemaining: number;
  spawnUnitsRemaining: number;
  perLineage: Record<LogicalTaskId, LineageCounters>;
  /** The variant function, a pure fold over the journal (docs/07, 11.4). */
  phi: number;
}
type DebitResult = {
  ok: true;
  balanceAfter: number;
} | {
  ok: false;
  deniedEntryRef: EntryRef;
  resource: TerminationResource;
};
/** The value payload of a termination.init entry (docs/07, 11.6). */
interface TerminationInitValue {
  limits: TerminationLimits;
  profileRegistrySnapshotHash: string;
  phiInitial: number;
}
/** The value payload of a termination.denied entry (docs/07, 11.6). */
interface TerminationDeniedValue {
  resource: TerminationResource;
  logicalTaskId?: LogicalTaskId;
  /** Seq of the calling tool-call or EscalationReport entry. */
  requestedByRef?: EntryRef;
  reasonCode: string;
  snapshotAfter: TerminationAccountSnapshot;
}
/**
* Reads the declared ladder length of one agent profile. Ladders are
* declared through the profile's ModelSpec (`model: { ladder }`, or the
* loop-role routing entry; docs/04, section 12). The reader is defensive
* so the snapshot is total over every registry shape (an undeclared
* ladder has length 1: the single implicit rung).
*/
declare function ladderLengthOf(profile: unknown): number;
/** kMax: the maximum declared ladder length across the registry snapshot. */
declare function kMaxOf(profiles: Record<string, unknown> | undefined): number;
/**
* The deterministic profile-registry snapshot hash frozen inside
* termination.init: profile names mapped to their declared ladder
* lengths, canonical JSON, sha256 (docs/07, 11.6).
*/
declare function profileRegistrySnapshotHash(profiles: Record<string, unknown> | undefined): string;
/**
* Validates a raw limits record into the frozen vector. The pre-rename
* escalation knob is rejected with a migration hint (XF-10); counters
* must be non-negative integers; kMax at least 1.
*/
declare function validateTerminationLimits(raw: Partial<TerminationLimits> | Record<string, unknown>): TerminationLimits;
/** C = E0 + kMax: the per-spawn weight of the variant function. */
declare function lineageWeightOf(limits: TerminationLimits): number;
/** Phi0 = V0 + C * S0, finite and fixed in termination.init (docs/07, 11.4). */
declare function phiInitialOf(limits: TerminationLimits): number;
/** Builds the termination.init value payload (docs/07, 11.6). */
declare function buildTerminationInitValue(limits: TerminationLimits, registrySnapshotHash: string): TerminationInitValue;
/** Reads a termination.init entry's payload; undefined when malformed. */
declare function readTerminationInit(entry: JournalEntry): TerminationInitValue | undefined;
/**
* Config-drift detection at resume (docs/07, 11.2): the journaled vector
* always wins; every differing field is reported for the
* `termination:config-drift` event. Dynamic budget top-up via restart is
* excluded by construction.
*/
declare function terminationConfigDrift(frozen: TerminationLimits, live: Partial<TerminationLimits>): Array<{
  field: keyof TerminationLimits;
  frozenValue: Json;
  liveValue: Json;
}>;
/** Injected appender for termination.denied entries (engine-owned I/O). */
type TerminationDeniedWriter = (denied: TerminationDeniedValue) => Promise<EntryRef>;
/**
* The single per-run TerminationAccount (docs/07, 11.5): debit ONLY. No
* credit operation exists by construction; reclaim never replenishes
* anything (DEF-5 interaction, docs/07 7.3). Live: the engine debits the
* in-memory account, writes the carrying entry with the balance-after,
* then applies effects. Resume state is rebuilt by TerminationFold from
* the journal, never from live config.
*/
declare class TerminationAccount {
  readonly limits: TerminationLimits;
  private revisionUnits;
  private spawnUnits;
  private readonly lineages;
  private deniedWriter?;
  constructor(options: {
    limits: TerminationLimits;
    deniedWriter?: TerminationDeniedWriter;
  });
  /**
  * Binds the denied-entry appender onto an account rebuilt by the fold
  * (resume path): the fold is pure and cannot own I/O. Never rebinds an
  * existing writer.
  */
  bindDeniedWriter(writer: TerminationDeniedWriter): void;
  snapshot(): TerminationAccountSnapshot;
  /** Phi = V + C * S + sum over live lineages (E + R) (docs/07, 11.4). */
  phi(): number;
  /** The current rung index of a lineage (0 before any raise). */
  rungIndexOf(logicalTaskId: LogicalTaskId): number;
  /** True when a spawn-unit debit would underflow (pre-reserve check). */
  get spawnUnitsExhausted(): boolean;
  get revisionUnitsRemaining(): number;
  /**
  * The spawn-admission debit (docs/07, 11.3b): minus one spawnUnit for
  * an admitted spawn of ANY origin; a NEW lineage receives E0 escalation
  * units and (K_l - 1) rung transitions in the same atomic step, so the
  * lemma's per-spawn decrease is C - (E0 + K_l - 1) = kMax - K_l + 1,
  * at least 1. Synchronous: the caller embeds spawnUnitsAfter in the
  * decision entry it appends next.
  */
  debitSpawn(lineage?: {
    logicalTaskId: LogicalTaskId;
    isNew: boolean;
    ladderLength?: number;
  }): {
    ok: true;
    spawnUnitsAfter: number;
  } | {
    ok: false;
    resource: "spawnUnits";
  };
  /**
  * The plan_revise debit (docs/07, 11.3a and 11.7): minus one
  * revisionUnit on EVERY journaled plan.revision, regardless of the op
  * count, guard verdicts, or the auto-rebase outcome; conflict spam is
  * never a free retry.
  */
  debitRevision(): {
    ok: true;
    revisionUnitsAfter: number;
  } | {
    ok: false;
    resource: "revisionUnits";
  };
  /**
  * The escalation debit (docs/07, 11.3d): minus one escalationUnit of
  * the affected lineage, including EACH lineage of a class-level
  * decision and timeout defaultDecisions. Conditioned on the
  * countsAgainstLimit flag embedded in the decision entry by the caller.
  */
  debitEscalation(logicalTaskId: LogicalTaskId): {
    ok: true;
    escalationUnitsAfter: number;
  } | {
    ok: false;
    resource: "escalationUnits";
  };
  /**
  * The ladder-raise debit (docs/07, 11.3c): minus one rung of the
  * lineage; rungIndex is strictly monotone, there are no demotions and
  * no runtime startTier promotion in v1.
  */
  debitRung(logicalTaskId: LogicalTaskId): {
    ok: true;
    rungIndexAfter: number;
    rungsRemainingAfter: number;
  } | {
    ok: false;
    resource: "rungs";
  };
  /**
  * The docs/07 11.5 debit surface: attempts the named resource and, on
  * underflow, writes `termination.denied` strictly BEFORE resolving with
  * the typed failure (the caller surfaces the error only after this
  * settles). Requires a deniedWriter; pure-fold contexts use the
  * synchronous per-resource methods instead.
  */
  debit(resource: Exclude<TerminationResource, "depth">, lineage?: LogicalTaskId, context?: {
    requestedByRef?: EntryRef;
    reasonCode?: string;
  }): Promise<DebitResult>;
  private tryDebit;
  /**
  * Restores one lineage's counters from journaled balances (fold use
  * only): never a credit path, the fold consumes recorded balances.
  */
  restoreLineage(logicalTaskId: LogicalTaskId, state: LineageCounters & {
    rungIndex?: number;
  }): void;
  /** Fold use only: restores the run counters from journaled balances. */
  restoreCounters(state: {
    revisionUnitsRemaining?: number;
    spawnUnitsRemaining?: number;
  }): void;
  private requireLineage;
  private requireLineageId;
}
/** The typed error code surfaced after a denied debit (docs/07, 11.3). */
declare function exhaustionCodeOf(resource: TerminationResource): string;
/**
* The replay fold (docs/07, 11.6): rebuilds the account from
* termination.init and the debiting decision entries, asserting every
* embedded balance-after against the recomputation. A divergence raises
* the typed journal-integrity error at exactly the diverging entry;
* denials are re-issued from termination.denied with zero live calls.
*/
declare function foldTermination(entries: readonly JournalEntry[]): {
  account: TerminationAccount;
  initRef: EntryRef;
  init: TerminationInitValue;
  denials: Array<{
    seq: EntryRef;
    value: TerminationDeniedValue;
  }>;
} | undefined;
//#endregion
//#region src/journal/reuse.d.ts
/** Kernel contentHash of a spawn root entry (docs/03, 9.2). */
type SpawnKey = string;
/** Plan-node identity (docs/07, 3.1). */
type NodeId$1 = string;
/** The rich donor descriptor embedded in reuse verdicts (docs/03, 9.9). */
interface DonorRef {
  /** Head of the link chain. */
  nodeId: NodeId$1;
  /** Seq of the donor's root entry. */
  rootEntryRef: EntryRef;
  /** Transitive chain, oldest first. */
  chain: NodeId$1[];
  spawnKey: SpawnKey;
  /** Lineage continues through the link (docs/03, 9.6; DEF-3). */
  logicalTaskId: LogicalTaskId;
  /** Paid under the chain at the verdict snapshot. */
  paidUsd: number;
}
/** Graft bootstrap payload (docs/03, 9.9). */
interface GraftBoot {
  /** Retained by the abandon entry, when it was. */
  checkpointRef?: string;
  /** Deterministic sum of match-eligible payments. */
  eligiblePaidUsd: number;
  worktreePinned: boolean;
}
/** Telemetry for a SpawnKey match admitted fresh (docs/03, 9.9). */
interface DedupNote {
  spawnKey: SpawnKey;
  donorNodeId: NodeId$1;
  reason: "donor_failed" | "no_paid_entries" | "graft_unsafe" | "donor_active";
}
/** The reuse block of AdmissionConfig (docs/03, 9.9). */
interface ReuseConfig {
  /** Default true. */
  enabled?: boolean;
  /** Default true. */
  allowGraft?: boolean;
  /** Default 2 (Appendix A). */
  maxOscillationsPerKey?: number;
  /** Optional RevisionGuards trigger on netLostUsd (docs/07, 3.8). */
  maxAbandonedNetUsdFraction?: number;
}
declare const DEFAULT_MAX_OSCILLATIONS_PER_KEY = 2;
/** The consumer-facing reuse mark on results (docs/03, 9.9). */
interface AgentResultMeta {
  reusedFrom?: {
    nodeId: NodeId$1;
    rootEntryRef: EntryRef;
    mode: "full" | "graft";
    reclaimedUsd: number;
  };
}
/** The node.link entry value (docs/03, 9.5): an ordinary content-keyed effect entry. */
interface NodeLinkValue {
  targetNodeId: NodeId$1;
  /** plan/NewNodeId. */
  targetScope: string;
  /** plan/HeadNodeId (only the donor is addressed by seq elsewhere). */
  donorScope: string;
  /** Full chain for transitive drainage, oldest first. */
  chain: string[];
  spawnKey: SpawnKey;
  logicalTaskId: LogicalTaskId;
  mode: "full" | "graft";
  /** full is shareable, graft is exclusive (docs/03, 9.5). */
  claim: "shared" | "exclusive";
  checkpointRef?: string;
  reclaimedUsdAtLink: number;
  donorRootRef: EntryRef;
}
/**
* node.link identity (docs/03, 9.5): sha256 of {kind, spawnKey,
* donorScope, targetNodeId}; targetNodeId is deterministic on replay
* because NodeIds are assigned inside plan.revision.
*/
declare function nodeLinkKey(spawnKey: SpawnKey, donorScope: string, targetNodeId: NodeId$1): string;
/** The abandoned-spend ledger fold (docs/03, 9.7). */
interface AbandonedSpendView {
  abandonedUsd: number;
  reclaimedUsd: number;
  netLostUsd: number;
  byKey: Record<SpawnKey, {
    oscillationCount: number;
    abandonedUsd: number;
    reclaimedUsd: number;
  }>;
}
/** One donor candidate surfaced by the DedupIndex fold (docs/03, 9.3). */
interface DonorCandidate {
  rootEntryRef: EntryRef;
  rootScope: string;
  spawnKey: SpawnKey;
  /** From the abandon payload when the sever named the node. */
  nodeId?: NodeId$1;
  logicalTaskId?: LogicalTaskId;
  /** Effective root status BEFORE the abandon overlay. */
  preAbandonStatus: "ok" | "escalated" | "running" | "cancelled" | "error" | "limit";
  memoizedFailure: boolean;
  /** Total paid under the donor's child coverage at fold time. */
  paidUsd: number;
  /** Match-eligible (completed, non-running, non-cancelled) payments. */
  eligiblePaidUsd: number;
  hasPaidEntries: boolean;
  isolationWorktree: boolean;
  worktreePinned: boolean;
  checkpointRef?: string;
  retainedCheckpoint: boolean;
  /** Seq of the exclusive node.link that captured this donor, if any. */
  claimedBy?: EntryRef;
  /** Scope chain for transitive drainage, oldest first (docs/03, 9.6). */
  chain: string[];
}
/**
* The DedupIndex: a pure fold over spawn roots, severing abandons, and
* node.link entries. Prices fold from journal facts (servedBy, usage)
* through the injected price function; on replay the embedded verdict
* values are authoritative and this fold serves integrity only.
*/
declare class DedupIndex {
  private readonly donors;
  private readonly links;
  private readonly spend;
  static fold(entries: readonly JournalEntry[], options?: {
    priceUsd?: (servedBy: ModelRef | undefined, usage: Usage) => number | undefined;
  }): DedupIndex;
  /** Unclaimed donor candidates for a key, oldest (chain head) first. */
  donorsOf(spawnKey: SpawnKey): DonorCandidate[];
  /** Every donor for a key including claimed ones (diagnostics). */
  allDonorsOf(spawnKey: SpawnKey): DonorCandidate[];
  /** Link count per key: the oscillation counter (docs/03, 9.7). */
  oscillationCountOf(spawnKey: SpawnKey): number;
  abandonedSpend(): AbandonedSpendView;
}
/**
* The four-outcome verdict evaluation on a SpawnKey match (docs/03,
* 9.4), computed once live at the fold head and embedded into the
* deciding entry; replay never re-evaluates.
*/
declare function evaluateReuse(index: DedupIndex, spawnKey: SpawnKey, config?: ReuseConfig): {
  kind: "none";
} | {
  kind: "reject_osc_guard";
  oscillationCount: number;
} | {
  kind: "reuse_full";
  donor: DonorCandidate;
} | {
  kind: "admit_graft";
  donor: DonorCandidate;
} | {
  kind: "fresh";
  note: DedupNote;
};
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
  private aliasDisposition?;
  /** Scope-prefix aliases (DEF-5, docs/03 9.5): donor prefix -> target prefix. */
  private readonly aliases;
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
  /**
  * The disposition applied to alias-sourced candidates (DEF-5, docs/03
  * 9.5): the skipped overlay from abandon is bypassed ONLY through the
  * alias, so entries regain their pre-abandon terminal status for
  * matching in the NEW scope; the standalone old scope stays skipped.
  */
  setAliasDisposition(disposition: (op: JournalOperation) => OperationDisposition): void;
  /**
  * Registers a scope-prefix rewrite (node.link, DEF-5): donorPrefix maps
  * to targetPrefix for forward-matching purposes; the per-scope cursors
  * work unchanged at every nested level, so partial subtree reuse falls
  * out for free at any depth.
  */
  registerAlias(donorPrefix: string, targetPrefix: string): void;
  /** Candidates for one scope: native ops plus alias-mapped donor ops. */
  private candidatesOf;
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
* The child scope-prefix an abandon over `target` covers transitively.
* Agent spawns nest under agent:<seq> (docs/03, section 2.2); a child
* workflow's subtree runs under the wf:<name>:<ordinal> scope recorded in
* its dispatch payload (M6-T06). A child entry without the payload
* (foreign journals) degrades to the agent:<seq> convention, which covers
* nothing real and keeps the fold total.
*/
declare function childCoveragePrefix(target: JournalEntry): string;
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
  nodeId?: string; /** Lineage-fold attribution (XF-04; DEF-3). */
  logicalTaskId?: string;
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
  * The disposition for alias-sourced candidates (DEF-5, docs/03 9.5):
  * bypasses the abandon overlay so donor entries regain their
  * pre-abandon terminal status when matched through the alias.
  */
  setAliasDisposition(disposition: (op: JournalOperation) => OperationDisposition): void;
  /**
  * Registers a node.link scope-prefix rewrite (DEF-5, docs/03 9.5):
  * donorPrefix forward-matches into targetPrefix at every nested level.
  * Idempotent; the alias map is rebuilt by fold on resume.
  */
  registerAlias(donorPrefix: string, targetPrefix: string): void;
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
  /**
  * Two-phase dispatch: the running entry (kinds agent, step, child).
  * `value` is legal on child dispatches only: the child payload
  * `{ workflow, childScope }` lets the abandon fold compute the child's
  * transitive scope coverage (docs/03, section 8.4; M6-T06). Values
  * never enter identity.
  */
  appendRunning(input: BaseAppend & {
    memoizeOutcome?: boolean;
    value?: unknown;
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
  /**
  * Audit fields (docs/08, section 4.5; M5-T05): the chain verdict,
  * the deciding layer, the matched rule, and advisory domain-rule
  * matches. Telemetry, never identity; ask verdicts additionally
  * journal as suspended approvals.
  */
  verdict?: "allow" | "deny" | "ask";
  decidedBy?: string;
  rule?: Json;
  advisory?: Json;
};
/**
* docs/09 section 1.4, adaptive orchestration, resolutions, and
* accounting: emitted only by runs where the corresponding machinery is
* active (applicability per mode: docs/07, section 1). The types land as
* one closed catalog with M7-T03; emitters arrive with their tasks.
*/
type AdaptiveEvents = {
  type: "plan:revised";
  entryRef: number;
  planHash: string;
  applied: number;
  dropped: number;
  revisionUnitsRemaining: number;
} | {
  type: "node:parked";
  nodeId: string;
  logicalTaskId: string;
} | {
  type: "node:cancelled";
  nodeId: string;
  logicalTaskId: string;
} | {
  type: "node:linked";
  nodeId: string;
  logicalTaskId: string;
  donorRef: number;
  reclaimedUsd: number;
} | {
  type: "orchestrator:woke";
  digestSeq: number;
  planHash: string;
  coversToOrdinal: number;
  renderSize: number;
} | {
  type: "orchestrator:budget";
  entryRef: number;
  spentUsd: number;
  effectiveCapUsd: number;
  reserveUsedUsd: number;
  frozen: boolean;
} | {
  type: "escalation:raised";
  entryRef: number;
  kind: "scope_bigger" | "scope_different" | "blocked_with_evidence";
  logicalTaskId: string;
  costToDateUsd: number;
} | {
  type: "escalation:decided";
  entryRef: number;
  decision: "retry" | "decompose" | "cancel" | "accept";
  by: ResolutionBy;
  countsAgainstLimit: boolean;
} | {
  type: "spawn:admitted";
  entryRef: number; /** The admitting arms of the unified AdmitVerdict union (docs/07, 7.2). */
  verdict: "admit" | "reuse_full" | "admit_graft";
  agentType: string;
  logicalTaskId: string;
  spawnUnitsAfter: number;
} | {
  type: "spawn:rejected";
  entryRef: number;
  code: string;
  agentType: string;
  logicalTaskId?: string;
} | {
  type: "verify:failed";
  entryRef: number;
  logicalTaskId: string;
  rung: number;
  gate: "mechanical" | "judge" | "spot-check";
} | {
  type: "ledger:op";
  entryRef: number;
  op: "brief_set" | "fact_add" | "fact_supersede" | "lesson_add" | "observation_add";
} | {
  type: "stall:detected";
  logicalTaskId: string;
  stallStreak: number;
} | {
  type: "guard:oscillation";
  spawnKeyHash: string;
  oscillationCount: number;
  limit: number;
} | {
  type: "resolution:applied";
  targetRef: number;
  entryRef: number;
  by: ResolutionBy;
} | {
  type: "resolution:superseded";
  targetRef: number;
  entryRef: number;
  supersededBy: number;
  reason: "already_resolved" | "target_abandoned";
} | {
  type: "termination:debit";
  entryRef: number;
  counter: string;
  remaining: number;
  phi: number;
} | {
  type: "termination:denied";
  entryRef: number;
  counter: string;
  code: string;
} | {
  type: "termination:config-drift";
  field: string;
  frozenValue: Json;
  liveValue: Json;
} | {
  type: "journal:compat";
  code: "HASH_VERSION_TOO_OLD" | "HASH_VERSION_TOO_NEW";
  found: number;
  window: [number, number];
};
type WorkflowEventBody = CoreEvents | AgentEvents | ToolEvents | AdaptiveEvents;
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
//#region src/model/retry.d.ts
type RetryClass = "transport" | "rate-limit" | "overloaded";
interface RetryPolicy {
  /** Total tries per serving model, the initial attempt included. */
  attempts: number;
  backoff: {
    initialMs: number;
    factor: number;
    maxMs: number;
    jitter?: boolean;
  };
  /** Classes that retry; absent = the Appendix A default set. */
  retryOn?: RetryClass[];
}
/** Appendix A committed defaults (M4 entry gate, PR #26). */
declare const DEFAULT_RETRY_POLICY: RetryPolicy;
/**
* Classifies a WireError for the retry engine. Task-class failures are
* never retryable by construction: adapters mark them retryable: false
* and this returns undefined. The kind travels in WireError.data.kind
* (docs/04, section 4.9); anything retryable without a specific kind is
* transport.
*/
declare function retryClassOf(error: WireError): RetryClass | undefined;
/**
* The delay before retry number `retryIndex` (0-based: the delay after
* the first failed attempt has index 0). A provider-supplied
* retryAfterMs REPLACES the computed delay (Appendix A). Jitter is
* equal-jitter: half the backoff is deterministic, half random, so a
* jittered delay never collapses to zero.
*/
declare function retryDelayMs(policy: RetryPolicy, retryIndex: number, retryAfterMs?: number, random?: () => number): number;
//#endregion
//#region src/model/failover.d.ts
/** Transport-level failover triggers; budget is explicitly excluded. */
type FailoverTrigger = "transport" | "rate-limit";
/** One resolved failover target (docs/04, section 11.2 rich form). */
interface FailoverTarget {
  model: ModelRef;
  /** Triggers this target serves; absent = both. */
  on?: FailoverTrigger[];
}
/** Normalizes the author-facing ModelChoice.fallbacks list (docs/04, 8.1). */
declare function normalizeFallbacks(refs: ModelRef[] | undefined): FailoverTarget[];
/**
* Maps a retry class to its failover trigger once retries exhaust.
* Overloaded (529) is transport-class for failover purposes; a
* non-retryable error never fails over.
*/
declare function failoverTriggerOf(retryClass: RetryClass | undefined): FailoverTrigger | undefined;
/**
* The next target index past `from` that serves `trigger`, or undefined
* when the chain is exhausted. Index 0 is the primary; the chain never
* moves backwards (sticky failover).
*/
declare function nextFailover(targets: Array<Pick<FailoverTarget, "on">>, trigger: FailoverTrigger, from: number): number | undefined;
/** The degenerate fallback triggers (docs/04, section 11.3). */
type FallbackTrigger = "error" | "limit" | "schema-exhausted";
/** The degenerate fallback field: one agent-level second attempt. */
interface FallbackField {
  model: ModelRef;
  on: FallbackTrigger[];
}
/**
* Classifies a terminal agent outcome for the degenerate fallback
* (docs/04, 11.3 as amended): schema-mismatch errors are
* 'schema-exhausted'; any other error is 'error'; limit terminals (the
* no-progress abort included) are 'limit'; cancelled, escalated, and
* skipped never trigger.
*/
declare function fallbackTriggerOf(outcome: {
  status: string;
  error?: Pick<AgentError, "kind">;
}): FallbackTrigger | undefined;
//#endregion
//#region src/model/concurrency.d.ts
declare class KeyedLimiter {
  private readonly semaphores;
  constructor(caps?: Record<string, number>);
  /** Queue depth for one key (0 for unlimited keys); telemetry only. */
  pending(key: string): number;
  /**
  * Runs `fn` under the key's semaphore; keys without a configured cap
  * run unlimited (no queueing, no overhead).
  */
  withSlot<T>(key: string, fn: () => Promise<T>, onQueued?: () => void): Promise<T>;
}
//#endregion
//#region src/model/floors.d.ts
/** An explicit allowlist and denylist; deny wins over allow. */
type ModelListConstraint = {
  allow?: ModelRef[];
  deny?: ModelRef[];
};
/** Bridges the ModelKnowledge vocabulary (docs/05); default unclassified. */
type TaskClass = string;
interface QualityFloors {
  byRole?: Partial<Record<InvocationRole, ModelListConstraint>>;
  byTaskClass?: Partial<Record<TaskClass, ModelListConstraint>>;
}
/**
* Enforces the floors for one resolved invocation. `taskClass` is the
* profile-declared class; when absent (unclassified) only byRole floors
* apply. Throws a typed ConfigError on violation.
*/
declare function checkFloors(options: {
  ref: ModelRef;
  role: InvocationRole;
  floors?: QualityFloors;
  taskClass?: TaskClass;
}): void;
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
  capsOf: (ref: ModelRef) => ModelCaps; /** Hard router constraints; violation is a typed ConfigError (M4-T09). */
  floors?: QualityFloors; /** Profile-declared task class; absent = unclassified, byRole only. */
  taskClass?: string;
}): ResolvedInvocation;
/**
* Canonicalizes a declared LadderSpec (docs/04, section 12): validates the
* shape once (FR-119 judge declaration included) and resolves every rung's
* effort to an explicit value. `chainEffort` is the effort the resolution
* chain would contribute at the declaring layer; a rung that resolves no
* effort at all is a ConfigError (the canonical form has no absent-effort
* member by declaration).
*/
declare function canonicalizeLadder(spec: LadderSpec, options?: {
  chainEffort?: Effort;
}): CanonicalLadderSpec;
/**
* The concrete ModelChoice of one rung attempt: each attempt is an
* ordinary agent scope whose CanonicalModelSpec is that rung's
* `{ kind: 'model' }` form (docs/04, section 8.2).
*/
declare function ladderRungChoice(ladder: CanonicalLadderSpec, index: number): ModelChoice;
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
/** The verdict of one mechanical acceptance gate evaluation (docs/07, section 10). */
interface MechanicalGateVerdict {
  pass: boolean;
  detail?: string;
}
/**
* A mechanical acceptance gate: an engine-registered NAMED pure function
* over AgentResult.artifacts (docs/04, section 12; docs/07, section 10).
* The registry is per engine like every other registry (docs/02); the
* ladder driver journals each evaluation as a decision entry, so the
* ladder fold consumes only journaled verdicts, never live re-evaluation.
*/
type MechanicalGateProfile = (artifacts: readonly Artifact[]) => MechanicalGateVerdict;
interface AgentResult<T> {
  status: AgentStatus;
  output: T | null;
  usage: Usage;
  costUsd: number;
  turns: number;
  /**
  * The model that actually served the loop phase at the end (M4-T04):
  * differs from the requested spec only under transport failover.
  */
  servedBy: ModelRef;
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
interface GateAudit {
  verdict: "allow" | "deny" | "ask";
  decidedBy: string;
  rule?: Json;
  advisory?: Json;
}
type PermissionGate = ({
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
}) & {
  /** Chain audit payload ridden into tool:end telemetry (docs/08, 4.5). */audit?: GateAudit;
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
/** One serving target of a phase: the primary or a failover fallback. */
interface PhaseTarget {
  adapter: ProviderAdapter;
  resolved: ResolvedInvocation;
}
interface RunAgentOptions<S extends SchemaSpec = JsonSchema> {
  prompt: string;
  schema?: S;
  /** Canonicalized JSON Schema projection of `schema` (precomputed for identity). */
  canonicalSchema?: JsonSchema;
  adapter: ProviderAdapter;
  resolved: ResolvedInvocation;
  /**
  * Transport failover chain for the loop phase (M4-T04; docs/04,
  * section 11.2): resolved fallback targets tried in order on
  * transport or rate-limit failures after retries exhaust. Failover is
  * sticky and changes only servedBy, never the content key.
  */
  fallbacks?: PhaseTarget[];
  /**
  * Transport RetryPolicy (M4-T05; docs/04, section 11.1): lives UNDER
  * the journal, wired around every adapter.stream dispatch. sleep and
  * random are injectable for tests; the core owns wall-clock.
  */
  retry?: {
    policy?: RetryPolicy;
    sleep?: (ms: number) => Promise<void>;
    random?: () => number;
  };
  /**
  * Per-provider keyed limiter hook (M4-T07): wraps every wire dispatch
  * under the serving adapter's key; absent = unlimited (Appendix A).
  */
  providerSlot?: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
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
  extract?: PhaseTarget & {
    fallbacks?: PhaseTarget[];
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
  finalize?: PhaseTarget & {
    fallbacks?: PhaseTarget[];
  };
  /**
  * Summarize invocation target for compaction (M4-T03): resolved
  * through the chain with role 'summarize', falling back to the loop
  * model when routing resolves nothing (docs/06, section 7). Compaction
  * is ON by default; absence of this option disables it (direct
  * runAgent callers).
  */
  summarize?: PhaseTarget & {
    fallbacks?: PhaseTarget[];
  };
  /** Per-profile compaction config; threshold default 0.8 (Appendix A). */
  compaction?: {
    threshold?: number;
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
  /**
  * Terminal-tool interception (M6-T07): an accepted call to the named
  * tool ends the loop with status ok; the call's validated `result`
  * argument becomes the agent output (the orchestrator finish tool,
  * docs/07 4.11). The tool's execute never runs, mirroring escalate.
  */
  terminalTool?: {
    name: string;
  };
  agentType?: string;
  /** The primary invocation role of the tool loop; default 'loop' (M6-T05). */
  role?: "loop" | "plan" | "orchestrate";
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
/** The run-root account scope (docs/06, section 5.4 scope vocabulary). */
declare const ROOT_ACCOUNT = "run";
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
/** Read-only projection of one account (docs/06, section 5.4). */
interface BudgetAccountView {
  scope: string;
  ceilingUsd?: number;
  spentUsd: number;
  committedReserveUsd: number;
  finalizeReserveUsd: number;
  parentScope?: string;
}
/**
* The per-run budget account tree. All spend accounting is per instance;
* the journal remains the durable source (the root is seeded by the
* ledger fold on resume, M2; sub-account reserves are recovered from
* spawn-admission decision entries, M6).
*/
declare class RunBudget {
  /** B0; immutable after start. Undefined means no USD ceiling. */
  readonly ceilingUsd?: number;
  private readonly lifetimeSpawnCap;
  private readonly events?;
  private readonly priceUsd?;
  private readonly accounts;
  private usageInternal;
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
  private get root();
  /** The account chain from `scope` up to and including the root. */
  private chainOf;
  /**
  * Opens a child sub-account under `parentScope` (docs/06, section 5.4).
  * Re-opening an existing scope is the resume roll-forward path: the
  * recorded ceiling wins once and the accumulated state is kept.
  */
  openAccount(scope: string, options: {
    parentScope?: string;
    ceilingUsd?: number;
    finalizeReserveUsd?: number;
  }): void;
  accountView(scope: string): BudgetAccountView | undefined;
  /**
  * The admission remainder of one account: ceiling minus spend minus
  * committed reserves minus the finalize reserve (DEF-7: childBudget
  * fractions never eat finalization money). Undefined when uncapped.
  */
  remainderOf(scope: string): number | undefined;
  /** Layer 3 ceiling signal of the run root; live streams sever through it. */
  get signal(): AbortSignal;
  /** The layer-3 signal of one sub-account's subtree, when it exists. */
  signalOf(scope: string): AbortSignal | undefined;
  get exhausted(): boolean;
  get committedReserveUsd(): number;
  /** Spawn headroom under the engine lifetime cap (embedded in admission verdicts). */
  get spawnHeadroom(): number;
  /**
  * Layer 1: admission before spawn. Blocks when spent + committedReserve
  * has reached the ceiling on ANY account in the ancestor chain of
  * `accountScope`, otherwise commits the reserve along the whole chain.
  * Also enforces the engine lifetime spawn cap (docs/06, "Scheduler").
  */
  admitSpawn(reserveUsd: number, accountScope?: string): void;
  /**
  * Resume roll-forward: commits a reserve recovered from a journaled
  * spawn-admission decision entry without re-evaluating admission
  * (docs/06, 5.1: reserves are recovered, never re-estimated).
  */
  admitRecovered(reserveUsd: number, accountScope?: string): void;
  /** The reserve is replaced by real spend when the spawn settles. */
  releaseReserve(reserveUsd: number, accountScope?: string): void;
  /** Layer 2: the per-turn guard. A turn that would cross any ceiling in the chain is not dispatched. */
  beforeTurn(accountScope?: string): void;
  /**
  * Live accounting; spend propagates from `accountScope` to every
  * ancestor. Crossing a ceiling severs the crossing account's subtree
  * via its layer-3 AbortSignal (overshoot bounded by one turn per
  * in-flight agent; providers bill severed streams).
  */
  onUsage(usage: Usage, servedBy: ModelRef, accountScope?: string): void;
  spent(): Spend;
  /** Null when the run has no USD ceiling (docs/06, section "Canonical Ctx interface"). */
  remaining(): Spend | null;
  private emitUpdate;
}
//#endregion
//#region src/orchestrator/admission.d.ts
/** Plan-node identity; engine-minted ULID (docs/07, section 3.1). */
type NodeId = string;
/** Layer-1 reservation embedded in the carrying decision entry. */
interface BudgetReserve {
  reserveUsd: number;
  /** The child sub-account ceiling; absent when the parent is uncapped. */
  childCeilingUsd?: number;
}
/** The lineage block every non-reject verdict carries (DEF-3). */
interface AdmitLineage {
  logicalTaskId: LogicalTaskId;
  isNew: boolean;
  depth: number;
}
/**
* The unified admission verdict (docs/07, section 7.2; XF-11). One union,
* closed now; every debit is atomic with its carrying decision entry and
* embeds the balance-after (DEF-2).
*/
type AdmitVerdict = {
  kind: "admit";
  reserve: BudgetReserve;
  dedup?: DedupNote;
  spawnUnitsAfter: number;
  lineage: AdmitLineage;
} | {
  kind: "reuse_full";
  donor: DonorRef;
  spawnUnitsAfter: number;
  lineage: AdmitLineage & {
    isNew: false;
  };
} | {
  kind: "admit_graft";
  donor: DonorRef;
  reserve: BudgetReserve;
  boot: GraftBoot;
  spawnUnitsAfter: number;
  lineage: AdmitLineage;
} | {
  kind: "reject";
  reason: AdmitRejectReason;
};
/** The merged reject-code set (docs/07, section 7.2). */
type AdmitRejectReason = {
  code: "depth" | "quota" | "budget" | "lifetime" | "termination_exhausted" | "ladder_exceeds_frozen" | "lineage_exhausted" | "lineage_busy";
} | {
  code: "osc_guard";
  spawnKey: SpawnKey;
  oscillationCount: number;
};
/** Every spawn origin routed through the single admission point (docs/07, 7.1). */
type SpawnOrigin = "ctx.workflow" | "ctx.orchestrate" | "spawn_agent" | "parallel_agents" | "escalation-decomposition" | "rung-respawn" | "reuse-link";
/** What the admission point needs to know about one spawn. */
interface AdmitSpec {
  origin: SpawnOrigin;
  /** Registered workflow name or agent profile name; telemetry and cards only. */
  name: string;
  /** The child's journal scope; doubles as its budget account scope. */
  childScope: string;
  /** The nearest enclosing budget account of the spawner. */
  parentAccountScope: string;
  /** Explicit child budget; clamped by childBudgetFraction (docs/07, 4.1). */
  budgetUsd?: number;
  /** Reserve hint; falls back to the flat engine default (docs/06, 5.1). */
  estCostUsd?: number;
  /**
  * Lineage continuation (DEF-3); absence mints a fresh lineage root. A
  * continuation demands a causeRef: the seq of the entry that caused the
  * rebirth (docs/03, 10.1, rule 2).
  */
  lineage?: SpawnLineageOpt;
  /** Raw approach tag; normalized by the engine (docs/03, 10.2). */
  approach?: string;
  /** Decomposition parent-LTID chain (relation 'decompose-child' only). */
  ancestry?: LogicalTaskId[];
  /**
  * Coarse-signature identity inputs; unspecified fields canonize onto
  * the deterministic legacy constants so signatures stay byte-stable
  * (docs/03, 10.2; the toolset/schema registries land in M7-T05).
  */
  signature?: Partial<ApproachSignatureInputs>;
  /**
  * The declared ladder length of the resolved profile (K_l); default 1,
  * the single implicit rung. Under a termination account, a length
  * beyond the frozen kMax rejects with ladder_exceeds_frozen and a NEW
  * lineage is allocated E0 escalation units plus K_l - 1 rungs (DEF-2).
  */
  ladderLength?: number;
  /**
  * The children-quota key (maxChildrenPerNode); defaults to
  * parentAccountScope. Orchestrators pass their own scope so each node
  * counts its own children (docs/07, 7.3).
  */
  nodeKey?: string;
}
/** Live pre-append snapshot embedded in the decision entry (DEF-2/DEF-3). */
interface AdmissionStatsBefore {
  spawnsBefore: number;
  childrenOfParentBefore: number;
  depth: number;
  /** The LTID's pinned lineage fold at admit time (DEF-3). */
  lineage?: LineageStats;
}
/** The full admission decision embedded in the carrying entry. */
interface AdmissionDecision {
  verdict: AdmitVerdict;
  statsBefore: AdmissionStatsBefore;
  /** Node identity minted inside the decision (docs/07, section 5); absent on reject. */
  nodeId?: NodeId;
  /**
  * The computed value-part lineage block (DEF-3): reused byte-exact on
  * replay, never recomputed (docs/03, 10.6). Absent on reject.
  */
  lineage?: SpawnLineage;
  /**
  * The declared ladder length recorded for the termination fold
  * (DEF-2): the replay recomputation reads K_l from the entry, never
  * from the live registry. Present only under a termination account.
  */
  ladderLength?: number;
}
declare const DEFAULT_MAX_DEPTH = 1;
declare const MAX_DEPTH_CEILING = 4;
declare const DEFAULT_MAX_CHILDREN_PER_NODE = 16;
declare const DEFAULT_CHILD_BUDGET_FRACTION = .3;
/** Nesting depth of a child scope: its workflow, agent, and plan-node segments. */
declare function spawnDepthOf(childScope: string): number;
declare class AdmissionController {
  private readonly budget;
  private readonly maxDepth;
  private readonly maxChildrenPerNode;
  private readonly childBudgetFraction;
  private readonly flatReserveUsd;
  private readonly maxTotalSpawns?;
  private readonly mintId;
  private readonly journalView?;
  private readonly lineageIndex?;
  private readonly lineageLimits;
  private terminationAccount?;
  /** Children admitted per parent node this process lifetime. */
  private readonly childrenOf;
  private admittedTotal;
  constructor(options: {
    budget: RunBudget;
    maxDepth?: number;
    maxChildrenPerNode?: number;
    childBudgetFraction?: number;
    flatReserveUsd?: number; /** Per-orchestrate spawn cap (docs/06, 9.3 maxSpawns); engine lifetime cap applies regardless. */
    maxTotalSpawns?: number;
    mintId?: () => string;
    /**
    * The lineage binding (DEF-3): a journal view for the pure counter
    * folds plus the configured limits. Without it the controller mints
    * and embeds lineage but enforces no lineage limits (unit contexts).
    */
    lineage?: {
      journalView: () => readonly JournalEntry[];
      limits?: Partial<EscalationLimits> | Record<string, unknown>;
    };
  });
  /** The lineage counter folds over the run journal (absorbed lazily). */
  lineage(): LineageIndex | undefined;
  /** The validated lineage limits this controller enforces (DEF-3). */
  get escalationLimits(): EscalationLimits;
  /**
  * Binds the run's TerminationAccount (DEF-2; PlanRunner runs only,
  * docs/07 section 1): from bind time on, every admitted spawn of any
  * origin debits one spawnUnit atomically with its decision entry, and
  * a declared ladder longer than the frozen kMax rejects with
  * ladder_exceeds_frozen. Non-PlanRunner runs never bind an account and
  * keep the engine lifetime cap semantics unchanged.
  */
  bindTermination(account: TerminationAccount): void;
  /** The bound account, when this is a PlanRunner run (DEF-2). */
  get termination(): TerminationAccount | undefined;
  /**
  * The lineage half of admission (DEF-3, docs/03 section 10.5): folds are
  * computed live STRICTLY BEFORE the carrying decision entry is appended;
  * the caller embeds the returned block in the entry and replay reads it
  * back byte-exact. Enforces the single-live-attempt invariant
  * (`lineage_busy`) and monotonic attempt consumption
  * (`lineage_exhausted`); never touches budget or structural limits.
  */
  evaluateLineage(spec: {
    name: string;
    lineage?: SpawnLineageOpt;
    approach?: string;
    ancestry?: LogicalTaskId[];
    signature?: Partial<ApproachSignatureInputs>;
  }): {
    decision: {
      kind: "ok";
      lineage: SpawnLineage;
    } | {
      kind: "reject";
      reason: {
        code: "lineage_busy" | "lineage_exhausted";
      };
    };
    statsBefore?: LineageStats;
  };
  /**
  * Registers a live lineage admit the moment its caller commits to
  * appending the decision entry, closing the single-live-attempt window
  * until the journal absorbs the entry (DEF-3).
  */
  registerLineageAdmit(logicalTaskId: LogicalTaskId): void;
  /**
  * Evaluates one spawn live, strictly BEFORE its decision entry is
  * appended. On admit the reserve is committed on the whole ancestor
  * account chain atomically with the evaluation; the caller journals the
  * returned decision and only then produces effects (child account,
  * dispatch). On reject nothing is committed and the reject verdict is
  * journaled by the caller so replay re-delivers it without
  * re-evaluation.
  */
  admit(spec: AdmitSpec, options?: {
    commitReserve?: boolean;
  }): AdmissionDecision;
  /**
  * Resume roll-forward for an orchestrator child (M6-T07): restores the
  * children-quota counter only. The budget seed already counts settled
  * agent dispatches, and an in-flight child re-commits its reserve
  * through the ctx.agent dispatch path.
  */
  recoverChild(nodeKey: string): void;
  /**
  * Resume roll-forward for a child that already SETTLED before the
  * resume: re-registers the counters (maxChildrenPerNode, the lifetime
  * cap, statsBefore fidelity) without committing any reserve; the spend
  * itself sits in the root ledger seed (docs/03, 13.3).
  */
  recoverSettled(parentAccountScope: string): void;
  /**
  * Resume roll-forward for an admission whose decision entry exists but
  * whose child has NOT settled: re-applies the recorded reserve and
  * counters without re-evaluating any limit (docs/07, 7.1: replay never
  * re-evaluates admission; docs/06, 5.1: reserves are recovered, never
  * re-estimated).
  */
  recoverInFlight(parentAccountScope: string, verdict: AdmitVerdict): void;
}
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
//#region src/model/pricing.d.ts
interface PriceTable {
  /** Monotonic version string; recorded in decision entries. */
  pricingVersion: string;
  models: Record<ModelRef, Pricing>;
}
/**
* Resolves the pricing for a model: the versioned table wins; the
* adapter-reported caps.pricing is the fallback; undefined means
* unpriced (the CostReport surfaces it, never a silent zero).
*/
declare function resolvePricing(ref: ModelRef, table: PriceTable | undefined, capsPricing: Pricing | undefined): Pricing | undefined;
/**
* Dollars from normalized usage against one pricing row (docs/04,
* section 1.6: the adapter normalized the usage; inputTokens is the
* full prompt). Cache writes price at the 5m premium rate; the 1h rate
* applies where a provider distinguishes it in usage, which the
* canonical Usage does not yet carry (docs/04, section 10).
*/
declare function priceUsdOf(pricing: Pricing, usage: Usage): number;
//#endregion
//#region src/engine/engine.d.ts
/**
* The per-engine workflow registry (docs/06, section 10.4; M5-T01): an
* explicit, first-class value; no module-level registry exists. Shells
* resolve by-name runs against it; ctx.workflow's string form (M6) and
* the queue worker (M8) resolve against it too. CompiledWorkflow values
* join the union when they first exist (M6).
*/
type WorkflowRegistry = Record<string, Workflow<never, unknown>>;
interface EngineDefaults {
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  profiles?: Record<string, AgentProfile>;
  /** The workflow registry for shells and by-name resolution (10.4). */
  workflows?: WorkflowRegistry;
  /** Registered SchemaSpec names for outputSchemaRef (docs/08; M7-T05). */
  schemas?: Record<string, SchemaSpec>;
  /** Registered tool profile names for toolsetRef (docs/08; M7-T05). */
  toolsets?: Record<string, ToolsOption>;
  /**
  * Registered mechanical gate profiles: named pure functions over
  * AgentResult.artifacts for ladder acceptance gates (docs/02, section
  * "Registries"; docs/07, section 10; M7-T10).
  */
  gates?: Record<string, MechanicalGateProfile>;
  limits?: UsageLimits;
  /** Engine-wide permission chain layers (docs/08, section 3). */
  permissions?: PermissionConfig;
  /** The worktree lifecycle provider (docs/08, section 8). */
  isolation?: IsolationProvider;
  /** Engine-wide transport RetryPolicy (docs/04, 11.1; M4-T05). */
  retry?: RetryPolicy;
  /** Hard per-role model constraints (docs/04, section 9; M4-T09). */
  roleFloors?: QualityFloors;
}
interface BudgetDefaults {
  /** Last resort of the admission reserve formula; default 0.50. */
  flatReserveUsd?: number;
  /** Engine kill switch; default 500 spawns per run. */
  lifetimeSpawnCap?: number;
  /**
  * Fraction of the parent remainder (minus the parent finalize reserve)
  * a child sub-account may take; default 0.3 (docs/06, 5.4; M6-T06).
  */
  childBudgetFraction?: number;
  /** AdmissionController nesting depth; default 1, hard ceiling 4 (docs/07, 7.3). */
  maxDepth?: number;
  /**
  * Lineage limits (DEF-3, docs/03 section 10.5): maxEscalationsPerLogicalTask
  * (default 2) and maxAttemptsPerLogicalTask (default 8), monotonically
  * consumed. The validator rejects the pre-rename knob name
  * maxEscalationsPerNode with a migration hint (XF-10).
  */
  lineage?: Partial<EscalationLimits>;
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
    perRun?: number; /** Per-adapter-id caps; unlimited unless configured (Appendix A; M4-T07). */
    perProvider?: Record<string, number>;
  };
  /** Versioned price table; wins over caps.pricing (docs/04, section 10; M4-T06). */
  pricing?: PriceTable;
  /**
  * Runner registrations beyond the built-in InProcessRunner (docs/06,
  * sections 8 and 10.1; M6-T02). `sandbox` executes CompiledWorkflow
  * values (WorkerSandboxRunner ships in @lurker/planner); running or
  * resuming a compiled workflow without one is a typed ConfigError.
  */
  runners?: {
    sandbox?: ScriptRunner;
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
  run<A, R>(wf: Workflow<A, R> | CompiledWorkflow, args: A, opts?: RunOptions): RunHandle<R>;
  /**
  * Rebinds a journal to a workflow definition and resumes (docs/06,
  * section "Engine and ops API"). Requires wf for in-process workflows;
  * a name mismatch is a typed ConfigError; a body-hash mismatch warns
  * loudly and proceeds (the journal decides replay per content keys).
  * A compiled run resumes WITHOUT wf: the engine rehydrates the
  * persisted source pinned by workflowHash; supplying a compiled wf
  * whose source hash differs from the recorded one is a typed
  * ConfigError (docs/06, 10.2; M6-T02).
  */
  resume<A, R>(runId: string, wf?: Workflow<A, R> | CompiledWorkflow, options?: ResumeOptions): ResumeHandle<R>;
  /**
  * Renders the registered agent profiles into the shared vocabulary
  * card (docs/06, 9.3), optionally filtered to `names`; the registry
  * itself stays private to the engine (docs/06, 10.2; M6-T05
  * amendment). Unknown names are ignored.
  */
  profileCard(names?: readonly string[]): string;
}
/** Content hash of an in-process workflow body (run-to-definition binding, docs/06 10.2). */
declare function hashWorkflowBody(wf: Workflow<never, never> | Workflow<unknown, unknown>): string;
/** Content hash of a compiled workflow source (run-to-definition binding, docs/06 10.2). */
declare function hashWorkflowSource(source: string): string;
/** TranscriptStore ref of the persisted CompiledWorkflow source blob. */
declare function workflowSourceRef(runId: string): string;
declare function createEngine(options: CreateEngineOptions): Engine;
//#endregion
//#region src/orchestrator/handles.d.ts
/** docs/07 section 5: the per-child digest handed to the orchestrator. */
interface TaskDigest {
  nodeId: string;
  logicalTaskId: string;
  status: string;
  outputSummary: string;
  costUsd: number;
  artifactsIndex: string[];
}
/** One spawned child tracked by the orchestrator runtime. */
interface SpawnRecord {
  handle: number;
  spawnOrdinal: number;
  nodeId: string;
  logicalTaskId: string;
  /** Settles with the child's full result; never rejects. */
  result: Promise<AgentResult<unknown>>;
  settled?: AgentResult<unknown>;
  abort: () => void;
}
/** The engine seam the spawn tools close over (never on ToolContext). */
interface OrchestratorRuntime {
  spawn(params: {
    agentType: string;
    prompt: string;
    outputSchemaRef?: string;
    toolsetRef?: string;
    budgetUsd?: number;
    model_hint?: {
      startTier?: number;
    };
    approach?: string;
    lineage?: {
      continues: string;
      relation?: string;
      causeRef: number;
    };
    taskClass?: string;
  }): Promise<{
    handle: number;
  }>;
  awaitAny(handles: number[]): Promise<TaskDigest>;
  awaitAll(handles: number[]): Promise<TaskDigest[]>;
  cancel(handle: number, reason?: string): Promise<{
    cancelled: boolean;
    handle: number;
  }>;
  /** docs/07 4.8: sleep until a coalesced WakeDigest (M6-T09). */
  waitForEvents(triggers: unknown): Promise<unknown>;
}
/**
* The M6 outputSummary: a deterministic truncation of the child's
* output (or error message), identical live and on replay (docs/07
* section 2, clause 3: distillation lives with the child, ordered by
* spawn ordinal; the LLM distillation upgrade is M7 territory).
*/
declare function summarizeOutput(result: AgentResult<unknown>): string;
/** Folds one settled child into its digest (spawn-ordinal ordering is the caller's). */
declare function digestOf(record: SpawnRecord, result: AgentResult<unknown>): TaskDigest;
/** The journaled spawn-admission payload the runtime writes and recovers. */
interface SpawnAdmissionValue {
  decisionType: "spawn-admission";
  origin: "spawn_agent" | "parallel_agents";
  orchestratorScope: string;
  spawnOrdinal: number;
  name: string;
  childScope: string;
  parentAccountScope: string;
  spec: Json;
  decision: Json;
}
//#endregion
//#region src/orchestrator/wake.d.ts
/** docs/07 4.8: the wait_for_events parameter schema (normative). */
declare const WAIT_FOR_EVENTS_SCHEMA: SchemaSpec;
declare const WAIT_FOR_EVENTS_TOOL_NAME = "wait_for_events";
/** The closed v1 trigger vocabulary (docs/07 4.8). */
type WakeTrigger = {
  kind: "quiescence";
} | {
  kind: "child_terminal";
  handles?: number[];
} | {
  kind: "escalation";
} | {
  kind: "budget_threshold";
  percent: 50 | 80;
};
/** docs/07 section 5: the escalation block of a digest. */
interface EscalationDigest {
  nodeId: string;
  logicalTaskId: string;
  /** seq of the terminal escalated entry. */
  reportRef: number;
  kind: string;
  flavor: "A" | "B";
}
/**
* The M6 substrate WakeDigest (docs/07 section 5; the termination,
* budget, and reuse blocks complete the shape in M7 as one coordinated
* hashVersion-2 change).
*/
interface WakeDigest {
  digestSeq: number;
  coversToOrdinal: number;
  completedDigests: TaskDigest[];
  escalations: EscalationDigest[];
}
//#endregion
//#region src/orchestrator/extension.d.ts
/** One append into an extension-owned sequential scope. */
interface ExtensionAppendInput {
  scope: string;
  /** The content key; extension kinds derive their own (docs/07, 3.3). */
  key: string;
  kind: EntryKind;
  value: Json;
}
/** A child dispatch under an explicit scope (plan/NodeId). */
interface ExtensionDispatchSpec {
  agentType: string;
  prompt: string;
  /** Resolved against defaults.schemas (docs/08); unknown names are typed errors. */
  outputSchemaRef?: string;
  /** Resolved against defaults.toolsets (docs/08); unknown names are typed errors. */
  toolsetRef?: string;
  isolation?: IsolationSpec;
  budgetUsd?: number;
  usageLimits?: Partial<UsageLimits>;
  escalation?: EscalationOptions;
  approach?: string;
  taskClass?: string;
  /**
  * A retained transcript checkpoint the dispatch boots from (park and
  * unpark continuation, the DEF-5 graft boot; docs/03, sections 9.5 and
  * 11.2). Dangling redispatch checkpoints take precedence.
  */
  bootCheckpointRef?: string;
  /**
  * The CONCRETE model of this attempt: the ladder driver resolves each
  * rung to its `{ model, effort }` form and dispatches with it, so the
  * attempt's identity hash includes the concrete ModelRef (docs/07,
  * section 10). The orchestrator itself never names models; only the
  * engine-side driver populates this from the declared ladder.
  */
  model?: {
    model: ModelRef;
    effort?: Effort;
  };
  /**
  * Rung/fallback opt-in (docs/04, section 12): a memoized terminal
  * outcome replays by match instead of re-running live; the global
  * default errors-re-run-live is preserved (DEF-1).
  */
  memoizeOutcome?: boolean;
  /**
  * An INLINE SchemaSpec for engine-synthesized children (the ladder
  * judge verdict); user-authored plan specs use `outputSchemaRef`
  * against the registry instead (docs/07, 4.2).
  */
  schema?: unknown;
}
/** The per-run IO the extension closes over (engine-owned effects). */
interface OrchestratorExtensionIO {
  readonly runId: string;
  /** The scope the orchestrate call runs in ('' at the top level). */
  readonly baseScope: string;
  /** The orchestrator's child scope (agent:<seq>); throws before the loop starts. */
  orchestratorScope(): string;
  /** Registered agent profiles advertised to this orchestrate call. */
  readonly profiles: Record<string, unknown>;
  /**
  * The per-engine mechanical gate registry (docs/07, section 10):
  * named pure functions over AgentResult.artifacts. Typed loose at the
  * seam exactly like `profiles`.
  */
  readonly gates: Record<string, unknown>;
  /** The run USD ceiling (B0), when one exists. */
  readonly runCeilingUsd?: number;
  /** ULID minting for engine-owned identifiers (NodeIds). */
  mintId(): string;
  /**
  * A journaled random draw in [0, 1) under the orchestrate scope: the
  * ctx.random primitive, computed once live and replayed by match. The
  * spot-check gate draws HERE, never Math.random (docs/04, section 12).
  */
  random(key?: string): Promise<number>;
  /** Total-order append; the extension owns its scopes' content keys. */
  append(input: ExtensionAppendInput): Promise<JournalEntry>;
  /** The pinned journal view backing every pure fold. */
  snapshot(): readonly JournalEntry[];
  /** Flushes the serialized append queue before reading back. */
  flush(): Promise<void>;
  /** The single admission point for all spawns (docs/07, 7.1). */
  readonly admission: AdmissionController;
  /**
  * Dispatches one child agent under the EXPLICIT child scope through
  * the ordinary ctx.agent path (semaphore, budget layers, forward
  * matching). Returns the journal-derived handle (the dispatch seq).
  */
  dispatch(spec: ExtensionDispatchSpec, childScope: string, identity: {
    nodeId: string;
    logicalTaskId: string;
  }): Promise<{
    handle: number;
  }>;
  /** The settled result of a dispatched child, when it settled. */
  settledOf(handle: number): AgentResult<unknown> | undefined;
  /** Cancels an in-flight child by handle (AbortSignal). */
  cancel(handle: number, reason?: string): Promise<{
    cancelled: boolean;
    handle: number;
  }>;
  /**
  * Appends the severing abandon ref-entry over a branch through the
  * ResolutionArbiter (DEF-4/DEF-5; docs/03, sections 8.5 and 9.1).
  */
  abandonBranch(attempt: {
    target: number;
    authorizedBy: number;
    nodeId?: string;
    logicalTaskId?: string;
    reason: string;
    retainCheckpoint?: boolean;
    retainWorktree?: boolean;
  }): Promise<{
    applied: boolean;
    seq: number;
  }>;
  /**
  * Registers a node.link scope-prefix alias for forward matching
  * (DEF-5; docs/03, 9.5). Idempotent; rebuilt by fold on resume.
  */
  registerAlias(donorScope: string, targetScope: string): void;
  /** The engine price fold (journal facts in, USD out; docs/04). */
  priceUsd(servedBy: string | undefined, usage: Usage): number | undefined;
  /** Telemetry emission into the run event stream. */
  emit(event: {
    type: string;
  } & Record<string, unknown>): void;
}
/**
* The extension contract. PlanRunner implements it in @lurker/plan; the
* mode (c) orchestrator hosts it. Everything is optional except the
* toolset: an extension that adds no tools has no reason to exist.
*/
interface OrchestratorExtension {
  readonly name: string;
  /**
  * Runs strictly BEFORE the orchestrator agent's first entry (docs/07,
  * 11.6: termination.init precedes the first scheduling entry and the
  * budget reserve). On resume it rebuilds state from the journal.
  */
  boot?(io: OrchestratorExtensionIO): Promise<void> | void;
  /** Extension tools appended to the mode (c) toolset (docs/07, section 4). */
  tools(io: OrchestratorExtensionIO): ToolDef[];
  /** Extra orchestrator prompt lines describing the extension's protocol. */
  promptLines?(): string[];
  /**
  * Called after boot and after EVERY child settlement, strictly before
  * wake triggers are evaluated: the scheduling edge (ready nodes
  * dispatch here, terminal transitions journal here).
  */
  onActivity?(io: OrchestratorExtensionIO): Promise<void> | void;
  /**
  * Quiescence participation (docs/07, 4.8): the mandatory trigger fires
  * only when every dispatched child settled AND the extension reports
  * nothing running and nothing ready.
  */
  quiescent?(): boolean;
  /**
  * Extra fields merged into every WakeDigest (the hash-v2 coordinated
  * schema lands in M7-T13; the substrate merges extras verbatim).
  */
  digestExtras?(io: OrchestratorExtensionIO): Record<string, Json> | undefined;
  /** Observes every delivered digest, including recovered pinned ones. */
  onWake?(digest: WakeDigest): void;
}
//#endregion
//#region src/orchestrator/orchestrate.d.ts
/** docs/06 5.5; the cap machinery (reserves, freeze) completes in M7 (DEF-7). */
interface OrchestratorBudgetSpec {
  capUsd?: number;
  /** default 0.2; effectiveCap = min of the given bounds */
  capFraction?: number;
  finalizeReserveUsd?: number;
  finalizeTurns?: number;
  atCap?: "finish-with-partial" | "fail-run";
}
/** docs/06 9.3: orchestrate(engine, goal, o?). */
interface OrchestrateOptions {
  model?: ModelSpec;
  /** Registered profile names to advertise; default: every profile. */
  profiles?: string[];
  /** Per-orchestrate spawn cap; the engine lifetime cap applies regardless. */
  maxSpawns?: number;
  /** The orchestrator's own budget sub-account (cap enforcement layers only in M6). */
  budget?: OrchestratorBudgetSpec;
  /** UsageLimits of the orchestrator agent itself (maxTurns etc.). */
  limits?: UsageLimits;
  /**
  * The opt-in mode (c) extension seam (M7-T05): PlanRunner from
  * @lurker/plan attaches here (docs/07, section 1). The extension boots
  * strictly before the orchestrator's first agent entry, contributes
  * tools, schedules ready plan nodes on every settlement, and
  * participates in the mandatory quiescence trigger.
  */
  extension?: OrchestratorExtension;
}
declare const ORCHESTRATE_WORKFLOW_NAME = "lurker-orchestrate";
/**
* Builds the orchestrator workflow: ONE implementation behind both
* surfaces. The body wires the spawn tools over the per-call runtime,
* recovers spawn records from the journal on resume, and runs the
* orchestrator agent with the finish terminal tool.
*/
declare function makeOrchestratorWorkflow(goal: string, opts?: OrchestrateOptions): Workflow<undefined, unknown>;
/** Top-level surface: creates a run (docs/06 9.3). */
declare function orchestrate(engine: Engine, goal: string, opts?: OrchestrateOptions): RunHandle<unknown>;
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
  /** Transport RetryPolicy layer: call over profile over engine (M4-T05). */
  retry?: RetryPolicy;
  /** Declared task class bridging ModelKnowledge; default unclassified (M4-T09). */
  taskClass?: string;
  /**
  * Per-profile compaction threshold; default 0.8 of the loop model's
  * contextWindow (docs/06, Appendix A; M4-T03). Compaction is ON by
  * default; history-processor plumbing stays engine-internal.
  */
  compaction?: {
    threshold?: number;
  };
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
  /**
  * The primary invocation role of the agent's tool loop; default
  * 'loop'. The plan and orchestrate entry points set it so the
  * resolution chain, role effort defaults, quality floors, and cost
  * buckets see the right role; extract/finalize/summarize stay
  * trigger-derived and are never settable here (docs/06, 2.1;
  * M6-T05 amendment).
  */
  role?: "loop" | "plan" | "orchestrate";
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
  /** Transport RetryPolicy under the journal (docs/04, 11.1; M4-T05). */
  retry?: RetryPolicy;
  /**
  * The degenerate fallback (docs/04, 11.3; M4-T04): an agent-level
  * second attempt on `model` when the terminal matches `on`; one
  * journaled decision entry; the fallback attempt is a NEW content key.
  */
  fallback?: FallbackField;
  /** Per-call replay mode; default scoped forward-matching (docs/03, section 7.3). */
  replay?: "cache" | "never";
  /** Journaled as a policy field from day one; consumed by the M2 predicate. */
  memoizeOutcome?: boolean;
  /** Opt-in; without it 'escalated' is physically unproducible (docs/07 6.4). */
  escalation?: EscalationOptions;
  /**
  * Lineage continuation (DEF-3, docs/03 section 10.3): declares this
  * spawn a rebirth of an existing logical task; absence means a new
  * lineage root. Never enters the content key. Declaring lineage or
  * approach journals a spawn-admission decision entry BEFORE dispatch,
  * carrying the engine-minted LTID and the computed approach signature.
  */
  lineage?: SpawnLineageOpt;
  /** Approach slug entering approachSig, normalized by the engine (DEF-3). */
  approach?: string;
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
  * Runs a child workflow under the AdmissionController (docs/06, section
  * 2.5; M6-T06). The child gets a nested journal scope (registered name
  * plus ordinal) and a hierarchical budget sub-account whose spend
  * propagates to every ancestor. Structural limit violations throw the
  * typed AdmissionRejectedError and never tear the run down; budget
  * rejections throw BudgetExhaustedError. The string form resolves
  * against the per-engine workflow registry (section 10.4) and is the
  * only form available inside the worker sandbox.
  */
  workflow<A, R>(wf: Workflow<A, R>, args: A, o?: WorkflowCallOpts): Promise<R>;
  workflow(name: string, args?: Json, o?: WorkflowCallOpts): Promise<unknown>;
  /**
  * Nests a dynamic orchestrator under the AdmissionController (docs/06,
  * section 2.6; M6-T07): one implementation with the top-level
  * orchestrate(engine, goal, opts) surface, clamped by maxDepth and the
  * parent budget account through the ordinary ctx.workflow admission.
  */
  orchestrate(goal: string, opts?: OrchestrateOptions): Promise<unknown>;
  /**
  * A journaled summarize invocation for handing an inheritable brief to
  * a child (docs/06, section 2.8; M6-T10): one agent-kind entry under
  * role 'summarize', therefore free on replay.
  */
  brief(o: BriefOpts): Promise<string>;
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
/** Options of ctx.workflow; `key` replaces args in the child identity (docs/03, 1.2). */
interface WorkflowCallOpts {
  key?: string;
  /** Lineage continuation (DEF-3); embedded in the admission decision entry. */
  lineage?: SpawnLineageOpt;
  /** Approach slug entering approachSig (DEF-3). */
  approach?: string;
}
/**
* Options of ctx.brief (docs/06, 2.8; amended during M6-T10 with the
* concrete shape): the content to distill plus an optional instruction;
* the invocation resolves role 'summarize', so it needs
* defaults.routing.summarize, a profile, or the explicit model.
*/
interface BriefOpts {
  content: string;
  instruction?: string;
  model?: ModelSpec;
  agentType?: string;
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
  /** The single admission point for all spawns (docs/07, section 7; M6-T06). */
  admission?: AdmissionController;
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
    permissions?: PermissionConfig; /** Engine-wide transport RetryPolicy (docs/04, 11.1; M4-T05). */
    retry?: RetryPolicy; /** The per-engine workflow registry (docs/06, 10.4; consumers: M6 ctx.workflow, M8 worker). */
    workflows?: Record<string, unknown>; /** Registered SchemaSpec names for outputSchemaRef (docs/08; M7-T05). */
    schemas?: Record<string, SchemaSpec>; /** Registered tool profile names for toolsetRef (docs/08; M7-T05). */
    toolsets?: Record<string, ToolsOption>; /** Registered mechanical gate profiles (docs/07, section 10; M7-T10). */
    gates?: Record<string, MechanicalGateProfile>;
  };
  /** Engine-scoped per-provider keyed limiter (docs/06, section 4; M4-T07). */
  providerLimiter?: KeyedLimiter;
  /** The configured price table's version; pinned in decision entries (M4-T06). */
  pricingVersion?: string;
  /** budgetDefaults.flatReserveUsd; last resort of the reserve formula (docs/06, 5.1). */
  flatReserveUsd?: number;
  /** Hard router constraints from engine config (docs/04, section 9; M4-T09). */
  floors?: QualityFloors;
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
  /**
  * Seqs of spawn-admission decisions already paired with a live
  * ctx.agent dispatch this process lifetime, so byte-identical repeats
  * recover THEIR OWN decisions in journal order (DEF-3; M7-T02).
  */
  claimedLineageDecisions?: Set<number>;
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
//#region src/engine/cost-report.d.ts
/** Folds the per-run attribution buckets into the normative CostReport. */
declare function buildCostReport(attribution: CostAttribution, totalUsd: number): CostReport;
/**
* The pure journal fold: byModel and totals from terminal entries, the
* same summation the kernel ledger uses (terminal usage exactly once,
* priced per servedBy, abandoned subtrees contribute zero).
*/
declare function costReportFromJournal(entries: readonly JournalEntry[], priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined): CostReport;
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
/**
* File-backed TranscriptStore (M6-T02): blobs (transcripts, checkpoints,
* persisted CompiledWorkflow sources) as one file per ref under `dir`,
* so compiled runs resume across processes (docs/06, 10.2). Refs follow
* the `<runId>/<name>` convention; each path segment is checked
* filesystem-safe and nested segments become directories.
*/
declare class FileTranscriptStore implements TranscriptStore {
  private readonly dir;
  constructor(options: {
    dir: string;
  });
  private blobPath;
  put(ref: string, blob: Bytes): Promise<void>;
  get(ref: string): Promise<Bytes | null>;
  list(runId: string): Promise<string[]>;
}
//#endregion
//#region src/engine/run-profiles.d.ts
interface RunProfile {
  /** Per-role canonical effort hints (the model refs come from the host). */
  effortByRole?: Partial<Record<InvocationRole, Effort>>;
  /** Per-run concurrency width (createEngine concurrency.perRun). */
  perRunConcurrency?: number;
  /** Default run budget ceiling in USD, when the host does not set one. */
  budgetUsd?: number;
  /** Permission preset applied to the engine-wide chain. */
  permissionPreset?: PermissionPreset;
  /** Engine lifetime spawn cap (budgetDefaults.lifetimeSpawnCap). */
  lifetimeSpawnCap?: number;
  /** Nesting depth ceiling (budgetDefaults.maxDepth). */
  maxDepth?: number;
}
/**
* The shipped presets (docs/06, section 11: fast / standard / deep /
* ultra "and similar"). Data only; a review-time assertion checks the
* engine has zero behavioral branches keyed on these names.
*/
declare const RUN_PROFILES: Record<string, RunProfile>;
/** Looks up a shipped RunProfile by name; undefined for unknown names. */
declare function runProfile(name: string): RunProfile | undefined;
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
//#region src/model/profile-card.d.ts
/**
* Renders the registry into the shared agent vocabulary card. Sorted,
* deterministic, byte-stable; an empty registry renders explicitly so
* the planner never guesses at unregistered agentTypes.
*/
declare function profileCard(profiles: Record<string, AgentProfile> | undefined): string;
//#endregion
//#region src/model/projector.d.ts
/** The provider family of an adapter: `provider` when set, else `id`. */
declare function providerOf(adapter: Pick<ProviderAdapter, "id" | "provider">): string;
/**
* Projects the canonical history into the target provider's view:
* provider-raw parts of a DIFFERENT provider are omitted; everything
* else (text, images, tool calls, tool results, compaction content)
* passes through untouched. Messages whose parts all belong to another
* provider vanish entirely rather than ride as empty messages.
*/
declare function projectHistory(messages: Msg[], targetProvider: string): Msg[];
/**
* Lifts the adapter-shipped retention payload of one finished turn into
* provider-raw parts (docs/04, section 2.3 retention transport). Reads
* providerMetadata[<adapter id>].retainedParts and tags each block with
* the adapter's provider family. Returns [] when the adapter shipped
* nothing.
*/
declare function liftRetainedParts(providerMetadata: Record<string, unknown> | undefined, adapter: Pick<ProviderAdapter, "id" | "provider">): Part[];
//#endregion
//#region src/runtime/compaction.d.ts
/** Appendix A: compaction threshold default, 0.8 of contextWindow. */
declare const DEFAULT_COMPACTION_THRESHOLD = .8;
/** Deterministic marker opening every compaction summary message. */
declare const COMPACTION_SUMMARY_PREFIX = "Summary of the conversation so far:";
/** Per-profile compaction config (docs/06, section 6, AgentProfile). */
interface CompactionConfig {
  /** Fraction of the loop model's contextWindow; default 0.8. */
  threshold?: number;
}
/**
* The threshold check (docs/06, M4-T03 committed semantics): the context
* estimate is the last loop turn's inputTokens + outputTokens; the Usage
* invariant makes inputTokens the full prompt, and the turn's output
* joins the next prompt.
*/
declare function shouldCompact(options: {
  lastTurnUsage: {
    inputTokens: number;
    outputTokens: number;
  };
  contextWindow: number;
  threshold?: number;
}): boolean;
/**
* The instruction message appended to the projected transcript for the
* summarize invocation. Deterministic wording; the response text becomes
* the summary message body.
*/
declare function summarizeInstruction(): Msg;
/**
* Applies a produced summary: everything after the first message (the
* spawn prompt) is replaced by ONE user-role summary message. Compaction
* fires at tool turn boundaries only, so the replaced span never splits
* a tool-call/tool-result pair.
*/
declare function compactMessages(messages: Msg[], summaryText: string): Msg[];
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
//#region src/orchestrator/spawn-tools.d.ts
/** docs/07 4.2: the spawn_agent parameter schema (normative). */
declare const SPAWN_AGENT_SCHEMA: SchemaSpec;
/** docs/07 4.3: parallel_agents wraps the spawn_agent params. */
declare const PARALLEL_AGENTS_SCHEMA: SchemaSpec;
/** docs/07 4.4: await_any and await_all share one parameter shape. */
declare const AWAIT_SCHEMA: SchemaSpec;
/** docs/07 4.5: cancel_agent. */
declare const CANCEL_AGENT_SCHEMA: SchemaSpec;
/** docs/07 4.11: finish; result validates against the declared output schema. */
declare const FINISH_SCHEMA: SchemaSpec;
declare const FINISH_TOOL_NAME = "finish";
/** The spawn parameters as validated JSON (docs/07 4.1 TaskSpec subset). */
interface SpawnAgentParams {
  agentType: string;
  prompt: string;
  outputSchemaRef?: string;
  toolsetRef?: string;
  budgetUsd?: number;
  model_hint?: {
    startTier?: number;
  };
  approach?: string;
  lineage?: {
    continues: string;
    relation?: string;
    causeRef: number;
  };
  taskClass?: string;
}
/**
* Builds the mode (c) toolset over the per-call runtime. profileCardText
* rides the spawn tools' descriptions so both modes speak one agent
* vocabulary (docs/06 9.3; M6-T04).
*/
declare function buildOrchestratorTools(runtime: OrchestratorRuntime, profileCardText: string): ToolDef[];
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
//#region src/runner/sandbox-bridge.d.ts
/** Methods a sandbox script may proxy to the host ctx (docs/06, 8.2). */
type SandboxMethod = "agent" | "step" | "workflow" | "awaitExternal" | "parallel" | "pipeline" | "phase" | "budget.spent" | "budget.remaining";
/** Worker-to-host protocol messages (JSON only). */
type SandboxWorkerToHost = {
  t: "call";
  id: number;
  token: number;
  method: SandboxMethod;
  params: Json;
} | {
  t: "thunk:result";
  id: number;
  value: Json;
} | {
  t: "thunk:error";
  id: number;
  error: WireError;
} | {
  t: "rand";
  token: number;
  subtype: "now" | "random" | "uuid";
  value: number | string;
  key?: string;
} | {
  t: "log";
  token: number;
  level: "debug" | "info" | "warn" | "error";
  msg: string;
  data?: Json;
} | {
  t: "state";
  busy: boolean;
};
/** Host-to-worker protocol messages (JSON only). */
type SandboxHostToWorker = {
  t: "result";
  id: number;
  value: Json;
} | {
  t: "error";
  id: number;
  error: WireError;
} | {
  t: "thunk:run";
  id: number;
  fnId: number;
  token: number;
  args: Json[];
};
interface SandboxBridgeOptions {
  /** Posts one protocol message to the worker (the runner owns the port). */
  post: (message: SandboxHostToWorker) => void;
}
interface SandboxBridge {
  /** The run id; the worker seeds its deterministic shims from it. */
  readonly runId: string;
  /** Feeds one worker message into the bridge. */
  onMessage(message: SandboxWorkerToHost): void;
  /** Releases the activity token and rejects outstanding thunks. */
  close(): void;
}
declare function createSandboxBridge(ctx: Ctx<never>, options: SandboxBridgeOptions): SandboxBridge;
//#endregion
export { AWAIT_SCHEMA, AbandonAttempt, AbandonFold, AbandonPayload, AbandonedSpendView, AbortClass, type AdaptiveEvents, AdmissionController, AdmissionDecision, AdmissionRejectedError, AdmissionStatsBefore, AdmitLineage, AdmitRejectReason, AdmitSpec, AdmitVerdict, AgentCallError, AgentError, type AgentEvents, AgentIdentityInput, AgentOpts, AgentProfile, AgentProfilePermissions, AgentResult, AgentResultMeta, AgentStatus, ApproachSignatureInputs, ApprovalDecision, ApprovalIdentityInput, Artifact, AttemptOutcomeClass, BUDGET_ABORT_REASON, BriefOpts, BudgetAccountView, BudgetDefaults, BudgetExhaustedError, BudgetHooks, BudgetReserve, type Bytes, CANCEL_AGENT_SCHEMA, CHECKPOINT_FORMAT_V1, COMPACTION_SUMMARY_PREFIX, CURRENT_HASH_VERSION, CacheHint, CacheTtl, CanUseTool, CanonicalId, CanonicalIdentity, CanonicalLadderSpec, CanonicalModelSpec, ChatEvent, ChatRequest, CheckpointState, ChildIdentityInput, CollectOpts, CollectedTurn, CompactionConfig, CompiledPermissionChain, CompiledWorkflow, ConfigError, type CoreEvents, CostAttribution, CostReport, CreateEngineOptions, Ctx, DEFAULT_CHILD_BUDGET_FRACTION, DEFAULT_COMPACTION_THRESHOLD, DEFAULT_ESCALATION_LIMITS, DEFAULT_FLAT_RESERVE_USD, DEFAULT_MAX_CHILDREN_PER_NODE, DEFAULT_MAX_DEPTH, DEFAULT_MAX_OSCILLATIONS_PER_KEY, DEFAULT_MAX_PINNED_WORKTREES, DEFAULT_MAX_REVISIONS_PER_RUN, DEFAULT_MAX_TOTAL_SPAWNS, DEFAULT_MAX_TURNS, DEFAULT_MODEL_RETRY_ATTEMPTS, DEFAULT_NO_PROGRESS_TURNS, DEFAULT_PER_RUN_CONCURRENCY, DEFAULT_RETRY_POLICY, DEFAULT_STREAM_IDLE_TIMEOUT_MS, DebitResult, DedupIndex, DedupNote, DerivedKey, DeriverRegistry, DispositionRule, DispositionTable, DonorCandidate, DonorRef, DroppedItem, EMIT_RESULT_TOOL, EMPTY_SCHEMA_HASH, EMPTY_TOOLSET_HASH, ESCALATE_TOOL_NAME, ESCALATION_REPORT_SCHEMA, ESCALATION_REQUEST_SCHEMA, EffectiveUsageLimits, Effort, Engine, EngineDefaults, EntryKind, EntryRef, EntryStatus, ErrorClass, ErrorCode, ErrorPolicy, EscalatedResult, EscalationDecision, EscalationDigest, EscalationKind, EscalationLimits, EscalationOptions, EscalationReport, EscalationRequest, EventBus, ExtensionAppendInput, ExtensionDispatchSpec, ExternalIdentityInput, ExternalRegistry, ExtractNecessityInput, FINISH_SCHEMA, FINISH_TOOL_NAME, FailoverTarget, FailoverTrigger, FallbackField, FallbackTrigger, FileTranscriptStore, FinishInfo, Gate, GateAudit, GitWorktreeProvider, GitWorktreeProviderOptions, GraftBoot, HashVersion, HookVerdict, IdentityInput, InMemoryStore, InMemoryTranscriptStore, InProcessRunner, InvalidResolutionError, InvocationRole, type IsolationProvider, type IsolationSpec, Issue$1 as Issue, JournalCompatSubCode, JournalCompatibilityError, JournalEntry, JournalMatcher, JournalMissError, JournalOperation, JournalOrderViolation, type JournalStore, type Json, JsonSchema, JsonlFileStore, KeyDeriver, KeyRing, KeyedLimiter, LARGE_VALUE_WARN_BYTES, LEGACY_LTID_PREFIX, LEGACY_SIGNATURE_INPUTS, LINEAGE_SIG_VERSION, LadderSpec, type LeasableStore, type Lease, LeaseHeldError, Ledger, LineageCounters, LineageIndex, LineageRef, LineageRelation, LineageStats, LogicalTaskId, LurkerError, LurkerErrorCode, MAX_DEPTH_CEILING, MatchResult, McpConfig, MechanicalGateProfile, MechanicalGateVerdict, type ModelCaps, ModelChoice, ModelListConstraint, ModelRef, ModelRetry, ModelSpec, Msg, NoProgressDetector, NodeId, NodeLinkValue, NonSerializableValueError, ORCHESTRATE_WORKFLOW_NAME, OnEscalation, OperationDisposition, OrchestrateOptions, OrchestratorBudgetSpec, OrchestratorCapConfigError, OrchestratorExtension, OrchestratorExtensionIO, OrchestratorRuntime, Out, PARALLEL_AGENTS_SCHEMA, ParallelSiteCounter, Part, PendingExternal, PendingToolTurn, PermissionConfig, PermissionGate, PermissionHook, PermissionPreset, PermissionRule, PermissionVerdict, PhaseTarget, PipelineCollected, PipelineOpts, PlanInvariantError, PriceTable, type Pricing, type ProviderAdapter, QualityFloors, ROLE_EFFORT_DEFAULTS, ROOT_ACCOUNT, ROOT_SCOPE, RUN_PROFILES, RandIdentityInput, RandPayload, RefEntryAppender, RefEntryClassification, RefusalInfo, ReplayDisposition, ReplayMode, ReplayPlanHashMismatch, Replayer, ResolutionArbiter, ResolutionAttempt, ResolutionBy, ResolutionFold, ResolutionLayer, ResolutionOutcome, ResolutionPayload, ResolvedInvocation, ResolvedToolset, ResumeHandle, ResumeOptions, ResumePreview, ResumeReport, RetryClass, RetryPolicy, ReuseConfig, RiskRuleValue, Role, RunAgentOptions, RunBudget, RunEventSink, type RunFilter, RunHandle, RunInternals, type RunMeta, RunOptions, RunOutcome, RunProfile, RunStatus, RuntimeEventSink, SPAWN_AGENT_SCHEMA, SandboxBridge, SandboxBridgeOptions, SandboxError, SandboxHostToWorker, SandboxMethod, SandboxWorkerToHost, SchemaPair, SchemaSpec, SchemaValidationResult, ScopeSegment, ScriptRejected, ScriptRunner, ScrubNote, Semaphore, Settled, ShellPatternRules, ShellSegment, ShellVerdict, SinglePhaseAppend, SpanMinter, SpanRegistry, SpawnAdmissionValue, SpawnAgentParams, SpawnKey, SpawnLineage, SpawnLineageOpt, SpawnOrigin, SpawnRecord, Spend, Stage, type StandardJSONSchemaV1, type StandardSchemaV1, StepIdentityInput, StructuredOutputTier, SuspendedAppend, SuspensionState, TOOL_NAME_PATTERN, TaskClass, TaskDigest, TaskSpec, TerminalPatch, TerminationAccount, TerminationAccountSnapshot, TerminationDeniedValue, TerminationDeniedWriter, TerminationInitValue, TerminationLimits, TerminationResource, ToolCallRequest, ToolChoice, type ToolContext, ToolContextSeed, ToolContract, type ToolDef, type ToolEvents, type ToolExecutor, ToolInit, type ToolRisk, ToolRuntime, type ToolSource, type ToolSourceSession, ToolsOption, type TranscriptStore, TriggerClass, Usage, UsageLimits, WAIT_FOR_EVENTS_SCHEMA, WAIT_FOR_EVENTS_TOOL_NAME, WakeDigest, WakeTrigger, WireError, Workflow, WorkflowCallOpts, type WorkflowEvent, type WorkflowEventBody, WorkflowRegistry, admissionReserveUsd, agentErrorFromWire, agentErrorToWire, agentScope, applyStructuredOutputTier, approachSigCoarse, approachSigOf, atCompactionThreshold, buildAbandonFold, buildAdapterRegistry, buildCostReport, buildDeriverRegistry, buildOrchestratorTools, buildTerminationInitValue, buildToolContext, canRideLoopTurn, canonicalIsolationTag, canonicalizeLadder, canonicalizeSchema, checkFloors, checkpointRefFor, childCoveragePrefix, classifyAgentError, classifyAttemptOutcome, compactMessages, compilePermissionChain, compilePermissionPreset, costReportFromJournal, countsAgainstLimit, createCanonicalIdMinter, createCtx, createEngine, createSandboxBridge, currentOnlyKeyRing, decodeCheckpoint, defineWorkflow, deriveContentKey, deriverV1, deriverV2, digestOf, dispositionHook, emptyToolset, encodeCheckpoint, escalateTool, evaluatePermission, evaluateReuse, executeWorkflow, exhaustionCodeOf, extractCandidate, failoverTriggerOf, fallbackTriggerOf, finalizeFires, foldTermination, formatRePrompt, formatScopePath, hashWorkflowBody, hashWorkflowSource, identityJcs, isEscalated, isSchemaPairSpec, isStandardSchemaSpec, isStrictCompatibleSchema, kMaxOf, ladderLengthOf, ladderRungChoice, lexShellCommand, liftRetainedParts, lineageWeightOf, makeOrchestratorWorkflow, matchArgvPattern, matchShellCommand, mcp, mergeUsageLimits, modelSpecIdentity, needsSeparateExtract, nextFailover, nodeLinkKey, normalizeApproachTag, normalizeEntry, normalizeFallbacks, orchestrate, parallelScope, parseModelRef, parseScopePath, phiInitialOf, pipelineScope, planNodeScope, priceUsdOf, profileCard, profileRegistrySnapshotHash, projectHistory, projectIdentity, projectToJsonSchema, providerOf, readTerminationInit, registryKeyRing, replayDisposition, resolveModelInvocation, resolvePricing, resolveToolset, retryClassOf, retryDelayMs, roleConfiguredInRouting, roundOneDisposition, runAgent, runProfile, scanJournalCompatibility, schemaHash, schemaHashOfSpec, selectStructuredOutputTier, shouldCompact, spawnDepthOf, summarizeInstruction, summarizeOutput, terminationConfigDrift, tierWithinCaps, toApprovalDecision, toJournalValue, tool, toolContract, toolsetHash, validateEntryShape, validateEscalationLimits, validateEscalationReport, validateSchemaSpec, validateTerminationLimits, workflowScope, workflowSourceRef };