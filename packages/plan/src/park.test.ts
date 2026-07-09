import { describe, expect, it } from 'vitest';
import { createEngine, InMemoryStore, tool } from '@lurker/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned } from './plan-runner.js';
import {
  DEFAULT_MAX_PINNED_WORKTREES,
  parkDispositionOf,
  PinLedger,
  unparkPlacementOf,
} from './park.js';
import type { PlanRevisionValue } from './plan-entries.js';
import { agentTypeOf, scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const EMPTY_PLAN_HASH = planHash(emptyPlan());

describe('PinLedger and dispositions (docs/03, 11.2)', () => {
  it('counts retained worktrees and enforces the shared cap', () => {
    const abandons = Array.from({ length: 4 }, (_, index) => ({
      hashVersion: 2,
      seq: index + 1,
      scope: '',
      key: '',
      ordinal: 0,
      kind: 'abandon' as const,
      status: 'ok' as const,
      spanId: 's',
      startedAt: 't',
      ref: index + 100,
      abandon: {
        target: index + 100,
        authorizedBy: 1,
        nodeId: `N${String(index)}`,
        reason: 'park_task',
        retainWorktree: true,
      },
    }));
    const ledger = PinLedger.fold(abandons);
    expect(ledger.count).toBe(4);
    expect(ledger.hasCapacity(DEFAULT_MAX_PINNED_WORKTREES)).toBe(false);
    expect(ledger.isPinnedNode('N2')).toBe(true);
    // Overflow: the park keeps the checkpoint but drops the worktree.
    const overflow = parkDispositionOf({ kind: 'worktree' }, ledger);
    expect(overflow).toEqual({ retainCheckpoint: true, retainWorktree: false });
    const withRoom = parkDispositionOf({ kind: 'worktree' }, PinLedger.fold([]));
    expect(withRoom.retainWorktree).toBe(true);
    // Non-worktree isolation never pins.
    expect(parkDispositionOf('none', PinLedger.fold([])).retainWorktree).toBe(false);
  });

  it('computes unpark placement: continuation, dropped-tree restart, no-checkpoint restart', () => {
    expect(
      unparkPlacementOf({ checkpointRef: 9, transcriptRef: 'ckpt/9', worktreePinned: false }),
    ).toEqual({ restart: false, bootCheckpointRef: 'ckpt/9' });
    expect(
      unparkPlacementOf({
        checkpointRef: 9,
        transcriptRef: 'ckpt/9',
        isolation: { kind: 'worktree' },
        worktreePinned: false,
      }),
    ).toEqual({ restart: true });
    expect(
      unparkPlacementOf({
        checkpointRef: 9,
        transcriptRef: 'ckpt/9',
        isolation: { kind: 'worktree' },
        worktreePinned: true,
      }),
    ).toEqual({ restart: false, bootCheckpointRef: 'ckpt/9' });
    expect(unparkPlacementOf({ worktreePinned: false })).toEqual({ restart: true });
  });
});

describe('park-unpark integration (round-2 cassette shape)', () => {
  it('parks a running node with its checkpoint and unparks into a continuation', async () => {
    // Sequencing: the worker finishes ONE tool turn (a boundary
    // checkpoint lands), signals turn two, and parks in its stream; the
    // orchestrator's park revise waits for that signal.
    let signalTurnTwo!: () => void;
    const inTurnTwo = new Promise<void>((resolve) => {
      signalTurnTwo = resolve;
    });
    const echo = tool({
      name: 'echo',
      description: 'returns a marker',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
      execute: () => Promise.resolve('ECHO_MARKER_RESULT'),
    });
    let workerStreams = 0;
    let phase = 0;
    let nodeId: string | undefined;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        workerStreams += 1;
        if (workerStreams === 1) {
          return { toolCall: { name: 'echo', args: {} } };
        }
        if (workerStreams === 2) {
          signalTurnTwo();
          return { hangUntilAborted: true };
        }
        // The unparked continuation: the booted history carries the
        // paid first turn (its tool result), never re-invoking echo.
        const history = JSON.stringify(req.messages);
        return { text: history.includes('ECHO_MARKER_RESULT') ? 'continued fine' : 'HISTORY LOST' };
      }
      for (const msg of req.messages) {
        for (const part of msg.parts) {
          if (part.type === 'tool-result') {
            const value = part.result as { assignedNodeIds?: Record<string, string> };
            nodeId ??= value?.assignedNodeIds?.['0'];
          }
        }
      }
      phase += 1;
      if (phase === 1) {
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
              ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'long work' } }],
              rationale: 'start',
            },
          },
        };
      }
      if (phase === 2) {
        return {
          awaitPromise: inTurnTwo,
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
              ops: [{ op: 'park_task', nodeId }],
              rationale: 'park it at the boundary',
            },
          },
        };
      }
      if (phase === 3) {
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
        };
      }
      if (phase === 4) {
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
              ops: [{ op: 'unpark_task', nodeId }],
              rationale: 'resume it',
            },
          },
        };
      }
      if (phase === 5) {
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'parked and resumed' } } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'worker', tools: [echo] } },
      },
    });
    const handle = orchestratePlanned(engine, 'park test', { budget: { capUsd: 5 } });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load(handle.runId);
    // The park landed as an engine decision carrying the checkpoint
    // anchor; the branch was severed with the checkpoint retained.
    const parkLanded = entries.find(
      (entry) =>
        entry.kind === 'plan.decision' &&
        (entry.value as { origin?: string }).origin === 'park-landed',
    );
    expect(parkLanded).toBeDefined();
    const parkOp = (parkLanded!.value as { ops: Array<{ to: string; checkpointRef?: number }> })
      .ops[0];
    expect(parkOp).toMatchObject({ to: 'parked' });
    expect(parkOp?.checkpointRef).toBeDefined();
    const parkAbandon = entries.find(
      (entry) => entry.kind === 'abandon' && entry.abandon?.reason === 'park_task',
    );
    expect(parkAbandon).toBeDefined();
    expect(parkAbandon?.abandon?.retainCheckpoint).toBe(true);

    // The unpark admission is an embedded lineage rebirth.
    const revisions = entries.filter((entry) => entry.kind === 'plan.revision');
    const unparkRevision = revisions.find((entry) =>
      JSON.stringify(entry.value).includes('unpark_task'),
    );
    const unparkValue = unparkRevision?.value as unknown as PlanRevisionValue;
    expect(unparkValue.admissions[0]?.decision.lineage).toMatchObject({
      relation: 'unpark-restart',
    });
    // The continuation booted from the retained checkpoint: the third
    // worker stream saw the paid first turn and echoed no history loss.
    expect(workerStreams).toBe(3);
    const finalWorker = entries.filter(
      (entry) =>
        entry.kind === 'agent' &&
        entry.scope.startsWith('plan/') &&
        entry.status === 'ok' &&
        entry.ref !== undefined,
    );
    expect(JSON.stringify(finalWorker.at(-1)?.value)).toContain('continued fine');
  });
});
