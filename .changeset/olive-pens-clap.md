---
'@rulvar/core': minor
---

The telemetry scope table's promise becomes its gate, and three of its declarations turn out to have been wrong (RV2801).

`TERMINAL_TELEMETRY_SCOPE` exists so a reader of a killed-and-resumed run never has to reconcile two terminals by hand, and RV2701 made its completeness a compile error. Both halves of that promise were bigger than the gate behind them.

**The type stopped at depth one.** `TerminalTelemetryScopes` required every key of `RunOutcome` and then admitted nested paths through a string index signature, which requires nothing. So `cost.orchestrator.wakes` and its four siblings were declared by hand and by luck, `cost.usageApprox`, `cost.abandoned.usd`, `cost.abandoned.usageApprox` and `cost.orchestrator.share` were not declared at all, and the doc promised every path was required. The type now requires every counted leaf under `cost` (numbers and flags, derived from `CostReport` itself, breakdown maps excluded because their keys are data), so a new cost figure does not compile until it says what it counts. That is the RV2701 blindness one level down: a gate whose subject is nested figures cannot stop at the top level.

**Nothing checked whether a declared scope was TRUE.** The two assertions that stood for that restated the table's own literal, so they could only fail together with the table. A doctrine test now suspends a real run on an approval, resumes it to `ok`, and holds every declared figure against its own claim over the two terminals.

It found three wrong declarations immediately. An outcome's `cost` is `costReportFromJournal` over the replayer's snapshot, and a resumed segment's snapshot holds every prior segment, so `cost.orchestrator.wakes`, `cost.orchestrator.forcedFinish` and `cost.orchestrator.reserveUsedUsd` have always been folded over the whole logical run while the table called them `'segment'`. They are now `'cumulative'`, which makes the taxonomy true rather than merely complete: every figure an outcome carries covers the logical run, and the only segment-scoped counters are the live-only ones that never reach a journal (the transport retries and the schema-exchange counters on an agent result). A wrong scope is worse than a missing one, because a missing one is noticed and a wrong one is believed.
