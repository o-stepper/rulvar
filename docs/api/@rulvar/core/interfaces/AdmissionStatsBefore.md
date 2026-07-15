[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionStatsBefore

# Interface: AdmissionStatsBefore

Defined in: [packages/core/src/orchestrator/admission.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L187)

Live pre-append snapshot embedded in the decision entry (DEF-2/DEF-3).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-childrenofparentbefore"></a> `childrenOfParentBefore` | `number` | - | [packages/core/src/orchestrator/admission.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L189) |
| <a id="property-depth"></a> `depth` | `number` | - | [packages/core/src/orchestrator/admission.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L190) |
| <a id="property-lineage"></a> `lineage?` | [`LineageStats`](/api/@rulvar/core/interfaces/LineageStats.md) | The LTID's pinned lineage fold at admit time (DEF-3). | [packages/core/src/orchestrator/admission.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L192) |
| <a id="property-spawnsbefore"></a> `spawnsBefore` | `number` | - | [packages/core/src/orchestrator/admission.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L188) |
