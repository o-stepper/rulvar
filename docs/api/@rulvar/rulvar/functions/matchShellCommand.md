[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / matchShellCommand

# Function: matchShellCommand()

```ts
function matchShellCommand(command, rules): ShellVerdict;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The strictest-across-segments composition (5.3): deny if ANY segment
denies; otherwise ask if ANY segment asks or fails to match an allow
pattern; otherwise allow.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `command` | `string` |
| `rules` | [`ShellPatternRules`](/api/@rulvar/rulvar/interfaces/ShellPatternRules.md) |

## Returns

[`ShellVerdict`](/api/@rulvar/rulvar/type-aliases/ShellVerdict.md)
