[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournaledPostFanIn

# Interface: JournaledPostFanIn

Defined in: [packages/core/src/stores/critical-path.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L167)

The synthesis half of the RV710 decomposition, asked of a journal
(RV3404). The live breakdown also itemizes the coordinator's model
and tool time inside the window; a journal cannot: a terminal agent
entry spans the WHOLE invocation, and the coordinator's per turn
stamps died with the process that emitted them. So this block claims
exactly what the stamps prove: how much of the window settled
synthesize spans cover, the split of that cover when every span is
labelled, and how much of the window NO settled synthesize span
accounts for. `unaccountedMs` is a superset of the live `residueMs`
by construction (the coordinator's own tail time lives in it here),
which is why it refuses to share the name.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citationjudgems"></a> `citationJudgeMs?` | `number` | The citation-judge share, clipped (RV4206); same condition. | [packages/core/src/stores/critical-path.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L179) |
| <a id="property-finalcompositionms"></a> `finalCompositionMs?` | `number` | The composition share of the covered spans, clipped; present under the same all-or-nothing labelling condition as the top level split, and equal to the live breakdown's reading of the same run. | [packages/core/src/stores/critical-path.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L175) |
| <a id="property-semanticjudgems"></a> `semanticJudgeMs?` | `number` | The claim-judge share, clipped; same condition. | [packages/core/src/stores/critical-path.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L177) |
| <a id="property-synthesiscoveredms"></a> `synthesisCoveredMs` | `number` | Union of settled synthesize spans clipped to the window. | [packages/core/src/stores/critical-path.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L169) |
| <a id="property-unaccountedms"></a> `unaccountedMs` | `number` | `postFanInMs` minus `synthesisCoveredMs`, floored at zero. | [packages/core/src/stores/critical-path.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L183) |
| <a id="property-unaccountedshare"></a> `unaccountedShare?` | `number` | `unaccountedMs / postFanInMs` when the window is positive. | [packages/core/src/stores/critical-path.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L185) |
| <a id="property-unclassifiedsynthesisms"></a> `unclassifiedSynthesisMs?` | `number` | The unclassified share, clipped (RV4206); same condition. | [packages/core/src/stores/critical-path.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/critical-path.ts#L181) |
