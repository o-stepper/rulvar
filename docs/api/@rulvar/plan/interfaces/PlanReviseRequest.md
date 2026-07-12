[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanReviseRequest

# Interface: PlanReviseRequest

Defined in: [packages/plan/src/plan-entries.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L121)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-base"></a> `base` | [`PlanSnapshotRef`](/api/@rulvar/plan/interfaces/PlanSnapshotRef.md) | Mandatory; the call is rejected without it (docs/07, 3.5). | [packages/plan/src/plan-entries.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L123) |
| <a id="property-ops"></a> `ops` | [`PlanOp`](/api/@rulvar/plan/type-aliases/PlanOp.md)[] | - | [packages/plan/src/plan-entries.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L124) |
| <a id="property-rationale"></a> `rationale` | `string` | - | [packages/plan/src/plan-entries.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L125) |
