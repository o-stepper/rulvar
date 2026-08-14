[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CriticalPath

# Interface: CriticalPath

Defined in: [packages/core/src/l0/telemetry-reduce.ts:229](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L229)

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
| <a id="property-compositionspans"></a> `compositionSpans` | `number` | Completed composition-side synthesize spans, counted (RV3404): two compositions on one run is the legible signature of the bounded repair round (RV3307), and a count survives where milliseconds invite guessing. | [packages/core/src/l0/telemetry-reduce.ts:272](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L272) |
| <a id="property-draftjudgems"></a> `draftJudgeMs` | `number` | The stage split of `semanticJudgeMs` (RV3404): the draft pass dispatches under the exact [CLAIM\_JUDGE\_LABEL](/api/@rulvar/core/variables/CLAIM_JUDGE_LABEL.md) and every suffixed variant is a post draft pass (today the final pass and the repair round's re-judge, both `-final`, RV2509/RV3307). Always the exact partition: `draftJudgeMs + finalJudgeMs` equals `semanticJudgeMs`. | [packages/core/src/l0/telemetry-reduce.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L263) |
| <a id="property-finalcompositionms"></a> `finalCompositionMs` | `number` | Completed 'synthesize' spans that ARE final composition (every synthesize span not labeled as the claim judge), summed (RV1604). | [packages/core/src/l0/telemetry-reduce.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L248) |
| <a id="property-finaljudgems"></a> `finalJudgeMs` | `number` | The post draft half of the split; see `draftJudgeMs`. | [packages/core/src/l0/telemetry-reduce.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L265) |
| <a id="property-firstcandidatems"></a> `firstCandidateMs?` | `number` | run:start to the FIRST completed composition-side synthesize span's end (RV3605): when a candidate deliverable first existed. The third comparison run held a mechanically accepted candidate from its 103rd journal seq onward and lost typed 25 minutes later; nothing on any surface said when the latent document materialized, and the judge had to dig spans by hand. Absent without a run:start or a completed composition span, and live fidelity like every wall figure here. | [packages/core/src/l0/telemetry-reduce.ts:285](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L285) |
| <a id="property-judgespans"></a> `judgeSpans` | `number` | Completed judge-side synthesize spans, counted (RV3404). | [packages/core/src/l0/telemetry-reduce.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L274) |
| <a id="property-lastcandidatems"></a> `lastCandidateMs?` | `number` | run:start to the LAST completed composition-side span's end (RV3605). On a run whose terminal carries `deliverableAccepted: true` this is when the accepted composition settled, the time to accepted deliverable; on a failed run it is when the last LOSING candidate settled, so pair it with the acceptance verdict and never read it as a win on an error terminal (the comparison rule the third experiment wrote down). | [packages/core/src/l0/telemetry-reduce.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L295) |
| <a id="property-postfanin"></a> `postFanIn?` | [`PostFanInBreakdown`](/api/@rulvar/core/interfaces/PostFanInBreakdown.md) | The RV710 decomposition of the window; present with postFanInMs. | [packages/core/src/l0/telemetry-reduce.ts:303](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L303) |
| <a id="property-postfaninms"></a> `postFanInMs?` | `number` | Last non-coordination agent:end to run:end; absent without both. | [packages/core/src/l0/telemetry-reduce.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L233) |
| <a id="property-postfaninshare"></a> `postFanInShare?` | `number` | postFanInMs / runWallMs when both are defined and the wall is > 0. | [packages/core/src/l0/telemetry-reduce.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L297) |
| <a id="property-runwallms"></a> `runWallMs?` | `number` | run:start to run:end; absent while the run is open. | [packages/core/src/l0/telemetry-reduce.ts:231](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L231) |
| <a id="property-semanticjudgems"></a> `semanticJudgeMs` | `number` | Completed 'synthesize' spans that are the claim-consistency judge (agent:start label [CLAIM\_JUDGE\_LABEL](/api/@rulvar/core/variables/CLAIM_JUDGE_LABEL.md)), its extract phase included, summed (RV1604). | [packages/core/src/l0/telemetry-reduce.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L254) |
| <a id="property-synthesisms"></a> `synthesisMs` | `number` | Summed wall of completed 'synthesize' spans (0 when none). Since RV1604 this is exactly `finalCompositionMs + semanticJudgeMs`, kept whole for existing consumers: the name predates the claim judge riding the same role, and the eighteenth comparison benchmark read a 54-second `synthesisMs` as a second final composition when the run had SKIPPED synthesis and the bucket was entirely the judge and its extract. Read the split fields. | [packages/core/src/l0/telemetry-reduce.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L243) |
| <a id="property-synthesisshare"></a> `synthesisShare?` | `number` | synthesisMs / runWallMs under the same conditions. | [packages/core/src/l0/telemetry-reduce.ts:299](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L299) |
| <a id="property-workerspans"></a> `workerSpans` | `number` | Settled non-coordination agent spans that anchored the fan-in. | [packages/core/src/l0/telemetry-reduce.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L301) |
