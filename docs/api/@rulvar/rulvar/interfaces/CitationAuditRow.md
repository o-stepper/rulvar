[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CitationAuditRow

# Interface: CitationAuditRow

Defined in: `packages/core/dist/index.d.ts`

One sampled citation occurrence, before any verdict.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-anchor"></a> `anchor` | `string` | The raw citation text as it appears in the sentence. | `packages/core/dist/index.d.ts` |
| <a id="property-endline"></a> `endLine?` | `number` | The range end when the citation is `path:start-end`. | `packages/core/dist/index.d.ts` |
| <a id="property-excerpt"></a> `excerpt?` | `string` | The resolved lines, `L<n>: <text>` per line. Absent when the FIRST cited line does not resolve in the host snapshot, which is itself an unsupported verdict: a citation nothing resolves is not provenance (the citedValueValidator doctrine). | `packages/core/dist/index.d.ts` |
| <a id="property-line"></a> `line` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-path"></a> `path` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-row"></a> `row` | `number` | Zero-based row index, the judge's addressing. | `packages/core/dist/index.d.ts` |
| <a id="property-section"></a> `section` | `string` | The owning H2 marker, or '' for text above the first heading. | `packages/core/dist/index.d.ts` |
| <a id="property-sentence"></a> `sentence` | `string` | The citing sentence, verbatim. | `packages/core/dist/index.d.ts` |
