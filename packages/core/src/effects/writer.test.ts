/**
 * EffectLaneWriter (plan 45): the append surface under the universal
 * contention rule. The fake store here enforces exactly the contract
 * the lane leans on: A5 uniqueness per (runId, seq), lease fencing on
 * every mutation, and injectable ack loss, so kill points 1, 2, 3, 16,
 * and 30 run against the real recovery code, zero live anything.
 */
import { describe, expect, it } from 'vitest';

import type { Json } from '../l0/json.js';
import { CURRENT_HASH_VERSION, type JournalEntry } from '../l0/entries.js';
import { EffectLaneRefusedError, JournalOrderViolation, LeaseHeldError } from '../l0/errors.js';
import { ConfigError } from '../l0/errors.js';
import type { Lease, RunFilter, RunMeta } from '../l0/spi/store.js';
import type { TerminalEnvelope } from '../l0/terminal-envelope.js';
import { semanticTerminalVerdictOf } from '../orchestrator/semantic-verdict.js';
import { effectLaneAdmissible } from './admissible.js';
import { openEffectLane } from './writer.js';
import type { EffectIntentSpec } from './writer.js';
import type { EffectBudgets } from './types.js';

const NOW = '2026-08-24T10:00:00.000Z';
const BUDGETS: EffectBudgets = {
  attempts: 3,
  lookups: 5,
  receiptWaitMs: 60_000,
  reconcileBy: '2026-08-25T00:00:00.000Z',
};

/** The lane's store contract, enforced for real: A5, fences, ack loss. */
class FakeLaneStore {
  readonly fencedWrites = true as const;
  readonly effectLane = true as const;
  entries: JournalEntry[] = [];
  generation = 0;
  private leaseEpoch = 0;
  private current?: Lease;
  /** Commit the next append and then throw (the lost ack). */
  loseNextAck = false;
  /** One-shot hook to interleave a foreign append at the same seq. */
  beforeAppend?: (e: JournalEntry) => void;

  async append(runId: string, e: JournalEntry, lease?: Lease): Promise<void> {
    this.checkLease(lease);
    this.beforeAppend?.(e);
    this.beforeAppend = undefined;
    if (this.entries.some((x) => x.seq === e.seq)) {
      throw new JournalOrderViolation(`duplicate seq ${String(e.seq)} for run ${runId}`);
    }
    this.entries.push(e);
    if (this.loseNextAck) {
      this.loseNextAck = false;
      throw new Error('the ack was lost after the commit');
    }
    await Promise.resolve();
  }

  /** A test-side append that bypasses the lease (a foreign authority). */
  seed(e: JournalEntry): void {
    if (this.entries.some((x) => x.seq === e.seq)) {
      throw new JournalOrderViolation(`duplicate seq ${String(e.seq)}`);
    }
    this.entries.push(e);
  }

  private checkLease(lease?: Lease): void {
    if (this.current === undefined) {
      return;
    }
    if (
      lease === undefined ||
      lease.epoch !== this.current.epoch ||
      lease.owner !== this.current.owner
    ) {
      throw new LeaseHeldError('the lane append carries a superseded or absent lease');
    }
  }

  async load(): Promise<JournalEntry[]> {
    await Promise.resolve();
    return [...this.entries].sort((a, b) => a.seq - b.seq);
  }

  async putMeta(_m: RunMeta): Promise<void> {
    await Promise.resolve();
  }

  async listRuns(_f?: RunFilter): Promise<RunMeta[]> {
    await Promise.resolve();
    return [];
  }

  async delete(): Promise<void> {
    await Promise.resolve();
  }

  async acquire(runId: string, owner: string): Promise<Lease> {
    await Promise.resolve();
    this.leaseEpoch += 1;
    this.current = { runId, owner, epoch: this.leaseEpoch };
    return this.current;
  }

  async renew(): Promise<void> {
    await Promise.resolve();
  }

  async release(l: Lease): Promise<void> {
    await Promise.resolve();
    if (this.current?.epoch === l.epoch) {
      this.current = undefined;
    }
  }

  async restorationGeneration(): Promise<number> {
    await Promise.resolve();
    return this.generation;
  }
}

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

const approvalEntry = (seq: number, licensedKey: string, deadline = true): JournalEntry =>
  entry(seq, {
    kind: 'approval',
    status: 'suspended',
    ...(deadline ? { deadlineAt: '2026-08-24T12:00:00.000Z' } : {}),
    value: { flavor: 'approval', toolName: 'payout', effectLogicalKey: licensedKey },
  });

const allowEntry = (
  seq: number,
  target: number,
  value: Record<string, unknown> = { decision: 'allow' },
): JournalEntry =>
  entry(seq, {
    kind: 'resolution',
    status: 'ok',
    ref: target,
    resolution: { target, by: 'external', value: value as Json },
  });

const spec = (overrides: Partial<EffectIntentSpec> = {}): EffectIntentSpec => ({
  opId: 'op-intent-1',
  logicalKey: 'pay-1',
  approvalRef: 0,
  effectClass: 'monetary',
  capabilityRow: 'idempotency-key',
  argumentsHash: 'deadbeef',
  budgets: BUDGETS,
  ...overrides,
});

/** approval 0 licensed, allow 1: the consumable base journal. */
const seedBase = (store: FakeLaneStore, licensedKey = 'pay-1'): void => {
  store.seed(approvalEntry(0, licensedKey));
  store.seed(allowEntry(1, 0));
};

const openWriter = async (
  store: FakeLaneStore,
  overrides: { owner?: string; now?: () => string } = {},
): Promise<Awaited<ReturnType<typeof openEffectLane>>> =>
  openEffectLane({
    store,
    runId: 'RUN',
    owner: overrides.owner ?? 'holder-1',
    now: overrides.now ?? ((): string => NOW),
  });

describe('EffectLaneWriter construction', () => {
  it('refuses a store without leases or without fencedWrites in production mode', async () => {
    const bare = {
      append: async (): Promise<void> => Promise.resolve(),
      load: async (): Promise<JournalEntry[]> => Promise.resolve([]),
      putMeta: async (): Promise<void> => Promise.resolve(),
      listRuns: async (): Promise<RunMeta[]> => Promise.resolve([]),
      delete: async (): Promise<void> => Promise.resolve(),
    };
    await expect(openEffectLane({ store: bare, runId: 'RUN' })).rejects.toThrow(ConfigError);
    const unfenced = Object.assign(Object.create(new FakeLaneStore()) as FakeLaneStore, {});
    Object.defineProperty(unfenced, 'fencedWrites', { value: undefined });
    await expect(openEffectLane({ store: unfenced, runId: 'RUN' })).rejects.toThrow(ConfigError);
    // The same bare store is admissible under explicitly single-process
    // semantics, the in-memory conformance posture.
    const single = await openEffectLane({ store: bare, runId: 'RUN', singleProcess: true });
    await single.close();
  });
});

describe('consumeApprovalAndRecordIntent (RFC section 4.3)', () => {
  it('consumes as one append and returns the live machine', async () => {
    const store = new FakeLaneStore();
    seedBase(store);
    const writer = await openWriter(store);
    await writer.ensureEpoch('gen-1');
    const result = await writer.consumeApprovalAndRecordIntent(spec());
    expect(result.replayed).toBe(false);
    expect(result.machine.consumed).toBe(true);
    expect(result.machine.state).toBe('intent');
    // Kill 1 shape: before the intent append there was no journal
    // trace; after it there is exactly one intent.
    const intents = store.entries.filter(
      (e) => (e.value as { decisionType?: string } | undefined)?.decisionType === 'effect_intent',
    );
    expect(intents).toHaveLength(1);
    await writer.close();
  });

  it('kill 2: a committed append with a lost ack recovers by its own opId with no duplicate row', async () => {
    const store = new FakeLaneStore();
    seedBase(store);
    const writer = await openWriter(store);
    await writer.ensureEpoch('gen-1');
    store.loseNextAck = true;
    const result = await writer.consumeApprovalAndRecordIntent(spec());
    expect(result.machine.consumed).toBe(true);
    const intents = store.entries.filter(
      (e) => (e.value as { decisionType?: string } | undefined)?.decisionType === 'effect_intent',
    );
    expect(intents).toHaveLength(1);
    // A second call with the same opId is the recovery read: same
    // intent, flagged replayed.
    const again = await writer.consumeApprovalAndRecordIntent(spec());
    expect(again.replayed).toBe(true);
    expect(again.intentSeq).toBe(result.intentSeq);
    await writer.close();
  });

  it('a contention loser re-verdicts at the new tail and lands when its verdict holds', async () => {
    const store = new FakeLaneStore();
    seedBase(store);
    store.seed(approvalEntry(2, 'pay-2'));
    store.seed(allowEntry(3, 2));
    const writer = await openWriter(store);
    await writer.ensureEpoch('gen-1');
    // A foreign holder lands a DIFFERENT key at the seq we computed.
    store.beforeAppend = (e): void => {
      store.seed(
        entry(e.seq, {
          kind: 'decision',
          status: 'ok',
          value: {
            decisionType: 'effect_intent',
            opId: 'foreign-op',
            logicalKey: 'pay-2',
            approvalRef: 2,
            epochRef: store.entries.find(
              (x) =>
                (x.value as { decisionType?: string } | undefined)?.decisionType === 'effect_epoch',
            )?.seq,
            effectClass: 'monetary',
            capabilityRow: 'idempotency-key',
            argumentsHash: 'beef',
            budgets: BUDGETS,
          } as unknown as Json,
        }),
      );
    };
    const result = await writer.consumeApprovalAndRecordIntent(spec());
    expect(result.machine.consumed).toBe(true);
    expect(writer.view().canonicalIntent('pay-2')?.opId).toBe('foreign-op');
    expect(writer.view().canonicalIntent('pay-1')?.opId).toBe('op-intent-1');
    await writer.close();
  });

  it('a loser whose key was taken gives up with a durable standalone refused record', async () => {
    const store = new FakeLaneStore();
    seedBase(store);
    store.seed(approvalEntry(2, 'pay-1'));
    store.seed(allowEntry(3, 2));
    const writer = await openWriter(store);
    await writer.ensureEpoch('gen-1');
    store.beforeAppend = (e): void => {
      store.seed(
        entry(e.seq, {
          kind: 'decision',
          status: 'ok',
          value: {
            decisionType: 'effect_intent',
            opId: 'foreign-op',
            logicalKey: 'pay-1',
            approvalRef: 2,
            epochRef: store.entries.find(
              (x) =>
                (x.value as { decisionType?: string } | undefined)?.decisionType === 'effect_epoch',
            )?.seq,
            effectClass: 'monetary',
            capabilityRow: 'idempotency-key',
            argumentsHash: 'beef',
            budgets: BUDGETS,
          } as unknown as Json,
        }),
      );
    };
    await expect(writer.consumeApprovalAndRecordIntent(spec())).rejects.toThrow(
      EffectLaneRefusedError,
    );
    expect(writer.view().standaloneRefusals()).toHaveLength(1);
    expect(writer.view().canonicalIntent('pay-1')?.opId).toBe('foreign-op');
    await writer.close();
  });

  it('kill 16: a superseded lease dies on the fence and nothing is consumed', async () => {
    const store = new FakeLaneStore();
    seedBase(store);
    const first = await openWriter(store, { owner: 'holder-1' });
    await first.ensureEpoch('gen-1');
    // A successor takes the lane; the predecessor's lease is stale.
    const second = await openWriter(store, { owner: 'holder-2' });
    await expect(first.consumeApprovalAndRecordIntent(spec())).rejects.toThrow(LeaseHeldError);
    const intents = store.entries.filter(
      (e) => (e.value as { decisionType?: string } | undefined)?.decisionType === 'effect_intent',
    );
    expect(intents).toHaveLength(0);
    await second.close();
  });

  it('intake refuses an effect approval without a deadline', async () => {
    const store = new FakeLaneStore();
    store.seed(approvalEntry(0, 'pay-1', false));
    store.seed(allowEntry(1, 0));
    const writer = await openWriter(store);
    await writer.ensureEpoch('gen-1');
    await expect(writer.consumeApprovalAndRecordIntent(spec())).rejects.toMatchObject({
      rule: 'approval-deadline-required',
    });
    await writer.close();
  });

  it('a crossed grant expiry is materialized as an appended decision, then refused', async () => {
    const store = new FakeLaneStore();
    store.seed(approvalEntry(0, 'pay-1'));
    store.seed(allowEntry(1, 0, { decision: 'allow', expiresAt: '2026-08-24T09:00:00.000Z' }));
    const writer = await openWriter(store);
    await writer.ensureEpoch('gen-1');
    await expect(writer.consumeApprovalAndRecordIntent(spec())).rejects.toMatchObject({
      rule: 'approval-expired',
    });
    const expiries = store.entries.filter(
      (e) =>
        (e.value as { decisionType?: string } | undefined)?.decisionType === 'approval_expired',
    );
    expect(expiries).toHaveLength(1);
    // The retry refuses again WITHOUT a second materialization.
    await expect(writer.consumeApprovalAndRecordIntent(spec())).rejects.toMatchObject({
      rule: 'approval-expired',
    });
    expect(
      store.entries.filter(
        (e) =>
          (e.value as { decisionType?: string } | undefined)?.decisionType === 'approval_expired',
      ),
    ).toHaveLength(1);
    await writer.close();
  });
});

describe('openAttempt (RFC sections 4.3 item 5 and 4.7)', () => {
  it('kill 3: a revocation with zero attempts cancels cleanly, for every row', async () => {
    const store = new FakeLaneStore();
    seedBase(store);
    const writer = await openWriter(store);
    await writer.ensureEpoch('gen-1');
    const consumed = await writer.consumeApprovalAndRecordIntent(
      spec({ capabilityRow: 'neither' }),
    );
    store.seed(
      entry(store.entries.length + 100, {
        kind: 'decision',
        status: 'ok',
        value: { decisionType: 'approval_revoked', targetRef: 0, principal: 'sec', reason: 'no' },
      }),
    );
    const result = await writer.openAttempt(consumed.intentSeq, {
      opId: 'op-attempt-1',
      notAfter: '2026-08-24T10:05:00.000Z',
    });
    expect(result.cancelled).toBe(true);
    expect(writer.view().machineAt(consumed.intentSeq)?.state).toBe('cancelled-before-dispatch');
    expect(writer.view().machineAt(consumed.intentSeq)?.attempts).toHaveLength(0);
    await writer.close();
  });

  it('re-dispatch after a revocation with attempt history refuses reconcile-only', async () => {
    const store = new FakeLaneStore();
    seedBase(store);
    const writer = await openWriter(store);
    await writer.ensureEpoch('gen-1');
    const consumed = await writer.consumeApprovalAndRecordIntent(spec());
    const attempt = await writer.openAttempt(consumed.intentSeq, {
      opId: 'op-attempt-1',
      notAfter: '2026-08-24T10:05:00.000Z',
      idempotencyKey: 'idem-1',
    });
    expect(attempt.cancelled).toBe(false);
    if (attempt.cancelled) {
      throw new Error('unreachable');
    }
    await writer.appendOutcome(consumed.intentSeq, attempt.attemptSeq, {
      opId: 'op-outcome-1',
      outcome: 'failed',
    });
    store.seed(
      entry(store.entries.length + 100, {
        kind: 'decision',
        status: 'ok',
        value: { decisionType: 'approval_revoked', targetRef: 0, principal: 'sec', reason: 'no' },
      }),
    );
    await expect(
      writer.openAttempt(consumed.intentSeq, {
        opId: 'op-attempt-2',
        notAfter: '2026-08-24T10:06:00.000Z',
        idempotencyKey: 'idem-1',
      }),
    ).rejects.toMatchObject({ rule: 'reconcile-only' });
    await writer.close();
  });

  it('refuses an attempt past the recorded budget', async () => {
    const store = new FakeLaneStore();
    seedBase(store);
    const writer = await openWriter(store);
    await writer.ensureEpoch('gen-1');
    const consumed = await writer.consumeApprovalAndRecordIntent(
      spec({ budgets: { ...BUDGETS, attempts: 1 } }),
    );
    const first = await writer.openAttempt(consumed.intentSeq, {
      opId: 'op-attempt-1',
      notAfter: '2026-08-24T10:05:00.000Z',
    });
    expect(first.cancelled).toBe(false);
    if (first.cancelled) {
      throw new Error('unreachable');
    }
    await writer.appendOutcome(consumed.intentSeq, first.attemptSeq, {
      opId: 'op-outcome-1',
      outcome: 'failed',
    });
    await expect(
      writer.openAttempt(consumed.intentSeq, {
        opId: 'op-attempt-2',
        notAfter: '2026-08-24T10:06:00.000Z',
      }),
    ).rejects.toMatchObject({ rule: 'attempts-exhausted' });
    await writer.close();
  });
});

describe('kill 30: every transition append survives a lost ack without a duplicate row', () => {
  it('attempt, outcome, receipt, and terminal each recover by opId', async () => {
    const store = new FakeLaneStore();
    seedBase(store);
    const writer = await openWriter(store);
    await writer.ensureEpoch('gen-1');
    const consumed = await writer.consumeApprovalAndRecordIntent(spec());
    store.loseNextAck = true;
    const attempt = await writer.openAttempt(consumed.intentSeq, {
      opId: 'op-attempt-1',
      notAfter: '2026-08-24T10:05:00.000Z',
    });
    expect(attempt.cancelled).toBe(false);
    if (attempt.cancelled) {
      throw new Error('unreachable');
    }
    store.loseNextAck = true;
    await writer.appendOutcome(consumed.intentSeq, attempt.attemptSeq, {
      opId: 'op-outcome-1',
      outcome: 'accepted',
    });
    store.loseNextAck = true;
    await writer.appendReceipt(consumed.intentSeq, {
      opId: 'op-receipt-1',
      verification: 'verified',
      transferId: 't-1',
      amount: 100,
    });
    store.loseNextAck = true;
    await writer.appendTerminal(consumed.intentSeq, {
      opId: 'op-terminal-1',
      terminal: 'confirmed',
    });
    const machine = writer.view().machineAt(consumed.intentSeq);
    expect(machine?.state).toBe('confirmed');
    expect(machine?.attempts).toHaveLength(1);
    expect(machine?.receipts).toHaveLength(1);
    const laneRows = store.entries.filter((e) =>
      String((e.value as { decisionType?: string } | undefined)?.decisionType ?? '').startsWith(
        'effect_',
      ),
    );
    // epoch + intent + attempt + outcome + receipt + terminal: no
    // duplicate transition rows anywhere.
    expect(laneRows).toHaveLength(6);
    await writer.close();
  });
});

describe('the restoration generation gate (kill 25, the store half)', () => {
  it('a restored store disables the lane until a fresh epoch cites the bump', async () => {
    const store = new FakeLaneStore();
    seedBase(store);
    const writer = await openWriter(store);
    await writer.ensureEpoch('gen-1');
    await writer.consumeApprovalAndRecordIntent(spec());
    // The restore: the generation bumps BEFORE the data is reachable.
    store.generation = 1;
    await expect(
      writer.consumeApprovalAndRecordIntent(spec({ opId: 'op-intent-2', logicalKey: 'pay-1' })),
    ).rejects.toMatchObject({ rule: 'restoration-generation-stale' });
    // The operator appends the fresh epoch; the lane re-enables.
    const fresh = await writer.ensureEpoch('gen-1');
    expect(fresh.replayed).toBe(false);
    expect(writer.view().currentEpoch()?.restorationGeneration).toBe(1);
    await writer.close();
  });
});

describe('effectLaneAdmissible (RFC section 5)', () => {
  const clean = semanticTerminalVerdictOf({
    claimConsistencyMeta: { coverage: 'full', findings: 0, judgedHash: 'a'.repeat(64) },
  });
  const envelope = (overrides: Record<string, unknown>): TerminalEnvelope =>
    ({
      settled: true,
      status: 'ok',
      completion: 'complete',
      deliverableAccepted: true,
      semanticTerminalVerdict: clean,
      ...overrides,
    }) as unknown as TerminalEnvelope;

  it('licenses only the fully clean settled envelope', () => {
    expect(effectLaneAdmissible(envelope({}))).toEqual({ ok: true });
  });

  it('each conjunct refuses with its own counterexample', () => {
    expect(effectLaneAdmissible(envelope({ settled: false }))).toMatchObject({
      ok: false,
      conjunct: 'settled',
    });
    expect(effectLaneAdmissible(envelope({ status: 'exhausted' }))).toMatchObject({
      ok: false,
      conjunct: 'status',
    });
    expect(effectLaneAdmissible(envelope({ completion: 'partial' }))).toMatchObject({
      ok: false,
      conjunct: 'completion',
    });
    expect(effectLaneAdmissible(envelope({ deliverableAccepted: undefined }))).toMatchObject({
      ok: false,
      conjunct: 'deliverableAccepted',
    });
    expect(effectLaneAdmissible(envelope({ semanticTerminalVerdict: undefined }))).toMatchObject({
      ok: false,
      conjunct: 'productionAcceptable',
      reason: expect.stringContaining('not-recorded') as string,
    });
  });
});
