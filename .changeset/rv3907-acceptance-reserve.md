---
'@rulvar/core': minor
'@rulvar/evals': minor
---

`budget.acceptanceReserve: 'warn' | 'require'` (RV3907, the fourth comparison experiment): preflight has long priced the acceptance tail and warned (`reserve-line-headroom`, `orchestrator-working-room`), and the experiment's run started anyway with both warnings on record. Under `'require'` the declared acceptance tail (the held `synthesisReserveUsd`, the claim judge's `estCost` times one plus the armed semantic repair round, the declared `finishValidation.estRepairCostUsd`, and the armed round's declared `synthesis.estCost` composition floor) plus one coordination turn floor must fit the effective cap at exact fill or better, or the run refuses with a typed `OrchestratorCapConfigError` BEFORE the first wire, journaling an `acceptance_reserve_refused` decision that names every term. Undeclared estimates contribute zero, so the gate binds exactly what the host declared; the default `'warn'` keeps today's behavior byte for byte. The fault kit gains `acceptance-reserve-refusal` (typed refusal, zero dispatches, term-by-term decision); boundary tests pin exact fill as admission; one mutation probe pins the gate.
