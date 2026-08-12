---
'@rulvar/core': minor
---

The evidence call floor accepts a journal observed prior (RV3309). `EvidenceContract.calibration` carries the `callsPerEntry` figure `toolCalibrationFromJournal` folds from a prior run of the same profile (fractional on purpose) plus a `source` label; `preflightEstimate` computes the evidence call floor from the HIGHER of the declared estimate and the prior, never the lower, and names a raise in an `evidence-estimate-below-observed` info finding. The 2026-08-12 comparison run observed 4.211 calls per entry where the default estimate says 3: a floor computed from the wish is how an evidence contract meets a cap it cannot actually fit. Contracts without a calibration are byte identical, integer floors included.
