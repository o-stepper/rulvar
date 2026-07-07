---
'@lurker/core': minor
---

M3-T08 no-progress abort class and M3-T10 UsageLimits completion. The
engine-defined detector implements the committed docs/06 Appendix A
interim rule (N consecutive turns without tool calls or artifact deltas,
N = 3, configurable via the new UsageLimits.noProgressTurns knob): the
abort journals as the agent's terminal entry with status 'limit', the
dedicated 'no-progress' class marker in the error payload
(AgentResult.abortClass), and memoizeOutcome stamped by the ENGINE on
the terminal entry, so it replays on every resume without a live rerun
regardless of the user's dispatch-time memoize policy (the predicate's
entry-read consults the terminal stamp first; docs/03 section 6.6
amendment). Tool-calling turns reset the streak: a working agent never
trips. UsageLimits is complete: maxTurns, maxToolCalls,
maxOutputTokensPerTurn, timeoutMs, streamIdleTimeoutMs, noProgressTurns,
and the run-level deadline each independently produce their documented
outcome, with per-limit tests including the memoized-limit
replay/unmemoized rerun predicate integration. The M3-T09 minSpend gate
gains the accumulation path test (scope_bigger passes once spend crosses
minSpendUsd).
