import { describe, expect, it } from 'vitest';

import {
  InMemoryStore,
  LeaseHeldError,
  type JournalEntry,
  type LeasableStore,
  type Lease,
} from '@lurker/core';
import { leasableStoreConformance } from './leasable.js';
import { registerConformance } from './types.js';

/**
 * A minimal CORRECT in-process LeasableStore: the reference the suite is
 * self-tested against until @lurker/store-sqlite lands in M5. Epochs are
 * monotonic per run; appends validate the fencing token; expiry is
 * wall-clock against a configured ttl.
 */
class InMemoryLeasableStore extends InMemoryStore implements LeasableStore {
  private readonly leases = new Map<string, { lease: Lease; expiresAt: number }>();
  private readonly epochs = new Map<string, number>();
  private readonly ttlMs: number;

  constructor(options?: { ttlMs?: number }) {
    super();
    this.ttlMs = options?.ttlMs ?? 60_000;
  }

  private held(runId: string): { lease: Lease; expiresAt: number } | undefined {
    const current = this.leases.get(runId);
    if (current === undefined || current.expiresAt <= Date.now()) {
      return undefined;
    }
    return current;
  }

  acquire(runId: string, owner: string): Promise<Lease> {
    const current = this.held(runId);
    if (current !== undefined) {
      return Promise.reject(
        new LeaseHeldError(`run '${runId}' is leased by '${current.lease.owner}'`),
      );
    }
    const epoch = (this.epochs.get(runId) ?? 0) + 1;
    this.epochs.set(runId, epoch);
    const lease: Lease = { runId, owner, epoch };
    this.leases.set(runId, { lease, expiresAt: Date.now() + this.ttlMs });
    return Promise.resolve(lease);
  }

  renew(l: Lease): Promise<void> {
    const current = this.held(l.runId);
    if (current === undefined || current.lease.epoch !== l.epoch) {
      return Promise.reject(new LeaseHeldError(`stale renew for run '${l.runId}'`));
    }
    current.expiresAt = Date.now() + this.ttlMs;
    return Promise.resolve();
  }

  release(l: Lease): Promise<void> {
    const current = this.leases.get(l.runId);
    if (current !== undefined && current.lease.epoch === l.epoch) {
      this.leases.delete(l.runId);
    }
    return Promise.resolve();
  }

  override append(runId: string, e: JournalEntry, lease?: Lease): Promise<void> {
    if (lease !== undefined) {
      const current = this.held(runId);
      if (current === undefined || current.lease.epoch !== lease.epoch) {
        return Promise.reject(
          new LeaseHeldError(`stale fencing epoch ${lease.epoch} for run '${runId}'`),
        );
      }
    }
    return super.append(runId, e);
  }
}

/** Broken variant: accepts appends bearing stale epochs (fencing violated). */
class BrokenFencingStore extends InMemoryLeasableStore {
  override append(runId: string, e: JournalEntry): Promise<void> {
    return InMemoryStore.prototype.append.call(this, runId, e);
  }
}

registerConformance(
  leasableStoreConformance(() => new InMemoryLeasableStore({ ttlMs: 150 }), { ttlMs: 150 }),
  { describe: (name, factory) => describe(`InMemoryLeasableStore ${name}`, factory), it },
);

describe('mutation-tested broken lease stores fail loudly', () => {
  it('a store that accepts stale-epoch appends fails the fencing check', async () => {
    const suite = leasableStoreConformance(() => new BrokenFencingStore());
    const fencing = suite.checks.find((check) => check.id === 'fencing-stale-epoch');
    await expect(fencing?.run()).rejects.toThrow(/fencing-stale-epoch/);
  });

  it('the ttl check is present only when ttlMs is provided', () => {
    const withTtl = leasableStoreConformance(() => new InMemoryLeasableStore(), { ttlMs: 100 });
    const without = leasableStoreConformance(() => new InMemoryLeasableStore());
    expect(withTtl.checks.some((check) => check.id === 'lease-ttl-and-renew-cadence')).toBe(true);
    expect(without.checks.some((check) => check.id === 'lease-ttl-and-renew-cadence')).toBe(false);
  });
});
