import { a as FAKE_MODEL, c as FakeAdapterOptions, d as FakeToolCallsValue, f as FakeWireErrorValue, i as createTestEngine, l as FakeCall, m as fakeWireError, n as TestEngine, o as FAKE_MODEL_REF, p as fakeToolCalls, r as TestRunHandle, s as FakeAdapter, t as CreateTestEngineOptions, u as FakeResponder } from "./test-engine-2Md1gvT4.js";
import { AgentProfile, ChatEvent, ChatRequest, InvocationRole, JournalEntry, JournalStore, ModelCaps, ModelSpec, ProviderAdapter, ResumePreview, RunOutcome, WireError, Workflow, createEngine } from "@rulvar/core";

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
/** @internal */
interface CassetteFixture {
  id: string;
  note: string;
  entries: JournalEntry[];
}
/** @internal */
declare function buildM2CassetteFixtures(): CassetteFixture[];
/**
* The frozen v1 journal: a
* round-1 JSONL file with kinds agent, step, rand, external, approval and
* the legacy `v: 1` field (no hashVersion member). Returned as raw
* JSON-ready objects, one per line.
* @internal
*/
declare function buildFrozenV1JournalRaw(): Array<Record<string, unknown>>;
/**
* v2 golden identity fixtures: worked examples per spawn kind (M2-T12).
* The keys freeze the hashVersion 2 profile; the v1 members freeze the
* effort-insensitive projection and the incomparable domain.
* @internal
*/
declare function buildV2GoldenIdentity(): Record<string, unknown>;
//#endregion
//#region src/cassettes/record-live.d.ts
/** @internal */
declare function recordLiveCassettes(): Promise<CassetteFixture[]>;
//#endregion
//#region src/cassettes/m6-orchestrator.d.ts
/** @internal */
declare const M6_ORCH_RUN_ID = "m6-orchestrator-crash";
/** @internal */
declare const M6_ORCH_GOAL = "m6 cassette: gather two facts";
/** @internal */
declare const M6_ORCH_PROFILES: {
  worker: {
    description: string;
  };
};
/** Extracts spawn handles from the tool results the model saw. */
/** @internal */
declare function handlesInRequest(req: ChatRequest): number[];
/** Fixes wall clock and spans; everything else is deterministic already. */
/** @internal */
declare function normalizeM6Entries(entries: readonly JournalEntry[]): JournalEntry[];
/**
* Phase 1: record the pre-crash journal. The transcripts store carries
* the boundary checkpoint the resume restores from; the recorder keeps
* it in memory because the cassette pins only journal bytes (checkpoint
* blobs are engine-internal at-least-once state).
* @internal
*/
declare function recordOrchestratorCrash(): Promise<{
  entries: JournalEntry[]; /** Boundary checkpoint blobs by ref, base64: the resume restores from them. */
  checkpoints: Record<string, string>;
}>;
//#endregion
//#region src/vcr.d.ts
/** One recorded exchange; a cassette is one JSON header line plus rows. */
interface VcrRow {
  adapterId: string;
  provider?: string;
  requestHash: string;
  /** Redacted canonical request, for humans and drift review. */
  request: unknown;
  /** Redacted event stream, replayed verbatim. */
  events: ChatEvent[];
  /** Caps snapshot for the request's model at record time. */
  caps: ModelCaps;
  model: string;
}
interface VcrHeader {
  v: 1;
  kind: "rulvar-vcr";
  hashVersion: number;
  recordedAt: string;
}
type RedactFn = (value: string) => string;
/**
* Built-in redaction: authorization material never reaches cassette
* bytes. Deliberately aggressive; compose a
* custom hook for payload-specific secrets.
*/
declare function defaultRedact(value: string): string;
/**
* The cassette key: a hash of the canonical wire-contract request. The
* engine-populated telemetry namespace is excluded (never identity);
* everything else the adapter would send keys the
* row.
*/
declare function requestHash(req: ChatRequest): string;
/**
* Wraps live adapters for recording: every completed stream appends one
* redacted row to the cassette JSONL. The wrapped adapters are drop-in:
* same ids, providers, caps, and event streams.
*/
declare function record(options: {
  adapters: ProviderAdapter[];
  cassette: string;
  redact?: RedactFn;
}): ProviderAdapter[];
/** Typed hermetic-miss error; onMiss: 'throw' raises it on any unrecorded request. */
declare class VcrMissError extends Error {
  readonly requestHash: string;
  constructor(adapterId: string, hash: string);
}
interface VcrCassette {
  header: VcrHeader;
  rows: VcrRow[];
}
/** Parses a cassette file (one header line plus one JSON row per line). */
declare function readCassette(path: string): VcrCassette;
/**
* Builds replay adapters from a cassette. `onMiss: 'throw'` is the
* hermetic CI mode; `'passthrough'` forwards unrecorded requests to the
* matching live adapter in `adapters` (a development convenience only).
*/
declare function replay(options: {
  cassette: string;
  onMiss: "throw" | "passthrough"; /** Live adapters for the passthrough mode. */
  adapters?: ProviderAdapter[];
}): ProviderAdapter[];
//#endregion
export { type CassetteFixture, type CreateTestEngineOptions, FAKE_MODEL, FAKE_MODEL_REF, FakeAdapter, type FakeAdapterOptions, type FakeCall, type FakeResponder, type FakeToolCallsValue, type FakeWireErrorValue, M6_ORCH_GOAL, M6_ORCH_PROFILES, M6_ORCH_RUN_ID, RedactFn, type ReplayRunOptions, type TestEngine, type TestRunHandle, VcrCassette, VcrMissError, VcrRow, buildFrozenV1JournalRaw, buildM2CassetteFixtures, buildV2GoldenIdentity, createTestEngine, defaultRedact, fakeToolCalls, fakeWireError, handlesInRequest, normalizeM6Entries, readCassette, record, recordLiveCassettes, recordOrchestratorCrash, replay, replayRun, requestHash };