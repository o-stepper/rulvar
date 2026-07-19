[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / driveRun

# Function: driveRun()

```ts
function driveRun(options): Promise<RunOutcome<unknown>>;
```

Defined in: [packages/cli/src/drive.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/drive.ts#L90)

Drives a handle to a terminal outcome, resolving suspensions
interactively and resuming until the run settles or input runs dry.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `args?`: `unknown`; `engine`: [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md); `first`: [`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md)\&lt;`unknown`\&gt;; `io`: [`CliIo`](/api/@rulvar/cli/interfaces/CliIo.md); `workflow`: [`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`never`, `unknown`\&gt;; \} | - |
| `options.args?` | `unknown` | Original run arguments: not journaled in v1, the host re-supplies them. |
| `options.engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) | - |
| `options.first` | [`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md)\&lt;`unknown`\&gt; | - |
| `options.io` | [`CliIo`](/api/@rulvar/cli/interfaces/CliIo.md) | - |
| `options.workflow` | [`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`never`, `unknown`\&gt; | - |

## Returns

`Promise`\&lt;[`RunOutcome`](/api/@rulvar/rulvar/type-aliases/RunOutcome.md)\&lt;`unknown`\&gt;\&gt;
