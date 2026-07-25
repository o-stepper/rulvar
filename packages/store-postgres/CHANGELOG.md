# @rulvar/store-postgres

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
