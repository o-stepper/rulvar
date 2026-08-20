// The citation entailment audit (RV4004, the fifth comparison
// experiment).
//
// The run's built-in verification judged VALUES (cited-value), TARGETS
// (citation-targets), and CONSISTENCY (the claim pass, child readings
// against draft claims), and the answer still shipped three citations
// whose cited lines simply do not carry the claimed meaning: an
// exporter attribute policy cited as proof that no SLO observations
// exist, a providerExecutedTools gate cited as capability inference, a
// shared QuotaLimiter cited as executor isolation. Every one was
// mechanically valid (the target resolves), value-clean (no asserted
// literal disagreed), and invisible to the claim pass (the pool held
// no reading of those files at all: 20 of 74 citing sentences had no
// candidates, and child-against-final pairing can never cover them).
// The independent judge caught all three the same way: sample citing
// sentences per section, READ the cited lines, and ask whether the
// text entails the sentence. This module is that method, internalized:
// a deterministic stratified sample, excerpts through the host's own
// pure snapshot resolver (the citedValueValidator channel), and a
// judged verdict per sampled citation.
//
// Everything here is pure and replay-stable: the sample derives from
// the audited document's hash, the excerpts from a resolver the host
// froze before the run, and the judge dispatch (in orchestrate.ts)
// journals like every other invocation.
import { createHash } from 'node:crypto';

import { ConfigError } from '../l0/errors.js';
import { sentencesOf } from './sentences.js';
import { DEFAULT_CITATION_PATTERN } from './finish-validators.js';
import type { CitationTarget } from './finish-validators.js';

/** One sampled citation occurrence, before any verdict. */
export interface CitationAuditRow {
  /** Zero-based row index, the judge's addressing. */
  row: number;
  /** The owning H2 marker, or '' for text above the first heading. */
  section: string;
  /** The citing sentence, verbatim. */
  sentence: string;
  /** The raw citation text as it appears in the sentence. */
  anchor: string;
  path: string;
  line: number;
  /** The range end when the citation is `path:start-end`. */
  endLine?: number;
  /**
   * Which anchor of a compound sentence this row audits (RV4208,
   * resolver v2 only): zero-based, in sentence order. Resolver v1
   * samples only a sentence's FIRST anchor, so the field is absent
   * there and on every earlier row.
   */
  anchorOrdinal?: number;
  /**
   * The claim clause NEAREST this row's anchor (RV4208, resolver v2
   * only): the sentence segment, split at clause boundaries, that
   * contains the anchor. A compound sentence cites three files for
   * three different claims; judging each anchor against the WHOLE
   * sentence asks whether the lines entail claims they were never
   * cited for.
   */
  clause?: string;
  /**
   * The resolved lines, `L<n>: <text>` per line. Absent when the
   * FIRST cited line does not resolve in the host snapshot, which is
   * itself an unsupported verdict: a citation nothing resolves is not
   * provenance (the citedValueValidator doctrine).
   */
  excerpt?: string;
  /**
   * What resolver v2 excerpted (RV4208): the bounded logical unit's
   * type, its line count, and whether the caps clipped it. Absent
   * under resolver v1, whose window is fixed and self-describing.
   */
  unit?: CitationExcerptUnit;
}

/** The bounded logical unit resolver v2 excerpts (RV4208). */
export interface CitationExcerptUnit {
  /**
   * 'section' a heading plus its body to the next heading; 'list-item'
   * a list marker plus its continuation lines; 'table-row' a table row
   * with its header pair when adjacent; 'comment-declaration' a code
   * comment block plus the declaration it documents; 'paragraph' a
   * blank-line-delimited run, the default.
   */
  type: 'section' | 'list-item' | 'table-row' | 'comment-declaration' | 'paragraph';
  /** Lines the excerpt carries. */
  lines: number;
  /** Present when the line or char caps clipped the unit. */
  truncated?: true;
}

/** One judged (or mechanically decided) non-supported citation. */
export interface CitationAuditFinding {
  row: number;
  section: string;
  sentence: string;
  anchor: string;
  verdict: 'partial' | 'unsupported';
  reason: string;
}

/** The per-section slice of the audit meta. */
export interface CitationAuditSectionMeta {
  sampled: number;
  supported: number;
  partial: number;
  unsupported: number;
}

/** The declared audit options, exactly OrchestrateCitationAudit. */
export interface CitationAuditPlanOptions {
  /** Overrides {@link DEFAULT_CITATION_PATTERN}; must expose `path:line[-end]`. */
  pattern?: string;
  /** Sampled citing sentences per H2 section; default 2, the judge's own method. */
  samplePerSection?: number;
  /** The hard whole-document ceiling; default 24, the judge's own budget. */
  maxSampled?: number;
  /** Lines after the cited line an excerpt may carry; default 3. */
  window?: number;
  /**
   * The resolver generation (RV4208): 1, the default, is the fixed
   * downward window above, byte identical for every existing config.
   * 2 excerpts the bounded LOGICAL UNIT the cited line belongs to
   * ({@link citationUnitExcerptOf}) and audits EVERY anchor of a
   * compound sentence as its own row against its nearest claim
   * clause. The sixth comparison experiment's false negatives were
   * exactly window artifacts: a section heading whose support lives
   * below the window, and only a sentence's first anchor ever
   * sampled. Opt-in because the sample derives from the document
   * hash: v2 changes which rows exist and what the judge reads, so a
   * declared config must choose it.
   */
  resolver?: 1 | 2;
}

export const DEFAULT_CITATION_SAMPLE_PER_SECTION = 2;
export const DEFAULT_CITATION_MAX_SAMPLED = 24;
export const DEFAULT_CITATION_EXCERPT_WINDOW = 3;
/** Excerpt bounds, the claim-pass excerpt discipline. */
export const MAX_CITATION_EXCERPT_LINES = 12;
export const MAX_CITATION_EXCERPT_CHARS = 800;

/** A citation with an optional `-end` range tail on the line half. */
const citationWithRange = (pattern: string): RegExp => new RegExp(pattern, 'gu');

const RANGE_TAIL = /^(.*):(\d+)(?:-(\d+))?$/u;

/**
 * Validates the declared plan numbers; returns the resolved bounds.
 * Garbage throws like every malformed intake.
 */
export function resolveCitationAuditPlan(options: CitationAuditPlanOptions): {
  pattern: string;
  samplePerSection: number;
  maxSampled: number;
  window: number;
  resolver: 1 | 2;
} {
  const resolver = options.resolver ?? 1;
  if (resolver !== 1 && resolver !== 2) {
    throw new ConfigError(
      `citationAudit.resolver must be 1 or 2; got ${JSON.stringify(options.resolver)}`,
    );
  }
  const samplePerSection = options.samplePerSection ?? DEFAULT_CITATION_SAMPLE_PER_SECTION;
  if (!Number.isInteger(samplePerSection) || samplePerSection < 1) {
    throw new ConfigError(
      `citationAudit.samplePerSection must be a positive integer; got ${String(
        options.samplePerSection,
      )}`,
    );
  }
  const maxSampled = options.maxSampled ?? DEFAULT_CITATION_MAX_SAMPLED;
  if (!Number.isInteger(maxSampled) || maxSampled < 1) {
    throw new ConfigError(
      `citationAudit.maxSampled must be a positive integer; got ${String(options.maxSampled)}`,
    );
  }
  const window = options.window ?? DEFAULT_CITATION_EXCERPT_WINDOW;
  if (!Number.isInteger(window) || window < 0) {
    throw new ConfigError(
      `citationAudit.window must be a non negative integer; got ${String(options.window)}`,
    );
  }
  const pattern = options.pattern ?? DEFAULT_CITATION_PATTERN;
  let probe: RegExp;
  try {
    probe = new RegExp(pattern, 'gu');
  } catch (thrown) {
    throw new ConfigError(
      `citationAudit.pattern does not compile: ${
        thrown instanceof Error ? thrown.message : String(thrown)
      }`,
    );
  }
  if (probe.test('')) {
    throw new ConfigError(
      'citationAudit.pattern matches the empty string: it would flood the sample instead of ' +
        'anchoring it',
    );
  }
  return { pattern, samplePerSection, maxSampled, window, resolver };
}

/** Splits a document into (section marker, body) runs in order. */
function sectionsOfDocument(document: string): Array<{ marker: string; body: string }> {
  const lines = document.split('\n');
  const runs: Array<{ marker: string; body: string[] }> = [{ marker: '', body: [] }];
  for (const line of lines) {
    if (/^##\s+\S/u.test(line) && !line.startsWith('###')) {
      runs.push({ marker: line.trim(), body: [] });
      continue;
    }
    runs.at(-1)?.body.push(line);
  }
  return runs
    .map((run) => ({ marker: run.marker, body: run.body.join('\n') }))
    .filter((run) => run.body.trim().length > 0);
}

/** The deterministic per-section pick: seeded index selection without replacement. */
function pickIndexes(count: number, k: number, seedInput: string): number[] {
  const indexes = Array.from({ length: count }, (_, index) => index);
  const picked: number[] = [];
  for (let round = 0; round < Math.min(k, count); round += 1) {
    const digest = createHash('sha256')
      .update(`${seedInput}:${String(round)}`)
      .digest();
    const index = digest.readUInt32BE(0) % indexes.length;
    const chosen = indexes.splice(index, 1)[0];
    if (chosen !== undefined) {
      picked.push(chosen);
    }
  }
  return picked.sort((a, b) => a - b);
}

/**
 * The deterministic stratified sample (RV4004): per H2 section, up to
 * `samplePerSection` citing sentences, selected by a hash chain seeded
 * from the audited document's own hash, so the same candidate always
 * yields the same sample (replay-stable, no clock, no randomness) and
 * a repaired candidate re-samples afresh from its new hash. The whole
 * sample is capped at `maxSampled` by pick rank across sections (every
 * section's first pick seats before any section's second), so a
 * many-section document degrades to one citation per section instead
 * of auditing the first sections only.
 */
export function sampleCitationRows(
  document: string,
  plan: { pattern: string; samplePerSection: number; maxSampled: number; resolver?: 1 | 2 },
  seed: string,
): Omit<CitationAuditRow, 'excerpt'>[] {
  const allAnchors = plan.resolver === 2;
  interface AnchorCandidate {
    sentence: string;
    anchor: string;
    path: string;
    line: number;
    endLine?: number;
    anchorOrdinal?: number;
    clause?: string;
  }
  const perSection: Array<{ section: string; picks: AnchorCandidate[][] }> = [];
  for (const { marker, body } of sectionsOfDocument(document)) {
    // One candidate GROUP per citing sentence: resolver v1 keeps the
    // sentence's first anchor only (byte identical to the original
    // sampler), v2 audits every anchor as its own row (RV4208): the
    // sixth comparison run's compound sentences cited three files for
    // three claims and only the first was ever sampled.
    const candidates: AnchorCandidate[][] = [];
    for (const sentence of sentencesOf(body)) {
      const probe = citationWithRange(plan.pattern);
      const anchors: AnchorCandidate[] = [];
      for (let match = probe.exec(sentence); match !== null; match = probe.exec(sentence)) {
        // The line half may carry a `-end` range the base pattern
        // does not capture; read the tail at the match site.
        const tail = /^-(\d+)/u.exec(sentence.slice(match.index + match[0].length));
        const anchorText = tail === null ? match[0] : `${match[0]}${tail[0]}`;
        const parsed = RANGE_TAIL.exec(anchorText);
        if (parsed === null) {
          continue;
        }
        const path = parsed[1] ?? '';
        const line = Number(parsed[2]);
        const endLine = parsed[3] === undefined ? undefined : Number(parsed[3]);
        if (path === '' || !Number.isInteger(line) || line < 1) {
          continue;
        }
        anchors.push({
          sentence,
          anchor: anchorText,
          path,
          line,
          ...(endLine !== undefined && Number.isInteger(endLine) && endLine >= line
            ? { endLine }
            : {}),
          ...(allAnchors
            ? { anchorOrdinal: anchors.length, clause: clauseAround(sentence, match.index) }
            : {}),
        });
        if (!allAnchors) {
          break;
        }
      }
      if (anchors.length > 0) {
        candidates.push(anchors);
      }
    }
    if (candidates.length === 0) {
      continue;
    }
    const picks = pickIndexes(candidates.length, plan.samplePerSection, `${seed}:${marker}`)
      .map((index) => candidates[index])
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== undefined);
    perSection.push({ section: marker, picks });
  }
  // Cap by pick rank across sections: round-robin, document order. A
  // v2 pick expands into its anchor rows in sentence order, under the
  // same hard row ceiling.
  const rows: Omit<CitationAuditRow, 'excerpt'>[] = [];
  for (let rank = 0; rows.length < plan.maxSampled; rank += 1) {
    let any = false;
    for (const bucket of perSection) {
      const pick = bucket.picks[rank];
      if (pick === undefined) {
        continue;
      }
      any = true;
      for (const anchor of pick) {
        if (rows.length >= plan.maxSampled) {
          break;
        }
        rows.push({ row: rows.length, section: bucket.section, ...anchor });
      }
    }
    if (!any) {
      break;
    }
  }
  return rows;
}

/**
 * The claim clause nearest an anchor (RV4208): the sentence segment,
 * cut at clause boundaries (';' or ',' followed by whitespace), that
 * contains the anchor position. Pure text arithmetic, no NLP: the
 * point is to hand the judge the claim half the anchor was cited FOR
 * instead of the whole compound sentence.
 */
export function clauseAround(sentence: string, anchorIndex: number): string {
  let start = 0;
  const cuts = /[;,]\s/gu;
  for (let cut = cuts.exec(sentence); cut !== null; cut = cuts.exec(sentence)) {
    if (cut.index >= anchorIndex) {
      return sentence.slice(start, cut.index + 1).trim();
    }
    start = cut.index + 1;
  }
  return sentence.slice(start).trim();
}

/**
 * Resolves one sampled citation's excerpt through the host's pure
 * snapshot resolver. The FIRST cited line failing to resolve returns
 * undefined (an unsupported citation by doctrine); later lines simply
 * end the excerpt (a range past the file's end reads as far as the
 * snapshot goes).
 */
export function citationExcerptOf(
  resolve: (target: CitationTarget) => string | undefined,
  row: Pick<CitationAuditRow, 'path' | 'line' | 'endLine'>,
  window: number,
): string | undefined {
  const last = Math.min(
    row.endLine ?? row.line + window,
    row.line + MAX_CITATION_EXCERPT_LINES - 1,
  );
  const lines: string[] = [];
  for (let line = row.line; line <= last; line += 1) {
    const text = resolve({ path: row.path, line });
    if (text === undefined) {
      if (line === row.line) {
        return undefined;
      }
      break;
    }
    lines.push(`L${String(line)}: ${text}`);
  }
  const excerpt = lines.join('\n');
  return excerpt.length > MAX_CITATION_EXCERPT_CHARS
    ? `${excerpt.slice(0, MAX_CITATION_EXCERPT_CHARS)}…`
    : excerpt;
}

const HEADING = /^#{1,6}\s+\S/u;
const LIST_ITEM = /^(\s*)(?:[-*+]|\d+[.)])\s+\S/u;
const TABLE_ROW = /^\s*\|/u;
const CODE_COMMENT = /^\s*(?:\/\/|#(?!#)|\*|\/\*|--)\s?/u;

/**
 * Resolver v2's excerpt: the bounded LOGICAL UNIT the cited line
 * belongs to (RV4208), through the same pure line resolver v1 reads.
 * The v1 window is a fixed downward slice, and the sixth comparison
 * experiment's confirmed false negative was structural: a section
 * heading cited as the anchor with its support three lines below the
 * window. The unit rules, all bounded by {@link
 * MAX_CITATION_EXCERPT_LINES} and {@link MAX_CITATION_EXCERPT_CHARS}
 * with a `truncated` flag when clipped:
 *
 * - heading: the SECTION, the heading plus following lines to the
 *   next heading;
 * - table row: the row, with the header pair above it when adjacent;
 * - list item: the marker line plus its more-indented continuation
 *   lines;
 * - code comment: the comment BLOCK (expanded upward to its start)
 *   plus the declaration lines it documents, to the first blank line;
 * - anything else: the paragraph, expanded upward and downward to the
 *   nearest blank or heading line.
 *
 * An explicit `path:start-end` range keeps range semantics (the host
 * cited exact lines; second-guessing them would audit a different
 * citation): the ranged lines, clipped by the caps. The FIRST cited
 * line failing to resolve returns undefined, the unsupported-by-
 * doctrine verdict v1 renders.
 */
export function citationUnitExcerptOf(
  resolve: (target: CitationTarget) => string | undefined,
  row: Pick<CitationAuditRow, 'path' | 'line' | 'endLine'>,
): { excerpt: string; unit: CitationExcerptUnit } | undefined {
  const lineAt = (line: number): string | undefined =>
    line < 1 ? undefined : resolve({ path: row.path, line });
  const anchor = lineAt(row.line);
  if (anchor === undefined) {
    return undefined;
  }
  const collect = (
    type: CitationExcerptUnit['type'],
    firstLine: number,
    include: (text: string, line: number) => boolean,
  ): { excerpt: string; unit: CitationExcerptUnit } => {
    const lines: string[] = [];
    let truncated = false;
    for (let line = firstLine; ; line += 1) {
      if (lines.length >= MAX_CITATION_EXCERPT_LINES) {
        truncated = true;
        break;
      }
      const text = line === row.line ? anchor : lineAt(line);
      if (text === undefined) {
        break;
      }
      if (line !== firstLine && line !== row.line && !include(text, line)) {
        break;
      }
      lines.push(`L${String(line)}: ${text}`);
    }
    let excerpt = lines.join('\n');
    if (excerpt.length > MAX_CITATION_EXCERPT_CHARS) {
      excerpt = `${excerpt.slice(0, MAX_CITATION_EXCERPT_CHARS)}…`;
      truncated = true;
    }
    return {
      excerpt,
      unit: { type, lines: lines.length, ...(truncated ? { truncated: true as const } : {}) },
    };
  };
  // An explicit range keeps range semantics: the host cited exact
  // lines, and the unit detection must not audit a different span.
  if (row.endLine !== undefined) {
    const last = row.endLine;
    return collect('paragraph', row.line, (_text, line) => line <= last);
  }
  if (HEADING.test(anchor)) {
    return collect('section', row.line, (text) => !HEADING.test(text));
  }
  if (TABLE_ROW.test(anchor)) {
    // The header pair above, when the row sits in a table body: the
    // row alone names values with no column meanings.
    const above = lineAt(row.line - 1);
    const headerTop = lineAt(row.line - 2);
    const first =
      above !== undefined &&
      headerTop !== undefined &&
      /^\s*\|[\s:|-]+\|?\s*$/u.test(above) &&
      TABLE_ROW.test(headerTop)
        ? row.line - 2
        : row.line;
    return collect('table-row', first, (text, line) => line <= row.line && TABLE_ROW.test(text));
  }
  const listMatch = LIST_ITEM.exec(anchor);
  if (listMatch !== null) {
    const markerIndent = (listMatch[1] ?? '').length;
    return collect('list-item', row.line, (text) => {
      if (text.trim() === '' || HEADING.test(text) || LIST_ITEM.test(text)) {
        return false;
      }
      const indent = /^(\s*)/u.exec(text)?.[1]?.length ?? 0;
      return indent > markerIndent;
    });
  }
  if (CODE_COMMENT.test(anchor)) {
    // Expand UP to the comment block's start, bounded by half the
    // line cap so the declaration below keeps room.
    let first = row.line;
    for (let line = row.line - 1; line >= 1 && row.line - line < 6; line -= 1) {
      const text = lineAt(line);
      if (text === undefined || !CODE_COMMENT.test(text)) {
        break;
      }
      first = line;
    }
    return collect('comment-declaration', first, (text) => text.trim() !== '');
  }
  return collect(
    'paragraph',
    (() => {
      let first = row.line;
      for (let line = row.line - 1; line >= 1 && row.line - line < 6; line -= 1) {
        const text = lineAt(line);
        if (text === undefined || text.trim() === '' || HEADING.test(text)) {
          break;
        }
        first = line;
      }
      return first;
    })(),
    (text) => text.trim() !== '' && !HEADING.test(text),
  );
}

/** The audit judge's structured verdict schema (mirrors the claim judge). */
export const CITATION_JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          row: { type: 'integer' },
          verdict: { type: 'string', enum: ['supported', 'partial', 'unsupported'] },
          reason: { type: 'string' },
        },
        required: ['row', 'verdict', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['verdicts'],
  additionalProperties: false,
} as const;

/**
 * Parses the judge output strictly: one verdict per judged row, no
 * duplicates, verdicts from the closed vocabulary. Anything else returns
 * undefined and the caller treats the invocation as a failed judge
 * (nothing was judged; partial verdicts over a partial parse would
 * claim more than the judge said).
 */
export function parseCitationVerdicts(
  output: unknown,
  rowIndexes: readonly number[],
): Map<number, { verdict: 'supported' | 'partial' | 'unsupported'; reason: string }> | undefined {
  const shaped = output as { verdicts?: unknown } | null | undefined;
  if (shaped === null || shaped === undefined || !Array.isArray(shaped.verdicts)) {
    return undefined;
  }
  const parsed = new Map<
    number,
    { verdict: 'supported' | 'partial' | 'unsupported'; reason: string }
  >();
  for (const entry of shaped.verdicts) {
    const row = (entry as { row?: unknown }).row;
    const verdict = (entry as { verdict?: unknown }).verdict;
    const reason = (entry as { reason?: unknown }).reason;
    if (
      typeof row !== 'number' ||
      (verdict !== 'supported' && verdict !== 'partial' && verdict !== 'unsupported') ||
      typeof reason !== 'string' ||
      parsed.has(row)
    ) {
      return undefined;
    }
    parsed.set(row, { verdict, reason });
  }
  for (const index of rowIndexes) {
    if (!parsed.has(index)) {
      return undefined;
    }
  }
  return parsed;
}
