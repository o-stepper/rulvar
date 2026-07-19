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
// Frozen-fixture regeneration tooling (M2-T12) is NOT here: it lives on
// the unexported internal entry src/internal/cassettes.ts, which the
// repository's own recorder scripts import by built-dist file path
// (v1.23.0 review: the root barrel advertised repository-only symbols
// to every consumer's autocomplete while the API reference hid them).
export * from './vcr.js';
