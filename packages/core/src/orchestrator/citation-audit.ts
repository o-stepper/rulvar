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
   * The resolved lines, `L<n>: <text>` per line. Absent when the
   * FIRST cited line does not resolve in the host snapshot, which is
   * itself an unsupported verdict: a citation nothing resolves is not
   * provenance (the citedValueValidator doctrine).
   */
  excerpt?: string;
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
} {
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
  return { pattern, samplePerSection, maxSampled, window };
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
  plan: { pattern: string; samplePerSection: number; maxSampled: number },
  seed: string,
): Omit<CitationAuditRow, 'excerpt'>[] {
  const perSection: Array<{
    section: string;
    picks: Array<{
      sentence: string;
      anchor: string;
      path: string;
      line: number;
      endLine?: number;
    }>;
  }> = [];
  for (const { marker, body } of sectionsOfDocument(document)) {
    const candidates: Array<{
      sentence: string;
      anchor: string;
      path: string;
      line: number;
      endLine?: number;
    }> = [];
    for (const sentence of sentencesOf(body)) {
      const probe = citationWithRange(plan.pattern);
      const match = probe.exec(sentence);
      if (match === null) {
        continue;
      }
      // The line half may carry a `-end` range the base pattern does
      // not capture; read the widest range the sentence text carries
      // at the match site.
      const tailProbe = new RegExp(
        `${match[0].replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?:-(\\d+))?`,
        'u',
      );
      const widened = tailProbe.exec(sentence);
      const anchorText = widened?.[0] ?? match[0];
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
      candidates.push({
        sentence,
        anchor: anchorText,
        path,
        line,
        ...(endLine !== undefined && Number.isInteger(endLine) && endLine >= line
          ? { endLine }
          : {}),
      });
    }
    if (candidates.length === 0) {
      continue;
    }
    const picks = pickIndexes(candidates.length, plan.samplePerSection, `${seed}:${marker}`)
      .map((index) => candidates[index])
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== undefined);
    perSection.push({ section: marker, picks });
  }
  // Cap by pick rank across sections: round-robin, document order.
  const rows: Omit<CitationAuditRow, 'excerpt'>[] = [];
  for (let rank = 0; rows.length < plan.maxSampled; rank += 1) {
    let any = false;
    for (const bucket of perSection) {
      const pick = bucket.picks[rank];
      if (pick === undefined) {
        continue;
      }
      any = true;
      if (rows.length >= plan.maxSampled) {
        break;
      }
      rows.push({ row: rows.length, section: bucket.section, ...pick });
    }
    if (!any) {
      break;
    }
  }
  return rows;
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
