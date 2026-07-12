[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanRunnerOptions

# Interface: PlanRunnerOptions

Defined in: [packages/plan/src/plan-runner.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L125)

Configuration knobs of the PlanRunner extension.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approachvocabulary"></a> `approachVocabulary?` | `string`[] | Out-of-vocabulary tags get a typed tool error with bounded re-prompt (DEF-3). | [packages/plan/src/plan-runner.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L130) |
| <a id="property-guards"></a> `guards?` | [`RevisionGuardsOptions`](/api/@rulvar/plan/interfaces/RevisionGuardsOptions.md) | - | [packages/plan/src/plan-runner.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L128) |
| <a id="property-limits"></a> `limits?` | `Partial`\&lt;`Pick`\&lt;[`TerminationLimits`](/api/@rulvar/rulvar/interfaces/TerminationLimits.md), `"maxTotalSpawns"` \| `"maxEscalationsPerLogicalTask"` \| `"maxDepth"`\&gt;\&gt; | Frozen termination knobs beyond the revision budget (DEF-2). | [packages/plan/src/plan-runner.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L134) |
| <a id="property-maxrevisionsperrun"></a> `maxRevisionsPerRun?` | `number` | Absolute, non-replenishable; default 32 (DEF-2). | [packages/plan/src/plan-runner.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L127) |
| <a id="property-reuse"></a> `reuse?` | [`ReuseConfig`](/api/@rulvar/rulvar/interfaces/ReuseConfig.md) | Reuse-by-reference configuration (DEF-5). | [packages/plan/src/plan-runner.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L132) |
