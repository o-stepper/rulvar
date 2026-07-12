[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / matchShellCommand

# Function: matchShellCommand()

```ts
function matchShellCommand(command, rules): ShellVerdict;
```

Defined in: [packages/core/src/tools/shell-matcher.ts:236](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/shell-matcher.ts#L236)

The strictest-across-segments composition (5.3): deny if ANY segment
denies; otherwise ask if ANY segment asks or fails to match an allow
pattern; otherwise allow.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `command` | `string` |
| `rules` | [`ShellPatternRules`](/api/@rulvar/core/interfaces/ShellPatternRules.md) |

## Returns

[`ShellVerdict`](/api/@rulvar/core/type-aliases/ShellVerdict.md)
