[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / containerExecutor

# Function: containerExecutor()

```ts
function containerExecutor(options): ToolExecutorProvider;
```

Defined in: [packages/executor/src/container.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/container.ts#L100)

Builds a container ToolExecutorProvider over a docker-compatible CLI.
Register it as
`createEngine({ executors: { container: containerExecutor({ image }) } })`;
tools declaring `executor: 'container'` dispatch through it. Define such
tools with [subprocessTool](/api/@rulvar/executor/functions/subprocessTool.md) and set `executor` to 'container', or
hand-build a ToolDef.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`ContainerExecutorOptions`](/api/@rulvar/executor/interfaces/ContainerExecutorOptions.md) |

## Returns

[`ToolExecutorProvider`](/api/@rulvar/rulvar/interfaces/ToolExecutorProvider.md)
