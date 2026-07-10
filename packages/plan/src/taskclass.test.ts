/**
 * TaskSpec.taskClass through PlanRunner (M10-T05; docs/05, section
 * "Phases and placement"; docs/14, OQ-12): the author-declared class
 * journals inside the plan.revision requestedOps (the durable spec of
 * record) and rides the dispatch spec for the M11 consumers; absence
 * is unclassified and stores no literal string anywhere.
 */
import { describe, expect, it } from 'vitest';
import { createEngine, InMemoryStore } from '@lurker/core';
import type { ChatRequest } from '@lurker/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned } from './plan-runner.js';
import { agentTypeOf, scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const EMPTY_PLAN_HASH = planHash(emptyPlan());

describe('taskClass binding through PlanRunner (M10-T05; OQ-12)', () => {
  it('journals the declared class in the revision and none when absent', async () => {
    let phase = 0;
    const adapter = scriptedAdapter((req: ChatRequest): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'done' };
      }
      phase += 1;
      if (phase === 1) {
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
              ops: [
                {
                  op: 'add_task',
                  spec: { agentType: 'worker', prompt: 'classified', taskClass: 'extraction' },
                },
                { op: 'add_task', spec: { agentType: 'worker', prompt: 'unclassified' } },
              ],
              rationale: 'one classified, one not',
            },
          },
        };
      }
      if (phase === 2) {
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'ok' } } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'w' } },
      },
    });
    const handle = orchestratePlanned(engine, 'taskClass plumbing', {
      budget: { capUsd: 5, finalizeReserveUsd: 1 },
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load(handle.runId);
    const revision = entries.find((entry) => entry.kind === 'plan.revision');
    expect(revision).toBeDefined();
    const ops = (
      revision?.value as {
        requestedOps: Array<{ spec?: { prompt: string; taskClass?: string } }>;
      }
    ).requestedOps;
    const classified = ops.find((op) => op.spec?.prompt === 'classified');
    const unclassified = ops.find((op) => op.spec?.prompt === 'unclassified');
    expect(classified?.spec?.taskClass).toBe('extraction');
    expect('taskClass' in (unclassified?.spec ?? {})).toBe(false);
    // Both nodes ran to done: the declared class never gates phase-1
    // execution (card recommendations do not exist yet, and floors stay
    // profile-driven per docs/04).
    const workers = entries.filter(
      (entry) => entry.kind === 'agent' && entry.scope.startsWith('plan/') && entry.status === 'ok',
    );
    expect(workers.length).toBeGreaterThanOrEqual(2);
  });
});
