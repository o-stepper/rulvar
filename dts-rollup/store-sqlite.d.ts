import { JournalEntry, LeasableStore, Lease, MetaLookupStore, RunFilter, RunMeta } from "@rulvar/core";

//#region src/store.d.ts
/** Appendix A interim reference for the sqlite store. */
declare const DEFAULT_LEASE_TTL_MS = 6e4;
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
export { DEFAULT_LEASE_TTL_MS, SqliteStore, type SqliteStoreOptions };