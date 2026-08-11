---
'@rulvar/plan': minor
---

The resume config identity (RV3203). The profile registry hash frozen in `termination.init` (profile names mapped to ladder lengths) is now recomputed on every PlanRunner resume: a mismatch refuses the resumed run typed BEFORE any model call, because ladders are live values the journal cannot rebuild and "the journal wins" is not honorable for them; `PlanRunnerOptions.profileDrift: 'warn'` downgrades the refusal to the `termination:config-drift` event for a deliberate registry change. The frozen dollar vector (`runBudgetUsdCeiling`, `orchestratorCapUsd`, `finalizeReserveUsd`) rides the same drift report; journals from before v1.8 stored zeros there and skip the comparison, journals from before the registry hash shipped skip the identity check entirely, and a resume under the original profiles is byte identical.
