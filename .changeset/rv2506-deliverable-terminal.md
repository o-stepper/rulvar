---
'@rulvar/core': minor
---

The terminal states its deliverable verdict (RV2506). `status` says whether the run RAN and `completion` is the acceptance policy's claim over CHILD statuses; neither says whether the artifact the terminal carries ever passed the declared finish contract. The twenty-fifth comparison run accepted four ok children, failed its synthesis against the same bundle three times, and settled carrying nothing the contract accepted, and the harness scoring it read `status: 'ok'` and could not tell. The answer lived only in the journal, behind a transcript dig.

`RunOutcome` and the `run:end` event gain three lifted fields, computed once and spread onto both surfaces exactly like the completion lift they join. `deliverableAccepted` is the contract's verdict on THIS artifact. `resultAvailable` says whether there is an artifact to read at all. `acceptedArtifactRef` is the journal seq of the decision recording the acceptance, so the validators that rendered it and the draft hash they judged are one `rulvar inspect` away. Three different decisions answer to that ref, which is why one field is worth having: the accepted `orchestrator_finish_validation` verdict on the ordinary path, the `orchestrator_synthesis_skip` decision when the RV510 gate settled on a valid draft, and the `orchestrator_synthesis_regressed` decision when the RV2505 floor handed a failing synthesis back to its draft. All three are acceptances by the same bundle, and the terminal now says so.

`deliverableAccepted` is ABSENT, never false, when no `finishValidation` was declared: nothing judged anything, and absence means NOT RECORDED (RV1209). The verdict rides FAILED terminals too, lifted from the enriched error data the way RV2203 carries the pass truth, because the terminal a post-mortem policy must read is precisely the one where the children were accepted and the artifact was not. Malformed values mirror nothing, so a consumer gating on `=== true` cannot be defeated by a truthy string.

The guide gains the truth table over every reading the fields can produce, and the normative consumer predicate written in them.
