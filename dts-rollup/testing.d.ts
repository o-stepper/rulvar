import { a as FAKE_MODEL, c as FakeAdapterOptions, d as FakeToolCallsValue, f as FakeWireErrorValue, i as createTestEngine, l as FakeCall, m as fakeWireError, n as TestEngine, o as FAKE_MODEL_REF, p as fakeToolCalls, r as TestRunHandle, s as FakeAdapter, t as CreateTestEngineOptions, u as FakeResponder } from "./test-engine-CPLAIzLl.js";
import { AgentProfile, InvocationRole, JournalEntry, JournalStore, ModelSpec, ProviderAdapter, ResumePreview, RunOutcome, WireError, Workflow, createEngine } from "@lurker/core";

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
  /** Escalation hook for value-form workflows (should stay cold on replay). */
  onEscalation?: Parameters<typeof createEngine>[0]["onEscalation"];
}
declare function replayRun<A, R>(wf: Workflow<A, R>, args: A, options: ReplayRunOptions): Promise<{
  outcome: RunOutcome<unknown>;
  preview: ResumePreview;
}>;
//#endregion
//#region src/cassettes/build-fixtures.d.ts
/** One cassette fixture file: id, provenance note, and the journal. */
interface CassetteFixture {
  id: string;
  note: string;
  entries: JournalEntry[];
}
declare function buildM2CassetteFixtures(): CassetteFixture[];
/**
* The frozen v1 journal (docs/11, section "Frozen journal fixtures"): a
* round-1 JSONL file with kinds agent, step, rand, external, approval and
* the legacy `v: 1` field (no hashVersion member). Returned as raw
* JSON-ready objects, one per line.
*/
declare function buildFrozenV1JournalRaw(): Array<Record<string, unknown>>;
/**
* v2 golden identity fixtures: worked examples per spawn kind (M2-T12).
* The keys freeze the hashVersion 2 profile; the v1 members freeze the
* effort-insensitive projection and the incomparable domain.
*/
declare function buildV2GoldenIdentity(): Record<string, unknown>;
//#endregion
//#region src/cassettes/record-live.d.ts
declare function recordLiveCassettes(): Promise<CassetteFixture[]>;
//#endregion
export { type CassetteFixture, type CreateTestEngineOptions, FAKE_MODEL, FAKE_MODEL_REF, FakeAdapter, type FakeAdapterOptions, type FakeCall, type FakeResponder, type FakeToolCallsValue, type FakeWireErrorValue, type ReplayRunOptions, type TestEngine, type TestRunHandle, buildFrozenV1JournalRaw, buildM2CassetteFixtures, buildV2GoldenIdentity, createTestEngine, fakeToolCalls, fakeWireError, recordLiveCassettes, replayRun };