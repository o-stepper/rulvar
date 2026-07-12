[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / RebaseContext

# Interface: RebaseContext

Defined in: [packages/plan/src/rebase.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L45)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admitadd"></a> `admitAdd?` | (`op`, `nodeId`, `opIndex`) => [`AdmissionDecision`](/api/@rulvar/rulvar/interfaces/AdmissionDecision.md) | Embedded admission for add_task (docs/07, 3.6); absent admits nothing. | [packages/plan/src/rebase.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L55) |
| <a id="property-admitunpark"></a> `admitUnpark?` | (`op`, `node`, `opIndex`) => [`AdmissionDecision`](/api/@rulvar/rulvar/interfaces/AdmissionDecision.md) | Embedded admission reserve for unpark_task (docs/07, 3.6). | [packages/plan/src/rebase.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L61) |
| <a id="property-dedup"></a> `dedup?` | (`op`, `opIndex`) => \| [`ReuseTransform`](/api/@rulvar/plan/interfaces/ReuseTransform.md) \| `undefined` | Reuse-by-reference dedup at the fold head (DEF-5; M7-T07). | [packages/plan/src/rebase.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L69) |
| <a id="property-digestplanhashfor"></a> `digestPlanHashFor` | (`digestSeq`) => `string` \| `undefined` | The plan hash recorded in the WakeDigest the base references. | [packages/plan/src/rebase.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L49) |
| <a id="property-frozen"></a> `frozen?` | `boolean` | The plan is frozen for adaptation by orchestrator_budget_cap (DEF-7). | [packages/plan/src/rebase.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L53) |
| <a id="property-lineagecheck"></a> `lineageCheck?` | (`continues`) => `"lineage_exhausted"` \| `"lineage_busy"` \| `"ok"` | Lineage-at-head check for add_task lineage blocks (DEF-3). | [packages/plan/src/rebase.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L67) |
| <a id="property-mintnodeid"></a> `mintNodeId` | () => `string` | Engine NodeId minting (ULIDs; never the model). | [packages/plan/src/rebase.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L51) |
| <a id="property-state"></a> `state` | [`PlanFoldState`](/api/@rulvar/plan/interfaces/PlanFoldState.md) | The fold head (docs/07, 3.5 step 3). | [packages/plan/src/rebase.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L47) |
