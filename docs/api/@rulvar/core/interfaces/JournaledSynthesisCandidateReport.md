[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournaledSynthesisCandidateReport

# Interface: JournaledSynthesisCandidateReport

Defined in: [packages/core/src/stores/synthesis-candidates.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L87)

What `synthesisCandidatesFromJournal` folded, beside the candidates.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-candidates"></a> `candidates` | readonly [`JournaledSynthesisCandidate`](/api/@rulvar/core/interfaces/JournaledSynthesisCandidate.md)[] | Every hosted candidate, in verdict seq order. | [packages/core/src/stores/synthesis-candidates.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L89) |
| <a id="property-synthesisspans"></a> `synthesisSpans` | `number` | Settled synthesize spans the journal holds. | [packages/core/src/stores/synthesis-candidates.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L91) |
| <a id="property-tailwires"></a> `tailWires` | `number` | Wires after a span's LAST verdict: attributed to no candidate. | [packages/core/src/stores/synthesis-candidates.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L106) |
| <a id="property-unattributedspans"></a> `unattributedSpans` | `number` | Settled synthesize spans whose incremental billing rows do not cover their terminal call records (the rows append asynchronously and may be missing); their candidates carry verdict facts only. | [packages/core/src/stores/synthesis-candidates.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L104) |
| <a id="property-unhostedverdicts"></a> `unhostedVerdicts` | `number` | Finish verdicts NOT hosted by a settled synthesize span: draft stage validations in the coordination span, and verdicts inside a synthesis that never settled. Counted, never guessed into candidates. | [packages/core/src/stores/synthesis-candidates.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L98) |
