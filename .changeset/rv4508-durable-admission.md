---
'@rulvar/store-sqlite': minor
'@rulvar/store-postgres': minor
'@rulvar/core': minor
---

Durable admission over sqlite and postgres (RV4508, plan 45, rfcs/admission.md section 9): `SqliteAdmissionScheduler` and `PostgresAdmissionScheduler` persist the scheduler's WHOLE state as one plain-JSON document (`AdmissionState`, now exported with `snapshot()` and hydration on the reference core), committed atomically per lifecycle call inside a BEGIN IMMEDIATE transaction (sqlite) or an advisory-lock-serialized transaction (postgres). This is the RFC's first shipped durable shape, recorded as a deliberate decision: a single scheduler over durable state with deterministic ordering, where "state moved AND buckets moved" holds trivially because the whole document commits or none of it does; per-row schemas are an optimization the SPI does not require. A queued ticket survives its holder with position and arrival identity intact, re-enqueueing the same (unitId, generation) returns the SAME ticket, and settlement operation ids replay as durable no-ops across holders (a late-settlement debt entry lands exactly once).
