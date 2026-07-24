---
'@rulvar/core': minor
'@rulvar/store-sqlite': minor
'@rulvar/store-postgres': minor
'@rulvar/store-conformance': minor
---

Durable settlement acknowledgement and the fencing-epoch tombstone (the 1.62.0 experiment review, P0.1 and P0.2).

Settlement acknowledgement: a NON-fencing failure of either settlement write now rejects `handle.result` with the new typed `SettlementError` (code `settlement`, retryable; `stage` names the write, `data` carries the runId and the computed run status) instead of resolving as if nothing happened. Only a superseded segment's `LeaseHeldError` stays swallowed, on both writes, because the successor owns settlement. A failed `run_settle` append also skips the terminal meta write, so the projection can never run ahead of the journal (published 1.62.0 wrote meta `ok` over a journal with no settle record when the append failed). Recovery is deterministic and free: the run's work entries are already durable, `engine.resume` replays to the same outcome without one paid provider call and re-attempts the settlement writes (a non-empty journal with no recorded settle now re-settles on pure replay), and `rulvar runs audit [--repair]` reconciles offline.

Fencing-epoch tombstone: `SqliteStore` and `PostgresStore` no longer erase the per-run epoch high-water mark on `delete`, so a recreate of the same explicit runId always acquires a strictly higher epoch and a zombie lease from the deleted incarnation (same runId, same stable owner identity) is rejected on every fenced surface instead of fencing green. The `LeasableStore` contract now states the rule, and the conformance kit enforces it with two new mandatory checks (`fencing-epoch-tombstone` in `leasableStoreConformance`, `fenced-tombstone-zombie-rejected` in `fencedWritesConformance`). The tombstone holds only the runId and a counter, never run content; the data-protection guide documents the erasure boundary.
