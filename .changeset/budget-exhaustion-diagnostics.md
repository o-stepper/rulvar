---
'@rulvar/core': minor
---

Budget exhaustion errors now name the ceiling that actually ended the work. `BudgetExhaustedError` from agent execution reports the first closed account walking up from the debited scope (its scope, ceiling, spend, and reserves) plus the run root state, classified as `root`, `orchestrator-cap`, or `child-account`, both in the message and in typed `data`; a crossed orchestrator cap no longer masquerades as `run budget ceiling reached`. `RunBudget` gains the `exhaustionDiagnostics(scope)` projection behind this, and the orchestrator emits a warn log when an explicit `budget.capUsd` is silently bounded by the default `capFraction` 0.2 of the run ceiling (pass `capFraction: 1.0` to make `capUsd` the sole bound; the docs now spell out the min formula trap).
