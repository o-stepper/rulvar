[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournaledSynthesisCandidate

# Interface: JournaledSynthesisCandidate

Defined in: `packages/core/dist/index.d.ts`

One finish candidate, folded from its journaled verdict (RV2902).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-bytesunavailablereason"></a> `bytesUnavailableReason?` | `string` | Why the candidate's BYTES are not retained (RV4207), from the decision itself: 'hash-only-persistence' names the declared policy, 'store-write-failed' a retention that was declared and refused by the store. Absent on journals written before the field, and everywhere no reason applies; a blob later deleted by retention leaves the hash and this field as the honest remainder. | `packages/core/dist/index.d.ts` |
| <a id="property-callid"></a> `callId?` | `string` | The finish call id the verdict was keyed by. | `packages/core/dist/index.d.ts` |
| <a id="property-candidatechars"></a> `candidateChars?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-candidatehash"></a> `candidateHash?` | `string` | The candidate's identity (RV2507): the [candidateHashOf](/api/@rulvar/rulvar/functions/candidateHashOf.md) hash and the char count. Journaled on every non-accepted verdict since RV2507, and on the ACCEPTED verdict too under a declared `candidatePersistence` (RV4207), where it names the resolved document (deterministic patch or sectional splice applied), so the whole chain reads by hash. | `packages/core/dist/index.d.ts` |
| <a id="property-candidateref"></a> `candidateRef?` | `string` | The rejected candidate's transcript blob, under retention. | `packages/core/dist/index.d.ts` |
| <a id="property-contracthash"></a> `contractHash?` | `string` | The contract generation the verdict was rendered under. | `packages/core/dist/index.d.ts` |
| <a id="property-costusd"></a> `costUsd?` | `number` | The window priced per call at the caller's table. Present only when a price function was given and it priced EVERY window wire; an unpriced model drops the field rather than shrinking it. | `packages/core/dist/index.d.ts` |
| <a id="property-failed"></a> `failed` | readonly [`SynthesisCandidateFailure`](/api/@rulvar/rulvar/interfaces/SynthesisCandidateFailure.md)[] | The failed validators with their reasons, verbatim. | `packages/core/dist/index.d.ts` |
| <a id="property-maxrepairs"></a> `maxRepairs?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-repairsused"></a> `repairsUsed?` | `number` | Repairs spent BEFORE this candidate, from the verdict itself. | `packages/core/dist/index.d.ts` |
| <a id="property-spanlabel"></a> `spanLabel?` | `string` | The hosting span's dispatch label (RV2901), when journaled. | `packages/core/dist/index.d.ts` |
| <a id="property-spanseq"></a> `spanSeq?` | `number` | The hosting span's running entry seq (RV3802): the span's identity within the run, so two candidates can be read as neighbors of ONE composition invocation (the repair-turn pairing below) instead of accidental neighbors across spans. Absent exactly when unhosted. | `packages/core/dist/index.d.ts` |
| <a id="property-usage"></a> `usage?` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | Summed recorded usage of the window's wires; same condition. | `packages/core/dist/index.d.ts` |
| <a id="property-usageunknownwires"></a> `usageUnknownWires?` | `number` | Window wires that recorded NO usage on a non-ok outcome: the provider may have billed them anyway, so `costUsd` is a floor whenever this is nonzero. | `packages/core/dist/index.d.ts` |
| <a id="property-verdict"></a> `verdict` | `"repair"` \| `"accepted"` \| `"rejected"` | The journaled verdict: 'accepted', 'repair', or 'rejected'. | `packages/core/dist/index.d.ts` |
| <a id="property-verdictat"></a> `verdictAt?` | `string` | The verdict decision's stamp, when the entry carried one. | `packages/core/dist/index.d.ts` |
| <a id="property-verdictseq"></a> `verdictSeq` | `number` | The verdict decision's seq: the candidate's address in the run. | `packages/core/dist/index.d.ts` |
| <a id="property-windowms"></a> `windowMs?` | `number` | Wall from the previous boundary (the span's start, or the prior verdict) to this verdict's stamp. Absent when the candidate is not hosted by a settled synthesize span or a stamp is missing. | `packages/core/dist/index.d.ts` |
| <a id="property-wires"></a> `wires?` | `number` | Provider wire requests inside this candidate's window (absorbed continuations counted). Present only when the incremental rows cover the hosting span's terminal call records exactly. | `packages/core/dist/index.d.ts` |
