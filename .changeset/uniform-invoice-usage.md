---
'@rulvar/core': minor
---

Every invoice row carries the same usage envelope, and the CLI names its billing basis (RV3311). The 2026-08-12 comparison run's invoice had 77 rows with `reasoningTokens` and one (the judge verdict extraction) without, so a FinOps consumer folding the column had to know that absence meant zero on exactly one row shape: rows now always carry the field (0 when the provider reported none) and the usage object is detached from the journal entry it was read from. The run summary and the inspect cost view print `billing basis: locally-estimated (a local estimate, never a provider statement)` beside the dollars, the audit's ask said out loud on the surface an operator actually reads.
