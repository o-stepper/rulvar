---
'@rulvar/core': minor
---

The terminal child barrier (RV1903). The four-role benchmark's recovery journal recorded `run_settle` at sequence 18 and three successful child terminals at sequences 19..21: the returned `RunOutcome`, the terminal invoice, the captured event stream and the final journal each reported a different total, and none was wrong by its own clock. Every orchestration exit, returned or thrown, an accepted or rejected finish, a typed failure, a budget or exposure terminal alike, now passes a terminal child barrier before the workflow settles: `OrchestrateOptions.onUnsettledAtExit: 'cancel'` (the default) aborts the stragglers and awaits their journaled cancelled terminals, `'drain'` awaits their natural terminals bounded by their own limits and budgets, preserving their evidence at the price of the wait. The verdict the run settles with is journaled before the barrier runs, so late children never change it; what ends is the settle racing the roster, and with it the post-settle journal mutation that split the cost views.

The frozen cassette catalog is re-recorded for the barrier's additive cancelled child terminals in runs that previously left stragglers running past the settle (journal-shape-revision, additive terminals only: existing entries byte-identical, no hashVersion change).
