---
'@rulvar/core': patch
---

Documentation: the mode (c) resume contract is now stated as it actually works. `orchestrate()` builds its workflow internally and never registers it, so bare `engine.resume(runId)` cannot resolve it; the orchestration modes guide and the resume table now document the two working forms, `engine.resume(runId, makeOrchestratorWorkflow(goal, opts))` with the original inputs or a one time registration under `defaults.workflows` with `ORCHESTRATE_WORKFLOW_NAME`, with an executable test covering both, and the troubleshooting guide gains the symptom first entry for the `rulvar-orchestrate` not registered error.
