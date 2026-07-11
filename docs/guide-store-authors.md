# Community guide: writing a JournalStore

- Status: Ready for implementation
- Version: 0.2.0-docs
- Date: 2026-07-10
- Purpose: the community walkthrough for building a third-party JournalStore/LeasableStore against the frozen storage seam, with @rulvar/store-conformance as the executable definition and @rulvar/store-sqlite as the reference implementation (M9-T03).

## 1. What you are implementing

The journal storage seam is one of the six SPI seams frozen at 1.0 (02-architecture.md, section "SPI seams and the 1.0 freeze"). A store persists append-only journals; the kernel derives every other fact by folding entries. Your store never interprets payloads: it moves opaque JSON.

The contract is owned by 03-journal-spec.md, section "Storage SPI". This guide is informative; where it restates a rule, the owning spec wins.

```ts
export type Lease = { runId: string; owner: string; epoch: number };

export interface JournalStore {
  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  putMeta(m: RunMeta): Promise<void>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  delete(runId: string): Promise<void>;
}

export interface LeasableStore extends JournalStore {
  acquire(runId: string, owner: string): Promise<Lease>;
  renew(l: Lease): Promise<void>;
  release(l: Lease): Promise<void>;
}
```

TranscriptStore (large blobs: transcripts, checkpoints, patches) is a sibling seam with the same discipline: `put`/`get`/`list`/`delete(ref)`, where deleting a missing ref is a no-op (03-journal-spec.md, section "Storage SPI").

## 2. The contracts your store MUST satisfy

- A1 append atomicity: an append is all-or-nothing; a reader never observes a torn entry.
- A2 total per-run order: `load(runId)` returns entries exactly in append order. The store never reorders.
- A3 read-your-writes: an awaited `append` is visible to an immediately following `load` from the same client.
- A4 opaque payload: entries come back byte-equivalent as JSON values. A store that deduplicates, normalizes, trims, or rewrites any field fails loudly in conformance.
- Meta separation: `putMeta`/`listRuns` operate on a separate record; `listRuns` never parses journal payloads.
- Leasing (LeasableStore): `acquire` on a held, unexpired lease MUST reject with the typed `LeaseHeldError`; the fencing epoch is monotonic per run and survives release and expiry; hosts renew at an interval of at most ttl/3.
- Fencing: an `append` or `renew` carrying a lease that is not the current holder (stale epoch, foreign owner, or expired) MUST be rejected with `LeaseHeldError`, and nothing may become visible to a subsequent `load`. This single rule is what makes multi-worker deployments safe (docs/03, section 12.3).

The reference values: the shipped SqliteStore defaults its lease ttl to 60000 ms and takes an injectable clock (`now`) so lease expiry is testable without wall-clock sleeps (06-execution-spec.md, Appendix A, row "lease ttl").

## 3. Walkthrough: a complete minimal store

The store below is the smallest correct LeasableStore: in-memory maps, JSON round-trip for A4 isolation, per-run epoch counters that survive release, and an injectable clock. It passes the full conformance kit and is dogfooded verbatim in `packages/store-conformance/src/guide-dogfood.test.ts`, so this listing cannot rot.

```ts
import {
  LeaseHeldError,
  type JournalEntry,
  type JournalStore,
  type Lease,
  type LeasableStore,
  type RunFilter,
  type RunMeta,
} from '@rulvar/core';

export interface CommunityMemoryStoreOptions {
  /** Lease ttl in milliseconds; the reference default is 60000. */
  ttlMs?: number;
  /** Injectable clock for deterministic expiry tests. */
  now?: () => number;
}

export class CommunityMemoryStore implements LeasableStore {
  private readonly entries = new Map<string, string[]>();
  private readonly metas = new Map<string, RunMeta>();
  private readonly leases = new Map<string, { lease: Lease; expiresAt: number }>();
  private readonly epochs = new Map<string, number>();
  private readonly ttlMs: number;
  private readonly clock: () => number;

  constructor(options: CommunityMemoryStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? 60_000;
    this.clock = options.now ?? Date.now;
  }

  /** The current holder, or undefined once expired: expiry frees the run. */
  private liveLease(runId: string): Lease | undefined {
    const held = this.leases.get(runId);
    if (held === undefined || held.expiresAt <= this.clock()) {
      return undefined;
    }
    return held.lease;
  }

  private assertFencing(lease: Lease): void {
    const live = this.liveLease(lease.runId);
    if (live === undefined || live.owner !== lease.owner || live.epoch !== lease.epoch) {
      throw new LeaseHeldError(
        `stale fencing epoch for run '${lease.runId}': (owner ${lease.owner}, epoch ` +
          `${lease.epoch}) is not the current holder; nothing became visible`,
      );
    }
  }

  async append(runId: string, e: JournalEntry, lease?: Lease): Promise<void> {
    if (lease !== undefined) {
      this.assertFencing(lease);
    }
    // Serialize BEFORE the push: a JSON.stringify failure appends nothing
    // (A1), and the string snapshot isolates the store from later caller
    // mutation (A4).
    const row = JSON.stringify(e);
    const rows = this.entries.get(runId) ?? [];
    rows.push(row);
    this.entries.set(runId, rows);
  }

  async load(runId: string): Promise<JournalEntry[]> {
    return (this.entries.get(runId) ?? []).map((row) => JSON.parse(row) as JournalEntry);
  }

  async putMeta(m: RunMeta): Promise<void> {
    this.metas.set(m.runId, JSON.parse(JSON.stringify(m)) as RunMeta);
  }

  async listRuns(f?: RunFilter): Promise<RunMeta[]> {
    return [...this.metas.values()].filter(
      (m) =>
        (f?.status === undefined || m.status === f.status) &&
        (f?.name === undefined || m.name === f.name) &&
        (f?.tags === undefined || f.tags.every((tag) => m.tags?.includes(tag))),
    );
  }

  async delete(runId: string): Promise<void> {
    this.entries.delete(runId);
    this.metas.delete(runId);
    this.leases.delete(runId);
  }

  async acquire(runId: string, owner: string): Promise<Lease> {
    const live = this.liveLease(runId);
    if (live !== undefined) {
      throw new LeaseHeldError(
        `run '${runId}' is leased by '${live.owner}' (epoch ${live.epoch})`,
      );
    }
    // The epoch counter outlives releases and expiries: a returning
    // holder can never reuse an old epoch, so its stale appends stay
    // rejectable forever.
    const epoch = (this.epochs.get(runId) ?? 0) + 1;
    this.epochs.set(runId, epoch);
    const lease: Lease = { runId, owner, epoch };
    this.leases.set(runId, { lease, expiresAt: this.clock() + this.ttlMs });
    return lease;
  }

  async renew(l: Lease): Promise<void> {
    this.assertFencing(l);
    this.leases.set(l.runId, { lease: l, expiresAt: this.clock() + this.ttlMs });
  }

  async release(l: Lease): Promise<void> {
    this.assertFencing(l);
    this.leases.delete(l.runId);
  }
}
```

Implementation notes that generalize beyond memory:

- Durable backends make the acquire check-and-bump atomic (SqliteStore wraps it in BEGIN IMMEDIATE; a SQL backend can use one conditional UPDATE; an object store can use compare-and-swap on a lease document).
- Never store the epoch inside the lease row alone: keep the per-run counter in its own record so release does not reset it.
- `delete(runId)` removes the journal and the meta; the ENGINE owns the transcript cascade (Engine.deleteRun lists and deletes blobs first), so stores never reach into TranscriptStore.

## 4. Running the conformance kit

@rulvar/store-conformance is the executable definition of the seam: third-party stores MUST pass it (09-observability-testing-spec.md, section "Store conformance kit"). Wire it into any vitest suite:

```ts
import { describe, it } from 'vitest';
import {
  journalStoreConformance,
  leasableStoreConformance,
  registerConformance,
} from '@rulvar/store-conformance';
import { CommunityMemoryStore } from './community-memory-store.js';

registerConformance(
  journalStoreConformance(() => Promise.resolve(new CommunityMemoryStore())),
  { describe, it },
);

registerConformance(
  leasableStoreConformance(() => Promise.resolve(new CommunityMemoryStore({ ttlMs: 150 })), {
    ttlMs: 150,
  }),
  { describe, it },
);
```

The kit covers A1-A4, meta separation, the golden fold-state fixture (identical fold hashes across implementations), the end-to-end decide-once oracle, the abandon fixture (zero live calls inside a skipped subtree), lease exclusivity, epoch monotonicity, stale-append invisibility, ttl expiry, and the renew cadence. Passing `ttlMs` enables the wall-clock expiry checks; keep it small (about 150 ms) so the suite stays fast.

## 5. Common failure modes

- Normalizing payloads (dropping undefined-like fields, reordering keys, coercing numbers) breaks A4 and, downstream, replay identity. Store the serialized bytes.
- Sharing one mutable object between `append` and `load` callers lets a caller mutate history; snapshot on the way in or the way out.
- Resetting the epoch on release lets a zombie writer reuse an epoch after a failover: the fencing conformance check will catch it.
- Rejecting `acquire` on an EXPIRED lease: expiry means the run is free; only a live lease rejects.
- Enforcing seq contiguity inside the store: seq belongs to the kernel. The store checks nothing about payload contents (A4); it only preserves order (A2).

## 6. Publishing checklist

- The full conformance kit green in your CI, on every supported backend configuration.
- Cross-process fencing exercised where the backend supports it (two store instances over one database; see the SqliteStore suite for the pattern).
- Lease ttl configurable and documented; injectable clock for tests.
- README states the durability model (what survives a process crash) and the backend's atomicity primitive used for acquire.
- No dependency on @rulvar/core internals: only the public SPI types.
