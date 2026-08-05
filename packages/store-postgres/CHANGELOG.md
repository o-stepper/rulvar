# @rulvar/store-postgres

## 1.183.0

### Patch Changes

- Updated dependencies [dd3767c]
  - @rulvar/core@1.183.0

## 1.182.0

### Patch Changes

- Updated dependencies [144d026]
  - @rulvar/core@1.182.0

## 1.181.0

### Patch Changes

- @rulvar/core@1.181.0

## 1.180.0

### Patch Changes

- Updated dependencies [b124d26]
  - @rulvar/core@1.180.0

## 1.179.0

### Patch Changes

- Updated dependencies [1a5a85a]
  - @rulvar/core@1.179.0

## 1.178.0

### Patch Changes

- @rulvar/core@1.178.0

## 1.177.0

### Patch Changes

- Updated dependencies [94db8ff]
  - @rulvar/core@1.177.0

## 1.176.0

### Patch Changes

- Updated dependencies [a74304d]
  - @rulvar/core@1.176.0

## 1.175.0

### Patch Changes

- Updated dependencies [1999c5d]
  - @rulvar/core@1.175.0

## 1.174.0

### Patch Changes

- Updated dependencies [aa9a772]
  - @rulvar/core@1.174.0

## 1.173.0

### Patch Changes

- Updated dependencies [67d27ac]
  - @rulvar/core@1.173.0

## 1.172.0

### Patch Changes

- Updated dependencies [0d4770b]
  - @rulvar/core@1.172.0

## 1.171.0

### Patch Changes

- Updated dependencies [f6116b9]
  - @rulvar/core@1.171.0

## 1.170.0

### Patch Changes

- Updated dependencies [86e4c06]
  - @rulvar/core@1.170.0

## 1.169.0

### Patch Changes

- Updated dependencies [623b2ae]
  - @rulvar/core@1.169.0

## 1.168.0

### Patch Changes

- Updated dependencies [ebba79a]
  - @rulvar/core@1.168.0

## 1.167.0

### Patch Changes

- @rulvar/core@1.167.0

## 1.166.0

### Patch Changes

- Updated dependencies [d8262c3]
  - @rulvar/core@1.166.0

## 1.165.0

### Patch Changes

- Updated dependencies [6391274]
  - @rulvar/core@1.165.0

## 1.164.0

### Patch Changes

- Updated dependencies [9f2dda9]
  - @rulvar/core@1.164.0

## 1.163.0

### Patch Changes

- Updated dependencies [e8d9ada]
  - @rulvar/core@1.163.0

## 1.162.0

### Patch Changes

- Updated dependencies [2031e82]
  - @rulvar/core@1.162.0

## 1.161.0

### Patch Changes

- Updated dependencies [d4547b7]
  - @rulvar/core@1.161.0

## 1.160.0

### Patch Changes

- Updated dependencies [1c6f0d0]
  - @rulvar/core@1.160.0

## 1.159.0

### Patch Changes

- Updated dependencies [e881c8b]
  - @rulvar/core@1.159.0

## 1.158.0

### Patch Changes

- Updated dependencies [a266bc7]
  - @rulvar/core@1.158.0

## 1.157.0

### Patch Changes

- Updated dependencies [1883421]
  - @rulvar/core@1.157.0

## 1.156.0

### Patch Changes

- Updated dependencies [537144e]
  - @rulvar/core@1.156.0

## 1.155.0

### Patch Changes

- Updated dependencies [49b08a7]
  - @rulvar/core@1.155.0

## 1.154.0

### Patch Changes

- Updated dependencies [9259f24]
  - @rulvar/core@1.154.0

## 1.153.0

### Patch Changes

- Updated dependencies [d8bebcb]
  - @rulvar/core@1.153.0

## 1.152.0

### Patch Changes

- Updated dependencies [dd6a616]
  - @rulvar/core@1.152.0

## 1.151.0

### Patch Changes

- Updated dependencies [1de0610]
  - @rulvar/core@1.151.0

## 1.150.0

### Patch Changes

- Updated dependencies [a331211]
  - @rulvar/core@1.150.0

## 1.149.0

### Patch Changes

- Updated dependencies [08b4537]
  - @rulvar/core@1.149.0

## 1.148.0

### Patch Changes

- Updated dependencies [c85dac9]
  - @rulvar/core@1.148.0

## 1.147.0

### Patch Changes

- Updated dependencies [6367231]
  - @rulvar/core@1.147.0

## 1.146.0

### Patch Changes

- Updated dependencies [5d9bbc8]
  - @rulvar/core@1.146.0

## 1.145.0

### Patch Changes

- @rulvar/core@1.145.0

## 1.144.0

### Patch Changes

- Updated dependencies [c11bcd6]
  - @rulvar/core@1.144.0

## 1.143.0

### Patch Changes

- Updated dependencies [f412169]
  - @rulvar/core@1.143.0

## 1.142.0

### Patch Changes

- @rulvar/core@1.142.0

## 1.141.0

### Patch Changes

- Updated dependencies [4f12a62]
  - @rulvar/core@1.141.0

## 1.140.0

### Minor Changes

- 3044838: Both store limiters implement the optional `QuotaLimiter.release` (RV1103 + RV1104, the SPI method from RV1013): a cancelled admission returns exactly what it consumed, the admitted requests and the token estimate, to the window, from any process sharing the file (`SqliteQuotaLimiter`) or any host sharing the schema (`PostgresQuotaLimiter`, under the same advisory lock and generation fence as every admission). Unknown, expired, and repeated ids are no-ops; a rolled-over window already aged the estimate out; a released id settles nothing afterwards; verdicts mirror `memoryQuotaLimiter` exactly. Both reservation tables grew a `requests` column, migrated in place on boot (sqlite: a serialized `ALTER` under `BEGIN IMMEDIATE`; postgres: `ADD COLUMN IF NOT EXISTS` under the boot lock) defaulting to 1, the single request every engine admission reserves, so pre-release reservations release exactly what their admission consumed.

### Patch Changes

- @rulvar/core@1.140.0

## 1.139.0

### Patch Changes

- Updated dependencies [03a2141]
  - @rulvar/core@1.139.0

## 1.138.0

### Patch Changes

- Updated dependencies [ed0c4fb]
  - @rulvar/core@1.138.0

## 1.137.0

### Patch Changes

- Updated dependencies [96f6788]
  - @rulvar/core@1.137.0

## 1.136.0

### Patch Changes

- Updated dependencies [aa6ca71]
  - @rulvar/core@1.136.0

## 1.135.0

### Patch Changes

- Updated dependencies [cf75e22]
  - @rulvar/core@1.135.0

## 1.134.0

### Patch Changes

- @rulvar/core@1.134.0

## 1.133.0

### Patch Changes

- @rulvar/core@1.133.0

## 1.132.0

### Patch Changes

- Updated dependencies [2bec904]
  - @rulvar/core@1.132.0

## 1.131.0

### Patch Changes

- Updated dependencies [256cae1]
  - @rulvar/core@1.131.0

## 1.130.0

### Patch Changes

- Updated dependencies [d6bec7a]
  - @rulvar/core@1.130.0

## 1.129.0

### Patch Changes

- Updated dependencies [1612439]
  - @rulvar/core@1.129.0

## 1.128.0

### Minor Changes

- 27c4e38: pause_turn continuations become accounted wire units (RV905, the thirteenth experiment's fifth release risk). The Anthropic adapter absorbs server-side turn pauses by re-sending, making up to six wire requests inside ONE core dispatch; until now the request quota window, the provider call record, and the invoice row all saw one, and a per-request provider statement matched one segment while the rest read statement-only.

  The adapter's finish metadata now names the whole segment set (`providerMetadata.anthropic.wireRequests = { count, responseIds }`); the provider call record and the invoice row carry `wireResponseIds`; and the quota reconciliation settles the reservation against the TRUE wire request count. The `QuotaLimiter.reconcile` SPI gains an optional `actual.requests` argument, honored by all three reference limiters through one shared arithmetic (`quotaActualRequestsDelta`), so a window that admitted one request per reservation now reflects what the provider's own RPM meter saw; a settlement only ever adds, never denies retroactively, and implementations written against the two-argument form remain valid. `reconcileStatement` joins a multi-wire invoice row by ANY id of its segment set, all-or-nothing: a partially delivered segment set reads `partial-coverage` with its delivered segments never counted as statement-only (and never `no-overlap` when segments touched our data), and provider-reported token counts compare as the SUM over the segments against the dispatch's recorded usage. Single-wire dispatches carry none of the new fields and stay byte-identical, journals and events included.

### Patch Changes

- Updated dependencies [27c4e38]
  - @rulvar/core@1.128.0

## 1.127.0

### Patch Changes

- Updated dependencies [b3b1805]
  - @rulvar/core@1.127.0

## 1.126.0

### Patch Changes

- @rulvar/core@1.126.0

## 1.125.0

### Patch Changes

- @rulvar/core@1.125.0

## 1.124.0

### Patch Changes

- Updated dependencies [37fd1f2]
  - @rulvar/core@1.124.0

## 1.123.0

### Patch Changes

- Updated dependencies [5c46468]
  - @rulvar/core@1.123.0

## 1.122.0

### Patch Changes

- Updated dependencies [8cf45c5]
  - @rulvar/core@1.122.0

## 1.121.0

### Patch Changes

- Updated dependencies [3d67d41]
  - @rulvar/core@1.121.0

## 1.120.0

### Patch Changes

- Updated dependencies [d630c9e]
  - @rulvar/core@1.120.0

## 1.119.0

### Patch Changes

- Updated dependencies [1e4ff3c]
  - @rulvar/core@1.119.0

## 1.118.0

### Patch Changes

- Updated dependencies [f8341a3]
  - @rulvar/core@1.118.0

## 1.117.0

### Patch Changes

- @rulvar/core@1.117.0

## 1.116.0

### Patch Changes

- Updated dependencies [a213878]
  - @rulvar/core@1.116.0

## 1.115.0

### Patch Changes

- Updated dependencies [63642ae]
  - @rulvar/core@1.115.0

## 1.114.0

### Patch Changes

- Updated dependencies [5759731]
  - @rulvar/core@1.114.0

## 1.113.0

### Patch Changes

- Updated dependencies [a60807a]
  - @rulvar/core@1.113.0

## 1.112.0

### Patch Changes

- Updated dependencies [00ae55b]
  - @rulvar/core@1.112.0

## 1.111.0

### Patch Changes

- Updated dependencies [fd25169]
  - @rulvar/core@1.111.0

## 1.110.0

### Patch Changes

- Updated dependencies [58afdb5]
  - @rulvar/core@1.110.0

## 1.109.0

### Patch Changes

- Updated dependencies [85b1d39]
  - @rulvar/core@1.109.0

## 1.108.0

### Patch Changes

- Updated dependencies [affa3d4]
  - @rulvar/core@1.108.0

## 1.107.0

### Patch Changes

- Updated dependencies [9f5f6f6]
  - @rulvar/core@1.107.0

## 1.106.0

### Patch Changes

- Updated dependencies [9a4ce49]
  - @rulvar/core@1.106.0

## 1.105.0

### Minor Changes

- 531dc88: Make quota rules an immutable snapshot with a canonical denial order in all three limiters, and give the postgres limiter rotation generations, a fenced stale host, a bounded bootstrap, and strict intake (RV608).

  Immutable snapshot (all three limiters): `memoryQuotaLimiter`, `SqliteQuotaLimiter`, and `PostgresQuotaLimiter` now admit under the new exported `snapshotQuotaRules(rules)`: a validated, frozen copy carrying only the known rule fields, taken at construction. Mutating the caller's array or rule objects afterwards (a pushed rule, a reassigned cap) can no longer change a decision, a bucket key, telemetry, or the fingerprint the postgres schema records; previously the caller's live graph was read on every admission and the fingerprint was computed lazily from it at first boot. The canonical per-rule content key is also exported as `quotaRuleKey`, and every limiter folds a denial over matching rules in that canonical order, so permuted but identical rule sets now produce the byte-identical refusal object (reason and retryAfterMs), not just the same fingerprint.

  Rotation generations (postgres): `rulvar_quota_meta` now records a rules generation beside the fingerprint. Every admission re-reads both inside its own locked transaction and, on a mismatch, is refused with the new typed `QuotaGenerationError` instead of admitting under retired bucket keys, so a host that booted before a rotation is fenced rather than silently splitting the budget; its next call re-boots into the honest boot-time `ConfigError`, and its outstanding reservations age out with their window. Rotation (`acceptRulesUpdate: true`) now serializes with in-flight admissions on the same advisory lock, bumps the generation, and carries current-window consumption conservatively: a new bucket inherits the retired bucket's counters for the same `(provider, model, tenant)` dimension triple (the maximum when several retired rules share it), so a raised cap grants only the difference, a lowered cap counts what was already consumed, and a genuinely new dimension starts empty. The carry decision is conservative by design: estimates held by fenced hosts settle nowhere and age out, which errs toward under-admission inside the rotation window, never over.

  Bounded bootstrap and honest deadline phases (postgres): the bootstrap transaction now runs under the same `SET LOCAL lock_timeout` as admissions (a held boot lock used to wait unboundedly), and its connection is registered with the full-path deadline, which destroys it on expiry so an abandoned bootstrap can never commit DDL or a rotation after the caller was already refused. `QuotaDeadlineError.phase` gains `'bootstrap'`, and each phase's message now narrates only what actually happened: an `'acquire'` refusal held no connection and no longer claims one was destroyed.

  Strict intake (postgres): `acceptRulesUpdate` is runtime-checked as a real boolean (the string `"false"` used to enable rotation by truthiness), and `admissionDeadlineMs` is refused above the Node timer maximum (2147483647 ms, now exported from `@rulvar/core` as `MAX_TIMER_DELAY_MS`) before the pool is constructed; above it, the deadline timer used to clamp and refuse every admission after about a millisecond.

  Migration note: hosts running mixed rule sets over one schema now fail loud during a rotation instead of silently splitting the budget: old booted hosts receive `QuotaGenerationError` on their next admission the moment a new deployment boots with `acceptRulesUpdate: true`. That refusal is the designed rollout signal, not a regression; roll the refused hosts to the new rule set and remove the flag. Existing recorded fingerprints keep matching (the key encoding is unchanged), and pre-generation schemas are backfilled to generation 1 on the first matching boot.

### Patch Changes

- Updated dependencies [531dc88]
  - @rulvar/core@1.105.0

## 1.104.0

### Patch Changes

- @rulvar/core@1.104.0

## 1.103.0

### Patch Changes

- Updated dependencies [f2b809e]
  - @rulvar/core@1.103.0

## 1.102.0

### Patch Changes

- Updated dependencies [3eb6515]
  - @rulvar/core@1.102.0

## 1.101.0

### Patch Changes

- Updated dependencies [51b215c]
  - @rulvar/core@1.101.0

## 1.100.0

### Patch Changes

- Updated dependencies [9785bea]
  - @rulvar/core@1.100.0

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
