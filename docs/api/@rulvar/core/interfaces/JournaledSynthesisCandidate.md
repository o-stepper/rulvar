[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournaledSynthesisCandidate

# Interface: JournaledSynthesisCandidate

Defined in: [packages/core/src/stores/synthesis-candidates.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L35)

One finish candidate, folded from its journaled verdict (RV2902).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-callid"></a> `callId?` | `string` | The finish call id the verdict was keyed by. | [packages/core/src/stores/synthesis-candidates.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L43) |
| <a id="property-candidatechars"></a> `candidateChars?` | `number` | - | [packages/core/src/stores/synthesis-candidates.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L51) |
| <a id="property-candidatehash"></a> `candidateHash?` | `string` | The non-accepted candidate's identity (RV2507), when journaled. | [packages/core/src/stores/synthesis-candidates.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L50) |
| <a id="property-candidateref"></a> `candidateRef?` | `string` | The rejected candidate's transcript blob, under retention. | [packages/core/src/stores/synthesis-candidates.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L53) |
| <a id="property-contracthash"></a> `contractHash?` | `string` | The contract generation the verdict was rendered under. | [packages/core/src/stores/synthesis-candidates.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L48) |
| <a id="property-costusd"></a> `costUsd?` | `number` | The window priced per call at the caller's table. Present only when a price function was given and it priced EVERY window wire; an unpriced model drops the field rather than shrinking it. | [packages/core/src/stores/synthesis-candidates.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L90) |
| <a id="property-failed"></a> `failed` | readonly [`SynthesisCandidateFailure`](/api/@rulvar/core/interfaces/SynthesisCandidateFailure.md)[] | The failed validators with their reasons, verbatim. | [packages/core/src/stores/synthesis-candidates.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L55) |
| <a id="property-maxrepairs"></a> `maxRepairs?` | `number` | - | [packages/core/src/stores/synthesis-candidates.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L46) |
| <a id="property-repairsused"></a> `repairsUsed?` | `number` | Repairs spent BEFORE this candidate, from the verdict itself. | [packages/core/src/stores/synthesis-candidates.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L45) |
| <a id="property-spanlabel"></a> `spanLabel?` | `string` | The hosting span's dispatch label (RV2901), when journaled. | [packages/core/src/stores/synthesis-candidates.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L57) |
| <a id="property-spanseq"></a> `spanSeq?` | `number` | The hosting span's running entry seq (RV3802): the span's identity within the run, so two candidates can be read as neighbors of ONE composition invocation (the repair-turn pairing below) instead of accidental neighbors across spans. Absent exactly when unhosted. | [packages/core/src/stores/synthesis-candidates.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L64) |
| <a id="property-usage"></a> `usage?` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | Summed recorded usage of the window's wires; same condition. | [packages/core/src/stores/synthesis-candidates.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L78) |
| <a id="property-usageunknownwires"></a> `usageUnknownWires?` | `number` | Window wires that recorded NO usage on a non-ok outcome: the provider may have billed them anyway, so `costUsd` is a floor whenever this is nonzero. | [packages/core/src/stores/synthesis-candidates.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L84) |
| <a id="property-verdict"></a> `verdict` | `"rejected"` \| `"repair"` \| `"accepted"` | The journaled verdict: 'accepted', 'repair', or 'rejected'. | [packages/core/src/stores/synthesis-candidates.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L37) |
| <a id="property-verdictat"></a> `verdictAt?` | `string` | The verdict decision's stamp, when the entry carried one. | [packages/core/src/stores/synthesis-candidates.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L41) |
| <a id="property-verdictseq"></a> `verdictSeq` | `number` | The verdict decision's seq: the candidate's address in the run. | [packages/core/src/stores/synthesis-candidates.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L39) |
| <a id="property-windowms"></a> `windowMs?` | `number` | Wall from the previous boundary (the span's start, or the prior verdict) to this verdict's stamp. Absent when the candidate is not hosted by a settled synthesize span or a stamp is missing. | [packages/core/src/stores/synthesis-candidates.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L70) |
| <a id="property-wires"></a> `wires?` | `number` | Provider wire requests inside this candidate's window (absorbed continuations counted). Present only when the incremental rows cover the hosting span's terminal call records exactly. | [packages/core/src/stores/synthesis-candidates.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/synthesis-candidates.ts#L76) |
