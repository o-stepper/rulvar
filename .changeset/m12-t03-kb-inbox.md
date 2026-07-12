---
'@rulvar/cli': minor
---

rulvar kb inbox (M12-T03): aggregates kb_propose-born proposals from finished runs through the RunLedger fold behind the LedgerExport seam. Matching (subject, taskClass, polarity) triples group for display ONLY (the command writes nothing, authorizes no spend and schedules no sweeps); each proposal renders with full provenance (initiating run identity, proposal entryRef, lineage, tier, trigger, evidence refs) plus the typed template statement a gated claim would carry; proposals of runs finished more than fourteen days ago expire out of the view. This is the human review surface, so the quarantined note and concrete model names render here verbatim, exactly like kb list.
