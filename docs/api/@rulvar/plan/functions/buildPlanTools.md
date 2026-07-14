[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / buildPlanTools

# Function: buildPlanTools()

```ts
function buildPlanTools(runtime): ToolDef<SchemaSpec<unknown>>[];
```

Defined in: [packages/plan/src/tools.ts:352](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/tools.ts#L352)

Builds the PlanRunner tools (appended to the mode (c) toolset).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runtime` | [`PlanToolRuntime`](/api/@rulvar/plan/interfaces/PlanToolRuntime.md) |

## Returns

[`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;[]
