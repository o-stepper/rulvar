---
'@rulvar/core': minor
---

Conditional synthesis (RV510, the ninth-experiment review): the opt-in `synthesis.skipWhenDraftValid: true` runs the coordination draft through the FULL declared finish contract before the synthesis span starts. A draft that passes every validator becomes the final result without the synthesis invocation ever dispatching, under a journaled `orchestrator_synthesis_skip` decision with the new machine-readable reason `synthesis_skipped_by_valid_draft` (the existing `OrchestrateSynthesisSkipReason` vocabulary, additively extended); the info log and the acceptance envelope carry the same reason, and a resume rolls the journaled skip forward with zero paid calls. A draft that fails any validator goes to synthesis exactly as before, with the repair budget untouched. Deterministic by construction (only the declared contract judges, no semantic-delta heuristic); requires `finishValidation` at intake; default off, byte-identical journals and cassettes.
