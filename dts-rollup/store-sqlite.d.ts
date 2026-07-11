import { JournalEntry, JournalStore, LeasableStore, Lease, RunFilter, RunMeta } from "@rulvar/core";

//#region src/store.d.ts
/** Appendix A interim reference for the sqlite store (docs/06). */
declare const DEFAULT_LEASE_TTL_MS = 6e4;
interface SqliteStoreOptions {
  /** Database file path, or ':memory:' for an in-process store. */
  path: string;
  /** Lease ttl; default the Appendix A interim reference (60000 ms). */
  ttlMs?: number;
  /** Injectable clock for lease-expiry tests. */
  now?: () => number;
}
declare class SqliteStore implements JournalStore, LeasableStore {
  private readonly db;
  private readonly ttlMs;
  private readonly now;
  constructor(options: SqliteStoreOptions);
  close(): void;
  private liveLease;
  /** Rejects unless `lease` is the CURRENT live lease for its run. */
  private assertFencing;
  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  putMeta(m: RunMeta): Promise<void>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  delete(runId: string): Promise<void>;
  acquire(runId: string, owner: string): Promise<Lease>;
  renew(l: Lease): Promise<void>;
  release(l: Lease): Promise<void>;
}
//#endregion
export { DEFAULT_LEASE_TTL_MS, SqliteStore, type SqliteStoreOptions };