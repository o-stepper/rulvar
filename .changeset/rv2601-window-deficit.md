---
'@rulvar/core': minor
---

The finalization window entry explains a reserve it did not configure (RV2601). With `reserveForEvidenceDeficit` the effective reserve is widened by the outstanding evidence floor (RV1208), and the journaled `finalization_window_entry` decision carried only `{remaining, reserveCalls, budget}`: a reader after the fact could neither explain a reserve of 25 under a configured 20, nor see that the agent stopped searching owing its ENTIRE floor. The fourth parity run settled exactly there, and reconstructing it took the transcript.

The decision now carries `evidenceDeficit` and `minEntries`, exactly when the widening happened. Both numbers are the loop's own, and the same predicate feeds the notice the model reads and the fact the journal keeps, so the two can no longer disagree. Absence is the honest answer that the configured reserve is what bound: a run without the opt-in, without a declared contract, or with the floor already met journals what it always did, byte for byte.

The doctrine is the one RV2203, RV2205 and RV2207 already ship under: a number the loop APPLIED belongs in the journal with the arithmetic that produced it, not only in prose addressed to a model nobody kept.
