[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / RevisionGuardsOptions

# Interface: RevisionGuardsOptions

Defined in: [packages/plan/src/guards.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L57)

RevisionGuards configuration.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-droppedrevisionlimit"></a> `droppedRevisionLimit?` | `number` | Default 3 consecutive fully-dropped revisions. | [packages/plan/src/guards.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L70) |
| <a id="property-fallback"></a> `fallback?` | `"reject-revision"` \| `"finish-with-partial"` \| `"fail-run"` | Default 'finish-with-partial'; the chain is non-HITL and terminating. 'reject-revision' and 'finish-with-partial' freeze the plan and steer the orchestrator to finish with the partial result (run outcome 'ok'). 'fail-run' closes the run as a FAILURE: after the journaled guard verdict the PlanRunner terminates the orchestration with FailRunError (code 'fail_run', data.source 'plan_guards', data.verdictRef), no further model turn is consulted, and resume rolls the same failure forward from the verdict entry. | [packages/plan/src/guards.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L68) |
| <a id="property-maxabandonednetusdfraction"></a> `maxAbandonedNetUsdFraction?` | `number` | Optional netLostUsd trigger as a fraction of the starting budget (DEF-5). | [packages/plan/src/guards.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L72) |
