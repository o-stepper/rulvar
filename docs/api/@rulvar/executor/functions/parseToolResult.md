[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / parseToolResult

# Function: parseToolResult()

```ts
function parseToolResult(stdout, tool): unknown;
```

Defined in: [packages/executor/src/spi.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L116)

The tool-program result protocol: the child's stdout, trimmed, is the
JSON result. Empty stdout is the null result; anything else must parse
as JSON or the dispatch fails typed `protocol`. Diagnostics belong on
stderr, which never enters the result.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stdout` | `string` |
| `tool` | `string` |

## Returns

`unknown`
