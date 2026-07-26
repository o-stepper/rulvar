---
'@rulvar/core': minor
---

The v1.74 experiment review, cycle 73: contract turn feasibility in preflight, contract generation scoping, and error-outcome parity.

Preflight now proves a conforming answer can physically fit one finish turn of the invocation the validators bind: the contract's minimal accepting payload priced at the loop's four characters per token heuristic against the effective output bound is the error finding `output-contract-turn-infeasible` when it cannot fit and the warning `output-contract-turn-headroom` when the margin is under double; validators with repairs possible but no `repairTurnReserve` draw the warning `repair-reserve-unfunded`, and the preflight `finishValidation` input mirrors `maxRepairs`.

The fix-and-resume remedy is generation scoped: finish-validation decisions written under a contract carry `contractHash`, `repairsUsed` counts only the current generation, and a final rejection a superseded generation left in the crash window neither rolls forward at boot nor re-arms on replay (the stale exchange replays byte identical and the loop continues into a live repair turn). Pre 1.77 decisions carry no hash and bind to the current contract only while the journal holds a single bundle descriptor.

Typed finish failures now mirror the full acceptance snapshot (`degradedReasons` and the salvage lists beside `completion` and `childStatusCounts`) and count the invisible exchange class: `AgentResult.schemaRejectedTerminalExchanges` reports the terminal exchanges that died at the schema gate (window derived, absent when zero), and orchestrate folds the coordination and synthesis windows into `schemaRejectedFinishExchanges` on the failure data. Absent options and contractless configurations keep byte-identical journals, prompts, and cassettes.
