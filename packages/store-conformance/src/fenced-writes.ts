/**
 * fencedWritesConformance (the fenced run state RFC, phase 2): the
 * executable definition of the `fencedWrites` capability. Run it ONLY
 * against stores that declare the marker; the checks are the promise
 * the marker makes:
 * - a mutation carrying a stale or released lease (putMeta, delete,
 *   append) rejects with the typed LeaseHeldError and mutates NOTHING;
 * - a mutation guarded by a live lease for a DIFFERENT run rejects the
 *   same way (a lease fences exactly the run it names);
 * - a mutation carrying no lease keeps single-writer semantics.
 *
 * Staleness is produced with release+reacquire (the epoch is monotonic
 * per the leasable contract), so the suite needs no wall-clock sleeps.
 */
import {
  LeaseHeldError,
  type JournalEntry,
  type LeasableStore,
  type MetaLookupStore,
  type RunMeta,
} from '@rulvar/core';
import {
  ensure,
  makeSuite,
  type ConformanceCheck,
  type ConformanceSuite,
  type StoreFactory,
} from './types.js';

const RUN = 'fenced-run';
const OTHER = 'fenced-other-run';

function fencedEntry(seq: number): JournalEntry {
  return {
    hashVersion: 2,
    seq,
    scope: '',
    key: `fenced-key-${seq}`,
    ordinal: 0,
    kind: 'step',
    status: 'ok',
    value: { seq },
    spanId: 'fenced-span',
    startedAt: new Date(1_700_000_000_000 + seq * 1000).toISOString(),
  };
}

function meta(runId: string, status: string, segments: number): RunMeta {
  return { runId, status, segments, updatedAt: `at-${status}-${String(segments)}` };
}

async function readMeta(store: LeasableStore, runId: string): Promise<RunMeta | undefined> {
  const lookup = store as Partial<MetaLookupStore>;
  if (typeof lookup.getMeta === 'function') {
    return lookup.getMeta(runId);
  }
  return (await store.listRuns()).find((m) => m.runId === runId);
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

export function fencedWritesConformance(mk: StoreFactory<LeasableStore>): ConformanceSuite {
  const checks: ConformanceCheck[] = [
    {
      id: 'fenced-marker-declared',
      title: 'the store declares the fencedWrites promise',
      async run() {
        const store = await mk();
        ensure(
          store.fencedWrites === true,
          'fenced-marker-declared',
          'fencedWritesConformance targets stores declaring `fencedWrites: true`; the marker ' +
            'is a promise, not an inference',
        );
      },
    },
    {
      id: 'fenced-meta-stale-rejected',
      title: 'a stale putMeta rejects typed and the successor meta is intact',
      async run() {
        const store = await mk();
        const first = await store.acquire(RUN, 'owner-a');
        await store.putMeta(meta(RUN, 'running', 2), first);
        await store.release(first);
        const second = await store.acquire(RUN, 'owner-b');
        await store.putMeta(meta(RUN, 'running', 3), second);
        // The superseded owner's terminal settle: the exact F1 shape.
        await mustRejectFenced('fenced-meta-stale-rejected', 'a stale putMeta', () =>
          store.putMeta(meta(RUN, 'cancelled', 2), first),
        );
        const current = await readMeta(store, RUN);
        ensure(
          current !== undefined && current.status === 'running' && current.segments === 3,
          'fenced-meta-stale-rejected',
          'the successor meta (status running, segments 3) must survive a stale putMeta ' +
            `unchanged, got ${JSON.stringify(current)}`,
        );
      },
    },
    {
      id: 'fenced-delete-stale-rejected',
      title: 'a stale delete rejects typed and journal plus meta are intact',
      async run() {
        const store = await mk();
        const first = await store.acquire(RUN, 'owner-a');
        await store.append(RUN, fencedEntry(0), first);
        await store.putMeta(meta(RUN, 'running', 1), first);
        await store.release(first);
        const second = await store.acquire(RUN, 'owner-b');
        await mustRejectFenced('fenced-delete-stale-rejected', 'a stale delete', () =>
          store.delete(RUN, first),
        );
        ensure(
          (await store.load(RUN)).length === 1,
          'fenced-delete-stale-rejected',
          'the journal must survive a stale delete unchanged',
        );
        ensure(
          (await readMeta(store, RUN)) !== undefined,
          'fenced-delete-stale-rejected',
          'the meta row must survive a stale delete unchanged',
        );
        // The live holder's delete succeeds and removes the run.
        await store.delete(RUN, second);
        ensure(
          (await store.load(RUN)).length === 0 && (await readMeta(store, RUN)) === undefined,
          'fenced-delete-stale-rejected',
          'a delete under the current lease must remove the journal and the meta row',
        );
      },
    },
    {
      id: 'fenced-run-match',
      title: 'a live lease for a different run guards nothing',
      async run() {
        const store = await mk();
        const foreign = await store.acquire(OTHER, 'owner-a');
        await store.putMeta(meta(RUN, 'running', 1));
        await store.append(RUN, fencedEntry(0));
        await mustRejectFenced('fenced-run-match', 'a cross-run putMeta', () =>
          store.putMeta(meta(RUN, 'cancelled', 1), foreign),
        );
        await mustRejectFenced('fenced-run-match', 'a cross-run append', () =>
          store.append(RUN, fencedEntry(1), foreign),
        );
        await mustRejectFenced('fenced-run-match', 'a cross-run delete', () =>
          store.delete(RUN, foreign),
        );
        const current = await readMeta(store, RUN);
        ensure(
          current !== undefined && current.status === 'running',
          'fenced-run-match',
          'the run guarded by nobody must survive every cross-run mutation attempt',
        );
        ensure(
          (await store.load(RUN)).length === 1,
          'fenced-run-match',
          'a cross-run append must never become visible',
        );
      },
    },
    {
      id: 'fenced-unleased-passthrough',
      title: 'mutations carrying no lease keep single-writer semantics',
      async run() {
        const store = await mk();
        await store.putMeta(meta(RUN, 'running', 1));
        await store.append(RUN, fencedEntry(0));
        const current = await readMeta(store, RUN);
        ensure(
          current !== undefined && current.status === 'running',
          'fenced-unleased-passthrough',
          'an unleased putMeta must keep working',
        );
        await store.delete(RUN);
        ensure(
          (await store.load(RUN)).length === 0 && (await readMeta(store, RUN)) === undefined,
          'fenced-unleased-passthrough',
          'an unleased delete must keep working',
        );
      },
    },
  ];

  return makeSuite('fencedWritesConformance', checks);
}
