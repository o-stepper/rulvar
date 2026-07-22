[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / strictExitCode

# Function: strictExitCode()

```ts
function strictExitCode(
   outcome, 
   base, 
   io): number;
```

Defined in: [packages/cli/src/drive.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/drive.ts#L241)

`--strict` (the v1.40.0 improvement plan's completion contract): a
settled ok run whose orchestration acceptance envelope reports a
completion other than 'complete' exits nonzero, with the degraded
reasons printed. Outcomes without an acceptance envelope (a workflow
that never opted into orchestrate acceptance) and nonzero exit codes
pass through unchanged, so the flag never masks the ordinary status
exit and never bites a plain workflow.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `outcome` | [`RunOutcome`](/api/@rulvar/rulvar/type-aliases/RunOutcome.md)\&lt;`unknown`\&gt; |
| `base` | `number` |
| `io` | [`CliIo`](/api/@rulvar/cli/interfaces/CliIo.md) |

## Returns

`number`
