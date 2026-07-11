---
'@rulvar/core': minor
---

M11-T06: the verified-layer compiler goes public (docs/05, sections "Read path" and "Composition with the model layer"). `compileVerifiedLayer(claims, ladders)` compiles start-tier recommendations per (ladder, taskClass) EXCLUSIVELY from eval-measured claims with the one-rung clamp (the price of any false belief stays one rung; ties hold the default and compile nothing; editorial claims never compile); the card renders from it and future consumers read the structured rows, never the card text. Floors and ModelCaps stay hard; budget is touched only through the existing admission path.

Property-tested over seeded random snapshots: no compiled recommendation ever exceeds one rung of displacement or leaves the ladder, editorial-only snapshots compile to nothing, and compilation is deterministic. The M11 OQ sweep rides along in docs/14: OQ-09 closes with the defined M12 gate criteria (A/B sweeps, rung and agentType selection against the no-card baseline); OQ-07, OQ-08, and OQ-10 carry honestly (their triggers cannot fire while every release is founder-deferred).
