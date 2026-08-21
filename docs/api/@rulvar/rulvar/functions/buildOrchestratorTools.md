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
| `options?` | \{ `batchGate?`: \{ `admittedChildren`: () => `number`; `projectionUsd`: (`task`) => `number`; `remainderUsd`: () => `number` \| `undefined`; `rosterFloor?`: `number`; \}; `childResultTools?`: `boolean`; `claimMapFinish?`: `boolean`; `parallelAdmission?`: `"fail-fast"` \| `"try-all"` \| `"all-or-none"`; `sectionalFinish?`: `boolean`; `settledResultsTool?`: `boolean`; \} | - |
| `options.batchGate?` | \{ `admittedChildren`: () => `number`; `projectionUsd`: (`task`) => `number`; `remainderUsd`: () => `number` \| `undefined`; `rosterFloor?`: `number`; \} | The batch projection seam (RV1908): the live remainder and the per-task dispatch projection the embedded gate itself uses, plus the run's admitted-children count and the declared acceptance roster floor. Runtime behavior only, never part of the tool schema or description, so toolset hashes stay byte identical. |
| `options.batchGate.admittedChildren?` | () => `number` | - |
| `options.batchGate.projectionUsd?` | (`task`) => `number` | - |
| `options.batchGate.remainderUsd?` | () => `number` \| `undefined` | - |
| `options.batchGate.rosterFloor?` | `number` | - |
| `options.childResultTools?` | `boolean` | - |
| `options.claimMapFinish?` | `boolean` | The claim map finish (RV4305): the synthesis invocation's finish requires a typed claimMap beside the result. Mutually exclusive with sectionalFinish by orchestrate intake. |
| `options.parallelAdmission?` | `"fail-fast"` \| `"try-all"` \| `"all-or-none"` | - |
| `options.sectionalFinish?` | `boolean` | - |
| `options.settledResultsTool?` | `boolean` | The bulk settled-set read (RV1807), its own opt-in: adding a tool under the existing childResultTools flag would move every opted-in run's toolset hash and re-key their resumes, so the new tool re-keys only runs that opt into IT. |

## Returns

[`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;[]
