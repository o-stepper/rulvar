---
'@rulvar/evals': minor
'@rulvar/cli': minor
---

Sweep and suite reports are now monotone: paid evidence survives every budget refusal. Previously `runSweepMatrix` caught the envelope's `SweepBudgetError` around a whole cell and replaced it with an empty `envelopeExhausted` row, erasing already completed targets and their cost; a judge refused by the envelope erased the paid successful target the same way; and a judge run that hit its own per-run ceiling threw `EvalJudgeError` out of the entire matrix, losing every accumulated cell.

Now: `runEvalSuite` returns partial results with `plannedN`, `completedN`, and a typed `refusal` marker instead of throwing when the envelope refuses a target; a judge budget event (per-run ceiling exhaustion or envelope refusal) normalizes into the owning `EvalCaseResult` as `incomplete: { reason: 'judge-exhausted' | 'judge-refused' }` with the failing judge run's actual cost counted, while non-budget grader errors still throw; `SweepCellReport` gains `plannedN`, `judgeIncompleteRuns`, `incompleteReason`, and `refusedRunLabel`, and any incomplete cell (n < plannedN, exhausted targets, unfinished judges, or an envelope refusal) emits no claim; `runCanary` records an envelope-refused probe as `status: 'refused'` and keeps walking, so completed probe evidence survives and `allOk` stays the drift-flip gate; `EvalJudgeError` carries `costUsd`. The `kb sweep` human renderer prints incomplete cells explicitly (`INCOMPLETE: envelope refused ... after N of M case(s)`, unfinished-judge counts, refused-probe counts) instead of pretending nothing ran.

Migration: `runSweepMatrix` and `runEvalSuite` no longer throw `SweepBudgetError` for refused targets or judges; read `EvalSuiteResult.refusal`, `EvalCaseResult.incomplete`, and the new cell fields instead. Cells now always carry `plannedN`.
