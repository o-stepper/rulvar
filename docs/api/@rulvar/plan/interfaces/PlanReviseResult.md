[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanReviseResult

# Interface: PlanReviseResult

Defined in: [packages/plan/src/plan-entries.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L129)

The canonical result form (XF-11): DEF-8 shape plus the DEF-2 balance.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-assignednodeids"></a> `assignedNodeIds` | `Record`\&lt;`number`, [`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md)\&gt; | [packages/plan/src/plan-entries.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L131) |
| <a id="property-droppedall"></a> `droppedAll` | `boolean` | [packages/plan/src/plan-entries.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L133) |
| <a id="property-outcomes"></a> `outcomes` | [`RebaseOutcome`](/api/@rulvar/plan/type-aliases/RebaseOutcome.md)[] | [packages/plan/src/plan-entries.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L130) |
| <a id="property-planhashafter"></a> `planHashAfter` | `string` | [packages/plan/src/plan-entries.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L132) |
| <a id="property-revisionunitsremaining"></a> `revisionUnitsRemaining` | `number` | [packages/plan/src/plan-entries.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L134) |
