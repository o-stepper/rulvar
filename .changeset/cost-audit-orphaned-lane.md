---
'@rulvar/cli': minor
---

`cost-audit` surfaces the invoice's orphaned receipt lane on every output form (RV3501). When a journal carries the RV3405 crash shape (a receipt row the settled terminal's record set does not cover), the single run text prints the lane totals plus one line per receipt, both JSON shapes carry the lane verbatim under `invoice`, and the catalog sweep appends an orphaned suffix to the carrying run's row and a carrying count to its header. The lane never moves the verdict or the exit code: an orphaned receipt is the honest double payment window of a resume, not a divergence, and before this surface such a journal passed all six checks while the money stayed invisible in every printed figure. Journals without the lane render byte for byte as before.
