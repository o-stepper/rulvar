[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / makeOrchestratorWorkflow

# Function: makeOrchestratorWorkflow()

```ts
function makeOrchestratorWorkflow(goal, opts?): Workflow<undefined, unknown>;
```

Defined in: `packages/core/dist/index.d.ts`

Builds the orchestrator workflow: ONE implementation behind both
surfaces. The body wires the spawn tools over the per-call runtime,
recovers spawn records from the journal on resume, and runs the
orchestrator agent with the finish terminal tool.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `goal` | `string` |
| `opts?` | [`OrchestrateOptions`](/api/@rulvar/rulvar/interfaces/OrchestrateOptions.md) |

## Returns

[`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`undefined`, `unknown`\&gt;
