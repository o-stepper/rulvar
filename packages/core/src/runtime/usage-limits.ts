/**
 * UsageLimits (M1-T06): normative limit vocabulary and the per-spawn merge.
 *
 * Full contract: https://docs.rulvar.com/guide/agents. Expiry of maxTurns, maxToolCalls,
 * or timeoutMs produces the terminal status 'limit' (paid partial work);
 * streamIdleTimeoutMs expiry is a retryable transport-class AgentError,
 * never 'limit'. The run-level deadline is RunOptions.deadlineAt, not a
 * UsageLimits field.
 */
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
  return merged;
}
