---
'@rulvar/core': patch
---

An exhausted run settle no longer drops the typed failure when the throw was an `AgentCallError`: the exhausted branch now projects it through `agentResultWire` exactly like the error branch, so `outcome.error` keeps the agent's typed budget failure (and any engine-decided abort class) in the parallel-exhaustion race where one branch's agent fails while the run budget is already exhausted. The common paths were already typed: a direct `BudgetExhaustedError` carried its wire before, and the in-loop turn-guard denial surfaces as `budget_exhausted` with zero over-ceiling calls, now pinned by an engine-level regression test.
