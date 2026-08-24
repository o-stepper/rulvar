import { EffectLaneStore, JournalEntry, JournalStore, LeasableStore, QuotaRule, TranscriptStore } from "@rulvar/core";

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
  * wall-clock expiry and renew-keeps-held checks against the MAIN
  * factory. LEGACY single-ttl pairing: the mandatory checks follow
  * the suite's no-wall-clock convention, and a short shared ttl lets
  * one scheduler stall expire a just-acquired lease inside them (the
  * cycle 80 CI flake). Prefer `expiry`.
  */
  ttlMs?: number;
  /**
  * The wall-clock expiry check's OWN store and ttl (cycle 80): hand
  * the mandatory checks a main factory whose ttl no realistic stall
  * can cross, and give the expiry check its short-ttl store here.
  * Wins over `ttlMs` when both are present.
  */
  expiry?: {
    ttlMs: number;
    mk: StoreFactory<LeasableStore>;
  };
}): ConformanceSuite;
//#endregion
//#region src/fenced-writes.d.ts
declare function fencedWritesConformance(mk: StoreFactory<LeasableStore>): ConformanceSuite;
//#endregion
//#region src/quota-rules.d.ts
/**
* Constructs a limiter over the given rules; the suite closes whatever
* it returns (a `close` method is called and awaited when present), so
* factories may open real resources for the negative control.
*/
type QuotaLimiterConstructor = (rules: readonly QuotaRule[]) => unknown;
declare function quotaRulesConformance(mk: QuotaLimiterConstructor): ConformanceSuite;
//#endregion
//#region src/effect-lane.d.ts
/** The store shape under test: the capability plus the restore verb. */
interface RestorableEffectLaneStore extends EffectLaneStore {
  bumpRestorationGeneration(): Promise<number>;
}
declare function effectLaneStoreConformance(factory: StoreFactory<RestorableEffectLaneStore>): ConformanceSuite;
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
//#region src/kill-points.d.ts
/** The five durable writes a scenario kills around. */
type KillPointName = "running" | "ok-terminal" | "limit-terminal" | "settle" | "meta";
/** `before` = the write is lost; `after` = everything past it is lost. */
type KillPointPhase = "before" | "after";
/** The two scripted runs: two plain steps, or one tool-capped agent. */
type KillPointWorkflowKind = "happy" | "limit";
/** The pinned recovery semantics a scenario asserts. */
interface KillPointExpectation {
  /** Provider calls the child paid before dying. */
  childCalls: number;
  /** Tool executions the child performed before dying. */
  childToolExecutions: number;
  /** Provider calls the resume pays (the bracket's documented re-pay). */
  resumeCalls: number;
  /** Tool executions during the resume. */
  resumeToolExecutions: number;
  /** `agent` terminals with status `limit` in the final journal. */
  limitTerminals: number;
  /** The workflow value after recovery. */
  value: unknown;
}
interface KillPointScenario {
  /** Stable scenario id (`<workflow>-<point>-<phase>`). */
  id: string;
  workflow: KillPointWorkflowKind;
  point: KillPointName;
  phase: KillPointPhase;
  /** Which matching write dies (1-based; step two of the happy run is 2). */
  occurrence: number;
  expected: KillPointExpectation;
}
/**
* The full table: both brackets of all five write points. The expected
* counts ARE the engine's documented recovery semantics; a count moving
* here means the durability contract moved and the change must be
* deliberate.
*/
declare const KILL_POINT_SCENARIOS: readonly KillPointScenario[];
/**
* The per-scenario contract, serialized as JSON into the
* `RULVAR_KILL_POINT_CONFIG` environment variable of the spawned worker.
*/
interface KillPointWorkerConfig {
  /** Store location the writer script constructs its store over. */
  storePath: string;
  /** The run both processes drive; the referee resumes this id. */
  runId: string;
  /** Lease ttl the writer's store MUST be constructed with. */
  ttlMs: number;
  /** JSONL report file the worker appends its events to. */
  reportPath: string;
  /** Which {@link KILL_POINT_SCENARIOS} entry this worker executes. */
  scenarioId: string;
}
/** One JSONL line of a worker's report file. */
type KillPointEvent = {
  t: "call";
  prompt: string;
} | {
  t: "tool";
  target: string;
} | {
  t: "kill";
  point: KillPointName;
  phase: KillPointPhase;
  site: "append" | "putMeta";
  kind?: string;
  status?: string;
  seq?: number;
} | {
  t: "ran-to-completion";
  status: string;
} | {
  t: "fatal";
  message: string;
};
/** Reads the worker contract a referee serialized into the child env. */
declare function killPointWorkerConfigFromEnv(env?: Record<string, string | undefined>): KillPointWorkerConfig;
/** Parses one report file, tolerating a torn trailing line. */
declare function parseKillPointReport(path: string): KillPointEvent[];
/** Consumer hooks for {@link runKillPointWorker}. */
interface KillPointWorkerHooks {
  /**
  * The death itself; default SIGKILLs the current process and never
  * returns. In-process protocol tests inject a throwing hook instead,
  * which surfaces through the engine as a store failure.
  */
  kill?: () => void;
}
/**
* The worker protocol: run it in a spawned process against the
* consumer-constructed store pair. Wraps the journal so the configured
* write kills the process (`before` = ahead of the write, `after` =
* once it is durable), appends every observation to the report file
* first (the appends are synchronous, so the report survives the
* SIGKILL), and reports `ran-to-completion` when the kill point is
* never reached, which the referee treats as a violation.
*/
declare function runKillPointWorker(fixture: FencedTranscriptsFixture, config: KillPointWorkerConfig, hooks?: KillPointWorkerHooks): Promise<void>;
/** What a green scenario returns (the observed recovery). */
interface KillPointObservation {
  scenario: KillPointScenario;
  childCalls: number;
  childToolExecutions: number;
  resumeCalls: number;
  resumeToolExecutions: number;
  /** `kind:status` per final journal entry, in seq order. */
  journal: string[];
  metaStatus: string | undefined;
}
interface KillPointScenarioOptions {
  /**
  * Absolute path of the consumer's writer script. It must construct
  * the store over `killPointWorkerConfigFromEnv()` and call
  * {@link runKillPointWorker}.
  */
  writerScript: string;
  /** Scratch directory for the report file. */
  dir: string;
  /** The scenario to execute, by table entry or id. */
  scenario: KillPointScenario | string;
  /** Store location handed to the worker config; default `join(dir, 'kp.db')`. */
  storePath?: string;
  /**
  * The WORKER'S lease ttl; default 2000 ms. The referee waits it out
  * after the kill (retrying the resume on the typed rejection), so it
  * stays short, but NOT so short that a scheduler stall on a loaded
  * test runner can expire the WORKER'S own lease between its renewals
  * before the kill point is even reached: a lost lease cancels the run
  * by contract, the worker then exits zero as ran-to-completion, and
  * the scenario reads a self-inflicted takeover as a violation. The
  * same reasoning keeps the referee's own store (the `openStore`
  * fixture) on its GENEROUS default ttl.
  */
  ttlMs?: number;
  /**
  * Opens the referee's own fixture over the SAME store location for
  * the resume and the final state verification.
  */
  openStore: () => Promise<FencedTranscriptsFixture> | FencedTranscriptsFixture;
  /** Closes what {@link KillPointScenarioOptions.openStore} opened. */
  closeStore?: (fixture: FencedTranscriptsFixture) => void | Promise<void>;
  /** Extra environment for the worker process. */
  env?: Record<string, string>;
  /** Extra `node` arguments placed before the writer script. */
  execArgv?: string[];
  /** Ceiling on lease-held resume retries; default 15000 ms. */
  resumeDeadlineMs?: number;
}
/**
* Spawns the worker, asserts it died AT the configured write by
* SIGKILL, waits out the dead owner's lease, resumes the run over the
* referee's own store instance, and asserts the scenario's pinned
* recovery semantics. Throws one Error naming every violation.
*/
declare function runKillPointScenario(options: KillPointScenarioOptions): Promise<KillPointObservation>;
/** Per-scenario isolation a consumer's `prepare` hands the suite. */
interface KillPointTarget {
  /** Store location for this scenario (worker config + referee). */
  storePath?: string;
  /** Extra environment for the worker process. */
  env?: Record<string, string>;
  openStore: KillPointScenarioOptions["openStore"];
  closeStore?: KillPointScenarioOptions["closeStore"];
  /** Runs after the scenario, pass or fail (drop the schema, etc). */
  cleanup?: () => void | Promise<void>;
}
interface KillPointConformanceOptions {
  /** Absolute path of the consumer's writer script. */
  writerScript: string;
  /** Scratch directory for report files. */
  dir: string;
  /** Fresh isolation per scenario: store location and referee opener. */
  prepare: (scenario: KillPointScenario) => Promise<KillPointTarget> | KillPointTarget;
  /** The worker's lease ttl (see {@link KillPointScenarioOptions.ttlMs}); default 2000 ms. */
  ttlMs?: number;
  /** Extra `node` arguments placed before the writer script. */
  execArgv?: string[];
  /** Ceiling on lease-held resume retries; default 15000 ms. */
  resumeDeadlineMs?: number;
}
/**
* The whole {@link KILL_POINT_SCENARIOS} table as a conformance suite:
* one check per scenario, each over the fresh isolation `prepare`
* returns. Register it with a test API whose `it` allows at least
* thirty seconds per case (spawn, run, die, lease lapse, resume).
*/
declare function killPointConformance(options: KillPointConformanceOptions): ConformanceSuite;
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
export { type ConformanceCheck, type ConformanceSuite, DEFAULT_SOAK_QUORUM, type FencedTranscriptsFixture, GOLDEN_FOLD_JOURNAL, GOLDEN_FOLD_STATE_SHA256, KILL_POINT_SCENARIOS, type KillPointConformanceOptions, type KillPointEvent, type KillPointExpectation, type KillPointName, type KillPointObservation, type KillPointPhase, type KillPointScenario, type KillPointScenarioOptions, type KillPointTarget, type KillPointWorkerConfig, type KillPointWorkerHooks, type KillPointWorkflowKind, type MultiProcessSoakOptions, type MultiProcessSoakResult, type QuotaLimiterConstructor, type RestorableEffectLaneStore, type SoakAcceptSurface, type SoakActivity, type SoakEvent, type SoakProbeSurface, type SoakQuorum, type SoakWriterConfig, type SoakWriterHooks, type StoreFactory, type TestRegistrar, countSoakActivity, effectLaneStoreConformance, fencedTranscriptsConformance, fencedWritesConformance, foldStateSha256, journalStoreConformance, killPointConformance, killPointWorkerConfigFromEnv, leasableStoreConformance, makeSuite, materializeFoldState, parseKillPointReport, parseSoakReport, quotaRulesConformance, registerConformance, runKillPointScenario, runKillPointWorker, runMultiProcessSoak, runSoakWriter, soakWriterConfigFromEnv, stableStringify, verifySoakHistory };