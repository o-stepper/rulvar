---
'@rulvar/core': minor
---

A finalize route declared at the workflow level now fires the finalize phase (RV1803). The role trigger read `[call, profile, engine]` while model resolution read all four layers, so `defineWorkflow({ routing: { finalize: … } })` resolved the finalize model and then never dispatched the phase; the route worked only when repeated at the call, profile, or engine layer. The trigger now reads the same four layers resolution reads, a workflow-only route fires exactly one finalize dispatch, resume replays the journaled synthesis without paying a second one, and a workflow layer without a finalize route still never fires the phase.
