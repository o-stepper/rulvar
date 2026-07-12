[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / summarizeOutput

# Function: summarizeOutput()

```ts
function summarizeOutput(result): string;
```

Defined in: [packages/core/src/orchestrator/handles.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L80)

The M6 outputSummary: a deterministic truncation of the child's
output (or error message), identical live and on replay (distillation
lives with the child, ordered by
spawn ordinal; the LLM distillation upgrade is M7 territory).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `result` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; |

## Returns

`string`
