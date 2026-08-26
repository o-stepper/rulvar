/**
 * The anchor grounding lint (RV4601, the seventh comparison
 * experiment's P1.3 remainder): a zero cost finish validator that
 * catches PHYSICALLY VALID citations pointing at the WRONG LINE. The
 * seventh run's rejected candidate carried two: `pointer/package.json:10`
 * (the exports block) cited for a caret dependency that lives at line
 * 23, and `packages/rulvar/package.json:2` (the name line) cited for
 * dependencies that live at lines 32..34. Both resolved, both passed
 * every configured check, and both cost the candidate its independent
 * audit verdict. This validator is the prose sibling of
 * {@link citedValueValidator}: that one judges inline code spans the
 * sentence asserts, this one judges the claim's own identifier
 * vocabulary, so a sentence citing without backticks is no longer
 * invisible; and {@link citationTargetsValidator} keeps existence and
 * line bounds, so an anchor nothing resolves is that validator's
 * verdict and is deliberately SKIPPED here.
 *
 * The verdict is deliberately conservative, because a lint that cries
 * wolf burns bounded repairs the run cannot afford:
 *
 * - only DECIDING tokens flag: inline code spans, scoped package
 *   names, dotted or snake or camel case identifiers, and the caret
 *   and tilde the prose names in words. Plain words never flag; they
 *   are too weak a signal against paraphrase.
 * - identity spans never flag (the {@link citedValueValidator} RV2502
 *   doctrine): commit shas, release versions, and the run's own id
 *   name WHICH artifact the document is about, not content the cited
 *   line must carry.
 * - a token that names the anchor's own path (or a path at all) says
 *   WHERE, never WHAT, and is excluded.
 * - the flag needs somewhere better to point: a token absent from the
 *   ENTIRE cited file is a claim truth question for the semantic
 *   judges (a negated claim legitimately cites a file for what it
 *   does NOT contain), so a finding exists only when the asserted
 *   token is present in the file OUTSIDE the resolved window, and the
 *   finding names those exact lines as the repair target.
 *
 * Windows are the resolver v2 units ({@link citationUnitExcerptOf},
 * RV4401) with a grace tail below, because a comment documents what
 * follows it; a `.json` anchor instead resolves to its STRUCTURAL
 * block (the brace or bracket span the cited line opens, or the leaf
 * property line with two lines of slack) with no grace, because a
 * JSON block is closed and content outside it is a different
 * property. The two wrong anchors of the seventh candidate are both
 * json anchors, and the generous paragraph unit would have swallowed
 * the very lines they should have cited.
 *
 * A compound sentence lints per anchor against the anchor's nearest
 * claim clause ({@link clauseAround}), then once more as a whole: a
 * deciding token no cited window of the sentence carries flags the
 * anchor whose FILE carries it, so a caret asserted in the first
 * clause still convicts the pointer anchor cited at the sentence's
 * end. `resolve` is the same pure snapshot resolver every citation
 * check reads; fenced code is stripped before scanning. Default name
 * 'anchor-grounding'.
 */
import { ConfigError } from '../l0/errors.js';

import { citationUnitExcerptOf, clauseAround } from './citation-audit.js';
import type { CitationExcerptUnit } from './citation-audit.js';
import {
  DEFAULT_CITATION_PATTERN,
  stripFencedBlocks,
  type CitationTarget,
  type FinishValidator,
} from './finish-validators.js';
import { sentencesOf } from './sentences.js';

/** Grace lines read below a non json unit (a comment documents what follows). */
export const ANCHOR_GROUNDING_GRACE_LINES = 8;
/** Slack around a leaf json line (the adjacent property is the same fact). */
export const ANCHOR_GROUNDING_JSON_LEAF_SLACK = 2;
/** Findings the verdict carries at most; the rest wait for the next pass. */
export const MAX_ANCHOR_GROUNDING_FINDINGS = 8;
/** Suggested lines per finding at most. */
export const MAX_ANCHOR_GROUNDING_SUGGESTIONS = 3;
/** How deep the suggestion scan reads a file before giving up. */
export const MAX_ANCHOR_GROUNDING_SCAN_LINES = 20000;

const SHA_SPAN = /^[0-9a-f]{12,64}$/u;
const VERSION_SPAN = /^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z][0-9A-Za-z.-]*)?$/u;
/** A path shaped token names WHERE, never WHAT; anchors included. */
const PATH_SPAN =
  /^[\w./-]*\/[\w./-]*(?::\d+(?:-\d+)?)?$|^[\w.-]+\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|json|md|ya?ml|txt|lock|toml|sql|sh)(?::\d+(?:-\d+)?)?$/iu;
/** Words the prose writes for literals the source spells as bytes. */
const DEFAULT_LEXICON: Readonly<Record<string, string>> = { caret: '^', tilde: '~' };
/**
 * Prose words too common to assert anything; a host adds its own with
 * `stopWords` (the {@link citedValueValidator} `notValues` posture).
 */
const STOP_WORDS = new Set([
  'this',
  'that',
  'with',
  'from',
  'into',
  'only',
  'over',
  'when',
  'where',
  'does',
  'been',
  'have',
  'will',
  'must',
  'each',
  'then',
  'than',
  'them',
  'they',
  'their',
  'while',
  'about',
  'production',
  'implemented',
  'documented',
  'tested',
  'live',
  'observed',
  'ready',
  'conditionally',
  'unresolved',
  'source',
  'status',
  'block',
  'line',
  'lines',
  'file',
  'files',
  'test',
  'tests',
  'check',
  'checks',
  'host',
  'engine',
  'package',
  'packages',
  'docs',
  'guide',
  'core',
]);

/** One asserted token, with the class that decides its weight. */
interface GroundingToken {
  readonly value: string;
  /** 'code' and 'symbol' decide; 'word' only ever suggests. */
  readonly kind: 'code' | 'symbol' | 'word';
}

/** One suggested repair target inside the cited file. */
export interface AnchorGroundingSuggestion {
  readonly line: number;
  readonly token: string;
  readonly text: string;
}

/** One wrong line finding of {@link anchorGroundingFindingsOf}. */
export interface AnchorGroundingFinding {
  readonly sentence: string;
  readonly anchor: string;
  readonly path: string;
  readonly line: number;
  readonly endLine?: number;
  /**
   * 'clause' convicted the anchor against its own claim clause;
   * 'sentence' convicted it as the sentence's only anchor whose FILE
   * carries a token no cited window does.
   */
  readonly scope: 'clause' | 'sentence';
  /** The deciding tokens the resolved window never carries. */
  readonly tokens: readonly string[];
  /** The resolved window, 1 based and inclusive. */
  readonly windowFirstLine: number;
  readonly windowLastLine: number;
  /** The unit the window came from; absent for the structural json block. */
  readonly unit?: CitationExcerptUnit;
  /** Exact lines inside the cited file that DO carry a deciding token. */
  readonly suggestions: readonly AnchorGroundingSuggestion[];
}

/** The options of {@link anchorGroundingFindingsOf} and the validator. */
export interface AnchorGroundingOptions {
  /** The pure snapshot resolver every citation check reads. */
  resolve: (target: CitationTarget) => string | undefined;
  /** Overrides {@link DEFAULT_CITATION_PATTERN}; must expose `path:line`. */
  pattern?: string;
  /** Extra stop words this host's prose writes as filler. */
  stopWords?: readonly string[];
  /** Extra word to literal expansions beside caret and tilde. */
  lexicon?: Readonly<Record<string, string>>;
  /** The run id, excluded as identity when present. */
  runId?: string;
}

const CITATION_TAIL = /^(.*):(\d+)$/u;

/** True when `value` sits in `haystack` as a whole token (RV1402). */
function wholeToken(haystack: string, value: string): boolean {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`(?<![\\w.])${escaped}(?![\\w.])`, 'iu').test(haystack);
}

/** Camel halves long enough to identify on their own. */
function camelParts(token: string): string[] {
  const parts = token.match(/[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])/gu) ?? [];
  return parts.filter((part) => part.length >= 5).map((part) => part.toLowerCase());
}

/** English plural folding, enough for dependency vs dependencies. */
function stemOf(word: string): string {
  const lower = word.toLowerCase();
  if (lower.endsWith('ies')) {
    return `${lower.slice(0, -3)}y`;
  }
  if (lower.endsWith('es')) {
    return lower.slice(0, -2);
  }
  if (lower.endsWith('s')) {
    return lower.slice(0, -1);
  }
  return lower;
}

/**
 * True when the anchor's own path carries the token: a token naming
 * the cited file supports WHERE, so it can never convict the anchor.
 * The prefix rule is the {@link tokenMatches} one: a path segment of
 * six or more characters that prefixes the token counts, so
 * PostgreSQL is carried by store-postgres without a vendor table.
 */
function pathCarries(path: string, token: GroundingToken): boolean {
  if (token.kind === 'symbol') {
    return false;
  }
  const pathLower = path.toLowerCase();
  const base = token.value.toLowerCase();
  if (pathLower.includes(base)) {
    return true;
  }
  return (pathLower.match(/[a-z]{6,}/gu) ?? []).some((segment) => base.startsWith(segment));
}

function tokenMatches(token: GroundingToken, haystack: string): boolean {
  if (token.kind === 'symbol') {
    return haystack.includes(token.value);
  }
  if (wholeToken(haystack, token.value)) {
    return true;
  }
  const lower = haystack.toLowerCase();
  const base = token.value.toLowerCase();
  // A word of six or more characters that PREFIXES the token counts:
  // the prose writes PostgreSQL where the source spells postgres, and
  // a table of vendor aliases would chase that forever.
  if ((lower.match(/[a-z]{6,}/gu) ?? []).some((word) => base.startsWith(word))) {
    return true;
  }
  if (token.kind === 'word') {
    const stem = stemOf(token.value);
    return (haystack.match(/[A-Za-z]{4,}/gu) ?? []).some((word) => stemOf(word) === stem);
  }
  return camelParts(token.value).some((part) => lower.includes(part));
}

/**
 * The asserted tokens of one claim text: what the sentence names that
 * the cited window must carry. Anchors, paths, identity spans, stop
 * words, and words naming the anchor's own path are all excluded; the
 * rules are the doc comment's, in code order.
 */
function tokensOf(
  claim: string,
  anchorsInSentence: readonly string[],
  ownPath: string,
  stop: ReadonlySet<string>,
  lexicon: Readonly<Record<string, string>>,
  runId: string | undefined,
): GroundingToken[] {
  const found = new Map<string, GroundingToken['kind']>();
  const add = (value: string, kind: GroundingToken['kind']): void => {
    if (value !== '' && !found.has(value)) {
      found.set(value, kind);
    }
  };
  for (const span of claim.match(/`[^`]+`/gu) ?? []) {
    add(span.slice(1, -1).trim(), 'code');
  }
  let plain = claim.replace(/`[^`]+`/gu, ' ');
  for (const anchor of anchorsInSentence) {
    plain = plain.split(anchor).join(' ');
  }
  for (const match of plain.match(/@[\w-]+\/[\w./-]+/gu) ?? []) {
    add(match, 'code');
  }
  for (const match of plain.match(/\b[\w-]+\.[\w.-]*[A-Za-z][\w.-]*\b/gu) ?? []) {
    add(match, 'code');
  }
  for (const match of plain.match(/\b[A-Za-z][a-z0-9]*[A-Z][A-Za-z0-9]*\b/gu) ?? []) {
    add(match, match === match.toUpperCase() ? 'word' : 'code');
  }
  for (const match of plain.match(/\b[a-z]+_[a-z0-9_]+\b/gu) ?? []) {
    add(match, 'code');
  }
  const lower = plain.toLowerCase();
  for (const [word, literal] of Object.entries(lexicon)) {
    if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\b`, 'u').test(lower)) {
      add(literal, 'symbol');
    }
  }
  for (const match of plain.match(/\b[A-Za-z]{4,}\b/gu) ?? []) {
    add(match, 'word');
  }
  const pathLower = ownPath.toLowerCase();
  const tokens: GroundingToken[] = [];
  for (const [value, kind] of found) {
    const base = value.toLowerCase();
    if (SHA_SPAN.test(base) || VERSION_SPAN.test(value) || PATH_SPAN.test(value)) {
      continue;
    }
    if (runId !== undefined && value === runId) {
      continue;
    }
    if (stop.has(base)) {
      continue;
    }
    if (kind !== 'symbol' && value.length < 4) {
      continue;
    }
    if (pathLower !== '' && pathCarries(ownPath, { value, kind })) {
      continue;
    }
    tokens.push({ value, kind });
  }
  return tokens;
}

/** The brace or bracket span a json line opens, or the leaf with slack. */
function jsonBlockRange(lines: readonly string[], line: number): [number, number] {
  const index = line - 1;
  const text = lines[index] ?? '';
  const opens = (text.match(/[{[]/gu) ?? []).length;
  const closes = (text.match(/[}\]]/gu) ?? []).length;
  if (opens > closes) {
    let depth = opens - closes;
    let end = index;
    for (let next = index + 1; next < Math.min(lines.length, index + 60); next += 1) {
      depth += (lines[next]?.match(/[{[]/gu) ?? []).length;
      depth -= (lines[next]?.match(/[}\]]/gu) ?? []).length;
      end = next;
      if (depth <= 0) {
        break;
      }
    }
    return [index + 1, end + 1];
  }
  return [
    Math.max(1, line - ANCHOR_GROUNDING_JSON_LEAF_SLACK),
    Math.min(lines.length, line + ANCHOR_GROUNDING_JSON_LEAF_SLACK),
  ];
}

/** First and last line numbers of a `L<n>: text` excerpt. */
function excerptBounds(excerpt: string): [number, number] | undefined {
  const numbers = [...excerpt.matchAll(/(?:^|\n)L(\d+): /gu)].map((match) => Number(match[1]));
  const first = numbers[0];
  const last = numbers[numbers.length - 1];
  return first === undefined || last === undefined ? undefined : [first, last];
}

interface ResolvedAnchor {
  readonly anchor: string;
  readonly position: number;
  readonly path: string;
  readonly line: number;
  readonly endLine?: number;
  readonly windowFirstLine: number;
  readonly windowLastLine: number;
  readonly window: string;
  readonly unit?: CitationExcerptUnit;
  clauseFlagged?: boolean;
}

/**
 * The pure engine behind {@link anchorGroundingValidator}: every wrong
 * line finding of `text` against the snapshot, in document order. The
 * validator renders these as reasons; a harness reads them directly.
 */
export function anchorGroundingFindingsOf(
  text: string,
  options: AnchorGroundingOptions,
): AnchorGroundingFinding[] {
  if (typeof options.resolve !== 'function') {
    throw new ConfigError('anchorGroundingFindingsOf resolve must be a function');
  }
  const pattern = options.pattern ?? DEFAULT_CITATION_PATTERN;
  try {
    new RegExp(pattern, 'gu');
  } catch (thrown) {
    throw new ConfigError(
      `anchorGroundingFindingsOf pattern does not compile: ${
        thrown instanceof Error ? thrown.message : String(thrown)
      }`,
    );
  }
  if (new RegExp(pattern, 'u').test('')) {
    throw new ConfigError(
      `anchorGroundingFindingsOf pattern must not be able to match the empty string; ` +
        `got ${JSON.stringify(pattern)}`,
    );
  }
  if (options.stopWords !== undefined) {
    if (
      !Array.isArray(options.stopWords) ||
      options.stopWords.some((word) => typeof word !== 'string' || word.length === 0)
    ) {
      throw new ConfigError(
        'anchorGroundingFindingsOf stopWords must be an array of non empty strings',
      );
    }
  }
  if (options.lexicon !== undefined) {
    const entries = Object.entries(options.lexicon as Record<string, unknown>);
    if (
      entries.some(
        ([word, literal]) => word === '' || typeof literal !== 'string' || literal === '',
      )
    ) {
      throw new ConfigError(
        'anchorGroundingFindingsOf lexicon must map non empty words to non empty literals',
      );
    }
  }
  const hostStop: readonly string[] = options.stopWords ?? [];
  const stop = new Set([...STOP_WORDS, ...hostStop.map((word) => word.toLowerCase())]);
  const lexicon = { ...DEFAULT_LEXICON, ...(options.lexicon ?? {}) };
  const fileCache = new Map<string, string[]>();
  const fileLines = (path: string): readonly string[] => {
    const cached = fileCache.get(path);
    if (cached !== undefined) {
      return cached;
    }
    const lines: string[] = [];
    for (let line = 1; line <= MAX_ANCHOR_GROUNDING_SCAN_LINES; line += 1) {
      const value = options.resolve({ path, line });
      if (value === undefined) {
        break;
      }
      lines.push(value);
    }
    fileCache.set(path, lines);
    return lines;
  };
  const cachedResolve = (target: CitationTarget): string | undefined =>
    fileLines(target.path)[target.line - 1];
  const suggest = (
    path: string,
    tokens: readonly GroundingToken[],
  ): AnchorGroundingSuggestion[] => {
    const lines = fileLines(path);
    const found: AnchorGroundingSuggestion[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      const token = tokens.find((candidate) => tokenMatches(candidate, line));
      if (token !== undefined) {
        found.push({ line: index + 1, token: token.value, text: line.trim().slice(0, 120) });
        if (found.length >= MAX_ANCHOR_GROUNDING_SUGGESTIONS) {
          break;
        }
      }
    }
    return found;
  };
  const findings: AnchorGroundingFinding[] = [];
  for (const sentence of sentencesOf(stripFencedBlocks(text))) {
    const resolved: ResolvedAnchor[] = [];
    const anchorTexts: string[] = [];
    const scanner = new RegExp(pattern, 'gu');
    for (let match = scanner.exec(sentence); match !== null; match = scanner.exec(sentence)) {
      if (match[0].length === 0) {
        scanner.lastIndex += 1;
        continue;
      }
      const tail = /^-(\d+)/u.exec(sentence.slice(match.index + match[0].length));
      const anchor = tail === null ? match[0] : `${match[0]}${tail[0]}`;
      anchorTexts.push(anchor);
      const parsed = CITATION_TAIL.exec(match[0]);
      if (parsed === null) {
        continue;
      }
      const path = parsed[1] ?? '';
      const line = Number(parsed[2]);
      if (!Number.isSafeInteger(line) || line < 1) {
        continue;
      }
      const endLine = tail === null ? undefined : Number(tail[1]);
      const lines = fileLines(path);
      // Existence and bounds belong to citationTargetsValidator; an
      // anchor nothing resolves is skipped, never double reported.
      if (lines.length === 0 || line > lines.length) {
        continue;
      }
      if (path.toLowerCase().endsWith('.json')) {
        const [first, last] = jsonBlockRange(lines, line);
        resolved.push({
          anchor,
          position: match.index,
          path,
          line,
          ...(endLine === undefined ? {} : { endLine }),
          windowFirstLine: first,
          windowLastLine: last,
          window: lines.slice(first - 1, last).join('\n'),
        });
        continue;
      }
      const excerpt = citationUnitExcerptOf(cachedResolve, {
        path,
        line,
        ...(endLine === undefined ? {} : { endLine }),
      });
      if (excerpt === undefined) {
        continue;
      }
      const bounds = excerptBounds(excerpt.excerpt) ?? [line, line];
      const graceLast = Math.min(lines.length, bounds[1] + ANCHOR_GROUNDING_GRACE_LINES);
      resolved.push({
        anchor,
        position: match.index,
        path,
        line,
        ...(endLine === undefined ? {} : { endLine }),
        windowFirstLine: bounds[0],
        windowLastLine: graceLast,
        window: lines.slice(bounds[0] - 1, graceLast).join('\n'),
        unit: excerpt.unit,
      });
    }
    if (resolved.length === 0) {
      continue;
    }
    // Pass one: each anchor against its own claim clause.
    for (const anchor of resolved) {
      const clause = clauseAround(sentence, anchor.position);
      const clauseTokens = tokensOf(clause, anchorTexts, anchor.path, stop, lexicon, options.runId);
      const deciding = clauseTokens.filter((token) => token.kind !== 'word');
      if (deciding.length === 0) {
        continue;
      }
      const hit = deciding.some(
        (token) => tokenMatches(token, anchor.window) || pathCarries(anchor.path, token),
      );
      if (hit) {
        continue;
      }
      const outside = suggest(anchor.path, deciding).filter(
        (candidate) =>
          candidate.line < anchor.windowFirstLine || candidate.line > anchor.windowLastLine,
      );
      if (outside.length === 0) {
        continue;
      }
      anchor.clauseFlagged = true;
      findings.push({
        sentence,
        anchor: anchor.anchor,
        path: anchor.path,
        line: anchor.line,
        ...(anchor.endLine === undefined ? {} : { endLine: anchor.endLine }),
        scope: 'clause',
        tokens: deciding.map((token) => token.value),
        windowFirstLine: anchor.windowFirstLine,
        windowLastLine: anchor.windowLastLine,
        ...(anchor.unit === undefined ? {} : { unit: anchor.unit }),
        suggestions: outside,
      });
    }
    // Pass two: sentence tokens no cited window carries convict the
    // anchor whose FILE carries them.
    const sentenceTokens = tokensOf(sentence, anchorTexts, '', stop, lexicon, options.runId);
    for (const token of sentenceTokens.filter((candidate) => candidate.kind !== 'word')) {
      const covered = resolved.some(
        (anchor) => tokenMatches(token, anchor.window) || pathCarries(anchor.path, token),
      );
      if (covered) {
        continue;
      }
      const convicted = resolved.find(
        (anchor) =>
          anchor.clauseFlagged !== true &&
          suggest(anchor.path, [token]).some(
            (candidate) =>
              candidate.line < anchor.windowFirstLine || candidate.line > anchor.windowLastLine,
          ),
      );
      if (convicted === undefined) {
        continue;
      }
      convicted.clauseFlagged = true;
      findings.push({
        sentence,
        anchor: convicted.anchor,
        path: convicted.path,
        line: convicted.line,
        ...(convicted.endLine === undefined ? {} : { endLine: convicted.endLine }),
        scope: 'sentence',
        tokens: [token.value],
        windowFirstLine: convicted.windowFirstLine,
        windowLastLine: convicted.windowLastLine,
        ...(convicted.unit === undefined ? {} : { unit: convicted.unit }),
        suggestions: suggest(convicted.path, [token]).filter(
          (candidate) =>
            candidate.line < convicted.windowFirstLine || candidate.line > convicted.windowLastLine,
        ),
      });
    }
    if (findings.length >= MAX_ANCHOR_GROUNDING_FINDINGS) {
      break;
    }
  }
  return findings.slice(0, MAX_ANCHOR_GROUNDING_FINDINGS);
}

/**
 * The wrong line lint as a finish validator. Each finding is one
 * reason naming the anchor, the resolved window, the asserted tokens
 * it never carries, and the exact lines that do, so the repair turn
 * moves the anchor instead of guessing. Default name
 * 'anchor-grounding'; see the module comment for the doctrine.
 */
export function anchorGroundingValidator(
  options: AnchorGroundingOptions & { name?: string },
): FinishValidator {
  const probe: AnchorGroundingOptions = {
    resolve: options.resolve,
    ...(options.pattern === undefined ? {} : { pattern: options.pattern }),
    ...(options.stopWords === undefined ? {} : { stopWords: options.stopWords }),
    ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
    ...(options.runId === undefined ? {} : { runId: options.runId }),
  };
  // Intake runs once at construction: a bad option is a host defect,
  // never a repair turn.
  anchorGroundingFindingsOf('', probe);
  return {
    name: options.name ?? 'anchor-grounding',
    validate: (input) => {
      const findings = anchorGroundingFindingsOf(input.text, {
        ...probe,
        ...(input.runId === undefined ? {} : { runId: input.runId }),
      });
      if (findings.length === 0) {
        return { ok: true };
      }
      return {
        ok: false,
        reasons: findings.map((finding) => {
          const suggested = finding.suggestions
            .map((entry) => `line ${String(entry.line)} ('${entry.text}')`)
            .join(', ');
          return (
            `citation ${finding.anchor} resolves to lines ` +
            `${String(finding.windowFirstLine)}..${String(finding.windowLastLine)}, which never ` +
            `carry ${finding.tokens.join(', ')} the claim asserts; the asserted content lives at ` +
            `${suggested}; move the citation to the line that carries the assertion`
          );
        }),
      };
    },
  };
}
