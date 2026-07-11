import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import type { JournalEntry } from '../l0/entries.js';
import type { KnowledgeSnapshot, ModelClaim, ModelKnowledgeHandle } from '../l0/spi/knowledge.js';
import { knowledgeHash } from '../knowledge/file-store.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { executeWorkflow, type AgentProfile } from '../engine/ctx.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

function editorialClaim(id: string, extra?: Partial<ModelClaim>): ModelClaim {
  return {
    id,
    subject: { model: 'fake:model' },
    taskClass: 'code-edit',
    polarity: 'strength',
    statement: 'lands small diffs cleanly',
    class: 'human-editorial',
    status: 'active',
    evidence: [{ kind: 'journal', runId: 'seed', entryRef: 3 }],
    confidence: 'high',
    observedAt: '2026-07-01',
    expiresAt: '9999-01-01',
    author: { kind: 'human', id: 'founder' },
    ...extra,
  };
}

/** A counting stub handle; snapshots indexed by call ordinal (last repeats). */
function stubHandle(snapshots: KnowledgeSnapshot[]): ModelKnowledgeHandle & { calls: number } {
  const stub = {
    calls: 0,
    current(): Promise<KnowledgeSnapshot> {
      const snapshot = snapshots[Math.min(stub.calls, snapshots.length - 1)];
      stub.calls += 1;
      if (snapshot === undefined) {
        throw new Error('stubHandle requires at least one snapshot');
      }
      return Promise.resolve(snapshot);
    },
  };
  return stub;
}

function snapshotOf(version: number, claims: ModelClaim[]): KnowledgeSnapshot {
  return { version, hash: knowledgeHash(claims), claims };
}

/** worker profile declaring a one-rung ladder so the claim is reachable. */
const PROFILES: Record<string, AgentProfile> = {
  worker: {
    description: 'does one task',
    model: {
      ladder: {
        rungs: [{ model: 'fake:model', maxTurns: 8, maxTokens: 4096 }],
        startTier: 0,
        escalateOn: ['error' as const],
      },
    },
  },
};

function orchestratorScript(): (req: ChatRequest) => ScriptedTurn {
  let orchTurn = 0;
  return (req: ChatRequest): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      return { text: 'worker done' };
    }
    orchTurn += 1;
    if (orchTurn === 1) {
      return { toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'go' } } };
    }
    if (orchTurn === 2) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'done' } } };
  };
}

function kbEntries(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.filter((entry) => {
    const decisionType = (entry.value as { decisionType?: string } | undefined)?.decisionType;
    return decisionType === 'kb_pinned' || decisionType === 'kb_repinned';
  });
}

describe('kb_pinned and kb_repinned (M10-T03; docs/05, sections 4.1 and 4.2)', () => {
  it('pins at admission, repins on the wake, and shows the card to the orchestrator', async () => {
    const handle = stubHandle([snapshotOf(3, [editorialClaim('c1')])]);
    const adapter = scriptedAdapter(orchestratorScript());
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      knowledge: handle,
    });
    const outcome = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('kb pin', {}),
      undefined,
    );
    expect(outcome).toBe('done');

    const entries = await store.load('test-run');
    const pins = kbEntries(entries);
    expect(pins).toHaveLength(2);
    const [pin, repin] = pins as [JournalEntry, JournalEntry];
    expect((pin.value as { decisionType?: string }).decisionType).toBe('kb_pinned');
    expect((repin.value as { decisionType?: string }).decisionType).toBe('kb_repinned');
    const pinValue = pin.value as { version: number; hash: string; cardText: string };
    expect(pinValue.version).toBe(3);
    expect(pinValue.hash).toBe(knowledgeHash([editorialClaim('c1')]));
    expect(pinValue.cardText).toContain('lands small diffs cleanly');
    expect(pinValue.cardText).toContain('[worker tier 0] code-edit strength');
    expect(pinValue.cardText).not.toContain('fake:');
    // The pin precedes the first orchestrator agent entry.
    const firstAgent = entries.find((entry) => entry.kind === 'agent');
    expect(firstAgent).toBeDefined();
    expect(pin.seq).toBeLessThan((firstAgent as JournalEntry).seq);
    // The card docks with the profileCard vocabulary: the spawn tool
    // description carries it.
    const firstOrchReq = adapter.calls.find((req) => agentTypeOf(req) === '');
    const spawnTool = firstOrchReq?.tools?.find((tool) => tool.name === 'spawn_agent');
    expect(spawnTool?.description).toContain('Model knowledge card');
    expect(spawnTool?.description).toContain('lands small diffs cleanly');
  });

  it('repins under fresh filters: a claim the store dropped stops steering', async () => {
    const before = snapshotOf(3, [editorialClaim('c1')]);
    const after = snapshotOf(4, [{ ...editorialClaim('c1'), status: 'archived' as const }]);
    const handle = stubHandle([before, after]);
    const adapter = scriptedAdapter(orchestratorScript());
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      knowledge: handle,
    });
    await executeWorkflow(internals, makeOrchestratorWorkflow('kb repin', {}), undefined);
    const pins = kbEntries(await store.load('test-run'));
    const pinText = (pins[0]?.value as { cardText: string }).cardText;
    const repinValue = pins[1]?.value as { version: number; cardText: string };
    expect(pinText).toContain('lands small diffs cleanly');
    expect(repinValue.version).toBe(4);
    expect(repinValue.cardText).not.toContain('lands small diffs cleanly');
    expect(handle.calls).toBe(2);
  });

  it('resume and replay read the pinned bytes and never touch the live store', async () => {
    const original = stubHandle([snapshotOf(3, [editorialClaim('c1')])]);
    const adapter = scriptedAdapter(orchestratorScript());
    const first = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      knowledge: original,
    });
    await executeWorkflow(first.internals, makeOrchestratorWorkflow('kb replay', {}), undefined);
    const recorded = await first.store.load('test-run');

    // The store has since CHANGED: replay must not see the new claims.
    const changed = stubHandle([
      snapshotOf(9, [editorialClaim('c9', { statement: 'A LATER CLAIM, never pinned' })]),
    ]);
    const replayAdapter = scriptedAdapter(orchestratorScript());
    const second = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
      knowledge: changed,
      priorEntries: recorded,
    });
    const outcome = await executeWorkflow(
      second.internals,
      makeOrchestratorWorkflow('kb replay', {}),
      undefined,
    );
    expect(outcome).toBe('done');
    expect(changed.calls).toBe(0);
    // priorEntries seed the replayer; the pins live in its snapshot.
    const pins = kbEntries(second.internals.replayer.snapshot());
    expect(pins).toHaveLength(2);
    expect((pins[0]?.value as { cardText: string }).cardText).toContain(
      'lands small diffs cleanly',
    );
    // Zero live model calls on full replay.
    expect(replayAdapter.calls).toHaveLength(0);
  });

  it('writes no kb entries at all without a configured store', async () => {
    const adapter = scriptedAdapter(orchestratorScript());
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: PROFILES,
    });
    await executeWorkflow(internals, makeOrchestratorWorkflow('kb off', {}), undefined);
    const entries = await store.load('test-run');
    expect(kbEntries(entries)).toHaveLength(0);
    const firstOrchReq = adapter.calls.find((req) => agentTypeOf(req) === '');
    const spawnTool = firstOrchReq?.tools?.find((tool) => tool.name === 'spawn_agent');
    expect(spawnTool?.description).not.toContain('Model knowledge card');
  });
});
