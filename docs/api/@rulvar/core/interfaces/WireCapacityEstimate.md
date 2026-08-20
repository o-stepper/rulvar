[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WireCapacityEstimate

# Interface: WireCapacityEstimate

Defined in: [packages/core/src/orchestrator/admission.ts:511](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L511)

What one orchestration plan costs in wires, base and worst case (RV4005).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-basewires"></a> `baseWires` | `number` | The plan's wire total with no repair of any kind. | [packages/core/src/orchestrator/admission.ts:522](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L522) |
| <a id="property-basis"></a> `basis` | `"declared-estimate"` | What these numbers ARE (RV4206): a fold over the counts the caller DECLARED, never a measurement of a run. The literal exists so a capacity report that embeds the estimate carries its provenance on its face, the `CostReport.basis` precedent: the sixth comparison run's answer presented a declared estimate over a misdeclared plan as the runtime's own economics. | [packages/core/src/orchestrator/admission.ts:520](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L520) |
| <a id="property-mechanicalrepairdeltawires"></a> `mechanicalRepairDeltaWires` | `number` | Each granted mechanical repair turn is one more wire on its invocation. | [packages/core/src/orchestrator/admission.ts:531](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L531) |
| <a id="property-repairrounddeltawires"></a> `repairRoundDeltaWires` | `number` | The armed semantic repair round's delta: ONE more composition PLUS ONE more judge pass (RV3307), never one. The fifth comparison run's own answer modeled 34 to 35 and lost the decisive correctness point to exactly this constant. | [packages/core/src/orchestrator/admission.ts:529](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L529) |
| <a id="property-roundoverheadshare"></a> `roundOverheadShare` | `number` | repairRoundDeltaWires / baseWires: the round's overhead share. | [packages/core/src/orchestrator/admission.ts:535](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L535) |
| <a id="property-wireswithround"></a> `wiresWithRound` | `number` | baseWires + repairRoundDeltaWires. | [packages/core/src/orchestrator/admission.ts:533](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L533) |
