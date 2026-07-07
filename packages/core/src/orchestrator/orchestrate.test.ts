import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import type { JournalEntry } from '../l0/entries.js';
import { InMemoryTranscriptStore } from '../stores/inmemory.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

/** The telemetry namespace tells orchestrator requests from child ones. */
function agentTypeOf(req: ChatRequest): string {
  const lurker = (req.providerOptions as { lurker?: { agentType?: string } } | undefined)?.lurker;
  return lurker?.agentType ?? '';
}

/** Extracts spawn handles from the tool results the model saw. */
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

function admissionEntries(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.filter(
    (e) =>
      e.kind === 'decision' &&
      (e.value as { decisionType?: string } | undefined)?.decisionType === 'spawn-admission',
  );
}

const PROFILES = { worker: { description: 'does one task' } };

describe('orchestrate (M6-T07/T08)', () => {
  it('spawns children, awaits them, and finishes with the tool result', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        const prompt = req.messages[0]?.parts.find((p) => p.type === 'text');
        return { text: `did: ${(prompt as { text: string }).text}` };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'task A' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'task B' } },
          ],
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: { done: true } } } };
    });
    const { internals, store, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('collect the facts', {});
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toEqual({ done: true });

    const entries = await store.load('test-run');
    // Two spawn-admission decisions with embedded admit verdicts.
    const admissions = admissionEntries(entries);
    expect(admissions).toHaveLength(2);
    for (const admission of admissions) {
      const value = admission.value as {
        origin: string;
        decision: { verdict: { kind: string } };
      };
      expect(value.origin).toBe('spawn_agent');
      expect(value.decision.verdict.kind).toBe('admit');
    }
    // Children journal as ordinary kind 'agent' entries under agent:<seq>.
    const childAgents = entries.filter(
      (e) => e.kind === 'agent' && e.scope.startsWith('agent:') && e.status === 'ok',
    );
    expect(childAgents).toHaveLength(2);
    expect(events.ofType('spawn:admitted')).toHaveLength(2);
    // The digests reached the model with spawn-ordinal data.
    const finishReq = adapter.calls.filter((r) => agentTypeOf(r) === '').at(-1);
    const digestPart = JSON.stringify(finishReq?.messages.at(-1)?.parts);
    expect(digestPart).toContain('did: task A');
    expect(digestPart).toContain('did: task B');
  });

  it('surfaces admission rejections as typed tool errors and keeps the run alive', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'done' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'first' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'second' } },
          ],
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'survived' } } };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      maxChildrenPerNode: 1,
    });
    const wf = makeOrchestratorWorkflow('goal', {});
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('survived');

    const entries = await store.load('test-run');
    const admissions = admissionEntries(entries);
    expect(admissions).toHaveLength(2);
    const verdicts = admissions.map(
      (e) => (e.value as { decision: { verdict: { kind: string } } }).decision.verdict.kind,
    );
    expect(verdicts).toEqual(['admit', 'reject']);
    // The rejection reached the model as an error tool result.
    const orchCalls = adapter.calls.filter((r) => agentTypeOf(r) === '');
    const secondTurn = JSON.stringify(orchCalls[1]?.messages.at(-1)?.parts);
    expect(secondTurn).toContain('quota');
    // Only one child ever dispatched.
    expect(entries.filter((e) => e.kind === 'agent' && e.scope.startsWith('agent:'))).toHaveLength(
      2,
    );
  });

  it('enforces the per-orchestrate maxSpawns cap', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'done' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'first' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'second' } },
          ],
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'capped' } } };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', { maxSpawns: 1 });
    await expect(executeWorkflow(internals, wf, undefined)).resolves.toBe('capped');
    const secondTurn = adapter.calls.filter((r) => agentTypeOf(r) === '')[1];
    expect(JSON.stringify(secondTurn?.messages.at(-1)?.parts)).toContain('maxSpawns');
  });

  it('cancels an in-flight child and digests it as cancelled', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        const prompt = JSON.stringify(req.messages[0]?.parts);
        return prompt.includes('slow') ? { text: 'too late', hangMs: 30_000 } : { text: 'fast' };
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
      if (orchTurn === 2) {
        const handles = handlesIn(req);
        return { toolCall: { name: 'cancel_agent', args: { handle: handles[1] } } };
      }
      if (orchTurn === 3) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'after cancel' } } };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('goal', {});
    await expect(executeWorkflow(internals, wf, undefined)).resolves.toBe('after cancel');

    const entries = await store.load('test-run');
    const childTerminals = entries.filter(
      (e) => e.kind === 'agent' && e.scope.startsWith('agent:') && e.status !== 'running',
    );
    expect(childTerminals.map((e) => e.status).sort()).toEqual(['cancelled', 'ok']);
    // The model saw the cancelled digest.
    const awaitTurn = adapter.calls.filter((r) => agentTypeOf(r) === '')[3];
    expect(JSON.stringify(awaitTurn?.messages.at(-1)?.parts)).toContain('cancelled');
  });

  it('crash-resume: restores history, finds children by content keys, never re-pays', async () => {
    const transcripts = new InMemoryTranscriptStore();
    // Phase 1: the orchestrator spawns two children (both settle), then
    // its second turn dies on a non-retryable wire error.
    let phase1OrchTurn = 0;
    const adapter1 = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        const prompt = req.messages[0]?.parts.find((p) => p.type === 'text');
        return { text: `paid: ${(prompt as { text: string }).text}` };
      }
      phase1OrchTurn += 1;
      if (phase1OrchTurn === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'expensive A' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'expensive B' } },
          ],
        };
      }
      return {
        error: { code: 'agent', message: 'simulated crash', retryable: false },
      };
    });
    const phase1 = makeInternals({
      adapters: [adapter1],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      transcripts,
    });
    const wf = makeOrchestratorWorkflow('crashy goal', {});
    await expect(executeWorkflow(phase1.internals, wf, undefined)).rejects.toThrow(
      /terminated with status 'error'/,
    );
    const phase1Entries = await phase1.store.load('test-run');
    const phase1Admissions = admissionEntries(phase1Entries);
    expect(phase1Admissions).toHaveLength(2);
    const phase1Handles = phase1Entries
      .filter((e) => e.kind === 'agent' && e.scope.startsWith('agent:') && e.status === 'running')
      .map((e) => e.seq);
    expect(phase1Handles).toHaveLength(2);

    // The crash: the orchestrator terminal never made it to the store.
    // Cutting it (and everything after) leaves a dangling running entry
    // plus the durable boundary checkpoint: exactly a dead process.
    const orchestratorTerminal = phase1Entries.find(
      (e) =>
        e.kind === 'agent' &&
        !e.scope.startsWith('agent:') &&
        e.status !== 'running' &&
        e.status !== 'suspended',
    );
    expect(orchestratorTerminal?.status).toBe('error');
    const priorEntries = phase1Entries.filter((e) => e.seq < (orchestratorTerminal?.seq ?? 0));

    // Phase 2: children must never be re-paid; the orchestrator resumes
    // mid-conversation and completes.
    const adapter2 = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        throw new Error('a child was re-paid on resume');
      }
      // The restored history carries the spawn tool results: the model
      // continues by awaiting the SAME handles.
      const handles = handlesIn(req);
      const sawDigests = JSON.stringify(req.messages.at(-1)?.parts ?? []).includes('paid:');
      if (!sawDigests) {
        return { toolCall: { name: 'await_all', args: { handles } } };
      }
      return { toolCall: { name: 'finish', args: { result: { recovered: handles } } } };
    });
    const phase2 = makeInternals({
      adapters: [adapter2],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      priorEntries,
      store: phase1.store,
      transcripts,
    });
    const outcome = (await executeWorkflow(phase2.internals, wf, undefined)) as {
      recovered: number[];
    };
    // Handles are journal-derived and STABLE across the resume.
    expect(outcome.recovered.sort()).toEqual([...phase1Handles].sort());

    const finalEntries = await phase1.store.load('test-run');
    // No duplicate spawn decisions and no re-dispatched children.
    expect(admissionEntries(finalEntries)).toHaveLength(2);
    expect(
      finalEntries.filter(
        (e) => e.kind === 'agent' && e.scope.startsWith('agent:') && e.status === 'running',
      ),
    ).toHaveLength(2);
    // The workers of phase 2 served ZERO calls: results came from the
    // journal by content key.
    expect(adapter2.calls.filter((r) => agentTypeOf(r) === 'worker')).toHaveLength(0);
    // The restored transcript reached the model: its first phase-2 call
    // already contained the spawn tool results.
    const firstOrchCall = adapter2.calls.find((r) => agentTypeOf(r) === '');
    expect(JSON.stringify(firstOrchCall?.messages ?? [])).toContain('handle');
  });

  it('nests under the AdmissionController via ctx.orchestrate', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'nested child done' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'inner task' } },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'nested ok' } } };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      // The nested orchestrator's children live at depth 2.
      maxDepth: 2,
    });
    const { defineWorkflow } = await import('../engine/ctx.js');
    const host = defineWorkflow({ name: 'host' }, (ctx) => ctx.orchestrate('inner goal'));
    const outcome = await executeWorkflow(internals, host, undefined);
    expect(outcome).toBe('nested ok');

    const entries = await store.load('test-run');
    // The nested orchestrate ran as an admitted child workflow.
    const childWorkflows = entries.filter((e) => e.kind === 'child');
    expect(childWorkflows.length).toBeGreaterThan(0);
    expect((childWorkflows[0]?.value as { childScope?: string })?.childScope).toBe(
      'wf:lurker-orchestrate:0',
    );
    // Its child agent journals under the nested scope.
    const nested = entries.filter((e) => e.scope.startsWith('wf:lurker-orchestrate:0/agent:'));
    expect(nested.length).toBeGreaterThan(0);
  });
});
