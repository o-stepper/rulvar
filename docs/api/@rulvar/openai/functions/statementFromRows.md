[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / statementFromRows

# Function: statementFromRows()

```ts
function statementFromRows(input): ProviderStatement;
```

Defined in: `packages/core/dist/index.d.ts`

Normalizes raw keyed rows (a parsed CSV, a JSON export) into a
[ProviderStatement](/api/@rulvar/openai/type-aliases/ProviderStatement.md) under one explicit [StatementColumnMap](/api/@rulvar/openai/interfaces/StatementColumnMap.md)
(RV1703). Fail-closed at the cell: a mapped column whose value cannot
be evidence (a non-numeric dollar figure, a fractional or negative
token count, an empty response id, an unknown component name) refuses
typed with the row index and column name instead of flowing a NaN or
a guess into the reconciliation. Absent cells (missing key, null,
empty string) mean "the export does not carry this figure" and simply
omit the field; a requests row that ends up carrying no dollars, no
component split, and no usage at all is refused, because a row
without evidence cannot reconcile anything.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `kind`: `"requests"` \| `"categories"`; `map`: [`StatementColumnMap`](/api/@rulvar/openai/interfaces/StatementColumnMap.md); `rows`: readonly `Record`\&lt;`string`, `unknown`\&gt;[]; \} |
| `input.kind` | `"requests"` \| `"categories"` |
| `input.map` | [`StatementColumnMap`](/api/@rulvar/openai/interfaces/StatementColumnMap.md) |
| `input.rows` | readonly `Record`\&lt;`string`, `unknown`\&gt;[] |

## Returns

[`ProviderStatement`](/api/@rulvar/openai/type-aliases/ProviderStatement.md)
