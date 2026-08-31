---
'@rulvar/core': patch
---

The direct dispatch reserve bracket (RV4801, the ninth experiment P0). Admission of
a direct `ctx.agent` commits the allowance clamped reserve, but the settle released
the RAW estimate; the chain release floors at zero per account, so one clamped
child's settle erased SIBLING reservations on shared ancestor accounts, and
projected admission then admitted new spawns against money already promised to live
children. The settle now releases exactly the committed clamp, and the release rides
a finally spanning admission to settle, so a throw between them (the worktree
acquire, the dispatch append, the loop itself) returns the reserve instead of
parking it for the rest of the run. Regression tests pin the sibling survival, the
throw path, the journaled rerun, and the ledger arithmetic; two mutation probes hold
the released amount and the finally placement.
