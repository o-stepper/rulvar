/**
 * Repeated-claim deduplication (RV-211 remainder): a PURE, deterministic
 * fold that removes byte-repeated claim lines across children BEFORE any
 * model call, so the synthesis invocation never spends context re-reading
 * what several children reported identically. Matching is deliberately
 * conservative: lines compare by whitespace-collapsed exact equality
 * (trim, inner runs of whitespace to one space), never fuzzily, so two
 * DISTINCT claims can never merge; the first occurrence survives verbatim
 * and every later occurrence is dropped and indexed. Empty lines are
 * structure, not claims: they always survive.
 *
 * Public docs: https://docs.rulvar.com/guide/orchestration-modes
 */

/** One claim reported more than once across the input rows. */
export interface RepeatedClaim {
  /** The first-seen line, verbatim. */
  claim: string;
  /** Reporters in input order; the first entry made the surviving copy. */
  nodeIds: string[];
  /** Total occurrences across all rows, the surviving one included. */
  count: number;
}

export interface DedupedClaims {
  /** The input rows with every repeated line's later occurrences removed. */
  rows: { nodeId: string; text: string }[];
  /** Claims seen more than once, in first-occurrence order. */
  repeated: RepeatedClaim[];
}

/** The conservative matching key: trim plus inner-whitespace collapse. */
function claimKey(line: string): string {
  return line.trim().replace(/\s+/gu, ' ');
}

/**
 * Removes later occurrences of repeated claim lines across the rows and
 * indexes each repeated claim with its reporters. Deterministic: output
 * depends only on the input order and bytes.
 */
export function dedupeRepeatedClaims(rows: { nodeId: string; text: string }[]): DedupedClaims {
  const seen = new Map<string, RepeatedClaim>();
  const order: RepeatedClaim[] = [];
  const outRows = rows.map((row) => {
    const kept: string[] = [];
    for (const line of row.text.split('\n')) {
      const key = claimKey(line);
      if (key === '') {
        kept.push(line);
        continue;
      }
      const prior = seen.get(key);
      if (prior === undefined) {
        const entry: RepeatedClaim = { claim: line, nodeIds: [row.nodeId], count: 1 };
        seen.set(key, entry);
        order.push(entry);
        kept.push(line);
        continue;
      }
      prior.count += 1;
      if (!prior.nodeIds.includes(row.nodeId)) {
        prior.nodeIds.push(row.nodeId);
      }
    }
    return { nodeId: row.nodeId, text: kept.join('\n') };
  });
  return {
    rows: outRows,
    repeated: order.filter((entry) => entry.count > 1),
  };
}
