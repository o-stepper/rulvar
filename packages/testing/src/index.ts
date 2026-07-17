/**
 * @rulvar/testing tier 1 (M1-T14): FakeAdapter and createTestEngine for
 * fast, fully typed, zero-network unit tests through the real engine.
 * Matchers live at '@rulvar/testing/matchers'. VCR cassettes and
 * replay-strict arrive with M5/M2.
 */
export { FakeAdapter, FAKE_MODEL, FAKE_MODEL_REF } from './fake-adapter.js';
export type { FakeAdapterOptions, FakeCall, FakeResponder } from './fake-adapter.js';
export { fakeToolCalls, fakeWireError } from './fake-adapter.js';
export type { FakeToolCallsValue, FakeWireErrorValue } from './fake-adapter.js';
export { createTestEngine } from './test-engine.js';
export type { CreateTestEngineOptions, TestEngine, TestRunHandle } from './test-engine.js';
export { replayRun } from './replay-strict.js';
export type { ReplayRunOptions } from './replay-strict.js';
export {
  DEFAULT_LIVE_SMOKE_ATTEMPTS,
  liveTestEnabled,
  MAX_LIVE_SMOKE_ATTEMPTS,
  MAX_LIVE_SMOKE_DELAY_MS,
  runLiveSmoke,
} from './live.js';
export type { LiveSmokeOutcome, RunLiveSmokeOptions } from './live.js';
// Frozen-fixture regeneration tooling (M2-T12): regenerating committed
// fixtures is DELIBERATE and requires a hashVersion-bump changeset
// (scripts/record-m2-cassettes.mjs). These exports serve the
// repository's own recording scripts, not applications, so they stay
// out of the public API reference.
/** @internal */
export {
  buildFrozenV1JournalRaw,
  buildM2CassetteFixtures,
  buildV2GoldenIdentity,
} from './cassettes/build-fixtures.js';
/** @internal */
export type { CassetteFixture } from './cassettes/build-fixtures.js';
/** @internal */
export { recordLiveCassettes } from './cassettes/record-live.js';
/** @internal */
export {
  handlesInRequest,
  M6_ORCH_GOAL,
  M6_ORCH_PROFILES,
  M6_ORCH_RUN_ID,
  normalizeM6Entries,
  recordOrchestratorCrash,
} from './cassettes/m6-orchestrator.js';
export * from './vcr.js';
