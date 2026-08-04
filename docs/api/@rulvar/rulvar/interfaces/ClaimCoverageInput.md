[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ClaimCoverageInput

# Interface: ClaimCoverageInput

Defined in: `packages/core/dist/index.d.ts`

The subset of the claim-consistency meta the grade derives from.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-coveredcitingsentences"></a> `coveredCitingSentences` | `number` | Citing sentences with at least one judged pair. | `packages/core/dist/index.d.ts` |
| <a id="property-criticaluncoveredtotal"></a> `criticalUncoveredTotal?` | `number` | Uncapped count of declared critical anchors with no judged pair. | `packages/core/dist/index.d.ts` |
| <a id="property-draftcitingsentences"></a> `draftCitingSentences` | `number` | Draft sentences carrying at least one parsable anchor. | `packages/core/dist/index.d.ts` |
| <a id="property-judgefailed"></a> `judgeFailed?` | `true` | True when the judge invocation did not settle ok. | `packages/core/dist/index.d.ts` |
| <a id="property-runfactpairstruncated"></a> `runFactPairsTruncated?` | `true` | True when the run-facts pair bound cut the run-claim pairs. | `packages/core/dist/index.d.ts` |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when the pair bound cut the fold. | `packages/core/dist/index.d.ts` |
