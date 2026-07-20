[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / loadWorkflowModule

# Function: loadWorkflowModule()

```ts
function loadWorkflowModule(file, cwd): Promise<LoadedWorkflowModule>;
```

Defined in: [packages/cli/src/config.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L143)

Imports a workflow module given on the command line.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `file` | `string` |
| `cwd` | `string` |

## Returns

`Promise`\&lt;[`LoadedWorkflowModule`](/api/@rulvar/cli/interfaces/LoadedWorkflowModule.md)\&gt;
