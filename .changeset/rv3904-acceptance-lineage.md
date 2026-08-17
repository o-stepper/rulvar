---
'@rulvar/core': minor
'@rulvar/evals': minor
---

The verdict lineage on the acceptance envelope (RV3904, the fourth comparison experiment): the run's terminal read `findings: 0` over a lineage whose first judge pass had caught a real contradiction, and only the journal could say so. Under the armed claim repair round, `claimConsistencyMeta` now carries `passes`, `firstPassFindings` (when passes exceeds 1), and `semanticRepairRounds`, so a repaired verdict is distinguishable from a clean first one on the envelope; absent fields mean NOT RECORDED (no round armed, or an older journal), and the mechanical `repairsUsed` keeps its byte contract untouched. Beside it, the acceptance envelope gains `deterministicPatches` (the RV3801 machine-patch aggregate: accepted decisions, total patches, the last patch's canonical before/after hashes), derived from the same journaled finish decisions the patches live on, so live and resumed envelopes agree by construction. The sectional and deterministic-patch kit scenarios pin the lineage and the aggregate; two mutation probes pin the pass count and the envelope block; the observability guide documents what zero findings does and does not mean.
