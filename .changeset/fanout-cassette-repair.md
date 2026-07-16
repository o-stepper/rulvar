---
'@rulvar/testing': patch
---

Repair the committed `class-decision-fanout` cassette: the M9 live re-record was itself corrupted by the suspension split-brain fixed in this release (its recorder resolved `report-1` on the settled handle, waking the closed body while a resume appended concurrently), so the committed journal held two byte-identical `report-2` suspended entries with the same seq. Re-recording through the fixed engine drops exactly the duplicate twin; every other live cassette is byte-identical. This is NOT a hashVersion-bump and no identity profile changed; the literal ceremony token appears here only because the frozen-fixture lock refresh requires a changeset carrying it, and a corrupt-fixture repair is precisely the deliberate, reviewable diff the ceremony exists to force.
