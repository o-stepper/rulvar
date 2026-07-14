[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / executeWorkflow

# Function: executeWorkflow()

```ts
function executeWorkflow<A, R>(
   internals, 
   wf, 
args): Promise<R>;
```

Defined in: `packages/core/dist/index.d.ts`

Runs a workflow body against a fresh ctx: the engine core that
engine.run wraps with RunHandle, events, and outcome assembly (M1-T11).
Validates args against the declared schema, then executes single-pass.

## Type Parameters

| Type Parameter |
| ------ |
| `A` |
| `R` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `internals` | [`RunInternals`](/api/@rulvar/rulvar/interfaces/RunInternals.md) |
| `wf` | [`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`A`, `R`\&gt; |
| `args` | `A` |

## Returns

`Promise`\&lt;`R`\&gt;
