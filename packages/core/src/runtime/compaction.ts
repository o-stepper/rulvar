/**
 * Compaction pipeline (M4-T03): the Agent Runtime owns compaction. A
 * per-profile contextWindow threshold (default 0.8, docs/06 Appendix A)
 * trips the summarize role at a tool turn boundary; the summary replaces
 * everything after the first message as one user-role summary message;
 * the compaction point (the turn number) is written into the checkpoint
 * so a resumed run never re-summarizes already-compacted history.
 *
 * Owning spec: docs/06-execution-spec.md, section "Agent runtime
 * binding" (M4-T03 committed semantics); docs/04, section "Invocation
 * roles and firing protocol" (summarize row).
 */
import type { Msg } from '../l0/messages.js';
import { atCompactionThreshold } from '../model/roles.js';

/** Appendix A: compaction threshold default, 0.8 of contextWindow. */
export const DEFAULT_COMPACTION_THRESHOLD = 0.8;

/** Deterministic marker opening every compaction summary message. */
export const COMPACTION_SUMMARY_PREFIX = 'Summary of the conversation so far:';

/** Per-profile compaction config (docs/06, section 6, AgentProfile). */
export interface CompactionConfig {
  /** Fraction of the loop model's contextWindow; default 0.8. */
  threshold?: number;
}

/**
 * The threshold check (docs/06, M4-T03 committed semantics): the context
 * estimate is the last loop turn's inputTokens + outputTokens; the Usage
 * invariant makes inputTokens the full prompt, and the turn's output
 * joins the next prompt.
 */
export function shouldCompact(options: {
  lastTurnUsage: { inputTokens: number; outputTokens: number };
  contextWindow: number;
  threshold?: number;
}): boolean {
  const used = options.lastTurnUsage.inputTokens + options.lastTurnUsage.outputTokens;
  return atCompactionThreshold(
    used,
    options.contextWindow,
    options.threshold ?? DEFAULT_COMPACTION_THRESHOLD,
  );
}

/**
 * The instruction message appended to the projected transcript for the
 * summarize invocation. Deterministic wording; the response text becomes
 * the summary message body.
 */
export function summarizeInstruction(): Msg {
  return {
    role: 'user',
    parts: [
      {
        type: 'text',
        text:
          'Summarize the conversation above for a context handoff. Preserve: the task and ' +
          'its constraints, every decision made, tool results that still matter, current ' +
          'progress, and what remains to be done. Respond with the summary text only.',
      },
    ],
  };
}

/**
 * Applies a produced summary: everything after the first message (the
 * spawn prompt) is replaced by ONE user-role summary message. Compaction
 * fires at tool turn boundaries only, so the replaced span never splits
 * a tool-call/tool-result pair.
 */
export function compactMessages(messages: Msg[], summaryText: string): Msg[] {
  const head = messages[0];
  const summary: Msg = {
    role: 'user',
    parts: [{ type: 'text', text: `${COMPACTION_SUMMARY_PREFIX}\n${summaryText}` }],
  };
  return head === undefined ? [summary] : [head, summary];
}
