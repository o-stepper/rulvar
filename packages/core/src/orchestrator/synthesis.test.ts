/**
 * The post-fan-in synthesis invocation (RV-211). Reproduced on published
 * 1.52.0: the orchestrator's final synthesis is composed by the same
 * invocation, role, and model as coordination; no synthesize role
 * exists, byRole cannot attribute its cost, and the 40 percent
 * post-fan-in gate is hand-rolled or nothing. These tests pin the new
 * contract: the opt-in synthesis invocation with its own routing, the
 * validator rebinding to the FINAL output, the journaled fallback, the
 * acceptance ordering, and replay identity.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { ConfigError, FailRunError } from '../l0/errors.js';
import { reduceCriticalPath, reduceInvocationTable } from '../l0/telemetry-reduce.js';
import type { WorkflowEvent } from '../l0/events.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { executeWorkflow } from '../engine/ctx.js';
import { createEngine } from '../engine/engine.js';
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
  return req.messages
    .flatMap((msg) => msg.parts)
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

/** Coordination script: spawn two workers, await, finish with a draft. */
function coordinationAdapter() {
  let orchTurn = 0;
  return scriptedAdapter((req): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      const prompt = req.messages[0]?.parts.find((p) => p.type === 'text') as { text: string };
      return { text: `evidence for ${prompt.text}` };
    }
    orchTurn += 1;
    if (orchTurn === 1) {
      return {
        toolCalls: [
          { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'study A' } },
          { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'study B' } },
        ],
      };
    }
    if (orchTurn === 2) {
      return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
    }
    return { toolCall: { name: 'finish', args: { result: 'draft: studies agree' } } };
  });
}

describe('the orchestrator synthesis invocation (RV-211)', () => {
  it('routes the post-fan-in synthesis to its own model as role synthesize', async () => {
    const coordination = coordinationAdapter();
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({
        toolCall: { name: 'finish', args: { result: 'synthesized: both studies agree' } },
      }),
      { id: 'strong' },
    );
    const { internals, events } = makeInternals({
      adapters: [coordination, synthesis],
      routing: {
        loop: 'fake:model',
        orchestrate: 'fake:model',
        synthesize: 'strong:model',
      },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('compare the studies', { synthesis: {} });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('synthesized: both studies agree');

    // Exactly one synthesis request on the strong adapter; coordination
    // never left the fake one.
    expect(synthesis.calls).toHaveLength(1);
    const prompt = synthesis.calls[0] === undefined ? '' : textOf(synthesis.calls[0]);
    expect(prompt).toContain('GOAL: compare the studies');
    expect(prompt).toContain('DRAFT: "draft: studies agree"');
    expect(prompt).toContain('evidence for study A');
    expect(prompt).toContain('evidence for study B');
    expect(coordination.calls.length).toBeGreaterThanOrEqual(3);

    // The invocation is a full span with role synthesize: byRole
    // attributes it without heuristics.
    const starts = events
      .ofType('agent:start')
      .filter((event) => (event as { role?: string }).role === 'synthesize');
    expect(starts).toHaveLength(1);
    const table = reduceInvocationTable(events.all as Iterable<WorkflowEvent>);
    expect(Object.keys(table.byRole)).toContain('synthesize');

    // The context diagnostics rode a debug log with the actual sizes.
    const diag = events
      .ofType('log')
      .find((event) => (event as { msg?: string }).msg === 'orchestrator synthesis context') as
      { data?: { children?: number; promptChars?: number } } | undefined;
    expect(diag?.data?.children).toBe(2);
    expect(diag?.data?.promptChars).toBeGreaterThan(0);
  });

  it('binds the finish validators to the synthesis finish, with repair', async () => {
    const coordination = coordinationAdapter();
    let synthesisTurn = 0;
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => {
        synthesisTurn += 1;
        return synthesisTurn === 1
          ? { toolCall: { name: 'finish', args: { result: 'missing the marker' } } }
          : { toolCall: { name: 'finish', args: { result: 'final with MARKER intact' } } };
      },
      { id: 'strong' },
    );
    const { internals, store } = makeInternals({
      adapters: [coordination, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', {
      synthesis: {},
      finishValidation: {
        validators: [
          {
            name: 'wants-marker',
            validate: (input) =>
              input.text.includes('MARKER') ? { ok: true } : { ok: false, reasons: ['no MARKER'] },
          },
        ],
        maxRepairs: 1,
      },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('final with MARKER intact');
    expect(synthesisTurn).toBe(2);

    const entries = await store.load('test-run');
    const verdicts = entries
      .filter(
        (entry) =>
          entry.kind === 'decision' &&
          (entry.value as { decisionType?: string } | undefined)?.decisionType ===
            'orchestrator_finish_validation',
      )
      .map((entry) => (entry.value as { verdict: string }).verdict);
    // Both decisions belong to the SYNTHESIS finish: the coordination
    // draft (which also lacks the marker) was never validated.
    expect(verdicts).toEqual(['repair', 'accepted']);
  });

  it('fails the run typed when validators are configured and synthesis dies', async () => {
    const coordination = coordinationAdapter();
    // The synthesis model never calls finish: bounded limit.
    const synthesis = scriptedAdapter((): ScriptedTurn => ({ text: 'just prose' }), {
      id: 'strong',
    });
    const { internals } = makeInternals({
      adapters: [coordination, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', {
      synthesis: { limits: { maxTurns: 1 } },
      finishValidation: {
        validators: [{ name: 'any', validate: () => ({ ok: true }) }],
      },
    });
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toMatchObject({
      name: 'FailRunError',
      data: { source: 'orchestrator_synthesis', status: 'limit' },
    });
  });

  it('falls back to the draft under a journaled decision when unvalidated synthesis dies', async () => {
    const coordination = coordinationAdapter();
    const synthesis = scriptedAdapter((): ScriptedTurn => ({ text: 'just prose' }), {
      id: 'strong',
    });
    const { internals, store, events } = makeInternals({
      adapters: [coordination, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', { synthesis: { limits: { maxTurns: 1 } } });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('draft: studies agree');

    const entries = await store.load('test-run');
    const fallback = entries.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_synthesis_fallback',
    );
    expect(fallback).toBeDefined();
    expect((fallback?.value as { status?: string }).status).toBe('limit');
    const warns = events
      .ofType('log')
      .filter((event) =>
        String((event as { msg?: string }).msg).includes('falling back to the coordination draft'),
      );
    expect(warns).toHaveLength(1);
  });

  it('replays the synthesized run with zero live calls', async () => {
    const store = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const defaults = {
      routing: {
        loop: 'fake:model',
        orchestrate: 'fake:model',
        synthesize: 'strong:model',
      } as const,
      profiles: PROFILES,
    };
    const engineA = createEngine({
      adapters: [
        coordinationAdapter(),
        scriptedAdapter(
          (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'synthesized' } } }),
          { id: 'strong' },
        ),
      ],
      stores: { journal: store, transcripts },
      defaults,
    });
    const wfOpts = { synthesis: {} };
    const first = await engineA.run(makeOrchestratorWorkflow('goal', wfOpts), undefined, {
      runId: 'SYNTH',
    }).result;
    expect(first.status).toBe('ok');
    expect(first.value).toBe('synthesized');

    const replayCoordination = coordinationAdapter();
    const replaySynthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'DIFFERENT' } } }),
      { id: 'strong' },
    );
    const engineB = createEngine({
      adapters: [replayCoordination, replaySynthesis],
      stores: { journal: store, transcripts },
      defaults,
    });
    const resumed = await engineB.resume('SYNTH', makeOrchestratorWorkflow('goal', wfOpts)).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe('synthesized');
    expect(replayCoordination.calls).toHaveLength(0);
    expect(replaySynthesis.calls).toHaveLength(0);
  });

  it('runs synthesis only AFTER an accepted verdict and inside the acceptance envelope', async () => {
    const coordination = coordinationAdapter();
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'synthesized' } } }),
      { id: 'strong' },
    );
    const { internals } = makeInternals({
      adapters: [coordination, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', {
      synthesis: {},
      acceptance: { childPolicy: 'all-ok' },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as {
      result: unknown;
      completion: string;
    };
    expect(outcome.result).toBe('synthesized');
    expect(outcome.completion).toBe('complete');
  });

  it('a rejected acceptance never pays for synthesis', async () => {
    const coordination = coordinationAdapter();
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'synthesized' } } }),
      { id: 'strong' },
    );
    const { internals } = makeInternals({
      adapters: [coordination, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', {
      synthesis: {},
      acceptance: { childPolicy: { minSuccessful: 3 } },
    });
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toMatchObject({
      name: 'FailRunError',
      data: { source: 'orchestrator_acceptance' },
    });
    expect(synthesis.calls).toHaveLength(0);
  });

  it('validates the synthesis option loudly at workflow construction', () => {
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        synthesis: { effort: 'wild' as unknown as 'high' },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      makeOrchestratorWorkflow('goal', { synthesis: { limits: { maxTurns: 0 } } }),
    ).toThrow(/synthesis\.limits\.maxTurns/);
    expect(() => makeOrchestratorWorkflow('goal', { synthesis: { estCost: -1 } })).toThrow(
      /synthesis\.estCost/,
    );
    expect(() =>
      makeOrchestratorWorkflow('goal', {
        synthesis: { instructions: 42 as unknown as string },
      }),
    ).toThrow(/synthesis\.instructions/);
    // FailRunError import stays used in every branch above.
    void FailRunError;
  });
});

describe('reduceCriticalPath (RV-211)', () => {
  const at = (ms: number): string => new Date(1700000000000 + ms).toISOString();
  const ev = (body: Record<string, unknown>): WorkflowEvent => body as unknown as WorkflowEvent;

  it('computes the post-fan-in and synthesis shares from the vocabulary alone', () => {
    const events = [
      ev({ type: 'run:start', ts: at(0), spanId: 'run' }),
      ev({ type: 'agent:start', ts: at(0), spanId: 'root', role: 'orchestrate' }),
      ev({ type: 'agent:start', ts: at(5), spanId: 'w1', role: 'loop' }),
      ev({ type: 'agent:start', ts: at(5), spanId: 'w2', role: 'loop' }),
      ev({ type: 'agent:end', ts: at(50), spanId: 'w1', role: 'loop' }),
      ev({ type: 'agent:end', ts: at(60), spanId: 'w2', role: 'loop' }),
      ev({ type: 'agent:start', ts: at(60), spanId: 'synth', role: 'synthesize' }),
      ev({ type: 'agent:end', ts: at(80), spanId: 'synth' }),
      ev({ type: 'agent:end', ts: at(95), spanId: 'root' }),
      ev({ type: 'run:end', ts: at(100), spanId: 'run' }),
    ];
    expect(reduceCriticalPath(events)).toEqual({
      runWallMs: 100,
      postFanInMs: 40,
      synthesisMs: 20,
      postFanInShare: 0.4,
      synthesisShare: 0.2,
      workerSpans: 2,
    });
  });

  it('leaves absent pieces undefined instead of guessing', () => {
    const open = reduceCriticalPath([
      ev({ type: 'run:start', ts: at(0), spanId: 'run' }),
      ev({ type: 'agent:start', ts: at(1), spanId: 'w1', role: 'loop' }),
      ev({ type: 'agent:end', ts: at(9), spanId: 'w1' }),
    ]);
    expect(open.runWallMs).toBeUndefined();
    expect(open.postFanInMs).toBeUndefined();
    expect(open.workerSpans).toBe(1);

    const noWorkers = reduceCriticalPath([
      ev({ type: 'run:start', ts: at(0), spanId: 'run' }),
      ev({ type: 'agent:start', ts: at(0), spanId: 'root', role: 'orchestrate' }),
      ev({ type: 'agent:end', ts: at(5), spanId: 'root' }),
      ev({ type: 'run:end', ts: at(10), spanId: 'run' }),
    ]);
    expect(noWorkers).toEqual({ runWallMs: 10, synthesisMs: 0, synthesisShare: 0, workerSpans: 0 });
  });

  it('tolerates unknown event types and unparsable timestamps', () => {
    const path = reduceCriticalPath([
      ev({ type: 'run:start', ts: at(0), spanId: 'run' }),
      ev({ type: 'mystery:event', ts: at(1), spanId: 'x' }),
      ev({ type: 'agent:start', ts: 'not a date', spanId: 'w1', role: 'loop' }),
      ev({ type: 'run:end', ts: at(10), spanId: 'run' }),
    ]);
    expect(path).toEqual({ runWallMs: 10, synthesisMs: 0, synthesisShare: 0, workerSpans: 0 });
  });
});
