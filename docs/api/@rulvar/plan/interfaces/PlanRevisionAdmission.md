[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanRevisionAdmission

# Interface: PlanRevisionAdmission

Defined in: [packages/plan/src/plan-entries.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L140)

One embedded admission beside its op (docs/07, 3.3; DEF-2/DEF-3 folds read it).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-decision"></a> `decision` | [`AdmissionDecision`](/api/@rulvar/rulvar/interfaces/AdmissionDecision.md) | - | [packages/plan/src/plan-entries.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L143) |
| <a id="property-nodeid"></a> `nodeId?` | `string` | - | [packages/plan/src/plan-entries.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L142) |
| <a id="property-opindex"></a> `opIndex` | `number` | - | [packages/plan/src/plan-entries.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L141) |
| <a id="property-reuse"></a> `reuse?` | \{ `chain`: `string`[]; `donorScope`: `string`; \} | Reuse placement recorded beside a reuse_full/admit_graft verdict (DEF-5). | [packages/plan/src/plan-entries.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L145) |
| `reuse.chain` | `string`[] | - | [packages/plan/src/plan-entries.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L145) |
| `reuse.donorScope` | `string` | - | [packages/plan/src/plan-entries.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L145) |
