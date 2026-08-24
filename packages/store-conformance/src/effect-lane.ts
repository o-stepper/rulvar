/**
 * Effect lane store conformance (plan 45, rfcs/effects.md section 4.5,
 * item 3): the executable definition of the EffectLaneStore capability
 * and of the writer-store COMPOSITION the RFC's fencing argument rests
 * on. The store half: a restoration generation that lives outside the
 * journal bytes, starts at 0, and bumps monotonically. The composition
 * half: a bumped generation disables every lane append until a fresh
 * epoch cites it (the kill point 25 window), and a lane append under a
 * non-current lease dies on the store's fence with nothing consumed
 * (the kill point 16 shape) — the store cannot recognize lane traffic
 * (obligation A4), so the unleased-append prohibition is enforced by
 * the writer's construction, and THIS suite is where the composition
 * is proven over the real store.
 */
import {
  CURRENT_HASH_VERSION,
  LeaseHeldError,
  openEffectLane,
  type EffectLaneStore,
  type JournalEntry,
} from '@rulvar/core';

import { ensure, makeSuite, type ConformanceSuite, type StoreFactory } from './types.js';

/** The store shape under test: the capability plus the restore verb. */
export interface RestorableEffectLaneStore extends EffectLaneStore {
  bumpRestorationGeneration(): Promise<number>;
}

const NOW = '2026-08-24T10:00:00.000Z';

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

const seedApproval = async (
  store: EffectLaneStore,
  runId: string,
  seq: number,
  licensedKey: string,
): Promise<void> => {
  await store.append(
    runId,
    entry(seq, {
      kind: 'approval',
      status: 'suspended',
      deadlineAt: '2026-08-24T12:00:00.000Z',
      value: { flavor: 'approval', toolName: 'payout', effectLogicalKey: licensedKey },
    }),
  );
  await store.append(
    runId,
    entry(seq + 1, {
      kind: 'resolution',
      status: 'ok',
      ref: seq,
      resolution: { target: seq, by: 'external', value: { decision: 'allow' } },
    }),
  );
};

const BUDGETS = {
  attempts: 3,
  lookups: 5,
  receiptWaitMs: 60_000,
  reconcileBy: '2026-08-25T00:00:00.000Z',
};

export function effectLaneStoreConformance(
  factory: StoreFactory<RestorableEffectLaneStore>,
): ConformanceSuite {
  return makeSuite('effect-lane-store-conformance', [
    {
      id: 'ELS1',
      title: 'the restoration generation starts at 0 and reads stably',
      async run() {
        const store = await factory();
        ensure(store.effectLane === true, 'ELS1', 'the store must declare effectLane: true');
        ensure(
          (await store.restorationGeneration()) === 0,
          'ELS1',
          'a store no restore ever touched must report generation 0',
        );
        ensure(
          (await store.restorationGeneration()) === 0,
          'ELS1',
          'the read must be stable across calls',
        );
      },
    },
    {
      id: 'ELS2',
      title: 'the bump is monotonic and durable in the same database',
      async run() {
        const store = await factory();
        ensure(
          (await store.bumpRestorationGeneration()) === 1,
          'ELS2',
          'the first bump must return 1',
        );
        ensure(
          (await store.bumpRestorationGeneration()) === 2,
          'ELS2',
          'the second bump must return 2 (monotonic, never a reset)',
        );
        ensure(
          (await store.restorationGeneration()) === 2,
          'ELS2',
          'the read after two bumps must be 2',
        );
      },
    },
    {
      id: 'ELS3',
      title: 'a bumped generation disables the lane until a fresh epoch cites it (kill 25)',
      async run() {
        const store = await factory();
        const runId = 'ELS3-RUN';
        await seedApproval(store, runId, 0, 'pay-1');
        const writer = await openEffectLane({
          store,
          runId,
          owner: 'els3',
          now: () => NOW,
        });
        try {
          await writer.ensureEpoch('gen-1');
          const consumed = await writer.consumeApprovalAndRecordIntent({
            opId: 'els3-intent-1',
            logicalKey: 'pay-1',
            approvalRef: 0,
            effectClass: 'monetary',
            capabilityRow: 'idempotency-key',
            argumentsHash: 'deadbeef',
            budgets: BUDGETS,
          });
          ensure(consumed.machine.consumed, 'ELS3', 'the pre-restore consumption must land');
          // The restore: the bump happens BEFORE the restored data is
          // reachable; here the same handle simulates the window.
          await store.bumpRestorationGeneration();
          let refused: unknown;
          try {
            await writer.consumeApprovalAndRecordIntent({
              opId: 'els3-intent-2',
              logicalKey: 'pay-1',
              approvalRef: 0,
              effectClass: 'monetary',
              capabilityRow: 'idempotency-key',
              argumentsHash: 'deadbeef',
              budgets: BUDGETS,
            });
          } catch (thrown) {
            refused = thrown;
          }
          ensure(
            (refused as { rule?: string } | undefined)?.rule === 'restoration-generation-stale',
            'ELS3',
            'the post-restore window must refuse every lane append typed',
          );
          const fresh = await writer.ensureEpoch('gen-1');
          ensure(!fresh.replayed, 'ELS3', 'the operator epoch append must be a new entry');
          ensure(
            writer.view().currentEpoch()?.restorationGeneration === 1,
            'ELS3',
            'the fresh epoch must cite the bumped generation',
          );
        } finally {
          await writer.close();
        }
      },
    },
    {
      id: 'ELS4',
      title:
        'a lane append under a non-current lease dies on the fence, nothing consumed (kill 16)',
      async run() {
        const store = await factory();
        const runId = 'ELS4-RUN';
        await seedApproval(store, runId, 0, 'pay-1');
        const lease = await store.acquire(runId, 'holder');
        try {
          let refused: unknown;
          try {
            await store.append(
              runId,
              entry(2, {
                kind: 'decision',
                status: 'ok',
                value: {
                  decisionType: 'effect_epoch',
                  opId: 'ghost-epoch',
                  generation: 'gen-ghost',
                },
              }),
              { runId, owner: 'ghost', epoch: 0 },
            );
          } catch (thrown) {
            refused = thrown;
          }
          ensure(
            refused instanceof LeaseHeldError,
            'ELS4',
            'a lane append carrying a non-current lease must reject with LeaseHeldError',
          );
          const entries = await store.load(runId);
          ensure(
            !entries.some((e) => e.seq === 2),
            'ELS4',
            'the fenced-off append must never become visible',
          );
        } finally {
          await store.release(lease);
        }
      },
    },
  ]);
}
