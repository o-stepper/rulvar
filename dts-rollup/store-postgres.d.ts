import { JournalEntry, LeasableStore, Lease, MetaLookupStore, QuotaDecision, QuotaLimiter, QuotaReservationRequest, QuotaRule, RunFilter, RunMeta, TranscriptStore, Usage } from "@rulvar/core";

//#region src/store.d.ts
/** Appendix A interim reference, shared with the sqlite store. */
declare const DEFAULT_LEASE_TTL_MS = 6e4;
/** Default pg Pool size; every operation is a short transaction. */
declare const DEFAULT_POOL_MAX = 10;
/**
* The fenced transcript twin over a PostgresStore database (the fenced
* run state RFC, F2): blobs live in the SAME database as the lease
* rows, so a lease-carrying put or delete verifies the current holder
* atomically with the blob mutation. Obtain it from
* {@link PostgresStore.transcripts}; its lifetime is the owning
* store's (one shared pool, one `close()`).
*/
interface PostgresTranscriptStore extends TranscriptStore {
  readonly fencedWrites: true;
}
interface PostgresStoreOptions {
  /**
  * A postgres connection string
  * (`postgres://user:password@host:port/database`). Every coordinating
  * process and host points at the same database and schema.
  */
  url: string;
  /**
  * Schema holding this store's tables; default `public`. A non-public
  * schema is created on boot (`CREATE SCHEMA IF NOT EXISTS`), which
  * also gives tests and multi-tenant hosts cheap isolation. Must be a
  * plain SQL identifier.
  */
  schema?: string;
  /** Lease ttl; default the Appendix A interim reference (60000 ms). */
  ttlMs?: number;
  /** Pool size ceiling; default 10. */
  max?: number;
  /** Injectable clock for lease-expiry tests. */
  now?: () => number;
}
declare class PostgresStore implements MetaLookupStore, LeasableStore {
  /** The fenced writes promise (fenced run state RFC, phase 2). */
  readonly fencedWrites = true;
  private readonly pool;
  private readonly schema;
  private readonly ttlMs;
  private readonly now;
  private boot;
  private transcriptTwin;
  /**
  * Per-run append chains: within ONE store instance, appends execute
  * in submission order. The synchronous drivers of the other shipped
  * stores get this for free (a sync append completes before the next
  * call starts); over a genuinely async pool, the advisory lock alone
  * hands the lock out in arrival order, and a later-submitted seq
  * reaching the server first would trip the A5 tail guard on its
  * earlier sibling. Cross-instance ordering stays the guard's job.
  */
  private readonly appendChains;
  constructor(options: PostgresStoreOptions);
  /** `"schema".rulvar_<name>`, always schema-qualified. */
  private table;
  /**
  * The lazy idempotent bootstrap, memoized so it runs once per store;
  * a rejected boot clears the memo so the next call retries. The
  * schema-scoped advisory transaction lock serializes a fleet of
  * processes bootstrapping the same fresh database.
  */
  private booted;
  private runBootstrap;
  /**
  * One serialized run-scoped transaction: BEGIN, take the per-run
  * advisory transaction lock, run `fn`, COMMIT. Every mutation of a
  * run's state goes through here, which is what makes the fence check
  * and the guarded mutation one unit across processes and hosts.
  */
  private withRunLock;
  close(): Promise<void>;
  private liveLease;
  /**
  * A lease fences exactly the run it names (the sqlite rule): guarding
  * a mutation of a DIFFERENT run would pass the holder check while
  * touching state the lease never protected.
  */
  private requireRunMatch;
  private assertFencing;
  /** Fence check plus guarded mutation as ONE serialized transaction. */
  private fenced;
  private insertEntry;
  /** Chains run-scoped work in submission order for this instance. */
  private chained;
  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  private upsertMeta;
  putMeta(m: RunMeta, lease?: Lease): Promise<void>;
  getMeta(runId: string): Promise<RunMeta | undefined>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  private deleteRows;
  delete(runId: string, lease?: Lease): Promise<void>;
  /**
  * The fenced transcript twin (RFC F2): blobs live in this store's
  * database beside the lease rows, so a lease-carrying put or delete
  * verifies the current holder of the run the ref's leading path
  * segment names atomically with the blob mutation. Wire it as the
  * engine's transcript store next to this store as the journal;
  * `assertFencedWrites({ journal, transcripts })` verifies the pair.
  */
  transcripts(): PostgresTranscriptStore;
  /** TTL introspection (the LeasableStore optional capability). */
  get leaseTtlMs(): number;
  acquire(runId: string, owner: string): Promise<Lease>;
  renew(l: Lease): Promise<void>;
  release(l: Lease): Promise<void>;
}
//#endregion
//#region src/quota.d.ts
/**
* How long a reserve/reconcile transaction waits for the schema-wide
* admission lock before postgres cancels the statement. Quota
* admissions are short single-writer transactions; queueing here IS
* the cross-host serialization working.
*/
declare const QUOTA_LOCK_TIMEOUT_MS = 2e3;
/**
* The default bound on one WHOLE admission path (RV506): lazy
* bootstrap, pool checkout, and the admission transaction together.
* `QUOTA_LOCK_TIMEOUT_MS` bounds only the lock-wait stage inside the
* transaction; before RV506 a call could spend that bound once at
* checkout and again at the lock and still not be refused. Overridable
* per limiter through `admissionDeadlineMs`.
*/
declare const QUOTA_ADMISSION_DEADLINE_MS = 5e3;
/**
* Thrown when one quota admission (reserve or reconcile) misses the
* full-path deadline. It surfaces exactly where the lock timeout
* surfaces, as a limiter error consumed by the engine's
* `onLimiterError` policy: `'deny'` (the default) turns it into a
* retryable transport-class denial, so nothing dispatches unpoliced.
* The connection the refused call held is destroyed, never returned
* dirty to the pool; a transaction cut mid-flight is rolled back by
* the server. Like any client-side timeout, expiry exactly at the
* commit boundary can leave a committed reservation behind; it ages
* out with its window unreconciled, the same bounded residue a
* crashed process leaves.
*/
declare class QuotaDeadlineError extends Error {
  /** The deadline that expired, in milliseconds. */
  readonly deadlineMs: number;
  /** The schema whose admission missed it. */
  readonly schema: string;
  /**
  * Where the path stood: inside the schema bootstrap transaction,
  * waiting for a pooled connection, or mid-admission-transaction. The
  * message narrates only what actually happened to a connection in
  * that phase (RV608): a refusal while WAITING held nothing, so it
  * destroyed nothing.
  */
  readonly phase: "bootstrap" | "acquire" | "transaction";
  constructor(deadlineMs: number, schema: string, phase: "bootstrap" | "acquire" | "transaction");
}
/**
* Thrown by an admission whose booted rule identity no longer matches
* the schema's (RV608): another deployment rotated the recorded rules
* fingerprint and generation after this host booted, so admitting under
* the retired rules would silently split the budget across mismatched
* bucket keys. The refused host must restart with the current rule set;
* its outstanding reservations age out with their window (the same
* bounded residue a crashed process leaves), and the rotation carried
* current-window consumption conservatively. Like every limiter throw,
* it lands in the engine's `onLimiterError` policy.
*/
declare class QuotaGenerationError extends Error {
  /** The schema whose recorded identity moved. */
  readonly schema: string;
  /** What this instance booted with. */
  readonly booted: {
    fingerprint: string;
    generation: number;
  };
  /** What the schema records now (absent fields mean a wiped meta row). */
  readonly recorded: {
    fingerprint: string | undefined;
    generation: number | undefined;
  };
  constructor(schema: string, booted: {
    fingerprint: string;
    generation: number;
  }, recorded: {
    fingerprint: string | undefined;
    generation: number | undefined;
  });
}
/**
* The canonical fingerprint of one rule SET (RV506): sha256 hex over
* the sorted canonical rule keys (the core's `quotaRuleKey`, the same
* encoding both store references bucket on). Order-insensitive on
* purpose, matching bucket semantics (equal rules land on the same
* bucket regardless of array position), so reordering a config never
* reads as a rules change. Exported so a deployment can precompute the
* value it expects a schema to have recorded.
*/
declare function quotaRulesFingerprint(rules: readonly QuotaRule[]): string;
interface PostgresQuotaLimiterOptions {
  /**
  * A postgres connection string shared by every coordinating process
  * and host (the database may also hold a PostgresStore; the tables
  * do not collide).
  */
  url: string;
  /**
  * Schema holding the two quota tables; default `public`. A
  * non-public schema is created on boot. Must be a plain SQL
  * identifier.
  */
  schema?: string;
  /**
  * The shared rule set; must be identical across hosts. Enforced: the
  * schema records `quotaRulesFingerprint(rules)` on first boot, and an
  * instance whose fingerprint differs is refused with a typed
  * `ConfigError` naming both hashes.
  */
  rules: readonly QuotaRule[];
  /** Pool size ceiling; default 10. Admissions are short transactions. */
  max?: number;
  /**
  * Bound on one whole admission path (bootstrap, pool checkout, and
  * the admission transaction together); default
  * `QUOTA_ADMISSION_DEADLINE_MS` (5000). Must be an integer strictly
  * greater than `QUOTA_LOCK_TIMEOUT_MS`, which bounds only the
  * lock-wait stage inside it. Expiry throws `QuotaDeadlineError` into
  * the engine's `onLimiterError` policy and destroys the connection
  * the refused call held.
  */
  admissionDeadlineMs?: number;
  /**
  * Rules rotation opt-in: rewrite the schema's recorded rules
  * fingerprint with this instance's own at boot instead of refusing on
  * a mismatch. Procedure: enable on the NEW deployment, roll every
  * host to the new rule set, then remove the flag so drift is refused
  * again. Default false.
  */
  acceptRulesUpdate?: boolean;
  /** Injectable clock for window tests. */
  now?: () => number;
}
/**
* The multi-host reference implementation of the core QuotaLimiter
* SPI: engine processes pointing instances at ONE database and schema
* (a PostgresStore's database or their own) enforce one global
* provider quota. Admission consumes the window counters inside a
* single transaction serialized on a schema-wide advisory transaction
* lock, so two processes or HOSTS can never both take the last slot;
* reservations are rows, so `reconcile` settles a grant from any host;
* both tables are lazily pruned to the current and previous accounting
* window. The rule model, the fixed epoch-aligned one-minute windows,
* and the admission decision are the core's own exported functions, so
* this limiter, `memoryQuotaLimiter`, and `SqliteQuotaLimiter` agree
* on every verdict. The `rules` MUST be identical across coordinating
* processes (buckets key on rule content), and since RV506 that is
* enforced: boot records `quotaRulesFingerprint(rules)` in the
* schema's `rulvar_quota_meta` row and refuses a drifted instance with
* a typed `ConfigError` naming both hashes (`acceptRulesUpdate: true`
* rotates the record). Runtime contention queues on the advisory lock
* (a hot limiter is EXPECTED to serialize; note the lock serializes
* `reserve` AND `reconcile`, so it sees admission attempts plus
* grants); a call still waiting past `QUOTA_LOCK_TIMEOUT_MS` throws,
* and the whole admission path (bootstrap, checkout, transaction) is
* bounded by `admissionDeadlineMs`, whose expiry throws a typed
* `QuotaDeadlineError` and destroys the held connection. Both throws
* land in the engine's `onLimiterError` policy, which decides what
* they mean. Call `close()` when done.
*/
declare class PostgresQuotaLimiter implements QuotaLimiter {
  private readonly pool;
  private readonly schema;
  private readonly rules;
  /** Matching order for the denial fold: canonical rule-key order
  * (RV608), so permuted identical sets produce byte-identical
  * refusals. Telemetry keeps the declared order. */
  private readonly ordered;
  /** Computed ONCE from the immutable snapshot at construction (RV608):
  * what boot records and every admission re-verifies. */
  private readonly fingerprint;
  /** The schema generation this instance booted at; admissions re-read
  * the schema's and are fenced typed on a mismatch (RV608). */
  private generation;
  private readonly admissionDeadlineMs;
  private readonly acceptRulesUpdate;
  private readonly now;
  private boot;
  /** The bootstrap transaction's connection while one is in flight, so
  * a deadline can destroy it instead of letting an abandoned bootstrap
  * commit DDL or a rotation late (RV608). */
  private bootClient;
  constructor(options: PostgresQuotaLimiterOptions);
  /** `"schema".rulvar_<name>`, always schema-qualified. */
  private table;
  /**
  * The lazy idempotent bootstrap, memoized so it runs once per
  * limiter; a rejected boot clears the memo so the next call retries.
  * The schema-scoped advisory transaction lock serializes a fleet of
  * processes bootstrapping the same fresh database (the PostgresStore
  * pattern: postgres queues on the lock and needs no busy retry).
  */
  private booted;
  private runBootstrap;
  /**
  * One serialized admission transaction: BEGIN, bound the lock wait,
  * take the schema-wide quota advisory lock, run `fn`, COMMIT. Every
  * counter mutation goes through here, which is what makes the
  * verdict read and the consume one unit across processes and hosts.
  *
  * The WHOLE path (lazy bootstrap, pool checkout, transaction) races
  * `admissionDeadlineMs` (RV506): `lock_timeout` bounds one stage, and
  * before the deadline a call could spend that bound at checkout and
  * again at the lock without ever being refused. On expiry the caller
  * gets a typed `QuotaDeadlineError`, and a connection the refused
  * call holds is destroyed through `release(err)`, never returned
  * mid-transaction to the pool; destroying it also cancels the
  * abandoned wait server-side. The deadline runs on the REAL clock
  * (an injected test `now` freezes window math, not infrastructure
  * timeouts).
  */
  private withQuotaLock;
  /**
  * The generation fence (RV608), run INSIDE every admission
  * transaction after the lock is taken: the schema's recorded rule
  * identity is re-read and compared to what this instance booted, so a
  * host whose rules were rotated away admits NOTHING under retired
  * bucket keys. The refusal is typed, and the boot memo is cleared so
  * the host's next call re-boots into the honest boot-time refusal
  * naming both fingerprints.
  */
  private assertCurrentIdentity;
  reserve(request: QuotaReservationRequest): Promise<QuotaDecision>;
  reconcile(reservationId: string, usage: Usage, actual?: {
    requests?: number;
  }): Promise<void>;
  /**
  * Cancels an UNUSED admission (RV1104, the optional SPI method from
  * RV1013): exactly what admission consumed, the admitted requests
  * and the token estimate, returns to the window, from any host
  * sharing the schema. Unknown ids, a double release, and a release
  * after reconcile are no-ops (the row is gone); a rolled-over window
  * already aged the estimate out, so only the row is deleted; a
  * released id settles nothing afterwards. Runs under the same
  * advisory lock and generation fence as every admission, so a
  * rotated-away host returns nothing under retired bucket keys.
  * Mirrors `memoryQuotaLimiter.release` verdict for verdict.
  */
  release(reservationId: string): Promise<void>;
  /** Current-window counters per rule, for telemetry and referees. */
  snapshot(): Promise<Array<{
    rule: QuotaRule;
    windowStart: number;
    requests: number;
    tokens: number;
  }>>;
  close(): Promise<void>;
  /** Both tables stay bounded to the current and previous window. */
  private prune;
}
//#endregion
export { DEFAULT_LEASE_TTL_MS, DEFAULT_POOL_MAX, PostgresQuotaLimiter, type PostgresQuotaLimiterOptions, PostgresStore, type PostgresStoreOptions, type PostgresTranscriptStore, QUOTA_ADMISSION_DEADLINE_MS, QUOTA_LOCK_TIMEOUT_MS, QuotaDeadlineError, QuotaGenerationError, quotaRulesFingerprint };