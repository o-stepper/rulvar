[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / compileScript

# Function: compileScript()

```ts
function compileScript(source, o?): CompiledWorkflow;
```

Defined in: [packages/planner/src/compile.ts:310](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/compile.ts#L310)

Validates and compiles planner-generated source into a CompiledWorkflow.
The source is an async function body over the sandbox
globals; its `return` value is the workflow result. The compiled form is
pure data (the source is evaluated only inside the worker sandbox);
machine scripts run under errorPolicy 'lenient'.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `source` | `string` |
| `o?` | [`CompileScriptOptions`](/api/@rulvar/planner/interfaces/CompileScriptOptions.md) |

## Returns

[`CompiledWorkflow`](/api/@rulvar/rulvar/interfaces/CompiledWorkflow.md)
