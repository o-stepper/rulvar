/**
 * @lurker/testing tier 1 (M1-T14): FakeAdapter and createTestEngine for
 * fast, fully typed, zero-network unit tests through the real engine.
 * Matchers live at '@lurker/testing/matchers'. VCR cassettes and
 * replay-strict arrive with M5/M2 (docs/09, section "Test harness").
 */
export { FakeAdapter, FAKE_MODEL, FAKE_MODEL_REF } from './fake-adapter.js';
export type { FakeAdapterOptions, FakeCall, FakeResponder } from './fake-adapter.js';
export { createTestEngine } from './test-engine.js';
export type { CreateTestEngineOptions, TestEngine, TestRunHandle } from './test-engine.js';
