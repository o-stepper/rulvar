/**
 * InMemoryStore (M1-T04): the default journal store. Process-local, so
 * nothing survives the process and resume is disabled; the store warns
 * loudly exactly once per instance.
 * An in-memory TranscriptStore ships alongside for the same default.
 */
import type { Bytes } from '../l0/json.js';
import type { JournalEntry } from '../l0/entries.js';
import type { JournalStore, RunFilter, RunMeta } from '../l0/spi/store.js';
import type { TranscriptStore } from '../l0/spi/transcript.js';

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class InMemoryStore implements JournalStore {
  private readonly runs = new Map<string, JournalEntry[]>();
  private readonly metas = new Map<string, RunMeta>();
  private warned = false;

  append(runId: string, e: JournalEntry): Promise<void> {
    this.warnOnce();
    const entries = this.runs.get(runId) ?? [];
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

  listRuns(f?: RunFilter): Promise<RunMeta[]> {
    const all = [...this.metas.values()].map(deepCopy);
    const filtered = all.filter((meta) => {
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
      'InMemoryStore keeps journals in process memory: nothing survives the ' +
        'process and resume is disabled. Use JsonlFileStore (M2) or ' +
        '@rulvar/store-sqlite (M5) for durable runs.',
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
