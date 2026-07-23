/**
 * TranscriptStore SPI: transcripts, turn-boundary checkpoints, and worktree
 * patches as blobs separate from the journal, so the journal stays small
 * and diffable. One of the six SPI seams frozen at 1.0 (M1-T04).
 *
 * Full contract: https://docs.rulvar.com/guide/stores. Blob
 * contents are engine-internal.
 */
import type { Bytes } from '../json.js';
import type { Lease } from './store.js';

export interface TranscriptStore {
  put(ref: string, blob: Bytes, lease?: Lease): Promise<void>;
  get(ref: string): Promise<Bytes | null>;
  list(runId: string): Promise<string[]>;
  /**
   * Deletes one blob; a missing ref is a no-op, never an error (M8-T04
   * amendment, OQ-20: retention is impossible without blob deletion).
   * The cascade over a run's blobs is ENGINE-side (Engine.deleteRun),
   * never a store obligation.
   */
  delete(ref: string, lease?: Lease): Promise<void>;
  /**
   * Fenced writes capability (the fenced run state RFC, phase 2), the
   * transcript-side twin of the JournalStore marker: a store declaring
   * it verifies a lease-carrying `put` or `delete` against the CURRENT
   * lease of the run the ref's leading path segment names, atomically
   * with the mutation, and rejects stale holders with the typed
   * LeaseHeldError leaving the prior blob intact. The engine threads
   * the segment's lease into every blob write of a leased resume
   * (checkpoints, compaction summaries, worktree patches, workflow
   * sources). The shipped file and in-memory transcript stores do NOT
   * declare it (they are single-writer by contract); a fenced
   * implementation needs the blobs and the lease state in one
   * transactional domain, which is exactly how the sqlite twin ships:
   * `SqliteStore.transcripts()` in `@rulvar/store-sqlite` keeps blobs
   * beside the lease rows of the same database.
   */
  readonly fencedWrites?: true;
}
