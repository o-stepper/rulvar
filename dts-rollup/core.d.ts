//#region src/l0/json.d.ts
/**
* L0 JSON value domain.
*
* Everything that enters the journal (entry values, error data, artifacts)
* MUST be JSON-serializable; `Json` is the type-level face of that rule.
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
* The closed error-code registry.
* 'agent' is carried by the AgentError value projection, not by a
* RulvarError subclass.
*/
type ErrorCode = "agent" | "config" | "non_serializable_value" | "script_rejected" | "journal_compat" | "invalid_resolution" | "journal_order_violation" | "plan_invariant" | "replay_plan_hash_mismatch" | "orchestrator_cap_config" | "journal_miss" | "budget_exhausted" | "fail_run" | "admission_rejected" | "sandbox_limit" | "lease_held" | "effect_refused" | "knowledge_cas" | "determinism" | "settlement" | "superseded" | "journal_sealed" | "journal_integrity";
/** An alias for the registry type; both names are public. */
type RulvarErrorCode = ErrorCode;
/**
* Base class for all engine-raised errors. "Retryable" means the engine's
* own retry machinery (RetryPolicy under the journal) MAY retry;
* it never means a provider SDK autoretry, which is disabled.
*/
declare abstract class RulvarError extends Error {
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
declare class ConfigError extends RulvarError {
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
declare class NonSerializableValueError extends RulvarError {
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
declare class ScriptRejected extends RulvarError {
  readonly code = "script_rejected";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/** Sub-code detail of JournalCompatibilityError. */
type JournalCompatSubCode = "HASH_VERSION_TOO_OLD" | "HASH_VERSION_TOO_NEW";
/**
* Refusal to open a journal whose hashVersion falls outside the engine's
* support window (producers ship in M2).
* The registry code is 'journal_compat'; the sub-codes live on
* `subCode` and in `data`.
*/
declare class JournalCompatibilityError extends RulvarError {
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
  /** 'enable deriverV1 from @rulvar/compat' or 'upgrade rulvar'. */
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
* the first-closing-wins fold; appends no entry (producers ship in M2).
*/
declare class InvalidResolutionError extends RulvarError {
  readonly code = "invalid_resolution";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* A breach of the total per-run append order: an unfenced concurrent writer
* or a store violating contract A2 (https://docs.rulvar.com/guide/stores).
*/
declare class JournalOrderViolation extends RulvarError {
  readonly code = "journal_order_violation";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/** PlanRunner plan-invariant rejection (producers ship in M7). */
declare class PlanInvariantError extends RulvarError {
  readonly code = "plan_invariant";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* Raised at resume when the refolded plan state disagrees with the
* journaled planHash chain (producers ship in M7).
*/
declare class ReplayPlanHashMismatch extends RulvarError {
  readonly code = "replay_plan_hash_mismatch";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* Invalid orchestrator cap and finalize-reserve configuration, thrown
* before the first LLM call (DEF-7; producers ship in M6/M7).
*/
declare class OrchestratorCapConfigError extends RulvarError {
  readonly code = "orchestrator_cap_config";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* A replay-strict run encountered a call that would go live
* (@rulvar/testing; producers ship in M2).
*/
declare class JournalMissError extends RulvarError {
  readonly code = "journal_miss";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* The run budget ceiling blocked further work. The budget guard denial is
* a decision entry; ctx primitives throw this as AgentError kind 'budget';
* the run reports outcome 'exhausted', overriding 'error'.
*/
declare class BudgetExhaustedError extends RulvarError {
  readonly code = "budget_exhausted";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* A journal append arrived after the run's settle sealed the segment
* (RV1904): once `run_settle` is durable, the journal is the terminal
* truth every cost and invoice fold reads, and a late append would
* silently split it into the four mutually inconsistent views the
* four-role benchmark recorded. The orchestrate exit barrier (RV1903)
* and the engine's settle drain terminate every straggler BEFORE the
* seal, so this error names a lifecycle bug, never a working path.
*/
declare class JournalSealedError extends RulvarError {
  readonly code = "journal_sealed";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* A journal append was lost before the settle (RV3201): a persist
* inside the serialized append queue rejected, and the queue swallowed
* the rejection to keep later appends flowing, so the journal is now
* missing an entry the run believes it wrote. The first such failure
* latches inside the Replayer: every `flush()` from that moment
* rethrows it, and the engine settle path converts a would-be ok (or
* suspended) outcome into an error terminal, because an ok settle over
* a lost deterministic record would replay differently than the run
* executed. The latch is permanent for the segment; a resume constructs
* a fresh Replayer against whatever the store actually holds.
*/
declare class JournalIntegrityError extends RulvarError {
  readonly code = "journal_integrity";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* A declared fail-run policy engaged and closed the run as a failure
* (v1.35.0 review P2-1): `budget.atCap: 'fail-run'` after the journaled
* orchestrator cap decision, `guards.fallback: 'fail-run'` after the
* journaled guard verdict, or a violated orchestrate acceptance policy
* after the journaled acceptance decision (`data.source`
* 'orchestrator_acceptance', with the child status counts and degraded
* reasons in `data`). The run outcome is 'error' with this code;
* `data.source` names the policy ('orchestrator_budget_cap' or
* 'plan_guards') and `data` carries the decision entry reference, so the
* outcome is a pure roll forward of the journal on resume: no second
* decision, no model call, no spend.
*/
declare class FailRunError extends RulvarError {
  readonly code = "fail_run";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* A structural admission rejection (maxDepth, maxChildrenPerNode,
* maxTotalSpawns) from the AdmissionController (M6-T06). The rejection verdict is embedded in
* the carrying spawn-admission decision entry and replays identically;
* the error surfaces the embedded AdmitRejectReason in `data` to the
* caller (a typed tool error for orchestrators) and MUST NOT tear down
* the run. Budget-code rejections throw BudgetExhaustedError instead,
* keeping the budget exhaustion semantics (https://docs.rulvar.com/guide/budgets).
*/
declare class AdmissionRejectedError extends RulvarError {
  readonly code = "admission_rejected";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* A WorkerSandboxRunner resource-limit breach (M6-T02): crossing
* timeoutMs or memoryMb terminates the worker and the
* run completes with outcome 'error' carrying this error's WireError
* projection; `data` records { reason: 'timeout' | 'memory', limit }.
* The class itself is never journaled as an entry of its own.
*/
declare class SandboxError extends RulvarError {
  readonly code = "sandbox_limit";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* acquire() on a currently held lease. Retryable by contract: retry after
* the lease ttl elapses or the holder releases.
*/
declare class LeaseHeldError extends RulvarError {
  readonly code = "lease_held";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* The effect lane refused an operation, typed and fail closed (plan
* 45, rfcs/effects.md): a consumption whose verdict no longer holds, a
* dispatch the state table forbids (re-dispatch after a revocation), a
* budget the intent has exhausted, an intake the protocol rejects (an
* effect approval without a deadline), or a store without the
* capabilities the lane requires. Never retryable by the engine's wire
* machinery: the lane's own recovery rules (reload, find the operation
* id, re-verdict) are the only legal retry, and they live in the
* writer, not in RetryPolicy.
*/
declare class EffectLaneRefusedError extends RulvarError {
  readonly code = "effect_refused";
  /** The protocol rule that refused, kebab-case, stable. */
  readonly rule: string;
  constructor(rule: string, message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* The segment computed its outcome but a settlement write failed with a
* NON-fencing store error, so nothing durable records that the run
* settled. `handle.result` rejects with this instead of resolving,
* because a caller acting on an unrecorded outcome is exactly the split
* view an authoritative store exists to prevent. `stage` names the
* write that failed: 'run-settle' is the journal decision entry (when
* it fails the terminal meta write is SKIPPED, so the projection can
* never run ahead of the journal), 'meta' is the terminal RunMeta
* projection (the journal settle IS durable; only the projection is
* behind, the same residue a crash between the two writes leaves).
* Every entry the run appended before settlement is already durable,
* so recovery is deterministic: resume the run and replay re-settles
* the same outcome without a provider call, or reconcile the store
* with `rulvar runs audit [--repair]`. A superseded segment's fencing
* rejection of the settle append (LeaseHeldError) is NOT this error:
* it rejects with the typed {@link SupersededError} (RV1009), while a
* meta-only lease bounce over an already durable settle stays
* swallowed (the journal records the outcome; only the projection
* belongs to the current holder). `data` records
* { runId, runStatus, stage }.
*/
declare class SettlementError extends RulvarError {
  readonly code = "settlement";
  /** The settlement write that failed first. */
  readonly stage: "run-settle" | "meta";
  readonly runId: string;
  /** The outcome status the segment computed and could not record. */
  readonly runStatus: string;
  constructor(message: string, opts: {
    stage: "run-settle" | "meta";
    runId: string;
    runStatus: string;
    cause?: unknown;
  });
}
/**
* The segment computed its outcome but its run_settle append bounced
* off the store's fence (LeaseHeldError): a successor segment holds
* the lease and owns settlement (RV1009). Nothing durable records
* THIS segment's outcome, so `handle.result` rejects with this error
* instead of resolving, and the segment's run:end refuses green with
* `settled: false` and `settledReason: 'superseded'`: a green
* terminal that exists in no durable store is exactly the split view
* RV907 forbids, and before this error a superseded segment resolved
* ok silently. Not retryable: the successor owns the run; read the
* authoritative outcome from its settle or the store's run meta. A
* meta-only lease bounce over an already durable settle is NOT this
* error and stays swallowed: the journal records the outcome, and
* only the projection belongs to the current holder. `data` records
* { runId, runStatus }.
*/
declare class SupersededError extends RulvarError {
  readonly code = "superseded";
  readonly runId: string;
  /** The outcome status the stale segment computed and must not act on. */
  readonly runStatus: string;
  constructor(message: string, opts: {
    runId: string;
    runStatus: string;
    cause?: unknown;
  });
}
/**
* commit() on a ModelKnowledgeStore against a snapshot version that is
* no longer current. Retryable by contract: re-read current(), rebase
* the ops, commit again, mirroring the lease fencing discipline.
*/
declare class KnowledgeCasError extends RulvarError {
  readonly code = "knowledge_cas";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* A workflow-origin bare-nondeterminism violation under
* `determinism.mode: 'error'` (RV-209): bare `Date.now()` or
* `Math.random()` called from workflow code inside a run. Thrown at the
* offending call site (and re-thrown at settle if the workflow swallowed
* it), so the run rejects instead of recording a value replay cannot
* reproduce. `data` carries the structured localization: `category`,
* `frame`, and the parsed `file`/`line`/`column` when the frame names
* one. Never journaled as its own entry; the run settles 'error' with
* this wire error. Exempt provenances (installed dependencies, Node
* runtime frames, allowlisted patterns) never raise it.
*/
declare class DeterminismError extends RulvarError {
  readonly code = "determinism";
  constructor(message: string, opts?: {
    data?: Json;
    cause?: unknown;
  });
}
/**
* The vendored Standard Schema issue shape: validation issues carried
* on AgentError and surfaced to the
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
* inside the agent terminal entry. Deliberately NOT a RulvarError subclass.
*/
type AgentError = {
  kind: "transport" | "rate-limit" | "schema-mismatch" | "tool" | "budget" | "terminal";
  retryable: boolean;
  retryAfterMs?: number;
  issues?: Issue$1[];
  /**
  * The typed refusal marker (RV2002, widened by RV2101):
  * 'exposure-drained' names a spawned child refused pre-wire by the
  * in-flight exposure cap with no live holder left to wait out (zero
  * provider attempts by construction, so the seat is cheap to
  * re-spawn; an orchestrator treats it as a starved seat, never a
  * crashed child). 'output-floor' names a turn refused pre-wire
  * because the remaining budget past the held reserves cannot afford
  * the model's output floor: at the reserve line this is the
  * boundary where the coordination loop settles partial and the
  * synthesis promise is redeemed, never a crash.
  */
  reason?: "exposure-drained" | "output-floor";
  /**
  * WHICH dispatch the budget killed (RV4703, the eighth comparison
  * experiment's first run): its child spent under the ceiling
  * through the whole loop and died on a synchronous budget refusal
  * of the FINALIZE dispatch (one millisecond, zero tokens), and no
  * surface named the stage; the cause was recovered from phase
  * forensics. Stamped by the loop's own budget gates on 'budget'
  * errors; carried to the wire in data and restored on read. Absent
  * means the error predates the stamp or is not a budget refusal.
  */
  stage?: "loop" | "summarize" | "reserve-summary" | "finalize" | "extract";
};
/**
* Projects an AgentError to its WireError form: code 'agent', with kind,
* retryAfterMs, and issues carried in data. Issue paths are flattened to
* JSON-safe segments.
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
* between canonical ids and wire ids (toolu_* / call_*) in both directions.
*/
type CanonicalId = string;
/**
* Returns a per-engine minter of CanonicalId values. Monotonic within the
* factory instance; never a module-level singleton (no module state).
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
* happens only in projection, never in retention.
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
* serialization and hashing rules live with the KeyDeriver.
*/
type JsonSchema = {
  [key: string]: unknown;
};
/**
* The identity-bearing tool contract: exactly what the model sees and
* exactly what toolsetHash hashes. Never contains execute or any closure.
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
* enum. OpenAI 'none' has no
* canonical equivalent and is reachable only via providerOptions.
*/
type Effort = "low" | "medium" | "high" | "xhigh" | "max";
type CacheTtl = "5m" | "1h";
/**
* Provider-neutral declaration of intended prompt-cache boundaries.
* Transport-level cost optimization only: MUST NOT enter IdentityInput and
* MUST NOT change response semantics.
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
* The prompt-cache policy (RV2006): whether and how the agent loop
* compiles {@link CacheHint} onto every turn of its tool cycle.
* 'auto' (the default when no policy is declared anywhere) attaches
* breakpoints after tools, after system, and after the deepest message
* (sliding each turn) on adapters that declare
* `ModelCaps.promptCaching: 'explicit'`; adapters without the
* declaration, and providers whose caching is implicit server-side,
* never see a hint, so their wire traffic stays byte identical.
* 'off' is the opt-out. The hint is transport-level cost optimization
* only: it never enters identity, journals, or cassette keys. The
* third parity rerun priced the absence: every turn of a ~550k-token
* worker context re-paid the full input rate because nothing in the
* core ever populated the hint the adapter could compile.
*/
interface CachePolicy {
  mode?: "auto" | "off";
  /** Breakpoint TTL; default '5m'. */
  ttl?: CacheTtl;
}
/**
* The provider-neutral chat request. Sampling parameters (temperature,
* top_p, top_k) are deliberately absent from the first-class surface: both
* first-class providers reject them on current reasoning models; where a
* target legitimately supports them they travel through the adapter's
* providerOptions namespace, subject to caps scrubbing.
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
  * canonical field is a typed ConfigError.
  */
  providerOptions?: Record<string, Record<string, unknown>>;
}
/**
* Usage under the Usage invariant: inputTokens is the FULL prompt size
* including cache reads and cache writes. Adapters MUST normalize
* provider-reported usage to satisfy this invariant, and the core verifies
* it at the adapter boundary.
*/
type Usage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens?: number;
  /**
  * The cache-write TTL split (RV810), filled by adapters whose
  * provider distinguishes write TTLs in usage (the Anthropic
  * cache_creation breakdown). Optional and additive: absent means
  * undifferentiated writes, priced at the plain write rate exactly as
  * before. When either field is present the split must SUM to
  * `cacheWriteTokens` (absent counts zero); `usageViolations` enforces
  * it and `priceUsdOf` prices each share at its own rate, so a 1h
  * premium write is no longer billed at the 5m rate.
  */
  cacheWrite5mTokens?: number;
  cacheWrite1hTokens?: number;
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
* output silently.
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
* stream (finish or error).
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
  /**
  * Provenance the adapter already holds when the stream dies (RV401,
  * the eighth comparison experiment): a failed generation is still a
  * billable provider call, and its response id is what joins the
  * reconciliation record to the provider's own statement. Same
  * namespaced shape as the finish event's; absent when the failure
  * predates any provider response.
  */
  providerMetadata?: Record<string, unknown>;
};
/** Strictly 'adapterId:model', no query parameters. */
type ModelRef = `${string}:${string}`;
/**
* The seven invocation roles. 'synthesize' is the orchestrator's
* post-fan-in synthesis invocation (RV-211): it fires only when
* OrchestrateOptions.synthesis is configured, and the routing key picks
* its model like any other role without ever summoning it.
*/
type InvocationRole = "orchestrate" | "plan" | "loop" | "finalize" | "extract" | "summarize" | "synthesize";
/**
* What authors write wherever a model is configurable: a call override, an
* agent profile, a workflow default, or an engine default.
*/
type ModelSpec = ModelRef | ModelChoice | {
  ladder: LadderSpec;
};
interface ModelChoice {
  model: ModelRef;
  /** Absent: resolved by the chain, including role effort defaults. */
  effort?: Effort;
  /** Namespaced by adapter id. */
  providerOptions?: Record<string, Record<string, unknown>>;
  /** Transport-failure failover list; never enters identity. */
  fallbacks?: ModelRef[];
}
/**
* Identity-facing canonical form of a RESOLVED model request; the value
* that enters AgentIdentityInput.modelSpec.
* providerOptions and fallbacks NEVER enter this form: they are
* delivery options, excluded from identity exactly like label, phase,
* onError, retry, and replay. `effort` is absent exactly when no layer of
* the chain and no role effort default resolves one.
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
* ctx.random, never Math.random.
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
* the ladder family: other layers reference it and never redeclare (runtime
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
  /** After clamping of any orchestrator model_hint. */
  startTier: number;
  escalateOn: TriggerClass[];
  acceptance?: Gate[];
}
//#endregion
//#region src/l0/entries.d.ts
/**
* Versions the ENTIRE identity and replay pipeline as one unit: canonical
* JSON algorithm, identity field sets, hash function, schema/toolset hash
* derivation, scope grammar and ordinal rules, replay predicate, fold
* defaults, and the kind/status vocabularies.
*/
type HashVersion = number;
/** 1 = round 1; 2 = current. */
declare const CURRENT_HASH_VERSION: HashVersion;
/**
* The single kinds registry v2.
* Readers MUST tolerate unknown kinds; stores pass them through
* byte-for-byte (obligation A4).
*/
type EntryKind = "agent" | "step" | "child" | "external" | "approval" | "rand" | "decision" | "plan.revision" | "plan.decision" | "ledger.op" | "resolution" | "abandon" | "node.link" | "termination.init" | "termination.denied";
/**
* The stored status vocabulary, exactly. 'skipped' is DELIBERATELY absent:
* it is a derived fold status, never persisted.
*/
type EntryStatus = "running" | "ok" | "error" | "limit" | "suspended" | "cancelled" | "escalated";
/** The canonical EntryRef between entries is seq. */
type EntryRef = number;
/** The journaled by-source of a resolution. */
type ResolutionBy = "external" | "timeout" | "class_decision" | "operator" | "quiescence" | "engine_fallback";
/** Payload of resolution ref-entries (DEF-4). */
type ResolutionPayload = {
  /** Duplicates ref for self-description. */target: number;
  by: ResolutionBy; /** awaitExternal resolution / EscalationDecision / WakeDigest. */
  value: Json; /** Seq of the class-level EscalationDecision when by = 'class_decision'. */
  decisionRef?: number; /** Lineage-fold attribution (DEF-3, M7). */
  logicalTaskId?: string; /** Only on escalation resolutions (DEF-3, M7). */
  countsAgainstLimit?: boolean;
};
/** Payload of abandon ref-entries (DEF-4/DEF-5). */
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
* One (invocation role, serving model) slice of an agent call's usage.
* `role` is the phase that PAID the slice (v1.19.0 review P1-2: the
* loop, extract, finalize, and summarize phases of one agent call must
* land in their own CostReport.byRole buckets even when a single model
* serves several of them). Absent on slices written before roles
* shipped: readers fall back to the entry's primary
* `costAttribution.role`, exactly like the other documented fallbacks.
* Policy, never identity.
*/
interface UsageSlice {
  servedBy: ModelRef;
  usage: Usage;
  role?: InvocationRole;
}
/**
* One live provider dispatch of an agent invocation (P1.3, the durable
* reconciliation ledger): every wire call the engine actually made,
* successful or not, with the usage it consumed and the provider's
* response id when the adapter surfaced one. Quota-denied attempts and
* abort short circuits that never reached the adapter mint no record:
* the ledger enumerates exactly the calls a provider could bill.
* Records are minted from the same sanitized usage the phase slices
* accumulate, so per-model sums over an entry's records reconcile with
* `usageByModel` (and with `usage`) by construction on a fully live
* invocation.
*/
interface ProviderCallRecord {
  /** 1-based dispatch order across the whole invocation, phases included. */
  ordinal: number;
  /** The invocation phase that paid the call. */
  role: InvocationRole;
  servedBy: ModelRef;
  /**
  * 1-based DISPATCHED try number on the serving target; transport
  * retries increment it, a pre-wire quota denial never does (RV1601),
  * so the recorded attempts of one (role, target) series are always
  * dense from 1 and an attempt=2 row proves a prior dispatched try
  * with its own record.
  */
  attempt: number;
  /**
  * 'ok' = a terminal finish; 'error' = a wire failure after dispatch
  * (the provider may still have billed the recorded usage); 'aborted' =
  * the stream was severed by `aborted` below.
  */
  outcome: "ok" | "error" | "aborted";
  /**
  * The provider's response id from the finish metadata
  * (`providerMetadata[<adapter id>].responseId`, surfaced by both
  * shipped adapters). Absent when the adapter reported none or the
  * call never finished; the invoice export marks such rows instead of
  * dropping them.
  */
  responseId?: string;
  /**
  * Every wire request's response id when the adapter absorbed
  * provider-side continuations into this one dispatch (RV905:
  * `providerMetadata[<adapter id>].wireRequests`, the Anthropic
  * pause_turn absorption). A per-request provider statement bills each
  * segment as its own row, so the reconciliation joins by ANY id of
  * this set. Absent on single-wire dispatches, keeping them
  * byte-identical.
  */
  wireResponseIds?: string[];
  /**
  * How many provider HTTP requests this ONE dispatch made, as the
  * adapter reported it (RV1210:
  * `providerMetadata[<adapter id>].wireRequests.count`). Recorded
  * independently of `wireResponseIds` because a provider may leave a
  * segment unnamed: counting ids alone understates the cardinality by
  * exactly those segments, and the quota window (which settles on the
  * count) would then disagree with the invoice. Absent on single-wire
  * dispatches, keeping them byte-identical.
  */
  wireRequests?: number;
  /** This call's usage exactly, sanitized like every accounted number. */
  usage: Usage;
  /** True when the stream was cut, so the usage is a lower bound. */
  usageApprox?: boolean;
  /** WireError.code on 'error' outcomes. */
  errorCode?: string;
  /** What severed an 'aborted' call. */
  aborted?: "budget" | "external" | "idle";
  /**
  * The wire-level phase override (RV4002, the fifth comparison
  * experiment): 'repair' on the call that immediately follows a
  * rejected terminal-tool exchange, the granted mechanical repair
  * turn's own wire. Phase is otherwise a per-dispatch fact
  * (`costAttribution.phase`), which is exactly how the experiment's
  * one draft repair wire drowned in 'coordination': the judge had to
  * reconstruct the repair from the raw transcript while the invoice
  * said nothing. The cost folds bucket a call carrying this override
  * under it instead of the dispatch phase; absent on every other
  * call, keeping non-repair runs byte identical.
  */
  phase?: "repair";
}
/**
* Cost-attribution facts a live run knows at settlement and a pure
* journal fold cannot re-derive: the innermost phase name at the call
* site, the agent profile, the primary invocation role, the budget
* account the call debited, and whether the dispatch spent the
* orchestrator finalize reserve. Policy, never identity, exactly like
* usageByModel: none of it enters the content key, and entries written
* before the field shipped fold under the documented fallback buckets
* (empty phase, 'unknown' agent type, role 'loop').
*/
interface CostAttributionFacts {
  phase?: string;
  agentType?: string;
  role?: InvocationRole;
  budgetAccount?: string;
  /**
  * The dispatch label, when the caller gave one (RV2803): what tells
  * two spans of ONE role apart, which the event stream has always
  * carried and the journal never did. Absent on every unlabelled
  * dispatch and on every journal written before it shipped, so a
  * reading that needs it reports absence rather than guessing. Policy,
  * never identity.
  */
  label?: string;
  finalizeReserve?: boolean;
  /**
  * What dispatched a semantic repair round (RV4105): 'claim' (the
  * RV3307 contradiction round), 'citation' (the RV4004 entailment
  * round), 'coverage' (the RV4202 round armed by a non-'full' final
  * grade alone), or 'combined' (one bounded round carrying more than
  * one defect class, RV4202), stamped at dispatch beside
  * `phase: 'repair'`, so the repair ledger attributes the round
  * without cross-reading metas. Absent on every other dispatch and
  * on journals written before it shipped (absence means NOT
  * RECORDED, RV1209). Policy, never identity.
  */
  repairTrigger?: "claim" | "citation" | "coverage" | "combined";
}
/**
* The per-model slices of a terminal entry: the recorded split when the
* call spanned several models, else the whole usage attributed to
* `servedBy`. The fallback is what makes every journal written before the
* split shipped price exactly as it did before.
*/
declare function entryUsageSlices(entry: JournalEntry): UsageSlice[];
/** A priced slice, plus the total and the gaps the price table did not cover. */
interface PricedUsage {
  /** Total of every slice the price table covered. */
  usd: number;
  /** Covered slices with their prices; the basis of per-model attribution. */
  priced: Array<UsageSlice & {
    usd: number;
  }>;
  /** Slices with no price row: surfaced as unpriced, never a silent zero. */
  unpriced: UsageSlice[];
}
/**
* The single pricing fold over one terminal entry, shared by the kernel
* ledger and the CostReport fold so a run's total and its per-model
* breakdown can never disagree. Each slice is priced at ITS OWN model's
* rate. A price function returning NaN or a negative amount (a broken
* user-supplied rate) is treated exactly like a missing row: the slice
* folds as unpriced instead of poisoning or crediting the totals
* (v1.20.0 review follow-up). The optional third argument hands the
* price function the entry's seq, so a segment-aware snapshot can
* price the row under the rates of ITS segment (RV505); two-argument
* price functions simply ignore it.
*/
declare function priceEntryUsage(entry: JournalEntry, priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined): PricedUsage;
/** One priced unit of {@link priceEntryBilling} (RV504). */
interface EntryBillingUnit {
  /**
  * 'call' prices one provider dispatch (the per-request basis);
  * 'slice' is the historical per-model aggregate of an entry whose
  * records do not fully cover its usage.
  */
  source: "call" | "slice";
  servedBy: ModelRef;
  usage: Usage;
  role?: InvocationRole;
  /** The dispatch record behind a 'call' unit. */
  record?: ProviderCallRecord;
  usd: number;
}
/** What {@link priceEntryBilling} folds one terminal entry into. */
interface EntryBillingFold {
  /** Priced units in fold order; `usd` is their sum in exactly this order. */
  units: EntryBillingUnit[];
  usd: number;
  /** Usage on models the price function refused; never a silent zero. */
  unpriced: UsageSlice[];
  /**
  * True when the entry's providerCalls exactly cover every usage
  * slice, counter for counter: the fold priced per call, so a
  * nonlinear tier fired per REQUEST, the pricing contract's own
  * semantics. False folds the aggregate slices, the historical basis.
  */
  fullyAttributed: boolean;
  /**
  * The models this fold priced per call: record sums equal slice sums
  * counter for counter under the symmetric per-model key (RV604).
  * Published so a row builder can honor the same decision (RV703): a
  * covered model's rows are exactly its records, so no per-slice
  * remainder may be fabricated for it; recomputing coverage elsewhere
  * is how the phantom-remainder skew was born.
  */
  coveredModels: ReadonlySet<ModelRef>;
}
/**
* The billing fold over one terminal entry (RV504), shared by the
* CostReport and invoice folds so the total, every breakdown, and the
* per-row prices can never disagree. Coverage is decided per MODEL with
* the symmetric key (RV604): for every model whose per-dispatch
* `providerCalls` sum to exactly its usage, each call is priced
* individually, so a nonlinear long-context tier fires per REQUEST,
* which is the pricing contract's stated semantics; an aggregate that
* crossed a threshold no single request crossed no longer re-prices
* that model (the ninth-experiment 52% overreport, and the round-52
* multi-role default). A model with no records, or records that do not
* cover its usage, folds exactly as before: the per-model aggregate
* slices of {@link priceEntryUsage}. `fullyAttributed` is true only
* when every slice model is covered and no record names a model absent
* from the slices.
*/
declare function priceEntryBilling(entry: JournalEntry, priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined): EntryBillingFold;
/**
* Final entry form (hashVersion 2).
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
  /**
  * Terminal agent entries whose phases were served by MORE THAN ONE
  * model: usage split by the model that actually served each slice. The
  * loop, extract, finalize, and summarize roles resolve independently,
  * so a single agent call routinely spans models at different prices;
  * pricing the whole call at `servedBy` bills the cheap extract at the
  * loop model's rate. Absent when one model served the whole call, and
  * on entries written before the split shipped: readers fall back to
  * pricing `usage` at `servedBy`, which is exactly correct for those.
  * Policy, never identity: it does not enter the content key.
  */
  usageByModel?: UsageSlice[];
  /**
  * Terminal usage-bearing entries: the attribution facts behind the
  * CostReport breakdowns, so a pure journal fold reproduces the live
  * report byte for byte on replay. Policy, never identity, exactly
  * like usageByModel.
  */
  costAttribution?: CostAttributionFacts;
  /**
  * Terminal agent entries: the per-dispatch reconciliation ledger
  * (P1.3), one record per live provider call the invocation made,
  * failed and retried attempts included, so every billable wire call
  * maps to a journal entry and the invoice export can name the
  * provider response ids behind the usage total. Absent on entries
  * written before this shipped and on fully replayed invocations
  * (which made no calls); the invoice fold surfaces such entries as
  * unattributed rows instead of losing their spend. Policy, never
  * identity, exactly like usageByModel.
  */
  providerCalls?: ProviderCallRecord[];
  /**
  * The serving adapters' declared usage-telemetry semantics at write
  * time (ProviderAdapter.usageSemantics), stamped so cost numbers stay
  * auditable across normalization corrections: an UNSTAMPED OpenAI
  * entry with cacheWriteTokens > 0 may have been written by rulvar
  * v1.19.0, whose adapter double-counted cache writes into inputTokens
  * (v1.20.0 review P1/P2-2). The stamp unions every adapter that
  * served a slice of the entry, distinct declarations joined with '+'
  * in first-appearance order, so a mixed-adapter call whose primary
  * declares nothing is still dated by its declaring slices. Absent
  * only when NO serving adapter declares semantics, and on all entries
  * written before this shipped. Policy, never identity, exactly like
  * usageByModel.
  */
  usageSemantics?: string;
  transcriptRef?: string;
  checkpointRef?: string;
  /**
  * Terminal agent entries: the Artifact list (worktree patch refs and
  * inline values); rides the terminal payload so replay reconstructs
  * AgentResult.artifacts without live calls.
  */
  artifacts?: Json;
  /**
  * Terminal agent entries: the evidence verdict under a declared
  * contract (RV806), journaled so replay restores
  * AgentResult.evidence without re-deriving a window it no longer
  * holds (the RV1501 entries plumbing). Policy, never identity,
  * exactly like usageByModel.
  */
  evidence?: {
    recordedEntries: number;
    minEntries: number;
    met: boolean;
  };
  /**
  * Terminal agent entries: the recorded evidence entry CONTENT (the
  * RV1501 entries plumbing): each successful record_evidence
  * execution's claim plus its file or file:lines citation, in record
  * order, bounded at collection time (40 entries, 400 chars per
  * claim). Rides the terminal payload so replay reconstructs
  * AgentResult.evidenceEntries without live calls and a resumed
  * orchestrator pairs its claim pools against what the child
  * actually recorded, exactly like a live run. Policy, never
  * identity.
  */
  evidenceEntries?: Array<{
    claim: string;
    citation?: string;
  }>;
  /**
  * Terminal agent entries: the durable subset of the tool-budget
  * summary (RV3002): the loop's executed-call counter and the
  * effective cap at the end, journaled at settle whenever the live
  * result carried a summary. The counter has always been durable in
  * the terminal checkpoint, but checkpoints are blobs and journal
  * folds read entries only, so without this field observed
  * calls-per-evidence-entry calibration cannot be a pure fold. Replay
  * restores AgentResult.toolBudget from here unconditionally; entries
  * without the field (every pre-existing journal) keep the RV509
  * decision-conditional path byte for byte. Live-only summary fields
  * (unitsUsed, noticesFired, limiter, and the rest) never journal.
  * Policy, never identity, exactly like evidence.
  */
  toolBudget?: {
    used: number;
    cap?: number;
  };
  /**
  * Terminal agent entries whose invocation was aborted by the host's
  * finish rejection (RV3702): the declared finish contract rejected
  * the candidate past its repair bound, so the span died by host
  * hand with its wires fine. Stamped at settle from the typed abort
  * reason; never on a defective (throwing) validator, whose abort
  * carries its own reason, because a host defect is not a verdict on
  * the candidate. Policy, never identity, exactly like usageByModel.
  */
  hostRejected?: boolean;
  /**
  * Terminal escalated entries ONLY: the schema-validated
  * EscalationReport with runtime-filled costToDate and salvage; replay
  * synthesizes the byte-identical report from here (DEF-1).
  */
  escalation?: Json; /** Only when kind === 'resolution'. */
  resolution?: ResolutionPayload; /** Only when kind === 'abandon'. */
  abandon?: AbandonPayload;
  /**
  * Policy field on agent entries, fixed in the payload at dispatch
  * time: the M2 predicate reads
  * the flag from the ENTRY, never from current code. Excluded from
  * identity like every policy field.
  */
  memoizeOutcome?: boolean; /** On suspended entries: the journaled deadline. */
  deadlineAt?: string;
  spanId: string;
  startedAt: string;
  endedAt?: string;
};
/** Rand-entry payload. */
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
* normalization happens at read.
*/
declare function normalizeEntry(raw: unknown): JournalEntry;
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
* are advisory only; the journal is authoritative.
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
  /**
  * The run's segment-immutable USD ceiling (RunOptions.budgetUsd),
  * recorded so resume restores the original invocation's bound (only
  * the explicit, journaled ResumeOptions.run override changes it,
  * RV2208, by rewriting this field for the run's remaining life).
  * Absent when the run started without a ceiling. Stores must
  * round-trip the field (the conformance kit checks); a store that
  * drops it degrades a resumed run to uncapped.
  */
  budgetUsd?: number;
  /**
  * The ceiling-override posture (RunOptions.budgetPolicy, RV3902),
  * recorded at genesis only when 'immutable-lifetime': under it a
  * resume carrying any ResumeOptions.run override refuses typed
  * before ownership. Absent means 'segment', the historical
  * behavior. Stores must round-trip the field (the conformance kit
  * checks); a store that drops it degrades the run to the 'segment'
  * posture (the override door works again), never to an invented
  * refusal.
  */
  budgetPolicy?: "immutable-lifetime";
  /**
  * The bounded execution scope (RV4007), recorded at genesis and
  * immutable for the run's life: who this run executes for, as the
  * host names it (tenant, account, project; attribution only, never
  * IAM). Stores must round-trip the field (the conformance kit
  * checks); a store that drops it degrades the run to unscoped
  * attribution, never to an invented identity.
  */
  scope?: {
    tenant?: string;
    account?: string;
    project?: string;
  };
  /**
  * The declarative scope value normalization table (RV4302), recorded
  * at genesis beside the scope it shaped and immutable for the run's
  * life: the same table is journaled in the `execution_scope` genesis
  * decision (the fold's authority), and this mirror is what the
  * resume assertion reads before the journal loads. Stores must
  * round-trip the field (the conformance kit checks); a store that
  * drops it degrades the resume assertion to comparing raw supplied
  * values, never to an invented identity.
  */
  scopeNormalize?: {
    version: number;
    fields: Partial<Record<string, readonly string[]>>;
  };
  /**
  * The opt-in in-flight exposure cap
  * (RunOptions.maxInFlightExposureUsd), recorded at genesis so resume
  * restores the original invocation's cap (RV1504): the option used
  * to be per-invocation and unrecorded, and a resumed segment
  * silently ran WITHOUT the exposure bound, the seventeenth
  * comparison benchmark's top FinOps gap. Absent when the run started
  * without one. Stores must round-trip the field (the conformance kit
  * checks); a store that drops it degrades a resumed run to uncapped
  * exposure.
  */
  maxInFlightExposureUsd?: number;
  /**
  * The opt-in strict pre-egress pricing gate
  * (RunOptions.strictPricing canonicalized, RV1508), recorded at
  * genesis so resume restores the posture: a FinOps gate a resumed
  * segment silently drops is not a gate. Absent when the run started
  * without it. Stores must round-trip the field (the conformance kit
  * checks); a store that drops it degrades a resumed run to unpriced
  * dispatch.
  */
  strictPricing?: {
    maxRatesAgeDays?: number;
    allowUnpriced?: string[];
  };
  /**
  * The host-declared config identity (RunOptions.configFingerprint,
  * RV3210): an opaque pin over what the workflow body closes over,
  * recorded at genesis and compared on every resume that asserts one.
  * Absent when the run declared none. A store that drops the field
  * degrades the check to the UNRECORDED warning, never a false pass
  * or a false refusal (absence means NOT RECORDED).
  */
  configFingerprint?: string;
  /**
  * Count of execution segments this run has STARTED (a fresh start
  * writes 1; every resume writes prior + 1, durably, BEFORE the
  * segment emits its first event). The engine derives each segment's
  * WorkflowEvent seq and span-id base from it, which is what keeps
  * `seq` strictly increasing and `spanId` unique per run across
  * suspend/resume and process recreation, even after a crash-killed
  * segment (v1.22.0 review P1-2). Stores must round-trip the field
  * (the conformance kit checks); a store that drops it degrades a
  * resumed run's telemetry counters to per-segment, never the journal.
  */
  segments?: number;
  /**
  * Whether the run started with defined args. Engine-recorded at
  * genesis and preserved verbatim by every later segment (a resume
  * never rewrites it from its own re-supplied args). Args themselves
  * are not journaled; the host re-supplies them on resume, and this
  * marker plus `argsHash` let a host refuse a resume whose args
  * silently diverge from the original invocation (the v1.23.0 review:
  * a CLI resume that forgot `--args` silently changed the logical run
  * and paid again). Absent on runs started before v1.24.0. Stores must
  * round-trip the field (the conformance kit checks).
  */
  argsProvided?: boolean;
  /**
  * sha256 hex over the JCS canonical serialization of the genesis args
  * (`hashRunArgs`). Absent when the run started without args or when
  * the args are not JCS-serializable (`argsProvided` still records
  * presence). The raw args are never journaled, but the digest is
  * sensitive-derived metadata, not an opaque token: it is deterministic
  * and unsalted BY DEFAULT, so it reveals when two runs (in this store
  * or another) were started with identical args, and low-entropy args
  * (a boolean, an approval flag, a role, a short id) are recoverable by
  * hashing candidate values. `createEngine security.argsHashSalt`
  * switches the digest to HMAC-SHA256 under a deployment salt (RV-217),
  * which removes both leaks at the cost of binding every resuming
  * engine to the same salt. Protect meta, `inspect` output, and run
  * listings with the same access control as the journal and
  * transcripts; the digest confers no confidentiality on the args it
  * binds. Stores must round-trip the field (the conformance kit
  * checks).
  */
  argsHash?: string;
  /**
  * Unique token minted at the run's fresh start (genesis) and preserved
  * verbatim by every later segment, so two runs that reuse the same
  * explicit runId after a `deleteRun` are distinguishable: journal
  * length and workflow identity can coincide, this token cannot (the
  * v1.25.0 scale review: the queue worker's skip cache mistook a
  * recreated run for the old unchanged one and never resumed it).
  * Absent on runs started before the field shipped; readers treat
  * absence as "cannot prove same generation" and act accordingly.
  * Stores must round-trip the field (the conformance kit checks).
  */
  genesis?: string;
  /**
  * Which isolated-executor idempotency key derivation this run uses
  * (RV403), for its WHOLE life: stamped at the fresh start by the
  * engine (current engines stamp 2, the incarnation-scoped derivation
  * that binds `genesis` into the key so a `deleteRun`-then-recreate of
  * the same explicit runId never reuses keys against a long-lived
  * external dedup store) and carried verbatim by every resume segment.
  * Absent on runs recorded before the field shipped: those derive the
  * original genesis-free version 1 keys forever, across resume and
  * upgrade, so external dedup state accumulated for them stays valid.
  * A recorded version this engine does not know is a typed resume
  * refusal when isolated executors are configured (resume with a newer
  * rulvar), never a silent fallback. Stores must round-trip the field
  * (the conformance kit checks); a store that drops it degrades a
  * resumed run's NEW dispatches to version 1 keys, which breaks the
  * at-least-once fold of a redispatched call for a version 2 run.
  */
  execKeyDerivation?: number;
};
type RunFilter = {
  status?: string;
  /**
  * Match any of these statuses (the resumable candidate sweep asks for
  * `['running', 'suspended']` in one query). Advisory optimization, not
  * a correctness gate: a store written before this field ignores it and
  * returns a superset, so callers re-check status on what comes back.
  * When both `status` and `statuses` are present, a meta matches if it
  * satisfies either.
  */
  statuses?: string[];
  tags?: string[];
  name?: string;
};
interface JournalStore {
  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  putMeta(m: RunMeta, lease?: Lease): Promise<void>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  delete(runId: string, lease?: Lease): Promise<void>;
  /**
  * Fenced writes capability (the fenced run state RFC, phase 2),
  * optional exactly like `getMeta` and `leaseTtlMs`: a store declaring
  * `fencedWrites: true` PROMISES that every mutation carrying a lease
  * (`append`, `putMeta`, `delete`) verifies it is the CURRENT holder
  * for the run the mutation targets, atomically with the mutation
  * itself, and rejects with the typed LeaseHeldError leaving nothing
  * mutated when it is not (stale epoch, foreign owner, expired, or a
  * lease whose runId is not the mutation's run). The engine threads the
  * segment's lease into every one of these writes on a leased resume,
  * so over a declaring store a superseded worker cannot overwrite run
  * meta or delete run state, exactly as it already cannot append. A
  * mutation carrying NO lease keeps the single-writer semantics
  * unchanged. Stores written before this capability are unaffected:
  * without the marker the extra argument is ignored and hosts know the
  * surface is advisory.
  */
  readonly fencedWrites?: true;
}
/**
* Exact lookup capability: fetch one run's meta without materializing
* the whole catalog (the v1.25.0 scale review: `resume`, HTTP status,
* and CLI point lookups were O(all runs) through `listRuns`). Optional
* exactly like the lease capability: engines and shells detect it with
* `hasMetaLookup` and fall back to `listRuns` + find, so a conformant
* store written before this capability keeps working unoptimized. A
* missing run resolves `undefined`, never a rejection.
*/
interface MetaLookupStore extends JournalStore {
  getMeta(runId: string): Promise<RunMeta | undefined>;
}
/**
* Lease capability: acquire on a held lease MUST reject with a typed
* LeaseHeldError; renew MUST run at an interval of at most ttl/3; an
* append carrying a stale epoch MUST be rejected and never appear in load.
* The fencing epoch MUST be monotonic per runId across `delete` and
* recreate: after a run is deleted and the same explicit runId is
* started again, `acquire` MUST return a strictly higher epoch than any
* epoch the deleted incarnation ever held (keep a tombstone of the
* high-water mark through deletion), or a zombie lease from the deleted
* incarnation with a stable owner identity would fence green against
* the new incarnation's journal, meta, and delete surfaces.
*/
/**
* Effect lane capability (plan 45, rfcs/effects.md section 4.5, item
* 3): a store carrying a restoration generation OUTSIDE the journal
* bytes. The restore procedure bumps it atomically BEFORE the restored
* data becomes reachable, so a point-in-time-restored store comes up
* with effect dispatch disabled by construction: the effect lane
* writer validates the store's generation against the one recorded in
* the journal's latest `effect_epoch` decision and refuses every lane
* append until an operator appends a fresh epoch citing the bumped
* generation. One recorded deviation from the RFC's wording, with its
* reason: the RFC asks the store itself to reject an UNLEASED effect
* lane append, but stores are dumb byte stores that never parse
* payloads (obligation A4) and cannot recognize lane traffic; the
* unleased half is therefore enforced by the writer's construction
* (no lane append path exists without the lease) plus the conformance
* kit over the writer-store composition, while the superseded-lease
* half is exactly the shipped `fencedWrites` contract.
*/
interface EffectLaneStore extends LeasableStore {
  readonly effectLane: true;
  /** The current restoration generation; 0 until a restore ever ran. */
  restorationGeneration(): Promise<number>;
}
interface LeasableStore extends JournalStore {
  acquire(runId: string, owner: string): Promise<Lease>;
  renew(l: Lease): Promise<void>;
  release(l: Lease): Promise<void>;
  /**
  * Optional TTL introspection (v1.35.0 review P2-4): the configured
  * lease ttl in milliseconds. A store exposing it lets createWorker
  * VERIFY at construction that the worker's renew cadence matches the
  * store's expiry instead of trusting two config sources to agree;
  * stores without it are accepted with the worker's own ttl.
  */
  readonly leaseTtlMs?: number;
}
//#endregion
//#region src/l0/spi/transcript.d.ts
interface TranscriptStore {
  put(ref: string, blob: Bytes, lease?: Lease): Promise<void>;
  get(ref: string): Promise<Bytes | null>;
  list(runId: string): Promise<string[]>;
  /**
  * Deletes one blob; a missing ref is a no-op, never an error (M8-T04
  * amendment, OQ-20: retention is impossible without blob deletion).
  * The cascade over a run's blobs is ENGINE-side (Engine.deleteRun),
  * never a store obligation.
  */
  delete(ref: string, lease?: Lease): Promise<void>;
  /**
  * Fenced writes capability (the fenced run state RFC, phase 2), the
  * transcript-side twin of the JournalStore marker: a store declaring
  * it verifies a lease-carrying `put` or `delete` against the CURRENT
  * lease of the run the ref's leading path segment names, atomically
  * with the mutation, and rejects stale holders with the typed
  * LeaseHeldError leaving the prior blob intact. The engine threads
  * the segment's lease into every blob write of a leased resume
  * (checkpoints, compaction summaries, worktree patches, workflow
  * sources). The shipped file and in-memory transcript stores do NOT
  * declare it (they are single-writer by contract); a fenced
  * implementation needs the blobs and the lease state in one
  * transactional domain, which is exactly how the sqlite twin ships:
  * `SqliteStore.transcripts()` in `@rulvar/store-sqlite` keeps blobs
  * beside the lease rows of the same database.
  */
  readonly fencedWrites?: true;
}
//#endregion
//#region src/l0/serialization.d.ts
/**
* The run identity the store knows at the append/load boundary but a
* bare JournalEntry does not carry (the runId lives in the store key,
* not the entry). Passed to the journal hook so a hook can bind stored
* bytes to the run they belong to (RV-217 follow-up: the envelope
* encryption uses it as associated data, so a ciphertext cannot be
* transplanted into another run). Optional in the type so a host hook
* written against the original single-argument shape stays valid.
*/
interface JournalSerializationContext {
  runId: string;
}
interface JournalSerializationHook {
  /** Applied at append; kernel ordering/identity fields MUST pass through. */
  toStored(e: JournalEntry, ctx?: JournalSerializationContext): JournalEntry;
  /** Applied at load; MUST be symmetric with toStored for replay to hold. */
  fromStored(e: JournalEntry, ctx?: JournalSerializationContext): JournalEntry;
}
interface TranscriptSerializationHook {
  /** Applied at put. */
  toStored(ref: string, blob: Bytes): Bytes;
  /** Applied at get; MUST be symmetric with toStored. */
  fromStored(ref: string, blob: Bytes): Bytes;
}
/** createEngine({ serialization }): absent means identity, no wrapping. */
interface SerializationHook {
  journal?: JournalSerializationHook;
  transcripts?: TranscriptSerializationHook;
}
/**
* Wraps a journal store with the hook; the lease and meta lookup
* capabilities are preserved (meta is never hooked, exactly like
* putMeta/listRuns pass through).
*/
declare function wrapJournalStore(inner: JournalStore, hook: JournalSerializationHook): JournalStore;
/** Wraps a transcript store with the hook. */
declare function wrapTranscriptStore(inner: TranscriptStore, hook: TranscriptSerializationHook): TranscriptStore;
/** The replacement marker; deterministic and greppable. */
declare const MASKED_SECRET = "[masked-secret]";
/** Masks credential-shaped substrings in one string. */
declare function maskSecrets(text: string): string;
/**
* Deep-masks every string value in a JSON tree; non-strings pass
* through. Returns the input identity when nothing matched, so the
* default-on policy costs no allocation on clean events.
*/
declare function maskSecretsDeep<T>(value: T): T;
/** Convenience for hosts: masks a Json value (alias of the deep walk). */
declare function maskSecretsJson(value: Json): Json;
/** A compiled masking policy: text and deep-JSON forms of one pattern set. */
interface SecretMasker {
  maskText(text: string): string;
  maskDeep<T>(value: T): T;
}
/**
* Compiles the redaction policy: the DEFAULT credential pattern set
* plus host-defined patterns (RV-217), for the telemetry boundary
* (events and traces; never the journal, where lossless encryption is
* the right tool). String patterns compile as global regexes; RegExp
* patterns are recompiled with the global flag when it is missing, so
* replace-all semantics always hold. An invalid pattern is a typed
* ConfigError at compile time, before anything runs under the policy.
*/
declare function compileSecretMasker(patterns?: ReadonlyArray<RegExp | string>, site?: string): SecretMasker;
//#endregion
//#region src/l0/run-id.d.ts
/**
* The runId length ceiling (RV1012): a runId is a filesystem name
* component and a correlation key, so the cap keeps it comfortably
* under filesystem name limits with room for store suffixes, and
* starves length-based smuggling through the unmasked id channel.
*/
declare const MAX_RUN_ID_LENGTH = 200;
/**
* Throws a ConfigError unless runId is a filesystem-safe token: a
* non-empty string over [A-Za-z0-9._-] that is neither '.' nor '..'
* (the dot pair passes the alphabet on its own, so it is refused
* explicitly), no longer than {@link MAX_RUN_ID_LENGTH}.
*/
declare function assertSafeRunId(runId: string, context: string): void;
//#endregion
//#region src/l0/encryption.d.ts
/**
* The KMS seam. `keyId` is a stable routing id stamped into every
* envelope (a KMS key ARN or alias, or a local rotation label); the
* two methods are the exact shape of KMS GenerateDataKey and Decrypt.
* Both are called only inside `createEnvelopeEncryption`.
*/
interface DataKeyProvider {
  readonly keyId: string;
  generateDataKey(): Promise<{
    plaintext: Bytes;
    wrapped: Bytes;
  }>;
  unwrapDataKey(wrapped: Bytes): Promise<Bytes>;
}
/**
* The local reference DataKeyProvider: the key-encryption key is
* HKDF-SHA256(secret, info), data keys are random 32-byte AES keys,
* and wrapping is AES-256-GCM under the KEK. `info` partitions one
* master secret into unrelated KEKs (tenant-scoped keys: one provider
* per tenant with `info: tenantId`); a provider with different
* secret or info CANNOT unwrap this provider's keys. For production
* KMS, implement the same interface over GenerateDataKey/Decrypt.
*/
declare function localKeyProvider(options: {
  secret: string | Bytes; /** Stamped into envelopes; default 'local:v1'. */
  keyId?: string; /** KEK partition label (e.g. a tenant id); default ''. */
  info?: string;
}): DataKeyProvider;
/** The journal envelope marker; a stored entry's whole value is this. */
declare const JOURNAL_ENVELOPE_MARKER = "__rulvarEnvelope";
interface EnvelopeEncryption {
  /** Pass as `createEngine({ serialization })`. */
  hook: SerializationHook;
  /** The provider's routing id, stamped into every envelope. */
  keyId: string;
  /**
  * The CURRENT wrapped data key. Every write stamps it into the
  * envelope, so nothing else must be persisted; it is exposed for
  * hosts that keep a rotation ledger.
  */
  wrappedDataKey: Bytes;
}
interface EnvelopeEncryptionOptions {
  provider: DataKeyProvider;
  /**
  * Wrapped data keys from earlier sessions or rotations that this
  * process must still read. Unwrapped once at creation; an envelope
  * carrying an UNREGISTERED wrapped key fails typed at read, naming
  * this list.
  */
  historicalWrappedKeys?: readonly Bytes[];
  /**
  * What a NON-enveloped stored entry or blob means at read:
  * 'reject' (default, fail closed) or 'passthrough' (explicit
  * migration mode for stores with pre-encryption history).
  */
  plaintextReads?: "reject" | "passthrough";
}
/**
* Builds the envelope-encryption SerializationHook. All DataKeyProvider
* calls happen HERE (the hook itself is synchronous, on in-memory data
* keys): a fresh data key is minted and wrapped for this instance, and
* every historical wrapped key is unwrapped for the read path.
*/
declare function createEnvelopeEncryption(options: EnvelopeEncryptionOptions): Promise<EnvelopeEncryption>;
/** Guards against non-constant-time comparisons in host key checks. */
declare function constantTimeEqual(a: Bytes, b: Bytes): boolean;
//#endregion
//#region src/l0/usage.d.ts
/**
* Names every rule the given usage violates; an empty array means the
* usage satisfies the full canonical invariant: each present count is a
* finite nonnegative integer and
* `cacheReadTokens + cacheWriteTokens <= inputTokens`. The subset rule
* is checked with a negated comparison so a NaN operand counts as a
* violation rather than vacuously passing.
*/
declare function usageViolations(usage: Usage): string[];
/**
* One count, repaired in the conservative direction: non-numbers and
* non-finite values floor to zero (no evidence, no charge and no
* credit), negatives floor to zero (a negative count can only CREDIT
* the budget, which hostile telemetry must never do), and fractions
* round UP so a repaired charge is never an undercharge.
*/
declare function sanitizeTokenCount(value: number | undefined): number;
/**
* One field read per property, returning a detached plain copy. Both
* accounting boundaries validate and consume THIS snapshot, never the
* adapter-owned object, so a hostile accessor cannot answer the
* validator with valid counts and the accumulator with garbage.
*/
declare function snapshotUsage(usage: Usage): Usage;
/**
* Canonical usage addition for aggregates. The four required counts sum
* field by field and reasoning appears when the sum is positive, byte
* for byte the historical fold. The cache-write TTL split survives
* aggregation (RV1001): when either side differentiates its writes, an
* undifferentiated side's writes count as the 5m share, which is
* financially identical (both bill at the plain write rate) and keeps
* the sum canonical under the split-sum rule instead of dropping the 1h
* attribution the money was debited under. Sides carrying no split add
* exactly as before, so aggregates over undifferentiated usage stay
* byte stable.
*/
declare function sumUsage(total: Usage, turn: Usage): Usage;
/**
* The per-field repair for DELTAS (mid-stream usage reports and other
* partial increments): each count is repaired like `sanitizeTokenCount`,
* but the whole-usage subset rule is deliberately NOT applied, because a
* delta legitimately carries cache counts without restating the full
* input in the same event; clamping those to the subset rule would
* silently drop a paid cache debit. Always returns a fresh object and
* is the identity on valid deltas.
*/
declare function sanitizeUsageDelta(delta: Usage): Usage;
/**
* Conservative repair for accounting. Pairs with `usageViolations`: the
* violation fails the call loud, and the sanitized numbers are the only
* ones the journal, the cost report, and the budget may see. After the
* per-field repair the cache subsets clamp into the input with reads
* keeping priority, mirroring the adapter-level subset clamp. Valid
* usage passes through structurally unchanged.
*/
declare function sanitizeUsage(usage: Usage): Usage;
//#endregion
//#region src/l0/terminal.d.ts
/**
* Neutralizes terminal control sequences and control characters in one
* untrusted string, collapsing each remaining control run to a single
* space so a value can never inject a newline, an escape sequence, or a
* hidden byte into a rendered line. Visible text is preserved.
*/
declare function sanitizeTerminalText(text: string): string;
//#endregion
//#region src/l0/terminal-envelope.d.ts
/** One run terminal, the same on every surface (RV1105). */
interface TerminalEnvelope {
  /** The run this terminal speaks for. */
  runId: string;
  /** The workflow name the run was started (or resumed) under. */
  workflow: string;
  /** The computed transport status of the run. */
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  /** The typed error, exactly the outcome's, when status is 'error'. */
  error?: WireError;
  /** The semantic completion claim, when the workflow made one. */
  completion?: "complete" | "partial" | "rejected";
  /**
  * Whether anything durable records this terminal (RV907). False only
  * on the event stream: `handle.result` rejects typed instead of
  * resolving an unsettled outcome.
  */
  settled: boolean;
  /** Present only beside `settled: false` when a successor owns settlement (RV1009). */
  settledReason?: "superseded";
  /** The NET settled fold: what the run recorded as spent. */
  totalUsd: number;
  /** The gross figure with abandoned subtrees included (P1.3). */
  grossUsd: number;
  /**
  * Where the dollars above come from (RV1413): journaled usage priced
  * at the CALLER'S pricing table (declared rates or adapter caps),
  * never a provider statement. Always `'locally-estimated'` today,
  * declared as a literal so finance tooling never has to guess,
  * mirroring `InvoiceExport.pricingBasis`; reconcile real bills
  * through the invoice export and `reconcileStatement`, which carry
  * their own provenance.
  */
  costBasis: "locally-estimated";
  /** The per-model split of totalUsd, keyed by canonical ModelRef. */
  costByModel: Record<string, number>;
  /**
  * Provider wire requests recorded by the per-dispatch ledger
  * (RV1904), the same journal-derived figure `CostReport.wireRequests`
  * carries: on ledger-covered runs it equals the invoice cardinality,
  * so the terminal a consumer gates on and the invoice a finance
  * pipeline folds finally share one denominator. Absent when the
  * producing fold did not count wires (a pre-RV1904 live accumulation
  * a host fed into `buildCostReport`).
  */
  wireRequests?: number;
  /** The run's usage aggregate, TTL attribution included. */
  usage: Usage;
  /** True when any priced usage is approximate: totalUsd is a lower bound. */
  usageApprox: boolean;
  /** Agents admitted over the run's lifetime, resume seed included. */
  agentsSpawned: number;
  /**
  * Whether the artifact this terminal carries passed the declared
  * finish contract (RV2506), mirrored onto the envelope since RV3304:
  * the 2026-08-12 comparison run settled ok/complete over a retained
  * contradiction, and neither the HTTP response nor the persisted
  * rebuild could say whether anything ever judged the deliverable.
  * Absent when no contract judged anything; absence means NOT
  * RECORDED, never "accepted".
  */
  deliverableAccepted?: boolean;
  /**
  * Whether this terminal carries a deliverable to read at all
  * (RV2506); same mirror and posture. Distinct from
  * `deliverableAccepted`: an unjudged artifact still EXISTS, and a
  * run with no artifact still has a completion claim.
  */
  resultAvailable?: boolean;
  /**
  * The journal seq of the decision entry recording the acceptance of
  * the artifact this terminal carries (RV2506); same mirror, absent
  * unless the acceptance actually rendered. Read it with
  * `rulvar inspect` to see WHICH validators accepted WHICH hash.
  */
  acceptedArtifactRef?: number;
  /**
  * The claim consistency pass meta, detached (RV3304): `judgedStage`,
  * `judgedHash`, the coverage grade and the `findings` count, so the
  * surface a consumer gates on says WHAT was semantically verified,
  * over WHICH document, and what the judge found, without reaching
  * into the workflow value. Mutating this copy never touches the
  * outcome the engine owns.
  */
  claimConsistencyMeta?: Record<string, unknown>;
  /**
  * The citation audit meta, detached (RV4403): `sampled`,
  * `supported`, `partial`, `unsupported`, `auditedHash` and the
  * per-section split, mirrored beside the claim meta so the surface
  * a consumer gates on carries the audit's own numbers on failed
  * terminals too. Same posture as `claimConsistencyMeta`.
  */
  citationAuditMeta?: Record<string, unknown>;
  /**
  * The one-word semantic verdict (RV4209), mirrored beside the meta
  * it was folded from: 'clean' | 'findings' | 'partial' | 'vacuous'
  * | 'waived' | 'not-judged' plus the counts and the waiver
  * (SemanticTerminalVerdict), so an event-only or HTTP consumer
  * gates on the same one derivation the CLI reads. Absent when no
  * semantic machinery was configured; absence means NOT RECORDED.
  */
  semanticTerminalVerdict?: Record<string, unknown>;
  /**
  * The host declared config identity the run was started under
  * (RV3210), echoed here since RV3304 so a decision consumer binds
  * the verdict above to the configuration that produced it without a
  * second read of the run record. Absent when the run declared none.
  */
  configFingerprint?: string;
  /**
  * Where THIS copy of the envelope was assembled (RV1209). Absent, the
  * historical byte contract, means the settlement chokepoint built it
  * from the live outcome, so every field above is the run's own
  * report. `'journal'` means a process that never held the run rebuilt
  * it from the journal that recorded the settle (a restart, a second
  * replica, an offline reader): the money, the usage, the agent count
  * and the settlement verdict are the SAME facts. `completion` is
  * present exactly when the settle recorded the semantic lift beside
  * its output digest (the persisted-terminal tail); a settle written
  * before the lift rode it stays absent. `error` is ABSENT because
  * the journal does not record the run's own wire error, and absence
  * under this provenance means "not recorded", never "the workflow
  * claimed nothing" or "the run did not fail". A consumer that needs
  * the error reads it from the live outcome or the run:end event.
  */
  provenance?: "journal";
}
/**
* The runtime gate over the terminal envelope contract (RV3903, the
* fourth comparison experiment). `terminalEnvelopeOf` is the ONE
* producer, but a producer is a compile-time promise, and the envelope
* crosses trust boundaries the type system never sees: a journal read
* back after a restart, a plain JS caller, an HTTP body a pipeline
* gates on. The experiment probed the built dist and the typed copy
* accepted `status: 'green'`, NaN dollars, and negative counts without
* a sound; a finance or compliance consumer downstream would have
* gated a run on fiction.
*
* The gate validates the CONTRACT fields and refuses with a typed
* {@link ConfigError} naming the field and the defect: enum `status`
* and `completion`, finite nonnegative money (with `totalUsd <=
* grossUsd`, gross being net plus abandoned by construction), usage
* and counters, `settledReason` only beside `settled: false`, the
* `costBasis` and `provenance` literals, boolean `usageApprox`, and
* the `WireError` shape when an error rides along. Unknown top-level
* fields pass through untouched: the contract evolves additively, and
* a parser that refused tomorrow's field would turn every additive
* release into a wire break. On success the SAME reference comes back,
* typed: the gate is a boundary check, never a normalizer.
*
* Wired where external bytes actually enter: `persistedTerminalEnvelope`
* runs every journal-rebuilt envelope through it (and refuses typed as
* `malformed-envelope`), which also covers the server's persisted
* serving by construction. The live settlement chokepoint stays
* unparsed on purpose: it is the one producer inside one process, and
* gating it would add a throw site to settlement itself.
*/
declare function parseTerminalEnvelope(value: unknown): TerminalEnvelope;
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
* a bare JSON Schema literal.
*/
type SchemaSpec<T = unknown> = StandardSchemaV1<unknown, T> | SchemaPair<T> | JsonSchema;
/**
* Inferred output type per form: the Standard Schema output type; the
* type-guard target of validate(); unknown for a bare JSON Schema.
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
* Derives the JSON Schema of a SchemaSpec. Form 1 projects via the
* StandardJSONSchemaV1 input() converter, target draft 2020-12 with
* draft-07 fallback; a library without the projection is a typed
* ConfigError at definition time, never at first call. Transforming
* schemas therefore project their INPUT type. Forms 2 and 3 are taken
* verbatim.
*/
declare function projectToJsonSchema(spec: SchemaSpec): JsonSchema;
/**
* Canonical schema derivation: local fragment-only $ref inlined (recursion is
* a ConfigError), remote and dynamic references forbidden, annotation
* keywords stripped (format retained), reference infrastructure ($defs,
* definitions, $anchor) removed once inlined. The result feeds JCS
* serialization and sha256.
*/
declare function canonicalizeSchema(schema: JsonSchema): JsonSchema;
/**
* The schemaHash used when no structured-output schema is declared: the
* hash of the canonical `true` schema.
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
* absent.
*/
declare function toolsetHash(contracts: ToolContract[]): string;
/**
* toolContractHash = sha256 over the JCS-canonical tuple of ONE tool
* contract: exactly one element of toolsetHash's array, so a per-tool
* hash identifies WHICH contract drifted when an attested toolsetHash
* stops matching (RV1514). Same tuple rule as the aggregate: the
* description is part of the contract, and an absent version
* participates as absent.
*/
declare function toolContractHash(contract: ToolContract): string;
/** Result of validating a value against a SchemaSpec. */
type SchemaValidationResult<T = unknown> = {
  valid: true;
  value: T;
} | {
  valid: false;
  issues: Issue$1[];
};
/**
* Runtime validation per form:
* form 1 via the Standard Schema's own validate, form 2 via the pair's
* type guard, form 3 via the vendored draft 2020-12 validator. The same
* machinery backs the structured-output tiers of the Agent Runtime.
*/
declare function validateSchemaSpec<S extends SchemaSpec>(spec: S, value: unknown): Promise<SchemaValidationResult<Out<S>>>;
//#endregion
//#region src/l0/events.d.ts
/** Run lifecycle and core telemetry (M1 subset). */
type CoreEvents = {
  type: "run:start";
  workflow: string;
  resumed: boolean;
} | {
  type: "run:end";
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  totalUsd: number;
  /**
  * Present and true when any priced usage folded into totalUsd is
  * approximate (a transport cut, a stream the ceiling severed, or an
  * abort left a turn's usage estimated rather than reported by the
  * provider), so totalUsd is a lower bound estimate, never an exact
  * charge. Absent means every contributing turn reported exact usage.
  */
  usageApprox?: boolean;
  /**
  * The semantic completion lift (RV-207 tail): present when the
  * workflow reported semantic completion through the completion
  * envelope contract: an `ok`/`exhausted` run whose result value is
  * an object carrying a valid `completion` literal, or an `error`
  * run whose typed error data carries one (the orchestrator
  * acceptance path emits both). Transport status says whether the
  * run ran; completion says whether the work is COMPLETE: an
  * accepted degraded run is `status: 'ok'` with `completion:
  * 'partial'`. Replay recomputes the same value from the re-executed
  * workflow, so the field is identical live and replayed. Absent
  * when the workflow makes no completion claim.
  */
  completion?: "complete" | "partial" | "rejected";
  /**
  * Settled child statuses by status name, lifted from the same
  * envelope (or typed error data) when it carries a valid record of
  * nonnegative integers. Absent otherwise.
  */
  childStatusCounts?: Record<string, number>;
  /**
  * Per-child degradation notes, lifted from the same envelope (or
  * typed error data) when it carries a valid string array (the
  * fifth experiment, cycle 75). An empty array is the workflow's
  * claim of zero degradation; absence means no claim. The outcome
  * mirror spreads the SAME lift, so the surfaces cannot disagree.
  */
  degradedReasons?: string[]; /** Children accepted by acceptPartialChildren; same lift. */
  salvagedPartialChildren?: string[];
  /**
  * The explicit semantic pass summaries (RV1906); same lift. Each
  * pass carries {ran, reason?}, so an event-only consumer reads
  * whether contradictions, claim consistency and synthesis
  * actually looked, instead of decoding absence.
  */
  semanticPasses?: {
    contradictions: {
      ran: boolean;
      reason?: string;
    };
    claimConsistency: {
      ran: boolean;
      reason?: string;
    };
    synthesis: {
      ran: boolean;
      reason?: string;
    };
  };
  /**
  * The claim-consistency pass meta, lifted from the same envelope
  * (or typed error data) when it carries a valid object (RV2203);
  * `judgeDeclined` rides here on the failed terminals that used to
  * read null while the journal held the verdict.
  */
  claimConsistencyMeta?: Record<string, unknown>; /** The citation audit meta, same lift and posture as the claim meta (RV4403). */
  citationAuditMeta?: Record<string, unknown>;
  /**
  * The one-word semantic verdict (RV4209), the same lift the
  * outcome carries, declared on the event since RV4403 so an
  * event-only consumer reads it typed on failed terminals too.
  */
  semanticTerminalVerdict?: Record<string, unknown>; /** The synthesis-skip marker from the same envelope; same lift (RV2203). */
  synthesisSkipped?: boolean | string;
  /**
  * Whether the artifact this terminal carries was accepted by the
  * declared finish contract, and whether there is one to read at
  * all (RV2506); same lift. `deliverableAccepted` is absent, never
  * false, when no finish contract was declared. The pair is what
  * `status` and `completion` cannot say between them: an accepted
  * child roster over a synthesis that never passed its contract
  * reads `status: 'ok'`, `completion: 'complete'`,
  * `deliverableAccepted: false`.
  */
  deliverableAccepted?: boolean;
  resultAvailable?: boolean;
  /**
  * The journal seq of the decision recording that acceptance
  * (RV2506); absent whenever `deliverableAccepted` is not true.
  */
  acceptedArtifactRef?: number;
  /**
  * Every finish candidate the declared contract did NOT accept, in
  * judgement order (RV2507); same lift, absent when there was
  * none. Each row identifies the candidate (`callId`, `hash`,
  * `chars`) and names the validators that rejected it, with `ref`
  * pointing at the retained bytes where the host asked for them.
  */
  rejectedFinishCandidates?: {
    callId: string;
    verdict: "repair" | "rejected";
    hash: string;
    chars: number;
    failed: {
      name: string;
      reasons: string[];
    }[];
    ref?: string;
  }[]; /** Children accepted through validated terminal output salvage on 'limit'; same lift. */
  salvagedTerminalOutputChildren?: string[];
  /**
  * Children that settled 'ok' below their declared evidence floor
  * (RV1412); same lift. Under the default their shortfall is a
  * degradation note and the verdict is untouched; under
  * `acceptance.requireEvidenceFloor` they also counted against
  * the policy.
  */
  belowFloorOkChildren?: string[];
  /**
  * What the children had produced when the run died BEFORE any
  * acceptance verdict (RV2602), lifted on its own rather than with
  * the completion, because it exists for the terminal where there
  * is no completion to lift. Present exactly when children were
  * spawned and no acceptance verdict exists, so it never overlaps
  * the fields above. Frozen at the moment of death, ahead of the
  * RV1903 exit barrier, which is why `unsettled` can be non-empty.
  */
  childrenAtFailure?: {
    spawned: number;
    settled: number;
    statusCounts: Record<string, number>;
    belowFloorOkChildren?: string[];
    unsettled?: string[];
  };
  /**
  * Present and false ONLY when nothing durable records this
  * terminal: a settlement write failed (the run_settle journal
  * append or the terminal RunMeta projection, RV907), or the
  * segment was superseded (`settledReason` names it, RV1009). The
  * status above is true as computation, but `handle.result`
  * rejects typed instead of resolving (SettlementError or
  * SupersededError), and an event-only consumer must not treat
  * this terminal as green. After a settlement failure, resuming
  * the run re-settles by replay (no provider call) and the
  * settled terminal carries no field, byte for byte like every
  * ordinary run. Never emitted true.
  */
  settled?: false;
  /**
  * Present only beside `settled: false`, naming WHY the terminal
  * refused green when the reason is not a settlement write
  * fault: 'superseded' means the run_settle append bounced off
  * the store's fence because a successor segment holds the lease
  * and owns settlement (RV1009), and `handle.result` rejects
  * with the typed SupersededError. A settlement WRITE failure
  * keeps its historical shape (`settled: false` with no reason)
  * byte for byte.
  */
  settledReason?: "superseded";
  /**
  * The per-child acceptance roster (RV806): status, salvage arm,
  * and the evidence verdict where the child declared a contract;
  * same lift and posture as the fields above.
  */
  acceptanceChildren?: Array<{
    child: string;
    status: string;
    salvage?: "partial" | "terminal-output";
    evidence?: {
      recordedEntries: number;
      minEntries: number;
      met: boolean;
      waivedBySalvage?: true; /** RV1207: the floor was required, so the arm did not promote. */
      floorRequired?: true;
    };
  }>;
  /**
  * The unified terminal envelope (RV1105): every terminal fact in
  * ONE shape, the same object the resolved outcome carries, so an
  * event-only consumer assembles nothing. On the settled paths the
  * sibling fields above stay byte for byte; when settlement did
  * not hold, `envelope.settled` mirrors the `settled: false` mark
  * (with `settledReason` inside for the superseded arc, RV1009).
  */
  envelope: TerminalEnvelope;
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
/**
* The structured exploration summary (RV-210): the engine-side tool
* exploration counters for one agent invocation. Attached to the full
* AgentResult and to the live `agent:end` event whenever any exploration
* guard limit is configured; journaled inside the terminal error payload
* (and therefore restored on replay) only when the guard itself ended
* the invocation (abortClass 'exploration').
*/
interface ExplorationSummary {
  /** Tool executions dispatched by the loop (the loop's own counter). */
  toolCallsUsed: number;
  /** Distinct (tool name, canonical args) signatures executed. */
  distinctSignatures: number;
  /** Executions of a signature that had already executed before. */
  repeatedCalls: number;
  /** Successful executions whose result digest was already seen. */
  duplicateResultCalls: number;
  /** Calls denied by the repeated-signature guard (never dispatched). */
  deniedRepeats: number;
  /** Executions per tool name. */
  byTool: Record<string, number>;
  /** Calls denied by maxCallsPerTool; present when that limit is configured. */
  deniedToolCap?: number;
  /** Weighted tool units spent; present when toolUnits is configured. */
  toolUnitsUsed?: number;
}
/**
* The tool budget pressure snapshot (RV304, the seventh comparison
* experiment): how close one agent invocation came to its tool budget,
* visible BEFORE the terminal 'limit' a starved worker would settle
* with. Attached to the full AgentResult and to the live `agent:end`
* event whenever maxToolCalls, toolUnits, or toolBudgetExtension is
* configured. The durable subset: since RV3002 the terminal entry
* journals `used` and the effective `cap` at settle, so a replayed
* result restores them unconditionally on new journals; an extension
* grant and the finalization-window entry journal as decision entries
* the moment they fire (RV509) and merge into the restored summary as
* `extensionsGranted` and `finalizationWindowEntered`. A journal
* written before the entry field shipped keeps the RV509 behavior byte
* for byte: `used` from the terminal checkpoint plus the
* decision-backed fields, present exactly when the invocation
* journaled at least one decision. Every other field
* (unitsUsed/unitsMax, noticesFired, finalizationReserveUsed, limiter)
* is live-only fidelity, exactly like transportRetries, and stays
* absent on replay.
*/
interface ToolBudgetSummary {
  /** Executed tool calls (the loop's own counter). */
  used: number;
  /**
  * The effective executed-call cap at the end: maxToolCalls plus every
  * granted extension. Absent when only toolUnits bounds the loop.
  */
  cap?: number;
  /** Weighted units spent; present when toolUnits is configured. */
  unitsUsed?: number;
  /** The weighted budget; present when toolUnits is configured. */
  unitsMax?: number;
  /**
  * Extension grants used, restored grants included; present exactly
  * when toolBudgetExtension is configured (RV301).
  */
  extensionsGranted?: number;
  /**
  * Notice thresholds (fractions of the cap) whose notices entered the
  * conversation; present when at least one fired.
  */
  noticesFired?: number[];
  /** Present and true when the finalization reserve summary turn ran. */
  finalizationReserveUsed?: boolean;
  /**
  * Present and true when the finalization window activated at least
  * once this invocation (RV302).
  */
  finalizationWindowEntered?: boolean;
  /** The tool budget limiter that ended the loop, on that 'limit' only. */
  limiter?: "maxToolCalls" | "toolUnits";
}
/**
* How an event's `costUsd` was folded (RV702). `'per-call'`: the sum of
* each provider request priced individually, the same basis the settled
* CostReport and invoice use (RV504), so a nonlinear long-context tier
* fires per REQUEST. `'aggregate-estimate'`: the aggregate usage priced
* in one call, which a tier can inflate past what any single request
* cost; emitted only when per-request records cannot cover the number
* (a checkpoint written before the reconciliation ledger shipped, or a
* terminal entry whose records do not cover its usage). An absent field
* on an event stream recorded before RV702 means the aggregate basis.
*/
type CostBasis = "per-call" | "aggregate-estimate";
/**
* Agent lifecycle. One logical agent dispatch emits EXACTLY ONE
* `agent:start`/`agent:end` pair on its span (the start carries the
* primary role), and each model invocation phase inside the span
* (`loop`, then possibly `summarize` activations, `finalize`,
* `extract`) emits its own `agent:phase:start`/`agent:phase:end` pair,
* so durations, per-phase usage, and attempts are derivable without
* heuristics (the RV-207 event-model contract; before it, every phase
* emitted an unpaired extra `agent:start` and consumers pairing starts
* with the single end computed the LAST phase's duration as the
* agent's). `reduceInvocationTable` is the official reducer over this
* vocabulary.
*/
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
  type: "agent:phase:start";
  agentType: string;
  label?: string; /** The invocation role this phase activation runs as. */
  role: string; /** The model the activation resolved to (fallbacks may serve another; the end event reports the server). */
  model: string;
  /**
  * 1-based activation ordinal within the span, unique per
  * activation (a summarize that fires three times gets three
  * pairs). Key phases by (spanId, invocation).
  */
  invocation: number;
} | {
  type: "agent:phase:end";
  agentType: string;
  label?: string;
  role: string; /** The model that actually served the activation's last attempt. */
  model: string;
  invocation: number;
  /**
  * Wall-clock activation duration. Live telemetry only: replayed
  * phase pairs (reconstructed from the terminal entry's usage
  * slices) carry 0.
  */
  durationMs: number; /** The usage this activation added to its (role, model) slices. */
  usage: Usage; /** That usage priced at each serving model's own rate. */
  costUsd: number;
  /**
  * The fold behind `costUsd` (RV702). Live phase deltas are always
  * per-call (every slice a live activation adds is backed by a
  * recorded provider call); a replayed pair says 'aggregate-estimate'
  * exactly when its model's records do not cover its usage. Absent
  * on streams recorded before RV702, which priced the aggregate.
  */
  costBasis?: CostBasis;
  outcome: "ok" | "error";
  /**
  * Transport retries inside this activation. Present only when
  * greater than zero; live telemetry only (absent on replay).
  */
  retries?: number;
} | {
  type: "agent:end";
  agentType: string;
  label?: string;
  status: string;
  usage: Usage;
  costUsd: number;
  /**
  * The fold behind `costUsd` (RV702): 'per-call' when every usage
  * slice of the invocation (restored included) is covered by
  * per-request records priced individually, the settled fold's own
  * basis; 'aggregate-estimate' when it is not (the aggregate number
  * is kept so restored spend is never silently dropped, and labeled
  * so it is never mistaken for the per-request fold). Absent on
  * streams recorded before RV702, which priced the aggregate.
  */
  costBasis?: CostBasis;
  entryRef: number;
  /**
  * Present and true when this agent's usage is approximate rather
  * than reported by the provider (the turn was cut by a transport
  * failure, a ceiling that severed the stream, or an abort). Absent
  * means the provider reported the usage exactly. Mirrors the
  * terminal journal entry's usageApprox.
  */
  usageApprox?: boolean;
  /**
  * Total transport retries across the span's activations. Present
  * only when greater than zero; live telemetry only, never
  * journaled, so a replayed agent:end omits it (absent means "zero
  * or unknown").
  */
  retryCount?: number;
  /**
  * Present and true when the invocation was aborted by the host's
  * finish rejection (RV3702): the declared finish contract
  * rejected the candidate past its repair bound. Journaled on the
  * terminal agent entry (unlike retryCount), so a replayed
  * agent:end carries it too and both surfaces of the RV3404 cut
  * read the same count.
  */
  hostRejected?: boolean;
  /**
  * The exploration guard counters (RV-210). Present live whenever
  * any exploration guard limit was configured for the invocation;
  * on replay present only when the guard abort journaled it in the
  * terminal error payload.
  */
  exploration?: ExplorationSummary;
  /**
  * The tool budget pressure snapshot (RV304). Present live whenever
  * a tool budget limiter or the extension was configured; live
  * telemetry only, absent on replay.
  */
  toolBudget?: ToolBudgetSummary;
  /**
  * The terminal's typed error (RV4703), verbatim from the journaled
  * agent entry, so live and replayed streams carry the same value.
  * The eighth comparison experiment's first run lost its child's
  * death to exactly this absence: the child died on a budget-refused
  * finalize dispatch, the terminal entry named it, and the event
  * said status 'error' and nothing else. Absent when the agent
  * settled without an error.
  */
  error?: WireError;
} | {
  type: "agent:error";
  agentType: string;
  label?: string;
  error: WireError;
  willRetry: boolean;
} | {
  type: "quota:denied";
  agentType: string;
  label?: string; /** The denied model ref. */
  model?: string; /** The limiter's reason ('tokensPerMinute 1800000 exhausted'). */
  reason?: string;
  retryAfterMs?: number;
  willRetry: true;
} | {
  type: "budget:exposure-wait";
  agentType: string;
  label?: string; /** The waiting party: the orchestrate root or a spawned child. */
  scope?: "root" | "child"; /** The refused model ref. */
  model?: string; /** The refusal arithmetic, verbatim from the typed refusal. */
  capUsd?: number;
  spentUsd?: number;
  inFlightUsd?: number;
  estimateUsd?: number;
  willWait: boolean;
} | {
  type: "agent:schema-retry";
  agentType: string;
  attempt: number;
  maxAttempts: number;
} | {
  type: "control:wire";
  controlKind: "countTokens";
  model: string;
  outcome: "ok" | "failed" | "denied";
  inputTokens?: number;
} | {
  type: "agent:stream";
  delta: string;
};
/** Tool lifecycle (emitters arrive with the tool system, M3). */
type ToolEvents = {
  type: "tool:start";
  toolName: string;
  /**
  * The model-minted id of this tool call (RV908): the same id the
  * journal's messages and tool-result parts carry, so a consumer
  * pairs start and end EXACTLY even among concurrent same-name
  * calls, instead of FIFO-guessing by (spanId, toolName). Present
  * on every live event this engine emits, and on every replayed
  * reconstruction (whose events exist only when the turn
  * checkpoint blob is retrievable; the id rides the checkpoint's
  * tool-result parts, so even journals written before RV908 name
  * their calls there). Absent only on streams recorded before
  * RV908 or written by foreign emitters, where consumers keep
  * their historical pairing.
  */
  toolCallId?: string;
  risk?: Json;
} | {
  type: "tool:end";
  toolName: string; /** The same call id as the matching tool:start (RV908). */
  toolCallId?: string;
  outcome: "ok" | "error" | "denied";
  durationMs: number;
  /**
  * Audit fields (M5-T05): the chain verdict,
  * the deciding layer, the matched rule, and advisory domain-rule
  * matches. Telemetry, never identity; ask verdicts additionally
  * journal as suspended approvals.
  */
  verdict?: "allow" | "deny" | "ask";
  decidedBy?: string;
  rule?: Json;
  advisory?: Json;
  /**
  * Present when an engine guard, not the permission chain, denied
  * the call: the exploration guards (RV-210) or the finalization
  * window (RV302). The outcome is 'denied' and the call was never
  * dispatched.
  */
  guard?: "repeated-signature" | "per-tool-cap" | "finalization-window";
  /**
  * The structured failure reason on outcome 'error' (RV1807), so
  * public telemetry distinguishes a not-settled child read from a
  * genuine failure without the private transcript. Engine-stamped
  * literals include 'unknown-tool', 'invalid-arguments',
  * 'model-retry', 'non-serializable-result',
  * 'executor-unregistered', 'unknown-handle', 'child-not-settled',
  * and 'unknown-artifact'; a tool that throws a RulvarError
  * carrying `data.errorCode` surfaces that string, a bare
  * RulvarError surfaces its coarse code class, and anything else
  * stays reasonless. Telemetry, never identity.
  */
  errorCode?: string;
};
/**
* Bare-nondeterminism detection (RV-209). Emitted LIVE by the segment
* that observed the call, at most once per (category, provenance) per
* execution segment; never journaled and never re-emitted with the
* `replayed` flag. Because replay re-executes the workflow body, a
* violation that survives in the code fires again on every replay of
* the run, so the event appears organically in both live and replayed
* streams. Exempt provenances (installed dependencies under
* node_modules and Node runtime frames) never emit: they are
* classified and silenced, which is what keeps an SDK's internal
* `Math.random()` from branding the run nondeterministic.
*/
type DeterminismEvents = {
  type: "determinism:warning"; /** Which patched global fired. */
  category: "bare-date-now" | "bare-math-random";
  /**
  * 'workflow': the caller is workflow-origin code (the violation the
  * guard exists for; rejects the run under `determinism.mode:
  * 'error'`). 'allowlisted': the caller matched a configured
  * `determinism.allowlist` pattern and is exempt by explicit host
  * decision; emitted for visibility, never rejects.
  */
  provenance: "workflow" | "allowlisted"; /** The calling stack frame, after the configured redaction hook. */
  frame: string; /** Parsed location when the frame carries one, after redaction. */
  file?: string;
  line?: number;
  column?: number;
};
/**
* Adaptive orchestration, resolutions, and
* accounting: emitted only by runs where the corresponding machinery is
* active (applicability per mode:
* https://docs.rulvar.com/guide/adaptive-orchestration). The types land as
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
  /**
  * Two emitted shapes share the discriminant: the cap-freeze form
  * carries { atCap: true, spentUsd, capUsd, finalizeReserveUsd },
  * and the per-wake digest form carries atCap plus the passive
  * WakeBudgetBlock fields (runSpentUsd .. softWarning).
  */
  type: "orchestrator:budget";
  atCap: boolean;
  spentUsd?: number;
  capUsd?: number;
  finalizeReserveUsd?: number;
  runSpentUsd?: number;
  runCeilingUsd?: number;
  orchestratorSpentUsd?: number;
  orchestratorCapUsd?: number;
  orchestratorShare?: number;
  softWarning?: boolean;
} | {
  type: "orchestrator:acceptance";
  verdict: "accepted" | "rejected";
  completion: "complete" | "partial" | "rejected";
  childStatusCounts: Record<string, number>;
  minSpawnedChildren?: number;
  spawnedChildren?: number;
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
  entryRef: number; /** The admitting arms of the unified AdmitVerdict union. */
  verdict: "admit" | "reuse_full" | "admit_graft";
  agentType: string;
  logicalTaskId: string;
  /**
  * Spawn-unit balance after the budget-layer debit. Present on
  * budget-layer admissions (the orchestrator spawn tools and
  * ctx.workflow children); absent on lineage-layer admissions
  * (ctx.agent roots), whose spawn-unit debit rides the dispatch
  * itself (v1.22.0 review P2-5).
  */
  spawnUnitsAfter?: number;
} | {
  type: "spawn:rejected";
  /**
  * The journaled admission decision entry; absent for the
  * pre-admission config gates (orchestrate maxSpawns), which
  * reject before anything is journaled.
  */
  entryRef?: number;
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
  /**
  * Declared for hosts; not emitted today. The compatibility scan
  * runs strictly before a run's event stream exists, so the
  * refusal travels only as the typed JournalCompatibilityError
  * (which carries the same fields).
  */
  type: "journal:compat";
  code: "HASH_VERSION_TOO_OLD" | "HASH_VERSION_TOO_NEW";
  found: number;
  window: [number, number];
};
type WorkflowEventBody = CoreEvents | AgentEvents | ToolEvents | DeterminismEvents | AdaptiveEvents;
/**
* The envelope: seq is an independent per-run
* telemetry counter, strictly increasing in emission order and DISTINCT
* from JournalEntry.seq (never compare or join the two; entryRef fields
* carry journal seqs explicitly). ts is wall clock, telemetry only.
* replayed is true only on re-emitted journal-backed lifecycle events;
* stream deltas are never re-emitted.
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
//#region src/l0/spi/isolation.d.ts
/**
* The canonical identity encoding of spawn isolation: this exact value
* domain enters spawn identity.
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
//#region src/journal/identity.d.ts
/** Spawn entries: ctx.agent and orchestrator spawn tools (kind 'agent'). */
interface AgentIdentityInput {
  kind: "agent";
  agentType: string;
  /**
  * The REQUESTED model spec, including canonical effort where resolved;
  * for laddered spawns it embeds the declared ladder together with
  * startTier.
  */
  modelSpec: CanonicalModelSpec;
  /** Replaced verbatim by opts.key when opts.key is set. */
  prompt: string;
  schemaHash: string;
  toolsetHash: string;
  /** The canonical IsolationSpec encoding (see https://docs.rulvar.com/guide/tools). */
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
* discriminant, exactly as frozen by the hashVersion 2 profile;
* `effort` is omitted when unresolved. The ladder embedding lands
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
* key = sha256(JCS(IdentityInput)).
*/
declare function deriveContentKey(input: IdentityInput): string;
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
* VERSION; 'incomparable' is a guaranteed non-match.
* M2-T05 supplies the real registry; the default ring knows only
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
  /**
  * Effect roots that genuinely need recovery under the entry-type
  * pairing rules: dangling dispatches (status 'running' with no
  * terminal) and suspensions with no resolution, neither consumed by a
  * live call nor covered by abandon. Complete operations are NEVER
  * listed: settled roots, single-entry kinds (decisions, facts, plan
  * and termination entries), and resolved suspensions are whole by
  * construction. A call deleted from the code is silently skipped and
  * never re-paid; it appears here only while its effect is dangling.
  */
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
  /** Suspension seqs holding at least one resolution ref-entry. */
  private readonly resolvedRefs;
  private readonly keyRing;
  private disposition;
  private aliasDisposition?;
  /** Scope-prefix aliases (DEF-5): donor prefix -> target prefix. */
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
  * The disposition applied to alias-sourced candidates (DEF-5): the
  * skipped overlay from abandon is bypassed ONLY through the
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
  * construction.
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
* only by the single canonical replayDisposition function (there is NO
* replayAction method).
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
* EngineOptions.extraDerivers, the ONLY window extender. A malformed
* extra deriver is a ConfigError before any run effect.
*/
declare function buildDeriverRegistry(extraDerivers?: readonly unknown[]): DeriverRegistry;
/**
* The one compatibility scan: immediately after load, strictly BEFORE any
* live call, any append, and any admission reserve; repeated at lease
* acquire in queue mode. Side-effect free.
*/
declare function scanJournalCompatibility(runId: string, entries: readonly JournalEntry[], registry: DeriverRegistry): void;
/**
* KeyRing over the registry: the live call is projected DOWN into the
* profile of the stored entry; there is no upward canonization.
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
* rate-limit, and budget are never memoized.
*/
declare function classifyAgentError(e: AgentError): ErrorClass;
/**
* The child scope-prefix an abandon over `target` covers transitively.
* Agent spawns nest under agent:<seq>; a child
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
* scope-prefix. Repeated abandons over an
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
  /**
  * True when the loaded journal carries a run settle with runStatus
  * 'ok' (the resume is a pure replay of a finished run): unstamped
  * limit entries then replay instead of re-running live. Terminal
  * settles other than ok keep the retry semantics.
  */
  runSettledOk?: boolean;
}): ReplayDisposition;
/**
* Adapts the predicate to the matcher's disposition hook: two-phase
* operations dispatch on their terminal, single-phase on themselves.
*/
declare function dispositionHook(fold: AbandonFold, registry: DeriverRegistry, invalidated?: ReadonlySet<number>, options?: {
  runSettledOk?: boolean;
}): (op: JournalOperation) => ReplayDisposition;
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
  /**
  * The resolution settled a live in-process waiter and the segment
  * continues in place. Absent when the append landed WITHOUT a
  * wake (the journal-fold path: a settled segment, or one already
  * closing when the attempt landed): the append is durable, the
  * closed body never continues, and the continuation belongs to a
  * resume (the suspension ownership rule). Hosts that auto-resume
  * on resolution branch on this instead of racing the settle.
  */
  woke?: true;
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
/** Fold classification of one ref-entry; NEVER persisted. */
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
* a projection of THIS fold (not a separate pass).
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
* Per-run, per-target FIFO serializer of resolution/abandon attempts:
* classification against the in-memory fold ->
* durable append -> a single settle; losing attempts are ALSO
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
/** Large-value soft warn threshold (committed for M2). */
declare const LARGE_VALUE_WARN_BYTES = 262144;
interface Ledger {
  usage: Usage;
  usd: number;
  agentsSpawned: number;
}
/**
* The budget ledger fold as a PURE function over entries (extracted in
* RV1209 so an offline reader folds the identical arithmetic instead
* of a lookalike): usage sums over terminal entries once, never twice;
* agentsSpawned counts agent dispatches. Dollars fold on the settled
* billing basis (RV801): per provider call where the entry's records
* cover its usage, the per-slice aggregate otherwise, the same basis
* as the CostReport and the invoice.
*/
declare function foldLedger(entries: readonly JournalEntry[], abandonFold: AbandonFold, priceUsd?: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined): Ledger;
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
  /** Set only when the call spanned several serving models; see JournalEntry. */
  usageByModel?: UsageSlice[];
  /** Attribution facts behind the CostReport breakdowns; see JournalEntry. */
  costAttribution?: CostAttributionFacts;
  /** The per-dispatch reconciliation ledger (P1.3); see JournalEntry. */
  providerCalls?: ProviderCallRecord[];
  /** The serving adapter's usage-semantics version; see JournalEntry. */
  usageSemantics?: string;
  transcriptRef?: string;
  checkpointRef?: string;
  /** Terminal agent entries: Artifact list. */
  artifacts?: unknown;
  /** Terminal agent entries: the evidence verdict; see JournalEntry. */
  evidence?: {
    recordedEntries: number;
    minEntries: number;
    met: boolean;
  };
  /** Terminal agent entries: recorded evidence entry content; see JournalEntry. */
  evidenceEntries?: Array<{
    claim: string;
    citation?: string;
  }>;
  /** Terminal agent entries: the durable tool-budget subset; see JournalEntry. */
  toolBudget?: {
    used: number;
    cap?: number;
  };
  /** Terminal agent entries: the host finish rejection stamp (RV3702); see JournalEntry. */
  hostRejected?: boolean;
  /** Terminal escalated entries: the validated EscalationReport. */
  escalation?: unknown;
  /**
  * Engine-decided terminal abort classes (the no-progress abort) stamp
  * memoizeOutcome on the TERMINAL entry so the frozen memoize rules
  * replay them on every resume; the running entry keeps the user's
  * policy verbatim (M3 amendment).
  */
  memoizeOutcome?: boolean;
  site?: string;
}
/**
* Per-run journal kernel front end. Everything is per instance: no module
* state anywhere.
*/
declare class Replayer {
  private readonly runId;
  private readonly store;
  private readonly lease?;
  private readonly leaseOf?;
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
  /**
  * The first lost append of this segment (RV3201), latched by persist
  * so flush() can rethrow what the serialized queue swallowed. The
  * wrapper object keeps a rejection whose reason is literally
  * `undefined` distinguishable from "no failure".
  */
  private appendFailure;
  /** True after the run's durable settle sealed the segment (RV1904). */
  private sealedInternal;
  private seq;
  constructor(options: {
    runId: string;
    store: JournalStore;
    now?: () => number;
    priceUsd?: (servedBy: ModelRef | undefined, usage: Usage) => number | undefined; /** Receives large-value soft warnings (never an error). */
    onWarn?: (msg: string) => void;
    largeValueWarnBytes?: number; /** The loaded, normalized prior journal (resume). */
    priorEntries?: readonly JournalEntry[];
    keyRing?: KeyRing;
    disposition?: (op: JournalOperation) => OperationDisposition; /** Replay-strict: any live-class match throws JournalMissError. */
    strict?: boolean;
    /**
    * Queue mode: every append carries this lease so a stale holder's
    * writes are rejected by the fencing epoch (M8 entry amendment).
    * Absent means the single-writer precondition
    * is asserted instead of fenced (the embedded default).
    */
    lease?: Lease;
    /**
    * Late-bound lease lookup (P0.2): consulted at EVERY append,
    * winning over the static `lease` when it returns one. The engine
    * passes its segment-lease holder here, because the
    * engine-acquired genesis lease exists only after the ownership
    * boot, which runs after this constructor.
    */
    leaseOf?: () => Lease | undefined;
  });
  /**
  * Forward-matches one live call against the prior journal. Fresh
  * runs always miss; the M2-T06 predicate is injected
  * through setDisposition once folds are built.
  */
  match(scope: string, identity: IdentityInput, mode: ReplayMode): MatchResult;
  setDisposition(disposition: (op: JournalOperation) => OperationDisposition): void;
  /**
  * The disposition for alias-sourced candidates (DEF-5):
  * bypasses the abandon overlay so donor entries regain their
  * pre-abandon terminal status when matched through the alias.
  */
  setAliasDisposition(disposition: (op: JournalOperation) => OperationDisposition): void;
  /**
  * Registers a node.link scope-prefix rewrite (DEF-5):
  * donorPrefix forward-matches into targetPrefix at every nested level.
  * Idempotent; the alias map is rebuilt by fold on resume.
  */
  registerAlias(donorPrefix: string, targetPrefix: string): void;
  /**
  * invalidate/retry: explicit unpinning of a
  * memoized failure; the invalidated entry reruns on this resume. The
  * safety boundary is an open question.
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
  * Submits a resolution attempt through the per-target FIFO arbiter.
  * Losing attempts are journaled noops.
  */
  resolveSuspended(target: number, attempt: ResolutionAttempt): Promise<ResolutionOutcome>;
  abandonBranch(attempt: AbandonAttempt): Promise<ResolutionOutcome>;
  /** Pure fold view, snapshot-pinned. */
  suspensionState(target: number): SuspensionState;
  /**
  * Value size policy:
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
  * transitive scope coverage (M6-T06). Values
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
  * The budget ledger fold: usage sums over terminal entries once, never twice; agentsSpawned
  * counts agent dispatches. Dollars fold on the settled billing basis
  * (RV801): per provider call where the entry's records cover its
  * usage, the per-slice aggregate otherwise, the same basis as the
  * CostReport and the invoice.
  */
  ledger(): Ledger;
  /** Read-only view of the appended entries, in per-run total order. */
  snapshot(): readonly JournalEntry[];
  /**
  * Resolves when every append enqueued so far has persisted, and
  * REJECTS typed when any append was lost (RV3201). Deterministic
  * shims journal fire-and-forget through the serialized queue, whose
  * chain swallows rejections to keep later appends flowing; without
  * this rethrow a failed persist was visible to nobody (the shim
  * dropped its promise, the chain caught the error, and this barrier
  * awaited the already-caught chain), so a run could settle ok over a
  * journal missing a record it believes it wrote. The first failure
  * latches permanently for the segment: every flush from that moment
  * rethrows it, the engine settle path converts a would-be ok into an
  * error terminal, and mid-run flush callers fail fast instead of
  * proceeding over a torn journal.
  */
  flush(): Promise<void>;
  private mint;
  private persist;
  /**
  * Seals the journal after the run's durable settle (RV1904): every
  * append funnel rejects typed from here on. The orchestrate exit
  * barrier (RV1903) and the engine settle drain terminate every
  * straggler BEFORE the seal, so a sealed append is a lifecycle bug
  * surfacing loudly instead of the silent post-settle mutation that
  * split the four-role benchmark's cost views. A resume constructs a
  * fresh Replayer and appends normally.
  */
  seal(): void;
  /**
  * The sealed-lane guard (RV1904): the four lanes that can move money
  * or roster facts refuse after the settle. The ref-entry lane
  * (resolution/abandon) stays open on purpose: detached resolutions
  * answering a suspension or a parked approval are the DOCUMENTED
  * post-settle appends ("a later resolveExternal appends through the
  * fold without waking"), and they carry decisions, never billing
  * rows.
  */
  private sealedRejection;
  private enqueue;
}
//#endregion
//#region src/engine/external.d.ts
/**
* The rejection carrier of an aborted flavor B decision wait (v1.35.0
* review P1): the parked `awaitDecision` observes the branch/run
* AbortSignal, releases its held activity, removes its waiter, and
* rejects with this class so cancel, host abort, the run deadline, and
* failed sibling aborts all settle the run in bounded time.
* Deliberately not a RulvarError: the abort is cancellation intent, not
* a registry failure class; the suspension entry stays OPEN, so a later
* resume parks the decision again and the durable deadline still applies.
*/
declare class EscalationDecisionAbortedError extends Error {
  readonly entryRef: number;
  constructor(message: string, entryRef: number);
}
/** The resolution value shape of a tool-approval suspension (M3-T03). */
interface ApprovalDecision {
  decision: "allow" | "deny";
  reason?: string;
  /**
  * The allow's declared expiry (RV4008), carried verbatim from the
  * resolution value: the consumption recheck denies a granted allow
  * whose expiry has passed, exactly like a revocation. Pending
  * approvals already had `deadlineAt`; this bounds the GRANT.
  */
  expiresAt?: string;
  /**
  * The approval suspension's entry seq (RV4008): the address the
  * consumption recheck reads revocations against. Present on every
  * decision this registry hands out; absent only through older
  * callers of toApprovalDecision.
  */
  entryRef?: number;
}
/**
* Normalizes a resolution value into an ApprovalDecision. Anything that
* is not an explicit allow is a deny: an approval never fails open.
*/
declare function toApprovalDecision(value: Json, entryRef?: number): ApprovalDecision;
/** One recorded approval revocation's outcome (RV4008). */
interface ApprovalRevocationOutcome {
  /**
  * 'denied-pending': the approval was still open and is now denied
  * through the ordinary first-closing-wins arbitration.
  * 'revoked-allow': a recorded allow now carries a journaled
  * revocation that beats it at the consumption recheck.
  * 'already-revoked': a prior revocation already stands.
  * 'already-closed': the approval was denied or abandoned; there is
  * nothing to revoke.
  */
  state: "denied-pending" | "revoked-allow" | "already-revoked" | "already-closed";
  entryRef: number;
}
/**
* The detached resolution validator (RV1408): classifies the target
* entry exactly as the engine's own detached path does (a kind-'approval'
* entry by its RV1203 flavor, an external by its kind), then applies the
* shared payload arms and the pinned schema. Exported for offline
* authorities (the CLI server's lease-guarded append is the first): an
* escalation must resolve with its OWN EscalationDecision payload
* offline exactly as detached-live, and a lookalike validator that
* demanded the plain ApprovalDecision from every approval-kind entry
* both refused legitimate escalation decisions and waved wrong-shaped
* ones into the journal. Throws InvalidResolutionError; journals
* nothing.
*/
declare function validateDetachedResolution(target: JournalEntry, key: string, value: Json): Promise<void>;
/**
* Per-run registry of open external suspensions plus the run's activity
* counter: when every in-flight branch is blocked on suspensions
* (activity zero, waiters open), the run quiesces into outcome
* 'suspended'.
*/
declare class ExternalRegistry {
  private readonly replayer;
  private readonly waiters;
  private readonly keysByScope;
  private activity;
  private closedFlag;
  private quiesceListener?;
  private quiesceScheduled;
  private readonly emitEvent?;
  private readonly now;
  constructor(replayer: Replayer, emitEvent?: (body: WorkflowEventBody) => void, now?: () => number);
  /**
  * Live resolution telemetry: applied when the attempt won the
  * first-closing-wins fold, superseded when it lost. Emitted for live
  * attempts only; folds of prior entries at resume re-emit nothing.
  */
  private emitResolutionOutcome;
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
  /**
  * The resolveExternal key a journaled suspension answers to: externals
  * carry the workflow-chosen key in the payload; approvals and Flavor B
  * decisions synthesize `approval:<seq>`. Undefined for anything that
  * is not a suspended entry.
  */
  static suspensionKeyOf(entry: JournalEntry): string | undefined;
  /**
  * Settling the run closes this execution segment permanently: every
  * parked waiter is detached, so a resolution arriving after
  * handle.result settled appends durably through the fold and wakes
  * NOTHING; exactly one subsequent engine.resume owns the continuation.
  * Idempotent. (Suspension ownership rule; v1.10 deep E2E review.)
  */
  close(): void;
  get closed(): boolean;
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
  * Tool-approval suspension (M3-T03): journals (or
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
    risk?: string;
    /**
    * The opt-in approval deadline (RV1107), journaled ON the
    * suspension entry so it survives resume; the armed timer always
    * reads the ENTRY's deadline, never the caller's config, so a
    * config change can never move an already-journaled deadline.
    */
    deadlineAt?: string; /** Called with the suspended entry once it is open (live or re-parked). */
    onPending?: (entry: JournalEntry, replayed: boolean) => void;
  }): Promise<ApprovalDecision>;
  /**
  * Flavor B escalation suspension (M3-T07): the
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
    /**
    * The branch/run signal: an abort while parked releases the held
    * activity, removes the waiter, and rejects with
    * EscalationDecisionAbortedError (v1.35.0 review P1). The suspension
    * entry stays open for resume.
    */
    signal?: AbortSignal;
    onPending?: (entry: JournalEntry, replayed: boolean) => void;
  }): Promise<{
    value: Json;
    entryRef: number;
  }>;
  /**
  * A journaled deadline that does not parse is corruption: the old
  * `Date.parse(...) || now` fallback silently turned a mangled byte
  * into an immediate timeout (an instant deny for an approval, an
  * instant default decision for an escalation), so both flavors
  * refuse typed BEFORE parking or arming anything (RV1204). Fresh
  * appends always carry the ISO the engine itself computed; the
  * corrupt vector is a replayed entry served by a store.
  */
  private requireParsableDeadline;
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
  * settles the waiting promise in place. Without an open waiter the
  * attempt goes through the journal fold instead: a repeated resolution
  * is the documented journaled no-op ('already_resolved'), and once the
  * segment settled the resolution appends durably WITHOUT waking the
  * closed body (exactly one engine.resume owns the continuation).
  */
  resolveExternal(key: string, value: Json): Promise<ResolutionOutcome>;
  /** The shared live-path payload validation (throws, journals nothing). */
  private validatePayload;
  /**
  * Resolution without a live waiter, over the journal fold. Three cases:
  * a key no suspension ever carried throws InvalidResolutionError; a key
  * whose suspensions are all closed submits through the arbiter and
  * returns the journaled no-op ('already_resolved' or
  * 'target_abandoned', durability.md contract); an OPEN suspension is
  * resolvable this way only once the segment settled (closed registry),
  * with the exact live-path validation and no wake.
  */
  /**
  * Revokes a tool approval (RV4008). A still-open approval is denied
  * through the ordinary first-closing-wins arbitration (a race with
  * a live allow stays deterministic by the journal). A RECORDED
  * allow cannot be unwritten (history is immutable): the revocation
  * appends an `approval_revoked` decision that beats the allow at
  * the consumption recheck, so an allow granted, crashed over, and
  * revoked never dispatches its tool on resume. A denied or
  * abandoned approval has nothing to revoke.
  */
  revokeApproval(key: string, options: {
    principal: string;
    reason: string;
  }): Promise<ApprovalRevocationOutcome>;
  private resolveDetached;
}
//#endregion
//#region src/l0/spi/regulated-posture.d.ts
/**
* The construction-side posture attestation (RV4101; the debt RV4009
* named). The regulated floor binds what flows through
* CreateEngineOptions / RunOptions / OrchestrateOptions, but the
* postures that decide whether a tool list can drift under a run or
* whether a provider executes tools outside the permission chain live
* on CONSTRUCTIONS: the mcp() source and the AI SDK bridge adapter.
* RV4009 deliberately excluded them from the profile hash ("a hash
* must not imply what it cannot verify") and named them in prose
* beside the call. This descriptor makes them verifiable: a
* risk-bearing construction exposes `describeRegulatedPosture()`, a
* PURE snapshot of what was chosen at construction time (no wire, no
* connect, no side effects), and `compileRegulatedProfile` walks the
* constructions reachable from its options, refuses a loosened
* posture naming the field, and folds the sorted descriptors into the
* hashed posture map beside an `unrecognized` count of the
* constructions that exposed nothing, so the hash names its own blind
* spot instead of implying totality.
*
* The descriptor is a snapshot, not a lease, and the window between
* compile time and use is held by re-assertion (RV4102, the RV1608
* template): the compiled options wrap each attested construction so
* every use of its risk seam (`tools()` on a source, `stream()` on an
* adapter) re-reads and re-judges the descriptor, refusing a posture
* that moved since compile. The cross-process half of the window
* needs no wrapper: a mutated construction compiles to a different
* profile hash, and the RV3210 resume assertion refuses it.
*/
/** The posture an mcp() tool source chose at construction (RV1516/RV1808). */
interface McpSourceRegulatedPosture {
  /** Descriptor shape version; bumps when the meaning changes. */
  regulatedPosture: 1;
  kind: "mcp-source";
  /** The source id (`mcp:stdio:<command>`, `mcp:http:<url>`, `mcp:inprocess`). */
  name: string;
  /** What a listChanged notification means for this source (RV1516). */
  drift: "rekey" | "refuse";
  /**
  * The discovery bounds (RV1808); `declared` is the all-four
  * predicate `requireBounds` enforces (maxTools, maxPages,
  * maxSchemaBytes, timeouts.discoveryMs), and the declared values
  * ride beside it so the profile hash moves when a bound moves.
  */
  bounds: {
    declared: boolean;
    maxTools?: number;
    maxPages?: number;
    maxSchemaBytes?: number;
    discoveryMs?: number;
  };
}
/** The posture a bridgeAiSdk() adapter chose at construction. */
interface AiSdkBridgeRegulatedPosture {
  /** Descriptor shape version; bumps when the meaning changes. */
  regulatedPosture: 1;
  kind: "ai-sdk-bridge";
  /** The adapter id. */
  name: string;
  /**
  * Whether provider-executed tool results are admitted past the
  * seam; 'allow' runs tools outside the permission chain and the
  * journal, which the regulated floor refuses.
  */
  providerExecutedTools: "allow" | "deny";
}
/**
* The posture a first-party model adapter chose at construction
* (RV4204, the sixth comparison experiment): before it, only mcp()
* and the AI SDK bridge attested, so `unrecognized >= 1` on nearly
* every real compile and a `require-recognized` floor was
* unsatisfiable by construction. The risk seams a model adapter
* actually owns are its egress (where the wire bytes go) and its
* caps-refresh pagination bound; both enter the hashed posture map,
* so a moved base URL or a dropped bound moves the fingerprint.
*/
interface ModelAdapterRegulatedPosture {
  /** Descriptor shape version; bumps when the meaning changes. */
  regulatedPosture: 1;
  kind: "model-adapter";
  /** The adapter id ('anthropic', 'openai'). */
  name: string;
  /**
  * Where the adapter's wire bytes go: the provider's official
  * endpoint, a declared base-URL override (its origin rides beside
  * this value so the hash pins the egress), or a preconstructed
  * client the adapter cannot see through, named honestly.
  */
  transport: "official" | "custom-base-url" | "preconstructed-client";
  /** Present exactly under 'custom-base-url': the override's origin. */
  baseUrlOrigin?: string;
  /**
  * The caps-refresh pagination bound (RV2904), for adapters that
  * expose one: `declared` mirrors whether the host capped the sweep,
  * and the value rides beside it. Absent on adapters with no
  * declarable bound.
  */
  capsBound?: {
    declared: boolean;
    maxPages?: number;
  };
}
/**
* The posture an isolated tool executor chose at construction
* (RV4204). The executor is the one construction that dispatches
* HOST-SIDE effects, and the regulated floor requires its ledger: an
* effect no ledger records is an effect nobody can reconcile, the
* billingReceipts doctrine applied to tools.
*/
interface ToolExecutorRegulatedPosture {
  /** Descriptor shape version; bumps when the meaning changes. */
  regulatedPosture: 1;
  kind: "tool-executor";
  /** The reference flavor ('subprocess', 'container') or a host name. */
  name: string;
  /** Whether a ToolEffectLedger records every dispatch (intent first). */
  ledger: boolean;
  /** Host env names reaching the child, the exact allowlist. */
  allowEnv: readonly string[];
  /** The resolved per-call ceilings (defaults resolve at construction). */
  bounds: {
    timeoutMs: number;
    maxOutputBytes: number;
  };
  /**
  * The isolation seam, per flavor: a subprocess names whether a
  * sandbox launcher wraps the command; a container names its network
  * mode and root-filesystem posture.
  */
  isolation: {
    flavor: "subprocess";
    sandboxed: boolean;
  } | {
    flavor: "container";
    network: string;
    readOnlyRoot: boolean;
  };
}
/** What `describeRegulatedPosture()` returns: one of the known shapes. */
type RegulatedPostureDescriptor = McpSourceRegulatedPosture | AiSdkBridgeRegulatedPosture | ModelAdapterRegulatedPosture | ToolExecutorRegulatedPosture;
//#endregion
//#region src/l0/spi/toolsource.d.ts
/**
* Declarative risk metadata on the tool contract. Policy input, not
* identity: it does NOT enter toolsetHash.
*/
type ToolRisk = "read" | "write" | "network" | "execute" | "destructive";
/**
* The context handed to execute (and to permission hooks and canUseTool).
* Deliberately exposes NO spawn primitives: tools are leaves of the
* call-and-return tree (invariant I3); all spawning flows through Ctx
* primitives.
*/
interface ToolContext {
  runId: string;
  /** Tool span in the run > phase > agent > tool hierarchy. */
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
* policy. 'inprocess' runs the tool's `execute` closure in the engine
* process (full host capabilities, an execution convenience). A
* non-inprocess tag routes dispatch through the engine's registered
* ToolExecutorProvider (RV-216) instead, so the tool's work runs out of
* process under host-owned isolation; the shipped reference adapters live
* in `@rulvar/executor`. The tag never enters toolsetHash; it enters the
* authority attestation instead (RV1802).
*/
type ToolExecutor = "inprocess" | "subprocess" | "container";
/**
* A defined tool. The identity projection is the ToolContract
* { name, description, parameters, version }: exactly what the model sees
* and exactly what toolsetHash hashes; execute and every other
* non-contract field are excluded by construction.
*/
interface ToolDef<S extends SchemaSpec = SchemaSpec> {
  readonly kind: "tool";
  readonly name: string;
  readonly description: string;
  readonly parameters: S;
  /** Opaque contract version; part of toolsetHash. */
  readonly version?: string;
  /** Default 'inprocess'. */
  readonly executor: ToolExecutor;
  /**
  * Opaque policy data for a non-inprocess executor: what THIS tool's
  * declared executor should run (for a subprocess adapter, the command
  * and its argv). Never identity: excluded from toolsetHash exactly like
  * `executor` and `risk`, and ignored for 'inprocess'. The engine passes
  * it verbatim to the ToolExecutorProvider (RV-216). Its JCS digest
  * enters the authority attestation (RV1802).
  */
  readonly executorSpec?: Json;
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
* NOT mutate an in-flight agent's toolset.
*/
interface ToolSource {
  id: string;
  tools(session: ToolSourceSession): Promise<ToolDef[]>;
  /**
  * The construction-side posture attestation (RV4101): a PURE
  * snapshot of the risk postures this source chose at construction
  * (no wire, no connect, no side effects), read by
  * `compileRegulatedProfile` to refuse a loosened posture and hash a
  * tightened one. Optional: a source without it counts into the
  * profile's `unrecognized` tally instead of being implied verified.
  */
  describeRegulatedPosture?(): RegulatedPostureDescriptor;
}
//#endregion
//#region src/l0/spi/executor.d.ts
/** The non-inprocess executor tags a provider can be registered under. */
type IsolatedExecutorTag = Exclude<ToolExecutor, "inprocess">;
/**
* The per-call context handed to a ToolExecutorProvider. It carries the
* tool span (so provider telemetry nests under the run tree), the
* cancellation signal, and a stable idempotency key.
*/
interface IsolatedExecContext {
  runId: string;
  /** The tool span, minted under the agent span exactly like inprocess. */
  spanId: string;
  agentType: string;
  /**
  * Stable identity of THIS logical tool call within THIS run
  * incarnation: a deterministic function of the run, the logical
  * invocation (the containing agent's journal seq plus the call's
  * ordinal in that agent's tool loop), the tool name, the canonical
  * arguments, and, for runs stamped with derivation 2
  * (RunMeta.execKeyDerivation; RV403), the run's generation token. A
  * rerun of the same call after a mid-flight crash reuses the key, so
  * a provider whose work has external side effects can fold an
  * at-least-once retry into effectively-once; a different call, even
  * with byte-identical arguments, never collides; and under
  * derivation 2 a deleteRun-then-recreate of the same runId never
  * reuses the deleted incarnation's keys.
  */
  idempotencyKey: string;
  /** Fires on cancellation, a budget ceiling, or UsageLimits expiry. */
  signal: AbortSignal;
  /** Emits telemetry log events under the tool span; never journals. */
  log(level: "debug" | "info" | "warn" | "error", msg: string, data?: Json): void;
}
/** One out-of-process tool dispatch. */
interface IsolatedExecRequest {
  /** The declared executor tag ('subprocess' | 'container'). */
  executor: IsolatedExecutorTag;
  /** The tool contract name. */
  tool: string;
  /** The validated arguments, after the permission chain rewrote them. */
  args: Json;
  /**
  * The tool's `executorSpec`: opaque host data telling THIS provider
  * what to run (for a subprocess adapter, the command and its argv).
  * Never identity; the engine passes it through verbatim.
  */
  spec: Json;
  ctx: IsolatedExecContext;
}
/**
* The isolated tool executor seam. A provider runs one dispatch to its
* JSON result. A thrown error becomes the call's error tool result, never
* a run abort: an executor failure (non-zero exit, timeout kill,
* unparseable output, infrastructure error) is surfaced to the model
* exactly like any other tool error, so the loop can react and the run
* stays durable.
*/
interface ToolExecutorProvider {
  /** Runs one dispatch to its JSON result; throws to signal tool failure. */
  run(request: IsolatedExecRequest): Promise<Json>;
  /**
  * The construction-side posture attestation (RV4204): a PURE
  * snapshot of what the executor chose at construction (ledger,
  * env allowlist, ceilings, isolation seam), read by
  * `compileRegulatedProfile` and folded into the hashed posture map;
  * see the `regulated-posture` module.
  */
  describeRegulatedPosture?(): RegulatedPostureDescriptor;
}
/**
* The engine's executor registry: at most one provider per non-inprocess
* tag. A tool whose `executor` tag is absent here fails typed at spawn
* time, before any provider or model call.
*/
type ExecutorRegistry = Partial<Record<IsolatedExecutorTag, ToolExecutorProvider>>;
//#endregion
//#region src/l0/spi/provider.d.ts
/**
* Live-only hooks the engine passes to a stream dispatch (RV1013).
* Never journaled, never part of request identity: like transport
* retries, they exist only on the live wire path.
*/
interface StreamHooks {
  /**
  * Called BEFORE each provider-side continuation wire beyond the
  * first (a `pause_turn` absorption makes several wire requests
  * inside one dispatch): under the engine's opt-in hard mode
  * (`quota.reserveContinuations`) the engine reserves the segment in
  * the configured limiter before its egress. A resolved `undefined`
  * admits the wire; a resolved WireError DENIES it, and the adapter
  * must yield exactly that error as its terminal event and stop, so
  * the wire never leaves. `segment` is the ordinal of the wire about
  * to be sent (2 for the first continuation). A multi-wire adapter
  * that never calls the hook keeps the documented post-hoc
  * settlement semantics.
  */
  onContinuationSegment?: (info: {
    segment: number;
  }) => Promise<WireError | undefined>;
}
/**
* One long-context price tier. When the full prompt (canonical
* inputTokens, cache included) is strictly above `aboveInputTokens`, the
* ENTIRE request is re-priced with these multipliers, not only the tokens
* past the threshold (how providers state their long-context rules).
* `inputMultiplier` scales every input-side rate: input, cache read, and
* cache write.
* `outputMultiplier` scales the output rate. Provider pricing pages state
* multipliers for "input" without saying whether cache rates scale;
* scaling them with input is the conservative reading for budget
* enforcement (it never underestimates spend). With several tiers, the
* highest threshold below the prompt size wins, independent of array
* order.
*/
interface PricingTier {
  aboveInputTokens: number;
  inputMultiplier: number;
  outputMultiplier: number;
}
/**
* Per-model pricing in USD per million tokens. The registry's
* versioned price table wins over adapter-
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
  /** Long-context tiers; a row without them is one linear price. */
  tiers?: PricingTier[];
  /**
  * ISO date (YYYY-MM-DD) of the last verification of this row against
  * the provider's documented rates or its billing categories (RV814).
  * A recorded verification event, never a guess: seed rows exist to
  * bound ceilings conservatively, actual billing truth is established
  * only by statement reconciliation over saved exports, and a
  * confirmed divergence corrects the row in its own release with a
  * changeset, never by a silent rewrite. Preflight stamps it on the
  * spawn report and the invoice text names it with its age, so the
  * consumer of a dollar figure can see how stale the rates behind it
  * are; the settle pin carries it with the rest of the row.
  */
  ratesVerifiedAt?: string;
}
/** Capability facts the router consumes for tier selection and scrubbing. */
type ModelCaps = {
  structuredOutput: "native" | "forced-tool" | "prompt";
  supportsTemperature: boolean;
  supportsParallelTools: boolean; /** Canonical efforts this model accepts after mapping. */
  reasoningEfforts: Effort[];
  contextWindow: number;
  maxOutputTokens: number;
  /**
  * The smallest request output cap the provider accepts (the v1.74
  * experiment review, P0.1): OpenAI's Responses API rejects
  * max_output_tokens below 16, so a dispatch under this floor is a
  * guaranteed 400. The runtime never sends a request output cap below
  * it: a budget last gasp dispatches the floor instead of one token,
  * and a remainder that cannot buy the floor is refused typed before
  * the wire. Absent means one, the historical floor.
  */
  minOutputTokensPerTurn?: number;
  /**
  * How this model's prompt caching is driven (RV2006). 'explicit'
  * means the adapter compiles ChatRequest.cacheHint into provider
  * cache directives (Anthropic cache_control) and the agent loop's
  * cache policy attaches hints by default; 'implicit' means the
  * provider caches server-side on its own and hints are neither
  * needed nor sent (OpenAI). Absent means unknown: the loop attaches
  * nothing and the wire stays byte identical to pre-RV2006 traffic.
  */
  promptCaching?: "explicit" | "implicit"; /** Adapter-reported fallback only; the versioned price table wins. */
  pricing?: Pricing;
};
interface ProviderAdapter {
  /** Stable adapter id; the left segment of ModelRef. */
  id: string;
  /**
  * Provider family for provider-raw matching and retention (committed
  * during M4-T02). Two adapters of the same
  * family share retained blocks and projections; default = id.
  */
  provider?: string;
  /**
  * The account identity of this adapter within its provider family
  * (RV4007): two adapters of one family serving different provider
  * accounts declare different scopeKeys, and the retention transport
  * then keys provider-raw blocks by (family, scopeKey) instead of
  * family alone, so cache handles and thinking blocks minted under
  * one account never ride a request served by another. Undeclared
  * keeps the family-wide sharing byte for byte. Attribution and
  * projection identity only: routing, pricing, and quota keys are
  * untouched.
  */
  scopeKey?: string;
  /**
  * Declares WHICH reading of the provider's usage telemetry this
  * adapter normalizes under; the engine stamps it on usage-bearing
  * terminal entries so a journal records not only the numbers but the
  * semantics they were produced under (v1.20.0 review P1/P2-2). Bump
  * the string whenever the MEANING of a reported Usage field changes,
  * even when no pricing rate moves; a rate change is a PriceTable
  * pricingVersion bump instead. Entries persisted before this shipped
  * carry no stamp, which is itself information: an unstamped OpenAI
  * entry with cache writes may predate the v1.20.0 cache-subset
  * correction. Optional; adapters that never changed semantics can
  * omit it.
  */
  usageSemantics?: string;
  caps(model: string): ModelCaps;
  /** Refresh the capability table from live model lists. */
  refreshCaps?(): Promise<void>;
  stream(req: ChatRequest, signal?: AbortSignal, hooks?: StreamHooks): AsyncIterable<ChatEvent>;
  /**
  * Provider-side token count for the request, used to tighten the
  * admission reserve before a spawn dispatches. The request carries
  * the FULL prompt, so an implementation that goes over the network is
  * egress exactly like stream and MUST honor `opts.signal` (RV904):
  * the engine only calls this after a zero-egress admission
  * feasibility check, passes the spawn's abort signal, and treats an
  * abort as cancellation rather than falling back to the flat
  * reserve. Hosts that must not send prompts before their own
  * admission gates pass an explicit `estCost` instead, which skips
  * this call entirely.
  */
  countTokens?(req: ChatRequest, opts?: {
    signal?: AbortSignal;
  }): Promise<number>;
  /**
  * The construction-side posture attestation (RV4101): a PURE
  * snapshot of the risk postures this adapter chose at construction
  * (no wire, no side effects), read by `compileRegulatedProfile` to
  * refuse a loosened posture and hash a tightened one. Optional: an
  * adapter without it counts into the profile's `unrecognized` tally
  * instead of being implied verified.
  */
  describeRegulatedPosture?(): RegulatedPostureDescriptor;
}
//#endregion
//#region src/l0/spi/knowledge.d.ts
/**
* Task-class vocabulary aligned with the role quality floors vocabulary
* (https://docs.rulvar.com/guide/model-routing). Scopeless global statements
* are inexpressible: every claim binds a taskClass.
*/
type TaskClass = "code-edit" | "investigation" | "synthesis" | "extraction" | "planning" | "judging" | (string & {});
type ClaimClass = "eval-measured" | "human-editorial";
type ClaimStatus = "active" | "stale" | "superseded" | "archived";
/** entryRef is the journal entry seq (canonical EntryRef; XF ruling). */
type EvidenceRef = {
  kind: "journal";
  runId: string;
  entryRef: number;
} | {
  kind: "eval";
  reportId: string;
  caseIds: string[];
};
interface ModelClaim {
  /** ULID. */
  id: string;
  /** effort is part of identity, as in the canonical modelSpec. */
  subject: {
    model: ModelRef;
    effort?: Effort;
  };
  taskClass: TaskClass;
  polarity: "strength" | "weakness";
  /** <=200 chars; proposal-born claims use a typed template, never a quote from tool output. */
  statement: string;
  /** eval-measured is committable only through the eval-committer identity (M11). */
  class: ClaimClass;
  status: ClaimStatus;
  /** Mandatory, >=1. */
  evidence: EvidenceRef[];
  /** Writable ONLY by the eval-committer identity (schema-enforced from M11). */
  metrics?: {
    passRate: number;
    n: number;
    graderId: string;
    cost?: number;
    baseline?: {
      model: ModelRef;
      passRate: number;
    };
  };
  confidence: "high" | "medium" | "low";
  /** ISO date. */
  observedAt: string;
  /** TTL by class and polarity (the grounding and decay rules). */
  expiresAt: string;
  /** Honestly best-effort drift signal. */
  modelEpoch?: {
    registryVersion?: string;
    pricingVersion?: string;
    capsHash?: string;
    canaryFingerprint?: string;
  };
  author: {
    kind: "eval-pipeline" | "human";
    id: string;
  };
  /** Orchestrator proposal provenance (phase 3). */
  origin?: {
    kind: "kb-proposal";
    runId: string;
    entryRef: number;
  };
  /** Append-only: an edit is a new claim plus supersede. */
  supersedes?: string;
}
interface KnowledgeSnapshot {
  /** Monotonic; the CAS token of commit. */
  version: number;
  /** Deterministic content hash of the claims array. */
  hash: string;
  claims: ModelClaim[];
}
/**
* The write gate. The human variant carries the MANDATORY attribution
* attestation (ruledOut over the checklist prompt, tools, difficulty,
* transient-provider; recommended contrast evidence): rubber-stamping
* "evidence exists" is constructively impossible. The eval-confirmed
* variant is reserved for v2, outside the committed roadmap.
*/
type GateRecord = {
  kind: "human";
  approver: string;
  at: string;
  attribution: {
    ruledOut: Array<"prompt" | "tools" | "difficulty" | "transient-provider">;
    contrastEvidence?: EvidenceRef;
  };
} | {
  kind: "eval-committer";
  committerId: string;
  reportId: string;
} | {
  kind: "eval-confirmed";
  reportId: string;
  n: number;
  passRate: number;
};
type ClaimOp = {
  op: "add";
  claim: ModelClaim;
  gate: GateRecord;
} | {
  op: "supersede";
  claimId: string;
  by: ModelClaim;
  gate: GateRecord;
} | {
  op: "archive";
  claimId: string;
  reason: "deprecated" | "stale" | "rejected" | "falsified";
} | {
  op: "mark_stale";
  claimId: string;
  reason: "canary-drift";
};
/**
* The SPI seam. commit performs CAS on
* the monotonic snapshot version, mirroring the fencing-epoch
* discipline of LeasableStore; concurrent maintenance commits serialize
* through CAS rejection and rebase. commit is UNREACHABLE from the
* runtime: runs hold ModelKnowledgeHandle.
*/
interface ModelKnowledgeStore {
  current(): Promise<KnowledgeSnapshot>;
  commit(ops: ClaimOp[], expectedVersion: number): Promise<number>;
}
/**
* The runtime handle: with propose() deleted from the design and
* commit absent from this shape, a run has no write path into the
* cross-run medium at all.
*/
type ModelKnowledgeHandle = Pick<ModelKnowledgeStore, "current">;
/** The closed trigger vocabulary of kb_propose (phase 3). */
type KbProposalTrigger = "error" | "limit" | "schema-exhausted" | "verify-failed" | "no-progress" | "escalation";
/**
* One orchestrator model-knowledge proposal (phase 3). A proposal is a
* run-ledger record, NOT a claim: it lives ONLY in the RunLedger
* section modelObservations, is never rendered into any prompt of any
* run before the human gate (absolute quarantine, the note included),
* and reaches the gate exclusively through LedgerExport. The engine
* assembles it from the tier-relative kb_propose payload: the subject
* model is resolved by the engine from the referenced lineage's
* declared ladder, never named by the orchestrator; evidence must
* resolve into the proposing run's own decision entries.
*/
interface KbProposal {
  subject: {
    model: ModelRef;
    effort?: Effort;
  };
  taskClass: TaskClass;
  polarity: "strength" | "weakness";
  trigger: KbProposalTrigger;
  evidence: Array<{
    kind: "journal";
    runId: string;
    entryRef: number;
  }>;
  /** <=200 chars; not rendered into any prompt before the gate. */
  note?: string;
}
//#endregion
//#region src/journal/lineage.d.ts
/** Logical-task identity across rebirths (DEF-3); engine-minted ULID. */
type LogicalTaskId = string;
/** The closed relation vocabulary of the minting and inheritance table. */
type LineageRelation = "first" | "respawn" | "rung-retry" | "decompose-child" | "unpark-restart";
/** approachSig/approachSigCoarse derivation version. */
declare const LINEAGE_SIG_VERSION: 1;
/** Deterministic LTIDs canonized onto legacy journals. */
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
* LineageRef plus the normalized tag (the request part
* holds the RAW proposal; the value part holds what was COMPUTED and is
* reused byte-exact on replay).
*/
interface SpawnLineage extends LineageRef {
  approachTag: string;
}
/** Attempt outcome classes entering LineageStats. */
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
* Approach-tag normalization: NFC, lowercase, runs of
* non-alphanumerics collapse into a hyphen, truncate to 32 characters; an
* empty value canonicalizes to 'default'. Prompt prose never enters any
* signature: rephrasings collide by construction, not by heuristic.
*/
declare function normalizeApproachTag(raw?: string): string;
/** The isolation string entering approachSigCoarse. */
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
* guard, which keys ACROSS LTID boundaries.
*/
declare function approachSigCoarse(inputs: ApproachSignatureInputs): string;
/** approachSig = sha256(JCS({ sigVersion, coarse, approachTag })); keys lessons. */
declare function approachSigOf(coarse: string, tag?: string): string;
/**
* The deterministic signature inputs assigned to legacy spawns (journals
* written before lineage existed) and to attempts whose producers did not
* record signature inputs: stable constants, never wall-clock, so replay
* canonizes identically on every engine.
*/
declare const LEGACY_SIGNATURE_INPUTS: ApproachSignatureInputs;
/** Classifies one settled root terminal into its attempt outcome class. */
declare function classifyAttemptOutcome(terminal: JournalEntry): AttemptOutcomeClass;
/**
* The incremental lineage fold: attempts, escalation debits, stall
* streaks, single-live-attempt, and legacy canonization, computed from
* journal entries only. `absorb` is idempotent by seq cursor; every read
* accepts an optional `uptoSeq` pin so renders stay snapshot-stable.
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
  * (random ULIDs on replay are forbidden).
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
  * a competing admit gets `lineage_busy`.
  */
  hasLiveAttempt(logicalTaskId: LogicalTaskId): boolean;
  /** The stall streak (pinnable to a snapshot seq). */
  stallStreak(logicalTaskId: LogicalTaskId, uptoSeq?: number): number;
  /** The pinned LineageStats render. */
  statsOf(logicalTaskId: LogicalTaskId, uptoSeq?: number): LineageStats;
  /** Every LTID the fold has seen (diagnostics and renders). */
  knownLogicalTaskIds(): LogicalTaskId[];
}
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
* and this returns undefined. The kind travels in WireError.data.kind;
* anything retryable without a specific kind is transport.
*/
declare function retryClassOf(error: WireError): RetryClass | undefined;
/**
* Validates a RetryPolicy and throws a typed ConfigError naming the
* offending field before any provider, journal, or store side effect
* can happen under it (v1.29.0 review P2). The engine calls this
* eagerly in createEngine for `defaults.retry` and every profile
* retry, and again after the call > profile > engine precedence merge
* of each agent call, so an invalid policy can never dispatch an
* adapter. The contract:
*
* - `attempts` is a positive safe integer (total tries, the initial
*   attempt included; the engine always makes the first try, so a
*   zero-attempts policy has no meaning and is rejected).
* - `backoff.initialMs` and `backoff.maxMs` are integers between 0 and
*   2147483647 ms (the Node timer maximum). `maxMs` below `initialMs`
*   is allowed: `maxMs` is a ceiling applied through `Math.min`, so
*   the pair stays well defined.
* - `backoff.factor` is a finite number above zero. A factor below 1
*   is allowed and yields a decaying backoff.
* - `backoff.jitter`, when given, is a boolean.
* - `retryOn`, when given, is an array of unique values drawn from
*   'transport' | 'rate-limit' | 'overloaded'. An empty array is
*   allowed and disables retries.
*
* `source` names where the policy came from (an engine default, a
* profile, or the call option) so the error points at the exact
* config path.
*/
declare function validateRetryPolicy(policy: RetryPolicy, source?: string): void;
/**
* The delay before retry number `retryIndex` (zero based: the delay
* after the first failed attempt has index 0). A VALID provider
* supplied retryAfterMs (finite and nonnegative) REPLACES the
* computed delay (Appendix A); anything else (NaN, Infinity, a
* negative) is ignored as adapter noise and the policy backoff
* applies, so this boundary stays defensive against custom adapters
* (v1.28.0 review P2). Jitter is equal jitter: half the backoff is
* deterministic, half random, so a jittered delay never collapses to
* zero. The result is always a finite nonnegative integer clamped to
* the Node timer maximum (2147483647 ms).
*/
declare function retryDelayMs(policy: RetryPolicy, retryIndex: number, retryAfterMs?: number, random?: () => number): number;
//#endregion
//#region src/model/failover.d.ts
/** Transport-level failover triggers; budget is explicitly excluded. */
type FailoverTrigger = "transport" | "rate-limit";
/** One resolved failover target (rich form). */
interface FailoverTarget {
  model: ModelRef;
  /** Triggers this target serves; absent = both. */
  on?: FailoverTrigger[];
}
/** Normalizes the author-facing ModelChoice.fallbacks list. */
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
/** The degenerate fallback triggers. */
type FallbackTrigger = "error" | "limit" | "schema-exhausted";
/** The degenerate fallback field: one agent-level second attempt. */
interface FallbackField {
  model: ModelRef;
  on: FallbackTrigger[];
}
/**
* Classifies a terminal agent outcome for the degenerate fallback:
* schema-mismatch errors are
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
  * run unlimited (no queueing, no overhead). An aborted `signal` frees
  * a queued caller without a slot (the Semaphore contract), so run
  * cancellation drains provider queues too (v1.34.0 review P2-4).
  */
  withSlot<T>(key: string, fn: () => Promise<T>, onQueued?: () => void, signal?: AbortSignal): Promise<T>;
}
//#endregion
//#region src/l0/spi/quota.d.ts
/**
* The pre-dispatch estimate a reservation is admitted under. Token
* estimates are heuristic (the engine uses its deterministic
* four-characters-per-token prompt estimate plus the request's output
* cap when one is set); reconcile() settles the difference against
* actual usage inside the same accounting window.
*/
interface QuotaEstimate {
  /** Wire calls this reservation admits; the engine always sends 1. */
  requests: number;
  /** Heuristic prompt estimate for the attempt. */
  inputTokens: number;
  /** The request's output token cap, when one is set. */
  maxOutputTokens?: number;
}
/** One admission request, dimensioned for tenant/model/provider rules. */
interface QuotaReservationRequest {
  /**
  * The adapter id (the left segment of ModelRef), matching the keys
  * of `concurrency.perProvider`.
  */
  provider: string;
  /** The serving model, re-reserved per failover target. */
  model: string;
  /**
  * The tenant of the reservation: the engine's configured tenant, or
  * the run scope's under `quota.tenantFrom: 'scope'` (RV4205);
  * absent when neither names one.
  */
  tenant?: string;
  /**
  * The run's execution scope dimensions (RV4205), stamped by the ctx
  * completion so dimension-pinned QuotaRules can match them; absent
  * on unscoped runs, byte identical to before the field.
  */
  scope?: {
    tenant?: string;
    account?: string;
    project?: string;
    legalDomain?: string;
    region?: string;
    providerAccount?: string;
    sponsor?: string;
  };
  /** The run paying for the attempt; observability only. */
  runId?: string;
  estimate: QuotaEstimate;
}
/**
* The admission verdict. `retryAfterMs` on a denial is the
* provider-shaped hint the retry engine honors verbatim: the time
* until the limiter expects capacity (0 = retry immediately, e.g. a
* request whose estimate can never fit its cap, so exhaustion and
* failover happen without waiting; absent = the caller's backoff
* policy applies).
*/
type QuotaDecision = {
  granted: true;
  reservationId: string;
} | {
  granted: false;
  retryAfterMs?: number;
  reason?: string;
};
/** The shared rate/quota limiter seam; see the module contract above. */
interface QuotaLimiter {
  reserve(request: QuotaReservationRequest): Promise<QuotaDecision>;
  /**
  * Settles a reservation against the attempt's actual usage. The
  * optional `actual.requests` is the TRUE number of wire requests the
  * reservation ended up covering (RV905: an adapter absorbing
  * provider-side continuations makes several wire calls inside one
  * reserved dispatch); implementations add the difference over the
  * single request the reservation admitted into the same window, so
  * the request cap reflects what the provider actually metered. A
  * settlement never denies retroactively: the wire calls already
  * happened. Implementations written against the two-argument form
  * remain valid; they merely keep the historical undercount.
  */
  reconcile(reservationId: string, usage: Usage, actual?: {
    requests?: number;
  }): Promise<void>;
  /**
  * Cancels an UNUSED admission (RV1013): the reserved wire never
  * left, so the admitted request and its token estimate return to
  * the window. This is NOT reconcile: a settlement only ever adds
  * (the calls already happened), while a release gives back exactly
  * what admission consumed for a wire that was never sent (the
  * engine calls it for pre-wire continuation reservations whose
  * segment never flew). MUST be idempotent and tolerate unknown or
  * expired ids as no-ops, like reconcile; a released id settles
  * nothing afterwards. Optional: implementations without it keep the
  * conservative window age-out for unused admissions.
  */
  release?(reservationId: string): Promise<void>;
}
//#endregion
//#region src/l0/validate-numbers.d.ts
/**
* The Node timer ceiling: setTimeout clamps any longer delay to 1 ms, so
* a naive far-future timer fires immediately (v1.34.0 review P2-2).
* Relative timer options are validated against this bound; absolute
* deadlines use the sliced timer in long-timer.ts instead.
*/
declare const MAX_TIMER_DELAY_MS = 2147483647;
//#endregion
//#region src/model/quota.d.ts
/** The fixed accounting window every PerMinute cap counts over. */
declare const QUOTA_WINDOW_MS = 6e4;
/**
* One shared-quota rule. The dimension fields select which requests
* the rule governs (an absent dimension matches every value); EVERY
* matching rule must admit a request, and a grant consumes capacity
* from each of them. The counters are rule-scoped: one rule matching
* two models pools them under one cap; write one rule per model for
* per-model buckets.
*
* Window semantics, named as the deliberate compromise it is (RV708):
* every PerMinute cap counts over FIXED epoch-aligned 60 s windows
* ({@link QUOTA_WINDOW_MS}), not a sliding minute. Each fixed window
* enforces its cap exactly, and a burst placed astride a boundary can
* therefore consume up to TWO caps inside one sliding 60 s; that
* bounded burst is the price of cross-process parity (every reference
* limiter in every process computes the same window from the same
* clock with no shared sliding state), and provider-side minute
* windows are themselves fuzzy. Size caps with the boundary burst in
* mind; the semantics are pinned as intended, not scheduled to change.
*/
interface QuotaRule {
  /** Adapter id, as in `concurrency.perProvider` keys. */
  provider?: string;
  model?: string;
  tenant?: string;
  /**
  * Scope-dimension pins (RV4205): a rule naming any of these matches
  * only reservations whose run scope carries the same value, so a
  * host caps by billing account, project, legal domain, region, or
  * provider account without a limiter fork. A reservation with no
  * scope (an unscoped run) matches none of them, exactly the tenant
  * rule's semantics.
  */
  account?: string;
  project?: string;
  legalDomain?: string;
  region?: string;
  providerAccount?: string;
  /** The sponsoring principal (RV4408), the newest scope dimension. */
  sponsor?: string;
  /** Wire attempts admitted per window; the exact, hard cap. */
  requestsPerMinute?: number;
  /**
  * Input plus output tokens admitted per window: estimated at
  * admission, reconciled to actual usage.
  */
  tokensPerMinute?: number;
}
/**
* Validates a quota rule set as a typed ConfigError before any
* limiter can admit under it: a non-array or empty set, a rule
* without a cap, a malformed dimension, or a malformed cap all fail
* loud at construction. Shared by every reference implementation.
*/
declare function validateQuotaRules(rules: readonly QuotaRule[], site?: string): void;
/**
* The canonical content key of one rule (RV608, promoted from the
* store limiters): a fixed-field-order JSON of the rule, identical
* across processes and hosts for identical rules. It is the bucket key
* of both store references, the input of
* `quotaRulesFingerprint`, and the CANONICAL ORDER every reference
* limiter folds denials in, so equal rule sets produce byte-identical
* refusal objects regardless of array permutation.
*/
declare function quotaRuleKey(rule: QuotaRule): string;
/**
* Validates a rule set and returns the immutable snapshot every
* reference limiter admits under (RV608): a fresh array of fresh
* objects carrying ONLY the known rule fields, each frozen, the array
* frozen. The caller's array and objects stay untouched and unshared,
* so ordinary JavaScript after the constructor (a pushed rule, a
* reassigned cap) can no longer change a decision, a bucket key, or a
* recorded fingerprint.
*
* A set containing two rules with the same canonical content key is
* refused typed (RV704): the memory reference buckets by rule INDEX
* (each copy counts independently, the full cap admits) while the
* store references bucket by rule KEY (one shared bucket is debited
* once per matching copy, half the cap admits), so the same duplicated
* configuration admitted differently per storage. Refusing it at the
* shared construction chokepoint is what keeps equal configurations
* equal on every storage.
*/
declare function snapshotQuotaRules(rules: readonly QuotaRule[], site?: string): readonly QuotaRule[];
/** True when every dimension the rule pins matches the request. */
declare function quotaRuleMatches(rule: QuotaRule, request: QuotaReservationRequest): boolean;
/** The tokens a reservation is admitted under: input estimate plus the output cap. */
declare function quotaEstimateTokens(request: QuotaReservationRequest): number;
/** The tokens a settled attempt actually consumed. */
declare function quotaActualTokens(usage: Usage): number;
/**
* The request-count settlement delta of one reservation (RV905): the
* reservation admitted ONE wire request, and `actual.requests` names
* how many the attempt actually made (an adapter absorbing
* provider-side continuations dispatches several inside one reserved
* call). Non-integer, non-positive, or absent actuals settle as the
* single reserved request (delta 0); a settlement only ever ADDS, the
* calls already happened. Shared by every reference limiter so the
* three implementations cannot disagree about the arithmetic.
*/
declare function quotaActualRequestsDelta(actual?: {
  requests?: number;
}): number;
/** Current-window counters of one rule bucket. */
interface QuotaCounters {
  requests: number;
  tokens: number;
}
/**
* One rule's admission verdict against its current-window counters,
* the pure decision both reference implementations share. A denial
* carries the window remainder as retryAfterMs, except when the
* estimate alone can never fit the token cap: that denial says
* retryAfterMs 0 (retry immediately), so the caller's bounded
* attempts exhaust without waiting and failover gets its chance.
*/
declare function quotaRuleAdmission(rule: QuotaRule, counters: QuotaCounters, estimate: QuotaCounters, msUntilWindowEnd: number): {
  admit: true;
} | {
  admit: false;
  retryAfterMs: number;
  reason: string;
};
/**
* Folds one more failing rule into the decision the caller returns:
* the wait is the LONGEST failing horizon (every matching rule must
* admit), and the FIRST failing rule names the denial.
*/
declare function mergeQuotaDenial(current: {
  retryAfterMs: number;
  reason: string;
} | undefined, next: {
  retryAfterMs: number;
  reason: string;
}): {
  retryAfterMs: number;
  reason: string;
};
/** One rule's live counters, exposed by `snapshot()` for telemetry. */
interface QuotaWindowSnapshot {
  rule: QuotaRule;
  windowStart: number;
  requests: number;
  tokens: number;
}
/** The in-process reference QuotaLimiter returned by memoryQuotaLimiter. */
interface MemoryQuotaLimiter extends QuotaLimiter {
  /** Current-window counters per rule; rolled-over windows read as zero. */
  snapshot(): QuotaWindowSnapshot[];
  /** The reference limiter always implements release (RV1013). */
  release(reservationId: string): Promise<void>;
}
/**
* The in-process reference QuotaLimiter: fixed epoch-aligned
* one-minute windows over the shared rule model. Coordinates every
* engine that shares THIS instance inside one process; processes
* coordinate through a shared-storage implementation of the same SPI
* (SqliteQuotaLimiter in @rulvar/store-sqlite) instead.
*/
declare function memoryQuotaLimiter(rules: readonly QuotaRule[], options?: {
  now?: () => number;
}): MemoryQuotaLimiter;
/** createEngine quota config: the limiter plus its engine-scoped knobs. */
interface EngineQuotaConfig {
  limiter: QuotaLimiter;
  /** Stamped on every reservation of this engine's runs. */
  tenant?: string;
  /**
  * Where the reservation tenant comes from (RV4205). 'engine' (the
  * default, historical bytes): the `tenant` above. 'scope': the
  * RUN's recorded ExecutionScope.tenant, so one engine serving many
  * tenants debits each run's reservations to the tenant the run
  * declared; a run whose scope names no tenant reserves tenant-less,
  * exactly like an engine that set none.
  */
  tenantFrom?: "engine" | "scope";
  /**
  * What a limiter infrastructure FAILURE (reserve throwing) means:
  * 'deny' (default, fail closed) converts it into a retryable
  * transport-class denial; 'allow' logs a warning and dispatches
  * without a reservation. A limiter DENIAL is unaffected by this
  * knob. reconcile failures only ever warn.
  */
  onLimiterError?: "deny" | "allow";
  /**
  * The opt-in hard mode for provider-side continuations (RV1013).
  * Default off: a dispatch reserves ONE request and a multi-wire
  * absorption (`pause_turn`) settles its true wire count post-hoc,
  * which is accounting, not admission: the continuations already
  * left. With `reserveContinuations: true` the engine reserves each
  * continuation in the limiter BEFORE its egress through the
  * adapter-side StreamHooks seam: under a hard provider RPM cap the
  * over-cap wire never leaves (the denial rides the provider-429
  * machinery), a granted admission whose wire never left is released
  * back to the window where the limiter implements `release`, and
  * the post-hoc settlement stops re-adding individually admitted
  * segments so the window is never double-counted. Adapters unaware
  * of the hook keep the post-hoc semantics exactly.
  */
  reserveContinuations?: boolean;
  /**
  * The denial retry budget (RV1601): how many pre-wire quota denials
  * one dispatch tolerates per serving target before the denial takes
  * the exhaustion path (failover when the chain names a rate-limit
  * trigger, else the typed rate-limit terminal). Denials stopped
  * consuming `RetryPolicy.attempts` in RV1601: that budget counts
  * DISPATCHED tries only, so a busy window can no longer exhaust the
  * transport budget before the wire ever opens (the eighteenth
  * comparison benchmark measured 21 denials riding the transport
  * namespaces). Each denied turn still waits the limiter's own
  * `retryAfterMs` first. Default {@link DEFAULT_MAX_QUOTA_DENIALS}.
  */
  maxDenials?: number;
  /**
  * The drift telemetry opt-in (the v1.71 experiment review, P0.5
  * resized): the SAME rule declaration `preflightEstimate` takes as
  * `quotaRules`, mirrored here so the engine can hold it against what
  * providers actually REPORT. When a live 429 carries
  * provider-normalized limits (the openai and anthropic adapters
  * parse the x-ratelimit headers into
  * `WireError.data.reportedLimits`) and a declared per-minute cap
  * EXCEEDS the reported one, the run journals a `quota_drift`
  * decision (provider, model, tenant, dimension, declared, reported;
  * one per invocation and dimension) and emits a warn log, because a
  * limiter configured above the provider's real ceiling
  * under-throttles and live denials follow: the experiment inflated
  * 12M TPM over a real 1M and paid seven live 429s with nothing
  * recording the mismatch. Purely observational: nothing clamps, the
  * limiter keeps enforcing the declaration (clamping is host policy).
  * Absent = byte identical journals and events.
  */
  declaredRules?: readonly QuotaRule[];
}
/**
* The default {@link EngineQuotaConfig.maxDenials}: generous next to the
* transport default of 3 tries because a denial is a WAIT, not a
* failure signal, yet finite because nothing else bounds the pre-wire
* loop (the per-agent timeout is checked between turns, not inside a
* dispatch).
*/
declare const DEFAULT_MAX_QUOTA_DENIALS = 8;
/** The resolved engine-side quota runtime threaded into every run. */
interface EngineQuotaRuntime {
  limiter: QuotaLimiter;
  tenant?: string;
  /** Where the reservation tenant comes from (RV4205); absent reads 'engine'. */
  tenantFrom?: "engine" | "scope";
  onLimiterError: "deny" | "allow";
  /** Pre-wire continuation admission (RV1013); see {@link EngineQuotaConfig}. */
  reserveContinuations: boolean;
  /** The per-target denial retry budget (RV1601); see {@link EngineQuotaConfig}. */
  maxDenials: number;
  /** The declared rule mirror for drift telemetry; see {@link EngineQuotaConfig}. */
  declaredRules?: readonly QuotaRule[];
}
/**
* Validates createEngine's quota config as a typed ConfigError before
* any run could dispatch under a malformed limiter (the intake
* discipline every engine option follows).
*/
declare function validateEngineQuotaConfig(config: EngineQuotaConfig | undefined, site?: string): void;
//#endregion
//#region src/model/floors.d.ts
/** An explicit allowlist and denylist; deny wins over allow. */
type ModelListConstraint = {
  allow?: ModelRef[];
  deny?: ModelRef[];
};
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
  /**
  * The same usage split by serving model, so a dangling redispatch
  * restores the per-model breakdown instead of collapsing every paid
  * turn onto the loop model. Absent on checkpoints written before the
  * split shipped: those restore the aggregate against the loop model,
  * exactly as they did then.
  */
  usageByModel?: UsageSlice[];
  /**
  * The per-dispatch reconciliation ledger so far (P1.3), carried at
  * every boundary so a kill-and-resume keeps pre-kill wire calls
  * attributable. Absent before the first call and on checkpoints
  * written before the ledger shipped: those restore none, and the
  * invoice fold surfaces the restored usage as an unattributed
  * remainder instead of losing it.
  */
  providerCalls?: ProviderCallRecord[];
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
* Decodes a checkpoint blob. Returns undefined for an empty blob, an
* unknown format byte, unparseable JSON, a top-level payload that is
* not an object (RV1008: `null`, a number, a string, an array), a
* parseable payload whose nested message structure is malformed
* (RV804), or one whose required counters are not non-negative finite
* numbers (RV1409: `turns`, `toolCallsUsed`, `schemaAttempts`, the
* usage fields, the compaction points): a resume never trusts a
* checkpoint it cannot decode, and it never throws; the dangling
* dispatch reruns from the top instead (at-least-once is the
* documented floor).
*/
declare function decodeCheckpoint(blob: Uint8Array): CheckpointState | undefined;
//#endregion
//#region src/model/router.d.ts
/**
* Per-engine adapter registry: strictly per engine, no global mutable
* registry exists. A duplicate adapterId is a typed ConfigError.
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
* Role effort defaults: orchestrate and plan default to high; summarize and extract
* default to low. loop and finalize have NO role default: when the chain
* resolves nothing, the wire omits effort and identity records the spec
* with the effort member absent.
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
  /** Identity-facing canonical form. */
  canonical: CanonicalModelSpec;
  scrubs: ScrubNote[];
}
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
* Canonicalizes a declared LadderSpec: validates the
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
* `{ kind: 'model' }` form.
*/
declare function ladderRungChoice(ladder: CanonicalLadderSpec, index: number): ModelChoice;
//#endregion
//#region src/runtime/escalation.d.ts
/** Closed in v1. */
type EscalationKind = "scope_bigger" | "scope_different" | "blocked_with_evidence";
/**
* Minimal TaskSpec stand-in: the full typed TaskSpec is owned by the
* PlanRunner surface and ships with M7; script
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
  /**
  * Applied by the timeout resolution (by: 'timeout'); REQUIRED for
  * flavor B since RV1506: the deadline's expiry applies it, and the
  * historical engine default of accept resolved an unattended scope
  * escalation fail open. Declare what a timeout means
  * ({ kind: 'cancel' } is the conservative posture); there is no
  * engine default anymore.
  */
  defaultDecision?: EscalationDecision;
  /**
  * In-run minimum spend before scope_bigger; default 0 (M3-T09). A
  * finite number >= 0, validated before any LLM call: the gate
  * compares spend against it, and a NaN would silently disable it.
  */
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
* The escalate tool's exact request schema. costToDate and salvage
* MUST NOT appear here: additionalProperties false rejects model-authored
* values for them at argument validation.
*/
declare const ESCALATION_REQUEST_SCHEMA: JsonSchema;
/** The full-report schema applied BEFORE append. */
declare const ESCALATION_REPORT_SCHEMA: JsonSchema;
/**
* The engine opt-in tool: registered through the
* same path as any tool under escalation opt-in of EITHER flavor (the
* worker's only authoring channel for a report), never available without
* opt-in, and dispatched through the same permission chain. The loop
* intercepts accepted calls; execute is unreachable by construction.
*/
declare function escalateTool(): ToolDef;
/** Validates the runtime-completed report BEFORE append; returns issues. */
declare function validateEscalationReport(report: EscalationReport): Promise<Issue$1[]>;
/**
* countsAgainstLimit derivation (XF-06): true iff
* scope_bigger; scope_different and blocked_with_evidence are exempt and
* never debit the escalation counter.
*/
declare function countsAgainstLimit(kind: EscalationKind): boolean;
//#endregion
//#region src/runtime/exploration.d.ts
/** The budget dimension a finalization window statement names (RV302; 'turns' since RV1405). */
type FinalizationWindowBudget = "tool calls" | "tool units" | "turns";
//#endregion
//#region src/runtime/no-progress.d.ts
/**
* The no-progress abort class (M3-T08): an engine-defined detector
* journaled as a first-class terminal abort distinct from user
* cancellation (a cancelled entry always reruns; a no-progress abort
* must replay, or every resume would re-pay the stuck turns). The
* interim heuristic is committed: N consecutive
* turns without tool calls or artifact deltas, N = 3; the broader
* heuristic stays OQ-15, revisited on dogfood traces.
*
* Encoding: the abort is the agent's
* terminal entry with status 'limit', an error payload carrying
* abortClass 'no-progress', and memoizeOutcome stamped by the ENGINE on
* the terminal entry, so the frozen memoize-limit rule replays it on
* every subsequent resume without a live rerun. In M3 the runtime has no
* per-turn artifact channel, so the tool-call test subsumes artifact
* deltas; per-turn artifact producers arrive with M4 compaction.
*/
/** The committed no-progress detector N. */
declare const DEFAULT_NO_PROGRESS_TURNS = 3;
/**
* The consumer-visible engine-decided abort classes (FR-424).
* 'no-progress' is the detector below; 'output-truncated' is a
* schema-less turn that ended at its output token allowance
* (finish reason 'max-tokens') without visible output (v1.9.0
* follow-up review); 'exploration' is the tripped no-new-evidence
* exploration guard (RV-210), carrying its structured summary in the
* terminal error payload. All stamp memoizeOutcome on the terminal:
* the work is paid, so every resume replays the abort instead of
* re-paying the same bounded failure.
*/
type AbortClass = "no-progress" | "output-truncated" | "exploration";
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
//#region src/tools/progress.d.ts
/** The stock progress tool name the engine scans terminals for. */
declare const PROGRESS_REPORT_TOOL_NAME = "report_progress";
/**
* One progress report: what the agent has established so far. Captured
* as {@link AgentResult.partial} (normalized: absent arrays become
* empty) when the invocation terminates with status 'limit'.
*/
interface ProgressReport {
  /** New facts established, each a standalone claim line. */
  facts: string[];
  /** Evidence references backing the facts (file:line or recorded ids). */
  evidence: string[];
  /** Remaining unresolved questions. */
  questions: string[];
  /** Optional short status note. */
  note?: string;
}
/**
* The stock progress-report tool. Stateless and deterministic: the
* result echoes the counts, so a verbatim repeated report is a
* duplicate result digest to the exploration guards. The value is the
* side contract: the engine captures the LAST successful call of this
* tool as the structured terminal partial of a 'limit' invocation, so
* an agent that reports after every batch never loses its collected
* work to a budget expiry.
*/
declare function progressReportTool(): ToolDef;
/**
* The deterministic terminal scan: pairs `report_progress` tool calls
* with their SUCCESSFUL results by id (a denied or failed call never
* counts, mirroring the exploration guard's restore) and normalizes the
* last one into a {@link ProgressReport}. Pure over the message window
* it is given: the live loop hands its own history, the replay path
* hands the terminal checkpoint's messages, and a compaction naturally
* narrows the window to what the model itself still sees.
*/
declare function latestProgressReport(messages: readonly Msg[]): ProgressReport | undefined;
//#endregion
//#region src/runtime/usage-limits.d.ts
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
  * The no-progress detector N (committed at 3):
  * consecutive turns without tool calls or artifact deltas before the
  * engine aborts with the dedicated class (M3-T08).
  */
  noProgressTurns?: number;
  /**
  * Soft 50%/80% thresholds over maxToolCalls (RV-210), surfaced to the
  * model as a plain user message carrying the exact remaining count.
  * Inert (with a loud log warning) when maxToolCalls is not set. Off by
  * default: the notice enters the conversation, so enabling it changes
  * recorded model requests.
  */
  toolBudgetNotices?: boolean;
  /**
  * How many times the SAME tool signature (name + canonical JCS args)
  * may execute per invocation (RV-210). The call that would exceed it
  * is denied with a typed error tool result instead of dispatched; the
  * denial is visible to the model and does not consume maxToolCalls.
  * Unlimited by default.
  */
  maxRepeatedToolSignature?: number;
  /**
  * How many consecutive successful tool executions may return only
  * already-seen result digests before the engine aborts the invocation
  * as status 'limit' with abortClass 'exploration' (RV-210). The
  * executed work is kept and the terminal memoizes. Unlimited by
  * default.
  */
  maxNoNewEvidenceCalls?: number;
  /**
  * Per-tool execution caps by tool NAME (RV-210 close-out): the call
  * that would exceed its tool's cap is denied with a typed error tool
  * result instead of dispatched (visible to the model, never terminal),
  * and the denial does not consume maxToolCalls or tool units. A cap of
  * 0 bans the tool for the invocation; names absent from the record are
  * unlimited. Per layer the whole record replaces (no per-key merge),
  * like every other UsageLimits field.
  */
  maxCallsPerTool?: Record<string, number>;
  /**
  * The weighted tool budget (RV-210 close-out): every EXECUTED call of
  * tool T costs `costs[T] ?? 1` units (a cost of 0 makes bookkeeping
  * tools free), and once the spent units reach `max` the invocation
  * terminates as status 'limit' exactly like maxToolCalls (paid partial
  * work; executed results stand). Denied calls cost nothing. On resume
  * the spent units rebuild from the restored transcript's successful
  * executions, the same conservative window the exploration guards use.
  */
  toolUnits?: {
    max: number;
    costs?: Record<string, number>;
  };
  /**
  * The mid-batch checkpoint boundary (RV408, the eighth-experiment
  * review): checkpoints normally write once per COMPLETED tool turn,
  * so a kill inside one large parallel batch re-pays every executed
  * call of that batch on resume; with the whole executed-call budget
  * fitting into a single batch (the `tool-cap-before-checkpoint`
  * preflight warning), the re-paid window is the entire budget. Set to
  * K to bound it: after every K EXECUTED calls within a batch the loop
  * durably writes the same pending state the ask suspension already
  * checkpoints (the executed prefix verbatim, the next call, the
  * remaining tail), so a resume reuses the prefix and re-runs at most
  * the calls since the last boundary. Denied and skipped calls do not
  * advance the cadence, and the batch tail writes no extra boundary
  * (the turn checkpoint follows immediately). Off by default: the
  * boundary writes extra transcript blobs, and enabling it changes no
  * journal bytes and no model requests, only the checkpoint cadence.
  */
  checkpointEveryToolCalls?: number;
  /**
  * The guaranteed finalization turn (the experiment-review P1.1): when
  * a TOOL budget limiter (maxToolCalls or toolUnits) expires, the
  * runtime closes the current batch's remaining calls with explicit
  * skipped-call error results instead of dropping them silently, then
  * grants the model exactly ONE summary turn with tools withheld
  * before the invocation settles as status 'limit' with the exact
  * limiter named in the terminal error. The summary text becomes the
  * limit result's output for schema-less calls; a ridden schema
  * validates into typed output when the summary parses (one attempt,
  * no re-prompt). `maxOutputTokens` bounds the summary turn only;
  * absent, the ordinary per-turn output policy applies. Off by
  * default: the skip results and the summary instruction enter the
  * conversation, so enabling it changes recorded model requests.
  */
  finalizationReserve?: {
    maxOutputTokens?: number;
  };
  /**
  * The adaptive tool budget (RV301, the seventh comparison experiment):
  * when maxToolCalls expires but the run still has money and the agent
  * still makes progress, the runtime grants `increment` more executed
  * calls instead of ending the invocation, up to `maxExtensions` grants.
  * A grant is admitted only when the remaining chain budget (the same
  * arithmetic the per-turn output clamp reads) is above zero, or above
  * `minHeadroomUsd` when declared, and, unless `requireNewEvidence` is
  * set to false, only when at least one novel tool result digest arrived
  * since the previous grant (the exploration guard's evidence chain).
  * Each grant is announced to the model as a plain user message with the
  * exact new counts, so pacing stays possible. Under the engine, each
  * grant also journals a decision entry the moment it fires (RV509), so
  * a resume restores granted-but-unspent extensions from the journal
  * (the conservative executed-call derivation remains the floor beneath
  * a lost journal tail) and a replayed result reports the grants.
  * Extends maxToolCalls only, never toolUnits. Off by default: the
  * grant notices enter the conversation, so enabling it changes
  * recorded model requests.
  */
  toolBudgetExtension?: {
    /** Executed calls added per grant. */increment: number; /** Hard bound on grants per invocation. */
    maxExtensions: number; /** Grant only at or above this remaining chain headroom, in USD. */
    minHeadroomUsd?: number; /** Default true: a grant needs new evidence since the last one. */
    requireNewEvidence?: boolean;
    /**
    * The evidence-deficit proactive trigger (RV809, the twelfth
    * comparison run: a limited child at 7 of 11 declared evidence
    * entries should convert remaining money into calls BEFORE the cap
    * forces a partial dump through the finalization machinery). With
    * this true AND an evidence contract declared on the invocation,
    * the extension also grants at a tool-turn boundary whenever the
    * remaining call budget cannot cover the declared floor's
    * outstanding deficit (recorded `record_evidence` entries short of
    * `minEntries`), under exactly the same admission gates as the
    * at-expiry grant: bounded by maxExtensions, money-gated by
    * minHeadroomUsd, and evidence-gated by requireNewEvidence. The
    * at-expiry site stays the backstop. Off by default: the earlier
    * grant notice changes recorded model requests.
    */
    coverEvidenceDeficit?: boolean;
  };
  /**
  * The finalization window (RV302, the seventh comparison experiment):
  * once the remaining tool budget (executed calls against the effective
  * maxToolCalls, or remaining weighted units against toolUnits.max,
  * whichever is closer) drops to `reserveCalls`, only finalization
  * tools may execute. A call outside the window's allowlist receives a
  * typed error tool result naming the window (visible to the model,
  * never terminal, consuming no budget), and the model is told ONCE,
  * via a plain user message, to record its evidence and finish. The
  * allowlist defaults to the tools priced at toolUnits cost 0 (the
  * free bookkeeping tools); the engine terminal tool is always
  * admitted regardless. With toolBudgetExtension configured, remaining
  * money converts into a grant BEFORE any window refusal, so the
  * window binds only when the extension is exhausted or denied. Under
  * the engine, the entry journals a decision entry the moment it fires
  * (RV509), so the summary's finalizationWindowEntered survives resume
  * and replay even when a later grant moved the counts back out of the
  * window. Off by default: the refusals and the notice enter the
  * conversation, so enabling it changes recorded model requests.
  */
  finalizationWindow?: {
    /** How many trailing executed calls (or units) the window reserves. */reserveCalls: number; /** Tool names allowed inside the window; default: zero-cost tools. */
    allow?: string[];
    /**
    * The evidence-aware reserve (RV1208, the sixteenth comparison
    * run: a worker spent 108 calls and still settled with 10 of 14
    * declared evidence entries, because the window reserved a FIXED
    * tail the deficit had long outgrown). With this true AND an
    * evidence contract declared on the invocation, the effective
    * reserve is the larger of `reserveCalls` and the outstanding
    * deficit plus one summary call, recomputed at every boundary from
    * the same successful-`record_evidence` window the floor refusal
    * reads. So searching stops while the floor is still closable, and
    * the reserve collapses back to `reserveCalls` as entries land.
    * The one-time notice names the live deficit. Off by default: an
    * earlier window entry changes recorded model requests.
    */
    reserveForEvidenceDeficit?: boolean;
  };
  /**
  * The turns-axis finalization reserve (RV1405, the seventeenth
  * comparison experiment: a worker burned maxTurns 28 at 66 of 96
  * executed tool calls and settled `limit` with no finalize phase,
  * because every finalization mechanism watched the tool budget). Once
  * the remaining turns against `maxTurns` drop to `reserveTurns`, the
  * SAME finalization-window regime engages on the turns dimension:
  * non-allowlisted calls receive the typed window refusal, the model
  * is told once to record its evidence and finish, and the terminal
  * tool stays admitted. The regime has one allowlist:
  * `finalizationWindow.allow` when declared, else `allow` here, else
  * the zero-cost tools. Unlike `finalizationReserve` this grants no
  * turn past the ceiling: the reserved tail lives INSIDE `maxTurns`,
  * so the ceiling stays a ceiling. Repair-turn grants are deliberately
  * not counted (they exist only for schema-dead terminal exchanges,
  * which already sit inside finalization), keeping the arithmetic
  * conservative. Off by default: the refusals and the notice enter
  * the conversation, so enabling it changes recorded model requests.
  */
  finalizationTurns?: {
    /** How many trailing turns of `maxTurns` the reserve keeps. */reserveTurns: number; /** Tool names allowed inside the reserve; `finalizationWindow.allow` outranks it. */
    allow?: string[];
  };
}
declare const DEFAULT_MAX_TURNS = 32;
declare const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 12e4;
interface EffectiveUsageLimits {
  maxTurns: number;
  maxToolCalls?: number;
  maxOutputTokensPerTurn?: number;
  timeoutMs?: number;
  streamIdleTimeoutMs: number;
  /** Default DEFAULT_NO_PROGRESS_TURNS. */
  noProgressTurns?: number;
  /** RV-210 exploration guards; absent = off. */
  toolBudgetNotices?: boolean;
  maxRepeatedToolSignature?: number;
  maxNoNewEvidenceCalls?: number;
  maxCallsPerTool?: Record<string, number>;
  toolUnits?: {
    max: number;
    costs?: Record<string, number>;
  };
  /** RV408 mid-batch checkpoint cadence; absent = per-turn only. */
  checkpointEveryToolCalls?: number;
  finalizationReserve?: {
    maxOutputTokens?: number;
  };
  toolBudgetExtension?: {
    increment: number;
    maxExtensions: number;
    minHeadroomUsd?: number;
    requireNewEvidence?: boolean; /** RV809: grant at the boundary when remaining calls cannot cover the evidence deficit. */
    coverEvidenceDeficit?: boolean;
  };
  finalizationWindow?: {
    reserveCalls: number;
    allow?: string[]; /** RV1208: widen the reserve to the outstanding evidence deficit plus the summary. */
    reserveForEvidenceDeficit?: boolean;
  };
  /** RV1405: the trailing turns of maxTurns reserved for the finalization regime. */
  finalizationTurns?: {
    reserveTurns: number;
    allow?: string[];
  };
}
/**
* Limits merge per spawn: AgentOpts.limits over profile limits over engine
* defaults.limits.
*/
declare function mergeUsageLimits(call?: UsageLimits, profile?: UsageLimits, engine?: UsageLimits): EffectiveUsageLimits;
/**
* Validates one UsageLimits layer at its intake boundary (v1.34.0
* review P2-3): a malformed field (NaN, Infinity, a negative, a
* fraction) is a typed ConfigError before the merge, before any journal
* entry, and before any provider dispatch. `site` names the layer in the
* error text (e.g. `RunOptions.limits`). Counts are positive integers
* (maxToolCalls may be 0: a spawn that must not call tools).
* streamIdleTimeoutMs is handed to setTimeout as-is, so it is bounded by
* the Node timer maximum like RetryPolicy delays; timeoutMs is a
* wall-clock comparison, so it has no upper bound. Every present field
* is checked; absent fields keep their defaults.
*/
declare function validateUsageLimits(limits: UsageLimits, site: string): void;
//#endregion
//#region src/runtime/agent-loop.d.ts
type AgentStatus = "ok" | "error" | "limit" | "cancelled" | "skipped" | "escalated";
/** Artifact: the normative shape of AgentResult.artifacts entries. */
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
/** The verdict of one mechanical acceptance gate evaluation. */
interface MechanicalGateVerdict {
  pass: boolean;
  detail?: string;
}
/**
* A mechanical acceptance gate: an engine-registered NAMED pure function
* over AgentResult.artifacts.
* The registry is per engine like every other registry; the
* ladder driver journals each evaluation as a decision entry, so the
* ladder fold consumes only journaled verdicts, never live re-evaluation.
*/
type MechanicalGateProfile = (artifacts: readonly Artifact[]) => MechanicalGateVerdict;
interface AgentResult<T> {
  status: AgentStatus;
  output: T | null;
  usage: Usage;
  costUsd: number;
  /**
  * The fold behind `costUsd` (RV702): 'per-call' when every usage
  * slice (restored included) is covered by per-request records priced
  * individually, exactly the settled fold's basis; 'aggregate-estimate'
  * when a restored checkpoint left usage no record backs, in which case
  * the aggregate-priced number is kept (never silently dropped) and
  * labeled.
  */
  costBasis: CostBasis;
  turns: number;
  /**
  * The model that actually served the loop phase at the end (M4-T04):
  * differs from the requested spec only under transport failover.
  */
  servedBy: ModelRef;
  /**
  * Present only when the call spanned MORE THAN ONE (invocation role,
  * serving model) pair (the loop, extract, finalize, and summarize
  * roles resolve independently): usage split per (role, model), so
  * `costUsd` and every cost bucket price each slice at its own rate
  * and `CostReport.byRole` attributes each phase to its own bucket
  * (v1.19.0 review P1-2). Absent for a single-phase single-model call,
  * which (usage, servedBy) already describes exactly.
  */
  usageByModel?: UsageSlice[];
  /**
  * The per-dispatch reconciliation ledger (P1.3): one record per live
  * provider call this invocation made, failed and retried attempts
  * included, each with its own usage and the provider's response id
  * when the adapter surfaced one. Journaled on the terminal entry and
  * restored verbatim on replay, so a live result and its replayed one
  * read the same ledger; `invoiceFromJournal` folds the same records
  * into the invoice export. Absent when the invocation made no wire
  * call (a fully replayed invocation).
  */
  providerCalls?: ProviderCallRecord[];
  transcriptRef: string;
  artifacts?: Artifact[];
  error?: AgentError;
  /**
  * Human-readable detail behind `error` (provider message, first schema
  * issue): feeds the journaled WireError message. An additive
  * field; never part of identity.
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
  /**
  * Transport retries across the span's phase activations, present only
  * when greater than zero. Counts retries of DISPATCHED attempts only
  * (RV1601): a pre-wire quota denial never increments it, so this
  * number can be read against the provider ledger without correction
  * (the eighteenth comparison benchmark exported 21 denials under this
  * name over an invoice with zero provider error rows). Live telemetry
  * only: the ctx layer surfaces it as `agent:end` retryCount; it is
  * never journaled, so a replayed result omits it (absent means "zero
  * or unknown").
  */
  transportRetries?: number;
  /**
  * Pre-wire quota-limiter denials, split by dimension, with the
  * recovered count (RV1510). A denial never reached the provider and
  * never billed; conflating it with transportRetries misread the
  * seventeenth comparison benchmark's telemetry. Live telemetry only,
  * exactly like transportRetries: never journaled, absent on a
  * replayed result, absent means "zero or unknown".
  */
  quotaDenials?: {
    total: number;
    requests: number;
    tokens: number;
    recovered: number;
  };
  /**
  * Provider-reported rate limits observed on this invocation's 429s
  * (the v1.71 experiment review, P0.5): one entry per (provider,
  * model), the latest observation winning, parsed by the adapters
  * into `WireError.data.reportedLimits`. Live telemetry only, exactly
  * like transportRetries: never journaled, absent on a replayed
  * result; the ctx layer holds it against `quota.declaredRules` and
  * journals the drift verdicts, which ARE durable.
  */
  rateLimitObservations?: RateLimitObservation[];
  /**
  * The exploration guard counters (RV-210): present whenever any of
  * the exploration limits (toolBudgetNotices, maxRepeatedToolSignature,
  * maxNoNewEvidenceCalls) was configured. Journaled inside the terminal
  * error payload (and restored on replay) only for the guard's own
  * abort (abortClass 'exploration'); otherwise live telemetry like
  * transportRetries.
  */
  exploration?: ExplorationSummary;
  /**
  * The tool budget pressure snapshot (RV304): present live whenever
  * maxToolCalls, toolUnits, or toolBudgetExtension is configured. Live
  * telemetry only, exactly like transportRetries: never journaled,
  * absent on a replayed result.
  */
  toolBudget?: ToolBudgetSummary;
  /**
  * The evidence verdict under a DECLARED evidence contract (RV806):
  * the window-derived count of successful `record_evidence` executions
  * (the same counting rule as the enforce-refuse floor), the declared
  * floor, and whether the count met it, stamped on EVERY terminal
  * status so the orchestrator's acceptance summary can report each
  * child's evidence as met, unmet, or waived by salvage. Absent
  * without a declared contract: those results stay byte-identical.
  * Live-window derived like `partial`: a checkpointless restore that
  * lost the window reports what the restored window shows.
  */
  evidence?: {
    recordedEntries: number;
    minEntries: number;
    met: boolean;
  };
  /**
  * The recorded evidence entry CONTENT (the RV1501 entries plumbing):
  * each successful `record_evidence` execution's claim plus its file
  * or file:lines citation, in record order, bounded at collection
  * (40 entries, 400 chars per claim). Present whenever the window
  * carries at least one successful execution, contract or not; the
  * ctx layer journals it on the terminal and replay restores it, so
  * the orchestrator's claim pools pair the draft against what the
  * child actually recorded on live and resumed runs alike.
  */
  evidenceEntries?: Array<{
    claim: string;
    citation?: string;
  }>;
  /**
  * The structured terminal partial (RV-210 close-out): the LAST
  * successful `report_progress` call of the invocation, present only on
  * a 'limit' terminal (cap expiry or an engine-decided abort) whose
  * transcript recorded at least one report. Derived deterministically
  * from the message window: live from the loop's own history (a final
  * boundary checkpoint is written so the window is durable), on replay
  * from the terminal checkpoint, so both read the same bytes. This is
  * what lets a caller salvage a limit child's collected work instead of
  * seeing a bare 'terminal status limit'.
  */
  partial?: ProgressReport;
  /**
  * Terminal-tool exchanges whose ARGUMENTS died at the schema gate
  * (the unparsed second chance included, when it did not recover): the
  * v1.74 experiment lost six finish payloads to exactly this class,
  * and nothing outside the transcript said so (host validation
  * rejections, by contrast, journal decision entries). Derived from
  * the message window like the repair-reserve grants, so live and
  * resumed segments count the same total; absent when zero.
  */
  schemaRejectedTerminalExchanges?: number;
  /**
  * Terminal-tool exchanges whose near-JSON ARGUMENTS the unparsed
  * second chance (v1.75.1) RECOVERED into a schema-valid call (the
  * sixth comparison experiment; the judge's P1.5): the recovery used
  * to leave only a warn log behind, invisible on the outcome. A live
  * process counter like transportRetries (pure telemetry: nothing
  * downstream feeds on it), so a resumed segment counts only its own
  * recoveries; absent when zero.
  */
  schemaRecoveredTerminalExchanges?: number;
  /**
  * The evidence floor refusal detail (RV507): present ONLY when an
  * enforced contract refused an otherwise-ok settle. The ctx layer
  * folds it into the journaled terminal error data and memoizes the
  * outcome (the refusal is deterministic from the paid transcript, so
  * a rerun would only re-pay the same bounded failure).
  */
  evidenceFloor?: {
    recordedEntries: number;
    minEntries: number;
  };
}
/** One 429's provider-normalized limits, per (provider, model). */
interface RateLimitObservation {
  provider: string;
  model: string;
  /**
  * Per-minute limits the provider REPORTED in its rate-limit
  * headers, normalized by the adapter: openai fills
  * requestsPerMinute and tokensPerMinute; anthropic fills
  * requestsPerMinute plus the split inputTokensPerMinute and
  * outputTokensPerMinute.
  */
  reportedLimits: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
    inputTokensPerMinute?: number;
    outputTokensPerMinute?: number;
  };
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
/** Budget hooks bound by the three-layer budget. */
interface BudgetHooks {
  /** Layer 2: before every turn; throws BudgetExhaustedError to block dispatch. */
  beforeTurn(): void;
  /**
  * Layer 2b, the pre-dispatch output bound: the output tokens the
  * remaining budget still affords from `servedBy` for a prompt of
  * `estimatedInputTokens`. The dispatch clamps the request's
  * maxOutputTokens to it and denies the turn entirely when not even one
  * output token fits. Undefined = unbounded (no ceiling, no price row,
  * or free output).
  */
  maxAffordableOutputTokens?: (servedBy: ModelRef, estimatedInputTokens: number) => number | undefined;
  /**
  * The remaining chain headroom in USD (RV301): the same arithmetic
  * the output bound above reads, before pricing. Undefined = no
  * ceiling anywhere on the chain. The tool budget extension admits a
  * grant against it.
  */
  remainingUsd?: () => number | undefined;
  /**
  * Layer 2b asked of the IN-FLIGHT EXPOSURE ceiling (RV2503), wired
  * only when the cap is configured: the output tokens the exposure
  * room still affords for this prompt. The dispatch clamps to it too,
  * so a turn whose full plan overshoots the exposure line is SHORTENED
  * rather than refused while the budget can still pay for it. An
  * answer below the serving model's output floor is ignored, so a
  * genuine exposure exhaustion still refuses through
  * `admitTurnExposure` with its own typed reason.
  */
  maxExposureOutputTokens?: (servedBy: ModelRef, estimatedInputTokens: number) => number | undefined;
  /**
  * The in-flight exposure admission (RV711), wired only when the cap
  * is configured. Called synchronously right before each provider
  * dispatch attempt with the attempt's own request estimate: the
  * serving model, the estimated prompt tokens, and the planned
  * worst-case output tokens (the request's effective maxOutputTokens,
  * else the model's declared output cap). Throws BudgetExhaustedError
  * (data.reason 'in-flight-exposure') to refuse the dispatch typed,
  * on the same surface as the layer-2b output bound; returns the
  * release closure the loop calls once the attempt settles, so the
  * reservation lives exactly as long as the wire call it covers.
  * Undefined result = nothing reserved (the cap resolved inert).
  */
  /**
  * The strict pre-egress pricing gate (RV1508): wired only when
  * RunOptions.strictPricing armed it; throws typed BEFORE the wire
  * call for a model whose price row is missing, malformed, or stale.
  */
  assertPricedDispatch?: (servedBy: ModelRef) => void;
  admitTurnExposure?: (servedBy: ModelRef, estimatedInputTokens: number, plannedOutputTokens: number) => (() => void) | undefined;
  /**
  * Parks until the next in-flight exposure hold releases (RV1902):
  * 'released' on that wake, 'drained' immediately when no hold is
  * live, 'aborted' when the signal fires first. Wired beside
  * admitTurnExposure when the cap is configured; consumed only by
  * invocations that opted into the exposure wait.
  */
  awaitExposureRelease?: (signal?: AbortSignal) => Promise<"released" | "drained" | "aborted">;
  /** Live in-flight exposure currently held by open dispatches (RV1902). */
  liveExposureUsd?: () => number;
  /** Live usage accounting; layer 3 may respond by aborting `signal`. */
  onUsage(usage: Usage, servedBy: ModelRef): void;
  /**
  * Opens the per-call marginal meter (RV1101): one meter per provider
  * call, fed every mid-stream delta and the settle remainder of THAT
  * call. The budget prices the call's ACCUMULATED usage and debits
  * the increment over what the call already paid, so a long-context
  * tier crossed by the accumulation re-prices the whole call live
  * exactly as the settled fold will; per-slice pricing can never see
  * that crossing (no single slice crosses the threshold). Optional:
  * hooks without it keep the historical per-slice debit into onUsage.
  */
  openCallMeter?: (servedBy: ModelRef) => (delta: Usage) => void;
  /** Layer 3: the ceiling AbortSignal. */
  signal?: AbortSignal;
}
/** Reason marker distinguishing a budget-ceiling abort from host cancellation. */
declare const BUDGET_ABORT_REASON = "rulvar:budget-ceiling";
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
  /** Chain audit payload ridden into tool:end telemetry. */audit?: GateAudit;
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
  /**
  * Runs a non-inprocess tool out of process through the engine's
  * registered ToolExecutorProvider (RV-216). Present whenever the frozen
  * toolset holds any non-inprocess tool; the ctx layer mints the tool
  * span and idempotency key and wires the provider. A throw becomes the
  * call's error tool result exactly like an inprocess execute throw.
  *
  * `ordinal` is the call's 1-based position in this agent invocation's
  * tool loop (checkpoint-stable across suspension and crash resume); the
  * ctx layer folds it with the agent entry's seq into the idempotency
  * key, so two separate calls with identical arguments do not collide
  * while an at-least-once retry of one call keeps its key (P0.4).
  */
  executeExternal?: (def: ToolDef, args: Json, ordinal: number) => Promise<unknown>;
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
  * The versioned compat flag (RV1810): emit the legacy `agent:error`
  * twin beside `quota:denied` for recoverable pre-wire quota waits.
  * Default off: the wait speaks its own type only.
  */
  quotaDeniedAgentError?: boolean;
  /**
  * Transport failover chain for the loop phase (M4-T04):
  * resolved fallback targets tried in order on
  * transport or rate-limit failures after retries exhaust. Failover is
  * sticky and changes only servedBy, never the content key.
  */
  fallbacks?: PhaseTarget[];
  /**
  * Transport RetryPolicy (M4-T05): lives UNDER
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
  * `signal` is the agent-level abort: an aborted caller leaves the
  * key's queue without a slot (v1.34.0 review P2-4).
  */
  providerSlot?: <T>(key: string, fn: () => Promise<T>, signal?: AbortSignal) => Promise<T>;
  /**
  * The shared quota limiter hook (RV-215): consulted before EVERY
  * live wire dispatch (initial attempts, transport retries, and
  * failover takeovers alike, in every phase). A denial becomes a
  * synthetic rate-limit-class WireError the retry and failover
  * engine treats exactly like a provider 429, except no wire call
  * was paid: retryAfterMs drives the interruptible backoff, denied
  * turns stay bounded by their OWN `maxDenials` budget (RV1601;
  * RetryPolicy.attempts counts dispatched tries only), and
  * exhaustion of either budget fails over (the takeover reserves
  * under its own model). Granted reservations are reconciled with
  * the attempt's actual usage after the outcome settles. Live-only
  * by construction: replayed calls never reach this seam, and
  * nothing here is journaled.
  */
  quota?: {
    reserve: (request: QuotaReservationRequest) => Promise<QuotaDecision>;
    reconcile: (reservationId: string, usage: Usage, actual?: {
      requests?: number;
    }) => Promise<void>; /** Limiter infrastructure failure policy; a denial is unaffected. */
    onLimiterError: "deny" | "allow"; /** Pre-wire continuation admission (RV1013); default post-hoc. */
    reserveContinuations?: boolean; /** The per-target denial retry budget (RV1601); default 8. */
    maxDenials?: number; /** Cancels an unused admission; absent = window age-out. */
    release?: (reservationId: string) => Promise<void>;
  };
  /** The resolved toolset; absent = no tools declared. */
  tools?: ToolRuntime;
  /**
  * Separate final extract invocation, present only when the role trigger
  * protocol demands one: schema set AND (routing directs extract to a
  * different model OR the loop model's caps cannot serve the required
  * tier OR finalize is routed). Otherwise the schema rides the last loop
  * turn (the necessity rule is
  * decided by the ctx layer via model/roles.ts).
  */
  extract?: PhaseTarget & {
    fallbacks?: PhaseTarget[];
  };
  /**
  * Finalize synthesis invocation (M4-T01), present only when the role
  * trigger protocol fires it: configured in routing AND the toolset is
  * non-empty. Runs after tools stop with toolChoice 'none' over the
  * full transcript plus a deterministic synthesis instruction appended
  * to the REQUEST only (the durable transcript keeps the raw history);
  * its text becomes the output for schema-less calls, a non-truncated
  * empty synthesis falls back to the loop turn's text, and a
  * schema-bearing call always pairs it with a separate extract
  * (the ctx layer guarantees `extract` is present in that case). Like
  * extract, the finalize invocation is not checkpointed in v1.
  */
  finalize?: PhaseTarget & {
    fallbacks?: PhaseTarget[];
  };
  /**
  * Opt-in policy-facts digest (RV709): when true AND a finalize
  * invocation fires, one additional REQUEST-ONLY user message
  * precedes the synthesis instruction, carrying the deterministic
  * runtime facts the loop observed (quota denials and recoveries,
  * tool budget pressure, the finalization window, recorded spend with
  * its cost basis), so the final model can cite the run's own live
  * evidence instead of underclaiming it. Never touches the durable
  * transcript, never enters spawn identity; unset keeps the finalize
  * request byte identical.
  */
  policyFacts?: boolean;
  /**
  * Summarize invocation target for compaction (M4-T03): resolved
  * through the chain with role 'summarize', falling back to the loop
  * model when routing resolves nothing. Compaction
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
  * Turn-boundary checkpointing (M3-T02).
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
  /**
  * The resolved evidence contract of the invocation (RV507): under
  * enforce 'refuse' an ok settle whose message window carries fewer
  * successful `record_evidence` executions (result `recorded: true`)
  * than `minEntries` is refused as a typed 'terminal' error carrying
  * the machine-readable counter and threshold. Window-derived exactly
  * like the terminal partial, so live and resumed segments count the
  * same total. Absent, and under 'warn', the loop is byte-identical to
  * before.
  */
  evidenceContract?: {
    minEntries: number;
    enforce?: "warn" | "refuse";
  };
  /**
  * The durable parallel of the tool budget summary (RV509): the caller
  * journals an extension grant and the finalization-window entry as
  * decision entries at the moment each fires, and hands the state read
  * back from those entries into `restored` on a dangling-dispatch
  * resume. A restored grant is honored as granted (the model was
  * already promised the raised cap), never re-admitted or re-announced,
  * and a restored window entry keeps the summary's
  * finalizationWindowEntered truthful even when a later grant moved the
  * counts back out of the window.
  *
  * Both hooks are AWAITED before the thing they authorize becomes
  * observable (RV601): a grant lifts no expiry and queues no notice
  * until its decision is durable, and the window regime binds no call
  * until its entry is. A rejected append therefore leaves the grant
  * unissued and the entry unrecorded, and the rejection propagates
  * exactly like a failed boundary checkpoint rather than being
  * swallowed. Pressure notices stay events and are never journaled.
  * Absent, the loop is byte-identical to before.
  */
  toolBudgetDurability?: {
    restored?: {
      extensionsGranted: number;
      finalizationWindowEntered: boolean;
      /**
      * The effective cap the journaled grant announced (RV602). It
      * anchors the resumed ceiling, because the live `maxToolCalls`
      * and `increment` are not part of the dispatch identity and may
      * legitimately drift between segments: without the anchor the two
      * recovery paths (pure replay, which reads the journal, and live
      * resume, which recomputed) disagreed, and a promise already made
      * to the model could be silently revoked. Validated as a
      * persistent inlet: a non-integer, or one below the base cap, is
      * ignored with a warning, leaving the count derivation as the
      * floor. Grants taken AFTER the restore point still measure the
      * current increment from this anchor.
      */
      cap?: number;
    };
    onExtensionGrant?: (grant: {
      grant: number;
      maxExtensions: number;
      toolCallsUsed: number;
      cap: number; /** Present exactly for the RV809 proactive grants: what fired them. */
      trigger?: "evidence-deficit";
    }) => Promise<void>;
    onWindowEntry?: (entry: {
      remaining: number;
      reserveCalls: number;
      budget: FinalizationWindowBudget;
      /**
      * Present exactly when RV1208 widened the reserve past the
      * configured one (RV2601): the outstanding evidence entries, and
      * the floor they are outstanding against. Absent means the
      * configured reserve is what bound, so the arithmetic behind an
      * unexpected reserve is always in the journal and never only in
      * the notice the model read.
      */
      evidenceDeficit?: number;
      minEntries?: number;
    }) => Promise<void>;
  };
  /** Emits agent:stream deltas when true (telemetry only). */
  stream?: boolean;
  /** Host or sibling cancellation. */
  signal?: AbortSignal;
  budget?: BudgetHooks;
  /**
  * The exposure-wait posture (RV1902): an in-flight exposure refusal
  * on this invocation parks until a live hold releases and retries
  * pre-wire, instead of settling a budget error. `true` is set only
  * by the orchestrate-owned root dispatches (the coordination loop,
  * the synthesis invocation, the forced-finish wake), whose settle
  * would tear down the run its own admitted children are still
  * funding. `'child'` (RV2002) rides on orchestrator-spawned
  * children: the same park-and-retry, but the drained arm (no live
  * holder left to wait out) dies as the typed cheap
  * 'exposure-drained' refusal instead of the raw budget error, so
  * the orchestrator can tell a starved seat apart from a crashed
  * child and re-spawn it; the third parity rerun terminally killed
  * three mid-research workers on exactly this path.
  */
  exposureWait?: boolean | "child";
  /**
  * The prompt-cache policy (RV2006): resolved by the ctx layer from
  * the call opts, the agentType profile, and the engine defaults, in
  * that order. Absent means 'auto': the loop attaches CacheHint
  * breakpoints (after tools, after system, and the sliding deepest
  * message) on every turn served by an adapter that declares
  * ModelCaps.promptCaching 'explicit', and attaches nothing anywhere
  * else. See applyCachePolicy for the exact shape.
  */
  cache?: CachePolicy;
  /**
  * The incremental billing seam (RV2008): called with every
  * ProviderCallRecord the moment the wire call settles and the record
  * is minted, so the caller can journal it while the invocation is
  * still running. The parity rerun lost ~$0.99 of root dispatches
  * because records rode ONLY the terminal entry and the process died
  * before one existed; with the seam the crash window shrinks to the
  * single in-flight turn. Restored records (a checkpoint reboot)
  * never re-emit: they were journaled by the segment that minted
  * them. A returned promise is AWAITED before the loop proceeds
  * (RV3405, the awaited receipt posture): the caller decides the
  * durability, the loop honors it; a void return keeps the RV2008
  * fire and forget byte for byte.
  */
  billing?: {
    onProviderCall: (record: ProviderCallRecord) => void | Promise<void>;
    /**
    * The pre-wire intent (RV4006): invoked strictly BEFORE every
    * dispatched wire attempt, after admission and any quota
    * reservation, with the coordinates the settled record will carry
    * (ordinal, role, servedBy, attempt) and the built request for
    * fingerprinting. A returned promise is AWAITED before the wire
    * dispatches (intent before effect, the RV601 precedent), and a
    * rejected append refuses the dispatch: a wire whose intent could
    * not be made durable must not be able to bill. Quota denials and
    * pre-dispatch aborts never reach it, exactly like the settled
    * record they never mint.
    */
    onProviderIntent?: (intent: {
      ordinal: number;
      role: InvocationRole;
      servedBy: ModelRef;
      attempt: number;
      request: ChatRequest;
    }) => void | Promise<void>;
  };
  events?: RuntimeEventSink;
  transcript?: {
    mintRef(): string;
    put(ref: string, blob: Uint8Array): Promise<void>;
  };
  priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined;
  /** Bounded schema re-prompt attempts; default 2 (Appendix A). */
  schemaRetryAttempts?: number;
  /** Bounded ModelRetry conversions per tool call chain; default 2 (Appendix A). */
  modelRetryAttempts?: number;
  /**
  * Escalation opt-in (M3-T07): the loop intercepts accepted calls to
  * the escalate tool and terminates with status 'escalated'; the
  * in-run minSpend gate rejects early scope_bigger escalations with a
  * "keep working" error tool result (M3-T09).
  */
  escalation?: {
    minSpendUsd: number;
  };
  /**
  * Terminal-tool interception (M6-T07): an accepted call to the named
  * tool ends the loop with status ok; the call's validated `result`
  * argument becomes the agent output (the orchestrator finish
  * tool). The tool's execute never runs, mirroring escalate.
  * `validate` is the optional host judgment over a schema valid call
  * (the RV-204 finish validators): ok finishes as before; a rejection
  * becomes the call's error tool result and the turn continues, so the
  * model can repair and call the terminal tool again. The hook owns
  * bounding and journaling; the loop stays policy only and never
  * throws.
  */
  terminalTool?: {
    name: string;
    validate?: (call: {
      id: string;
      result: unknown;
      /**
      * The full schema-validated argument object (RV808b): a sectional
      * resubmission rides beside `result`, and only the hook knows the
      * vocabulary. Absent semantics are the hook's business; the loop
      * passes it verbatim.
      */
      args?: unknown;
    }) => Promise<{
      ok: true;
      /**
      * Overrides the finished value (RV808b): a sectional splice
      * resolves the accepted call to the FULL reconstructed
      * document, which is what the agent output must be. Absent =
      * the call's own `result` argument, byte identical to the
      * historical loop.
      */
      resolved?: {
        result: unknown;
      };
    } | {
      ok: false;
      feedback: Record<string, unknown>;
    }>;
    /**
    * The repair reserve (the v1.71 experiment review, P0.4): max EXTRA
    * turns the loop may grant past limits.maxTurns, one per rejected
    * terminal-tool exchange, schema-invalid arguments and host
    * validation rejections alike. The grant count derives from the
    * message window itself (error tool results named after the
    * terminal tool, clamped to the reserve), so a resumed segment that
    * restored the window mid-exchange re-derives the same grants and
    * nothing needs journaling. Zero (or absent) keeps the ceiling
    * byte identical to the pre 1.73 loop.
    */
    repairTurnReserve?: number;
  };
  agentType?: string;
  /** The primary invocation role of the tool loop; default 'loop' (M6-T05; RV-211 adds synthesize). */
  role?: "loop" | "plan" | "orchestrate" | "synthesize";
  label?: string;
  now?: () => number;
}
/**
* The output-truncation abort message (v1.9.0 follow-up review). The
* constraint is named neutrally as the turn's output token allowance:
* the effective request cap can come from limits.maxOutputTokensPerTurn,
* the budget clamp above, or the adapter's own default, and the provider
* can also cut at its model maximum with no request cap at all.
*/
/**
* The deterministic synthesis instruction appended (as a user message)
* to the finalize REQUEST only, never to the durable transcript. A
* transcript that simply ends at an assistant message reads to a real
* model as a fresh conversation opening, so an uninstructed synthesis
* call can replace the loop's correct answer with a greeting (v1.18.0
* review P1-1); the extract arm has carried its own instruction since
* M4, and this is its finalize twin. The wording is part of the wire
* request: keep it stable.
*/
declare const FINALIZE_SYNTHESIS_INSTRUCTION: string;
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
* Declarative rule tables (no closures). `'undeclared'` in risk
* position matches every tool WITHOUT declared risk: presets treat the
* undeclared state conservatively. Argv rules
* match through the real shell matcher; domain rules are
* ADVISORY for every tool in the current release: they never
* change a verdict, and matches surface in the tool:end audit
* fields (enforcement will live in a first-party fetch tool
* when one ships).
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
  /**
  * Opt-in monotonic approval composition (RV1507, the eighteenth
  * improvement plan). The chain's documented order lets a generic
  * allow (a hook or canUseTool) clear a `needsApproval: true` tool,
  * which is deliberate for tests and trusted hosts and a fail-open
  * hazard for a platform profile. With this set, an ALLOW verdict
  * from a hook or from canUseTool over a needsApproval tool falls
  * through instead of deciding, so the terminal default still asks;
  * deny and ask verdicts keep their power (tightening stays
  * decisive), input modification still applies, and tools without the
  * declaration keep the historical composition byte for byte. Merges
  * monotonically across the engine and profile layers: either level
  * arms it and a profile cannot loosen an engine-armed mode. A
  * non-boolean value refuses at compile (the RV610 posture: a stray
  * 'true' string must never silently disarm the mode it names).
  */
  strictApprovals?: boolean;
  /**
  * Opt-in deadline for ask verdicts (RV1107): a suspended tool
  * approval nobody resolves within this many milliseconds is DENIED
  * by a journaled resolution by 'timeout' instead of waiting forever.
  * The deadline is journaled ON the suspension entry, so it survives
  * resume and re-arms from the entry, exactly like the flavor B
  * escalation deadline; a racing live decision and the timeout can
  * never both apply (first-closing-wins). A positive integer no
  * larger than the deadline ceiling (one hundred years in
  * milliseconds, RV1204), so now + interval always journals as a
  * valid absolute date. Absent is the historical contract: the
  * approval waits indefinitely.
  */
  approvalDeadlineMs?: number;
}
/**
* Profile-level permissions.
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
  /** The monotonic OR of both layers' strictApprovals (RV1507). */
  strictApprovals?: boolean;
  /** The merged opt-in approval deadline; profile over engine (RV1107). */
  approvalDeadlineMs?: number;
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
  * Advisory domain-rule matches: reported in the tool:end
  * audit fields, never enforced in the current release.
  */
  advisory?: PermissionRule[];
};
/**
* Merges the engine-wide config and the profile config into one chain.
* Layers concatenate engine-first; since rules only deny or ask, ordering
* within a layer cannot change the verdict. The
* profile's canUseTool wins over the engine's (a single slot by
* construction). A declared preset compiles INTO the same layers, after
* the host-authored rules, never as a fifth layer (M5-T05).
*/
declare function compilePermissionChain(engine?: PermissionConfig, profile?: AgentProfilePermissions): CompiledPermissionChain;
/**
* Evaluates the chain for one dispatch, or OFFLINE against a
* hypothetical call by tool name (the dry-run API: nothing executes;
* shells and tests read the verdict, the
* deciding layer, and the matched rule). Hooks run in deterministic
* registration order; { modifiedInput } substitutes the input and
* continues; the first decisive verdict wins. The returned input is what
* execute receives and what the approval identity hashes (post hook
* modification). Advisory domain-rule matches
* ride every verdict for the audit payload.
*/
declare function evaluatePermission(chain: CompiledPermissionChain, tool: string | Pick<ToolDef, "name" | "needsApproval" | "risk">, input: unknown, ctx?: ToolContext): Promise<PermissionVerdict>;
//#endregion
//#region src/tools/toolset-hash.d.ts
/** The per-spawn tools option value domain. */
type ToolsOption = ReadonlyArray<ToolDef | ToolSource | string>;
/** The spawn's frozen toolset snapshot plus its identity hashes. */
interface ResolvedToolset {
  tools: ToolDef[];
  contracts: ToolContract[];
  hash: string;
  /** The aggregate authority hash over the per-tool records (RV1802). */
  authorityHash: string;
}
/**
* The authority projection of one tool (RV1802): what the tool may DO
* and under what gate, beside WHAT the model sees. The contract hash
* pins the model-facing tuple; risk, needsApproval, executor, and the
* executorSpec digest are the declarations that never enter
* toolsetHash by design, yet every one of them changes what the ask
* rules and the approval flow will do. Execute bodies stay
* deliberately unhashable: `version` remains the lever for behavior
* drift under an unchanged contract.
*/
interface ToolAuthority {
  /** toolContractHash of the model-facing contract tuple. */
  contract: string;
  /** The tool's approval gate (default false at build time). */
  needsApproval: boolean;
  /** Where execute runs: 'inprocess' or a registered executor tag. */
  executor: ToolExecutor;
  /** Present when the tool declares a risk class. */
  risk?: string;
  /** sha256 over the JCS-canonical executorSpec, when declared. */
  executorSpec?: string;
}
/** Derives one tool's authority record (RV1802). */
declare function toolAuthority(def: ToolDef): ToolAuthority;
/**
* The aggregate authority hash (RV1802): sha256 over the JCS-canonical
* array of per-tool authority records, each carrying its tool name,
* sorted by name; toolsetHash's exact aggregation shape, over the
* authority side.
*/
declare function toolsetAuthorityHash(authorities: Record<string, ToolAuthority>): string;
/** The authorityHash of an empty toolset. */
declare const EMPTY_AUTHORITY_HASH: string;
/** The empty toolset (no tools declared anywhere). */
declare function emptyToolset(): ResolvedToolset;
/**
* A recorded toolset pin (RV1514): the aggregate toolsetHash a spawn
* must resolve to, plus optional per-tool contract hashes that turn a
* mismatch refusal into a named diff (changed / missing / unexpected).
* Record one with {@link attestToolset}; declare it as
* `AgentProfile.toolsetAttestation`. Provider-side drift of an imported
* tool's description or schema re-keys new spawns silently by design;
* an attested profile turns exactly that drift into a typed refusal at
* spawn time, before any provider call.
*/
interface ToolsetAttestation {
  /** The expected aggregate toolsetHash (64 lowercase hex chars). */
  hash: string;
  /** Per-tool contract hashes by tool name; enables the named diff. */
  tools?: Record<string, string>;
  /**
  * The expected aggregate authority hash (RV1802). Absent on a legacy
  * contract-only pin, which keeps its documented posture: authority
  * drift (risk, needsApproval, executor, executorSpec) passes it
  * silently; re-record with {@link attestToolset} to upgrade.
  */
  authorityHash?: string;
  /** Per-tool authority records; enables the field-naming diff (RV1802). */
  authority?: Record<string, ToolAuthority>;
}
/** Records the attestation of a resolution: the pin a profile declares. */
declare function attestToolset(resolved: ResolvedToolset): ToolsetAttestation;
/** Validates a declared attestation's shape (typed at createEngine). */
declare function validateToolsetAttestation(attestation: ToolsetAttestation, path: string): void;
/**
* Holds a spawn's resolved toolset to its profile's attested pin
* (RV1514): a hash mismatch is a typed ConfigError before any provider
* call or budget admission. With per-tool hashes on the attestation the
* refusal names the drift (changed / missing / unexpected); without
* them it lists the resolved per-tool hashes, so the pin can be
* corrected from the refusal itself. When the pin carries the authority
* side (RV1802), a contract-clean resolution is additionally held to
* the attested authorityHash, so risk, needsApproval, executor, and
* executorSpec drift refuses at the same pre-wire site; a legacy
* contract-only pin keeps its documented posture and passes it.
*/
declare function enforceToolsetAttestation(agentType: string, attestation: ToolsetAttestation, resolved: ResolvedToolset): void;
/**
* Expands registered names and sources, validates every tool name and
* duplicate names across the whole toolset (ConfigError at spawn time),
* and computes the toolsetHash over contracts sorted by name. The
* `toolsets` registry is the engine's `defaults.toolsets` snapshot;
* without one, string entries fail with the same unknown-name error as
* a miss, so nothing outside the declared registry is ever reachable.
*/
declare function resolveToolset(specs: ToolsOption | undefined, session: ToolSourceSession, toolsets?: Record<string, ToolsOption>, executors?: ReadonlySet<string>): Promise<ResolvedToolset>;
//#endregion
//#region src/runtime/executor.d.ts
/**
* Which exec idempotency key derivation a run uses (RV403), resolved at
* engine boot from RunMeta.execKeyDerivation. Version 1 is the original
* genesis-free five-part key, the only derivation runs recorded without
* the meta field can ever use; version 2 additionally binds the run's
* generation token, so it must carry it.
*/
type ExecKeyDerivation = {
  version: 1;
} | {
  version: 2;
  genesis: string;
};
//#endregion
//#region src/journal/termination.d.ts
/** The frozen limits vector written into termination.init. */
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
  /**
  * B0 as frozen at genesis; no API, HITL included, tops up a live
  * run. The vector keeps the GENESIS ceiling even when a later
  * segment's journaled ResumeOptions.run override (RV2208) moved the
  * enforced bound: the frozen dollars are the termination account's
  * record, the override decision entry is the budget's.
  */
  runBudgetUsdCeiling: number;
  /**
  * The resolved orchestrator cap in absolute USD (DEF-7; XF-09),
  * frozen with the counters. Journals recorded before v1.8 store 0
  * ("not yet resolved"); for them the orchestrator_budget_reserve
  * decision is the authority and is recovered on resume.
  */
  orchestratorCapUsd: number;
  /** The finalize reserve carved out of the cap; 0 in pre-v1.8 journals. */
  finalizeReserveUsd: number;
}
/** Appendix A committed defaults for the countable resources. */
declare const DEFAULT_MAX_REVISIONS_PER_RUN = 32;
declare const DEFAULT_MAX_TOTAL_SPAWNS = 128;
/** The countable resource vocabulary. */
type TerminationResource = "revisionUnits" | "spawnUnits" | "escalationUnits" | "rungs" | "depth";
interface LineageCounters {
  escalationUnitsRemaining: number;
  rungsRemaining: number;
}
interface TerminationAccountSnapshot {
  revisionUnitsRemaining: number;
  spawnUnitsRemaining: number;
  perLineage: Record<LogicalTaskId, LineageCounters>;
  /** The variant function, a pure fold over the journal. */
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
/** The value payload of a termination.init entry. */
interface TerminationInitValue {
  limits: TerminationLimits;
  profileRegistrySnapshotHash: string;
  phiInitial: number;
}
/** The value payload of a termination.denied entry. */
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
* loop-role routing entry). The reader is defensive
* so the snapshot is total over every registry shape (an undeclared
* ladder has length 1: the single implicit rung).
*/
declare function ladderLengthOf(profile: unknown): number;
/** kMax: the maximum declared ladder length across the registry snapshot. */
declare function kMaxOf(profiles: Record<string, unknown> | undefined): number;
/**
* The deterministic profile-registry snapshot hash frozen inside
* termination.init: profile names mapped to their declared ladder
* lengths, canonical JSON, sha256.
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
/** Phi0 = V0 + C * S0, finite and fixed in termination.init. */
declare function phiInitialOf(limits: TerminationLimits): number;
/** Builds the termination.init value payload. */
declare function buildTerminationInitValue(limits: TerminationLimits, registrySnapshotHash: string): TerminationInitValue;
/** Reads a termination.init entry's payload; undefined when malformed. */
declare function readTerminationInit(entry: JournalEntry): TerminationInitValue | undefined;
/**
* Config-drift detection at resume: the journaled vector
* always wins; every differing field is reported for the
* `termination:config-drift` event. Ambient config can never top up a
* budget through a restart; the one explicit, journaled door is
* ResumeOptions.run (RV2208), which is a decision entry, not a drift.
*/
declare function terminationConfigDrift(frozen: TerminationLimits, live: Partial<TerminationLimits>): Array<{
  field: keyof TerminationLimits;
  frozenValue: Json;
  liveValue: Json;
}>;
/** Injected appender for termination.denied entries (engine-owned I/O). */
type TerminationDeniedWriter = (denied: TerminationDeniedValue) => Promise<EntryRef>;
/**
* The single per-run TerminationAccount: debit ONLY. No
* credit operation exists by construction; reclaim never replenishes
* anything (DEF-5 interaction). Live: the engine debits the
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
  /** Phi = V + C * S + sum over live lineages (E + R). */
  phi(): number;
  /** The current rung index of a lineage (0 before any raise). */
  rungIndexOf(logicalTaskId: LogicalTaskId): number;
  /** True when a spawn-unit debit would underflow (pre-reserve check). */
  get spawnUnitsExhausted(): boolean;
  get revisionUnitsRemaining(): number;
  /**
  * The spawn-admission debit: minus one spawnUnit for
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
  * The plan_revise debit: minus one
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
  * The escalation debit: minus one escalationUnit of
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
  * The ladder-raise debit: minus one rung of the
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
  * The unified debit surface: attempts the named resource and, on
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
/** The typed error code surfaced after a denied debit. */
declare function exhaustionCodeOf(resource: TerminationResource): string;
/**
* The replay fold: rebuilds the account from
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
//#region src/engine/budget.d.ts
type Spend = {
  usd: number;
  usage: Usage;
  agentsSpawned: number;
};
/** Last resort of the admission reserve formula. */
declare const DEFAULT_FLAT_RESERVE_USD = .5;
/**
* How far a `ratesVerifiedAt` may sit in the future before strict
* pricing refuses it (RV1804): one day absorbs date-only strings
* authored ahead of UTC and ordinary clock skew, while a typo'd year
* (the hazard the clamp exists for) is months out and refuses.
*/
declare const FUTURE_RATES_TOLERANCE_MS = 864e5;
/**
* The message prefix of an in-flight exposure refusal (RV711): the
* single producer is reserveTurnExposure below, and the ctx layer's
* uniform budget rethrow keys on it to carry the refusal through with
* its own honest arithmetic instead of claiming a ceiling crossed
* (no account closes on a transient refusal).
*/
declare const IN_FLIGHT_EXPOSURE_REFUSAL_PREFIX = "in flight exposure cap reached";
/** The run-root account scope. */
declare const ROOT_ACCOUNT = "run";
/**
* Cadence of the parked-waiter sweep (RV2003). The interval's first
* job is REFERENCE: a parked exposure wait used to hold nothing on the
* event loop, so a process whose only remaining work was the wait
* exited silently mid-run (the third parity rerun's terminal shape,
* `Warning: Detected unsettled top-level await`). While any waiter is
* parked, a ref'd timer keeps the loop alive; each tick additionally
* sweeps for the drained state (no holder of any kind left), waking
* every waiter 'drained' so a wake lost to a future leak can never
* strand them.
*/
declare const EXPOSURE_WAIT_SWEEP_MS = 250;
/**
* The admission reserve for a spawn: opts.estCost, else profile.estCost,
* else price(countTokens(input) + one turn's worth of output), else the
* engine flat default. The output term is caps.maxOutputTokens clamped to
* limits.maxOutputTokensPerTurn when the spawn carries one, so a host can
* bound reserves without hand-written estimates. The priced path uses the
* SAME price function as settlement (priceUsdOf), so long-context tiers
* apply to estimates too.
*/
declare function admissionReserveUsd(options: {
  estCost?: number;
  profileEstCost?: number;
  inputTokens?: number;
  caps?: ModelCaps;
  maxOutputTokensPerTurn?: number;
  flatReserveUsd?: number;
}): number;
/** Read-only projection of one account. */
interface BudgetAccountView {
  scope: string;
  ceilingUsd?: number;
  spentUsd: number;
  committedReserveUsd: number;
  finalizeReserveUsd: number;
  /** The synthesis payload hold (cycle 76); zero when none is committed. */
  synthesisReserveUsd: number;
  /** The repair round's verdict hold (RV3701); zero when none is committed. */
  convergenceReserveUsd: number;
  /** The repair round's mechanical leg (RV3802); zero when none is committed. */
  repairReserveUsd: number;
  parentScope?: string;
}
/**
* Why a ceiling error ended the work: the first closed account walking
* from the debited scope toward the root, plus the root state, so the
* outward message can name WHICH ceiling actually crossed instead of
* blaming the run ceiling for every crossing.
*/
interface BudgetExhaustionDiagnostics {
  crossed?: {
    scope: string;
    source: "root" | "orchestrator-cap" | "child-account";
    ceilingUsd: number;
    spentUsd: number;
    committedReserveUsd: number;
    finalizeReserveUsd: number;
  };
  root: {
    ceilingUsd?: number;
    spentUsd: number;
  };
}
/**
* The per-run budget account tree. All spend accounting is per instance;
* the journal remains the durable source (the root is seeded by the
* ledger fold on resume, M2; sub-account reserves are recovered from
* spawn-admission decision entries, M6).
*/
declare class RunBudget {
  /**
  * B0; immutable within a segment (RV2511): only the explicit,
  * journaled ResumeOptions.run override (RV2208) changes it, by
  * opening a new segment, and budgetPolicy 'immutable-lifetime'
  * (RV3902) refuses even that. Undefined means no USD ceiling.
  */
  readonly ceilingUsd?: number;
  /**
  * The opt-in in-flight exposure cap (RV711). Undefined means the
  * reservation surface is inert and reserveTurnExposure never binds.
  */
  readonly maxInFlightExposureUsd?: number;
  /** The opt-in lone-dispatch clamp (RV2503); see maxExposureOutputTokens. */
  private readonly clampTurnToExposure;
  private readonly lifetimeSpawnCap;
  private readonly events?;
  private readonly priceUsd?;
  private readonly pricingOf?;
  private readonly accounts;
  /** Per-scope inclusive settled spend applied when the scope re-opens (RV1505). */
  private readonly seededAccountSpend;
  private usageInternal;
  private agentsSpawnedInternal;
  /**
  * The strict pre-egress pricing gate config (RV1508); undefined means
  * the surface is inert and {@link assertPricedDispatch} never binds.
  */
  readonly strictPricing?: {
    maxRatesAgeDays?: number;
    allowUnpriced?: readonly string[];
  };
  private readonly now;
  /** Models this run already vetted; a price table is fixed per run. */
  private readonly pricedDispatchVetted;
  private exhaustedInternal;
  /** Live dispatch estimates held by reserveTurnExposure (RV711). */
  private inFlightExposureUsd;
  /**
  * The same live estimates attributed to their holders (RV2001): one
  * entry per holder scope with a nonzero balance, kept in lockstep
  * with the scalar above by every acquire and release. The holder is
  * the agent invocation the dispatch belongs to, so a terminal can
  * return whatever its agent still holds; entries at zero are removed,
  * making the map size the live holder count.
  */
  private readonly exposureHolds;
  /**
  * Live holds taken without a holder attribution (a direct caller of
  * reserveTurnExposure): counted so the zero-holders snap below knows
  * when NOTHING is held. Subtraction leaves float residue (three 0.18
  * releases leave 5.5e-17), and a residue above zero would park the
  * exposure wait on money nobody holds, the epsilon-scale rebirth of
  * the very deadlock RV2001 closes; when the last hold of any kind
  * releases, the scalar snaps to exactly zero.
  */
  private unattributedHoldCount;
  /**
  * Waiters parked on the next exposure release (RV1902): the
  * orchestrate root's dispatch waits out a transient refusal here
  * instead of settling a budget error. Notified (and self-removed)
  * on every hold release; never on spend, which only grows. Each
  * waiter takes the wake flavor (RV2003): 'released' when money
  * actually returned, 'drained' from the sweep when no holder of any
  * kind is left to wait out.
  */
  private readonly exposureWaiters;
  /**
  * The parked-waiter keepalive (RV2003): live exactly while
  * exposureWaiters is nonempty. See EXPOSURE_WAIT_SWEEP_MS for why
  * it must REF the event loop.
  */
  private waitKeepalive;
  /** Models already warned about; the warning fires once per model per run. */
  private readonly unpricedWarned;
  /** Models whose price function already returned an invalid USD once. */
  private readonly invalidPriceWarned;
  constructor(options: {
    ceilingUsd?: number; /** The opt-in in-flight exposure cap (RV711); see reserveTurnExposure. */
    maxInFlightExposureUsd?: number; /** The opt-in lone-dispatch clamp (RV2503); see maxExposureOutputTokens. */
    clampTurnToExposure?: boolean;
    lifetimeSpawnCap?: number;
    events?: RuntimeEventSink;
    priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined; /** Raw price-row resolution for the layer-2b output bound. */
    pricingOf?: (servedBy: ModelRef) => Pricing | undefined;
    /**
    * The resume seed, folded from the persisted journal (the settled
    * per-call fold, RV801): spend is never
    * reset and never double-counted; replayed entries are already inside
    * this seed and add no increments. `accounts` carries the
    * per-account rows of the same fold (`accountSpendFromJournal`,
    * RV1505): each scope's INCLUSIVE settled spend, applied when the
    * scope re-opens, so sub-account history survives resume instead
    * of restarting at zero. The root row is ignored: the root seeds
    * from `usd`, which is the same settled fold by construction.
    * Orchestrator-cap accounts are exempt (see openAccount): the cap
    * is a per-segment coordination bound and the documented resume
    * after a budget-cancelled root continues past it by design.
    */
    seed?: {
      usd: number;
      usage: Usage;
      agentsSpawned: number;
      accounts?: Readonly<Record<string, number>>;
    };
    /**
    * The strict pre-egress pricing gate (RV1508): armed, every paid
    * dispatch must resolve a well-formed price row for its serving
    * model BEFORE the wire call, or the dispatch refuses typed. See
    * {@link RunBudget.assertPricedDispatch} for the exact refusals.
    * Absent by default: the surface is inert and dispatch behavior is
    * byte identical.
    */
    strictPricing?: {
      maxRatesAgeDays?: number;
      allowUnpriced?: readonly string[];
    }; /** Clock for the freshness bound; injectable for tests. */
    now?: () => number;
  });
  private get root();
  /** The account chain from `scope` up to and including the root. */
  private chainOf;
  /**
  * Opens a child sub-account under `parentScope`.
  * Re-opening an existing scope is the resume roll-forward path: the
  * recorded ceiling wins once and the accumulated state is kept.
  */
  openAccount(scope: string, options: {
    parentScope?: string;
    ceilingUsd?: number;
    finalizeReserveUsd?: number;
    kind?: "orchestrator-cap" | "child-allowance";
  }): void;
  /**
  * Raises a child-allowance ceiling by one more admitted child's
  * declared estimate (RV4404, `budget.estIsCeiling`). Tool-spawned
  * children of one orchestrator share a scope, so the enforced bound
  * is the AGGREGATE of the declared estimates: the fan-out
  * collectively cannot spend past what it declared, which is exactly
  * the number the acceptance-tail arithmetic trusted. Only a
  * child-allowance account may raise; the orchestrator cap and the
  * root are host declarations no admission may widen. Deterministic
  * on resume: admissions replay in order, so the raises do too.
  */
  raiseChildAllowance(scope: string, byUsd: number): void;
  /**
  * The diagnostic projection behind a ceiling error: the first CLOSED
  * account (projected commitments included, exactly the layer-1
  * closure test) walking from `scope` toward the root, plus the root
  * state. 'run budget ceiling reached' under a healthy root misled the
  * v1.6.0 follow-up review's live probe when only a 0.18 USD
  * orchestrator cap had crossed under a 0.90 USD root; the message can
  * now name the account that actually ended the work. An unknown scope
  * degrades to root-only diagnostics instead of throwing: this runs on
  * the error path.
  */
  exhaustionDiagnostics(scope: string): BudgetExhaustionDiagnostics;
  /**
  * The strict pre-egress pricing gate (RV1508): called at the dispatch
  * chokepoint, strictly BEFORE the wire call and before any exposure
  * hold, whenever `strictPricing` is armed. Refusals, each a typed
  * ConfigError naming the model and the defect: no price row resolves
  * (an unpriced model debits nothing, so every ceiling silently fails
  * to bound it); a row missing its required input or output rate
  * (RV3204: the type requires both, and an untyped `{}` row used to
  * satisfy every conditional check and debit zero); a malformed row
  * (a non-finite or negative rate, a
  * malformed long-context tier), because arithmetic over it disarms
  * the very comparisons the mode exists to keep honest; and, only
  * when `maxRatesAgeDays` is declared, a row whose `ratesVerifiedAt`
  * is absent, unparsable, or older than the bound, because a stale
  * price bounds the ceiling with yesterday's truth. `allowUnpriced`
  * is the explicit exception for models the host KNOWS are free
  * (exact refs, no patterns). A model is vetted once per run: the
  * price table is fixed for the run's life, so the verdict cannot
  * drift between turns. Inert without the config, byte for byte.
  */
  assertPricedDispatch(servedBy: ModelRef): void;
  accountView(scope: string): BudgetAccountView | undefined;
  /**
  * The admission remainder of one account: ceiling minus spend minus
  * committed reserves minus the finalize reserve (DEF-7: childBudget
  * fractions never eat finalization money). Undefined when uncapped.
  */
  remainderOf(scope: string): number | undefined;
  /**
  * The tightest allowance headroom on the chain of `scope`: the minimum
  * remainder across 'child-allowance' accounts. An allowance ceiling
  * bounds the child's LIFETIME spend, so projected admission must never
  * hold more than this against the chain (the layer-2 mirror lives in
  * the orchestrator admission's childCeiling clamp): a reserve above
  * the allowance would deny work that the allowance itself already
  * bounds. Undefined when no allowance account is on the chain; the
  * clamp never applies to the run root or an orchestrator cap, whose
  * headroom is shared money that projected admission must protect.
  */
  allowanceHeadroomOf(scope: string): number | undefined;
  /** Layer 3 ceiling signal of the run root; live streams sever through it. */
  get signal(): AbortSignal;
  /** The layer-3 signal of one sub-account's subtree, when it exists. */
  signalOf(scope: string): AbortSignal | undefined;
  get exhausted(): boolean;
  /**
  * Marks the run exhausted without a ceiling event: the orchestrator
  * finalize fallback maps to outcome 'exhausted' with the synthesized
  * partial value (DEF-7; exhaustion is never null).
  */
  markExhausted(): void;
  get committedReserveUsd(): number;
  /** Spawn headroom under the engine lifetime cap (embedded in admission verdicts). */
  get spawnHeadroom(): number;
  /**
  * Layer 1: PROJECTED admission before spawn. A spawn is admitted only
  * when every account in the ancestor chain of `accountScope` still has
  * admission headroom AND fits the PROPOSED reserve on top of spent +
  * committedReserve + finalizeReserve (the finalize reserve is
  * untouchable by admission, DEF-7). An exact fill is allowed; one
  * dollar past the ceiling is not: a spawn is never admitted on the
  * argument that the money it needs is merely not committed yet. The
  * whole chain is checked before anything commits, so a rejection
  * mutates no account, increments no counter, and journals nothing.
  * Also enforces the engine lifetime spawn cap.
  */
  /**
  * The refusal arm of admitSpawn as a standalone check (RV904): throws
  * exactly the refusal admitSpawn would throw for this reserve (the
  * lifetime spawn cap, a full account, a ceiling overflow), marking
  * the run exhausted the same way, but commits NOTHING on success.
  * ctx.agent runs it against the smallest reserve any countTokens
  * outcome could produce, so a spawn the budget could never admit
  * refuses BEFORE the child prompt leaves the process; admitSpawn
  * still decides with the real reserve afterward, sharing this exact
  * arithmetic so the two can never disagree about a refusal.
  */
  refuseSpawnIfInfeasible(reserveUsd: number, accountScope?: string): void;
  admitSpawn(reserveUsd: number, accountScope?: string): void;
  /**
  * Resume roll-forward: commits a reserve recovered from a journaled
  * spawn-admission decision entry without re-evaluating admission
  * (reserves are recovered, never re-estimated). The lifetime spawn
  * counter does NOT increment here (RV2201): every agent the
  * roll-forward re-covers already counted through the resume seed,
  * whose journal fold counts each dispatched agent entry, so an
  * incrementing roll-forward double-counts every recovered child.
  * The seventh subscription parity run resumed a killed 4-child
  * fan-out into a seed of 5, re-counted the children to 9 against a
  * cap of 8, and the post-acceptance tail starved on the counter
  * while the synthesis reserve's money sat whole: the judge declined
  * typed, the synthesis spawn refusal reached the terminal, and the
  * accepted dossier was lost. Each spawned agent counts a single
  * time across the run's whole life, never twice: at its fresh
  * admitSpawn, or through the seed of whichever segment rolls it
  * forward.
  */
  admitRecovered(reserveUsd: number, accountScope?: string): void;
  /**
  * Registers the orchestrator finalize reserve (DEF-7):
  * absolute dollars set on the named account AND the run root, so
  * admission never lets any spawn eat the finalization money even
  * against whole-run exhaustion. Kept SEPARATE from committedReserveUsd
  * (the block checks add both), so remainders never double-count.
  * Idempotent: re-registering on resume keeps the journaled amount.
  */
  commitFinalizeReserve(scope: string, reserveUsd: number): void;
  /**
  * The forced finish CONSUMES its reserve (DEF-7
  * reserve-survives-run-exhaustion): once the cap decision is durable
  * and the finalize dispatch begins, the reserve stops subtracting from
  * the admission remainder, or the finalize agent could never draw the
  * money reserved for it under a tight run ceiling. Admissions stay
  * frozen past the cap, so nothing else can take it.
  */
  releaseFinalizeReserve(scope: string): void;
  /**
  * Registers the synthesis payload reserve (the sixth comparison
  * experiment, cycle 76): absolute dollars held on the orchestrator
  * account AND the run root, so neither spawn admission nor the
  * per-turn output clamp lets the coordination prefix eat the money
  * the synthesis finish needs. Unlike the finalize reserve it is
  * released BEFORE the synthesis invocation dispatches (the held
  * money is exactly what that invocation is meant to spend), and it
  * never joins the severing check: a coordination running against the
  * hold is clamped smaller, never aborted. Idempotent per account:
  * re-registering adjusts the root by the delta.
  */
  commitSynthesisReserve(scope: string, reserveUsd: number): void;
  /** The synthesis dispatch consumes its reserve; see commitSynthesisReserve. */
  releaseSynthesisReserve(scope: string): void;
  /**
  * Registers the repair round's verdict reserve (RV3701, the third
  * comparison experiment's arc): absolute dollars held on the
  * orchestrator account AND the run root for the verdict pass (the
  * round's second judge invocation) that must follow a DISPATCHED
  * claim repair round. The third comparison run
  * proved the round's two invocation tail is only as convergent as
  * the money left when the candidate materializes; with the verdict
  * money held from the moment the round is admitted, the round's own
  * repair turns (the layer-2b clamp prices output from a remainder
  * this hold shrinks) and any concurrent admission (the hold joins
  * the projected admission sum) cannot eat it, so a round the budget
  * can only START is refused before any wire call instead of being
  * paid for and left unjudgeable. Exactly the synthesis reserve
  * mechanics: released to the invocation it was held FOR (the
  * verdict pass dispatch), never joined to the severing check.
  * Idempotent per account: registering again adjusts the root by the
  * delta.
  */
  commitConvergenceReserve(scope: string, reserveUsd: number): void;
  /** The verdict pass dispatch consumes its reserve; see commitConvergenceReserve. */
  releaseConvergenceReserve(scope: string): void;
  /**
  * Registers the repair round's MECHANICAL leg (RV3802), the money
  * twin of the RV3602 per-invocation pool: the round's finish
  * contract can grant one bounded mechanical repair turn, and the
  * third comparison run's round entered exactly that turn's price
  * short of certainty (the repair existed by pool and by contract,
  * but nothing guaranteed the money would still be there when the
  * candidate materialized). Held beside the verdict leg from the
  * moment the round is admitted; released EARLY, to the round's own
  * finish loop, at its first journaled verdict (a 'repair' verdict is
  * about to spend the freed money on the granted turn, an 'accepted'
  * one never needed it), where the verdict leg lives until the judge
  * dispatch. Exactly the convergence reserve mechanics otherwise:
  * joins the projected admission sum and both remainders, named in
  * the refusal clause, never joined to the severing check, idempotent
  * per account with the root adjusted by the delta.
  */
  commitRepairReserve(scope: string, reserveUsd: number): void;
  /** The round's finish loop consumes its leg; see commitRepairReserve. */
  releaseRepairReserve(scope: string): void;
  /** The reserve is replaced by real spend when the spawn settles. */
  releaseReserve(reserveUsd: number, accountScope?: string): void;
  /**
  * The in-flight exposure reservation (RV711). The per-turn guard
  * below checks money already SPENT, so N concurrent turns each pass
  * it before any settles and together can cross the ceiling by up to
  * one whole turn each; this is the opt-in bound on that hole. The
  * caller reserves the attempt's own worst-case estimate (the prompt
  * estimate plus the planned output allowance, priced by the SAME
  * price rows as the layer-2b clamp) right before the wire call and
  * releases at the attempt's settle, so the reservation lives exactly
  * as long as the exposure it covers. The admission refuses, typed
  * and without waiting, when spent + live reservations + this
  * estimate does not fit the cap; an exact fill admits, mirroring
  * admitSpawn, and a full cap refuses even a zero estimate. The tail
  * reserves (finalize and synthesis) stay OUT of the sum (RV2101):
  * the budget chain already fences them (remainingUsd subtracts the
  * synthesis promise, and the finalize carve-out nets out of the
  * orchestrator's own cap), so counting them here too made the cap
  * bind at cap minus reserves while the actual wire risk was far
  * below it: the fourth parity run's root was refused at spent
  * 4.71 + reserve 1.00 against 5.70 with zero live estimates, one
  * turn short of the synthesis the reserve existed to fund. A refusal
  * is TRANSIENT (in-flight money returns at settle), so it never
  * marks the run exhausted and never severs a stream. A model without
  * a price row reserves zero, exactly as it debits zero (the
  * once-per-model unpriced warning covers that hole). While an
  * attempt streams, its usage debits spentUsd with the reservation
  * still live, briefly counting the same money twice: conservative in
  * the safe direction, gone at release. Returns undefined (fully
  * inert) when the cap is not configured; layer-1 spawn reserves
  * (committedReserveUsd) stay out of the formula, because a child's
  * lifetime reserve and its own turn exposure would double-count.
  */
  reserveTurnExposure(servedBy: ModelRef, estimatedInputTokens: number, plannedOutputTokens: number, holderScope?: string): (() => void) | undefined;
  /**
  * The one release chokepoint of the exposure scalar (RV2001):
  * subtracts, snaps to exactly zero when no hold of any kind remains
  * (float subtraction leaves residue, and a residue would park the
  * exposure wait on money nobody holds), and wakes the parked
  * waiters. Spend never shrinks, so releases stay the only wake
  * source that can turn a refusal into a fit.
  */
  private settleExposureRelease;
  /**
  * The parked-waiter keepalive lifecycle (RV2003): armed with the
  * first waiter, disarmed with the last. The interval is REF'd on
  * purpose: the wait must hold the event loop open, because the
  * parity rerun's process exited silently with the parked root's
  * unsettled await as its only remaining work. Each tick sweeps for
  * the drained state as defense in depth; every REAL transition
  * already wakes waiters event-driven at its release.
  */
  private syncExposureKeepalive;
  /**
  * The terminal backstop of the exposure surface (RV2001, the third
  * parity rerun's quiescence deadlock): EVERY terminal of an agent
  * invocation (ok, error, exhausted, cancelled) returns whatever live
  * dispatch estimates that holder still has to the exposure budget.
  * The attempt settle owns the per-hold closure in a finally, so this
  * usually finds nothing; the parity crash proved a dispatch path can
  * die without its closure (three killed children left 0.478 USD of
  * live estimates parked against the cap forever, and the root's
  * exposure wait starved on money no live dispatch was holding). A
  * real release wakes the parked waiters exactly like the closure
  * does; a holder with nothing held is a free no-op. Returns the USD
  * actually returned.
  */
  releaseExposureHolder(holderScope: string): number;
  /**
  * Live exposure holders: agents with a nonzero held balance (RV2001).
  * Zero with live waiters means nothing can ever release, the drained
  * signal the quiescence machinery keys on.
  */
  get liveExposureHolderCount(): number;
  /** Live in-flight exposure currently held by open dispatches (RV1902). */
  get liveExposureUsd(): number;
  /**
  * Parks until the NEXT in-flight exposure hold releases (RV1902):
  * resolves 'released' on that wake, 'drained' immediately when no
  * hold is live (there is nothing to wait out, so the caller's refusal
  * is terminal for its turn), and 'aborted' when the signal fires
  * first. The waiter registers BEFORE any check, so a release racing
  * the caller's refusal is never lost; spend never shrinks, so
  * releases are the only wake source that can turn a refusal into a
  * fit.
  */
  awaitExposureRelease(signal?: AbortSignal): Promise<"released" | "drained" | "aborted">;
  /** Layer 2: the per-turn guard. A turn that would cross any ceiling in the chain is not dispatched. */
  beforeTurn(accountScope?: string): void;
  /**
  * Layer 2b, the pre-dispatch output bound: the output tokens the
  * remaining chain budget (min over capped ancestors of ceiling minus
  * spend) still affords from `servedBy` for an estimated prompt, priced
  * by the same function as settlement, long-context tiers included.
  * Undefined when no account in the chain carries a USD ceiling, when
  * the model has no price row (the once-per-model unpriced warning in
  * onUsage covers that hole), or when output is free. Zero or negative
  * means the turn cannot be dispatched within the budget.
  */
  /**
  * The tightest chain headroom of `accountScope` in plain USD (RV301):
  * exactly the remaining money the output clamp below prices, before
  * any pricing. Undefined when every account on the chain is uncapped;
  * never negative. The tool budget extension admits a grant against
  * this number.
  */
  remainingUsd(accountScope?: string): number | undefined;
  maxAffordableOutputTokens(servedBy: ModelRef, estimatedInputTokens: number, accountScope?: string): number | undefined;
  /**
  * The same layer-2b question asked of the IN-FLIGHT EXPOSURE ceiling
  * (RV2503): the output tokens `cap - spent - live estimates` still
  * affords from `servedBy` for an estimated prompt, priced by the
  * settlement function like every other estimate here.
  *
  * The clamp above has always existed for the budget ceiling while
  * {@link reserveTurnExposure} only ever answered yes or no, so a
  * turn whose FULL planned output overshot the exposure line was
  * refused outright even when a shorter one fit and the budget could
  * pay for it. The 1.226.0 comparison run died exactly there: it held
  * 0.8642 USD of budget, the exposure ceiling had 0.5642 USD of room,
  * the mandatory repair turn was estimated at 0.7066 USD against an
  * 18000 token output plan, and the dispatch was refused before any
  * provider call. The same turn, re-issued after the operator raised
  * the ceiling, wrote 12840 output tokens and cost 0.4788 USD: it fit
  * the ceiling that refused it, and a clamp to the ~13253 tokens the
  * room afforded would have let it run.
  *
  * Answered ONLY for a dispatch that is alone in flight, which is the
  * whole difference between a refusal that means something and one
  * that means nothing. With siblings live the refusal is TRANSIENT:
  * RV1902 parks on it and the turn runs at its full planned length
  * the moment one of them releases, so shortening it would trade a
  * complete answer for a truncated one and buy nothing. With nothing
  * live the refusal is PERMANENT (RV2003's sweep wakes such a waiter
  * 'drained' precisely because no hold will ever return), and the
  * only choices left are a shorter turn or no turn at all. The
  * concurrent-wave bound of RV711 is therefore untouched.
  *
  * Opt-in through `RunOptions.clampTurnToExposure`, so the drained
  * refusal terminals RV1902, RV2002 and RV2003 built out of live
  * parity deaths keep their shapes until a host asks for this one.
  *
  * Undefined when the clamp is not armed, when the cap is not
  * configured, when anything is in flight, or when the model has no
  * price row, so a run that declares nothing keeps every byte of its
  * historical path. Zero or
  * negative when the room cannot even pay for the prompt, the same
  * convention {@link maxAffordableOutputTokens} inherits from
  * `affordableOutputTokens`; the caller decides what a sub-floor
  * answer means, and the loop deliberately ignores one so a true
  * exposure exhaustion still refuses through
  * {@link reserveTurnExposure} with its own typed reason instead of
  * an output-floor verdict.
  */
  maxExposureOutputTokens(servedBy: ModelRef, estimatedInputTokens: number): number | undefined;
  /**
  * Live accounting; spend propagates from `accountScope` to every
  * ancestor. Crossing a ceiling severs the crossing account's subtree
  * via its layer-3 AbortSignal (overshoot bounded by one turn per
  * in-flight agent; providers bill severed streams).
  */
  onUsage(usage: Usage, servedBy: ModelRef, accountScope?: string): void;
  /**
  * The per-call marginal meter (RV1101). One meter covers ONE provider
  * call (the settled fold's billing basis, RV801): the loop feeds it
  * every mid-stream delta and the settle remainder of that call, and
  * each feeding debits the INCREMENT of the call's accumulated price
  * over what the call already paid, never the slice priced alone. The
  * telescoping sum equals the price of the call's total usage for any
  * pricing shape, so a long-context tier crossed by the accumulation
  * mid-call debits the retroactive re-price of the whole call at the
  * crossing slice, exactly the dollars settlement will record;
  * per-slice pricing could never see that crossing (no single slice
  * crosses the threshold, RV1101). A negative increment (a price
  * function that shrinks as usage grows) clamps to zero: a debit
  * never credits, spend stays monotone. Unpriced models and invalid
  * price results debit zero through the same once-per-model warnings
  * as onUsage. The tier still never fires on a run aggregate no
  * single call crossed: each call opens its own meter (RV504).
  */
  openCallMeter(servedBy: ModelRef, accountScope?: string): (delta: Usage) => void;
  /**
  * Prices one usage for debiting, owning both warning paths. A model
  * with no price row contributes zero, so a USD ceiling cannot bound
  * it. That is legitimate for a local model (it costs nothing) and a
  * silent hole for a model whose price row is merely missing, so the
  * ceiling says so out loud, once per model. The usage still surfaces
  * through CostReport.unpriced either way.
  */
  private debitableUsd;
  /** The one debit chokepoint: spend propagation, severing, telemetry. */
  private debitAccounts;
  spent(): Spend;
  /** Null when the run has no USD ceiling. */
  remaining(): Spend | null;
  private emitUpdate;
}
//#endregion
//#region src/journal/reuse.d.ts
/** Kernel contentHash of a spawn root entry. */
type SpawnKey = string;
/** Plan-node identity. */
type NodeId$1 = string;
/** The rich donor descriptor embedded in reuse verdicts. */
interface DonorRef {
  /** Head of the link chain. */
  nodeId: NodeId$1;
  /** Seq of the donor's root entry. */
  rootEntryRef: EntryRef;
  /** Transitive chain, oldest first. */
  chain: NodeId$1[];
  spawnKey: SpawnKey;
  /** Lineage continues through the link (DEF-3). */
  logicalTaskId: LogicalTaskId;
  /** Paid under the chain at the verdict snapshot. */
  paidUsd: number;
}
/** Graft bootstrap payload. */
interface GraftBoot {
  /** Retained by the abandon entry, when it was. */
  checkpointRef?: string;
  /** Deterministic sum of match-eligible payments. */
  eligiblePaidUsd: number;
  worktreePinned: boolean;
}
/** Telemetry for a SpawnKey match admitted fresh. */
interface DedupNote {
  spawnKey: SpawnKey;
  donorNodeId: NodeId$1;
  reason: "donor_failed" | "no_paid_entries" | "graft_unsafe" | "donor_active";
}
/** The reuse block of AdmissionConfig. */
interface ReuseConfig {
  /** Default true. */
  enabled?: boolean;
  /** Default true. */
  allowGraft?: boolean;
  /** Default 2 (Appendix A). */
  maxOscillationsPerKey?: number;
  /** Optional RevisionGuards trigger on netLostUsd. */
  maxAbandonedNetUsdFraction?: number;
}
declare const DEFAULT_MAX_OSCILLATIONS_PER_KEY = 2;
/** The consumer-facing reuse mark on results. */
interface AgentResultMeta {
  reusedFrom?: {
    nodeId: NodeId$1;
    rootEntryRef: EntryRef;
    mode: "full" | "graft";
    reclaimedUsd: number;
  };
}
/** The node.link entry value: an ordinary content-keyed effect entry. */
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
  /** full is shareable, graft is exclusive. */
  claim: "shared" | "exclusive";
  checkpointRef?: string;
  reclaimedUsdAtLink: number;
  donorRootRef: EntryRef;
}
/**
* node.link identity: sha256 of {kind, spawnKey,
* donorScope, targetNodeId}; targetNodeId is deterministic on replay
* because NodeIds are assigned inside plan.revision.
*/
declare function nodeLinkKey(spawnKey: SpawnKey, donorScope: string, targetNodeId: NodeId$1): string;
/** The abandoned-spend ledger fold. */
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
/** One donor candidate surfaced by the DedupIndex fold. */
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
  /** Scope chain for transitive drainage, oldest first. */
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
  /** node.link values keyed by targetScope: chain ancestry for donors. */
  private readonly linkByTargetScope;
  private readonly spend;
  static fold(entries: readonly JournalEntry[], options?: {
    priceUsd?: (servedBy: ModelRef | undefined, usage: Usage) => number | undefined;
  }): DedupIndex;
  /** Unclaimed donor candidates for a key, oldest (chain head) first. */
  donorsOf(spawnKey: SpawnKey): DonorCandidate[];
  /** Every donor for a key including claimed ones (diagnostics). */
  allDonorsOf(spawnKey: SpawnKey): DonorCandidate[];
  /** Link count per key: the oscillation counter. */
  oscillationCountOf(spawnKey: SpawnKey): number;
  abandonedSpend(): AbandonedSpendView;
}
/**
* The four-outcome verdict evaluation on a SpawnKey match, computed
* once live at the fold head and embedded into the
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
//#region src/orchestrator/admission.d.ts
/** Plan-node identity; engine-minted ULID. */
type NodeId = string;
/** Layer-1 reservation embedded in the carrying decision entry. */
interface BudgetReserve {
  reserveUsd: number;
  /** The child sub-account ceiling; absent when the parent is uncapped. */
  childCeilingUsd?: number;
  /**
  * The reserve derivation (RV2004): where reserveUsd came from, so a
  * journal reader never reverse-engineers the arithmetic. 'estCost'
  * is the declared estimate (spawn opts or the agentType profile),
  * 'default' the engine flat reserve.
  */
  source?: "estCost" | "default";
  /**
  * Set when the derived reserve was clamped DOWN to the child's
  * ceiling: 'explicit-budget' by a declared budgetUsd,
  * 'fraction-ceiling' by the childBudgetFraction allowance an ORIGIN
  * WITH a materialized allowance account enforces (ctx.workflow).
  * The spawn-tool path never carries 'fraction-ceiling': its
  * dispatch enforces no fraction account, and journaling that clamp
  * is exactly the parity rerun's 0.50-versus-0.70 lie (RV2004).
  */
  clampedBy?: "explicit-budget" | "fraction-ceiling";
}
/** The lineage block every non-reject verdict carries (DEF-3). */
interface AdmitLineage {
  logicalTaskId: LogicalTaskId;
  isNew: boolean;
  depth: number;
}
/**
* The unified admission verdict (XF-11). One union,
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
/** The merged reject-code set. */
type AdmitRejectReason = {
  code: "depth" | "quota" | "budget" | "lifetime" | "termination_exhausted" | "ladder_exceeds_frozen" | "lineage_exhausted" | "lineage_busy";
} | {
  code: "osc_guard";
  spawnKey: SpawnKey;
  oscillationCount: number;
} | {
  /**
  * The sequential roster feasibility refusal (RV2005): under a
  * declared acceptance.minSpawnedChildren, the whole remaining
  * roster (priced at this seat's own projection) plus the live
  * in-flight exposure does not fit the parent remainder, so the
  * FIRST infeasible seat refuses before any child is paid. The
  * batchGate symmetry (RV1908) on the seat-by-seat path the
  * parity rerun's model actually took, where three seats were
  * paid in full under a floor of four the money could never
  * reach.
  */
  code: "roster_floor";
  floor: number;
  admittedChildren: number;
  seatsRemaining: number;
  perSeatProjectionUsd: number;
  liveExposureUsd: number;
  remainderUsd: number;
} | {
  /**
  * The declared estimate cannot fit the child's own ceiling: the
  * host said the work costs more than the budget buys, so the op
  * is bounced with the actionable correction BEFORE it changes
  * plan state or consumes a spawn unit (the v1.7.0 follow-up
  * review's P1). Heuristic reserves never produce this code; they
  * clamp to the allowance instead.
  */
  code: "reserve_exceeds_budget";
  agentType: string;
  childAccount: string;
  estCostUsd: number;
  resolvedReserveUsd: number;
  childCeilingUsd: number;
  minimumBudgetUsd: number;
  message: string;
};
/** Every spawn origin routed through the single admission point. */
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
  /** Explicit child budget; clamped by childBudgetFraction. */
  budgetUsd?: number;
  /** Reserve hint; falls back to the flat engine default. */
  estCostUsd?: number;
  /**
  * Same-batch reserves already admitted read-only but not yet
  * committed (a multi-op plan revision): the read-only branch adds
  * them to this spawn's reserve so every embedded admit of one batch
  * is dispatchable under the same snapshot, not just the first.
  */
  pendingReserveUsd?: number;
  /**
  * The sequential roster feasibility inputs (RV2005), passed by the
  * SINGLE spawn_agent path when acceptance.minSpawnedChildren is
  * declared: the admission projects the whole REMAINING roster at
  * this seat's own dispatch projection, live in-flight exposure
  * included, and refuses the first infeasible seat typed
  * 'roster_floor' before any child is paid. Batch seats never carry
  * this: the RV1908 batchGate already judged their batch entire.
  */
  roster?: {
    floor: number;
    admittedChildren: number;
    liveExposureUsd: number;
  };
  /**
  * Lineage continuation (DEF-3); absence mints a fresh lineage root. A
  * continuation demands a causeRef: the seq of the entry that caused the
  * rebirth.
  */
  lineage?: SpawnLineageOpt;
  /** Raw approach tag; normalized by the engine. */
  approach?: string;
  /** Decomposition parent-LTID chain (relation 'decompose-child' only). */
  ancestry?: LogicalTaskId[];
  /**
  * Coarse-signature identity inputs; unspecified fields canonize onto
  * the deterministic legacy constants so signatures stay byte-stable
  * (the toolset/schema registries land in M7-T05).
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
  * counts its own children.
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
  /** Node identity minted inside the decision; absent on reject. */
  nodeId?: NodeId;
  /**
  * The computed value-part lineage block (DEF-3): reused byte-exact on
  * replay, never recomputed. Absent on reject.
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
/**
* The ONE dispatch-projection reserve formula (the 1.63.0 experiment
* review, P0.3): the spawn's declared estimate (a spawn tool has no
* per-call estCost channel, so the estimate is the agentType profile's)
* or the flat default, clamped by the explicit child budget when one
* exists. This is the reserve the embedded layer-2 gate evaluates a
* spawn_agent call against BEFORE dispatch, and the number
* preflightEstimate projects for the same gate, so the linter and the
* runtime cannot drift: both call this function.
*/
declare function dispatchProjectionReserveUsd(spec: {
  estCostUsd?: number;
  budgetUsd?: number;
}, flatReserveUsd: number): number;
/**
* Worst-case claim judge dispatches of a declared posture
* (RV3402/RV4001): `'both'` dispatches the judge at the draft AND the
* final, and an armed repair round (`onFound: 'repair'`, which intake
* refuses at stage 'draft') rejudges the repaired composition once
* more. Absent declarations read as the historical one pass.
*/
declare function acceptanceJudgePasses(stage?: "draft" | "final" | "both", onFound?: "report" | "carry" | "fail" | "repair"): number;
/**
* The declared semantic posture the round arithmetic reads (RV4304):
* the SAME four declarations the acceptance tail already took, named
* as one shape so money and wires derive from one arming function.
*/
interface SemanticRoundPosture {
  /** Mirrors OrchestrateClaimConsistency.stage; absent reads 'draft'. */
  claimStage?: "draft" | "final" | "both";
  /** Mirrors OrchestrateClaimConsistency.onFound; absent reads 'report'. */
  claimOnFound?: "report" | "carry" | "fail" | "repair";
  /** Mirrors OrchestrateCitationAudit.onFound; 'repair' arms the audit's round. */
  citationOnFound?: "report" | "repair" | "fail";
  /** True when a claim-consistency pass is declared. */
  claimConfigured?: boolean;
}
/** What the declared posture arms (RV4304): the one derivation. */
interface SemanticRoundArming {
  /** The claim pass's own bounded round ('repair', never at 'draft'). */
  claimRoundArmed: boolean;
  /** The citation audit's bounded round. */
  citationRoundArmed: boolean;
  /** Any armed round: exactly one composition is bought either way (RV4202). */
  roundArmed: boolean;
  /**
  * The citation round rewrote the shipped document, so a configured
  * claim pass past the draft rejudges it, ONE more claim pass; with
  * the claim round ALSO armed the two are the same merged round and
  * its own rejudge already counts, so this is false there (RV4202).
  */
  citationRoundRejudgesClaim: boolean;
}
/**
* The ONE arming derivation (RV4304): the acceptance tail's money and
* the capacity estimate's wires both read it, the
* {@link dispatchProjectionReserveUsd} precedent, so the two cannot
* disagree about which rounds a declared posture arms. The sixth
* comparison run's capacity model priced the round as a constant 2
* while the merged round (RV4202) dispatches 3 wires; this function is
* where that distinction lives now.
*/
declare function semanticRoundArming(posture: SemanticRoundPosture): SemanticRoundArming;
/** The declared inputs of the acceptance tail (RV4001); undeclared estimates are zero. */
interface AcceptanceTailSpec extends SemanticRoundPosture {
  /** The held synthesis payload reserve, exactly budget.synthesisReserveUsd. */
  synthesisReserveUsd?: number;
  /** The claim judge's declared admission estimate, claimConsistency.judge.estCost. */
  claimJudgeEstCostUsd?: number;
  /** The mechanical repair turn's declared price, finishValidation.estRepairCostUsd. */
  finishEstRepairCostUsd?: number;
  /** The declared price of one composition, synthesis.estCost. */
  synthesisEstCostUsd?: number;
  /**
  * The citation audit judge's declared estimate (RV4004),
  * citationAudit.judge.estCost. The audit pays one pass, two under
  * its own armed repair round, and that round also pays one more
  * composition plus (when a claim pass is configured past the draft)
  * one more claim rejudge; all of it enters the tail exactly like
  * the claim terms, declared or zero.
  */
  citationJudgeEstCostUsd?: number;
  /** One coordination turn floor: the resolved flat reserve of the run. */
  workingRoomUsd: number;
}
/** The resolved terms behind {@link acceptanceTailRequiredUsd}; journal-ready numbers. */
interface AcceptanceTailTerms {
  synthesisReserveUsd: number;
  judgeEstUsd: number;
  /** Worst-case judge dispatches: ('both' ? 2 : 1) plus one under an armed repair round. */
  judgePasses: number;
  estRepairCostUsd: number;
  /** One more composition when the repair round is armed, priced at synthesis.estCost. */
  roundCompositionUsd: number;
  /**
  * The citation audit judge terms (RV4004), present in the sum only
  * when the audit is declared: `citationJudgePasses` is 1, 2 under
  * the audit's own armed round (which also arms the composition term
  * above and, with a claim pass configured past the draft, one more
  * claim rejudge inside `judgePasses`).
  */
  citationJudgeEstUsd?: number;
  citationJudgePasses?: number;
  workingRoomUsd: number;
}
/**
* The ONE acceptance-tail formula (RV4001, the fifth comparison
* experiment): what the effective cap must cover, at exact fill or
* better, so the acceptance machinery the host declared is funded and
* not started on luck. The RV3907 runtime gate landed WITHOUT a
* preflight twin: preflight kept its own advisory arithmetic on
* different terms, passed the experiment's plan green at a $4.54 cap,
* and the runtime then refused the same plan typed at $4.82 before the
* first wire; worse, the runtime undercounted the judge passes of
* `stage: 'both'` (one where the worst case dispatches two) while
* preflight counted them right, so the two calculators disagreed in
* BOTH directions. The gate and the preflight `acceptanceReserve`
* report block now both call this function, exactly the
* {@link dispatchProjectionReserveUsd} precedent: one formula, so the
* linter and the runtime cannot drift. Undeclared estimates contribute
* zero: the tail binds exactly what the host declared. The armed
* repair round (`onFound: 'repair'`, never at stage 'draft', which
* intake refuses) adds one judge pass and one composition priced at
* the declared `synthesis.estCost`.
*/
declare function acceptanceTailRequiredUsd(spec: AcceptanceTailSpec): {
  requiredUsd: number;
  terms: AcceptanceTailTerms;
};
/**
* The one rendering of the tail arithmetic (RV4001): the runtime
* refusal message and the preflight finding print this same string, so
* an operator can diff them by eye and a test can assert them equal.
*/
declare function formatAcceptanceTailTerms(terms: AcceptanceTailTerms): string;
/**
* The declared wire counts of one orchestration plan (RV4005). Since
* RV4206 the intake is CLOSED: an unknown key is a typed ConfigError
* instead of a silent zero. The sixth comparison experiment's harness
* passed `repairRound` and `transportRetries` (plausible names this
* spec never had) and `childWires: 4` for four children of ten turns
* each; every unknown key was ignored and the estimate answered
* confidently for a plan nobody had declared.
*/
interface WireCapacitySpec extends SemanticRoundPosture {
  /**
  * Fan-out provider dispatches: children TIMES their turns, the
  * total, not the child count. Optional since RV4206 when the
  * structural pair below is given; declaring both is legal only when
  * they agree (`childWires === children * turnsPerChild`), refused
  * typed otherwise.
  *
  * The semantic posture fields inherited from
  * {@link SemanticRoundPosture} (RV4304) switch the estimate from the
  * legacy constant round to the declared arithmetic: with ANY of them
  * declared, the judge wire counts are COMPUTED from the posture
  * (a manually declared `judgeWires`/`citationJudgeWires` must agree
  * or refuses typed, the childWires-contradiction symmetry), and
  * `repairRoundDeltaWires` is derived by the same
  * {@link semanticRoundArming} the acceptance tail prices, so money
  * and wires cannot disagree: 0 with nothing armed, 2 for a lone
  * claim or citation round, 3 for the merged round or a citation
  * round that rejudges a configured claim pass. With none of them
  * declared the historical bytes hold exactly: the delta is the
  * documented legacy constant 2 (assume one single-judge round).
  */
  childWires?: number;
  /**
  * The structural fan-out declaration (RV4206): `children` workers of
  * `turnsPerChild` provider dispatches each. Declare BOTH or neither;
  * the pair exists because `childWires` invites passing the child
  * count where the wire total belongs, the exact call the sixth
  * comparison harness made.
  */
  children?: number;
  /** See `children`; the two resolve to `children * turnsPerChild` fan-out wires. */
  turnsPerChild?: number;
  /** Coordination loop dispatches, the finish exchanges included. */
  coordinationWires?: number;
  /** Composition invocations of the base plan (the initial synthesis). */
  synthesisWires?: number;
  /**
  * Worst-case claim judge dispatches; feed
  * {@link acceptanceJudgePasses} the declared posture to get it. NOTE:
  * that count already includes the armed round's rejudge, while the
  * estimate below prices the round's delta separately, so pass the
  * UNARMED reading here ((stage === 'both') ? 2 : 1) when you intend
  * to read `repairRoundDeltaWires` as the whole round.
  */
  judgeWires?: number;
  /**
  * Citation entailment audit judge dispatches (RV4206): one per pass,
  * so 1 unarmed and the UNARMED reading here too when you read
  * `repairRoundDeltaWires` as the whole round. The audit's wires were
  * previously unnameable in this spec while the acceptance tail
  * priced their money: the sixth comparison run's capacity model
  * simply lost them.
  */
  citationJudgeWires?: number;
  /** Separate extract dispatches, when the finish rides one (RV3908 spares the schema'd final). */
  extractWires?: number;
  /**
  * Mirrors OrchestrateOptions.maxTotalRepairRounds (RV4406, scoped
  * by RV4705): the one run-wide pool every provider-dispatching
  * repair grant consumes from. Declared, the estimate reports
  * `repairWiresCeiling`, the pool-bounded worst case of every repair
  * wire; the eighth comparison rerun's plan had a one-token pool
  * under an armed round plus a mechanical grant, a worst case the
  * estimate could not express.
  */
  maxTotalRepairRounds?: number;
  /**
  * Mirrors OrchestrateOptions.maxSemanticRepairRounds (RV4705): the
  * scoped semantic reserve inside the pool. It shrinks the
  * mechanical share of `repairWiresCeiling` exactly like the runtime
  * split; greater than the declared total refuses typed, the intake
  * contradiction.
  */
  maxSemanticRepairRounds?: number;
}
/** What one orchestration plan costs in wires, base and worst case (RV4005). */
interface WireCapacityEstimate {
  /**
  * What these numbers ARE (RV4206): a fold over the counts the
  * caller DECLARED, never a measurement of a run. The literal exists
  * so a capacity report that embeds the estimate carries its
  * provenance on its face, the `CostReport.basis` precedent: the
  * sixth comparison run's answer presented a declared estimate over
  * a misdeclared plan as the runtime's own economics.
  */
  basis: "declared-estimate";
  /** The plan's wire total with no repair of any kind. */
  baseWires: number;
  /**
  * The armed semantic repair round's delta. With no posture declared:
  * the legacy constant 2, ONE more composition PLUS ONE more judge
  * pass (RV3307; the fifth comparison run modeled 34 to 35 and lost
  * the decisive correctness point to exactly this). With the posture
  * declared (RV4304): derived by the same {@link semanticRoundArming}
  * the acceptance tail prices, so 0 with nothing armed, 2 for a lone
  * round, and 3 for the merged round or a citation round that
  * rejudges a configured claim pass, which the sixth comparison
  * run's constant could not express.
  */
  repairRoundDeltaWires: number;
  /** Each granted mechanical repair turn is one more wire on its invocation. */
  mechanicalRepairDeltaWires: number;
  /** baseWires + repairRoundDeltaWires. */
  wiresWithRound: number;
  /** repairRoundDeltaWires / baseWires: the round's overhead share. */
  roundOverheadShare: number;
  /**
  * The pool-bounded worst case of every repair wire (RV4705),
  * present exactly when `maxTotalRepairRounds` was declared: each
  * pool token is one repair event, so the ceiling maximizes over the
  * round dispatched beside the mechanical grants the pool still
  * holds (mechanics never draw the declared reserve, and the round
  * consumes at least one token) and the all-mechanical pool. Absent,
  * the pool is undeclared and repair wires are bounded only by the
  * stage bounds the spec does not carry.
  */
  repairWiresCeiling?: number;
}
/**
* The wire capacity of a declared orchestration plan (RV4005, the
* fifth comparison experiment): base wires by declaration, the armed
* repair round's delta, and the round's overhead share, from ONE
* exported function so an answer about the runtime's own economics
* has a source instead of an improvisation. The experiment's terminal
* answer wrote "34 wires without repair, 35 with" and multiplied
* retry share as `1 + r`: the round is TWO wires (its composition
* plus the rejudge, `orchestrate.ts`'s own doctrine), so 34 becomes
* 36 at 5.88 percent overhead, and r retries over a base of B
* multiply wires by `1 + r/B` ({@link retryWireMultiplier}), not by
* `1 + r`.
*/
declare function wireCapacityEstimate(spec: WireCapacitySpec): WireCapacityEstimate;
/**
* The retry share of a wire plan (RV4005): r retries over a base of B
* wires re-dispatch r of the B, so totals scale by `1 + r/B`. The
* fifth comparison run's answer multiplied by `1 + r`, reading every
* retry as a whole extra plan.
*/
declare function retryWireMultiplier(baseWires: number, retries: number): number;
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
    flatReserveUsd?: number;
    /**
    * Controller-lifetime cap on ADMITTED spawns, enforced at this
    * controller's own gate with the 'lifetime' reject reason, for
    * hosts driving an AdmissionController directly. Engine runs do
    * not wire this option: they cap total spawns through the budget
    * (`budgetDefaults.lifetimeSpawnCap`, the same 'lifetime' reason).
    */
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
  * Binds the run's TerminationAccount (DEF-2; PlanRunner runs only):
  * from bind time on, every admitted spawn of any
  * origin debits one spawnUnit atomically with its decision entry, and
  * a declared ladder longer than the frozen kMax rejects with
  * ladder_exceeds_frozen. Non-PlanRunner runs never bind an account and
  * keep the engine lifetime cap semantics unchanged.
  */
  bindTermination(account: TerminationAccount): void;
  /** The bound account, when this is a PlanRunner run (DEF-2). */
  get termination(): TerminationAccount | undefined;
  /**
  * The lineage half of admission (DEF-3): folds are
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
  /**
  * The reserve the DISPATCH layer will actually commit for this spec:
  * the estimate (or the flat default) clamped by the explicit child
  * budget when one exists, because only an explicit budget opens a
  * child-allowance account at dispatch; the childBudgetFraction cap
  * never materializes as an account and must not shrink the
  * projection. The token-count-priced estimate of ctx.agent is
  * unreachable here (async); a divergence there lands as a journaled
  * dispatch rejection instead of a strand. Delegates to the exported
  * {@link dispatchProjectionReserveUsd} so the live gate and
  * preflightEstimate share ONE formula (the 1.63.0 experiment review,
  * P0.3).
  */
  projectedDispatchReserveUsd(spec: Pick<AdmitSpec, "estCostUsd" | "budgetUsd">): number;
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
  * itself sits in the root ledger seed.
  */
  recoverSettled(parentAccountScope: string): void;
  /**
  * Resume roll-forward for an admission whose decision entry exists but
  * whose child has NOT settled: re-applies the recorded reserve and
  * counters without re-evaluating any limit (replay never
  * re-evaluates admission; reserves are recovered, never
  * re-estimated).
  */
  recoverInFlight(parentAccountScope: string, verdict: AdmitVerdict): void;
}
//#endregion
//#region src/l0/spi/admission.d.ts
/**
* The durable admission SPI (plan 45, rfcs/admission.md): the
* scheduler and queue seam that answers "when may this work START,
* and in what order relative to competing tenants". Deliberately
* SPLIT from QuotaLimiter (the hot-path wire counter, live only, no
* ordering): fairness is an ordering property over waiting work, a
* counter has no queue, and the two seams degrade independently. A
* granted ticket never exempts a wire from quota; the engine keeps
* consulting the limiter per wire, unchanged.
*
* Contract highlights implementations MUST honor:
* - `enqueue` is a conditional create under the caller-minted
*   `(unitId, generation)` identity: enqueueing the same unit twice
*   returns the SAME ticket, so a caller that crashed after enqueue
*   recovers its ticket by its own identity instead of minting an
*   orphan grant plus a duplicate queue entry.
* - Every lifecycle call carries a stable operation id and is
*   idempotent by it; each transition updates the ticket state AND all
*   matched bucket rows atomically (one transaction or CAS), so no
*   crash between "state moved" and "buckets moved" double-counts or
*   leaks capacity.
* - `denied` is a TERMINAL verdict distinct from waiting in `queued`:
*   an infeasible request (its reservation exceeds a matched bucket's
*   TOTAL capacity) refuses at enqueue and never camps at the head of
*   a queue starving everyone behind it.
* - Of a racing release, expiry, and cancel exactly one wins per
*   ticket; the losers are durable no-ops, never second refunds.
* - Admission is an environmental fact, like the limiter: the run
*   journal never records scheduler state, and replay of a run must
*   not depend on it. A resumed run recovers its ticket by
*   `(unitId, generation)`, never by hoping it retained an id.
* - A denial surfaces to the engine as the same synthetic
*   rate-limit-class refusal the limiter uses; `retryAfterMs` on a
*   queued verdict is honored verbatim by the caller's backoff.
*/
/** The four reservation measures (RFC section 4.3). */
interface AdmissionReservation {
  /** The one scheduler COST unit; everything else gates feasibility. */
  wires: number;
  inputTokens?: number;
  usd?: number;
  exposureUsd?: number;
}
/** Normalized scope dimensions, exactly the quota request's shape. */
interface AdmissionScopeDimensions {
  tenant?: string;
  account?: string;
  project?: string;
  legalDomain?: string;
  region?: string;
  providerAccount?: string;
  sponsor?: string;
}
interface AdmissionRequest {
  /** Caller-minted unit identity: the run id, typically. */
  unitId: string;
  /** The unit's incarnation token (RunMeta.genesis, typically). */
  generation: string;
  /**
  * The RESOLVED effective tenant, computed by exactly the tenantFrom
  * resolution the limiter request uses: the engine-configured tenant
  * by default, the scope's under `quota.tenantFrom: 'scope'`. Carried
  * as its own field so the two seams debit the SAME identity.
  */
  resolvedTenant?: string;
  /**
  * True when the deployment declared `tenantFrom: 'scope'`, the one
  * configuration in which a disagreement between `resolvedTenant`
  * and `scope.tenant` has a documented meaning; outside it the
  * disagreement refuses typed (RFC section 4.1, item 1).
  */
  tenantFromScope?: boolean;
  scope?: AdmissionScopeDimensions;
  /** Fairness weight of the member; positive, default 1. */
  weight?: number;
  reservation: AdmissionReservation;
  /** Host-flagged emergency work; admitted from the reserve fraction. */
  emergency?: boolean;
}
type AdmissionTicketState = "queued" | "granted" | "released" | "refunded" | "expired" | "denied";
interface AdmissionTicket {
  unitId: string;
  generation: string;
  state: AdmissionTicketState;
  resolvedTenant?: string;
  scope?: AdmissionScopeDimensions;
  reservation: AdmissionReservation;
  weight: number;
  /** Store-assigned, totally ordered per queue; the SFQ tie-break. */
  arrivalSeq: number;
  /** Start-time fair queuing tags (RFC section 4.2, item 3). */
  startTag: number;
  finishTag: number;
  /** Millisecond instants of the injectable clock. */
  enqueuedAtMs: number;
  grantedAtMs?: number;
  /** The grant lease; expiry settles conservatively (section 4.3). */
  leaseExpiresAtMs?: number;
  /** Monotone high-water cover of consumption (checkpoint THEN consume). */
  cover?: AdmissionReservation;
  deniedReason?: string;
}
type AdmissionTicketDecision = {
  state: "granted";
  ticket: AdmissionTicket;
} | {
  state: "queued";
  ticket: AdmissionTicket;
  position: number;
  retryAfterMs?: number;
} | {
  state: "denied";
  reason: string;
};
/** The recovery answer for a resumed unit (RFC section 4, item 5). */
type AdmissionRecovery = {
  state: "granted";
  ticket: AdmissionTicket;
} | {
  state: "queued";
  ticket: AdmissionTicket;
  position: number;
} | {
  state: "unknown";
};
interface AdmissionScheduler {
  /**
  * Conditional create by `(unitId, generation)` plus immediate grant
  * when every matched level admits; `opId` makes retries idempotent.
  */
  enqueue(request: AdmissionRequest, opId: string): Promise<AdmissionTicketDecision>;
  /**
  * The resumed unit's recovery: `granted` renews the lease, a queued
  * ticket reports its surviving position, and `unknown` means
  * re-enqueue (the conservative direction).
  */
  recover(unitId: string, generation: string, opId: string): Promise<AdmissionRecovery>;
  /** Renews a granted ticket's lease; unknown tickets are no-ops. */
  renew(unitId: string, generation: string, opId: string): Promise<void>;
  /**
  * Durably checkpoints a consumption cover BEFORE the covered batch
  * (the intent-before-effect doctrine applied to capacity): monotone
  * high-water, idempotent by opId, and lease-carried: a fenced store
  * rejects an expired lease's cover write, which is what makes the
  * conservative expiry refund provable rather than optimistic.
  */
  checkpointCover(unitId: string, generation: string, cover: AdmissionReservation, opId: string): Promise<void>;
  /**
  * Release with actuals: the unused remainder refunds to each level,
  * over-consumption beyond the reservation lands as bucket debt (it
  * never denies retroactively), and a late settlement after expiry is
  * accepted idempotently as debt rather than discarded.
  */
  release(unitId: string, generation: string, actuals: AdmissionReservation, opId: string): Promise<void>;
  /** Cancels a queued ticket (nothing to refund); granted ones release. */
  cancel(unitId: string, generation: string, opId: string): Promise<void>;
  /**
  * The failover transfer (RFC section 4.2, item 4): atomically
  * acquires the TARGET hierarchy's capacity and level-2 slot and
  * releases the source hierarchy in the same transition, BEFORE the
  * target dispatches. A failed transfer leaves the source binding
  * unchanged and the target undispatchable: no window exists in which
  * work runs on a provider account whose slot it never held.
  */
  rebind(unitId: string, generation: string, target: {
    scope: AdmissionScopeDimensions;
  }, opId: string): Promise<AdmissionTicketDecision>;
  /**
  * Advances the scheduler: expires stale leases (conservative
  * settlement), then grants queued tickets in SFQ order while every
  * matched level admits. Returns the newly granted tickets.
  */
  pump(opId: string): Promise<AdmissionTicket[]>;
}
//#endregion
//#region src/admission/engine-bracket.d.ts
/** The `createEngine` admission configuration. */
interface EngineAdmissionConfig {
  scheduler: AdmissionScheduler;
  /** The per-run reservation; default one wire. */
  reservation?: AdmissionReservation;
  /** Queued-wait poll interval when the scheduler names no retryAfterMs. */
  pollMs?: number;
  /** Lease renew cadence; default four polls. */
  renewMs?: number;
  /**
  * The effective tenant, when the deployment runs admission without a
  * quota limiter; a configured `quota.tenant` takes precedence so the
  * two seams debit the SAME identity (RFC section 4.1).
  */
  tenant?: string;
  /** Mirrors quota.tenantFrom for limiter-less deployments. */
  tenantFrom?: "scope";
}
declare function validateEngineAdmissionConfig(config: EngineAdmissionConfig | undefined): void;
interface AdmitRunUnitInput {
  unitId: string;
  generation: string;
  scope?: AdmissionScopeDimensions;
  resolvedTenant?: string;
  tenantFromScope?: boolean;
}
/**
* Admits one run unit: resolves when the ticket is granted, throws the
* typed AdmissionRejectedError on the terminal denied verdict, and
* returns the settle teardown (clear the renew timer, release).
*/
declare function admitRunUnit(config: EngineAdmissionConfig, unit: AdmitRunUnitInput): Promise<() => Promise<void>>;
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
/** Escalation hook: decides for value-form calls. */
type OnEscalation = (result: EscalatedResult<unknown>) => EscalationDecision | Promise<EscalationDecision>;
/**
* The mode (a) runner for human-authored closures. Determinism is enforced
* by convention, lint, and the ctx shims, NOT by a VM: only the sequence
* of keys must be stable. Bare-nondeterminism detection is ENGINE-owned
* since RV-209: the engine wraps its `execute` call in
* `withDeterminismDetection` (runner/determinism.ts), which classifies
* bare Date.now/Math.random callers, emits the structured
* `determinism:warning` event on the run's stream, and under
* `determinism.mode: 'error'` rejects the run with a typed
* DeterminismError. The runner itself is a pure executor, so the frozen
* ScriptRunner seam carries no detection surface; a standalone execute
* outside an engine runs without detection.
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
//#region src/runner/determinism.d.ts
/**
* Detection modes. 'off': never detect. 'warn' (the default, and the
* pre-RV-209 behavior): detect outside production (NODE_ENV !==
* 'production'), emit one `determinism:warning` event and one process
* warning per category per segment, never reject. 'error': detect in
* EVERY environment including production, and reject the run at the
* first workflow-origin call with a typed DeterminismError (the strict
* gate for replay-verified pipelines).
*/
type DeterminismMode = "off" | "warn" | "error";
/** Host configuration for the guard (CreateEngineOptions.determinism). */
interface DeterminismConfig {
  mode?: DeterminismMode;
  /**
  * Caller frames matching any pattern are exempt by explicit host
  * decision: classified 'allowlisted' in the emitted event, never a
  * process warning, never a rejection. A string matches as a
  * substring of the frame; a RegExp matches by test. Patterns match
  * the RAW frame, before any redaction. Installed dependencies
  * (node_modules) and Node runtime frames (`node:` specifiers) are
  * exempt WITHOUT configuration and emit nothing at all.
  */
  allowlist?: ReadonlyArray<string | RegExp>;
  /**
  * Redaction hook for public telemetry: applied to the frame and the
  * parsed file path before they leave in events, process warnings, and
  * DeterminismError data, so absolute host paths need not reach an
  * OTel backend. Default: identity.
  */
  redact?: (frame: string) => string;
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
/** One billing component of a priced usage: its token base and dollars. */
interface PricedComponent {
  tokens: number;
  usd: number;
}
/**
* The four components a provider statement itemizes (RV812): uncached
* input, output, cached input, cache writes, each with its token base
* and dollars. Decomposed with EXACTLY the arithmetic of
* {@link priceUsdOf}, which is defined as the sum of these four terms
* in this order, so a statement reconciliation and the settled fold
* can never disagree about what a usage costs.
*/
interface PricedComponents {
  /** The uncached prompt remainder: inputTokens minus both cache subsets, clamped at zero. */
  input: PricedComponent;
  output: PricedComponent;
  cachedInput: PricedComponent;
  cacheWrite: PricedComponent;
}
/**
* Decomposes one usage against one pricing row into the four billing
* components. Under the Usage invariant inputTokens is the FULL prompt
* including cache reads and writes, so the input rate bills only the
* uncached remainder and cache tokens bill at their own rates, never
* twice; a row that omits a cache rate bills those tokens at the plain
* input rate rather than silently for free. A row may carry
* long-context tiers: the highest threshold strictly below the full
* prompt re-prices the ENTIRE request (input-side rates scale by
* inputMultiplier, the output rate by outputMultiplier). Cache writes
* price at the 5m premium rate by default; when the usage carries the
* TTL split (RV810: `cacheWrite5mTokens` and `cacheWrite1hTokens`,
* filled by adapters whose provider distinguishes write TTLs), the 1h
* share prices at `cacheWrite1hUsdPerMTok` (falling back to the plain
* write rate when the row lacks it) and everything the 1h share does
* not claim, the 5m share plus any unattributed remainder an upstream
* invariant violation left, bills at the write rate, never silently
* for free. The component's `tokens` stays the WHOLE
* `cacheWriteTokens` either way, so statement reconciliation keys are
* unchanged.
*/
declare function priceComponentsOf(pricing: Pricing, usage: Usage): PricedComponents;
/**
* Dollars from normalized usage against one pricing row: the sum of the
* {@link priceComponentsOf} terms in their declared order, byte for
* byte the historical expression (uncached input, output, cached input,
* cache writes).
*/
declare function priceUsdOf(pricing: Pricing, usage: Usage): number;
/**
* The output tokens `remainingUsd` still buys from one pricing row after
* paying for an estimated prompt of `estimatedInputTokens`, priced with
* the same tier rules as settlement (the tier is selected by the
* estimated prompt). Floored to whole tokens; zero or negative means not
* even one output token fits, so the turn must not be dispatched.
* Undefined when the row prices output at zero (a free model needs no
* output bound).
*/
declare function affordableOutputTokens(pricing: Pricing, remainingUsd: number, estimatedInputTokens: number): number | undefined;
/**
* One side of a documented-rates comparison: the five per-MTok rate
* fields a provider pricing page publishes plus the long-context tiers,
* every field optional because either side may legitimately not carry
* one. A seed {@link Pricing} row is assignable directly.
*/
interface DocumentedRates {
  inputUsdPerMTok?: number;
  outputUsdPerMTok?: number;
  cacheReadUsdPerMTok?: number;
  cacheWriteUsdPerMTok?: number;
  cacheWrite1hUsdPerMTok?: number;
  tiers?: PricingTier[];
}
/**
* Compares a pricing seed against rates extracted from the provider's
* documented pricing page, in BOTH directions (RV902): a seed rate the
* page moved or dropped is a finding, and so is a documented billable
* rate the seed never declared, because a billable column missing from
* the seed is a silent underpricing channel (the 1h cache-write premium
* hid exactly there). Declared long-context tiers compare field by
* field. Returns human-readable findings, empty when the sides agree;
* the weekly rates audit (scripts/rates-audit.mjs) runs this exact
* comparator over the live pages, and the fault-injection kit drives it
* as a permanent gate (RV909). It verifies DOCUMENTATION, not billing:
* only a statement reconciliation over saved exports settles what the
* provider's meter actually charges.
*/
declare function compareRates(seed: DocumentedRates, page: DocumentedRates): string[];
//#endregion
//#region src/engine/engine.d.ts
/**
* The per-engine workflow registry (M5-T01): an
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
  /** Registered SchemaSpec names for outputSchemaRef (M7-T05). */
  schemas?: Record<string, SchemaSpec>;
  /** Registered tool profile names for toolsetRef (M7-T05). */
  toolsets?: Record<string, ToolsOption>;
  /**
  * Registered mechanical gate profiles: named pure functions over
  * AgentResult.artifacts for ladder acceptance gates (M7-T10).
  */
  gates?: Record<string, MechanicalGateProfile>;
  limits?: UsageLimits;
  /** Engine-wide permission chain layers. */
  permissions?: PermissionConfig;
  /** The worktree lifecycle provider. */
  isolation?: IsolationProvider;
  /** Engine-wide transport RetryPolicy (M4-T05). */
  retry?: RetryPolicy;
  /** Hard per-role model constraints (M4-T09). */
  roleFloors?: QualityFloors;
  /**
  * The admission countTokens policy (RV1804). The pre-admission count
  * probe carries the FULL child prompt to the provider: egress exactly
  * like a dispatch, but billed to no invoice row. 'deny' forbids that
  * control wire engine-wide: the flat reserve admits instead, exactly
  * like an adapter without countTokens, and the refusal is visible as
  * a `control:wire` event with outcome 'denied'. Default 'allow'
  * (today's behavior); AgentProfile.countTokens overrides per profile.
  */
  countTokens?: "allow" | "deny";
  /**
  * The toolset attestation floor (RV4204, the sixth comparison
  * experiment): with this set, a spawn that resolves a NON-EMPTY
  * toolset must run under a profile whose `toolsetAttestation` pins
  * it, or it refuses typed at spawn time, before any provider call.
  * The pin already binds call-level tool overrides and registered
  * names for attested profiles (RV1514); what it could not bind was
  * a spawn riding a profile that declared no tools and no pin, with
  * the tools arriving per call. Off by default: every existing
  * config keeps its bytes. `compileRegulatedProfile` arms it.
  */
  requireToolsetAttestation?: boolean;
  /**
  * The engine-wide prompt-cache policy (RV2006). Absent means 'auto':
  * the agent loop attaches CacheHint breakpoints (after tools, after
  * system, and the sliding deepest message, TTL '5m') on every turn
  * served by an adapter that declares ModelCaps.promptCaching
  * 'explicit', and attaches nothing anywhere else, so wire traffic to
  * every other adapter stays byte identical. `{ mode: 'off' }` is the
  * opt-out; AgentProfile.cache and the per-call opts override in that
  * order. Transport-level cost optimization only: hints never enter
  * identity, journals, or cassette keys.
  */
  cache?: CachePolicy;
  /**
  * The receipt posture of the incremental billing seam (RV3405).
  * RV2008 journals every ProviderCallRecord the moment its wire call
  * settles, but the append is fire and forget: the loop never blocks
  * its dispatch path on journal IO, so the receipt most likely to
  * lose the race with a crash is exactly the wire being paid for at
  * the moment of death. `'awaited'` makes the loop await each receipt
  * append before the turn proceeds (the RV601 intent before effect
  * precedent), buying durable payment evidence for one journal IO
  * await per wire call; a failed append still degrades loudly to the
  * terminal lane (the RV2008 warning), never fails the run. Default
  * `'async'`: byte identical to RV2008. `'intent'` (RV4006, the
  * fifth comparison experiment's P0.5) goes one step further: every
  * dispatched wire attempt journals a `provider-intent` decision
  * BEFORE the provider could bill (awaited, intent before effect,
  * the executor ledger's own rule: a failed intent append refuses
  * the dispatch), receipts are awaited as under `'awaited'`, and a
  * resume that finds an intent with no receipt and no terminal
  * coverage refuses the blind retry typed unless
  * `ResumeOptions.acknowledgeOpenWireIntents` is passed, because the
  * provider may have billed a wire this process never heard back
  * from. The intent narrows the unknown-outcome window to the wire
  * itself; dispatch stays at-least-once with attempt binding, and
  * the invoice names every open intent in its `openIntents` lane.
  */
  billingReceipts?: "async" | "awaited" | "intent";
}
interface BudgetDefaults {
  /** Last resort of the admission reserve formula; default 0.50. */
  flatReserveUsd?: number;
  /** Engine kill switch; default 500 spawns per run. */
  lifetimeSpawnCap?: number;
  /**
  * Fraction of the parent remainder (minus the parent finalize reserve)
  * a child sub-account may take; default 0.3 (M6-T06).
  */
  childBudgetFraction?: number;
  /** AdmissionController nesting depth; default 1, hard ceiling 4. */
  maxDepth?: number;
  /**
  * Lineage limits (DEF-3): maxEscalationsPerLogicalTask
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
    /**
    * The ModelKnowledge claim store (M10-T03). Optional and
    * OFF by default: an engine without it writes no kb entries at
    * all. The runtime only ever receives the current()-only handle.
    */
    modelKnowledge?: ModelKnowledgeStore;
  };
  defaults?: EngineDefaults;
  /**
  * Telemetry compat posture (RV1810). `quotaDeniedAgentError: true`
  * restores the legacy `agent:error` twin beside the primary
  * `quota:denied` event for recoverable pre-wire quota waits, for
  * consumers still keyed to the old type. Default off: healthy
  * throttling speaks its own type and never reads as failure.
  */
  telemetry?: {
    quotaDeniedAgentError?: boolean;
  };
  budgetDefaults?: BudgetDefaults;
  concurrency?: {
    perRun?: number; /** Per-adapter-id caps; unlimited unless configured (Appendix A; M4-T07). */
    perProvider?: Record<string, number>;
  };
  /**
  * The shared quota limiter (RV-215): a QuotaLimiter implementation
  * consulted before every live wire dispatch of every run, plus the
  * engine's tenant dimension and the limiter failure policy. Engines
  * and processes that share one limiter (or one limiter storage,
  * e.g. SqliteQuotaLimiter in @rulvar/store-sqlite over one database
  * file) enforce one global quota; a denial rides the provider-429
  * retry and failover machinery without paying a wire call. Absent =
  * no shared quota (Appendix A: an embeddable library must not
  * surprise-throttle hosts).
  */
  quota?: EngineQuotaConfig;
  /**
  * The durable admission bracket (RV4510, rfcs/admission.md): a
  * configured scheduler brackets every non-preview run as one unit of
  * work under `(runId, genesis)`. A queued run WAITS for its grant
  * honoring retryAfterMs; the terminal denied verdict refuses typed
  * (AdmissionRejectedError) before any provider dispatch; the lease
  * renews on a timer and releases at settle. Admission is an
  * environmental fact: never journaled, and replay never consults it.
  * The wire-level QuotaLimiter keeps being consulted per dispatch,
  * unchanged: a granted ticket never exempts a wire from quota.
  */
  admission?: EngineAdmissionConfig;
  /** Versioned price table; wins over caps.pricing (M4-T06). */
  pricing?: PriceTable;
  /**
  * Runner registrations beyond the built-in InProcessRunner (M6-T02).
  * `sandbox` executes CompiledWorkflow
  * values (WorkerSandboxRunner ships in @rulvar/planner); running or
  * resuming a compiled workflow without one is a typed ConfigError.
  */
  runners?: {
    sandbox?: ScriptRunner;
  };
  /**
  * Isolated tool executors (RV-216): one ToolExecutorProvider per
  * non-inprocess `executor` tag. A tool declaring `executor: 'subprocess'`
  * or `'container'` dispatches through the matching provider, so its work
  * runs OUT of the engine process under host-owned isolation instead of
  * as an inprocess closure with full host capabilities. The shipped
  * reference adapters (subprocessExecutor, containerExecutor) live in
  * `@rulvar/executor`. Absent = only inprocess tools are accepted, and a
  * non-inprocess tag is a typed ConfigError at spawn time. In-process
  * tools stay ordinary function calls: never a sandbox for hostile or
  * model-generated code.
  */
  executors?: ExecutorRegistry;
  /**
  * The InProcessRunner escalation hook:
  * receives escalated results when the call form cannot carry them; the
  * returned decision is journaled as the authoritative
  * escalation-decision entry.
  */
  onEscalation?: (result: EscalatedResult<unknown>) => EscalationDecision | Promise<EscalationDecision>;
  /**
  * KeyDeriver registry extension (see
  * https://docs.rulvar.com/guide/journal-compatibility).
  * Plumbed now, consumed by the matching kernel from M2.
  */
  extraDerivers?: readonly unknown[];
  /**
  * Redact/encrypt at the append/put boundaries, symmetric on load/get
  * (M8-T04, OQ-22 executed).
  * Applied by wrapping the configured stores; Engine.stores exposes
  * the wrapped instances, so every reader passes one policy point.
  */
  serialization?: SerializationHook;
  /**
  * The masking policy at the telemetry boundary. Default ON:
  * key-shaped strings in every emitted WorkflowEvent are masked;
  * never touches the journal (lossless encryption via `serialization`
  * is the persistence-side tool). `patterns` adds host-defined
  * redaction on top of the default credential set (RV-217): RegExp or
  * pattern strings, compiled once at construction, applied to every
  * string in every emitted event body. Feed the same patterns to the
  * OTel exporter for trace parity.
  */
  redaction?: {
    maskEvents?: boolean;
    patterns?: ReadonlyArray<RegExp | string>;
  };
  /**
  * Bare-nondeterminism detection over in-process workflow bodies
  * (RV-209): mode 'off' | 'warn' (default; detects outside production)
  * | 'error' (detects everywhere and rejects the run at the first
  * workflow-origin bare Date.now/Math.random with a typed
  * DeterminismError), plus the frame `allowlist` for confirmed-safe
  * callers and the `redact` hook for public telemetry. Workflow-origin
  * violations emit the structured `determinism:warning` event with the
  * caller frame and parsed file/line; installed dependencies and Node
  * runtime frames are classified exempt and stay silent.
  */
  determinism?: DeterminismConfig;
  /**
  * Metadata protection knobs (RV-217). `argsHashSalt` switches the
  * RunMeta.argsHash digest from plain sha256 to HMAC-SHA256 under the
  * salt: equal args stop correlating across deployments and
  * low-entropy args stop being recoverable from the digest. The salt
  * is deployment config, not a per-run secret: every engine (and the
  * CLI host config) resuming this store's runs must carry the SAME
  * salt, or the resume args gate refuses matching args. Runs recorded
  * before the salt keep their unsalted digests; the gate then simply
  * mismatches until forced, so introduce the salt on a fresh store or
  * accept --allow-args-change on legacy runs.
  */
  security?: {
    argsHashSalt?: string;
  };
  /**
  * The genesis ownership protocol (P0.2): over a journal store with
  * the lease capability, a run or resume segment that was NOT handed
  * a lease acquires its own before its first durable mutation, renews
  * it at ttl/3 exactly like a queue worker, and releases it at
  * settle. Fresh start, in-process resume, and worker takeover then
  * share ONE owner/lease contract: at most one live driver per run
  * across processes, a second driver's acquire rejects with the typed
  * LeaseHeldError before any write or provider dispatch, and a
  * crashed owner's lease expires after the store ttl so a worker
  * sweep recovers the run. Default 'auto'. 'none' restores the
  * pre-1.59.4 behavior (no engine-acquired leases) for hosts that
  * coordinate ownership entirely outside the engine; a lease passed
  * via RunOptions.lease or ResumeOptions.lease always wins over both
  * modes (the caller owns acquire, renew, and release). Stores
  * without the lease capability are unaffected: the embedded
  * single-process default keeps the single-writer precondition.
  */
  ownership?: "auto" | "none";
}
interface RunOptions {
  /** Explicit id; otherwise the engine mints a ULID. */
  runId?: string;
  /**
  * An opaque host-declared identity over the config the workflow body
  * CLOSES OVER (RV3210, the honest answer to `hashWorkflowBody`'s
  * closure blindness: the body-text hash cannot see captured values,
  * so two byte-identical bodies over different closures pin
  * identically). Recorded in RunMeta at genesis and compared on every
  * resume that supplies one: a mismatch refuses the resume typed
  * BEFORE ownership, meta writes, and appends, because the host
  * itself asserted the identity; a recorded fingerprint the resume
  * does not supply warns (`RULVAR_RESUME_FINGERPRINT_UNCHECKED`), and
  * a supplied fingerprint the run never recorded warns
  * (`RULVAR_RESUME_FINGERPRINT_UNRECORDED`) instead of failing,
  * because absence means NOT RECORDED. The preferred pattern is still
  * to close over nothing and pass config through args; the
  * fingerprint is the pin for what must stay closed over. A non-empty
  * string of at most 512 characters.
  */
  configFingerprint?: string;
  /**
  * Run ceiling B0; immutable within a segment (RV2511): no API tops
  * up a live run's ceiling, and the ONE explicit door after genesis
  * is the validated, journaled `ResumeOptions.run` override (RV2208),
  * which takes effect only by opening a new segment. Enforced by
  * projected admission (a spawn whose reserve does not fit is denied
  * before any dispatch), the per-turn guard with a budget-derived
  * maxOutputTokens clamp, and live stream cuts on crossing; the
  * residual provider-dependent overshoot is bounded by one in-flight
  * turn per concurrent agent. Under {@link RunOptions.budgetPolicy}
  * 'immutable-lifetime' even the override door refuses typed.
  * Contract: https://docs.rulvar.com/guide/budgets.
  */
  budgetUsd?: number;
  /**
  * The ceiling-override posture of the run's whole life (RV3902, the
  * fourth comparison experiment). Default 'segment', today's behavior
  * byte for byte: B0 and the exposure cap are immutable WITHIN a
  * segment, and the explicit, validated, journaled
  * `ResumeOptions.run` override (RV2208) may change them by opening a
  * new segment. 'immutable-lifetime' welds that one door shut: the
  * posture is recorded in RunMeta at genesis and restored on every
  * resume, and a resume carrying ANY `ResumeOptions.run` value
  * refuses with a typed ConfigError BEFORE ownership, meta writes, or
  * any append, raise and lower alike; no journaled override exists in
  * this mode, and the emergency lever for a run that must stop
  * spending is cancel, not a ceiling edit. Degradation is honest: a
  * store that drops the optional RunMeta field resumes as 'segment'
  * (the override door works again), never as an invented refusal.
  * Declared at genesis only; the policy itself has no override.
  */
  budgetPolicy?: "segment" | "immutable-lifetime";
  /**
  * The bounded execution scope (RV4007): recorded at genesis into
  * RunMeta and a journal decision, immutable for the run's life (no
  * resume door), lifted onto the invoice header and carried by the
  * export bundle. Attribution only: the library never interprets it,
  * with one declared exception since RV4205: a quota config with
  * `tenantFrom: 'scope'` reads the scope's tenant into its
  * reservations.
  */
  scope?: ExecutionScope;
  /**
  * What an unknown scope field does (RV4205): 'drop' (the default,
  * the historical bytes, pinned) or 'reject' (typed refusal by
  * name). `compileRegulatedProfile` enforces 'reject'.
  */
  scopePolicy?: ScopePolicy;
  /**
  * The opt-in in-flight exposure cap (RV711): bounds spent money plus
  * the summed worst-case estimates of live dispatches. The per-turn
  * guard checks money already SPENT, so under `budgetUsd` alone N
  * concurrent turns each pass it before any settles and together can
  * cross the ceiling by up to one whole turn each (preflight's
  * 'overshoot-exposure' finding prices that hole). With the cap, the
  * admission holds each turn's own estimate (the prompt estimate plus
  * the request's output allowance, priced by the same rows as
  * settlement) from right before the provider call until the attempt
  * settles, and the dispatch whose estimate does not fit
  * spent + finalize/synthesis reserves + live estimates is refused
  * with a typed BudgetExhaustedError (data.reason
  * 'in-flight-exposure'). A plain agent settles the refusal as a
  * budget error; an orchestrate-owned root dispatch waits it out
  * (RV1902): it parks until a live hold releases, retries pre-wire,
  * and emits budget:exposure-wait, while a drained refusal settles
  * the documented forced-finish partial instead of tearing the run
  * down. Worst concurrent overshoot past the cap
  * is thereby the estimate error of the in-flight turns, not one
  * whole turn per agent. Absent by default: wire traffic, journals,
  * and hooks stay byte-identical. Recorded in RunMeta at genesis
  * (RV1504) and restored on every resume, the budgetUsd rule: the cap
  * used to be per-invocation and unrecorded, so a resumed segment
  * silently ran without the bound the original invocation declared
  * (the seventeenth comparison benchmark's top FinOps gap). A run
  * started without the cap stays uncapped for its whole life unless
  * a host changes the posture through the explicit, validated,
  * journaled ResumeOptions.run override (RV2208); nothing changes it
  * silently.
  */
  maxInFlightExposureUsd?: number;
  /**
  * Layer 2b against the exposure ceiling (RV2503), opt-in and
  * meaningful only beside `maxInFlightExposureUsd`. Armed, a dispatch
  * with NOTHING else in flight has its planned output clamped to the
  * tokens the remaining exposure room affords instead of being
  * refused outright, exactly as the budget ceiling has always clamped
  * it. The 1.226.0 comparison run is the case: nothing was live, the
  * budget still held 0.8642 USD, the mandatory repair turn's FULL
  * 18000 token plan priced 0.7066 USD against 0.5642 USD of room, and
  * the dispatch was refused before any provider call; the same work,
  * re-issued after an operator raised the ceiling, wrote 12840 output
  * tokens for 0.4788 USD. A refusal with nothing live buys nothing,
  * because no hold will ever release to fund the full plan.
  *
  * Deliberately scoped and deliberately off by default. With siblings
  * in flight the refusal is transient and the RV1902/RV2002 waits
  * park on it, so the wave keeps the full-length turn RV711 promised
  * and nothing here applies. When the room cannot even fund the
  * serving model's output floor, the clamp stands aside and the
  * dispatch refuses through the usual typed `in-flight-exposure`
  * path, so the drained-refusal terminals (RV1902, RV2002, RV2003)
  * keep their shapes. Absent, every byte of dispatch behavior is
  * historical. Like `strictPricing`, this is a per-segment posture: it
  * is not recorded in RunMeta and a resumed segment carries only what
  * its own options declare.
  */
  clampTurnToExposure?: boolean;
  /**
  * The opt-in strict pre-egress pricing gate (RV1508): every paid
  * dispatch must resolve a well-formed price row for its serving
  * model BEFORE the wire call, or the dispatch refuses typed
  * (ConfigError naming the model and the defect). `true` demands
  * presence and well-formedness; the object form adds
  * `maxRatesAgeDays` (a row must carry a fresh `ratesVerifiedAt`)
  * and `allowUnpriced` (exact model refs the host KNOWS are free,
  * the explicit exception). Recorded in RunMeta at genesis and
  * restored on every resume, the exposure cap's rule (RV1504): a
  * FinOps posture a resumed segment silently drops is not a posture
  * (and unlike the two ceilings, ResumeOptions.run has no field for
  * this gate: pricing hygiene is not a per-segment decision).
  * Absent by default: dispatch behavior stays byte identical, and an
  * unpriced model keeps debiting nothing, the documented ceiling
  * hole this mode exists to close.
  */
  strictPricing?: boolean | {
    maxRatesAgeDays?: number;
    allowUnpriced?: readonly string[];
  };
  /** Run-level defaults merged over engine defaults. */
  limits?: UsageLimits;
  /**
  * Run-level deadline: an ISO 8601 date-time with an explicit UTC
  * designator or offset (e.g. `2026-07-21T10:00:00Z` or
  * `2026-07-21T12:00:00+02:00`); crossing it cancels the run. Any
  * other string is a typed ConfigError thrown synchronously by
  * engine.run, before any journal entry or provider dispatch (v1.34.0
  * review P2-1). A deadline already in the past cancels immediately:
  * a crossed deadline is a valid deadline. Deadlines beyond the Node
  * timer maximum are honored through sliced timers, never truncated
  * (v1.34.0 review P2-2).
  */
  deadlineAt?: string;
  name?: string;
  tags?: string[];
  /** Host-initiated cancellation. */
  signal?: AbortSignal;
  /**
  * A lease the caller already holds for this run (the genesis side of
  * the ResumeOptions.lease contract): the engine carries it on EVERY
  * durable mutation of the fresh segment (every journal append, every
  * putMeta, every transcript blob write) and never acquires, renews,
  * or releases it itself; lifecycle stays with the caller. Passing it
  * disables the engine's own ownership acquisition for this run
  * regardless of the `ownership` mode. Hosts that admit runs through
  * an external queue acquire the lease at admission time and hand it
  * here, so admission and the first dispatch are covered by ONE
  * fencing epoch.
  */
  lease?: Lease;
}
/** Resume-time hit/miss/orphan accounting. */
interface ResumePreview extends ResumeReport {
  invalidResolutions: Array<{
    seq: number;
    detail: string;
  }>;
}
interface ResumeOptions {
  /**
  * The run's original arguments: not journaled for in-process workflows
  * in v1, so the host supplies them (resume binding residuals).
  */
  args?: unknown;
  /**
  * What an in-process body-hash mismatch does (RV3001). The default
  * 'warn' keeps the historical design: the mismatch emits the loud
  * `RULVAR_RESUME_HASH_MISMATCH` warning and the resume proceeds,
  * because the journal decides replay versus live per content keys
  * and reports orphans honestly. 'refuse' turns the same mismatch
  * into a typed ConfigError BEFORE ownership, meta writes, or any
  * append: the pin for hosts that treat an edited body as a
  * different workflow. The vocabulary is
  * {@link EvidenceContract.enforce}'s. Name mismatches and compiled
  * source mismatches are hard errors regardless, exactly as before.
  */
  bodyHash?: "warn" | "refuse";
  /**
  * The scope assertion (RV4007), the configFingerprint semantics: a
  * supplied scope that differs from the recorded one refuses the
  * resume typed before ownership; a supplied scope over a run that
  * recorded none warns (absence means NOT RECORDED); a recorded
  * scope resumes verbatim whether or not it is re-asserted. The
  * comparison normalizes the supplied scope under the RECORDED
  * normalization table first (RV4302), so a host that re-supplies
  * the same raw values it started with asserts successfully.
  */
  scope?: ExecutionScope;
  /**
  * The scope policy assertion (RV4302). The recorded normalization
  * table is the journal's, never this option's: a supplied
  * `normalize` table is compared against the recorded one by
  * canonical bytes, and a conflict refuses typed before ownership
  * (the args-binding rule: recorded at genesis, asserted on resume).
  * A table supplied over a run that recorded none warns and is NOT
  * applied (applying it would let a resume move the recorded
  * identity). `unknown` applies to the supplied copy's own intake
  * only.
  */
  scopePolicy?: ScopePolicy;
  /**
  * The unknown-outcome acknowledgment (RV4006): a run under the
  * 'intent' receipt posture that crashed between a wire's journaled
  * intent and its receipt holds wires whose outcome this process
  * never learned; the provider may have billed them, and a blind
  * redispatch could pay twice, so resume refuses typed. Passing true
  * acknowledges the risk explicitly (reconcile the invoice's
  * `openIntents` lane against the provider statement first) and the
  * new segment journals the acknowledgment, so the override is as
  * durable as the intents it waves through.
  */
  acknowledgeOpenWireIntents?: boolean;
  /**
  * The host's asserted config identity for this resume (RV3210),
  * compared against the RunMeta-recorded
  * {@link RunOptions.configFingerprint} BEFORE ownership, meta
  * writes, or any append. Both present and unequal is a typed
  * ConfigError always, no posture knob: supplying the fingerprint IS
  * the assertion. A recorded fingerprint the resume does not supply
  * warns (`RULVAR_RESUME_FINGERPRINT_UNCHECKED`); a supplied one the
  * run never recorded warns (`RULVAR_RESUME_FINGERPRINT_UNRECORDED`),
  * because absence means NOT RECORDED, never a verdict.
  */
  configFingerprint?: string;
  /**
  * Dry-run: replay-strict matching; the first would-be-live call throws
  * JournalMissError and the run settles with that typed error, zero live
  * calls performed.
  */
  dryRun?: boolean;
  /** invalidate/retry: entries to unpin before matching. */
  invalidate?: number[];
  /**
  * Queue mode: the worker's lease. The engine carries it on EVERY
  * durable mutation of this resume: every journal append (the kernel's
  * single append site; M8 entry amendment; DEF-6; FR-703), every
  * putMeta, and every transcript blob write (checkpoints, compaction
  * summaries, worktree patches, workflow sources). Over a store
  * declaring the fencedWrites capability a stale worker's writes are
  * ALL rejected by the fencing epoch and never become visible; over a
  * store without the marker the journal stays fenced as always and the
  * meta/blob surfaces remain advisory (the fenced run state RFC).
  */
  lease?: Lease;
  /**
  * Ceiling overrides for the resumed segment and the run's remaining
  * life (RV2208). The RV1504 rule stands: the RunMeta-recorded
  * posture is what a bare resume restores; this field is the ONE
  * explicit way to change that posture after genesis. Each supplied
  * value is validated exactly like its RunOptions counterpart,
  * applied to this segment's budget, written back by the segment's
  * first meta write (a LATER bare resume restores the overridden
  * posture, not the genesis one), and journaled as a
  * `run_budget_override` decision naming the recorded and applied
  * values and the settled spend it was judged against. A `budgetUsd`
  * below the journal's settled spend refuses typed before ownership,
  * meta, or any append: such a ceiling would exhaust the segment
  * before its first turn and read like a fresh money death. Absent
  * fields keep the recorded values; an absent object keeps the
  * historical behavior byte for byte. Under a recorded
  * {@link RunOptions.budgetPolicy} 'immutable-lifetime' (RV3902) any
  * applying override refuses typed before ownership, raise and lower
  * alike: the door this field is exists only under the 'segment'
  * posture.
  */
  run?: {
    budgetUsd?: number;
    maxInFlightExposureUsd?: number;
  };
}
interface ResumeHandle<R> extends RunHandle<R> {
  /** Resolves at settle with the replay accounting. */
  preview: Promise<ResumePreview>;
}
interface Engine {
  run<A, R>(wf: Workflow<A, R> | CompiledWorkflow, args: A, opts?: RunOptions): RunHandle<R>;
  /**
  * Rebinds a journal to a workflow definition and resumes. Requires wf
  * for in-process workflows;
  * a name mismatch is a typed ConfigError; a body-hash mismatch warns
  * loudly and proceeds (the journal decides replay per content keys),
  * unless {@link ResumeOptions.bodyHash} is 'refuse', which makes it
  * a typed ConfigError before any durable mutation (RV3001).
  * A compiled run resumes WITHOUT wf: the engine rehydrates the
  * persisted source pinned by workflowHash; supplying a compiled wf
  * whose source hash differs from the recorded one is a typed
  * ConfigError (M6-T02). ResumeOptions.run (RV2208) overrides the
  * recorded budget ceilings for the run's remaining life, with a
  * journaled decision and a typed floor at the settled spend; under
  * a recorded budgetPolicy 'immutable-lifetime' (RV3902) any applying
  * override refuses typed before ownership instead.
  */
  resume<A, R>(runId: string, wf?: Workflow<A, R> | CompiledWorkflow, options?: ResumeOptions): ResumeHandle<R>;
  /**
  * Renders the registered agent profiles into the shared vocabulary
  * card, optionally filtered to `names`; the registry itself stays
  * private to the engine (M6-T05 amendment). Unknown names are ignored.
  */
  profileCard(names?: readonly string[]): string;
  /**
  * The engine's configured stores, exposed for shells and hosts
  * (M8 entry amendment: the journal store comes from the engine).
  * Exactly the
  * instances createEngine received, or the defaults it built; no store
  * contract widens through this accessor. With a serialization hook
  * configured these are the HOOKED wrappers, so every reader passes
  * the one policy point (M8-T04).
  */
  readonly stores: {
    journal: JournalStore;
    transcripts: TranscriptStore;
  };
  /**
  * Retention (OQ-20 executed at M8-T04): deletes every
  * blob transcripts.list(runId) returns, then the journal; no orphan
  * blobs survive. The caller owns the decision that the run is done.
  * A caller holding the run's lease passes it via `opts.lease` (the
  * queue worker's retention path does), so a fencedWrites store
  * refuses the cascade from a superseded holder; without a lease the
  * deletes assert the single-writer precondition as before.
  */
  deleteRun(runId: string, opts?: {
    lease?: Lease;
  }): Promise<void>;
  /**
  * Checkpoint pruning (OQ-20 executed at M8-T04):
  * deletes checkpoint blobs of ok-terminal attempts that no other
  * entry references; returns the count. Parked, cancelled, escalated,
  * and hanging attempts keep theirs (park/unpark, DEF-5 retention, and
  * dangling redispatch boot from them). `opts.lease` rides each blob
  * delete exactly like the deleteRun cascade.
  */
  pruneRun(runId: string, opts?: {
    lease?: Lease;
  }): Promise<number>;
  /**
  * Portable run export (RV-217): the meta record, every journal
  * entry, and every transcript blob, read through Engine.stores (the
  * one policy point), so an encrypted deployment exports PLAINTEXT
  * for a subject-access request or a store migration, without raw
  * store spelunking. Blobs are materialized in memory; export runs
  * one at a time, not catalogs.
  */
  exportRun(runId: string): Promise<RunExport>;
  /**
  * Imports a bundle produced by exportRun, under its ORIGINAL runId
  * (transcript refs and journal fields embed it; rewriting ids is
  * deliberately out of scope). Writes through Engine.stores, so an
  * encrypting target re-encrypts under its own policy. Refuses typed
  * when the run already exists in the target store, so an import can
  * never interleave with live history.
  */
  /**
  * Imports an exportRun bundle into this engine's stores. Returns the
  * closure report (RV1511): every transcript, checkpoint, artifact,
  * and workflow-source ref the ENTRIES (and meta) reference that no
  * bundle blob carries. The default import stays permissive (the
  * historical shape: retention and pruning legitimately drop blobs
  * their entries still name) and the report makes the gap visible;
  * `requireClosure: true` refuses typed BEFORE any write instead. A
  * duplicate blob ref in the bundle always refuses: last-write-wins
  * is not an import.
  */
  importRun(bundle: RunExport, options?: {
    requireClosure?: boolean;
  }): Promise<{
    unresolvedRefs: string[];
  }>;
}
/** The portable bundle exportRun produces and importRun consumes (RV-217). */
interface RunExport {
  runId: string;
  /** Absent when the source store had no meta row for the run. */
  meta?: RunMeta;
  entries: JournalEntry[];
  blobs: Array<{
    ref: string;
    data: Bytes;
  }>;
}
/**
* The bounded execution scope of one run (RV4007, the fifth
* comparison experiment's P0.4): WHO this run executes for, as the
* host names it. The library CARRIES the scope without loss (RunMeta,
* a genesis journal decision, the invoice header, the export bundle
* via its meta) and asserts identity on resume; it never interprets
* it. Tenancy semantics, entitlement, and isolation policy are host
* decisions: this is an attribution envelope, not IAM.
*/
interface ExecutionScope {
  /** The owning tenant or organization, host-defined. */
  tenant?: string;
  /** The billing account within the tenant. */
  account?: string;
  /** The project or workload name. */
  project?: string;
  /**
  * The governing legal domain (RV4205, the sixth comparison
  * experiment's P0.2): host-defined vocabulary (a jurisdiction, a
  * regulatory regime), the first of the three named dimensions the
  * experiment's question bound to routing and audit.
  */
  legalDomain?: string;
  /** The deployment or data-residency region, host-defined (RV4205). */
  region?: string;
  /** The provider-side billing account identity, host-defined (RV4205). */
  providerAccount?: string;
  /**
  * The sponsoring principal of the work (RV4408, the seventh
  * comparison experiment's benchmark domain): the party on whose
  * behalf and at whose expense the run executes, distinct from the
  * OWNING tenant and the BILLING account. The Aster adjudication
  * shape is the motivating example: a network operator (tenant)
  * adjudicates a trial financed by a study sponsor, and the sponsor
  * identity must ride attribution, the invoice header, and the
  * regulated posture hash without being conflated with billing.
  * Host-defined vocabulary, like every dimension here.
  */
  sponsor?: string;
}
/** One of the named scope dimensions (RV4007/RV4205/RV4408). */
type ExecutionScopeField = "tenant" | "account" | "project" | "legalDomain" | "region" | "providerAccount" | "sponsor";
/**
* One value-normalization operation of the declarative table (RV4302):
* a CLOSED vocabulary on purpose. A host callback would not be replay
* stable (it is not journalable, and it may read locale or time), so
* the policy is data: each operation is a named pure function of the
* string alone, all three idempotent, applied in the declared order.
*/
type ScopeNormalizeOp = "trim" | "lowercase" | "nfc";
/**
* The declarative scope value normalization table (RV4302, deferred
* from RV4205): without it, `Region` and `region` values produce two
* digests for one identity, splitting quota buckets and FinOps joins.
* Versioned so a future vocabulary is a new declared shape, never a
* silent reinterpretation; JCS-serializable by construction, so the
* genesis decision journals it verbatim and resume compares canonical
* bytes. Applied strictly AFTER the existing per-field validation,
* with the result re-validated by the same rule.
*/
interface ScopeNormalizeTable {
  version: 1;
  /** Per-dimension operation lists, applied in array order. */
  fields: Partial<Record<ExecutionScopeField, readonly ScopeNormalizeOp[]>>;
}
/**
* What an UNKNOWN scope field does (RV4205). 'drop' (the default, the
* RV4007/RV4107 posture byte for byte) silently discards it from the
* normalized copy, which keeps junk fields from moving the recorded
* identity; 'reject' refuses it typed by name, because a dimension
* the engine cannot record is a dimension nothing downstream can bind
* to routing, quota, or audit, and a host that declared it meant it.
* `compileRegulatedProfile` enforces 'reject'. `normalize` (RV4302)
* canonicalizes VALUES before the identity exists anywhere: the table
* is journaled in the genesis `execution_scope` decision and mirrored
* in RunMeta, and resume reads the RECORDED table, never a re-supplied
* one (a conflicting resupply refuses typed, the args-binding rule).
*/
interface ScopePolicy {
  unknown?: "drop" | "reject";
  normalize?: ScopeNormalizeTable;
}
/**
* Validates and copies a declared scope (RV4007): own properties only
* (the RV1205 doctrine: a prototype member must never resolve),
* non-empty strings of at most 256 chars, at least one field, and the
* copy is what gets recorded, so later host mutation of the passed
* object cannot move the recorded identity. Under
* `policy.unknown: 'reject'` (RV4205) an own enumerable field outside
* the named dimensions refuses typed by name instead of dropping.
*/
declare function normalizeExecutionScope(value: unknown, site: string, policy?: ScopePolicy): ExecutionScope;
/** The canonical identity string of a scope (RV4007): JCS bytes, total and deterministic. */
declare function executionScopeKey(scope: ExecutionScope): string;
/**
* The canonical digest of a scope (RV4205): sha256 over the JCS bytes
* of the NORMALIZED scope, a fixed-length identity for causal records
* (the genesis decision, the invoice header) and external joins, so a
* FinOps pipeline correlates runs by one column instead of comparing
* structured objects field by field.
*/
declare function executionScopeDigest(scope: ExecutionScope): string;
/** Content hash of an in-process workflow body (run-to-definition binding). */
declare function hashWorkflowBody(wf: Workflow<never, never> | Workflow<unknown, unknown>): string;
/** Content hash of a compiled workflow source (run-to-definition binding). */
declare function hashWorkflowSource(source: string): string;
/** TranscriptStore ref of the persisted CompiledWorkflow source blob. */
declare function workflowSourceRef(runId: string): string;
/**
* sha256 hex over the JCS canonical serialization of a run's args: the
* value the engine records as `RunMeta.argsHash` at genesis, exposed so
* hosts can verify re-supplied resume args against the recorded hash
* (the v1.23.0 review: a resume that silently drops or changes args
* changes the logical run and pays again). Returns undefined for
* undefined args (a run started without args records none). Throws when
* JCS cannot serialize the value (functions, cycles, non-finite
* numbers); the engine then records `argsProvided` without a hash.
*
* The digest is deterministic and unsalted: it reveals args equality
* across runs and low-entropy args are recoverable by hashing
* candidates, so treat the recorded `RunMeta.argsHash` as
* sensitive-derived metadata, not a value safe to publish (see the
* `argsHash` field docs).
*/
declare function hashRunArgs(args: unknown, options?: {
  salt?: string;
}): string | undefined;
/**
* sha256 hex over the JCS canonical serialization of a run's result
* value: the digest the engine records as `outputHash` on the journaled
* run-settle decision when the settling segment computed a value, and
* the value `rulvar replay --compare-output-hash` compares a replayed
* result against (RV-209). Best-effort by design: returns undefined for
* undefined values and for values JCS cannot serialize (functions,
* cycles, non-finite numbers), so an unhashable result records no
* baseline rather than failing the settle. Like `hashRunArgs`, the
* digest is deterministic and unsalted: treat it as sensitive-derived
* metadata for low-entropy results.
*/
declare function hashRunOutput(value: unknown): string | undefined;
declare function createEngine(options: CreateEngineOptions): Engine;
//#endregion
//#region src/orchestrator/claims.d.ts
/**
* Repeated-claim deduplication (RV-211 remainder): a PURE, deterministic
* fold that removes byte-repeated claim lines across children BEFORE any
* model call, so the synthesis invocation never spends context re-reading
* what several children reported identically. Matching is deliberately
* conservative: lines compare by whitespace-collapsed exact equality
* (trim, inner runs of whitespace to one space), never fuzzily, so two
* DISTINCT claims can never merge; the first occurrence survives verbatim
* and every later occurrence is dropped and indexed. Empty lines are
* structure, not claims: they always survive.
*
* Public docs: https://docs.rulvar.com/guide/orchestration-modes
*/
/** One claim reported more than once across the input rows. */
interface RepeatedClaim {
  /** The first-seen line, verbatim. */
  claim: string;
  /** Reporters in input order; the first entry made the surviving copy. */
  nodeIds: string[];
  /** Total occurrences across all rows, the surviving one included. */
  count: number;
}
interface DedupedClaims {
  /** The input rows with every repeated line's later occurrences removed. */
  rows: {
    nodeId: string;
    text: string;
  }[];
  /** Claims seen more than once, in first-occurrence order. */
  repeated: RepeatedClaim[];
}
/**
* Removes later occurrences of repeated claim lines across the rows and
* indexes each repeated claim with its reporters. Deterministic: output
* depends only on the input order and bytes.
*/
declare function dedupeRepeatedClaims(rows: {
  nodeId: string;
  text: string;
}[]): DedupedClaims;
//#endregion
//#region src/orchestrator/finish-validators.d.ts
/**
* One child as the finish validators see it (the RV-202 provenance
* contract): a pure read of the durable state the orchestrator already
* tracks, identical live and on replay.
*/
interface FinishValidationChild {
  /** The spawn handle (the journal seq, stable across resume). */
  readonly handle: number;
  /** The child's node identity, the same one acceptance reasons use. */
  readonly nodeId: string;
  /** The terminal status, or 'running' for a child unsettled at finish time. */
  readonly status: string;
  /**
  * The child's full output serialized (a raw string verbatim, anything
  * else JSON; a failed child's errorMessage), '' while unsettled. The
  * same serialization the child result evidence tools page.
  */
  readonly text: string;
  /**
  * Present and true ONLY when acceptance.acceptValidatedTerminalOutputOnLimit
  * is configured and this child settled 'limit' CARRYING a terminal
  * output (the finalization reserve summary that, for a schema child,
  * already validated against the declared output schema) that the
  * acceptance arms WILL count: under acceptance.requireEvidenceFloor a
  * below-floor child is never promoted (RV1207), so it is never marked
  * either (RV1403). Acceptance counts a marked child as a success, so
  * evidencePreservedValidator treats its text as part of the cited
  * evidence pool. Absent in every other configuration, keeping the old
  * pool exactly.
  */
  readonly salvageableOutput?: boolean;
  /**
  * The partial-arm twin of `salvageableOutput` (RV1403): present and
  * true ONLY when acceptance.acceptPartialChildren is configured and
  * this child settled 'limit' CARRYING a structured partial the
  * acceptance arms WILL count (the output arm wins when both apply,
  * and a below-floor child under requireEvidenceFloor is never
  * marked). The accepted partial IS part of the composed result, so
  * its citations are evidence: without the mark, an orchestrator
  * quoting a partial the policy accepted was flagged by `requireKnown`
  * as fabricating citations.
  */
  readonly salvageablePartial?: boolean;
}
/** What a {@link FinishValidator} judges. */
interface FinishValidationInput {
  /** The finish call's `result` argument exactly as the model passed it. */
  readonly result: Json | null;
  /**
  * The result as text: a string result verbatim, anything else its JSON
  * serialization (the same convention the child result evidence tools
  * use), so textual validators never re-implement serialization.
  */
  readonly text: string;
  /**
  * Every spawned child at finish time, in spawn order (the RV-202
  * provenance contract). Optional in the TYPE only so hand built
  * inputs stay source compatible; the orchestrator runtime always
  * supplies it, so validators can hold the finish result against the
  * evidence the children actually produced.
  */
  readonly children?: readonly FinishValidationChild[];
  /**
  * The id of the run being judged (RV2501). Optional in the TYPE only
  * so hand built inputs stay source compatible; the orchestrator
  * runtime always supplies it, at every gate that judges a finish
  * (the validator-bound finish, the contract draft gate, and the
  * skipWhenDraftValid pre-pass), so a validator can accept the run's
  * own id as the artifact a claim about THIS run points at.
  */
  readonly runId?: string;
}
/**
* One structured repair hint on a failed verdict (RV3801): the exact
* edit whose application satisfies this validator, precise enough for
* the HOST to perform without a provider wire. The third comparison
* run died with its repair pool spent on a failure class whose remedy
* the evidence-grade verdict already prescribed word for word (write
* this run's id inside each offending sentence); a remedy that
* deterministic must not cost a model turn. A hint is advisory: the
* finish loop attempts the patch only when EVERY failure of the
* candidate carries hints, re-runs the FULL validator set over the
* patched document, and falls back to the ordinary model repair pool
* when the patch does not survive re-validation.
*/
interface FinishRepairHint {
  /** The one host-side edit the loop knows how to apply. */
  readonly mechanism: "insert-run-id";
  /** Offset of the offending sentence's first character in the judged text. */
  readonly start: number;
  /** Offset one past the offending sentence's last character. */
  readonly end: number;
  /**
  * The offending sentence verbatim (never normalized or clipped): the
  * loop refuses the patch unless `text.slice(start, end)` equals it,
  * so a stale hint can never edit the wrong bytes.
  */
  readonly sentence: string;
  /** The identifier whose insertion the verdict prescribes. */
  readonly insert: string;
}
/** The verdict of one validator over one finish attempt. */
type FinishValidationVerdict = {
  ok: true;
} | {
  ok: false;
  reasons: string[];
  repairHints?: FinishRepairHint[];
};
/**
* A deterministic host validator of the orchestrator finish result.
* `validate` must be pure, synchronous host code: no model calls, no
* clock, no filesystem, because a verdict must reproduce on replay and a
* throwing validator is a host defect that fails the run as ConfigError
* (never journaled, never granted a repair turn).
*/
interface FinishValidator {
  /**
  * Unique within one orchestrate call; appears in the journaled
  * verdicts, the repair feedback, and the orchestrator prompt.
  */
  readonly name: string;
  validate(input: FinishValidationInput): FinishValidationVerdict;
}
/**
* How section markers must appear in the judged text (cycle 74):
* 'anywhere' is the historical substring test; 'line' demands the
* marker as its own line (surrounding whitespace ignored), so a
* mid sentence mention or a quoted marker no longer satisfies a
* heading requirement.
*/
type SectionMatchMode = "anywhere" | "line";
/**
* Whether fenced code participates in textual validation (cycle 74):
* 'counted' is the historical behavior; 'excluded' removes fenced code
* blocks (see {@link stripFencedBlocks}) before matching, counting, or
* slicing, so code samples can neither satisfy a section marker nor
* inflate word and citation counts.
*/
type FencedCodeMode = "counted" | "excluded";
/**
* Removes fenced code blocks from a text, the delimiter lines
* included, and returns the remaining lines joined by newlines. The
* grammar is the CommonMark shape as a deliberate line heuristic: a
* fence opens at a line starting (after at most three spaces) with
* three or more backticks or tildes, an optional info string allowed;
* it closes at the next line carrying only at least as many of the
* SAME character (a trailing carriage return from CRLF text does not
* keep a fence open); an unclosed fence runs to the end of the text.
* Indented (four space) code blocks are not treated as code. This is
* the exact exclusion the `fencedCode: 'excluded'` validator option
* applies, exported so custom host validators can stay symmetric.
*/
declare function stripFencedBlocks(text: string): string;
/**
* The deterministic host half of sectional bounded repair (RV808b): a
* rejected finish used to resend the WHOLE document to fix one violated
* section, and the twelfth comparison run paid its post-fan-in wall
* exactly that way. This function reconstructs the full document from
* the RETAINED prior attempt and a sectional resubmission. The grammar
* is line anchored on purpose (the {@link SectionMatchMode} 'line'
* semantics): a section starts at the first line whose trimmed content
* EQUALS a declared marker and runs to the next such marker line (any
* declared marker) or the end of the text; the preamble before the
* first marker is retained verbatim. A patched marker present in the
* prior text has its whole section replaced by the marker line plus the
* new body; a patched marker absent from the prior text is APPENDED at
* the end in declared order (that is how a repair ADDS a section a
* validator demanded). A patch naming an undeclared marker is a
* ConfigError: the caller owns turning that into repair feedback.
* Deterministic and pure, so a spliced exchange recounts identically on
* replay; exported so custom hosts can stay symmetric with the
* orchestrator runtime.
*/
declare function spliceSections(prior: string, declared: readonly string[], patch: Readonly<Record<string, string>>): string;
/**
* Judges the markdown HEADING STRUCTURE of the result (the sixth
* comparison experiment; the judge's P1.3): line presence proves each
* declared heading EXISTS, not that the document carries them in the
* declared order without extras. The sections must all start with the
* SAME markdown heading marker (an identical count of leading '#'
* characters, one to six, followed by whitespace); the governed level
* derives from that marker. Fenced code is ALWAYS stripped first,
* because a '## ' line inside a code sample is not a heading in
* rendered markdown, so a fenced fake can neither satisfy a declared
* heading nor trip exclusivity. Heading lines compare trimmed, whole
* line. With `ordered` (default true) the declared headings must
* appear in declaration order; with `exclusive` (default true) each
* declared heading must appear once, unrepeated, and no undeclared heading
* of the governed level may exist (other levels stay free). Default
* name 'heading-structure'.
*/
declare function headingStructureValidator(options: {
  sections: readonly string[];
  name?: string;
  ordered?: boolean;
  exclusive?: boolean;
}): FinishValidator;
/**
* Requires every named section to appear LITERALLY in the result text
* (a heading like 'FINDINGS' or any marker the goal demands). Default
* name 'required-sections'; pass `name` to run several instances.
* `match: 'line'` demands each marker as its own line and
* `fencedCode: 'excluded'` ignores markers inside fenced code blocks
* (cycle 74); both default to the historical byte identical behavior.
*/
declare function requiredSectionsValidator(options: {
  sections: readonly string[];
  name?: string;
  match?: SectionMatchMode;
  fencedCode?: FencedCodeMode;
}): FinishValidator;
/**
* Requires the result to be a JSON object carrying every named field
* with a substantial value: present, not null, and not an empty or
* whitespace only string (empty arrays, zero, and false COUNT as
* present; emptiness rules beyond strings belong to a custom
* validator). Default name 'required-fields'.
*/
declare function requiredFieldsValidator(options: {
  fields: readonly string[];
  name?: string;
}): FinishValidator;
/**
* Requires the result text's word count (whitespace separated tokens;
* an empty text counts zero) to sit inside the configured bounds (the
* v1.71 experiment review, P0.7: a formal length requirement must be
* code, never a natural-language plea the model may round away). At
* least one bound is required; both are positive integers with
* min <= max. Default name 'word-count'. `fencedCode: 'excluded'`
* counts only words outside fenced code blocks (cycle 74), so code
* samples cannot pad a length requirement; the default counts
* everything, byte identical to the historical behavior.
*/
declare function wordCountValidator(options: {
  min?: number;
  max?: number;
  name?: string;
  fencedCode?: FencedCodeMode;
}): FinishValidator;
/** The default citation shape: a path with an extension, a colon, a line number. */
declare const DEFAULT_CITATION_PATTERN = "[\\w./-]+\\.\\w+:\\d+";
/** The default preserved share, the improvement plan's RV-202 gate. */
declare const DEFAULT_EVIDENCE_MIN_SHARE = .95;
/**
* The deterministic edit behind the `insert-run-id` mechanism
* (RV3801): the id lands INSIDE the sentence, before its trailing
* terminator run (a `.`, `!`, or `?` with any closing quotes,
* brackets, or markdown emphasis after it), or at the very end when
* the sentence carries no terminator. Inside matters: appended AFTER
* the terminator the id would belong to the NEXT sentence under the
* shared `sentencesOf` segmentation and the re-validation would fail
* the same sentence again. Exported so tests and hosts can reproduce
* the loop's exact bytes.
*/
declare function insertRunIdIntoSentence(sentence: string, insert: string): string;
/**
* Applies `insert-run-id` repair hints to a judged text (RV3801): each
* `[start, end)` window is replaced by
* {@link insertRunIdIntoSentence}(window, insert), right to left so
* earlier offsets stay valid, every other byte identical. Fail closed:
* `undefined` (never a partial patch) when the set is empty, any
* window is out of bounds or empty, or two windows overlap; the caller
* treats a refused patch exactly like an absent one and proceeds to
* the model repair pool.
*/
declare function applyFinishRepairHints(text: string, hints: readonly {
  start: number;
  end: number;
  insert: string;
}[]): string | undefined;
/**
* The RV-202 evidence preservation contract: the finish result must
* PRESERVE the citations the children actually produced. Distinct
* matches of `pattern` are collected across the outputs of children
* settled 'ok' (spawn order); at least `minShare` of them (default
* {@link DEFAULT_EVIDENCE_MIN_SHARE}, the plan's 95 percent gate,
* compared as a ceiling on the required count so an exact boundary like
* 19 of 20 passes) must appear literally in the result text. Zero child
* citations pass vacuously UNLESS `requireNonEmptyPool: true` (RV507):
* for an evidence-critical run the empty pool IS the failure, so that
* mode refuses it with an `empty child citation pool` reason instead of
* the vacuous pass. With `requireKnown: true` the contract also
* runs in reverse: every citation in the RESULT must appear in some
* child's output, so a fabricated but pattern valid citation is
* rejected instead of silently counting as evidence. Rejection reasons
* list the missing (and unknown) citations, capped at 20, so the repair
* turn can restore them. Purely textual and deterministic; checking
* that cited targets EXIST on disk is host territory (a custom
* validator), not this contract. Intake is fail closed (RV610): a
* pattern that can match the empty string is refused typed (an empty
* match would enter the pool as fabricated evidence and defeat
* `requireNonEmptyPool`), zero-length matches never enter the pool
* even when a lookaround produces them in context, and the strict-mode
* booleans must be real booleans, so a stray `'true'` can never
* silently disable the mode it names. Default name
* 'evidence-preserved'.
*/
declare function evidencePreservedValidator(options?: {
  pattern?: string;
  flags?: string;
  minShare?: number;
  requireKnown?: boolean;
  requireNonEmptyPool?: boolean;
  name?: string;
}): FinishValidator;
/**
* One counted per-section pattern demand of
* {@link sectionPatternCountValidator} (RV2206).
*/
interface SectionPatternEntry {
  /** The section marker the demand binds to. */
  section: string;
  /**
  * Regex source. A capture group makes the count DISTINCT by the
  * first capture (the parity contract's N01..N48 ids count once
  * each, however often an id repeats); without a capture the raw
  * match count applies.
  */
  pattern: string;
  flags?: string;
  /** Matches (distinct captures when capturing) required in the slice. */
  min: number;
  /** Short human name for reasons (e.g. 'numbered negative scenarios'). */
  label?: string;
}
/**
* Counted collections inside named sections (RV2206, the subscription
* parity series). The engine validated citations per section since the
* v1.71 review, but the numbered collections the parity contract
* demands (48 N-case ids, 16 counterexample ids) were policed by
* nothing: the second accepted dossier carried 0 and 0 against an
* instruction naming both, and only a runner-side format pre-teach
* closed the gap, by hope rather than contract. Each entry slices its
* section exactly like sectionCitationsValidator (first marker
* occurrence to the next marker in position order) and counts matches,
* DISTINCT by first capture when the pattern captures; the reasons
* name the section, the label, the found count against the minimum,
* and with a capturing pattern the missing count in ids, so a repair
* turn knows exactly what to add (the RV2105 lesson). Default name
* 'section-pattern-counts'.
*/
declare function sectionPatternCountValidator(options: {
  sections: readonly string[];
  entries: readonly SectionPatternEntry[];
  name?: string;
  match?: SectionMatchMode;
  fencedCode?: FencedCodeMode;
}): FinishValidator;
/**
* Requires at least `min` matches of `pattern` INSIDE every named
* section (the v1.71 experiment review, P1.2: a total citation count
* hides sections carrying zero provenance). A section's slice runs
* from its FIRST occurrence to the next found section marker in text
* position order, or to the end of the text; a marker absent from the
* text is its own failure reason, because coverage of a missing
* section cannot silently count as satisfied.
* requiredSectionsValidator still owns plain presence. Default name
* 'section-citations'. `match: 'line'` anchors each section at the
* first line equal to its marker and `fencedCode: 'excluded'` removes
* fenced code before anchoring, slicing, and counting (cycle 74), so a
* marker echoed inside a code sample can neither anchor a slice nor
* donate citations; both default to the historical behavior.
*/
declare function sectionCitationsValidator(options: {
  sections: readonly string[];
  pattern?: string;
  flags?: string;
  min: number;
  name?: string;
  match?: SectionMatchMode;
  fencedCode?: FencedCodeMode;
}): FinishValidator;
/**
* Requires at least `min` matches of `pattern` in the result text (the
* plan's citation and source count checks: a file:line pattern, a URL
* pattern). The pattern compiles at construction (invalid patterns are a
* ConfigError before any run exists) and matches globally; `min` is a
* positive integer. Default name 'min-matches'; pass `name` to run
* several instances, because names must be unique per orchestrate call.
* `fencedCode: 'excluded'` matches only outside fenced code blocks
* (cycle 74), so citations quoted inside code samples do not count;
* the default matches everything, byte identical to the historical
* behavior.
*/
declare function minMatchesValidator(options: {
  pattern: string;
  flags?: string;
  min: number;
  name?: string;
  fencedCode?: FencedCodeMode;
}): FinishValidator;
/**
* The default evidence-grade phrases (RV1212, the sixteenth comparison
* experiment P2-3). Each asserts the STRONGEST kind of provenance a
* report can claim: that something was watched running, that a
* provider charged for it, or that it holds up in production. The
* sixteenth run's own answer used exactly this register about a
* runtime the live run never observed, which is the failure mode the
* lint exists to catch.
*/
declare const DEFAULT_EVIDENCE_GRADE_PHRASES: readonly string[];
/**
* The default artifact reference: a run id (ULID-shaped, the ids the
* engine mints) or a `path:line` citation.
*/
declare const DEFAULT_ARTIFACT_PATTERN = "(?:run[ -]?[0-9A-HJKMNP-TV-Z]{6,26}|[\\w./-]+\\.\\w+:\\d+)";
/**
* Requires every evidence-GRADE claim to point at an artifact (RV1212).
* A sentence that says `live-observed`, `provider bill`, or
* `production-proven` is claiming the report watched it happen, and a
* claim of that grade with nothing to check it against is the most
* expensive kind of wrong: the sixteenth comparison run's answer used
* the register about a runtime its own live run never observed, and
* every reader-side check passed because the text was well formed.
* The rule is deliberately local and deterministic: the artifact
* reference must appear in the SAME sentence as the phrase (a run id
* or a `path:line` citation by default), so moving the evidence three
* paragraphs away no longer satisfies the grade. Purely textual: what
* the referenced artifact contains is
* {@link citedValueValidator}'s question, and whether it exists on
* disk is the host's.
*
* The run's OWN id is an artifact (RV2501). `DEFAULT_ARTIFACT_PATTERN`
* only ever matched the literal word `run` followed by a ULID, so the
* escape the verdict advertised was unreachable for every run whose id
* the engine did not mint in that exact shape: the comparison run's
* `comparison-rulvar-v12260-aug09-...` matched nothing, its synthesis
* had no artifact it could name, and a document that told the truth
* about the run it was part of could not be written at all. When
* {@link FinishValidationInput.runId} is supplied (the orchestrator
* runtime always supplies it), a sentence carrying that id verbatim as
* a whole token satisfies the grade, and the verdict names the id so
* the repair instruction is executable rather than aspirational. An id
* shorter than `MIN_RUN_ID_ARTIFACT_CHARS` (six) is ignored, and
* without an id the verdict is byte identical to the historical one.
*
* With the id in hand the failure also carries {@link FinishRepairHint}
* rows (RV3801), one per offending sentence, so the finish loop can
* perform the verdict's own prescription host side without spending a
* provider wire; the reasons stay byte identical either way, and the
* hints are bounded (at most `MAX_REPAIR_HINTS` offenders) and fail
* closed (an id whose bytes could split a sentence is never hinted).
* Default name 'evidence-grade'.
*/
declare function evidenceGradeValidator(options?: {
  /** Overrides {@link DEFAULT_EVIDENCE_GRADE_PHRASES}; matched case-insensitively. */phrases?: readonly string[]; /** Overrides {@link DEFAULT_ARTIFACT_PATTERN}. */
  artifactPattern?: string;
  name?: string;
}): FinishValidator;
/** One resolved citation target: the source line the citation points at. */
interface CitationTarget {
  path: string;
  line: number;
}
/**
* Requires a cited location to actually carry the value the sentence
* asserts (RV1212, the sixteenth comparison experiment P2-2). Citation
* counting proves provenance was OFFERED, never that it holds: the
* judge's own repro cited `retry.ts:24`, an interface declaration, for
* a default that lives nine lines further down, and every
* pattern-based check passed. This validator closes the loop with the
* host's own source snapshot.
*
* The rule is deliberate and narrow, so a failure is always
* explainable: within one sentence, the inline-code spans that are NOT
* citations are the values that sentence asserts about the citations
* that are, and each asserted value must appear in the cited line (or
* within `window` lines AFTER it, for a value the citation introduces)
* as a WHOLE token, never a substring (RV1402): under `includes`, an
* asserted `3` was satisfied by a line saying `30`, the seventeenth
* comparison judge's repro. A sentence that cites without asserting an
* inline value passes: the validator judges assertions, never prose
* ({@link citationTargetsValidator} judges every citation with no such
* precondition).
*
* One span class is IDENTITY, not assertion (RV2502, the 1.226.0
* comparison run): a span naming the artefact under review says which
* commit, run, or release the document is about, and asserts nothing
* about any cited line. That run's synthesis wrote its frozen commit
* sha beside source citations and the validator demanded the sha appear
* in the cited source, an impossible repair, in the same verdict that
* demanded three real value fixes; two granted repairs burned and the
* finish was rejected. Three shapes are structural and always excluded:
* a commit sha (12 to 64 hex characters, long enough that ordinary hex
* literals stay judged), a release version (`1.2.3`, `v1.2.3`, with an
* optional prerelease or build tail), and the run's own id when the
* runtime supplies `runId`. Host vocabulary is declared: `notValues`
* lists spans this document writes as identity, verdict words like
* `conditionally ready` among them.
*
* The run-id exclusion is what makes the bundle self consistent
* (RV2501, RV2202): the evidence grade instructs a failing model to
* write this run's id inside the offending sentence, and before RV2502
* doing so beside a citation traded an evidence-grade failure for a
* cited-value one. The two repair instructions now compose.
*
* `resolve` is host code and must be PURE over a snapshot the host
* froze before the run, exactly like every other finish validator: a
* resolver that reads the filesystem live would make a verdict depend
* on when it ran and break replay. Returning `undefined` means the
* location does not exist in the snapshot, which is itself a failure:
* a citation nothing resolves is not provenance. Default name
* 'cited-value'.
*/
declare function citedValueValidator(options: {
  resolve: (target: CitationTarget) => string | undefined; /** Lines AFTER the cited one that may carry the value; default 0. */
  window?: number; /** Overrides {@link DEFAULT_CITATION_PATTERN}; must capture `path:line`. */
  pattern?: string;
  /**
  * Spans this host writes as IDENTITY rather than as a value asserted
  * about a citation (RV2502), matched whole and case sensitively.
  * Commit shas, versions, and the run's own id need no declaration.
  */
  notValues?: readonly string[];
  name?: string;
}): FinishValidator;
/**
* Resolves EVERY citation of the result text against the host's own
* source snapshot (RV1401, the seventeenth comparison experiment
* P0-1). The seventeenth run's answer carried `ghost.ts:0`, a location
* no checkout ever held, and the whole configured chain passed it: the
* citation pattern accepts any digits (a line of 0 included),
* `evidencePreservedValidator`'s `requireKnown` proves only that some
* child SAID the string, and {@link citedValueValidator} resolves a
* citation only when its sentence asserts an inline value beside it,
* so a fabricated location nobody asserted anything about counted as
* provenance and licensed the valid-draft skip. This validator closes
* the hole at the root: every match of `pattern` in the result text,
* inline code and plain prose alike, is parsed as `path:line` and
* resolved, with no sentence-level precondition.
*
* Three refusals, each fail closed. A match that does not parse as
* `path:line` with a safe integer line is refused rather than skipped:
* the host's own pattern claims it IS a citation. A line below 1 is
* refused BEFORE the resolver runs: source lines are 1-based, and a
* sloppy resolver might well answer line 0. A citation the resolver
* does not know is refused, because a citation nothing resolves is not
* provenance. Repeated occurrences are judged once, and refusal
* reasons list the offenders capped at 20.
*
* `resolve` is host code and must be PURE over a snapshot the host
* froze before the run, exactly like {@link citedValueValidator}'s: a
* resolver reading the filesystem live would make a verdict depend on
* when it ran and break replay. `fencedCode: 'excluded'` strips fenced
* code before scanning (default 'counted'), for hosts whose contracts
* already exclude it. A text with no citation at all passes: demanding
* citations exist is `minMatchesValidator`'s job, this one demands the
* ones present are real. Intake is fail closed (RV610): a pattern that
* does not compile or that can match the empty string is refused
* typed, and zero-length matches a lookaround produces in context
* never enter the pool. Wired into `finishValidation`, the refusal
* also reaches the `skipWhenDraftValid` gate (RV510 judges the draft
* by the full declared contract), so a draft carrying an unresolvable
* citation can no longer skip the synthesis it was supposed to earn.
* Default name 'citation-targets'.
*/
declare function citationTargetsValidator(options: {
  resolve: (target: CitationTarget) => string | undefined; /** Overrides {@link DEFAULT_CITATION_PATTERN}; must capture `path:line`. */
  pattern?: string; /** 'excluded' strips fenced code before scanning; default 'counted'. */
  fencedCode?: FencedCodeMode;
  name?: string;
}): FinishValidator;
/**
* Rejects invisible Unicode format characters in the result text
* (RV1509, the eighteenth improvement plan). The seventeenth
* comparison run's answer carried five U+200B characters immediately
* before hidden-file citations, and every configured check passed:
* the citation pattern's boundary class simply excluded the invisible
* byte from the match, so the extracted citations were clean while
* the LITERAL text was not byte-identical to any repository path. A
* format character in a dossier is at best copy-paste rot and at
* worst a smuggling channel, so the default is to reject the whole
* category (Unicode `Cf`: zero-width spaces and joiners, the word
* joiner, the BOM, bidi controls, soft hyphens), each distinct
* character listed once with its codepoint, first index, occurrence
* count, and a short visible-context excerpt, so the repair turn can
* find the exact bytes. `allow` admits specific characters for hosts
* whose content legitimately needs them (bidi marks in RTL prose);
* every allow entry must itself be a single `Cf` character, refused
* typed otherwise (the RV610 posture: a typo in the allow list must
* not silently widen it). Purely textual and deterministic. Default
* name 'format-characters'.
*/
declare function formatCharacterValidator(options?: {
  /** Single `Cf` characters to admit; everything else still rejects. */allow?: readonly string[];
  name?: string;
}): FinishValidator;
/**
* Every declared literal must appear in the finish result at least
* once (RV3308). The 2026-08-12 comparison run passed an exact twelve
* heading contract and a citation floor while its "all publishable
* packages" table silently dropped four of the seventeen names: shape
* validators cannot see an enumerable universe, so the universe is
* declared as literals and each one is held. Purely textual and
* deterministic; fenced code counts, because tables and inline code
* are legitimate places to name a package. Default name
* 'required-mentions'.
*/
declare function requiredMentionsValidator(options: {
  terms: readonly string[];
  name?: string;
}): FinishValidator;
/**
* One declaration for the shape a host both PROMPTS for and GATES on
* (RV3308). The 2026-08-12 comparison run drifted exactly here: the
* harness prompt named one heading while its finish contract named an
* older one, the host accepted its own contract, and the common audit
* refused the answer. A manifest is read twice, by
* {@link manifestValidators} to build the gate and by
* {@link renderContractRequirements} to build the prompt block, so
* the two surfaces cannot disagree by construction.
*/
interface OutputContractManifest {
  /** The exact heading lines, ordered and exclusive when present. */
  sections?: readonly string[];
  /** Literal strings the result must contain, each at least once. */
  requiredMentions?: readonly string[];
  /** Whitespace word bounds, either side optional. */
  words?: {
    min?: number;
    max?: number;
  };
  /** Minimum citation occurrences over {@link DEFAULT_CITATION_PATTERN} or `citationPattern`. */
  minCitations?: number;
  /** Overrides the citation shape; only meaningful beside `minCitations`. */
  citationPattern?: string;
}
/**
* The manifest's gate half (RV3308): heading structure (ordered,
* exclusive), word bounds, the citation floor, and the mention
* universe, in that stable order, each through the existing named
* validator. Everything is derived from the SAME object the prompt
* block renders from.
*/
declare function manifestValidators(manifest: OutputContractManifest): FinishValidator[];
/**
* The manifest's prompt half (RV3308): a deterministic requirements
* block enumerating the SAME headings, bounds, citation floor and
* literals the validators hold, byte for byte, for the host to embed
* in its question. Rendering is pure string assembly; nothing here
* consults the result.
*/
declare function renderContractRequirements(manifest: OutputContractManifest): string;
//#endregion
//#region src/orchestrator/contradictions.d.ts
/** One child's serialized output as the pass reads it. */
interface ContradictionSource {
  /** The child's node identity, the same one acceptance reasons use. */
  readonly nodeId: string;
  /** The child's full output serialized, the pool the validators judge. */
  readonly text: string;
}
/** One reading of a disputed key, with everyone who reported it. */
interface ContradictionClaim {
  /** The value asserted for the key, verbatim after the separator. */
  value: string;
  /** Children asserting it, in first-seen (spawn) order; never empty. */
  nodeIds: string[];
  /**
  * The first sentence that asserted it, whitespace-collapsed and cut
  * to `maxExcerptChars`. An excerpt, never a quotation: it exists so a
  * reader can find the claim, not so a machine can re-parse it.
  */
  excerpt: string;
}
/** One cited location two children read differently. */
interface Contradiction {
  /** The cited location both readings point at, e.g. 'src/retry.ts:33'. */
  anchor: string;
  /** The key both readings name, e.g. 'attempts'. */
  key: string;
  /** Every reading of that key at that anchor, in first-seen order. */
  claims: ContradictionClaim[];
}
interface ContradictionOptions {
  /** Overrides {@link DEFAULT_CITATION_PATTERN} for the anchors. */
  pattern?: string;
  /** Bound on returned contradictions; default 20. */
  max?: number;
  /** Bound on each claim's excerpt; default 200. */
  maxExcerptChars?: number;
}
declare const DEFAULT_MAX_CONTRADICTIONS = 20;
declare const DEFAULT_MAX_EXCERPT_CHARS = 200;
/**
* Folds the settled children's outputs into the contradictions they
* hold against each other. Pure and deterministic: the output depends
* only on the input order and bytes, so a resumed run re-derives it
* without journaling anything.
*/
declare function findContradictions(rows: readonly ContradictionSource[], options?: ContradictionOptions): Contradiction[];
//#endregion
//#region src/orchestrator/consistency.d.ts
/**
* The default anchor shape: the finish validators' citation pattern
* extended with an optional `-end` line range, because composed dossiers
* routinely cite spans (`src/exec.ts:256-296`) where the single-line
* pattern would silently read only the first line.
*/
declare const DEFAULT_ANCHOR_PATTERN: string;
/** One pool sentence read against a draft sentence, with its reporter. */
interface ClaimPoolReading {
  /** The child's node identity, the same one acceptance reasons use. */
  nodeId: string;
  /**
  * The pool sentence, whitespace-collapsed and cut to
  * `maxExcerptChars`. An excerpt, never a quotation: it exists so a
  * judge (or a reader) can hold the two readings against each other,
  * not so a machine can re-parse it.
  */
  excerpt: string;
}
/** One draft assertion paired with the pool readings of its anchor. */
interface ClaimPair {
  /** The draft-side citation verbatim, e.g. 'src/exec.ts:256-296'. */
  anchor: string;
  /** The citing draft sentence, collapsed and cut like the readings. */
  draftExcerpt: string;
  /** The pool sentences citing an intersecting span, first-seen order. */
  pool: ClaimPoolReading[];
}
interface ClaimPairOptions {
  /** Overrides {@link DEFAULT_ANCHOR_PATTERN} for both sides. */
  pattern?: string;
  /** Bound on returned pairs; default {@link DEFAULT_MAX_CLAIM_PAIRS}. */
  max?: number;
  /** Bound on each pair's pool readings; default {@link DEFAULT_MAX_POOL_PER_PAIR}. */
  maxPoolPerPair?: number;
  /** Bound on each excerpt; default {@link DEFAULT_MAX_PAIR_EXCERPT_CHARS}. */
  maxExcerptChars?: number;
  /**
  * Critical anchor declarations (RV1603): each entry is a path
  * (`packages/executor/src/ledger.ts`, matching that file and anything
  * under it as a directory) or an anchor with a span
  * (`src/exec.ts:250-300`, matching same-file anchors intersecting the
  * span). Pairs whose draft anchor matches sort FIRST, before the
  * `max` cap applies, so a bounded pass judges the declared claims
  * preferentially; the fold also reports which critical draft anchors
  * ended up with no reported pair. Unset = the exact pre-RV1603
  * ordering, byte for byte (the eighteenth comparison benchmark's
  * judge saw 40 of 144 citing sentences with nothing steering WHICH
  * 40).
  */
  critical?: readonly string[];
  /**
  * The declared coverage target (RV2903), in (0, 1]: size the
  * reported pairs to COVER at least this share of the citing
  * sentences instead of taking the first `max` pairs blind. The
  * ninth comparison run judged 43 of 115 citing sentences because
  * its host guessed `max: 56`, and nothing sized the pass to a goal.
  * Under a target the selection is coverage-first: every critical
  * candidate, then ONE candidate per still-uncovered sentence in
  * draft order until the target is met; pairs that only deepen an
  * already covered sentence are skipped, because under a declared
  * target the bounded budget buys coverage, not depth. `max` stays a
  * hard ceiling, and `truncated` then means exactly that the ceiling
  * cut selection the target still wanted. Unset = the exact
  * historical first-`max` selection, byte for byte.
  */
  targetCoverageShare?: number;
  /**
  * Collect the citing sentences the reported pairs left UNCOVERED
  * (RV4202, the sixth comparison experiment): the coverage-armed
  * repair round needs the sentences themselves for its prompt, not
  * only their count, because "raise the coverage" is actionable to a
  * composing model exactly when it can see which claims the pool
  * never grounded. Distinct collapsed sentences, draft order, each
  * cut to `maxExcerptChars`, capped at
  * {@link MAX_UNCOVERED_SENTENCES}; the uncapped count rides beside
  * the list. Unset = byte-identical fold output.
  */
  reportUncovered?: boolean;
}
/** What the fold produced, beside the pairs themselves. */
interface ClaimPairsFold {
  /** The pairs, in draft first-seen order, capped at `max`. */
  pairs: ClaimPair[];
  /** True when more pairs existed than `max` allowed to report. */
  truncated: boolean;
  /** Draft sentences carrying at least one parsable anchor. */
  draftCitingSentences: number;
  /**
  * Citing sentences with at least one REPORTED pair (RV1603): the
  * honest coverage numerator against `draftCitingSentences`. A
  * sentence can be uncovered because nothing in the pool read its
  * files, because every reading agreed verbatim, or because the `max`
  * cap cut it; all three mean the judge never saw it.
  */
  coveredCitingSentences: number;
  /**
  * Present when `targetCoverageShare` was declared (RV2903): the
  * sentence count the target resolved to against THIS draft, so a
  * consumer holds `coveredCitingSentences` against the goal the
  * selection was sized for, not against a share it must re-derive.
  */
  targetCoveredSentences?: number;
  /**
  * Present only when `critical` was given: the critical draft anchors
  * (verbatim, draft order, deduplicated) with no reported pair, capped
  * at {@link MAX_CRITICAL_UNCOVERED} entries.
  */
  criticalUncovered?: string[];
  /** The uncapped count behind `criticalUncovered`; present with it. */
  criticalUncoveredTotal?: number;
  /**
  * Present only when `reportUncovered` was set (RV4202): the distinct
  * citing sentences with no reported pair, draft order, each cut to
  * `maxExcerptChars`, capped at {@link MAX_UNCOVERED_SENTENCES}. A
  * sentence lands here for any of the three uncovered causes (no
  * intersecting pool reading, verbatim agreement dropped every
  * reading, or a bound cut its candidates); telling them apart is the
  * repair round's job, which is exactly why the sentences ride the
  * prompt instead of a cause taxonomy riding the meta.
  */
  uncoveredSentences?: string[];
  /** The uncapped count behind `uncoveredSentences`; present with it. */
  uncoveredSentencesTotal?: number;
}
declare const DEFAULT_MAX_CLAIM_PAIRS = 40;
declare const DEFAULT_MAX_POOL_PER_PAIR = 3;
declare const DEFAULT_MAX_PAIR_EXCERPT_CHARS = 400;
/** Bound on the reported uncovered-critical anchor list (RV1603). */
declare const MAX_CRITICAL_UNCOVERED = 32;
/** Bound on the reported uncovered citing-sentence list (RV4202). */
declare const MAX_UNCOVERED_SENTENCES = 24;
/**
* Folds the composed draft against the settled pool it composed from:
* every draft sentence citing an anchor is paired with the pool
* sentences citing an intersecting span of the same file, verbatim
* agreement dropped. Pure and deterministic: the output depends only on
* the input order and bytes, so a resumed run re-derives it without
* journaling anything (the `findContradictions` precedent).
*/
declare function pairDraftClaims(draftText: string, rows: readonly ContradictionSource[], options?: ClaimPairOptions): ClaimPairsFold;
/** The synthetic anchor and nodeId of run-facts pairs (RV1603). */
declare const RUN_FACTS_ANCHOR = "(run-facts)";
declare const DEFAULT_MAX_RUN_FACT_PAIRS = 8;
/** The sheet excerpt bound: one sheet rides EVERY run-facts pair. */
declare const MAX_RUN_FACTS_SHEET_CHARS = 1200;
/**
* The run's own recorded execution facts, prepared by the caller
* (deterministic sentences plus the trigger vocabularies).
*/
interface RunFactsSheet {
  /** Deterministic sentences of the recorded facts. */
  text: string;
  /** Identity triggers: ids the run itself minted (runId, child node ids). */
  ids: readonly string[];
  /** Numeric triggers: recorded fact values (counts, totals). */
  numbers: readonly number[];
}
interface RunFactPairOptions {
  /** Case-insensitive substring triggers, e.g. 'not run' or a locale phrase. */
  terms?: readonly string[];
  /** Bound on returned pairs; default {@link DEFAULT_MAX_RUN_FACT_PAIRS}. */
  max?: number;
  /** Bound on the draft excerpt; default {@link DEFAULT_MAX_PAIR_EXCERPT_CHARS}. */
  maxExcerptChars?: number;
}
interface RunFactPairsFold {
  /** The pairs, in draft order, capped at `max`; anchor {@link RUN_FACTS_ANCHOR}. */
  pairs: ClaimPair[];
  /** True when more sentences matched than `max` allowed to report. */
  truncated: boolean;
  /**
  * The UNCAPPED count of matched run-claim sentences (RV1809): with
  * only `truncated` a consumer knew the bound cut the fold but not by
  * how much, so no run-fact coverage ratio was computable from the
  * meta alone.
  */
  candidates: number;
}
/**
* Pairs draft sentences that speak about the RUN with the run's own
* recorded fact sheet (RV1603), so the same judge invocation that rules
* on source claims also rules on run claims. The eighteenth comparison
* benchmark shipped both failure shapes this closes: a dossier claiming
* "each role recorded 18-20 evidence entries" over recorded profiles of
* 23/18/22/20/20/20, and "real models were not run" beside 125 recorded
* wire requests, with executionFacts ENABLED on the input side; facts
* offered to the composer verify nothing about what it composed.
*
* A sentence pairs when it names a minted id, a recorded fact value
* (standalone, two digits or more, so a prose "6" cannot flood the
* fold), or a caller-supplied term (case-insensitive). Pure and
* deterministic like {@link pairDraftClaims}; the sheet excerpt rides
* every pair, capped at {@link MAX_RUN_FACTS_SHEET_CHARS}.
*/
declare function pairRunFactClaims(draftText: string, sheet: RunFactsSheet, options?: RunFactPairOptions): RunFactPairsFold;
/**
* The claim-coverage grade (RV1702): one closed vocabulary a consumer
* reads INSTEAD of inferring semantic health from an empty findings
* array. The eighteenth comparison benchmark's run reported
* `completion: 'complete'` with `contradictions: []` while the judge
* had seen 40 of 144 citing sentences and said so only in counts a
* reader had to interpret; three material falsehoods rode that gap.
* The grade names the verification posture outright:
*
* - `'full'`: every citing sentence the draft carries had at least one
*   judged pair, nothing was cut by a bound, no declared critical
*   anchor was missed, and the judge (when needed) settled ok.
* - `'vacuous'` (RV2508): the draft carried NO citing sentence, so the
*   configured pass verified nothing. This used to grade `'full'` on
*   the reasoning that saying `'partial'` would imply a subset was
*   chosen, which is true and beside the point: `'full'` is the
*   strongest word in the vocabulary and it was standing over a
*   denominator of zero, the same silent green the grade exists to
*   abolish, at its extreme.
* - `'partial'`: the pass verified a strict subset: the pair bound
*   truncated the fold, a run-facts bound truncated the run-claim
*   pairs, or citing sentences exist that no judged pair covers.
* - `'coverage-capped'` (RV4404): the pass ran under a DECLARED
*   coverage target and the hard pair ceiling still cut selection the
*   target wanted. Distinct from `'partial'` because the cause is the
*   CONFIGURED `max`, not the pool: the seventh comparison run
*   declared full coverage, folded its pairs truncated at the
*   ceiling, and reported 23 uncovered citing sentences as if the
*   text were the problem. The honest grade names the ceiling so the
*   refusal (and the operator) fix the config, not the document.
* - `'critical-uncovered'`: at least one DECLARED critical anchor got
*   no judged pair; stronger than `'partial'` because the caller named
*   exactly these claims as the ones that must not go unverified.
* - `'judge-declined'` (RV2508): the judge invocation was refused
*   ADMISSION and never dispatched (RV2106), so nothing was judged at
*   all. It ranks with a failed judge and above everything the counts
*   could say, because those counts describe a pass that did not
*   happen; before this the flag was invisible to the grade and a
*   declined judge over a citation-free draft graded `'full'`.
* - `'judge-failed'`: the judge invocation did not settle ok, so
*   nothing was judged at all; every other reading of the meta is
*   moot.
*
* Precedence is the order above, strongest last. The helper is pure
* and total over metas written BEFORE the grade shipped, so a consumer
* can grade a persisted outcome from an older engine.
*/
type ClaimCoverageGrade = "full" | "vacuous" | "partial" | "coverage-capped" | "critical-uncovered" | "judge-declined" | "judge-failed";
/** The subset of the claim-consistency meta the grade derives from. */
interface ClaimCoverageInput {
  /** Draft sentences carrying at least one parsable anchor. */
  draftCitingSentences: number;
  /** True when the pair bound cut the fold. */
  truncated: boolean;
  /** Citing sentences with at least one judged pair. */
  coveredCitingSentences: number;
  /** Uncapped count of declared critical anchors with no judged pair. */
  criticalUncoveredTotal?: number;
  /** True when the run-facts pair bound cut the run-claim pairs. */
  runFactPairsTruncated?: true;
  /** True when the judge invocation did not settle ok. */
  judgeFailed?: true;
  /**
  * True when the judge invocation was refused ADMISSION and never
  * dispatched (RV2106). The orchestrator already spreads the flag into
  * the meta it grades, so nothing at the call site changes.
  */
  judgeDeclined?: true;
  /**
  * True when the fold ran under a DECLARED coverage target (RV4404):
  * a truncation is then the CEILING cutting selection the target
  * wanted, and the grade names it 'coverage-capped' instead of a
  * silent 'partial'. Absent keeps every historical grade byte for
  * byte.
  */
  coverageTargetDeclared?: true;
}
/** Derives the {@link ClaimCoverageGrade} of a claim-consistency meta. */
declare function claimCoverageOf(meta: ClaimCoverageInput): ClaimCoverageGrade;
//#endregion
//#region src/orchestrator/output-contract.d.ts
/** The golden citation sample used with {@link DEFAULT_CITATION_PATTERN}. */
declare const DEFAULT_CITATION_SAMPLE = "docs/output-contract.md:1";
/** The citation demands of a {@link FinishContractManifest}. */
interface FinishContractCitations {
  /** Regex source over the result text; default {@link DEFAULT_CITATION_PATTERN}. */
  pattern?: string;
  flags?: string;
  /** Total matches required across the whole result text. */
  min?: number;
  /** Matches required inside EVERY declared section; requires `sections`. */
  perSection?: number;
  /**
  * A literal string matching `pattern`, embedded in the golden
  * fixtures (a regex cannot be sampled mechanically). REQUIRED with a
  * custom pattern; defaults to {@link DEFAULT_CITATION_SAMPLE} for
  * the default pattern. Must contain no whitespace and no declared
  * section marker.
  */
  sample?: string;
}
/** One counted per-section collection demand (RV2206). */
interface FinishContractSectionPattern {
  /** A declared section marker this demand binds to. */
  section: string;
  /** Regex source; a capture group makes counting DISTINCT by first capture. */
  pattern: string;
  flags?: string;
  /** Matches (distinct captures when capturing) required inside the section. */
  min: number;
  /**
  * Literal matches for the golden fixtures and the prompt. Single
  * line each; with a capturing pattern they must together carry at
  * least `min` distinct captures.
  */
  samples: string[];
  /** Short human name for prompts and reasons. */
  label?: string;
}
/**
* The single source of truth of a textual finish contract: what the
* prompt promises IS what the validators enforce. Declare only textual
* demands here (sections, length, citations); an object-shaped result
* belongs to {@link requiredSectionsValidator}'s sibling
* requiredFieldsValidator and a host-provided selfTest accept fixture.
*/
interface FinishContractManifest {
  /** Literal section markers the result must contain. */
  sections?: string[];
  /**
  * How section markers must appear (cycle 74): 'anywhere' (the
  * default, a plain substring test) or 'line' (each marker must
  * stand as its own line, surrounding whitespace ignored, so a mid
  * sentence mention no longer satisfies a heading). Requires
  * `sections`. Joins the hash and the prompt statement only when
  * 'line'; an explicit 'anywhere' normalizes away, keeping the hash
  * of the plain manifest.
  */
  sectionsMatch?: SectionMatchMode;
  /** Word bounds over the result text (whitespace separated tokens). */
  words?: {
    min?: number;
    max?: number;
  };
  /** Citation demands over the result text. */
  citations?: FinishContractCitations;
  /**
  * Counted collections inside named sections (RV2206): each entry
  * demands at least `min` matches of `pattern` inside `section`'s
  * slice, DISTINCT by first capture when the pattern captures.
  * Requires `sections`. The `samples` are literal matches embedded in
  * the golden fixtures and quoted by the prompt: with a capturing
  * pattern they must carry at least `min` DISTINCT captures, because
  * the accept skeleton must itself satisfy the demand.
  */
  sectionPatterns?: FinishContractSectionPattern[];
  /**
  * Whether fenced code blocks count (cycle 74): 'counted' (the
  * default) or 'excluded' (fenced code is removed before section
  * matching, slicing, word counting, and citation matching, so code
  * samples can neither satisfy a marker nor pad a count). Joins the
  * hash and adds a prompt statement only when 'excluded'; an explicit
  * 'counted' normalizes away. With 'excluded', a section marker or a
  * citation sample that would itself OPEN a fence is a ConfigError,
  * because the golden fixtures embed both at line starts.
  */
  fencedCode?: FencedCodeMode;
}
/**
* One per validator reject golden (cycle 74): a fixture the NAMED
* contract validator is proven to reject at construction time.
* {@link selfTestFinishValidation} holds the CONFIGURED validator of
* that name against it, so a same-name replacement weaker than the
* contract's own validator (a words minimum of one standing in for
* three thousand) is caught before any provider call instead of
* silently accepting what the journaled contract hash forbids.
*/
interface FinishContractGoldenReject {
  /** The contract validator this fixture targets, by name. */
  readonly validator: string;
  /** The fixture that validator must reject. */
  readonly input: FinishValidationInput;
}
/**
* What {@link finishContract} builds from a manifest. The whole bundle
* is DEEPLY frozen (cycle 74): the nested manifest objects, the
* sections array, the validators array, and each validator object, so
* a post construction mutation throws instead of silently diverging
* behavior from the journaled contract hash.
*/
interface FinishContract {
  /** The normalized manifest (defaults applied), deeply frozen. */
  readonly manifest: FinishContractManifest;
  /** sha256 hex over the JCS serialization of the normalized manifest. */
  readonly hash: string;
  /**
  * The stock validators enforcing the manifest; names are
  * 'contract-*'. The array and each validator object are frozen at
  * runtime (the type stays mutable for source compatibility), so an
  * in-place pop or a validate() swap throws instead of silently
  * weakening what the hash promises.
  */
  readonly validators: FinishValidator[];
  /** The contract statement for the model, one demand per line. */
  readonly promptLines: readonly string[];
  /** A generated fixture every contract validator accepts. */
  readonly goldenAccept: FinishValidationInput;
  /**
  * A generated fixture at least one contract validator rejects.
  * Absent when the manifest carries only upper bounds, because an
  * empty result is then legitimately acceptable.
  */
  readonly goldenReject?: FinishValidationInput;
  /**
  * One reject golden PER contract validator (cycle 74), in validator
  * order, each verified at construction; boundary sharp where a
  * boundary is mechanically safe (the words fixture sits exactly one
  * word outside the bound), the empty text otherwise.
  */
  readonly goldenRejects: readonly FinishContractGoldenReject[];
}
/**
* Builds a {@link FinishContract} from one manifest: validation and the
* golden fixtures happen HERE, at configuration time, so a
* self-contradictory contract (mandatory content alone above words.max,
* an unsampled custom pattern) fails before any run exists. Spread
* `contract.validators` into finishValidation.validators and pass the
* contract itself as finishValidation.contract; the orchestrator then
* injects `promptLines` into the coordination and synthesis prompts,
* runs the golden self test at construction, and journals the frozen
* bundle descriptor.
*/
declare function finishContract(manifest: FinishContractManifest): FinishContract;
/** Golden fixtures of the construction self test. */
interface FinishSelfTestFixtures {
  /** Every configured validator must accept this input. */
  accept?: FinishValidationInput;
  /** At least one configured validator must reject this input. */
  reject?: FinishValidationInput;
}
/** One self test failure. */
interface FinishSelfTestFailure {
  fixture: "accept" | "reject";
  /**
  * The failing validator: the rejecting one on the accept side, the
  * named one on a per validator reject golden (cycle 74); absent
  * only on the vacuous single-fixture reject side.
  */
  validator?: string;
  reasons: string[];
}
/** The self test verdict over one validator set. */
interface FinishSelfTestReport {
  ok: boolean;
  failures: FinishSelfTestFailure[];
}
/**
* Runs a configured validator set against golden fixtures BEFORE any
* provider call exists (the v1.71 experiment review, P0.3): the accept
* fixture must pass every validator (a stale validator rejecting a
* correct skeleton is exactly the drift the experiment died of, three
* renamed sections deep into a paid run), and the reject fixture must
* fail at least one (a set that accepts the known-bad input validates
* nothing). A validator that THROWS here is a host defect and the
* ConfigError propagates, the same posture the live loop takes.
* Deterministic and free: validators are pure synchronous host code by
* contract, so this costs zero provider calls. `rejects` (cycle 74)
* carries the contract's per validator reject goldens: for each one
* the CONFIGURED validator of that name must exist and must reject
* the fixture, so a same-name replacement weaker than the contract's
* own validator fails here instead of silently accepting what the
* journaled contract hash forbids.
*/
declare function selfTestFinishValidation(options: {
  validators: readonly FinishValidator[];
  accept?: FinishValidationInput;
  reject?: FinishValidationInput;
  rejects?: readonly FinishContractGoldenReject[];
}): FinishSelfTestReport;
//#endregion
//#region src/orchestrator/handles.d.ts
/** The per-child digest handed to the orchestrator. */
interface TaskDigest {
  nodeId: string;
  logicalTaskId: string;
  status: string;
  outputSummary: string;
  costUsd: number;
  artifactsIndex: string[];
  /**
  * The child's replay-stable execution facts (RV1503), present only
  * under the `executionFacts` opt-in: what the run itself observed,
  * so the composing root can grade `live-observed` honestly instead
  * of erasing its own run. See {@link executionFactsOf}.
  */
  facts?: ChildExecutionFacts;
  /**
  * On `await_any` digests (RV1807): the settled subset of the WAITED
  * handle set at return time, the race winner included. The
  * nineteenth benchmark's root probed handles with speculative
  * `get_child_result` calls and collected eight not-settled errors;
  * this list is the exact consume set, so probing is never needed.
  */
  settledHandles?: number[];
}
/**
* One child's execution facts, folded ONLY from replay-stable settled
* material (RV1503): the journaled per-dispatch reconciliation records
* and the journaled usage, which a resumed run restores verbatim.
* Dollars are deliberately absent: replay re-prices from the CURRENT
* price table, so a money figure here would drift across resumes while
* these counters cannot.
*/
interface ChildExecutionFacts {
  /** Provider HTTP requests the child's dispatches made (RV1210 semantics). */
  wireRequests: number;
  /** Wire requests no response id names (the invoice cardinality rule). */
  wireIdsMissing: number;
  inputTokens: number;
  outputTokens: number;
}
/**
* Folds one settled child's replay-stable execution facts (RV1503).
* Per dispatch record: the wire count is the adapter-reported
* `wireRequests` when present, else the absorbed id list's length,
* else one (a single-wire dispatch); the named side counts the
* absorbed ids or the single `responseId`, clamped by the wire count
* (RV1410: a keyless single-wire row contributes one missing id).
* Pure over the settled result, so live and resumed folds agree byte
* for byte.
*/
declare function executionFactsOf(result: AgentResult<unknown>): ChildExecutionFacts;
/**
* One page of a settled child's FULL output, returned by the opt-in
* `get_child_result` tool. The digest is a wake signal truncated to 400
* characters; this is the whole evidence, paged so a large result can be
* read without overflowing the orchestrator's context in one call
* (v1.40.0 improvement plan, the narrow RV-201 slice). The content is a
* deterministic serialization of the child's `output` (the raw string
* when the output IS a string, else its JCS-independent `JSON.stringify`)
* for a settled ok child, or the child's `errorMessage` otherwise, so the
* orchestrator can read WHY a child failed as readily as what it
* produced; a limit child carrying a structured terminal partial serves
* `{ error, partial }` instead (RV-210 close-out), so the collected work
* is pageable in full. Everything here is a pure read of already durable
* journal state, so a resume reproduces it with no new spend.
*/
interface ChildResultPage {
  handle: number;
  status: string;
  /** Length of the whole serialized result, in characters. */
  totalChars: number;
  /** The character offset this page starts at, counted from zero. */
  offset: number;
  /** The page: `content.length` is at most the requested (clamped) maxChars. */
  content: string;
  /** True when more characters remain past this page; call again with a higher offset. */
  hasMore: boolean;
  /** The child's artifacts, id and kind, so the model knows what `read_child_artifact` can fetch. */
  artifacts: Array<{
    id: string;
    kind: string;
    label?: string;
  }>;
  /** The child's execution facts (RV1503), under the `executionFacts` opt-in only. */
  facts?: ChildExecutionFacts;
}
/**
* One page of a settled child's artifact CONTENT, returned by the opt-in
* `read_child_artifact` tool. Inline artifact `data` serializes to a
* string; an offloaded artifact (a TranscriptStore `ref`) is fetched and
* decoded as UTF-8; a `patch` artifact with only a changed file list
* carries that list in `files` and empty content. Paged and pure exactly
* like {@link ChildResultPage}.
*/
interface ChildArtifactPage {
  handle: number;
  artifactId: string;
  kind: string;
  label?: string;
  totalChars: number;
  offset: number;
  content: string;
  hasMore: boolean;
  /** The changed file list for a `patch` artifact; absent otherwise. */
  files?: string[];
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
  /** The spawn's escalation flavor, captured at dispatch. */
  escalationFlavor?: "A" | "B";
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
  }, origin?: "spawn_agent" | "parallel_agents"): Promise<{
    handle: number;
  }>;
  awaitAny(handles: number[]): Promise<TaskDigest>;
  awaitAll(handles: number[]): Promise<TaskDigest[]>;
  cancel(handle: number, reason?: string): Promise<{
    cancelled: boolean;
    handle: number;
  }>;
  /** Sleep until a coalesced WakeDigest (M6-T09). */
  waitForEvents(triggers: unknown): Promise<unknown>;
  /** A page of a settled child's full output; opt-in `get_child_result` (RV-201). */
  getChildResult(handle: number, opts?: {
    offset?: number;
    maxChars?: number;
  }): Promise<ChildResultPage>;
  /** A page of a settled child's artifact content; opt-in `read_child_artifact` (RV-201). */
  readChildArtifact(handle: number, artifactId: string, opts?: {
    offset?: number;
    maxChars?: number;
  }): Promise<ChildArtifactPage>;
  /**
  * First pages of SEVERAL settled children in one call; opt-in
  * `get_settled_child_results` (RV1807). Refuses typed BEFORE any
  * read when any named handle is unknown or still running, so
  * consuming the exact `settledHandles` set of an `await_any` digest
  * never probes by error.
  */
  getSettledChildResults(handles: number[], opts?: {
    maxCharsPerChild?: number;
  }): Promise<ChildResultPage[]>;
}
/**
* The committed WakeDigest render budget (Appendix A: 400
* chars per outputSummary row, the character measure; committed at M10
* entry by adopting the implemented distillation cap unchanged, the
* value frozen into every cassette since M6). One value serves both
* stages: the deterministic distillation cap here and the digest
* render default in orchestrate (renderBudgetChars).
*/
declare const WAKE_SUMMARY_RENDER_BUDGET_CHARS = 400;
/**
* The M6 outputSummary: a deterministic truncation of the child's
* output (or error message), identical live and on replay (distillation
* lives with the child, ordered by
* spawn ordinal; the LLM distillation upgrade is M7 territory).
*/
declare function summarizeOutput(result: AgentResult<unknown>): string;
/**
* Folds one settled child into its digest (spawn-ordinal ordering is
* the caller's). `includeFacts` (RV1503) appends the replay-stable
* execution facts; absent or false keeps the digest byte identical.
*/
declare function digestOf(record: SpawnRecord, result: AgentResult<unknown>, includeFacts?: boolean): TaskDigest;
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
/** The wait_for_events parameter schema (normative). */
declare const WAIT_FOR_EVENTS_SCHEMA: SchemaSpec;
declare const WAIT_FOR_EVENTS_TOOL_NAME = "wait_for_events";
/** The closed v1 trigger vocabulary. */
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
/** The escalation block of a digest. */
interface EscalationDigest {
  nodeId: string;
  logicalTaskId: string;
  /** seq of the terminal escalated entry or the suspended escalate entry. */
  reportRef: number;
  kind: string;
  flavor: "A" | "B";
  /** Flavor B only. */
  deadlineAt?: string;
}
/** Passive budget visibility in every digest (DEF-7). */
interface WakeBudgetBlock {
  runSpentUsd: number;
  runCeilingUsd: number;
  orchestratorSpentUsd: number;
  orchestratorCapUsd: number;
  finalizeReserveUsd: number;
  /** spent / max(runSpent, epsilon 0.01): the H-OrchShare input. */
  orchestratorShare: number;
  /** True at >= 0.8 x (cap - reserve); fixed in v1 (Appendix A). */
  softWarning: boolean;
}
/**
* The FINAL normative WakeDigest: one coordinated
* schema change inside the hashVersion-2 profile (XF-12). The digest
* render enters the content key of orchestrator turns. In runs without
* the PlanRunner extension the termination, budget, and reuse blocks are
* all-zero and planHash is empty, mirroring the CostReport convention.
*/
interface WakeDigest {
  digestSeq: number;
  /** Plan hash at emission time ('' outside PlanRunner). */
  planHash: string;
  coversToOrdinal: number;
  /** Ordered by spawn ordinal, never wall-clock (coalescing rule). */
  completedDigests: TaskDigest[];
  /** Pending and newly decided reports. */
  escalations: EscalationDigest[];
  /** Mandatory (DEF-2). */
  termination: {
    revisionUnitsRemaining: number;
    spawnUnitsRemaining: number;
    perLineage: Record<string, {
      escalationUnitsRemaining: number;
      rungsRemaining: number;
    }>;
    phi: number;
  };
  /** Mandatory (DEF-7). */
  budget: WakeBudgetBlock;
  /** Reuse and oscillation stats (DEF-5): the AbandonedSpendView shape. */
  reuse: {
    abandonedUsd: number;
    reclaimedUsd: number;
    netLostUsd: number; /** Per-SpawnKey rows (present under PlanRunner). */
    byKey?: Record<string, {
      abandonedUsd: number;
      reclaimedUsd: number;
    }>;
  };
}
/** The all-zero blocks of runs without the PlanRunner extension. */
declare function emptyDigestBlocks(): Pick<WakeDigest, "planHash" | "termination" | "budget" | "reuse">;
//#endregion
//#region src/orchestrator/extension.d.ts
/** One append into an extension-owned sequential scope. */
interface ExtensionAppendInput {
  scope: string;
  /** The content key; extension kinds derive their own. */
  key: string;
  kind: EntryKind;
  value: Json;
}
/** A child dispatch under an explicit scope (plan/NodeId). */
interface ExtensionDispatchSpec {
  agentType: string;
  prompt: string;
  /** Resolved against defaults.schemas; unknown names are typed errors. */
  outputSchemaRef?: string;
  /** Resolved against defaults.toolsets; unknown names are typed errors. */
  toolsetRef?: string;
  isolation?: IsolationSpec;
  budgetUsd?: number;
  usageLimits?: Partial<UsageLimits>;
  escalation?: EscalationOptions;
  approach?: string;
  taskClass?: string;
  /**
  * A retained transcript checkpoint the dispatch boots from (park and
  * unpark continuation, the DEF-5 graft boot). Dangling redispatch
  * checkpoints take precedence.
  */
  bootCheckpointRef?: string;
  /**
  * The CONCRETE model of this attempt: the ladder driver resolves each
  * rung to its `{ model, effort }` form and dispatches with it, so the
  * attempt's identity hash includes the concrete ModelRef. The
  * orchestrator itself never names models; only the
  * engine-side driver populates this from the declared ladder.
  */
  model?: {
    model: ModelRef;
    effort?: Effort;
  };
  /**
  * Rung/fallback opt-in: a memoized terminal
  * outcome replays by match instead of re-running live; the global
  * default errors-re-run-live is preserved (DEF-1).
  */
  memoizeOutcome?: boolean;
  /**
  * An INLINE SchemaSpec for engine-synthesized children (the ladder
  * judge verdict); user-authored plan specs use `outputSchemaRef`
  * against the registry instead.
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
  * The per-engine mechanical gate registry:
  * named pure functions over AgentResult.artifacts. Typed loose at the
  * seam exactly like `profiles`.
  */
  readonly gates: Record<string, unknown>;
  /** The run USD ceiling (B0), when one exists. */
  readonly runCeilingUsd?: number;
  /**
  * The resolved orchestrator cap in absolute USD (DEF-7; XF-09):
  * min(budget.capUsd, capFraction x B0) on a fresh run, the frozen
  * orchestrator_budget_reserve dollars on resume. Resolved strictly
  * before boot so an extension can freeze it into termination.init;
  * always present under PlanRunner (an unresolvable cap refuses boot).
  */
  readonly orchestratorCapUsd?: number;
  /** The finalize reserve carved out of the cap, resolved with it. */
  readonly finalizeReserveUsd?: number;
  /** ULID minting for engine-owned identifiers (NodeIds). */
  mintId(): string;
  /**
  * A journaled random draw in [0, 1) under the orchestrate scope: the
  * ctx.random primitive, computed once live and replayed by match. The
  * spot-check gate draws HERE, never Math.random.
  */
  random(key?: string): Promise<number>;
  /** Total-order append; the extension owns its scopes' content keys. */
  append(input: ExtensionAppendInput): Promise<JournalEntry>;
  /** The pinned journal view backing every pure fold. */
  snapshot(): readonly JournalEntry[];
  /** Flushes the serialized append queue before reading back. */
  flush(): Promise<void>;
  /** The single admission point for all spawns. */
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
  * ResolutionArbiter (DEF-4/DEF-5).
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
  * (DEF-5). Idempotent; rebuilt by fold on resume.
  */
  registerAlias(donorScope: string, targetScope: string): void;
  /** The engine price fold (journal facts in, USD out). */
  priceUsd(servedBy: string | undefined, usage: Usage): number | undefined;
  /** Telemetry emission into the run event stream. */
  emit(event: {
    type: string;
  } & Record<string, unknown>, options?: {
    /**
    * Marks the event as the replay of a journal-recovered decision
    * (the standard envelope flag), so extension surfaces can emit
    * recovered admissions honestly (v1.22.0 review P2-5).
    */
    replayed?: boolean;
  }): void;
  /**
  * A deterministic run failure declared by the extension (v1.35.0 review P2-1):
  * the first call stores the error and aborts the orchestrator loop;
  * the orchestrate settle boundary rethrows it, so the run fails with
  * the given typed error instead of asking the model to finish. Later
  * calls do nothing. The intended producer is a journaled
  * policy verdict (the PlanRunner guards fallback 'fail-run'): boot
  * terminates again from the journal on resume, so the failure rolls
  * forward without another decision or model call. Optional so
  * IO implementations built before v1.36 keep compiling.
  */
  terminate?(error: Error): void;
}
/**
* The extension contract. PlanRunner implements it in @rulvar/plan; the
* mode (c) orchestrator hosts it. Everything is optional except the
* toolset: an extension that adds no tools has no reason to exist.
*/
interface OrchestratorExtension {
  readonly name: string;
  /**
  * Runs strictly BEFORE the orchestrator agent's first entry
  * (termination.init precedes the first scheduling entry and the
  * budget reserve). On resume it rebuilds state from the journal.
  */
  boot?(io: OrchestratorExtensionIO): Promise<void> | void;
  /** Extension tools appended to the mode (c) toolset. */
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
  * Quiescence participation: the mandatory trigger fires
  * only when every dispatched child settled AND the extension reports
  * nothing running and nothing ready.
  */
  quiescent?(): boolean;
  /**
  * The finish gate (RV3202): consulted FIRST on every ordinary
  * coordination finish call, before any configured finish/draft
  * validator. A refusal returns as the finish tool's typed error
  * result (nothing journals, no repair spent, bounded by the turn
  * budget), so the model resolves the named blockers and calls finish
  * again. Quiescence participation alone gates only WAKES; without
  * this hook a root could finish over the extension's still-running
  * work and, absent an acceptance policy, settle a bare ok while the
  * exit barrier cancelled it (the 2026-08-11 experiment's PlanRunner
  * early-finish blocker). MUST be pure over journal-derived state: a
  * re-executed turn re-evaluates the gate over the rebuilt fold and
  * must render the same verdict. A throwing gate is a host defect and
  * fails the run. The forced-finalization and synthesis finishes are
  * never gated.
  */
  finishGate?(): {
    ok: true;
  } | {
    ok: false;
    reason: string;
  };
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
/**
* Budget contract: https://docs.rulvar.com/guide/budgets; the cap
* machinery (reserves, freeze) completes in M7 (DEF-7).
*/
interface OrchestratorBudgetSpec {
  /**
  * Absolute bound in USD: a finite number >= 0, validated before any
  * journal entry or dispatch (a malformed value is a ConfigError). It
  * never REPLACES the fraction bound:
  * effectiveCap = min(capUsd, (capFraction ?? 0.2) * ceiling), so an
  * explicit capUsd larger than the default fraction of the run ceiling
  * is still cut to that fraction (and a warn log says so). Pass
  * capFraction: 1.0 to make capUsd the sole bound.
  */
  capUsd?: number;
  /**
  * A fraction in (0, 1], default 0.2; effectiveCap = min of the given
  * bounds. Zero does not lift the cap (it would make every turn
  * unpayable): anything outside (0, 1] is a ConfigError before any
  * journal entry or dispatch.
  */
  capFraction?: number;
  /**
  * A finite number >= 0, validated before any journal entry or
  * dispatch. The reserve is SUBTRACTED from the soft boundary, so a
  * negative value would widen the cap instead of reserving.
  */
  finalizeReserveUsd?: number;
  /**
  * The synthesis payload reserve (the sixth comparison experiment,
  * cycle 76): absolute USD held out of the orchestrator sub account
  * while the coordination loop runs, released to the synthesis
  * invocation just before it dispatches. Without it a pricey
  * coordination can leave the synthesis turns a remainder the budget
  * clamp shrinks below the contract's minimal accepting payload: the
  * finish is then cut at the output allowance before any tool call,
  * the invocation dies at maxTurns, and a validator-bound run fails
  * closed (the rematch run 1 lost an entire paid run exactly there).
  * Requires the `synthesis` option (single mode); must stay below the
  * effective cap. Declaring it changes budget arithmetic only; absent
  * keeps every account byte identical.
  */
  synthesisReserveUsd?: number;
  /**
  * The admission posture of the acceptance path (RV3907, the fourth
  * comparison experiment). Preflight has long PRICED the tail and
  * warned (`reserve-line-headroom`, `orchestrator-working-room`), and
  * the experiment's run started anyway, with the warnings on record
  * and the acceptance machinery funded by luck. 'warn' (default)
  * keeps exactly that: findings in preflight, nothing at runtime.
  * 'require' turns the arithmetic into a boot refusal BEFORE the
  * first wire: the effective cap must cover, at exact fill or
  * better, the DECLARED acceptance tail (the held
  * `synthesisReserveUsd`, the claim judge's `judge.estCost` times
  * one plus the armed semantic repair round, the declared
  * `finishValidation.estRepairCostUsd`, and the armed round's
  * declared `synthesis.estCost` composition floor) plus one
  * coordination turn floor of working room. Undeclared estimates
  * contribute zero, so the gate binds exactly what the host
  * declared; the refusal journals an `acceptance_reserve_refused`
  * decision naming every term and throws the typed
  * OrchestratorCapConfigError with the same arithmetic.
  *
  * 'checkpoint' (RV4404, the seventh comparison experiment) is
  * 'require' plus a runtime re-check of the SAME arithmetic before
  * each paid acceptance-tail dispatch (the first composition, each
  * judge pass): the worst case still ahead, at the money actually
  * spent, must fit the effective cap, or the run refuses typed NOW,
  * before paying the stage. The intake gate binds declared
  * estimates; runtime actuals can exceed them (the seventh run's
  * workers overshot their declared estimate 2.8x and the refusal
  * came only where the armed round could not dispatch, after the
  * composition and both judges were already paid). The checkpoint
  * moves the refusal to the first moment the arithmetic is known
  * lost; in the seventh run that is right after the workers, saving
  * the composition and both judge passes. The refusal journals an
  * `acceptance_checkpoint_refused` decision naming the stage and
  * every term, and throws typed with the same fields.
  */
  acceptanceReserve?: "warn" | "require" | "checkpoint";
  /**
  * Enforced stage ceilings (RV4404): with `estIsCeiling: true`, a
  * spawned child's DECLARED estimate (its `budgetUsd`, else its
  * profile's `estCost`) becomes the hard ceiling of its own
  * allowance account, so a child that overshoots its declaration
  * refuses individually and honestly at its own ceiling instead of
  * silently eating the acceptance tail. The seventh comparison
  * experiment's workers declared 0.25 USD each and spent 0.58..0.77;
  * the intake gate had verified the tail against the declarations,
  * so the run passed `fits: true` honestly and still could not pay
  * its armed round. Under this mode plus 'checkpoint', a preflight
  * `fits: true` becomes a dispatch guarantee for the declared tail:
  * the fan-out cannot spend past its declarations, and the
  * checkpoint refuses before any tail stage the remaining money
  * cannot carry. Opt-in; spawns without any declared estimate keep
  * the parent-account flow byte for byte.
  */
  estIsCeiling?: boolean;
  /**
  * A positive integer, validated before any journal entry or dispatch:
  * the turn limit of the reserved final wake.
  */
  finalizeTurns?: number;
  /**
  * The policy at the cap, validated as exactly one of the two literals
  * even at a plain JS/JSON boundary. 'finish-with-partial' (default)
  * runs the reserved finalizer and settles run status 'ok' with the
  * completion envelope { result, completion } as the value (RV906):
  * completion is 'partial' unless the finalizer's finish provably
  * passed the FULL declared contract (the declared finish validators
  * bind the reserved finalizer; a declared acceptance policy is never
  * judged at the cap, so with one declared the terminal stays
  * 'partial'). The engine lifts the same literal onto run:end and the
  * outcome mirror, so a consumer reading only status cannot execute a
  * truncated plan as a full success. A finalizer that cannot produce
  * an accepted finish falls back to the deterministic partial on the
  * 'exhausted' outcome, itself carrying completion 'partial'.
  * 'fail-run' skips the finalizer entirely: the run
  * fails with outcome 'error' carrying FailRunError (code 'fail_run',
  * data.source 'orchestrator_budget_cap', data.capDecisionRef); resume
  * rolls the same failure forward from the journaled cap decision
  * without another model call.
  */
  atCap?: "finish-with-partial" | "fail-run";
}
/** Options for orchestrate(engine, goal, o?). */
/**
* The opt-in child completion policy (the v1.40.0 improvement plan's
* completion contract): run status 'ok' alone never proves the children
* succeeded, because the model may call finish after any mix of child
* outcomes. When acceptance is set, the policy is evaluated exactly when
* the model's finish validates, the verdict is journaled as ONE decision
* entry (so a resume rolls the SAME verdict forward, immune to drift of
* the live options), and the workflow result becomes the acceptance
* envelope { result, completion, childStatusCounts, degradedReasons }. A
* violated policy fails the run with the typed FailRunError (code
* 'fail_run', data.source 'orchestrator_acceptance') instead of settling
* ok. A budget cap settle keeps its atCap policy and acceptance is not
* judged at the cap: under 'finish-with-partial' the capped terminal
* carries completion 'partial' in its envelope (RV906) precisely
* because the declared acceptance went unjudged, and under 'fail-run'
* the typed failure stands, so the cap can never impersonate an
* accepted finish.
*/
interface OrchestrateAcceptance {
  /**
  * 'all-ok' requires EVERY spawned child to have settled 'ok' when
  * finish validates: a child still running counts against the policy,
  * and so does a deliberately cancelled straggler (spawn nothing you do
  * not need to succeed; zero spawned children are vacuously complete).
  * { minSuccessful: N } requires at least N children settled 'ok' and
  * reports every other child in degradedReasons.
  */
  childPolicy: "all-ok" | {
    minSuccessful: number;
  };
  /**
  * The partial-child salvage switch (RV-210 close-out; default false).
  * When true, a child that settled 'limit' WITH a structured terminal
  * partial (it recorded progress through the stock `report_progress`
  * tool before the budget expired) counts as a successful child for the
  * policy: under 'all-ok' it no longer rejects the run, and under
  * { minSuccessful: N } it counts toward N. The acceptance verdict then
  * reports completion 'partial' (never 'complete'), lists the salvaged
  * children in `salvagedPartialChildren` on the result envelope, and
  * keeps a per-child note in degradedReasons. A limit child WITHOUT a
  * partial gave the caller nothing to salvage and still counts against
  * the policy. The whole fold is journaled in the single acceptance
  * decision, so a resume rolls the same verdict forward.
  */
  acceptPartialChildren?: boolean;
  /**
  * The spawned-roster floor (RV507): finish is rejected when FEWER
  * than this many children were spawned, under BOTH child policies.
  * 'all-ok' alone treats zero spawned children as vacuously complete
  * (spawn nothing you do not need to succeed), which lets a
  * fan-out-shaped task settle ok without ever fanning out; the floor
  * makes the intended decomposition binding. The journaled decision
  * (and a rejection's error data) carries the actual
  * `spawnedChildren` beside the configured floor, so a resume rolls
  * the same verdict forward. Positive integer; policy only, never
  * part of any identity.
  */
  minSpawnedChildren?: number;
  /**
  * The terminal-output salvage switch (the 1.64.0 experiment review,
  * P0.4 + P1.1; default false). When true, a child that settled
  * 'limit' CARRYING a terminal output counts as a successful child for
  * the policy, exactly like acceptPartialChildren counts a
  * partial-bearing one. A limit terminal carries an output ONLY when
  * the child's limits.finalizationReserve summary turn produced one
  * AND, for a schema child, that summary already validated against the
  * declared output schema (an invalid summary keeps output null and is
  * never salvaged), so validation runs BEFORE acceptance by
  * construction. The verdict then reports completion 'partial' (never
  * 'complete'), lists the children in `salvagedTerminalOutputChildren`
  * on the result envelope, and keeps a per-child note in
  * degradedReasons. A child carrying BOTH an output and a progress
  * partial salvages by its output. The child's digest and
  * get_child_result surface the output unconditionally (paid, journaled
  * evidence is never withheld); this option gates only the acceptance
  * fold, the evidencePreservedValidator cited pool (via
  * FinishValidationChild.salvageableOutput), and the coordination
  * prompt line. The whole fold is journaled in the single acceptance
  * decision, so a resume rolls the same verdict forward.
  */
  acceptValidatedTerminalOutputOnLimit?: boolean;
  /**
  * The character floor a limit child's STRING terminal output must
  * clear, after trim, before the salvage arm above may accept it
  * (RV4704, the eighth comparison experiment's first run): that run
  * accepted a child as degraded-with-output on a 16-token finalize
  * summary that carried no answer, and the acceptance decision read
  * "validated terminal output" over bytes nobody could use. Default
  * {@link DEFAULT_TERMINAL_OUTPUT_FLOOR_CHARS}; a below-floor string
  * is a limit WITHOUT acceptance, its degraded note naming the
  * character counts. Structured (schema-validated) outputs pass by
  * their validation, exactly as before. 0 restores the pre-RV4704
  * acceptance byte for byte. Nonnegative integer; policy only, never
  * part of any identity.
  */
  minTerminalOutputChars?: number;
  /**
  * The binding evidence floor (RV1207, the sixteenth comparison run;
  * default false). A salvage arm above accepts a limit child by the
  * work it carries, which says nothing about the DECLARED evidence
  * contract: in that run a worker settled 'limit' with 10 of 14
  * declared entries and was promoted through terminal-output salvage
  * with the floor waived, so an 'all-ok' run reported status ok
  * (completion 'partial') over an unmet contract. With this true, a
  * child that declared an evidence contract it did not meet is NEVER
  * promoted by a salvage arm: it counts against the policy exactly
  * like an unsalvageable limit child, so 'all-ok' rejects and
  * { minSuccessful: N } does not count it toward N. Salvage stays
  * DIAGNOSTIC: the roster still records the arm that would have
  * applied and the evidence verdict (marked `floorRequired` instead
  * of `waivedBySalvage`), the degradedReasons name the shortfall with
  * its counts, and the child's output stays visible through the
  * digest and get_child_result exactly as before. A child with no
  * declared contract, or one that met its floor, is untouched.
  *
  * Since RV1412 the same flag binds the floor for OK children too: a
  * child that settled 'ok' below its declared floor counts against
  * the policy ('all-ok' rejects; `{ minSuccessful: N }` does not
  * count it toward N), its roster row is marked `floorRequired`, and
  * `belowFloorOkChildren` lists it. WITHOUT the flag such a child is
  * visible but uncounted: the shortfall is a degradation note (so
  * completion honestly reads 'partial', never 'complete' over an
  * unmet declared contract), the list is present, and the verdict is
  * exactly what it was before this shipped.
  */
  requireEvidenceFloor?: boolean;
}
/** How many rejected finishes are repaired by default: the plan's repair once. */
declare const DEFAULT_FINISH_MAX_REPAIRS = 1;
/**
* The default character floor a limit child's string terminal output
* must clear, after trim, to be salvageable as validated output
* (RV4704): see OrchestrateAcceptance.minTerminalOutputChars.
*/
declare const DEFAULT_TERMINAL_OUTPUT_FLOOR_CHARS = 80;
/**
* The word ceiling of a 'digest' coordination draft (RV4210): the
* digest is a structural evidence map the composing invocation writes
* prose FROM, and the ceiling is the teeth that keep it from decaying
* back into the full prose draft it exists to replace. The sixth
* comparison run's contract-policy draft cost 344.8 seconds of model
* output and was then rewritten whole by the composition.
*/
declare const DIGEST_DRAFT_MAX_WORDS = 400;
/** The sectional round's owning sections and marker roster (RV3803). */
interface SectionalRoundPlan {
  /** Every H2 marker of the retained document, in document order. */
  sections: string[];
  /** The markers owning at least one finding excerpt, document order. */
  targets: string[];
}
/**
* Plans the sectional claim repair round (RV3803): which H2 sections
* of the accepted pre-repair document own the judged findings. The
* third comparison run's round regenerated the WHOLE 43k character
* document to consume findings that lived in a handful of sentences,
* and the tail after fan-in was 80.1 percent of the run's wall. Each
* finding's `draftExcerpt` (whitespace collapsed by the pairing fold)
* is located in the document through a collapse-aware scan, and its
* owning section is the nearest H2 line above it. Fail closed to the
* FULL regeneration (undefined, the historical round byte for byte)
* whenever the plan cannot be exact: no excerpts, a document without
* H2 headings, duplicated markers (the splice grammar needs unique
* lines), or any excerpt the scan cannot locate.
*/
declare function sectionalRoundPlan(document: string, excerpts: readonly string[]): SectionalRoundPlan | undefined;
/**
* Character cap of the HOST VALIDATION LESSONS prompt block (RV3603):
* the bounded repair round's prompt folds the run's journaled finish
* validation failures so the round does not relearn a lesson the run
* already bought, and a pathological history must not flood the
* composition context. Rows keep journal order; the tail is dropped
* and the block names how many rows it dropped.
*/
declare const FINISH_LESSON_CAP_CHARS = 2e3;
/**
* Default maxTurns of the synthesize invocation (RV-211): the finish
* call plus headroom for one validator repair exchange.
*/
declare const DEFAULT_SYNTHESIS_MAX_TURNS = 4;
/**
* Default maxTurns of ONE incremental synthesis note (RV-211 remainder):
* a note summarizes a single settled child into a bounded finish call,
* so it needs less headroom than the full synthesis invocation.
*/
declare const DEFAULT_SYNTHESIS_NOTE_MAX_TURNS = 2;
/**
* Default maxTurns of the claim-consistency judge invocation
* (RV1502): one structured-output turn plus headroom for schema
* repair exchanges.
*/
declare const DEFAULT_CLAIM_JUDGE_MAX_TURNS = 3;
/**
* The opt in deterministic validation of the orchestrator finish result
* (the v1.40.0 improvement plan's RV-204 slice). Every SCHEMA valid
* finish({ result }) call first passes the configured host validators;
* a rejection returns the failure reasons to the model as the call's
* error tool result and the turn continues (a repair turn: the model
* fixes the result and calls finish again), bounded by maxRepairs
* within the composition invocation (RV3602). A
* rejection past the bound fails the run with the typed FailRunError
* (code 'fail_run', data.source 'orchestrator_finish_validation'),
* BEFORE the acceptance settle, so acceptance never judges a finish the
* validators rejected. Every verdict journals as ONE decision entry
* keyed by the finish call id (decisionType
* 'orchestrator_finish_validation'), so a resume rolls the SAME
* verdicts forward without re-running validator code, and the whole
* exchange replays without new paid calls. The toolset never changes
* (the contract rides the orchestrator prompt), zero configuration adds
* zero journal entries, and the budget cap paths keep their posture:
* the reserved finalize dispatch is never validated, exactly as
* acceptance never judges it. Repair turns spend from the
* orchestrator's ordinary limits and ceilings (maxTurns, budget caps,
* the root budgetUsd); maxRepairs is the explicit bound, and a
* dedicated repair budget reserve is deliberately out of scope here.
*/
interface FinishValidationSpec {
  /**
  * Run in configuration order on every schema valid finish call; names
  * must be unique (pass `name` to a factory to run several instances).
  * A validator that THROWS is a host defect: the run fails as
  * ConfigError, nothing journals, and no repair turn is granted.
  */
  validators: FinishValidator[];
  /**
  * How many rejected finishes are returned to the model for repair
  * before the run fails; a nonnegative integer, default
  * {@link DEFAULT_FINISH_MAX_REPAIRS}. Zero means the first rejected
  * finish fails the run. The bound belongs to one composition
  * invocation (RV3602): with the bounded claim repair round armed
  * (`claimConsistency.onFound: 'repair'`), the initial composition
  * and the round each enter with the full bound, because the third
  * comparison run's round inherited a spent run wide pool and its
  * first regression was final by construction. At most two
  * invocations exist, so the worst case is `maxRepairs + 1` judged
  * finishes per invocation, twice.
  */
  maxRepairs?: number;
  /**
  * Retain the BYTES of every rejected finish candidate as its own
  * addressable transcript blob (RV2507, the 1.226.0 comparison run),
  * default off. The identity of a rejected candidate always rides the
  * terminal (`rejectedFinishCandidates`: the call id, the sha256 that
  * names WHICH document drew the verdict, its size, and the validator
  * diffs); that costs nothing, because it is derived from decisions
  * the journal already holds. A COPY of the document costs storage,
  * so it is a decision the host makes: with this on, each rejected
  * candidate is written to `<runId>/finish-rejected/<callId>` and the
  * terminal row carries its `ref`, one `transcripts.get` away from the
  * bytes. Turn it on for evaluation and comparison runs. The
  * comparison run's three rejected syntheses were reachable only by an
  * external script that re-parsed the whole agent transcript; nothing
  * on the terminal or in the journal said where they were, or even
  * that they differed from each other.
  *
  * Bounded by construction: at most `maxRepairs + 1` candidates per
  * finish-validated invocation, under the run's own prefix, so
  * `Engine.deleteRun` cascades over them like every other run blob. A
  * store that refuses the write costs the run nothing: the row keeps
  * its identity and drops its `ref`, and absence means NOT RECORDED.
  */
  retainRejectedCandidates?: boolean;
  /**
  * The candidate persistence policy (RV4207, the sixth comparison
  * experiment): ONE declaration that closes the candidate lineage
  * surface, superseding the boolean above (declaring both is a
  * ConfigError; the boolean stays for existing configs).
  *
  * Declared (either mode), EVERY finish-validation decision carries
  * the candidate identity, the ACCEPTED verdict included: the sha256
  * over the canonical resolved document (the deterministic patch or
  * the sectional splice applied first) and its char count, so the
  * whole chain proposed/repaired/rejected/accepted reads off
  * `synthesisCandidatesFromJournal` (and `rulvar inspect
  * --candidates`) by hash, and the accepted hash is the same recipe
  * the claim judge's `judgedHash` and the audit's `auditedHash` bind
  * (`candidateHashOf`: sha256 over the JCS serialization; see
  * `verifyCandidateBytes` for the audit recipe). Undeclared, the
  * decisions keep their historical bytes exactly (identity on
  * non-accepted verdicts only).
  *
  * `'transcript'` additionally retains each REJECTED candidate's
  * bytes as its own addressable blob, byte for byte the
  * `retainRejectedCandidates: true` behavior. `'hash-only'` retains
  * no bytes ON PURPOSE and says so: every non-accepted decision
  * carries `bytesUnavailableReason: 'hash-only-persistence'`, so an
  * auditor finding no blob reads a policy, not an accident; a
  * declared 'transcript' whose store write failed stamps
  * `'store-write-failed'` the same way. The experiment's auditor
  * recovered the rejected composition only by digging a binary
  * transcript with no documented recipe; the reason field is the
  * difference between "not retained by declared policy" and "lost".
  */
  candidatePersistence?: "transcript" | "hash-only";
  /**
  * The repair turn reserve (the v1.71 experiment review, P0.4; the
  * reserve RV-204 deliberately deferred). A nonnegative integer,
  * default 0: max EXTRA turns the invocation the validators bind (the
  * synthesis invocation when `synthesis` is configured, the
  * coordination loop otherwise) may consume past its `maxTurns`, one
  * granted per rejected finish exchange, schema-invalid finish
  * arguments and host validation rejections alike. Without it, repair
  * exchanges and generation compete for the same turn budget: the
  * v1.71 experiment lost its whole run to one malformed finish plus
  * one validator rejection inside maxTurns 3. The reserve is bounded,
  * spends from the ordinary budget ceilings (a granted turn is a paid
  * provider turn), and folds into the preflight turn projection
  * (`projectedProviderTurns` and the run ceiling) when declared
  * there. Zero keeps the pre 1.73 ceiling byte identical.
  */
  repairTurnReserve?: number;
  /**
  * The declared price of ONE mechanical repair turn in USD (RV3802),
  * the money twin of `repairTurnReserve`'s turn grant: the bounded
  * claim repair round (`claimConsistency.onFound: 'repair'`) holds
  * this beside the verdict money (RV3701) from the moment the round
  * is admitted, so the one repair turn the round's own finish
  * contract can grant is funded when the candidate materializes; the
  * leg releases to the round's finish loop at its first journaled
  * verdict. Undeclared, the hold falls back to the run's own observed
  * last mechanical repair price (`lastMechanicalRepairCostUsd` over
  * the journal, absent when no priced repair window exists), else
  * zero, which keeps every pre-RV3802 admission byte identical. A
  * nonnegative finite number; refused typed otherwise.
  */
  estRepairCostUsd?: number;
  /**
  * The coordination draft gate (the v1.74 experiment review, P0.3),
  * meaningful ONLY with `synthesis` configured: with validators bound
  * to the synthesis finish, the coordination finish is an unvalidated
  * draft, and the experiment's model escaped six failed finish
  * exchanges with the schema-valid draft 'test', which then starved
  * synthesis of every citation the validators demanded. The policy
  * runs deterministic library checks on each coordination finish
  * (whitespace-token `minWords`, literal `requireSections` markers,
  * the wordCountValidator and requiredSectionsValidator semantics);
  * a failing draft returns to the model as the finish call's error
  * result and the turn continues, exactly like a host validation
  * rejection, and `repairTurnReserve` grants coordination the same
  * per-rejected-exchange headroom it grants the synthesis finish.
  * Pure text checks over the durable exchange: nothing journals, a
  * resumed segment recounts identically, and `maxRepairs` is not
  * consumed (it belongs to the synthesis-bound validators). Absent =
  * byte identical pre 1.76 behavior; configured without `synthesis` =
  * ConfigError.
  *
  * The sentinel `'contract'` (RV808a) gates the draft by the FULL
  * declared validator set instead of a hand-written subset, with the
  * same children snapshot the synthesis-bound validation reads. The
  * twelfth comparison run showed why the subset starves the
  * `skipWhenDraftValid` gate: the coordination repair loop drove the
  * draft only to the weak policy, the pre-pass then judged it by the
  * full contract and failed, and the run paid the whole synthesis
  * plus its own repair for defects a coordination exchange could
  * have fixed. Under `'contract'` the rejection feedback names the
  * failing validators, so coordination repairs drive the draft
  * toward exactly what the pre-pass will judge, making the skip
  * reachable. Same posture otherwise: nothing journals, the durable
  * exchange recounts identically, `maxRepairs` untouched. Honest
  * bound: validators that fold the children snapshot (the evidence
  * share) can still fail the pre-pass when a child settles between
  * the draft finish and synthesis; the pre-pass stays the authority.
  *
  * The sentinel `'digest'` (RV4210, the sixth comparison experiment)
  * inverts the draft's economics for configurations that do NOT use
  * `skipWhenDraftValid`: the harness under audit forced a full
  * contract-valid prose draft (344.8 s of model output) that the
  * composition then rewrote whole, because `draftPolicy: 'contract'`
  * is priced for the skip gate it was built to feed. Under 'digest'
  * the coordination prompt asks for a compact STRUCTURAL EVIDENCE
  * MAP (one list row per planned section naming its claims and the
  * evidence behind them) and the gate enforces the inversion
  * deterministically: at least one list row, at most
  * {@link DIGEST_DRAFT_MAX_WORDS} words, so the draft cannot decay
  * back into the prose it replaces. The synthesis invocation embeds
  * the digest exactly as it embeds any draft; wire counts are
  * unchanged. Because a digest is NOT a candidate deliverable, the
  * intake refuses the combinations that would ship or judge it as
  * one: `synthesis.skipWhenDraftValid` and
  * `synthesis.fallbackToValidDraft` are both ConfigError beside it.
  */
  draftPolicy?: {
    /** Minimum whitespace-separated words the draft must carry. */minWords?: number; /** Literal markers the draft text must contain. */
    requireSections?: string[];
  } | "contract" | "digest";
  /**
  * Sectional bounded repair (RV808b). A rejected finish used to
  * resend the WHOLE document to fix one violated section: on the
  * twelfth comparison run the coordination draft plus its repairs
  * alone cost 406 s of model output. With this declared, every
  * rejection feedback of a gated finish teaches the sectional
  * vocabulary, and the model may repair by calling
  * `finish({ sections: { '<declared marker>': '<new body>' } })`
  * instead of resending the document: the host splices the patch
  * into the RETAINED rejected attempt (line-anchored, the exported
  * {@link spliceSections} semantics: a marker absent from the
  * attempt is appended in declared order) and validates the
  * reconstructed document whole. The vocabulary rides every finish
  * the host actually gates: the validator-bound finish (the
  * synthesis invocation when `synthesis` is configured, the
  * coordination loop otherwise) and, when a `draftPolicy` is
  * declared, the coordination draft gate; the synthesis invocation
  * is additionally SEEDED with the coordination draft as its
  * retained base, so a synthesis that agrees with the draft repairs
  * only the named gaps without ever resending it (the carryDraftGaps
  * pairing). Mechanics refusals (sections beside result, an
  * undeclared marker, no retained attempt to splice into) are typed
  * error results, the moral twin of a schema rejection: they journal
  * nothing, spend no `maxRepairs`, and stay bounded by the turn
  * budget; only the verdict over the SPLICED document spends the
  * repair bound. Nothing new journals anywhere: the exchange is
  * durable in the transcript, the splice is a pure function of it,
  * and the accepted invocation output IS the reconstructed
  * document. Honest bound: the retained attempt lives in the
  * invocation; a segment resumed from a mid-invocation checkpoint
  * retains nothing yet and refuses the first sectional call with the
  * full-resubmission remedy (the synthesis seed re-derives from the
  * journaled draft and never has this window). Declaring the option
  * swaps the finish tool schema and description for the gated
  * invocations, so their toolset hash moves BY DESIGN (the
  * exposeChildResultTools precedent); absent = every byte
  * identical.
  */
  sectionalRepair?: {
    /** The marker lines that partition the document, unique, in document order. */sections: string[];
  };
  /**
  * The unified output contract this validator set enforces (the v1.71
  * experiment review, P0.1/P0.2). Construction then runs the golden
  * self test with the contract's fixtures as defaults, the contract's
  * promptLines join the validator statement in BOTH the coordination
  * and synthesis prompts, every contract validator must appear in
  * `validators` by name (a promised contract nobody enforces is drift
  * by omission, a ConfigError), and the run journals ONE frozen
  * bundle descriptor (decisionType
  * 'orchestrator_finish_validation_bundle') recording the contract
  * hash and the validator names. A resumed segment whose live
  * contract hash differs appends a SUPERSEDING descriptor instead of
  * failing, because fixing a stale validator and resuming is the
  * intended remedy, never a fault. The remedy is generation-scoped
  * (cycle 73): every decision entry written under a contract carries
  * `contractHash`, and only the CURRENT generation is judged, so
  * repairsUsed restarts under a fixed contract and a final rejection
  * a superseded generation left in the crash window neither rolls
  * forward at boot nor re-arms on replay (its exchange replays byte
  * identical and the loop continues to a live repair turn). Decisions
  * recorded before 1.77 carry no hash and bind to the current
  * contract only while the journal holds a single bundle descriptor;
  * once a supersession is recorded they are stale. The bundle is
  * deeply frozen and the construction self test also runs the
  * contract's per validator reject goldens against the CONFIGURED
  * set (cycle 74), so a post construction mutation throws and a
  * same-name replacement weaker than the contract's own validator is
  * a ConfigError before any provider call. Absent = byte identical
  * pre 1.72 behavior.
  */
  contract?: FinishContract;
  /**
  * Golden fixtures of the construction self test (the v1.71
  * experiment review, P0.3), overriding the contract's generated
  * fixtures: a host with custom validators supplies an accept fixture
  * those validators actually accept. Fixtures without a contract run
  * the self test on their own. Absent with no contract = no self
  * test, the pre 1.72 behavior.
  */
  selfTest?: FinishSelfTestFixtures;
}
interface OrchestrateOptions {
  model?: ModelSpec;
  /** Registered profile names to advertise; default: every profile. */
  profiles?: string[];
  /**
  * Per-orchestrate spawn cap: a nonnegative integer (zero admits no
  * spawns), validated before any journal entry or dispatch. The engine
  * lifetime cap applies regardless. The cap counts ADMITTED children:
  * an admission-rejected spawn (budget, quota, depth) consumes no slot,
  * so the orchestrator may retry a rejected role at a viable budget
  * (v1.81; the sixth comparison experiment's run 2). Attempts stay
  * bounded regardless through the coordination turn's own tool budget.
  */
  maxSpawns?: number;
  /** The orchestrator's own budget sub-account (cap enforcement layers only in M6). */
  budget?: OrchestratorBudgetSpec;
  /**
  * Deterministic digest render bound: a nonnegative integer, validated
  * before any journal entry or dispatch. Each TaskDigest outputSummary
  * is truncated to AT MOST this many CHARACTERS, the truncation marker
  * included (a budget below 3 keeps the bound with a bare slice; the
  * model-independent measure; OQ-04 closed at M10 entry). Default
  * WAKE_SUMMARY_RENDER_BUDGET_CHARS.
  */
  renderBudgetChars?: number;
  /**
  * One run-wide repair pool (RV4406, the seventh comparison
  * experiment): every provider-dispatching repair grant consumes
  * from it, whatever gate granted it. The per-stage bounds
  * (`finishValidation.maxRepairs`, the one bounded semantic round)
  * NARROW the pool, never widen it: a stage may grant fewer repairs
  * than the pool has left, and a stage whose own bound is spent
  * refuses regardless of the pool. The pool consumes durable
  * tokens: a finish-validation 'repair' verdict IS its consumption
  * (the decision lands before the repair turn dispatches), and a
  * semantic repair round journals a `repair_pool_consume` decision
  * strictly BEFORE its dispatch, keyed so a crash between the
  * decision and the dispatch resumes without a double consume. The
  * draft-gate pre-pass dispatches no provider work and spends
  * nothing, by design. Absent keeps every decision and refusal byte
  * identical. `maxSemanticRepairRounds` reserves rounds inside this
  * pool for the semantic stage (RV4705).
  */
  maxTotalRepairRounds?: number;
  /**
  * The scoped semantic reserve inside the run repair pool (RV4705,
  * the eighth comparison experiment's rerun): that run consumed its
  * one-token pool on a MECHANICAL composition repair before the
  * judges ruled, so the post-judge semantic round was refused while
  * 38 census findings stood unconsumed, and the question contract's
  * "exactly one bounded repair" meant exactly that round. Declared,
  * this is BOTH a reserve and a cap: mechanical finish-validation
  * grants may never consume the reserved rounds (they admit only
  * while the total pool holds the UNSPENT reserve on top of them),
  * and the semantic round itself is bounded by this number beside
  * the total pool it still shares (a stage bound NARROWS the pool,
  * never widens it, the RV4406 doctrine). Greater than a declared
  * `maxTotalRepairRounds` refuses typed at construction: a reserve
  * the pool cannot hold is a contradiction. Declared without a total
  * pool it is the semantic round's own cap alone, and the mechanical
  * grants stay unbounded exactly as before. Absent keeps every
  * decision and refusal byte identical.
  */
  maxSemanticRepairRounds?: number;
  /**
  * Journaled coordination checkpoints (RV4410, the seventh
  * comparison experiment): with `true`, every settled await round
  * appends a compact `coordination_checkpoint` decision (the round
  * ordinal, the settled handles, the spend so far), so a timeout or
  * kill terminal shows how far coordination durably got, an
  * operator reads progress from `rulvar inspect` instead of the raw
  * transcript, and a resumed run's replay visibly continues from
  * the last checkpoint instead of an opaque prefix. Opt-in because
  * the decisions are journal bytes; the replay machinery already
  * never re-pays journaled coordination either way.
  */
  coordinationCheckpoints?: boolean;
  /** UsageLimits of the orchestrator agent itself (maxTurns etc.). */
  limits?: UsageLimits;
  /**
  * The opt-in mode (c) extension seam (M7-T05): PlanRunner from
  * @rulvar/plan attaches here. The extension boots
  * strictly before the orchestrator's first agent entry, contributes
  * tools, schedules ready plan nodes on every settlement, and
  * participates in the mandatory quiescence trigger.
  */
  extension?: OrchestratorExtension;
  /** The opt in child completion policy; see {@link OrchestrateAcceptance}. */
  acceptance?: OrchestrateAcceptance;
  /**
  * The terminal child barrier policy (RV1903, the four-role
  * benchmark's recovery arm): what happens to children still running
  * when the orchestration exits, on EVERY exit path (an accepted or
  * rejected finish, a typed failure, a budget or exposure terminal).
  * 'cancel' (the default) aborts them and awaits their journaled
  * cancelled terminals; 'drain' awaits their natural terminals,
  * bounded by their own limits and budgets, preserving their evidence
  * at the price of the wait. Either way the orchestration returns
  * only after every spawned child has a terminal journal entry, so
  * `run_settle` can never precede a child's billing row again: the
  * benchmark's recovery journal recorded three child terminals AFTER
  * the settle decision, and four mutually inconsistent cost views
  * followed. The verdict the run settled with is already frozen
  * before the barrier runs, so late children never change it.
  */
  onUnsettledAtExit?: "cancel" | "drain";
  /**
  * The parallel_agents admission policy (RV1908). 'fail-fast' (the
  * default, the RV805 shape) admits in submission order and stops at
  * the first refusal, tasks after it never attempted. 'try-all'
  * attempts every task and reports every refusal, so one refused
  * sibling no longer hides whether the rest would seat. 'all-or-none'
  * projects the WHOLE batch against the live remainder first and
  * refuses it typed with zero admissions when it cannot seat
  * entirely; a non-budget failure mid-batch cancels the admitted
  * siblings, best-effort atomicity over a machinery that cannot
  * un-admit. Independent of the policy, a declared
  * acceptance.minSpawnedChildren arms the roster pre-check: a batch
  * large enough to seat the floor whose feasible count cannot reach
  * it is refused before paying for the first child, the four-role
  * benchmark's primary arm shape, where two workers were paid in
  * full and the settle verdict was bound to reject them.
  */
  parallelAdmission?: "fail-fast" | "try-all" | "all-or-none";
  /**
  * The batch-spawn discipline (RV2005). The third parity rerun's
  * model ignored the instruction to spawn its roster in one
  * parallel_agents call and spawned seat by seat through spawn_agent,
  * so the RV1908 batchGate never saw a batch and the roster
  * feasibility rode on per-seat luck. 'reject-spawn-agent' refuses
  * every SINGLE spawn_agent call typed (code 'batch_required',
  * nothing journaled, nothing paid) so model disobedience cannot
  * split the policy: the model reads the refusal and re-issues the
  * wave as one parallel_agents batch. Absent, both tools behave as
  * documented.
  */
  requireBatchSpawn?: "reject-spawn-agent";
  /**
  * The opt in deterministic host validation of the finish result, with
  * bounded repair; see {@link FinishValidationSpec}.
  */
  finishValidation?: FinishValidationSpec;
  /**
  * Opt in to the evidence tools `get_child_result` and
  * `read_child_artifact` (the v1.40.0 improvement plan's narrow RV-201
  * slice). The digest an await returns is a wake signal truncated to 400
  * characters; with this set, the orchestrator can page a settled
  * child's FULL output and its artifact contents, both pure reads of
  * durable journal state. Adding the tools changes the orchestrator
  * toolset hash by design (exactly like the extension's plan tools), so
  * leave it off and the default toolset, and every frozen cassette, stay
  * unchanged.
  */
  exposeChildResultTools?: boolean;
  /**
  * Opt in the bulk settled-set read `get_settled_child_results`
  * (RV1807). The nineteenth benchmark's root made fourteen
  * `get_child_result` calls to consume six children, eight of them
  * speculative probes that returned not-settled errors; with this
  * set, the model consumes the exact `settledHandles` set an
  * `await_any` digest returns in ONE call, refused typed BEFORE any
  * read when a handle is unknown or still running. Its own opt-in
  * rather than a rider on `exposeChildResultTools`, because adding a
  * tool under the existing flag would move every opted-in run's
  * toolset hash and re-key their resumes.
  */
  exposeSettledResultsTool?: boolean;
  /**
  * Opt in per-child execution facts on the await digests and the
  * child result page (RV1503, the eighteenth improvement plan). The
  * seventeenth comparison run graded its whole dossier
  * `live-observed: no` while the harness had just watched 118 wire
  * requests settle, because no surface ever showed the composing root
  * what its run actually executed. With this set, every TaskDigest an
  * await returns (and every `get_child_result` page) carries
  * `facts`: wire request and missing-response-id counts folded from
  * the journaled per-dispatch reconciliation records, plus the
  * journaled token totals ({@link executionFactsOf}), all
  * replay-stable by construction. Dollars are deliberately absent
  * (replay re-prices from the current table). Off by default: tool
  * result bytes enter the window, and the window is journal identity,
  * so the historical bytes stay exact without the opt-in.
  */
  executionFacts?: boolean;
  /**
  * The opt in post-fan-in synthesis invocation (RV-211): with this set,
  * the coordination loop's finish({ result }) becomes a DRAFT, and a
  * SEPARATE fresh invocation with role 'synthesize' (its own model,
  * effort, and limits through the ordinary resolution chain; the
  * routing key 'synthesize' picks its model and never summons it)
  * composes the final run result from the goal, the draft, and the
  * settled child digest, on the finish-only toolset. When
  * finishValidation is configured its validators bind the SYNTHESIS
  * finish (the final output), not the draft. See
  * {@link OrchestrateSynthesis}.
  */
  synthesis?: OrchestrateSynthesis;
  /**
  * The opt-in bounded contradiction pass (RV1302, the sixteenth
  * comparison experiment's P2-1 remainder). A fan-out produces N
  * independent children and nothing else in the pipeline compares
  * their claims against EACH OTHER: acceptance judges each child
  * alone, the finish validators judge the final text mechanically, and
  * `synthesis.dedupeClaims` matches on agreement, so it is blind to
  * disagreement by construction. With this set, the settled evidence
  * pool is folded through {@link findContradictions} at the post-fan-in
  * chokepoint and the run says what it found. See
  * {@link OrchestrateContradictions}.
  */
  contradictions?: OrchestrateContradictions;
  /**
  * The opt-in claim-consistency pass (RV1501/RV1502, the eighteenth
  * improvement plan). The contradiction pass compares the children
  * against EACH OTHER; nothing compares the COMPOSED text against the
  * pool it composed from, so a root that inverts a child's finding
  * while citing the child's own span passes every mechanical check
  * (the seventeenth comparison run shipped exactly that inversion
  * over `subprocess.ts:256-296`). With this set, the accepted draft's
  * citing sentences are paired with the pool sentences reading an
  * intersecting span of the same file ({@link pairDraftClaims}, a
  * pure fold), and ONE bounded judge invocation rules on the pairs.
  * The judge is a PAID model call, journaled like any agent entry, so
  * a resume replays its verdict with zero adapter calls; when the
  * fold pairs nothing, no judge is ever dispatched. See
  * {@link OrchestrateClaimConsistency}.
  */
  claimConsistency?: OrchestrateClaimConsistency;
  /**
  * The citation entailment audit (RV4004, the fifth comparison
  * experiment): a deterministic stratified sample of the FINAL
  * document's citing sentences, their cited lines read back through
  * the host's own pure snapshot resolver (the citedValueValidator
  * channel), and one bounded judge invocation ruling
  * supported/partial/unsupported per sampled citation. The run's
  * other verifiers judge VALUES, TARGETS, and CONSISTENCY against
  * the child pool; none of them reads the cited lines and asks
  * whether the text entails the sentence, which is exactly how the
  * experiment shipped three unsupported citations that were
  * mechanically valid, value-clean, and invisible to a pool that
  * held no reading of those files (20 of 74 citing sentences had no
  * candidates at all). This pass is the independent judge's own
  * method, internalized. See {@link OrchestrateCitationAudit}.
  */
  citationAudit?: OrchestrateCitationAudit;
  /**
  * The atomic production posture (RV4201, the sixth comparison
  * experiment): one declaration that a run may settle accepted only
  * clean (full final coverage, zero surviving contradictions, zero
  * surviving unsupported citations, no waiver, or exactly the one
  * pinned-hash waiver). Intake refuses any `claimConsistency` /
  * `citationAudit` field that contradicts it, so the observing
  * postures the sixth experiment shipped under cannot coexist with
  * the declaration. See {@link OrchestrateSemanticAcceptance}.
  */
  semanticAcceptance?: OrchestrateSemanticAcceptance;
}
/**
* The citation entailment audit's knobs (RV4004). The sample derives
* from the audited document's own hash (replay-stable, no clock, no
* randomness; a repaired candidate re-samples afresh), the excerpts
* come from a resolver the host froze before the run (PURE, exactly
* the {@link citedValueValidator} contract: a live-filesystem resolver
* would make verdicts depend on when they ran), and the judge is a
* paid, journaled invocation like the claim judge. A sampled citation
* whose FIRST cited line does not resolve is unsupported mechanically,
* with no judge needed for that row: a citation nothing resolves is
* not provenance.
*/
interface OrchestrateCitationAudit {
  /** The host's pure snapshot reader, exactly citedValueValidator's. */
  resolve: (target: CitationTarget) => string | undefined;
  /** Overrides {@link DEFAULT_CITATION_PATTERN}; must expose `path:line[-end]`. */
  pattern?: string;
  /** Sampled citing sentences per H2 section; default 2, the judge's own method. */
  samplePerSection?: number;
  /** The hard whole-document ceiling; default 24, the judge's own budget. */
  maxSampled?: number;
  /** Lines after the cited line an excerpt may carry; default 3. */
  window?: number;
  /**
  * The resolver generation (RV4208). Default 1, the fixed downward
  * window above, byte identical for every existing config. Declaring
  * 2 excerpts the bounded LOGICAL UNIT the cited line belongs to
  * (heading section, list item, table row with its header, code
  * comment plus declaration, paragraph; `citationUnitExcerptOf`) and
  * audits EVERY anchor of a compound sentence as its own row against
  * its nearest claim clause, with the unit type and a truncation
  * flag on the row and `resolverVersion: 2` on the meta. The sixth
  * comparison experiment's confirmed false negatives were window
  * artifacts: a section heading whose support lives below the fixed
  * window, and only a sentence's first anchor ever sampled. Opt-in
  * because the sample derives from the audited document's hash and
  * v2 changes which rows exist and what the judge reads.
  */
  resolver?: 1 | 2;
  /**
  * What the audit judges (RV4407): 'sample' (default) keeps the
  * deterministic stratified sample byte for byte; 'all' judges
  * EVERY anchor row of the document, a census instead of a sample.
  * Requires resolver 2; one judge invocation still carries all
  * rows, so the cost scales through the prompt and `judge.estCost`
  * should be sized for the whole document.
  */
  auditScope?: "sample" | "all";
  /** The judge invocation's knobs, exactly the claim judge's shape. */
  judge?: {
    model?: ModelSpec;
    effort?: Effort; /** UsageLimits of the judge invocation; default { maxTurns: 3 }. */
    limits?: UsageLimits; /** Admission estimate for the judge invocation, like AgentOpts.estCost. */
    estCost?: number;
  };
  /**
  * What a non-supported verdict does. 'report' (the default) stamps
  * the meta and the findings on the envelope and changes nothing
  * else. 'fail' fails the run typed (`data.source`
  * 'orchestrator_citation_audit') when any sampled citation judges
  * UNSUPPORTED (partial verdicts report either way: a half-carried
  * claim is a finding, not a stop). 'repair' rides the RV3307
  * bounded round mechanics: the unsupported rows ride one more
  * composition, the repaired document is re-audited (a fresh sample
  * from its new hash), a configured claim pass past the draft
  * rejudges the rewritten document, and unsupported rows that
  * survive fail the run typed. One round exactly, shared (RV4202):
  * arming BOTH this 'repair' and `claimConsistency.onFound:
  * 'repair'` grants the same ONE bounded round, which then fires
  * after the first audit pass carrying both defect lists (the judged
  * claim contradictions and the unsupported citations, plus the
  * uncovered sentences when `coverageRepair` is armed), and BOTH
  * judges re-rule on the repaired document's new hash before
  * survivors of either class fail the run typed. The budget never
  * grows past one extra composition.
  */
  onFound?: "report" | "repair" | "fail";
}
/**
* The bounded contradiction pass's knobs (RV1302). The pass itself is a
* PURE fold over the settled children the journal replays verbatim, so
* it costs no model call, no clock, and no wall time worth measuring in
* the post-fan-in window, and it journals nothing: a resume re-derives
* the identical finding (the `dedupeClaims`, `policyFacts`, and
* `evidenceIndex` precedent). The evidence pool it judges is the one
* `evidenceIndex` indexes: ok children plus salvage-accepted ones, so a
* dead child's error text can never contradict a real finding.
*/
interface OrchestrateContradictions {
  /**
  * What a detected contradiction does. 'report' (the default) puts the
  * findings on the acceptance envelope and in an info log, and changes
  * nothing else. 'carry' additionally names them in the 'single'
  * synthesis prompt with the instruction to resolve each explicitly
  * instead of silently picking one, and REQUIRES that synthesis (a
  * ConfigError otherwise, the `evidenceIndex` precedent: there is no
  * prompt to ride without it). 'fail' fails the run typed with
  * `data.source` 'orchestrator_contradictions' BEFORE any synthesis
  * dispatch, so a pool that contradicts itself never pays to have the
  * disagreement composed away.
  */
  onFound?: "report" | "carry" | "fail";
  /** Overrides {@link DEFAULT_CITATION_PATTERN} for the anchors; fail-closed at intake. */
  pattern?: string;
  /** Bound on reported contradictions; default {@link DEFAULT_MAX_CONTRADICTIONS}. */
  max?: number;
}
/**
* What the contradiction pass looked at, beside its findings (RV1404).
* Rides the acceptance envelope as `contradictionsMeta` whenever the
* pass is configured, exactly like `contradictions` itself: `[]` plus
* this meta says "the pass judged `poolChildren` accepted children and
* the pool agreed", while an absent pair says nothing looked. The
* `truncated` flag makes the `max` bound honest: without it, a capped
* list is indistinguishable from a complete one.
*/
interface OrchestrateContradictionsMeta {
  /** How many accepted children the pass actually judged. */
  poolChildren: number;
  /** True when more contradictions existed than `max` allowed to report. */
  truncated: boolean;
}
/**
* The claim-consistency pass's knobs (RV1501/RV1502). The pairing half
* is a PURE fold ({@link pairDraftClaims}) over the accepted draft and
* the same settled pool the contradiction pass judges, so it costs
* nothing and journals nothing. The judge half is ONE bounded
* structured-output invocation under role 'synthesize' (the routing
* key picks its model unless `judge.model` overrides), dispatched only
* when the fold produced at least one pair; its verdict is an ordinary
* journaled agent entry, so a resumed run replays it with zero paid
* calls and the derived findings are byte identical.
*/
interface OrchestrateClaimConsistency {
  /**
  * What a judged contradiction does. 'report' (the default) puts the
  * findings on the acceptance envelope and in an info log, and
  * changes nothing else. 'carry' additionally names them in the
  * 'single' synthesis prompt with the instruction to resolve each
  * explicitly (a ConfigError without that synthesis, the
  * contradictions precedent), and non-empty findings block the
  * `skipWhenDraftValid` gate: a draft contradicting its own pool
  * never earns the skip. The carry can only ride a prompt that still
  * lies ahead, so it binds the pass that runs BEFORE the synthesis:
  * under `stage: 'both'` the draft pass carries and the final pass
  * reports, and `stage: 'final'` with 'carry' is a ConfigError at
  * intake, because a posture that reads as a gate must not quietly
  * behave as 'report'. 'repair' (RV3307) is the honest carry for the
  * final pass: judged findings ride ONE more synthesis invocation
  * (the same CLAIM CONTRADICTIONS block, over a prompt that now lies
  * ahead again), the repaired document is judged again, and findings
  * that survive the round fail the run typed, exactly like a dead or
  * declined judge under this posture, because a gate armed to repair
  * must not pass silently. It needs a pass that runs AFTER a
  * synthesis, so `stage` must be 'final' or 'both' (a ConfigError
  * beside the default 'draft', whose findings the ordinary carry
  * already consumes). 'fail' fails the run typed with
  * `data.source` 'orchestrator_claim_consistency' BEFORE any
  * synthesis dispatch; the judge itself has already been paid, which
  * is the honest minimum for a semantic verdict. A judge that does
  * not settle ok is named on the meta (`judgeFailed`) and fails the
  * run only under 'fail': a gate armed to stop the run must not pass
  * silently when its judge dies.
  */
  onFound?: "report" | "carry" | "fail" | "repair";
  /**
  * WHICH document the pass judges (RV2509), default `'draft'`, the
  * historical behavior byte for byte. The pass has always read the
  * coordination draft, strictly BEFORE the synthesis, so that a draft
  * contradicting its own pool fails before anything pays to compose
  * it. That ordering is right and stays; what it cannot do is verify
  * the document that actually SHIPPED. The synthesis rewrites the
  * draft, and under `'draft'` the semantic verdict on the terminal
  * describes a document no consumer ever receives: the twenty-fifth
  * comparison run's judge cleared a draft and the synthesis then
  * composed a different text three times over.
  *
  * `'final'` moves the pass after the synthesis, over the artifact the
  * run settles on. `'both'` keeps the pre-synthesis gate AND judges
  * the final, at the price of a second judge invocation; the terminal
  * then reports the FINAL pass in `claimConsistencyMeta` (the shipped
  * document is what a consumer gates on) and the earlier one in
  * `claimConsistencyDraftMeta`.
  *
  * Every meta says which document it read (`judgedStage`,
  * `judgedHash`), and the envelope's `draftToFinal` says whether the
  * synthesis changed the document at all, so the question "is this
  * verdict about what I received" is a field read under every setting,
  * including the default.
  *
  * Meaningful only with a `synthesis` configured: without one the
  * draft IS the final and all three settings judge the same document.
  */
  stage?: "draft" | "final" | "both";
  /** The judge invocation's own knobs; the routing chain applies otherwise. */
  judge?: {
    /** Model override for the judge invocation. */model?: ModelSpec; /** Canonical effort of the judge invocation. */
    effort?: Effort; /** UsageLimits of the judge invocation; default { maxTurns: 3 }. */
    limits?: UsageLimits; /** Admission estimate for the judge invocation, like AgentOpts.estCost. */
    estCost?: number;
  };
  /** Overrides {@link DEFAULT_ANCHOR_PATTERN} for both sides; fail-closed at intake. */
  pattern?: string;
  /** Bound on judged pairs; default {@link DEFAULT_MAX_CLAIM_PAIRS}. */
  max?: number;
  /** Bound on each pair's pool readings; default {@link DEFAULT_MAX_POOL_PER_PAIR}. */
  maxPoolPerPair?: number;
  /** Bound on each excerpt; default {@link DEFAULT_MAX_PAIR_EXCERPT_CHARS}. */
  maxExcerptChars?: number;
  /**
  * The declared coverage target (RV2903), in (0, 1]: the pass sizes
  * itself to COVER this share of the draft's citing sentences instead
  * of judging the first `max` pairs blind. The ninth comparison run
  * covered 43 of 115 citing sentences because its host guessed
  * `max: 56` plus the default run-fact bound, and the honest
  * 'partial' grade was the constant's echo, not a policy. Under a
  * target the pairing selects coverage-first (criticals, then one
  * pair per uncovered sentence until the target is met; `max` stays a
  * hard ceiling), the run-fact pass judges EVERY matched candidate
  * instead of the default bound, and an undeclared
  * `minimumCoverageRatio` defaults to the target, so the RV1809
  * floor machinery (the `lowCoverage` block, `onLowCoverage`, the
  * strict CLI exit) enforces the same number that sized the pass.
  */
  coverageTarget?: number;
  /**
  * Critical anchor declarations (RV1603): paths (a file, or a
  * directory matched as a prefix) or span anchors
  * (`src/exec.ts:250-300`). Pairs whose draft anchor matches sort
  * FIRST, before the `max` cap, so the bounded judge spends its
  * budget on the declared claims, and the meta names every critical
  * draft anchor that ended up unjudged (`criticalUncovered`). The
  * eighteenth comparison benchmark judged 40 of 144 citing sentences
  * with nothing steering which 40 and nothing saying what was left
  * out. Unset = the exact historical pairing order, byte for byte.
  */
  critical?: string[];
  /**
  * What an unjudged critical anchor does (RV1603): 'report' (the
  * default) names them on the meta only; 'fail' fails the run typed
  * with `data.source` 'orchestrator_claim_consistency' BEFORE the
  * judge dispatch, so a run whose declared claims cannot be verified
  * never pays for a partial verdict. Requires `critical`.
  */
  onUncoveredCritical?: "report" | "fail";
  /**
  * The run-facts grounding opt-in (RV1603): the run's own recorded
  * execution facts (accepted children, statuses, recorded evidence
  * entry counts, wire request and token totals; the
  * {@link executionFactsOf} material plus the entries plumbing) become
  * one more pool reading, and draft sentences that SPEAK about the
  * run (naming a minted id, a recorded fact value of two or more
  * digits, or a `runFactTerms` phrase) are paired with that sheet
  * under the `(run-facts)` anchor, judged by the same invocation.
  * Closes the eighteenth benchmark's live gap: a dossier claimed
  * "each role recorded 18-20 evidence entries" over recorded profiles
  * of 23/18/22/20/20/20 and "real models were not run" beside 125
  * recorded wire requests, with `executionFacts` enabled; facts
  * offered to the composer verify nothing about what it composed.
  * Off by default: judge prompt bytes stay identical when unset.
  */
  runFacts?: boolean;
  /**
  * Case-insensitive phrases that mark a draft sentence as a run
  * claim for the `runFacts` pass (negations carry no number: "real
  * models were not run" pairs only through a term). Requires
  * `runFacts: true`.
  */
  runFactTerms?: string[];
  /**
  * The declared coverage floor (RV1809): the minimum
  * coveredCitingSentences over draftCitingSentences ratio, in
  * (0, 1]. The nineteenth benchmark's pass covered 36 of 122 citing
  * sentences and graded itself 'partial' honestly, but nothing could
  * ENFORCE a floor: a consumer had to read the counts and decide
  * externally. Below the floor, `onLowCoverage` decides. A draft
  * with zero citing sentences is vacuously full and never trips it.
  */
  minimumCoverageRatio?: number;
  /**
  * The run-fact coverage floor (RV1809): the minimum judged run-fact
  * pairs over matched run-fact candidates ratio, in (0, 1]. Requires
  * `runFacts: true`; a draft with zero matched run claims never
  * trips it.
  */
  runFactCoverageRatio?: number;
  /**
  * What a below-floor ratio does (RV1809): 'report' (the default)
  * stamps the machine-readable `lowCoverage` block on the meta;
  * 'fail' fails the run typed BEFORE the judge dispatch, exactly
  * like `onUncoveredCritical`, so a run that cannot meet its
  * declared verification floor never pays for a partial verdict.
  * Requires at least one declared floor.
  */
  onLowCoverage?: "report" | "fail";
  /**
  * What the FINAL pass's coverage grade is allowed to be (RV4003,
  * the fifth comparison experiment). 'observed' (the default) keeps
  * today's bytes: the grade is reported and nothing gates on it.
  * 'strict-final' refuses acceptance typed when the final meta's
  * grade is anything but 'full' (partial, vacuous, critical
  * uncovered, judge declined, judge failed alike), UNLESS a
  * `waiver` is declared: the experiment's pass covered 54 of 74
  * citing sentences, graded itself 'partial' honestly, met its own
  * declared 0.72 target, and the run still shipped three
  * unsupported citations inside the uncovered fraction. The ratio
  * floors (`coverageTarget`, `minimumCoverageRatio`) stay untouched
  * underneath: this policy binds the GRADE, the one word that
  * already folds every truncation and dead-judge reading. Requires
  * stage 'final' or 'both': a draft-only pass grades no final
  * document, so the policy would gate on nothing.
  */
  coveragePolicy?: "observed" | "strict-final";
  /**
  * The signed exception to 'strict-final' (RV4003): a named
  * principal accepting a non-'full' final grade, with the reason on
  * record. The acceptance then proceeds, the decision journals as
  * `claim_coverage_waived` (principal, reason, expiry, and the
  * grade it waived, term for term), and the envelope carries the
  * waiver verbatim beside the meta, so a consumer reading
  * `coverage: 'partial'` on a strict run always finds WHO accepted
  * it and why. `expiresAt` (ISO 8601) bounds the standing waiver: an
  * expired one refuses exactly like no waiver, evaluated once at
  * the enforcement point and journaled, so a resume replays the
  * recorded verdict instead of re-reading the clock (RV4104): a run
  * that waived, crashed, and outlived its waiver finishes under the
  * recorded exception. The frozen decision licenses exactly the
  * document it judged: an entry carrying a `judgedHash` is honored
  * only for that hash (the RV603 bound), and entries written before
  * the field existed stay reusable. Requires
  * `coveragePolicy: 'strict-final'`; declaring it without the
  * policy is a ConfigError, because a waiver over an unenforced
  * grade is a signature over nothing.
  */
  waiver?: {
    principal: string;
    reason: string;
    expiresAt?: string;
  };
  /**
  * Coverage joins the bounded repair round (RV4202, the sixth
  * comparison experiment). The experiment's run reached its
  * strict-final gate with a 'partial' grade and had exactly two
  * doors: a typed refusal or the standing waiver, because the round
  * armed on FINDINGS alone; the uncovered 27 percent of its citing
  * sentences was a defect class no machinery could consume. With
  * this set, a final grade that is not 'full' arms the same ONE
  * bounded round (RV3307): the still-uncovered citing sentences ride
  * the round's prompt as the UNCOVERED CLAIMS block (ground each
  * claim in material the pool actually read, or drop the citation),
  * the repaired document is re-paired and re-judged from its new
  * hash, and a grade that is STILL not 'full' after the round meets
  * the strict-final gate exactly as before (the typed refusal, or a
  * waiver where the posture allows one). Requires `onFound:
  * 'repair'` (the round is that posture's machinery) and
  * `coveragePolicy: 'strict-final'` (the gate whose refusal the
  * round averts); a ConfigError otherwise. Off by default: every
  * existing config keeps its bytes, round triggers included.
  */
  coverageRepair?: boolean;
}
/**
* The atomic production posture (RV4201, the sixth comparison
* experiment). The experiment's run was configured knob by knob:
* `report` findings postures, a standing waiver, no repair round, and
* every one of those choices was individually legal while their SUM
* quietly meant "observe and ship anyway"; the run then settled
* accepted over a partial grade, a judged contradiction, and five
* unsupported citations. This declaration is the one object that says
* the opposite, in full, and intake REFUSES any underlying field that
* contradicts it (nothing is filled: a signature has no blanks, so
* the host writes the machinery the declaration binds). Under it a
* run can settle accepted only when the FINAL document's claim
* coverage graded 'full', zero judged contradictions and zero
* unsupported (unresolved included) sampled citations survived the
* one bounded round where the posture arms it, and no waiver stood,
* except the pinned-hash form, which licenses exactly one reviewed
* document. `compileRegulatedProfile` fills and enforces this
* declaration for regulated runs (RV4201); plain orchestrations opt
* in by declaring it.
*/
interface OrchestrateSemanticAcceptance {
  /**
  * The document the verdicts must describe: the FINAL one, always.
  * Requires `claimConsistency.stage` 'final' or 'both'; the literal
  * exists so the signature spells its object out.
  */
  judgedStage: "final";
  /**
  * The only acceptable final coverage grade. Requires
  * `claimConsistency.coveragePolicy: 'strict-final'`, and refuses a
  * declared `coverageTarget` below 1, because a pass sized to cover
  * less than everything can never grade 'full' on a citing document:
  * the declaration would be unsatisfiable by construction.
  */
  claimCoverage: "full";
  /**
  * What a judged claim contradiction does: 'repair-once-then-fail'
  * requires `claimConsistency.onFound: 'repair'` (survivors of the
  * bounded round already fail typed) plus `coverageRepair: true` (the
  * one round serves every armed defect class, coverage included);
  * 'fail' requires `onFound: 'fail'`. The observing postures
  * ('report', 'carry') refuse at intake.
  */
  contradictions: "repair-once-then-fail" | "fail";
  /**
  * What an unsupported sampled citation does, same mapping onto
  * `citationAudit.onFound`; 'report' refuses at intake.
  */
  citations: "repair-once-then-fail" | "fail";
  /**
  * What a sampled citation that resolves NOTHING does. Mechanically
  * unresolved rows are unsupported findings already (the
  * citedValueValidator doctrine), so the field binds no new
  * machinery; it exists because a signature that is silent about the
  * rows no judge ever saw would be a blank exactly where the sixth
  * experiment's audit found its five.
  */
  unresolved: "fail";
  /**
  * The waiver posture. 'forbid': `claimConsistency.waiver` must be
  * absent, and a journaled `claim_coverage_waived` decision
  * surfacing under this declaration refuses typed (a journal that
  * waived under a config that forbids waivers is a config/journal
  * mismatch, not an authority). The pinned form carries the sha256
  * of the ONE document the waiver may license (the claim meta's
  * `judgedHash`, 64 hex chars): a signature under a reviewed
  * document, never a blank cheque, so a re-run that composes any
  * other bytes refuses exactly as if no waiver stood. Requires a
  * declared `claimConsistency.waiver` naming the principal and the
  * reason.
  */
  waiver: "forbid" | {
    judgedHash: string;
  };
}
/** One judged contradiction: the pair plus the judge's one-sentence reason. */
interface ClaimContradictionFinding extends ClaimPair {
  reason: string;
}
/**
* What the claim-consistency pass looked at, beside its findings.
* Rides the acceptance envelope as `claimConsistencyMeta` whenever the
* pass is configured, exactly like `contradictionsMeta`: `[]` plus
* this meta says "the fold paired `pairs` sentences and the judge
* cleared them", while an absent pair of fields says nothing looked.
* `judgeInvoked` false records that no pair existed to judge, and
* `judgeFailed` names a judge invocation that did not settle ok, in
* which case `claimContradictions` is absent: nothing was judged, and
* an empty list would claim the pool agreed.
*/
interface OrchestrateClaimConsistencyMeta {
  /** How many accepted children the fold read. */
  poolChildren: number;
  /** Draft sentences carrying at least one parsable anchor. */
  draftCitingSentences: number;
  /** Pairs the fold produced (and the judge ruled on, when invoked). */
  pairs: number;
  /** True when more pairs existed than `max` allowed to judge. */
  truncated: boolean;
  /**
  * Citing sentences with at least one judged pair (RV1603): the honest
  * coverage numerator against `draftCitingSentences`, so `[]` findings
  * over 40 of 144 sentences can never read as "fully verified".
  */
  coveredCitingSentences: number;
  /**
  * Present when `coverageTarget` was declared (RV2903): the share the
  * pass sized itself for, echoed so a persisted outcome says WHAT the
  * coverage was held against, not only what it reached.
  */
  coverageTarget?: number;
  /**
  * Present when the pass ran under an effective coverage target
  * (RV4404): declared `coverageTarget`, or the target 1 a declared
  * semanticAcceptance derives. A truncation then grades
  * 'coverage-capped', naming the ceiling as the cause.
  */
  coverageTargetDeclared?: true;
  /**
  * Present when `critical` was declared: the critical draft anchors
  * with no judged pair (capped at {@link MAX_CRITICAL_UNCOVERED});
  * `[]` means every declared claim the draft cited was judged.
  */
  criticalUncovered?: string[];
  /** The uncapped count behind `criticalUncovered`; present with it. */
  criticalUncoveredTotal?: number;
  /** Present under `runFacts`: run-claim pairs judged against the fact sheet. */
  runFactPairs?: number;
  /** Present under `runFacts` when more run claims matched than the bound. */
  runFactPairsTruncated?: true;
  /**
  * Present under `runFacts` (RV1809): the UNCAPPED count of matched
  * run-claim sentences, so the run-fact coverage ratio is computable
  * from the meta alone, live or from a persisted outcome.
  */
  runFactCandidates?: number;
  /**
  * Present when a declared coverage floor was not met under
  * `onLowCoverage: 'report'` (RV1809): each ratio beside its floor,
  * machine-readable, so "complete but under-verified by the declared
  * floor" is a field, not an external computation. Under 'fail' the
  * run fails typed instead and the meta stamps this block on the way
  * out.
  */
  lowCoverage?: {
    coverageRatio: number;
    coverageFloor?: number;
    runFactRatio?: number;
    runFactFloor?: number;
  };
  /** True when the judge invocation was dispatched. */
  judgeInvoked: boolean;
  /** Present when the judge invocation did not settle ok. */
  judgeFailed?: true;
  /**
  * Present when the judge invocation was refused ADMISSION and never
  * dispatched (RV2106): the ninth parity run's judge estimate did not
  * fit the orchestrator account's working room past the held
  * synthesis reserve, and the bare refusal killed a run whose fan-out
  * and draft were already complete. The declined pass degrades like a
  * failed judge (the meta names it, the journaled decision carries
  * the arithmetic, only the armed 'fail' posture stops the run) and
  * the synthesis its reserve was holding money for still dispatches.
  */
  judgeDeclined?: true;
  /**
  * How many judged contradictions the pass FOUND on the judged
  * document, present exactly when the judge settled ok (RV3304): `0`
  * is a clean verdict, a positive count is a disagreement that stayed
  * wherever the posture did not stop the run. The findings themselves
  * ride `claimContradictions` beside this meta on the acceptance
  * envelope, and since RV3601 the engine lifts them onto RunOutcome,
  * the journaled settle and `run:end` beside the meta, from the
  * envelope or the typed error data alike: the 2026-08-12 comparison
  * run settled ok/complete over a retained finding no terminal
  * surface could count (this count is that fix, RV3304), then the
  * 2026-08-13 run failed typed with the findings buried in error
  * data while the outcome's top level read null. Only the compact
  * terminal envelope still carries the meta alone, this count
  * standing in for the details.
  */
  findings?: number;
  /**
  * The one field a consumer reads INSTEAD of inferring semantic
  * health from an empty findings array (RV1702):
  * {@link claimCoverageOf} over this meta, so `completion:
  * 'complete'` plus `contradictions: []` can never again read as
  * "fully verified" when the judge saw 40 of 144 citing sentences.
  */
  coverage: ClaimCoverageGrade;
  /**
  * WHICH document this verdict describes (RV2509): `'draft'` for the
  * pre-synthesis pass, `'final'` for a pass over the artifact the run
  * settles on. Always present since RV2509, so a coverage grade can
  * never be read as a claim about the shipped document when it was
  * rendered over the draft the synthesis replaced.
  */
  judgedStage: "draft" | "final";
  /**
  * sha256 over the canonical document this verdict read (RV2509).
  * Compare it against the envelope's `draftToFinal.finalHash`: equal
  * means the judged document IS the one that shipped, unequal means
  * the synthesis rewrote what the judge cleared.
  */
  judgedHash: string;
  /**
  * The precise twin of `judgedHash` (RV4604): the same hex under a
  * name that states the recipe, sha256 over the JCS canonical
  * document (a string document hashes as its JSON encoding, so a
  * file export's own sha DIFFERS; `verifyCandidateBytes` is the
  * audit predicate). The seventh comparison experiment's provenance
  * script rediscovered the recipe by trial because the bare name
  * said nothing. Absent on metas recorded before the field.
  */
  judgedJcsSha256?: string;
  /**
  * How many judge passes this stage's verdict lineage ran (RV3904,
  * the fourth comparison experiment): present exactly when the
  * bounded claim repair round is armed (`onFound: 'repair'`), so a
  * consumer reading `findings: 0` can tell a clean FIRST verdict
  * (`passes: 1`) from a verdict earned through a repair
  * (`passes: 2`, the meta above always describing the LAST pass).
  * The experiment's terminal read findings 0 over a lineage whose
  * first pass had caught a real contradiction, and only the journal
  * could say so. Absent on journals and configs from before the
  * field, and absent when no repair round is armed: NOT RECORDED,
  * never a claim of a single pass.
  */
  passes?: number;
  /**
  * The findings count of the FIRST pass of this stage (RV3904),
  * present exactly when `passes` exceeds 1: what the repair round
  * consumed, so "zero findings after one round over one first-pass
  * finding" reads off the envelope instead of the journal.
  */
  firstPassFindings?: number;
  /**
  * The coverage grade of the FIRST pass (RV4202), present exactly
  * when a coverage-armed round ran (`passes` exceeds 1 under
  * `coverageRepair`): the meta above always describes the LAST pass,
  * so without this field a 'full' grade earned through the round
  * would be indistinguishable from a clean first verdict.
  */
  firstPassCoverage?: ClaimCoverageGrade;
  /**
  * Bounded semantic repair rounds actually dispatched at this stage
  * (RV3904); today 0 or 1, the evidence-grade precedent. Distinct
  * from the finish validation's mechanical `repairsUsed`, which
  * counts model repair turns INSIDE one invocation and keeps its
  * byte contract untouched.
  */
  semanticRepairRounds?: number;
}
/**
* How the shipped artifact relates to the draft the run composed it
* from (RV2509), present on the acceptance envelope whenever a
* synthesis was configured. Two hashes and the answer they imply: a
* semantic verdict rendered over the draft describes the final only
* when `rewritten` is false, and until this shipped a consumer had no
* way to ask.
*/
interface OrchestrateDraftToFinal {
  /** sha256 over the canonical coordination draft. */
  draftHash: string;
  /** sha256 over the canonical artifact the run settled on. */
  finalHash: string;
  /** False exactly when the two hashes agree: the synthesis returned the draft unchanged. */
  rewritten: boolean;
  /** Which documents the claim-consistency pass actually judged; absent when it never ran. */
  claimsJudgedOn?: "draft" | "final" | "both";
}
/**
* The deterministic-repair aggregate of the shipped run (RV3904, the
* fourth comparison experiment): the patches themselves stay on the
* journaled finish-validation decisions (RV3801, byte-exact with
* before/after hashes per decision); the acceptance envelope carries
* the aggregate, so "was the shipped document machine-patched, and
* from what bytes" is an envelope read instead of a journal walk.
* Present exactly when at least one ACCEPTED deterministic repair
* exists; every other envelope stays byte identical.
*/
interface OrchestrateDeterministicPatches {
  /** Finish decisions whose deterministic repair was accepted. */
  decisions: number;
  /** Total individual patches across those decisions. */
  patches: number;
  /** The LAST accepted repair's canonical pre-patch hash. */
  lastBeforeHash: string;
  /** The LAST accepted repair's canonical post-patch hash; the judge rules on these bytes. */
  lastAfterHash: string;
}
/**
* The synthesis invocation's own knobs (RV-211). Everything else about
* the invocation is deterministic: the prompt derives from the journaled
* draft and the settled child digest, the toolset is the single finish
* tool (a distinct toolsetHash, exactly like the reserved cap
* finalizer), the invocation journals as an ordinary agent entry (a
* resume replays it with zero paid calls), and its telemetry is a full
* agent span with role 'synthesize' phase pairs, so
* `CostReport.byRole.synthesize` and `reduceCriticalPath` attribute it
* without heuristics. Failure posture: with finishValidation configured
* a failed synthesis fails the run typed (the validated path is
* mandatory); without validators the run falls back to the coordination
* draft under a journaled 'orchestrator_synthesis_fallback' decision and
* a warn log, never silently.
*/
interface OrchestrateSynthesis {
  /** Model override for the synthesize invocation; the routing key and chain apply otherwise. */
  model?: ModelSpec;
  /** Canonical effort of the synthesize invocation. */
  effort?: Effort;
  /** UsageLimits of the synthesize invocation; default { maxTurns: 4 }. */
  limits?: UsageLimits;
  /** Extra deterministic instruction lines appended to the synthesis prompt. */
  instructions?: string;
  /**
  * Opt-in policy-facts line in the 'single' synthesis prompt (RV709):
  * a deterministic digest of the settled children's durable
  * tool-budget facts (statuses, extension grants, finalization
  * windows and reserves), so the composing model can cite the run's
  * own observed evidence instead of underclaiming it. Folded ONLY
  * from replay-stable material (the settled results the journal
  * replays verbatim), so a resumed synthesis re-derives identical
  * prompt bytes; off by default, and the prompt stays byte identical
  * when unset (prompt bytes are journal identity).
  */
  policyFacts?: boolean;
  /**
  * Opt-in RUN FACTS line in the 'single' synthesis prompt (RV1503),
  * the policyFacts sibling: the aggregate of the settled children's
  * replay-stable execution facts ({@link executionFactsOf}: wire
  * requests, missing response ids, token totals, statuses), so the
  * composing model can grade `live-observed` truthfully instead of
  * erasing the run it is part of. The line names its own boundary
  * (harness-observed, not production evidence). Folded ONLY from
  * journal-replayed material; off by default, and the prompt stays
  * byte identical when unset.
  *
  * The object form (RV3004) keeps the child line and adds opt-ins.
  * `workflowSoFar: true` appends a RUN FACTS SO FAR line: the same
  * counters folded over the settled children PLUS this
  * orchestration's own settled internal spans as of this dispatch's
  * composition (coordination turns, draft claim judges, judged
  * contradiction passes, synthesis notes), so the number the model
  * quotes sits next to the invoice instead of a third of it. The
  * composing dispatch itself and anything still running are excluded
  * by construction, the line says so, and dollars stay absent for
  * the same replay reason as the child line. `runFacts: true` keeps
  * today's prompt bytes exactly; the SO FAR line exists only under
  * the object opt-in.
  */
  runFacts?: boolean | {
    workflowSoFar?: boolean;
  };
  /**
  * Admission estimate for the synthesize invocation, like
  * AgentOpts.estCost: under a tight orchestrator cap the default
  * reserve (full maxOutputTokens pricing) can refuse the dispatch; an
  * explicit estimate is the host speaking. In 'incremental' mode the
  * estimate applies to EACH note invocation.
  */
  estCost?: number;
  /**
  * The synthesis shape (RV-211 remainder). Default 'single': one
  * post-fan-in synthesize invocation composes the final result from the
  * draft and the whole settled digest. 'incremental': every settled
  * child triggers ONE bounded synthesize-role NOTE invocation as soon
  * as it settles (concurrent with the still-running fan-out, which is
  * what moves synthesis wall time off the post-fan-in critical path),
  * and the FINAL result is a DETERMINISTIC reconciliation, never
  * another model call: an {@link IncrementalSynthesisResult} envelope
  * composed from the draft and the notes in spawn order. The tradeoffs
  * are explicit: notes are paid DURING the run, so an acceptance
  * rejection can no longer guarantee "a rejected run never paid for
  * synthesis"; and because the reconciliation has no model-composed
  * finish, `finishValidation` cannot bind it: configuring both is a
  * ConfigError at intake. A note that dies falls back to the child's
  * raw digest summary under a journaled per-child
  * 'orchestrator_synthesis_note_fallback' decision and a warn log.
  * Cap paths are unchanged: a capped run settles through the reserved
  * finalizer and never reconciles.
  */
  mode?: "single" | "incremental";
  /**
  * Deduplicate repeated claim lines across children BEFORE any model
  * call (RV-211 remainder; default false, and the prompt stays byte
  * identical when unset). In 'single' mode the digest entering the
  * synthesis prompt keeps only the FIRST occurrence of every repeated
  * line and a REPEATED CLAIMS index (each claim with its reporters)
  * rides the prompt beside it. In 'incremental' mode the deterministic
  * reconciliation dedupes the note texts the same way and the envelope
  * carries the `repeatedClaims` index. Matching is whitespace-collapsed
  * exact line equality: nothing fuzzy ever merges two distinct claims.
  */
  dedupeClaims?: boolean;
  /**
  * UsageLimits of ONE incremental note invocation; default
  * { maxTurns: 2 }. In mode 'single' the declaration is a typed
  * ConfigError (RV3102): no note invocation exists for the limits to
  * bound, and until the gate it was silently ignored.
  */
  noteLimits?: UsageLimits;
  /**
  * Give the 'single' synthesis invocation the RV-201 evidence tools
  * `get_child_result` and `read_child_artifact` beside `finish` (the
  * v1.74 experiment review, P0.2): the finish validators hold the
  * result against the FULL child outputs while the synthesis model
  * sees 400 char digests, so when the coordination draft collapses the
  * evidence the validators demand is model-invisible. With the tools
  * exposed the digest rows in the synthesis prompt carry each child's
  * `handle`, and the model pages any settled child's full output or
  * artifacts before finishing. Off by default: the synthesis toolset
  * and prompt stay byte identical, exactly like the coordination
  * `exposeChildResultTools`.
  */
  exposeChildResultTools?: boolean;
  /**
  * What the 'single' synthesis prompt embeds beside the draft (the
  * v1.74 experiment review, P0.2). Default 'digests': the 400 char
  * settled digest rows, byte identical to pre 1.76. 'full' appends a
  * CHILD OUTPUTS section carrying every settled child's FULL
  * serialized output after the digest rows: the whole evidence pool
  * the validators judge against rides the prompt, paid as input
  * tokens (declare `estCost` or the preflight `estInputTokens`
  * accordingly).
  */
  context?: "digests" | "full";
  /**
  * The conditional synthesis gate (RV510, the ninth comparison
  * experiment: synthesis returned the byte-identical draft after
  * 101.3 s and 0.5512 USD, 57.3% of post-fan-in wall time). With
  * `true`, before the 'single' synthesis span starts the coordination
  * draft is run through the FULL declared finish contract (the same
  * `finishValidation.validators` that would bind the synthesis
  * finish): a draft that passes skips the synthesis invocation
  * entirely under a journaled 'orchestrator_synthesis_skip' decision
  * with reason 'synthesis_skipped_by_valid_draft' (the existing skip
  * vocabulary; the info log and the acceptance envelope carry it), and
  * a resume rolls the journaled skip forward with zero paid calls. A
  * draft that fails any validator goes to synthesis exactly as before,
  * with the repair budget untouched (the gate is a pre-pass, never a
  * journaled validation verdict). Deterministic by construction: only
  * the declared contract judges, never a semantic delta heuristic.
  * Requires `finishValidation` (a ConfigError at intake otherwise:
  * without a contract there is nothing to judge the draft valid by),
  * which transitively limits it to mode 'single'. With a configured
  * `budget.synthesisReserveUsd` the held money is released unconsumed
  * on the skip and no reserve lifecycle journals: there was no
  * synthesis invocation to account. Default false: the gate, the
  * decision entry, and the envelope field are all absent, byte for
  * byte.
  */
  skipWhenDraftValid?: boolean;
  /**
  * Carry a FAILED skip pre-pass into the synthesis prompt (RV808a).
  * The pre-pass verdict used to be discarded on failure, and the
  * twelfth comparison run paid for exactly that: synthesis re-derived
  * the whole document blind to which validators the draft had already
  * failed, then failed the same contract once more itself. With
  * `true`, a failing pre-pass journals its verdict (decisionType
  * 'orchestrator_synthesis_draft_gaps': the failed validator names
  * with their reasons, bound to the contract generation and the
  * draft hash exactly like the skip decision), and the synthesis
  * prompt gains a `DRAFT CONTRACT GAPS:` line naming those failures
  * with the instruction to repair the named gaps and preserve the
  * draft otherwise. A resume reuses the journaled verdict without
  * re-running a validator, so the prompt bytes re-derive identically
  * and the paid invocation replays. Requires `skipWhenDraftValid`
  * (the gaps ARE the pre-pass verdict; there is nothing to carry
  * without it). Default false: no decision entry, prompt bytes
  * identical.
  */
  carryDraftGaps?: boolean;
  /**
  * The no-regression floor under the synthesis (RV2505, the 1.226.0
  * comparison run). That run's coordination draft satisfied the FULL
  * declared contract, `skipWhenDraftValid` was off because the
  * operator wanted the composing pass anyway, and the synthesis then
  * failed the same bundle three times and died mid repair: the run
  * settled with NO result at all, having paid for four workers, the
  * draft that would have passed, and three rejected compositions.
  * With `true`, a synthesis that fails terminally does not throw away
  * a draft the contract accepts. The failure is caught at the
  * post-fan-in chokepoint, the coordination draft is judged by the
  * same `finishValidation.validators` that bind the synthesis finish,
  * and a draft every validator accepts becomes the run result under a
  * journaled 'orchestrator_synthesis_regressed' decision (the failure
  * message, the validator names, the draft hash, the contract
  * generation) plus a warn 'orchestrator synthesis regressed' log; the
  * envelope carries `synthesisRegressed`. A draft that fails too
  * journals 'orchestrator_synthesis_fallback_declined' naming ITS
  * failing validators and the original failure rethrows untouched, so
  * the decline is auditable instead of silent. Deterministic by
  * construction: only the declared contract judges, never a quality
  * heuristic, and the verdict is a pure function of the draft, so a
  * resume re-derives it without re-running the paid invocation.
  * Requires `finishValidation` (a ConfigError at intake otherwise:
  * without a contract there is nothing to judge either document by),
  * which transitively limits it to mode 'single'. Orthogonal to
  * `skipWhenDraftValid`: that gate decides whether to PAY for the
  * synthesis, this floor decides what to do when the paid one comes
  * back worse than the draft, and with both on a valid draft skips
  * before there is anything to regress. Default false: no catch, no
  * decision entry, no envelope field, byte for byte.
  */
  fallbackToValidDraft?: boolean;
  /**
  * The structured evidence index (RV808b): a deterministic per-child
  * citation map in the 'single' synthesis prompt, so the composing
  * model can target its reads instead of re-reading the whole
  * evidence pool (`context: 'full'` re-pays every child output as
  * input tokens; the twelfth comparison run spent 357 s of synthesis
  * on exactly that re-derivation). One `EVIDENCE INDEX:` line rides
  * the prompt after the digest rows: per SETTLED child in spawn
  * order, its nodeId, terminal status, the DISTINCT citations its
  * output actually carries (matches of `pattern`, default
  * {@link DEFAULT_CITATION_PATTERN}; extracted ONLY from
  * evidence-pool children, ok and salvage-accepted, exactly the pool
  * evidencePreservedValidator judges, so an indexed citation is
  * never one the validators would reject as fabricated), its
  * artifact descriptors (the read_child_artifact vocabulary), and
  * its output size in chars. With `exposeChildResultTools` the rows
  * carry the child handle, so the index and the pagination tools
  * compose: read exactly the child whose citation you need. Folded
  * ONLY from replay-stable settled results (the policyFacts
  * precedent), so a resumed synthesis re-derives identical prompt
  * bytes; `true` uses the default pattern, an object overrides it
  * (fail-closed: a pattern that can match the empty string is
  * refused at intake, the RV610 posture). Meaningless in
  * 'incremental' mode (no single synthesis prompt exists): a
  * ConfigError. Absent = the prompt stays byte identical.
  */
  evidenceIndex?: true | {
    pattern?: string;
    flags?: string;
  };
  /**
  * The atomic claim map of the composition (RV4305, P2.1). With
  * `true`, the synthesis invocation's finish REQUIRES a typed
  * `claimMap` beside the result: one row per material claim, each
  * with its evidentiary grade (`source`, `inference`, `assumption`,
  * `live-observed`), the source anchors it rests on, the inference
  * bridge on inference rows, and the run evidence on live-observed
  * rows. The finish tool's schema and description change under the
  * opt-in, so the synthesis toolset hash moves BY DESIGN (the
  * sectional precedent). Deterministic validation is STRUCTURAL
  * only: every document anchor covered by the map and every map
  * anchor present in the document (both directions), at most one
  * non-source row per anchor (a row count, never a semantic
  * verdict), per-grade required blocks, unique ids; a structural
  * failure spends the ordinary finish repair bound like any
  * validator rejection. Semantic truth stays with the judges: the
  * accepted map is journaled beside the accepted candidate (linked
  * by `candidateHashOf`) and fed into the existing claim judge's
  * prompt under this same opt-in; no new judge and no new rounds
  * exist. Requires `finishValidation`; refuses beside
  * `skipWhenDraftValid` and `fallbackToValidDraft` (both can ship a
  * DRAFT that never carried a map) and beside
  * `finishValidation.sectionalRepair` (a sectional resubmission
  * would splice a document out from under its map); an armed repair
  * round resubmits the full document with a full map instead of
  * arming the sectional shortcut. Absent, every byte holds: prompt,
  * toolset hash, journal, envelope.
  */
  claimMap?: true;
}
/**
* The deterministic reconciliation envelope an 'incremental' synthesis
* returns as the run result (RV-211 remainder): the coordination draft
* plus one section per settled child in spawn order, each carrying the
* child's terminal status and its note (the note invocation's finish
* output, or the child's raw digest summary when the note fell back).
* With `dedupeClaims`, repeated claim lines keep their first occurrence
* only and the `repeatedClaims` index lists each with its reporters.
* Everything here derives from journaled state, so a resume reproduces
* the envelope byte for byte with zero paid calls.
*/
interface IncrementalSynthesisResult {
  synthesis: "incremental";
  draft: unknown;
  sections: {
    nodeId: string;
    logicalTaskId: string; /** The child's terminal status. */
    status: string; /** The note invocation's terminal status ('ok' unless it fell back). */
    noteStatus: string;
    note: string;
  }[];
  repeatedClaims?: RepeatedClaim[];
}
/**
* The machine-readable reason a CONFIGURED synthesis step was skipped
* (the 1.65.0 experiment review, item 11.4): telemetry that shows zero
* synthesize spend must say why instead of leaving the host to infer it
* from the acceptance decision. 'synthesis_skipped_by_acceptance': the
* acceptance policy rejected the finish, and a rejected run never pays
* for the post-fan-in composing step (in 'incremental' mode the settled
* notes were already paid during the run; the skipped step is the free
* deterministic reconciliation). 'synthesis_skipped_by_budget_cap': the
* orchestrator budget cap froze the plan, and a capped run settles
* through the reserved finalizer, never synthesis.
* 'synthesis_skipped_by_valid_draft' (RV510): the opt-in
* `synthesis.skipWhenDraftValid` gate ran the coordination draft
* through the full declared finish contract and every validator
* passed, so the synthesis invocation had nothing to add and never
* started; unlike the other two reasons the run still settles ok with
* the draft as its result. The reason is frozen into the journaled
* decision that caused the skip (the acceptance decision, the
* budget-cap decision, or the 'orchestrator_synthesis_skip' decision),
* spread into the typed FailRunError data on the failing paths and
* into the acceptance envelope on the valid-draft path, and announced
* by an info 'orchestrator synthesis skipped' log event; it is absent
* everywhere when synthesis is not configured or actually ran, so
* existing runs stay byte identical.
*/
type OrchestrateSynthesisSkipReason = "synthesis_skipped_by_acceptance" | "synthesis_skipped_by_budget_cap" | "synthesis_skipped_by_valid_draft";
declare const ORCHESTRATE_WORKFLOW_NAME = "rulvar-orchestrate";
/**
* Resolves per-spawn dispatch options against the engine registries
* (registered SchemaSpec and tool profile names; M7-T05). An
* unknown ref is a typed ConfigError, surfaced as a tool error to the
* orchestrator and never a run failure.
*/
/**
* The capped orchestrator's own admission estimate (the 1.63.0
* experiment review, P0.3): the effective cap MINUS the finalize
* carve-out already committed on the cap account, so the dispatch
* admits at EXACT FILL by construction (a capped orchestrator can never
* spend past its effectiveCap, and pricing the model's full
* maxOutputTokens instead pinned small run ceilings at zero remainder;
* the M12 checkpoint measured a self-solving orchestrator because no
* child was ever admitted). Exported so the live dispatch and
* preflightEstimate share ONE formula: both call this function.
*/
declare function orchestratorAdmissionEstCostUsd(effectiveCapUsd: number, committedFinalizeReserveUsd: number): number;
/**
* Builds the orchestrator workflow: ONE implementation behind both
* surfaces. The body wires the spawn tools over the per-call runtime,
* recovers spawn records from the journal on resume, and runs the
* orchestrator agent with the finish terminal tool.
*/
declare function makeOrchestratorWorkflow(goal: string, opts?: OrchestrateOptions): Workflow<undefined, unknown>;
/**
* Top-level surface: creates a run. `runOptions` are the ordinary
* engine {@link RunOptions} of the created run; in particular
* `runOptions.budgetUsd` is the ROOT hard ceiling over the WHOLE tree
* (the orchestrator and every child), immutable within a segment,
* while `opts.budget` only shapes the orchestrator's own sub-account
* inside that ceiling. The shortcut previously accepted no RunOptions at all,
* so the canonical entry point could not set a root ceiling without
* dropping to `engine.run(makeOrchestratorWorkflow(...))` (v1.18.0
* review P1-5).
*/
declare function orchestrate(engine: Engine, goal: string, opts?: OrchestrateOptions, runOptions?: RunOptions): RunHandle<unknown>;
//#endregion
//#region src/engine/scheduler.d.ts
/** FIFO semaphore; default per-run width is 12. */
declare const DEFAULT_PER_RUN_CONCURRENCY = 12;
declare class Semaphore {
  private readonly limit;
  private active;
  private readonly waiters;
  /**
  * `limit` must be a positive integer: anything else (NaN included) is
  * a typed ConfigError. Before this gate a NaN limit made
  * `active < limit` permanently false, so the first acquire queued
  * forever and the run could not settle, not even through cancel()
  * (v1.34.0 review P2-4). Unlimited is expressed by not constructing a
  * semaphore, never by a sentinel limit.
  */
  constructor(limit: number);
  get pending(): number;
  /**
  * Acquires a slot, resolving in FIFO order. `onQueued` fires only when
  * the caller actually has to wait (feeds the agent:queued event).
  * An aborted `signal` releases the caller from the queue without a
  * slot: the returned release is a no-op, the remaining waiters keep
  * their FIFO positions, and the caller proceeds to observe its own
  * aborted signal (the model layers refuse dispatch under an aborted
  * signal, so no provider call follows). Cancellation can therefore
  * always drain a queued run (v1.34.0 review P2-4).
  */
  acquire(onQueued?: () => void, signal?: AbortSignal): Promise<() => void>;
  withSlot<T>(fn: () => Promise<T>, onQueued?: () => void, signal?: AbortSignal): Promise<T>;
  private release;
}
//#endregion
//#region src/engine/ctx.d.ts
type ErrorPolicy = "strict" | "lenient";
/**
* The canonical, complete AgentProfile shape; M1 honors description,
* model, routing, effort, limits, and estCost. A profile never carries
* a prompt or a schema.
*/
interface AgentProfile {
  description?: string;
  model?: ModelSpec;
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  effort?: Effort;
  /** Toolset default; the resolved snapshot enters identity via toolsetHash. */
  tools?: ToolsOption;
  /**
  * The attested toolset pin (RV1514): when present, every spawn of
  * this profile must resolve its toolset to EXACTLY this hash, or the
  * spawn refuses typed before any provider call. Record the pin with
  * `attestToolset()`; the per-tool hashes it records turn the
  * refusal into a named diff. The pin binds the spawn's RESOLVED
  * toolset, so call-level tool overrides and the opt-in escalate tool
  * drift it by design.
  */
  toolsetAttestation?: ToolsetAttestation;
  /** Chain layers merged over engine defaults. */
  permissions?: AgentProfilePermissions;
  /** Isolation default; the RESOLVED value enters identity. */
  isolation?: IsolationSpec;
  /** Flavor B opt-in lives here or on the call. */
  escalation?: EscalationOptions;
  limits?: UsageLimits;
  /**
  * The prompt-cache policy layer (RV2006): call opts over this
  * profile over the engine default; absent everywhere means 'auto'
  * (hints on explicit-caching adapters, nothing anywhere else).
  */
  cache?: CachePolicy;
  /** Transport RetryPolicy layer: call over profile over engine (M4-T05). */
  retry?: RetryPolicy;
  /** Declared task class bridging ModelKnowledge; default unclassified (M4-T09). */
  taskClass?: string;
  /**
  * Per-profile compaction threshold; default 0.8 of the loop model's
  * contextWindow (M4-T03). Compaction is ON by
  * default; history-processor plumbing stays engine-internal. The
  * threshold is a fraction in (0, 1], validated at createEngine.
  */
  compaction?: {
    threshold?: number;
  };
  /** Admission reserve hint in USD (budget layer 1). */
  estCost?: number;
  /**
  * The admission countTokens policy for this profile (RV1804): the
  * pre-admission count probe is full-prompt provider egress billed to
  * no invoice row. 'deny' forbids it for spawns of this profile (the
  * flat reserve admits instead); wins over the engine-wide
  * `defaults.countTokens`. Default: the engine default, else 'allow'.
  */
  countTokens?: "allow" | "deny";
  /**
  * The declared evidence contract of the profile's task (RV303, the
  * seventh comparison experiment; runtime enforcement RV507): how many
  * evidence entries the spawned agent MUST record, and the declared
  * call estimates behind them. Under the default `enforce: 'warn'` it
  * is purely declarative, like estCost: {@link preflightEstimate}
  * compares the resulting call floor
  * (`minEntries * estCallsPerEntry + overheadCalls`, defaults 3 and 8)
  * against the spawn's effective executed-call ceiling and warns
  * `tool-cap-below-evidence-floor` when the cap cannot fit the
  * contract. Under `enforce: 'refuse'` the floor additionally binds at
  * the terminal: an ok settle with fewer successful `record_evidence`
  * executions than `minEntries` becomes a typed error terminal. The
  * experiment shape: 14 mandatory entries against an 84-call cap that
  * two workers exhausted at 10 recorded entries.
  */
  evidenceContract?: EvidenceContract;
}
/**
* A declared evidence floor (RV303): preflight judges tool caps
* against it, and under `enforce: 'refuse'` the runtime refuses an ok
* settle below it (RV507); see {@link AgentProfile.evidenceContract}.
*/
interface EvidenceContract {
  /** Evidence entries the task must record; positive integer. */
  minEntries: number;
  /** Estimated executed calls per recorded entry; default 3. */
  estCallsPerEntry?: number;
  /** Estimated non-evidence overhead calls; default 8. */
  overheadCalls?: number;
  /**
  * A journal observed prior for the per-entry call estimate
  * (RV3309): the figure `toolCalibrationFromJournal` folds from a
  * prior run of the same profile (aggregate or a p90 over several),
  * fractional on purpose. Preflight uses the HIGHER of the declared
  * estimate and this prior when it computes the evidence call floor,
  * never the lower, so a stale generous declaration still holds and
  * an optimistic one stops hiding the observed reality: the
  * 2026-08-12 comparison run observed 4.211 calls per entry where
  * the default estimate says 3. When the prior raises the floor,
  * preflight names it in an `evidence-estimate-below-observed`
  * finding beside the usual floor arithmetic. `source` is echoed in
  * that finding so a reader knows which journal spoke.
  */
  calibration?: {
    callsPerEntry: number;
    source?: string;
  };
  /**
  * What the floor does at the child's terminal settle (RV507). The
  * default 'warn' keeps the historical behavior: the contract is a
  * preflight signal only. 'refuse' turns an ok finish whose message
  * window carries fewer successful `record_evidence` executions
  * (result `recorded: true`; duplicates and verification errors never
  * count) than `minEntries` into a typed error terminal (kind
  * 'terminal') whose journaled error data carries the machine-readable
  * `evidenceFloor: { recordedEntries, minEntries }`; the outcome is
  * memoized, so a resume rolls the refusal forward instead of
  * re-paying the invocation. Non-ok terminals are never re-judged.
  */
  enforce?: "warn" | "refuse";
}
/**
* Per-spawn options. The
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
  * buckets see the right role, and the orchestrator's post-fan-in
  * synthesis invocation (RV-211) runs as 'synthesize';
  * extract/finalize/summarize stay trigger-derived and are never
  * settable here (M6-T05 amendment).
  */
  role?: "loop" | "plan" | "orchestrate" | "synthesize";
  /** Overrides all roles at once. */
  model?: ModelSpec;
  /** Per-role, wins over profile.routing. */
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  /** Canonical effort, part of identity. */
  effort?: Effort;
  /** schemaHash enters identity. */
  schema?: S;
  /** toolsetHash enters identity; wins over profile.tools. */
  tools?: ToolsOption;
  /** The RESOLVED value enters identity; worktree needs defaults.isolation. */
  isolation?: IsolationSpec;
  /** Explicit discriminator; replaces the prompt in the content key. */
  key?: string;
  onError?: "throw" | "null";
  /** Transport RetryPolicy under the journal (M4-T05). */
  retry?: RetryPolicy;
  /**
  * The degenerate fallback (M4-T04): an agent-level
  * second attempt on `model` when the terminal matches `on`; one
  * journaled decision entry; the fallback attempt is a NEW content key.
  */
  fallback?: FallbackField;
  /** Per-call replay mode; default scoped forward-matching. */
  replay?: "cache" | "never";
  /** Journaled as a policy field from day one; consumed by the M2 predicate. */
  memoizeOutcome?: boolean;
  /** Opt-in; without it 'escalated' is physically unproducible. */
  escalation?: EscalationOptions;
  /**
  * Lineage continuation (DEF-3): declares this
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
  /** Merged over profile and engine limits. */
  limits?: UsageLimits;
  /** The prompt-cache policy for THIS call (RV2006); wins over profile and engine. */
  cache?: CachePolicy;
  result?: "value" | "full";
  /** Telemetry only. */
  label?: string;
  /** Enables agent:stream delta events. */
  stream?: boolean;
}
/** One dropped result: its source, scope, entry ref, and wire error. */
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
* AgentResult where one exists.
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
* structurally satisfies the typed AgentError and carries the full
* AgentResult for Settled mapping. Deliberately not a RulvarError:
* AgentError is not in the closed code registry.
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
/**
* Projects a settled AgentResult's error to its wire form, carrying the
* engine-decided abort class in data. AgentError itself has no data
* field, so without this every projection past the terminal entry (the
* run-level outcome.error, thrown AgentCallError wires, dropped items)
* would keep only the message text and lose the typed class (v1.9.0
* follow-up review).
*/
declare function agentResultWire(result: AgentResult<unknown>, fallbackMessage: string): WireError;
/** Pipeline results plus the dropped evidence, returned by onItemError: 'collect'. */
interface PipelineCollected<T> {
  results: T[];
  dropped: DroppedItem[];
}
/** The canonical Ctx interface, M1 members. */
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
  * Runs a child workflow under the AdmissionController (M6-T06). The
  * child gets a nested journal scope (registered name
  * plus ordinal) and a hierarchical budget sub-account whose spend
  * propagates to every ancestor. Structural limit violations throw the
  * typed AdmissionRejectedError and never tear the run down; budget
  * rejections throw BudgetExhaustedError. The string form resolves
  * against the per-engine workflow registry and is the
  * only form available inside the worker sandbox.
  */
  workflow<A, R>(wf: Workflow<A, R>, args: A, o?: WorkflowCallOpts): Promise<R>;
  workflow(name: string, args?: Json, o?: WorkflowCallOpts): Promise<unknown>;
  /**
  * Nests a dynamic orchestrator under the AdmissionController (M6-T07):
  * one implementation with the top-level
  * orchestrate(engine, goal, opts) surface, clamped by maxDepth and the
  * parent budget account through the ordinary ctx.workflow admission.
  */
  orchestrate(goal: string, opts?: OrchestrateOptions): Promise<unknown>;
  /**
  * A journaled summarize invocation for handing an inheritable brief to
  * a child (M6-T10): one agent-kind entry under
  * role 'summarize', therefore free on replay.
  */
  brief(o: BriefOpts): Promise<string>;
  /**
  * Suspends this position on a journaled entry until an external
  * resolution arrives. NO deadline in v1.
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
/** Options of ctx.workflow; `key` replaces args in the child identity. */
interface WorkflowCallOpts {
  key?: string;
  /** Lineage continuation (DEF-3); embedded in the admission decision entry. */
  lineage?: SpawnLineageOpt;
  /** Approach slug entering approachSig (DEF-3). */
  approach?: string;
}
/**
* Options of ctx.brief (concrete shape fixed in M6-T10): the content to
* distill plus an optional instruction;
* the invocation resolves role 'summarize', so it needs
* defaults.routing.summarize, a profile, or the explicit model.
*/
interface BriefOpts {
  content: string;
  instruction?: string;
  model?: ModelSpec;
  agentType?: string;
}
/** Closure-form workflow value; in-process only. */
interface Workflow<A = unknown, R = unknown> {
  readonly kind: "workflow";
  readonly name: string;
  readonly argsSchema?: SchemaSpec<A>;
  readonly errorPolicy: ErrorPolicy;
  /**
  * Workflow defaults: the third layer of the resolution chain, under the
  * call override and the agent profile and over the engine defaults.
  * A workflow that declares nothing contributes no layer and resolves
  * exactly as it did before. The layer follows the CALL TREE, not the
  * file: a child spawned through `ctx.workflow` contributes ITS OWN
  * defaults inside its scope, so nesting a cheap workflow under an
  * expensive one does the obvious thing.
  */
  readonly model?: ModelSpec;
  readonly routing?: Partial<Record<InvocationRole, ModelSpec>>;
  readonly effort?: Effort;
  readonly body: (ctx: Ctx<never>, args: A) => Promise<R>;
}
declare function defineWorkflow<A, R, P extends ErrorPolicy = "strict">(meta: {
  name: string;
  args?: SchemaSpec<A>;
  errorPolicy?: P; /** Workflow defaults: resolution-chain layer 3. See Workflow. */
  model?: ModelSpec;
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  effort?: Effort;
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
  /** Keyed by the raw journal scope (RV3805); '' is the root's own scope. */
  byScope: Map<string, number>;
  byRole: Map<InvocationRole, number>;
  unpriced: Array<{
    model: string;
    usage: Usage;
  }>;
  /** The DEF-7 orchestrator block, mutated by the mode (c) machinery. */
  orchestrator: {
    spentUsd: number;
    wakes: number;
    forcedFinish: boolean;
    reserveUsedUsd: number;
  };
}
/** Everything one run's ctx needs; created per run by the engine (M1-T11). */
interface RunInternals {
  runId: string;
  replayer: Replayer;
  budget: RunBudget;
  /** The single admission point for all spawns (M6-T06). */
  admission?: AdmissionController;
  semaphore: Semaphore;
  events: RunEventSink;
  spans: SpanMinter;
  /**
  * Every live agent invocation of this run, registered by the ctx
  * wrapper the moment agentImpl is entered and removed when it
  * settles (terminal append included), so the engine's settle drain
  * (RV1904) can await the stragglers a workflow body returned over.
  * The four-role benchmark's recovery run kept appending child
  * terminals after run_settle; orchestrations barrier their own
  * roster (RV1903), and this registry closes the same hole for plain
  * workflows with un-awaited ctx.agent calls.
  */
  liveAgentCalls: Set<Promise<unknown>>;
  /** The run root span; every top-level span parents on it. */
  rootSpanId: string;
  transcripts: TranscriptStore;
  /**
  * Queue mode: the segment's lease, threaded into EVERY transcript
  * blob write of the segment (checkpoints, compaction summaries,
  * worktree patches) exactly as the Replayer threads it into every
  * journal append, so a store declaring fencedWrites refuses a
  * superseded segment's blob overwrites (fenced run state RFC, F2).
  * The engine binds this as a live getter over its segment-lease
  * holder (P0.2), so the union with undefined is explicit: before
  * the ownership boot (and on non-leasable stores) it reads
  * undefined.
  */
  lease?: Lease | undefined;
  adapters: ReadonlyMap<string, ProviderAdapter>;
  defaults: {
    routing?: Partial<Record<InvocationRole, ModelSpec>>;
    profiles?: Record<string, AgentProfile>;
    limits?: UsageLimits; /** Engine-wide permission chain layers. */
    permissions?: PermissionConfig; /** Engine-wide transport RetryPolicy (M4-T05). */
    retry?: RetryPolicy; /** The per-engine workflow registry (consumers: M6 ctx.workflow, M8 worker). */
    workflows?: Record<string, unknown>; /** Registered SchemaSpec names for outputSchemaRef (M7-T05). */
    schemas?: Record<string, SchemaSpec>; /** Registered tool profile names for toolsetRef (M7-T05). */
    toolsets?: Record<string, ToolsOption>; /** Registered mechanical gate profiles (M7-T10). */
    gates?: Record<string, MechanicalGateProfile>; /** Engine-wide admission countTokens policy (RV1804); default 'allow'. */
    countTokens?: "allow" | "deny"; /** The toolset attestation floor (RV4204); default off. */
    requireToolsetAttestation?: boolean; /** The engine-wide prompt-cache policy (RV2006); profile and call opts win. */
    cache?: CachePolicy; /** The receipt posture of the billing seam (RV3405); default 'async'. */
    billingReceipts?: "async" | "awaited" | "intent";
  };
  /** Telemetry compat posture (RV1810). */
  telemetry?: {
    /** Emit the legacy agent:error twin beside quota:denied. */quotaDeniedAgentError?: boolean;
  };
  /** Engine-scoped per-provider keyed limiter (M4-T07). */
  providerLimiter?: KeyedLimiter;
  /**
  * The shared quota limiter runtime (RV-215): the configured
  * QuotaLimiter with the engine's tenant and failure policy
  * resolved. Threaded into every live wire dispatch of every run;
  * absent = no shared quota, byte-identical to before the feature.
  */
  quota?: EngineQuotaRuntime;
  /**
  * The run's recorded execution scope (RV4205): the normalized copy
  * genesis records, threaded so the quota completion can read the
  * scope's tenant under `tenantFrom: 'scope'` and stamp the scope
  * dimensions onto reservations for dimension-matched rules.
  * Structural (not the engine's ExecutionScope named type) because
  * ctx deliberately imports nothing from engine.ts.
  */
  executionScope?: {
    tenant?: string;
    account?: string;
    project?: string;
    legalDomain?: string;
    region?: string;
    providerAccount?: string;
    sponsor?: string;
  };
  /** The configured price table's version; pinned in decision entries (M4-T06). */
  pricingVersion?: string;
  /** budgetDefaults.flatReserveUsd; last resort of the reserve formula. */
  flatReserveUsd?: number;
  /** Hard router constraints from engine config (M4-T09). */
  floors?: QualityFloors;
  errorPolicy: ErrorPolicy;
  dropped: DroppedItem[];
  cost: CostAttribution;
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined;
  /** Raw price-row resolution (table wins, caps fallback); undefined = unpriced. */
  pricingOf?: (servedBy: ModelRef) => Pricing | undefined;
  runSignal?: AbortSignal;
  /** The worktree lifecycle provider. */
  isolation?: IsolationProvider;
  /**
  * Isolated tool executors (RV-216): the ToolExecutorProvider registry
  * from createEngine, keyed by non-inprocess executor tag. A tool
  * declaring such a tag dispatches through the matching provider instead
  * of running its inprocess closure; absent means only inprocess tools
  * are accepted.
  */
  executors?: ExecutorRegistry;
  /**
  * Which exec idempotency key derivation this run's isolated dispatches
  * use (RV403), resolved at engine boot from RunMeta.execKeyDerivation:
  * version 2 carries the run's generation token to scope keys to the
  * incarnation; absent behaves as version 1 (the genesis-free
  * derivation of runs recorded before the stamp shipped).
  */
  execKey?: ExecKeyDerivation;
  /**
  * The ModelKnowledge runtime handle (M10-T03): current()
  * only, commit physically absent. Present only when the engine was
  * given stores.modelKnowledge; absent means the feature is off and
  * no kb entries are ever written.
  */
  knowledge?: ModelKnowledgeHandle;
  /**
  * The InProcessRunner escalation hook: receives
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
declare function createCtx(internals: RunInternals, rootWorkflow?: {
  model?: ModelSpec;
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  effort?: Effort;
}): Ctx<ErrorPolicy>;
/**
* Runs a workflow body against a fresh ctx: the engine core that
* engine.run wraps with RunHandle, events, and outcome assembly (M1-T11).
* Validates args against the declared schema, then executes single-pass.
*/
declare function executeWorkflow<A, R>(internals: RunInternals, wf: Workflow<A, R>, args: A): Promise<R>;
//#endregion
//#region src/engine/cost-report.d.ts
/**
* The named fallback bucket of the attribution folds (RV3604): an
* absent phase, an EMPTY phase and an empty agentType all fold under
* 'unknown' instead of minting a '' key. The third comparison run's
* report read `byPhase {"": 5.58}` for the whole run and a '' bucket
* beside the named agent types: the empty string passed the `??`
* fallback, and a '' key is unaddressable in every downstream table.
* Both builders and both live accumulation sites apply this one rule,
* so the live report and the journal fold cannot disagree on the key.
*/
declare function attributionBucket(value: string | undefined): string;
/**
* The byAgentType bucket of one attributed slice (RV4206, the RV3905
* vacuum-fill precedent carried to the agent-type table). A declared
* agentType always wins, verbatim. The vacuum, an absent or empty
* agentType, is FILLED from facts the journal already records instead
* of stamping new bytes: role 'orchestrate' names the bucket
* 'orchestrator' (the coordination loop and the forced-finish wake),
* and role 'synthesize' names it by the dispatch label through the
* ONE {@link synthesizeSpanClassOf} classifier: 'synthesizer' for
* compositions and notes, 'claim-judge' and 'citation-judge' for the
* two judges, with an unknown label keeping the honest 'unknown'.
* Because the derivation reads only recorded facts, the live report,
* the journal fold, and every ARCHIVED journal report the same named
* buckets: the sixth comparison run's report read byAgentType 100%
* 'unknown' over a run whose every dispatch had a nameable stage, and
* that same journal now folds to named rows retroactively. Both
* accumulation sites and the journal fold call this one function, the
* RV3302 no-drift doctrine.
*/
declare function agentTypeBucket(agentType: string | undefined, role: string | undefined, label: string | undefined): string;
/**
* The scope key rule of the byScope rollup (RV3805). The root's OWN
* scope is the empty string BY CONSTRUCTION: present data whose string
* happens to be empty, not an absence, so it folds under the
* addressable name 'root' instead of the RV3604 'unknown' fallback,
* which stays reserved for a scope that is truly missing. Children
* keep their scope strings verbatim. One rule for both builders, so
* the live report and the journal fold cannot disagree on the key.
*/
declare function scopeBucket(scope: string | undefined): string;
/**
* Folds the per-run attribution buckets into the normative CostReport.
* Live attribution buckets never see abandoned subtrees, so a host
* that tracked abandoned spend itself passes it as `abandoned`;
* omitted, the report shows a gross equal to the net. Non-finite
* numbers anywhere in the inputs are a typed refusal (RV705): this
* exported builder is the same public surface as
* {@link costReportFromJournal} and holds the same RV610 doctrine,
* instead of letting an Infinity or NaN serialize into null downstream.
*/
declare function buildCostReport(attribution: CostAttribution, totalUsd: number, abandoned?: CostReport["abandoned"]): CostReport;
/**
* The pure journal fold: the complete CostReport from terminal entries,
* the same summation the kernel ledger uses (each terminal entry's
* usage enters the sum once, priced per servedBy slice, abandoned
* subtrees contribute zero).
* The orchestrator block folds too: spend attributed to the
* orchestrator sub-account, the reserve-funded share of it, the armed
* wake count, and the at-cap freeze flag from the journaled cap
* decision, so a replay-only resume reproduces the block instead of
* reading this process's live accounts (which a replay never charges).
*/
declare function costReportFromJournal(entries: readonly JournalEntry[], priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined): CostReport;
/**
* The per-account settled fold (RV1505, closing the DEF-7 remainder):
* each budget account's INCLUSIVE spend from the same entries, skips,
* and per-request pricing the net CostReport folds, with the account
* tree read from the journaled spawn-admission decisions
* (childScope -> parentAccountScope). A scope with no journaled edge
* folds under the root, which is where its spend already lands. Two
* consumers: hosts and audits hold any account's accumulated spend
* against its cap after the fact, and the engine seeds these rows
* into every re-opened account on resume (RunBudget seed.accounts),
* so a resumed segment admits against the same history a continuous
* run would have accumulated; the seed is safe for continuations
* because reruns of journaled invocations re-admit as recovered
* rather than re-clearing projected admission. Unpriced slices
* contribute zero, exactly like the net total, and an admission-edge
* cycle (a corrupt journal) terminates the walk instead of spinning.
*/
declare function accountSpendFromJournal(entries: readonly JournalEntry[], priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined): Record<string, number>;
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
/** Full contract: https://docs.rulvar.com/guide/observability. */
interface CostReport {
  /**
  * Where every dollar of this report comes from (RV1413): journaled
  * usage priced at the CALLER'S pricing table (declared rates or
  * adapter caps), never a provider statement. Always
  * `'locally-estimated'` today, declared as a literal so finance
  * tooling never has to guess, mirroring `InvoiceExport.pricingBasis`;
  * reconcile real bills through the invoice export and
  * `reconcileStatement`, which carry their own provenance.
  */
  basis: "locally-estimated";
  /**
  * The NET ledger: priced terminal usage with abandoned subtrees
  * contributing zero (their spend is a sunk cost of branches the
  * orchestrator discarded, not of the work the run kept). The
  * provider still billed them: reconcile invoices against `grossUsd`,
  * never this.
  */
  totalUsd: number;
  /**
  * The gross/net split (P1.3): totalUsd + abandoned.usd, every priced
  * terminal slice with abandonment included. This is the immutable
  * provider-spend figure an invoice reconciles against; abandoning a
  * branch never shrinks it.
  */
  grossUsd: number;
  /**
  * Provider wire requests recorded by the per-dispatch ledger
  * (RV1904): the sum of every settled entry's providerCalls, each
  * record counting its absorbed continuations (`wireRequests`, RV905)
  * and one otherwise, abandoned subtrees included, because their
  * attempts hit the wire all the same. On ledger-covered runs this
  * equals the invoice cardinality's `wireRequests`, the recovery
  * benchmark's 55, so the terminal and the invoice finally share one
  * denominator; pre-ledger slices carry no record and surface in the
  * invoice as unattributed rows instead. Set by the journal fold;
  * absent from a live `buildCostReport` accumulation that did not
  * count wires.
  */
  wireRequests?: number;
  /**
  * Priced spend under abandoned subtrees, exactly the part totalUsd
  * excludes. `unpriced` here surfaces abandoned slices with no price
  * row (the top-level `unpriced` lists only slices contributing to
  * totalUsd), and `usageApprox` follows the same semantics as the
  * top-level flag over the abandoned entries; grossUsd is an estimate
  * whenever either flag is raised.
  */
  abandoned: {
    usd: number;
    unpriced: Array<{
      model: string;
      usage: Usage;
    }>;
    usageApprox?: boolean;
  };
  /** Keyed by canonical ModelRef 'adapterId:model'. */
  byModel: Record<string, number>;
  /**
  * ctx.phase names; phase is structural for this map. Spend with no
  * phase, or an EMPTY phase, folds under the named 'unknown' bucket
  * (RV3604): a '' key is unaddressable in every downstream table,
  * and the third comparison run's report read `byPhase {"": 5.58}`
  * for the whole run. In dynamic runs the orchestrator's own stages
  * name their dispatches since RV3905 ('fan-out' children,
  * 'coordination' loop turns and the forced-finish wake,
  * 'composition' synthesis and incremental notes, 'judge' claim
  * passes, 'repair' the bounded claim repair round), filling only
  * the vacuum: an explicit host ctx.phase around the orchestration
  * keeps its own bucket. The fourth comparison run's report read
  * byPhase 100% 'unknown' over stages the journal held apart. The
  * 'repair' bucket additionally receives the granted mechanical
  * repair turns' own wires (RV4002): the call that immediately
  * follows a rejected terminal-tool exchange carries a wire-level
  * override, so a draft or composition repair's money no longer
  * drowns in its hosting dispatch's bucket (the fifth comparison
  * run's one draft repair wire read 'coordination').
  */
  byPhase: Record<string, number>;
  /**
  * Spawn agentType names; absent and empty fold under 'unknown'
  * (RV3604). Since RV4206 the vacuum is FILLED by pure derivation
  * from recorded facts (`agentTypeBucket` over agentType, role, and
  * dispatch label, the RV3905 phase precedent): the orchestrator's
  * own dispatches read 'orchestrator' (the coordination loop and the
  * forced-finish wake), 'synthesizer' (compositions and incremental
  * notes), 'claim-judge', and 'citation-judge'; a spawned profile
  * always keeps its own name, no journal byte changes, and archived
  * journals fold to the named rows retroactively. The sixth
  * comparison run's report read this table 100% 'unknown' over a run
  * whose every dispatch had a nameable stage.
  */
  byAgentType: Record<string, number>;
  byRole: Record<InvocationRole, number>;
  /**
  * Spend per journal scope (RV3805): the root and every child are
  * addressable rows whose sum equals `totalUsd`, so the children
  * versus whole-workflow cut (the third comparison analysis had to
  * hand-aggregate it from invoice rows) reads off the report
  * directly. The root's OWN scope is the empty string BY
  * CONSTRUCTION, present data rather than an absence, so it folds
  * under the named 'root' bucket; children keep their scope strings
  * verbatim, and only a truly absent scope folds under 'unknown',
  * the RV3604 fallback.
  */
  byScope: Record<string, number>;
  /**
  * All-zero with forcedFinish false in runs without a dynamic
  * orchestrator (or when no cap resolved, so no sub-account opened).
  * Folded purely from the journal: spentUsd is the priced usage of
  * entries debited to the orchestrator sub-account, reserveUsedUsd its
  * reserve-funded forced-finish share, wakes the ARMED (journaled)
  * wake suspensions (a wait satisfied synchronously never suspends and
  * is not counted), and forcedFinish the journaled at-cap decision.
  */
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
  /**
  * Present and true when any terminal entry folded into totalUsd carried
  * approximate usage (a transport cut, a stream the ceiling severed, or
  * an abort estimated the turn instead of the provider reporting it), so
  * totalUsd is a lower bound estimate, never an exact charge. Absent
  * means every contributing entry reported exact usage. The field the
  * v1.39.0 review asked the report to raise so approximate cost is never
  * shown as though it were the provider invoice.
  */
  usageApprox?: boolean;
}
/**
* One row of the acceptance fold's per-child roster (RV806): the
* settled status, the salvage arm that would have accepted the child
* (absent when none applied), and the evidence verdict where the child
* declared an evidence contract. `waivedBySalvage: true` marks a child
* whose evidence floor was NOT met but which a salvage arm accepted
* anyway; gate on it where waived evidence must not pass silently.
* `floorRequired: true` marks the opposite verdict under
* `acceptance.requireEvidenceFloor` (RV1207): the arm applied, the
* floor was not met, and the child was NOT promoted, so the row is
* diagnostic and the child counted against the policy. Since RV1412 an
* OK row can carry `floorRequired` too: the child settled 'ok' below
* its declared floor and the same flag excluded it from the policy
* count (without the flag such a row keeps `met: false` unmarked, and
* the child rides `belowFloorOkChildren` with a degradation note).
*/
/**
* One semantic pass's explicit summary (RV1906): `ran: true` means the
* pass executed (its findings and meta fields carry the details);
* `ran: false` names WHY in `reason` ('not-configured', 'run-rejected',
* 'valid-draft', 'not-run'), so an absent findings field can never be
* read as a clean pass. The four-role benchmark's artifacts carried
* `contradictions: null` and `claimConsistencyMeta: null`, and the
* judge had to annotate by hand that null meant NOT RUN.
*/
interface SemanticPassSummary {
  ran: boolean;
  reason?: string;
}
/** The three semantic passes' explicit summaries (RV1906). */
interface SemanticPassesSummary {
  contradictions: SemanticPassSummary;
  claimConsistency: SemanticPassSummary;
  synthesis: SemanticPassSummary;
}
/**
* One finish candidate the declared contract did NOT accept (RV2507).
* The 1.226.0 comparison run rejected three syntheses; nothing on its
* terminal said so, nothing said whether the three differed from each
* other, and the only way to read them was an external script that
* re-parsed the whole agent transcript. The row is the artifact that
* dig produced, made first class.
*
* `hash` is the sha256 over the canonical candidate: two rows with the
* same hash are the model serving the same document twice, which is a
* different failure from three genuine attempts and used to be
* invisible. `ref` is present exactly under
* `finishValidation.retainRejectedCandidates`, and points at a
* transcript blob holding the candidate verbatim; without it the row
* still identifies and sizes what was rejected, and names the
* validators that did it.
*/
interface RejectedFinishCandidate {
  /** The finish tool call this candidate arrived on. */
  callId: string;
  /** `'repair'` when another turn was granted, `'rejected'` when this was the last. */
  verdict: "repair" | "rejected";
  /** sha256 over the canonical candidate; identity, not location. */
  hash: string;
  /** The candidate's length in characters, honest whether or not the bytes were retained. */
  chars: number;
  /** Each validator that rejected it, with its reasons: the diff. */
  failed: {
    name: string;
    reasons: string[];
  }[];
  /** Transcript ref holding the bytes; absent unless retention is on and the write succeeded. */
  ref?: string;
  /**
  * Why the bytes are not retained (RV4207), when the run declared a
  * `candidatePersistence`: 'hash-only-persistence' is the policy
  * saying so on purpose, 'store-write-failed' a declared retention
  * the store refused. Absent on undeclared configs, whose rows keep
  * their exact bytes.
  */
  bytesUnavailableReason?: "hash-only-persistence" | "store-write-failed";
}
/**
* The roster facts of a run that died before any acceptance verdict
* (RV2602): a fold over the children's own journaled terminals, so an
* `exhausted` or failed orchestration still names the work it paid for.
*/
interface ChildrenAtFailure {
  /** Children admitted, whether or not they settled. */
  spawned: number;
  /** Of those, the ones carrying a terminal at the moment of death. */
  settled: number;
  /** Their statuses, counted; the same vocabulary a child terminal uses. */
  statusCounts: Record<string, number>;
  /**
  * Children that settled `ok` under a declared evidence contract they
  * did not meet. The acceptance fold names these too, but only after
  * it runs: the fourth parity run's silent worker was `ok` with zero
  * recorded entries and its run never reached acceptance at all.
  */
  belowFloorOkChildren?: string[];
  /** Children still running when the run gave up; absent when none were. */
  unsettled?: string[];
}
interface AcceptanceChildSummary {
  child: string;
  status: string;
  /**
  * The child's own typed death reason (RV4703), from its settled
  * terminal: present exactly when the child settled carrying an
  * error. The eighth comparison experiment's first run rejected on
  * "child settled 'error'" while the child's terminal named the
  * budget-refused finalize dispatch; the roster is machine readable,
  * so the reason is too. The message is bounded to 200 characters;
  * `stage` names the dispatch a budget refusal killed, when the loop
  * stamped one.
  */
  error?: {
    kind: string;
    stage?: string;
    message?: string;
  };
  salvage?: "partial" | "terminal-output";
  evidence?: {
    recordedEntries: number;
    minEntries: number;
    met: boolean;
    waivedBySalvage?: true;
    floorRequired?: true;
  };
}
type RunOutcome<R> = {
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  value?: R;
  error?: WireError;
  /**
  * The semantic completion lift, mirrored from `run:end` (RV-207 tail;
  * the 1.65.0 experiment review, P0.5): present when the workflow
  * reported semantic completion through the completion envelope
  * contract, an `ok`/`exhausted` run whose result value is an object
  * carrying a valid `completion` literal, or an `error` run whose typed
  * error data carries one (the orchestrator acceptance path emits
  * both). Transport status says whether the run ran; completion says
  * whether the work is COMPLETE: an accepted degraded run is `status:
  * 'ok'` with `completion: 'partial'`. The engine computes the lift
  * ONCE and both surfaces spread the same object, so the outcome and
  * the event can never disagree; a host reads completeness here
  * without parsing workflow-specific value shapes on the accepted path
  * or digging typed error data on the rejected one. Absent when the
  * workflow makes no completion claim.
  */
  completion?: "complete" | "partial" | "rejected";
  /**
  * Settled child statuses by status name, lifted from the same
  * envelope (or typed error data) when it carries a valid record of
  * nonnegative integers; the mirror of the `run:end` field. Absent
  * otherwise.
  */
  childStatusCounts?: Record<string, number>;
  /**
  * Per-child degradation notes, lifted from the same envelope (or
  * typed error data) when it carries a valid string array (the fifth
  * experiment, cycle 75): the facts the orchestrator acceptance path
  * has always emitted beside completion, now on the outcome itself so
  * a host stops digging error.data on the rejected path. An empty
  * array is the workflow's claim of zero degradation; absence means no
  * claim was made.
  */
  degradedReasons?: string[]; /** Children accepted by acceptPartialChildren; same lift and posture. */
  salvagedPartialChildren?: string[]; /** The explicit semantic pass summaries (RV1906); same lift and posture. */
  semanticPasses?: SemanticPassesSummary;
  /**
  * The claim-consistency pass meta (`judgeInvoked`, `judgeDeclined`,
  * the pair counts), lifted from the same envelope or typed error
  * data (RV2203). The RV2106 mirror run journaled its declined judge
  * and the error terminal carried null: the truth now rides every
  * terminal that has it, ok and failed alike.
  */
  claimConsistencyMeta?: Record<string, unknown>;
  /**
  * The citation audit meta (`sampled`, `supported`, `partial`,
  * `unsupported`, `auditedHash`, the per-section split), lifted from
  * the same envelope or typed error data as the claim meta beside it
  * (RV4403). The seventh comparison run failed typed with the audit
  * meta only inside `error.data`, and no outcome, settle or restart
  * surface carried the one count the failure was ABOUT. Same lift
  * and posture as `claimConsistencyMeta`.
  */
  citationAuditMeta?: Record<string, unknown>;
  /**
  * The one-word semantic verdict (RV4209), lifted from the same
  * envelope or typed error data as the meta beside it: 'clean',
  * 'findings', 'partial', 'vacuous', 'waived', or 'not-judged', with
  * the counts and the waiver it was folded from
  * (SemanticTerminalVerdict). One derivation at the orchestrator
  * chokepoint instead of every consumer re-deriving the verdict from
  * four fields; `productionAcceptable` is the exported gate over it.
  * Absent when no claim or citation machinery was configured, and on
  * every run recorded before it shipped.
  */
  semanticTerminalVerdict?: Record<string, unknown>;
  /**
  * The judged contradictions themselves (RV3601), lifted from the
  * same envelope or typed error data as the meta beside them. RV3304
  * deliberately kept the details off this surface and let the meta's
  * `findings` count stand in; the 2026-08-13 comparison run then
  * failed typed with the findings buried in `error.data` while the
  * outcome's top level read null beside a null meta, so the details
  * now ride wherever the meta rides (this outcome, the journaled
  * settle, `run:end`), the compact terminal envelope alone keeping
  * the meta only. `[]` is the judge's claim of a clean document;
  * absence means nothing was judged (RV1209).
  */
  claimContradictions?: Record<string, unknown>[]; /** The synthesis-skip marker from the same envelope; same lift and posture (RV2203). */
  synthesisSkipped?: boolean | string;
  /**
  * Whether the artifact THIS terminal carries was accepted by the
  * declared finish contract (RV2506), lifted from the same envelope or
  * typed error data. The one question `status` and `completion` cannot
  * answer between them: the 1.226.0 comparison run accepted its
  * children (`completion: 'complete'` was earned by the acceptance
  * policy over child statuses), then failed its synthesis against the
  * contract three times and settled carrying nothing the contract ever
  * accepted, and the scoring harness read `status: 'ok'` and could not
  * tell. Absent, NEVER false, when no `finishValidation` was declared:
  * nothing judged anything, and absence means NOT RECORDED (RV1209).
  * False means a contract was declared and the artifact here did not
  * pass it, including the case where nothing was ever judged because
  * the run died first.
  */
  deliverableAccepted?: boolean;
  /**
  * Whether this terminal carries a deliverable to read at all
  * (RV2506); same lift and posture. False on every enriched failure
  * (an `error` outcome carries no value by construction) and on an
  * accepted run whose synthesis resolved to null. Distinct from
  * `deliverableAccepted`: an unjudged artifact still EXISTS, and a run
  * with no artifact still has a completion claim.
  */
  resultAvailable?: boolean;
  /**
  * The journal seq of the decision entry that records the acceptance
  * of the artifact this terminal carries (RV2506); same lift and
  * posture, absent whenever `deliverableAccepted` is not true. Three
  * different entries answer to it, which is the point of having one
  * field: the accepted `orchestrator_finish_validation` decision on
  * the ordinary path, the `orchestrator_synthesis_skip` decision when
  * the RV510 gate settled on a valid draft, and the
  * `orchestrator_synthesis_regressed` decision when the RV2505 floor
  * handed a failing synthesis back to its draft. Read it with
  * `rulvar inspect` (or any journal reader) to see WHICH validators
  * rendered the acceptance and over WHICH draft hash.
  */
  acceptedArtifactRef?: number;
  /**
  * Every finish candidate the declared contract did NOT accept, in the
  * order they were judged (RV2507); same lift and posture. Present
  * only when there was at least one, so a run that passed first try
  * keeps its exact terminal. It rides the ok terminal as well as the
  * failed one: a run that recovered on its second attempt still owes a
  * post-mortem the first, and the comparison analysis that had to
  * reconstruct three rejected syntheses from a transcript is the
  * reason the field exists.
  */
  rejectedFinishCandidates?: RejectedFinishCandidate[];
  /**
  * Children accepted through validated terminal output salvage on
  * 'limit'; same lift and posture.
  */
  salvagedTerminalOutputChildren?: string[];
  /**
  * Children that settled 'ok' below their declared evidence floor
  * (RV1412); same lift and posture. A fact list in both modes: under
  * the default their shortfall is a degradation note and the verdict
  * is untouched; under `acceptance.requireEvidenceFloor` they also
  * counted against the policy.
  */
  belowFloorOkChildren?: string[];
  /**
  * The per-child machine roster of the acceptance fold (RV806), lifted
  * from the same envelope (or typed error data) under the same
  * posture: each spawned child with its settled status, the salvage
  * arm that accepted it (when one did), and the evidence verdict where
  * the child declared an evidence contract, `waivedBySalvage` marking
  * a below-floor child a salvage arm accepted anyway. The twelfth
  * comparison run accepted two below-floor children through salvage
  * and the outcome showed it only as name lists; this is the machine
  * verdict. Replay-stable: the roster is journaled inside the single
  * acceptance decision.
  */
  acceptanceChildren?: AcceptanceChildSummary[];
  /**
  * What the children had produced when the run died BEFORE its
  * acceptance policy ever rendered a verdict (RV2602).
  *
  * Every other field on this envelope describes a policy's claim, and
  * a policy that never ran claims nothing: an orchestration whose
  * coordination loop crosses its ceiling mid-roster settles with
  * `completion` absent, and until this shipped the terminal said
  * nothing at all about work that was already paid for, even though
  * every child terminal was in the journal. Deliberately NOT
  * `childStatusCounts`: that field is the acceptance fold's number,
  * and a fold done by no policy must not borrow its name.
  *
  * Present exactly when children were spawned AND no acceptance
  * verdict exists, so the two readings never overlap and neither can
  * be mistaken for the other. Frozen at the moment of death, before
  * the RV1903 exit barrier settles the stragglers, which is why
  * `unsettled` can be non-empty: those children had not landed when
  * the run gave up.
  */
  childrenAtFailure?: ChildrenAtFailure; /** Pipeline drops and onError:'null' losses; silent losses are forbidden. */
  dropped: DroppedItem[]; /** Suspensions open at settle time (M2). */
  pending: PendingExternal[];
  usage: Usage;
  cost: CostReport;
  /**
  * The unified terminal envelope (RV1105): every terminal fact in ONE
  * shape, assembled once at the settlement chokepoint and shared with
  * the `run:end` event, so the SDK and the event stream can never
  * disagree. A RESOLVED outcome always carries `settled: true` inside
  * it: an unsettled terminal rejects `handle.result` typed instead of
  * resolving (RV907, RV1009), and its refusing envelope rides the
  * event alone.
  */
  envelope: TerminalEnvelope;
};
/** Adds 'running' for in-flight inspection. */
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
  /**
  * Revokes a tool approval (RV4008): a still-open approval is denied
  * through the ordinary arbitration, and a RECORDED allow gains a
  * journaled `approval_revoked` decision that beats it at the
  * consumption recheck, so an allow granted, crashed over, and
  * revoked never dispatches its tool on resume.
  */
  revokeApproval(key: string, options: {
    principal: string;
    reason: string;
  }): Promise<ApprovalRevocationOutcome>;
  /** Cooperative cancellation; the run settles 'cancelled' with a complete CostReport. */
  cancel(reason?: string): Promise<void>;
}
//#endregion
//#region src/engine/terminal-envelope.d.ts
/** The outcome facts the assembler reads; a structural subset of RunOutcome. */
type TerminalOutcomeFacts = Pick<RunOutcome<unknown>, "status" | "error" | "completion" | "deliverableAccepted" | "resultAvailable" | "acceptedArtifactRef" | "claimConsistencyMeta" | "citationAuditMeta" | "semanticTerminalVerdict"> & {
  usage: RunOutcome<unknown>["usage"];
  cost: Pick<RunOutcome<unknown>["cost"], "totalUsd" | "grossUsd" | "byModel"> & {
    usageApprox?: boolean;
    wireRequests?: number;
  };
};
/**
* Assembles one terminal envelope (RV1105). `settlement` present means
* nothing durable records the terminal: `settled` reads false, and the
* optional `settledReason: 'superseded'` names the fenced-out segment
* (RV1009); absent means the settle held and `settled` reads true. The
* per-model split is detached, so a consumer mutating the envelope
* never reaches back into the cost report.
*
* `provenance: 'journal'` marks a copy rebuilt from the journal after
* the run left its process (RV1209). It is the same producer on
* purpose: a persisted reader must not assemble a second, subtly
* different shape, which is the whole point of the arc.
*/
declare function terminalEnvelopeOf(input: {
  runId: string;
  workflow: string;
  outcome: TerminalOutcomeFacts;
  agentsSpawned: number;
  settlement?: {
    settledReason?: "superseded";
  };
  provenance?: "journal"; /** The run's declared config identity (RV3210), echoed onto the envelope (RV3304). */
  configFingerprint?: string;
}): TerminalEnvelope;
//#endregion
//#region src/l0/decision-chain.d.ts
/** The authority-bearing kinds the chain folds, in the registry's order. */
declare const DECISION_CHAIN_KINDS: readonly EntryKind[];
/** One authority record of the chain, seq-ordered. */
interface DecisionChainRow {
  seq: number;
  kind: EntryKind;
  scope: string;
  key: string;
  status: EntryStatus;
  /** Present when the journaled value names its decision type. */
  decisionType?: string;
  /** Present on resolutions: who resolved (canonical `entry.resolution.by` first). */
  by?: ResolutionBy;
  /** Present on resolutions and abandons: the referenced seq. */
  target?: number;
  /** Present on abandons: the seq of the sanctioning entry (canonical `entry.abandon`). */
  authorizedBy?: number;
  /** Present on class-decision resolutions: the class decision's seq. */
  decisionRef?: number;
  /**
  * The journaled value verbatim when the entry carries one; on a
  * canonical resolution with no entry value, the resolution's own
  * decision value (what the ask was resolved WITH).
  */
  value?: Json;
}
/**
* Folds a run's entries into its decision chain: the seq-ordered
* authority records only. Input order is not trusted; rows sort by seq
* ascending, the journal's own total order.
*/
declare function reduceDecisionChain(entries: readonly JournalEntry[]): DecisionChainRow[];
//#endregion
//#region src/knowledge/decay.d.ts
/**
* The asymmetric TTL table:
* a false negative is costlier through lock-in, so weaknesses expire
* sooner than strengths.
*/
declare const CLAIM_TTL_DAYS: {
  readonly "eval-measured": {
    readonly strength: 90;
    readonly weakness: 30;
  };
  readonly "human-editorial": {
    readonly strength: 120;
    readonly weakness: 45;
  };
};
/** Inbox proposals expire after 14 days (reserved for M12 phase 3). */
declare const INBOX_PROPOSAL_TTL_DAYS = 14;
/** The asymmetric TTL applied to an observedAt ISO date. */
declare function claimExpiry(claimClass: ModelClaim["class"], polarity: ModelClaim["polarity"], observedAt: string): string;
/** True when the claim steers nothing at `at` (the read-path filter). */
declare function claimExpired(claim: Pick<ModelClaim, "expiresAt">, at: string): boolean;
/** The TTL state a maintenance view renders per claim. */
type TtlState = "holds" | "expired";
declare function ttlState(claim: Pick<ModelClaim, "expiresAt">, at: string): TtlState;
/**
* The re-measurement queue:
* expired eval-measured claims that are still ACTIVE. Just a status
* filter: the next sweep re-measures these subjects; nothing archives
* them (archiving would empty the queue and hide the decay).
*/
declare function remeasureQueue(claims: readonly ModelClaim[], at: string): ModelClaim[];
/**
* Deprecation maintenance (deprecations archive claims, never delete
* them, so historical runs keep their audit trail): archive ops for
* every non-terminal claim of the deprecated
* models. The caller commits them under its own gate-free archive ops.
*/
declare function archiveDeprecatedModelOps(claims: readonly ModelClaim[], deprecated: readonly ModelRef[]): ClaimOp[];
//#endregion
//#region src/knowledge/claims.d.ts
/**
* The typed statement template for a proposal-born claim (phase 3):
* assembled over the closed enum vocabulary ONLY, so tool-output text
* is unquotable into persistence, and model-free, because a claim
* statement renders into the knowledge card's notes layer, which never
* leaks model names to the orchestrator.
*/
declare function proposalStatement(proposal: Pick<KbProposal, "taskClass" | "polarity" | "trigger">): string;
/** Appendix A: KB active-claims cap, default 8 per (model, taskClass). */
declare const KB_ACTIVE_CLAIMS_CAP = 8;
/** The committed data model bound: statement <= 200 chars. */
declare const CLAIM_STATEMENT_MAX_CHARS = 200;
interface ClaimValidationOptions {
  /**
  * True on the eval-committer path (the eval-committer gate).
  * Editorial validation leaves it false and both eval-measured
  * claims and metrics reject. At the op level the GATE decides this
  * flag; the option exists for direct claim-level validation.
  */
  evalCommitter?: boolean;
}
/** Issues of one claim record (empty = valid). */
declare function claimIssues(claim: ModelClaim, path: string, options?: ClaimValidationOptions): string[];
/**
* Issues of one op (empty = valid). GATE-DRIVEN (M11-T01): the gate on
* the op decides which claim rules apply, so the identity is enforced
* by shape alone. Referential integrity stays with apply.
*/
declare function claimOpIssues(op: ClaimOp, index: number): string[];
/**
* The commit-time cap (Appendix A): active claims per
* (model, taskClass) after the batch applies. Supersede chains keep
* only the head active by construction (applyClaimOps flips the prior
* to 'superseded'), so a supersede never grows the count.
*/
declare function capIssues(claims: readonly ModelClaim[], cap?: number): string[];
/**
* The commit-batch validation: op shapes and gates first (GATE-DRIVEN
* since M11-T01: the human gate carries editorial claims, the
* eval-committer gate carries eval-measured claims with metrics), the
* post-apply cap second. Throws one ConfigError carrying every issue,
* so a maintenance caller fixes the batch in one round trip.
*/
declare function validateEditorialCommit(ops: readonly ClaimOp[], claimsAfter: readonly ModelClaim[], options?: ClaimValidationOptions & {
  cap?: number;
}): void;
//#endregion
//#region src/knowledge/epoch.d.ts
/** Deterministic hash of a caps declaration (JCS + sha256). */
declare function capsHashOf(caps: ModelCaps): string;
interface ModelEpochInputs {
  /** Profile-registry snapshot hash or any registry version marker. */
  registryVersion?: string;
  /** The configured PriceTable's pricingVersion. */
  pricingVersion?: string;
  /** The adapter's caps declaration for the subject model. */
  caps?: ModelCaps;
  /** The @rulvar/evals canary fingerprint, when probes ran. */
  canaryFingerprint?: string;
}
/** Builds the optional modelEpoch block; empty inputs give undefined. */
declare function modelEpochOf(inputs: ModelEpochInputs): ModelClaim["modelEpoch"];
//#endregion
//#region src/knowledge/file-store.d.ts
/** Deterministic content hash of the claims array (JCS + sha256). */
declare function knowledgeHash(claims: readonly ModelClaim[]): string;
/**
* Applies one op batch to a claims array, mechanically (M10-T01). The
* editorial validators (attestation, caps, statement bounds) layer on
* top in M10-T02; referential integrity is enforced here because a
* dangling supersede or archive would corrupt the append-only chain.
*/
declare function applyClaimOps(claims: readonly ModelClaim[], ops: readonly ClaimOp[]): ModelClaim[];
interface FileModelKnowledgeStoreOptions {
  /** Default './rulvar.models.json'. */
  path?: string;
  /**
  * Active claims per (model, taskClass); default 8. A nonnegative
  * integer (zero refuses every active claim), validated at
  * construction: the enforcement compares `count > cap`, and every
  * comparison with NaN is false, so an unvalidated NaN or Infinity
  * silently disabled the cap (v1.35.0 review P2-5).
  */
  activeClaimsCap?: number;
}
declare class FileModelKnowledgeStore implements ModelKnowledgeStore {
  private readonly path;
  private readonly activeClaimsCap;
  /** In-process commit serialization; cross-process safety is CAS plus atomic rename. */
  private queue;
  constructor(options?: FileModelKnowledgeStoreOptions);
  private read;
  current(): Promise<KnowledgeSnapshot>;
  commit(ops: ClaimOp[], expectedVersion: number): Promise<number>;
}
//#endregion
//#region src/knowledge/card.d.ts
/** The KB card render budget (characters). */
declare const KB_CARD_RENDER_BUDGET_CHARS = 4096;
/** One declared ladder of the run, named by its agentType. */
interface DeclaredLadder {
  name: string;
  startTier: number;
  rungs: Array<{
    model: ModelRef;
    effort?: Effort;
  }>;
}
/**
* The ladders a run declares: every advertised profile whose model
* spec is a ladder. The card is tier-relative to
* exactly these.
*/
declare function collectDeclaredLadders(profiles: Record<string, AgentProfile> | undefined): DeclaredLadder[];
/**
* The admission filter: status active, unexpired at
* `now`, and the subject reachable through the run's declared ladders
* after the role-floor filter.
*/
declare function filterClaimsForRun(claims: readonly ModelClaim[], options: {
  ladders: readonly DeclaredLadder[];
  floors?: QualityFloors;
  now: string;
}): ModelClaim[];
/** One compiled start-tier recommendation of the verified layer. */
interface VerifiedRecommendation {
  ladder: string;
  taskClass: TaskClass;
  defaultTier: number;
  recommendedTier: number;
  votes: number;
}
/**
* The verified-layer compiler (M11-T06): start-tier recommendations
* per (ladder, taskClass) compiled EXCLUSIVELY from eval-measured
* claims. A strength on a rung below the default votes down (start
* cheaper); a weakness on the default rung or below votes up. The net
* sign shifts EXACTLY one rung, bounded to the ladder (the clamp: the
* price of any false belief is one rung); ties hold the default and
* compile nothing. Editorial claims NEVER compile. Floors and
* ModelCaps stay hard router constraints; budget is touched only
* through the existing admission path. A deterministic pure function:
* the M12 consumers read THIS, never the card text.
*/
declare function compileVerifiedLayer(claims: readonly ModelClaim[], ladders: readonly DeclaredLadder[]): VerifiedRecommendation[];
/**
* The deterministic card render. Pure: same filtered
* claims and ladders give byte-identical text. The render budget is
* 4096 chars by default; over it, the OLDEST-observed notes withhold
* first behind an explicit marker, and the budget is a HARD upper bound
* of the returned string: a card whose mandatory sections alone exceed
* it is truncated with the shared marker (v1.35.0 review P2-5: a budget
* of 32 used to return the full 136-char header form). budgetChars is a
* nonnegative integer, validated as a ConfigError.
*/
declare function modelKnowledgeCard(claims: readonly ModelClaim[], ladders: readonly DeclaredLadder[], options?: {
  budgetChars?: number;
  profiles?: Record<string, AgentProfile>;
}): string;
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
* Argv-parsing shell matcher (M5-T06): shell
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
* Lexes a command into segments per the matching algorithm above. Quotes
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
/** First-party provider tool-name constraint intersection. */
declare const TOOL_NAME_PATTERN: RegExp;
interface ToolInit<S extends SchemaSpec> {
  name: string;
  description: string;
  parameters: S;
  /** Contract version, part of toolsetHash. */
  version?: string;
  /** Default 'inprocess'. */
  executor?: ToolExecutor;
  /** Opaque data for a non-inprocess executor (RV-216); never identity. */
  executorSpec?: Json;
  /** Default false. */
  needsApproval?: boolean;
  /** Policy metadata; never identity. */
  risk?: ToolRisk;
  execute: (input: Out<S>, ctx: ToolContext) => Promise<unknown>;
}
/**
* Defines a tool. Definition-time failures are typed ConfigErrors, never
* first-call surprises: an illegal name, a Standard Schema without the
* JSON Schema projection, a recursive local $ref, or a remote/dynamic
* reference all fail here.
*/
declare function tool<S extends SchemaSpec>(init: ToolInit<S>): ToolDef<S>;
/**
* The identity projection: the contract tuple that enters toolsetHash.
* parameters is the canonicalized derived JSON Schema.
*/
declare function toolContract(def: ToolDef): ToolContract;
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
  /** Namespaces imported names as `${prefix}_${name}`. */
  prefix?: string;
  /** true = every imported tool needsApproval; record form is per name. */
  approval?: boolean | Record<string, boolean>;
  /** Host-supplied risk labels for imported tools. */
  risk?: Record<string, ToolRisk>;
  /**
  * Cap on WIRE tools accepted from the tools/list sweep (RV1515),
  * checked after each page, PRE-filter: the sweep itself is the
  * resource being bounded, so allow/deny cannot admit past it. A
  * server that streams more refuses typed. Positive integer; absent =
  * unbounded (today's behavior).
  */
  maxTools?: number;
  /**
  * Cap on tools/list PAGES fetched in one sweep (RV1602): a server
  * paginating past it refuses typed, fail closed like maxTools (a
  * truncated import would silently admit a subset of the declared
  * surface). Bounds the sweep's WIRE CALL count where maxTools bounds
  * its volume: unique cursors over empty pages grow neither the tool
  * count nor any timeout (each page answers inside listMs), so only a
  * page bound stops them. Positive integer; absent = unbounded.
  * Independent of the unconditional cursor-echo cycle guard, which
  * needs no configuration.
  */
  maxPages?: number;
  /**
  * Per ADMITTED tool (allow/deny filter first): the UTF-8 byte length
  * of the serialized inputSchema plus outputSchema when present
  * (RV1515). An oversized tool refuses the resolution typed, naming
  * the tool and its measured bytes; deny the tool or raise the cap.
  * Positive integer; absent = unbounded.
  */
  maxSchemaBytes?: number;
  /**
  * Per-source latency bounds (RV1515). connectMs races the transport
  * handshake (on expiry the client, and for stdio its child, is
  * released and the refusal is typed). listMs and callMs ride the SDK
  * request timeout per tools/list page and per tools/call; without
  * them the SDK's own 60s default request timeout applies. A call
  * timeout surfaces as the tool's error result, never past policy.
  * discoveryMs (RV1808) is the WALL-CLOCK cap over one whole
  * tools/list sweep, all pages included: per-page listMs cannot bound
  * a server that answers every page promptly and paginates forever
  * with unique cursors under maxPages' radar only when maxPages is
  * set, and cannot bound a slow-but-under-listMs page crawl at all.
  * On expiry the sweep refuses typed. Each a positive finite number
  * of milliseconds.
  */
  timeouts?: {
    connectMs?: number;
    listMs?: number;
    callMs?: number;
    discoveryMs?: number;
  };
  /**
  * Demand the discovery bounds (RV1808): with `requireBounds: true`
  * the source refuses at construction unless maxTools, maxPages,
  * maxSchemaBytes, and timeouts.discoveryMs are ALL declared. The
  * production posture: an unbounded discovery sweep against a remote
  * registry is an availability decision someone should have made on
  * purpose, so the flag turns the four absences into one typed error
  * naming what is missing instead of four silent unboundeds.
  */
  requireBounds?: boolean;
  /**
  * streamable-http only (RV1516): headers injected into EVERY wire
  * request through a wrapped fetch. The hook form is awaited before
  * each send, so it IS the refresh point: rotate a token in the hook
  * and the next request carries it, with no reconnect and no
  * library-invented 401 retry (transport failures surface exactly as
  * before; the engine's RetryPolicy owns retries).
  */
  http?: {
    headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  };
  /**
  * What a listChanged notification means for THIS source (RV1516).
  * 'rekey' is the documented default: the session cache invalidates
  * and subsequently spawned agents import the changed list under a new
  * toolsetHash. 'refuse' fails closed instead: the notification
  * poisons the source, every later tools() call refuses typed, and
  * only close() (a deliberate host reset) clears it. In-flight spawn
  * snapshots are untouched either way. Composes with the toolset
  * attestation: refuse at the source vs refuse at the spawn.
  */
  drift?: "rekey" | "refuse";
}
/**
* The ToolSource returned by {@link mcp}: the frozen ToolSource seam
* plus the lifecycle the seam deliberately leaves to the host.
* `close()` releases everything the source created on first use: the
* SDK client, its transport, and, for stdio, the spawned child
* process, without which a one shot host process cannot exit
* naturally after a run, because the child and its pipes keep the
* event loop alive (v1.33.0 review P2). It is idempotent, resolves
* even when the connection never succeeded, and resets the source, so
* a later `tools()` call connects afresh. The engine never closes a
* source, because one source may serve many runs: the host owns the
* lifecycle and should close once its runs have settled (closing
* while a run is in flight fails that run's MCP tool calls).
*/
interface McpToolSource extends ToolSource {
  close(): Promise<void>;
}
/**
* Imports MCP tools as a {@link McpToolSource}. The client connects
* lazily on the first tools() call; tools/list is fetched with cursor
* pagination until exhaustion and cached per session; a listChanged
* notification invalidates the cache, affecting subsequently spawned
* agents only (a spawn's toolset snapshot is immutable by
* construction). The host owns the source's lifecycle: `close()`
* releases the client, the transport, and the stdio child once the
* runs using the source have settled; a one shot host should close in
* a finally block, or its process never exits naturally (v1.33.0
* review P2).
*/
declare function mcp(cfg: McpConfig): McpToolSource;
//#endregion
//#region src/tools/isolation.d.ts
/** Appendix A: the shared pin cap (park/unpark and retainWorktree). */
declare const DEFAULT_MAX_PINNED_WORKTREES = 4;
interface GitWorktreeProviderOptions {
  /** Host repository root; default process.cwd(). */
  repoRoot?: string;
  /**
  * Retain the tree of a FAILED agent for inspection when the engine
  * requests keep on dispose. Default false.
  */
  keepOnError?: boolean;
  /**
  * Pin cap shared by park/unpark and retainWorktree (default 4). A
  * nonnegative integer (zero retains nothing), validated at
  * construction: the retention compares `pinned.size < cap`, and every
  * comparison with NaN is false, so an unvalidated NaN performed the
  * acquire effects and then dropped every tree as "cap reached"
  * (v1.35.0 review P2-5).
  */
  maxPinnedWorktrees?: number;
  /** Warning sink (cap overflow); defaults to process.emitWarning. */
  onWarn?: (msg: string) => void;
}
/**
* The shipped git worktree lifecycle. A non-git host is a typed
* ConfigError at acquire.
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
//#region src/tools/research.d.ts
interface RepositoryResearchToolsetOptions {
  /** The confining directory root; everything resolves under it. */
  root: string;
  /** Rows per list/search/evidence page; default 50. */
  pageSize?: number;
  /** Content budget of one read_file page in characters; default 4000. */
  readPageChars?: number;
  /** Files larger than this many bytes are refused; default 262144. */
  maxFileBytes?: number;
  /** Walk ceiling per call (files visited); default 20000. */
  maxScannedFiles?: number;
  /**
  * Extra ignored basenames (files and directories), merged over the
  * always-on defaults '.git' and 'node_modules'.
  */
  ignore?: string[];
  /** Walk dot-entries too; default false. */
  includeHidden?: boolean;
}
/** One verified evidence entry recorded by `record_evidence`. */
interface ResearchEvidenceEntry {
  claim: string;
  /** Root-relative POSIX path, verified to exist at record time. */
  file: string;
  /** 'N' or 'N-M', 1-based, verified inside the file's line count. */
  lines?: string;
  /** Verified verbatim substring of the file at record time. */
  quote?: string;
}
interface RepositoryResearchToolset {
  /** list_files, search_files, read_file, record_evidence, list_evidence. */
  tools: ToolDef[];
  /** Snapshot copy of the evidence collected so far, in record order. */
  evidence(): ResearchEvidenceEntry[];
}
declare function repositoryResearchToolset(options: RepositoryResearchToolsetOptions): RepositoryResearchToolset;
//#endregion
//#region src/engine/profile-templates.d.ts
/**
* The research template's stop conditions: a weighted unit budget over
* the research tools (bookkeeping tools are free), per-tool caps, both
* repetition guards, and soft budget notices. Exported so hosts and
* tests can read the exact defaults they are overriding.
*/
declare const RESEARCH_PROFILE_LIMITS: UsageLimits;
/** The implementation template's stop conditions. */
declare const IMPLEMENTATION_PROFILE_LIMITS: UsageLimits;
/** The review template's stop conditions. */
declare const REVIEW_PROFILE_LIMITS: UsageLimits;
/** Options shared by the implementation and review templates. */
interface AgentProfileTemplateOptions {
  /** Advertised profile description; the template provides a default. */
  description?: string;
  /** Per-key overrides over the template's limits. */
  limits?: UsageLimits;
  /** The task tools; the stock report_progress tool is always prepended. */
  tools?: ToolDef[];
}
/** Options of {@link researchAgentProfile}: the toolset knobs plus template overrides. */
interface ResearchAgentProfileOptions extends RepositoryResearchToolsetOptions {
  /** Advertised profile description; the template provides a default. */
  description?: string;
  /** Per-key overrides over {@link RESEARCH_PROFILE_LIMITS}. */
  limits?: UsageLimits;
  /** Extra tools appended after the research toolset. */
  extraTools?: ToolDef[];
  /**
  * The declared evidence floor of the task (RV303), passed through to
  * {@link AgentProfile.evidenceContract} so preflight can compare it
  * against the profile's tool budget and warn
  * `tool-cap-below-evidence-floor` before any paid call.
  */
  evidenceContract?: EvidenceContract;
}
/** What {@link researchAgentProfile} returns: the profile plus the evidence accessor. */
interface ResearchAgentProfileResult {
  profile: AgentProfile;
  /**
  * The research kit's host-side evidence snapshot. One kit instance
  * backs the profile, so children spawned from the SAME registered
  * profile pool their verified evidence here (and see each other's
  * entries through list_evidence); construct one template per fan-out
  * run, or per child, when isolation matters.
  */
  evidence: () => ResearchEvidenceEntry[];
}
/**
* The batteries-included research child: the confined
* {@link repositoryResearchToolset} over `root`, the stock
* report_progress tool, and {@link RESEARCH_PROFILE_LIMITS} as the stop
* conditions. A child spawned from this profile that runs out of budget
* settles 'limit' WITH its last progress report as the structured
* partial, and the recorded evidence stays readable host-side through
* `evidence()`.
*/
declare function researchAgentProfile(options: ResearchAgentProfileOptions): ResearchAgentProfileResult;
/**
* The implementation child template: the caller's task tools plus the
* progress contract, with {@link IMPLEMENTATION_PROFILE_LIMITS} as the
* stop conditions (a no-progress detector instead of the research
* no-new-evidence guard: implementation legitimately re-reads state).
*/
declare function implementationAgentProfile(options?: AgentProfileTemplateOptions): AgentProfile;
/**
* The review child template: the caller's task tools plus the progress
* contract, with {@link REVIEW_PROFILE_LIMITS} as the stop conditions
* (a tighter turn budget and the no-new-evidence guard: a reviewer
* circling over the same pages should stop, not spin).
*/
declare function reviewAgentProfile(options?: AgentProfileTemplateOptions): AgentProfile;
/** Options of {@link pilotAgentProfile}: the research template's, verbatim. */
type PilotAgentProfileOptions = ResearchAgentProfileOptions;
/** What {@link pilotAgentProfile} returns: the pinned profile plus its accessors. */
interface PilotAgentProfileResult extends ResearchAgentProfileResult {
  /**
  * The toolset pin the profile enforces at every spawn (RV1514): the
  * hash of the EXACT resolved toolset the factory built, per-tool
  * hashes included, so a drifted registration refuses typed before
  * any provider call. Returned so the host can persist or audit it.
  */
  attestation: ToolsetAttestation;
}
/**
* The read-only pilot preset (RV1606): the
* [production profiles guide](https://docs.rulvar.com/guide/production-profiles)'s
* controlled-pilot posture as ONE shipped factory instead of a page of
* assembly. Builds on {@link researchAgentProfile} (the confined
* read-only repository toolset, evidence recording, progress contract,
* stop conditions) and adds the fail-closed session posture the
* eighteenth comparison benchmark's improvement plan asked to ship:
*
* - the resolved toolset is ATTESTED (`toolsetAttestation`, RV1514):
*   any drift between this factory's toolset and what the spawn
*   resolves refuses typed, pre-wire, naming the changed tools;
* - permissions hard-deny every risk class except declared reads
*   (`write`, `network`, `execute`, `destructive`, and `undeclared`
*   all match one deny rule), `strictApprovals` is armed so a generic
*   allow can never clear a `needsApproval` tool, and
*   `inheritPermissions` stays false;
* - isolation is `'none'`: a read-only child needs no worktree, and
*   the profile never implies one.
*
* What it deliberately does NOT claim: the deny rules govern TOOL
* dispatch, not the process (a subprocess or worktree is an isolation
* convenience, never a security boundary; SECURITY.md), and no merge,
* deploy, or effect authority exists here to withhold. Async because
* the attestation pins the RESOLVED toolset.
*/
declare function pilotAgentProfile(options: PilotAgentProfileOptions): Promise<PilotAgentProfileResult>;
//#endregion
//#region src/engine/audit.d.ts
type AuditCategory = "suspension" | "resolution" | "abandon" | "decision" | "termination-denied" | "run-settle";
/** One reviewable authority event, in journal order. */
interface AuditRecord {
  /** The journal seq of the entry behind this record. */
  seq: number;
  /** The entry's startedAt timestamp. */
  at: string;
  scope: string;
  category: AuditCategory;
  /**
  * The finer type: the suspension kind ('external' | 'approval') for
  * suspensions, the journaled decisionType for decisions.
  */
  type?: string;
  /** Who acted: a ResolutionBy for resolutions, 'engine' for decisions. */
  by?: string;
  /** The seq of the entry this record acts on (resolution/abandon target). */
  target?: number;
  /** One deterministic reviewable line. */
  summary: string;
  /** The journaled payload, verbatim (plaintext through Engine.stores). */
  value?: Json;
}
/**
* Folds a loaded journal into the audit trail, in seq order. Pass the
* FULL entry list (`Engine.stores.journal.load(runId)` or
* `exportRun(runId).entries`); filtering is the reducer's job.
*/
declare function reduceAuditTrail(entries: readonly JournalEntry[]): AuditRecord[];
//#endregion
//#region src/journal/scope.d.ts
/**
* Scope-path grammar (M1-T04): deterministic structural paths, independent
* of wall-clock (invariant I3: structure comes from call-and-return only).
* The grammar is part of the hashVersion 2 profile.
*
* Full contract: https://docs.rulvar.com/guide/journal.
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
/** A parsed scope-path segment. */
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
//#region src/journal/kinds.d.ts
/**
* Validates the shape the engine is about to append. Returns issues;
* empty means valid. Unknown kinds are rejected here (the engine never
* writes them); stores still pass them through on read.
*/
declare function validateEntryShape(entry: JournalEntry): Issue$1[];
//#endregion
//#region src/effects/types.d.ts
/** Provider capability rows (RFC section 6); contract vocabulary. */
type EffectCapabilityRow = "idempotency-key" | "lookup" | "neither";
/**
* What earns a provider the `lookup` row (RFC section 6): either a
* negative that provably CLOSES acceptance, or a provider-enforced
* unique natural key on create. Recorded on the intent so recovery
* policy is derivable from the journal alone.
*/
type EffectLookupQualification = "acceptance-closing" | "conditional-create";
/** Effect classes (RFC section 3); compensation semantics differ. */
type EffectClass = "monetary" | "signing" | "case";
/** The five appendable terminal states (RFC section 4.6). */
type EffectTerminalState = "confirmed" | "quarantined" | "cancelled-before-dispatch" | "compensated" | "refused";
declare const EFFECT_TERMINAL_STATES: readonly EffectTerminalState[];
/**
* Recovery budgets recorded ON the intent (RFC section 3.1, item 2):
* every non-terminal state is bounded, and every exhaustion path lands
* in `quarantined`. `reconcileBy` is the overall deadline; crossing it
* in any non-terminal state quarantines with the state recorded.
*/
interface EffectBudgets {
  /** Dispatch attempts the intent may open, total. */
  attempts: number;
  /** Provider lookups, bounded separately from dispatch attempts. */
  lookups: number;
  /** How long `awaiting-receipt` may wait, in milliseconds. */
  receiptWaitMs: number;
  /**
  * How long a compensation may wait for its own authorization, in
  * milliseconds (RFC section 3.1, items 1 and 8); absent on effects
  * that are not compensations.
  */
  authorizationWaitMs?: number;
  /** ISO instant: the overall reconcile deadline of the intent. */
  reconcileBy: string;
}
/** The lane's decisionType discriminators, exactly. */
type EffectLaneDecisionType = "effect_epoch" | "effect_declared" | "effect_intent" | "effect_attempt" | "effect_outcome" | "effect_receipt" | "effect_terminal" | "effect_incident" | "effect_disposition" | "effect_probe" | "effect_reconciliation_complete";
declare const EFFECT_LANE_DECISION_TYPES: readonly EffectLaneDecisionType[];
/**
* The epoch fact (RFC section 4.5): before the first effect intent of a
* run incarnation the engine appends the run's generation token (from
* RunMeta.genesis, which is meta and invisible to a journal-only fold)
* and the store-level restoration generation when the store exposes
* one. Every intent cites the epoch entry by seq; an intent citing a
* non-latest epoch folds void.
*/
interface EffectEpochDecision {
  decisionType: "effect_epoch";
  opId: string;
  /** The run incarnation's generation token (RunMeta.genesis). */
  generation: string;
  /** The store's restoration generation at append time, when exposed. */
  restorationGeneration?: number;
}
/**
* The descriptive `declared` state (RFC section 3.1, item 1): the
* effect is described but not yet authorized; no provider interaction
* is legal. The bounded wait for authorization rides the licensing
* approval's own `deadlineAt` (refused at intake without one), so this
* record is descriptive, never load-bearing for consumption.
*/
interface EffectDeclaredDecision {
  decisionType: "effect_declared";
  opId: string;
  logicalKey: string;
  effectClass: EffectClass;
  capabilityRow: EffectCapabilityRow;
  argumentsHash: string;
  /** Monetary amount or document hash, per class; descriptive. */
  amountOrDocumentHash?: string;
}
/**
* The single linearization append (RFC section 4.3): consuming the
* approval and recording the intent is THIS one entry. Whether it
* consumed is a pure function of the strict journal prefix before it;
* the fold computes the verdict, and a void intent derives the
* `refused` terminal.
*/
interface EffectIntentDecision {
  decisionType: "effect_intent";
  opId: string;
  logicalKey: string;
  /** Seq of the approval suspension this intent consumes. */
  approvalRef: number;
  /** Seq of the `effect_epoch` decision this intent cites. */
  epochRef: number;
  effectClass: EffectClass;
  capabilityRow: EffectCapabilityRow;
  /** Required when capabilityRow is 'lookup' (RFC section 6). */
  lookupQualification?: EffectLookupQualification;
  argumentsHash: string;
  /** The accepted artifact's hash (RV4207); binds bytes to the effect. */
  artifactHash?: string;
  /** The terminal envelope's configFingerprint at admission. */
  configFingerprint?: string;
  budgets: EffectBudgets;
  /** Seq of the intent this one reverses (depth one, distinct key). */
  compensates?: number;
  /** Seq of the intent this one succeeds (corrections, distinct key). */
  successorOf?: number;
}
/**
* One dispatch attempt, appended BEFORE the network send (RFC section
* 3.1, item 3): at most one attempt may be open at a time, and attempts
* are sub-records of the ONE intent, never new intents.
*/
interface EffectAttemptDecision {
  decisionType: "effect_attempt";
  opId: string;
  intentRef: number;
  /** 1-based attempt order under the intent. */
  ordinal: number;
  /** The attempt's send deadline (defense in depth, never proof). */
  notAfter: string;
  /** The provider idempotency key, when the row carries one. */
  idempotencyKey?: string;
  transport?: string;
}
/** The classified result of one attempt. */
interface EffectOutcomeDecision {
  decisionType: "effect_outcome";
  opId: string;
  intentRef: number;
  attemptRef: number;
  /**
  * 'accepted': the provider took the request (receipt expected);
  * 'failed': a classified failure that provably did not execute;
  * 'unknown': unclassifiable from what the journal holds.
  */
  outcome: "accepted" | "failed" | "unknown";
  detail?: string;
}
/**
* A receipt observation, verified against the trust envelope BEFORE it
* is appended as 'verified' (RFC section 7): an unverifiable receipt
* appends as 'unverified' and routes the machine to `unknown`, never to
* `confirmed` and never to silent discard.
*/
interface EffectReceiptDecision {
  decisionType: "effect_receipt";
  opId: string;
  intentRef: number;
  verification: "verified" | "unverified";
  /** Provider transfer id (monetary); duplicate classification key. */
  transferId?: string;
  amount?: number;
  currency?: string;
  /** Signed document hash (signing class). */
  documentHash?: string;
  /** Provider case or object reference. */
  providerRef?: string;
  timestamp?: string;
  detail?: string;
}
/**
* A terminal transition (RFC section 4.6): the first terminal append
* for an intent closes it; later would-be transitions fold as durable
* no-ops with a superseded-by reason. A terminal without `intentRef`
* is a standalone `refused` record (the writer's durable give-up when
* no intent ever landed); it requires `logicalKey`.
*/
interface EffectTerminalDecision {
  decisionType: "effect_terminal";
  opId: string;
  intentRef?: number;
  logicalKey?: string;
  terminal: EffectTerminalState;
  reason?: string;
  /** Causal reference (for 'compensated': the compensation intent). */
  causalRef?: number;
}
/**
* A linked incident (RFC section 4.6, item 2): a fact that arrived
* after a terminal and genuinely matters. Durable, causally linked,
* surfaced, requiring disposition; never a mutation of the terminal.
*/
interface EffectIncidentDecision {
  decisionType: "effect_incident";
  opId: string;
  intentRef: number;
  incident: string;
  causalRef?: number;
  detail?: string;
}
/**
* A journaled provider probe (plan 45 train five): every lookup and
* every acceptance closure the recovery machinery performs is a
* durable row, so the intent's lookup budget (RFC section 3.1) is
* countable from the journal alone and survives a crash of the
* probing process.
*/
interface EffectProbeDecision {
  decisionType: "effect_probe";
  opId: string;
  intentRef: number;
  probe: "lookup" | "close-acceptance";
  found: boolean;
  /** True when the negative is provider-enforced final. */
  acceptanceClosed?: boolean;
}
/**
* The post-restore gate release (RFC section 4.5, item 3): after a
* restoration epoch's reconciliation sweep completes, this decision
* re-enables attempt dispatch for that epoch. An epoch born from a
* restore (its recorded restoration generation differs from its
* predecessor's) refuses to open attempts until this row exists.
*/
interface EffectReconciliationCompleteDecision {
  decisionType: "effect_reconciliation_complete";
  opId: string;
  /** Seq of the effect_epoch this completion releases. */
  epochRef: number;
  swept: number;
}
/** A journaled human disposition of a quarantine or an incident. */
interface EffectDispositionDecision {
  decisionType: "effect_disposition";
  opId: string;
  intentRef: number;
  principal: string;
  reason: string;
  disposition: string;
  /** The incident this disposition answers, when not the quarantine. */
  causalRef?: number;
}
/**
* The clock fact for grant expiry (RFC section 4.5, item 1): the fold
* never compares wall clocks, so an approval's `expiresAt` becomes
* effective only through this appended decision. Mirrors the shipped
* `approval_revoked` decision shape (targetRef addressing, no opId:
* idempotent by content, appendable by any observer with append
* rights, because it only materializes a crossing the approval's own
* recorded expiry already determines).
*/
interface ApprovalExpiredDecision {
  decisionType: "approval_expired";
  targetRef: number;
  /** The recorded expiry instant this decision materializes. */
  expiresAt: string;
  observer?: string;
}
type EffectLaneDecision = EffectEpochDecision | EffectDeclaredDecision | EffectIntentDecision | EffectAttemptDecision | EffectOutcomeDecision | EffectReceiptDecision | EffectTerminalDecision | EffectIncidentDecision | EffectDispositionDecision | EffectProbeDecision | EffectReconciliationCompleteDecision;
/** The read verdict of one journal entry against the lane vocabulary. */
type EffectLaneRead = {
  lane: false;
} | {
  lane: true;
  decision: EffectLaneDecision;
} | {
  lane: true;
  malformed: string;
};
/**
* Reads one journal entry as an effect lane decision, fail closed: an
* entry that is not a kind-'decision' entry with a lane decisionType is
* not lane traffic; a lane decisionType whose payload fails validation
* reads `malformed` and participates in NOTHING (a hand-written broken
* row must never confuse the machine). `approval_expired` is read by
* the fold directly (it targets approvals, not machines).
*/
declare function readEffectLaneDecision(entry: JournalEntry): EffectLaneRead;
/**
* Reads one journal entry as an `approval_expired` decision (the clock
* fact of RFC section 4.5), fail closed like the lane reader.
*/
declare function readApprovalExpired(entry: JournalEntry): {
  targetRef: number;
  expiresAt: string;
} | undefined;
/**
* Reads one journal entry as the shipped `approval_revoked` decision
* (RV4008), by the exact shape ExternalRegistry.revokeApproval appends.
*/
declare function readApprovalRevoked(entry: JournalEntry): {
  targetRef: number;
} | undefined;
/**
* The effect logical key an approval licenses (RFC section 4.3, item
* 4), read from the approval suspension's own payload: recorded on the
* approval request, so the fold can refuse an intent whose key differs
* from the key the approval named. Fail closed: an approval that names
* no key licenses no effect.
*/
declare function approvalLicensedKey(entry: JournalEntry): string | undefined;
/** Narrow Json helper for payload builders in the writer train. */
type EffectLaneJson = Json;
//#endregion
//#region src/effects/fold.d.ts
/** Why a consumption fold refused an intent (RFC section 4.3). */
type EffectVoidReason = "no-epoch" | "stale-epoch" | "no-such-approval" | "approval-not-allowed" | "approval-revoked" | "approval-expired" | "approval-names-no-key" | "approval-key-mismatch" | "duplicate-logical-key" | "compensation-depth" | "bad-causal-ref";
/** Fold classification of one lane entry; NEVER persisted. */
type EffectLaneClassification = {
  classification: "applied";
} | {
  classification: "replay";
  firstSeq: number;
} | {
  classification: "void";
  reason: EffectVoidReason;
  detail: string;
} | {
  classification: "superseded";
  supersededBy: number;
} | {
  classification: "incident";
  intentRef: number;
  detail: string;
} | {
  classification: "invalid";
  detail: string;
} | {
  classification: "malformed";
  detail: string;
};
type EffectMachineState = "intent" | "dispatching" | "awaiting-receipt" | "unknown" | EffectTerminalState;
interface EffectAttemptState {
  seq: number;
  ordinal: number;
  notAfter: string;
  idempotencyKey?: string;
  transport?: string;
  open: boolean;
  outcome?: "accepted" | "failed" | "unknown";
  outcomeSeq?: number;
  /** The attempt entry's startedAt instant. */
  at: string;
  /** The closing outcome entry's startedAt instant. */
  outcomeAt?: string;
}
interface EffectReceiptState {
  seq: number;
  /** The receipt entry's startedAt instant. */
  at: string;
  verification: "verified" | "unverified";
  transferId?: string;
  amount?: number;
  currency?: string;
  documentHash?: string;
  providerRef?: string;
  timestamp?: string;
  /** Seq of the earlier verified receipt this one benignly duplicates. */
  benignDuplicateOf?: number;
  /** Seq of the earlier verified receipt this one conflicts with. */
  conflictWith?: number;
}
interface EffectIncidentState {
  seq: number;
  incident: string;
  causalRef?: number;
  detail?: string;
}
interface EffectDispositionState {
  seq: number;
  principal: string;
  reason: string;
  disposition: string;
  causalRef?: number;
}
/** The first revocation or expiry decision AFTER the intent position. */
interface PostIntentCloser {
  seq: number;
  kind: "revoked" | "expired";
}
/** One journaled provider probe (lookup budget accounting). */
interface EffectProbeState {
  seq: number;
  probe: "lookup" | "close-acceptance";
  found: boolean;
  acceptanceClosed?: boolean;
}
interface EffectMachine {
  intentSeq: number;
  /** The intent entry's startedAt instant. */
  at: string;
  opId: string;
  logicalKey: string;
  approvalRef: number;
  epochRef: number;
  effectClass: EffectClass;
  capabilityRow: EffectCapabilityRow;
  lookupQualification?: EffectLookupQualification;
  argumentsHash: string;
  artifactHash?: string;
  configFingerprint?: string;
  budgets: EffectBudgets;
  compensates?: number;
  successorOf?: number;
  /** True when the consumption fold licensed the intent. */
  consumed: boolean;
  voidReason?: {
    reason: EffectVoidReason;
    detail: string;
  };
  state: EffectMachineState;
  attempts: EffectAttemptState[];
  receipts: EffectReceiptState[];
  incidents: EffectIncidentState[];
  dispositions: EffectDispositionState[];
  probes: EffectProbeState[];
  terminal?: {
    seq: number;
    terminal: EffectTerminalState;
    reason?: string;
    causalRef?: number;
  };
  /** A pre-terminal conflicting receipt awaiting the quarantine append. */
  pendingConflict?: {
    seq: number;
    detail: string;
  };
  /** Set at finalize; re-dispatch is disabled from this position on. */
  postIntentCloser?: PostIntentCloser;
  /** The confirmed compensation citing this intent (derived overlay). */
  compensatedBy?: number;
}
interface EffectEpochState {
  seq: number;
  generation: string;
  restorationGeneration?: number;
  /**
  * True when this epoch's recorded restoration generation differs
  * from its predecessor's: a restore happened, and attempt dispatch
  * stays disabled until `reconciled` (RFC section 4.5, item 3).
  */
  needsReconciliation: boolean;
  /** An effect_reconciliation_complete decision cites this epoch. */
  reconciled: boolean;
}
interface EffectDeclarationState {
  seq: number;
  declaration: EffectDeclaredDecision;
}
interface StandaloneRefusal {
  seq: number;
  logicalKey: string;
  reason?: string;
}
/** A sweep-recorded quarantine with no machine to attach to (kill 25). */
interface StandaloneQuarantine {
  seq: number;
  logicalKey: string;
  reason?: string;
}
/**
* The compensated overlay (see the module doc): 'compensated' when a
* confirmed compensation cites a confirmed original, else the
* machine's own state.
*/
declare function effectiveEffectState(machine: EffectMachine): EffectMachineState;
declare class EffectLaneFold {
  private readonly bySeq;
  private readonly machinesByIntent;
  private readonly canonicalByEpochKey;
  private readonly classifications;
  private readonly opIds;
  private readonly epochList;
  private readonly declarationList;
  private readonly refusalList;
  private readonly quarantineList;
  /** targetRef -> ascending seqs of approval_revoked decisions. */
  private readonly revokedIndex;
  /** targetRef -> ascending seqs of approval_expired decisions. */
  private readonly expiredIndex;
  private readonly resolutions;
  constructor(entries: readonly JournalEntry[], resolutions?: ResolutionFold);
  machines(): EffectMachine[];
  machineAt(intentSeq: number): EffectMachine | undefined;
  /** The consumed intent holding `logicalKey` in the CURRENT epoch. */
  canonicalIntent(logicalKey: string): EffectMachine | undefined;
  epochs(): EffectEpochState[];
  currentEpoch(): EffectEpochState | undefined;
  classificationOf(seq: number): EffectLaneClassification | undefined;
  declarations(): EffectDeclarationState[];
  standaloneRefusals(): StandaloneRefusal[];
  /** Sweep-recorded quarantines with no machine (kill 25's remainder). */
  standaloneQuarantines(): StandaloneQuarantine[];
  /** Consumed machines that have not reached a terminal. */
  openMachines(): EffectMachine[];
  private classify;
  private firstAtOrBelow;
  private firstAbove;
  private latestEpochBefore;
  private applyEntry;
  /** The machine a sub-record addresses, or an invalid classification. */
  private liveMachine;
  private closerAfterIntent;
  private applyIntent;
  private applyReceipt;
  /** Why a terminal append is illegal in this machine state, if it is. */
  private terminalIllegality;
  private finalize;
}
//#endregion
//#region src/effects/writer.d.ts
interface EffectLaneWriterOptions {
  store: JournalStore;
  runId: string;
  /** Lease owner identity for the lane session (production mode). */
  owner?: string;
  /**
  * Explicitly single-process semantics: admits a store without leases
  * and without `fencedWrites` (the in-memory reference store). A
  * production effect lane never sets this; the conformance kit does.
  */
  singleProcess?: boolean;
  /** Injectable clock (ISO instants); tests pin it. */
  now?: () => string;
}
interface EffectIntentSpec {
  opId: string;
  logicalKey: string;
  approvalRef: number;
  effectClass: EffectClass;
  capabilityRow: EffectCapabilityRow;
  lookupQualification?: EffectLookupQualification;
  argumentsHash: string;
  artifactHash?: string;
  configFingerprint?: string;
  budgets: EffectBudgets;
  compensates?: number;
  successorOf?: number;
}
interface EffectConsumeResult {
  intentSeq: number;
  machine: EffectMachine;
  /** True when the opId was already in the journal (recovery). */
  replayed: boolean;
}
interface EffectAppendResult {
  seq: number;
  replayed: boolean;
}
/**
* Opens the effect lane on one run's journal: acquires the lane lease
* in production mode and validates the store capabilities. The lane
* operates on SETTLED runs (the admission predicate requires
* `settled: true`), so it never contends with a live engine segment,
* only with other lane holders, which is exactly what the lease and
* the A5 contention rule arbitrate.
*/
declare function openEffectLane(options: EffectLaneWriterOptions): Promise<EffectLaneWriter>;
declare class EffectLaneWriter {
  private readonly store;
  private readonly runId;
  private readonly owner;
  private readonly singleProcess;
  private readonly now;
  private lease?;
  private entries;
  private fold;
  private opened;
  private closed;
  constructor(options: EffectLaneWriterOptions);
  open(): Promise<void>;
  close(): Promise<void>;
  /** The current fold over the writer's loaded view. */
  view(): EffectLaneFold;
  /** Reloads the journal and returns the fresh fold. */
  refresh(): Promise<EffectLaneFold>;
  private reload;
  private tail;
  private template;
  private findOpId;
  /**
  * Validates the store's restoration generation against the latest
  * epoch (kill point 25): a mismatch disables every lane append until
  * a fresh epoch cites the bumped generation.
  */
  private assertRestorationCurrent;
  /**
  * The universal lane append (RFC section 4.3, item 2): append at the
  * tail, and on ANY uncertain result reload and search for the
  * operation id before retrying. `verdict` re-evaluates the caller's
  * precondition at each fresh tail; returning a string refuses with
  * that reason instead of appending.
  */
  private laneAppend;
  /**
  * Appends the run incarnation's epoch fact (RFC section 4.5, item
  * 2) when the latest epoch does not already record this generation
  * and the store's current restoration generation. Idempotent by its
  * derived operation id.
  */
  ensureEpoch(generation: string): Promise<EffectAppendResult>;
  /**
  * Consumes a standing approval and records the intent as ONE append
  * (RFC section 4.3). Intake refusals (an effect approval without a
  * deadline; a grant expiry the local clock has crossed, which the
  * writer first materializes as an appended `approval_expired`
  * decision, the deterministic truth) throw typed WITHOUT appending
  * an intent. A contention give-up appends a durable standalone
  * `refused` record, then throws.
  */
  consumeApprovalAndRecordIntent(spec: EffectIntentSpec): Promise<EffectConsumeResult>;
  /** Intake rules that refuse BEFORE any intent append. */
  private intakeApproval;
  private allowValueOf;
  /**
  * Opens one dispatch attempt (RFC section 3.1, item 3), with the
  * pre-attempt re-fold of section 4.3, item 5: a revocation or expiry
  * with ZERO attempts cancels cleanly (the writer appends
  * `cancelled-before-dispatch` and reports it); with an open history
  * it refuses typed, because recovery from that position is
  * reconcile-only on every capability row.
  */
  openAttempt(intentSeq: number, spec: {
    opId: string;
    notAfter: string;
    idempotencyKey?: string;
    transport?: string;
  }): Promise<{
    cancelled: true;
    terminalSeq: number;
  } | {
    cancelled: false;
    attemptSeq: number;
    replayed: boolean;
  }>;
  /** Classifies one open attempt's result. */
  appendOutcome(intentSeq: number, attemptSeq: number, spec: {
    opId: string;
    outcome: "accepted" | "failed" | "unknown";
    detail?: string;
  }): Promise<EffectAppendResult>;
  /** Records a receipt observation with the caller's verification verdict. */
  appendReceipt(intentSeq: number, spec: {
    opId: string;
    verification: "verified" | "unverified";
    transferId?: string;
    amount?: number;
    currency?: string;
    documentHash?: string;
    providerRef?: string;
    timestamp?: string;
    detail?: string;
  }): Promise<EffectAppendResult>;
  /** Appends a terminal transition; the fold's legality rules decide. */
  appendTerminal(intentSeq: number, spec: {
    opId: string;
    terminal: EffectTerminalState;
    reason?: string;
    causalRef?: number;
  }): Promise<EffectAppendResult>;
  /** Records a linked incident on a machine. */
  appendIncident(intentSeq: number, spec: {
    opId: string;
    incident: string;
    causalRef?: number;
    detail?: string;
  }): Promise<EffectAppendResult>;
  /** Records a human disposition of a quarantine or an incident. */
  appendDisposition(intentSeq: number, spec: {
    opId: string;
    principal: string;
    reason: string;
    disposition: string;
    causalRef?: number;
  }): Promise<EffectAppendResult>;
  /** The writer's current loaded entries (read-only snapshot). */
  entriesSnapshot(): Promise<readonly JournalEntry[]>;
  /** A durable standalone refusal for a logical key (no machine). */
  appendStandaloneRefusal(spec: {
    opId: string;
    logicalKey: string;
    reason: string;
  }): Promise<EffectAppendResult>;
  /** A durable standalone quarantine (the kill 25 sweep records). */
  appendStandaloneQuarantine(spec: {
    opId: string;
    logicalKey: string;
    reason: string;
  }): Promise<EffectAppendResult>;
  /** Journals one provider probe (the durable lookup budget row). */
  appendProbe(intentSeq: number, spec: {
    opId?: string;
    probe: "lookup" | "close-acceptance";
    found: boolean;
    acceptanceClosed?: boolean;
  }): Promise<EffectAppendResult>;
  /** Releases a restoration epoch after its sweep (RFC 4.5, item 3). */
  appendReconciliationComplete(spec: {
    opId: string;
    epochRef: number;
    swept: number;
  }): Promise<EffectAppendResult>;
  private requireMachine;
}
//#endregion
//#region src/admission/algorithms.d.ts
/** Persistent per-queue SFQ state. */
interface FairQueueState {
  virtualTime: number;
  /** memberKey -> the member's last finish tag. */
  finishTags: Record<string, number>;
}
declare function emptyFairQueue(): FairQueueState;
/** The tags a ticket receives at arrival (pure; mutates nothing). */
declare function sfqTagsOnArrival(state: FairQueueState, memberKey: string, costWires: number, weight: number): {
  startTag: number;
  finishTag: number;
};
/** Records the arrival: the member's finish tag advances. */
declare function sfqRecordArrival(state: FairQueueState, memberKey: string, finishTag: number): FairQueueState;
/** Records a grant: V advances to the granted start tag, monotonically. */
declare function sfqRecordGrant(state: FairQueueState, startTag: number): FairQueueState;
/**
* The deterministic grant order over queued rows: smallest start tag,
* ties by arrival seq. Two replicas over the same rows sort identically.
*/
declare function sfqGrantOrder<T extends {
  startTag: number;
  arrivalSeq: number;
}>(queued: readonly T[]): T[];
/** A sliding window as a ring of sub-window counters (section 4.2, 1). */
interface SlidingWindowState {
  /** Consumption per slot, oldest first after normalization. */
  slots: number[];
  /** The epoch-slot index the LAST slot corresponds to. */
  headSlot: number;
}
declare function emptySlidingWindow(slotCount: number): SlidingWindowState;
/** Rotates the ring so `nowSlot` is the head; expired slots zero out. */
declare function windowAdvance(state: SlidingWindowState, nowSlot: number): SlidingWindowState;
/** The trailing sum the cap bounds. */
declare function windowSum(state: SlidingWindowState): number;
/**
* Admits when the trailing sum stays under cap. This bounds the fixed
* epoch double burst to one sub-window's allowance, a documented burst,
* not a silent fix of the pinned RV708 semantics.
*/
declare function windowAdmits(state: SlidingWindowState, cap: number, amount: number): boolean;
declare function windowConsume(state: SlidingWindowState, amount: number): SlidingWindowState;
/** Refunds into the head slot; never below zero across the ring. */
declare function windowRefund(state: SlidingWindowState, amount: number): SlidingWindowState;
/** Token bucket state (section 4.2, item 2). */
interface TokenBucketState {
  tokens: number;
  lastMs: number;
}
declare function bucketAdvance(state: TokenBucketState, nowMs: number, ratePerSecond: number, burst: number): TokenBucketState;
declare function bucketAdmits(state: TokenBucketState, amount: number): boolean;
declare function bucketConsume(state: TokenBucketState, amount: number): TokenBucketState;
declare function bucketRefund(state: TokenBucketState, amount: number, burst: number): TokenBucketState;
/**
* The three bucket levels (RFC section 4.1): the resolved effective
* tenant; tenant plus providerAccount; the full scope digest. Keys are
* the JCS serialization of the level's projected sub-scope, canonical
* bytes everywhere, so the shipped limiters' addressing split never
* leaks into this seam. A level with nothing to key (no resolved
* tenant, no provider account) is absent rather than a phantom global
* bucket: fail-closed matching happens in the scheduler, not here.
*/
interface AdmissionLevelKeys {
  tenant?: string;
  providerAccount?: string;
  scope?: string;
}
declare function admissionLevelKeys(resolvedTenant: string | undefined, scope: AdmissionScopeDimensions | undefined): AdmissionLevelKeys;
/** Reservation arithmetic helpers (component-wise, absent = 0). */
declare function reservationMinus(a: AdmissionReservation, b: AdmissionReservation | undefined): AdmissionReservation;
/** Monotone high-water merge of covers (checkpoint THEN consume). */
declare function coverMerge(current: AdmissionReservation | undefined, next: AdmissionReservation): AdmissionReservation;
//#endregion
//#region src/admission/memory.d.ts
interface AdmissionLevelConfig {
  algorithm: "sliding-window" | "token-bucket";
  /** Total wires capacity: the feasibility bound and the cap. */
  capWires: number;
  /** Sliding window geometry (default 60000 ms over 6 slots). */
  windowMs?: number;
  slots?: number;
  /** Token bucket refill (wires per second); burst = capWires. */
  refillWiresPerSecond?: number;
  /** Level-2 only: the per provider account concurrency semaphore. */
  concurrency?: number;
  /** Fraction of capWires only emergency work may take (section 4.2). */
  emergencyReserveFraction?: number;
}
interface MemoryAdmissionOptions {
  levels: {
    tenant?: AdmissionLevelConfig;
    providerAccount?: AdmissionLevelConfig;
    scope?: AdmissionLevelConfig;
  };
  /** Fairness weights by resolved tenant; default 1. */
  weights?: Record<string, number>;
  leaseTtlMs: number;
  /** The injectable clock, REQUIRED: the reference owns no wall clock. */
  now: () => number;
  /** Debt age-out horizon; default the tenant level's window. */
  debtAgeMs?: number;
  /** Hydrate from a persisted document (the durable wrappers). */
  state?: AdmissionState;
}
/**
* The scheduler's WHOLE state as one plain-JSON document: the durable
* implementations (sqlite, postgres) persist exactly this shape and
* CAS it atomically per lifecycle call, which is the RFC's first
* shipped durable form (a single scheduler over durable state; the
* multi-replica story beyond deterministic ordering is deferred by
* section 10). Per-row schemas are an optimization the SPI does not
* require: atomic "state moved AND buckets moved" holds trivially when
* the whole document commits or none of it does.
*/
interface AdmissionState {
  tickets: Record<string, {
    ticket: AdmissionTicket;
    request: AdmissionRequest;
    keys: Partial<Record<"tenant" | "providerAccount" | "scope", string>>;
    accountStartTag: number;
    accountFinishTag: number;
    appliedOps: string[];
  }>;
  buckets: Record<string, {
    window?: SlidingWindowState;
    bucket?: TokenBucketState;
    debts: Array<{
      wires: number;
      atMs: number;
    }>;
    held: number;
  }>;
  tenantQueue: FairQueueState;
  accountQueues: Record<string, FairQueueState>;
  arrivalCounter: number;
}
declare class MemoryAdmissionScheduler implements AdmissionScheduler {
  private readonly options;
  private readonly tickets;
  private readonly buckets;
  private tenantQueue;
  private readonly accountQueues;
  private arrivalCounter;
  constructor(options: MemoryAdmissionOptions);
  private hydrate;
  /** The whole state as a plain-JSON document (deep-copied). */
  snapshot(): AdmissionState;
  private levelConfig;
  private bucketFor;
  private slotOf;
  private effectiveDebt;
  /** The cap a NON-emergency request admits under (reserve carved out). */
  private admissibleCap;
  /** The first level refusing this ticket, or undefined when all admit. */
  private firstRefusingLevel;
  private levelAdmits;
  private consumeLevels;
  private refundLevels;
  private recordDebt;
  private applied;
  enqueue(request: AdmissionRequest, opId: string): Promise<AdmissionTicketDecision>;
  private mintTicket;
  private queuedInGrantOrder;
  private decisionOf;
  recover(unitId: string, generation: string, opId: string): Promise<AdmissionRecovery>;
  renew(unitId: string, generation: string, _opId: string): Promise<void>;
  checkpointCover(unitId: string, generation: string, cover: AdmissionReservation, opId: string): Promise<void>;
  release(unitId: string, generation: string, actuals: AdmissionReservation, opId: string): Promise<void>;
  cancel(unitId: string, generation: string, opId: string): Promise<void>;
  rebind(unitId: string, generation: string, target: {
    scope: NonNullable<AdmissionRequest["scope"]>;
  }, opId: string): Promise<AdmissionTicketDecision>;
  pump(_opId: string): Promise<AdmissionTicket[]>;
}
//#endregion
//#region src/effects/admissible.d.ts
type EffectLaneAdmissionVerdict = {
  ok: true;
} | {
  ok: false; /** The first failed conjunct, by its RFC name. */
  conjunct: "settled" | "status" | "completion" | "deliverableAccepted" | "productionAcceptable";
  reason: string;
};
/**
* Evaluates the five conjuncts of RFC section 5 over a terminal
* envelope, fail closed on absence: an unsettled or superseded segment
* never licenses effects; an `exhausted` or `cancelled` terminal can
* still carry artifacts, but they are diagnostics, not deliverables; a
* `partial` salvage is readable by humans and unacceptable to an
* effect lane; without a finish contract there is no accepted
* deliverable to act on; and `waived`, `partial`, `vacuous`, and
* `not-judged` semantic verdicts all refuse, by the RV4209 rule.
*/
declare function effectLaneAdmissible(envelope: TerminalEnvelope): EffectLaneAdmissionVerdict;
//#endregion
//#region src/stores/inmemory.d.ts
declare class InMemoryStore implements MetaLookupStore {
  private readonly runs;
  private readonly metas;
  private warned;
  constructor(options?: {
    quiet?: boolean;
  });
  append(runId: string, e: JournalEntry): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  putMeta(m: RunMeta): Promise<void>;
  getMeta(runId: string): Promise<RunMeta | undefined>;
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
  delete(ref: string): Promise<void>;
}
//#endregion
//#region src/stores/meta-lookup.d.ts
/** Capability guard, same shape as the lease capability detection. */
declare function hasMetaLookup(store: JournalStore): store is MetaLookupStore;
/**
* One run's meta: `getMeta` when the store has the capability, else the
* full `listRuns` scan. `undefined` means the run is not in the store.
*/
declare function readRunMeta(store: JournalStore, runId: string): Promise<RunMeta | undefined>;
/**
* The RunFilter predicate shared by the shipped stores (and usable by
* callers re-checking an advisory `statuses` filter a legacy store may
* have ignored). `status` and `statuses` combine as either-matches.
*/
declare function metaMatchesFilter(meta: RunMeta, f?: RunFilter): boolean;
//#endregion
//#region src/stores/fenced.d.ts
/** Capability guard: the store declares the fenced writes promise. */
declare function hasFencedWrites(store: JournalStore | TranscriptStore): boolean;
/**
* Deployment-time assertion for queue hosts that require the full
* fence: throws a typed ConfigError naming each store that does NOT
* declare `fencedWrites`. A host that tolerates advisory meta or
* transcript writes simply never calls this. The shipped pair that
* satisfies it with transcripts present is `@rulvar/store-sqlite`:
* the store as the journal plus its `transcripts()` twin.
*/
declare function assertFencedWrites(stores: {
  journal: JournalStore;
  transcripts?: TranscriptStore;
}): void;
//#endregion
//#region src/stores/reconcile.d.ts
/** The decisionType of the journaled run settle entry. */
declare const RUN_SETTLE_DECISION_TYPE = "run_settle";
/**
* The decisionType of the journaled spawn admission (RV2702): the
* entry that names every child an orchestration judged, which is what
* makes an offline roster a read rather than a guess.
*/
declare const SPAWN_ADMISSION_DECISION_TYPE = "spawn-admission";
/**
* The last journaled run settle of a journal, if any. `outputHash` is
* present when that settle recorded the result digest (RV-209; settles
* written before it, or over undefined/non-serializable results, carry
* none).
*/
declare function lastRunSettle(entries: readonly JournalEntry[]): {
  runStatus: RunStatus;
  seq: number;
  outputHash?: string;
  completion?: "complete" | "partial" | "rejected";
  /**
  * The rejected finish candidates the settle recorded (RV2507),
  * read back for offline readers (RV2605). The settle persists the
  * whole completion lift, so this needs no re-fold and no
  * validator re-run; it is parsed defensively, exactly like
  * `completion`, so a foreign or older journal reads as "not
  * recorded" rather than as a claim.
  */
  rejectedFinishCandidates?: RejectedFinishCandidate[];
  /**
  * The semantic outcome the settle recorded (RV3304), read back
  * the same defensive way: the acceptance verdict, the
  * deliverable presence, the acceptance ref and the judge meta,
  * so a restarted reader recovers the facts a live consumer
  * gated on. Absent on journals written before the lift carried
  * them; absence means NOT RECORDED, never a verdict.
  */
  deliverableAccepted?: boolean;
  resultAvailable?: boolean;
  acceptedArtifactRef?: number;
  claimConsistencyMeta?: Record<string, unknown>;
  /**
  * The citation audit meta and the one-word semantic verdict the
  * settle recorded (RV4403), read back the same defensive way:
  * the seventh comparison run's restart reader could not see the
  * ten unsupported citations its own failure named. Absence
  * means NOT RECORDED, never a verdict.
  */
  citationAuditMeta?: Record<string, unknown>;
  semanticTerminalVerdict?: Record<string, unknown>;
} | undefined;
/**
* Whether a terminal figure counts THIS segment's work or the whole
* logical run (RV2510).
*
* * `'segment'`: only the segment that produced this terminal. A
*   resumed run reports the resumed segment's number, and the figure
*   for the logical run is the SUM over every segment
*   ({@link logicalRunTelemetry} computes it).
* * `'cumulative'`: the whole logical run, every prior segment
*   included, because the figure folds from the journal (money, usage),
*   resumes from the journaled ledger (the spawn count), or is
*   RE-DERIVED by replay (the loss list: a resumed segment re-executes
*   the workflow and reads the same journaled terminals, so the drops
*   of earlier segments come back). Summing these across segments
*   double counts.
* * `'terminal'`: not a count at all: a claim about the run as it
*   stands at this settle, which a later segment can only replace.
*/
type TelemetryScope = "segment" | "cumulative" | "terminal";
/**
* The scope table's type, and the gate that keeps it complete
* (RV2701).
*
* Every field of `RunOutcome` is required, so a new terminal field
* does not COMPILE until it declares what it counts; the string index
* signature then admits the nested paths a consumer reads off the same
* outcome (`cost.orchestrator.wakes`), which are not keys of the type.
* Those it admits but cannot demand, so the table itself is held to
* every counted leaf under `cost` where it is declared (RV2801).
*
* It replaces a sample: the original gate read the keys of one
* successful run, which is structurally blind to every field that
* exists only on a FAILED terminal, and RV2602's `childrenAtFailure`
* (present exactly when no acceptance verdict exists) shipped straight
* through it. A table about resumed and killed runs cannot be
* defended by an outcome that neither died nor resumed.
*/
type TerminalTelemetryScopes = Readonly<Record<keyof RunOutcome<unknown>, TelemetryScope>> & Readonly<Record<string, TelemetryScope>>;
/**
* The scope of every field the engine writes onto a terminal (RV2510),
* as one exported table rather than as sentences scattered through
* field docs.
*
* The twenty-fifth comparison run was killed and resumed, and its two
* terminals mixed both kinds with nothing marking which was which: the
* money was cumulative, the live-only counters were not,
* and reconciling them into one honest account of the logical run was
* hand work over a joined journal. Keys are field paths as a consumer
* reads them off `RunOutcome` (`cost.orchestrator.wakes`): the type
* requires every field of the outcome, and the `satisfies` below
* requires every counted leaf under `cost` (RV2801), because an index
* signature admits nested paths and demands none, so the five that were
* declared were declared by hand and by luck while four
* (`cost.usageApprox`, `cost.abandoned.usd`, `cost.abandoned.usageApprox`,
* `cost.orchestrator.share`) were simply missing. That is the RV2701
* blindness one level down: a gate whose subject is nested figures
* cannot stop at the top level.
*
* What neither can decide is whether a declared scope is TRUE, and a
* wrong scope is worse than a missing one: a missing one is noticed, a
* wrong one is believed. The doctrine test suspends a real run, resumes
* it, and holds every declared figure against its own claim (RV2801),
* which is how three `cost.orchestrator.*` paths were found calling
* themselves `'segment'` while the terminal folded them cumulatively.
*/
declare const TERMINAL_TELEMETRY_SCOPE: TerminalTelemetryScopes;
/** One logical run's telemetry, folded across every segment (RV2510). */
interface LogicalRunTelemetry {
  /** How many settles the journal records: the number of segments that ran. */
  segments: number;
  /** Each segment's settled status, in journal order. */
  statuses: RunStatus[];
  /**
  * Journal entries each segment APPENDED, in the same order: its own
  * share of the run's durable work, which is the one honest
  * per-segment measure of effort a resumed run has. A pure-replay
  * segment that appended nothing but its settle reads 1.
  */
  entriesPerSegment: number[];
  /**
  * Entries the run holds in total. Equal to the sum of
  * `entriesPerSegment` plus whatever follows the last settle: the
  * partition is exact BECAUSE it is a partition, which is what makes
  * this figure safe to read beside a cumulative one.
  */
  entries: number;
  /**
  * Entries appended AFTER the last settle. Nonzero means the journal
  * continued past its terminal (RV1407: a detached resolution
  * awaiting its resume, or a successor segment over a stale settle),
  * so the last status is not the run's last word.
  */
  entriesAfterLastSettle: number;
  /**
  * The two time conventions of a resumed run (RV4409, the seventh
  * comparison experiment's post-mortem measured them by external
  * script): `activeMs` sums each segment's own append window (its
  * first to its last appended entry), `calendarMs` spans the whole
  * journal, and `gapMs` is their difference, the operator time
  * between segments. Derived from the `startedAt` stamps the entries
  * already carry; absent when the journal carries none (absence
  * means NOT RECORDED, RV1209).
  */
  activeMs?: number;
  calendarMs?: number;
  gapMs?: number;
  /**
  * Per segment, in journal order (RV4409): the settled status, the
  * appended entries, the segment's own append window when the stamps
  * exist, and `replayed: true` on a pure-replay segment (nothing
  * appended but its settle), so a resumed run's walls read as the
  * original segments' work instead of 0.0 s.
  */
  perSegment?: Array<{
    status: RunStatus;
    entries: number;
    activeMs?: number;
    replayed?: true; /** Provider HTTP fetches THIS segment appended (RV4604). */
    adapterFetches: number;
  }>;
  /**
  * Provider wire decisions across the WHOLE journal (RV4409): the
  * logical run's paid wire count, the invoice's cardinality. A
  * resumed segment re-reads its prefix without re-paying it, so this
  * figure and a segment's own adapter fetches are DIFFERENT counters
  * with different names; the seventh comparison experiment
  * reconciled "16 versus 109" by hand for exactly this reason.
  */
  logicalWireRequests?: number;
  /**
  * Provider HTTP fetches across the WHOLE journal (RV4604): the sum
  * of every provider-call decision's absorbed `wireRequests` (absent
  * reads one, the single-wire dispatch). The counter above counts
  * DECISIONS; this one counts the HTTP requests those decisions
  * absorbed, so the two figures the seventh comparison experiment
  * reconciled by hand now carry their own names side by side, and
  * `perSegment[].adapterFetches` says which segment actually paid
  * for them (a pure-replay segment reads 0).
  */
  adapterFetches?: number;
}
/**
* Folds a run's journal into the logical run's telemetry (RV2510): how
* many segments ran, how each settled, and how much durable work each
* one did, from entries the journal already holds. No new field, so it
* reads journals written by every prior version exactly as well as
* today's.
*
* The replay dedup is the design. Cumulative figures are deliberately
* NOT here: money and usage fold from the WHOLE journal through
* `costReportFromJournal` and the usage ledger, and re-summing them per
* segment would count every replayed operation once per segment that
* replayed it, which is exactly the reconciliation this fold exists to
* make unnecessary. What it reports instead is a PARTITION of the
* journal by settle boundary, so no entry is counted twice by
* construction, and the segment-scoped figures a terminal carries
* ({@link TERMINAL_TELEMETRY_SCOPE} names them) can be read against the
* segment that produced them.
*/
declare function logicalRunTelemetry(entries: readonly JournalEntry[]): LogicalRunTelemetry;
/** One child of one orchestration, as the journal holds it (RV2702). */
interface JournaledChild {
  /**
  * The dispatch seq: the SAME number the orchestrator's own turns used
  * as the child's handle, so a reader can find it in the transcript
  * without a second identifier. Handles are journal-derived and stable
  * across resume (a replayed spawn reports its original dispatch seq),
  * which is what makes this a name and not an index.
  */
  handle: number;
  /** The profile the child ran under, when the terminal recorded it. */
  agentType?: string;
  /**
  * The status the journal recorded, absent when no terminal followed:
  * the child was still in flight when the journal ends. This is the
  * ENTRY status vocabulary, which is where the run's own dispatch
  * records live.
  */
  status?: EntryStatus;
  /** The RV806 evidence verdict, present under a declared contract. */
  evidence?: {
    recordedEntries: number;
    minEntries: number;
    met: boolean;
  };
  /** The RV3002 durable tool-budget subset, when the terminal journaled it. */
  toolBudget?: {
    used: number;
    cap?: number;
  };
  /**
  * Present and true when the orchestration ABANDONED this child's
  * branch (RV2804): the work happened and the provider billed it, and
  * the run threw the result away. The money layer has separated the two
  * since RV1904 (`grossUsd` keeps abandoned spend, `totalUsd` does
  * not), and this roster presented discarded children exactly like kept
  * ones, so a post-mortem counting "four children settled ok" counted
  * branches the orchestrator had discarded.
  *
  * Absent means NOT ABANDONED, which is decidable here: the fold reads
  * the same first-wins abandon projection the replayer uses, over the
  * same journal, and `handle` is the very seq an abandon entry targets.
  */
  abandoned?: true;
}
/** One orchestration's children, folded from its journal (RV2702). */
interface JournaledChildRoster {
  /** The scope the children dispatched under, which identifies the orchestration. */
  childScope: string;
  /** Spawn admissions the controller ADMITTED. */
  admitted: number;
  /** Spawn admissions it refused: no child ever ran, and none is listed below. */
  rejected: number;
  /** Every admitted child the journal holds a dispatch for, in dispatch order. */
  children: JournaledChild[];
}
/**
* Every orchestration's children, folded from a run's journal (RV2702).
*
* `childrenAtFailure` (RV2602) answers this for a LIVE consumer, and it
* dies with the process that held it: the settle persists the
* completion lift and nothing else, so a post-mortem over a journal,
* which is all a paid run leaves behind, had no way to ask what the
* children produced. Every ingredient was already written down. This
* is the fold.
*
* It reads what resume reads. A `spawn-admission` decision names every
* child the controller judged, with its ordinal, its profile, its
* verdict, and the scope its dispatch pins to; the dispatch and
* terminal `agent` entries under that scope are the child itself, and
* the RV806 evidence verdict rides the terminal. Nothing is
* re-derived and no validator runs again, so a journal written by any
* prior version reads exactly as well as today's, which is the point:
* the runs worth a post-mortem are the ones already in the archive.
*
* Two things it deliberately does NOT claim. It is not the live
* roster: this reading happens after the RV1903 exit barrier settled
* the stragglers, so a child the live field would have called
* unsettled usually has a terminal here, and `status` is absent only
* where the journal truly ends mid-flight. And it names children by
* their dispatch seq rather than by nodeId, because the seq is the
* handle the orchestrator's own turns used and the one a reader can
* follow into the transcript.
*/
declare function childRostersFromJournal(entries: readonly JournalEntry[]): JournaledChildRoster[];
type RunAuditVerdict = "consistent" | "meta-behind" | "stranded" | "suspect";
interface RunStateAudit {
  runId: string;
  verdict: RunAuditVerdict;
  /** The stored meta row; absent when the store has none. */
  meta?: RunMeta;
  journalEntries: number;
  /** The last journaled settle, when the journal carries one. */
  journalSettle?: {
    runStatus: RunStatus;
    seq: number;
  };
  /** Entries appended after the last journaled settle. */
  entriesAfterSettle: number;
  /** Running dispatch entries no terminal ever referenced. */
  danglingDispatches: number;
  openSuspensions: number;
  /** The status a repair would write; absent when no repair is sound. */
  repairTo?: RunStatus;
  /** One sentence naming the evidence behind the verdict. */
  reason: string;
}
/**
* Audits one run: loads the meta row and the journal, derives the state
* the journal supports, and names the divergence. Read only.
*/
declare function auditRun(store: JournalStore, runId: string): Promise<RunStateAudit>;
interface AuditRunsOptions {
  /** Also return runs whose audit found nothing wrong. Default false. */
  includeConsistent?: boolean;
}
/**
* Audits every run the catalog lists. Loads EVERY journal it audits:
* this is operator tooling for finding stranded runs, not a hot path.
*/
declare function auditRuns(store: JournalStore, opts?: AuditRunsOptions): Promise<RunStateAudit[]>;
interface ReconcileOptions {
  /**
  * A live lease for the run, passed through to the meta write. Over a
  * `fencedWrites` store this makes the repair itself takeover safe: a
  * successor acquiring mid-repair fences the stale rewrite out.
  */
  lease?: Lease;
}
interface ReconcileResult {
  audit: RunStateAudit;
  /** True when a divergent meta row was rewritten from the journal. */
  repaired: boolean;
}
/**
* Repairs a divergent meta row from the journal: 'meta-behind' and
* 'stranded' audits rewrite `status` (every other meta field, unknown
* fields included, is preserved byte for byte), 'suspect' and
* 'consistent' audits change nothing. Zero model calls, no workflow
* needed; the crash residue between a settle's journal flush and its
* meta write repairs without resuming the run at all.
*/
declare function reconcileRunMeta(store: JournalStore, runId: string, opts?: ReconcileOptions): Promise<ReconcileResult>;
//#endregion
//#region src/stores/critical-path.d.ts
/**
* The critical path of a logical run, folded from its journal (RV2803).
*
* The live reading is {@link reduceCriticalPath}; this is the same
* question asked of what survived the process. Fields are absent where
* the journal cannot answer, never zero.
*/
interface JournaledCriticalPath {
  /**
  * Settled agent spans that were neither coordination nor synthesis:
  * the fan-out this run actually paid for.
  */
  workerSpans: number;
  /** Summed wall of settled `'synthesize'` spans. */
  synthesisMs: number;
  /**
  * Settled agent spans whose entry records no role, so this fold could
  * not classify them (a journal older than the attribution facts).
  * Nonzero means the counts above are a floor, and saying so is the
  * whole point of the field.
  */
  unclassifiedSpans: number;
  /** How many segments the journal holds; the wall figures need one. */
  segments: number;
  /** First stamp to last, absent unless the journal holds ONE segment. */
  runWallMs?: number;
  /** Last worker settle to the end of the run; same condition. */
  postFanInMs?: number;
  /** `postFanInMs / runWallMs`, the RV2210 target's own quantity. */
  postFanInShare?: number;
  /** `synthesisMs / runWallMs`, under the same conditions. */
  synthesisShare?: number;
  /**
  * Synthesis that is COMPOSITION (RV1604; classified through
  * {@link synthesizeSpanClassOf} since RV4206, so a judge of either
  * kind and an unknown label never land here). Present only when
  * EVERY synthesize span in the journal carried a label: one
  * unlabelled span would make the split a guess, and the split exists
  * because a guess here read a 54 second judge as a second final
  * composition.
  */
  finalCompositionMs?: number;
  /** Synthesis that IS the claim judge; same all-or-nothing condition. */
  semanticJudgeMs?: number;
  /**
  * Synthesis that is the citation entailment audit judge (RV4206);
  * same all-or-nothing condition. Until this field the audit judge
  * read as final composition in every archived journal, the same
  * blindness the live reducer had.
  */
  citationJudgeMs?: number;
  /** Settled citation-judge spans, counted; same condition. */
  citationJudgeSpans?: number;
  /**
  * Synthesis whose label this fold's classifier does not know
  * (RV4206); same condition. Nonzero means the split beside it is a
  * floor, never silently "composition".
  */
  unclassifiedSynthesisMs?: number;
  /** Settled unclassified synthesize spans, counted; same condition. */
  unclassifiedSynthesisSpans?: number;
  /**
  * The stage split of `semanticJudgeMs` (RV3404), same all-or-nothing
  * condition: the draft pass is the exact judge label and every
  * suffixed variant is a post draft pass over the composed document
  * (the final pass and the repair round's re-judge both dispatch
  * `-final`, RV2509/RV3307). One classifier decides on both surfaces:
  * {@link claimJudgeStageOf}.
  */
  draftJudgeMs?: number;
  /** The post draft half of the split; same condition. */
  finalJudgeMs?: number;
  /**
  * Settled synthesize spans counted by side, same condition (RV3404):
  * `compositionSpans: 2` in an archived journal is the legible
  * signature of the bounded repair round (RV3307), readable years
  * after the process that paid for it exited.
  */
  compositionSpans?: number;
  /** Settled judge-side synthesize spans, counted; same condition. */
  judgeSpans?: number;
  /**
  * First stamp to the FIRST settled composition-side span's end
  * (RV3605): when a candidate deliverable first existed, readable
  * from the archive. The third comparison run held a mechanically
  * accepted candidate 25 minutes before it lost typed, and the only
  * route to that fact was a span dig. Needs everything the wall
  * needs (one segment) plus everything the split needs (every
  * synthesize span labelled, or the milestone would count a judge as
  * a candidate); absent otherwise, never guessed.
  */
  firstCandidateMs?: number;
  /**
  * First stamp to the LAST settled composition-side span's end; same
  * conditions. Time to the accepted deliverable exactly when the
  * terminal says `deliverableAccepted: true`; on a failed run it is
  * when the last LOSING candidate settled, so pair it with the
  * acceptance verdict and never read it as a win on an error
  * terminal.
  */
  lastCandidateMs?: number;
  /**
  * Settled agent spans whose invocation was aborted by the host's
  * finish rejection (RV3702): the journaled `hostRejected` stamps
  * counted. Unconditional (the stamp is self contained: no label, no
  * segment condition) and zero when none, exactly the live reading
  * of the same run: the layer split (wires fine, document refused by
  * host) stays readable years after the process exited.
  */
  hostRejectedSpans: number;
  /**
  * The window itemization a journal CAN answer (RV3404); present
  * exactly when `postFanInMs` is.
  */
  postFanIn?: JournaledPostFanIn;
}
/**
* The synthesis half of the RV710 decomposition, asked of a journal
* (RV3404). The live breakdown also itemizes the coordinator's model
* and tool time inside the window; a journal cannot: a terminal agent
* entry spans the WHOLE invocation, and the coordinator's per turn
* stamps died with the process that emitted them. So this block claims
* exactly what the stamps prove: how much of the window settled
* synthesize spans cover, the split of that cover when every span is
* labelled, and how much of the window NO settled synthesize span
* accounts for. `unaccountedMs` is a superset of the live `residueMs`
* by construction (the coordinator's own tail time lives in it here),
* which is why it refuses to share the name.
*/
interface JournaledPostFanIn {
  /** Union of settled synthesize spans clipped to the window. */
  synthesisCoveredMs: number;
  /**
  * The composition share of the covered spans, clipped; present under
  * the same all-or-nothing labelling condition as the top level
  * split, and equal to the live breakdown's reading of the same run.
  */
  finalCompositionMs?: number;
  /** The claim-judge share, clipped; same condition. */
  semanticJudgeMs?: number;
  /** The citation-judge share, clipped (RV4206); same condition. */
  citationJudgeMs?: number;
  /** The unclassified share, clipped (RV4206); same condition. */
  unclassifiedSynthesisMs?: number;
  /** `postFanInMs` minus `synthesisCoveredMs`, floored at zero. */
  unaccountedMs: number;
  /** `unaccountedMs / postFanInMs` when the window is positive. */
  unaccountedShare?: number;
}
/**
* Fold a run's critical path out of its journal.
*
* @param entries the journal of one run, in any order
*/
declare function criticalPathFromJournal(entries: readonly JournalEntry[]): JournaledCriticalPath;
//#endregion
//#region src/stores/repair-ledger.d.ts
/** One counted repair, folded from its journaled verdict or dispatch (RV4002/RV4105). */
interface RepairLedgerRound {
  /**
  * Which gate granted it (the draft gate, a composition invocation,
  * or the RV3307 round's own pool), or 'semantic' for a dispatched
  * semantic repair round itself (RV4105): the round has no verdict
  * decision, so its row folds from the settled dispatch entry.
  */
  stage: "draft" | "composition" | "round" | "semantic";
  /**
  * What dispatched the semantic round (RV4105): 'claim' (the RV3307
  * contradiction round), 'citation' (the RV4004 entailment round),
  * 'coverage' (the RV4202 round armed by a non-'full' final grade
  * alone), or 'combined' (one bounded round carrying more than one
  * defect class, RV4202), read from the
  * `costAttribution.repairTrigger` stamped at dispatch. Absent on
  * non-semantic rows and on journals written before the stamp
  * shipped (absence means NOT RECORDED, RV1209).
  */
  trigger?: "claim" | "citation" | "coverage" | "combined";
  /** The verdict decision's seq: the repair's address in the run. */
  seq: number;
  /** The finish call id the verdict was keyed by, when journaled. */
  callId?: string;
  /** The failed validator names, verbatim from the verdict. */
  failedValidators: readonly string[];
  /**
  * The section markers the repair actually resubmitted, when the
  * healing attempt was a sectional splice whose acceptance journaled
  * them (the draft gate's `orchestrator_draft_gate` acceptance and
  * the RV808b finish splice both record theirs).
  */
  sections?: readonly string[];
  /**
  * The repair wire's own address: the seq of the first incremental
  * billing row after this verdict whose record carries the RV4002
  * wire-level `phase: 'repair'` stamp, in the same scope. Absent when
  * the row has not landed (the RV2008 async posture) or predates the
  * stamp.
  */
  wireRef?: number;
  /** That wire priced at the caller's table; absent when unpriceable. */
  costUsd?: number;
}
/** The workflow-wide repair aggregate (RV4002). */
interface RepairLedger {
  /** Draft-gate rejections (each granted the loop's next attempt). */
  draft: number;
  /** Granted mechanical repairs inside composition invocations, the round's own included. */
  composition: number;
  /** Dispatched semantic repair rounds (RV3307). */
  semantic: number;
  /** draft + composition + semantic. */
  total: number;
  /**
  * One row per counted repair, in seq order. Semantic rounds carry
  * their own rows since RV4105 (stage 'semantic', with the trigger
  * when the journal stamped one), so their wires have a home and
  * `semantic: 2` is decomposable without cross-reading metas.
  */
  rounds: readonly RepairLedgerRound[];
  /**
  * Finish-validation 'repair' verdicts with no journaled stage: the
  * journal predates RV4002, so the buckets above are a FLOOR, not the
  * workflow answer. Zero on every journal this engine writes.
  */
  unstagedVerdicts: number;
}
/**
* Folds the workflow-wide repair ledger from a journal (RV4002). Pure
* over the entries, so the acceptance envelope's live aggregate
* (computed from the run's own snapshot at assembly) and a post-hoc
* fold over the persisted journal agree by construction on every
* count and row identity; `wireRef`/`costUsd` enrich rows exactly when
* the asynchronous billing lane covered them.
*/
declare function repairLedgerFromJournal(entries: readonly JournalEntry[], priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined): RepairLedger;
//#endregion
//#region src/stores/synthesis-candidates.d.ts
/**
* THE candidate hash recipe (RV4207), written down where the fold that
* reads it lives: sha256 (hex) over the JCS canonical serialization of
* the candidate VALUE, `null` for an absent one. This is the recipe
* behind every `candidateHash` a finish-validation decision journals,
* the claim judge's `judgedHash`, the citation audit's `auditedHash`,
* and `draftToFinal`'s pair, so one function answers "which document"
* across every surface. Two facts an auditor needs spelled out: a
* STRING document hashes as its JSON encoding (the quotes and escapes
* included), not as raw text bytes; and exporting the text to a file
* with a trailing newline changes the FILE's sha256 while this hash is
* unchanged, verify against the exact value, never the file. The sixth
* comparison experiment's auditor re-derived all of this from source
* because no exported function said it.
*/
declare function candidateHashOf(candidate: unknown): string;
/**
* Verifies retained candidate bytes against a journaled candidateHash
* (RV4207). The retained blob holds the candidate's TEXT verbatim (the
* document itself for a string result, its JSON serialization
* otherwise), while the hash covers the canonical VALUE, so the check
* tries the value both ways: as the string document, then as parsed
* JSON. Returns false on any mismatch or unparsable bytes, never
* throws: the caller is an audit path, and a corrupt blob is a finding
* there, not a crash.
*/
declare function verifyCandidateBytes(bytes: Uint8Array | string, hash: string): boolean;
/** One failed validator on a journaled finish verdict, verbatim. */
interface SynthesisCandidateFailure {
  name: string;
  reasons: readonly string[];
}
/** One finish candidate, folded from its journaled verdict (RV2902). */
interface JournaledSynthesisCandidate {
  /** The journaled verdict: 'accepted', 'repair', or 'rejected'. */
  verdict: "accepted" | "repair" | "rejected";
  /** The verdict decision's seq: the candidate's address in the run. */
  verdictSeq: number;
  /** The verdict decision's stamp, when the entry carried one. */
  verdictAt?: string;
  /** The finish call id the verdict was keyed by. */
  callId?: string;
  /** Repairs spent BEFORE this candidate, from the verdict itself. */
  repairsUsed?: number;
  maxRepairs?: number;
  /** The contract generation the verdict was rendered under. */
  contractHash?: string;
  /**
  * The candidate's identity (RV2507): the {@link candidateHashOf}
  * hash and the char count. Journaled on every non-accepted verdict
  * since RV2507, and on the ACCEPTED verdict too under a declared
  * `candidatePersistence` (RV4207), where it names the resolved
  * document (deterministic patch or sectional splice applied), so
  * the whole chain reads by hash.
  */
  candidateHash?: string;
  candidateChars?: number;
  /** The rejected candidate's transcript blob, under retention. */
  candidateRef?: string;
  /**
  * Why the candidate's BYTES are not retained (RV4207), from the
  * decision itself: 'hash-only-persistence' names the declared
  * policy, 'store-write-failed' a retention that was declared and
  * refused by the store. Absent on journals written before the
  * field, and everywhere no reason applies; a blob later deleted by
  * retention leaves the hash and this field as the honest remainder.
  */
  bytesUnavailableReason?: string;
  /** The failed validators with their reasons, verbatim. */
  failed: readonly SynthesisCandidateFailure[];
  /** The hosting span's dispatch label (RV2901), when journaled. */
  spanLabel?: string;
  /**
  * The hosting span's running entry seq (RV3802): the span's identity
  * within the run, so two candidates can be read as neighbors of ONE
  * composition invocation (the repair-turn pairing below) instead of
  * accidental neighbors across spans. Absent exactly when unhosted.
  */
  spanSeq?: number;
  /**
  * Wall from the previous boundary (the span's start, or the prior
  * verdict) to this verdict's stamp. Absent when the candidate is not
  * hosted by a settled synthesize span or a stamp is missing.
  */
  windowMs?: number;
  /**
  * Provider wire requests inside this candidate's window (absorbed
  * continuations counted). Present only when the incremental rows
  * cover the hosting span's terminal call records exactly.
  */
  wires?: number;
  /** Summed recorded usage of the window's wires; same condition. */
  usage?: Usage;
  /**
  * Window wires that recorded NO usage on a non-ok outcome: the
  * provider may have billed them anyway, so `costUsd` is a floor
  * whenever this is nonzero.
  */
  usageUnknownWires?: number;
  /**
  * The window priced per call at the caller's table. Present only
  * when a price function was given and it priced EVERY window wire;
  * an unpriced model drops the field rather than shrinking it.
  */
  costUsd?: number;
}
/** What `synthesisCandidatesFromJournal` folded, beside the candidates. */
interface JournaledSynthesisCandidateReport {
  /** Every hosted candidate, in verdict seq order. */
  candidates: readonly JournaledSynthesisCandidate[];
  /** Settled synthesize spans the journal holds. */
  synthesisSpans: number;
  /**
  * Finish verdicts NOT hosted by a settled synthesize span: draft
  * stage validations in the coordination span, and verdicts inside a
  * synthesis that never settled. Counted, never guessed into
  * candidates.
  */
  unhostedVerdicts: number;
  /**
  * Settled synthesize spans whose incremental billing rows do not
  * cover their terminal call records (the rows append asynchronously
  * and may be missing); their candidates carry verdict facts only.
  */
  unattributedSpans: number;
  /** Wires after a span's LAST verdict: attributed to no candidate. */
  tailWires: number;
}
/**
* Fold the finish candidates (RV2902) out of a run's journal: each
* journaled validation verdict with the window of wall, wires, usage,
* and priced cost that produced the candidate it judged.
*
* @param entries the journal of one run, in any order
* @param priceUsd prices one call's usage at its serving model, the
*   same shape `invoiceFromJournal` takes; omit to fold without money
*/
declare function synthesisCandidatesFromJournal(entries: readonly JournalEntry[], priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined): JournaledSynthesisCandidateReport;
/**
* The observed price of the run's LAST mechanical repair turn
* (RV3802): the window of the candidate that FOLLOWED a 'repair'
* verdict inside the same settled synthesize span, priced by the same
* per-call fold every candidate window uses. This is the fallback the
* repair round's mechanical money leg sizes itself from when the host
* declared no estimate: by the time the round is admitted the initial
* composition has settled, so a mechanical repair it performed is a
* priced window in the journal. Fail closed under RV1209: no such
* pairing, an unattributed span, or an unpriceable window all return
* undefined (never a guessed number), and the caller treats undefined
* as an inert zero-size leg.
*/
declare function lastMechanicalRepairCostUsd(entries: readonly JournalEntry[], priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined): number | undefined;
//#endregion
//#region src/stores/tool-calibration.d.ts
/** One dispatch carrying BOTH sides of the calibration pair (RV3003). */
interface ToolCalibrationRow {
  /** The scope the dispatch journaled under. */
  scope: string;
  /** The dispatch seq (the terminal's `ref`): the child's handle. */
  handle: number;
  /** The profile the dispatch ran under, when the terminal recorded it. */
  agentType?: string;
  /** The journaled terminal status. */
  status: string;
  /** Successful `record_evidence` executions the RV806 verdict counted. */
  recordedEntries: number;
  /** The declared floor the verdict was judged against. */
  minEntries: number;
  /** Executed tool calls the RV3002 terminal subset journaled. */
  toolCallsUsed: number;
  /** `toolCallsUsed / recordedEntries`; absent when recordedEntries is 0. */
  callsPerEntry?: number;
}
/** A dispatch named but excluded from the rate: one side is NOT RECORDED. */
interface ToolCalibrationExclusion {
  scope: string;
  handle: number;
  status: string;
}
/** The observed calls-per-evidence-entry calibration of one journal (RV3003). */
interface ToolCalibrationReport {
  /** Terminal agent dispatches the journal holds, the partition's whole. */
  dispatches: number;
  /** Dispatches carrying both the verdict and the counter, in seq order. */
  observed: ToolCalibrationRow[];
  /**
  * The observed aggregate over `observed` rows: summed executed calls
  * against summed recorded entries, with the rate absent when the
  * entry sum is 0. Absent entirely when no row paired.
  */
  aggregate?: {
    toolCallsUsed: number;
    recordedEntries: number;
    callsPerEntry?: number;
  };
  /** A declared contract whose counter was never journaled (pre-RV3002 journals). */
  evidenceOnly: ToolCalibrationExclusion[];
  /** A journaled counter with no declared contract: nothing to divide by. */
  budgetOnly: ToolCalibrationExclusion[];
  /** Dispatches carrying neither side. */
  unobserved: number;
  /**
  * The coordination side's own executed tool calls (RV4010, the
  * fifth comparison experiment): terminal dispatches whose recorded
  * role is 'orchestrate' or 'synthesize' with the RV3002 counter
  * journaled. The experiment's telemetry counted 407 tool starts
  * against 390 worker calls and the 17-call remainder (the
  * coordination loop's spawn/await/finish exchanges and the
  * composition's finish) had no bucket to live in, so the gap had to
  * be explained by hand. Workers' counters plus this bucket now
  * account for the run's executed tool calls; coordination
  * dispatches never carry an evidence contract, so before RV4010
  * they drowned in `budgetOnly` as if a declared contract had lost
  * its pair. Absent when the journal holds no counted coordination
  * dispatch, so every such report keeps its bytes.
  */
  coordination?: {
    dispatches: number;
    toolCallsUsed: number;
  };
}
/**
* Folds the observed tool-budget calibration from a journal (RV3003):
* every terminal agent entry is partitioned by which sides of the
* evidence/counter pair it recorded, the paired rows carry their
* per-dispatch rate, and the aggregate is the number a host compares
* against its declared `estCallsPerEntry`. Pure over the entries, so
* live and resumed journals fold identically; nothing is re-derived
* and no checkpoint blob is read.
*/
declare function toolCalibrationFromJournal(entries: readonly JournalEntry[]): ToolCalibrationReport;
//#endregion
//#region src/stores/jsonl.d.ts
declare class JsonlFileStore implements MetaLookupStore {
  private readonly dir;
  /**
  * The stored tail seq per run, lazily initialized from the file on the
  * first append this instance performs (obligation A5). Per instance by
  * design: cross-process writers are the lease seam's job.
  */
  private readonly lastSeq;
  /**
  * The verify-only load switch (RV1512): with `repairOnLoad: false`,
  * `load` serves the salvageable records WITHOUT rewriting the file,
  * so an auditor's "verification" read never destroys the evidence
  * of a tear it found. The default keeps the owner semantics byte
  * for byte: a torn tail repairs on load exactly as documented in
  * the A1 model above. Mutations (`append`, `putMeta`, `delete`)
  * are unaffected by the flag; an auditor that must not write simply
  * does not call them.
  */
  private readonly repairOnLoad;
  constructor(options: {
    dir: string;
    repairOnLoad?: boolean;
  });
  private journalPath;
  private metaPath;
  append(runId: string, e: JournalEntry): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  /**
  * Restores the trailing '\n' of a parseable-but-unterminated tail
  * (RV701). One byte appended in place terminates the record exactly
  * where the crash left it; the file's bytes before it stay untouched.
  * No-op on a missing, empty, or already-terminated journal.
  */
  private terminateUnterminatedTail;
  private repairTornTail;
  putMeta(m: RunMeta): Promise<void>;
  getMeta(runId: string): Promise<RunMeta | undefined>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  delete(runId: string): Promise<void>;
}
/**
* File-backed TranscriptStore (M6-T02): blobs (transcripts, checkpoints,
* persisted CompiledWorkflow sources) as one file per ref under `dir`,
* so compiled runs resume across processes. Refs follow the
* `<runId>/<name>` convention; nested segments become directories.
*
* Every ref is contained under `dir` (v1.36.0 review SEC-P1): each
* segment must match `[A-Za-z0-9._-]` and be neither empty, '.', nor
* '..', and the resolved path must stay under the resolved root. A '..'
* segment used to pass the per-segment alphabet (dots are in it) and, via
* `join`, escape the root; a caller passing an untrusted ref (or an
* untrusted runId, which prefixes checkpoint and workflow-source refs)
* could read, write, or delete `.bin` files outside `dir`.
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
  delete(ref: string): Promise<void>;
}
//#endregion
//#region src/engine/pricing-snapshot.d.ts
/** One pinned row: the pricing that was APPLIED to this model's usage. */
interface AppliedPricingRow {
  model: ModelRef;
  rates: Pricing;
}
/**
* One pin's coverage (RV611): the run-settle that recorded it, the seq
* range it settled FIRST, and exactly the version and rows it pinned.
* The whole array is the per-segment provenance a single last-pin
* version used to hide: an invoice folded over a rotation can now say
* every table version that priced it, with the boundary seqs.
*/
interface PinnedPricingSegment {
  /**
  * The first seq this pin covers: the previous pin's settle seq, 0 for
  * the first pin. Rows with `fromSeq <= seq < settleSeq` price under
  * this pin in the seq-aware fold.
  */
  fromSeq: number;
  /** The pinning run-settle's own seq (the exclusive upper bound). */
  settleSeq: number;
  /** The PriceTable version THIS settle pinned; absent for caps-only rows. */
  pricingVersion?: string;
  /** The applied rows THIS settle pinned. */
  rows: AppliedPricingRow[];
  /**
  * sha256 over the canonical JSON of THIS pin's rows (RV3703): the
  * version string is a label the table author chose, and the third
  * experiment's arc found a price defect that a label cannot expose;
  * the hash is the content. Two tables sharing a version string but
  * disagreeing on rates are distinguishable, and two folds of one
  * journal always derive the same hex. Computed at read time from
  * the pinned bytes: the journal is unchanged and every existing pin
  * gains it.
  */
  rowsHash: string;
  /**
  * The freshness range of THIS pin's dated rows (RV3703): the oldest
  * and newest `ratesVerifiedAt` among rows carrying a parsable one,
  * the machine-readable age of the table that priced the segment.
  * Absent when no row is dated: freshness is then unattested, never
  * guessed.
  */
  ratesVerifiedAt?: {
    oldest: string;
    newest: string;
  };
}
/** What `journalPricingSnapshot` rebuilds from a pinned run settle. */
interface JournalPricingSnapshot {
  /** The PriceTable version of the LAST pin; absent for caps-only rows. */
  pricingVersion?: string;
  /** The last pin's rows: the union covering the whole settled journal. */
  rows: AppliedPricingRow[];
  /** The last pin's content hash (RV3703); see PinnedPricingSegment.rowsHash. */
  rowsHash: string;
  /**
  * The last pin's freshness range (RV3703); see the per-segment
  * field. Absent when no row of the last pin is dated.
  */
  ratesVerifiedAt?: {
    oldest: string;
    newest: string;
  };
  /**
  * The seq of the last pinning settle: rows at or past it belong to a
  * segment no pin covers yet, so a caller composing with a live table
  * (the engine's outcome mirror) prefers the live rates there.
  */
  pinnedThroughSeq: number;
  /**
  * Every pin in journal order (RV611): boundaries, versions, and rows,
  * not only the last. This is the honest provenance for a fold across
  * a price-table rotation: consumers exporting `pricingVersion` alone
  * silently hid that different segments priced under different tables.
  */
  segments: PinnedPricingSegment[];
  /**
  * Prices usage with the PINNED rows only: a model absent from the
  * snapshot folds as unpriced (surfaced, never a silent zero), exactly
  * the honesty contract of the live fold. With a `seq`, the row is
  * priced under the pin of ITS OWN segment (RV505): the first settle
  * that followed it, which recorded exactly the rates its live debits
  * used, so a suspend/resume across a price-table rotation never
  * re-prices settled history. Without a `seq`, the last pin wins, the
  * historical behavior.
  */
  priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined;
  /**
  * THE composition the engine's outcome mirror applies at settle
  * (RV611), exported so stored consumers (the CLI cost and invoice
  * views, the server cost endpoint) fold exactly like the engine
  * instead of passing the raw snapshot: a pin-covered row (`seq <
  * pinnedThroughSeq`) prices under the pin of its own segment; the
  * tail past the last pin (a segment journaled but not yet settled,
  * the crashed-mid-flight shape) and seq-less calls price at `current`
  * alone, exactly like the live debits that tail will settle with,
  * never silently at the last pin's rates. Two deliberate fallbacks,
  * both documented rather than hidden: a covered model its covering
  * pin missed back-reprices at the LAST pin when that pin names it
  * (the journal never recorded what those debits actually cost), and
  * otherwise falls to `current` (today's table may know a model the
  * run's tables never priced); a model neither names folds as
  * unpriced, surfaced, never a silent zero.
  */
  composedPriceUsd: (current: (servedBy: ModelRef, usage: Usage) => number | undefined) => (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined;
}
/**
* The read side. Every settling segment pins the union it applied, and
* each pin's settle seq bounds the rows it settled FIRST, so the pins
* compose without any journal change (RV505): a seq-aware caller gets
* the rates of the row's own segment, and a seq-less caller keeps the
* historical last-pin behavior. Journals settled before the pin
* shipped, or without any priced model, return undefined: the caller
* keeps its current-table fold and its export says so.
*/
declare function journalPricingSnapshot(entries: readonly JournalEntry[]): JournalPricingSnapshot | undefined;
//#endregion
//#region src/engine/invoice.d.ts
/**
* How far a row's identity goes toward provider-side reconciliation.
* `provider-id-present` asserts exactly what it names: the adapter
* surfaced the provider's response id for this call, the join key a
* host needs to line the row up against a provider statement. It does
* NOT assert any statement, amount, or usage match: the library never
* sees provider billing data, so those deeper reconciliation tiers are
* host-side joins keyed on `responseId`, not verdicts this export can
* make.
*/
type InvoiceReconciliation = "provider-id-present" | "missing-provider-id" | "unconfirmed" | "unattributed";
/** One billable provider call (or an unattributed usage remainder). */
interface InvoiceRow {
  /** The terminal journal entry the row folds from. */
  entrySeq: number;
  scope: string;
  key: string;
  /**
  * The spawn's agent type from the terminal's cost attribution
  * (RV3906, the fourth comparison experiment): in dynamic runs the
  * scope grammar nests every orchestrator spawn under one
  * `agent:<seq>` bucket, so per-child money used to require a join
  * through the journal; the row now names the profile directly.
  * Additive and policy, never identity: absent on entries journaled
  * before cost attribution shipped, on empty attributions, and on
  * every pre-RV3906 export byte, so old journals and old consumers
  * read exactly what they always read.
  */
  agentType?: string;
  /**
  * The dispatch label from the same attribution (RV2803 journaled
  * it; RV3906 lifts it onto the row), what tells two spans of one
  * role apart without a journal join. Absent on unlabelled
  * dispatches, additive exactly like `agentType`.
  */
  label?: string;
  /** The call's dispatch ordinal within its invocation; remainder and slice rows continue past it. */
  ordinal: number;
  servedBy: ModelRef;
  role?: InvocationRole;
  /** 1-based try number on the serving target (retries increment it). */
  attempt?: number;
  outcome: ProviderCallRecord["outcome"] | "unattributed";
  responseId?: string;
  /**
  * Every wire request's response id when the adapter absorbed
  * provider-side continuations into this one dispatch (RV905); a
  * per-request statement bills each segment as its own row, so the
  * reconciliation joins this row by ANY id of the set. Absent on
  * single-wire rows.
  */
  wireResponseIds?: string[];
  /**
  * Provider HTTP requests this ONE row represents (RV1210), from the
  * adapter's reported count rather than the id list: a provider that
  * left an absorbed segment unnamed still billed it. Absent on
  * single-wire rows, where the row IS the request.
  */
  wireRequests?: number;
  usage: Usage;
  usageApprox?: boolean;
  /**
  * Present and true when this `unconfirmed` row recorded ZERO usage
  * on every counter (the v1.71 experiment review, P1.4): a failed
  * attempt whose usage this ledger never saw. The zeros mean
  * "nothing recorded", never "the provider metered nothing": the
  * provider may have billed prompt processing before the failure, so
  * a statement join must treat this row's usage as unknown, not as
  * zero. Derived at export time from the journaled record; rows with
  * any recorded usage, and every other verdict, never carry it.
  */
  usageUnknown?: true;
  /** This row priced at its own model's rate; absent when no price row covers it. */
  usd?: number;
  /**
  * The additive FinOps column: this row's share of `totalUsd`, always
  * present (zero for rows on unpriced models). Shares are computed
  * within the row's own (entry, serving model) slice of the same
  * gross fold the totals run, proportional to per-row `usd`, and one
  * row absorbs the IEEE rounding dust, so summing `allocatedUsd` over
  * `rows` reproduces `totalUsd` exactly where summing `usd` does not.
  */
  allocatedUsd: number;
  /** The row lies under an abandoned subtree: in grossUsd, not in netUsd. */
  abandoned?: true;
  reconciliation: InvoiceReconciliation;
}
/**
* Where the fold's rates came from (RV407): `composed` says the caller
* priced with the snapshot's `composedPriceUsd` (RV611), the engine's
* own composition, so pin-covered rows reproduce the settled numbers
* and anything past the last pin priced at the caller's current table;
* `snapshot` says the caller priced with the raw pinned rows alone
* (the pre-RV611 label); `current-table` says the live table priced
* it, the historical behavior for journals without a pin. Attached by
* the caller, who is the one that chose.
*/
interface InvoicePricingProvenance {
  source: "snapshot" | "current-table" | "composed";
  pricingVersion?: string | undefined;
  /**
  * The pinned rows the fold used; present on snapshot-priced exports.
  * Each row's `rates` carries `ratesVerifiedAt` when the pinning
  * table stamped one (RV814): the machine-readable answer to how
  * fresh the rates that priced settled history were.
  */
  rows?: AppliedPricingRow[] | undefined;
  /**
  * Per-pin coverage (RV611): every settled segment's version and rows
  * with its seq boundaries, not only the last. A fold across a
  * price-table rotation used to export one `pricingVersion` while its
  * rows priced under several; this array is the honest declaration.
  */
  segments?: PinnedPricingSegment[] | undefined;
  /**
  * On `composed` exports: the last pin's settle seq. Rows at or past
  * it (a segment journaled but not yet settled) priced at the current
  * table, not any pin; each row's `entrySeq` locates it against this
  * bound.
  */
  pinnedThroughSeq?: number | undefined;
  /**
  * The version of the caller's CURRENT table (RV706): on `composed`
  * exports, the table that priced everything past `pinnedThroughSeq`;
  * on `current-table` exports, the whole fold's table. The pinned
  * segments each name their own version, and without this field the
  * composition's second half stayed anonymous. Absent when the
  * caller's table declares no version.
  */
  currentPricingVersion?: string | undefined;
}
/**
* Logical dispatches against provider HTTP requests (RV1210). One row
* is one DISPATCH, and a dispatch that absorbed provider-side
* continuations (RV905) is billed by the provider as several requests,
* so a per-request statement has MORE lines than this export has rows
* BY CONSTRUCTION. The counters state that difference instead of
* leaving a host to meet it as an unexplained count mismatch: a
* reconciliation that compares row count against statement line count
* should compare `wireRequests`, and `wireIdsMissing` says how many of
* those requests carry no join key at all.
*/
interface InvoiceCardinality {
  /** Rows folding a real provider call; unattributed remainders excluded. */
  dispatchRows: number;
  /** Provider HTTP requests those rows represent, absorbed continuations counted. */
  wireRequests: number;
  /** Rows whose dispatch absorbed more than one wire request. */
  multiWireRows: number;
  /**
  * Wire requests with no recorded join key, across EVERY dispatch row
  * (RV1410): a multi-wire row contributes the requests its id set
  * left unnamed, and a single-wire row contributes its one request
  * when neither `responseId` nor an id set names it. Failed requests
  * count like any other: the provider may have billed them, and a
  * statement line cannot be joined to a row that has no id either
  * way.
  */
  wireIdsMissing: number;
}
/** The machine-readable invoice: rows plus the ledger totals. */
interface InvoiceExport {
  rows: InvoiceRow[];
  /** Every priced terminal slice, abandonment included: equals CostReport.grossUsd. */
  totalUsd: number;
  /** The net ledger (abandoned subtrees contribute zero): equals CostReport.totalUsd. */
  netUsd: number;
  /** The abandoned share: totalUsd - netUsd, equals CostReport.abandoned.usd. */
  abandonedUsd: number;
  /**
  * How per-row `usd` was computed: each call priced individually at
  * the current table's rates. Always `'per-call'` today; declared so
  * finance tooling never has to guess the basis.
  */
  pricingBasis: "per-call";
  /**
  * False exactly when every contributing entry's providerCalls fully
  * cover its usage (RV504): the totals are then the per-call fold
  * itself, each row's `usd` agrees with its `allocatedUsd`, and the
  * flat `usd` sum reproduces `totalUsd` up to IEEE association of
  * the last bits. True when any entry folded on the aggregate basis
  * (no records, or records that do not cover its usage): a nonlinear
  * price table then prices an aggregate differently from the sum of
  * its parts, so sum `allocatedUsd` instead; it exists precisely so
  * a column sums to the total exactly in every case.
  */
  rowUsdNonAdditive: boolean;
  /** Usage on models absent from pricing, net and abandoned alike; never a silent zero. */
  unpriced: Array<{
    model: string;
    usage: Usage;
  }>;
  /** Rows whose reconciliation is not 'provider-id-present'. */
  reconciliationFailures: number;
  /** Dispatch rows against the provider requests they represent (RV1210). */
  cardinality: InvoiceCardinality;
  /**
  * USD of allocation pools that had a target and no row to carry it
  * (RV605). The dust pass refuses to move such dollars onto another
  * model's rows just to make the column sum, so on the (pathological)
  * journals where this happens the flat `allocatedUsd` sum reproduces
  * `totalUsd` minus this amount. Absent when zero, which is every
  * well-formed journal: the per-slice remainder rows guarantee a row
  * wherever a slice has usage.
  */
  unallocatedUsd?: number;
  /** Rows carrying `usageUnknown`; present when at least one does. */
  usageUnknownRows?: number;
  /** Present and true when any contributing entry carried approximate usage. */
  usageApprox?: boolean;
  /** The rates provenance (RV407); present when the caller declared it. */
  pricing?: InvoicePricingProvenance;
  /**
  * The unsettled lane (RV2008): dispatches whose agent is still
  * RUNNING at the journal's edge, recovered from the incremental
  * provider-call rows the loop journals as each wire call settles.
  * Deliberately OUTSIDE the settled totals above: run_settle stays
  * the billing boundary, and this section prices what the crash
  * window preserved anyway, the ~$0.99 of parity root dispatches
  * that used to live only in process memory. Present only when such
  * rows exist; a journal whose roster is closed never carries it.
  */
  unsettled?: {
    usd: number;
    wireRequests: number;
    rows: Array<{
      agentRef: number;
      scope: string;
      ordinal: number;
      servedBy: ModelRef;
      role: string;
      attempt: number;
      outcome: string;
      usage: Usage;
      usd?: number;
      responseId?: string;
    }>;
  };
  /**
  * The orphaned receipt lane (RV3405): incremental provider-call rows
  * of agents whose TERMINAL entry does not cover them. The window is
  * real: the loop journals a receipt as each wire settles (RV2008),
  * the turn checkpoint lands later, and a crash between the two
  * resumes from a checkpoint that never saw the paid wire, so the
  * settled terminal's record set forgets the payment while the
  * receipt lane remembers it. Real money, priced and summed apart
  * from the settled totals exactly like `unsettled` (run_settle stays
  * the billing boundary); this lane is why a provider statement
  * billing that wire is explainable to the cent instead of reading as
  * a foreign row. Coverage is decided by response id when either side
  * carries one, else by the full (ordinal, servedBy, attempt,
  * outcome) coordinate plus byte equal usage: after a resume the
  * redispatched wire REUSES the ordinal, and reading the replacement
  * as the orphan would silently absorb the double payment the resume
  * honestly made. Present only when such rows exist; a journal
  * without a mid turn crash never carries it.
  */
  orphanedReceipts?: {
    usd: number;
    wireRequests: number;
    rows: Array<{
      agentRef: number;
      scope: string;
      ordinal: number;
      servedBy: ModelRef;
      role: string;
      attempt: number;
      outcome: string;
      usage: Usage;
      usd?: number;
      responseId?: string;
    }>;
  };
  /**
  * The run's bounded execution scope (RV4007), lifted from the
  * genesis `execution_scope` decision: who this run executed for, as
  * the host named it, on the money document a FinOps pipeline
  * actually consumes. Absent on unscoped runs, so their exports keep
  * their bytes. The RV4205 dimensions ride the same object, and
  * `executionScopeDigest` beside it is the fixed-length join column
  * (present exactly when the genesis decision recorded one).
  */
  executionScope?: {
    tenant?: string;
    account?: string;
    project?: string;
    legalDomain?: string;
    region?: string;
    providerAccount?: string;
    sponsor?: string;
  };
  /** The canonical scope digest (RV4205), lifted from the same decision. */
  executionScopeDigest?: string;
  /**
  * The unknown-outcome intent lane (RV4006): `provider-intent`
  * decisions (the 'intent' receipt posture journals one before every
  * dispatched wire attempt) that neither a receipt row nor a settled
  * terminal's record set covers. Each row is a wire the provider may
  * have billed while this process never learned the outcome: no
  * dollars ride the lane, because inventing them would be the exact
  * lie the posture exists to prevent; reconcile against the provider
  * statement by fingerprint and coordinates instead. Absent when no
  * intent is open, so every other invoice keeps its bytes.
  */
  openIntents?: {
    count: number;
    rows: Array<{
      seq: number;
      scope: string;
      agentRef: number;
      ordinal: number;
      attempt: number;
      servedBy: string;
      requestFingerprint?: string;
    }>;
  };
}
/** One open provider wire intent (RV4006). */
interface OpenWireIntent {
  seq: number;
  scope: string;
  agentRef: number;
  ordinal: number;
  attempt: number;
  servedBy: string;
  requestFingerprint?: string;
}
/**
* The open provider wire intents of a journal (RV4006): every
* `provider-intent` decision with neither a `provider-call` receipt
* row nor a settled terminal record covering its (agentRef, ordinal,
* attempt). ONE pairing rule, shared by the invoice's `openIntents`
* lane and the resume refusal, the dispatchProjectionReserveUsd
* precedent: the linter and the gate cannot drift.
*/
declare function openWireIntentsOf(entries: readonly JournalEntry[]): OpenWireIntent[];
/**
* The pure invoice fold. Pass the same entries and price table you
* would pass `costReportFromJournal`; the totals are that report's
* gross/net split verbatim. To make the export historically stable
* against price-table updates, pass the priceUsd rebuilt by
* `journalPricingSnapshot` and declare it via `options.pricing` (RV407);
* without a snapshot the fold prices at the current table's rates,
* exactly as before.
*/
declare function invoiceFromJournal(entries: readonly JournalEntry[], priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined, options?: {
  pricing?: InvoicePricingProvenance;
}): InvoiceExport;
//#endregion
//#region src/engine/reconcile-statement.d.ts
/** The four billing components a provider statement itemizes. */
type BillingComponent = "input" | "cached-input" | "cache-write" | "output";
/**
* One normalized per-request row of a usage/billing export. `usd` is
* the row's billed dollars where the export carries amounts;
* `componentsUsd` its per-component split where it carries one; `usage`
* the provider-reported token counts where it carries those. A row must
* carry at least one of the three, and every row needs the provider's
* response id, the join key.
*/
interface StatementRequestRow {
  responseId: string;
  /** Provider-side model name (without the adapter prefix); optional. */
  model?: string;
  usd?: number;
  componentsUsd?: Partial<Record<BillingComponent, number>>;
  usage?: {
    inputTokens?: number;
    cachedInputTokens?: number;
    cacheWriteTokens?: number;
    outputTokens?: number;
  };
}
/** One per-model per-component total: the Spend categories shape. */
interface StatementCategoryRow {
  model: string;
  component: BillingComponent;
  usd: number;
}
/** A normalized provider export: never a headline total. */
type ProviderStatement = {
  kind: "requests";
  rows: readonly StatementRequestRow[];
} | {
  kind: "categories";
  rows: readonly StatementCategoryRow[];
};
interface ReconcileStatementOptions {
  /** Our rate card, the same resolution the engine prices with. */
  pricingOf: (servedBy: ModelRef) => Pricing | undefined;
  /**
  * Per-component divergence threshold in USD. The default 0.005
  * absorbs the dashboard's 3-decimal rounding (at most 0.0005 per
  * figure) with an order of margin, while any real rate-card
  * divergence on a run worth reconciling sits orders above it.
  */
  componentToleranceUsd?: number;
  /**
  * Totals threshold for a per-request export that carries row dollars
  * but no per-component split; default 0.01.
  */
  totalToleranceUsd?: number;
  /** Provider-side model name of a served ref; default strips the adapter prefix. */
  modelOf?: (servedBy: ModelRef) => string;
  /**
  * How provider-reported token counts weigh on the verdict (RV903).
  * 'verdict' (default): any token disagreement between the export and
  * our recorded usage is a divergence, because our counts ARE the
  * provider's own wire-reported numbers, so an export that disagrees
  * with them describes a different request than the wire served, and
  * dollars derived from either cannot be trusted to mean the same
  * thing. 'informational' preserves the pre-v1.126 dollar-only
  * verdict for exports whose token semantics legitimately differ from
  * the wire's (a different cache accounting, rounded aggregates):
  * mismatches are still counted and sampled, but only dollar deltas
  * decide.
  */
  tokenComparison?: "verdict" | "informational";
}
/** One (model, component) line of the reconciliation. */
interface ComponentDelta {
  model: string;
  component: BillingComponent;
  /** Our token base for the component, from the invoice rows' usage. */
  ourTokens: number;
  /** Our dollars, from the shared price decomposition (priceComponentsOf). */
  ourUsd: number;
  /** The statement's dollars; absent when the export does not carry this line. */
  statementUsd?: number;
  deltaUsd?: number;
  /** statementUsd over ourTokens, per MTok: the rate the provider ACTUALLY applied. */
  impliedUsdPerMTok?: number;
  /** ourUsd over ourTokens, per MTok: our effective rate over the same base, tier mix included. */
  effectiveUsdPerMTok?: number;
  divergent: boolean;
}
interface StatementCoverage {
  /** Invoice rows carrying usage or dollars: the billable set. */
  billableRows: number;
  rowsWithResponseId: number;
  /** Requests mode: rows the export covered. Categories mode: equals billableRows (totals claim the set). */
  matchedRows: number;
  unmatchedRows: number;
  /** First unmatched response ids (at most 20), requests mode. */
  unmatchedIdSample: string[];
  /** Statement rows matching nothing of ours: ids (requests) or model names (categories). */
  statementOnlyRows: number;
  statementOnlyIdSample: string[];
  complete: boolean;
}
interface StatementReconciliation {
  mode: "requests" | "categories";
  coverage: StatementCoverage;
  totals: {
    ourUsd: number;
    statementUsd?: number;
    deltaUsd?: number;
  };
  /** Every (model, component) line, models sorted, components in canonical order. */
  components: ComponentDelta[];
  /** The lines beyond tolerance, largest |delta| first: the named divergences. */
  divergent: ComponentDelta[];
  /**
  * Token disagreements between the export and our recorded usage
  * (requests mode). Under the default tokenComparison 'verdict' any
  * mismatch makes the verdict 'divergence'; under 'informational' the
  * count and sample still report, advisory only (RV903).
  */
  tokenMismatches: number;
  tokenMismatchSample: Array<{
    responseId: string;
    field: string;
    ours: number;
    statement: number;
  }>;
  /** Models the rate card does not cover: declared, excluded from divergence. */
  unpricedModels: string[];
  /** Rows whose usage the ledger never saw (usageUnknown): counted apart, never folded. */
  usageUnknownRows: number;
  componentToleranceUsd: number;
  verdict: "match" | "divergence" | "partial-coverage" | "no-overlap";
  /**
  * How much of the MATCHED statement claims money (RV3306):
  * 'complete' when every matched export row (requests mode) or every
  * component line (categories mode) carries a dollar claim, a row
  * total or a component split; 'partial' when some do; 'none' when
  * the statement matched on identity and usage alone, or matched
  * nothing. Kept apart from row coverage on purpose: coverage says
  * the records line up, this says whether the provider actually
  * stated dollars over them.
  */
  dollarCoverage: "complete" | "partial" | "none";
  /**
  * The settlement-grade composite, first class (RV1006): true exactly
  * when the verdict is 'match' AND coverage is complete AND no row's
  * usage is unknown AND no model went unpriced. A 'match' alone is
  * not enough: an export can cover every KNOWN row to the cent while
  * a usage-unknown attempt still holds unattributed money, and a safe
  * consumer must not assemble this predicate by hand. The last two
  * conditions overlap today's verdict semantics deliberately: the
  * predicate states the full contract so it cannot drift apart from
  * a future verdict refinement. Note what it does NOT require: a
  * dollar claim. A usage-only export that matches on identity and
  * tokens reads `settleable: true`; gate MONETARY closure on
  * `monetarySettleable` below.
  */
  settleable: boolean;
  /**
  * The MONETARY settlement predicate (RV3306): `settleable` AND
  * complete dollar coverage. `settleable` answers "do the records
  * agree"; this answers "may money close against this statement".
  * The 2026-08-12 audit named the difference on this exact module: a
  * usage-only request export settled 'match' without one dollar of
  * provider evidence, and a finance pipeline gating on `settleable`
  * alone would have closed money against it.
  */
  monetarySettleable: boolean;
  /**
  * Statement rows explained by the invoice's receipt lanes (RV3405):
  * per request export rows whose response id matches an `unsettled`
  * or `orphanedReceipts` row of the invoice, i.e. OUR paid wires that
  * the settled rows do not carry (a crash before settle, a terminal
  * whose record set forgot the payment). Counted APART on purpose:
  * their dollars never enter the totals, the coverage, `settleable`
  * or `monetarySettleable`, because money the run did not settle must
  * not close; they exist so the statement drift is explainable to the
  * cent instead of reading as foreign rows. Present only when the
  * caller passed the lanes and at least one row matched.
  */
  receiptMatchedRows?: number;
  /** Statement side dollars over those rows, when the export claims any. */
  receiptMatchedUsd?: number;
  /** First matched receipt ids (at most 20). */
  receiptIdSample?: string[];
}
/**
* Reconciles the invoice against a normalized provider export. Pure and
* journal-free; see the module doc for the contract. Throws a typed
* ConfigError on inputs that cannot be evidence: an empty statement (a
* headline total with no rows), a request row without a response id, a
* duplicate response id on either side (an ambiguous join, statement
* rows and local invoice rows alike, RV1804), a request export whose
* rows carry neither dollars, components, nor usage, any non-finite or
* negative dollar amount, any non-integer or negative token count, a
* non-finite or negative tolerance (RV903: a statement that cannot
* be summed must refuse loudly, never verdict 'match' on NaN totals),
* or a row whose usd and componentsUsd contradict each other beyond
* totalToleranceUsd (RV1005: an internally contradictory export is
* not evidence either).
*/
declare function reconcileStatement(invoice: {
  rows: readonly InvoiceRow[];
  /**
  * The invoice's receipt lanes (RV3405), passed straight off the
  * InvoiceExport when the caller wants statement rows for crashed
  * or terminal forgotten wires EXPLAINED instead of counted
  * foreign. Requests mode only (the join is by response id), and
  * strictly opt in: a bare `{ rows }` invoice reads byte for byte
  * as before.
  */
  unsettled?: {
    rows: ReadonlyArray<{
      responseId?: string;
    }>;
  };
  orphanedReceipts?: {
    rows: ReadonlyArray<{
      responseId?: string;
    }>;
  };
}, statement: ProviderStatement, options: ReconcileStatementOptions): StatementReconciliation;
/**
* Column mapping for {@link statementFromRows}: each field names the
* KEY in the caller's raw rows that carries the value. Provider export
* formats change without notice and differ per tenant surface (CSV
* headers, JSON field names, locale-shaped numbers), so this module
* deliberately ships NO per-provider schema knowledge: the caller
* states the mapping in one place and the normalizer applies one
* fail-closed validation to whatever the export actually contained,
* naming the row and the column of anything that cannot be evidence.
*/
interface StatementColumnMap {
  /** Key of the provider response id; required for `kind: 'requests'`. */
  responseId?: string;
  /** Key of the provider-side model name. */
  model?: string;
  /** Key of the row's billed dollars; for `kind: 'categories'` required. */
  usd?: string;
  /** Key of the billing component name; required for `kind: 'categories'`. */
  component?: string;
  /** Keys of the provider-reported token counts. */
  inputTokens?: string;
  cachedInputTokens?: string;
  cacheWriteTokens?: string;
  outputTokens?: string;
  /** Keys of a per-component dollar split, one column per component. */
  componentsUsd?: Partial<Record<BillingComponent, string>>;
}
/**
* Normalizes raw keyed rows (a parsed CSV, a JSON export) into a
* {@link ProviderStatement} under one explicit {@link StatementColumnMap}
* (RV1703). Fail-closed at the cell: a mapped column whose value cannot
* be evidence (a non-numeric dollar figure, a fractional or negative
* token count, an empty response id, an unknown component name) refuses
* typed with the row index and column name instead of flowing a NaN or
* a guess into the reconciliation. Absent cells (missing key, null,
* empty string) mean "the export does not carry this figure" and simply
* omit the field; a requests row that ends up carrying no dollars, no
* component split, and no usage at all is refused, because a row
* without evidence cannot reconcile anything.
*/
declare function statementFromRows(input: {
  kind: "requests" | "categories";
  rows: readonly Record<string, unknown>[];
  map: StatementColumnMap;
}): ProviderStatement;
/** How {@link statementRowsFromDelimited} splits cells; default ','. */
interface DelimitedStatementOptions {
  delimiter?: "," | ";" | "	" | "|";
}
/**
* Parses a delimited billing export (the CSV/TSV a provider console
* hands a host) into the header-keyed rows {@link statementFromRows}
* consumes (RV2908). The library deliberately hard-codes NO provider's
* export format: the host owns the column map, this owns only the
* delimited grammar, and the pair closes the last manual step between
* a downloaded export and {@link reconcileStatement}.
*
* Fail-closed at the record, like the rest of this module: a data row
* whose cell count differs from the header, a quote opened and never
* closed, a stray quote inside an unquoted cell, an empty or duplicate
* header name, all refuse typed with the line instead of flowing a
* shifted column into a reconciliation, because a column shifted one
* to the left prices `outputTokens` as dollars and calls it evidence.
* RFC 4180 quoting is honored (quoted cells may carry the delimiter,
* doubled quotes, and line breaks); CRLF and lone LF both delimit
* records; one trailing empty line is an artifact of every exporter
* and is ignored. Cells come back as raw strings, so an empty cell
* reads as "the export does not carry this figure" downstream, exactly
* the absence contract `statementFromRows` documents.
*/
declare function statementRowsFromDelimited(text: string, options?: DelimitedStatementOptions): Record<string, string>[];
//#endregion
//#region src/engine/persisted-terminal.d.ts
/**
* Why no persisted terminal could be served. `unsettled`: the journal
* carries no run settle, so nothing durable records a terminal (a run
* still in flight elsewhere, a segment fenced out by a successor
* (RV1009), or a settlement write that failed). `not-terminal`: the
* journaled settle is not the journal's last word, either because it
* records a status that is not terminal (a run whose latest segment is
* still running) or because entries continued PAST it (RV1407: a
* detached resolution awaiting its resume, or a successor segment over
* a stale settle), which is exactly the evidence `auditRun` derives a
* non-terminal status from. `unknown-workflow`: nothing names the
* workflow the terminal belongs to, and an envelope that invented one
* would be a lie on its most-read field. `malformed-envelope` (RV3903):
* the rebuilt envelope failed the runtime contract gate
* (`parseTerminalEnvelope`), which means the journal bytes this fold
* read produced values the terminal contract forbids (NaN money, a
* negative counter, an unknown status literal); the reconstruction is
* withheld typed instead of served green, and the message names the
* field and the defect.
*/
type PersistedTerminalRefusal = "unsettled" | "not-terminal" | "unknown-workflow" | "malformed-envelope";
/** The reconstruction verdict: an envelope, or a typed refusal. */
type PersistedTerminalResult = {
  available: true;
  envelope: TerminalEnvelope;
} | {
  available: false;
  reason: PersistedTerminalRefusal;
  message: string;
};
/**
* Rebuilds one run's terminal envelope from its journal (RV1209).
* `priceUsd` is the caller's composed pricing, exactly what the cost
* endpoint passes: the settle's pinned rows composed over the host's
* current table, so a rebuilt envelope reports the dollars the run
* settled at rather than today's rates.
*/
declare function persistedTerminalEnvelope(input: {
  runId: string;
  meta: RunMeta | undefined;
  entries: readonly JournalEntry[];
  priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined;
}): PersistedTerminalResult;
//#endregion
//#region src/engine/preflight.d.ts
/**
* One intended spawn of the wave under estimation: the same layers the
* engine reads at ctx.agent time (call limits over profile limits over
* engine defaults; call estCost over profile estCost over the priced
* estimate over the flat default), plus the two stand-ins a static
* estimate needs: `estInputTokens` replaces the adapter countTokens the
* runtime would call over the real prompt, and `count` declares how
* many spawns of this shape the first wave holds.
*/
interface PreflightSpawnSpec {
  /** Display label; defaults to the role name. */
  label?: string;
  /** Default 'loop', exactly like ctx.agent. */
  role?: InvocationRole;
  /** A registered AgentProfile name from defaults.profiles. */
  profile?: string;
  /** Wins over the profile model over defaults.routing[role]. */
  model?: ModelSpec;
  /** The call-layer limits, merged exactly like AgentOpts.limits. */
  limits?: UsageLimits;
  /**
  * The declared admission estimate. In a PLAIN wave this is
  * AgentOpts.estCost verbatim. In an orchestrate wave (an
  * `orchestrator` spec is present) a spawn tool has no per-call
  * estCost channel, so declare the agentType PROFILE's estimate here:
  * the layer-2 spawn gate evaluates exactly that (or the flat
  * default), never the priced estimate.
  */
  estCost?: number;
  /**
  * The spawn's explicit budget, exactly the spawn_agent `budgetUsd`
  * param. Consumed by the layer-2 spawn-gate projection only (the
  * shared `dispatchProjectionReserveUsd` clamp); a dynamic spawn's
  * budget never becomes an account, so the layer-1 chain reserve is
  * NOT clamped by it, exactly like the runtime.
  */
  budgetUsd?: number;
  /**
  * The prompt-size stand-in for the runtime's adapter countTokens:
  * feeds the priced admission estimate and the per-turn and quota
  * exposure floors. Absent, the reserve falls through to the flat
  * default exactly like a runtime spawn whose adapter cannot count.
  */
  estInputTokens?: number;
  /** How many spawns of this shape the wave declares; default 1. */
  count?: number;
  /**
  * The declared evidence contract this spawn must fill (RV303): wins
  * over the registered profile's declaration. The estimator compares
  * the call floor (`minEntries * estCallsPerEntry + overheadCalls`,
  * defaults 3 and 8) against the spawn's effective executed-call
  * ceiling and warns `tool-cap-below-evidence-floor` when the cap
  * cannot fit the contract.
  */
  evidenceContract?: EvidenceContract;
}
/** The OrchestrateOptions slice the estimator consumes. */
interface PreflightOrchestratorSpec {
  budget?: OrchestratorBudgetSpec;
  /** The per-orchestrate spawn cap, exactly OrchestrateOptions.maxSpawns. */
  maxSpawns?: number;
  /** The orchestrator agent's own limits, exactly OrchestrateOptions.limits. */
  limits?: UsageLimits;
  /**
  * The prompt-size stand-in for the UNCAPPED orchestrator's priced
  * admission estimate (the goal prompt the runtime would countTokens).
  * A CAPPED orchestrator ignores it: its admission estimate is the
  * shared exact-fill hint (effectiveCap minus the committed finalize
  * carve-out), exactly the live dispatch.
  */
  estInputTokens?: number;
  /**
  * Whether the orchestration runs under a plan extension (PlanRunner):
  * only extension runs commit the finalize reserve against the run
  * root, so only they subtract it from spawn-admission headroom.
  */
  extension?: boolean;
  /**
  * The OrchestrateAcceptance slice the estimator judges (RV305):
  * declaring it lets preflight relate capped children to the salvage
  * arms. Absent, the salvage findings stay silent, exactly like every
  * other undeclared input.
  */
  acceptance?: {
    childPolicy?: "all-ok" | {
      minSuccessful: number;
    };
    acceptPartialChildren?: boolean;
    acceptValidatedTerminalOutputOnLimit?: boolean;
    /**
    * Mirrors OrchestrateAcceptance.minSpawnedChildren (RV1901, the
    * four-role benchmark's primary defect): declaring it lets the
    * admission projection judge whether the declared wave can seat
    * the roster the acceptance policy demands, instead of green-
    * lighting a wave the settle verdict is bound to reject.
    */
    minSpawnedChildren?: number;
  };
  /**
  * The separate synthesis invocation (RV-211), when the orchestration
  * configures one (the v1.71 experiment review: the run ceiling used
  * to stop at the coordination loop, undercounting the synthesis
  * turns). `limits` mirrors OrchestrateSynthesis.limits exactly
  * (absent = the DEFAULT_SYNTHESIS_MAX_TURNS invocation), `model`
  * mirrors its model override (absent = defaults.routing.synthesize),
  * and `estInputTokens` is the prompt-size stand-in for the derived
  * synthesis prompt. When `finishValidation.repairTurnReserve` is
  * declared, the reserve folds into THIS invocation's projected turns,
  * because the validators bind the synthesis finish.
  */
  synthesis?: {
    model?: ModelSpec;
    limits?: UsageLimits;
    estInputTokens?: number;
    /**
    * Mirrors OrchestrateSynthesis.estCost (RV4001): the declared
    * price of one composition, the armed repair round's second
    * invocation among them. The `acceptanceReserve` block prices the
    * round's composition at exactly this figure, the same term the
    * RV3907 runtime gate holds, so declaring it here is what makes
    * the preflight verdict and the boot verdict one number.
    */
    estCost?: number;
    /**
    * Mirrors OrchestrateSynthesis.exposeChildResultTools (the v1.74
    * experiment review, P0.2): declaring it lets the evidence
    * asymmetry check see that the synthesis model can page the full
    * child outputs the validators judge against.
    */
    exposeChildResultTools?: boolean; /** Mirrors OrchestrateSynthesis.context; default 'digests'. */
    context?: "digests" | "full";
  };
  /**
  * The claim-consistency judge's admission estimate (RV2106), exactly
  * OrchestrateClaimConsistency.judge.estCost: the post-fan-in judge
  * admits against the ORCHESTRATOR account, whose working room past
  * the held synthesis reserve the coordination loop's own turns spend
  * from first. Declaring the estimate lets the estimator judge that
  * room statically (`orchestrator-working-room`); absent, the finding
  * stays silent, exactly like every other undeclared input.
  */
  claimConsistency?: {
    judge?: {
      estCost?: number;
    };
    /**
    * Mirrors OrchestrateClaimConsistency.onFound (RV3402). Declaring
    * `'repair'` prices the bounded post judge round (RV3307) into the
    * static arithmetic: the working room adds one more judge pass and
    * one more composition (priced at the declared
    * `budget.synthesisReserveUsd`, the host's own estimate of one
    * composition), and the tail spawn count adds the round's two
    * invocations. The 2026-08-12 comparison shape motivates the
    * polarity: a ceiling sized to the exact plan converts a triggered
    * repair into the typed decline, and preflight should say so
    * before the first wire, not the journal after the last. Pairings
    * orchestrate() refuses at intake (repair at the draft stage,
    * repair without a synthesis, carry at the final stage, RV3301)
    * surface as error findings: the run would refuse to start. This
    * static arithmetic has a runtime twin (RV3701): at the moment a
    * round actually dispatches, the engine holds the money of the round's second judge pass
    * (this same `judge.estCost` first, else the run's own observed
    * post draft judge price) until that pass admits, so the
    * declared estimate is not only judged before the run but enforced
    * inside it. The mechanical leg has the same twin (RV3802): the
    * one repair turn the round's finish contract can grant is held as
    * `finishValidation.estRepairCostUsd` (else the run's observed
    * last mechanical repair price) beside the verdict money, released
    * to the round's finish loop at its first verdict; the runtime
    * enforcement of the `repairTurnReserve` turn grant's price.
    */
    onFound?: "report" | "carry" | "fail" | "repair";
    /**
    * Mirrors OrchestrateClaimConsistency.stage (RV3402): `'both'`
    * dispatches the judge twice at worst, and the working room and
    * tail spawn arithmetic price passes, not declarations. Absent
    * keeps the historical one pass reading byte for byte.
    */
    stage?: "draft" | "final" | "both";
  };
  /**
  * The citation entailment audit's admission slice (RV4004), exactly
  * OrchestrateCitationAudit's judge estimate and posture: the audit
  * judge pays one pass (two under its own armed round, which also
  * arms the round composition term and one more claim rejudge when a
  * claim pass is declared past the draft), and the acceptanceReserve
  * block prices it with the SAME shared formula the runtime gate
  * holds. Absent keeps every figure byte identical.
  */
  citationAudit?: {
    judge?: {
      estCost?: number;
    };
    onFound?: "report" | "repair" | "fail";
  };
  /**
  * Mirrors OrchestrateOptions.maxTotalRepairRounds (RV4406): the one
  * run-wide pool every provider-dispatching repair grant consumes
  * from. Declaring it lets the estimator judge the pool against the
  * armed semantic round and the mechanical grants that share it
  * (RV4705): the eighth comparison rerun's mechanical composition
  * repair drained a one-token pool before the judges ruled, and the
  * armed round was refused over 38 standing findings; preflight said
  * nothing. Absent keeps the report and findings byte identical.
  */
  maxTotalRepairRounds?: number;
  /**
  * Mirrors OrchestrateOptions.maxSemanticRepairRounds (RV4705): the
  * scoped semantic reserve inside the pool. Declared beside a total
  * pool it shrinks the mechanical allowance the findings judge;
  * greater than the total mirrors the intake ConfigError as an error
  * finding, because the run would refuse to start.
  */
  maxSemanticRepairRounds?: number;
  /**
  * The `reserve-line-headroom` threshold in coordination turn floors
  * (RV2201; previously hardwired to 2): the finding warns when the
  * admitted wave's steady state sits closer to the reserve line than
  * this many coordination turn floors. Raise it for waves whose
  * children routinely overrun their declared estimates; 0 silences
  * the finding entirely. Default 2.
  */
  headroomTurns?: number;
  /**
  * The `ceiling-headroom-thin` threshold as a fraction of the ceiling
  * (RV3208, the 2026-08-11 experiment's admission cliff: a $7.00
  * ceiling over a $6.80 required minimum left 2.86 percent headroom,
  * and a small pricing or context drift would have refused the whole
  * workflow at admission). The finding warns when
  * `ceilingHeadroomShare` sits below this fraction. A number in
  * [0, 1]; 0 (the default) keeps the finding silent, so declared
  * configs are byte identical until a host opts in.
  */
  minCeilingHeadroomShare?: number;
  /**
  * What a breached headroom floor emits (RV3310). The default
  * 'warning' keeps RV3208's behavior byte for byte: advisory, and a
  * host that only throws on errors sails past it. 'error' makes the
  * breach blocking for exactly such hosts: the 2026-08-12 comparison
  * harness threw on error findings only, its 2 percent floor held
  * against a 2.857 percent headroom, and the assurance answer to
  * "this plan is too thin to survive drift" must be refusal before
  * the first wire, not a line in a report nobody gates on.
  * Meaningful only beside a positive `minCeilingHeadroomShare`.
  */
  ceilingHeadroomSeverity?: "warning" | "error";
}
/** The full input: engine surface, run surface, and the declared wave. */
interface PreflightInput {
  /** The same object createEngine would receive (adapters used for pure caps() only). */
  engine?: Partial<Pick<CreateEngineOptions, "adapters" | "defaults" | "budgetDefaults" | "concurrency" | "quota" | "pricing">>;
  /** The RunOptions slice: the ceiling, run-level limits, and the RV711 exposure cap. */
  run?: Pick<RunOptions, "budgetUsd" | "limits" | "maxInFlightExposureUsd">;
  /** Present when the run is a dynamic orchestration. */
  orchestrator?: PreflightOrchestratorSpec;
  /** The declared first spawn wave, in admission order. */
  spawns?: PreflightSpawnSpec[];
  /**
  * The quota rule set behind the configured limiter, when the host
  * uses a rule-driven implementation (memoryQuotaLimiter,
  * SqliteQuotaLimiter): the SPI hides rules behind reserve(), so the
  * demand comparison needs them declared here.
  */
  quotaRules?: readonly QuotaRule[];
  /**
  * The opt in finish validation self test (the v1.71 experiment
  * review, P1.1). Programmatic only: validator functions cannot ride
  * a JSON config file, so the CLI never carries this. When present,
  * preflight runs the SAME golden self test orchestrate runs at
  * construction and reports every drift as an error finding instead
  * of throwing, so a planner surfaces it next to the quota and budget
  * findings: 'output-contract-validator-mismatch' for containment and
  * accept-side drift, 'output-contract-validator-weakened' (cycle 74)
  * when a configured validator fails the contract's per validator
  * reject golden, the same-name weakened replacement.
  */
  finishValidation?: {
    validators: FinishValidator[];
    contract?: FinishContract;
    selfTest?: FinishSelfTestFixtures;
    /**
    * Mirrors FinishValidationSpec.repairTurnReserve: folds the
    * declared repair headroom into the projected turns of the
    * invocation the validators bind (the synthesis invocation when
    * orchestrator.synthesis is declared, the coordination loop
    * otherwise), so the run ceiling prices the repair exchange the
    * runtime would actually grant.
    */
    repairTurnReserve?: number;
    /**
    * Mirrors FinishValidationSpec.maxRepairs (default
    * {@link DEFAULT_FINISH_MAX_REPAIRS}): with zero, the first
    * rejection is final and there is no repair exchange to fund, so
    * the repair-reserve-unfunded warning stays silent. It also SIZES
    * the mandatory synthesis tail (RV2504): every granted repair can
    * write to the output allowance, so the tail
    * `synthesis-reserve-below-cap-composition` prices is one
    * composition plus this many turns, whatever the turn reserve
    * says. Since RV3602 the bound belongs to one composition
    * invocation, so this tail is the price of EACH invocation: the
    * armed claim repair round (RV3307) runs a second invocation with
    * its own full bound, and the working room finding already prices
    * that round at the declared synthesis reserve, the host's own
    * estimate of exactly this tail.
    */
    maxRepairs?: number;
    /**
    * Mirrors FinishValidationSpec.draftPolicy (the fifth experiment,
    * cycle 75): declaring it lets the estimator compare the draft
    * gate's word floor against the contract's own word minimum. The
    * experiment gated drafts at 3200 words under a 4500 word contract,
    * so the gate admitted a draft the final validators had to reject
    * and the synthesis started from an underlength base; the
    * draft-gate-below-contract warning names exactly that shape. The
    * sentinel `'contract'` (RV808a) gates the draft by the full
    * validator set, so the below-contract shape cannot exist and the
    * warning never fires.
    */
    draftPolicy?: {
      minWords?: number;
      requireSections?: string[];
    } | "contract";
    /**
    * Mirrors FinishValidationSpec.estRepairCostUsd (RV4001): the
    * declared price of the one mechanical repair turn the finish
    * contract can grant (RV3802 holds exactly this figure live). The
    * `acceptanceReserve` block folds it into the required tail, the
    * same term the RV3907 runtime gate sums, so a declared repair
    * price is judged before the run and enforced inside it by the
    * SAME arithmetic.
    */
    estRepairCostUsd?: number;
  };
}
/** One linter verdict; `spawn` names the wave entry it is about. */
interface PreflightFinding {
  severity: "error" | "warning" | "info";
  /** Stable kebab-case code for machine consumption. */
  code: string;
  message: string;
  spawn?: string;
}
/** Per-tool executed-call ceiling and the limiter that provides it. */
interface PreflightToolCeiling {
  /** A named tool, or '(any)' for a tool no cap or cost names. */
  tool: string;
  /** Executed calls possible for this tool alone; null = unlimited. */
  ceiling: number | null;
  /** The limiter producing the ceiling, when one binds. */
  boundBy?: "maxCallsPerTool" | "toolUnits" | "maxToolCalls";
}
/** The effective picture of one declared spawn shape. */
interface PreflightSpawnReport {
  label: string;
  role: InvocationRole;
  count: number;
  /** The resolved serving target; absent when no model resolves (see findings). */
  servedBy?: ModelRef;
  /** True when the serving model has no price row: a USD ceiling cannot bound it. */
  unpriced?: true;
  /**
  * The serving row's last rates verification date (RV814), copied
  * from the resolved pricing; absent when the row names none. Every
  * dollar in this report is priced under that row, so its staleness
  * is part of the projection's honesty.
  */
  ratesVerifiedAt?: string;
  /** The SAME merge the runtime applies: call over profile over engine defaults. */
  limits: EffectiveUsageLimits;
  /** The layer-1 admission reserve this spawn would be admitted under. */
  admissionReserveUsd: number;
  /** Which arm of the reserve formula produced the number. */
  reserveSource: "estCost" | "profile-estCost" | "priced-estimate" | "flat-default" | "unpriced-zero";
  /** The per-turn output bound: caps.maxOutputTokens clamped by the limits field. */
  maxOutputTokensPerTurn?: number;
  /**
  * The cost floor of ONE turn at the declared estimates: estInputTokens
  * (default 0) plus the output bound, priced like settlement. A real
  * turn grows with the prompt, so this is a floor, never a cap.
  */
  turnFloorUsd?: number;
  /**
  * The loop's input floor over its projected turns, UNCACHED
  * (RV2007): the declared prompt floor (`estInputTokens`) re-billed
  * at the full input rate on every projected provider turn. A floor
  * over the static prefix: real prompts grow. Present when the shape
  * prices and projects more than one turn.
  */
  uncachedLoopInputFloorUsd?: number;
  /**
  * The same loop under the RV2006 cache policy: one cache write of
  * the prompt floor plus a cache read on every later turn, priced by
  * the row's cache rates. Present beside the uncached figure when
  * the row carries cache rates. The parity worker shape (36k-token
  * prompt floor, a long cycle) prices the difference at roughly
  * three to four times, the gap between four seats fitting a $6
  * envelope and three seats dying against it.
  */
  cachedLoopInputFloorUsd?: number;
  /** Executed-call ceiling across any tool mix; null = unlimited. */
  executedToolCallCeiling: number | null;
  /**
  * The provider-call ceiling of ONE spawn's whole loop: maxTurns
  * bounded by the executed-call ceiling plus its final no-tool turn,
  * plus the finalization summary turn when a tool budget limiter arms
  * it. Every provider turn is one wire request and one quota
  * reservation, so this is the per-spawn multiplier of quota demand;
  * retries sit on top of it.
  */
  projectedProviderTurns: number;
  /** Per-tool ceilings for every tool a cap or a unit cost names. */
  toolCeilings: PreflightToolCeiling[];
}
/** One wave entry of the admission projection. */
interface PreflightAdmissionRow {
  label: string;
  reserveUsd: number;
  admitted: boolean;
  deniedBy?: "budget" | "spawn-cap" | "orchestrator-max-spawns";
  /**
  * The run-root money already held when this row was evaluated:
  * committed reserves of the earlier rows plus the finalization and
  * synthesis carve-outs (RV1901). The row admits iff held + reserveUsd
  * fits the ceiling (children strictly below it at exact fill), so a
  * denied row's arithmetic is auditable term by term. Present only
  * under a USD ceiling.
  */
  heldAtEvaluationUsd?: number;
}
/** The machine-readable preflight report; JSON-serializable throughout. */
interface PreflightReport {
  concurrency: {
    perRun: number;
    perProvider?: Record<string, number>;
  };
  budget: {
    ceilingUsd?: number;
    flatReserveUsd: number;
    lifetimeSpawnCap: number;
    childBudgetFraction: number;
    maxDepth: number;
    orchestrator?: {
      /** min(capUsd, (capFraction ?? 0.2) x ceiling); absent when unresolvable. */effectiveCapUsd?: number;
      finalizeReserveUsd: number;
      finalizeTurns: number; /** Whether the finalize reserve is committed against the run root (extension runs). */
      reserveCommitted: boolean; /** The orchestrator agent's own loop ceiling, derived exactly like a spawn's. */
      projectedProviderTurns: number;
      /**
      * The separate synthesis invocation's projection, present when
      * input.orchestrator.synthesis was declared and the role
      * resolves: its turn ceiling (the repair turn reserve folded in
      * when declared) and its serving model.
      */
      synthesis?: {
        projectedProviderTurns: number;
        servedBy?: ModelRef;
      };
      /**
      * The acceptance-tail verdict (RV4001), present exactly when
      * budget.acceptanceReserve is declared: the SAME
      * acceptanceTailRequiredUsd arithmetic the RV3907 runtime gate
      * holds the boot against, term by term, so `fits` here IS the
      * gate's answer. The fifth comparison experiment ran a plan
      * preflight passed green at a $4.54 cap into a typed runtime
      * refusal at $4.82 because the two sides computed different
      * formulas; they now compute one.
      */
      acceptanceReserve?: {
        declared: "warn" | "require";
        requiredUsd: number; /** Absent when no cap resolves; the runtime then refuses under 'require'. */
        effectiveCapUsd?: number; /** Exact fill admits, exactly the runtime gate. */
        fits: boolean;
        terms: AcceptanceTailTerms;
      };
      /**
      * The run repair pool and its scoped semantic reserve (RV4705),
      * present when either bound is declared: `mechanicalAllowance`
      * is what finish-validation grants can actually draw (the total
      * minus the unspent reserve), the figure the eighth comparison
      * rerun needed before its mechanical repair ate the armed
      * round's only token.
      */
      repairPool?: {
        maxTotalRepairRounds?: number;
        maxSemanticRepairRounds?: number; /** The pool minus the reserve; absent without a declared total. */
        mechanicalAllowance?: number;
      };
    };
  };
  quota: {
    configured: boolean;
    tenant?: string;
    rules?: number;
  };
  /** The run-level merge an undeclared spawn would receive. */
  runLimits: EffectiveUsageLimits;
  spawns: PreflightSpawnReport[];
  admission: {
    ceilingUsd?: number;
    reservedForFinalizationUsd: number;
    /**
    * The synthesis payload carve-out the projection holds against the
    * run root, exactly the live commitSynthesisReserve mirror (RV1901):
    * a capped orchestrator with budget.synthesisReserveUsd registers it
    * on the root before any spawn admits, so the wave arithmetic must
    * hold it too. Zero when the orchestrator is uncapped or declares no
    * synthesis reserve, matching the runtime that then commits none.
    */
    synthesisReserveUsd: number;
    /**
    * The smallest run ceiling that seats the WHOLE declared wave
    * (RV1907): every row's reserve plus the finalization and synthesis
    * carve-outs. Children admit strictly below exact fill, so a viable
    * ceiling must sit strictly ABOVE this figure; the four-role
    * benchmark's $6.00 sat $0.98 below it and lost its third and
    * fourth workers. Present whenever the wave has rows.
    */
    requiredMinimumCeilingUsd?: number;
    /**
    * The ceiling minus the required minimum (RV3208): the absolute
    * dollars of drift the admission survives before the wave stops
    * seating. Present beside requiredMinimumCeilingUsd whenever a
    * ceiling is declared.
    */
    ceilingHeadroomUsd?: number;
    /**
    * The same headroom as a fraction of the ceiling (RV3208): the
    * one-field read of the admission cliff (the 2026-08-11 experiment
    * ran at 0.0286). Present beside ceilingHeadroomUsd on positive
    * ceilings.
    */
    ceilingHeadroomShare?: number;
    /**
    * The live-root-exposure term of the wave projection (RV2004): the
    * orchestrator's own worst-case turn floor, the money coordination
    * has ALWAYS already spent (and holds in flight) by the time any
    * spawn tool runs. The parity rerun's fourth seat fit the plain
    * wave (5.95 under 6.00) and was refused live by exactly this
    * term; the embedded spawn gate and requiredMinimumCeilingUsd now
    * carry it, so a seat that cannot admit live cannot admit in
    * preflight either. Present on orchestrate waves whose
    * coordination turn prices.
    */
    liveRootExposureTermUsd?: number;
    /**
    * The reserve line (RV2101): the run ceiling minus the synthesis
    * reserve, the boundary the budget chain fences every non-tail
    * dispatch at while the promise is held. Present when a ceiling
    * and a positive synthesis reserve are both declared.
    */
    reserveLineUsd?: number;
    /**
    * How far the admitted wave's steady state sits under the reserve
    * line (RV2101). Child spend past the declared estimates consumes
    * this headroom before the coordination loop is refused at the
    * line; under two coordination turn floors the projection warns
    * with `reserve-line-headroom`. Present beside reserveLineUsd.
    */
    reserveLineHeadroomUsd?: number;
    wave: PreflightAdmissionRow[];
    admitted: number;
    denied: number;
  };
  exposure: {
    /** Concurrent in-flight turns the declared wave can hold. */maxInFlight: number;
    /**
    * The one-more-turn cost floor past a ceiling crossing: the sum of
    * the maxInFlight most expensive declared turn floors. The
    * documented overshoot bound is one turn per in-flight agent; real
    * turns grow with the prompt, so this is the floor of that bound.
    */
    overshootOneTurnFloorUsd?: number;
    /**
    * The smallest in-flight exposure cap under which the declared wave
    * can breathe (RV1907): the finalization and synthesis carve-outs
    * plus the turn floors of the maxInFlight most expensive declared
    * dispatches, the orchestrator's own turn among them. Below it the
    * root's next turn is refused beside a full child wave, the
    * recovery arm's exact death; the RV1902 wait recovers the run, but
    * only a cap at or above this floor avoids the stall entirely.
    * Absent when no declared turn prices.
    */
    requiredMinimumExposureUsd?: number; /** Per-provider first-wave demand at the declared estimates. */
    perProvider: Record<string, {
      inFlight: number;
      requestsPerWave: number;
      tokensPerWaveFloor: number;
    }>;
    /**
    * The declared wave run to its derived turn ceilings, at the
    * declared estimates (the second experiment report, rec 9): total
    * provider calls (fan-out times per-spawn projected turns, before
    * any retries) and the cumulative token demand with the context
    * regrowing every turn (turn k re-sends the declared prompt plus
    * the k-1 prior output bounds, so K turns cost K x est +
    * outputBound x K(K+1)/2). Absent when nothing is declared.
    */
    runCeiling?: {
      requests: number;
      tokens: number;
    };
  };
  /**
  * Present when input.finishValidation was provided: the self test
  * echo. `selfTest` reflects the golden fixture run alone
  * ('skipped' = no fixture resolvable); containment drift between a
  * contract and the validator set reports through findings either
  * way.
  */
  finishValidation?: {
    contractHash?: string;
    validators: string[];
    selfTest: "passed" | "failed" | "skipped";
  };
  findings: PreflightFinding[];
}
/** Default estimated executed calls per recorded evidence entry (RV303). */
declare const DEFAULT_EVIDENCE_CALLS_PER_ENTRY = 3;
/** Default estimated non-evidence overhead calls of a research spawn (RV303). */
declare const DEFAULT_EVIDENCE_OVERHEAD_CALLS = 8;
/**
* Computes the preflight report: the effective merged limits per
* declared spawn, the layer-1 admission projection over the declared
* wave, the per-tool and weighted-unit bottleneck ordering, the
* concurrency and quota exposure at the declared estimates, and the
* linter findings. Pure: no engine is constructed, no store is opened,
* no adapter stream is dispatched, and no journal entry is written.
*/
declare function preflightEstimate(input: PreflightInput): PreflightReport;
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
* The shipped presets (fast / standard / deep / ultra "and similar").
* Data only; a review-time assertion checks the
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
* property in `required`. Boolean schemas and
* non-object shapes are trivially compatible.
*/
declare function isStrictCompatibleSchema(schema: JsonSchema | boolean): boolean;
/**
* Tier selection: the model's declared ceiling
* bounds the tier; the native tier additionally requires a
* strict-compatible canonical schema (relying on silent server-side
* fallback is forbidden), degrading to forced-tool.
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
* the planner never guesses at unregistered agentTypes. When the engine
* registers toolsets, their names render as a closing line (v1.17.0
* review P1-3): those are the ONLY values valid as string entries of a
* tools option, so the planner never invents a registry name.
*/
declare function profileCard(profiles: Record<string, AgentProfile> | undefined, toolsets?: Record<string, ToolsOption>): string;
//#endregion
//#region src/model/projector.d.ts
/**
* The RETENTION identity of an adapter (RV4007): the provider family,
* composed with the adapter's declared `scopeKey` when one exists, so
* two adapters of one family serving different accounts stop sharing
* provider-raw blocks (cache handles, thinking blocks: provider-side
* identifiers minted under one account are not portable to another).
* Adapters without a scopeKey keep the family alone, byte for byte
* the historical sharing.
*/
declare function retentionKeyOf(adapter: Pick<ProviderAdapter, "id" | "provider" | "scopeKey">): string;
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
* provider-raw parts (the retention transport). Reads
* providerMetadata[<adapter id>].retainedParts and tags each block with
* the adapter's provider family. Returns [] when the adapter shipped
* nothing.
*/
declare function liftRetainedParts(providerMetadata: Record<string, unknown> | undefined, adapter: Pick<ProviderAdapter, "id" | "provider" | "scopeKey">): Part[];
//#endregion
//#region src/runtime/compaction.d.ts
/** Compaction threshold default, 0.8 of contextWindow. */
declare const DEFAULT_COMPACTION_THRESHOLD = .8;
/** Deterministic marker opening every compaction summary message. */
declare const COMPACTION_SUMMARY_PREFIX = "Summary of the conversation so far:";
/** Per-profile compaction config (AgentProfile). */
interface CompactionConfig {
  /** Fraction of the loop model's contextWindow; default 0.8. */
  threshold?: number;
}
/**
* The threshold check (M4-T03 committed semantics): the context
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
/** The inputs of the extract-necessity rule. */
interface ExtractNecessityInput {
  /** A schema is set on the call; without one extract never fires. */
  schemaSet: boolean;
  /** The loop-resolved model. */
  loopRef: ModelRef;
  /** The extract-resolved model (same chain, role 'extract'). */
  extractRef: ModelRef;
  /** The required tier for the schema on the LOOP model. */
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
* no extra call (as amended in M4-T01).
*/
declare function needsSeparateExtract(input: ExtractNecessityInput): boolean;
/**
* True when any resolution layer configures the given role in its routing
* map. This is the finalize TRIGGER: firing is decided by the presence of
* a routing entry at any layer; the model it fires ON still resolves
* through the full chain (a higher layer's all-roles `model` may override
* the routed choice).
*/
declare function roleConfiguredInRouting(role: InvocationRole, layers: Array<ResolutionLayer | undefined>): boolean;
/**
* The finalize firing rule: only if configured in routing, and only after
* tools stop, which presupposes a non-empty toolset. A no-tools agent's
* single loop turn is already its synthesis (as amended in M4-T01). The
* caller additionally gates on the loop having
* ended without an abort: a limit/error/cancelled/escalated loop never
* reaches synthesis.
*/
declare function finalizeFires(options: {
  routed: boolean;
  toolsAvailable: boolean;
}): boolean;
/**
* The summarize trigger: the compaction threshold on the context window
* (default 0.8). Pure predicate; the compaction
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
/** Bounded semantic retries per tool call chain. */
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
//#region src/orchestrator/capacity-sheet.d.ts
/** The unit vocabulary of a sheet figure; closed on purpose. */
type CapacitySheetUnit = "wires" | "usd" | "ms" | "wires-per-minute" | "percent" | "count" | "ratio";
/** One figure of the sheet: a number, its unit, and where it came from. */
interface CapacitySheetFigure {
  name: string;
  value: number;
  unit: CapacitySheetUnit;
  provenance: "given" | "derived" | "assumption" | "observed";
  /** The formula, the source, or the assumption's own statement. */
  note?: string;
}
/** One titled section; observed figures never share one with declared. */
interface CapacitySheetSection {
  name: string;
  figures: CapacitySheetFigure[];
}
/** The closed input schema of the sheet (RV4304). */
interface CapacitySheetSpec {
  /** The declared plan; the sheet embeds {@link wireCapacityEstimate}. */
  plan: WireCapacitySpec;
  /** Expected transport retries against the base ({@link retryWireMultiplier}). */
  retries?: number;
  service?: {
    /** Concurrent wires in flight. */concurrency?: number; /** Mean service time of ONE wire, milliseconds. */
    serviceTimeMsPerWire?: number;
  };
  economics?: {
    /** Declared mean cost of one wire. */estCostPerWireUsd?: number; /** The run's declared ceiling. */
    budgetUsd?: number;
  };
  /**
  * Measured facts of a RUN (the invoice, the telemetry), rendered in
  * their own section with their source on every row and never folded
  * into the declared arithmetic: 122 observed wires beside a declared
  * 34 is a finding about the declaration, not an input to it.
  */
  observed?: {
    /** Where the numbers were measured: 'invoice', 'telemetry', a report name. */source: string;
    physicalWireRequests?: number;
    totalUsd?: number;
    wallMs?: number;
  };
}
/** The sheet: sections of labeled figures plus the named assumptions. */
interface CapacitySheet {
  /** The provenance of the whole artifact, the RV4206 literal. */
  basis: "declared-estimate";
  /** The embedded estimate, verbatim, for machine consumers. */
  estimate: WireCapacityEstimate;
  sections: CapacitySheetSection[];
  /** Named assumptions; never silently zero, never silently derived. */
  assumptions: string[];
}
/**
* Builds the capacity sheet from the closed spec (RV4304). Pure and
* deterministic; throws typed on junk. See the module doc for the
* provenance rules it enforces.
*/
declare function capacitySheet(spec: CapacitySheetSpec): CapacitySheet;
/**
* Renders the sheet as Markdown: one heading per section, one line per
* figure with its provenance label on the line, and the named
* assumptions last. A reader who quotes any single line quotes its
* provenance with it; that is the point.
*/
declare function renderCapacitySheetMarkdown(sheet: CapacitySheet): string;
//#endregion
//#region src/orchestrator/claim-map.d.ts
/** The evidentiary grades of a composed claim (P2.1's vocabulary). */
type ClaimGrade = "source" | "inference" | "assumption" | "live-observed";
/** One row of the composition's claim map. */
interface ClaimMapRow {
  /** Unique within the map; the judge and the journal address rows by it. */
  id: string;
  /** The atomic claim, one assertion, never a compound sentence. */
  claim: string;
  grade: ClaimGrade;
  /** The document anchors (`path:line`) this claim rests on; empty only on 'assumption'. */
  sourceAnchors: readonly string[];
  /** Required exactly on 'inference': the bridge lives here, the grade never replaces it. */
  inference?: {
    premises: readonly string[];
    reasoning: string;
  };
  /** Required exactly on 'live-observed': what the run itself recorded. */
  runEvidence?: string;
}
/** The map bounds; enforced by the finish schema, restated here for readers. */
declare const CLAIM_MAP_MAX_CLAIMS = 200;
declare const CLAIM_MAP_MAX_ANCHORS_PER_CLAIM = 12;
declare const CLAIM_MAP_MAX_CLAIM_CHARS = 600;
/**
* The claimMap rows' JSON schema fragment (RV4305): shape and bounds
* only. The RELATIONAL rules (anchor bidirectionality, one non-source
* row per anchor, per-grade required blocks) are
* {@link validateClaimMapStructure}'s, because a JSON schema cannot
* read the document the map describes.
*/
declare const CLAIM_MAP_ROWS_SCHEMA: SchemaSpec;
/** Extracts the document's distinct citation anchors, in order. */
declare function documentAnchorsOf(documentText: string, pattern?: string): readonly string[];
/**
* The structural verdict over a schema-valid claim map (RV4305):
* deterministic, relational, and HONEST about its own limits. Every
* reason names the offending rows or anchors so a rejected finish is
* repairable from the feedback alone. This function never judges
* whether a grade is true; that is the claim judge's question.
*/
declare function validateClaimMapStructure(rows: readonly ClaimMapRow[], documentText: string, pattern?: string): {
  ok: true;
} | {
  ok: false;
  reasons: string[];
};
/**
* The canonical form of an accepted map (RV4305): rows sorted by id
* (a stable, content-independent order), serialized by the JCS recipe
* every other canonical byte surface in this codebase uses. The
* journal decision records this form, and the hash names it.
*/
declare function canonicalClaimMap(rows: readonly ClaimMapRow[]): ClaimMapRow[];
/** sha256 over the JCS bytes of the canonical map. */
declare function claimMapHashOf(rows: readonly ClaimMapRow[]): string;
//#endregion
//#region src/orchestrator/spawn-tools.d.ts
/** The spawn_agent parameter schema (normative). */
declare const SPAWN_AGENT_SCHEMA: SchemaSpec;
/** parallel_agents wraps the spawn_agent params. */
declare const PARALLEL_AGENTS_SCHEMA: SchemaSpec;
/** await_any and await_all share one parameter shape. */
declare const AWAIT_SCHEMA: SchemaSpec;
/** The cancel_agent parameter schema. */
declare const CANCEL_AGENT_SCHEMA: SchemaSpec;
/** Default and hard-max characters per child-result / artifact page. */
declare const DEFAULT_CHILD_RESULT_PAGE_CHARS = 4e3;
declare const MAX_CHILD_RESULT_PAGE_CHARS = 2e4;
declare const GET_CHILD_RESULT_SCHEMA: SchemaSpec;
declare const READ_CHILD_ARTIFACT_SCHEMA: SchemaSpec;
declare const GET_CHILD_RESULT_TOOL_NAME = "get_child_result";
declare const READ_CHILD_ARTIFACT_TOOL_NAME = "read_child_artifact";
declare const GET_SETTLED_CHILD_RESULTS_TOOL_NAME = "get_settled_child_results";
/** get_settled_child_results (RV1807): the bulk settled-set read. */
declare const GET_SETTLED_CHILD_RESULTS_SCHEMA: SchemaSpec;
/** finish; result validates against the declared output schema. */
declare const FINISH_SCHEMA: SchemaSpec;
declare const FINISH_TOOL_NAME = "finish";
/**
* The finish schema under sectional repair (RV808b): `result` OR
* `sections`, host-enforced as exactly one (a JSON schema union would
* cost the model a worse error surface than the typed host refusal).
* `sections` maps a DECLARED marker line to the new section body; the
* host splices it into the retained rejected attempt and validates the
* reconstructed document whole. Swapped in only under the
* `finishValidation.sectionalRepair` opt-in, so the default toolset
* hash never moves.
*/
declare const FINISH_SECTIONAL_SCHEMA: SchemaSpec;
/**
* The finish schema under the claim map opt-in (RV4305):
* `synthesis.claimMap: true` makes the map a REQUIRED companion of the
* composed result, so a composition cannot ship without declaring what
* it claims and on what evidence. Swapped in only for the synthesis
* invocation under the opt-in, so the default toolset hash never
* moves; under the opt-in it moves BY DESIGN (the sectional
* precedent): the contract of the finish call changed.
*/
declare const FINISH_CLAIM_MAP_SCHEMA: SchemaSpec;
/** The spawn parameters as validated JSON (a TaskSpec subset). */
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
* vocabulary (M6-T04).
*/
declare function buildOrchestratorTools(runtime: OrchestratorRuntime, profileCardText: string, options?: {
  childResultTools?: boolean;
  sectionalFinish?: boolean;
  /**
  * The claim map finish (RV4305): the synthesis invocation's finish
  * requires a typed claimMap beside the result. Mutually exclusive
  * with sectionalFinish by orchestrate intake.
  */
  claimMapFinish?: boolean;
  /**
  * The bulk settled-set read (RV1807), its own opt-in: adding a tool
  * under the existing childResultTools flag would move every
  * opted-in run's toolset hash and re-key their resumes, so the new
  * tool re-keys only runs that opt into IT.
  */
  settledResultsTool?: boolean; /** The parallel_agents admission policy (RV1908); default 'fail-fast'. */
  parallelAdmission?: "fail-fast" | "try-all" | "all-or-none";
  /**
  * The batch projection seam (RV1908): the live remainder and the
  * per-task dispatch projection the embedded gate itself uses, plus
  * the run's admitted-children count and the declared acceptance
  * roster floor. Runtime behavior only, never part of the tool
  * schema or description, so toolset hashes stay byte identical.
  */
  batchGate?: {
    rosterFloor?: number;
    admittedChildren: () => number;
    projectionUsd: (task: SpawnAgentParams) => number;
    remainderUsd: () => number | undefined;
  };
}): ToolDef[];
//#endregion
//#region src/orchestrator/citation-audit.d.ts
/** One sampled citation occurrence, before any verdict. */
interface CitationAuditRow {
  /** Zero-based row index, the judge's addressing. */
  row: number;
  /** The owning H2 marker, or '' for text above the first heading. */
  section: string;
  /** The citing sentence, verbatim. */
  sentence: string;
  /** The raw citation text as it appears in the sentence. */
  anchor: string;
  path: string;
  line: number;
  /** The range end when the citation is `path:start-end`. */
  endLine?: number;
  /**
  * Which anchor of a compound sentence this row audits (RV4208,
  * resolver v2 only): zero-based, in sentence order. Resolver v1
  * samples only a sentence's FIRST anchor, so the field is absent
  * there and on every earlier row.
  */
  anchorOrdinal?: number;
  /**
  * The claim clause NEAREST this row's anchor (RV4208, resolver v2
  * only): the sentence segment, split at clause boundaries, that
  * contains the anchor. A compound sentence cites three files for
  * three different claims; judging each anchor against the WHOLE
  * sentence asks whether the lines entail claims they were never
  * cited for.
  */
  clause?: string;
  /**
  * The resolved lines, `L<n>: <text>` per line. Absent when the
  * FIRST cited line does not resolve in the host snapshot, which is
  * itself an unsupported verdict: a citation nothing resolves is not
  * provenance (the citedValueValidator doctrine).
  */
  excerpt?: string;
  /**
  * What resolver v2 excerpted (RV4208): the bounded logical unit's
  * type, its line count, and whether the caps clipped it. Absent
  * under resolver v1, whose window is fixed and self-describing.
  */
  unit?: CitationExcerptUnit;
}
/** The bounded logical unit resolver v2 excerpts (RV4208). */
interface CitationExcerptUnit {
  /**
  * 'section' a heading plus its body to the next heading; 'list-item'
  * a list marker plus its continuation lines (a comment-internal list
  * item counts, judged on its prefix-stripped text, RV4401);
  * 'table-row' a table row with its header pair when adjacent, or a
  * header anchor with the body it names; 'comment-declaration' a code
  * comment block plus the declaration it documents; 'paragraph' a
  * blank-line-delimited run, the default.
  */
  type: "section" | "list-item" | "table-row" | "comment-declaration" | "paragraph";
  /** Lines the excerpt carries. */
  lines: number;
  /** Present when the line or char caps clipped the unit. */
  truncated?: true;
}
/** One judged (or mechanically decided) non-supported citation. */
interface CitationAuditFinding {
  row: number;
  section: string;
  sentence: string;
  anchor: string;
  verdict: "partial" | "unsupported";
  reason: string;
}
/** The per-section slice of the audit meta. */
interface CitationAuditSectionMeta {
  sampled: number;
  supported: number;
  partial: number;
  unsupported: number;
}
/** The declared audit options, exactly OrchestrateCitationAudit. */
interface CitationAuditPlanOptions {
  /** Overrides {@link DEFAULT_CITATION_PATTERN}; must expose `path:line[-end]`. */
  pattern?: string;
  /** Sampled citing sentences per H2 section; default 2, the judge's own method. */
  samplePerSection?: number;
  /** The hard whole-document ceiling; default 24, the judge's own budget. */
  maxSampled?: number;
  /** Lines after the cited line an excerpt may carry; default 3. */
  window?: number;
  /**
  * The resolver generation (RV4208): 1, the default, is the fixed
  * downward window above, byte identical for every existing config.
  * 2 excerpts the bounded LOGICAL UNIT the cited line belongs to
  * ({@link citationUnitExcerptOf}) and audits EVERY anchor of a
  * compound sentence as its own row against its nearest claim
  * clause. The sixth comparison experiment's false negatives were
  * exactly window artifacts: a section heading whose support lives
  * below the window, and only a sentence's first anchor ever
  * sampled. Opt-in because the sample derives from the document
  * hash: v2 changes which rows exist and what the judge reads, so a
  * declared config must choose it.
  */
  resolver?: 1 | 2;
  /**
  * What the audit judges (RV4407): 'sample' (the default) keeps the
  * deterministic stratified sample above byte for byte; 'all'
  * judges EVERY anchor row of the document, no per-section pick and
  * no `maxSampled` ceiling, so the verdict is a census instead of a
  * sample. Requires resolver 2 (the census enumerates every anchor
  * of every citing sentence, which is v2's row semantics), and one
  * judge invocation still carries all rows: the cost scales through
  * the prompt, so size `judge.estCost` for the whole document.
  * The seventh comparison experiment's improvement plan asked for
  * exactly this census for regulated classes.
  */
  auditScope?: "sample" | "all";
}
declare const DEFAULT_CITATION_SAMPLE_PER_SECTION = 2;
declare const DEFAULT_CITATION_MAX_SAMPLED = 24;
declare const DEFAULT_CITATION_EXCERPT_WINDOW = 3;
/** Excerpt bounds, the claim-pass excerpt discipline (resolver v1). */
declare const MAX_CITATION_EXCERPT_LINES = 12;
declare const MAX_CITATION_EXCERPT_CHARS = 800;
/**
* Resolver v2's unit bounds (RV4401). A unit excerpt exists to carry
* the WHOLE bounded logical unit, so its caps must fit the package's
* typical docstrings and guide sections: the seventh comparison
* experiment's one section false negative was a section cut mid-unit
* by the v1-sized char cap, with the supporting line right past the
* cut. Resolver v1 keeps its own smaller bounds byte for byte.
*/
declare const MAX_CITATION_UNIT_EXCERPT_LINES = 20;
declare const MAX_CITATION_UNIT_EXCERPT_CHARS = 1600;
/**
* Validates the declared plan numbers; returns the resolved bounds.
* Garbage throws like every malformed intake.
*/
declare function resolveCitationAuditPlan(options: CitationAuditPlanOptions): {
  pattern: string;
  samplePerSection: number;
  maxSampled: number;
  window: number;
  resolver: 1 | 2;
  auditScope: "sample" | "all";
};
/**
* The deterministic stratified sample (RV4004): per H2 section, up to
* `samplePerSection` citing sentences, selected by a hash chain seeded
* from the audited document's own hash, so the same candidate always
* yields the same sample (replay-stable, no clock, no randomness) and
* a repaired candidate re-samples afresh from its new hash. The whole
* sample is capped at `maxSampled` by pick rank across sections (every
* section's first pick seats before any section's second), so a
* many-section document degrades to one citation per section instead
* of auditing the first sections only.
*/
declare function sampleCitationRows(document: string, plan: {
  pattern: string;
  samplePerSection: number;
  maxSampled: number;
  resolver?: 1 | 2;
  auditScope?: "sample" | "all";
}, seed: string): Omit<CitationAuditRow, "excerpt">[];
/**
* The claim clause nearest an anchor (RV4208): the sentence segment,
* cut at clause boundaries (';' or ',' followed by whitespace), that
* contains the anchor position. Pure text arithmetic, no NLP: the
* point is to hand the judge the claim half the anchor was cited FOR
* instead of the whole compound sentence.
*/
declare function clauseAround(sentence: string, anchorIndex: number): string;
/**
* Resolves one sampled citation's excerpt through the host's pure
* snapshot resolver. The FIRST cited line failing to resolve returns
* undefined (an unsupported citation by doctrine); later lines simply
* end the excerpt (a range past the file's end reads as far as the
* snapshot goes).
*/
declare function citationExcerptOf(resolve: (target: CitationTarget) => string | undefined, row: Pick<CitationAuditRow, "path" | "line" | "endLine">, window: number): string | undefined;
/**
* Resolver v2's excerpt: the bounded LOGICAL UNIT the cited line
* belongs to (RV4208), through the same pure line resolver v1 reads.
* The v1 window is a fixed downward slice, and the sixth comparison
* experiment's confirmed false negative was structural: a section
* heading cited as the anchor with its support three lines below the
* window. The unit rules, all bounded by {@link
* MAX_CITATION_UNIT_EXCERPT_LINES} and {@link
* MAX_CITATION_UNIT_EXCERPT_CHARS} with a `truncated` flag when
* clipped:
*
* - comment context decides FIRST (RV4401): a line inside a comment
*   block belongs to the comment, never to a one-line markdown list
*   (seven of the seventh comparison experiment's ten "unsupported"
*   verdicts were docstring anchors whose `* `-led lines matched the
*   list rule and excerpted ALONE, hiding support 3..9 lines away).
*   A `*`-led line is a comment only when a bounded upward scan finds
*   the `/*` opener (a bare markdown `* item` chain has none and
*   keeps its list semantics byte for byte); a `//`, `#` or `--` line
*   is a comment only beside a SAME-family neighbor (a lone
*   `# heading` stays a heading). Inside the comment the line
*   classifies by its text AFTER the prefix strips: a stripped list
*   item excerpts the item with its continuations, anything else the
*   comment BLOCK (expanded upward to its start, bounded so the
*   anchor keeps room below) plus the declaration lines it documents,
*   to the first blank line;
* - heading: the SECTION, the heading plus following lines to the
*   next heading;
* - table row: the row, with the header pair above it when adjacent;
*   a HEADER anchor (the delimiter row sits directly below it)
*   carries the delimiter and body rows too, because citing the
*   header cites the table;
* - list item: the marker line plus its more-indented continuation
*   lines;
* - code comment with no context evidence: the single-line fallback
*   keeps the prior comment-declaration behavior unchanged;
* - anything else: the paragraph, expanded upward and downward to the
*   nearest blank or heading line.
*
* An explicit `path:start-end` range keeps range semantics (the host
* cited exact lines; second-guessing them would audit a different
* citation): the ranged lines, clipped by the caps. The FIRST cited
* line failing to resolve returns undefined, the unsupported-by-
* doctrine verdict v1 renders.
*/
declare function citationUnitExcerptOf(resolve: (target: CitationTarget) => string | undefined, row: Pick<CitationAuditRow, "path" | "line" | "endLine">): {
  excerpt: string;
  unit: CitationExcerptUnit;
} | undefined;
/** Judged anchors a repair round carries grounding windows for at most. */
declare const MAX_GROUNDING_WINDOW_FINDINGS = 6;
/** The whole grounding block's character budget inside one prompt. */
declare const MAX_GROUNDING_WINDOW_CHARS = 4800;
/**
* The grounding windows a citation repair round rides (RV4601): the
* resolved unit of each judged anchor, so the composer repairs a
* citation against the bytes the judge actually read instead of
* guessing at a file it has never seen (the seventh comparison
* experiment's candidate moved anchors blind). Recomputed from the
* pure snapshot resolver at every prompt build, which is what keeps a
* resumed round byte identical: nothing new persists, and a pure
* resolver returns the same lines forever. Anchors that stopped
* resolving, repeated anchors, and anything past the finding or
* character budgets are silently absent; the block is an aid, never a
* verdict surface.
*/
declare function citationGroundingLines(findings: readonly Pick<CitationAuditFinding, "anchor">[], resolve: (target: CitationTarget) => string | undefined): string[];
/** The audit judge's structured verdict schema (mirrors the claim judge). */
declare const CITATION_JUDGE_SCHEMA: {
  readonly type: "object";
  readonly properties: {
    readonly verdicts: {
      readonly type: "array";
      readonly items: {
        readonly type: "object";
        readonly properties: {
          readonly row: {
            readonly type: "integer";
          };
          readonly verdict: {
            readonly type: "string";
            readonly enum: readonly ["supported", "partial", "unsupported"];
          };
          readonly reason: {
            readonly type: "string";
          };
        };
        readonly required: readonly ["row", "verdict", "reason"];
        readonly additionalProperties: false;
      };
    };
  };
  readonly required: readonly ["verdicts"];
  readonly additionalProperties: false;
};
/**
* Parses the judge output strictly: one verdict per judged row, no
* duplicates, no rows beyond the judged set, verdicts from the closed
* vocabulary. Anything else returns undefined and the caller treats
* the invocation as a failed judge (nothing was judged; partial
* verdicts over a partial parse would claim more than the judge
* said). The row set is a BIJECTION with the sample (RV4402): a
* fabricated extra row is a parse failure, never surplus information,
* because a judge inventing rows is a judge whose output cannot be
* trusted about the rows it was asked.
*/
declare function parseCitationVerdicts(output: unknown, rowIndexes: readonly number[]): Map<number, {
  verdict: "supported" | "partial" | "unsupported";
  reason: string;
}> | undefined;
//#endregion
//#region src/orchestrator/anchor-grounding.d.ts
/** Grace lines read below a non json unit (a comment documents what follows). */
declare const ANCHOR_GROUNDING_GRACE_LINES = 8;
/** Slack around a leaf json line (the adjacent property is the same fact). */
declare const ANCHOR_GROUNDING_JSON_LEAF_SLACK = 2;
/** Findings the verdict carries at most; the rest wait for the next pass. */
declare const MAX_ANCHOR_GROUNDING_FINDINGS = 8;
/** Suggested lines per finding at most. */
declare const MAX_ANCHOR_GROUNDING_SUGGESTIONS = 3;
/** How deep the suggestion scan reads a file before giving up. */
declare const MAX_ANCHOR_GROUNDING_SCAN_LINES = 2e4;
/** One suggested repair target inside the cited file. */
interface AnchorGroundingSuggestion {
  readonly line: number;
  readonly token: string;
  readonly text: string;
}
/** One wrong line finding of {@link anchorGroundingFindingsOf}. */
interface AnchorGroundingFinding {
  readonly sentence: string;
  readonly anchor: string;
  readonly path: string;
  readonly line: number;
  readonly endLine?: number;
  /**
  * 'clause' convicted the anchor against its own claim clause;
  * 'sentence' convicted it as the sentence's only anchor whose FILE
  * carries a token no cited window does.
  */
  readonly scope: "clause" | "sentence";
  /** The deciding tokens the resolved window never carries. */
  readonly tokens: readonly string[];
  /** The resolved window, 1 based and inclusive. */
  readonly windowFirstLine: number;
  readonly windowLastLine: number;
  /** The unit the window came from; absent for the structural json block. */
  readonly unit?: CitationExcerptUnit;
  /** Exact lines inside the cited file that DO carry a deciding token. */
  readonly suggestions: readonly AnchorGroundingSuggestion[];
}
/** The options of {@link anchorGroundingFindingsOf} and the validator. */
interface AnchorGroundingOptions {
  /** The pure snapshot resolver every citation check reads. */
  resolve: (target: CitationTarget) => string | undefined;
  /** Overrides {@link DEFAULT_CITATION_PATTERN}; must expose `path:line`. */
  pattern?: string;
  /** Extra stop words this host's prose writes as filler. */
  stopWords?: readonly string[];
  /** Extra word to literal expansions beside caret and tilde. */
  lexicon?: Readonly<Record<string, string>>;
  /** The run id, excluded as identity when present. */
  runId?: string;
}
/**
* The pure engine behind {@link anchorGroundingValidator}: every wrong
* line finding of `text` against the snapshot, in document order. The
* validator renders these as reasons; a harness reads them directly.
*/
declare function anchorGroundingFindingsOf(text: string, options: AnchorGroundingOptions): AnchorGroundingFinding[];
/**
* The wrong line lint as a finish validator. Each finding is one
* reason naming the anchor, the resolved window, the asserted tokens
* it never carries, and the exact lines that do, so the repair turn
* moves the anchor instead of guessing. Default name
* 'anchor-grounding'; see the module comment for the doctrine.
*/
declare function anchorGroundingValidator(options: AnchorGroundingOptions & {
  name?: string;
}): FinishValidator;
//#endregion
//#region src/orchestrator/semantic-verdict.d.ts
/**
* The semantic terminal verdict (RV4209, the sixth comparison
* experiment). The envelope has carried every semantic FACT for
* releases (the claim meta, the audit meta, the waiver, the findings),
* and still no surface answered the one production question in one
* word: is this document semantically CLEAN? The CLI's `--strict`
* deliberately keeps exit 0 on `partial` and `vacuous` (they break no
* contract the pass declares), the experiment's run settled ok under a
* standing waiver with three unsupported citations, and every consumer
* re-derived the same verdict from four fields by hand, each with its
* own bugs. This module is the ONE derivation: a pure fold over the
* envelope's own facts, stamped onto the envelope by orchestrate, so
* the CLI gate, the HTTP response, and the event stream read the SAME
* verdict by construction instead of three re-derivations.
*/
/** The one-word semantic verdict plus the facts it was folded from. */
interface SemanticTerminalVerdict {
  /**
  * The verdict, in refusal precedence order:
  * - 'not-judged': semantic machinery was configured and nothing
  *   usable judged the shipped document (a failed or declined judge,
  *   a draft-stage verdict the synthesis then rewrote, a meta
  *   carrying no evidence anything judged, or a meta whose counters
  *   are malformed, RV4402);
  * - 'findings': a judge ruled and defects stand (contradictions or
  *   unsupported sampled citations);
  * - 'waived': acceptance was licensed by a standing exception, not
  *   by coverage;
  * - 'partial': coverage graded below 'full' ('partial',
  *   'critical-uncovered', or the RV4404 'coverage-capped', whose
  *   cause is the configured pair ceiling) with no waiver standing;
  * - 'vacuous': the document cited nothing, so the configured pass
  *   verified nothing;
  * - 'clean': every configured judge ruled on the shipped document
  *   and found nothing.
  */
  verdict: "clean" | "findings" | "partial" | "vacuous" | "waived" | "not-judged";
  /** The judged document's hash: the claim judgedHash, else the audit auditedHash. */
  finalHash?: string;
  /**
  * The precise twin of `finalHash` (RV4604): the same hex under a
  * name that states BOTH the recipe (sha256 over the JCS canonical
  * document) and the referent (the judged document, which is the
  * claim `judgedHash` else the audit `auditedHash`, and NOT the
  * `draftToFinal.finalHash` the bare name collides with).
  */
  judgedDocumentJcsSha256?: string;
  /** The final claim-coverage grade, verbatim from the meta. */
  coverage?: string;
  /** Judged claim contradictions standing at settle. */
  contradictions: number;
  /** Sampled citations judged UNSUPPORTED at settle. */
  unsupportedCitations: number;
  /** Sampled citations judged partial at settle: findings, not stops. */
  partialCitations: number;
  /** Bounded semantic repair rounds the run actually dispatched. */
  semanticRepairRounds: number;
  /** The standing exception that licensed acceptance, when one did. */
  waiver?: {
    principal: string;
    reason: string;
    expiresAt?: string;
    coverage: string;
  };
  /**
  * Why nothing usable judged the document, when 'not-judged': stable
  * codes ('claim-judge-failed', 'claim-judge-declined',
  * 'citation-judge-failed', 'citation-judge-declined',
  * 'draft-rewritten-unjudged', and the RV4402 trust codes
  * 'claim-meta-unjudged' / 'citation-meta-unjudged' for a meta with
  * no evidence anything judged, 'claim-meta-malformed' /
  * 'citation-meta-malformed' for counters that are not counts).
  * Empty on every other verdict.
  */
  judgeFailures: string[];
}
/** The envelope facts the fold reads; every field optional and untrusted. */
interface SemanticVerdictInput {
  claimConsistencyMeta?: Record<string, unknown>;
  citationAuditMeta?: Record<string, unknown>;
  claimCoverageWaiver?: Record<string, unknown>;
  draftToFinal?: Record<string, unknown>;
}
/**
* Folds the one semantic verdict out of envelope facts (RV4209).
* Returns undefined when NO semantic meta is present: nothing was
* configured, nothing judged anything, and absence must keep meaning
* NOT RECORDED rather than a fabricated verdict. Never throws on
* malformed shapes, and malformation degrades toward 'not-judged',
* the fail-closed direction (RV4402): a meta that carries NO evidence
* anything judged (no judgedHash/auditedHash, no judgeInvoked, no
* judge flag, no judgedStage) folds 'not-judged' with a trust code,
* never 'clean', and a counter that is present but not a count taints
* its meta the same way. An ABSENT field still reads absent: absence
* is honest, garbage is not.
*/
declare function semanticTerminalVerdictOf(input: SemanticVerdictInput): SemanticTerminalVerdict | undefined;
/**
* The production acceptance predicate (RV4209): the one boolean a
* production consumer gates on, with the stable reason when it
* refuses. A verdict is production-acceptable exactly when it exists
* and reads 'clean': 'partial' and 'vacuous' are legal diagnostics
* (strict keeps exit 0 on them by documented design), 'waived' is a
* human exception a machine gate must surface rather than inherit,
* and an ABSENT verdict means nothing judged anything, which a
* production gate reads fail closed. The refusal reason distinguishes
* the two refusal shapes a reader used to conflate (RV4402): an
* absent verdict reads 'not-recorded' (nothing was configured, or the
* run predates the fold), while a recorded 'not-judged' verdict lists
* its judge failure codes, so an operator can tell "the machinery
* never wrote a verdict" from "judges ran and nothing usable judged
* the shipped document". Exported so the CLI's `--acceptance-policy
* production`, a server consumer, and a host pipeline apply the SAME
* rule instead of three re-derivations.
*/
declare function productionAcceptable(verdict: SemanticTerminalVerdict | undefined): {
  ok: boolean;
  reason?: string;
};
//#endregion
//#region src/engine/events.d.ts
/**
* The distance between the telemetry counter bases of two consecutive
* execution segments of one run: segment k of a run starts its event
* `seq` and span counter at `k * EVENT_SEGMENT_STRIDE`. A single
* segment would need over four billion events to reach the next base,
* so `seq` stays strictly increasing and `spanId` unique across
* suspend/resume and process recreation while remaining an ordinary
* safe-integer number (v1.22.0 review P1-2). Informational for
* consumers: treat `seq` as ordered and `spanId` as opaque, never
* parse segment structure out of either.
*/
declare const EVENT_SEGMENT_STRIDE: number;
/**
* Spans form a tree per run; spanId values are engine-minted opaque
* strings, unique per run, pure telemetry, never identity.
*/
declare class SpanRegistry {
  private readonly parents;
  private counter;
  constructor(options?: {
    /**
    * First counter value (default 0): the resumed-segment base that
    * keeps span ids unique per run across segments.
    */
    first?: number;
  });
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
  private readonly mask;
  private readonly subscribers;
  private readonly listeners;
  private seq;
  private ended;
  private listenerErrorReported;
  constructor(options: {
    runId: string;
    spans: SpanRegistry;
    now?: () => number;
    /**
    * Default true (M8-T04): key-shaped strings in every emitted body are masked.
    * Telemetry only, never the journal: events are excluded from
    * identity by construction, so masking cannot perturb replay.
    */
    maskEvents?: boolean;
    /**
    * The compiled masking policy applied when maskEvents is on
    * (RV-217): the default credential set plus host patterns. Absent
    * falls back to the default maskSecretsDeep.
    */
    mask?: (body: WorkflowEventBody) => WorkflowEventBody;
    /**
    * First seq value (default 0): the resumed-segment base that keeps
    * seq strictly increasing per run across segments (v1.22.0 review
    * P1-2).
    */
    firstSeq?: number;
  });
  emit(body: WorkflowEventBody, spanId: string, replayed?: boolean): WorkflowEvent;
  /**
  * A throwing on() listener is isolated (its work is best-effort
  * telemetry), and the failure surfaces ONCE as a warn log on this bus
  * rather than propagating into the run. The warn goes through emit()
  * itself, AFTER the triggering event's fan-out completed: it is
  * masked exactly like every other event (a secret-shaped fragment of
  * the listener's error message never reaches observers raw), its seq
  * is stamped at delivery, and every surface sees [event, warn] in
  * that order. The guard is set before the recursive emit, so a
  * listener that also throws on the warn cannot re-arm the report or
  * recurse (v1.22.0 review P2-1).
  */
  private reportListenerError;
  on<T extends WorkflowEvent["type"]>(type: T, cb: (event: Extract<WorkflowEvent, {
    type: T;
  }>) => void): () => void;
  /** Ends every open iterator once the run has settled. */
  end(): void;
  iterate(): AsyncIterable<WorkflowEvent>;
}
//#endregion
//#region src/l0/telemetry-reduce.d.ts
/** One phase activation of one agent span. */
interface PhaseRow {
  invocation: number;
  role: string;
  model: string;
  /** 0 until the end event arrives, and on replayed rows. */
  durationMs: number;
  usage: Usage;
  costUsd: number;
  /**
  * The fold behind `costUsd` (RV702). An event stream recorded before
  * the field shipped priced aggregates, so an absent field reduces to
  * 'aggregate-estimate', never to a per-call claim it cannot back.
  */
  costBasis: CostBasis;
  outcome?: "ok" | "error";
  retries: number;
  replayed: boolean;
  /** True when the phase's end event never arrived. */
  open: boolean;
}
/** One logical agent span. */
interface AgentInvocationRow {
  spanId: string;
  agentType: string;
  label?: string;
  /** The primary role from agent:start. */
  role?: string;
  /** From agent:end; absent while the span is open. */
  status?: string;
  usage: Usage;
  costUsd: number;
  /**
  * The fold behind `costUsd` (RV702), from the span's agent:end; an
  * absent field (a pre-RV702 stream, or a span still open) reduces to
  * 'aggregate-estimate', never to a per-call claim it cannot back.
  */
  costBasis: CostBasis;
  usageApprox: boolean;
  retryCount: number;
  /**
  * The tool budget pressure snapshot (RV304), carried through from the
  * live agent:end. Absent on replayed rows and unbounded loops.
  */
  toolBudget?: ToolBudgetSummary;
  replayed: boolean;
  /** True when the span's agent:end never arrived. */
  open: boolean;
  /**
  * Present and true when the invocation was aborted by the host's
  * finish rejection (RV3702): the declared finish contract rejected
  * the candidate past its repair bound, so the span died by host
  * hand with its wires fine. From the agent:end stamp; absent
  * everywhere else.
  */
  hostRejected?: boolean;
  phases: PhaseRow[];
}
/** The reduced table plus the per-role aggregate across every span. */
interface InvocationTable {
  agents: AgentInvocationRow[];
  /**
  * Aggregated over COMPLETED phase pairs, keyed by role. The bucket's
  * `costBasis` is 'per-call' only while EVERY folded pair carried the
  * per-call basis; one aggregate-estimate pair degrades the bucket.
  */
  byRole: Record<string, {
    usage: Usage;
    costUsd: number;
    costBasis: CostBasis;
  }>;
  /** Sum of agent:end costUsd over settled spans. */
  totalCostUsd: number;
}
/**
* Reduces one run's event stream (or any slice of it) to the invocation
* table. Feed it the events in emission order; both a live stream and a
* replayed one produce the same usage and cost columns.
*/
declare function reduceInvocationTable(events: Iterable<WorkflowEvent>): InvocationTable;
/**
* The critical-path summary of one run (RV-211): the plan's post-fan-in
* gate ("synthesis takes at most 40% of wall time with four settled
* workers") computed as a pure fold over the same vocabulary, no
* heuristics beyond the role tags. Post-fan-in is the interval from the
* LAST settled non-coordination agent (any span whose primary role is
* neither 'orchestrate' nor 'synthesize') to run:end; the synthesis wall
* is the summed span wall of 'synthesize' spans. Wall numbers are LIVE
* fidelity: a replayed stream re-stamps emission times, so its intervals
* are degenerate, exactly like phase durations. Absent pieces (no
* run:end, no worker spans) leave the corresponding fields undefined
* rather than guessed at.
*/
interface CriticalPath {
  /** run:start to run:end; absent while the run is open. */
  runWallMs?: number;
  /** Last non-coordination agent:end to run:end; absent without both. */
  postFanInMs?: number;
  /**
  * Summed wall of completed 'synthesize' spans (0 when none). Since
  * RV4206 this is exactly `finalCompositionMs + semanticJudgeMs +
  * citationJudgeMs + unclassifiedSynthesisMs`, kept whole for
  * existing consumers: the name predates the judges riding the same
  * role, and the eighteenth comparison benchmark read a 54-second
  * `synthesisMs` as a second final composition when the run had
  * SKIPPED synthesis and the bucket was entirely the judge and its
  * extract. Read the split fields.
  */
  synthesisMs: number;
  /**
  * Completed 'synthesize' spans that ARE final composition, summed
  * (RV1604; classified through {@link synthesizeSpanClassOf} since
  * RV4206): the engine's own composition labels plus every
  * unlabelled span (composition was the only unlabelled engine
  * dispatch before RV2901 named it). A span whose label this
  * classifier does not know lands in `unclassifiedSynthesisMs`
  * instead of here: the sixth comparison run read 368889 ms of
  * "final composition" of which 154019 ms was the citation judge.
  */
  finalCompositionMs: number;
  /**
  * Completed 'synthesize' spans that are the claim-consistency judge
  * (agent:start label {@link CLAIM_JUDGE_LABEL}), its extract phase
  * included, summed (RV1604).
  */
  semanticJudgeMs: number;
  /**
  * The stage split of `semanticJudgeMs` (RV3404): the draft pass
  * dispatches under the exact {@link CLAIM_JUDGE_LABEL} and every
  * suffixed variant is a post draft pass (today the final pass and
  * the repair round's re-judge, both `-final`, RV2509/RV3307). Always
  * the exact partition: `draftJudgeMs + finalJudgeMs` equals
  * `semanticJudgeMs`.
  */
  draftJudgeMs: number;
  /** The post draft half of the split; see `draftJudgeMs`. */
  finalJudgeMs: number;
  /**
  * Completed 'synthesize' spans that are the citation entailment
  * audit judge (labels {@link CITATION_JUDGE_LABEL} and its suffixed
  * variants), summed (RV4206). Until this bucket existed the audit
  * judge folded into `finalCompositionMs` on BOTH surfaces: the
  * sixth comparison run's 368889 ms "composition" was 214870 ms of
  * composition plus 154019 ms of this judge, `compositionSpans` then
  * counted the judge as a second composition (the legible signature
  * of a repair round on a run that had none), and `lastCandidateMs`
  * stretched to the judge's end while the candidate had settled
  * 154 seconds earlier.
  */
  citationJudgeMs: number;
  /** Completed citation-judge synthesize spans, counted (RV4206). */
  citationJudgeSpans: number;
  /**
  * Completed 'synthesize' spans whose label names NEITHER a judge
  * nor a composition (RV4206): a vocabulary member this classifier
  * does not know. Nonzero means the split beside it is a floor, and
  * saying so is the whole point: an unknown synthesize label used to
  * fold silently into `finalCompositionMs`, which is exactly how the
  * citation judge hid there for four releases.
  */
  unclassifiedSynthesisMs: number;
  /** Completed unclassified synthesize spans, counted; nonzero flags the split as a floor. */
  unclassifiedSynthesisSpans: number;
  /**
  * Completed composition-side synthesize spans, counted (RV3404): two
  * compositions on one run is the legible signature of the bounded
  * repair round (RV3307), and a count survives where milliseconds
  * invite guessing.
  */
  compositionSpans: number;
  /** Completed judge-side synthesize spans, counted (RV3404). */
  judgeSpans: number;
  /**
  * run:start to the FIRST completed composition-side synthesize
  * span's end (RV3605): when a candidate deliverable first existed.
  * The third comparison run held a mechanically accepted candidate
  * from its 103rd journal seq onward and lost typed 25 minutes
  * later; nothing on any surface said when the latent document
  * materialized, and the judge had to dig spans by hand. Absent
  * without a run:start or a completed composition span, and live
  * fidelity like every wall figure here.
  */
  firstCandidateMs?: number;
  /**
  * run:start to the LAST completed composition-side span's end
  * (RV3605). On a run whose terminal carries `deliverableAccepted:
  * true` this is when the accepted composition settled, the time to
  * accepted deliverable; on a failed run it is when the last LOSING
  * candidate settled, so pair it with the acceptance verdict and
  * never read it as a win on an error terminal (the comparison rule
  * the third experiment wrote down).
  */
  lastCandidateMs?: number;
  /** postFanInMs / runWallMs when both are defined and the wall is > 0. */
  postFanInShare?: number;
  /** synthesisMs / runWallMs under the same conditions. */
  synthesisShare?: number;
  /** Settled non-coordination agent spans that anchored the fan-in. */
  workerSpans: number;
  /**
  * Settled spans whose invocation was aborted by the host's finish
  * rejection (RV3702): the `hostRejected` stamps counted. The count
  * is unconditional (the stamp is self contained, no labelling
  * condition applies) and zero when none: on the third comparison
  * run's shape it reads 1, the round's composition, telling the host
  * rejection apart from a provider death at the cut level.
  */
  hostRejectedSpans: number;
  /** The RV710 decomposition of the window; present with postFanInMs. */
  postFanIn?: PostFanInBreakdown;
}
/**
* Where the post-fan-in interval actually went (RV710): the eleventh
* comparison experiment measured 45.5 percent of wall sitting after
* fan-in with zero synthesis share and nothing to name it. The
* decomposition is a pure fold over the SAME vocabulary, no new event
* types: model activations and tool executions of coordination spans
* (spans whose agent:start role is 'orchestrate') are reconstructed
* from their end events' (ts, durationMs) and clipped to the
* [last worker settle, run:end] window, and completed 'synthesize'
* spans are clipped the same way. The coordinator's draft and repair
* thinking lands in the model bucket; child-result pagination and the
* finish exchanges (host validators run inside the finish tool's
* measured window) land in the tool buckets under their own names; the
* residue is what no recorded interval covers: scheduling gaps,
* journal writes, park-to-wake latency. Live fidelity only, exactly
* like the wall numbers around it: a replayed stream re-stamps
* emission times and carries durationMs 0, so its decomposition is
* degenerate. Buckets are clipped SUMS (two concurrent coordination
* spans, or duration-clock skew against emission stamps, can
* overlap-count); coveredMs is the exact interval union, so residueMs
* is never understated by an overlap. End events whose span never
* started in the stream (a consumer attached mid-stream) cannot be
* attributed and are skipped, never guessed at.
*/
interface PostFanInBreakdown {
  /** Model activations of coordination spans inside the window. */
  coordinationModelMs: number;
  /**
  * The same bucket keyed by the activation's OWN invocation role
  * ('orchestrate' for the coordinator's drafting and repair turns,
  * 'summarize' for a compaction pass, 'extract' for a schema pass),
  * so a tail spent compacting is distinguishable from a tail spent
  * drafting (RV1211). A zero-duration activation inside the window
  * still registers its role. The values sum to `coordinationModelMs`
  * exactly.
  */
  coordinationModelMsByPhase: Record<string, number>;
  /**
  * Coordination activation wall with the tool executions NESTED
  * inside it removed: the coordinator's own model time, exactly
  * (RV1211). `coordinationModelMs` is activation wall, and a tool the
  * activation called runs inside that wall, so the two buckets
  * overlap by construction and reading the first as "thinking time"
  * overstates it. This is the exact set difference of the two clipped
  * unions, never a subtraction of sums, so overlapping activations
  * cannot drive it negative. The sixteenth comparison experiment's
  * 222.6-second tail is the number this field exists to split.
  */
  coordinationModelOnlyMs: number;
  /** Tool executions of coordination spans inside the window, summed. */
  coordinationToolMs: number;
  /**
  * The same tool time keyed by tool name. A zero-duration execution
  * inside the window still registers its name: sub-millisecond tools
  * round to 0 on the wall clock but did run here.
  */
  coordinationToolMsByName: Record<string, number>;
  /**
  * How many executions of each tool the window holds (RV1211), under
  * the same touch-the-window rule as the milliseconds beside it. A
  * coordinator that calls one tool per turn reads its tail's turn
  * profile straight off this record; the milliseconds alone cannot
  * separate one slow pagination from twenty fast ones.
  */
  coordinationToolCallsByName: Record<string, number>;
  /** Completed 'synthesize' span wall clipped to the window. */
  synthesisMs: number;
  /** The composition share of `synthesisMs`, clipped (RV1604; RV4206 classification). */
  finalCompositionMs: number;
  /** The claim-judge share of `synthesisMs`, clipped (RV1604). */
  semanticJudgeMs: number;
  /** The citation-judge share of `synthesisMs`, clipped (RV4206). */
  citationJudgeMs: number;
  /**
  * The unclassified share of `synthesisMs`, clipped (RV4206):
  * nonzero flags the itemization as a floor, exactly like the
  * top-level counter.
  */
  unclassifiedSynthesisMs: number;
  /** Union length of every covered interval above. */
  coveredMs: number;
  /** postFanInMs minus coveredMs, floored at zero. */
  residueMs: number;
  /** residueMs / postFanInMs when the window is longer than zero. */
  residueShare?: number;
}
/**
* The label the claim-consistency judge invocation dispatches under
* (RV1502; named here since RV1604 so the critical-path reducer and the
* orchestrator share one constant): the judge rides role 'synthesize',
* and this label is what tells its wall apart from a real final
* composition in {@link reduceCriticalPath}.
*/
declare const CLAIM_JUDGE_LABEL = "claim-consistency-judge";
/**
* Whether a synthesize span's label names a claim-consistency judge
* invocation: the exact {@link CLAIM_JUDGE_LABEL}, or a suffixed
* variant of it (the final pass dispatches under
* `claim-consistency-judge-final` since RV2509 so the two passes of
* `stage: 'both'` stay separable). BOTH reducers must classify through
* this one predicate (RV3302): the live fold compared the label for
* exact equality while the journal fold accepted the suffix, and the
* 2026-08-12 comparison run reported semanticJudgeMs 0 with the whole
* 272923 ms window read as final composition on the live surface
* while the journal fold correctly split 224864 against 48059.
*/
declare function isClaimJudgeLabel(label: string | undefined): boolean;
/**
* Which pass a claim-consistency judge label names (RV3404): the exact
* {@link CLAIM_JUDGE_LABEL} is the draft pass, and every suffixed
* variant is a post draft pass over the composed document (today the
* final pass and the repair round's re-judge, both dispatching under
* `-final`, RV2509/RV3307). `undefined` for every other label. One
* classifier for both reducers, the RV3302 doctrine extended from the
* judge predicate to the stage: the split must never read differently
* off the live stream and off the journal of one run.
*/
declare function claimJudgeStageOf(label: string | undefined): "draft" | "final" | undefined;
/**
* The label the citation entailment audit judge dispatches under
* (RV4004; named here since RV4206 so the reducers and the
* orchestrator share one constant, the CLAIM_JUDGE_LABEL precedent):
* the audit judge rides role 'synthesize' exactly like the claim
* judge, and until RV4206 no reducer knew its name, so its wall
* folded into final composition on both surfaces.
*/
declare const CITATION_JUDGE_LABEL = "citation-entailment-judge";
/**
* Which audit pass a citation judge label names (RV4206): the exact
* {@link CITATION_JUDGE_LABEL} is the first pass over the shipped
* document, and every suffixed variant is a post round re-audit
* (today `citation-entailment-judge-round`, the RV4004 round and the
* RV4202 merged round both dispatch it). `undefined` for every other
* label; one classifier for both reducers, the RV3302 doctrine.
*/
declare function citationJudgePassOf(label: string | undefined): "first" | "round" | undefined;
/**
* The ONE synthesize-span classifier both reducers fold through
* (RV4206, the RV3302 doctrine extended from a judge predicate to the
* whole vocabulary): the sixth comparison experiment's citation judge
* (label {@link CITATION_JUDGE_LABEL}, role 'synthesize') was
* recognized by neither reducer and fell into `finalCompositionMs` on
* both, so the run's 368889 ms "composition" was half verdict, its
* `compositionSpans: 2` faked a repair round's signature on a clean
* run, and `lastCandidateMs` overshot the candidate by 154 seconds.
*
* - 'claim-judge': {@link claimJudgeStageOf} recognizes the label.
* - 'citation-judge': {@link citationJudgePassOf} recognizes it.
* - 'composition': the engine's own composition labels
*   ({@link FINAL_COMPOSITION_LABEL}, {@link SYNTHESIS_NOTE_LABEL},
*   suffixed variants included) and every UNLABELLED span: streams
*   recorded before RV2901 carry no labels, and composition was the
*   only unlabelled engine dispatch, so absence keeps its historical
*   reading.
* - 'unclassified': any OTHER label. A present label this classifier
*   does not know is a NEW vocabulary member, and folding it silently
*   into composition is exactly the failure this function exists to
*   end; the reducers bucket it under `unclassifiedSynthesisMs` with
*   its own nonzero span counter.
*/
declare function synthesizeSpanClassOf(label: string | undefined): "claim-judge" | "citation-judge" | "composition" | "unclassified";
/**
* Total length of the union of possibly overlapping intervals, exported
* (RV3404) so the journal fold computes its window coverage through the
* SAME arithmetic the live RV710 decomposition uses, never a sibling
* implementation that can drift.
*/
declare function unionOfIntervalsMs(intervals: ReadonlyArray<{
  from: number;
  to: number;
}>): number;
/**
* The label the final synthesis (composition) invocation dispatches
* under (RV2901). The engine labelling its OWN dispatches is what lets
* `criticalPathFromJournal` split the synthesize bucket offline: the
* split demands a label on EVERY synthesize span, and the comparison
* run that shipped the journal fold still refused it because this one
* dispatch stayed anonymous while the claim judge was labelled.
*/
declare const FINAL_COMPOSITION_LABEL = "final-composition";
/**
* The label an incremental synthesis note dispatches under (RV2901).
* Notes ride role 'synthesize' and are composition-side work, so both
* reducers count them toward the composition half of the split; the
* label exists so a journal reader can tell WHICH composition spans
* were notes without guessing from their size.
*/
declare const SYNTHESIS_NOTE_LABEL = "synthesis-note";
declare function reduceCriticalPath(events: Iterable<WorkflowEvent>): CriticalPath;
//#endregion
//#region src/engine/regulated-profile.d.ts
/** What compileRegulatedProfile returns: apply verbatim. */
interface RegulatedProfile {
  engine: CreateEngineOptions;
  run: RunOptions;
  orchestrate?: OrchestrateOptions;
  /**
  * sha256 over the enforced posture map (version marker included),
  * already composed into run.configFingerprint, so genesis records
  * it and ResumeOptions.configFingerprint asserts it back with the
  * RV3210 machinery; no new meta surface.
  */
  profileHash: string;
}
declare function compileRegulatedProfile(input: {
  engine: CreateEngineOptions;
  run: RunOptions;
  orchestrate?: OrchestrateOptions;
  /**
  * The construction floor's strictness (RV4204). The default keeps
  * the RV4101 posture: constructions exposing no descriptor are
  * COUNTED into the hash as `unrecognized`, so the hash names its
  * own blind spot. 'require-recognized' turns the count into a typed
  * refusal naming the blind constructions: satisfiable since the
  * first-party adapters and the reference executors attest (RV4204),
  * so a compile with zero foreign constructions can now demand zero
  * blind spots.
  */
  construction?: "require-recognized";
}): RegulatedProfile;
//#endregion
//#region src/runner/sandbox-bridge.d.ts
/** Methods a sandbox script may proxy to the host ctx. */
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
/**
* The sanctioned JSON subset of AgentOpts a sandbox script may pass:
* the planner-dialect allowlist. Exported as the single source both for
* the runtime validator below and for the planner API card, so the two
* can never drift (v1.22.0 review P2-4: the hand-maintained card had
* silently fallen three options behind).
*/
declare const SANDBOX_AGENT_OPT_KEYS: readonly string[];
declare function createSandboxBridge(ctx: Ctx<never>, options: SandboxBridgeOptions): SandboxBridge;
//#endregion
export { ANCHOR_GROUNDING_GRACE_LINES, ANCHOR_GROUNDING_JSON_LEAF_SLACK, AWAIT_SCHEMA, AbandonAttempt, AbandonFold, AbandonPayload, AbandonedSpendView, AbortClass, AcceptanceChildSummary, AcceptanceTailSpec, AcceptanceTailTerms, type AdaptiveEvents, AdmissionController, AdmissionDecision, AdmissionLevelConfig, AdmissionLevelKeys, AdmissionRecovery, AdmissionRejectedError, AdmissionRequest, AdmissionReservation, AdmissionScheduler, AdmissionScopeDimensions, AdmissionState, AdmissionStatsBefore, AdmissionTicket, AdmissionTicketDecision, AdmissionTicketState, AdmitLineage, AdmitRejectReason, AdmitRunUnitInput, AdmitSpec, AdmitVerdict, AgentCallError, AgentError, type AgentEvents, AgentIdentityInput, type AgentInvocationRow, AgentOpts, AgentProfile, AgentProfilePermissions, AgentProfileTemplateOptions, AgentResult, AgentResultMeta, AgentStatus, type AiSdkBridgeRegulatedPosture, AnchorGroundingFinding, AnchorGroundingOptions, AnchorGroundingSuggestion, type AppliedPricingRow, ApproachSignatureInputs, ApprovalDecision, ApprovalExpiredDecision, ApprovalIdentityInput, ApprovalRevocationOutcome, Artifact, AttemptOutcomeClass, AuditCategory, AuditRecord, AuditRunsOptions, BUDGET_ABORT_REASON, BaseAppend, BillingComponent, BriefOpts, BudgetAccountView, BudgetDefaults, BudgetExhaustedError, BudgetExhaustionDiagnostics, BudgetHooks, BudgetReserve, type Bytes, CANCEL_AGENT_SCHEMA, CHECKPOINT_FORMAT_V1, CITATION_JUDGE_LABEL, CITATION_JUDGE_SCHEMA, CLAIM_JUDGE_LABEL, CLAIM_MAP_MAX_ANCHORS_PER_CLAIM, CLAIM_MAP_MAX_CLAIMS, CLAIM_MAP_MAX_CLAIM_CHARS, CLAIM_MAP_ROWS_SCHEMA, CLAIM_STATEMENT_MAX_CHARS, CLAIM_TTL_DAYS, COMPACTION_SUMMARY_PREFIX, CURRENT_HASH_VERSION, CacheHint, CachePolicy, CacheTtl, CanUseTool, CanonicalId, CanonicalIdentity, CanonicalLadderSpec, CanonicalModelSpec, CapacitySheet, CapacitySheetFigure, CapacitySheetSection, CapacitySheetSpec, CapacitySheetUnit, ChatEvent, ChatRequest, CheckpointState, ChildArtifactPage, ChildExecutionFacts, ChildIdentityInput, ChildResultPage, ChildrenAtFailure, CitationAuditFinding, CitationAuditPlanOptions, CitationAuditRow, CitationAuditSectionMeta, CitationExcerptUnit, CitationTarget, type ClaimClass, ClaimContradictionFinding, ClaimCoverageGrade, ClaimCoverageInput, ClaimGrade, ClaimMapRow, type ClaimOp, ClaimPair, ClaimPairOptions, ClaimPairsFold, ClaimPoolReading, type ClaimStatus, ClaimValidationOptions, CollectOpts, CollectedTurn, CompactionConfig, CompiledPermissionChain, CompiledWorkflow, ComponentDelta, ConfigError, Contradiction, ContradictionClaim, ContradictionOptions, ContradictionSource, type CoreEvents, CostAttribution, CostAttributionFacts, type CostBasis, CostReport, CreateEngineOptions, type CriticalPath, Ctx, DECISION_CHAIN_KINDS, DEFAULT_ANCHOR_PATTERN, DEFAULT_ARTIFACT_PATTERN, DEFAULT_CHILD_BUDGET_FRACTION, DEFAULT_CHILD_RESULT_PAGE_CHARS, DEFAULT_CITATION_EXCERPT_WINDOW, DEFAULT_CITATION_MAX_SAMPLED, DEFAULT_CITATION_PATTERN, DEFAULT_CITATION_SAMPLE, DEFAULT_CITATION_SAMPLE_PER_SECTION, DEFAULT_CLAIM_JUDGE_MAX_TURNS, DEFAULT_COMPACTION_THRESHOLD, DEFAULT_ESCALATION_LIMITS, DEFAULT_EVIDENCE_CALLS_PER_ENTRY, DEFAULT_EVIDENCE_GRADE_PHRASES, DEFAULT_EVIDENCE_MIN_SHARE, DEFAULT_EVIDENCE_OVERHEAD_CALLS, DEFAULT_FINISH_MAX_REPAIRS, DEFAULT_FLAT_RESERVE_USD, DEFAULT_MAX_CHILDREN_PER_NODE, DEFAULT_MAX_CLAIM_PAIRS, DEFAULT_MAX_CONTRADICTIONS, DEFAULT_MAX_DEPTH, DEFAULT_MAX_EXCERPT_CHARS, DEFAULT_MAX_OSCILLATIONS_PER_KEY, DEFAULT_MAX_PAIR_EXCERPT_CHARS, DEFAULT_MAX_PINNED_WORKTREES, DEFAULT_MAX_POOL_PER_PAIR, DEFAULT_MAX_QUOTA_DENIALS, DEFAULT_MAX_REVISIONS_PER_RUN, DEFAULT_MAX_RUN_FACT_PAIRS, DEFAULT_MAX_TOTAL_SPAWNS, DEFAULT_MAX_TURNS, DEFAULT_MODEL_RETRY_ATTEMPTS, DEFAULT_NO_PROGRESS_TURNS, DEFAULT_PER_RUN_CONCURRENCY, DEFAULT_RETRY_POLICY, DEFAULT_STREAM_IDLE_TIMEOUT_MS, DEFAULT_SYNTHESIS_MAX_TURNS, DEFAULT_SYNTHESIS_NOTE_MAX_TURNS, DEFAULT_TERMINAL_OUTPUT_FLOOR_CHARS, DIGEST_DRAFT_MAX_WORDS, DataKeyProvider, DebitResult, DecisionChainRow, DeclaredLadder, DedupIndex, DedupNote, DedupedClaims, DelimitedStatementOptions, DerivedKey, DeriverRegistry, type DeterminismConfig, DeterminismError, type DeterminismEvents, type DeterminismMode, DispositionRule, DispositionTable, DocumentedRates, DonorCandidate, DonorRef, DroppedItem, EFFECT_LANE_DECISION_TYPES, EFFECT_TERMINAL_STATES, EMIT_RESULT_TOOL, EMPTY_AUTHORITY_HASH, EMPTY_SCHEMA_HASH, EMPTY_TOOLSET_HASH, ESCALATE_TOOL_NAME, ESCALATION_REPORT_SCHEMA, ESCALATION_REQUEST_SCHEMA, EVENT_SEGMENT_STRIDE, EXPOSURE_WAIT_SWEEP_MS, EffectAppendResult, EffectAttemptDecision, EffectAttemptState, EffectBudgets, EffectCapabilityRow, EffectClass, EffectConsumeResult, EffectDeclarationState, EffectDeclaredDecision, EffectDispositionDecision, EffectDispositionState, EffectEpochDecision, EffectEpochState, EffectIncidentDecision, EffectIncidentState, EffectIntentDecision, EffectIntentSpec, EffectLaneAdmissionVerdict, EffectLaneClassification, EffectLaneDecision, EffectLaneDecisionType, EffectLaneFold, EffectLaneJson, EffectLaneRead, EffectLaneRefusedError, type EffectLaneStore, EffectLaneWriter, EffectLaneWriterOptions, EffectLookupQualification, EffectMachine, EffectMachineState, EffectOutcomeDecision, EffectProbeDecision, EffectProbeState, EffectReceiptDecision, EffectReceiptState, EffectReconciliationCompleteDecision, EffectTerminalDecision, EffectTerminalState, EffectVoidReason, EffectiveUsageLimits, Effort, Engine, EngineAdmissionConfig, EngineDefaults, EngineQuotaConfig, EngineQuotaRuntime, EntryBillingFold, EntryBillingUnit, EntryKind, EntryRef, EntryStatus, EnvelopeEncryption, EnvelopeEncryptionOptions, ErrorClass, ErrorCode, ErrorPolicy, EscalatedResult, EscalationDecision, EscalationDecisionAbortedError, EscalationDigest, EscalationKind, EscalationLimits, EscalationOptions, EscalationReport, EscalationRequest, EventBus, EvidenceContract, type EvidenceRef, type ExecKeyDerivation, ExecutionScope, ExecutionScopeField, type ExecutorRegistry, type ExplorationSummary, ExtensionAppendInput, ExtensionDispatchSpec, ExternalIdentityInput, ExternalRegistry, ExtractNecessityInput, FINALIZE_SYNTHESIS_INSTRUCTION, FINAL_COMPOSITION_LABEL, FINISH_CLAIM_MAP_SCHEMA, FINISH_LESSON_CAP_CHARS, FINISH_SCHEMA, FINISH_SECTIONAL_SCHEMA, FINISH_TOOL_NAME, FUTURE_RATES_TOLERANCE_MS, FailRunError, FailoverTarget, FailoverTrigger, FairQueueState, FallbackField, FallbackTrigger, FencedCodeMode, FileModelKnowledgeStore, FileModelKnowledgeStoreOptions, FileTranscriptStore, type FinalizationWindowBudget, FinishContract, FinishContractCitations, FinishContractGoldenReject, FinishContractManifest, FinishContractSectionPattern, FinishInfo, FinishRepairHint, FinishSelfTestFailure, FinishSelfTestFixtures, FinishSelfTestReport, FinishValidationChild, FinishValidationInput, FinishValidationSpec, FinishValidationVerdict, FinishValidator, GET_CHILD_RESULT_SCHEMA, GET_CHILD_RESULT_TOOL_NAME, GET_SETTLED_CHILD_RESULTS_SCHEMA, GET_SETTLED_CHILD_RESULTS_TOOL_NAME, Gate, GateAudit, type GateRecord, GitWorktreeProvider, GitWorktreeProviderOptions, GraftBoot, HashVersion, HookVerdict, IMPLEMENTATION_PROFILE_LIMITS, INBOX_PROPOSAL_TTL_DAYS, IN_FLIGHT_EXPOSURE_REFUSAL_PREFIX, IdentityInput, InMemoryStore, InMemoryTranscriptStore, InProcessRunner, IncrementalSynthesisResult, InvalidResolutionError, InvocationRole, type InvocationTable, InvoiceCardinality, InvoiceExport, InvoicePricingProvenance, InvoiceReconciliation, InvoiceRow, type IsolatedExecContext, type IsolatedExecRequest, type IsolatedExecutorTag, type IsolationProvider, type IsolationSpec, Issue$1 as Issue, JOURNAL_ENVELOPE_MARKER, JournalCompatSubCode, JournalCompatibilityError, JournalEntry, JournalIntegrityError, JournalMatcher, JournalMissError, JournalOperation, JournalOrderViolation, type JournalPricingSnapshot, JournalSealedError, JournalSerializationContext, JournalSerializationHook, type JournalStore, JournaledChild, JournaledChildRoster, JournaledCriticalPath, JournaledPostFanIn, JournaledSynthesisCandidate, JournaledSynthesisCandidateReport, type Json, JsonSchema, JsonlFileStore, KB_ACTIVE_CLAIMS_CAP, KB_CARD_RENDER_BUDGET_CHARS, type KbProposal, type KbProposalTrigger, KeyDeriver, KeyRing, KeyedLimiter, KnowledgeCasError, type KnowledgeSnapshot, LARGE_VALUE_WARN_BYTES, LEGACY_LTID_PREFIX, LEGACY_SIGNATURE_INPUTS, LINEAGE_SIG_VERSION, LadderSpec, type LeasableStore, type Lease, LeaseHeldError, Ledger, LineageCounters, LineageIndex, LineageRef, LineageRelation, LineageStats, LogicalRunTelemetry, LogicalTaskId, MASKED_SECRET, MAX_ANCHOR_GROUNDING_FINDINGS, MAX_ANCHOR_GROUNDING_SCAN_LINES, MAX_ANCHOR_GROUNDING_SUGGESTIONS, MAX_CHILD_RESULT_PAGE_CHARS, MAX_CITATION_EXCERPT_CHARS, MAX_CITATION_EXCERPT_LINES, MAX_CITATION_UNIT_EXCERPT_CHARS, MAX_CITATION_UNIT_EXCERPT_LINES, MAX_CRITICAL_UNCOVERED, MAX_DEPTH_CEILING, MAX_GROUNDING_WINDOW_CHARS, MAX_GROUNDING_WINDOW_FINDINGS, MAX_RUN_FACTS_SHEET_CHARS, MAX_RUN_ID_LENGTH, MAX_TIMER_DELAY_MS, MAX_UNCOVERED_SENTENCES, MatchResult, McpConfig, type McpSourceRegulatedPosture, McpToolSource, MechanicalGateProfile, MechanicalGateVerdict, MemoryAdmissionOptions, MemoryAdmissionScheduler, MemoryQuotaLimiter, type MetaLookupStore, type ModelAdapterRegulatedPosture, type ModelCaps, ModelChoice, type ModelClaim, ModelEpochInputs, type ModelKnowledgeHandle, type ModelKnowledgeStore, ModelListConstraint, ModelRef, ModelRetry, ModelSpec, Msg, NoProgressDetector, NodeId, NodeLinkValue, NonSerializableValueError, ORCHESTRATE_WORKFLOW_NAME, OnEscalation, OpenWireIntent, OperationDisposition, OrchestrateAcceptance, OrchestrateCitationAudit, OrchestrateClaimConsistency, OrchestrateClaimConsistencyMeta, OrchestrateContradictions, OrchestrateContradictionsMeta, OrchestrateDeterministicPatches, OrchestrateDraftToFinal, OrchestrateOptions, OrchestrateSemanticAcceptance, OrchestrateSynthesis, OrchestrateSynthesisSkipReason, OrchestratorBudgetSpec, OrchestratorCapConfigError, OrchestratorExtension, OrchestratorExtensionIO, OrchestratorRuntime, Out, OutputContractManifest, PARALLEL_AGENTS_SCHEMA, PROGRESS_REPORT_TOOL_NAME, ParallelSiteCounter, Part, PendingExternal, PendingToolTurn, PermissionConfig, PermissionGate, PermissionHook, PermissionPreset, PermissionRule, PermissionVerdict, PersistedTerminalRefusal, PersistedTerminalResult, type PhaseRow, PhaseTarget, PilotAgentProfileOptions, PilotAgentProfileResult, type PinnedPricingSegment, PipelineCollected, PipelineOpts, PlanInvariantError, type PostFanInBreakdown, PostIntentCloser, PreflightAdmissionRow, PreflightFinding, PreflightInput, PreflightOrchestratorSpec, PreflightReport, PreflightSpawnReport, PreflightSpawnSpec, PreflightToolCeiling, PriceTable, PricedComponent, PricedComponents, PricedUsage, type Pricing, type PricingTier, ProgressReport, type ProviderAdapter, ProviderCallRecord, ProviderStatement, QUOTA_WINDOW_MS, QualityFloors, QuotaCounters, type QuotaDecision, type QuotaEstimate, type QuotaLimiter, type QuotaReservationRequest, QuotaRule, QuotaWindowSnapshot, READ_CHILD_ARTIFACT_SCHEMA, READ_CHILD_ARTIFACT_TOOL_NAME, RESEARCH_PROFILE_LIMITS, REVIEW_PROFILE_LIMITS, ROLE_EFFORT_DEFAULTS, ROOT_ACCOUNT, ROOT_SCOPE, RUN_FACTS_ANCHOR, RUN_PROFILES, RUN_SETTLE_DECISION_TYPE, RandIdentityInput, RandPayload, RateLimitObservation, ReconcileOptions, ReconcileResult, ReconcileStatementOptions, RefEntryAppender, RefEntryClassification, RefusalInfo, type RegulatedPostureDescriptor, RegulatedProfile, RejectedFinishCandidate, RepairLedger, RepairLedgerRound, RepeatedClaim, ReplayDisposition, ReplayMode, ReplayPlanHashMismatch, Replayer, RepositoryResearchToolset, RepositoryResearchToolsetOptions, ResearchAgentProfileOptions, ResearchAgentProfileResult, ResearchEvidenceEntry, ResolutionArbiter, ResolutionAttempt, ResolutionBy, ResolutionFold, ResolutionLayer, ResolutionOutcome, ResolutionPayload, ResolvedInvocation, ResolvedToolset, ResumeHandle, ResumeOptions, ResumePreview, ResumeReport, RetryClass, RetryPolicy, ReuseConfig, RiskRuleValue, Role, RulvarError, RulvarErrorCode, RunAgentOptions, RunAuditVerdict, RunBudget, RunEventSink, RunExport, RunFactPairOptions, RunFactPairsFold, RunFactsSheet, type RunFilter, RunHandle, RunInternals, type RunMeta, RunOptions, RunOutcome, RunProfile, RunStateAudit, RunStatus, RuntimeEventSink, SANDBOX_AGENT_OPT_KEYS, SPAWN_ADMISSION_DECISION_TYPE, SPAWN_AGENT_SCHEMA, SYNTHESIS_NOTE_LABEL, SandboxBridge, SandboxBridgeOptions, SandboxError, SandboxHostToWorker, SandboxMethod, SandboxWorkerToHost, SchemaPair, SchemaSpec, SchemaValidationResult, ScopeNormalizeOp, ScopeNormalizeTable, ScopePolicy, ScopeSegment, ScriptRejected, ScriptRunner, ScrubNote, SecretMasker, SectionMatchMode, SectionPatternEntry, SectionalRoundPlan, SemanticPassSummary, SemanticPassesSummary, SemanticRoundArming, SemanticRoundPosture, SemanticTerminalVerdict, SemanticVerdictInput, Semaphore, SerializationHook, Settled, SettlementError, ShellPatternRules, ShellSegment, ShellVerdict, SinglePhaseAppend, SlidingWindowState, SpanMinter, SpanRegistry, SpawnAdmissionValue, SpawnAgentParams, SpawnKey, SpawnLineage, SpawnLineageOpt, SpawnOrigin, SpawnRecord, Spend, Stage, StandaloneQuarantine, StandaloneRefusal, type StandardJSONSchemaV1, type StandardSchemaV1, StatementCategoryRow, StatementColumnMap, StatementCoverage, StatementReconciliation, StatementRequestRow, StepIdentityInput, type StreamHooks, StructuredOutputTier, SupersededError, SuspendedAppend, SuspensionState, SynthesisCandidateFailure, TERMINAL_TELEMETRY_SCOPE, TOOL_NAME_PATTERN, type TaskClass, TaskDigest, TaskSpec, TelemetryScope, type TerminalEnvelope, TerminalOutcomeFacts, TerminalPatch, TerminalTelemetryScopes, TerminationAccount, TerminationAccountSnapshot, TerminationDeniedValue, TerminationDeniedWriter, TerminationInitValue, TerminationLimits, TerminationResource, TokenBucketState, ToolAuthority, type ToolBudgetSummary, ToolCalibrationExclusion, ToolCalibrationReport, ToolCalibrationRow, ToolCallRequest, ToolChoice, type ToolContext, ToolContextSeed, ToolContract, type ToolDef, type ToolEvents, type ToolExecutor, type ToolExecutorProvider, type ToolExecutorRegulatedPosture, ToolInit, type ToolRisk, ToolRuntime, type ToolSource, type ToolSourceSession, ToolsOption, ToolsetAttestation, TranscriptSerializationHook, type TranscriptStore, TriggerClass, TtlState, Usage, UsageLimits, UsageSlice, VerifiedRecommendation, WAIT_FOR_EVENTS_SCHEMA, WAIT_FOR_EVENTS_TOOL_NAME, WAKE_SUMMARY_RENDER_BUDGET_CHARS, WakeBudgetBlock, WakeDigest, WakeTrigger, WireCapacityEstimate, WireCapacitySpec, WireError, Workflow, WorkflowCallOpts, type WorkflowEvent, type WorkflowEventBody, WorkflowRegistry, acceptanceJudgePasses, acceptanceTailRequiredUsd, accountSpendFromJournal, admissionLevelKeys, admissionReserveUsd, admitRunUnit, affordableOutputTokens, agentErrorFromWire, agentErrorToWire, agentResultWire, agentScope, agentTypeBucket, anchorGroundingFindingsOf, anchorGroundingValidator, applyClaimOps, applyFinishRepairHints, applyStructuredOutputTier, approachSigCoarse, approachSigOf, approvalLicensedKey, archiveDeprecatedModelOps, assertFencedWrites, assertSafeRunId, atCompactionThreshold, attestToolset, attributionBucket, auditRun, auditRuns, bucketAdmits, bucketAdvance, bucketConsume, bucketRefund, buildAbandonFold, buildAdapterRegistry, buildCostReport, buildDeriverRegistry, buildOrchestratorTools, buildTerminationInitValue, buildToolContext, canRideLoopTurn, candidateHashOf, canonicalClaimMap, canonicalIsolationTag, canonicalizeLadder, canonicalizeSchema, capIssues, capacitySheet, capsHashOf, checkFloors, checkpointRefFor, childCoveragePrefix, childRostersFromJournal, citationExcerptOf, citationGroundingLines, citationJudgePassOf, citationTargetsValidator, citationUnitExcerptOf, citedValueValidator, claimCoverageOf, claimExpired, claimExpiry, claimIssues, claimJudgeStageOf, claimMapHashOf, claimOpIssues, classifyAgentError, classifyAttemptOutcome, clauseAround, collectDeclaredLadders, compactMessages, compareRates, compilePermissionChain, compilePermissionPreset, compileRegulatedProfile, compileSecretMasker, compileVerifiedLayer, constantTimeEqual, costReportFromJournal, countsAgainstLimit, coverMerge, createCanonicalIdMinter, createCtx, createEngine, createEnvelopeEncryption, createSandboxBridge, criticalPathFromJournal, currentOnlyKeyRing, decodeCheckpoint, dedupeRepeatedClaims, defineWorkflow, deriveContentKey, deriverV1, deriverV2, digestOf, dispatchProjectionReserveUsd, dispositionHook, documentAnchorsOf, effectLaneAdmissible, effectiveEffectState, emptyDigestBlocks, emptyFairQueue, emptySlidingWindow, emptyToolset, encodeCheckpoint, enforceToolsetAttestation, entryUsageSlices, escalateTool, evaluatePermission, evaluateReuse, evidenceGradeValidator, evidencePreservedValidator, executeWorkflow, executionFactsOf, executionScopeDigest, executionScopeKey, exhaustionCodeOf, extractCandidate, failoverTriggerOf, fallbackTriggerOf, filterClaimsForRun, finalizeFires, findContradictions, finishContract, foldLedger, foldTermination, formatAcceptanceTailTerms, formatCharacterValidator, formatRePrompt, formatScopePath, hasFencedWrites, hasMetaLookup, hashRunArgs, hashRunOutput, hashWorkflowBody, hashWorkflowSource, headingStructureValidator, identityJcs, implementationAgentProfile, insertRunIdIntoSentence, invoiceFromJournal, isClaimJudgeLabel, isEscalated, isSchemaPairSpec, isStandardSchemaSpec, isStrictCompatibleSchema, journalPricingSnapshot, kMaxOf, knowledgeHash, ladderLengthOf, ladderRungChoice, lastMechanicalRepairCostUsd, lastRunSettle, latestProgressReport, lexShellCommand, liftRetainedParts, lineageWeightOf, localKeyProvider, logicalRunTelemetry, makeOrchestratorWorkflow, manifestValidators, maskSecrets, maskSecretsDeep, maskSecretsJson, matchArgvPattern, matchShellCommand, mcp, memoryQuotaLimiter, mergeQuotaDenial, mergeUsageLimits, metaMatchesFilter, minMatchesValidator, modelEpochOf, modelKnowledgeCard, modelSpecIdentity, needsSeparateExtract, nextFailover, nodeLinkKey, normalizeApproachTag, normalizeEntry, normalizeExecutionScope, normalizeFallbacks, openEffectLane, openWireIntentsOf, orchestrate, orchestratorAdmissionEstCostUsd, pairDraftClaims, pairRunFactClaims, parallelScope, parseCitationVerdicts, parseModelRef, parseScopePath, parseTerminalEnvelope, persistedTerminalEnvelope, phiInitialOf, pilotAgentProfile, pipelineScope, planNodeScope, preflightEstimate, priceComponentsOf, priceEntryBilling, priceEntryUsage, priceUsdOf, productionAcceptable, profileCard, profileRegistrySnapshotHash, progressReportTool, projectHistory, projectIdentity, projectToJsonSchema, proposalStatement, providerOf, quotaActualRequestsDelta, quotaActualTokens, quotaEstimateTokens, quotaRuleAdmission, quotaRuleKey, quotaRuleMatches, readApprovalExpired, readApprovalRevoked, readEffectLaneDecision, readRunMeta, readTerminationInit, reconcileRunMeta, reconcileStatement, reduceAuditTrail, reduceCriticalPath, reduceDecisionChain, reduceInvocationTable, registryKeyRing, remeasureQueue, renderCapacitySheetMarkdown, renderContractRequirements, repairLedgerFromJournal, replayDisposition, repositoryResearchToolset, requiredFieldsValidator, requiredMentionsValidator, requiredSectionsValidator, researchAgentProfile, reservationMinus, resolveCitationAuditPlan, resolveModelInvocation, resolvePricing, resolveToolset, retentionKeyOf, retryClassOf, retryDelayMs, retryWireMultiplier, reviewAgentProfile, roleConfiguredInRouting, roundOneDisposition, runAgent, runProfile, sampleCitationRows, sanitizeTerminalText, sanitizeTokenCount, sanitizeUsage, sanitizeUsageDelta, scanJournalCompatibility, schemaHash, schemaHashOfSpec, scopeBucket, sectionCitationsValidator, sectionPatternCountValidator, sectionalRoundPlan, selectStructuredOutputTier, selfTestFinishValidation, semanticRoundArming, semanticTerminalVerdictOf, sfqGrantOrder, sfqRecordArrival, sfqRecordGrant, sfqTagsOnArrival, shouldCompact, snapshotQuotaRules, snapshotUsage, spawnDepthOf, spliceSections, statementFromRows, statementRowsFromDelimited, stripFencedBlocks, sumUsage, summarizeInstruction, summarizeOutput, synthesisCandidatesFromJournal, synthesizeSpanClassOf, terminalEnvelopeOf, terminationConfigDrift, tierWithinCaps, toApprovalDecision, toJournalValue, tool, toolAuthority, toolCalibrationFromJournal, toolContract, toolContractHash, toolsetAuthorityHash, toolsetHash, ttlState, unionOfIntervalsMs, usageViolations, validateClaimMapStructure, validateDetachedResolution, validateEditorialCommit, validateEngineAdmissionConfig, validateEngineQuotaConfig, validateEntryShape, validateEscalationLimits, validateEscalationReport, validateQuotaRules, validateRetryPolicy, validateSchemaSpec, validateTerminationLimits, validateToolsetAttestation, validateUsageLimits, verifyCandidateBytes, windowAdmits, windowAdvance, windowConsume, windowRefund, windowSum, wireCapacityEstimate, wordCountValidator, workflowScope, workflowSourceRef, wrapJournalStore, wrapTranscriptStore };