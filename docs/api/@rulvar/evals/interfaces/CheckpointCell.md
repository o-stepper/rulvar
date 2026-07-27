[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / CheckpointCell

# Interface: CheckpointCell

Defined in: [packages/evals/src/checkpoint.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L97)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-baseline"></a> `baseline` | [`CheckpointArm`](/api/@rulvar/evals/interfaces/CheckpointArm.md) | - | [packages/evals/src/checkpoint.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L104) |
| <a id="property-contaminated"></a> `contaminated?` | `true` | Either arm carried a measurement artifact (an envelope refusal, an incomplete row, or a target that settled non-ok): the arms are not comparable, the cell can never pass, and criterion 1 fails (cycle 81). Without this, an envelope drained by the baseline left an EMPTY refused treatment arm (n 0, cost 0) that mechanically beat any baseline under the cheaper-at-equal-quality branch. | [packages/evals/src/checkpoint.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L114) |
| <a id="property-defaulttier"></a> `defaultTier` | `number` | - | [packages/evals/src/checkpoint.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L100) |
| <a id="property-ladder"></a> `ladder` | `string` | - | [packages/evals/src/checkpoint.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L98) |
| <a id="property-passed"></a> `passed` | `boolean` | - | [packages/evals/src/checkpoint.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L115) |
| <a id="property-recommended"></a> `recommended` | `boolean` | - | [packages/evals/src/checkpoint.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L103) |
| <a id="property-taskclass"></a> `taskClass` | [`TaskClass`](/api/@rulvar/rulvar/type-aliases/TaskClass.md) | - | [packages/evals/src/checkpoint.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L99) |
| <a id="property-treatment"></a> `treatment` | [`CheckpointArm`](/api/@rulvar/evals/interfaces/CheckpointArm.md) | - | [packages/evals/src/checkpoint.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L105) |
| <a id="property-treatmenttier"></a> `treatmentTier` | `number` | The tier the treatment arm ran at (default when no recommendation). | [packages/evals/src/checkpoint.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L102) |
