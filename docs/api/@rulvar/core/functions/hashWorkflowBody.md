[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / hashWorkflowBody

# Function: hashWorkflowBody()

```ts
function hashWorkflowBody(wf): string;
```

Defined in: [packages/core/src/engine/engine.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L289)

Content hash of an in-process workflow body (run-to-definition binding).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `wf` | \| [`Workflow`](/api/@rulvar/core/interfaces/Workflow.md)\&lt;`never`, `never`\&gt; \| [`Workflow`](/api/@rulvar/core/interfaces/Workflow.md)\&lt;`unknown`, `unknown`\&gt; |

## Returns

`string`
