---
'@rulvar/core': minor
---

Spawned children wait out exposure refusals instead of dying (RV2002). The third parity rerun terminally killed three of four workers, each ~550k tokens into research, with a pre-wire in-flight exposure refusal that would have been a parking for the root. Orchestrator-spawned children (spawn_agent and parallel_agents) now share the RV1902 wait posture: the refused child parks (the `budget:exposure-wait` event carries `scope: 'child'`), retries pre-wire when a live hold releases, and pays zero provider attempts while parked. Only a drained refusal (no live holder left to wait out) ends the seat, and it ends typed and cheap: `AgentError.reason 'exposure-drained'`, carried into the journaled terminal's `error.data.reason`, so the orchestrator tells a starved seat apart from a crashed child and can re-spawn it once money frees. The root keeps its documented forced-finish partial on the drained arm.
