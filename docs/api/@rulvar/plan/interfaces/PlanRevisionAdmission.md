[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PlanRevisionAdmission

# Interface: PlanRevisionAdmission

Defined in: [packages/plan/src/plan-entries.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L148)

One embedded admission beside its op (DEF-2/DEF-3 folds read it).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-decision"></a> `decision` | [`AdmissionDecision`](/api/@rulvar/rulvar/interfaces/AdmissionDecision.md) | - | [packages/plan/src/plan-entries.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L151) |
| <a id="property-nodeid"></a> `nodeId?` | `string` | - | [packages/plan/src/plan-entries.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L150) |
| <a id="property-opindex"></a> `opIndex` | `number` | - | [packages/plan/src/plan-entries.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L149) |
| <a id="property-reuse"></a> `reuse?` | \{ `chain`: `string`[]; `donorScope`: `string`; \} | Reuse placement recorded beside a reuse_full/admit_graft verdict (DEF-5). | [packages/plan/src/plan-entries.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L153) |
| `reuse.chain` | `string`[] | - | [packages/plan/src/plan-entries.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L153) |
| `reuse.donorScope` | `string` | - | [packages/plan/src/plan-entries.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-entries.ts#L153) |
