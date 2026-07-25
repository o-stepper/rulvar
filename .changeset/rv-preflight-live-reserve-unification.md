---
'@rulvar/core': minor
---

Preflight and live admission share one reserve arithmetic (the 1.63.0 experiment review, P0.3).

Published 1.63.0 drifted from the runtime in both directions for orchestrate waves. A capped orchestrator below the flat reserve made `preflightEstimate` emit the error-tier `orchestrator-cap-below-reserve` finding (exit 1 in CI) while the live run started fine, because the live dispatch admits the capped orchestrator at EXACT FILL with the `effectiveCap - committedFinalizeReserve` estimate hint. And the projection admitted children whose priced layer-1 arm was tiny while the live embedded layer-2 spawn gate, which never sees the priced estimate, rejected every one of them against the remainder net of the orchestrator's own hold.

Now the two formulas are exported pure functions the live paths themselves call, and `preflightEstimate` calls the same two: `dispatchProjectionReserveUsd` (the layer-2 spawn-gate projection: the declared estimate or the flat default, clamped by the spawn's explicit budget) and `orchestratorAdmissionEstCostUsd` (the capped orchestrator's exact-fill dispatch hint). An orchestrate wave now mirrors the runtime's two gates per spawn in live order; a plain wave keeps the parity-proven `admitSpawn` mirror. New inputs: `PreflightSpawnSpec.budgetUsd` (the spawn param; layer-2 clamp only) and `PreflightOrchestratorSpec.estInputTokens` (the uncapped orchestrator's goal-prompt stand-in). Removed: the false `orchestrator-cap-below-reserve` error finding and the `'orchestrator-cap'` deniedBy value (a tight cap is a tight loop budget, never a refused run). Three new parity tests run live orchestrations beside the projection: the capped-below-flat config, the all-children-denied wave, and the layer-2-pass-layer-1-bust spawn.
