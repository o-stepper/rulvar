---
'@rulvar/cli': minor
---

`rulvar inspect` prints the observed tool-budget calibration beside the child roster (RV3103): the RV3003 fold in operator output. The aggregate line (`observed tool calls per recorded evidence entry:` with the rate, the executed-call and entry sums, and the paired-dispatch count) exists only when at least one terminal carries both the RV806 evidence verdict and the RV3002 executed-call counter; unpaired sides are named instead of zeroed (declared contracts with no journaled counter, the pre-RV3002 journal shape, and counters with no declared contract); a journal carrying neither side prints nothing at all, so absence stays NOT RECORDED in operator output too.
