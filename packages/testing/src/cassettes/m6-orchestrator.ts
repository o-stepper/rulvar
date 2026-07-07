/**
 * The orchestrator-crash-resume gating cassette (M6-T11; docs/09,
 * section 6.10): a crashed orchestrate() restores its history from the
 * turn checkpoint and finds child results by content keys, with zero
 * re-paid spawns and no duplicate spawn decisions.
 *
 * The recorder runs phase 1 live on the FakeAdapter (two spawned
 * children settle, then the orchestrator's next turn dies on a
 * non-retryable wire error) and CUTS the orchestrator terminal from the
 * journal: exactly the bytes a dead process leaves behind. The replay
 * test resumes from the committed entries.
 */
import type { ChatRequest, JournalEntry } from '@lurker/core';
import { createEngine, InMemoryStore, InMemoryTranscriptStore, makeOrchestratorWorkflow } from '@lurker/core';

import { FakeAdapter, FAKE_MODEL_REF, fakeToolCalls, fakeWireError, type FakeCall } from '../fake-adapter.js';

export const M6_ORCH_RUN_ID = 'm6-orchestrator-crash';
export const M6_ORCH_GOAL = 'm6 cassette: gather two facts';

export const M6_ORCH_PROFILES = { worker: { description: 'does one task' } };

function agentTypeOf(call: FakeCall): string {
  const lurker = (call.req.providerOptions as { lurker?: { agentType?: string } } | undefined)
    ?.lurker;
  return lurker?.agentType ?? '';
}

/** Extracts spawn handles from the tool results the model saw. */
export function handlesInRequest(req: ChatRequest): number[] {
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

/** Fixes wall clock and spans; everything else is deterministic already. */
export function normalizeM6Entries(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.map((entry) => ({
    ...entry,
    spanId: 'fixture-span',
    startedAt: '2026-02-01T00:00:00.000Z',
    ...(entry.endedAt === undefined ? {} : { endedAt: '2026-02-01T00:00:00.000Z' }),
  }));
}

/**
 * Phase 1: record the pre-crash journal. The transcripts store carries
 * the boundary checkpoint the resume restores from; the recorder keeps
 * it in memory because the cassette pins only journal bytes (checkpoint
 * blobs are engine-internal at-least-once state, docs/03 section 11).
 */
export async function recordOrchestratorCrash(): Promise<{
  entries: JournalEntry[];
  /** Boundary checkpoint blobs by ref, base64: the resume restores from them. */
  checkpoints: Record<string, string>;
}> {
  let orchestratorTurn = 0;
  const adapter = new FakeAdapter({
    agents: {
      '*': (call) => {
        if (agentTypeOf(call) === 'worker') {
          return `paid: ${call.prompt}`;
        }
        orchestratorTurn += 1;
        if (orchestratorTurn === 1) {
          return fakeToolCalls(
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'expensive A' } },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'expensive B' } },
          );
        }
        return fakeWireError({ code: 'agent', message: 'simulated crash', retryable: false });
      },
    },
  });
  const store = new InMemoryStore();
  const transcripts = new InMemoryTranscriptStore();
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: store, transcripts },
    defaults: {
      routing: { loop: FAKE_MODEL_REF, orchestrate: FAKE_MODEL_REF },
      profiles: M6_ORCH_PROFILES,
    },
  });
  const wf = makeOrchestratorWorkflow(M6_ORCH_GOAL, {});
  const outcome = await engine
    .run(wf as never, undefined, { runId: M6_ORCH_RUN_ID })
    .result.then((settled) => settled);
  if (outcome.status !== 'error') {
    throw new Error(`the recorder expected a crashed run, got '${outcome.status}'`);
  }
  const entries = await store.load(M6_ORCH_RUN_ID);
  const orchestratorTerminal = entries.find(
    (entry) =>
      entry.kind === 'agent' &&
      !entry.scope.startsWith('agent:') &&
      entry.status !== 'running' &&
      entry.status !== 'suspended',
  );
  if (orchestratorTerminal === undefined) {
    throw new Error('the recorder found no orchestrator terminal to cut');
  }
  // The crash cut: everything strictly before the orchestrator terminal.
  const cut = entries.filter((entry) => entry.seq < orchestratorTerminal.seq);
  const checkpoints: Record<string, string> = {};
  for (const ref of await transcripts.list(M6_ORCH_RUN_ID)) {
    if (!ref.includes('/ckpt/')) {
      continue;
    }
    const blob = await transcripts.get(ref);
    if (blob !== null) {
      checkpoints[ref] = Buffer.from(blob).toString('base64');
    }
  }
  return { entries: normalizeM6Entries(cut), checkpoints };
}
