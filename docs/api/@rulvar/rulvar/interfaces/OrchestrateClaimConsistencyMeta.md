[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OrchestrateClaimConsistencyMeta

# Interface: OrchestrateClaimConsistencyMeta

Defined in: `packages/core/dist/index.d.ts`

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
| <a id="property-coverage"></a> `coverage` | [`ClaimCoverageGrade`](/api/@rulvar/rulvar/type-aliases/ClaimCoverageGrade.md) | The one field a consumer reads INSTEAD of inferring semantic health from an empty findings array (RV1702): [claimCoverageOf](/api/@rulvar/rulvar/functions/claimCoverageOf.md) over this meta, so `completion: 'complete'` plus `contradictions: []` can never again read as "fully verified" when the judge saw 40 of 144 citing sentences. | `packages/core/dist/index.d.ts` |
| <a id="property-coveredcitingsentences"></a> `coveredCitingSentences` | `number` | Citing sentences with at least one judged pair (RV1603): the honest coverage numerator against `draftCitingSentences`, so `[]` findings over 40 of 144 sentences can never read as "fully verified". | `packages/core/dist/index.d.ts` |
| <a id="property-criticaluncovered"></a> `criticalUncovered?` | `string`[] | Present when `critical` was declared: the critical draft anchors with no judged pair (capped at [MAX\_CRITICAL\_UNCOVERED](/api/@rulvar/rulvar/variables/MAX_CRITICAL_UNCOVERED.md)); `[]` means every declared claim the draft cited was judged. | `packages/core/dist/index.d.ts` |
| <a id="property-criticaluncoveredtotal"></a> `criticalUncoveredTotal?` | `number` | The uncapped count behind `criticalUncovered`; present with it. | `packages/core/dist/index.d.ts` |
| <a id="property-draftcitingsentences"></a> `draftCitingSentences` | `number` | Draft sentences carrying at least one parsable anchor. | `packages/core/dist/index.d.ts` |
| <a id="property-judgefailed"></a> `judgeFailed?` | `true` | Present when the judge invocation did not settle ok. | `packages/core/dist/index.d.ts` |
| <a id="property-judgeinvoked"></a> `judgeInvoked` | `boolean` | True when the judge invocation was dispatched. | `packages/core/dist/index.d.ts` |
| <a id="property-pairs"></a> `pairs` | `number` | Pairs the fold produced (and the judge ruled on, when invoked). | `packages/core/dist/index.d.ts` |
| <a id="property-poolchildren"></a> `poolChildren` | `number` | How many accepted children the fold read. | `packages/core/dist/index.d.ts` |
| <a id="property-runfactpairs"></a> `runFactPairs?` | `number` | Present under `runFacts`: run-claim pairs judged against the fact sheet. | `packages/core/dist/index.d.ts` |
| <a id="property-runfactpairstruncated"></a> `runFactPairsTruncated?` | `true` | Present under `runFacts` when more run claims matched than the bound. | `packages/core/dist/index.d.ts` |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when more pairs existed than `max` allowed to judge. | `packages/core/dist/index.d.ts` |
