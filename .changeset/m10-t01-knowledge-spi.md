---
'@rulvar/core': minor
---

M10-T01: the ModelKnowledgeStore SPI and the default file store (docs/05, sections "Data model" and "Commit discipline"). The engine-scoped, per-project, append-only claim store lands as a new SPI seam, a neighbor of JournalStore, freezing with knowledge-base phase 1 post-1.0 (never touching the six frozen core seams).

- `ModelKnowledgeStore { current; commit(ops, expectedVersion) }` with CAS on the monotonic snapshot version, mirroring the lease fencing discipline; concurrent commits serialize through the retryable `KnowledgeCasError` and rebase. There is NO propose() method in the SPI at all, and the runtime handle type `ModelKnowledgeHandle = Pick<..., 'current'>` physically lacks commit (docs/05 security channels 2 and 3).
- The full docs/05 claim data model as types: `ModelClaim` (subject with effort as part of identity, mandatory taskClass and evidence, TTL fields, append-only supersede), `GateRecord` (the human variant does not assemble without the attribution attestation), `ClaimOp`, `EvidenceRef` (entryRef is the journal seq), `KnowledgeSnapshot`. The `TaskClass` vocabulary upgrades from bare string to the docs/05 union (the six floor-aligned classes plus open extension), canonically resident with the knowledge SPI and re-exported by the floors module.
- `FileModelKnowledgeStore` defaulting to `./rulvar.models.json`: git-diffable pretty JSON with atomic temp-plus-rename replace; append-only mechanics (supersede and archive flip status, never delete, preserving the audit trail); referential integrity as typed ConfigErrors; the empty snapshot (version 0) when no file exists.
