[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OrchestrateAcceptance

# Interface: OrchestrateAcceptance

Defined in: `packages/core/dist/index.d.ts`

The opt-in child completion policy (the v1.40.0 improvement plan's
completion contract): run status 'ok' alone never proves the children
succeeded, because the model may call finish after any mix of child
outcomes. When acceptance is set, the policy is evaluated exactly when
the model's finish validates, the verdict is journaled as ONE decision
entry (so a resume rolls the SAME verdict forward, immune to drift of
the live options), and the workflow result becomes the acceptance
envelope { result, completion, childStatusCounts, degradedReasons }. A
violated policy fails the run with the typed FailRunError (code
'fail_run', data.source 'orchestrator_acceptance') instead of settling
ok. A budget cap settle keeps its atCap policy: the cap partial is
already visible as run status 'exhausted' or the typed fail run error,
never a plain ok, so acceptance does not judge it again.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-childpolicy"></a> `childPolicy` | \| `"all-ok"` \| \{ `minSuccessful`: `number`; \} | 'all-ok' requires EVERY spawned child to have settled 'ok' when finish validates: a child still running counts against the policy, and so does a deliberately cancelled straggler (spawn nothing you do not need to succeed; zero spawned children are vacuously complete). { minSuccessful: N } requires at least N children settled 'ok' and reports every other child in degradedReasons. | `packages/core/dist/index.d.ts` |
