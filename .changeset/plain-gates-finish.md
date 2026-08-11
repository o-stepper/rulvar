---
'@rulvar/core': minor
'@rulvar/plan': minor
---

The extension finish gate (RV3202). `OrchestratorExtension` gains `finishGate?()`, consulted FIRST on every ordinary coordination finish: a refusal returns as the finish tool's typed error result (nothing journals, no repair spent), so the model resolves the named blockers and finishes again; the forced-finalization and synthesis finishes are never gated. PlanRunner implements it: `finish` is now refused while any plan node is ready or running, with the stragglers named, because quiescence participation alone gated only wakes and a root could settle a bare ok while the exit barrier cancelled a running node. `allowEarlyFinish: true` restores the old behavior deliberately. Runs without an extension finish gate are byte identical. journal-shape-revision: the oscillation-freeze cassette re-recorded for the gate's live path (the scripted finish over the still-running frozen-signature node is now refused typed, and the scenario closes the straggler deliberately before finishing); already-journaled entries replay verbatim, so existing journals stay valid.
