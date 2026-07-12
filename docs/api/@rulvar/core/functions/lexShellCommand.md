[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / lexShellCommand

# Function: lexShellCommand()

```ts
function lexShellCommand(command): ShellSegment[];
```

Defined in: [packages/core/src/tools/shell-matcher.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/shell-matcher.ts#L35)

Lexes a command into segments per the docs/08 5.2 algorithm. Quotes
and escapes are honored; nothing is expanded; `$(`, backticks, `<(`,
`>(`, and `<<` (outside single quotes) poison their segment.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `command` | `string` |

## Returns

[`ShellSegment`](/api/@rulvar/core/interfaces/ShellSegment.md)[]
