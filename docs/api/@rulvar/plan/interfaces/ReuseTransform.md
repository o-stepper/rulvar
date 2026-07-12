[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / ReuseTransform

# Interface: ReuseTransform

Defined in: [packages/plan/src/rebase.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L37)

The reuse-by-reference transform hook (DEF-5; M7-T07).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admission"></a> `admission` | [`AdmissionDecision`](/api/@rulvar/rulvar/interfaces/AdmissionDecision.md) | - | [packages/plan/src/rebase.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L39) |
| <a id="property-applied"></a> `applied` | [`AppliedPlanOp`](/api/@rulvar/plan/type-aliases/AppliedPlanOp.md) | - | [packages/plan/src/rebase.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L38) |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | [packages/plan/src/rebase.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L40) |
| <a id="property-reuse"></a> `reuse` | \{ `chain`: `string`[]; `donorScope`: `string`; \} | Donor placement recorded beside the verdict (docs/03, 9.5). | [packages/plan/src/rebase.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L42) |
| `reuse.chain` | `string`[] | - | [packages/plan/src/rebase.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L42) |
| `reuse.donorScope` | `string` | - | [packages/plan/src/rebase.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/rebase.ts#L42) |
