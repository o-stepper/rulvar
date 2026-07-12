import { describe, expect, it } from 'vitest';
import { createEngine, InMemoryStore } from '@rulvar/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned } from './plan-runner.js';
import type { PlanRevisionValue } from './plan-entries.js';
import { agentTypeOf, scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const EMPTY_PLAN_HASH = planHash(emptyPlan());

describe('reuse-by-reference integration (DEF-5; M7-T07)', () => {
  it('compiles cancel_task into abandon and embeds the DedupNote on the re-add', async () => {
    // The FIRST worker stream parks until its abort lands, so the sever
    // always interrupts the child mid-turn (deterministic cancelled).
    let workerCalls = 0;
    let phase = 0;
    let firstNodeId: string | undefined;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        workerCalls += 1;
        return workerCalls === 1 ? { hangUntilAborted: true } : { text: 'fresh run done' };
      }
      // Track the first assigned NodeId from prior tool results.
      for (const msg of req.messages) {
        for (const part of msg.parts) {
          if (part.type === 'tool-result') {
            const value = part.result as { assignedNodeIds?: Record<string, string> };
            const assigned = value?.assignedNodeIds?.['0'];
            if (assigned !== undefined && firstNodeId === undefined) {
              firstNodeId = assigned;
            }
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
              ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'long job' } }],
              rationale: 'start the long job',
            },
          },
        };
      }
      if (phase === 2) {
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
              ops: [{ op: 'cancel_task', nodeId: firstNodeId, reason: 'changed direction' }],
              rationale: 'cancel it mid-flight',
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
        // Byte-identical re-add: the severed donor has zero paid
        // completed entries, so the verdict is a fresh admit with the
        // embedded DedupNote.
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
              ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'long job' } }],
              rationale: 'byte-identical re-add',
            },
          },
        };
      }
      if (phase === 5) {
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'reused' } } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'worker' } },
      },
    });
    const handle = orchestratePlanned(engine, 'reuse test', { budget: { capUsd: 5 } });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load(handle.runId);
    // The cancel compiled into a severing abandon over the dispatched
    // root, carrying node and lineage attribution (XF-04).
    const abandons = entries.filter((entry) => entry.kind === 'abandon');
    expect(abandons.length).toBeGreaterThanOrEqual(1);
    expect(abandons[0]?.abandon).toMatchObject({ nodeId: firstNodeId, reason: 'cancel_task' });
    expect(abandons[0]?.abandon?.logicalTaskId).toBeDefined();

    // cancel-landed decision preceded the abandon.
    const cancelLanded = entries.find(
      (entry) =>
        entry.kind === 'plan.decision' &&
        (entry.value as { origin?: string }).origin === 'cancel-landed',
    );
    expect(cancelLanded).toBeDefined();
    expect(cancelLanded!.seq).toBeLessThan(abandons[0].seq);

    // The re-add embedded a fresh-admit DedupNote (no paid entries).
    const revisions = entries.filter((entry) => entry.kind === 'plan.revision');
    const reAdd = revisions.at(-1)?.value as unknown as PlanRevisionValue;
    const admission = reAdd.admissions[0];
    expect(admission?.decision.verdict).toMatchObject({
      kind: 'admit',
      dedup: { reason: 'no_paid_entries' },
    });
    // The fresh node ran live to done.
    const planRoots = entries.filter(
      (entry) =>
        entry.kind === 'agent' && entry.scope.startsWith('plan/') && entry.ref === undefined,
    );
    expect(planRoots).toHaveLength(2);
  });
});
