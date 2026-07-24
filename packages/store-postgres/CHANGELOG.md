# @rulvar/store-postgres

## 1.57.0

### Minor Changes

- dc6ef2c: RV-214: the official PostgreSQL store. The new `@rulvar/store-postgres` package ships `PostgresStore`, implementing the full storage contract over node-postgres for multi-process AND multi-host deployments: `JournalStore` plus `LeasableStore` with fencing epochs, `fencedWrites` on both the journal side and the `transcripts()` twin, and the `getMeta`/`leaseTtlMs` capabilities. Payloads stay opaque TEXT (obligation A4 forbids jsonb normalization; jsonb appears only in query-side casts and expression indexes). Every run-scoped mutation runs inside one transaction that first takes a per-run advisory transaction lock, this store's translation of the sqlite BEGIN IMMEDIATE lesson: the fence check and the guarded mutation commit as ONE serialized unit across processes and hosts, at per-run granularity so unrelated runs never queue behind each other. The A5 monotonic-seq guard is one conditional INSERT under that lock, with per-instance appends chained in submission order (a genuinely async pool would otherwise let a later-submitted seq reach the server first). The lazy idempotent schema bootstrap serializes on a schema-scoped advisory lock so a fleet start over one fresh database boots clean; the `schema` option namespaces the five tables and doubles as cheap isolation. Lease expiry uses the client clock with an injectable `now` (NTP-synced hosts; the 60 s default ttl dwarfs sane drift), and one write region per run is the documented boundary. The package's own suite runs the full conformance kit, cross-instance fencing over one schema, an engine-level e2e (run on one store instance, resume from another with zero adapter calls), the adversarial multi-process soak, and the fleet boot race, all against a real postgres (gated on `RULVAR_POSTGRES_URL`; CI provides a service container). The stores guide documents options, pooling and backpressure sizing, the clock and single-write-region boundaries, and a backup/PITR runbook.

### Patch Changes

- Updated dependencies [5897232]
  - @rulvar/core@1.57.0
