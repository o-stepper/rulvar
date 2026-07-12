[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / applyDecisionOps

# Function: applyDecisionOps()

```ts
function applyDecisionOps(
   state, 
   ops, 
   seq): {
  doneRefs: Record<NodeId, EntryRef>;
  plan: TaskPlan;
  specs: Readonly<Record<string, TaskSpec>>;
};
```

Defined in: [packages/plan/src/plan-entries.ts:527](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L527)

The shared plan.decision applier core: engine authorship happens at
the fold head under PlanWriteLock, so the producer can
PREVIEW the resulting state (and its planHashAfter) before appending,
and the fold re-applies the recorded ops identically on replay.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | `Pick`\&lt;[`PlanFoldState`](/api/@rulvar/plan/interfaces/PlanFoldState.md), `"plan"` \| `"specs"` \| `"doneRefs"`\&gt; |
| `ops` | readonly [`EnginePlanOp`](/api/@rulvar/plan/type-aliases/EnginePlanOp.md)[] |
| `seq` | `number` |

## Returns

```ts
{
  doneRefs: Record<NodeId, EntryRef>;
  plan: TaskPlan;
  specs: Readonly<Record<string, TaskSpec>>;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `doneRefs` | `Record`\&lt;[`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md), [`EntryRef`](/api/@rulvar/rulvar/type-aliases/EntryRef.md)\&gt; | [packages/plan/src/plan-entries.ts:531](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L531) |
| `plan` | [`TaskPlan`](/api/@rulvar/plan/interfaces/TaskPlan.md) | [packages/plan/src/plan-entries.ts:531](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L531) |
| `specs` | `Readonly`\&lt;`Record`\&lt;`string`, [`TaskSpec`](/api/@rulvar/plan/interfaces/TaskSpec.md)\&gt;\&gt; | [packages/plan/src/plan-entries.ts:531](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L531) |
