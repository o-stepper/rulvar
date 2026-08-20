[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / WireCapacitySpec

# Interface: WireCapacitySpec

Defined in: `packages/core/dist/index.d.ts`

The declared wire counts of one orchestration plan (RV4005). Since
RV4206 the intake is CLOSED: an unknown key is a typed ConfigError
instead of a silent zero. The sixth comparison experiment's harness
passed `repairRound` and `transportRetries` (plausible names this
spec never had) and `childWires: 4` for four children of ten turns
each; every unknown key was ignored and the estimate answered
confidently for a plan nobody had declared.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-children"></a> `children?` | `number` | The structural fan-out declaration (RV4206): `children` workers of `turnsPerChild` provider dispatches each. Declare BOTH or neither; the pair exists because `childWires` invites passing the child count where the wire total belongs, the exact call the sixth comparison harness made. | `packages/core/dist/index.d.ts` |
| <a id="property-childwires"></a> `childWires?` | `number` | Fan-out provider dispatches: children TIMES their turns, the total, not the child count. Optional since RV4206 when the structural pair below is given; declaring both is legal only when they agree (`childWires === children * turnsPerChild`), refused typed otherwise. | `packages/core/dist/index.d.ts` |
| <a id="property-citationjudgewires"></a> `citationJudgeWires?` | `number` | Citation entailment audit judge dispatches (RV4206): one per pass, so 1 unarmed and the UNARMED reading here too when you read `repairRoundDeltaWires` as the whole round. The audit's wires were previously unnameable in this spec while the acceptance tail priced their money: the sixth comparison run's capacity model simply lost them. | `packages/core/dist/index.d.ts` |
| <a id="property-coordinationwires"></a> `coordinationWires?` | `number` | Coordination loop dispatches, the finish exchanges included. | `packages/core/dist/index.d.ts` |
| <a id="property-extractwires"></a> `extractWires?` | `number` | Separate extract dispatches, when the finish rides one (RV3908 spares the schema'd final). | `packages/core/dist/index.d.ts` |
| <a id="property-judgewires"></a> `judgeWires?` | `number` | Worst-case claim judge dispatches; feed [acceptanceJudgePasses](/api/@rulvar/rulvar/functions/acceptanceJudgePasses.md) the declared posture to get it. NOTE: that count already includes the armed round's rejudge, while the estimate below prices the round's delta separately, so pass the UNARMED reading here ((stage === 'both') ? 2 : 1) when you intend to read `repairRoundDeltaWires` as the whole round. | `packages/core/dist/index.d.ts` |
| <a id="property-synthesiswires"></a> `synthesisWires?` | `number` | Composition invocations of the base plan (the initial synthesis). | `packages/core/dist/index.d.ts` |
| <a id="property-turnsperchild"></a> `turnsPerChild?` | `number` | See `children`; the two resolve to `children * turnsPerChild` fan-out wires. | `packages/core/dist/index.d.ts` |
