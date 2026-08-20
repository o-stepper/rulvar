[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournaledCriticalPath

# Interface: JournaledCriticalPath

Defined in: `packages/core/dist/index.d.ts`

The critical path of a logical run, folded from its journal (RV2803).

The live reading is [reduceCriticalPath](/api/@rulvar/rulvar/functions/reduceCriticalPath.md); this is the same
question asked of what survived the process. Fields are absent where
the journal cannot answer, never zero.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citationjudgems"></a> `citationJudgeMs?` | `number` | Synthesis that is the citation entailment audit judge (RV4206); same all-or-nothing condition. Until this field the audit judge read as final composition in every archived journal, the same blindness the live reducer had. | `packages/core/dist/index.d.ts` |
| <a id="property-citationjudgespans"></a> `citationJudgeSpans?` | `number` | Settled citation-judge spans, counted; same condition. | `packages/core/dist/index.d.ts` |
| <a id="property-compositionspans"></a> `compositionSpans?` | `number` | Settled synthesize spans counted by side, same condition (RV3404): `compositionSpans: 2` in an archived journal is the legible signature of the bounded repair round (RV3307), readable years after the process that paid for it exited. | `packages/core/dist/index.d.ts` |
| <a id="property-draftjudgems"></a> `draftJudgeMs?` | `number` | The stage split of `semanticJudgeMs` (RV3404), same all-or-nothing condition: the draft pass is the exact judge label and every suffixed variant is a post draft pass over the composed document (the final pass and the repair round's re-judge both dispatch `-final`, RV2509/RV3307). One classifier decides on both surfaces: [claimJudgeStageOf](/api/@rulvar/rulvar/functions/claimJudgeStageOf.md). | `packages/core/dist/index.d.ts` |
| <a id="property-finalcompositionms"></a> `finalCompositionMs?` | `number` | Synthesis that is COMPOSITION (RV1604; classified through [synthesizeSpanClassOf](/api/@rulvar/rulvar/functions/synthesizeSpanClassOf.md) since RV4206, so a judge of either kind and an unknown label never land here). Present only when EVERY synthesize span in the journal carried a label: one unlabelled span would make the split a guess, and the split exists because a guess here read a 54 second judge as a second final composition. | `packages/core/dist/index.d.ts` |
| <a id="property-finaljudgems"></a> `finalJudgeMs?` | `number` | The post draft half of the split; same condition. | `packages/core/dist/index.d.ts` |
| <a id="property-firstcandidatems"></a> `firstCandidateMs?` | `number` | First stamp to the FIRST settled composition-side span's end (RV3605): when a candidate deliverable first existed, readable from the archive. The third comparison run held a mechanically accepted candidate 25 minutes before it lost typed, and the only route to that fact was a span dig. Needs everything the wall needs (one segment) plus everything the split needs (every synthesize span labelled, or the milestone would count a judge as a candidate); absent otherwise, never guessed. | `packages/core/dist/index.d.ts` |
| <a id="property-hostrejectedspans"></a> `hostRejectedSpans` | `number` | Settled agent spans whose invocation was aborted by the host's finish rejection (RV3702): the journaled `hostRejected` stamps counted. Unconditional (the stamp is self contained: no label, no segment condition) and zero when none, exactly the live reading of the same run: the layer split (wires fine, document refused by host) stays readable years after the process exited. | `packages/core/dist/index.d.ts` |
| <a id="property-judgespans"></a> `judgeSpans?` | `number` | Settled judge-side synthesize spans, counted; same condition. | `packages/core/dist/index.d.ts` |
| <a id="property-lastcandidatems"></a> `lastCandidateMs?` | `number` | First stamp to the LAST settled composition-side span's end; same conditions. Time to the accepted deliverable exactly when the terminal says `deliverableAccepted: true`; on a failed run it is when the last LOSING candidate settled, so pair it with the acceptance verdict and never read it as a win on an error terminal. | `packages/core/dist/index.d.ts` |
| <a id="property-postfanin"></a> `postFanIn?` | [`JournaledPostFanIn`](/api/@rulvar/rulvar/interfaces/JournaledPostFanIn.md) | The window itemization a journal CAN answer (RV3404); present exactly when `postFanInMs` is. | `packages/core/dist/index.d.ts` |
| <a id="property-postfaninms"></a> `postFanInMs?` | `number` | Last worker settle to the end of the run; same condition. | `packages/core/dist/index.d.ts` |
| <a id="property-postfaninshare"></a> `postFanInShare?` | `number` | `postFanInMs / runWallMs`, the RV2210 target's own quantity. | `packages/core/dist/index.d.ts` |
| <a id="property-runwallms"></a> `runWallMs?` | `number` | First stamp to last, absent unless the journal holds ONE segment. | `packages/core/dist/index.d.ts` |
| <a id="property-segments"></a> `segments` | `number` | How many segments the journal holds; the wall figures need one. | `packages/core/dist/index.d.ts` |
| <a id="property-semanticjudgems"></a> `semanticJudgeMs?` | `number` | Synthesis that IS the claim judge; same all-or-nothing condition. | `packages/core/dist/index.d.ts` |
| <a id="property-synthesisms"></a> `synthesisMs` | `number` | Summed wall of settled `'synthesize'` spans. | `packages/core/dist/index.d.ts` |
| <a id="property-synthesisshare"></a> `synthesisShare?` | `number` | `synthesisMs / runWallMs`, under the same conditions. | `packages/core/dist/index.d.ts` |
| <a id="property-unclassifiedspans"></a> `unclassifiedSpans` | `number` | Settled agent spans whose entry records no role, so this fold could not classify them (a journal older than the attribution facts). Nonzero means the counts above are a floor, and saying so is the whole point of the field. | `packages/core/dist/index.d.ts` |
| <a id="property-unclassifiedsynthesisms"></a> `unclassifiedSynthesisMs?` | `number` | Synthesis whose label this fold's classifier does not know (RV4206); same condition. Nonzero means the split beside it is a floor, never silently "composition". | `packages/core/dist/index.d.ts` |
| <a id="property-unclassifiedsynthesisspans"></a> `unclassifiedSynthesisSpans?` | `number` | Settled unclassified synthesize spans, counted; same condition. | `packages/core/dist/index.d.ts` |
| <a id="property-workerspans"></a> `workerSpans` | `number` | Settled agent spans that were neither coordination nor synthesis: the fan-out this run actually paid for. | `packages/core/dist/index.d.ts` |
