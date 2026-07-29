/**
 * @rulvar/store-postgres: PostgresStore implementing JournalStore and
 * LeasableStore with fencing epochs over node-postgres, for
 * multi-process and multi-host deployments (RV-214). Payloads stay
 * opaque TEXT (A4); every run-scoped mutation serializes on a per-run
 * advisory transaction lock so the fence check and the guarded
 * mutation commit as one unit across hosts. Beside it,
 * PostgresQuotaLimiter (RV410) is the multi-host reference of the core
 * QuotaLimiter SPI: one database, one schema, one global provider
 * quota, admission serialized on a schema-wide advisory lock.
 */
export {
  PostgresStore,
  DEFAULT_LEASE_TTL_MS,
  DEFAULT_POOL_MAX,
  type PostgresStoreOptions,
  type PostgresTranscriptStore,
} from './store.js';
export {
  PostgresQuotaLimiter,
  QUOTA_ADMISSION_DEADLINE_MS,
  QUOTA_LOCK_TIMEOUT_MS,
  QuotaDeadlineError,
  QuotaGenerationError,
  quotaRulesFingerprint,
  type PostgresQuotaLimiterOptions,
} from './quota.js';
