[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestrateClaimConsistencyMeta

# Interface: OrchestrateClaimConsistencyMeta

Defined in: [packages/core/src/orchestrator/orchestrate.ts:983](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L983)

What the claim-consistency pass looked at, beside its findings.
Rides the acceptance envelope as `claimConsistencyMeta` whenever the
pass is configured, exactly like `contradictionsMeta`: `[]` plus
this meta says "the fold paired `pairs` sentences and the judge
cleared them", while an absent pair of fields says nothing looked.
`judgeInvoked` false records that no pair existed to judge, and
`judgeFailed` names a judge invocation that did not settle ok, in
which case `claimContradictions` is absent: nothing was judged, and
an empty list would claim the pool agreed.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-coverage"></a> `coverage` | [`ClaimCoverageGrade`](/api/@rulvar/core/type-aliases/ClaimCoverageGrade.md) | The one field a consumer reads INSTEAD of inferring semantic health from an empty findings array (RV1702): [claimCoverageOf](/api/@rulvar/core/functions/claimCoverageOf.md) over this meta, so `completion: 'complete'` plus `contradictions: []` can never again read as "fully verified" when the judge saw 40 of 144 citing sentences. | [packages/core/src/orchestrator/orchestrate.ts:1058](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1058) |
| <a id="property-coveragetarget"></a> `coverageTarget?` | `number` | Present when `coverageTarget` was declared (RV2903): the share the pass sized itself for, echoed so a persisted outcome says WHAT the coverage was held against, not only what it reached. | [packages/core/src/orchestrator/orchestrate.ts:1003](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1003) |
| <a id="property-coveredcitingsentences"></a> `coveredCitingSentences` | `number` | Citing sentences with at least one judged pair (RV1603): the honest coverage numerator against `draftCitingSentences`, so `[]` findings over 40 of 144 sentences can never read as "fully verified". | [packages/core/src/orchestrator/orchestrate.ts:997](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L997) |
| <a id="property-criticaluncovered"></a> `criticalUncovered?` | `string`[] | Present when `critical` was declared: the critical draft anchors with no judged pair (capped at [MAX\_CRITICAL\_UNCOVERED](/api/@rulvar/core/variables/MAX_CRITICAL_UNCOVERED.md)); `[]` means every declared claim the draft cited was judged. | [packages/core/src/orchestrator/orchestrate.ts:1009](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1009) |
| <a id="property-criticaluncoveredtotal"></a> `criticalUncoveredTotal?` | `number` | The uncapped count behind `criticalUncovered`; present with it. | [packages/core/src/orchestrator/orchestrate.ts:1011](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1011) |
| <a id="property-draftcitingsentences"></a> `draftCitingSentences` | `number` | Draft sentences carrying at least one parsable anchor. | [packages/core/src/orchestrator/orchestrate.ts:987](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L987) |
| <a id="property-judgedeclined"></a> `judgeDeclined?` | `true` | Present when the judge invocation was refused ADMISSION and never dispatched (RV2106): the ninth parity run's judge estimate did not fit the orchestrator account's working room past the held synthesis reserve, and the bare refusal killed a run whose fan-out and draft were already complete. The declined pass degrades like a failed judge (the meta names it, the journaled decision carries the arithmetic, only the armed 'fail' posture stops the run) and the synthesis its reserve was holding money for still dispatches. | [packages/core/src/orchestrator/orchestrate.ts:1050](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1050) |
| <a id="property-judgedhash"></a> `judgedHash` | `string` | sha256 over the canonical document this verdict read (RV2509). Compare it against the envelope's `draftToFinal.finalHash`: equal means the judged document IS the one that shipped, unequal means the synthesis rewrote what the judge cleared. | [packages/core/src/orchestrator/orchestrate.ts:1073](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1073) |
| <a id="property-judgedstage"></a> `judgedStage` | `"draft"` \| `"final"` | WHICH document this verdict describes (RV2509): `'draft'` for the pre-synthesis pass, `'final'` for a pass over the artifact the run settles on. Always present since RV2509, so a coverage grade can never be read as a claim about the shipped document when it was rendered over the draft the synthesis replaced. | [packages/core/src/orchestrator/orchestrate.ts:1066](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1066) |
| <a id="property-judgefailed"></a> `judgeFailed?` | `true` | Present when the judge invocation did not settle ok. | [packages/core/src/orchestrator/orchestrate.ts:1039](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1039) |
| <a id="property-judgeinvoked"></a> `judgeInvoked` | `boolean` | True when the judge invocation was dispatched. | [packages/core/src/orchestrator/orchestrate.ts:1037](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1037) |
| <a id="property-lowcoverage"></a> `lowCoverage?` | \{ `coverageFloor?`: `number`; `coverageRatio`: `number`; `runFactFloor?`: `number`; `runFactRatio?`: `number`; \} | Present when a declared coverage floor was not met under `onLowCoverage: 'report'` (RV1809): each ratio beside its floor, machine-readable, so "complete but under-verified by the declared floor" is a field, not an external computation. Under 'fail' the run fails typed instead and the meta stamps this block on the way out. | [packages/core/src/orchestrator/orchestrate.ts:1030](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1030) |
| `lowCoverage.coverageFloor?` | `number` | - | [packages/core/src/orchestrator/orchestrate.ts:1032](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1032) |
| `lowCoverage.coverageRatio` | `number` | - | [packages/core/src/orchestrator/orchestrate.ts:1031](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1031) |
| `lowCoverage.runFactFloor?` | `number` | - | [packages/core/src/orchestrator/orchestrate.ts:1034](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1034) |
| `lowCoverage.runFactRatio?` | `number` | - | [packages/core/src/orchestrator/orchestrate.ts:1033](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1033) |
| <a id="property-pairs"></a> `pairs` | `number` | Pairs the fold produced (and the judge ruled on, when invoked). | [packages/core/src/orchestrator/orchestrate.ts:989](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L989) |
| <a id="property-poolchildren"></a> `poolChildren` | `number` | How many accepted children the fold read. | [packages/core/src/orchestrator/orchestrate.ts:985](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L985) |
| <a id="property-runfactcandidates"></a> `runFactCandidates?` | `number` | Present under `runFacts` (RV1809): the UNCAPPED count of matched run-claim sentences, so the run-fact coverage ratio is computable from the meta alone, live or from a persisted outcome. | [packages/core/src/orchestrator/orchestrate.ts:1021](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1021) |
| <a id="property-runfactpairs"></a> `runFactPairs?` | `number` | Present under `runFacts`: run-claim pairs judged against the fact sheet. | [packages/core/src/orchestrator/orchestrate.ts:1013](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1013) |
| <a id="property-runfactpairstruncated"></a> `runFactPairsTruncated?` | `true` | Present under `runFacts` when more run claims matched than the bound. | [packages/core/src/orchestrator/orchestrate.ts:1015](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1015) |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when more pairs existed than `max` allowed to judge. | [packages/core/src/orchestrator/orchestrate.ts:991](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L991) |
