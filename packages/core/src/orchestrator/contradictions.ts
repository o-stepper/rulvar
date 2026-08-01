/**
 * The bounded contradiction pass, pure half (RV1301, the sixteenth
 * comparison experiment's P2-1 remainder). A fan-out produces N
 * independent children, and until this fold nothing anywhere compared
 * their claims against EACH OTHER: acceptance judges each child alone,
 * the finish validators judge the final text mechanically,
 * `citedValueValidator` judges a claim against the SOURCE, and
 * `dedupeRepeatedClaims` matches on agreement, so it is blind to
 * disagreement by construction. Two children crediting one source line
 * with different values both rode into the synthesis prompt, the model
 * silently picked one, and the run read confident.
 *
 * The rule is deliberately narrow, so a finding is always explainable
 * in one sentence: two DIFFERENT children credit the same cited
 * location with different values for the same key. Everything about it
 * is bounded on purpose (no model call, no clock, no host code, an
 * output cap and an excerpt cap), because the window this pass lives in
 * is the post-fan-in tail RV1211 measured at half the run's wall.
 *
 * Public docs: https://docs.rulvar.com/guide/orchestration-modes
 */
import { ConfigError } from '../l0/errors.js';

import { DEFAULT_CITATION_PATTERN } from './finish-validators.js';
import { sentencesOf } from './sentences.js';

/** One child's serialized output as the pass reads it. */
export interface ContradictionSource {
  /** The child's node identity, the same one acceptance reasons use. */
  readonly nodeId: string;
  /** The child's full output serialized, the pool the validators judge. */
  readonly text: string;
}

/** One reading of a disputed key, with everyone who reported it. */
export interface ContradictionClaim {
  /** The value asserted for the key, verbatim after the separator. */
  value: string;
  /** Children asserting it, in first-seen (spawn) order; never empty. */
  nodeIds: string[];
  /**
   * The first sentence that asserted it, whitespace-collapsed and cut
   * to `maxExcerptChars`. An excerpt, never a quotation: it exists so a
   * reader can find the claim, not so a machine can re-parse it.
   */
  excerpt: string;
}

/** One cited location two children read differently. */
export interface Contradiction {
  /** The cited location both readings point at, e.g. 'src/retry.ts:33'. */
  anchor: string;
  /** The key both readings name, e.g. 'attempts'. */
  key: string;
  /** Every reading of that key at that anchor, in first-seen order. */
  claims: ContradictionClaim[];
}

export interface ContradictionOptions {
  /** Overrides {@link DEFAULT_CITATION_PATTERN} for the anchors. */
  pattern?: string;
  /** Bound on returned contradictions; default 20. */
  max?: number;
  /** Bound on each claim's excerpt; default 200. */
  maxExcerptChars?: number;
}

export const DEFAULT_MAX_CONTRADICTIONS = 20;
export const DEFAULT_MAX_EXCERPT_CHARS = 200;

/** The citation shape: anything ending in `:<line>`. */
const CITATION_TAIL = /^(.*):(\d+)$/u;
/**
 * A comparable assertion: a key, the FIRST `:` or `=`, and a value.
 * A span with no separator (`attempts` alone) names something without
 * asserting anything about it, and two such spans can never conflict.
 */
const KEYED_VALUE = /^([^:=]+)[:=](.+)$/u;

function requirePositiveInteger(value: number, what: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new ConfigError(`${what} must be a positive integer; got ${String(value)}`);
  }
  return value;
}

/** Trim plus inner-whitespace collapse, the dedupeRepeatedClaims key rule. */
function collapse(text: string): string {
  return text.trim().replace(/\s+/gu, ' ');
}

/**
 * True when two readings are held by two DIFFERENT children. A single
 * child holding both is not a pool contradiction: inside one document
 * two values of one key are usually narrative ("it was 3, it is now
 * 5"), while two independent children disagreeing is exactly the signal
 * the pool cannot resolve by itself.
 */
function heldByDifferentChildren(claims: readonly ContradictionClaim[]): boolean {
  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) {
      const left = claims[i].nodeIds;
      const right = claims[j].nodeIds;
      if (left.length > 1 || right.length > 1 || left[0] !== right[0]) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Folds the settled children's outputs into the contradictions they
 * hold against each other. Pure and deterministic: the output depends
 * only on the input order and bytes, so a resumed run re-derives it
 * without journaling anything.
 */
export function findContradictions(
  rows: readonly ContradictionSource[],
  options?: ContradictionOptions,
): Contradiction[] {
  const pattern = options?.pattern ?? DEFAULT_CITATION_PATTERN;
  let anchored: RegExp;
  try {
    anchored = new RegExp(`^${pattern}$`, '');
    new RegExp(pattern, '');
  } catch (thrown) {
    throw new ConfigError(
      `findContradictions pattern does not compile: ${
        thrown instanceof Error ? thrown.message : String(thrown)
      }`,
    );
  }
  // Fail-closed intake (the RV610 posture): a pattern matching the
  // empty string turns every inline span into an anchor, which does not
  // arm the pass, it floods it.
  if (new RegExp(pattern, '').test('')) {
    throw new ConfigError(
      'findContradictions pattern must not be able to match the empty string; got ' +
        JSON.stringify(pattern),
    );
  }
  const max = requirePositiveInteger(
    options?.max ?? DEFAULT_MAX_CONTRADICTIONS,
    'findContradictions max',
  );
  const maxExcerptChars = requirePositiveInteger(
    options?.maxExcerptChars ?? DEFAULT_MAX_EXCERPT_CHARS,
    'findContradictions maxExcerptChars',
  );

  // anchor -> key -> value -> claim, every level insertion-ordered so
  // the output order is first-seen order and nothing sorts by content.
  const byAnchor = new Map<string, Map<string, Map<string, ContradictionClaim>>>();
  for (const row of rows) {
    for (const sentence of sentencesOf(row.text)) {
      // The RV1212 span vocabulary: inline-code spans that parse as
      // `path:line` are the anchors, and the rest are the values
      // asserted about them. A value written as prose never enters the
      // judgment, which is what keeps a finding explainable.
      const anchors: string[] = [];
      const values: { key: string; value: string }[] = [];
      for (const match of sentence.matchAll(/`([^`]+)`/gu)) {
        const span = match[1];
        const parsed = CITATION_TAIL.exec(span);
        if (
          parsed !== null &&
          Number.isSafeInteger(Number(parsed[2])) &&
          anchored.test(span) &&
          !anchors.includes(span)
        ) {
          anchors.push(span);
          continue;
        }
        const keyed = KEYED_VALUE.exec(span);
        if (keyed === null) {
          continue;
        }
        const key = collapse(keyed[1]);
        const value = collapse(keyed[2]);
        if (key !== '' && value !== '') {
          values.push({ key, value });
        }
      }
      if (anchors.length === 0 || values.length === 0) {
        continue;
      }
      const excerpt = collapse(sentence).slice(0, maxExcerptChars);
      for (const anchor of anchors) {
        let byKey = byAnchor.get(anchor);
        if (byKey === undefined) {
          byKey = new Map();
          byAnchor.set(anchor, byKey);
        }
        for (const { key, value } of values) {
          let byValue = byKey.get(key);
          if (byValue === undefined) {
            byValue = new Map();
            byKey.set(key, byValue);
          }
          const claim = byValue.get(value);
          if (claim === undefined) {
            byValue.set(value, { value, nodeIds: [row.nodeId], excerpt });
          } else if (!claim.nodeIds.includes(row.nodeId)) {
            claim.nodeIds.push(row.nodeId);
          }
        }
      }
    }
  }

  const found: Contradiction[] = [];
  for (const [anchor, byKey] of byAnchor) {
    for (const [key, byValue] of byKey) {
      const claims = [...byValue.values()];
      if (claims.length < 2 || !heldByDifferentChildren(claims)) {
        continue;
      }
      found.push({ anchor, key, claims });
      if (found.length === max) {
        return found;
      }
    }
  }
  return found;
}
