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
type ErrorCode = "agent" | "config" | "non_serializable_value" | "script_rejected" | "journal_compat" | "invalid_resolution" | "journal_order_violation" | "plan_invariant" | "replay_plan_hash_mismatch" | "orchestrator_cap_config" | "journal_miss" | "budget_exhausted" | "fail_run" | "admission_rejected" | "sandbox_limit" | "lease_held" | "knowledge_cas" | "determinism";
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
  finalizeReserve?: boolean;
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
* (v1.20.0 review follow-up).
*/
declare function priceEntryUsage(entry: JournalEntry, priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined): PricedUsage;
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
  * The run's immutable USD ceiling (RunOptions.budgetUsd), recorded so
  * resume restores the original invocation's bound. Absent when the
  * run started without a ceiling. Stores must round-trip the field
  * (the conformance kit checks); a store that drops it degrades a
  * resumed run to uncapped.
  */
  budgetUsd?: number;
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
  * and unsalted, so it reveals when two runs (in this store or another)
  * were started with identical args, and low-entropy args (a boolean,
  * an approval flag, a role, a short id) are recoverable by hashing
  * candidate values. Protect meta, `inspect` output, and run listings
  * with the same access control as the journal and transcripts; the
  * digest confers no confidentiality on the args it binds. Stores must
  * round-trip the field (the conformance kit checks).
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
*/
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
interface JournalSerializationHook {
  /** Applied at append; kernel ordering/identity fields MUST pass through. */
  toStored(e: JournalEntry): JournalEntry;
  /** Applied at load; MUST be symmetric with toStored for replay to hold. */
  fromStored(e: JournalEntry): JournalEntry;
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
//#region src/l0/spi/provider.d.ts
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
  * Provider family for provider-raw matching and retention (committed
  * during M4-T02). Two adapters of the same
  * family share retained blocks and projections; default = id.
  */
  provider?: string;
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
  stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent>;
  countTokens?(req: ChatRequest): Promise<number>;
}
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
* policy; only 'inprocess' is enforced in v1, subprocess/container remain
* declared capability while the executor design stays an open question.
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
  /** The engine's configured tenant; absent when the host set none. */
  tenant?: string;
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
  reconcile(reservationId: string, usage: Usage): Promise<void>;
}
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
/** Large-value soft warn threshold (committed for M2). */
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
  /** Set only when the call spanned several serving models; see JournalEntry. */
  usageByModel?: UsageSlice[];
  /** Attribution facts behind the CostReport breakdowns; see JournalEntry. */
  costAttribution?: CostAttributionFacts;
  /** The serving adapter's usage-semantics version; see JournalEntry. */
  usageSemantics?: string;
  transcriptRef?: string;
  checkpointRef?: string;
  /** Terminal agent entries: Artifact list. */
  artifacts?: unknown;
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
  * The budget ledger fold: usage sums over terminal entries exactly once; agentsSpawned
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
*/
interface QuotaRule {
  /** Adapter id, as in `concurrency.perProvider` keys. */
  provider?: string;
  model?: string;
  tenant?: string;
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
/** True when every dimension the rule pins matches the request. */
declare function quotaRuleMatches(rule: QuotaRule, request: QuotaReservationRequest): boolean;
/** The tokens a reservation is admitted under: input estimate plus the output cap. */
declare function quotaEstimateTokens(request: QuotaReservationRequest): number;
/** The tokens a settled attempt actually consumed. */
declare function quotaActualTokens(usage: Usage): number;
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
  * What a limiter infrastructure FAILURE (reserve throwing) means:
  * 'deny' (default, fail closed) converts it into a retryable
  * transport-class denial; 'allow' logs a warning and dispatches
  * without a reservation. A limiter DENIAL is unaffected by this
  * knob. reconcile failures only ever warn.
  */
  onLimiterError?: "deny" | "allow";
}
/** The resolved engine-side quota runtime threaded into every run. */
interface EngineQuotaRuntime {
  limiter: QuotaLimiter;
  tenant?: string;
  onLimiterError: "deny" | "allow";
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
  /** Applied by the timeout resolution (by: 'timeout'); default accept. */
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
  * The exploration guard counters (RV-210). Present live whenever
  * any exploration guard limit was configured for the invocation;
  * on replay present only when the guard abort journaled it in the
  * terminal error payload.
  */
  exploration?: ExplorationSummary;
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
/** Tool lifecycle (emitters arrive with the tool system, M3). */
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
  * Present when an exploration guard (RV-210), not the permission
  * chain, denied the call: the outcome is 'denied' and the call was
  * never dispatched.
  */
  guard?: "repeated-signature";
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
  * when greater than zero. Live telemetry only: the ctx layer surfaces
  * it as `agent:end` retryCount; it is never journaled, so a replayed
  * result omits it (absent means "zero or unknown").
  */
  transportRetries?: number;
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
  /** Live usage accounting; layer 3 may respond by aborting `signal`. */
  onUsage(usage: Usage, servedBy: ModelRef): void;
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
  * was paid: retryAfterMs drives the interruptible backoff, attempts
  * stay bounded by RetryPolicy, and exhaustion fails over (the
  * takeover reserves under its own model). Granted reservations are
  * reconciled with the attempt's actual usage after the outcome
  * settles. Live-only by construction: replayed calls never reach
  * this seam, and nothing here is journaled.
  */
  quota?: {
    reserve: (request: QuotaReservationRequest) => Promise<QuotaDecision>;
    reconcile: (reservationId: string, usage: Usage) => Promise<void>; /** Limiter infrastructure failure policy; a denial is unaffected. */
    onLimiterError: "deny" | "allow";
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
    }) => Promise<{
      ok: true;
    } | {
      ok: false;
      feedback: Record<string, unknown>;
    }>;
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
/** The spawn's frozen toolset snapshot plus its identity hash. */
interface ResolvedToolset {
  tools: ToolDef[];
  contracts: ToolContract[];
  hash: string;
}
/** The empty toolset (no tools declared anywhere). */
declare function emptyToolset(): ResolvedToolset;
/**
* Expands registered names and sources, validates every tool name and
* duplicate names across the whole toolset (ConfigError at spawn time),
* and computes the toolsetHash over contracts sorted by name. The
* `toolsets` registry is the engine's `defaults.toolsets` snapshot;
* without one, string entries fail with the same unknown-name error as
* a miss, so nothing outside the declared registry is ever reachable.
*/
declare function resolveToolset(specs: ToolsOption | undefined, session: ToolSourceSession, toolsets?: Record<string, ToolsOption>): Promise<ResolvedToolset>;
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
  /** B0; immutable after start, no API including HITL can top up. */
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
/** The run-root account scope. */
declare const ROOT_ACCOUNT = "run";
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
  /** B0; immutable after start. Undefined means no USD ceiling. */
  readonly ceilingUsd?: number;
  private readonly lifetimeSpawnCap;
  private readonly events?;
  private readonly priceUsd?;
  private readonly pricingOf?;
  private readonly accounts;
  private usageInternal;
  private agentsSpawnedInternal;
  private exhaustedInternal;
  /** Models already warned about; the warning fires once per model per run. */
  private readonly unpricedWarned;
  /** Models whose price function already returned an invalid USD once. */
  private readonly invalidPriceWarned;
  constructor(options: {
    ceilingUsd?: number;
    lifetimeSpawnCap?: number;
    events?: RuntimeEventSink;
    priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined; /** Raw price-row resolution for the layer-2b output bound. */
    pricingOf?: (servedBy: ModelRef) => Pricing | undefined;
    /**
    * The resume ledger fold: spend is never
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
  admitSpawn(reserveUsd: number, accountScope?: string): void;
  /**
  * Resume roll-forward: commits a reserve recovered from a journaled
  * spawn-admission decision entry without re-evaluating admission
  * (reserves are recovered, never re-estimated).
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
  /** The reserve is replaced by real spend when the spawn settles. */
  releaseReserve(reserveUsd: number, accountScope?: string): void;
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
  maxAffordableOutputTokens(servedBy: ModelRef, estimatedInputTokens: number, accountScope?: string): number | undefined;
  /**
  * Live accounting; spend propagates from `accountScope` to every
  * ancestor. Crossing a ceiling severs the crossing account's subtree
  * via its layer-3 AbortSignal (overshoot bounded by one turn per
  * in-flight agent; providers bill severed streams).
  */
  onUsage(usage: Usage, servedBy: ModelRef, accountScope?: string): void;
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
    flatReserveUsd?: number; /** Per-orchestrate spawn cap (maxSpawns); engine lifetime cap applies regardless. */
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
  * dispatch rejection instead of a strand.
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
//#region src/engine/cost-report.d.ts
/** Folds the per-run attribution buckets into the normative CostReport. */
declare function buildCostReport(attribution: CostAttribution, totalUsd: number): CostReport;
/**
* The pure journal fold: the complete CostReport from terminal entries,
* the same summation the kernel ledger uses (terminal usage exactly
* once, priced per servedBy slice, abandoned subtrees contribute zero).
* The orchestrator block folds too: spend attributed to the
* orchestrator sub-account, the reserve-funded share of it, the armed
* wake count, and the at-cap freeze flag from the journaled cap
* decision, so a replay-only resume reproduces the block instead of
* reading this process's live accounts (which a replay never charges).
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
/** Full contract: https://docs.rulvar.com/guide/observability. */
interface CostReport {
  totalUsd: number;
  /** Keyed by canonical ModelRef 'adapterId:model'. */
  byModel: Record<string, number>;
  /** ctx.phase names; phase is structural for this map. */
  byPhase: Record<string, number>;
  byAgentType: Record<string, number>;
  byRole: Record<InvocationRole, number>;
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
type RunOutcome<R> = {
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  value?: R;
  error?: WireError; /** Pipeline drops and onError:'null' losses; silent losses are forbidden. */
  dropped: DroppedItem[]; /** Suspensions open at settle time (M2). */
  pending: PendingExternal[];
  usage: Usage;
  cost: CostReport;
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
  /** Cooperative cancellation; the run settles 'cancelled' with a complete CostReport. */
  cancel(reason?: string): Promise<void>;
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
/**
* Dollars from normalized usage against one pricing row. Under the Usage
* invariant inputTokens is the FULL prompt including cache reads and
* writes, so the input rate bills only the uncached remainder and cache
* tokens bill at their own rates, never twice; a row that omits a cache
* rate bills those tokens at the plain input rate rather than silently
* for free. A row may carry long-context tiers: the highest threshold
* strictly below the full prompt re-prices the ENTIRE request
* (input-side rates scale by inputMultiplier, the output rate by
* outputMultiplier). Cache writes price at the 5m premium rate; the 1h
* rate applies where a provider distinguishes it in usage, which the
* canonical Usage does not yet carry.
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
  * The default key-masking policy at the telemetry boundary. Default
  * ON: key-shaped strings in every
  * emitted WorkflowEvent are masked; never touches the journal.
  */
  redaction?: {
    maskEvents?: boolean;
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
}
interface RunOptions {
  /** Explicit id; otherwise the engine mints a ULID. */
  runId?: string;
  /**
  * Run ceiling B0; immutable after start. Enforced by projected
  * admission (a spawn whose reserve does not fit is denied before any
  * dispatch), the per-turn guard with a budget-derived maxOutputTokens
  * clamp, and live stream cuts on crossing; the residual
  * provider-dependent overshoot is bounded by one in-flight turn per
  * concurrent agent. Contract: https://docs.rulvar.com/guide/budgets.
  */
  budgetUsd?: number;
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
  * loudly and proceeds (the journal decides replay per content keys).
  * A compiled run resumes WITHOUT wf: the engine rehydrates the
  * persisted source pinned by workflowHash; supplying a compiled wf
  * whose source hash differs from the recorded one is a typed
  * ConfigError (M6-T02).
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
}
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
declare function hashRunArgs(args: unknown): string | undefined;
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
}
/** The verdict of one validator over one finish attempt. */
type FinishValidationVerdict = {
  ok: true;
} | {
  ok: false;
  reasons: string[];
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
* Requires every named section to appear LITERALLY in the result text
* (a heading like 'FINDINGS' or any marker the goal demands). Default
* name 'required-sections'; pass `name` to run several instances.
*/
declare function requiredSectionsValidator(options: {
  sections: string[];
  name?: string;
}): FinishValidator;
/**
* Requires the result to be a JSON object carrying every named field
* with a substantial value: present, not null, and not an empty or
* whitespace only string (empty arrays, zero, and false COUNT as
* present; emptiness rules beyond strings belong to a custom
* validator). Default name 'required-fields'.
*/
declare function requiredFieldsValidator(options: {
  fields: string[];
  name?: string;
}): FinishValidator;
/** The default citation shape: a path with an extension, a colon, a line number. */
declare const DEFAULT_CITATION_PATTERN = "[\\w./-]+\\.\\w+:\\d+";
/** The default preserved share, the improvement plan's RV-202 gate. */
declare const DEFAULT_EVIDENCE_MIN_SHARE = .95;
/**
* The RV-202 evidence preservation contract: the finish result must
* PRESERVE the citations the children actually produced. Distinct
* matches of `pattern` are collected across the outputs of children
* settled 'ok' (spawn order); at least `minShare` of them (default
* {@link DEFAULT_EVIDENCE_MIN_SHARE}, the plan's 95 percent gate,
* compared as a ceiling on the required count so an exact boundary like
* 19 of 20 passes) must appear literally in the result text. Zero child
* citations pass vacuously. With `requireKnown: true` the contract also
* runs in reverse: every citation in the RESULT must appear in some
* child's output, so a fabricated but pattern valid citation is
* rejected instead of silently counting as evidence. Rejection reasons
* list the missing (and unknown) citations, capped at 20, so the repair
* turn can restore them. Purely textual and deterministic; checking
* that cited targets EXIST on disk is host territory (a custom
* validator), not this contract. Default name 'evidence-preserved'.
*/
declare function evidencePreservedValidator(options?: {
  pattern?: string;
  flags?: string;
  minShare?: number;
  requireKnown?: boolean;
  name?: string;
}): FinishValidator;
/**
* Requires at least `min` matches of `pattern` in the result text (the
* plan's citation and source count checks: a file:line pattern, a URL
* pattern). The pattern compiles at construction (invalid patterns are a
* ConfigError before any run exists) and matches globally; `min` is a
* positive integer. Default name 'min-matches'; pass `name` to run
* several instances, because names must be unique per orchestrate call.
*/
declare function minMatchesValidator(options: {
  pattern: string;
  flags?: string;
  min: number;
  name?: string;
}): FinishValidator;
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
}
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
  }): Promise<{
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
  * A positive integer, validated before any journal entry or dispatch:
  * the turn limit of the reserved final wake.
  */
  finalizeTurns?: number;
  /**
  * The policy at the cap, validated as exactly one of the two literals
  * even at a plain JS/JSON boundary. 'finish-with-partial' (default)
  * runs the reserved finalizer and returns its partial result with run
  * outcome 'ok'. 'fail-run' skips the finalizer entirely: the run
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
* ok. A budget cap settle keeps its atCap policy: the cap partial is
* already visible as run status 'exhausted' or the typed fail run error,
* never a plain ok, so acceptance does not judge it again.
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
}
/** How many rejected finishes are repaired by default: the plan's repair once. */
declare const DEFAULT_FINISH_MAX_REPAIRS = 1;
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
* The opt in deterministic validation of the orchestrator finish result
* (the v1.40.0 improvement plan's RV-204 slice). Every SCHEMA valid
* finish({ result }) call first passes the configured host validators;
* a rejection returns the failure reasons to the model as the call's
* error tool result and the turn continues (a repair turn: the model
* fixes the result and calls finish again), bounded by maxRepairs. A
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
  * finish fails the run.
  */
  maxRepairs?: number;
}
interface OrchestrateOptions {
  model?: ModelSpec;
  /** Registered profile names to advertise; default: every profile. */
  profiles?: string[];
  /**
  * Per-orchestrate spawn cap: a nonnegative integer (zero admits no
  * spawns), validated before any journal entry or dispatch. The engine
  * lifetime cap applies regardless.
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
  * { maxTurns: 2 }. Ignored in 'single' mode.
  */
  noteLimits?: UsageLimits;
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
declare const ORCHESTRATE_WORKFLOW_NAME = "rulvar-orchestrate";
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
* (the orchestrator and every child), immutable after start, while
* `opts.budget` only shapes the orchestrator's own sub-account inside
* that ceiling. The shortcut previously accepted no RunOptions at all,
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
  constructor(replayer: Replayer, emitEvent?: (body: WorkflowEventBody) => void);
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
    risk?: string; /** Called with the suspended entry once it is open (live or re-parked). */
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
  private resolveDetached;
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
  /** Chain layers merged over engine defaults. */
  permissions?: AgentProfilePermissions;
  /** Isolation default; the RESOLVED value enters identity. */
  isolation?: IsolationSpec;
  /** Flavor B opt-in lives here or on the call. */
  escalation?: EscalationOptions;
  limits?: UsageLimits;
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
  /** The run root span; every top-level span parents on it. */
  rootSpanId: string;
  transcripts: TranscriptStore;
  /**
  * Queue mode: the segment's lease, threaded into EVERY transcript
  * blob write of the segment (checkpoints, compaction summaries,
  * worktree patches) exactly as the Replayer threads it into every
  * journal append, so a store declaring fencedWrites refuses a
  * superseded segment's blob overwrites (fenced run state RFC, F2).
  */
  lease?: Lease;
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
    gates?: Record<string, MechanicalGateProfile>;
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
* The last journaled run settle of a journal, if any. `outputHash` is
* present when that settle recorded the result digest (RV-209; settles
* written before it, or over undefined/non-serializable results, carry
* none).
*/
declare function lastRunSettle(entries: readonly JournalEntry[]): {
  runStatus: RunStatus;
  seq: number;
  outputHash?: string;
} | undefined;
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
//#region src/stores/jsonl.d.ts
declare class JsonlFileStore implements MetaLookupStore {
  private readonly dir;
  /**
  * The stored tail seq per run, lazily initialized from the file on the
  * first append this instance performs (obligation A5). Per instance by
  * design: cross-process writers are the lease seam's job.
  */
  private readonly lastSeq;
  constructor(options: {
    dir: string;
  });
  private journalPath;
  private metaPath;
  append(runId: string, e: JournalEntry): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
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
declare function liftRetainedParts(providerMetadata: Record<string, unknown> | undefined, adapter: Pick<ProviderAdapter, "id" | "provider">): Part[];
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
/** finish; result validates against the declared output schema. */
declare const FINISH_SCHEMA: SchemaSpec;
declare const FINISH_TOOL_NAME = "finish";
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
}): ToolDef[];
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
  private readonly maskEvents;
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
  usageApprox: boolean;
  retryCount: number;
  replayed: boolean;
  /** True when the span's agent:end never arrived. */
  open: boolean;
  phases: PhaseRow[];
}
/** The reduced table plus the per-role aggregate across every span. */
interface InvocationTable {
  agents: AgentInvocationRow[];
  /** Aggregated over COMPLETED phase pairs, keyed by role. */
  byRole: Record<string, {
    usage: Usage;
    costUsd: number;
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
  /** Summed wall of completed 'synthesize' spans (0 when none). */
  synthesisMs: number;
  /** postFanInMs / runWallMs when both are defined and the wall is > 0. */
  postFanInShare?: number;
  /** synthesisMs / runWallMs under the same conditions. */
  synthesisShare?: number;
  /** Settled non-coordination agent spans that anchored the fan-in. */
  workerSpans: number;
}
declare function reduceCriticalPath(events: Iterable<WorkflowEvent>): CriticalPath;
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
export { AWAIT_SCHEMA, AbandonAttempt, AbandonFold, AbandonPayload, AbandonedSpendView, AbortClass, type AdaptiveEvents, AdmissionController, AdmissionDecision, AdmissionRejectedError, AdmissionStatsBefore, AdmitLineage, AdmitRejectReason, AdmitSpec, AdmitVerdict, AgentCallError, AgentError, type AgentEvents, AgentIdentityInput, type AgentInvocationRow, AgentOpts, AgentProfile, AgentProfilePermissions, AgentProfileTemplateOptions, AgentResult, AgentResultMeta, AgentStatus, ApproachSignatureInputs, ApprovalDecision, ApprovalIdentityInput, Artifact, AttemptOutcomeClass, AuditRunsOptions, BUDGET_ABORT_REASON, BaseAppend, BriefOpts, BudgetAccountView, BudgetDefaults, BudgetExhaustedError, BudgetExhaustionDiagnostics, BudgetHooks, BudgetReserve, type Bytes, CANCEL_AGENT_SCHEMA, CHECKPOINT_FORMAT_V1, CLAIM_STATEMENT_MAX_CHARS, CLAIM_TTL_DAYS, COMPACTION_SUMMARY_PREFIX, CURRENT_HASH_VERSION, CacheHint, CacheTtl, CanUseTool, CanonicalId, CanonicalIdentity, CanonicalLadderSpec, CanonicalModelSpec, ChatEvent, ChatRequest, CheckpointState, ChildArtifactPage, ChildIdentityInput, ChildResultPage, type ClaimClass, type ClaimOp, type ClaimStatus, ClaimValidationOptions, CollectOpts, CollectedTurn, CompactionConfig, CompiledPermissionChain, CompiledWorkflow, ConfigError, type CoreEvents, CostAttribution, CostAttributionFacts, CostReport, CreateEngineOptions, type CriticalPath, Ctx, DEFAULT_CHILD_BUDGET_FRACTION, DEFAULT_CHILD_RESULT_PAGE_CHARS, DEFAULT_CITATION_PATTERN, DEFAULT_COMPACTION_THRESHOLD, DEFAULT_ESCALATION_LIMITS, DEFAULT_EVIDENCE_MIN_SHARE, DEFAULT_FINISH_MAX_REPAIRS, DEFAULT_FLAT_RESERVE_USD, DEFAULT_MAX_CHILDREN_PER_NODE, DEFAULT_MAX_DEPTH, DEFAULT_MAX_OSCILLATIONS_PER_KEY, DEFAULT_MAX_PINNED_WORKTREES, DEFAULT_MAX_REVISIONS_PER_RUN, DEFAULT_MAX_TOTAL_SPAWNS, DEFAULT_MAX_TURNS, DEFAULT_MODEL_RETRY_ATTEMPTS, DEFAULT_NO_PROGRESS_TURNS, DEFAULT_PER_RUN_CONCURRENCY, DEFAULT_RETRY_POLICY, DEFAULT_STREAM_IDLE_TIMEOUT_MS, DEFAULT_SYNTHESIS_MAX_TURNS, DEFAULT_SYNTHESIS_NOTE_MAX_TURNS, DebitResult, DeclaredLadder, DedupIndex, DedupNote, DedupedClaims, DerivedKey, DeriverRegistry, type DeterminismConfig, DeterminismError, type DeterminismEvents, type DeterminismMode, DispositionRule, DispositionTable, DonorCandidate, DonorRef, DroppedItem, EMIT_RESULT_TOOL, EMPTY_SCHEMA_HASH, EMPTY_TOOLSET_HASH, ESCALATE_TOOL_NAME, ESCALATION_REPORT_SCHEMA, ESCALATION_REQUEST_SCHEMA, EVENT_SEGMENT_STRIDE, EffectiveUsageLimits, Effort, Engine, EngineDefaults, EngineQuotaConfig, EngineQuotaRuntime, EntryKind, EntryRef, EntryStatus, ErrorClass, ErrorCode, ErrorPolicy, EscalatedResult, EscalationDecision, EscalationDecisionAbortedError, EscalationDigest, EscalationKind, EscalationLimits, EscalationOptions, EscalationReport, EscalationRequest, EventBus, type EvidenceRef, type ExplorationSummary, ExtensionAppendInput, ExtensionDispatchSpec, ExternalIdentityInput, ExternalRegistry, ExtractNecessityInput, FINALIZE_SYNTHESIS_INSTRUCTION, FINISH_SCHEMA, FINISH_TOOL_NAME, FailRunError, FailoverTarget, FailoverTrigger, FallbackField, FallbackTrigger, FileModelKnowledgeStore, FileModelKnowledgeStoreOptions, FileTranscriptStore, FinishInfo, FinishValidationChild, FinishValidationInput, FinishValidationSpec, FinishValidationVerdict, FinishValidator, GET_CHILD_RESULT_SCHEMA, GET_CHILD_RESULT_TOOL_NAME, Gate, GateAudit, type GateRecord, GitWorktreeProvider, GitWorktreeProviderOptions, GraftBoot, HashVersion, HookVerdict, IMPLEMENTATION_PROFILE_LIMITS, INBOX_PROPOSAL_TTL_DAYS, IdentityInput, InMemoryStore, InMemoryTranscriptStore, InProcessRunner, IncrementalSynthesisResult, InvalidResolutionError, InvocationRole, type InvocationTable, type IsolationProvider, type IsolationSpec, Issue$1 as Issue, JournalCompatSubCode, JournalCompatibilityError, JournalEntry, JournalMatcher, JournalMissError, JournalOperation, JournalOrderViolation, JournalSerializationHook, type JournalStore, type Json, JsonSchema, JsonlFileStore, KB_ACTIVE_CLAIMS_CAP, KB_CARD_RENDER_BUDGET_CHARS, type KbProposal, type KbProposalTrigger, KeyDeriver, KeyRing, KeyedLimiter, KnowledgeCasError, type KnowledgeSnapshot, LARGE_VALUE_WARN_BYTES, LEGACY_LTID_PREFIX, LEGACY_SIGNATURE_INPUTS, LINEAGE_SIG_VERSION, LadderSpec, type LeasableStore, type Lease, LeaseHeldError, Ledger, LineageCounters, LineageIndex, LineageRef, LineageRelation, LineageStats, LogicalTaskId, MASKED_SECRET, MAX_CHILD_RESULT_PAGE_CHARS, MAX_DEPTH_CEILING, MatchResult, McpConfig, McpToolSource, MechanicalGateProfile, MechanicalGateVerdict, MemoryQuotaLimiter, type MetaLookupStore, type ModelCaps, ModelChoice, type ModelClaim, ModelEpochInputs, type ModelKnowledgeHandle, type ModelKnowledgeStore, ModelListConstraint, ModelRef, ModelRetry, ModelSpec, Msg, NoProgressDetector, NodeId, NodeLinkValue, NonSerializableValueError, ORCHESTRATE_WORKFLOW_NAME, OnEscalation, OperationDisposition, OrchestrateAcceptance, OrchestrateOptions, OrchestrateSynthesis, OrchestratorBudgetSpec, OrchestratorCapConfigError, OrchestratorExtension, OrchestratorExtensionIO, OrchestratorRuntime, Out, PARALLEL_AGENTS_SCHEMA, PROGRESS_REPORT_TOOL_NAME, ParallelSiteCounter, Part, PendingExternal, PendingToolTurn, PermissionConfig, PermissionGate, PermissionHook, PermissionPreset, PermissionRule, PermissionVerdict, type PhaseRow, PhaseTarget, PipelineCollected, PipelineOpts, PlanInvariantError, PriceTable, PricedUsage, type Pricing, type PricingTier, ProgressReport, type ProviderAdapter, QUOTA_WINDOW_MS, QualityFloors, QuotaCounters, type QuotaDecision, type QuotaEstimate, type QuotaLimiter, type QuotaReservationRequest, QuotaRule, QuotaWindowSnapshot, READ_CHILD_ARTIFACT_SCHEMA, READ_CHILD_ARTIFACT_TOOL_NAME, RESEARCH_PROFILE_LIMITS, REVIEW_PROFILE_LIMITS, ROLE_EFFORT_DEFAULTS, ROOT_ACCOUNT, ROOT_SCOPE, RUN_PROFILES, RUN_SETTLE_DECISION_TYPE, RandIdentityInput, RandPayload, ReconcileOptions, ReconcileResult, RefEntryAppender, RefEntryClassification, RefusalInfo, RepeatedClaim, ReplayDisposition, ReplayMode, ReplayPlanHashMismatch, Replayer, RepositoryResearchToolset, RepositoryResearchToolsetOptions, ResearchAgentProfileOptions, ResearchAgentProfileResult, ResearchEvidenceEntry, ResolutionArbiter, ResolutionAttempt, ResolutionBy, ResolutionFold, ResolutionLayer, ResolutionOutcome, ResolutionPayload, ResolvedInvocation, ResolvedToolset, ResumeHandle, ResumeOptions, ResumePreview, ResumeReport, RetryClass, RetryPolicy, ReuseConfig, RiskRuleValue, Role, RulvarError, RulvarErrorCode, RunAgentOptions, RunAuditVerdict, RunBudget, RunEventSink, type RunFilter, RunHandle, RunInternals, type RunMeta, RunOptions, RunOutcome, RunProfile, RunStateAudit, RunStatus, RuntimeEventSink, SANDBOX_AGENT_OPT_KEYS, SPAWN_AGENT_SCHEMA, SandboxBridge, SandboxBridgeOptions, SandboxError, SandboxHostToWorker, SandboxMethod, SandboxWorkerToHost, SchemaPair, SchemaSpec, SchemaValidationResult, ScopeSegment, ScriptRejected, ScriptRunner, ScrubNote, Semaphore, SerializationHook, Settled, ShellPatternRules, ShellSegment, ShellVerdict, SinglePhaseAppend, SpanMinter, SpanRegistry, SpawnAdmissionValue, SpawnAgentParams, SpawnKey, SpawnLineage, SpawnLineageOpt, SpawnOrigin, SpawnRecord, Spend, Stage, type StandardJSONSchemaV1, type StandardSchemaV1, StepIdentityInput, StructuredOutputTier, SuspendedAppend, SuspensionState, TOOL_NAME_PATTERN, type TaskClass, TaskDigest, TaskSpec, TerminalPatch, TerminationAccount, TerminationAccountSnapshot, TerminationDeniedValue, TerminationDeniedWriter, TerminationInitValue, TerminationLimits, TerminationResource, ToolCallRequest, ToolChoice, type ToolContext, ToolContextSeed, ToolContract, type ToolDef, type ToolEvents, type ToolExecutor, ToolInit, type ToolRisk, ToolRuntime, type ToolSource, type ToolSourceSession, ToolsOption, TranscriptSerializationHook, type TranscriptStore, TriggerClass, TtlState, Usage, UsageLimits, UsageSlice, VerifiedRecommendation, WAIT_FOR_EVENTS_SCHEMA, WAIT_FOR_EVENTS_TOOL_NAME, WAKE_SUMMARY_RENDER_BUDGET_CHARS, WakeBudgetBlock, WakeDigest, WakeTrigger, WireError, Workflow, WorkflowCallOpts, type WorkflowEvent, type WorkflowEventBody, WorkflowRegistry, admissionReserveUsd, affordableOutputTokens, agentErrorFromWire, agentErrorToWire, agentResultWire, agentScope, applyClaimOps, applyStructuredOutputTier, approachSigCoarse, approachSigOf, archiveDeprecatedModelOps, assertFencedWrites, atCompactionThreshold, auditRun, auditRuns, buildAbandonFold, buildAdapterRegistry, buildCostReport, buildDeriverRegistry, buildOrchestratorTools, buildTerminationInitValue, buildToolContext, canRideLoopTurn, canonicalIsolationTag, canonicalizeLadder, canonicalizeSchema, capIssues, capsHashOf, checkFloors, checkpointRefFor, childCoveragePrefix, claimExpired, claimExpiry, claimIssues, claimOpIssues, classifyAgentError, classifyAttemptOutcome, collectDeclaredLadders, compactMessages, compilePermissionChain, compilePermissionPreset, compileVerifiedLayer, costReportFromJournal, countsAgainstLimit, createCanonicalIdMinter, createCtx, createEngine, createSandboxBridge, currentOnlyKeyRing, decodeCheckpoint, dedupeRepeatedClaims, defineWorkflow, deriveContentKey, deriverV1, deriverV2, digestOf, dispositionHook, emptyDigestBlocks, emptyToolset, encodeCheckpoint, entryUsageSlices, escalateTool, evaluatePermission, evaluateReuse, evidencePreservedValidator, executeWorkflow, exhaustionCodeOf, extractCandidate, failoverTriggerOf, fallbackTriggerOf, filterClaimsForRun, finalizeFires, foldTermination, formatRePrompt, formatScopePath, hasFencedWrites, hasMetaLookup, hashRunArgs, hashRunOutput, hashWorkflowBody, hashWorkflowSource, identityJcs, implementationAgentProfile, isEscalated, isSchemaPairSpec, isStandardSchemaSpec, isStrictCompatibleSchema, kMaxOf, knowledgeHash, ladderLengthOf, ladderRungChoice, lastRunSettle, latestProgressReport, lexShellCommand, liftRetainedParts, lineageWeightOf, makeOrchestratorWorkflow, maskSecrets, maskSecretsDeep, maskSecretsJson, matchArgvPattern, matchShellCommand, mcp, memoryQuotaLimiter, mergeQuotaDenial, mergeUsageLimits, metaMatchesFilter, minMatchesValidator, modelEpochOf, modelKnowledgeCard, modelSpecIdentity, needsSeparateExtract, nextFailover, nodeLinkKey, normalizeApproachTag, normalizeEntry, normalizeFallbacks, orchestrate, parallelScope, parseModelRef, parseScopePath, phiInitialOf, pipelineScope, planNodeScope, priceEntryUsage, priceUsdOf, profileCard, profileRegistrySnapshotHash, progressReportTool, projectHistory, projectIdentity, projectToJsonSchema, proposalStatement, providerOf, quotaActualTokens, quotaEstimateTokens, quotaRuleAdmission, quotaRuleMatches, readRunMeta, readTerminationInit, reconcileRunMeta, reduceCriticalPath, reduceInvocationTable, registryKeyRing, remeasureQueue, replayDisposition, repositoryResearchToolset, requiredFieldsValidator, requiredSectionsValidator, researchAgentProfile, resolveModelInvocation, resolvePricing, resolveToolset, retryClassOf, retryDelayMs, reviewAgentProfile, roleConfiguredInRouting, roundOneDisposition, runAgent, runProfile, sanitizeTerminalText, sanitizeTokenCount, sanitizeUsage, sanitizeUsageDelta, scanJournalCompatibility, schemaHash, schemaHashOfSpec, selectStructuredOutputTier, shouldCompact, snapshotUsage, spawnDepthOf, summarizeInstruction, summarizeOutput, terminationConfigDrift, tierWithinCaps, toApprovalDecision, toJournalValue, tool, toolContract, toolsetHash, ttlState, usageViolations, validateEditorialCommit, validateEngineQuotaConfig, validateEntryShape, validateEscalationLimits, validateEscalationReport, validateQuotaRules, validateRetryPolicy, validateSchemaSpec, validateTerminationLimits, validateUsageLimits, workflowScope, workflowSourceRef, wrapJournalStore, wrapTranscriptStore };