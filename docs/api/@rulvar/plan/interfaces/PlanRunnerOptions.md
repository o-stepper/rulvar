[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanRunnerOptions

# Interface: PlanRunnerOptions

Defined in: [packages/plan/src/plan-runner.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L126)

docs/07, 3.8.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approachvocabulary"></a> `approachVocabulary?` | `string`[] | Out-of-vocabulary tags get a typed tool error with bounded re-prompt (DEF-3). | [packages/plan/src/plan-runner.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L131) |
| <a id="property-guards"></a> `guards?` | [`RevisionGuardsOptions`](/api/@rulvar/plan/interfaces/RevisionGuardsOptions.md) | - | [packages/plan/src/plan-runner.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L129) |
| <a id="property-limits"></a> `limits?` | `Partial`\&lt;`Pick`\&lt;[`TerminationLimits`](/api/@rulvar/rulvar/interfaces/TerminationLimits.md), `"maxTotalSpawns"` \| `"maxEscalationsPerLogicalTask"` \| `"maxDepth"`\&gt;\&gt; | Frozen termination knobs beyond the revision budget (DEF-2). | [packages/plan/src/plan-runner.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L135) |
| <a id="property-maxrevisionsperrun"></a> `maxRevisionsPerRun?` | `number` | Absolute, non-replenishable; default 32 (DEF-2). | [packages/plan/src/plan-runner.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L128) |
| <a id="property-reuse"></a> `reuse?` | [`ReuseConfig`](/api/@rulvar/rulvar/interfaces/ReuseConfig.md) | Reuse-by-reference configuration (DEF-5; docs/03, 9.9). | [packages/plan/src/plan-runner.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L133) |
