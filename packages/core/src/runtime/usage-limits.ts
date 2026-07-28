/**
 * UsageLimits (M1-T06): normative limit vocabulary and the per-spawn merge.
 *
 * Full contract: https://docs.rulvar.com/guide/agents. Expiry of maxTurns, maxToolCalls,
 * or timeoutMs produces the terminal status 'limit' (paid partial work);
 * streamIdleTimeoutMs expiry is a retryable transport-class AgentError,
 * never 'limit'. The run-level deadline is RunOptions.deadlineAt, not a
 * UsageLimits field.
 */
import { ConfigError } from '../l0/errors.js';
import {
  requireNonNegativeInteger,
  requirePositiveInteger,
  requireTimerDelayMs,
} from '../l0/validate-numbers.js';
export interface UsageLimits {
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
  toolUnits?: { max: number; costs?: Record<string, number> };
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
  finalizationReserve?: { maxOutputTokens?: number };
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
   * exact new counts, so pacing stays possible; on resume the grants
   * re-derive conservatively from the restored executed-call count.
   * Extends maxToolCalls only, never toolUnits. Off by default: the
   * grant notices enter the conversation, so enabling it changes
   * recorded model requests.
   */
  toolBudgetExtension?: {
    /** Executed calls added per grant. */
    increment: number;
    /** Hard bound on grants per invocation. */
    maxExtensions: number;
    /** Grant only at or above this remaining chain headroom, in USD. */
    minHeadroomUsd?: number;
    /** Default true: a grant needs new evidence since the last one. */
    requireNewEvidence?: boolean;
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
   * window binds only when the extension is exhausted or denied. Off by
   * default: the refusals and the notice enter the conversation, so
   * enabling it changes recorded model requests.
   */
  finalizationWindow?: {
    /** How many trailing executed calls (or units) the window reserves. */
    reserveCalls: number;
    /** Tool names allowed inside the window; default: zero-cost tools. */
    allow?: string[];
  };
}

export const DEFAULT_MAX_TURNS = 32;
export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 120_000;

export interface EffectiveUsageLimits {
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
  toolUnits?: { max: number; costs?: Record<string, number> };
  /** RV408 mid-batch checkpoint cadence; absent = per-turn only. */
  checkpointEveryToolCalls?: number;
  finalizationReserve?: { maxOutputTokens?: number };
  toolBudgetExtension?: {
    increment: number;
    maxExtensions: number;
    minHeadroomUsd?: number;
    requireNewEvidence?: boolean;
  };
  finalizationWindow?: {
    reserveCalls: number;
    allow?: string[];
  };
}

/**
 * Limits merge per spawn: AgentOpts.limits over profile limits over engine
 * defaults.limits.
 */
export function mergeUsageLimits(
  call?: UsageLimits,
  profile?: UsageLimits,
  engine?: UsageLimits,
): EffectiveUsageLimits {
  const pick = <K extends keyof UsageLimits>(key: K): UsageLimits[K] =>
    call?.[key] ?? profile?.[key] ?? engine?.[key];
  const merged: EffectiveUsageLimits = {
    maxTurns: pick('maxTurns') ?? DEFAULT_MAX_TURNS,
    streamIdleTimeoutMs: pick('streamIdleTimeoutMs') ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  };
  const maxToolCalls = pick('maxToolCalls');
  if (maxToolCalls !== undefined) {
    merged.maxToolCalls = maxToolCalls;
  }
  const maxOutputTokensPerTurn = pick('maxOutputTokensPerTurn');
  if (maxOutputTokensPerTurn !== undefined) {
    merged.maxOutputTokensPerTurn = maxOutputTokensPerTurn;
  }
  const timeoutMs = pick('timeoutMs');
  if (timeoutMs !== undefined) {
    merged.timeoutMs = timeoutMs;
  }
  const noProgressTurns = pick('noProgressTurns');
  if (noProgressTurns !== undefined) {
    merged.noProgressTurns = noProgressTurns;
  }
  const toolBudgetNotices = pick('toolBudgetNotices');
  if (toolBudgetNotices !== undefined) {
    merged.toolBudgetNotices = toolBudgetNotices;
  }
  const maxRepeatedToolSignature = pick('maxRepeatedToolSignature');
  if (maxRepeatedToolSignature !== undefined) {
    merged.maxRepeatedToolSignature = maxRepeatedToolSignature;
  }
  const maxNoNewEvidenceCalls = pick('maxNoNewEvidenceCalls');
  if (maxNoNewEvidenceCalls !== undefined) {
    merged.maxNoNewEvidenceCalls = maxNoNewEvidenceCalls;
  }
  const maxCallsPerTool = pick('maxCallsPerTool');
  if (maxCallsPerTool !== undefined) {
    merged.maxCallsPerTool = maxCallsPerTool;
  }
  const toolUnits = pick('toolUnits');
  if (toolUnits !== undefined) {
    merged.toolUnits = toolUnits;
  }
  const checkpointEveryToolCalls = pick('checkpointEveryToolCalls');
  if (checkpointEveryToolCalls !== undefined) {
    merged.checkpointEveryToolCalls = checkpointEveryToolCalls;
  }
  const finalizationReserve = pick('finalizationReserve');
  if (finalizationReserve !== undefined) {
    merged.finalizationReserve = finalizationReserve;
  }
  const toolBudgetExtension = pick('toolBudgetExtension');
  if (toolBudgetExtension !== undefined) {
    merged.toolBudgetExtension = toolBudgetExtension;
  }
  const finalizationWindow = pick('finalizationWindow');
  if (finalizationWindow !== undefined) {
    merged.finalizationWindow = finalizationWindow;
  }
  return merged;
}

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
export function validateUsageLimits(limits: UsageLimits, site: string): void {
  if (limits.maxTurns !== undefined) {
    requirePositiveInteger(limits.maxTurns, `${site}.maxTurns`);
  }
  if (limits.maxToolCalls !== undefined) {
    requireNonNegativeInteger(limits.maxToolCalls, `${site}.maxToolCalls`);
  }
  if (limits.maxOutputTokensPerTurn !== undefined) {
    requirePositiveInteger(limits.maxOutputTokensPerTurn, `${site}.maxOutputTokensPerTurn`);
  }
  if (limits.timeoutMs !== undefined) {
    requirePositiveInteger(limits.timeoutMs, `${site}.timeoutMs`);
  }
  if (limits.streamIdleTimeoutMs !== undefined) {
    requireTimerDelayMs(limits.streamIdleTimeoutMs, `${site}.streamIdleTimeoutMs`);
  }
  if (limits.noProgressTurns !== undefined) {
    requirePositiveInteger(limits.noProgressTurns, `${site}.noProgressTurns`);
  }
  if (limits.toolBudgetNotices !== undefined && typeof limits.toolBudgetNotices !== 'boolean') {
    throw new ConfigError(
      `${site}.toolBudgetNotices must be a boolean; got ${typeof limits.toolBudgetNotices}`,
    );
  }
  if (limits.maxRepeatedToolSignature !== undefined) {
    requirePositiveInteger(limits.maxRepeatedToolSignature, `${site}.maxRepeatedToolSignature`);
  }
  if (limits.maxNoNewEvidenceCalls !== undefined) {
    requirePositiveInteger(limits.maxNoNewEvidenceCalls, `${site}.maxNoNewEvidenceCalls`);
  }
  if (limits.maxCallsPerTool !== undefined) {
    const caps: unknown = limits.maxCallsPerTool;
    if (typeof caps !== 'object' || caps === null || Array.isArray(caps)) {
      throw new ConfigError(`${site}.maxCallsPerTool must be a record of per-tool caps`);
    }
    for (const [name, cap] of Object.entries(caps as Record<string, unknown>)) {
      requireNonNegativeInteger(cap as number, `${site}.maxCallsPerTool['${name}']`);
    }
  }
  if (limits.toolUnits !== undefined) {
    const units: unknown = limits.toolUnits;
    if (typeof units !== 'object' || units === null || Array.isArray(units)) {
      throw new ConfigError(`${site}.toolUnits must be { max, costs? }`);
    }
    const { max, costs } = units as { max?: unknown; costs?: unknown };
    requirePositiveInteger(max as number, `${site}.toolUnits.max`);
    if (costs !== undefined) {
      if (typeof costs !== 'object' || costs === null || Array.isArray(costs)) {
        throw new ConfigError(`${site}.toolUnits.costs must be a record of per-tool costs`);
      }
      for (const [name, cost] of Object.entries(costs as Record<string, unknown>)) {
        requireNonNegativeInteger(cost as number, `${site}.toolUnits.costs['${name}']`);
      }
    }
  }
  if (limits.checkpointEveryToolCalls !== undefined) {
    requirePositiveInteger(limits.checkpointEveryToolCalls, `${site}.checkpointEveryToolCalls`);
  }
  if (limits.finalizationReserve !== undefined) {
    const reserve: unknown = limits.finalizationReserve;
    if (typeof reserve !== 'object' || reserve === null || Array.isArray(reserve)) {
      throw new ConfigError(`${site}.finalizationReserve must be { maxOutputTokens? }`);
    }
    const { maxOutputTokens } = reserve as { maxOutputTokens?: unknown };
    if (maxOutputTokens !== undefined) {
      requirePositiveInteger(
        maxOutputTokens as number,
        `${site}.finalizationReserve.maxOutputTokens`,
      );
    }
  }
  if (limits.toolBudgetExtension !== undefined) {
    const extension: unknown = limits.toolBudgetExtension;
    if (typeof extension !== 'object' || extension === null || Array.isArray(extension)) {
      throw new ConfigError(
        `${site}.toolBudgetExtension must be ` +
          `{ increment, maxExtensions, minHeadroomUsd?, requireNewEvidence? }`,
      );
    }
    const { increment, maxExtensions, minHeadroomUsd, requireNewEvidence } = extension as {
      increment?: unknown;
      maxExtensions?: unknown;
      minHeadroomUsd?: unknown;
      requireNewEvidence?: unknown;
    };
    requirePositiveInteger(increment as number, `${site}.toolBudgetExtension.increment`);
    requirePositiveInteger(maxExtensions as number, `${site}.toolBudgetExtension.maxExtensions`);
    if (
      minHeadroomUsd !== undefined &&
      (typeof minHeadroomUsd !== 'number' || !Number.isFinite(minHeadroomUsd) || minHeadroomUsd < 0)
    ) {
      throw new ConfigError(
        `${site}.toolBudgetExtension.minHeadroomUsd must be a finite nonnegative USD amount, ` +
          `got ${typeof minHeadroomUsd === 'number' ? String(minHeadroomUsd) : typeof minHeadroomUsd}`,
      );
    }
    if (requireNewEvidence !== undefined && typeof requireNewEvidence !== 'boolean') {
      throw new ConfigError(
        `${site}.toolBudgetExtension.requireNewEvidence must be a boolean; ` +
          `got ${typeof requireNewEvidence}`,
      );
    }
  }
  if (limits.finalizationWindow !== undefined) {
    const window: unknown = limits.finalizationWindow;
    if (typeof window !== 'object' || window === null || Array.isArray(window)) {
      throw new ConfigError(`${site}.finalizationWindow must be { reserveCalls, allow? }`);
    }
    const { reserveCalls, allow } = window as { reserveCalls?: unknown; allow?: unknown };
    requirePositiveInteger(reserveCalls as number, `${site}.finalizationWindow.reserveCalls`);
    if (allow !== undefined) {
      if (!Array.isArray(allow)) {
        throw new ConfigError(`${site}.finalizationWindow.allow must be an array of tool names`);
      }
      for (const [index, name] of allow.entries()) {
        if (typeof name !== 'string' || name.length === 0) {
          throw new ConfigError(
            `${site}.finalizationWindow.allow[${String(index)}] must be a nonempty tool name`,
          );
        }
      }
    }
  }
}
