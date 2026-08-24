/**
 * The effect lane conformance kit (plan 45, rfcs/effects.md section
 * 8): every kill point of the catalog as a named executable check,
 * parameterized by a store factory, so a host proves ITS store
 * composes with the lane the way the RFC's fencing argument assumes.
 * Money class runs the whole list; signing and case classes run it
 * minus the rows that do not apply (the monetary duplicate rows), and
 * that exclusion list is part of this kit: `EFFECTS_KILL_EXCLUSIONS`.
 *
 * Store-agnostic by construction: ambiguous acks are injected through
 * a delegating proxy that commits and then throws (any store can lose
 * an ack), and the restoration generation rides a decorator when the
 * store does not expose the capability itself. Rows that need a REAL
 * lease fence (16) degrade to the construction refusal under
 * explicitly single-process semantics, and to a fabricated stale
 * lease over leasable stores.
 */
import {
  ConfigError,
  openEffectLane,
  CURRENT_HASH_VERSION,
  LeaseHeldError,
  type EffectLaneWriter,
  type JournalEntry,
  type JournalStore,
  type Json,
  type Lease,
} from '@rulvar/core';
import {
  ensure,
  makeSuite,
  type ConformanceCheck,
  type ConformanceSuite,
  type StoreFactory,
} from '@rulvar/store-conformance';

import { EffectDispatcher } from './dispatcher.js';
import { EffectReconciler } from './reconciler.js';
import { FakeEffectProvider } from './fakes.js';

const NOW = '2026-08-24T10:00:00.000Z';
const LATER = '2026-08-24T10:10:00.000Z';
const RUN = 'EFFECTS-KIT';

/** Rows that do not apply per effect class (part of the kit contract). */
export const EFFECTS_KILL_EXCLUSIONS: Record<'monetary' | 'signing' | 'case', readonly string[]> = {
  monetary: [],
  signing: ['effects.receipt.duplicate-benign', 'effects.receipt.duplicate-conflicting'],
  case: ['effects.receipt.duplicate-benign', 'effects.receipt.duplicate-conflicting'],
};

export interface EffectsConformanceOptions {
  /** A fresh, isolated store per call. */
  store: StoreFactory<JournalStore>;
  /** Explicitly single-process semantics for non-leasable stores. */
  singleProcess?: boolean;
}

/**
 * Commits the next append and then throws: the lost ack, over ANY
 * store. A Proxy so lease methods and capability markers of the inner
 * store pass through untouched.
 */
function withAckLoss(inner: JournalStore): JournalStore & { loseNextAck: boolean } {
  const state = { loseNextAck: false };
  return new Proxy(inner, {
    get(target, prop) {
      if (prop === 'loseNextAck') {
        return state.loseNextAck;
      }
      if (prop === 'append') {
        return async (runId: string, e: JournalEntry, lease?: Lease): Promise<void> => {
          await target.append(runId, e, lease);
          if (state.loseNextAck) {
            state.loseNextAck = false;
            throw new Error('the ack was lost after the commit');
          }
        };
      }
      const value = Reflect.get(target, prop, target) as unknown;
      return typeof value === 'function'
        ? (value as (...a: never[]) => unknown).bind(target)
        : value;
    },
    set(target, prop, value) {
      if (prop === 'loseNextAck') {
        state.loseNextAck = value as boolean;
        return true;
      }
      return Reflect.set(target, prop, value);
    },
  }) as JournalStore & { loseNextAck: boolean };
}

/**
 * Adds the restoration generation when the store lacks the capability;
 * a Proxy so leases and fences pass through untouched.
 */
function withRestoration(inner: JournalStore): JournalStore & { generation: number } {
  const state = { generation: 0 };
  return new Proxy(inner, {
    get(target, prop) {
      if (prop === 'generation') {
        return state.generation;
      }
      if (prop === 'effectLane') {
        return true;
      }
      if (prop === 'restorationGeneration') {
        return async (): Promise<number> => {
          await Promise.resolve();
          return state.generation;
        };
      }
      const value = Reflect.get(target, prop, target) as unknown;
      return typeof value === 'function'
        ? (value as (...a: never[]) => unknown).bind(target)
        : value;
    },
    set(target, prop, value) {
      if (prop === 'generation') {
        state.generation = value as number;
        return true;
      }
      return Reflect.set(target, prop, value);
    },
  }) as JournalStore & { generation: number };
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

const BUDGETS = {
  attempts: 3,
  lookups: 5,
  receiptWaitMs: 60_000,
  reconcileBy: '2026-08-25T00:00:00.000Z',
};

interface Harness {
  store: JournalStore;
  writer: EffectLaneWriter;
  adapter: FakeEffectProvider;
  dispatcher: EffectDispatcher;
  reconciler: EffectReconciler;
  intentSeq: number;
  nextSeq(): Promise<number>;
  revoke(): Promise<void>;
  expire(): Promise<void>;
}

async function seed(store: JournalStore, licensedKey: string, at = 0): Promise<void> {
  await store.append(
    RUN,
    entry(at, {
      kind: 'approval',
      status: 'suspended',
      deadlineAt: '2026-08-24T12:00:00.000Z',
      value: { flavor: 'approval', toolName: 'payout', effectLogicalKey: licensedKey },
    }),
  );
  await store.append(
    RUN,
    entry(at + 1, {
      kind: 'resolution',
      status: 'ok',
      ref: at,
      resolution: { target: at, by: 'external', value: { decision: 'allow' } },
    }),
  );
}

async function harness(
  options: EffectsConformanceOptions,
  config: {
    row?: 'idempotency-key' | 'lookup' | 'neither';
    qualification?: 'acceptance-closing' | 'conditional-create';
    store?: JournalStore;
    consume?: boolean;
    now?: () => string;
    budgets?: Partial<typeof BUDGETS>;
  } = {},
): Promise<Harness> {
  const row = config.row ?? 'idempotency-key';
  const store = config.store ?? (await options.store());
  await seed(store, 'pay-1');
  const now = config.now ?? ((): string => NOW);
  const writer = await openEffectLane({
    store,
    runId: RUN,
    owner: 'kit',
    ...(options.singleProcess === true ? { singleProcess: true } : {}),
    now,
  });
  await writer.ensureEpoch('gen-1');
  let intentSeq = -1;
  if (config.consume !== false) {
    const consumed = await writer.consumeApprovalAndRecordIntent({
      opId: 'kit-intent-1',
      logicalKey: 'pay-1',
      approvalRef: 0,
      effectClass: 'monetary',
      capabilityRow: row,
      ...(config.qualification === undefined ? {} : { lookupQualification: config.qualification }),
      argumentsHash: 'deadbeef',
      budgets: { ...BUDGETS, ...config.budgets },
    });
    intentSeq = consumed.intentSeq;
  }
  const adapter = new FakeEffectProvider({
    provider: 'kit',
    capabilityRow: row,
    ...(config.qualification === undefined ? {} : { lookupQualification: config.qualification }),
  });
  const dispatcher = new EffectDispatcher({
    writer,
    adapter,
    runId: RUN,
    verifyReceipt: () => 'verified',
    now,
  });
  const reconciler = new EffectReconciler({ writer, dispatcher, now });
  const nextSeq = async (): Promise<number> => {
    const entries = await store.load(RUN);
    return entries.reduce((max, e) => Math.max(max, e.seq), -1) + 1;
  };
  const appendDecision = async (value: Record<string, unknown>): Promise<void> => {
    await store.append(
      RUN,
      entry(await nextSeq(), { kind: 'decision', status: 'ok', value: value as Json }),
    );
  };
  return {
    store,
    writer,
    adapter,
    dispatcher,
    reconciler,
    intentSeq,
    nextSeq,
    revoke: () =>
      appendDecision({
        decisionType: 'approval_revoked',
        targetRef: 0,
        principal: 'security',
        reason: 'stop',
      }),
    expire: () =>
      appendDecision({
        decisionType: 'approval_expired',
        targetRef: 0,
        expiresAt: '2026-08-24T09:00:00.000Z',
      }),
  };
}

async function crashAttempt(h: Harness): Promise<number> {
  const machine = (await h.writer.refresh()).machineAt(h.intentSeq);
  const opened = await h.writer.openAttempt(h.intentSeq, {
    opId: `kit-crash:${String((machine?.attempts.length ?? 0) + 1)}`,
    notAfter: '2026-08-24T10:05:00.000Z',
    ...(h.adapter.descriptor.capabilityRow === 'idempotency-key'
      ? { idempotencyKey: `pay-1#epoch${String(machine?.epochRef ?? 0)}` }
      : {}),
  });
  if (opened.cancelled) {
    throw new Error('unexpected cancel in kit crash setup');
  }
  return opened.attemptSeq;
}

const intentCount = async (store: JournalStore): Promise<number> =>
  (await store.load(RUN)).filter(
    (e) => (e.value as { decisionType?: string } | undefined)?.decisionType === 'effect_intent',
  ).length;

/** The kill point catalog as named checks (RFC section 8). */
export function effectsConformance(options: EffectsConformanceOptions): ConformanceSuite {
  const checks: ConformanceCheck[] = [
    {
      id: 'effects.kill.before-intent-append',
      title: 'a crash before the intent append leaves no trace; rerunning is safe',
      async run() {
        const h = await harness(options);
        ensure((await intentCount(h.store)) === 1, 'effects.kill.1', 'exactly one intent');
        const again = await h.writer.consumeApprovalAndRecordIntent({
          opId: 'kit-intent-1',
          logicalKey: 'pay-1',
          approvalRef: 0,
          effectClass: 'monetary',
          capabilityRow: 'idempotency-key',
          argumentsHash: 'deadbeef',
          budgets: BUDGETS,
        });
        ensure(again.replayed, 'effects.kill.1', 'the rerun recovers the same intent');
        ensure((await intentCount(h.store)) === 1, 'effects.kill.1', 'still exactly one intent');
        await h.writer.close();
      },
    },
    {
      id: 'effects.kill.intent-append-ambiguous-ack',
      title: 'a committed intent with a lost ack recovers by its own operation id',
      async run() {
        const store = withAckLoss(await options.store());
        await seed(store, 'pay-1');
        const writer = await openEffectLane({
          store,
          runId: RUN,
          owner: 'kit',
          ...(options.singleProcess === true ? { singleProcess: true } : {}),
          now: () => NOW,
        });
        await writer.ensureEpoch('gen-1');
        store.loseNextAck = true;
        const consumed = await writer.consumeApprovalAndRecordIntent({
          opId: 'kit-intent-1',
          logicalKey: 'pay-1',
          approvalRef: 0,
          effectClass: 'monetary',
          capabilityRow: 'idempotency-key',
          argumentsHash: 'deadbeef',
          budgets: BUDGETS,
        });
        ensure(consumed.machine.consumed, 'effects.kill.2', 'the intent exists');
        ensure((await intentCount(store)) === 1, 'effects.kill.2', 'no duplicate, no ghost');
        await writer.close();
      },
    },
    {
      id: 'effects.kill.after-intent-before-attempt-append',
      title: 'zero attempts: a revocation cancels cleanly; otherwise attempt one opens, every row',
      async run() {
        for (const row of ['idempotency-key', 'neither'] as const) {
          const h = await harness(options, { row });
          await h.revoke();
          const opened = await h.writer.openAttempt(h.intentSeq, {
            opId: 'kit-a1',
            notAfter: '2026-08-24T10:05:00.000Z',
          });
          ensure(opened.cancelled, 'effects.kill.3', `row ${row}: the revocation cancels`);
          await h.writer.close();
          const clean = await harness(options, { row });
          const openedClean = await clean.writer.openAttempt(clean.intentSeq, {
            opId: 'kit-a1',
            notAfter: '2026-08-24T10:05:00.000Z',
          });
          ensure(
            !openedClean.cancelled,
            'effects.kill.3',
            `row ${row}: attempt one opens without false modesty`,
          );
          await clean.writer.close();
        }
      },
    },
    {
      id: 'effects.kill.after-attempt-append-before-send',
      title: 'the ambiguous window recovers per row: fence re-dispatch, closure, or quarantine',
      async run() {
        const idem = await harness(options, { row: 'idempotency-key' });
        await crashAttempt(idem);
        const r1 = await idem.dispatcher.recover(idem.intentSeq);
        ensure(r1.kind === 'redispatched', 'effects.kill.4', 'idempotency row re-dispatches');
        ensure(idem.adapter.effectCount('pay-1') === 1, 'effects.kill.4', 'one effect');
        await idem.writer.close();
        const closing = await harness(options, {
          row: 'lookup',
          qualification: 'acceptance-closing',
        });
        await crashAttempt(closing);
        const r2 = await closing.dispatcher.recover(closing.intentSeq);
        ensure(r2.kind === 'redispatched', 'effects.kill.4', 'closure licenses the fresh attempt');
        ensure(closing.adapter.effectCount('pay-1') === 1, 'effects.kill.4', 'one effect');
        await closing.writer.close();
        const neither = await harness(options, { row: 'neither' });
        await crashAttempt(neither);
        const r3 = await neither.dispatcher.recover(neither.intentSeq);
        ensure(r3.kind === 'quarantined', 'effects.kill.4', 'neither quarantines');
        ensure(
          r3.kind === 'quarantined' && r3.reason.includes('stale send'),
          'effects.kill.4',
          'the record names the possible late stale send',
        );
        ensure(neither.adapter.dispatches === 0, 'effects.kill.4', 'no blind send');
        await neither.writer.close();
      },
    },
    {
      id: 'effects.kill.during-send',
      title: 'indistinguishable from the pre-send crash; recovery is byte identical',
      async run() {
        const h = await harness(options, { row: 'idempotency-key' });
        h.adapter.stallNextSend = true;
        const first = await h.dispatcher.dispatch(h.intentSeq);
        ensure(first.kind === 'unknown', 'effects.kill.5', 'the stalled send is unknown');
        const recovered = await h.dispatcher.recover(h.intentSeq);
        ensure(recovered.kind === 'redispatched', 'effects.kill.5', 'same recovery as kill 4');
        ensure(h.adapter.effectCount('pay-1') === 1, 'effects.kill.5', 'one effect');
        await h.writer.close();
      },
    },
    {
      id: 'effects.kill.after-send-before-outcome-append',
      title: 'a landed send is FOUND and confirmed retroactively, never re-executed',
      async run() {
        const h = await harness(options, { row: 'lookup', qualification: 'acceptance-closing' });
        const attemptSeq = await crashAttempt(h);
        const machine = (await h.writer.refresh()).machineAt(h.intentSeq);
        ensure(machine !== undefined, 'effects.kill.6', 'machine exists');
        await h.adapter.dispatch({
          runId: RUN,
          intent: machine,
          attemptSeq,
          ordinal: 1,
          notAfter: '2026-08-24T10:05:00.000Z',
        });
        const sends = h.adapter.dispatches;
        const recovered = await h.dispatcher.recover(h.intentSeq);
        ensure(recovered.kind === 'confirmed', 'effects.kill.6', 'the found effect confirms');
        ensure(h.adapter.dispatches === sends, 'effects.kill.6', 'no re-execution');
        ensure(h.adapter.effectCount('pay-1') === 1, 'effects.kill.6', 'one effect');
        await h.writer.close();
      },
    },
    {
      id: 'effects.kill.after-terminal-append',
      title: 'resume after a terminal is a no-op and never contacts the provider',
      async run() {
        const h = await harness(options);
        await h.dispatcher.dispatch(h.intentSeq);
        const sends = h.adapter.dispatches;
        const lookups = h.adapter.lookups;
        const report = await h.dispatcher.recover(h.intentSeq);
        ensure(report.kind === 'noop', 'effects.kill.7', 'recovery is a no-op');
        ensure(
          h.adapter.dispatches === sends && h.adapter.lookups === lookups,
          'effects.kill.7',
          'zero provider contact',
        );
        await h.writer.close();
      },
    },
    {
      id: 'effects.provider.accepted-but-timeout',
      title: 'timeout after provider accept recovers exactly like the open window',
      async run() {
        const h = await harness(options, { row: 'idempotency-key' });
        h.adapter.nextBehavior = 'accept-timeout';
        const first = await h.dispatcher.dispatch(h.intentSeq);
        ensure(first.kind === 'unknown', 'effects.kill.8', 'the timeout is unknown');
        const recovered = await h.dispatcher.recover(h.intentSeq);
        ensure(recovered.kind === 'redispatched', 'effects.kill.8', 'the fence arbitrates');
        ensure(h.adapter.effectCount('pay-1') === 1, 'effects.kill.8', 'one effect');
        await h.writer.close();
      },
    },
    {
      id: 'effects.receipt.duplicate-benign',
      title: 'a benign duplicate receipt confirms once and counts once',
      async run() {
        const h = await harness(options);
        h.adapter.nextBehavior = 'accept-no-receipt';
        await h.dispatcher.dispatch(h.intentSeq);
        await h.writer.appendReceipt(h.intentSeq, {
          opId: 'kit-r1',
          verification: 'verified',
          transferId: 't-1',
          amount: 100,
        });
        await h.writer.appendReceipt(h.intentSeq, {
          opId: 'kit-r2',
          verification: 'verified',
          transferId: 't-1',
          amount: 100,
        });
        await h.writer.appendTerminal(h.intentSeq, { opId: 'kit-c', terminal: 'confirmed' });
        const machine = (await h.writer.refresh()).machineAt(h.intentSeq);
        ensure(machine?.state === 'confirmed', 'effects.kill.9', 'confirms once');
        ensure(
          machine?.receipts[1]?.benignDuplicateOf === machine?.receipts[0]?.seq,
          'effects.kill.9',
          'the duplicate is classified benign, never an incident',
        );
        ensure(machine?.incidents.length === 0, 'effects.kill.9', 'no incident');
        await h.writer.close();
      },
    },
    {
      id: 'effects.receipt.duplicate-conflicting',
      title: 'a conflicting duplicate quarantines before a terminal and incidents after',
      async run() {
        const h = await harness(options);
        h.adapter.nextBehavior = 'accept-no-receipt';
        await h.dispatcher.dispatch(h.intentSeq);
        await h.writer.appendReceipt(h.intentSeq, {
          opId: 'kit-r1',
          verification: 'verified',
          transferId: 't-1',
          amount: 100,
        });
        await h.writer.appendReceipt(h.intentSeq, {
          opId: 'kit-r2',
          verification: 'verified',
          transferId: 't-OTHER',
          amount: 250,
        });
        const sweep = await h.reconciler.sweep();
        ensure(sweep.quarantined.length === 1, 'effects.kill.10', 'the conflict quarantines');
        const after = await harness(options);
        after.adapter.nextBehavior = 'commit';
        await after.dispatcher.dispatch(after.intentSeq);
        await after.writer.appendReceipt(after.intentSeq, {
          opId: 'kit-r3',
          verification: 'verified',
          transferId: 't-OTHER',
          amount: 250,
        });
        const machine = (await after.writer.refresh()).machineAt(after.intentSeq);
        ensure(machine?.state === 'confirmed', 'effects.kill.10', 'the terminal stands');
        ensure(
          machine?.incidents.some((i) => i.incident === 'conflicting-duplicate') === true,
          'effects.kill.10',
          'the post-terminal conflict is a linked incident demanding disposition',
        );
        await h.writer.close();
        await after.writer.close();
      },
    },
    {
      id: 'effects.receipt.after-quarantine',
      title: 'a verified receipt after quarantine is disposition input, never a resurrection',
      async run() {
        const h = await harness(options);
        await h.writer.appendTerminal(h.intentSeq, {
          opId: 'kit-q',
          terminal: 'quarantined',
          reason: 'test',
        });
        await h.writer.appendReceipt(h.intentSeq, {
          opId: 'kit-r1',
          verification: 'verified',
          transferId: 't-1',
          amount: 100,
        });
        const machine = (await h.writer.refresh()).machineAt(h.intentSeq);
        ensure(machine?.state === 'quarantined', 'effects.kill.11', 'the terminal stands');
        ensure(
          machine?.incidents.some((i) => i.incident === 'receipt-after-terminal') === true,
          'effects.kill.11',
          'the receipt folds as a linked incident',
        );
        await h.writer.close();
      },
    },
    {
      id: 'effects.approval.stale-at-intent',
      title: 'a prior approval_expired decision voids the intent; the fold reads no wall clock',
      async run() {
        const h = await harness(options, { consume: false });
        await h.expire();
        let refused = false;
        try {
          await h.writer.consumeApprovalAndRecordIntent({
            opId: 'kit-i2',
            logicalKey: 'pay-1',
            approvalRef: 0,
            effectClass: 'monetary',
            capabilityRow: 'idempotency-key',
            argumentsHash: 'deadbeef',
            budgets: BUDGETS,
          });
        } catch {
          refused = true;
        }
        ensure(refused, 'effects.kill.12', 'the stale approval never consumes');
        await h.writer.close();
      },
    },
    {
      id: 'effects.approval.revoked-before-intent',
      title: 'a revocation at a lower position voids deterministically',
      async run() {
        const h = await harness(options, { consume: false });
        await h.revoke();
        let refused = false;
        try {
          await h.writer.consumeApprovalAndRecordIntent({
            opId: 'kit-i2',
            logicalKey: 'pay-1',
            approvalRef: 0,
            effectClass: 'monetary',
            capabilityRow: 'idempotency-key',
            argumentsHash: 'deadbeef',
            budgets: BUDGETS,
          });
        } catch {
          refused = true;
        }
        ensure(refused, 'effects.kill.13', 'the revoked approval never consumes');
        await h.writer.close();
      },
    },
    {
      id: 'effects.approval.revoked-between-intent-and-first-attempt',
      title: 'the pre-attempt re-fold cancels; no send, no compensation',
      async run() {
        const h = await harness(options);
        await h.revoke();
        const report = await h.dispatcher.dispatch(h.intentSeq);
        ensure(report.kind === 'cancelled', 'effects.kill.14', 'cancelled cleanly');
        const machine = (await h.writer.refresh()).machineAt(h.intentSeq);
        ensure(machine?.incidents.length === 0, 'effects.kill.14', 'nothing to compensate');
        ensure(h.adapter.dispatches === 0, 'effects.kill.14', 'no send happened');
        await h.writer.close();
      },
    },
    {
      id: 'effects.approval.revoked-after-confirmation',
      title: 'consumption and confirmation stand; the causal chain records both',
      async run() {
        const h = await harness(options);
        await h.dispatcher.dispatch(h.intentSeq);
        await h.revoke();
        const report = await h.dispatcher.recover(h.intentSeq);
        ensure(report.kind === 'noop', 'effects.kill.15', 'the terminal stands');
        const machine = (await h.writer.refresh()).machineAt(h.intentSeq);
        ensure(machine?.state === 'confirmed', 'effects.kill.15', 'still confirmed');
        ensure(
          machine?.postIntentCloser?.kind === 'revoked',
          'effects.kill.15',
          'the revocation is on the record for the compensation decision',
        );
        await h.writer.close();
      },
    },
    {
      id: 'effects.lease.lost-before-intent-append',
      title: 'the store refuses the superseded append; nothing is consumed',
      async run() {
        const store = await options.store();
        if (options.singleProcess === true) {
          // Single-process semantics: the check degrades to the
          // construction refusal (production mode refuses this store).
          let refused = false;
          try {
            await openEffectLane({ store, runId: RUN });
          } catch (thrown) {
            refused = thrown instanceof ConfigError;
          }
          ensure(refused, 'effects.kill.16', 'production mode refuses a non-leasable store');
          return;
        }
        await seed(store, 'pay-1');
        let rejected = false;
        try {
          await store.append(
            RUN,
            entry(2, {
              kind: 'decision',
              status: 'ok',
              value: { decisionType: 'effect_epoch', opId: 'ghost', generation: 'g' },
            }),
            { runId: RUN, owner: 'ghost', epoch: 0 },
          );
        } catch (thrown) {
          rejected = thrown instanceof LeaseHeldError;
        }
        ensure(rejected, 'effects.kill.16', 'the stale lease dies on the fence');
        const entries = await store.load(RUN);
        ensure(!entries.some((e) => e.seq === 2), 'effects.kill.16', 'nothing became visible');
      },
    },
    {
      id: 'effects.lease.lost-between-intent-and-dispatch',
      title: 'the deliberately stalled predecessor: elapsed time licenses nothing anywhere',
      async run() {
        for (const [row, qualification] of [
          ['idempotency-key', undefined],
          ['lookup', 'acceptance-closing'],
        ] as const) {
          const h = await harness(options, {
            row,
            ...(qualification === undefined ? {} : { qualification }),
          });
          h.adapter.stallNextSend = true;
          await h.dispatcher.dispatch(h.intentSeq);
          const recovered = await h.dispatcher.recover(h.intentSeq);
          ensure(
            recovered.kind === 'redispatched',
            'effects.kill.17',
            `row ${row}: the successor recovers`,
          );
          h.adapter.releaseStalled();
          ensure(
            h.adapter.effectCount('pay-1') === 1,
            'effects.kill.17',
            `row ${row}: at most one effect commits`,
          );
          ensure(h.adapter.lateFenced === 1, 'effects.kill.17', `row ${row}: the late send fenced`);
          await h.writer.close();
        }
        const neither = await harness(options, { row: 'neither' });
        neither.adapter.stallNextSend = true;
        await neither.dispatcher.dispatch(neither.intentSeq);
        const recovered = await neither.dispatcher.recover(neither.intentSeq);
        ensure(recovered.kind === 'quarantined', 'effects.kill.17', 'neither quarantines');
        neither.adapter.releaseStalled();
        ensure(
          neither.adapter.lateLandings === 1,
          'effects.kill.17',
          'the late effect LANDS, which is exactly what the quarantine record warns about',
        );
        await neither.writer.close();
      },
    },
    {
      id: 'effects.budget.attempts-exhausted',
      title: 'attempt exhaustion quarantines, never an unbounded retry loop',
      async run() {
        const h = await harness(options, { budgets: { attempts: 1 } });
        h.adapter.nextBehavior = 'fail';
        await h.dispatcher.dispatch(h.intentSeq);
        const sweep = await h.reconciler.sweep();
        ensure(sweep.quarantined.length === 1, 'effects.kill.18', 'quarantined');
        await h.writer.close();
      },
    },
    {
      id: 'effects.budget.lookup-exhausted',
      title: 'lookups are bounded separately from dispatch attempts',
      async run() {
        const h = await harness(options, {
          row: 'lookup',
          qualification: 'conditional-create',
          budgets: { lookups: 0 },
        });
        h.adapter.nextBehavior = 'drop-unknown';
        await h.dispatcher.dispatch(h.intentSeq);
        const sweep = await h.reconciler.sweep();
        ensure(sweep.quarantined.length === 1, 'effects.kill.19', 'lookup exhaustion quarantines');
        await h.writer.close();
      },
    },
    {
      id: 'effects.budget.receipt-wait-exhausted',
      title: 'awaiting-receipt past its wait budget quarantines',
      async run() {
        const h = await harness(options, { budgets: { receiptWaitMs: 1_000 } });
        h.adapter.nextBehavior = 'accept-no-receipt';
        await h.dispatcher.dispatch(h.intentSeq);
        const late = new EffectReconciler({ writer: h.writer, now: () => LATER });
        const sweep = await late.sweep();
        ensure(sweep.quarantined.length === 1, 'effects.kill.20', 'the wait exhausted');
        await h.writer.close();
      },
    },
    {
      id: 'effects.budget.reconcile-by-crossed',
      title: 'crossing reconcileBy quarantines whatever state, with the state recorded',
      async run() {
        const h = await harness(options, {
          budgets: { reconcileBy: '2026-08-24T10:01:00.000Z' },
        });
        const late = new EffectReconciler({ writer: h.writer, now: () => LATER });
        const sweep = await late.sweep();
        ensure(sweep.quarantined.length === 1, 'effects.kill.21', 'quarantined');
        ensure(
          sweep.quarantined[0]?.reason.includes("state 'intent'") === true,
          'effects.kill.21',
          'the state it was in is recorded',
        );
        await h.writer.close();
      },
    },
    {
      id: 'effects.compensation.authorization-timeout',
      title: 'a compensation waiting past its approval deadline refuses durably',
      async run() {
        const h = await harness(options);
        await h.store.append(
          RUN,
          entry(await h.nextSeq(), {
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
        const late = new EffectReconciler({ writer: h.writer, now: () => LATER });
        const sweep = await late.sweep();
        ensure(
          sweep.authorizationTimeouts === 1,
          'effects.kill.22',
          'the timed-out authorization refuses instead of waiting forever',
        );
        await h.writer.close();
      },
    },
    {
      id: 'effects.compensation.crash-during-compensation',
      title: 'a compensation replays with the same machinery and quarantines, never depth two',
      async run() {
        const h = await harness(options);
        await h.dispatcher.dispatch(h.intentSeq);
        await h.revoke();
        await seed(h.store, 'pay-1-reverse', await h.nextSeq());
        const fold = await h.writer.refresh();
        const approvalSeq = (await h.store.load(RUN)).find(
          (e) =>
            e.kind === 'approval' &&
            (e.value as { effectLogicalKey?: string } | undefined)?.effectLogicalKey ===
              'pay-1-reverse',
        )?.seq;
        ensure(approvalSeq !== undefined, 'effects.kill.23', 'the compensation approval exists');
        const compensation = await h.writer.consumeApprovalAndRecordIntent({
          opId: 'kit-comp-1',
          logicalKey: 'pay-1-reverse',
          approvalRef: approvalSeq,
          effectClass: 'monetary',
          capabilityRow: 'idempotency-key',
          argumentsHash: 'reverse',
          budgets: { ...BUDGETS, reconcileBy: '2026-08-24T10:05:00.000Z' },
          compensates: h.intentSeq,
        });
        ensure(compensation.machine.consumed, 'effects.kill.23', 'the compensation consumed');
        // The compensation cannot confirm; crossing ITS reconcileBy
        // quarantines it, and depth two is void by the fold.
        const late = new EffectReconciler({ writer: h.writer, now: () => LATER });
        const sweep = await late.sweep();
        ensure(
          sweep.quarantined.some((q) => q.intentSeq === compensation.intentSeq),
          'effects.kill.23',
          'the unconfirmable compensation quarantines',
        );
        ensure(
          fold.machineAt(h.intentSeq)?.state === 'confirmed',
          'effects.kill.23',
          'original stands',
        );
        await h.writer.close();
      },
    },
    {
      id: 'effects.epoch.stale-generation',
      title: 'an intent citing a stale epoch folds void; dead approvals never spend',
      async run() {
        const h = await harness(options, { consume: false });
        await h.writer.ensureEpoch('gen-2');
        let refused = false;
        try {
          await h.writer.consumeApprovalAndRecordIntent({
            opId: 'kit-i2',
            logicalKey: 'pay-1',
            approvalRef: 0,
            effectClass: 'monetary',
            capabilityRow: 'idempotency-key',
            argumentsHash: 'deadbeef',
            budgets: BUDGETS,
          });
          refused = false;
        } catch {
          refused = true;
        }
        // The writer cites the CURRENT epoch, so consumption under
        // gen-2 succeeds; the kill is that a FABRICATED intent citing
        // the old epoch folds void.
        ensure(!refused, 'effects.kill.24', 'the current epoch consumes');
        const old = (await h.writer.refresh()).epochs().find((e) => e.generation === 'gen-1');
        ensure(old !== undefined, 'effects.kill.24', 'the old epoch exists');
        await h.store.append(
          RUN,
          entry(await h.nextSeq(), {
            kind: 'decision',
            status: 'ok',
            value: {
              decisionType: 'effect_intent',
              opId: 'kit-stale',
              logicalKey: 'pay-stale',
              approvalRef: 0,
              epochRef: old?.seq ?? 0,
              effectClass: 'monetary',
              capabilityRow: 'idempotency-key',
              argumentsHash: 'stale',
              budgets: BUDGETS,
            },
          }),
        );
        const fold = await h.writer.refresh();
        const stale = fold.machines().find((m) => m.opId === 'kit-stale');
        ensure(
          stale?.consumed === false && stale.voidReason?.reason === 'stale-epoch',
          'effects.kill.24',
          'the stale-epoch intent folds void',
        );
        await h.writer.close();
      },
    },
    {
      id: 'effects.reconcile.after-pitr',
      title: 'the restored store wakes fenced; reconciliation quarantines the unreconstructable',
      async run() {
        const store = withRestoration(await options.store());
        await seed(store, 'pay-1');
        const writer = await openEffectLane({
          store,
          runId: RUN,
          owner: 'kit',
          ...(options.singleProcess === true ? { singleProcess: true } : {}),
          now: () => NOW,
        });
        await writer.ensureEpoch('gen-1');
        await writer.consumeApprovalAndRecordIntent({
          opId: 'kit-intent-1',
          logicalKey: 'pay-1',
          approvalRef: 0,
          effectClass: 'monetary',
          capabilityRow: 'idempotency-key',
          argumentsHash: 'deadbeef',
          budgets: BUDGETS,
        });
        store.generation = 1;
        let fenced = false;
        try {
          await writer.consumeApprovalAndRecordIntent({
            opId: 'kit-intent-2',
            logicalKey: 'pay-1',
            approvalRef: 0,
            effectClass: 'monetary',
            capabilityRow: 'idempotency-key',
            argumentsHash: 'deadbeef',
            budgets: BUDGETS,
          });
        } catch {
          fenced = true;
        }
        ensure(fenced, 'effects.kill.25', 'the post-restore window dispatches nothing');
        await writer.ensureEpoch('gen-1');
        const reconciler = new EffectReconciler({ writer, now: () => NOW });
        const report = await reconciler.reconcileRestoration({
          enumerate: async () => Promise.resolve([{ logicalKey: 'ghost' }]),
        });
        ensure(
          report.unreconstructable.includes('ghost'),
          'effects.kill.25',
          'the provider effect with no journaled intent quarantines by name',
        );
        const fold = await writer.refresh();
        ensure(fold.currentEpoch()?.reconciled === true, 'effects.kill.25', 'the epoch released');
        await writer.close();
      },
    },
    {
      id: 'effects.duplicate.second-approval-same-key',
      title: 'one canonical intent per logical key per epoch, whatever approval it cites',
      async run() {
        const h = await harness(options);
        await seed(h.store, 'pay-1', await h.nextSeq());
        const second = (await h.store.load(RUN))
          .filter(
            (e) =>
              e.kind === 'approval' &&
              (e.value as { effectLogicalKey?: string } | undefined)?.effectLogicalKey === 'pay-1',
          )
          .map((e) => e.seq)
          .sort((a, b) => b - a)[0];
        ensure(second !== undefined && second > 0, 'effects.kill.26', 'a second approval exists');
        let refused = false;
        try {
          await h.writer.consumeApprovalAndRecordIntent({
            opId: 'kit-i2',
            logicalKey: 'pay-1',
            approvalRef: second ?? 0,
            effectClass: 'monetary',
            capabilityRow: 'idempotency-key',
            argumentsHash: 'deadbeef',
            budgets: BUDGETS,
          });
        } catch {
          refused = true;
        }
        ensure(refused, 'effects.kill.26', 'two approvals never license two sends');
        ensure((await intentCount(h.store)) === 1, 'effects.kill.26', 'one canonical intent');
        await h.writer.close();
      },
    },
    {
      id: 'effects.approval.revoked-during-open-attempt',
      title: 'no row re-dispatches after the revocation, the idempotency key included',
      async run() {
        const h = await harness(options, { row: 'idempotency-key' });
        await crashAttempt(h);
        await h.revoke();
        const sends = h.adapter.dispatches;
        const report = await h.dispatcher.recover(h.intentSeq);
        ensure(
          report.kind === 'quarantined' ||
            report.kind === 'confirmed' ||
            report.kind === 'cancelled',
          'effects.kill.27',
          'recovery is reconcile-only',
        );
        ensure(h.adapter.dispatches === sends, 'effects.kill.27', 'no row re-dispatched');
        await h.writer.close();
      },
    },
    {
      id: 'effects.approval.expired-during-open-attempt',
      title: 'a proven pre-expiry execution confirms WITHOUT a compensation path',
      async run() {
        const h = await harness(options, { row: 'idempotency-key' });
        const attemptSeq = await crashAttempt(h);
        const machine = (await h.writer.refresh()).machineAt(h.intentSeq);
        ensure(machine !== undefined, 'effects.kill.28', 'machine exists');
        await h.adapter.dispatch({
          runId: RUN,
          intent: machine,
          attemptSeq,
          ordinal: 1,
          idempotencyKey: `pay-1#epoch${String(machine.epochRef)}`,
          notAfter: '2026-08-24T10:05:00.000Z',
        });
        await h.expire();
        const report = await h.dispatcher.recover(h.intentSeq);
        ensure(report.kind === 'confirmed', 'effects.kill.28', 'the execution confirms');
        const after = (await h.writer.refresh()).machineAt(h.intentSeq);
        ensure(after?.incidents.length === 0, 'effects.kill.28', 'expiry opens no compensation');
        await h.writer.close();
      },
    },
    {
      id: 'effects.approval.revoked-while-awaiting-receipt',
      title:
        'the provider accepted first: the receipt confirms and the incident opens compensation',
      async run() {
        const h = await harness(options, { row: 'idempotency-key' });
        h.adapter.nextBehavior = 'accept-no-receipt';
        await h.dispatcher.dispatch(h.intentSeq);
        await h.revoke();
        const report = await h.dispatcher.recover(h.intentSeq);
        ensure(report.kind === 'confirmed', 'effects.kill.29', 'never a blind cancel');
        const machine = (await h.writer.refresh()).machineAt(h.intentSeq);
        ensure(
          machine?.incidents.some((i) => i.incident === 'revocation-after-confirmation') === true,
          'effects.kill.29',
          'the revocation incident opens the compensation decision',
        );
        await h.writer.close();
      },
    },
    {
      id: 'effects.append.ambiguous-ack-every-transition',
      title: 'every transition append survives a lost ack without a duplicate row',
      async run() {
        const store = withAckLoss(await options.store());
        await seed(store, 'pay-1');
        const writer = await openEffectLane({
          store,
          runId: RUN,
          owner: 'kit',
          ...(options.singleProcess === true ? { singleProcess: true } : {}),
          now: () => NOW,
        });
        await writer.ensureEpoch('gen-1');
        const consumed = await writer.consumeApprovalAndRecordIntent({
          opId: 'kit-intent-1',
          logicalKey: 'pay-1',
          approvalRef: 0,
          effectClass: 'monetary',
          capabilityRow: 'idempotency-key',
          argumentsHash: 'deadbeef',
          budgets: BUDGETS,
        });
        store.loseNextAck = true;
        const attempt = await writer.openAttempt(consumed.intentSeq, {
          opId: 'kit-a1',
          notAfter: '2026-08-24T10:05:00.000Z',
        });
        ensure(!attempt.cancelled, 'effects.kill.30', 'the attempt landed once');
        if (attempt.cancelled) {
          return;
        }
        store.loseNextAck = true;
        await writer.appendOutcome(consumed.intentSeq, attempt.attemptSeq, {
          opId: 'kit-o1',
          outcome: 'accepted',
        });
        store.loseNextAck = true;
        await writer.appendReceipt(consumed.intentSeq, {
          opId: 'kit-r1',
          verification: 'verified',
          transferId: 't-1',
          amount: 100,
        });
        store.loseNextAck = true;
        await writer.appendTerminal(consumed.intentSeq, { opId: 'kit-t1', terminal: 'confirmed' });
        store.loseNextAck = true;
        await writer.appendDisposition(consumed.intentSeq, {
          opId: 'kit-d1',
          principal: 'op',
          reason: 'review',
          disposition: 'accepted',
        });
        const machine = (await writer.refresh()).machineAt(consumed.intentSeq);
        ensure(
          machine?.attempts.length === 1 &&
            machine.receipts.length === 1 &&
            machine.dispositions.length === 1 &&
            machine.state === 'confirmed',
          'effects.kill.30',
          'no duplicate transition rows, no fabricated open attempt, no early exhaustion',
        );
        await writer.close();
      },
    },
    {
      id: 'effects.region.loss',
      title: 'a foreign scope consumes nothing: the lane is per run, per epoch, fail closed',
      async run() {
        // The admission-layer region row (RFC section 7 of the
        // admission RFC) belongs to the durable admission kit; the
        // effect lane's half is that an intent for a key nothing
        // licensed folds void and consumes no approval.
        const h = await harness(options, { consume: false });
        let refused = false;
        try {
          await h.writer.consumeApprovalAndRecordIntent({
            opId: 'kit-foreign',
            logicalKey: 'pay-FOREIGN',
            approvalRef: 0,
            effectClass: 'monetary',
            capabilityRow: 'idempotency-key',
            argumentsHash: 'deadbeef',
            budgets: BUDGETS,
          });
        } catch {
          refused = true;
        }
        ensure(refused, 'effects.region.loss', 'the unlicensed key never consumes');
        ensure((await intentCount(h.store)) === 0, 'effects.region.loss', 'nothing consumed');
        await h.writer.close();
      },
    },
  ];
  return makeSuite('effects-kill-point-conformance', checks);
}
