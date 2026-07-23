import { JournalEntry, JournalStore, LeasableStore, TranscriptStore } from "@rulvar/core";

//#region src/types.d.ts
/**
* Conformance kit surface (M2-T11, DEF-4): an executable suite
* parameterized by a store factory. A store implementation passes or it
* is not a Rulvar store.
*/
/** One mandatory check; `run` rejects with a descriptive Error on violation. */
interface ConformanceCheck {
  id: string;
  title: string;
  run(): Promise<void>;
}
interface ConformanceSuite {
  name: string;
  checks: readonly ConformanceCheck[];
  /** Runs every check sequentially; throws on the first violation. */
  run(): Promise<void>;
}
/**
* The factory contract: every call MUST return a fresh, isolated store
* (checks run against independent instances; a JsonlFileStore factory
* uses a fresh temp directory per call).
*/
type StoreFactory<S> = () => Promise<S> | S;
/** Structural subset of the Vitest/Jest registration API. */
interface TestRegistrar {
  describe(name: string, factory: () => void): void;
  it(name: string, fn: () => Promise<void>): void;
}
/** Registers the suite as one `describe` block with one `it` per check. */
declare function registerConformance(suite: ConformanceSuite, api: TestRegistrar): void;
declare function makeSuite(name: string, checks: readonly ConformanceCheck[]): ConformanceSuite;
/** Canonical JSON with recursively sorted keys (fold-state hashing). */
declare function stableStringify(value: unknown): string;
//#endregion
//#region src/journal.d.ts
declare function journalStoreConformance(mk: StoreFactory<JournalStore>): ConformanceSuite;
//#endregion
//#region src/leasable.d.ts
declare function leasableStoreConformance(mk: StoreFactory<LeasableStore>, options?: {
  /**
  * The store's configured lease TTL, when known: enables the
  * wall-clock expiry and renew-keeps-held checks.
  */
  ttlMs?: number;
}): ConformanceSuite;
//#endregion
//#region src/fenced-writes.d.ts
declare function fencedWritesConformance(mk: StoreFactory<LeasableStore>): ConformanceSuite;
//#endregion
//#region src/fenced-transcripts.d.ts
/**
* The paired factory product: the transcript store under test plus the
* leasable journal store sharing its fencing domain.
*/
interface FencedTranscriptsFixture {
  journal: LeasableStore;
  transcripts: TranscriptStore;
}
declare function fencedTranscriptsConformance(mk: StoreFactory<FencedTranscriptsFixture>): ConformanceSuite;
//#endregion
//#region src/fixtures/golden-fold.d.ts
/**
* seq 0  agent spawn (running; abandoned by seq 6)
* seq 1  suspended external gate-a under the spawn's child scope
* seq 2  suspended external gate-b at the root
* seq 3  resolution of gate-a: schema-INVALID (never closes)
* seq 4  resolution of gate-a: applied
* seq 5  resolution of gate-a: noop (already_resolved)
* seq 6  abandon of the spawn: applied (covers the agent:0 subtree)
* seq 7  resolution of gate-b: applied (root scope, not covered)
* seq 8  abandon of gate-b: noop (already_resolved; first-closing-wins)
* seq 9  abandon of the spawn again: noop (target_abandoned)
*/
declare const GOLDEN_FOLD_JOURNAL: readonly JournalEntry[];
/**
* Materializes the observable fold state of a journal: ref-entry
* classifications (invalid details excluded: validator message wording is
* not contractual), suspension states, and per-seq abandon coverage.
*/
declare function materializeFoldState(entries: readonly JournalEntry[]): Record<string, unknown>;
declare function foldStateSha256(entries: readonly JournalEntry[]): string;
/** The reference hash; computed once from the kernel fold and frozen. */
declare const GOLDEN_FOLD_STATE_SHA256 = "81e6ccff549fb3e6c1de4d34ba65b912162eba6f66403b5d5f23a3e1ec69243c";
//#endregion
export { type ConformanceCheck, type ConformanceSuite, type FencedTranscriptsFixture, GOLDEN_FOLD_JOURNAL, GOLDEN_FOLD_STATE_SHA256, type StoreFactory, type TestRegistrar, fencedTranscriptsConformance, fencedWritesConformance, foldStateSha256, journalStoreConformance, leasableStoreConformance, makeSuite, materializeFoldState, registerConformance, stableStringify };