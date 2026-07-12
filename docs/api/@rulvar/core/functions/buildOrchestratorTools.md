[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / buildOrchestratorTools

# Function: buildOrchestratorTools()

```ts
function buildOrchestratorTools(runtime, profileCardText): ToolDef<SchemaSpec>[];
```

Defined in: [packages/core/src/orchestrator/spawn-tools.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L134)

Builds the mode (c) toolset over the per-call runtime. profileCardText
rides the spawn tools' descriptions so both modes speak one agent
vocabulary (docs/06 9.3; M6-T04).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runtime` | [`OrchestratorRuntime`](/api/@rulvar/core/interfaces/OrchestratorRuntime.md) |
| `profileCardText` | `string` |

## Returns

[`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;[]
