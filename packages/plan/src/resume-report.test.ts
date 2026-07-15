/**
 * The v1.7.0 follow-up review's PlanRunner replay shape: a fully
 * successful replay previously reported termination.init, ordinary
 * decisions, plan.revision/plan.decision entries, settled agent roots,
 * and the resolved wake suspension as `orphaned`. Under the pairing
 * rules a clean replay must read clean.
 */
import { describe, expect, it } from 'vitest';
import { createEngine, InMemoryStore, makeOrchestratorWorkflow } from '@rulvar/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned, planRunner } from './plan-runner.js';
import { agentTypeOf, scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const EMPTY_PLAN_HASH = planHash(emptyPlan());

function twoWorkerScript(): (req: import('@rulvar/core').ChatRequest) => ScriptedTurn {
  let phase = 0;
  return (req) => {
    if (agentTypeOf(req) === 'worker') {
      return { text: 'worker done' };
    }
    phase += 1;
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [
              { op: 'add_task', spec: { agentType: 'worker', prompt: 'part one' } },
              { op: 'add_task', spec: { agentType: 'worker', prompt: 'part two' } },
            ],
            rationale: 'two workers',
          },
        },
      };
    }
    if (phase === 2) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'both parts done' } } };
  };
}

function engineWith(adapter: ReturnType<typeof scriptedAdapter>, store: InMemoryStore) {
  return createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: {
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: { worker: { description: 'w' } },
    },
  });
}

describe('ResumeReport over a successful PlanRunner replay', () => {
  it('two settled nodes and a resolved wake report no orphaned refs', async () => {
    const store = new InMemoryStore();
    const life1 = orchestratePlanned(
      engineWith(scriptedAdapter(twoWorkerScript()), store),
      'clean replay',
      { budget: { capUsd: 5, finalizeReserveUsd: 1 } },
    );
    const first = await life1.result;
    expect(first.status).toBe('ok');
    const entries = await store.load(life1.runId);
    // The shape under test: both nodes settled, the wake suspension has
    // its winning resolution, revisions and decisions journaled.
    expect(
      entries.filter((entry) => entry.kind === 'agent' && entry.status === 'ok').length,
    ).toBeGreaterThanOrEqual(2);
    expect(entries.some((entry) => entry.status === 'suspended')).toBe(true);
    expect(entries.some((entry) => entry.kind === 'resolution')).toBe(true);
    expect(entries.some((entry) => entry.kind === 'plan.revision')).toBe(true);
    expect(entries.some((entry) => entry.kind === 'termination.init')).toBe(true);

    const adapter2 = scriptedAdapter(twoWorkerScript());
    const handle = engineWith(adapter2, store).resume(
      life1.runId,
      makeOrchestratorWorkflow('clean replay', {
        budget: { capUsd: 5, finalizeReserveUsd: 1 },
        extension: planRunner({}),
      }),
    );
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(adapter2.calls).toHaveLength(0);
    const preview = await handle.preview;
    expect(preview.hits).toBeGreaterThan(0);
    expect(preview).toMatchObject({ misses: 0, reruns: 0, orphaned: [] });
  });
});
