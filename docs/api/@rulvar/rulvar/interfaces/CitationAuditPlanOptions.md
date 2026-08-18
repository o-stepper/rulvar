[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CitationAuditPlanOptions

# Interface: CitationAuditPlanOptions

Defined in: `packages/core/dist/index.d.ts`

The declared audit options, exactly OrchestrateCitationAudit.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-maxsampled"></a> `maxSampled?` | `number` | The hard whole-document ceiling; default 24, the judge's own budget. | `packages/core/dist/index.d.ts` |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/rulvar/variables/DEFAULT_CITATION_PATTERN.md); must expose `path:line[-end]`. | `packages/core/dist/index.d.ts` |
| <a id="property-samplepersection"></a> `samplePerSection?` | `number` | Sampled citing sentences per H2 section; default 2, the judge's own method. | `packages/core/dist/index.d.ts` |
| <a id="property-window"></a> `window?` | `number` | Lines after the cited line an excerpt may carry; default 3. | `packages/core/dist/index.d.ts` |
