/**
 * InMemoryStore (M1-T04): the default journal store. Process-local, so
 * nothing survives a process exit and cross-process resume is
 * impossible (same-process resume of a kept instance works); the store
 * warns loudly exactly once per instance unless constructed with
 * `quiet: true` (the deliberate choice of a test tier).
 * An in-memory TranscriptStore ships alongside for the same default.
 */
import { JournalOrderViolation } from '../l0/errors.js';
import type { Bytes } from '../l0/json.js';
import type { JournalEntry } from '../l0/entries.js';
import type { MetaLookupStore, RunFilter, RunMeta } from '../l0/spi/store.js';
import type { TranscriptStore } from '../l0/spi/transcript.js';
import { metaMatchesFilter } from './meta-lookup.js';

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class InMemoryStore implements MetaLookupStore {
  private readonly runs = new Map<string, JournalEntry[]>();
  private readonly metas = new Map<string, RunMeta>();
  private warned: boolean;

  constructor(options?: { quiet?: boolean }) {
    // A deliberate in-memory choice (a test engine, a throwaway script)
    // opts out of the durability warning; the accidental default keeps it.
    this.warned = options?.quiet === true;
  }

  append(runId: string, e: JournalEntry): Promise<void> {
    this.warnOnce();
    const entries = this.runs.get(runId) ?? [];
    // Monotonic seq (obligation A5): a stale or duplicate seq means a
    // second writer raced this journal from an outdated tail; exactly
    // one of them may persist, the loser gets the typed conflict.
    // Entries without a finite seq pass through unguarded (A4 opacity).
    const tail = entries[entries.length - 1];
    if (
      tail !== undefined &&
      Number.isFinite(e.seq) &&
      Number.isFinite(tail.seq) &&
      e.seq <= tail.seq
    ) {
      return Promise.reject(
        new JournalOrderViolation(
          `InMemoryStore: append of seq ${e.seq} to run '${runId}' is not after the stored ` +
            `tail seq ${tail.seq}; a concurrent writer raced this journal from a stale tail`,
        ),
      );
    }
    // Deep copy on write: A4 opacity plus decoupling from caller mutation.
    entries.push(deepCopy(e));
    this.runs.set(runId, entries);
    return Promise.resolve();
  }

  load(runId: string): Promise<JournalEntry[]> {
    return Promise.resolve(deepCopy(this.runs.get(runId) ?? []));
  }

  putMeta(m: RunMeta): Promise<void> {
    this.metas.set(m.runId, deepCopy(m));
    return Promise.resolve();
  }

  getMeta(runId: string): Promise<RunMeta | undefined> {
    const meta = this.metas.get(runId);
    return Promise.resolve(meta === undefined ? undefined : deepCopy(meta));
  }

  listRuns(f?: RunFilter): Promise<RunMeta[]> {
    const filtered = [...this.metas.values()]
      .filter((meta) => metaMatchesFilter(meta, f))
      .map(deepCopy);
    return Promise.resolve(filtered);
  }

  delete(runId: string): Promise<void> {
    this.runs.delete(runId);
    this.metas.delete(runId);
    return Promise.resolve();
  }

  private warnOnce(): void {
    if (this.warned) {
      return;
    }
    this.warned = true;
    process.emitWarning(
      'InMemoryStore keeps journals in process memory: nothing survives a ' +
        'process exit, and a run cannot be resumed from another process. Use ' +
        'JsonlFileStore (M2) or @rulvar/store-sqlite (M5) for durable runs.',
      { code: 'RULVAR_INMEMORY_STORE', type: 'RulvarWarning' },
    );
  }
}

/**
 * In-memory TranscriptStore. Refs follow the `<runId>/<name>` convention
 * so list(runId) can filter without a side index.
 */
export class InMemoryTranscriptStore implements TranscriptStore {
  private readonly blobs = new Map<string, Bytes>();

  put(ref: string, blob: Bytes): Promise<void> {
    this.blobs.set(ref, blob.slice());
    return Promise.resolve();
  }

  get(ref: string): Promise<Bytes | null> {
    const blob = this.blobs.get(ref);
    return Promise.resolve(blob === undefined ? null : blob.slice());
  }

  list(runId: string): Promise<string[]> {
    const prefix = `${runId}/`;
    return Promise.resolve([...this.blobs.keys()].filter((ref) => ref.startsWith(prefix)));
  }

  delete(ref: string): Promise<void> {
    // A missing ref is a no-op, never an error.
    this.blobs.delete(ref);
    return Promise.resolve();
  }
}
