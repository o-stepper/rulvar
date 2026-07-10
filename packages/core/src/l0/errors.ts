/**
 * L0 error taxonomy (M1-T02).
 *
 * Owning spec: docs/02-architecture.md, section "Error taxonomy". The
 * string-code registry below is CLOSED: adding a code requires an amendment
 * to that section. Classes whose producers ship in later milestones are
 * still defined here so the registry closes exactly once.
 */
import type { Json } from './json.js';

/**
 * JSON-serializable error projection stored in journal entries
 * (JournalEntry.error) and sent across process boundaries (worker sandbox
 * RPC, HTTP server). Raw Error objects never enter the journal.
 */
export type WireError = {
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
export type ErrorCode =
  | 'agent'
  | 'config'
  | 'non_serializable_value'
  | 'script_rejected'
  | 'journal_compat'
  | 'invalid_resolution'
  | 'journal_order_violation'
  | 'plan_invariant'
  | 'replay_plan_hash_mismatch'
  | 'orchestrator_cap_config'
  | 'journal_miss'
  | 'budget_exhausted'
  | 'admission_rejected'
  | 'sandbox_limit'
  | 'lease_held'
  | 'knowledge_cas';

/** docs/02 names the registry type LurkerErrorCode; both names are public. */
export type LurkerErrorCode = ErrorCode;

/**
 * Base class for all engine-raised errors. "Retryable" means the engine's
 * own retry machinery (RetryPolicy under the journal, docs/04) MAY retry;
 * it never means a provider SDK autoretry, which is disabled.
 */
export abstract class LurkerError extends Error {
  abstract readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly data?: Json;

  constructor(message: string, opts?: { retryable?: boolean; data?: Json; cause?: unknown }) {
    super(message, opts?.cause === undefined ? undefined : { cause: opts.cause });
    this.name = new.target.name;
    this.retryable = opts?.retryable ?? false;
    if (opts?.data !== undefined) {
      this.data = opts.data;
    }
  }

  toWire(): WireError {
    const wire: WireError = {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
    };
    if (this.data !== undefined) {
      wire.data = this.data;
    }
    return wire;
  }
}

/**
 * Construction- and definition-time misconfiguration: duplicate adapterId,
 * non-git host for worktree isolation, worker over a non-leasable store,
 * failed schema projection. Never journaled; raised before any run effect.
 */
export class ConfigError extends LurkerError {
  readonly code = 'config' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * A value failed the journal append JSON-serializability check. Never
 * journaled; thrown at the call site whose value failed the check.
 */
export class NonSerializableValueError extends LurkerError {
  readonly code = 'non_serializable_value' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * compileScript rejected planner-generated source. Never journaled as its
 * own entry; surfaced as diagnostics to the plan() self-repair loop
 * (producers ship in M6).
 */
export class ScriptRejected extends LurkerError {
  readonly code = 'script_rejected' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/** Sub-code detail of JournalCompatibilityError (docs/03, section "hashVersion"). */
export type JournalCompatSubCode = 'HASH_VERSION_TOO_OLD' | 'HASH_VERSION_TOO_NEW';

/**
 * Refusal to open a journal whose hashVersion falls outside the engine's
 * support window (docs/03, section "hashVersion"; producers ship in M2).
 * The registry code is 'journal_compat'; the docs/03 sub-codes live on
 * `subCode` and in `data`.
 */
export class JournalCompatibilityError extends LurkerError {
  readonly code = 'journal_compat' as const;
  readonly subCode: JournalCompatSubCode;
  readonly runId: string;
  /** Seq of the first violating entry. */
  readonly entrySeq: number;
  readonly entryHashVersion: number;
  readonly supportedRange: { min: number; max: number };
  /** 'enable deriverV1 from @lurker/compat' or 'upgrade lurker'. */
  readonly hint: string;

  constructor(
    message: string,
    detail: {
      subCode: JournalCompatSubCode;
      runId: string;
      entrySeq: number;
      entryHashVersion: number;
      supportedRange: { min: number; max: number };
      hint: string;
    },
  ) {
    super(message, {
      retryable: false,
      data: {
        subCode: detail.subCode,
        runId: detail.runId,
        entrySeq: detail.entrySeq,
        entryHashVersion: detail.entryHashVersion,
        supportedRange: { min: detail.supportedRange.min, max: detail.supportedRange.max },
        hint: detail.hint,
      },
    });
    this.subCode = detail.subCode;
    this.runId = detail.runId;
    this.entrySeq = detail.entrySeq;
    this.entryHashVersion = detail.entryHashVersion;
    this.supportedRange = detail.supportedRange;
    this.hint = detail.hint;
  }
}

/**
 * A resolution attempt against an already-closed suspension, rejected under
 * the first-closing-wins fold; appends no entry (docs/03, section
 * "Suspension and resolutions"; producers ship in M2).
 */
export class InvalidResolutionError extends LurkerError {
  readonly code = 'invalid_resolution' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * A breach of the total per-run append order: an unfenced concurrent writer
 * or a store violating contract A2 (docs/03, section "Storage SPI").
 */
export class JournalOrderViolation extends LurkerError {
  readonly code = 'journal_order_violation' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/** PlanRunner plan-invariant rejection (docs/07; producers ship in M7). */
export class PlanInvariantError extends LurkerError {
  readonly code = 'plan_invariant' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * Raised at resume when the refolded plan state disagrees with the
 * journaled planHash chain (docs/07; producers ship in M7).
 */
export class ReplayPlanHashMismatch extends LurkerError {
  readonly code = 'replay_plan_hash_mismatch' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * Invalid orchestrator cap and finalize-reserve configuration, thrown
 * before the first LLM call (docs/06, section "Three-layer budget", DEF-7;
 * producers ship in M6/M7).
 */
export class OrchestratorCapConfigError extends LurkerError {
  readonly code = 'orchestrator_cap_config' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * A replay-strict run encountered a call that would go live
 * (@lurker/testing; producers ship in M2).
 */
export class JournalMissError extends LurkerError {
  readonly code = 'journal_miss' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * The run budget ceiling blocked further work. The budget guard denial is
 * a decision entry; ctx primitives throw this as AgentError kind 'budget';
 * the run reports outcome 'exhausted', overriding 'error' (docs/06, section
 * "Three-layer budget").
 */
export class BudgetExhaustedError extends LurkerError {
  readonly code = 'budget_exhausted' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
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
export class AdmissionRejectedError extends LurkerError {
  readonly code = 'admission_rejected' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * A WorkerSandboxRunner resource-limit breach (docs/06, section 8.2;
 * M6-T02): crossing timeoutMs or memoryMb terminates the worker and the
 * run completes with outcome 'error' carrying this error's WireError
 * projection; `data` records { reason: 'timeout' | 'memory', limit }.
 * The class itself is never journaled as an entry of its own.
 */
export class SandboxError extends LurkerError {
  readonly code = 'sandbox_limit' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * acquire() on a currently held lease. Retryable by contract: retry after
 * the lease ttl elapses or the holder releases (docs/03, section
 * "Storage SPI").
 */
export class LeaseHeldError extends LurkerError {
  readonly code = 'lease_held' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: true, ...opts });
  }
}

/**
 * commit() on a ModelKnowledgeStore against a snapshot version that is
 * no longer current. Retryable by contract: re-read current(), rebase
 * the ops, commit again, mirroring the lease fencing discipline
 * (docs/05, section "Commit discipline").
 */
export class KnowledgeCasError extends LurkerError {
  readonly code = 'knowledge_cas' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: true, ...opts });
  }
}

/**
 * The vendored Standard Schema issue shape (docs/06, section "Canonical Ctx
 * interface"): validation issues carried on AgentError and surfaced to the
 * model during bounded schema re-prompts.
 */
export type Issue = {
  message: string;
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
};

/**
 * The structured error value carried on AgentResult.error and journaled
 * inside the agent terminal entry. Deliberately NOT a LurkerError subclass
 * (docs/02, section "Error taxonomy").
 */
export type AgentError = {
  kind: 'transport' | 'rate-limit' | 'schema-mismatch' | 'tool' | 'budget' | 'terminal';
  retryable: boolean;
  retryAfterMs?: number;
  issues?: Issue[];
};

/**
 * Projects an AgentError to its WireError form: code 'agent', with kind,
 * retryAfterMs, and issues carried in data (docs/02, section "Error
 * taxonomy"). Issue paths are flattened to JSON-safe segments.
 */
export function agentErrorToWire(error: AgentError, message: string): WireError {
  const data: { [key: string]: Json } = { kind: error.kind };
  if (error.retryAfterMs !== undefined) {
    data.retryAfterMs = error.retryAfterMs;
  }
  if (error.issues !== undefined) {
    data.issues = error.issues.map((issue): Json => {
      const out: { [key: string]: Json } = { message: issue.message };
      if (issue.path !== undefined) {
        out.path = issue.path.map((segment): Json => {
          const key = typeof segment === 'object' && segment !== null ? segment.key : segment;
          return typeof key === 'number' ? key : String(key);
        });
      }
      return out;
    });
  }
  return { code: 'agent', message, retryable: error.retryable, data };
}

/**
 * Reads an AgentError back from its WireError projection. Throws a
 * ConfigError when the wire code is not 'agent'.
 */
export function agentErrorFromWire(wire: WireError): AgentError {
  if (wire.code !== 'agent') {
    throw new ConfigError(`agentErrorFromWire: expected code 'agent', got '${wire.code}'`);
  }
  const data = (wire.data ?? {}) as { [key: string]: Json };
  const error: AgentError = {
    kind: data.kind as AgentError['kind'],
    retryable: wire.retryable,
  };
  if (typeof data.retryAfterMs === 'number') {
    error.retryAfterMs = data.retryAfterMs;
  }
  if (Array.isArray(data.issues)) {
    error.issues = data.issues.map((raw): Issue => {
      const record = raw as { [key: string]: Json };
      const issue: Issue = {
        message:
          typeof record.message === 'string' ? record.message : JSON.stringify(record.message),
      };
      if (Array.isArray(record.path)) {
        issue.path = record.path.map((segment) =>
          typeof segment === 'number' || typeof segment === 'string'
            ? segment
            : JSON.stringify(segment),
        );
      }
      return issue;
    });
  }
  return error;
}
