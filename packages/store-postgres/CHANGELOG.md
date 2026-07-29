# @rulvar/store-postgres

## 1.99.1

### Patch Changes

- Updated dependencies [ef08d73]
  - @rulvar/core@1.99.1

## 1.99.0

### Patch Changes

- Updated dependencies [9e00888]
  - @rulvar/core@1.99.0

## 1.98.0

### Minor Changes

- 6c7fbd8: `PostgresQuotaLimiter` bounds each WHOLE admission path and fingerprints the shared rules (RV506). New `admissionDeadlineMs` (default the exported `QUOTA_ADMISSION_DEADLINE_MS`, 5000 ms; refused at construction unless it exceeds the internal `QUOTA_LOCK_TIMEOUT_MS` stage bound) races lazy bootstrap, pool checkout, and the admission transaction together: before, the 2000 ms lock bound covered only the lock-wait stage, so a call could spend it once at checkout and again at the lock without ever being refused. Expiry throws a typed `QuotaDeadlineError` into the engine's `onLimiterError` policy and destroys the held connection via `release(err)` instead of returning it dirty to the pool. Boot now records `quotaRulesFingerprint(rules)` (exported; sha256 over the canonical rule keys, insensitive to array order) in a new `rulvar_quota_meta` table under the boot lock, and refuses an instance whose rule set drifted with a typed `ConfigError` naming both hashes and the schema, so mismatched hosts can no longer silently split one budget across different bucket keys; rotation is the explicit `acceptRulesUpdate: true` opt-in (enable on the new deployment, roll every host, remove the flag).

### Patch Changes

- @rulvar/core@1.98.0

## 1.97.0

### Patch Changes

- Updated dependencies [5c3b453]
  - @rulvar/core@1.97.0

## 1.96.0

### Patch Changes

- @rulvar/core@1.96.0

## 1.95.0

### Minor Changes

- 2bda821: `PostgresQuotaLimiter` (RV410): the multi-host reference implementation of the core `QuotaLimiter` SPI. Engine processes on any number of hosts pointing instances at one database and schema enforce one global provider quota: admission consumes the window counters inside a single transaction serialized on a schema-wide advisory lock, so two hosts can never both take the last slot; reservations are rows, so reconciliation settles a grant from any host; both tables are lazily pruned to two accounting windows. The rule model, the fixed epoch-aligned one-minute windows, and the admission decision are the core's own exported functions, so this limiter, `memoryQuotaLimiter`, and `SqliteQuotaLimiter` agree byte for byte on every verdict. A call still waiting for the admission lock past the exported `QUOTA_LOCK_TIMEOUT_MS` (2000 ms) throws into the engine's `onLimiterError` policy instead of hanging. The durable admission queue stays the host's documented boundary: a denial carries the honest window remainder, and what to do while waiting is host policy.

### Patch Changes

- @rulvar/core@1.95.0

## 1.94.0

### Patch Changes

- @rulvar/core@1.94.0

## 1.93.0

### Patch Changes

- Updated dependencies [c62150a]
  - @rulvar/core@1.93.0

## 1.92.0

### Patch Changes

- Updated dependencies [351d1f5]
  - @rulvar/core@1.92.0

## 1.91.0

### Patch Changes

- @rulvar/core@1.91.0

## 1.90.0

### Patch Changes

- Updated dependencies [9603940]
  - @rulvar/core@1.90.0

## 1.89.0

### Patch Changes

- Updated dependencies [f18b671]
- Updated dependencies [f18b671]
  - @rulvar/core@1.89.0

## 1.88.0

### Patch Changes

- Updated dependencies [3b339d9]
  - @rulvar/core@1.88.0

## 1.87.0

### Patch Changes

- Updated dependencies [c4c02b1]
  - @rulvar/core@1.87.0

## 1.86.0

### Patch Changes

- Updated dependencies [2f71894]
  - @rulvar/core@1.86.0

## 1.85.0

### Patch Changes

- Updated dependencies [6932a9f]
  - @rulvar/core@1.85.0

## 1.84.0

### Patch Changes

- @rulvar/core@1.84.0

## 1.83.0

### Patch Changes

- @rulvar/core@1.83.0

## 1.82.0

### Patch Changes

- Updated dependencies [9cc5d66]
  - @rulvar/core@1.82.0

## 1.81.2

### Patch Changes

- Updated dependencies [296885b]
  - @rulvar/core@1.81.2

## 1.81.1

### Patch Changes

- Updated dependencies [c030982]
  - @rulvar/core@1.81.1

## 1.81.0

### Patch Changes

- Updated dependencies [ce4c392]
  - @rulvar/core@1.81.0

## 1.80.0

### Patch Changes

- Updated dependencies [262e397]
  - @rulvar/core@1.80.0

## 1.79.0

### Patch Changes

- Updated dependencies [85956ab]
  - @rulvar/core@1.79.0

## 1.78.0

### Patch Changes

- Updated dependencies [941b6e1]
  - @rulvar/core@1.78.0

## 1.77.0

### Patch Changes

- Updated dependencies [6aba271]
  - @rulvar/core@1.77.0

## 1.76.0

### Patch Changes

- Updated dependencies [22cba47]
  - @rulvar/core@1.76.0

## 1.75.1

### Patch Changes

- Updated dependencies [82bc0f0]
  - @rulvar/core@1.75.1

## 1.75.0

### Patch Changes

- Updated dependencies [c486de8]
  - @rulvar/core@1.75.0

## 1.74.0

### Patch Changes

- Updated dependencies [d94beab]
  - @rulvar/core@1.74.0

## 1.73.0

### Patch Changes

- Updated dependencies [3e95bd1]
  - @rulvar/core@1.73.0

## 1.72.0

### Patch Changes

- Updated dependencies [662e9e0]
  - @rulvar/core@1.72.0

## 1.71.0

### Patch Changes

- Updated dependencies [20d02e0]
  - @rulvar/core@1.71.0

## 1.70.1

### Patch Changes

- @rulvar/core@1.70.1

## 1.70.0

### Patch Changes

- @rulvar/core@1.70.0

## 1.69.0

### Patch Changes

- Updated dependencies [b21a681]
  - @rulvar/core@1.69.0

## 1.68.0

### Patch Changes

- Updated dependencies [b227874]
  - @rulvar/core@1.68.0

## 1.67.0

### Patch Changes

- Updated dependencies [8e6006d]
  - @rulvar/core@1.67.0

## 1.66.0

### Patch Changes

- Updated dependencies [1b8987e]
  - @rulvar/core@1.66.0

## 1.65.0

### Patch Changes

- Updated dependencies [0b6b859]
  - @rulvar/core@1.65.0

## 1.64.0

### Patch Changes

- Updated dependencies [991f9b5]
  - @rulvar/core@1.64.0

## 1.63.0

### Minor Changes

- 8a28aed: Durable settlement acknowledgement and the fencing-epoch tombstone (the 1.62.0 experiment review, P0.1 and P0.2).

  Settlement acknowledgement: a NON-fencing failure of either settlement write now rejects `handle.result` with the new typed `SettlementError` (code `settlement`, retryable; `stage` names the write, `data` carries the runId and the computed run status) instead of resolving as if nothing happened. Only a superseded segment's `LeaseHeldError` stays swallowed, on both writes, because the successor owns settlement. A failed `run_settle` append also skips the terminal meta write, so the projection can never run ahead of the journal (published 1.62.0 wrote meta `ok` over a journal with no settle record when the append failed). Recovery is deterministic and free: the run's work entries are already durable, `engine.resume` replays to the same outcome without one paid provider call and re-attempts the settlement writes (a non-empty journal with no recorded settle now re-settles on pure replay), and `rulvar runs audit [--repair]` reconciles offline.

  Fencing-epoch tombstone: `SqliteStore` and `PostgresStore` no longer erase the per-run epoch high-water mark on `delete`, so a recreate of the same explicit runId always acquires a strictly higher epoch and a zombie lease from the deleted incarnation (same runId, same stable owner identity) is rejected on every fenced surface instead of fencing green. The `LeasableStore` contract now states the rule, and the conformance kit enforces it with two new mandatory checks (`fencing-epoch-tombstone` in `leasableStoreConformance`, `fenced-tombstone-zombie-rejected` in `fencedWritesConformance`). The tombstone holds only the runId and a counter, never run content; the data-protection guide documents the erasure boundary.

### Patch Changes

- Updated dependencies [8a28aed]
  - @rulvar/core@1.63.0

## 1.62.0

### Patch Changes

- Updated dependencies [fca5fd1]
  - @rulvar/core@1.62.0

## 1.61.0

### Patch Changes

- Updated dependencies [b4c1f1f]
  - @rulvar/core@1.61.0

## 1.60.0

### Patch Changes

- Updated dependencies [59bbeaa]
  - @rulvar/core@1.60.0

## 1.59.4

### Patch Changes

- Updated dependencies [c49d7a1]
  - @rulvar/core@1.59.4

## 1.59.3

### Patch Changes

- Updated dependencies [deaef36]
  - @rulvar/core@1.59.3

## 1.59.2

### Patch Changes

- Updated dependencies [dd0e10f]
  - @rulvar/core@1.59.2

## 1.59.1

### Patch Changes

- Updated dependencies [c127770]
  - @rulvar/core@1.59.1

## 1.59.0

### Patch Changes

- Updated dependencies [615dc90]
  - @rulvar/core@1.59.0

## 1.58.0

### Patch Changes

- Updated dependencies [4fa35ce]
  - @rulvar/core@1.58.0

## 1.57.0

### Minor Changes

- dc6ef2c: RV-214: the official PostgreSQL store. The new `@rulvar/store-postgres` package ships `PostgresStore`, implementing the full storage contract over node-postgres for multi-process AND multi-host deployments: `JournalStore` plus `LeasableStore` with fencing epochs, `fencedWrites` on both the journal side and the `transcripts()` twin, and the `getMeta`/`leaseTtlMs` capabilities. Payloads stay opaque TEXT (obligation A4 forbids jsonb normalization; jsonb appears only in query-side casts and expression indexes). Every run-scoped mutation runs inside one transaction that first takes a per-run advisory transaction lock, this store's translation of the sqlite BEGIN IMMEDIATE lesson: the fence check and the guarded mutation commit as ONE serialized unit across processes and hosts, at per-run granularity so unrelated runs never queue behind each other. The A5 monotonic-seq guard is one conditional INSERT under that lock, with per-instance appends chained in submission order (a genuinely async pool would otherwise let a later-submitted seq reach the server first). The lazy idempotent schema bootstrap serializes on a schema-scoped advisory lock so a fleet start over one fresh database boots clean; the `schema` option namespaces the five tables and doubles as cheap isolation. Lease expiry uses the client clock with an injectable `now` (NTP-synced hosts; the 60 s default ttl dwarfs sane drift), and one write region per run is the documented boundary. The package's own suite runs the full conformance kit, cross-instance fencing over one schema, an engine-level e2e (run on one store instance, resume from another with zero adapter calls), the adversarial multi-process soak, and the fleet boot race, all against a real postgres (gated on `RULVAR_POSTGRES_URL`; CI provides a service container). The stores guide documents options, pooling and backpressure sizing, the clock and single-write-region boundaries, and a backup/PITR runbook.

### Patch Changes

- Updated dependencies [5897232]
  - @rulvar/core@1.57.0
