---
'@rulvar/cli': minor
---

M10-T04: `rulvar kb list` (docs/05, section "Read path"; docs/06, section 10.5). The second consumption path: claims of the per-project store (./rulvar.models.json) render with full provenance for the humans who author ladders, floors, and profiles: author and gate identity, evidence refs (journal seqs and eval reports), metrics when present, supersede chains, proposal origin, and the TTL state (holds or EXPIRED) per the docs/05 decay table. No run and no pin are involved, so the maintenance view names models verbatim; only in-run cards are nameless. The grammar members `kb inbox` (phase 3, M12) and `kb sweep` (phase 2, M11) fail loudly naming their phases until they ship.
