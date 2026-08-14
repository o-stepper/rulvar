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
import {
  CLAIM_JUDGE_LABEL,
  reduceCriticalPath,
  reduceInvocationTable,
} from '../l0/telemetry-reduce.js';
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

  it('a rejected acceptance records the machine-readable skip reason on every surface (11.4)', async () => {
    const coordination = coordinationAdapter();
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'synthesized' } } }),
      { id: 'strong' },
    );
    const { internals, events, store } = makeInternals({
      adapters: [coordination, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', {
      synthesis: {},
      acceptance: { childPolicy: { minSuccessful: 3 } },
    });
    // The typed error data names the cause a host can pattern-match.
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toMatchObject({
      name: 'FailRunError',
      data: {
        source: 'orchestrator_acceptance',
        synthesisSkipped: 'synthesis_skipped_by_acceptance',
      },
    });
    expect(synthesis.calls).toHaveLength(0);

    // The journaled acceptance decision froze the same reason.
    await internals.replayer.flush();
    const entries = await store.load('test-run');
    const decision = entries.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_acceptance',
    );
    expect((decision?.value as { synthesisSkipped?: string }).synthesisSkipped).toBe(
      'synthesis_skipped_by_acceptance',
    );

    // The info log announces it beside the zero synthesize spend.
    const skip = events
      .ofType('log')
      .find((event) => (event as { msg?: string }).msg === 'orchestrator synthesis skipped') as
      { level?: string; data?: { reason?: string } } | undefined;
    expect(skip?.level).toBe('info');
    expect(skip?.data?.reason).toBe('synthesis_skipped_by_acceptance');
  });

  it('a rejection without synthesis configured stays byte identical: no reason, no log', async () => {
    const coordination = coordinationAdapter();
    const { internals, events, store } = makeInternals({
      adapters: [coordination],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', {
      acceptance: { childPolicy: { minSuccessful: 3 } },
    });
    let thrown: { data?: Record<string, unknown> } | undefined;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error as { data?: Record<string, unknown> };
    }
    expect(thrown?.data?.source).toBe('orchestrator_acceptance');
    expect('synthesisSkipped' in (thrown?.data ?? {})).toBe(false);

    await internals.replayer.flush();
    const entries = await store.load('test-run');
    const decision = entries.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_acceptance',
    );
    expect('synthesisSkipped' in ((decision?.value ?? {}) as Record<string, unknown>)).toBe(false);
    expect(
      events
        .ofType('log')
        .some((event) => (event as { msg?: string }).msg === 'orchestrator synthesis skipped'),
    ).toBe(false);
  });

  it('a resume rolls the recorded skip reason forward from the journal with zero live calls', async () => {
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
    const wfOpts = {
      synthesis: {},
      acceptance: { childPolicy: { minSuccessful: 3 } as const },
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
    const first = await engineA.run(makeOrchestratorWorkflow('goal', wfOpts), undefined, {
      runId: 'SKIP',
    }).result;
    expect(first.status).toBe('error');
    expect((first.error?.data as { synthesisSkipped?: string } | undefined)?.synthesisSkipped).toBe(
      'synthesis_skipped_by_acceptance',
    );

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
    const handle = engineB.resume('SKIP', makeOrchestratorWorkflow('goal', wfOpts));
    const logs: Array<{ msg?: string; data?: { reason?: string } }> = [];
    handle.on('log', (event) => logs.push(event as { msg?: string }));
    const resumed = await handle.result;
    expect(resumed.status).toBe('error');
    expect(
      (resumed.error?.data as { synthesisSkipped?: string } | undefined)?.synthesisSkipped,
    ).toBe('synthesis_skipped_by_acceptance');
    // The journal is the authority and no model call re-paid anything.
    expect(replayCoordination.calls).toHaveLength(0);
    expect(replaySynthesis.calls).toHaveLength(0);
    expect(logs.find((event) => event.msg === 'orchestrator synthesis skipped')?.data?.reason).toBe(
      'synthesis_skipped_by_acceptance',
    );
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

  it('splits the synthesize wall between final composition and the claim judge by label (RV1604)', () => {
    const events = [
      ev({ type: 'run:start', ts: at(0), spanId: 'run' }),
      ev({ type: 'agent:start', ts: at(0), spanId: 'root', role: 'orchestrate' }),
      ev({ type: 'agent:start', ts: at(5), spanId: 'w1', role: 'loop' }),
      ev({ type: 'agent:end', ts: at(40), spanId: 'w1', role: 'loop' }),
      ev({
        type: 'agent:start',
        ts: at(40),
        spanId: 'judge',
        role: 'synthesize',
        label: CLAIM_JUDGE_LABEL,
      }),
      ev({ type: 'agent:end', ts: at(70), spanId: 'judge' }),
      ev({ type: 'agent:start', ts: at(70), spanId: 'synth', role: 'synthesize' }),
      ev({ type: 'agent:end', ts: at(90), spanId: 'synth' }),
      ev({ type: 'agent:end', ts: at(95), spanId: 'root' }),
      ev({ type: 'run:end', ts: at(100), spanId: 'run' }),
    ];
    const path = reduceCriticalPath(events);
    // The eighteenth comparison benchmark read a 54-second synthesisMs
    // as a second final composition when the run had SKIPPED synthesis:
    // the bucket was entirely the judge. The split names the halves and
    // the legacy sum stays byte-stable for existing consumers.
    expect(path.synthesisMs).toBe(50);
    expect(path.semanticJudgeMs).toBe(30);
    expect(path.finalCompositionMs).toBe(20);
    expect(path.postFanIn?.synthesisMs).toBe(50);
    expect(path.postFanIn?.semanticJudgeMs).toBe(30);
    expect(path.postFanIn?.finalCompositionMs).toBe(20);
  });

  it('counts the final pass label into the judge half on the live surface (RV3302)', () => {
    // The 2026-08-12 comparison run reported semanticJudgeMs 0 live
    // while the journal fold split the same 272923 ms window into
    // 224864 against 48059: the live fold compared the label exactly,
    // and the final pass dispatches under a suffixed label (RV2509).
    const events = [
      ev({ type: 'run:start', ts: at(0), spanId: 'run' }),
      ev({ type: 'agent:start', ts: at(0), spanId: 'w1', role: 'loop' }),
      ev({ type: 'agent:end', ts: at(40), spanId: 'w1' }),
      ev({ type: 'agent:start', ts: at(40), spanId: 'synth', role: 'synthesize' }),
      ev({ type: 'agent:end', ts: at(60), spanId: 'synth' }),
      ev({
        type: 'agent:start',
        ts: at(60),
        spanId: 'judge',
        role: 'synthesize',
        label: `${CLAIM_JUDGE_LABEL}-final`,
      }),
      ev({ type: 'agent:end', ts: at(90), spanId: 'judge' }),
      ev({ type: 'run:end', ts: at(100), spanId: 'run' }),
    ];
    const path = reduceCriticalPath(events);
    expect(path.synthesisMs).toBe(50);
    expect(path.semanticJudgeMs).toBe(30);
    expect(path.finalCompositionMs).toBe(20);
  });

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
      finalCompositionMs: 20,
      semanticJudgeMs: 0,
      draftJudgeMs: 0,
      finalJudgeMs: 0,
      compositionSpans: 1,
      judgeSpans: 0,
      // The candidate milestones (RV3605): the one composition span
      // ends at 80, so the first and last candidate coincide.
      firstCandidateMs: 80,
      lastCandidateMs: 80,
      postFanInShare: 0.4,
      synthesisShare: 0.2,
      workerSpans: 2,
      postFanIn: {
        coordinationModelMs: 0,
        coordinationModelMsByPhase: {},
        coordinationModelOnlyMs: 0,
        coordinationToolMs: 0,
        coordinationToolMsByName: {},
        coordinationToolCallsByName: {},
        synthesisMs: 20,
        finalCompositionMs: 20,
        semanticJudgeMs: 0,
        coveredMs: 20,
        residueMs: 20,
        residueShare: 0.5,
      },
    });
  });

  it('decomposes the post-fan-in window by phase with the straddling intervals clipped (RV710)', () => {
    const events = [
      ev({ type: 'run:start', ts: at(0), spanId: 'run' }),
      ev({ type: 'agent:start', ts: at(0), spanId: 'root', role: 'orchestrate' }),
      ev({ type: 'agent:start', ts: at(5), spanId: 'w1', role: 'loop' }),
      ev({ type: 'agent:end', ts: at(100), spanId: 'w1', role: 'loop' }),
      // A coordination activation straddling the fan-in boundary: only
      // the part inside the window counts. [70, 132] clips to [100, 132].
      ev({
        type: 'agent:phase:end',
        ts: at(132),
        spanId: 'root',
        role: 'orchestrate',
        durationMs: 62,
      }),
      // Child-result pagination under its own tool name: [132, 150].
      ev({
        type: 'tool:end',
        ts: at(150),
        spanId: 'root',
        toolName: 'get_child_result',
        durationMs: 18,
      }),
      // A zero-duration execution inside the window still registers its
      // name (sub-millisecond tools round to 0 on the wall clock).
      ev({
        type: 'tool:end',
        ts: at(152),
        spanId: 'root',
        toolName: 'get_child_result',
        durationMs: 0,
      }),
      // The finish-composition activation: [151, 170].
      ev({
        type: 'agent:phase:end',
        ts: at(170),
        spanId: 'root',
        role: 'orchestrate',
        durationMs: 19,
      }),
      // The finish exchange (schema plus host validators): [171, 180].
      ev({ type: 'tool:end', ts: at(180), spanId: 'root', toolName: 'finish', durationMs: 9 }),
      // A tool end on an unknown span (a consumer attached mid-stream)
      // cannot be attributed and is skipped, never guessed at.
      ev({ type: 'tool:end', ts: at(180), spanId: 'ghost', toolName: 'finish', durationMs: 500 }),
      ev({ type: 'agent:end', ts: at(180), spanId: 'root' }),
      ev({ type: 'agent:start', ts: at(181), spanId: 'synth', role: 'synthesize' }),
      ev({ type: 'agent:end', ts: at(199), spanId: 'synth' }),
      ev({ type: 'run:end', ts: at(200), spanId: 'run' }),
    ];
    const path = reduceCriticalPath(events);
    expect(path.postFanInMs).toBe(100);
    // 32 (clipped straddle) + 19 = model; 18 + 0 + 9 = tools; 18 synthesis.
    expect(path.postFanIn).toEqual({
      coordinationModelMs: 51,
      coordinationModelMsByPhase: { orchestrate: 51 },
      coordinationModelOnlyMs: 51,
      coordinationToolMs: 27,
      coordinationToolMsByName: { get_child_result: 18, finish: 9 },
      coordinationToolCallsByName: { get_child_result: 2, finish: 1 },
      synthesisMs: 18,
      finalCompositionMs: 18,
      semanticJudgeMs: 0,
      coveredMs: 96,
      residueMs: 4,
      residueShare: 0.04,
    });
  });

  it('coveredMs is the interval union, never the overlap-counting sum (RV710)', () => {
    const events = [
      ev({ type: 'run:start', ts: at(0), spanId: 'run' }),
      ev({ type: 'agent:start', ts: at(0), spanId: 'root', role: 'orchestrate' }),
      ev({ type: 'agent:start', ts: at(5), spanId: 'w1', role: 'loop' }),
      ev({ type: 'agent:end', ts: at(100), spanId: 'w1', role: 'loop' }),
      // Model [110, 140] and tool [130, 150] overlap by 10ms (clock skew
      // between the duration clock and emission stamps): the buckets sum
      // their own clipped intervals, the union refuses the double count.
      ev({
        type: 'agent:phase:end',
        ts: at(140),
        spanId: 'root',
        role: 'orchestrate',
        durationMs: 30,
      }),
      ev({
        type: 'tool:end',
        ts: at(150),
        spanId: 'root',
        toolName: 'get_child_result',
        durationMs: 20,
      }),
      ev({ type: 'agent:end', ts: at(150), spanId: 'root' }),
      ev({ type: 'run:end', ts: at(200), spanId: 'run' }),
    ];
    const path = reduceCriticalPath(events);
    expect(path.postFanIn).toEqual({
      coordinationModelMs: 30,
      coordinationModelMsByPhase: { orchestrate: 30 },
      // The exact set difference: model [110,140] minus tool [130,150]
      // is [110,130], 20ms, where subtracting the SUMS would say 10.
      coordinationModelOnlyMs: 20,
      coordinationToolMs: 20,
      coordinationToolMsByName: { get_child_result: 20 },
      coordinationToolCallsByName: { get_child_result: 1 },
      synthesisMs: 0,
      finalCompositionMs: 0,
      semanticJudgeMs: 0,
      coveredMs: 40,
      residueMs: 60,
      residueShare: 0.6,
    });
  });

  it('a zero-length window carries the breakdown with zero buckets and no share (RV710)', () => {
    const events = [
      ev({ type: 'run:start', ts: at(0), spanId: 'run' }),
      ev({ type: 'agent:start', ts: at(5), spanId: 'w1', role: 'loop' }),
      ev({ type: 'agent:end', ts: at(100), spanId: 'w1', role: 'loop' }),
      ev({ type: 'run:end', ts: at(100), spanId: 'run' }),
    ];
    const path = reduceCriticalPath(events);
    expect(path.postFanInMs).toBe(0);
    expect(path.postFanIn).toEqual({
      coordinationModelMs: 0,
      coordinationModelMsByPhase: {},
      coordinationModelOnlyMs: 0,
      coordinationToolMs: 0,
      coordinationToolMsByName: {},
      coordinationToolCallsByName: {},
      synthesisMs: 0,
      finalCompositionMs: 0,
      semanticJudgeMs: 0,
      coveredMs: 0,
      residueMs: 0,
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
    expect(noWorkers).toEqual({
      runWallMs: 10,
      synthesisMs: 0,
      finalCompositionMs: 0,
      semanticJudgeMs: 0,
      draftJudgeMs: 0,
      finalJudgeMs: 0,
      compositionSpans: 0,
      judgeSpans: 0,
      synthesisShare: 0,
      workerSpans: 0,
    });
  });

  it('tolerates unknown event types and unparsable timestamps', () => {
    const path = reduceCriticalPath([
      ev({ type: 'run:start', ts: at(0), spanId: 'run' }),
      ev({ type: 'mystery:event', ts: at(1), spanId: 'x' }),
      ev({ type: 'agent:start', ts: 'not a date', spanId: 'w1', role: 'loop' }),
      ev({ type: 'run:end', ts: at(10), spanId: 'run' }),
    ]);
    expect(path).toEqual({
      runWallMs: 10,
      synthesisMs: 0,
      finalCompositionMs: 0,
      semanticJudgeMs: 0,
      draftJudgeMs: 0,
      finalJudgeMs: 0,
      compositionSpans: 0,
      judgeSpans: 0,
      synthesisShare: 0,
      workerSpans: 0,
    });
  });
});
