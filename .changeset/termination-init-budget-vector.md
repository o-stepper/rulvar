---
'@rulvar/core': minor
'@rulvar/plan': minor
---

`termination.init` now freezes the ACTUAL orchestrator budget dollars instead of zeros, closing the journal-contract gap the v1.7.0 follow-up review found: the budgets guide documents `orchestratorCapUsd` and `finalizeReserveUsd` as frozen in the same limits vector as the counters, but PlanRunner journals stored `0` for both and only the later `orchestrator_budget_reserve` decision carried the real values.

- The engine resolves the effective cap and finalize reserve strictly before extension boot and exposes them on `OrchestratorExtensionIO` (`orchestratorCapUsd`, `finalizeReserveUsd`); PlanRunner writes them into `termination.init`.
- On resume the cap dollars are now recovered from the frozen `orchestrator_budget_reserve` decision instead of being re-derived from live options (DEF-2 config-drift-resume: the journal wins). A diverging live `capUsd`/`capFraction`/`finalizeReserveUsd` emits `termination:config-drift` and is never honored.
- Journals recorded before this release (zeros in `termination.init`) replay unchanged: the fold reads the init entry by kind, and the reserve decision remains their authority.
- The reserve-decision presence guard is now scoped to the orchestrate call, so nested capped orchestrations each journal their own freeze.

The frozen cassette catalog is re-recorded (the init limits vector and its content key change); hashVersion stays 2, and the fixture lock refresh carries the required hashVersion-bump token.
