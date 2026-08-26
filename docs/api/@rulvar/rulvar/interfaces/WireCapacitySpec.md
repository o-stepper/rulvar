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

## Extends

- [`SemanticRoundPosture`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-children"></a> `children?` | `number` | The structural fan-out declaration (RV4206): `children` workers of `turnsPerChild` provider dispatches each. Declare BOTH or neither; the pair exists because `childWires` invites passing the child count where the wire total belongs, the exact call the sixth comparison harness made. | - | `packages/core/dist/index.d.ts` |
| <a id="property-childwires"></a> `childWires?` | `number` | Fan-out provider dispatches: children TIMES their turns, the total, not the child count. Optional since RV4206 when the structural pair below is given; declaring both is legal only when they agree (`childWires === children * turnsPerChild`), refused typed otherwise. The semantic posture fields inherited from [SemanticRoundPosture](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md) (RV4304) switch the estimate from the legacy constant round to the declared arithmetic: with ANY of them declared, the judge wire counts are COMPUTED from the posture (a manually declared `judgeWires`/`citationJudgeWires` must agree or refuses typed, the childWires-contradiction symmetry), and `repairRoundDeltaWires` is derived by the same [semanticRoundArming](/api/@rulvar/rulvar/functions/semanticRoundArming.md) the acceptance tail prices, so money and wires cannot disagree: 0 with nothing armed, 2 for a lone claim or citation round, 3 for the merged round or a citation round that rejudges a configured claim pass. With none of them declared the historical bytes hold exactly: the delta is the documented legacy constant 2 (assume one single-judge round). | - | `packages/core/dist/index.d.ts` |
| <a id="property-citationjudgewires"></a> `citationJudgeWires?` | `number` | Citation entailment audit judge dispatches (RV4206): one per pass, so 1 unarmed and the UNARMED reading here too when you read `repairRoundDeltaWires` as the whole round. The audit's wires were previously unnameable in this spec while the acceptance tail priced their money: the sixth comparison run's capacity model simply lost them. | - | `packages/core/dist/index.d.ts` |
| <a id="property-citationonfound"></a> `citationOnFound?` | `"report"` \| `"fail"` \| `"repair"` | Mirrors OrchestrateCitationAudit.onFound; 'repair' arms the audit's round. | [`SemanticRoundPosture`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md).[`citationOnFound`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md#property-citationonfound) | `packages/core/dist/index.d.ts` |
| <a id="property-claimconfigured"></a> `claimConfigured?` | `boolean` | True when a claim-consistency pass is declared. | [`SemanticRoundPosture`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md).[`claimConfigured`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md#property-claimconfigured) | `packages/core/dist/index.d.ts` |
| <a id="property-claimonfound"></a> `claimOnFound?` | `"report"` \| `"carry"` \| `"fail"` \| `"repair"` | Mirrors OrchestrateClaimConsistency.onFound; absent reads 'report'. | [`SemanticRoundPosture`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md).[`claimOnFound`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md#property-claimonfound) | `packages/core/dist/index.d.ts` |
| <a id="property-claimstage"></a> `claimStage?` | `"draft"` \| `"final"` \| `"both"` | Mirrors OrchestrateClaimConsistency.stage; absent reads 'draft'. | [`SemanticRoundPosture`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md).[`claimStage`](/api/@rulvar/rulvar/interfaces/SemanticRoundPosture.md#property-claimstage) | `packages/core/dist/index.d.ts` |
| <a id="property-coordinationwires"></a> `coordinationWires?` | `number` | Coordination loop dispatches, the finish exchanges included. | - | `packages/core/dist/index.d.ts` |
| <a id="property-extractwires"></a> `extractWires?` | `number` | Separate extract dispatches, when the finish rides one (RV3908 spares the schema'd final). | - | `packages/core/dist/index.d.ts` |
| <a id="property-judgewires"></a> `judgeWires?` | `number` | Worst-case claim judge dispatches; feed [acceptanceJudgePasses](/api/@rulvar/rulvar/functions/acceptanceJudgePasses.md) the declared posture to get it. NOTE: that count already includes the armed round's rejudge, while the estimate below prices the round's delta separately, so pass the UNARMED reading here ((stage === 'both') ? 2 : 1) when you intend to read `repairRoundDeltaWires` as the whole round. | - | `packages/core/dist/index.d.ts` |
| <a id="property-synthesiswires"></a> `synthesisWires?` | `number` | Composition invocations of the base plan (the initial synthesis). | - | `packages/core/dist/index.d.ts` |
| <a id="property-turnsperchild"></a> `turnsPerChild?` | `number` | See `children`; the two resolve to `children * turnsPerChild` fan-out wires. | - | `packages/core/dist/index.d.ts` |
