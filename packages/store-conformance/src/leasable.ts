/**
 * leasableStoreConformance (M2-T11, DEF-4): the executable definition of
 * the lease capability.
 * Mandatory: acquire on a held lease rejects with the typed
 * LeaseHeldError; the fencing epoch is monotonic per run; an append
 * carrying a stale epoch is rejected AND invisible to subsequent loads;
 * a released lease can neither renew nor append.
 *
 * The renew-cadence rule (at most ttl/3) is a HOLDER obligation; the
 * store-side counterpart checked here (when `ttlMs` is provided) is that
 * a lease renewed at that cadence stays held past the original ttl and
 * that an unrenewed lease becomes reclaimable. The first LeasableStore
 * ships in M5 (@rulvar/store-sqlite); the multi-process soak re-runs
 * these sections under real concurrency in M8.
 */
import { LeaseHeldError, type JournalEntry, type LeasableStore, type Lease } from '@rulvar/core';
import {
  ensure,
  makeSuite,
  type ConformanceCheck,
  type ConformanceSuite,
  type StoreFactory,
} from './types.js';

const RUN = 'lease-run';

function leaseEntry(seq: number): JournalEntry {
  return {
    hashVersion: 2,
    seq,
    scope: '',
    key: `lease-key-${seq}`,
    ordinal: 0,
    kind: 'step',
    status: 'ok',
    value: { seq },
    spanId: 'lease-span',
    startedAt: new Date(1_700_000_000_000 + seq * 1000).toISOString(),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mustReject(operation: () => Promise<unknown>): Promise<unknown> {
  try {
    await operation();
  } catch (thrown) {
    return thrown;
  }
  return undefined;
}

export function leasableStoreConformance(
  mk: StoreFactory<LeasableStore>,
  options?: {
    /**
     * The store's configured lease TTL, when known: enables the
     * wall-clock expiry and renew-keeps-held checks against the MAIN
     * factory. LEGACY single-ttl pairing: the mandatory checks follow
     * the suite's no-wall-clock convention, and a short shared ttl lets
     * one scheduler stall expire a just-acquired lease inside them (the
     * cycle 80 CI flake). Prefer `expiry`.
     */
    ttlMs?: number;
    /**
     * The wall-clock expiry check's OWN store and ttl (cycle 80): hand
     * the mandatory checks a main factory whose ttl no realistic stall
     * can cross, and give the expiry check its short-ttl store here.
     * Wins over `ttlMs` when both are present.
     */
    expiry?: { ttlMs: number; mk: StoreFactory<LeasableStore> };
  },
): ConformanceSuite {
  const checks: ConformanceCheck[] = [
    {
      id: 'lease-exclusive-acquire',
      title: 'acquire on a held lease rejects with the typed LeaseHeldError',
      async run() {
        const store = await mk();
        const held = await store.acquire(RUN, 'owner-a');
        ensure(
          held.runId === RUN && held.owner === 'owner-a' && typeof held.epoch === 'number',
          'lease-exclusive-acquire',
          'acquire must return a Lease with runId, owner, and a numeric fencing epoch',
        );
        const rejection = await mustReject(() => store.acquire(RUN, 'owner-b'));
        ensure(
          rejection instanceof LeaseHeldError,
          'lease-exclusive-acquire',
          'a second acquire while held must reject with LeaseHeldError (typed, code lease_held)',
        );
        await store.release(held);
        const reacquired = await store.acquire(RUN, 'owner-b');
        ensure(
          reacquired.owner === 'owner-b',
          'lease-exclusive-acquire',
          'after release, acquire must succeed for a new owner',
        );
      },
    },
    {
      id: 'fencing-stale-epoch',
      title: 'the epoch is monotonic; a stale-epoch append is rejected and invisible',
      async run() {
        const store = await mk();
        const first = await store.acquire(RUN, 'owner-a');
        await store.append(RUN, leaseEntry(0), first);
        await store.release(first);
        const second = await store.acquire(RUN, 'owner-b');
        ensure(
          second.epoch > first.epoch,
          'fencing-stale-epoch',
          `the fencing epoch must be monotonic per run (got ${second.epoch} after ${first.epoch})`,
        );
        await store.append(RUN, leaseEntry(1), second);
        const rejection = await mustReject(() => store.append(RUN, leaseEntry(2), first));
        ensure(
          rejection !== undefined,
          'fencing-stale-epoch',
          'an append carrying a stale epoch must be rejected',
        );
        const loaded = await store.load(RUN);
        ensure(
          loaded.length === 2 && !loaded.some((item) => item.seq === 2),
          'fencing-stale-epoch',
          'a rejected stale-epoch append must never appear in load',
        );
      },
    },
    {
      id: 'fencing-epoch-tombstone',
      title: 'delete/recreate of the same runId keeps the epoch strictly monotonic',
      async run() {
        const store = await mk();
        // Incarnation 1: a worker with a STABLE identity (the k8s
        // StatefulSet norm) acquires and does work; then it goes silent
        // and the host deletes the run (retention) and recreates the
        // SAME explicit runId.
        const zombie = await store.acquire(RUN, 'owner-stable');
        await store.append(RUN, leaseEntry(0), zombie);
        // Release stands in for the ttl expiry of the silent worker
        // (the suite's no-wall-clock convention); the zombie OBJECT and
        // its epoch live on in the crashed process.
        await store.release(zombie);
        await store.delete(RUN);
        const fresh = await store.acquire(RUN, 'owner-stable');
        ensure(
          fresh.epoch > zombie.epoch,
          'fencing-epoch-tombstone',
          `acquire after delete/recreate must return a strictly higher epoch than any epoch ` +
            `the deleted incarnation held (got ${fresh.epoch} after ${zombie.epoch}); keep an ` +
            `epoch tombstone through deletion`,
        );
        await store.append(RUN, leaseEntry(0), fresh);
        // The zombie thread of the deleted incarnation wakes up: its
        // lease carries the same runId, the same owner, and its old
        // epoch, so ONLY strict monotonicity keeps it out.
        ensure(
          (await mustReject(() => store.append(RUN, leaseEntry(1), zombie))) !== undefined,
          'fencing-epoch-tombstone',
          'an append under a lease from a deleted incarnation must reject',
        );
        ensure(
          (await mustReject(() => store.renew(zombie))) !== undefined,
          'fencing-epoch-tombstone',
          'renew of a lease from a deleted incarnation must reject',
        );
        const loaded = await store.load(RUN);
        ensure(
          loaded.length === 1 && !loaded.some((item) => item.seq === 1),
          'fencing-epoch-tombstone',
          'a rejected zombie append must never appear in the recreated run',
        );
      },
    },
    {
      id: 'lease-release-fences',
      title: 'a released lease can neither renew nor append',
      async run() {
        const store = await mk();
        const lease: Lease = await store.acquire(RUN, 'owner-a');
        await store.renew(lease);
        await store.release(lease);
        ensure(
          (await mustReject(() => store.renew(lease))) !== undefined,
          'lease-release-fences',
          'renew of a released lease must reject',
        );
        ensure(
          (await mustReject(() => store.append(RUN, leaseEntry(0), lease))) !== undefined,
          'lease-release-fences',
          'append under a released lease must reject',
        );
        ensure(
          (await store.load(RUN)).length === 0,
          'lease-release-fences',
          'nothing may be visible after only-rejected appends',
        );
      },
    },
  ];

  const expiry =
    options?.expiry ?? (options?.ttlMs === undefined ? undefined : { ttlMs: options.ttlMs, mk });
  if (expiry !== undefined) {
    const { ttlMs, mk: mkExpiry } = expiry;
    checks.push({
      id: 'lease-ttl-and-renew-cadence',
      title: 'renew at ttl/3 keeps the lease held past ttl; an unrenewed lease expires',
      async run() {
        const store = await mkExpiry();
        // Renewed at the mandated cadence: still held after 1.5 * ttl.
        const held = await store.acquire(RUN, 'owner-a');
        const cadence = Math.floor(ttlMs / 3);
        const deadline = Date.now() + Math.ceil(ttlMs * 1.5);
        while (Date.now() < deadline) {
          await sleep(cadence);
          await store.renew(held);
          const rejection = await mustReject(() => store.acquire(RUN, 'owner-b'));
          ensure(
            rejection instanceof LeaseHeldError,
            'lease-ttl-and-renew-cadence',
            'a lease renewed at ttl/3 must stay held past the original ttl',
          );
        }
        await store.release(held);
        // Never renewed: reclaimable after ttl.
        const abandoned = await store.acquire('expiring-run', 'owner-a');
        await sleep(Math.ceil(ttlMs * 1.2));
        const successor = await store.acquire('expiring-run', 'owner-b');
        ensure(
          successor.epoch > abandoned.epoch,
          'lease-ttl-and-renew-cadence',
          'reclaiming an expired lease must advance the fencing epoch',
        );
      },
    });
  }

  return makeSuite('leasableStoreConformance', checks);
}
