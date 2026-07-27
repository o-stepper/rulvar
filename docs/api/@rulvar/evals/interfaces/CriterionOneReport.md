[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / CriterionOneReport

# Interface: CriterionOneReport

Defined in: [packages/evals/src/checkpoint.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L118)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cells"></a> `cells` | [`CheckpointCell`](/api/@rulvar/evals/interfaces/CheckpointCell.md)[] | - | [packages/evals/src/checkpoint.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L119) |
| <a id="property-cellspassed"></a> `cellsPassed` | `number` | - | [packages/evals/src/checkpoint.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L120) |
| <a id="property-contaminatedcells"></a> `contaminatedCells?` | `number` | Cells with a contaminated arm; present when nonzero (cycle 81). | [packages/evals/src/checkpoint.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L126) |
| <a id="property-majorityholds"></a> `majorityHolds` | `boolean` | - | [packages/evals/src/checkpoint.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L121) |
| <a id="property-passed"></a> `passed` | `boolean` | - | [packages/evals/src/checkpoint.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L127) |
| <a id="property-pooledbaseline"></a> `pooledBaseline` | [`CheckpointArm`](/api/@rulvar/evals/interfaces/CheckpointArm.md) | - | [packages/evals/src/checkpoint.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L122) |
| <a id="property-pooledholds"></a> `pooledHolds` | `boolean` | - | [packages/evals/src/checkpoint.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L124) |
| <a id="property-pooledtreatment"></a> `pooledTreatment` | [`CheckpointArm`](/api/@rulvar/evals/interfaces/CheckpointArm.md) | - | [packages/evals/src/checkpoint.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L123) |
