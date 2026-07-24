/**
 * createTestEngine (M1-T14): a full engine over FakeAdapter with zero
 * network. Orchestration logic is exercised, not mocked around: journal,
 * scheduler, budget layers, and event stream are all real. Returned
 * handles record their event stream so the
 * matchers can assert over settled runs.
 */
import {
  createEngine,
  InMemoryStore,
  type AgentProfile,
  type CreateEngineOptions,
  type Engine,
  type RunHandle,
  type RunOptions,
  type Workflow,
  type WorkflowEvent,
} from '@rulvar/core';
import { FakeAdapter, FAKE_MODEL_REF, type FakeResponder } from './fake-adapter.js';

/** A RunHandle that records its own event stream for the matchers. */
export interface TestRunHandle<R> extends RunHandle<R> {
  /** Every event emitted by the run, in seq order. */
  eventsSeen: WorkflowEvent[];
}

export interface TestEngine extends Engine {
  run<A, R>(wf: Workflow<A, R>, args: A, opts?: RunOptions): TestRunHandle<R>;
  /** The adapter instance, for call-level assertions. */
  fake: FakeAdapter;
  /** The backing journal store (journal capture for replay-strict tests). */
  store: InMemoryStore;
}

export interface CreateTestEngineOptions {
  agents: Record<string, FakeResponder>;
  /** Additional profiles; every agents key is auto-registered as an empty profile. */
  profiles?: Record<string, AgentProfile>;
  budgetDefaults?: CreateEngineOptions['budgetDefaults'];
  concurrency?: CreateEngineOptions['concurrency'];
  /** The shared quota limiter config, as in production (RV-215). */
  quota?: CreateEngineOptions['quota'];
  /** Versioned price table; wins over adapter caps.pricing, as in production. */
  pricing?: CreateEngineOptions['pricing'];
}

export function createTestEngine(options: CreateTestEngineOptions): TestEngine {
  const fake = new FakeAdapter({ agents: options.agents });
  // The in-memory store is the deliberate choice of this tier, so the
  // durability warning would only be noise here.
  const store = new InMemoryStore({ quiet: true });
  // Pattern keys double as agentTypes; register them as profiles so
  // ctx.agent({ agentType }) resolves without extra ceremony.
  const profiles: Record<string, AgentProfile> = { ...options.profiles };
  for (const key of Object.keys(options.agents)) {
    if (key !== '*' && profiles[key] === undefined) {
      profiles[key] = {};
    }
  }
  const engine = createEngine({
    adapters: [fake],
    stores: { journal: store },
    defaults: {
      // finalize is deliberately NOT routed: its routing key is the
      // firing opt-in (M4-T01), and the test
      // engine must not summon a synthesis call for every tool-bearing
      // agent. Tests that want finalize route it per call or profile.
      // The other keys only pick models and never summon invocations.
      routing: {
        loop: FAKE_MODEL_REF,
        extract: FAKE_MODEL_REF,
        orchestrate: FAKE_MODEL_REF,
        plan: FAKE_MODEL_REF,
        summarize: FAKE_MODEL_REF,
        // Like the other keys, model-picking only: the synthesize
        // invocation fires only via OrchestrateOptions.synthesis.
        synthesize: FAKE_MODEL_REF,
      },
      profiles,
    },
    ...(options.budgetDefaults === undefined ? {} : { budgetDefaults: options.budgetDefaults }),
    ...(options.concurrency === undefined ? {} : { concurrency: options.concurrency }),
    ...(options.quota === undefined ? {} : { quota: options.quota }),
    ...(options.pricing === undefined ? {} : { pricing: options.pricing }),
  });

  return {
    fake,
    store,
    stores: engine.stores,
    resume: (runId, wf, options) => engine.resume(runId, wf, options),
    deleteRun: (runId) => engine.deleteRun(runId),
    pruneRun: (runId) => engine.pruneRun(runId),
    exportRun: (runId) => engine.exportRun(runId),
    importRun: (bundle) => engine.importRun(bundle),
    profileCard: (names) => engine.profileCard(names),
    run<A, R>(wf: Workflow<A, R>, args: A, opts?: RunOptions): TestRunHandle<R> {
      const handle = engine.run(wf, args, opts);
      const eventsSeen: WorkflowEvent[] = [];
      // Record every event type through the callback surface; the
      // wildcard is emulated by iterating the stream.
      void (async () => {
        for await (const event of handle.events) {
          eventsSeen.push(event);
        }
      })().catch(() => undefined);
      return { ...handle, eventsSeen };
    },
  };
}
