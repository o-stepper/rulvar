/**
 * The durable admission SPI's reference semantics (plan 45,
 * rfcs/admission.md): SFQ determinism, the level projections, the
 * feasibility terminal, the lifecycle with one winner per ticket, the
 * fenced cover discipline, and the emergency reserve. The statistical
 * fairness matrix is the conformance kit's (RFC section 7); these are
 * the exact-arithmetic pins the kit's tolerance tests rest on.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import {
  admissionLevelKeys,
  emptyFairQueue,
  sfqGrantOrder,
  sfqRecordArrival,
  sfqRecordGrant,
  sfqTagsOnArrival,
  windowAdmits,
  windowAdvance,
  windowConsume,
  emptySlidingWindow,
} from './algorithms.js';
import { MemoryAdmissionScheduler } from './memory.js';
import type { AdmissionRequest } from '../l0/spi/admission.js';

const request = (unitId: string, overrides: Partial<AdmissionRequest> = {}): AdmissionRequest => ({
  unitId,
  generation: 'g1',
  resolvedTenant: 'acme',
  scope: { tenant: 'acme', providerAccount: 'ant-1' },
  reservation: { wires: 1 },
  ...overrides,
});

describe('start time fair queuing (RFC section 4.2, item 3)', () => {
  it('tags are exact: start = max(member finish, V); finish = start + cost/weight', () => {
    let queue = emptyFairQueue();
    const a1 = sfqTagsOnArrival(queue, 'A', 4, 1);
    expect(a1).toEqual({ startTag: 0, finishTag: 4 });
    queue = sfqRecordArrival(queue, 'A', a1.finishTag);
    const a2 = sfqTagsOnArrival(queue, 'A', 4, 1);
    expect(a2).toEqual({ startTag: 4, finishTag: 8 });
    const b1 = sfqTagsOnArrival(queue, 'B', 4, 2);
    expect(b1).toEqual({ startTag: 0, finishTag: 2 });
  });

  it('V advances to granted start tags, monotonically, and caps idle hoarding', () => {
    let queue = emptyFairQueue();
    queue = sfqRecordArrival(queue, 'A', 10);
    queue = sfqRecordGrant(queue, 6);
    expect(queue.virtualTime).toBe(6);
    queue = sfqRecordGrant(queue, 3);
    expect(queue.virtualTime).toBe(6);
    // An idle member's next start tag rides V, never its stale past:
    // no credit accrues from silence beyond the configured burst.
    const idle = sfqTagsOnArrival(queue, 'IDLE', 2, 1);
    expect(idle.startTag).toBe(6);
  });

  it('grant order is smallest start tag with arrival seq breaking ties, deterministically', () => {
    const rows = [
      { startTag: 5, arrivalSeq: 2 },
      { startTag: 3, arrivalSeq: 9 },
      { startTag: 5, arrivalSeq: 1 },
    ];
    expect(sfqGrantOrder(rows).map((r) => r.arrivalSeq)).toEqual([9, 1, 2]);
    expect(sfqGrantOrder([...rows].reverse()).map((r) => r.arrivalSeq)).toEqual([9, 1, 2]);
  });

  it('weighted shares: a weight-2 member interleaves twice per weight-1 grant', () => {
    let queue = emptyFairQueue();
    const rows: Array<{ member: string; startTag: number; arrivalSeq: number }> = [];
    let seq = 0;
    for (const [member, weight, count] of [
      ['A', 1, 3],
      ['B', 2, 6],
    ] as const) {
      for (let index = 0; index < count; index += 1) {
        const tags = sfqTagsOnArrival(queue, member, 1, weight);
        queue = sfqRecordArrival(queue, member, tags.finishTag);
        seq += 1;
        rows.push({ member, startTag: tags.startTag, arrivalSeq: seq });
      }
    }
    const order = sfqGrantOrder(rows).map((r) => r.member);
    // Normalized service equalizes: the first three grants hold two Bs
    // per A, and B never starves A out entirely.
    expect(order.slice(0, 3).filter((m) => m === 'B')).toHaveLength(2);
    expect(order.slice(0, 3)).toContain('A');
  });
});

describe('the sliding window ring (RFC section 4.2, item 1)', () => {
  it('bounds the epoch boundary burst to one sub-window allowance', () => {
    let window = emptySlidingWindow(6);
    window = windowConsume(windowAdvance(window, 5), 10);
    expect(windowAdmits(window, 10, 1)).toBe(false);
    // One slot later the oldest sub-window expires; only ITS share
    // returns, never the whole cap at the boundary.
    window = windowAdvance(window, 6);
    expect(windowAdmits(window, 10, 1)).toBe(false);
    window = windowAdvance(window, 11);
    expect(windowAdmits(window, 10, 10)).toBe(true);
  });
});

describe('level keys (RFC section 4.1)', () => {
  it('projects the three levels as canonical JCS bytes', () => {
    const keys = admissionLevelKeys('acme', {
      providerAccount: 'ant-1',
      tenant: 'acme',
      region: 'eu',
    });
    expect(keys.tenant).toBe('{"tenant":"acme"}');
    expect(keys.providerAccount).toBe('{"providerAccount":"ant-1","tenant":"acme"}');
    expect(keys.scope).toBe('{"providerAccount":"ant-1","region":"eu","tenant":"acme"}');
    // Property order never changes the bytes.
    const reordered = admissionLevelKeys('acme', {
      region: 'eu',
      tenant: 'acme',
      providerAccount: 'ant-1',
    });
    expect(reordered.scope).toBe(keys.scope);
  });

  it('a level with nothing to key is absent, never a phantom global bucket', () => {
    expect(admissionLevelKeys(undefined, undefined)).toEqual({});
    expect(admissionLevelKeys('acme', undefined).providerAccount).toBeUndefined();
  });
});

describe('MemoryAdmissionScheduler lifecycle', () => {
  const scheduler = (
    nowRef: { ms: number },
    overrides: Partial<ConstructorParameters<typeof MemoryAdmissionScheduler>[0]> = {},
  ): MemoryAdmissionScheduler =>
    new MemoryAdmissionScheduler({
      levels: {
        tenant: { algorithm: 'sliding-window', capWires: 4, windowMs: 60_000, slots: 6 },
      },
      leaseTtlMs: 30_000,
      now: () => nowRef.ms,
      ...overrides,
    });

  it('grants when every matched level admits, and the same unit recovers the SAME ticket', async () => {
    const now = { ms: 0 };
    const s = scheduler(now);
    const first = await s.enqueue(request('run-1'), 'op-1');
    expect(first.state).toBe('granted');
    const again = await s.enqueue(request('run-1'), 'op-1-retry');
    expect(again.state).toBe('granted');
    expect(again.state === 'granted' && again.ticket.arrivalSeq).toBe(
      first.state === 'granted' ? first.ticket.arrivalSeq : -1,
    );
    const recovered = await s.recover('run-1', 'g1', 'op-2');
    expect(recovered.state).toBe('granted');
  });

  it('queues past capacity and grants in SFQ order at release', async () => {
    const now = { ms: 0 };
    const s = scheduler(now);
    const grants: string[] = [];
    for (const unit of ['a', 'b', 'c', 'd']) {
      const decision = await s.enqueue(request(unit, { reservation: { wires: 2 } }), `op-${unit}`);
      if (decision.state === 'granted') {
        grants.push(unit);
      }
    }
    expect(grants).toEqual(['a', 'b']);
    const queuedC = await s.recover('c', 'g1', 'op-r');
    expect(queuedC.state).toBe('queued');
    await s.release('a', 'g1', { wires: 2 }, 'op-release-a');
    const afterRelease = await s.recover('c', 'g1', 'op-r2');
    // The release consumed the whole reservation: nothing refunds, the
    // WINDOW still holds the spend, so c keeps waiting.
    expect(afterRelease.state).toBe('queued');
    // The window slides past the spend: the pump grants c then d.
    now.ms = 61_000;
    const granted = await s.pump('op-pump');
    expect(granted.map((t) => t.unitId)).toEqual(['c', 'd']);
  });

  it('release refunds the UNUSED remainder immediately', async () => {
    const now = { ms: 0 };
    const s = scheduler(now);
    await s.enqueue(request('big', { reservation: { wires: 4 } }), 'op-1');
    const queued = await s.enqueue(request('next', { reservation: { wires: 2 } }), 'op-2');
    expect(queued.state).toBe('queued');
    // The unit finished having used 2 of 4: the unused half refunds
    // and the queue drains without waiting for the window.
    await s.release('big', 'g1', { wires: 2 }, 'op-release');
    const recovered = await s.recover('next', 'g1', 'op-r');
    expect(recovered.state).toBe('granted');
  });

  it('the feasibility terminal denies instead of camping at the head', async () => {
    const now = { ms: 0 };
    const s = scheduler(now);
    const denied = await s.enqueue(request('huge', { reservation: { wires: 9 } }), 'op-1');
    expect(denied.state).toBe('denied');
    expect(denied.state === 'denied' && denied.reason).toContain('never fit');
    // The queue behind it is untouched: the next unit grants.
    const next = await s.enqueue(request('ok'), 'op-2');
    expect(next.state).toBe('granted');
  });

  it('a conflicting tenant pair refuses typed outside tenantFrom scope', async () => {
    const now = { ms: 0 };
    const s = scheduler(now);
    await expect(
      s.enqueue(
        request('run-1', { resolvedTenant: 'engine-t', scope: { tenant: 'other' } }),
        'op-1',
      ),
    ).rejects.toThrow(ConfigError);
    const declared = await s.enqueue(
      request('run-2', {
        resolvedTenant: 'engine-t',
        scope: { tenant: 'other' },
        tenantFromScope: true,
      }),
      'op-2',
    );
    expect(declared.state).toBe('granted');
  });

  it('covers are lease-fenced and expiry refunds reservation minus the high water', async () => {
    const now = { ms: 0 };
    const s = scheduler(now);
    await s.enqueue(request('run-1', { reservation: { wires: 4 } }), 'op-1');
    await s.checkpointCover('run-1', 'g1', { wires: 1 }, 'op-c1');
    await s.checkpointCover('run-1', 'g1', { wires: 3 }, 'op-c2');
    // Monotone high water: a lower checkpoint never regresses it.
    await s.checkpointCover('run-1', 'g1', { wires: 2 }, 'op-c3');
    now.ms = 31_000;
    await expect(s.checkpointCover('run-1', 'g1', { wires: 4 }, 'op-c4')).rejects.toThrow(/fenced/);
    const granted = await s.pump('op-pump');
    expect(granted).toHaveLength(0);
    const state = await s.recover('run-1', 'g1', 'op-r');
    expect(state.state).toBe('unknown');
    // reservation 4, covered 3: one wire refunded; a 2-wire follower
    // fits only after the window slides, a 1-wire one immediately.
    const one = await s.enqueue(request('one', { reservation: { wires: 1 } }), 'op-one');
    expect(one.state).toBe('granted');
    const two = await s.enqueue(request('two', { reservation: { wires: 2 } }), 'op-two');
    expect(two.state).toBe('queued');
  });

  it('a late settlement after expiry lands as bucket debt, idempotently', async () => {
    const now = { ms: 0 };
    const s = scheduler(now);
    await s.enqueue(request('run-1', { reservation: { wires: 2 } }), 'op-1');
    await s.checkpointCover('run-1', 'g1', { wires: 2 }, 'op-c');
    now.ms = 31_000;
    await s.pump('op-pump');
    // The late report says 3 wires flew: one beyond the cover lands as
    // debt and depresses the bucket, never a retroactive denial.
    await s.release('run-1', 'g1', { wires: 3 }, 'op-late');
    await s.release('run-1', 'g1', { wires: 3 }, 'op-late');
    const follower = await s.enqueue(request('f', { reservation: { wires: 3 } }), 'op-f');
    expect(follower.state).toBe('queued');
  });

  it('of racing release, expiry, and cancel exactly one wins', async () => {
    const now = { ms: 0 };
    const s = scheduler(now);
    await s.enqueue(request('run-1', { reservation: { wires: 2 } }), 'op-1');
    await s.release('run-1', 'g1', { wires: 2 }, 'op-release');
    now.ms = 31_000;
    await s.pump('op-pump');
    const recovered = await s.recover('run-1', 'g1', 'op-r');
    expect(recovered.state).toBe('unknown');
    // The ticket settled 'released'; the expiry sweep was a durable
    // no-op on it (a second refund would have doubled the window).
    const follower = await s.enqueue(request('f', { reservation: { wires: 4 } }), 'op-f');
    now.ms = 61_000;
    const granted = await s.pump('op-p2');
    expect(granted.map((t) => t.unitId)).toEqual(['f']);
    void follower;
  });

  it('cancel removes a queued ticket with nothing to refund', async () => {
    const now = { ms: 0 };
    const s = scheduler(now);
    await s.enqueue(request('a', { reservation: { wires: 4 } }), 'op-a');
    await s.enqueue(request('b'), 'op-b');
    await s.cancel('b', 'g1', 'op-cancel');
    const recovered = await s.recover('b', 'g1', 'op-r');
    expect(recovered.state).toBe('unknown');
  });

  it('the snapshot round-trips: applied operation ids survive hydration', async () => {
    const now = { ms: 0 };
    const first = scheduler(now);
    await first.enqueue(request('a', { reservation: { wires: 4 } }), 'op-a');
    await first.checkpointCover('a', 'g1', { wires: 2 }, 'op-cover');
    now.ms = 31_000;
    await first.pump('op-pump');
    // The late settlement lands one wire of debt (actuals 3, cover 2).
    await first.release('a', 'g1', { wires: 3 }, 'op-late');
    const second = new MemoryAdmissionScheduler({
      levels: {
        tenant: { algorithm: 'sliding-window', capWires: 4, windowMs: 60_000, slots: 6 },
      },
      leaseTtlMs: 30_000,
      now: () => now.ms,
      state: first.snapshot(),
    });
    // Replaying the SAME settlement op on the next holder is a durable
    // no-op: a second debt entry would eat the last free wire.
    await second.release('a', 'g1', { wires: 3 }, 'op-late');
    const follower = await second.enqueue(request('f', { reservation: { wires: 1 } }), 'op-f');
    expect(follower.state).toBe('granted');
  });

  it('the snapshot is a deep copy: later mutation never leaks into it', async () => {
    const now = { ms: 0 };
    const s = scheduler(now);
    await s.enqueue(request('a'), 'op-a');
    const state = s.snapshot();
    await s.enqueue(request('b'), 'op-b');
    expect(Object.keys(state.tickets)).toHaveLength(1);
    expect(state.arrivalCounter).toBe(1);
  });

  it('the emergency reserve admits flagged work where ordinary work refuses', async () => {
    const now = { ms: 0 };
    const s = new MemoryAdmissionScheduler({
      levels: {
        tenant: {
          algorithm: 'sliding-window',
          capWires: 4,
          emergencyReserveFraction: 0.5,
        },
      },
      leaseTtlMs: 30_000,
      now: () => now.ms,
    });
    const ordinary = await s.enqueue(request('big', { reservation: { wires: 3 } }), 'op-1');
    expect(ordinary.state).toBe('denied');
    const emergency = await s.enqueue(
      request('incident', { reservation: { wires: 3 }, emergency: true }),
      'op-2',
    );
    expect(emergency.state).toBe('granted');
  });

  it('the level-2 semaphore bounds concurrency and the release restores the slot', async () => {
    const now = { ms: 0 };
    const s = new MemoryAdmissionScheduler({
      levels: {
        tenant: { algorithm: 'sliding-window', capWires: 100 },
        providerAccount: { algorithm: 'sliding-window', capWires: 100, concurrency: 1 },
      },
      leaseTtlMs: 30_000,
      now: () => now.ms,
    });
    const first = await s.enqueue(request('a'), 'op-a');
    expect(first.state).toBe('granted');
    const second = await s.enqueue(request('b'), 'op-b');
    expect(second.state).toBe('queued');
    await s.release('a', 'g1', { wires: 1 }, 'op-release');
    const recovered = await s.recover('b', 'g1', 'op-r');
    expect(recovered.state).toBe('granted');
  });
});
