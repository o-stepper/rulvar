import { describe, expect, it } from 'vitest';
import {
  createEngine,
  InMemoryStore,
  makeOrchestratorWorkflow,
  type ChatEvent,
  type ChatRequest,
  type ModelCaps,
  type ProviderAdapter,
  type Usage,
} from '@lurker/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned, planRunner } from './plan-runner.js';
import type { PlanViewRender } from './tools.js';

interface ScriptedTurn {
  text?: string;
  toolCall?: { name: string; args: unknown };
}

const CAPS: ModelCaps = {
  structuredOutput: 'native',
  supportsTemperature: false,
  supportsParallelTools: true,
  reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
  contextWindow: 200_000,
  maxOutputTokens: 4_096,
  pricing: { inputUsdPerMTok: 1, outputUsdPerMTok: 10 },
};

const USAGE: Usage = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 };

/** A minimal scripted adapter over the PUBLIC provider SPI. */
function scriptedAdapter(
  script: (req: ChatRequest, call: number) => ScriptedTurn,
): ProviderAdapter & { calls: ChatRequest[] } {
  const calls: ChatRequest[] = [];
  return {
    id: 'fake',
    calls,
    caps: () => CAPS,
    // eslint-disable-next-line @typescript-eslint/require-await
    async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
      const call = calls.length;
      calls.push(req);
      const turn = script(req, call);
      if (turn.text !== undefined) {
        yield { type: 'text-delta', text: turn.text };
      }
      if (turn.toolCall !== undefined) {
        const id = `id-${String(call)}`;
        yield { type: 'tool-call-start', id, name: turn.toolCall.name };
        yield { type: 'tool-call-end', id, args: turn.toolCall.args };
      }
      yield { type: 'finish', finish: { reason: 'stop' }, usage: USAGE };
    },
  };
}

function agentTypeOf(req: ChatRequest): string {
  const lurker = (req.providerOptions as { lurker?: { agentType?: string } } | undefined)?.lurker;
  return lurker?.agentType ?? '';
}

/** Extracts the latest tool result carrying the given marker fields. */
function lastToolResult<T>(req: ChatRequest, marker: (value: T) => boolean): T | undefined {
  let found: T | undefined;
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const value = part.result as T;
        if (marker(value)) {
          found = value;
        }
      }
    }
  }
  return found;
}

const EMPTY_PLAN_HASH = planHash(emptyPlan());

function orchestratorScript(): (req: ChatRequest, call: number) => ScriptedTurn {
  let phase = 0;
  return (req: ChatRequest): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      const prompt = JSON.stringify(req.messages[0]?.parts ?? []);
      return { text: `done: ${prompt.includes('task one') ? 'one' : 'other'}` };
    }
    phase += 1;
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [
              { op: 'add_task', spec: { agentType: 'worker', prompt: 'task one' } },
              { op: 'add_task', spec: { agentType: 'worker', prompt: 'task two' }, deps: ['@0'] },
            ],
            rationale: 'initial decomposition',
          },
        },
      };
    }
    if (phase === 2) {
      // Repair the dep reference: the first revise result carries the
      // assigned NodeIds; wire task two onto task one for real.
      const revise = lastToolResult<{ assignedNodeIds?: Record<string, string> }>(
        req,
        (value) => value?.assignedNodeIds !== undefined,
      );
      const first = revise?.assignedNodeIds?.[0];
      const second = revise?.assignedNodeIds?.[1];
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'rewire_deps', nodeId: second, deps: [first] }],
            rationale: 'wire the dependency',
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
      return { toolCall: { name: 'plan_view', args: {} } };
    }
    if (phase === 5) {
      // Mid-run revision from the woken snapshot: add a third task.
      const digest = lastToolResult<{ digestSeq?: number; planHash?: string }>(
        req,
        (value) => value?.digestSeq !== undefined && typeof value.planHash === 'string',
      );
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: digest?.digestSeq, planHash: digest?.planHash },
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'task three' } }],
            rationale: 'revise mid-run',
          },
        },
      };
    }
    if (phase === 6) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: { done: true } } } };
  };
}

describe('PlanRunner (M7-T05): the engine schedules, the model revises', () => {
  it('runs the revise-mid-run shape end to end with termination accounting', async () => {
    const adapter = scriptedAdapter(orchestratorScript());
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'does one task' } },
      },
    });
    const handle = orchestratePlanned(engine, 'ship the feature', {
      budget: { capUsd: 5 },
      plan: { maxRevisionsPerRun: 8 },
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({ done: true });

    const entries = await store.load(handle.runId);
    // termination.init written strictly before the first plan entry
    // and before the orchestrator's first agent entry (docs/07, 11.6).
    const init = entries.find((entry) => entry.kind === 'termination.init');
    const firstAgent = entries.find((entry) => entry.kind === 'agent');
    const firstPlan = entries.find(
      (entry) => entry.kind === 'plan.revision' || entry.kind === 'plan.decision',
    );
    expect(init).toBeDefined();
    expect(init!.seq).toBeLessThan(firstAgent!.seq);
    expect(init!.seq).toBeLessThan(firstPlan!.seq);

    // Three plan.revision entries with monotone revision debits.
    const revisions = entries.filter((entry) => entry.kind === 'plan.revision');
    expect(revisions).toHaveLength(3);
    const balances = revisions.map(
      (entry) => (entry.value as { revisionUnitsAfter?: number }).revisionUnitsAfter,
    );
    expect(balances).toEqual([7, 6, 5]);

    // The ENGINE scheduled children under plan/NodeId scopes.
    const childRoots = entries.filter(
      (entry) =>
        entry.kind === 'agent' && entry.scope.startsWith('plan/') && entry.status === 'running',
    );
    expect(childRoots).toHaveLength(3);
    // Terminal transitions landed as plan.decision entries (running then
    // done per node: 3 running starts, 3 child-result terminals).
    const decisions = entries.filter((entry) => entry.kind === 'plan.decision');
    expect(decisions.length).toBeGreaterThanOrEqual(6);

    // The pinned plan_view of the woken turn shows the first two tasks
    // done and does NOT contain task three (added later): pinning.
    const planViewCall = adapter.calls.find((req) =>
      JSON.stringify(req.messages).includes('"revisionCount":2'),
    );
    expect(planViewCall).toBeDefined();
    const view = lastToolResult<PlanViewRender>(
      planViewCall!,
      (value) =>
        (value as { planHash?: string })?.planHash !== undefined && Array.isArray(value.nodes),
    );
    expect(view!.nodes).toHaveLength(2);
    expect(view!.nodes.every((node) => node.status === 'done')).toBe(true);
    expect(view!.termination.revisionUnitsRemaining).toBe(6);
  });

  it('resumes with zero live calls and identical plan state (crash-during-revision shape)', async () => {
    const adapter = scriptedAdapter(orchestratorScript());
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'does one task' } },
      },
    });
    const goal = 'ship the feature';
    const first = orchestratePlanned(engine, goal, { budget: { capUsd: 5 }, plan: { maxRevisionsPerRun: 8 } });
    const outcome = await first.result;
    expect(outcome.status).toBe('ok');
    const entriesBefore = (await store.load(first.runId)).length;

    // Resume on a FRESH engine over the same store: everything forward
    // matches; the resumed adapter must never be called.
    const resumedAdapter = scriptedAdapter(() => {
      throw new Error('resume must not go live');
    });
    const resumedEngine = createEngine({
      adapters: [resumedAdapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'does one task' } },
      },
    });
    const resumed = resumedEngine.resume(
      first.runId,
      makeOrchestratorWorkflow(goal, { budget: { capUsd: 5 }, extension: planRunner({ maxRevisionsPerRun: 8 }) }),
    );
    const resumedOutcome = await resumed.result;
    expect(resumedOutcome.status).toBe('ok');
    expect(resumedOutcome.value).toEqual({ done: true });
    expect(resumedAdapter.calls).toHaveLength(0);
    const entriesAfter = (await store.load(first.runId)).length;
    // No duplicate termination.init, revisions, or decisions.
    expect(entriesAfter).toBe(entriesBefore);
  });
});
