[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / makeOrchestratorWorkflow

# Function: makeOrchestratorWorkflow()

```ts
function makeOrchestratorWorkflow(goal, opts?): Workflow<undefined, unknown>;
```

Defined in: [packages/core/src/orchestrator/orchestrate.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L223)

Builds the orchestrator workflow: ONE implementation behind both
surfaces. The body wires the spawn tools over the per-call runtime,
recovers spawn records from the journal on resume, and runs the
orchestrator agent with the finish terminal tool.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `goal` | `string` |
| `opts?` | [`OrchestrateOptions`](/api/@rulvar/core/interfaces/OrchestrateOptions.md) |

## Returns

[`Workflow`](/api/@rulvar/core/interfaces/Workflow.md)\&lt;`undefined`, `unknown`\&gt;
