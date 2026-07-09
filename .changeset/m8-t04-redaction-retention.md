---
'@lurker/core': minor
'@lurker/cli': minor
'@lurker/testing': minor
---

M8-T04: the redaction and retention interim rules executed (docs/14 OQ-20 and OQ-22; docs/09 section 8 rewritten to the executed state; docs/03 12.4 and 12.8; docs/06 10.1 and 10.2 amendments).

- `@lurker/core`: the L0 SerializationHook (`createEngine({ serialization })`): redact/encrypt at the append/put boundaries, symmetric on load/get, applied by wrapping the stores so `Engine.stores` exposes the one policy point; kernel ordering fields are drift-checked with a loud ConfigError. Default key masking at the telemetry boundary: every emitted WorkflowEvent passes `maskSecrets` (provider keys, PATs, bearer tokens, JWTs, private-key blocks become `[masked-secret]`); opt out via `redaction: { maskEvents: false }`; never touches the journal. Retention: `TranscriptStore.delete(ref)` joins the SPI (missing ref is a no-op; InMemory and File stores implement it), `Engine.deleteRun(runId)` cascades blob deletion before the journal (no orphan transcripts), and `Engine.pruneRun(runId)` deletes checkpoint blobs of ok-terminal attempts that nothing else references (parked, cancelled, escalated, and hanging attempts keep theirs).
- `@lurker/cli`: `createServer` and `createWorker` take the opt-in `retention` predicate over RunMeta (the server applies it at terminal settles, the worker during sweeps under a brief lease); the OTel exporter masks string span attributes with the same policy, defense in depth over the already conservative attribute content policy.
- `@lurker/testing`: `createTestEngine` forwards `deleteRun`/`pruneRun`.
