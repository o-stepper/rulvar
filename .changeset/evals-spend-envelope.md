---
'@rulvar/evals': minor
---

Budget surfaces for sweeps and the canary (the v1.16.2 review P1-2).

- New `SpendEnvelope(maxTotalUsd)`: the debit-only aggregate bound over a whole sweep. Every target, judge, and canary run authorizes its immutable per-run ceiling against it BEFORE starting (integer micro-USD accounting, so exact fits pass); a refusal throws the new `SweepBudgetError` before any provider work, and authorizations are never returned, not on completion, not on replay, not on CAS retries.
- `runEvalCase`, `runEvalSuite`, and `runSweepMatrix` accept `envelope`; an envelope requires the matching per-run ceiling (`budgetUsd`, and `judgeBudgetUsd` once a grader judges), because an unbounded run under an aggregate envelope would be unaccountable.
- Sweep cells now separate measurement from budget artifacts: a cell the envelope refused reports `envelopeExhausted`, a cell whose target runs hit their own ceiling reports `exhaustedRuns`, and neither emits a claim, so a budget-starved measurement can never become a false weakness belief about the model.
- New `runCanary(engine, probes, { budgetUsd?, envelope? })` returns `{ fingerprint, allOk, probes }`: each probe run carries the optional immutable ceiling, and `allOk` is the drift-flip gate, because a non-`ok` probe fingerprints differently without the model having drifted. `canaryFingerprint` stays exported (now accepting the same options) for fingerprint-only callers.
