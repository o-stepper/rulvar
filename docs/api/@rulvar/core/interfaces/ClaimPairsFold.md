[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimPairsFold

# Interface: ClaimPairsFold

Defined in: [packages/core/src/orchestrator/consistency.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L78)

What the fold produced, beside the pairs themselves.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-draftcitingsentences"></a> `draftCitingSentences` | `number` | Draft sentences carrying at least one parsable anchor. | [packages/core/src/orchestrator/consistency.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L84) |
| <a id="property-pairs"></a> `pairs` | [`ClaimPair`](/api/@rulvar/core/interfaces/ClaimPair.md)[] | The pairs, in draft first-seen order, capped at `max`. | [packages/core/src/orchestrator/consistency.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L80) |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when more pairs existed than `max` allowed to report. | [packages/core/src/orchestrator/consistency.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L82) |
