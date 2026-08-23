[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / citationUnitExcerptOf

# Function: citationUnitExcerptOf()

```ts
function citationUnitExcerptOf(resolve, row): 
  | {
  excerpt: string;
  unit: CitationExcerptUnit;
}
  | undefined;
```

Defined in: [packages/core/src/orchestrator/citation-audit.ts:474](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/citation-audit.ts#L474)

Resolver v2's excerpt: the bounded LOGICAL UNIT the cited line
belongs to (RV4208), through the same pure line resolver v1 reads.
The v1 window is a fixed downward slice, and the sixth comparison
experiment's confirmed false negative was structural: a section
heading cited as the anchor with its support three lines below the
window. The unit rules, all bounded by [MAX\_CITATION\_UNIT\_EXCERPT\_LINES](/api/@rulvar/core/variables/MAX_CITATION_UNIT_EXCERPT_LINES.md) and [MAX\_CITATION\_UNIT\_EXCERPT\_CHARS](/api/@rulvar/core/variables/MAX_CITATION_UNIT_EXCERPT_CHARS.md) with a `truncated` flag when
clipped:

- comment context decides FIRST (RV4401): a line inside a comment
  block belongs to the comment, never to a one-line markdown list
  (seven of the seventh comparison experiment's ten "unsupported"
  verdicts were docstring anchors whose `* `-led lines matched the
  list rule and excerpted ALONE, hiding support 3..9 lines away).
  A `*`-led line is a comment only when a bounded upward scan finds
  the `/*` opener (a bare markdown `* item` chain has none and
  keeps its list semantics byte for byte); a `//`, `#` or `--` line
  is a comment only beside a SAME-family neighbor (a lone
  `# heading` stays a heading). Inside the comment the line
  classifies by its text AFTER the prefix strips: a stripped list
  item excerpts the item with its continuations, anything else the
  comment BLOCK (expanded upward to its start, bounded so the
  anchor keeps room below) plus the declaration lines it documents,
  to the first blank line;
- heading: the SECTION, the heading plus following lines to the
  next heading;
- table row: the row, with the header pair above it when adjacent;
  a HEADER anchor (the delimiter row sits directly below it)
  carries the delimiter and body rows too, because citing the
  header cites the table;
- list item: the marker line plus its more-indented continuation
  lines;
- code comment with no context evidence: the single-line fallback
  keeps the prior comment-declaration behavior unchanged;
- anything else: the paragraph, expanded upward and downward to the
  nearest blank or heading line.

An explicit `path:start-end` range keeps range semantics (the host
cited exact lines; second-guessing them would audit a different
citation): the ranged lines, clipped by the caps. The FIRST cited
line failing to resolve returns undefined, the unsupported-by-
doctrine verdict v1 renders.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `resolve` | (`target`) => `string` \| `undefined` |
| `row` | `Pick`\&lt;[`CitationAuditRow`](/api/@rulvar/core/interfaces/CitationAuditRow.md), `"path"` \| `"line"` \| `"endLine"`\&gt; |

## Returns

  \| \{
  `excerpt`: `string`;
  `unit`: [`CitationExcerptUnit`](/api/@rulvar/core/interfaces/CitationExcerptUnit.md);
\}
  \| `undefined`
