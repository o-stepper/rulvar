[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / subprocessExecutor

# Function: subprocessExecutor()

```ts
function subprocessExecutor(options?): ToolExecutorProvider;
```

Defined in: [packages/executor/src/subprocess.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L124)

Builds a subprocess ToolExecutorProvider. Register it on the engine as
`createEngine({ executors: { subprocess: subprocessExecutor(...) } })`;
tools declaring `executor: 'subprocess'` (see [subprocessTool](/api/@rulvar/executor/functions/subprocessTool.md))
then dispatch through it.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`SubprocessExecutorOptions`](/api/@rulvar/executor/interfaces/SubprocessExecutorOptions.md) |

## Returns

[`ToolExecutorProvider`](/api/@rulvar/rulvar/interfaces/ToolExecutorProvider.md)
