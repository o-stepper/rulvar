/**
 * TranscriptStore SPI: transcripts, turn-boundary checkpoints, and worktree
 * patches as blobs separate from the journal, so the journal stays small
 * and diffable. One of the six SPI seams frozen at 1.0 (M1-T04).
 *
 * Full contract: https://docs.rulvar.com/guide/stores. Blob
 * contents are engine-internal.
 */
import type { Bytes } from '../json.js';

export interface TranscriptStore {
  put(ref: string, blob: Bytes): Promise<void>;
  get(ref: string): Promise<Bytes | null>;
  list(runId: string): Promise<string[]>;
  /**
   * Deletes one blob; a missing ref is a no-op, never an error (M8-T04
   * amendment, OQ-20: retention is impossible without blob deletion).
   * The cascade over a run's blobs is ENGINE-side (Engine.deleteRun),
   * never a store obligation.
   */
  delete(ref: string): Promise<void>;
}
