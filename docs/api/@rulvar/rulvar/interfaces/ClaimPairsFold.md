[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ClaimPairsFold

# Interface: ClaimPairsFold

Defined in: `packages/core/dist/index.d.ts`

What the fold produced, beside the pairs themselves.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-coveredcitingsentences"></a> `coveredCitingSentences` | `number` | Citing sentences with at least one REPORTED pair (RV1603): the honest coverage numerator against `draftCitingSentences`. A sentence can be uncovered because nothing in the pool read its files, because every reading agreed verbatim, or because the `max` cap cut it; all three mean the judge never saw it. | `packages/core/dist/index.d.ts` |
| <a id="property-criticaluncovered"></a> `criticalUncovered?` | `string`[] | Present only when `critical` was given: the critical draft anchors (verbatim, draft order, deduplicated) with no reported pair, capped at [MAX\_CRITICAL\_UNCOVERED](/api/@rulvar/rulvar/variables/MAX_CRITICAL_UNCOVERED.md) entries. | `packages/core/dist/index.d.ts` |
| <a id="property-criticaluncoveredtotal"></a> `criticalUncoveredTotal?` | `number` | The uncapped count behind `criticalUncovered`; present with it. | `packages/core/dist/index.d.ts` |
| <a id="property-draftcitingsentences"></a> `draftCitingSentences` | `number` | Draft sentences carrying at least one parsable anchor. | `packages/core/dist/index.d.ts` |
| <a id="property-pairs"></a> `pairs` | [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md)[] | The pairs, in draft first-seen order, capped at `max`. | `packages/core/dist/index.d.ts` |
| <a id="property-targetcoveredsentences"></a> `targetCoveredSentences?` | `number` | Present when `targetCoverageShare` was declared (RV2903): the sentence count the target resolved to against THIS draft, so a consumer holds `coveredCitingSentences` against the goal the selection was sized for, not against a share it must re-derive. | `packages/core/dist/index.d.ts` |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when more pairs existed than `max` allowed to report. | `packages/core/dist/index.d.ts` |
| <a id="property-uncoveredsentences"></a> `uncoveredSentences?` | `string`[] | Present only when `reportUncovered` was set (RV4202): the distinct citing sentences with no reported pair, draft order, each cut to `maxExcerptChars`, capped at [MAX\_UNCOVERED\_SENTENCES](/api/@rulvar/rulvar/variables/MAX_UNCOVERED_SENTENCES.md). A sentence lands here for any of the three uncovered causes (no intersecting pool reading, verbatim agreement dropped every reading, or a bound cut its candidates); telling them apart is the repair round's job, which is exactly why the sentences ride the prompt instead of a cause taxonomy riding the meta. | `packages/core/dist/index.d.ts` |
| <a id="property-uncoveredsentencestotal"></a> `uncoveredSentencesTotal?` | `number` | The uncapped count behind `uncoveredSentences`; present with it. | `packages/core/dist/index.d.ts` |
