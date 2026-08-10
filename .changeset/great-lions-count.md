---
'@rulvar/core': minor
---

The critical path is readable OFFLINE (RV2803).

`reduceCriticalPath` folds the shape of a run's wall clock out of the event stream, and a post-mortem has no event stream: the process that emitted it is gone, and what a paid run leaves behind is a journal. So `postFanInShare`, the one number the comparison series steers by (RV2210 wrote the targeting rule around it), was a live-only reading, and the archived runs it was meant to judge could not answer for themselves.

`criticalPathFromJournal(entries)` is the same reading taken from what survives. Every ingredient was already written down: a terminal agent entry carries its own span (`startedAt` copied from the running entry it closes, `endedAt` stamped at the settle, so the interval is exact rather than reconstructed) and `costAttribution.role` says whether the span was coordination, synthesis, or a worker. Nothing is re-derived and no validator runs again, so a journal from any prior version reads exactly as well as today's.

Two things it refuses to claim, both because the alternative is a confident fiction:

- The wall figures (`runWallMs`, `postFanInMs`, `postFanInShare`, `synthesisShare`) are ABSENT for a journal holding more than one segment. A killed run's first and last stamps are separated by however long the operator took to resume, and that difference is not a duration of anything. `segments` rides the reading so a consumer can see which case it is in.
- The `synthesize` split (RV1604's `finalCompositionMs` and `semanticJudgeMs`) needs the dispatch LABEL, which rode the event stream alone. `CostAttributionFacts.label` now carries it: policy, never identity, absent on every unlabelled dispatch, so unlabelled runs journal exactly what they did before. The split is reported only when EVERY synthesize span in the journal carries a label, because one unlabelled span makes it a guess, and this split exists because a guess here read a 54 second judge as a second final composition.

`unclassifiedSpans` counts settled spans whose entry records no role at all, so on a journal older than the attribution facts the worker count reads as a floor rather than quietly absorbing them.
