[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / reportOutcome

# Function: reportOutcome()

```ts
function reportOutcome(outcome, io): number;
```

Defined in: [packages/cli/src/drive.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/drive.ts#L189)

Renders the settled outcome; returns the process exit code. Error
messages, suspension keys, model refs, and phase names originate from
providers, tools, and workflow authors, so each is sanitized before
it reaches a terminal line, matching the TUI renderer (v1.24.1 review
P2-1). Values print as JSON, which escapes control bytes on its own.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `outcome` | [`RunOutcome`](/api/@rulvar/rulvar/type-aliases/RunOutcome.md)\&lt;`unknown`\&gt; |
| `io` | [`CliIo`](/api/@rulvar/cli/interfaces/CliIo.md) |

## Returns

`number`
