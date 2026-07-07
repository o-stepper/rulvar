---
'@lurker/core': minor
---

M4-T04 failover and M4-T05 RetryPolicy under the journal.

- Transport RetryPolicy (`model/retry.ts`): the Appendix A defaults
  (attempts 3; backoff 500ms x2 max 8000ms with equal jitter; retryOn
  transport, rate-limit, overloaded) now actually retry around every
  adapter.stream dispatch: loop turns, extract, finalize, and summarize
  alike. Retries live UNDER the journal: a retried-then-successful call
  is one journal entry with one usage total, one turn, and no lineage
  attempts (DEF-3). A provider retryAfterMs replaces the computed
  delay; task-class failures never retry by construction; stream-idle
  severance retries as transport-class. Configure per call
  (`AgentOpts.retry`), per profile, or engine-wide
  (`defaults.retry`).
- Transport failover (`model/failover.ts`): `ModelChoice.fallbacks`
  now works. When a serving model exhausts its tries on a transport or
  rate-limit failure, the sticky chain advances to the next resolved
  fallback (per-phase, effort defaults and caps scrubbing re-applied
  per serving model). The content key hashes the REQUESTED spec, so a
  failover-served response replays for free; only `servedBy` records
  the actual server (now surfaced on AgentResult and stamped on the
  terminal entry). Budget is explicitly excluded as a trigger.
- The degenerate fallback field (`AgentOpts.fallback`, docs/04 11.3):
  an agent-level second attempt on a stronger model when the terminal
  matches `on` (error, limit, schema-exhausted), with exactly one
  journaled decision entry (`decisionType: 'model.fallback'`) reused on
  resume, and the fallback attempt under its own content key. Cancelled,
  escalated, and budget outcomes never trigger it.

`AgentResult` gains the required `servedBy` field (additive for
consumers reading results; literal constructions in tests need the new
member).
