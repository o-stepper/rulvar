[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ClaimPairsFold

# Interface: ClaimPairsFold

Defined in: `packages/core/dist/index.d.ts`

What the fold produced, beside the pairs themselves.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-draftcitingsentences"></a> `draftCitingSentences` | `number` | Draft sentences carrying at least one parsable anchor. | `packages/core/dist/index.d.ts` |
| <a id="property-pairs"></a> `pairs` | [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md)[] | The pairs, in draft first-seen order, capped at `max`. | `packages/core/dist/index.d.ts` |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when more pairs existed than `max` allowed to report. | `packages/core/dist/index.d.ts` |
