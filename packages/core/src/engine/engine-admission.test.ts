/**
 * The engine's durable admission bracket (RV4510, plan 45,
 * rfcs/admission.md section 5): the ticket brackets the run, a denied
 * verdict refuses typed before any provider dispatch, a queued run
 * waits for its grant, the ticket releases at settle, and NOTHING of
 * it is journaled. The limiter split holds: admission never exempts a
 * wire from quota.
 */
import { describe, expect, it } from 'vitest';

import { AdmissionRejectedError, ConfigError } from '../l0/errors.js';
import type { AdmissionRecovery } from '../l0/spi/admission.js';
import { admitRunUnit, validateEngineAdmissionConfig } from '../admission/engine-bracket.js';
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

  it("onLeaseLost 'cancel' verifies every tick and cancels the run once the grant is gone (RV4910)", async () => {
    const events: Array<{ type: string } & Record<string, unknown>> = [];
    const cancels: string[] = [];
    let expired = false;
    let renews = 0;
    let verifies = 0;
    const sched = fakeScheduler({
      // The renew stays SILENT, the reference scheduler's no-op on an
      // expired ticket: only the verify can tell the grant is gone.
      renew: () => {
        renews += 1;
        return Promise.resolve();
      },
      recover: (_unit, _generation, opId) => {
        if (!opId.endsWith(':verify')) {
          return Promise.resolve({ state: 'unknown' });
        }
        verifies += 1;
        const answer: AdmissionRecovery = expired
          ? { state: 'unknown' }
          : { state: 'granted', ticket: ticketOf('r') };
        return Promise.resolve(answer);
      },
    });
    const teardown = await admitRunUnit(
      { scheduler: sched, pollMs: 10, renewMs: 12, onLeaseLost: 'cancel' },
      {
        unitId: 'r',
        generation: 'g1',
        telemetry: { emit: (body) => events.push(body) },
        requestCancel: (reason) => cancels.push(reason),
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(renews).toBeGreaterThanOrEqual(2);
    expect(verifies).toBeGreaterThanOrEqual(2);
    expect(cancels).toHaveLength(0);
    expired = true;
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(cancels).toHaveLength(1);
    expect(cancels[0]).toContain("lease lost for run 'r'");
    // Announced once, cancelled once, whatever the number of ticks.
    expect(events.filter((event) => event.type === 'admission:lease-lost')).toHaveLength(1);
    const warns = events.filter((event) => event.type === 'log' && event.level === 'warn');
    expect(warns).toHaveLength(1);
    expect(String(warns[0]?.msg)).toContain("onLeaseLost is 'cancel'");
    await teardown();
  });

  it('the default arm keeps its bytes: a silent renew is never verified, a thrown one announces and never cancels', async () => {
    const events: Array<{ type: string } & Record<string, unknown>> = [];
    const cancels: string[] = [];
    let verifies = 0;
    const countVerifies = (
      _unit: string,
      _generation: string,
      opId: string,
    ): Promise<AdmissionRecovery> => {
      if (opId.endsWith(':verify')) {
        verifies += 1;
      }
      return Promise.resolve({ state: 'unknown' });
    };
    // A silent renew: no verify, nothing announced, nothing cancelled,
    // exactly as before RV4910 (the default arm adds no scheduler call).
    const quiet = fakeScheduler({ recover: countVerifies });
    const teardownQuiet = await admitRunUnit(
      { scheduler: quiet, pollMs: 10, renewMs: 12 },
      {
        unitId: 'q',
        generation: 'g1',
        telemetry: { emit: (body) => events.push(body) },
        requestCancel: (reason) => cancels.push(reason),
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 60));
    await teardownQuiet();
    expect(verifies).toBe(0);
    expect(events).toHaveLength(0);
    // A thrown renew: the RV4804 announcement, and still no cancel.
    const thrown = fakeScheduler({
      renew: () => Promise.reject(new Error('lease is gone')),
      recover: countVerifies,
    });
    const teardown = await admitRunUnit(
      { scheduler: thrown, pollMs: 10, renewMs: 12 },
      {
        unitId: 'r',
        generation: 'g1',
        telemetry: { emit: (body) => events.push(body) },
        requestCancel: (reason) => cancels.push(reason),
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 60));
    await teardown();
    expect(verifies).toBeGreaterThanOrEqual(1);
    expect(cancels).toHaveLength(0);
    expect(events.filter((event) => event.type === 'admission:lease-lost')).toHaveLength(1);
    const warns = events.filter((event) => event.type === 'log' && event.level === 'warn');
    expect(warns).toHaveLength(2);
    expect(String(warns[1]?.msg)).toContain('may re-admit the capacity while this run is alive');
  });

  it('refuses an unknown onLeaseLost value typed', () => {
    expect(() =>
      validateEngineAdmissionConfig({
        scheduler: fakeScheduler({}),
        onLeaseLost: 'explode' as unknown as 'cancel',
      }),
    ).toThrow(ConfigError);
  });

  it("under onLeaseLost 'cancel' the engine settles the run cancelled and the settle release returns the parked slot", async () => {
    const now = { ms: 0 };
    const sched = new MemoryAdmissionScheduler({
      levels: {
        tenant: { algorithm: 'sliding-window', capWires: 100, windowMs: 3_600_000 },
        providerAccount: { algorithm: 'sliding-window', capWires: 100, concurrency: 1 },
      },
      leaseTtlMs: 1_000,
      now: () => now.ms,
    });
    // The adapter holds the turn open so the lease is lost under a
    // LIVE run; the cancel arm must settle it before the hang ends.
    const adapter = scriptedAdapter(() => ({ text: 'done', usage: USAGE, hangMs: 3_000 }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: 'fake:model' } },
      admission: {
        scheduler: sched,
        tenant: 'acme',
        pollMs: 5,
        renewMs: 10,
        onLeaseLost: 'cancel',
      },
    });
    const handle = engine.run(wf, undefined, {
      runId: 'ADMIT-LOST',
      scope: { tenant: 'acme', providerAccount: 'ant-1' },
    });
    await new Promise((resolve) => setTimeout(resolve, 40));
    // Another party's pump (a worker sweep, in life) expires the lease
    // behind the run's back: the wires refund, the slot parks.
    now.ms = 5_000;
    await sched.pump('op-expire');
    const bucket = 'providerAccount:{"providerAccount":"ant-1","tenant":"acme"}';
    expect(sched.snapshot().buckets[bucket]?.parked).toBe(1);
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');
    // The settle release is the holder's own word: the slot returns.
    const after = sched.snapshot().buckets[bucket];
    expect(after?.held).toBe(0);
    expect(after?.parked).toBe(0);
    const row = Object.values(sched.snapshot().tickets).find(
      (candidate) => candidate.ticket.unitId === 'ADMIT-LOST',
    );
    expect(row?.ticket.state).toBe('expired');
  });
});
