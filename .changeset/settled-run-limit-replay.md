---
'@rulvar/core': patch
'@rulvar/store-sqlite': patch
---

Two follow-ups from the RV-210 and RV-215 cycles. (1) Resume of a run that already SETTLED ok no longer re-dispatches plain cap-expiry `limit` children live: the canonical replay predicate now takes a `runSettledOk` input (computed by the engine from the loaded journal's run settle entry), and the memoize-limit rule replays unstamped limit entries when the run is finished history, so resuming a completed run makes ZERO adapter calls and `replay --assert-no-live` style verification holds. Non-ok settles and never-settled journals keep the rerun retry semantics (a crashed segment still resumes into a second chance), and an explicit invalidate still forces a rerun. (2) `SqliteQuotaLimiter` carries its own class TSDoc (the api page previously inherited the bare SPI interface line), documenting the single-transaction admission, cross-process reconciliation, identical-rules requirement, pruning, and the busy_timeout contract.
