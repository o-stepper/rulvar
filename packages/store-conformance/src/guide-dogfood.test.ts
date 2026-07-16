/**
 * M9-T03 acceptance: a third-party store built ONLY from the community guide
 * passes conformance. CommunityMemoryStore below is the walkthrough
 * listing of docs/guide/store-authors.md, section "Walkthrough: a
 * complete minimal store" (differing only in comments and formatting):
 * if the guide's code rots, this suite fails and the guide must be
 * re-amended.
 */
import { describe, it } from 'vitest';

import {
  JournalOrderViolation,
  LeaseHeldError,
  type JournalEntry,
  type Lease,
  type LeasableStore,
  type RunFilter,
  type RunMeta,
} from '@rulvar/core';

import { journalStoreConformance } from './journal.js';
import { leasableStoreConformance } from './leasable.js';
import { registerConformance } from './types.js';

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

  // eslint-disable-next-line @typescript-eslint/require-await
  async append(runId: string, e: JournalEntry, lease?: Lease): Promise<void> {
    if (lease !== undefined) {
      this.assertFencing(lease);
    }
    // Serialize BEFORE the push: a JSON.stringify failure appends nothing
    // (A1), and the string snapshot isolates the store from later caller
    // mutation (A4).
    const row = JSON.stringify(e);
    const rows = this.entries.get(runId) ?? [];
    // Monotonic seq (A5): a stale or duplicate seq means a second writer
    // raced this journal from an outdated tail; the loser gets the typed
    // conflict and nothing becomes visible.
    const tail = rows[rows.length - 1];
    const tailSeq = tail === undefined ? undefined : (JSON.parse(tail) as JournalEntry).seq;
    if (typeof tailSeq === 'number' && Number.isFinite(e.seq) && e.seq <= tailSeq) {
      throw new JournalOrderViolation(
        `append of seq ${e.seq} to run '${runId}' is not after the stored tail seq ${tailSeq}`,
      );
    }
    rows.push(row);
    this.entries.set(runId, rows);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async load(runId: string): Promise<JournalEntry[]> {
    return (this.entries.get(runId) ?? []).map((row) => JSON.parse(row) as JournalEntry);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async putMeta(m: RunMeta): Promise<void> {
    this.metas.set(m.runId, JSON.parse(JSON.stringify(m)) as RunMeta);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async listRuns(f?: RunFilter): Promise<RunMeta[]> {
    return [...this.metas.values()].filter(
      (m) =>
        (f?.status === undefined || m.status === f.status) &&
        (f?.name === undefined || m.name === f.name) &&
        (f?.tags === undefined || f.tags.every((tag) => m.tags?.includes(tag))),
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(runId: string): Promise<void> {
    this.entries.delete(runId);
    this.metas.delete(runId);
    this.leases.delete(runId);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async acquire(runId: string, owner: string): Promise<Lease> {
    const live = this.liveLease(runId);
    if (live !== undefined) {
      throw new LeaseHeldError(`run '${runId}' is leased by '${live.owner}' (epoch ${live.epoch})`);
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

  // eslint-disable-next-line @typescript-eslint/require-await
  async renew(l: Lease): Promise<void> {
    this.assertFencing(l);
    this.leases.set(l.runId, { lease: l, expiresAt: this.clock() + this.ttlMs });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async release(l: Lease): Promise<void> {
    this.assertFencing(l);
    this.leases.delete(l.runId);
  }
}

// The wiring below is the guide's section "Running the conformance kit",
// also verbatim.
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
