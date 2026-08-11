/**
 * The resume config identity (RV3203, the 2026-08-11 four-agent
 * experiment's resume blocker): `profileRegistrySnapshotHash` froze at
 * init and was never recomputed on resume, so a swapped profile
 * registry proceeded to live calls with no drift event. The resume now
 * recomputes the hash: mismatch refuses typed by default (ladders are
 * live values the journal cannot rebuild, so "the journal wins" is not
 * honorable for them), `profileDrift: 'warn'` downgrades to the
 * `termination:config-drift` event, and the frozen dollar vector rides
 * the same report.
 */
import { describe, expect, it } from 'vitest';
import {
  InMemoryStore,
  makeOrchestratorWorkflow,
  type ChatRequest,
  type JournalEntry,
} from '@rulvar/core';

import {
  BUDGET,
  cassetteAdapter,
  agentTypeOfRequest,
  engineWith,
  EMPTY_PLAN_HASH,
  settled,
  type CassetteTurn,
} from './cassettes.js';
import { orchestratePlanned, planRunner } from './plan-runner.js';

/** Prefix-clones a run into a fresh store: the crash simulation. */
async function cloneUpTo(
  source: InMemoryStore,
  runId: string,
  lastSeq: number,
): Promise<InMemoryStore> {
  const crashStore = new InMemoryStore();
  for (const meta of await source.listRuns()) {
    if (meta.runId === runId) {
      await crashStore.putMeta(meta);
    }
  }
  for (const entry of await source.load(runId)) {
    if (entry.seq <= lastSeq) {
      await crashStore.append(runId, entry);
    }
  }
  return crashStore;
}

function script(phaseRef: { n: number }) {
  return (req: ChatRequest): CassetteTurn => {
    if (agentTypeOfRequest(req) === 'worker') {
      return { text: 'worker done' };
    }
    phaseRef.n += 1;
    if (phaseRef.n === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'drift task' } }],
            rationale: 'one task',
          },
        },
      };
    }
    if (phaseRef.n === 2) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'closed' } } };
  };
}

/** Life 1 under {worker}, killed after the first plan revision landed. */
async function crashedLifeOne(): Promise<{ store: InMemoryStore; runId: string }> {
  const phase = { n: 0 };
  const store = new InMemoryStore();
  const engine = engineWith(cassetteAdapter(script(phase)), store, {
    worker: { description: 'w' },
  });
  const handle = orchestratePlanned(engine, 'profile drift', {
    budget: BUDGET,
    plan: { maxRevisionsPerRun: 4 },
  });
  await settled(handle);
  const full = await store.load(handle.runId);
  const revision = full.find((entry: JournalEntry) => entry.kind === 'plan.revision');
  if (revision === undefined) {
    throw new Error('life 1 needs a revision');
  }
  return { store: await cloneUpTo(store, handle.runId, revision.seq), runId: handle.runId };
}

describe('resume profile registry identity (RV3203)', () => {
  it('a drifted registry refuses the resume typed before any model call', async () => {
    const { store, runId } = await crashedLifeOne();
    const phase = { n: 0 };
    const adapter = cassetteAdapter(script(phase));
    // The SWAPPED registry: an extra profile changes the frozen
    // names-to-ladder-lengths projection.
    const engine = engineWith(adapter, store, {
      worker: { description: 'w' },
      extra: { description: 'smuggled in between segments' },
    });
    const drift: Array<{ field: string }> = [];
    const resumed = engine.resume(
      runId,
      makeOrchestratorWorkflow('profile drift', {
        budget: BUDGET,
        extension: planRunner({ maxRevisionsPerRun: 4 }),
      }),
    );
    resumed.on('termination:config-drift', (event) => {
      drift.push(event);
    });
    const outcome = await resumed.result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('profile registry drifted');
    expect(drift.some((event) => event.field === 'profileRegistrySnapshotHash')).toBe(true);
    // Refused BEFORE any model call: the resumed segment paid nothing.
    expect(adapter.calls).toHaveLength(0);
  });

  it("profileDrift: 'warn' keeps the event and proceeds under the live registry", async () => {
    const { store, runId } = await crashedLifeOne();
    const phase = { n: 0 };
    const adapter = cassetteAdapter(script(phase));
    const engine = engineWith(adapter, store, {
      worker: { description: 'w' },
      extra: { description: 'smuggled in between segments' },
    });
    const drift: Array<{ field: string }> = [];
    const resumed = engine.resume(
      runId,
      makeOrchestratorWorkflow('profile drift', {
        budget: BUDGET,
        extension: planRunner({ maxRevisionsPerRun: 4, profileDrift: 'warn' }),
      }),
    );
    resumed.on('termination:config-drift', (event) => {
      drift.push(event);
    });
    const outcome = await resumed.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('closed');
    expect(drift.some((event) => event.field === 'profileRegistrySnapshotHash')).toBe(true);
  });

  it('an identical registry resumes with no drift event and no refusal', async () => {
    const { store, runId } = await crashedLifeOne();
    const phase = { n: 0 };
    const adapter = cassetteAdapter(script(phase));
    const engine = engineWith(adapter, store, { worker: { description: 'w' } });
    const drift: Array<{ field: string }> = [];
    const resumed = engine.resume(
      runId,
      makeOrchestratorWorkflow('profile drift', {
        budget: BUDGET,
        extension: planRunner({ maxRevisionsPerRun: 4 }),
      }),
    );
    resumed.on('termination:config-drift', (event) => {
      drift.push(event);
    });
    const outcome = await resumed.result;
    expect(outcome.status).toBe('ok');
    expect(drift).toHaveLength(0);
  });

  it('rejects an unknown profileDrift value at intake', () => {
    expect(() => planRunner({ profileDrift: 'sometimes' as never })).toThrow(
      "profileDrift must be 'refuse' or 'warn'",
    );
  });
});
