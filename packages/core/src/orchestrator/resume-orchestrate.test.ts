/**
 * Mode (c) resume after a budget-cancelled root (the v1.6.0 follow-up
 * review's live shape): checkpoint lineage restores the orchestrator
 * transcript, journaled spawn decisions recover across attempts,
 * settled children replay by content key without re-payment, the
 * dangling child alone reruns, and handles stay stable.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import type { JournalEntry } from '../l0/entries.js';
import { FileTranscriptStore, JsonlFileStore } from '../stores/jsonl.js';
import { createEngine, type EngineDefaults } from '../engine/engine.js';
import { scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { makeOrchestratorWorkflow, ORCHESTRATE_WORKFLOW_NAME } from './orchestrate.js';

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

function handlesIn(req: ChatRequest): number[] {
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
  return handles;
}

function spawnDecisions(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.filter(
    (entry) =>
      entry.kind === 'decision' &&
      (entry.value as { decisionType?: string } | undefined)?.decisionType === 'spawn-admission',
  );
}

describe('dynamic orchestrator resume after a budget-cancelled root', () => {
  it('restores the checkpoint lineage and never re-pays completed children', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-orch-resume-'));
    const store = new JsonlFileStore({ dir });
    // Durable transcripts, like production: the boundary checkpoint of
    // the cancelled root must survive into the resuming process.
    const transcripts = new FileTranscriptStore({ dir: join(dir, 'transcripts') });
    let hang = true;
    const makeAdapter = () =>
      scriptedAdapter((req): ScriptedTurn => {
        if (agentTypeOf(req) === 'worker') {
          const prompt = JSON.stringify(req.messages[0]?.parts);
          const part = prompt.includes('w1') ? 'w1' : prompt.includes('w2') ? 'w2' : 'w3';
          return {
            text: `did: ${part}`,
            usage: { inputTokens: 100_000, outputTokens: 0 },
            // w3 outlives the first attempt: it is the dangling child.
            ...(part === 'w3' && hang ? { hangMs: 5_000 } : {}),
          };
        }
        const transcript = JSON.stringify(req.messages);
        if (!transcript.includes('"handle"')) {
          // Turn 1: decompose into three workers; cheap.
          return {
            toolCalls: [
              { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'w1' } },
              { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'w2' } },
              { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'w3' } },
            ],
            usage: { inputTokens: 50_000, outputTokens: 0 },
          };
        }
        if (!transcript.includes('did:')) {
          // Turn 2: await. On the FIRST attempt this turn's own usage
          // crosses the 0.4 USD orchestrator cap mid-stream (the hang
          // gives layer 3 time to sever deterministically): the root
          // cancels while the wait is active, exactly the review's live
          // shape. The regenerated turn after resume is cheap.
          return hang
            ? {
                toolCall: { name: 'await_all', args: { handles: handlesIn(req) } },
                usage: { inputTokens: 500_000, outputTokens: 0 },
                hangMs: 120,
              }
            : {
                toolCall: { name: 'await_all', args: { handles: handlesIn(req) } },
                usage: { inputTokens: 10_000, outputTokens: 0 },
              };
        }
        return {
          toolCall: { name: 'finish', args: { result: 'assembled' } },
          usage: { inputTokens: 10_000, outputTokens: 0 },
        };
      });
    const defaults: EngineDefaults = {
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: { worker: { description: 'does one task' } },
    };

    const adapterA = makeAdapter();
    const engineA = createEngine({
      adapters: [adapterA],
      stores: { journal: store, transcripts },
      defaults,
    });
    const first = await engineA.run(makeOrchestratorWorkflow('assemble the parts', {}), undefined, {
      runId: 'ORCHR',
      budgetUsd: 2,
    }).result;
    expect(first.status).toBe('exhausted');
    // The crossing names the orchestrator cap, never the healthy root.
    expect(first.error?.message).toContain('orchestrator budget cap reached');
    const afterFirst = await store.load('ORCHR');
    expect(spawnDecisions(afterFirst)).toHaveLength(3);
    // The published journal shape: a cancelled root carrying its last
    // turn-boundary checkpoint, plus two completed child terminals.
    const cancelledRoot = afterFirst.find(
      (entry) => entry.kind === 'agent' && entry.scope === '' && entry.status === 'cancelled',
    );
    expect(cancelledRoot?.checkpointRef).toBeDefined();
    const childTerminals = afterFirst.filter(
      (entry) => entry.kind === 'agent' && entry.scope !== '' && entry.status === 'ok',
    );
    expect(childTerminals).toHaveLength(2);

    hang = false;
    const adapterB = makeAdapter();
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal: store, transcripts },
      defaults,
    });
    const resumed = await engineB.resume(
      'ORCHR',
      makeOrchestratorWorkflow('assemble the parts', {}),
    ).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toBe('assembled');

    // Completed children replayed: only the dangling w3 ran live.
    const workerCalls = adapterB.calls.filter((req) => agentTypeOf(req) === 'worker');
    expect(workerCalls).toHaveLength(1);
    expect(JSON.stringify(workerCalls[0]?.messages)).toContain('w3');
    // The transcript continued from the checkpoint: no re-decomposition
    // turn, exactly the regenerated await turn and the finish turn.
    const orchCalls = adapterB.calls.filter((req) => agentTypeOf(req) === '');
    expect(orchCalls).toHaveLength(2);
    // No spawn decision was regenerated across the resume.
    const afterResume = await store.load('ORCHR');
    expect(spawnDecisions(afterResume)).toHaveLength(3);
    // Stable handles: the digest the finish turn saw carries all three
    // children, the replayed pair and the rerun dangling one.
    const digest = JSON.stringify(orchCalls.at(-1)?.messages);
    expect(digest).toContain('did: w1');
    expect(digest).toContain('did: w2');
    expect(digest).toContain('did: w3');
  });

  it('the documented resume forms both replay a finished dynamic run', async () => {
    // The executable form of the mode (c) resume table row: the
    // workflow value rebuilt from the ORIGINAL inputs, and the
    // defaults.workflows registration that makes bare resume work.
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-orch-forms-'));
    const store = new JsonlFileStore({ dir });
    const transcripts = new FileTranscriptStore({ dir: join(dir, 'transcripts') });
    const makeAdapter = () =>
      scriptedAdapter((): ScriptedTurn => ({
        toolCall: { name: 'finish', args: { result: 'done' } },
      }));
    const defaults: EngineDefaults = {
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: { worker: { description: 'does one task' } },
    };
    const first = await createEngine({
      adapters: [makeAdapter()],
      stores: { journal: store, transcripts },
      defaults,
    }).run(makeOrchestratorWorkflow('finish fast', {}), undefined, { runId: 'FORMS' }).result;
    expect(first.status).toBe('ok');

    // Form 1: the workflow value.
    const adapterB = makeAdapter();
    const viaValue = await createEngine({
      adapters: [adapterB],
      stores: { journal: store, transcripts },
      defaults,
    }).resume('FORMS', makeOrchestratorWorkflow('finish fast', {})).result;
    expect(viaValue.status).toBe('ok');
    expect(viaValue.value).toBe('done');
    expect(adapterB.calls).toHaveLength(0);

    // Form 2: registration under defaults.workflows, then bare resume.
    const adapterC = makeAdapter();
    const viaRegistry = await createEngine({
      adapters: [adapterC],
      stores: { journal: store, transcripts },
      defaults: {
        ...defaults,
        workflows: {
          [ORCHESTRATE_WORKFLOW_NAME]: makeOrchestratorWorkflow('finish fast', {}),
        },
      },
    }).resume('FORMS').result;
    expect(viaRegistry.status).toBe('ok');
    expect(viaRegistry.value).toBe('done');
    expect(adapterC.calls).toHaveLength(0);
  });
});
