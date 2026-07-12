[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionStatsBefore

# Interface: AdmissionStatsBefore

Defined in: [packages/core/src/orchestrator/admission.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L162)

Live pre-append snapshot embedded in the decision entry (DEF-2/DEF-3).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-childrenofparentbefore"></a> `childrenOfParentBefore` | `number` | - | [packages/core/src/orchestrator/admission.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L164) |
| <a id="property-depth"></a> `depth` | `number` | - | [packages/core/src/orchestrator/admission.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L165) |
| <a id="property-lineage"></a> `lineage?` | [`LineageStats`](/api/@rulvar/core/interfaces/LineageStats.md) | The LTID's pinned lineage fold at admit time (DEF-3). | [packages/core/src/orchestrator/admission.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L167) |
| <a id="property-spawnsbefore"></a> `spawnsBefore` | `number` | - | [packages/core/src/orchestrator/admission.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L163) |
