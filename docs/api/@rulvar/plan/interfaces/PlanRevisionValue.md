[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanRevisionValue

# Interface: PlanRevisionValue

Defined in: [packages/plan/src/plan-entries.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L157)

The value payload of a plan.revision entry (XF-11).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admissions"></a> `admissions` | [`PlanRevisionAdmission`](/api/@rulvar/plan/interfaces/PlanRevisionAdmission.md)[] | - | [packages/plan/src/plan-entries.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L163) |
| <a id="property-assignednodeids"></a> `assignedNodeIds` | `Record`\&lt;`number`, [`NodeId`](/api/@rulvar/rulvar/type-aliases/NodeId.md)\&gt; | - | [packages/plan/src/plan-entries.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L162) |
| <a id="property-base"></a> `base` | [`PlanSnapshotRef`](/api/@rulvar/plan/interfaces/PlanSnapshotRef.md) | - | [packages/plan/src/plan-entries.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L158) |
| <a id="property-debits"></a> `debits?` | \{ `balanceAfter`: `number`; `logicalTaskId?`: `string`; `resource`: `string`; \}[] | - | [packages/plan/src/plan-entries.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L171) |
| <a id="property-hashversion"></a> `hashVersion` | `number` | - | [packages/plan/src/plan-entries.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L166) |
| <a id="property-outcomes"></a> `outcomes` | [`RebaseOutcome`](/api/@rulvar/plan/type-aliases/RebaseOutcome.md)[] | Same length and order as requestedOps. | [packages/plan/src/plan-entries.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L161) |
| <a id="property-planhashafter"></a> `planHashAfter` | `string` | - | [packages/plan/src/plan-entries.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L165) |
| <a id="property-planhashbefore"></a> `planHashBefore` | `string` | - | [packages/plan/src/plan-entries.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L164) |
| <a id="property-rationale"></a> `rationale` | `string` | Cosmetic: never enters the content key. | [packages/plan/src/plan-entries.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L168) |
| <a id="property-requestedops"></a> `requestedOps` | [`PlanOp`](/api/@rulvar/plan/type-aliases/PlanOp.md)[] | - | [packages/plan/src/plan-entries.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L159) |
| <a id="property-revisionunitsafter"></a> `revisionUnitsAfter?` | `number` | DEF-2 extensions. | [packages/plan/src/plan-entries.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L170) |
