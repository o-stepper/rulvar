/**
 * Durable admission over sqlite (plan 45): the state document survives
 * the process, so a NEW scheduler instance over the same file recovers
 * tickets by (unitId, generation), the crash rows of the RFC's matrix
 * (admission.crash.queued-ticket-survives, and the idempotent replay
 * of settlements across instances).
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { AdmissionRequest } from '@rulvar/core';

import { admissionConformance, registerConformance } from '@rulvar/store-conformance';

import { SqliteAdmissionScheduler } from './admission.js';

const CONFIG = {
  levels: { tenant: { algorithm: 'sliding-window' as const, capWires: 2, windowMs: 60_000 } },
  leaseTtlMs: 30_000,
};

const request = (unitId: string, wires = 1): AdmissionRequest => ({
  unitId,
  generation: 'g1',
  resolvedTenant: 'acme',
  reservation: { wires },
});

describe('SqliteAdmissionScheduler durability', () => {
  it('a queued ticket survives the holder: position and identity intact', async () => {
    const path = join(mkdtempSync(join(tmpdir(), 'rulvar-adm-')), 'adm.db');
    const now = { ms: 0 };
    const first = new SqliteAdmissionScheduler({ path, config: CONFIG, now: () => now.ms });
    const granted = await first.enqueue(request('a', 2), 'op-a');
    expect(granted.state).toBe('granted');
    const queued = await first.enqueue(request('b'), 'op-b');
    expect(queued.state).toBe('queued');
    first.close();
    // The scheduler holder died; a fresh instance over the same file
    // recovers both tickets by unit identity, no queue jump, no loss.
    const second = new SqliteAdmissionScheduler({ path, config: CONFIG, now: () => now.ms });
    const recoveredA = await second.recover('a', 'g1', 'op-r1');
    expect(recoveredA.state).toBe('granted');
    const recoveredB = await second.recover('b', 'g1', 'op-r2');
    expect(recoveredB.state).toBe('queued');
    expect(recoveredB.state === 'queued' && recoveredB.position).toBe(0);
    // Re-enqueueing the same unit returns the SAME ticket, never a
    // duplicate queue entry.
    const again = await second.enqueue(request('b'), 'op-b-retry');
    expect(again.state).toBe('queued');
    expect(
      again.state === 'queued' &&
        recoveredB.state === 'queued' &&
        again.ticket.arrivalSeq === recoveredB.ticket.arrivalSeq,
    ).toBe(true);
    await second.release('a', 'g1', { wires: 2 }, 'op-release');
    now.ms = 61_000;
    const pumped = await second.pump('op-pump');
    expect(pumped.map((t) => t.unitId)).toEqual(['b']);
    second.close();
  });

  it('settlement operation ids replay as durable no-ops across instances', async () => {
    const path = join(mkdtempSync(join(tmpdir(), 'rulvar-adm-')), 'adm.db');
    const now = { ms: 0 };
    const first = new SqliteAdmissionScheduler({ path, config: CONFIG, now: () => now.ms });
    await first.enqueue(request('a', 2), 'op-a');
    await first.release('a', 'g1', { wires: 1 }, 'op-release');
    first.close();
    const second = new SqliteAdmissionScheduler({ path, config: CONFIG, now: () => now.ms });
    // The same opId lands as a no-op: no second refund of the unused
    // wire (a double refund would admit a 2-wire follower).
    await second.release('a', 'g1', { wires: 1 }, 'op-release');
    const follower = await second.enqueue(request('f', 2), 'op-f');
    expect(follower.state).toBe('queued');
    second.close();
  });
});

registerConformance(
  admissionConformance({
    make: (config, now) => {
      const path = join(mkdtempSync(join(tmpdir(), 'rulvar-adm-kit-')), 'adm.db');
      let current = new SqliteAdmissionScheduler({ path, config, now });
      return {
        get scheduler() {
          return current;
        },
        reopen: () => {
          current.close();
          current = new SqliteAdmissionScheduler({ path, config, now });
          return current;
        },
        close: async () => {
          current.close();
          await Promise.resolve();
        },
      };
    },
  }),
  {
    describe,
    // The document-CAS reference serializes the whole scheduler state
    // per lifecycle call, and the sixty-tenant row makes hundreds of
    // calls: on the floor binary that legitimately outruns the 5 s
    // default, so the matrix rows carry their own bound.
    it: (name, fn) => {
      it(name, fn, 30_000);
    },
  },
);
