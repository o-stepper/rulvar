/**
 * @rulvar/store-postgres: PostgresStore implementing JournalStore and
 * LeasableStore with fencing epochs over node-postgres, for
 * multi-process and multi-host deployments (RV-214). Payloads stay
 * opaque TEXT (A4); every run-scoped mutation serializes on a per-run
 * advisory transaction lock so the fence check and the guarded
 * mutation commit as one unit across hosts.
 */
export {
  PostgresStore,
  DEFAULT_LEASE_TTL_MS,
  DEFAULT_POOL_MAX,
  type PostgresStoreOptions,
  type PostgresTranscriptStore,
} from './store.js';
