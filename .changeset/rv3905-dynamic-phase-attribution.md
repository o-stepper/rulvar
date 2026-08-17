---
'@rulvar/core': minor
---

Dynamic stage phases (RV3905): the fourth comparison run's `cost.byPhase` read 100% `unknown` over stages the journal held plainly apart, because the fold reads `costAttribution.phase` and the dynamic orchestrator never stamped one. Each engine-owned dispatch now names its stage on the dispatch scope state: `fan-out` (children), `coordination` (the loop and the forced-finish wake), `composition` (the synthesis invocation and incremental notes), `judge` (the claim passes), `repair` (the bounded claim repair round). The stamp is policy, never identity: journal keys and resumed runs are untouched, live and journal folds read the same field by construction, and an explicit host `ctx.phase` around the orchestration wins, so the stage names fill only the vacuum (phase-wrapped hosts also stop losing their bucket on spawned children, which never inherited the calling phase before). Two mutation probes pin the fan-out and judge stamps.

journal-shape-revision: dynamic dispatches now journal `costAttribution.phase` (an additive policy field; old journals replay unchanged and fold the absent field under `unknown` exactly as before), so the committed plan cassettes are re-recorded with the stamped stage names.
