---
'@rulvar/core': minor
---

One judge label predicate for both critical path surfaces (RV3302). The final claim consistency pass dispatches under `claim-consistency-judge-final` (RV2509); the live `reduceCriticalPath` compared the span label for exact equality while the journal fold accepted the suffix, so the 2026-08-12 comparison run reported `semanticJudgeMs` 0 on the live surface, with the whole 272923 ms window read as final composition, while the journal fold correctly split 224864 against 48059. Both folds now classify through the exported `isClaimJudgeLabel()`, and a parity test pins that run's shape to the same split on both surfaces.
