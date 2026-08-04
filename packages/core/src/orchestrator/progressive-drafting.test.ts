/**
 * The progressive drafting pattern, pinned (RV1607): a settled child's
 * full output is readable the moment IT settles, not when the last
 * sibling does. The eighteenth comparison benchmark's largest
 * post-fan-in cost was a first full draft composed only after
 * await_all (about four and a half minutes of coordination model time,
 * while both repair turns were seconds); every primitive for drafting
 * earlier already existed, so this file pins the guarantees the
 * pattern stands on: await_any returns the first settled digest while
 * a sibling is mid-flight, and get_child_result serves that settled
 * child immediately.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

const PROFILES = { worker: { description: 'does one task' } };

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

function handlesIn(req: ChatRequest): number[] {
  const handles: number[] = [];
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const result = part.result as { handle?: number; handles?: number[] };
        if (typeof result?.handle === 'number') {
          handles.push(result.handle);
        }
        if (Array.isArray(result?.handles)) {
          handles.push(...result.handles.filter((h): h is number => typeof h === 'number'));
        }
      }
    }
  }
  return handles;
}

function textOf(req: ChatRequest): string {
  return JSON.stringify(req.messages);
}

describe('drafting while the fan-out runs (RV1607)', () => {
  it('reads a settled child in full while a sibling is still mid-flight', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        const prompt = textOf(req);
        return prompt.includes('fast task')
          ? { text: 'the fast evidence body, ready early' }
          : // The slow sibling would outlive the whole test: the
            // coordinator cancels it after drafting from the fast one.
            { text: 'never delivered', hangMs: 30_000 };
      }
      orchTurn += 1;
      const transcript = textOf(req);
      if (orchTurn === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'fast task' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'slow task' } },
          ],
        };
      }
      const [fast, slow] = handlesIn(req);
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_any', args: { handles: [fast ?? 1, slow ?? 2] } } };
      }
      if (orchTurn === 3) {
        return { toolCall: { name: 'get_child_result', args: { handle: fast ?? 1 } } };
      }
      if (orchTurn === 4) {
        // The full early read is in the transcript BEFORE the sibling
        // ever settled: the outline can start here.
        expect(transcript).toContain('the fast evidence body, ready early');
        return {
          toolCall: { name: 'cancel_agent', args: { handle: slow ?? 2, reason: 'outlined' } },
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'outlined from the early read' } } };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const outcome = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('progressive goal', { exposeChildResultTools: true }),
      undefined,
    );
    expect(outcome).toBe('outlined from the early read');
    // The slow sibling never settled ok: it journals cancelled, which
    // proves the early read did not wait for it.
    const entries = await store.load('test-run');
    const slowTerminal = entries.find(
      (entry) =>
        entry.kind === 'agent' && entry.scope.startsWith('agent:') && entry.status === 'cancelled',
    );
    expect(slowTerminal).toBeDefined();
    const fastTerminal = entries.find(
      (entry) =>
        entry.kind === 'agent' && entry.scope.startsWith('agent:') && entry.status === 'ok',
    );
    expect(fastTerminal).toBeDefined();
  });

  it('the progressive nudge rides the prompt only under the child-result opt-in', async () => {
    const plain = scriptedAdapter((): ScriptedTurn => ({
      toolCall: { name: 'finish', args: { result: 'plain' } },
    }));
    const plainKit = makeInternals({
      adapters: [plain],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    await executeWorkflow(plainKit.internals, makeOrchestratorWorkflow('goal', {}), undefined);
    expect(textOf(plain.calls[0])).not.toContain('await_any returns the first');

    const optedIn = scriptedAdapter((): ScriptedTurn => ({
      toolCall: { name: 'finish', args: { result: 'opted' } },
    }));
    const optedKit = makeInternals({
      adapters: [optedIn],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    await executeWorkflow(
      optedKit.internals,
      makeOrchestratorWorkflow('goal', { exposeChildResultTools: true }),
      undefined,
    );
    expect(textOf(optedIn.calls[0])).toContain('await_any returns the first');
    expect(textOf(optedIn.calls[0])).toContain('get_child_result');
  });
});
