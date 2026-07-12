/**
 * @rulvar/store-sqlite: SqliteStore implementing JournalStore and
 * LeasableStore with fencing epochs over the builtin node:sqlite driver;
 * the reference implementation for community stores (M5-T02).
 * Requires a Node.js with node:sqlite available
 * (unflagged in the 22.13+/23.4+ lines).
 */
export { SqliteStore, DEFAULT_LEASE_TTL_MS, type SqliteStoreOptions } from './store.js';
