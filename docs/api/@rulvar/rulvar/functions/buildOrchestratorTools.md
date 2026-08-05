[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / buildOrchestratorTools

# Function: buildOrchestratorTools()

```ts
function buildOrchestratorTools(
   runtime, 
   profileCardText, 
   options?): ToolDef<SchemaSpec<unknown>>[];
```

Defined in: `packages/core/dist/index.d.ts`

Builds the mode (c) toolset over the per-call runtime. profileCardText
rides the spawn tools' descriptions so both modes speak one agent
vocabulary (M6-T04).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `runtime` | [`OrchestratorRuntime`](/api/@rulvar/rulvar/interfaces/OrchestratorRuntime.md) | - |
| `profileCardText` | `string` | - |
| `options?` | \{ `childResultTools?`: `boolean`; `sectionalFinish?`: `boolean`; `settledResultsTool?`: `boolean`; \} | - |
| `options.childResultTools?` | `boolean` | - |
| `options.sectionalFinish?` | `boolean` | - |
| `options.settledResultsTool?` | `boolean` | The bulk settled-set read (RV1807), its own opt-in: adding a tool under the existing childResultTools flag would move every opted-in run's toolset hash and re-key their resumes, so the new tool re-keys only runs that opt into IT. |

## Returns

[`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;[]
