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
import type { JournalStore, RunFilter, RunMeta } from '../l0/spi/store.js';
import type { TranscriptStore } from '../l0/spi/transcript.js';

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

export class JsonlFileStore implements JournalStore {
  private readonly dir: string;

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

  // eslint-disable-next-line @typescript-eslint/require-await
  async append(runId: string, e: JournalEntry): Promise<void> {
    // One serialized line per entry; a crash can only tear the final
    // line, which load discards (A1). The kernel's per-run queue is the
    // single writer (A2).
    appendFileSync(this.journalPath(runId), `${JSON.stringify(e)}\n`, 'utf8');
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
    const filtered = metas.filter((meta) => {
      if (f?.status !== undefined && meta.status !== f.status) {
        return false;
      }
      if (f?.name !== undefined && meta.name !== f.name) {
        return false;
      }
      if (f?.tags !== undefined && !f.tags.every((tag) => meta.tags?.includes(tag))) {
        return false;
      }
      return true;
    });
    return filtered;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(runId: string): Promise<void> {
    rmSync(this.journalPath(runId), { force: true });
    rmSync(this.metaPath(runId), { force: true });
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
