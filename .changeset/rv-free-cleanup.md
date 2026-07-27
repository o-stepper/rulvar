---
'@rulvar/store-conformance': minor
'@rulvar/core': patch
'@rulvar/cli': patch
---

The free-cleanup harvest (cycle 80). `leasableStoreConformance` gains the `expiry` option: the mandatory lease checks follow the suite's no-wall-clock convention, so the harness now hands them a store whose ttl no scheduler stall can cross, and only the wall-clock expiry check keeps a short-ttl store of its own; the legacy single-`ttlMs` pairing let one CI stall past 150 ms expire a just-acquired lease inside a fencing check (the flake observed on Node 22). All three shipped harnesses move to the split pairing, and the store-authors guide stops recommending the flaky shape. In `@rulvar/cli`, worker retention is no longer slot-bound: a worker whose every concurrency slot is busy still applies retention over settled runs during its sweeps instead of starving until idle. In `@rulvar/core`, concurrent cold `tools()` calls on an MCP source share one in-flight `tools/list` fetch instead of each sweeping the list, and `AdmissionController`'s `maxTotalSpawns` TSDoc now tells the truth: it is the controller-lifetime cap on admitted spawns for hosts driving the controller directly (pinned by a test), while engine runs cap totals through `budgetDefaults.lifetimeSpawnCap`; the old comment claimed it was the per-orchestrate `maxSpawns`.
