[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / CheckpointReport

# Interface: CheckpointReport

Defined in: [packages/evals/src/checkpoint.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L120)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-criterion1"></a> `criterion1` | [`CriterionOneReport`](/api/@rulvar/evals/interfaces/CriterionOneReport.md) | - | [packages/evals/src/checkpoint.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L122) |
| <a id="property-criterion2"></a> `criterion2?` | [`CriterionTwoReport`](/api/@rulvar/evals/interfaces/CriterionTwoReport.md) | - | [packages/evals/src/checkpoint.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L123) |
| <a id="property-observedat"></a> `observedAt` | `string` | - | [packages/evals/src/checkpoint.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L121) |
| <a id="property-passed"></a> `passed` | `boolean` | Both criteria (criterion 2 counts as failed when unmeasured). | [packages/evals/src/checkpoint.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L125) |
