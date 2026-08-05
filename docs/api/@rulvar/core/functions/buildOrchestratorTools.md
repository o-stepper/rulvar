[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / buildOrchestratorTools

# Function: buildOrchestratorTools()

```ts
function buildOrchestratorTools(
   runtime, 
   profileCardText, 
   options?): ToolDef<SchemaSpec>[];
```

Defined in: [packages/core/src/orchestrator/spawn-tools.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/spawn-tools.ts#L216)

Builds the mode (c) toolset over the per-call runtime. profileCardText
rides the spawn tools' descriptions so both modes speak one agent
vocabulary (M6-T04).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `runtime` | [`OrchestratorRuntime`](/api/@rulvar/core/interfaces/OrchestratorRuntime.md) | - |
| `profileCardText` | `string` | - |
| `options?` | \{ `childResultTools?`: `boolean`; `sectionalFinish?`: `boolean`; `settledResultsTool?`: `boolean`; \} | - |
| `options.childResultTools?` | `boolean` | - |
| `options.sectionalFinish?` | `boolean` | - |
| `options.settledResultsTool?` | `boolean` | The bulk settled-set read (RV1807), its own opt-in: adding a tool under the existing childResultTools flag would move every opted-in run's toolset hash and re-key their resumes, so the new tool re-keys only runs that opt into IT. |

## Returns

[`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;[]
