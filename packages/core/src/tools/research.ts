/**
 * The standard repository research toolset (RV-210 remainder): paginated
 * list/search/read tools over a confined directory root with STABLE
 * keyset cursors, plus an evidence collector that verifies citations at
 * collection time. Design contract:
 *
 * - Responses are CANONICAL: a page is a pure function of (root
 *   filesystem state, logical window), never of how the window was
 *   addressed, so reading the same page through a cursor and through
 *   fresh arguments returns byte-identical results. That is what makes
 *   the RV-210 `maxNoNewEvidenceCalls` guard measure duplicate-page
 *   reads correctly, and the `maxRepeatedToolSignature` guard already
 *   denies byte-identical repeat calls: deduplication is composition,
 *   not a marker field.
 * - Cursors are keyset cursors (the last path / line, not an offset), so
 *   a page boundary never shifts when unrelated entries appear or
 *   disappear, and every cursor embeds the query identity: replaying a
 *   cursor against different arguments is a typed error result.
 * - Ordering is deterministic byte order (UTF-16 code unit sort), never
 *   locale collation.
 * - The root confines everything: relative paths only, `..` escapes and
 *   symlink escapes are typed error results, symlinked directories are
 *   never walked.
 * - User-level failures (bad path, binary file, oversized file, invalid
 *   cursor, an unverifiable citation) are RETURNED `{ error }` values,
 *   deterministic and visible to the model; only host misconfiguration
 *   throws (ConfigError at construction).
 * - Tool results are journaled at execution time, so replay never
 *   touches the filesystem; live pages read the live tree.
 *
 * Public docs: https://docs.rulvar.com/guide/tools
 */
import { realpathSync, statSync } from 'node:fs';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

import { ConfigError } from '../l0/errors.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import type { SchemaSpec } from '../l0/schema.js';
import { tool } from './tool.js';

export interface RepositoryResearchToolsetOptions {
  /** The confining directory root; everything resolves under it. */
  root: string;
  /** Rows per list/search/evidence page; default 50. */
  pageSize?: number;
  /** Content budget of one read_file page in characters; default 4000. */
  readPageChars?: number;
  /** Files larger than this many bytes are refused; default 262144. */
  maxFileBytes?: number;
  /** Walk ceiling per call (files visited); default 20000. */
  maxScannedFiles?: number;
  /**
   * Extra ignored basenames (files and directories), merged over the
   * always-on defaults '.git' and 'node_modules'.
   */
  ignore?: string[];
  /** Walk dot-entries too; default false. */
  includeHidden?: boolean;
}

/** One verified evidence entry recorded by `record_evidence`. */
export interface ResearchEvidenceEntry {
  claim: string;
  /** Root-relative POSIX path, verified to exist at record time. */
  file: string;
  /** 'N' or 'N-M', 1-based, verified inside the file's line count. */
  lines?: string;
  /** Verified verbatim substring of the file at record time. */
  quote?: string;
}

export interface RepositoryResearchToolset {
  /** list_files, search_files, read_file, record_evidence, list_evidence. */
  tools: ToolDef[];
  /** Snapshot copy of the evidence collected so far, in record order. */
  evidence(): ResearchEvidenceEntry[];
}

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_READ_PAGE_CHARS = 4000;
const DEFAULT_MAX_FILE_BYTES = 262144;
const DEFAULT_MAX_SCANNED_FILES = 20000;
const ALWAYS_IGNORED = ['.git', 'node_modules'];
const SEARCH_SNIPPET_CHARS = 200;
const BINARY_SNIFF_BYTES = 8192;

const LIST_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    dir: { type: 'string', description: 'Root-relative directory to list; default the root.' },
    cursor: { type: 'string', description: 'Opaque cursor from a previous page.' },
  },
};

const SEARCH_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['query'],
  properties: {
    query: { type: 'string', minLength: 1, description: 'Literal substring to find.' },
    dir: { type: 'string', description: 'Root-relative directory to search; default the root.' },
    cursor: { type: 'string', description: 'Opaque cursor from a previous page.' },
  },
};

const READ_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['path'],
  properties: {
    path: { type: 'string', minLength: 1, description: 'Root-relative file path.' },
    cursor: { type: 'string', description: 'Opaque cursor from a previous page.' },
  },
};

const RECORD_EVIDENCE_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  required: ['claim', 'file'],
  properties: {
    claim: { type: 'string', minLength: 1, description: 'The claim this evidence supports.' },
    file: { type: 'string', minLength: 1, description: 'Root-relative file the claim cites.' },
    lines: {
      type: 'string',
      description: "Cited line or range, 1-based: '12' or '12-40'.",
    },
    quote: {
      type: 'string',
      minLength: 1,
      description: 'Verbatim quote; verified to appear in the file.',
    },
  },
};

const LIST_EVIDENCE_SCHEMA: SchemaSpec = {
  type: 'object',
  additionalProperties: false,
  properties: {
    cursor: { type: 'string', description: 'Opaque cursor from a previous page.' },
  },
};

function encodeCursor(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): unknown {
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
}

function isBinary(buffer: Buffer): boolean {
  const window = buffer.subarray(0, BINARY_SNIFF_BYTES);
  return window.includes(0);
}

/** Split into lines on LF; a trailing CR per line is presentation, not content. */
function splitLines(text: string): string[] {
  return text.split('\n').map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line));
}

export function repositoryResearchToolset(
  options: RepositoryResearchToolsetOptions,
): RepositoryResearchToolset {
  if (typeof options.root !== 'string' || options.root.length === 0) {
    throw new ConfigError('repositoryResearchToolset root must be a non-empty string');
  }
  let realRoot: string;
  try {
    realRoot = realpathSync(path.resolve(options.root));
  } catch {
    throw new ConfigError(`repositoryResearchToolset root '${options.root}' does not exist`);
  }
  if (!statSync(realRoot).isDirectory()) {
    throw new ConfigError(`repositoryResearchToolset root '${options.root}' is not a directory`);
  }
  for (const [name, value] of [
    ['pageSize', options.pageSize],
    ['readPageChars', options.readPageChars],
    ['maxFileBytes', options.maxFileBytes],
    ['maxScannedFiles', options.maxScannedFiles],
  ] as const) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
      throw new ConfigError(
        `repositoryResearchToolset ${name} must be a positive integer; got ${String(value)}`,
      );
    }
  }
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const readPageChars = options.readPageChars ?? DEFAULT_READ_PAGE_CHARS;
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const maxScannedFiles = options.maxScannedFiles ?? DEFAULT_MAX_SCANNED_FILES;
  const includeHidden = options.includeHidden ?? false;
  const ignored = new Set([...ALWAYS_IGNORED, ...(options.ignore ?? [])]);
  const evidence: ResearchEvidenceEntry[] = [];

  /**
   * Resolves a root-relative POSIX path and confines it: absolute paths,
   * `..` escapes, and symlink escapes are error strings, never throws.
   * `mustExist` additionally resolves symlinks and re-checks containment
   * of the REAL path (the FileTranscriptStore traversal lesson).
   */
  const resolveWithin = async (
    rel: string,
    kind: 'file' | 'dir',
  ): Promise<{ abs: string; rel: string } | { error: string }> => {
    const normalizedInput = rel.replaceAll('\\', '/');
    if (path.posix.isAbsolute(normalizedInput) || path.isAbsolute(rel)) {
      return { error: `path must be relative to the research root; got '${rel}'` };
    }
    const normalized = path.posix.normalize(normalizedInput);
    if (normalized === '..' || normalized.startsWith('../')) {
      return { error: `path escapes the research root: '${rel}'` };
    }
    const cleaned = normalized === '.' ? '' : normalized;
    if (kind === 'file' && cleaned === '') {
      return { error: 'path must name a file inside the research root' };
    }
    const abs = path.resolve(realRoot, cleaned);
    let real: string;
    try {
      real = await realpath(abs);
    } catch {
      return {
        error: `no such ${kind} under the research root: '${cleaned === '' ? '.' : cleaned}'`,
      };
    }
    if (real !== realRoot && !real.startsWith(realRoot + path.sep)) {
      return { error: `path escapes the research root: '${rel}'` };
    }
    try {
      const info = await stat(real);
      if (kind === 'file' && !info.isFile()) {
        return { error: `not a regular file: '${cleaned}'` };
      }
      if (kind === 'dir' && !info.isDirectory()) {
        return { error: `not a directory: '${cleaned === '' ? '.' : cleaned}'` };
      }
    } catch {
      return {
        error: `no such ${kind} under the research root: '${cleaned === '' ? '.' : cleaned}'`,
      };
    }
    return { abs: real, rel: cleaned };
  };

  /**
   * Deterministic recursive walk: sorted entries, ignored and hidden
   * names skipped, symlinks never followed, regular files only. Returns
   * root-relative POSIX paths in byte order, or an error when the walk
   * exceeds maxScannedFiles.
   */
  const walkFiles = async (
    absDir: string,
    relDir: string,
  ): Promise<{ files: string[] } | { error: string }> => {
    const files: string[] = [];
    let visited = 0;
    const recurse = async (dirAbs: string, dirRel: string): Promise<string | undefined> => {
      let entries;
      try {
        entries = await readdir(dirAbs, { withFileTypes: true });
      } catch {
        return `directory disappeared during the walk: '${dirRel === '' ? '.' : dirRel}'`;
      }
      const sorted = [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      for (const entry of sorted) {
        const name = entry.name;
        if (ignored.has(name)) {
          continue;
        }
        if (!includeHidden && name.startsWith('.')) {
          continue;
        }
        const childRel = dirRel === '' ? name : `${dirRel}/${name}`;
        if (entry.isDirectory()) {
          const failure = await recurse(path.join(dirAbs, name), childRel);
          if (failure !== undefined) {
            return failure;
          }
          continue;
        }
        if (!entry.isFile()) {
          continue;
        }
        visited += 1;
        if (visited > maxScannedFiles) {
          return (
            `the walk exceeded maxScannedFiles (${String(maxScannedFiles)}); ` +
            'narrow dir or raise the limit'
          );
        }
        files.push(childRel);
      }
      return undefined;
    };
    const failure = await recurse(absDir, relDir);
    if (failure !== undefined) {
      return { error: failure };
    }
    return { files };
  };

  const loadTextFile = async (
    abs: string,
    rel: string,
  ): Promise<{ text: string } | { error: string }> => {
    let info;
    try {
      info = await stat(abs);
    } catch {
      return { error: `no such file under the research root: '${rel}'` };
    }
    if (info.size > maxFileBytes) {
      return {
        error:
          `file '${rel}' is ${String(info.size)} bytes, over the maxFileBytes limit ` +
          `(${String(maxFileBytes)})`,
      };
    }
    const buffer = await readFile(abs);
    if (isBinary(buffer)) {
      return { error: `file '${rel}' is binary` };
    }
    return { text: buffer.toString('utf8') };
  };

  const listFiles = tool({
    name: 'list_files',
    description:
      'List files under a directory of the research root, recursively, in deterministic ' +
      'byte order, one page at a time. Returns { files, totalFiles, nextCursor? }; pass ' +
      'cursor to continue where the last page ended (the cursor is stable: unrelated ' +
      'changes never shift the boundary).',
    parameters: LIST_SCHEMA,
    risk: 'read',
    execute: async (input) => {
      const params = input as { dir?: string; cursor?: string };
      let dir = params.dir ?? '';
      let after: string | undefined;
      if (params.cursor !== undefined) {
        const payload = decodeCursor(params.cursor) as
          { t?: string; dir?: string; after?: string } | undefined;
        if (
          payload === undefined ||
          payload.t !== 'list' ||
          typeof payload.dir !== 'string' ||
          typeof payload.after !== 'string' ||
          (params.dir !== undefined && params.dir !== payload.dir)
        ) {
          return { error: 'invalid cursor: pass the nextCursor of a previous list_files page' };
        }
        dir = payload.dir;
        after = payload.after;
      }
      const resolved = await resolveWithin(dir, 'dir');
      if ('error' in resolved) {
        return resolved;
      }
      const walked = await walkFiles(resolved.abs, resolved.rel);
      if ('error' in walked) {
        return walked;
      }
      const remaining =
        after === undefined ? walked.files : walked.files.filter((file) => file > after);
      const page = remaining.slice(0, pageSize);
      const more = remaining.length > pageSize;
      return {
        files: page,
        totalFiles: walked.files.length,
        ...(more
          ? {
              nextCursor: encodeCursor({
                t: 'list',
                dir: resolved.rel,
                after: page[page.length - 1],
              }),
            }
          : {}),
      };
    },
  });

  const searchFiles = tool({
    name: 'search_files',
    description:
      'Search files under the research root for a literal substring (case-sensitive, ' +
      'never a regex), one page of matches at a time in deterministic (path, line) ' +
      'order. Returns { matches: [{ file, line, text }], filesScanned, filesSkipped, ' +
      'nextCursor? }; binary and oversized files are skipped and counted.',
    parameters: SEARCH_SCHEMA,
    risk: 'read',
    execute: async (input) => {
      const params = input as { query: string; dir?: string; cursor?: string };
      let dir = params.dir ?? '';
      let query = params.query;
      let after: { file: string; line: number } | undefined;
      if (params.cursor !== undefined) {
        const payload = decodeCursor(params.cursor) as
          { t?: string; query?: string; dir?: string; file?: string; line?: number } | undefined;
        if (
          payload === undefined ||
          payload.t !== 'search' ||
          typeof payload.query !== 'string' ||
          typeof payload.dir !== 'string' ||
          typeof payload.file !== 'string' ||
          typeof payload.line !== 'number' ||
          payload.query !== params.query ||
          (params.dir !== undefined && params.dir !== payload.dir)
        ) {
          return {
            error:
              'invalid cursor: pass the nextCursor of a previous search_files page ' +
              'with the same query and dir',
          };
        }
        dir = payload.dir;
        query = payload.query;
        after = { file: payload.file, line: payload.line };
      }
      if (query.length === 0) {
        return { error: 'query must be a non-empty literal substring' };
      }
      const resolved = await resolveWithin(dir, 'dir');
      if ('error' in resolved) {
        return resolved;
      }
      const walked = await walkFiles(resolved.abs, resolved.rel);
      if ('error' in walked) {
        return walked;
      }
      const matches: { file: string; line: number; text: string }[] = [];
      let filesScanned = 0;
      let filesSkipped = 0;
      for (const file of walked.files) {
        const loaded = await loadTextFile(path.join(realRoot, file), file);
        if ('error' in loaded) {
          filesSkipped += 1;
          continue;
        }
        filesScanned += 1;
        const lines = splitLines(loaded.text);
        for (let index = 0; index < lines.length; index += 1) {
          if (lines[index].includes(query)) {
            matches.push({
              file,
              line: index + 1,
              text: lines[index].trim().slice(0, SEARCH_SNIPPET_CHARS),
            });
          }
        }
      }
      const remaining =
        after === undefined
          ? matches
          : matches.filter(
              (match) =>
                match.file > (after as { file: string }).file ||
                (match.file === (after as { file: string }).file &&
                  match.line > (after as { line: number }).line),
            );
      const page = remaining.slice(0, pageSize);
      const more = remaining.length > pageSize;
      const last = page[page.length - 1];
      return {
        matches: page,
        filesScanned,
        filesSkipped,
        ...(more && last !== undefined
          ? {
              nextCursor: encodeCursor({
                t: 'search',
                query,
                dir: resolved.rel,
                file: last.file,
                line: last.line,
              }),
            }
          : {}),
      };
    },
  });

  const readFileTool = tool({
    name: 'read_file',
    description:
      'Read a file of the research root as numbered lines, one page at a time (whole ' +
      'lines up to the page character budget). Returns { path, totalLines, fromLine, ' +
      'toLine, content, nextCursor? }; the same page reads byte-identically however it ' +
      'is addressed, so duplicate reads are visible to the exploration guards.',
    parameters: READ_SCHEMA,
    risk: 'read',
    execute: async (input) => {
      const params = input as { path: string; cursor?: string };
      let rel = params.path;
      let fromLine = 1;
      if (params.cursor !== undefined) {
        const payload = decodeCursor(params.cursor) as
          { t?: string; path?: string; after?: number } | undefined;
        if (
          payload === undefined ||
          payload.t !== 'read' ||
          typeof payload.path !== 'string' ||
          typeof payload.after !== 'number' ||
          payload.path !== params.path
        ) {
          return {
            error:
              'invalid cursor: pass the nextCursor of a previous read_file page for the ' +
              'same path',
          };
        }
        rel = payload.path;
        fromLine = payload.after + 1;
      }
      const resolved = await resolveWithin(rel, 'file');
      if ('error' in resolved) {
        return resolved;
      }
      const loaded = await loadTextFile(resolved.abs, resolved.rel);
      if ('error' in loaded) {
        return loaded;
      }
      const lines = splitLines(loaded.text);
      const totalLines = lines.length;
      if (fromLine > totalLines) {
        return {
          error: `fromLine ${String(fromLine)} is past the end of '${resolved.rel}' (${String(totalLines)} lines)`,
        };
      }
      const rendered: string[] = [];
      let used = 0;
      let toLine = fromLine - 1;
      for (let index = fromLine - 1; index < totalLines; index += 1) {
        const row = `${String(index + 1)}: ${lines[index]}`;
        if (rendered.length > 0 && used + 1 + row.length > readPageChars) {
          break;
        }
        rendered.push(row);
        used += (rendered.length > 1 ? 1 : 0) + row.length;
        toLine = index + 1;
      }
      const more = toLine < totalLines;
      return {
        path: resolved.rel,
        totalLines,
        fromLine,
        toLine,
        content: rendered.join('\n'),
        ...(more
          ? { nextCursor: encodeCursor({ t: 'read', path: resolved.rel, after: toLine }) }
          : {}),
      };
    },
  });

  const recordEvidence = tool({
    name: 'record_evidence',
    description:
      'Record one evidence entry supporting a claim. The citation is VERIFIED at record ' +
      'time: the file must exist under the research root, lines must be a valid 1-based ' +
      "line or range inside it ('12' or '12-40'), and quote (when given) must appear " +
      'verbatim in the file. Returns { recorded, duplicate, totalEvidence }.',
    parameters: RECORD_EVIDENCE_SCHEMA,
    risk: 'read',
    execute: async (input) => {
      const params = input as { claim: string; file: string; lines?: string; quote?: string };
      if (params.claim.trim().length === 0) {
        return { error: 'claim must be a non-empty string' };
      }
      const resolved = await resolveWithin(params.file, 'file');
      if ('error' in resolved) {
        return resolved;
      }
      const loaded = await loadTextFile(resolved.abs, resolved.rel);
      if ('error' in loaded) {
        return loaded;
      }
      const lines = splitLines(loaded.text);
      if (params.lines !== undefined) {
        const match = /^(\d+)(?:-(\d+))?$/u.exec(params.lines);
        if (match === null) {
          return { error: "lines must be '12' or '12-40' (1-based)" };
        }
        const from = Number(match[1]);
        const to = match[2] === undefined ? from : Number(match[2]);
        if (from < 1 || to < from || to > lines.length) {
          return {
            error:
              `lines '${params.lines}' is outside '${resolved.rel}' ` +
              `(${String(lines.length)} lines)`,
          };
        }
      }
      if (params.quote !== undefined && !loaded.text.includes(params.quote)) {
        return {
          error: `quote not found verbatim in '${resolved.rel}'; cite what the file actually says`,
        };
      }
      const entry: ResearchEvidenceEntry = {
        claim: params.claim,
        file: resolved.rel,
        ...(params.lines === undefined ? {} : { lines: params.lines }),
        ...(params.quote === undefined ? {} : { quote: params.quote }),
      };
      const duplicate = evidence.some(
        (existing) =>
          existing.claim === entry.claim &&
          existing.file === entry.file &&
          existing.lines === entry.lines &&
          existing.quote === entry.quote,
      );
      if (!duplicate) {
        evidence.push(entry);
      }
      return { recorded: !duplicate, duplicate, totalEvidence: evidence.length };
    },
  });

  const listEvidence = tool({
    name: 'list_evidence',
    description:
      'List the evidence recorded so far, one page at a time in record order. Returns ' +
      '{ evidence, totalEvidence, nextCursor? }.',
    parameters: LIST_EVIDENCE_SCHEMA,
    risk: 'read',
    execute: (input) => {
      const params = input as { cursor?: string };
      let from = 0;
      if (params.cursor !== undefined) {
        const payload = decodeCursor(params.cursor) as { t?: string; after?: number } | undefined;
        if (
          payload === undefined ||
          payload.t !== 'evidence' ||
          typeof payload.after !== 'number'
        ) {
          return Promise.resolve({
            error: 'invalid cursor: pass the nextCursor of a previous list_evidence page',
          });
        }
        from = payload.after;
      }
      const page = evidence.slice(from, from + pageSize);
      const more = from + pageSize < evidence.length;
      return Promise.resolve({
        evidence: page,
        totalEvidence: evidence.length,
        ...(more ? { nextCursor: encodeCursor({ t: 'evidence', after: from + pageSize }) } : {}),
      });
    },
  });

  return {
    tools: [listFiles, searchFiles, readFileTool, recordEvidence, listEvidence],
    evidence: () => evidence.map((entry) => ({ ...entry })),
  };
}
