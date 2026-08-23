[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CitationAuditPlanOptions

# Interface: CitationAuditPlanOptions

Defined in: `packages/core/dist/index.d.ts`

The declared audit options, exactly OrchestrateCitationAudit.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-auditscope"></a> `auditScope?` | `"sample"` \| `"all"` | What the audit judges (RV4407): 'sample' (the default) keeps the deterministic stratified sample above byte for byte; 'all' judges EVERY anchor row of the document, no per-section pick and no `maxSampled` ceiling, so the verdict is a census instead of a sample. Requires resolver 2 (the census enumerates every anchor of every citing sentence, which is v2's row semantics), and one judge invocation still carries all rows: the cost scales through the prompt, so size `judge.estCost` for the whole document. The seventh comparison experiment's improvement plan asked for exactly this census for regulated classes. | `packages/core/dist/index.d.ts` |
| <a id="property-maxsampled"></a> `maxSampled?` | `number` | The hard whole-document ceiling; default 24, the judge's own budget. | `packages/core/dist/index.d.ts` |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/rulvar/variables/DEFAULT_CITATION_PATTERN.md); must expose `path:line[-end]`. | `packages/core/dist/index.d.ts` |
| <a id="property-resolver"></a> `resolver?` | `2` \| `1` | The resolver generation (RV4208): 1, the default, is the fixed downward window above, byte identical for every existing config. 2 excerpts the bounded LOGICAL UNIT the cited line belongs to ([citationUnitExcerptOf](/api/@rulvar/rulvar/functions/citationUnitExcerptOf.md)) and audits EVERY anchor of a compound sentence as its own row against its nearest claim clause. The sixth comparison experiment's false negatives were exactly window artifacts: a section heading whose support lives below the window, and only a sentence's first anchor ever sampled. Opt-in because the sample derives from the document hash: v2 changes which rows exist and what the judge reads, so a declared config must choose it. | `packages/core/dist/index.d.ts` |
| <a id="property-samplepersection"></a> `samplePerSection?` | `number` | Sampled citing sentences per H2 section; default 2, the judge's own method. | `packages/core/dist/index.d.ts` |
| <a id="property-window"></a> `window?` | `number` | Lines after the cited line an excerpt may carry; default 3. | `packages/core/dist/index.d.ts` |
