/**
 * The dispatcher's kill points (plan 45, rfcs/effects.md section 8):
 * 4, 5, 6, 7, 8, 14, 15, 17, 27, 28, 29 over the real fold, the real
 * writer, and the provider fakes whose fencing is exactly what the
 * capability row claims. Zero live anything; the journal is an
 * in-memory store under explicitly single-process semantics.
 */
import { describe, expect, it } from 'vitest';

import {
  CURRENT_HASH_VERSION,
  InMemoryStore,
  openEffectLane,
  type EffectLaneWriter,
  type EffectLookupQualification,
  type JournalEntry,
  type Json,
} from '@rulvar/core';

import { EffectDispatcher } from './dispatcher.js';
import { effectIdempotencyKey } from './adapter.js';
import { FakeEffectProvider } from './fakes.js';

const NOW = '2026-08-24T10:00:00.000Z';
const RUN = 'EFFECT-RUN';
const BUDGETS = {
  attempts: 5,
  lookups: 5,
  receiptWaitMs: 60_000,
  reconcileBy: '2026-08-25T00:00:00.000Z',
};

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

interface Setup {
  store: InMemoryStore;
  writer: EffectLaneWriter;
  adapter: FakeEffectProvider;
  dispatcher: EffectDispatcher;
  intentSeq: number;
}

async function setup(
  row: 'idempotency-key' | 'lookup' | 'neither',
  qualification?: EffectLookupQualification,
): Promise<Setup> {
  const store = new InMemoryStore();
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
  const writer = await openEffectLane({
    store,
    runId: RUN,
    singleProcess: true,
    now: () => NOW,
  });
  await writer.ensureEpoch('gen-1');
  const consumed = await writer.consumeApprovalAndRecordIntent({
    opId: 'intent-1',
    logicalKey: 'pay-1',
    approvalRef: 0,
    effectClass: 'monetary',
    capabilityRow: row,
    ...(qualification === undefined ? {} : { lookupQualification: qualification }),
    argumentsHash: 'deadbeef',
    budgets: BUDGETS,
  });
  const adapter = new FakeEffectProvider({
    provider: 'fake',
    capabilityRow: row,
    ...(qualification === undefined ? {} : { lookupQualification: qualification }),
  });
  const dispatcher = new EffectDispatcher({
    writer,
    adapter,
    runId: RUN,
    verifyReceipt: () => 'verified',
    now: () => NOW,
  });
  return { store, writer, adapter, dispatcher, intentSeq: consumed.intentSeq };
}

async function appendDecision(store: InMemoryStore, value: Record<string, unknown>): Promise<void> {
  const entries = await store.load(RUN);
  const seq = entries.reduce((max, e) => Math.max(max, e.seq), -1) + 1;
  await store.append(RUN, entry(seq, { kind: 'decision', status: 'ok', value: value as Json }));
}

const revoke = (store: InMemoryStore): Promise<void> =>
  appendDecision(store, {
    decisionType: 'approval_revoked',
    targetRef: 0,
    principal: 'security',
    reason: 'stop payment',
  });

const expire = (store: InMemoryStore): Promise<void> =>
  appendDecision(store, {
    decisionType: 'approval_expired',
    targetRef: 0,
    expiresAt: '2026-08-24T09:30:00.000Z',
  });

/** A crash after the attempt append, before the send (kill 4 shape). */
async function crashAfterAttemptAppend(s: Setup): Promise<number> {
  const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
  const opened = await s.writer.openAttempt(s.intentSeq, {
    opId: `crash-attempt:${String((machine?.attempts.length ?? 0) + 1)}`,
    notAfter: '2026-08-24T10:05:00.000Z',
    ...(s.adapter.descriptor.capabilityRow === 'idempotency-key' && machine !== undefined
      ? { idempotencyKey: effectIdempotencyKey(machine) }
      : {}),
  });
  if (opened.cancelled) {
    throw new Error('unexpected cancel in crash setup');
  }
  return opened.attemptSeq;
}

describe('the normal dispatch path', () => {
  it('opens the attempt before the send, confirms on the verified receipt', async () => {
    const s = await setup('idempotency-key');
    const report = await s.dispatcher.dispatch(s.intentSeq);
    expect(report.kind).toBe('confirmed');
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(machine?.state).toBe('confirmed');
    expect(machine?.attempts).toHaveLength(1);
    expect(s.adapter.effectCount('pay-1')).toBe(1);
    // The attempt record precedes the send: the attempt seq the
    // adapter saw is a journal row BELOW the receipt row.
    expect(machine?.attempts[0]?.seq).toBeLessThan(machine?.receipts[0]?.seq ?? -1);
  });

  it('kill 14: a revocation between intent and first attempt cancels, no compensation opened', async () => {
    const s = await setup('idempotency-key');
    await revoke(s.store);
    const report = await s.dispatcher.dispatch(s.intentSeq);
    expect(report.kind).toBe('cancelled');
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(machine?.state).toBe('cancelled-before-dispatch');
    expect(machine?.incidents).toHaveLength(0);
    expect(s.adapter.dispatches).toBe(0);
  });
});

describe('kill points 4, 5, 8: the ambiguous window per row', () => {
  it('idempotency-key: re-dispatch under the same key, the provider dedupes to one effect', async () => {
    const s = await setup('idempotency-key');
    await crashAfterAttemptAppend(s);
    const report = await s.dispatcher.recover(s.intentSeq);
    expect(report.kind).toBe('redispatched');
    expect(report.kind === 'redispatched' && report.report.kind).toBe('confirmed');
    expect(s.adapter.effectCount('pay-1')).toBe(1);
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    // The crash attempt closed unknown; the recovery attempt confirmed.
    expect(machine?.attempts.map((a) => a.outcome)).toEqual(['unknown', 'accepted']);
  });

  it('kill 8: accepted-but-timeout recovers through the same fence to exactly one effect', async () => {
    const s = await setup('idempotency-key');
    s.adapter.nextBehavior = 'accept-timeout';
    const first = await s.dispatcher.dispatch(s.intentSeq);
    expect(first.kind).toBe('unknown');
    const report = await s.dispatcher.recover(s.intentSeq);
    expect(report.kind).toBe('redispatched');
    expect(report.kind === 'redispatched' && report.report.kind).toBe('confirmed');
    expect(s.adapter.effectCount('pay-1')).toBe(1);
  });

  it('acceptance-closing lookup: the closure licenses the fresh attempt', async () => {
    const s = await setup('lookup', 'acceptance-closing');
    await crashAfterAttemptAppend(s);
    const report = await s.dispatcher.recover(s.intentSeq);
    expect(report.kind).toBe('redispatched');
    expect(report.kind === 'redispatched' && report.report.kind).toBe('confirmed');
    expect(s.adapter.effectCount('pay-1')).toBe(1);
    expect(s.adapter.lookups).toBe(1);
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(machine?.attempts.map((a) => a.outcome)).toEqual(['failed', 'accepted']);
  });

  it('kill 6: a send that DID land is found, never re-executed', async () => {
    const s = await setup('lookup', 'acceptance-closing');
    const attemptSeq = await crashAfterAttemptAppend(s);
    // The send left before the crash: the provider holds the effect.
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    if (machine === undefined) {
      throw new Error('machine must exist');
    }
    await s.adapter.dispatch({
      runId: RUN,
      intent: machine,
      attemptSeq,
      ordinal: 1,
      notAfter: '2026-08-24T10:05:00.000Z',
    });
    const dispatchesAfterSend = s.adapter.dispatches;
    const report = await s.dispatcher.recover(s.intentSeq);
    expect(report.kind).toBe('confirmed');
    expect(s.adapter.effectCount('pay-1')).toBe(1);
    expect(s.adapter.dispatches).toBe(dispatchesAfterSend);
    const after = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(after?.state).toBe('confirmed');
    expect(after?.attempts[0]?.outcome).toBe('accepted');
  });

  it('neither: the ambiguous window quarantines and names the stale send hazard', async () => {
    const s = await setup('neither');
    await crashAfterAttemptAppend(s);
    const report = await s.dispatcher.recover(s.intentSeq);
    expect(report.kind).toBe('quarantined');
    expect(report.kind === 'quarantined' && report.reason).toContain('stale send');
    expect(s.adapter.dispatches).toBe(0);
    expect(s.adapter.effectCount('pay-1')).toBe(0);
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(machine?.state).toBe('quarantined');
  });
});

describe('kill point 7: a terminal is never re-contacted', () => {
  it('recover after confirmed is a no-op with zero provider calls', async () => {
    const s = await setup('idempotency-key');
    await s.dispatcher.dispatch(s.intentSeq);
    const dispatches = s.adapter.dispatches;
    const lookups = s.adapter.lookups;
    const report = await s.dispatcher.recover(s.intentSeq);
    expect(report.kind).toBe('noop');
    expect(s.adapter.dispatches).toBe(dispatches);
    expect(s.adapter.lookups).toBe(lookups);
  });
});

describe('kill point 17: the deliberately stalled predecessor', () => {
  it('idempotency-key: the late send dedupes against the recovery; one effect', async () => {
    const s = await setup('idempotency-key');
    s.adapter.stallNextSend = true;
    const first = await s.dispatcher.dispatch(s.intentSeq);
    expect(first.kind).toBe('unknown');
    const recovered = await s.dispatcher.recover(s.intentSeq);
    expect(recovered.kind).toBe('redispatched');
    expect(s.adapter.effectCount('pay-1')).toBe(1);
    s.adapter.releaseStalled();
    expect(s.adapter.effectCount('pay-1')).toBe(1);
    expect(s.adapter.lateFenced).toBe(1);
    expect(s.adapter.lateLandings).toBe(0);
  });

  it('acceptance-closing: the successor closed the stalled attempt; late bytes are unacceptable', async () => {
    const s = await setup('lookup', 'acceptance-closing');
    s.adapter.stallNextSend = true;
    const first = await s.dispatcher.dispatch(s.intentSeq);
    expect(first.kind).toBe('unknown');
    const recovered = await s.dispatcher.recover(s.intentSeq);
    expect(recovered.kind).toBe('redispatched');
    expect(s.adapter.effectCount('pay-1')).toBe(1);
    s.adapter.releaseStalled();
    expect(s.adapter.effectCount('pay-1')).toBe(1);
    expect(s.adapter.lateFenced).toBe(1);
  });

  it('neither: the machine is quarantined and the late effect LANDS, visibly', async () => {
    const s = await setup('neither');
    s.adapter.stallNextSend = true;
    const first = await s.dispatcher.dispatch(s.intentSeq);
    expect(first.kind).toBe('unknown');
    const recovered = await s.dispatcher.recover(s.intentSeq);
    expect(recovered.kind).toBe('quarantined');
    s.adapter.releaseStalled();
    // Elapsed time licensed nothing: the effect landed ANYWAY, which
    // is exactly why the quarantine record names the hazard and the
    // reconciliation sweep reports it against the quarantine.
    expect(s.adapter.lateLandings).toBe(1);
    expect(s.adapter.effectCount('pay-1')).toBe(1);
  });
});

describe('kill points 27, 28, 29: closers over live windows', () => {
  it('kill 27: revoked during an open attempt never re-dispatches on ANY row', async () => {
    const s = await setup('idempotency-key');
    await crashAfterAttemptAppend(s);
    await revoke(s.store);
    const dispatches = s.adapter.dispatches;
    const report = await s.dispatcher.recover(s.intentSeq);
    // Nothing at the provider, nothing closable: quarantine with the
    // revocation on the record; and NO dispatch happened.
    expect(report.kind).toBe('quarantined');
    expect(s.adapter.dispatches).toBe(dispatches);
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(machine?.state).toBe('quarantined');
  });

  it('kill 27, the executed arm: a found receipt confirms and opens the compensation path', async () => {
    const s = await setup('idempotency-key');
    const attemptSeq = await crashAfterAttemptAppend(s);
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    if (machine === undefined) {
      throw new Error('machine must exist');
    }
    await s.adapter.dispatch({
      runId: RUN,
      intent: machine,
      attemptSeq,
      ordinal: 1,
      idempotencyKey: effectIdempotencyKey(machine),
      notAfter: '2026-08-24T10:05:00.000Z',
    });
    await revoke(s.store);
    const dispatches = s.adapter.dispatches;
    const report = await s.dispatcher.recover(s.intentSeq);
    expect(report.kind).toBe('confirmed');
    expect(s.adapter.dispatches).toBe(dispatches);
    const after = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(after?.state).toBe('confirmed');
    expect(after?.incidents).toEqual([
      expect.objectContaining({ incident: 'revocation-after-confirmation' }),
    ]);
  });

  it('kill 28: expiry over an executed window confirms WITHOUT a compensation path', async () => {
    const s = await setup('idempotency-key');
    const attemptSeq = await crashAfterAttemptAppend(s);
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    if (machine === undefined) {
      throw new Error('machine must exist');
    }
    await s.adapter.dispatch({
      runId: RUN,
      intent: machine,
      attemptSeq,
      ordinal: 1,
      idempotencyKey: effectIdempotencyKey(machine),
      notAfter: '2026-08-24T10:05:00.000Z',
    });
    await expire(s.store);
    const report = await s.dispatcher.recover(s.intentSeq);
    expect(report.kind).toBe('confirmed');
    const after = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(after?.state).toBe('confirmed');
    expect(after?.incidents).toHaveLength(0);
  });

  it('kill 29: revoked while awaiting the receipt; the receipt confirms plus the incident', async () => {
    const s = await setup('idempotency-key');
    s.adapter.nextBehavior = 'accept-no-receipt';
    const first = await s.dispatcher.dispatch(s.intentSeq);
    expect(first.kind).toBe('accepted-awaiting-receipt');
    await revoke(s.store);
    const report = await s.dispatcher.recover(s.intentSeq);
    expect(report.kind).toBe('confirmed');
    const after = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(after?.state).toBe('confirmed');
    expect(after?.incidents).toEqual([
      expect.objectContaining({ incident: 'revocation-after-confirmation' }),
    ]);
  });

  it('kill 27, the closed-negative arm: cancel with the proof on the record', async () => {
    const s = await setup('lookup', 'acceptance-closing');
    await crashAfterAttemptAppend(s);
    await revoke(s.store);
    const report = await s.dispatcher.recover(s.intentSeq);
    expect(report.kind).toBe('cancelled');
    const after = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(after?.state).toBe('cancelled-before-dispatch');
    expect(after?.attempts.map((a) => a.outcome)).toEqual(['failed']);
  });
});

describe('kill 15 at the dispatcher level: revocation after confirmation', () => {
  it('the terminal stands; the revocation needs only its incident, appended by the operator flow', async () => {
    const s = await setup('idempotency-key');
    await s.dispatcher.dispatch(s.intentSeq);
    await revoke(s.store);
    const report = await s.dispatcher.recover(s.intentSeq);
    expect(report.kind).toBe('noop');
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(machine?.state).toBe('confirmed');
    expect(machine?.postIntentCloser?.kind).toBe('revoked');
  });
});

describe('the fake fences are exactly what the rows claim', () => {
  it('the neither fake commits every send as its own effect, no implicit dedup', async () => {
    const s = await setup('neither');
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    if (machine === undefined) {
      throw new Error('machine must exist');
    }
    await s.adapter.dispatch({
      runId: RUN,
      intent: machine,
      attemptSeq: 100,
      ordinal: 1,
      notAfter: '2026-08-24T10:05:00.000Z',
    });
    await s.adapter.dispatch({
      runId: RUN,
      intent: machine,
      attemptSeq: 101,
      ordinal: 2,
      notAfter: '2026-08-24T10:05:00.000Z',
    });
    // Two blind sends of one logical effect are TWO provider effects:
    // the row offers no fence, and the fake must not invent one.
    expect(s.adapter.effectCount('pay-1')).toBe(2);
  });
});

describe('receipts fail closed at the seam', () => {
  it('an unverified receipt routes to unknown, never to confirmed', async () => {
    const s = await setup('idempotency-key');
    const strict = new EffectDispatcher({
      writer: s.writer,
      adapter: s.adapter,
      runId: RUN,
      verifyReceipt: () => 'unverified',
      now: () => NOW,
    });
    const report = await strict.dispatch(s.intentSeq);
    expect(report.kind).toBe('receipt-unverified');
    const machine = (await s.writer.refresh()).machineAt(s.intentSeq);
    expect(machine?.state).toBe('unknown');
    expect(machine?.terminal).toBeUndefined();
  });
});
