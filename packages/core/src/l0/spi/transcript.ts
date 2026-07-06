/**
 * TranscriptStore SPI: transcripts, turn-boundary checkpoints, and worktree
 * patches as blobs separate from the journal, so the journal stays small
 * and diffable. One of the six SPI seams frozen at 1.0 (M1-T04).
 *
 * Owning spec: docs/03-journal-spec.md, section "TranscriptStore". Blob
 * contents are engine-internal.
 */
import type { Bytes } from '../json.js';

export interface TranscriptStore {
  put(ref: string, blob: Bytes): Promise<void>;
  get(ref: string): Promise<Bytes | null>;
  list(runId: string): Promise<string[]>;
}
