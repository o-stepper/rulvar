[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / buildOrchestratorTools

# Function: buildOrchestratorTools()

```ts
function buildOrchestratorTools(runtime, profileCardText): ToolDef<SchemaSpec<unknown>>[];
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Builds the mode (c) toolset over the per-call runtime. profileCardText
rides the spawn tools' descriptions so both modes speak one agent
vocabulary (docs/06 9.3; M6-T04).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runtime` | [`OrchestratorRuntime`](/api/@rulvar/rulvar/interfaces/OrchestratorRuntime.md) |
| `profileCardText` | `string` |

## Returns

[`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;[]
