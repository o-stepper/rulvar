/**
 * L0 error taxonomy (M1-T02).
 *
 * Registry contract: https://docs.rulvar.com/guide/architecture. The
 * string-code registry below is CLOSED: adding a code requires an amendment
 * to that contract. Classes whose producers ship in later milestones are
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
 * The closed error-code registry.
 * 'agent' is carried by the AgentError value projection, not by a
 * RulvarError subclass.
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
  | 'fail_run'
  | 'admission_rejected'
  | 'sandbox_limit'
  | 'lease_held'
  | 'knowledge_cas'
  | 'determinism';

/** An alias for the registry type; both names are public. */
export type RulvarErrorCode = ErrorCode;

/**
 * Base class for all engine-raised errors. "Retryable" means the engine's
 * own retry machinery (RetryPolicy under the journal) MAY retry;
 * it never means a provider SDK autoretry, which is disabled.
 */
export abstract class RulvarError extends Error {
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
export class ConfigError extends RulvarError {
  readonly code = 'config' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * A value failed the journal append JSON-serializability check. Never
 * journaled; thrown at the call site whose value failed the check.
 */
export class NonSerializableValueError extends RulvarError {
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
export class ScriptRejected extends RulvarError {
  readonly code = 'script_rejected' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/** Sub-code detail of JournalCompatibilityError. */
export type JournalCompatSubCode = 'HASH_VERSION_TOO_OLD' | 'HASH_VERSION_TOO_NEW';

/**
 * Refusal to open a journal whose hashVersion falls outside the engine's
 * support window (producers ship in M2).
 * The registry code is 'journal_compat'; the sub-codes live on
 * `subCode` and in `data`.
 */
export class JournalCompatibilityError extends RulvarError {
  readonly code = 'journal_compat' as const;
  readonly subCode: JournalCompatSubCode;
  readonly runId: string;
  /** Seq of the first violating entry. */
  readonly entrySeq: number;
  readonly entryHashVersion: number;
  readonly supportedRange: { min: number; max: number };
  /** 'enable deriverV1 from @rulvar/compat' or 'upgrade rulvar'. */
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
 * the first-closing-wins fold; appends no entry (producers ship in M2).
 */
export class InvalidResolutionError extends RulvarError {
  readonly code = 'invalid_resolution' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * A breach of the total per-run append order: an unfenced concurrent writer
 * or a store violating contract A2 (https://docs.rulvar.com/guide/stores).
 */
export class JournalOrderViolation extends RulvarError {
  readonly code = 'journal_order_violation' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/** PlanRunner plan-invariant rejection (producers ship in M7). */
export class PlanInvariantError extends RulvarError {
  readonly code = 'plan_invariant' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * Raised at resume when the refolded plan state disagrees with the
 * journaled planHash chain (producers ship in M7).
 */
export class ReplayPlanHashMismatch extends RulvarError {
  readonly code = 'replay_plan_hash_mismatch' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * Invalid orchestrator cap and finalize-reserve configuration, thrown
 * before the first LLM call (DEF-7; producers ship in M6/M7).
 */
export class OrchestratorCapConfigError extends RulvarError {
  readonly code = 'orchestrator_cap_config' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * A replay-strict run encountered a call that would go live
 * (@rulvar/testing; producers ship in M2).
 */
export class JournalMissError extends RulvarError {
  readonly code = 'journal_miss' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * The run budget ceiling blocked further work. The budget guard denial is
 * a decision entry; ctx primitives throw this as AgentError kind 'budget';
 * the run reports outcome 'exhausted', overriding 'error'.
 */
export class BudgetExhaustedError extends RulvarError {
  readonly code = 'budget_exhausted' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
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
export class FailRunError extends RulvarError {
  readonly code = 'fail_run' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
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
export class AdmissionRejectedError extends RulvarError {
  readonly code = 'admission_rejected' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * A WorkerSandboxRunner resource-limit breach (M6-T02): crossing
 * timeoutMs or memoryMb terminates the worker and the
 * run completes with outcome 'error' carrying this error's WireError
 * projection; `data` records { reason: 'timeout' | 'memory', limit }.
 * The class itself is never journaled as an entry of its own.
 */
export class SandboxError extends RulvarError {
  readonly code = 'sandbox_limit' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * acquire() on a currently held lease. Retryable by contract: retry after
 * the lease ttl elapses or the holder releases.
 */
export class LeaseHeldError extends RulvarError {
  readonly code = 'lease_held' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: true, ...opts });
  }
}

/**
 * commit() on a ModelKnowledgeStore against a snapshot version that is
 * no longer current. Retryable by contract: re-read current(), rebase
 * the ops, commit again, mirroring the lease fencing discipline.
 */
export class KnowledgeCasError extends RulvarError {
  readonly code = 'knowledge_cas' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: true, ...opts });
  }
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
export class DeterminismError extends RulvarError {
  readonly code = 'determinism' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
}

/**
 * The vendored Standard Schema issue shape: validation issues carried
 * on AgentError and surfaced to the
 * model during bounded schema re-prompts.
 */
export type Issue = {
  message: string;
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
};

/**
 * The structured error value carried on AgentResult.error and journaled
 * inside the agent terminal entry. Deliberately NOT a RulvarError subclass.
 */
export type AgentError = {
  kind: 'transport' | 'rate-limit' | 'schema-mismatch' | 'tool' | 'budget' | 'terminal';
  retryable: boolean;
  retryAfterMs?: number;
  issues?: Issue[];
};

/**
 * Projects an AgentError to its WireError form: code 'agent', with kind,
 * retryAfterMs, and issues carried in data. Issue paths are flattened to
 * JSON-safe segments.
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
