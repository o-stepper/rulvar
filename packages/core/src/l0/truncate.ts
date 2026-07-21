/**
 * The shared render-budget truncation (v1.35.0 review P2-2): a budget of
 * N characters is a HARD upper bound of the returned string, marker
 * included. The previous idiom (`slice(0, N) + '...'`) returned up to
 * N + 3 characters, so every documented "clamped to N" bound was off by
 * the marker length at both distillation tiers.
 */

/** The truncation marker appended when a budget of at least 3 allows it. */
export const TRUNCATION_MARKER = '...';

/**
 * Truncates `raw` to at most `budgetChars` characters. A string within
 * the budget returns unchanged; a longer one is cut to
 * `budgetChars - 3` characters plus the marker, and budgets below the
 * marker length fall back to a bare slice so the bound still holds.
 * The measure is deterministic characters (UTF-16 units): identical
 * live and on replay, no tokenizer dependence.
 */
export function truncateToBudget(raw: string, budgetChars: number): string {
  if (raw.length <= budgetChars) {
    return raw;
  }
  if (budgetChars < TRUNCATION_MARKER.length) {
    return raw.slice(0, Math.max(0, budgetChars));
  }
  return `${raw.slice(0, budgetChars - TRUNCATION_MARKER.length)}${TRUNCATION_MARKER}`;
}
