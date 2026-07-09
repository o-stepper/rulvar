---
'@lurker/store-conformance': minor
---

M9-T03: community adapter and store guides (docs/10 section 3.10; docs/11 M9 exit row "conformance kits published as community guides").

- New informative docs: `docs/guide-adapter-authors.md` (wire mapping requirements, the Usage invariant checklist, caps posture, an adapter skeleton template, and the VCR-based contract-test pattern with record and hermetic replay legs) and `docs/guide-store-authors.md` (the storage contracts A1-A4 plus leasing and fencing, a complete minimal LeasableStore walkthrough with an injectable clock and release-surviving epochs, conformance kit wiring, common failure modes, and publishing checklists). Both are indexed in the docs README inventory.
- @lurker/store-conformance gains the dogfood suite: the guide's CommunityMemoryStore walkthrough listing runs VERBATIM through journalStoreConformance and leasableStoreConformance in CI, so the acceptance ("a third-party mock store built only from the guide passes conformance") holds permanently and the guide's code cannot rot.
