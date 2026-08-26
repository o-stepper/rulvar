[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CitationExcerptUnit

# Interface: CitationExcerptUnit

Defined in: [packages/core/src/orchestrator/citation-audit.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L79)

The bounded logical unit resolver v2 excerpts (RV4208).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-extended"></a> `extended?` | `true` | Present when the JUDGE-side extended cap resolved this unit (RV4707): the default cap clipped it, and the row was re-resolved at [CITATION\_UNIT\_JUDGE\_EXTENSION\_FACTOR](/api/@rulvar/core/variables/CITATION_UNIT_JUDGE_EXTENSION_FACTOR.md) times the bounds so the judge reads the support the clip used to hide. Stamped by the orchestrator's row mapping, never by the pure resolver; a unit carrying BOTH flags still clips at the extended cap. | [packages/core/src/orchestrator/citation-audit.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L102) |
| <a id="property-lines"></a> `lines` | `number` | Lines the excerpt carries. | [packages/core/src/orchestrator/citation-audit.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L91) |
| <a id="property-truncated"></a> `truncated?` | `true` | Present when the line or char caps clipped the unit. | [packages/core/src/orchestrator/citation-audit.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L93) |
| <a id="property-type"></a> `type` | \| `"section"` \| `"list-item"` \| `"table-row"` \| `"comment-declaration"` \| `"paragraph"` | 'section' a heading plus its body to the next heading; 'list-item' a list marker plus its continuation lines (a comment-internal list item counts, judged on its prefix-stripped text, RV4401); 'table-row' a table row with its header pair when adjacent, or a header anchor with the body it names; 'comment-declaration' a code comment block plus the declaration it documents; 'paragraph' a blank-line-delimited run, the default. | [packages/core/src/orchestrator/citation-audit.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L89) |
