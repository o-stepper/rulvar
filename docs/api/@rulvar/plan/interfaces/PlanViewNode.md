[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanViewNode

# Interface: PlanViewNode

Defined in: [packages/plan/src/tools.ts:270](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L270)

One rendered node of the pinned plan_view fold.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-deps"></a> `deps` | `string`[] | [packages/plan/src/tools.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L274) |
| <a id="property-lineage"></a> `lineage?` | [`LineageStats`](/api/@rulvar/rulvar/interfaces/LineageStats.md) | [packages/plan/src/tools.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L277) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | [packages/plan/src/tools.ts:272](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L272) |
| <a id="property-nodeid"></a> `nodeId` | `string` | [packages/plan/src/tools.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L271) |
| <a id="property-priority"></a> `priority` | `number` | [packages/plan/src/tools.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L276) |
| <a id="property-status"></a> `status` | [`PlanNodeStatus`](/api/@rulvar/plan/type-aliases/PlanNodeStatus.md) | [packages/plan/src/tools.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L273) |
| <a id="property-waiveddeps"></a> `waivedDeps` | `string`[] | [packages/plan/src/tools.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L275) |
