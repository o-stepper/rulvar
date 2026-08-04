[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimPairsFold

# Interface: ClaimPairsFold

Defined in: [packages/core/src/orchestrator/consistency.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L92)

What the fold produced, beside the pairs themselves.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-coveredcitingsentences"></a> `coveredCitingSentences` | `number` | Citing sentences with at least one REPORTED pair (RV1603): the honest coverage numerator against `draftCitingSentences`. A sentence can be uncovered because nothing in the pool read its files, because every reading agreed verbatim, or because the `max` cap cut it; all three mean the judge never saw it. | [packages/core/src/orchestrator/consistency.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L106) |
| <a id="property-criticaluncovered"></a> `criticalUncovered?` | `string`[] | Present only when `critical` was given: the critical draft anchors (verbatim, draft order, deduplicated) with no reported pair, capped at [MAX\_CRITICAL\_UNCOVERED](/api/@rulvar/core/variables/MAX_CRITICAL_UNCOVERED.md) entries. | [packages/core/src/orchestrator/consistency.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L112) |
| <a id="property-criticaluncoveredtotal"></a> `criticalUncoveredTotal?` | `number` | The uncapped count behind `criticalUncovered`; present with it. | [packages/core/src/orchestrator/consistency.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L114) |
| <a id="property-draftcitingsentences"></a> `draftCitingSentences` | `number` | Draft sentences carrying at least one parsable anchor. | [packages/core/src/orchestrator/consistency.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L98) |
| <a id="property-pairs"></a> `pairs` | [`ClaimPair`](/api/@rulvar/core/interfaces/ClaimPair.md)[] | The pairs, in draft first-seen order, capped at `max`. | [packages/core/src/orchestrator/consistency.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L94) |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when more pairs existed than `max` allowed to report. | [packages/core/src/orchestrator/consistency.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L96) |
