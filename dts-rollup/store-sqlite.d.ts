import { JournalEntry, LeasableStore, Lease, MetaLookupStore, QuotaDecision, QuotaLimiter, QuotaReservationRequest, QuotaRule, RunFilter, RunMeta, TranscriptStore, Usage } from "@rulvar/core";

//#region src/store.d.ts
/** Appendix A interim reference for the sqlite store. */
declare const DEFAULT_LEASE_TTL_MS = 6e4;
/**
* Total time the constructor keeps retrying its schema bootstrap
* through SQLITE_BUSY before giving up, so concurrent multi-process
* construction over one fresh file serializes instead of dying raw.
* The bound applies ONLY to boot; every runtime contention path keeps
* the documented fail-fast semantics (busy surfaces immediately). A
* boot still busy past the bound throws the driver's error: something
* is wedged, not merely concurrent.
*/
declare const BOOT_BUSY_TIMEOUT_MS = 5e3;
interface SqliteStoreOptions {
  /** Database file path, or ':memory:' for an in-process store. */
  path: string;
  /**
  * Lease ttl; default the Appendix A interim reference (60000 ms). An
  * integer between 1 and 2147483647 ms (workers renew on Node timers at
  * ttl/3), refused as a ConfigError BEFORE the database opens: zero or
  * a negative made every lease born expired (a second owner could take
  * over immediately), NaN failed the first acquire with a raw sqlite
  * NOT NULL error, and Infinity never expired (v1.35.0 review P2-4).
  */
  ttlMs?: number;
  /** Injectable clock for lease-expiry tests. */
  now?: () => number;
}
/**
* The fenced transcript twin over a SqliteStore database (the fenced
* run state RFC, F2): a TranscriptStore that declares `fencedWrites`
* because its blobs live in the SAME database as the lease rows, giving
* the fence check and the blob mutation one transactional domain.
* Obtain it from {@link SqliteStore.transcripts}; its lifetime is the
* owning store's (one shared connection, one `close()`).
*/
interface SqliteTranscriptStore extends TranscriptStore {
  readonly fencedWrites: true;
}
declare class SqliteStore implements MetaLookupStore, LeasableStore {
  /**
  * The fenced writes promise (fenced run state RFC, phase 2): every
  * lease-carrying mutation of this store (append, putMeta, delete)
  * verifies the lease is the current holder FOR THE MUTATED RUN,
  * atomically with the mutation, and rejects stale or mismatched
  * holders with the typed LeaseHeldError leaving nothing changed.
  */
  readonly fencedWrites = true;
  private readonly db;
  private readonly ttlMs;
  private readonly now;
  private transcriptTwin;
  constructor(options: SqliteStoreOptions);
  close(): void;
  private liveLease;
  /**
  * A lease fences exactly the run it names: guarding a mutation of a
  * DIFFERENT run with it would pass the holder check while touching
  * state the lease never protected, so the mismatch rejects typed
  * before any check runs.
  */
  private requireRunMatch;
  /** Rejects unless `lease` is the CURRENT live lease for its run. */
  private assertFencing;
  /**
  * Runs the fence check and the guarded mutation as ONE immediate
  * transaction, the same shape acquire already uses: BEGIN IMMEDIATE
  * takes the write lock BEFORE the check reads the lease row, so a
  * competing takeover cannot land between the check and the mutation
  * (it serializes behind the commit and the loser sees the final rows).
  * As two autocommit statements, a takeover in that window let a
  * superseded holder mutate live state (fenced-run-state RFC, F3).
  */
  private fenced;
  private insertEntry;
  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  private upsertMeta;
  putMeta(m: RunMeta, lease?: Lease): Promise<void>;
  getMeta(runId: string): Promise<RunMeta | undefined>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  private deleteRows;
  delete(runId: string, lease?: Lease): Promise<void>;
  /**
  * The fenced transcript twin (fenced run state RFC, F2): a
  * TranscriptStore whose blobs live in THIS store's database, beside
  * the lease rows, so a lease-carrying put or delete verifies the
  * current holder of the run the ref's leading path segment names
  * atomically with the blob mutation, in the same one-immediate-
  * transaction shape as the journal side. Sharing the connection is
  * what makes the capability implementable at all (a blob write and a
  * lease check in different domains cannot commit as one unit; with
  * ':memory:' a separate connection would not even see the leases) and
  * keeps one close() lifecycle. Wire it as the engine's transcript
  * store next to this store as the journal: over the pair every
  * durable run mutation is fenced, which is what
  * `assertFencedWrites({ journal, transcripts })` verifies. The blob
  * cascade of `deleteRun`/`pruneRun` stays ENGINE-side, exactly as the
  * TranscriptStore contract says; the journal-side `delete(runId)`
  * never touches blob rows.
  */
  transcripts(): SqliteTranscriptStore;
  /**
  * TTL introspection (the LeasableStore optional capability): lets
  * createWorker verify at construction that its renew cadence matches
  * this store's expiry instead of trusting two config sources to agree.
  */
  get leaseTtlMs(): number;
  acquire(runId: string, owner: string): Promise<Lease>;
  renew(l: Lease): Promise<void>;
  release(l: Lease): Promise<void>;
}
//#endregion
//#region src/quota.d.ts
/**
* How long a runtime reserve/reconcile transaction waits for a
* sibling process's transaction before the driver reports busy. Quota
* admissions are short single-writer transactions; queueing here IS
* the cross-process serialization working.
*/
declare const QUOTA_BUSY_TIMEOUT_MS = 2e3;
interface SqliteQuotaLimiterOptions {
  /** Database file path shared by every coordinating process. */
  path: string;
  /** The shared rule set; must be identical across processes. */
  rules: readonly QuotaRule[];
  /** Injectable clock for window tests. */
  now?: () => number;
}
/**
* The cross-process reference implementation of the core QuotaLimiter
* SPI: engine processes pointing instances at ONE database file (this
* store's file or its own) enforce one global provider quota.
* Admission consumes the window counters inside a single
* `BEGIN IMMEDIATE` transaction, so two processes can never both take
* the last slot; reservations are rows, so `reconcile` settles a
* grant from any process; both tables are lazily pruned to the
* current and previous accounting window. The rule model, the fixed
* epoch-aligned one-minute windows, and the admission decision are
* the core's own exported functions, so this limiter and
* `memoryQuotaLimiter` agree on every verdict. The `rules` MUST be
* identical across coordinating processes (buckets key on rule
* content). Runtime contention queues briefly on the connection's
* busy_timeout (a hot limiter is EXPECTED to serialize); a call still
* busy past the bound throws, and the engine's `onLimiterError`
* policy decides what that means. Call `close()` when done.
*/
declare class SqliteQuotaLimiter implements QuotaLimiter {
  private readonly db;
  private readonly rules;
  private readonly now;
  constructor(options: SqliteQuotaLimiterOptions);
  reserve(request: QuotaReservationRequest): Promise<QuotaDecision>;
  reconcile(reservationId: string, usage: Usage): Promise<void>;
  /** Current-window counters per rule, for telemetry and referees. */
  snapshot(): Array<{
    rule: QuotaRule;
    windowStart: number;
    requests: number;
    tokens: number;
  }>;
  close(): void;
  /** Both tables stay bounded to the current and previous window. */
  private prune;
  private rollbackQuietly;
}
//#endregion
export { BOOT_BUSY_TIMEOUT_MS, DEFAULT_LEASE_TTL_MS, QUOTA_BUSY_TIMEOUT_MS, SqliteQuotaLimiter, type SqliteQuotaLimiterOptions, SqliteStore, type SqliteStoreOptions, type SqliteTranscriptStore };