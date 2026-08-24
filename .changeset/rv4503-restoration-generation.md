---
'@rulvar/core': minor
'@rulvar/store-sqlite': minor
'@rulvar/store-postgres': minor
'@rulvar/store-conformance': minor
---

The restoration generation (RV4503, plan 45, rfcs/effects.md section 4.5, item 3): SqliteStore and PostgresStore implement the `EffectLaneStore` capability, carrying a restoration generation OUTSIDE the journal bytes (a one-row table beside the leases). The restore runbook is one rule: after a point-in-time restore, call `bumpRestorationGeneration()` BEFORE the restored database becomes reachable to any worker, so the effect lane comes up with dispatch disabled by construction until an operator appends a fresh `effect_epoch` citing the bumped generation. The new `effectLaneStoreConformance` suite in @rulvar/store-conformance is the executable definition: generation starts at 0 and bumps monotonically (ELS1, ELS2), a bumped generation refuses every lane append until the fresh epoch (ELS3, the kill point 25 window, driven through the real writer over the real store), and a lane append under a non-current lease dies on the store's fence with nothing consumed (ELS4, the kill point 16 shape).
