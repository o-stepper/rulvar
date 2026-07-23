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
}
