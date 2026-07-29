---
'@rulvar/core': minor
---

Close the two fail-closed gaps the eleventh comparison experiment proved live (RV701, RV705).

RV701, `JsonlFileStore`: a crash that persisted every JSON byte of an append but not its trailing `\n` left a parseable unterminated tail; `load` served it, the next `append` glued the following record onto the same line, and the load after that classified the glued line as one torn fragment and repaired BOTH accepted records away (a first-line glue rewrote the journal to zero bytes; a later second append buried the glue mid-file and made the journal unreadable). `append` now terminates a parseable unterminated tail in place before this instance's first write, and torn-tail repair salvages every complete record a glued last line carries, discarding only the unacknowledged trailing fragment. An entry `load` has served once can no longer be un-served by a later repair.

RV705, `buildCostReport`: the exported live builder returned whatever numbers the host fed it, so an `Infinity` or `NaN` total, bucket, or abandoned ledger serialized into `null` downstream, while `costReportFromJournal` had refused exactly that since RV610. The builder now runs the same deep finite validation and refuses non-finite reports with the same typed `ConfigError`.
