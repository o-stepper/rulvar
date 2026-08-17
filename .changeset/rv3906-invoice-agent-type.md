---
'@rulvar/core': minor
'@rulvar/cli': minor
---

`InvoiceRow.agentType?` and `InvoiceRow.label?` (RV3906, the fourth comparison experiment): in dynamic runs the scope grammar nests every orchestrator spawn under one `agent:<seq>` bucket, so `byScope` legitimately reads two buckets and per-child money used to require a join through the journal. Every row of an attributed terminal (record rows, unattributed slice rows, and remainder rows alike) now carries the spawn's `agentType` and the dispatch `label` from the terminal's cost attribution; the empty agentType folds as absent (the root's honest non-type), and rows of journals recorded before attribution shipped stay byte for byte. `rulvar cost-audit` prints the same cut as a `by agentType:` line and carries it as `invoice.byAgentType` in the JSON form, both absent on pre-attribution journals. Cardinality pins unchanged; one mutation probe pins the threading.
