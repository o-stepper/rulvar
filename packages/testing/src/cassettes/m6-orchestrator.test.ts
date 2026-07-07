import { readFileSync } from 'node:fs';

import {
  createEngine,
  hashWorkflowBody,
  InMemoryStore,
  InMemoryTranscriptStore,
  makeOrchestratorWorkflow,
  type JournalEntry,
  type Workflow,
} from '@lurker/core';
import { describe, expect, it } from 'vitest';

import { FakeAdapter, FAKE_MODEL_REF, fakeToolCalls, type FakeCall } from '../fake-adapter.js';
import {
  handlesInRequest,
  M6_ORCH_GOAL,
  M6_ORCH_PROFILES,
  M6_ORCH_RUN_ID,
} from './m6-orchestrator.js';

interface M6OrchestratorFixture {
  id: string;
  note: string;
  entries: JournalEntry[];
  extra: { checkpoints: Record<string, string> };
}

function cassette(): M6OrchestratorFixture {
  const url = new URL('../../../../cassettes/orchestrator-crash-resume.json', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as M6OrchestratorFixture;
}

function agentTypeOf(call: FakeCall): string {
  const lurker = (call.req.providerOptions as { lurker?: { agentType?: string } } | undefined)
    ?.lurker;
  return lurker?.agentType ?? '';
}

function admissionCount(entries: readonly JournalEntry[]): number {
  return entries.filter(
    (entry) =>
      entry.kind === 'decision' &&
      (entry.value as { decisionType?: string } | undefined)?.decisionType === 'spawn-admission',
  ).length;
}

describe('orchestrator-crash-resume (M6 gate; docs/09 6.10)', () => {
  it('resumes from the committed crash journal with zero re-paid spawns', async () => {
    const fixture = cassette();
    expect(admissionCount(fixture.entries)).toBe(2);
    const recordedHandles = fixture.entries
      .filter(
        (entry) =>
          entry.kind === 'agent' && entry.scope.startsWith('agent:') && entry.status === 'running',
      )
      .map((entry) => entry.seq);
    expect(recordedHandles).toHaveLength(2);

    // Seed exactly what the dead process left behind: the cut journal
    // plus the durable boundary checkpoints.
    const store = new InMemoryStore();
    for (const entry of fixture.entries) {
      await store.append(M6_ORCH_RUN_ID, entry);
    }
    const wf = makeOrchestratorWorkflow(M6_ORCH_GOAL, {});
    await store.putMeta({
      runId: M6_ORCH_RUN_ID,
      status: 'running',
      updatedAt: '2026-02-01T00:00:00.000Z',
      workflowName: wf.name,
      workflowHash: hashWorkflowBody(wf as unknown as Workflow<unknown, unknown>),
    });
    const transcripts = new InMemoryTranscriptStore();
    for (const [ref, blob] of Object.entries(fixture.extra.checkpoints)) {
      await transcripts.put(ref, new Uint8Array(Buffer.from(blob, 'base64')));
    }

    const adapter = new FakeAdapter({
      agents: {
        '*': (call) => {
          if (agentTypeOf(call) === 'worker') {
            throw new Error('a child was re-paid on resume');
          }
          // The restored transcript already carries the spawn results:
          // the orchestrator continues mid-conversation.
          const handles = handlesInRequest(call.req);
          const sawDigests = JSON.stringify(call.req.messages.at(-1)?.parts ?? []).includes(
            'paid:',
          );
          if (!sawDigests) {
            return fakeToolCalls({ name: 'await_all', args: { handles } });
          }
          return fakeToolCalls({ name: 'finish', args: { result: { recovered: handles } } });
        },
      },
    });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store, transcripts },
      defaults: {
        routing: { loop: FAKE_MODEL_REF, orchestrate: FAKE_MODEL_REF },
        profiles: M6_ORCH_PROFILES,
      },
    });
    const outcome = await engine.resume(M6_ORCH_RUN_ID, wf as never).result;
    expect(outcome.status).toBe('ok');
    const value = outcome.value as { recovered: number[] };
    // Handles are journal-derived and stable across the resume.
    expect([...value.recovered].sort()).toEqual([...recordedHandles].sort());

    // Zero re-paid spawns, no duplicate spawn decisions.
    expect(adapter.calls.filter((call) => agentTypeOf(call) === 'worker')).toHaveLength(0);
    const finalEntries = await store.load(M6_ORCH_RUN_ID);
    expect(admissionCount(finalEntries)).toBe(2);
    expect(
      finalEntries.filter(
        (entry) =>
          entry.kind === 'agent' && entry.scope.startsWith('agent:') && entry.status === 'running',
      ),
    ).toHaveLength(2);
    // The restored history reached the model: the first resumed request
    // already carried the spawn tool results with the handles.
    const firstOrchestratorCall = adapter.calls.find((call) => agentTypeOf(call) === '');
    expect(handlesInRequest(firstOrchestratorCall?.req as never).sort()).toEqual(
      [...recordedHandles].sort(),
    );
  });
});
