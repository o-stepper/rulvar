/**
 * The durable settlement acknowledgement (the 1.62.0 experiment review,
 * P0.1): a NON-fencing failure of either settlement write (the
 * run_settle journal append or the terminal RunMeta projection) rejects
 * handle.result with the typed SettlementError instead of resolving,
 * a failed settle append SKIPS the meta write so the projection can
 * never run ahead of the journal, a superseded segment (its settle
 * append bounced off the store's fence) rejects with the typed
 * SupersededError while its run:end refuses green under the distinct
 * superseded reason (RV1009), and a resume over the healed store
 * re-settles the same outcome by replay without one paid provider
 * call.
 */
import { describe, expect, it } from 'vitest';

import { LeaseHeldError, SettlementError, SupersededError } from '../l0/errors.js';
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

/** Rejects BOTH settlement writes with the fencing rejection while armed; heals on disarm. */
class SupersededSegmentStore extends InMemoryStore {
  armed = true;

  override append(runId: string, e: JournalEntry): Promise<void> {
    if (this.armed && isSettleEntry(e)) {
      return Promise.reject(new LeaseHeldError('stale fencing epoch: not the current holder'));
    }
    return super.append(runId, e);
  }

  override putMeta(m: RunMeta): Promise<void> {
    if (this.armed && m.status !== 'running' && m.status !== 'suspended') {
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
    const logs: Array<{ msg: string; seq: number }> = [];
    let runEnd: { seq: number; status: string; settled?: boolean } | undefined;
    const handle = engine.run(wf, undefined, {});
    handle.on('log', (event) => {
      logs.push(event);
    });
    handle.on('run:end', (event) => {
      runEnd = event;
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
    const warn = logs.find((log) => log.msg.includes('settlement write failed (run-settle)'));
    expect(warn).toBeDefined();

    // The event terminal is not green (RV907): run:end still reports
    // the COMPUTED status, and `settled: false` says nothing durable
    // records it, so an event-only consumer cannot read a terminal that
    // exists in no store as a settled success. The warn precedes it.
    expect(runEnd?.status).toBe('ok');
    expect(runEnd?.settled).toBe(false);
    expect(runEnd?.seq).toBeGreaterThan(warn?.seq ?? Number.MAX_SAFE_INTEGER);

    // Healed store: resume re-settles the SAME outcome purely by
    // replay; the adapter is never paid a second time, and the settled
    // terminal carries no `settled` field, byte for byte like every
    // ordinary run.
    store.armed = false;
    let resumedEnd: Record<string, unknown> | undefined;
    const resumedHandle = engine.resume(handle.runId, wf);
    resumedHandle.on('run:end', (event) => {
      resumedEnd = event;
    });
    const resumed = await resumedHandle.result;
    await new Promise((resolve) => setImmediate(resolve));
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe('done');
    expect(adapter.calls).toHaveLength(1);
    expect(resumedEnd).toBeDefined();
    expect('settled' in (resumedEnd ?? {})).toBe(false);
    expect((await store.load(handle.runId)).some(isSettleEntry)).toBe(true);
    expect((await store.getMeta(handle.runId))?.status).toBe('ok');
  });

  it('a failed terminal meta write rejects typed with the journal already settled', async () => {
    const store = new TerminalMetaOutageStore();
    const { engine, wf, adapter } = buildEngine(store);
    const handle = engine.run(wf, undefined, {});
    let runEnd: { settled?: boolean } | undefined;
    handle.on('run:end', (event) => {
      runEnd = event;
    });

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
    // Both settlement stages mark the event terminal unsettled (RV907).
    expect(runEnd?.settled).toBe(false);

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

  it('a superseded segment rejects typed with the distinct superseded reason, never a green terminal (RV1009)', async () => {
    const store = new SupersededSegmentStore();
    const { engine, wf } = buildEngine(store);

    // The fencing contract working is not a settlement FAULT, but it is
    // not a green terminal either: the successor owns settlement,
    // nothing durable records THIS segment's outcome, and resolving ok
    // here was exactly the split view RV907 forbids (a superseded
    // segment used to resolve ok with an unmarked run:end).
    const handle = engine.run(wf, undefined, {});
    const logs: Array<{ msg: string; seq: number }> = [];
    let runEnd: Record<string, unknown> | undefined;
    handle.on('log', (event) => {
      logs.push(event);
    });
    handle.on('run:end', (event) => {
      runEnd = event;
    });
    let thrown: unknown;
    try {
      await handle.result;
    } catch (err) {
      thrown = err;
    }
    await new Promise((resolve) => setImmediate(resolve));
    expect(thrown).toBeInstanceOf(SupersededError);
    const superseded = thrown as SupersededError;
    expect(superseded.code).toBe('superseded');
    expect(superseded.retryable).toBe(false);
    expect(superseded.runId).toBe(handle.runId);
    expect(superseded.runStatus).toBe('ok');
    expect(superseded.cause).toBeInstanceOf(LeaseHeldError);
    expect(superseded.message).toContain('successor');
    expect(superseded.data).toEqual({ runId: handle.runId, runStatus: 'ok' });

    // The event terminal refuses green with the DISTINCT reason, so an
    // event-only consumer can tell a superseded segment from a
    // settlement write failure; the warn precedes the terminal.
    expect(runEnd?.status).toBe('ok');
    expect(runEnd?.settled).toBe(false);
    expect(runEnd?.settledReason).toBe('superseded');
    expect(logs.some((log) => log.msg.includes('superseded'))).toBe(true);

    // Nothing durable claims this outcome: no settle entry landed, and
    // the meta write was SKIPPED (bouncing it would only re-prove the
    // fence; the projection stays the successor's business).
    expect((await store.load(handle.runId)).some(isSettleEntry)).toBe(false);
    expect((await store.getMeta(handle.runId))?.status).toBe('running');
  });

  it('exactly one successor settles: the healed resume records the one authoritative settle by replay', async () => {
    const store = new SupersededSegmentStore();
    const { engine, wf, adapter } = buildEngine(store);
    const handle = engine.run(wf, undefined, {});
    await handle.result.catch(() => undefined);

    // The successor (here: a resume once the fence no longer rejects
    // this holder) settles the run exactly once, by replay, without a
    // second paid call; its terminal carries no settled mark.
    store.armed = false;
    let resumedEnd: Record<string, unknown> | undefined;
    const resumedHandle = engine.resume(handle.runId, wf);
    resumedHandle.on('run:end', (event) => {
      resumedEnd = event;
    });
    const resumed = await resumedHandle.result;
    await new Promise((resolve) => setImmediate(resolve));
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe('done');
    expect(adapter.calls).toHaveLength(1);
    expect((await store.load(handle.runId)).filter(isSettleEntry)).toHaveLength(1);
    expect((await store.getMeta(handle.runId))?.status).toBe('ok');
    expect(resumedEnd).toBeDefined();
    expect('settled' in (resumedEnd ?? {})).toBe(false);
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
