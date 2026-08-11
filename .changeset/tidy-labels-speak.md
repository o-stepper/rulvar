---
'@rulvar/core': minor
---

The engine labels its own synthesize dispatches (RV2901). `criticalPathFromJournal` splits the synthesize bucket into final composition and claim judge only when EVERY synthesize span carries a journaled label, and the comparison run's journal refused that split because the final composition dispatch stayed anonymous while the claim judge was labelled. The final composition now dispatches under the new exported `FINAL_COMPOSITION_LABEL` and incremental synthesis notes under `SYNTHESIS_NOTE_LABEL`, both policy on the attribution facts and never identity, so the journal of a fresh run reports the split by construction while journals written before the labels keep refusing it honestly.
