---
'@rulvar/evals': minor
---

M11-T02: matrix sweeps (docs/05, section "Grounding and decay"). `runSweepMatrix` measures a FIXED pool (workflow x model x taskClass; sweep volume is never authorized by proposal volume) through the ordinary engine, sequentially in declaration order for deterministic cassette consumption, and aggregates per (model, taskClass) cell.

- Threshold-crossing cells emit eval-measured claims (strength at or above 0.9, weakness at or below 0.5 by default; the mid band emits nothing): typed statement templates, metrics {passRate, n, graderId}, EvidenceRef eval reports with the case ids, confidence from n, the docs/05 TTL table from observedAt, and deterministic report-scoped claim ids.
- With a store given, claims commit through the eval-committer identity (the M11-T01 gate); the sweep e2e records against fake adapters and replays hermetically from the cassette with zero live calls, byte-identical reports.
