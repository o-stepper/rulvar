---
'@rulvar/evals': minor
---

Validate eval thresholds before they can classify anything (v1.28.0 review P2).

`rubricGrader` now throws a typed `ConfigError` at construction when `passThreshold` is not a finite fraction in [0, 1]; previously a negative threshold made every zero score verdict pass. `runSweepMatrix` validates its effective thresholds before `engineFor`, envelope reservation, or any provider and store activity: both bands must be finite fractions in [0, 1] with `weakness` strictly below `strength`, so the bands stay ordered and the uninformative mid band exists. Previously a reversed or out of range configuration turned a failing cell (pass rate 0) into a committed strength claim, which a connected ModelKnowledge store would then feed into routing as false knowledge.
