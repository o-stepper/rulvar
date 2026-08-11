---
'@rulvar/core': minor
---

`record_evidence` binds the quote to the cited lines (RV3206). The quote check searched the WHOLE loaded file, so a quote taken from the next line over verified against a citation it never belonged to, and every evidence floor counted the misbound entry. With both `lines` and `quote` given, the quote must now appear verbatim inside the cited range; the refusal tells the model to widen the range or fix the citation. Quote-only entries keep the whole-file check (with no lines claimed there is no location to bind), lines-only and file-only entries are untouched, and correctly bound citations are byte identical.
