[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / summarizeOutput

# Function: summarizeOutput()

```ts
function summarizeOutput(result): string;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The M6 outputSummary: a deterministic truncation of the child's
output (or error message), identical live and on replay (docs/07
section 2, clause 3: distillation lives with the child, ordered by
spawn ordinal; the LLM distillation upgrade is M7 territory).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `result` | [`AgentResult`](/api/@rulvar/rulvar/interfaces/AgentResult.md)\&lt;`unknown`\&gt; |

## Returns

`string`
