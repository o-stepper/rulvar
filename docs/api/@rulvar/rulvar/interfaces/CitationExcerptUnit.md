[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CitationExcerptUnit

# Interface: CitationExcerptUnit

Defined in: `packages/core/dist/index.d.ts`

The bounded logical unit resolver v2 excerpts (RV4208).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-extended"></a> `extended?` | `true` | Present when the JUDGE-side extended cap resolved this unit (RV4707): the default cap clipped it, and the row was re-resolved at [CITATION\_UNIT\_JUDGE\_EXTENSION\_FACTOR](/api/@rulvar/rulvar/variables/CITATION_UNIT_JUDGE_EXTENSION_FACTOR.md) times the bounds so the judge reads the support the clip used to hide. Stamped by the orchestrator's row mapping, never by the pure resolver; a unit carrying BOTH flags still clips at the extended cap. | `packages/core/dist/index.d.ts` |
| <a id="property-lines"></a> `lines` | `number` | Lines the excerpt carries. | `packages/core/dist/index.d.ts` |
| <a id="property-truncated"></a> `truncated?` | `true` | Present when the line or char caps clipped the unit. | `packages/core/dist/index.d.ts` |
| <a id="property-type"></a> `type` | \| `"section"` \| `"list-item"` \| `"table-row"` \| `"comment-declaration"` \| `"paragraph"` | 'section' a heading plus its body to the next heading; 'list-item' a list marker plus its continuation lines (a comment-internal list item counts, judged on its prefix-stripped text, RV4401); 'table-row' a table row with its header pair when adjacent, or a header anchor with the body it names; 'comment-declaration' a code comment block plus the declaration it documents; 'paragraph' a blank-line-delimited run, the default. | `packages/core/dist/index.d.ts` |
