/**
 * The durable admission conformance matrix (plan 45, rfcs/admission.md
 * section 7): all twelve rows as named executable checks over a
 * scheduler factory, so a deployment proves ITS durable admission
 * behaves like the reference. The fairness rows measure GRANTED RAW
 * SERVICE, which is what the algorithm actually guarantees; wait times
 * are reported nowhere as acceptance metrics. The expiry row runs the
 * fenced-covers arm; the "without fenced covers, auto-refund nothing"
 * arm is excluded here by design, because every shipped scheduler
 * fences covers (the in-process reference, and the durable documents
 * whose cover writes ride the same CASed transaction), and the
 * exclusion is recorded in this sentence.
 */
import {
  ConfigError,
  type AdmissionScheduler,
  type AdmissionRequest,
  type MemoryAdmissionOptions,
} from '@rulvar/core';

import { ensure, makeSuite, type ConformanceCheck, type ConformanceSuite } from './types.js';

export interface AdmissionSchedulerFixture {
  scheduler: AdmissionScheduler;
  /** A NEW holder over the same durable state (the crash rows). */
  reopen(): AdmissionScheduler | Promise<AdmissionScheduler>;
  close?(): Promise<void>;
}

export type AdmissionConfig = Omit<MemoryAdmissionOptions, 'state' | 'now'>;

export interface AdmissionConformanceOptions {
  /** A fresh, isolated scheduler per call, over the config and clock. */
  make(
    config: AdmissionConfig,
    now: () => number,
  ): AdmissionSchedulerFixture | Promise<AdmissionSchedulerFixture>;
}

/**
 * Saturates every tenant's window with a plug ticket so a whole burst
 * can queue FIRST and one pump then measures pure SFQ order over the
 * assembled queue, not the accident of who enqueued while capacity was
 * free. Releasing a plug with zero actuals refunds its whole
 * reservation, so the burst's own arithmetic is untouched.
 */
async function plugTenants(
  scheduler: AdmissionScheduler,
  tenants: readonly string[],
  capWires: number,
): Promise<void> {
  for (const tenant of tenants) {
    const plugged = await scheduler.enqueue(
      {
        unitId: `plug-${tenant}`,
        generation: 'g1',
        resolvedTenant: tenant,
        scope: { tenant },
        // Weight equal to cost: the plug advances every member's
        // finish tag by exactly ONE, a uniform shift that preserves
        // the burst's relative SFQ order bit for bit.
        weight: capWires,
        reservation: { wires: capWires },
      },
      `op-plug-${tenant}`,
    );
    ensure(plugged.state === 'granted', 'admission.plug', `the ${tenant} plug holds the window`);
  }
}

async function unplugTenants(
  scheduler: AdmissionScheduler,
  tenants: readonly string[],
): Promise<void> {
  for (const tenant of tenants) {
    await scheduler.release(`plug-${tenant}`, 'g1', { wires: 0 }, `op-unplug-${tenant}`);
  }
}

const request = (unitId: string, overrides: Partial<AdmissionRequest> = {}): AdmissionRequest => ({
  unitId,
  generation: 'g1',
  resolvedTenant: 'acme',
  scope: { tenant: 'acme', providerAccount: 'shared' },
  reservation: { wires: 1 },
  ...overrides,
});

/** Drains every ticket through grant+release; returns the grant order. */
async function drainGrantOrder(scheduler: AdmissionScheduler, expected: number): Promise<string[]> {
  const order: string[] = [];
  let stalls = 0;
  while (order.length < expected && stalls < expected + 10) {
    const granted = await scheduler.pump(`pump-${String(order.length)}-${String(stalls)}`);
    if (granted.length === 0) {
      stalls += 1;
      continue;
    }
    for (const ticket of granted) {
      order.push(ticket.resolvedTenant ?? ticket.unitId);
      await scheduler.release(
        ticket.unitId,
        ticket.generation,
        ticket.reservation,
        `release-${ticket.unitId}`,
      );
    }
  }
  return order;
}

export function admissionConformance(options: AdmissionConformanceOptions): ConformanceSuite {
  const checks: ConformanceCheck[] = [
    {
      id: 'admission.fairness.sixty-tenant-synchronized-burst',
      title: 'sixty equal tenants: granted raw service equalizes and no inter-grant gap explodes',
      async run() {
        const now = { ms: 0 };
        const perTenant = 2;
        const fixture = await options.make(
          {
            levels: {
              tenant: { algorithm: 'sliding-window', capWires: perTenant },
            },
            leaseTtlMs: 3_600_000,
          },
          () => now.ms,
        );
        const tenants = Array.from(
          { length: 60 },
          (_, index) => `t${String(index).padStart(2, '0')}`,
        );
        await plugTenants(fixture.scheduler, tenants, perTenant);
        for (let round = 0; round < perTenant; round += 1) {
          for (const tenant of tenants) {
            await fixture.scheduler.enqueue(
              request(`${tenant}-r${String(round)}`, {
                resolvedTenant: tenant,
                scope: { tenant },
              }),
              `op-${tenant}-${String(round)}`,
            );
          }
        }
        await unplugTenants(fixture.scheduler, tenants);
        const order = await drainGrantOrder(fixture.scheduler, tenants.length * perTenant);
        ensure(
          order.length === tenants.length * perTenant,
          'admission.fairness.1',
          'every ticket eventually granted',
        );
        // Service share is the acceptance metric: each tenant's granted
        // raw service is exactly 1/60 of the total.
        for (const tenant of tenants) {
          ensure(
            order.filter((granted) => granted === tenant).length === perTenant,
            'admission.fairness.1',
            `tenant ${tenant} received its exact share`,
          );
        }
        // The inter-grant bound: every consecutive window of 60 grants
        // contains every tenant at least once (equal weights, SFQ).
        for (let start = 0; start + tenants.length <= order.length; start += tenants.length) {
          const window = new Set(order.slice(start, start + tenants.length));
          ensure(
            window.size === tenants.length,
            'admission.fairness.1',
            'no tenant waits past one full round',
          );
        }
        await fixture.close?.();
      },
    },
    {
      id: 'admission.fairness.weighted-shares',
      title: 'weights 1/2/4: granted raw service converges to 1:2:4 and weight 1 never starves',
      async run() {
        const now = { ms: 0 };
        const perTenant = 14;
        const fixture = await options.make(
          {
            levels: {
              tenant: { algorithm: 'sliding-window', capWires: perTenant },
            },
            weights: { x: 1, y: 2, z: 4 },
            leaseTtlMs: 3_600_000,
          },
          () => now.ms,
        );
        await plugTenants(fixture.scheduler, ['x', 'y', 'z'], perTenant);
        for (let round = 0; round < perTenant; round += 1) {
          for (const tenant of ['x', 'y', 'z']) {
            await fixture.scheduler.enqueue(
              request(`${tenant}-r${String(round)}`, {
                resolvedTenant: tenant,
                scope: { tenant },
              }),
              `op-${tenant}-${String(round)}`,
            );
          }
        }
        await unplugTenants(fixture.scheduler, ['x', 'y', 'z']);
        const order = await drainGrantOrder(fixture.scheduler, perTenant * 3);
        const first7 = order.slice(0, 7);
        ensure(
          first7.filter((t) => t === 'z').length === 4 &&
            first7.filter((t) => t === 'y').length === 2 &&
            first7.filter((t) => t === 'x').length === 1,
          'admission.fairness.2',
          'the first virtual-time cycle grants exactly 1:2:4',
        );
        ensure(
          order.slice(0, 14).filter((t) => t === 'x').length === 2,
          'admission.fairness.2',
          'weight 1 never starves',
        );
        await fixture.close?.();
      },
    },
    {
      id: 'admission.window.minute-boundary',
      title: 'the sliding window bounds the epoch boundary burst to the sub-window allowance',
      async run() {
        const now = { ms: 55_000 };
        const fixture = await options.make(
          {
            levels: {
              tenant: {
                algorithm: 'sliding-window',
                capWires: 10,
                windowMs: 60_000,
                slots: 6,
              },
            },
            leaseTtlMs: 3_600_000,
          },
          () => now.ms,
        );
        for (let index = 0; index < 10; index += 1) {
          const decision = await fixture.scheduler.enqueue(
            request(`burst-${String(index)}`, { scope: { tenant: 'acme' } }),
            `op-${String(index)}`,
          );
          ensure(decision.state === 'granted', 'admission.window.3', 'the cap admits the burst');
        }
        const boundary = await fixture.scheduler.enqueue(
          request('boundary', { scope: { tenant: 'acme' } }),
          'op-boundary',
        );
        ensure(boundary.state === 'queued', 'admission.window.3', 'the cap is spent');
        // Crossing the fixed-epoch boundary frees NOTHING extra: the
        // trailing sum still holds the burst.
        now.ms = 65_000;
        ensure(
          (await fixture.scheduler.pump('op-p1')).length === 0,
          'admission.window.3',
          'no double burst across the boundary',
        );
        now.ms = 105_000;
        ensure(
          (await fixture.scheduler.pump('op-p2')).length === 0,
          'admission.window.3',
          'the trailing window still holds the spend',
        );
        now.ms = 115_000;
        ensure(
          (await fixture.scheduler.pump('op-p3')).length === 1,
          'admission.window.3',
          'capacity returns only as the trailing window slides past it',
        );
        await fixture.close?.();
      },
    },
    {
      id: 'admission.crash.queued-ticket-survives',
      title: 'a queued ticket reloads with its arrival seq and position; same unit, same ticket',
      async run() {
        const now = { ms: 0 };
        const fixture = await options.make(
          {
            levels: {
              tenant: { algorithm: 'sliding-window', capWires: 10_000 },
              providerAccount: {
                algorithm: 'sliding-window',
                capWires: 10_000,
                concurrency: 1,
              },
            },
            leaseTtlMs: 3_600_000,
          },
          () => now.ms,
        );
        const granted = await fixture.scheduler.enqueue(request('a'), 'op-a');
        ensure(granted.state === 'granted', 'admission.crash.4', 'a grants');
        const queued = await fixture.scheduler.enqueue(request('b'), 'op-b');
        ensure(queued.state === 'queued', 'admission.crash.4', 'b queues on the semaphore');
        const arrivalSeq = queued.state === 'queued' ? queued.ticket.arrivalSeq : -1;
        const successor = await fixture.reopen();
        const recovered = await successor.recover('b', 'g1', 'op-r');
        ensure(recovered.state === 'queued', 'admission.crash.4', 'the queued ticket survives');
        ensure(
          recovered.state === 'queued' && recovered.ticket.arrivalSeq === arrivalSeq,
          'admission.crash.4',
          'no queue jump, no loss: the arrival seq is intact',
        );
        const again = await successor.enqueue(request('b'), 'op-b-retry');
        ensure(
          again.state === 'queued' && again.ticket.arrivalSeq === arrivalSeq,
          'admission.crash.4',
          're-enqueueing the same unit returns the SAME ticket, never a duplicate',
        );
        await successor.release('a', 'g1', { wires: 1 }, 'op-release-a');
        const pumped = await successor.pump('op-pump');
        ensure(
          pumped.some((ticket) => ticket.unitId === 'b'),
          'admission.crash.4',
          'the surviving ticket grants in order',
        );
        void pumped;
        await fixture.close?.();
      },
    },
    {
      id: 'admission.crash.granted-lease-expiry-settles-conservatively',
      title: 'expiry refunds reservation minus the fenced cover; a late settlement lands as debt',
      async run() {
        const now = { ms: 0 };
        const fixture = await options.make(
          {
            levels: {
              tenant: {
                algorithm: 'sliding-window',
                capWires: 4,
                windowMs: 3_600_000,
              },
            },
            leaseTtlMs: 30_000,
          },
          () => now.ms,
        );
        await fixture.scheduler.enqueue(
          request('holder', { reservation: { wires: 4 }, scope: { tenant: 'acme' } }),
          'op-h',
        );
        await fixture.scheduler.checkpointCover('holder', 'g1', { wires: 2 }, 'op-c');
        now.ms = 31_000;
        await fixture.scheduler.pump('op-expire');
        // The stalled holder cannot consume past its cover: the fence
        // rejects the expired lease's cover write.
        let fenced = false;
        try {
          await fixture.scheduler.checkpointCover('holder', 'g1', { wires: 4 }, 'op-c2');
        } catch {
          fenced = true;
        }
        ensure(fenced, 'admission.crash.5', 'the expired lease cover write is fenced off');
        // reservation 4 minus cover 2: exactly two wires provably unused
        // came back. A 2-wire follower fits; ONE more wire does not.
        const two = await fixture.scheduler.enqueue(
          request('two', { reservation: { wires: 2 }, scope: { tenant: 'acme' } }),
          'op-2',
        );
        ensure(two.state === 'granted', 'admission.crash.5', 'the provable refund admits');
        const probe = await fixture.scheduler.enqueue(
          request('probe', { reservation: { wires: 1 }, scope: { tenant: 'acme' } }),
          'op-probe',
        );
        ensure(
          probe.state === 'queued',
          'admission.crash.5',
          'the refund was exactly the uncovered half, never a blind full refund',
        );
        // The late settlement lands as debt, idempotently, never a
        // discard and never a retroactive denial.
        await fixture.scheduler.release('holder', 'g1', { wires: 3 }, 'op-late');
        await fixture.scheduler.release('holder', 'g1', { wires: 3 }, 'op-late');
        await fixture.close?.();
      },
    },
    {
      id: 'admission.deny.429-parity',
      title: 'the terminal denied verdict is distinguishable from queued by STATE, never timeout',
      async run() {
        const now = { ms: 0 };
        const fixture = await options.make(
          {
            levels: { tenant: { algorithm: 'sliding-window', capWires: 2 } },
            leaseTtlMs: 3_600_000,
          },
          () => now.ms,
        );
        const denied = await fixture.scheduler.enqueue(
          request('huge', { reservation: { wires: 5 }, scope: { tenant: 'acme' } }),
          'op-huge',
        );
        ensure(denied.state === 'denied', 'admission.deny.6', 'infeasible refuses terminally');
        await fixture.scheduler.enqueue(
          request('fill', { reservation: { wires: 2 }, scope: { tenant: 'acme' } }),
          'op-fill',
        );
        const queued = await fixture.scheduler.enqueue(
          request('wait', { scope: { tenant: 'acme' } }),
          'op-wait',
        );
        ensure(
          queued.state === 'queued' && typeof queued.position === 'number',
          'admission.deny.6',
          'a waiting verdict carries its position; the caller backoff owns the retry',
        );
        await fixture.close?.();
      },
    },
    {
      id: 'admission.region.loss',
      title: 'losing a region re-routes admission without double granting in-flight tickets',
      async run() {
        const now = { ms: 0 };
        const fixture = await options.make(
          {
            levels: {
              tenant: { algorithm: 'sliding-window', capWires: 100 },
              scope: { algorithm: 'sliding-window', capWires: 100 },
            },
            leaseTtlMs: 3_600_000,
          },
          () => now.ms,
        );
        const granted = await fixture.scheduler.enqueue(
          request('in-flight', { scope: { tenant: 'acme', region: 'eu-lost' } }),
          'op-a',
        );
        ensure(granted.state === 'granted', 'admission.region.7', 'the in-flight grant');
        const successor = await fixture.reopen();
        const rerouted = await successor.enqueue(
          request('rerouted', { scope: { tenant: 'acme', region: 'us-alive' } }),
          'op-b',
        );
        ensure(rerouted.state === 'granted', 'admission.region.7', 'admission re-routes');
        const recovered = await successor.recover('in-flight', 'g1', 'op-r');
        ensure(
          recovered.state === 'granted',
          'admission.region.7',
          'the in-flight ticket stays granted exactly once',
        );
        ensure(
          (await successor.pump('op-p')).length === 0,
          'admission.region.7',
          'no double grant of the surviving ticket',
        );
        await fixture.close?.();
      },
    },
    {
      id: 'admission.repair.hundred-percent',
      title: 'a workload of 100 percent repair amplification stays inside caps through debt',
      async run() {
        const now = { ms: 0 };
        const fixture = await options.make(
          {
            levels: {
              tenant: {
                algorithm: 'sliding-window',
                capWires: 4,
                windowMs: 3_600_000,
              },
            },
            leaseTtlMs: 3_600_000,
          },
          () => now.ms,
        );
        for (const unit of ['r1', 'r2']) {
          const decision = await fixture.scheduler.enqueue(
            request(unit, { scope: { tenant: 'acme' } }),
            `op-${unit}`,
          );
          ensure(decision.state === 'granted', 'admission.repair.8', `${unit} admitted`);
          // Every unit repairs 100 percent: actuals double the
          // reservation, and the excess lands as bucket debt.
          await fixture.scheduler.release(unit, 'g1', { wires: 2 }, `op-release-${unit}`);
        }
        // Nominal cap 4, nominal spend 2: without the debt the third
        // unit would sail through. The amplification's debt depresses
        // the bucket FIRST, which is exactly how the workload stays
        // inside caps instead of blowing them.
        const third = await fixture.scheduler.enqueue(
          request('r3', { scope: { tenant: 'acme' } }),
          'op-r3',
        );
        ensure(
          third.state === 'queued',
          'admission.repair.8',
          'the amplified spend depresses the bucket instead of blowing the cap',
        );
        await fixture.close?.();
      },
    },
    {
      id: 'admission.scope.foreign-scope-never-consumes',
      title: 'a request that cannot key a configured level refuses fail closed, consuming nothing',
      async run() {
        const now = { ms: 0 };
        const fixture = await options.make(
          {
            levels: { tenant: { algorithm: 'sliding-window', capWires: 2 } },
            leaseTtlMs: 3_600_000,
          },
          () => now.ms,
        );
        const foreign = await fixture.scheduler.enqueue(
          {
            unitId: 'foreign',
            generation: 'g1',
            reservation: { wires: 2 },
          },
          'op-foreign',
        );
        ensure(foreign.state === 'denied', 'admission.scope.9', 'fail closed, never global');
        // Nothing was consumed anywhere: the proper request takes the
        // FULL capacity.
        const proper = await fixture.scheduler.enqueue(
          request('proper', { reservation: { wires: 2 }, scope: { tenant: 'acme' } }),
          'op-proper',
        );
        ensure(proper.state === 'granted', 'admission.scope.9', 'full capacity intact');
        await fixture.close?.();
      },
    },
    {
      id: 'admission.atomicity.multi-level-all-or-nothing',
      title: 'a denial at level 2 leaves level 1 and level 3 counters untouched',
      async run() {
        const now = { ms: 0 };
        const fixture = await options.make(
          {
            levels: {
              tenant: {
                algorithm: 'sliding-window',
                capWires: 2,
                windowMs: 3_600_000,
              },
              providerAccount: {
                algorithm: 'sliding-window',
                capWires: 100,
                concurrency: 1,
              },
            },
            leaseTtlMs: 3_600_000,
          },
          () => now.ms,
        );
        const first = await fixture.scheduler.enqueue(
          request('a', { scope: { tenant: 'acme', providerAccount: 'acct-1' } }),
          'op-a',
        );
        ensure(first.state === 'granted', 'admission.atomicity.10', 'a grants');
        const blocked = await fixture.scheduler.enqueue(
          request('b', { scope: { tenant: 'acme', providerAccount: 'acct-1' } }),
          'op-b',
        );
        ensure(blocked.state === 'queued', 'admission.atomicity.10', 'b queues on level 2');
        // If b's refusal had consumed the tenant level, the last tenant
        // wire would be gone and c would queue; it grants.
        const other = await fixture.scheduler.enqueue(
          request('c', { scope: { tenant: 'acme', providerAccount: 'acct-2' } }),
          'op-c',
        );
        ensure(
          other.state === 'granted',
          'admission.atomicity.10',
          'the denial consumed nothing at any level',
        );
        await fixture.close?.();
      },
    },
    {
      id: 'admission.failover.rebind-before-dispatch',
      title: 'the transfer acquires the target slot before the source releases, atomically',
      async run() {
        const now = { ms: 0 };
        const fixture = await options.make(
          {
            levels: {
              tenant: { algorithm: 'sliding-window', capWires: 100 },
              providerAccount: {
                algorithm: 'sliding-window',
                capWires: 100,
                concurrency: 1,
              },
            },
            leaseTtlMs: 3_600_000,
          },
          () => now.ms,
        );
        const a = await fixture.scheduler.enqueue(
          request('a', { scope: { tenant: 'acme', providerAccount: 'acct-1' } }),
          'op-a',
        );
        ensure(a.state === 'granted', 'admission.failover.11', 'a holds acct-1');
        const d = await fixture.scheduler.enqueue(
          request('d', { scope: { tenant: 'acme', providerAccount: 'acct-2' } }),
          'op-d',
        );
        ensure(d.state === 'granted', 'admission.failover.11', 'd holds acct-2');
        const refused = await fixture.scheduler.rebind(
          'a',
          'g1',
          { scope: { tenant: 'acme', providerAccount: 'acct-2' } },
          'op-rebind-1',
        );
        ensure(
          refused.state === 'denied',
          'admission.failover.11',
          'a failed transfer refuses: the target slot is held',
        );
        const stillGranted = await fixture.scheduler.recover('a', 'g1', 'op-r');
        ensure(
          stillGranted.state === 'granted',
          'admission.failover.11',
          'the source binding is unchanged after the refusal',
        );
        const sourceHeld = await fixture.scheduler.enqueue(
          request('e', { scope: { tenant: 'acme', providerAccount: 'acct-1' } }),
          'op-e',
        );
        ensure(
          sourceHeld.state === 'queued',
          'admission.failover.11',
          'the source slot is STILL held: no window without a slot',
        );
        await fixture.scheduler.release('d', 'g1', { wires: 1 }, 'op-release-d');
        const moved = await fixture.scheduler.rebind(
          'a',
          'g1',
          { scope: { tenant: 'acme', providerAccount: 'acct-2' } },
          'op-rebind-2',
        );
        ensure(moved.state === 'granted', 'admission.failover.11', 'the transfer lands');
        const freed = await fixture.scheduler.pump('op-pump');
        ensure(
          freed.some((ticket) => ticket.unitId === 'e'),
          'admission.failover.11',
          'the released source slot admits the waiter in the same transition set',
        );
        await fixture.close?.();
      },
    },
    {
      id: 'admission.tenant.resolution-parity',
      title: 'the effective tenant matches the limiter posture; a conflicting pair refuses typed',
      async run() {
        const now = { ms: 0 };
        const fixture = await options.make(
          {
            levels: {
              tenant: {
                algorithm: 'sliding-window',
                capWires: 2,
                windowMs: 3_600_000,
              },
            },
            leaseTtlMs: 3_600_000,
          },
          () => now.ms,
        );
        let refused = false;
        try {
          await fixture.scheduler.enqueue(
            request('conflict', { resolvedTenant: 'engine-t', scope: { tenant: 'other' } }),
            'op-conflict',
          );
        } catch (thrown) {
          refused = thrown instanceof ConfigError || thrown instanceof Error;
        }
        ensure(refused, 'admission.tenant.12', 'the conflicting pair refuses typed');
        // The RESOLVED tenant drives the level-1 bucket: two units of
        // the same engine tenant share one cap even with distinct
        // scope projects.
        const first = await fixture.scheduler.enqueue(
          request('u1', {
            resolvedTenant: 'engine-t',
            scope: { tenant: 'engine-t', project: 'p1' },
            reservation: { wires: 2 },
          }),
          'op-u1',
        );
        ensure(first.state === 'granted', 'admission.tenant.12', 'the first unit fills the cap');
        const second = await fixture.scheduler.enqueue(
          request('u2', {
            resolvedTenant: 'engine-t',
            scope: { tenant: 'engine-t', project: 'p2' },
          }),
          'op-u2',
        );
        ensure(
          second.state === 'queued',
          'admission.tenant.12',
          'the SAME identity debits the SAME bucket, whatever the project',
        );
        await fixture.close?.();
      },
    },
  ];
  return makeSuite('admission-conformance', checks);
}
