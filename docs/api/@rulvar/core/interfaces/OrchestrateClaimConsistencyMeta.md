[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestrateClaimConsistencyMeta

# Interface: OrchestrateClaimConsistencyMeta

Defined in: [packages/core/src/orchestrator/orchestrate.ts:869](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L869)

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
| <a id="property-coverage"></a> `coverage` | [`ClaimCoverageGrade`](/api/@rulvar/core/type-aliases/ClaimCoverageGrade.md) | The one field a consumer reads INSTEAD of inferring semantic health from an empty findings array (RV1702): [claimCoverageOf](/api/@rulvar/core/functions/claimCoverageOf.md) over this meta, so `completion: 'complete'` plus `contradictions: []` can never again read as "fully verified" when the judge saw 40 of 144 citing sentences. | [packages/core/src/orchestrator/orchestrate.ts:927](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L927) |
| <a id="property-coveredcitingsentences"></a> `coveredCitingSentences` | `number` | Citing sentences with at least one judged pair (RV1603): the honest coverage numerator against `draftCitingSentences`, so `[]` findings over 40 of 144 sentences can never read as "fully verified". | [packages/core/src/orchestrator/orchestrate.ts:883](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L883) |
| <a id="property-criticaluncovered"></a> `criticalUncovered?` | `string`[] | Present when `critical` was declared: the critical draft anchors with no judged pair (capped at [MAX\_CRITICAL\_UNCOVERED](/api/@rulvar/core/variables/MAX_CRITICAL_UNCOVERED.md)); `[]` means every declared claim the draft cited was judged. | [packages/core/src/orchestrator/orchestrate.ts:889](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L889) |
| <a id="property-criticaluncoveredtotal"></a> `criticalUncoveredTotal?` | `number` | The uncapped count behind `criticalUncovered`; present with it. | [packages/core/src/orchestrator/orchestrate.ts:891](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L891) |
| <a id="property-draftcitingsentences"></a> `draftCitingSentences` | `number` | Draft sentences carrying at least one parsable anchor. | [packages/core/src/orchestrator/orchestrate.ts:873](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L873) |
| <a id="property-judgefailed"></a> `judgeFailed?` | `true` | Present when the judge invocation did not settle ok. | [packages/core/src/orchestrator/orchestrate.ts:919](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L919) |
| <a id="property-judgeinvoked"></a> `judgeInvoked` | `boolean` | True when the judge invocation was dispatched. | [packages/core/src/orchestrator/orchestrate.ts:917](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L917) |
| <a id="property-lowcoverage"></a> `lowCoverage?` | \{ `coverageFloor?`: `number`; `coverageRatio`: `number`; `runFactFloor?`: `number`; `runFactRatio?`: `number`; \} | Present when a declared coverage floor was not met under `onLowCoverage: 'report'` (RV1809): each ratio beside its floor, machine-readable, so "complete but under-verified by the declared floor" is a field, not an external computation. Under 'fail' the run fails typed instead and the meta stamps this block on the way out. | [packages/core/src/orchestrator/orchestrate.ts:910](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L910) |
| `lowCoverage.coverageFloor?` | `number` | - | [packages/core/src/orchestrator/orchestrate.ts:912](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L912) |
| `lowCoverage.coverageRatio` | `number` | - | [packages/core/src/orchestrator/orchestrate.ts:911](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L911) |
| `lowCoverage.runFactFloor?` | `number` | - | [packages/core/src/orchestrator/orchestrate.ts:914](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L914) |
| `lowCoverage.runFactRatio?` | `number` | - | [packages/core/src/orchestrator/orchestrate.ts:913](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L913) |
| <a id="property-pairs"></a> `pairs` | `number` | Pairs the fold produced (and the judge ruled on, when invoked). | [packages/core/src/orchestrator/orchestrate.ts:875](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L875) |
| <a id="property-poolchildren"></a> `poolChildren` | `number` | How many accepted children the fold read. | [packages/core/src/orchestrator/orchestrate.ts:871](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L871) |
| <a id="property-runfactcandidates"></a> `runFactCandidates?` | `number` | Present under `runFacts` (RV1809): the UNCAPPED count of matched run-claim sentences, so the run-fact coverage ratio is computable from the meta alone, live or from a persisted outcome. | [packages/core/src/orchestrator/orchestrate.ts:901](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L901) |
| <a id="property-runfactpairs"></a> `runFactPairs?` | `number` | Present under `runFacts`: run-claim pairs judged against the fact sheet. | [packages/core/src/orchestrator/orchestrate.ts:893](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L893) |
| <a id="property-runfactpairstruncated"></a> `runFactPairsTruncated?` | `true` | Present under `runFacts` when more run claims matched than the bound. | [packages/core/src/orchestrator/orchestrate.ts:895](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L895) |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when more pairs existed than `max` allowed to judge. | [packages/core/src/orchestrator/orchestrate.ts:877](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L877) |
