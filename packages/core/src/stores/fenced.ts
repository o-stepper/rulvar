/**
 * Fenced writes capability guards (the fenced run state RFC, phase 2):
 * the one place a host asserts, at deployment time, that its stores
 * enforce the lease epoch on EVERY mutation instead of only on journal
 * appends. Detection mirrors the meta lookup guard: the marker is a
 * declared promise, checked by the conformance kit, never inferred.
 */
import type { JournalStore } from '../l0/spi/store.js';
import type { TranscriptStore } from '../l0/spi/transcript.js';
import { ConfigError } from '../l0/errors.js';

/** Capability guard: the store declares the fenced writes promise. */
export function hasFencedWrites(store: JournalStore | TranscriptStore): boolean {
  return store.fencedWrites === true;
}

/**
 * Deployment-time assertion for queue hosts that require the full
 * fence: throws a typed ConfigError naming each store that does NOT
 * declare `fencedWrites`. A host that tolerates advisory meta or
 * transcript writes simply never calls this. The shipped pair that
 * satisfies it with transcripts present is `@rulvar/store-sqlite`:
 * the store as the journal plus its `transcripts()` twin.
 */
export function assertFencedWrites(stores: {
  journal: JournalStore;
  transcripts?: TranscriptStore;
}): void {
  const unfenced: string[] = [];
  if (!hasFencedWrites(stores.journal)) {
    unfenced.push('journal');
  }
  if (stores.transcripts !== undefined && !hasFencedWrites(stores.transcripts)) {
    unfenced.push('transcripts');
  }
  if (unfenced.length > 0) {
    throw new ConfigError(
      `the ${unfenced.join(' and ')} store${unfenced.length > 1 ? 's do' : ' does'} not declare ` +
        'the fencedWrites capability: run meta, blob, or deletion writes by a superseded ' +
        'worker would land unfenced (https://docs.rulvar.com/contributing/rfc-fenced-run-state)',
    );
  }
}
