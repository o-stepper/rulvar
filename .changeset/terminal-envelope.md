---
'@rulvar/core': minor
'@rulvar/cli': minor
---

The unified terminal envelope (RV1105, the P1-5 arc): every terminal fact of a run travels in ONE exported shape, `TerminalEnvelope` (run identity, status, the typed error, the completion claim, `settled` + `settledReason`, `totalUsd`/`grossUsd` with the detached per-model split, the usage aggregate, `usageApprox` normalized to a boolean, and `agentsSpawned`), assembled once at the settlement chokepoint by the exported `terminalEnvelopeOf` after the settlement verdict is known. Every surface carries that object: the resolved outcome (`outcome.envelope`, always `settled: true`, because an unsettled terminal rejects typed instead of resolving), the `run:end` event (`event.envelope`, where the `settled: false` envelopes live with the superseded reason inside), the server's `GET /runs/:id` response, and the OTel exporter (`rulvar.run.total_usd`, `rulvar.run.agents_spawned` beside the existing settled attributes; a persisted stream from an older engine still closes its span). Nothing pre-existing was renamed or removed: the envelope is an assembly over fields that all remain.
