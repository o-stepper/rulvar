---
'@rulvar/core': minor
---

Record the semantic completion lift in the run settle and read it back on the persisted terminal (the persisted-terminal tail of the P1 list).

The persisted terminal (RV1209) documented its own gap: `completion` was unrecoverable by construction, because the workflow's semantic claim rides its result value and only the value's DIGEST is journaled. An offline reader, a restarted server, or a second replica saw the transport status and the money but never whether the work was COMPLETE, which is the one field the consumers doctrine (RV1414) says to gate on beside status.

The settle now records the lift it already computed. The engine lifts the completion envelope once at the settlement chokepoint (RV-207); the same object now rides the journaled `run_settle` decision value flat beside the output digest (`completion`, `childStatusCounts`, `degradedReasons`, the salvage lists, `belowFloorOkChildren`, `acceptanceChildren`), the outputHash precedent: additive, appended only by segments that computed the value, so a pure replay never overwrites the live baseline. `lastRunSettle` parses the literal back defensively, and `persistedTerminalEnvelope` passes it through the one producer, so a rebuilt envelope carries the same `completion` the live consumer saw. A settle written before the lift rode it stays honestly absent under `provenance: 'journal'` (absence means NOT RECORDED), and the run's own `error` remains the one deliberately unrecoverable field.
