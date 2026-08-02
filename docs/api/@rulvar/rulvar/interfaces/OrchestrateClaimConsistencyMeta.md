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
| <a id="property-draftcitingsentences"></a> `draftCitingSentences` | `number` | Draft sentences carrying at least one parsable anchor. | `packages/core/dist/index.d.ts` |
| <a id="property-judgefailed"></a> `judgeFailed?` | `true` | Present when the judge invocation did not settle ok. | `packages/core/dist/index.d.ts` |
| <a id="property-judgeinvoked"></a> `judgeInvoked` | `boolean` | True when the judge invocation was dispatched. | `packages/core/dist/index.d.ts` |
| <a id="property-pairs"></a> `pairs` | `number` | Pairs the fold produced (and the judge ruled on, when invoked). | `packages/core/dist/index.d.ts` |
| <a id="property-poolchildren"></a> `poolChildren` | `number` | How many accepted children the fold read. | `packages/core/dist/index.d.ts` |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when more pairs existed than `max` allowed to judge. | `packages/core/dist/index.d.ts` |
