[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / classifyAgentError

# Function: classifyAgentError()

```ts
function classifyAgentError(e): ErrorClass;
```

Defined in: `packages/core/dist/index.d.ts`

task-class: schema-mismatch, terminal, non-retryable tool. transport,
rate-limit, and budget are never memoized.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `e` | [`AgentError`](/api/@rulvar/rulvar/type-aliases/AgentError.md) |

## Returns

[`ErrorClass`](/api/@rulvar/rulvar/type-aliases/ErrorClass.md)
