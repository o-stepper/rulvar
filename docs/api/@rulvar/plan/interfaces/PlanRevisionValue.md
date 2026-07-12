[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanRevisionValue

# Interface: PlanRevisionValue

Defined in: [packages/plan/src/plan-entries.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L149)

The value payload of a plan.revision entry (XF-11).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admissions"></a> `admissions` | [`PlanRevisionAdmission`](/api/@rulvar/plan/interfaces/PlanRevisionAdmission.md)[] | - | [packages/plan/src/plan-entries.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L155) |
| <a id="property-assignednodeids"></a> `assignedNodeIds` | `Record`\&lt;`number`, [`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md)\&gt; | - | [packages/plan/src/plan-entries.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L154) |
| <a id="property-base"></a> `base` | [`PlanSnapshotRef`](/api/@rulvar/plan/interfaces/PlanSnapshotRef.md) | - | [packages/plan/src/plan-entries.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L150) |
| <a id="property-debits"></a> `debits?` | \{ `balanceAfter`: `number`; `logicalTaskId?`: `string`; `resource`: `string`; \}[] | - | [packages/plan/src/plan-entries.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L163) |
| <a id="property-hashversion"></a> `hashVersion` | `number` | - | [packages/plan/src/plan-entries.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L158) |
| <a id="property-outcomes"></a> `outcomes` | [`RebaseOutcome`](/api/@rulvar/plan/type-aliases/RebaseOutcome.md)[] | Same length and order as requestedOps. | [packages/plan/src/plan-entries.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L153) |
| <a id="property-planhashafter"></a> `planHashAfter` | `string` | - | [packages/plan/src/plan-entries.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L157) |
| <a id="property-planhashbefore"></a> `planHashBefore` | `string` | - | [packages/plan/src/plan-entries.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L156) |
| <a id="property-rationale"></a> `rationale` | `string` | Cosmetic: never enters the content key. | [packages/plan/src/plan-entries.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L160) |
| <a id="property-requestedops"></a> `requestedOps` | [`PlanOp`](/api/@rulvar/plan/type-aliases/PlanOp.md)[] | - | [packages/plan/src/plan-entries.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L151) |
| <a id="property-revisionunitsafter"></a> `revisionUnitsAfter?` | `number` | DEF-2 extensions. | [packages/plan/src/plan-entries.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L162) |
