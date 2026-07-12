[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanViewNode

# Interface: PlanViewNode

Defined in: [packages/plan/src/tools.ts:310](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L310)

One rendered node of the pinned plan_view fold.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-deps"></a> `deps` | `string`[] | [packages/plan/src/tools.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L314) |
| <a id="property-lineage"></a> `lineage?` | [`LineageStats`](/api/@rulvar/rulvar/interfaces/LineageStats.md) | [packages/plan/src/tools.ts:317](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L317) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | [packages/plan/src/tools.ts:312](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L312) |
| <a id="property-nodeid"></a> `nodeId` | `string` | [packages/plan/src/tools.ts:311](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L311) |
| <a id="property-priority"></a> `priority` | `number` | [packages/plan/src/tools.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L316) |
| <a id="property-status"></a> `status` | [`PlanNodeStatus`](/api/@rulvar/plan/type-aliases/PlanNodeStatus.md) | [packages/plan/src/tools.ts:313](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L313) |
| <a id="property-waiveddeps"></a> `waivedDeps` | `string`[] | [packages/plan/src/tools.ts:315](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L315) |
