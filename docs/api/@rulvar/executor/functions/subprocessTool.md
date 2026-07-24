[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / subprocessTool

# Function: subprocessTool()

```ts
function subprocessTool<S>(init): ToolDef<S>;
```

Defined in: [packages/executor/src/subprocess.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/subprocess.ts#L262)

Defines a tool that runs under a subprocess (or container) executor.
The returned ToolDef declares `executor: 'subprocess'` and carries the
command on `executorSpec`; its `execute` closure exists only as a
guard, and throws if ever called in process, because dispatch routes to
the registered executor instead. Register that executor on the engine
for the tool to run.

## Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md) |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `init` | [`SubprocessToolInit`](/api/@rulvar/executor/interfaces/SubprocessToolInit.md)\&lt;`S`\&gt; |

## Returns

[`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;`S`\&gt;
