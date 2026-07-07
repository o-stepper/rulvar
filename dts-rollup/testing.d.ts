import { a as FAKE_MODEL, c as FakeAdapterOptions, i as createTestEngine, l as FakeCall, n as TestEngine, o as FAKE_MODEL_REF, r as TestRunHandle, s as FakeAdapter, t as CreateTestEngineOptions, u as FakeResponder } from "./test-engine-CGAx93YX.js";
import { AgentProfile, InvocationRole, JournalEntry, JournalStore, ModelSpec, ProviderAdapter, ResumePreview, RunOutcome, Workflow } from "@lurker/core";

//#region src/replay-strict.d.ts
interface ReplayRunOptions {
  /** The journal to replay: raw entries, or a store plus runId. */
  journal: JournalEntry[] | {
    store: JournalStore;
    runId: string;
  };
  /** 'strict' (default): any live call throws JournalMissError. */
  mode?: "strict";
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
declare function replayRun<A, R>(wf: Workflow<A, R>, args: A, options: ReplayRunOptions): Promise<{
  outcome: RunOutcome<unknown>;
  preview: ResumePreview;
}>;
//#endregion
export { type CreateTestEngineOptions, FAKE_MODEL, FAKE_MODEL_REF, FakeAdapter, type FakeAdapterOptions, type FakeCall, type FakeResponder, type ReplayRunOptions, type TestEngine, type TestRunHandle, createTestEngine, replayRun };