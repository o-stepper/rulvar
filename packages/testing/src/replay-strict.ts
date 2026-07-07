/**
 * Tier 3: replay-strict journal runs (M2-T10). Executes a workflow
 * against an existing journal and throws JournalMissError on ANY live
 * call: zero live calls or loud failure. Any production journal becomes a
 * deterministic integration test; a journal with open suspensions
 * completes with outcome 'suspended' and zero live calls (docs/09,
 * section "Tier 3: replay-strict journal runs").
 */
import {
  createEngine,
  hashWorkflowBody,
  InMemoryStore,
  JournalMissError,
  type AgentProfile,
  type InvocationRole,
  type JournalEntry,
  type JournalStore,
  type ModelSpec,
  type ProviderAdapter,
  type ResumePreview,
  type RunOutcome,
  type Workflow,
} from '@lurker/core';
import { FakeAdapter, FAKE_MODEL_REF } from './fake-adapter.js';

export interface ReplayRunOptions {
  /** The journal to replay: raw entries, or a store plus runId. */
  journal: JournalEntry[] | { store: JournalStore; runId: string };
  /** 'strict' (default): any live call throws JournalMissError. */
  mode?: 'strict';
  /**
   * Identity depends on the resolved model spec, so replays must resolve
   * through the SAME routing as the recording run. Defaults to the
   * createTestEngine fake routing; override for journals recorded against
   * other adapters.
   */
  adapters?: ProviderAdapter[];
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  profiles?: Record<string, AgentProfile>;
}

const FAKE_ROUTING: Partial<Record<InvocationRole, ModelSpec>> = {
  loop: FAKE_MODEL_REF,
  extract: FAKE_MODEL_REF,
  orchestrate: FAKE_MODEL_REF,
  plan: FAKE_MODEL_REF,
  finalize: FAKE_MODEL_REF,
  summarize: FAKE_MODEL_REF,
};

export async function replayRun<A, R>(
  wf: Workflow<A, R>,
  args: A,
  options: ReplayRunOptions,
): Promise<{ outcome: RunOutcome<unknown>; preview: ResumePreview }> {
  let store: JournalStore;
  let runId: string;
  if (Array.isArray(options.journal)) {
    runId = options.journal[0] !== undefined ? 'replay-run' : 'replay-empty';
    const memory = new InMemoryStore();
    for (const entry of options.journal) {
      await memory.append(runId, entry);
    }
    await memory.putMeta({
      runId,
      status: 'suspended',
      updatedAt: new Date(0).toISOString(),
      workflowName: wf.name,
      workflowHash: hashWorkflowBody(wf as unknown as Workflow<unknown, unknown>),
    });
    store = memory;
  } else {
    store = options.journal.store;
    runId = options.journal.runId;
  }

  const engine = createEngine({
    adapters: options.adapters ?? [new FakeAdapter({ agents: {} })],
    stores: { journal: store },
    defaults: {
      routing: options.routing ?? FAKE_ROUTING,
      ...(options.profiles === undefined ? {} : { profiles: options.profiles }),
    },
  });
  const handle = engine.resume(runId, wf, { args, dryRun: true });
  const outcome = await handle.result;
  if (outcome.error?.code === 'journal_miss') {
    throw new JournalMissError(outcome.error.message, { data: outcome.error.data ?? null });
  }
  const preview = await handle.preview;
  return { outcome, preview };
}
