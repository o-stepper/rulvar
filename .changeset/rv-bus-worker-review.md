---
'@rulvar/core': patch
'@rulvar/cli': patch
---

Three defects from a deep review of the MCP bus and the queue worker (cycle 79). In `@rulvar/cli`, `createWorker().stop()` now waits out a sweep that is still scanning the store before taking its cancel snapshot, and a sweep observes the stop before every lease: previously a stop() racing an in-flight sweep could resolve while that sweep went on to lease and drive a new run, leaving a live run and a held lease behind a "stopped" worker. In `@rulvar/core`, the MCP tool source no longer loses a `listChanged` notification that races the in-flight `tools/list` fetch (the fetched list is served but never pinned as the session cache, so the next snapshot refetches), and cursor pagination treats an empty `nextCursor` as exhaustion instead of spinning the import loop forever on a server that echoes it. A regression test also pins the SDK-level rejection of a declared `outputSchema` with no `structuredContent`, guarding the planned SDK v2 migration.
