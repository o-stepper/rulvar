---
'@rulvar/core': patch
---

The direct dispatch records what it committed, and announces it (RV4802, RV4806).
The dispatch entry's value part now carries `reserveUsd`, the committed clamp of
its admission, and a journaled rerun re-admits that RECORDED number instead of
re-pricing history: the budgets doctrine (reserves are recovered, never
re-estimated) extended to the direct `ctx.agent` path, with the recompute kept as
the fallback for journals from before the field. Plain direct dispatches now emit
`spawn:admitted` (entryRef is the dispatch entry, additive `reserveUsd`, the
recovered re-admission marked `replayed`) and a budget refusal emits
`spawn:rejected`, closing the observability asymmetry the ninth experiment
surfaced; dispatches tracked by an orchestrating layer (spawn tools, the
extension seam, the coordinator) or by a lineage decision keep their single
existing announcement. `spawn:admitted` events gain optional `reserveUsd` (the
`ctx.workflow` path reports its verdict reserve) and `logicalTaskId` becomes
optional (absent on direct budget admissions). The cassette corpus is
re-recorded and the frozen-fixture lock refreshed through its ceremony
(hashVersion-bump): the dispatch VALUE grew one recorded field while the
identity profile and every hash rule stay untouched, so replay identity is
unchanged and the re-recorded fixtures are the same scenarios with the committed
reserve visible on their dispatch rows.
