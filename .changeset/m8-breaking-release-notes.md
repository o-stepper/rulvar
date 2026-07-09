---
'@lurker/core': minor
---

The v0.9.0 BREAKING release notes (M8 server and queue; the flagged BREAKING sections of the pre-1.0 convention, docs/12 registry).

BREAKING: TranscriptStore gains the REQUIRED `delete(ref)` method (docs/03 12.4; the OQ-20 interim rule executed at M8-T04: retention is impossible without blob deletion, and `JournalStore.delete` alone would orphan every transcript). How it fails: third-party TranscriptStore implementations stop compiling against the widened SPI. Migration: implement `delete(ref)`; deleting a missing ref MUST be a no-op, never an error; the cascade over a run's blobs stays ENGINE-side (`Engine.deleteRun`), never a store obligation. The shipped InMemoryTranscriptStore and FileTranscriptStore already implement it.

BREAKING: the Engine interface gains required members `stores`, `deleteRun`, and `pruneRun` (docs/06 10.2; the M8 seam and retention amendments: the shells read the run picture through the engine's stores, and retention needs the cascade and the checkpoint pruning as first-class engine operations). How it fails: custom Engine implementations and structural Engine test doubles stop compiling; ordinary consumers of `createEngine` are unaffected, and `ResumeOptions.lease` stays additive-optional. Migration: expose the configured stores and delegate `deleteRun`/`pruneRun` to the underlying engine (the pattern in `@lurker/testing`'s `createTestEngine`).
