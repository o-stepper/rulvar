/**
 * The engine's durable admission bracket (RV4510, plan 45,
 * rfcs/admission.md section 5): the ticket brackets the run, a denied
 * verdict refuses typed before any provider dispatch, a queued run
 * waits for its grant, the ticket releases at settle, and NOTHING of
 * it is journaled. The limiter split holds: admission never exempts a
 * wire from quota.
 */
import { describe, expect, it } from 'vitest';

import { AdmissionRejectedError } from '../l0/errors.js';
import { admitRunUnit } from '../admission/engine-bracket.js';
import { MemoryAdmissionScheduler } from '../admission/memory.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { createEngine } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';

const USAGE = { inputTokens: 3, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 };

const wf = defineWorkflow({ name: 'admitted' }, async (ctx) => ctx.agent('one turn'));

function scheduler(now: { ms: number }, capWires = 2): MemoryAdmissionScheduler {
  return new MemoryAdmissionScheduler({
    levels: {
      tenant: { algorithm: 'sliding-window', capWires, windowMs: 3_600_000 },
    },
    leaseTtlMs: 60_000,
    now: () => now.ms,
  });
}

function engineOver(
  store: InMemoryStore,
  admission: NonNullable<Parameters<typeof createEngine>[0]['admission']>,
) {
  return createEngine({
    adapters: [scriptedAdapter(() => ({ text: 'done', usage: USAGE }))],
    stores: { journal: store },
    defaults: { routing: { loop: 'fake:model' } },
    admission,
  });
}

describe('the engine admission bracket', () => {
  it('grants, runs, and releases the ticket at settle', async () => {
    const now = { ms: 0 };
    const sched = scheduler(now);
    const store = new InMemoryStore();
    const engine = engineOver(store, { scheduler: sched, tenant: 'acme' });
    const outcome = await engine.run(wf, undefined, { runId: 'ADMIT-1' }).result;
    expect(outcome.status).toBe('ok');
    // Released at settle: the durable document holds the terminal.
    const tickets = Object.values(sched.snapshot().tickets);
    expect(tickets).toHaveLength(1);
    expect(tickets[0]?.ticket.unitId).toBe('ADMIT-1');
    expect(tickets[0]?.ticket.state).toBe('released');
    // And NOTHING journaled: admission is an environmental fact.
    const entries = await store.load('ADMIT-1');
    const admissionRows = entries.filter((entry) =>
      JSON.stringify(entry.value ?? {}).includes('admission'),
    );
    expect(admissionRows).toHaveLength(0);
  });

  it('the terminal denied verdict refuses typed before any provider dispatch', async () => {
    const now = { ms: 0 };
    const sched = scheduler(now, 2);
    const adapter = scriptedAdapter(() => ({ text: 'done', usage: USAGE }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: 'fake:model' } },
      admission: { scheduler: sched, tenant: 'acme', reservation: { wires: 5 } },
    });
    await expect(engine.run(wf, undefined, { runId: 'ADMIT-DENIED' }).result).rejects.toThrow(
      AdmissionRejectedError,
    );
    expect(adapter.calls).toHaveLength(0);
  });

  it('a queued run waits for its grant and proceeds when capacity frees', async () => {
    const now = { ms: 0 };
    const sched = scheduler(now, 2);
    // A plug fills the tenant window; the run must wait.
    await sched.enqueue(
      {
        unitId: 'plug',
        generation: 'g1',
        resolvedTenant: 'acme',
        reservation: { wires: 2 },
      },
      'op-plug',
    );
    const engine = engineOver(new InMemoryStore(), {
      scheduler: sched,
      tenant: 'acme',
      pollMs: 10,
    });
    const handle = engine.run(wf, undefined, { runId: 'ADMIT-WAIT' });
    let settled = false;
    void handle.result.then(() => {
      settled = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(settled).toBe(false);
    // The plug releases with zero actuals: its whole window refunds
    // and the waiting run's next poll grants.
    await sched.release('plug', 'g1', { wires: 0 }, 'op-unplug');
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
  });

  it('a settled unit re-admits on resume as a fresh ticket', async () => {
    const now = { ms: 0 };
    const sched = scheduler(now);
    const store = new InMemoryStore();
    const engine = engineOver(store, { scheduler: sched, tenant: 'acme' });
    const first = await engine.run(wf, undefined, { runId: 'ADMIT-RESUME' }).result;
    expect(first.status).toBe('ok');
    // The resume replays the settled run; its bracket re-admits the
    // same (runId, genesis) identity instead of refusing on history.
    const resumed = await engineOver(store, { scheduler: sched, tenant: 'acme' }).resume(
      'ADMIT-RESUME',
      wf,
    ).result;
    expect(resumed.status).toBe('ok');
  });

  it("tenantFrom 'scope' resolves the admission identity from the run scope", async () => {
    const now = { ms: 0 };
    const sched = scheduler(now, 2);
    const store = new InMemoryStore();
    const engine = engineOver(store, {
      scheduler: sched,
      tenantFrom: 'scope',
      reservation: { wires: 2 },
    });
    const outcome = await engine.run(wf, undefined, {
      runId: 'ADMIT-SCOPE',
      scope: { tenant: 'scope-tenant' },
    }).result;
    expect(outcome.status).toBe('ok');
    // The scope tenant's window took the whole reservation: a second
    // unit of the SAME scope tenant queues, proving which bucket paid.
    const probe = await sched.enqueue(
      {
        unitId: 'probe',
        generation: 'g1',
        resolvedTenant: 'scope-tenant',
        reservation: { wires: 1 },
      },
      'op-probe',
    );
    expect(probe.state).toBe('queued');
  });
});

describe('the hardened admission bracket (RV4804)', () => {
  const ticketOf = (unitId: string): import('../l0/spi/admission.js').AdmissionTicket => ({
    unitId,
    generation: 'g1',
    state: 'queued',
    reservation: { wires: 1 },
    weight: 1,
    arrivalSeq: 0,
    startTag: 0,
    finishTag: 1,
    enqueuedAtMs: 0,
  });
  function fakeScheduler(
    overrides: Partial<import('../l0/spi/admission.js').AdmissionScheduler>,
  ): import('../l0/spi/admission.js').AdmissionScheduler {
    return {
      enqueue: () => Promise.resolve({ state: 'granted', ticket: ticketOf('x') }),
      recover: () => Promise.resolve({ state: 'unknown' }),
      renew: () => Promise.resolve(),
      checkpointCover: () => Promise.resolve(),
      release: () => Promise.resolve(),
      cancel: () => Promise.resolve(),
      rebind: () => Promise.resolve({ state: 'denied', reason: 'unused' }),
      pump: () => Promise.resolve([]),
      ...overrides,
    };
  }

  it('the queued verdict retryAfterMs sets the next sleep, pollMs stays the fallback', async () => {
    // pollMs is a deliberately absurd 30 s: without honoring the 15 ms
    // hint the first poll alone would outlast the test. The grant
    // arrives on the first poll after the hinted sleep.
    let polls = 0;
    const sched = fakeScheduler({
      enqueue: () =>
        Promise.resolve({ state: 'queued', ticket: ticketOf('r'), position: 1, retryAfterMs: 15 }),
      recover: (_unit, _generation, opId) => {
        if (opId.includes(':poll:')) {
          polls += 1;
          return Promise.resolve({ state: 'granted', ticket: ticketOf('r') });
        }
        return Promise.resolve({ state: 'unknown' });
      },
    });
    const startedAt = Date.now();
    const teardown = await admitRunUnit(
      { scheduler: sched, pollMs: 30_000 },
      { unitId: 'r', generation: 'g1' },
    );
    expect(Date.now() - startedAt).toBeLessThan(5_000);
    expect(polls).toBe(1);
    await teardown();
  });

  it('an aborted run stops waiting, cancels its ticket, and settles as a no-op', async () => {
    const cancels: string[] = [];
    const releases: string[] = [];
    const controller = new AbortController();
    const sched = fakeScheduler({
      recover: () => Promise.resolve({ state: 'queued', ticket: ticketOf('r'), position: 3 }),
      cancel: (_unit, _generation, opId) => {
        cancels.push(opId);
        return Promise.resolve();
      },
      release: (_unit, _generation, _actuals, opId) => {
        releases.push(opId);
        return Promise.resolve();
      },
    });
    setTimeout(() => controller.abort('host cancelled'), 20);
    const teardown = await admitRunUnit(
      { scheduler: sched, pollMs: 60_000 },
      { unitId: 'r', generation: 'g1', signal: controller.signal },
    );
    expect(cancels).toHaveLength(1);
    await teardown();
    // The abandoned wait settles as a no-op: nothing was granted, so
    // nothing releases.
    expect(releases).toHaveLength(0);
  });

  it('renew failures announce once, and the lost lease emits admission:lease-lost once', async () => {
    const events: Array<{ type: string } & Record<string, unknown>> = [];
    let renews = 0;
    const sched = fakeScheduler({
      renew: () => {
        renews += 1;
        return Promise.reject(new Error('lease is gone'));
      },
      // The identity recover answers unknown (fresh unit); the verify
      // recover after a failed renew answers unknown too: the ticket
      // expired under the holder, which is exactly the lost lease.
    });
    const teardown = await admitRunUnit(
      { scheduler: sched, pollMs: 10, renewMs: 12 },
      { unitId: 'r', generation: 'g1', telemetry: { emit: (body) => events.push(body) } },
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
    await teardown();
    expect(renews).toBeGreaterThanOrEqual(2);
    const warns = events.filter((event) => event.type === 'log' && event.level === 'warn');
    // The first failure and the lost lease: announced once each, not
    // once per tick.
    expect(warns).toHaveLength(2);
    const lost = events.filter((event) => event.type === 'admission:lease-lost');
    expect(lost).toHaveLength(1);
    expect(lost[0]).toMatchObject({ unitId: 'r', generation: 'g1' });
  });

  it('a run cancelled while queued settles cancelled instead of polling forever', async () => {
    const now = { ms: 0 };
    const sched = scheduler(now, 2);
    await sched.enqueue(
      {
        unitId: 'plug',
        generation: 'g1',
        resolvedTenant: 'acme',
        reservation: { wires: 2 },
      },
      'op-plug',
    );
    const engine = engineOver(new InMemoryStore(), {
      scheduler: sched,
      tenant: 'acme',
      pollMs: 10,
    });
    const handle = engine.run(wf, undefined, {
      runId: 'ADMIT-CANCEL',
      deadlineAt: new Date(Date.now() + 120).toISOString(),
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    // The queued ticket did not stay camped in the queue.
    const ticket = Object.values(sched.snapshot().tickets).find(
      (row) => row.ticket.unitId === 'ADMIT-CANCEL',
    );
    expect(ticket?.ticket.state).not.toBe('queued');
  });
});
