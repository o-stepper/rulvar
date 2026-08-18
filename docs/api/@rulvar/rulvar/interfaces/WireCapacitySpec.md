[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / WireCapacitySpec

# Interface: WireCapacitySpec

Defined in: `packages/core/dist/index.d.ts`

The declared wire counts of one orchestration plan (RV4005).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-childwires"></a> `childWires` | `number` | Fan-out provider dispatches: children times their turns. | `packages/core/dist/index.d.ts` |
| <a id="property-coordinationwires"></a> `coordinationWires?` | `number` | Coordination loop dispatches, the finish exchanges included. | `packages/core/dist/index.d.ts` |
| <a id="property-extractwires"></a> `extractWires?` | `number` | Separate extract dispatches, when the finish rides one (RV3908 spares the schema'd final). | `packages/core/dist/index.d.ts` |
| <a id="property-judgewires"></a> `judgeWires?` | `number` | Worst-case claim judge dispatches; feed [acceptanceJudgePasses](/api/@rulvar/rulvar/functions/acceptanceJudgePasses.md) the declared posture to get it. NOTE: that count already includes the armed round's rejudge, while the estimate below prices the round's delta separately, so pass the UNARMED reading here ((stage === 'both') ? 2 : 1) when you intend to read `repairRoundDeltaWires` as the whole round. | `packages/core/dist/index.d.ts` |
| <a id="property-synthesiswires"></a> `synthesisWires?` | `number` | Composition invocations of the base plan (the initial synthesis). | `packages/core/dist/index.d.ts` |
