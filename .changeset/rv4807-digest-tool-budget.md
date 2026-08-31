---
'@rulvar/core': patch
---

The await digest carries the child's tool budget pressure (RV4807). The ninth
experiment's durability specialist starved at 30 of 30 tool calls and the
coordinator could not see it: the aggregate reached only the synthesis policy
facts, so nothing respawned the specialist or accepted the degradation
knowingly. `TaskDigest` now folds the REPLAY-STABLE subset of the child's
`toolBudget` (`used` and `cap`, the pair the terminal journals; the derived
`capHit`, present and true when the executed-call cap was reached, whatever the
status says; `extensionsGranted` and `finalizationWindowEntered` from their
decision entries); the live-only fidelity fields stay out so a digest folds
byte-identically live and resumed, and a child without a tool budget folds byte
for byte as before.
