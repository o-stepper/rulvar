[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / lexShellCommand

# Function: lexShellCommand()

```ts
function lexShellCommand(command): ShellSegment[];
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Lexes a command into segments per the docs/08 5.2 algorithm. Quotes
and escapes are honored; nothing is expanded; `$(`, backticks, `<(`,
`>(`, and `<<` (outside single quotes) poison their segment.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `command` | `string` |

## Returns

[`ShellSegment`](/api/@rulvar/rulvar/interfaces/ShellSegment.md)[]
