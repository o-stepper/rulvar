/**
 * Exploration guards (RV-210, first slice): the engine-side counters that
 * make an oscillating tool loop visible and boundable. The published gap:
 * an agent that repeats the byte-identical tool call, or keeps receiving
 * pages it has already seen, burns its whole tool budget with zero signal
 * and dies as a bare 'limit' terminal; the no-progress detector never
 * trips because tool calls reset it.
 *
 * Three opt-in UsageLimits fields drive this module:
 *
 * - `maxRepeatedToolSignature`: how many times the SAME signature (tool
 *   name + RFC 8785 canonical args) may execute per invocation. The call
 *   that would exceed it is not dispatched; the model receives a typed
 *   error tool result instead (visible, bounded, never terminal), and the
 *   denial does not consume the tool budget.
 * - `maxNoNewEvidenceCalls`: how many consecutive successful executions
 *   may return only already-seen result digests before the loop aborts as
 *   status 'limit' with abortClass 'exploration' (paid partial work; the
 *   executed results stand and the terminal memoizes like every
 *   engine-decided abort).
 * - `toolBudgetNotices`: soft 50%/80% thresholds over `maxToolCalls`,
 *   surfaced to the model as a plain user message with the exact
 *   remaining count, so pacing is possible before the hard cap.
 *
 * Determinism: signatures and digests derive from the canonical JCS
 * serialization; values JCS cannot serialize never match anything (a
 * unique signature; a fresh-evidence result), so the guards fail open,
 * never spuriously. On resume the guard state is rebuilt from the
 * restored checkpoint messages (successful executions only, and only the
 * window a compaction kept), which is the same source the model itself
 * sees; enforcement is engine-side and live-only, while a replayed
 * guard abort is re-stamped from the journaled terminal like every other
 * abort class.
 */
import { createHash } from 'node:crypto';

import type { ExplorationSummary } from '../l0/events.js';
import { jcsSerialize } from '../l0/jcs.js';
import type { Msg } from '../l0/messages.js';

/** The docs anchor cited by guard denials and the guard abort. */
const GUARD_DOCS_URL = 'https://docs.rulvar.com/guide/agents#exploration-guards';

export type { ExplorationSummary } from '../l0/events.js';

/** The guard's per-call verdict before dispatch. */
export type ExplorationVerdict =
  | { deny: false }
  | {
      deny: true;
      /** Which guard denied: the tool:end and error-result marker. */
      guard: 'repeated-signature' | 'per-tool-cap';
      reason: string;
      executions: number;
    };

/** The subset of UsageLimits the guard consumes. */
export interface ExplorationGuardConfig {
  maxRepeatedToolSignature?: number;
  maxNoNewEvidenceCalls?: number;
  maxCallsPerTool?: Record<string, number>;
  toolUnits?: { max: number; costs?: Record<string, number> };
}

/** True when any exploration guard field asks for tracking. */
export function explorationTrackingEnabled(limits: {
  maxRepeatedToolSignature?: number;
  maxNoNewEvidenceCalls?: number;
  toolBudgetNotices?: boolean;
  maxCallsPerTool?: Record<string, number>;
  toolUnits?: { max: number; costs?: Record<string, number> };
}): boolean {
  return (
    limits.maxRepeatedToolSignature !== undefined ||
    limits.maxNoNewEvidenceCalls !== undefined ||
    limits.toolBudgetNotices === true ||
    limits.maxCallsPerTool !== undefined ||
    limits.toolUnits !== undefined
  );
}

function digestOf(value: unknown): string | undefined {
  try {
    return createHash('sha256').update(jcsSerialize(value), 'utf8').digest('hex');
  } catch {
    return undefined;
  }
}

export class ExplorationGuard {
  private readonly config: ExplorationGuardConfig;
  private readonly signatureExecutions = new Map<string, number>();
  private readonly seenDigests = new Set<string>();
  private readonly byTool = new Map<string, number>();
  private noNewEvidenceStreak = 0;
  private executed = 0;
  private repeated = 0;
  private duplicateResults = 0;
  private denied = 0;
  private deniedToolCap = 0;
  private unitsUsed = 0;
  private unserializableSeq = 0;

  constructor(config: ExplorationGuardConfig) {
    this.config = config;
  }

  /**
   * The canonical signature: tool name + JCS args. Args JCS cannot
   * serialize get a unique per-occurrence signature, so they never
   * repeat and the guard fails open.
   */
  private signatureOf(name: string, args: unknown): string {
    try {
      return `${name}\u0000${jcsSerialize(args ?? null)}`;
    } catch {
      this.unserializableSeq += 1;
      return `${name}\u0000<unserializable:${String(this.unserializableSeq)}>`;
    }
  }

  /**
   * Rebuilds guard state from restored checkpoint messages: assistant
   * tool-call parts paired with their successful tool results by id.
   * Error results (denials, tool failures) are skipped, so a resume
   * never over-counts; a compaction naturally narrows the window to
   * what the model itself still sees.
   */
  restore(messages: readonly Msg[]): void {
    const callsById = new Map<string, { name: string; args: unknown }>();
    for (const msg of messages) {
      for (const part of msg.parts) {
        if (part.type === 'tool-call') {
          callsById.set(part.id, { name: part.name, args: part.args });
        } else if (part.type === 'tool-result' && part.isError !== true) {
          const call = callsById.get(part.id);
          if (call === undefined) {
            continue;
          }
          this.recordExecution(call.name, call.args, part.result, true);
        }
      }
    }
  }

  /**
   * The pre-dispatch verdict: denies the call that would exceed its
   * tool's maxCallsPerTool cap, then the call that would exceed
   * maxRepeatedToolSignature executions of the same signature. A denial
   * never consumes maxToolCalls or tool units.
   */
  beforeExecute(name: string, args: unknown): ExplorationVerdict {
    const cap = this.config.maxCallsPerTool?.[name];
    if (cap !== undefined) {
      const executions = this.byTool.get(name) ?? 0;
      if (executions >= cap) {
        this.deniedToolCap += 1;
        return {
          deny: true,
          guard: 'per-tool-cap',
          executions,
          reason:
            `exploration guard: '${name}' already executed ${String(executions)} time(s) ` +
            `this invocation (maxCallsPerTool ${String(cap)}). Use what you have or a ` +
            `different tool (${GUARD_DOCS_URL}).`,
        };
      }
    }
    const max = this.config.maxRepeatedToolSignature;
    if (max === undefined) {
      return { deny: false };
    }
    const executions = this.signatureExecutions.get(this.signatureOf(name, args)) ?? 0;
    if (executions < max) {
      return { deny: false };
    }
    this.denied += 1;
    return {
      deny: true,
      guard: 'repeated-signature',
      executions,
      reason:
        `exploration guard: this exact '${name}' call already executed ` +
        `${String(executions)} time(s) this invocation (maxRepeatedToolSignature ` +
        `${String(max)}). Reuse the earlier result or change the arguments ` +
        `(${GUARD_DOCS_URL}).`,
    };
  }

  /**
   * Records one dispatched execution and answers whether the
   * no-new-evidence guard trips. Only successful results feed the
   * evidence chain: an error result neither resets nor lengthens it
   * (repeated failing calls are the signature guard's job), and a
   * result JCS cannot digest counts as fresh evidence.
   */
  afterExecute(name: string, args: unknown, result: unknown, isError: boolean): boolean {
    return this.recordExecution(name, args, result, !isError);
  }

  private recordExecution(
    name: string,
    args: unknown,
    result: unknown,
    successful: boolean,
  ): boolean {
    this.executed += 1;
    this.byTool.set(name, (this.byTool.get(name) ?? 0) + 1);
    if (this.config.toolUnits !== undefined) {
      this.unitsUsed += this.config.toolUnits.costs?.[name] ?? 1;
    }
    const signature = this.signatureOf(name, args);
    const prior = this.signatureExecutions.get(signature) ?? 0;
    if (prior > 0) {
      this.repeated += 1;
    }
    this.signatureExecutions.set(signature, prior + 1);
    if (!successful) {
      return false;
    }
    const digest = digestOf(result);
    if (digest === undefined || !this.seenDigests.has(digest)) {
      if (digest !== undefined) {
        this.seenDigests.add(digest);
      }
      this.noNewEvidenceStreak = 0;
      return false;
    }
    this.duplicateResults += 1;
    this.noNewEvidenceStreak += 1;
    const max = this.config.maxNoNewEvidenceCalls;
    return max !== undefined && this.noNewEvidenceStreak >= max;
  }

  /**
   * True once the spent tool units reached the weighted budget: the
   * loop's pre-dispatch check, mirroring maxToolCalls (terminal 'limit',
   * paid partial work). Never true without toolUnits configured.
   */
  unitsExhausted(): boolean {
    return this.config.toolUnits !== undefined && this.unitsUsed >= this.config.toolUnits.max;
  }

  /** The abort message for a tripped no-new-evidence guard. */
  describeTrip(): string {
    return (
      `exploration guard: ${String(this.noNewEvidenceStreak)} consecutive tool calls ` +
      `returned no new evidence (maxNoNewEvidenceCalls ` +
      `${String(this.config.maxNoNewEvidenceCalls ?? this.noNewEvidenceStreak)}; every result ` +
      `was already seen this invocation). The executed work is kept; narrow the scope, vary ` +
      `the queries, or raise the limit (${GUARD_DOCS_URL}).`
    );
  }

  /** The structured summary; `toolCallsUsed` is the loop's own counter. */
  summary(toolCallsUsed: number): ExplorationSummary {
    const byTool: Record<string, number> = {};
    for (const [name, count] of [...this.byTool.entries()].sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    )) {
      byTool[name] = count;
    }
    return {
      toolCallsUsed,
      distinctSignatures: this.signatureExecutions.size,
      repeatedCalls: this.repeated,
      duplicateResultCalls: this.duplicateResults,
      deniedRepeats: this.denied,
      byTool,
      // Present only when their limits are configured, so summaries of
      // runs without them stay byte-identical (they are journaled with
      // the guard abort).
      ...(this.config.maxCallsPerTool === undefined ? {} : { deniedToolCap: this.deniedToolCap }),
      ...(this.config.toolUnits === undefined ? {} : { toolUnitsUsed: this.unitsUsed }),
    };
  }
}

/** The soft notice thresholds over maxToolCalls, in ascending order. */
export const TOOL_BUDGET_NOTICE_THRESHOLDS = [0.5, 0.8] as const;

/**
 * Which notice thresholds `used` calls out of `max` have crossed
 * (ceil-based, so a threshold fires no earlier than its exact fraction).
 */
export function crossedNoticeThresholds(used: number, max: number): number[] {
  return TOOL_BUDGET_NOTICE_THRESHOLDS.filter(
    (threshold) => used >= Math.ceil(threshold * max),
  ).map((threshold) => threshold);
}

/**
 * The model-visible budget notice. Deterministic for a given usage
 * count, so a recorded conversation rebuilds byte-identically on
 * resume and replay.
 */
export function toolBudgetNoticeText(used: number, max: number): string {
  const remaining = Math.max(0, max - used);
  return (
    `Tool budget notice: ${String(used)} of ${String(max)} tool calls used; ` +
    `${String(remaining)} remaining. Prioritize the highest value calls and finish with ` +
    `what you have.`
  );
}
