---
'@rulvar/core': minor
---

The evidence-grade verdict names its offending sentences (RV2105). The eighth parity run's synthesis was told `evidence-grade claims cite no run or repro artifact in their own sentence: live-observed` over a 5000-word document, repaired blind twice (the second repair fixed `production-proven` and never found the `live-observed` sentences), and the run failed closed with half its budget unspent. `evidenceGradeValidator` reasons now carry the offending sentences verbatim beside the phrase list, bounded to five and truncated per sentence (whitespace-normalized), with an `and N more offending sentences` tail, so a granted repair turn reads exactly the lines the verdict judged. The blindness audit covered every other finish validator: each already names its material (sections, headings, fields, citations, missing pool items, codepoints with context), so the fix is exactly one validator wide.
