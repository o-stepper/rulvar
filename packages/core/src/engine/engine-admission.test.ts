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
