/**
 * Opt-in audit helpers for journals recorded by rulvar v1.19.0, whose
 * OpenAI adapter double-counted prompt-cache writes: it added
 * `cache_write_tokens` ON TOP of the wire's `input_tokens` even though
 * the wire count already includes them, so every written token billed
 * at the base rate PLUS the 1.25x write premium (fixed in v1.20.0; the
 * error direction was overcharge, never undercharge). The inflation is
 * exactly invertible because the broken transformation is exactly
 * known: `recordedInput = trueInput + cacheWriteTokens`, with the
 * subset fields themselves recorded correctly.
 *
 * Journals are immutable and these helpers respect that: they never
 * modify an entry, a hash, or replay provenance. They produce a SIDECAR
 * report for accounting reconciliation. Apply them ONLY to journals you
 * know were recorded by v1.19.0: from v1.21.0 on, entries stamp the
 * adapter's `usageSemantics`, and an entry stamped
 * `openai-cache-subsets-v2` (or later) is already correct. An UNSTAMPED
 * OpenAI entry with cache writes is ambiguous between v1.19.0
 * (inflated) and v1.20.0 (correct); the recording version must come
 * from your own deployment history.
 */
import type { JournalEntry, ModelRef, Usage } from '@rulvar/core';
import { ConfigError, entryUsageSlices } from '@rulvar/core';

/**
 * The exact inverse of the v1.19.0 double count for one usage:
 * subtracts `cacheWriteTokens` back out of `inputTokens` and leaves
 * every other field untouched. A usage without cache writes is returned
 * unchanged (v1.19.0 recorded those correctly). Throws a typed
 * ConfigError when the arithmetic cannot be the v1.19.0 shape (the
 * recorded input has no room for the subtraction), which means the
 * usage was NOT recorded by the affected adapter; do not guess.
 */
export function undoV1190CacheDoubleCount(usage: Usage): Usage {
  if (usage.cacheWriteTokens <= 0) {
    return usage;
  }
  const trueInput = usage.inputTokens - usage.cacheWriteTokens;
  if (trueInput < usage.cacheReadTokens + usage.cacheWriteTokens) {
    throw new ConfigError(
      'not a v1.19.0-inflated usage: subtracting cacheWriteTokens ' +
        `(${String(usage.cacheWriteTokens)}) out of inputTokens (${String(usage.inputTokens)}) ` +
        'leaves less than the cache subsets; this usage was not recorded by the affected adapter',
    );
  }
  return { ...usage, inputTokens: trueInput };
}

/** One journal's sidecar reconciliation; see auditV1190CacheJournal. */
export interface V1190CacheAudit {
  /** Entries whose usage carried the affected shape and were inverted. */
  affectedEntries: number;
  /** The fold as recorded (what reports and budgets saw). */
  recordedUsd: number;
  /** The fold with every affected usage inverted to the true wire shape. */
  correctedUsd: number;
}

/**
 * Folds a journal twice with the SAME price function: once as recorded
 * and once with every affected OpenAI usage passed through
 * `undoV1190CacheDoubleCount`, returning both totals and the affected
 * entry count. An entry (or per-model slice) counts as affected when it
 * was served by the `openai` adapter, carries cache writes, and has no
 * `usageSemantics` stamp; stamped entries are already correct and fold
 * identically in both totals. The journal itself is never touched.
 * `recordedUsd - correctedUsd` is the exact overcharge IF the journal
 * was recorded by v1.19.0; for a v1.20.0 journal the same shape folds
 * to a smaller `correctedUsd` that does NOT correspond to any real
 * charge, so version provenance stays the caller's responsibility.
 */
export function auditV1190CacheJournal(
  entries: readonly JournalEntry[],
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined,
): V1190CacheAudit {
  let affectedEntries = 0;
  let recordedUsd = 0;
  let correctedUsd = 0;
  for (const entry of entries) {
    let entryAffected = false;
    for (const slice of entryUsageSlices(entry)) {
      const recorded = priceUsd(slice.servedBy, slice.usage);
      if (recorded === undefined) {
        continue;
      }
      recordedUsd += recorded;
      const affected =
        entry.usageSemantics === undefined &&
        slice.servedBy.startsWith('openai:') &&
        slice.usage.cacheWriteTokens > 0;
      if (affected) {
        let corrected: Usage | undefined;
        try {
          corrected = undoV1190CacheDoubleCount(slice.usage);
        } catch {
          // Not the v1.19.0 arithmetic (a correct v1.20.0 entry whose
          // subsets leave no room for the subtraction): fold as
          // recorded and keep auditing the rest of the journal.
          corrected = undefined;
        }
        if (corrected === undefined) {
          correctedUsd += recorded;
        } else {
          entryAffected = true;
          correctedUsd += priceUsd(slice.servedBy, corrected) ?? 0;
        }
      } else {
        correctedUsd += recorded;
      }
    }
    if (entryAffected) {
      affectedEntries += 1;
    }
  }
  return { affectedEntries, recordedUsd, correctedUsd };
}
