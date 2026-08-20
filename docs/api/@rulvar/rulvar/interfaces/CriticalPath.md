[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CriticalPath

# Interface: CriticalPath

Defined in: `packages/core/dist/index.d.ts`

The critical-path summary of one run (RV-211): the plan's post-fan-in
gate ("synthesis takes at most 40% of wall time with four settled
workers") computed as a pure fold over the same vocabulary, no
heuristics beyond the role tags. Post-fan-in is the interval from the
LAST settled non-coordination agent (any span whose primary role is
neither 'orchestrate' nor 'synthesize') to run:end; the synthesis wall
is the summed span wall of 'synthesize' spans. Wall numbers are LIVE
fidelity: a replayed stream re-stamps emission times, so its intervals
are degenerate, exactly like phase durations. Absent pieces (no
run:end, no worker spans) leave the corresponding fields undefined
rather than guessed at.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citationjudgems"></a> `citationJudgeMs` | `number` | Completed 'synthesize' spans that are the citation entailment audit judge (labels [CITATION\_JUDGE\_LABEL](/api/@rulvar/rulvar/variables/CITATION_JUDGE_LABEL.md) and its suffixed variants), summed (RV4206). Until this bucket existed the audit judge folded into `finalCompositionMs` on BOTH surfaces: the sixth comparison run's 368889 ms "composition" was 214870 ms of composition plus 154019 ms of this judge, `compositionSpans` then counted the judge as a second composition (the legible signature of a repair round on a run that had none), and `lastCandidateMs` stretched to the judge's end while the candidate had settled 154 seconds earlier. | `packages/core/dist/index.d.ts` |
| <a id="property-citationjudgespans"></a> `citationJudgeSpans` | `number` | Completed citation-judge synthesize spans, counted (RV4206). | `packages/core/dist/index.d.ts` |
| <a id="property-compositionspans"></a> `compositionSpans` | `number` | Completed composition-side synthesize spans, counted (RV3404): two compositions on one run is the legible signature of the bounded repair round (RV3307), and a count survives where milliseconds invite guessing. | `packages/core/dist/index.d.ts` |
| <a id="property-draftjudgems"></a> `draftJudgeMs` | `number` | The stage split of `semanticJudgeMs` (RV3404): the draft pass dispatches under the exact [CLAIM\_JUDGE\_LABEL](/api/@rulvar/rulvar/variables/CLAIM_JUDGE_LABEL.md) and every suffixed variant is a post draft pass (today the final pass and the repair round's re-judge, both `-final`, RV2509/RV3307). Always the exact partition: `draftJudgeMs + finalJudgeMs` equals `semanticJudgeMs`. | `packages/core/dist/index.d.ts` |
| <a id="property-finalcompositionms"></a> `finalCompositionMs` | `number` | Completed 'synthesize' spans that ARE final composition, summed (RV1604; classified through [synthesizeSpanClassOf](/api/@rulvar/rulvar/functions/synthesizeSpanClassOf.md) since RV4206): the engine's own composition labels plus every unlabelled span (composition was the only unlabelled engine dispatch before RV2901 named it). A span whose label this classifier does not know lands in `unclassifiedSynthesisMs` instead of here: the sixth comparison run read 368889 ms of "final composition" of which 154019 ms was the citation judge. | `packages/core/dist/index.d.ts` |
| <a id="property-finaljudgems"></a> `finalJudgeMs` | `number` | The post draft half of the split; see `draftJudgeMs`. | `packages/core/dist/index.d.ts` |
| <a id="property-firstcandidatems"></a> `firstCandidateMs?` | `number` | run:start to the FIRST completed composition-side synthesize span's end (RV3605): when a candidate deliverable first existed. The third comparison run held a mechanically accepted candidate from its 103rd journal seq onward and lost typed 25 minutes later; nothing on any surface said when the latent document materialized, and the judge had to dig spans by hand. Absent without a run:start or a completed composition span, and live fidelity like every wall figure here. | `packages/core/dist/index.d.ts` |
| <a id="property-hostrejectedspans"></a> `hostRejectedSpans` | `number` | Settled spans whose invocation was aborted by the host's finish rejection (RV3702): the `hostRejected` stamps counted. The count is unconditional (the stamp is self contained, no labelling condition applies) and zero when none: on the third comparison run's shape it reads 1, the round's composition, telling the host rejection apart from a provider death at the cut level. | `packages/core/dist/index.d.ts` |
| <a id="property-judgespans"></a> `judgeSpans` | `number` | Completed judge-side synthesize spans, counted (RV3404). | `packages/core/dist/index.d.ts` |
| <a id="property-lastcandidatems"></a> `lastCandidateMs?` | `number` | run:start to the LAST completed composition-side span's end (RV3605). On a run whose terminal carries `deliverableAccepted: true` this is when the accepted composition settled, the time to accepted deliverable; on a failed run it is when the last LOSING candidate settled, so pair it with the acceptance verdict and never read it as a win on an error terminal (the comparison rule the third experiment wrote down). | `packages/core/dist/index.d.ts` |
| <a id="property-postfanin"></a> `postFanIn?` | [`PostFanInBreakdown`](/api/@rulvar/rulvar/interfaces/PostFanInBreakdown.md) | The RV710 decomposition of the window; present with postFanInMs. | `packages/core/dist/index.d.ts` |
| <a id="property-postfaninms"></a> `postFanInMs?` | `number` | Last non-coordination agent:end to run:end; absent without both. | `packages/core/dist/index.d.ts` |
| <a id="property-postfaninshare"></a> `postFanInShare?` | `number` | postFanInMs / runWallMs when both are defined and the wall is > 0. | `packages/core/dist/index.d.ts` |
| <a id="property-runwallms"></a> `runWallMs?` | `number` | run:start to run:end; absent while the run is open. | `packages/core/dist/index.d.ts` |
| <a id="property-semanticjudgems"></a> `semanticJudgeMs` | `number` | Completed 'synthesize' spans that are the claim-consistency judge (agent:start label [CLAIM\_JUDGE\_LABEL](/api/@rulvar/rulvar/variables/CLAIM_JUDGE_LABEL.md)), its extract phase included, summed (RV1604). | `packages/core/dist/index.d.ts` |
| <a id="property-synthesisms"></a> `synthesisMs` | `number` | Summed wall of completed 'synthesize' spans (0 when none). Since RV4206 this is exactly `finalCompositionMs + semanticJudgeMs + citationJudgeMs + unclassifiedSynthesisMs`, kept whole for existing consumers: the name predates the judges riding the same role, and the eighteenth comparison benchmark read a 54-second `synthesisMs` as a second final composition when the run had SKIPPED synthesis and the bucket was entirely the judge and its extract. Read the split fields. | `packages/core/dist/index.d.ts` |
| <a id="property-synthesisshare"></a> `synthesisShare?` | `number` | synthesisMs / runWallMs under the same conditions. | `packages/core/dist/index.d.ts` |
| <a id="property-unclassifiedsynthesisms"></a> `unclassifiedSynthesisMs` | `number` | Completed 'synthesize' spans whose label names NEITHER a judge nor a composition (RV4206): a vocabulary member this classifier does not know. Nonzero means the split beside it is a floor, and saying so is the whole point: an unknown synthesize label used to fold silently into `finalCompositionMs`, which is exactly how the citation judge hid there for four releases. | `packages/core/dist/index.d.ts` |
| <a id="property-unclassifiedsynthesisspans"></a> `unclassifiedSynthesisSpans` | `number` | Completed unclassified synthesize spans, counted; nonzero flags the split as a floor. | `packages/core/dist/index.d.ts` |
| <a id="property-workerspans"></a> `workerSpans` | `number` | Settled non-coordination agent spans that anchored the fan-in. | `packages/core/dist/index.d.ts` |
