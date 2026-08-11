[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimCoverageInput

# Interface: ClaimCoverageInput

Defined in: [packages/core/src/orchestrator/consistency.ts:620](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L620)

The subset of the claim-consistency meta the grade derives from.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-coveredcitingsentences"></a> `coveredCitingSentences` | `number` | Citing sentences with at least one judged pair. | [packages/core/src/orchestrator/consistency.ts:626](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L626) |
| <a id="property-criticaluncoveredtotal"></a> `criticalUncoveredTotal?` | `number` | Uncapped count of declared critical anchors with no judged pair. | [packages/core/src/orchestrator/consistency.ts:628](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L628) |
| <a id="property-draftcitingsentences"></a> `draftCitingSentences` | `number` | Draft sentences carrying at least one parsable anchor. | [packages/core/src/orchestrator/consistency.ts:622](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L622) |
| <a id="property-judgedeclined"></a> `judgeDeclined?` | `true` | True when the judge invocation was refused ADMISSION and never dispatched (RV2106). The orchestrator already spreads the flag into the meta it grades, so nothing at the call site changes. | [packages/core/src/orchestrator/consistency.ts:638](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L638) |
| <a id="property-judgefailed"></a> `judgeFailed?` | `true` | True when the judge invocation did not settle ok. | [packages/core/src/orchestrator/consistency.ts:632](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L632) |
| <a id="property-runfactpairstruncated"></a> `runFactPairsTruncated?` | `true` | True when the run-facts pair bound cut the run-claim pairs. | [packages/core/src/orchestrator/consistency.ts:630](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L630) |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when the pair bound cut the fold. | [packages/core/src/orchestrator/consistency.ts:624](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L624) |
