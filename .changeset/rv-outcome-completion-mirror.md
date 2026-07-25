---
'@rulvar/core': minor
---

The RunOutcome completion mirror (the 1.65.0 experiment review, P0.5). The semantic completion lift (`completion`, `childStatusCounts`) rode ONLY the `run:end` telemetry event, so a host consuming `handle.result` had to parse the workflow-shaped value on the accepted path and dig the typed error data on the rejected one. The engine now computes the lift once and spreads the same object onto both surfaces: `RunOutcome.completion` and `RunOutcome.childStatusCounts` are present exactly when `run:end` carries them (an ok/exhausted run whose result value makes a valid completion claim, or an error run whose typed error data does, the orchestrator acceptance path emits both), absent otherwise, so the outcome and the event can never disagree and a replayed resume mirrors the identical fields.
