[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestrateSynthesisSkipReason

# Type Alias: OrchestrateSynthesisSkipReason

```ts
type OrchestrateSynthesisSkipReason = 
  | "synthesis_skipped_by_acceptance"
  | "synthesis_skipped_by_budget_cap"
  | "synthesis_skipped_by_valid_draft";
```

Defined in: [packages/core/src/orchestrator/orchestrate.ts:1443](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1443)

The machine-readable reason a CONFIGURED synthesis step was skipped
(the 1.65.0 experiment review, item 11.4): telemetry that shows zero
synthesize spend must say why instead of leaving the host to infer it
from the acceptance decision. 'synthesis_skipped_by_acceptance': the
acceptance policy rejected the finish, and a rejected run never pays
for the post-fan-in composing step (in 'incremental' mode the settled
notes were already paid during the run; the skipped step is the free
deterministic reconciliation). 'synthesis_skipped_by_budget_cap': the
orchestrator budget cap froze the plan, and a capped run settles
through the reserved finalizer, never synthesis.
'synthesis_skipped_by_valid_draft' (RV510): the opt-in
`synthesis.skipWhenDraftValid` gate ran the coordination draft
through the full declared finish contract and every validator
passed, so the synthesis invocation had nothing to add and never
started; unlike the other two reasons the run still settles ok with
the draft as its result. The reason is frozen into the journaled
decision that caused the skip (the acceptance decision, the
budget-cap decision, or the 'orchestrator_synthesis_skip' decision),
spread into the typed FailRunError data on the failing paths and
into the acceptance envelope on the valid-draft path, and announced
by an info 'orchestrator synthesis skipped' log event; it is absent
everywhere when synthesis is not configured or actually ran, so
existing runs stay byte identical.
