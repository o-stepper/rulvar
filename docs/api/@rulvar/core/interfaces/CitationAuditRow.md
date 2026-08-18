[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CitationAuditRow

# Interface: CitationAuditRow

Defined in: [packages/core/src/orchestrator/citation-audit.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L34)

One sampled citation occurrence, before any verdict.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-anchor"></a> `anchor` | `string` | The raw citation text as it appears in the sentence. | [packages/core/src/orchestrator/citation-audit.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L42) |
| <a id="property-endline"></a> `endLine?` | `number` | The range end when the citation is `path:start-end`. | [packages/core/src/orchestrator/citation-audit.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L46) |
| <a id="property-excerpt"></a> `excerpt?` | `string` | The resolved lines, `L<n>: <text>` per line. Absent when the FIRST cited line does not resolve in the host snapshot, which is itself an unsupported verdict: a citation nothing resolves is not provenance (the citedValueValidator doctrine). | [packages/core/src/orchestrator/citation-audit.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L53) |
| <a id="property-line"></a> `line` | `number` | - | [packages/core/src/orchestrator/citation-audit.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L44) |
| <a id="property-path"></a> `path` | `string` | - | [packages/core/src/orchestrator/citation-audit.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L43) |
| <a id="property-row"></a> `row` | `number` | Zero-based row index, the judge's addressing. | [packages/core/src/orchestrator/citation-audit.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L36) |
| <a id="property-section"></a> `section` | `string` | The owning H2 marker, or '' for text above the first heading. | [packages/core/src/orchestrator/citation-audit.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L38) |
| <a id="property-sentence"></a> `sentence` | `string` | The citing sentence, verbatim. | [packages/core/src/orchestrator/citation-audit.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L40) |
