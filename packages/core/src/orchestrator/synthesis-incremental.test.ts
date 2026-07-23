/**
 * Incremental synthesis and pre-model claim deduplication (the RV-211
 * remainder). Reproduced on published 1.53.0: `synthesis.mode:
 * 'incremental'` and `dedupeClaims` were silently ignored words; the
 * synthesize invocation ran as one big model call strictly post-fan-in,
 * and two children reporting the byte-identical claim put it into the
 * model call twice. These tests pin the shipped contract: one bounded
 * note per settled child dispatched AT SETTLE TIME (overlapping the
 * fan-out), a DETERMINISTIC final reconciliation (never another model
 * call), the journaled per-child note fallback, the prompt-level dedup
 * in single mode with byte-stability when unset, the intake gates, and
 * replay identity with zero live calls.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { ConfigError } from '../l0/errors.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { executeWorkflow } from '../engine/ctx.js';
import { createEngine } from '../engine/engine.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import type { IncrementalSynthesisResult } from './orchestrate.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

const PROFILES = { worker: { description: 'does one task' } };
const ROUTING = {
  loop: 'fake:model',
  orchestrate: 'fake:model',
  synthesize: 'strong:model',
} as const;

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

/** Coordination: spawn two workers, await both, finish with a draft. */
function coordinationAdapter(workerText?: (prompt: string) => string) {
  let orchTurn = 0;
  return scriptedAdapter((req): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      const prompt = req.messages[0]?.parts.find((p) => p.type === 'text') as { text: string };
      return {
        text: workerText === undefined ? `evidence for ${prompt.text}` : workerText(prompt.text),
      };
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

/** Note responder: finishes with a note derived from the child digest. */
function noteAdapter() {
  return scriptedAdapter(
    (req): ScriptedTurn => {
      const which = textOf(req).includes('study A') ? 'A' : 'B';
      return {
        toolCall: {
          name: 'finish',
          args: { result: `note ${which}: cache is stale.\nunique ${which}` },
        },
      };
    },
    { id: 'strong' },
  );
}

describe('incremental synthesis (RV-211 remainder)', () => {
  it('dispatches one note per settled child at settle time and reconciles deterministically', async () => {
    const coordination = coordinationAdapter();
    const notes = noteAdapter();
    const { internals, events } = makeInternals({
      adapters: [coordination, notes],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('compare the studies', {
      synthesis: { mode: 'incremental' },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as IncrementalSynthesisResult;

    // The final result is the deterministic reconciliation envelope; the
    // strong adapter served EXACTLY the two notes, never a final merge.
    expect(notes.calls).toHaveLength(2);
    for (const req of notes.calls) {
      const prompt = textOf(req);
      expect(prompt).toContain('You are an incremental synthesis note');
      expect(prompt).toContain('GOAL: compare the studies');
      expect(prompt).toContain('CHILD: {');
    }
    expect(outcome.synthesis).toBe('incremental');
    expect(outcome.draft).toBe('draft: studies agree');
    expect(outcome.sections).toHaveLength(2);
    expect(outcome.sections[0]).toMatchObject({
      status: 'ok',
      noteStatus: 'ok',
      note: 'note A: cache is stale.\nunique A',
    });
    expect(outcome.sections[1]).toMatchObject({
      status: 'ok',
      noteStatus: 'ok',
      note: 'note B: cache is stale.\nunique B',
    });
    expect(outcome.repeatedClaims).toBeUndefined();

    // Both notes are full synthesize spans, and both STARTED before the
    // coordination span ended (emission order in the recorded stream):
    // note wall time overlaps the fan-out instead of stacking
    // post-fan-in.
    const all = [...events.all] as { type: string; role?: string; spanId?: string }[];
    const noteStartIndexes = all
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => event.type === 'agent:start' && event.role === 'synthesize')
      .map(({ index }) => index);
    expect(noteStartIndexes).toHaveLength(2);
    const orchStart = all.find(
      (event) => event.type === 'agent:start' && event.role === 'orchestrate',
    );
    const orchEndIndex = all.findIndex(
      (event) => event.type === 'agent:end' && event.spanId === orchStart?.spanId,
    );
    expect(orchEndIndex).toBeGreaterThan(-1);
    for (const index of noteStartIndexes) {
      expect(index).toBeLessThan(orchEndIndex);
    }

    // The reconciliation diagnostics rode a debug log with actual sizes.
    const diag = events
      .ofType('log')
      .find(
        (event) => (event as { msg?: string }).msg === 'orchestrator synthesis reconciliation',
      ) as { data?: { children?: number; notesChars?: number } } | undefined;
    expect(diag?.data?.children).toBe(2);
    expect(diag?.data?.notesChars).toBeGreaterThan(0);
  });

  it('falls back to the raw digest summary under a journaled per-child decision when a note dies', async () => {
    const coordination = coordinationAdapter();
    // The note responder never calls finish: the terminal-tool discipline
    // re-prompts and the note ends 'limit' after its bounded turns.
    const stubborn = scriptedAdapter((): ScriptedTurn => ({ text: 'no finish here' }), {
      id: 'strong',
    });
    const { internals, events, store } = makeInternals({
      adapters: [coordination, stubborn],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', { synthesis: { mode: 'incremental' } });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as IncrementalSynthesisResult;
    expect(outcome.sections).toHaveLength(2);
    expect(outcome.sections[0]).toMatchObject({
      noteStatus: 'limit',
      note: 'evidence for study A',
    });
    expect(outcome.sections[1]).toMatchObject({
      noteStatus: 'limit',
      note: 'evidence for study B',
    });

    const entries = await store.load('test-run');
    const fallbacks = entries.filter(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_synthesis_note_fallback',
    );
    expect(fallbacks).toHaveLength(2);
    const warns = events
      .ofType('log')
      .filter((event) =>
        String((event as { msg?: string }).msg).includes('falling back to the raw digest summary'),
      );
    expect(warns).toHaveLength(2);
  });

  it('dedupes repeated claims across notes in the reconciliation envelope', async () => {
    const coordination = coordinationAdapter();
    const notes = noteAdapter();
    const { internals } = makeInternals({
      adapters: [coordination, notes],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', {
      synthesis: { mode: 'incremental', dedupeClaims: true },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as IncrementalSynthesisResult;
    // 'cache is stale.' appears once per note inside a longer first line,
    // so nothing merges there; make the repetition exact by checking the
    // shared line survives only in the first section.
    expect(outcome.sections[0]?.note).toBe('note A: cache is stale.\nunique A');
    expect(outcome.sections[1]?.note).toBe('note B: cache is stale.\nunique B');
    expect(outcome.repeatedClaims).toEqual([]);
  });

  it('dedupes an exactly repeated claim line and indexes its reporters', async () => {
    const coordination = coordinationAdapter();
    const sameLine = scriptedAdapter(
      (): ScriptedTurn => ({
        toolCall: { name: 'finish', args: { result: 'CLAIM: cache is stale.\nsame everywhere' } },
      }),
      { id: 'strong' },
    );
    const { internals } = makeInternals({
      adapters: [coordination, sameLine],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', {
      synthesis: { mode: 'incremental', dedupeClaims: true },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as IncrementalSynthesisResult;
    expect(outcome.sections[0]?.note).toBe('CLAIM: cache is stale.\nsame everywhere');
    expect(outcome.sections[1]?.note).toBe('');
    expect(outcome.repeatedClaims).toHaveLength(2);
    expect(outcome.repeatedClaims?.[0]).toMatchObject({
      claim: 'CLAIM: cache is stale.',
      count: 2,
    });
    expect(outcome.repeatedClaims?.[0]?.nodeIds).toHaveLength(2);
  });

  it('dedupes claims BEFORE the single-mode model call, byte-stable when unset', async () => {
    const claim = 'CLAIM: the cache is stale.';
    const run = async (dedupe: boolean): Promise<string> => {
      const coordination = coordinationAdapter(() => claim);
      const synthesis = scriptedAdapter(
        (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'merged' } } }),
        { id: 'strong' },
      );
      const { internals } = makeInternals({
        adapters: [coordination, synthesis],
        routing: ROUTING,
        profiles: PROFILES,
      });
      const wf = makeOrchestratorWorkflow('goal', {
        synthesis: dedupe ? { dedupeClaims: true } : {},
      });
      const outcome = await executeWorkflow(internals, wf, undefined);
      expect(outcome).toBe('merged');
      return synthesis.calls[0] === undefined ? '' : textOf(synthesis.calls[0]);
    };

    const without = await run(false);
    expect(without.split(claim).length - 1).toBe(2);
    expect(without).not.toContain('REPEATED CLAIMS:');

    const withDedupe = await run(true);
    // Once in the digest, once in the REPEATED CLAIMS index.
    expect(withDedupe.split(claim).length - 1).toBe(2);
    expect(withDedupe).toContain('REPEATED CLAIMS: [');
    const digestPart = withDedupe.slice(0, withDedupe.indexOf('REPEATED CLAIMS:'));
    expect(digestPart.split(claim).length - 1).toBe(1);
    expect(withDedupe).toContain('deduplicated before this prompt');
  });

  it('rejects the misconfigurations at intake, before any journal entry', () => {
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: { mode: 'later' as unknown as 'single' },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: { mode: 'incremental' },
        finishValidation: {
          validators: [{ name: 'v', validate: () => ({ ok: true as const }) }],
        },
      }),
    ).toThrow(/incremental/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: { dedupeClaims: 'yes' as unknown as boolean },
      }),
    ).toThrow(/dedupeClaims/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: { mode: 'incremental', noteLimits: { maxTurns: 0 } },
      }),
    ).toThrow(ConfigError);
  });

  it('wraps the reconciliation in the acceptance envelope after the verdict', async () => {
    const coordination = coordinationAdapter();
    const notes = noteAdapter();
    const { internals } = makeInternals({
      adapters: [coordination, notes],
      routing: ROUTING,
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('compare the studies', {
      synthesis: { mode: 'incremental' },
      acceptance: { childPolicy: 'all-ok' },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as {
      result: IncrementalSynthesisResult;
      completion: string;
      childStatusCounts: Record<string, number>;
    };
    expect(outcome.completion).toBe('complete');
    expect(outcome.childStatusCounts).toEqual({ ok: 2 });
    expect(outcome.result.synthesis).toBe('incremental');
    expect(outcome.result.sections).toHaveLength(2);
  });

  it('replays the incremental run with zero live calls and the identical envelope', async () => {
    const store = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const defaults = { routing: ROUTING, profiles: PROFILES };
    const wfOpts = { synthesis: { mode: 'incremental' as const, dedupeClaims: true } };
    const engineA = createEngine({
      adapters: [coordinationAdapter(), noteAdapter()],
      stores: { journal: store, transcripts },
      defaults,
    });
    const first = await engineA.run(makeOrchestratorWorkflow('goal', wfOpts), undefined, {
      runId: 'INC',
    }).result;
    expect(first.status).toBe('ok');
    expect((first.value as IncrementalSynthesisResult).sections).toHaveLength(2);

    const replayCoordination = coordinationAdapter();
    const replayNotes = scriptedAdapter(
      (): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result: 'DIFFERENT' } } }),
      { id: 'strong' },
    );
    const engineB = createEngine({
      adapters: [replayCoordination, replayNotes],
      stores: { journal: store, transcripts },
      defaults,
    });
    const resumed = await engineB.resume('INC', makeOrchestratorWorkflow('goal', wfOpts)).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toEqual(first.value);
    expect(replayCoordination.calls).toHaveLength(0);
    expect(replayNotes.calls).toHaveLength(0);
  });
});
