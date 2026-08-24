/**
 * EffectLaneFold (plan 45): the pure semantics of the effect lane.
 * Journals are built by hand; the fold sees exactly what a store would
 * return, and every verdict here is a pure function of those bytes
 * (kill points 12, 13, 24, 26 plus the arbitration and dedup rules).
 */
import { describe, expect, it } from 'vitest';

import type { Json } from '../l0/json.js';
import type { EntryKind, EntryStatus, JournalEntry } from '../l0/entries.js';
import { EffectLaneFold, effectiveEffectState } from './fold.js';
import type { EffectBudgets } from './types.js';

const BASE = '2026-08-24T10:00:00.000Z';
const BUDGETS: EffectBudgets = {
  attempts: 3,
  lookups: 5,
  receiptWaitMs: 60_000,
  reconcileBy: '2026-08-25T00:00:00.000Z',
};

const entry = (
  seq: number,
  rest: Partial<JournalEntry> & { kind: EntryKind; status: EntryStatus },
): JournalEntry => ({
  hashVersion: 2,
  seq,
  scope: 'run',
  key: `k${String(seq)}`,
  ordinal: 0,
  spanId: 's',
  startedAt: BASE,
  ...rest,
});

const decision = (seq: number, value: Record<string, unknown>): JournalEntry =>
  entry(seq, { kind: 'decision', status: 'ok', value: value as Json });

const approval = (seq: number, licensedKey?: string): JournalEntry =>
  entry(seq, {
    kind: 'approval',
    status: 'suspended',
    deadlineAt: '2026-08-24T12:00:00.000Z',
    value: {
      flavor: 'approval',
      toolName: 'payout',
      ...(licensedKey === undefined ? {} : { effectLogicalKey: licensedKey }),
    },
  });

const resolve = (seq: number, target: number, value: Record<string, unknown>): JournalEntry =>
  entry(seq, {
    kind: 'resolution',
    status: 'ok',
    ref: target,
    resolution: { target, by: 'external', value: value as Json },
  });

const epoch = (seq: number, generation = 'gen-1'): JournalEntry =>
  decision(seq, { decisionType: 'effect_epoch', opId: `epoch-${String(seq)}`, generation });

const intent = (seq: number, overrides: Record<string, unknown> = {}): JournalEntry =>
  decision(seq, {
    decisionType: 'effect_intent',
    opId: `intent-${String(seq)}`,
    logicalKey: 'pay-1',
    approvalRef: 1,
    epochRef: 0,
    effectClass: 'monetary',
    capabilityRow: 'idempotency-key',
    argumentsHash: 'deadbeef',
    budgets: BUDGETS,
    ...overrides,
  });

const attempt = (
  seq: number,
  intentRef: number,
  ordinal = 1,
  overrides: Record<string, unknown> = {},
): JournalEntry =>
  decision(seq, {
    decisionType: 'effect_attempt',
    opId: `attempt-${String(seq)}`,
    intentRef,
    ordinal,
    notAfter: '2026-08-24T10:05:00.000Z',
    ...overrides,
  });

const outcome = (
  seq: number,
  intentRef: number,
  attemptRef: number,
  result: 'accepted' | 'failed' | 'unknown' = 'accepted',
): JournalEntry =>
  decision(seq, {
    decisionType: 'effect_outcome',
    opId: `outcome-${String(seq)}`,
    intentRef,
    attemptRef,
    outcome: result,
  });

const receipt = (
  seq: number,
  intentRef: number,
  overrides: Record<string, unknown> = {},
): JournalEntry =>
  decision(seq, {
    decisionType: 'effect_receipt',
    opId: `receipt-${String(seq)}`,
    intentRef,
    verification: 'verified',
    transferId: 't-1',
    amount: 100,
    ...overrides,
  });

const terminal = (
  seq: number,
  intentRef: number,
  state: string,
  overrides: Record<string, unknown> = {},
): JournalEntry =>
  decision(seq, {
    decisionType: 'effect_terminal',
    opId: `terminal-${String(seq)}`,
    intentRef,
    terminal: state,
    ...overrides,
  });

const revoked = (seq: number, targetRef: number): JournalEntry =>
  decision(seq, {
    decisionType: 'approval_revoked',
    targetRef,
    principal: 'security',
    reason: 'stop payment',
  });

const expired = (seq: number, targetRef: number): JournalEntry =>
  decision(seq, {
    decisionType: 'approval_expired',
    targetRef,
    expiresAt: '2026-08-24T11:00:00.000Z',
  });

/** epoch 0, licensed approval 1, allow 2: the consumable prefix. */
const prefix = (): JournalEntry[] => [
  epoch(0),
  approval(1, 'pay-1'),
  resolve(2, 1, { decision: 'allow' }),
];

describe('EffectLaneFold consumption (RFC section 4.3)', () => {
  it('consumes when the strict prefix holds every conjunct', () => {
    const fold = new EffectLaneFold([...prefix(), intent(3)]);
    const machine = fold.machineAt(3);
    expect(machine?.consumed).toBe(true);
    expect(machine?.state).toBe('intent');
    expect(fold.classificationOf(3)).toEqual({ classification: 'applied' });
    expect(fold.canonicalIntent('pay-1')?.intentSeq).toBe(3);
  });

  it('kill 13: a revocation at a lower position voids deterministically', () => {
    const fold = new EffectLaneFold([...prefix(), revoked(3, 1), intent(4)]);
    const machine = fold.machineAt(4);
    expect(machine?.consumed).toBe(false);
    expect(machine?.state).toBe('refused');
    expect(machine?.voidReason?.reason).toBe('approval-revoked');
  });

  it('kill 12: a prior approval_expired decision voids without any wall clock', () => {
    const fold = new EffectLaneFold([...prefix(), expired(3, 1), intent(4)]);
    expect(fold.machineAt(4)?.voidReason?.reason).toBe('approval-expired');
  });

  it('kill 24: an intent citing a stale epoch folds void', () => {
    const fold = new EffectLaneFold([...prefix(), epoch(3, 'gen-2'), intent(4, { epochRef: 0 })]);
    expect(fold.machineAt(4)?.voidReason?.reason).toBe('stale-epoch');
    expect(fold.currentEpoch()?.generation).toBe('gen-2');
  });

  it('voids without any epoch in the prefix', () => {
    const fold = new EffectLaneFold([
      approval(0, 'pay-1'),
      resolve(1, 0, { decision: 'allow' }),
      intent(2, { approvalRef: 0, epochRef: 0 }),
    ]);
    expect(fold.machineAt(2)?.voidReason?.reason).toBe('no-epoch');
  });

  it('kill 26: a second intent for the same key under a DIFFERENT approval folds void', () => {
    const fold = new EffectLaneFold([
      ...prefix(),
      approval(3, 'pay-1'),
      resolve(4, 3, { decision: 'allow' }),
      intent(5),
      intent(6, { approvalRef: 3 }),
    ]);
    expect(fold.machineAt(5)?.consumed).toBe(true);
    expect(fold.machineAt(6)?.voidReason?.reason).toBe('duplicate-logical-key');
    expect(fold.canonicalIntent('pay-1')?.intentSeq).toBe(5);
  });

  it('refuses an approval that never resolved, resolved late, or resolved deny', () => {
    const unresolved = new EffectLaneFold([epoch(0), approval(1, 'pay-1'), intent(2)]);
    expect(unresolved.machineAt(2)?.voidReason?.reason).toBe('approval-not-allowed');
    const late = new EffectLaneFold([
      epoch(0),
      approval(1, 'pay-1'),
      intent(2),
      resolve(3, 1, { decision: 'allow' }),
    ]);
    expect(late.machineAt(2)?.voidReason?.reason).toBe('approval-not-allowed');
    const denied = new EffectLaneFold([
      epoch(0),
      approval(1, 'pay-1'),
      resolve(2, 1, { decision: 'deny' }),
      intent(3),
    ]);
    expect(denied.machineAt(3)?.voidReason?.reason).toBe('approval-not-allowed');
  });

  it('an approval licenses exactly one key, fail closed on absence', () => {
    const unnamed = new EffectLaneFold([
      epoch(0),
      approval(1),
      resolve(2, 1, { decision: 'allow' }),
      intent(3),
    ]);
    expect(unnamed.machineAt(3)?.voidReason?.reason).toBe('approval-names-no-key');
    const mismatched = new EffectLaneFold([
      epoch(0),
      approval(1, 'pay-OTHER'),
      resolve(2, 1, { decision: 'allow' }),
      intent(3),
    ]);
    expect(mismatched.machineAt(3)?.voidReason?.reason).toBe('approval-key-mismatch');
  });

  it('refuses compensation depth two and dangling causal references', () => {
    const journal = [
      ...prefix(),
      intent(3),
      receipt(4, 3),
      terminal(5, 3, 'confirmed'),
      approval(6, 'pay-1-reverse'),
      resolve(7, 6, { decision: 'allow' }),
      intent(8, {
        logicalKey: 'pay-1-reverse',
        approvalRef: 6,
        compensates: 3,
        budgets: { ...BUDGETS, authorizationWaitMs: 60_000 },
      }),
      approval(9, 'pay-1-reverse-again'),
      resolve(10, 9, { decision: 'allow' }),
      intent(11, { logicalKey: 'pay-1-reverse-again', approvalRef: 9, compensates: 8 }),
    ];
    const fold = new EffectLaneFold(journal);
    expect(fold.machineAt(8)?.consumed).toBe(true);
    expect(fold.machineAt(11)?.voidReason?.reason).toBe('compensation-depth');
    const dangling = new EffectLaneFold([...prefix(), intent(3, { compensates: 99 })]);
    expect(dangling.machineAt(3)?.voidReason?.reason).toBe('bad-causal-ref');
  });
});

describe('EffectLaneFold operation ids (RFC section 4.3, item 2)', () => {
  it('treats a same-opId replay as the same transition on every type', () => {
    const journal = [
      ...prefix(),
      intent(3, { opId: 'op-i' }),
      decision(4, {
        decisionType: 'effect_intent',
        opId: 'op-i',
        logicalKey: 'pay-1',
        approvalRef: 1,
        epochRef: 0,
        effectClass: 'monetary',
        capabilityRow: 'idempotency-key',
        argumentsHash: 'deadbeef',
        budgets: BUDGETS,
      }),
      attempt(5, 3, 1, { opId: 'op-a' }),
      decision(6, {
        decisionType: 'effect_attempt',
        opId: 'op-a',
        intentRef: 3,
        ordinal: 1,
        notAfter: '2026-08-24T10:05:00.000Z',
      }),
    ];
    const fold = new EffectLaneFold(journal);
    expect(fold.classificationOf(4)).toEqual({ classification: 'replay', firstSeq: 3 });
    expect(fold.classificationOf(6)).toEqual({ classification: 'replay', firstSeq: 5 });
    // The replayed appends fabricated nothing: one machine, one attempt.
    expect(fold.machines().filter((m) => m.consumed)).toHaveLength(1);
    expect(fold.machineAt(3)?.attempts).toHaveLength(1);
    // The duplicate-key rule never fired: seq 4 is the SAME operation,
    // not a second canonical claim.
    expect(fold.machineAt(4)).toBeUndefined();
  });
});

describe('EffectLaneFold machine progression', () => {
  it('walks intent, dispatching, awaiting-receipt, confirmed', () => {
    const journal = [
      ...prefix(),
      intent(3),
      attempt(4, 3),
      outcome(5, 3, 4, 'accepted'),
      receipt(6, 3),
      terminal(7, 3, 'confirmed'),
    ];
    const fold = new EffectLaneFold(journal);
    const machine = fold.machineAt(3);
    expect(machine?.state).toBe('confirmed');
    expect(machine?.attempts).toEqual([
      expect.objectContaining({ seq: 4, open: false, outcome: 'accepted', outcomeSeq: 5 }),
    ]);
    expect(fold.openMachines()).toHaveLength(0);
  });

  it('a failed outcome returns to intent; unknown enters unknown', () => {
    const failed = new EffectLaneFold([
      ...prefix(),
      intent(3),
      attempt(4, 3),
      outcome(5, 3, 4, 'failed'),
    ]);
    expect(failed.machineAt(3)?.state).toBe('intent');
    const unknown = new EffectLaneFold([
      ...prefix(),
      intent(3),
      attempt(4, 3),
      outcome(5, 3, 4, 'unknown'),
    ]);
    expect(unknown.machineAt(3)?.state).toBe('unknown');
  });

  it('at most one attempt may be open at a time', () => {
    const fold = new EffectLaneFold([...prefix(), intent(3), attempt(4, 3), attempt(5, 3, 2)]);
    expect(fold.classificationOf(5)).toMatchObject({ classification: 'invalid' });
    expect(fold.machineAt(3)?.attempts).toHaveLength(1);
  });

  it('an unverified receipt routes to unknown, never to confirmed', () => {
    const fold = new EffectLaneFold([
      ...prefix(),
      intent(3),
      attempt(4, 3),
      outcome(5, 3, 4, 'accepted'),
      receipt(6, 3, { verification: 'unverified' }),
    ]);
    expect(fold.machineAt(3)?.state).toBe('unknown');
  });

  it('sub-records addressing a void or unknown intent are invalid, never machines', () => {
    const fold = new EffectLaneFold([
      epoch(0),
      approval(1, 'pay-1'),
      intent(2),
      attempt(3, 2),
      attempt(4, 99),
    ]);
    expect(fold.classificationOf(3)).toMatchObject({ classification: 'invalid' });
    expect(fold.classificationOf(4)).toMatchObject({ classification: 'invalid' });
  });
});

describe('EffectLaneFold terminals (RFC section 4.6)', () => {
  it('the first terminal wins; later transitions fold superseded', () => {
    const journal = [
      ...prefix(),
      intent(3),
      terminal(4, 3, 'quarantined', { reason: 'attempts exhausted' }),
      terminal(5, 3, 'quarantined'),
    ];
    const fold = new EffectLaneFold(journal);
    expect(fold.machineAt(3)?.terminal?.seq).toBe(4);
    expect(fold.classificationOf(5)).toEqual({ classification: 'superseded', supersededBy: 4 });
  });

  it('both racing histories are legal and deterministic given their order', () => {
    const receiptFirst = new EffectLaneFold([
      ...prefix(),
      intent(3),
      attempt(4, 3),
      outcome(5, 3, 4, 'accepted'),
      receipt(6, 3),
      terminal(7, 3, 'confirmed'),
      terminal(8, 3, 'quarantined', { reason: 'receipt wait exhausted' }),
    ]);
    expect(receiptFirst.machineAt(3)?.state).toBe('confirmed');
    expect(receiptFirst.classificationOf(8)).toMatchObject({ classification: 'superseded' });
    const quarantineFirst = new EffectLaneFold([
      ...prefix(),
      intent(3),
      attempt(4, 3),
      outcome(5, 3, 4, 'accepted'),
      terminal(6, 3, 'quarantined', { reason: 'receipt wait exhausted' }),
      receipt(7, 3),
    ]);
    expect(quarantineFirst.machineAt(3)?.state).toBe('quarantined');
    // Kill 11: the late verified receipt is a linked incident and
    // disposition input, never a resurrection.
    expect(quarantineFirst.classificationOf(7)).toMatchObject({ classification: 'incident' });
    expect(quarantineFirst.machineAt(3)?.incidents).toEqual([
      expect.objectContaining({ incident: 'receipt-after-terminal' }),
    ]);
  });

  it('cancelled-before-dispatch requires zero attempt records', () => {
    const clean = new EffectLaneFold([
      ...prefix(),
      intent(3),
      revoked(4, 1),
      terminal(5, 3, 'cancelled-before-dispatch'),
    ]);
    expect(clean.machineAt(3)?.state).toBe('cancelled-before-dispatch');
    const dirty = new EffectLaneFold([
      ...prefix(),
      intent(3),
      attempt(4, 3),
      terminal(5, 3, 'cancelled-before-dispatch'),
    ]);
    expect(dirty.classificationOf(5)).toMatchObject({ classification: 'invalid' });
    expect(dirty.machineAt(3)?.terminal).toBeUndefined();
  });

  it('confirmed requires a verified receipt in the prefix', () => {
    const fold = new EffectLaneFold([...prefix(), intent(3), terminal(4, 3, 'confirmed')]);
    expect(fold.classificationOf(4)).toMatchObject({ classification: 'invalid' });
    expect(fold.machineAt(3)?.terminal).toBeUndefined();
  });

  it('a standalone refused record names its logical key durably', () => {
    const fold = new EffectLaneFold([
      ...prefix(),
      decision(3, {
        decisionType: 'effect_terminal',
        opId: 'give-up',
        terminal: 'refused',
        logicalKey: 'pay-1',
        reason: 'the verdict no longer held at the new tail',
      }),
    ]);
    expect(fold.standaloneRefusals()).toEqual([
      { seq: 3, logicalKey: 'pay-1', reason: 'the verdict no longer held at the new tail' },
    ]);
  });
});

describe('EffectLaneFold revocation windows (RFC section 4.7)', () => {
  it('disables re-dispatch on EVERY row from the revocation position on', () => {
    const fold = new EffectLaneFold([
      ...prefix(),
      intent(3),
      attempt(4, 3),
      outcome(5, 3, 4, 'failed'),
      revoked(6, 1),
      attempt(7, 3, 2),
    ]);
    expect(fold.classificationOf(7)).toMatchObject({ classification: 'invalid' });
    expect(fold.machineAt(3)?.attempts).toHaveLength(1);
    expect(fold.machineAt(3)?.postIntentCloser).toEqual({ seq: 6, kind: 'revoked' });
  });

  it('expiry after the intent surfaces the same closer with its own kind', () => {
    const fold = new EffectLaneFold([...prefix(), intent(3), expired(4, 1)]);
    expect(fold.machineAt(3)?.postIntentCloser).toEqual({ seq: 4, kind: 'expired' });
  });

  it('kill 15: revocation after confirmation stands as an incident; the terminal holds', () => {
    const fold = new EffectLaneFold([
      ...prefix(),
      intent(3),
      attempt(4, 3),
      outcome(5, 3, 4, 'accepted'),
      receipt(6, 3),
      terminal(7, 3, 'confirmed'),
      revoked(8, 1),
      decision(9, {
        decisionType: 'effect_incident',
        opId: 'incident-9',
        intentRef: 3,
        incident: 'revocation-after-confirmation',
        causalRef: 8,
      }),
    ]);
    const machine = fold.machineAt(3);
    expect(machine?.state).toBe('confirmed');
    expect(machine?.incidents).toEqual([
      expect.objectContaining({ incident: 'revocation-after-confirmation', causalRef: 8 }),
    ]);
  });
});

describe('EffectLaneFold receipts (RFC sections 3.2 and 9)', () => {
  it('kill 9: a benign duplicate confirms once and counts once', () => {
    const fold = new EffectLaneFold([
      ...prefix(),
      intent(3),
      attempt(4, 3),
      outcome(5, 3, 4, 'accepted'),
      receipt(6, 3),
      receipt(7, 3),
      terminal(8, 3, 'confirmed'),
    ]);
    const machine = fold.machineAt(3);
    expect(machine?.state).toBe('confirmed');
    expect(machine?.receipts[1]).toMatchObject({ benignDuplicateOf: 6 });
    expect(machine?.incidents).toHaveLength(0);
  });

  it('kill 10: a conflicting duplicate quarantine-flags before a terminal and incidents after', () => {
    const before = new EffectLaneFold([
      ...prefix(),
      intent(3),
      attempt(4, 3),
      outcome(5, 3, 4, 'accepted'),
      receipt(6, 3),
      receipt(7, 3, { transferId: 't-OTHER', amount: 250 }),
    ]);
    expect(before.machineAt(3)?.pendingConflict?.seq).toBe(7);
    expect(before.machineAt(3)?.receipts[1]).toMatchObject({ conflictWith: 6 });
    const after = new EffectLaneFold([
      ...prefix(),
      intent(3),
      attempt(4, 3),
      outcome(5, 3, 4, 'accepted'),
      receipt(6, 3),
      terminal(7, 3, 'confirmed'),
      receipt(8, 3, { transferId: 't-OTHER', amount: 250 }),
    ]);
    expect(after.machineAt(3)?.state).toBe('confirmed');
    expect(after.machineAt(3)?.incidents).toEqual([
      expect.objectContaining({ incident: 'conflicting-duplicate' }),
    ]);
  });
});

describe('EffectLaneFold compensation overlay', () => {
  it('derives compensated from a confirmed compensation citing a confirmed original', () => {
    const journal = [
      ...prefix(),
      intent(3),
      attempt(4, 3),
      outcome(5, 3, 4, 'accepted'),
      receipt(6, 3),
      terminal(7, 3, 'confirmed'),
      revoked(8, 1),
      approval(9, 'pay-1-reverse'),
      resolve(10, 9, { decision: 'allow' }),
      intent(11, { logicalKey: 'pay-1-reverse', approvalRef: 9, compensates: 3 }),
      attempt(12, 11),
      outcome(13, 11, 12, 'accepted'),
      receipt(14, 11, { transferId: 't-reverse', amount: 100 }),
      terminal(15, 11, 'confirmed'),
    ];
    const fold = new EffectLaneFold(journal);
    const original = fold.machineAt(3);
    expect(original?.state).toBe('confirmed');
    expect(original?.terminal?.terminal).toBe('confirmed');
    expect(original?.compensatedBy).toBe(11);
    expect(original === undefined ? undefined : effectiveEffectState(original)).toBe('compensated');
  });
});

describe('EffectLaneFold hygiene', () => {
  it('a malformed lane payload is inert and surfaced, never a machine', () => {
    const fold = new EffectLaneFold([
      ...prefix(),
      decision(3, { decisionType: 'effect_intent', opId: 'broken' }),
      decision(4, { decisionType: 'effect_attempt', intentRef: 3, ordinal: 1 }),
    ]);
    expect(fold.classificationOf(3)).toMatchObject({ classification: 'malformed' });
    expect(fold.classificationOf(4)).toMatchObject({ classification: 'malformed' });
    expect(fold.machines()).toHaveLength(0);
  });

  it("the 'lookup' row demands its recorded qualification at read time", () => {
    const fold = new EffectLaneFold([
      ...prefix(),
      intent(3, { capabilityRow: 'lookup' }),
      intent(4, { capabilityRow: 'lookup', lookupQualification: 'conditional-create' }),
    ]);
    expect(fold.classificationOf(3)).toMatchObject({ classification: 'malformed' });
    expect(fold.machineAt(4)?.consumed).toBe(true);
    expect(fold.machineAt(4)?.lookupQualification).toBe('conditional-create');
  });

  it('non-lane traffic never classifies', () => {
    const fold = new EffectLaneFold([
      ...prefix(),
      decision(3, { decisionType: 'execution_scope', scope: { tenant: 'acme' } }),
      entry(4, { kind: 'agent', status: 'ok' }),
    ]);
    expect(fold.classificationOf(3)).toBeUndefined();
    expect(fold.classificationOf(4)).toBeUndefined();
  });
});
