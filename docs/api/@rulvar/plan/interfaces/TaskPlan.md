[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / TaskPlan

# Interface: TaskPlan

Defined in: [packages/plan/src/plan-state.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L70)

TaskPlan: typed data owned by the engine, never prose in a transcript.
The guard fold counters ride the same record because
they enter planHash: `revisionCount` counts journaled
plan.revision entries; `droppedRevisionStreak` counts consecutive
fully-dropped revisions (RevisionGuards).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-droppedrevisionstreak"></a> `droppedRevisionStreak` | `number` | [packages/plan/src/plan-state.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L73) |
| <a id="property-nodes"></a> `nodes` | `Readonly`\&lt;`Record`\&lt;[`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md), [`PlanNode`](/api/@rulvar/plan/interfaces/PlanNode.md)\&gt;\&gt; | [packages/plan/src/plan-state.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L71) |
| <a id="property-revisioncount"></a> `revisionCount` | `number` | [packages/plan/src/plan-state.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L72) |
