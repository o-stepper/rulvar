/**
 * The claim-consistency pairing fold, pure half (RV1501, the
 * eighteenth improvement plan). A fan-out's children research and the
 * ROOT composes, and until this fold nothing anywhere held the
 * composed text against the pool it composed FROM: the finish
 * validators judge the final text mechanically, `citedValueValidator`
 * judges it against the SOURCE line, and `findContradictions` compares
 * children against EACH OTHER, so a root that inverts a child's
 * finding while citing the child's own span passes every configured
 * check. The seventeenth comparison run shipped exactly that: the
 * security child read `packages/executor/src/subprocess.ts:256-296`
 * correctly (a failed audit write does not mask success) and the final
 * draft asserted the opposite over the same citation.
 *
 * The rule is deliberately narrow, so a pair is always explainable in
 * one sentence: a draft sentence citing an anchor is paired with the
 * pool sentences citing an INTERSECTING line span of the same file.
 * The fold only pairs, it never judges: whether the two sentences
 * disagree is the judge invocation's question (RV1502), which is why
 * verbatim agreement (one sentence containing the other) is dropped
 * here, before anything pays for a verdict. Everything about it is
 * bounded on purpose (no model call, no clock, no host code, a pair
 * cap, a per-pair pool cap, and an excerpt cap), because the window
 * this pass lives in is the post-fan-in tail RV1211 measured at half
 * the run's wall.
 *
 * Public docs: https://docs.rulvar.com/guide/orchestration-modes
 */
import { ConfigError } from '../l0/errors.js';

import type { ContradictionSource } from './contradictions.js';
import { DEFAULT_CITATION_PATTERN } from './finish-validators.js';
import { sentencesOf } from './sentences.js';

/**
 * The default anchor shape: the finish validators' citation pattern
 * extended with an optional `-end` line range, because composed dossiers
 * routinely cite spans (`src/exec.ts:256-296`) where the single-line
 * pattern would silently read only the first line.
 */
export const DEFAULT_ANCHOR_PATTERN: string = `${DEFAULT_CITATION_PATTERN}(?:-\\d+)?`;

/** One pool sentence read against a draft sentence, with its reporter. */
export interface ClaimPoolReading {
  /** The child's node identity, the same one acceptance reasons use. */
  nodeId: string;
  /**
   * The pool sentence, whitespace-collapsed and cut to
   * `maxExcerptChars`. An excerpt, never a quotation: it exists so a
   * judge (or a reader) can hold the two readings against each other,
   * not so a machine can re-parse it.
   */
  excerpt: string;
}

/** One draft assertion paired with the pool readings of its anchor. */
export interface ClaimPair {
  /** The draft-side citation verbatim, e.g. 'src/exec.ts:256-296'. */
  anchor: string;
  /** The citing draft sentence, collapsed and cut like the readings. */
  draftExcerpt: string;
  /** The pool sentences citing an intersecting span, first-seen order. */
  pool: ClaimPoolReading[];
}

export interface ClaimPairOptions {
  /** Overrides {@link DEFAULT_ANCHOR_PATTERN} for both sides. */
  pattern?: string;
  /** Bound on returned pairs; default {@link DEFAULT_MAX_CLAIM_PAIRS}. */
  max?: number;
  /** Bound on each pair's pool readings; default {@link DEFAULT_MAX_POOL_PER_PAIR}. */
  maxPoolPerPair?: number;
  /** Bound on each excerpt; default {@link DEFAULT_MAX_PAIR_EXCERPT_CHARS}. */
  maxExcerptChars?: number;
  /**
   * Critical anchor declarations (RV1603): each entry is a path
   * (`packages/executor/src/ledger.ts`, matching that file and anything
   * under it as a directory) or an anchor with a span
   * (`src/exec.ts:250-300`, matching same-file anchors intersecting the
   * span). Pairs whose draft anchor matches sort FIRST, before the
   * `max` cap applies, so a bounded pass judges the declared claims
   * preferentially; the fold also reports which critical draft anchors
   * ended up with no reported pair. Unset = the exact pre-RV1603
   * ordering, byte for byte (the eighteenth comparison benchmark's
   * judge saw 40 of 144 citing sentences with nothing steering WHICH
   * 40).
   */
  critical?: readonly string[];
}

/** What the fold produced, beside the pairs themselves. */
export interface ClaimPairsFold {
  /** The pairs, in draft first-seen order, capped at `max`. */
  pairs: ClaimPair[];
  /** True when more pairs existed than `max` allowed to report. */
  truncated: boolean;
  /** Draft sentences carrying at least one parsable anchor. */
  draftCitingSentences: number;
  /**
   * Citing sentences with at least one REPORTED pair (RV1603): the
   * honest coverage numerator against `draftCitingSentences`. A
   * sentence can be uncovered because nothing in the pool read its
   * files, because every reading agreed verbatim, or because the `max`
   * cap cut it; all three mean the judge never saw it.
   */
  coveredCitingSentences: number;
  /**
   * Present only when `critical` was given: the critical draft anchors
   * (verbatim, draft order, deduplicated) with no reported pair, capped
   * at {@link MAX_CRITICAL_UNCOVERED} entries.
   */
  criticalUncovered?: string[];
  /** The uncapped count behind `criticalUncovered`; present with it. */
  criticalUncoveredTotal?: number;
}

export const DEFAULT_MAX_CLAIM_PAIRS = 40;
export const DEFAULT_MAX_POOL_PER_PAIR = 3;
export const DEFAULT_MAX_PAIR_EXCERPT_CHARS = 400;
/** Bound on the reported uncovered-critical anchor list (RV1603). */
export const MAX_CRITICAL_UNCOVERED = 32;

/** Splits an anchor into path, start, and optional end at the LAST colon. */
const ANCHOR_TAIL = /^(.*):(\d+)(?:-(\d+))?$/u;

function requirePositiveInteger(value: number, what: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new ConfigError(`${what} must be a positive integer; got ${String(value)}`);
  }
  return value;
}

/** Trim plus inner-whitespace collapse, the contradiction-pass key rule. */
function collapse(text: string): string {
  return text.trim().replace(/\s+/gu, ' ');
}

/** A parsed anchor: the file half plus its inclusive 1-based span. */
interface ParsedAnchor {
  raw: string;
  path: string;
  start: number;
  end: number;
}

/**
 * Parses every distinct anchor of one sentence. An anchor that does not
 * parse as `path:start(-end)` with safe integers, that names a line
 * below 1, or whose range is inverted asserts nothing pairable and is
 * skipped: judging malformed citations is `citationTargetsValidator`'s
 * job, not this fold's.
 */
function anchorsOf(sentence: string, pattern: string): ParsedAnchor[] {
  const anchors: ParsedAnchor[] = [];
  const seen = new Set<string>();
  for (const match of sentence.match(new RegExp(pattern, 'gu')) ?? []) {
    if (match.length === 0 || seen.has(match)) {
      continue;
    }
    seen.add(match);
    const parsed = ANCHOR_TAIL.exec(match);
    if (parsed === null) {
      continue;
    }
    const start = Number(parsed[2]);
    const end = parsed[3] === undefined ? start : Number(parsed[3]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) {
      continue;
    }
    anchors.push({ raw: match, path: parsed[1], start, end });
  }
  return anchors;
}

/**
 * Folds the composed draft against the settled pool it composed from:
 * every draft sentence citing an anchor is paired with the pool
 * sentences citing an intersecting span of the same file, verbatim
 * agreement dropped. Pure and deterministic: the output depends only on
 * the input order and bytes, so a resumed run re-derives it without
 * journaling anything (the `findContradictions` precedent).
 */
export function pairDraftClaims(
  draftText: string,
  rows: readonly ContradictionSource[],
  options?: ClaimPairOptions,
): ClaimPairsFold {
  const pattern = options?.pattern ?? DEFAULT_ANCHOR_PATTERN;
  try {
    new RegExp(pattern, 'gu');
  } catch (thrown) {
    throw new ConfigError(
      `pairDraftClaims pattern does not compile: ${
        thrown instanceof Error ? thrown.message : String(thrown)
      }`,
    );
  }
  // Fail-closed intake (the RV610 posture): a pattern matching the
  // empty string turns every sentence into an anchor carrier, which
  // does not arm the fold, it floods it.
  if (new RegExp(pattern, 'u').test('')) {
    throw new ConfigError(
      'pairDraftClaims pattern must not be able to match the empty string; got ' +
        JSON.stringify(pattern),
    );
  }
  const max = requirePositiveInteger(
    options?.max ?? DEFAULT_MAX_CLAIM_PAIRS,
    'pairDraftClaims max',
  );
  const maxPoolPerPair = requirePositiveInteger(
    options?.maxPoolPerPair ?? DEFAULT_MAX_POOL_PER_PAIR,
    'pairDraftClaims maxPoolPerPair',
  );
  const maxExcerptChars = requirePositiveInteger(
    options?.maxExcerptChars ?? DEFAULT_MAX_PAIR_EXCERPT_CHARS,
    'pairDraftClaims maxExcerptChars',
  );

  // The pool index: path -> readings in row (spawn) order, then
  // sentence order, each carrying its FULL collapsed sentence for the
  // agreement drop and its capped excerpt for the output.
  const poolByPath = new Map<
    string,
    { start: number; end: number; nodeId: string; full: string; excerpt: string }[]
  >();
  for (const row of rows) {
    for (const sentence of sentencesOf(row.text)) {
      const anchors = anchorsOf(sentence, pattern);
      if (anchors.length === 0) {
        continue;
      }
      const full = collapse(sentence);
      const excerpt = full.slice(0, maxExcerptChars);
      for (const anchor of anchors) {
        let readings = poolByPath.get(anchor.path);
        if (readings === undefined) {
          readings = [];
          poolByPath.set(anchor.path, readings);
        }
        readings.push({ start: anchor.start, end: anchor.end, nodeId: row.nodeId, full, excerpt });
      }
    }
  }

  const critical = options?.critical;
  if (critical !== undefined) {
    for (const entry of critical) {
      if (typeof entry !== 'string' || entry.length === 0) {
        throw new ConfigError(
          `pairDraftClaims critical entries must be nonempty strings; got ${JSON.stringify(entry)}`,
        );
      }
    }
  }
  // A critical entry is a span anchor when it parses as one, else a
  // path matched exactly or as a directory prefix (RV1603).
  const criticalSpans: ParsedAnchor[] = [];
  const criticalPaths: string[] = [];
  for (const entry of critical ?? []) {
    const parsed = ANCHOR_TAIL.exec(entry);
    const start = parsed === null ? Number.NaN : Number(parsed[2]);
    const end = parsed === null || parsed[3] === undefined ? start : Number(parsed[3]);
    if (
      parsed !== null &&
      Number.isSafeInteger(start) &&
      Number.isSafeInteger(end) &&
      start >= 1 &&
      end >= start
    ) {
      criticalSpans.push({ raw: entry, path: parsed[1], start, end });
    } else {
      criticalPaths.push(entry);
    }
  }
  const isCritical = (anchor: ParsedAnchor): boolean => {
    for (const path of criticalPaths) {
      if (anchor.path === path || anchor.path.startsWith(`${path}/`)) {
        return true;
      }
    }
    for (const span of criticalSpans) {
      if (anchor.path === span.path && anchor.end >= span.start && anchor.start <= span.end) {
        return true;
      }
    }
    return false;
  };

  interface Candidate {
    pair: ClaimPair;
    sentence: string;
    critical: boolean;
  }
  const candidates: Candidate[] = [];
  const seenPairs = new Set<string>();
  let draftCitingSentences = 0;
  const criticalDraftAnchors: string[] = [];
  const seenCriticalAnchors = new Set<string>();
  for (const sentence of sentencesOf(draftText)) {
    const anchors = anchorsOf(sentence, pattern);
    if (anchors.length === 0) {
      continue;
    }
    draftCitingSentences += 1;
    const full = collapse(sentence);
    const draftExcerpt = full.slice(0, maxExcerptChars);
    for (const anchor of anchors) {
      const anchorCritical = critical !== undefined && isCritical(anchor);
      if (anchorCritical && !seenCriticalAnchors.has(anchor.raw)) {
        seenCriticalAnchors.add(anchor.raw);
        criticalDraftAnchors.push(anchor.raw);
      }
      const pairKey = `${full}\u0000${anchor.raw}`;
      if (seenPairs.has(pairKey)) {
        continue;
      }
      const readings = poolByPath.get(anchor.path) ?? [];
      const pool: ClaimPoolReading[] = [];
      const seenReadings = new Set<string>();
      for (const reading of readings) {
        if (reading.end < anchor.start || reading.start > anchor.end) {
          continue;
        }
        // Verbatim agreement is no pair: a draft sentence carrying the
        // pool sentence (or the reverse) restates it, and paying a
        // judge to confirm a copy would be the flood the caps exist to
        // prevent. Compared on the FULL collapsed sentences, so an
        // excerpt cap can never manufacture a disagreement.
        if (full.includes(reading.full) || reading.full.includes(full)) {
          continue;
        }
        const readingKey = `${reading.nodeId}\u0000${reading.excerpt}`;
        if (seenReadings.has(readingKey)) {
          continue;
        }
        seenReadings.add(readingKey);
        pool.push({ nodeId: reading.nodeId, excerpt: reading.excerpt });
        if (pool.length === maxPoolPerPair) {
          break;
        }
      }
      if (pool.length === 0) {
        continue;
      }
      seenPairs.add(pairKey);
      candidates.push({
        pair: { anchor: anchor.raw, draftExcerpt, pool },
        sentence: full,
        critical: anchorCritical,
      });
    }
  }
  // Critical pairs sort FIRST (stable within each class), so the cap
  // spends its bounded budget on the declared claims; without
  // `critical` the order is exactly the historical draft order, and an
  // unconfigured fold derives byte-identical judge prompts across
  // versions (prompt bytes are journal identity on resume).
  const ordered =
    critical === undefined
      ? candidates
      : [
          ...candidates.filter((candidate) => candidate.critical),
          ...candidates.filter((candidate) => !candidate.critical),
        ];
  const reported = ordered.slice(0, max);
  const coveredSentences = new Set(reported.map((candidate) => candidate.sentence));
  const fold: ClaimPairsFold = {
    pairs: reported.map((candidate) => candidate.pair),
    truncated: candidates.length > reported.length,
    draftCitingSentences,
    coveredCitingSentences: coveredSentences.size,
  };
  if (critical !== undefined) {
    const reportedAnchors = new Set(reported.map((candidate) => candidate.pair.anchor));
    const uncovered = criticalDraftAnchors.filter((anchor) => !reportedAnchors.has(anchor));
    fold.criticalUncovered = uncovered.slice(0, MAX_CRITICAL_UNCOVERED);
    fold.criticalUncoveredTotal = uncovered.length;
  }
  return fold;
}

/** The synthetic anchor and nodeId of run-facts pairs (RV1603). */
export const RUN_FACTS_ANCHOR = '(run-facts)';
export const DEFAULT_MAX_RUN_FACT_PAIRS = 8;
/** The sheet excerpt bound: one sheet rides EVERY run-facts pair. */
export const MAX_RUN_FACTS_SHEET_CHARS = 1200;

/**
 * The run's own recorded execution facts, prepared by the caller
 * (deterministic sentences plus the trigger vocabularies).
 */
export interface RunFactsSheet {
  /** Deterministic sentences of the recorded facts. */
  text: string;
  /** Identity triggers: ids the run itself minted (runId, child node ids). */
  ids: readonly string[];
  /** Numeric triggers: recorded fact values (counts, totals). */
  numbers: readonly number[];
}

export interface RunFactPairOptions {
  /** Case-insensitive substring triggers, e.g. 'not run' or a locale phrase. */
  terms?: readonly string[];
  /** Bound on returned pairs; default {@link DEFAULT_MAX_RUN_FACT_PAIRS}. */
  max?: number;
  /** Bound on the draft excerpt; default {@link DEFAULT_MAX_PAIR_EXCERPT_CHARS}. */
  maxExcerptChars?: number;
}

export interface RunFactPairsFold {
  /** The pairs, in draft order, capped at `max`; anchor {@link RUN_FACTS_ANCHOR}. */
  pairs: ClaimPair[];
  /** True when more sentences matched than `max` allowed to report. */
  truncated: boolean;
}

/** Standalone numbers of two or more digits: single digits trigger nothing. */
const RUN_FACT_NUMBER = /(?<![\d.,])(\d{2,})(?![\d.,])/gu;

/**
 * Pairs draft sentences that speak about the RUN with the run's own
 * recorded fact sheet (RV1603), so the same judge invocation that rules
 * on source claims also rules on run claims. The eighteenth comparison
 * benchmark shipped both failure shapes this closes: a dossier claiming
 * "each role recorded 18-20 evidence entries" over recorded profiles of
 * 23/18/22/20/20/20, and "real models were not run" beside 125 recorded
 * wire requests, with executionFacts ENABLED on the input side; facts
 * offered to the composer verify nothing about what it composed.
 *
 * A sentence pairs when it names a minted id, a recorded fact value
 * (standalone, two digits or more, so a prose "6" cannot flood the
 * fold), or a caller-supplied term (case-insensitive). Pure and
 * deterministic like {@link pairDraftClaims}; the sheet excerpt rides
 * every pair, capped at {@link MAX_RUN_FACTS_SHEET_CHARS}.
 */
export function pairRunFactClaims(
  draftText: string,
  sheet: RunFactsSheet,
  options?: RunFactPairOptions,
): RunFactPairsFold {
  const max = requirePositiveInteger(
    options?.max ?? DEFAULT_MAX_RUN_FACT_PAIRS,
    'pairRunFactClaims max',
  );
  const maxExcerptChars = requirePositiveInteger(
    options?.maxExcerptChars ?? DEFAULT_MAX_PAIR_EXCERPT_CHARS,
    'pairRunFactClaims maxExcerptChars',
  );
  for (const term of options?.terms ?? []) {
    if (typeof term !== 'string' || term.length === 0) {
      throw new ConfigError(
        `pairRunFactClaims terms must be nonempty strings; got ${JSON.stringify(term)}`,
      );
    }
  }
  const terms = (options?.terms ?? []).map((term) => term.toLowerCase());
  const factNumbers = new Set(sheet.numbers.filter((value) => Number.isSafeInteger(value)));
  const sheetExcerpt = collapse(sheet.text).slice(0, MAX_RUN_FACTS_SHEET_CHARS);
  const pool: ClaimPoolReading[] = [{ nodeId: RUN_FACTS_ANCHOR, excerpt: sheetExcerpt }];

  const matched: ClaimPair[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const sentence of sentencesOf(draftText)) {
    const full = collapse(sentence);
    if (full.length === 0 || seen.has(full)) {
      continue;
    }
    const lower = full.toLowerCase();
    let triggered = sheet.ids.some((id) => id.length > 0 && full.includes(id));
    if (!triggered) {
      triggered = terms.some((term) => lower.includes(term));
    }
    if (!triggered) {
      for (const match of full.matchAll(RUN_FACT_NUMBER)) {
        if (factNumbers.has(Number(match[1]))) {
          triggered = true;
          break;
        }
      }
    }
    if (!triggered) {
      continue;
    }
    seen.add(full);
    total += 1;
    if (matched.length < max) {
      matched.push({
        anchor: RUN_FACTS_ANCHOR,
        draftExcerpt: full.slice(0, maxExcerptChars),
        pool,
      });
    }
  }
  return { pairs: matched, truncated: total > matched.length };
}
