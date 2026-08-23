[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimCoverageInput

# Interface: ClaimCoverageInput

Defined in: [packages/core/src/orchestrator/consistency.ts:677](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L677)

The subset of the claim-consistency meta the grade derives from.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-coveragetargetdeclared"></a> `coverageTargetDeclared?` | `true` | True when the fold ran under a DECLARED coverage target (RV4404): a truncation is then the CEILING cutting selection the target wanted, and the grade names it 'coverage-capped' instead of a silent 'partial'. Absent keeps every historical grade byte for byte. | [packages/core/src/orchestrator/consistency.ts:703](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L703) |
| <a id="property-coveredcitingsentences"></a> `coveredCitingSentences` | `number` | Citing sentences with at least one judged pair. | [packages/core/src/orchestrator/consistency.ts:683](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L683) |
| <a id="property-criticaluncoveredtotal"></a> `criticalUncoveredTotal?` | `number` | Uncapped count of declared critical anchors with no judged pair. | [packages/core/src/orchestrator/consistency.ts:685](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L685) |
| <a id="property-draftcitingsentences"></a> `draftCitingSentences` | `number` | Draft sentences carrying at least one parsable anchor. | [packages/core/src/orchestrator/consistency.ts:679](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L679) |
| <a id="property-judgedeclined"></a> `judgeDeclined?` | `true` | True when the judge invocation was refused ADMISSION and never dispatched (RV2106). The orchestrator already spreads the flag into the meta it grades, so nothing at the call site changes. | [packages/core/src/orchestrator/consistency.ts:695](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L695) |
| <a id="property-judgefailed"></a> `judgeFailed?` | `true` | True when the judge invocation did not settle ok. | [packages/core/src/orchestrator/consistency.ts:689](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L689) |
| <a id="property-runfactpairstruncated"></a> `runFactPairsTruncated?` | `true` | True when the run-facts pair bound cut the run-claim pairs. | [packages/core/src/orchestrator/consistency.ts:687](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L687) |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when the pair bound cut the fold. | [packages/core/src/orchestrator/consistency.ts:681](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L681) |
