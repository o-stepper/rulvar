/**
 * The reconciler's kill points (plan 45, rfcs/effects.md section 8):
 * 18, 19, 20, 21, 22, 23 (the budget family), the pre-terminal half of
 * 10, and 25 (the post-restore reconciliation) plus the telemetry fold
 * of section 9. Zero live anything.
 */
import { describe, expect, it } from 'vitest';

import {
  CURRENT_HASH_VERSION,
  InMemoryStore,
  openEffectLane,
  type EffectLaneWriter,
  type JournalEntry,
} from '@rulvar/core';

import { EffectDispatcher } from './dispatcher.js';
import { EffectReconciler } from './reconciler.js';
import { effectsTelemetryOf } from './telemetry.js';
import { FakeEffectProvider } from './fakes.js';

const NOW = '2026-08-24T10:00:00.000Z';
const LATER = '2026-08-24T10:02:00.000Z';
const RUN = 'SWEEP-RUN';

const entry = (
  seq: number,
  rest: Partial<JournalEntry> & Pick<JournalEntry, 'kind' | 'status'>,
): JournalEntry => ({
  hashVersion: CURRENT_HASH_VERSION,
  seq,
  scope: 'run',
  key: `k${String(seq)}`,
  ordinal: 0,
  spanId: 's',
  startedAt: NOW,
  ...rest,
});

class RestorableMemoryStore extends InMemoryStore {
  readonly effectLane = true as const;
  generation = 0;

  async restorationGeneration(): Promise<number> {
    await Promise.resolve();
    return this.generation;
  }
}

interface Setup {
  store: InMemoryStore;
  writer: EffectLaneWriter;
  adapter: FakeEffectProvider;
  dispatcher: EffectDispatcher;
  reconciler: EffectReconciler;
  intentSeq: number;
}

async function setup(options: {
  row?: 'idempotency-key' | 'lookup' | 'neither';
  qualification?: 'acceptance-closing' | 'conditional-create';
  budgets?: Partial<{
    attempts: number;
    lookups: number;
    receiptWaitMs: number;
    reconcileBy: string;
  }>;
  now?: string;
  restorable?: boolean;
}): Promise<Setup> {
  const row = options.row ?? 'idempotency-key';
  const store = options.restorable === true ? new RestorableMemoryStore() : new InMemoryStore();
  await store.append(
    RUN,
    entry(0, {
      kind: 'approval',
      status: 'suspended',
      deadlineAt: '2026-08-24T12:00:00.000Z',
      value: { flavor: 'approval', toolName: 'payout', effectLogicalKey: 'pay-1' },
    }),
  );
  await store.append(
    RUN,
    entry(1, {
      kind: 'resolution',
      status: 'ok',
      ref: 0,
      resolution: { target: 0, by: 'external', value: { decision: 'allow' } },
    }),
  );
  const writer = await openEffectLane({ store, runId: RUN, singleProcess: true, now: () => NOW });
  await writer.ensureEpoch('gen-1');
  const consumed = await writer.consumeApprovalAndRecordIntent({
    opId: 'intent-1',
    logicalKey: 'pay-1',
    approvalRef: 0,
    effectClass: 'monetary',
    capabilityRow: row,
    ...(options.qualification === undefined ? {} : { lookupQualification: options.qualification }),
    argumentsHash: 'deadbeef',
    budgets: {
      attempts: 3,
      lookups: 5,
      receiptWaitMs: 60_000,
      reconcileBy: '2026-08-25T00:00:00.000Z',
      ...options.budgets,
    },
  });
  const adapter = new FakeEffectProvider({
    provider: 'fake',
    capabilityRow: row,
    ...(options.qualification === undefined ? {} : { lookupQualification: options.qualification }),
  });
  const now = (): string => options.now ?? NOW;
  const dispatcher = new EffectDispatcher({
    writer,
    adapter,
    runId: RUN,
    verifyReceipt: () => 'verified',
    now,
  });
  const reconciler = new EffectReconciler({ writer, dispatcher, now });
  return { store, writer, adapter, dispatcher, reconciler, intentSeq: consumed.intentSeq };
}

describe('the budget family (kill points 18 to 23)', () => {
  it('kill 18: attempts exhausted quarantines, never loops', async () => {
    const s = await setup({ budgets: { attempts: 1 } });
    s.adapter.nextBehavior = 'fail';
    const first = await s.dispatcher.dispatch(s.intentSeq);
    expect(first.kind).toBe('failed');
    const report = await s.reconciler.sweep();
    expect(report.quarantined).toHaveLength(1);
    expect(report.quarantined[0]?.reason).toContain('attempt budget');
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(machine?.state).toBe('quarantined');
    // The next sweep touches nothing: the machine is closed.
    const second = await s.reconciler.sweep();
    expect(second.swept).toBe(0);
  });

  it('kill 19: the lookup budget is bounded separately and its exhaustion quarantines', async () => {
    const s = await setup({
      row: 'lookup',
      qualification: 'conditional-create',
      budgets: { lookups: 0 },
    });
    s.adapter.nextBehavior = 'drop-unknown';
    const first = await s.dispatcher.dispatch(s.intentSeq);
    expect(first.kind).toBe('unknown');
    const report = await s.reconciler.sweep();
    expect(report.quarantined).toHaveLength(1);
    expect(report.quarantined[0]?.reason).toContain('lookup budget');
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(machine?.state).toBe('quarantined');
  });

  it('journaled probes consume the lookup budget durably', async () => {
    const s = await setup({
      row: 'lookup',
      qualification: 'conditional-create',
      budgets: { lookups: 2 },
    });
    s.adapter.nextBehavior = 'drop-unknown';
    await s.dispatcher.dispatch(s.intentSeq);
    const recovery = await s.dispatcher.recover(s.intentSeq);
    expect(recovery.kind).toBe('redispatched');
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(machine?.probes).toHaveLength(1);
    expect(machine?.probes[0]).toMatchObject({ probe: 'lookup', found: false });
    expect(machine?.state).toBe('confirmed');
  });

  it('kill 20: awaiting-receipt past the receipt wait budget quarantines', async () => {
    const s = await setup({ budgets: { receiptWaitMs: 1_000 }, now: LATER });
    s.adapter.nextBehavior = 'accept-no-receipt';
    // Dispatch at NOW (the dispatcher pins its own clock per test).
    const early = new EffectDispatcher({
      writer: s.writer,
      adapter: s.adapter,
      runId: RUN,
      verifyReceipt: () => 'verified',
      now: () => NOW,
    });
    const first = await early.dispatch(s.intentSeq);
    expect(first.kind).toBe('accepted-awaiting-receipt');
    // The sweep runs two minutes later, without a lookup-capable
    // dispatcher: the wait exhausted.
    const reconciler = new EffectReconciler({ writer: s.writer, now: () => LATER });
    const report = await reconciler.sweep();
    expect(report.quarantined).toHaveLength(1);
    expect(report.quarantined[0]?.reason).toContain('no verifiable receipt');
  });

  it('a receipt still inside its wait budget reports waiting, not quarantine', async () => {
    const s = await setup({ budgets: { receiptWaitMs: 3_600_000 } });
    s.adapter.nextBehavior = 'accept-no-receipt';
    await s.dispatcher.dispatch(s.intentSeq);
    const reconciler = new EffectReconciler({ writer: s.writer, now: () => LATER });
    const report = await reconciler.sweep();
    expect(report.quarantined).toHaveLength(0);
    expect(report.waiting).toBe(1);
  });

  it('kill 21: crossing reconcileBy quarantines whatever state, with the state recorded', async () => {
    const s = await setup({ budgets: { reconcileBy: '2026-08-24T10:01:00.000Z' }, now: LATER });
    s.adapter.nextBehavior = 'accept-no-receipt';
    const early = new EffectDispatcher({
      writer: s.writer,
      adapter: s.adapter,
      runId: RUN,
      verifyReceipt: () => 'verified',
      now: () => NOW,
    });
    await early.dispatch(s.intentSeq);
    const report = await s.reconciler.sweep();
    expect(report.quarantined).toHaveLength(1);
    expect(report.quarantined[0]?.reason).toContain("state 'awaiting-receipt'");
  });

  it('kill 22: an effect authorization past its deadline refuses durably, once', async () => {
    const s = await setup({ now: LATER });
    await s.store.append(
      RUN,
      entry(200, {
        kind: 'approval',
        status: 'suspended',
        deadlineAt: '2026-08-24T10:01:00.000Z',
        value: {
          flavor: 'approval',
          toolName: 'refund',
          effectLogicalKey: 'pay-1-reverse',
        },
      }),
    );
    const report = await s.reconciler.sweep();
    expect(report.authorizationTimeouts).toBe(1);
    expect((await s.writer.refresh()).standaloneRefusals()).toEqual([
      expect.objectContaining({ logicalKey: 'pay-1-reverse' }),
    ]);
    // Idempotent: the second sweep replays the same refusal row.
    const second = await s.reconciler.sweep();
    expect(second.authorizationTimeouts).toBe(0);
    expect((await s.writer.refresh()).standaloneRefusals()).toHaveLength(1);
  });

  it('kill 10, the pre-terminal half: a conflicting duplicate quarantines the intent', async () => {
    const s = await setup({});
    s.adapter.nextBehavior = 'accept-no-receipt';
    await s.dispatcher.dispatch(s.intentSeq);
    await s.writer.appendReceipt(s.intentSeq, {
      opId: 'r1',
      verification: 'verified',
      transferId: 't-1',
      amount: 100,
    });
    await s.writer.appendReceipt(s.intentSeq, {
      opId: 'r2',
      verification: 'verified',
      transferId: 't-OTHER',
      amount: 250,
    });
    const report = await s.reconciler.sweep();
    expect(report.quarantined).toHaveLength(1);
    expect(report.quarantined[0]?.reason).toContain('conflicting duplicate');
  });
});

describe('kill point 25: the post-restore reconciliation', () => {
  it('the restored epoch stays undispatchable until the completion decision', async () => {
    const s = await setup({ restorable: true });
    await s.dispatcher.dispatch(s.intentSeq);
    (s.store as RestorableMemoryStore).generation = 1;
    await expect(
      s.writer.consumeApprovalAndRecordIntent({
        opId: 'intent-2',
        logicalKey: 'pay-1',
        approvalRef: 0,
        effectClass: 'monetary',
        capabilityRow: 'idempotency-key',
        argumentsHash: 'deadbeef',
        budgets: {
          attempts: 3,
          lookups: 5,
          receiptWaitMs: 60_000,
          reconcileBy: '2026-08-25T00:00:00.000Z',
        },
      }),
    ).rejects.toMatchObject({ rule: 'restoration-generation-stale' });
    await s.writer.ensureEpoch('gen-1');
    // Intents may consume in the fresh epoch, but DISPATCH stays
    // disabled until reconciliation completes.
    await s.store.append(
      RUN,
      entry(300, {
        kind: 'approval',
        status: 'suspended',
        deadlineAt: '2026-08-24T12:00:00.000Z',
        value: { flavor: 'approval', toolName: 'payout', effectLogicalKey: 'pay-2' },
      }),
    );
    await s.store.append(
      RUN,
      entry(301, {
        kind: 'resolution',
        status: 'ok',
        ref: 300,
        resolution: { target: 300, by: 'external', value: { decision: 'allow' } },
      }),
    );
    const consumed = await s.writer.consumeApprovalAndRecordIntent({
      opId: 'intent-pay-2',
      logicalKey: 'pay-2',
      approvalRef: 300,
      effectClass: 'monetary',
      capabilityRow: 'idempotency-key',
      argumentsHash: 'feedface',
      budgets: {
        attempts: 3,
        lookups: 5,
        receiptWaitMs: 60_000,
        reconcileBy: '2026-08-25T00:00:00.000Z',
      },
    });
    await expect(s.dispatcher.dispatch(consumed.intentSeq)).rejects.toMatchObject({
      rule: 'reconciliation-pending',
    });
    // The enumeration-capable arm: a provider effect with no journaled
    // intent quarantines standalone by name.
    const restoration = await s.reconciler.reconcileRestoration({
      enumerate: async () =>
        Promise.resolve([{ logicalKey: 'pay-1' }, { logicalKey: 'ghost-payment' }]),
    });
    expect(restoration.unreconstructable).toEqual(['ghost-payment']);
    expect(restoration.rangeQuarantined).toBe(false);
    const fold = await s.writer.refresh();
    expect(fold.standaloneQuarantines()).toEqual([
      expect.objectContaining({ logicalKey: 'ghost-payment' }),
    ]);
    expect(fold.currentEpoch()?.reconciled).toBe(true);
    // Dispatch re-enables and the fresh intent confirms.
    const report = await s.dispatcher.dispatch(consumed.intentSeq);
    expect(report.kind).toBe('confirmed');
  });

  it('without authoritative enumeration the whole range quarantines', async () => {
    const s = await setup({ restorable: true });
    (s.store as RestorableMemoryStore).generation = 1;
    await s.writer.ensureEpoch('gen-1');
    const restoration = await s.reconciler.reconcileRestoration();
    expect(restoration.rangeQuarantined).toBe(true);
    const fold = await s.writer.refresh();
    expect(fold.standaloneQuarantines()[0]?.reason).toContain('no authoritative enumeration');
    expect(fold.currentEpoch()?.reconciled).toBe(true);
  });
});

describe('effects telemetry (RFC section 9)', () => {
  it('counts effective dispositions, pressure, duplicates, and open incidents', async () => {
    const s = await setup({});
    await s.dispatcher.dispatch(s.intentSeq);
    await s.writer.appendIncident(s.intentSeq, {
      opId: 'inc-1',
      incident: 'conflicting-duplicate',
      causalRef: 1,
    });
    const fold = await s.writer.refresh();
    const telemetry = effectsTelemetryOf(fold, { nowMs: Date.parse(LATER) });
    expect(telemetry).toMatchObject({
      openEffectIntents: 0,
      confirmed: 1,
      quarantined: 0,
      incidentsOpen: 1,
      unknownEntered: 0,
    });
    expect(telemetry.oldestOpenIntentAgeMs).toBeUndefined();
  });

  it('ages the oldest open intent only when a clock is supplied', async () => {
    const s = await setup({});
    const fold = await s.writer.refresh();
    const silent = effectsTelemetryOf(fold);
    expect(silent.openEffectIntents).toBe(1);
    expect(silent.oldestOpenIntentAgeMs).toBeUndefined();
    const timed = effectsTelemetryOf(fold, { nowMs: Date.parse(LATER) });
    expect(timed.oldestOpenIntentAgeMs).toBe(120_000);
  });
});
