# @rulvar/store-conformance

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

- ef08d73: Guarantee matrix and exactly-once claim hygiene (RV508); no runtime behavior changes. The isolated-executor guide now carries the guarantee matrix stating flatly who provides what: the library's layers give at-least-once execution with attempt binding and intent-before-effect, exactly-once effect execution is promised by NO library layer, and what IS exactly-once is pay and replay (the never-pay-twice invariant). The two claims the ninth comparison experiment's judge caught are rewritten to the precise statements ("each ran once" became attempt counting under a stable idempotency key; the approvals guide now says continuation is a run-level guarantee, not an effect-level one, with the at-least-once window named); `ctx.step` docs state the same window for effectful steps; a `ResolutionBy` note says the field records a channel, never a verified principal (identity, signatures, and separation of duties are host IAM). The worker header now points at the shipped `SqliteQuotaLimiter` and `PostgresQuotaLimiter` instead of denying that cross-process limiters exist. A new docs-lint sentinel forbids "exactly once" claims in the hand-written docs and in package source comments outside a vetted (file, heading anchor) allowlist (the durability pay doctrine and the guarantee matrix), and every remaining occurrence in doc prose and source comments was rewritten to the precise wording; string literals are deliberately out of scope (tool descriptions enter the toolset hash).
- Updated dependencies [ef08d73]
  - @rulvar/core@1.99.1

## 1.99.0

### Patch Changes

- Updated dependencies [9e00888]
  - @rulvar/core@1.99.0

## 1.98.0

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

### Minor Changes

- 9603940: Scope the isolated-executor idempotency key to the run incarnation (RV403, the eighth-experiment review). A fresh run stamps the additive optional `RunMeta.execKeyDerivation` field (version 2) at genesis and every resume segment carries it verbatim; version 2 keys bind the run's generation token, so a `deleteRun`-then-recreate of the same explicit runId never reuses the deleted incarnation's keys against a long-lived external dedup store, while a crash-and-resume redispatch inside one incarnation keeps its key exactly as before. Runs recorded without the stamp derive the original genesis-free version 1 keys for their whole life, across resume and upgrade, so external dedup state accumulated for them stays valid; a recorded derivation the engine does not know, or a version 2 stamp whose store dropped the genesis token, is a typed resume refusal when executors are configured, never a silent fallback. The store conformance kit now checks the field's round trip alongside `genesis`.

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

### Minor Changes

- 9cc5d66: The free-cleanup harvest (cycle 80). `leasableStoreConformance` gains the `expiry` option: the mandatory lease checks follow the suite's no-wall-clock convention, so the harness now hands them a store whose ttl no scheduler stall can cross, and only the wall-clock expiry check keeps a short-ttl store of its own; the legacy single-`ttlMs` pairing let one CI stall past 150 ms expire a just-acquired lease inside a fencing check (the flake observed on Node 22). All three shipped harnesses move to the split pairing, and the store-authors guide stops recommending the flaky shape. In `@rulvar/cli`, worker retention is no longer slot-bound: a worker whose every concurrency slot is busy still applies retention over settled runs during its sweeps instead of starving until idle. In `@rulvar/core`, concurrent cold `tools()` calls on an MCP source share one in-flight `tools/list` fetch instead of each sweeping the list, and `AdmissionController`'s `maxTotalSpawns` TSDoc now tells the truth: it is the controller-lifetime cap on admitted spawns for hosts driving the controller directly (pinned by a test), while engine runs cap totals through `budgetDefaults.lifetimeSpawnCap`; the old comment claimed it was the per-orchestrate `maxSpawns`.

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

- ac57099: Kill-point suite hardening against loaded test runners: the worker's default lease ttl rises from 300 ms to 2000 ms, because a scheduler stall past the ttl between the worker's own renewals cancels the run by contract BEFORE the kill point is reached (the worker then exits zero as ran-to-completion and the scenario reads a self-inflicted takeover as a violation); the referee's post-kill wait is now the resume retry loop itself (each attempt against a live lease rejects typed with zero writes, so polling is free) instead of a fixed sleep; and the ran-to-completion violation names the worker's settled status for diagnosability. Only the killed owner is short-leased; referees and successor instances belong on their store's generous default ttl.
  - @rulvar/core@1.70.1

## 1.70.0

### Minor Changes

- 29141ed: The engine-level kill-point suite (the 1.65.0 experiment review, P1.10): `killPointConformance` spawns a child process that drives a scripted engine run over the consumer's store and SIGKILLs itself around each durable write, both brackets of all five points (the running entry, the ok terminal, the limit terminal, the run settle decision, the meta projection), then resumes the run from the referee process after the dead owner's lease lapses and asserts the documented recovery semantics with exact provider re-pay counts: the lost ok terminal is the only bracket that pays a step twice (the at-least-once window), a lost limit terminal re-pays only the turns since the last transcript boundary (the checkpoint restore), a durable limit terminal in a never-settled run re-runs the agent live in full (the second chance), and the settle and meta brackets recover as pure replays with exactly one ok run settle, a healed meta, and a contiguous journal. A worker that runs to completion is a violation, never a pass. `runKillPointWorker` plus `killPointWorkerConfigFromEnv` keep the consumer's writer script to a few lines, `runKillPointScenario` runs one scenario standalone, and `KILL_POINT_SCENARIOS` is the pinned table. `SqliteStore` and `PostgresStore` run the whole table in their own test suites (postgres gated on `RULVAR_POSTGRES_URL`).

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

### Patch Changes

- Updated dependencies [5897232]
  - @rulvar/core@1.57.0

## 1.56.0

### Patch Changes

- Updated dependencies [f26dba0]
  - @rulvar/core@1.56.0

## 1.55.0

### Patch Changes

- Updated dependencies [e9b005b]
  - @rulvar/core@1.55.0

## 1.54.0

### Patch Changes

- Updated dependencies [3f6bc03]
  - @rulvar/core@1.54.0

## 1.53.0

### Patch Changes

- Updated dependencies [b821bd1]
  - @rulvar/core@1.53.0

## 1.52.0

### Patch Changes

- Updated dependencies [e138df9]
  - @rulvar/core@1.52.0

## 1.51.0

### Patch Changes

- @rulvar/core@1.51.0

## 1.50.0

### Patch Changes

- Updated dependencies [e39a885]
  - @rulvar/core@1.50.0

## 1.49.0

### Patch Changes

- Updated dependencies [bab7b2c]
  - @rulvar/core@1.49.0

## 1.48.0

### Minor Changes

- 96093ea: Ship the adversarial multi-process soak and fix the SqliteStore concurrent-boot race it found (the fenced run state RFC, phase 3's last open item).

  The conformance kit gains the soak harness: `runMultiProcessSoak` spawns real OS processes that storm one store location through EVERY fenced write surface (journal append, meta write, transcript blob put and delete, fenced run deletion, renew, release) with stalls injected past the lease ttl, then rebuilds the one serial history the fencing epochs promise (accepted mutations ordered by epoch and per-tenure counter) and diffs it against the actual journal, meta row, and blobs. Any stale acceptance, lost accepted write, epoch inversion, or divergent final byte is a violation. The stale probe sweep re-reads the journal tail before each stale append attempt, so the monotonic-seq guard cannot mask a fencing hole; a live lease is also probed against a foreign run, and side runs get full create-and-fenced-delete cycles. The storm runs until an activity quorum is met (takeovers, per-surface accepted writes, typed stale rejections), so a slow machine storms longer instead of asserting on thin coverage. The child side is `runSoakWriter` plus `soakWriterConfigFromEnv` (the consumer's writer script constructs its store bare and passes a `retryable` hook for backend contention errors); the pure referee `verifySoakHistory`, the report tools `parseSoakReport` and `countSoakActivity`, and the quorum types are exported alongside.

  The soak's first storm against the published 1.47.0 never reached the fencing: N processes constructing `SqliteStore` over one SAME fresh file (an ordinary fleet start) collided in the constructor's schema bootstrap and the losers died with a raw SQLITE_BUSY (a 60 percent crash rate at six concurrent boots). A driver busy_timeout is not enough because the journal-mode conversion skips the busy handler on some lock transitions, so the constructor now retries the idempotent bootstrap as a unit through the SQLITE_BUSY family (extended result codes included, e.g. SQLITE_BUSY_RECOVERY while a sibling recovers the fresh WAL) under a wall-clock bound, exported as `BOOT_BUSY_TIMEOUT_MS`. Every runtime contention path keeps the documented fail-fast semantics. With the fix, 480 of 480 concurrent boots succeed, and the full storm (five writers, hundreds of takeovers, thousands of stale probes) holds every fenced surface with zero violations; `SqliteStore` now runs the soak and a concurrent-boot regression in its test suite.

### Patch Changes

- @rulvar/core@1.48.0

## 1.47.0

### Patch Changes

- Updated dependencies [a3687fe]
  - @rulvar/core@1.47.0

## 1.46.0

### Minor Changes

- 865e7bf: Close finding F2 of the fenced run state RFC with the sqlite transcript twin. `SqliteStore.transcripts()` returns a `TranscriptStore` that declares `fencedWrites` because its blobs live in the store's own database, beside the lease rows: a lease-carrying `put` or `delete` verifies the current holder of the run the ref's leading path segment names atomically with the blob mutation, in the same one-immediate-transaction shape as the journal side, and rejects stale or cross-run holders with the typed `LeaseHeldError` leaving the prior blob byte intact. Demonstrated against the published 1.45.0 first: the engine threaded the superseded segment's lease into its late checkpoint save, both shipped transcript stores ignored it, and the blob at the deterministic ref both segments share regressed to older turn state (the state a later boot decodes, replaying turns the successor already paid for) while the same holder's journal append bounced typed. Over the `{ journal: store, transcripts: store.transcripts() }` pair, `assertFencedWrites` now passes and every durable run mutation is fenced. The conformance kit gains `fencedTranscriptsConformance`, the executable definition of the transcript-side promise, taking a factory for the pair that shares the fencing domain; staleness is produced with release plus reacquire, so the suite needs no wall sleeps.

### Patch Changes

- Updated dependencies [865e7bf]
  - @rulvar/core@1.46.0

## 1.45.0

### Minor Changes

- b96305d: The fenced writes capability (the fenced run state RFC, phase 2). `JournalStore.putMeta` and `delete` and `TranscriptStore.put` and `delete` accept the same optional trailing lease that `append` always took, and a store declares enforcement with the `fencedWrites: true` marker: a mutation carrying a lease that is not the current holder for the mutated run rejects with the typed `LeaseHeldError`, atomically and leaving nothing changed, including a live lease for a different run. The engine threads the segment's lease into every durable mutation of a leased resume (meta writes, checkpoints, compaction summaries, worktree patches, workflow sources), so over a declaring store a superseded worker can no longer overwrite the successor's meta at its late settle and strand the run from worker sweeps, and its very first refused meta write now fails the stale segment typed at boot with zero paid calls. `SqliteStore` declares the marker and enforces it on `putMeta`, `delete`, and `append` (with the run-match rule as defense in depth); the conformance kit gains `fencedWritesConformance` as the capability's executable definition; the queue worker's retention sweep passes its brief lease through the new optional second argument of `engine.deleteRun` (`pruneRun` takes the same); and `hasFencedWrites` plus `assertFencedWrites` let a host assert the full fence at deployment time. Stores written before the capability are untouched: without the marker the extra argument is ignored and the journal-append fence works exactly as before.

### Patch Changes

- Updated dependencies [b96305d]
  - @rulvar/core@1.45.0

## 1.44.1

### Patch Changes

- @rulvar/core@1.44.1

## 1.44.0

### Patch Changes

- Updated dependencies [299f7d2]
  - @rulvar/core@1.44.0

## 1.43.0

### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0

## 1.42.0

### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0

## 1.41.0

### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0

## 1.40.0

### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0

## 1.39.0

### Patch Changes

- @rulvar/core@1.39.0

## 1.38.0

### Patch Changes

- @rulvar/core@1.38.0

## 1.37.0

### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0

## 1.36.0

### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0

## 1.35.0

### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0

## 1.34.0

### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

## 1.33.0

### Patch Changes

- @rulvar/core@1.33.0

## 1.32.0

### Patch Changes

- @rulvar/core@1.32.0

## 1.31.0

### Patch Changes

- @rulvar/core@1.31.0

## 1.30.0

### Patch Changes

- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

## 1.29.0

### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

## 1.28.0

### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

## 1.27.0

### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

## 1.26.0

### Minor Changes

- a4fc757: `SqliteStore` implements the exact lookup capability (`getMeta` as a primary key query) and narrows `status`, `statuses`, and `name` in SQL over the JSON payload behind new expression indexes (created idempotently, so existing database files gain them on the next open), so a selective `listRuns` reads only the matching rows instead of decoding the whole catalog; the tags containment check stays in JS over the reduced set with unchanged semantics. The conformance kit checks the `genesis` round trip, that a `statuses` filter never drops a matching meta (supersets stay allowed), and that a store exposing `getMeta` agrees with `listRuns` and resolves `undefined` for a missing run. The planner's deterministic plan lookup reads one meta through the capability instead of scanning the catalog.

### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

## 1.25.0

### Patch Changes

- @rulvar/core@1.25.0

## 1.24.1

### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

## 1.24.0

### Minor Changes

- 2b033e8: Record the genesis args binding in RunMeta and make the dry-run preview mutation-free (the v1.23.0 review). `RunMeta` gains `argsProvided` (whether the run started with defined args) and `argsHash` (sha256 over the JCS canonical serialization of the genesis args, never the raw value), written by the engine at genesis and preserved verbatim by every resume segment, so hosts can refuse a resume whose re-supplied args silently diverge from the original invocation; the new public `hashRunArgs()` derives the same hash host-side. Legacy metas never gain the marker retroactively, and unserializable args record presence without a hash. A `dryRun` resume now performs ZERO store mutations by invariant: `putMeta` is skipped entirely (no status flip, no `segments` bump), the compiled-source blob is not re-put, and the Replayer's single append site refuses any journal append under replay-strict with a typed `JournalMissError`. The store conformance kit checks the round-trip of both new fields.

### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

## 1.23.0

### Minor Changes

- 1f9c272: PlanRunner spawn telemetry, the missing evals export, and the conformance kit's new meta field (v1.22.0 review P2-5, P2-6, P1-2).

  - `@rulvar/plan`: PlanRunner journals every admission INSIDE a carrying entry (decomposition rows in escalation decisions, ladder-verdict respawns, reuse and graft links, revision admissions) and emitted no `spawn:admitted`/`spawn:rejected` at all; a live PlanRunner run with admitted roots showed an event count of zero. Every embedded admission row now announces through one formatter, identically on the live path and on replay absorb, with `replayed: true` on recovered rows, `entryRef` on the journaled carrying entry, and `agentType` resolved from the landed specs.
  - `@rulvar/evals`: `agentTypeRuleHolds` joins the package root next to `rungRuleHolds`, exactly as the v1.21.0 changelog had already announced; a public-API test now imports the checkpoint quartet from the root. The evals guide gains a full measured-value checkpoint section (ladder/pool/cell/arm vocabulary, both criteria, the vacuous-pass guard, cost discipline, a runnable example).
  - `@rulvar/store-conformance`: the meta round-trip case now also pins the new optional `RunMeta.segments` field, which the engine bumps durably at every resume to keep event `seq`/`spanId` unique per run.

### Patch Changes

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

## 1.22.0

### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

## 1.21.0

### Patch Changes

- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0

## 1.20.0

### Patch Changes

- Updated dependencies [9367030]
  - @rulvar/core@1.20.0

## 1.19.0

### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0

## 1.18.0

### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

## 1.17.0

### Patch Changes

- @rulvar/core@1.17.0

## 1.16.2

### Patch Changes

- @rulvar/core@1.16.2

## 1.16.1

### Patch Changes

- @rulvar/core@1.16.1

## 1.16.0

### Patch Changes

- @rulvar/core@1.16.0

## 1.15.0

### Patch Changes

- @rulvar/core@1.15.0

## 1.14.0

### Patch Changes

- @rulvar/core@1.14.0

## 1.13.0

### Patch Changes

- @rulvar/core@1.13.0

## 1.12.0

### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

## 1.11.0

### Minor Changes

- 0c70c5e: New mandatory obligation A5, monotonic seq: three new checks reject stores that persist duplicate or stale seqs. `a5-monotonic-seq` (a duplicate or stale append rejects with code `journal_order_violation` and never becomes visible, while the true next seq still lands), `a5-stale-tail-race` (two writers appending the same next seq: exactly one persists, the loser observes the typed conflict, reload shows a strictly increasing order), and `a5-stale-replayer-fencing` (the same race driven through two kernel Replayers from one loaded tail). The `CommunityMemoryStore` walkthrough listing gains the guard in step with `docs/guide/store-authors.md`. Third-party stores that pass the previous kit but accept duplicate seqs will fail the new checks until they add the guard; the obligation is documented in `guide/stores` and `guide/store-authors`.

### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0

## 1.10.0

### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

## 1.9.0

### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

## 1.8.0

### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0

## 1.7.0

### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0

## 1.6.0

### Patch Changes

- da4dbad: Write the product name as Rulvar in prose: package READMEs, npm descriptions, and the
  documentation site now capitalize the brand. Identifiers keep their exact casing, so
  package names, the `rulvar` binary, `rulvar.config.mjs`, the `.rulvar` store directory,
  the `rulvar.*` OTel attributes, and every URL are unchanged. Documentation and metadata
  only; no runtime behaviour changes.
- Updated dependencies [da4dbad]
- Updated dependencies [487da86]
- Updated dependencies [df416fc]
- Updated dependencies [a737810]
- Updated dependencies [9eb66b4]
  - @rulvar/core@1.6.0

## 1.5.2

### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2

## 1.5.1

### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1

## 1.5.0

### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0

## 1.4.0

### Minor Changes

- c4f563d: Production readiness fixes from the July 2026 full audit.

  - The `budgetUsd` ceiling now survives resume: the engine records it in `RunMeta.budgetUsd` and restores it on every resume, so the replayed spend counts against the original invocation's bound and `ResumeOptions` still exposes no way to raise it. Journals written before the field existed (or read through a store that drops optional `RunMeta` fields) resume uncapped, exactly as before; the conformance kit gains a round-trip check so custom stores cannot drop the field silently.
  - `spawn:rejected` and `resolution:applied` / `resolution:superseded` are now emitted: live admission rejections carry the rejection `code`, `agentType`, and the journaled decision `entryRef` (absent only for pre-admission config gates), and live resolution attempts report winning or losing the first-closing-wins fold. `spawn:admitted` now carries the decision `entryRef` and the admitting `verdict` arm. The `orchestrator:budget` union member now types the two payload shapes actually emitted; `journal:compat` stays declared but unemitted (the scan runs before a run's event stream exists) and its TSDoc says so.
  - `toOtel` implements real parent-child span nesting when `contextApi` and `setSpan` are passed; without them spans stay flat but attributed.

  - `'readonly'` isolation now compiles a deny rule for tools declaring risk `write` or `destructive` into the spawn's permission chain, exactly as the tools guide documents; read tools and other isolation modes are unaffected.
  - VCR `replay()` refuses a cassette recorded outside the engine's hashVersion support window (`[CURRENT-1, CURRENT]`) with a typed `ConfigError` instead of silently drifting; in-window cassettes replay as before.
  - `InMemoryStore` accepts `{ quiet: true }` to opt out of the durability warning, and the warning text now states the precise truth: nothing survives a process exit and cross-process resume is impossible (same-process resume of a kept instance works). `createTestEngine` constructs its store quietly, so the blessed offline tier no longer prints a misleading warning.
  - The bare `Date.now()` / `Math.random()` development warnings no longer blame workflow code for calls that originate in library internals (the engine's own retry jitter, provider SDKs): the retry jitter uses a natively captured `Math.random`, and the in-process guard skips callers that live under `node_modules`.
  - `rulvar run --profile` now applies the profile's per-role effort hints: entries in `defaults.routing` that carry no effort are seeded from `RunProfile.effortByRole` (an explicit host effort always wins; ladder entries and unrouted roles stay untouched).
  - `rulvar --help` documents the shipped `kb inbox` and `kb gate` subcommands.
  - The unscoped `rulvar` pointer package ships TypeScript declarations (`index.d.ts` with a `types` export condition), so strict TypeScript projects can import the bare name; the install smoke gate now packs and checks the pointer alongside the umbrella.

### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0

## 1.3.2

### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2

## 1.3.1

### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1

## 1.3.0

### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0

## 1.2.0

### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0

## 1.1.0

### Patch Changes

- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

## 1.0.0

### Minor Changes

- 5f0fdcd: M9-T03: community adapter and store guides (docs/10 section 3.10; docs/11 M9 exit row "conformance kits published as community guides").

  - New informative docs: `docs/guide-adapter-authors.md` (wire mapping requirements, the Usage invariant checklist, caps posture, an adapter skeleton template, and the VCR-based contract-test pattern with record and hermetic replay legs) and `docs/guide-store-authors.md` (the storage contracts A1-A4 plus leasing and fencing, a complete minimal LeasableStore walkthrough with an injectable clock and release-surviving epochs, conformance kit wiring, common failure modes, and publishing checklists). Both are indexed in the docs README inventory.
  - @rulvar/store-conformance gains the dogfood suite: the guide's CommunityMemoryStore walkthrough listing runs VERBATIM through journalStoreConformance and leasableStoreConformance in CI, so the acceptance ("a third-party mock store built only from the guide passes conformance") holds permanently and the guide's code cannot rot.

### Patch Changes

- Updated dependencies [0e0b569]
- Updated dependencies [b28b7a3]
- Updated dependencies [b53a89e]
- Updated dependencies [4454175]
- Updated dependencies [6599ca8]
- Updated dependencies [6649e5f]
- Updated dependencies [fd2f83b]
- Updated dependencies [01d6b2d]
- Updated dependencies [9a20dbb]
- Updated dependencies [0fbe7ea]
- Updated dependencies [ebe0abc]
- Updated dependencies [a3079d0]
- Updated dependencies [596a39b]
- Updated dependencies [464ab6e]
  - @rulvar/core@1.0.0

## 0.9.0

### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

## 0.8.0

### Patch Changes

- Updated dependencies [85d55cf]
- Updated dependencies [b88c9e3]
- Updated dependencies [f3c4613]
- Updated dependencies [a41c20f]
- Updated dependencies [f4e70be]
- Updated dependencies [75d1646]
- Updated dependencies [0627413]
- Updated dependencies [55c0f87]
- Updated dependencies [fd33871]
- Updated dependencies [e70e7f4]
- Updated dependencies [bc9c903]
  - @rulvar/core@0.8.0

## 0.7.0

### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

## 0.6.0

### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0

## 0.5.0

### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

## 0.4.0

### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0

## 0.3.0

### Minor Changes

- 43444f6: M2-T11/T12: the executable store conformance kit and the M2 gating
  cassettes with frozen fixtures.

  @rulvar/store-conformance ships its first real API: journalStoreConformance
  (A1 append atomicity, A2 total per-run order, A3 read-your-writes, A4
  opaque payload with read-side-only normalization, meta separation, the
  golden fold-state fixture with a frozen reference hash, the decide-once
  oracle, and the abandon-derived-skip fixture) and leasableStoreConformance
  (typed LeaseHeldError on held acquire, monotonic fencing epochs,
  stale-epoch appends rejected and invisible, released leases fenced from
  renew and append, optional ttl/renew-cadence timing checks), plus
  registerConformance for Vitest/Jest and the stableStringify fold-state
  hasher. InMemoryStore and JsonlFileStore pass; deliberately broken stores
  (reordering, normalizing, tearing, fencing-less) fail loudly.

  @rulvar/core kernel closes three DEF-1/DEF-4 gaps the cassettes gate: an
  abandon-covered hanging dispatch derives skipped instead of redispatching,
  abandon-covered operations contribute a zero ledger increment, the resume
  report lists covered entries as skipped (never orphaned), and an abandon
  over an already-resolved suspension folds to a noop with already_resolved
  (first-closing-wins per target, both closer kinds).

  @rulvar/testing ships the M2 cassette suite over committed frozen
  fixtures: the DEF-1 synthetic subset (abandon-subtree, memoize-classifier,
  v1-journal-on-v2), the DEF-4 set (timeout-vs-live-race,
  class-decision-fanout, abandon-then-crash-then-resume,
  abandon-vs-resolution-race, offline-invalid-then-valid,
  double-abandon-idempotent), the DEF-6 six IDs (resume-v1-on-engine-v2,
  resume-v1-with-inserted-call, suspended-v1-resolves-on-v2,
  reject-version-too-old via deriverV0Synthetic, reject-version-from-future,
  effort-defaults-shift), the mandatory mixed-version scenarios
  (ordinal-space split, forward-cursor preference, cross-version
  resolution, the compatibility and never-pay-twice-through-upgrade
  lemmas), and KeyDeriver contract tests against the frozen v2 golden
  identities including the docs/03 worked example. Fixture regeneration is
  deliberate: scripts/record-m2-cassettes.mjs rebuilds, and CI write
  protection (scripts/check-frozen-fixtures.mjs plus fixtures.sha256)
  fails any fixture diff shipped without the explicit bump token (the
  hyphenated compound of hashVersion and bump) in a changeset.

### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0

## 0.1.0

### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0
