---
'@rulvar/store-sqlite': minor
---

Enforce the monotonic-seq store obligation: `append` commits through one atomic conditional INSERT that rejects an entry whose `seq` is not strictly greater than the run's stored tail with the typed `JournalOrderViolation`, so two writers racing the same journal from a stale tail can never both persist (the second writer of a split-brain resume gets a typed conflict instead of silently corrupting replay). Entries without a finite `seq` (legacy or exotic shapes) pass through unguarded, preserving payload opacity. A non-unique expression index over `(run_id, seq)` keeps the tail check cheap on long journals; existing database files need no migration.
