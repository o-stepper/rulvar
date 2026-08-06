---
'@rulvar/core': minor
---

Every agent terminal returns its live exposure holds (RV2001). The third parity rerun died on the hole: three children killed pre-wire by the in-flight exposure cap left $0.478 of live dispatch estimates parked against the cap forever, and the root's exposure wait starved on money no live dispatch was holding. Holds are now attributed to the invocation whose dispatch they cover; every settle of that invocation (ok, error, exhausted, cancelled, thrown paths included) releases whatever a lost attempt closure leaked and wakes the parked waiters, a late closure can no longer eat the money of another holder, and the live total snaps to exactly zero when the last hold of any kind is gone. `RunBudget.releaseExposureHolder` and `RunBudget.liveExposureHolderCount` publish the surface; zero holders beside live waiters is the drained signal the wait machinery keys on.
