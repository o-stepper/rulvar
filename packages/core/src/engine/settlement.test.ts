/**
 * The durable settlement acknowledgement (the 1.62.0 experiment review,
 * P0.1): a NON-fencing failure of either settlement write (the
 * run_settle journal append or the terminal RunMeta projection) rejects
 * handle.result with the typed SettlementError instead of resolving,
 * a failed settle append SKIPS the meta write so the projection can
 * never run ahead of the journal, a superseded segment's LeaseHeldError
 * stays swallowed on both writes (the fencing contract working), and a
 * resume over the healed store re-settles the same outcome by replay
 * without one paid provider call.
 */
import { describe, expect, it } from 'vitest';

import { LeaseHeldError, SettlementError } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import type { RunMeta } from '../l0/spi/store.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { scriptedAdapter } from './test-harness.js';

const isSettleEntry = (e: JournalEntry): boolean =>
  (e.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle';

/** Fails the run_settle journal append while armed; heals on disarm. */
class SettleAppendOutageStore extends InMemoryStore {
  armed = true;

  override append(runId: string, e: JournalEntry): Promise<void> {
    if (this.armed && isSettleEntry(e)) {
      return Promise.reject(new Error('injected outage: run_settle append failed'));
    }
    return super.append(runId, e);
  }
}

/** Fails the terminal RunMeta write while armed; heals on disarm. */
class TerminalMetaOutageStore extends InMemoryStore {
  armed = true;

  override putMeta(m: RunMeta): Promise<void> {
    if (this.armed && m.status !== 'running' && m.status !== 'suspended') {
      return Promise.reject(new Error('injected outage: terminal meta write failed'));
    }
    return super.putMeta(m);
  }
}

/** Rejects BOTH settlement writes with the fencing rejection. */
class SupersededSegmentStore extends InMemoryStore {
  override append(runId: string, e: JournalEntry): Promise<void> {
    if (isSettleEntry(e)) {
      return Promise.reject(new LeaseHeldError('stale fencing epoch: not the current holder'));
    }
    return super.append(runId, e);
  }

  override putMeta(m: RunMeta): Promise<void> {
    if (m.status !== 'running' && m.status !== 'suspended') {
      return Promise.reject(new LeaseHeldError('stale fencing epoch: not the current holder'));
    }
    return super.putMeta(m);
  }
}

function buildEngine(journal: InMemoryStore) {
  const adapter = scriptedAdapter(() => ({ text: 'done', finish: 'stop' }));
  const engine = createEngine({
    adapters: [adapter],
    defaults: { routing: { loop: 'fake:m1' } },
    stores: { journal },
  });
  const wf = defineWorkflow({ name: 'demo' }, async (ctx) => {
    await ctx.agent('go');
    return 'done';
  });
  return { engine, wf, adapter };
}

describe('durable settlement acknowledgement (P0.1)', () => {
  it('a failed run_settle append rejects typed, skips the meta write, and resume re-settles by replay', async () => {
    const store = new SettleAppendOutageStore();
    const { engine, wf, adapter } = buildEngine(store);
    const logs: string[] = [];
    const handle = engine.run(wf, undefined, {});
    handle.on('log', (event) => {
      logs.push((event as { msg: string }).msg);
    });

    let thrown: unknown;
    try {
      await handle.result;
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(SettlementError);
    const settlement = thrown as SettlementError;
    expect(settlement.stage).toBe('run-settle');
    expect(settlement.runId).toBe(handle.runId);
    expect(settlement.runStatus).toBe('ok');
    expect(settlement.code).toBe('settlement');
    expect(settlement.retryable).toBe(true);
    expect(settlement.data).toEqual({
      runId: handle.runId,
      runStatus: 'ok',
      stage: 'run-settle',
    });
    expect((settlement.cause as Error).message).toContain('injected outage');
    expect(settlement.message).toContain('resume the run to re-settle by replay');

    // Nothing durable claims the run settled: no settle entry, and the
    // meta write was SKIPPED, so the projection never ran ahead of the
    // journal (the published 1.62.0 behavior wrote meta 'ok' over a
    // journal with no settle entry).
    expect((await store.load(handle.runId)).some(isSettleEntry)).toBe(false);
    expect((await store.getMeta(handle.runId))?.status).toBe('running');
    expect(logs.some((msg) => msg.includes('settlement write failed (run-settle)'))).toBe(true);

    // Healed store: resume re-settles the SAME outcome purely by
    // replay; the adapter is never paid a second time.
    store.armed = false;
    const resumed = await engine.resume(handle.runId, wf).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe('done');
    expect(adapter.calls).toHaveLength(1);
    expect((await store.load(handle.runId)).some(isSettleEntry)).toBe(true);
    expect((await store.getMeta(handle.runId))?.status).toBe('ok');
  });

  it('a failed terminal meta write rejects typed with the journal already settled', async () => {
    const store = new TerminalMetaOutageStore();
    const { engine, wf, adapter } = buildEngine(store);
    const handle = engine.run(wf, undefined, {});

    let thrown: unknown;
    try {
      await handle.result;
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(SettlementError);
    const settlement = thrown as SettlementError;
    expect(settlement.stage).toBe('meta');
    expect(settlement.runStatus).toBe('ok');

    // The journal settle IS durable; only the projection is behind, the
    // same residue a crash between the two writes leaves.
    const settled = (await store.load(handle.runId)).filter(isSettleEntry);
    expect(settled).toHaveLength(1);
    expect((await store.getMeta(handle.runId))?.status).toBe('running');

    // A healed resume replays (no new settle entry, no paid call) and
    // repairs the projection.
    store.armed = false;
    const resumed = await engine.resume(handle.runId, wf).result;
    expect(resumed.status).toBe('ok');
    expect(adapter.calls).toHaveLength(1);
    expect((await store.load(handle.runId)).filter(isSettleEntry)).toHaveLength(1);
    expect((await store.getMeta(handle.runId))?.status).toBe('ok');
  });

  it('a superseded segment’s LeaseHeldError stays swallowed on both writes', async () => {
    const store = new SupersededSegmentStore();
    const { engine, wf } = buildEngine(store);

    // The fencing contract working is not a settlement fault: the
    // successor owns settlement and this segment stays silent.
    const outcome = await engine.run(wf, undefined, {}).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('done');
  });

  it('an error-status run acknowledges the settlement write fault the same way', async () => {
    const store = new SettleAppendOutageStore();
    const adapter = scriptedAdapter(() => ({ text: 'done', finish: 'stop' }));
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:m1' } },
      stores: { journal: store },
    });
    // The run must append SOME durable work first: an empty-journal run
    // settles without a settle entry by design, so a workflow that
    // throws before any journaled step never reaches the settle append.
    const wf = defineWorkflow({ name: 'boom' }, async (ctx) => {
      await ctx.agent('go');
      throw new Error('workflow failure');
    });

    let thrown: unknown;
    try {
      await engine.run(wf, undefined, {}).result;
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(SettlementError);
    expect((thrown as SettlementError).runStatus).toBe('error');
    expect((thrown as SettlementError).stage).toBe('run-settle');
  });
});
