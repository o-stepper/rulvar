/**
 * Agent runtime v1 (M1-T06): the single subagent loop shared by every
 * orchestration mode. A model turn; structured output in three tiers with
 * client validation and a bounded re-prompt; typed AgentResult; beyond the
 * configured policy the runtime never throws: failures become typed
 * AgentResult statuses. Tool dispatch, checkpoints, and compaction arrive
 * with M3/M4; the escalated status arrives in M3 as the flagged breaking
 * change.
 *
 * Docs: https://docs.rulvar.com/guide/agents (agent runtime binding);
 * https://docs.rulvar.com/guide/model-routing (roles, tiers, refusal).
 */
import {
  BudgetExhaustedError,
  ConfigError,
  NonSerializableValueError,
  RulvarError,
  type AgentError,
  type Issue,
  type WireError,
} from '../l0/errors.js';
import type { Json } from '../l0/json.js';
import { realNow } from '../l0/real-clock.js';
import type {
  CacheHint,
  CachePolicy,
  ChatRequest,
  FinishInfo,
  InvocationRole,
  JsonSchema,
  ModelRef,
  Msg,
  Part,
  ToolContract,
  Usage,
} from '../l0/messages.js';
import {
  sanitizeTokenCount,
  sanitizeUsage,
  snapshotUsage,
  sumUsage,
  usageViolations,
} from '../l0/usage.js';
import type { ProviderAdapter, StreamHooks } from '../l0/spi/provider.js';
import type { QuotaDecision, QuotaReservationRequest } from '../l0/spi/quota.js';
import { DEFAULT_MAX_QUOTA_DENIALS } from '../model/quota.js';
import type { ToolContext, ToolDef } from '../l0/spi/toolsource.js';
import type { Out, SchemaSpec } from '../l0/schema.js';
import { validateSchemaSpec } from '../l0/schema.js';
import { toJournalValue } from '../journal/serializable.js';
import type { CheckpointState, PendingToolTurn } from '../journal/checkpoint.js';
import type { ProviderCallRecord, UsageSlice } from '../l0/entries.js';
import { failoverTriggerOf, nextFailover, type FailoverTrigger } from '../model/failover.js';
import { liftRetainedParts, projectHistory, providerOf } from '../model/projector.js';
import {
  DEFAULT_RETRY_POLICY,
  retryClassOf,
  retryDelayMs,
  type RetryPolicy,
} from '../model/retry.js';
import type { ResolvedInvocation } from '../model/router.js';
import { selectStructuredOutputTier, type StructuredOutputTier } from '../model/caps.js';
import {
  ESCALATE_TOOL_NAME,
  countsAgainstLimit,
  type EscalationReport,
  type EscalationRequest,
} from './escalation.js';
import { compactMessages, shouldCompact, summarizeInstruction } from './compaction.js';
import { DEFAULT_MODEL_RETRY_ATTEMPTS, ModelRetry } from './model-retry.js';
import {
  crossedNoticeThresholds,
  ExplorationGuard,
  explorationTrackingEnabled,
  finalizationWindowNoticeText,
  finalizationWindowRefusalText,
  toolBudgetExtensionNoticeText,
  toolBudgetNoticeText,
  type ExplorationSummary,
  type FinalizationWindowBudget,
} from './exploration.js';
import type { CostBasis, ToolBudgetSummary } from '../l0/events.js';
import { NoProgressDetector, type AbortClass } from './no-progress.js';
import { latestProgressReport, type ProgressReport } from '../tools/progress.js';
import {
  applyStructuredOutputTier,
  extractCandidate,
  formatRePrompt,
  type CollectedTurn,
} from './structured-output.js';
import type { EffectiveUsageLimits } from './usage-limits.js';

export type AgentStatus = 'ok' | 'error' | 'limit' | 'cancelled' | 'skipped' | 'escalated';

/** Artifact: the normative shape of AgentResult.artifacts entries. */
export interface Artifact {
  /** Stable within the result. */
  id: string;
  /** Closed in v1. */
  kind: 'file' | 'patch' | 'json' | 'text';
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
export interface MechanicalGateVerdict {
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
export type MechanicalGateProfile = (artifacts: readonly Artifact[]) => MechanicalGateVerdict;

export interface AgentResult<T> {
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
  quotaDenials?: { total: number; requests: number; tokens: number; recovered: number };
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
  evidence?: { recordedEntries: number; minEntries: number; met: boolean };
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
  evidenceEntries?: Array<{ claim: string; citation?: string }>;
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
  evidenceFloor?: { recordedEntries: number; minEntries: number };
}

/** One 429's provider-normalized limits, per (provider, model). */
export interface RateLimitObservation {
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

export type EscalatedResult<T> = AgentResult<T> & {
  status: 'escalated';
  escalation: EscalationReport;
};

export function isEscalated<T>(r: AgentResult<T>): r is EscalatedResult<T> {
  return r.status === 'escalated';
}

/** Minimal internal event sink; the typed WorkflowEvent envelope wraps it in M1-T10. */
export interface RuntimeEventSink {
  emit(body: { type: string } & Record<string, unknown>): void;
}

/** Budget hooks bound by the three-layer budget. */
export interface BudgetHooks {
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
  maxAffordableOutputTokens?: (
    servedBy: ModelRef,
    estimatedInputTokens: number,
  ) => number | undefined;
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
  maxExposureOutputTokens?: (
    servedBy: ModelRef,
    estimatedInputTokens: number,
  ) => number | undefined;
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
  admitTurnExposure?: (
    servedBy: ModelRef,
    estimatedInputTokens: number,
    plannedOutputTokens: number,
  ) => (() => void) | undefined;
  /**
   * Parks until the next in-flight exposure hold releases (RV1902):
   * 'released' on that wake, 'drained' immediately when no hold is
   * live, 'aborted' when the signal fires first. Wired beside
   * admitTurnExposure when the cap is configured; consumed only by
   * invocations that opted into the exposure wait.
   */
  awaitExposureRelease?: (signal?: AbortSignal) => Promise<'released' | 'drained' | 'aborted'>;
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
export const BUDGET_ABORT_REASON = 'rulvar:budget-ceiling';

/**
 * Successful record_evidence executions in a message window (result
 * `recorded: true`, so duplicates and verification errors never count):
 * the ONE counter behind the RV507 evidence-floor refusal and the RV809
 * deficit trigger, window-derived so live and resumed segments count
 * the same total.
 */
function countRecordedEvidence(messages: readonly Msg[]): number {
  return messages.reduce(
    (count, message) =>
      count +
      message.parts.filter(
        (part) =>
          part.type === 'tool-result' &&
          part.name === 'record_evidence' &&
          (part.result as { recorded?: unknown } | undefined)?.recorded === true,
      ).length,
    0,
  );
}

/** Collection bounds of the recorded entry content (the pair caps). */
const MAX_COLLECTED_EVIDENCE_ENTRIES = 40;
const MAX_COLLECTED_EVIDENCE_CLAIM_CHARS = 400;

/**
 * The CONTENT behind the counter above (the RV1501 entries plumbing):
 * for each successful `record_evidence` execution, the recorded claim
 * plus its file or file:lines citation, paired call-to-result by id
 * and held to the SAME result-`recorded` rule, so the content and the
 * count can never disagree about which executions exist. Bounded:
 * entries past the cap are dropped in record order, a claim past the
 * char cap is truncated, and a result whose call args carry no
 * non-empty string claim contributes nothing.
 */
function collectRecordedEvidence(
  messages: readonly Msg[],
): Array<{ claim: string; citation?: string }> {
  const argsById = new Map<string, unknown>();
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'tool-call' && part.name === 'record_evidence') {
        argsById.set(part.id, part.args);
      }
    }
  }
  const entries: Array<{ claim: string; citation?: string }> = [];
  for (const message of messages) {
    for (const part of message.parts) {
      if (
        part.type !== 'tool-result' ||
        part.name !== 'record_evidence' ||
        (part.result as { recorded?: unknown } | undefined)?.recorded !== true
      ) {
        continue;
      }
      if (entries.length >= MAX_COLLECTED_EVIDENCE_ENTRIES) {
        return entries;
      }
      const args = argsById.get(part.id) as
        { claim?: unknown; file?: unknown; lines?: unknown } | undefined;
      if (typeof args?.claim !== 'string' || args.claim === '') {
        continue;
      }
      const citation =
        typeof args.file === 'string' && args.file !== ''
          ? typeof args.lines === 'string' && args.lines !== ''
            ? `${args.file}:${args.lines}`
            : args.file
          : undefined;
      entries.push({
        claim: args.claim.slice(0, MAX_COLLECTED_EVIDENCE_CLAIM_CHARS),
        ...(citation === undefined ? {} : { citation }),
      });
    }
  }
  return entries;
}

/** One model-issued tool call as the loop dispatches it. */
export interface ToolCallRequest {
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
export interface GateAudit {
  verdict: 'allow' | 'deny' | 'ask';
  decidedBy: string;
  rule?: Json;
  advisory?: Json;
}

export type PermissionGate = (
  | { kind: 'allow'; input: unknown }
  | { kind: 'deny'; reason: string }
  | {
      kind: 'ask';
      input: unknown;
      suspend: () => Promise<{ decision: 'allow' | 'deny'; reason?: string }>;
    }
) & {
  /** Chain audit payload ridden into tool:end telemetry. */
  audit?: GateAudit;
};

/**
 * The spawn's frozen toolset plus the per-call context factory, prepared
 * by the ctx layer (M3-T01). The contracts are the canonical identity
 * projection already hashed into the spawn's content key; the loop sends
 * exactly them to the model.
 */
export interface ToolRuntime {
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
export interface PhaseTarget {
  adapter: ProviderAdapter;
  resolved: ResolvedInvocation;
}

export interface RunAgentOptions<S extends SchemaSpec = JsonSchema> {
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
    reconcile: (
      reservationId: string,
      usage: Usage,
      actual?: { requests?: number },
    ) => Promise<void>;
    /** Limiter infrastructure failure policy; a denial is unaffected. */
    onLimiterError: 'deny' | 'allow';
    /** Pre-wire continuation admission (RV1013); default post-hoc. */
    reserveContinuations?: boolean;
    /** The per-target denial retry budget (RV1601); default 8. */
    maxDenials?: number;
    /** Cancels an unused admission; absent = window age-out. */
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
  extract?: PhaseTarget & { fallbacks?: PhaseTarget[] };
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
  finalize?: PhaseTarget & { fallbacks?: PhaseTarget[] };
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
  summarize?: PhaseTarget & { fallbacks?: PhaseTarget[] };
  /** Per-profile compaction config; threshold default 0.8 (Appendix A). */
  compaction?: { threshold?: number };
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
  evidenceContract?: { minEntries: number; enforce?: 'warn' | 'refuse' };
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
      cap: number;
      /** Present exactly for the RV809 proactive grants: what fired them. */
      trigger?: 'evidence-deficit';
    }) => Promise<void>;
    onWindowEntry?: (entry: {
      remaining: number;
      reserveCalls: number;
      budget: FinalizationWindowBudget;
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
  exposureWait?: boolean | 'child';
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
   * them.
   */
  billing?: { onProviderCall: (record: ProviderCallRecord) => void };
  events?: RuntimeEventSink;
  transcript?: { mintRef(): string; put(ref: string, blob: Uint8Array): Promise<void> };
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
  escalation?: { minSpendUsd: number };
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
    }) => Promise<
      | {
          ok: true;
          /**
           * Overrides the finished value (RV808b): a sectional splice
           * resolves the accepted call to the FULL reconstructed
           * document, which is what the agent output must be. Absent =
           * the call's own `result` argument, byte identical to the
           * historical loop.
           */
          resolved?: { result: unknown };
        }
      | { ok: false; feedback: Record<string, unknown> }
    >;
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
  role?: 'loop' | 'plan' | 'orchestrate' | 'synthesize';
  label?: string;
  now?: () => number;
}

const ZERO_USAGE: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

// Bound at module load, before the dev-mode bare-call patch can install
// (the engine clock convention, see stores/reconcile.ts): the engine's
// own retry jitter must never classify as workflow nondeterminism when
// rulvar is imported from a checkout build instead of node_modules
// (v1.59.0 review P1).
const wallRandom: () => number = Math.random.bind(globalThis);

// The canonical adder (l0/usage.ts): aggregates keep the cache-write
// TTL split their money was debited under (RV1001).
function addUsage(total: Usage, turn: Usage): Usage {
  return sumUsage(total, turn);
}

/**
 * The Usage invariant is verified at the adapter boundary: inputTokens is
 * the FULL prompt including cache reads and writes.
 */
/**
 * The full canonical invariant at the adapter boundary (v1.20.0 review
 * P1-1): every count finite, integral, and nonnegative, and the cache
 * subsets inside the input. One violation message covers every adapter,
 * injected clients and mocks included; the financial invariant never
 * depends on the good faith of an external transport.
 */
function usageInvariantViolation(usage: Usage, adapterId: string): string | undefined {
  const violations = usageViolations(usage);
  if (violations.length === 0) {
    return undefined;
  }
  return `adapter '${adapterId}' violated the Usage invariant: ${violations.join('; ')}`;
}

interface TurnOutcome {
  turn: CollectedTurn;
  finish?: FinishInfo;
  usage: Usage;
  /** The portion already reported through onUsage mid-stream. */
  reported: Usage;
  /** Set when a mid-stream usage event violated the telemetry invariant. */
  usageViolation?: string;
  usageApprox: boolean;
  wireError?: WireError;
  aborted?: 'budget' | 'external' | 'idle';
  /**
   * The shared quota limiter denied this attempt BEFORE dispatch
   * (RV-215): the adapter never ran, the usage is exactly zero, and
   * recordUsage is skipped so no phase slice is minted for a call
   * that never happened.
   */
  quotaDenied?: true;
  /**
   * A synthetic outcome minted by the abort short circuit: the adapter
   * never ran, so no reconciliation record is minted for it (exactly
   * like quotaDenied, a call that never happened is not billable).
   */
  neverDispatched?: true;
  /** The finish event's metadata; carries the retention payload. */
  providerMetadata?: Record<string, unknown>;
}

async function streamTurn(
  adapter: ProviderAdapter,
  req: ChatRequest,
  options: {
    idleTimeoutMs: number;
    signals: AbortSignal[];
    budgetSignal?: AbortSignal;
    onDelta?: (delta: string) => void;
    /** Mid-stream usage reporting (feeds the layer-3 ceiling). */
    onUsage?: (delta: Usage) => void;
    /** Live-only adapter hooks (RV1013 pre-wire segment admission). */
    hooks?: StreamHooks;
  },
): Promise<TurnOutcome> {
  const idle = new AbortController();
  const all = [...options.signals, idle.signal];
  if (options.budgetSignal !== undefined) {
    all.push(options.budgetSignal);
  }
  const combined = AbortSignal.any(all);

  const turn: CollectedTurn = { text: '', toolCalls: [] };
  const pendingArgs = new Map<string, { name: string; argsText: string }>();
  let usage: Usage = ZERO_USAGE;
  let reported: Usage = ZERO_USAGE;
  let usageViolation: string | undefined;
  let sawFinish = false;
  let finish: FinishInfo | undefined;
  let providerMetadata: Record<string, unknown> | undefined;
  let wireError: WireError | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const armIdle = (): void => {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(() => idle.abort('rulvar:stream-idle'), options.idleTimeoutMs);
  };

  try {
    armIdle();
    for await (const event of adapter.stream(req, combined, options.hooks)) {
      armIdle();
      switch (event.type) {
        case 'text-delta':
          turn.text += event.text;
          options.onDelta?.(event.text);
          break;
        case 'reasoning-delta':
          options.onDelta?.(event.text);
          break;
        case 'tool-call-start':
          pendingArgs.set(event.id, { name: event.name, argsText: '' });
          break;
        case 'tool-call-delta': {
          const pending = pendingArgs.get(event.id);
          if (pending !== undefined) {
            pending.argsText += event.argsTextDelta;
          }
          break;
        }
        case 'tool-call-end': {
          const pending = pendingArgs.get(event.id);
          turn.toolCalls.push({ id: event.id, name: pending?.name ?? '', args: event.args });
          pendingArgs.delete(event.id);
          break;
        }
        case 'usage': {
          // Mid-stream deltas reach the budget directly, so this inlet
          // enforces the same telemetry invariant as the finish path
          // (v1.20.0 review P1-1): a non-finite, negative, or fractional
          // delta is repaired conservatively BEFORE it can debit or
          // credit anything, and the violation fails the call loud.
          const cleaned: Partial<Usage> = {};
          for (const field of [
            'inputTokens',
            'outputTokens',
            'cacheReadTokens',
            'cacheWriteTokens',
            'reasoningTokens',
            'cacheWrite5mTokens',
            'cacheWrite1hTokens',
          ] as const) {
            const value = event.usage[field];
            if (value === undefined) {
              continue;
            }
            if (Number.isInteger(value) && value >= 0) {
              cleaned[field] = value;
            } else {
              usageViolation ??= `mid-stream usage event carried invalid ${field} (${String(value)})`;
              cleaned[field] = sanitizeTokenCount(value);
            }
          }
          usage = { ...usage, ...cleaned };
          const delta: Usage = {
            inputTokens: cleaned.inputTokens ?? 0,
            outputTokens: cleaned.outputTokens ?? 0,
            cacheReadTokens: cleaned.cacheReadTokens ?? 0,
            cacheWriteTokens: cleaned.cacheWriteTokens ?? 0,
          };
          if (cleaned.reasoningTokens !== undefined) {
            delta.reasoningTokens = cleaned.reasoningTokens;
          }
          // The TTL split rides the delta (RV1001): the live debit must
          // price the 1h share at its own rate, or a ceiling holds
          // against a cheaper reading than settlement records.
          if (cleaned.cacheWrite5mTokens !== undefined) {
            delta.cacheWrite5mTokens = cleaned.cacheWrite5mTokens;
          }
          if (cleaned.cacheWrite1hTokens !== undefined) {
            delta.cacheWrite1hTokens = cleaned.cacheWrite1hTokens;
          }
          reported = addUsage(reported, delta);
          options.onUsage?.(delta);
          break;
        }
        case 'finish':
          sawFinish = true;
          finish = event.finish;
          usage = event.usage;
          providerMetadata = event.providerMetadata;
          break;
        case 'error':
          wireError = event.error;
          // A failed generation is still a billable provider call
          // (RV401): when the adapter already holds the response id at
          // the moment the stream dies, the reconciliation record keeps
          // it, so the failed attempt joins the provider statement like
          // any ok row.
          if (event.providerMetadata !== undefined) {
            providerMetadata = event.providerMetadata;
          }
          break;
      }
      // A finish or error event is terminal by contract: consumption
      // stops at the first one (the break closes the adapter iterator),
      // so events after the terminal can never mutate the turn, revise
      // the authoritative bill, or trigger tool execution, and a
      // provider that keeps streaming past its terminal cannot stall
      // the loop (v1.27.0 review P2).
      if (sawFinish || wireError !== undefined) {
        break;
      }
    }
  } catch (thrown) {
    if (!combined.aborted) {
      wireError =
        thrown instanceof RulvarError
          ? // A TYPED throw carries its own class verdict and keeps it
            // (the cycle 83 review): laundering a ConfigError into a
            // retryable transport fault made the engine retry a
            // deterministic misconfiguration through the whole backoff
            // ladder and then FAIL OVER onto a fallback model, serving
            // the run from a model the caller never asked for while the
            // real fault (a bridge model mismatch, an unsupported role,
            // a contradicting namespaced option) vanished behind a
            // generic transport message. Errors that ARE retryable by
            // class (a lost lease) keep retrying exactly as before.
            thrown.toWire()
          : {
              code: 'agent',
              message: thrown instanceof Error ? thrown.message : String(thrown),
              retryable: true,
              data: { kind: 'transport' },
            };
    }
  } finally {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer);
    }
  }

  if (combined.aborted && !sawFinish && wireError === undefined) {
    const aborted =
      options.budgetSignal?.aborted === true ? 'budget' : idle.signal.aborted ? 'idle' : 'external';
    const outcome: TurnOutcome = { turn, usage, reported, usageApprox: true, aborted };
    if (finish !== undefined) {
      outcome.finish = finish;
    }
    if (usageViolation !== undefined) {
      outcome.usageViolation = usageViolation;
    }
    return outcome;
  }
  // Fail closed on truncation (v1.27.0 review P1): a stream that
  // drained naturally without any terminal event is a provider fault
  // per the adapter contract (exactly one finish or error per stream);
  // accepting the partial turn as success would journal a truncated
  // response as durable truth. The requested abort above is the one
  // documented exception.
  if (!sawFinish && wireError === undefined) {
    wireError = {
      code: 'agent',
      message:
        `adapter '${adapter.id}' stream ended without a terminal finish or error event; ` +
        'the adapter contract requires exactly one per stream, so the partial turn is ' +
        'discarded as a retryable transport fault',
      retryable: true,
      data: { kind: 'transport' },
    };
  }
  const outcome: TurnOutcome = { turn, usage, reported, usageApprox: !sawFinish };
  if (finish !== undefined) {
    outcome.finish = finish;
  }
  if (usageViolation !== undefined) {
    outcome.usageViolation = usageViolation;
  }
  if (providerMetadata !== undefined) {
    outcome.providerMetadata = providerMetadata;
  }
  if (wireError !== undefined) {
    outcome.wireError = wireError;
  }
  return outcome;
}

function classifyWireError(wire: WireError): AgentError {
  const data = (wire.data ?? {}) as { [key: string]: Json };
  const kind =
    data.kind === 'rate-limit' || wire.code === 'rate-limit'
      ? 'rate-limit'
      : ((data.kind as AgentError['kind'] | undefined) ?? 'transport');
  const error: AgentError = { kind, retryable: wire.retryable };
  if (typeof data.retryAfterMs === 'number') {
    error.retryAfterMs = data.retryAfterMs;
  }
  return error;
}

function buildRequest(
  resolved: ResolvedInvocation,
  messages: Msg[],
  limits: EffectiveUsageLimits,
  tools?: ToolContract[],
): ChatRequest {
  const req: ChatRequest = { model: resolved.model, messages };
  if (resolved.wireEffort !== undefined) {
    req.effort = resolved.wireEffort;
  }
  if (resolved.providerOptions !== undefined) {
    req.providerOptions = resolved.providerOptions;
  }
  if (limits.maxOutputTokensPerTurn !== undefined) {
    req.maxOutputTokens = limits.maxOutputTokensPerTurn;
  }
  if (tools !== undefined && tools.length > 0) {
    req.tools = tools;
  }
  return req;
}

/**
 * Cheap deterministic prompt-size estimate (about four serialized
 * characters per token) for the layer-2b output bound. Never used for
 * identity, accounting, or anything the journal records.
 */
function estimateInputTokens(messages: Msg[]): number {
  let chars = 0;
  for (const msg of messages) {
    chars += JSON.stringify(msg.parts).length;
  }
  return Math.ceil(chars / 4);
}

/**
 * The terminal tool's schema-rejection feedback line. One producer, two
 * readers: the interception writes it as the error result, and the
 * window-derived schemaRejectedTerminalExchanges counter recognizes the
 * exchange by exactly these bytes, so the two can never drift.
 */
function terminalSchemaRejectionMessage(name: string): string {
  return `the '${name}' call failed validation`;
}

/**
 * The serving model's declared minimum request output cap, default one.
 * OpenAI's Responses API rejects max_output_tokens below 16, so a
 * below-floor dispatch is a guaranteed provider 400: the v1.74
 * experiment's terminal repair died exactly there (the review, P0.1).
 * Defensive lookup: a caps() throw must not fail turns that never
 * consulted caps at this point before.
 */
function outputFloorOf(target: PhaseTarget): number {
  try {
    const declared = target.adapter.caps(target.resolved.model).minOutputTokensPerTurn;
    return declared !== undefined && Number.isInteger(declared) && declared > 1 ? declared : 1;
  } catch {
    return 1;
  }
}

/**
 * Layer 2b at the wire boundary: clamps the outgoing request's
 * maxOutputTokens to what the remaining budget affords from the serving
 * model, and holds every dispatch at or above the serving model's
 * output floor. The clamp uses the heuristic prompt estimate; the
 * DENIAL does not: a turn is refused (BudgetExhaustedError, never
 * dispatched) only when the remainder cannot buy the floor at zero
 * input, which is exact. Denying on the estimate would kill turns the
 * budget still funds, including the DEF-7 forced finish paid from the
 * released finalize reserve; when the estimate says the prompt alone
 * spends the remainder, the turn dispatches AT the floor and the exact
 * layers (2 and 3) settle the difference. A configured per-turn cap
 * below the floor is a ConfigError before any wire call: the provider
 * would reject every dispatch, so failing typed beats paying for a
 * guaranteed 400. A no-op without a hook or when the hook reports no
 * bound. The clamp touches only the wire request, exactly like
 * limits.maxOutputTokensPerTurn above it; identity is computed at the
 * ctx layer and never sees it.
 */
/**
 * The prompt-cache compilation (RV2006): attaches CacheHint to a loop
 * turn's request when the resolved policy allows it and the SERVING
 * adapter declared explicit prompt caching. Breakpoints: after tools,
 * after system, and after the deepest message, the sliding boundary
 * that moves with the growing history so every turn re-reads the
 * cached prefix and writes only the extension. The parity rerun
 * priced the absence of this compilation: workers with ~550k-token
 * contexts re-paid the full input rate on every turn
 * (cacheReadTokens 0 across the whole run) because nothing ever
 * populated the hint the adapter could already compile. Adapters
 * without the 'explicit' declaration get byte-identical requests; a
 * caps() throw is treated as no declaration (the outputFloorOf
 * posture). Transport-level only: the hint never enters identity,
 * journals, or cassette keys.
 */
function applyCachePolicy(
  req: ChatRequest,
  target: PhaseTarget,
  policy: CachePolicy | undefined,
): ChatRequest {
  if (policy?.mode === 'off') {
    return req;
  }
  let caching: 'explicit' | 'implicit' | undefined;
  try {
    caching = target.adapter.caps(target.resolved.model).promptCaching;
  } catch {
    return req;
  }
  if (caching !== 'explicit') {
    return req;
  }
  const ttl = policy?.ttl ?? '5m';
  const breakpoints: CacheHint['breakpoints'] = [
    { after: 'tools', ttl },
    { after: 'system', ttl },
  ];
  if (req.messages.length > 0) {
    breakpoints.push({ after: { messageIndex: req.messages.length - 1 }, ttl });
  }
  return { ...req, cacheHint: { breakpoints } };
}

function applyOutputBudget(
  req: ChatRequest,
  target: PhaseTarget,
  budget: BudgetHooks | undefined,
): ChatRequest {
  const floor = outputFloorOf(target);
  if (req.maxOutputTokens !== undefined && req.maxOutputTokens < floor) {
    throw new ConfigError(
      `the per-turn output cap ${String(req.maxOutputTokens)} is below the ${String(floor)} ` +
        `token output floor of ${target.resolved.ref}; the provider would reject every ` +
        'dispatch, so raise limits.maxOutputTokensPerTurn to at least the floor',
    );
  }
  const hook = budget?.maxAffordableOutputTokens;
  const exposureHook = budget?.maxExposureOutputTokens;
  if (hook === undefined && exposureHook === undefined) {
    return req;
  }
  const estimatedInput = estimateInputTokens(req.messages);
  const budgetAffordable = hook?.(target.resolved.ref, estimatedInput);
  // The exposure room clamps the same plan (RV2503), and it clamps
  // whether or not a USD ceiling is configured: the two ceilings are
  // independent. The ledger answers only for a dispatch alone in
  // flight, so a concurrent wave keeps the RV711 refusal it has always
  // had. Honoured only while the room still affords the model's output
  // floor: below it the turn is a REAL exposure refusal and
  // admitTurnExposure must be the one to say so, with
  // `reason: 'in-flight-exposure'` rather than an output-floor verdict
  // the orchestrator's coordination catch reads as a fundable tail.
  // The guard is belt and braces rather than load bearing (no probe
  // can kill it): the admission below re-prices the same plan with the
  // same function, so a sub-floor room refuses either way. It keeps
  // the loop from rewriting a request it is about to lose.
  const exposureAffordable = exposureHook?.(target.resolved.ref, estimatedInput);
  const usableExposure =
    exposureAffordable !== undefined && exposureAffordable >= floor
      ? exposureAffordable
      : undefined;
  const affordable =
    budgetAffordable === undefined
      ? usableExposure
      : usableExposure === undefined
        ? budgetAffordable
        : Math.min(budgetAffordable, usableExposure);
  if (affordable === undefined) {
    return req;
  }
  // Reachable only through the budget arm: `usableExposure` is at or
  // above the floor by construction, so a sub-floor minimum is always
  // the budget's answer and the zero-input probe below still asks the
  // question it has always asked.
  if (affordable < floor) {
    const zeroInputAffordable = hook?.(target.resolved.ref, 0);
    if (zeroInputAffordable !== undefined && zeroInputAffordable < floor) {
      // The typed reason (RV2101) lets the orchestrator's coordination
      // catch tell this refusal from a hard ceiling: at the reserve
      // line the promised tail is still fundable and must run.
      throw new BudgetExhaustedError(
        floor === 1
          ? `the remaining budget cannot afford one output token from ${target.resolved.ref}; ` +
              'the turn was not dispatched'
          : `the remaining budget cannot afford the ${String(floor)} token output floor of ` +
              `${target.resolved.ref}; the turn was not dispatched`,
        { data: { reason: 'output-floor' } },
      );
    }
    return { ...req, maxOutputTokens: floor };
  }
  if (req.maxOutputTokens === undefined || affordable < req.maxOutputTokens) {
    return { ...req, maxOutputTokens: affordable };
  }
  return req;
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
export const FINALIZE_SYNTHESIS_INSTRUCTION: string =
  'Write the final answer to the original request, synthesized only from the conversation ' +
  'and tool results above. Do not start a new conversation and do not add greetings; ' +
  'respond with the final answer only.';

function outputTruncatedMessage(invocation: 'turn' | 'finalize invocation'): string {
  return (
    `the ${invocation} ended at its output token allowance (finish reason 'max-tokens') ` +
    `before producing visible output; raise limits.maxOutputTokensPerTurn, reduce the ` +
    `reasoning effort, or free budget for the turn ` +
    '(https://docs.rulvar.com/guide/agents#output-truncation)'
  );
}

/**
 * Builds the turn's canonical assistant message. Retained provider-raw
 * parts go at the HEAD: on both first-class providers the retained
 * blocks (thinking blocks, reasoning items) precede the turn's text and
 * tool calls, and head placement reproduces that order on re-projection
 * (M4-T02).
 */
function assistantMsg(turn: CollectedTurn, retained: Part[] = []): Msg {
  const parts: Part[] = [...retained];
  if (turn.text !== '') {
    parts.push({ type: 'text', text: turn.text });
  }
  for (const call of turn.toolCalls) {
    parts.push({ type: 'tool-call', id: call.id, name: call.name, args: call.args });
  }
  return { role: 'assistant', parts };
}

/**
 * The adapter parse-failure wrapper, recognized by exact shape: both
 * first-class wires deliver tool arguments their single strict
 * JSON.parse rejected as `{__unparsed: raw}` and nothing else.
 */
function unparsedMarkerOf(args: unknown): string | undefined {
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    return undefined;
  }
  const keys = Object.keys(args);
  const raw = (args as { __unparsed?: unknown }).__unparsed;
  return keys.length === 1 && keys[0] === '__unparsed' && typeof raw === 'string' ? raw : undefined;
}

/** JSON.parse to a plain object, or undefined; never throws. */
function parsePlainObject(text: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * One bounded deterministic normalization of a near-JSON arguments
 * string: strip a single markdown fence, cut at the end of the first
 * balanced top-level object (drops trailing prose), and escape raw
 * control characters inside string literals (models writing markdown
 * documents into arguments emit real newlines, which strict JSON
 * forbids). Truncated payloads stay unbalanced and still fail the
 * parse; nothing here can invent structure the model did not write.
 */
function normalizeNearJson(raw: string): string {
  let text = raw.trim();
  const fence = /^```[a-zA-Z]*[\t ]*\r?\n([\s\S]*?)\r?\n?```$/.exec(text);
  if (fence?.[1] !== undefined) {
    text = fence[1].trim();
  }
  const start = text.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = inString;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) {
        continue;
      }
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          text = text.slice(start, index + 1);
          break;
        }
      }
    }
  }
  let escapedText = '';
  let inString = false;
  let escaped = false;
  for (const char of text) {
    if (!escaped && char === '"') {
      inString = !inString;
    }
    escaped = inString && !escaped && char === '\\';
    const code = char.codePointAt(0) ?? 0;
    if (inString && code < 0x20) {
      escapedText +=
        char === '\n'
          ? '\\n'
          : char === '\r'
            ? '\\r'
            : char === '\t'
              ? '\\t'
              : `\\u${code.toString(16).padStart(4, '0')}`;
    } else {
      escapedText += char;
    }
  }
  return escapedText;
}

/**
 * The deterministic second chance (the v1.74 experiment review, P1.5):
 * a strict re-parse of the wrapped raw string, then one normalization
 * pass. The v1.74 experiment durably proved three complete coordination
 * drafts were recoverable this way and were thrown away instead. Only a
 * plain object counts; the recovered value still faces the tool schema
 * at the caller.
 */
function recoverUnparsedArgs(
  raw: string,
): { value: Record<string, unknown>; pass: 'strict' | 'normalized' } | undefined {
  const strict = parsePlainObject(raw);
  if (strict !== undefined) {
    return { value: strict, pass: 'strict' };
  }
  const normalized = parsePlainObject(normalizeNearJson(raw));
  if (normalized !== undefined) {
    return { value: normalized, pass: 'normalized' };
  }
  return undefined;
}

/**
 * The recovery adoption warn line, shared verbatim by the regular tool
 * executor and the terminal tool interception so the two sites cannot
 * drift. The recovery itself stays INLINE at both call sites (v1.75.1):
 * an async wrapper around the common validation added one microtask
 * tick to EVERY tool validation and shifted quiescence-sensitive
 * cassette flows, and promise-tick identity is part of the byte
 * contract, so only the synchronous pieces are shared.
 */
function unparsedRecoveryLog(
  toolName: string,
  rawChars: number,
  pass: 'strict' | 'normalized',
): { type: 'log'; level: 'warn'; msg: string } {
  return {
    type: 'log',
    level: 'warn',
    msg:
      `arguments for '${toolName}' arrived unparsed (${String(rawChars)} ` +
      `chars) and were recovered by a ${pass} JSON pass; the recovered object ` +
      'passed the tool schema and the call executed',
  };
}

/**
 * Executes one model-issued tool call to a tool-result part. Failures are
 * surfaced to the model as error tool results and never thrown past
 * policy: unknown names, argument-validation issues, ModelRetry (bounded
 * per tool call chain), NonSerializableValueError, and arbitrary execute
 * throws all land as { isError: true } results.
 */
async function executeToolCall(options: {
  call: { id: string; name: string; args: unknown };
  runtime: ToolRuntime;
  /** Consecutive ModelRetry conversions per tool name. */
  retryCounts: Map<string, number>;
  maxModelRetries: number;
  /** 1-based position in this agent's tool loop; feeds the exec idempotency key. */
  ordinal: number;
  events?: RuntimeEventSink;
  audit?: GateAudit;
  now: () => number;
}): Promise<Part> {
  const { call, runtime } = options;
  const def = runtime.defs.find((candidate) => candidate.name === call.name);
  const startedAt = options.now();
  const finish = (result: unknown, outcome: 'ok' | 'error', errorCode?: string): Part => {
    options.events?.emit({
      type: 'tool:end',
      toolName: call.name,
      toolCallId: call.id,
      outcome,
      durationMs: options.now() - startedAt,
      // The structured reason (RV1807): public telemetry used to say
      // only outcome 'error', leaving operators unable to tell a
      // not-settled probe from a genuine failure without the private
      // transcript.
      ...(errorCode === undefined ? {} : { errorCode }),
      ...options.audit,
    });
    const part: Part = { type: 'tool-result', id: call.id, name: call.name, result };
    if (outcome !== 'ok') {
      (part as { isError?: boolean }).isError = true;
    }
    return part;
  };

  if (def === undefined) {
    return finish({ error: `unknown tool '${call.name}'` }, 'error', 'unknown-tool');
  }
  let validation = await validateSchemaSpec(def.parameters, call.args);
  if (!validation.valid) {
    // The second chance for adapter-wrapped unparsed arguments (the
    // v1.74 experiment review, P1.5). Order matters: a schema that
    // legitimately accepts the wrapper shape already validated above
    // and is never rewritten; recovery is adopted only when the
    // recovered object itself passes the schema, so a failed recovery
    // keeps the original error result byte for byte. Deterministic
    // from the durable arguments alone: replay and resume recover
    // identically, and nothing journals. Inline, not a shared async
    // helper: the valid path must keep its exact promise ticks.
    const unparsedRaw = unparsedMarkerOf(call.args);
    const recovered = unparsedRaw === undefined ? undefined : recoverUnparsedArgs(unparsedRaw);
    if (recovered !== undefined && unparsedRaw !== undefined) {
      const revalidation = await validateSchemaSpec(def.parameters, recovered.value);
      if (revalidation.valid) {
        validation = revalidation;
        options.events?.emit(unparsedRecoveryLog(call.name, unparsedRaw.length, recovered.pass));
      }
    }
  }
  if (!validation.valid) {
    return finish(
      {
        error: `arguments for '${call.name}' failed validation`,
        issues: validation.issues.map((issue) => issue.message),
      },
      'error',
      'invalid-arguments',
    );
  }
  try {
    // Non-inprocess tools (RV-216) run out of process through the
    // registered ToolExecutorProvider; inprocess tools call their execute
    // closure directly. resolveToolset already rejected any non-inprocess
    // tag without a registered executor, so executeExternal is present
    // here for every non-inprocess def; the guard is defense in depth.
    let value: unknown;
    if (def.executor === 'inprocess') {
      value = await def.execute(validation.value, runtime.contextFor(call.name));
    } else if (runtime.executeExternal !== undefined) {
      value = await runtime.executeExternal(def, validation.value as Json, options.ordinal);
    } else {
      return finish(
        {
          error: `tool '${call.name}' declares executor '${def.executor}' but no executor is registered`,
        },
        'error',
        'executor-unregistered',
      );
    }
    // The returned value MUST be JSON-serializable; it is recorded in the
    // canonical history and checkpointed.
    const serialized = toJournalValue(value === undefined ? null : value, `tool '${call.name}'`);
    options.retryCounts.delete(call.name);
    return finish(serialized, 'ok');
  } catch (thrown) {
    if (thrown instanceof ModelRetry) {
      const used = options.retryCounts.get(call.name) ?? 0;
      options.retryCounts.set(call.name, used + 1);
      const exhausted = used >= options.maxModelRetries;
      return finish(
        {
          error: thrown.message,
          ...(thrown.data === undefined ? {} : { data: thrown.data }),
          ...(exhausted ? { retriesExhausted: true } : {}),
        },
        'error',
        'model-retry',
      );
    }
    if (thrown instanceof NonSerializableValueError) {
      return finish({ error: thrown.message }, 'error', 'non-serializable-result');
    }
    // A handler that stamped a machine reason (data.errorCode, the
    // RV1807 convention) surfaces it; a bare RulvarError falls back to
    // its coarse code class; anything else stays reasonless.
    const stamped =
      thrown instanceof RulvarError &&
      typeof thrown.data === 'object' &&
      thrown.data !== null &&
      !Array.isArray(thrown.data) &&
      typeof (thrown.data as { errorCode?: unknown }).errorCode === 'string'
        ? (thrown.data as { errorCode: string }).errorCode
        : thrown instanceof RulvarError
          ? thrown.code
          : undefined;
    return finish(
      { error: thrown instanceof Error ? thrown.message : String(thrown) },
      'error',
      stamped,
    );
  }
}

/**
 * Runs one agent to a typed AgentResult. Never throws past policy: every
 * failure mode becomes a typed status on the result.
 */
export async function runAgent<S extends SchemaSpec>(
  options: RunAgentOptions<S>,
): Promise<AgentResult<Out<S>>> {
  const now = options.now ?? realNow;
  const startedAt = now();
  const limits = options.limits;
  const maxSchemaAttempts = (options.schemaRetryAttempts ?? 2) + 1;
  const events = options.events;
  const agentType = options.agentType ?? '';

  const messages: Msg[] = [{ role: 'user', parts: [{ type: 'text', text: options.prompt }] }];
  let totalUsage: Usage = ZERO_USAGE;
  // The primary role of the tool loop itself; extract, finalize, and
  // summarize dispatches carry their own roles into the split below.
  const primaryRole: InvocationRole = options.role ?? 'loop';
  // Usage split by (invocation role, serving model). The loop, extract,
  // finalize, and summarize phases resolve independently, so one agent
  // call routinely spans models at different prices; pricing the whole
  // call at the loop's servedBy bills the cheap extract at the loop
  // model's rate, and folding it all into one role bucket erases the
  // phase split the routed phases exist to expose (v1.19.0 review
  // P1-2). The budget already debits per serving model (see
  // recordUsage); this is the same fact, kept for the cost report and
  // the journal.
  const usageByPhaseModel = new Map<
    string,
    { role: InvocationRole; servedBy: ModelRef; usage: Usage }
  >();
  const addPhaseUsage = (role: InvocationRole, ref: ModelRef, usage: Usage): void => {
    const key = `${role}\u0000${ref}`;
    const prior = usageByPhaseModel.get(key);
    usageByPhaseModel.set(key, {
      role,
      servedBy: ref,
      usage: addUsage(prior?.usage ?? ZERO_USAGE, usage),
    });
  };
  // The per-dispatch reconciliation ledger (P1.3): one record per live
  // provider call, minted at the dispatch chokepoint from the SAME
  // sanitized usage the phase slices accumulate. Restored checkpoint
  // records are pushed first, so ordinals continue across a resume.
  const providerCalls: ProviderCallRecord[] = [];
  // The per-request money twin of usageByPhaseModel (RV702): every
  // recorded provider call's usage priced INDIVIDUALLY at its own
  // model's rate, accumulated under the same (role, model) key. Phase
  // deltas and the invocation total read from here, so a nonlinear
  // long-context tier fires per request in the live telemetry exactly
  // as it does in the settled fold (RV504), never on an aggregate no
  // single request crossed.
  const usdByPhaseModel = new Map<string, { role: InvocationRole; usd: number }>();
  const addCallUsd = (role: InvocationRole, ref: ModelRef, usage: Usage): void => {
    const priced = options.priceUsd?.(ref, usage) ?? 0;
    // The same guard as priceRecordedUsage: a broken price row (NaN or
    // negative) contributes zero and surfaces through the unpriced fold.
    const usd = Number.isFinite(priced) && priced > 0 ? priced : 0;
    const key = `${role}\u0000${ref}`;
    const prior = usdByPhaseModel.get(key);
    usdByPhaseModel.set(key, { role, usd: (prior?.usd ?? 0) + usd });
  };
  // False exactly when a restored checkpoint carried usage its restored
  // records do not cover counter for counter: the per-call sum then
  // cannot speak for the invocation, and the total falls back to the
  // labeled aggregate estimate instead of silently dropping the
  // restored spend. Live slices are always covered by construction
  // (recordUsage and the record mint share one chokepoint).
  let perCallCoverage = true;

  // Phase activation telemetry (the RV-207 event-model contract): one
  // agent:phase:start/end pair per activation, its usage measured as
  // the delta the activation added to its role's (role, model) slices,
  // so the pairs sum exactly to the journaled split and the official
  // reducer needs no heuristics. The retry counter also feeds
  // agent:end's retryCount; all of it is live telemetry, never journal
  // identity.
  let invocationCounter = 0;
  let transportRetries = 0;
  let schemaRecoveredTerminalExchanges = 0;
  // Policy-facts raw material (RV709): denied reservations and the
  // denial EPISODES that ended in a later grant of the same dispatch
  // site. Live telemetry for the request-only finalize digest, never
  // journal identity, exactly like transportRetries.
  let quotaDenials = 0;
  let quotaRecoveries = 0;
  // The dimension split (RV1510): a pre-wire quota denial is not a
  // provider retry, and the exported namespaces must never conflate.
  let quotaDenialsRequests = 0;
  let quotaDenialsTokens = 0;
  const rateLimitObservations = new Map<string, RateLimitObservation>();
  type OpenPhase = {
    invocation: number;
    role: InvocationRole;
    model: ModelRef;
    before: Map<string, Usage>;
    beforeUsd: Map<string, number>;
    startedAtMs: number;
    retriesBefore: number;
  };
  const roleUsageSnapshot = (role: InvocationRole): Map<string, Usage> => {
    const snapshot = new Map<string, Usage>();
    for (const [key, slice] of usageByPhaseModel) {
      if (slice.role === role) {
        snapshot.set(key, slice.usage);
      }
    }
    return snapshot;
  };
  const roleUsdSnapshot = (role: InvocationRole): Map<string, number> => {
    const snapshot = new Map<string, number>();
    for (const [key, cell] of usdByPhaseModel) {
      if (cell.role === role) {
        snapshot.set(key, cell.usd);
      }
    }
    return snapshot;
  };
  const usageDelta = (after: Usage, before: Usage | undefined): Usage => {
    const base = before ?? ZERO_USAGE;
    const delta: Usage = {
      inputTokens: Math.max(0, after.inputTokens - base.inputTokens),
      outputTokens: Math.max(0, after.outputTokens - base.outputTokens),
      cacheReadTokens: Math.max(0, after.cacheReadTokens - base.cacheReadTokens),
      cacheWriteTokens: Math.max(0, after.cacheWriteTokens - base.cacheWriteTokens),
    };
    const reasoning = (after.reasoningTokens ?? 0) - (base.reasoningTokens ?? 0);
    if (reasoning > 0) {
      delta.reasoningTokens = reasoning;
    }
    return delta;
  };
  const beginPhase = (role: InvocationRole, model: ModelRef): OpenPhase => {
    invocationCounter += 1;
    events?.emit({
      type: 'agent:phase:start',
      agentType,
      label: options.label,
      role,
      model,
      invocation: invocationCounter,
    });
    return {
      invocation: invocationCounter,
      role,
      model,
      before: roleUsageSnapshot(role),
      beforeUsd: roleUsdSnapshot(role),
      startedAtMs: now(),
      retriesBefore: transportRetries,
    };
  };
  const endPhase = (phase: OpenPhase, outcome: 'ok' | 'error', servedModel?: ModelRef): void => {
    let phaseUsage: Usage = ZERO_USAGE;
    for (const [key, slice] of usageByPhaseModel) {
      if (slice.role !== phase.role) {
        continue;
      }
      const delta = usageDelta(slice.usage, phase.before.get(key));
      phaseUsage = addUsage(phaseUsage, delta);
    }
    // The phase's dollars are the delta of the PER-CALL accumulator
    // (RV702), never the aggregate delta priced in one call: a
    // nonlinear tier fires per request here exactly as in the settled
    // fold. Every slice a live activation adds is backed by a recorded
    // call at the same chokepoint, so a live phase delta is always
    // fully per-call, even when a pre-ledger restore left the
    // INVOCATION total uncovered (the gap predates every live phase and
    // cancels out of the before/after difference).
    let phaseUsd = 0;
    for (const [key, cell] of usdByPhaseModel) {
      if (cell.role !== phase.role) {
        continue;
      }
      phaseUsd += cell.usd - (phase.beforeUsd.get(key) ?? 0);
    }
    const retries = transportRetries - phase.retriesBefore;
    events?.emit({
      type: 'agent:phase:end',
      agentType,
      label: options.label,
      role: phase.role,
      model: servedModel ?? phase.model,
      invocation: phase.invocation,
      durationMs: Math.max(0, now() - phase.startedAtMs),
      usage: phaseUsage,
      costUsd: phaseUsd,
      costBasis: 'per-call',
      outcome,
      ...(retries > 0 ? { retries } : {}),
    });
  };
  // The binary phase verdict: an activation whose surrounding status
  // moved to error or cancelled failed; limits and escalations are
  // bounded outcomes of a phase that itself ran.
  const phaseOutcome = (): 'ok' | 'error' =>
    status === 'error' || status === 'cancelled' ? 'error' : 'ok';
  let turns = 0;
  let schemaAttempts = 0;
  let output: Out<S> | null = null;
  let status: AgentStatus = 'ok';
  // Terminal-tool short circuit (M6-T07): once finish fires, no further
  // model turns run and extract/finalize never fire.
  let finishedViaTool = false;
  let agentError: AgentError | undefined;
  let errorMessage: string | undefined;
  let usageApprox = false;
  let toolCallsUsed = 0;
  let escalationRequest: EscalationRequest | undefined;
  let abortClass: AbortClass | undefined;
  /**
   * Set at a tool-budget expiry when limits.finalizationReserve is
   * configured (P1.1); the reserve turn itself runs at ONE site after
   * the loop ends (the pending-turn path trips before the dispatch
   * machinery below is even defined), inside the still-open loop phase.
   */
  let reserveRequest: { limiter: 'maxToolCalls' | 'toolUnits'; skipped: number } | undefined;
  const noProgress = new NoProgressDetector(limits.noProgressTurns);
  // Exploration guards (RV-210): tracking exists only when a guard limit
  // asks for it, so an unconfigured invocation is byte-identical to
  // before (no summary field, no notice messages, no denial results).
  const guard = explorationTrackingEnabled(limits) ? new ExplorationGuard(limits) : undefined;
  /**
   * The adaptive tool budget (RV301, the seventh comparison experiment):
   * the run that motivated it starved two mandatory workers at a fixed
   * 84-call cap while 38% of the USD ceiling sat unspent. A grant at the
   * expiry converts that headroom into `increment` more executed calls,
   * bounded by `maxExtensions`, admitted only with money remaining and
   * (by default) new evidence since the last grant. Each grant reports
   * through the durable decision hook (RV509) and restores on resume
   * from the journaled decisions, with the conservative count
   * derivation as the floor beneath a lost tail.
   */
  const extension = limits.toolBudgetExtension;
  let extensionGrants = 0;
  let extensionEvidenceAtLastGrant = 0;
  const pendingExtensionNotices: string[] = [];
  /**
   * The ceiling the effective cap is measured from (RV602). The base cap
   * normally, so a fresh loop is byte-identical arithmetic; the journaled
   * cap of the restored grant when a resume carried one, so drifting live
   * limits cannot revoke a raise the journal already recorded. Grants
   * taken after the restore point count from here at the CURRENT
   * increment, which is the live policy doing what it should.
   */
  let capBase = limits.maxToolCalls;
  let grantsOverCapBase = 0;
  const effectiveMaxToolCalls = (): number | undefined =>
    capBase === undefined
      ? undefined
      : extension === undefined
        ? capBase
        : capBase + grantsOverCapBase * extension.increment;
  /** The limiter that ended the loop; rides the RV304 pressure snapshot. */
  let limitLimiter: 'maxToolCalls' | 'toolUnits' | undefined;
  /** True once the finalization reserve summary turn actually ran. */
  let reserveSummaryRan = false;
  /**
   * The exact limiter behind a tool-budget expiry, with its counts: the
   * wording rides the finalization-reserve instruction and the 'limit'
   * terminal's errorMessage (P1.1 criterion: the terminal names the
   * limiter, never a bare status).
   */
  const toolBudgetDetail = (limiter: 'maxToolCalls' | 'toolUnits'): string => {
    if (limiter === 'maxToolCalls') {
      return `maxToolCalls (${String(toolCallsUsed)}/${String(effectiveMaxToolCalls() ?? 0)})`;
    }
    const max = limits.toolUnits?.max ?? 0;
    const used = guard === undefined ? max : (guard.summary(toolCallsUsed).toolUnitsUsed ?? max);
    return `toolUnits (${String(used)}/${String(max)})`;
  };
  if (limits.toolBudgetNotices === true && limits.maxToolCalls === undefined) {
    events?.emit({
      type: 'log',
      level: 'warn',
      msg: 'toolBudgetNotices is enabled but maxToolCalls is not set; the notices are inert',
    });
  }
  const firedNotices = new Set<number>();
  /**
   * Pushes the soft tool-budget notice when an unfired threshold has
   * been crossed (one message per boundary, carrying the exact counts,
   * so the model can pace itself before the hard cap). The notice is an
   * ordinary user message: it rides checkpoints and transcripts, so a
   * resume never re-fires a threshold the restored count already
   * crossed.
   */
  const maybePushBudgetNotice = (): void => {
    if (limits.toolBudgetNotices !== true || limits.maxToolCalls === undefined) {
      return;
    }
    const crossed = crossedNoticeThresholds(toolCallsUsed, limits.maxToolCalls).filter(
      (threshold) => !firedNotices.has(threshold),
    );
    if (crossed.length === 0) {
      return;
    }
    for (const threshold of crossed) {
      firedNotices.add(threshold);
    }
    messages.push({
      role: 'user',
      parts: [{ type: 'text', text: toolBudgetNoticeText(toolCallsUsed, limits.maxToolCalls) }],
    });
  };
  /**
   * One extension grant (RV301), attempted exactly at a maxToolCalls
   * expiry inside the dispatch walk, and, under the RV809 opt-in, at a
   * tool-turn boundary whose remaining calls cannot cover the declared
   * evidence deficit (the `trigger`). The notice text is queued rather
   * than pushed: a user message may not interleave a tool batch, so the
   * queue flushes with the budget notices after the batch's results
   * join the history.
   */
  const tryToolBudgetGrant = (
    trigger?: 'evidence-deficit',
    deficitDetail?: { recorded: number; minEntries: number },
  ): boolean | Promise<boolean> => {
    if (extension === undefined || limits.maxToolCalls === undefined || capBase === undefined) {
      return false;
    }
    if (extensionGrants >= extension.maxExtensions) {
      return false;
    }
    if (extension.requireNewEvidence !== false) {
      const evidence = guard?.evidenceCount() ?? 0;
      if (evidence <= extensionEvidenceAtLastGrant) {
        return false;
      }
    }
    // The same chain arithmetic the per-turn output clamp reads:
    // undefined means no ceiling anywhere on the chain, which is
    // unlimited headroom by definition.
    const remaining = options.budget?.remainingUsd?.();
    if (remaining !== undefined) {
      const floor = extension.minHeadroomUsd ?? 0;
      if (floor > 0 ? remaining < floor : remaining <= 0) {
        return false;
      }
    }
    const grant = extensionGrants + 1;
    const cap = capBase + (grantsOverCapBase + 1) * extension.increment;
    const commit = (): true => {
      extensionGrants = grant;
      grantsOverCapBase += 1;
      extensionEvidenceAtLastGrant = guard?.evidenceCount() ?? 0;
      pendingExtensionNotices.push(
        toolBudgetExtensionNoticeText(grant, extension.maxExtensions, toolCallsUsed, cap) +
          // The deficit sentence exists only on the RV809 trigger, so
          // every at-expiry notice keeps its historical bytes.
          (trigger === 'evidence-deficit' && deficitDetail !== undefined
            ? ` The grant covers the declared evidence floor: ${String(deficitDetail.recorded)} ` +
              `of ${String(deficitDetail.minEntries)} evidence entries recorded; record the ` +
              'missing evidence before finishing.'
            : ''),
      );
      events?.emit({
        type: 'log',
        level: 'info',
        msg:
          `tool budget extended (grant ${String(grant)}/` +
          `${String(extension.maxExtensions)}): maxToolCalls now ${String(cap)}`,
        ...(trigger === undefined ? {} : { data: { trigger } }),
      });
      return true;
    };
    const durable = options.toolBudgetDurability?.onExtensionGrant;
    if (durable === undefined) {
      // No journal to wait for: the dispatch keeps its synchronous
      // shape, so a loop without the durability hook interleaves
      // concurrent work exactly as it did before RV601.
      return commit();
    }
    // The durable decision (RV509), landed before the grant takes effect
    // (RV601): the authorization has to be in the store before the calls
    // it authorizes run, because those calls reach the world. Nothing
    // above has been mutated yet, so a rejected append leaves the expiry
    // standing and propagates like a failed boundary write.
    return durable({
      grant,
      maxExtensions: extension.maxExtensions,
      toolCallsUsed,
      cap,
      ...(trigger === undefined ? {} : { trigger }),
    }).then(commit);
  };
  /**
   * The evidence-deficit proactive grant (RV809): at a tool-turn
   * boundary, when the invocation declares an evidence contract and the
   * remaining call budget cannot cover its outstanding deficit, the
   * extension converts headroom into calls NOW instead of at the
   * expiry, where the finalization machinery would already be squeezing
   * the missing entries into a reserved tail. Window-derived exactly
   * like the RV507 refusal (successful record_evidence executions), so
   * live and resumed segments count the same total; every admission
   * gate of the ordinary grant applies unchanged, and the at-expiry
   * site stays the backstop. Absent the opt-in (or the contract), the
   * boundary is byte identical.
   */
  const maybeCoverEvidenceDeficit = (): undefined | Promise<unknown> => {
    const minEntries = options.evidenceContract?.minEntries;
    if (extension?.coverEvidenceDeficit !== true || minEntries === undefined) {
      return undefined;
    }
    const cap = effectiveMaxToolCalls();
    if (cap === undefined || extensionGrants >= extension.maxExtensions) {
      return undefined;
    }
    const recorded = countRecordedEvidence(messages);
    const deficit = minEntries - recorded;
    if (deficit <= 0 || cap - toolCallsUsed >= deficit) {
      return undefined;
    }
    const attempt = tryToolBudgetGrant('evidence-deficit', { recorded, minEntries });
    return typeof attempt === 'boolean' ? undefined : attempt;
  };
  const flushExtensionNotices = (): void => {
    for (const text of pendingExtensionNotices.splice(0)) {
      messages.push({ role: 'user', parts: [{ type: 'text', text }] });
    }
  };
  /**
   * The finalization window (RV302): once the remaining tool budget
   * drops to reserveCalls, only the allowlisted finalization tools (and
   * the always-admitted terminal tool) execute; everything else gets a
   * typed refusal that consumes nothing. The run that motivated it
   * recorded 10 of 14 evidence entries before the cap: one summary turn
   * cannot dump a backlog, a reserved tail of bookkeeping calls can.
   * Since RV1405 the SAME regime watches the turns axis: with
   * finalizationTurns configured, remaining turns at or under
   * reserveTurns enter the window too (the seventeenth experiment's
   * worker burned maxTurns 28 at 66 of 96 calls with no finalize
   * phase, because every mechanism watched only the tool budget).
   */
  const finalizationWindow = limits.finalizationWindow;
  const finalizationTurns = limits.finalizationTurns;
  const windowConfigured = finalizationWindow !== undefined || finalizationTurns !== undefined;
  let windowEntered = false;
  let windowNoticeFired = false;
  const pendingWindowNotices: string[] = [];
  /**
   * The outstanding evidence deficit (RV1208): entries the declared
   * floor still needs, from the same successful-record_evidence window
   * the RV507 refusal and the RV809 trigger read, so every surface
   * counts one way. Zero without a contract or once the floor is met.
   */
  const evidenceDeficit = (): number => {
    const minEntries = options.evidenceContract?.minEntries;
    return minEntries === undefined ? 0 : Math.max(0, minEntries - countRecordedEvidence(messages));
  };
  /**
   * The effective reserve (RV1208). With reserveForEvidenceDeficit and
   * a declared contract, the reserved tail is at least the outstanding
   * deficit plus ONE summary call, so the window binds while the floor
   * is still closable instead of after a fixed tail the deficit
   * outgrew. It shrinks back as entries land, and never narrows below
   * the configured reserve. Absent the opt-in it IS the configured
   * reserve, byte for byte.
   */
  const effectiveReserveCalls = (): number => {
    if (finalizationWindow === undefined) {
      return 0;
    }
    if (finalizationWindow.reserveForEvidenceDeficit !== true) {
      return finalizationWindow.reserveCalls;
    }
    const deficit = evidenceDeficit();
    return deficit === 0
      ? finalizationWindow.reserveCalls
      : Math.max(finalizationWindow.reserveCalls, deficit + 1);
  };
  /** The tightest remaining budget and which dimension provides it. */
  const windowRemaining = ():
    { remaining: number; budget: FinalizationWindowBudget } | undefined => {
    let best: { remaining: number; budget: FinalizationWindowBudget } | undefined;
    const cap = effectiveMaxToolCalls();
    if (cap !== undefined) {
      best = { remaining: Math.max(0, cap - toolCallsUsed), budget: 'tool calls' };
    }
    const units = guard?.unitsRemaining();
    if (units !== undefined && (best === undefined || units < best.remaining)) {
      best = { remaining: units, budget: 'tool units' };
    }
    return best;
  };
  /**
   * The reserve of the dimension that binds: the turns reserve is its
   * own number (RV1405), never the deficit-widened calls reserve, so
   * every notice, refusal, and journal entry names the arithmetic that
   * actually applied.
   */
  const reserveFor = (budget: FinalizationWindowBudget): number =>
    budget === 'turns' ? (finalizationTurns?.reserveTurns ?? 0) : effectiveReserveCalls();
  /**
   * Whichever configured dimension is inside its reserve; with both in,
   * the smaller remaining is the binding one. The turns arithmetic is
   * deliberately blind to repair-turn grants: those exist only for
   * schema-dead terminal exchanges, which already sit inside
   * finalization, so the conservative count is the honest posture.
   */
  const windowActive = (): { remaining: number; budget: FinalizationWindowBudget } | undefined => {
    let best: { remaining: number; budget: FinalizationWindowBudget } | undefined;
    if (finalizationWindow !== undefined) {
      const state = windowRemaining();
      if (state !== undefined && state.remaining <= effectiveReserveCalls()) {
        best = state;
      }
    }
    if (finalizationTurns !== undefined) {
      const remaining = Math.max(0, limits.maxTurns - turns);
      if (
        remaining <= finalizationTurns.reserveTurns &&
        (best === undefined || remaining < best.remaining)
      ) {
        best = { remaining, budget: 'turns' };
      }
    }
    return best;
  };
  /**
   * Marks the entry and queues the one-time notice. Queued, not pushed:
   * a user message may not interleave a tool batch, so the queue
   * flushes with the other notices after the batch's results join the
   * history. On resume the flags re-derive from the restored counts and
   * the notice (already in the restored messages) never re-fires.
   */
  const maybeMarkWindowEntry = (): void | Promise<void> => {
    if (!windowConfigured || windowNoticeFired) {
      return;
    }
    const state = windowActive();
    if (state === undefined) {
      return;
    }
    const reserve = reserveFor(state.budget);
    const deficit = evidenceDeficit();
    const commit = (): void => {
      windowEntered = true;
      windowNoticeFired = true;
      pendingWindowNotices.push(
        finalizationWindowNoticeText(
          state.remaining,
          reserve,
          state.budget,
          // The deficit line belongs to the widened CALLS reserve
          // (RV1208); a turns entry never widened anything.
          state.budget !== 'turns' &&
            finalizationWindow?.reserveForEvidenceDeficit === true &&
            deficit > 0
            ? deficit
            : undefined,
        ),
      );
      events?.emit({
        type: 'log',
        level: 'info',
        msg:
          `finalization window entered: ${String(state.remaining)} of the reserved final ` +
          `${String(reserve)} ${state.budget} remain`,
      });
    };
    const durable = options.toolBudgetDurability?.onWindowEntry;
    if (durable === undefined) {
      commit();
      return;
    }
    // The durable decision (RV509): the entry is a fact about THIS
    // invocation the counts cannot always re-derive (a later grant can
    // move the remaining budget back out of the window), so the caller
    // journals it the moment it happens. Landed before the regime binds
    // (RV601): the refusals it authorizes are observable to the model,
    // and a rejected append must leave nothing marked.
    return durable({
      remaining: state.remaining,
      // The reserve that actually bound, deficit-widened or not
      // (RV1208): the journaled fact must be the one the loop applied.
      reserveCalls: reserve,
      budget: state.budget,
    }).then(commit);
  };
  const flushWindowNotices = (): void => {
    for (const text of pendingWindowNotices.splice(0)) {
      messages.push({ role: 'user', parts: [{ type: 'text', text }] });
    }
  };
  /**
   * The window allowlist. The terminal and escalate tools never reach
   * this check: the dispatch walk intercepts both before the window
   * block, so the exits are structurally exempt rather than listed.
   */
  const windowAllows = (name: string): boolean => {
    const allow = finalizationWindow?.allow ?? finalizationTurns?.allow;
    if (allow !== undefined) {
      return allow.includes(name);
    }
    return limits.toolUnits?.costs?.[name] === 0;
  };
  const modelRetryCounts = new Map<string, number>();
  // Compaction state (M4-T03): the estimate is the last loop turn's
  // inputTokens + outputTokens; points record the turns at which
  // compaction fired and ride every checkpoint.
  let lastTurnUsage = { inputTokens: 0, outputTokens: 0 };
  let compactionDisabled = false;
  const compactionPoints: number[] = [];

  let servedBy: ModelRef = options.resolved.ref;

  // Kill-and-resume re-enters at the last turn boundary: paid turns are
  // restored, not re-called. The restored usage
  // was never journaled (only terminals carry usage), so it is reported
  // to the budget now.
  const restored = await options.checkpoint?.load();
  if (restored !== undefined) {
    messages.length = 0;
    messages.push(...restored.messages);
    turns = restored.turns;
    // The restored counts are a persisted inlet exactly like the resume
    // seed (v1.20.0 review P1-1): a checkpoint written before the
    // telemetry invariant shipped (or by a hostile loader) can carry
    // invalid numbers that would otherwise flow raw into the terminal
    // entry and every cost fold. Sanitize on the way in, mirroring the
    // seed guard in RunBudget.
    totalUsage =
      usageViolations(restored.usage).length === 0 ? restored.usage : sanitizeUsage(restored.usage);
    toolCallsUsed = restored.toolCallsUsed;
    schemaAttempts = restored.schemaAttempts;
    // Points restore verbatim: the history is already compact, so a
    // resumed run never re-summarizes it (M4-T03).
    compactionPoints.push(...restored.compaction);
    // A checkpoint written before the split shipped carries only the
    // aggregate: attribute it to the loop model, exactly as before. A
    // slice written before ROLES shipped falls back to the primary
    // role, the same documented fallback the journal fold applies.
    const restoredSlices = restored.usageByModel ?? [{ servedBy, usage: totalUsage }];
    const restoredSliceSums = new Map<string, Usage>();
    for (const slice of restoredSlices) {
      const sliceUsage =
        usageViolations(slice.usage).length === 0 ? slice.usage : sanitizeUsage(slice.usage);
      addPhaseUsage(slice.role ?? primaryRole, slice.servedBy, sliceUsage);
      options.budget?.onUsage(sliceUsage, slice.servedBy);
      const key = `${slice.role ?? primaryRole} ${slice.servedBy}`;
      restoredSliceSums.set(key, addUsage(restoredSliceSums.get(key) ?? ZERO_USAGE, sliceUsage));
    }
    // The reconciliation ledger restores like the slices (a persisted
    // inlet: sanitize each record's usage on the way in), so ordinals
    // continue across the resume and the terminal entry still
    // enumerates the pre-kill wire calls. A checkpoint written before
    // the ledger shipped restores none; the invoice fold then surfaces
    // the restored spend as an unattributed remainder instead of
    // losing it.
    const restoredRecordSums = new Map<string, Usage>();
    for (const record of restored.providerCalls ?? []) {
      const sane =
        usageViolations(record.usage).length === 0
          ? record
          : { ...record, usage: sanitizeUsage(record.usage) };
      providerCalls.push(sane);
      // The restored money twin (RV702): each restored call priced
      // individually, so a covered resume keeps the per-call basis.
      addCallUsd(sane.role ?? primaryRole, sane.servedBy, sane.usage);
      const key = `${sane.role ?? primaryRole} ${sane.servedBy}`;
      restoredRecordSums.set(key, addUsage(restoredRecordSums.get(key) ?? ZERO_USAGE, sane.usage));
    }
    // Coverage, counter for counter per (role, model) key (RV702): a
    // checkpoint whose records do not reproduce its slices exactly (a
    // pre-ledger checkpoint restores none at all) leaves usage the
    // per-call sum cannot speak for, so the invocation total falls back
    // to the labeled aggregate estimate.
    const usageEquals = (a: Usage, b: Usage): boolean =>
      a.inputTokens === b.inputTokens &&
      a.outputTokens === b.outputTokens &&
      a.cacheReadTokens === b.cacheReadTokens &&
      a.cacheWriteTokens === b.cacheWriteTokens &&
      (a.reasoningTokens ?? 0) === (b.reasoningTokens ?? 0);
    for (const [key, sliceSum] of restoredSliceSums) {
      if (!usageEquals(sliceSum, restoredRecordSums.get(key) ?? ZERO_USAGE)) {
        perCallCoverage = false;
      }
    }
    for (const key of restoredRecordSums.keys()) {
      if (!restoredSliceSums.has(key)) {
        perCallCoverage = false;
      }
    }
    // The exploration guard rebuilds from the restored history (the same
    // window the model sees), and thresholds the restored count already
    // crossed never re-fire (their notices are in the restored messages).
    guard?.restore(messages);
    if (limits.toolBudgetNotices === true && limits.maxToolCalls !== undefined) {
      for (const threshold of crossedNoticeThresholds(toolCallsUsed, limits.maxToolCalls)) {
        firedNotices.add(threshold);
      }
    }
    // Grants re-derive from the restored count (RV301): executed calls
    // beyond the base cap can only have been admitted by grants, so
    // ceil over the increment reproduces at least the grants that
    // funded them. Since RV509 the journaled grant decisions are the
    // authoritative record and this derivation is the floor beneath
    // them: a grant whose decision entry was lost with the crashed
    // segment's tail is still reproduced from the calls it funded,
    // while a granted-but-unspent extension (invisible to the count)
    // restores from the journal below.
    if (
      extension !== undefined &&
      limits.maxToolCalls !== undefined &&
      toolCallsUsed > limits.maxToolCalls
    ) {
      extensionGrants = Math.min(
        extension.maxExtensions,
        Math.ceil((toolCallsUsed - limits.maxToolCalls) / extension.increment),
      );
      extensionEvidenceAtLastGrant = guard?.evidenceCount() ?? 0;
    }
    // The cap the count derivation alone can prove, kept as the floor
    // beneath the journaled one (RV602).
    const derivedCap =
      limits.maxToolCalls === undefined || extension === undefined
        ? undefined
        : limits.maxToolCalls + extensionGrants * extension.increment;
    const durableRestored = options.toolBudgetDurability?.restored;
    if (extension !== undefined && durableRestored !== undefined) {
      // The journaled grants are honored as granted (RV509): the model
      // was already promised the raised cap in the restored notice, so
      // the resume neither re-admits nor re-announces. A further LIVE
      // grant still requires evidence beyond the restore point.
      const journaled = Math.min(extension.maxExtensions, durableRestored.extensionsGranted);
      if (journaled > extensionGrants) {
        extensionGrants = journaled;
        extensionEvidenceAtLastGrant = guard?.evidenceCount() ?? 0;
      }
    }
    // The journaled cap anchors the resumed ceiling (RV602), so the two
    // recovery paths agree and a raise the model was promised survives
    // a live limits change. Validated like every persistent inlet: a
    // non-integer or one under the base cap is a corrupt reading, not a
    // promise, and the derivation stays the floor either way.
    grantsOverCapBase = extensionGrants;
    const journaledCap = durableRestored?.cap;
    if (
      journaledCap !== undefined &&
      limits.maxToolCalls !== undefined &&
      derivedCap !== undefined
    ) {
      if (Number.isSafeInteger(journaledCap) && journaledCap >= limits.maxToolCalls) {
        capBase = Math.max(journaledCap, derivedCap);
        grantsOverCapBase = 0;
      } else {
        events?.emit({
          type: 'log',
          level: 'warn',
          msg:
            `restored tool budget cap ${String(journaledCap)} is not an integer at or above the ` +
            `base cap ${String(limits.maxToolCalls)}; ignoring it and deriving from the counts`,
        });
      }
    }
    // A segment restored inside the window re-arms silently (RV302):
    // the entry notice is in the restored messages, so only the flags
    // re-derive; refusals resume from the very next call. The journaled
    // entry decision (RV509) additionally keeps the summary truthful
    // when a grant moved the restored counts back OUT of the window:
    // the window was entered this invocation, and the flags say so.
    if (
      windowActive() !== undefined ||
      (windowConfigured && durableRestored?.finalizationWindowEntered === true)
    ) {
      windowEntered = true;
      windowNoticeFired = true;
    }
  }

  const usageSlices = (): UsageSlice[] =>
    [...usageByPhaseModel.values()].map(({ role, servedBy: sliceServedBy, usage }) => ({
      servedBy: sliceServedBy,
      usage,
      role,
    }));

  /**
   * Every slice priced at ITS OWN model's rate. An unpriced model
   * contributes zero here and surfaces through CostReport.unpriced, never
   * as a silent zero.
   */
  const priceRecordedUsage = (): number => {
    const price = options.priceUsd;
    if (price === undefined) {
      return 0;
    }
    let usd = 0;
    for (const slice of usageByPhaseModel.values()) {
      const sliceUsd = price(slice.servedBy, slice.usage) ?? 0;
      // A broken price row (NaN or negative) contributes zero here and
      // surfaces through the unpriced fold, never a poisoned costUsd.
      if (Number.isFinite(sliceUsd) && sliceUsd > 0) {
        usd += sliceUsd;
      }
    }
    return usd;
  };

  /**
   * The invocation's recorded spend (RV702): the per-call accumulator
   * when every slice is covered by records, the settled fold's own
   * basis; the labeled aggregate estimate when a restored checkpoint
   * left usage no record backs, so restored spend is never silently
   * dropped and an estimate never poses as the per-request fold.
   */
  const recordedSpend = (): { usd: number; basis: CostBasis } => {
    if (!perCallCoverage) {
      return { usd: priceRecordedUsage(), basis: 'aggregate-estimate' };
    }
    let usd = 0;
    for (const cell of usdByPhaseModel.values()) {
      usd += cell.usd;
    }
    return { usd, basis: 'per-call' };
  };

  const saveBoundary = async (pending?: PendingToolTurn): Promise<void> => {
    if (options.checkpoint === undefined) {
      return;
    }
    await options.checkpoint.save({
      v: 1,
      messages: [...messages],
      turns,
      usage: totalUsage,
      usageByModel: usageSlices(),
      toolCallsUsed,
      schemaAttempts,
      compaction: [...compactionPoints],
      // The reconciliation ledger rides every boundary (P1.3) so a
      // kill-and-resume keeps the pre-kill wire calls attributable;
      // absent when no call has been made, keeping such checkpoints
      // byte-identical to before.
      ...(providerCalls.length === 0 ? {} : { providerCalls: [...providerCalls] }),
      ...(pending === undefined ? {} : { pending }),
    });
  };

  const toPendingRecords = (parts: Part[]): PendingToolTurn['executed'] =>
    parts
      .filter((part) => part.type === 'tool-result')
      .map((part) => ({
        id: part.id,
        name: part.name,
        result: part.result,
        ...((part as { isError?: boolean }).isError === true ? { isError: true } : {}),
      }));

  /**
   * Gates and executes one turn's tool calls in source order. priorParts
   * carries results already executed before a mid-turn suspension; the
   * pending state checkpointed at an ask verdict stores RAW model args so
   * a resume re-runs the chain (hooks apply once) and re-matches
   * the same approval identity.
   */
  const runToolCalls = async (
    calls: ToolCallRequest[],
    priorParts: Part[],
  ): Promise<{
    parts: Part[];
    limitHit: boolean;
    escalated?: EscalationRequest;
    finished?: unknown;
    /** The no-new-evidence exploration guard ended the turn (RV-210). */
    guardTrip?: boolean;
    /** The tool-budget limiter that expired mid-batch (P1.1). */
    limiter?: 'maxToolCalls' | 'toolUnits';
    /** How many of the batch's calls were not admitted (P1.1). */
    skipped?: number;
  }> => {
    const runtime = options.tools;
    if (runtime === undefined) {
      return { parts: priorParts, limitHit: false };
    }
    const parts: Part[] = [...priorParts];
    const errorPart = (call: ToolCallRequest, payload: string | Record<string, unknown>): Part => {
      const result = typeof payload === 'string' ? { error: payload } : payload;
      const part: Part = { type: 'tool-result', id: call.id, name: call.name, result };
      (part as { isError?: boolean }).isError = true;
      return part;
    };
    /**
     * Closes the batch tail at a tool-budget expiry (P1.1): with the
     * finalization reserve configured every not-admitted call gets a
     * typed skipped-call error result naming the limiter, so the model
     * (and the transcript) sees exactly which calls never executed and
     * the summary turn's history stays well formed (providers reject
     * tool calls without matching results). Without the reserve the
     * tail stays unanswered, byte-identical to before.
     */
    const closeSkippedTail = (
      skippedCalls: ToolCallRequest[],
      limiter: 'maxToolCalls' | 'toolUnits',
    ): void => {
      if (limits.finalizationReserve === undefined) {
        return;
      }
      for (const call of skippedCalls) {
        parts.push(
          errorPart(call, {
            error: 'skipped: the tool budget is exhausted; the call was not executed',
            limiter,
            skipped: true,
          }),
        );
      }
    };
    let terminalAdmitted = false;
    // The mid-batch boundary cadence (RV408): executed calls since the
    // last durable boundary of THIS batch. Denied, skipped, and refused
    // calls never advance it; nothing external re-runs for them.
    let executedSinceBoundary = 0;
    for (const [index, call] of calls.entries()) {
      const expiryOf = (): 'maxToolCalls' | 'toolUnits' | undefined => {
        const cap = effectiveMaxToolCalls();
        return cap !== undefined && toolCallsUsed >= cap
          ? 'maxToolCalls'
          : guard !== undefined && guard.unitsExhausted()
            ? 'toolUnits'
            : undefined;
      };
      let expiredLimiter = expiryOf();
      if (expiredLimiter === 'maxToolCalls' && call.name !== options.terminalTool?.name) {
        // Awaited exactly when a grant decision is in flight (RV601);
        // a plain boolean means nothing had to be journaled, and the
        // walk stays synchronous to the microtask.
        const attempt = tryToolBudgetGrant();
        if (typeof attempt === 'boolean' ? attempt : await attempt) {
          // The grant lifted the call cap (RV301); only an independently
          // exhausted unit budget can still close this call. A terminal
          // call never spends a grant: it already rides the budget
          // exemption below.
          expiredLimiter = expiryOf();
        }
      }
      if (expiredLimiter !== undefined) {
        // Expiry of a tool budget is terminal 'limit': paid partial
        // work; already-executed results stand. The one exemption is the
        // terminal tool (the fifth experiment, cycle 75): it never
        // consumes the budget below the cap, so an exhausted budget must
        // not starve it either, or the validators and the repair reserve
        // built around its rejection become unreachable exactly when the
        // model is ready to finish. A tail carrying a terminal call is
        // walked call by call instead of being closed wholesale.
        const tail = calls.slice(index);
        const terminalName = options.terminalTool?.name;
        const admitsTerminal =
          terminalName !== undefined &&
          (terminalAdmitted || tail.some((candidate) => candidate.name === terminalName));
        if (!admitsTerminal) {
          closeSkippedTail(tail, expiredLimiter);
          return {
            parts,
            limitHit: true,
            limiter: expiredLimiter,
            skipped: calls.length - index,
          };
        }
        if (call.name !== terminalName) {
          // A non-terminal call beside an admitted terminal one is
          // always answered with the typed skipped result, reserve or
          // not: the loop continues past this batch, and providers
          // reject tool calls without matching results.
          parts.push(
            errorPart(call, {
              error: 'skipped: the tool budget is exhausted; the call was not executed',
              limiter: expiredLimiter,
              skipped: true,
            }),
          );
          continue;
        }
        terminalAdmitted = true;
        events?.emit({
          type: 'log',
          level: 'warn',
          msg:
            `terminal tool '${call.name}' admitted at the exhausted tool budget ` +
            `(${expiredLimiter}): terminal calls do not consume the budget`,
        });
      }
      const def = runtime.defs.find((candidate) => candidate.name === call.name);
      events?.emit({
        type: 'tool:start',
        toolName: call.name,
        toolCallId: call.id,
        ...(def?.risk === undefined ? {} : { risk: def.risk }),
      });
      const gateStartedAt = now();
      let gatedCall = call;
      let gateAudit: GateAudit | undefined;
      if (runtime.permission !== undefined && def !== undefined) {
        const gate = await runtime.permission(call);
        gateAudit = gate.audit;
        if (gate.kind === 'deny') {
          // The denial is surfaced to the model as an error tool result
          // carrying the policy reason; the turn continues.
          events?.emit({
            type: 'tool:end',
            toolName: call.name,
            toolCallId: call.id,
            outcome: 'denied',
            durationMs: now() - gateStartedAt,
            ...gate.audit,
          });
          parts.push(errorPart(call, `tool '${call.name}' denied by policy: ${gate.reason}`));
          continue;
        }
        if (gate.kind === 'ask') {
          // The ask verdict is journaled as a suspended approval entry
          // together with the turn checkpoint: durable pending state
          // first, then the suspension.
          await saveBoundary({
            executed: toPendingRecords(parts),
            awaiting: { id: call.id, name: call.name, args: call.args },
            remaining: calls.slice(index + 1),
          });
          const decision = await gate.suspend();
          if (decision.decision === 'deny') {
            events?.emit({
              type: 'tool:end',
              toolName: call.name,
              toolCallId: call.id,
              outcome: 'denied',
              durationMs: now() - gateStartedAt,
              ...gate.audit,
            });
            parts.push(
              errorPart(
                call,
                decision.reason === undefined
                  ? `tool '${call.name}' denied by the approval decision`
                  : `tool '${call.name}' denied: ${decision.reason}`,
              ),
            );
            continue;
          }
          gatedCall = { ...call, args: gate.input };
        } else {
          gatedCall = { ...call, args: gate.input };
        }
      }
      // The escalate tool is engine-intercepted AFTER the permission
      // chain: validation against its request
      // schema, the in-run minSpend gate, then loop termination with
      // status 'escalated'. Remaining calls of the turn are moot.
      if (options.escalation !== undefined && gatedCall.name === ESCALATE_TOOL_NAME) {
        const def = runtime.defs.find((candidate) => candidate.name === ESCALATE_TOOL_NAME);
        const validation =
          def === undefined ? undefined : await validateSchemaSpec(def.parameters, gatedCall.args);
        if (validation === undefined || !validation.valid) {
          events?.emit({
            type: 'tool:end',
            toolName: gatedCall.name,
            toolCallId: call.id,
            outcome: 'error',
            durationMs: now() - gateStartedAt,
          });
          parts.push(
            errorPart(call, {
              error: 'escalation request failed validation',
              issues: validation === undefined ? [] : validation.issues.map((i) => i.message),
            }),
          );
          continue;
        }
        const request = validation.value as EscalationRequest;
        const spentSoFar = recordedSpend().usd;
        if (countsAgainstLimit(request.kind) && spentSoFar < options.escalation.minSpendUsd) {
          // Early scope_bigger escalation below minSpend: a bounded
          // "keep working" re-prompt; exempt kinds pass through
          // (M3-T09).
          events?.emit({
            type: 'tool:end',
            toolName: gatedCall.name,
            toolCallId: call.id,
            outcome: 'error',
            durationMs: now() - gateStartedAt,
          });
          parts.push(
            errorPart(call, {
              error:
                'keep working: the minimum spend before a scope_bigger escalation has not ' +
                'been reached yet',
              minSpendUsd: options.escalation.minSpendUsd,
              spentUsd: spentSoFar,
            }),
          );
          continue;
        }
        events?.emit({
          type: 'tool:end',
          toolName: gatedCall.name,
          toolCallId: call.id,
          outcome: 'ok',
          durationMs: now() - gateStartedAt,
        });
        return { parts, limitHit: false, escalated: request };
      }
      // The terminal tool (M6-T07): an accepted, schema-valid call ends
      // the loop with status ok and its `result` argument as the agent
      // output (the orchestrator finish tool). Invalid
      // arguments surface as an error tool result and the turn continues.
      if (options.terminalTool !== undefined && gatedCall.name === options.terminalTool.name) {
        const terminalDef = runtime.defs.find((candidate) => candidate.name === gatedCall.name);
        let validation =
          terminalDef === undefined
            ? undefined
            : await validateSchemaSpec(terminalDef.parameters, gatedCall.args);
        if (terminalDef !== undefined && validation !== undefined && !validation.valid) {
          // The terminal twin of the executor's unparsed second chance
          // (v1.75.1): the terminal tool validates at this site, and the
          // v1.74 experiment's actual casualty was the coordination
          // finish. Inline for the same reason as the executor's block:
          // the valid path must keep its exact promise ticks.
          const unparsedRaw = unparsedMarkerOf(gatedCall.args);
          const recovered =
            unparsedRaw === undefined ? undefined : recoverUnparsedArgs(unparsedRaw);
          if (recovered !== undefined && unparsedRaw !== undefined) {
            const revalidation = await validateSchemaSpec(terminalDef.parameters, recovered.value);
            if (revalidation.valid) {
              validation = revalidation;
              schemaRecoveredTerminalExchanges += 1;
              events?.emit(unparsedRecoveryLog(gatedCall.name, unparsedRaw.length, recovered.pass));
            }
          }
        }
        if (validation === undefined || !validation.valid) {
          events?.emit({
            type: 'tool:end',
            toolName: gatedCall.name,
            toolCallId: call.id,
            outcome: 'error',
            durationMs: now() - gateStartedAt,
          });
          parts.push(
            errorPart(call, {
              error: terminalSchemaRejectionMessage(gatedCall.name),
              issues: validation === undefined ? [] : validation.issues.map((i) => i.message),
            }),
          );
          continue;
        }
        const finishArgs = validation.value as { result?: unknown };
        // The host judgment over a schema valid call (RV-204): a
        // rejection is the call's error tool result and the turn
        // continues, so the model repairs and calls the tool again; the
        // hook owns the repair bound and the journaled verdicts.
        const hostVerdict =
          options.terminalTool.validate === undefined
            ? undefined
            : await options.terminalTool.validate({
                id: call.id,
                result: finishArgs.result ?? null,
                args: validation.value,
              });
        if (hostVerdict !== undefined && !hostVerdict.ok) {
          events?.emit({
            type: 'tool:end',
            toolName: gatedCall.name,
            toolCallId: call.id,
            outcome: 'error',
            durationMs: now() - gateStartedAt,
          });
          parts.push(errorPart(call, hostVerdict.feedback));
          continue;
        }
        events?.emit({
          type: 'tool:end',
          toolName: gatedCall.name,
          toolCallId: call.id,
          outcome: 'ok',
          durationMs: now() - gateStartedAt,
        });
        parts.push({
          type: 'tool-result',
          id: call.id,
          name: call.name,
          result: { finished: true },
        });
        return {
          parts,
          limitHit: false,
          // The hook's resolved value wins (RV808b): an accepted
          // sectional splice finishes with the reconstructed full
          // document; absent stays the call's own result argument.
          finished:
            hostVerdict?.resolved !== undefined
              ? hostVerdict.resolved.result
              : (finishArgs.result ?? null),
        };
      }
      // The finalization window (RV302), checked after the terminal and
      // escalate interceptions so control-flow tools are structurally
      // exempt: a non-allowlisted call inside the window is refused
      // typed and consumes nothing. With the extension configured,
      // remaining money converts into a grant FIRST: extending is the
      // right answer to budget pressure while headroom lasts, and the
      // window binds only when the grant would not clear it or is
      // denied.
      if (windowConfigured) {
        const entry = maybeMarkWindowEntry();
        if (entry !== undefined) {
          await entry;
        }
        let windowState = windowActive();
        if (windowState !== undefined && !windowAllows(gatedCall.name)) {
          if (
            windowState.budget === 'tool calls' &&
            finalizationWindow !== undefined &&
            extension !== undefined &&
            windowState.remaining + extension.increment > finalizationWindow.reserveCalls
          ) {
            const attempt = tryToolBudgetGrant();
            if (typeof attempt === 'boolean' ? attempt : await attempt) {
              windowState = windowActive();
            }
          }
          if (windowState !== undefined && !windowAllows(gatedCall.name)) {
            events?.emit({
              type: 'tool:end',
              toolName: gatedCall.name,
              toolCallId: call.id,
              outcome: 'denied',
              durationMs: now() - gateStartedAt,
              guard: 'finalization-window',
            });
            parts.push(
              errorPart(call, {
                error: finalizationWindowRefusalText(
                  gatedCall.name,
                  // The reserve that bound this refusal (RV1208), in
                  // the binding dimension's own number (RV1405).
                  reserveFor(windowState.budget),
                  windowState.budget,
                ),
                guard: 'finalization-window',
              }),
            );
            continue;
          }
        }
      }
      // The pre-dispatch exploration guards (RV-210): the call that
      // would exceed its tool's maxCallsPerTool cap, or the per-signature
      // execution cap, is never dispatched; the model receives a typed
      // error result naming the guard and the count, and the denial does
      // not consume the tool budget or the weighted units.
      if (guard !== undefined) {
        const guardVerdict = guard.beforeExecute(gatedCall.name, gatedCall.args);
        if (guardVerdict.deny) {
          events?.emit({
            type: 'tool:end',
            toolName: gatedCall.name,
            toolCallId: call.id,
            outcome: 'denied',
            durationMs: now() - gateStartedAt,
            guard: guardVerdict.guard,
          });
          parts.push(errorPart(call, { error: guardVerdict.reason, guard: guardVerdict.guard }));
          continue;
        }
      }
      toolCallsUsed += 1;
      const executedPart = await executeToolCall({
        call: gatedCall,
        runtime,
        retryCounts: modelRetryCounts,
        maxModelRetries: options.modelRetryAttempts ?? DEFAULT_MODEL_RETRY_ATTEMPTS,
        // The just-incremented count is this call's 1-based ordinal in the
        // agent's tool loop; it is checkpoint-stable, so an at-least-once
        // resume re-dispatches with the same ordinal and idempotency key.
        ordinal: toolCallsUsed,
        ...(events === undefined ? {} : { events }),
        ...(gateAudit === undefined ? {} : { audit: gateAudit }),
        now,
      });
      parts.push(executedPart);
      if (guard !== undefined) {
        const executedRecord = executedPart as { result?: unknown; isError?: boolean };
        const tripped = guard.afterExecute(
          gatedCall.name,
          gatedCall.args,
          executedRecord.result,
          executedRecord.isError === true,
        );
        if (tripped) {
          // No-new-evidence abort: paid partial work, the executed
          // results stand, and the loop terminates as the dedicated
          // 'exploration' abort class.
          return { parts, limitHit: true, guardTrip: true };
        }
      }
      // The mid-batch boundary (RV408, the eighth-experiment review):
      // with checkpointEveryToolCalls configured, the pending state
      // lands durably every K executed calls, so a kill inside a large
      // parallel batch re-pays at most the calls since the last
      // boundary instead of the whole batch. The SAME pending
      // vocabulary the ask suspension writes: the restore path reuses
      // the executed prefix verbatim and re-runs only the tail. The
      // batch's last call writes none; the turn boundary follows
      // immediately.
      executedSinceBoundary += 1;
      const boundaryCadence = limits.checkpointEveryToolCalls;
      const next = calls[index + 1];
      if (
        boundaryCadence !== undefined &&
        executedSinceBoundary >= boundaryCadence &&
        next !== undefined
      ) {
        executedSinceBoundary = 0;
        await saveBoundary({
          executed: toPendingRecords(parts),
          awaiting: { id: next.id, name: next.name, args: next.args },
          remaining: calls.slice(index + 2),
        });
      }
    }
    // A batch whose LAST execution crossed into the window still
    // announces the entry before the next model turn (RV302).
    const lastEntry = maybeMarkWindowEntry();
    if (lastEntry !== undefined) {
      await lastEntry;
    }
    return { parts, limitHit: false };
  };

  // A restored mid-turn suspension finishes ITS turn before the loop
  // re-enters: executed results are reused verbatim, the awaiting call
  // consults the journaled approval, remaining calls follow (resume
  // continues the same turn without re-running tools).
  if (restored?.pending !== undefined && options.tools !== undefined) {
    const priorParts: Part[] = restored.pending.executed.map((record) => {
      const part: Part = {
        type: 'tool-result',
        id: record.id,
        name: record.name,
        result: record.result,
      };
      if (record.isError === true) {
        (part as { isError?: boolean }).isError = true;
      }
      return part;
    });
    const { parts, limitHit, escalated, finished, guardTrip, limiter, skipped } =
      await runToolCalls([restored.pending.awaiting, ...restored.pending.remaining], priorParts);
    if (parts.length > 0) {
      messages.push({ role: 'tool', parts });
    }
    if (escalated !== undefined) {
      status = 'escalated';
      escalationRequest = escalated;
    } else if (finished !== undefined) {
      output = finished as Out<S>;
      finishedViaTool = true;
      await saveBoundary();
    } else if (limitHit) {
      status = 'limit';
      if (limiter !== undefined) {
        limitLimiter = limiter;
      }
      if (guardTrip === true && guard !== undefined) {
        abortClass = 'exploration';
        agentError = { kind: 'terminal', retryable: false };
        errorMessage = guard.describeTrip();
      } else if (limiter !== undefined && limits.finalizationReserve !== undefined) {
        // The guaranteed finalization turn (P1.1): the terminal names
        // the exact limiter, and the reserve turn runs at the single
        // post-loop site below (the dispatch machinery is not defined
        // yet on this path).
        agentError = { kind: 'terminal', retryable: false };
        errorMessage =
          `tool budget exhausted: ${toolBudgetDetail(limiter)}; ` +
          `skipped tool calls: ${String(skipped ?? 0)}`;
        reserveRequest = { limiter, skipped: skipped ?? 0 };
      }
    } else {
      // The RV809 proactive grant rides the same boundary as the
      // notices, so its announcement flushes with them.
      const deficitGrant = maybeCoverEvidenceDeficit();
      if (deficitGrant !== undefined) {
        await deficitGrant;
      }
      flushExtensionNotices();
      flushWindowNotices();
      maybePushBudgetNotice();
      await saveBoundary();
    }
  }
  const separateExtract = options.extract !== undefined && options.schema !== undefined;

  // Exactly ONE agent:start per span (the logical dispatch, primary
  // role); every phase activation below emits its own paired
  // agent:phase events instead of an extra unpaired start.
  events?.emit({
    type: 'agent:start',
    agentType,
    label: options.label,
    model: servedBy,
    role: primaryRole,
  });
  const loopPhase = beginPhase(primaryRole, servedBy);

  // The runtime never throws past policy: an adapter violating the Usage
  // invariant becomes a typed transport-class terminal, not an escape.
  // Accounting still happens for the violating turn, but only through
  // sanitizeUsage, so the journal, the phase slices, and the budget never
  // carry a non-finite, negative, or fractional count (v1.20.0 review
  // P1-1).
  let invariantViolation: string | undefined;
  const recordUsage = (
    usage: Usage,
    reported: Usage,
    adapterId: string,
    ref: ModelRef,
    role: InvocationRole,
    streamViolation?: string,
    sawFinish?: boolean,
    // The call's own marginal meter (RV1101): the remainder must debit
    // against the SAME accumulation the mid-stream deltas fed, or a
    // tier crossing completed by the finish would price the remainder
    // as a fresh slice and the two money paths would disagree again.
    meter?: (delta: Usage) => void,
    // Returns the sanitized usage it accounted, so the reconciliation
    // record minted beside the call carries the SAME numbers the phase
    // slices accumulated (P1.3: per-model sums over records reconcile
    // with usageByModel by construction).
  ): Usage => {
    if (streamViolation !== undefined) {
      invariantViolation ??= `adapter '${adapterId}' violated the Usage invariant: ${streamViolation}`;
    }
    // Detach from the adapter-owned object before validating: the
    // snapshot is what gets validated AND consumed, so an accessor that
    // answers the validator with valid counts cannot feed the
    // accumulators something else afterward.
    const snapshot = snapshotUsage(usage);
    const violation = usageInvariantViolation(snapshot, adapterId);
    if (violation !== undefined) {
      invariantViolation ??= violation;
    }
    const safe = violation === undefined ? snapshot : sanitizeUsage(snapshot);
    totalUsage = addUsage(totalUsage, safe);
    addPhaseUsage(role, ref, safe);
    // Mid-stream deltas already reached the budget through streamTurn's
    // onUsage (sanitized at that inlet); report only the remainder so
    // nothing double-counts.
    const remainder: Usage = {
      inputTokens: Math.max(0, safe.inputTokens - reported.inputTokens),
      outputTokens: Math.max(0, safe.outputTokens - reported.outputTokens),
      cacheReadTokens: Math.max(0, safe.cacheReadTokens - reported.cacheReadTokens),
      cacheWriteTokens: Math.max(0, safe.cacheWriteTokens - reported.cacheWriteTokens),
    };
    // Mid-stream reports the finish total does not confirm are a
    // contract anomaly (finish IS the total), and over-reported cache
    // READS are the one shape that UNDERBILLS: the excess was debited
    // at the read discount but the authoritative finish says those
    // tokens were not reads. Re-debit the excess as plain input (the
    // discount already paid keeps the correction conservative, never a
    // credit) and fail the call loud like every other violation.
    // The midstream<=finish confirmation exists only when a finish
    // CLAIM exists (RV1013): an error-terminal attempt carries no
    // total to confirm, and comparing per-segment deltas against a
    // partial attempt would manufacture a violation that shadows the
    // real wire error (a mid-absorption segment denial or a transport
    // cut). The conservative re-debit below stays active either way.
    for (const field of [
      'inputTokens',
      'outputTokens',
      'cacheReadTokens',
      'cacheWriteTokens',
      'cacheWrite5mTokens',
      'cacheWrite1hTokens',
    ] as const) {
      const reportedCount = reported[field] ?? 0;
      const safeCount = safe[field] ?? 0;
      if (sawFinish === true && reportedCount > safeCount) {
        invariantViolation ??=
          `adapter '${adapterId}' violated the Usage invariant: mid-stream ${field} ` +
          `(${String(reportedCount)}) exceeded the finish total (${String(safeCount)})`;
      }
    }
    const overReportedReads = Math.max(0, reported.cacheReadTokens - safe.cacheReadTokens);
    if (overReportedReads > 0) {
      remainder.inputTokens = Math.min(
        Number.MAX_SAFE_INTEGER,
        remainder.inputTokens + overReportedReads,
      );
    }
    const reasoningRemainder = Math.max(
      0,
      (safe.reasoningTokens ?? 0) - (reported.reasoningTokens ?? 0),
    );
    if (reasoningRemainder > 0) {
      remainder.reasoningTokens = reasoningRemainder;
    }
    // The TTL split's remainder mirrors the scalar fields (RV1001): the
    // finish-confirmed shares not yet debited mid-stream reach the
    // ledger with their attribution intact, so the live fold prices the
    // 1h premium exactly like settlement will. A mid-stream report that
    // shifted tokens BETWEEN shares can make this per-field catch-up
    // overlap a write already debited; that direction only ever
    // overcharges (never a credit), the conservative posture every
    // repair here takes.
    const write5mRemainder = Math.max(
      0,
      (safe.cacheWrite5mTokens ?? 0) - (reported.cacheWrite5mTokens ?? 0),
    );
    if (write5mRemainder > 0) {
      remainder.cacheWrite5mTokens = write5mRemainder;
    }
    const write1hRemainder = Math.max(
      0,
      (safe.cacheWrite1hTokens ?? 0) - (reported.cacheWrite1hTokens ?? 0),
    );
    if (write1hRemainder > 0) {
      remainder.cacheWrite1hTokens = write1hRemainder;
    }
    if (
      remainder.inputTokens > 0 ||
      remainder.outputTokens > 0 ||
      remainder.cacheReadTokens > 0 ||
      remainder.cacheWriteTokens > 0 ||
      write5mRemainder > 0 ||
      write1hRemainder > 0
    ) {
      if (meter !== undefined) {
        meter(remainder);
      } else {
        options.budget?.onUsage(remainder, ref);
      }
    }
    return safe;
  };

  // Retry and failover engine (M4-T04/T05): RetryPolicy lives UNDER the
  // journal around every adapter.stream dispatch (a retried-then-
  // successful call is one entry with one usage total, and transport
  // retries never count as lineage attempts, DEF-3). When a serving
  // model exhausts its tries on a failover trigger, the chain advances
  // (sticky) and the turn re-dispatches on the fallback: only servedBy
  // changes, never the content key. Stream-idle severance is retryable
  // transport-class.
  const retryPolicy = options.retry?.policy ?? DEFAULT_RETRY_POLICY;
  const retryOn = retryPolicy.retryOn ?? DEFAULT_RETRY_POLICY.retryOn ?? [];
  const injectedSleep = options.retry?.sleep;
  const retryRandom = options.retry?.random ?? wallRandom;

  // Abort short circuit for the retry and failover engine (v1.28.0
  // review P1): a requested cancel (the host signal, which the run
  // deadline also drives) or a crossed budget ceiling interrupts a
  // pending backoff and forbids every further dispatch, because the
  // engine owns retries and wall clock and a backoff sleep must not
  // delay settlement or re enter the adapter after an abort. The
  // synthetic outcome mirrors streamTurn's aborted shape with an
  // empty turn and zero usage: each failed attempt's usage is
  // already recorded, so nothing is lost or double billed.
  const abortKind = (): 'budget' | 'external' | undefined =>
    options.budget?.signal?.aborted === true
      ? 'budget'
      : options.signal?.aborted === true
        ? 'external'
        : undefined;
  const abortedOutcome = (aborted: 'budget' | 'external'): TurnOutcome => ({
    turn: { text: '', toolCalls: [] },
    usage: ZERO_USAGE,
    reported: ZERO_USAGE,
    usageApprox: true,
    aborted,
    neverDispatched: true,
  });
  // The backoff wait is interruptible: the host and budget signals
  // race the delay, so an abort wakes it immediately. An injected
  // retry.sleep(ms) hook keeps its signature; when it loses the race
  // its eventual rejection is swallowed (never an unhandled
  // rejection), while a rejection on the winning path propagates
  // unchanged. The native path clears its timer on abort so an
  // abandoned long backoff never pins the event loop.
  const backoffWait = async (ms: number): Promise<void> => {
    const signals: AbortSignal[] = [];
    if (options.signal !== undefined) {
      signals.push(options.signal);
    }
    if (options.budget?.signal !== undefined) {
      signals.push(options.budget.signal);
    }
    const combined = signals.length === 0 ? undefined : AbortSignal.any(signals);
    if (combined?.aborted === true) {
      return;
    }
    if (injectedSleep === undefined) {
      await new Promise<void>((resolve) => {
        let unhook = (): void => {};
        const timer = setTimeout(() => {
          unhook();
          resolve();
        }, ms);
        if (combined !== undefined) {
          const onAbort = (): void => {
            clearTimeout(timer);
            resolve();
          };
          combined.addEventListener('abort', onAbort, { once: true });
          unhook = () => combined.removeEventListener('abort', onAbort);
        }
      });
      return;
    }
    const sleep = Promise.resolve(injectedSleep(ms));
    if (combined === undefined) {
      await sleep;
      return;
    }
    let unhook: (() => void) | undefined;
    const wake = new Promise<void>((resolve) => {
      const onAbort = (): void => resolve();
      combined.addEventListener('abort', onAbort, { once: true });
      unhook = () => combined.removeEventListener('abort', onAbort);
    });
    try {
      await Promise.race([sleep, wake]);
    } finally {
      unhook?.();
      void sleep.catch(() => undefined);
    }
  };

  const dispatchPhase = async (site: {
    /** The invocation phase this dispatch pays for (v1.19.0 review P1-2). */
    role: InvocationRole;
    chain: Array<PhaseTarget & { on?: FailoverTrigger[] }>;
    cursor: { index: number };
    requestFor: (target: PhaseTarget) => ChatRequest;
    streamOptionsFor: (target: PhaseTarget) => Parameters<typeof streamTurn>[2];
  }): Promise<{ outcome: TurnOutcome; target: PhaseTarget }> => {
    // One denial EPISODE per dispatch site (RV709): consecutive quota
    // denials count once toward recovery when a later attempt of this
    // same dispatch (retry or failover alike) is granted.
    let deniedEpisode = false;
    for (;;) {
      const target = site.chain[site.cursor.index] ?? site.chain[0];
      let tries = 0;
      // The denial retry budget of THIS target (RV1601): a pre-wire
      // quota denial is a WAIT on the window, not evidence against the
      // provider, so it spends its own bounded budget and leaves
      // `tries` (and with it RetryPolicy.attempts and the ledger's
      // 1-based attempt ordinal) to dispatched attempts only. The
      // eighteenth comparison benchmark hit the old conflation live:
      // 21 denials exported as transport retries, and post-denial
      // success rows reading attempt=2 with no attempt=1 sibling.
      let denialTurns = 0;
      const maxDenials = options.quota?.maxDenials ?? DEFAULT_MAX_QUOTA_DENIALS;
      inner: for (;;) {
        // The reservation of THIS attempt; a fresh attempt (retry or
        // failover takeover) reserves anew, exactly as each wire call
        // consumes provider capacity anew.
        let reservationId: string | undefined;
        // Pre-wire segment admissions of THIS attempt (RV1013): each
        // provider-side continuation the adapter asked the hook for and
        // was granted, in grant order; settled or released after the
        // outcome.
        const segmentReservations: string[] = [];
        // The per-call marginal meter of THIS attempt (RV1101): opened
        // at the dispatch chokepoint so every mid-stream delta and the
        // settle remainder of the SAME provider call debit against the
        // call's accumulation, and a long-context tier crossed by the
        // call's sum re-prices the call live exactly as the settled
        // fold will. Hooks without the meter keep the site's per-slice
        // onUsage callback.
        let callMeter: ((delta: Usage) => void) | undefined;
        const meteredOptionsFor = (dispatched: PhaseTarget): Parameters<typeof streamTurn>[2] => {
          const streamOptions = site.streamOptionsFor(dispatched);
          callMeter = options.budget?.openCallMeter?.(dispatched.resolved.ref);
          if (callMeter !== undefined) {
            streamOptions.onUsage = callMeter;
          }
          return streamOptions;
        };
        // The in-flight exposure hold of THIS attempt (RV711): taken
        // synchronously with the attempt's own request right before
        // the wire call, released once the attempt settles (its usage
        // is debited by then), so a backoff sleep or a queue wait
        // never holds exposure. A refusal throws typed out of the
        // dispatch and rides the same BudgetExhaustedError surface as
        // the layer-2b output bound.
        let releaseExposure: (() => void) | undefined;
        const admitExposure = (req: ChatRequest): void => {
          // The strict pricing gate (RV1508) shares the dispatch
          // chokepoint: armed, it refuses an unpriced, malformed, or
          // stale-priced model BEFORE the wire call and before any
          // exposure hold.
          options.budget?.assertPricedDispatch?.(target.resolved.ref);
          const admit = options.budget?.admitTurnExposure;
          if (admit === undefined) {
            return;
          }
          let planned = req.maxOutputTokens;
          if (planned === undefined) {
            // Defensive caps() lookup, the outputFloorOf posture: an
            // adapter throw must not fail a turn the estimate merely
            // wanted to bound.
            try {
              planned = target.adapter.caps(target.resolved.model).maxOutputTokens;
            } catch {
              planned = 0;
            }
          }
          releaseExposure = admit(target.resolved.ref, estimateInputTokens(req.messages), planned);
        };
        const quotaDeniedOutcome = (denial: {
          retryAfterMs?: number;
          reason?: string;
          infrastructure?: string;
        }): TurnOutcome => ({
          turn: { text: '', toolCalls: [] },
          usage: ZERO_USAGE,
          reported: ZERO_USAGE,
          usageApprox: false,
          quotaDenied: true,
          wireError: {
            // 'rate-limit' rides the provider-429 machinery verbatim;
            // an infrastructure failure under onLimiterError 'deny'
            // is transport-class instead (the limiter, not the quota,
            // is what failed).
            code: denial.infrastructure === undefined ? 'rate-limit' : 'quota-limiter',
            message:
              denial.infrastructure ??
              `the shared quota limiter denied ${target.resolved.ref}` +
                (denial.reason === undefined ? '' : `: ${denial.reason}`),
            retryable: true,
            data: {
              kind: denial.infrastructure === undefined ? 'rate-limit' : 'transport',
              source: 'quota-limiter',
              ...(denial.retryAfterMs === undefined ? {} : { retryAfterMs: denial.retryAfterMs }),
              ...(denial.reason === undefined ? {} : { reason: denial.reason }),
            },
          },
        });
        /**
         * The abort recheck across the AWAITED reservation (RV1210).
         * `dispatch` checks the signals inside its thunk so a keyed
         * limiter queue wait cannot outlive an abort, but the quota
         * reservation is a second unbounded wait past that check: a
         * limiter that queues holds the call for as long as the window
         * is full, and an abort landing in there used to be invisible,
         * so the wire left anyway and the run paid for a call it had
         * already been told to stop making. A granted admission whose
         * wire is abandoned here is RELEASED, never reconciled: a
         * settlement only ever adds (the call happened), while this
         * call provably did not.
         */
        const abortedAfterReserve = async (
          quota: NonNullable<typeof options.quota>,
          granted?: string,
        ): Promise<TurnOutcome | undefined> => {
          const aborted = abortKind();
          if (aborted === undefined) {
            return undefined;
          }
          if (granted !== undefined) {
            // Cleared BEFORE the release so the settlement below can
            // never also fire for this id.
            reservationId = undefined;
            if (quota.release !== undefined) {
              try {
                await quota.release(granted);
              } catch (thrown) {
                const detail = thrown instanceof Error ? thrown.message : String(thrown);
                events?.emit({
                  type: 'log',
                  level: 'warn',
                  msg: `the shared quota limiter failed to release an aborted admission: ${detail}`,
                });
              }
            }
          }
          return abortedOutcome(aborted);
        };
        // Reserving is async only when a quota is configured: the
        // unconfigured path returns the streamTurn promise ITSELF, so
        // no extra microtask ever reorders concurrent journal appends
        // against a run without a limiter (the cassette contract).
        const dispatchWithQuota = async (
          quota: NonNullable<typeof options.quota>,
        ): Promise<TurnOutcome> => {
          const req = site.requestFor(target);
          // Exposure admission BEFORE the quota reservation: a refusal
          // here costs nothing external, while the reverse order would
          // leak a granted quota slot to the window.
          admitExposure(req);
          let decision: QuotaDecision;
          try {
            decision = await quota.reserve({
              provider: target.adapter.id,
              model: target.resolved.model,
              estimate: {
                requests: 1,
                inputTokens: estimateInputTokens(req.messages),
                ...(req.maxOutputTokens === undefined
                  ? {}
                  : { maxOutputTokens: req.maxOutputTokens }),
              },
            });
          } catch (thrown) {
            const detail = thrown instanceof Error ? thrown.message : String(thrown);
            if (quota.onLimiterError === 'allow') {
              events?.emit({
                type: 'log',
                level: 'warn',
                msg:
                  `the shared quota limiter failed; dispatching ${target.resolved.ref} ` +
                  `without a reservation (onLimiterError 'allow'): ${detail}`,
              });
              return (
                (await abortedAfterReserve(quota)) ??
                streamTurn(target.adapter, req, meteredOptionsFor(target))
              );
            }
            return quotaDeniedOutcome({
              infrastructure: `the shared quota limiter failed (onLimiterError 'deny'): ${detail}`,
            });
          }
          if (!decision.granted) {
            return quotaDeniedOutcome(decision);
          }
          reservationId = decision.reservationId;
          const abandoned = await abortedAfterReserve(quota, decision.reservationId);
          if (abandoned !== undefined) {
            return abandoned;
          }
          if (quota.reserveContinuations !== true) {
            return streamTurn(target.adapter, req, meteredOptionsFor(target));
          }
          // The hard mode (RV1013): each provider-side continuation is
          // admitted BEFORE its egress through the adapter hook. A
          // denial resolves to the limiter's own rate-limit-class
          // WireError, which the adapter yields as its terminal event,
          // so the over-cap wire never leaves and the retry and
          // failover machinery sees exactly the provider-429 shape.
          const hooks: StreamHooks = {
            onContinuationSegment: async () => {
              let segmentDecision: QuotaDecision;
              try {
                segmentDecision = await quota.reserve({
                  provider: target.adapter.id,
                  model: target.resolved.model,
                  estimate: { requests: 1, inputTokens: 0 },
                });
              } catch (thrown) {
                const detail = thrown instanceof Error ? thrown.message : String(thrown);
                if (quota.onLimiterError === 'allow') {
                  events?.emit({
                    type: 'log',
                    level: 'warn',
                    msg:
                      `the shared quota limiter failed; continuing ${target.resolved.ref} ` +
                      `without a segment reservation (onLimiterError 'allow'): ${detail}`,
                  });
                  return undefined;
                }
                return {
                  code: 'quota-limiter',
                  message:
                    `the shared quota limiter failed on a pause_turn continuation ` +
                    `(onLimiterError 'deny'): ${detail}`,
                  retryable: true,
                  data: { kind: 'transport', source: 'quota-limiter' },
                };
              }
              if (!segmentDecision.granted) {
                return {
                  code: 'rate-limit',
                  message:
                    `the shared quota limiter denied a pause_turn continuation of ` +
                    `${target.resolved.ref}` +
                    (segmentDecision.reason === undefined ? '' : `: ${segmentDecision.reason}`),
                  retryable: true,
                  data: {
                    kind: 'rate-limit',
                    source: 'quota-limiter',
                    ...(segmentDecision.retryAfterMs === undefined
                      ? {}
                      : { retryAfterMs: segmentDecision.retryAfterMs }),
                    ...(segmentDecision.reason === undefined
                      ? {}
                      : { reason: segmentDecision.reason }),
                  },
                };
              }
              segmentReservations.push(segmentDecision.reservationId);
              return undefined;
            },
          };
          return streamTurn(target.adapter, req, { ...meteredOptionsFor(target), hooks });
        };
        const dispatch = (): Promise<TurnOutcome> => {
          // Checked inside the thunk so a keyed limiter queue wait
          // cannot outlive an abort into a fresh provider call.
          const aborted = abortKind();
          if (aborted !== undefined) {
            return Promise.resolve(abortedOutcome(aborted));
          }
          if (options.quota === undefined) {
            const req = site.requestFor(target);
            admitExposure(req);
            return streamTurn(target.adapter, req, meteredOptionsFor(target));
          }
          return dispatchWithQuota(options.quota);
        };
        // The keyed limiter gates the wire call itself; retries and
        // failover each re-acquire, so a stalled provider never holds
        // its slot through a backoff sleep (M4-T07). The agent signal
        // rides along so an aborted caller leaves the queue (v1.34.0
        // review P2-4).
        let outcome: TurnOutcome;
        for (;;) {
          try {
            outcome = await (options.providerSlot === undefined
              ? dispatch()
              : options.providerSlot(target.adapter.id, dispatch, options.signal));
          } catch (thrown) {
            // The exposure-wait posture (RV1902): a transient in-flight
            // refusal on a waiting invocation parks until a live hold
            // releases and retries pre-wire, zero provider attempts
            // while parked by construction, honoring the budgets
            // guide's transient contract for the one agent whose settle
            // would tear down the run its admitted children are still
            // funding. The drained arm (no live hold) rethrows typed:
            // spend never shrinks, so nothing can turn that refusal
            // into a fit, and the orchestrate catch owns the documented
            // forced-finish partial.
            const refusalData =
              thrown instanceof BudgetExhaustedError
                ? (thrown.data as
                    | {
                        reason?: string;
                        capUsd?: number;
                        spentUsd?: number;
                        inFlightUsd?: number;
                        estimateUsd?: number;
                      }
                    | undefined)
                : undefined;
            const awaitRelease = options.budget?.awaitExposureRelease;
            if (
              (options.exposureWait !== true && options.exposureWait !== 'child') ||
              refusalData?.reason !== 'in-flight-exposure' ||
              awaitRelease === undefined
            ) {
              throw thrown;
            }
            const waitScope = options.exposureWait === 'child' ? 'child' : 'root';
            const willWait = (options.budget?.liveExposureUsd?.() ?? 0) > 0;
            events?.emit({
              type: 'budget:exposure-wait',
              agentType,
              label: options.label,
              model: target.resolved.ref,
              scope: waitScope,
              ...(typeof refusalData.capUsd === 'number' ? { capUsd: refusalData.capUsd } : {}),
              ...(typeof refusalData.spentUsd === 'number'
                ? { spentUsd: refusalData.spentUsd }
                : {}),
              ...(typeof refusalData.inFlightUsd === 'number'
                ? { inFlightUsd: refusalData.inFlightUsd }
                : {}),
              ...(typeof refusalData.estimateUsd === 'number'
                ? { estimateUsd: refusalData.estimateUsd }
                : {}),
              willWait,
            });
            if (!willWait) {
              if (waitScope === 'child') {
                // The drained child refusal (RV2002): no live holder is
                // left to wait out, so parking would hang forever. The
                // seat dies typed and CHEAP (zero provider attempts on
                // this path by construction), distinguishable from a
                // crashed child, so the orchestrator can re-spawn it
                // once money frees; the raw refusal stays on the root,
                // whose drained arm owns the forced-finish partial.
                throw new BudgetExhaustedError(
                  `exposure pool drained for the spawned child: ${
                    thrown instanceof Error ? thrown.message : String(thrown)
                  }`,
                  {
                    data: {
                      reason: 'exposure-drained',
                      ...(typeof refusalData.capUsd === 'number'
                        ? { capUsd: refusalData.capUsd }
                        : {}),
                      ...(typeof refusalData.spentUsd === 'number'
                        ? { spentUsd: refusalData.spentUsd }
                        : {}),
                      ...(typeof refusalData.estimateUsd === 'number'
                        ? { estimateUsd: refusalData.estimateUsd }
                        : {}),
                    },
                  },
                );
              }
              throw thrown;
            }
            const waitSignals = [options.signal, options.budget?.signal].filter(
              (candidate): candidate is AbortSignal => candidate !== undefined,
            );
            await awaitRelease(waitSignals.length === 0 ? undefined : AbortSignal.any(waitSignals));
            continue;
          } finally {
            // The attempt is settled either way (its usage, if any, is
            // already debited by the stream's onUsage deltas); a thrown
            // refusal reserved nothing and releases nothing.
            releaseExposure?.();
          }
          break;
        }
        if (reservationId !== undefined && options.quota !== undefined) {
          // Settle the reservation against what the attempt actually
          // consumed (an aborted or failed attempt settles too; its
          // recorded usage is whatever the stream reported). A
          // reconcile failure only warns: the wire call already
          // happened and the window ages the estimate out. When the
          // adapter absorbed provider-side continuations, the finish
          // metadata names the true wire request count (RV905) and the
          // window settles at it: a reservation left at 1 would let a
          // pause_turn-heavy workload overrun the provider's RPM cap by
          // the continuation factor.
          const wireNamespace = outcome.providerMetadata?.[target.adapter.id] as
            { wireRequests?: { count?: unknown } } | undefined;
          const rawWireCount = wireNamespace?.wireRequests?.count;
          const wireCount =
            typeof rawWireCount === 'number' && Number.isInteger(rawWireCount) && rawWireCount > 1
              ? rawWireCount
              : undefined;
          // Under pre-wire segment admission (RV1013) every hook-granted
          // continuation already consumed the window at its own
          // admission, so the main settlement must not re-add it (that
          // would double-count); it settles only the continuations no
          // grant covered (an adapter unaware of the hook). Without the
          // hard mode this is the historical RV905 settlement verbatim.
          const granted = segmentReservations.length;
          const mainActual =
            options.quota.reserveContinuations === true
              ? wireCount !== undefined && wireCount - granted > 1
                ? { requests: wireCount - granted }
                : undefined
              : wireCount !== undefined
                ? { requests: wireCount }
                : undefined;
          try {
            await options.quota.reconcile(reservationId, outcome.usage, mainActual);
          } catch (thrown) {
            const detail = thrown instanceof Error ? thrown.message : String(thrown);
            events?.emit({
              type: 'log',
              level: 'warn',
              msg: `the shared quota limiter failed to reconcile a reservation: ${detail}`,
            });
          }
          // A granted admission whose wire never left releases back to
          // the window (RV1013): the finish names the true wire set, so
          // grants beyond the flown continuations are UNUSED. Without a
          // finish nothing certifies which wires flew, and the
          // conservative direction for a rate cap is to leave the
          // admission consumed (the window ages it out).
          if (
            options.quota.reserveContinuations === true &&
            granted > 0 &&
            outcome.finish !== undefined &&
            options.quota.release !== undefined
          ) {
            // Fail closed on a finish that names NO wire set (RV1210):
            // an absent count used to read as "one wire flew", so every
            // grant looked unused and went back to the window, handing
            // a hook-granting adapter that reports no count exactly the
            // capacity RV1013 admitted. Nothing proves those wires
            // unused, so nothing is released, the same conservative
            // direction the no-finish arm above takes.
            const flown = wireCount === undefined ? granted : wireCount - 1;
            for (const unused of segmentReservations.slice(Math.max(0, flown))) {
              try {
                await options.quota.release(unused);
              } catch (thrown) {
                const detail = thrown instanceof Error ? thrown.message : String(thrown);
                events?.emit({
                  type: 'log',
                  level: 'warn',
                  msg: `the shared quota limiter failed to release an unused admission: ${detail}`,
                });
              }
            }
          }
        }
        if (outcome.quotaDenied === true) {
          quotaDenials += 1;
          // Classified by the limiter's own reason vocabulary: the
          // requests dimension names requestsPerMinute, everything
          // else is a token-window denial (RV1510).
          const denialReason = (outcome.wireError?.data as { reason?: unknown } | undefined)
            ?.reason;
          if (typeof denialReason === 'string' && denialReason.includes('requestsPerMinute')) {
            quotaDenialsRequests += 1;
          } else {
            quotaDenialsTokens += 1;
          }
          deniedEpisode = true;
        } else if (deniedEpisode && outcome.neverDispatched !== true) {
          // A granted attempt after a denied one, whatever the wire
          // outcome: the quota episode recovered.
          quotaRecoveries += 1;
          deniedEpisode = false;
        }
        if (outcome.quotaDenied !== true && outcome.neverDispatched !== true) {
          const accounted = recordUsage(
            outcome.usage,
            outcome.reported,
            target.adapter.id,
            target.resolved.ref,
            site.role,
            outcome.usageViolation,
            outcome.finish !== undefined,
            callMeter,
          );
          // The reconciliation record of THIS wire call (P1.3): the
          // provider ran (quota denials and abort short circuits are
          // excluded above), so a provider could bill it whether it
          // finished, failed, or was severed.
          const namespace = outcome.providerMetadata?.[target.adapter.id] as
            | {
                responseId?: unknown;
                response?: { id?: unknown };
                wireRequests?: { count?: unknown; responseIds?: unknown[] };
              }
            | undefined;
          const record: ProviderCallRecord = {
            ordinal: providerCalls.length + 1,
            role: site.role,
            servedBy: target.resolved.ref,
            attempt: tries + 1,
            outcome:
              outcome.aborted !== undefined
                ? 'aborted'
                : outcome.wireError !== undefined
                  ? 'error'
                  : 'ok',
            usage: accounted,
          };
          if (typeof namespace?.responseId === 'string') {
            record.responseId = namespace.responseId;
          } else if (typeof namespace?.response?.id === 'string') {
            // The AI SDK convention nests the id under `response` (the
            // shape third-party bridges emit); the flat first-class form
            // wins when both are present (RV401).
            record.responseId = namespace.response.id;
          }
          // Provider-side continuations absorbed into this dispatch
          // (RV905): the record carries every segment id so a
          // per-request statement joins the whole set, and the quota
          // window below settles at the true wire request count.
          const wire = namespace?.wireRequests;
          const wireIds =
            wire !== undefined &&
            Array.isArray(wire.responseIds) &&
            wire.responseIds.length > 1 &&
            wire.responseIds.every((id): id is string => typeof id === 'string')
              ? wire.responseIds
              : undefined;
          if (wireIds !== undefined) {
            record.wireResponseIds = wireIds;
          }
          // An errored dispatch whose adapter absorbed pause_turn
          // segments (RV1805): the finish that would name the wire set
          // never came, so the adapter rides it on the error data
          // instead, and the record keeps the paid segments joinable.
          // A SINGLE absorbed segment counts here (unlike the finish
          // arm's multi-wire threshold): with no finish there is no
          // plain responseId for the row, so even one id is the
          // difference between a joinable row and an orphaned wire.
          if (wireIds === undefined && record.outcome === 'error') {
            const errorData =
              outcome.wireError !== undefined &&
              typeof outcome.wireError.data === 'object' &&
              outcome.wireError.data !== null &&
              !Array.isArray(outcome.wireError.data)
                ? (outcome.wireError.data as {
                    wireRequests?: { count?: unknown; responseIds?: unknown[] };
                  })
                : undefined;
            const absorbed = errorData?.wireRequests;
            const absorbedIds =
              absorbed !== undefined && Array.isArray(absorbed.responseIds)
                ? absorbed.responseIds.filter((id): id is string => typeof id === 'string')
                : [];
            if (absorbedIds.length > 0) {
              record.wireResponseIds = absorbedIds;
            }
            const absorbedCount = absorbed?.count;
            if (
              typeof absorbedCount === 'number' &&
              Number.isInteger(absorbedCount) &&
              absorbedCount > 0 &&
              (absorbedCount > 1 || absorbedIds.length > 0)
            ) {
              record.wireRequests = absorbedCount;
            }
          }
          // The billed CARDINALITY of this dispatch (RV1210), recorded
          // from the reported count rather than counted off the ids: a
          // provider that leaves one absorbed segment unnamed still
          // made that request, so ids alone understate the row by
          // exactly the unnamed segments, and the invoice would then
          // disagree with the quota window, which settles on this same
          // count.
          const wireCountReported = wire?.count;
          if (
            typeof wireCountReported === 'number' &&
            Number.isInteger(wireCountReported) &&
            wireCountReported > 1
          ) {
            record.wireRequests = wireCountReported;
          }
          if (outcome.usageApprox) {
            record.usageApprox = true;
          }
          if (outcome.aborted !== undefined) {
            record.aborted = outcome.aborted;
          } else if (outcome.wireError !== undefined) {
            record.errorCode = outcome.wireError.code;
          }
          providerCalls.push(record);
          // The incremental billing seam (RV2008): the record leaves
          // the process the moment it exists, not with the terminal.
          options.billing?.onProviderCall(record);
          // The money twin of the record (RV702): this call priced
          // individually, at the same chokepoint that minted it, so the
          // phase deltas and the invocation total fold per request.
          addCallUsd(site.role, target.resolved.ref, accounted);
          // Drift telemetry raw material (the v1.71 experiment review,
          // P0.5): a real provider 429 that carries adapter-normalized
          // reported limits is remembered per (provider, model), the
          // latest observation winning. Synthetic limiter denials never
          // reach this block (excluded with the other non-calls above),
          // so only the provider's own voice counts. Live-only, exactly
          // like transportRetries; the ctx layer holds the observations
          // against quota.declaredRules and journals the verdicts.
          const limited = outcome.wireError?.data as
            { kind?: string; reportedLimits?: RateLimitObservation['reportedLimits'] } | undefined;
          if (
            limited?.kind === 'rate-limit' &&
            typeof limited.reportedLimits === 'object' &&
            limited.reportedLimits !== null
          ) {
            rateLimitObservations.set(`${target.adapter.id}:${target.resolved.model}`, {
              provider: target.adapter.id,
              model: target.resolved.model,
              reportedLimits: limited.reportedLimits,
            });
          }
        }
        if (outcome.quotaDenied === true) {
          denialTurns += 1;
        } else {
          tries += 1;
        }
        const retryClass =
          outcome.aborted === 'idle'
            ? 'transport'
            : outcome.wireError === undefined
              ? undefined
              : retryClassOf(outcome.wireError);
        if (retryClass === undefined) {
          return { outcome, target };
        }
        usageApprox = usageApprox || outcome.usageApprox;
        // Each cause retries against ITS budget (RV1601); exhaustion of
        // either falls through to the same failover trigger below.
        const retryBudgetLeft =
          outcome.quotaDenied === true ? denialTurns < maxDenials : tries < retryPolicy.attempts;
        if (retryOn.includes(retryClass) && retryBudgetLeft) {
          // An abort that already landed makes the retry moot: return
          // the aborted outcome without emitting a willRetry promise
          // the loop is not going to keep.
          const abortedBefore = abortKind();
          if (abortedBefore !== undefined) {
            return { outcome: abortedOutcome(abortedBefore), target };
          }
          const retryAfter = (outcome.wireError?.data as { retryAfterMs?: unknown } | undefined)
            ?.retryAfterMs;
          if (outcome.wireError !== undefined) {
            if (outcome.quotaDenied !== true) {
              // A denial stays in the quotaDenials namespace alone:
              // retryCount reads clean against the provider ledger.
              transportRetries += 1;
            }
            if (outcome.quotaDenied === true) {
              // The recoverable pre-wire wait speaks its own type
              // (RV1810): the nineteenth benchmark's run emitted 13
              // agent:error events that were all healthy token-window
              // waits, and naive alerting on the TYPE read a failing
              // run where zero provider errors happened. The legacy
              // twin rides only under the versioned compat flag;
              // terminal denial exhaustion below still ends in the
              // real agent:error it always did.
              const denialData = outcome.wireError.data as
                { reason?: unknown; retryAfterMs?: unknown } | undefined;
              events?.emit({
                type: 'quota:denied',
                agentType,
                label: options.label,
                model: target.resolved.ref,
                ...(typeof denialData?.reason === 'string' ? { reason: denialData.reason } : {}),
                ...(typeof denialData?.retryAfterMs === 'number'
                  ? { retryAfterMs: denialData.retryAfterMs }
                  : {}),
                willRetry: true,
              });
              if (options.quotaDeniedAgentError === true) {
                events?.emit({
                  type: 'agent:error',
                  agentType,
                  label: options.label,
                  error: outcome.wireError,
                  willRetry: true,
                });
              }
            } else {
              events?.emit({
                type: 'agent:error',
                agentType,
                label: options.label,
                error: outcome.wireError,
                willRetry: true,
              });
            }
          }
          await backoffWait(
            retryDelayMs(
              retryPolicy,
              outcome.quotaDenied === true ? denialTurns - 1 : tries - 1,
              typeof retryAfter === 'number' ? retryAfter : undefined,
              retryRandom,
            ),
          );
          const abortedAfter = abortKind();
          if (abortedAfter !== undefined) {
            return { outcome: abortedOutcome(abortedAfter), target };
          }
          continue inner;
        }
        const trigger = failoverTriggerOf(retryClass);
        const next =
          trigger === undefined ? undefined : nextFailover(site.chain, trigger, site.cursor.index);
        if (next === undefined) {
          return { outcome, target };
        }
        const takeover = site.chain[next] as PhaseTarget;
        events?.emit({
          type: 'log',
          level: 'warn',
          msg:
            `failover: ${takeover.resolved.ref} takes over from ${target.resolved.ref} ` +
            `after ${trigger} (the content key is unchanged; servedBy records the server)`,
        });
        // Visible scrub (M4-T08): the fallback's
        // own caps scrubbing surfaces the moment the target starts
        // serving, never silently.
        for (const scrub of takeover.resolved.scrubs) {
          events?.emit({ type: 'log', level: 'warn', msg: scrub.detail });
        }
        site.cursor.index = next;
        break inner;
      }
    }
  };

  // The ride tier follows the SERVING model's caps; a forced-tool target
  // with tools available degrades to prompt rather than pinning
  // toolChoice mid-loop (the ride/separate
  // decision itself keys on the PRIMARY model at the ctx layer).
  const rideTierFor = (target: PhaseTarget): StructuredOutputTier => {
    if (options.canonicalSchema === undefined) {
      return 'prompt';
    }
    const selected = selectStructuredOutputTier(
      target.adapter.caps(target.resolved.model),
      options.canonicalSchema,
    );
    return selected === 'forced-tool' && (options.tools?.contracts.length ?? 0) > 0
      ? 'prompt'
      : selected;
  };

  const loopChain: PhaseTarget[] = [
    { adapter: options.adapter, resolved: options.resolved },
    ...(options.fallbacks ?? []),
  ];
  const loopCursor = { index: 0 };

  /**
   * The drained-finalization grant (RV2204, the third parity rerun).
   * The exposure drain is terminal mid-work: spend only grows, so a
   * seat refused with no live holder left can never dispatch an
   * ordinary turn again. The third parity rerun killed three workers
   * ~30 turns into research with evidence pools of 17 and 22 under a
   * floor of 24 and a CONFIGURED finalization window: the drain came
   * before the window, and the window's play needs the very wire the
   * drain refuses. With `limits.finalizationReserve.maxOutputTokens`
   * declared, a drained seat that already did work now spends ONE
   * clamped finalization turn before its typed terminal: the output
   * clamp shrinks the turn's exposure estimate (the full estimate was
   * refused; the clamped one prices the summary allowance instead of
   * the whole per-turn cap), the finalization-window allowlist rides
   * as the turn's only tools so outstanding record_evidence calls can
   * land in parallel, and the executed calls persist through the
   * ordinary tool machinery. Best effort, exactly like the tool-budget
   * reserve turn: a refusal of even the clamped estimate warns and
   * keeps the typed drained terminal; a seat with NO completed turns
   * keeps dying free (the RV2002 zero-cost doctrine: nothing to
   * summarize, nothing paid).
   */
  let drainFinalizationRan = false;
  const runDrainFinalization = async (refusal: string): Promise<void> => {
    const allow = limits.finalizationWindow?.allow;
    const allowedTools =
      allow === undefined
        ? undefined
        : options.tools?.contracts.filter((contract) => allow.includes(contract.name));
    const toolsRide = allowedTools !== undefined && allowedTools.length > 0;
    const drainMessages: Msg[] = [
      ...messages,
      {
        role: 'user',
        parts: [
          {
            type: 'text',
            text:
              `The run's in-flight exposure pool is drained; no further ordinary turns can ` +
              `dispatch (${refusal}). This is your single finalization turn` +
              (toolsRide
                ? `: record any outstanding evidence with the allowed tools IN THIS turn ` +
                  `(parallel calls), then close`
                : `: close`) +
              ` with your best final summary of the work already done.`,
          },
        ],
      },
    ];
    let grant: Awaited<ReturnType<typeof dispatchPhase>> | undefined;
    try {
      grant = await dispatchPhase({
        role: primaryRole,
        chain: loopChain,
        cursor: loopCursor,
        requestFor: (target) => {
          let req = buildRequest(
            target.resolved,
            projectHistory(drainMessages, providerOf(target.adapter)),
            limits,
            toolsRide ? allowedTools : undefined,
          );
          const reserveMax = limits.finalizationReserve?.maxOutputTokens;
          if (reserveMax !== undefined) {
            req = {
              ...req,
              maxOutputTokens: Math.min(req.maxOutputTokens ?? reserveMax, reserveMax),
            };
          }
          req = applyCachePolicy(req, target, options.cache);
          return applyOutputBudget(req, target, options.budget);
        },
        streamOptionsFor: (target) => {
          const drainStreamOptions: Parameters<typeof streamTurn>[2] = {
            idleTimeoutMs: limits.streamIdleTimeoutMs,
            signals: options.signal === undefined ? [] : [options.signal],
            onUsage: (delta) => options.budget?.onUsage(delta, target.resolved.ref),
          };
          if (options.budget?.signal !== undefined) {
            drainStreamOptions.budgetSignal = options.budget.signal;
          }
          if (options.stream === true) {
            drainStreamOptions.onDelta = (delta) => events?.emit({ type: 'agent:stream', delta });
          }
          return drainStreamOptions;
        },
      });
    } catch (grantThrown) {
      if (!(grantThrown instanceof BudgetExhaustedError)) {
        throw grantThrown;
      }
      events?.emit({
        type: 'log',
        level: 'warn',
        msg: `the drained-finalization turn was skipped: ${grantThrown.message}`,
      });
      return;
    }
    const { outcome: grantOutcome, target: grantTarget } = grant;
    servedBy = grantTarget.resolved.ref;
    usageApprox = usageApprox || grantOutcome.usageApprox;
    messages.push(
      assistantMsg(
        grantOutcome.turn,
        liftRetainedParts(grantOutcome.providerMetadata, grantTarget.adapter),
      ),
    );
    if (toolsRide && grantOutcome.turn.toolCalls.length > 0) {
      try {
        await runToolCalls(grantOutcome.turn.toolCalls, []);
      } catch (toolThrown) {
        events?.emit({
          type: 'log',
          level: 'warn',
          msg: `a drained-finalization tool call failed: ${
            toolThrown instanceof Error ? toolThrown.message : String(toolThrown)
          }`,
        });
      }
    }
    events?.emit({
      type: 'log',
      level: 'info',
      msg: 'the drained seat spent its finalization turn',
      data: {
        toolCalls: grantOutcome.turn.toolCalls.length,
        outputTokens: grantOutcome.usage.outputTokens,
      },
    });
  };

  // A pending-turn limit hit above skips the loop entirely.
  loop: while (status === 'ok' && !finishedViaTool) {
    // Per-agent wall clock.
    if (limits.timeoutMs !== undefined && now() - startedAt >= limits.timeoutMs) {
      status = 'limit';
      break;
    }
    // The repair reserve (the v1.71 experiment review, P0.4): each
    // rejected terminal-tool exchange in the window (an error tool
    // result named after the terminal tool: schema-invalid arguments
    // and host validation rejections alike) grants one extra turn,
    // clamped to the configured reserve. Derived from the window itself
    // so a resumed segment that restored mid-exchange recounts the SAME
    // grants without journaling anything; a zero (or absent) reserve
    // computes nothing and keeps the ceiling comparison byte identical.
    const repairReserve = options.terminalTool?.repairTurnReserve ?? 0;
    const grantedRepairTurns =
      repairReserve === 0
        ? 0
        : Math.min(
            repairReserve,
            messages.reduce(
              (count, message) =>
                count +
                message.parts.filter(
                  (part) =>
                    part.type === 'tool-result' &&
                    part.name === options.terminalTool?.name &&
                    (part as { isError?: boolean }).isError === true,
                ).length,
              0,
            ),
          );
    if (turns >= limits.maxTurns + grantedRepairTurns) {
      status = 'limit';
      break;
    }
    try {
      options.budget?.beforeTurn();
    } catch (thrown) {
      // The refusal's own message rides the terminal (RV2104): this
      // catch used to discard it, and the seventh parity run's
      // synthesis died between a granted repair verdict and its
      // dispatch as a bare "agent terminated with status error" while
      // the thrown text named the crossed account and the exact
      // arithmetic. Every downstream truth surface (the ctx terminal
      // entry, the RV2103 declined verdict) reads this message.
      status = 'error';
      agentError = { kind: 'budget', retryable: false };
      // The unfunded repair grant names itself (RV2207): a granted
      // repair turn refused here used to read like any other budget
      // stop, and the orchestrator could not tell a mid-work ceiling
      // from a grant the money never covered (the seventh parity run's
      // synthesis died exactly between a granted repair verdict and
      // its dispatch). The marker is a single-producer contract with
      // the orchestrator's typed decline.
      const lastMessage = messages[messages.length - 1];
      const repairPending =
        grantedRepairTurns > 0 &&
        lastMessage !== undefined &&
        lastMessage.parts.some(
          (part) =>
            part.type === 'tool-result' &&
            part.name === options.terminalTool?.name &&
            (part as { isError?: boolean }).isError === true,
        );
      errorMessage =
        (repairPending ? 'the granted repair turn could not be funded: ' : '') +
        (thrown instanceof Error ? thrown.message : String(thrown));
      break;
    }
    turns += 1;

    const signals: AbortSignal[] = [];
    if (options.signal !== undefined) {
      signals.push(options.signal);
    }
    // Every outgoing request is a projection of the canonical history
    // into the SERVING provider's view (M4-T02);
    // the dispatch engine may serve the turn from a failover target.
    let loopDispatch: Awaited<ReturnType<typeof dispatchPhase>>;
    try {
      loopDispatch = await dispatchPhase({
        role: primaryRole,
        chain: loopChain,
        cursor: loopCursor,
        requestFor: (target) => {
          let req = buildRequest(
            target.resolved,
            projectHistory(messages, providerOf(target.adapter)),
            limits,
            options.tools?.contracts,
          );
          if (
            options.schema !== undefined &&
            options.canonicalSchema !== undefined &&
            !separateExtract
          ) {
            req = applyStructuredOutputTier(req, rideTierFor(target), options.canonicalSchema);
          }
          // The cache policy compiles per turn (RV2006): the deepest
          // breakpoint slides with the history, so every loop turn
          // re-reads the cached prefix instead of re-paying it.
          req = applyCachePolicy(req, target, options.cache);
          return applyOutputBudget(req, target, options.budget);
        },
        streamOptionsFor: (target) => {
          const streamTurnOptions: Parameters<typeof streamTurn>[2] = {
            idleTimeoutMs: limits.streamIdleTimeoutMs,
            signals,
            onUsage: (delta) => options.budget?.onUsage(delta, target.resolved.ref),
          };
          if (options.budget?.signal !== undefined) {
            streamTurnOptions.budgetSignal = options.budget.signal;
          }
          if (options.stream === true) {
            streamTurnOptions.onDelta = (delta) => events?.emit({ type: 'agent:stream', delta });
          }
          return streamTurnOptions;
        },
      });
    } catch (thrown) {
      if (!(thrown instanceof BudgetExhaustedError)) {
        throw thrown;
      }
      // Layer 2b denied the dispatch: same surface as a layer-2 block.
      // The typed markers ride the terminal (RV2002, RV2101): a
      // drained seat and a reserve-line floor refusal are boundaries
      // the orchestrator must tell apart from a crashed agent.
      const typedReason = (thrown.data as { reason?: string } | undefined)?.reason;
      // The drained-finalization grant (RV2204): a mid-work drained
      // seat with a declared finalization reserve spends one clamped
      // turn before the typed terminal; see runDrainFinalization.
      if (
        typedReason === 'exposure-drained' &&
        limits.finalizationReserve !== undefined &&
        turns > 1 &&
        !drainFinalizationRan
      ) {
        drainFinalizationRan = true;
        await runDrainFinalization(thrown.message);
      }
      status = 'error';
      agentError = {
        kind: 'budget',
        retryable: false,
        ...(typedReason === 'exposure-drained' || typedReason === 'output-floor'
          ? { reason: typedReason }
          : {}),
      };
      errorMessage = thrown.message;
      break;
    }
    const { outcome, target: servedTarget } = loopDispatch;
    servedBy = servedTarget.resolved.ref;
    usageApprox = usageApprox || outcome.usageApprox;
    lastTurnUsage = {
      inputTokens: outcome.usage.inputTokens,
      outputTokens: outcome.usage.outputTokens,
    };
    messages.push(
      assistantMsg(outcome.turn, liftRetainedParts(outcome.providerMetadata, servedTarget.adapter)),
    );
    if (invariantViolation !== undefined) {
      status = 'error';
      agentError = { kind: 'transport', retryable: false };
      errorMessage = invariantViolation;
      events?.emit({
        type: 'agent:error',
        agentType,
        label: options.label,
        error: { code: 'agent', message: invariantViolation, retryable: false },
        willRetry: false,
      });
      break;
    }

    if (outcome.aborted === 'budget') {
      status = 'cancelled';
      agentError = { kind: 'budget', retryable: false };
      break;
    }
    if (outcome.aborted === 'external') {
      status = 'cancelled';
      break;
    }
    if (outcome.aborted === 'idle') {
      status = 'error';
      agentError = { kind: 'transport', retryable: true };
      errorMessage = `stream idle for ${limits.streamIdleTimeoutMs}ms`;
      events?.emit({
        type: 'agent:error',
        agentType,
        label: options.label,
        error: {
          code: 'agent',
          message: `stream idle for ${limits.streamIdleTimeoutMs}ms`,
          retryable: true,
        },
        willRetry: false,
      });
      break;
    }
    if (outcome.wireError !== undefined) {
      status = 'error';
      agentError = classifyWireError(outcome.wireError);
      errorMessage = outcome.wireError.message;
      events?.emit({
        type: 'agent:error',
        agentType,
        label: options.label,
        error: outcome.wireError,
        willRetry: false,
      });
      break;
    }
    if (outcome.finish?.reason === 'refusal') {
      status = 'error';
      const refusal = outcome.finish.refusal;
      agentError = { kind: 'terminal', retryable: false };
      errorMessage =
        `model refusal (${refusal.provider})` +
        (refusal.stopDetails?.category === undefined ? '' : `: ${refusal.stopDetails.category}`);
      events?.emit({
        type: 'agent:error',
        agentType,
        label: options.label,
        error: {
          code: 'agent',
          message:
            `model refusal (${refusal.provider})` +
            (refusal.stopDetails?.category !== undefined
              ? `: ${refusal.stopDetails.category}`
              : ''),
          retryable: false,
          data: { kind: 'terminal', refusal: refusal as unknown as Json },
        },
        willRetry: false,
      });
      break;
    }
    if (outcome.finish?.reason === 'context-window-exceeded') {
      status = 'error';
      agentError = { kind: 'terminal', retryable: false };
      break;
    }

    // Tool dispatch: gate and execute the turn's calls in source order,
    // feed the results back as one tool-role message, and loop for the
    // next model turn.
    if (options.tools !== undefined && outcome.turn.toolCalls.length > 0) {
      noProgress.recordTurn({ toolCalls: outcome.turn.toolCalls.length });
      const { parts, limitHit, escalated, finished, guardTrip, limiter, skipped } =
        await runToolCalls(outcome.turn.toolCalls, []);
      if (parts.length > 0) {
        messages.push({ role: 'tool', parts });
      }
      if (escalated !== undefined) {
        // Flavor semantics (suspension, decision, salvage) live in the
        // ctx layer; the loop terminates with the accepted request.
        status = 'escalated';
        escalationRequest = escalated;
        break;
      }
      if (finished !== undefined) {
        // Terminal tool: the loop ends ok with the finish result as the
        // output; extract and finalize never fire.
        output = finished as Out<S>;
        finishedViaTool = true;
        await saveBoundary();
        break;
      }
      if (limitHit) {
        status = 'limit';
        if (limiter !== undefined) {
          limitLimiter = limiter;
        }
        if (guardTrip === true && guard !== undefined) {
          abortClass = 'exploration';
          agentError = { kind: 'terminal', retryable: false };
          errorMessage = guard.describeTrip();
        } else if (limiter !== undefined && limits.finalizationReserve !== undefined) {
          // The guaranteed finalization turn (P1.1): name the exact
          // limiter on the terminal; the reserve turn itself runs at
          // the single post-loop site so this path and the pending-turn
          // resume path share one implementation.
          agentError = { kind: 'terminal', retryable: false };
          errorMessage =
            `tool budget exhausted: ${toolBudgetDetail(limiter)}; ` +
            `skipped tool calls: ${String(skipped ?? 0)}`;
          reserveRequest = { limiter, skipped: skipped ?? 0 };
        }
        break;
      }
      // Soft tool-budget visibility (RV-210/RV301): the grant and
      // budget notices join the conversation before the boundary
      // checkpoint, so a resume rebuilds the same history. The RV809
      // proactive grant fires here first, so its notice rides the same
      // flush.
      {
        const deficitGrant = maybeCoverEvidenceDeficit();
        if (deficitGrant !== undefined) {
          await deficitGrant;
        }
      }
      flushExtensionNotices();
      flushWindowNotices();
      maybePushBudgetNotice();
      // Compaction check at the tool turn boundary (M4-T03): the
      // estimate is the last loop turn's usage against the loop model's
      // contextWindow. Compaction runs BEFORE the boundary checkpoint,
      // so a crash after it resumes compact.
      if (
        options.summarize !== undefined &&
        !compactionDisabled &&
        shouldCompact({
          lastTurnUsage,
          contextWindow: options.adapter.caps(options.resolved.model).contextWindow,
          ...(options.compaction?.threshold === undefined
            ? {}
            : { threshold: options.compaction.threshold }),
        })
      ) {
        const summarizeResolved = options.summarize.resolved;
        // Each compaction is its own phase activation: a run that
        // summarizes three times emits three pairs.
        const summarizePhase = beginPhase('summarize', summarizeResolved.ref);
        // Visible scrub at fire time (M4-T08):
        // the summarize resolution rarely fires, so its scrubs surface
        // here rather than as spawn-time noise.
        for (const scrub of summarizeResolved.scrubs) {
          events?.emit({ type: 'log', level: 'warn', msg: scrub.detail });
        }
        try {
          options.budget?.beforeTurn();
        } catch (thrown) {
          status = 'error';
          agentError = { kind: 'budget', retryable: false };
          errorMessage = thrown instanceof Error ? thrown.message : String(thrown);
          endPhase(summarizePhase, 'error');
          break;
        }
        turns += 1;
        let summaryDispatch: Awaited<ReturnType<typeof dispatchPhase>>;
        try {
          summaryDispatch = await dispatchPhase({
            role: 'summarize',
            chain: [
              { adapter: options.summarize.adapter, resolved: options.summarize.resolved },
              ...(options.summarize.fallbacks ?? []),
            ],
            cursor: { index: 0 },
            requestFor: (target) => {
              let req = buildRequest(
                target.resolved,
                [...projectHistory(messages, providerOf(target.adapter)), summarizeInstruction()],
                limits,
                options.tools?.contracts,
              );
              if (req.tools !== undefined) {
                req = { ...req, toolChoice: 'none' };
              }
              return applyOutputBudget(req, target, options.budget);
            },
            streamOptionsFor: (target) => {
              const summarizeStreamOptions: Parameters<typeof streamTurn>[2] = {
                idleTimeoutMs: limits.streamIdleTimeoutMs,
                signals: options.signal === undefined ? [] : [options.signal],
                onUsage: (delta) => options.budget?.onUsage(delta, target.resolved.ref),
              };
              if (options.budget?.signal !== undefined) {
                summarizeStreamOptions.budgetSignal = options.budget.signal;
              }
              return summarizeStreamOptions;
            },
          });
        } catch (thrown) {
          if (!(thrown instanceof BudgetExhaustedError)) {
            throw thrown;
          }
          status = 'error';
          agentError = { kind: 'budget', retryable: false };
          errorMessage = thrown.message;
          endPhase(summarizePhase, 'error');
          break;
        }
        const { outcome: summary, target: summarizeTarget } = summaryDispatch;
        const summarizeServed = summarizeTarget.resolved.ref;
        usageApprox = usageApprox || summary.usageApprox;
        if (summary.aborted === 'budget') {
          status = 'cancelled';
          agentError = { kind: 'budget', retryable: false };
          endPhase(summarizePhase, 'error', summarizeServed);
          break;
        }
        if (summary.aborted === 'external') {
          status = 'cancelled';
          endPhase(summarizePhase, 'error', summarizeServed);
          break;
        }
        if (
          summary.wireError !== undefined ||
          summary.aborted === 'idle' ||
          summary.turn.text.trim() === ''
        ) {
          // A failed or empty summarize disables compaction for the
          // rest of the run instead of failing paid work (M4-T03);
          // the threshold would re-trip every boundary.
          compactionDisabled = true;
          events?.emit({
            type: 'log',
            level: 'warn',
            msg:
              'compaction disabled for this run: the summarize invocation ' +
              (summary.wireError !== undefined
                ? `failed (${summary.wireError.message})`
                : summary.aborted === 'idle'
                  ? 'timed out'
                  : 'returned an empty summary'),
          });
          endPhase(summarizePhase, 'error', summarizeServed);
        } else {
          const compacted = compactMessages(messages, summary.turn.text);
          messages.length = 0;
          messages.push(...compacted);
          compactionPoints.push(turns);
          // The next turn's prompt is the compact history; the stale
          // estimate must not re-trip the threshold.
          lastTurnUsage = { inputTokens: 0, outputTokens: 0 };
          endPhase(summarizePhase, 'ok', summarizeServed);
        }
      }
      // Turn boundary: tools executed, results appended. A crash after
      // this write resumes here; a crash before it re-runs the turn's
      // tools (at-least-once).
      await saveBoundary();
      continue loop;
    }

    // A required terminal tool (the orchestrator finish): a turn that
    // ends without ANY tool call is not an answer, whatever text it
    // carries; settling ok here would return unproven output (the
    // v1.6.0 follow-up review reproduced a reasoning-only turn settling
    // ok with an empty value). The turn consumes the no-progress budget
    // and the model is re-prompted toward the tool, naming the output
    // token cut when that is what ended the turn, so a model that never
    // calls the tool terminates as a bounded 'limit', never as ok.
    if (options.terminalTool !== undefined) {
      noProgress.recordTurn({ toolCalls: 0 });
      if (noProgress.tripped) {
        status = 'limit';
        abortClass = 'no-progress';
        agentError = { kind: 'terminal', retryable: false };
        errorMessage = noProgress.describe();
        break;
      }
      messages.push({
        role: 'user',
        parts: [
          {
            type: 'text',
            text:
              outcome.finish?.reason === 'max-tokens'
                ? `The turn was cut at the output token limit before any tool call. Be brief ` +
                  `and call the '${options.terminalTool.name}' tool now; plain text is not a ` +
                  `valid completion.`
                : `The turn ended without a tool call. Call the ` +
                  `'${options.terminalTool.name}' tool to complete; plain text is not a valid ` +
                  `completion.`,
          },
        ],
      });
      await saveBoundary();
      continue loop;
    }

    if (options.schema === undefined) {
      // A turn cut at the output token allowance with nothing visible is
      // a bounded failure, never a successful '' value: the caller (the
      // planner reproduced this) cannot repair an answer that contains no
      // content and would re-pay the same cap every retry (v1.9.0
      // follow-up review). Non-empty partial text keeps settling ok, and
      // when a finalize invocation is routed the loop turn's text is not
      // the answer, so the finalize arm below owns the check instead.
      if (
        options.finalize === undefined &&
        outcome.finish?.reason === 'max-tokens' &&
        outcome.turn.text.trim() === ''
      ) {
        status = 'limit';
        abortClass = 'output-truncated';
        agentError = { kind: 'terminal', retryable: false };
        errorMessage = outputTruncatedMessage('turn');
        break;
      }
      output = outcome.turn.text as Out<S>;
      break;
    }
    if (separateExtract) {
      // The loop turn is done; the extract invocation below produces the output.
      break;
    }

    const candidate = extractCandidate(outcome.turn, rideTierFor(servedTarget));
    const issues: Issue[] = [];
    if (candidate !== undefined) {
      const validation = await validateSchemaSpec(options.schema, candidate.raw);
      if (validation.valid) {
        output = validation.value;
        break;
      }
      issues.push(...validation.issues);
    } else {
      issues.push({ message: 'no JSON value found in the model response' });
    }
    schemaAttempts += 1;
    if (schemaAttempts >= maxSchemaAttempts) {
      status = 'error';
      agentError = { kind: 'schema-mismatch', retryable: false, issues };
      errorMessage = issues[0]?.message;
      break;
    }
    // A schema re-prompt turn produced neither tool calls nor artifact
    // deltas; the loop is about to continue, so the no-progress detector
    // consumes it (M3-T08; Appendix A, N = 3).
    noProgress.recordTurn({ toolCalls: 0 });
    if (noProgress.tripped) {
      status = 'limit';
      abortClass = 'no-progress';
      agentError = { kind: 'terminal', retryable: false };
      errorMessage = noProgress.describe();
      break;
    }
    events?.emit({
      type: 'agent:schema-retry',
      agentType,
      attempt: schemaAttempts,
      maxAttempts: maxSchemaAttempts - 1,
    });
    messages.push(formatRePrompt(issues, schemaAttempts, maxSchemaAttempts - 1));
    await saveBoundary();
    continue loop;
  }
  // The guaranteed finalization turn (P1.1): a tool-budget expiry under
  // limits.finalizationReserve grants the model exactly ONE summary turn
  // with tools withheld before the invocation settles as 'limit'. One
  // site serves both trip paths (the loop and the pending-turn resume).
  // Best effort: a blocked or failed dispatch keeps the earned 'limit'
  // terminal with a warn log; only a real abort (host cancel, budget
  // ceiling) or a usage-invariant violation moves the status, exactly
  // like every other arm.
  if (status === 'limit' && reserveRequest !== undefined) {
    const { limiter, skipped } = reserveRequest;
    let proceed = true;
    try {
      options.budget?.beforeTurn();
    } catch (thrown) {
      events?.emit({
        type: 'log',
        level: 'warn',
        msg: 'the finalization reserve turn was skipped: the budget blocks further turns',
        data: { reason: thrown instanceof Error ? thrown.message : String(thrown) },
      });
      proceed = false;
    }
    if (proceed) {
      turns += 1;
      // Request-only, like the summarize and finalize instructions: the
      // durable transcript keeps the raw history; the model's summary
      // reply is what persists.
      const reserveMessages: Msg[] = [
        ...messages,
        {
          role: 'user',
          parts: [
            {
              type: 'text',
              text:
                `The tool budget is exhausted (${toolBudgetDetail(limiter)}). ` +
                `Skipped tool calls: ${String(skipped)}; no further tool calls will execute. ` +
                `This is the final turn: produce your best final answer from the evidence ` +
                `already collected.`,
            },
          ],
        },
      ];
      let reserveDispatch: Awaited<ReturnType<typeof dispatchPhase>> | undefined;
      try {
        reserveDispatch = await dispatchPhase({
          role: primaryRole,
          chain: loopChain,
          cursor: loopCursor,
          requestFor: (target) => {
            let req = buildRequest(
              target.resolved,
              projectHistory(reserveMessages, providerOf(target.adapter)),
              limits,
              options.tools?.contracts,
            );
            if (
              options.schema !== undefined &&
              options.canonicalSchema !== undefined &&
              !separateExtract
            ) {
              // The summary rides the same structured-output tier as an
              // ordinary loop turn, so a valid final parses into TYPED
              // output even at the limit.
              req = applyStructuredOutputTier(req, rideTierFor(target), options.canonicalSchema);
            }
            if (req.tools !== undefined) {
              req = { ...req, toolChoice: 'none' };
            }
            const reserveMax = limits.finalizationReserve?.maxOutputTokens;
            if (reserveMax !== undefined) {
              req = {
                ...req,
                maxOutputTokens: Math.min(req.maxOutputTokens ?? reserveMax, reserveMax),
              };
            }
            return applyOutputBudget(req, target, options.budget);
          },
          streamOptionsFor: (target) => {
            const reserveStreamOptions: Parameters<typeof streamTurn>[2] = {
              idleTimeoutMs: limits.streamIdleTimeoutMs,
              signals: options.signal === undefined ? [] : [options.signal],
              onUsage: (delta) => options.budget?.onUsage(delta, target.resolved.ref),
            };
            if (options.budget?.signal !== undefined) {
              reserveStreamOptions.budgetSignal = options.budget.signal;
            }
            if (options.stream === true) {
              reserveStreamOptions.onDelta = (delta) =>
                events?.emit({ type: 'agent:stream', delta });
            }
            return reserveStreamOptions;
          },
        });
      } catch (thrown) {
        if (!(thrown instanceof BudgetExhaustedError)) {
          throw thrown;
        }
        events?.emit({
          type: 'log',
          level: 'warn',
          msg: `the finalization reserve turn was skipped: ${thrown.message}`,
        });
      }
      if (reserveDispatch !== undefined) {
        reserveSummaryRan = true;
        const { outcome, target: reserveTarget } = reserveDispatch;
        servedBy = reserveTarget.resolved.ref;
        usageApprox = usageApprox || outcome.usageApprox;
        messages.push(
          assistantMsg(
            outcome.turn,
            liftRetainedParts(outcome.providerMetadata, reserveTarget.adapter),
          ),
        );
        if (invariantViolation !== undefined) {
          status = 'error';
          agentError = { kind: 'transport', retryable: false };
          errorMessage = invariantViolation;
        } else if (outcome.aborted === 'external') {
          status = 'cancelled';
        } else if (outcome.aborted === 'budget') {
          status = 'cancelled';
          agentError = { kind: 'budget', retryable: false };
        } else {
          // The boundary pins the summary into the terminal checkpoint,
          // so a replayed result reads the same window (turns included).
          await saveBoundary();
          if (outcome.wireError !== undefined || outcome.aborted === 'idle') {
            events?.emit({
              type: 'log',
              level: 'warn',
              msg:
                'the finalization reserve turn failed; the limit terminal stands' +
                (outcome.wireError === undefined
                  ? ' (stream idle timeout)'
                  : ` (${outcome.wireError.message})`),
            });
          } else if (options.schema === undefined) {
            const summary = outcome.turn.text;
            if (summary.trim() !== '') {
              output = summary as Out<S>;
            }
          } else if (!separateExtract && options.canonicalSchema !== undefined) {
            // One attempt, no re-prompt: an invalid summary keeps the
            // transcript text without typed output.
            const candidate = extractCandidate(outcome.turn, rideTierFor(reserveTarget));
            if (candidate !== undefined) {
              const validation = await validateSchemaSpec(options.schema, candidate.raw);
              if (validation.valid) {
                output = validation.value;
              }
            }
          }
        }
      }
    }
  }

  // The primary phase closes here whatever ended it (a clean stop, a
  // limit, an escalation, an error): the pending-turn early paths that
  // skip the loop entirely still pass this point with a zero delta.
  endPhase(loopPhase, phaseOutcome(), servedBy);

  // Finalize synthesis invocation (role 'finalize', M4-T01): after tools
  // stop, one invocation with toolChoice 'none' over the full transcript
  // plus the deterministic synthesis instruction (request-only). Fires
  // only when routed AND tools were available; the ctx layer decides via
  // model/roles.ts and passes the option. Its text is the output for
  // schema-less calls; with a schema the separate extract below runs
  // over the transcript INCLUDING the synthesis.
  if (status === 'ok' && !finishedViaTool && options.finalize !== undefined) {
    const finalizeResolved = options.finalize.resolved;
    const finalizePhase = beginPhase('finalize', finalizeResolved.ref);
    let finalizeServed: ModelRef | undefined;
    let proceed = true;
    try {
      options.budget?.beforeTurn();
    } catch (thrown) {
      status = 'error';
      agentError = { kind: 'budget', retryable: false };
      errorMessage = thrown instanceof Error ? thrown.message : String(thrown);
      proceed = false;
    }
    if (proceed) {
      turns += 1;
      // The opt-in policy-facts digest (RV709): deterministic runtime
      // facts the loop observed, request-only exactly like the
      // instruction itself. Line inclusion follows CONFIGURATION (the
      // quota line when a limiter is wired, the budget line when a cap
      // or extension exists, the window line when one is configured),
      // so the digest shape is stable per config and only the numbers
      // move; the final model can cite the run's own live evidence
      // instead of underclaiming it.
      const policyFactsLines = (): string[] => {
        const lines = [
          'POLICY FACTS (request-only runtime digest): deterministic facts this run ' +
            'observed; cite the ones your answer relies on.',
        ];
        if (options.quota !== undefined) {
          lines.push(
            `quota: ${String(quotaDenials)} denial(s), ${String(quotaRecoveries)} recovered`,
          );
        }
        if (
          limits.maxToolCalls !== undefined ||
          limits.toolUnits !== undefined ||
          extension !== undefined
        ) {
          const cap = effectiveMaxToolCalls();
          let budgetLine =
            `tool budget: ${String(toolCallsUsed)}` +
            `${cap === undefined ? '' : ` of ${String(cap)}`} calls used`;
          if (extension !== undefined) {
            budgetLine += `; extensions granted: ${String(extensionGrants)}`;
          }
          lines.push(budgetLine);
        }
        if (windowConfigured) {
          lines.push(`finalization window: ${windowEntered ? 'entered' : 'not entered'}`);
        }
        const spend = recordedSpend();
        lines.push(
          `recorded spend: $${spend.usd.toFixed(4)} (${spend.basis})` +
            (spend.basis === 'aggregate-estimate'
              ? '; per-call records did not cover all usage, treat the number as an estimate'
              : ''),
        );
        return lines;
      };
      // The request-only synthesis message list: the durable transcript
      // (`messages`) keeps the raw history, so the extract phase and the
      // journal never see the instruction (or the digest).
      const synthesisMessages: Msg[] = [
        ...messages,
        ...(options.policyFacts === true
          ? [
              {
                role: 'user',
                parts: [{ type: 'text', text: policyFactsLines().join('\n') }],
              } as Msg,
            ]
          : []),
        {
          role: 'user',
          parts: [{ type: 'text', text: FINALIZE_SYNTHESIS_INSTRUCTION }],
        },
      ];
      let finalizeDispatch: Awaited<ReturnType<typeof dispatchPhase>> | undefined;
      try {
        finalizeDispatch = await dispatchPhase({
          role: 'finalize',
          chain: [
            { adapter: options.finalize.adapter, resolved: options.finalize.resolved },
            ...(options.finalize.fallbacks ?? []),
          ],
          cursor: { index: 0 },
          requestFor: (target) =>
            applyOutputBudget(
              {
                ...buildRequest(
                  target.resolved,
                  projectHistory(synthesisMessages, providerOf(target.adapter)),
                  limits,
                  options.tools?.contracts,
                ),
                toolChoice: 'none',
              },
              target,
              options.budget,
            ),
          streamOptionsFor: (target) => {
            const finalizeStreamOptions: Parameters<typeof streamTurn>[2] = {
              idleTimeoutMs: limits.streamIdleTimeoutMs,
              signals: options.signal === undefined ? [] : [options.signal],
              onUsage: (delta) => options.budget?.onUsage(delta, target.resolved.ref),
            };
            if (options.budget?.signal !== undefined) {
              finalizeStreamOptions.budgetSignal = options.budget.signal;
            }
            if (options.stream === true) {
              finalizeStreamOptions.onDelta = (delta) =>
                events?.emit({ type: 'agent:stream', delta });
            }
            return finalizeStreamOptions;
          },
        });
      } catch (thrown) {
        if (!(thrown instanceof BudgetExhaustedError)) {
          throw thrown;
        }
        status = 'error';
        agentError = { kind: 'budget', retryable: false };
        errorMessage = thrown.message;
      }
      if (finalizeDispatch !== undefined) {
        const { outcome, target: finalizeTarget } = finalizeDispatch;
        finalizeServed = finalizeTarget.resolved.ref;
        usageApprox = usageApprox || outcome.usageApprox;
        messages.push(
          assistantMsg(
            outcome.turn,
            liftRetainedParts(outcome.providerMetadata, finalizeTarget.adapter),
          ),
        );
        if (invariantViolation !== undefined) {
          status = 'error';
          agentError = { kind: 'transport', retryable: false };
          errorMessage = invariantViolation;
        } else if (outcome.aborted !== undefined || outcome.wireError !== undefined) {
          status = outcome.aborted === 'external' ? 'cancelled' : 'error';
          if (outcome.wireError !== undefined) {
            agentError = classifyWireError(outcome.wireError);
            errorMessage = outcome.wireError.message;
          } else if (outcome.aborted === 'budget') {
            status = 'cancelled';
            agentError = { kind: 'budget', retryable: false };
          } else if (outcome.aborted === 'idle') {
            status = 'error';
            agentError = { kind: 'transport', retryable: true };
            errorMessage = `stream idle for ${limits.streamIdleTimeoutMs}ms`;
          }
        } else if (
          outcome.finish?.reason === 'refusal' ||
          outcome.finish?.reason === 'context-window-exceeded'
        ) {
          status = 'error';
          agentError = { kind: 'terminal', retryable: false };
          if (outcome.finish.reason === 'refusal') {
            errorMessage = `model refusal (${outcome.finish.refusal.provider})`;
          }
        } else if (
          options.schema === undefined &&
          outcome.finish?.reason === 'max-tokens' &&
          outcome.turn.text.trim() === ''
        ) {
          // The synthesis IS the schema-less answer, so an empty
          // truncated synthesis is the same bounded failure as an empty
          // truncated loop turn (v1.9.0 follow-up review).
          status = 'limit';
          abortClass = 'output-truncated';
          agentError = { kind: 'terminal', retryable: false };
          errorMessage = outputTruncatedMessage('finalize invocation');
        } else if (options.schema === undefined) {
          // The synthesis is the final answer for schema-less calls; a
          // schema-bearing call reads its output from the extract phase.
          // A non-truncated EMPTY synthesis never erases the loop turn's
          // text: the loop answer stands (v1.18.0 review P1-1; the
          // truncated-empty case above stays a bounded failure because
          // falling back would mask a too-small output cap).
          const synthesis = outcome.turn.text;
          if (synthesis.trim() !== '') {
            output = synthesis as Out<S>;
          }
        }
      }
    }
    endPhase(finalizePhase, phaseOutcome(), finalizeServed);
  }

  // Separate extract invocation (role 'extract'): one structured-output
  // call over the loop transcript, on the extract-resolved model.
  if (
    status === 'ok' &&
    !finishedViaTool &&
    separateExtract &&
    options.extract !== undefined &&
    options.schema !== undefined
  ) {
    const extractResolved = options.extract.resolved;
    const extractPhase = beginPhase('extract', extractResolved.ref);
    let extractServed: ModelRef | undefined;
    // The extract tier follows the SERVING model's caps; forced-tool is
    // legitimate here (the pinned emit_result IS the mechanism).
    const extractTierFor = (target: PhaseTarget): StructuredOutputTier =>
      selectStructuredOutputTier(
        target.adapter.caps(target.resolved.model),
        options.canonicalSchema ?? {},
      );
    const extractChain: PhaseTarget[] = [
      { adapter: options.extract.adapter, resolved: options.extract.resolved },
      ...(options.extract.fallbacks ?? []),
    ];
    const extractCursor = { index: 0 };
    let extractAttempts = 0;
    const extractMessages: Msg[] = [
      ...messages,
      {
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Extract the final structured result from the conversation above.',
          },
        ],
      },
    ];
    while (status === 'ok') {
      try {
        options.budget?.beforeTurn();
      } catch (thrown) {
        status = 'error';
        agentError = { kind: 'budget', retryable: false };
        errorMessage = thrown instanceof Error ? thrown.message : String(thrown);
        break;
      }
      turns += 1;
      let extractDispatch: Awaited<ReturnType<typeof dispatchPhase>>;
      try {
        extractDispatch = await dispatchPhase({
          role: 'extract',
          chain: extractChain,
          cursor: extractCursor,
          requestFor: (target) => {
            // A tool-bearing transcript must carry the tool contracts:
            // both providers reject tool-use history without tool
            // definitions. The forced-tool tier pins toolChoice to
            // emit_result; the other tiers pin 'none' so the extract call
            // cannot re-enter tools (M4-T01).
            const targetTier = extractTierFor(target);
            let req = buildRequest(
              target.resolved,
              projectHistory(extractMessages, providerOf(target.adapter)),
              limits,
              options.tools?.contracts,
            );
            if (req.tools !== undefined && targetTier !== 'forced-tool') {
              req = { ...req, toolChoice: 'none' };
            }
            req = applyStructuredOutputTier(req, targetTier, options.canonicalSchema ?? {});
            return applyOutputBudget(req, target, options.budget);
          },
          streamOptionsFor: (target) => {
            const extractStreamOptions: Parameters<typeof streamTurn>[2] = {
              idleTimeoutMs: limits.streamIdleTimeoutMs,
              signals: options.signal === undefined ? [] : [options.signal],
              onUsage: (delta) => options.budget?.onUsage(delta, target.resolved.ref),
            };
            if (options.budget?.signal !== undefined) {
              extractStreamOptions.budgetSignal = options.budget.signal;
            }
            return extractStreamOptions;
          },
        });
      } catch (thrown) {
        if (!(thrown instanceof BudgetExhaustedError)) {
          throw thrown;
        }
        status = 'error';
        agentError = { kind: 'budget', retryable: false };
        errorMessage = thrown.message;
        break;
      }
      const { outcome, target: extractTarget } = extractDispatch;
      extractServed = extractTarget.resolved.ref;
      usageApprox = usageApprox || outcome.usageApprox;
      if (invariantViolation !== undefined) {
        status = 'error';
        agentError = { kind: 'transport', retryable: false };
        break;
      }
      extractMessages.push(
        assistantMsg(
          outcome.turn,
          liftRetainedParts(outcome.providerMetadata, extractTarget.adapter),
        ),
      );
      if (outcome.aborted !== undefined || outcome.wireError !== undefined) {
        status = outcome.aborted === 'external' ? 'cancelled' : 'error';
        if (outcome.wireError !== undefined) {
          agentError = classifyWireError(outcome.wireError);
        } else if (outcome.aborted === 'budget') {
          status = 'cancelled';
          agentError = { kind: 'budget', retryable: false };
        }
        break;
      }
      const candidate = extractCandidate(outcome.turn, extractTierFor(extractTarget));
      if (candidate !== undefined) {
        const validation = await validateSchemaSpec(options.schema, candidate.raw);
        if (validation.valid) {
          output = validation.value;
          break;
        }
        extractAttempts += 1;
        if (extractAttempts >= maxSchemaAttempts) {
          status = 'error';
          agentError = { kind: 'schema-mismatch', retryable: false, issues: validation.issues };
          break;
        }
        extractMessages.push(
          formatRePrompt(validation.issues, extractAttempts, maxSchemaAttempts - 1),
        );
      } else {
        extractAttempts += 1;
        if (extractAttempts >= maxSchemaAttempts) {
          status = 'error';
          agentError = {
            kind: 'schema-mismatch',
            retryable: false,
            issues: [{ message: 'no JSON value found in the extract response' }],
          };
          break;
        }
      }
    }
    endPhase(extractPhase, phaseOutcome(), extractServed);
  }

  // The evidence floor becomes binding at the terminal under
  // enforce: 'refuse' (RV507): an ok settle short of the declared floor
  // is refused as a typed terminal error. The count is window-derived
  // exactly like the terminal partial below (successful record_evidence
  // executions: result `recorded: true`, so duplicates and verification
  // errors never satisfy the floor), which makes live and resumed
  // segments count the same total; the refusal detail rides the result
  // for the ctx layer to journal and memoize. Non-ok terminals are
  // never re-judged, and 'warn' keeps the preflight-only behavior.
  const evidenceFloor = options.evidenceContract;
  // Counted once under a DECLARED contract, for every terminal status
  // (RV806): the refusal below judges it, and the settled result
  // carries it as the machine verdict the acceptance summary reads.
  // The same counter the RV809 deficit trigger reads at boundaries.
  const recordedEvidenceEntries =
    evidenceFloor === undefined ? undefined : countRecordedEvidence(messages);
  let evidenceRefusal: { recordedEntries: number; minEntries: number } | undefined;
  if (evidenceFloor?.enforce === 'refuse' && status === 'ok') {
    const recordedEntries = recordedEvidenceEntries ?? 0;
    if (recordedEntries < evidenceFloor.minEntries) {
      status = 'error';
      output = null;
      evidenceRefusal = { recordedEntries, minEntries: evidenceFloor.minEntries };
      agentError = { kind: 'terminal', retryable: false };
      errorMessage =
        `evidence contract unmet: ${String(recordedEntries)} of ` +
        `${String(evidenceFloor.minEntries)} required evidence entries recorded`;
    }
  }

  // The structured terminal partial (RV-210 close-out): a 'limit'
  // terminal keeps the last successful progress report. The extra final
  // boundary checkpoint (written ONLY when a report exists, so runs
  // without the tool stay byte-identical) pins the exact message window,
  // making the replayed partial identical to the live one.
  const limitPartial = status === 'limit' ? latestProgressReport(messages) : undefined;
  if (limitPartial !== undefined) {
    await saveBoundary();
  }

  // Persist the canonical transcript; the journal stays small.
  let transcriptRef = '';
  if (options.transcript !== undefined) {
    transcriptRef = options.transcript.mintRef();
    const blob = new TextEncoder().encode(JSON.stringify({ messages }));
    await options.transcript.put(transcriptRef, blob);
  }

  const spend = recordedSpend();
  const result: AgentResult<Out<S>> = {
    status,
    output: status === 'ok' ? output : (output ?? null),
    usage: totalUsage,
    costUsd: spend.usd,
    costBasis: spend.basis,
    turns,
    servedBy,
    transcriptRef,
  };
  // Carried only when the call genuinely spanned (role, model) pairs: a
  // single-phase single-model call is already described exactly by
  // (usage, servedBy, costAttribution.role), and keeping the field
  // absent leaves those journals byte-identical to before.
  if (usageByPhaseModel.size > 1) {
    result.usageByModel = usageSlices();
  }
  // The evidence verdict (RV806): present exactly when a contract was
  // declared, on every terminal status.
  if (evidenceFloor !== undefined && recordedEvidenceEntries !== undefined) {
    result.evidence = {
      recordedEntries: recordedEvidenceEntries,
      minEntries: evidenceFloor.minEntries,
      met: recordedEvidenceEntries >= evidenceFloor.minEntries,
    };
  }
  // The recorded entry content (the RV1501 entries plumbing): present
  // whenever the window carries successful executions, contract or
  // not, so the claim pools can pair against it; runs without
  // record_evidence stay byte identical.
  const collectedEvidence = collectRecordedEvidence(messages);
  if (collectedEvidence.length > 0) {
    result.evidenceEntries = collectedEvidence;
  }
  // The reconciliation ledger (P1.3): present whenever the invocation
  // made (or restored) at least one wire call; a fully replayed
  // invocation made none and carries none.
  if (providerCalls.length > 0) {
    result.providerCalls = providerCalls;
  }
  if (agentError !== undefined) {
    result.error = agentError;
  }
  if (escalationRequest !== undefined) {
    result.escalationRequest = escalationRequest;
  }
  if (abortClass !== undefined) {
    result.abortClass = abortClass;
  }
  if (errorMessage !== undefined) {
    result.errorMessage = errorMessage;
  }
  if (guard !== undefined) {
    result.exploration = guard.summary(toolCallsUsed);
  }
  // The pressure snapshot (RV304): present exactly when a tool budget
  // limiter, the extension, or the turns reserve (RV1405: pressure
  // configuration too, and finalizationWindowEntered needs a home in a
  // turns-only run) is configured, so unbounded loops (and every
  // pre-existing envelope) stay byte identical.
  if (
    limits.maxToolCalls !== undefined ||
    limits.toolUnits !== undefined ||
    extension !== undefined ||
    finalizationTurns !== undefined
  ) {
    const toolBudget: ToolBudgetSummary = { used: toolCallsUsed };
    const cap = effectiveMaxToolCalls();
    if (cap !== undefined) {
      toolBudget.cap = cap;
    }
    if (limits.toolUnits !== undefined) {
      toolBudget.unitsUsed = guard?.summary(toolCallsUsed).toolUnitsUsed ?? 0;
      toolBudget.unitsMax = limits.toolUnits.max;
    }
    if (extension !== undefined) {
      toolBudget.extensionsGranted = extensionGrants;
    }
    if (firedNotices.size > 0) {
      toolBudget.noticesFired = [...firedNotices].sort((a, b) => a - b);
    }
    if (reserveSummaryRan) {
      toolBudget.finalizationReserveUsed = true;
    }
    if (windowEntered) {
      toolBudget.finalizationWindowEntered = true;
    }
    if (limitLimiter !== undefined) {
      toolBudget.limiter = limitLimiter;
    }
    result.toolBudget = toolBudget;
  }
  if (limitPartial !== undefined) {
    result.partial = limitPartial;
  }
  // Window-derived exactly like the repair-reserve grants above: an
  // error result named after the terminal tool and carrying the
  // interception's own rejection line is a schema-dead exchange.
  const terminalName = options.terminalTool?.name;
  const schemaRejectedTerminalExchanges =
    terminalName === undefined
      ? 0
      : messages.reduce(
          (count, message) =>
            count +
            message.parts.filter(
              (part) =>
                part.type === 'tool-result' &&
                part.name === terminalName &&
                (part as { isError?: boolean }).isError === true &&
                (part.result as { error?: unknown } | undefined)?.error ===
                  terminalSchemaRejectionMessage(terminalName),
            ).length,
          0,
        );
  if (schemaRejectedTerminalExchanges > 0) {
    result.schemaRejectedTerminalExchanges = schemaRejectedTerminalExchanges;
  }
  if (schemaRecoveredTerminalExchanges > 0) {
    result.schemaRecoveredTerminalExchanges = schemaRecoveredTerminalExchanges;
  }
  if (evidenceRefusal !== undefined) {
    result.evidenceFloor = evidenceRefusal;
  }
  if (usageApprox) {
    (result as { usageApprox?: boolean }).usageApprox = true;
  }
  if (transportRetries > 0) {
    result.transportRetries = transportRetries;
  }
  if (quotaDenials > 0) {
    // Live telemetry only, the transportRetries rule (RV1510): never
    // journaled, absent on a replayed result, and absent means "zero
    // or unknown". The split is what keeps the namespaces honest: the
    // seventeenth comparison benchmark exported one conflated number
    // and 17 pre-wire denials read as 17 provider retries.
    result.quotaDenials = {
      total: quotaDenials,
      requests: quotaDenialsRequests,
      tokens: quotaDenialsTokens,
      recovered: quotaRecoveries,
    };
  }
  if (rateLimitObservations.size > 0) {
    result.rateLimitObservations = [...rateLimitObservations.values()];
  }
  // agent:end (with entryRef) is emitted by the ctx layer after the
  // terminal journal entry is appended.
  return result;
}
