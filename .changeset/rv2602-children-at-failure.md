---
'@rulvar/core': minor
---

A run that dies before acceptance names what its children produced (RV2602). Every child-naming field on the envelope hangs off the acceptance fold: `childStatusCounts`, `belowFloorOkChildren`, `acceptanceChildren`, all of them assembled inside the acceptance decision and enriched onto a failure only when that decision exists. A run that crosses its ceiling mid-roster therefore settled with `completion` absent and said NOTHING about work already paid for, even though every child terminal was in the journal one entry at a time. That is the last row of the deliverable truth table, and the only one where the terminal was silent about spend.

`RunOutcome` and the `run:end` event gain `childrenAtFailure`: `spawned`, `settled`, `statusCounts`, the `belowFloorOkChildren` that settled `ok` under a declared evidence contract they never met (the fourth parity run's silent worker, sixty one successful tool calls and not one recorded entry), and the `unsettled` children still running when the run gave up. Nothing new is written; it folds the children's own journaled terminals.

Three lines draw its boundaries. It reports ONLY where no acceptance verdict exists, live or rolled forward from the journal, so one set of children never carries two folds under two authorities. It is deliberately not called `childStatusCounts`, because that name belongs to the policy's number and a fold done by no policy must not borrow it. And it is lifted independently of the completion lift, because that lift bails out the moment there is no completion literal, which is exactly the terminal this field exists for.

The roster is frozen at the moment of death, ahead of the RV1903 exit barrier, so it is the roster a verdict would have frozen rather than the one the stragglers land on afterwards; that is why `unsettled` can be non-empty. The error class is preserved exactly and only its data widens, an already-present field is never overwritten, and a run that spawned no child adds nothing.
