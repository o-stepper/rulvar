---
'@rulvar/anthropic': patch
---

Correct five stale rows in the seed capability table: Claude Opus 4.8, Opus 4.7, Opus 4.6, Sonnet 5, and Sonnet 4.6 all carry a 1M context window and 128k max output, verified against the official models table and live `GET /v1/models` on 2026-07-17. Default routing, the compaction threshold, and the wire `max_tokens` clamp no longer under-provision runs that never call `refreshCaps()` (Sonnet 5 was clamped to 64k output for no reason). Every row is now pinned by a committed `caps-snapshot.json`: an offline test fails when the table and the snapshot disagree, and the weekly live contract workflow audits the snapshot against the model list so provider-side drift pages instead of rotting. Pricing rows are untouched.
