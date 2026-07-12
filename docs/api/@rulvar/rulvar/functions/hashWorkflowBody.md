[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / hashWorkflowBody

# Function: hashWorkflowBody()

```ts
function hashWorkflowBody(wf): string;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Content hash of an in-process workflow body (run-to-definition binding, docs/06 10.2).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `wf` | \| [`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`never`, `never`\&gt; \| [`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`unknown`, `unknown`\&gt; |

## Returns

`string`
