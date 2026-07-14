[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / RebaseContext

# Interface: RebaseContext

Defined in: [packages/plan/src/rebase.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L44)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admitadd"></a> `admitAdd?` | (`op`, `nodeId`, `opIndex`) => [`AdmissionDecision`](/api/@rulvar/rulvar/interfaces/AdmissionDecision.md) | Embedded admission for add_task; absent admits nothing. | [packages/plan/src/rebase.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L54) |
| <a id="property-admitunpark"></a> `admitUnpark?` | (`op`, `node`, `opIndex`) => [`AdmissionDecision`](/api/@rulvar/rulvar/interfaces/AdmissionDecision.md) | Embedded admission reserve for unpark_task. | [packages/plan/src/rebase.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L60) |
| <a id="property-dedup"></a> `dedup?` | (`op`, `opIndex`) => \| [`ReuseTransform`](/api/@rulvar/plan/interfaces/ReuseTransform.md) \| `undefined` | Reuse-by-reference dedup at the fold head (DEF-5; M7-T07). | [packages/plan/src/rebase.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L68) |
| <a id="property-digestplanhashfor"></a> `digestPlanHashFor` | (`digestSeq`) => `string` \| `undefined` | The plan hash recorded in the WakeDigest the base references. | [packages/plan/src/rebase.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L48) |
| <a id="property-frozen"></a> `frozen?` | `boolean` | The plan is frozen for adaptation by orchestrator_budget_cap (DEF-7). | [packages/plan/src/rebase.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L52) |
| <a id="property-lineagecheck"></a> `lineageCheck?` | (`continues`) => `"lineage_exhausted"` \| `"lineage_busy"` \| `"ok"` | Lineage-at-head check for add_task lineage blocks (DEF-3). | [packages/plan/src/rebase.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L66) |
| <a id="property-mintnodeid"></a> `mintNodeId` | () => `string` | Engine NodeId minting (ULIDs; never the model). | [packages/plan/src/rebase.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L50) |
| <a id="property-state"></a> `state` | [`PlanFoldState`](/api/@rulvar/plan/interfaces/PlanFoldState.md) | The fold head. | [packages/plan/src/rebase.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L46) |
