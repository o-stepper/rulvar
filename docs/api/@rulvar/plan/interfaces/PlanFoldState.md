[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanFoldState

# Interface: PlanFoldState

Defined in: [packages/plan/src/plan-entries.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L262)

The plan fold state: the working state plus fold-side records that
deliberately stay OUT of planHash. `badBaseStreak` reconciles two
normative clauses: a bad_base revision leaves the hashed state
byte-identical (planHashAfter == planHashBefore)
yet still lengthens the guard streak: the
guards therefore consume `effectiveDroppedStreak`, the hashed counter
plus the trailing bad_base entries. `doneRefs` remembers which entry
resolved each done node so waive_dep drops can point blockingRef at
it.

## Extends

- [`PlanWorking`](/api/@rulvar/plan/interfaces/PlanWorking.md)

## Properties

| Property | Type | Inherited from | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-badbasestreak"></a> `badBaseStreak` | `number` | - | [packages/plan/src/plan-entries.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L263) |
| <a id="property-donerefs"></a> `doneRefs` | `Record`\&lt;[`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md), [`EntryRef`](/api/@rulvar/rulvar/type-aliases/EntryRef.md)\&gt; | - | [packages/plan/src/plan-entries.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L264) |
| <a id="property-plan"></a> `plan` | [`TaskPlan`](/api/@rulvar/plan/interfaces/TaskPlan.md) | [`PlanWorking`](/api/@rulvar/plan/interfaces/PlanWorking.md).[`plan`](/api/@rulvar/plan/interfaces/PlanWorking.md#property-plan) | [packages/plan/src/plan-entries.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L247) |
| <a id="property-specs"></a> `specs` | `Readonly`\&lt;`Record`\&lt;[`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md), [`TaskSpec`](/api/@rulvar/plan/interfaces/TaskSpec.md)\&gt;\&gt; | [`PlanWorking`](/api/@rulvar/plan/interfaces/PlanWorking.md).[`specs`](/api/@rulvar/plan/interfaces/PlanWorking.md#property-specs) | [packages/plan/src/plan-entries.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L248) |
