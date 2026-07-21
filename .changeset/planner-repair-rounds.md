---
'@rulvar/planner': minor
---

Validate `PlanOptions.repairRounds` as a nonnegative integer before the runId derivation, the store lookup, and any provider dispatch (v1.35.0 review P2). Unvalidated, NaN produced zero drafts with an `after NaN drafts` rejection, a fraction over ran by a draft, and `Infinity` turned the self repair limiter into an unbounded paid loop.
