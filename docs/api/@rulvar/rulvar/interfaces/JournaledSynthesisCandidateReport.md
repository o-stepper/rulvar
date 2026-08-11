[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournaledSynthesisCandidateReport

# Interface: JournaledSynthesisCandidateReport

Defined in: `packages/core/dist/index.d.ts`

What `synthesisCandidatesFromJournal` folded, beside the candidates.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-candidates"></a> `candidates` | readonly [`JournaledSynthesisCandidate`](/api/@rulvar/rulvar/interfaces/JournaledSynthesisCandidate.md)[] | Every hosted candidate, in verdict seq order. | `packages/core/dist/index.d.ts` |
| <a id="property-synthesisspans"></a> `synthesisSpans` | `number` | Settled synthesize spans the journal holds. | `packages/core/dist/index.d.ts` |
| <a id="property-tailwires"></a> `tailWires` | `number` | Wires after a span's LAST verdict: attributed to no candidate. | `packages/core/dist/index.d.ts` |
| <a id="property-unattributedspans"></a> `unattributedSpans` | `number` | Settled synthesize spans whose incremental billing rows do not cover their terminal call records (the rows append asynchronously and may be missing); their candidates carry verdict facts only. | `packages/core/dist/index.d.ts` |
| <a id="property-unhostedverdicts"></a> `unhostedVerdicts` | `number` | Finish verdicts NOT hosted by a settled synthesize span: draft stage validations in the coordination span, and verdicts inside a synthesis that never settled. Counted, never guessed into candidates. | `packages/core/dist/index.d.ts` |
