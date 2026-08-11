/**
 * L0 error taxonomy (M1-T02).
 *
 * Registry contract: https://docs.rulvar.com/guide/architecture. The
 * string-code registry below is CLOSED: adding a code requires an amendment
 * to that contract. Classes whose producers ship in later milestones are
 * still defined here so the registry closes once.
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
  | 'determinism'
  | 'settlement'
  | 'superseded'
  | 'journal_sealed'
  | 'journal_integrity';

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
 * A journal append arrived after the run's settle sealed the segment
 * (RV1904): once `run_settle` is durable, the journal is the terminal
 * truth every cost and invoice fold reads, and a late append would
 * silently split it into the four mutually inconsistent views the
 * four-role benchmark recorded. The orchestrate exit barrier (RV1903)
 * and the engine's settle drain terminate every straggler BEFORE the
 * seal, so this error names a lifecycle bug, never a working path.
 */
export class JournalSealedError extends RulvarError {
  readonly code = 'journal_sealed' as const;

  constructor(message: string, opts?: { data?: Json; cause?: unknown }) {
    super(message, { retryable: false, ...opts });
  }
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
export class JournalIntegrityError extends RulvarError {
  readonly code = 'journal_integrity' as const;

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
export class SettlementError extends RulvarError {
  readonly code = 'settlement' as const;
  /** The settlement write that failed first. */
  readonly stage: 'run-settle' | 'meta';
  readonly runId: string;
  /** The outcome status the segment computed and could not record. */
  readonly runStatus: string;

  constructor(
    message: string,
    opts: { stage: 'run-settle' | 'meta'; runId: string; runStatus: string; cause?: unknown },
  ) {
    super(message, {
      retryable: true,
      data: { runId: opts.runId, runStatus: opts.runStatus, stage: opts.stage },
      cause: opts.cause,
    });
    this.stage = opts.stage;
    this.runId = opts.runId;
    this.runStatus = opts.runStatus;
  }
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
export class SupersededError extends RulvarError {
  readonly code = 'superseded' as const;
  readonly runId: string;
  /** The outcome status the stale segment computed and must not act on. */
  readonly runStatus: string;

  constructor(message: string, opts: { runId: string; runStatus: string; cause?: unknown }) {
    super(message, {
      retryable: false,
      data: { runId: opts.runId, runStatus: opts.runStatus },
      cause: opts.cause,
    });
    this.runId = opts.runId;
    this.runStatus = opts.runStatus;
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
  reason?: 'exposure-drained' | 'output-floor';
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
  if (error.reason !== undefined) {
    data.reason = error.reason;
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
