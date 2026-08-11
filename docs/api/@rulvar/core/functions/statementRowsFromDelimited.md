[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / statementRowsFromDelimited

# Function: statementRowsFromDelimited()

```ts
function statementRowsFromDelimited(text, options?): Record<string, string>[];
```

Defined in: [packages/core/src/engine/reconcile-statement.ts:965](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L965)

Parses a delimited billing export (the CSV/TSV a provider console
hands a host) into the header-keyed rows [statementFromRows](/api/@rulvar/core/functions/statementFromRows.md)
consumes (RV2908). The library deliberately hard-codes NO provider's
export format: the host owns the column map, this owns only the
delimited grammar, and the pair closes the last manual step between
a downloaded export and [reconcileStatement](/api/@rulvar/core/functions/reconcileStatement.md).

Fail-closed at the record, like the rest of this module: a data row
whose cell count differs from the header, a quote opened and never
closed, a stray quote inside an unquoted cell, an empty or duplicate
header name, all refuse typed with the line instead of flowing a
shifted column into a reconciliation, because a column shifted one
to the left prices `outputTokens` as dollars and calls it evidence.
RFC 4180 quoting is honored (quoted cells may carry the delimiter,
doubled quotes, and line breaks); CRLF and lone LF both delimit
records; one trailing empty line is an artifact of every exporter
and is ignored. Cells come back as raw strings, so an empty cell
reads as "the export does not carry this figure" downstream, exactly
the absence contract `statementFromRows` documents.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |
| `options?` | [`DelimitedStatementOptions`](/api/@rulvar/core/interfaces/DelimitedStatementOptions.md) |

## Returns

`Record`\&lt;`string`, `string`\&gt;[]
