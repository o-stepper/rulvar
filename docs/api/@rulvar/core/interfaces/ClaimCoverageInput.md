[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimCoverageInput

# Interface: ClaimCoverageInput

Defined in: [packages/core/src/orchestrator/consistency.ts:531](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L531)

The subset of the claim-consistency meta the grade derives from.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-coveredcitingsentences"></a> `coveredCitingSentences` | `number` | Citing sentences with at least one judged pair. | [packages/core/src/orchestrator/consistency.ts:537](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L537) |
| <a id="property-criticaluncoveredtotal"></a> `criticalUncoveredTotal?` | `number` | Uncapped count of declared critical anchors with no judged pair. | [packages/core/src/orchestrator/consistency.ts:539](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L539) |
| <a id="property-draftcitingsentences"></a> `draftCitingSentences` | `number` | Draft sentences carrying at least one parsable anchor. | [packages/core/src/orchestrator/consistency.ts:533](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L533) |
| <a id="property-judgefailed"></a> `judgeFailed?` | `true` | True when the judge invocation did not settle ok. | [packages/core/src/orchestrator/consistency.ts:543](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L543) |
| <a id="property-runfactpairstruncated"></a> `runFactPairsTruncated?` | `true` | True when the run-facts pair bound cut the run-claim pairs. | [packages/core/src/orchestrator/consistency.ts:541](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L541) |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when the pair bound cut the fold. | [packages/core/src/orchestrator/consistency.ts:535](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L535) |
