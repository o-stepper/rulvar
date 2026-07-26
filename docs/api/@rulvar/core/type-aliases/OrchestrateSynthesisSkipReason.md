[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestrateSynthesisSkipReason

# Type Alias: OrchestrateSynthesisSkipReason

```ts
type OrchestrateSynthesisSkipReason = "synthesis_skipped_by_acceptance" | "synthesis_skipped_by_budget_cap";
```

Defined in: [packages/core/src/orchestrator/orchestrate.ts:568](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L568)

The machine-readable reason a CONFIGURED synthesis step was skipped
(the 1.65.0 experiment review, item 11.4): telemetry that shows zero
synthesize spend must say why instead of leaving the host to infer it
from the acceptance decision. 'synthesis_skipped_by_acceptance': the
acceptance policy rejected the finish, and a rejected run never pays
for the post-fan-in composing step (in 'incremental' mode the settled
notes were already paid during the run; the skipped step is the free
deterministic reconciliation). 'synthesis_skipped_by_budget_cap': the
orchestrator budget cap froze the plan, and a capped run settles
through the reserved finalizer, never synthesis. The reason is frozen
into the journaled decision that caused the skip (the acceptance
decision or the budget-cap decision), spread into the typed
FailRunError data on the failing paths, and announced by an info
'orchestrator synthesis skipped' log event; it is absent everywhere
when synthesis is not configured or actually ran, so existing runs
stay byte identical.
