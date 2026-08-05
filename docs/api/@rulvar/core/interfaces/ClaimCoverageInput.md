[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimCoverageInput

# Interface: ClaimCoverageInput

Defined in: [packages/core/src/orchestrator/consistency.ts:538](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L538)

The subset of the claim-consistency meta the grade derives from.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-coveredcitingsentences"></a> `coveredCitingSentences` | `number` | Citing sentences with at least one judged pair. | [packages/core/src/orchestrator/consistency.ts:544](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L544) |
| <a id="property-criticaluncoveredtotal"></a> `criticalUncoveredTotal?` | `number` | Uncapped count of declared critical anchors with no judged pair. | [packages/core/src/orchestrator/consistency.ts:546](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L546) |
| <a id="property-draftcitingsentences"></a> `draftCitingSentences` | `number` | Draft sentences carrying at least one parsable anchor. | [packages/core/src/orchestrator/consistency.ts:540](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L540) |
| <a id="property-judgefailed"></a> `judgeFailed?` | `true` | True when the judge invocation did not settle ok. | [packages/core/src/orchestrator/consistency.ts:550](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L550) |
| <a id="property-runfactpairstruncated"></a> `runFactPairsTruncated?` | `true` | True when the run-facts pair bound cut the run-claim pairs. | [packages/core/src/orchestrator/consistency.ts:548](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L548) |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when the pair bound cut the fold. | [packages/core/src/orchestrator/consistency.ts:542](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L542) |
