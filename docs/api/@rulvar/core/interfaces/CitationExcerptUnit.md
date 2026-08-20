[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CitationExcerptUnit

# Interface: CitationExcerptUnit

Defined in: [packages/core/src/orchestrator/citation-audit.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L79)

The bounded logical unit resolver v2 excerpts (RV4208).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-lines"></a> `lines` | `number` | Lines the excerpt carries. | [packages/core/src/orchestrator/citation-audit.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L89) |
| <a id="property-truncated"></a> `truncated?` | `true` | Present when the line or char caps clipped the unit. | [packages/core/src/orchestrator/citation-audit.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L91) |
| <a id="property-type"></a> `type` | \| `"section"` \| `"list-item"` \| `"table-row"` \| `"comment-declaration"` \| `"paragraph"` | 'section' a heading plus its body to the next heading; 'list-item' a list marker plus its continuation lines; 'table-row' a table row with its header pair when adjacent; 'comment-declaration' a code comment block plus the declaration it documents; 'paragraph' a blank-line-delimited run, the default. | [packages/core/src/orchestrator/citation-audit.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L87) |
