[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanRunnerOptions

# Interface: PlanRunnerOptions

Defined in: [packages/plan/src/plan-runner.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L134)

Configuration knobs of the PlanRunner extension.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allowearlyfinish"></a> `allowEarlyFinish?` | `boolean` | Disarms the finish gate (RV3202). By default the coordination finish REFUSES while any plan node is ready or running, naming the stragglers, because the plan is the extension's authority: a root that finishes over a running node used to settle a bare ok while the exit barrier cancelled the node (the 2026-08-11 experiment's blocker). Opting out restores that pre-RV3202 behavior for hosts whose acceptance policy already owns the boundary. Default false. | [packages/plan/src/plan-runner.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L162) |
| <a id="property-approachvocabulary"></a> `approachVocabulary?` | `string`[] | Out-of-vocabulary tags get a typed tool error with bounded re-prompt (DEF-3). | [packages/plan/src/plan-runner.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L139) |
| <a id="property-guards"></a> `guards?` | [`RevisionGuardsOptions`](/api/@rulvar/plan/interfaces/RevisionGuardsOptions.md) | - | [packages/plan/src/plan-runner.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L137) |
| <a id="property-kbpropose"></a> `kbPropose?` | `boolean` | ModelKnowledge phase 3 opt-in: registers the kb_propose tool, which journals quarantined model observations into the RunLedger's modelObservations section. Registered like any opt-in tool, so enabling it changes toolsetHash by design. Default false. | [packages/plan/src/plan-runner.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L152) |
| <a id="property-limits"></a> `limits?` | `Partial`\&lt;`Pick`\&lt;[`TerminationLimits`](/api/@rulvar/rulvar/interfaces/TerminationLimits.md), `"maxTotalSpawns"` \| `"maxEscalationsPerLogicalTask"` \| `"maxDepth"`\&gt;\&gt; | Frozen termination knobs beyond the revision budget (DEF-2). | [packages/plan/src/plan-runner.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L143) |
| <a id="property-maxrevisionsperrun"></a> `maxRevisionsPerRun?` | `number` | Absolute, non-replenishable; default 32 (DEF-2). | [packages/plan/src/plan-runner.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L136) |
| <a id="property-reuse"></a> `reuse?` | [`ReuseConfig`](/api/@rulvar/rulvar/interfaces/ReuseConfig.md) | Reuse-by-reference configuration (DEF-5). | [packages/plan/src/plan-runner.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L141) |
