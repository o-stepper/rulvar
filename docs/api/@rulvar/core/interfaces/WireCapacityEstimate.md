[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WireCapacityEstimate

# Interface: WireCapacityEstimate

Defined in: [packages/core/src/orchestrator/admission.ts:470](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L470)

What one orchestration plan costs in wires, base and worst case (RV4005).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-basewires"></a> `baseWires` | `number` | The plan's wire total with no repair of any kind. | [packages/core/src/orchestrator/admission.ts:472](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L472) |
| <a id="property-mechanicalrepairdeltawires"></a> `mechanicalRepairDeltaWires` | `number` | Each granted mechanical repair turn is one more wire on its invocation. | [packages/core/src/orchestrator/admission.ts:481](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L481) |
| <a id="property-repairrounddeltawires"></a> `repairRoundDeltaWires` | `number` | The armed semantic repair round's delta: ONE more composition PLUS ONE more judge pass (RV3307), never one. The fifth comparison run's own answer modeled 34 to 35 and lost the decisive correctness point to exactly this constant. | [packages/core/src/orchestrator/admission.ts:479](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L479) |
| <a id="property-roundoverheadshare"></a> `roundOverheadShare` | `number` | repairRoundDeltaWires / baseWires: the round's overhead share. | [packages/core/src/orchestrator/admission.ts:485](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L485) |
| <a id="property-wireswithround"></a> `wiresWithRound` | `number` | baseWires + repairRoundDeltaWires. | [packages/core/src/orchestrator/admission.ts:483](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L483) |
