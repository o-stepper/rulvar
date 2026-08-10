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
import { costReportFromJournal } from '../engine/cost-report.js';
import { createEngine, type Engine } from '../engine/engine.js';
import { defineWorkflow } from '../engine/ctx.js';
import { scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { tool } from '../tools/tool.js';
import {
  auditRun,
  auditRuns,
  childRostersFromJournal,
  lastRunSettle,
  logicalRunTelemetry,
  reconcileRunMeta,
  TERMINAL_TELEMETRY_SCOPE,
} from './reconcile.js';

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

describe('the settle reads back what the finish contract refused (RV2605)', () => {
  // The settle persists the WHOLE completion lift (RV2507 included), so
  // an offline reader recovers the rejected candidates without a
  // re-fold and without re-running a validator.
  const settleWith = (rejectedFinishCandidates: unknown): JournalEntry[] =>
    [
      {
        seq: 1,
        kind: 'decision',
        scope: '',
        status: 'ok',
        site: 'run-settle',
        value: { decisionType: 'run_settle', runStatus: 'error', rejectedFinishCandidates },
      },
    ] as unknown as JournalEntry[];
  const row = (extra: Record<string, unknown> = {}) => ({
    callId: 'call-1',
    verdict: 'rejected',
    hash: 'a'.repeat(64),
    chars: 5207,
    failed: [{ name: 'evidence-grade', reasons: ['two sentences'] }],
    ...extra,
  });

  it('reads the rows back off a persisted settle', () => {
    const settle = lastRunSettle(settleWith([row({ verdict: 'repair' }), row({ ref: 'r/f/1' })]));
    expect(settle?.rejectedFinishCandidates).toEqual([
      {
        callId: 'call-1',
        verdict: 'repair',
        hash: 'a'.repeat(64),
        chars: 5207,
        failed: [{ name: 'evidence-grade', reasons: ['two sentences'] }],
      },
      {
        callId: 'call-1',
        verdict: 'rejected',
        hash: 'a'.repeat(64),
        chars: 5207,
        failed: [{ name: 'evidence-grade', reasons: ['two sentences'] }],
        ref: 'r/f/1',
      },
    ]);
  });

  it('drops the WHOLE list on a malformed row, never a subset', () => {
    // The RV2507 posture: a partial history read as complete would
    // under-report exactly the runs that misbehaved most.
    expect(
      lastRunSettle(settleWith([row(), row({ verdict: 'maybe' })]))?.rejectedFinishCandidates,
    ).toBeUndefined();
    expect(
      lastRunSettle(settleWith([row({ chars: -1 })]))?.rejectedFinishCandidates,
    ).toBeUndefined();
    expect(
      lastRunSettle(settleWith([row({ failed: [{ name: 'x', reasons: [7] }] })]))
        ?.rejectedFinishCandidates,
    ).toBeUndefined();
  });

  it('a settle that recorded none says nothing, and still settles', () => {
    // Absence is NOT RECORDED (RV1209): a finish that passed first try,
    // a run with no contract, and a journal written before RV2507 all
    // read the same, and none of them is a claim that nothing was
    // refused.
    expect(lastRunSettle(settleWith(undefined))?.rejectedFinishCandidates).toBeUndefined();
    expect(lastRunSettle(settleWith([]))?.rejectedFinishCandidates).toBeUndefined();
    expect(lastRunSettle(settleWith(undefined))?.runStatus).toBe('error');
  });
});

describe('the logical run telemetry over every segment (RV2510)', () => {
  // The twenty-fifth comparison run was killed and resumed, and its two
  // terminals mixed cumulative money with segment-scoped counters,
  // nothing marking which was which. This fold answers for the LOGICAL
  // run, and the scope table says which field needs which reading.
  const work = (seq: number): JournalEntry =>
    ({
      seq,
      kind: 'fact',
      scope: '',
      status: 'ok',
      site: 'x',
      value: {},
    }) as unknown as JournalEntry;
  const settle = (seq: number, runStatus: string): JournalEntry =>
    ({
      seq,
      kind: 'decision',
      scope: '',
      status: 'ok',
      site: 'run-settle',
      value: { decisionType: 'run_settle', runStatus, segment: seq },
    }) as unknown as JournalEntry;

  it('partitions the journal by settle boundary, so no entry is counted twice', () => {
    const total = logicalRunTelemetry([
      work(1),
      work(2),
      settle(3, 'exhausted'),
      work(4),
      settle(5, 'ok'),
    ]);
    expect(total.segments).toBe(2);
    expect(total.statuses).toEqual(['exhausted', 'ok']);
    // The figure no single terminal carries: what each segment
    // actually did, and the two add up to the whole journal.
    expect(total.entriesPerSegment).toEqual([3, 2]);
    expect(total.entries).toBe(5);
    expect(total.entriesPerSegment.reduce((a, b) => a + b, 0)).toBe(total.entries);
    expect(total.entriesAfterLastSettle).toBe(0);
  });

  it('names the entries that continued PAST the last settle', () => {
    const total = logicalRunTelemetry([work(1), settle(2, 'suspended'), work(3), work(4)]);
    // The journal is not terminal here (RV1407), and the aggregate says
    // so instead of presenting the last status as the run's last word.
    expect(total.entriesAfterLastSettle).toBe(2);
    expect(total.entriesPerSegment).toEqual([2]);
  });

  it('a journal with no settle at all folds to zero segments, not to a guess', () => {
    const total = logicalRunTelemetry([work(1), work(2)]);
    expect(total.segments).toBe(0);
    expect(total.statuses).toEqual([]);
    expect(total.entriesAfterLastSettle).toBe(2);
  });

  it('deliberately carries no cumulative figure: summing those double counts', () => {
    const total = logicalRunTelemetry([work(1), settle(2, 'ok')]);
    // Money and usage fold from the whole journal already; a per-segment
    // sum would count every replayed operation once per segment that
    // replayed it, which is exactly the reconciliation this fold exists
    // to make unnecessary.
    expect('totalUsd' in total).toBe(false);
    expect('usage' in total).toBe(false);
  });

  it('a resumed run holds every figure to the scope the table declared (RV2801)', async () => {
    // The half no type can decide: WHETHER a declared scope is true. A
    // wrong scope is worse than a missing one, because a missing one is
    // noticed and a wrong one is believed, and the two assertions that
    // used to stand here restated the table's own literal, so they
    // could only fail together with the table itself.
    //
    // So: a real run, suspended on an approval and resumed to ok, with
    // both terminals in hand.
    const journal = new InMemoryStore({ quiet: true });
    const adapters = () => [
      scriptedAdapter((): ScriptedTurn =>
        sawApproval
          ? { text: 'shipped' }
          : { toolCall: { name: 'deploy', args: { site: 'prod' } } },
      ),
    ];
    let sawApproval = false;
    const deploy = tool({
      name: 'deploy',
      description: 'deploys the site',
      parameters: { type: 'object' },
      needsApproval: true,
      execute: () => {
        sawApproval = true;
        return Promise.resolve('deployed');
      },
    });
    const gated = defineWorkflow({ name: 'scope-resume' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deploy] }),
    );
    const make = (): Engine =>
      createEngine({
        adapters: adapters(),
        stores: { journal },
        defaults: { routing: { loop: 'fake:model' } },
      });

    const first = make().run(gated, undefined, { runId: 'SCOPE-RESUME' });
    const segmentOne = await first.result;
    expect(segmentOne.status).toBe('suspended');
    await first.resolveExternal(segmentOne.pending[0]?.key ?? '', { decision: 'allow' });
    const segmentTwo = await make().resume('SCOPE-RESUME', gated).result;
    expect(segmentTwo.status).toBe('ok');

    // The claim, per declared field: a cumulative figure covers every
    // prior segment, so the later terminal can never carry LESS of it.
    const at = (root: unknown, path: string): unknown =>
      path
        .split('.')
        .reduce<unknown>(
          (value, key) => (value as Record<string, unknown> | undefined)?.[key],
          root,
        );
    // The one cumulative figure that is a RATIO of two cumulative
    // figures: "never shrinks" is not its claim (workers spending more
    // lowers the orchestrator's share while both totals grow), so it is
    // held to the identity it actually is.
    const RATIOS = new Set(['cost.orchestrator.share']);
    let checked = 0;
    for (const [path, scope] of Object.entries(TERMINAL_TELEMETRY_SCOPE)) {
      if (scope !== 'cumulative' || RATIOS.has(path)) {
        continue;
      }
      const after = at(segmentTwo, path);
      const before = at(segmentOne, path);
      if (typeof after !== 'number' || typeof before !== 'number') {
        continue;
      }
      checked += 1;
      expect([path, after >= before]).toEqual([path, true]);
    }
    expect(segmentTwo.cost.orchestrator.share).toBeCloseTo(
      segmentTwo.cost.orchestrator.spentUsd / Math.max(segmentTwo.cost.totalUsd, 0.01),
      12,
    );
    // Not a vacuous sweep: several figures were compared and the money
    // is real and grew.
    expect(checked).toBeGreaterThan(3);
    expect(segmentTwo.cost.totalUsd).toBeGreaterThan(segmentOne.cost.totalUsd);

    // And the other half of the taxonomy, which is what this gate
    // CORRECTED: every figure the outcome carries is folded from the
    // journal the resumed segment holds, so it covers the logical run
    // by construction. A segment-scoped figure can only be a live
    // counter that never reached the journal (the transport retries,
    // the schema-exchange counters), and none of those ride an
    // outcome. Three `cost.orchestrator.*` paths were declared
    // 'segment' and were folded cumulatively all along.
    for (const [path, scope] of Object.entries(TERMINAL_TELEMETRY_SCOPE)) {
      if (scope !== 'segment') {
        continue;
      }
      expect([path, at(segmentTwo, path)]).toEqual([path, undefined]);
    }
  });

  it('the orchestrator counters are the journal fold, so they cover the logical run (RV2801)', () => {
    // The mechanism behind the correction above, in one read: the
    // outcome's cost IS `costReportFromJournal(replayer.snapshot())`,
    // and a resumed segment's snapshot holds every prior segment. So a
    // wake suspension of the FIRST segment is still counted by the
    // terminal of the second, and 'segment' was never true of it.
    const wake = (seq: number): JournalEntry =>
      ({
        seq,
        kind: 'external',
        scope: '',
        key: `w${String(seq)}`,
        status: 'suspended',
        value: { key: 'wake:1' },
      }) as unknown as JournalEntry;
    const report = costReportFromJournal(
      [wake(1), settle(2, 'suspended'), settle(4, 'ok')],
      () => 0,
    );
    expect(report.orchestrator.wakes).toBe(1);
    expect(TERMINAL_TELEMETRY_SCOPE['cost.orchestrator.wakes']).toBe('cumulative');
    expect(TERMINAL_TELEMETRY_SCOPE['cost.orchestrator.forcedFinish']).toBe('cumulative');
    expect(TERMINAL_TELEMETRY_SCOPE['cost.orchestrator.reserveUsedUsd']).toBe('cumulative');
  });

  it('folds a real run, and every terminal field declares a scope', async () => {
    const journal = new InMemoryStore();
    const engine = makeEngine(journal);
    const outcome = await engine.run(wf, undefined, { runId: 'SCOPE-RUN' }).result;
    expect(outcome.status).toBe('ok');
    const loaded = await journal.load('SCOPE-RUN');
    const total = logicalRunTelemetry(loaded);
    expect(total.segments).toBe(1);
    expect(total.statuses).toEqual(['ok']);
    expect(total.entriesPerSegment).toEqual([loaded.length]);
    expect(total.entriesAfterLastSettle).toBe(0);
    // Half the gate: the keys a SUCCESSFUL outcome carries. The other
    // half is the type (RV2701): `TerminalTelemetryScopes` requires
    // every key of RunOutcome, so a new field does not compile until it
    // declares what it counts. This sample alone could not do that job,
    // because a field present only where a run DIED is absent from
    // every ok outcome by construction, which is how RV2602's
    // childrenAtFailure shipped undeclared; the failure-path half lives
    // in orchestrator/orchestrate.test.ts, beside the run that produces
    // it.
    const undeclared = Object.keys(outcome).filter(
      (key) => TERMINAL_TELEMETRY_SCOPE[key] === undefined,
    );
    expect(undeclared).toEqual([]);
  });
});

describe('the child roster a journal already holds (RV2702)', () => {
  // `childrenAtFailure` (RV2602) answers this for a live consumer and
  // dies with the process that held it. A paid run leaves a journal,
  // and every ingredient was already written down.
  const admission = (
    seq: number,
    childScope: string,
    verdict: 'admit' | 'reject' = 'admit',
  ): JournalEntry =>
    ({
      seq,
      kind: 'decision',
      scope: '',
      status: 'ok',
      value: {
        decisionType: 'spawn-admission',
        origin: 'spawn_agent',
        orchestratorScope: '',
        childScope,
        spawnOrdinal: seq,
        name: 'worker',
        decision: { verdict: { kind: verdict } },
      },
    }) as unknown as JournalEntry;
  const dispatch = (seq: number, scope: string, key: string): JournalEntry =>
    ({ seq, kind: 'agent', status: 'running', scope, key }) as unknown as JournalEntry;
  const terminal = (
    seq: number,
    scope: string,
    key: string,
    status: string,
    extra: Record<string, unknown> = {},
  ): JournalEntry =>
    ({
      seq,
      kind: 'agent',
      status,
      scope,
      key,
      ref: seq - 1,
      costAttribution: { agentType: 'worker', role: 'loop' },
      ...extra,
    }) as unknown as JournalEntry;

  it('names every admitted child, its status, and its evidence verdict', () => {
    const rosters = childRostersFromJournal([
      admission(2, 'agent:0'),
      dispatch(3, 'agent:0', 'k1'),
      admission(4, 'agent:0'),
      dispatch(5, 'agent:0', 'k2'),
      terminal(7, 'agent:0', 'k1', 'ok', {
        evidence: { recordedEntries: 0, minEntries: 2, met: false },
      }),
      terminal(10, 'agent:0', 'k2', 'error'),
    ]);
    expect(rosters).toHaveLength(1);
    const roster = rosters[0];
    if (roster === undefined) {
      throw new Error('the fold returned no roster');
    }
    expect(roster.childScope).toBe('agent:0');
    expect(roster.admitted).toBe(2);
    expect(roster.rejected).toBe(0);
    // Named by DISPATCH SEQ: the same number the orchestrator's own
    // turns used as the handle, which a reader can follow into the
    // transcript.
    expect(roster.children.map((child) => child.handle)).toEqual([3, 5]);
    expect(roster.children.map((child) => child.status)).toEqual(['ok', 'error']);
    // The silent worker of the fourth parity run: settled ok under a
    // declared contract it never met.
    expect(roster.children[0]?.evidence).toEqual({
      recordedEntries: 0,
      minEntries: 2,
      met: false,
    });
    expect(roster.children[0]?.agentType).toBe('worker');
  });

  it('a refused admission counts as refused and consumes no dispatch', () => {
    const rosters = childRostersFromJournal([
      admission(2, 'agent:0', 'reject'),
      admission(3, 'agent:0'),
      dispatch(4, 'agent:0', 'k1'),
      terminal(5, 'agent:0', 'k1', 'ok'),
    ]);
    expect(rosters[0]?.rejected).toBe(1);
    expect(rosters[0]?.admitted).toBe(1);
    expect(rosters[0]?.children).toHaveLength(1);
    expect(rosters[0]?.children[0]?.handle).toBe(4);
  });

  it('a child with no terminal reads as NOT SETTLED, never as a status', () => {
    // The journal ends mid-flight (a killed process, a run still
    // running). Absence is NOT RECORDED (RV1209), so the status is
    // missing rather than invented.
    const rosters = childRostersFromJournal([
      admission(2, 'agent:0'),
      dispatch(3, 'agent:0', 'k1'),
    ]);
    expect(rosters[0]?.children[0]?.status).toBeUndefined();
    expect(rosters[0]?.admitted).toBe(1);
  });

  it('a journal with no spawn admission folds to nothing at all', () => {
    // The vacuum contrast: a plain run has no roster, not an empty one.
    expect(childRostersFromJournal([running(1), suspendedExternal(2)])).toEqual([]);
  });

  it('separates two orchestrations by the scope their children ran under', () => {
    const rosters = childRostersFromJournal([
      admission(2, 'agent:0'),
      dispatch(3, 'agent:0', 'k1'),
      admission(4, 'agent:1/agent:0'),
      dispatch(5, 'agent:1/agent:0', 'k2'),
      terminal(6, 'agent:0', 'k1', 'ok'),
      terminal(7, 'agent:1/agent:0', 'k2', 'ok'),
    ]);
    expect(rosters.map((roster) => roster.childScope)).toEqual(['agent:0', 'agent:1/agent:0']);
    expect(rosters.every((roster) => roster.children.length === 1)).toBe(true);
  });

  it('marks the children the run ABANDONED, which it counted as kept work (RV2804)', () => {
    // The money layer has separated the two since RV1904: grossUsd keeps
    // abandoned spend, totalUsd does not. The roster presented a
    // discarded branch exactly like a kept one, so "two children settled
    // ok" counted work the orchestration threw away.
    const abandon = (seq: number, target: number): JournalEntry =>
      ({
        seq,
        kind: 'abandon',
        scope: '',
        status: 'ok',
        ref: target,
        abandon: { target, authorizedBy: seq - 1, reason: 'a better branch won' },
      }) as unknown as JournalEntry;
    const rosters = childRostersFromJournal([
      admission(2, 'agent:0'),
      dispatch(3, 'agent:0', 'k1'),
      admission(4, 'agent:0'),
      dispatch(5, 'agent:0', 'k2'),
      terminal(6, 'agent:0', 'k1', 'ok'),
      terminal(7, 'agent:0', 'k2', 'ok'),
      abandon(8, 3),
    ]);
    const children = rosters[0]?.children ?? [];
    expect(children.map((child) => [child.handle, child.status, child.abandoned])).toEqual([
      [3, 'ok', true],
      [5, 'ok', undefined],
    ]);
    // Still admitted, still settled: abandonment is what the run did
    // with the result, not a claim the child never ran.
    expect(rosters[0]?.admitted).toBe(2);
  });

  it('says nothing about abandonment when nothing was abandoned', () => {
    // The vacuum contrast, and the RV1209 posture: absence is a fact
    // here, so it must never be spelled as `abandoned: false`.
    const rosters = childRostersFromJournal([
      admission(2, 'agent:0'),
      dispatch(3, 'agent:0', 'k1'),
      terminal(6, 'agent:0', 'k1', 'ok'),
    ]);
    expect(rosters[0]?.children[0] && 'abandoned' in rosters[0].children[0]).toBe(false);
  });
});
