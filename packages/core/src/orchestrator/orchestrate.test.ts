import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import type { JournalEntry } from '../l0/entries.js';
import { FailRunError } from '../l0/errors.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import type { AgentProfile } from '../engine/ctx.js';
import { createEngine } from '../engine/engine.js';
import { GitWorktreeProvider } from '../tools/isolation.js';
import { tool } from '../tools/tool.js';
import { makeOrchestratorWorkflow, orchestrate } from './orchestrate.js';

/** The telemetry namespace tells orchestrator requests from child ones. */
function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
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
    // The event carries the journaled decision ref and the admitting
    // verdict arm, per the typed catalog.
    for (const admitted of events.ofType('spawn:admitted')) {
      expect(admitted.verdict).toBe('admit');
      expect(typeof admitted.entryRef).toBe('number');
    }
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

  it('keeps ladder declarers out of the spawn vocabulary and rejects them pre-admission', async () => {
    // Found live by the M12 checkpoint: the kb card names ladder tiers
    // by profile name, and a card-informed orchestrator spawned the
    // declarers, which can only die at wire resolution.
    const profiles: Record<string, AgentProfile> = {
      worker: { description: 'does one task' },
      swiftLadder: {
        description: 'declared ladder swift',
        model: {
          ladder: {
            rungs: [
              { model: 'fake:cheap', maxTurns: 4, maxTokens: 1024 },
              { model: 'fake:strong', maxTurns: 4, maxTokens: 1024 },
            ],
            startTier: 1,
            escalateOn: ['error' as const],
          },
        },
      },
    };
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'done' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'swiftLadder', prompt: 'climb' } },
        };
      }
      if (orchTurn === 2) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'concrete' } },
        };
      }
      if (orchTurn === 3) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'survived' } } };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles,
    });
    const outcome = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {}),
      undefined,
    );
    expect(outcome).toBe('survived');

    // The vocabulary: concrete profiles are agentTypes; the declarer
    // rides the context line only.
    const firstReq = adapter.calls.find((req) => agentTypeOf(req) === '');
    const spawnTool = firstReq?.tools?.find((tool) => tool.name === 'spawn_agent');
    expect(spawnTool?.description).toContain('- worker: does one task');
    expect(spawnTool?.description).not.toContain('- swiftLadder:');
    expect(spawnTool?.description).toContain('Declared ladders');
    expect(spawnTool?.description).toContain('swiftLadder');

    // The doomed spawn burned no admission slot: one spawn-admission
    // decision total (the concrete worker), and the typed rejection
    // reached the model as an error tool result naming the rule.
    const entries = await store.load('test-run');
    expect(admissionEntries(entries)).toHaveLength(1);
    const orchCalls = adapter.calls.filter((req) => agentTypeOf(req) === '');
    const secondTurn = JSON.stringify(orchCalls[1]?.messages.at(-1)?.parts);
    expect(secondTurn).toContain('declares a ladder');
  });

  it('admits children under a small run ceiling: the orchestrator reserves its cap, not maxOutputTokens', async () => {
    // Found live by the M12 checkpoint: the
    // default admission reserve of the orchestrator agent (flat here,
    // full maxOutputTokens pricing live) pinned the root remainder at
    // zero for the whole orchestration, so every child spawn died with
    // a budget rejection and both A/B arms measured a self-solving
    // orchestrator. With the cap as the reserve, children admit.
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'done' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'child' } },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'delegated' } } };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      // The worker profile carries a realistic estCost so the child's
      // own layer-1 reserve stays under the remainder.
      profiles: { worker: { description: 'does one task', estCost: 0.01 } },
      // The flat reserve alone exceeds the ceiling: without the cap
      // hint the orchestrator's commitment zeroes the root remainder.
      budgetUsd: 0.4,
      flatReserveUsd: 0.5,
    });
    const wf = makeOrchestratorWorkflow('delegate the task', {
      budget: { capUsd: 0.1, finalizeReserveUsd: 0.02 },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('delegated');
    const entries = await store.load('test-run');
    const admissions = admissionEntries(entries);
    expect(admissions).toHaveLength(1);
    expect(
      (admissions[0]?.value as { decision: { verdict: { kind: string } } }).decision.verdict.kind,
    ).toBe('admit');
    // The child actually ran.
    expect(
      entries.filter((e) => e.kind === 'agent' && e.scope.startsWith('agent:') && e.status === 'ok')
        .length,
    ).toBeGreaterThan(0);
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
    // A real crash loses the unappended tail EVERYWHERE: the truncated
    // journal must live in an equally truncated store, or the resumed
    // replayer appends from a stale tail and the A5 monotonic-seq guard
    // rejects it (the guard exists exactly for that corruption).
    const truncatedStore = new InMemoryStore({ quiet: true });
    for (const entry of priorEntries) {
      await truncatedStore.append('test-run', entry);
    }

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
      store: truncatedStore,
      transcripts,
    });
    const outcome = (await executeWorkflow(phase2.internals, wf, undefined)) as {
      recovered: number[];
    };
    // Handles are journal-derived and STABLE across the resume.
    expect(outcome.recovered.sort()).toEqual([...phase1Handles].sort());

    const finalEntries = await truncatedStore.load('test-run');
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
      'wf:rulvar-orchestrate:0',
    );
    // Its child agent journals under the nested scope.
    const nested = entries.filter((e) => e.scope.startsWith('wf:rulvar-orchestrate:0/agent:'));
    expect(nested.length).toBeGreaterThan(0);
  });

  it('re-prompts a plain end turn toward finish and recovers when the model complies', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((): ScriptedTurn => {
      orchTurn += 1;
      if (orchTurn === 1) {
        // A text-only end turn: previously this settled the whole
        // orchestration ok with this text as the value, without finish
        // ever firing (v1.6.0 follow-up review).
        return { text: 'here is my answer in plain text' };
      }
      return { toolCall: { name: 'finish', args: { result: 'complied' } } };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('answer the question', {});
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('complied');
    expect(adapter.calls).toHaveLength(2);
    const rePrompt = JSON.stringify(adapter.calls[1]?.messages.at(-1)?.parts);
    expect(rePrompt).toContain("Call the 'finish' tool to complete");
    expect(rePrompt).not.toContain('output token limit');
  });

  it('terminates as a bounded limit, never ok, when the model never calls finish', async () => {
    const adapter = scriptedAdapter((): ScriptedTurn => ({ text: 'still thinking out loud' }));
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('answer the question', {});
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toThrow(
      /status 'limit'.*no-progress/,
    );
    // The no-progress detector bounds the retries: three consecutive
    // toolless turns, then the typed abort; the loop never spins.
    expect(adapter.calls).toHaveLength(3);
    const entries = await store.load('test-run');
    expect(admissionEntries(entries)).toHaveLength(0);
  });

  it('a crossed orchestrator cap names itself in the budget error, not the run ceiling', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((): ScriptedTurn => {
      orchTurn += 1;
      if (orchTurn === 1) {
        // One expensive toolless orchestrator turn: 600k input tokens at
        // 1 USD/MTok crosses the 0.2 USD default-fraction cap while the
        // 1.0 USD root stays healthy.
        return { usage: { inputTokens: 600_000 } };
      }
      return { toolCall: { name: 'finish', args: { result: 'r' } } };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      budgetUsd: 1,
    });
    const wf = makeOrchestratorWorkflow('spend a lot', {});
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toThrow(
      /orchestrator budget cap reached during agent execution \(account 'orchestrator': spent 0\.6000 of 0\.2000 USD; run root: spent 0\.6000 of 1\.0000 USD\)/,
    );
  });

  it('warns when an explicit capUsd is bounded by the default capFraction', async () => {
    const adapter = scriptedAdapter((): ScriptedTurn => ({
      toolCall: { name: 'finish', args: { result: 'r' } },
    }));
    const { internals, events } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      budgetUsd: 0.9,
    });
    const wf = makeOrchestratorWorkflow('quick', { budget: { capUsd: 0.7 } });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('r');
    // The review's live shape: min(0.70, 0.2 * 0.90) = 0.18 silently.
    const warns = events
      .ofType('log')
      .map((event) => ({ level: event.level, msg: typeof event.msg === 'string' ? event.msg : '' }))
      .filter((event) => event.level === 'warn' && event.msg.includes('capFraction: 1.0'));
    expect(warns).toHaveLength(1);
    expect(warns[0]?.msg).toContain('0.7000');
    expect(warns[0]?.msg).toContain('0.1800');
  });

  it('treats a turn cut at the output bound without a tool call as non-success', async () => {
    // The live shape behind the review finding: the whole turn allowance
    // consumed by reasoning, zero visible text, zero tool calls, the
    // stream ending at the output token bound.
    const adapter = scriptedAdapter((): ScriptedTurn => ({ finish: 'max-tokens' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('answer the question', {});
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toThrow(/status 'limit'/);
    // The corrective re-prompt names the cut so the model can adapt.
    const rePrompt = JSON.stringify(adapter.calls[1]?.messages.at(-1)?.parts);
    expect(rePrompt).toContain('cut at the output token limit');
  });

  describe('the public helper carries RunOptions (v1.18.0 review P1-5)', () => {
    it('freezes the root budgetUsd in RunMeta and threads the runId', async () => {
      const adapter = scriptedAdapter((): ScriptedTurn => ({
        toolCalls: [{ name: 'finish', args: { result: { done: true } } }],
      }));
      const store = new InMemoryStore();
      const engine = createEngine({
        adapters: [adapter],
        stores: { journal: store },
        defaults: {
          routing: { loop: 'fake:model', orchestrate: 'fake:model' },
          profiles: PROFILES,
        },
      });
      const handle = orchestrate(
        engine,
        'one and done',
        { maxSpawns: 2 },
        { budgetUsd: 2.5, runId: 'root-ceiling' },
      );
      const outcome = await handle.result;
      expect(outcome.status).toBe('ok');
      expect(handle.runId).toBe('root-ceiling');
      const meta = (await store.listRuns()).find((m) => m.runId === 'root-ceiling');
      expect(meta?.budgetUsd).toBe(2.5);
    });

    it('a root ceiling the projected reserve exceeds denies the whole tree before any provider call', async () => {
      let calls = 0;
      const adapter = scriptedAdapter((): ScriptedTurn => {
        calls += 1;
        return { text: 'never reached' };
      });
      const engine = createEngine({
        adapters: [adapter],
        stores: { journal: new InMemoryStore() },
        defaults: {
          routing: { loop: 'fake:model', orchestrate: 'fake:model' },
          profiles: PROFILES,
        },
        // Priced so projected admission can bound the model: the output
        // allowance alone reserves far beyond the $0.30 root ceiling.
        pricing: {
          pricingVersion: 'test-1',
          models: { 'fake:model': { inputUsdPerMTok: 1, outputUsdPerMTok: 1_000_000 } },
        },
      });
      const handle = orchestrate(engine, 'too poor to start', undefined, { budgetUsd: 0.3 });
      const outcome = await handle.result;
      expect(outcome.status).not.toBe('ok');
      // The root ceiling passed through the helper binds the entire
      // tree: not even the orchestrator's own first turn dispatched.
      expect(calls).toBe(0);
    });
  });
});

describe('acceptance: the child completion policy (v1.40.0 improvement plan)', () => {
  /** Scripts the standard flow with two children; worker turns come from workerTurn. */
  function twoChildAdapter(workerTurn: (prompt: string) => ScriptedTurn) {
    let orchTurn = 0;
    return scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        const prompt = req.messages[0]?.parts.find((p) => p.type === 'text') as
          { text: string } | undefined;
        return workerTurn(prompt?.text ?? '');
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
      return { toolCall: { name: 'finish', args: { result: { answer: 42 } } } };
    });
  }

  const FAILING_B = (prompt: string): ScriptedTurn =>
    prompt === 'task B'
      ? { error: { code: 'agent', message: 'task B exploded', retryable: false } }
      : { text: 'did it' };

  it('all-ok with every child ok returns the complete envelope', async () => {
    const adapter = twoChildAdapter(() => ({ text: 'did it' }));
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('collect', { acceptance: { childPolicy: 'all-ok' } });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toEqual({
      result: { answer: 42 },
      completion: 'complete',
      childStatusCounts: { ok: 2 },
      degradedReasons: [],
    });
    // ONE journaled acceptance decision carries the verdict.
    const decisions = (await store.load('test-run')).filter(
      (e) =>
        e.kind === 'decision' &&
        (e.value as { decisionType?: string }).decisionType === 'orchestrator_acceptance',
    );
    expect(decisions).toHaveLength(1);
    expect((decisions[0]?.value as { verdict?: string }).verdict).toBe('accepted');
  });

  it('all-ok with a failed child rejects the finish with the typed FailRunError', async () => {
    const adapter = twoChildAdapter(FAILING_B);
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('collect', { acceptance: { childPolicy: 'all-ok' } });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as {
      source?: string;
      childStatusCounts?: Record<string, number>;
      degradedReasons?: string[];
    };
    expect(data.source).toBe('orchestrator_acceptance');
    expect(data.childStatusCounts).toEqual({ ok: 1, error: 1 });
    expect(data.degradedReasons?.[0]).toContain("settled 'error'");
    // The rejected verdict is journaled BEFORE the throw, so a resume
    // rolls the same rejection forward.
    const decisions = (await store.load('test-run')).filter(
      (e) =>
        e.kind === 'decision' &&
        (e.value as { decisionType?: string }).decisionType === 'orchestrator_acceptance',
    );
    expect(decisions).toHaveLength(1);
    expect((decisions[0]?.value as { verdict?: string }).verdict).toBe('rejected');
  });

  it('minSuccessful accepts a partial and reports the degraded child', async () => {
    const adapter = twoChildAdapter(FAILING_B);
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: { minSuccessful: 1 } },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as {
      result: unknown;
      completion: string;
      childStatusCounts: Record<string, number>;
      degradedReasons: string[];
    };
    expect(outcome.result).toEqual({ answer: 42 });
    expect(outcome.completion).toBe('partial');
    expect(outcome.childStatusCounts).toEqual({ ok: 1, error: 1 });
    expect(outcome.degradedReasons).toHaveLength(1);
    expect(outcome.degradedReasons[0]).toContain("settled 'error'");
  });

  it('minSuccessful rejects when too few children succeeded', async () => {
    const adapter = twoChildAdapter(() => ({
      error: { code: 'agent', message: 'exploded', retryable: false },
    }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: { minSuccessful: 2 } },
    });
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toThrow(
      /requires at least 2 children ok/,
    );
  });

  it('without acceptance the result value stays the raw finish payload', async () => {
    const adapter = twoChildAdapter(FAILING_B);
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('collect', {});
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toEqual({ answer: 42 });
    // And no acceptance decision is journaled: existing flows gain no
    // new entries, so frozen cassettes stay byte for byte identical.
    const decisions = (await store.load('test-run')).filter(
      (e) =>
        e.kind === 'decision' &&
        (e.value as { decisionType?: string }).decisionType === 'orchestrator_acceptance',
    );
    expect(decisions).toHaveLength(0);
  });

  it('a child still running when finish validates counts against all-ok', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        // Parks until the scope teardown aborts it: still running at finish.
        return { text: 'parked', hangMs: 5_000 };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'slow task' } },
        };
      }
      // Finishes WITHOUT awaiting the child.
      return { toolCall: { name: 'finish', args: { result: 'done early' } } };
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('rush', { acceptance: { childPolicy: 'all-ok' } });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as { degradedReasons?: string[] };
    expect(data.degradedReasons?.[0]).toContain('still running when finish validated');
  }, 10_000);

  it('a resume rolls the journaled verdict forward, immune to drifted live options', async () => {
    const store = new InMemoryStore();
    const makeAdapter = () => twoChildAdapter(FAILING_B);
    const engineA = createEngine({
      adapters: [makeAdapter()],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model', orchestrate: 'fake:model' }, profiles: PROFILES },
    });
    const first = await engineA.run(
      makeOrchestratorWorkflow('collect', { acceptance: { childPolicy: { minSuccessful: 1 } } }),
      undefined,
      { runId: 'ACC-DRIFT' },
    ).result;
    expect(first.status).toBe('ok');
    const firstValue = first.value as { completion: string };
    expect(firstValue.completion).toBe('partial');

    // The resume host drifts the policy to all-ok, which would REJECT the
    // same children if evaluated again; the journaled accepted verdict wins
    // and the envelope reproduces byte for byte.
    const engineB = createEngine({
      adapters: [makeAdapter()],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model', orchestrate: 'fake:model' }, profiles: PROFILES },
    });
    const resumed = await engineB.resume(
      'ACC-DRIFT',
      makeOrchestratorWorkflow('collect', { acceptance: { childPolicy: 'all-ok' } }),
    ).result;
    expect(resumed.status).toBe('ok');
    expect(JSON.stringify(resumed.value)).toBe(JSON.stringify(first.value));
  });

  it('rejects malformed acceptance policies synchronously at construction', () => {
    expect(() =>
      makeOrchestratorWorkflow('g', {
        acceptance: { childPolicy: 'most-ok' as unknown as 'all-ok' },
      }),
    ).toThrow(/childPolicy/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        acceptance: { childPolicy: { minSuccessful: 0 } },
      }),
    ).toThrow(/minSuccessful/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        acceptance: { childPolicy: { minSuccessful: Number.NaN } },
      }),
    ).toThrow(/minSuccessful/);
  });
});

/** Every unique result the model received for calls to `toolName`, in order. */
function toolResults(
  calls: readonly ChatRequest[],
  toolName: string,
): Array<Record<string, unknown>> {
  const bySeenId = new Map<string, Record<string, unknown>>();
  for (const req of calls) {
    for (const msg of req.messages) {
      for (const part of msg.parts) {
        if (part.type === 'tool-result' && part.name === toolName && !bySeenId.has(part.id)) {
          bySeenId.set(part.id, part.result as Record<string, unknown>);
        }
      }
    }
  }
  return [...bySeenId.values()];
}

describe('child result evidence tools (v1.40.0 improvement plan, RV-201)', () => {
  const HUGE = 'EVIDENCE-' + 'y'.repeat(6000);
  const DIGGER = { digger: { description: 'a digging child' } };

  /**
   * The orchestrator spawns one child, awaits it, then runs the tool calls
   * `middle(handle)` produces (the child handle is journal-derived, learnt
   * at the await turn) before finishing.
   */
  function singleChildAdapter(
    childTurn: (prompt: string) => ScriptedTurn,
    middle: (handle: number) => Array<{ name: string; args: unknown }>,
  ) {
    let orchTurn = 0;
    let steps: Array<{ name: string; args: unknown }> = [];
    return scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'digger') {
        const prompt = req.messages[0]?.parts.find((p) => p.type === 'text') as
          { text: string } | undefined;
        return childTurn(prompt?.text ?? '');
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return { toolCall: { name: 'spawn_agent', args: { agentType: 'digger', prompt: 'dig' } } };
      }
      if (orchTurn === 2) {
        const handles = handlesIn(req);
        steps = middle(handles[0] ?? -1);
        return { toolCall: { name: 'await_all', args: { handles } } };
      }
      const step = steps[orchTurn - 3];
      if (step !== undefined) {
        return { toolCall: step };
      }
      return { toolCall: { name: 'finish', args: { result: 'read the evidence' } } };
    });
  }

  it('exposeChildResultTools pages a settled child FULL output past the 400 char digest', async () => {
    const adapter = singleChildAdapter(
      () => ({ text: HUGE }),
      (h) => [
        { name: 'get_child_result', args: { handle: h, maxChars: 100 } },
        { name: 'get_child_result', args: { handle: h, offset: 100 } },
      ],
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: DIGGER,
    });
    const wf = makeOrchestratorWorkflow('gather', { exposeChildResultTools: true });
    expect(await executeWorkflow(internals, wf, undefined)).toBe('read the evidence');

    const pages = toolResults(
      adapter.calls.filter((r) => agentTypeOf(r) === ''),
      'get_child_result',
    );
    expect(pages).toHaveLength(2);
    // The FIRST page: bounded to 100 chars, honest totalChars, more to come.
    const [page1, page2] = pages;
    expect(page1?.status).toBe('ok');
    expect(page1?.totalChars).toBe(HUGE.length);
    expect(page1?.offset).toBe(0);
    expect((page1?.content as string).length).toBe(100);
    expect(page1?.content).toBe(HUGE.slice(0, 100));
    expect(page1?.hasMore).toBe(true);
    expect(page1?.artifacts).toEqual([]);
    // The SECOND page: from offset 100, the default window, still more.
    expect(page2?.offset).toBe(100);
    expect((page2?.content as string).length).toBe(4000);
    expect(page2?.content).toBe(HUGE.slice(100, 4100));
    expect(page2?.hasMore).toBe(true);
  });

  it('clamps an oversized maxChars and an offset past the end', async () => {
    const adapter = singleChildAdapter(
      () => ({ text: HUGE }),
      (h) => [
        { name: 'get_child_result', args: { handle: h, maxChars: 10_000_000 } },
        { name: 'get_child_result', args: { handle: h, offset: 999_999 } },
      ],
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: DIGGER,
    });
    const wf = makeOrchestratorWorkflow('gather', { exposeChildResultTools: true });
    await executeWorkflow(internals, wf, undefined);
    const [clamped, past] = toolResults(
      adapter.calls.filter((r) => agentTypeOf(r) === ''),
      'get_child_result',
    );
    // maxChars clamps to the 20000 hard max; the whole 6009-char body fits.
    expect((clamped?.content as string).length).toBe(HUGE.length);
    expect(clamped?.hasMore).toBe(false);
    // offset past the end yields an empty tail, not an error.
    expect(past?.offset).toBe(HUGE.length);
    expect(past?.content).toBe('');
    expect(past?.hasMore).toBe(false);
  });

  it('reads a FAILED child errorMessage as evidence, and errors on an unknown handle', async () => {
    const adapter = singleChildAdapter(
      () => ({
        error: { code: 'agent', message: 'the dig collapsed at layer 3', retryable: false },
      }),
      (h) => [
        { name: 'get_child_result', args: { handle: h } },
        { name: 'get_child_result', args: { handle: 999 } },
      ],
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: DIGGER,
    });
    const wf = makeOrchestratorWorkflow('gather', { exposeChildResultTools: true });
    await executeWorkflow(internals, wf, undefined);
    const orchCalls = adapter.calls.filter((r) => agentTypeOf(r) === '');
    const [failed] = toolResults(orchCalls, 'get_child_result');
    expect(failed?.status).toBe('error');
    expect(failed?.content).toContain('the dig collapsed at layer 3');
    // An unknown handle surfaces as a typed error tool result to the model.
    const conversation = JSON.stringify(orchCalls.at(-1)?.messages ?? []);
    expect(conversation).toContain('unknown handle 999');
  });

  it('leaves the tools and the toolset UNCHANGED when not opted in', async () => {
    const adapter = singleChildAdapter(
      () => ({ text: HUGE }),
      (h) => [{ name: 'get_child_result', args: { handle: h } }],
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: DIGGER,
    });
    // Default (opt out): the tools are not offered, and a call to one is a
    // refused as an unknown tool, exactly as before this feature existed.
    const wf = makeOrchestratorWorkflow('gather', {});
    await executeWorkflow(internals, wf, undefined);
    const orchCalls = adapter.calls.filter((r) => agentTypeOf(r) === '');
    const toolNames = (orchCalls[0]?.tools ?? []).map((t) => t.name);
    expect(toolNames).not.toContain('get_child_result');
    expect(toolNames).not.toContain('read_child_artifact');
    // Calling the absent tool produced only an unknown tool refusal, never a
    // valid page (a real page always carries totalChars).
    const results = toolResults(orchCalls, 'get_child_result');
    expect(results.every((r) => r.totalChars === undefined)).toBe(true);
    const conversation = JSON.stringify(orchCalls.at(-1)?.messages ?? []);
    expect(conversation.toLowerCase()).toMatch(/unknown tool|no tool|not (a )?(registered|known)/);
  });

  it('read_child_artifact pages a real worktree-patch child artifact', async () => {
    const git = promisify(execFile);
    const repo = await mkdtemp(join(tmpdir(), 'rulvar-orch-repo-'));
    const run = (...args: string[]) => git('git', ['-C', repo, ...args]);
    await run('init', '--initial-branch=main');
    await run('config', 'user.email', 'test@example.com');
    await run('config', 'user.name', 'Test');
    await writeFile(join(repo, 'README.md'), 'base\n');
    await run('add', '-A');
    await run('commit', '-m', 'initial');

    const writeNote = tool({
      name: 'write_note',
      description: 'writes a note into the working directory',
      parameters: { type: 'object' },
      risk: 'write',
      execute: async (_input, ctx) => {
        await writeFile(join(ctx.cwd, 'note.txt'), 'from the child agent\n');
        return `wrote into ${ctx.cwd}`;
      },
    });

    let orchTurn = 0;
    let childHandle = -1;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'builder') {
        // Turn 0: the child writes a note in its worktree; turn 1 ends,
        // and the worktree collect attaches the patch artifact.
        return req.messages.some((m) => m.parts.some((p) => p.type === 'tool-result'))
          ? { text: 'noted' }
          : { toolCall: { name: 'write_note', args: {} } };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'builder', prompt: 'edit' } },
        };
      }
      if (orchTurn === 2) {
        childHandle = handlesIn(req)[0] ?? -1;
        return { toolCall: { name: 'await_all', args: { handles: [childHandle] } } };
      }
      if (orchTurn === 3) {
        return {
          toolCall: {
            name: 'read_child_artifact',
            args: { handle: childHandle, artifactId: 'worktree-patch' },
          },
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'patch read' } } };
    });

    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      isolation: new GitWorktreeProvider({ repoRoot: repo }),
      profiles: {
        builder: {
          description: 'edits files in a worktree',
          isolation: { kind: 'worktree' },
          tools: [writeNote],
        },
      },
    });
    const wf = makeOrchestratorWorkflow('build it', { exposeChildResultTools: true });
    expect(await executeWorkflow(internals, wf, undefined)).toBe('patch read');

    const orchCalls = adapter.calls.filter((r) => agentTypeOf(r) === '');
    const [artifactPage] = toolResults(orchCalls, 'read_child_artifact');
    expect(artifactPage?.kind).toBe('patch');
    expect(artifactPage?.artifactId).toBe('worktree-patch');
    expect(artifactPage?.files).toEqual(['note.txt']);
    // The patch content is the durable transcript blob, decoded and paged.
    expect(artifactPage?.content).toContain('from the child agent');
    expect(artifactPage?.hasMore).toBe(false);
  }, 15_000);
});
