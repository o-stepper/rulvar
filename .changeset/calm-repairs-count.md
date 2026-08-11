---
'@rulvar/core': minor
---

The synthesis candidates a journal already holds (RV2902). `synthesisCandidatesFromJournal(entries, priceUsd?)` folds each journaled finish verdict into a candidate with the window of wall, wires, usage, and per-call priced cost that produced it, so the cost of a repair is separable from the cost of the candidate it repaired: the one question the ninth comparison run's frozen telemetry could not answer, with both candidates inside a single 177 second synthesize span priced as one number. Sequence numbers partition a settled span's incremental billing rows between its verdicts exactly; the fold refuses to price a window when the rows do not cover the terminal's own call records (they append asynchronously by design), counts verdicts outside every settled synthesize span instead of inventing candidates for them, and reports wires after the last verdict as an attributed-to-nobody tail. No new journal fields.
