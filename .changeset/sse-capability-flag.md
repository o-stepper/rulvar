---
'@rulvar/cli': minor
---

Answer the SSE capability machine-readably on every run status body (the P1 tail).

Events are process-local telemetry: `GET /runs/:id/events` streams a run's events only from the process that holds it live, and a run served from the store answers an immediately closing comment stream. That association lived in documentation prose, so a client discovered it by connecting. Every `GET /runs/:id` body now carries `capabilities: { events: boolean }` beside `live`: `true` exactly when this process holds the run and the events endpoint would stream, `false` on the persisted path. The cli guide's endpoint notes are updated, including the stale claim that a rebuilt envelope never carries `completion` (recoverable since the settle records the semantic lift).
