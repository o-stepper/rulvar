import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import type { JournalEntry } from '../l0/entries.js';
import { ConfigError, FailRunError } from '../l0/errors.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { defineWorkflow, executeWorkflow } from '../engine/ctx.js';
import {
  makeInternals,
  scriptedAdapter,
  testCaps,
  type ScriptedTurn,
} from '../engine/test-harness.js';
import type { AgentProfile } from '../engine/ctx.js';
import { createEngine } from '../engine/engine.js';
import { GitWorktreeProvider } from '../tools/isolation.js';
import { tool } from '../tools/tool.js';
import {
  evidencePreservedValidator,
  minMatchesValidator,
  requiredSectionsValidator,
  wordCountValidator,
  type FinishValidationInput,
  type FinishValidator,
} from './finish-validators.js';
import { finishContract } from './output-contract.js';
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

  it('opts.profiles is an enforced allowlist: a hidden profile refuses typed before admission (RV1011)', async () => {
    // The advertisement was filtered but the dispatch resolved from the
    // FULL registry, so a spawn naming a registered-but-hidden profile
    // by a guessed name went straight through: the vocabulary the host
    // limited must be the vocabulary the dispatch honors.
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'hidden' || agentTypeOf(req) === 'worker') {
        return { text: 'child done' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'hidden', prompt: 'sneak in' } },
        };
      }
      if (orchTurn === 2) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'real task' } },
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
      profiles: {
        worker: { description: 'does one task' },
        hidden: { description: 'registered but outside this orchestrate allowlist' },
      },
    });
    const wf = makeOrchestratorWorkflow('goal', { profiles: ['worker'] });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('survived');

    const entries = await store.load('test-run');
    // ONE admission decision total (the allowed worker): the hidden
    // spawn refused typed BEFORE admission and burned nothing.
    expect(admissionEntries(entries)).toHaveLength(1);
    const childAgents = entries.filter(
      (e) => e.kind === 'agent' && e.scope.startsWith('agent:') && e.status === 'ok',
    );
    expect(childAgents).toHaveLength(1);
    // The typed refusal reached the model naming the allowlist and the
    // advertised vocabulary.
    const orchCallsAll = adapter.calls.filter((req) => agentTypeOf(req) === '');
    const refusalTurn = JSON.stringify(orchCallsAll[1]?.messages.at(-1)?.parts);
    expect(refusalTurn).toContain('allowlist');
    expect(refusalTurn).toContain('worker');
  });

  it('a prototype name is never in the vocabulary: the allowlist reads own properties only (RV1205)', async () => {
    // The sixteenth experiment's judge repro R3: profiles ['toString']
    // passed the allowlist through the prototype chain (spawn:admitted
    // recorded, the slot burned) and the spawn died only later on the
    // garbage inherited value. Both the filter and the enforcement must
    // read OWN properties: a prototype name refuses typed BEFORE
    // admission and burns nothing.
    const sneakyNames = ['toString', 'constructor', 'hasOwnProperty', '__proto__'];
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'child done' };
      }
      orchTurn += 1;
      if (orchTurn <= sneakyNames.length) {
        return {
          toolCall: {
            name: 'spawn_agent',
            args: { agentType: sneakyNames[orchTurn - 1], prompt: 'sneak in' },
          },
        };
      }
      if (orchTurn === sneakyNames.length + 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'real task' } },
        };
      }
      if (orchTurn === sneakyNames.length + 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'survived' } } };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: { worker: { description: 'does one task' } },
    });
    // The allowlist REQUEST even names the prototype keys: the filter
    // must drop them (nothing own to advertise), never resolve them.
    const wf = makeOrchestratorWorkflow('goal', { profiles: ['worker', ...sneakyNames] });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('survived');

    const entries = await store.load('test-run');
    // ONE admission decision total (the real worker): every prototype
    // name refused typed BEFORE admission and burned nothing.
    expect(admissionEntries(entries)).toHaveLength(1);
    const childAgents = entries.filter(
      (e) => e.kind === 'agent' && e.scope.startsWith('agent:') && e.status === 'ok',
    );
    expect(childAgents).toHaveLength(1);
    // Each refusal reached the model naming the allowlist, and the
    // advertised vocabulary never grew a prototype entry.
    const orchCallsAll = adapter.calls.filter((req) => agentTypeOf(req) === '');
    for (let turn = 1; turn <= sneakyNames.length; turn += 1) {
      const refusalTurn = JSON.stringify(orchCallsAll[turn]?.messages.at(-1)?.parts);
      expect(refusalTurn).toContain('allowlist');
    }
    const spawnTool = orchCallsAll[0]?.tools?.find((tool) => tool.name === 'spawn_agent');
    expect(spawnTool?.description).not.toContain('toString');
  });

  it('without an allowlist the advertised set IS the registry, and a prototype name resolves no profile there either (RV1205)', async () => {
    // The no-allowlist path reads the host's own registry object, which
    // carries Object.prototype: the profile RESOLUTION must be
    // own-property too, or a spawn naming 'toString' hands a function
    // downstream as its profile instead of resolving nothing.
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'child done' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'toString', prompt: 'sneak in' } },
        };
      }
      if (orchTurn === 2) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'real task' } },
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
      profiles: { worker: { description: 'does one task' } },
    });
    const wf = makeOrchestratorWorkflow('goal', {});
    expect(await executeWorkflow(internals, wf, undefined)).toBe('survived');

    // The prototype spawn resolved NO profile: the child refused typed
    // as an unregistered agentType, and exactly one child ran ok.
    const entries = await store.load('test-run');
    const childAgents = entries.filter(
      (e) => e.kind === 'agent' && e.scope.startsWith('agent:') && e.status === 'ok',
    );
    expect(childAgents).toHaveLength(1);
    const orchCallsAll = adapter.calls.filter((req) => agentTypeOf(req) === '');
    const afterSneak = JSON.stringify(orchCallsAll[1]?.messages.at(-1)?.parts);
    expect(afterSneak).toContain('unknown agentType');
    // The advertised card never offered it.
    const spawnTool = orchCallsAll[0]?.tools?.find((tool) => tool.name === 'spawn_agent');
    expect(spawnTool?.description).not.toContain('toString');
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

  describe('the maxSpawns slot ledger (the sixth comparison experiment, cycle 77)', () => {
    // The rematch's run 2: a spawn died on a transient budget rejection,
    // and the orchestrator's perfect retry at a lower budget was refused
    // 'orchestrate maxSpawns N reached' because the gate counted attempt
    // ordinals, not admitted children. Under the 1.0 ceiling a hanging
    // 0.3 child leaves the next 0.3 projection short (certain budget
    // rejection) while a 0.02 retry still fits.
    const CHILD_BUDGET = 0.3;
    const RETRY_BUDGET = 0.02;

    const spawnWave = (includeRetry: boolean): ScriptedTurn => ({
      toolCalls: [
        {
          name: 'spawn_agent',
          args: { agentType: 'worker', prompt: 'one', budgetUsd: CHILD_BUDGET },
        },
        {
          name: 'spawn_agent',
          args: { agentType: 'worker', prompt: 'two', budgetUsd: CHILD_BUDGET },
        },
        ...(includeRetry
          ? [
              {
                name: 'spawn_agent',
                args: { agentType: 'worker', prompt: 'two again', budgetUsd: RETRY_BUDGET },
              },
            ]
          : []),
      ],
    });

    const verdictsOf = (entries: readonly JournalEntry[]): { kind: string; code?: string }[] =>
      admissionEntries(entries).map((e) => {
        const verdict = (
          e.value as { decision: { verdict: { kind: string; reason?: { code?: string } } } }
        ).decision.verdict;
        return {
          kind: verdict.kind,
          ...(verdict.reason?.code === undefined ? {} : { code: verdict.reason.code }),
        };
      });

    it('an admission-rejected spawn does not burn a slot: the lowered retry admits', async () => {
      let orchTurn = 0;
      const adapter = scriptedAdapter((req): ScriptedTurn => {
        if (agentTypeOf(req) === 'worker') {
          return { text: 'held', hangMs: 30_000 };
        }
        orchTurn += 1;
        if (orchTurn === 1) {
          return spawnWave(true);
        }
        if (orchTurn === 2) {
          // The cap is now truly exhausted by ADMITTED children: the
          // refusal message survives the fix verbatim.
          return {
            toolCall: {
              name: 'spawn_agent',
              args: { agentType: 'worker', prompt: 'three', budgetUsd: RETRY_BUDGET },
            },
          };
        }
        if (orchTurn === 3) {
          return {
            toolCalls: handlesIn(req).map((handle) => ({ name: 'cancel_agent', args: { handle } })),
          };
        }
        return { toolCall: { name: 'finish', args: { result: 'adapted' } } };
      });
      const { internals, store } = makeInternals({
        adapters: [adapter],
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: PROFILES,
        budgetUsd: 1,
      });
      const wf = makeOrchestratorWorkflow('goal', { maxSpawns: 2 });
      const outcome = await executeWorkflow(internals, wf, undefined);
      expect(outcome).toBe('adapted');
      const verdicts = verdictsOf(await store.load('test-run'));
      expect(verdicts).toEqual([
        { kind: 'admit' },
        { kind: 'reject', code: 'budget' },
        { kind: 'admit' },
      ]);
      const orchCalls = adapter.calls.filter((r) => agentTypeOf(r) === '');
      // The retry's own result carries a handle, never the cap refusal.
      expect(JSON.stringify(orchCalls[1]?.messages.at(-1)?.parts)).not.toContain('maxSpawns');
      // The third spawn crossed the cap of ADMITTED children.
      expect(JSON.stringify(orchCalls[2]?.messages.at(-1)?.parts)).toContain(
        'orchestrate maxSpawns 2 reached',
      );
    });

    it('admitted spawns still exhaust the cap with the same refusal', async () => {
      let orchTurn = 0;
      const adapter = scriptedAdapter((req): ScriptedTurn => {
        if (agentTypeOf(req) === 'worker') {
          return { text: 'done' };
        }
        orchTurn += 1;
        if (orchTurn === 1) {
          return {
            toolCalls: [
              { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'a' } },
              { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'b' } },
            ],
          };
        }
        if (orchTurn === 2) {
          return { toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'c' } } };
        }
        return { toolCall: { name: 'finish', args: { result: 'capped' } } };
      });
      const { internals, store } = makeInternals({
        adapters: [adapter],
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: PROFILES,
      });
      const wf = makeOrchestratorWorkflow('goal', { maxSpawns: 2 });
      await expect(executeWorkflow(internals, wf, undefined)).resolves.toBe('capped');
      // The config-gate refusal precedes any journal append.
      expect(verdictsOf(await store.load('test-run'))).toEqual([
        { kind: 'admit' },
        { kind: 'admit' },
      ]);
      const orchCalls = adapter.calls.filter((r) => agentTypeOf(r) === '');
      expect(JSON.stringify(orchCalls[2]?.messages.at(-1)?.parts)).toContain(
        'orchestrate maxSpawns 2 reached',
      );
    });

    it('a crash-resume recounts recovered admits, not recovered rejections', async () => {
      const transcripts = new InMemoryTranscriptStore();
      let phase1OrchTurn = 0;
      const adapter1 = scriptedAdapter((req): ScriptedTurn => {
        if (agentTypeOf(req) === 'worker') {
          return { text: 'held', hangMs: 30_000 };
        }
        phase1OrchTurn += 1;
        if (phase1OrchTurn === 1) {
          return spawnWave(false);
        }
        return { error: { code: 'agent', message: 'simulated crash', retryable: false } };
      });
      const phase1 = makeInternals({
        adapters: [adapter1],
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: PROFILES,
        budgetUsd: 1,
        transcripts,
      });
      const wf = makeOrchestratorWorkflow('goal', { maxSpawns: 2 });
      await expect(executeWorkflow(phase1.internals, wf, undefined)).rejects.toThrow(
        /terminated with status 'error'/,
      );
      const phase1Entries = await phase1.store.load('test-run');
      expect(verdictsOf(phase1Entries)).toEqual([
        { kind: 'admit' },
        { kind: 'reject', code: 'budget' },
      ]);
      const orchestratorTerminal = phase1Entries.find(
        (e) =>
          e.kind === 'agent' &&
          !e.scope.startsWith('agent:') &&
          e.status !== 'running' &&
          e.status !== 'suspended',
      );
      expect(orchestratorTerminal?.status).toBe('error');
      const priorEntries = phase1Entries.filter((e) => e.seq < (orchestratorTerminal?.seq ?? 0));
      const truncatedStore = new InMemoryStore({ quiet: true });
      for (const entry of priorEntries) {
        await truncatedStore.append('test-run', entry);
      }

      // The recovered ledger holds ONE admit and one rejection: the
      // resumed retry must take the second slot, and only the spawn
      // after it crosses the cap.
      let phase2OrchTurn = 0;
      const adapter2 = scriptedAdapter((req): ScriptedTurn => {
        if (agentTypeOf(req) === 'worker') {
          return { text: 'held again', hangMs: 30_000 };
        }
        phase2OrchTurn += 1;
        if (phase2OrchTurn === 1) {
          return {
            toolCall: {
              name: 'spawn_agent',
              args: { agentType: 'worker', prompt: 'two again', budgetUsd: RETRY_BUDGET },
            },
          };
        }
        if (phase2OrchTurn === 2) {
          return {
            toolCall: {
              name: 'spawn_agent',
              args: { agentType: 'worker', prompt: 'past the cap', budgetUsd: RETRY_BUDGET },
            },
          };
        }
        if (phase2OrchTurn === 3) {
          return {
            toolCalls: handlesIn(req).map((handle) => ({ name: 'cancel_agent', args: { handle } })),
          };
        }
        return { toolCall: { name: 'finish', args: { result: 'recovered' } } };
      });
      const phase2 = makeInternals({
        adapters: [adapter2],
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: PROFILES,
        budgetUsd: 1,
        priorEntries,
        store: truncatedStore,
        transcripts,
      });
      const outcome = await executeWorkflow(phase2.internals, wf, undefined);
      expect(outcome).toBe('recovered');
      // The retry journaled a THIRD admission decision (admit); the spawn
      // past the cap was refused by the config gate before any append.
      expect(verdictsOf(await truncatedStore.load('test-run'))).toEqual([
        { kind: 'admit' },
        { kind: 'reject', code: 'budget' },
        { kind: 'admit' },
      ]);
      const orchCalls = adapter2.calls.filter((r) => agentTypeOf(r) === '');
      expect(JSON.stringify(orchCalls[1]?.messages.at(-1)?.parts)).not.toContain('maxSpawns');
      expect(JSON.stringify(orchCalls[2]?.messages.at(-1)?.parts)).toContain(
        'orchestrate maxSpawns 2 reached',
      );
    });
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

  it('a regenerated spawn turn adopts the recovered child only on the FULL spec (RV1605)', async () => {
    // Phase 1: the root spawns one worker with approach 'A', the child
    // settles, and the root dies before its terminal. The transcripts
    // are LOST, so the resumed root regenerates the spawn turn itself
    // instead of continuing past it.
    let phase1OrchTurn = 0;
    const adapter1 = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'paid once' };
      }
      phase1OrchTurn += 1;
      if (phase1OrchTurn === 1) {
        return {
          toolCall: {
            name: 'spawn_agent',
            args: { agentType: 'worker', prompt: 'study the ledger', approach: 'A' },
          },
        };
      }
      return { error: { code: 'agent', message: 'simulated crash', retryable: false } };
    });
    const phase1 = makeInternals({
      adapters: [adapter1],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('spec identity goal', {});
    await expect(executeWorkflow(phase1.internals, wf, undefined)).rejects.toThrow(
      /terminated with status 'error'/,
    );
    const phase1Entries = await phase1.store.load('test-run');
    expect(admissionEntries(phase1Entries)).toHaveLength(1);
    const rootTerminal = phase1Entries.find(
      (e) => e.kind === 'agent' && !e.scope.startsWith('agent:') && e.status !== 'running',
    );
    const priorEntries = phase1Entries.filter((e) => e.seq < (rootTerminal?.seq ?? 0));

    // Phase 2: the regenerated spawn turn DIVERGES in a field outside
    // (agentType, prompt): approach 'B'. The doctrine: a divergent call
    // decides fresh instead of receiving a stranger's handle; the prior
    // decision's child stays paid, at-least-once.
    const divergedStore = new InMemoryStore({ quiet: true });
    for (const entry of priorEntries) {
      await divergedStore.append('test-run', entry);
    }
    const adapter2 = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'paid fresh' };
      }
      const transcript = JSON.stringify(req.messages);
      if (!transcript.includes('"handle"')) {
        return {
          toolCall: {
            name: 'spawn_agent',
            args: { agentType: 'worker', prompt: 'study the ledger', approach: 'B' },
          },
        };
      }
      if (!transcript.includes('paid')) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'diverged done' } } };
    });
    const phase2 = makeInternals({
      adapters: [adapter2],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      priorEntries,
      store: divergedStore,
      // A FRESH transcript store: the boundary checkpoint is gone, so
      // the root replays from the top and re-emits the spawn call.
      transcripts: new InMemoryTranscriptStore(),
    });
    const outcome = await executeWorkflow(phase2.internals, wf, undefined);
    expect(outcome).toBe('diverged done');
    // The divergent call decided FRESH: a second admission decision and
    // a second paid child.
    const divergedEntries = await divergedStore.load('test-run');
    expect(admissionEntries(divergedEntries)).toHaveLength(2);
    expect(adapter2.calls.filter((r) => agentTypeOf(r) === 'worker')).toHaveLength(1);
  });

  it('a regenerated spawn turn with the identical full spec adopts the recovered child', async () => {
    let phase1OrchTurn = 0;
    const adapter1 = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'paid once' };
      }
      phase1OrchTurn += 1;
      if (phase1OrchTurn === 1) {
        return {
          toolCall: {
            name: 'spawn_agent',
            args: { agentType: 'worker', prompt: 'study the ledger', approach: 'A' },
          },
        };
      }
      return { error: { code: 'agent', message: 'simulated crash', retryable: false } };
    });
    const phase1 = makeInternals({
      adapters: [adapter1],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('spec identity goal', {});
    await expect(executeWorkflow(phase1.internals, wf, undefined)).rejects.toThrow(
      /terminated with status 'error'/,
    );
    const phase1Entries = await phase1.store.load('test-run');
    const rootTerminal = phase1Entries.find(
      (e) => e.kind === 'agent' && !e.scope.startsWith('agent:') && e.status !== 'running',
    );
    const priorEntries = phase1Entries.filter((e) => e.seq < (rootTerminal?.seq ?? 0));
    const adoptedStore = new InMemoryStore({ quiet: true });
    for (const entry of priorEntries) {
      await adoptedStore.append('test-run', entry);
    }
    const adapter2 = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        throw new Error('an identical spec re-paid its child on resume');
      }
      const transcript = JSON.stringify(req.messages);
      if (!transcript.includes('"handle"')) {
        return {
          toolCall: {
            name: 'spawn_agent',
            args: { agentType: 'worker', prompt: 'study the ledger', approach: 'A' },
          },
        };
      }
      if (!transcript.includes('paid once')) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'adopted done' } } };
    });
    const phase2 = makeInternals({
      adapters: [adapter2],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      priorEntries,
      store: adoptedStore,
      transcripts: new InMemoryTranscriptStore(),
    });
    const outcome = await executeWorkflow(phase2.internals, wf, undefined);
    expect(outcome).toBe('adopted done');
    const adoptedEntries = await adoptedStore.load('test-run');
    expect(admissionEntries(adoptedEntries)).toHaveLength(1);
    expect(adapter2.calls.filter((r) => agentTypeOf(r) === 'worker')).toHaveLength(0);
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
      // The per-child machine roster (RV806): both children ok, no
      // salvage, no declared evidence contract.
      acceptanceChildren: [
        expect.objectContaining({ status: 'ok' }),
        expect.objectContaining({ status: 'ok' }),
      ],
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

describe('acceptance: the spawned-roster floor (RV507)', () => {
  /** The orchestrator finishes IMMEDIATELY: nothing is ever spawned. */
  const zeroSpawnAdapter = () =>
    scriptedAdapter((): ScriptedTurn => ({
      toolCall: { name: 'finish', args: { result: { answer: 'solo' } } },
    }));

  /** Spawns two ok workers, awaits them, finishes. */
  function twoOkAdapter() {
    let orchTurn = 0;
    return scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'did it' };
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

  it('rejects the empty roster even under all-ok, carrying the actual roster in the decision', async () => {
    const adapter = zeroSpawnAdapter();
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: 'all-ok', minSpawnedChildren: 1 },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    expect(String((thrown as FailRunError).message)).toContain('spawned');
    const data = (thrown as FailRunError).data as {
      source?: string;
      spawnedChildren?: number;
      minSpawnedChildren?: number;
    };
    expect(data.source).toBe('orchestrator_acceptance');
    expect(data.spawnedChildren).toBe(0);
    expect(data.minSpawnedChildren).toBe(1);
    const decisions = (await store.load('test-run')).filter(
      (e) =>
        e.kind === 'decision' &&
        (e.value as { decisionType?: string }).decisionType === 'orchestrator_acceptance',
    );
    expect(decisions).toHaveLength(1);
    const value = decisions[0]?.value as {
      verdict?: string;
      spawnedChildren?: number;
      minSpawnedChildren?: number;
      degradedReasons?: string[];
    };
    expect(value.verdict).toBe('rejected');
    expect(value.spawnedChildren).toBe(0);
    expect(value.minSpawnedChildren).toBe(1);
    expect(value.degradedReasons?.some((reason) => reason.includes('spawned'))).toBe(true);
  });

  it('rejects an under-provisioned roster even when minSuccessful is satisfied', async () => {
    const adapter = twoOkAdapter();
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: { minSuccessful: 1 }, minSpawnedChildren: 3 },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as {
      spawnedChildren?: number;
      minSpawnedChildren?: number;
      childStatusCounts?: Record<string, number>;
    };
    expect(data.spawnedChildren).toBe(2);
    expect(data.minSpawnedChildren).toBe(3);
    expect(data.childStatusCounts).toEqual({ ok: 2 });
  });

  it('a roster at the floor accepts, and the decision carries both counts', async () => {
    const adapter = twoOkAdapter();
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('collect', {
      acceptance: { childPolicy: 'all-ok', minSpawnedChildren: 2 },
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as {
      completion: string;
    };
    expect(outcome.completion).toBe('complete');
    const decisions = (await store.load('test-run')).filter(
      (e) =>
        e.kind === 'decision' &&
        (e.value as { decisionType?: string }).decisionType === 'orchestrator_acceptance',
    );
    const value = decisions[0]?.value as {
      verdict?: string;
      spawnedChildren?: number;
      minSpawnedChildren?: number;
    };
    expect(value.verdict).toBe('accepted');
    expect(value.spawnedChildren).toBe(2);
    expect(value.minSpawnedChildren).toBe(2);
  });

  it('the journaled roster rejection rolls forward on resume, immune to a drifted floor', async () => {
    const store = new InMemoryStore();
    const engineA = createEngine({
      adapters: [zeroSpawnAdapter()],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model', orchestrate: 'fake:model' }, profiles: PROFILES },
    });
    const first = await engineA.run(
      makeOrchestratorWorkflow('collect', {
        acceptance: { childPolicy: 'all-ok', minSpawnedChildren: 1 },
      }),
      undefined,
      { runId: 'ROSTER-DRIFT' },
    ).result;
    expect(first.status).toBe('error');

    // The resume host DROPS the floor, which would accept the empty
    // roster if re-evaluated; the journaled rejected verdict wins and
    // no live orchestrator call is paid.
    const replayAdapter = zeroSpawnAdapter();
    const engineB = createEngine({
      adapters: [replayAdapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model', orchestrate: 'fake:model' }, profiles: PROFILES },
    });
    const resumed = await engineB.resume(
      'ROSTER-DRIFT',
      makeOrchestratorWorkflow('collect', { acceptance: { childPolicy: 'all-ok' } }),
    ).result;
    expect(resumed.status).toBe('error');
    expect(replayAdapter.calls).toHaveLength(0);
  });

  it('validates minSpawnedChildren as a positive integer at construction', () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() =>
        makeOrchestratorWorkflow('g', {
          acceptance: { childPolicy: 'all-ok', minSpawnedChildren: bad },
        }),
      ).toThrow(/minSpawnedChildren/);
    }
    expect(() =>
      makeOrchestratorWorkflow('g', {
        acceptance: { childPolicy: 'all-ok', minSpawnedChildren: 2 },
      }),
    ).not.toThrow();
  });
});

describe('finish validation: deterministic host validators with bounded repair (RV-204)', () => {
  const GOAL = 'audit the module and cite evidence';
  const GOOD = 'FINDINGS: two bugs. EVIDENCE: src/a.ts:10 src/b.ts:22 src/c.ts:31.';
  const HUSK = { report: 'all good, trust me' };
  const VALIDATORS = () => [
    requiredSectionsValidator({ sections: ['FINDINGS', 'EVIDENCE'] }),
    minMatchesValidator({ pattern: 'src/[a-z]+\\.ts:\\d+', min: 3, name: 'citations' }),
  ];
  const DEFAULTS = {
    routing: { loop: 'fake:model', orchestrate: 'fake:model' },
    profiles: PROFILES,
  } as const;

  /** Finishes with `first` on the first attempt and `second` after a rejection. */
  function finishTwiceAdapter(first: unknown, second: unknown) {
    let orchTurn = 0;
    return scriptedAdapter((): ScriptedTurn => {
      orchTurn += 1;
      return {
        toolCall: { name: 'finish', args: { result: orchTurn === 1 ? first : second } },
      };
    });
  }

  const validationEntries = (entries: readonly JournalEntry[]): JournalEntry[] =>
    entries.filter(
      (e) =>
        e.kind === 'decision' &&
        (e.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_finish_validation',
    );

  it('a valid finish is accepted first try: one journaled verdict, result unchanged', async () => {
    const adapter = finishTwiceAdapter(GOOD, GOOD);
    const { internals, store } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow(GOAL, { finishValidation: { validators: VALIDATORS() } });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(GOOD);
    const verdicts = validationEntries(await store.load('test-run'));
    expect(verdicts).toHaveLength(1);
    expect((verdicts[0]?.value as { verdict?: string }).verdict).toBe('accepted');
    // The contract rides the PROMPT (the toolset never changes): the
    // validator names and the repair bound reach the model up front.
    const prompt = JSON.stringify(adapter.calls[0]?.messages[0]?.parts);
    expect(prompt).toContain('required-sections, citations');
    expect(prompt).toContain('At most one repair attempt');
  });

  it('a rejected finish returns the reasons and the model repairs within the bound', async () => {
    const adapter = finishTwiceAdapter(HUSK, GOOD);
    const { internals, store } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow(GOAL, { finishValidation: { validators: VALIDATORS() } });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(GOOD);
    // The model saw the rejection as the finish call's error tool result,
    // reasons and the remaining repair budget included.
    const feedback = JSON.stringify(
      adapter.calls
        .at(-1)
        ?.messages.flatMap((m) => m.parts)
        .find((p) => p.type === 'tool-result' && (p as { isError?: boolean }).isError === true),
    );
    expect(feedback).toContain("required section 'FINDINGS' is missing");
    expect(feedback).toContain('expected at least 3 matches');
    expect(feedback).toContain('"repairsRemaining":0');
    // Verdicts journal in order: the granted repair, then the acceptance.
    const verdicts = validationEntries(await store.load('test-run')).map(
      (e) => (e.value as { verdict?: string }).verdict,
    );
    expect(verdicts).toEqual(['repair', 'accepted']);
  });

  it('exhausting the bound fails the run typed, journaled BEFORE acceptance ever judges', async () => {
    const adapter = finishTwiceAdapter(HUSK, HUSK);
    const { internals, store } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow(GOAL, {
      acceptance: { childPolicy: 'all-ok' },
      finishValidation: { validators: VALIDATORS(), maxRepairs: 1 },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as {
      source?: string;
      repairsUsed?: number;
      maxRepairs?: number;
    };
    expect(data.source).toBe('orchestrator_finish_validation');
    expect(data.repairsUsed).toBe(1);
    expect(data.maxRepairs).toBe(1);
    const entries = await store.load('test-run');
    const verdicts = validationEntries(entries).map(
      (e) => (e.value as { verdict?: string }).verdict,
    );
    expect(verdicts).toEqual(['repair', 'rejected']);
    // The plan's ordering contract: an invalid finish is rejected before
    // acceptance, so no acceptance verdict exists.
    expect(
      entries.some(
        (e) =>
          e.kind === 'decision' &&
          (e.value as { decisionType?: string }).decisionType === 'orchestrator_acceptance',
      ),
    ).toBe(false);
  });

  it('maxRepairs 0 fails on the first invalid finish without a repair turn', async () => {
    const adapter = finishTwiceAdapter(HUSK, GOOD);
    const { internals, store } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow(GOAL, {
      finishValidation: { validators: VALIDATORS(), maxRepairs: 0 },
    });
    await expect(executeWorkflow(internals, wf, undefined)).rejects.toThrow(
      /failed host validation/,
    );
    // No second model turn: the would be repair never dispatched.
    expect(adapter.calls).toHaveLength(1);
    const verdicts = validationEntries(await store.load('test-run')).map(
      (e) => (e.value as { verdict?: string }).verdict,
    );
    expect(verdicts).toEqual(['rejected']);
  });

  it('a resume rolls the journaled rejection forward before any model call', async () => {
    const store = new InMemoryStore();
    const engineA = createEngine({
      adapters: [finishTwiceAdapter(HUSK, HUSK)],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const first = await engineA.run(
      makeOrchestratorWorkflow(GOAL, { finishValidation: { validators: VALIDATORS() } }),
      undefined,
      { runId: 'FV-RESUME' },
    ).result;
    expect(first.status).toBe('error');
    expect(first.error?.message).toContain('failed host validation');
    // The resume host drops the failing validators entirely; the
    // journaled rejected verdict still wins, and not one model call runs.
    const adapterB = finishTwiceAdapter(GOOD, GOOD);
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const resumed = await engineB.resume(
      'FV-RESUME',
      makeOrchestratorWorkflow(GOAL, {
        finishValidation: {
          validators: [requiredSectionsValidator({ sections: ['FINDINGS'] })],
        },
      }),
    ).result;
    expect(resumed.status).toBe('error');
    expect(resumed.error?.message).toContain('failed host validation');
    expect(adapterB.calls).toHaveLength(0);
  });

  it('a throwing validator is a host defect: ConfigError, nothing journaled', async () => {
    const adapter = finishTwiceAdapter(GOOD, GOOD);
    const { internals, store } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow(GOAL, {
      finishValidation: {
        validators: [
          {
            name: 'defective',
            validate: () => {
              throw new Error('kaput');
            },
          },
        ],
      },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ConfigError);
    expect((thrown as Error).message).toContain("finish validator 'defective' threw");
    expect((thrown as Error).message).toContain('kaput');
    expect(validationEntries(await store.load('test-run'))).toHaveLength(0);
  });

  it('without finishValidation nothing journals and the prompt stays clean', async () => {
    const adapter = finishTwiceAdapter(GOOD, GOOD);
    const { internals, store } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const outcome = await executeWorkflow(internals, makeOrchestratorWorkflow(GOAL, {}), undefined);
    expect(outcome).toBe(GOOD);
    expect(validationEntries(await store.load('test-run'))).toHaveLength(0);
    expect(JSON.stringify(adapter.calls[0]?.messages[0]?.parts)).not.toContain('host validates');
  });

  const CHILD_EVIDENCE =
    'FINDINGS: four issues. EVIDENCE: src/auth.ts:10 src/auth.ts:42 src/db.ts:7 src/api.ts:99.';
  const FULL_RESULT =
    'FINDINGS kept. EVIDENCE: src/auth.ts:10 src/auth.ts:42 src/db.ts:7 src/api.ts:99.';
  const LOSSY_RESULT = 'all fine: src/auth.ts:10 src/fake.ts:3';

  /** One worker child with real citations; the finish pays out first, then second. */
  function evidenceAdapter(firstFinish: unknown, secondFinish: unknown) {
    let orchTurn = 0;
    return scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: CHILD_EVIDENCE };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return { toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'dig' } } };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return {
        toolCall: { name: 'finish', args: { result: orchTurn === 3 ? firstFinish : secondFinish } },
      };
    });
  }

  it('the children snapshot reaches the validators in spawn order (RV-202)', async () => {
    const seen: unknown[] = [];
    const spy = {
      name: 'spy',
      validate: (input: FinishValidationInput) => {
        seen.push(input.children);
        return { ok: true } as const;
      },
    };
    const adapter = evidenceAdapter(FULL_RESULT, FULL_RESULT);
    const { internals } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow(GOAL, { finishValidation: { validators: [spy] } });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(FULL_RESULT);
    const children = seen[0] as { handle: number; nodeId: string; status: string; text: string }[];
    expect(children).toHaveLength(1);
    expect(children[0]?.handle).toBe(2);
    expect(children[0]?.status).toBe('ok');
    expect(children[0]?.text).toContain('src/db.ts:7');
    expect(typeof children[0]?.nodeId).toBe('string');
  });

  it('lost and fabricated evidence is rejected; the repair restores preservation (RV-202)', async () => {
    const adapter = evidenceAdapter(LOSSY_RESULT, FULL_RESULT);
    const { internals, store } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow(GOAL, {
      finishValidation: { validators: [evidencePreservedValidator({ requireKnown: true })] },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(FULL_RESULT);
    // The rejection the model saw names BOTH defects: the lost citations
    // and the fabricated one.
    const feedback = JSON.stringify(
      adapter.calls
        .at(-1)
        ?.messages.flatMap((m) => m.parts)
        .find((p) => p.type === 'tool-result' && (p as { isError?: boolean }).isError === true),
    );
    expect(feedback).toContain('src/auth.ts:42');
    expect(feedback).toContain('unknown citations not present in any child report: src/fake.ts:3');
    const verdicts = validationEntries(await store.load('test-run')).map(
      (e) => (e.value as { verdict?: string }).verdict,
    );
    expect(verdicts).toEqual(['repair', 'accepted']);
  });

  it('rejects malformed finishValidation synchronously at construction', () => {
    expect(() => makeOrchestratorWorkflow('g', { finishValidation: { validators: [] } })).toThrow(
      /non empty array/,
    );
    expect(() =>
      makeOrchestratorWorkflow('g', {
        finishValidation: { validators: [{ name: '', validate: () => ({ ok: true }) as const }] },
      }),
    ).toThrow(/non empty string name/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        finishValidation: { validators: [{ name: 'x' } as never] },
      }),
    ).toThrow(/no validate function/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        finishValidation: {
          validators: [
            requiredSectionsValidator({ sections: ['A'] }),
            requiredSectionsValidator({ sections: ['B'] }),
          ],
        },
      }),
    ).toThrow(/must be unique/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        finishValidation: { validators: VALIDATORS(), maxRepairs: Number.NaN },
      }),
    ).toThrow(/maxRepairs/);
  });
});

describe('output contract: manifest, construction self test, frozen bundle (v1.71 review)', () => {
  const GOAL = 'audit the module and cite evidence';
  const GOOD = 'FINDINGS: two bugs. EVIDENCE: src/a.ts:10 src/b.ts:22 src/c.ts:31.';
  const CONTRACT = () =>
    finishContract({
      sections: ['FINDINGS', 'EVIDENCE'],
      citations: { min: 3, pattern: 'src/[a-z]+\\.ts:\\d+', sample: 'src/a.ts:1' },
    });
  const DEFAULTS = {
    routing: { loop: 'fake:model', orchestrate: 'fake:model' },
    profiles: PROFILES,
  } as const;
  const bundleEntries = (entries: readonly JournalEntry[]): JournalEntry[] =>
    entries.filter(
      (e) =>
        e.kind === 'decision' &&
        (e.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_finish_validation_bundle',
    );
  const finishWith = (result: unknown) =>
    scriptedAdapter((): ScriptedTurn => ({ toolCall: { name: 'finish', args: { result } } }));

  it('a stale validator fails the construction self test before any provider call', () => {
    const contract = CONTRACT();
    expect(() =>
      makeOrchestratorWorkflow(GOAL, {
        finishValidation: {
          validators: [
            ...contract.validators,
            requiredSectionsValidator({ sections: ['LEGACY HEADING'], name: 'legacy-sections' }),
          ],
          contract,
        },
      }),
    ).toThrow(/self test failed BEFORE any provider call.*legacy-sections.*LEGACY HEADING/s);
  });

  it('a same-name WEAKENED replacement fails construction through the per validator goldens (cycle 74)', () => {
    const strict = finishContract({ sections: ['## Report'], words: { min: 50 } });
    expect(() =>
      makeOrchestratorWorkflow(GOAL, {
        finishValidation: {
          validators: [
            requiredSectionsValidator({ sections: ['## Report'], name: 'contract-sections' }),
            wordCountValidator({ min: 1, name: 'contract-words' }),
          ],
          contract: strict,
          maxRepairs: 0,
        },
      }),
    ).toThrow(/'contract-words' failed its reject golden/);
  });

  it('a contract whose validators are not in the set is drift by omission', () => {
    expect(() =>
      makeOrchestratorWorkflow(GOAL, {
        finishValidation: {
          validators: [requiredSectionsValidator({ sections: ['FINDINGS', 'EVIDENCE'] })],
          contract: CONTRACT(),
        },
      }),
    ).toThrow(/spread contract.validators/);
  });

  it('the contract statement rides the prompt and the bundle descriptor journals once', async () => {
    const contract = CONTRACT();
    const adapter = finishWith(GOOD);
    const { internals, store } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow(GOAL, {
      finishValidation: { validators: contract.validators, contract },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(GOOD);
    const prompt = JSON.stringify(adapter.calls[0]?.messages[0]?.parts);
    expect(prompt).toContain('contract-sections, contract-citations');
    expect(prompt).toContain('must contain each of these section markers verbatim');
    expect(prompt).toContain('at least 3 citations');
    const bundles = bundleEntries(await store.load('test-run'));
    expect(bundles).toHaveLength(1);
    expect(bundles[0]?.value).toEqual({
      decisionType: 'orchestrator_finish_validation_bundle',
      ordinal: 0,
      contractHash: contract.hash,
      validators: ['contract-sections', 'contract-citations'],
      maxRepairs: 1,
    });
  });

  it('without a contract the journal keeps zero bundle descriptors', async () => {
    const adapter = finishWith(GOOD);
    const { internals, store } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow(GOAL, {
      finishValidation: {
        validators: [requiredSectionsValidator({ sections: ['FINDINGS', 'EVIDENCE'] })],
      },
    });
    await executeWorkflow(internals, wf, undefined);
    expect(bundleEntries(await store.load('test-run'))).toHaveLength(0);
  });

  it('a resume under a FIXED contract appends a superseding descriptor, never fails', async () => {
    const store = new InMemoryStore();
    const contractA = CONTRACT();
    const engineA = createEngine({
      adapters: [finishWith(GOOD)],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const first = await engineA.run(
      makeOrchestratorWorkflow(GOAL, {
        finishValidation: { validators: contractA.validators, contract: contractA },
      }),
      undefined,
      { runId: 'CONTRACT-DRIFT' },
    ).result;
    expect(first.status).toBe('ok');

    // The intended remedy of the v1.71 experiment failure: fix the
    // stale contract and resume. The journal records the supersession
    // instead of failing the run.
    const contractB = finishContract({ sections: ['FINDINGS'] });
    const engineB = createEngine({
      adapters: [finishWith(GOOD)],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const resumed = await engineB.resume(
      'CONTRACT-DRIFT',
      makeOrchestratorWorkflow(GOAL, {
        finishValidation: { validators: contractB.validators, contract: contractB },
      }),
    ).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe(first.value);
    const bundles = bundleEntries(await store.load('CONTRACT-DRIFT')).map(
      (e) => e.value as { ordinal?: number; contractHash?: string; supersedes?: string },
    );
    expect(bundles.map((b) => b.ordinal)).toEqual([0, 1]);
    expect(bundles[1]?.contractHash).toBe(contractB.hash);
    expect(bundles[1]?.supersedes).toBe(contractA.hash);
  });

  it('selfTest fixtures without a contract run standalone at construction', () => {
    expect(() =>
      makeOrchestratorWorkflow(GOAL, {
        finishValidation: {
          validators: [requiredSectionsValidator({ sections: ['FINDINGS'] })],
          selfTest: {
            accept: { result: 'nothing relevant', text: 'nothing relevant', children: [] },
          },
        },
      }),
    ).toThrow(/rejected the accept fixture/);
    expect(() =>
      makeOrchestratorWorkflow(GOAL, {
        finishValidation: {
          validators: [requiredSectionsValidator({ sections: ['FINDINGS'] })],
          selfTest: {},
        },
      }),
    ).toThrow(/requires an accept or reject fixture/);
  });
});

describe('synthesis repair reserve and the failure snapshot (v1.71 review)', () => {
  const SECTIONED = '## Findings\nEverything the contract demands.';
  const SECTIONLESS = 'a schema-valid candidate without the required section';
  const SYNTH_DEFAULTS = {
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
    profiles: PROFILES,
  } as const;
  /** One coordination draft, then the synthesis script turn by turn. */
  function synthesisScriptAdapter(script: Array<Record<string, unknown> | 'malformed'>) {
    let call = 0;
    return scriptedAdapter((): ScriptedTurn => {
      call += 1;
      if (call === 1) {
        return { toolCall: { name: 'finish', args: { result: 'DRAFT' } } };
      }
      const step = script[Math.min(call - 2, script.length - 1)] ?? 'malformed';
      return {
        toolCall: {
          name: 'finish',
          args: step === 'malformed' ? {} : step,
        },
      };
    });
  }

  it('a granted repair reserve extends the bound invocation past maxTurns', async () => {
    // The v1.71 experiment shape: a malformed finish plus a validator
    // rejection inside a tight synthesis budget. The reserve grants one
    // extra turn per rejected finish exchange, bounded, so the fourth
    // turn exists and the good candidate lands.
    const adapter = synthesisScriptAdapter([
      'malformed',
      { result: SECTIONLESS },
      'malformed',
      { result: SECTIONED },
    ]);
    const { internals } = makeInternals({ adapters: [adapter], ...SYNTH_DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      synthesis: { limits: { maxTurns: 3 } },
      finishValidation: {
        validators: [requiredSectionsValidator({ sections: ['## Findings'] })],
        maxRepairs: 3,
        repairTurnReserve: 2,
      },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(SECTIONED);
    // One coordination draft plus four synthesis turns: three from
    // maxTurns and one granted from the reserve.
    expect(adapter.calls).toHaveLength(5);
  });

  it('the reserve is bounded and the limit failure carries the acceptance snapshot', async () => {
    const adapter = synthesisScriptAdapter([
      'malformed',
      { result: SECTIONLESS },
      'malformed',
      'malformed',
      'malformed',
      { result: SECTIONED },
    ]);
    const { internals } = makeInternals({ adapters: [adapter], ...SYNTH_DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      acceptance: { childPolicy: 'all-ok' },
      synthesis: { limits: { maxTurns: 3 } },
      finishValidation: {
        validators: [requiredSectionsValidator({ sections: ['## Findings'] })],
        maxRepairs: 3,
        repairTurnReserve: 2,
      },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.source).toBe('orchestrator_synthesis');
    expect(data.status).toBe('limit');
    expect(data.turnsUsed).toBe(5);
    // The acceptance snapshot (P0.8 remainder): the children completed,
    // the failure is downstream, and the error data says both.
    expect(data.completion).toBe('complete');
    expect(data.childStatusCounts).toEqual({});
    // The verdict-derived taxonomy: one validator rejection happened.
    expect(data.repairsUsed).toBe(1);
    expect(data.maxRepairs).toBe(3);
    expect(data.rejectedValidators).toEqual(['required-sections']);
  });

  it('without a reserve the ceiling is unchanged and the outcome mirrors the snapshot', async () => {
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [synthesisScriptAdapter(['malformed', { result: SECTIONLESS }, 'malformed'])],
      stores: { journal: store },
      defaults: SYNTH_DEFAULTS,
    });
    const outcome = await engine.run(
      makeOrchestratorWorkflow('assess', {
        acceptance: { childPolicy: 'all-ok' },
        synthesis: { limits: { maxTurns: 3 } },
        finishValidation: {
          validators: [requiredSectionsValidator({ sections: ['## Findings'] })],
          maxRepairs: 3,
        },
      }),
      undefined,
      { runId: 'SYNTH-SNAPSHOT' },
    ).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain("terminated with status 'limit'");
    // The completion mirror lifts the snapshot from the typed error
    // data: child work complete, the failure downstream.
    expect(outcome.completion).toBe('complete');
    expect(outcome.childStatusCounts).toEqual({});
  });

  it('a synthesis finish rejection past the bound carries the snapshot too', async () => {
    const adapter = synthesisScriptAdapter([{ result: SECTIONLESS }]);
    const { internals } = makeInternals({ adapters: [adapter], ...SYNTH_DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      acceptance: { childPolicy: 'all-ok' },
      synthesis: {},
      finishValidation: {
        validators: [requiredSectionsValidator({ sections: ['## Findings'] })],
        maxRepairs: 0,
      },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect(data.source).toBe('orchestrator_finish_validation');
    expect(data.completion).toBe('complete');
    expect(data.childStatusCounts).toEqual({});
  });

  it('rejects a malformed repairTurnReserve synchronously at construction', () => {
    expect(() =>
      makeOrchestratorWorkflow('g', {
        finishValidation: {
          validators: [requiredSectionsValidator({ sections: ['A'] })],
          repairTurnReserve: -1,
        },
      }),
    ).toThrow(/repairTurnReserve/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        finishValidation: {
          validators: [requiredSectionsValidator({ sections: ['A'] })],
          repairTurnReserve: 1.5,
        },
      }),
    ).toThrow(/repairTurnReserve/);
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

describe('synthesis evidence symmetry and the draft gate (the v1.74 experiment review)', () => {
  const SYMMETRY_DEFAULTS = {
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
    profiles: PROFILES,
  } as const;
  /** Tail citations sit beyond the 400 char digest truncation. */
  const TAIL_CITED = (topic: string): string =>
    `${topic} findings. ${`${topic} filler sentence for bulk. `.repeat(30)}` +
    `Citations: src/core/${topic}.ts:12 src/util/${topic}.ts:34`;
  const PRESERVING =
    '## Findings preserved: src/core/alpha.ts:12 src/util/alpha.ts:34 ' +
    'src/core/beta.ts:12 src/util/beta.ts:34';

  const promptOf = (req: ChatRequest | undefined): string => {
    const user = req?.messages.find((message) => message.role === 'user');
    const part = user?.parts.find((p) => p.type === 'text');
    return (part as { text?: string } | undefined)?.text ?? '';
  };

  /**
   * Two tail-cited children, a coordination draft script, and a
   * synthesis turn script, discriminated by agent type and the
   * synthesis prompt header.
   */
  function symmetryAdapter(options: {
    draftTurns: Array<Record<string, unknown>>;
    synthesisTurns: ScriptedTurn[];
    /** First synthesis turn reads the first digest row's handle. */
    readFirstChild?: boolean;
  }): ReturnType<typeof scriptedAdapter> {
    let coordination = 0;
    let synthesis = 0;
    return scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: TAIL_CITED(/alpha/.test(promptOf(req)) ? 'alpha' : 'beta') };
      }
      if (/synthesis invocation/.test(promptOf(req))) {
        synthesis += 1;
        if (options.readFirstChild === true && synthesis === 1) {
          // The model does what a real one would: it takes the handle
          // from the digest row it was shown.
          const handle = Number(/"handle":(\d+)/.exec(promptOf(req))?.[1] ?? -1);
          return { toolCall: { name: 'get_child_result', args: { handle } } };
        }
        const step = options.readFirstChild === true ? synthesis - 2 : synthesis - 1;
        const turn =
          options.synthesisTurns[Math.min(Math.max(step, 0), options.synthesisTurns.length - 1)];
        return turn ?? { toolCall: { name: 'finish', args: { result: PRESERVING } } };
      }
      coordination += 1;
      if (coordination === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'research alpha' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'research beta' } },
          ],
        };
      }
      if (coordination === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      const draft = options.draftTurns[Math.min(coordination - 3, options.draftTurns.length - 1)];
      return { toolCall: { name: 'finish', args: draft ?? { result: 'DRAFT' } } };
    });
  }

  it('exposeChildResultTools opens the read tools to synthesis with handles in the rows', async () => {
    const adapter = symmetryAdapter({
      draftTurns: [{ result: 'DRAFT' }],
      readFirstChild: true,
      synthesisTurns: [{ toolCall: { name: 'finish', args: { result: PRESERVING } } }],
    });
    const { internals } = makeInternals({ adapters: [adapter], ...SYMMETRY_DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      maxSpawns: 2,
      synthesis: { limits: { maxTurns: 3 }, exposeChildResultTools: true },
      finishValidation: {
        validators: [evidencePreservedValidator({ minShare: 0.75 })],
        maxRepairs: 0,
      },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(PRESERVING);
    const synthesisReqs = adapter.calls.filter((req) => /synthesis invocation/.test(promptOf(req)));
    const toolNames = (synthesisReqs[0]?.tools ?? []).map((contract) => contract.name).sort();
    expect(toolNames).toEqual(['finish', 'get_child_result', 'read_child_artifact']);
    // The digest rows name the handles the read tools take.
    expect(promptOf(synthesisReqs[0])).toContain('"handle":');
    // The page the tool returned carried the tail citation to the model.
    const secondTurn = JSON.stringify(synthesisReqs[1]?.messages ?? []);
    expect(secondTurn).toContain('src/core/alpha.ts:12');
  });

  it('without the new options the synthesis toolset and prompt stay exactly closed', async () => {
    const adapter = symmetryAdapter({
      draftTurns: [{ result: 'DRAFT' }],
      synthesisTurns: [{ toolCall: { name: 'finish', args: { result: PRESERVING } } }],
    });
    const { internals } = makeInternals({ adapters: [adapter], ...SYMMETRY_DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      maxSpawns: 2,
      synthesis: { limits: { maxTurns: 2 } },
    });
    await executeWorkflow(internals, wf, undefined);
    const synthesisReq = adapter.calls.find((req) => /synthesis invocation/.test(promptOf(req)));
    expect((synthesisReq?.tools ?? []).map((contract) => contract.name)).toEqual(['finish']);
    expect(promptOf(synthesisReq)).toContain('No other tool exists.');
    expect(promptOf(synthesisReq)).not.toContain('"handle":');
    // Prompt bytes are journal identity: without the opt-in no policy
    // facts line exists either (RV709).
    expect(promptOf(synthesisReq)).not.toContain('POLICY FACTS');
  });

  it('synthesis.policyFacts folds the durable child facts into the prompt (RV709)', async () => {
    const adapter = symmetryAdapter({
      draftTurns: [{ result: 'DRAFT' }],
      synthesisTurns: [{ toolCall: { name: 'finish', args: { result: PRESERVING } } }],
    });
    const { internals } = makeInternals({ adapters: [adapter], ...SYMMETRY_DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      maxSpawns: 2,
      synthesis: { limits: { maxTurns: 2 }, policyFacts: true },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(PRESERVING);
    const synthesisReq = adapter.calls.find((req) => /synthesis invocation/.test(promptOf(req)));
    // The digest folds ONLY replay-stable material (the settled child
    // results' durable tool-budget subsets), so a resumed synthesis
    // re-derives the identical prompt bytes.
    expect(promptOf(synthesisReq)).toContain(
      'POLICY FACTS: {"children":2,"byStatus":{"ok":2},"extensionsGranted":0,' +
        '"finalizationWindowsEntered":0,"finalizationReservesUsed":0}',
    );
  });

  it('synthesis.policyFacts refuses a non-boolean typed at construction', () => {
    expect(() =>
      makeOrchestratorWorkflow('assess', {
        maxSpawns: 2,
        synthesis: { limits: { maxTurns: 2 }, policyFacts: 'yes' as unknown as boolean },
      }),
    ).toThrow(/synthesis\.policyFacts must be a boolean/);
  });

  it("synthesisContext 'full' embeds the full child outputs beside the digest", async () => {
    const adapter = symmetryAdapter({
      draftTurns: [{ result: 'DRAFT' }],
      synthesisTurns: [{ toolCall: { name: 'finish', args: { result: PRESERVING } } }],
    });
    const { internals } = makeInternals({ adapters: [adapter], ...SYMMETRY_DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      maxSpawns: 2,
      synthesis: { limits: { maxTurns: 2 }, context: 'full' },
      finishValidation: {
        validators: [evidencePreservedValidator({ minShare: 0.75 })],
        maxRepairs: 0,
      },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(PRESERVING);
    const prompt = promptOf(
      adapter.calls.find((req) => /synthesis invocation/.test(promptOf(req))),
    );
    expect(prompt).toContain('CHILD OUTPUTS');
    expect(prompt).toContain('src/core/alpha.ts:12');
    expect(prompt).toContain('src/util/beta.ts:34');
  });

  it('the draft gate rejects a collapsed draft before any synthesis dispatch', async () => {
    const adapter = symmetryAdapter({
      draftTurns: [{ result: 'test' }, { result: 'a proper five word draft' }],
      synthesisTurns: [{ toolCall: { name: 'finish', args: { result: PRESERVING } } }],
    });
    const { internals } = makeInternals({ adapters: [adapter], ...SYMMETRY_DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      maxSpawns: 2,
      synthesis: { limits: { maxTurns: 2 }, context: 'full' },
      finishValidation: {
        validators: [evidencePreservedValidator({ minShare: 0.75 })],
        maxRepairs: 0,
        draftPolicy: { minWords: 3 },
        repairTurnReserve: 1,
      },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(PRESERVING);
    // Exactly one synthesis dispatch: the collapsed draft never reached it.
    expect(adapter.calls.filter((req) => /synthesis invocation/.test(promptOf(req)))).toHaveLength(
      1,
    );
    // The rejection reached the coordination model as an error result
    // naming the draft policy.
    const feedback = JSON.stringify(adapter.calls.map((req) => req.messages));
    expect(feedback).toContain('draft');
    expect(feedback).toMatch(/3 words|required 3/);
  });

  it('the draft gate honors requireSections', async () => {
    const adapter = symmetryAdapter({
      draftTurns: [{ result: 'long enough but with no marker' }, { result: '## Findings enough' }],
      synthesisTurns: [{ toolCall: { name: 'finish', args: { result: PRESERVING } } }],
    });
    const { internals } = makeInternals({ adapters: [adapter], ...SYMMETRY_DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      maxSpawns: 2,
      synthesis: { limits: { maxTurns: 2 }, context: 'full' },
      finishValidation: {
        validators: [evidencePreservedValidator({ minShare: 0.75 })],
        maxRepairs: 0,
        draftPolicy: { requireSections: ['## Findings'] },
        repairTurnReserve: 1,
      },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(PRESERVING);
    expect(adapter.calls.filter((req) => /synthesis invocation/.test(promptOf(req)))).toHaveLength(
      1,
    );
    // The FIRST draft was rejected (its feedback names the section) and
    // the SECOND draft is what reached the transcript: without the gate
    // the marker-less draft would have been accepted silently.
    const transcript = JSON.stringify(adapter.calls.map((req) => req.messages));
    expect(transcript).toContain("required draft section '## Findings'");
    expect(transcript).toContain('## Findings enough');
  });

  it('draftPolicy without synthesis is a ConfigError', () => {
    expect(() =>
      makeOrchestratorWorkflow('x', {
        finishValidation: {
          validators: [requiredSectionsValidator({ sections: ['## A'] })],
          draftPolicy: { minWords: 2 },
        },
      }),
    ).toThrow(/draftPolicy/);
  });

  it('the new fields validate at intake', () => {
    expect(() =>
      makeOrchestratorWorkflow('x', {
        synthesis: { context: 'everything' as never },
      }),
    ).toThrow(/context/);
    expect(() =>
      makeOrchestratorWorkflow('x', {
        synthesis: { exposeChildResultTools: 'yes' as never },
      }),
    ).toThrow(/exposeChildResultTools/);
    expect(() =>
      makeOrchestratorWorkflow('x', {
        synthesis: {},
        finishValidation: {
          validators: [requiredSectionsValidator({ sections: ['## A'] })],
          draftPolicy: {},
        },
      }),
    ).toThrow(/draftPolicy/);
    expect(() =>
      makeOrchestratorWorkflow('x', {
        synthesis: {},
        finishValidation: {
          validators: [requiredSectionsValidator({ sections: ['## A'] })],
          draftPolicy: { minWords: 0 },
        },
      }),
    ).toThrow(/minWords/);
    expect(() =>
      makeOrchestratorWorkflow('x', {
        synthesis: {},
        finishValidation: {
          validators: [requiredSectionsValidator({ sections: ['## A'] })],
          draftPolicy: { requireSections: [] },
        },
      }),
    ).toThrow(/requireSections/);
  });
});

describe('error-outcome parity and the schema-rejected finish counter (cycle 73)', () => {
  const PARITY_DEFAULTS = {
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
    profiles: PROFILES,
  } as const;
  const promptTextOf = (req: ChatRequest | undefined): string => {
    const user = req?.messages.find((message) => message.role === 'user');
    const part = user?.parts.find((p) => p.type === 'text');
    return (part as { text?: string } | undefined)?.text ?? '';
  };
  const CHILD_FAILURE = {
    code: 'agent',
    message: 'scripted child failure',
    retryable: false,
    data: { kind: 'model' },
  } as const;

  /**
   * One cited child, one child that dies at the wire, a coordination
   * script with an optional schema-dead finish exchange, and a blind
   * synthesis candidate the evidence validator rejects.
   */
  function parityAdapter(options: {
    schemaDeadFinish?: boolean;
    synthesis?: boolean;
  }): ReturnType<typeof scriptedAdapter> {
    let coordination = 0;
    return scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        if (/doomed/.test(promptTextOf(req))) {
          return { error: { ...CHILD_FAILURE, data: { ...CHILD_FAILURE.data } } };
        }
        return { text: 'Alpha findings. Citations: src/core/alpha.ts:12 src/util/alpha.ts:34' };
      }
      if (/synthesis invocation/.test(promptTextOf(req))) {
        return { toolCall: { name: 'finish', args: { result: 'blind: citations dropped' } } };
      }
      coordination += 1;
      if (coordination === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'research alpha' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'doomed detour' } },
          ],
        };
      }
      if (coordination === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      if (coordination === 3 && options.schemaDeadFinish === true) {
        // The v1.74 casualty class: a finish call missing its required
        // `result`, dead at the SCHEMA gate before any validator runs.
        return { toolCall: { name: 'finish', args: { wrong: true } } };
      }
      const draft =
        options.synthesis === false
          ? { result: 'no sections here' }
          : { result: 'a coordination draft without citations' };
      return { toolCall: { name: 'finish', args: draft } };
    });
  }

  it('the synthesis failure mirrors the degradation facts the ok envelope carries', async () => {
    const adapter = parityAdapter({ schemaDeadFinish: true });
    const { internals } = makeInternals({ adapters: [adapter], ...PARITY_DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      maxSpawns: 2,
      limits: { maxTurns: 8 },
      synthesis: { limits: { maxTurns: 2 } },
      acceptance: { childPolicy: { minSuccessful: 1 } },
      finishValidation: {
        validators: [evidencePreservedValidator({ minShare: 0.75 })],
        maxRepairs: 0,
      },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as {
      completion?: string;
      childStatusCounts?: Record<string, number>;
      degradedReasons?: string[];
      schemaRejectedFinishExchanges?: number;
    };
    expect(data.completion).toBe('partial');
    expect(data.childStatusCounts).toEqual({ ok: 1, error: 1 });
    // The parity gap (cycle 73): the ok envelope names WHY the run is
    // partial; the error outcome must name it too.
    expect(data.degradedReasons).toHaveLength(1);
    expect(data.degradedReasons?.[0]).toContain("settled 'error'");
    // The schema-dead coordination exchange is visible beside repairsUsed.
    expect(data.schemaRejectedFinishExchanges).toBe(1);
  });

  it('without acceptance the counter still rides the synthesis failure', async () => {
    const adapter = parityAdapter({ schemaDeadFinish: true });
    const { internals } = makeInternals({ adapters: [adapter], ...PARITY_DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      maxSpawns: 2,
      limits: { maxTurns: 8 },
      synthesis: { limits: { maxTurns: 2 } },
      finishValidation: {
        validators: [evidencePreservedValidator({ minShare: 0.75 })],
        maxRepairs: 0,
      },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as { schemaRejectedFinishExchanges?: number };
    expect(data.schemaRejectedFinishExchanges).toBe(1);
  });

  it('a coordination rejection past the bound carries the counter beside repairsUsed', async () => {
    const adapter = parityAdapter({ schemaDeadFinish: true, synthesis: false });
    const { internals } = makeInternals({ adapters: [adapter], ...PARITY_DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      maxSpawns: 2,
      limits: { maxTurns: 8 },
      finishValidation: {
        validators: [requiredSectionsValidator({ sections: ['## Findings'] })],
        maxRepairs: 0,
      },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as {
      repairsUsed?: number;
      schemaRejectedFinishExchanges?: number;
    };
    expect(data.repairsUsed).toBe(0);
    expect(data.schemaRejectedFinishExchanges).toBe(1);
  });

  it('a run with no schema-dead exchange carries no counter field at all', async () => {
    const adapter = parityAdapter({});
    const { internals } = makeInternals({ adapters: [adapter], ...PARITY_DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      maxSpawns: 2,
      limits: { maxTurns: 8 },
      synthesis: { limits: { maxTurns: 2 } },
      acceptance: { childPolicy: { minSuccessful: 1 } },
      finishValidation: {
        validators: [evidencePreservedValidator({ minShare: 0.75 })],
        maxRepairs: 0,
      },
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, wf, undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    const data = (thrown as FailRunError).data as Record<string, unknown>;
    expect('schemaRejectedFinishExchanges' in data).toBe(false);
  });
});

describe('the schema-recovered finish counter (the sixth comparison experiment, cycle 77)', () => {
  // The near-JSON second chance (v1.75.1) used to leave only a warn
  // log behind; the judge's P1.5 wants the recovery durable on the
  // outcome, beside schemaRejectedFinishExchanges.
  const DEFAULTS = {
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
    profiles: PROFILES,
  } as const;
  const promptTextOf = (req: ChatRequest | undefined): string => {
    const user = req?.messages.find((message) => message.role === 'user');
    const part = user?.parts.find((p) => p.type === 'text');
    return (part as { text?: string } | undefined)?.text ?? '';
  };
  const flowAdapter = (options: {
    unparsedCoordination: boolean;
    synthesis?: 'unparsed' | 'clean';
  }) => {
    let coordination = 0;
    return scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'evidence' };
      }
      if (options.synthesis !== undefined && /synthesis invocation/.test(promptTextOf(req))) {
        return options.synthesis === 'unparsed'
          ? { toolCall: { name: 'finish', args: { __unparsed: '{"result": "final"}' } } }
          : { toolCall: { name: 'finish', args: { result: 'final' } } };
      }
      coordination += 1;
      if (coordination === 1) {
        return { toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'dig' } } };
      }
      if (coordination === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return options.unparsedCoordination
        ? { toolCall: { name: 'finish', args: { __unparsed: '{"result": "done"}' } } }
        : { toolCall: { name: 'finish', args: { result: 'done' } } };
    });
  };
  interface RecoveredEnvelope {
    result?: unknown;
    completion?: string;
    schemaRecoveredFinishExchanges?: number;
  }

  it('a recovered coordination finish counts once on the ok envelope', async () => {
    const adapter = flowAdapter({ unparsedCoordination: true });
    const { internals } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow('goal', {
      maxSpawns: 1,
      acceptance: { childPolicy: 'all-ok' },
    });
    const envelope = (await executeWorkflow(internals, wf, undefined)) as RecoveredEnvelope;
    expect(envelope.result).toBe('done');
    expect(envelope.completion).toBe('complete');
    expect(envelope.schemaRecoveredFinishExchanges).toBe(1);
  });

  it('a recovered synthesis finish counts; a clean run carries no field', async () => {
    const adapter = flowAdapter({ unparsedCoordination: false, synthesis: 'unparsed' });
    const { internals } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow('goal', {
      maxSpawns: 1,
      synthesis: { limits: { maxTurns: 2 } },
      acceptance: { childPolicy: 'all-ok' },
    });
    const envelope = (await executeWorkflow(internals, wf, undefined)) as RecoveredEnvelope;
    expect(envelope.result).toBe('final');
    expect(envelope.schemaRecoveredFinishExchanges).toBe(1);

    const cleanAdapter = flowAdapter({ unparsedCoordination: false, synthesis: 'clean' });
    const clean = makeInternals({ adapters: [cleanAdapter], ...DEFAULTS });
    const cleanEnvelope = (await executeWorkflow(
      clean.internals,
      makeOrchestratorWorkflow('goal', {
        maxSpawns: 1,
        synthesis: { limits: { maxTurns: 2 } },
        acceptance: { childPolicy: 'all-ok' },
      }),
      undefined,
    )) as RecoveredEnvelope;
    expect(cleanEnvelope.result).toBe('final');
    expect(cleanEnvelope.schemaRecoveredFinishExchanges).toBeUndefined();
  });
});

describe('the synthesis terminal starvation shape (the fifth experiment, cycle 75)', () => {
  const STARVE_DEFAULTS = {
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
    profiles: PROFILES,
  } as const;
  const promptTextOf = (req: ChatRequest | undefined): string => {
    const user = req?.messages.find((message) => message.role === 'user');
    const part = user?.parts.find((p) => p.type === 'text');
    return (part as { text?: string } | undefined)?.text ?? '';
  };
  const SHORT_FINAL = 'an interim final still far below the word bound';
  const LONG_FINAL =
    'the expanded final ' + Array.from({ length: 70 }, (unused, i) => `word${String(i)}`).join(' ');

  /**
   * The experiment harness shape at test scale: two children, the
   * synthesis reads BOTH (spending the whole tool budget), then calls
   * finish. `synthesisFinals` scripts the finish results in order.
   */
  function starvationAdapter(synthesisFinals: string[]): ReturnType<typeof scriptedAdapter> {
    let coordination = 0;
    let synthesisFinishes = 0;
    let readHandles: number[] = [];
    return scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'worker findings with evidence src/core/topic.ts:12' };
      }
      if (/synthesis invocation/.test(promptTextOf(req))) {
        if (readHandles.length === 0) {
          readHandles = [
            ...new Set([...promptTextOf(req).matchAll(/"handle":(\d+)/g)].map((m) => Number(m[1]))),
          ];
          return {
            toolCalls: readHandles.slice(0, 2).map((handle) => ({
              name: 'get_child_result',
              args: { handle },
            })),
          };
        }
        synthesisFinishes += 1;
        const final =
          synthesisFinals[Math.min(synthesisFinishes - 1, synthesisFinals.length - 1)] ??
          SHORT_FINAL;
        return { toolCall: { name: 'finish', args: { result: final } } };
      }
      coordination += 1;
      if (coordination === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'research alpha' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'research beta' } },
          ],
        };
      }
      if (coordination === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: SHORT_FINAL } } };
    });
  }

  function starvationWorkflow() {
    return makeOrchestratorWorkflow('produce the assessment', {
      maxSpawns: 2,
      limits: { maxTurns: 6 },
      synthesis: {
        limits: { maxTurns: 2, maxToolCalls: 2 },
        exposeChildResultTools: true,
        context: 'full',
      },
      finishValidation: {
        validators: [wordCountValidator({ min: 60 })],
        maxRepairs: 2,
        repairTurnReserve: 1,
        draftPolicy: { minWords: 5 },
      },
    });
  }

  it('the finish after the reads spent the budget is admitted, rejected, and repaired to ok', async () => {
    // The fifth experiment's exact shape: the tool cap equals the child
    // count, the mandatory reads exhaust it, and the terminal finish
    // arrives with zero admission slots. Before cycle 75 this settled
    // 'limit' with the finish never executed and the run failed closed.
    const adapter = starvationAdapter([SHORT_FINAL, LONG_FINAL]);
    const { internals } = makeInternals({ adapters: [adapter], ...STARVE_DEFAULTS });
    const outcome = await executeWorkflow(internals, starvationWorkflow(), undefined);
    expect(outcome).toBe(LONG_FINAL);
    const synthesisReqs = adapter.calls.filter((req) =>
      /synthesis invocation/.test(promptTextOf(req)),
    );
    // Reads, rejected finish, repaired finish: three synthesis turns.
    expect(synthesisReqs).toHaveLength(3);
    const repairView = JSON.stringify(synthesisReqs[2]?.messages ?? []);
    expect(repairView).toContain('word count');
  });

  it('a synthesis that never calls finish still fails closed with the exact message', async () => {
    // The admission exemption is for the terminal tool only: a model
    // that burns every turn on reads keeps the typed fail-closed error.
    let coordination = 0;
    const neverFinishing = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'worker findings with evidence src/core/topic.ts:12' };
      }
      if (/synthesis invocation/.test(promptTextOf(req))) {
        const handle = Number(/"handle":(\d+)/.exec(promptTextOf(req))?.[1] ?? -1);
        return { toolCall: { name: 'get_child_result', args: { handle } } };
      }
      coordination += 1;
      if (coordination === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'research alpha' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'research beta' } },
          ],
        };
      }
      if (coordination === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: SHORT_FINAL } } };
    });
    const { internals } = makeInternals({
      adapters: [neverFinishing],
      ...STARVE_DEFAULTS,
    });
    let thrown: unknown;
    try {
      await executeWorkflow(internals, starvationWorkflow(), undefined);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(FailRunError);
    expect((thrown as FailRunError).message).toContain(
      "the synthesis invocation terminated with status 'limit'",
    );
    expect((thrown as FailRunError).message).toContain(
      'finish validators are configured, so the unvalidated draft cannot stand',
    );
  });
});

describe('the synthesis budget reserve (the sixth comparison experiment, cycle 76)', () => {
  const RESERVE_DEFAULTS = {
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
  } as const;
  const promptOf = (req: ChatRequest): string => {
    const user = req.messages.find((message) => message.role === 'user');
    const part = user?.parts.find((p) => p.type === 'text');
    return (part as { text?: string } | undefined)?.text ?? '';
  };
  const isSynthesisReq = (req: ChatRequest): boolean => /synthesis invocation/.test(promptOf(req));

  /**
   * An OBEDIENT scripted model over a 100k output cap: every turn emits
   * at most the request's maxOutputTokens (the budget clamp's actual
   * lever), the coordination wants one expensive analysis turn before
   * its draft finish, and the synthesis needs a 4000 token finish
   * payload; a synthesis turn clamped under that burns its allowance
   * and is cut before any tool call, exactly the sixth experiment's
   * run 1 transcript.
   */
  function reserveAdapter(): ReturnType<typeof scriptedAdapter> {
    let coordination = 0;
    return scriptedAdapter(
      (req): ScriptedTurn => {
        const cap = req.maxOutputTokens;
        if (isSynthesisReq(req)) {
          if (cap !== undefined && cap < 62000) {
            // A brief reasoning prelude is cut at the allowance; the spend
            // stays small, so the sub account cap is never CROSSED and the
            // invocation dies at maxTurns, not at the cap (the run 1 shape).
            return {
              finish: 'max-tokens',
              usage: { inputTokens: 500, outputTokens: Math.min(cap, 200) },
            };
          }
          return {
            toolCall: {
              name: 'finish',
              args: {
                result:
                  'final report ' +
                  Array.from({ length: 40 }, (unused, i) => `w${String(i)}`).join(' '),
              },
            },
            usage: { inputTokens: 500, outputTokens: 62000 },
          };
        }
        coordination += 1;
        if (coordination === 1) {
          const desired = 140000;
          const out = cap === undefined ? desired : Math.min(desired, Math.floor(cap * 0.98));
          return {
            text: 'coordination analysis',
            usage: { inputTokens: 1000, outputTokens: out },
          };
        }
        return {
          toolCall: {
            name: 'finish',
            args: {
              result:
                'the draft ' + Array.from({ length: 30 }, (unused, i) => `d${String(i)}`).join(' '),
            },
          },
          usage: { inputTokens: 400, outputTokens: 400 },
        };
      },
      { caps: testCaps({ maxOutputTokens: 200000 }) },
    );
  }

  function reserveWorkflow(budget: {
    capUsd: number;
    capFraction: number;
    synthesisReserveUsd?: number;
  }): ReturnType<typeof makeOrchestratorWorkflow> {
    return makeOrchestratorWorkflow('compose the assessment', {
      budget,
      // estCost keeps the synthesis agent's own admission reserve small
      // so the crossing check never double counts the payload beside
      // the flat 0.5 default while the finish turn is still settling.
      synthesis: { limits: { maxTurns: 2 }, estCost: 0.05 },
      finishValidation: { validators: [wordCountValidator({ min: 20 })] },
    });
  }

  it('without the reserve the sub account budget clamps the synthesis below the payload and the run fails closed', async () => {
    const adapter = reserveAdapter();
    const engine = createEngine({ adapters: [adapter], defaults: RESERVE_DEFAULTS });
    const outcome = await engine.run(
      reserveWorkflow({ capUsd: 2.0, capFraction: 1.0 }),
      undefined,
      { budgetUsd: 10 },
    ).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.code).toBe('fail_run');
    expect(outcome.error?.message).toContain(
      "the synthesis invocation terminated with status 'limit'",
    );
    expect((outcome.error?.data as { source?: string }).source).toBe('orchestrator_synthesis');
    const synthesisRequests = adapter.calls.filter(isSynthesisReq);
    expect(synthesisRequests.length).toBeGreaterThan(0);
    for (const req of synthesisRequests) {
      expect(req.maxOutputTokens ?? Infinity).toBeLessThan(62000);
    }
  });

  it('budget.synthesisReserveUsd holds the payload money through coordination and the finish lands', async () => {
    const adapter = reserveAdapter();
    const engine = createEngine({ adapters: [adapter], defaults: RESERVE_DEFAULTS });
    const outcome = await engine.run(
      reserveWorkflow({ capUsd: 2.0, capFraction: 1.0, synthesisReserveUsd: 0.7 }),
      undefined,
      { budgetUsd: 10 },
    ).result;
    expect(outcome.status).toBe('ok');
    expect(String(outcome.value)).toContain('final report');
    // The hold's two visible edges: the coordination allowance shrank
    // below the raw cap, and the synthesis dispatched at or above the
    // 4000 token payload.
    const coordinationFirst = adapter.calls.find((req) => !isSynthesisReq(req));
    expect(coordinationFirst?.maxOutputTokens ?? Infinity).toBeLessThan(140000);
    const synthesisRequest = adapter.calls.find(isSynthesisReq);
    expect(synthesisRequest?.maxOutputTokens ?? Infinity).toBeGreaterThanOrEqual(62000);
  });

  it('the reserve is validated at intake', () => {
    expect(() => makeOrchestratorWorkflow('g', { budget: { synthesisReserveUsd: 0.1 } })).toThrow(
      ConfigError,
    );
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: {},
        budget: { synthesisReserveUsd: -1 },
      }),
    ).toThrow(ConfigError);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: { mode: 'incremental' },
        budget: { synthesisReserveUsd: 0.1 },
      }),
    ).toThrow(ConfigError);
  });

  it('a reserve at or above the effective cap refuses before any dispatch', async () => {
    const adapter = reserveAdapter();
    const engine = createEngine({ adapters: [adapter], defaults: RESERVE_DEFAULTS });
    const outcome = await engine.run(
      reserveWorkflow({ capUsd: 2.0, capFraction: 1.0, synthesisReserveUsd: 2.0 }),
      undefined,
      { budgetUsd: 10 },
    ).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toMatch(/synthesis reserve/);
    expect(adapter.calls).toHaveLength(0);
  });
});

describe('the synthesis reserve lifecycle (RV304 second half, judge P1.7)', () => {
  const ROUTING = {
    loop: 'fake:model',
    orchestrate: 'fake:model',
    synthesize: 'fake:model',
  } as const;
  const promptOf = (req: ChatRequest): string => {
    const user = req.messages.find((message) => message.role === 'user');
    const part = user?.parts.find((p) => p.type === 'text');
    return (part as { text?: string } | undefined)?.text ?? '';
  };
  const isSynthesisReq = (req: ChatRequest): boolean => /synthesis invocation/.test(promptOf(req));

  /** The reserve adapter of the sixth-experiment suite, verbatim shape. */
  function lifecycleAdapter(): ReturnType<typeof scriptedAdapter> {
    let coordination = 0;
    return scriptedAdapter(
      (req): ScriptedTurn => {
        const cap = req.maxOutputTokens;
        if (isSynthesisReq(req)) {
          if (cap !== undefined && cap < 62000) {
            return {
              finish: 'max-tokens',
              usage: { inputTokens: 500, outputTokens: Math.min(cap, 200) },
            };
          }
          return {
            toolCall: {
              name: 'finish',
              args: {
                result:
                  'final report ' +
                  Array.from({ length: 40 }, (unused, i) => `w${String(i)}`).join(' '),
              },
            },
            usage: { inputTokens: 500, outputTokens: 62000 },
          };
        }
        coordination += 1;
        if (coordination === 1) {
          const desired = 140000;
          const out = cap === undefined ? desired : Math.min(desired, Math.floor(cap * 0.98));
          return {
            text: 'coordination analysis',
            usage: { inputTokens: 1000, outputTokens: out },
          };
        }
        return {
          toolCall: {
            name: 'finish',
            args: {
              result:
                'the draft ' + Array.from({ length: 30 }, (unused, i) => `d${String(i)}`).join(' '),
            },
          },
          usage: { inputTokens: 400, outputTokens: 400 },
        };
      },
      { caps: testCaps({ maxOutputTokens: 200000 }) },
    );
  }

  const lifecycleWorkflow = (options: {
    synthesisReserveUsd?: number;
    capUsd: number;
    acceptance?: boolean;
  }): ReturnType<typeof makeOrchestratorWorkflow> =>
    makeOrchestratorWorkflow('compose the assessment', {
      budget: {
        capUsd: options.capUsd,
        capFraction: 1.0,
        ...(options.synthesisReserveUsd === undefined
          ? {}
          : { synthesisReserveUsd: options.synthesisReserveUsd }),
      },
      synthesis: { limits: { maxTurns: 2 }, estCost: 0.05 },
      finishValidation: { validators: [wordCountValidator({ min: 20 })] },
      ...(options.acceptance === true ? { acceptance: { childPolicy: 'all-ok' as const } } : {}),
    });

  const reserveDecisionsOf = (entries: JournalEntry[]): JournalEntry[] =>
    entries.filter(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_synthesis_reserve',
    );

  it('the lifecycle is journaled once and rides the acceptance envelope', async () => {
    const adapter = lifecycleAdapter();
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: ROUTING,
      budgetUsd: 10,
    });
    const envelope = (await executeWorkflow(
      internals,
      lifecycleWorkflow({ capUsd: 2.0, synthesisReserveUsd: 0.7, acceptance: true }),
      undefined,
    )) as {
      completion?: string;
      synthesisReserve?: {
        configuredUsd: number;
        heldUsd: number;
        releasedUsd: number;
        remainingBeforeSynthesisUsd?: number;
        consumedUsd?: number;
      };
    };
    expect(envelope.completion).toBe('complete');
    expect(envelope.synthesisReserve).toMatchObject({
      configuredUsd: 0.7,
      heldUsd: 0.7,
      releasedUsd: 0.7,
    });
    // The hold freed into real headroom, and the synthesis spent most of
    // it: one 500-in 62000-out turn at the fake pricing.
    expect(envelope.synthesisReserve?.remainingBeforeSynthesisUsd).toBeGreaterThan(0.62);
    expect(envelope.synthesisReserve?.consumedUsd).toBeCloseTo(0.6205, 10);
    const entries = await store.load('test-run');
    const decisions = reserveDecisionsOf(entries);
    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.value).toMatchObject({
      decisionType: 'orchestrator_synthesis_reserve',
      configuredUsd: 0.7,
      heldUsd: 0.7,
      releasedUsd: 0.7,
    });
  });

  it('without acceptance the raw value stays untouched and the journal still carries the decision', async () => {
    const adapter = lifecycleAdapter();
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: ROUTING,
      budgetUsd: 10,
    });
    const value = await executeWorkflow(
      internals,
      lifecycleWorkflow({ capUsd: 2.0, synthesisReserveUsd: 0.7 }),
      undefined,
    );
    expect(String(value)).toContain('final report');
    const entries = await store.load('test-run');
    expect(reserveDecisionsOf(entries)).toHaveLength(1);
  });

  it('without the reserve the envelope and the journal are byte free of the lifecycle', async () => {
    const adapter = lifecycleAdapter();
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: ROUTING,
      budgetUsd: 10,
    });
    const envelope = await executeWorkflow(
      internals,
      lifecycleWorkflow({ capUsd: 5.0, acceptance: true }),
      undefined,
    );
    expect(JSON.stringify(envelope)).not.toContain('synthesisReserve');
    const entries = await store.load('test-run');
    expect(reserveDecisionsOf(entries)).toHaveLength(0);
    for (const entry of entries) {
      expect(JSON.stringify(entry)).not.toContain('orchestrator_synthesis_reserve');
    }
  });

  it('a terminal validator rejection still journals the lifecycle decision (RV402)', async () => {
    // The eighth-experiment finding: the throw of the validation
    // termination preceded the lifecycle append, so a rejected synthesis
    // settled with the reserve's audit record missing entirely.
    const rejectingWorkflow = makeOrchestratorWorkflow('compose the assessment', {
      budget: { capUsd: 2.0, capFraction: 1.0, synthesisReserveUsd: 0.7 },
      synthesis: { limits: { maxTurns: 2 }, estCost: 0.05 },
      finishValidation: { validators: [wordCountValidator({ min: 100000 })], maxRepairs: 0 },
    });
    const adapter = lifecycleAdapter();
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: ROUTING,
      budgetUsd: 10,
    });
    await expect(executeWorkflow(internals, rejectingWorkflow, undefined)).rejects.toThrow(
      /failed host validation/,
    );
    const entries = await store.load('test-run');
    const decisions = reserveDecisionsOf(entries);
    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.value).toMatchObject({
      decisionType: 'orchestrator_synthesis_reserve',
      configuredUsd: 0.7,
      heldUsd: 0.7,
      releasedUsd: 0.7,
    });
    // The rejected synthesis was still paid for; the record says so.
    const frozen = decisions[0]?.value as { consumedUsd?: number };
    expect(frozen.consumedUsd).toBeGreaterThan(0);

    // A resume replays into the same terminal rejection without minting
    // a second lifecycle decision: the frozen facts are found by key.
    const resumed = makeInternals({
      adapters: [lifecycleAdapter()],
      routing: ROUTING,
      budgetUsd: 10,
      priorEntries: entries,
      store,
    });
    await expect(executeWorkflow(resumed.internals, rejectingWorkflow, undefined)).rejects.toThrow(
      /failed host validation/,
    );
    expect(reserveDecisionsOf(await store.load('test-run'))).toHaveLength(1);
  });
});

describe('exact fill parity between the projection and the live gate (RV307, judge P1.8)', () => {
  // One set of numbers, both layers: root ceiling 1.0, an explicit
  // 0.2 orchestrator cap whose exact-fill hint holds 0.2, so the static
  // child remainder is 0.8. The 'worker' child declares estCost 0.8
  // (exact fill: certain live rejection, because the paid coordination
  // turn always shrinks the live remainder first), the 'retry' child
  // declares 0.7 and fits in both layers.
  const PARITY_PROFILES = {
    worker: { description: 'the exact-fill child', estCost: 0.8 },
    retry: { description: 'the below-fill retry', estCost: 0.7 },
  };

  it('the projection denies the exact-fill child and admits the retry', async () => {
    const { preflightEstimate } = await import('../engine/preflight.js');
    const report = preflightEstimate({
      engine: {
        adapters: [scriptedAdapter(() => ({ text: 'unused' }))],
        defaults: {
          routing: { loop: 'fake:model', orchestrate: 'fake:model' },
          profiles: PARITY_PROFILES,
        },
      },
      run: { budgetUsd: 1 },
      orchestrator: { budget: { capUsd: 0.2, capFraction: 1.0 } },
      spawns: [
        { label: 'worker', profile: 'worker', estCost: 0.8 },
        { label: 'retry', profile: 'retry', estCost: 0.7 },
      ],
    });
    expect(report.admission.wave.map((row) => [row.label, row.admitted, row.deniedBy])).toEqual([
      ['orchestrator', true, undefined],
      ['worker', false, 'budget'],
      ['retry', true, undefined],
    ]);
    expect(report.findings.some((entry) => entry.code === 'partial-admission')).toBe(true);
  });

  it('the live gate rejects and admits the same children for the same reason', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) !== '') {
        return { text: 'done', usage: { inputTokens: 10, outputTokens: 5 } };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'the exact fill' } },
            { name: 'spawn_agent', args: { agentType: 'retry', prompt: 'the retry' } },
          ],
          usage: { inputTokens: 1000, outputTokens: 400 },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'parity held' } } };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PARITY_PROFILES,
      budgetUsd: 1,
    });
    const wf = makeOrchestratorWorkflow('goal', {
      budget: { capUsd: 0.2, capFraction: 1.0 },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('parity held');
    const verdicts = admissionEntries(await store.load('test-run')).map((entry) => {
      const value = entry.value as {
        spec?: { agentType?: string };
        decision: { verdict: { kind: string; reason?: { code?: string } } };
      };
      return {
        agentType: value.spec?.agentType,
        kind: value.decision.verdict.kind,
        ...(value.decision.verdict.reason?.code === undefined
          ? {}
          : { code: value.decision.verdict.reason.code }),
      };
    });
    // The SAME split the projection promised: the exact-fill child dies
    // with reason budget, the retry admits.
    expect(verdicts).toEqual([
      { agentType: 'worker', kind: 'reject', code: 'budget' },
      { agentType: 'retry', kind: 'admit' },
    ]);
    // The rejection reached the model typed, never as a torn run.
    const orchCalls = adapter.calls.filter((r) => agentTypeOf(r) === '');
    const firstResults = JSON.stringify(orchCalls[1]?.messages.at(-1)?.parts);
    expect(firstResults).toContain('budget');
  });
});

describe('the synthesis hold parity between projection and live gate (RV1901)', () => {
  // The four-role benchmark's primary arm, dollar for dollar: $6.00
  // ceiling, $4.50 orchestrator cap, $1.00 synthesis reserve, four
  // workers at estCost $0.62. The live gate held the synthesis carve-out
  // at the root and refused the third worker; the projection read 5/5
  // green because its wave arithmetic dropped the hold. Both layers must
  // now promise the same two seats.
  const BENCH_PROFILES = {
    product: { description: 'the product auditor', estCost: 0.62 },
    finops: { description: 'the finops reviewer', estCost: 0.62 },
    durability: { description: 'the durability reviewer', estCost: 0.62 },
    adversarial: { description: 'the adversarial judge', estCost: 0.62 },
  };

  it('the live gate seats exactly the two children the projection promises', async () => {
    // The admitted children must STAY in flight through the whole batch
    // (the benchmark's workers ran for minutes): a gate holds their
    // streams until the batch settles, or instant scripted children
    // would release their reserves between admissions and dissolve the
    // very pressure under test.
    let releaseChildren: () => void = () => {};
    const childrenGate = new Promise<void>((resolve) => {
      releaseChildren = resolve;
    });
    let orchTurn = 0;
    const inner = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) !== '') {
        return { text: 'reviewed' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: {
            name: 'parallel_agents',
            args: {
              tasks: [
                { agentType: 'product', prompt: 'audit the product surface' },
                { agentType: 'finops', prompt: 'audit providers and finops' },
                { agentType: 'durability', prompt: 'audit durability and operations' },
                { agentType: 'adversarial', prompt: 'attack the strong claims' },
              ],
            },
          },
        };
      }
      if (orchTurn === 2) {
        releaseChildren();
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'partial roster' } } };
    });
    const adapter: typeof inner = {
      ...inner,
      async *stream(req, signal) {
        if (agentTypeOf(req) !== '') {
          await childrenGate;
        }
        yield* inner.stream(req, signal);
      },
    };
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
      profiles: BENCH_PROFILES,
      budgetUsd: 6,
    });
    const wf = makeOrchestratorWorkflow('the four-role dossier', {
      budget: { capUsd: 4.5, capFraction: 1.0, synthesisReserveUsd: 1.0 },
      synthesis: { limits: { maxTurns: 2 } },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('partial roster');
    const verdicts = admissionEntries(await store.load('test-run')).map((entry) => {
      const value = entry.value as {
        spec?: { agentType?: string };
        decision: { verdict: { kind: string; reason?: { code?: string } } };
      };
      return {
        agentType: value.spec?.agentType,
        kind: value.decision.verdict.kind,
        ...(value.decision.verdict.reason?.code === undefined
          ? {}
          : { code: value.decision.verdict.reason.code }),
      };
    });
    // Fail-fast batch semantics (RV805): the third task dies with reason
    // budget and the fourth is never attempted.
    expect(verdicts).toEqual([
      { agentType: 'product', kind: 'admit' },
      { agentType: 'finops', kind: 'admit' },
      { agentType: 'durability', kind: 'reject', code: 'budget' },
    ]);

    const { preflightEstimate } = await import('../engine/preflight.js');
    const report = preflightEstimate({
      engine: {
        adapters: [scriptedAdapter(() => ({ text: 'unused' }))],
        defaults: {
          routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
          profiles: BENCH_PROFILES,
        },
      },
      run: { budgetUsd: 6 },
      orchestrator: {
        budget: { capUsd: 4.5, capFraction: 1.0, synthesisReserveUsd: 1.0 },
        synthesis: { limits: { maxTurns: 2 } },
      },
      spawns: Object.keys(BENCH_PROFILES).map((label) => ({
        label,
        profile: label,
        estCost: 0.62,
      })),
    });
    expect(report.admission.synthesisReserveUsd).toBe(1.0);
    expect(report.admission.wave.map((row) => [row.label, row.admitted])).toEqual([
      ['orchestrator', true],
      ['product', true],
      ['finops', true],
      ['durability', false],
      ['adversarial', false],
    ]);
  });
});

describe('conditional synthesis: skipWhenDraftValid (RV510)', () => {
  const SECTIONED = '## Findings\nEverything the contract demands.';
  const SECTIONLESS = 'a schema-valid candidate without the required section';
  const SYNTHESIZED = '## Findings\nThe synthesis rewrite.';
  const DEFAULTS = {
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
    profiles: PROFILES,
  } as const;
  const CONTRACT = () => ({
    validators: [requiredSectionsValidator({ sections: ['## Findings'] })],
    maxRepairs: 3,
  });
  /** Coordination draft first, then every synthesis turn serves `final`. */
  function draftThenSynthesis(draft: string, final: string) {
    let call = 0;
    return scriptedAdapter((): ScriptedTurn => {
      call += 1;
      return call === 1
        ? { toolCall: { name: 'finish', args: { result: draft } } }
        : { toolCall: { name: 'finish', args: { result: final } } };
    });
  }
  const skipDecisions = (entries: readonly JournalEntry[]): JournalEntry[] =>
    entries.filter(
      (e) =>
        e.kind === 'decision' &&
        (e.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_synthesis_skip',
    );

  it('a draft that passes the full finish contract skips the synthesis span, journaled and announced', async () => {
    const adapter = draftThenSynthesis(SECTIONED, 'NEVER');
    const { internals, events } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      synthesis: { limits: { maxTurns: 3 }, skipWhenDraftValid: true },
      finishValidation: CONTRACT(),
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(SECTIONED);
    // One coordination turn; the synthesis invocation never dispatched.
    expect(adapter.calls).toHaveLength(1);
    await internals.replayer.flush();
    const entries = internals.replayer.snapshot();
    const skips = skipDecisions(entries);
    expect(skips).toHaveLength(1);
    // No contract descriptor is configured here, so the entry binds by
    // the draft it judged and the validator names (RV603).
    const { draftHash, ...skipValue } = skips[0]?.value as { draftHash?: string };
    expect(draftHash).toMatch(/^[0-9a-f]{64}$/);
    expect(skipValue).toEqual({
      decisionType: 'orchestrator_synthesis_skip',
      reason: 'synthesis_skipped_by_valid_draft',
      validators: ['required-sections'],
    });
    // No synthesis agent entry exists: the span never started.
    const agentEntries = entries.filter((e) => e.kind === 'agent' && e.status === 'running');
    expect(agentEntries).toHaveLength(1);
    const logs = events.ofType('log') as Array<{ msg: string; data?: { reason?: string } }>;
    const skipLog = logs.find((entry) => entry.msg === 'orchestrator synthesis skipped');
    expect(skipLog?.data?.reason).toBe('synthesis_skipped_by_valid_draft');
  });

  it('an invalid draft goes to synthesis exactly as before, with no skip decision', async () => {
    const adapter = draftThenSynthesis(SECTIONLESS, SYNTHESIZED);
    const { internals } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      synthesis: { limits: { maxTurns: 3 }, skipWhenDraftValid: true },
      finishValidation: CONTRACT(),
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(SYNTHESIZED);
    expect(adapter.calls.length).toBeGreaterThan(1);
    await internals.replayer.flush();
    expect(skipDecisions(internals.replayer.snapshot())).toHaveLength(0);
  });

  it('the default is off: a valid draft still pays for synthesis and nothing new journals', async () => {
    const adapter = draftThenSynthesis(SECTIONED, SYNTHESIZED);
    const { internals } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      synthesis: { limits: { maxTurns: 3 } },
      finishValidation: CONTRACT(),
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(SYNTHESIZED);
    expect(adapter.calls).toHaveLength(2);
    await internals.replayer.flush();
    expect(skipDecisions(internals.replayer.snapshot())).toHaveLength(0);
  });

  it('with acceptance configured the envelope names the skip beside the draft result', async () => {
    const adapter = draftThenSynthesis(SECTIONED, 'NEVER');
    const { internals } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      acceptance: { childPolicy: 'all-ok' },
      synthesis: { limits: { maxTurns: 3 }, skipWhenDraftValid: true },
      finishValidation: CONTRACT(),
    });
    const outcome = (await executeWorkflow(internals, wf, undefined)) as {
      result: unknown;
      completion: string;
      synthesisSkipped?: string;
    };
    expect(outcome.result).toBe(SECTIONED);
    expect(outcome.completion).toBe('complete');
    expect(outcome.synthesisSkipped).toBe('synthesis_skipped_by_valid_draft');
  });

  it('resume rolls the journaled skip forward with zero adapter calls', async () => {
    const store = new InMemoryStore();
    const liveAdapter = draftThenSynthesis(SECTIONED, 'NEVER');
    const engineA = createEngine({
      adapters: [liveAdapter],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const options = {
      synthesis: { limits: { maxTurns: 3 }, skipWhenDraftValid: true },
      finishValidation: CONTRACT(),
    };
    const first = await engineA.run(makeOrchestratorWorkflow('assess', options), undefined, {
      runId: 'SKIP-RESUME',
    }).result;
    expect(first.status).toBe('ok');
    expect(first.value).toBe(SECTIONED);

    const replayAdapter = draftThenSynthesis(SECTIONED, 'NEVER');
    const engineB = createEngine({
      adapters: [replayAdapter],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const resumed = await engineB.resume('SKIP-RESUME', makeOrchestratorWorkflow('assess', options))
      .result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe(SECTIONED);
    expect(replayAdapter.calls).toHaveLength(0);
    const entries = await store.load('SKIP-RESUME');
    expect(skipDecisions(entries)).toHaveLength(1);
  });

  it('a stale skip does not survive a superseding contract (RV603)', async () => {
    const store = new InMemoryStore();
    // Contract A accepts the draft; contract B, the fix, demands a
    // section the draft lacks. Same validator NAME, different hash:
    // only the contract identity can tell the generations apart.
    const contractA = finishContract({ sections: ['## Findings'] });
    const contractB = finishContract({ sections: ['## Findings', '## Evidence'] });
    const optionsFor = (contract: ReturnType<typeof finishContract>) => ({
      synthesis: { limits: { maxTurns: 3 }, skipWhenDraftValid: true },
      finishValidation: { validators: [...contract.validators], contract, maxRepairs: 3 },
    });
    const COMPLETE = '## Findings\nthe draft.\n## Evidence\ndocs/a.md:1';
    const engineA = createEngine({
      adapters: [draftThenSynthesis(SECTIONED, 'NEVER')],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    // A crash between the journaled skip and the run settle.
    const inner = makeOrchestratorWorkflow('assess', optionsFor(contractA));
    const crashing = defineWorkflow({ name: inner.name }, async (ctx) => {
      await inner.body(ctx, undefined);
      throw new Error('killed after the synthesis skip');
    });
    const first = await engineA.run(crashing, undefined, { runId: 'SKIP-SUPERSEDE' }).result;
    expect(first.status).toBe('error');
    expect(skipDecisions(await store.load('SKIP-SUPERSEDE'))).toHaveLength(1);

    // The documented remedy: fix the contract, resume. The stale skip
    // may not carry the old verdict into the new generation.
    const resumeAdapter = draftThenSynthesis(SECTIONED, COMPLETE);
    const engineB = createEngine({
      adapters: [resumeAdapter],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const resumed = await engineB.resume(
      'SKIP-SUPERSEDE',
      makeOrchestratorWorkflow('assess', optionsFor(contractB)),
    ).result;
    expect(resumed.status).toBe('ok');
    // The synthesis ran under the CURRENT contract and its output
    // satisfies it; the draft the old generation accepted does not.
    expect(resumed.value).toBe(COMPLETE);
  });

  it('a re-derived skip supersedes the stale one and later resumes read the newest (RV603)', async () => {
    const store = new InMemoryStore();
    const contractA = finishContract({ sections: ['## Findings'] });
    const contractB = finishContract({ sections: ['## Findings', '## Evidence'] });
    const optionsFor = (contract: ReturnType<typeof finishContract>) => ({
      synthesis: { limits: { maxTurns: 3 }, skipWhenDraftValid: true },
      finishValidation: { validators: [...contract.validators], contract, maxRepairs: 3 },
    });
    const COMPLETE = '## Findings\nthe draft.\n## Evidence\ndocs/a.md:1';
    const crashAfter = (options: ReturnType<typeof optionsFor>) => {
      const inner = makeOrchestratorWorkflow('assess', options);
      return defineWorkflow({ name: inner.name }, async (ctx) => {
        await inner.body(ctx, undefined);
        throw new Error('killed after the synthesis skip');
      });
    };
    const engineA = createEngine({
      adapters: [draftThenSynthesis(SECTIONED, 'NEVER')],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    expect(
      (
        await engineA.run(crashAfter(optionsFor(contractA)), undefined, { runId: 'SKIP-NEWEST' })
          .result
      ).status,
    ).toBe('error');

    // The fixed contract, and a rerun coordination whose draft satisfies
    // it: the gate re-derives and journals a SECOND skip. The stale one
    // stays in the journal as the historical fact it is.
    const engineB = createEngine({
      adapters: [draftThenSynthesis(COMPLETE, 'NEVER')],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    expect(
      (await engineB.resume('SKIP-NEWEST', crashAfter(optionsFor(contractB))).result).status,
    ).toBe('error');
    expect(skipDecisions(await store.load('SKIP-NEWEST'))).toHaveLength(2);

    // A third segment reads the NEWEST entry, so the gate converges
    // instead of re-deriving (and re-journaling) on every resume.
    const thirdAdapter = draftThenSynthesis(COMPLETE, 'NEVER');
    const engineC = createEngine({
      adapters: [thirdAdapter],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const settled = await engineC.resume(
      'SKIP-NEWEST',
      makeOrchestratorWorkflow('assess', optionsFor(contractB)),
    ).result;
    expect(settled.status).toBe('ok');
    expect(settled.value).toBe(COMPLETE);
    expect(thirdAdapter.calls).toHaveLength(0);
    expect(skipDecisions(await store.load('SKIP-NEWEST'))).toHaveLength(2);
  });

  it('an unchanged contract and draft roll the journaled skip forward across a crash (RV603)', async () => {
    const store = new InMemoryStore();
    const options = {
      synthesis: { limits: { maxTurns: 3 }, skipWhenDraftValid: true },
      finishValidation: CONTRACT(),
    };
    const engineA = createEngine({
      adapters: [draftThenSynthesis(SECTIONED, 'NEVER')],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const inner = makeOrchestratorWorkflow('assess', options);
    const crashing = defineWorkflow({ name: inner.name }, async (ctx) => {
      await inner.body(ctx, undefined);
      throw new Error('killed after the synthesis skip');
    });
    expect((await engineA.run(crashing, undefined, { runId: 'SKIP-CRASH' }).result).status).toBe(
      'error',
    );

    const resumeAdapter = draftThenSynthesis(SECTIONED, 'NEVER');
    const engineB = createEngine({
      adapters: [resumeAdapter],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const resumed = await engineB.resume('SKIP-CRASH', makeOrchestratorWorkflow('assess', options))
      .result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe(SECTIONED);
    // Nothing re-dispatched and no second skip decision: the journaled
    // verdict is still the authority for its own generation and draft.
    expect(resumeAdapter.calls).toHaveLength(0);
    expect(skipDecisions(await store.load('SKIP-CRASH'))).toHaveLength(1);
  });

  it('a different draft under the same contract re-runs the gate (RV603)', async () => {
    const store = new InMemoryStore();
    const contract = finishContract({ sections: ['## Findings'] });
    // maxRepairs rides the coordination prompt, so lowering it reruns
    // the coordination turn while leaving the contract identity alone.
    const optionsWith = (maxRepairs: number) => ({
      synthesis: { limits: { maxTurns: 3 }, skipWhenDraftValid: true },
      finishValidation: { validators: [...contract.validators], contract, maxRepairs },
    });
    const engineA = createEngine({
      adapters: [draftThenSynthesis(SECTIONED, 'NEVER')],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const inner = makeOrchestratorWorkflow('assess', optionsWith(3));
    const crashing = defineWorkflow({ name: inner.name }, async (ctx) => {
      await inner.body(ctx, undefined);
      throw new Error('killed after the synthesis skip');
    });
    expect((await engineA.run(crashing, undefined, { runId: 'SKIP-DRAFT' }).result).status).toBe(
      'error',
    );

    // The rerun coordination produces a draft the contract rejects: the
    // skip journaled for the OTHER draft may not stand in for it.
    const resumeAdapter = draftThenSynthesis(SECTIONLESS, SYNTHESIZED);
    const engineB = createEngine({
      adapters: [resumeAdapter],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const resumed = await engineB.resume(
      'SKIP-DRAFT',
      makeOrchestratorWorkflow('assess', optionsWith(2)),
    ).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe(SYNTHESIZED);
  });

  it('without a contract descriptor the skip binds by draft and validator names (RV603)', async () => {
    const store = new InMemoryStore();
    // No finishContract: there is no generation identity to compare, so
    // the binding is the honestly weaker draft-plus-names pair.
    const optionsWith = (validators: FinishValidator[]) => ({
      synthesis: { limits: { maxTurns: 3 }, skipWhenDraftValid: true },
      finishValidation: { validators, maxRepairs: 3 },
    });
    const TINY = 'ok now';
    const engineA = createEngine({
      adapters: [draftThenSynthesis(SECTIONED, 'NEVER')],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const inner = makeOrchestratorWorkflow(
      'assess',
      optionsWith([requiredSectionsValidator({ sections: ['## Findings'] })]),
    );
    const crashing = defineWorkflow({ name: inner.name }, async (ctx) => {
      await inner.body(ctx, undefined);
      throw new Error('killed after the synthesis skip');
    });
    expect((await engineA.run(crashing, undefined, { runId: 'SKIP-NAMES' }).result).status).toBe(
      'error',
    );

    // A differently NAMED validator set: the journaled skip was rendered
    // by validators that are no longer the ones in force.
    const resumeAdapter = draftThenSynthesis(SECTIONED, TINY);
    const engineB = createEngine({
      adapters: [resumeAdapter],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const resumed = await engineB.resume(
      'SKIP-NAMES',
      makeOrchestratorWorkflow('assess', optionsWith([wordCountValidator({ max: 3 })])),
    ).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe(TINY);
  });

  it('rejects skipWhenDraftValid without finishValidation, and non-boolean values, at construction', () => {
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: { skipWhenDraftValid: true },
      }),
    ).toThrow(/skipWhenDraftValid/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: { skipWhenDraftValid: 'yes' as never },
        finishValidation: CONTRACT(),
      }),
    ).toThrow(ConfigError);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: { skipWhenDraftValid: true },
        finishValidation: CONTRACT(),
      }),
    ).not.toThrow();
  });
});

describe('recovered attempts alias by admission identity (RV609)', () => {
  /** Runs phase 1 (spawn one child, make it terminal per the script,
   * crash the coordinator), returns the truncated journal and the old
   * handle the restored transcript will keep calling. */
  async function crashAfterChild(
    childTurn: (req: ChatRequest) => ScriptedTurn,
    coordinatorSecondMove: (req: ChatRequest) => ScriptedTurn,
    transcripts: InMemoryTranscriptStore,
    opts?: Parameters<typeof makeOrchestratorWorkflow>[1],
  ): Promise<{ priorEntries: JournalEntry[]; truncatedStore: InMemoryStore; oldHandle: number }> {
    let phase1Turn = 0;
    const adapter1 = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return childTurn(req);
      }
      phase1Turn += 1;
      if (phase1Turn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'doomed task' } },
        };
      }
      if (phase1Turn === 2) {
        return coordinatorSecondMove(req);
      }
      return { error: { code: 'agent', message: 'simulated crash', retryable: false } };
    });
    const phase1 = makeInternals({
      adapters: [adapter1],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      transcripts,
    });
    const wf = makeOrchestratorWorkflow('rebirth goal', opts);
    await expect(executeWorkflow(phase1.internals, wf, undefined)).rejects.toThrow(
      /terminated with status 'error'/,
    );
    const phase1Entries = await phase1.store.load('test-run');
    const oldHandle = phase1Entries.find(
      (e) => e.kind === 'agent' && e.scope.startsWith('agent:') && e.status === 'running',
    )?.seq;
    expect(oldHandle).toBeDefined();
    const orchestratorTerminal = phase1Entries.find(
      (e) =>
        e.kind === 'agent' &&
        !e.scope.startsWith('agent:') &&
        e.status !== 'running' &&
        e.status !== 'suspended',
    );
    expect(orchestratorTerminal?.status).toBe('error');
    const priorEntries = phase1Entries.filter((e) => e.seq < (orchestratorTerminal?.seq ?? 0));
    const truncatedStore = new InMemoryStore({ quiet: true });
    for (const entry of priorEntries) {
      await truncatedStore.append('test-run', entry);
    }
    return { priorEntries, truncatedStore, oldHandle: oldHandle ?? -1 };
  }

  /** The phase 2 coordinator: awaits the transcript's handles once,
   * then finishes naming exactly what it saw. */
  function resumingCoordinator(): (req: ChatRequest) => ScriptedTurn {
    let awaited = false;
    return (req: ChatRequest): ScriptedTurn => {
      const last = JSON.stringify(req.messages.at(-1)?.parts ?? []);
      if (last.includes('unknown handle')) {
        return { toolCall: { name: 'finish', args: { result: 'saw unknown handle' } } };
      }
      if (!awaited) {
        awaited = true;
        const handles = [...new Set(handlesIn(req))];
        return { toolCall: { name: 'await_all', args: { handles } } };
      }
      return {
        toolCall: {
          name: 'finish',
          args: {
            result: last.includes('reborn result') ? 'reborn digest delivered' : 'no digest',
          },
        },
      };
    };
  }

  it('a cancelled child reruns on resume and the OLD handle awaits the reborn attempt', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const { priorEntries, truncatedStore, oldHandle } = await crashAfterChild(
      () => ({ text: 'too late', hangMs: 30_000 }),
      (req) => ({
        toolCall: { name: 'cancel_agent', args: { handle: handlesIn(req)[0] } },
      }),
      transcripts,
    );
    // The cancelled terminal survived the crash: the rerun is the
    // unmemoized-redispatch path, not the dangling re-attach path.
    expect(
      priorEntries.some(
        (e) => e.kind === 'agent' && e.scope.startsWith('agent:') && e.status === 'cancelled',
      ),
    ).toBe(true);

    const orchestrate2 = resumingCoordinator();
    const adapter2 = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'reborn result' };
      }
      return orchestrate2(req);
    });
    const phase2 = makeInternals({
      adapters: [adapter2],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      priorEntries,
      store: truncatedStore,
      transcripts,
    });
    const wf = makeOrchestratorWorkflow('rebirth goal', undefined);
    const outcome = await executeWorkflow(phase2.internals, wf, undefined);
    // The restored transcript kept calling the OLD handle; the alias
    // by admission identity routes it to the reborn attempt.
    expect(outcome).toBe('reborn digest delivered');
    // Zero unknown-handle repair turns reached the model.
    for (const call of adapter2.calls) {
      expect(JSON.stringify(call.messages)).not.toContain('unknown handle');
    }
    // The rerun re-paid exactly once (a cancelled child is unmemoized).
    expect(adapter2.calls.filter((r) => agentTypeOf(r) === 'worker')).toHaveLength(1);
    // The old handle maps to the rerun: the new running entry exists
    // beside the old cancelled one, same scope and key, higher seq.
    const finalEntries = await truncatedStore.load('test-run');
    const childRunning = finalEntries.filter(
      (e) => e.kind === 'agent' && e.scope.startsWith('agent:') && e.status === 'running',
    );
    expect(childRunning.map((e) => e.seq)).toContain(oldHandle);
    expect(childRunning.length).toBe(2);
  });

  it('an unmemoized error child reruns on resume under the same alias', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const { priorEntries, truncatedStore } = await crashAfterChild(
      () => ({ error: { code: 'agent', message: 'first attempt dies', retryable: false } }),
      (req) => ({ toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } }),
      transcripts,
    );
    expect(
      priorEntries.some(
        (e) => e.kind === 'agent' && e.scope.startsWith('agent:') && e.status === 'error',
      ),
    ).toBe(true);

    const orchestrate2 = resumingCoordinator();
    const adapter2 = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'reborn result' };
      }
      return orchestrate2(req);
    });
    const phase2 = makeInternals({
      adapters: [adapter2],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      priorEntries,
      store: truncatedStore,
      transcripts,
    });
    const wf = makeOrchestratorWorkflow('rebirth goal', undefined);
    const outcome = await executeWorkflow(phase2.internals, wf, undefined);
    expect(outcome).toBe('reborn digest delivered');
    for (const call of adapter2.calls) {
      expect(JSON.stringify(call.messages)).not.toContain('unknown handle');
    }
  });

  it('the minSpawnedChildren floor is reached and journaled on the restored run, once per child', async () => {
    const transcripts = new InMemoryTranscriptStore();
    const acceptance = {
      acceptance: { childPolicy: 'all-ok' as const, minSpawnedChildren: 1 },
    };
    const { priorEntries, truncatedStore } = await crashAfterChild(
      () => ({ text: 'too late', hangMs: 30_000 }),
      (req) => ({
        toolCall: { name: 'cancel_agent', args: { handle: handlesIn(req)[0] } },
      }),
      transcripts,
      acceptance,
    );
    const orchestrate2 = resumingCoordinator();
    const adapter2 = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'reborn result' };
      }
      return orchestrate2(req);
    });
    const phase2 = makeInternals({
      adapters: [adapter2],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      priorEntries,
      store: truncatedStore,
      transcripts,
    });
    const wf = makeOrchestratorWorkflow('rebirth goal', acceptance);
    const outcome = await executeWorkflow(phase2.internals, wf, undefined);
    expect(JSON.stringify(outcome)).toContain('reborn digest delivered');
    // The acceptance decision is journaled, the floor is met by the
    // reborn attempt, and the aliased handle never double-counts the
    // child in the roster.
    const decisions = (await truncatedStore.load('test-run')).filter(
      (e) =>
        e.kind === 'decision' &&
        (e.value as { decisionType?: string }).decisionType === 'orchestrator_acceptance',
    );
    expect(decisions).toHaveLength(1);
    const value = decisions[0]?.value as {
      verdict?: string;
      spawnedChildren?: number;
      childStatusCounts?: Record<string, number>;
    };
    expect(value.verdict).toBe('accepted');
    expect(value.spawnedChildren).toBe(1);
    expect(value.childStatusCounts).toEqual({ ok: 1 });
  });
});

describe('the post-fan-in double rework (RV808a)', () => {
  // The twelfth comparison run paid 80.157% of wall AFTER fan-in: the
  // coordination draft was repaired only against the weak draft policy,
  // the skipWhenDraftValid pre-pass then judged it by the FULL contract
  // and failed, its verdict was discarded, and synthesis re-derived the
  // whole document and failed the same contract once more itself. These
  // tests pin the two closures: a draft gate that judges by the full
  // contract (so coordination repairs drive the draft to skippable),
  // and the failed pre-pass carried into the synthesis prompt as named
  // gaps instead of silence.
  const SECTIONED = '## Findings\nEverything the contract demands.';
  const SECTIONLESS = 'a schema-valid candidate without the required section';
  const SYNTHESIZED = '## Findings\nThe synthesis rewrite.';
  const DEFAULTS = {
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
    profiles: PROFILES,
  } as const;
  const CONTRACT = () => ({
    validators: [requiredSectionsValidator({ sections: ['## Findings'] })],
    maxRepairs: 3,
  });
  function draftThenSynthesis(draft: string, final: string) {
    let call = 0;
    return scriptedAdapter((): ScriptedTurn => {
      call += 1;
      return call === 1
        ? { toolCall: { name: 'finish', args: { result: draft } } }
        : { toolCall: { name: 'finish', args: { result: final } } };
    });
  }
  const gapsDecisions = (entries: readonly JournalEntry[]): JournalEntry[] =>
    entries.filter(
      (e) =>
        e.kind === 'decision' &&
        (e.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_synthesis_draft_gaps',
    );

  it("draftPolicy 'contract' rejects a draft the full contract rejects, and the repaired draft skips synthesis", async () => {
    const adapter = draftThenSynthesis(SECTIONLESS, SECTIONED);
    const { internals } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      synthesis: { limits: { maxTurns: 3 }, skipWhenDraftValid: true },
      finishValidation: { ...CONTRACT(), draftPolicy: 'contract' },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(SECTIONED);
    // Two COORDINATION turns (the rejected draft exchange and the
    // repaired one); the synthesis invocation never dispatched.
    expect(adapter.calls).toHaveLength(2);
    // The rejection the model saw names the contract validator, so the
    // coordination repair is driven by the same demands the pre-pass
    // will judge by.
    expect(JSON.stringify(adapter.calls[1])).toContain('required-sections');
    await internals.replayer.flush();
    const skips = internals.replayer
      .snapshot()
      .filter(
        (e) =>
          e.kind === 'decision' &&
          (e.value as { decisionType?: string } | undefined)?.decisionType ===
            'orchestrator_synthesis_skip',
      );
    expect(skips).toHaveLength(1);
  });

  it('carryDraftGaps journals the failed pre-pass and feeds the named gaps into the synthesis prompt', async () => {
    const adapter = draftThenSynthesis(SECTIONLESS, SYNTHESIZED);
    const { internals } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      synthesis: { limits: { maxTurns: 3 }, skipWhenDraftValid: true, carryDraftGaps: true },
      finishValidation: CONTRACT(),
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(SYNTHESIZED);
    expect(adapter.calls).toHaveLength(2);
    const synthesisRequest = JSON.stringify(adapter.calls[1]);
    expect(synthesisRequest).toContain('DRAFT CONTRACT GAPS:');
    expect(synthesisRequest).toContain('required-sections');
    expect(synthesisRequest).toContain('repair the named gaps');
    await internals.replayer.flush();
    const gaps = gapsDecisions(internals.replayer.snapshot());
    expect(gaps).toHaveLength(1);
    const value = gaps[0]?.value as {
      failed?: { name: string; reasons: string[] }[];
      draftHash?: string;
      validators?: string[];
    };
    expect(value.failed?.[0]?.name).toBe('required-sections');
    expect(value.failed?.[0]?.reasons.join(' ')).toContain('## Findings');
    expect(value.draftHash).toMatch(/^[0-9a-f]{64}$/);
    expect(value.validators).toEqual(['required-sections']);
  });

  it('without the opt-in the failed pre-pass stays silent: no gaps line, no gaps decision', async () => {
    const adapter = draftThenSynthesis(SECTIONLESS, SYNTHESIZED);
    const { internals } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      synthesis: { limits: { maxTurns: 3 }, skipWhenDraftValid: true },
      finishValidation: CONTRACT(),
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(SYNTHESIZED);
    expect(JSON.stringify(adapter.calls[1])).not.toContain('DRAFT CONTRACT GAPS:');
    await internals.replayer.flush();
    expect(gapsDecisions(internals.replayer.snapshot())).toHaveLength(0);
  });

  it('resume reuses the journaled gaps decision: identical result, zero live calls', async () => {
    const store = new InMemoryStore();
    const options = {
      synthesis: {
        limits: { maxTurns: 3 },
        skipWhenDraftValid: true,
        carryDraftGaps: true,
      },
      finishValidation: CONTRACT(),
    };
    const liveAdapter = draftThenSynthesis(SECTIONLESS, SYNTHESIZED);
    const engineA = createEngine({
      adapters: [liveAdapter],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const first = await engineA.run(makeOrchestratorWorkflow('assess', options), undefined, {
      runId: 'GAPS-RESUME',
    }).result;
    expect(first.status).toBe('ok');
    expect(first.value).toBe(SYNTHESIZED);

    const replayAdapter = draftThenSynthesis(SECTIONLESS, 'NEVER');
    const engineB = createEngine({
      adapters: [replayAdapter],
      stores: { journal: store },
      defaults: DEFAULTS,
    });
    const resumed = await engineB.resume('GAPS-RESUME', makeOrchestratorWorkflow('assess', options))
      .result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe(SYNTHESIZED);
    expect(replayAdapter.calls).toHaveLength(0);
    expect(gapsDecisions(await store.load('GAPS-RESUME'))).toHaveLength(1);
  });

  it('intake refuses carryDraftGaps without skipWhenDraftValid, and the contract draft gate without synthesis', () => {
    expect(() =>
      makeOrchestratorWorkflow('assess', {
        synthesis: { limits: { maxTurns: 3 }, carryDraftGaps: true },
        finishValidation: CONTRACT(),
      }),
    ).toThrow(/carryDraftGaps requires skipWhenDraftValid/);
    expect(() =>
      makeOrchestratorWorkflow('assess', {
        finishValidation: { ...CONTRACT(), draftPolicy: 'contract' },
      }),
    ).toThrow(/draftPolicy requires synthesis/);
  });
});

describe('the sectional repair and the evidence index (RV808b)', () => {
  // The second half of the twelfth run's post-fan-in closure: repair
  // exchanges used to resend the WHOLE document for one violated
  // section (406 s of coordination model work), and synthesis re-read
  // the full evidence pool to satisfy validators it could not see
  // (357 s more). Sectional repair lets a rejected finish resubmit
  // ONLY the repaired sections, spliced by the host into the retained
  // attempt; the evidence index hands synthesis a deterministic
  // per-child citation map on the existing pagination vocabulary.
  const DEFAULTS = {
    routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'fake:model' },
    profiles: PROFILES,
  } as const;
  const SECTIONS = ['## Findings', '## Risks'];
  const FULL_BUT_RISKLESS = ['## Findings', 'finding body'].join('\n');
  const RISKS_BODY = 'risk body';
  const SPLICED = ['## Findings', 'finding body', '## Risks', 'risk body'].join('\n');
  const CONTRACT = () => ({
    validators: [requiredSectionsValidator({ sections: SECTIONS, match: 'line' as const })],
    maxRepairs: 2,
    sectionalRepair: { sections: SECTIONS },
  });
  const validationDecisionsOf = (entries: readonly JournalEntry[]) =>
    entries.filter(
      (e) =>
        e.kind === 'decision' &&
        (e.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_finish_validation',
    );

  it('a rejected finish repairs by resubmitting only the violated section, and the host splices', async () => {
    let call = 0;
    const adapter = scriptedAdapter((): ScriptedTurn => {
      call += 1;
      return call === 1
        ? { toolCall: { name: 'finish', args: { result: FULL_BUT_RISKLESS } } }
        : { toolCall: { name: 'finish', args: { sections: { '## Risks': RISKS_BODY } } } };
    });
    const { internals, store } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', { finishValidation: CONTRACT() });
    const outcome = await executeWorkflow(internals, wf, undefined);
    // The run result is the FULL spliced document, not the patch.
    expect(outcome).toBe(SPLICED);
    expect(adapter.calls).toHaveLength(2);
    // The rejection taught the sectional vocabulary: the declared
    // markers and the splice instruction rode the error feedback.
    const repairReq = JSON.stringify(adapter.calls[1]);
    expect(repairReq).toContain('declaredSections');
    expect(repairReq).toContain('resubmit ONLY the repaired sections');
    // Exactly the two real verdicts journaled: the repair and the
    // acceptance of the SPLICED document.
    const verdicts = validationDecisionsOf(await store.load('test-run')).map(
      (e) => (e.value as { verdict: string }).verdict,
    );
    expect(verdicts).toEqual(['repair', 'accepted']);
  });

  it('sectional mechanics refusals are typed, spend no repair, and journal nothing', async () => {
    let call = 0;
    const adapter = scriptedAdapter((): ScriptedTurn => {
      call += 1;
      if (call === 1) {
        // No rejected attempt is retained yet: refused typed.
        return { toolCall: { name: 'finish', args: { sections: { '## Risks': 'x' } } } };
      }
      if (call === 2) {
        // A real attempt, rejected by the validators (repair 1 of 2).
        return { toolCall: { name: 'finish', args: { result: FULL_BUT_RISKLESS } } };
      }
      if (call === 3) {
        // Both result and sections: refused typed.
        return {
          toolCall: {
            name: 'finish',
            args: { result: 'whole', sections: { '## Risks': 'x' } },
          },
        };
      }
      if (call === 4) {
        // An undeclared marker: refused typed, naming the declared set.
        return { toolCall: { name: 'finish', args: { sections: { '## Nope': 'x' } } } };
      }
      return { toolCall: { name: 'finish', args: { sections: { '## Risks': RISKS_BODY } } } };
    });
    const { internals, store } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      finishValidation: { ...CONTRACT(), maxRepairs: 1 },
      limits: { maxTurns: 8 },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    // The run SURVIVED with maxRepairs 1: three refused exchanges spent
    // no repair; only the rejected full attempt did.
    expect(outcome).toBe(SPLICED);
    const first = JSON.stringify(adapter.calls[1]);
    expect(first).toContain('no rejected attempt is retained');
    const both = JSON.stringify(adapter.calls[3]);
    expect(both).toContain('never both');
    const unknown = JSON.stringify(adapter.calls[4]);
    expect(unknown).toContain('undeclared section');
    expect(unknown).toContain('## Findings');
    const verdicts = validationDecisionsOf(await store.load('test-run')).map(
      (e) => (e.value as { verdict: string }).verdict,
    );
    expect(verdicts).toEqual(['repair', 'accepted']);
  });

  it('the draft gate repairs sectionally too, and the spliced draft skips synthesis (the RV808 composition)', async () => {
    let call = 0;
    const adapter = scriptedAdapter((): ScriptedTurn => {
      call += 1;
      return call === 1
        ? { toolCall: { name: 'finish', args: { result: FULL_BUT_RISKLESS } } }
        : { toolCall: { name: 'finish', args: { sections: { '## Risks': RISKS_BODY } } } };
    });
    const { internals, store } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      synthesis: { limits: { maxTurns: 3 }, skipWhenDraftValid: true },
      finishValidation: { ...CONTRACT(), draftPolicy: 'contract' },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe(SPLICED);
    // Two COORDINATION exchanges, zero synthesis dispatches: the
    // sectional repair drove the draft to contract-valid and the skip
    // retired the whole post-fan-in window.
    expect(adapter.calls).toHaveLength(2);
    const skips = (await store.load('test-run')).filter(
      (e) =>
        e.kind === 'decision' &&
        (e.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_synthesis_skip',
    );
    expect(skips).toHaveLength(1);
  });

  it('the synthesis invocation is seeded with the draft as its retained base', async () => {
    const coordination = scriptedAdapter((): ScriptedTurn => ({
      toolCall: { name: 'finish', args: { result: FULL_BUT_RISKLESS } },
    }));
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({
        toolCall: { name: 'finish', args: { sections: { '## Risks': RISKS_BODY } } },
      }),
      { id: 'strong' },
    );
    const { internals } = makeInternals({
      adapters: [coordination, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('assess', {
      synthesis: { limits: { maxTurns: 3 } },
      finishValidation: CONTRACT(),
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    // The synthesis model patched ONLY the gap section; the host
    // spliced it onto the coordination draft without a resend.
    expect(outcome).toBe(SPLICED);
    expect(synthesis.calls).toHaveLength(1);
    const synthesisReq = JSON.stringify(synthesis.calls[0]);
    expect(synthesisReq).toContain('coordination draft is the retained base');
    // The coordination toolset kept the PLAIN finish schema (no draft
    // gate exists to reject a draft, so sections would be dead
    // vocabulary there); the synthesis toolset carries the sectional
    // one.
    const coordFinish = coordination.calls[0]?.tools?.find((t) => t.name === 'finish');
    expect((coordFinish?.parameters as { required?: string[] } | undefined)?.required).toContain(
      'result',
    );
    const synthFinish = synthesis.calls[0]?.tools?.find((t) => t.name === 'finish');
    const synthParams = synthFinish?.parameters as
      { required?: string[]; properties?: Record<string, unknown> } | undefined;
    expect(synthParams?.required ?? []).not.toContain('result');
    expect(Object.keys(synthParams?.properties ?? {})).toContain('sections');
  });

  it('the evidence index rides the synthesis prompt with pool-eligible citations only', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const agentType = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)
        ?.rulvar?.agentType;
      if (agentType === 'worker') {
        const prompt = req.messages[0]?.parts.find((p) => p.type === 'text') as { text: string };
        if (prompt.text.includes('doomed')) {
          return {
            error: {
              code: 'agent',
              message: 'exploded at src/evil.ts:99',
              retryable: false,
            },
          };
        }
        return { text: 'evidence src/a.ts:1 and src/b.ts:2 and src/a.ts:1 again' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCalls: [
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'gather' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'doomed run' } },
          ],
        };
      }
      if (orchTurn === 2) {
        const handles: number[] = [];
        for (const msg of req.messages) {
          for (const part of msg.parts) {
            if (part.type === 'tool-result') {
              const result = part.result as { handle?: number };
              if (typeof result?.handle === 'number') {
                handles.push(result.handle);
              }
            }
          }
        }
        return { toolCall: { name: 'await_all', args: { handles } } };
      }
      return { toolCall: { name: 'finish', args: { result: 'draft with src/a.ts:1' } } };
    });
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({
        toolCall: { name: 'finish', args: { result: 'final with src/a.ts:1 src/b.ts:2' } },
      }),
      { id: 'strong' },
    );
    const { internals } = makeInternals({
      adapters: [adapter, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    });
    const wf = makeOrchestratorWorkflow('gather evidence', {
      synthesis: { limits: { maxTurns: 3 }, evidenceIndex: true },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('final with src/a.ts:1 src/b.ts:2');
    const prompt = synthesis.calls[0]?.messages
      .flatMap((m) => m.parts)
      .filter((p) => p.type === 'text')
      .map((p) => (p as { text: string }).text)
      .join('\n');
    expect(prompt).toContain('EVIDENCE INDEX:');
    const indexLine = (prompt ?? '').split('\n').find((l) => l.startsWith('EVIDENCE INDEX:'));
    const rows = JSON.parse((indexLine ?? '').slice('EVIDENCE INDEX:'.length)) as {
      nodeId: string;
      status: string;
      citations: string[];
      artifacts: unknown[];
      chars: number;
    }[];
    expect(rows).toHaveLength(2);
    // The ok child's distinct citations in text order; the failed
    // child's text (which CARRIES a citation shaped string) donates
    // nothing, because the validators would reject a citation from
    // outside the evidence pool.
    expect(rows[0]?.citations).toEqual(['src/a.ts:1', 'src/b.ts:2']);
    expect(rows[0]?.status).toBe('ok');
    expect(rows[0]?.chars).toBeGreaterThan(0);
    expect(rows[1]?.status).toBe('error');
    expect(rows[1]?.citations).toEqual([]);
    expect(prompt).toContain('An EVIDENCE INDEX below lists');
  });

  it('stays byte silent without the opt-ins: plain finish schema, no index line, sections schema-rejected', async () => {
    let call = 0;
    const adapter = scriptedAdapter((): ScriptedTurn => {
      call += 1;
      return call === 1
        ? { toolCall: { name: 'finish', args: { sections: { '## Risks': 'x' } } } }
        : { toolCall: { name: 'finish', args: { result: 'plain' } } };
    });
    const { internals, store } = makeInternals({ adapters: [adapter], ...DEFAULTS });
    const wf = makeOrchestratorWorkflow('assess', {
      finishValidation: {
        validators: [requiredSectionsValidator({ sections: ['plain'] })],
      },
    });
    const outcome = await executeWorkflow(internals, wf, undefined);
    expect(outcome).toBe('plain');
    // Without sectionalRepair the finish schema still REQUIRES result:
    // the sections call died at the schema gate, not at a host refusal.
    const finishDef = adapter.calls[0]?.tools?.find((t) => t.name === 'finish');
    expect((finishDef?.parameters as { required?: string[] } | undefined)?.required).toContain(
      'result',
    );
    const feedback = JSON.stringify(adapter.calls[1]);
    expect(feedback).not.toContain('declaredSections');
    // And no validation decision journaled for the schema-dead call.
    expect(validationDecisionsOf(await store.load('test-run'))).toHaveLength(1);
  });

  it('intake refuses malformed sectional and index options typed', () => {
    expect(() =>
      makeOrchestratorWorkflow('assess', {
        finishValidation: {
          validators: [requiredSectionsValidator({ sections: ['x'] })],
          sectionalRepair: { sections: [] },
        },
      }),
    ).toThrow(/sectionalRepair.sections must be a non empty array/);
    expect(() =>
      makeOrchestratorWorkflow('assess', {
        finishValidation: {
          validators: [requiredSectionsValidator({ sections: ['x'] })],
          sectionalRepair: { sections: ['## A', '## A'] },
        },
      }),
    ).toThrow(/repeats/);
    expect(() =>
      makeOrchestratorWorkflow('assess', {
        synthesis: { evidenceIndex: 'yes' as never },
      }),
    ).toThrow(/evidenceIndex/);
    expect(() =>
      makeOrchestratorWorkflow('assess', {
        synthesis: { evidenceIndex: { pattern: 'a*' } },
      }),
    ).toThrow(/must not be able to match the empty string/);
    expect(() =>
      makeOrchestratorWorkflow('assess', {
        synthesis: { mode: 'incremental', evidenceIndex: true },
      }),
    ).toThrow(/incremental/);
  });
});
