---
'@rulvar/plan': minor
---

Make the guards fallback `'fail-run'` a real failure policy (v1.35.0 review P2). After the journaled guard verdict the PlanRunner terminates the orchestration with `FailRunError` (`data.source: 'plan_guards'`, `data.verdictRef`) through the new extension terminate capability: no further model turn is consulted, the run ends with outcome `error`, and a resume re folds the verdict at boot and rolls the same failure forward with zero model calls. `reject-revision` and `finish-with-partial` keep their historical steer to finish behavior.
