/**
 * fencedTranscriptsConformance (the fenced run state RFC, F2): the
 * executable definition of the `fencedWrites` capability on the
 * TRANSCRIPT side. Run it ONLY against a transcript store declaring the
 * marker, paired with the leasable journal store that shares its
 * fencing domain (leases are minted on the journal side; the promise
 * under test is that a blob mutation checks them atomically):
 * - a `put` or `delete` carrying a stale or released lease rejects with
 *   the typed LeaseHeldError and the prior blob survives byte intact
 *   (the RFC's F2 shape: a superseded segment's late checkpoint save
 *   must not regress the blob a later boot decodes);
 * - a live lease for a run OTHER than the one the ref's leading path
 *   segment names guards nothing and rejects the same way;
 * - a mutation carrying no lease keeps single-writer semantics.
 *
 * Staleness is produced with release+reacquire (the epoch is monotonic
 * per the leasable contract), so the suite needs no wall-clock sleeps.
 */
import { LeaseHeldError, type Bytes, type LeasableStore, type TranscriptStore } from '@rulvar/core';
import {
  ensure,
  makeSuite,
  type ConformanceCheck,
  type ConformanceSuite,
  type StoreFactory,
} from './types.js';

/**
 * The paired factory product: the transcript store under test plus the
 * leasable journal store sharing its fencing domain.
 */
export interface FencedTranscriptsFixture {
  journal: LeasableStore;
  transcripts: TranscriptStore;
}

const RUN = 'fenced-run';
const OTHER = 'fenced-other-run';
// The deterministic checkpoint-shaped ref two segments of one attempt share.
const REF = `${RUN}/ckpt/7`;

function blobOf(tag: number): Bytes {
  return new Uint8Array([0x01, tag, 0x2a]);
}

function sameBytes(a: Bytes | null, b: Bytes): boolean {
  return a !== null && a.length === b.length && a.every((byte, i) => byte === b[i]);
}

async function mustRejectFenced(
  checkId: string,
  what: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  try {
    await operation();
  } catch (thrown) {
    ensure(
      thrown instanceof LeaseHeldError,
      checkId,
      `${what} must reject with the typed LeaseHeldError, got ${String(thrown)}`,
    );
    return;
  }
  ensure(false, checkId, `${what} must reject`);
}

export function fencedTranscriptsConformance(
  mk: StoreFactory<FencedTranscriptsFixture>,
): ConformanceSuite {
  const checks: ConformanceCheck[] = [
    {
      id: 'fenced-transcripts-marker-declared',
      title: 'the transcript store declares the fencedWrites promise',
      async run() {
        const { transcripts } = await mk();
        ensure(
          transcripts.fencedWrites === true,
          'fenced-transcripts-marker-declared',
          'fencedTranscriptsConformance targets transcript stores declaring ' +
            '`fencedWrites: true`; the marker is a promise, not an inference',
        );
      },
    },
    {
      id: 'fenced-transcripts-stale-put-rejected',
      title: 'a stale put rejects typed and the successor blob is intact',
      async run() {
        const { journal, transcripts } = await mk();
        const first = await journal.acquire(RUN, 'owner-a');
        await transcripts.put(REF, blobOf(1), first);
        await journal.release(first);
        const second = await journal.acquire(RUN, 'owner-b');
        await transcripts.put(REF, blobOf(3), second);
        // The superseded segment's late checkpoint save: the exact F2
        // shape (last write wins would regress the next boot).
        await mustRejectFenced('fenced-transcripts-stale-put-rejected', 'a stale put', () =>
          transcripts.put(REF, blobOf(2), first),
        );
        ensure(
          sameBytes(await transcripts.get(REF), blobOf(3)),
          'fenced-transcripts-stale-put-rejected',
          'the successor blob must survive a stale put byte intact',
        );
      },
    },
    {
      id: 'fenced-transcripts-stale-delete-rejected',
      title: 'a stale delete rejects typed and the blob is intact',
      async run() {
        const { journal, transcripts } = await mk();
        const first = await journal.acquire(RUN, 'owner-a');
        await transcripts.put(REF, blobOf(3), first);
        await journal.release(first);
        const second = await journal.acquire(RUN, 'owner-b');
        await mustRejectFenced('fenced-transcripts-stale-delete-rejected', 'a stale delete', () =>
          transcripts.delete(REF, first),
        );
        ensure(
          sameBytes(await transcripts.get(REF), blobOf(3)),
          'fenced-transcripts-stale-delete-rejected',
          'the blob must survive a stale delete byte intact',
        );
        // The live holder's delete succeeds, and deleting the now
        // missing ref again stays a no-op under the same live lease.
        await transcripts.delete(REF, second);
        ensure(
          (await transcripts.get(REF)) === null,
          'fenced-transcripts-stale-delete-rejected',
          'a delete under the current lease must remove the blob',
        );
        await transcripts.delete(REF, second);
      },
    },
    {
      id: 'fenced-transcripts-run-match',
      title: 'a live lease for a different run guards nothing',
      async run() {
        const { journal, transcripts } = await mk();
        const foreign = await journal.acquire(OTHER, 'owner-a');
        await transcripts.put(REF, blobOf(1));
        await mustRejectFenced('fenced-transcripts-run-match', 'a cross-run put', () =>
          transcripts.put(REF, blobOf(9), foreign),
        );
        await mustRejectFenced('fenced-transcripts-run-match', 'a cross-run delete', () =>
          transcripts.delete(REF, foreign),
        );
        ensure(
          sameBytes(await transcripts.get(REF), blobOf(1)),
          'fenced-transcripts-run-match',
          'the blob guarded by nobody must survive every cross-run mutation attempt',
        );
        // Positive control: the same lease fences exactly the run its
        // refs name, so a put under its OWN run prefix goes through.
        const ownRef = `${OTHER}/ckpt/1`;
        await transcripts.put(ownRef, blobOf(5), foreign);
        ensure(
          sameBytes(await transcripts.get(ownRef), blobOf(5)),
          'fenced-transcripts-run-match',
          "a put guarded by the ref's own run lease must succeed",
        );
      },
    },
    {
      id: 'fenced-transcripts-unleased-passthrough',
      title: 'mutations carrying no lease keep single-writer semantics',
      async run() {
        const { transcripts } = await mk();
        await transcripts.put(REF, blobOf(1));
        ensure(
          sameBytes(await transcripts.get(REF), blobOf(1)),
          'fenced-transcripts-unleased-passthrough',
          'an unleased put must keep working',
        );
        ensure(
          (await transcripts.list(RUN)).includes(REF),
          'fenced-transcripts-unleased-passthrough',
          "list(runId) must surface the run's refs",
        );
        await transcripts.delete(REF);
        ensure(
          (await transcripts.get(REF)) === null,
          'fenced-transcripts-unleased-passthrough',
          'an unleased delete must keep working',
        );
        // A missing ref stays a no-op, never an error.
        await transcripts.delete(REF);
      },
    },
  ];

  return makeSuite('fencedTranscriptsConformance', checks);
}
