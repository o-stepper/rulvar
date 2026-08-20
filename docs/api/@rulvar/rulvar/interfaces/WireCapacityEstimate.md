[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / WireCapacityEstimate

# Interface: WireCapacityEstimate

Defined in: `packages/core/dist/index.d.ts`

What one orchestration plan costs in wires, base and worst case (RV4005).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-basewires"></a> `baseWires` | `number` | The plan's wire total with no repair of any kind. | `packages/core/dist/index.d.ts` |
| <a id="property-basis"></a> `basis` | `"declared-estimate"` | What these numbers ARE (RV4206): a fold over the counts the caller DECLARED, never a measurement of a run. The literal exists so a capacity report that embeds the estimate carries its provenance on its face, the `CostReport.basis` precedent: the sixth comparison run's answer presented a declared estimate over a misdeclared plan as the runtime's own economics. | `packages/core/dist/index.d.ts` |
| <a id="property-mechanicalrepairdeltawires"></a> `mechanicalRepairDeltaWires` | `number` | Each granted mechanical repair turn is one more wire on its invocation. | `packages/core/dist/index.d.ts` |
| <a id="property-repairrounddeltawires"></a> `repairRoundDeltaWires` | `number` | The armed semantic repair round's delta: ONE more composition PLUS ONE more judge pass (RV3307), never one. The fifth comparison run's own answer modeled 34 to 35 and lost the decisive correctness point to exactly this constant. | `packages/core/dist/index.d.ts` |
| <a id="property-roundoverheadshare"></a> `roundOverheadShare` | `number` | repairRoundDeltaWires / baseWires: the round's overhead share. | `packages/core/dist/index.d.ts` |
| <a id="property-wireswithround"></a> `wiresWithRound` | `number` | baseWires + repairRoundDeltaWires. | `packages/core/dist/index.d.ts` |
