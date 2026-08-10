---
'@rulvar/cli': minor
---

`--strict` reads the deliverable verdict (RV2604). The flag has always refused a partial acceptance and, since RV1702, a coverage grade that verified nothing. It never asked the one question RV2506 shipped a field for: did the declared finish contract accept the artifact this run settled on. Completion answers for the CHILDREN, and the twenty-fifth comparison run is the row that gap leaves open, with four accepted children, three syntheses the contract refused, a run that settled on unvalidated output, and a scoring harness reading `status: 'ok'`.

`deliverableAccepted: false` now exits nonzero even under `completion: 'complete'`, naming the contract and, when the terminal carries no artifact at all, saying so in the same line. The check precedes every coverage grade deliberately: a semantic grade over an artifact the contract rejected answers a question nobody should still be asking, and the refusal that names the contract is what a reader needs.

An ABSENT verdict is left alone. The check is `=== false`, not `!== true`, because absence means no `finishValidation` was declared, nothing judged anything, and a host that declares no contract is its own judge. That is the same line the normative consumer predicate draws in the observability guide.
