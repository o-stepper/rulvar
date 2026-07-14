[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / executeWorkflow

# Function: executeWorkflow()

```ts
function executeWorkflow<A, R>(
   internals, 
   wf, 
args): Promise<R>;
```

Defined in: [packages/core/src/engine/ctx.ts:2665](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L2665)

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
| `internals` | [`RunInternals`](/api/@rulvar/core/interfaces/RunInternals.md) |
| `wf` | [`Workflow`](/api/@rulvar/core/interfaces/Workflow.md)\&lt;`A`, `R`\&gt; |
| `args` | `A` |

## Returns

`Promise`\&lt;`R`\&gt;
