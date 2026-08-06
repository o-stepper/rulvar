[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionStatsBefore

# Interface: AdmissionStatsBefore

Defined in: [packages/core/src/orchestrator/admission.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L243)

Live pre-append snapshot embedded in the decision entry (DEF-2/DEF-3).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-childrenofparentbefore"></a> `childrenOfParentBefore` | `number` | - | [packages/core/src/orchestrator/admission.ts:245](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L245) |
| <a id="property-depth"></a> `depth` | `number` | - | [packages/core/src/orchestrator/admission.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L246) |
| <a id="property-lineage"></a> `lineage?` | [`LineageStats`](/api/@rulvar/core/interfaces/LineageStats.md) | The LTID's pinned lineage fold at admit time (DEF-3). | [packages/core/src/orchestrator/admission.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L248) |
| <a id="property-spawnsbefore"></a> `spawnsBefore` | `number` | - | [packages/core/src/orchestrator/admission.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L244) |
