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

describe('the settled-set consume path (RV1807)', () => {
  it('await_any names the settled subset and one bulk call reads it; a running handle refuses typed', async () => {
    let orchTurn = 0;
    let sawNotSettled = false;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        const prompt = textOf(req);
        return prompt.includes('fast task')
          ? { text: 'the fast evidence body, ready early' }
          : { text: 'never delivered', hangMs: 30_000 };
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
        // The digest named the settled subset: exactly the fast child.
        expect(transcript).toContain('"settledHandles":[' + String(fast ?? 1) + ']');
        // A bulk read including the RUNNING sibling refuses typed
        // BEFORE any read; the model sees the named handles.
        return {
          toolCall: {
            name: 'get_settled_child_results',
            args: { handles: [fast ?? 1, slow ?? 2] },
          },
        };
      }
      if (orchTurn === 4) {
        sawNotSettled =
          transcript.includes('have not settled') || transcript.includes('has not settled');
        // Consume exactly the settled set: one call, full first page.
        return {
          toolCall: { name: 'get_settled_child_results', args: { handles: [fast ?? 1] } },
        };
      }
      if (orchTurn === 5) {
        expect(transcript).toContain('the fast evidence body, ready early');
        return {
          toolCall: { name: 'cancel_agent', args: { handle: slow ?? 2, reason: 'consumed' } },
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'consumed the settled set' } } };
    });
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const outcome = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('settled set goal', {
        exposeChildResultTools: true,
        exposeSettledResultsTool: true,
      }),
      undefined,
    );
    expect(outcome).toBe('consumed the settled set');
    expect(sawNotSettled).toBe(true);
    // The refusal reason rides public telemetry (RV1807): the tool:end
    // of the refused bulk call carries the structured errorCode.
    const refusal = events
      .ofType('tool:end')
      .find(
        (event) =>
          (event as { toolName?: string }).toolName === 'get_settled_child_results' &&
          (event as { outcome?: string }).outcome === 'error',
      ) as { errorCode?: string } | undefined;
    expect(refusal?.errorCode).toBe('child-not-settled');
  });

  it('a finish with a still-running child names it in unsettledAtFinish (RV1807)', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        const prompt = textOf(req);
        return prompt.includes('fast task')
          ? { text: 'fast done' }
          : { text: 'never delivered', hangMs: 30_000 };
      }
      orchTurn += 1;
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
      // Finish while the slow child still runs: minSuccessful is met.
      return { toolCall: { name: 'finish', args: { result: 'early finish' } } };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const outcome = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('early finish goal', {
        acceptance: { childPolicy: { minSuccessful: 1 } },
      }),
      undefined,
    );
    const envelope = outcome as {
      result?: unknown;
      completion?: string;
      unsettledAtFinish?: string[];
      degradedReasons?: string[];
    };
    expect(envelope.result).toBe('early finish');
    // The late-child boundary is explicit and machine-readable: the
    // prose degradation note gains its structured sibling.
    expect(envelope.completion).toBe('partial');
    expect(envelope.unsettledAtFinish).toHaveLength(1);
    expect(envelope.degradedReasons?.some((reason) => reason.includes('still running'))).toBe(true);
  });
});
