---
'@rulvar/core': patch
---

Two fixes from the v1.59.0 external experiment review. `CostReport.byRole.synthesize` folded to `NaN` in the journal cost report and in settled run outcomes because the role-bucket initializer predated the `synthesize` role; the initializer is now an uncast exhaustive literal, so a future role that misses it is a compile error instead of a NaN bucket. The engine's own retry jitter defaulted to the live `Math.random`, which the bare-nondeterminism detector classified as workflow provenance when rulvar is imported from a checkout build rather than `node_modules`; the default retry rng is now bound at module load, the same convention as the engine clock, so engine-internal retries never emit `RULVAR_BARE_MATH_RANDOM` or fail a run under `determinism.mode: 'error'`.
