/**
 * Financial-telemetry validation for canonical Usage (v1.20.0 review
 * P1-1). Every token count the engine prices, journals, or debits MUST
 * be a finite nonnegative integer, and the cache subsets must fit inside
 * the full input count. Anything else is broken transport telemetry, not
 * plausible provider data: real wires report whole tokens. The runtime
 * enforces this at the adapter boundary for EVERY adapter, injected
 * clients and mocks included, so the budget invariants never depend on
 * the good faith of an external transport.
 *
 * The enforcement pairs two functions with distinct jobs:
 *
 * - `usageViolations` names every violated rule; the agent loop turns a
 *   nonempty result into a typed transport-class terminal for the call,
 *   so bad telemetry fails LOUD instead of flowing into money.
 * - `sanitizeUsage` conservatively repairs the numbers for accounting:
 *   the failed call still journals and debits, and the repaired values
 *   can only overcharge (fractions round up), never credit the budget or
 *   poison it with a non-finite value.
 */
import type { Usage } from './messages.js';

const COUNT_FIELDS = [
  'inputTokens',
  'outputTokens',
  'cacheReadTokens',
  'cacheWriteTokens',
  'reasoningTokens',
  'cacheWrite5mTokens',
  'cacheWrite1hTokens',
] as const;

/** The optional count fields: absent is legal, present obeys the count rules. */
const OPTIONAL_COUNT_FIELDS = new Set<string>([
  'reasoningTokens',
  'cacheWrite5mTokens',
  'cacheWrite1hTokens',
]);

/**
 * Names every rule the given usage violates; an empty array means the
 * usage satisfies the full canonical invariant: each present count is a
 * finite nonnegative integer and
 * `cacheReadTokens + cacheWriteTokens <= inputTokens`. The subset rule
 * is checked with a negated comparison so a NaN operand counts as a
 * violation rather than vacuously passing.
 */
export function usageViolations(usage: Usage): string[] {
  const out: string[] = [];
  for (const field of COUNT_FIELDS) {
    const value = usage[field];
    if (OPTIONAL_COUNT_FIELDS.has(field) && value === undefined) {
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      out.push(`${field} is ${String(value)}, not a finite number`);
    } else if (value < 0) {
      out.push(`${field} is negative (${String(value)})`);
    } else if (!Number.isInteger(value)) {
      out.push(`${field} is fractional (${String(value)})`);
    } else if (!Number.isSafeInteger(value)) {
      // A count beyond 2^53 - 1 is garbage, and sums of such values can
      // overflow the accumulators to Infinity past the finiteness check.
      out.push(`${field} is beyond the safe integer range (${String(value)})`);
    }
  }
  if (!(usage.inputTokens >= usage.cacheReadTokens + usage.cacheWriteTokens)) {
    out.push(
      `inputTokens (${String(usage.inputTokens)}) < cacheReadTokens + cacheWriteTokens ` +
        `(${String(usage.cacheReadTokens)} + ${String(usage.cacheWriteTokens)})`,
    );
  }
  // The cache-write TTL split (RV810): when either share is present the
  // split must sum to the write total (an absent share counts zero), so
  // a differentiated bill can never cover more or fewer tokens than the
  // undifferentiated one. The negated comparison makes NaN a violation.
  if (usage.cacheWrite5mTokens !== undefined || usage.cacheWrite1hTokens !== undefined) {
    const m5 = usage.cacheWrite5mTokens ?? 0;
    const h1 = usage.cacheWrite1hTokens ?? 0;
    if (!(m5 + h1 === usage.cacheWriteTokens)) {
      out.push(
        `cacheWrite5mTokens + cacheWrite1hTokens (${String(m5)} + ${String(h1)}) != ` +
          `cacheWriteTokens (${String(usage.cacheWriteTokens)})`,
      );
    }
  }
  return out;
}

/**
 * One count, repaired in the conservative direction: non-numbers and
 * non-finite values floor to zero (no evidence, no charge and no
 * credit), negatives floor to zero (a negative count can only CREDIT
 * the budget, which hostile telemetry must never do), and fractions
 * round UP so a repaired charge is never an undercharge.
 */
export function sanitizeTokenCount(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  // The clamp keeps repeated additions from ever overflowing to
  // Infinity; an absurd huge count then overcharges toward the ceiling
  // (loud) instead of poisoning the accumulators (silent).
  return Math.min(Math.ceil(value), Number.MAX_SAFE_INTEGER);
}

/**
 * One field read per property, returning a detached plain copy. Both
 * accounting boundaries validate and consume THIS snapshot, never the
 * adapter-owned object, so a hostile accessor cannot answer the
 * validator with valid counts and the accumulator with garbage.
 */
export function snapshotUsage(usage: Usage): Usage {
  const out: Usage = {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens,
    cacheWriteTokens: usage.cacheWriteTokens,
  };
  const reasoning = usage.reasoningTokens;
  if (reasoning !== undefined) {
    out.reasoningTokens = reasoning;
  }
  const write5m = usage.cacheWrite5mTokens;
  if (write5m !== undefined) {
    out.cacheWrite5mTokens = write5m;
  }
  const write1h = usage.cacheWrite1hTokens;
  if (write1h !== undefined) {
    out.cacheWrite1hTokens = write1h;
  }
  return out;
}

/**
 * Canonical usage addition for aggregates. The four required counts sum
 * field by field and reasoning appears when the sum is positive, byte
 * for byte the historical fold. The cache-write TTL split survives
 * aggregation (RV1001): when either side differentiates its writes, an
 * undifferentiated side's writes count as the 5m share, which is
 * financially identical (both bill at the plain write rate) and keeps
 * the sum canonical under the split-sum rule instead of dropping the 1h
 * attribution the money was debited under. Sides carrying no split add
 * exactly as before, so aggregates over undifferentiated usage stay
 * byte stable.
 */
export function sumUsage(total: Usage, turn: Usage): Usage {
  const sum: Usage = {
    inputTokens: total.inputTokens + turn.inputTokens,
    outputTokens: total.outputTokens + turn.outputTokens,
    cacheReadTokens: total.cacheReadTokens + turn.cacheReadTokens,
    cacheWriteTokens: total.cacheWriteTokens + turn.cacheWriteTokens,
  };
  const reasoning = (total.reasoningTokens ?? 0) + (turn.reasoningTokens ?? 0);
  if (reasoning > 0) {
    sum.reasoningTokens = reasoning;
  }
  if (
    total.cacheWrite5mTokens !== undefined ||
    total.cacheWrite1hTokens !== undefined ||
    turn.cacheWrite5mTokens !== undefined ||
    turn.cacheWrite1hTokens !== undefined
  ) {
    const oneH = (usage: Usage): number => usage.cacheWrite1hTokens ?? 0;
    const fiveM = (usage: Usage): number =>
      usage.cacheWrite5mTokens ?? Math.max(0, usage.cacheWriteTokens - oneH(usage));
    sum.cacheWrite5mTokens = fiveM(total) + fiveM(turn);
    sum.cacheWrite1hTokens = oneH(total) + oneH(turn);
  }
  return sum;
}

/**
 * The per-field repair for DELTAS (mid-stream usage reports and other
 * partial increments): each count is repaired like `sanitizeTokenCount`,
 * but the whole-usage subset rule is deliberately NOT applied, because a
 * delta legitimately carries cache counts without restating the full
 * input in the same event; clamping those to the subset rule would
 * silently drop a paid cache debit. Always returns a fresh object and
 * is the identity on valid deltas.
 */
export function sanitizeUsageDelta(delta: Usage): Usage {
  const snapshot = snapshotUsage(delta);
  const out: Usage = {
    inputTokens: sanitizeTokenCount(snapshot.inputTokens),
    outputTokens: sanitizeTokenCount(snapshot.outputTokens),
    cacheReadTokens: sanitizeTokenCount(snapshot.cacheReadTokens),
    cacheWriteTokens: sanitizeTokenCount(snapshot.cacheWriteTokens),
  };
  if (snapshot.reasoningTokens !== undefined) {
    out.reasoningTokens = sanitizeTokenCount(snapshot.reasoningTokens);
  }
  if (snapshot.cacheWrite5mTokens !== undefined) {
    out.cacheWrite5mTokens = sanitizeTokenCount(snapshot.cacheWrite5mTokens);
  }
  if (snapshot.cacheWrite1hTokens !== undefined) {
    out.cacheWrite1hTokens = sanitizeTokenCount(snapshot.cacheWrite1hTokens);
  }
  return out;
}

/**
 * Conservative repair for accounting. Pairs with `usageViolations`: the
 * violation fails the call loud, and the sanitized numbers are the only
 * ones the journal, the cost report, and the budget may see. After the
 * per-field repair the cache subsets clamp into the input with reads
 * keeping priority, mirroring the adapter-level subset clamp. Valid
 * usage passes through structurally unchanged.
 */
export function sanitizeUsage(usage: Usage): Usage {
  const inputTokens = sanitizeTokenCount(usage.inputTokens);
  const cacheReadTokens = Math.min(sanitizeTokenCount(usage.cacheReadTokens), inputTokens);
  const cacheWriteTokens = Math.min(
    sanitizeTokenCount(usage.cacheWriteTokens),
    inputTokens - cacheReadTokens,
  );
  const out: Usage = {
    inputTokens,
    outputTokens: sanitizeTokenCount(usage.outputTokens),
    cacheReadTokens,
    cacheWriteTokens,
  };
  if (usage.reasoningTokens !== undefined) {
    out.reasoningTokens = sanitizeTokenCount(usage.reasoningTokens);
  }
  // The TTL split repair (RV810), conservative like everything here. A
  // split already valid against the (possibly repaired) write total
  // passes through structurally unchanged, absent fields staying
  // absent. A broken split is rebuilt: the 1h share clamps into the
  // write total FIRST because it carries the higher rate (a repaired
  // attribution may overcharge, never undercharge), and the 5m share
  // takes the whole remainder, so the repaired split always sums to the
  // total and the remainder bills at the plain write rate, exactly the
  // undifferentiated charge those tokens carried before the split
  // existed.
  if (usage.cacheWrite5mTokens !== undefined || usage.cacheWrite1hTokens !== undefined) {
    const validShare = (value: number | undefined): boolean =>
      value === undefined || (Number.isSafeInteger(value) && value >= 0);
    const splitValid =
      validShare(usage.cacheWrite5mTokens) &&
      validShare(usage.cacheWrite1hTokens) &&
      (usage.cacheWrite5mTokens ?? 0) + (usage.cacheWrite1hTokens ?? 0) === cacheWriteTokens;
    if (splitValid) {
      if (usage.cacheWrite5mTokens !== undefined) {
        out.cacheWrite5mTokens = usage.cacheWrite5mTokens;
      }
      if (usage.cacheWrite1hTokens !== undefined) {
        out.cacheWrite1hTokens = usage.cacheWrite1hTokens;
      }
    } else {
      const write1h = Math.min(sanitizeTokenCount(usage.cacheWrite1hTokens), cacheWriteTokens);
      out.cacheWrite1hTokens = write1h;
      out.cacheWrite5mTokens = cacheWriteTokens - write1h;
    }
  }
  return out;
}
