/**
 * Run state audit and reconciliation (fenced run state RFC, phase 3):
 * the journaled run settle makes RunMeta a rebuildable projection, the
 * auditor names every divergence a worker sweep cannot see, and the
 * reconciler repairs the sound cases with zero model calls and no
 * workflow. The write-on-change rule keeps pure replay byte stable.
 */
import { describe, expect, it } from 'vitest';

import type { JournalEntry } from '../l0/entries.js';
import type { JournalStore, Lease, RunFilter, RunMeta } from '../l0/spi/store.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { createEngine, type Engine } from '../engine/engine.js';
import { defineWorkflow } from '../engine/ctx.js';
import { scriptedAdapter } from '../engine/test-harness.js';
import { auditRun, auditRuns, lastRunSettle, reconcileRunMeta } from './reconcile.js';

const wf = defineWorkflow({ name: 'reconcile-wf' }, async (ctx) => {
  const note = await ctx.agent('do the work');
  return { note };
});

function makeEngine(journal: JournalStore): Engine {
  return createEngine({
    adapters: [scriptedAdapter(() => ({ text: 'done' }))],
    stores: { journal },
    defaults: { routing: { loop: 'fake:model' } },
  });
}

function running(seq: number): JournalEntry {
  return {
    hashVersion: 2,
    seq,
    scope: '',
    key: `agent-${String(seq)}`,
    ordinal: 0,
    kind: 'agent',
    status: 'running',
    spanId: 's',
    startedAt: new Date(1_700_000_000_000 + seq).toISOString(),
  };
}

function suspendedExternal(seq: number): JournalEntry {
  return {
    hashVersion: 2,
    seq,
    scope: '',
    key: `gate-${String(seq)}`,
    ordinal: 0,
    kind: 'external',
    status: 'suspended',
    spanId: 's',
    startedAt: new Date(1_700_000_000_000 + seq).toISOString(),
  };
}

describe('the journaled run settle', () => {
  it('a settled run records its outcome as the last journal entry', async () => {
    const store = new InMemoryStore();
    const outcome = await makeEngine(store).run(wf, undefined, { runId: 'R1' }).result;
    expect(outcome.status).toBe('ok');
    const entries = await store.load('R1');
    const settle = lastRunSettle(entries);
    expect(settle).toBeDefined();
    expect(settle?.runStatus).toBe('ok');
    expect(entries[entries.length - 1]?.seq).toBe(settle?.seq);
    expect(entries[entries.length - 1]?.value).toMatchObject({
      decisionType: 'run_settle',
      runStatus: 'ok',
      segment: 1,
    });
    expect((await auditRun(store, 'R1')).verdict).toBe('consistent');
  });

  it('a pure replay resume appends nothing: the journal stays byte stable', async () => {
    const store = new InMemoryStore();
    await makeEngine(store).run(wf, undefined, { runId: 'R1' }).result;
    const before = JSON.stringify(await store.load('R1'));
    const replayed = await makeEngine(store).resume('R1', wf).result;
    expect(replayed.status).toBe('ok');
    expect(JSON.stringify(await store.load('R1'))).toBe(before);
  });
});

describe('auditRun and reconcileRunMeta', () => {
  it('the crash residue between journal flush and meta write repairs without a resume', async () => {
    const store = new InMemoryStore();
    await makeEngine(store).run(wf, undefined, { runId: 'R1' }).result;
    // The crash-era projection: the settle reached the journal, the
    // meta write never landed, and the row still says running. An
    // unknown field rides along to prove the repair preserves it.
    const meta = (await store.getMeta('R1')) as RunMeta;
    await store.putMeta({ ...meta, status: 'running', novel: 'kept' } as RunMeta);

    const audit = await auditRun(store, 'R1');
    expect(audit.verdict).toBe('meta-behind');
    expect(audit.repairTo).toBe('ok');
    const { repaired } = await reconcileRunMeta(store, 'R1');
    expect(repaired).toBe(true);
    const after = (await store.getMeta('R1')) as RunMeta & { novel?: string };
    expect(after.status).toBe('ok');
    expect(after.novel).toBe('kept');
    expect(after.workflowName).toBe('reconcile-wf');
    expect((await auditRun(store, 'R1')).verdict).toBe('consistent');
  });

  it('a stale terminal write over live work audits stranded and repairs to sweepable', async () => {
    const store = new InMemoryStore();
    // The F1 residue on an unfenced store: paid work in flight (a
    // dangling dispatch), then a superseded segment's terminal settle.
    await store.append('R1', running(0));
    await store.putMeta({ runId: 'R1', status: 'cancelled', segments: 1, updatedAt: 'stale' });
    expect(
      (await store.listRuns({ statuses: ['running', 'suspended'] })).some((m) => m.runId === 'R1'),
    ).toBe(false);

    const audit = await auditRun(store, 'R1');
    expect(audit.verdict).toBe('stranded');
    expect(audit.danglingDispatches).toBe(1);
    expect(audit.repairTo).toBe('running');
    const { repaired } = await reconcileRunMeta(store, 'R1');
    expect(repaired).toBe(true);
    expect(
      (await store.listRuns({ statuses: ['running', 'suspended'] })).some((m) => m.runId === 'R1'),
    ).toBe(true);
  });

  it('a journaled settle contradicted by the meta row repairs to the journaled status', async () => {
    const store = new InMemoryStore();
    await makeEngine(store).run(wf, undefined, { runId: 'R1' }).result;
    // A stale segment's late settle overwrote ok with cancelled AFTER
    // the successor's journaled settle: the journal record wins.
    const meta = (await store.getMeta('R1')) as RunMeta;
    await store.putMeta({ ...meta, status: 'cancelled' });
    const audit = await auditRun(store, 'R1');
    expect(audit.verdict).toBe('meta-behind');
    expect(audit.repairTo).toBe('ok');
    await reconcileRunMeta(store, 'R1');
    expect((await store.getMeta('R1'))?.status).toBe('ok');
  });

  it('open suspensions under a terminal ok meta stay suspect, never auto-repaired', async () => {
    const store = new InMemoryStore();
    await store.append('R1', suspendedExternal(0));
    await store.putMeta({ runId: 'R1', status: 'ok', segments: 1, updatedAt: 'x' });
    const audit = await auditRun(store, 'R1');
    expect(audit.verdict).toBe('suspect');
    expect(audit.openSuspensions).toBe(1);
    expect(audit.repairTo).toBeUndefined();
    const { repaired } = await reconcileRunMeta(store, 'R1');
    expect(repaired).toBe(false);
    expect((await store.getMeta('R1'))?.status).toBe('ok');
  });

  it('a journal without a meta row is suspect and nothing is fabricated', async () => {
    const store = new InMemoryStore();
    await store.append('R1', running(0));
    const audit = await auditRun(store, 'R1');
    expect(audit.verdict).toBe('suspect');
    expect(audit.meta).toBeUndefined();
    const { repaired } = await reconcileRunMeta(store, 'R1');
    expect(repaired).toBe(false);
    expect(await store.getMeta('R1')).toBeUndefined();
  });

  it('auditRuns sweeps the catalog and returns only the divergent runs', async () => {
    const store = new InMemoryStore();
    await makeEngine(store).run(wf, undefined, { runId: 'GOOD' }).result;
    await store.append('BAD', running(0));
    await store.putMeta({ runId: 'BAD', status: 'error', segments: 1, updatedAt: 'stale' });
    const divergent = await auditRuns(store);
    expect(divergent.map((a) => a.runId)).toEqual(['BAD']);
    const all = await auditRuns(store, { includeConsistent: true });
    expect(all.map((a) => a.runId).sort()).toEqual(['BAD', 'GOOD']);
  });

  it('the repair passes the caller lease into the meta write', async () => {
    const inner = new InMemoryStore();
    const seen: Array<Lease | undefined> = [];
    const store: JournalStore = {
      append: (runId: string, e: JournalEntry) => inner.append(runId, e),
      load: (runId: string) => inner.load(runId),
      putMeta: (m: RunMeta, lease?: Lease) => {
        seen.push(lease);
        return inner.putMeta(m);
      },
      listRuns: (f?: RunFilter) => inner.listRuns(f),
      delete: (runId: string) => inner.delete(runId),
    };
    await inner.append('R1', running(0));
    await inner.putMeta({ runId: 'R1', status: 'cancelled', segments: 1, updatedAt: 'stale' });
    const lease: Lease = { runId: 'R1', owner: 'operator', epoch: 9 };
    const { repaired } = await reconcileRunMeta(store, 'R1', { lease });
    expect(repaired).toBe(true);
    expect(seen).toEqual([lease]);
  });
});
