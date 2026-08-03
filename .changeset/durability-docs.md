---
'@rulvar/core': minor
'@rulvar/cli': minor
'@rulvar/executor': patch
---

Report the import bundle's reference closure, serve verify-only journal reads, and close the documentation gaps the benchmark named (RV1511, RV1512, RV1513). The sixth and final PR of the eighteenth plan.

The import closure report (RV1511). The intake validated shapes, namespaces, and the runId, but nothing held the ENTRIES' own references against the blobs the bundle carries: a torn bundle imported whole and the missing transcript surfaced only when something later read it. `importRun` now returns `{ unresolvedRefs }`, every transcript, checkpoint, artifact, and workflow-source ref the entries (and meta) name that no bundle blob resolves; the default stays permissive (retention and checkpoint pruning legitimately drop blobs their entries still name) and the report makes the gap visible, while `requireClosure: true` refuses typed BEFORE any write. A duplicate blob ref refuses always: last-write-wins over transcript bytes is a torn or edited bundle, never a valid export.

The verify-only load (RV1512). The A1 salvage model repairs a torn trailing line ON LOAD, which is right for an owner about to append and wrong for an auditor: a verification read that rewrites the artifact it verifies destroys the evidence of the tear. `JsonlFileStore({ repairOnLoad: false })` serves the salvageable records without touching the file, and `rulvar runs audit --no-load-repair` opens the default store that way (contradicting `--repair` is refused typed).

The documentation debts (RV1513). The README package count now matches its own table (seventeen names, the unscoped pointer included); `@rulvar/executor` ships a README and LICENSE like every sibling; the package reference names the eval framework's real dependencies; and the isolated-executor guide gains "What the ledger is NOT", the explicit denial list (not an outbox, not authorization, not exactly-once, not always on) for exactly the facts the seventeenth comparison run's dossier inverted while citing the sources that state them.
