---
'@rulvar/core': patch
---

The unparsed-arguments second chance now covers the terminal tool (the v1.74 experiment review, P1.5 completion). The terminal tool validates its arguments at its own interception site, so 1.75.0 recovered regular tools only while the experiment's actual casualty was the coordination finish. Both sites now share one validation path: a near-JSON finish payload recovers deterministically and ends the loop in one turn with the recovered result; truncations and imitated wrappers keep the exact old error result.
