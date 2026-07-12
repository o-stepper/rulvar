---
'@rulvar/cli': minor
---

rulvar kb gate (M12-T04, the closing task of ModelKnowledge phase 3): the human gate flow turning one inbox proposal into a human-editorial claim. The attribution attestation is mandatory by construction (without --ruled-out over the closed checklist the GateRecord does not assemble and nothing is written; contrast evidence rides --contrast-run or --contrast-eval); the born claim carries the typed template statement (never the quarantined note), origin provenance back to the proposing run and entry, evidence resolving into that run's journal, and the editorial TTL. The commit is CAS against the per-project rulvar.models.json, whose git review is the authenticating gate. Non-proposal entries, expired proposals (fourteen days from the run's terminal updatedAt), running runs and already-gated proposals reject with typed errors.
