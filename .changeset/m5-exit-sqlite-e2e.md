---
'@lurker/cli': patch
---

M5 exit criterion coverage: prove the CLI works end to end against
SqliteStore, not only JsonlFileStore (docs/10, section 3.6). A host
config that supplies a SqliteStore as `engineOptions.stores.journal` is
honored by the CLI's engine assembly (JsonlFileStore is only the default
fallback), so run/suspend, runs ls, resume, and inspect all round-trip
against sqlite through the same command paths. Added as a CLI e2e test.
