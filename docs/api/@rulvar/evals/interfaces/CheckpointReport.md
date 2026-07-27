[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / CheckpointReport

# Interface: CheckpointReport

Defined in: [packages/evals/src/checkpoint.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L138)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-criterion1"></a> `criterion1` | [`CriterionOneReport`](/api/@rulvar/evals/interfaces/CriterionOneReport.md) | - | [packages/evals/src/checkpoint.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L140) |
| <a id="property-criterion2"></a> `criterion2?` | [`CriterionTwoReport`](/api/@rulvar/evals/interfaces/CriterionTwoReport.md) | - | [packages/evals/src/checkpoint.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L141) |
| <a id="property-observedat"></a> `observedAt` | `string` | - | [packages/evals/src/checkpoint.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L139) |
| <a id="property-passed"></a> `passed` | `boolean` | Both criteria (criterion 2 counts as failed when unmeasured). | [packages/evals/src/checkpoint.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L143) |
