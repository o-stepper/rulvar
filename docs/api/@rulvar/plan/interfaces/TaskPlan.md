[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / TaskPlan

# Interface: TaskPlan

Defined in: [packages/plan/src/plan-state.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L67)

TaskPlan: typed data owned by the engine, never prose in a transcript
(docs/07, 3.1). The guard fold counters ride the same record because
they enter planHash (docs/07, 3.4): `revisionCount` counts journaled
plan.revision entries; `droppedRevisionStreak` counts consecutive
fully-dropped revisions (RevisionGuards, docs/07, 3.8).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-droppedrevisionstreak"></a> `droppedRevisionStreak` | `number` | [packages/plan/src/plan-state.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L70) |
| <a id="property-nodes"></a> `nodes` | `Readonly`\&lt;`Record`\&lt;[`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md), [`PlanNode`](/api/@rulvar/plan/interfaces/PlanNode.md)\&gt;\&gt; | [packages/plan/src/plan-state.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L68) |
| <a id="property-revisioncount"></a> `revisionCount` | `number` | [packages/plan/src/plan-state.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L69) |
