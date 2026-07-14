[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / RebaseEvaluation

# Interface: RebaseEvaluation

Defined in: [packages/plan/src/rebase.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L71)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admissions"></a> `admissions` | [`PlanRevisionAdmission`](/api/@rulvar/plan/interfaces/PlanRevisionAdmission.md)[] | - | [packages/plan/src/rebase.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L74) |
| <a id="property-assignednodeids"></a> `assignedNodeIds` | `Record`\&lt;`number`, [`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md)\&gt; | - | [packages/plan/src/rebase.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L73) |
| <a id="property-badbase"></a> `badBase` | `boolean` | - | [packages/plan/src/rebase.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L78) |
| <a id="property-droppedall"></a> `droppedAll` | `boolean` | - | [packages/plan/src/rebase.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L77) |
| <a id="property-outcomes"></a> `outcomes` | [`RebaseOutcome`](/api/@rulvar/plan/type-aliases/RebaseOutcome.md)[] | - | [packages/plan/src/rebase.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L72) |
| <a id="property-planhashafter"></a> `planHashAfter` | `string` | - | [packages/plan/src/rebase.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L76) |
| <a id="property-planhashbefore"></a> `planHashBefore` | `string` | - | [packages/plan/src/rebase.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L75) |
| <a id="property-working"></a> `working` | [`PlanWorking`](/api/@rulvar/plan/interfaces/PlanWorking.md) | The post-revision working state (counters updated, readiness recomputed). | [packages/plan/src/rebase.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L80) |
