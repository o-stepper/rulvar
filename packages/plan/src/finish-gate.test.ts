/**
 * The PlanRunner finish gate (RV3202, the 2026-08-11 four-agent
 * experiment's PlanRunner blocker): quiescence used to gate WAKES only,
 * so a coordination model could call finish over a still-running plan
 * node and, without an acceptance policy, settle a bare ok while the
 * exit barrier cancelled the node. The gate refuses that finish typed,
 * naming the stragglers, and `allowEarlyFinish: true` restores the old
 * behavior deliberately.
 */
import { describe, expect, it } from 'vitest';
import {
  createEngine,
  InMemoryStore,
  type ChatEvent,
  type ChatRequest,
  type ModelCaps,
  type ProviderAdapter,
  type Usage,
} from '@rulvar/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned } from './plan-runner.js';

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

const EMPTY_PLAN_HASH = planHash(emptyPlan());

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

/** Finds a tool-result part whose JSON rendering contains the marker. */
function sawToolResult(calls: ChatRequest[], marker: string): boolean {
  return calls.some((req) =>
    req.messages.some((msg) =>
      msg.parts.some(
        (part) => part.type === 'tool-result' && JSON.stringify(part.result).includes(marker),
      ),
    ),
  );
}

/**
 * A scripted adapter whose WORKER calls hang until released (or until
 * the engine aborts them), so the coordination turns race a genuinely
 * running plan node.
 */
function hangingWorkerAdapter(
  coordination: (req: ChatRequest, turn: number) => ScriptedTurn,
): ProviderAdapter & { calls: ChatRequest[]; releaseWorker: () => void } {
  const calls: ChatRequest[] = [];
  let release: (() => void) | undefined;
  let released = false;
  const releaseWorker = (): void => {
    released = true;
    release?.();
  };
  let coordinationTurns = 0;
  return {
    id: 'fake',
    calls,
    releaseWorker,
    caps: () => CAPS,
    async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
      calls.push(req);
      if (agentTypeOf(req) === 'worker') {
        if (!released) {
          await new Promise<void>((resolve) => {
            release = resolve;
            if (signal?.aborted) {
              resolve();
              return;
            }
            signal?.addEventListener('abort', () => resolve(), { once: true });
          });
        }
        if (signal?.aborted) {
          throw new Error('worker aborted');
        }
        yield { type: 'text-delta', text: 'worker done' };
        yield { type: 'finish', finish: { reason: 'stop' }, usage: USAGE };
        return;
      }
      coordinationTurns += 1;
      const turn = coordination(req, coordinationTurns);
      if (turn.text !== undefined) {
        yield { type: 'text-delta', text: turn.text };
      }
      if (turn.toolCall !== undefined) {
        const id = `id-${String(calls.length)}`;
        yield { type: 'tool-call-start', id, name: turn.toolCall.name };
        yield { type: 'tool-call-end', id, args: turn.toolCall.args };
      }
      yield { type: 'finish', finish: { reason: 'stop' }, usage: USAGE };
    },
  };
}

const ADD_TASK: ScriptedTurn = {
  toolCall: {
    name: 'plan_revise',
    args: {
      base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
      ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'task one' } }],
      rationale: 'one task',
    },
  },
};

function buildEngine(adapter: ProviderAdapter, store: InMemoryStore) {
  return createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: {
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: { worker: { description: 'does one task' } },
    },
  });
}

describe('the PlanRunner finish gate (RV3202)', () => {
  it('refuses finish over a running node, names it, and admits the finish after quiescence', async () => {
    const adapter = hangingWorkerAdapter((req, turn) => {
      if (turn === 1) {
        return ADD_TASK;
      }
      if (turn === 2) {
        // The node is running (the worker hangs): this finish must be
        // refused with the straggler named, spending a normal turn.
        return { toolCall: { name: 'finish', args: { result: { done: 'early' } } } };
      }
      if (turn === 3) {
        // The refusal told us to wait; release the worker once the
        // wait is issued so quiescence can fire.
        setTimeout(() => {
          adapter.releaseWorker();
        }, 25);
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
        };
      }
      return { toolCall: { name: 'finish', args: { result: { done: true } } } };
    });
    const store = new InMemoryStore();
    const engine = buildEngine(adapter, store);
    const handle = orchestratePlanned(engine, 'gate demo', {
      budget: { capUsd: 5 },
      plan: { maxRevisionsPerRun: 4 },
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({ done: true });
    // The refusal reached the model as the finish tool's error result,
    // with the straggler named and the remedies spelled out.
    expect(sawToolResult(adapter.calls, 'finish refused')).toBe(true);
    expect(sawToolResult(adapter.calls, 'wait_for_events')).toBe(true);
    // The node was never cancelled: it settled AFTER the refusal, so
    // its agent terminal under the plan scope reads ok.
    const entries = await store.load(handle.runId);
    const planAgents = entries.filter(
      (entry) => entry.kind === 'agent' && entry.scope.startsWith('plan/'),
    );
    expect(planAgents.some((entry) => entry.status === 'ok')).toBe(true);
    expect(planAgents.some((entry) => entry.status === 'cancelled')).toBe(false);
  });

  it('allowEarlyFinish restores the pre-gate behavior: finish lands, the straggler cancels', async () => {
    const adapter = hangingWorkerAdapter((req, turn) => {
      if (turn === 1) {
        return ADD_TASK;
      }
      return { toolCall: { name: 'finish', args: { result: { done: 'early' } } } };
    });
    const store = new InMemoryStore();
    const engine = buildEngine(adapter, store);
    const handle = orchestratePlanned(engine, 'early demo', {
      budget: { capUsd: 5 },
      plan: { maxRevisionsPerRun: 4, allowEarlyFinish: true },
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({ done: 'early' });
    expect(sawToolResult(adapter.calls, 'finish refused')).toBe(false);
    // The exit barrier cancelled the hanging worker: its agent terminal
    // records cancelled under the plan scope, the experiment's shape.
    const entries = await store.load(handle.runId);
    const cancelled = entries.find(
      (entry) =>
        entry.kind === 'agent' && entry.scope.startsWith('plan/') && entry.status === 'cancelled',
    );
    expect(cancelled).toBeDefined();
  });
});
