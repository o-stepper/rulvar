/**
 * JsonlFileStore (M2-T01): the durable file store. One JSON entry per
 * line per run; the journal doubles as an event log. Meta records live
 * beside the journal and are replaced atomically, so listRuns never
 * parses payloads.
 *
 * Contract (DEF-4 tightening):
 * - A1 atomicity: a torn trailing line (crash mid-append) is never
 *   visible in load; the incomplete fragment is dropped and overwritten
 *   by the next append. Whole records on that line are data, never
 *   fragment (RV701): a crash that persisted every JSON byte but not
 *   the '\n' leaves a parseable tail that load serves and append
 *   terminates before writing, and repair salvages complete records a
 *   glued line carries instead of discarding the line, so an entry a
 *   load has served can never be un-served by a later repair.
 * - A2 total per-run order: load returns append order, stable across
 *   calls (the kernel's per-run queue serializes appends).
 * - A3 read-your-writes: append resolves after the line is written.
 * - A4 opaque payload: entries round-trip byte-for-byte as JSON; unknown
 *   kinds and fields pass through untouched.
 *
 * Leasing is NOT implemented here: LeasableStore ships with
 * @rulvar/store-sqlite (M5); JsonlFileStore is single-writer by
 * convention.
 */
import {
  appendFileSync,
  closeSync,
  fstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { JournalOrderViolation } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import type { Bytes } from '../l0/json.js';
import type { MetaLookupStore, RunFilter, RunMeta } from '../l0/spi/store.js';
import type { TranscriptStore } from '../l0/spi/transcript.js';
import { metaMatchesFilter } from './meta-lookup.js';

const JOURNAL_SUFFIX = '.jsonl';
const META_SUFFIX = '.meta.json';

function safeName(runId: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(runId)) {
    throw new JournalOrderViolation(
      `JsonlFileStore: runId '${runId}' is not filesystem-safe ([A-Za-z0-9._-] only)`,
    );
  }
  return runId;
}

/**
 * Whole JSON values glued on one line, split apart without parser
 * ambiguity (RV701): depth is tracked outside string literals only, and
 * every candidate must still round-trip JSON.parse. A line that is not a
 * clean concatenation from its first byte salvages its whole prefix
 * values and returns everything after them as the torn fragment, so the
 * caller keeps accepted records and drops exactly the unacknowledged
 * tail a crash tore.
 */
function splitConcatenatedJson(line: string): { whole: unknown[]; fragment: string } {
  const whole: unknown[] = [];
  let start = 0;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{' || ch === '[') {
      depth += 1;
      continue;
    }
    if (ch === '}' || ch === ']') {
      depth -= 1;
      if (depth < 0) {
        return { whole, fragment: line.slice(start) };
      }
      if (depth === 0) {
        const candidate = line.slice(start, i + 1);
        try {
          whole.push(JSON.parse(candidate));
        } catch {
          return { whole, fragment: line.slice(start) };
        }
        start = i + 1;
      }
    }
  }
  return { whole, fragment: line.slice(start) };
}

export class JsonlFileStore implements MetaLookupStore {
  private readonly dir: string;
  /**
   * The stored tail seq per run, lazily initialized from the file on the
   * first append this instance performs (obligation A5). Per instance by
   * design: cross-process writers are the lease seam's job.
   */
  private readonly lastSeq = new Map<string, number>();

  /**
   * The verify-only load switch (RV1512): with `repairOnLoad: false`,
   * `load` serves the salvageable records WITHOUT rewriting the file,
   * so an auditor's "verification" read never destroys the evidence
   * of a tear it found. The default keeps the owner semantics byte
   * for byte: a torn tail repairs on load exactly as documented in
   * the A1 model above. Mutations (`append`, `putMeta`, `delete`)
   * are unaffected by the flag; an auditor that must not write simply
   * does not call them.
   */
  private readonly repairOnLoad: boolean;

  constructor(options: { dir: string; repairOnLoad?: boolean }) {
    this.dir = options.dir;
    this.repairOnLoad = options.repairOnLoad !== false;
    mkdirSync(this.dir, { recursive: true });
  }

  private journalPath(runId: string): string {
    return join(this.dir, `${safeName(runId)}${JOURNAL_SUFFIX}`);
  }

  private metaPath(runId: string): string {
    return join(this.dir, `${safeName(runId)}${META_SUFFIX}`);
  }

  async append(runId: string, e: JournalEntry): Promise<void> {
    // Monotonic seq (obligation A5): a stale or duplicate seq means a
    // second writer raced this journal from an outdated tail; exactly
    // one of them may persist, the loser gets the typed conflict.
    // Entries without a finite seq (legacy or exotic shapes) pass
    // through unguarded (A4 opacity).
    let tail = this.lastSeq.get(runId);
    if (tail === undefined) {
      const existing = await this.load(runId);
      // A crash can persist every JSON byte of an append but not its
      // '\n' (RV701): load serves that tail, and appending onto it would
      // glue two records into one line a later load calls torn and
      // repairs away, losing BOTH. The missing delimiter is restored
      // before this instance's first append; load's own repair already
      // rewrote every other malformed tail newline-terminated.
      this.terminateUnterminatedTail(runId);
      const last = existing[existing.length - 1];
      tail = last !== undefined && Number.isFinite(last.seq) ? last.seq : Number.NEGATIVE_INFINITY;
      this.lastSeq.set(runId, tail);
    }
    if (Number.isFinite(e.seq) && e.seq <= tail) {
      throw new JournalOrderViolation(
        `JsonlFileStore: append of seq ${e.seq} to run '${runId}' is not after the stored ` +
          `tail seq ${tail}; a concurrent writer raced this journal from a stale tail`,
      );
    }
    // One serialized line per entry; a crash can only tear the final
    // line, which load discards (A1). The kernel's per-run queue is the
    // single writer (A2).
    appendFileSync(this.journalPath(runId), `${JSON.stringify(e)}\n`, 'utf8');
    if (Number.isFinite(e.seq)) {
      this.lastSeq.set(runId, e.seq);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async load(runId: string): Promise<JournalEntry[]> {
    let raw: string;
    try {
      raw = readFileSync(this.journalPath(runId), 'utf8');
    } catch (thrown) {
      if ((thrown as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw thrown;
    }
    const lines = raw.split('\n');
    const entries: JournalEntry[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? '';
      if (line === '') {
        continue;
      }
      try {
        entries.push(JSON.parse(line) as JournalEntry);
      } catch (thrown) {
        const isLastContent = lines.slice(i + 1).every((rest) => rest === '');
        if (isLastContent) {
          // Torn trailing write from a crash: the incomplete fragment is
          // invisible per A1. Whole records glued on the line (a legacy
          // pre-RV701 append onto an unterminated tail, or a tear right
          // after a complete record) are accepted data and are salvaged,
          // never discarded with the fragment. The next append starts a
          // fresh line after repair.
          for (const value of splitConcatenatedJson(line).whole) {
            entries.push(value as JournalEntry);
          }
          if (this.repairOnLoad) {
            this.repairTornTail(runId, entries);
          }
          break;
        }
        throw new JournalOrderViolation(
          `JsonlFileStore: corrupt journal line ${i + 1} of run '${runId}' ` +
            '(not the trailing line, so this is not a torn append)',
          { cause: thrown },
        );
      }
    }
    return entries;
  }

  /**
   * Restores the trailing '\n' of a parseable-but-unterminated tail
   * (RV701). One byte appended in place terminates the record exactly
   * where the crash left it; the file's bytes before it stay untouched.
   * No-op on a missing, empty, or already-terminated journal.
   */
  private terminateUnterminatedTail(runId: string): void {
    const path = this.journalPath(runId);
    let fd: number;
    try {
      fd = openSync(path, 'r');
    } catch (thrown) {
      if ((thrown as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      throw thrown;
    }
    let needsNewline = false;
    try {
      const size = fstatSync(fd).size;
      if (size > 0) {
        const lastByte = new Uint8Array(1);
        readSync(fd, lastByte, 0, 1, size - 1);
        needsNewline = lastByte[0] !== 0x0a;
      }
    } finally {
      closeSync(fd);
    }
    if (needsNewline) {
      appendFileSync(path, '\n', 'utf8');
    }
  }

  private repairTornTail(runId: string, whole: JournalEntry[]): void {
    // Rewrite the journal to only the whole entries via temp+rename so a
    // torn tail never accumulates.
    const path = this.journalPath(runId);
    const temp = `${path}.tmp`;
    writeFileSync(
      temp,
      whole.map((entry) => JSON.stringify(entry)).join('\n') + (whole.length > 0 ? '\n' : ''),
      'utf8',
    );
    renameSync(temp, path);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async putMeta(m: RunMeta): Promise<void> {
    // Atomic replace: temp write plus rename.
    const path = this.metaPath(m.runId);
    const temp = `${path}.tmp`;
    writeFileSync(temp, JSON.stringify(m, null, 2), 'utf8');
    renameSync(temp, path);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getMeta(runId: string): Promise<RunMeta | undefined> {
    // One file read by name, never a directory scan.
    try {
      return JSON.parse(readFileSync(this.metaPath(runId), 'utf8')) as RunMeta;
    } catch {
      // ENOENT means not in the store; a torn meta replace is repaired
      // on the next putMeta, so both resolve undefined.
      return undefined;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async listRuns(f?: RunFilter): Promise<RunMeta[]> {
    const metas: RunMeta[] = [];
    for (const file of readdirSync(this.dir)) {
      if (!file.endsWith(META_SUFFIX)) {
        continue;
      }
      try {
        metas.push(JSON.parse(readFileSync(join(this.dir, file), 'utf8')) as RunMeta);
      } catch {
        // A torn meta replace is repaired on the next putMeta; skip it.
      }
    }
    return metas.filter((meta) => metaMatchesFilter(meta, f));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(runId: string): Promise<void> {
    rmSync(this.journalPath(runId), { force: true });
    rmSync(this.metaPath(runId), { force: true });
    this.lastSeq.delete(runId);
  }
}

const TRANSCRIPT_SUFFIX = '.bin';

/**
 * File-backed TranscriptStore (M6-T02): blobs (transcripts, checkpoints,
 * persisted CompiledWorkflow sources) as one file per ref under `dir`,
 * so compiled runs resume across processes. Refs follow the
 * `<runId>/<name>` convention; nested segments become directories.
 *
 * Every ref is contained under `dir` (v1.36.0 review SEC-P1): each
 * segment must match `[A-Za-z0-9._-]` and be neither empty, '.', nor
 * '..', and the resolved path must stay under the resolved root. A '..'
 * segment used to pass the per-segment alphabet (dots are in it) and, via
 * `join`, escape the root; a caller passing an untrusted ref (or an
 * untrusted runId, which prefixes checkpoint and workflow-source refs)
 * could read, write, or delete `.bin` files outside `dir`.
 */
export class FileTranscriptStore implements TranscriptStore {
  private readonly dir: string;

  constructor(options: { dir: string }) {
    this.dir = options.dir;
    mkdirSync(this.dir, { recursive: true });
  }

  private blobPath(ref: string): string {
    const segments = ref.split('/');
    for (const segment of segments) {
      if (
        segment === '' ||
        segment === '.' ||
        segment === '..' ||
        !/^[A-Za-z0-9._-]+$/.test(segment)
      ) {
        throw new JournalOrderViolation(
          `FileTranscriptStore: ref segment '${segment}' is not filesystem-safe`,
        );
      }
    }
    const name = segments.pop() ?? '';
    const path = join(this.dir, ...segments, `${name}${TRANSCRIPT_SUFFIX}`);
    // Containment backstop: even segments that pass the alphabet must
    // resolve under the configured root (guards a root that itself ends in
    // a separator, prefix collisions, and any platform join surprise).
    const root = resolve(this.dir);
    const resolved = resolve(path);
    if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) {
      throw new JournalOrderViolation(
        `FileTranscriptStore: ref '${ref}' resolves outside the configured root`,
      );
    }
    return path;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async put(ref: string, blob: Bytes): Promise<void> {
    const path = this.blobPath(ref);
    mkdirSync(dirname(path), { recursive: true });
    const temp = `${path}.tmp`;
    writeFileSync(temp, blob);
    renameSync(temp, path);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async get(ref: string): Promise<Bytes | null> {
    try {
      return new Uint8Array(readFileSync(this.blobPath(ref)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async list(runId: string): Promise<string[]> {
    // safeName admits a bare '.' or '..' (dots are in its alphabet), which
    // would walk the parent directory and leak refs outside the root
    // (v1.36.0 review SEC-P1); reject the traversal runId here.
    if (runId === '.' || runId === '..') {
      throw new JournalOrderViolation(
        `FileTranscriptStore: runId '${runId}' is not filesystem-safe`,
      );
    }
    const root = join(this.dir, safeName(runId));
    const refs: string[] = [];
    const walk = (dir: string, prefix: string): void => {
      let names: string[];
      try {
        names = readdirSync(dir);
      } catch {
        return;
      }
      for (const name of names) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          walk(path, `${prefix}${name}/`);
        } else if (name.endsWith(TRANSCRIPT_SUFFIX)) {
          refs.push(`${prefix}${name.slice(0, -TRANSCRIPT_SUFFIX.length)}`);
        }
      }
    };
    walk(root, `${runId}/`);
    return refs.sort();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(ref: string): Promise<void> {
    try {
      rmSync(this.blobPath(ref));
    } catch (error) {
      // A missing ref is a no-op, never an error.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
