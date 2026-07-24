import { JournalEntry, LeasableStore, Lease, MetaLookupStore, RunFilter, RunMeta, TranscriptStore } from "@rulvar/core";

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
export { DEFAULT_LEASE_TTL_MS, DEFAULT_POOL_MAX, PostgresStore, type PostgresStoreOptions, type PostgresTranscriptStore };