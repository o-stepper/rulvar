/**
 * JsonlFileStore (M2-T01): the durable file store. One JSON entry per
 * line per run; the journal doubles as an event log. Meta records live
 * beside the journal and are replaced atomically, so listRuns never
 * parses payloads.
 *
 * Contract (DEF-4 tightening):
 * - A1 atomicity: a torn trailing line (crash mid-append) is never
 *   visible in load; it is dropped and overwritten by the next append.
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
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
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

export class JsonlFileStore implements MetaLookupStore {
  private readonly dir: string;
  /**
   * The stored tail seq per run, lazily initialized from the file on the
   * first append this instance performs (obligation A5). Per instance by
   * design: cross-process writers are the lease seam's job.
   */
  private readonly lastSeq = new Map<string, number>();

  constructor(options: { dir: string }) {
    this.dir = options.dir;
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
          // Torn trailing write from a crash: invisible per A1. The next
          // append will start a fresh line after repair.
          this.repairTornTail(runId, entries);
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
 * so compiled runs resume across processes. Refs follow
 * the `<runId>/<name>` convention; each path segment is checked
 * filesystem-safe and nested segments become directories.
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
      if (!/^[A-Za-z0-9._-]+$/.test(segment)) {
        throw new JournalOrderViolation(
          `FileTranscriptStore: ref segment '${segment}' is not filesystem-safe`,
        );
      }
    }
    const name = segments.pop() ?? '';
    return join(this.dir, ...segments, `${name}${TRANSCRIPT_SUFFIX}`);
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
