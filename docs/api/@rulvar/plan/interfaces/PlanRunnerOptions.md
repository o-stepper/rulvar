[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanRunnerOptions

# Interface: PlanRunnerOptions

Defined in: [packages/plan/src/plan-runner.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L133)

Configuration knobs of the PlanRunner extension.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approachvocabulary"></a> `approachVocabulary?` | `string`[] | Out-of-vocabulary tags get a typed tool error with bounded re-prompt (DEF-3). | [packages/plan/src/plan-runner.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L138) |
| <a id="property-guards"></a> `guards?` | [`RevisionGuardsOptions`](/api/@rulvar/plan/interfaces/RevisionGuardsOptions.md) | - | [packages/plan/src/plan-runner.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L136) |
| <a id="property-kbpropose"></a> `kbPropose?` | `boolean` | ModelKnowledge phase 3 opt-in: registers the kb_propose tool, which journals quarantined model observations into the RunLedger's modelObservations section. Registered like any opt-in tool, so enabling it changes toolsetHash by design. Default false. | [packages/plan/src/plan-runner.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L151) |
| <a id="property-limits"></a> `limits?` | `Partial`\&lt;`Pick`\&lt;[`TerminationLimits`](/api/@rulvar/rulvar/interfaces/TerminationLimits.md), `"maxTotalSpawns"` \| `"maxEscalationsPerLogicalTask"` \| `"maxDepth"`\&gt;\&gt; | Frozen termination knobs beyond the revision budget (DEF-2). | [packages/plan/src/plan-runner.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L142) |
| <a id="property-maxrevisionsperrun"></a> `maxRevisionsPerRun?` | `number` | Absolute, non-replenishable; default 32 (DEF-2). | [packages/plan/src/plan-runner.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L135) |
| <a id="property-reuse"></a> `reuse?` | [`ReuseConfig`](/api/@rulvar/rulvar/interfaces/ReuseConfig.md) | Reuse-by-reference configuration (DEF-5). | [packages/plan/src/plan-runner.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L140) |
