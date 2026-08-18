[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WireCapacitySpec

# Interface: WireCapacitySpec

Defined in: [packages/core/src/orchestrator/admission.ts:408](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L408)

The declared wire counts of one orchestration plan (RV4005).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-childwires"></a> `childWires` | `number` | Fan-out provider dispatches: children times their turns. | [packages/core/src/orchestrator/admission.ts:410](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L410) |
| <a id="property-coordinationwires"></a> `coordinationWires?` | `number` | Coordination loop dispatches, the finish exchanges included. | [packages/core/src/orchestrator/admission.ts:412](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L412) |
| <a id="property-extractwires"></a> `extractWires?` | `number` | Separate extract dispatches, when the finish rides one (RV3908 spares the schema'd final). | [packages/core/src/orchestrator/admission.ts:425](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L425) |
| <a id="property-judgewires"></a> `judgeWires?` | `number` | Worst-case claim judge dispatches; feed [acceptanceJudgePasses](/api/@rulvar/core/functions/acceptanceJudgePasses.md) the declared posture to get it. NOTE: that count already includes the armed round's rejudge, while the estimate below prices the round's delta separately, so pass the UNARMED reading here ((stage === 'both') ? 2 : 1) when you intend to read `repairRoundDeltaWires` as the whole round. | [packages/core/src/orchestrator/admission.ts:423](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L423) |
| <a id="property-synthesiswires"></a> `synthesisWires?` | `number` | Composition invocations of the base plan (the initial synthesis). | [packages/core/src/orchestrator/admission.ts:414](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L414) |
