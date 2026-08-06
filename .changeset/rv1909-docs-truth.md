---
'@rulvar/core': minor
---

The documentation says exactly what the lifecycle now guarantees (RV1909). The README and the design principles carried "a full cost report" as a promise the twenty-first benchmark falsified; with the exit barrier (RV1903), the settle drain and the journal seal (RV1904) the promise became a lifecycle guarantee, and the docs now state the enforcement rather than the aspiration. The observability guide gains the denominator map: the settled fold, the `run:end` totals, the terminal envelope and `invoiceFromJournal` are one fold that agrees by construction; a mid-run `budget:update` or a refusal's `spent` is an instant of the live ledger, never the terminal; and a later re-fold reproduces the settled figures byte for byte because the seal forbids the journal to move. The benchmark's four views were honest clocks over a roster that kept moving; the lifecycle now stops the roster before the first terminal figure exists.
