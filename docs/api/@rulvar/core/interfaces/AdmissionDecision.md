[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionDecision

# Interface: AdmissionDecision

Defined in: [packages/core/src/orchestrator/admission.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L196)

The full admission decision embedded in the carrying entry.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ladderlength"></a> `ladderLength?` | `number` | The declared ladder length recorded for the termination fold (DEF-2): the replay recomputation reads K_l from the entry, never from the live registry. Present only under a termination account. | [packages/core/src/orchestrator/admission.ts:211](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L211) |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineage`](/api/@rulvar/core/interfaces/SpawnLineage.md) | The computed value-part lineage block (DEF-3): reused byte-exact on replay, never recomputed. Absent on reject. | [packages/core/src/orchestrator/admission.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L205) |
| <a id="property-nodeid"></a> `nodeId?` | `string` | Node identity minted inside the decision; absent on reject. | [packages/core/src/orchestrator/admission.ts:200](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L200) |
| <a id="property-statsbefore"></a> `statsBefore` | [`AdmissionStatsBefore`](/api/@rulvar/core/interfaces/AdmissionStatsBefore.md) | - | [packages/core/src/orchestrator/admission.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L198) |
| <a id="property-verdict"></a> `verdict` | [`AdmitVerdict`](/api/@rulvar/core/type-aliases/AdmitVerdict.md) | - | [packages/core/src/orchestrator/admission.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L197) |
