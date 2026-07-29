---
'@rulvar/core': minor
---

Alias recovered child attempts by admission identity, so a restored coordinator's old handles reach the reborn attempt (RV609).

The handle-stability alias required the old and new running entries to share `(scope, key, ordinal)`, but occurrence ordinals are strictly monotonic per `(scope, key)`: a rerun always takes the NEXT ordinal, so the alias was unreachable for ANY rerun, not just a cancelled child. A restored coordinator transcript that kept calling the handle it saw (`await_all`, `cancel_agent`, `get_child_result`) got `unknown handle` repair turns instead of the reborn attempt and could exhaust before the acceptance policy or the `minSpawnedChildren` floor (RV507) was ever evaluated. The seam predates the ninth plan: it shipped in v1.7.0.

Recovery now aliases by what is actually stable, the admission identity: every prior attempt's RUNNING row of the redispatched admission's `(scope, key)` under the pinned child scope aliases to the reborn record (every handle is a running row's seq, so the claimable set is exactly the prior running rows; a terminal is a separate row and never a handle). A transiently claimed same-key sibling is content-interchangeable and is rebound the moment its own redispatch lands. Because several handles can now map to one record, every roster-shaped walk (wake digests, quiescence, finish-validation children, the forced-finish fold, incremental synthesis reconciliation, the acceptance decision, and the synthesis digest, now one row per spawn under its current handle) iterates the per-spawn-ordinal roster instead of the handle map, so an aliased child is never counted or digested twice. Without aliases the per-spawn walks are byte-identical to the old per-handle ones, so synthesis prompt bytes and existing journals roll forward unchanged.

Fresh runs are byte-identical; the change is confined to recovery. Also freezes the clock in a real-clock store-postgres test that could straddle a minute boundary in CI (test-only).
