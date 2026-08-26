/**
 * The shared contract audit lexer (RV4603, the seventh comparison
 * experiment's P2.1): one exported grammar for the two counting
 * defects every hand rolled harness rediscovers. The seventh
 * experiment's post audit counted `acceptance.minSpawnedChildren:4`,
 * a config property in citation clothing, as a citation occurrence,
 * and recognized zero of the winning answer's 88 requirement ids
 * because they were written as dash led list items instead of the
 * colon form the counter expected; both texts carried the full
 * N48/R24/C16 sets, and the report had to recount them by hand.
 *
 * The grammar is deliberately the engine's own where one exists: the
 * citation shape is {@link DEFAULT_CITATION_PATTERN} (overridable),
 * the range tail reads exactly as the citation audit reads it, and
 * fenced code is stripped with the same exported
 * {@link stripFencedBlocks} the finish validators use. What the lexer
 * adds is the ACCEPTANCE judgment a bare pattern cannot make: a
 * citation must name a known source file extension (a dotted config
 * property is not a citation), and, when the host supplies the pure
 * snapshot `resolve`, the first cited line must resolve. Requirement
 * ids accept the colon, dash and table forms as one vocabulary, so
 * equivalent documents count equal.
 */
import {
  ConfigError,
  DEFAULT_CITATION_PATTERN,
  stripFencedBlocks,
  type CitationTarget,
} from '@rulvar/core';

/** Source file extensions a citation may name; lowercase, no dots. */
export const DEFAULT_CITATION_EXTENSIONS: readonly string[] = [
  'ts',
  'tsx',
  'mts',
  'cts',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'json',
  'jsonl',
  'md',
  'yml',
  'yaml',
  'txt',
  'lock',
  'toml',
  'sql',
  'sh',
  'html',
  'css',
];

/** Requirement id families of the comparison contract (N, R, C). */
export const DEFAULT_REQUIREMENT_FAMILIES: readonly string[] = ['N', 'R', 'C'];

/** One accepted citation occurrence, in document order. */
export interface LexedCitation {
  /** The raw span, range tail included. */
  readonly raw: string;
  readonly path: string;
  readonly line: number;
  readonly endLine?: number;
  /** The H2 heading the occurrence sits under; '' before the first. */
  readonly section: string;
}

/** One span the pattern matched and the lexer refused to count. */
export interface RejectedCitationSpan {
  readonly raw: string;
  readonly reason: 'unknown-extension' | 'unresolved';
}

/** One requirement id occurrence with the notation it was written in. */
export interface LexedRequirementId {
  /** The id verbatim, e.g. 'N01'. */
  readonly id: string;
  readonly family: string;
  readonly ordinal: number;
  /**
   * 'colon' for `N01:` (a period counts), 'dash' for a dash separated
   * list item, 'table' for a table row cell, 'bare' otherwise.
   */
  readonly form: 'colon' | 'dash' | 'table' | 'bare';
}

/** The lex of one contract audited document. */
export interface ContractAuditLex {
  /** Accepted citation occurrences, the headline count. */
  readonly citationOccurrences: number;
  readonly citations: readonly LexedCitation[];
  /** Distinct accepted raw spans, in first occurrence order. */
  readonly uniqueAnchors: readonly string[];
  readonly rejected: readonly RejectedCitationSpan[];
  /** Every id occurrence per family, in document order. */
  readonly requirementIds: Readonly<Record<string, readonly LexedRequirementId[]>>;
  /** Distinct ids per family, the contract set size. */
  readonly distinctRequirementCounts: Readonly<Record<string, number>>;
  /** Accepted citations per H2 section, in document order. */
  readonly perSection: readonly { heading: string; citations: number }[];
}

export interface ContractAuditLexOptions {
  /** Overrides {@link DEFAULT_CITATION_PATTERN}; must expose `path:line`. */
  pattern?: string;
  /** Overrides {@link DEFAULT_CITATION_EXTENSIONS}; lowercase, no dots. */
  extensions?: readonly string[];
  /**
   * The pure snapshot resolver (the citation audit contract). When
   * present, a citation whose FIRST cited line does not resolve is
   * rejected 'unresolved'; absent, extension acceptance stands alone.
   */
  resolve?: (target: CitationTarget) => string | undefined;
  /** Overrides {@link DEFAULT_REQUIREMENT_FAMILIES}; single uppercase letters. */
  families?: readonly string[];
  /** 'excluded' (the default) strips fenced code before both scans. */
  fencedCode?: 'excluded' | 'counted';
}

const CITATION_TAIL = /^(.*):(\d+)$/u;
const H2 = /^##\s+\S/u;
const LIST_MARKER = /^\s*[-*+]\s+/u;
const TABLE_ROW = /^\s*\|/u;
/** The dash separators the winning answer wrote its ids with. */
const DASH_SEPARATOR = /^\s*[—–-]\s/u;
const COLON_SEPARATOR = /^\s*[:.]\s/u;

/**
 * Lexes one document under the shared contract audit grammar; see the
 * module comment for the doctrine. Malformed options refuse typed.
 */
export function lexContractAudit(
  text: string,
  options?: ContractAuditLexOptions,
): ContractAuditLex {
  const pattern = options?.pattern ?? DEFAULT_CITATION_PATTERN;
  try {
    new RegExp(pattern, 'gu');
  } catch (thrown) {
    throw new ConfigError(
      `lexContractAudit pattern does not compile: ${
        thrown instanceof Error ? thrown.message : String(thrown)
      }`,
    );
  }
  if (new RegExp(pattern, 'u').test('')) {
    throw new ConfigError(
      `lexContractAudit pattern must not be able to match the empty string; ` +
        `got ${JSON.stringify(pattern)}`,
    );
  }
  {
    const supplied: unknown = options?.extensions ?? DEFAULT_CITATION_EXTENSIONS;
    if (
      !Array.isArray(supplied) ||
      supplied.length === 0 ||
      supplied.some((extension) => typeof extension !== 'string' || !/^[a-z0-9]+$/u.test(extension))
    ) {
      throw new ConfigError(
        'lexContractAudit extensions must be a non empty array of lowercase alphanumeric ' +
          'extensions without dots',
      );
    }
  }
  const extensions: readonly string[] = options?.extensions ?? DEFAULT_CITATION_EXTENSIONS;
  {
    const supplied: unknown = options?.families ?? DEFAULT_REQUIREMENT_FAMILIES;
    if (
      !Array.isArray(supplied) ||
      supplied.some((family) => typeof family !== 'string' || !/^[A-Z]$/u.test(family)) ||
      new Set(supplied).size !== supplied.length
    ) {
      throw new ConfigError('lexContractAudit families must be distinct single uppercase letters');
    }
  }
  const families: readonly string[] = options?.families ?? DEFAULT_REQUIREMENT_FAMILIES;
  const fencedCode = options?.fencedCode ?? 'excluded';
  if (fencedCode !== 'excluded' && fencedCode !== 'counted') {
    throw new ConfigError(
      `lexContractAudit fencedCode must be 'excluded' or 'counted'; got ${String(fencedCode)}`,
    );
  }
  if (options?.resolve !== undefined && typeof options.resolve !== 'function') {
    throw new ConfigError('lexContractAudit resolve must be a function when present');
  }
  const scope = fencedCode === 'excluded' ? stripFencedBlocks(text) : text;
  const extensionSet = new Set(extensions.map((extension) => extension.toLowerCase()));

  // Section offsets: each H2 line opens a section; text before the
  // first belongs to the '' preamble.
  const sections: Array<{ heading: string; start: number; citations: number }> = [
    { heading: '', start: 0, citations: 0 },
  ];
  {
    let offset = 0;
    for (const line of scope.split('\n')) {
      if (H2.test(line)) {
        sections.push({ heading: line.trim(), start: offset, citations: 0 });
      }
      offset += line.length + 1;
    }
  }
  const sectionAt = (index: number): { heading: string; citations: number } => {
    let found = sections[0];
    for (const section of sections) {
      if (section.start <= index) {
        found = section;
      } else {
        break;
      }
    }
    return found;
  };

  const citations: LexedCitation[] = [];
  const rejected: RejectedCitationSpan[] = [];
  const uniqueAnchors: string[] = [];
  const seenAnchors = new Set<string>();
  const scanner = new RegExp(pattern, 'gu');
  for (let match = scanner.exec(scope); match !== null; match = scanner.exec(scope)) {
    if (match[0].length === 0) {
      scanner.lastIndex += 1;
      continue;
    }
    // The range tail, read exactly as the citation audit reads it.
    const tail = /^-(\d+)/u.exec(scope.slice(match.index + match[0].length));
    const raw = tail === null ? match[0] : `${match[0]}${tail[0]}`;
    const parsed = CITATION_TAIL.exec(match[0]);
    if (parsed === null) {
      continue;
    }
    const path = parsed[1] ?? '';
    const line = Number(parsed[2]);
    if (!Number.isSafeInteger(line) || line < 1) {
      continue;
    }
    const extension = /\.([A-Za-z0-9]+)$/u.exec(path)?.[1]?.toLowerCase();
    if (extension === undefined || !extensionSet.has(extension)) {
      rejected.push({ raw, reason: 'unknown-extension' });
      continue;
    }
    if (options?.resolve !== undefined && options.resolve({ path, line }) === undefined) {
      rejected.push({ raw, reason: 'unresolved' });
      continue;
    }
    const section = sectionAt(match.index);
    section.citations += 1;
    citations.push({
      raw,
      path,
      line,
      ...(tail === null ? {} : { endLine: Number(tail[1]) }),
      section: section.heading,
    });
    if (!seenAnchors.has(raw)) {
      seenAnchors.add(raw);
      uniqueAnchors.push(raw);
    }
  }

  const requirementIds: Record<string, LexedRequirementId[]> = {};
  const distinct: Record<string, Set<number>> = {};
  for (const family of families) {
    requirementIds[family] = [];
    distinct[family] = new Set();
  }
  for (const line of scope.split('\n')) {
    const isTable = TABLE_ROW.test(line);
    const isListItem = LIST_MARKER.test(line);
    // A fresh scanner per line: the 'g' flag is stateful, and a shared
    // instance would carry lastIndex across lines.
    const ID = /\b([A-Z])(\d{2,4})\b/gu;
    for (let match = ID.exec(line); match !== null; match = ID.exec(line)) {
      const family = match[1] ?? '';
      if (!families.includes(family)) {
        continue;
      }
      const after = line.slice(match.index + match[0].length);
      const form: LexedRequirementId['form'] = isTable
        ? 'table'
        : COLON_SEPARATOR.test(after)
          ? 'colon'
          : isListItem && DASH_SEPARATOR.test(after)
            ? 'dash'
            : 'bare';
      const ordinal = Number(match[2]);
      requirementIds[family]?.push({ id: match[0], family, ordinal, form });
      distinct[family]?.add(ordinal);
    }
  }
  const distinctRequirementCounts: Record<string, number> = {};
  for (const family of families) {
    distinctRequirementCounts[family] = distinct[family]?.size ?? 0;
  }

  return {
    citationOccurrences: citations.length,
    citations,
    uniqueAnchors,
    rejected,
    requirementIds,
    distinctRequirementCounts,
    perSection: sections
      .filter((section) => section.heading !== '' || section.citations > 0)
      .map((section) => ({ heading: section.heading, citations: section.citations })),
  };
}
