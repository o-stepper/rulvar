---
'@lurker/core': minor
---

M2-T07/T08: suspension machinery (DEF-4). Strict ResolutionPayload and
AbandonPayload with the normative by-source mapping; the
first-closing-wins ResolutionFold (schema validation at consumption
against the schema pinned inside the suspended entry, invalid offline
resolutions never close, abandon coverage with transitive child
scope-prefix and the AbandonFold projection consumed by the replay
predicate); the per-target FIFO ResolutionArbiter (classify, durable
append, settle exactly once; losing attempts are journaled noops); rule
O2 hard errors on forward or dangling refs; Replayer
resolveSuspended/abandonBranch/suspensionState; ctx.awaitExternal (NO
deadline in v1, duplicate key in scope is a typed error) with run
outcome 'suspended' plus pending[] on quiescence; and
RunHandle.resolveExternal returning ResolutionOutcome, validating live
payloads BEFORE append and journaling nothing on InvalidResolutionError.
