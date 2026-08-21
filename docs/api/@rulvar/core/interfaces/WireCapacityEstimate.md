[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WireCapacityEstimate

# Interface: WireCapacityEstimate

Defined in: [packages/core/src/orchestrator/admission.ts:569](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L569)

What one orchestration plan costs in wires, base and worst case (RV4005).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-basewires"></a> `baseWires` | `number` | The plan's wire total with no repair of any kind. | [packages/core/src/orchestrator/admission.ts:580](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L580) |
| <a id="property-basis"></a> `basis` | `"declared-estimate"` | What these numbers ARE (RV4206): a fold over the counts the caller DECLARED, never a measurement of a run. The literal exists so a capacity report that embeds the estimate carries its provenance on its face, the `CostReport.basis` precedent: the sixth comparison run's answer presented a declared estimate over a misdeclared plan as the runtime's own economics. | [packages/core/src/orchestrator/admission.ts:578](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L578) |
| <a id="property-mechanicalrepairdeltawires"></a> `mechanicalRepairDeltaWires` | `number` | Each granted mechanical repair turn is one more wire on its invocation. | [packages/core/src/orchestrator/admission.ts:594](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L594) |
| <a id="property-repairrounddeltawires"></a> `repairRoundDeltaWires` | `number` | The armed semantic repair round's delta. With no posture declared: the legacy constant 2, ONE more composition PLUS ONE more judge pass (RV3307; the fifth comparison run modeled 34 to 35 and lost the decisive correctness point to exactly this). With the posture declared (RV4304): derived by the same [semanticRoundArming](/api/@rulvar/core/functions/semanticRoundArming.md) the acceptance tail prices, so 0 with nothing armed, 2 for a lone round, and 3 for the merged round or a citation round that rejudges a configured claim pass, which the sixth comparison run's constant could not express. | [packages/core/src/orchestrator/admission.ts:592](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L592) |
| <a id="property-roundoverheadshare"></a> `roundOverheadShare` | `number` | repairRoundDeltaWires / baseWires: the round's overhead share. | [packages/core/src/orchestrator/admission.ts:598](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L598) |
| <a id="property-wireswithround"></a> `wiresWithRound` | `number` | baseWires + repairRoundDeltaWires. | [packages/core/src/orchestrator/admission.ts:596](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L596) |
