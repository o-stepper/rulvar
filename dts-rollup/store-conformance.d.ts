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
//#region src/multi-process-soak.d.ts
/** Accepted-mutation surfaces of the soaked run (serial-history members). */
type SoakAcceptSurface = "marker" | "append" | "meta" | "blob-put" | "blob-delete";
/** Surfaces of the stale-probe sweep; every one must reject typed. */
type SoakProbeSurface = "append" | "meta" | "blob-put" | "blob-delete" | "run-delete" | "renew" | "cross-run" | "release";
/** One JSONL line of a writer's report file (`w` is the writer index). */
type SoakEvent = {
  t: "grant";
  w: number;
  epoch: number;
} | {
  t: "accept";
  w: number;
  surface: SoakAcceptSurface;
  epoch: number;
  counter: number;
  nonce: string;
  seq?: number;
  ref?: string;
} | {
  t: "victim";
  w: number;
  epoch: number;
  vid: string;
} | {
  t: "stale-reject";
  w: number;
  surface: SoakProbeSurface;
  epoch: number;
} | {
  t: "stale-accept";
  w: number;
  surface: string;
  epoch: number;
} | {
  t: "live-cross-reject";
  w: number;
  epoch: number;
} | {
  t: "fence-kick";
  w: number;
  surface: string;
  epoch: number;
} | {
  t: "busy";
  w: number;
  surface: string;
} | {
  t: "renewed";
  w: number;
  epoch: number;
} | {
  t: "released";
  w: number;
  epoch: number;
} | {
  t: "stall";
  w: number;
  epoch: number;
} | {
  t: "victim-abandoned";
  w: number;
  vid: string;
  surface: string;
  why: string;
} | {
  t: "error";
  w: number;
  surface: string;
  message: string;
} | {
  t: "fatal";
  w: number;
  message: string;
} | {
  t: "done";
  w: number;
};
/**
* The per-writer contract, serialized as JSON into the
* `RULVAR_SOAK_CONFIG` environment variable of each spawned writer.
*/
interface SoakWriterConfig {
  /** Store location the writer script constructs its store over. */
  storePath: string;
  /** The soaked run id every writer competes for. */
  runId: string;
  /** This writer's index (0-based; also its report identity). */
  writer: number;
  /** Lease ttl the writer's store MUST be constructed with. */
  ttlMs: number;
  /** Deterministic PRNG seed (writers derive per-index streams). */
  seed: number;
  /** JSONL report file this writer appends its events to. */
  reportPath: string;
  /** The storm ends when this file exists. */
  stopPath: string;
}
/** Consumer hooks for {@link runSoakWriter}. */
interface SoakWriterHooks {
  /**
  * Classifies a thrown store error as transient contention worth an
  * in-place retry (for `SqliteStore`, the driver's SQLITE_BUSY under
  * `BEGIN IMMEDIATE`). Typed `LeaseHeldError` and
  * `JournalOrderViolation` are classified by the protocol itself and
  * never reach this hook. Default: nothing is retryable.
  */
  retryable?: (thrown: unknown) => boolean;
}
/**
* Minimum activity the storm must reach before the referee stops it:
* run-until-quorum makes the soak adaptive (a slow CI machine storms
* longer, it never asserts on thin coverage).
*/
interface SoakQuorum {
  /** Distinct fencing epochs granted (each one is a takeover). */
  epochs: number;
  /** Typed rejections observed by stale probe sweeps, all surfaces. */
  staleRejects: number;
  /** Accepted journal appends (markers included). */
  appends: number;
  /** Accepted meta writes. */
  metaWrites: number;
  /** Accepted transcript blob puts. */
  blobPuts: number;
  /** Accepted transcript blob deletes. */
  blobDeletes: number;
  /** Full fenced-deletion cycles on side runs. */
  victimCycles: number;
  /** Typed rejections of a live lease guarding a foreign run. */
  liveCrossRejects: number;
}
/** Default quorum: a few seconds of storm on a developer machine. */
declare const DEFAULT_SOAK_QUORUM: SoakQuorum;
/** Activity counters derived from the merged report events. */
interface SoakActivity {
  epochs: number;
  staleRejects: number;
  appends: number;
  metaWrites: number;
  blobPuts: number;
  blobDeletes: number;
  victimCycles: number;
  liveCrossRejects: number;
  busyRetries: number;
}
interface MultiProcessSoakOptions {
  /**
  * Absolute path of the consumer's writer script. It must construct
  * the store over `soakWriterConfigFromEnv().storePath` (bare, no
  * retry wrapper: concurrent boot is part of the promise under test),
  * call {@link runSoakWriter}, and exit 0.
  */
  writerScript: string;
  /** Scratch directory for the store file, reports, and stop file. */
  dir: string;
  /**
  * Opens the referee's own fixture over the SAME store location once
  * the storm has ended, for state verification.
  */
  openStore: (storePath: string) => Promise<FencedTranscriptsFixture> | FencedTranscriptsFixture;
  /** Closes what {@link openStore} opened. */
  closeStore?: (fixture: FencedTranscriptsFixture) => void | Promise<void>;
  /** Store location; default `join(dir, 'soak.db')`. */
  storePath?: string;
  /** Concurrent writer processes; default 3. */
  writers?: number;
  /** Lease ttl for the storm; default 250 ms (short = many takeovers). */
  ttlMs?: number;
  /** PRNG seed; default 1. */
  seed?: number;
  /** Activity quorum overrides; see {@link DEFAULT_SOAK_QUORUM}. */
  quorum?: Partial<SoakQuorum>;
  /** Hard wall-clock cap on the storm; default 60000 ms. */
  capMs?: number;
  /** Extra environment for the writer processes. */
  env?: Record<string, string>;
  /** Extra `node` arguments placed before the writer script. */
  execArgv?: string[];
}
/** What a green soak returns (the storm's observed coverage). */
interface MultiProcessSoakResult {
  activity: SoakActivity;
  stormMs: number;
  journalEntries: number;
  events: SoakEvent[];
}
/** Reads the writer contract a referee serialized into the child env. */
declare function soakWriterConfigFromEnv(env?: Record<string, string | undefined>): SoakWriterConfig;
/**
* The writer protocol: run it in a spawned process against the
* consumer-constructed store pair. Appends every observation to the
* report file; protocol-level anomalies (a stale acceptance, an
* unexpected error class) are logged as events for the referee, never
* thrown, so one writer's finding cannot vanish with its process.
*/
declare function runSoakWriter(fixture: FencedTranscriptsFixture, config: SoakWriterConfig, hooks?: SoakWriterHooks): Promise<void>;
/** Parses one report file, tolerating a torn trailing line. */
declare function parseSoakReport(path: string): SoakEvent[];
/** Derives the activity counters the quorum is judged against. */
declare function countSoakActivity(events: readonly SoakEvent[]): SoakActivity;
/**
* The pure referee: rebuilds the serial history from the merged report
* events and diffs it against the actual post-storm store state.
* Returns every violation as a descriptive string; an empty array means
* the fencing promise held for the whole storm.
*/
declare function verifySoakHistory(fixture: FencedTranscriptsFixture, events: readonly SoakEvent[], runId: string): Promise<string[]>;
/**
* Spawns the writer processes, stops the storm at quorum (or at the
* hard cap), verifies the serial history against the store, and throws
* one Error naming every violation. The returned result is the storm's
* observed coverage; assert on it if the caller wants a floor beyond
* the quorum.
*/
declare function runMultiProcessSoak(options: MultiProcessSoakOptions): Promise<MultiProcessSoakResult>;
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
export { type ConformanceCheck, type ConformanceSuite, DEFAULT_SOAK_QUORUM, type FencedTranscriptsFixture, GOLDEN_FOLD_JOURNAL, GOLDEN_FOLD_STATE_SHA256, type MultiProcessSoakOptions, type MultiProcessSoakResult, type SoakAcceptSurface, type SoakActivity, type SoakEvent, type SoakProbeSurface, type SoakQuorum, type SoakWriterConfig, type SoakWriterHooks, type StoreFactory, type TestRegistrar, countSoakActivity, fencedTranscriptsConformance, fencedWritesConformance, foldStateSha256, journalStoreConformance, leasableStoreConformance, makeSuite, materializeFoldState, parseSoakReport, registerConformance, runMultiProcessSoak, runSoakWriter, soakWriterConfigFromEnv, stableStringify, verifySoakHistory };